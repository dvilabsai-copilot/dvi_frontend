import { useState } from "react";
import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { ItineraryHotelRow } from "../ItineraryDetails";
import * as hotelUtils from "./hotelList.utils";
import { useHotelListRows } from "./useHotelListRows";

const hotels = [1, 2].map((routeId) => ({
  groupType: 1,
  itineraryRouteId: routeId,
  day: `Day ${routeId}`,
  date: `2026-11-${12 + routeId}`,
  destination: "Chennai",
  hotelId: 10,
  hotelName: "Saved hotel",
  category: 3,
  roomType: "Deluxe",
  mealPlan: "CP",
  totalHotelCost: 1000,
  totalHotelTaxAmount: 0,
})) as ItineraryHotelRow[];

function renderRows(initial: Record<string, object>, initialReadOnly = true) {
  let renders = 0;
  const hook = renderHook(({ readOnly }) => {
    // Bound the regression so the previous implementation fails promptly
    // instead of hanging the test runner in the same loop as the browser.
    if (++renders > 15) throw new Error("Voucher cleanup keeps rendering");
    const [selected, setSelected] = useState(initial);
    const [visibleHotels, setVisibleHotels] = useState(hotels);
    const rows = useHotelListRows({
      localHotels: visibleHotels,
      activeGroupType: 1,
      selectedByGroup: {},
      userSelectedByGroup: {},
      readOnly,
      roomCount: 1,
      hotelTabs: [],
      // Match HotelList's fresh fallback arrays for archived API responses.
      stayRoutes: [],
      emptyStayBlocks: [],
      earlyArrivalMarkers: [],
      dayDestinationFallback: {},
      selectedVoucherRows: selected,
      setSelectedVoucherRows: setSelected,
      helpers: hotelUtils,
    });
    return { ...rows, selected, setVisibleHotels };
  }, { initialProps: { readOnly: initialReadOnly } });
  return hook;
}

describe("read-only voucher selection cleanup", () => {
  it.each([{}, { [hotelUtils.getStayKey(hotels[0])]: { id: 1 } }])(
    "preserves unchanged state and settles with recreated row metadata: %j",
    (selection) => {
      const { result, rerender } = renderRows(selection);
      expect(result.current.selected).toBe(selection);
      rerender({ readOnly: true });
      expect(result.current.selected).toBe(selection);
      expect(result.current.currentHotelRows).toHaveLength(2);
    },
  );

  it("removes only selections whose stays disappeared, then settles", () => {
    const first = { id: 1 };
    const firstKey = hotelUtils.getStayKey(hotels[0]);
    const secondKey = hotelUtils.getStayKey(hotels[1]);
    const { result, rerender } = renderRows({ [firstKey]: first, [secondKey]: { id: 2 } });
    act(() => result.current.setVisibleHotels([hotels[0]]));
    expect(result.current.selected).toEqual({ [firstKey]: first });
    expect(result.current.selected[firstKey]).toBe(first);
    const pruned = result.current.selected;
    rerender({ readOnly: true });
    expect(result.current.selected).toBe(pruned);
    act(() => result.current.setVisibleHotels([]));
    expect(result.current.selected).toEqual({});
  });

  it("still clears voucher selections when switching to editable mode", () => {
    const { result, rerender } = renderRows({ [hotelUtils.getStayKey(hotels[0])]: { id: 1 } });
    rerender({ readOnly: false });
    expect(result.current.selected).toEqual({});
    const cleared = result.current.selected;
    rerender({ readOnly: false });
    expect(result.current.selected).toBe(cleared);
  });
});
