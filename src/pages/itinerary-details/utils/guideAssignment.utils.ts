import type {
  AttractionSegment,
  GuideAvailabilityResponse,
  ItineraryDay,
  ItineraryGuideAssignment,
} from "../itinerary-details.types";

export function findGuideAssignmentForDay(
  guideAssignments: ItineraryGuideAssignment[],
  day: ItineraryDay,
): ItineraryGuideAssignment | null {
  const dayAssignment = guideAssignments.find((assignment) => (
    Number(assignment.guideType || 0) === 2 &&
    Number(assignment.routeId || 0) === Number(day.id)
  )) ?? null;
  const wholeItineraryAssignment = guideAssignments.find(
    (assignment) => Number(assignment.guideType || 0) === 1,
  ) ?? null;

  return dayAssignment ?? wholeItineraryAssignment;
}

export function isGuidePriceAvailableForDay(
  guideAvailability: GuideAvailabilityResponse | null,
  guideForItinerary: number | string | null | undefined,
  day: ItineraryDay,
): boolean {
  if (!guideAvailability) return false;
  if (Number(guideForItinerary || 0) === 1) {
    return guideAvailability.wholeItineraryAvailable === true;
  }

  return guideAvailability.days.find((item) => Number(item.routeId || 0) === Number(day.id))?.available === true;
}

export function getGuideSlotWindowMinutes(slotId: number): { start: number; end: number } | null {

  switch (Number(slotId || 0)) {

    case 1:

      return { start: 8 * 60, end: 13 * 60 };

    case 2:

      return { start: 13 * 60, end: 18 * 60 };

    case 3:

      return { start: 8 * 60, end: 18 * 60 };

    case 4:

      return { start: 18 * 60, end: 21 * 60 };

    default:

      return null;

  }

}

function parseGuideDisplayTime(value: unknown): number | null {
  const text = String(value || "").trim();

  const match = text.match(
    /^(\d{1,2})(?::(\d{2}))?\s*(AM|PM)$/i,
  );

  if (!match) return null;

  let hour = Number(match[1]);
  const minute = Number(match[2] || 0);
  const period = match[3].toUpperCase();

  if (
    !Number.isInteger(hour) ||
    hour < 1 ||
    hour > 12 ||
    !Number.isInteger(minute) ||
    minute < 0 ||
    minute > 59
  ) {
    return null;
  }

  if (hour === 12) {
    hour = 0;
  }

  if (period === "PM") {
    hour += 12;
  }

  return hour * 60 + minute;
}

function formatGuideDisplayTime(totalMinutes: number): string {
  const normalized = ((totalMinutes % 1440) + 1440) % 1440;
  const hour24 = Math.floor(normalized / 60);
  const minute = normalized % 60;

  const period = hour24 >= 12 ? "PM" : "AM";
  const hour12 = hour24 % 12 || 12;

  return minute === 0
    ? `${hour12} ${period}`
    : `${hour12}:${String(minute).padStart(2, "0")} ${period}`;
}

export function getEffectiveGuideSlotLabel(
  slotId: number,
  dayStartTime?: string | null,
  dayEndTime?: string | null,
  fallbackLabel = "",
): string | null {
  const slotWindow = getGuideSlotWindowMinutes(slotId);

  if (!slotWindow) {
    return fallbackLabel || null;
  }

  const dayStart = parseGuideDisplayTime(dayStartTime);
  const dayEnd = parseGuideDisplayTime(dayEndTime);

  if (dayStart === null || dayEnd === null) {
    return fallbackLabel || null;
  }

  const normalizedDayEnd =
    dayEnd <= dayStart ? dayEnd + 1440 : dayEnd;

  const effectiveStart = Math.max(slotWindow.start, dayStart);
  const effectiveEnd = Math.min(slotWindow.end, normalizedDayEnd);

  if (effectiveEnd <= effectiveStart) {
    return null;
  }

  return `${formatGuideDisplayTime(effectiveStart)} to ${formatGuideDisplayTime(effectiveEnd)}`;
}
export function isAttractionCoveredByGuide(
  segment: AttractionSegment,
  assignment: ItineraryGuideAssignment | null,
  parseDisplayMinutes: (value: unknown, edge: "start" | "end") => number | null,
): boolean {
  if (!assignment) return false;

  const guideSlotIds = Array.isArray(assignment.guideSlotIds)
    ? assignment.guideSlotIds.map(Number).filter((slotId) => Number.isFinite(slotId) && slotId > 0)
    : [];
  if (guideSlotIds.length === 0) return true;

  const visitStart = parseDisplayMinutes(segment.visitTime, "start");
  const visitEnd = parseDisplayMinutes(segment.visitTime, "end");
  if (visitStart === null || visitEnd === null) return true;

  const normalizedVisitEnd = visitEnd <= visitStart ? visitEnd + 1440 : visitEnd;
  return guideSlotIds.some((slotId) => {
    const slotWindow = getGuideSlotWindowMinutes(slotId);
    if (!slotWindow) return false;
    const normalizedSlotEnd = slotWindow.end <= slotWindow.start
      ? slotWindow.end + 1440
      : slotWindow.end;
    return visitStart < normalizedSlotEnd && normalizedVisitEnd > slotWindow.start;
  });
}
