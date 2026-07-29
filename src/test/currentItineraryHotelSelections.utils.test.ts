import { describe, expect, it } from "vitest";
import { normalizeHotelSelectionsForCurrentItinerary } from "../pages/itinerary-details/utils/currentItineraryHotelSelections.utils";

const coveredRouteIds = (selections: Record<number, Record<string, unknown>>) => {
  const covered = new Set<number>();
  Object.entries(selections).forEach(([routeId, selection]) => {
    if (selection.multiNightBooking && Array.isArray(selection.routeIds)) {
      selection.routeIds.forEach((id) => covered.add(Number(id)));
    } else {
      covered.add(Number(routeId));
    }
  });
  return covered;
};

describe("normalizeHotelSelectionsForCurrentItinerary", () => {
  it("removes rebuilt route ids and refreshes the stay dates", () => {
    const result = normalizeHotelSelectionsForCurrentItinerary({
      selectedHotelBookings: {
        9902: { provider: "staah", checkInDate: "2026-08-01", checkOutDate: "2026-08-02" },
      },
      itineraryDays: [{ id: 9912, date: "2026-08-06T00:00:00.000Z" }],
      getCoveredRouteIdsFromHotelSelections: coveredRouteIds,
    });

    expect(result.selections).toEqual({});
    expect(result.staleRouteIds).toEqual([9902]);
  });

  it("keeps a current selection but uses the current route dates", () => {
    const result = normalizeHotelSelectionsForCurrentItinerary({
      selectedHotelBookings: {
        9912: { provider: "staah", checkInDate: "2026-08-01", checkOutDate: "2026-08-02" },
      },
      itineraryDays: [{ id: 9912, date: "2026-08-06T00:00:00.000Z" }],
      getCoveredRouteIdsFromHotelSelections: coveredRouteIds,
    });

    expect(result.selections[9912]).toMatchObject({
      routeId: 9912,
      checkInDate: "2026-08-06",
      checkOutDate: "2026-08-07",
    });
  });
});
