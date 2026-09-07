/* eslint-disable @typescript-eslint/no-explicit-any */
import { useMemo } from "react";
import type { ItineraryHotelDetailsResponse } from "../itinerary-details.types";
import { isManualApprovalHotel, isSupplierBookableHotel } from "../utils/domain.utils";
import {
  getBookingCodeForBooking,
  getHotelAmountForBooking,
  getHotelCodeForBooking,
  normalizeHotelProvider,
} from "../utils/hotelBookingNormalization.utils";

type UseNonTboSelectedHotelEntriesOptions = {
  selectedHotelBookings: Record<number, any | null>;
  selectedHotelCoveredRouteIds: Set<number>;
  hotelDetails: ItineraryHotelDetailsResponse | null;
  activeHotelGroupType: number | null;
};

const dateOnly = (value: unknown): string => String(value || '').slice(0, 10);

const daysBetween = (start: string, end: string): number => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(start) || !/^\d{4}-\d{2}-\d{2}$/.test(end)) return 0;
  const difference = Date.parse(`${end}T00:00:00Z`) - Date.parse(`${start}T00:00:00Z`);
  return Number.isFinite(difference) && difference > 0 ? Math.round(difference / 86400000) : 0;
};

/** Shapes selected non-TBO bookings for quotation review without sending them to TBO prebook. */
export const useNonTboSelectedHotelEntries = ({
  selectedHotelBookings,
  selectedHotelCoveredRouteIds,
  hotelDetails,
  activeHotelGroupType,
}: UseNonTboSelectedHotelEntriesOptions): Array<Record<string, any>> => useMemo(() => {
    return Object.entries(selectedHotelBookings)
    .filter(([routeId, h]) => {
      if ((!isSupplierBookableHotel(h) && !isManualApprovalHotel(h)) || normalizeHotelProvider(h) === 'tbo') {
        return false;
      }

      // Confirmation must describe the currently visible recommendation
      // package. Without this guard, an offline/manual booking from a
      // previously selected recommendation tab can be shown beside the active
      // tab's live hotel.
      if (Number(activeHotelGroupType || 0) > 0 && Number(h?.groupType || 0) !== Number(activeHotelGroupType)) {
        return false;
      }

      const routeIdNum = Number(routeId);

      if (!h?.multiNightBooking && selectedHotelCoveredRouteIds.has(routeIdNum)) {
        const parentForRoute = Object.values(selectedHotelBookings).find((selected) => {
          const routeIds = Array.isArray(selected?.routeIds)
            ? selected.routeIds.map((id) => Number(id))
            : [];

          return selected?.multiNightBooking && routeIds.includes(routeIdNum);
        });

        if (parentForRoute) {
          return false;
        }
      }

      return true;
    })
    .map(([routeId, h]: [string, any]) => {
      const routeIdNum = parseInt(routeId, 10);
      const selectedProvider = normalizeHotelProvider(h);
      const selectedBookingCode = getBookingCodeForBooking(h);
      const selectedHotelCode = getHotelCodeForBooking(h);
      const selectedHotelName = String((h as any)?.hotelName || '').trim().toLowerCase();
      const selectedRoomType = String((h as any)?.roomType || '').trim().toLowerCase();
      const selectedAmount = getHotelAmountForBooking(h);

      const displayRouteIds = Array.isArray(h?.routeIds) && h.routeIds.length > 0
        ? h.routeIds
            .map((id) => Number(id))
            .filter((id: number) => Number.isFinite(id) && id > 0)
        : [routeIdNum];

      const routeRows = (Array.isArray(hotelDetails?.hotels) ? hotelDetails.hotels : []).filter((row) =>
        displayRouteIds.includes(Number(row?.itineraryRouteId || 0)) &&
        normalizeHotelProvider(row) === selectedProvider &&
        (isSupplierBookableHotel(row) || isManualApprovalHotel(row)),
      );

      const matchedHotelRow =
        routeRows.find((row) => {
          const rowBookingCode = String(row?.bookingCode || row?.searchReference || '').trim();
          const rowHotelCode = String(row?.hotelCode || '').trim();
          const rowHotelName = String(row?.hotelName || '').trim().toLowerCase();
          const rowRoomType = String(row?.roomType || '').trim().toLowerCase();
          const rowAmount = Number(row?.totalHotelCost || 0) + Number(row?.totalHotelTaxAmount || 0);

          const bookingCodeMatch = selectedBookingCode !== '' && rowBookingCode !== '' && selectedBookingCode === rowBookingCode;
          const hotelCodeMatch = selectedHotelCode !== '' && rowHotelCode !== '' && selectedHotelCode === rowHotelCode;
          const hotelNameMatch = selectedHotelName !== '' && rowHotelName !== '' && selectedHotelName === rowHotelName;
          const roomTypeMatch = selectedRoomType !== '' && rowRoomType !== '' && selectedRoomType === rowRoomType;
          const amountMatch = selectedAmount > 0 && Math.abs(selectedAmount - rowAmount) <= 0.01;

          return (bookingCodeMatch && (roomTypeMatch || amountMatch)) || hotelCodeMatch || (hotelNameMatch && amountMatch);
        }) || routeRows[0] || null;

      const earlyCheckIn = Boolean(
        h?.earlyCheckIn === true ||
        Number(h?.early_checkin || 0) === 1 ||
        matchedHotelRow?.earlyCheckIn === true ||
        Number((matchedHotelRow as any)?.early_checkin || 0) === 1,
      );
      const blockedCheckInDate = earlyCheckIn
        ? dateOnly(h?.hotelCheckInDate || h?.hotel_check_in_date || matchedHotelRow?.hotelCheckInDate || (matchedHotelRow as any)?.hotel_check_in_date)
        : '';
      const guestArrivalDate = dateOnly(h?.checkInDate || matchedHotelRow?.checkInDate || matchedHotelRow?.date);
      const displayCheckInDate = blockedCheckInDate || h?.checkInDate;
      const displayCheckOutDate = h?.checkOutDate || matchedHotelRow?.checkOutDate;
      const continuousNights = blockedCheckInDate ? daysBetween(blockedCheckInDate, dateOnly(displayCheckOutDate)) : 0;

      return {
        routeId: routeIdNum,
        ...h,
        matchedHotelRow,
        displayRouteIds,
        earlyCheckIn,
        earlyCheckInDate: blockedCheckInDate || null,
        earlyGuestArrivalDate: guestArrivalDate || null,
        earlyGuestArrivalAt: h?.actualGuestArrivalAt || matchedHotelRow?.actualGuestArrivalAt || null,
        displayNights: continuousNights || Number(h?.nights || displayRouteIds.length || 1),
        displayCheckInDate,
        displayCheckOutDate,
      };
    });
  }, [
    hotelDetails?.hotels,
    selectedHotelBookings,
    selectedHotelCoveredRouteIds,
    activeHotelGroupType,
  ]);
