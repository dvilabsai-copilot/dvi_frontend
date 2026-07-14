import type { HotelArrivalPolicyRequest } from "@/services/itinerary";
import type { ItineraryDetailsResponse } from "../itinerary-details.types";
import { normalizeDateToYmd, parseDisplayTimeToHms } from "./timeline.utils";

export function buildArrivalPolicyDecisionKey(
  routeId?: number,
  routeDate?: string,
  startTimeHms?: string,
) {
  const normalizedRouteId = Number(routeId || 0);
  const normalizedRouteDate = normalizeDateToYmd(routeDate);
  const normalizedStartTime = String(startTimeHms || "").trim();

  if (!normalizedRouteId || !normalizedRouteDate || !normalizedStartTime) {
    return null;
  }

  return `${normalizedRouteId}|${normalizedRouteDate}|${normalizedStartTime}`;
}

export function getRequestArrivalPolicyDecisionKey(
  request: HotelArrivalPolicyRequest | null,
  itinerary: ItineraryDetailsResponse | null,
) {
  if (!request) return null;

  const arrivalTimeHms = (() => {
    if (request.arrivalDateTime && request.arrivalDateTime.includes("T")) {
      return request.arrivalDateTime.split("T")[1]?.slice(0, 8) || "";
    }

    const routeDay = itinerary?.days?.find(
      (day) => Number(day.id) === Number(request.itineraryRouteId),
    );
    return parseDisplayTimeToHms(routeDay?.startTime || "");
  })();

  return buildArrivalPolicyDecisionKey(
    request.itineraryRouteId,
    request.routeDate,
    arrivalTimeHms,
  );
}
