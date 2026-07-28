import { useCallback, type Dispatch, type MutableRefObject, type SetStateAction } from "react";
import type {
  ItineraryDetailsResponse,
  ItineraryHotelDetailsResponse,
} from "../itinerary-details.types";
import type { ItineraryDetailsLocationState } from "../itinerary-details-route-state";
import { getAuthoritativeVehiclePricingState } from "../utils/vehicleAvailability.utils";

export type VehicleBuildUiStatus =
  | "PENDING"
  | "PROCESSING"
  | "RETRYING"
  | "READY"
  | "FAILED"
  | "RECOVERY_REQUIRED"
  | "NOT_REQUIRED";

export interface PreparedItineraryPageLoaderProps {
  isMountedRef: MutableRefObject<boolean>;
  latestRouteRequestRef: MutableRefObject<number>;
  currentFetchRef: MutableRefObject<string | null>;
  setLoading: Dispatch<SetStateAction<boolean>>;
  setLoadingHotels: Dispatch<SetStateAction<boolean>>;
  setHotelError: Dispatch<SetStateAction<string | null>>;
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
  setVehicleBuildStatus: Dispatch<SetStateAction<VehicleBuildUiStatus>>;
  setVehicleBuildError: Dispatch<SetStateAction<string | null>>;
}

export type PreparedItineraryPageLoadOptions = {
  ignorePartialSave?: boolean;
  partialSave?: ItineraryDetailsLocationState["partialSave"];
};

export type PreparedItineraryPageLoadResult = VehicleBuildUiStatus | undefined;

function toVehicleUiStatus(status: string): VehicleBuildUiStatus {
  if (["READY", "FAILED", "NOT_REQUIRED", "RECOVERY_REQUIRED"].includes(status)) {
    return status as VehicleBuildUiStatus;
  }
  return "RECOVERY_REQUIRED";
}

export function usePreparedItineraryPageLoader({
  isMountedRef,
  latestRouteRequestRef,
  currentFetchRef,
  setLoading,
  setLoadingHotels,
  setHotelError,
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
}: PreparedItineraryPageLoaderProps) {
  return useCallback(async (
    requestedQuoteId: string,
    options: PreparedItineraryPageLoadOptions = {},
  ): Promise<PreparedItineraryPageLoadResult> => {
    isMountedRef.current = true;
    const loadRequestId = ++latestRouteRequestRef.current;
    let loadedDetails: ItineraryDetailsResponse | null = null;

    setLoading(true);
    setLoadingHotels(false);
    setHotelError(null);
    setPageReady(false);
    setError(null);
    setVehicleBuildError(null);

    try {
      setPageLoaderHistory([]);
      pushPageLoaderStage("Building itinerary details");
      const detailsRes = await getDetailsDeduped(requestedQuoteId);
      const initialDetails = detailsRes as ItineraryDetailsResponse;
      loadedDetails = initialDetails;
      const itineraryPreference = Number(initialDetails.itineraryPreference ?? 3);
      const useHotels = itineraryPreference === 1 || itineraryPreference === 3;
      const useVehicles = itineraryPreference === 2 || itineraryPreference === 3;
      const authoritativeState = getAuthoritativeVehiclePricingState(initialDetails);
      const partialRecovery = Boolean(options.partialSave && !options.ignorePartialSave);
      const hotelOnlyPartialRecovery = Boolean(
        partialRecovery &&
        options.partialSave?.hotelSearch?.status === "FAILED" &&
        !options.partialSave?.vehicleBuild,
      );
      const vehiclePartialRecovery = partialRecovery && !hotelOnlyPartialRecovery;
      const vehicleUiStatus = vehiclePartialRecovery
        ? "RECOVERY_REQUIRED"
        : useVehicles
          ? toVehicleUiStatus(authoritativeState.status)
          : "NOT_REQUIRED";
      const persistedItinerary = partialRecovery && options.partialSave
        ? { ...initialDetails, planId: options.partialSave.planId, quoteId: options.partialSave.quoteId }
        : initialDetails;

      setItinerary(persistedItinerary);
      setVehicleBuildStatus(vehicleUiStatus);
      setVehicleBuildError(
        vehiclePartialRecovery
          ? options.partialSave?.vehicleBuild?.message || "Itinerary saved. Vehicle pricing requires explicit recovery."
          : authoritativeState.failureReason || null,
      );
      if (!isMountedRef.current || latestRouteRequestRef.current !== loadRequestId) return;

      // Details and vehicle readiness are complete independently of hotels.
      setPageReady(true);
      setLoading(false);
      currentFetchRef.current = null;

      const loadHotels = async () => {
        if (!useHotels) {
          setHotelDetails(null);
          setActiveHotelListTotal(0);
          return;
        }

        setLoadingHotels(true);
        setHotelError(null);
        try {
          pushPageLoaderStage("Loading hotel selections");
          const hotelRes = await loadHotelDetailsForItinerary(requestedQuoteId, initialDetails);
          if (!isMountedRef.current || latestRouteRequestRef.current !== loadRequestId) return;
          setHotelDetails(hotelRes);
          cacheRouteHotelDetails(requestedQuoteId, hotelRes);
        } catch (hotelError) {
          if (!isMountedRef.current || latestRouteRequestRef.current !== loadRequestId) return;
          const message = hotelError instanceof Error ? hotelError.message : "Hotel data could not be loaded.";
          console.error("Failed to load itinerary hotel details", hotelError);
          setHotelError(message);
          setHotelDetails(null);
        } finally {
          if (latestRouteRequestRef.current === loadRequestId && isMountedRef.current) {
            setLoadingHotels(false);
          }
        }
      };

      void loadHotels();
      return vehicleUiStatus;
    } catch (error) {
      if (!isMountedRef.current) return;
      console.error("Failed to load staged itinerary details", error);
      const message = error instanceof Error ? error.message : String(error || "");
      setError(message || "Failed to load itinerary details");
      if (!loadedDetails) setItinerary(null);
      setPageReady(false);
      setLoading(false);
      currentFetchRef.current = null;
    }
  }, [
    cacheRouteHotelDetails,
    currentFetchRef,
    getDetailsDeduped,
    isMountedRef,
    latestRouteRequestRef,
    loadHotelDetailsForItinerary,
    pushPageLoaderStage,
    setActiveHotelListTotal,
    setError,
    setHotelDetails,
    setHotelError,
    setItinerary,
    setLoading,
    setLoadingHotels,
    setPageLoaderHistory,
    setPageReady,
    setVehicleBuildError,
    setVehicleBuildStatus,
  ]);
}

export default usePreparedItineraryPageLoader;
