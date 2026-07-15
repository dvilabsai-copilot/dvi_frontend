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
};

/** Selects backend financial values for display; no itinerary totals are calculated in React. */
export const useFinancialTotals = ({
  costBreakdown,
  overallCost,
}: FinancialTotalsOptions): FinancialTotals => useMemo(() => {
  const readMoney = (value: unknown): number => {
    const amount = Number(value ?? 0);
    return Number.isFinite(amount) ? amount : 0;
  };

  return {
    hotelAmount: readMoney(costBreakdown?.totalHotelAmount ?? costBreakdown?.totalRoomCost),
    totalAmount: readMoney(costBreakdown?.totalAmount),
    netPayable: readMoney(costBreakdown?.netPayable ?? overallCost),
    totalRoundOff: readMoney(costBreakdown?.totalRoundOff),
    agentMargin: readMoney(costBreakdown?.agentMargin),
  };
}, [costBreakdown, overallCost]);

