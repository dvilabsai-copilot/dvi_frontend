import { useEffect, useRef } from "react";
import { usePreparedItineraryPageLoader } from "./usePreparedItineraryPageLoader";
import type { useItineraryRouteState } from "./useItineraryRouteState";
import type { useHotelWorkflowState } from "./useHotelWorkflowState";
import type { useHotelSelectionState } from "./useHotelSelectionState";
import type { ItineraryHotelDetailsResponse } from "../itinerary-details.types";
import type { ItineraryDetailsLocationState } from "../itinerary-details-route-state";

type RouteState = ReturnType<typeof useItineraryRouteState>;
type HotelWorkflowState = ReturnType<typeof useHotelWorkflowState>;
type HotelSelectionState = ReturnType<typeof useHotelSelectionState>;
type LoaderArgs = Parameters<typeof usePreparedItineraryPageLoader>[0];

export function useItineraryPreparedPageWorkflow({
  routeState,
  hotelWorkflowState,
  hotelSelectionState,
  hotelDetails,
  initialHotelDetails,
  initialHotelDetailsAt,
  initialHotelReset,
  partialSave,
  quoteId,
  pathname,
  isMountedRef,
  latestRouteRequestRef,
  currentFetchRef,
  switchedRouteRef,
  autoLoadStartedQuotes,
  pushPageLoaderStage,
  getDetailsDeduped,
  loadHotelDetailsForItinerary,
  cacheRouteHotelDetails,
}: {
  routeState: RouteState;
  hotelWorkflowState: HotelWorkflowState;
  hotelSelectionState: HotelSelectionState;
  hotelDetails: ItineraryHotelDetailsResponse | null;
  initialHotelDetails?: ItineraryHotelDetailsResponse | null;
  initialHotelDetailsAt?: number;
  initialHotelReset?: boolean;
  partialSave?: ItineraryDetailsLocationState["partialSave"];
  quoteId: string | undefined;
  pathname: string;
  isMountedRef: React.MutableRefObject<boolean>;
  latestRouteRequestRef: React.MutableRefObject<number>;
  currentFetchRef: React.MutableRefObject<string | null>;
  switchedRouteRef: React.MutableRefObject<string | null>;
  autoLoadStartedQuotes: Set<string>;
  pushPageLoaderStage: LoaderArgs["pushPageLoaderStage"];
  getDetailsDeduped: LoaderArgs["getDetailsDeduped"];
  loadHotelDetailsForItinerary: LoaderArgs["loadHotelDetailsForItinerary"];
  cacheRouteHotelDetails: LoaderArgs["cacheRouteHotelDetails"];
}) {
   const { setActiveHotelListTotal } =
    hotelSelectionState;

  // Scope the duplicate-load guard to this mounted workflow. A module-level
  // quote claim survives edit/submit navigation and can leave the new page in
  // its initial loading state without starting its loader.
  const startedQuoteRef = useRef<string | null>(null);

// A PARTIAL create can reach the details page immediately after the backend
// hotel search failed. Allow exactly one automatic retry for that quote so
// the user does not need to refresh the browser manually.
const partialHotelRetryStartedRef = useRef<string | null>(null);

// Track the real component lifecycle separately from the data-loading effect.
// The loading effect can be cleaned up/re-run by React during development,
// but that must not cancel the active itinerary request.
useEffect(() => {
  isMountedRef.current = true;

  return () => {
    isMountedRef.current = false;
  };
}, [isMountedRef]);

const { setError, setLoading } = routeState;
  // Performance navigation type describes the original document load. After
  // a refresh followed by SPA navigation from the editor, it still reports
  // "reload" and incorrectly discards the fresh save response. A timestamp
  // lets us reuse only payloads created in this document, while stale history
  // state after a real reload falls back to normal hydration.
  const documentStartTime = typeof performance !== "undefined" ? performance.timeOrigin : 0;
  const reuseInitialHotelDetails = Boolean(
    initialHotelDetails &&
    typeof initialHotelDetailsAt === "number" &&
    initialHotelDetailsAt >= documentStartTime,
  );
  const loadPreparedItineraryPage = usePreparedItineraryPageLoader({
    isMountedRef,
    latestRouteRequestRef,
    currentFetchRef,
    setLoading: routeState.setLoading,
    setLoadingHotels: hotelWorkflowState.setLoadingHotels,
    setHotelError: hotelWorkflowState.setHotelError,
    setPageReady: routeState.setPageReady,
    setError: routeState.setError,
    setPageLoaderHistory: routeState.setPageLoaderHistory,
    pushPageLoaderStage,
    getDetailsDeduped,
    loadHotelDetailsForItinerary,
    cacheRouteHotelDetails,
    setItinerary: routeState.setItinerary,
    setHotelDetails: routeState.setHotelDetails,
    setActiveHotelListTotal,
  });

  useEffect(() => {
    if (!quoteId) {
      setError("Missing quote id in URL");
      setLoading(false);
      return;
    }
    if (pathname.startsWith("/confirmed-itinerary/")) {
      console.warn("⚠️ ItineraryDetails mounted on confirmed itinerary route. Skipping getDetails() call.", { quoteId, pathname });
      setLoading(false);
      return;
    }
    if (currentFetchRef.current === quoteId) {
      console.log("🔄 [ItineraryDetails] Already fetching quoteId:", quoteId, "- skipping duplicate");
      return;
    }
    if (switchedRouteRef.current === quoteId) {
      console.log("⚡ [ItineraryDetails] Route already loading from tab switch, skipping duplicate re-fetch:", quoteId);
      isMountedRef.current = true;
      switchedRouteRef.current = null;
      return;
    }
    if (startedQuoteRef.current === quoteId) return;
    startedQuoteRef.current = quoteId;
    autoLoadStartedQuotes.add(quoteId);
    currentFetchRef.current = quoteId;
    isMountedRef.current = true;
  void loadPreparedItineraryPage(quoteId, {
  partialSave,

  initialHotelDetails:
    reuseInitialHotelDetails
      ? initialHotelDetails
      : undefined,

  initialHotelDetailsAt:
    reuseInitialHotelDetails
      ? initialHotelDetailsAt
      : undefined,

  initialHotelReset:
    reuseInitialHotelDetails
      ? initialHotelReset
      : false,
});
 }, [
  autoLoadStartedQuotes,
  currentFetchRef,
  initialHotelDetails,
  initialHotelDetailsAt,
  initialHotelReset,
  isMountedRef,
  loadPreparedItineraryPage,
  partialSave,
  pathname,
  quoteId,
  reuseInitialHotelDetails,
  setError,
  setLoading,
  switchedRouteRef,
]);

useEffect(() => {
  if (!quoteId) {
    return;
  }

  // Only recover the specific PARTIAL-save case where hotel availability
  // failed during itinerary creation.
  if (partialSave?.hotelSearch?.status !== "FAILED") {
    return;
  }

  // Wait until the normal first details-page load has finished.
  if (!routeState.pageReady || routeState.loading) {
    return;
  }

  const hasRecoveredHotelData =
    hotelDetails != null &&
    (
      (
        Array.isArray(hotelDetails.hotels) &&
        hotelDetails.hotels.length > 0
      ) ||
      (
        Array.isArray(hotelDetails.hotelTabs) &&
        hotelDetails.hotelTabs.length > 0
      ) ||
      (
        Array.isArray(hotelDetails.hotelSelectionState) &&
        hotelDetails.hotelSelectionState.length > 0
      )
    );

  // If the first load already recovered hotels, no retry is needed.
  if (hasRecoveredHotelData) {
    return;
  }

  // Prevent retry loops. Only one automatic retry per quote.
if (partialHotelRetryStartedRef.current === quoteId) {
  return;
}

const retryTimer = window.setTimeout(() => {
  // Mark the retry as started only when it actually executes.
  // If React cancels the timer during an effect cleanup, the quote
  // must remain eligible for a later retry.
  partialHotelRetryStartedRef.current = quoteId;

  void loadPreparedItineraryPage(quoteId, {
    partialSave,
    initialHotelDetails: undefined,
    initialHotelDetailsAt: undefined,
    initialHotelReset: false,
  });
}, 1200);

return () => {
  window.clearTimeout(retryTimer);
};
}, [
  hotelDetails,
  loadPreparedItineraryPage,
  partialSave,
  quoteId,
  routeState.loading,
  routeState.pageReady,
]);

return {
  loadPreparedItineraryPage,
};
}