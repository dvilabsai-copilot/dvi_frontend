type AutoPreviewAttempt = Record<string, unknown>;

export function getAutoPreviewRemovedRows(attempt: AutoPreviewAttempt | null | undefined): AutoPreviewAttempt[] {
  const resolution = attempt?.resolution as AutoPreviewAttempt | undefined;
  const changes = attempt?.changesRequiredDisplay as AutoPreviewAttempt | undefined;
  const rows = [
    ...(Array.isArray(attempt?.removedHotspots) ? attempt.removedHotspots : []),
    ...(Array.isArray(resolution?.removedHotspots) ? resolution.removedHotspots : []),
    ...(Array.isArray(changes?.removedItems) ? changes.removedItems : []),
  ].filter((row): row is AutoPreviewAttempt => !!row && typeof row === "object");
  const seen = new Set<number>();
  return rows.filter((row) => {
    const id = Number(row.id || row.hotspotId || row.hotspot_ID || row.hotspot_id || row.locationId || 0);
    if (!(id > 0) || seen.has(id)) return false;
    seen.add(id);
    return true;
  });
}

export function getAutoPreviewHighestRemovedPriority(attempt: AutoPreviewAttempt | null | undefined): number | null {
  const priorities = getAutoPreviewRemovedRows(attempt)
    .map((row) => Number(row.priority || row.hotspotPriority || row.hotspot_priority || row.rawPriority || row.workPriority || 0))
    .filter((priority) => [1, 2, 3].includes(priority));
  return priorities.length > 0 ? Math.min(...priorities) : null;
}

export function scoreAutoPreviewAttempt(attempt: AutoPreviewAttempt): { score: number; reason: string; removedCount: number } {
  const resultType = String(attempt.resultType || "").toUpperCase();
  const removedCount = getAutoPreviewRemovedRows(attempt).length;
  const highestRemovedPriority = getAutoPreviewHighestRemovedPriority(attempt);
  let score = 0;
  let reason = "Cannot fit at this position.";

  if (resultType === "FITS_DIRECTLY" && attempt.canConfirm === true) {
    score = 1000; reason = "Clean fit. No hotspot removal required.";
  } else if (resultType === "FITS_WITH_OPTIONAL_REMOVAL" && attempt.canConfirm === true) {
    score = 800; reason = "Fits with confirmed changes.";
  } else if (resultType === "REQUIRES_P3_CONFIRMATION" && attempt.canConfirm === true) {
    score = 650; reason = "Fits with Priority 3 removal acknowledgement.";
  } else if (resultType === "PRIORITY_CONFLICT") {
    score = 250; reason = "Protected hotspot impact detected.";
  } else if (resultType === "SELECTED_HOTSPOT_CLOSED_AT_ATTEMPTED_TIME") {
    score = 150; reason = "Selected hotspot is closed at attempted time.";
  } else if (attempt.canConfirm === true) {
    score = 500; reason = "Can confirm with warnings.";
  }

  score -= removedCount * 120;
  if (highestRemovedPriority === 1) score -= 400;
  if (highestRemovedPriority === 2) score -= 250;
  if (highestRemovedPriority === 3) score -= 100;
  if (attempt.requiresTimingRiskConfirmation === true) score -= 150;
  if (attempt.requiresPriorityRemovalConfirmation === true) score -= 100;
  if (attempt.selectedOpeningConflict) score -= 150;
  return { score: Math.max(0, score), reason, removedCount };
}
