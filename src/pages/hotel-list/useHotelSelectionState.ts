import { useCallback, useEffect, useState } from "react";
import type { ItineraryHotelRow } from "../ItineraryDetails";

export type AutoHotelValidationResult = {
  blocked: boolean;
  message?: string;
  unknown?: boolean;
};

// Keep validation results outside the hook so adding automatic checks does not
// change the hook order of an already hot-reloaded development session.
const autoValidationCache = new Map<string, AutoHotelValidationResult>();
const autoValidationInFlight = new Map<string, Promise<AutoHotelValidationResult>>();

type SelectionHelpers = {
  getStayKey: (hotel: ItineraryHotelRow) => string;
  getHotelOptionKey: (hotel: ItineraryHotelRow) => string;
  isSelectableHotel: (hotel?: ItineraryHotelRow | null) => boolean;
  isPlaceholderHotel: (hotel?: ItineraryHotelRow | null) => boolean;
  getHotelAmountWithRooms: (hotel: ItineraryHotelRow) => number;
  findMatchingRoomMealInStay: (
    stayHotels: ItineraryHotelRow[],
    previousSelectedHotel?: ItineraryHotelRow | null,
  ) => ItineraryHotelRow | null;
  sortStayGroupsByDate: (groups: ItineraryHotelRow[][]) => ItineraryHotelRow[][];
  getAutoSelectableHotelsRespectingPreviousRoomMeal: (
    stayHotels: ItineraryHotelRow[],
    previousSelectedHotel?: ItineraryHotelRow | null,
  ) => ItineraryHotelRow[];
};

type UseHotelSelectionStateArgs = {
  hotels: ItineraryHotelRow[];
  restrictedHotels: ItineraryHotelRow[];
  planId: number;
  helpers: SelectionHelpers;
  validateAutoHotelSelection?: (
    hotel: ItineraryHotelRow,
  ) => Promise<AutoHotelValidationResult>;
};

