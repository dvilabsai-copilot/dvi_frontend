type Attempt = {
  strategyKey?: string; strategyLabel?: string; selected?: boolean; readyToApply?: boolean; source?: string; summary?: string; reason?: string;
  openingHourConflictCount?: number; routeEndOverflowMinutes?: number; removedOptionalCount?: number; removedTopPriorityCount?: number; extraTravelKm?: number;
};
type ManualAttemptDisplayMeta = { authoritative: boolean; wrapperOnly: boolean; attempts: readonly Attempt[] };
type HotspotManualAttemptLogProps = { meta: ManualAttemptDisplayMeta; selectedSummary?: string; wrapperOnly?: boolean };

/** Renders the bounded manual-optimizer attempt diagnostics shown during hotspot preview. */
export function HotspotManualAttemptLog({ meta, selectedSummary, wrapperOnly }: HotspotManualAttemptLogProps) {
  return (
    <div className="mt-2 rounded-lg border border-slate-200 bg-slate-50 p-3">
      <p className="text-xs font-semibold text-slate-800">{meta.authoritative ? "Attempted schedules" : "Candidate-wrapped attempt log"} ({meta.attempts.length})</p>
      {selectedSummary ? <p className="mt-1 text-[11px] text-slate-700">Selected: {selectedSummary}</p> : null}
      {wrapperOnly ? <p className="mt-1 text-[11px] text-amber-700">These rows are candidate-wrapper diagnostics, not authoritative real cluster simulations yet.</p> : null}
      {meta.attempts.slice(0, 6).map((attempt, index) => <div key={`${String(attempt.strategyKey || "attempt")}-${index}`} className={`rounded-md border px-2 py-2 text-[11px] ${attempt.selected === true ? "border-green-300 bg-green-50" : attempt.readyToApply === true ? "border-blue-200 bg-white" : "border-slate-200 bg-white"}`}><p className="font-semibold text-slate-800">{attempt.selected === true ? "Selected: " : ""}{attempt.strategyLabel || attempt.strategyKey || `Attempt ${index + 1}`}</p><p className="mt-1 text-[10px] uppercase tracking-wide text-slate-500">Source: {String(attempt.source || "UNKNOWN").replace(/_/g, " ")}</p><p className="mt-1 text-slate-600">{attempt.summary || attempt.reason || "No explanation available."}</p><p className="mt-1 text-slate-500">{attempt.openingHourConflictCount && attempt.openingHourConflictCount > 0 ? `Opening conflicts: ${attempt.openingHourConflictCount}. ` : ""}{Number(attempt.routeEndOverflowMinutes || 0) > 0 ? `Overflow: ${attempt.routeEndOverflowMinutes} min. ` : ""}{Number(attempt.removedOptionalCount || 0) > 0 ? `Removed P4+: ${attempt.removedOptionalCount}. ` : ""}{Number(attempt.removedTopPriorityCount || 0) > 0 ? `Removed P3: ${attempt.removedTopPriorityCount}. ` : ""}{Number(attempt.extraTravelKm || 0) > 0 ? `Extra detour: ${Number(attempt.extraTravelKm).toFixed(1)} km.` : ""}</p></div>)}
    </div>
  );
}

export default HotspotManualAttemptLog;
