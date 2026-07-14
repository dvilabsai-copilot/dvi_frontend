import React from "react";
import type { AvailableHotspot, HotspotAnchor, ItineraryDay, ItinerarySegment } from "../itinerary-details.types";

export interface HotspotFitHereTimelineRowsProps {
  selectedFitHereDay: ItineraryDay;
  selectedFitHotspot: AvailableHotspot | null;
  buildFitHereAnchorForTimelineRow: (day: ItineraryDay, index: number) => HotspotAnchor | null;
  getFitHereSegmentLabel: (segment: ItinerarySegment) => string;
  getFitHereSegmentTime: (segment: ItinerarySegment) => string | null | undefined;
  renderFitHereButton: (day: ItineraryDay, anchor: HotspotAnchor) => React.ReactNode;
}

export function HotspotFitHereTimelineRows({
  selectedFitHereDay,
  selectedFitHotspot,
  buildFitHereAnchorForTimelineRow,
  getFitHereSegmentLabel,
  getFitHereSegmentTime,
  renderFitHereButton,
}: HotspotFitHereTimelineRowsProps) {
  return (
    <div className="space-y-3">
      {selectedFitHereDay.segments.map((segment, idx) => {
        if (segment.type === "hotspot") return null;

        const anchor = buildFitHereAnchorForTimelineRow(selectedFitHereDay, idx);
        const shouldRenderAnchor = Boolean(selectedFitHotspot && anchor);

        return (
          <React.Fragment key={`fit-here-row-${idx}`}>
            <div
              data-testid="fit-here-timeline-row"
              data-segment-type={segment.type}
              data-segment-label={getFitHereSegmentLabel(segment)}
              className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-slate-900">{getFitHereSegmentLabel(segment)}</p>
                  {getFitHereSegmentTime(segment) && (
                    <p className="mt-1 text-xs text-slate-500">{getFitHereSegmentTime(segment)}</p>
                  )}
                </div>
                <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-bold uppercase text-slate-600">
                  {segment.type}
                </span>
              </div>
            </div>
            {shouldRenderAnchor && anchor ? renderFitHereButton(selectedFitHereDay, anchor) : null}
          </React.Fragment>
        );
      })}
    </div>
  );
}

export default HotspotFitHereTimelineRows;
