import type { AvailableHotspot } from "../itinerary-details.types";

export type PreviewTimelineRow = Record<string, unknown>;

function getStartMinutes(value: unknown): number {
  const raw = String(value || "").trim();
  const startPart = raw.split("-")[0]?.trim() || raw;
  const match = startPart.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (!match) return Number.MAX_SAFE_INTEGER;
  let hours = Number(match[1]);
  const minutes = Number(match[2]);
  const period = match[3].toUpperCase();
  if (period === "AM" && hours === 12) hours = 0;
  if (period === "PM" && hours !== 12) hours += 12;
  return (hours * 60) + minutes;
}

export function getSelectedPreviewSegments(
  availableHotspots: AvailableHotspot[],
  previewTimelinesByHotspot: Record<number, PreviewTimelineRow[]>,
  selectedHotspotIds: number[],
): PreviewTimelineRow[] {
  return selectedHotspotIds.map((hotspotId) => {
    const timeline = previewTimelinesByHotspot[hotspotId] || [];
    const candidates = timeline.filter((segment) => (
      segment?.type === "attraction" && Number(segment.locationId) === Number(hotspotId)
    ));
    const hasConflictCandidate = candidates.some((segment) => segment.isConflict === true);
    const fromTimeline = [...candidates].sort((first, second) => {
      const firstConflict = first.isConflict === true ? 1 : 0;
      const secondConflict = second.isConflict === true ? 1 : 0;
      if (firstConflict !== secondConflict) {
        return hasConflictCandidate
          ? secondConflict - firstConflict
          : firstConflict - secondConflict;
      }
      return getStartMinutes(first.timeRange) - getStartMinutes(second.timeRange);
    })[0];

    if (fromTimeline) {
      return { ...fromTimeline, isUserSelectedPreview: true, selectedHotspotId: hotspotId };
    }

    const hotspot = availableHotspots.find((item) => Number(item.id) === Number(hotspotId));
    return {
      type: "attraction",
      text: hotspot?.name || "Selected Hotspot",
      timeRange: null,
      locationId: hotspotId,
      isConflict: false,
      conflictReason: null,
      isUserSelectedPreview: true,
      selectedHotspotId: hotspotId,
    };
  });
}
