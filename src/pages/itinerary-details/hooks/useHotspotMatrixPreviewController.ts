import { useCallback, type Dispatch, type SetStateAction } from "react";
import { ItineraryService } from "@/services/itinerary";
import { toast } from "sonner";

type PreviewSource = "AFTER_MATRIX_BUILD" | "USER_REFRESH" | "DESTINATION_SIDE_MATRIX_NOT_REQUIRED";

interface PreviewOptions {
  forceRefresh?: boolean;
  source?: PreviewSource;
}

interface MatrixBuildResult {
  success?: boolean;
  code?: string;
  message?: string;
}

interface HotspotMatrixPreviewControllerOptions {
  activePreviewHotspotId: number | null;
  planId: number | null;
  routeId: number | null;
  isDestinationSideManualPreview: boolean;
  resetManualHotspotPreviewStateButKeepActiveHotspot: (hotspotId: number) => void;
  handlePreviewHotspot: (hotspotId: number, options?: PreviewOptions) => Promise<void>;
  setIsBuildingMatrix: Dispatch<SetStateAction<boolean>>;
}

const getErrorMessage = (error: unknown): string => {
  if (typeof error === "object" && error !== null) {
    const responseMessage = (error as { response?: { data?: { message?: unknown } } }).response?.data?.message;
    if (responseMessage) return String(responseMessage);
    const message = (error as { message?: unknown }).message;
    if (message) return String(message);
  }
  return "";
};

/** Owns missing-city-matrix recovery and the follow-up manual hotspot preview. */
export const useHotspotMatrixPreviewController = ({
  activePreviewHotspotId,
  planId,
  routeId,
  isDestinationSideManualPreview,
  resetManualHotspotPreviewStateButKeepActiveHotspot,
  handlePreviewHotspot,
  setIsBuildingMatrix,
}: HotspotMatrixPreviewControllerOptions) => useCallback(async () => {
  const candidateId = Number(activePreviewHotspotId || 0);

  if (isDestinationSideManualPreview) {
    resetManualHotspotPreviewStateButKeepActiveHotspot(candidateId);
    await handlePreviewHotspot(candidateId, {
      forceRefresh: true,
      source: "DESTINATION_SIDE_MATRIX_NOT_REQUIRED",
    });
    return;
  }

  if (!planId || !routeId || !candidateId) {
    toast.error("Missing plan, route, or hotspot.");
    return;
  }

  setIsBuildingMatrix(true);
  try {
    const result = await ItineraryService.buildMissingManualHotspotMatrix(planId, routeId, candidateId) as MatrixBuildResult;
    const resultCode = String(result?.code || "").toUpperCase();

    if (
      !result?.success
      && resultCode !== "SINGLE_HOTSPOT_CITY_MATRIX_BUILT"
      && resultCode !== "EMPTY_ROUTE_CITY_MATRIX_BUILT"
      && resultCode !== "DESTINATION_SIDE_MATRIX_NOT_REQUIRED"
      && resultCode !== "NO_ROUTE_HOTSPOT_ANCHOR_FOR_MATRIX"
      && resultCode !== "CITY_ENDPOINT_NOT_FOUND_FOR_SINGLE_HOTSPOT_MATRIX"
      && resultCode !== "CITY_ENDPOINT_NOT_FOUND_FOR_EMPTY_ROUTE_MATRIX"
    ) {
      toast.error(result?.message || "Matrix build failed.");
      return;
    }

    if (resultCode === "SINGLE_HOTSPOT_CITY_MATRIX_BUILT" || resultCode === "EMPTY_ROUTE_CITY_MATRIX_BUILT") {
      toast.success(result?.message || "Matrix built using city endpoint. Rebuilding preview...");
    } else if (resultCode === "CITY_ENDPOINT_NOT_FOUND_FOR_SINGLE_HOTSPOT_MATRIX" || resultCode === "CITY_ENDPOINT_NOT_FOUND_FOR_EMPTY_ROUTE_MATRIX") {
      toast.error(result?.message || "Cannot build matrix because city endpoint was not found.");
      return;
    } else if (resultCode === "EMPTY_ROUTE_CITY_MATRIX_FAILED") {
      toast.error(result?.message || "City endpoint matrix failed for first hotspot insertion.");
      return;
    } else if (resultCode === "NO_ROUTE_HOTSPOT_ANCHOR_FOR_MATRIX") {
      toast.error(result?.message || "Cannot build matrix because this route has no hotspot anchor and no city endpoint.");
      return;
    } else if (resultCode !== "DESTINATION_SIDE_MATRIX_NOT_REQUIRED") {
      toast.success("Matrix data built. Rebuilding preview...");
    }

    resetManualHotspotPreviewStateButKeepActiveHotspot(candidateId);
    await handlePreviewHotspot(candidateId, { forceRefresh: true, source: "AFTER_MATRIX_BUILD" });
  } catch (error) {
    toast.error(getErrorMessage(error) || "Matrix build failed.");
  } finally {
    setIsBuildingMatrix(false);
  }
}, [activePreviewHotspotId, handlePreviewHotspot, isDestinationSideManualPreview, planId, resetManualHotspotPreviewStateButKeepActiveHotspot, routeId, setIsBuildingMatrix]);
