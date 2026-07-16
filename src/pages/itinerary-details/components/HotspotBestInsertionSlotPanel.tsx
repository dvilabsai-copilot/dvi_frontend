import React from "react";

type InsertionSlot = {
  fromName?: string;
  toName?: string;
  routeFitType?: string;
  displayLabel?: string;
  label?: string;
  roadDetourKm?: number;
  finalDecisionReason?: string;
  decisionReason?: string;
  distanceComparisonNote?: string;
  destinationHotelId?: number;
};

type MatrixFit = {
  destinationHotelName?: string;
  requestedSlot?: InsertionSlot & { routeFitType?: string };
  warning?: string;
};

type HotspotBestInsertionSlotPanelProps = {
  slot: InsertionSlot;
  matrixFit: MatrixFit | null;
  destinationHotelDisplayName: string;
  selectedSlotHasRouteData: boolean;
  routeFitBadgeClass: (routeFitType?: string) => string;
};

const displayDestination = (name: string | undefined, fallback: string, destinationHotelDisplayName: string, matrixFit: MatrixFit | null) => {
  const normalized = String(name || "").trim();
  const matrixHotel = String(matrixFit?.destinationHotelName || "").trim();
  const isHotel = /^hotel$/i.test(normalized) || (matrixHotel && normalized.toLowerCase() === matrixHotel.toLowerCase()) || false;
  return isHotel && destinationHotelDisplayName ? destinationHotelDisplayName : fallback;
};

/** Renders the selected best insertion slot and any requested-slot fallback details. */
export const HotspotBestInsertionSlotPanel: React.FC<HotspotBestInsertionSlotPanelProps> = ({
  slot,
  matrixFit,
  destinationHotelDisplayName,
  selectedSlotHasRouteData,
  routeFitBadgeClass,
}) => (
  <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm">
    <p className="mb-1.5 text-[11px] font-bold uppercase tracking-wide text-blue-900">Best insertion slot</p>
    <div className="flex items-start gap-2">
      <div className="min-w-0 flex-1">
        <p className="truncate text-xs font-semibold text-gray-800">{slot.fromName} → {displayDestination(slot.toName, slot.toName || "", destinationHotelDisplayName, matrixFit)}</p>
        {selectedSlotHasRouteData && slot.roadDetourKm != null && <p className="mt-0.5 text-[10px] text-gray-600">Extra distance: +{Number(slot.roadDetourKm).toFixed(1)} km</p>}
        {slot.finalDecisionReason ? <p className="mt-0.5 text-[10px] italic text-gray-500">Final reason: {slot.finalDecisionReason}</p> : slot.decisionReason ? <p className="mt-0.5 text-[10px] italic text-gray-500">{slot.decisionReason}</p> : null}
      </div>
      <span className={`flex-shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ${routeFitBadgeClass(slot.routeFitType)}`}>{slot.displayLabel || slot.label}</span>
    </div>
    {slot.distanceComparisonNote && <p className="mt-1 text-[10px] text-blue-700">Note: {slot.distanceComparisonNote}</p>}
    {matrixFit?.requestedSlot && matrixFit.requestedSlot.routeFitType === "MATRIX_UNAVAILABLE" && (
      <div className="mt-2 border-t border-blue-200 pt-2"><p className="mb-0.5 text-[10px] font-semibold text-gray-500">Requested slot:</p><p className="text-[10px] text-gray-600">{matrixFit.requestedSlot.fromName} → {displayDestination(matrixFit.requestedSlot.toName, matrixFit.requestedSlot.toName || "", destinationHotelDisplayName, matrixFit)}</p><span className="text-[10px] italic text-gray-400">{matrixFit.requestedSlot.label}</span></div>
    )}
    {matrixFit?.warning && <p className="mt-1.5 rounded bg-amber-50 px-2 py-1 text-[10px] text-amber-700">⚠ {matrixFit.warning}</p>}
  </div>
);

export default HotspotBestInsertionSlotPanel;
