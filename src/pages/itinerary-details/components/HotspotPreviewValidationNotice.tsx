import React from "react";
import { Button } from "@/components/ui/button";
/* eslint-disable @typescript-eslint/no-explicit-any */

type HotspotPreviewValidationNoticeProps = {
  visible: boolean;
  previewRemovedHotspotDetails: readonly any[];
  activePreviewValidation?: any;
  isMatrixBuiltButNoFeasibleSlot: boolean;
  hasManualOpeningOrTimingConflict: (validation: any) => boolean;
  previewValidationReasonText: string;
  shouldShowBuildMatrixButton: boolean;
  activePreviewHotspotId: number | null;
  isBuildingMatrix: boolean;
  isPreviewingHotspotId: number | null;
  isApplyingPreviewHotspot: boolean;
  onBuildMatrixAndPreviewAgain: () => void;
  selectedHotspotAnchor?: any;
  selectedPreviewCityContext: string;
  destinationInsertionSlotLabel?: string;
  activePreviewResolution?: any;
};

/** Presents validation failures and removable-hotspot diagnostics before preview confirmation. */
export const HotspotPreviewValidationNotice: React.FC<HotspotPreviewValidationNoticeProps> = ({
  visible, previewRemovedHotspotDetails, activePreviewValidation, isMatrixBuiltButNoFeasibleSlot,
  hasManualOpeningOrTimingConflict, previewValidationReasonText, shouldShowBuildMatrixButton,
  activePreviewHotspotId, isBuildingMatrix, isPreviewingHotspotId, isApplyingPreviewHotspot,
  onBuildMatrixAndPreviewAgain, selectedHotspotAnchor, selectedPreviewCityContext,
  destinationInsertionSlotLabel, activePreviewResolution,
}) => {
  if (!visible) return null;
  return (
    <>
                {visible && (
                  <div className="mb-2 flex-shrink-0 space-y-2 max-h-32 overflow-y-auto pr-1">
                    {previewRemovedHotspotDetails.length > 0
                      && activePreviewValidation?.readyToApply === false && (
                      <div className="mb-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
                        <p className="font-bold">P3 hotspot removed, but manual hotspot still has a timing conflict</p>
                        <ul className="mt-2 space-y-2">
                          {previewRemovedHotspotDetails.map((row) => (
                            <li key={`preview-removed-summary-${row.key}`} className="rounded-lg border border-amber-200 bg-white/70 p-2">
                              <p className="font-semibold text-amber-900">
                                {row.name}
                                {row.workPriorityLabel || row.priorityLabel ? ` • ${row.workPriorityLabel || row.priorityLabel}` : ''}
                              </p>
                              {row.reason ? (
                                <p className="mt-1 leading-4">{row.reason}</p>
                              ) : null}
                              {row.removalReasonCode ? (
                                <p className="mt-1 font-mono text-[11px] uppercase tracking-wide text-amber-700">
                                  {row.removalReasonCode}
                                </p>
                              ) : null}
                            </li>
                          ))}
                        </ul>
                        <p className="mt-2">
                          You can force add only if you want to keep the selected manual hotspot as a conflict.
                        </p>
                      </div>
                    )}
                    {activePreviewValidation?.readyToApply === false
                      && activePreviewValidation?.requiresPriorityConfirmation !== true
                      && !isMatrixBuiltButNoFeasibleSlot ? (
                      <div className="p-3 rounded-xl border border-red-200 bg-red-50 shadow-sm">
                        <p className="text-sm font-bold text-red-800">
                          {isMatrixBuiltButNoFeasibleSlot
                            ? 'Selected hotspot is off-route for this route'
                            : 'Selected hotspot does not fit the rebuilt slot'}
                        </p>
                        {hasManualOpeningOrTimingConflict(activePreviewValidation) ? (
                          <p className="text-xs text-red-700 mt-1">
                            The route can be recalculated, but this hotspot conflicts with its opening/timing window.
                          </p>
                        ) : activePreviewValidation?.readyToApply === false ? (
                          <p className="text-xs text-red-700 mt-1">
                            This hotspot cannot be inserted normally in the current preview.
                          </p>
                        ) : null}
                        <p className="text-xs text-red-700 mt-1 leading-4 line-clamp-2">
                          {previewValidationReasonText}
                        </p>
                        {shouldShowBuildMatrixButton && activePreviewHotspotId ? (
                          <Button
                            type="button"
                            size="sm"
                            className="mt-2 bg-[#d546ab] hover:bg-[#b93a8f] text-white"
                            disabled={
                              isBuildingMatrix
                              || isPreviewingHotspotId === activePreviewHotspotId
                              || isApplyingPreviewHotspot
                            }
                            onClick={onBuildMatrixAndPreviewAgain}
                          >
                            {isBuildingMatrix ? 'Building matrix...' : 'Build Matrix & Preview Again'}
                          </Button>
                        ) : null}
                        {selectedHotspotAnchor ? (
                          <p className="text-xs text-red-700 mt-2 leading-4">
                            Attempted insertion slot:{' '}
                            <span className="font-semibold">
                              {selectedPreviewCityContext === 'DESTINATION_CITY'
                                ? ((destinationInsertionSlotLabel || '').replace(/^Will\s+be\s+inserted\s+/i, ''))
                                : `${selectedHotspotAnchor.anchorFrom || 'Current stop'} -> ${selectedHotspotAnchor.anchorTo || 'Next stop'}`}
                            </span>
                            {selectedPreviewCityContext !== 'DESTINATION_CITY' && selectedHotspotAnchor.anchorTimeRange ? ` (${selectedHotspotAnchor.anchorTimeRange})` : ''}
                          </p>
                        ) : null}
                        {Array.isArray(activePreviewResolution?.unscheduledManualHotspots)
                        && activePreviewResolution.unscheduledManualHotspots.length > 0 ? (
                          <div className="mt-2 text-xs text-red-700 leading-4">
                            <p className="font-semibold text-red-800">Could not schedule:</p>
                            <ul className="mt-1 list-disc pl-4 space-y-1">
                              {activePreviewResolution.unscheduledManualHotspots
                                .slice(0, 3)
                                .map((row, idx: number) => (
                                  <li key={`unscheduled-manual-${Number(row?.id || 0)}-${idx}`}>
                                    <span className="font-semibold">{row?.name || `Hotspot ${row?.id || ''}`}</span>
                                    {row?.reason ? `: ${row.reason}` : ''}
                                  </li>
                                ))}
                            </ul>
                          </div>
                        ) : null}
                        {previewRemovedHotspotDetails.length > 0 ? (
                          <div className="mt-2 text-xs text-red-700 leading-4">
                            <p className="font-semibold text-red-800">Removed while trying to fit:</p>
                            <ul className="mt-1 space-y-2">
                              {previewRemovedHotspotDetails.map((row) => (
                                <li key={`preview-removed-detail-${row.key}`} className="rounded-lg border border-red-200 bg-white/70 p-2">
                                  <p className="font-semibold text-red-900">
                                    {row.name}
                                    {row.workPriorityLabel || row.priorityLabel ? ` • ${row.workPriorityLabel || row.priorityLabel}` : ''}
                                  </p>
                                  {row.reason ? (
                                    <p className="mt-1 leading-4">{row.reason}</p>
                                  ) : null}
                                  {row.removalReasonCode ? (
                                    <p className="mt-1 font-mono text-[11px] uppercase tracking-wide text-red-700">
                                      {row.removalReasonCode}
                                    </p>
                                  ) : null}
                                </li>
                              ))}
                            </ul>
                          </div>
                        ) : !isMatrixBuiltButNoFeasibleSlot ? (
                          <p className="text-xs text-red-700 mt-2 leading-4">
                            No more removable optional hotspots are available in this slot.
                          </p>
                        ) : null}
                        {isMatrixBuiltButNoFeasibleSlot ? (
                          <p className="text-xs text-red-700 mt-1 font-medium leading-4">
                            This hotspot cannot be added on the current route. Please choose a different hotspot or route segment.
                          </p>
                        ) : (
                          <p className="text-xs text-red-700 mt-1 font-medium leading-4">
                            Use confirm below to insert it as conflict.
                          </p>
                        )}
                      </div>
                    ) : null}

                  </div>
                )}
    </>
  );
};

export default HotspotPreviewValidationNotice;
