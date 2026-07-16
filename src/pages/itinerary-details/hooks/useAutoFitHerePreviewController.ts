import { useCallback, type Dispatch, type MutableRefObject, type SetStateAction } from "react";
import { toast } from "sonner";
import { ItineraryService } from "@/services/itinerary";
import {
  buildAutoManualHotspotPreviewPayload,
  extractAutoPreviewResults,
  pickBestAutoPreviewAnchorKey,
} from "../manual-hotspot-preview.shared";
import type { AvailableHotspot, HotspotAnchor, ItineraryDay } from "../itinerary-details.types";
import type { AutoFitHereModalState, FitHereModalState } from "./useHotspotState";

type AutoPreviewResponse = Record<string, unknown>;

type AutoFitHerePreviewControllerProps = {
  itineraryPlanId: number | null | undefined;
  selectedFitHereDay: ItineraryDay | null | undefined;
  buildAutoFitHereAnchorsForDay: (day: ItineraryDay) => HotspotAnchor[];
  buildFitHereAnchorKey: (anchor: HotspotAnchor) => string;
  serializeFitHereAnchor: (anchor: HotspotAnchor) => Record<string, unknown>;
  buildAutoPreviewAnchorProgressText: (day: ItineraryDay, anchor: HotspotAnchor) => string;
  setSelectedFitHotspot: Dispatch<SetStateAction<AvailableHotspot | null>>;
  setActivePreviewHotspotId: Dispatch<SetStateAction<number | null>>;
  setSelectedHotspotIds: Dispatch<SetStateAction<number[]>>;
  setFitHereModal: Dispatch<SetStateAction<FitHereModalState>>;
  setAutoFitHereModal: Dispatch<SetStateAction<AutoFitHereModalState>>;
  previewRequestIdRef: MutableRefObject<number>;
  resetManualHotspotPreviewStateButKeepActiveHotspot: (candidateId: number) => void;
  stopFitHereProgressTimer: () => void;
};

const getPreviewErrorMessage = (error: unknown, fallback: string): string => {
  if (error instanceof Error && error.message) return error.message;
  if (error && typeof error === "object" && "message" in error) {
    const message = String((error as { message?: unknown }).message || "").trim();
    if (message) return message;
  }
  return fallback;
};

export const useAutoFitHerePreviewController = ({
  itineraryPlanId,
  selectedFitHereDay,
  buildAutoFitHereAnchorsForDay,
  buildFitHereAnchorKey,
  serializeFitHereAnchor,
  buildAutoPreviewAnchorProgressText,
  setSelectedFitHotspot,
  setActivePreviewHotspotId,
  setSelectedHotspotIds,
  setFitHereModal,
  setAutoFitHereModal,
  previewRequestIdRef,
  resetManualHotspotPreviewStateButKeepActiveHotspot,
  stopFitHereProgressTimer,
}: AutoFitHerePreviewControllerProps) => {
  const executeAutoPreviewFitHere = useCallback(async (day: ItineraryDay, hotspot: AvailableHotspot) => {
    const planId = Number(itineraryPlanId || 0);

    if (!(planId > 0)) {
      toast.error("Plan ID missing.");
      return;
    }

    const anchors = buildAutoFitHereAnchorsForDay(day);
    if (anchors.length === 0) {
      toast.error("No valid Fit Here positions found for Auto-Preview.");
      return;
    }

    stopFitHereProgressTimer();
    const requestId = ++previewRequestIdRef.current;
    setSelectedFitHotspot(hotspot);
    setActivePreviewHotspotId(hotspot.id);
    setSelectedHotspotIds([hotspot.id]);
    resetManualHotspotPreviewStateButKeepActiveHotspot(hotspot.id);
    setFitHereModal({
      open: false,
      loading: false,
      loadingStepIndex: 0,
      failedReason: null,
      attempt: null,
      anchorKey: null,
      retryPayload: null,
    });

    const initialRows = anchors.map((anchor, index) => ({
      anchorKey: buildFitHereAnchorKey(anchor),
      anchor: serializeFitHereAnchor(anchor),
      attempt: null,
      status: "PENDING" as const,
      score: 0,
      rankReason: "Waiting to simulate this position.",
      removedCount: 0,
      progressText: buildAutoPreviewAnchorProgressText(day, anchor),
      elapsedMs: 0,
      sortIndex: index,
    }));

    setAutoFitHereModal({
      open: true,
      loading: true,
      failedReason: null,
      results: initialRows,
      selectedAnchorKey: null,
      loadingAnchorCount: anchors.length,
      loadingStartedAtMs: Date.now(),
      performanceSummary: null,
    });

    try {
      const response = await ItineraryService.previewManualHotspotAutoFitHere(
        planId,
        buildAutoManualHotspotPreviewPayload(
          Number(day.id),
          Number(hotspot.id),
          anchors.map((anchor) => serializeFitHereAnchor(anchor)),
        ),
      ) as AutoPreviewResponse;
      if (requestId !== previewRequestIdRef.current) return;

      const results = extractAutoPreviewResults(response).map((row, index: number) => ({
        ...row,
        progressText: buildAutoPreviewAnchorProgressText(day, row?.anchor || anchors[index] || anchors[0]),
        sortIndex: Number.isFinite(Number(row?.sortIndex)) ? Number(row?.sortIndex) : index,
      }));
      const selectedAnchorKey = pickBestAutoPreviewAnchorKey(response, results[0]?.anchorKey || null);

      setAutoFitHereModal({
        open: true,
        loading: false,
        failedReason: null,
        results,
        selectedAnchorKey,
        loadingAnchorCount: anchors.length,
        loadingStartedAtMs: null,
        performanceSummary: (response as { performanceSummary?: AutoFitHereModalState["performanceSummary"] }).performanceSummary || null,
      });
    } catch (error) {
      if (requestId !== previewRequestIdRef.current) return;

      const message = getPreviewErrorMessage(error, "Could not run Auto-Preview.");
      setAutoFitHereModal({
        open: true,
        loading: false,
        failedReason: message,
        results: initialRows,
        selectedAnchorKey: null,
        loadingAnchorCount: anchors.length,
        loadingStartedAtMs: null,
        performanceSummary: null,
      });
      toast.error(message);
    }
  }, [buildAutoFitHereAnchorsForDay, buildAutoPreviewAnchorProgressText, buildFitHereAnchorKey, itineraryPlanId, previewRequestIdRef, resetManualHotspotPreviewStateButKeepActiveHotspot, serializeFitHereAnchor, setActivePreviewHotspotId, setAutoFitHereModal, setFitHereModal, setSelectedFitHotspot, setSelectedHotspotIds, stopFitHereProgressTimer]);

  return useCallback(async (hotspot: AvailableHotspot) => {
    const day = selectedFitHereDay;
    if (!day) {
      toast.error("Could not find the selected route day.");
      return;
    }
    await executeAutoPreviewFitHere(day, hotspot);
  }, [executeAutoPreviewFitHere, selectedFitHereDay]);
};
