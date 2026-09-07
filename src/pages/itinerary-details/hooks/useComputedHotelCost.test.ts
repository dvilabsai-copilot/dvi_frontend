import { renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { useComputedHotelCost } from "./useComputedHotelCost";

describe("useComputedHotelCost", () => {
  it("uses the authoritative DVI20260891 API total instead of summing visible rows", () => {
    const { result } = renderHook(() => useComputedHotelCost({
      hotelReadOnly: false,
      activeHotelListTotal: 953303.23,
      selectedHotelTotal: 81537.5,
      activeHotelGroupType: 1,
      roomCount: 5,
      hotelDetails: {
        hotelTabs: [{ groupType: 1, label: "Recommended #1", totalAmount: 953303.23 }],
        hotels: [
          { groupType: 1, itineraryRouteId: 1, hotelName: "MAMALLA HERITAGE", totalHotelCost: 60637.5, totalHotelTaxAmount: 0, isBookable: true },
          { groupType: 1, itineraryRouteId: 2, hotelName: "MAMALLA HERITAGE", totalHotelCost: 60637.5, totalHotelTaxAmount: 0, isBookable: true },
          { groupType: 1, itineraryRouteId: 3, hotelName: "MGM Beach Resorts", totalHotelCost: 871765.73, totalHotelTaxAmount: 0, isBookable: true },
          { groupType: 1, itineraryRouteId: 4, hotelName: "GREEN PALACE", totalHotelCost: 20900, totalHotelTaxAmount: 0, isBookable: true },
        ],
      } as any,
    }));

    expect(result.current).toBe(953303.23);
  });
});
