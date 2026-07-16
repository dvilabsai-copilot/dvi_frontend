import type { ItinerarySegment } from "../itinerary-details.types";

export function mapDaySegmentToPreview(
  segment: ItinerarySegment,
  extractTravelToFromText: (value: unknown) => string,
): Record<string, unknown> | null {
  if (!segment || segment.type === "hotspot") return null;

  const raw = segment as unknown as Record<string, unknown>;
  if (segment.type === "attraction") {
    return {
      type: "attraction",
      text: raw.name,
      timeRange: raw.visitTime || null,
      visitTime: raw.visitTime || null,
      duration: raw.duration || null,
      timings: raw.timings || null,
      priority: raw.priority ?? null,
      locationId: Number(raw.hotspotId ?? raw.locationId ?? 0) || null,
      isConflict: raw.isConflict === true,
      conflictReason: raw.conflictReason ?? null,
    };
  }

  if (segment.type === "travel") {
    const resolvedTo = String(raw.to || extractTravelToFromText(raw.text) || "").trim();
    return {
      type: "travel",
      text: resolvedTo ? `Travel to ${resolvedTo}` : (raw.text || "Travel"),
      timeRange: raw.timeRange || null,
      locationId: null,
      isConflict: raw.isConflict === true,
      conflictReason: raw.conflictReason ?? null,
      from: raw.from,
      to: raw.to,
      fromName: raw.from,
      toName: raw.to,
      displayFromName: raw.from,
      displayToName: raw.to,
      distance: raw.distance || null,
      duration: raw.duration || null,
    };
  }

  if (segment.type === "start") {
    return { type: "start", text: raw.title || "Start", timeRange: raw.timeRange || null, locationId: null };
  }
  if (segment.type === "break") {
    return { type: "break", text: `Break at ${raw.location}`, timeRange: raw.timeRange || null, locationId: null };
  }
  if (segment.type === "checkin") {
    return { type: "checkin", text: `Check-in at ${raw.hotelName}`, timeRange: raw.time || null, locationId: null };
  }
  if (segment.type === "return") {
    return { type: "return", text: "Return", timeRange: raw.time || null, locationId: null };
  }

  return null;
}
