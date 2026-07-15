import { useMemo } from "react";
import type { ItineraryDetailsResponse, ItineraryPlanRouteOption } from "../itinerary-details.types";
import { normalizeRouteFamilyBaseQuoteId } from "../utils/routeFamily.utils";

type RouteOptionsViewModelOptions = {
  latestRouteOptions: ItineraryPlanRouteOption[];
  itinerary: ItineraryDetailsResponse | null;
  activeRouteQuoteId: string | null;
  quoteId?: string;
};

export function useItineraryRouteOptionsViewModel({
  latestRouteOptions,
  itinerary,
  activeRouteQuoteId,
  quoteId,
}: RouteOptionsViewModelOptions) {
  const itineraryRouteOptions = useMemo(() => {
    const getQuoteNumber = (value?: string) => {
      const match = String(value || "").match(/(\d+)$/);
      return match ? Number(match[1]) : 0;
    };

    return Array.from(
      new Map(latestRouteOptions.map((option) => [option.quoteId, option])).values(),
    ).sort((a, b) => getQuoteNumber(a.quoteId) - getQuoteNumber(b.quoteId));
  }, [latestRouteOptions]);

  const routeFamilyBaseQuoteId = useMemo(() => {
    const fromApi = String((itinerary as Record<string, unknown> | null)?.routeFamilyBaseQuoteId || "").trim();
    if (fromApi) return fromApi;
    return normalizeRouteFamilyBaseQuoteId(activeRouteQuoteId || quoteId || itinerary?.quoteId);
  }, [activeRouteQuoteId, itinerary, quoteId]);

  return { itineraryRouteOptions, routeFamilyBaseQuoteId };
}

