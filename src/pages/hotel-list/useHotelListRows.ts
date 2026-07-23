import { useEffect, useMemo } from "react";
import type { Dispatch, SetStateAction } from "react";
import type { ItineraryHotelRow, ItineraryHotelTab } from "../ItineraryDetails";

type RowHelpers = {
  getStayKey: (hotel: ItineraryHotelRow) => string;
  getHotelOptionKey: (hotel: ItineraryHotelRow) => string;
  getHotelAmountWithRooms: (hotel: ItineraryHotelRow) => number;
  isExternalStayRow: (hotel?: ItineraryHotelRow | null) => boolean;
  isPlaceholderHotel: (hotel?: ItineraryHotelRow | null) => boolean;
  isSelectableHotel: (hotel?: ItineraryHotelRow | null) => boolean;
  findMatchingRoomMealInStay: (
    stayHotels: ItineraryHotelRow[],
    previousSelectedHotel?: ItineraryHotelRow | null,
  ) => ItineraryHotelRow | null;
  sortStayGroupsByDate: (groups: ItineraryHotelRow[][]) => ItineraryHotelRow[][];
  getAutoSelectableHotelsRespectingPreviousRoomMeal: (
    stayHotels: ItineraryHotelRow[],
    previousSelectedHotel?: ItineraryHotelRow | null,
  ) => ItineraryHotelRow[];
  toNumber: (value: unknown, fallback?: number) => number;
};

type UseHotelListRowsArgs<TVoucher> = {
  localHotels: ItineraryHotelRow[];
  activeGroupType: number | null;
  selectedByGroup: Record<number, Record<string, ItineraryHotelRow>>;
  userSelectedByStay: Record<string, ItineraryHotelRow>;
  readOnly: boolean;
  roomCount: number;
  hotelTabs: ItineraryHotelTab[];
  dayDestinationFallback: Record<number, string>;
  selectedVoucherRows: Record<string, TVoucher>;
  setSelectedVoucherRows: Dispatch<SetStateAction<Record<string, TVoucher>>>;
  helpers: RowHelpers;
};

