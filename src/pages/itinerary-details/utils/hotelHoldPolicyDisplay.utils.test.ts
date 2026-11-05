import { describe, expect, it } from "vitest";
import { formatHotelHoldDeadline, formatHotelHoldDuration } from "./hotelHoldPolicyDisplay.utils";

describe("hotel hold policy display", () => {
  it("formats whole-day and shorter hold durations", () => {
    expect(formatHotelHoldDuration(240)).toBe("10 days (240 hours)");
    expect(formatHotelHoldDuration(48)).toBe("2 days (48 hours)");
    expect(formatHotelHoldDuration(12)).toBe("12 hours");
  });

  it("does not invent durations or deadlines for invalid values", () => {
    expect(formatHotelHoldDuration(null)).toBeNull();
    expect(formatHotelHoldDuration(Number.POSITIVE_INFINITY)).toBeNull();
    expect(formatHotelHoldDuration(0)).toBeNull();
    expect(formatHotelHoldDeadline("not-a-date")).toBeNull();
    expect(formatHotelHoldDeadline(null)).toBeNull();
  });

  it("formats a valid backend cutoff as a local display date", () => {
    expect(formatHotelHoldDeadline("2026-11-07T12:00:00.000Z")).toBeTruthy();
  });
});
