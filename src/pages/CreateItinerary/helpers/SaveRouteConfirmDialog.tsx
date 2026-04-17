// FILE: src/pages/CreateItinerary/SaveRouteConfirmDialog.tsx

import React from "react";

type Props = {
  open: boolean;
  isSaving: boolean;
  progressPercent: number;
  estimatedSeconds: number;
  dayCount: number;
  saveType: "itineary_basic_info" | "itineary_basic_info_with_optimized_route" | null;
  onClose: () => void;
  onSaveSameRoute: () => void;
  onOptimizeRoute: () => void;
};

export const SaveRouteConfirmDialog: React.FC<Props> = ({
  open,
  isSaving,
  progressPercent,
  estimatedSeconds,
  dayCount,
  saveType,
  onClose,
  onSaveSameRoute,
  onOptimizeRoute,
}) => {
  if (!open) return null;

  const pct = Math.max(0, Math.min(100, Math.round(progressPercent)));
  const circleRadius = 42;
  const circumference = 2 * Math.PI * circleRadius;
  const dashOffset = circumference - (pct / 100) * circumference;
  const savingLabel =
    saveType === "itineary_basic_info_with_optimized_route"
      ? "Optimizing route"
      : "Saving itinerary";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="relative w-full max-w-lg rounded-2xl bg-white p-8 text-center shadow-2xl">
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 text-slate-400 hover:text-slate-600"
        >
          ×
        </button>

        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[#ffe9d6]">
          <span className="text-3xl">🧭</span>
        </div>

        <p className="text-sm text-slate-600">
          Optimize route for  {" "}
          <span className="font-semibold text-slate-900">better</span>{" "}
          planning
        </p>

        {!isSaving ? (
          <div className="mt-8 flex items-center justify-center gap-4">
            <button
              type="button"
              onClick={onSaveSameRoute}
              disabled={isSaving}
              className="min-w-[170px] rounded-md bg-[#19b96b] px-6 py-2 text-sm font-semibold text-white shadow hover:bg-[#12a05b] disabled:opacity-60"
            >
              Proceed with same Route
            </button>

            <button
              type="button"
              onClick={onOptimizeRoute}
              disabled={isSaving}
              className="min-w-[170px] rounded-md bg-[#e0e0e0] px-6 py-2 text-sm font-semibold text-slate-700 hover:bg-[#d4d4d4] disabled:opacity-60"
            >
              Optimize route
            </button>
          </div>
        ) : (
          <div className="mt-8 flex flex-col items-center justify-center gap-3">
            <div className="relative h-28 w-28">
              <svg className="h-28 w-28 -rotate-90" viewBox="0 0 100 100" role="img" aria-label="Save progress">
                <circle cx="50" cy="50" r={circleRadius} stroke="#e8edf4" strokeWidth="8" fill="none" />
                <circle
                  cx="50"
                  cy="50"
                  r={circleRadius}
                  stroke="#19b96b"
                  strokeWidth="8"
                  strokeLinecap="round"
                  fill="none"
                  strokeDasharray={circumference}
                  strokeDashoffset={dashOffset}
                  style={{ transition: "stroke-dashoffset 250ms linear" }}
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center text-xl font-semibold text-slate-900">
                {pct}%
              </div>
            </div>
            <div className="text-sm font-semibold text-slate-800">{savingLabel}...</div>
            <div className="text-xs text-slate-500">
              Estimated ~{Math.max(1, estimatedSeconds)}s for {dayCount} day{dayCount > 1 ? "s" : ""}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
