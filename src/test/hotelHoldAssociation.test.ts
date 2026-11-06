import { describe, expect, it } from "vitest";
import { resolveHotelHoldAssociation } from "@/pages/itinerary-details/utils/hotelHoldAssociation.utils";

describe("hotel hold association after a confirmed release", () => {
  it("keeps a phone-confirmed same-hotel cancellation as history so the hotel can be held again", () => {
    const result = resolveHotelHoldAssociation([
      {
        id: 21,
        status: "CANCELLED",
        hotelName: "Tea Castle",
        provider: "OFFLINE",
        selectionIds: [301],
        releaseConfirmedByHotelier: true,
      },
    ], "Tea Castle", [301], "OFFLINE");

    expect(result.statusRequest).toBeUndefined();
    expect(result.previousCancelledRequest?.hotelName).toBe("Tea Castle");
  });

  it("retains a cancelled previous hotel when replacement reuses the detail row ID", () => {
    const result = resolveHotelHoldAssociation([
      {
        id: 22,
        status: "CANCELLED",
        hotelName: "Tea Castle",
        provider: "OFFLINE",
        selectionIds: [301],
      },
    ], "Classic Regency", [301], "OFFLINE");

    expect(result.statusRequest).toBeUndefined();
    expect(result.previousCancelledRequest?.hotelName).toBe("Tea Castle");
  });

  it("keeps release follow-up for an offline cancellation without hotelier confirmation", () => {
    const result = resolveHotelHoldAssociation([
      {
        id: 24,
        status: "CANCELLED",
        hotelName: "Tea Castle",
        provider: "OFFLINE",
        selectionIds: [301],
        releaseStatus: "PENDING",
      },
    ], "Tea Castle", [301], "OFFLINE");

    expect(result.statusRequest?.id).toBe(24);
    expect(result.previousCancelledRequest).toBeUndefined();
  });

  it("prefers a new active hold over cancelled history", () => {
    const result = resolveHotelHoldAssociation([
      { id: 21, status: "CANCELLED", hotelName: "Tea Castle", provider: "OFFLINE", selectionIds: [301], releaseStatus: "ACKNOWLEDGED" },
      { id: 23, status: "BLOCKED", hotelName: "Tea Castle", provider: "OFFLINE", selectionIds: [301] },
    ], "Tea Castle", [301], "OFFLINE");

    expect(result.statusRequest?.id).toBe(23);
    expect(result.previousCancelledRequest?.id).toBe(21);
  });
});
