import { describe, expect, it } from "vitest";
import { normalizePricebookInputValue } from "../pages/hotel-form/priceBook.utils";

describe("normalizePricebookInputValue", () => {
  it("preserves valid numeric values", () => {
    expect(normalizePricebookInputValue("1250")).toBe("1250");
    expect(normalizePricebookInputValue(875.5)).toBe("875.5");
    expect(normalizePricebookInputValue("0")).toBe("0");
  });

  it("converts the legacy Mixed label to zero", () => {
    expect(normalizePricebookInputValue("Mixed")).toBe("0");
    expect(normalizePricebookInputValue(" mixed ")).toBe("0");
  });

  it("converts invalid and negative values to zero while keeping blank fields blank", () => {
    expect(normalizePricebookInputValue("not-a-rate")).toBe("0");
    expect(normalizePricebookInputValue(-10)).toBe("0");
    expect(normalizePricebookInputValue(null)).toBe("");
    expect(normalizePricebookInputValue(undefined)).toBe("");
  });
});
