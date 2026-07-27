import type {
  PreparedItineraryPageLoadOptions,
  PreparedItineraryPageLoadResult,
} from "../hooks/usePreparedItineraryPageLoader";

type RetryVehiclePricingArgs = {
  planId: number;
  quoteId: string;
  buildVehiclesSync: (planId: number) => Promise<{ status?: string } | null | undefined>;
  loadPreparedItineraryPage: (quoteId: string, options?: PreparedItineraryPageLoadOptions) => Promise<PreparedItineraryPageLoadResult>;
};

export async function retryVehiclePricing({
  planId,
  quoteId,
  buildVehiclesSync,
  loadPreparedItineraryPage,
}: RetryVehiclePricingArgs): Promise<void> {
  const buildResult = await buildVehiclesSync(planId);
  if (String(buildResult?.status || "") !== "READY") {
    throw new Error("Vehicle pricing retry did not reach READY status.");
  }
  const refreshedStatus = await loadPreparedItineraryPage(quoteId, { ignorePartialSave: true });
  if (refreshedStatus !== "READY" && refreshedStatus !== "NOT_REQUIRED") {
    throw new Error("Vehicle pricing retry completed, but the refreshed itinerary is not ready.");
  }
}
