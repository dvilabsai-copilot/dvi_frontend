import type { useItineraryRouteState } from "./useItineraryRouteState";
import { useSourcePreviewController } from "./useSourcePreviewController";
import { useRouteHotelDetailsCache } from "./useRouteHotelDetailsCache";

type RouteState = ReturnType<typeof useItineraryRouteState>;

/** Coordinates source-preview actions and per-route hotel detail caching. */
export function useItineraryRouteSupportWorkflow({
  routeState,
  activeRouteQuoteId,
  quoteId,
  itineraryQuoteId,
}: {
  routeState: RouteState;
  activeRouteQuoteId: string | null;
  quoteId?: string;
  itineraryQuoteId?: string | null;
}) {
  const openSourcePreview = useSourcePreviewController({
    activeRouteQuoteId,
    quoteId,
    itineraryQuoteId,
    setOpen: routeState.setSourcePreviewOpen,
    setLoading: routeState.setSourcePreviewLoading,
    setError: routeState.setSourcePreviewError,
    setMarkdown: routeState.setSourcePreviewMarkdown,
    setHeading: routeState.setSourcePreviewHeading,
  });
  const routeHotelCache = useRouteHotelDetailsCache({
    routeHotelDetailsByQuoteId: routeState.routeHotelDetailsByQuoteId,
    setRouteHotelDetailsByQuoteId: routeState.setRouteHotelDetailsByQuoteId,
    routeHotelFetchPromisesRef: routeState.routeHotelFetchPromisesRef,
    fetchCompleteHotelDetailsRef: routeState.fetchCompleteHotelDetailsRef,
  });
  return { openSourcePreview, ...routeHotelCache };
}
