import React, { useState } from "react";
import { FloatingHoverTooltip, getFloatingTooltipPosition } from "@/components/FloatingHoverTooltip";
import type { ItineraryHotelRow } from "../itinerary-details/itinerary-details.types";
import { isVsrHotel } from "./hotelList.utils";

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
  // Multi-room category edits persist one authoritative record per physical
  // room. Aggregate these records only for presentation.
  const roomTypeBreakdown = Array.isArray(pricingSnapshot.roomTypeBreakdown)
    ? pricingSnapshot.roomTypeBreakdown.filter((item): item is Record<string, unknown> => Boolean(item && typeof item === 'object'))
    : [];
  const groupedRoomTypes = Array.from(roomTypeBreakdown.reduce((groups, item) => {
    const name = String(item.roomType || item.roomTypeName || '').trim() || 'Room type';
    const group = groups.get(name) || {
      name, rooms: 0, roomCost: 0, roomRate: numeric(item.roomRate) ?? 0,
      extraBedCount: 0, extraBedCost: 0, extraBedRate: numeric(item.extraBedRate) ?? 0,
      childWithBedCount: 0, childWithBedCost: 0, childWithBedRate: numeric(item.childWithBedRate) ?? 0,
      childWithoutBedCount: 0, childWithoutBedCost: 0, childWithoutBedRate: numeric(item.childWithoutBedRate) ?? 0,
      subtotal: 0,
    };
    group.rooms += numeric(item.roomCount) ?? 1;
    group.roomCost += numeric(item.roomCost) ?? 0;
    group.extraBedCount += numeric(item.extraBedCount) ?? 0;
    group.extraBedCost += numeric(item.extraBedCost) ?? 0;
    group.childWithBedCount += numeric(item.childWithBedCount) ?? 0;
    group.childWithBedCost += numeric(item.childWithBedCost) ?? 0;
    group.childWithoutBedCount += numeric(item.childWithoutBedCount) ?? 0;
    group.childWithoutBedCost += numeric(item.childWithoutBedCost) ?? 0;
    group.subtotal += numeric(item.subtotal) ?? 0;
    groups.set(name, group);
    return groups;
  }, new Map<string, any>()).values());

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
  // A persisted row can retain the old flattened margin while the selected
  // room-allocation snapshot already contains the authoritative aggregate.
  // For mixed-room selections, prefer that snapshot so the displayed margin
  // belongs to the same allocation as the total and grand total.
  const marginAmount = roomTypeBreakdown.length > 0
    ? readApiNumber(pricingSnapshot, "hotelMarginTotalAmount", "hotel_margin_total_amount", "hotelMarginAmount", "hotel_margin_amount")
    : readFinancial("hotelMarginTotalAmount", "hotel_margin_total_amount", "hotelMarginAmount", "hotel_margin_amount");
  // AxisRooms selection responses expose the API-calculated pre-margin total
  // as baseTotalPrice. It is the same direct value as hotelMarginBaseAmount;
  // never reconstruct it from the room/supplement lines here.
  const subtotal = readFinancial("hotelMarginBaseAmount", "hotel_margin_base_amount", "baseTotalPrice", "base_total_price", "subtotal", "hotelSubtotal", "hotel_subtotal");
  const tax = readFinancial("totalHotelTaxAmount", "total_hotel_tax_amount", "hotelTaxAmount", "hotel_tax_amount");
  // The table has already resolved the authoritative API-backed amount for
  // this exact row and passes it as grandTotal. Use that same value here so
  // the tooltip cannot display a stale aggregate from another snapshot.
  const rowGrandTotal = numeric(grandTotal);
  const payable = rowGrandTotal !== null && rowGrandTotal > 0
    ? rowGrandTotal
    : readFinancial("totalHotelCost", "total_hotel_cost", "totalPrice", "total_price", "selectedTotalPrice", "selected_total_price") ?? rowGrandTotal ?? 0;

  const count = (apiKeys: string[], fallback: number) => read(...apiKeys) ?? fallback;
  // The row's noOfRooms can be stale after a room/category edit. The count
  // supplied by the itinerary header is the current occupancy requirement.
  // Keep all monetary values API-owned; only use this authoritative count for
  // the label and the API-provided room-cost breakdown display.
  const rooms = Math.max(Number(roomCount || 1), 1);
  // Supplier/manual rows can expose roomRate as either a per-room or an
  // aggregate value. totalRoomCost is the authoritative aggregate for the
  // selected rooms, so derive only the display unit from it to keep the
  // equation mathematically consistent without changing payable amounts.
  const displayRoomRate = roomCost !== null
    ? roomCost / rooms
    : roomRate;
  const isCompleteFare = isVsrHotel(hotel);
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
             {isCompleteFare && <div className="flex justify-between"><span>Complete Hotel Fare</span><span>{money(payable)}</span></div>}
             {!isCompleteFare && groupedRoomTypes.length > 0 && groupedRoomTypes.map((group) => (
               <div key={group.name} className="space-y-1 border-t border-gray-100 pt-2 first:border-t-0 first:pt-0">
                 <div className="flex justify-between font-semibold"><span>{group.name}</span><span>{group.rooms} {group.rooms === 1 ? 'room' : 'rooms'}</span></div>
                 <div className="flex justify-between"><span>Room Cost</span><span>{group.rooms} x {money(group.roomCost / Math.max(group.rooms, 1))} = {money(group.roomCost)}</span></div>
                 {group.extraBedCount > 0 && <div className="flex justify-between"><span>Extra Bed Cost</span><span>{group.extraBedCount} x {money(group.extraBedRate)} = {money(group.extraBedCost)}</span></div>}
                 {group.childWithBedCount > 0 && <div className="flex justify-between"><span>With Bed Cost</span><span>{group.childWithBedCount} x {money(group.childWithBedRate)} = {money(group.childWithBedCost)}</span></div>}
                 {group.childWithoutBedCount > 0 && <div className="flex justify-between"><span>Without Bed Cost</span><span>{group.childWithoutBedCount} x {money(group.childWithoutBedRate)} = {money(group.childWithoutBedCost)}</span></div>}
                 <div className="flex justify-between font-medium"><span>Subtotal</span><span>{money(group.subtotal)}</span></div>
               </div>
             ))}
             {!isCompleteFare && groupedRoomTypes.length === 0 && <>
               {roomCost !== null && <div className="flex justify-between"><span>Room Cost</span><span>{rooms} × {money(displayRoomRate ?? 0)} = {money(roomCost)}</span></div>}
               {extraBeds > 0 && extraBedCost !== null && <div className="flex justify-between"><span>Extra Bed Cost</span><span>{extraBeds} × {money(extraBedRate ?? 0)} = {money(extraBedCost)}</span></div>}
               {childrenWithBed > 0 && childWithBedCost !== null && <div className="flex justify-between"><span>With Bed Cost</span><span>{childrenWithBed} × {money(childWithBedRate ?? 0)} = {money(childWithBedCost)}</span></div>}
               {childrenWithoutBed > 0 && childWithoutBedCost !== null && <div className="flex justify-between"><span>Without Bed Cost</span><span>{childrenWithoutBed} × {money(childWithoutBedRate ?? 0)} = {money(childWithoutBedCost)}</span></div>}
             </>}
             {!isCompleteFare && subtotal !== null && <div className="flex justify-between border-t border-gray-200 pt-2 font-semibold"><span>Total</span><span>{money(subtotal)}</span></div>}
            {!isCompleteFare && marginAmount !== null && <div className="flex justify-between"><span>Hotel Margin ({marginPercentage}%)</span><span>{money(marginAmount)}</span></div>}
            {!isCompleteFare && tax !== null && tax > 0 && <div className="flex justify-between"><span>Service Tax</span><span>{money(tax)}</span></div>}
            <div className="flex justify-between border-t border-gray-200 pt-2 font-semibold text-[#d546ab]"><span>Grand Total</span><span>{money(payable)}</span></div>
          </div>
        </FloatingHoverTooltip>
      )}
    </span>
  );
};

export default HotelRowPriceTooltip;
