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
    const message = error instanceof Error ? error.message : String(error || "Vehicle pricing failed to prepare");
    setVehicleBuildStatus("FAILED");
    setVehicleBuildError(message);
    throw error;
  }
}, [hasUsableVehicleRows, pushPageLoaderStage, setVehicleBuildError, setVehicleBuildStatus]);
