import { useCallback, type Dispatch, type SetStateAction } from "react";
import { toast } from "sonner";
import { ItineraryService } from "@/services/itinerary";
import type { ManualFitHerePreviewResponse } from "@/components/itinerary/manual-fit/ManualFitHerePreviewDialog";
import type { AvailableHotspot, HotspotAnchor, ItineraryDay, ItineraryDetailsResponse, ItinerarySegment } from "../itinerary-details.types";
import {
  analyzeFitHereConfirmation,
  extractFitHereConfirmErrorCode,
  type FitHereConfirmOptions,
  isExpiredOrMissingFitHereAttemptError,
  isRetryableFitHereConfirmError,
  normalizeFitHereConfirmationResult,
} from "../utils/fitHereConfirm.utils";
import type { FitHereModalState } from "./useHotspotState";

type FitHereConfirmationMutationProps = {
  itinerary: ItineraryDetailsResponse | null;
  fitHereModal: FitHereModalState;
  selectedFitHotspot: AvailableHotspot | null;
  selectedFitHereDay: ItineraryDay | null | undefined;
  fallbackRouteId: number | null | undefined;
  handleFitHereClick: (day: ItineraryDay, anchor: HotspotAnchor) => Promise<void>;
  stopFitHereProgressTimer: () => void;
  setConfirmFitHereLoading: Dispatch<SetStateAction<boolean>>;
  resetFitHereAfterConfirmation: () => void;
  applyFitHereConfirmationState: (args: {
    confirmedHotspotId: number;
    confirmedRouteId: number;
    insertedRouteHotspotId: number | null;
    removedHotspotIds: number[];
    persistedTimeline: unknown[];
  }) => ItinerarySegment[];
  refreshAfterFitHereConfirmation: (confirmedRouteId: number, confirmedSegments: ItinerarySegment[]) => Promise<void>;
  getFitHereRefreshScrollStorageKey: () => string | null;
};

const getErrorMessage = (error: unknown, fallback: string): string => {
  if (error && typeof error === "object" && "message" in error) {
    const message = String((error as { message?: unknown }).message || "").trim();
    if (message) return message;
  }
  return fallback;
};

