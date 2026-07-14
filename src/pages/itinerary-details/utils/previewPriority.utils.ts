export function getPendingPriorityReplacementHotspotId(
  resolution: Record<string, unknown> | null | undefined,
  selectedHotspotIds: number[],
  approved: boolean,
): number | null {
  if (approved || !resolution) return null;
  const removedTopPriorityCount = Array.isArray(resolution.removedTopPriorityHotspots)
    ? resolution.removedTopPriorityHotspots.length
    : 0;
  const affectedPriorityCount = Array.isArray(resolution.topPriorityAffected)
    ? resolution.topPriorityAffected.length
    : 0;
  const p3Count = Array.isArray(resolution.p3HotspotsToRemove)
    ? resolution.p3HotspotsToRemove.length
    : 0;
  const needsApproval =
    removedTopPriorityCount > 0 ||
    affectedPriorityCount > 0 ||
    p3Count > 0 ||
    resolution.requiresP3RemovalConfirmation === true ||
    (resolution.validation as Record<string, unknown> | undefined)?.requiresPriorityConfirmation === true;

  if (!needsApproval) return null;
  const fallbackHotspotId = selectedHotspotIds.length > 0
    ? selectedHotspotIds[selectedHotspotIds.length - 1]
    : null;
  return Number.isFinite(Number(fallbackHotspotId)) ? Number(fallbackHotspotId) : null;
}
