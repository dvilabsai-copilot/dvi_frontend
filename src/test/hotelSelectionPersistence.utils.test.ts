import { describe, expect, it } from "vitest";
import { findRouteHotelForSelection, getHotelsForStay, mergeHotelOptions, type HotelLike } from "@/pages/hotel-list/hotelList.utils";
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

describe("mergeHotelOptions canonical identity", () => {
  it("keeps date-scoped rates separate when rateOptionId differs", () => {
    const merged = mergeHotelOptions([
      {
        provider: "offline",
        hotelId: 211,
        roomType: "Deluxe Room",
        mealPlan: "CP",
        rateOptionId: "offline:211:540:3:2026-08-12:2026-08-13",
        pricePerNight: 1450,
      },
      {
        provider: "offline",
        hotelId: 211,
        roomType: "Suite Room",
        mealPlan: "MAP",
        rateOptionId: "offline:211:540:3:2026-08-13:2026-08-14",
        pricePerNight: 1630,
      },
    ] as any);

    expect(merged).toHaveLength(2);
    expect(merged.map((row) => row.rateOptionId)).toEqual([
      "offline:211:540:3:2026-08-12:2026-08-13",
      "offline:211:540:3:2026-08-13:2026-08-14",
    ]);
  });
});

describe("continuous-stay room variants", () => {
  it("keeps all room types visible when the second night is rendered", () => {
    const row = {
      itineraryRouteId: 11320,
      routeIds: [11320, 11321],
      date: "2099-01-01",
      availableDates: ["2099-01-01", "2099-01-02"],
      completeStayBookable: true,
      groupType: 1,
      provider: "offline",
      hotelId: 95,
      hotelCode: "95",
      hotelName: "THE ARBOUR RESORT",
      rateOptions: [
        { rateOptionId: "club-non-ac", roomType: "Club Rooms Non AC", mealPlan: "CP", totalPrice: 13600, isSelectable: true },
        { rateOptionId: "club-ac", roomType: "Club room A/C", mealPlan: "CP", totalPrice: 16000, isSelectable: true },
      ],
    } as any;

    const rows = getHotelsForStay([row], 11321, "2099-01-02", 1, 10227, 1, "Munnar");
    expect(rows.map((hotel) => hotel.roomType)).toEqual(["Club Rooms Non AC", "Club room A/C"]);
  });
});
