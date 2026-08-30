import React, { useState } from "react";
import { FloatingHoverTooltip, getFloatingTooltipPosition } from "@/components/FloatingHoverTooltip";
import type { ItineraryHotelRow } from "../itinerary-details/itinerary-details.types";

const money = (value: unknown) => `₹ ${Number(value ?? 0).toLocaleString("en-IN", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})}`;

const numeric = (value: unknown) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

/** Read an API field without deriving a replacement value in the browser. */
export const readApiNumber = (source: Record<string, unknown>, ...keys: string[]) => {
  for (const key of keys) {
    const value = numeric(source[key]);
    if (value !== null) return value;
  }
  return null;
};

/**
 * The API owns hotel pricing. This component deliberately only renders the
 * already-calculated row breakdown. It must never multiply counts, calculate
 * margin, reverse-calculate a base, or reconcile competing totals in React.
 */
export const HotelRowPriceTooltip: React.FC<{
  hotel: ItineraryHotelRow;
  grandTotal: number;
  roomCount?: number;
  extraBedCount?: number;
  childWithBedCount?: number;
  childWithoutBedCount?: number;
  hotelMarginPercentage?: number;
  children: React.ReactNode;
}> = ({ hotel, grandTotal, roomCount, extraBedCount = 0, childWithBedCount = 0, childWithoutBedCount = 0, hotelMarginPercentage = 0, children }) => {
  const [position, setPosition] = useState<{ left: number; top: number } | null>(null);
  const row = hotel as unknown as Record<string, unknown>;
  const rawSnapshot = row.selectedPriceSnapshot ?? row.selected_price_snapshot;
  let snapshot: Record<string, unknown> = {};
  if (rawSnapshot && typeof rawSnapshot === "object") {
    snapshot = rawSnapshot as Record<string, unknown>;
  } else if (typeof rawSnapshot === "string" && rawSnapshot.trim()) {
    try {
      const parsed = JSON.parse(rawSnapshot);
      if (parsed && typeof parsed === "object") snapshot = parsed as Record<string, unknown>;
    } catch {
      // The normalized API row remains the source when a snapshot is invalid.
    }
  }

  // Availability refreshes keep the old selection until the user accepts the
  // change, but the API places the freshly checked values in
  // pendingAvailabilityChange.option. Display that server response so a
  // valid supplement is not shown as zero while the acknowledgement is
  // pending. This still performs no calculation in the browser.
  const pendingOption = snapshot.pendingAvailabilityChange &&
    typeof snapshot.pendingAvailabilityChange === "object" &&
    snapshot.pendingAvailabilityChange.option &&
    typeof snapshot.pendingAvailabilityChange.option === "object"
    ? snapshot.pendingAvailabilityChange.option as Record<string, unknown>
    : null;
  const pricingSnapshot = pendingOption ? { ...snapshot, ...pendingOption } : snapshot;

  const read = (...keys: string[]) => {
    const rowValue = readApiNumber(row, ...keys);
    if (rowValue !== null && rowValue > 0) return rowValue;
    return readApiNumber(pricingSnapshot, ...keys) ?? rowValue;
  };
  // Persisted row adapters may contain a placeholder zero while the API's
  // authoritative calculated value is present in selectedPriceSnapshot.
  // Prefer that snapshot for aggregate financial fields; this only selects a
  // value supplied by the API and never derives a price in the browser.
  const readFinancial = (...keys: string[]) => {
    const rowValue = readApiNumber(row, ...keys);
    if (rowValue !== null && rowValue > 0) return rowValue;
    const snapshotValue = readApiNumber(pricingSnapshot, ...keys);
    return snapshotValue ?? rowValue;
  };
  const roomRate = read("roomRate", "room_rate");
  const roomCost = read("totalRoomCost", "total_room_cost");
  const extraBedRate = read("extraBedRate", "extra_bed_rate");
  const extraBedCost = read("totalExtraBedCost", "total_extra_bed_cost", "extraBedAmount", "extra_bed_amount");
  const childWithBedRate = read("childWithBedRate", "child_with_bed_rate");
  const childWithBedCost = read("totalChildWithBedCost", "total_child_with_bed_cost", "childWithBedAmount", "child_with_bed_amount");
  const childWithoutBedRate = read("childWithoutBedRate", "child_without_bed_rate");
  const childWithoutBedCost = read("totalChildWithoutBedCost", "total_child_without_bed_cost", "childWithoutBedAmount", "child_without_bed_amount");
  const marginPercentage = read("hotelMarginPercentage", "hotel_margin_percentage") ?? numeric(hotelMarginPercentage) ?? 0;
  const marginAmount = readFinancial("hotelMarginTotalAmount", "hotel_margin_total_amount", "hotelMarginAmount", "hotel_margin_amount");
  // AxisRooms selection responses expose the API-calculated pre-margin total
  // as baseTotalPrice. It is the same direct value as hotelMarginBaseAmount;
  // never reconstruct it from the room/supplement lines here.
  const subtotal = readFinancial("hotelMarginBaseAmount", "hotel_margin_base_amount", "baseTotalPrice", "base_total_price", "subtotal", "hotelSubtotal", "hotel_subtotal");
  const tax = readFinancial("totalHotelTaxAmount", "total_hotel_tax_amount", "hotelTaxAmount", "hotel_tax_amount");
  const payable = readFinancial("totalHotelCost", "total_hotel_cost", "totalPrice", "total_price", "selectedTotalPrice", "selected_total_price") ?? numeric(grandTotal) ?? 0;

  const count = (apiKeys: string[], fallback: number) => read(...apiKeys) ?? fallback;
  const rooms = count(["noOfRooms", "total_no_of_rooms", "roomCount", "room_count"], roomCount || 1);
  const extraBeds = count(["extraBedCount", "extra_bed_count"], extraBedCount);
  const childrenWithBed = count(["childWithBedCount", "child_with_bed_count"], childWithBedCount);
  const childrenWithoutBed = count(["childWithoutBedCount", "child_without_bed_count"], childWithoutBedCount);

  const show = (event: React.MouseEvent<HTMLElement>) => {
    setPosition(getFloatingTooltipPosition(event.clientX, event.clientY, 330, 280));
  };

  return (
    <span
      className="cursor-help"
      tabIndex={0}
      onMouseEnter={show}
      onMouseMove={show}
      onMouseLeave={() => setPosition(null)}
      onFocus={(event) => {
        const rect = event.currentTarget.getBoundingClientRect();
        setPosition(getFloatingTooltipPosition(rect.right, rect.top, 330, 280));
      }}
      onBlur={() => setPosition(null)}
      aria-label="Show hotel price breakdown"
    >
      {children}
      {position && (
        <FloatingHoverTooltip left={position.left} top={position.top} className="w-[330px] max-w-[calc(100vw-24px)]" style={{ pointerEvents: "auto" }}>
          <div className="space-y-2 text-xs">
            <div className="flex justify-between"><span>Total No. of Rooms</span><span>{rooms}</span></div>
            {roomCost !== null && <div className="flex justify-between"><span>Room Cost</span><span>{rooms} × {money(roomRate ?? 0)} = {money(roomCost)}</span></div>}
            {extraBeds > 0 && extraBedCost !== null && <div className="flex justify-between"><span>Extra Bed Cost</span><span>{extraBeds} × {money(extraBedRate ?? 0)} = {money(extraBedCost)}</span></div>}
            {childrenWithBed > 0 && childWithBedCost !== null && <div className="flex justify-between"><span>With Bed Cost</span><span>{childrenWithBed} × {money(childWithBedRate ?? 0)} = {money(childWithBedCost)}</span></div>}
            {childrenWithoutBed > 0 && childWithoutBedCost !== null && <div className="flex justify-between"><span>Without Bed Cost</span><span>{childrenWithoutBed} × {money(childWithoutBedRate ?? 0)} = {money(childWithoutBedCost)}</span></div>}
            {subtotal !== null && <div className="flex justify-between border-t border-gray-200 pt-2 font-semibold"><span>Total</span><span>{money(subtotal)}</span></div>}
            {marginAmount !== null && <div className="flex justify-between"><span>Hotel Margin ({marginPercentage}%)</span><span>{money(marginAmount)}</span></div>}
            {tax !== null && tax > 0 && <div className="flex justify-between"><span>Service Tax</span><span>{money(tax)}</span></div>}
            <div className="flex justify-between border-t border-gray-200 pt-2 font-semibold text-[#d546ab]"><span>Grand Total</span><span>{money(payable)}</span></div>
          </div>
        </FloatingHoverTooltip>
      )}
    </span>
  );
};

export default HotelRowPriceTooltip;
