import { describe, expect, it } from "vitest";
import { resolveHotelHoldAssociation } from "./hotelHoldAssociation.utils";

describe("resolveHotelHoldAssociation", () => {
  it("does not attach the old cancelled hold or its release details to a replacement hotel sharing its detail ID", () => {
    const oldHold = { id: 41, hotelName: "SPICE GROVE", status: "CANCELLED", selectionIds: [903], releaseStatus: "PENDING" };

    expect(resolveHotelHoldAssociation([oldHold], "Sandra Palace", [903])).toEqual({
      statusRequest: undefined,
      previousCancelledRequest: oldHold,
    });
  });

  it("keeps the cancelled status when the hold belongs to the same hotel", () => {
    const hold = { hotel_name: "Spice Grove", status: "CANCELLED", selection_ids: [903], release_status: "PENDING" };

    expect(resolveHotelHoldAssociation([hold], "SPICE GROVE", [903])).toEqual({
      statusRequest: hold,
      previousCancelledRequest: undefined,
    });
  });

  it("keeps an active hold associated by detail ID and hotel identity", () => {
    const hold = { hotelName: "Sandra Palace", status: "REQUESTED", selectionIds: [903] };

    expect(resolveHotelHoldAssociation([hold], "Sandra Palace", [903])).toEqual({
      statusRequest: hold,
      previousCancelledRequest: undefined,
    });
  });

  it("keeps the latest cancelled replacement hotel as history without treating it as the current hold", () => {
    const earlier = { id: 40, hotelName: "Old Resort", status: "CANCELLED", selectionIds: [903], cancelledAt: "2026-01-01T00:00:00Z" };
    const latest = { id: 41, hotelName: "Sandra Palace", status: "CANCELLED", selectionIds: [903], cancelledAt: "2026-02-01T00:00:00Z" };
    const current = { id: 42, hotelName: "SPICE GROVE", status: "REQUESTED", selectionIds: [903] };

    expect(resolveHotelHoldAssociation([earlier, latest, current], "SPICE GROVE", [903])).toEqual({
      statusRequest: current,
      previousCancelledRequest: latest,
    });
  });

  it("allows a new hold when replacing a previously cancelled hotel", () => {
    const previousHotel = { id: 40, hotelName: "Sandra Palace", status: "CANCELLED", selectionIds: [903] };
    const terminalCurrentRequest = { id: 41, hotelName: "SPICE GROVE", status: "CANCELLED", selectionIds: [903] };

    expect(resolveHotelHoldAssociation([previousHotel, terminalCurrentRequest], "SPICE GROVE", [903])).toEqual({
      statusRequest: undefined,
      previousCancelledRequest: previousHotel,
    });
  });

  it("does not show an active AxisRooms hold as an offline hold after a provider change", () => {
    const previousAxisHold = {
      id: 42,
      hotelName: "SPICE GROVE",
      provider: "AXISROOMS",
      status: "BLOCKED",
      selectionIds: [903],
    };

    expect(resolveHotelHoldAssociation([previousAxisHold], "SPICE GROVE", [903], "offline")).toEqual({
      statusRequest: undefined,
      previousCancelledRequest: undefined,
    });
  });

  it("keeps a current offline hold when the selected provider is offline", () => {
    const offlineHold = {
      id: 43,
      hotelName: "SPICE GROVE",
      provider: "OFFLINE",
      status: "BLOCKED",
      selectionIds: [903],
    };

    expect(resolveHotelHoldAssociation([offlineHold], "SPICE GROVE", [903], "offline")).toEqual({
      statusRequest: offlineHold,
      previousCancelledRequest: undefined,
    });
  });

  it("associates one continuous stay hold with each covered night even when selection IDs differ", () => {
    const continuousHold = {
      id: 44,
      hotelName: "Tea Castle",
      provider: "OFFLINE",
      status: "BLOCKED",
      selectionIds: [1001],
      checkIn: "2026-11-09T00:00:00.000Z",
      checkOut: "2026-11-11T00:00:00.000Z",
      stayDetails: [
        { checkIn: "2026-11-09T00:00:00.000Z", checkOut: "2026-11-10T00:00:00.000Z" },
        { checkIn: "2026-11-10T00:00:00.000Z", checkOut: "2026-11-11T00:00:00.000Z" },
      ],
    };

    expect(resolveHotelHoldAssociation([continuousHold], "Tea Castle", [1002], "OFFLINE", "2026-11-10")).toEqual({
      statusRequest: continuousHold,
      previousCancelledRequest: undefined,
    });
  });

  it("does not associate a continuous stay hold outside its dates or across providers", () => {
    const continuousHold = {
      id: 45,
      hotelName: "Tea Castle",
      provider: "OFFLINE",
      status: "BLOCKED",
      selectionIds: [1001],
      checkIn: "2026-11-09T00:00:00.000Z",
      checkOut: "2026-11-11T00:00:00.000Z",
    };

    expect(resolveHotelHoldAssociation([continuousHold], "Tea Castle", [1002], "OFFLINE", "2026-11-11").statusRequest).toBeUndefined();
    expect(resolveHotelHoldAssociation([continuousHold], "Tea Castle", [1002], "AXISROOMS", "2026-11-10").statusRequest).toBeUndefined();
  });
});
