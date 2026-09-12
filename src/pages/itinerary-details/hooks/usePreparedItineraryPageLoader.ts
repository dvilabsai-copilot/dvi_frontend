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
    const partialRecovery = Boolean(
  options.partialSave &&
  !options.ignorePartialSave
);
      const persistedItinerary = partialRecovery && options.partialSave
        ? { ...initialDetails, planId: options.partialSave.planId, quoteId: options.partialSave.quoteId }
        : initialDetails;

      setItinerary(persistedItinerary);
      if (!isMountedRef.current || latestRouteRequestRef.current !== loadRequestId) return;

    const loadHotels = async (
  detailsForHotels: ItineraryDetailsResponse,
  allowInitialHotelDetails: boolean,
) => {
  setLoadingHotels(true);
  setHotelError(null);

  try {
    const itineraryPreference = Number(
      detailsForHotels.itineraryPreference ?? 3
    );

    const useHotels =
      itineraryPreference === 1 ||
      itineraryPreference === 3;

    const nightCount = Number(
      detailsForHotels.nightCount ?? 0
    );

    // Vehicle-only itinerary or zero-night itinerary:
    // explicitly clear any hotel data from the previous state.
if (!useHotels || nightCount <= 0) {
  setHotelDetails(null);
  setActiveHotelListTotal(0);
  cacheRouteHotelDetails(requestedQuoteId, null);
  return;
}

    pushPageLoaderStage("Loading hotel selections");

    let hotelRes: ItineraryHotelDetailsResponse | null;

    const initialHotelDetails =
      allowInitialHotelDetails
        ? options.initialHotelDetails
        : undefined;

    const hasUsableInitialHotelDetails =
      initialHotelDetails != null &&
      (
        (
          Array.isArray(initialHotelDetails.hotels) &&
          initialHotelDetails.hotels.length > 0
        ) ||
        (
          Array.isArray(initialHotelDetails.hotelSelectionState) &&
          initialHotelDetails.hotelSelectionState.length > 0
        ) ||
        (
          Array.isArray(initialHotelDetails.hotelTabs) &&
          initialHotelDetails.hotelTabs.length > 0
        )
      );

    if (hasUsableInitialHotelDetails) {
      hotelRes = initialHotelDetails;
    } else {
      hotelRes = await loadHotelDetailsForItinerary(
        requestedQuoteId,
        detailsForHotels
      );
    }

    if (
      !isMountedRef.current ||
      latestRouteRequestRef.current !== loadRequestId
    ) {
      return;
    }

    setHotelDetails(hotelRes);

 cacheRouteHotelDetails(
  requestedQuoteId,
  hotelRes
);
  } catch (hotelError) {
    if (
      !isMountedRef.current ||
      latestRouteRequestRef.current !== loadRequestId
    ) {
      return;
    }

    const message =
      hotelError instanceof Error
        ? hotelError.message
        : "Hotel data could not be loaded.";

    console.error(
      "Failed to load itinerary hotel details",
      hotelError
    );

    setHotelError(message);
  } finally {
    if (
      latestRouteRequestRef.current === loadRequestId &&
      isMountedRef.current
    ) {
      setLoadingHotels(false);
    }
  }
};

     // Keep the page-level loader active until the hotel response has been
// applied. This prevents the header/overall cost from appearing before
// the hotel list and showing two different loading states to the user.
await loadHotels(initialDetails, true);

if (
  !isMountedRef.current ||
  latestRouteRequestRef.current !== loadRequestId
) {
  return;
}

// Read the itinerary again after the first hotel load.
// This bypasses the initial deduped/cached response.
const latestDetailsRes =
  await ItineraryService.getDetails(requestedQuoteId);

if (
  !isMountedRef.current ||
  latestRouteRequestRef.current !== loadRequestId
) {
  return;
}

const latestDetails =
  latestDetailsRes as ItineraryDetailsResponse;

loadedDetails = latestDetails;

const finalItinerary =
  partialRecovery && options.partialSave
    ? {
        ...latestDetails,
        planId: options.partialSave.planId,
        quoteId: options.partialSave.quoteId,
      }
    : latestDetails;

// Compare everything that can change which hotel stay should be loaded.
const buildHotelContext = (
  details: ItineraryDetailsResponse
) => {
  const hotelContextDetails =
    details as ItineraryDetailsResponse & {
      preferredHotelCategory?: string | number[] | null;
      preferred_hotel_category?: string | number[] | null;
      mealPlanCode?: string | null;
      meal_plan_code?: string | null;
    };

  return JSON.stringify({
    itineraryPreference:
      details.itineraryPreference,

    dateRange:
      details.dateRange,

    dayCount:
      details.dayCount,

    nightCount:
      details.nightCount,

    roomCount:
      details.roomCount,

    extraBed:
      details.extraBed,

    childWithBed:
      details.childWithBed,

    childWithoutBed:
      details.childWithoutBed,

    preferredHotelCategory:
      hotelContextDetails.preferredHotelCategory ??
      hotelContextDetails.preferred_hotel_category ??
      null,

    mealPlanCode:
      hotelContextDetails.mealPlanCode ??
      hotelContextDetails.meal_plan_code ??
      null,

   days: Array.isArray(details.days)
  ? details.days.map((day) => ({
      id: day.id,
      date: day.date,
      departure: day.departure,
      arrival: day.arrival,
    }))
  : [],
  });
};

const initialHotelContext =
  buildHotelContext(initialDetails);

const latestHotelContext =
  buildHotelContext(latestDetails);

// If the first details response was stale, the hotel request above was
// calculated against the wrong itinerary. Reconcile once using the latest
// authoritative itinerary so no browser refresh is required.
if (initialHotelContext !== latestHotelContext) {
  await loadHotels(latestDetails, false);

  if (
    !isMountedRef.current ||
    latestRouteRequestRef.current !== loadRequestId
  ) {
    return;
  }
}

setItinerary(finalItinerary);

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
