import { useEffect } from "react";
import type { ItineraryDetailsResponse } from "../itinerary-details.types";

/** Coordinates post-refresh scrolling and route-progress cleanup for the itinerary page. */
export function useItineraryScrollEffects({
  itinerary,
  pendingScrollDayNumber,
  setPendingScrollDayNumber,
  getFitHereRefreshScrollStorageKey,
  stopRouteTimeProgress,
}: {
  itinerary: ItineraryDetailsResponse | null;
  pendingScrollDayNumber: number | null;
  setPendingScrollDayNumber: (value: number | null) => void;
  getFitHereRefreshScrollStorageKey: () => string;
  stopRouteTimeProgress: () => void;
}) {
  useEffect(() => {
    if (!pendingScrollDayNumber) return;
    const timer = window.setTimeout(() => {
      const dayElement = document.getElementById(`itinerary-day-${pendingScrollDayNumber}`);
      if (dayElement) dayElement.scrollIntoView({ behavior: "smooth", block: "start" });
      setPendingScrollDayNumber(null);
    }, 180);
    return () => window.clearTimeout(timer);
  }, [itinerary, pendingScrollDayNumber]);

  useEffect(() => {
    if (!itinerary?.days?.length || pendingScrollDayNumber) return;
    const scrollStorageKey = getFitHereRefreshScrollStorageKey();
    if (!scrollStorageKey) return;
    const storedDayNumber = Number(window.sessionStorage.getItem(scrollStorageKey) || 0);
    if (!storedDayNumber) return;
    window.sessionStorage.removeItem(scrollStorageKey);
    setPendingScrollDayNumber(storedDayNumber);
  }, [getFitHereRefreshScrollStorageKey, itinerary?.days, pendingScrollDayNumber]);

  useEffect(() => () => stopRouteTimeProgress(), [stopRouteTimeProgress]);
}
