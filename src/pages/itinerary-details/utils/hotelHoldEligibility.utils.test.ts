import { describe, expect, it } from "vitest";
import { applyContinuousVsrRefundability, getHotelHoldEligibility, getHotelRefundableRateValue, resolveHotelDetailsIdsFromRows, resolveHotelHoldCheckInDate } from "./hotelHoldEligibility.utils";

describe("hotel hold eligibility", () => {
  it("allows a refundable VSR rate", () => {
    expect(getHotelHoldEligibility({ provider: "tbo", isRefundable: true })).toMatchObject({
      provider: "tbo",
      holdable: true,
    });
  });

  it("rejects a non-refundable VSR rate", () => {
    expect(getHotelHoldEligibility({ provider: "tbo", isRefundable: false })).toMatchObject({
      provider: "tbo",
      holdable: false,
      reason: "VSR_RATE_NOT_REFUNDABLE",
    });
  });

  it("reads the refundable flag from the selected price snapshot", () => {
    expect(getHotelHoldEligibility({
      provider: "tbo",
      selectedPriceSnapshot: JSON.stringify({ isRefundable: true }),
    }).holdable).toBe(true);
  });

  it("preserves refundability when it is returned inside the selected rate option", () => {
    expect(getHotelRefundableRateValue({
      rateOption: { IsRefundable: true },
    })).toBe(true);
    expect(getHotelRefundableRateValue({
      selectedRateOption: { isRefundable: false },
    })).toBe(false);
  });

  it("uses the current pending supplier rate when the previous snapshot is non-refundable", () => {
    const hotel = {
      provider: "tbo",
      selectedPriceSnapshot: {
        isRefundable: false,
        pendingAvailabilityChange: {
          option: { isRefundable: true },
        },
      },
    };

    expect(getHotelRefundableRateValue(hotel)).toBe(true);
    expect(getHotelHoldEligibility(hotel).holdable).toBe(true);
  });

  it("recognizes a TBO prebook row when the normalized provider is absent", () => {
    expect(getHotelHoldEligibility({
      bookingCode: "123!TB!1!TB!trace!TB!N!TB!AFF!",
      isRefundable: true,
    })).toMatchObject({ provider: "tbo", holdable: true });
  });

  it("normalizes the VSR provider label to the TBO holdability rule", () => {
    expect(getHotelHoldEligibility({ provider: "VSR", isRefundable: false })).toMatchObject({
      provider: "tbo",
      holdable: false,
      reason: "VSR_RATE_NOT_REFUNDABLE",
    });
  });

  it("keeps AX and offline hotels holdable", () => {
    expect(getHotelHoldEligibility({ provider: "axisrooms" }).holdable).toBe(true);
    expect(getHotelHoldEligibility({ provider: "offline" }).holdable).toBe(true);
  });

  it("shares one known VSR refundability result across adjacent nights of a continuous stay", () => {
    const hotels = applyContinuousVsrRefundability([
      { provider: "tbo", hotelCode: "FORTUNE-1", hotelName: "Hotel Fortune", roomType: "Deluxe", routeId: 21, isRefundable: true },
      { provider: "tbo", hotelCode: "FORTUNE-1", hotelName: "Hotel Fortune", roomType: "Deluxe", routeId: 48 },
    ], [21, 48, 73]);

    expect(hotels.map((hotel) => getHotelHoldEligibility(hotel).holdable)).toEqual([true, true]);
    expect(hotels[1].isRefundable).toBe(true);
  });

  it("does not share VSR refundability with a different property or a non-contiguous return", () => {
    const hotels = applyContinuousVsrRefundability([
      { provider: "tbo", hotelCode: "FORTUNE-1", hotelName: "Hotel Fortune", routeId: 21, isRefundable: true },
      { provider: "tbo", hotelCode: "OTHER-1", hotelName: "Other Hotel", routeId: 48 },
      { provider: "tbo", hotelCode: "FORTUNE-1", hotelName: "Hotel Fortune", routeId: 73 },
    ], [21, 48, 73]);

    expect(hotels.map((hotel) => getHotelHoldEligibility(hotel).holdable)).toEqual([true, false, false]);
    expect(hotels[2].isRefundable).toBeUndefined();
  });

  it("preserves explicit conflicting refundability and does not infer an ambiguous night", () => {
    const hotels = applyContinuousVsrRefundability([
      { provider: "tbo", hotelCode: "FORTUNE-1", routeId: 21, isRefundable: true },
      { provider: "tbo", hotelCode: "FORTUNE-1", routeId: 48, isRefundable: false },
      { provider: "tbo", hotelCode: "FORTUNE-1", routeId: 73 },
    ], [21, 48, 73]);

    expect(hotels.map((hotel) => getHotelHoldEligibility(hotel).holdable)).toEqual([true, false, false]);
    expect(hotels[2].isRefundable).toBeUndefined();
  });

  it("does not change AX or offline eligibility while resolving a continuous VSR stay", () => {
    const hotels = applyContinuousVsrRefundability([
      { provider: "tbo", hotelCode: "FORTUNE-1", routeId: 21, isRefundable: true },
      { provider: "axisrooms", hotelName: "Hotel Fortune", routeId: 48 },
      { provider: "offline", hotelName: "Hotel Fortune", routeId: 73 },
    ], [21, 48, 73]);

    expect(hotels.map((hotel) => getHotelHoldEligibility(hotel).holdable)).toEqual([true, true, true]);
    expect(hotels[1].isRefundable).toBeUndefined();
    expect(hotels[2].isRefundable).toBeUndefined();
  });

  it("resolves the hold target when a newly selected hotel has no local detail id", () => {
    expect(resolveHotelDetailsIdsFromRows(
      { provider: "tbo", hotelName: "Tea Castle", routeId: 101, isRefundable: true },
      [{ provider: "tbo", hotelName: "Tea Castle", itineraryRouteId: 101, itineraryPlanHotelDetailsId: 987 }],
    )).toEqual([987]);
  });

  it("does not resolve a similarly named hotel from another route", () => {
    expect(resolveHotelDetailsIdsFromRows(
      { provider: "tbo", hotelName: "Tea Castle", routeId: 101, isRefundable: true },
      [{ provider: "tbo", hotelName: "Tea Castle", itineraryRouteId: 202, itineraryPlanHotelDetailsId: 654 }],
    )).toEqual([]);
  });

  it("uses the persisted stay date instead of a stale selected-rate date", () => {
    expect(resolveHotelHoldCheckInDate(
      { checkInDate: "2026-11-08", selectedPriceSnapshot: { checkInDate: "2026-11-08" } },
      { itinerary_route_date: "2026-11-10T00:00:00.000Z" },
    )).toBe("2026-11-10");
  });

  it("falls back to the selected rate date when no persisted stay date exists", () => {
    expect(resolveHotelHoldCheckInDate({ checkInDate: "2026-11-10" })).toBe("2026-11-10");
    expect(resolveHotelHoldCheckInDate({})).toBe("");
  });
});
