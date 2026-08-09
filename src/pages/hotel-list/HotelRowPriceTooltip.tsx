import React, { useState } from "react";
import { FloatingHoverTooltip, getFloatingTooltipPosition } from "@/components/FloatingHoverTooltip";
import type { ItineraryHotelRow } from "../itinerary-details/itinerary-details.types";

const money = (value: unknown) => `₹ ${Number(value ?? 0).toLocaleString("en-IN", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})}`;

const amount = (value: unknown) => {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
};

/** PHP-compatible pricing breakdown for the price shown in one hotel-list row. */
export const HotelRowPriceTooltip: React.FC<{
  hotel: ItineraryHotelRow;
  grandTotal: number;
  roomCount?: number;
  extraBedCount?: number;
  childWithBedCount?: number;
  childWithoutBedCount?: number;
  hotelMarginPercentage?: number;
  children: React.ReactNode;
}> = ({ hotel, grandTotal, roomCount, extraBedCount = 0, childWithBedCount = 0, childWithoutBedCount = 0, hotelMarginPercentage: apiHotelMarginPercentage = 0, children }) => {
  const [position, setPosition] = useState<{ left: number; top: number } | null>(null);
  const rawSnapshot = (hotel as any).selectedPriceSnapshot ?? (hotel as any).selected_price_snapshot;
  let selectedSnapshot: Record<string, any> = {};
  if (rawSnapshot && typeof rawSnapshot === "object") {
    selectedSnapshot = rawSnapshot;
  } else if (typeof rawSnapshot === "string" && rawSnapshot.trim()) {
    try {
      const parsed = JSON.parse(rawSnapshot);
      if (parsed && typeof parsed === "object") selectedSnapshot = parsed;
    } catch {
      // Use the normalized row fields when a legacy snapshot is malformed.
    }
  }
  const selectedTotal = amount(
    (hotel as any).selectedTotalPrice ??
      (hotel as any).selected_total_price ??
      selectedSnapshot.totalPrice,
  );
  const rowGrandTotal = selectedTotal > 0 ? selectedTotal : grandTotal;
  const displayedRooms = Math.max(amount(roomCount) || amount(hotel.noOfRooms) || 1, 1);
  const explicitBaseTotal = amount(selectedSnapshot.baseTotalPrice ?? selectedSnapshot.base_total_price);
  const explicitBasePerNight = amount(
    selectedSnapshot.basePricePerNight ??
      selectedSnapshot.base_price_per_night ??
      (hotel as any).basePricePerNight,
  );
  const rawRoomCost = explicitBaseTotal > 0
    ? explicitBaseTotal
    : explicitBasePerNight > 0
      ? Number((explicitBasePerNight * displayedRooms).toFixed(2))
      : amount(hotel.baseHotelCost ?? hotel.totalRoomCost ?? hotel.totalHotelCost);
  const breakfastCost = amount(hotel.hotelMealPlanCost);
  const extraBedCost = amount(hotel.totalExtraBedCost ?? (hotel as any).extraBedCost);
  const withBedCost = amount(hotel.totalChildWithBedCost ?? (hotel as any).childWithBedCost);
  const withoutBedCost = amount(hotel.totalChildWithoutBedCost ?? (hotel as any).childWithoutBedCost);
  // Persisted availability rows can carry zero-valued breakdown fields even
  // when the itinerary plan has a requested bed count. Prefer a positive row
  // count, but fall back to the itinerary-level count when the row is zero.
  const displayedExtraBedCount = Math.max(amount(hotel.extraBedCount), amount(extraBedCount));
  const displayedWithBedCount = Math.max(amount(hotel.childWithBedCount), amount(childWithBedCount));
  const displayedWithoutBedCount = Math.max(amount(hotel.childWithoutBedCount), amount(childWithoutBedCount));
  const rawMargin = amount(selectedSnapshot.hotelMarginAmount ?? (hotel as any).hotelMarginAmount);
  // The selected AxisRooms row is payable-inclusive. If its list projection
  // omits the margin metadata, use the same configured AxisRooms margin used
  // by the backend selection response so the tooltip still reconciles base
  // and payable values instead of showing payable as room cost.
  const marginPercentage = amount(hotel.hotelMarginPercentage) || amount(apiHotelMarginPercentage) || (
    String(hotel.provider || '').toLowerCase() === 'axisrooms' ? 20 : 0
  );
  const providerKey = String(hotel.provider || '').trim().toLowerCase();
  // The row grand total is the selected payable rate. Legacy parent-row base
  // fields can belong to a different room/meal option, so reconcile the
  // tooltip components from the selected total and its API margin percentage.
  const apiBaseRoomCost = rawRoomCost;
  const inferredMarginPercentage = apiBaseRoomCost > 0 && rowGrandTotal > apiBaseRoomCost
    ? Number((((rowGrandTotal - apiBaseRoomCost) / apiBaseRoomCost) * 100).toFixed(2))
    : 0;
  const effectiveMarginPercentage = marginPercentage > 0 ? marginPercentage : inferredMarginPercentage;
  // Never reverse-calculate the supplier base from the payable amount. For
  // STAAH the API snapshot explicitly carries the pre-margin room cost
  // (₹1,630 in the current test rate); keep that value intact and calculate
  // margin/tax as separate components.
  // If an older availability row did not carry the selected snapshot, the
  // selected payable total plus the API margin percentage is still a safer
  // reconciliation source than that row's stale base amount.
  const derivedStaahBase = String(hotel.provider || '').trim().toLowerCase() === 'staah' &&
    selectedTotal > 0 && effectiveMarginPercentage > 0 &&
    explicitBaseTotal <= 0 && explicitBasePerNight <= 0
    ? Number((selectedTotal / (1 + effectiveMarginPercentage / 100)).toFixed(2))
    : 0;
  const derivedAxisRoomsBase = providerKey === 'axisrooms' && rowGrandTotal > 0 && effectiveMarginPercentage > 0 &&
    explicitBaseTotal <= 0 && explicitBasePerNight <= 0
    ? Number((rowGrandTotal / (1 + effectiveMarginPercentage / 100)).toFixed(2))
    : 0;
  const roomCost = derivedStaahBase > 0
    ? derivedStaahBase
    : derivedAxisRoomsBase > 0
      ? derivedAxisRoomsBase
      : rawRoomCost;
  const margin = roomCost > 0 && effectiveMarginPercentage > 0
    ? Number((roomCost * effectiveMarginPercentage / 100).toFixed(2))
    : rawMargin;
  const serviceTax = amount(
    selectedSnapshot.roomCostTaxAmount ??
      hotel.totalHotelTaxAmount ??
      amount(hotel.hotelRoomGstAmount) + amount(hotel.hotelMarginGstAmount) + amount(hotel.hotelMealPlanGstAmount),
  );
  // The persisted row total can be stale for AxisRooms: the row may still
  // contain the supplier/base amount while the API also supplies the margin.
  // When the breakdown has enough components, derive the payable total from
  // those same components so the header and Grand Total reconcile with the
  // displayed room cost and margin (for example ₹5,100 + ₹1,020 = ₹6,120).
  const breakdownTotal = Number((
    roomCost + breakfastCost + extraBedCost + withBedCost + withoutBedCost + margin + serviceTax
  ).toFixed(2));
  const hasPayableBreakdown = roomCost > 0 && (margin > 0 || breakfastCost > 0 || extraBedCost > 0 || withBedCost > 0 || withoutBedCost > 0 || serviceTax > 0);
  const effectiveGrandTotal = hasPayableBreakdown
    ? breakdownTotal
    : selectedTotal > 0
      ? selectedTotal
      : grandTotal;

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
        <FloatingHoverTooltip left={position.left} top={position.top} className="w-[330px] max-w-[calc(100vw-24px)]">
          <div className="mb-2 flex justify-between border-b border-gray-200 pb-2 font-semibold">
            <span>Hotel Cost Breakdown</span>
            <span className="text-[#d546ab]">{money(effectiveGrandTotal)}</span>
          </div>
          <div className="space-y-2 text-xs">
            <div className="flex justify-between"><span>Total No. of Rooms</span><span>{amount(roomCount) || amount(hotel.noOfRooms) || 1}</span></div>
            <div className="flex justify-between"><span>Total Room Cost</span><span>{money(roomCost)}</span></div>
            {breakfastCost > 0 && <div className="flex justify-between"><span>Total Breakfast Cost</span><span>{money(breakfastCost)}</span></div>}
            {(displayedExtraBedCount > 0 || extraBedCost > 0) && <div className="flex justify-between"><span>Total Extra Bed Cost ({displayedExtraBedCount})</span><span>{money(extraBedCost)}</span></div>}
            {(displayedWithBedCount > 0 || withBedCost > 0) && <div className="flex justify-between"><span>Total With Bed Cost ({displayedWithBedCount})</span><span>{money(withBedCost)}</span></div>}
            {(displayedWithoutBedCount > 0 || withoutBedCost > 0) && <div className="flex justify-between"><span>Total Without Bed Cost ({displayedWithoutBedCount})</span><span>{money(withoutBedCost)}</span></div>}
            {margin > 0 && <div className="flex justify-between"><span>Hotel Margin ({effectiveMarginPercentage}%)</span><span>{money(margin)}</span></div>}
            {serviceTax > 0 && <div className="flex justify-between"><span>Service Tax</span><span>{money(serviceTax)}</span></div>}
            <div className="flex justify-between border-t border-gray-200 pt-2 font-semibold text-[#d546ab]"><span>Grand Total</span><span>{money(effectiveGrandTotal)}</span></div>
          </div>
        </FloatingHoverTooltip>
      )}
    </span>
  );
};

export default HotelRowPriceTooltip;
