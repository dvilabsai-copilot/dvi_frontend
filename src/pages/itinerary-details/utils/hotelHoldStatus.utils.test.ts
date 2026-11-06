import { describe, expect, it } from "vitest";
import { getDisplayHotelHoldLabel, getDisplayHotelHoldStatus, getHotelReleaseEmailStatusLabel, hasStaleHotelHoldForSelection } from "./hotelHoldStatus.utils";

describe("hotel hold payment status", () => {
  it("keeps hotel acceptance distinct while wallet payment is pending", () => {
    expect(getDisplayHotelHoldStatus("CONFIRMED", null)).toBe("HOTEL_CONFIRMED_PAYMENT_PENDING");
  });

  it("shows booking confirmation after payment is recorded", () => {
    expect(getDisplayHotelHoldStatus("CONFIRMED", "2026-11-05T12:00:00.000Z")).toBe("CONFIRMED");
  });

  it("shows a pending VSR voucher without marking the paid itinerary as unpaid", () => {
    expect(getDisplayHotelHoldStatus("CONFIRMED", "2026-11-05T12:00:00.000Z", "PENDING")).toBe("VSR_VOUCHER_PENDING");
    expect(getDisplayHotelHoldLabel("VSR_VOUCHER_PENDING")).toBe("Voucher pending");
    expect(getDisplayHotelHoldStatus("CONFIRMED", "2026-11-05T12:00:00.000Z", "VOUCHERED")).toBe("CONFIRMED");
  });

  it("preserves other hold statuses", () => {
    expect(getDisplayHotelHoldStatus("BLOCKED", null)).toBe("BLOCKED");
    expect(getDisplayHotelHoldStatus("EXPIRED", null)).toBe("EXPIRED");
  });

  it("labels expired holds explicitly", () => {
    expect(getDisplayHotelHoldLabel("EXPIRED")).toBe("Hold expired");
    expect(getDisplayHotelHoldLabel("HOLD_EXPIRED")).toBe("Hold expired");
  });

  it("preserves labels for payment-pending and confirmed hotels", () => {
    expect(getDisplayHotelHoldLabel("HOTEL_CONFIRMED_PAYMENT_PENDING")).toBe("Hotel confirmed · payment pending");
    expect(getDisplayHotelHoldLabel("CONFIRMED")).toBe("Confirmed");
  });

  it("shows hotel release email delivery and manual follow-up states", () => {
    expect(getHotelReleaseEmailStatusLabel("MANUAL_REQUIRED")).toBe("Hotel email missing · staff follow-up required");
    expect(getHotelReleaseEmailStatusLabel("SENT")).toBe("Email sent · acknowledgement pending");
    expect(getHotelReleaseEmailStatusLabel("PENDING")).toBe("Email queued");
    expect(getHotelReleaseEmailStatusLabel("FAILED")).toBe("Email delivery failed");
    expect(getHotelReleaseEmailStatusLabel("NOT_REQUIRED")).toBe("");
  });

  it("blocks confirmation only for the latest expired hold matching selected hotel rows", () => {
    const requests = [
      { id: 1, status: "EXPIRED", selectionIds: [101] },
      { id: 2, status: "BLOCKED", selectionIds: [101], cutoffAt: "2026-11-06T12:00:00.000Z" },
      { id: 3, status: "EXPIRED", selectionIds: [202] },
    ];

    expect(hasStaleHotelHoldForSelection([101], requests, Date.parse("2026-11-06T11:00:00.000Z"))).toBe(false);
    expect(hasStaleHotelHoldForSelection([202], requests, Date.parse("2026-11-06T11:00:00.000Z"))).toBe(true);
    expect(hasStaleHotelHoldForSelection([303], requests, Date.parse("2026-11-06T11:00:00.000Z"))).toBe(false);
  });

  it("blocks expired, cancelled, and past-deadline unpaid holds, but not paid holds", () => {
    const now = Date.parse("2026-11-06T12:00:00.000Z");
    expect(hasStaleHotelHoldForSelection([1], [{ id: 1, status: "EXPIRED", selectionIds: [1] }], now)).toBe(true);
    expect(hasStaleHotelHoldForSelection([1], [{ id: 1, status: "CANCELLED", selectionIds: [1] }], now)).toBe(true);
    expect(hasStaleHotelHoldForSelection([1], [{ id: 1, status: "BLOCKED", selectionIds: [1], cutoffAt: "2026-11-06T11:59:59.000Z" }], now)).toBe(true);
    expect(hasStaleHotelHoldForSelection([1], [{ id: 1, status: "EXPIRED", selectionIds: [1], paidConfirmedAt: "2026-11-06T11:00:00.000Z" }], now)).toBe(false);
    expect(hasStaleHotelHoldForSelection([], [{ id: 1, status: "EXPIRED", selectionIds: [1] }], now)).toBe(false);
  });

  it("does not block the replacement hotel because the cancelled previous hotel reused its detail ID", () => {
    const now = Date.parse("2026-11-06T12:00:00.000Z");
    const oldHold = { id: 15, hotelName: "SPICE GROVE", status: "CANCELLED", selectionIds: [903] };

    expect(hasStaleHotelHoldForSelection(
      [903],
      [oldHold],
      now,
      [{ hotelName: "Sandra Palace", hotelDetailsIds: [903] }],
    )).toBe(false);
    expect(hasStaleHotelHoldForSelection(
      [903],
      [oldHold],
      now,
      [{ hotelName: "Spice Grove", hotelDetailsIds: [903] }],
    )).toBe(true);
  });
});
