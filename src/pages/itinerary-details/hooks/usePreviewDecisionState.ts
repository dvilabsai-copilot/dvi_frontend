/* eslint-disable @typescript-eslint/no-explicit-any */
import { useMemo } from "react";
import { getPreviewValidationReasonText } from "../utils/previewValidationReason.utils";
import { isMatrixApplyBlocked as isMatrixApplyBlockedUtil } from "../utils/matrixApplyBlocked.utils";
import { isManualRelaxedRouteFitPolicy } from "../utils/timeline.utils";

type UsePreviewDecisionStateOptions = {
  activePreviewResolution: any;
  activePreviewValidation: any;
  destinationHotelDisplayName: string;
  groupPreviewResolution: any;
  isManualRelaxedRouteFitPolicy?: (value: any) => boolean;
  isMatrixBuiltButNoFeasibleSlot: boolean;
  isMatrixMissingBlockedState: boolean;
  isManualRelaxedRouteFitPolicyValue?: (value: any) => boolean;
  matrixFit: any;
  matrixRequiresBuild: boolean;
  manualPreviewState: any;
  normalizedDecision: any;
};

/** Derives preview validation text, apply blocking, and confirm-action presentation. */
export const usePreviewDecisionState = ({
  activePreviewResolution,
  activePreviewValidation,
  destinationHotelDisplayName,
  groupPreviewResolution,
  isMatrixBuiltButNoFeasibleSlot,
  isMatrixMissingBlockedState,
  matrixFit,
  matrixRequiresBuild,
  manualPreviewState,
  normalizedDecision,
}: UsePreviewDecisionStateOptions) => {
  const previewValidationReasonText = useMemo(
    () => getPreviewValidationReasonText({
      resolution: activePreviewResolution,
      validation: activePreviewValidation,
      normalizedDecision,
      manualPreviewState,
      groupPreviewResolution,
      matrixFit,
      destinationHotelDisplayName,
      isManualRelaxedRouteFitPolicy,
    }),
    [activePreviewResolution, activePreviewValidation, destinationHotelDisplayName, matrixFit, normalizedDecision, manualPreviewState, groupPreviewResolution],
  );

  const matrixApplyBlocked = useMemo(
    () => isMatrixApplyBlockedUtil({
      normalizedDecision,
      matrixFit,
      matrixRequiresBuild,
      matrixMissingBlocked: isMatrixMissingBlockedState,
      matrixBuiltButNoFeasibleSlot: isMatrixBuiltButNoFeasibleSlot,
      manualPreviewState,
      activePreviewResolution,
      groupPreviewResolution,
      isManualRelaxedRouteFitPolicy,
    }),
    [isMatrixBuiltButNoFeasibleSlot, isMatrixMissingBlockedState, matrixFit, matrixRequiresBuild, normalizedDecision, manualPreviewState, activePreviewResolution, groupPreviewResolution],
  );

  const decisionStatus = useMemo(() => {
    return String(normalizedDecision?.decisionStatus || '').toUpperCase();
  }, [normalizedDecision]);

  const confirmActionConfig = useMemo(() => {
    if (decisionStatus === 'MATRIX_UNAVAILABLE') {
      return { label: 'Build Matrix First', disabled: true };
    }
    if (decisionStatus === 'UNSCHEDULABLE_FOR_DAY') {
      return { label: 'Cannot Add', disabled: true };
    }
    if (decisionStatus === 'OFF_ROUTE' || decisionStatus === 'BACKTRACK') {
      const manualRelaxedRouteFit =
        isManualRelaxedRouteFitPolicy(manualPreviewState)
        || isManualRelaxedRouteFitPolicy(activePreviewResolution)
        || isManualRelaxedRouteFitPolicy(groupPreviewResolution);
      return manualRelaxedRouteFit
        ? { label: 'Confirm Add Hotspot', disabled: false }
        : { label: 'Cannot Add - Off Route', disabled: true };
    }
    if (decisionStatus === 'NEEDS_RESCHEDULE') {
      return { label: 'Add with Reschedule', disabled: false };
    }
    return { label: 'Confirm Add Hotspot', disabled: false };
  }, [decisionStatus, manualPreviewState, activePreviewResolution, groupPreviewResolution]);

  return {
    previewValidationReasonText,
    matrixApplyBlocked,
    decisionStatus,
    confirmActionConfig,
  };
};