export const useFitHereConfirmationMutation = ({
  itinerary,
  fitHereModal,
  selectedFitHotspot,
  selectedFitHereDay,
  fallbackRouteId,
  handleFitHereClick,
  stopFitHereProgressTimer,
  setConfirmFitHereLoading,
  resetFitHereAfterConfirmation,
  applyFitHereConfirmationState,
  refreshAfterFitHereConfirmation,
  getFitHereRefreshScrollStorageKey,
}: FitHereConfirmationMutationProps) => {
  const resolveActiveFitHereDayNumber = useCallback((attempt?: ManualFitHerePreviewResponse | null): number | null => {
    const attemptRouteId = Number(attempt?.routeId || fitHereModal.retryPayload?.day?.id || fallbackRouteId || 0);
    if (attemptRouteId > 0) {
      const matchedDay = itinerary?.days?.find((day) => Number(day.id) === attemptRouteId);
      const matchedDayNumber = Number(matchedDay?.dayNumber || 0);
      if (matchedDayNumber > 0) return matchedDayNumber;
    }

    const fallbackDayNumber = Number(fitHereModal.retryPayload?.day?.dayNumber || selectedFitHereDay?.dayNumber || 0);
    return fallbackDayNumber > 0 ? fallbackDayNumber : null;
  }, [fallbackRouteId, fitHereModal.retryPayload?.day?.dayNumber, fitHereModal.retryPayload?.day?.id, itinerary?.days, selectedFitHereDay?.dayNumber]);

  const confirmFitHere = useCallback(async (
    options?: FitHereConfirmOptions,
    attemptOverride?: ManualFitHerePreviewResponse | null,
  ): Promise<void> => {
    const selectedAttempt = attemptOverride || fitHereModal.attempt;
    const attemptId = selectedAttempt?.attemptId;
    const planId = Number(itinerary?.planId || 0);
    const {
      acknowledgedRemovedHotspotIds,
      hasTimingRisk,
      hasPriorityRemoval,
      hasP3Removal,
      hasP1P2Removal,
      canForceClosedHotspotConflict,
      hasUnprovenProtectedRemoval,
    } = analyzeFitHereConfirmation(selectedAttempt, options);

    if (!attemptId) {
      toast.error("Preview attempt is missing.");
      return;
    }
    if (!(planId > 0)) {
      toast.error("Plan ID missing.");
      return;
    }
    if (hasUnprovenProtectedRemoval) {
      toast.error("This preview removes a protected hotspot without proven route-feasibility evidence. Please recalculate before confirming.");
      return;
    }
    if (hasP3Removal && selectedAttempt?.removalPolicy?.allowP3Removal !== true) {
      toast.error("This preview removes a Priority 3 hotspot without approval. Please recalculate with P3 removal allowed.");
      return;
    }
    if (hasP1P2Removal && selectedAttempt?.removalPolicy?.allowP1P2Removal !== true) {
      toast.error("This preview removes a Priority 1 / Priority 2 hotspot without approval. Please recalculate with protected removal allowed.");
      return;
    }

    setConfirmFitHereLoading(true);
    stopFitHereProgressTimer();
    try {
      const confirmResult = await ItineraryService.confirmManualHotspotFitHere(planId, {
        attemptId,
        allowTimingRisk: options?.allowTimingRisk === true || hasTimingRisk || canForceClosedHotspotConflict,
        allowClosedHotspotConflict: canForceClosedHotspotConflict,
        allowPriorityRemoval:
          options?.allowPriorityRemoval === true
          || hasPriorityRemoval
          || selectedAttempt?.removedPrioritySummary?.requiresPriorityRemovalConfirmation === true,
        acknowledgedRemovedHotspotIds,
      });
      const {
        confirmedHotspotId,
        confirmedRouteId,
        persistedTimeline,
        insertedRouteHotspotId,
        removedHotspotIds,
      } = normalizeFitHereConfirmationResult(confirmResult, selectedAttempt, selectedFitHotspot?.id || null, fallbackRouteId);
      const confirmedSegments = applyFitHereConfirmationState({
        confirmedHotspotId,
        confirmedRouteId,
        insertedRouteHotspotId,
        removedHotspotIds,
        persistedTimeline,
      });

      toast.success("Hotspot inserted successfully. Timeline updated.");
      resetFitHereAfterConfirmation();
      await refreshAfterFitHereConfirmation(confirmedRouteId, confirmedSegments);
    } catch (error) {
      if (isExpiredOrMissingFitHereAttemptError(error)) {
        const scrollDayNumber = resolveActiveFitHereDayNumber(selectedAttempt);
        const scrollStorageKey = getFitHereRefreshScrollStorageKey();
        if (scrollStorageKey && scrollDayNumber) {
          window.sessionStorage.setItem(scrollStorageKey, String(scrollDayNumber));
        }
        toast.info("This Fit Here preview expired. Refreshing the itinerary now.");
        window.setTimeout(() => window.location.reload(), 600);
        return;
      }

      const confirmErrorCode = extractFitHereConfirmErrorCode(error);
      if (
        confirmErrorCode === "MANUAL_INSERT_SELECTED_HOTSPOT_CLOSING_NOT_RESOLVED"
        && !options?.allowClosedHotspotConflict
        && selectedAttempt?.attemptId
        && (selectedAttempt.selectedOpeningConflict || selectedAttempt.canForceConflict === true)
      ) {
        toast.info("Retrying the same Fit Here attempt with the approved conflict-save path.");
        await confirmFitHere(
          {
            allowTimingRisk: true,
            allowClosedHotspotConflict: true,
            acknowledgedRemovedHotspotIds,
          },
          selectedAttempt,
        );
        return;
      }

      if (isRetryableFitHereConfirmError(error)) {
        const retryPayload = fitHereModal.retryPayload;
        if (retryPayload) {
          toast.error("This preview changed on the server. Recalculating the latest Fit Here preview now.");
          await handleFitHereClick(retryPayload.day, retryPayload.anchor);
          return;
        }
      }
      toast.error(getErrorMessage(error, "Could not confirm Fit Here insertion."));
    } finally {
      stopFitHereProgressTimer();
      setConfirmFitHereLoading(false);
    }
  }, [applyFitHereConfirmationState, fallbackRouteId, fitHereModal.attempt, fitHereModal.retryPayload, getFitHereRefreshScrollStorageKey, handleFitHereClick, itinerary?.planId, refreshAfterFitHereConfirmation, resetFitHereAfterConfirmation, resolveActiveFitHereDayNumber, selectedFitHotspot?.id, setConfirmFitHereLoading, stopFitHereProgressTimer]);

  return confirmFitHere;
};
