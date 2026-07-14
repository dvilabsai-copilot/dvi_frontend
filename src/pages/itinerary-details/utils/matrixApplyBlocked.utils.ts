export function isMatrixApplyBlocked(options: {
  normalizedDecision: Record<string, unknown> | null | undefined;
  matrixFit: Record<string, unknown> | null | undefined;
  matrixRequiresBuild: boolean;
  matrixMissingBlocked: boolean;
  matrixBuiltButNoFeasibleSlot: boolean;
  manualPreviewState: unknown;
  activePreviewResolution: unknown;
  groupPreviewResolution: unknown;
  isManualRelaxedRouteFitPolicy: (value: unknown) => boolean;
}): boolean {
  const decisionStatus = String(options.normalizedDecision?.decisionStatus || "").toUpperCase();
  if (decisionStatus === "UNSCHEDULABLE_FOR_DAY" || decisionStatus === "MATRIX_UNAVAILABLE") return true;
  if (!options.matrixFit) return false;

  const manualRelaxedRouteFit = options.isManualRelaxedRouteFitPolicy(options.manualPreviewState)
    || options.isManualRelaxedRouteFitPolicy(options.activePreviewResolution)
    || options.isManualRelaxedRouteFitPolicy(options.groupPreviewResolution);
  if (options.matrixFit.destinationInsertionMode === true) return options.matrixFit.canApply === false;

  const canBypass = manualRelaxedRouteFit && options.matrixBuiltButNoFeasibleSlot;
  return options.matrixMissingBlocked
    || (!manualRelaxedRouteFit && options.matrixBuiltButNoFeasibleSlot)
    || (options.matrixFit.canApply === false && !canBypass);
}
