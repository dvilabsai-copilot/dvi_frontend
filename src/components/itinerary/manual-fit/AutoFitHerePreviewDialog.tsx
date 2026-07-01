import React from "react";
import { AlertTriangle, CheckCircle2, Loader2, MapPin, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  ManualFitHerePreviewResponse,
  ManualFitHereResultType,
} from "./ManualFitHerePreviewDialog";

type AutoFitHerePreviewResultRow = {
  anchorKey: string;
  anchor?: {
    anchorIntent?: "AFTER_START" | "AFTER_ATTRACTION";
    anchorIndex?: number;
    anchorFrom?: string | null;
    anchorTo?: string | null;
    anchorLabel?: string | null;
    beforeHotspotId?: number | null;
    afterHotspotId?: number | null;
  } | null;
  attempt?: ManualFitHerePreviewResponse | null;
  status?: "COMPLETED" | "FAILED";
  score?: number;
  rankReason?: string;
  removedCount?: number;
  error?: string;
};

type AutoFitHerePreviewDialogProps = {
  open: boolean;
  loading?: boolean;
  failedReason?: string | null;
  results: AutoFitHerePreviewResultRow[];
  selectedAnchorKey: string | null;
  selectedHotspot?: any | null;
  onClose: () => void;
  onSelectAnchorKey: (anchorKey: string) => void;
  onConfirm: (
    options: {
      allowTimingRisk?: boolean;
      acknowledgedRemovedHotspotIds?: number[];
    },
    attempt: ManualFitHerePreviewResponse | null,
  ) => void;
  confirmLoading?: boolean;
};

const AUTO_PREVIEW_LOADING_STEPS = [
  "Reading current itinerary timeline",
  "Checking selected hotspot details",
  "Checking insertion position",
  "Calculating travel from previous stop",
  "Calculating travel to next stop",
  "Checking arrival time",
  "Checking opening and closing hours",
  "Checking Priority protection",
  "Checking optional hotspot removal options",
  "Building proposed timeline preview",
];

const getTimelineRowName = (row: any): string =>
  String(
    row?.name ||
      row?.title ||
      row?.text ||
      row?.hotspotName ||
      row?.description ||
      row?.hotelName ||
      "Row",
  ).trim();

const getTimelineRowTime = (row: any): string =>
  String(
    row?.timeRange ||
      row?.visitTime ||
      row?.time ||
      "",
  ).trim();

const formatClockLabel = (value: unknown): string => {
  const raw = String(value || "").trim();
  if (!raw) return "";
  if (/[AP]M/i.test(raw)) return raw.toUpperCase();

  const match = raw.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
  if (!match) return raw;

  const hours24 = Number(match[1] || 0);
  const minutes = String(match[2] || "00");
  const suffix = hours24 >= 12 ? "PM" : "AM";
  const hours12 = hours24 % 12 || 12;
  return `${String(hours12).padStart(2, "0")}:${minutes} ${suffix}`;
};

const formatOperatingHoursLabel = (value: unknown): string => {
  const raw = String(value || "").trim();
  if (!raw) return "";

  if (raw.includes(" - ")) {
    const [start, end] = raw.split(" - ");
    return `${formatClockLabel(start)} - ${formatClockLabel(end)}`;
  }

  return formatClockLabel(raw);
};

const getTimelineRowOperatingHours = (row: any): string => {
  const directOperatingHours = String(
    row?.operatingHours ||
      row?.timings ||
      row?.hotspot_timings ||
      "",
  ).trim();

  if (directOperatingHours) {
    return formatOperatingHoursLabel(directOperatingHours);
  }

  if (row?.openingTime && row?.closingTime) {
    return `${formatClockLabel(row.openingTime)} - ${formatClockLabel(row.closingTime)}`;
  }

  return "";
};

const getTimelineRows = (attempt: ManualFitHerePreviewResponse | null): any[] => {
  const hasExactAnchorMismatch =
    attempt?.selectedAnchorPreserved === false ||
    String(attempt?.exactAnchorMismatch?.message || "").trim().length > 0;

  if (hasExactAnchorMismatch) {
    const dayEndRemovalPlan =
      attempt?.resolution?.manualInsertionFit?.lowPriorityRemovalPlanPreview ||
      (attempt as any)?.manualInsertionFit?.lowPriorityRemovalPlanPreview ||
      null;
    const openingHoursRemovalPlan =
      attempt?.resolution?.manualInsertionFit?.lowPriorityOpeningHoursRemovalPlanPreview ||
      attempt?.resolution?.lowPriorityOpeningHoursRemovalPlanPreview ||
      (attempt as any)?.manualInsertionFit?.lowPriorityOpeningHoursRemovalPlanPreview ||
      null;
    const rescueAttempts = [
      ...(Array.isArray(dayEndRemovalPlan?.simulationAttempts) ? dayEndRemovalPlan.simulationAttempts : []),
      ...(Array.isArray(dayEndRemovalPlan?.rejectedAttempts) ? dayEndRemovalPlan.rejectedAttempts : []),
      ...(Array.isArray(openingHoursRemovalPlan?.simulationAttempts) ? openingHoursRemovalPlan.simulationAttempts : []),
      ...(Array.isArray(openingHoursRemovalPlan?.rejectedAttempts) ? openingHoursRemovalPlan.rejectedAttempts : []),
    ];
    const preferredRescueAttempt =
      rescueAttempts.find((attemptRow: any) => attemptRow?.resolved === true || attemptRow?.valid === true)
      || rescueAttempts[rescueAttempts.length - 1]
      || null;
    const rescueTimeline = preferredRescueAttempt?.previewTimelineDisplay
      || preferredRescueAttempt?.displayTimeline
      || preferredRescueAttempt?.previewTimeline
      || [];

    if (Array.isArray(rescueTimeline) && rescueTimeline.length > 0) {
      return rescueTimeline;
    }
  }

  if (Array.isArray(attempt?.finalizedTimeline) && attempt.finalizedTimeline.length > 0) {
    return attempt.finalizedTimeline;
  }

  return Array.isArray(attempt?.proposedTimeline) ? attempt.proposedTimeline : [];
};

