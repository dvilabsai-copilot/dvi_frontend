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

export function resolveAuthoritativeHotelMargin(input: {
  baseAmount: number;
  payableAmount: number;
  marginPercentage: number;
  marginAmount: number;
  sameScope: boolean;
}) {
  const explicitMargin = amount(input.marginAmount);
  const percentage = amount(input.marginPercentage);
  const calculatedMargin = explicitMargin > 0
    ? explicitMargin
    : input.sameScope && input.baseAmount > 0 && percentage > 0
      ? Number((input.baseAmount * percentage / 100).toFixed(2))
      : 0;
  return {
    percentage,
    marginAmount: calculatedMargin,
    unavailable: calculatedMargin <= 0 && input.baseAmount > 0 && input.payableAmount > input.baseAmount,
  };
}

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
  const startingAmount = amount(
    (hotel as any).startingFromBaseAmount ?? selectedSnapshot.startingFromBaseAmount,
  );
  const providerKey = String(hotel.provider || '').trim().toLowerCase();
  const persistedRowRoomCost = amount(hotel.totalRoomCost);
  // totalRoomCost is the authoritative one-night room total for every
  // provider. This prevents an old snapshot/presentation amount (for
  // example DOUBLE + supplements) from being shown as the room rate.
  // Legacy rows without totalRoomCost retain their provider-specific scope
  // handling below, including offline continuous-stay rows.
  const oneNightApiRoomCost = persistedRowRoomCost > 0
    ? persistedRowRoomCost
    : providerKey === 'axisrooms' && explicitBaseTotal > 0
      ? explicitBaseTotal
    : startingAmount > 0
      ? (explicitBaseTotal > 0 && Math.abs(startingAmount - explicitBaseTotal) < 0.01
        ? explicitBaseTotal
        : Number((startingAmount * displayedRooms).toFixed(2)))
      : explicitBasePerNight > 0
        ? Number((explicitBasePerNight * displayedRooms).toFixed(2))
        : explicitBaseTotal;
  const rawRoomCost = oneNightApiRoomCost > 0
    ? oneNightApiRoomCost
      : amount(hotel.baseHotelCost ?? hotel.totalRoomCost ?? hotel.totalHotelCost);
  const breakfastCost = amount(hotel.hotelMealPlanCost);
  // A selected recommendation can carry a zero-valued breakdown field while
  // the persisted hotel row carries the authoritative supplement amount.
  // Nullish coalescing is not enough here because zero is a real value that
  // masks the positive persisted fallback.
  const positiveOrFallback = (primary: unknown, fallback: unknown) => {
    const primaryAmount = amount(primary);
    return primaryAmount > 0 ? primaryAmount : amount(fallback);
  };
  // When the API has supplied a selected payable total but no supplement
  // amount, do not manufacture supplement charges from itinerary counts.
  // The row total is authoritative and the tooltip must reconcile to it.
  const hasAuthoritativeSelectedTotal = selectedTotal > 0;
  const extraBedCost = hasAuthoritativeSelectedTotal && amount(hotel.totalExtraBedCost) <= 0 && amount((hotel as any).extraBedAmount) <= 0 && amount((hotel as any).extraBedCost) <= 0
    ? 0
    : positiveOrFallback(hotel.totalExtraBedCost, (hotel as any).extraBedAmount ?? (hotel as any).extraBedCost);
  const withBedCost = hasAuthoritativeSelectedTotal && amount(hotel.totalChildWithBedCost) <= 0 && amount((hotel as any).childWithBedAmount) <= 0 && amount((hotel as any).childWithBedCost) <= 0
    ? 0
    : positiveOrFallback(hotel.totalChildWithBedCost, (hotel as any).childWithBedAmount ?? (hotel as any).childWithBedCost);
  const withoutBedCost = hasAuthoritativeSelectedTotal && amount(hotel.totalChildWithoutBedCost) <= 0 && amount((hotel as any).childWithoutBedAmount) <= 0 && amount((hotel as any).childWithoutBedCost) <= 0
    ? 0
    : positiveOrFallback(hotel.totalChildWithoutBedCost, (hotel as any).childWithoutBedAmount ?? (hotel as any).childWithoutBedCost);
  // Persisted availability rows can carry zero-valued breakdown fields even
  // when the itinerary plan has a requested bed count. Prefer a positive row
  // count, but fall back to the itinerary-level count when the row is zero.
  const displayedExtraBedCount = Math.max(amount(hotel.extraBedCount), amount(extraBedCount));
  const displayedWithBedCount = Math.max(amount(hotel.childWithBedCount), amount(childWithBedCount));
  const displayedWithoutBedCount = Math.max(amount(hotel.childWithoutBedCount), amount(childWithoutBedCount));
  const rawMargin = amount(
    selectedSnapshot.hotelMarginTotalAmount ??
      selectedSnapshot.hotelMarginAmount ??
      (hotel as any).hotelMarginAmount,
  );
  const snapshotMarginPercentage = amount(selectedSnapshot.hotelMarginPercentage);
  const rowMarginPercentage = amount(hotel.hotelMarginPercentage);
  // Context-level margin is a fallback only when the selected snapshot and
  // row do not carry a margin value. The snapshot object may exist without
  // margin metadata, so checking `rawSnapshot` alone incorrectly suppresses
  // the tooltip margin.
  const marginPercentage = snapshotMarginPercentage || rowMarginPercentage || (
    rawMargin <= 0 ? amount(apiHotelMarginPercentage) : 0
  );
  const effectiveMarginPercentage = marginPercentage;
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
  // Offline selected rows can expose startingFromBaseAmount in either shape:
  // availability rows use the one-room rate, while hydrated selected rows can
  // use the all-room one-night amount. If it equals the authoritative
  // occupancy total, normalize it back to the per-room rate for this label.
  const startingAmountIsOccupancyTotal = displayedRooms > 1 &&
    startingAmount > 0 &&
    (
      (explicitBaseTotal > 0 && Math.abs(startingAmount - explicitBaseTotal) < 0.01) ||
      (roomCost > 0 && Math.abs(startingAmount - roomCost) < 0.01)
    );
  // baseTotalPrice is the API's authoritative one-night cost for all rooms.
  // Never let a stale startingFromBaseAmount replace it in the tooltip.
  const oneRoomRatePerNight = oneNightApiRoomCost > 0
    ? Number((oneNightApiRoomCost / displayedRooms).toFixed(2))
    : startingAmountIsOccupancyTotal
      ? Number((startingAmount / displayedRooms).toFixed(2))
      : startingAmount;
  const oneNightRoomCost = oneNightApiRoomCost > 0
    ? oneNightApiRoomCost
    : oneRoomRatePerNight > 0
      ? Number((oneRoomRatePerNight * displayedRooms).toFixed(2))
      : roomCost;
  const roomRate = oneRoomRatePerNight > 0 ? oneRoomRatePerNight : roomCost;
  const extraBedRate = positiveOrFallback(
    (hotel as any).extraBedRate,
    selectedSnapshot.extraBedRate,
  );
  const withBedRate = positiveOrFallback(
    (hotel as any).childWithBedRate,
    selectedSnapshot.childWithBedRate,
  );
  const withoutBedRate = positiveOrFallback(
    (hotel as any).childWithoutBedRate,
    selectedSnapshot.childWithoutBedRate,
  );
  const extraBedLineCost = extraBedRate > 0 && displayedExtraBedCount > 0
    ? Number((extraBedRate * displayedExtraBedCount).toFixed(2))
    : extraBedCost;
  const withBedLineCost = withBedRate > 0 && displayedWithBedCount > 0
    ? Number((withBedRate * displayedWithBedCount).toFixed(2))
    : withBedCost;
  const withoutBedLineCost = withoutBedRate > 0 && displayedWithoutBedCount > 0
    ? Number((withoutBedRate * displayedWithoutBedCount).toFixed(2))
    : withoutBedCost;
  const snapshotNights = amount(selectedSnapshot.numberOfNights);
  const persistedRoomCostScope = rowMarginPercentage > 0 &&
    amount(hotel.totalRoomCost) > 0 &&
    rawRoomCost === amount(hotel.totalRoomCost);
  const sameScope = explicitBaseTotal > 0 || persistedRoomCostScope || (
    explicitBasePerNight > 0 && (snapshotNights <= 1 || providerKey === 'axisrooms')
  );
  const marginBase = roomCost + breakfastCost + extraBedLineCost + withBedLineCost + withoutBedLineCost;
  // The tooltip is a renderer for the API breakdown.  Older rows may still
  // contain a per-room `hotelMarginAmount`/`hotelMarginBaseAmount`; using
  // those values directly was the reason a four-room row displayed
  // `Total = ₹44,100` and `Margin = ₹4,410`.  Once the room and supplement
  // components are known, the API percentage applies to the complete
  // subtotal for this row.
  const apiMarginAmount = amount((hotel as any).hotelMarginAmount);
  const displayedMarginBase = marginBase;
  const scaledMarginAmount = marginBase > 0 && effectiveMarginPercentage > 0
    ? Number((marginBase * effectiveMarginPercentage / 100).toFixed(2))
    : apiMarginAmount > 0
      ? apiMarginAmount
      : rawMargin;
  const marginResolution = resolveAuthoritativeHotelMargin({
    baseAmount: marginBase,
    payableAmount: rowGrandTotal,
    marginPercentage: effectiveMarginPercentage,
    marginAmount: scaledMarginAmount,
    sameScope,
  });
  const margin = effectiveMarginPercentage > 0
    ? scaledMarginAmount
    : apiMarginAmount > 0
      ? apiMarginAmount
      : marginResolution.marginAmount;
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
    roomCost + breakfastCost + extraBedLineCost + withBedLineCost + withoutBedLineCost + margin + serviceTax
  ).toFixed(2));
  const hasPayableBreakdown = roomCost > 0 && (margin > 0 || breakfastCost > 0 || extraBedLineCost > 0 || withBedLineCost > 0 || withoutBedLineCost > 0 || serviceTax > 0);
  const isOfflineFallback = providerKey === 'offline' && selectedTotal <= 0;
  // selectedTotal is often the single-room recommendation price. Once the
  // itinerary has multiple rooms or supplement charges, the breakdown is the
  // authoritative total for this row.
  const hasRoomOrSupplementAdjustment = displayedRooms > 1 || extraBedLineCost > 0 || withBedLineCost > 0 || withoutBedLineCost > 0;
  const breakdownDiffersFromSelectedTotal = selectedTotal <= 0 || Math.abs(selectedTotal - breakdownTotal) >= 0.01;
  const persistedHotelTotal = amount(hotel.totalHotelCost);
  const selectedTotalAlreadyIncludesBreakdown = persistedHotelTotal > 0 && selectedTotal > 0 && Math.abs(selectedTotal - persistedHotelTotal) < 0.01;
  const effectiveGrandTotal = persistedRowRoomCost > 0 && hasPayableBreakdown && breakdownDiffersFromSelectedTotal && !selectedTotalAlreadyIncludesBreakdown && (hasRoomOrSupplementAdjustment || margin > 0 || serviceTax > 0)
      ? breakdownTotal
    : selectedTotal > 0
      ? selectedTotal
      : isOfflineFallback && hasPayableBreakdown
        ? breakdownTotal
        : grandTotal > 0
        ? grandTotal
        : hasPayableBreakdown
          ? breakdownTotal
          : 0;

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
        <FloatingHoverTooltip
          left={position.left}
          top={position.top}
          className="w-[330px] max-w-[calc(100vw-24px)]"
          style={{ pointerEvents: "auto" }}
        >
          <div className="space-y-2 text-xs">
            <div className="flex justify-between"><span>Total No. of Rooms</span><span>{amount(roomCount) || amount(hotel.noOfRooms) || 1}</span></div>
            <div className="flex justify-between"><span>Room Cost</span><span>{displayedRooms} × {money(roomRate)} = {money(oneNightRoomCost > 0 ? oneNightRoomCost : roomCost)}</span></div>
            {breakfastCost > 0 && <div className="flex justify-between"><span>Breakfast Cost</span><span>{money(breakfastCost)}</span></div>}
            {(displayedExtraBedCount > 0 || extraBedLineCost > 0) && <div className="flex justify-between"><span>Extra Bed Cost</span><span>{displayedExtraBedCount} × {money(extraBedRate || extraBedLineCost)} = {money(extraBedLineCost)}</span></div>}
            {(displayedWithBedCount > 0 || withBedLineCost > 0) && <div className="flex justify-between"><span>With Bed Cost</span><span>{displayedWithBedCount} × {money(withBedRate || withBedLineCost)} = {money(withBedLineCost)}</span></div>}
            {(displayedWithoutBedCount > 0 || withoutBedLineCost > 0) && <div className="flex justify-between"><span>Without Bed Cost</span><span>{displayedWithoutBedCount} × {money(withoutBedRate || withoutBedLineCost)} = {money(withoutBedLineCost)}</span></div>}
            <div className="flex justify-between border-t border-gray-200 pt-2 font-semibold"><span>Total</span><span>{money(displayedMarginBase)}</span></div>
            {margin > 0 && (
              <div className="flex justify-between">
                <span>Hotel Margin ({effectiveMarginPercentage}%)</span>
                <span>{money(margin)}</span>
              </div>
            )}
            {marginResolution.unavailable && <div className="flex justify-between text-gray-500"><span>Margin breakdown unavailable</span><span>—</span></div>}
            {serviceTax > 0 && <div className="flex justify-between"><span>Service Tax</span><span>{money(serviceTax)}</span></div>}
            <div className="flex justify-between border-t border-gray-200 pt-2 font-semibold text-[#d546ab]"><span>Grand Total</span><span>{money(effectiveGrandTotal)}</span></div>
          </div>
        </FloatingHoverTooltip>
      )}
    </span>
  );
};

export default HotelRowPriceTooltip;
