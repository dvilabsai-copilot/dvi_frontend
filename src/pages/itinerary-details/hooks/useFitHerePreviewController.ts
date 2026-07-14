import { useCallback, type Dispatch, type SetStateAction } from "react";
import { ItineraryService } from "@/services/itinerary";
import { toast } from "sonner";
import { ManualFitHerePreviewResponse } from "@/components/itinerary/manual-fit/ManualFitHerePreviewDialog";
import { buildExactManualHotspotPreviewPayload } from "../manual-hotspot-preview.shared";
import type { AvailableHotspot, HotspotAnchor, ItineraryDay } from "../itinerary-details.types";

interface FitHereModalState {
  open: boolean;
  loading: boolean;
  loadingStepIndex: number;
  failedReason: string | null;
  attempt: ManualFitHerePreviewResponse | null;
  anchorKey: string | null;
  retryPayload?: { day: ItineraryDay; anchor: HotspotAnchor } | null;
}

interface FitHerePreviewControllerOptions {
  selectedFitHotspot: AvailableHotspot | null;
  itineraryPlanId: number | null;
  buildFitHereAnchorKey: (anchor: HotspotAnchor) => string;
  startFitHereProgressTimer: () => void;
  stopFitHereProgressTimer: () => void;
  setFitHereModal: Dispatch<SetStateAction<FitHereModalState>>;
}

const getErrorMessage = (error: unknown): string => {
  if (typeof error === "object" && error !== null) {
    const message = (error as { message?: unknown }).message;
    if (message) return String(message);
  }
  return "Could not calculate Fit Here preview.";
};

/** Owns the exact-anchor Fit Here preview request and progress/error state. */
export const useFitHerePreviewController = ({
  selectedFitHotspot,
  itineraryPlanId,
  buildFitHereAnchorKey,
  startFitHereProgressTimer,
  stopFitHereProgressTimer,
  setFitHereModal,
}: FitHerePreviewControllerOptions) => useCallback(async (day: ItineraryDay, anchor: HotspotAnchor) => {
  if (!selectedFitHotspot) {
    toast.error("Please select a hotspot first.");
    return;
  }

  const planId = Number(itineraryPlanId || 0);
  if (!(planId > 0)) {
    toast.error("Plan ID missing.");
    return;
  }

  const anchorKey = buildFitHereAnchorKey(anchor);
  console.log("[FitHere] selected_anchor", { hotspotId: selectedFitHotspot.id, anchor });
  setFitHereModal({
    open: true,
    loading: true,
    loadingStepIndex: 0,
    failedReason: null,
    attempt: null,
    anchorKey,
    retryPayload: { day, anchor },
  });
  startFitHereProgressTimer();

  try {
    const previewPayload = buildExactManualHotspotPreviewPayload(Number(day.id), Number(selectedFitHotspot.id), {
      anchorType: anchor.anchorType,
      anchorIntent: anchor.anchorIntent,
      anchorIndex: anchor.anchorIndex,
      anchorFrom: anchor.anchorFrom,
      anchorTo: anchor.anchorTo,
      anchorLabel: anchor.anchorLabel,
      anchorTimeRange: anchor.anchorTimeRange,
      afterRowType: anchor.afterRowType,
      beforeRowType: anchor.beforeRowType,
      afterHotspotId: anchor.afterHotspotId,
      afterRouteHotspotId: anchor.afterRouteHotspotId,
      beforeHotspotId: anchor.beforeHotspotId,
      beforeRouteHotspotId: anchor.beforeRouteHotspotId,
    });
    console.log("[FitHere] clicked anchor", previewPayload);
    const response = await ItineraryService.previewManualHotspotFitHere(planId, previewPayload);
    stopFitHereProgressTimer();
    setFitHereModal({
      open: true,
      loading: false,
      loadingStepIndex: 10,
      failedReason: null,
      attempt: response as ManualFitHerePreviewResponse,
      anchorKey,
      retryPayload: { day, anchor },
    });
  } catch (error) {
    stopFitHereProgressTimer();
    setFitHereModal({
      open: true,
      loading: false,
      loadingStepIndex: 0,
      failedReason: getErrorMessage(error),
      attempt: null,
      anchorKey,
      retryPayload: { day, anchor },
    });
    toast.error(getErrorMessage(error));
  }
}, [buildFitHereAnchorKey, itineraryPlanId, selectedFitHotspot, setFitHereModal, startFitHereProgressTimer, stopFitHereProgressTimer]);
