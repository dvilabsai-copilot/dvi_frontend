import { renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { useQuotationConfirmationViewModel } from "../hooks/useQuotationConfirmationViewModel";
import type { ItineraryDetailsResponse } from "../itinerary-details.types";
import { buildOccupancyPreview } from "./quotationConfirmationDetails.utils";
import { buildSupplierOccupancies, buildTboOccupancies } from "./quotationOccupancy.utils";

describe("quotation occupancy builders", () => {
  it("does not hang when adults exceed the configured room capacity", () => {
    expect(buildOccupancyPreview(1, 19, 0)).toEqual([{ adults: 8, children: 0 }]);
    expect(buildSupplierOccupancies(1, 19, 0)).toEqual([{ adults: 8, children: 0, childrenAges: [] }]);
    expect(buildTboOccupancies(1, 19, [])).toEqual([{ adults: 8, children: 0, childrenAges: [] }]);
  });

  it("keeps normal adult and child allocation unchanged", () => {
    expect(buildOccupancyPreview(1, 2, 1)).toEqual([{ adults: 2, children: 1 }]);
    expect(buildSupplierOccupancies(2, 3, 1)).toEqual([
      { adults: 2, children: 1, childrenAges: [7] },
      { adults: 1, children: 0, childrenAges: [] },
    ]);
  });

  it("skips hotel occupancy preview for vehicle-only itineraries", () => {
    const { result } = renderHook(() => useQuotationConfirmationViewModel({
      itinerary: {
        itineraryPreference: 2,
        roomCount: 1,
        adults: 19,
        children: 0,
        infants: 0,
        overallCost: 0,
      } as unknown as ItineraryDetailsResponse,
      financialTotals: {},
      walletBalanceAmount: null,
      confirmOccupanciesTemplate: null,
      formErrors: {},
      guestNationality: "IN",
    }));

    expect(result.current.confirmOccupancyPreview).toEqual([]);
  });
});
