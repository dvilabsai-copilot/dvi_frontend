import type { ManualFitHerePreviewResponse } from "@/components/itinerary/manual-fit/ManualFitHerePreviewDialog";

export interface FitHereConfirmOptions {
  allowClosedHotspotConflict?: boolean;
  allowTimingRisk?: boolean;
  allowPriorityRemoval?: boolean;
  acknowledgedRemovedHotspotIds?: number[];
}

export interface FitHereConfirmationAnalysis {
  confirmRemovedRows: unknown[];
  acknowledgedRemovedHotspotIds: number[];
  hasTimingRisk: boolean;
  hasPriorityRemoval: boolean;
  hasP3Removal: boolean;
  hasP1P2Removal: boolean;
  selectedOpeningConflict: unknown;
  canForceClosedHotspotConflict: boolean;
  hasUnprovenProtectedRemoval: boolean;
}

export const analyzeFitHereConfirmation = (
  selectedAttempt: ManualFitHerePreviewResponse | null,
  options?: FitHereConfirmOptions,
): FitHereConfirmationAnalysis => {
  const confirmRemovedRows: unknown[] = [
    ...(Array.isArray(selectedAttempt?.removedHotspots) ? selectedAttempt.removedHotspots : []),
    ...(Array.isArray(selectedAttempt?.resolution?.removedHotspots) ? selectedAttempt.resolution.removedHotspots : []),
    ...(Array.isArray(selectedAttempt?.resolution?.removedOptionalHotspots) ? selectedAttempt.resolution.removedOptionalHotspots : []),
    ...(Array.isArray(selectedAttempt?.resolution?.removedTopPriorityHotspots) ? selectedAttempt.resolution.removedTopPriorityHotspots : []),
    ...(Array.isArray(selectedAttempt?.changesRequiredDisplay?.removedItems) ? selectedAttempt.changesRequiredDisplay.removedItems : []),
  ];
  const acknowledgedRemovedHotspotIds = Array.from(new Set(
    (Array.isArray(options?.acknowledgedRemovedHotspotIds) ? options.acknowledgedRemovedHotspotIds : [])
      .map(Number)
      .filter((id) => id > 0),
  ));
  const hasTimingRisk = selectedAttempt?.timingRisk?.type === "PARTIAL_STAY_AFTER_CLOSING" || selectedAttempt?.requiresTimingRiskConfirmation === true;
  const hasPriorityRemoval = confirmRemovedRows.length > 0 || selectedAttempt?.requiresPriorityRemovalConfirmation === true || acknowledgedRemovedHotspotIds.length > 0;
  const getPriority = (row: unknown): number => {
    if (typeof row !== "object" || row === null) return 0;
    const record = row as Record<string, unknown>;
    return Number(record.priority || record.hotspot_priority || record.rawPriority || record.workPriority || 0);
  };
  const hasP3Removal = confirmRemovedRows.some((row) => getPriority(row) === 3);
  const hasP1P2Removal = confirmRemovedRows.some((row) => [1, 2].includes(getPriority(row)));
  const resolution = selectedAttempt?.resolution as Record<string, unknown> | undefined;
  const selectedOpeningConflict = selectedAttempt?.selectedOpeningConflict || resolution?.selectedOpeningConflict || (resolution?.manualInsertionFit as { selectedOpeningConflict?: unknown } | undefined)?.selectedOpeningConflict || null;
  const canForceClosedHotspotConflict = options?.allowClosedHotspotConflict === true || (selectedAttempt?.canForceConflict === true && Boolean(selectedOpeningConflict));
  const hasUnprovenProtectedRemoval = confirmRemovedRows.some((row) => {
    const reasonCode = typeof row === "object" && row !== null ? String((row as Record<string, unknown>).removalReasonCode || "").toUpperCase() : "";
    const priority = getPriority(row);
    return (priority === 1 || priority === 2) && reasonCode === "UNPROVEN_REMOVAL";
  });

  return { confirmRemovedRows, acknowledgedRemovedHotspotIds, hasTimingRisk, hasPriorityRemoval, hasP3Removal, hasP1P2Removal, selectedOpeningConflict, canForceClosedHotspotConflict, hasUnprovenProtectedRemoval };
};

const errorMessage = (error: unknown): string => {
  if (typeof error === "object" && error !== null) {
    const message = (error as { message?: unknown }).message;
    return String(message || "");
  }
  return "";
};

export const isRetryableFitHereConfirmError = (error: unknown): boolean => {
  const message = errorMessage(error);
  return message.includes("Fit Here preview attempt was not found")
    || (message.includes("404") && message.includes("/manual-hotspot/fit-confirm"))
    || (
      message.includes("/manual-hotspot/fit-confirm")
      && message.includes("409")
      && (
        message.includes("Timeline changed after preview")
        || message.includes("cannot be confirmed as a clean fit")
        || message.includes("Fit Here confirm was rejected")
        || message.includes("MANUAL_INSERT_")
        || message.includes("MATRIX_SAFE_")
      )
    );
};

export const extractFitHereConfirmErrorCode = (error: unknown): string => {
  const message = errorMessage(error);
  const codeMatch = message.match(/"code"\s*:\s*"([^"]+)"/i);
  if (codeMatch?.[1]) return String(codeMatch[1]).trim();
  const fallbackMatch = message.match(/MANUAL_INSERT_[A-Z0-9_]+/i);
  return fallbackMatch?.[0] ? String(fallbackMatch[0]).trim() : "";
};

export const isExpiredOrMissingFitHereAttemptError = (error: unknown): boolean => {
  const message = errorMessage(error);
  return message.includes("Fit Here preview attempt was not found")
    || message.includes("Fit Here preview attempt expired")
    || (message.includes("/manual-hotspot/fit-confirm") && message.includes("409") && message.includes("preview attempt expired"));
};
