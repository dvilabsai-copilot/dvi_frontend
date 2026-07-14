import { useCallback, type Dispatch, type SetStateAction } from "react";
import type { AvailableHotspot, HotspotAnchor, ItineraryDay, TriedAnchorState } from "../itinerary-details.types";
import type { ManualFitHerePreviewResponse } from "@/components/itinerary/manual-fit/ManualFitHerePreviewDialog";

interface FitHereModalState {
  open: boolean;
  loading: boolean;
  loadingStepIndex: number;
  failedReason: string | null;
  attempt: ManualFitHerePreviewResponse | null;
  anchorKey: string | null;
  retryPayload?: { day: ItineraryDay; anchor: HotspotAnchor } | null;
}

interface AutoFitHereModalState {
  open: boolean;
  loading: boolean;
  failedReason: string | null;
  results: unknown[];
  selectedAnchorKey: string | null;
  loadingAnchorCount?: number;
  loadingStartedAtMs?: number | null;
  performanceSummary?: unknown;
}

interface FitHereConfirmationResetOptions {
  setSelectedFitHotspot: Dispatch<SetStateAction<AvailableHotspot | null>>;
  setActivePreviewHotspotId: Dispatch<SetStateAction<number | null>>;
  setSelectedHotspotIds: Dispatch<SetStateAction<number[]>>;
  setManualPreviewState: Dispatch<SetStateAction<unknown | null>>;
  setPreviewTimelinesByHotspot: Dispatch<SetStateAction<Record<number, unknown[]>>>;
  setPreviewResolutionsByHotspot: Dispatch<SetStateAction<Record<number, unknown>>>;
  setGroupPreviewTimeline: Dispatch<SetStateAction<unknown[]>>;
  setGroupPreviewResolution: Dispatch<SetStateAction<unknown | null>>;
  setTempModalTimeline: Dispatch<SetStateAction<unknown[]>>;
  setFitHereModal: Dispatch<SetStateAction<FitHereModalState>>;
  setAutoFitHereModal: Dispatch<SetStateAction<AutoFitHereModalState>>;
  setTriedFitHereAnchors: Dispatch<SetStateAction<Record<string, TriedAnchorState>>>;
}

/** Resets all Fit Here and manual-preview state after a successful insertion. */
export const useFitHereConfirmationReset = ({
  setSelectedFitHotspot,
  setActivePreviewHotspotId,
  setSelectedHotspotIds,
  setManualPreviewState,
  setPreviewTimelinesByHotspot,
  setPreviewResolutionsByHotspot,
  setGroupPreviewTimeline,
  setGroupPreviewResolution,
  setTempModalTimeline,
  setFitHereModal,
  setAutoFitHereModal,
  setTriedFitHereAnchors,
}: FitHereConfirmationResetOptions) => useCallback(() => {
  setSelectedFitHotspot(null);
  setActivePreviewHotspotId(null);
  setSelectedHotspotIds([]);
  setManualPreviewState(null);
  setPreviewTimelinesByHotspot({});
  setPreviewResolutionsByHotspot({});
  setGroupPreviewTimeline([]);
  setGroupPreviewResolution(null);
  setTempModalTimeline([]);
  setFitHereModal({ open: false, loading: false, loadingStepIndex: 0, failedReason: null, attempt: null, anchorKey: null, retryPayload: null });
  setAutoFitHereModal({ open: false, loading: false, failedReason: null, results: [], selectedAnchorKey: null, loadingAnchorCount: 0, loadingStartedAtMs: null, performanceSummary: null });
  setTriedFitHereAnchors({});
}, [setActivePreviewHotspotId, setAutoFitHereModal, setFitHereModal, setGroupPreviewResolution, setGroupPreviewTimeline, setManualPreviewState, setPreviewResolutionsByHotspot, setPreviewTimelinesByHotspot, setSelectedFitHotspot, setSelectedHotspotIds, setTempModalTimeline, setTriedFitHereAnchors]);
