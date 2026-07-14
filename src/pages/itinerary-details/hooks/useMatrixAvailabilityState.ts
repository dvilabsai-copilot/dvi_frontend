/* eslint-disable @typescript-eslint/no-explicit-any */
import { useMemo } from "react";

type UseMatrixAvailabilityStateOptions = {
  activePreviewResolution: any;
  activePreviewValidation: any;
  groupPreviewResolution: any;
  isDestinationSideManualPreview: boolean;
  matrixFit: any;
  matrixFitAlreadyHasUsableData: boolean;
  normalizedDecision: any;
};

/** Derives matrix-required, missing, infeasible, and build-button states for hotspot preview. */
export const useMatrixAvailabilityState = ({
  activePreviewResolution,
  activePreviewValidation,
  groupPreviewResolution,
  isDestinationSideManualPreview,
  matrixFit,
  matrixFitAlreadyHasUsableData,
  normalizedDecision,
}: UseMatrixAvailabilityStateOptions) => {
  const matrixRequiresBuild = useMemo(() => {
    if (!matrixFit) return false;
    if (isDestinationSideManualPreview) return false;
    if (matrixFit?.destinationInsertionMode === true) return false;
    if (matrixFit?.singleHotspotInsertionMode === true) return false;
    if (matrixFit?.emptyRouteInsertionMode === true) return false;

    const chosenRouteFitType = String(matrixFit?.chosenSlot?.routeFitType || '').toUpperCase();
    if (chosenRouteFitType === 'SINGLE_HOTSPOT_BEFORE' || chosenRouteFitType === 'SINGLE_HOTSPOT_AFTER') {
      return false;
    }

    return matrixFit?.requiresMatrixBuild === true || matrixFit?.routeFitAvailable === false;
  }, [isDestinationSideManualPreview, matrixFit]);

  const isMatrixMissingBlockedState = useMemo(() => {
    if (isDestinationSideManualPreview) {
      return false;
    }

    const matrixCode = String(matrixFit?.code || '').toUpperCase();
    const previewCode = String((activePreviewResolution as any)?.code || '').toUpperCase();
    const previewBlockReason = String((activePreviewResolution as any)?.previewBlockReason || '').toUpperCase();
    const validationReason = String(activePreviewValidation?.reason || '').toUpperCase();

    const matrixAlreadyBuiltButNotFeasible =
      matrixCode === 'MANUAL_HOTSPOT_NO_FEASIBLE_ROUTE_SLOT'
      || previewCode === 'MANUAL_HOTSPOT_NO_FEASIBLE_ROUTE_SLOT'
      || previewBlockReason === 'NO_FEASIBLE_ROUTE_SLOT'
      || validationReason === 'NO_FEASIBLE_ROUTE_SLOT'
      || (
        matrixFit?.requiresMatrixBuild !== true
        && matrixFit?.hasAnyMatrixData === true
        && matrixFit?.hasFeasibleMatrixSlot === false
      );

    if (matrixAlreadyBuiltButNotFeasible) {
      return false;
    }

    if (matrixFitAlreadyHasUsableData) {
      return false;
    }

    const decisionStatus = String(normalizedDecision?.decisionStatus || '').toUpperCase();

    const previewSaysMatrixMissing =
      validationReason === 'MATRIX_DATA_MISSING'
      || decisionStatus === 'MATRIX_UNAVAILABLE'
      || previewCode === 'MANUAL_HOTSPOT_MATRIX_DATA_MISSING'
      || previewCode === 'MATRIX_DATA_MISSING'
      || previewBlockReason === 'MATRIX_MISSING'
      || String((groupPreviewResolution as any)?.code || '').toUpperCase() === 'MANUAL_HOTSPOT_MATRIX_DATA_MISSING'
      || String((groupPreviewResolution as any)?.code || '').toUpperCase() === 'MATRIX_DATA_MISSING'
      || String((groupPreviewResolution as any)?.previewBlockReason || '').toUpperCase() === 'MATRIX_MISSING';

    if (!matrixFit) return previewSaysMatrixMissing;

    if (matrixFit?.destinationInsertionMode === true && !previewSaysMatrixMissing) {
      return false;
    }

    return (
      matrixFit?.requiresMatrixBuild === true
      || matrixCode === 'MANUAL_HOTSPOT_MATRIX_DATA_MISSING'
      || matrixCode === 'MATRIX_DATA_MISSING'
      || previewSaysMatrixMissing
    );
  }, [
    activePreviewResolution,
    activePreviewValidation?.reason,
    groupPreviewResolution,
    isDestinationSideManualPreview,
    matrixFit,
    matrixFitAlreadyHasUsableData,
    normalizedDecision,
  ]);

  const isMatrixBuiltButNoFeasibleSlot = useMemo(() => {
    if (isDestinationSideManualPreview) {
      return false;
    }

    const previewCode = String((activePreviewResolution as any)?.code || '').toUpperCase();
    const unscheduledReason = String(
      (activePreviewResolution as any)?.resolution?.unscheduledManualHotspots?.[0]?.reason
      || (activePreviewResolution as any)?.unscheduledManualHotspots?.[0]?.reason
      || '',
    ).toUpperCase();

    const schedulerProducedFinalFitFailure =
      previewCode === 'MANUAL_HOTSPOT_CANNOT_FIT'
      || unscheduledReason.includes('OPENING HOURS')
      || unscheduledReason.includes('ROUTE TIME WINDOW');

    if (schedulerProducedFinalFitFailure) {
      return false;
    }

    return (
      matrixFit?.code === 'MANUAL_HOTSPOT_NO_FEASIBLE_ROUTE_SLOT'
      || (activePreviewResolution as any)?.code === 'MANUAL_HOTSPOT_NO_FEASIBLE_ROUTE_SLOT'
      || (activePreviewResolution as any)?.previewBlockReason === 'NO_FEASIBLE_ROUTE_SLOT'
      || (groupPreviewResolution as any)?.code === 'MANUAL_HOTSPOT_NO_FEASIBLE_ROUTE_SLOT'
      || (groupPreviewResolution as any)?.previewBlockReason === 'NO_FEASIBLE_ROUTE_SLOT'
      || (
        matrixFit?.requiresMatrixBuild !== true
        && matrixFit?.hasAnyMatrixData === true
        && matrixFit?.hasFeasibleMatrixSlot === false
      )
    );
  }, [activePreviewResolution, groupPreviewResolution, isDestinationSideManualPreview, matrixFit]);

  const shouldShowBuildMatrixButton = useMemo(() => {
    if (isDestinationSideManualPreview) {
      return false;
    }

    if (isMatrixBuiltButNoFeasibleSlot) {
      return false;
    }

    if (matrixFitAlreadyHasUsableData) {
      return false;
    }

    const validationReason = String(activePreviewValidation?.reason || '').toUpperCase();
    const decisionStatus = String(normalizedDecision?.decisionStatus || '').toUpperCase();

    return (
      isMatrixMissingBlockedState
      || validationReason === 'MATRIX_DATA_MISSING'
      || decisionStatus === 'MATRIX_UNAVAILABLE'
      || (activePreviewResolution as any)?.canBuildMatrix === true
      || (matrixFit as any)?.canBuildMatrix === true
      || String((activePreviewResolution as any)?.code || '').toUpperCase() === 'MANUAL_HOTSPOT_MATRIX_DATA_MISSING'
      || String((activePreviewResolution as any)?.code || '').toUpperCase() === 'MATRIX_DATA_MISSING'
      || String((activePreviewResolution as any)?.previewBlockReason || '').toUpperCase() === 'MATRIX_MISSING'
    );
  }, [
    activePreviewResolution,
    activePreviewValidation?.reason,
    isDestinationSideManualPreview,
    isMatrixBuiltButNoFeasibleSlot,
    isMatrixMissingBlockedState,
    matrixFitAlreadyHasUsableData,
    matrixFit,
    normalizedDecision,
  ]);

  return {
    matrixRequiresBuild,
    isMatrixMissingBlockedState,
    isMatrixBuiltButNoFeasibleSlot,
    shouldShowBuildMatrixButton,
  };
};
