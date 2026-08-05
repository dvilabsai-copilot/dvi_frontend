import { describe, expect, it } from "vitest";
import type { ItineraryHotelRow } from "../ItineraryDetails";
import { getHotelDisplayAmount, getHotelsForStay, getStayKey } from "./hotelList.utils";
import { useHotelGroupTotals } from "./useHotelGroupTotals";

const makeHotel = (overrides: Partial<ItineraryHotelRow> & Record<string, unknown>): ItineraryHotelRow => ({
  groupType: 2,
  itineraryRouteId: 10107,
  day: "Day 2",
  date: "2026-08-08",
  destination: "Chennai",
  hotelId: 687,
  hotelName: "Lemon Tree Shimona",
  category: 4,
  roomType: "Superior Double",
  mealPlan: "CP",
  totalHotelCost: 8085,
  totalHotelTaxAmount: 0,
  noOfRooms: 1,
  ...overrides,
});

const buildTotals = (
  localHotels: ItineraryHotelRow[],
  selectedByGroup: Record<number, Record<string, ItineraryHotelRow>> = {},
  recommendationTabs: Array<{ groupType: number; totalAmount?: number | null; partialTotal?: number | null }> = [],
) => {
  // This utility is named useHotelGroupTotals for historical reasons but does
  // not call React hooks; it is safe to invoke directly in this unit test.
  // eslint-disable-next-line react-hooks/rules-of-hooks
  return useHotelGroupTotals({
  localHotels,
  selectedByGroup,
  userSelectedByGroup: {},
  recommendationTabs,
  activeStayRoutes: [{ routeId: 10107, date: "2026-08-08" }],
  helpers: {
    getStayKey,
    getHotelOptionKey: (hotel) => `${hotel.hotelId}|${hotel.roomType}|${hotel.mealPlan}`,
    sortStayGroupsByDate: (groups) => groups,
    isSelectableHotel: (hotel) => Boolean(hotel?.hotelName),
    findMatchingRoomMealInStay: () => null,
    getAutoSelectableHotelsRespectingPreviousRoomMeal: (stayHotels) => stayHotels,
    isPlaceholderHotel: (hotel) => !hotel?.hotelName,
    getHotelAmountWithRooms: getHotelDisplayAmount,
  },
  });
};

