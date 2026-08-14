import React from "react";
import { AlertTriangle, Car, CheckCircle2, Clock, IndianRupee, Info, MapPin } from "lucide-react";
import type { HotspotFeasibilityImpact } from "../hooks/useHotspotFeasibilityImpact";

type HotspotPreviewImpactPanelProps = {
  impact: HotspotFeasibilityImpact;
};

const formatMoney = (value: number) => `₹${value.toLocaleString("en-IN")}`;

/** Consolidated feasibility summary: cost, extra travel, hotel-return, vehicle and closing-time impact. */
export const HotspotPreviewImpactPanel: React.FC<HotspotPreviewImpactPanelProps> = ({ impact }) => {
  if (!impact?.hotspotName) return null;

  return (
    <div className="mb-3 flex-shrink-0 space-y-2 rounded-xl border border-[#e5d9f2] bg-white p-3 shadow-sm">
      <p className="flex items-center gap-1.5 text-xs font-bold text-[#4a4260]">
        <Info className="h-3.5 w-3.5" />
        Feasibility Impact
        <span className="font-medium text-[#8b7ba8]">• {impact.hotspotName}</span>
      </p>

      <div className="space-y-1.5 text-xs text-gray-700">
        {/* Cost impact */}
        <p className="flex items-start justify-between gap-2">
          <span className="flex items-center gap-1.5 text-gray-600">
            <IndianRupee className="h-3.5 w-3.5 text-[#d546ab]" />
            Entry ticket cost
          </span>
          <span className="text-right font-semibold">
            {impact.hasEntryCost
              ? `${formatMoney(impact.entryCostPerPerson)} × ${impact.paxCount} pax ≈ ${formatMoney(impact.estimatedEntryCost)}`
              : impact.paxCount > 0
                ? "No entry ticket for this hotspot"
                : "No pax data for estimate"}
          </span>
        </p>

        {/* Additional travel */}
        <p className="flex items-start justify-between gap-2">
          <span className="flex items-center gap-1.5 text-gray-600">
            <MapPin className="h-3.5 w-3.5 text-[#d546ab]" />
            Additional travel
          </span>
          <span className="text-right font-semibold">
            {impact.extraKmKnown
              ? `+${impact.extraKm.toFixed(1)} km`
              : "Distance being computed…"}
          </span>
        </p>

        {/* Expected hotel return time */}
        {impact.extraKmKnown || impact.hasOverflow ? (
          <p className="flex items-start justify-between gap-2">
            <span className="flex items-center gap-1.5 text-gray-600">
              <Clock className="h-3.5 w-3.5 text-[#d546ab]" />
              Expected hotel return
            </span>
            <span className="text-right font-semibold">
              {impact.hasOverflow
                ? `~${impact.overflowMinutes} min later than current route end`
                : "Within current route end time"}
            </span>
          </p>
        ) : null}

        {/* Extra vehicle usage */}
        <p className="flex items-start justify-between gap-2">
          <span className="flex items-center gap-1.5 text-gray-600">
            <Car className="h-3.5 w-3.5 text-[#d546ab]" />
            Vehicle usage
          </span>
          <span className={`text-right font-semibold ${impact.vehicleImpact === "likely_extra" ? "text-amber-700" : "text-green-700"}`}>
            {impact.vehicleImpactNote}
          </span>
        </p>

        {/* Attraction closing-time validation */}
        {impact.closingTimeKnown && (
          impact.closingTimeConflict ? (
            <p className="flex items-center gap-1.5 text-red-600">
              <AlertTriangle className="h-3.5 w-3.5" />
              <span className="font-semibold">Closing-time conflict detected — may require rescheduling</span>
            </p>
          ) : (
            <p className="flex items-center gap-1.5 text-green-700">
              <CheckCircle2 className="h-3.5 w-3.5" />
              <span className="font-semibold">Closing-time validation passed</span>
            </p>
          )
        )}
      </div>

      {impact.accuracyNote && (
        <p className="border-t border-[#f0e9f7] pt-1 text-[11px] text-[#8b7ba8]">{impact.accuracyNote}</p>
      )}
    </div>
  );
};

export default HotspotPreviewImpactPanel;