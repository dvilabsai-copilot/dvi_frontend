import { useEffect } from "react";
import type { ItineraryDetailsResponse, ItineraryHotelDetailsResponse } from "../itinerary-details.types";
import { buildArrivalPolicyDecisionKey } from "../utils/routeArrivalPolicy.utils";
import { isEarlyMorningTime, normalizeDateToYmd, parseDisplayTimeToHms } from "../utils/timeline.utils";

/** Restores the early-arrival decision marker when the hotel timeline is hydrated. */
export function useItineraryArrivalPolicyHydration({
  itinerary,
  hotelDetails,
  setLastArrivalPolicyDecisionKey,
}: {
  itinerary: ItineraryDetailsResponse | null;
  hotelDetails: ItineraryHotelDetailsResponse | null;
  setLastArrivalPolicyDecisionKey: (value: string) => void;
}) {
  useEffect(() => {
    const firstDay = itinerary?.days?.find((day) => Number(day.dayNumber) === 1) || itinerary?.days?.[0];
    if (!firstDay || !hotelDetails) return;

    const routeDateYmd = normalizeDateToYmd(firstDay.date);
    const startTimeHms = parseDisplayTimeToHms(firstDay.startTime || "");
    if (!routeDateYmd || !startTimeHms || !isEarlyMorningTime(startTimeHms)) return;

    const hasPreviousDayMarkerRow = hotelDetails.hotels.some((hotel) => {
      const hotelDateYmd = normalizeDateToYmd(hotel.date);
      return Number(hotel.itineraryRouteId || 0) === Number(firstDay.id || 0)
        && Number(hotel.hotelId || 0) === 0
        && Boolean(hotelDateYmd)
        && hotelDateYmd !== routeDateYmd;
    });

    if (hasPreviousDayMarkerRow) {
      setLastArrivalPolicyDecisionKey(buildArrivalPolicyDecisionKey(firstDay.id, firstDay.date, startTimeHms));
    }
  }, [hotelDetails, itinerary]);
}
