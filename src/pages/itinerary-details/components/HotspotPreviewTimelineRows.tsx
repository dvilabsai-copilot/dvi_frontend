import React from "react";
import { HotspotBestInsertionSlotPanel } from "./HotspotBestInsertionSlotPanel";
import { HotspotPreviewRouteSummary } from "./HotspotPreviewRouteSummary";
import { HotspotPreviewInsertedStatus } from "./HotspotPreviewInsertedStatus";
import { HotspotPriorityConfirmation } from "./HotspotPriorityConfirmation";
import { HotspotPreviewAttractionMeta } from "./HotspotPreviewAttractionMeta";
import { HotspotConflictNotice } from "./HotspotConflictNotice";
import { HotspotConflictTimingDetails } from "./HotspotConflictTimingDetails";
import { HotspotPreviewSegmentSummary } from "./HotspotPreviewSegmentSummary";
import { HotspotPreviewWaitingSegment } from "./HotspotPreviewWaitingSegment";
import { HotspotInsertionSlotsPanel } from "./HotspotInsertionSlotsPanel";
/* eslint-disable @typescript-eslint/no-explicit-any */

type HotspotPreviewTimelineRowsProps = {
  effectivePreviewTimeline: any[];
  previewHotspotMetaById: Map<number, any>;
  selectedHotelMetaByRoute: Map<number, any>;
  previewRouteId: number;
  selectedHotspotId: number | null;
  destinationHotelDisplayName: string;
  extractTravelToFromText: (value: unknown) => string;
  parseDisplayMinutes: (range: string, part: "start" | "end") => number | null;
  formatMinutesToDisplay: (minutes: number) => string;
  normalizeDurationAgainstDistance: (distance: any, duration: any) => number | null;
  effectiveFitSlot?: any;
  matrixRequiresBuild: boolean;
  matrixFit?: any;
  normalizedInsertionSlots: readonly any[];
  routeFitBadgeClass: (routeFitType?: string) => string;
  activeAnchorFitInsight?: any;
  onRemove: (hotspotId: number) => void;
  pendingPriorityReplacementHotspotId: number | null;
  priorityConfirmRef: React.RefObject<HTMLDivElement>;
  pendingPriorityResolution?: any;
  isPreviewingHotspotId: number | null;
  onConfirmPriorityReplacement: () => void;
  onCancelPriorityReplacement: () => void;
  formatPreviewDuration: (value: unknown) => string;
};

