import React from "react";

type WaitingSegment = {
  text?: string;
  reason?: string;
  gapMinutes?: number;
};

type HotspotPreviewWaitingSegmentProps = {
  segment: WaitingSegment;
  index: number;
  timeRange: string;
};

/** Renders a synthetic waiting/break gap in the proposed timeline. */
export const HotspotPreviewWaitingSegment: React.FC<HotspotPreviewWaitingSegmentProps> = ({ segment, index, timeRange }) => (
  <div key={`${index}-waiting`} className="rounded-lg border-2 border-orange-200 bg-orange-50 p-3 transition-all">
    <div className="mb-1 flex items-start justify-between gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded bg-orange-200 px-1.5 py-0.5 text-[10px] font-bold uppercase text-orange-800">⏳ waiting</span>
        <span className="text-xs font-bold text-[#4a4260]">{timeRange}</span>
      </div>
    </div>
    <p className="text-sm font-bold text-orange-700">{segment.text || "Waiting"}</p>
    {segment.reason && <p className="mt-1 text-xs text-orange-600">{segment.reason}</p>}
    {Number(segment.gapMinutes || 0) > 0 && <p className="mt-1 text-xs text-orange-500">Gap: {Math.floor(Number(segment.gapMinutes) / 60) > 0 ? `${Math.floor(Number(segment.gapMinutes) / 60)}h ` : ""}{Number(segment.gapMinutes) % 60}min</p>}
  </div>
);

export default HotspotPreviewWaitingSegment;
