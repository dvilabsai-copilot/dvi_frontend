import { useRef } from "react";

/** Stable refs shared by itinerary loading, hotel refresh, and route switching workflows. */
export function useItineraryPageRefs() {
  return {
    hotelSaveFunctionRef: useRef<(() => Promise<boolean>) | null>(null),
    isMountedRef: useRef(true),
    currentFetchRef: useRef<string | null>(null),
    latestRouteRequestRef: useRef(0),
    switchedRouteRef: useRef<string | null>(null),
  };
}
