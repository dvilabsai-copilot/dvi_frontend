import { ItineraryService } from "@/services/itinerary";
import type { ItineraryDetailsResponse } from "../itinerary-details.types";

// Dedupe in-flight details requests per quote to preserve React StrictMode behavior.
const detailsInFlight = new Map<string, Promise<ItineraryDetailsResponse>>();

export const autoLoadStartedQuotes = new Set<string>();

export const getDetailsDeduped = (quoteId: string): Promise<ItineraryDetailsResponse> => {
  const existing = detailsInFlight.get(quoteId);
  if (existing) return existing;

  const req = (ItineraryService.getDetails(quoteId) as Promise<ItineraryDetailsResponse>)
    .finally(() => detailsInFlight.delete(quoteId));
  detailsInFlight.set(quoteId, req);
  return req;
};
