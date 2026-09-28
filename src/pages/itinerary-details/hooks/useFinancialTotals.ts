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
 * The API is the pricing authority.
 *
 * The active recommendation amount is used only for displaying the currently
 * selected hotel package. Persisted itinerary totals must come directly from
 * the backend and must not be recalculated in the browser.
 */
export const useFinancialTotals = ({
  costBreakdown,
  overallCost,
  activeHotelAmount,
}: FinancialTotalsOptions): FinancialTotals =>
  useMemo(() => {
    const readMoney = (value: unknown): number => {
      const amount = Number(value ?? 0);
      return Number.isFinite(amount) ? amount : 0;
    };

    const persistedHotelAmount = readMoney(
      costBreakdown?.totalHotelAmount ??
        costBreakdown?.totalRoomCost,
    );

    const requestedHotelAmount =
      readMoney(activeHotelAmount);

    const hotelAmount =
      requestedHotelAmount > 0
        ? requestedHotelAmount
        : persistedHotelAmount;

    const netPayable = readMoney(
      costBreakdown?.netPayable ??
        overallCost,
    );

    const totalAmount = readMoney(
      costBreakdown?.totalAmount,
    );

    const totalRoundOff = readMoney(
      costBreakdown?.totalRoundOff,
    );

    const agentMargin = readMoney(
      costBreakdown?.agentMargin,
    );

    const additionalMargin = readMoney(
      costBreakdown?.additionalMargin,
    );

    return {
      hotelAmount,
      totalAmount: totalAmount || netPayable,
      netPayable,
      totalRoundOff,
      agentMargin,
      additionalMargin,
    };
  }, [
    activeHotelAmount,
    costBreakdown,
    overallCost,
  ]);