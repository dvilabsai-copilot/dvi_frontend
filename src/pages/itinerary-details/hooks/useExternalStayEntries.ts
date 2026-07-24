import { useMemo } from "react";
import type { ItineraryHotelDetailsResponse } from "../itinerary-details.types";
import { isManualApprovalHotel, isSupplierBookableHotel } from "../utils/domain.utils";

export type ExternalStayEntry = {
  routeId: number;
  destination: string;
  day: string;
  hotelName: string;
  availabilityStatus: string;
  availabilityMessage: string;
};

type UseExternalStayEntriesOptions = {
  hotelDetails: ItineraryHotelDetailsResponse | null;
  activeHotelGroupType: number | null;
};

export const DEFAULT_EXTERNAL_STAY_MESSAGE =
  "No supplier hotel rooms are available for this city/date. Customer must arrange stay manually.";

/** Derives the read-only customer-facing list of routes requiring an external stay. */
export const useExternalStayEntries = ({
  hotelDetails,
  activeHotelGroupType,
}: UseExternalStayEntriesOptions): ExternalStayEntry[] => useMemo(() => {
  if (!hotelDetails?.hotels?.length) return [];

  const preferredGroupType =
    activeHotelGroupType ??
    hotelDetails.hotelTabs?.[0]?.groupType ??
    1;

  const entriesByStay = new Map<string, ExternalStayEntry>();
  const preferredRows = hotelDetails.hotels.filter(
    (row) => Number(row?.groupType) === Number(preferredGroupType),
  );
  const coveredRouteIds = new Set(
    preferredRows
      .filter((row) => isSupplierBookableHotel(row) || isManualApprovalHotel(row))
      .map((row) => Number(row?.itineraryRouteId || 0))
      .filter((routeId) => routeId > 0),
  );

  preferredRows
    .filter((row) =>
      !isSupplierBookableHotel(row) &&
      !isManualApprovalHotel(row) &&
      !coveredRouteIds.has(Number(row?.itineraryRouteId || 0)),
    )
    .forEach((row) => {
      const entry: ExternalStayEntry = {
        routeId: Number(row?.itineraryRouteId || 0),
        destination: String(row?.destination || "").trim(),
        day: String(row?.day || "").trim(),
        hotelName: String(row?.hotelName || "").trim(),
        availabilityStatus: row?.availabilityStatus || "NO_SUPPLIER_AVAILABILITY",
        availabilityMessage: row?.availabilityMessage || DEFAULT_EXTERNAL_STAY_MESSAGE,
      };

      // Package fallbacks can repeat the same unavailable route several times.
      // The confirmation dialog should show one actionable warning per stay.
      const stayKey = entry.routeId > 0
        ? `route:${entry.routeId}`
        : `stay:${entry.destination.toLowerCase()}|${entry.day.toLowerCase()}`;

      if (!entriesByStay.has(stayKey)) {
        entriesByStay.set(stayKey, entry);
      }
    });

  return Array.from(entriesByStay.values());
}, [activeHotelGroupType, hotelDetails]);