const getRowHotspotId = (row: any): number =>
  Number(row?.hotspotId || row?.hotspot_ID || row?.hotspot_id || row?.locationId || row?.id || 0);

const dedupeRemovalRows = (rows: any[]): any[] => {
  const seen = new Set<number>();

  return (Array.isArray(rows) ? rows : []).filter((row: any) => {
    const hotspotId = getRowHotspotId(row);
    if (!hotspotId || seen.has(hotspotId)) return false;
    seen.add(hotspotId);
    return true;
  });
};

const isProvenRemoval = (row: any): boolean => {
  const hotspotId = getRowHotspotId(row);
  const reasonCode = String(row?.removalReasonCode || row?.reasonCode || "").toUpperCase();
  const attemptedTimelineSource = String(row?.attemptedTimelineSource || "").toUpperCase();

  if (!hotspotId) return false;
  if (reasonCode === "UNPROVEN_REMOVAL") return false;
  if (reasonCode.includes("FAILED")) return false;
  if (attemptedTimelineSource === "FAILED_BEFORE_REMOVAL") return false;
  if (row?.unprovenRemoval === true) return false;
  return true;
};

const parseFitPreviewTimeToMinutes = (value: string): number | null => {
  const raw = String(value || "").trim();
  const twelveHourMatch = raw.match(/^(\d{1,2})(?::(\d{2}))?\s*(AM|PM)$/i);
  if (twelveHourMatch) {
    let hour = Number(twelveHourMatch[1]);
    const minute = Number(twelveHourMatch[2] || 0);
    const meridiem = String(twelveHourMatch[3]).toUpperCase();

    if (!Number.isFinite(hour) || !Number.isFinite(minute)) return null;
    if (hour < 1 || hour > 12 || minute < 0 || minute > 59) return null;

    if (meridiem === "AM" && hour === 12) hour = 0;
    if (meridiem === "PM" && hour !== 12) hour += 12;

    return hour * 60 + minute;
  }

  const twentyFourHourMatch = raw.match(/^(\d{1,2})(?::(\d{2}))(?::(\d{2}))?$/);
  if (!twentyFourHourMatch) return null;

  const hour = Number(twentyFourHourMatch[1]);
  const minute = Number(twentyFourHourMatch[2] || 0);
  if (!Number.isFinite(hour) || !Number.isFinite(minute)) return null;
  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return null;
  return hour * 60 + minute;
};

const extractFitPreviewWindows = (value: any): Array<{
  startLabel: string;
  endLabel: string;
  startMinutes: number;
  endMinutes: number;
}> => {
  const raw = String(value || "")
    .replace(/\u2013|\u2014/g, "-")
    .replace(/\s+/g, " ")
    .trim();

  const regex = /(\d{1,2}:\d{2}(?::\d{2})?\s*(?:AM|PM)?)\s*(?:-|to)\s*(\d{1,2}:\d{2}(?::\d{2})?\s*(?:AM|PM)?)/gi;
  const windows: Array<{
    startLabel: string;
    endLabel: string;
    startMinutes: number;
    endMinutes: number;
  }> = [];

  let match: RegExpExecArray | null;
  while ((match = regex.exec(raw)) !== null) {
    const startLabel = match[1].trim();
    const endLabel = match[2].trim();
    const startMinutes = parseFitPreviewTimeToMinutes(startLabel);
    const endMinutes = parseFitPreviewTimeToMinutes(endLabel);

    if (startMinutes === null || endMinutes === null) continue;

    windows.push({
      startLabel,
      endLabel,
      startMinutes,
      endMinutes,
    });
  }

  return windows;
};

const buildClientSelectedOpeningConflict = (
  attempt: ManualFitHerePreviewResponse | null,
  timeline: any[],
): any | null => {
  if (
    attempt?.canConfirm === true &&
    (
      attempt?.resultType === "FITS_DIRECTLY" ||
      attempt?.resultType === "FITS_WITH_OPTIONAL_REMOVAL"
    )
  ) {
    return null;
  }

  const selectedHotspotId = Number(attempt?.selectedHotspotId || 0);
  if (!selectedHotspotId || !Array.isArray(timeline)) return null;

  const selectedRow = timeline.find((row: any) => {
    const isAttraction =
      String(row?.type || "").toLowerCase() === "attraction" ||
      Number(row?.item_type || 0) === 4;
    return isAttraction && getRowHotspotId(row) === selectedHotspotId;
  });

  if (!selectedRow) return null;

  const attemptedVisitTime = String(
    selectedRow?.timeRange ||
    selectedRow?.visitTime ||
    "",
  ).trim();

  const operatingHours = String(
    selectedRow?.operatingHours ||
    selectedRow?.timings ||
    selectedRow?.hotspot_timings ||
    "",
  ).trim();

  if (
    !attemptedVisitTime ||
    !operatingHours ||
    /not available/i.test(operatingHours) ||
    /open\s*24/i.test(operatingHours)
  ) {
    return null;
  }

  if (/^closed$/i.test(operatingHours)) {
    return {
      hotspotId: selectedHotspotId,
      hotspotName: getTimelineRowName(selectedRow),
      attemptedVisitTime,
      operatingHours,
      reason: `${getTimelineRowName(selectedRow)} is closed on this route date.`,
      reasonCode: "CLIENT_SELECTED_HOTSPOT_CLOSED_AT_ATTEMPTED_TIME",
    };
  }

  const attempted = extractFitPreviewWindows(attemptedVisitTime)[0] || null;
  const operatingWindows = extractFitPreviewWindows(operatingHours);

  if (!attempted || operatingWindows.length === 0) return null;

  const fits = operatingWindows.some((operating) => (
    attempted.startMinutes >= operating.startMinutes &&
    attempted.endMinutes <= operating.endMinutes
  ));

  if (fits) return null;

  const operating = operatingWindows[0];

  return {
    hotspotId: selectedHotspotId,
    hotspotName: getTimelineRowName(selectedRow),
    attemptedVisitTime,
    attemptedStartTime: attempted.startLabel,
    attemptedEndTime: attempted.endLabel,
    operatingHours,
    openingTime: operating.startLabel,
    closingTime: operating.endLabel,
    reason: `${getTimelineRowName(selectedRow)} cannot be inserted at ${attemptedVisitTime}. Operating hours are ${operatingHours}.`,
    reasonCode: "CLIENT_SELECTED_HOTSPOT_CLOSED_AT_ATTEMPTED_TIME",
  };
};

