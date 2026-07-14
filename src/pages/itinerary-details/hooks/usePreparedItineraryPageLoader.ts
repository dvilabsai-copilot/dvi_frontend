import { useCallback, type Dispatch, type MutableRefObject, type SetStateAction } from "react";
import type {
  ItineraryDetailsResponse,
  ItineraryHotelDetailsResponse,
} from "../itinerary-details.types";

type VehicleBuildStatus = "PENDING" | "PROCESSING" | "READY" | "FAILED";

export interface PreparedItineraryPageLoaderProps {
  isMountedRef: MutableRefObject<boolean>;
  latestRouteRequestRef: MutableRefObject<number>;
  currentFetchRef: MutableRefObject<string | null>;
  setLoading: Dispatch<SetStateAction<boolean>>;
  setLoadingHotels: Dispatch<SetStateAction<boolean>>;
  setPageReady: Dispatch<SetStateAction<boolean>>;
  setError: Dispatch<SetStateAction<string | null>>;
  setPageLoaderHistory: Dispatch<SetStateAction<string[]>>;
  pushPageLoaderStage: (stage: string, detail?: string) => void;
  getDetailsDeduped: (quoteId: string) => Promise<unknown>;
  loadHotelDetailsForItinerary: (
    quoteId: string,
    details: ItineraryDetailsResponse,
  ) => Promise<ItineraryHotelDetailsResponse | null>;
  cacheRouteHotelDetails: (quoteId: string, details: ItineraryHotelDetailsResponse | null) => void;
  setItinerary: Dispatch<SetStateAction<ItineraryDetailsResponse | null>>;
  setHotelDetails: Dispatch<SetStateAction<ItineraryHotelDetailsResponse | null>>;
  setActiveHotelListTotal: Dispatch<SetStateAction<number>>;
  setVehicleBuildStatus: Dispatch<SetStateAction<VehicleBuildStatus>>;
  setVehicleBuildError: Dispatch<SetStateAction<string | null>>;
  prepareVehicleBuild: (options: {
    requestedQuoteId: string;
    initialDetails: ItineraryDetailsResponse;
    planId: number;
    forceVehicleRebuild: boolean;
    finalizePage: (details: ItineraryDetailsResponse) => Promise<void>;
  }) => Promise<void>;
}

export function usePreparedItineraryPageLoader({
  isMountedRef,
  latestRouteRequestRef,
  currentFetchRef,
  setLoading,
  setLoadingHotels,
  setPageReady,
  setError,
  setPageLoaderHistory,
  pushPageLoaderStage,
  getDetailsDeduped,
  loadHotelDetailsForItinerary,
  cacheRouteHotelDetails,
  setItinerary,
  setHotelDetails,
  setActiveHotelListTotal,
  setVehicleBuildStatus,
  setVehicleBuildError,
  prepareVehicleBuild,
}: PreparedItineraryPageLoaderProps) {
  return useCallback(async (requestedQuoteId: string, forceVehicleRebuild = false) => {
    isMountedRef.current = true;
    const loadRequestId = ++latestRouteRequestRef.current;

    setLoading(true);
    setLoadingHotels(true);
    setPageReady(false);
    setError(null);
    setVehicleBuildError(null);

    try {
      setPageLoaderHistory([]);
      pushPageLoaderStage("Building itinerary details");
      const detailsRes = await getDetailsDeduped(requestedQuoteId);
      const initialDetails = detailsRes as ItineraryDetailsResponse;
      const itineraryPreference = Number(initialDetails.itineraryPreference ?? 3);
      const useHotels = itineraryPreference === 1 || itineraryPreference === 3;
      const useVehicles = itineraryPreference === 2 || itineraryPreference === 3;
      const planId = Number(initialDetails.planId || 0);

      const finalizePage = async (details: ItineraryDetailsResponse) => {
        let hotelRes: ItineraryHotelDetailsResponse | null = null;
        if (useHotels) {
          pushPageLoaderStage("Loading hotel selections");
          hotelRes = await loadHotelDetailsForItinerary(requestedQuoteId, details);
        }

        if (!isMountedRef.current || latestRouteRequestRef.current !== loadRequestId) return;

        setItinerary(details);
        setHotelDetails(hotelRes);
        cacheRouteHotelDetails(requestedQuoteId, hotelRes);
        if (!useHotels) setActiveHotelListTotal(0);
        setVehicleBuildStatus("READY");
        setPageReady(true);
      };

      if (!useVehicles || !planId) {
        await finalizePage(initialDetails);
        return;
      }

      await prepareVehicleBuild({
        requestedQuoteId,
        initialDetails,
        planId,
        forceVehicleRebuild,
        finalizePage,
      });
    } catch (error) {
      if (!isMountedRef.current) return;
      console.error("Failed to load staged itinerary details", error);
      const message = error instanceof Error ? error.message : String(error || "");
      setVehicleBuildStatus("FAILED");
      setVehicleBuildError(message || "Vehicle pricing failed to prepare");
      setError(message || "Failed to load itinerary details");
      setItinerary(null);
      setHotelDetails(null);
      setPageReady(false);
    } finally {
      if (latestRouteRequestRef.current === loadRequestId) {
        currentFetchRef.current = null;
        if (isMountedRef.current) {
          setLoading(false);
          setLoadingHotels(false);
        }
      }
    }
  }, [
    cacheRouteHotelDetails,
    currentFetchRef,
    getDetailsDeduped,
    isMountedRef,
    latestRouteRequestRef,
    loadHotelDetailsForItinerary,
    prepareVehicleBuild,
    pushPageLoaderStage,
    setPageLoaderHistory,
    setActiveHotelListTotal,
    setError,
    setHotelDetails,
    setItinerary,
    setLoading,
    setLoadingHotels,
    setPageReady,
    setVehicleBuildError,
    setVehicleBuildStatus,
  ]);
}

export default usePreparedItineraryPageLoader;
