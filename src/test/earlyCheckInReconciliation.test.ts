/* eslint-disable @typescript-eslint/no-explicit-any */
import { renderHook } from "@testing-library/react";
import {
  isSyntheticPreviousDayBillingRow,
  mergeEarlyArrivalDisplayMetadata,
  reconcilePreviousDayBillingRows,
} from "../pages/hotel-list/earlyCheckInReconciliation";
import { useHotelListRows } from "../pages/hotel-list/useHotelListRows";

const realRow = (overrides: Record<string, unknown> = {}) => ({
  itineraryRouteId: 11133,
  groupType: 1,
  date: "2026-09-06",
  day: "Day 1 | 2026-09-06",
  destination: "Munnar",
  hotelId: 232,
  hotelName: "THE ARBOUR RESORT",
  provider: "axisrooms",
  totalHotelCost: 10176,
  ...overrides,
} as any);

const syntheticRow = (overrides: Record<string, unknown> = {}) => ({
  itineraryRouteId: 11133,
  groupType: 1,
  date: "2026-09-05",
  day: "Day 1 (Previous Day) | 2026-09-05",
  hotelId: 232,
  hotelName: "THE ARBOUR RESORT",
  provider: "axisrooms",
  previousDayBillingSynthetic: true,
  earlyCheckIn: true,
  actualGuestArrivalAt: "2026-09-06T05:00:00.000Z",
  hotelierEarlyCheckInNote: "Block the room from the previous night",
  ...overrides,
} as any);

describe("early check-in previous-day reconciliation", () => {
  it("attaches a synthetic row to the exact group, route, and arrival date regardless of order", () => {
    for (const rows of [
      [syntheticRow(), realRow()],
      [realRow(), syntheticRow()],
    ]) {
      const result = reconcilePreviousDayBillingRows(rows);
      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        day: "Day 1 | 2026-09-06",
        earlyCheckIn: true,
        previousDayBillingSynthetic: false,
        previousDayBilling: {
          date: "2026-09-05",
          actualGuestArrivalAt: "2026-09-06T05:00:00.000Z",
        },
      });
      expect(result.some(isSyntheticPreviousDayBillingRow)).toBe(false);
    }
  });

  it("does not leak metadata across recommendation groups, hotels, or stale dates", () => {
    const otherGroup = realRow({ groupType: 2 });
    const otherHotel = realRow({ hotelId: 95, hotelName: "CLOUDS VALLEY" });
    const staleDate = realRow({ date: "2026-09-08" });
    const result = reconcilePreviousDayBillingRows([
      syntheticRow(),
      otherGroup,
      otherHotel,
      staleDate,
    ]);

    expect(result).toHaveLength(3);
    result.forEach((row) => expect(row.previousDayBilling).toBeUndefined());
  });

  it("uses check-out and then previous-date-plus-one when guest arrival is absent", () => {
    const fromCheckOut = reconcilePreviousDayBillingRows([
      syntheticRow({ actualGuestArrivalAt: null, checkOutDate: "2026-09-06" }),
      realRow(),
    ]);
    expect(fromCheckOut[0].previousDayBilling?.date).toBe("2026-09-05");

    const fromPreviousDate = reconcilePreviousDayBillingRows([
      syntheticRow({ actualGuestArrivalAt: null, checkOutDate: null }),
      realRow(),
    ]);
    expect(fromPreviousDate[0].previousDayBilling?.date).toBe("2026-09-05");
  });

  it("preserves normalized Day 0 metadata when a stale selected object wins display selection", () => {
    const normalized = reconcilePreviousDayBillingRows([syntheticRow(), realRow()])[0];
    const selected = realRow({
      hotelName: "Selected hotel payload",
      day: undefined,
      date: undefined,
      previousDayBilling: undefined,
      isSelected: true,
    });

    expect(mergeEarlyArrivalDisplayMetadata(selected, normalized)).toMatchObject({
      hotelName: "Selected hotel payload",
      day: "Day 1 | 2026-09-06",
      date: "2026-09-06",
      previousDayBilling: { date: "2026-09-05" },
    });
  });

  it("keeps Day 0 metadata on the final persisted-selection branch without returning a synthetic row", () => {
    const synthetic = syntheticRow();
    const real = realRow();
    const staleSelected = realRow({
      isSelected: true,
      previousDayBilling: undefined,
      earlyCheckIn: false,
    });
    const { result } = renderHook(() => useHotelListRows({
      localHotels: [synthetic, real],
      activeGroupType: 1,
      selectedByGroup: { 1: { "11133::2026-09-06": staleSelected } },
      userSelectedByGroup: {},
      readOnly: false,
      roomCount: 1,
      hotelTabs: [{ groupType: 1, label: "Recommended #1", totalAmount: 10176 }],
      stayRoutes: [{ routeId: 11133, dayNumber: 1, date: "2026-09-06", destination: "Munnar" }],
      dayDestinationFallback: {},
      selectedVoucherRows: {},
      setSelectedVoucherRows: () => undefined,
      helpers: {
        getStayKey: (hotel: any) => `${hotel.itineraryRouteId}::${hotel.date}`,
        getHotelOptionKey: (hotel: any) => `${hotel.hotelId}`,
        getHotelAmountWithRooms: (hotel: any) => Number(hotel.totalHotelCost),
        isExternalStayRow: () => false,
        isPlaceholderHotel: () => false,
        isSelectableHotel: () => true,
        findMatchingRoomMealInStay: () => null,
        sortStayGroupsByDate: (groups: any[]) => groups,
        getAutoSelectableHotelsRespectingPreviousRoomMeal: (rows: any[]) => rows,
        toNumber: (value: unknown, fallback = 0) => Number(value) || fallback,
      },
    }));

    expect(result.current.currentHotelRows).toHaveLength(1);
    expect(result.current.currentHotelRows[0]).toMatchObject({
      day: "Day 1 | 2026-09-06",
      previousDayBillingSynthetic: false,
      previousDayBilling: { date: "2026-09-05" },
    });
  });
});
