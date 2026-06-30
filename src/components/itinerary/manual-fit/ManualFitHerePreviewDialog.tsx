import React from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Circle,
  Clock,
  Loader2,
  MapPin,
  RefreshCw,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";

export type ManualFitHereResultType =
  | "FITS_DIRECTLY"
  | "FITS_WITH_OPTIONAL_REMOVAL"
  | "REQUIRES_P3_CONFIRMATION"
  | "PRIORITY_CONFLICT"
  | "CANNOT_FIT"
  | "CONFLICT_ONLY"
  | "SELECTED_HOTSPOT_CLOSED_AT_ATTEMPTED_TIME";

export type ManualFitHerePreviewResponse = {
  attemptId: string;
  planId: number;
  routeId: number;
  selectedHotspotId: number;
  resultType: ManualFitHereResultType;
  canConfirm: boolean;
  canForceConflict?: boolean;
  selectedOpeningConflict?: {
    hotspotId?: number;
    hotspotName?: string;
    attemptedVisitTime?: string;
    attemptedStartTime?: string;
    attemptedEndTime?: string;
    operatingHours?: string;
    openingTime?: string;
    closingTime?: string;
    reason?: string;
    reasonCode?: string;
  } | null;
  requiresTimingRiskConfirmation?: boolean;
  requiresPriorityRemovalConfirmation?: boolean;
  confirmButtonVariant?: "default" | "danger";
  timingRisk?: {
    type?: string;
    severity?: "warning" | "danger";
    hotspotId?: number;
    hotspotName?: string;
    proposedVisitStart?: string;
    proposedVisitEnd?: string;
    closingTime?: string;
    requestedDurationMinutes?: number;
    usableDurationMinutes?: number;
    overflowMinutes?: number;
    message?: string;
    canForceConfirm?: boolean;
  } | null;
  removedPrioritySummary?: {
    removedP3?: number;
    removedP2?: number;
    removedP1?: number;
    highestRemovedPriority?: number | null;
    removalOrder?: number[];
    requiresPriorityRemovalConfirmation?: boolean;
    severity?: "none" | "warning" | "danger";
    message?: string;
  } | null;
  changesRequiredDisplay?: {
    hasRemovals?: boolean;
    title?: string;
    removalOrderLabel?: string;
    removedItems?: Array<{
      hotspotId?: number;
      routeHotspotId?: number | null;
      name?: string;
      workPriority?: number | null;
      workPriorityLabel?: string;
      reason?: string | null;
    }>;
    noRemovalText?: string;
  } | null;
  removalPolicy?: {
    allowP3Removal?: boolean;
    allowP1P2Removal?: boolean;
  } | null;
  requiresP3Confirmation?: boolean;
  requiresP1P2Override?: boolean;
  acceptedReason?: string | null;
  rejectedReasons?: string[];
  proposedTimeline?: any[];
  finalizedTimeline?: any[];
  authoritativeTimelineSource?: string;
  authoritativeRemovedHotspotIds?: number[];
  requiresRemovalAcknowledgementHotspotIds?: number[];
  removedHotspots?: any[];
  shiftedHotspots?: any[];
  affectedPriorityHotspots?: any[];
  anchorLabel?: string;
  selectedAnchor?: {
    anchorType?: string;
    anchorIntent?: "AFTER_START" | "AFTER_ATTRACTION";
    anchorIndex?: number;
    anchorFrom?: string | null;
    anchorTo?: string | null;
    anchorLabel?: string | null;
  } | null;
  expiresAt?: string;
  sourceFingerprint?: string;
  suggestedAlternativePositions?: Array<{
    label?: string;
    fromHotspotId?: number | null;
    toHotspotId?: number | null;
    slotIndex?: number | null;
  }>;
  attemptLog?: Array<{
    id?: string;
    label?: string;
    step?: string;
    status?: "pending" | "running" | "passed" | "warning" | "failed" | "info" | "PASSED" | "FAILED" | "WARNING";
    message?: string;
    reason?: string;
    details?: Record<string, any>;
  }>;
  resolution?: Record<string, any>;
  manualInsertionFit?: any;
};

type FitHereStepStatus =
  | "pending"
  | "running"
  | "passed"
  | "warning"
  | "failed"
  | "info"
  | "PASSED"
  | "WARNING"
  | "FAILED";

type FitHereProgressStep = {
  id: string;
  label: string;
  status: FitHereStepStatus;
  message: string;
};

const FIT_HERE_LOADING_STEPS: Array<Omit<FitHereProgressStep, "status">> = [
  {
    id: "timeline",
    label: "Reading current itinerary timeline",
    message: "Loading the existing travel, attraction, activity, and hotel rows.",
  },
  {
    id: "hotspot",
    label: "Checking selected hotspot details",
    message: "Reading duration, city, opening hours, closing hours, and priority rules.",
  },
  {
    id: "anchor",
    label: "Checking insertion position",
    message: "Resolving the exact Fit Here position selected on the timeline.",
  },
  {
    id: "travel_from_previous",
    label: "Calculating travel from previous stop",
    message: "Checking drive time from the previous itinerary row to the selected hotspot.",
  },
  {
    id: "travel_to_next",
    label: "Calculating travel to next stop",
    message: "Checking drive time from the selected hotspot to the next itinerary row.",
  },
  {
    id: "arrival_time",
    label: "Checking arrival time",
    message: "Verifying when the guest can realistically reach the inserted hotspot.",
  },
  {
    id: "opening_hours",
    label: "Checking opening and closing hours",
    message: "Validating whether the visit stays inside the hotspot timing window.",
  },
  {
    id: "priority_protection",
    label: "Checking Priority protection",
    message: "Ensuring important route hotspots are not removed unless allowed and proven necessary.",
  },
  {
    id: "optional_removal",
    label: "Checking optional hotspot removal options",
    message: "Testing whether lower-priority or optional rows can be adjusted safely.",
  },
  {
    id: "route_end",
    label: "Checking route end and hotel timing",
    message: "Ensuring the route can still finish within the planned day timing.",
  },
  {
    id: "timeline_build",
    label: "Building proposed timeline preview",
    message: "Preparing the final before/after route preview.",
  },
];

const normalizeFitHereStatus = (status: FitHereStepStatus): FitHereStepStatus => {
  if (status === "PASSED") return "passed";
  if (status === "WARNING") return "warning";
  if (status === "FAILED") return "failed";
  return status;
};

const getStepIcon = (status: FitHereStepStatus) => {
  const normalized = normalizeFitHereStatus(status);

  if (normalized === "passed") {
    return <CheckCircle2 className="h-4 w-4 text-emerald-700" />;
  }

  if (normalized === "running") {
    return <Loader2 className="h-4 w-4 animate-spin text-emerald-700" />;
  }

  if (normalized === "warning") {
    return <AlertTriangle className="h-4 w-4 text-amber-600" />;
  }

  if (normalized === "failed") {
    return <AlertTriangle className="h-4 w-4 text-red-600" />;
  }

  return <Circle className="h-4 w-4 text-slate-300" />;
};

const getStepTextClass = (status: FitHereStepStatus) => {
  const normalized = normalizeFitHereStatus(status);

  if (normalized === "passed") return "text-slate-800";
  if (normalized === "running") return "text-emerald-800";
  if (normalized === "warning") return "text-amber-800";
  if (normalized === "failed") return "text-red-800";

  return "text-slate-400";
};

