import { useMemo } from "react";

interface FinancialTotalsOptions {
  costBreakdown?: Record<string, unknown> | null;
  overallCost?: number | string | null;
  activeHotelAmount?: number | null;
}

export type FinancialTotals = {
  hotelAmount: number;
  totalAmount: number;
  netPayable: number;
  totalRoundOff: number;
  agentMargin: number;
  additionalMargin: number;
};

/**
 * The API is the pricing authority. This hook only maps the normalized server
 * breakdown into the view model; it deliberately contains no money formulas.
 */
export const useFinancialTotals = ({
  costBreakdown,
  overallCost,
  activeHotelAmount,
}: FinancialTotalsOptions): FinancialTotals => useMemo(() => {
  const readMoney = (value: unknown): number => {
    const amount = Number(value ?? 0);
    return Number.isFinite(amount) ? amount : 0;
  };

  const persistedHotelAmount = readMoney(costBreakdown?.totalHotelAmount ?? costBreakdown?.totalRoomCost);
  const requestedHotelAmount = readMoney(activeHotelAmount);
  const hasActiveHotelAmount = requestedHotelAmount > 0;
  const hotelAmount = hasActiveHotelAmount ? requestedHotelAmount : persistedHotelAmount;

  // Recommendation tabs expose a backend-provided hotel package total, while
  // the itinerary breakdown contains the persisted non-hotel costs, margins,
  // discount, and rounding rules. Rebase those persisted values on the active
  // package so the page summary changes with the selected tab without making
  // a request or summing visible hotel rows in the browser.
  const persistedTotalAmount = readMoney(costBreakdown?.totalAmount);
  const persistedAdditionalMargin = readMoney(costBreakdown?.additionalMargin);
  const couponDiscount = readMoney(costBreakdown?.couponDiscount);
  const agentMargin = readMoney(costBreakdown?.agentMargin);
  const persistedSubtotal = Math.max(persistedTotalAmount - persistedAdditionalMargin, 0);
  const additionalMarginRate = persistedSubtotal > 0
    ? persistedAdditionalMargin / persistedSubtotal
    : 0;
  const projectedSubtotal = hasActiveHotelAmount
    ? Math.max(persistedSubtotal - persistedHotelAmount + hotelAmount, 0)
    : persistedSubtotal;
  const additionalMargin = hasActiveHotelAmount
    ? projectedSubtotal * additionalMarginRate
    : persistedAdditionalMargin;
  const totalAmount = hasActiveHotelAmount
    ? projectedSubtotal + additionalMargin
    : persistedTotalAmount;
  const netBeforeRoundOff = totalAmount - couponDiscount + agentMargin;
  const netPayable = hasActiveHotelAmount
    ? Math.round(netBeforeRoundOff)
    : readMoney(costBreakdown?.netPayable ?? overallCost);
  const totalRoundOff = hasActiveHotelAmount
    ? netPayable - netBeforeRoundOff
    : readMoney(costBreakdown?.totalRoundOff);

  return {
    hotelAmount,
    totalAmount: totalAmount || netPayable,
    netPayable,
    totalRoundOff,
    agentMargin,
    additionalMargin,
  };
}, [activeHotelAmount, costBreakdown, overallCost]);
