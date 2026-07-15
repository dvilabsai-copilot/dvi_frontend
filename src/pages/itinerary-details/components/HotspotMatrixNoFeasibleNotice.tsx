type InsertionSlot = { fromName?: string; toName?: string; routeFitType?: string; label?: string; destinationHotelId?: number };
type HotspotMatrixNoFeasibleNoticeProps = { visible: boolean; safeMatrixSlots: readonly InsertionSlot[]; destinationHotelDisplayName: string; destinationHotelName?: string; routeFitBadgeClass: (routeFitType?: string) => string };

/** Renders the manual-add warning and candidate insertion slots when no feasible slot exists. */
export function HotspotMatrixNoFeasibleNotice({ visible, safeMatrixSlots, destinationHotelDisplayName, destinationHotelName, routeFitBadgeClass }: HotspotMatrixNoFeasibleNoticeProps) {
  if (!visible) return null;
  return (
    <div className="mt-2 rounded-lg border border-orange-200 bg-orange-50 p-2">
      <p className="text-xs leading-4 text-orange-700">This hotspot adds extra distance or off-route travel. For manual add, this is treated as a warning. The final decision is based on whether the rebuilt timeline fits within the manual timing window.</p>
      {safeMatrixSlots.length > 0 && <div className="mt-2 text-xs text-orange-700"><p className="mb-1 font-semibold text-orange-800">Insertion attempts:</p><ul className="space-y-1 pl-3">{safeMatrixSlots.slice(0, 5).map((slot, index) => { const normalizedTo = String(slot.toName || "").trim(); const isHotel = /^hotel$/i.test(normalizedTo) || (destinationHotelName && normalizedTo.toLowerCase() === destinationHotelName.toLowerCase()) || Number(slot.destinationHotelId || 0) > 0; return <li key={index} className="list-disc">{slot.fromName} → {isHotel && destinationHotelDisplayName ? destinationHotelDisplayName : slot.toName}:{" "}<span className={`rounded-full px-1.5 py-0.5 text-[11px] font-bold ${routeFitBadgeClass(slot.routeFitType)}`}>{slot.label || slot.routeFitType}</span></li>; })}{safeMatrixSlots.length > 5 && <li className="text-orange-600">+{safeMatrixSlots.length - 5} more</li>}</ul></div>}
    </div>
  );
}

export default HotspotMatrixNoFeasibleNotice;
