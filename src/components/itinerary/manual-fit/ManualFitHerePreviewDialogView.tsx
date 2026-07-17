/* eslint-disable @typescript-eslint/no-explicit-any */
import React from "react";
import { AlertTriangle, CheckCircle2, Circle, Clock, Loader2, MapPin, RefreshCw, Sparkles, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
type FitHereStepStatus = "pending" | "running" | "passed" | "warning" | "failed" | "info" | "PASSED" | "WARNING" | "FAILED";

export function ManualFitHerePreviewDialogView({ context }: { context: Record<string, any> }) {
  const { AttemptTimelinePreview, FIT_HERE_LOADING_STEPS, acknowledgedRemovedHotspotIds, allRemovalAcknowledged, attempt, attempted, attemptedVisitTime, baseTimeline, buildLoadingSteps, changesRequiredDisplay, config, confirmButtonLabel, confirmLoading, displayedRemovedItems, failedReason, formatPriorityText, getAttemptedTimeLabel, getHotspotDurationLabel, getHotspotTimingLabel, getRemovalExplanationText, getRowName, getRowOperatingHoursLabel, getRowTime, getShortName, getStepIcon, getStepTextClass, hasDisplayedRemovals, hasOpeningHoursRescueAttempts, hasTimingRisk, hasUnauthorizedP3Removal, hasUnauthorizedProtectedRemoval, hasUnprovenProtectedRemoval, hotspotName, isSelectedClosedAtAttemptedTime, loading, loadingStepIndex, name, normalizeFitHereStatus, onClose, onConfirm, onRetry, open, openingHoursRescueAttempts, operating, operatingHours, plannedRemovalIds, reason, removalAcknowledgementLabel, removed, requiresRemovalAcknowledgement, resultMessage, selectedHotspot, selectedHotspotId, selectedOpeningConflict, setAcknowledgedRemovedHotspotIds, setShowRescueAttempts, shouldUseDangerConfirm, showRescueAttempts, timeline, timingRisk, value } = context;
  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) onClose();
      }}
    >
      <DialogContent
        overlayClassName="z-[240] bg-black/60 pointer-events-none"
        className="pointer-events-auto z-[260] flex max-h-[92vh] w-[96vw] max-w-[96vw] flex-col overflow-hidden border border-slate-200 bg-white p-0 shadow-2xl sm:max-w-[1500px] sm:rounded-2xl [&>button]:hidden"
        data-testid="fit-here-preview-dialog"
      >
        <div className="flex h-[92vh] max-h-[92vh] min-h-0 flex-col overflow-hidden">
          <div className="shrink-0 border-b border-slate-100 px-6 py-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <DialogTitle className="text-xl font-bold text-slate-900">
                  Fit Here Preview
                </DialogTitle>
                <DialogDescription className="mt-1 text-sm text-slate-500">
                  {hotspotName} insertion preview
                </DialogDescription>
              </div>

              <button
                type="button"
                onClick={onClose}
                className="rounded-full p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-800"
                aria-label="Close Fit Here preview"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          {loading ? (
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-6 py-6">
              <div className="mb-5 rounded-xl border border-emerald-100 bg-emerald-50 p-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white">
                    <RefreshCw className="h-5 w-5 animate-spin text-emerald-700" />
                  </div>

                  <div>
                    <p className="text-sm font-bold text-slate-900">
                      Optimising this insertion position...
                    </p>
                    <p className="mt-1 text-xs text-slate-600">
                      Checking timing, travel, opening hours, priority protection, optional removals,
                      and route feasibility.
                    </p>
                  </div>
                </div>

                <div className="mt-4 h-2 overflow-hidden rounded-full bg-white">
                  <div
                    className="h-full rounded-full bg-emerald-700 transition-all duration-500"
                    style={{
                      width: `${Math.min(
                        95,
                        Math.max(8, ((loadingStepIndex + 1) / FIT_HERE_LOADING_STEPS.length) * 100),
                      )}%`,
                    }}
                  />
                </div>

                <p className="mt-2 text-[11px] font-medium text-emerald-800">
                  Step {Math.min(loadingStepIndex + 1, FIT_HERE_LOADING_STEPS.length)} of{" "}
                  {FIT_HERE_LOADING_STEPS.length}
                </p>
              </div>

              <div className="space-y-2">
                {buildLoadingSteps(loadingStepIndex).map((step) => (
                  <div
                    key={step.id}
                    className={[
                      "flex gap-3 rounded-xl border p-3 transition",
                      normalizeFitHereStatus(step.status) === "running"
                        ? "border-emerald-200 bg-white shadow-sm"
                        : "border-slate-100 bg-slate-50",
                    ].join(" ")}
                  >
                    <div className="mt-0.5 shrink-0">{getStepIcon(step.status)}</div>

                    <div>
                      <p className={`text-sm font-bold ${getStepTextClass(step.status)}`}>
                        {step.label}
                      </p>
                      <p className="mt-0.5 text-xs text-slate-500">{step.message}</p>
                    </div>
                  </div>
                ))}
              </div>

              <p className="mt-5 rounded-xl bg-slate-50 px-4 py-3 text-xs text-slate-500">
                Please wait while we test travel timing, opening hours, priority protection,
                shifted rows, optional removals, and final route feasibility.
              </p>
            </div>
          ) : failedReason ? (
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-6 py-8">
              <div className="rounded-xl border border-red-200 bg-red-50 p-5 text-red-900">
                <div className="flex gap-3">
                  <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
                  <div>
                    <p className="font-bold">Could not calculate Fit Here preview.</p>
                    <p className="mt-2 text-sm">
                      {failedReason || "The optimiser could not complete the preview calculation."}
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
                This may happen if matrix data, timing data, or the selected route state changed while
                the preview was being calculated.
              </div>
            </div>
          ) : attempt ? (
            <div
              className="min-h-0 flex-1 overflow-y-auto overscroll-contain"
              data-testid="fit-here-modal-body"
            >
              <div className="space-y-5 px-8 py-5">
                <section className={`flex gap-3 rounded-xl border p-4 ${config.wrapperClass}`}>
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/70">
                    {config.icon}
                  </div>

                  <div>
                    <span className={`inline-block rounded-full px-3 py-1 text-xs font-bold ${config.badgeClass}`}>
                      {config.badge}
                    </span>
                    <p className="mt-2 text-sm leading-5">{resultMessage}</p>
                    {reason && reason !== resultMessage ? (
                      <p className="mt-2 text-xs text-slate-600">
                        Technical reason: {reason}
                      </p>
                    ) : null}
                  </div>
                </section>

                {attempt?.selectedAnchor && (
                  <div className="rounded-xl border border-slate-200 bg-white p-3 text-sm text-slate-700">
                    <span className="font-bold">Insert position:</span>{" "}
                    {attempt.selectedAnchor.anchorLabel ||
                      attempt.anchorLabel ||
                      "Selected Fit Here position"}
                  </div>
                )}

                <div className="grid grid-cols-1 gap-5 xl:grid-cols-[0.9fr_1.1fr]">
                  <div className="space-y-4">
                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                      <p className="mb-3 text-[11px] font-bold uppercase tracking-wide text-slate-500">
                        Selected Hotspot
                      </p>

                      <div className="flex items-center gap-2">
                        <MapPin className="h-5 w-5 text-emerald-700" />
                        <span className="font-bold text-slate-900">{hotspotName}</span>
                      </div>

                      <div className="mt-3 flex flex-wrap gap-3 text-xs text-slate-600">
                        {getHotspotDurationLabel(selectedHotspot) && (
                          <span className="inline-flex items-center gap-1">
                            <Clock className="h-4 w-4" />
                            {getHotspotDurationLabel(selectedHotspot)}
                          </span>
                        )}

                        {getHotspotTimingLabel(selectedHotspot) && (
                          <span>{getHotspotTimingLabel(selectedHotspot)}</span>
                        )}
                      </div>
                    </div>

                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                      <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-slate-500">
                        Insert Position
                      </p>

                      <p className="text-sm font-semibold text-slate-900">
                        {attempt.selectedAnchor?.anchorLabel ||
                          attempt.anchorLabel ||
                          "Selected Fit Here position"}
                      </p>
                    </div>
                  </div>

                  <div className="xl:sticky xl:top-0 xl:self-start">
                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 shadow-sm" data-testid="fit-here-changes-required">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="mb-3 text-[11px] font-bold uppercase tracking-wide text-slate-500">
                            {changesRequiredDisplay?.title || "Changes Required"}
                          </p>
                          <p className="text-xs font-semibold text-slate-600">
                            {changesRequiredDisplay?.removalOrderLabel || "Removal order checked: Priority 3 -> Priority 2 -> Priority 1"}
                          </p>
                        </div>
                        {requiresRemovalAcknowledgement && !allRemovalAcknowledged ? (
                          <span className="rounded-full bg-amber-100 px-2.5 py-1 text-[10px] font-bold uppercase text-amber-800">
                            Action needed
                          </span>
                        ) : null}
                      </div>

                      {requiresRemovalAcknowledgement && !allRemovalAcknowledged ? (
                        <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-900">
                          Confirm is locked until you tick the checkbox below.
                        </div>
                      ) : null}

                      <div className="mt-3 space-y-3">

                      {hasDisplayedRemovals ? (
                        <div className="space-y-2">
                          {displayedRemovedItems.map((item: any, index: number) => {
                            const matchingRow = removed.find((row: any) => (
                              Number(row?.id || row?.hotspotId || row?.hotspot_ID || row?.hotspot_id || 0) === Number(item?.hotspotId || 0)
                            )) || null;

                            return (
                              <div
                                key={`${item?.hotspotId || index}-${item?.name || "removed"}`}
                                className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900"
                              >
                                <div className="flex gap-2">
                                  <Trash2 className="mt-0.5 h-4 w-4 text-red-600" />
                                  <div>
                                    <p className="font-bold text-slate-900">
                                      {`${item?.workPriorityLabel || "Priority not set"}: ${item?.name || `Hotspot #${item?.hotspotId || index + 1}`} removed`}
                                    </p>
                                    {item?.reason ? (
                                      <p className="mt-1 text-xs">{formatPriorityText(String(item.reason))}</p>
                                    ) : null}
                                    {matchingRow?.originalVisitTime ? (
                                      <p className="mt-1 text-xs text-slate-600">
                                        <span className="font-semibold text-slate-700">Original visit:</span>{" "}
                                        {matchingRow.originalVisitTime}
                                      </p>
                                    ) : null}
                                    {matchingRow?.attemptedVisitTime || matchingRow?.attemptedArrivalTime ? (
                                      <p className="text-xs text-slate-600">
                                        <span className="font-semibold text-slate-700">{getAttemptedTimeLabel(matchingRow)}:</span>{" "}
                                        {matchingRow?.attemptedVisitTime || matchingRow?.attemptedArrivalTime}
                                      </p>
                                    ) : null}
                                    {matchingRow?.operatingHours ? (
                                      <p className="text-xs text-slate-600">
                                        <span className="font-semibold text-slate-700">Operating hours:</span>{" "}
                                        {matchingRow.operatingHours}
                                      </p>
                                    ) : null}
                                    {matchingRow ? (
                                      <p className="mt-1 text-xs text-slate-600">
                                        <span className="font-semibold text-slate-700">Why it was removed:</span>{" "}
                                        {formatPriorityText(getRemovalExplanationText(matchingRow))}
                                      </p>
                                    ) : null}
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <p
                          className={`text-sm font-semibold ${
                            changesRequiredDisplay?.exactAnchorFailure ? "text-amber-800" : "text-emerald-800"
                          }`}
                        >
                          {changesRequiredDisplay?.exactAnchorFailure
                            ? (changesRequiredDisplay?.noRemovalText || "No direction-valid exact-anchor rescue unlocked this position.")
                            : (changesRequiredDisplay?.noRemovalText || "No hotspot removed")}
                        </p>
                      )}
                      </div>
                      {requiresRemovalAcknowledgement ? (
                        <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 shadow-sm">
                          <label className="flex cursor-pointer items-start gap-3 text-sm font-medium text-slate-800">
                          <input
                            data-testid="fit-here-removal-ack-checkbox"
                            type="checkbox"
                            checked={allRemovalAcknowledged}
                            onChange={(event) => {
                              setAcknowledgedRemovedHotspotIds(
                                event.target.checked ? plannedRemovalIds : [],
                              );
                            }}
                            className="mt-1 h-6 w-6 rounded border-emerald-300 accent-emerald-700"
                          />
                          <span>{removalAcknowledgementLabel}</span>
                          </label>
                        </div>
                      ) : null}
                    </div>
                  </div>
                </div>

                <section>
                  <p className="mb-3 text-[11px] font-bold uppercase tracking-wide text-slate-500">
                    Finalized Timeline Preview
                  </p>

                  <div
                    data-testid="fit-here-main-timeline"
                    role={hasOpeningHoursRescueAttempts ? "button" : undefined}
                    tabIndex={hasOpeningHoursRescueAttempts ? 0 : undefined}
                    onClick={() => {
                      if (hasOpeningHoursRescueAttempts) {
                        setShowRescueAttempts((value) => !value);
                      }
                    }}
                    onKeyDown={(event) => {
                      if (!hasOpeningHoursRescueAttempts) return;
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        setShowRescueAttempts((value) => !value);
                      }
                    }}
                    className={`rounded-xl border border-slate-200 bg-white p-4 ${
                      hasOpeningHoursRescueAttempts ? "cursor-pointer hover:border-emerald-300 hover:bg-emerald-50/20" : ""
                    }`}
                  >
                    {timeline.length === 0 ? (
                      <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                        {attempt?.changesRequiredDisplay?.exactAnchorFailure
                          ? "No finalized timeline is shown because the selected hotspot could not be preserved at the exact Fit Here position."
                          : "No finalized timeline preview was returned."}
                      </div>
                    ) : (
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-6">
                        <div className="flex flex-col items-center">
                          <div className="mb-2 h-3 w-3 rounded-full bg-emerald-700" />
                          <span className="text-[11px] font-medium text-slate-500">Start</span>
                        </div>

                        {timeline.slice(0, 14).map((row: any, index: number) => {
                          const name = getRowName(row);
                          const rowHotspotId = Number(row?.hotspotId || row?.locationId || row?.hotspot_ID || 0);
                          const isManual =
                            row?.isManual === true ||
                            row?.manual === true ||
                            rowHotspotId === Number(attempt.selectedHotspotId);
                          const isSelectedInsertedHotspot =
                            rowHotspotId === Number(attempt.selectedHotspotId);
                          const operatingHoursLabel = getRowOperatingHoursLabel(
                            row,
                            isSelectedInsertedHotspot ? selectedHotspot : undefined,
                          );
                          const isRemoved = row?.removed === true || row?.isRemoved === true;
                          const isConflict = row?.isConflict === true || Number(row?.is_conflict || 0) === 1;
                          const isManualConflict = isManual && isConflict;
                          const isAttractionLike =
                            String(row?.type || "").toLowerCase() === "attraction" ||
                            Number(row?.item_type || 0) === 4;

                          return (
                            <React.Fragment key={`${name}-${index}`}>
                              <div className="hidden h-px w-8 bg-emerald-200 md:block" />

                              <div
                                className={[
                                  "flex min-w-[120px] max-w-[170px] flex-1 flex-col items-center rounded-lg border px-3 py-2 text-center",
                                  isManualConflict
                                    ? "border-red-400 bg-red-50 ring-2 ring-red-400 ring-offset-2"
                                    : isManual
                                      ? "border-emerald-600 bg-emerald-50 ring-2 ring-emerald-500 ring-offset-2"
                                      : isRemoved
                                        ? "border-dashed border-slate-300 bg-slate-50 opacity-50"
                                        : isConflict
                                          ? "border-red-300 bg-red-50"
                                          : "border-slate-200 bg-slate-50",
                                ].join(" ")}
                              >
                                <span
                                  className={[
                                    "text-xs font-bold",
                                    isManualConflict
                                      ? "text-red-800"
                                      : isManual
                                        ? "text-emerald-800"
                                        : isRemoved
                                          ? "text-slate-400 line-through"
                                          : isConflict
                                            ? "text-red-800"
                                            : "text-slate-800",
                                  ].join(" ")}
                                >
                                  {getShortName(name)}
                                </span>

                                <span className="mt-1 text-[10px] text-slate-500">
                                  {getRowTime(row)}
                                </span>

                                {isAttractionLike ? (
                                  <span className="mt-1 text-[10px] font-medium text-emerald-800/80">
                                    {`Op Hours ${operatingHoursLabel || "Not available"}`}
                                  </span>
                                ) : null}

                                {isManualConflict ? (
                                  <span className="mt-1 text-[10px] font-bold uppercase text-red-700">
                                    Cannot Insert
                                  </span>
                                ) : isManual ? (
                                  <span className="mt-1 text-[10px] font-bold uppercase text-emerald-700">
                                    Inserted
                                  </span>
                                ) : null}

                                {isRemoved && (
                                  <span className="mt-1 text-[10px] font-bold uppercase text-red-600">
                                    Removed
                                  </span>
                                )}

                                {isConflict && (
                                  <span className="mt-1 text-[10px] font-bold uppercase text-red-600">
                                    Conflict
                                  </span>
                                )}
                              </div>
                            </React.Fragment>
                          );
                        })}

                        <div className="hidden h-px w-8 bg-emerald-200 md:block" />

                        <div className="flex flex-col items-center">
                          <div className="mb-2 h-3 w-3 rounded-full bg-slate-500" />
                          <span className="text-[11px] font-medium text-slate-500">Hotel</span>
                        </div>
                      </div>
                    )}
                    {hasOpeningHoursRescueAttempts ? (
                      <p className="mt-3 text-xs font-semibold text-emerald-700">
                        Click timeline to {showRescueAttempts ? "hide" : "view"} rescue attempts.
                      </p>
                    ) : null}
                  </div>
                </section>

                {isSelectedClosedAtAttemptedTime ? (
                  <div
                    className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900"
                    data-testid="fit-here-selected-conflict"
                  >
                    <p className="font-bold">
                      {selectedOpeningConflict?.hotspotName || hotspotName} cannot be inserted here.
                    </p>

                    <div className="mt-2 grid gap-1 text-xs">
                      <p>
                        <span className="font-semibold">Attempted visit:</span>{" "}
                        {selectedOpeningConflict?.attemptedVisitTime || "Not available"}
                      </p>
                      <p>
                        <span className="font-semibold">Operating hours:</span>{" "}
                        {selectedOpeningConflict?.operatingHours || "Not available"}
                      </p>
                      <p>
                        <span className="font-semibold">Reason:</span>{" "}
                        {selectedOpeningConflict?.reason || "The hotspot is closed at the attempted time."}
                      </p>
                    </div>
                  </div>
                ) : null}

                {hasOpeningHoursRescueAttempts ? (
                  <div
                    data-testid="fit-here-rescue-attempts"
                    className="rounded-xl border border-amber-200 bg-amber-50 text-amber-900"
                  >
                    <button
                      type="button"
                      className="flex w-full items-center justify-between px-4 py-3 text-left"
                      onClick={() => setShowRescueAttempts((value) => !value)}
                      aria-expanded={showRescueAttempts}
                    >
                      <div>
                        <p className="font-bold">
                          {attempt?.canConfirm ? "How this fit was rescued" : "Rescue attempts checked"}
                        </p>
                        <p className="mt-1 text-xs">
                          {attempt?.canConfirm
                            ? "The system found a fit by checking same-route non-manual hotspot removals."
                            : "The system tested same-route non-manual hotspot removals before deciding whether this can fit."}
                        </p>
                      </div>
                      <span className="text-xs font-bold">
                        {showRescueAttempts ? "Hide" : "Show"}
                      </span>
                    </button>
                    {showRescueAttempts ? (
                    <div className="space-y-2 px-4 pb-4 text-xs">
                      {openingHoursRescueAttempts.slice(0, 6).map((attemptRow: any, index: number) => {
                        const removedNames = Array.isArray(attemptRow?.removedHotspotNames)
                          ? attemptRow.removedHotspotNames.join(", ")
                          : Array.isArray(attemptRow?.removedHotspots)
                            ? attemptRow.removedHotspots.map((row: any) => row?.name || row?.hotspotName || row?.hotspot_name || row?.id).join(", ")
                            : Array.isArray(attemptRow?.removedHotspotIds)
                              ? attemptRow.removedHotspotIds.join(", ")
                              : "No removal set";
                        const protectedText = Array.isArray(attemptRow?.removalSummary?.protectedHotspots)
                          ? attemptRow.removalSummary.protectedHotspots
                              .map((item: any) => item?.name ? `${item.name}: ${item.reason}` : item?.reason)
                              .filter(Boolean)
                              .join(" ")
                          : "";
                        const attemptTimelineRows =
                          attemptRow?.previewTimelineDisplay ||
                          attemptRow?.displayTimeline ||
                          attemptRow?.previewTimeline ||
                          attemptRow?.timeline ||
                          [];
                        const selectedAttemptTimelineRow = Array.isArray(attemptTimelineRows)
                          ? (
                              attemptTimelineRows.find((row: any) => {
                                const hotspotId = Number(row?.hotspotId || row?.locationId || row?.hotspot_ID || row?.hotspot_id || 0);
                                const isAttraction =
                                  String(row?.type || "").toLowerCase() === "attraction" ||
                                  Number(row?.itemType || row?.item_type || 0) === 4;
                                const isRemoved =
                                  row?.isRemoved === true ||
                                  String(row?.status || "").toUpperCase() === "REMOVED";
                                return isAttraction && !isRemoved && hotspotId === Number(attempt?.selectedHotspotId || 0);
                              }) ||
                              attemptTimelineRows.find((row: any) => {
                                const hotspotId = Number(row?.hotspotId || row?.locationId || row?.hotspot_ID || row?.hotspot_id || 0);
                                return hotspotId === Number(attempt?.selectedHotspotId || 0);
                              })
                            )
                          : null;
                        const selectedAttemptTime =
                          attemptRow?.selectedAttemptedVisitTime ||
                          selectedAttemptTimelineRow?.timeRange ||
                          attemptRow?.finalArrivalTime ||
                          "Not available";
                        const selectedAttemptOperatingHours =
                          attemptRow?.selectedOperatingHours ||
                          selectedAttemptTimelineRow?.operatingHours ||
                          selectedAttemptTimelineRow?.timings ||
                          "Not available";
                        const removedAttemptIds = Array.isArray(attemptRow?.removedHotspotIds)
                          ? attemptRow.removedHotspotIds.map((id: any) => Number(id || 0))
                          : [];
                        const shouldShowDhanushkodiFallback =
                          !protectedText &&
                          String(selectedOpeningConflict?.hotspotName || hotspotName).toLowerCase().includes("ariyamaan") &&
                          Array.isArray(attemptTimelineRows) &&
                          attemptTimelineRows.some((row: any) => String(getRowName(row)).toLowerCase().includes("dhanushkodi")) &&
                          !removedAttemptIds.includes(42);

                        return (
                          <div
                            key={`${attemptRow?.attemptNumber || index}-${removedNames}`}
                            className="rounded-lg bg-white/70 px-3 py-2"
                            data-testid={`fit-here-rescue-attempt-${attemptRow?.attemptNumber || index + 1}`}
                          >
                            <p className="font-semibold">
                              Attempt {attemptRow?.attemptNumber || index + 1}: remove {removedNames}
                            </p>
                            <p>{hotspotName} time: {selectedAttemptTime}</p>
                            <p>Operating hours: {selectedAttemptOperatingHours}</p>
                            <p>
                              Result: {attemptRow?.resolved || attemptRow?.valid
                                ? "Fits after this removal set"
                                : (attemptRow?.reason || "Still does not fit")}
                            </p>
                            <AttemptTimelinePreview rows={attemptTimelineRows} />
                            {import.meta.env.DEV && Array.isArray(attemptRow?.displayTimelineErrors) && attemptRow.displayTimelineErrors.length > 0 ? (
                              <div className="mt-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-800">
                                <p className="font-bold">Developer warning: invalid attempt display timeline</p>
                                {attemptRow.displayTimelineErrors.map((item: string, i: number) => (
                                  <p key={i}>{item}</p>
                                ))}
                              </div>
                            ) : null}
                            <div className="mt-2 rounded-lg border border-amber-100 bg-amber-50/70 px-3 py-2">
                              <p className="font-semibold">Removal info</p>
                              <p>Removed: {removedNames}</p>
                              {protectedText ? (
                                <p>Protected: {protectedText}</p>
                              ) : shouldShowDhanushkodiFallback ? (
                                <p>Protected: Dhanushkodi was not removed because it is manually added / own-way.</p>
                              ) : null}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    ) : null}
                  </div>
                ) : null}

                {hasTimingRisk && (
                  <div className={`rounded-xl border p-4 text-sm ${timingRisk?.severity === "danger" ? "border-red-200 bg-red-50 text-red-900" : "border-amber-200 bg-amber-50 text-amber-900"}`}>
                    <p className="font-bold">Less time available at this hotspot</p>
                    <p className="mt-2">
                      {timingRisk?.message || "The selected hotspot would close before the planned visit fully completes."}
                    </p>
                  </div>
                )}

                {attempt?.suggestedAlternativePositions && attempt.suggestedAlternativePositions.length > 0 && (
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                    <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                      Suggested alternatives only
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      These are not selected. Click a different Fit Here button if you want to test another position.
                    </p>
                    <div className="mt-3 space-y-2">
                      {attempt.suggestedAlternativePositions.map((slot, index) => (
                        <div key={`alternative-${index}`} className="rounded-lg border border-white bg-white px-3 py-2 text-xs text-slate-700">
                          {slot?.label || `Alternative position ${index + 1}`}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {hasUnprovenProtectedRemoval ? (
                  <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
                    This preview removes a Priority 1 or Priority 2 hotspot without proven route-overflow or operating-hours evidence. Confirmation is blocked to prevent unsafe itinerary changes.
                  </div>
                ) : null}
                {hasUnauthorizedP3Removal || hasUnauthorizedProtectedRemoval ? (
                  <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
                    This preview removes a hotspot that was not allowed by the selected removal policy. Please recalculate or explicitly approve the required removal level.
                  </div>
                ) : null}

                {attempt.attemptLog && attempt.attemptLog.length > 0 && (
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                    <p className="mb-3 text-xs font-bold uppercase tracking-wide text-slate-500">
                      Optimiser Decision Log
                    </p>
                    <div className="space-y-2">
                      {attempt.attemptLog.map((log: any, index: number) => {
                        const status = normalizeFitHereStatus((log.status || "info") as FitHereStepStatus);
                        const label = log.label || log.step || `Check ${index + 1}`;
                        const message = log.message || log.reason || "Check completed.";

                        return (
                          <div
                            key={`${label}-${index}`}
                            className="flex gap-3 rounded-lg border border-white bg-white px-3 py-2"
                          >
                            <div className="mt-0.5 shrink-0">{getStepIcon(status)}</div>

                            <div>
                              <p className={`text-xs font-bold ${getStepTextClass(status)}`}>
                                {label}
                              </p>
                              <p className="mt-0.5 text-xs text-slate-500">{message}</p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : null}

          <div
            className="shrink-0 flex items-center justify-end gap-3 border-t border-slate-100 bg-slate-50 px-6 py-4"
            data-testid="fit-here-modal-footer"
          >
            <Button type="button" variant="ghost" onClick={onClose}>
              Cancel
            </Button>

            {failedReason && onRetry && (
              <Button type="button" variant="outline" onClick={onRetry}>
                Retry
                <RefreshCw className="ml-2 h-4 w-4" />
              </Button>
            )}

            {isSelectedClosedAtAttemptedTime && attempt?.canForceConflict ? (
              <Button
                type="button"
                onClick={() => onConfirm({
                  allowClosedHotspotConflict: true,
                  allowTimingRisk: true,
                  acknowledgedRemovedHotspotIds,
                })}
                disabled={
                  confirmLoading ||
                  loading ||
                  Boolean(failedReason) ||
                  hasUnprovenProtectedRemoval ||
                  hasUnauthorizedP3Removal ||
                  hasUnauthorizedProtectedRemoval ||
                  (requiresRemovalAcknowledgement && !allRemovalAcknowledged)
                }
                className="bg-amber-600 text-white hover:bg-amber-700"
              >
                Add Anyway as Conflict
                <AlertTriangle className="ml-2 h-4 w-4" />
              </Button>
            ) : (
              <Button
                type="button"
                onClick={() => onConfirm({ acknowledgedRemovedHotspotIds })}
                disabled={
                  !attempt?.canConfirm ||
                  confirmLoading ||
                  loading ||
                  Boolean(failedReason) ||
                  hasUnprovenProtectedRemoval ||
                  hasUnauthorizedP3Removal ||
                  hasUnauthorizedProtectedRemoval ||
                  isSelectedClosedAtAttemptedTime ||
                  (requiresRemovalAcknowledgement && !allRemovalAcknowledged)
                }
                className={shouldUseDangerConfirm ? "bg-red-600 text-white hover:bg-red-700" : "bg-emerald-700 text-white hover:bg-emerald-800"}
              >
                {confirmButtonLabel}
                <Sparkles className="ml-2 h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
