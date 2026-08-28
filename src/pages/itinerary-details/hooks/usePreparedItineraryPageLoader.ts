import { useCallback, type Dispatch, type MutableRefObject, type SetStateAction } from "react";
import type {
  ItineraryDetailsResponse,
  ItineraryHotelDetailsResponse,
} from "../itinerary-details.types";
import type { ItineraryDetailsLocationState } from "../itinerary-details-route-state";
import { ItineraryService } from "@/services/itinerary";
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
}

export type PreparedItineraryPageLoadOptions = {
  ignorePartialSave?: boolean;
  partialSave?: ItineraryDetailsLocationState["partialSave"];
  initialHotelDetails?: ItineraryHotelDetailsResponse | null;
  initialHotelReset?: boolean;
};

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
}: PreparedItineraryPageLoaderProps) {
  return useCallback(async (
    requestedQuoteId: string,
    options: PreparedItineraryPageLoadOptions = {},
  ): Promise<void> => {
    isMountedRef.current = true;
    const loadRequestId = ++latestRouteRequestRef.current;
    let loadedDetails: ItineraryDetailsResponse | null = null;

    setLoading(true);
    setLoadingHotels(false);
    setHotelError(null);
    setPageReady(false);
    setError(null);

    try {
      setPageLoaderHistory([]);
      pushPageLoaderStage("Building itinerary details");
      const detailsRes = await getDetailsDeduped(requestedQuoteId);
      const initialDetails = detailsRes as ItineraryDetailsResponse;
      loadedDetails = initialDetails;
      const itineraryPreference = Number(initialDetails.itineraryPreference ?? 3);
      const useHotels = itineraryPreference === 1 || itineraryPreference === 3;
      const partialRecovery = Boolean(options.partialSave && !options.ignorePartialSave);
      const persistedItinerary = partialRecovery && options.partialSave
        ? { ...initialDetails, planId: options.partialSave.planId, quoteId: options.partialSave.quoteId }
        : initialDetails;

      setItinerary(persistedItinerary);
      if (!isMountedRef.current || latestRouteRequestRef.current !== loadRequestId) return;

      // Vehicle details are returned by the synchronous details flow.
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
          let hotelRes: ItineraryHotelDetailsResponse | null;
          if (options.initialHotelReset) {
            const resetResult = await ItineraryService.resetHotelAvailability(requestedQuoteId) as {
              hotelDetails?: ItineraryHotelDetailsResponse;
            };
            hotelRes = resetResult.hotelDetails || (resetResult as unknown as ItineraryHotelDetailsResponse);
          } else if (options.initialHotelDetails !== undefined) {
            hotelRes = options.initialHotelDetails;
          } else {
            hotelRes = await loadHotelDetailsForItinerary(requestedQuoteId, initialDetails);
          }
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
  ]);
}

export default usePreparedItineraryPageLoader;