const buildLoadingSteps = (activeStepIndex: number): FitHereProgressStep[] =>
  FIT_HERE_LOADING_STEPS.map((step, index) => {
    if (index < activeStepIndex) {
      return { ...step, status: "passed" };
    }

    if (index === activeStepIndex) {
      return { ...step, status: "running" };
    }

    return { ...step, status: "pending" };
  });

type ManualFitHerePreviewDialogProps = {
  open: boolean;
  loading?: boolean;
  loadingStepIndex?: number;
  failedReason?: string | null;
  attempt: ManualFitHerePreviewResponse | null;
  selectedHotspot?: any | null;
  baseTimeline?: any[] | null;
  onClose: () => void;
  onConfirm: (options?: {
    allowClosedHotspotConflict?: boolean;
    allowTimingRisk?: boolean;
    acknowledgedRemovedHotspotIds?: number[];
  }) => void;
  onRetry?: () => void;
  confirmLoading?: boolean;
};

const getResultConfig = (resultType?: ManualFitHereResultType) => {
  switch (resultType) {
    case "FITS_DIRECTLY":
      return {
        badge: "Can Fit Directly",
        wrapperClass: "border-emerald-200 bg-emerald-50 text-emerald-900",
        badgeClass: "bg-emerald-700 text-white",
        icon: <CheckCircle2 className="h-5 w-5" />,
      };
    case "FITS_WITH_OPTIONAL_REMOVAL":
      return {
        badge: "Can Fit With Changes",
        wrapperClass: "border-emerald-200 bg-emerald-50 text-emerald-900",
        badgeClass: "bg-emerald-700 text-white",
        icon: <CheckCircle2 className="h-5 w-5" />,
      };
    case "REQUIRES_P3_CONFIRMATION":
      return {
        badge: "Needs Confirmation",
        wrapperClass: "border-amber-200 bg-amber-50 text-amber-900",
        badgeClass: "bg-amber-600 text-white",
        icon: <AlertTriangle className="h-5 w-5" />,
      };
    case "PRIORITY_CONFLICT":
      return {
        badge: "Priority Conflict",
        wrapperClass: "border-red-200 bg-red-50 text-red-900",
        badgeClass: "bg-red-600 text-white",
        icon: <AlertTriangle className="h-5 w-5" />,
      };
    case "CONFLICT_ONLY":
      return {
        badge: "Conflict Only",
        wrapperClass: "border-red-200 bg-red-50 text-red-900",
        badgeClass: "bg-red-600 text-white",
        icon: <AlertTriangle className="h-5 w-5" />,
      };
    case "SELECTED_HOTSPOT_CLOSED_AT_ATTEMPTED_TIME":
      return {
        badge: "Closed At Attempted Time",
        wrapperClass: "border-red-200 bg-red-50 text-red-900",
        badgeClass: "bg-red-600 text-white",
        icon: <AlertTriangle className="h-5 w-5" />,
      };
    default:
      return {
        badge: "Cannot Fit",
        wrapperClass: "border-slate-200 bg-slate-50 text-slate-800",
        badgeClass: "bg-slate-700 text-white",
        icon: <AlertTriangle className="h-5 w-5" />,
      };
  }
};

