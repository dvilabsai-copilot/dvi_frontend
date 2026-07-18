import { useEffect, useState } from "react";
import type { ItineraryHotelRow } from "../ItineraryDetails";

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
};

export function useHotelSelectionState({
  hotels,
  restrictedHotels,
  planId,
  helpers,
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

      hotels.forEach((hotel) => {
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
