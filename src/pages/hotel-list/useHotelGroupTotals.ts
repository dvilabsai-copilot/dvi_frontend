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
  userSelectedByGroup: Record<number, Record<string, ItineraryHotelRow>>;
  helpers: GroupTotalsHelpers;
};

export function useHotelGroupTotals({
  localHotels,
  selectedByGroup,
  userSelectedByGroup,
  helpers,
}: UseHotelGroupTotalsArgs) {
  const getSelectedHotelsForGroup = (groupType: number): ItineraryHotelRow[] => {
    const groupHotels = localHotels.filter((hotel) => Number(hotel.groupType || 0) === Number(groupType));
    // A previous-night early-arrival marker is explanatory metadata, not a
    // second hotel stay. Keep it out of totals while retaining a fallback for
    // malformed/legacy payloads that contain only the marker row.
    const nonSyntheticHotels = groupHotels.filter(
      (hotel) => !hotel.previousDayBillingSynthetic,
    );
    const hotelsForGroup = nonSyntheticHotels.length > 0 ? nonSyntheticHotels : groupHotels;
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
      const userSelected = userSelectedByGroup[groupType]?.[stayKey];
      if (userSelected && helpers.isSelectableHotel(userSelected)) {
        selectedHotels.push(userSelected);
        previousSelectedHotel = userSelected;
        return;
      }

      const selectedForGroup = selectedByGroup[groupType]?.[stayKey];
      if (selectedForGroup) {
        selectedHotels.push(selectedForGroup);
        previousSelectedHotel = selectedForGroup;
        return;
      }

      // The API persists automatic selections as well as manual selections.
      // Prefer that row before calculating a local fallback; otherwise the
      // table can total a cheaper card while the financial summary uses the
      // persisted automatic rate.
      const persistedSelected = stayHotels.find((candidate) =>
        helpers.isSelectableHotel(candidate) &&
        Number((candidate as any).selectionId || (candidate as any).itineraryPlanHotelDetailsId || 0) > 0 &&
        String((candidate as any).selectionStatus || '').trim().toUpperCase() !== 'UNAVAILABLE',
      );
      if (persistedSelected) {
        selectedHotels.push(persistedSelected);
        previousSelectedHotel = persistedSelected;
        return;
      }

      const selectableHotels = helpers.getAutoSelectableHotelsRespectingPreviousRoomMeal(stayHotels, previousSelectedHotel);
      // Offline rates are not part of the default total. They enter the total
      // only through an explicit persisted/user selection above.
      const candidateHotels = selectableHotels;
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