const getRemovedItems = (attempt: ManualFitHerePreviewResponse | null): Array<{
  hotspotId: number;
  name: string;
  workPriority: number | null;
  reason: string | null;
}> => {
  const fromChanges = Array.isArray(attempt?.changesRequiredDisplay?.removedItems)
    ? attempt?.changesRequiredDisplay?.removedItems
    : [];
  const fromRemovedHotspots = Array.isArray(attempt?.removedHotspots)
    ? attempt.removedHotspots
    : [];
  const fromResolution = Array.isArray(attempt?.resolution?.removedHotspots)
    ? attempt.resolution.removedHotspots
    : [];
  const rows = fromChanges.length > 0 ? fromChanges : [...fromRemovedHotspots, ...fromResolution];
  const seen = new Set<number>();

  return rows
    .map((row: any) => {
      const hotspotId = Number(row?.hotspotId || row?.id || row?.hotspot_ID || row?.hotspot_id || row?.locationId || 0);
      return {
        hotspotId,
        name: String(row?.name || row?.hotspotName || row?.title || `Hotspot #${hotspotId}`).trim(),
        workPriority: Number(row?.workPriority || row?.priority || row?.hotspotPriority || row?.hotspot_priority || row?.rawPriority || 0) || null,
        reason: typeof row?.reason === "string" ? row.reason : null,
      };
    })
    .filter((row) => row.hotspotId > 0)
    .filter((row) => {
      if (seen.has(row.hotspotId)) return false;
      seen.add(row.hotspotId);
      return true;
    });
};

const getAttemptRemovedItems = (attemptRow: any): Array<{
  hotspotId: number;
  name: string;
  workPriority: number | null;
  reason: string | null;
}> => {
  const ids = Array.isArray(attemptRow?.removedHotspotIds)
    ? attemptRow.removedHotspotIds.map((id: any) => Number(id)).filter((id: number) => id > 0)
    : [];
  const names = Array.isArray(attemptRow?.removedHotspotNames) ? attemptRow.removedHotspotNames : [];
  const priorities = Array.isArray(attemptRow?.priorities) ? attemptRow.priorities : [];

  return ids.map((hotspotId: number, index: number) => ({
    hotspotId,
    name: String(names[index] || `Hotspot #${hotspotId}`),
    workPriority: Number(priorities[index] || 0) || null,
    reason:
      typeof attemptRow?.message === "string" && attemptRow.message.trim()
        ? attemptRow.message
        : typeof attemptRow?.reason === "string" && attemptRow.reason.trim()
          ? attemptRow.reason
          : null,
  }));
};

const getAnchorLabel = (row: AutoFitHerePreviewResultRow): string => {
  const explicitLabel = String(row?.anchor?.anchorLabel || "").trim();
  if (explicitLabel) return explicitLabel;

  if (String(row?.anchor?.anchorIntent || "").toUpperCase() === "AFTER_START") {
    return "Before first attraction";
  }

  const from = String(row?.anchor?.anchorFrom || "").trim();
  return from ? `After ${from}` : "After attraction";
};

const getResultConfig = (resultType?: ManualFitHereResultType) => {
  switch (resultType) {
    case "FITS_DIRECTLY":
      return {
        badge: "Can Fit Directly",
        wrapperClass: "border-emerald-200 bg-emerald-50 text-emerald-900",
        badgeClass: "bg-emerald-700 text-white",
      };
    case "FITS_WITH_OPTIONAL_REMOVAL":
      return {
        badge: "Can Fit With Changes",
        wrapperClass: "border-emerald-200 bg-emerald-50 text-emerald-900",
        badgeClass: "bg-emerald-700 text-white",
      };
    case "REQUIRES_P3_CONFIRMATION":
      return {
        badge: "Needs Confirmation",
        wrapperClass: "border-amber-200 bg-amber-50 text-amber-900",
        badgeClass: "bg-amber-600 text-white",
      };
    case "PRIORITY_CONFLICT":
      return {
        badge: "Priority Conflict",
        wrapperClass: "border-red-200 bg-red-50 text-red-900",
        badgeClass: "bg-red-600 text-white",
      };
    case "CONFLICT_ONLY":
      return {
        badge: "Conflict Only",
        wrapperClass: "border-red-200 bg-red-50 text-red-900",
        badgeClass: "bg-red-600 text-white",
      };
    case "SELECTED_HOTSPOT_CLOSED_AT_ATTEMPTED_TIME":
      return {
        badge: "Closed At Attempted Time",
        wrapperClass: "border-red-200 bg-red-50 text-red-900",
        badgeClass: "bg-red-600 text-white",
      };
    default:
      return {
        badge: "Cannot Fit",
        wrapperClass: "border-slate-200 bg-slate-50 text-slate-800",
        badgeClass: "bg-slate-700 text-white",
      };
  }
};

