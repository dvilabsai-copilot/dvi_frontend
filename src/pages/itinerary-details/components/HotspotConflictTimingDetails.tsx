import React from "react";

type TimelineSegment = {
  type?: string;
  timeRange?: string;
  toName?: string;
  to?: string;
  durationMin?: number;
  matrixFit?: {
    insertedStopDurationMin?: number;
    stopDurationMin?: number;
    visitDurationMin?: number;
    attractionDurationMin?: number;
  };
};

type HotspotConflictTimingDetailsProps = {
  segment: TimelineSegment;
  index: number;
  timeline: TimelineSegment[];
  activityDuration?: string;
  formatPreviewDuration: (value: unknown) => string;
  parseDisplayMinutes: (value: string, part: "start" | "end") => number | null;
  formatMinutesToDisplay: (value: number) => string;
};

const parseDurationMinutes = (value: unknown): number | null => {
  const raw = String(value || "").trim();
  if (!raw) return null;
  const h = raw.match(/(\d+)\s*(?:hour|hours|hr|hrs|h)/i);
  const m = raw.match(/(\d+)\s*(?:min|mins|m)/i);
  if (!h && !m) return null;
  const minutes = (h ? Number(h[1]) * 60 : 0) + (m ? Number(m[1]) : 0);
  return Number.isFinite(minutes) && minutes > 0 ? minutes : null;
};

const formatMinutesLabel = (minutes: number): string => {
  const safeMinutes = Math.max(1, Math.round(minutes));
  const hours = Math.floor(safeMinutes / 60);
  const mins = safeMinutes % 60;
  if (hours > 0 && mins > 0) return `${hours}h ${mins}m`;
  if (hours > 0) return `${hours}h`;
  return `${mins}m`;
};

/** Calculates and renders the detailed timing explanation for a conflicting hotspot. */
export const HotspotConflictTimingDetails: React.FC<HotspotConflictTimingDetailsProps> = ({
  segment,
  index,
  timeline,
  activityDuration,
  formatPreviewDuration,
  parseDisplayMinutes,
  formatMinutesToDisplay,
}) => {
  const getTimeRangeDurationMinutes = (range: string): number | null => {
    const start = parseDisplayMinutes(range, "start");
    const end = parseDisplayMinutes(range, "end");
    if (start == null || end == null) return null;
    let delta = end - start;
    if (delta < 0) delta += 24 * 60;
    return delta > 0 ? delta : null;
  };

  const prevSeg = index > 0 ? timeline[index - 1] : null;
  const nextSeg = index + 1 < timeline.length ? timeline[index + 1] : null;
  const prevSegType = String(prevSeg?.type || "").toLowerCase();
  const nextSegType = String(nextSeg?.type || "").toLowerCase();
  let nearestPrevTravel: TimelineSegment | null = null;
  for (let p = index - 1; p >= 0; p -= 1) {
    const candidate = timeline[p];
    if (String(candidate?.type || "").toLowerCase() === "travel" && String(candidate?.timeRange || "").trim()) {
      nearestPrevTravel = candidate;
      break;
    }
  }
  let nearestNextTravel: TimelineSegment | null = null;
  for (let n = index + 1; n < timeline.length; n += 1) {
    const candidate = timeline[n];
    if (String(candidate?.type || "").toLowerCase() === "travel" && String(candidate?.timeRange || "").trim()) {
      nearestNextTravel = candidate;
      break;
    }
  }

  const arrivalMinutesFromPrev = (prevSegType === "travel"
    ? parseDisplayMinutes(String(prevSeg?.timeRange || ""), "end")
    : null) ?? parseDisplayMinutes(String(nearestPrevTravel?.timeRange || ""), "end");
  const nextTravelStartMinutes = parseDisplayMinutes(String(nextSeg?.timeRange || nearestNextTravel?.timeRange || ""), "start");
  const stayMinutesFromText = parseDurationMinutes(activityDuration);
  const stayMinutesFromMeta = Number(
    segment?.durationMin
    ?? segment?.matrixFit?.insertedStopDurationMin
    ?? segment?.matrixFit?.stopDurationMin
    ?? segment?.matrixFit?.visitDurationMin
    ?? segment?.matrixFit?.attractionDurationMin
    ?? 0,
  );
  let stayMinutes = stayMinutesFromText
    ?? (Number.isFinite(stayMinutesFromMeta) && stayMinutesFromMeta > 0 ? Math.max(1, Math.round(stayMinutesFromMeta)) : null);
  if (stayMinutes == null && arrivalMinutesFromPrev != null && nextTravelStartMinutes != null && nextTravelStartMinutes > arrivalMinutesFromPrev) {
    stayMinutes = Math.max(1, Math.round(nextTravelStartMinutes - arrivalMinutesFromPrev));
  }
  let arrivalMinutes = arrivalMinutesFromPrev;
  if (arrivalMinutes == null && nextTravelStartMinutes != null && stayMinutes != null) arrivalMinutes = nextTravelStartMinutes - stayMinutes;
  const stayLabel = formatPreviewDuration(activityDuration) || (stayMinutes != null ? formatMinutesLabel(stayMinutes) : "");
  const departureMinutes = arrivalMinutes != null && stayMinutes != null ? arrivalMinutes + stayMinutes : null;
  const nextTravelTo = nextSegType === "travel"
    ? String(nextSeg?.toName || nextSeg?.to || "").trim()
    : String(nearestNextTravel?.toName || nearestNextTravel?.to || "").trim();
  const nextTravelRange = nextSegType === "travel"
    ? String(nextSeg?.timeRange || "").trim()
    : String(nearestNextTravel?.timeRange || "").trim();
  const nextTravelDurationMinutes = getTimeRangeDurationMinutes(nextTravelRange);
  const hasTravelTimingConflict = departureMinutes != null && nextTravelStartMinutes != null && departureMinutes > nextTravelStartMinutes;
  const effectiveTravelStartMinutes = hasTravelTimingConflict ? departureMinutes : nextTravelStartMinutes;
  const effectiveTravelEndMinutes = effectiveTravelStartMinutes != null && nextTravelDurationMinutes != null
    ? effectiveTravelStartMinutes + nextTravelDurationMinutes
    : null;
  const effectiveTravelRange = effectiveTravelStartMinutes != null && effectiveTravelEndMinutes != null
    ? `${formatMinutesToDisplay(effectiveTravelStartMinutes)} - ${formatMinutesToDisplay(effectiveTravelEndMinutes)}`
    : nextTravelRange;

  if (arrivalMinutes == null && !stayLabel && !nextTravelTo && !nextTravelRange) return null;

  return (
    <div className="mt-1.5 space-y-1 text-[11px] text-red-700">
      <p>Proposed arrival after anchor travel: {arrivalMinutes != null ? formatMinutesToDisplay(arrivalMinutes) : "before the next onward leg"}</p>
      <p>Planned stay at hotspot: {stayLabel || "as configured for this hotspot"}{departureMinutes != null ? ` (leave around ${formatMinutesToDisplay(departureMinutes)})` : ""}</p>
      {(nextTravelTo || nextTravelRange) && <p>Then travel to {nextTravelTo || "hotel"}{effectiveTravelRange ? ` (${effectiveTravelRange})` : ""}{hasTravelTimingConflict ? " after reschedule" : ""}</p>}
    </div>
  );
};

export default HotspotConflictTimingDetails;
