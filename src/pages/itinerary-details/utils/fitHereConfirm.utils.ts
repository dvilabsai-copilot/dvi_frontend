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

export interface FitHereConfirmationResultShape {
  confirmedHotspotId: number;
  confirmedRouteId: number;
  persistedTimeline: unknown[];
  insertedRouteHotspotId: number | null;
  removedHotspotIds: number[];
}

export const normalizeFitHereConfirmationResult = (
  confirmResult: unknown,
  selectedAttempt: ManualFitHerePreviewResponse | null,
  selectedFitHotspotId: number | null,
  fallbackRouteId: number | null,
): FitHereConfirmationResultShape => {
  const result = (typeof confirmResult === "object" && confirmResult !== null ? confirmResult : {}) as Record<string, unknown>;
  const resolution = (typeof result.resolution === "object" && result.resolution !== null ? result.resolution : {}) as Record<string, unknown>;
  const confirmedHotspotId = Number(result.selectedHotspotId || selectedAttempt?.selectedHotspotId || selectedFitHotspotId || 0);
  const confirmedRouteId = Number(result.routeId || selectedAttempt?.routeId || fallbackRouteId || 0);
  const persistedTimeline = Array.isArray(result.routeTimeline) ? result.routeTimeline : (Array.isArray(result.fullTimeline) ? result.fullTimeline : []);
  const insertedTimelineRow = persistedTimeline.find((row) => {
    if (typeof row !== "object" || row === null) return false;
    const record = row as Record<string, unknown>;
    return String(record.type || "").toLowerCase() === "attraction"
      && Number(record.hotspotId ?? record.locationId ?? 0) === confirmedHotspotId
      && (record.planOwnWay === true || record.isManual === true);
  });
  const scheduledManualHotspots = Array.isArray(resolution.scheduledManualHotspots) ? resolution.scheduledManualHotspots : [];
  const backendScheduledManualHotspot = scheduledManualHotspots.find((row) => {
    if (typeof row !== "object" || row === null) return false;
    const record = row as Record<string, unknown>;
    return Number(record.hotspotId || record.id || 0) === confirmedHotspotId;
  });
  const getRecordValue = (row: unknown, key: string): unknown => (typeof row === "object" && row !== null ? (row as Record<string, unknown>)[key] : undefined);
  const insertedRouteHotspotId = Number(
    result.routeHotspotId
    || getRecordValue(backendScheduledManualHotspot, "routeHotspotId")
    || getRecordValue(insertedTimelineRow, "routeHotspotId")
    || 0,
  ) || null;
  const removedRows = [
    ...(Array.isArray(selectedAttempt?.removedHotspots) ? selectedAttempt.removedHotspots : []),
    ...(Array.isArray(result.removedHotspots) ? result.removedHotspots : []),
    ...(Array.isArray(resolution.removedHotspots) ? resolution.removedHotspots : []),
    ...(Array.isArray(resolution.removedOptionalHotspots) ? resolution.removedOptionalHotspots : []),
    ...(Array.isArray(resolution.removedTopPriorityHotspots) ? resolution.removedTopPriorityHotspots : []),
  ];
  const removedHotspotIds = Array.from(new Set(removedRows.map((row) => Number(getRecordValue(row, "id") || getRecordValue(row, "hotspotId") || getRecordValue(row, "hotspot_ID") || 0)).filter((id) => id > 0)));
  return { confirmedHotspotId, confirmedRouteId, persistedTimeline, insertedRouteHotspotId, removedHotspotIds };
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
