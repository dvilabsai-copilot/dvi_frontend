import type {
  AttractionSegment,
  ItineraryDay,
  ItinerarySegment,
  StartSegment,
} from "../itinerary-details.types";

export function getFitHereSegmentLabel(segment: ItinerarySegment | null | undefined): string {
  if (!segment) return "Timeline row";
  const raw = segment as unknown as Record<string, unknown>;
  if (segment.type === "attraction") return String(raw.name || "Hotspot");
  if (segment.type === "travel") {
    const travelText = String(raw.to || raw.text || "Travel").trim();
    return travelText.startsWith("Travel") ? travelText : `Travel to ${travelText}`;
  }
  if (segment.type === "checkin") return String(raw.hotelName || "Hotel");
  if (segment.type === "break") return String(raw.location || "Break");
  if (segment.type === "start") return String(raw.title || "Route start");
  if (segment.type === "return") return "Return";
  return String(raw.text || raw.title || "Timeline row");
}

export function getFitHereSegmentTime(segment: ItinerarySegment | null | undefined): string {
  if (!segment) return "";
  const raw = segment as unknown as Record<string, unknown>;
  return String(raw.visitTime || raw.timeRange || raw.time || "").trim();
}

export function isFitHereStartSegment(
  segment: ItinerarySegment | null | undefined,
): segment is StartSegment {
  return segment?.type === "start";
}

export function isFitHereAttractionSegment(
  segment: ItinerarySegment | null | undefined,
): segment is AttractionSegment {
  return segment?.type === "attraction";
}

export function getAttractionHotspotId(segment: ItinerarySegment | null | undefined): number | null {
  if (!isFitHereAttractionSegment(segment)) return null;
  return Number(segment.hotspotId || segment.locationId || 0) || null;
}

export function getAttractionRouteHotspotId(segment: ItinerarySegment | null | undefined): number | null {
  if (!isFitHereAttractionSegment(segment)) return null;
  return Number(segment.routeHotspotId || 0) || null;
}

export function findNextAttractionAfterIndex(day: ItineraryDay, startIndex: number): AttractionSegment | null {
  for (let index = startIndex + 1; index < day.segments.length; index += 1) {
    const candidate = day.segments[index];
    if (candidate?.type === "attraction") return candidate as AttractionSegment;
  }
  return null;
}
