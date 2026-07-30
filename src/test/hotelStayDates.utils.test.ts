import { describe, expect, it } from "vitest";
import { normalizeHotelStayDates } from "../pages/itinerary-details/utils/hotelStayDates.utils";

describe("normalizeHotelStayDates", () => {
  it("moves same-day checkout to the next day", () => {
    expect(normalizeHotelStayDates({
      checkInDate: "2026-08-06",
      checkOutDate: "2026-08-06",
    })).toEqual({
      checkInDate: "2026-08-06",
      checkOutDate: "2026-08-07",
    });
  });

  it("preserves a valid multi-night range", () => {
    expect(normalizeHotelStayDates({
      checkInDate: "2026-08-06",
      checkOutDate: "2026-08-08",
    })).toEqual({
      checkInDate: "2026-08-06",
      checkOutDate: "2026-08-08",
    });
  });

  it("uses the route date when the policy omits the check-in", () => {
    expect(normalizeHotelStayDates({ fallbackDate: "2026-08-06" })).toEqual({
      checkInDate: "2026-08-06",
      checkOutDate: "2026-08-07",
    });
  });
});
