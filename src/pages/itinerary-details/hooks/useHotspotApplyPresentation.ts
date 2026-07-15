import type { useHotspotPreviewViewModel } from "./useHotspotPreviewViewModel";

type PreviewSnapshot = ReturnType<typeof useHotspotPreviewViewModel>;

type HotspotApplyPresentationOptions = {
  backendForceConflictState: PreviewSnapshot["backendForceConflictState"];
  activePreviewValidation: PreviewSnapshot["activePreviewValidation"];
  matrixApplyBlocked: boolean;
  confirmActionConfig: PreviewSnapshot["confirmActionConfig"];
  isCurrentPreviewAlreadyAdded: boolean;
  isMatrixMissingBlockedState: boolean;
  matrixRequiresBuild: boolean;
  isMatrixBuiltButNoFeasibleSlot: boolean;
  manualPreviewState: unknown;
  activePreviewResolution: unknown;
  groupPreviewResolution: unknown;
  isManualRelaxedRouteFitPolicy: (value: unknown) => boolean;
};

export function useHotspotApplyPresentation({
  backendForceConflictState,
  activePreviewValidation,
  matrixApplyBlocked,
  confirmActionConfig,
  isCurrentPreviewAlreadyAdded,
  isMatrixMissingBlockedState,
  matrixRequiresBuild,
  isMatrixBuiltButNoFeasibleSlot,
  manualPreviewState,
  activePreviewResolution,
  groupPreviewResolution,
  isManualRelaxedRouteFitPolicy,
}: HotspotApplyPresentationOptions) {
  const hotspotForceConflictMode = (
    (backendForceConflictState.canForceConflict || backendForceConflictState.finalConflictModeOnly)
    && activePreviewValidation?.readyToApply === false
    && activePreviewValidation?.requiresPriorityConfirmation !== true
    && !matrixApplyBlocked
  );
  const hotspotEffectiveDecisionBlocked = confirmActionConfig.disabled && !hotspotForceConflictMode;
  const hotspotBlockForValidation = activePreviewValidation?.readyToApply === false && !hotspotForceConflictMode;
  const hotspotApplyLabel = isCurrentPreviewAlreadyAdded
    ? "Added"
    : isMatrixMissingBlockedState || matrixRequiresBuild
      ? "Build matrix from the warning box above"
      : isMatrixBuiltButNoFeasibleSlot && !(
        isManualRelaxedRouteFitPolicy(manualPreviewState)
        || isManualRelaxedRouteFitPolicy(activePreviewResolution)
        || isManualRelaxedRouteFitPolicy(groupPreviewResolution)
      )
        ? "Cannot Add - Off Route"
        : matrixApplyBlocked
          ? "Cannot Apply"
          : activePreviewValidation?.requiresForceConfirmation === true
            ? "Confirm Force Add (Opening / Timing Conflict)"
            : hotspotForceConflictMode
              ? "Confirm Force Add (Conflict)"
              : confirmActionConfig.label;

  return { hotspotForceConflictMode, hotspotEffectiveDecisionBlocked, hotspotBlockForValidation, hotspotApplyLabel };
}

