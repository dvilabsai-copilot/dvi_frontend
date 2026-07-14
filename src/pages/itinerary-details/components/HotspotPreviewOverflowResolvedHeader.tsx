import React from "react";

export interface HotspotPreviewOverflowResolvedHeaderProps {
  endLabel: string;
}

export function HotspotPreviewOverflowResolvedHeader({ endLabel }: HotspotPreviewOverflowResolvedHeaderProps) {
  return (
    <>
      <p className="font-semibold text-orange-900">Overflow resolved by removing lower-priority hotspots.</p>
      <p className="text-xs text-orange-700 mt-1 leading-4">
        To fit this manual hotspot and keep hotel check-in before {endLabel}, these lower-priority hotspots will be removed:
      </p>
    </>
  );
}

export default HotspotPreviewOverflowResolvedHeader;
