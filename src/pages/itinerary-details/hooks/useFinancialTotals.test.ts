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

  it("does not add the margin breakdown a second time", () => {
    const { result } = renderHook(() => useFinancialTotals({
      costBreakdown: {
        totalHotelAmount: 96233.50,
        totalVehicleAmount: 124074.93,
        totalGuideCost: 17500,
        totalHotspotCost: 1610,
        totalAmount: 258609.37,
        additionalMargin: 0,
        couponDiscount: 0,
        agentMargin: 19190.94,
        netPayable: 258609,
        totalRoundOff: -0.37,
      },
      overallCost: 258609,
      activeHotelAmount: 96233.50,
    }));

    expect(result.current.hotelAmount).toBe(96233.5);
    expect(result.current.totalAmount).toBe(258609.37);
    expect(result.current.agentMargin).toBe(19190.94);
    expect(result.current.totalRoundOff).toBe(-0.37);
    expect(result.current.netPayable).toBe(258609);
    expect(result.current.netPayable).not.toBe(277800);
  });

  it("uses the backend net payable when no active hotel package is supplied", () => {
    const { result } = renderHook(() => useFinancialTotals({
      costBreakdown: {
        totalAmount: 258609.37,
        agentMargin: 19190.94,
        netPayable: 258609,
        totalRoundOff: -0.37,
      },
      overallCost: 258609,
      activeHotelAmount: 0,
    }));

    expect(result.current.totalAmount).toBe(258609.37);
    expect(result.current.netPayable).toBe(258609);
    expect(result.current.totalRoundOff).toBe(-0.37);
  });

  it("rebases a changed recommendation without re-adding agent margin", () => {
    const { result } = renderHook(() => useFinancialTotals({
      costBreakdown: {
        totalHotelAmount: 96233.5,
        totalAmount: 258609.37,
        additionalMargin: 0,
        couponDiscount: 0,
        agentMargin: 19190.94,
        netPayable: 258609,
        totalRoundOff: -0.37,
      },
      overallCost: 258609,
      activeHotelAmount: 100000,
    }));

    expect(result.current.hotelAmount).toBe(100000);
    expect(result.current.totalAmount).toBeCloseTo(262375.87, 2);
    expect(result.current.netPayable).toBe(262376);
    expect(result.current.totalRoundOff).toBe(0.13);
  });
});