const getFitHereResultMessage = (attempt: ManualFitHerePreviewResponse | null): string => {
  if (!attempt) return "";
  const exactAnchorMismatchMessage = String(attempt?.exactAnchorMismatch?.message || "").trim();
  if (exactAnchorMismatchMessage) {
    return exactAnchorMismatchMessage;
  }

  switch (attempt.resultType) {
    case "FITS_DIRECTLY":
      return "This hotspot fits at the selected position without removing any existing hotspot.";
    case "FITS_WITH_OPTIONAL_REMOVAL":
    case "REQUIRES_P3_CONFIRMATION":
      return "This hotspot can fit here, but the following optional/lower-priority hotspots must be removed.";
    case "PRIORITY_CONFLICT":
      return "This hotspot cannot fit here without affecting priority hotspots.";
    case "SELECTED_HOTSPOT_CLOSED_AT_ATTEMPTED_TIME":
      return "This hotspot cannot be inserted at the attempted time because it is outside operating hours.";
    case "CANNOT_FIT":
    case "CONFLICT_ONLY":
    default:
      return "This hotspot cannot fit at this position because of timing, opening-hour, or route-window constraints.";
  }
};

const deriveAutoPreviewAttemptState = (
  row: AutoFitHerePreviewResultRow | null,
): {
  timelineRows: any[];
  removedRows: any[];
  displayedRemovedItems: Array<{
    hotspotId: number;
    name: string;
    workPriority: number | null;
    reason: string | null;
  }>;
  selectedOpeningConflict: any | null;
  hasUnprovenProtectedRemoval: boolean;
  hasUnauthorizedP3Removal: boolean;
  hasUnauthorizedProtectedRemoval: boolean;
  isSelectedClosedAtAttemptedTime: boolean;
  canConfirm: boolean;
  rescueAttemptUsed: boolean;
  summary: string;
  badgeText: string;
  badgeTone: "success" | "warning" | "danger" | "neutral";
} => {
  const attempt = (row?.attempt || null) as ManualFitHerePreviewResponse | null;
  const timelineRows = getTimelineRows(attempt);
  const backendSelectedOpeningConflict =
    attempt?.selectedOpeningConflict ||
    attempt?.resolution?.selectedOpeningConflict ||
    attempt?.resolution?.manualInsertionFit?.selectedOpeningConflict ||
    null;
  const clientSelectedOpeningConflict = buildClientSelectedOpeningConflict(attempt, timelineRows);
  const selectedOpeningConflict =
    backendSelectedOpeningConflict ||
    clientSelectedOpeningConflict ||
    null;
  const removedRows = dedupeRemovalRows([
    ...(Array.isArray(attempt?.removedHotspots) ? attempt.removedHotspots.filter(isProvenRemoval) : []),
    ...(Array.isArray(attempt?.resolution?.removedHotspots) ? attempt.resolution.removedHotspots.filter(isProvenRemoval) : []),
    ...(Array.isArray(attempt?.resolution?.removedOptionalHotspots) ? attempt.resolution.removedOptionalHotspots.filter(isProvenRemoval) : []),
    ...(Array.isArray(attempt?.resolution?.removedTopPriorityHotspots) ? attempt.resolution.removedTopPriorityHotspots.filter(isProvenRemoval) : []),
    ...(Array.isArray(attempt?.resolution?.manualInsertionFit?.removedLowPriorityHotspots)
      ? attempt.resolution.manualInsertionFit.removedLowPriorityHotspots.filter(isProvenRemoval)
      : []),
    ...(Array.isArray((attempt as any)?.manualInsertionFit?.removedLowPriorityHotspots)
      ? (attempt as any).manualInsertionFit.removedLowPriorityHotspots.filter(isProvenRemoval)
      : []),
  ]);
  const changesRequiredDisplay =
    (attempt as any)?.changesRequiredDisplay ||
    attempt?.resolution?.changesRequiredDisplay ||
    null;
  const dayEndRemovalPlan =
    attempt?.resolution?.manualInsertionFit?.lowPriorityRemovalPlanPreview ||
    (attempt as any)?.manualInsertionFit?.lowPriorityRemovalPlanPreview ||
    null;
  const openingHoursRemovalPlan =
    attempt?.resolution?.manualInsertionFit?.lowPriorityOpeningHoursRemovalPlanPreview ||
    attempt?.resolution?.lowPriorityOpeningHoursRemovalPlanPreview ||
    (attempt as any)?.manualInsertionFit?.lowPriorityOpeningHoursRemovalPlanPreview ||
    null;
  const dayEndSimulationAttempts = Array.isArray(dayEndRemovalPlan?.simulationAttempts)
    ? dayEndRemovalPlan.simulationAttempts
    : [];
  const dayEndRejectedAttempts = Array.isArray(dayEndRemovalPlan?.rejectedAttempts)
    ? dayEndRemovalPlan.rejectedAttempts
    : [];
  const openingHoursSimulationAttempts = Array.isArray(openingHoursRemovalPlan?.simulationAttempts)
    ? openingHoursRemovalPlan.simulationAttempts
    : [];
  const openingHoursRejectedAttempts = Array.isArray(openingHoursRemovalPlan?.rejectedAttempts)
    ? openingHoursRemovalPlan.rejectedAttempts
    : [];
  const rescueAttempts = [
    ...dayEndSimulationAttempts,
    ...dayEndRejectedAttempts,
    ...openingHoursSimulationAttempts,
    ...openingHoursRejectedAttempts,
  ].filter((attemptRow: any, index: number, list: any[]) => {
    const key = JSON.stringify({
      attemptNumber: attemptRow?.attemptNumber || index,
      removedHotspotIds: attemptRow?.removedHotspotIds || [],
      validationMode: attemptRow?.validationMode || "",
    });
    return list.findIndex((candidate: any, candidateIndex: number) => JSON.stringify({
      attemptNumber: candidate?.attemptNumber || candidateIndex,
      removedHotspotIds: candidate?.removedHotspotIds || [],
      validationMode: candidate?.validationMode || "",
    }) === key) === index;
  });
  const successfulRescueAttempt = rescueAttempts.find((attemptRow: any) => (
    attemptRow?.resolved === true || attemptRow?.valid === true
  )) || null;
  const preferredRescueAttempt =
    successfulRescueAttempt ||
    rescueAttempts[rescueAttempts.length - 1] ||
    null;
  const removedItemsFromRows = removedRows.map((candidate: any) => {
    const hotspotId = Number(candidate?.id || candidate?.hotspotId || candidate?.hotspot_ID || candidate?.hotspot_id || 0);
    return {
      hotspotId,
      name: getTimelineRowName(candidate),
      workPriority: Number(candidate?.priority || candidate?.hotspotPriority || candidate?.hotspot_priority || candidate?.rawPriority || 0) || null,
      reason: candidate?.reason || null,
    };
  });
  const rescueAttemptRemovedItems = preferredRescueAttempt
    ? getAttemptRemovedItems(preferredRescueAttempt)
    : [];
  const displayedRemovedItems = (
    Array.isArray(changesRequiredDisplay?.removedItems) && changesRequiredDisplay.removedItems.length > 0
      ? changesRequiredDisplay.removedItems
      : removedItemsFromRows.length > 0
        ? removedItemsFromRows
        : rescueAttemptRemovedItems
  )
    .map((candidate: any) => ({
      hotspotId: Number(candidate?.hotspotId || candidate?.id || 0),
      name: String(candidate?.name || candidate?.hotspotName || candidate?.title || "").trim(),
      workPriority: Number(candidate?.workPriority || candidate?.priority || candidate?.hotspotPriority || candidate?.hotspot_priority || candidate?.rawPriority || 0) || null,
      reason: typeof candidate?.reason === "string" ? candidate.reason : null,
    }))
    .filter((candidate: any, index: number, list: any[]) => {
      if (!(candidate.hotspotId > 0)) return false;
      return list.findIndex((inner: any) => inner.hotspotId === candidate.hotspotId) === index;
    });
  const hasUnprovenProtectedRemoval = removedRows.some((candidate: any) => {
    const priority = Number(candidate?.priority || candidate?.hotspot_priority || candidate?.rawPriority || 0);
    const reasonCode = String(candidate?.removalReasonCode || "").toUpperCase();
    return (priority === 1 || priority === 2) && reasonCode === "UNPROVEN_REMOVAL";
  });
  const hasUnauthorizedP3Removal = removedRows.some((candidate: any) => {
    const priority = Number(candidate?.priority || candidate?.hotspot_priority || candidate?.rawPriority || 0);
    return priority === 3 && attempt?.removalPolicy?.allowP3Removal !== true;
  });
  const hasUnauthorizedProtectedRemoval = removedRows.some((candidate: any) => {
    const priority = Number(candidate?.priority || candidate?.hotspot_priority || candidate?.rawPriority || 0);
    return (priority === 1 || priority === 2) && attempt?.removalPolicy?.allowP1P2Removal !== true;
  });
  const isSelectedClosedAtAttemptedTime =
    attempt?.resultType === "SELECTED_HOTSPOT_CLOSED_AT_ATTEMPTED_TIME" ||
    !!selectedOpeningConflict;
  const canConfirm =
    row?.status === "COMPLETED" &&
    attempt?.canConfirm === true &&
    !hasUnprovenProtectedRemoval &&
    !hasUnauthorizedP3Removal &&
    !hasUnauthorizedProtectedRemoval &&
    !isSelectedClosedAtAttemptedTime;
  const rescueAttemptUsed =
    displayedRemovedItems.length > 0 &&
    removedItemsFromRows.length === 0 &&
    (!Array.isArray(changesRequiredDisplay?.removedItems) || changesRequiredDisplay.removedItems.length === 0) &&
    rescueAttemptRemovedItems.length > 0;
  let badgeText = "Cannot fit";
  let badgeTone: "success" | "warning" | "danger" | "neutral" = "neutral";

  if (row?.status === "FAILED") {
    badgeText = "Failed";
    badgeTone = "danger";
  } else if (canConfirm && displayedRemovedItems.length === 0) {
    badgeText = "Can fit directly";
    badgeTone = "success";
  } else if (canConfirm) {
    badgeText = "Can fit with changes";
    badgeTone = "warning";
  } else if (isSelectedClosedAtAttemptedTime) {
    badgeText = "Closed at attempted time";
    badgeTone = "danger";
  } else if (String(attempt?.resultType || "").toUpperCase() === "PRIORITY_CONFLICT") {
    badgeText = "Priority conflict";
    badgeTone = "danger";
  } else if (String(attempt?.resultType || "").toUpperCase() === "CONFLICT_ONLY") {
    badgeText = "Conflict only";
    badgeTone = "warning";
  }

  const summary = String(
    row?.error ||
    selectedOpeningConflict?.reason ||
    attempt?.acceptedReason ||
    attempt?.rejectedReasons?.[0] ||
    row?.rankReason ||
    "Position evaluated."
  ).trim();

  return {
    timelineRows,
    removedRows,
    displayedRemovedItems,
    selectedOpeningConflict,
    hasUnprovenProtectedRemoval,
    hasUnauthorizedP3Removal,
    hasUnauthorizedProtectedRemoval,
    isSelectedClosedAtAttemptedTime,
    canConfirm,
    rescueAttemptUsed,
    summary,
    badgeText,
    badgeTone,
  };
};

