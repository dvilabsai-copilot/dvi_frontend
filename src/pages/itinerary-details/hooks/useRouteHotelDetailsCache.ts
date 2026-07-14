import { useCallback, type Dispatch, type MutableRefObject, type SetStateAction } from "react";
import type { ItineraryHotelDetailsResponse } from "../itinerary-details.types";

type RouteHotelDetailsCacheOptions = {
  routeHotelDetailsByQuoteId: Record<string, ItineraryHotelDetailsResponse | null>;
  setRouteHotelDetailsByQuoteId: Dispatch<SetStateAction<Record<string, ItineraryHotelDetailsResponse | null>>>;
  routeHotelFetchPromisesRef: MutableRefObject<Map<string, Promise<ItineraryHotelDetailsResponse | null>>>;
  fetchCompleteHotelDetailsRef: MutableRefObject<((quoteId: string) => Promise<ItineraryHotelDetailsResponse>) | null>;
};

/** Owns route-hotel cache writes and in-flight request de-duplication. */
export const useRouteHotelDetailsCache = ({
  routeHotelDetailsByQuoteId,
  setRouteHotelDetailsByQuoteId,
  routeHotelFetchPromisesRef,
  fetchCompleteHotelDetailsRef,
}: RouteHotelDetailsCacheOptions) => {
  const cacheRouteHotelDetails = useCallback((routeQuoteId: string, hotelDetails: ItineraryHotelDetailsResponse | null) => {
    const normalizedQuoteId = String(routeQuoteId || "").trim();
    if (!normalizedQuoteId || !hotelDetails) return;

    setRouteHotelDetailsByQuoteId((previous) => {
      if (previous[normalizedQuoteId] === hotelDetails) return previous;
      return { ...previous, [normalizedQuoteId]: hotelDetails };
    });
  }, [setRouteHotelDetailsByQuoteId]);

  const loadAndCacheRouteHotelDetails = useCallback(async (routeQuoteId: string): Promise<ItineraryHotelDetailsResponse | null> => {
    const normalizedQuoteId = String(routeQuoteId || "").trim();
    if (!normalizedQuoteId) return null;

    const cachedHotelDetails = routeHotelDetailsByQuoteId[normalizedQuoteId];
    if (cachedHotelDetails) return cachedHotelDetails;

    const inFlight = routeHotelFetchPromisesRef.current.get(normalizedQuoteId);
    if (inFlight) return inFlight;

    const request = (async () => {
      const fetcher = fetchCompleteHotelDetailsRef.current;
      if (!fetcher) throw new ReferenceError("fetchCompleteHotelDetails is not ready yet");
      const hotelDetails = await fetcher(normalizedQuoteId);
      cacheRouteHotelDetails(normalizedQuoteId, hotelDetails);
      return hotelDetails;
    })().finally(() => {
      routeHotelFetchPromisesRef.current.delete(normalizedQuoteId);
    });

    routeHotelFetchPromisesRef.current.set(normalizedQuoteId, request);
    return request;
  }, [cacheRouteHotelDetails, fetchCompleteHotelDetailsRef, routeHotelDetailsByQuoteId, routeHotelFetchPromisesRef]);

  return { cacheRouteHotelDetails, loadAndCacheRouteHotelDetails };
};