describe("useHotelGroupTotals", () => {
  it("ignores stale rows with the same route ID but an old route date", () => {
    const totals = buildTotals([
      makeHotel({
        date: "2026-08-03",
        totalHotelCost: 9063.36,
        itineraryPlanHotelDetailsId: 11564,
      }),
      makeHotel({
        date: "2026-08-08",
        totalHotelCost: 8085,
        itineraryPlanHotelDetailsId: 12201,
      }),
    ]);

    expect(totals.getGroupTotal(2)).toBe(8085);
  });

  it("does not include deleted selections in the current total", () => {
    const totals = buildTotals([
      makeHotel({ deleted: 1, totalHotelCost: 9063.36 }),
      makeHotel({ totalHotelCost: 8085 }),
    ] as Array<ItineraryHotelRow & { deleted?: number }>);

    expect(totals.getGroupTotal(2)).toBe(8085);
  });

  it("counts one visible route row when legacy selections share the same stay", () => {
    const totals = buildTotals([
      makeHotel({
        stayKey: "current-selection",
        hotelId: 687,
        totalHotelCost: 8085,
        isSelected: true,
      }),
      makeHotel({
        stayKey: "legacy-selection",
        hotelId: 111,
        totalHotelCost: 4531.68,
        itineraryPlanHotelDetailsId: 12201,
      }),
    ]);

    expect(totals.getGroupTotal(2)).toBe(8085);
  });

  it("matches an explicit selection by route/date when its legacy stayKey changed", () => {
    const currentRate = makeHotel({
      stayKey: "current-stay-key",
      totalHotelCost: 8085,
      itineraryPlanHotelDetailsId: 0,
    });
    const legacyRate = makeHotel({
      stayKey: "legacy-stay-key",
      totalHotelCost: 4531.68,
      itineraryPlanHotelDetailsId: 12201,
    });

    const totals = buildTotals(
      [currentRate, legacyRate],
      {
        2: {
          // This key no longer exists in the current snapshot, but the
          // selected row still has the current route/date identity.
          "old-reconciled-key": currentRate,
        },
      },
    );

    expect(totals.getGroupTotal(2)).toBe(8085);
  });

  it("uses an explicit current route/date selection even when its option is absent from the snapshot", () => {
    const previousRate = makeHotel({
      hotelName: "Mount Residency",
      hotelId: 111,
      totalHotelCost: 5879.18,
      itineraryPlanHotelDetailsId: 12201,
    });
    const selectedRate = makeHotel({
      hotelName: "Ramada Chennai Egmore",
      hotelId: 222,
      totalHotelCost: 7957,
      totalAmount: 7957,
      date: "2026-08-08",
      stayKey: "canonical-route-date",
      selectionOrigin: "USER_SELECTED",
    });

    const totals = useHotelGroupTotals({
      localHotels: [previousRate],
      selectedByGroup: {},
      userSelectedByGroup: {
        2: { "legacy-selection-key": selectedRate },
      },
      activeStayRoutes: [{ routeId: 10107, date: "2026-08-08" }],
      helpers: {
        getStayKey,
        getHotelOptionKey: (hotel) => `${hotel.hotelId}|${hotel.roomType}|${hotel.mealPlan}`,
        sortStayGroupsByDate: (groups) => groups,
        isSelectableHotel: (hotel) => Boolean(hotel?.hotelName),
        findMatchingRoomMealInStay: () => null,
        getAutoSelectableHotelsRespectingPreviousRoomMeal: (stayHotels) => stayHotels,
        isPlaceholderHotel: (hotel) => !hotel?.hotelName,
        getHotelAmountWithRooms: getHotelDisplayAmount,
      },
    });

    expect(totals.getGroupTotal(2)).toBe(7957);
  });

  it("uses the current offline rate instead of stale pricing from an older provider", () => {
    const staleSelection = makeHotel({
      provider: "offline",
      totalHotelCost: 7350,
      totalPrice: 7350,
      selectedTotalPrice: 4531.68,
      selectedPricePerNight: 4531.68,
      selectedPriceSnapshot: {
        provider: "tbo",
        optionKey: "tbo|687|superior-double|old-rate",
        totalPrice: 4531.68,
        pricePerNight: 4531.68,
      },
      optionKey: "offline|687|superior-double|cp|current-rate",
      rateOptionId: "offline-current-rate",
      bookingCode: "offline-current-rate",
      searchReference: "offline-current-rate",
    } as any);

    expect(getHotelDisplayAmount(staleSelection)).toBe(7350);

    const currentRows = getHotelsForStay(
      [staleSelection],
      10107,
      "2026-08-08",
      2,
      10039,
      1,
    );
    expect(currentRows).toHaveLength(1);
    expect(getHotelDisplayAmount(currentRows[0])).toBe(7350);
  });

  it("does not reuse a stale payable total when the same hotel has a different rate", () => {
    const staleRate = makeHotel({
      provider: "tbo",
      hotelCode: 687,
      canonicalHotelId: 687,
      roomId: "superior-double",
      roomType: "Superior Double",
      mealPlan: "CP",
      totalHotelCost: 11700.15,
      totalPrice: 11700.15,
      selectedTotalPrice: 9983.46,
      selectedPriceSnapshot: {
        provider: "tbo",
        hotelCode: 687,
        roomId: "superior-double",
        roomType: "Superior Double",
        mealPlan: "CP",
        optionKey: "tbo|687|superior-double|old-rate",
        totalPrice: 9983.46,
      },
      optionKey: "tbo|687|superior-double|new-rate",
      rateOptionId: "new-rate",
      bookingCode: "new-rate",
      searchReference: "new-rate",
      isSelected: true,
      selectionId: 12226,
    } as any);

    expect(getHotelDisplayAmount(staleRate)).toBe(11700.15);
  });

  it("uses the persisted payable total for a currently selected row", () => {
    const selected = makeHotel({
      provider: "offline",
      totalHotelCost: 3990,
      totalPrice: 3990,
      selectedTotalPrice: 4389,
      selectedPricePerNight: 3990,
      selectedPriceSnapshot: {
        provider: "offline",
        optionKey: "offline|111|gokulam|cp|current-rate",
        totalPrice: 4389,
        pricePerNight: 3990,
      },
      optionKey: "offline|111|gokulam|cp|current-rate",
      rateOptionId: "offline-current-rate",
      bookingCode: "offline-current-rate",
      searchReference: "offline-current-rate",
      isSelected: true,
      selectionOrigin: "USER_SELECTED",
      selectionId: 12225,
    } as any);

    expect(getHotelDisplayAmount(selected)).toBe(4389);
  });

  it("uses the persisted payable total when the current row adds a room ID", () => {
    const selected = makeHotel({
      provider: "offline",
      hotelCode: 540,
      canonicalHotelId: 540,
      roomId: 1627,
      roomType: "Pool Hut",
      mealPlan: "MAP",
      totalHotelCost: 4300,
      totalPrice: 4300,
      totalStayPrice: 4300,
      selectedTotalPrice: 4730,
      selectedPricePerNight: 4300,
      selectedPriceSnapshot: {
        provider: "offline",
        hotelCode: 540,
        roomType: "Pool Hut",
        mealPlan: "MAP",
        optionKey: "offline|540|||offline-rate|map",
        totalPrice: 4730,
        pricePerNight: 4300,
      },
      optionKey: "offline|540|1627||offline-rate|map",
      rateOptionId: "offline-rate",
      bookingCode: "offline-rate",
      searchReference: "offline-rate",
      isSelected: true,
      selectionOrigin: "USER_SELECTED",
      selectionId: 12224,
    } as any);

    const totals = buildTotals([selected]);
    expect(getHotelDisplayAmount(selected)).toBe(4730);
    expect(totals.getGroupTotal(2)).toBe(4730);
  });

  it("keeps all four recommendation tab totals independent after reset", () => {
    const currentRows = [1, 2, 3, 4].map((groupType) =>
      makeHotel({
        groupType,
        totalHotelCost: groupType * 1000,
        itineraryPlanHotelDetailsId: 0,
      }),
    );
    const staleRows = [1, 2, 3, 4].map((groupType) =>
      makeHotel({
        groupType,
        date: "2026-08-03",
        totalHotelCost: 99999,
        itineraryPlanHotelDetailsId: 9000 + groupType,
      }),
    );

    const totals = buildTotals([...currentRows, ...staleRows]);

    expect([1, 2, 3, 4].map((groupType) => totals.getGroupTotal(groupType))).toEqual([
      1000,
      2000,
      3000,
      4000,
    ]);
  });

  it("uses persisted package totals for automatic recommendations", () => {
    const currentRows = [1, 2, 3, 4].map((groupType) =>
      makeHotel({ groupType, totalHotelCost: groupType * 1000 }),
    );
    const tabs = [1, 2, 3, 4].map((groupType) => ({
      groupType,
      totalAmount: groupType * 10000,
    }));

    const totals = buildTotals(currentRows, {}, tabs);

    expect([1, 2, 3, 4].map((groupType) => totals.getGroupTotal(groupType))).toEqual([
      10000,
      20000,
      30000,
      40000,
    ]);
  });

  it("uses the manual selection total only for the manually changed package", () => {
    const automaticRows = [2, 3, 4].map((groupType) =>
      makeHotel({ groupType, totalHotelCost: groupType * 1000 }),
    );
    const manualSelection = makeHotel({
      groupType: 1,
      totalHotelCost: 17500,
      selectionOrigin: "USER_SELECTED",
    });
    const totals = useHotelGroupTotals({
      localHotels: [manualSelection, ...automaticRows],
      selectedByGroup: {},
      userSelectedByGroup: { 1: { [getStayKey(manualSelection)]: manualSelection } },
      recommendationTabs: [1, 2, 3, 4].map((groupType) => ({
        groupType,
        totalAmount: groupType * 10000,
      })),
      activeStayRoutes: [{ routeId: 10107, date: "2026-08-08" }],
      helpers: {
        getStayKey,
        getHotelOptionKey: (hotel) => `${hotel.hotelId}|${hotel.roomType}|${hotel.mealPlan}`,
        sortStayGroupsByDate: (groups) => groups,
        isSelectableHotel: (hotel) => Boolean(hotel?.hotelName),
        findMatchingRoomMealInStay: () => null,
        getAutoSelectableHotelsRespectingPreviousRoomMeal: (stayHotels) => stayHotels,
        isPlaceholderHotel: (hotel) => !hotel?.hotelName,
        getHotelAmountWithRooms: getHotelDisplayAmount,
      },
    });

    expect(totals.getGroupTotal(1)).toBe(17500);
    expect(totals.getGroupTotal(2)).toBe(20000);
  });

  it("returns inventory from every recommendation group without a group filter", () => {
    const inventory = getHotelsForStay(
      [
        makeHotel({ groupType: 1, hotelId: 101, hotelName: "Budget Hotel" }),
        makeHotel({ groupType: 4, hotelId: 404, hotelName: "Premium Hotel" }),
      ],
      10107,
      "2026-08-08",
      undefined,
      10039,
      1,
    );

    expect(inventory.map((hotel) => hotel.hotelId)).toEqual([101, 404]);
  });
});
