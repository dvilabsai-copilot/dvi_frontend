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
