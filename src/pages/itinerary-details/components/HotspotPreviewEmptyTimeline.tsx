import React from "react";

export function HotspotPreviewEmptyTimeline() {
  return (
    <div className="flex flex-col items-center justify-center h-32 text-[#6c6c6c] border-2 border-dashed rounded-lg">
      <p className="text-sm">No timeline available for this route.</p>
    </div>
  );
}

export default HotspotPreviewEmptyTimeline;
