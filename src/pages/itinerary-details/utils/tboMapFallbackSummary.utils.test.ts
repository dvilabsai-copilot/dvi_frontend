import { describe, expect, it } from "vitest";
import { getTboMapFallbackSummary } from "./tboMapFallbackSummary.utils";

describe("getTboMapFallbackSummary", () => {
  it("sums the active group's per-route TBO MAP supplements", () => {
    const result = getTboMapFallbackSummary([
      {
        groupType: 2,
        routes: [
          { selected: { provider: "tbo", tboMapFallbackApplied: true, tboMapFallbackDinnerRate: 900, tboMapFallbackDinnerTotal: 5400 } },
          { selected: { provider: "tbo", tboMapFallbackApplied: true, tboMapFallbackDinnerRate: 900, tboMapFallbackDinnerTotal: 5400 } },
          { selected: { provider: "tbo", tboMapFallbackApplied: true, tboMapFallbackDinnerRate: 900, tboMapFallbackDinnerTotal: 5400 } },
          { selected: { provider: "offline", tboMapFallbackApplied: false, tboMapFallbackDinnerTotal: 14401.8 } },
        ],
      },
    ], 2);

    expect(result).toEqual({ hasGroup: true, targetMealPlan: "MAP", dinnerRate: 900, dinnerCost: 16200, dinnerComponentCost: 0, lunchRate: 0, lunchCost: 0 });
  });

  it("clears the supplement for an active group with only offline MAP rows", () => {
    const result = getTboMapFallbackSummary([
      {
        groupType: 4,
        routes: [
          { selected: { provider: "offline", tboMapFallbackApplied: false, tboMapFallbackDinnerTotal: 14401.8 } },
        ],
      },
    ], 4);

    expect(result).toEqual({ hasGroup: true, targetMealPlan: "", dinnerRate: 0, dinnerCost: 0, dinnerComponentCost: 0, lunchRate: 0, lunchCost: 0 });
  });

  it("does not show one rate when the active group contains different TBO rates", () => {
    const result = getTboMapFallbackSummary([
      {
        groupType: 3,
        routes: [
          { selected: { provider: "tbo", tboMapFallbackApplied: true, tboMapFallbackDinnerRate: 2500, tboMapFallbackDinnerTotal: 15000 } },
          { selected: { provider: "tbo", tboMapFallbackApplied: true, tboMapFallbackDinnerRate: 1500, tboMapFallbackDinnerTotal: 9000 } },
        ],
      },
    ], 3);

    expect(result).toEqual({ hasGroup: true, targetMealPlan: "MAP", dinnerRate: 0, dinnerCost: 24000, dinnerComponentCost: 0, lunchRate: 0, lunchCost: 0 });
  });

  it("reports AP lunch and dinner components separately", () => {
    const result = getTboMapFallbackSummary([
      {
        groupType: 4,
        routes: [
          { selected: {
            provider: "tbo",
            mealPlan: "AP",
            tboMapFallbackApplied: true,
            tboMapFallbackTargetMealPlan: "AP",
            tboMapFallbackLunchRate: 1500,
            tboMapFallbackLunchTotal: 9000,
            tboMapFallbackDinnerRate: 1500,
            tboMapFallbackDinnerTotal: 18000,
            tboMapFallbackDinnerComponentTotal: 9000,
          } },
        ],
      },
    ], 4);

    expect(result).toEqual({
      hasGroup: true,
      targetMealPlan: "AP",
      dinnerRate: 1500,
      dinnerCost: 18000,
      dinnerComponentCost: 9000,
      lunchRate: 1500,
      lunchCost: 9000,
    });
  });
});
