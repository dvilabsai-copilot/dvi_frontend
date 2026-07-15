import React from "react";

type HotspotConflictNoticeProps = { conflictReason?: string };

/** Renders the conflict explanation heading while the detailed timing analysis remains below it. */
export const HotspotConflictNotice: React.FC<HotspotConflictNoticeProps> = ({ conflictReason }) => (
  <p className="text-xs font-medium leading-tight text-red-600">
    {/forced manual insertion after user confirmation/i.test(String(conflictReason || ""))
      ? "Manual override confirmed. This stop will be included; exact timing may shift."
      : conflictReason}
  </p>
);

export default HotspotConflictNotice;
