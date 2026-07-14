import React from "react";

export interface HotspotPreviewDayEndOverflowNoticeProps {
  overflowMinutes: number | string;
}

export function HotspotPreviewDayEndOverflowNotice({ overflowMinutes }: HotspotPreviewDayEndOverflowNoticeProps) {
  return (
    <p className="text-xs text-amber-800 mt-1">
      Final hotel check-in would exceed day end by {overflowMinutes || 0} minutes.
    </p>
  );
}

export default HotspotPreviewDayEndOverflowNotice;
