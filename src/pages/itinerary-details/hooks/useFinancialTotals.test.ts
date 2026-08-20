import { renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { useFinancialTotals } from "./useFinancialTotals";

describe("useFinancialTotals", () => {
  it("rebases the displayed trip total when the active recommendation hotel total changes", () => {
    const { result, rerender } = renderHook(
      ({ activeHotelAmount }) => useFinancialTotals({
        costBreakdown: {
          totalHotelAmount: 1000,
          totalAmount: 11000,
          additionalMargin: 1000,
          couponDiscount: 0,
          agentMargin: 0,
          netPayable: 11000,
          totalRoundOff: 0,
        },
        overallCost: 11000,
        activeHotelAmount,
      }),
      { initialProps: { activeHotelAmount: 1000 } },
    );

    expect(result.current.netPayable).toBe(11000);

    rerender({ activeHotelAmount: 2000 });

    expect(result.current.hotelAmount).toBe(2000);
    expect(result.current.netPayable).toBe(12100);
  });
});
