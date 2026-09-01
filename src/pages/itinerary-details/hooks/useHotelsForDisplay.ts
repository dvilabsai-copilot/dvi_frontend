/* eslint-disable @typescript-eslint/no-explicit-any */
import { useMemo } from "react";
import type { ItineraryDay, ItineraryHotelDetailsResponse, ItineraryHotelRow } from "../itinerary-details.types";
import { reconcilePreviousDayBillingRows } from "../../hotel-list/earlyCheckInReconciliation";

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
    const persistedRows: HotelRowLike[] = Array.isArray(hotelDetails?.hotels)
      ? (hotelDetails.hotels as HotelRowLike[])
      : [];
    const stayRoutes = Array.isArray(hotelDetails?.hotelAvailability?.stayRoutes)
      ? hotelDetails.hotelAvailability.stayRoutes
      : [];
    const stayRouteById = new Map(
      stayRoutes.map((route: any) => [Number(route?.routeId || 0), route]),
    );
    const normalizeAnchorDate = (value: unknown): string => {
      const raw = String(value || '').trim();
      const isoDate = raw.match(/^\d{4}-\d{2}-\d{2}/)?.[0];
      if (isoDate) return isoDate;
      const parsed = value instanceof Date ? value : (raw ? new Date(raw) : null);
      return parsed && !Number.isNaN(parsed.getTime())
        ? parsed.toISOString().slice(0, 10)
        : '';
    };
    // Reset returns fresh recommendation anchors separately from persisted
    // selections. Expand each authoritative multi-night row into one
    // display anchor per route so the hotel list cannot lose the final night
    // while preserving the original shared inventory/rate options.
    const authoritativeRows = Array.isArray(hotelDetails?.hotelAvailability?.authoritativeRecommendationRows)
      ? hotelDetails.hotelAvailability.authoritativeRecommendationRows as HotelRowLike[]
      : [];
    const expandedAuthoritativeRows = authoritativeRows.flatMap((row) => {
      const routeIds = Array.isArray(row?.routeIds)
        ? row.routeIds.map(Number).filter((id) => id > 0)
        : [Number(row?.itineraryRouteId || row?.routeId || 0)].filter((id) => id > 0);
      return routeIds.map((routeId, index) => {
        const route = stayRouteById.get(routeId) as any;
        const date = normalizeAnchorDate(route?.date || route?.routeDate || row?.date || row?.checkInDate);
        const dayNumber = Number(route?.dayNumber || index + 1);
        return {
          ...row,
          itineraryRouteId: routeId,
          routeId,
          routeIds: [routeId],
          ...(date
            ? {
                date,
                checkInDate: date,
                day: `Day ${dayNumber} | ${date}`,
                dayNumber,
              }
            : {}),
        };
      });
    });
    const rows: HotelRowLike[] = [...persistedRows, ...expandedAuthoritativeRows].filter((row, index, all) => {
      const routeId = Number(row?.itineraryRouteId || row?.routeId || 0);
      const date = normalizeAnchorDate(row?.date || row?.checkInDate || row?.itineraryRouteDate);
      const key = [routeId, date, row?.groupType, row?.provider, row?.hotelName].join('|');
      return all.findIndex((candidate) => {
        const candidateRouteId = Number(candidate?.itineraryRouteId || candidate?.routeId || 0);
        const candidateDate = normalizeAnchorDate(candidate?.date || candidate?.checkInDate || candidate?.itineraryRouteDate);
        return [candidateRouteId, candidateDate, candidate?.groupType, candidate?.provider, candidate?.hotelName].join('|') === key;
      }) === index;
    });
    const realRows = reconcilePreviousDayBillingRows(rows as ItineraryHotelRow[]) as HotelRowLike[];

    if (!shouldShowHotels || !itineraryDays?.length || !hotelDetails) {
      return realRows as ItineraryHotelRow[];
    }

    const activeGroupType =
      activeHotelGroupType ??
      hotelDetails.hotelTabs?.[0]?.groupType ??
      realRows?.[0]?.groupType ??
      1;

    // Draft mode must keep the original supplier hotel rows.
    // Otherwise the hotel selection screen collapses to one row per day
    // and users cannot choose from all supplier options.
    if (!hotelReadOnly) {
      return realRows as ItineraryHotelRow[];
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

      let matchedIndex = realRows.findIndex((hotel, index: number) => {
        if (usedHotelIndexes.has(index)) return false;
        return routeId > 0 && getHotelRouteId(hotel) === routeId &&
          Boolean(dayDate) && getHotelDate(hotel) === dayDate;
      });

      if (matchedIndex < 0) {
        matchedIndex = realRows.findIndex((hotel, index: number) => {
          if (usedHotelIndexes.has(index)) return false;
          return routeId > 0 && getHotelRouteId(hotel) === routeId &&
            Boolean(dayDate) && normalizeDateOnly(hotel?.checkInDate) === dayDate;
        });
      }

      if (matchedIndex < 0) {
        matchedIndex = realRows.findIndex((hotel, index: number) => {
          if (usedHotelIndexes.has(index)) return false;

          const hotelDate = getHotelDate(hotel);
          const dateMatches = Boolean(dayDate && hotelDate && dayDate === hotelDate);

          return getHotelDayNumber(hotel) === dayNumber && dateMatches;
        });
      }

      if (matchedIndex < 0) {
        matchedIndex = realRows.findIndex((hotel, index: number) => {
          if (usedHotelIndexes.has(index)) return false;
          const hotelDate = getHotelDate(hotel);
          return Boolean(dayDate && hotelDate && dayDate === hotelDate) &&
            isSameDestination(hotel, day);
        });
      }

      if (matchedIndex < 0) {
        return null;
      }

      usedHotelIndexes.add(matchedIndex);

      const matched = realRows[matchedIndex] as any;
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
        earlyCheckIn: Boolean(matched?.earlyCheckIn || matched?.previousDayBilling),
        previousDayBilling: matched?.previousDayBilling,
        previousDayBillingSynthetic: false,
        // Display ownership follows the active recommendation tab. A route
        // keyed parent selection can otherwise carry the previous tab's group.
        groupType: Number(activeGroupType ?? matched?.groupType ?? 0),
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
          return realRows.some((hotel) => {
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

        // Missing availability is represented by the backend metadata and
        // empty-state banner. Do not manufacture a second hotel row for a day
        // that has no persisted option or real selected-hotel identity.
        return matchedHotel;
      });

    const displayRows = orderedRows.filter((row): row is ItineraryHotelRow => Boolean(row));
    const displayedRouteDates = new Set(
      displayRows.map((row) => `${getHotelRouteId(row)}::${getHotelDate(row)}`),
    );

    // Reset/check-availability can return a valid route-level row even when
    // the itinerary's compact day list is stale or ends one night early.
    // Keep the list complete by appending only missing route/date anchors from
    // the same fresh response; this does not invent a selection or alter any
    // provider/rate fields.
    const missingRouteRows = realRows
      .filter((row) => {
        const routeId = getHotelRouteId(row);
        const date = getHotelDate(row);
        return routeId > 0 && date && !displayedRouteDates.has(`${routeId}::${date}`);
      })
      .reduce<ItineraryHotelRow[]>((result, row) => {
        const routeId = getHotelRouteId(row);
        const date = getHotelDate(row);
        const key = `${routeId}::${date}`;
        if (result.some((candidate) => `${getHotelRouteId(candidate)}::${getHotelDate(candidate)}` === key)) {
          return result;
        }
        const route = stayRouteById.get(routeId) as any;
        const dayNumber = Number(route?.dayNumber || getHotelDayNumber(row) || result.length + 1);
        result.push({
          ...row,
          itineraryRouteId: routeId,
          routeId,
          routeIds: [routeId],
          day: route?.date ? `Day ${dayNumber} | ${String(route.date).slice(0, 10)}` : row.day,
          dayNumber,
          date: route?.date ? String(route.date).slice(0, 10) : date,
          sortOrder: dayNumber,
        });
        return result;
      }, []);

    return [...displayRows, ...missingRouteRows]
      .sort((a, b) => Number(a.dayNumber || 0) - Number(b.dayNumber || 0)) as ItineraryHotelRow[];
  }, [hotelDetails, itineraryDays, itineraryDayCount, shouldShowHotels, activeHotelGroupType, hotelReadOnly]);

};