/** Renders each effective preview timeline segment and its route-fit detail panels. */
export const HotspotPreviewTimelineRows: React.FC<HotspotPreviewTimelineRowsProps> = ({
  effectivePreviewTimeline, previewHotspotMetaById, selectedHotelMetaByRoute, previewRouteId,
  selectedHotspotId, destinationHotelDisplayName, extractTravelToFromText, parseDisplayMinutes,
  formatMinutesToDisplay, normalizeDurationAgainstDistance, effectiveFitSlot, matrixRequiresBuild,
  matrixFit, normalizedInsertionSlots, routeFitBadgeClass, activeAnchorFitInsight, onRemove,
  pendingPriorityReplacementHotspotId, priorityConfirmRef, pendingPriorityResolution,
  isPreviewingHotspotId, onConfirmPriorityReplacement, onCancelPriorityReplacement, formatPreviewDuration,
}) => (
  <>
{effectivePreviewTimeline.map((seg, idx: number) => {
                        const isUserSelected = seg?.isUserSelectedPreview === true;
                        const isConflictSegment = seg?.isConflict === true;
                        const selectedId = Number(seg?.selectedHotspotId || seg?.locationId || 0);
                        const hotspotId = Number(seg?.locationId || seg?.hotspot_ID || seg?.hotspotId || selectedId || 0);
                        const selectedPreviewHotspotMeta = previewHotspotMetaById.get(Number(selectedHotspotId || 0)) || null;
                        const hotspotMeta = previewHotspotMetaById.get(hotspotId) || selectedPreviewHotspotMeta || null;
                        const activityVisitTime = isConflictSegment
                          ? 'Needs reschedule'
                          : (seg?.visitTime || seg?.timeRange || hotspotMeta?.visitTime || null);
                        const activityDuration = seg?.duration || hotspotMeta?.duration || null;
                        const activityTimings = seg?.timings || hotspotMeta?.timings || null;
                        const activityPriority = Number.isFinite(Number(seg?.priority))
                          ? Number(seg.priority)
                          : (Number.isFinite(Number(hotspotMeta?.priority)) ? Number(hotspotMeta?.priority) : null);
                        
                        // ✅ FIX: Manual hotspots should display as "Manual / P4", never P0
                        const computedPriorityLabel = (): string | null => {
                          const isManual = seg?.planOwnWay === true || seg?.isManual === true;
                          const priority = activityPriority;

                          if (isManual) {
                            return "Manual / P4";
                          }

                          if (priority !== null && priority > 0) {
                            return `P${priority}`;
                          }

                          return null;
                        };

                        const priorityLabel = computedPriorityLabel();
                        const hotelMetaForDay = selectedHotelMetaByRoute.get(Number(previewRouteId || 0));
                        const actualHotelName = String(
                          hotelMetaForDay?.hotelName
                          || seg?.hotelName
                          || seg?.toName
                          || seg?.to
                          || 'Hotel'
                        ).trim();

                        // ✅ FIX: Handle waiting/break synthetic segments
                        const isWaitingSegment = seg?.type === 'waiting' || seg?.isSyntheticWaiting === true;
                        const travelToLabel = String(
                          seg?.toName
                          || seg?.displayToName
                          || seg?.to
                          || extractTravelToFromText(seg?.text || seg?.name)
                          || '',
                        ).trim();
                        const resolvedTravelToLabel = /\bhotel\b/i.test(travelToLabel)
                          ? (destinationHotelDisplayName || actualHotelName || travelToLabel)
                          : travelToLabel;
                        const displaySegmentText = String(seg?.type || '').toLowerCase() === 'travel'
                          ? (resolvedTravelToLabel ? `Travel to ${resolvedTravelToLabel}` : (seg?.text || seg?.name || 'Travel'))
                          : (seg?.text || seg?.name || '');

                        // ✅ FIX: Handle hotel check-in zero-duration segments
                        const isZeroDurationHotel = seg?.isZeroDurationHotel === true ||
                          (seg?.type === 'hotel' && seg?.timeRange && seg.timeRange.split(' - ').length === 2 &&
                           seg.timeRange.split(' - ')[0].trim() === seg.timeRange.split(' - ')[1].trim());

                        const getTimeRangeDurationMinutes = (range: string): number | null => {
                          const start = parseDisplayMinutes(range, 'start');
                          const end = parseDisplayMinutes(range, 'end');
                          if (start == null || end == null) return null;
                          let delta = end - start;
                          if (delta < 0) delta += 24 * 60;
                          return delta > 0 ? delta : null;
                        };
                        const parseDurationMinutesText = (value: unknown): number | null => {
                          const raw = String(value || '').trim();
                          if (!raw) return null;
                          const h = raw.match(/(\d+)\s*(?:hour|hours|hr|hrs|h)/i);
                          const m = raw.match(/(\d+)\s*(?:min|mins|m)/i);
                          if (!h && !m) return null;
                          const total = (h ? Number(h[1]) * 60 : 0) + (m ? Number(m[1]) : 0);
                          return Number.isFinite(total) && total > 0 ? total : null;
                        };

                        const timingOverride = (() => {
                          const currentType = String(seg?.type || '').toLowerCase();
                          if (currentType !== 'travel' && currentType !== 'hotel') return null;

                          let conflictIdx = -1;
                          for (let p = idx - 1; p >= 0; p -= 1) {
                            const cand = effectivePreviewTimeline[p];
                            if (cand?.isConflict === true && String(cand?.type || '').toLowerCase() === 'attraction') {
                              conflictIdx = p;
                              break;
                            }
                          }
                          if (conflictIdx < 0) return null;

                          const conflictSeg = effectivePreviewTimeline[conflictIdx];

                          let prevTravelForConflict: any = null;
                          for (let p = conflictIdx - 1; p >= 0; p -= 1) {
                            const cand = effectivePreviewTimeline[p];
                            if (String(cand?.type || '').toLowerCase() === 'travel' && String(cand?.timeRange || '').trim()) {
                              prevTravelForConflict = cand;
                              break;
                            }
                          }
                          const arrivalMinutes = parseDisplayMinutes(String(prevTravelForConflict?.timeRange || ''), 'end');

                          const conflictHotspotId = Number(
                            conflictSeg?.locationId
                            || conflictSeg?.hotspot_ID
                            || conflictSeg?.hotspotId
                            || conflictSeg?.selectedHotspotId
                            || selectedHotspotId
                            || 0
                          );
                          const conflictHotspotMeta = previewHotspotMetaById.get(conflictHotspotId)
                            || previewHotspotMetaById.get(Number(selectedHotspotId || 0))
                            || null;
                          const conflictDurationText = conflictSeg?.duration || conflictHotspotMeta?.duration || null;
                          const stayMinutes = parseDurationMinutesText(conflictDurationText)
                            ?? (() => {
                              const fallback = Number(
                                conflictSeg?.durationMin
                                ?? conflictSeg?.matrixFit?.insertedStopDurationMin
                                ?? conflictSeg?.matrixFit?.stopDurationMin
                                ?? conflictSeg?.matrixFit?.visitDurationMin
                                ?? conflictSeg?.matrixFit?.attractionDurationMin
                                ?? 0
                              );
                              return Number.isFinite(fallback) && fallback > 0 ? Math.max(1, Math.round(fallback)) : null;
                            })();

                          if (arrivalMinutes == null || stayMinutes == null) return null;
                          const leaveMinutes = arrivalMinutes + stayMinutes;

                          let firstTravelIdx = -1;
                          for (let n = conflictIdx + 1; n < effectivePreviewTimeline.length; n += 1) {
                            const cand = effectivePreviewTimeline[n];
                            if (String(cand?.type || '').toLowerCase() === 'travel' && String(cand?.timeRange || '').trim()) {
                              firstTravelIdx = n;
                              break;
                            }
                          }
                          if (firstTravelIdx < 0) return null;

                          const firstTravelSeg = effectivePreviewTimeline[firstTravelIdx];
                          const firstTravelStart = parseDisplayMinutes(String(firstTravelSeg?.timeRange || ''), 'start');
                          const firstTravelDuration = getTimeRangeDurationMinutes(String(firstTravelSeg?.timeRange || ''));
                          if (firstTravelStart == null || firstTravelDuration == null || leaveMinutes <= firstTravelStart) {
                            return null;
                          }
                          const firstTravelNewStart = leaveMinutes;
                          const firstTravelNewEnd = firstTravelNewStart + firstTravelDuration;

                          if (currentType === 'travel' && idx === firstTravelIdx) {
                            return {
                              timeRange: `${formatMinutesToDisplay(firstTravelNewStart)} - ${formatMinutesToDisplay(firstTravelNewEnd)}`,
                            };
                          }

                          if (currentType === 'hotel') {
                            let firstHotelIdx = -1;
                            for (let n = firstTravelIdx + 1; n < effectivePreviewTimeline.length; n += 1) {
                              const cand = effectivePreviewTimeline[n];
                              if (String(cand?.type || '').toLowerCase() === 'hotel') {
                                firstHotelIdx = n;
                                break;
                              }
                            }
                            if (firstHotelIdx === idx) {
                              const newCheckIn = formatMinutesToDisplay(firstTravelNewEnd);
                              return {
                                timeRange: `${newCheckIn} - ${newCheckIn}`,
                              };
                            }
                          }

                          return null;
                        })();

                        const normalizedMatrixDurationMin = seg?.isMatrixSplitTravel === true
                          ? normalizeDurationAgainstDistance(seg?.matrixDistanceKm, seg?.matrixDurationMin)
                          : null;
                        const matrixStartMinutes = seg?.isMatrixSplitTravel === true
                          ? parseDisplayMinutes(seg?.timeRange, 'start')
                          : null;
                        const matrixEndMinutes = seg?.isMatrixSplitTravel === true
                          ? parseDisplayMinutes(seg?.timeRange, 'end')
                          : null;
                        const matrixHasRange = matrixStartMinutes !== null && matrixEndMinutes !== null && matrixEndMinutes >= matrixStartMinutes;
                        const matrixRangeDuration = matrixHasRange ? Math.max(1, matrixEndMinutes - matrixStartMinutes) : null;
                        const effectiveSegTimeRangeRaw = seg?.isMatrixSplitTravel === true
                          && normalizedMatrixDurationMin !== null
                          && matrixStartMinutes !== null
                          && matrixRangeDuration !== null
                          && matrixRangeDuration !== normalizedMatrixDurationMin
                          ? `${formatMinutesToDisplay(matrixStartMinutes)} - ${formatMinutesToDisplay(matrixStartMinutes + normalizedMatrixDurationMin)}`
                          : (timingOverride?.timeRange || seg?.timeRange || '--');
                        const effectiveSegTimeRange = isConflictSegment && String(seg?.type || '').toLowerCase() === 'attraction'
                          ? 'Needs reschedule'
                          : effectiveSegTimeRangeRaw;
                        const isTravelSegment = String(seg?.type || '').toLowerCase() === 'travel';
                        const previewTravelDistanceLabel = (() => {
                          if (!isTravelSegment) return '';

                          const rawDistance = String(seg?.distance || seg?.hotspot_travelling_distance || '').trim();
                          if (rawDistance && rawDistance !== '--') {
                            return /km/i.test(rawDistance) ? rawDistance : `${rawDistance} KM`;
                          }

                          const numericDistance = [
                            Number(seg?.matrixDistanceKm || 0),
                            Number(seg?.distanceKm || 0),
                            Number(seg?.travelDistanceKm || 0),
                          ].find((value) => Number.isFinite(value) && value > 0) || 0;

                          return numericDistance > 0 ? `${numericDistance.toFixed(2)} KM` : '';
                        })();
                        const previewTravelDurationLabel = (() => {
                          if (!isTravelSegment) return '';
                          if (String(seg?.duration || '').trim()) return String(seg.duration).trim();
                          if (normalizedMatrixDurationMin != null) {
                            return `${Math.max(1, Math.round(Number(normalizedMatrixDurationMin)))} Min`;
                          }
                          return '';
                        })();
                        const selectedSlotFitTypeUpper = String(
                          effectiveFitSlot?.routeFitType
                          || seg?.matrixFit?.routeFitType
                          || ''
                        ).toUpperCase();
                        const selectedSlotLabelText = String(
                          effectiveFitSlot?.displayLabel
                          || effectiveFitSlot?.label
                          || seg?.matrixFit?.displayLabel
                          || seg?.matrixFit?.label
                          || ''
                        ).toLowerCase();
                        const selectedSlotFinalReasonText = String(
                          effectiveFitSlot?.finalDecisionReason
                          || seg?.matrixFit?.finalDecisionReason
                          || ''
                        ).toLowerCase();
                        const selectedSlotNoRouteTagged = selectedSlotLabelText.includes('no route data')
                          || selectedSlotFinalReasonText.includes('no route data')
                          || selectedSlotLabelText.includes('route data unavailable')
                          || selectedSlotFinalReasonText.includes('route-fit data unavailable');
                        const selectedSlotRouteFitStatus = String(
                          (effectiveFitSlot as any)?.routeFitStatus
                          || (seg?.matrixFit as any)?.routeFitStatus
                          || selectedSlotFitTypeUpper
                          || ''
                        ).toUpperCase();
                        const selectedSlotMetricsSource = String(
                          (effectiveFitSlot as any)?.routeMetrics?.source
                          || (seg?.matrixFit as any)?.routeMetrics?.source
                          || 'NONE'
                        ).toUpperCase();
                        const shouldSuppressRouteMetrics = (
                          selectedSlotNoRouteTagged
                          || selectedSlotFitTypeUpper === 'UNKNOWN'
                          || selectedSlotFitTypeUpper === 'MATRIX_UNAVAILABLE'
                          || selectedSlotRouteFitStatus === 'NO_ROUTE_DATA'
                          || selectedSlotRouteFitStatus === 'MATRIX_UNAVAILABLE'
                          || selectedSlotMetricsSource !== 'MATRIX_CACHE'
                        );
                        const selectedSlotHasRouteData = (
                          (!selectedSlotFitTypeUpper || (
                            selectedSlotFitTypeUpper !== 'UNKNOWN'
                            && selectedSlotFitTypeUpper !== 'MATRIX_UNAVAILABLE'
                          ))
                          && ((effectiveFitSlot as any)?.routePossible ?? seg?.matrixFit?.routePossible) !== false
                          && !shouldSuppressRouteMetrics
                        );

                        // If waiting segment, render a distinct waiting block
                        if (isWaitingSegment) {
                          return <HotspotPreviewWaitingSegment segment={seg} index={idx} timeRange={effectiveSegTimeRange} />;
                        }



                        return (
                          <div
                            key={`${idx}-${seg?.type}-${seg?.text || ''}`}
                            data-selected={isUserSelected ? "true" : "false"}
                            className={`p-3 rounded-lg border-2 transition-all ${seg?.isConflict
                                ? 'bg-red-50 border-red-300 shadow-sm'
                                : isUserSelected
                                  ? 'bg-green-50 border-green-500 ring-2 ring-green-200 shadow-md scale-[1.02]'
                                  : 'bg-gray-50 border-gray-200 opacity-90'
                              }`}
                          >
                            <HotspotPreviewSegmentSummary
                              segmentType={String(seg?.type || "")}
                              isConflict={seg?.isConflict === true}
                              isUserSelected={isUserSelected}
                              selectedId={selectedId}
                              effectiveTimeRange={effectiveSegTimeRange}
                              displayText={displaySegmentText}
                              isZeroDurationHotel={isZeroDurationHotel}
                              actualHotelName={actualHotelName}
                              isTravelSegment={isTravelSegment}
                              travelDistanceLabel={previewTravelDistanceLabel}
                              travelDurationLabel={previewTravelDurationLabel}
                              isMatrixSplitTravel={seg?.isMatrixSplitTravel === true}
                              fromName={seg?.fromName}
                              toName={seg?.toName}
                              matrixDistanceKm={seg?.matrixDistanceKm}
                              normalizedMatrixDurationMin={normalizedMatrixDurationMin}
                              onRemove={onRemove}
                            />


                            {isUserSelected && String(seg?.type || '').toLowerCase() === 'attraction' && (
                              <div className="mt-3 space-y-2">
                                {!matrixRequiresBuild && effectiveFitSlot && (
                                  <HotspotBestInsertionSlotPanel
                                    slot={effectiveFitSlot}
                                    matrixFit={matrixFit}
                                    destinationHotelDisplayName={destinationHotelDisplayName}
                                    selectedSlotHasRouteData={selectedSlotHasRouteData}
                                    routeFitBadgeClass={routeFitBadgeClass}
                                  />
                                )}

                                {seg?.matrixFit?.routeLegSummary && selectedSlotHasRouteData && (
                                  <HotspotPreviewRouteSummary
                                    fromName={effectiveFitSlot?.fromName || seg?.matrixFit?.fromName || 'A'}
                                    insertedName={seg?.text || seg?.name || 'Inserted hotspot'}
                                    destinationName={((
                                      /^hotel$/i.test(String(effectiveFitSlot?.toName || seg?.matrixFit?.toName || '').trim())
                                      || (
                                        String((matrixFit as any)?.destinationHotelName || '').trim().length > 0
                                        && String(effectiveFitSlot?.toName || seg?.matrixFit?.toName || '').trim().toLowerCase() === String((matrixFit as any)?.destinationHotelName || '').trim().toLowerCase()
                                      )
                                      || Number((effectiveFitSlot as any)?.destinationHotelId || 0) > 0
                                    ) && destinationHotelDisplayName) ? destinationHotelDisplayName : (effectiveFitSlot?.toName || seg?.matrixFit?.toName || 'B')}
                                    routeLegSummary={seg.matrixFit.routeLegSummary}
                                    distanceComparisonNote={seg.matrixFit.distanceComparisonNote}
                                  />
                                )}

                                <HotspotInsertionSlotsPanel
                                  slots={normalizedInsertionSlots}
                                  matrixFit={matrixFit}
                                  destinationHotelDisplayName={destinationHotelDisplayName}
                                  routeFitBadgeClass={routeFitBadgeClass}
                                />

                                <HotspotPreviewInsertedStatus
                                  matrixRequiresBuild={matrixRequiresBuild}
                                  activeAnchorFitInsight={activeAnchorFitInsight}
                                  selectedSlotHasRouteData={selectedSlotHasRouteData}
                                  effectiveSegTimeRange={effectiveSegTimeRange}
                                />

                                  {/* Reschedule Priority Confirmation — shown inline inside the selected card */}
                                  {pendingPriorityReplacementHotspotId && (
                                    <HotspotPriorityConfirmation
                                      priorityConfirmRef={priorityConfirmRef}
                                      pendingPriorityResolution={pendingPriorityResolution}
                                      isBusy={isPreviewingHotspotId === pendingPriorityReplacementHotspotId}
                                      onConfirm={onConfirmPriorityReplacement}
                                      onCancel={onCancelPriorityReplacement}
                                    />
                                  )}
                                </div>
                              )}
                            {String(seg?.type || '').toLowerCase() === 'attraction' && (
                              <HotspotPreviewAttractionMeta
                                priorityLabel={priorityLabel}
                                activityVisitTime={activityVisitTime}
                                activityDuration={activityDuration}
                                activityDurationLabel={formatPreviewDuration(seg?.duration || seg?.hotspot_traveling_time || seg?.hotspot_duration || hotspotMeta?.duration)}
                                activityTimings={activityTimings}
                              />
                            )}

                            {seg?.isConflict && (
                              <div className="mt-2 p-2 bg-white/50 rounded border border-red-100">
                                <HotspotConflictNotice conflictReason={seg?.conflictReason} />
                                <HotspotConflictTimingDetails
                                  segment={seg}
                                  index={idx}
                                  timeline={effectivePreviewTimeline}
                                  activityDuration={activityDuration}
                                  formatPreviewDuration={formatPreviewDuration}
                                  parseDisplayMinutes={parseDisplayMinutes}
                                  formatMinutesToDisplay={formatMinutesToDisplay}
                                />
                              </div>
                            )}
                          </div>
                        );
                      })}

  </>
);

export default HotspotPreviewTimelineRows;
