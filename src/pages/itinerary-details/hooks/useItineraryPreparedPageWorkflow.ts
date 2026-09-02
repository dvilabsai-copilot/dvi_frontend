import { useEffect } from "react";
import { usePreparedItineraryPageLoader } from "./usePreparedItineraryPageLoader";
import { isBrowserReloadNavigation } from "../itinerary-details-route-state";
import type { useItineraryRouteState } from "./useItineraryRouteState";
import type { useHotelWorkflowState } from "./useHotelWorkflowState";
import type { useHotelSelectionState } from "./useHotelSelectionState";
import type { ItineraryHotelDetailsResponse } from "../itinerary-details.types";

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
  initialHotelReset,
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
  initialHotelReset?: boolean;
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

  const { setError, setLoading } = routeState;
  const reuseInitialHotelDetails = !isBrowserReloadNavigation();
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
    if (autoLoadStartedQuotes.has(quoteId)) return;
    autoLoadStartedQuotes.add(quoteId);
    currentFetchRef.current = quoteId;
    isMountedRef.current = true;
    void loadPreparedItineraryPage(quoteId, {
      // Browser history preserves location.state across a hard reload. Do not
      // treat that transient create-flow payload as authoritative on reload;
      // the normal loader must call check-availability and hydrate persisted
      // manual selections from the API response.
      initialHotelDetails: reuseInitialHotelDetails ? initialHotelDetails : undefined,
      initialHotelReset: reuseInitialHotelDetails ? initialHotelReset : false,
    });
    return () => {
      isMountedRef.current = false;
      currentFetchRef.current = null;
      autoLoadStartedQuotes.delete(quoteId);
    };
  }, [autoLoadStartedQuotes, currentFetchRef, initialHotelDetails, initialHotelReset, isMountedRef, loadPreparedItineraryPage, pathname, quoteId, reuseInitialHotelDetails, setError, setLoading, switchedRouteRef]);

    return {
    loadPreparedItineraryPage,
  };
}
