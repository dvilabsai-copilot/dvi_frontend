import React from "react";
import { Clock, Timer } from "lucide-react";

type HotspotPreviewAttractionMetaProps = {
  priorityLabel?: string | number | null;
  activityVisitTime?: string;
  activityDuration?: string;
  activityDurationLabel?: string;
  activityTimings?: string;
};

/** Renders the compact priority, visit-time, duration, and timing badges for an attraction row. */
export const HotspotPreviewAttractionMeta: React.FC<HotspotPreviewAttractionMetaProps> = ({
  priorityLabel,
  activityVisitTime,
  activityDuration,
  activityDurationLabel,
  activityTimings,
}) => (
  <div className="mt-2 flex flex-wrap gap-3 text-xs text-[#6c6c6c]">
    {priorityLabel !== null && priorityLabel !== undefined && <span className="flex items-center rounded border border-indigo-100 bg-indigo-50 px-2 py-1 font-bold text-indigo-700">Priority: {priorityLabel}</span>}
    {activityVisitTime && <span className="flex items-center rounded border border-[#f3e8ff] bg-[#fdf6ff] px-2 py-1 font-bold text-[#d546ab]"><Clock className="mr-1 h-3 w-3" />{activityVisitTime}</span>}
    {activityDuration && <span className="flex items-center"><Clock className="mr-1 h-3 w-3" />{activityDurationLabel}</span>}
    {activityTimings && <span className="flex items-center"><Timer className="mr-1 h-3 w-3" />{activityTimings}</span>}
  </div>
);

export default HotspotPreviewAttractionMeta;
