import { describe, expect, it } from "vitest";
import { resolveDisplayHotelDetailsIds } from "./useNonTboSelectedHotelEntries";

describe("resolveDisplayHotelDetailsIds", () => {
  it("falls back to the selected booking ID when the anchor inventory row has no ID", () => {
    expect(resolveDisplayHotelDetailsIds(
      [25899],
      25899,
      [{}],
      { itineraryPlanHotelDetailsId: 59509 },
    )).toEqual([59509]);
  });

  it("keeps route-specific IDs and does not reuse the anchor ID for later nights", () => {
    expect(resolveDisplayHotelDetailsIds(
      [25897, 25898],
      25897,
      [{ itinerary_plan_hotel_details_ID: 59505 }, {}],
      { itineraryPlanHotelDetailsId: 59505 },
    )).toEqual([59505, 0]);
  });

  it("prefers each route row's persisted ID when available", () => {
    expect(resolveDisplayHotelDetailsIds(
      [25897, 25898],
      25897,
      [
        { itineraryPlanHotelDetailsId: 59505 },
        { itinerary_plan_hotel_details_ID: 59506 },
      ],
      { itineraryPlanHotelDetailsId: 59505 },
    )).toEqual([59505, 59506]);
  });
});
