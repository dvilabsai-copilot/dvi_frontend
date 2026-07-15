import React from "react";
import { Clock } from "lucide-react";
import { HotspotFitHereEmptyState } from "./HotspotFitHereEmptyState";
import { HotspotFitHereSelectionHeader } from "./HotspotFitHereSelectionHeader";
import { HotspotFitHereTimelineRows } from "./HotspotFitHereTimelineRows";
import { HotspotPreviewStrategyPanel } from "./HotspotPreviewStrategyPanel";
import { HotspotPreviewValidationNotice } from "./HotspotPreviewValidationNotice";
import { HotspotPreviewLoadingState } from "./HotspotPreviewLoadingState";
import { HotspotPreviewTimelineNotices } from "./HotspotPreviewTimelineNotices";
import { HotspotPreviewTimelineRows } from "./HotspotPreviewTimelineRows";
import { HotspotPreviewApplyAction } from "./HotspotPreviewApplyAction";
import { HotspotPreviewEmptyTimeline } from "./HotspotPreviewEmptyTimeline";

type TimelineRowsProps = React.ComponentProps<typeof HotspotPreviewTimelineRows>;
type StrategyProps = React.ComponentProps<typeof HotspotPreviewStrategyPanel>;
type ValidationProps = React.ComponentProps<typeof HotspotPreviewValidationNotice>;
type NoticeProps = React.ComponentProps<typeof HotspotPreviewTimelineNotices>;
type FitRowsProps = React.ComponentProps<typeof HotspotFitHereTimelineRows>;
type FitHeaderProps = React.ComponentProps<typeof HotspotFitHereSelectionHeader>;

type HotspotPreviewPaneProps = {
  timelinePreviewRef: React.RefObject<HTMLDivElement | null>;
  isPreviewingHotspotId: number | null;
  effectivePreviewTimeline: TimelineRowsProps["effectivePreviewTimeline"];
  selectedFitHotspot: FitHeaderProps["selectedFitHotspot"];
  selectedFitHereDay: FitRowsProps["selectedFitHereDay"] | null;
  manualPreviewState: unknown;
  buildFitHereAnchorForTimelineRow: FitRowsProps["buildFitHereAnchorForTimelineRow"];
  getFitHereSegmentLabel: FitRowsProps["getFitHereSegmentLabel"];
  getFitHereSegmentTime: FitRowsProps["getFitHereSegmentTime"];
  renderFitHereButton: FitRowsProps["renderFitHereButton"];
  isFitHereSelectionMode: boolean;
  activePreviewHotspotId: StrategyProps["activePreviewHotspotId"];
  selectedHotspotAnchor: StrategyProps["selectedHotspotAnchor"];
  bestInsertionSlot: StrategyProps["bestInsertionSlot"];
  matrixRequiresBuild: boolean;
  isMatrixBuiltButNoFeasibleSlot: boolean;
  isMatrixMissingBlockedState: boolean;
  backendStrategyLabel?: string;
  matrixFit: TimelineRowsProps["matrixFit"];
  selectedPreviewCityContext: string;
  destinationInsertionSlotLabel?: string;
  insertionDecisionSummary: StrategyProps["insertionDecisionSummary"];
  manualAttemptDisplayMeta: StrategyProps["manualAttemptDisplayMeta"];
  activeManualOptimizerSummary?: string;
  activeAnchorFitInsight: TimelineRowsProps["activeAnchorFitInsight"];
  safeMatrixSlots: StrategyProps["safeMatrixSlots"];
  destinationHotelDisplayName: string;
  isBuildingMatrix: boolean;
  isApplyingPreviewHotspot: boolean;
  matrixBuildCommand?: string;
  onBuildMatrixAndPreviewAgain: () => void;
  routeFitBadgeClass: StrategyProps["routeFitBadgeClass"];
  pendingPriorityReplacementHotspotId: number | null;
  previewRemovedHotspotDetails: ValidationProps["previewRemovedHotspotDetails"];
  activePreviewValidation: ValidationProps["activePreviewValidation"];
  hasManualOpeningOrTimingConflict: ValidationProps["hasManualOpeningOrTimingConflict"];
  previewValidationReasonText: string;
  shouldShowBuildMatrixButton: boolean;
  activePreviewResolution: StrategyProps["activePreviewResolution"];
  manualInsertionFit: NoticeProps["manualInsertionFit"];
  getManualTimingPolicyFromPreview: (value: unknown) => { endTime?: unknown } | null;
  formatManualPolicyTime: (value: unknown) => string;
  resolvedRemovalTimelineLeak: boolean;
  optionalPreviewRemovedHotspotDetails: NoticeProps["optionalPreviewRemovedHotspotDetails"];
  groupPreviewResolution: unknown;
  previewHotspotMetaById: TimelineRowsProps["previewHotspotMetaById"];
  selectedHotelMetaByRoute: TimelineRowsProps["selectedHotelMetaByRoute"];
  previewRouteId: number;
  selectedHotspotId: TimelineRowsProps["selectedHotspotId"];
  extractTravelToFromText: TimelineRowsProps["extractTravelToFromText"];
  parseDisplayMinutes: TimelineRowsProps["parseDisplayMinutes"];
  formatMinutesToDisplay: TimelineRowsProps["formatMinutesToDisplay"];
  normalizeDurationAgainstDistance: TimelineRowsProps["normalizeDurationAgainstDistance"];
  effectiveFitSlot: TimelineRowsProps["effectiveFitSlot"];
  normalizedInsertionSlots: TimelineRowsProps["normalizedInsertionSlots"];
  onRemove: TimelineRowsProps["onRemove"];
  priorityConfirmRef: TimelineRowsProps["priorityConfirmRef"];
  pendingPriorityResolution: TimelineRowsProps["pendingPriorityResolution"];
  onConfirmPriorityReplacement: TimelineRowsProps["onConfirmPriorityReplacement"];
  onCancelPriorityReplacement: TimelineRowsProps["onCancelPriorityReplacement"];
  formatPreviewDuration: TimelineRowsProps["formatPreviewDuration"];
  hotspotForceConflictMode: boolean;
  isCurrentPreviewAlreadyAdded: boolean;
  matrixApplyBlocked: boolean;
  hotspotEffectiveDecisionBlocked: boolean;
  hotspotBlockForValidation: boolean;
  handleAddHotspot: () => void;
  hotspotApplyLabel: string;
};

