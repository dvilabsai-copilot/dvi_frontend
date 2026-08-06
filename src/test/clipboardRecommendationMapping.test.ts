import { describe, expect, it } from "vitest";
import type { ItineraryHotelRow } from "@/pages/itinerary-details/itinerary-details.types";
import { buildClipboardHotelRowsForGroup } from "@/pages/itinerary-details/hooks/useParaRecommendations";
import {
  buildSelectedClipboardGroups,
  getClipboardSelectionKey,
} from "@/pages/itinerary-details/utils/clipboardSelection.utils";

const hotel = (overrides: Partial<ItineraryHotelRow>): ItineraryHotelRow => ({
  groupType: 1,
  itineraryRouteId: 10,
  day: "Day 1 | 2026-08-12",
  destination: "Munnar",
  hotelId: 1,
  hotelName: "Cheapest hotel",
  category: 3,
  roomType: "Standard",
  mealPlan: "CP",
  totalHotelCost: 100,
  totalHotelTaxAmount: 0,
  ...overrides,
});

describe("clipboard recommendation mapping", () => {
  it("prefers the manually selected hotel over the cheapest inventory row", () => {
    const rows = buildClipboardHotelRowsForGroup([
      hotel({ hotelName: "Cheapest hotel", totalHotelCost: 100 }),
      hotel({ hotelName: "Manually selected hotel", totalHotelCost: 500, isSelected: true, selectionOrigin: "USER_SELECTED" }),
    ], 1);

    expect(rows).toHaveLength(1);
    expect(rows[0].hotelName).toBe("Manually selected hotel");
  });

  it("matches numeric and string group IDs", () => {
    const rows = buildClipboardHotelRowsForGroup([
      hotel({ groupType: "2" as unknown as number, hotelName: "Group 2 hotel" }),
    ], 2);

    expect(rows.map((row) => row.hotelName)).toEqual(["Group 2 hotel"]);
  });

  it("uses stable group IDs when selecting recommendations", () => {
    const recommendations = [
      { label: "Recommended #2", groupType: 2, hotels: ["group-2"] },
      { label: "Recommended #1", groupType: 1, hotels: ["group-1"] },
    ];

    const selected = {
      [getClipboardSelectionKey(1)]: true,
    };

    expect(buildSelectedClipboardGroups(recommendations, selected)).toEqual([
      { label: "Recommended #1", groupType: 1, hotels: ["group-1"] },
    ]);
  });
});
