import React from "react";

export interface HotspotPreviewOverflowLeakNoticeProps {
  visible: boolean;
}

export function HotspotPreviewOverflowLeakNotice({ visible }: HotspotPreviewOverflowLeakNoticeProps) {
  if (!visible) return null;

  return (
    <p className="text-xs text-red-700 mt-2 font-semibold leading-4">
      BUG: resolved-removal timeline still contains planned removals.
    </p>
  );
}

export default HotspotPreviewOverflowLeakNotice;
