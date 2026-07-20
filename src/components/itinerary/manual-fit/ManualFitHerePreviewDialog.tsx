/* eslint-disable @typescript-eslint/no-explicit-any */
import React from "react";
import { AlertTriangle, CheckCircle2, Circle, Loader2 } from "lucide-react";
import { ManualFitHerePreviewDialogView } from "./ManualFitHerePreviewDialogView";
import {
  FIT_HERE_LOADING_STEPS,
  type FitHereProgressStep,
  type FitHereStepStatus,
  type ManualFitHerePreviewDialogProps,
  type ManualFitHerePreviewResponse,
  type ManualFitHereResultType,
} from "./ManualFitHerePreviewTypes";
export type { ManualFitHerePreviewResponse, ManualFitHereResultType } from "./ManualFitHerePreviewTypes";
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
  const isHardExactAnchorFailure =
    String((attempt as any)?.authoritativeTimelineSource || "").toUpperCase() === "EXACT_ANCHOR_NO_VALID_RESULT" &&
    finalizedTimeline.length === 0 &&
    proposedTimeline.length === 0;
  if (isHardExactAnchorFailure) {
    return [];
  }
  if (attempt?.selectedAnchorPreserved === false || String(attempt?.exactAnchorMismatch?.message || "").trim().length > 0) {
    const openingHoursRemovalPlan =
      attempt?.resolution?.manualInsertionFit?.lowPriorityOpeningHoursRemovalPlanPreview ||
      attempt?.resolution?.lowPriorityOpeningHoursRemovalPlanPreview ||
      (attempt as any)?.manualInsertionFit?.lowPriorityOpeningHoursRemovalPlanPreview ||
      null;
    const dayEndRemovalPlan =
      attempt?.resolution?.manualInsertionFit?.lowPriorityRemovalPlanPreview ||
      (attempt as any)?.manualInsertionFit?.lowPriorityRemovalPlanPreview ||
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
      return rescueTimeline.filter((row: any) => String(row?.type || "").toLowerCase() !== "waiting");
    }
  }
  if (finalizedTimeline.length > 0) {
    return finalizedTimeline.filter((row: any) => String(row?.type || "").toLowerCase() !== "waiting");
  }
  if (proposedTimeline.length > 0) {
    return proposedTimeline.filter((row: any) => String(row?.type || "").toLowerCase() !== "waiting");
  }
  return routeTimeline.filter((row: any) => String(row?.type || "").toLowerCase() !== "waiting");
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
  const preferredRescueAttempt =
    successfulRescueAttempt ||
    openingHoursRescueAttempts[openingHoursRescueAttempts.length - 1] ||
    null;
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
  const isExactAnchorFailure =
    String((attempt as any)?.authoritativeTimelineSource || "").toUpperCase() === "EXACT_ANCHOR_NO_VALID_RESULT" ||
    (attempt as any)?.changesRequiredDisplay?.exactAnchorFailure === true;
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
  const rescueAttemptRemovedItems = preferredRescueAttempt
    ? getAttemptRemovedItems(preferredRescueAttempt)
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
  const manualFitViewContext = {
    AttemptTimelinePreview,
    FIT_HERE_LOADING_STEPS,
    acknowledgedRemovedHotspotIds,
    allRemovalAcknowledged,
    attempt,
    baseTimeline,
    buildLoadingSteps,
    changesRequiredDisplay,
    config,
    confirmButtonLabel,
    confirmLoading,
    displayedRemovedItems,
    failedReason,
    formatPriorityText,
    getAttemptedTimeLabel,
    getHotspotDurationLabel,
    getHotspotTimingLabel,
    getRemovalExplanationText,
    getRowName,
    getRowOperatingHoursLabel,
    getRowTime,
    getShortName,
    getStepIcon,
    getStepTextClass,
    hasDisplayedRemovals,
    hasOpeningHoursRescueAttempts,
    hasTimingRisk,
    hasUnauthorizedP3Removal,
    hasUnauthorizedProtectedRemoval,
    hasUnprovenProtectedRemoval,
    hotspotName,
    isSelectedClosedAtAttemptedTime,
    loading,
    loadingStepIndex,
    normalizeFitHereStatus,
    onClose,
    onConfirm,
    onRetry,
    open,
    openingHoursRescueAttempts,
    plannedRemovalIds,
    removalAcknowledgementLabel,
    requiresRemovalAcknowledgement,
    resultMessage,
    selectedHotspot,
    selectedOpeningConflict,
    setAcknowledgedRemovedHotspotIds,
    setShowRescueAttempts,
    shouldUseDangerConfirm,
    showRescueAttempts,
    timingRisk,
  };
  return <ManualFitHerePreviewDialogView context={manualFitViewContext} />;
}
