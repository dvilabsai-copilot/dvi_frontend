import type { ComponentProps, Dispatch, MutableRefObject, SetStateAction } from "react";
import { ManualFitHerePreviewDialog } from "@/components/itinerary/manual-fit/ManualFitHerePreviewDialog";
import { AutoFitHerePreviewDialog } from "@/components/itinerary/manual-fit/AutoFitHerePreviewDialog";
import type { FitHereModalState, AutoFitHereModalState } from "./useHotspotState";
import type { AvailableHotspot, ItineraryDay } from "../itinerary-details.types";

type ManualProps = ComponentProps<typeof ManualFitHerePreviewDialog>;
type AutomaticProps = ComponentProps<typeof AutoFitHerePreviewDialog>;

type FitHereDialogPropsOptions = {
  fitHereModal: FitHereModalState;
  selectedFitHotspot: AvailableHotspot | null;
  selectedFitHereDay: ItineraryDay | null;
  onManualClose: ManualProps["onClose"];
  onManualConfirm: ManualProps["onConfirm"];
  onManualRetry: ManualProps["onRetry"];
  confirmLoading: boolean;
  autoFitHereModal: AutoFitHereModalState;
  selectedHotspot: AvailableHotspot | null;
  previewRequestIdRef: MutableRefObject<number>;
  setAutoFitHereModal: Dispatch<SetStateAction<AutoFitHereModalState>>;
  onAutomaticConfirm: AutomaticProps["onConfirm"];
};

export function useFitHereDialogProps({
  fitHereModal,
  selectedFitHotspot,
  selectedFitHereDay,
  onManualClose,
  onManualConfirm,
  onManualRetry,
  confirmLoading,
  autoFitHereModal,
  selectedHotspot,
  previewRequestIdRef,
  setAutoFitHereModal,
  onAutomaticConfirm,
}: FitHereDialogPropsOptions): { manual: ManualProps; automatic: AutomaticProps } {
  return {
    manual: {
      open: fitHereModal.open,
      loading: fitHereModal.loading,
      loadingStepIndex: fitHereModal.loadingStepIndex,
      failedReason: fitHereModal.failedReason,
      attempt: fitHereModal.attempt,
      selectedHotspot: selectedFitHotspot,
      baseTimeline: selectedFitHereDay?.segments || [],
      onClose: onManualClose,
      onConfirm: onManualConfirm,
      onRetry: onManualRetry,
      confirmLoading,
    },
    automatic: {
      open: autoFitHereModal.open,
      loading: autoFitHereModal.loading,
      failedReason: autoFitHereModal.failedReason,
      results: autoFitHereModal.results,
      selectedAnchorKey: autoFitHereModal.selectedAnchorKey,
      selectedHotspot,
      baseTimeline: selectedFitHereDay?.segments || [],
      loadingAnchorCount: autoFitHereModal.loadingAnchorCount || 0,
      loadingStartedAtMs: autoFitHereModal.loadingStartedAtMs || null,
      performanceSummary: autoFitHereModal.performanceSummary || null,
      onClose: () => {
        previewRequestIdRef.current += 1;
        setAutoFitHereModal({
          open: false,
          loading: false,
          failedReason: null,
          results: [],
          selectedAnchorKey: null,
          loadingAnchorCount: 0,
          loadingStartedAtMs: null,
          performanceSummary: null,
        });
      },
      onSelectAnchorKey: (anchorKey) => setAutoFitHereModal((previous) => ({ ...previous, selectedAnchorKey: anchorKey })),
      onConfirm: onAutomaticConfirm,
      confirmLoading,
    },
  };
}
