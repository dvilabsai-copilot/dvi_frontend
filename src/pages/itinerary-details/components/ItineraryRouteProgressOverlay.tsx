import { Loader2 } from "lucide-react";

type ItineraryRouteProgressOverlayProps = {
  visible: boolean;
  isSwitchingRouteOption: boolean;
  routeProgressTitle: string;
  routeProgressDetail: string;
  routeProgressPercent: number;
  routeTimeEstimatedMs: number;
  routeProgressHistory: string[];
};

export function ItineraryRouteProgressOverlay({
  visible,
  isSwitchingRouteOption,
  routeProgressTitle,
  routeProgressDetail,
  routeProgressPercent,
  routeTimeEstimatedMs,
  routeProgressHistory,
}: ItineraryRouteProgressOverlayProps) {
  if (!visible) return null;

  const routeProgressPct = Math.max(0, Math.min(100, Math.round(routeProgressPercent)));
  const routeCircleRadius = 42;
  const routeCircleCircumference = 2 * Math.PI * routeCircleRadius;
  const routeDashOffset = routeCircleCircumference - (routeProgressPct / 100) * routeCircleCircumference;

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/40">
      <div className="w-[340px] rounded-2xl bg-white p-6 text-center shadow-2xl">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-[#ffe9d6] text-2xl">⏱</div>
        <p className="text-sm text-slate-600">{isSwitchingRouteOption ? "Loading selected route" : routeProgressTitle}</p>
        <div className="mt-5 flex flex-col items-center gap-3">
          <div className="relative h-28 w-28">
            <svg className="h-28 w-28 -rotate-90" viewBox="0 0 100 100" role="img" aria-label="Route update progress">
              <circle cx="50" cy="50" r={routeCircleRadius} stroke="#e8edf4" strokeWidth="8" fill="none" />
              <circle cx="50" cy="50" r={routeCircleRadius} stroke="#d546ab" strokeWidth="8" strokeLinecap="round" fill="none" strokeDasharray={routeCircleCircumference} strokeDashoffset={routeDashOffset} style={{ transition: "stroke-dashoffset 250ms linear" }} />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center text-xl font-semibold text-slate-900">{routeProgressPct}%</div>
          </div>
          <div className="text-sm font-semibold text-slate-800">{routeProgressHistory[routeProgressHistory.length - 1] || "Updating itinerary..."}</div>
          <div className="min-h-[20px] text-xs font-medium text-slate-500">{routeProgressDetail}</div>
          <div className="text-xs text-slate-500">Estimated ~{Math.max(1, Math.round(routeTimeEstimatedMs / 1000))}s</div>
          {routeProgressHistory.length > 0 && (
            <div className="mt-1 w-full rounded-2xl border border-slate-200 bg-slate-50 p-3 text-left">
              <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500">Progress log</p>
              <div className="mt-2 space-y-2">
                {routeProgressHistory.map((step, index) => {
                  const isLatest = index === routeProgressHistory.length - 1;
                  return (
                    <div key={`${step}-${index}`} className={`rounded-xl border px-3 py-2 text-xs ${isLatest ? "border-[#d9b6f3] bg-white text-[#4a4260]" : "border-slate-200 bg-white/70 text-slate-500"}`}>
                      <div className="flex items-center gap-2">
                        {isLatest ? <Loader2 className="h-3.5 w-3.5 animate-spin text-[#d546ab]" /> : <div className="h-2 w-2 rounded-full bg-[#d546ab]" />}
                        <span>{step}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

