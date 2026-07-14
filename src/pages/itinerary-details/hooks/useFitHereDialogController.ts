import { useCallback, type Dispatch, type SetStateAction } from "react";
import { toast } from "sonner";
import type { ManualFitHerePreviewResponse } from "@/components/itinerary/manual-fit/ManualFitHerePreviewDialog";
import type { HotspotAnchor, ItineraryDay, TriedAnchorState } from "../itinerary-details.types";

interface FitHereModalState {
  open: boolean;
  loading: boolean;
  loadingStepIndex: number;
  failedReason: string | null;
  attempt: ManualFitHerePreviewResponse | null;
  anchorKey: string | null;
  retryPayload?: { day: ItineraryDay; anchor: HotspotAnchor } | null;
}

interface FitHereDialogControllerOptions {
  fitHereModal: FitHereModalState;
  stopFitHereProgressTimer: () => void;
  getFitHereTriedState: (resultType: unknown) => Omit<TriedAnchorState, "anchorKey" | "attemptId">;
  setTriedFitHereAnchors: Dispatch<SetStateAction<Record<string, TriedAnchorState>>>;
  setFitHereModal: Dispatch<SetStateAction<FitHereModalState>>;
  handleFitHereClick: (day: ItineraryDay, anchor: HotspotAnchor) => Promise<void>;
}

/** Owns Fit Here dialog cancellation, retry payload validation, and tried-anchor bookkeeping. */
export const useFitHereDialogController = ({
  fitHereModal,
  stopFitHereProgressTimer,
  getFitHereTriedState,
  setTriedFitHereAnchors,
  setFitHereModal,
  handleFitHereClick,
}: FitHereDialogControllerOptions) => {
  const handleFitHereCancel = useCallback(() => {
    stopFitHereProgressTimer();
    const attempt = fitHereModal.attempt;
    const anchorKey = fitHereModal.anchorKey;

    if (anchorKey && attempt) {
      const triedState = getFitHereTriedState(attempt.resultType);
      setTriedFitHereAnchors((previous) => ({
        ...previous,
        [anchorKey]: { ...triedState, anchorKey, attemptId: attempt.attemptId },
      }));
    }

    setFitHereModal({ open: false, loading: false, loadingStepIndex: 0, failedReason: null, attempt: null, anchorKey: null, retryPayload: null });
  }, [fitHereModal.anchorKey, fitHereModal.attempt, getFitHereTriedState, setFitHereModal, setTriedFitHereAnchors, stopFitHereProgressTimer]);

  const handleRetryFitHere = useCallback(() => {
    const retryPayload = fitHereModal.retryPayload;
    if (!retryPayload) {
      toast.error("Retry details are missing. Please click Fit Here again.");
      return;
    }
    void handleFitHereClick(retryPayload.day, retryPayload.anchor);
  }, [fitHereModal.retryPayload, handleFitHereClick]);

  return { handleFitHereCancel, handleRetryFitHere };
};
