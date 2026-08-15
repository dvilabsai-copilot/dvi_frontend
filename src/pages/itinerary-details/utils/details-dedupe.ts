import { ItineraryService } from "@/services/itinerary";
import type { ItineraryDetailsResponse } from "../itinerary-details.types";

// Dedupe in-flight details requests per quote to preserve React StrictMode behavior.
const detailsInFlight = new Map<string, Promise<ItineraryDetailsResponse>>();
const detailsCache = new Map<string, { data: ItineraryDetailsResponse; expiresAt: number }>();
const DETAILS_CACHE_TTL_MS = 15_000;

export const autoLoadStartedQuotes = new Set<string>();

export const getDetailsDeduped = (quoteId: string): Promise<ItineraryDetailsResponse> => {
  const cached = detailsCache.get(quoteId);
  if (cached && cached.expiresAt > Date.now()) {
    return Promise.resolve(cached.data);
  }
  if (cached) detailsCache.delete(quoteId);

  const existing = detailsInFlight.get(quoteId);
  if (existing) return existing;

  const req = (ItineraryService.getDetails(quoteId) as Promise<ItineraryDetailsResponse>)
    .then((data) => {
      detailsCache.set(quoteId, { data, expiresAt: Date.now() + DETAILS_CACHE_TTL_MS });
      return data;
    })
    .finally(() => detailsInFlight.delete(quoteId));
  detailsInFlight.set(quoteId, req);
  return req;
};
