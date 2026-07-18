/* eslint-disable @typescript-eslint/no-explicit-any */
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
import { AutoFitHerePreviewDialogView } from "./AutoFitHerePreviewDialogView";
import { getTimelineRowDistance, getTimelineRowName, getTimelineRowTime } from "./AutoFitHerePreviewTimelineUtils";
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
  status?: "PENDING" | "RUNNING" | "COMPLETED" | "FAILED";
  score?: number;
  rankReason?: string;
  removedCount?: number;
  error?: string;
  progressText?: string;
  elapsedMs?: number;
};
type AutoFitHerePreviewDialogProps = {
  open: boolean;
  loading?: boolean;
  failedReason?: string | null;
  results: AutoFitHerePreviewResultRow[];
  selectedAnchorKey: string | null;
  selectedHotspot?: any | null;
  baseTimeline?: any[] | null;
  loadingAnchorCount?: number;
  loadingStartedAtMs?: number | null;
  performanceSummary?: {
    totalElapsedMs?: number;
    avgAnchorMs?: number;
    slowestAnchorLabel?: string | null;
    slowestAnchorMs?: number;
  } | null;
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
const formatDurationValue = (value: unknown): string => {
  if (!value) return "";
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    const hours = value.getUTCHours();
    const minutes = value.getUTCMinutes();
    return formatPreviewMinutes((hours * 60) + minutes);
  }
  const raw = String(value || "").trim();
  if (!raw) return "";
  const hmsMatch = raw.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
  if (hmsMatch) {
    const hours = Number(hmsMatch[1] || 0);
    const minutes = Number(hmsMatch[2] || 0);
    return formatPreviewMinutes((hours * 60) + minutes);
  }
  const isoDate = new Date(raw);
  if (/^\d{4}-\d{2}-\d{2}T/.test(raw) && !Number.isNaN(isoDate.getTime())) {
    const hours = isoDate.getUTCHours();
    const minutes = isoDate.getUTCMinutes();
    return formatPreviewMinutes((hours * 60) + minutes);
  }
  const localDateLabelMatch = raw.match(/\b(\d{1,2}):(\d{2})(?::(\d{2}))?\b/);
  if (
    localDateLabelMatch &&
    /(?:sun|mon|tue|wed|thu|fri|sat)\s+(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)/i.test(raw)
  ) {
    const hours = Number(localDateLabelMatch[1] || 0);
    const minutes = Number(localDateLabelMatch[2] || 0);
    return formatPreviewMinutes((hours * 60) + minutes);
  }
  return raw;
};
const getTimelineRowDuration = (row: any): string =>
  formatDurationValue(
    row?.duration ||
      row?.hotspot_traveling_time ||
      row?.travelDuration ||
      "",
  ).trim();
