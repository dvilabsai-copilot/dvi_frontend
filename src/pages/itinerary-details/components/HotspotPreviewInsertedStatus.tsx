import React from "react";

type FitInsight = {
  label?: string;
  insertedLabel?: string;
  tone?: string;
  anchorLegLabel?: string;
  extraDistanceLabel?: string;
  reason?: string;
};

type HotspotPreviewInsertedStatusProps = {
  matrixRequiresBuild: boolean;
  activeAnchorFitInsight?: FitInsight | null;
  selectedSlotHasRouteData: boolean;
  effectiveSegTimeRange?: string;
};

const toneClass = (tone?: string) => tone === "green"
  ? "bg-green-100 text-green-700"
  : tone === "red" ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700";

/** Renders status badges and route/timing insight for the inserted hotspot row. */
export const HotspotPreviewInsertedStatus: React.FC<HotspotPreviewInsertedStatusProps> = ({
  matrixRequiresBuild,
  activeAnchorFitInsight,
  selectedSlotHasRouteData,
  effectiveSegTimeRange,
}) => (
  <div className="flex flex-wrap items-center gap-2">
    <span className="rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-bold uppercase text-green-700">Inserted hotspot</span>
    {!matrixRequiresBuild && activeAnchorFitInsight?.label && <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${toneClass(activeAnchorFitInsight.tone)}`}>{activeAnchorFitInsight.insertedLabel || activeAnchorFitInsight.label}</span>}
    {!matrixRequiresBuild && activeAnchorFitInsight?.anchorLegLabel && <span className="text-[10px] text-gray-500">Between: {activeAnchorFitInsight.anchorLegLabel}</span>}
    {selectedSlotHasRouteData && activeAnchorFitInsight?.extraDistanceLabel && <span className="text-[11px] font-semibold text-[#4a4260]">Extra distance: {activeAnchorFitInsight.extraDistanceLabel}</span>}
    {selectedSlotHasRouteData && String(effectiveSegTimeRange || "").trim() && <span className="text-[11px] font-semibold text-[#4a4260]">Timing: {String(effectiveSegTimeRange || "").trim()}</span>}
    {activeAnchorFitInsight?.reason && <span className="w-full text-[10px] italic text-gray-500">{activeAnchorFitInsight.reason}</span>}
  </div>
);

export default HotspotPreviewInsertedStatus;