const getFitHereResultMessage = (attempt: ManualFitHerePreviewResponse | null): string => {
  if (!attempt) return "";

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

const getRowName = (row: any): string =>
  String(
    row?.name ||
      row?.title ||
      row?.hotspot_name ||
      row?.text ||
      row?.to ||
      row?.type ||
      "Row",
  );

const getRowTime = (row: any): string =>
  String(
    row?.timeRange ||
      row?.visitTime ||
      row?.startTime ||
      row?.hotspot_start_time ||
      "",
  );

const getShortName = (name: string): string => {
  if (!name) return "Row";
  return name
    .replace(/Temple/gi, "")
    .replace(/Swamy/gi, "Swamy")
    .replace(/Amman/gi, "Amman")
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .join(" ");
};

const getHotspotDurationLabel = (hotspot: any): string => {
  const raw = hotspot?.timeSpend || hotspot?.duration || hotspot?.durationLabel || "";
  if (!raw) return "";

  if (typeof raw === "number") {
    if (raw >= 60) {
      const hours = Math.floor(raw / 60);
      const minutes = raw % 60;
      return minutes > 0 ? `${hours} hr ${minutes} min` : `${hours} hr`;
    }

    return `${raw} min`;
  }

  return String(raw);
};

const getHotspotTimingLabel = (hotspot: any): string =>
  String(hotspot?.timings || hotspot?.openingHours || hotspot?.operatingHours || "");

const getAttemptRemovedItems = (attemptRow: any): Array<{
  hotspotId: number;
  name: string;
  workPriority: number | null;
  workPriorityLabel: string;
  reason: string | null;
}> => {
  const ids = Array.isArray(attemptRow?.removedHotspotIds)
    ? attemptRow.removedHotspotIds.map((id: any) => Number(id)).filter((id: number) => id > 0)
    : [];
  const names = Array.isArray(attemptRow?.removedHotspotNames) ? attemptRow.removedHotspotNames : [];
  const priorities = Array.isArray(attemptRow?.priorities) ? attemptRow.priorities : [];

  return ids.map((hotspotId: number, index: number) => {
    const workPriority = Number(priorities[index] || 0) || null;
    return {
      hotspotId,
      name: String(names[index] || `Hotspot #${hotspotId}`),
      workPriority,
      workPriorityLabel: workPriority ? `Priority ${workPriority}` : "Priority not set",
      reason: typeof attemptRow?.message === "string" && attemptRow.message.trim()
        ? attemptRow.message
        : typeof attemptRow?.reason === "string" && attemptRow.reason.trim()
          ? attemptRow.reason
          : null,
    };
  });
};

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

const getRowOperatingHoursLabel = (row: any, fallbackHotspot?: any): string => {
  const directOperatingHours = String(row?.operatingHours || "").trim();
  if (directOperatingHours) {
    return formatOperatingHoursLabel(directOperatingHours);
  }

  if (row?.openingTime && row?.closingTime) {
    return `${formatClockLabel(row.openingTime)} - ${formatClockLabel(row.closingTime)}`;
  }

  const fallbackTiming = getHotspotTimingLabel(fallbackHotspot);
  return fallbackTiming ? formatOperatingHoursLabel(fallbackTiming) : "";
};

const getAttemptTimelineHotspotId = (row: any): number =>
  Number(row?.hotspotId || row?.hotspot_ID || row?.hotspot_id || row?.locationId || row?.id || 0);

const AttemptTimelinePreview = ({
  rows,
}: {
  rows: any[];
}) => {
  const safeRows = Array.isArray(rows) ? rows : [];

  if (safeRows.length === 0) return null;

  return (
    <div className="mt-3 overflow-x-auto rounded-xl border border-slate-200 bg-white p-3">
      <div className="flex min-w-max items-center gap-3">
        {safeRows.map((row: any, index: number) => {
          const hotspotId = getAttemptTimelineHotspotId(row);
          const isRemoved = row?.isRemoved === true || String(row?.status || "").toUpperCase() === "REMOVED";
          const isExplanationOnly = row?.explanationOnly === true;
          const hasConflict = row?.hasConflict === true || String(row?.status || "").toUpperCase() === "CONFLICT";
          const isInserted = row?.isInserted === true;
          const isProtected = row?.isProtected === true || String(row?.status || "").toUpperCase() === "PROTECTED";
          const isTravel = String(row?.type || "").toLowerCase() === "travel";
          const name = getShortName(getRowName(row));
          const time = getRowTime(row);
          const operatingHours = getRowOperatingHoursLabel(row);

          const cardClass = isRemoved || isExplanationOnly
            ? "border-red-200 bg-red-50 text-red-900 opacity-90"
            : hasConflict
              ? "border-red-300 bg-red-50 text-red-900"
              : isInserted
                ? "border-emerald-300 bg-emerald-50 text-emerald-900"
                : isProtected
                  ? "border-sky-200 bg-sky-50 text-sky-900"
                  : "border-slate-200 bg-slate-50 text-slate-800";

          return (
            <React.Fragment key={`${hotspotId || row?.type || "row"}-${index}`}>
              <div
                data-testid="fit-here-attempt-timeline"
                data-row-type={String(row?.type || "")}
                data-row-status={String(row?.status || "")}
                data-hotspot-id={hotspotId || ""}
                data-explanation-only={isExplanationOnly ? "true" : "false"}
                className={`w-40 rounded-xl border px-3 py-2 text-center text-xs ${cardClass}`}
              >
                <p className="font-bold">{isTravel ? "Travel to" : name}</p>
                {time ? <p className="mt-1 text-[11px] text-slate-600">{time}</p> : null}
                {operatingHours ? (
                  <p className="mt-1 text-[11px] font-semibold text-emerald-700">
                    Op Hours {operatingHours}
                  </p>
                ) : null}
                {isRemoved ? <p className="mt-1 font-bold text-red-700">REMOVED - not in recalculated route</p> : null}
                {hasConflict ? <p className="mt-1 font-bold text-red-700">CONFLICT</p> : null}
                {isInserted && !hasConflict ? <p className="mt-1 font-bold text-emerald-700">INSERTED</p> : null}
                {isProtected ? <p className="mt-1 font-bold text-sky-700">PROTECTED</p> : null}
              </div>
              {index < safeRows.length - 1 ? (
                <div className={`h-px w-8 ${isRemoved ? "bg-red-200 border-t border-dashed border-red-300" : "bg-emerald-200"}`} />
              ) : null}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
};

const formatPriorityLabel = (priority: unknown): string => {
  const value = Number(priority || 0);
  if (value === 1) return "Priority 1";
  if (value === 2) return "Priority 2";
  if (value === 3) return "Priority 3";
  return "Priority";
};

const formatPriorityText = (value: unknown): string => {
  return String(value || "")
    .replace(/\bP1\b/g, "Priority 1")
    .replace(/\bP2\b/g, "Priority 2")
    .replace(/\bP3\b/g, "Priority 3")
    .replace(/Priority 3\s*->\s*Priority 2\s*->\s*Priority 1/g, "Priority 3 -> Priority 2 -> Priority 1")
    .replace(/P3\s*->\s*P2\s*->\s*P1/g, "Priority 3 -> Priority 2 -> Priority 1");
};

const getRemovalExplanationText = (row: any) => {
  const reasonCode = String(row?.removalReasonCode || "").toUpperCase();
  const name = row?.name || row?.hotspotName || "This hotspot";
  const attemptedVisitTime = row?.attemptedVisitTime || row?.attemptedArrivalTime || null;
  const operatingHours = row?.operatingHours || null;
  const outsideOperatingMinutes = Number(row?.outsideOperatingMinutes || 0);
  const routeEndOverflowMinutes = Number(row?.routeEndOverflowMinutes || 0);
  const beforeOverflow = Number(row?.routeEndOverflowBeforeRemoval || 0);
  const afterOverflow = Number(row?.routeEndOverflowAfterRemoval || 0);
  const isWithinOperatingHours = row?.isWithinOperatingHours === true;

  if (
    reasonCode === "ARRIVAL_AFTER_CLOSING" ||
    reasonCode === "VISIT_END_AFTER_CLOSING" ||
    reasonCode === "ARRIVAL_BEFORE_OPENING" ||
    outsideOperatingMinutes > 0
  ) {
    return row?.fitFailureExplanation || `${name} is outside operating hours by ${outsideOperatingMinutes} minutes.`;
  }

  if (reasonCode === "ROUTE_END_OVERFLOW" || routeEndOverflowMinutes > 0 || beforeOverflow > afterOverflow) {
    const overflowText = beforeOverflow > 0
      ? `Keeping it caused ${beforeOverflow} minutes of route overflow${afterOverflow >= 0 ? `, reduced to ${afterOverflow} minutes after removal.` : "."}`
      : row?.fitFailureExplanation;

    return overflowText || `${name} was removed because keeping it caused route-end overflow.`;
  }

  if (isWithinOperatingHours && attemptedVisitTime && operatingHours) {
    return `${name} is open during the recalculated visit time of ${attemptedVisitTime}. Operating hours: ${operatingHours}. No direct operating-hours conflict or route-end overflow was proven for this hotspot. This removal should be reviewed.`;
  }

  if (reasonCode === "UNPROVEN_REMOVAL") {
    return row?.fitFailureExplanation || `${name} was selected for removal, but the backend did not attach enough proof for the reason.`;
  }

  return row?.fitFailureExplanation || row?.reason || "Removed to fit route timing.";
};

const getAttemptedTimeLabel = (row: any): string => {
  const source = String(row?.attemptedTimelineSource || "").toUpperCase();

  if (source === "FAILED_BEFORE_REMOVAL") {
    return "Attempted in failed simulation";
  }

  if (source === "EXACT_ANCHOR_SEQUENTIAL_REBUILD") {
    return "Sequential check time";
  }

  if (source === "FINAL_PROPOSED_TIMELINE") {
    return "After insertion";
  }

  return "Attempted time";
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

    const hotspotId = Number(
      row?.locationId ||
      row?.hotspotId ||
      row?.hotspot_ID ||
      row?.hotspot_id ||
      0,
    );

    return isAttraction && hotspotId === selectedHotspotId;
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
      hotspotName: getRowName(selectedRow),
      attemptedVisitTime,
      operatingHours,
      reason: `${getRowName(selectedRow)} is closed on this route date.`,
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
    hotspotName: getRowName(selectedRow),
    attemptedVisitTime,
    attemptedStartTime: attempted.startLabel,
    attemptedEndTime: attempted.endLabel,
    operatingHours,
    openingTime: operating.startLabel,
    closingTime: operating.endLabel,
    reason: `${getRowName(selectedRow)} cannot be inserted at ${attemptedVisitTime}. Operating hours are ${operatingHours}.`,
    reasonCode: "CLIENT_SELECTED_HOTSPOT_CLOSED_AT_ATTEMPTED_TIME",
  };
};

const mapBaseSegmentToPreviewRow = (segment: any): any | null => {
  if (!segment || segment.type === "hotspot") return null;

  if (segment.type === "start") {
    return {
      type: "start",
      text: String(segment.title || "Start"),
      timeRange: String(segment.timeRange || ""),
    };
  }

  if (segment.type === "travel") {
    const from = String(segment.from || "").trim();
    const to = String(segment.to || "").trim();
    return {
      type: "travel",
      text: String(
        segment.text ||
          (from && to ? `Travelling from ${from} to ${to}` : "Travel"),
      ),
      name: String(
        segment.text ||
          (from && to ? `Travelling from ${from} to ${to}` : "Travel"),
      ),
      timeRange: String(segment.timeRange || ""),
      from,
      to,
      fromName: from,
      toName: to,
      distance: segment.distance || null,
      duration: segment.duration || null,
    };
  }

  if (segment.type === "attraction") {
    return {
      type: "attraction",
      text: String(segment.name || segment.text || "Hotspot"),
      name: String(segment.name || segment.text || "Hotspot"),
      timeRange: String(segment.visitTime || segment.timeRange || ""),
      locationId: Number(segment.hotspotId || segment.locationId || 0) || null,
      hotspotId: Number(segment.hotspotId || segment.locationId || 0) || null,
      operatingHours: segment.timings || null,
      timings: segment.timings || null,
      duration: segment.duration || null,
    };
  }

  if (segment.type === "checkin") {
    const time = String(segment.time || "").trim();
    const hotelName = String(segment.hotelName || "Hotel").trim();
    return {
      type: "hotel",
      text: `Check-in at ${hotelName}`,
      name: `Check-in at ${hotelName}`,
      timeRange: time ? `${time} - ${time}` : "",
      hotelName,
      isZeroDurationHotel: true,
    };
  }

  return {
    type: String(segment.type || "item"),
    text: String(segment.text || segment.name || "Row"),
    name: String(segment.text || segment.name || "Row"),
    timeRange: String(segment.timeRange || segment.time || segment.visitTime || ""),
  };
};

const buildDisplayedPreviewTimeline = (
  attempt: ManualFitHerePreviewResponse | null,
  baseTimeline: any[] | null,
): any[] => {
  const finalizedTimeline = Array.isArray(attempt?.finalizedTimeline) ? attempt.finalizedTimeline : [];
  const proposedTimeline = Array.isArray(attempt?.proposedTimeline) ? attempt.proposedTimeline : [];
  const routeTimeline = Array.isArray(baseTimeline)
    ? baseTimeline.map(mapBaseSegmentToPreviewRow).filter(Boolean)
    : [];

  const authoritative = finalizedTimeline.length > 0
    ? finalizedTimeline
    : (proposedTimeline.length > 0 ? proposedTimeline : routeTimeline);

  return authoritative.filter((row: any) => String(row?.type || "").toLowerCase() !== "waiting");
};

export function ManualFitHerePreviewDialog({
  open,
  loading = false,
  loadingStepIndex = 0,
  failedReason = null,
  attempt,
  selectedHotspot,
  baseTimeline = null,
  onClose,
  onConfirm,
  onRetry,
  confirmLoading = false,
}: ManualFitHerePreviewDialogProps) {
  const [acknowledgedRemovedHotspotIds, setAcknowledgedRemovedHotspotIds] = React.useState<number[]>([]);
  const [showRescueAttempts, setShowRescueAttempts] = React.useState(false);

  React.useEffect(() => {
    setAcknowledgedRemovedHotspotIds([]);
  }, [attempt?.attemptId, open]);

  React.useEffect(() => {
    if (open) {
      setShowRescueAttempts(false);
    }
  }, [open, attempt?.attemptId]);

  const getRemovalHotspotId = (row: any): number =>
    Number(row?.id || row?.hotspotId || row?.hotspot_ID || row?.hotspot_id || row?.locationId || 0);

  const dedupeRemovalRows = (rows: any[]): any[] => {
    const seen = new Set<number>();

    return (Array.isArray(rows) ? rows : []).filter((row: any) => {
      const hotspotId = getRemovalHotspotId(row);
      if (!hotspotId || seen.has(hotspotId)) return false;
      seen.add(hotspotId);
      return true;
    });
  };

  const isProvenRemoval = (row: any): boolean => {
    const hotspotId = getRemovalHotspotId(row);
    const reasonCode = String(row?.removalReasonCode || row?.reasonCode || "").toUpperCase();
    const attemptedTimelineSource = String(row?.attemptedTimelineSource || "").toUpperCase();

    if (!hotspotId) return false;
    if (reasonCode === "UNPROVEN_REMOVAL") return false;
    if (reasonCode.includes('FAILED')) return false;
    if (attemptedTimelineSource === "FAILED_BEFORE_REMOVAL") return false;
    if (row?.unprovenRemoval === true) return false;
    return true;
  };

  const config = getResultConfig(attempt?.resultType);
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
  const removed = removedRows;
  const timeline = buildDisplayedPreviewTimeline(attempt, baseTimeline);
  const reason =
    attempt?.acceptedReason ||
    attempt?.rejectedReasons?.[0] ||
    "Fit Here preview calculated.";
  const resultMessage = getFitHereResultMessage(attempt);
  const timingRisk = attempt?.timingRisk || attempt?.resolution?.timingRisk || null;
  const backendSelectedOpeningConflict =
    attempt?.selectedOpeningConflict ||
    attempt?.resolution?.selectedOpeningConflict ||
    attempt?.resolution?.manualInsertionFit?.selectedOpeningConflict ||
    null;
  const clientSelectedOpeningConflict = buildClientSelectedOpeningConflict(attempt, timeline);
  const selectedOpeningConflict =
    backendSelectedOpeningConflict ||
    clientSelectedOpeningConflict ||
    null;
  const openingHoursRemovalPlan =
    attempt?.resolution?.manualInsertionFit?.lowPriorityOpeningHoursRemovalPlanPreview ||
    attempt?.resolution?.lowPriorityOpeningHoursRemovalPlanPreview ||
    (attempt as any)?.manualInsertionFit?.lowPriorityOpeningHoursRemovalPlanPreview ||
    null;
  const dayEndRemovalPlan =
    attempt?.resolution?.manualInsertionFit?.lowPriorityRemovalPlanPreview ||
    (attempt as any)?.manualInsertionFit?.lowPriorityRemovalPlanPreview ||
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
  const openingHoursRescueAttempts = [
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
  const hasOpeningHoursRescueAttempts = openingHoursRescueAttempts.length > 0;
  const successfulRescueAttempt = openingHoursRescueAttempts.find((attemptRow: any) => (
    attemptRow?.resolved === true || attemptRow?.valid === true
  )) || null;
  const isSelectedClosedAtAttemptedTime =
    attempt?.resultType === "SELECTED_HOTSPOT_CLOSED_AT_ATTEMPTED_TIME" ||
    !!selectedOpeningConflict;
  const hasTimingRisk =
    timingRisk?.type === "PARTIAL_STAY_AFTER_CLOSING" ||
    attempt?.requiresTimingRiskConfirmation === true;
  const hasPriorityRemoval = removedRows.length > 0;
  const hasP1OrP2Removal = removedRows.some((row: any) => {
    const priority = Number(row?.priority || row?.hotspot_priority || row?.rawPriority || 0);
    return priority === 1 || priority === 2;
  });
  const hasUnprovenProtectedRemoval = removedRows.some((row: any) => {
    const priority = Number(row?.priority || row?.hotspot_priority || row?.rawPriority || 0);
    const reasonCode = String(row?.removalReasonCode || "").toUpperCase();
    return (priority === 1 || priority === 2) && reasonCode === "UNPROVEN_REMOVAL";
  });
  const hasUnauthorizedP3Removal = removedRows.some((row: any) => {
    const priority = Number(row?.priority || row?.hotspot_priority || row?.rawPriority || 0);
    return priority === 3 && attempt?.removalPolicy?.allowP3Removal !== true;
  });
  const hasUnauthorizedProtectedRemoval = removedRows.some((row: any) => {
    const priority = Number(row?.priority || row?.hotspot_priority || row?.rawPriority || 0);
    return (priority === 1 || priority === 2) && attempt?.removalPolicy?.allowP1P2Removal !== true;
  });
  const changesRequiredDisplay =
    (attempt as any)?.changesRequiredDisplay ||
    attempt?.resolution?.changesRequiredDisplay ||
    null;
  const removedItemsFromRows = removed.map((row: any) => {
        const hotspotId = Number(row?.id || row?.hotspotId || row?.hotspot_ID || row?.hotspot_id || 0);
        const workPriority = Number(row?.priority || row?.hotspotPriority || row?.hotspot_priority || row?.rawPriority || 0) || null;
        return {
          hotspotId,
          name: getRowName(row),
          workPriority,
          workPriorityLabel: workPriority ? `Priority ${workPriority}` : "Priority not set",
          reason: row?.reason || null,
        };
      });
  const rescueAttemptRemovedItems = successfulRescueAttempt
    ? getAttemptRemovedItems(successfulRescueAttempt)
    : [];
  const displayedRemovedItemsSource = Array.isArray(changesRequiredDisplay?.removedItems) && changesRequiredDisplay.removedItems.length > 0
    ? changesRequiredDisplay.removedItems
    : removedItemsFromRows.length > 0
      ? removedItemsFromRows
      : rescueAttemptRemovedItems;
  const displayedRemovedItems = displayedRemovedItemsSource.filter((item: any, index: number, list: any[]) => {
    const hotspotId = Number(item?.hotspotId || 0);
    if (!(hotspotId > 0)) return false;
    return list.findIndex((candidate: any) => Number(candidate?.hotspotId || 0) === hotspotId) === index;
  });
  const hasDisplayedRemovals = displayedRemovedItems.length > 0;
  const plannedRemovalIds = Array.from(
    new Set([
      ...displayedRemovedItems
        .map((row: any) => Number(row?.hotspotId || 0))
        .filter((id: number) => Number.isFinite(id) && id > 0),
      ...(Array.isArray(attempt?.requiresRemovalAcknowledgementHotspotIds)
        ? attempt.requiresRemovalAcknowledgementHotspotIds
            .map((id: any) => Number(id))
            .filter((id: number) => Number.isFinite(id) && id > 0)
        : []),
    ]),
  );
  const requiresRemovalAcknowledgement =
    plannedRemovalIds.length > 0 ||
    attempt?.requiresPriorityRemovalConfirmation === true ||
    attempt?.removedPrioritySummary?.requiresPriorityRemovalConfirmation === true;
  const allRemovalAcknowledged =
    !requiresRemovalAcknowledgement ||
    plannedRemovalIds.every((id: number) => acknowledgedRemovedHotspotIds.includes(id));
  const removalAcknowledgementLabel = plannedRemovalIds.length > 0
    ? `I acknowledge removal of ${plannedRemovalIds.length} hotspot${plannedRemovalIds.length === 1 ? "" : "s"} and want to continue.`
    : "I acknowledge the required hotspot removals and want to continue.";
  const shouldUseDangerConfirm =
    attempt?.confirmButtonVariant === "danger" ||
    hasTimingRisk ||
    hasPriorityRemoval ||
    hasP1OrP2Removal;
  const confirmButtonLabel = confirmLoading
    ? "Confirming..."
    : (hasP1OrP2Removal
        ? "Confirm and Remove High Work-Priority Hotspots"
        : hasPriorityRemoval
          ? "Confirm and Remove Hotspots"
          : shouldUseDangerConfirm
            ? "Confirm with Warning"
            : "Confirm Fit Here");

  const hotspotName =
    selectedHotspot?.name ||
    selectedHotspot?.title ||
    (attempt?.selectedHotspotId ? `Hotspot #${attempt.selectedHotspotId}` : "Selected hotspot");

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
        className="pointer-events-auto z-[260] flex max-h-[92vh] w-[96vw] max-w-[96vw] flex-col overflow-hidden border border-slate-200 bg-white p-0 shadow-2xl sm:max-w-[1500px] sm:rounded-2xl [&>button]:hidden"
        data-testid="fit-here-preview-dialog"
      >
        <div className="flex h-[92vh] max-h-[92vh] min-h-0 flex-col overflow-hidden">
          <div className="shrink-0 border-b border-slate-100 px-6 py-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <DialogTitle className="text-xl font-bold text-slate-900">
                  Fit Here Preview
                </DialogTitle>
                <DialogDescription className="mt-1 text-sm text-slate-500">
                  {hotspotName} insertion preview
                </DialogDescription>
              </div>

              <button
                type="button"
                onClick={onClose}
                className="rounded-full p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-800"
                aria-label="Close Fit Here preview"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          {loading ? (
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-6 py-6">
              <div className="mb-5 rounded-xl border border-emerald-100 bg-emerald-50 p-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white">
                    <RefreshCw className="h-5 w-5 animate-spin text-emerald-700" />
                  </div>

                  <div>
                    <p className="text-sm font-bold text-slate-900">
                      Optimising this insertion position...
                    </p>
                    <p className="mt-1 text-xs text-slate-600">
                      Checking timing, travel, opening hours, priority protection, optional removals,
                      and route feasibility.
                    </p>
                  </div>
                </div>

                <div className="mt-4 h-2 overflow-hidden rounded-full bg-white">
                  <div
                    className="h-full rounded-full bg-emerald-700 transition-all duration-500"
                    style={{
                      width: `${Math.min(
                        95,
                        Math.max(8, ((loadingStepIndex + 1) / FIT_HERE_LOADING_STEPS.length) * 100),
                      )}%`,
                    }}
                  />
                </div>

                <p className="mt-2 text-[11px] font-medium text-emerald-800">
                  Step {Math.min(loadingStepIndex + 1, FIT_HERE_LOADING_STEPS.length)} of{" "}
                  {FIT_HERE_LOADING_STEPS.length}
                </p>
              </div>

              <div className="space-y-2">
                {buildLoadingSteps(loadingStepIndex).map((step) => (
                  <div
                    key={step.id}
                    className={[
                      "flex gap-3 rounded-xl border p-3 transition",
                      normalizeFitHereStatus(step.status) === "running"
                        ? "border-emerald-200 bg-white shadow-sm"
                        : "border-slate-100 bg-slate-50",
                    ].join(" ")}
                  >
                    <div className="mt-0.5 shrink-0">{getStepIcon(step.status)}</div>

                    <div>
                      <p className={`text-sm font-bold ${getStepTextClass(step.status)}`}>
                        {step.label}
                      </p>
                      <p className="mt-0.5 text-xs text-slate-500">{step.message}</p>
                    </div>
                  </div>
                ))}
              </div>

              <p className="mt-5 rounded-xl bg-slate-50 px-4 py-3 text-xs text-slate-500">
                Please wait while we test travel timing, opening hours, priority protection,
                shifted rows, optional removals, and final route feasibility.
              </p>
            </div>
          ) : failedReason ? (
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-6 py-8">
              <div className="rounded-xl border border-red-200 bg-red-50 p-5 text-red-900">
                <div className="flex gap-3">
                  <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
                  <div>
                    <p className="font-bold">Could not calculate Fit Here preview.</p>
                    <p className="mt-2 text-sm">
                      {failedReason || "The optimiser could not complete the preview calculation."}
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
                This may happen if matrix data, timing data, or the selected route state changed while
                the preview was being calculated.
              </div>
            </div>
          ) : attempt ? (
            <div
              className="min-h-0 flex-1 overflow-y-auto overscroll-contain"
              data-testid="fit-here-modal-body"
            >
              <div className="space-y-5 px-8 py-5">
                <section className={`flex gap-3 rounded-xl border p-4 ${config.wrapperClass}`}>
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/70">
                    {config.icon}
                  </div>

                  <div>
                    <span className={`inline-block rounded-full px-3 py-1 text-xs font-bold ${config.badgeClass}`}>
                      {config.badge}
                    </span>
                    <p className="mt-2 text-sm leading-5">{resultMessage}</p>
                    {reason && reason !== resultMessage ? (
                      <p className="mt-2 text-xs text-slate-600">
                        Technical reason: {reason}
                      </p>
                    ) : null}
                  </div>
                </section>

                {attempt?.selectedAnchor && (
                  <div className="rounded-xl border border-slate-200 bg-white p-3 text-sm text-slate-700">
                    <span className="font-bold">Insert position:</span>{" "}
                    {attempt.selectedAnchor.anchorLabel ||
                      attempt.anchorLabel ||
                      "Selected Fit Here position"}
                  </div>
                )}

                <div className="grid grid-cols-1 gap-5 xl:grid-cols-[0.9fr_1.1fr]">
                  <div className="space-y-4">
                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                      <p className="mb-3 text-[11px] font-bold uppercase tracking-wide text-slate-500">
                        Selected Hotspot
                      </p>

                      <div className="flex items-center gap-2">
                        <MapPin className="h-5 w-5 text-emerald-700" />
                        <span className="font-bold text-slate-900">{hotspotName}</span>
                      </div>

                      <div className="mt-3 flex flex-wrap gap-3 text-xs text-slate-600">
                        {getHotspotDurationLabel(selectedHotspot) && (
                          <span className="inline-flex items-center gap-1">
                            <Clock className="h-4 w-4" />
                            {getHotspotDurationLabel(selectedHotspot)}
                          </span>
                        )}

                        {getHotspotTimingLabel(selectedHotspot) && (
                          <span>{getHotspotTimingLabel(selectedHotspot)}</span>
                        )}
                      </div>
                    </div>

                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                      <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-slate-500">
                        Insert Position
                      </p>

                      <p className="text-sm font-semibold text-slate-900">
                        {attempt.selectedAnchor?.anchorLabel ||
                          attempt.anchorLabel ||
                          "Selected Fit Here position"}
                      </p>
                    </div>
                  </div>

                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-4" data-testid="fit-here-changes-required">
                    <p className="mb-3 text-[11px] font-bold uppercase tracking-wide text-slate-500">
                      {changesRequiredDisplay?.title || "Changes Required"}
                    </p>

                    <div className="space-y-3">
                      <p className="text-xs font-semibold text-slate-600">
                        {changesRequiredDisplay?.removalOrderLabel || "Removal order checked: Priority 3 -> Priority 2 -> Priority 1"}
                      </p>

                      {hasDisplayedRemovals ? (
                        <div className="space-y-2">
                          {displayedRemovedItems.map((item: any, index: number) => {
                            const matchingRow = removed.find((row: any) => (
                              Number(row?.id || row?.hotspotId || row?.hotspot_ID || row?.hotspot_id || 0) === Number(item?.hotspotId || 0)
                            )) || null;

                            return (
                              <div
                                key={`${item?.hotspotId || index}-${item?.name || "removed"}`}
                                className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900"
                              >
                                <div className="flex gap-2">
                                  <Trash2 className="mt-0.5 h-4 w-4 text-red-600" />
                                  <div>
                                    <p className="font-bold text-slate-900">
                                      {`${item?.workPriorityLabel || "Priority not set"}: ${item?.name || `Hotspot #${item?.hotspotId || index + 1}`} removed`}
                                    </p>
                                    {item?.reason ? (
                                      <p className="mt-1 text-xs">{formatPriorityText(String(item.reason))}</p>
                                    ) : null}
                                    {matchingRow?.originalVisitTime ? (
                                      <p className="mt-1 text-xs text-slate-600">
                                        <span className="font-semibold text-slate-700">Original visit:</span>{" "}
                                        {matchingRow.originalVisitTime}
                                      </p>
                                    ) : null}
                                    {matchingRow?.attemptedVisitTime || matchingRow?.attemptedArrivalTime ? (
                                      <p className="text-xs text-slate-600">
                                        <span className="font-semibold text-slate-700">{getAttemptedTimeLabel(matchingRow)}:</span>{" "}
                                        {matchingRow?.attemptedVisitTime || matchingRow?.attemptedArrivalTime}
                                      </p>
                                    ) : null}
                                    {matchingRow?.operatingHours ? (
                                      <p className="text-xs text-slate-600">
                                        <span className="font-semibold text-slate-700">Operating hours:</span>{" "}
                                        {matchingRow.operatingHours}
                                      </p>
                                    ) : null}
                                    {matchingRow ? (
                                      <p className="mt-1 text-xs text-slate-600">
                                        <span className="font-semibold text-slate-700">Why it was removed:</span>{" "}
                                        {formatPriorityText(getRemovalExplanationText(matchingRow))}
                                      </p>
                                    ) : null}
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <p className="text-sm font-semibold text-emerald-800">
                          {changesRequiredDisplay?.noRemovalText || "No hotspot removed"}
                        </p>
                      )}
                    </div>
                    {requiresRemovalAcknowledgement ? (
                      <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3">
                        <label className="flex cursor-pointer items-start gap-3 text-sm font-medium text-slate-800">
                          <input
                            data-testid="fit-here-removal-ack-checkbox"
                            type="checkbox"
                            checked={allRemovalAcknowledged}
                            onChange={(event) => {
                              setAcknowledgedRemovedHotspotIds(
                                event.target.checked ? plannedRemovalIds : [],
                              );
                            }}
                            className="mt-1 h-6 w-6 rounded border-emerald-300 accent-emerald-700"
                          />
                          <span>{removalAcknowledgementLabel}</span>
                        </label>
                      </div>
                    ) : null}
                  </div>
                </div>

                <section>
                  <p className="mb-3 text-[11px] font-bold uppercase tracking-wide text-slate-500">
                    Finalized Timeline Preview
                  </p>

                  <div
                    data-testid="fit-here-main-timeline"
                    role={hasOpeningHoursRescueAttempts ? "button" : undefined}
                    tabIndex={hasOpeningHoursRescueAttempts ? 0 : undefined}
                    onClick={() => {
                      if (hasOpeningHoursRescueAttempts) {
                        setShowRescueAttempts((value) => !value);
                      }
                    }}
                    onKeyDown={(event) => {
                      if (!hasOpeningHoursRescueAttempts) return;
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        setShowRescueAttempts((value) => !value);
                      }
                    }}
                    className={`rounded-xl border border-slate-200 bg-white p-4 ${
                      hasOpeningHoursRescueAttempts ? "cursor-pointer hover:border-emerald-300 hover:bg-emerald-50/20" : ""
                    }`}
                  >
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-6">
                      <div className="flex flex-col items-center">
                        <div className="mb-2 h-3 w-3 rounded-full bg-emerald-700" />
                        <span className="text-[11px] font-medium text-slate-500">Start</span>
                      </div>

                      {timeline.slice(0, 14).map((row: any, index: number) => {
                        const name = getRowName(row);
                        const rowHotspotId = Number(row?.hotspotId || row?.locationId || row?.hotspot_ID || 0);
                        const isManual =
                          row?.isManual === true ||
                          row?.manual === true ||
                          rowHotspotId === Number(attempt.selectedHotspotId);
                        const isSelectedInsertedHotspot =
                          rowHotspotId === Number(attempt.selectedHotspotId);
                        const operatingHoursLabel = getRowOperatingHoursLabel(
                          row,
                          isSelectedInsertedHotspot ? selectedHotspot : undefined,
                        );
                        const isRemoved = row?.removed === true || row?.isRemoved === true;
                        const isConflict = row?.isConflict === true || Number(row?.is_conflict || 0) === 1;
                        const isManualConflict = isManual && isConflict;
                        const isAttractionLike =
                          String(row?.type || "").toLowerCase() === "attraction" ||
                          Number(row?.item_type || 0) === 4;

                        return (
                          <React.Fragment key={`${name}-${index}`}>
                            <div className="hidden h-px w-8 bg-emerald-200 md:block" />

                            <div
                              className={[
                                "flex min-w-[120px] max-w-[170px] flex-1 flex-col items-center rounded-lg border px-3 py-2 text-center",
                                isManualConflict
                                  ? "border-red-400 bg-red-50 ring-2 ring-red-400 ring-offset-2"
                                  : isManual
                                    ? "border-emerald-600 bg-emerald-50 ring-2 ring-emerald-500 ring-offset-2"
                                    : isRemoved
                                      ? "border-dashed border-slate-300 bg-slate-50 opacity-50"
                                      : isConflict
                                        ? "border-red-300 bg-red-50"
                                        : "border-slate-200 bg-slate-50",
                              ].join(" ")}
                            >
                              <span
                                className={[
                                  "text-xs font-bold",
                                  isManualConflict
                                    ? "text-red-800"
                                    : isManual
                                      ? "text-emerald-800"
                                      : isRemoved
                                        ? "text-slate-400 line-through"
                                        : isConflict
                                          ? "text-red-800"
                                          : "text-slate-800",
                                ].join(" ")}
                              >
                                {getShortName(name)}
                              </span>

                              <span className="mt-1 text-[10px] text-slate-500">
                                {getRowTime(row)}
                              </span>

                              {isAttractionLike ? (
                                <span className="mt-1 text-[10px] font-medium text-emerald-800/80">
                                  {`Op Hours ${operatingHoursLabel || "Not available"}`}
                                </span>
                              ) : null}

                              {isManualConflict ? (
                                <span className="mt-1 text-[10px] font-bold uppercase text-red-700">
                                  Cannot Insert
                                </span>
                              ) : isManual ? (
                                <span className="mt-1 text-[10px] font-bold uppercase text-emerald-700">
                                  Inserted
                                </span>
                              ) : null}

                              {isRemoved && (
                                <span className="mt-1 text-[10px] font-bold uppercase text-red-600">
                                  Removed
                                </span>
                              )}

                              {isConflict && (
                                <span className="mt-1 text-[10px] font-bold uppercase text-red-600">
                                  Conflict
                                </span>
                              )}
                            </div>
                          </React.Fragment>
                        );
                      })}

                      <div className="hidden h-px w-8 bg-emerald-200 md:block" />

                      <div className="flex flex-col items-center">
                        <div className="mb-2 h-3 w-3 rounded-full bg-slate-500" />
                        <span className="text-[11px] font-medium text-slate-500">Hotel</span>
                      </div>
                    </div>
                    {hasOpeningHoursRescueAttempts ? (
                      <p className="mt-3 text-xs font-semibold text-emerald-700">
                        Click timeline to {showRescueAttempts ? "hide" : "view"} rescue attempts.
                      </p>
                    ) : null}
                  </div>
                </section>

                {isSelectedClosedAtAttemptedTime ? (
                  <div
                    className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900"
                    data-testid="fit-here-selected-conflict"
                  >
                    <p className="font-bold">
                      {selectedOpeningConflict?.hotspotName || hotspotName} cannot be inserted here.
                    </p>

                    <div className="mt-2 grid gap-1 text-xs">
                      <p>
                        <span className="font-semibold">Attempted visit:</span>{" "}
                        {selectedOpeningConflict?.attemptedVisitTime || "Not available"}
                      </p>
                      <p>
                        <span className="font-semibold">Operating hours:</span>{" "}
                        {selectedOpeningConflict?.operatingHours || "Not available"}
                      </p>
                      <p>
                        <span className="font-semibold">Reason:</span>{" "}
                        {selectedOpeningConflict?.reason || "The hotspot is closed at the attempted time."}
                      </p>
                    </div>
                  </div>
                ) : null}

                {hasOpeningHoursRescueAttempts ? (
                  <div
                    data-testid="fit-here-rescue-attempts"
                    className="rounded-xl border border-amber-200 bg-amber-50 text-amber-900"
                  >
                    <button
                      type="button"
                      className="flex w-full items-center justify-between px-4 py-3 text-left"
                      onClick={() => setShowRescueAttempts((value) => !value)}
                      aria-expanded={showRescueAttempts}
                    >
                      <div>
                        <p className="font-bold">
                          {attempt?.canConfirm ? "How this fit was rescued" : "Rescue attempts checked"}
                        </p>
                        <p className="mt-1 text-xs">
                          {attempt?.canConfirm
                            ? "The system found a fit by checking same-route non-manual hotspot removals."
                            : "The system tested same-route non-manual hotspot removals before deciding whether this can fit."}
                        </p>
                      </div>
                      <span className="text-xs font-bold">
                        {showRescueAttempts ? "Hide" : "Show"}
                      </span>
                    </button>
                    {showRescueAttempts ? (
                    <div className="space-y-2 px-4 pb-4 text-xs">
                      {openingHoursRescueAttempts.slice(0, 6).map((attemptRow: any, index: number) => {
                        const removedNames = Array.isArray(attemptRow?.removedHotspotNames)
                          ? attemptRow.removedHotspotNames.join(", ")
                          : Array.isArray(attemptRow?.removedHotspots)
                            ? attemptRow.removedHotspots.map((row: any) => row?.name || row?.hotspotName || row?.hotspot_name || row?.id).join(", ")
                            : Array.isArray(attemptRow?.removedHotspotIds)
                              ? attemptRow.removedHotspotIds.join(", ")
                              : "No removal set";
                        const protectedText = Array.isArray(attemptRow?.removalSummary?.protectedHotspots)
                          ? attemptRow.removalSummary.protectedHotspots
                              .map((item: any) => item?.name ? `${item.name}: ${item.reason}` : item?.reason)
                              .filter(Boolean)
                              .join(" ")
                          : "";
                        const attemptTimelineRows =
                          attemptRow?.previewTimelineDisplay ||
                          attemptRow?.displayTimeline ||
                          attemptRow?.previewTimeline ||
                          attemptRow?.timeline ||
                          [];
                        const selectedAttemptTimelineRow = Array.isArray(attemptTimelineRows)
                          ? (
                              attemptTimelineRows.find((row: any) => {
                                const hotspotId = Number(row?.hotspotId || row?.locationId || row?.hotspot_ID || row?.hotspot_id || 0);
                                const isAttraction =
                                  String(row?.type || "").toLowerCase() === "attraction" ||
                                  Number(row?.itemType || row?.item_type || 0) === 4;
                                const isRemoved =
                                  row?.isRemoved === true ||
                                  String(row?.status || "").toUpperCase() === "REMOVED";
                                return isAttraction && !isRemoved && hotspotId === Number(attempt?.selectedHotspotId || 0);
                              }) ||
                              attemptTimelineRows.find((row: any) => {
                                const hotspotId = Number(row?.hotspotId || row?.locationId || row?.hotspot_ID || row?.hotspot_id || 0);
                                return hotspotId === Number(attempt?.selectedHotspotId || 0);
                              })
                            )
                          : null;
                        const selectedAttemptTime =
                          attemptRow?.selectedAttemptedVisitTime ||
                          selectedAttemptTimelineRow?.timeRange ||
                          attemptRow?.finalArrivalTime ||
                          "Not available";
                        const selectedAttemptOperatingHours =
                          attemptRow?.selectedOperatingHours ||
                          selectedAttemptTimelineRow?.operatingHours ||
                          selectedAttemptTimelineRow?.timings ||
                          "Not available";
                        const removedAttemptIds = Array.isArray(attemptRow?.removedHotspotIds)
                          ? attemptRow.removedHotspotIds.map((id: any) => Number(id || 0))
                          : [];
                        const shouldShowDhanushkodiFallback =
                          !protectedText &&
                          String(selectedOpeningConflict?.hotspotName || hotspotName).toLowerCase().includes("ariyamaan") &&
                          Array.isArray(attemptTimelineRows) &&
                          attemptTimelineRows.some((row: any) => String(getRowName(row)).toLowerCase().includes("dhanushkodi")) &&
                          !removedAttemptIds.includes(42);

                        return (
                          <div
                            key={`${attemptRow?.attemptNumber || index}-${removedNames}`}
                            className="rounded-lg bg-white/70 px-3 py-2"
                            data-testid={`fit-here-rescue-attempt-${attemptRow?.attemptNumber || index + 1}`}
                          >
                            <p className="font-semibold">
                              Attempt {attemptRow?.attemptNumber || index + 1}: remove {removedNames}
                            </p>
                            <p>{hotspotName} time: {selectedAttemptTime}</p>
                            <p>Operating hours: {selectedAttemptOperatingHours}</p>
                            <p>
                              Result: {attemptRow?.resolved || attemptRow?.valid
                                ? "Fits after this removal set"
                                : (attemptRow?.reason || "Still does not fit")}
                            </p>
                            <AttemptTimelinePreview rows={attemptTimelineRows} />
                            {import.meta.env.DEV && Array.isArray(attemptRow?.displayTimelineErrors) && attemptRow.displayTimelineErrors.length > 0 ? (
                              <div className="mt-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-800">
                                <p className="font-bold">Developer warning: invalid attempt display timeline</p>
                                {attemptRow.displayTimelineErrors.map((item: string, i: number) => (
                                  <p key={i}>{item}</p>
                                ))}
                              </div>
                            ) : null}
                            <div className="mt-2 rounded-lg border border-amber-100 bg-amber-50/70 px-3 py-2">
                              <p className="font-semibold">Removal info</p>
                              <p>Removed: {removedNames}</p>
                              {protectedText ? (
                                <p>Protected: {protectedText}</p>
                              ) : shouldShowDhanushkodiFallback ? (
                                <p>Protected: Dhanushkodi was not removed because it is manually added / own-way.</p>
                              ) : null}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    ) : null}
                  </div>
                ) : null}

                {hasTimingRisk && (
                  <div className={`rounded-xl border p-4 text-sm ${timingRisk?.severity === "danger" ? "border-red-200 bg-red-50 text-red-900" : "border-amber-200 bg-amber-50 text-amber-900"}`}>
                    <p className="font-bold">Less time available at this hotspot</p>
                    <p className="mt-2">
                      {timingRisk?.message || "The selected hotspot would close before the planned visit fully completes."}
                    </p>
                  </div>
                )}

                {attempt?.suggestedAlternativePositions && attempt.suggestedAlternativePositions.length > 0 && (
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                    <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                      Suggested alternatives only
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      These are not selected. Click a different Fit Here button if you want to test another position.
                    </p>
                    <div className="mt-3 space-y-2">
                      {attempt.suggestedAlternativePositions.map((slot, index) => (
                        <div key={`alternative-${index}`} className="rounded-lg border border-white bg-white px-3 py-2 text-xs text-slate-700">
                          {slot?.label || `Alternative position ${index + 1}`}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {hasUnprovenProtectedRemoval ? (
                  <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
                    This preview removes a Priority 1 or Priority 2 hotspot without proven route-overflow or operating-hours evidence. Confirmation is blocked to prevent unsafe itinerary changes.
                  </div>
                ) : null}
                {hasUnauthorizedP3Removal || hasUnauthorizedProtectedRemoval ? (
                  <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
                    This preview removes a hotspot that was not allowed by the selected removal policy. Please recalculate or explicitly approve the required removal level.
                  </div>
                ) : null}

                {attempt.attemptLog && attempt.attemptLog.length > 0 && (
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                    <p className="mb-3 text-xs font-bold uppercase tracking-wide text-slate-500">
                      Optimiser Decision Log
                    </p>
                    <div className="space-y-2">
                      {attempt.attemptLog.map((log: any, index: number) => {
                        const status = normalizeFitHereStatus((log.status || "info") as FitHereStepStatus);
                        const label = log.label || log.step || `Check ${index + 1}`;
                        const message = log.message || log.reason || "Check completed.";

                        return (
                          <div
                            key={`${label}-${index}`}
                            className="flex gap-3 rounded-lg border border-white bg-white px-3 py-2"
                          >
                            <div className="mt-0.5 shrink-0">{getStepIcon(status)}</div>

                            <div>
                              <p className={`text-xs font-bold ${getStepTextClass(status)}`}>
                                {label}
                              </p>
                              <p className="mt-0.5 text-xs text-slate-500">{message}</p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : null}

          <div
            className="shrink-0 flex items-center justify-end gap-3 border-t border-slate-100 bg-slate-50 px-6 py-4"
            data-testid="fit-here-modal-footer"
          >
            <Button type="button" variant="ghost" onClick={onClose}>
              Cancel
            </Button>

            {failedReason && onRetry && (
              <Button type="button" variant="outline" onClick={onRetry}>
                Retry
                <RefreshCw className="ml-2 h-4 w-4" />
              </Button>
            )}

            {isSelectedClosedAtAttemptedTime && attempt?.canForceConflict ? (
              <Button
                type="button"
                onClick={() => onConfirm({
                  allowClosedHotspotConflict: true,
                  allowTimingRisk: true,
                  acknowledgedRemovedHotspotIds,
                })}
                disabled={
                  confirmLoading ||
                  loading ||
                  Boolean(failedReason) ||
                  hasUnprovenProtectedRemoval ||
                  hasUnauthorizedP3Removal ||
                  hasUnauthorizedProtectedRemoval ||
                  (requiresRemovalAcknowledgement && !allRemovalAcknowledged)
                }
                className="bg-amber-600 text-white hover:bg-amber-700"
              >
                Add Anyway as Conflict
                <AlertTriangle className="ml-2 h-4 w-4" />
              </Button>
            ) : (
              <Button
                type="button"
                onClick={() => onConfirm({ acknowledgedRemovedHotspotIds })}
                disabled={
                  !attempt?.canConfirm ||
                  confirmLoading ||
                  loading ||
                  Boolean(failedReason) ||
                  hasUnprovenProtectedRemoval ||
                  hasUnauthorizedP3Removal ||
                  hasUnauthorizedProtectedRemoval ||
                  isSelectedClosedAtAttemptedTime ||
                  (requiresRemovalAcknowledgement && !allRemovalAcknowledged)
                }
                className={shouldUseDangerConfirm ? "bg-red-600 text-white hover:bg-red-700" : "bg-emerald-700 text-white hover:bg-emerald-800"}
              >
                {confirmButtonLabel}
                <Sparkles className="ml-2 h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
