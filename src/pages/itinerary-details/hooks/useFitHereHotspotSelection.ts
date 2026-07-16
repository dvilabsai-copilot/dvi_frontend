import { useCallback, type Dispatch, type MutableRefObject, type SetStateAction } from "react";
import type { AvailableHotspot, TriedAnchorState } from "../itinerary-details.types";
import type { AutoFitHereModalState, FitHereModalState } from "./useHotspotState";

type FitHereHotspotSelectionOptions = {
  previewRequestIdRef: MutableRefObject<number>;
  stopFitHereProgressTimer: () => void;
  setSelectedFitHotspot: Dispatch<SetStateAction<AvailableHotspot | null>>;
  setTriedFitHereAnchors: Dispatch<SetStateAction<Record<string, TriedAnchorState>>>;
  setFitHereModal: Dispatch<SetStateAction<FitHereModalState>>;
  setAutoFitHereModal: Dispatch<SetStateAction<AutoFitHereModalState>>;
  resetManualHotspotPreviewState: () => void;
  setActivePreviewHotspotId: Dispatch<SetStateAction<number | null>>;
  setSelectedHotspotIds: Dispatch<SetStateAction<number[]>>;
};

/** Resets Fit Here preview state when the user selects a different hotspot. */
export const useFitHereHotspotSelection = ({
  previewRequestIdRef,
  stopFitHereProgressTimer,
  setSelectedFitHotspot,
  setTriedFitHereAnchors,
  setFitHereModal,
  setAutoFitHereModal,
  resetManualHotspotPreviewState,
  setActivePreviewHotspotId,
  setSelectedHotspotIds,
}: FitHereHotspotSelectionOptions) => useCallback((hotspot: AvailableHotspot) => {
  previewRequestIdRef.current += 1;
  stopFitHereProgressTimer();
  setSelectedFitHotspot(hotspot);
  setTriedFitHereAnchors({});
  setFitHereModal({
    open: false,
    loading: false,
    loadingStepIndex: 0,
    failedReason: null,
    attempt: null,
    anchorKey: null,
    retryPayload: null,
  });
  setAutoFitHereModal({
    open: false,
    loading: false,
    failedReason: null,
    results: [],
    selectedAnchorKey: null,
  });
  resetManualHotspotPreviewState();
  setActivePreviewHotspotId(null);
  setSelectedHotspotIds([]);
}, [previewRequestIdRef, resetManualHotspotPreviewState, setActivePreviewHotspotId, setAutoFitHereModal, setFitHereModal, setSelectedFitHotspot, setSelectedHotspotIds, setTriedFitHereAnchors, stopFitHereProgressTimer]);
