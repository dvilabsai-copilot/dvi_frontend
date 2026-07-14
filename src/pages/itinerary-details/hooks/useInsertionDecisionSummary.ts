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
        text: 'Will not be inserted: route-fit matrix is missing.',
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
          ? 'Can be inserted manually. This adds extra distance/off-route travel, but timing will decide final fit.'
          : 'Will not be inserted: hotspot is off-route/backtracking for current route.',
      };
    }
    if (canProceedWithReschedule) {
      const routeEndOverflowMinutes = Number(activePreviewValidation?.routeEndOverflowMinutes || 0);
      const hasOpeningOrTimingConflict = hasManualOpeningOrTimingConflict(activePreviewValidation);

      if (routeEndOverflowMinutes > 0) {
        return {
          willInsert: false,
          text: `Cannot insert normally because the rebuilt route exceeds the allowed manual day end by ${routeEndOverflowMinutes} minutes.`,
        };
      }

      if (hasOpeningOrTimingConflict) {
        return {
          willInsert: false,
          text: 'Route-fit slot found, but the hotspot conflicts with opening/timing rules. Use force add only if you want to keep it as a conflict.',
        };
      }

      return {
        willInsert: true,
        text: 'Route-fit slot found. Timeline can be recalculated within the manual timing window.',
      };
    }
    if (matrixApplyBlocked || activePreviewValidation?.readyToApply === false) {
      return {
        willInsert: false,
        text: 'Will not be inserted: current preview is not ready to apply.',
      };
    }
    return {
      willInsert: true,
      text: 'Will be inserted when you click Add hotspot.',
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
