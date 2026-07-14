import { useMemo } from "react";
import type { ItineraryDay } from "../itinerary-details.types";

type DisplayItineraryDaysOptions = {
  hotelHydratedDays: ItineraryDay[];
  itineraryDays: ItineraryDay[] | null | undefined;
};

/** Owns the display-day fallback and start-segment ordering used by the itinerary timeline. */
export const useDisplayItineraryDays = ({ hotelHydratedDays, itineraryDays }: DisplayItineraryDaysOptions): ItineraryDay[] => useMemo(() => {
  const sourceDays = hotelHydratedDays.length ? hotelHydratedDays : itineraryDays || [];

  return sourceDays.map((day, index) => {
    const rawSegments = (() => {
      if (day.segments && Array.isArray(day.segments) && day.segments.length > 0) {
        return day.segments;
      }

      const originalDay = itineraryDays && itineraryDays.length > index ? itineraryDays[index] : null;
      if (originalDay?.segments && Array.isArray(originalDay.segments)) {
        return originalDay.segments;
      }

      return [];
    })();

    if (index === 0 && rawSegments.length === 0) {
      console.warn("[ItineraryDetails] DisplayDays: No segments found for day 0!", {
        dayFromHydrated: day,
        dayFromOriginal: itineraryDays?.[0],
        hotelHydratedDaysLength: hotelHydratedDays.length,
        itineraryDaysLength: itineraryDays?.length,
      });
    }

    if (index === 0) {
      console.log("[ItineraryDetails] DisplayDays day 0:", {
        segmentCount: rawSegments.length,
        hasSegments: rawSegments.length > 0,
        types: rawSegments.map((segment) => segment?.type),
      });
    }

    return {
      ...day,
      segments: rawSegments.length > 0 ? rawSegments.sort((a, b) => {
        if (a.type === "start" && b.type !== "start") return -1;
        if (b.type === "start" && a.type !== "start") return 1;
        return 0;
      }) : [],
    };
  });
}, [hotelHydratedDays, itineraryDays]);
