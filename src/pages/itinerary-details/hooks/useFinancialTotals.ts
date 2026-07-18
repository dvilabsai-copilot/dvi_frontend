import { useMemo } from "react";

interface FinancialTotalsOptions {
  costBreakdown?: Record<string, unknown> | null;
  overallCost?: number | string | null;
  computedHotelCost?: number | null;
}

export type FinancialTotals = {
  hotelAmount: number;
  totalAmount: number;
  netPayable: number;
  totalRoundOff: number;
  agentMargin: number;
  additionalMargin: number;
};

/** Selects backend financial values for display; no itinerary totals are calculated in React. */
export const useFinancialTotals = ({
  costBreakdown,
  overallCost,
  computedHotelCost,
}: FinancialTotalsOptions): FinancialTotals => useMemo(() => {
  const readMoney = (value: unknown): number => {
    const amount = Number(value ?? 0);
    return Number.isFinite(amount) ? amount : 0;
  };

  const persistedHotelAmount = readMoney(costBreakdown?.totalHotelAmount ?? costBreakdown?.totalRoomCost);
  const hotelAmount = persistedHotelAmount > 0
    ? persistedHotelAmount
    : readMoney(computedHotelCost);
  const backendTotalAmount = readMoney(costBreakdown?.totalAmount);
  const backendAdditionalMargin = readMoney(costBreakdown?.additionalMargin);
  const hotelAmountAddedToBackend = persistedHotelAmount > 0 ? 0 : hotelAmount;
  const backendSubtotal = Math.max(0, backendTotalAmount - backendAdditionalMargin);
  const additionalMarginRate = backendSubtotal > 0
    ? backendAdditionalMargin / backendSubtotal
    : 0;
  const additionalMargin = backendAdditionalMargin + hotelAmountAddedToBackend * additionalMarginRate;
  const totalAmount = backendTotalAmount + hotelAmountAddedToBackend + (additionalMargin - backendAdditionalMargin);
  const agentMargin = readMoney(costBreakdown?.agentMargin);
  const couponDiscount = readMoney(costBreakdown?.couponDiscount);
  const netBeforeRoundOff = totalAmount - couponDiscount + agentMargin;
  const netPayable = Math.round(netBeforeRoundOff);

  return {
    hotelAmount,
    totalAmount,
    netPayable: netPayable || readMoney(costBreakdown?.netPayable ?? overallCost),
    totalRoundOff: netPayable - netBeforeRoundOff,
    agentMargin,
    additionalMargin,
  };
}, [computedHotelCost, costBreakdown, overallCost]);

