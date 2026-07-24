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
  const [selectedByGroup, setSelectedByGroup] = useState<Record<number, Record<string, ItineraryHotelRow>>>({});
  const [userSelectedByStay, setUserSelectedByStay] = useState<Record<string, ItineraryHotelRow>>({});
  const [localHotels, setLocalHotels] = useState<ItineraryHotelRow[]>(hotels);
  const [localRestrictedHotels, setLocalRestrictedHotels] = useState<ItineraryHotelRow[]>(restrictedHotels);

  useEffect(() => {
    setLocalHotels(hotels);
    if (hotels.length === 0) return;

    setSelectedByGroup((previous) => {
      const next = { ...previous };
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
        const stickySameRoomMeal = helpers.findMatchingRoomMealInStay(stayHotels, previousSelectedHotel);
        if (stickySameRoomMeal) return stickySameRoomMeal;

        const persistedSelection = [...stayHotels]
          .filter((option) => Number(option.itineraryPlanHotelDetailsId || 0) > 0 && helpers.isSelectableHotel(option))
          .sort((a, b) => helpers.getHotelAmountWithRooms(a) - helpers.getHotelAmountWithRooms(b))[0];
        if (persistedSelection) return persistedSelection;

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
          const existingSelection = next[groupType][stayKey];
          const selectableOptions = helpers.getAutoSelectableHotelsRespectingPreviousRoomMeal(stayHotels, previousSelectedHotel);
          const existingStillValid = Boolean(
            existingSelection &&
            helpers.isSelectableHotel(existingSelection) &&
            stayHotels.some((option) => helpers.getHotelOptionKey(option) === helpers.getHotelOptionKey(existingSelection)),
          );

          if (!existingStillValid) delete next[groupType][stayKey];
          const stickySelection = helpers.findMatchingRoomMealInStay(stayHotels, previousSelectedHotel);
          if (stickySelection) {
            next[groupType][stayKey] = stickySelection;
            previousSelectedHotel = stickySelection;
            return;
          }

          if (!next[groupType][stayKey]) {
            const selected = chooseDefaultForStay(stayHotels, previousSelectedHotel);
            if (selected) next[groupType][stayKey] = selected;
          }
          if (next[groupType][stayKey] && selectableOptions.length > 0) {
            previousSelectedHotel = next[groupType][stayKey];
          }
        });
      });

      return next;
    });
    // The helper functions are pure and intentionally do not trigger a reselection pass.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hotels, planId]);

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
          if (!selected || userSelected || !helpers.isSelectableHotel(selected)) {
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
  }, [hotels, planId, selectedByGroup, userSelectedByStay, validateAutoHotelSelection]);

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
  }, [hotels]);

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
