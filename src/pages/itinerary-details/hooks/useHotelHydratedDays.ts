import { useMemo } from "react";
import type { ItineraryDay } from "../itinerary-details.types";

type SelectedHotelRouteMeta = {
  hotelName?: string | null;
  hotelDistance?: string | null;
};

type UseHotelHydratedDaysOptions = {
  itineraryDays?: ItineraryDay[] | null;
  selectedHotelMetaByRoute: Map<number, SelectedHotelRouteMeta>;
};

/**
 * Timeline data is authoritative in the itinerary details API.
 *
 * Keep this hook as a compatibility boundary for existing callers, but do not
 * derive, recalculate, insert, or relabel timeline segments in the browser.
 * Hotel selection summaries are handled independently by their own hooks.
 */
export const useHotelHydratedDays = ({
  itineraryDays,
}: UseHotelHydratedDaysOptions): ItineraryDay[] => {
  return useMemo(
    () => (itineraryDays || []).map((day) => ({
      ...day,
      segments: Array.isArray(day.segments) ? day.segments : [],
    })),
    [itineraryDays],
  );
};
