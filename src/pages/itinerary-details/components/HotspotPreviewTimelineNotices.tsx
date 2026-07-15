import React from "react";
import { HotspotPreviewOverflowLeakNotice } from "./HotspotPreviewOverflowLeakNotice";
import { HotspotPreviewOverflowResolvedHeader } from "./HotspotPreviewOverflowResolvedHeader";
import { HotspotPreviewResolvedTimelineNotice } from "./HotspotPreviewResolvedTimelineNotice";
import { HotspotPreviewRouteFitNotice } from "./HotspotPreviewRouteFitNotice";
import { HotspotPreviewDayEndOverflowNotice } from "./HotspotPreviewDayEndOverflowNotice";
import { HotspotPreviewRescheduleNotice } from "./HotspotPreviewRescheduleNotice";

type PlannedRemoval = {
  name?: string;
  priority?: number;
  reason?: string;
  removalReasonCode?: string;
};

type ManualInsertionFit = {
  rescheduleApplied?: boolean;
  exceedsDayEnd?: boolean;
  dayOverflowMinutes?: number;
  lowPriorityRemovalPlanPreview?: {
    resolved?: boolean;
    plannedRemovals?: PlannedRemoval[];
  };
};

type HotspotPreviewTimelineNoticesProps = {
  effectivePreviewTimelineLength: number;
  sameCityShuffleApplied: boolean;
  manualInsertionFit: ManualInsertionFit | null;
  resolvedEndLabel: string;
  resolvedRemovalTimelineLeak: boolean;
};

/** Renders warning/status notices immediately above the proposed hotspot timeline. */
export const HotspotPreviewTimelineNotices: React.FC<HotspotPreviewTimelineNoticesProps> = ({
  effectivePreviewTimelineLength,
  sameCityShuffleApplied,
  manualInsertionFit,
  resolvedEndLabel,
  resolvedRemovalTimelineLeak,
}) => {
  if (effectivePreviewTimelineLength <= 0) return null;
  const removalPlan = manualInsertionFit?.lowPriorityRemovalPlanPreview;

  return (
    <>
      <HotspotPreviewRescheduleNotice visible={sameCityShuffleApplied} />
      {manualInsertionFit?.rescheduleApplied === true && (
        <div className="rounded-lg border border-blue-300 bg-blue-50 p-3 text-sm">
          <p className="font-semibold text-blue-900">✓ Timings recalculated after insertion.</p>
          <HotspotPreviewRouteFitNotice />
        </div>
      )}
      {manualInsertionFit?.exceedsDayEnd === true && removalPlan?.resolved !== true && (
        <div className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm">
          <p className="font-semibold text-amber-900">⚠ Timeline exceeds day end.</p>
          <HotspotPreviewDayEndOverflowNotice overflowMinutes={manualInsertionFit.dayOverflowMinutes || 0} />
        </div>
      )}
      {removalPlan?.resolved === true && (
        <div className="rounded-lg border border-orange-300 bg-orange-50 p-3 text-sm">
          <HotspotPreviewOverflowResolvedHeader endLabel={resolvedEndLabel} />
          {removalPlan.plannedRemovals && removalPlan.plannedRemovals.length > 0 ? (
            <ul className="mt-2 space-y-1">
              {removalPlan.plannedRemovals.map((row, index) => (
                <li key={index} className="text-xs leading-4 text-orange-900">
                  <span className="font-semibold">{row.name || "Unknown stop"}</span>
                  {row.priority ? <span className="ml-1 text-orange-700">(Work Priority {row.priority})</span> : null}
                  {row.reason ? <span className="text-orange-700"> — {row.reason}</span> : null}
                  {row.removalReasonCode ? <span className="ml-1 font-mono uppercase tracking-wide text-orange-700">{row.removalReasonCode}</span> : null}
                </li>
              ))}
            </ul>
          ) : null}
          <HotspotPreviewResolvedTimelineNotice />
          <HotspotPreviewOverflowLeakNotice visible={import.meta.env.DEV && resolvedRemovalTimelineLeak} />
        </div>
      )}
    </>
  );
};

export default HotspotPreviewTimelineNotices;
