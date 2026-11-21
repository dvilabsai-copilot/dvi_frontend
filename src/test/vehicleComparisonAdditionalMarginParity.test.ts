import { describe, expect, it } from "vitest";
import {
  calculatePercentageMargin,
  resolveComparisonAdditionalMargins,
  type ComparisonMarginSnapshot,
} from "../pages/vehicleComparisonAdditionalMarginParity";

const quotes = [
  { vendorEligibleId: 101, selling: 4464.20 },
  { vendorEligibleId: 102, selling: 5900.70 },
];
const snapshot = (overrides: Partial<ComparisonMarginSnapshot> = {}): ComparisonMarginSnapshot => ({
  selectedVendorEligibleId: 101,
  additionalMargin: 446.42,
  baseBeforeMargin: 4464.20,
  dayCount: 3,
  defaultPercent: 10,
  dayLimit: 3,
  noActiveVendorRules: true,
  ...overrides,
});

describe("verified Additional Margin comparison", () => {
  it("reconciles the simple 10% comparison to the backend amount", () => {
    expect(resolveComparisonAdditionalMargins(quotes, 101, snapshot())).toEqual([446.42, 590.07]);
  });
  it("follows saved settings after a backend refresh", () => {
    expect(resolveComparisonAdditionalMargins(quotes, 101,
      snapshot({ additionalMargin: 669.63, defaultPercent: 15 }))).toEqual([669.63, 885.11]);
  });
  it("keeps a saved 0% and day-limit result at zero", () => {
    expect(resolveComparisonAdditionalMargins(quotes, 101,
      snapshot({ additionalMargin: 0, defaultPercent: 0 }))).toEqual([0, 0]);
    expect(resolveComparisonAdditionalMargins(quotes, 101,
      snapshot({ additionalMargin: 0, dayCount: 4 }))).toEqual([0, 0]);
  });
  it("never invents a proportional adjustment for a fixed-amount rule", () => {
    expect(resolveComparisonAdditionalMargins(quotes, 101,
      snapshot({ additionalMargin: 546.42, noActiveVendorRules: false }))).toEqual([546.42, null]);
  });
  it("does not extrapolate an itinerary-wide margin across vehicles", () => {
    expect(resolveComparisonAdditionalMargins(quotes, 101,
      snapshot({ additionalMargin: 946.42, baseBeforeMargin: 9464.20 }))).toEqual([null, null]);
  });
  it("does not mislabel an overall fixed margin as a single vehicle margin", () => {
    expect(resolveComparisonAdditionalMargins(quotes, 101,
      snapshot({ additionalMargin: 250, baseBeforeMargin: 9464.20,
        noActiveVendorRules: false }))).toEqual([null, null]);
  });
  it("does not display stale selected-vendor pricing after a selection change", () => {
    expect(resolveComparisonAdditionalMargins(quotes, 102, snapshot())).toEqual([null, null]);
  });
  it("fails closed when settings or rules are unavailable", () => {
    expect(resolveComparisonAdditionalMargins(quotes, 101,
      snapshot({ noActiveVendorRules: false, defaultPercent: null }))).toEqual([446.42, null]);
  });
  it("uses paise-aware rounding, including fractional percentages", () => {
    expect(calculatePercentageMargin(4464.2, 10)).toBe(446.42);
    expect(calculatePercentageMargin(5900.7, 15)).toBe(885.11);
    expect(calculatePercentageMargin(5, 0)).toBe(0);
    expect(calculatePercentageMargin(-1, 10)).toBeNull();
  });
});