export function AutoFitHerePreviewDialog({
  open,
  loading = false,
  failedReason = null,
  results,
  selectedAnchorKey,
  selectedHotspot,
  onClose,
  onSelectAnchorKey,
  onConfirm,
  confirmLoading = false,
}: AutoFitHerePreviewDialogProps) {
  const [loadingStepIndex, setLoadingStepIndex] = React.useState(0);
  const [acknowledgedRemovedHotspotIds, setAcknowledgedRemovedHotspotIds] = React.useState<number[]>([]);

  React.useEffect(() => {
    if (!open || !loading) {
      setLoadingStepIndex(0);
      return;
    }

    const timer = window.setInterval(() => {
      setLoadingStepIndex((prev) => Math.min(prev + 1, AUTO_PREVIEW_LOADING_STEPS.length - 1));
    }, 700);

    return () => {
      window.clearInterval(timer);
    };
  }, [loading, open]);

  React.useEffect(() => {
    setAcknowledgedRemovedHotspotIds([]);
  }, [open, selectedAnchorKey]);

  const selectedRow =
    results.find((row) => row.anchorKey === selectedAnchorKey) ||
    results[0] ||
    null;
  const selectedAttempt = (selectedRow?.attempt || null) as ManualFitHerePreviewResponse | null;
  const selectedState = deriveAutoPreviewAttemptState(selectedRow);
  const timelineRows = selectedState.timelineRows;
  const removedItems = selectedState.displayedRemovedItems;
  const resultConfig = getResultConfig(selectedAttempt?.resultType);
  const resultMessage = getFitHereResultMessage(selectedAttempt);
  const changesRequiredDisplay =
    (selectedAttempt as any)?.changesRequiredDisplay ||
    selectedAttempt?.resolution?.changesRequiredDisplay ||
    null;
  const plannedRemovalIds = Array.from(new Set([
    ...selectedState.displayedRemovedItems.map((row) => row.hotspotId),
    ...(Array.isArray(selectedAttempt?.requiresRemovalAcknowledgementHotspotIds)
      ? selectedAttempt.requiresRemovalAcknowledgementHotspotIds
          .map((id: any) => Number(id))
          .filter((id: number) => id > 0)
      : []),
  ]));
  const requiresRemovalAcknowledgement = plannedRemovalIds.length > 0;
  const allRemovalAcknowledged = plannedRemovalIds.every((id) => acknowledgedRemovedHotspotIds.includes(id));
  const canConfirm = selectedState.canConfirm && (!requiresRemovalAcknowledgement || allRemovalAcknowledged);
  const confirmButtonLabel = removedItems.length > 0
    ? "Confirm and Remove Hotspots"
    : "Confirm Fit Here";
  const hotspotName = String(
    selectedHotspot?.name ||
      selectedHotspot?.title ||
      (selectedAttempt?.selectedHotspotId ? `Hotspot #${selectedAttempt.selectedHotspotId}` : "Selected hotspot"),
  ).trim();

  if (!open) return null;

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) onClose();
      }}
    >
      <DialogContent
        overlayClassName="z-[240] bg-black/60 pointer-events-none"
        className="pointer-events-auto z-[260] flex max-h-[92vh] w-[96vw] max-w-[96vw] flex-col overflow-hidden border border-slate-200 bg-white p-0 shadow-2xl sm:max-w-[1440px] sm:rounded-2xl [&>button]:hidden"
        data-testid="auto-fit-here-preview-dialog"
      >
        <div className="flex h-[92vh] min-h-0 flex-col overflow-hidden">
          <div className="shrink-0 border-b border-slate-100 px-6 py-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <DialogTitle className="text-xl font-bold text-slate-900">
                  Auto-Preview Fit Here
                </DialogTitle>
                <DialogDescription className="mt-1 text-sm text-slate-500">
                  {hotspotName} across every valid Fit Here position
                </DialogDescription>
              </div>

              <button
                type="button"
                onClick={onClose}
                className="rounded-full p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-800"
                aria-label="Close Auto-Preview"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          {loading ? (
            <div className="min-h-0 flex-1 overflow-y-auto px-6 py-6">
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-full bg-white">
                    <Loader2 className="h-5 w-5 animate-spin text-emerald-700" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-900">Ranking every valid position...</p>
                    <p className="mt-1 text-xs text-slate-600">
                      We are reusing the existing Fit Here preview engine for each anchor and sorting the best outcome first.
                    </p>
                  </div>
                </div>

                <div className="mt-5 space-y-2">
                  {AUTO_PREVIEW_LOADING_STEPS.map((step, index) => {
                    const isActive = index === loadingStepIndex;
                    const isDone = index < loadingStepIndex;

                    return (
                      <div
                        key={step}
                        className={`rounded-xl border px-3 py-2 text-sm ${
                          isActive
                            ? "border-emerald-300 bg-white text-emerald-900"
                            : isDone
                              ? "border-emerald-100 bg-emerald-100/60 text-slate-800"
                              : "border-slate-100 bg-slate-50 text-slate-500"
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          {isActive ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : isDone ? (
                            <CheckCircle2 className="h-4 w-4" />
                          ) : (
                            <MapPin className="h-4 w-4" />
                          )}
                          <span>{step}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          ) : (
            <div className="grid min-h-0 flex-1 gap-0 lg:grid-cols-[360px_minmax(0,1fr)]">
              <div className="min-h-0 overflow-y-auto border-b border-slate-100 px-5 py-5 lg:border-b-0 lg:border-r">
                <div className="mb-4">
                  <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Ranked positions</p>
                  <p className="mt-1 text-sm text-slate-600">
                    The cleanest confirmable position is ranked first.
                  </p>
                </div>

                {failedReason ? (
                  <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                    {failedReason}
                  </div>
                ) : null}

                <div className="space-y-3" data-testid="auto-fit-here-results">
                  {results.map((row, index) => {
                    const rowState = deriveAutoPreviewAttemptState(row);
                    const isSelected = row.anchorKey === selectedRow?.anchorKey;
                    const isBest = index === 0;
                    const isCompleted = row.status === "COMPLETED";
                    const badgeClass =
                      rowState.badgeTone === "success"
                        ? "bg-emerald-100 text-emerald-700"
                        : rowState.badgeTone === "warning"
                          ? "bg-amber-100 text-amber-700"
                          : rowState.badgeTone === "danger"
                            ? "bg-red-100 text-red-700"
                            : "bg-slate-100 text-slate-700";

                    return (
                      <button
                        key={row.anchorKey}
                        type="button"
                        data-testid="auto-fit-here-result-row"
                        onClick={() => onSelectAnchorKey(row.anchorKey)}
                        className={`w-full rounded-2xl border px-4 py-3 text-left transition ${
                          isSelected
                            ? "border-emerald-400 bg-emerald-50 shadow-sm"
                            : "border-slate-200 bg-white hover:border-slate-300"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="text-sm font-semibold text-slate-900">{getAnchorLabel(row)}</p>
                              {isBest ? (
                                <span className="rounded-full bg-emerald-700 px-2 py-0.5 text-[10px] font-bold uppercase text-white">
                                  Best
                                </span>
                              ) : null}
                            </div>
                            <p className="mt-1 text-xs text-slate-500">
                              {String(row?.anchor?.anchorIntent || "").toUpperCase() === "AFTER_START"
                                ? "Before first attraction"
                                : `After ${String(row?.anchor?.anchorFrom || "attraction").trim()}`}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-xs font-bold text-slate-500">Score</p>
                            <p className="text-sm font-semibold text-slate-900">{Number(row?.score || 0)}</p>
                          </div>
                        </div>

                        <p className="mt-2 text-sm text-slate-700">
                          {rowState.summary}
                        </p>

                        <div className="mt-3 flex flex-wrap gap-2 text-[11px] font-semibold">
                          <span className={`rounded-full px-2.5 py-1 ${badgeClass}`}>
                            {isCompleted ? rowState.badgeText : "Failed"}
                          </span>
                          <span className="rounded-full bg-slate-100 px-2.5 py-1 text-slate-600">
                            {rowState.displayedRemovedItems.length > 0
                              ? `${rowState.displayedRemovedItems.length} removal${rowState.displayedRemovedItems.length === 1 ? "" : "s"}`
                              : "No removal"}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="min-h-0 overflow-y-auto px-6 py-5">
                <div className="space-y-5" data-testid="auto-fit-here-selected-details">
                  {selectedAttempt ? (
                    <section className={`rounded-2xl border p-4 ${resultConfig.wrapperClass}`}>
                      <span className={`inline-block rounded-full px-3 py-1 text-xs font-bold ${resultConfig.badgeClass}`}>
                        {resultConfig.badge}
                      </span>
                      <p className="mt-3 text-sm leading-5">{resultMessage}</p>
                      {selectedState.summary && selectedState.summary !== resultMessage ? (
                        <p className="mt-2 text-xs text-slate-600">
                          Technical reason: {selectedState.summary}
                        </p>
                      ) : null}
                    </section>
                  ) : (
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
                      Select a ranked result to inspect its finalized timeline.
                    </div>
                  )}

                  <div className="lg:sticky lg:top-0 lg:z-20 lg:-mx-2 lg:bg-white/95 lg:px-2 lg:pb-2 lg:pt-1 lg:backdrop-blur-sm">
                    <div className="space-y-4">
                      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 shadow-sm">
                        <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Selected position</p>
                        <p className="mt-1 text-lg font-semibold text-slate-900">
                          {selectedRow ? getAnchorLabel(selectedRow) : "No position selected"}
                        </p>
                      </div>

                      <div
                        className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
                        data-testid="auto-fit-here-changes-required"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Changes required</p>
                            <p className="mt-2 text-xs font-semibold text-slate-600">
                              {changesRequiredDisplay?.removalOrderLabel || "Removal order checked: Non-manual / Priority 4 -> Priority 3 -> Priority 2 -> Priority 1"}
                            </p>
                          </div>
                          {requiresRemovalAcknowledgement && !allRemovalAcknowledged ? (
                            <span className="rounded-full bg-amber-100 px-2.5 py-1 text-[10px] font-bold uppercase text-amber-800">
                              Action needed
                            </span>
                          ) : null}
                        </div>
                        {requiresRemovalAcknowledgement && !allRemovalAcknowledged ? (
                          <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-900">
                            Confirm is locked until you tick the checkbox below.
                          </div>
                        ) : null}
                    {removedItems.length === 0 ? (
                      <p className="mt-2 text-sm text-slate-700">No hotspot removed</p>
                    ) : (
                      <div className="mt-3 space-y-3">
                        {selectedState.rescueAttemptUsed ? (
                          <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
                            These hotspot removals were tried while preserving the selected exact position, but the exact anchor still could not be kept.
                          </div>
                        ) : null}
                        {removedItems.map((item) => {
                          const checked = acknowledgedRemovedHotspotIds.includes(item.hotspotId);

                          return (
                            <label
                              key={item.hotspotId}
                              className={`flex items-start gap-3 rounded-xl border p-3 transition ${
                                checked
                                  ? "border-emerald-300 bg-emerald-50"
                                  : "border-amber-200 bg-amber-50 shadow-sm"
                              }`}
                            >
                              <input
                                type="checkbox"
                                data-testid="auto-fit-here-removal-ack-checkbox"
                                checked={checked}
                                onChange={(event) => {
                                  setAcknowledgedRemovedHotspotIds((prev) => (
                                    event.target.checked
                                      ? Array.from(new Set([...prev, item.hotspotId]))
                                      : prev.filter((id) => id !== item.hotspotId)
                                  ));
                                }}
                                className="mt-1 h-5 w-5 rounded border-amber-300 accent-emerald-700"
                              />
                              <div>
                                <p className="text-sm font-semibold text-slate-900">{item.name}</p>
                                <p className="mt-1 text-xs text-slate-600">
                                  {item.workPriority ? `Priority ${item.workPriority}` : "Priority not set"}
                                  {item.reason ? ` • ${item.reason}` : ""}
                                </p>
                              </div>
                            </label>
                          );
                        })}
                      </div>
                    )}
                      </div>
                    </div>
                  </div>

                  {selectedState.selectedOpeningConflict ? (
                    <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-900">
                      <p className="font-bold">
                        {selectedState.selectedOpeningConflict?.hotspotName || hotspotName} cannot be inserted here.
                      </p>
                      <div className="mt-2 grid gap-1 text-xs">
                        <p>
                          <span className="font-semibold">Attempted visit:</span>{" "}
                          {selectedState.selectedOpeningConflict?.attemptedVisitTime || "Not available"}
                        </p>
                        <p>
                          <span className="font-semibold">Operating hours:</span>{" "}
                          {selectedState.selectedOpeningConflict?.operatingHours || "Not available"}
                        </p>
                        <p>
                          <span className="font-semibold">Reason:</span>{" "}
                          {selectedState.selectedOpeningConflict?.reason || "The hotspot is closed at the attempted time."}
                        </p>
                      </div>
                    </div>
                  ) : null}

                  <div
                    className="rounded-2xl border border-slate-200 bg-white p-4"
                    data-testid="auto-fit-here-main-timeline"
                  >
                    <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Finalized timeline</p>
                    {timelineRows.length === 0 ? (
                      <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
                        {selectedRow?.status === "FAILED"
                          ? selectedRow?.error || "This position could not be previewed."
                          : selectedAttempt?.rejectedReasons?.[0] || "No finalized timeline available for this position."}
                      </div>
                    ) : (
                      <div className="mt-3 space-y-3">
                        {timelineRows.map((row: any, index: number) => {
                          const hotspotId = getRowHotspotId(row);
                          const isSelectedHotspot = hotspotId > 0 && hotspotId === Number(selectedAttempt?.selectedHotspotId || 0);
                          const isRemoved = row?.isRemoved === true || String(row?.status || "").toUpperCase() === "REMOVED";
                          const operatingHours = getTimelineRowOperatingHours(row);
                          const isAttraction = String(row?.type || "").toLowerCase() === "attraction";

                          return (
                            <div
                              key={`${String(row?.type || "row")}-${hotspotId}-${index}`}
                              className={`rounded-xl border px-4 py-3 ${
                                isSelectedHotspot
                                  ? "border-emerald-300 bg-emerald-50"
                                  : isRemoved
                                    ? "border-red-200 bg-red-50"
                                    : "border-slate-200 bg-slate-50"
                              }`}
                            >
                              <div className="flex items-start justify-between gap-3">
                                <div>
                                  <p className="text-sm font-semibold text-slate-900">{getTimelineRowName(row)}</p>
                                  {getTimelineRowTime(row) ? (
                                    <p className="mt-1 text-xs text-slate-500">{getTimelineRowTime(row)}</p>
                                  ) : null}
                                  {isAttraction && operatingHours ? (
                                    <p className="mt-1 text-xs font-semibold text-emerald-700">
                                      Op Hours {operatingHours}
                                    </p>
                                  ) : null}
                                </div>
                                <div className="flex flex-wrap items-center gap-2">
                                  {isSelectedHotspot ? (
                                    <span className="rounded-full bg-emerald-700 px-2 py-0.5 text-[10px] font-bold uppercase text-white">
                                      Selected
                                    </span>
                                  ) : null}
                                  {isRemoved ? (
                                    <span className="rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-bold uppercase text-red-700">
                                      Removed
                                    </span>
                                  ) : null}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>

                <div className="mt-5 flex items-center justify-end gap-3">
                  <Button variant="outline" onClick={onClose}>
                    Close
                  </Button>
                  <Button
                    type="button"
                    disabled={!canConfirm || confirmLoading}
                    onClick={() => {
                      onConfirm({
                        allowTimingRisk: selectedAttempt?.requiresTimingRiskConfirmation === true,
                        acknowledgedRemovedHotspotIds: plannedRemovalIds,
                      }, selectedAttempt);
                    }}
                    className={removedItems.length > 0 ? "bg-amber-600 text-white hover:bg-amber-700" : ""}
                  >
                    {confirmLoading ? "Confirming..." : confirmButtonLabel}
                  </Button>
                </div>

                {selectedState.canConfirm && requiresRemovalAcknowledgement && !allRemovalAcknowledged ? (
                  <div className="mt-4 flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                    <span>Confirm is waiting for your acknowledgement in the Changes Required box above.</span>
                  </div>
                ) : null}

                {!selectedState.canConfirm && !loading ? (
                  <div className="mt-4 flex items-start gap-2 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                    <span>
                      {selectedState.summary ||
                        "This ranked position cannot be confirmed right now."}
                    </span>
                  </div>
                ) : null}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
