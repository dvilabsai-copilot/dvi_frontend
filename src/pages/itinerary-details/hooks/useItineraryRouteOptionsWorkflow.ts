import { useEffect, type MutableRefObject } from "react";
import type { ItineraryDetailsResponse, ItineraryPlanRouteOption } from "../itinerary-details.types";
import { useRelatedRouteOptionsLoader } from "./useRelatedRouteOptionsLoader";
import { useItineraryRouteOptionsViewModel } from "./useItineraryRouteOptionsViewModel";
import { useRouteHotelPrefetch } from "./useRouteHotelPrefetch";
import { useRouteOptionSwitchController } from "./useRouteOptionSwitchController";
import type { useItineraryRouteState } from "./useItineraryRouteState";
import type { useHotelWorkflowState } from "./useHotelWorkflowState";
import type { useHotelSelectionState } from "./useHotelSelectionState";

type RouteState = ReturnType<typeof useItineraryRouteState>;
type HotelWorkflowState = ReturnType<typeof useHotelWorkflowState>;
type HotelSelectionState = ReturnType<typeof useHotelSelectionState>;
type PrefetchOptions = Parameters<typeof useRouteHotelPrefetch>[0];
type SwitchOptions = Parameters<typeof useRouteOptionSwitchController>[0];

/** Coordinates route-option loading, family cache reset, prefetching, and switching. */
export function useItineraryRouteOptionsWorkflow({
  itinerary,
  quoteId,
  activeRouteQuoteId,
  latestRouteOptions,
  routeState,
  hotelWorkflowState,
  hotelSelectionState,
  isConfirmedItinerary,
  shouldShowHotels,
  isMountedRef,
  latestRouteRequestRef,
  switchedRouteRef,
  currentFetchRef,
  loadAndCacheRouteHotelDetails,
  getDetailsDeduped,
  pushPageLoaderStage,
}: {
  itinerary: ItineraryDetailsResponse | null;
  quoteId?: string;
  activeRouteQuoteId: string | null;
  latestRouteOptions: ItineraryPlanRouteOption[];
  routeState: RouteState;
  hotelWorkflowState: HotelWorkflowState;
  hotelSelectionState: HotelSelectionState;
  isConfirmedItinerary: boolean;
  shouldShowHotels: boolean;
  isMountedRef: MutableRefObject<boolean>;
  latestRouteRequestRef: MutableRefObject<number>;
  switchedRouteRef: MutableRefObject<string | null>;
  currentFetchRef: MutableRefObject<string | null>;
  loadAndCacheRouteHotelDetails: PrefetchOptions["loadAndCacheRouteHotelDetails"] & SwitchOptions["loadAndCacheRouteHotelDetails"];
  getDetailsDeduped: SwitchOptions["getDetailsDeduped"];
  pushPageLoaderStage: (stage: string, detail?: string) => void;
}) {
  useRelatedRouteOptionsLoader({ quoteId, itinerary, setLatestRouteOptions: routeState.setLatestRouteOptions });
  const { itineraryRouteOptions, routeFamilyBaseQuoteId } = useItineraryRouteOptionsViewModel({ latestRouteOptions, itinerary, activeRouteQuoteId, quoteId });
  useEffect(() => {
    if (!routeFamilyBaseQuoteId || routeState.routeHotelFamilyKeyRef.current === routeFamilyBaseQuoteId) return;
    routeState.routeHotelFamilyKeyRef.current = routeFamilyBaseQuoteId;
    routeState.routeHotelPrefetchedRef.current = new Set();
    routeState.routeHotelFetchPromisesRef.current.clear();
    routeState.setRouteHotelDetailsByQuoteId({});
  }, [routeFamilyBaseQuoteId]);
  useRouteHotelPrefetch({ itinerary, shouldShowHotels, isConfirmedItinerary, activeRouteQuoteId, quoteId, itineraryRouteOptions, routeHotelPrefetchedRef: routeState.routeHotelPrefetchedRef, loadAndCacheRouteHotelDetails });
  const handleItineraryRouteOptionClick = useRouteOptionSwitchController({
    activeRouteQuoteId,
    quoteId: quoteId || null,
    itineraryQuoteId: itinerary?.quoteId,
    routeHotelDetailsByQuoteId: routeState.routeHotelDetailsByQuoteId,
    isMountedRef,
    latestRouteRequestRef,
    switchedRouteRef,
    currentFetchRef,
    setIsSwitchingRouteOption: routeState.setIsSwitchingRouteOption,
    setActiveRouteQuoteId: routeState.setActiveRouteQuoteId,
    setError: routeState.setError,
    setPageReady: routeState.setPageReady,
    setLoading: routeState.setLoading,
    setLoadingHotels: hotelWorkflowState.setLoadingHotels,
    setItinerary: routeState.setItinerary,
    setHotelDetails: routeState.setHotelDetails,
    setActiveHotelListTotal: hotelSelectionState.setActiveHotelListTotal,
    setVehicleBuildError: routeState.setVehicleBuildError,
    setVehicleBuildStatus: routeState.setVehicleBuildStatus,
    pushPageLoaderStage,
    getDetailsDeduped,
    loadAndCacheRouteHotelDetails,
  });
  return { itineraryRouteOptions, routeFamilyBaseQuoteId, handleItineraryRouteOptionClick };
}
