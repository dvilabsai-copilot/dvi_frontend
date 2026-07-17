import type { ItineraryHotelRow } from "../ItineraryDetails";

type GroupTotalsHelpers = {
  getStayKey: (hotel: ItineraryHotelRow) => string;
  sortStayGroupsByDate: (groups: ItineraryHotelRow[][]) => ItineraryHotelRow[][];
  isSelectableHotel: (hotel?: ItineraryHotelRow | null) => boolean;
  findMatchingRoomMealInStay: (
    stayHotels: ItineraryHotelRow[],
    previousSelectedHotel?: ItineraryHotelRow | null,
  ) => ItineraryHotelRow | null;
  getAutoSelectableHotelsRespectingPreviousRoomMeal: (
    stayHotels: ItineraryHotelRow[],
    previousSelectedHotel?: ItineraryHotelRow | null,
  ) => ItineraryHotelRow[];
  isPlaceholderHotel: (hotel?: ItineraryHotelRow | null) => boolean;
  getHotelAmountWithRooms: (hotel: ItineraryHotelRow) => number;
};

type UseHotelGroupTotalsArgs = {
  localHotels: ItineraryHotelRow[];
  selectedByGroup: Record<number, Record<string, ItineraryHotelRow>>;
  userSelectedByStay: Record<string, ItineraryHotelRow>;
  helpers: GroupTotalsHelpers;
};

export function useHotelGroupTotals({
  localHotels,
  selectedByGroup,
  userSelectedByStay,
  helpers,
}: UseHotelGroupTotalsArgs) {
  const getSelectedHotelsForGroup = (groupType: number): ItineraryHotelRow[] => {
    const hotelsForGroup = localHotels.filter((hotel) => Number(hotel.groupType || 0) === Number(groupType));
    if (!hotelsForGroup.length) return [];

    const groupedByStay = new Map<string, ItineraryHotelRow[]>();
    hotelsForGroup.forEach((hotel) => {
      const stayKey = helpers.getStayKey(hotel);
      groupedByStay.set(stayKey, [...(groupedByStay.get(stayKey) || []), hotel]);
    });

    const selectedHotels: ItineraryHotelRow[] = [];
    let previousSelectedHotel: ItineraryHotelRow | null = null;

    helpers.sortStayGroupsByDate(Array.from(groupedByStay.values())).forEach((stayHotels) => {
      const stayKey = helpers.getStayKey(stayHotels[0]);
      const userSelected = userSelectedByStay[stayKey];
      if (userSelected && helpers.isSelectableHotel(userSelected)) {
        selectedHotels.push(userSelected);
        previousSelectedHotel = userSelected;
        return;
      }

      const stickySelection = helpers.findMatchingRoomMealInStay(stayHotels, previousSelectedHotel);
      if (stickySelection) {
        selectedHotels.push(stickySelection);
        previousSelectedHotel = stickySelection;
        return;
      }

      const selectedForGroup = selectedByGroup[groupType]?.[stayKey];
      if (selectedForGroup && helpers.isSelectableHotel(selectedForGroup)) {
        selectedHotels.push(selectedForGroup);
        previousSelectedHotel = selectedForGroup;
        return;
      }

      const selectableHotels = helpers.getAutoSelectableHotelsRespectingPreviousRoomMeal(stayHotels, previousSelectedHotel);
      const candidateHotels = selectableHotels.length > 0
        ? selectableHotels
        : stayHotels.some((hotel) => !helpers.isPlaceholderHotel(hotel))
          ? stayHotels.filter((hotel) => !helpers.isPlaceholderHotel(hotel))
          : [...stayHotels];
      const selected = [...candidateHotels].sort((a, b) => {
        const priceDifference = helpers.getHotelAmountWithRooms(a) - helpers.getHotelAmountWithRooms(b);
        return priceDifference || String(a.hotelName || "").localeCompare(String(b.hotelName || ""));
      })[0];
      if (selected) {
        selectedHotels.push(selected);
        previousSelectedHotel = selected;
      }
    });

    return selectedHotels;
  };

  const getGroupTotal = (groupType: number): number =>
    getSelectedHotelsForGroup(groupType).reduce((sum, hotel) => sum + helpers.getHotelAmountWithRooms(hotel), 0);

  return { getSelectedHotelsForGroup, getGroupTotal };
}
