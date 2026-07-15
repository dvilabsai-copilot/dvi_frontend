import { HotspotManualAttemptLog } from "./HotspotManualAttemptLog";
import { HotspotMatrixMissingNotice } from "./HotspotMatrixMissingNotice";
import { HotspotMatrixNoFeasibleNotice } from "./HotspotMatrixNoFeasibleNotice";

type Attempt = { strategyKey?: string; strategyLabel?: string; selected?: boolean; readyToApply?: boolean; source?: string; summary?: string; reason?: string; openingHourConflictCount?: number; routeEndOverflowMinutes?: number; removedOptionalCount?: number; removedTopPriorityCount?: number; extraTravelKm?: number };
type AttemptMeta = { authoritative: boolean; wrapperOnly: boolean; attempts: readonly Attempt[] };
type FitInsight = { tone?: string; label?: string; extraDistanceLabel?: string; anchorLegLabel?: string };
type DecisionSummary = { willInsert: boolean; text: string };
type PreviewResolution = { anchorPreference?: { honored?: boolean } };
type MatrixFit = { cityEndpointInsertionMode?: boolean; chosenSlot?: { label?: string }; bestSlot?: { label?: string }; destinationHotelName?: string };
type Slot = { slot?: string };
type InsertionSlot = { fromName?: string; toName?: string; routeFitType?: string; label?: string; destinationHotelId?: number };
type HotspotPreviewStrategyPanelProps = {
  visible: boolean; activePreviewHotspotId: number | null; selectedHotspotAnchor?: { anchorFrom?: string; anchorTo?: string; anchorTimeRange?: string } | null;
  bestInsertionSlot?: Slot | null; matrixRequiresBuild: boolean; isMatrixBuiltButNoFeasibleSlot: boolean; isMatrixMissingBlockedState: boolean;
  backendStrategyLabel?: string; matrixFit?: MatrixFit | null; selectedPreviewCityContext: string; destinationInsertionSlotLabel?: string;
  insertionDecisionSummary?: DecisionSummary | null; manualAttemptDisplayMeta: AttemptMeta; activeManualOptimizerSummary?: string; activeAnchorFitInsight?: FitInsight | null;
  activePreviewResolution?: PreviewResolution | null; safeMatrixSlots: readonly InsertionSlot[]; destinationHotelDisplayName: string;
  isBuildingMatrix: boolean; isPreviewingHotspotId: number | null; isApplyingPreviewHotspot: boolean; matrixBuildCommand?: string;
  onBuildMatrixAndPreviewAgain: () => void; routeFitBadgeClass: (routeFitType?: string) => string;
};

/** Renders the selected-slot strategy, optimizer diagnostics, and matrix decision guidance for preview. */
export function HotspotPreviewStrategyPanel({
  visible, activePreviewHotspotId, selectedHotspotAnchor, bestInsertionSlot, matrixRequiresBuild, isMatrixBuiltButNoFeasibleSlot, isMatrixMissingBlockedState,
  backendStrategyLabel, matrixFit, selectedPreviewCityContext, destinationInsertionSlotLabel, insertionDecisionSummary, manualAttemptDisplayMeta,
  activeManualOptimizerSummary, activeAnchorFitInsight, activePreviewResolution, safeMatrixSlots, destinationHotelDisplayName, isBuildingMatrix,
  isPreviewingHotspotId, isApplyingPreviewHotspot, matrixBuildCommand, onBuildMatrixAndPreviewAgain, routeFitBadgeClass,
}: HotspotPreviewStrategyPanelProps) {
  if (!visible) return null;
  const strategyLabel = backendStrategyLabel || (matrixFit?.cityEndpointInsertionMode === true ? "Selected Timing-Safe Schedule" : isMatrixMissingBlockedState ? "Route-fit matrix data missing" : isMatrixBuiltButNoFeasibleSlot ? "Conflict Mode Only" : "Selected Timing-Safe Schedule");
  const selectedSlotLabel = (matrixFit?.cityEndpointInsertionMode === true ? matrixFit.chosenSlot?.label || matrixFit.bestSlot?.label || null : null)
    || bestInsertionSlot?.slot
    || (selectedPreviewCityContext === "DESTINATION_CITY" ? (destinationInsertionSlotLabel || "").replace(/^Will\s+be\s+inserted\s+/i, "") || "Computing best slot..." : "Computing best slot...");
  return (
    <div className="mb-3 flex-shrink-0 rounded-xl border border-[#f0d9ea] bg-[#fff7fc] p-3 shadow-sm">
      <p className="text-xs text-[#6c6c6c]">{strategyLabel}</p>
      {!isMatrixMissingBlockedState && !isMatrixBuiltButNoFeasibleSlot ? <p className="mt-0.5 text-sm font-semibold text-[#4a4260]">{selectedSlotLabel}</p> : <p className={`mt-0.5 text-sm font-semibold ${isMatrixMissingBlockedState ? "text-red-700" : "text-orange-700"}`}>{isMatrixMissingBlockedState ? "Cannot preview accurate insertion until matrix data is built." : "This hotspot adds extra distance or off-route travel. Since this is a manual add, it can still be inserted if the rebuilt route reaches the hotel within the allowed manual timing window."}</p>}
      {insertionDecisionSummary && <p className={`mt-2 text-xs font-semibold ${insertionDecisionSummary.willInsert ? "text-green-700" : "text-red-700"}`}>{insertionDecisionSummary.text}</p>}
      {manualAttemptDisplayMeta.attempts.length > 0 && <HotspotManualAttemptLog meta={manualAttemptDisplayMeta} selectedSummary={activeManualOptimizerSummary} wrapperOnly={manualAttemptDisplayMeta.wrapperOnly} />}
      {!isMatrixMissingBlockedState && !isMatrixBuiltButNoFeasibleSlot && activePreviewResolution?.anchorPreference?.honored === false && <p className="mt-1 text-xs text-amber-700">The system tested the available insertion positions and selected the best timing / lowest extra-distance slot.</p>}
      {!isMatrixMissingBlockedState && !isMatrixBuiltButNoFeasibleSlot && activeAnchorFitInsight && <div className="mt-2 flex flex-wrap items-center gap-2"><span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${activeAnchorFitInsight.tone === "green" ? "bg-green-100 text-green-700" : activeAnchorFitInsight.tone === "red" ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700"}`}>{activeAnchorFitInsight.label}</span>{activeAnchorFitInsight.extraDistanceLabel && <span className="text-xs font-semibold text-[#4a4260]">{activeAnchorFitInsight.extraDistanceLabel}</span>}{activeAnchorFitInsight.anchorLegLabel && <span className="text-xs text-[#6c6c6c]">Anchor leg: {activeAnchorFitInsight.anchorLegLabel}</span>}</div>}
      <HotspotMatrixMissingNotice visible={isMatrixMissingBlockedState} activePreviewHotspotId={activePreviewHotspotId} isBuildingMatrix={isBuildingMatrix} isPreviewingHotspotId={isPreviewingHotspotId} isApplyingPreviewHotspot={isApplyingPreviewHotspot} onBuildAndPreview={onBuildMatrixAndPreviewAgain} command={matrixBuildCommand} />
      <HotspotMatrixNoFeasibleNotice visible={isMatrixBuiltButNoFeasibleSlot} safeMatrixSlots={safeMatrixSlots} destinationHotelDisplayName={destinationHotelDisplayName} destinationHotelName={matrixFit?.destinationHotelName} routeFitBadgeClass={routeFitBadgeClass} />
    </div>
  );
}

export default HotspotPreviewStrategyPanel;
