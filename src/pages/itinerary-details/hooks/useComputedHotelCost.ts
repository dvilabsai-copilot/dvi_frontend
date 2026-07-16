import { useMemo } from "react";
import type { ItineraryHotelDetailsResponse, ItineraryHotelRow } from "../itinerary-details.types";
import { isSupplierBookableHotel } from "../utils/domain.utils";

interface HotelCostOptions {
  hotelReadOnly: boolean;
  activeHotelListTotal: number;
  selectedHotelTotal: number;
  hotelDetails: ItineraryHotelDetailsResponse | null;
  activeHotelGroupType: number | null;
  roomCount?: number | null;
  costBreakdown?: { totalHotelAmount?: number | string | null; totalRoomCost?: number | string | null } | null;
}

const normalizeHotelProvider = (entry: ItineraryHotelRow): string => String(entry?.provider || "").trim().toLowerCase();

/** Derives the displayed hotel cost across draft, selected, and confirmed states. */
export const useComputedHotelCost = ({
  hotelReadOnly,
  activeHotelListTotal,
  selectedHotelTotal,
  hotelDetails,
  activeHotelGroupType,
  roomCount,
  costBreakdown,
}: HotelCostOptions) => useMemo(() => {
  if (hotelReadOnly) {
    const confirmedTabTotal = Number(hotelDetails?.hotelTabs?.[0]?.totalAmount || 0);
    if (confirmedTabTotal > 0) return confirmedTabTotal;
    const confirmedRowsTotal = (hotelDetails?.hotels || [])
      .filter((hotel) => !hotel?.externalStay && normalizeHotelProvider(hotel) !== "external")
      .reduce((sum, hotel) => sum + Number(hotel?.totalHotelCost || 0) + Number(hotel?.totalHotelTaxAmount || 0), 0);
    if (confirmedRowsTotal > 0) return confirmedRowsTotal;
    return Number(costBreakdown?.totalHotelAmount || costBreakdown?.totalRoomCost || 0);
  }

  if (activeHotelListTotal > 0) return Number(activeHotelListTotal);
  if (selectedHotelTotal > 0) return selectedHotelTotal;

  const preferredGroupType = activeHotelGroupType ?? hotelDetails?.hotelTabs?.[0]?.groupType ?? 1;
  const getStayDate = (hotel: ItineraryHotelRow): string => {
    if (hotel.checkInDate) return String(hotel.checkInDate);
    if (hotel.date) return String(hotel.date);
    const dayText = String(hotel.day || "");
    const parts = dayText.split(" | ");
    return (parts[1] || dayText).trim();
  };
  const groupedByStay = new Map<string, ItineraryHotelRow[]>();
  (hotelDetails?.hotels || [])
    .filter((hotel) => Number(hotel.groupType) === Number(preferredGroupType) && isSupplierBookableHotel(hotel))
    .forEach((hotel) => {
      const routeId = Number(hotel.itineraryRouteId || 0);
      if (!routeId) return;
      const stayKey = `${routeId}::${getStayDate(hotel)}`;
      const rows = groupedByStay.get(stayKey) || [];
      rows.push(hotel);
      groupedByStay.set(stayKey, rows);
    });

  const itineraryRoomCount = Math.max(Number(roomCount || 1), 1);
  const totalFromHotelApi = Array.from(groupedByStay.values()).reduce((sum, rows) => {
    const cheapest = rows.reduce((best, current) => (
      Number(current.totalHotelCost || 0) + Number(current.totalHotelTaxAmount || 0)
        < Number(best.totalHotelCost || 0) + Number(best.totalHotelTaxAmount || 0)
        ? current
        : best
    ));
    const baseAmount = Number(cheapest.totalHotelCost || 0) + Number(cheapest.totalHotelTaxAmount || 0);
    const effectiveRooms = Math.max(Number(cheapest.noOfRooms || 0) || itineraryRoomCount, 1);
    return sum + baseAmount * effectiveRooms;
  }, 0);

  return totalFromHotelApi > 0 ? totalFromHotelApi : Number(costBreakdown?.totalHotelAmount || 0);
}, [activeHotelGroupType, activeHotelListTotal, costBreakdown, hotelDetails, hotelReadOnly, roomCount, selectedHotelTotal]);