/** Composes the right-side Fit Here and hotspot preview pane within the add-hotspot dialog. */
export const HotspotPreviewPane: React.FC<HotspotPreviewPaneProps> = ({
  timelinePreviewRef, isPreviewingHotspotId, effectivePreviewTimeline, selectedFitHotspot, selectedFitHereDay,
  manualPreviewState, buildFitHereAnchorForTimelineRow, getFitHereSegmentLabel, getFitHereSegmentTime, renderFitHereButton,
  isFitHereSelectionMode, activePreviewHotspotId, selectedHotspotAnchor, bestInsertionSlot, matrixRequiresBuild,
  isMatrixBuiltButNoFeasibleSlot, isMatrixMissingBlockedState, backendStrategyLabel, matrixFit, selectedPreviewCityContext,
  destinationInsertionSlotLabel, insertionDecisionSummary, manualAttemptDisplayMeta, activeManualOptimizerSummary,
  activeAnchorFitInsight, safeMatrixSlots, destinationHotelDisplayName, isBuildingMatrix, isApplyingPreviewHotspot,
  matrixBuildCommand, onBuildMatrixAndPreviewAgain, routeFitBadgeClass, pendingPriorityReplacementHotspotId,
  previewRemovedHotspotDetails, activePreviewValidation, hasManualOpeningOrTimingConflict, previewValidationReasonText,
  shouldShowBuildMatrixButton, activePreviewResolution, manualInsertionFit, getManualTimingPolicyFromPreview,
  formatManualPolicyTime, resolvedRemovalTimelineLeak, optionalPreviewRemovedHotspotDetails, groupPreviewResolution,
  previewHotspotMetaById, selectedHotelMetaByRoute, previewRouteId, selectedHotspotId, extractTravelToFromText,
  parseDisplayMinutes, formatMinutesToDisplay, normalizeDurationAgainstDistance, effectiveFitSlot, normalizedInsertionSlots,
  onRemove, priorityConfirmRef, pendingPriorityResolution, onConfirmPriorityReplacement, onCancelPriorityReplacement,
  formatPreviewDuration, hotspotForceConflictMode, isCurrentPreviewAlreadyAdded, matrixApplyBlocked,
  hotspotEffectiveDecisionBlocked, hotspotBlockForValidation, handleAddHotspot, hotspotApplyLabel,
}) => (
              <div className="w-full lg:w-1/2 lg:border-l lg:pl-4 border-t lg:border-t-0 pt-4 lg:pt-0 flex flex-col overflow-y-auto min-h-0 pr-1">
                <h3 className="font-semibold text-[#4a4260] mb-4 flex items-center gap-2 flex-shrink-0">
                  <Clock className="h-4 w-4" />
                  Proposed Timeline
                </h3>
                <HotspotFitHereEmptyState visible={!selectedFitHotspot && !manualPreviewState} />
                {selectedFitHotspot && selectedFitHereDay && !manualPreviewState && (
                  <div className="mb-4 space-y-4">
                    <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
                      <HotspotFitHereSelectionHeader selectedFitHotspot={selectedFitHotspot} />
                      <p className="mt-2 text-sm text-slate-600">
                        Choose the exact anchor below. We’ll calculate a preview for that position before anything is saved.
                      </p>
                    </div>

                    <HotspotFitHereTimelineRows
                      selectedFitHereDay={selectedFitHereDay}
                      selectedFitHotspot={selectedFitHotspot}
                      buildFitHereAnchorForTimelineRow={buildFitHereAnchorForTimelineRow}
                      getFitHereSegmentLabel={getFitHereSegmentLabel}
                      getFitHereSegmentTime={getFitHereSegmentTime}
                      renderFitHereButton={renderFitHereButton}
                    />
                  </div>
                )}
                <HotspotPreviewStrategyPanel
                  visible={!isFitHereSelectionMode && Boolean(activePreviewHotspotId && (selectedHotspotAnchor || bestInsertionSlot || matrixRequiresBuild || isMatrixBuiltButNoFeasibleSlot))}
                  activePreviewHotspotId={activePreviewHotspotId}
                  selectedHotspotAnchor={selectedHotspotAnchor}
                  bestInsertionSlot={bestInsertionSlot}
                  matrixRequiresBuild={matrixRequiresBuild}
                  isMatrixBuiltButNoFeasibleSlot={isMatrixBuiltButNoFeasibleSlot}
                  isMatrixMissingBlockedState={isMatrixMissingBlockedState}
                  backendStrategyLabel={backendStrategyLabel}
                  matrixFit={matrixFit}
                  selectedPreviewCityContext={selectedPreviewCityContext}
                  destinationInsertionSlotLabel={destinationInsertionSlotLabel}
                  insertionDecisionSummary={insertionDecisionSummary}
                  manualAttemptDisplayMeta={manualAttemptDisplayMeta}
                  activeManualOptimizerSummary={activeManualOptimizerSummary}
                  activeAnchorFitInsight={activeAnchorFitInsight}
                  activePreviewResolution={activePreviewResolution}
                  safeMatrixSlots={safeMatrixSlots}
                  destinationHotelDisplayName={destinationHotelDisplayName}
                  isBuildingMatrix={isBuildingMatrix}
                  isPreviewingHotspotId={isPreviewingHotspotId}
                  isApplyingPreviewHotspot={isApplyingPreviewHotspot}
                  matrixBuildCommand={matrixBuildCommand}
                  onBuildMatrixAndPreviewAgain={onBuildMatrixAndPreviewAgain}
                  routeFitBadgeClass={routeFitBadgeClass}
                />
                <HotspotPreviewValidationNotice
                  visible={!pendingPriorityReplacementHotspotId}
                  previewRemovedHotspotDetails={previewRemovedHotspotDetails}
                  activePreviewValidation={activePreviewValidation}
                  isMatrixBuiltButNoFeasibleSlot={isMatrixBuiltButNoFeasibleSlot}
                  hasManualOpeningOrTimingConflict={hasManualOpeningOrTimingConflict}
                  previewValidationReasonText={previewValidationReasonText}
                  shouldShowBuildMatrixButton={shouldShowBuildMatrixButton}
                  activePreviewHotspotId={activePreviewHotspotId}
                  isBuildingMatrix={isBuildingMatrix}
                  isPreviewingHotspotId={isPreviewingHotspotId}
                  isApplyingPreviewHotspot={isApplyingPreviewHotspot}
                  onBuildMatrixAndPreviewAgain={onBuildMatrixAndPreviewAgain}
                  selectedHotspotAnchor={selectedHotspotAnchor}
                  selectedPreviewCityContext={selectedPreviewCityContext}
                  destinationInsertionSlotLabel={destinationInsertionSlotLabel}
                  activePreviewResolution={activePreviewResolution}
                />

                <div ref={timelinePreviewRef} className="flex-1 space-y-3 min-h-0 pb-4">
                  <HotspotPreviewLoadingState visible={Boolean(isPreviewingHotspotId)} />

                  {effectivePreviewTimeline.length > 0 ? (
                    <>
                      <HotspotPreviewTimelineNotices
                        effectivePreviewTimelineLength={effectivePreviewTimeline.length}
                        sameCityShuffleApplied={Boolean((activePreviewResolution as { sameCityShuffleApplied?: boolean } | null)?.sameCityShuffleApplied)}
                        manualInsertionFit={manualInsertionFit}
                        resolvedEndLabel={(() => {
                          const manualTimingPolicy = getManualTimingPolicyFromPreview(manualPreviewState)
                            || getManualTimingPolicyFromPreview(activePreviewResolution)
                            || getManualTimingPolicyFromPreview(groupPreviewResolution);
                          return formatManualPolicyTime(manualTimingPolicy?.endTime) || "route end time";
                        })()}
                        resolvedRemovalTimelineLeak={resolvedRemovalTimelineLeak}
                        optionalPreviewRemovedHotspotDetails={optionalPreviewRemovedHotspotDetails}
                      />



                      <HotspotPreviewTimelineRows
                        effectivePreviewTimeline={effectivePreviewTimeline}
                        previewHotspotMetaById={previewHotspotMetaById}
                        selectedHotelMetaByRoute={selectedHotelMetaByRoute}
                        previewRouteId={Number(previewRouteId || 0)}
                        selectedHotspotId={selectedHotspotId}
                        destinationHotelDisplayName={destinationHotelDisplayName}
                        extractTravelToFromText={extractTravelToFromText}
                        parseDisplayMinutes={parseDisplayMinutes}
                        formatMinutesToDisplay={formatMinutesToDisplay}
                        normalizeDurationAgainstDistance={normalizeDurationAgainstDistance}
                        effectiveFitSlot={effectiveFitSlot}
                        matrixRequiresBuild={matrixRequiresBuild}
                        matrixFit={matrixFit}
                        normalizedInsertionSlots={normalizedInsertionSlots}
                        routeFitBadgeClass={routeFitBadgeClass}
                        activeAnchorFitInsight={activeAnchorFitInsight}
                        onRemove={onRemove}
                        pendingPriorityReplacementHotspotId={pendingPriorityReplacementHotspotId}
                        priorityConfirmRef={priorityConfirmRef}
                        pendingPriorityResolution={pendingPriorityResolution}
                        isPreviewingHotspotId={isPreviewingHotspotId}
                        onConfirmPriorityReplacement={onConfirmPriorityReplacement}
                        onCancelPriorityReplacement={onCancelPriorityReplacement}
                        formatPreviewDuration={formatPreviewDuration}
                      />

                      <HotspotPreviewApplyAction
                        isFitHereSelectionMode={isFitHereSelectionMode}
                        forceConflict={hotspotForceConflictMode}
                        loading={isApplyingPreviewHotspot}
                        disabled={
                          isApplyingPreviewHotspot
                          || isBuildingMatrix
                          || !activePreviewHotspotId
                          || isCurrentPreviewAlreadyAdded
                          || matrixApplyBlocked
                          || hotspotEffectiveDecisionBlocked
                          || hotspotBlockForValidation
                        }
                        onClick={handleAddHotspot}
                        label={hotspotApplyLabel}
                      />
                    </>
                  ) : (
                    <HotspotPreviewEmptyTimeline />
                  )}
                </div>
              </div>
);

export default HotspotPreviewPane;
