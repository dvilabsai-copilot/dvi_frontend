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

  const persistedNetPayable = readMoney(
  costBreakdown?.netPayable ??
    overallCost,
);

const persistedTotalAmount = readMoney(
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

/**
 * When the user switches Recommended #1/#2/#3/#4,
 * only the hotel package amount changes.
 *
 * The backend totals belong to the persisted/original hotel package,
 * so adjust the DISPLAY totals by the hotel-price difference.
 *
 * Do not rebuild the complete package price here because vehicle,
 * activity, hotspot, margins, discounts, etc. are already included
 * in the backend totals.
 */
const hotelDifference =
  requestedHotelAmount > 0 &&
  persistedHotelAmount > 0
    ? requestedHotelAmount - persistedHotelAmount
    : 0;

const totalAmount =
  (persistedTotalAmount || persistedNetPayable) +
  hotelDifference;

const netPayable =
  persistedNetPayable + hotelDifference;

return {
  hotelAmount,
  totalAmount,
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