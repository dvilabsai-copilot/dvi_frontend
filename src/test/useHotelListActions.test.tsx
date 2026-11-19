import { act, renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { useHotelListActions } from "@/pages/hotel-list/useHotelListActions";

describe("useHotelListActions hotel-change confirmation", () => {
  it("keeps the hold-removal confirmation callback after the availability preview", async () => {
    const onBeforeSelectionConfirm = vi.fn().mockResolvedValue(true);
    const setPendingHotelAction = vi.fn();
    const previewHotelIntent = vi.fn().mockResolvedValue({
      status: "AVAILABLE",
      selections: [{
        routeId: 12,
        provider: "offline",
        hotelCode: "202",
        hotelName: "New Hotel",
        roomType: "Deluxe Room",
        mealPlan: "CP",
        selectedRateOptionId: "offline-rate-1",
        pricePerNight: 1000,
        totalPrice: 1000,
      }],
    });

    const context = {
      readOnly: false,
      isUpdatingHotel: false,
      activeGroupType: 1,
      planId: 1,
      roomCount: 1,
      quoteId: "Q-1",
      currentHotelRows: [{ routeId: 12, hotelName: "Old Hotel", day: "2026-11-24" }],
      ItineraryService: { previewHotelIntent },
      setPendingHotelAction,
      setShowConfirmDialog: vi.fn(),
      setIsUpdatingHotel: vi.fn(),
      setHotelActionPhase: vi.fn(),
      hasSelectableHotelIdentity: vi.fn().mockReturnValue(true),
      resolveTargetGroupType: vi.fn().mockReturnValue(1),
      getExpandedRouteId: vi.fn().mockReturnValue(12),
      toNumber: (value: unknown, fallback = 0) => Number(value) || fallback,
      toast: { error: vi.fn(), success: vi.fn() },
    };

    const { result } = renderHook(() => useHotelListActions(context));
    await act(async () => {
      await result.current.handleChooseOrUpdateHotel({
        itineraryPlanId: 1,
        itineraryRouteId: 12,
        hotelId: 202,
        hotelCode: "202",
        hotelName: "New Hotel",
        provider: "offline",
        roomTypeName: "Deluxe Room",
        mealPlan: "CP",
        date: "2026-11-24",
      } as never, {
        selectionIntent: "HOTEL",
        onBeforeSelectionConfirm,
      });
    });

    expect(previewHotelIntent).toHaveBeenCalledOnce();
    expect(setPendingHotelAction).toHaveBeenCalledOnce();
    expect(setPendingHotelAction.mock.calls[0][0].onBeforeSelectionConfirm).toBe(onBeforeSelectionConfirm);
  });
});

describe("useHotelListActions room-card loading", () => {
  it("keeps an older empty result from clearing the current pane or its search", async () => {
    const complete = new Map<number, (response: { hotels: unknown[] }) => void>();
    const getPersistedHotelDetails = vi.fn((...args: unknown[]) =>
      new Promise<{ hotels: unknown[] }>((resolve) => complete.set(Number(args[4]), resolve)),
    );
    const setLoadingRowKey = vi.fn();
    const setHotelSearchQuery = vi.fn();
    const setRoomDetails = vi.fn();
    const warn = vi.fn();
    const context = {
      quoteId: "Q-1",
      planId: 1,
      roomCount: 1,
      activeGroupType: 1,
      localHotels: [],
      localRestrictedHotels: [],
      ItineraryService: { getPersistedHotelDetails },
      getStayKey: (row: { itineraryRouteId: number }) => String(row.itineraryRouteId),
      getHotelsForStay: (rows: unknown[]) => rows,
      mergeHotelOptions: (...rows: unknown[][]) => [...new Set(rows.flat())],
      setLoadingRowKey,
      setHotelSearchQuery,
      setRoomDetails,
      setRoomDetailsCache: vi.fn(),
      setExpandedRowKey: vi.fn(),
      setRoomTypeDropdownOpen: vi.fn(),
      setSelectedHotelId: vi.fn(),
      toast: { warning: warn },
    };
    const { result } = renderHook(() => useHotelListActions(context));
    const monday = { itineraryRouteId: 12, date: "2027-01-11" };
    const tuesday = { itineraryRouteId: 13, date: "2027-01-12", hotelName: "Bellmount Resorts" };

    const first = result.current.handleRowClick(monday as never);
    await waitFor(() => expect(complete.has(12)).toBe(true));
    const second = result.current.handleRowClick(tuesday as never);
    await waitFor(() => expect(complete.has(13)).toBe(true));
    setHotelSearchQuery.mockClear();

    await act(async () => {
      complete.get(12)!({ hotels: [] });
      await first;
    });
    expect(setLoadingRowKey).toHaveBeenLastCalledWith("13::2027-01-12");
    expect(warn).not.toHaveBeenCalled();

    await act(async () => {
      complete.get(13)!({ hotels: [tuesday] });
      await second;
    });
    expect(setLoadingRowKey).toHaveBeenLastCalledWith(null);
    expect(setRoomDetails).toHaveBeenLastCalledWith([tuesday]);
    expect(setHotelSearchQuery).not.toHaveBeenCalled();
  });
});
