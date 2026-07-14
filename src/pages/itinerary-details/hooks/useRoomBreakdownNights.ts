import { useMemo } from "react";
import type { ItineraryHotelDetailsResponse, ItineraryHotelRow } from "../itinerary-details.types";
import { isSupplierBookableHotel } from "../utils/domain.utils";

interface SelectedBooking {
  bookingCode?: string;
  roomType?: string;
  netAmount?: number;
  hotelCode?: string;
  hotelName?: string;
}

interface RoomBreakdownOptions {
  hotelDetails: ItineraryHotelDetailsResponse | null;
  activeHotelGroupType: number | null;
  dayCount?: number | null;
  daysLength?: number;
  roomCount?: number | null;
  selectedHotelBookings: Record<number, SelectedBooking>;
}

/** Derives room-night count using selected hotel matches and cheapest fallbacks. */
export const useRoomBreakdownNights = ({
  hotelDetails,
  activeHotelGroupType,
  dayCount,
  daysLength,
  roomCount,
  selectedHotelBookings,
}: RoomBreakdownOptions) => useMemo(() => {
  const fallbackStayCount = Number(dayCount || daysLength || 1);
  const fallbackRoomCount = Math.max(Number(roomCount || 1), 1);
  if (!hotelDetails?.hotels?.length) return fallbackStayCount * fallbackRoomCount;
  const preferredGroupType = activeHotelGroupType ?? hotelDetails.hotelTabs?.[0]?.groupType ?? 1;
  const getStayDate = (hotel: ItineraryHotelRow): string => {
    if (hotel.checkInDate) return String(hotel.checkInDate);
    if (hotel.date) return String(hotel.date);
    const parts = String(hotel.day || "").split(" | ");
    return (parts[1] || parts[0]).trim();
  };
  const groupedByStay = new Map<string, ItineraryHotelRow[]>();
  hotelDetails.hotels.filter((hotel) => Number(hotel.groupType) === Number(preferredGroupType) && isSupplierBookableHotel(hotel)).forEach((hotel) => {
    const routeId = Number(hotel.itineraryRouteId || 0);
    if (!routeId) return;
    const key = `${routeId}::${getStayDate(hotel)}`;
    const rows = groupedByStay.get(key) || [];
    rows.push(hotel);
    groupedByStay.set(key, rows);
  });
  const matchSelectedHotelRow = (rows: ItineraryHotelRow[], routeId: number) => {
    const selected = selectedHotelBookings[routeId];
    if (!selected) return null;
    return rows.find((hotel) => {
      const bookingCodeMatch = selected.bookingCode && hotel.bookingCode && selected.bookingCode === hotel.bookingCode;
      const roomTypeMatch = selected.roomType && hotel.roomType && selected.roomType.trim() === hotel.roomType.trim();
      const amountMatch = Number(selected.netAmount || 0) > 0 && Number(selected.netAmount || 0) === Number(hotel.totalHotelCost || 0) + Number(hotel.totalHotelTaxAmount || 0);
      const strictBookingMatch = Boolean(bookingCodeMatch && (roomTypeMatch || amountMatch));
      const hotelCodeMatch = selected.hotelCode && hotel.hotelCode && selected.hotelCode === hotel.hotelCode;
      const hotelNameMatch = selected.hotelName && hotel.hotelName && selected.hotelName.trim().toLowerCase() === hotel.hotelName.trim().toLowerCase();
      return Boolean(strictBookingMatch || hotelCodeMatch || hotelNameMatch);
    }) || null;
  };
  let totalRoomNights = 0;
  groupedByStay.forEach((rows, stayKey) => {
    const routeId = Number(stayKey.split("::")[0] || 0);
    const selectedMatch = routeId ? matchSelectedHotelRow(rows, routeId) : null;
    const cheapest = rows.reduce((best, current) => Number(current.totalHotelCost || 0) + Number(current.totalHotelTaxAmount || 0) < Number(best.totalHotelCost || 0) + Number(best.totalHotelTaxAmount || 0) ? current : best);
    const chosen = selectedMatch || cheapest;
    totalRoomNights += Math.max(Number(chosen.noOfRooms || 0) || fallbackRoomCount, 1);
  });
  return totalRoomNights || fallbackStayCount * fallbackRoomCount;
}, [activeHotelGroupType, dayCount, daysLength, hotelDetails, roomCount, selectedHotelBookings]);

