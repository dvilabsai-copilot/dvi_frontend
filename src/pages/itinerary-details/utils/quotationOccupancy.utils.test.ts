import { renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { useQuotationConfirmationViewModel } from "../hooks/useQuotationConfirmationViewModel";
import type { ItineraryDetailsResponse } from "../itinerary-details.types";
import { buildOccupancyPreview } from "./quotationConfirmationDetails.utils";
import { buildSupplierOccupancies, buildTboOccupancies, resolveTboHoldOccupancy } from "./quotationOccupancy.utils";

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

  it("uses saved traveller child ages for TBO holds", () => {
    expect(resolveTboHoldOccupancy(2, 4, 2, [
      { adults: 2, children: 1, childrenAges: [5] },
      { adults: 2, children: 1, childrenAges: [5] },
    ])).toEqual({
      occupancies: [
        { adults: 2, children: 1, childrenAges: [5] },
        { adults: 2, children: 1, childrenAges: [5] },
      ],
      childAges: [5, 5],
    });
  });

  it("uses age 5 when a TBO hold has no saved child age", () => {
    expect(resolveTboHoldOccupancy(2, 4, 2, null)).toEqual({
      occupancies: [
        { adults: 2, children: 1, childrenAges: [5] },
        { adults: 2, children: 1, childrenAges: [5] },
      ],
      childAges: [5, 5],
    });
  });

  it("fills only a missing saved child age and preserves supplied ages", () => {
    expect(resolveTboHoldOccupancy(1, 2, 2, [
      { adults: 2, children: 2, childrenAges: [0] },
    ])).toEqual({
      occupancies: [{ adults: 2, children: 2, childrenAges: [0, 5] }],
      childAges: [0, 5],
    });
  });

  it("rejects a saved rooming template that conflicts with the itinerary guest counts", () => {
    expect(() => resolveTboHoldOccupancy(2, 4, 2, [
      { adults: 2, children: 1, childrenAges: [5] },
    ])).toThrow(/Saved traveller rooming does not match/);
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
