import React from "react";
import type { HotspotAnchor, TriedAnchorState } from "../itinerary-details.types";

type FitHereAnchorButtonProps = {
  anchor: HotspotAnchor;
  tried?: TriedAnchorState;
  onClick: () => void;
};

/** Presentation for a single Fit Here insertion anchor and its attempt status. */
export const FitHereAnchorButton: React.FC<FitHereAnchorButtonProps> = ({ anchor, tried, onClick }) => (
  <div
    data-testid="fit-here-anchor"
    data-anchor-index={anchor.anchorIndex}
    data-anchor-intent={anchor.anchorIntent}
    data-anchor-from={anchor.anchorFrom || ""}
    data-anchor-to={anchor.anchorTo || ""}
    data-anchor-label={anchor.anchorLabel || ""}
    className="relative ml-8 mt-3 flex items-center gap-2"
  >
    <button
      type="button"
      title={anchor.anchorLabel || "Fit Here"}
      onClick={onClick}
      className="group flex items-center gap-2 rounded-full border-2 border-emerald-200 bg-white px-4 py-1.5 text-xs font-bold text-emerald-700 shadow-sm transition-all hover:bg-emerald-50 active:scale-95"
    >
      <span className="transition-transform group-hover:rotate-90">+</span>
      Fit Here
    </button>

    {tried && (
      <span
        className={[
          "rounded-lg px-3 py-1.5 text-xs font-semibold shadow-sm",
          tried.status === "DIRECT_FIT"
            ? "border border-emerald-200 bg-emerald-50 text-emerald-700"
            : tried.status === "REMOVES_OPTIONAL"
              ? "border border-amber-200 bg-amber-50 text-amber-700"
              : tried.status === "P3_CONFIRMATION"
                ? "border border-amber-200 bg-amber-50 text-amber-700"
                : tried.status === "PRIORITY_CONFLICT"
                  ? "border border-red-200 bg-red-50 text-red-700"
                  : "border border-slate-200 bg-slate-100 text-slate-600",
        ].join(" ")}
      >
        {tried.label}
      </span>
    )}
  </div>
);

export default FitHereAnchorButton;