export function useHotelSelectionState({
  hotels,
  restrictedHotels,
  planId,
  helpers,
  validateAutoHotelSelection,
}: UseHotelSelectionStateArgs) {
  const getLogicalStayKey = (hotel: ItineraryHotelRow): string => {
    const routeIds = Array.isArray((hotel as any).routeIds)
      ? (hotel as any).routeIds
          .map((id: unknown) => Number(id))
          .filter((id: number) => Number.isFinite(id) && id > 0)
      : [];
    const directRouteId = Number((hotel as any).itineraryRouteId || (hotel as any).routeId || 0);
    const routeIdentity = Array.from(new Set([
      ...routeIds,
      ...(Number.isFinite(directRouteId) && directRouteId > 0 ? [directRouteId] : []),
    ])).sort((left, right) => left - right).join(",");
    const date = String(
      (hotel as any).date ||
      (hotel as any).checkInDate ||
      String((hotel as any).day || "").match(/\d{4}-\d{2}-\d{2}/)?.[0] ||
      "",
    ).slice(0, 10).trim();
    return `${routeIdentity}::${date}`;
  };

  const findSelectionForStay = (
    selections: Record<string, ItineraryHotelRow> | undefined,
    stayHotels: ItineraryHotelRow[],
  ): ItineraryHotelRow | undefined => {
    if (!selections || stayHotels.length === 0) return undefined;
    const exactStayKey = helpers.getStayKey(stayHotels[0]);
    if (selections[exactStayKey]) return selections[exactStayKey];
    const logicalStayKey = getLogicalStayKey(stayHotels[0]);
    return Object.entries(selections).find(([, selection]) =>
      getLogicalStayKey(selection) === logicalStayKey,
    )?.[1];
  };

  const isPersistedSelection = (hotel: ItineraryHotelRow): boolean => {
    const metadata = hotel as unknown as {
      selectionId?: unknown;
      selectionOrigin?: unknown;
      selectionStatus?: unknown;
      selection?: { selectionOrigin?: unknown };
    };
    const selectionStatus = String(metadata.selectionStatus || '').toUpperCase();
    // `itineraryPlanHotelDetailsId` identifies the database availability row;
    // it is present on ordinary catalog rows as well as selected rows.  It is
    // therefore not a selection marker.  Treating it as one resurrects an old
    // rate after Reset/refresh and makes the recommendation total include a
    // row that is no longer selected.
    const hasPersistedSelectionId = Number(metadata.selectionId || 0) > 0;
    const selectionOrigin = String(
      metadata.selectionOrigin || metadata.selection?.selectionOrigin || '',
    ).toUpperCase();
    const isExplicitSelection =
      hotel.isSelected === true ||
      hasPersistedSelectionId ||
      selectionOrigin === 'USER_SELECTED';
    return selectionStatus === 'UNAVAILABLE'
      ? isExplicitSelection
      : hasPersistedSelectionId || selectionOrigin === 'USER_SELECTED';
  };

  // `HotelList` receives a freshly-created array when the parent selection or
  // pricing state changes.  Array identity is therefore not a reliable signal
  // that availability changed.  Reinitialising from `hotels` on every render
  // was overwriting an explicit multi-night choice immediately after it was
  // saved.  Track the actual availability/selection fields instead.
  const hotelDataSignature = hotels
    .map((hotel) => [
      helpers.getStayKey(hotel),
      helpers.getHotelOptionKey(hotel),
      Number((hotel as any).selectionId || 0),
      Number((hotel as any).itineraryPlanHotelDetailsId || 0),
      String((hotel as any).selectionOrigin || ''),
      String((hotel as any).selectionStatus || ''),
      String((hotel as any).availabilityStatus || ''),
      Boolean((hotel as any).isSelected),
      Number(helpers.getHotelAmountWithRooms(hotel) || 0),
    ].join('|'))
    .join('||');

  const [selectedByGroup, setSelectedByGroup] = useState<Record<number, Record<string, ItineraryHotelRow>>>({});
  // Explicit selections belong to a recommendation package as well as a stay.
  // Keeping this keyed only by stay caused a choice in package 1 to hydrate the
  // same stay in every other recommendation package.
  const [userSelectedByGroup, setUserSelectedByGroup] = useState<
    Record<number, Record<string, ItineraryHotelRow>>
  >({});
  const [localHotels, setLocalHotels] = useState<ItineraryHotelRow[]>(hotels);
  const [localRestrictedHotels, setLocalRestrictedHotels] = useState<ItineraryHotelRow[]>(restrictedHotels);

  useEffect(() => {
    setLocalHotels(hotels);
    if (hotels.length === 0) {
      setSelectedByGroup({});
      setUserSelectedByGroup({});
      return;
    }

    const next: Record<number, Record<string, ItineraryHotelRow>> = {};
    const nextUserSelections: Record<number, Record<string, ItineraryHotelRow>> = {};
    const hotelsByGroupAndStay: Record<number, Record<string, ItineraryHotelRow[]>> = {};

      // The previous-night early-arrival row is a billing explanation only.
      // Selection identity starts at the actual guest-arrival route so Day 0
      // cannot become a duplicate selectable stay.
      hotels
        .filter((hotel) => !hotel.previousDayBillingSynthetic)
        .forEach((hotel) => {
          const groupType = Number(hotel.groupType || 0);
          if (!groupType) return;
          hotelsByGroupAndStay[groupType] ||= {};
          const stayKey = helpers.getStayKey(hotel);
          hotelsByGroupAndStay[groupType][stayKey] ||= [];
          hotelsByGroupAndStay[groupType][stayKey].push(hotel);
        });

      const chooseDefaultForStay = (
        stayHotels: ItineraryHotelRow[],
        previousSelectedHotel?: ItineraryHotelRow | null,
      ): ItineraryHotelRow | null => {
        // The persisted selection is authoritative after a page reload. Only
        // choose a new default when the backend did not persist a selection.
        const persistedSelection = stayHotels.find(isPersistedSelection);
        if (persistedSelection) return persistedSelection;

        const selectableOptions = helpers.getAutoSelectableHotelsRespectingPreviousRoomMeal(stayHotels, previousSelectedHotel);
        const hasRealOptions = stayHotels.some((option) => !helpers.isPlaceholderHotel(option));
        // The helper returns live rows when available, otherwise the best
        // selectable offline rows. This makes an offline hotel the automatic
        // fallback only for a stay with no live supplier option.
        const candidateOptions = selectableOptions.length > 0
          ? selectableOptions
          : hasRealOptions
            ? []
            : stayHotels.filter((option) => helpers.isPlaceholderHotel(option));

        return [...candidateOptions].sort((a, b) => {
          const priceDifference = helpers.getHotelAmountWithRooms(a) - helpers.getHotelAmountWithRooms(b);
          return priceDifference || String(a.hotelName || "").localeCompare(String(b.hotelName || ""));
        })[0] || null;
      };

      Object.entries(hotelsByGroupAndStay).forEach(([groupTypeText, stayMap]) => {
        const groupType = Number(groupTypeText);
        next[groupType] ||= {};
        let previousSelectedHotel: ItineraryHotelRow | null = null;

        helpers.sortStayGroupsByDate(Object.values(stayMap)).forEach((stayHotels) => {
          const stayKey = helpers.getStayKey(stayHotels[0]);
          const explicitSelection = findSelectionForStay(userSelectedByGroup[groupType], stayHotels);
          const currentExplicitSelection = explicitSelection
            ? stayHotels.find((candidate) =>
                helpers.isSelectableHotel(candidate) &&
                helpers.getHotelOptionKey(candidate) === helpers.getHotelOptionKey(explicitSelection),
              )
            : null;

          // A parent rerender can replace the `hotels` array after a successful
          // selection without changing availability. Preserve the explicit
          // choice when the same rate is still present; if it disappeared,
          // fall through to persisted/default selection and let reconciliation
          // choose a safe replacement.
          if (currentExplicitSelection) {
            const preservedSelection = {
              ...currentExplicitSelection,
              ...explicitSelection,
              itineraryRouteId: currentExplicitSelection.itineraryRouteId,
              routeId: currentExplicitSelection.routeId,
              date: currentExplicitSelection.date,
              checkInDate: currentExplicitSelection.checkInDate,
              checkOutDate: currentExplicitSelection.checkOutDate,
            };
            next[groupType][stayKey] = preservedSelection;
            nextUserSelections[groupType] ||= {};
            nextUserSelections[groupType][stayKey] = preservedSelection;
            previousSelectedHotel = preservedSelection;
            return;
          }

          const selectableOptions = helpers.getAutoSelectableHotelsRespectingPreviousRoomMeal(stayHotels, previousSelectedHotel);
          const selected = chooseDefaultForStay(stayHotels, previousSelectedHotel);
          if (selected) {
            next[groupType][stayKey] = selected;
            if (selectableOptions.length > 0) previousSelectedHotel = selected;
          }
        });
      });

    setSelectedByGroup(next);
    setUserSelectedByGroup(nextUserSelections);
    // `userSelectedByGroup` is intentionally read as the previous explicit
    // selection while availability changes. It is not a dependency because a
    // user selection alone must not reinitialize the whole options model.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hotelDataSignature, planId]);

  // The default hotel is chosen before live supplier inventory is checked. Validate
  // that default asynchronously and move to the next candidate when the supplier
  // reports a restriction. User selections are intentionally never auto-replaced.
  useEffect(() => {
    if (!validateAutoHotelSelection || hotels.length === 0 || Object.keys(selectedByGroup).length === 0) {
      return;
    }

    let cancelled = false;

    const getValidation = async (hotel: ItineraryHotelRow): Promise<AutoHotelValidationResult> => {
      const cacheKey = `${planId}:${helpers.getHotelOptionKey(hotel)}`;
      const cached = autoValidationCache.get(cacheKey);
      if (cached) return cached;

      const inFlight = autoValidationInFlight.get(cacheKey);
      if (inFlight) return inFlight;

      const request = validateAutoHotelSelection(hotel)
        .catch((error) => {
          console.error("[HotelList] automatic hotel availability check failed", error);
          return {
            blocked: false,
            unknown: true,
          } satisfies AutoHotelValidationResult;
        })
        .then((result) => {
          if (!result.unknown) {
            autoValidationCache.set(cacheKey, result);
          }
          return result;
        })
        .finally(() => {
          autoValidationInFlight.delete(cacheKey);
        });

      autoValidationInFlight.set(cacheKey, request);
      return request;
    };

    const run = async () => {
      const hotelsByGroupAndStay: Record<number, Record<string, ItineraryHotelRow[]>> = {};
      hotels
        .filter((hotel) => !hotel.previousDayBillingSynthetic)
        .forEach((hotel) => {
          const groupType = Number(hotel.groupType || 0);
          if (!groupType) return;
          hotelsByGroupAndStay[groupType] ||= {};
          const stayKey = helpers.getStayKey(hotel);
          hotelsByGroupAndStay[groupType][stayKey] ||= [];
          hotelsByGroupAndStay[groupType][stayKey].push(hotel);
        });

      for (const [groupTypeText, stayMap] of Object.entries(hotelsByGroupAndStay)) {
        const groupType = Number(groupTypeText);
        let previousSelectedHotel: ItineraryHotelRow | null = null;

        for (const stayHotels of helpers.sortStayGroupsByDate(Object.values(stayMap))) {
          if (cancelled) return;

          const stayKey = helpers.getStayKey(stayHotels[0]);
          const selected = findSelectionForStay(selectedByGroup[groupType], stayHotels);
          const userSelected = findSelectionForStay(userSelectedByGroup[groupType], stayHotels);
          const persistedSelection = Boolean(selected && isPersistedSelection(selected));
          if (!selected || userSelected || persistedSelection || !helpers.isSelectableHotel(selected)) {
            previousSelectedHotel = selected || previousSelectedHotel;
            continue;
          }

          const selectedValidation = await getValidation(selected);
          if (cancelled) return;

          if (!selectedValidation.blocked || selectedValidation.unknown) {
            previousSelectedHotel = selected;
            continue;
          }

          const fallbackCandidates = helpers
            .getAutoSelectableHotelsRespectingPreviousRoomMeal(stayHotels, previousSelectedHotel)
            .filter((candidate) => helpers.getHotelOptionKey(candidate) !== helpers.getHotelOptionKey(selected))
            .sort((a, b) => {
              const amountDifference = helpers.getHotelAmountWithRooms(a) - helpers.getHotelAmountWithRooms(b);
              return amountDifference || String(a.hotelName || "").localeCompare(String(b.hotelName || ""));
            });

          let replacement: ItineraryHotelRow | null = null;
          for (const candidate of fallbackCandidates) {
            const validation = await getValidation(candidate);
            if (cancelled) return;
            if (!validation.blocked && !validation.unknown) {
              replacement = candidate;
              break;
            }
          }

          if (replacement) {
            setSelectedByGroup((previous) => {
              const current = previous[groupType]?.[stayKey];
              if (!current || helpers.getHotelOptionKey(current) !== helpers.getHotelOptionKey(selected)) {
                return previous;
              }

              return {
                ...previous,
                [groupType]: {
                  ...previous[groupType],
                  [stayKey]: replacement,
                },
              };
            });
            previousSelectedHotel = replacement;
          } else {
            // Keep the current value if every fallback could not be verified. The
            // final API validation remains the last safety net for that edge case.
            previousSelectedHotel = selected;
          }
        }
      }
    };

    void run();
    return () => {
      cancelled = true;
    };
    // Helpers are pure functions supplied by HotelList; the explicit dependencies
    // below are the state changes that should trigger another validation pass.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hotelDataSignature, planId, selectedByGroup, userSelectedByGroup, validateAutoHotelSelection]);

  useEffect(() => {
    setLocalRestrictedHotels(restrictedHotels);
  }, [restrictedHotels]);

  useEffect(() => {
    const validStayKeys = new Set(hotels.map(helpers.getStayKey));
    const validLogicalStayKeys = new Set(hotels.map(getLogicalStayKey));
    setUserSelectedByGroup((previous) => {
      const next: Record<number, Record<string, ItineraryHotelRow>> = {};
      Object.entries(previous).forEach(([groupTypeText, selections]) => {
        const groupType = Number(groupTypeText);
        Object.entries(selections).forEach(([stayKey, hotel]) => {
          if (validStayKeys.has(stayKey) || validLogicalStayKeys.has(getLogicalStayKey(hotel))) {
            next[groupType] ||= {};
            next[groupType][stayKey] = hotel;
          }
        });
      });
      return next;
    });
    // The stay-key helper is pure; hotel data is the only source that invalidates overrides.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hotelDataSignature]);

  // Reset Hotels and a global meal-plan change are explicit selection
  // boundaries. Do not let the previous per-day user override survive either
  // action; the next availability snapshot will establish fresh defaults.
  const resetSelections = useCallback(() => {
    setSelectedByGroup({});
    setUserSelectedByGroup({});
  }, []);

  return {
    selectedByGroup,
    setSelectedByGroup,
    userSelectedByGroup,
    setUserSelectedByGroup,
    localHotels,
    setLocalHotels,
    localRestrictedHotels,
    setLocalRestrictedHotels,
    resetSelections,
  };
}
