import type { AttractionSegment, HotspotAnchor, ItineraryDay } from "../itinerary-details.types";

export function buildAutoPreviewAnchorProgressText(day: ItineraryDay, anchor: HotspotAnchor): string {
  const attractionRows = day.segments
    .map((segment, index) => ({ segment, index }))
    .filter(({ segment }) => segment?.type === "attraction");
  const startIndex = anchor.anchorIntent === "AFTER_START"
    ? 0
    : attractionRows.findIndex(({ segment }) => {
        const attraction = segment as AttractionSegment;
        const hotspotId = Number(attraction.hotspotId || attraction.locationId || 0);
        const routeHotspotId = Number(attraction.routeHotspotId || 0);
        return hotspotId === Number(anchor.afterHotspotId || 0)
          || routeHotspotId === Number(anchor.afterRouteHotspotId || 0);
      }) + 1;
  const downstreamHotspots = attractionRows
    .slice(Math.max(0, startIndex))
    .map(({ segment }) => String((segment as AttractionSegment).name || "").trim())
    .filter(Boolean);
  const previewLabels = downstreamHotspots.slice(0, 4);
  if (day.segments.some((segment) => segment?.type === "checkin")) previewLabels.push("Hotel check-in");
  if (previewLabels.length === 0) return "Rebuilding this position and validating the final timeline.";
  return `Rebuilding downstream timeline: ${previewLabels.join(" -> ")}`;
}
