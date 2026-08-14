import { useEffect, type MutableRefObject } from 'react';

export function useRouteHotelPrefetch({
  itinerary,
  shouldShowHotels,
  isConfirmedItinerary,
  activeRouteQuoteId,
  quoteId,
  itineraryRouteOptions,
  routeHotelPrefetchedRef,
  loadAndCacheRouteHotelDetails,
}: {
  itinerary: { quoteId?: string } | null | undefined;
  shouldShowHotels: boolean;
  isConfirmedItinerary: boolean;
  activeRouteQuoteId?: string | null;
  quoteId?: string | null;
  itineraryRouteOptions: Array<{ quoteId?: string }>;
  routeHotelPrefetchedRef: MutableRefObject<Set<string>>;
  loadAndCacheRouteHotelDetails: (quoteId: string) => Promise<unknown>;
}): void {
  useEffect(() => {
    if (!itinerary || !shouldShowHotels || isConfirmedItinerary) return;
    // The prepared page loader owns the initial quote. Prefetch only after a
    // real route-option switch; otherwise the same quote receives two reads.
    const baseQuoteId = String(quoteId || itinerary.quoteId || '').trim();
    const switchedQuoteId = String(activeRouteQuoteId || '').trim();
    if (!switchedQuoteId || switchedQuoteId === baseQuoteId) return;
    // Route switching loads the selected quote's persisted snapshot on demand.
    // Never warm sibling route options because that used to fan out live searches.
    const routeQuoteIds: string[] = [];
    const currentQuoteId = switchedQuoteId;
    const normalizedQuoteIds = Array.from(
      new Set([currentQuoteId, ...routeQuoteIds].filter((id) => id.startsWith('DVI'))),
    );
    if (normalizedQuoteIds.length === 0) return;
    let cancelled = false;
    const warmRouteHotelCache = async () => {
      for (const routeQuoteId of normalizedQuoteIds) {
        if (cancelled) return;
        if (routeHotelPrefetchedRef.current.has(routeQuoteId)) continue;
        routeHotelPrefetchedRef.current.add(routeQuoteId);
        try {
          await loadAndCacheRouteHotelDetails(routeQuoteId);
        } catch (error) {
          routeHotelPrefetchedRef.current.delete(routeQuoteId);
          console.warn('[ItineraryDetails] Failed to prefetch hotels for route quote', {
            routeQuoteId,
            error,
          });
        }
      }
    };
    void warmRouteHotelCache();
    return () => {
      cancelled = true;
    };
  }, [
    activeRouteQuoteId,
    itinerary,
    itineraryRouteOptions,
    isConfirmedItinerary,
    loadAndCacheRouteHotelDetails,
    quoteId,
    routeHotelPrefetchedRef,
    shouldShowHotels,
  ]);
}