export function useHotelListRows<TVoucher>({
  localHotels,
  activeGroupType,
  selectedByGroup,
  userSelectedByStay,
  readOnly,
  roomCount,
  hotelTabs,
  dayDestinationFallback,
  selectedVoucherRows,
  setSelectedVoucherRows,
  helpers,
}: UseHotelListRowsArgs<TVoucher>) {
  const currentHotelRows = useMemo(() => {
    if (!localHotels.length || activeGroupType === null) return [];

    if (readOnly) {
      const hotelsByRoute = new Map<number, ItineraryHotelRow>();
      const confirmedHotels = localHotels.filter((hotel) => helpers.toNumber(hotel.itineraryPlanHotelDetailsId) > 0);
      const externalDisplayHotels = localHotels.filter((hotel) => helpers.isExternalStayRow(hotel));
      const sourceHotels = confirmedHotels.length > 0
        ? [...confirmedHotels, ...externalDisplayHotels]
        : (() => {
            const fallbackGroupType = helpers.toNumber(activeGroupType ?? hotelTabs?.[0]?.groupType, 1);
            const hotelsInFallbackGroup = localHotels.filter((hotel) => helpers.toNumber(hotel.groupType) === fallbackGroupType);
            return hotelsInFallbackGroup.length > 0 ? hotelsInFallbackGroup : localHotels;
          })();

      sourceHotels.forEach((hotel) => {
        const routeId = helpers.toNumber(hotel.itineraryRouteId);
        if (!routeId) return;
        const existing = hotelsByRoute.get(routeId);
        const existingIsSynthetic = Boolean((existing as any)?.previousDayBillingSynthetic);
        const hotelIsSynthetic = Boolean((hotel as any)?.previousDayBillingSynthetic);
        if (
          !existing ||
          (existingIsSynthetic && !hotelIsSynthetic) ||
          (helpers.isExternalStayRow(existing) && !helpers.isExternalStayRow(hotel))
        ) {
          hotelsByRoute.set(routeId, hotel);
        }
      });

      return Array.from(hotelsByRoute.values()).sort((a, b) => {
        const dayA = parseInt(String(a.day ?? "").replace(/\D/g, "") || "0");
        const dayB = parseInt(String(b.day ?? "").replace(/\D/g, "") || "0");
        return dayA - dayB;
      });
    }

    const activeGroupHotels = localHotels.filter(
      (hotel) => helpers.toNumber(hotel.groupType) === helpers.toNumber(activeGroupType),
    );

    // The API exposes the previous-night billing marker so the UI can explain
    // the early-arrival date. It is not a second selectable hotel stay. Keep
    // the real hotel row as the source of selection and pricing; the table
    // renders the marker as the display-only Day 0 row.
    const nonSyntheticHotels = activeGroupHotels.filter(
      (hotel) => !Boolean((hotel as any).previousDayBillingSynthetic),
    );
    const hotelsForActiveGroup = nonSyntheticHotels.length > 0
      ? nonSyntheticHotels
      : activeGroupHotels;
    const groupedByStay = new Map<string, ItineraryHotelRow[]>();
    hotelsForActiveGroup.forEach((hotel) => {
      const stayKey = helpers.getStayKey(hotel);
      groupedByStay.set(stayKey, [...(groupedByStay.get(stayKey) || []), hotel]);
    });

    const displayHotels: ItineraryHotelRow[] = [];
    let previousSelectedHotel: ItineraryHotelRow | null = null;
    helpers.sortStayGroupsByDate(Array.from(groupedByStay.values())).forEach((stayHotels) => {
      const stayKey = helpers.getStayKey(stayHotels[0]);
      const userSelected = userSelectedByStay[stayKey];
      if (userSelected && helpers.isSelectableHotel(userSelected)) {
        displayHotels.push(userSelected);
        previousSelectedHotel = userSelected;
        return;
      }

      const stickySelection = helpers.findMatchingRoomMealInStay(stayHotels, previousSelectedHotel);
      if (stickySelection) {
        displayHotels.push(stickySelection);
        previousSelectedHotel = stickySelection;
        return;
      }

      const selectedForStay = selectedByGroup[activeGroupType]?.[stayKey];
      const selectableHotels = helpers.getAutoSelectableHotelsRespectingPreviousRoomMeal(stayHotels, previousSelectedHotel);
      const candidateHotels = selectableHotels.length > 0
        ? selectableHotels
        : stayHotels.some((hotel) => !helpers.isPlaceholderHotel(hotel))
          ? stayHotels.filter((hotel) => !helpers.isPlaceholderHotel(hotel))
          : [...stayHotels];
      const sortedStayHotels = [...candidateHotels].sort((a, b) => {
        const ratingDifference = helpers.toNumber(b.category, 0) - helpers.toNumber(a.category, 0);
        if (ratingDifference !== 0) return ratingDifference;
        const priceDifference = helpers.getHotelAmountWithRooms(a) - helpers.getHotelAmountWithRooms(b);
        return priceDifference || String(a.hotelName || "").localeCompare(String(b.hotelName || ""));
      });

      if (selectedForStay && helpers.isSelectableHotel(selectedForStay)) {
        const selectedOptionKey = helpers.getHotelOptionKey(selectedForStay);
        const sameStaySelection = sortedStayHotels.find((option) => helpers.getHotelOptionKey(option) === selectedOptionKey);
        if (sameStaySelection) {
          displayHotels.push(sameStaySelection);
          previousSelectedHotel = sameStaySelection;
          return;
        }
      }

      const selected = sortedStayHotels[0];
      if (selected) {
        displayHotels.push(selected);
        previousSelectedHotel = selected;
      }
    });

    return displayHotels.sort((a, b) => {
      const dayA = parseInt(String(a.day ?? "").replace(/\D/g, "") || "0");
      const dayB = parseInt(String(b.day ?? "").replace(/\D/g, "") || "0");
      if (dayA !== dayB) return dayA - dayB;
      return String(a.date || "").localeCompare(String(b.date || ""));
    });
  }, [localHotels, activeGroupType, selectedByGroup, userSelectedByStay, readOnly, roomCount]);

  useEffect(() => {
    if (!readOnly) {
      if (Object.keys(selectedVoucherRows).length > 0) setSelectedVoucherRows(() => ({}));
      return;
    }

    const validKeys = new Set(currentHotelRows.map(helpers.getStayKey));
    setSelectedVoucherRows((previous) => {
      const next: Record<string, TVoucher> = {};
      Object.entries(previous).forEach(([key, value]) => {
        if (validKeys.has(key)) next[key] = value;
      });
      return next;
    });
  }, [readOnly, currentHotelRows]);

  const routeDestinationFallback = useMemo(() => {
    const map: Record<number, string> = {};
    localHotels.forEach((hotel) => {
      const routeId = helpers.toNumber(hotel.itineraryRouteId, 0);
      const destination = String(hotel.destination || "").trim();
      if (routeId && destination && !map[routeId]) map[routeId] = destination;
    });
    return map;
  }, [localHotels]);

  const getResolvedDestination = (hotel: ItineraryHotelRow): string => {
    const direct = String(hotel.destination || "").trim();
    if (direct) return direct;
    const dayMatch = String(hotel.day || "").match(/Day\s*(\d+)/i);
    const fromDay = dayMatch ? String(dayDestinationFallback[Number(dayMatch[1])] || "").trim() : "";
    if (fromDay) return fromDay;
    return String(routeDestinationFallback[helpers.toNumber(hotel.itineraryRouteId, 0)] || "").trim() || "-";
  };

  return { currentHotelRows, routeDestinationFallback, getResolvedDestination };
}
