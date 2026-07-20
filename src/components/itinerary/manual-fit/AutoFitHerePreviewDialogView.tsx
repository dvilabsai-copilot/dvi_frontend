/* eslint-disable @typescript-eslint/no-explicit-any */
import { AlertTriangle, CheckCircle2, Loader2, MapPin, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";

export function AutoFitHerePreviewDialogView({ context }: { context: Record<string, any> }) {
  const { allRemovalAcknowledged, attempt, attempted, attemptedVisitTime, badgeText, badgeTone, baseTimeline, canConfirm, changesRequiredDisplay, completedLoadingRows, confirmButtonLabel, confirmLoading, deriveAutoPreviewAttemptState, displayedRemovedItems, elapsedSeconds, failedReason, formatPreviewMinutes, from, gapMinutes, getAnchorLabel, getRowHotspotId, getTimelineRowDistance, getTimelineRowDuration, getTimelineRowName, getTimelineRowOperatingHours, getTimelineRowTime, hasAnyConfirmableResult, hasExactAnchorMismatch, hotelGapWarning, hotspotId, hotspotName, hours, loading, loadingAnchorCount, loadingStartedAtMs, onClose, onConfirm, onSelectAnchorKey, open, operatingHours, performanceSummary, plannedRemovalIds, removedItems, requiresRemovalAcknowledgement, rescueAttemptUsed, resultConfig, resultMessage, results, rows, runningLoadingRow, selectedAnchorKey, selectedAttempt, selectedHotspot, selectedHotspotId, selectedOpeningConflict, selectedRow, selectedState, setRemovalsAcknowledged, summary, target, timelineRows } = context;
  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) onClose();
      }}
    >
      <DialogContent
        overlayClassName="z-[240] bg-black/60 pointer-events-none"
        className="pointer-events-auto z-[260] flex max-h-[92vh] w-[96vw] max-w-[96vw] flex-col overflow-hidden border border-slate-200 bg-white p-0 shadow-2xl sm:max-w-[1440px] sm:rounded-2xl [&>button]:hidden"
        data-testid="auto-fit-here-preview-dialog"
      >
        <div className="flex h-[92vh] min-h-0 flex-col overflow-hidden">
          <div className="shrink-0 border-b border-slate-100 px-6 py-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <DialogTitle className="text-xl font-bold text-slate-900">
                  Auto-Preview Fit Here
                </DialogTitle>
                <DialogDescription className="mt-1 text-sm text-slate-500">
                  {hotspotName} across every valid Fit Here position
                </DialogDescription>
              </div>

              <button
                type="button"
                onClick={onClose}
                className="rounded-full p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-800"
                aria-label="Close Auto-Preview"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          {loading ? (
            <div className="min-h-0 flex-1 overflow-y-auto px-6 py-6">
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-full bg-white">
                    <Loader2 className="h-5 w-5 animate-spin text-emerald-700" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-900">Ranking every valid position...</p>
                    <p className="mt-1 text-xs text-slate-600">
                      We are checking {loadingAnchorCount > 0 ? loadingAnchorCount : "all"} possible Fit Here position{loadingAnchorCount === 1 ? "" : "s"} one by one and sorting the cleanest outcome first.
                    </p>
                    <p className="mt-1 text-xs font-medium text-emerald-800">
                Elapsed: {elapsedSeconds}s {"\u2022"} Completed {completedLoadingRows.length}/{loadingAnchorCount || results.length || 0}
                    </p>
                  </div>
                </div>

                <div className="mt-4 rounded-xl border border-emerald-100 bg-white/70 px-4 py-3 text-xs text-slate-700">
                  <p className="font-semibold text-slate-900">
                    Current backend work
                  </p>
                  <p className="mt-1">
                    {runningLoadingRow?.anchor?.anchorLabel
                      ? `Checking position: ${runningLoadingRow.anchor.anchorLabel}`
                      : "Preparing the next valid Fit Here position."}
                  </p>
                  {runningLoadingRow?.progressText ? (
                    <p className="mt-2 text-slate-600">
                      {runningLoadingRow.progressText}
                    </p>
                  ) : null}
                </div>

                <div className="mt-5 space-y-2">
                  {results.map((row, index) => {
                    const status = String(row?.status || "PENDING").toUpperCase();
                    const isActive = status === "RUNNING";
                    const isDone = status === "COMPLETED";
                    const isFailed = status === "FAILED";
                    const label = String(
                      row?.anchor?.anchorLabel ||
                      row?.anchor?.anchorFrom ||
                      `Position ${index + 1}`,
                    ).trim();
                    const subText =
                      isActive
                        ? row?.progressText
                        : isDone
                              ? `${row?.elapsedMs ? `${(Number(row.elapsedMs) / 1000).toFixed(1)}s` : "Done"}${row?.removedCount ? ` \u2022 ${row.removedCount} removal${row.removedCount === 1 ? "" : "s"}` : ""}`
                          : isFailed
                            ? (row?.error || "This position could not be previewed.")
                            : (row?.progressText || "Waiting to simulate this position.");

                    return (
                      <div
                        key={row.anchorKey || `${label}-${index}`}
                        className={`rounded-xl border px-3 py-2 text-sm ${
                          isActive
                            ? "border-emerald-300 bg-white text-emerald-900"
                            : isFailed
                              ? "border-red-200 bg-red-50 text-red-800"
                            : isDone
                              ? "border-emerald-100 bg-emerald-100/60 text-slate-800"
                              : "border-slate-100 bg-slate-50 text-slate-500"
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          {isActive ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : isFailed ? (
                            <AlertTriangle className="h-4 w-4" />
                          ) : isDone ? (
                            <CheckCircle2 className="h-4 w-4" />
                          ) : (
                            <MapPin className="h-4 w-4" />
                          )}
                          <span>{label}</span>
                        </div>
                        {subText ? (
                          <p className="mt-1 pl-6 text-xs text-slate-600">
                            {subText}
                          </p>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          ) : (
            <div className="grid min-h-0 flex-1 gap-0 lg:grid-cols-[360px_minmax(0,1fr)]">
              <div className="min-h-0 overflow-y-auto border-b border-slate-100 px-5 py-5 lg:border-b-0 lg:border-r">
                <div className="mb-4">
                  <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Ranked positions</p>
                  <p className="mt-1 text-sm text-slate-600">
                    The cleanest confirmable position is ranked first.
                  </p>
                  {performanceSummary?.totalElapsedMs ? (
                    <p className="mt-2 text-xs text-slate-500">
                      Ranked {results.length} position{results.length === 1 ? "" : "s"} in{" "}
                      {(Number(performanceSummary.totalElapsedMs) / 1000).toFixed(1)}s
                      {Number(performanceSummary.avgAnchorMs || 0) > 0
                              ? ` \u2022 Avg ${(Number(performanceSummary.avgAnchorMs) / 1000).toFixed(1)}s per position`
                        : ""}
                      {performanceSummary.slowestAnchorLabel && Number(performanceSummary.slowestAnchorMs || 0) > 0
                              ? ` \u2022 Slowest: ${performanceSummary.slowestAnchorLabel} (${(Number(performanceSummary.slowestAnchorMs) / 1000).toFixed(1)}s)`
                        : ""}
                    </p>
                  ) : null}
                </div>

                {failedReason ? (
                  <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                    {failedReason}
                  </div>
                ) : null}

                <div className="space-y-3" data-testid="auto-fit-here-results">
                  {results.map((row, index) => {
                    const rowState = deriveAutoPreviewAttemptState(row, baseTimeline);
                    const isSelected = row.anchorKey === selectedRow?.anchorKey;
                    const isBest = index === 0;
                    const isCompleted = row.status === "COMPLETED";
                    const badgeClass =
                      rowState.badgeTone === "success"
                        ? "bg-emerald-100 text-emerald-700"
                        : rowState.badgeTone === "warning"
                          ? "bg-amber-100 text-amber-700"
                          : rowState.badgeTone === "danger"
                            ? "bg-red-100 text-red-700"
                            : "bg-slate-100 text-slate-700";

                    return (
                      <button
                        key={row.anchorKey}
                        type="button"
                        data-testid="auto-fit-here-result-row"
                        onClick={() => onSelectAnchorKey(row.anchorKey)}
                        className={`w-full rounded-2xl border px-4 py-3 text-left transition ${
                          isSelected
                            ? "border-emerald-400 bg-emerald-50 shadow-sm"
                            : "border-slate-200 bg-white hover:border-slate-300"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="text-sm font-semibold text-slate-900">{getAnchorLabel(row)}</p>
                              {isBest ? (
                                <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase text-white ${
                                  hasAnyConfirmableResult ? "bg-emerald-700" : "bg-slate-600"
                                }`}>
                                  {hasAnyConfirmableResult ? "Best" : "Closest Attempt"}
                                </span>
                              ) : null}
                            </div>
                            <p className="mt-1 text-xs text-slate-500">
                              {String(row?.anchor?.anchorIntent || "").toUpperCase() === "AFTER_START"
                                ? "Before first attraction"
                                : `After ${String(row?.anchor?.anchorFrom || "attraction").trim()}`}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-xs font-bold text-slate-500">Score</p>
                            <p className="text-sm font-semibold text-slate-900">{Number(row?.score || 0)}</p>
                          </div>
                        </div>

                        <p className="mt-2 text-sm text-slate-700">
                          {rowState.summary}
                        </p>

                        <div className="mt-3 flex flex-wrap gap-2 text-[11px] font-semibold">
                          <span className={`rounded-full px-2.5 py-1 ${badgeClass}`}>
                            {isCompleted ? rowState.badgeText : "Failed"}
                          </span>
                          <span className="rounded-full bg-slate-100 px-2.5 py-1 text-slate-600">
                            {rowState.displayedRemovedItems.length > 0
                              ? `${rowState.displayedRemovedItems.length} removal${rowState.displayedRemovedItems.length === 1 ? "" : "s"}`
                              : "No removal"}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="min-h-0 overflow-y-auto px-6 py-5">
                <div className="flex flex-col gap-5" data-testid="auto-fit-here-selected-details">
                  {selectedAttempt ? (
                    <section className={`rounded-2xl border p-4 ${resultConfig.wrapperClass}`}>
                      <span className={`inline-block rounded-full px-3 py-1 text-xs font-bold ${resultConfig.badgeClass}`}>
                        {resultConfig.badge}
                      </span>
                      <p className="mt-3 text-sm leading-5">{resultMessage}</p>
                      {selectedState.summary && selectedState.summary !== resultMessage ? (
                        <p className="mt-2 text-xs text-slate-600">
                          Technical reason: {selectedState.summary}
                        </p>
                      ) : null}
                    </section>
                  ) : (
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
                      Select a ranked result to inspect its finalized timeline.
                    </div>
                  )}

                  <div className="order-3">
                    <div className="space-y-4">
                      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 shadow-sm">
                        <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Selected position</p>
                        <p className="mt-1 text-lg font-semibold text-slate-900">
                          {selectedRow ? getAnchorLabel(selectedRow) : "No position selected"}
                        </p>
                      </div>

                      <div
                        className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
                        data-testid="auto-fit-here-changes-required"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                              {changesRequiredDisplay?.title || "Changes required"}
                            </p>
                            <p className="mt-2 text-xs font-semibold text-slate-600">
                              {changesRequiredDisplay?.removalOrderLabel || "Removal order checked: Non-manual / Priority 4 -> Priority 3 -> Priority 2 -> Priority 1"}
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
                    {selectedState.hasReorderedTimeline ? (
                      <div className="mt-3 rounded-xl border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-medium text-blue-900">
                        Existing downstream hotspots were reordered in the finalized sequence to preserve the selected Fit Here outcome.
                      </div>
                    ) : null}
                    {selectedState.hasShiftedTimeline ? (
                      <div className="mt-3 rounded-xl border border-sky-200 bg-sky-50 px-3 py-2 text-xs font-medium text-sky-900">
                        Some later timeline rows were pushed forward after insertion. Check the finalized sequence below.
                      </div>
                    ) : null}
                        {removedItems.length === 0 ? (
                      <p className="mt-2 text-sm text-slate-700">
                        {changesRequiredDisplay?.noRemovalText || "No hotspot removed"}
                      </p>
                    ) : (
                      <div className="mt-3 space-y-3">
                        {selectedState.rescueAttemptUsed ? (
                          <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
                            These hotspot removals were tried while preserving the selected exact position, but the exact anchor still could not be kept.
                          </div>
                        ) : null}
                        <div className="grid gap-3 sm:grid-cols-2">
                        {removedItems.map((item, index) => {
                          const checked = allRemovalAcknowledged;
                          const showAcknowledgementCheckbox = requiresRemovalAcknowledgement && index === 0;

                          return (
                            <label
                              key={item.hotspotId}
                              className={`flex items-start gap-3 rounded-xl border p-3 transition ${
                                showAcknowledgementCheckbox && checked
                                  ? "border-emerald-300 bg-emerald-50"
                                  : selectedState.canConfirm
                                    ? "border-amber-200 bg-amber-50 shadow-sm"
                                    : "border-slate-200 bg-slate-50"
                              } ${showAcknowledgementCheckbox ? "sm:col-span-2" : ""}`}
                            >
                              {showAcknowledgementCheckbox ? (
                                <input
                                  type="checkbox"
                                  data-testid="auto-fit-here-removal-ack-checkbox"
                                  checked={checked}
                                  onChange={(event) => {
                                    setRemovalsAcknowledged(event.target.checked);
                                  }}
                                  className="mt-1 h-5 w-5 rounded border-amber-300 accent-emerald-700"
                                />
                              ) : (
                                <div className="mt-1 h-5 w-5 shrink-0" />
                              )}
                              <div>
                                {showAcknowledgementCheckbox ? (
                                  <p className="text-sm font-semibold text-slate-900">
                                    I reviewed all listed removals and want to continue.
                                  </p>
                                ) : null}
                                <p className={`text-sm font-semibold text-slate-900 ${showAcknowledgementCheckbox ? "mt-2" : ""}`}>{item.name}</p>
                                {showAcknowledgementCheckbox ? (
                                  <p className="mt-1 text-xs text-slate-600">
                                    This acknowledges {removedItems.length} hotspot{removedItems.length === 1 ? "" : "s"} removed from the finalized route.
                                  </p>
                                ) : !selectedState.canConfirm ? (
                                  <p className="mt-1 text-xs text-slate-600">
                                    {selectedState.hasExactAnchorMismatch
                                      ? "This hotspot was only removed during failed anchor-preserving rescue attempts and does not unlock this position."
                                      : "This hotspot was part of a failed rescue attempt and does not unlock confirmation for this position."}
                                  </p>
                                ) : null}
                                <p className="mt-1 text-xs text-slate-600">
                                  {item.workPriority ? `Priority ${item.workPriority}` : "Priority not set"}
                                  {item.reason ? ` \u2022 ${item.reason}` : ""}
                                </p>
                              </div>
                            </label>
                          );
                        })}
                        </div>
                      </div>
                    )}
                      </div>
                    </div>
                  </div>

                  {selectedState.selectedOpeningConflict ? (
                    <div className="order-2 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-900">
                      <p className="font-bold">
                        {selectedState.selectedOpeningConflict?.hotspotName || hotspotName} cannot be inserted here.
                      </p>
                      <div className="mt-2 grid gap-1 text-xs">
                        <p>
                          <span className="font-semibold">Attempted visit:</span>{" "}
                          {selectedState.selectedOpeningConflict?.attemptedVisitTime || "Not available"}
                        </p>
                        <p>
                          <span className="font-semibold">Operating hours:</span>{" "}
                          {selectedState.selectedOpeningConflict?.operatingHours || "Not available"}
                        </p>
                        <p>
                          <span className="font-semibold">Reason:</span>{" "}
                          {selectedState.selectedOpeningConflict?.reason || "The hotspot is closed at the attempted time."}
                        </p>
                      </div>
                    </div>
                  ) : null}

                  <div
                    className="order-1 rounded-2xl border border-slate-200 bg-white p-4"
                    data-testid="auto-fit-here-main-timeline"
                  >
                    <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                      {selectedState.hasExactAnchorMismatch ? "Anchor-preserving result" : "Finalized timeline"}
                    </p>
                    {hotelGapWarning ? (
                      <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-900">
                        Gap before hotel check-in: {formatPreviewMinutes(hotelGapWarning.gapMinutes)} after {hotelGapWarning.previousRowName}. Hotel travel distance/duration may be missing from the preview data.
                      </div>
                    ) : null}
                    {timelineRows.length === 0 ? (
                      <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
                        {selectedRow?.status === "FAILED"
                          ? selectedRow?.error || "This position could not be previewed."
                          : selectedState.hasExactAnchorMismatch
                            ? "No valid anchor-preserving finalized timeline exists for this selected position."
                            : selectedAttempt?.rejectedReasons?.[0] || "No finalized timeline available for this position."}
                      </div>
                    ) : (
                      <div className="mt-3 space-y-3">
                        {timelineRows.map((row: any, index: number) => {
                          const hotspotId = getRowHotspotId(row);
                          const isSelectedHotspot = hotspotId > 0 && hotspotId === Number(selectedAttempt?.selectedHotspotId || 0);
                          const isRemoved = row?.isRemoved === true || String(row?.status || "").toUpperCase() === "REMOVED";
                          const operatingHours = getTimelineRowOperatingHours(row);
                          const isAttraction = String(row?.type || "").toLowerCase() === "attraction";
                          const isTravel = String(row?.type || "").toLowerCase() === "travel";
                          const travelDistance = getTimelineRowDistance(row);
                          const travelDuration = getTimelineRowDuration(row);

                          return (
                            <div
                              key={`${String(row?.type || "row")}-${hotspotId}-${index}`}
                              className={`rounded-xl border px-4 py-3 ${
                                isSelectedHotspot
                                  ? "border-emerald-300 bg-emerald-50"
                                  : isRemoved
                                    ? "border-red-200 bg-red-50"
                                    : "border-slate-200 bg-slate-50"
                              }`}
                            >
                              <div className="flex items-start justify-between gap-3">
                                <div>
                                  <p className="text-sm font-semibold text-slate-900">{getTimelineRowName(row)}</p>
                                  {getTimelineRowTime(row) ? (
                                    <p className="mt-1 text-xs text-slate-500">{getTimelineRowTime(row)}</p>
                                  ) : null}
                                  {isTravel && (travelDistance || travelDuration) ? (
                                    <div className="mt-1 flex flex-wrap gap-2 text-xs text-slate-600">
                                      {travelDistance ? (
                                        <span className="rounded-full bg-slate-100 px-2 py-0.5">
                                          {travelDistance}
                                        </span>
                                      ) : null}
                                      {travelDuration ? (
                                        <span className="rounded-full bg-slate-100 px-2 py-0.5">
                                          {travelDuration}
                                        </span>
                                      ) : null}
                                    </div>
                                  ) : null}
                                  {isAttraction && operatingHours ? (
                                    <p className="mt-1 text-xs font-semibold text-emerald-700">
                                      Op Hours {operatingHours}
                                    </p>
                                  ) : null}
                                </div>
                                <div className="flex flex-wrap items-center gap-2">
                                  {isSelectedHotspot ? (
                                    <span className="rounded-full bg-emerald-700 px-2 py-0.5 text-[10px] font-bold uppercase text-white">
                                      Selected
                                    </span>
                                  ) : null}
                                  {isRemoved ? (
                                    <span className="rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-bold uppercase text-red-700">
                                      Removed
                                    </span>
                                  ) : null}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>

                <div className="mt-5 flex items-center justify-end gap-3">
                  <Button variant="outline" onClick={onClose}>
                    Close
                  </Button>
                  <Button
                    type="button"
                    disabled={!canConfirm || confirmLoading}
                    onClick={() => {
                      onConfirm({
                        allowTimingRisk: selectedAttempt?.requiresTimingRiskConfirmation === true,
                        acknowledgedRemovedHotspotIds: allRemovalAcknowledged ? plannedRemovalIds : [],
                      }, selectedAttempt);
                    }}
                    className={!canConfirm
                      ? "bg-slate-200 text-slate-500 hover:bg-slate-200"
                      : removedItems.length > 0
                        ? "bg-amber-600 text-white hover:bg-amber-700"
                        : ""}
                  >
                    {confirmLoading ? "Confirming..." : confirmButtonLabel}
                  </Button>
                </div>

                {selectedState.canConfirm && requiresRemovalAcknowledgement && !allRemovalAcknowledged ? (
                  <div className="mt-4 flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                    <span>Confirm is waiting for your acknowledgement in the Changes Required box above.</span>
                  </div>
                ) : null}

                {!selectedState.canConfirm && !loading ? (
                  <div className="mt-4 flex items-start gap-2 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                    <span>
                      {selectedState.summary ||
                        "This ranked position cannot be confirmed right now."}
                    </span>
                  </div>
                ) : null}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

