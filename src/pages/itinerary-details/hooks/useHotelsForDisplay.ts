/* eslint-disable @typescript-eslint/no-explicit-any */
import { useMemo } from "react";
import type { ItineraryDay, ItineraryHotelDetailsResponse, ItineraryHotelRow } from "../itinerary-details.types";

type HotelRowLike = Record<string, any>;

type UseHotelsForDisplayOptions = {
  hotelDetails: ItineraryHotelDetailsResponse | null;
  itineraryDays?: ItineraryDay[] | null;
  itineraryDayCount?: number | null;
  shouldShowHotels: boolean;
  activeHotelGroupType: number | null;
  hotelReadOnly: boolean;
};

/** Shapes confirmed/read-only hotel rows one-per-itinerary-day while retaining draft supplier choices. */
export const useHotelsForDisplay = ({
  hotelDetails,
  itineraryDays,
  itineraryDayCount,
  shouldShowHotels,
  activeHotelGroupType,
  hotelReadOnly,
}: UseHotelsForDisplayOptions): ItineraryHotelRow[] => {
  return useMemo(() => {
    const rows: HotelRowLike[] = Array.isArray(hotelDetails?.hotels) ? (hotelDetails.hotels as HotelRowLike[]) : [];

    if (!shouldShowHotels || !itineraryDays?.length || !hotelDetails) {
      return rows as ItineraryHotelRow[];
    }

    const activeGroupType =
      activeHotelGroupType ??
      hotelDetails.hotelTabs?.[0]?.groupType ??
      rows?.[0]?.groupType ??
      1;

    // Draft mode must keep the original supplier hotel rows.
    // Otherwise the hotel selection screen collapses to one row per day
    // and users cannot choose from all supplier options.
    if (!hotelReadOnly) {
      return rows as ItineraryHotelRow[];
    }

    const normalizeText = (value: unknown): string =>
      String(value || '')
        .trim()
        .toLowerCase()
        .replace(/\s+/g, ' ');

    const normalizeDateOnly = (value: unknown): string => {
      const raw = String(value || '').trim();
      if (!raw) return '';

      if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
        return raw;
      }

      const parsed = new Date(raw);
      if (!Number.isNaN(parsed.getTime())) {
        return parsed.toISOString().split('T')[0];
      }

      return raw.split('T')[0] || raw;
    };

    const formatHotelDayLabel = (day: ItineraryDay, index: number): string => {
      const dayNumber = Number(day?.dayNumber || index + 1);
      const dateOnly = normalizeDateOnly(day?.date);

      return dateOnly
        ? `Day ${dayNumber} | ${dateOnly}`
        : `Day ${dayNumber}`;
    };

    const getHotelRouteId = (hotel: HotelRowLike): number =>
      Number(
        hotel?.itineraryRouteId ||
        hotel?.routeId ||
        hotel?.itinerary_route_id ||
        0,
      );

    const getHotelDayNumber = (hotel: HotelRowLike): number => {
      const explicitDayNumber = Number(
        hotel?.dayNumber ||
        hotel?.noOfDays ||
        hotel?.no_of_days ||
        0,
      );

      if (Number.isFinite(explicitDayNumber) && explicitDayNumber > 0) {
        return explicitDayNumber;
      }

      const parsedFromText = Number(
        String(hotel?.day || '').match(/day\s*(\d+)/i)?.[1] || 0,
      );

      return Number.isFinite(parsedFromText) && parsedFromText > 0
        ? parsedFromText
        : 0;
    };

    const getHotelDate = (hotel: HotelRowLike): string =>
      normalizeDateOnly(
        hotel?.date ||
        hotel?.checkInDate ||
        hotel?.itineraryRouteDate ||
        hotel?.itinerary_route_date ||
        '',
      );

    const isSameDestination = (hotel: HotelRowLike, day: ItineraryDay): boolean => {
      const hotelDestination = normalizeText(hotel?.destination);
      const dayDestination = normalizeText(day?.arrival || day?.departure);

      if (!hotelDestination || !dayDestination) return false;

      return (
        hotelDestination === dayDestination ||
        hotelDestination.includes(dayDestination) ||
        dayDestination.includes(hotelDestination)
      );
    };

    const usedHotelIndexes = new Set<number>();

    const findHotelForDay = (day: ItineraryDay, dayIndex: number): ItineraryHotelRow | null => {
      const routeId = Number(day?.id || 0);
      const dayNumber = Number(day?.dayNumber || dayIndex + 1);
      const dayDate = normalizeDateOnly(day?.date);

      let matchedIndex = rows.findIndex((hotel, index: number) => {
        if (usedHotelIndexes.has(index)) return false;
        return routeId > 0 && getHotelRouteId(hotel) === routeId;
      });

      if (matchedIndex < 0) {
        matchedIndex = rows.findIndex((hotel, index: number) => {
          if (usedHotelIndexes.has(index)) return false;
          return getHotelDayNumber(hotel) === dayNumber;
        });
      }

      if (matchedIndex < 0) {
        matchedIndex = rows.findIndex((hotel, index: number) => {
          if (usedHotelIndexes.has(index)) return false;

          const hotelDate = getHotelDate(hotel);
          const dateMatches = Boolean(dayDate && hotelDate && dayDate === hotelDate);

          return dateMatches && isSameDestination(hotel, day);
        });
      }

      if (matchedIndex < 0) {
        return null;
      }

      usedHotelIndexes.add(matchedIndex);

      const matched = rows[matchedIndex] as any;

      const itineraryPlanHotelDetailsId = Number(
        matched?.itineraryPlanHotelDetailsId ||
        matched?.itinerary_plan_hotel_details_ID ||
        0,
      );

      const confirmedItineraryPlanHotelDetailsId = Number(
        matched?.confirmedItineraryPlanHotelDetailsId ||
        matched?.confirmed_itinerary_plan_hotel_details_ID ||
        0,
      );

      const hotelDetailsIds = Array.isArray(matched?.hotelDetailsIds)
        ? matched.hotelDetailsIds
            .map((id) => Number(id))
            .filter((id: number) => Number.isFinite(id) && id > 0)
        : itineraryPlanHotelDetailsId > 0
          ? [itineraryPlanHotelDetailsId]
          : [];

      const voucherCancelled = matched?.voucherCancelled === true;

      return {
        ...matched,
        groupType: Number(matched?.groupType || activeGroupType),
        itineraryRouteId: routeId || getHotelRouteId(matched),
        day: formatHotelDayLabel(day, dayIndex),
        dayNumber,
        sortOrder: dayNumber,
        destination:
          String(day?.arrival || day?.departure || '').trim() ||
          matched?.destination ||
          `Day ${dayNumber}`,
        date: dayDate || matched?.date,

        itineraryPlanHotelDetailsId,
        confirmedItineraryPlanHotelDetailsId,
        hotelDetailsIds,
        voucherCancelled,
        canCancelVoucher:
          !voucherCancelled &&
          (hotelDetailsIds.length > 0 || Number(routeId || 0) > 0),
      } as ItineraryHotelRow;
    };

    const totalDays = Number(itineraryDayCount || itineraryDays?.length || 0);

    const orderedRows = itineraryDays
      .filter((day, index: number) => {
        const dayNumber = Number(day?.dayNumber || index + 1);

        if (totalDays > 0 && dayNumber === totalDays) {
          return rows.some((hotel) => {
            const routeId = Number(day?.id || 0);
            return (
              getHotelRouteId(hotel) === routeId ||
              getHotelDayNumber(hotel) === dayNumber
            );
          });
        }

        return true;
      })
      .map((day, index: number) => {
        const routeId = Number(day?.id || 0);
        const dayNumber = Number(day?.dayNumber || index + 1);
        const dateOnly = normalizeDateOnly(day?.date);
        const destination =
          String(day?.arrival || day?.departure || '').trim() ||
          `Day ${dayNumber}`;

        const matchedHotel = findHotelForDay(day, index);

        if (matchedHotel) {
          return matchedHotel;
        }

        return {
          groupType: activeGroupType,
          itineraryRouteId: routeId,
          day: formatHotelDayLabel(day, index),
          dayNumber,
          sortOrder: dayNumber,
          destination,
          hotelId: 0,
          hotelName: 'No Hotels Available',
          category: 0,
          roomType: '',
          mealPlan: '',
          displayRoomType: '-',
          displayMealPlan: '-',
          totalHotelCost: 0,
          totalHotelTaxAmount: 0,
          provider: 'external',
          isBookable: false,
          externalStay: true,
          availabilityStatus: 'NO_SUPPLIER_AVAILABILITY' as const,
          availabilityMessage:
            'No supplier hotel rooms are available for this city/date. Customer must arrange stay manually.',
          voucherCancelled: false,
          itineraryPlanHotelDetailsId: 0,
          date: dateOnly,
        } as ItineraryHotelRow;
      });

    return orderedRows as ItineraryHotelRow[];
  }, [hotelDetails, itineraryDays, itineraryDayCount, shouldShowHotels, activeHotelGroupType, hotelReadOnly]);

};
