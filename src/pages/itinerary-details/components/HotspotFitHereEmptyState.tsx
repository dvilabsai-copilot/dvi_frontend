import React from "react";

export interface HotspotFitHereEmptyStateProps {
  visible: boolean;
}

export function HotspotFitHereEmptyState({ visible }: HotspotFitHereEmptyStateProps) {
  if (!visible) return null;

  return (
    <div className="mb-4 rounded-2xl border border-slate-200 bg-slate-50 p-5">
      <p className="text-sm font-semibold text-slate-900">Select a hotspot to start Fit Here mode</p>
      <p className="mt-1 text-sm text-slate-600">
        Pick a hotspot from the left, then choose the exact insertion anchor on this timeline.
      </p>
    </div>
  );
}

export default HotspotFitHereEmptyState;
