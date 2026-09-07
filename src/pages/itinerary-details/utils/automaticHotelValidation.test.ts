import { describe, expect, it } from "vitest";
import { claimAutomaticHotelValidation, mergeAcknowledgedHotelDetails } from "./automaticHotelValidation";

describe("automatic hotel availability validation", () => {
  it("waits until persisted hotel details are available", () => {
    const started = new Set<string>();

    expect(claimAutomaticHotelValidation(started, "DVI-1", false, true)).toBe(false);
    expect(started.size).toBe(0);
    expect(claimAutomaticHotelValidation(started, "DVI-1", true, true)).toBe(true);
  });

  it("runs only once per quote during a mounted page lifecycle", () => {
    const started = new Set<string>();

    expect(claimAutomaticHotelValidation(started, "DVI-1", true, true)).toBe(true);
    expect(claimAutomaticHotelValidation(started, "DVI-1", true, true)).toBe(false);
    expect(claimAutomaticHotelValidation(started, "DVI-2", true, true)).toBe(true);
  });

  it("does not validate when the page is read-only or has no quote", () => {
    const started = new Set<string>();

    expect(claimAutomaticHotelValidation(started, "DVI-1", true, false)).toBe(false);
    expect(claimAutomaticHotelValidation(started, undefined, true, true)).toBe(false);
    expect(started.size).toBe(0);
  });

  it("applies acknowledged selections without discarding mounted supplier inventory", () => {
    const current = {
      hotels: [{ hotelName: "Old selection" }],
      hotelTabs: [{ groupType: 1, totalAmount: 100 }],
      hotelAvailability: {
        searchRunId: "fresh-run",
        sharedHotelInventory: [{ hotelName: "Alternative hotel" }],
      },
    };
    const accepted = {
      hotels: [{ hotelName: "Accepted replacement" }],
      hotelTabs: [{ groupType: 1, totalAmount: 125 }],
      hotelAvailability: { availabilityState: "NOT_CHECKED" },
    };

    const merged = mergeAcknowledgedHotelDetails(current, accepted);

    expect(merged.hotels).toEqual([{ hotelName: "Accepted replacement" }]);
    expect(merged.hotelTabs).toEqual([{ groupType: 1, totalAmount: 125 }]);
    expect(merged.hotelAvailability?.searchRunId).toBe("fresh-run");
    expect(merged.hotelAvailability?.sharedHotelInventory).toEqual([{ hotelName: "Alternative hotel" }]);
  });
});
