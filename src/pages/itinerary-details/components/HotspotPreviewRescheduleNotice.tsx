import React from "react";

export interface HotspotPreviewRescheduleNoticeProps {
  visible: boolean;
}

export function HotspotPreviewRescheduleNotice({ visible }: HotspotPreviewRescheduleNoticeProps) {
  if (!visible) return null;

  return (
    <div className="mb-2 rounded-xl border border-blue-200 bg-blue-50 p-3 text-xs text-blue-800">
      <p className="font-bold">Timings reshuffled to fit manual hotspot</p>
      <p className="mt-1">
        The system reordered nearby same-city hotspots based on opening and closing time before removing any hotspot.
      </p>
    </div>
  );
}

export default HotspotPreviewRescheduleNotice;
