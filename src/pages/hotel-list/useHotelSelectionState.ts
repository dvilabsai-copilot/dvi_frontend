import { useEffect, useState } from "react";
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
  const isPersistedSelection = (hotel: ItineraryHotelRow): boolean => {
    const metadata = hotel as unknown as {
      selectionId?: unknown;
      selectionOrigin?: unknown;
      selectionStatus?: unknown;
      selection?: { selectionOrigin?: unknown };
    };
    const selectionStatus = String(metadata.selectionStatus || '').toUpperCase();
    const selectionOrigin = String(
      metadata.selectionOrigin || metadata.selection?.selectionOrigin || '',
    ).toUpperCase();
    const hasPersistedSelectionId = Number(metadata.selectionId || 0) > 0;
    const isUserSelected = selectionOrigin === 'USER_SELECTED';
    const isUnavailablePersistedSelection =
      selectionStatus === 'UNAVAILABLE' && (hotel.isSelected === true || hasPersistedSelectionId);

    return isUnavailablePersistedSelection ||
      (selectionStatus !== 'UNAVAILABLE' && hasPersistedSelectionId && isUserSelected);
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
      String((hotel as any).selectionOrigin || ''),
      String((hotel as any).selectionStatus || ''),
      String((hotel as any).availabilityStatus || ''),
      Boolean((hotel as any).isSelected),
      Number(helpers.getHotelAmountWithRooms(hotel) || 0),
    ].join('|'))
    .join('||');

  const [selectedByGroup, setSelectedByGroup] = useState<Record<number, Record<string, ItineraryHotelRow>>>({});
  const [userSelectedByStay, setUserSelectedByStay] = useState<Record<string, ItineraryHotelRow>>({});
  const [localHotels, setLocalHotels] = useState<ItineraryHotelRow[]>(hotels);
  const [localRestrictedHotels, setLocalRestrictedHotels] = useState<ItineraryHotelRow[]>(restrictedHotels);

  useEffect(() => {
    setLocalHotels(hotels);
    if (hotels.length === 0) {
      setSelectedByGroup({});
      setUserSelectedByStay({});
      return;
    }

    const next: Record<number, Record<string, ItineraryHotelRow>> = {};
    const nextUserSelections: Record<string, ItineraryHotelRow> = {};
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

        const stickySameRoomMeal = helpers.findMatchingRoomMealInStay(stayHotels, previousSelectedHotel);
        if (stickySameRoomMeal) return stickySameRoomMeal;

        const selectableOptions = helpers.getAutoSelectableHotelsRespectingPreviousRoomMeal(stayHotels, previousSelectedHotel);
        const hasRealOptions = stayHotels.some((option) => !helpers.isPlaceholderHotel(option));
        const candidateOptions = selectableOptions.length > 0
          ? selectableOptions
          : hasRealOptions
            ? stayHotels.filter((option) => !helpers.isPlaceholderHotel(option))
            : [...stayHotels];

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
          const explicitSelection = userSelectedByStay[stayKey];
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
            nextUserSelections[stayKey] = preservedSelection;
            previousSelectedHotel = preservedSelection;
            return;
          }

          const selectableOptions = helpers.getAutoSelectableHotelsRespectingPreviousRoomMeal(stayHotels, previousSelectedHotel);
          const stickySelection = helpers.findMatchingRoomMealInStay(stayHotels, previousSelectedHotel);
          if (stickySelection) {
            next[groupType][stayKey] = stickySelection;
            previousSelectedHotel = stickySelection;
            return;
          }

          const selected = chooseDefaultForStay(stayHotels, previousSelectedHotel);
          if (selected) {
            next[groupType][stayKey] = selected;
            if (selectableOptions.length > 0) previousSelectedHotel = selected;
          }
        });
      });

    setSelectedByGroup(next);
    setUserSelectedByStay(nextUserSelections);
    // `userSelectedByStay` is intentionally read as the previous explicit
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
          const selected = selectedByGroup[groupType]?.[stayKey];
          const userSelected = userSelectedByStay[stayKey];
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
  }, [hotelDataSignature, planId, selectedByGroup, userSelectedByStay, validateAutoHotelSelection]);

  useEffect(() => {
    setLocalRestrictedHotels(restrictedHotels);
  }, [restrictedHotels]);

  useEffect(() => {
    const validStayKeys = new Set(hotels.map(helpers.getStayKey));
    setUserSelectedByStay((previous) => {
      const next: Record<string, ItineraryHotelRow> = {};
      Object.entries(previous).forEach(([stayKey, hotel]) => {
        if (validStayKeys.has(stayKey)) next[stayKey] = hotel;
      });
      return next;
    });
    // The stay-key helper is pure; hotel data is the only source that invalidates overrides.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hotelDataSignature]);

  return {
    selectedByGroup,
    setSelectedByGroup,
    userSelectedByStay,
    setUserSelectedByStay,
    localHotels,
    setLocalHotels,
    localRestrictedHotels,
    setLocalRestrictedHotels,
  };
}
