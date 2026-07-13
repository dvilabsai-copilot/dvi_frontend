import { useMemo } from "react";
import type { ItineraryHotelDetailsResponse, ItineraryHotelRow } from "../itinerary-details.types";

interface SelectedHotelBookingSummary {
  bookingCode?: string;
  roomType?: string;
  netAmount?: number;
  hotelCode?: string;
  hotelName?: string;
}

interface HotelRouteSummary {
  hotelName: string;
  hotelDistance: string | null;
  totalAmount: number;
  noOfRooms: number;
}

interface SelectedHotelSummaryOptions {
  selectedHotelBookings: Record<number, SelectedHotelBookingSummary>;
  hotelDetails: ItineraryHotelDetailsResponse | null;
  activeHotelGroupType: number | null;
  roomCount?: number | null;
}

/** Derives selected hotel totals and route-level display summaries. */
export const useSelectedHotelSummary = ({
  selectedHotelBookings,
  hotelDetails,
  activeHotelGroupType,
  roomCount,
}: SelectedHotelSummaryOptions) => {
  const selectedHotelTotal = useMemo(
    () => Object.values(selectedHotelBookings).reduce((sum, item) => sum + Number(item.netAmount || 0), 0),
    [selectedHotelBookings],
  );

  const selectedHotelMetaByRoute = useMemo(() => {
    const map = new Map<number, HotelRouteSummary>();
    if (!hotelDetails?.hotels?.length) return map;
    const itineraryRoomCount = Math.max(Number(roomCount || 1), 1);
    const preferredGroupType = activeHotelGroupType ?? hotelDetails.hotelTabs?.[0]?.groupType ?? 1;
    const routeBuckets = new Map<number, ItineraryHotelRow[]>();

    hotelDetails.hotels
      .filter((hotel) => hotel.groupType === preferredGroupType)
      .forEach((hotel) => {
        const routeId = Number(hotel.itineraryRouteId || 0);
        if (!routeId) return;
        const rows = routeBuckets.get(routeId) || [];
        rows.push(hotel);
        routeBuckets.set(routeId, rows);
      });

    routeBuckets.forEach((rows, routeId) => {
      const selected = selectedHotelBookings[routeId];
      if (selected) {
        const matched = rows.find((hotel) => {
          const bookingCodeMatch = selected.bookingCode && hotel.bookingCode && selected.bookingCode === hotel.bookingCode;
          const roomTypeMatch = selected.roomType && hotel.roomType && selected.roomType.trim() === hotel.roomType.trim();
          const amountMatch = Number(selected.netAmount || 0) > 0 && Number(selected.netAmount || 0) === (
            Number(hotel.totalHotelCost || 0) + Number(hotel.totalHotelTaxAmount || 0)
          );
          const strictBookingMatch = Boolean(bookingCodeMatch && (roomTypeMatch || amountMatch));
          const hotelCodeMatch = selected.hotelCode && hotel.hotelCode && selected.hotelCode === hotel.hotelCode;
          const hotelNameMatch = selected.hotelName && hotel.hotelName && selected.hotelName.trim().toLowerCase() === hotel.hotelName.trim().toLowerCase();
          return Boolean(strictBookingMatch || hotelCodeMatch || hotelNameMatch);
        });
        map.set(routeId, {
          hotelName: selected.hotelName || matched?.hotelName || "Hotel",
          hotelDistance: matched?.hotelDistance || null,
          totalAmount: Number(selected.netAmount || 0) || Number(matched?.totalHotelCost || 0) + Number(matched?.totalHotelTaxAmount || 0),
          noOfRooms: Math.max(Number(matched?.noOfRooms || 0), 0) || itineraryRoomCount,
        });
        return;
      }

      const cheapest = rows.reduce((best, current) => (
        Number(current.totalHotelCost || 0) + Number(current.totalHotelTaxAmount || 0)
          < Number(best.totalHotelCost || 0) + Number(best.totalHotelTaxAmount || 0)
          ? current
          : best
      ));
      map.set(routeId, {
        hotelName: cheapest.hotelName || "Hotel",
        hotelDistance: cheapest.hotelDistance || null,
        totalAmount: Number(cheapest.totalHotelCost || 0) + Number(cheapest.totalHotelTaxAmount || 0),
        noOfRooms: Math.max(Number(cheapest.noOfRooms || 0), 0) || itineraryRoomCount,
      });
    });

    return map;
  }, [activeHotelGroupType, hotelDetails, roomCount, selectedHotelBookings]);

  return { selectedHotelTotal, selectedHotelMetaByRoute };
};

