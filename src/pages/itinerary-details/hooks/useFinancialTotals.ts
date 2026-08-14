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
  // The active recommendation tab is already a backend-provided package
  // total. Use it while the group-specific details request is refreshing.
  const activeAmount = readMoney(activeHotelAmount);
  const hotelAmount = activeAmount > 0 ? activeAmount : persistedHotelAmount;
  const totalAmount = readMoney(costBreakdown?.totalAmount);
  const netPayable = readMoney(costBreakdown?.netPayable ?? overallCost);
  const totalRoundOff = readMoney(costBreakdown?.totalRoundOff);
  const agentMargin = readMoney(costBreakdown?.agentMargin);
  const additionalMargin = readMoney(costBreakdown?.additionalMargin);

  return {
    hotelAmount,
    totalAmount: totalAmount || netPayable,
    netPayable,
    totalRoundOff,
    agentMargin,
    additionalMargin,
  };
}, [activeHotelAmount, costBreakdown, overallCost]);
