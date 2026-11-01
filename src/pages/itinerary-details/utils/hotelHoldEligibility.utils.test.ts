import { describe, expect, it } from "vitest";
import { getHotelHoldEligibility, getHotelRefundableRateValue, resolveHotelDetailsIdsFromRows } from "./hotelHoldEligibility.utils";

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
});
