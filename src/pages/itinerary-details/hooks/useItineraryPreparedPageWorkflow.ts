import { useEffect, useMemo } from "react";
import { useVehicleSelectionTotalsController } from "./useVehicleSelectionTotalsController";
import { useVehicleBuildController } from "./useVehicleBuildController";
import { usePreparedItineraryPageLoader } from "./usePreparedItineraryPageLoader";
import type { useItineraryRouteState } from "./useItineraryRouteState";
import type { useHotelWorkflowState } from "./useHotelWorkflowState";
import type { useHotelSelectionState } from "./useHotelSelectionState";
import type { ItineraryHotelDetailsResponse } from "../itinerary-details.types";
import { hasUsableVehicleRows as hasUsableVehicleRowsUtil } from "../utils/vehicleAvailability.utils";

type RouteState = ReturnType<typeof useItineraryRouteState>;
type HotelWorkflowState = ReturnType<typeof useHotelWorkflowState>;
type HotelSelectionState = ReturnType<typeof useHotelSelectionState>;
type LoaderArgs = Parameters<typeof usePreparedItineraryPageLoader>[0];
type VehicleBuildArgs = Parameters<typeof useVehicleBuildController>[0];

export function useItineraryPreparedPageWorkflow({
  routeState,
  hotelWorkflowState,
  hotelSelectionState,
  hotelDetails,
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
  isSupplierBookableHotel,
}: {
  routeState: RouteState;
  hotelWorkflowState: HotelWorkflowState;
  hotelSelectionState: HotelSelectionState;
  hotelDetails: ItineraryHotelDetailsResponse | null;
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
  isSupplierBookableHotel: (hotel: unknown) => boolean;
}) {
  const { setSelectedVehicleTotalsByType, setActiveHotelListTotal } = hotelSelectionState;
  const { setError, setLoading } = routeState;
  const { handleVehicleSelectedTotalChange } = useVehicleSelectionTotalsController({ setSelectedVehicleTotalsByType });
  const shouldShowRebuildHotelsButton = useMemo(() => {
    if (!hotelDetails?.hotels?.length) return false;
    if (hotelDetails.hotelAvailability?.isPlaceholderOnly) return true;
    return hotelDetails.hotels.every((hotel) => !isSupplierBookableHotel(hotel));
  }, [hotelDetails, isSupplierBookableHotel]);
  const prepareVehicleBuild = useVehicleBuildController({
    pushPageLoaderStage,
    hasUsableVehicleRows: hasUsableVehicleRowsUtil,
    setVehicleBuildStatus: routeState.setVehicleBuildStatus,
    setVehicleBuildError: routeState.setVehicleBuildError,
  } as VehicleBuildArgs);
  const loadPreparedItineraryPage = usePreparedItineraryPageLoader({
    isMountedRef,
    latestRouteRequestRef,
    currentFetchRef,
    setLoading: routeState.setLoading,
    setLoadingHotels: hotelWorkflowState.setLoadingHotels,
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
    setVehicleBuildStatus: routeState.setVehicleBuildStatus,
    setVehicleBuildError: routeState.setVehicleBuildError,
    prepareVehicleBuild,
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
    void loadPreparedItineraryPage(quoteId);
    return () => {
      isMountedRef.current = false;
      currentFetchRef.current = null;
      autoLoadStartedQuotes.delete(quoteId);
    };
  }, [autoLoadStartedQuotes, currentFetchRef, isMountedRef, loadPreparedItineraryPage, pathname, quoteId, setError, setLoading, switchedRouteRef]);

  return { handleVehicleSelectedTotalChange, shouldShowRebuildHotelsButton, loadPreparedItineraryPage };
}
