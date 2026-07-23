import { useMemo } from "react";

interface FinancialTotalsOptions {
  costBreakdown?: Record<string, unknown> | null;
  overallCost?: number | string | null;
}

export type FinancialTotals = {
  hotelAmount: number;
  totalAmount: number;
  netPayable: number;
  totalRoundOff: number;
  agentMargin: number;
  additionalMargin: number;
};

/** Renders the last successful backend pricing response; it never recalculates totals. */
export const useFinancialTotals = ({
  costBreakdown,
  overallCost,
}: FinancialTotalsOptions): FinancialTotals => useMemo(() => {
  const readMoney = (value: unknown): number => {
    const amount = Number(value ?? 0);
    return Number.isFinite(amount) ? amount : 0;
  };

  const hotelAmount = readMoney(costBreakdown?.totalHotelAmount ?? costBreakdown?.totalRoomCost);
  const totalAmount = readMoney(costBreakdown?.totalAmount);
  const netPayable = readMoney(costBreakdown?.netPayable ?? overallCost);

  return {
    hotelAmount,
    totalAmount: totalAmount || netPayable,
    netPayable,
    totalRoundOff: readMoney(costBreakdown?.totalRoundOff),
    agentMargin: readMoney(costBreakdown?.agentMargin),
    additionalMargin: readMoney(costBreakdown?.additionalMargin),
  };
}, [costBreakdown, overallCost]);
