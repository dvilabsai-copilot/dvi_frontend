import type {
  AttractionSegment,
  HotspotAnchor,
  ItineraryDay,
  ItinerarySegment,
  StartSegment,
} from "../itinerary-details.types";

interface FitHereAnchorBuilderOptions {
  getSegmentLabel: (segment: ItinerarySegment | null | undefined) => string;
  getSegmentTime: (segment: ItinerarySegment | null | undefined) => string;
  isStartSegment: (segment: ItinerarySegment | null | undefined) => segment is StartSegment;
  isAttractionSegment: (segment: ItinerarySegment | null | undefined) => segment is AttractionSegment;
  findNextAttraction: (day: ItineraryDay, index: number) => AttractionSegment | null;
  getAttractionHotspotId: (segment: ItinerarySegment | null | undefined) => number | null;
  getAttractionRouteHotspotId: (segment: ItinerarySegment | null | undefined) => number | null;
}

export function buildFitHereAnchorForTimelineRow(
  day: ItineraryDay,
  index: number,
  options: FitHereAnchorBuilderOptions,
): HotspotAnchor | null {
  const current = day.segments[index] || null;
  const next = day.segments[index + 1] || null;
  if (!current) return null;

  if (options.isStartSegment(current)) {
    const nextAttraction = options.findNextAttraction(day, index);
    return {
      anchorType: "BETWEEN_ROWS",
      anchorIndex: index,
      anchorIntent: "AFTER_START",
      anchorFrom: options.getSegmentLabel(current),
      anchorTo: nextAttraction
        ? options.getSegmentLabel(nextAttraction)
        : options.getSegmentLabel(next),
      anchorLabel: nextAttraction
        ? `Before first attraction: ${options.getSegmentLabel(nextAttraction)}`
        : "After start",
      anchorTimeRange: options.getSegmentTime(current) || null,
      afterRowType: current.type,
      beforeRowType: next?.type,
      afterHotspotId: null,
      afterRouteHotspotId: null,
      beforeHotspotId: options.getAttractionHotspotId(nextAttraction),
      beforeRouteHotspotId: options.getAttractionRouteHotspotId(nextAttraction),
      isBeforeHotel: false,
    };
  }

  if (options.isAttractionSegment(current)) {
    const nextAttraction = options.findNextAttraction(day, index);
    return {
      anchorType: "BETWEEN_ROWS",
      anchorIndex: index,
      anchorIntent: "AFTER_ATTRACTION",
      anchorFrom: options.getSegmentLabel(current),
      anchorTo: nextAttraction
        ? options.getSegmentLabel(nextAttraction)
        : options.getSegmentLabel(next),
      anchorLabel: `After ${options.getSegmentLabel(current)}`,
      anchorTimeRange: options.getSegmentTime(current) || null,
      afterRowType: current.type,
      beforeRowType: next?.type,
      afterHotspotId: options.getAttractionHotspotId(current),
      afterRouteHotspotId: options.getAttractionRouteHotspotId(current),
      beforeHotspotId: options.getAttractionHotspotId(nextAttraction),
      beforeRouteHotspotId: options.getAttractionRouteHotspotId(nextAttraction),
      isBeforeHotel: false,
    };
  }

  return null;
}
