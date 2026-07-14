import { useMemo } from "react";

interface FinancialTotalsOptions {
  costBreakdown?: Record<string, unknown> | null;
  overallCost?: number | string | null;
  computedHotelCost: number;
  computedVehicleAmount: number;
  shouldShowHotels: boolean;
  shouldShowVehicles: boolean;
  hasRequiredVehicleSelection: boolean;
  selectedVehicleTotalsByType: Record<number, { totalAmount?: number }>;
  activeHotelListTotal: number;
  selectedHotelTotal: number;
  entryTicketBreakdownCount: number;
  entryTicketLocationWiseTotal: number;
}

/** Computes payable itinerary totals with backend and live-selection fallbacks. */
export const useFinancialTotals = ({
  costBreakdown,
  overallCost,
  computedHotelCost,
  computedVehicleAmount,
  shouldShowHotels,
  shouldShowVehicles,
  hasRequiredVehicleSelection,
  selectedVehicleTotalsByType,
  activeHotelListTotal,
  selectedHotelTotal,
  entryTicketBreakdownCount,
  entryTicketLocationWiseTotal,
}: FinancialTotalsOptions) => useMemo(() => {
  const toSafeMoney = (value?: number | string | null): number => {
    const amount = Number(value || 0);
    return Number.isFinite(amount) ? Number(amount.toFixed(2)) : 0;
  };
  const getRoundOffToNearestRupee = (amount: number): number => {
    if (!Number.isFinite(amount)) return 0;
    return Number((Math.round(amount) - amount).toFixed(2));
  };

  const backendNetPayable = toSafeMoney((costBreakdown?.netPayable as number | string | null) ?? overallCost);
  const backendTotalAmount = toSafeMoney(costBreakdown?.totalAmount as number | string | null);
  const couponDiscount = toSafeMoney(costBreakdown?.couponDiscount as number | string | null);
  const agentMargin = toSafeMoney(costBreakdown?.agentMargin as number | string | null);
  const effectiveAgentMargin = shouldShowVehicles && !hasRequiredVehicleSelection ? 0 : agentMargin;
  const hasSelectedVehicleTotal = Object.values(selectedVehicleTotalsByType).some((row) => Number(row.totalAmount || 0) > 0);
  const hasLiveHotelSelection = activeHotelListTotal > 0 || selectedHotelTotal > 0;

  if (backendNetPayable > 0 && !hasSelectedVehicleTotal && !hasLiveHotelSelection) {
    const backendBaseTotalAmount = backendTotalAmount > 0
      ? backendTotalAmount
      : toSafeMoney(backendNetPayable - agentMargin + couponDiscount);
    const subtotalBeforeRoundOff = toSafeMoney(backendBaseTotalAmount - couponDiscount + effectiveAgentMargin);
    const totalRoundOff = getRoundOffToNearestRupee(subtotalBeforeRoundOff);
    return {
      hotelAmount: toSafeMoney(costBreakdown?.totalHotelAmount as number | string | null),
      totalAmount: backendBaseTotalAmount,
      netPayable: toSafeMoney(subtotalBeforeRoundOff + totalRoundOff),
      totalRoundOff,
      agentMargin: effectiveAgentMargin,
    };
  }

  const hotelAmount = shouldShowHotels
    ? toSafeMoney(computedHotelCost || costBreakdown?.totalRoomCost as number | string | null || costBreakdown?.totalHotelAmount as number | string | null || 0)
    : 0;
  const vehicleAmount = shouldShowVehicles ? toSafeMoney(computedVehicleAmount || 0) : 0;
  const hotspotAmountFromCostBreakdown = Number(costBreakdown?.totalHotspotCost || 0);
  const effectiveEntryTicketAmount = entryTicketBreakdownCount > 0 ? entryTicketLocationWiseTotal : hotspotAmountFromCostBreakdown;
  const otherAmount = toSafeMoney(
    Number(costBreakdown?.totalAmenitiesCost || 0) +
    Number(costBreakdown?.extraBedCost || 0) +
    Number(costBreakdown?.childWithBedCost || 0) +
    Number(costBreakdown?.childWithoutBedCost || 0) +
    Number(costBreakdown?.totalGuideCost || 0) +
    Number(effectiveEntryTicketAmount || 0) +
    Number(costBreakdown?.totalActivityCost || 0) +
    Number(costBreakdown?.additionalMargin || 0),
  );
  const totalAmount = toSafeMoney(hotelAmount + vehicleAmount + otherAmount);
  const subtotalBeforeRoundOff = toSafeMoney(totalAmount - couponDiscount + effectiveAgentMargin);
  const totalRoundOff = getRoundOffToNearestRupee(subtotalBeforeRoundOff);
  return {
    hotelAmount,
    totalAmount,
    netPayable: toSafeMoney(subtotalBeforeRoundOff + totalRoundOff),
    totalRoundOff,
    agentMargin: effectiveAgentMargin,
  };
}, [activeHotelListTotal, computedHotelCost, computedVehicleAmount, costBreakdown, entryTicketBreakdownCount, entryTicketLocationWiseTotal, hasRequiredVehicleSelection, overallCost, selectedHotelTotal, selectedVehicleTotalsByType, shouldShowHotels, shouldShowVehicles]);

