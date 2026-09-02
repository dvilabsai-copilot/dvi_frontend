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
  initialHotelDetailsAt?: number;
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
    // Hide stale hotel rows immediately during refresh. The hotel section
    // remains in its loading state until the availability request completes.
    setLoadingHotels(true);
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
          // A create flow may already have fetched the authoritative hotel
          // details with check-availability. Reuse that payload instead of
          // resetting the same quote a second time.
          if (options.initialHotelDetails !== undefined) {
            hotelRes = options.initialHotelDetails;
          } else {
            // `initialHotelReset` is intentionally not used here. Its route
            // state survives browser reloads, so using it as a loader command
            // would run Reset + Check Availability on every refresh and
            // overwrite user-confirmed room allocations. New itineraries
            // provide initialHotelDetails; all other loads are read-only.
            hotelRes = await loadHotelDetailsForItinerary(requestedQuoteId, initialDetails);
          }
          if (!isMountedRef.current || latestRouteRequestRef.current !== loadRequestId) return;
          setHotelDetails(hotelRes);
          const financialSummary = (hotelRes as ItineraryHotelDetailsResponse & {
            financialSummary?: {
              overallCost?: number | null;
              costBreakdown?: ItineraryDetailsResponse["costBreakdown"] | null;
            };
          }).financialSummary;
          if (financialSummary) {
            setItinerary((previous) => previous
              ? {
                  ...previous,
                  overallCost: financialSummary.overallCost ?? previous.overallCost,
                  costBreakdown: financialSummary.costBreakdown ?? previous.costBreakdown,
                }
              : previous);
          }
          cacheRouteHotelDetails(requestedQuoteId, hotelRes);
        } catch (hotelError) {
          if (!isMountedRef.current || latestRouteRequestRef.current !== loadRequestId) return;
          const message = hotelError instanceof Error ? hotelError.message : "Hotel data could not be loaded.";
          console.error("Failed to load itinerary hotel details", hotelError);
          setHotelError(message);
          // Preserve an already-loaded list during a transient availability
          // failure. The caller can still display the error/revalidation
          // state without leaving hotel totals and hotel rows inconsistent.
        } finally {
          if (latestRouteRequestRef.current === loadRequestId && isMountedRef.current) {
            setLoadingHotels(false);
          }
        }
      };

      // Keep the page-level loader active until the hotel response has been
      // applied. This prevents the header/overall cost from appearing before
      // the hotel list and showing two different loading states to the user.
      await loadHotels();
      if (!isMountedRef.current || latestRouteRequestRef.current !== loadRequestId) return;

      // Vehicle details come from the itinerary response; hotel details and
      // all dependent totals are now ready from the same completed load.
      setPageReady(true);
      setLoading(false);
      currentFetchRef.current = null;
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
