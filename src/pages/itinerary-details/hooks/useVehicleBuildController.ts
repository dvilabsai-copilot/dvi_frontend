import { useCallback } from "react";
import { ItineraryService } from "@/services/itinerary";
import type { ItineraryDetailsResponse } from "../itinerary-details.types";

type VehicleBuildStatus = "PENDING" | "PROCESSING" | "READY" | "FAILED";

interface VehicleBuildOptions {
  pushPageLoaderStage: (stage: string) => void;
  hasUsableVehicleRows: (details: ItineraryDetailsResponse | null | undefined) => boolean;
  setVehicleBuildStatus: (status: VehicleBuildStatus) => void;
  setVehicleBuildError: (error: string | null) => void;
}

interface VehicleBuildRequest {
  requestedQuoteId: string;
  initialDetails: ItineraryDetailsResponse;
  planId: number;
  forceVehicleRebuild: boolean;
  finalizePage: (details: ItineraryDetailsResponse) => Promise<void>;
}

const extractRouteOptionQuoteId = (option: unknown): string => {
  if (typeof option === "string") return option.trim();
  if (!option || typeof option !== "object") return "";
  const value = option as Record<string, unknown>;
  return String(
    value.quoteId ||
      value.routeQuoteId ||
      value.quotationNo ||
      value.quotation_no ||
      value.itinerary_quote_ID ||
      value.itinerary_quote_id ||
      value.quote_id ||
      "",
  ).trim();
};

/** Owns vehicle build-status/rebuild sequencing used by staged itinerary hydration. */
export const useVehicleBuildController = ({
  pushPageLoaderStage,
  hasUsableVehicleRows,
  setVehicleBuildStatus,
  setVehicleBuildError,
}: VehicleBuildOptions) => useCallback(async ({
  requestedQuoteId,
  initialDetails,
  planId,
  forceVehicleRebuild,
  finalizePage,
}: VehicleBuildRequest): Promise<void> => {
  const storedRouteOptions: unknown[] = [];
  if (typeof window !== "undefined") {
    try {
      const stored = localStorage.getItem(`itinerary-route-options:${requestedQuoteId}`);
      const parsed = stored ? JSON.parse(stored) : [];
      if (Array.isArray(parsed)) storedRouteOptions.push(...parsed);
    } catch {
      // Ignore malformed route-option cache, matching the existing fallback path.
    }
  }

  const detailsRecord = initialDetails as unknown as Record<string, unknown>;
  const routeOptionQuoteIds = [
    ...(Array.isArray(detailsRecord.routeOptions) ? detailsRecord.routeOptions : []),
    ...(Array.isArray(detailsRecord.suggestedRoutes) ? detailsRecord.suggestedRoutes : []),
    ...(Array.isArray(detailsRecord.siblingRoutes) ? detailsRecord.siblingRoutes : []),
    ...storedRouteOptions,
  ]
    .map(extractRouteOptionQuoteId)
    .filter((id) => id && id.startsWith("DVI"));
  const isSuggestedRouteItinerary = new Set(routeOptionQuoteIds).size > 1;
  const shouldStrictlyRequireVehicleBuild = forceVehicleRebuild || isSuggestedRouteItinerary;

  try {
    pushPageLoaderStage("Checking vehicle build status");
    const buildStatus = await ItineraryService.getVehicleBuildStatus(planId);
    const normalizedStatus = (["PENDING", "PROCESSING", "READY", "FAILED"].includes(String(buildStatus?.status || "").toUpperCase())
      ? String(buildStatus?.status || "").toUpperCase()
      : "PENDING") as VehicleBuildStatus;
    setVehicleBuildStatus(normalizedStatus);
    setVehicleBuildError(String(buildStatus?.error || "") || null);

    if (!forceVehicleRebuild && Boolean(buildStatus?.isLatestBuildReady) && hasUsableVehicleRows(initialDetails)) {
      await finalizePage(initialDetails);
      return;
    }

    pushPageLoaderStage("Building permit charges");
    await ItineraryService.buildPermitsSync(planId);
    pushPageLoaderStage("Building vehicle details and pricing");
    const vehicleBuildResult = await ItineraryService.buildVehiclesSync(planId);
    if (String(vehicleBuildResult?.status || "FAILED").toUpperCase() !== "READY") {
      throw new Error(String(vehicleBuildResult?.error || "Vehicle pricing failed to prepare"));
    }
    setVehicleBuildStatus("READY");

    pushPageLoaderStage("Loading completed itinerary");
    const finalDetails = await ItineraryService.getDetails(requestedQuoteId) as ItineraryDetailsResponse;
    if (!hasUsableVehicleRows(finalDetails)) throw new Error("Vehicle details are still incomplete after rebuild");
    await finalizePage(finalDetails);
  } catch (error) {
    if (shouldStrictlyRequireVehicleBuild) throw error;
    console.warn("Vehicle build failed for non-suggested itinerary. Showing itinerary details without blocking the page.", error);
    setVehicleBuildStatus("READY");
    setVehicleBuildError(error instanceof Error ? error.message : String(error || "Vehicle pricing failed to prepare"));
    await finalizePage(initialDetails);
  }
}, [hasUsableVehicleRows, pushPageLoaderStage, setVehicleBuildError, setVehicleBuildStatus]);
