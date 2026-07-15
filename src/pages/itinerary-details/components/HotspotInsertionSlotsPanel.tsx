import React from "react";

type DisplayValue = string | number | null | undefined;
type InsertionSlot = {
  selectedAsBest?: boolean;
  isBest?: boolean;
  fitsOverall?: boolean;
  routeFitType?: string;
  routeFitStatus?: string;
  displayLabel?: string;
  label?: string;
  routeFitLabel?: string;
  finalDecisionReason?: string;
  routeMetrics?: { source?: string };
  routePossible?: boolean;
  roadDetourKm?: DisplayValue;
  distanceDelta?: DisplayValue;
  abOsrmDistanceKm?: DisplayValue;
  insertedRouteDistanceKm?: DisplayValue;
  distanceComparisonNote?: string;
  routeDecisionReason?: string;
  timingDecisionReason?: string;
  prioritySafe?: boolean;
  priorityDecisionReason?: string;
  fromName?: DisplayValue;
  toName?: DisplayValue;
  destinationHotelId?: DisplayValue;
};

type HotspotInsertionSlotsPanelProps = {
  slots: readonly InsertionSlot[];
  matrixFit?: { destinationHotelName?: DisplayValue } | null;
  destinationHotelDisplayName: string;
  routeFitBadgeClass: (routeFitType?: string) => string;
};

/** Renders the route-fit and timing evidence for every candidate insertion slot. */
export const HotspotInsertionSlotsPanel: React.FC<HotspotInsertionSlotsPanelProps> = ({
  slots,
  matrixFit,
  destinationHotelDisplayName,
  routeFitBadgeClass,
}) => {
  if (slots.length === 0) return null;

  return (
    <div className="border border-purple-200 bg-purple-50 p-3 rounded-lg text-sm space-y-2">
      <p className="font-bold text-purple-900 text-xs">All insertion attempts ({slots.length}):</p>
      {slots.map((slotOption, slotIdx) => {
        const isBest = slotOption?.selectedAsBest === true || slotOption?.isBest === true;
        const fits = slotOption?.fitsOverall !== false;
        const routeFitTypeUpper = String(slotOption?.routeFitType || "").toUpperCase();
        const routeFitStatusUpper = String(slotOption?.routeFitStatus || routeFitTypeUpper || "").toUpperCase();
        const slotLabelText = String(slotOption?.displayLabel || slotOption?.label || "").toLowerCase();
        const slotFinalReasonText = String(slotOption?.finalDecisionReason || "").toLowerCase();
        const slotNoRouteTagged = slotLabelText.includes("no route data")
          || slotFinalReasonText.includes("no route data")
          || slotLabelText.includes("route data unavailable")
          || slotFinalReasonText.includes("route-fit data unavailable");
        const routeMetricsSource = String(slotOption?.routeMetrics?.source || "NONE").toUpperCase();
        const slotHasRouteData = slotOption?.routePossible !== false
          && routeFitTypeUpper !== "UNKNOWN"
          && routeFitTypeUpper !== "MATRIX_UNAVAILABLE"
          && routeFitStatusUpper !== "NO_ROUTE_DATA"
          && routeFitStatusUpper !== "MATRIX_UNAVAILABLE"
          && routeMetricsSource === "MATRIX_CACHE"
          && !slotNoRouteTagged;
        const fitLabel = slotOption.displayLabel || slotOption.routeFitLabel || slotOption.label || slotOption.routeFitType || (fits ? "On route" : "Off route");
        const badgeClass = routeFitBadgeClass(slotOption.routeFitType);
        const detourKm = slotOption?.roadDetourKm != null ? Number(slotOption.roadDetourKm) : (slotOption?.distanceDelta != null ? Number(slotOption.distanceDelta) : null);
        const displayDetourKm = detourKm != null ? Math.max(0, Number.isFinite(detourKm) ? detourKm : 0) : null;
        const abKm = slotOption?.abOsrmDistanceKm != null ? Number(slotOption.abOsrmDistanceKm) : null;
        const viaKm = slotOption?.insertedRouteDistanceKm != null ? Number(slotOption.insertedRouteDistanceKm) : null;
        const showDistanceBreakdown = slotHasRouteData && (abKm != null || viaKm != null || detourKm != null);
        const showBestBadge = isBest && slotHasRouteData;
        const destinationName = ((
          /^hotel$/i.test(String(slotOption?.toName || "").trim())
          || (String(matrixFit?.destinationHotelName || "").trim().length > 0
            && String(slotOption?.toName || "").trim().toLowerCase() === String(matrixFit?.destinationHotelName || "").trim().toLowerCase())
          || Number(slotOption?.destinationHotelId || 0) > 0
        ) && destinationHotelDisplayName) ? destinationHotelDisplayName : slotOption?.toName;

        return (
          <div key={slotIdx} className={`rounded-lg border px-3 py-2 ${isBest ? "border-green-400 bg-green-50" : fits ? "border-gray-200 bg-white" : "border-red-200 bg-red-50 opacity-80"}`}>
            <div className="flex items-start justify-between gap-2">
              <span className={`text-xs font-semibold flex-1 truncate ${isBest ? "text-green-800" : "text-gray-800"}`}>
                {isBest ? "⭐ " : `${slotIdx + 1}. `}{slotOption?.fromName} → {destinationName}
              </span>
              <span className={`flex-shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full ${badgeClass}`}>{fitLabel}</span>
            </div>
            {showDistanceBreakdown && (
              <div className="mt-1.5 grid grid-cols-3 gap-x-2 text-[10px] text-gray-600 bg-gray-50 rounded px-2 py-1">
                {abKm != null && <div><span className="block text-gray-400">A→B direct</span><span className="font-semibold text-gray-700">{abKm.toFixed(1)} km</span></div>}
                {viaKm != null && <div><span className="block text-gray-400">Via hotspot</span><span className="font-semibold text-gray-700">{viaKm.toFixed(1)} km</span></div>}
                {displayDetourKm != null && <div><span className="block text-gray-400">Extra</span><span className={`font-bold ${displayDetourKm <= 0.5 ? "text-green-600" : displayDetourKm <= 5 ? "text-yellow-700" : "text-red-600"}`}>+{displayDetourKm.toFixed(1)} km</span></div>}
              </div>
            )}
            {slotHasRouteData && slotOption?.distanceComparisonNote && <p className="mt-0.5 text-[10px] text-blue-700">Note: {slotOption.distanceComparisonNote}</p>}
            {slotOption?.routeDecisionReason && <p className="mt-0.5 text-[10px] text-gray-500 italic">{slotOption.routeDecisionReason}</p>}
            {slotOption?.timingDecisionReason && <p className="mt-0.5 text-[10px] text-gray-500 italic">Timing reason: {slotOption.timingDecisionReason}</p>}
            {slotOption?.finalDecisionReason && <p className={`mt-0.5 text-[10px] italic ${showBestBadge ? "text-green-700" : "text-gray-700"}`}>{showBestBadge ? "Final reason: " : "Why not selected: "}{slotOption.finalDecisionReason}</p>}
            {!slotOption?.prioritySafe && slotOption?.priorityDecisionReason && <p className="mt-0.5 text-[10px] text-red-700 italic">Priority reason: {slotOption.priorityDecisionReason}</p>}
            {showBestBadge && <p className="mt-1 text-[10px] font-semibold text-green-700">✓ Best available slot</p>}
          </div>
        );
      })}
    </div>
  );
};

export default HotspotInsertionSlotsPanel;
