/* eslint-disable @typescript-eslint/no-explicit-any */
import { useMemo } from "react";
import {
  hasManualOpeningOrTimingConflict,
  isManualRelaxedRouteFitPolicy,
} from "../utils/timeline.utils";

type UseInsertionDecisionSummaryOptions = {
  activePreviewHotspotId: number | null;
  activePreviewResolution: any;
  activePreviewValidation: any;
  groupPreviewResolution: any;
  isMatrixBuiltButNoFeasibleSlot: boolean;
  isMatrixMissingBlockedState: boolean;
  matrixApplyBlocked: boolean;
  matrixFit: any;
  matrixRequiresBuild: boolean;
  manualPreviewState: any;
};

/** Derives the user-facing insertion outcome summary for the current hotspot preview. */
export const useInsertionDecisionSummary = ({
  activePreviewHotspotId,
  activePreviewResolution,
  activePreviewValidation,
  groupPreviewResolution,
  isMatrixBuiltButNoFeasibleSlot,
  isMatrixMissingBlockedState,
  matrixApplyBlocked,
  matrixFit,
  matrixRequiresBuild,
  manualPreviewState,
}: UseInsertionDecisionSummaryOptions) => useMemo(() => {
    if (!activePreviewHotspotId || !matrixFit) return null;
    const canProceedWithReschedule = (
      activePreviewValidation?.readyToApply === false
      && activePreviewValidation?.requiresPriorityConfirmation !== true
      && !matrixApplyBlocked
    );
    if (matrixRequiresBuild || isMatrixMissingBlockedState) {
      return {
        willInsert: false,
        text: 'Schedule fit cannot be checked: route-fit matrix data is missing.',
      };
    }
    if (isMatrixBuiltButNoFeasibleSlot) {
      const manualRelaxedRouteFit =
        isManualRelaxedRouteFitPolicy(manualPreviewState)
        || isManualRelaxedRouteFitPolicy(activePreviewResolution)
        || isManualRelaxedRouteFitPolicy(groupPreviewResolution);
      return {
        willInsert: manualRelaxedRouteFit,
        text: manualRelaxedRouteFit
          ? 'Manual insertion is available, but schedule fit still depends on visit duration, opening hours, travel time, and the allowed day end.'
          : 'Will not be inserted: the hotspot is off-route/backtracking for the current route.',
      };
    }
    if (canProceedWithReschedule) {
      const routeEndOverflowMinutes = Number(activePreviewValidation?.routeEndOverflowMinutes || 0);
      const hasOpeningOrTimingConflict = hasManualOpeningOrTimingConflict(activePreviewValidation);

      if (routeEndOverflowMinutes > 0) {
        return {
          willInsert: false,
          text: `Schedule does not fit: the rebuilt route exceeds the allowed day end by ${routeEndOverflowMinutes} minutes.`,
        };
      }

      if (hasOpeningOrTimingConflict) {
        return {
          willInsert: false,
          text: 'Schedule fit failed: the visit conflicts with opening or timing rules. Force add keeps it as a conflict.',
        };
      }

      return {
        willInsert: true,
        text: 'Schedule fit passed: visit duration and travel fit within the allowed day window.',
      };
    }
    if (matrixApplyBlocked || activePreviewValidation?.readyToApply === false) {
      return {
        willInsert: false,
        text: 'Schedule fit is not confirmed: the current preview is not ready to apply.',
      };
    }
    return {
      willInsert: true,
      text: 'Route insertion is available. Schedule fit will be confirmed by the timeline preview.',
    };
  }, [
    activePreviewHotspotId,
    isMatrixBuiltButNoFeasibleSlot,
    isMatrixMissingBlockedState,
    matrixApplyBlocked,
    matrixFit,
    matrixRequiresBuild,
    manualPreviewState,
    activePreviewResolution,
    groupPreviewResolution,
    activePreviewValidation,
  ]);
