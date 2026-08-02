import { describe, expect, it } from "vitest";
import { findRouteHotelForSelection, type HotelLike } from "@/pages/hotel-list/hotelList.utils";
import type { ItineraryHotelRow } from "@/pages/ItineraryDetails";

describe("findRouteHotelForSelection", () => {
  it("keeps the selected rate reference instead of taking the first property row", () => {
    const rows = [
      {
        itineraryRouteId: 10215,
        groupType: 1,
        provider: "tbo",
        hotelCode: "1114186",
        hotelName: "Eastend Munnar",
        bookingCode: "old-rate-for-this-hotel",
        searchReference: "old-rate-for-this-hotel",
        roomType: "DELUXE",
        mealPlan: "CP",
        totalAmount: 15000,
        date: "2026-08-13",
      },
      {
        itineraryRouteId: 10215,
        groupType: 1,
        provider: "tbo",
        hotelCode: "1114186",
        hotelName: "Eastend Munnar",
        bookingCode: "current-rate-for-this-hotel",
        searchReference: "current-rate-for-this-hotel",
        roomType: "DELUXE",
        mealPlan: "CP",
        totalAmount: 16841.53,
        date: "2026-08-13",
      },
    ] as unknown as ItineraryHotelRow[];

    const selected = findRouteHotelForSelection(rows, {
      itineraryRouteId: 10215,
      groupType: 1,
      provider: "tbo",
      hotelCode: "1114186",
      hotelName: "Eastend Munnar",
      bookingCode: "current-rate-for-this-hotel",
      searchReference: "current-rate-for-this-hotel",
      roomType: "DELUXE",
      mealPlan: "CP",
      totalAmount: 16841.53,
      date: "2026-08-13",
    } as unknown as HotelLike, 10215, 1);

    expect(selected?.bookingCode).toBe("current-rate-for-this-hotel");
  });

  it("does not silently choose an ambiguous same-property row", () => {
    const rows = [
      { itineraryRouteId: 10215, groupType: 1, provider: "tbo", hotelCode: "1114186", hotelName: "Eastend Munnar", date: "2026-08-13" },
      { itineraryRouteId: 10215, groupType: 1, provider: "tbo", hotelCode: "1114186", hotelName: "Eastend Munnar", date: "2026-08-13" },
    ] as unknown as ItineraryHotelRow[];

    expect(findRouteHotelForSelection(rows, {
      provider: "tbo",
      hotelCode: "1114186",
      hotelName: "Eastend Munnar",
      date: "2026-08-13",
    } as unknown as HotelLike, 10215, 1)).toBeNull();
  });
});
