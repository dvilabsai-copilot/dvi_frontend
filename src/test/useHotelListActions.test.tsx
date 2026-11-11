import { act, renderHook } from "@testing-library/react";
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