const formatPreviewMinutes = (minutes: number): string => {
  const safeMinutes = Math.max(0, Math.round(minutes));
  const hours = Math.floor(safeMinutes / 60);
  const remainder = safeMinutes % 60;
  if (hours > 0 && remainder > 0) {
    return `${hours} Hour${hours === 1 ? "" : "s"} ${remainder} Min`;
  }
  if (hours > 0) {
    return `${hours} Hour${hours === 1 ? "" : "s"}`;
  }
  return `${remainder} Min`;
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
  const hasHardExactAnchorMismatch =
    String(attempt?.authoritativeTimelineSource || "").toUpperCase() === "EXACT_ANCHOR_NO_VALID_RESULT" &&
    (!Array.isArray(attempt?.finalizedTimeline) || attempt.finalizedTimeline.length === 0) &&
    (!Array.isArray(attempt?.proposedTimeline) || attempt.proposedTimeline.length === 0) &&
    attempt?.canConfirm !== true;
  if (hasHardExactAnchorMismatch) {
    return [];
  }
  if (Array.isArray(attempt?.finalizedTimeline) && attempt.finalizedTimeline.length > 0) {
    return attempt.finalizedTimeline;
  }
  if (Array.isArray(attempt?.proposedTimeline) && attempt.proposedTimeline.length > 0) {
    return attempt.proposedTimeline;
  }
  return [];
};
const extractCheckinHotelLabel = (row: any): string => {
  const raw = String(
    row?.hotelName ||
    row?.name ||
    row?.title ||
    row?.text ||
    "Hotel",
  ).trim();
  const stripped = raw
    .replace(/^check-?in\s+(?:to|at)\s+/i, "")
    .replace(/^hotel\s*:\s*/i, "")
    .trim();
  return stripped || "Hotel";
};
const formatPreviewClockLabelFromMinutes = (totalMinutes: number): string => {
  const normalized = ((Math.round(totalMinutes) % 1440) + 1440) % 1440;
  const hours24 = Math.floor(normalized / 60);
  const minutes = normalized % 60;
  const suffix = hours24 >= 12 ? "PM" : "AM";
  const hours12 = hours24 % 12 || 12;
  return `${String(hours12).padStart(2, "0")}:${String(minutes).padStart(2, "0")} ${suffix}`;
};
const reconcileHotelTravelInTimeline = (timelineRows: any[]): any[] => {
  const rows = Array.isArray(timelineRows) ? [...timelineRows] : [];
  if (rows.length === 0) return rows;
  const isCheckinRow = (row: any): boolean => {
    const type = String(row?.type || "").toLowerCase();
    const label = getTimelineRowName(row).toLowerCase();
    return type === "hotel" || type === "checkin" || label.includes("check-in at");
  };
  const isTravelRow = (row: any): boolean =>
    String(row?.type || "").toLowerCase() === "travel";
  for (let checkinIndex = 0; checkinIndex < rows.length; checkinIndex += 1) {
    const checkinRow = rows[checkinIndex];
    if (!isCheckinRow(checkinRow)) continue;
    const hotelLabel = extractCheckinHotelLabel(checkinRow);
    let previousIndex = checkinIndex - 1;
    while (previousIndex >= 0 && String(rows[previousIndex]?.type || "").toLowerCase() === "hotspot") {
      previousIndex -= 1;
    }
    if (previousIndex < 0) continue;
    const previousRow = rows[previousIndex];
    const previousLabel = getTimelineRowName(previousRow);
    const alreadyTravelToHotel =
      isTravelRow(previousRow) &&
      String(previousRow?.to || previousRow?.toName || previousRow?.displayToName || previousLabel || "")
        .trim()
        .toLowerCase() === hotelLabel.toLowerCase();
    if (alreadyTravelToHotel || isCheckinRow(previousRow) || previousLabel.trim().toLowerCase() === hotelLabel.toLowerCase()) {
      rows[checkinIndex] = {
        ...checkinRow,
        hotelName: hotelLabel,
        name: `Check-in at ${hotelLabel}`,
        text: `Check-in at ${hotelLabel}`,
      };
      continue;
    }
    const previousEndMinutes = getTimeRangeEndMinutes(getTimelineRowTime(previousRow));
    const checkinStartMinutes = getTimeRangeStartMinutes(getTimelineRowTime(checkinRow));
    if (previousEndMinutes == null || checkinStartMinutes == null || checkinStartMinutes < previousEndMinutes) {
      rows[checkinIndex] = {
        ...checkinRow,
        hotelName: hotelLabel,
        name: `Check-in at ${hotelLabel}`,
        text: `Check-in at ${hotelLabel}`,
      };
      continue;
    }
    const gapMinutes = Math.max(0, checkinStartMinutes - previousEndMinutes);
    const syntheticTravelRow = {
      type: "travel",
      from: previousRow?.to || previousRow?.name || previousLabel,
      to: hotelLabel,
      fromName: previousRow?.to || previousRow?.name || previousLabel,
      toName: hotelLabel,
      displayFromName: previousRow?.to || previousRow?.name || previousLabel,
      displayToName: hotelLabel,
      name: `Travel to ${hotelLabel}`,
      text: `Travel to ${hotelLabel}`,
      timeRange: `${formatPreviewClockLabelFromMinutes(previousEndMinutes)} - ${formatPreviewClockLabelFromMinutes(checkinStartMinutes)}`,
      duration: gapMinutes > 0 ? formatPreviewMinutes(gapMinutes) : "",
      isSyntheticHotelTravel: true,
    };
    rows.splice(checkinIndex, 0, syntheticTravelRow);
    checkinIndex += 1;
    rows[checkinIndex] = {
      ...checkinRow,
      hotelName: hotelLabel,
      name: `Check-in at ${hotelLabel}`,
      text: `Check-in at ${hotelLabel}`,
    };
  }
  return rows;
};
const getTimeRangeEndMinutes = (value: unknown): number | null => {
  const raw = String(value || "").trim();
  if (!raw) return null;
  const normalized = raw.replace(/\u2013|\u2014/g, "-");
  const parts = normalized.split(" - ").map((part) => part.trim()).filter(Boolean);
  const target = parts.length > 1 ? parts[parts.length - 1] : parts[0];
  return parseFitPreviewTimeToMinutes(target);
};
const getTimeRangeStartMinutes = (value: unknown): number | null => {
  const raw = String(value || "").trim();
  if (!raw) return null;
  const normalized = raw.replace(/\u2013|\u2014/g, "-");
  const parts = normalized.split(" - ").map((part) => part.trim()).filter(Boolean);
  const target = parts[0] || "";
  return parseFitPreviewTimeToMinutes(target);
};
const getHotelGapWarning = (timelineRows: any[]): {
  previousRowName: string;
  gapMinutes: number;
} | null => {
  const rows = Array.isArray(timelineRows) ? timelineRows : [];
  const hotelIndex = rows.findIndex((row: any) => {
    const type = String(row?.type || "").toLowerCase();
    const name = getTimelineRowName(row).toLowerCase();
    return type === "hotel" || name.includes("check-in at");
  });
  if (hotelIndex <= 0) return null;
  const hotelRow = rows[hotelIndex];
  const previousRow = rows[hotelIndex - 1];
  const previousEndMinutes = getTimeRangeEndMinutes(getTimelineRowTime(previousRow));
  const hotelStartMinutes = getTimeRangeStartMinutes(getTimelineRowTime(hotelRow));
  if (previousEndMinutes == null || hotelStartMinutes == null) return null;
  const gapMinutes = hotelStartMinutes - previousEndMinutes;
  if (!Number.isFinite(gapMinutes) || gapMinutes < 90) return null;
  return {
    previousRowName: getTimelineRowName(previousRow),
    gapMinutes,
  };
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
const getBaseTimelineAttractions = (baseTimeline: any[] | null | undefined) => {
  return (Array.isArray(baseTimeline) ? baseTimeline : [])
    .filter((row: any) => String(row?.type || "").toLowerCase() === "attraction")
    .map((row: any) => {
      const hotspotId = getRowHotspotId(row);
      return {
        hotspotId,
        name: getTimelineRowName(row),
        workPriority:
          Number(
            row?.priority ||
            row?.hotspotPriority ||
            row?.hotspot_priority ||
            row?.rawPriority ||
            0,
          ) || null,
      };
    })
    .filter((row) => row.hotspotId > 0);
};
const buildTimelineRemovedItems = (
  baseTimeline: any[] | null | undefined,
  finalizedTimeline: any[],
  selectedHotspotId?: number | null,
): Array<{
  hotspotId: number;
  name: string;
  workPriority: number | null;
  reason: string | null;
}> => {
  const baseAttractions = getBaseTimelineAttractions(baseTimeline);
  if (baseAttractions.length === 0) return [];
  const finalizedAttractionIds = new Set(
    (Array.isArray(finalizedTimeline) ? finalizedTimeline : [])
      .filter((row: any) => String(row?.type || "").toLowerCase() === "attraction")
      .map((row: any) => getRowHotspotId(row))
      .filter((id: number) => id > 0),
  );
  const selectedId = Number(selectedHotspotId || 0);
  return baseAttractions
    .filter((row) => row.hotspotId !== selectedId)
    .filter((row) => !finalizedAttractionIds.has(row.hotspotId))
    .map((row) => ({
      hotspotId: row.hotspotId,
      name: row.name,
      workPriority: row.workPriority,
      reason: "Removed from the original route in the finalized sequence.",
    }));
};
const hasTimelineReorder = (
  baseTimeline: any[] | null | undefined,
  finalizedTimeline: any[],
): boolean => {
  const baseIds = getBaseTimelineAttractions(baseTimeline).map((row) => row.hotspotId);
  const finalizedIds = (Array.isArray(finalizedTimeline) ? finalizedTimeline : [])
    .filter((row: any) => String(row?.type || "").toLowerCase() === "attraction")
    .map((row: any) => getRowHotspotId(row))
    .filter((id: number) => id > 0);
  const sharedBase = baseIds.filter((id) => finalizedIds.includes(id));
  const sharedFinal = finalizedIds.filter((id) => sharedBase.includes(id));
  if (sharedBase.length <= 1 || sharedFinal.length <= 1) return false;
  return sharedBase.join("|") !== sharedFinal.join("|");
};
const hasShiftedTimelineRows = (timelineRows: any[]): boolean => {
  return (Array.isArray(timelineRows) ? timelineRows : []).some((row: any) => (
    row?.shifted === true ||
    row?.isShifted === true ||
    row?.shiftedLater === true
  ));
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
  baseTimeline?: any[] | null,
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
  hasReorderedTimeline: boolean;
  hasShiftedTimeline: boolean;
  hasExactAnchorMismatch: boolean;
  summary: string;
  badgeText: string;
  badgeTone: "success" | "warning" | "danger" | "neutral";
} => {
  const attempt = (row?.attempt || null) as ManualFitHerePreviewResponse | null;
  const timelineRows = reconcileHotelTravelInTimeline(getTimelineRows(attempt));
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
  const hasExactAnchorMismatch =
    String(attempt?.authoritativeTimelineSource || "").toUpperCase() === "EXACT_ANCHOR_NO_VALID_RESULT" &&
    (!Array.isArray(attempt?.finalizedTimeline) || attempt.finalizedTimeline.length === 0) &&
    (!Array.isArray(attempt?.proposedTimeline) || attempt.proposedTimeline.length === 0) &&
    attempt?.canConfirm !== true;
  const timelineRemovedItems = buildTimelineRemovedItems(
    hasExactAnchorMismatch ? [] : baseTimeline,
    hasExactAnchorMismatch ? [] : timelineRows,
    attempt?.selectedHotspotId,
  );
  const displayedRemovedItems = (
    [
      ...(Array.isArray(changesRequiredDisplay?.removedItems) ? changesRequiredDisplay.removedItems : []),
      ...removedItemsFromRows,
      ...timelineRemovedItems,
    ]
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
    hasExactAnchorMismatch ||
    (
      displayedRemovedItems.length === 0 &&
      removedItemsFromRows.length === 0 &&
      (!Array.isArray(changesRequiredDisplay?.removedItems) || changesRequiredDisplay.removedItems.length === 0) &&
      !!preferredRescueAttempt &&
      getAttemptRemovedItems(preferredRescueAttempt).length > 0
    );
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
    hasReorderedTimeline: hasExactAnchorMismatch ? false : hasTimelineReorder(baseTimeline, timelineRows),
    hasShiftedTimeline: hasExactAnchorMismatch ? false : hasShiftedTimelineRows(timelineRows),
    hasExactAnchorMismatch,
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
  baseTimeline = null,
  loadingAnchorCount = 0,
  loadingStartedAtMs = null,
  performanceSummary = null,
  onClose,
  onSelectAnchorKey,
  onConfirm,
  confirmLoading = false,
}: AutoFitHerePreviewDialogProps) {
  const [loadingElapsedMs, setLoadingElapsedMs] = React.useState(0);
  const [removalsAcknowledged, setRemovalsAcknowledged] = React.useState(false);
  React.useEffect(() => {
    if (!open || !loading || !loadingStartedAtMs) {
      setLoadingElapsedMs(0);
      return;
    }
    const tick = () => {
      setLoadingElapsedMs(Math.max(0, Date.now() - loadingStartedAtMs));
    };
    tick();
    const timer = window.setInterval(tick, 500);
    return () => window.clearInterval(timer);
  }, [loading, loadingStartedAtMs, open]);
  React.useEffect(() => {
    setRemovalsAcknowledged(false);
  }, [open, selectedAnchorKey]);
  const selectedRow =
    results.find((row) => row.anchorKey === selectedAnchorKey) ||
    results[0] ||
    null;
  const selectedAttempt = (selectedRow?.attempt || null) as ManualFitHerePreviewResponse | null;
  const selectedState = deriveAutoPreviewAttemptState(selectedRow, baseTimeline);
  const hasAnyConfirmableResult = results.some((row) => deriveAutoPreviewAttemptState(row, baseTimeline).canConfirm);
  const timelineRows = selectedState.timelineRows;
  const removedItems = selectedState.displayedRemovedItems;
  const hotelGapWarning = getHotelGapWarning(timelineRows);
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
  const requiresRemovalAcknowledgement = selectedState.canConfirm && plannedRemovalIds.length > 0;
  const allRemovalAcknowledged = !requiresRemovalAcknowledgement || removalsAcknowledged;
  const canConfirm = selectedState.canConfirm && (!requiresRemovalAcknowledgement || allRemovalAcknowledged);
  const confirmButtonLabel = !canConfirm
    ? "Cannot Confirm This Position"
    : removedItems.length > 0
      ? "Confirm and Remove Hotspots"
      : "Confirm Fit Here";
  const elapsedSeconds = Math.max(1, Math.round(loadingElapsedMs / 1000));
  const completedLoadingRows = results.filter((row) => row?.status === "COMPLETED" || row?.status === "FAILED");
  const runningLoadingRow = results.find((row) => row?.status === "RUNNING") || null;
  const hotspotName = String(
    selectedHotspot?.name ||
      selectedHotspot?.title ||
      (selectedAttempt?.selectedHotspotId ? `Hotspot #${selectedAttempt.selectedHotspotId}` : "Selected hotspot"),
  ).trim();
  if (!open) return null;
  const autoFitViewContext = {
    allRemovalAcknowledged,
    baseTimeline,
    canConfirm,
    changesRequiredDisplay,
    completedLoadingRows,
    confirmButtonLabel,
    confirmLoading,
    deriveAutoPreviewAttemptState,
    elapsedSeconds,
    failedReason,
    formatPreviewMinutes,
    getAnchorLabel,
    getRowHotspotId,
    getTimelineRowDistance,
    getTimelineRowDuration,
    getTimelineRowName,
    getTimelineRowOperatingHours,
    getTimelineRowTime,
    hasAnyConfirmableResult,
    hotelGapWarning,
    hotspotName,
    loading,
    loadingAnchorCount,
    loadingStartedAtMs,
    onClose,
    onConfirm,
    onSelectAnchorKey,
    open,
    performanceSummary,
    plannedRemovalIds,
    removedItems,
    requiresRemovalAcknowledgement,
    resultConfig,
    resultMessage,
    results,
    runningLoadingRow,
    selectedAnchorKey,
    selectedAttempt,
    selectedHotspot,
    selectedRow,
    selectedState,
    setRemovalsAcknowledged,
    timelineRows
  };
  return <AutoFitHerePreviewDialogView context={autoFitViewContext} />;
}
