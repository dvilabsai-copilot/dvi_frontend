import { act, renderHook } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import type { HotelRoomDetail } from "./hotelList.types";
import { getHotelOptionKey } from "./hotelList.utils";
import { useHotelListActions } from "./useHotelListActions";

afterEach(() => {
  vi.useRealTimers();
  localStorage.clear();
});

it("reuses a checked card offer for the same fresh stay without calling PreBook", async () => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-11-23T01:00:00Z"));
  localStorage.setItem("accessToken", `test.${btoa(JSON.stringify({ sub: 22, iat: 1795395600 }))}.test`);
  const room = {
    itineraryPlanId: 12235, itineraryRouteId: 26685, provider: "tbo", hotelCode: "1740353",
    hotelName: "At Wood Resort", roomType: "Deluxe Room", mealPlan: "MAP", date: "2027-01-10",
  } as HotelRoomDetail;
  const availablePreview = async () => ({
    status: "AVAILABLE",
    checkedRateSearchedAt: new Date().toISOString(),
    checkedRateExpiresAt: new Date(Date.now() + 30 * 60_000).toISOString(),
    logicalStay: { routeIds: [26685], stayDates: ["2027-01-10"], checkInDate: "2027-01-10", checkOutDate: "2027-01-11" },
    selections: [{
      ...room, routeId: 26685, routeDate: "2027-01-10", selectedRateOptionId: "test-supplier-token",
      pricePerNight: 10681.78, totalPrice: 10681.78, baseTotalPrice: 10173.12,
    }],
  });
  let needsSearch = false;
  const previewHotelIntent = vi.fn(async (payload: { reuseCheckedRateOnly?: boolean }) => {
    if (needsSearch && payload.reuseCheckedRateOnly) return { status: "SEARCH_REQUIRED" };
    return availablePreview();
  });
  const setHotelActionPhase = vi.fn();
  const checkHotelHoldEligibility = vi.fn(async () => ({ hotels: [{ holdable: true }] }));
  const selectHotelIntent = vi.fn();
  const setPendingHotelAction = vi.fn();
  const setShowConfirmDialog = vi.fn();
  const mount = () => renderHook(({ adultCount }) => useHotelListActions({
    planId: 12235, quoteId: "DVI20261132-V4", activeGroupType: 2, roomCount: 2, adultCount,
    getExpandedRouteId: () => 26685, getHotelOptionKey,
    toNumber: (value: unknown, fallback: number) => Number(value) || fallback,
    hasSelectableHotelIdentity: () => true,
    toast: { error: vi.fn() },
    setIsUpdatingHotel: vi.fn(),
    setHotelActionPhase,
    setPendingHotelAction,
    setShowConfirmDialog,
    ItineraryService: { previewHotelIntent, checkHotelHoldEligibility, selectHotelIntent },
  }), { initialProps: { adultCount: 5 } });
  let page = mount();
  const choose = () => act(async () => {
    await page.result.current.handleChooseOrUpdateHotel(room, { selectionIntent: "HOTEL", reuseCheckedCardRate: true });
  });

  await choose();
  expect(page.result.current.getCheckedHotelCardQuote(room, "HOTEL")?.payableAmount).toBe(10681.78);
  expect(previewHotelIntent).toHaveBeenCalledWith(expect.objectContaining({ reuseCheckedRateOnly: true }));
  expect(setHotelActionPhase).not.toHaveBeenCalledWith("checking");
  expect(page.result.current.getCheckedHotelCardQuote({ ...room, mealPlan: "CP" }, "HOTEL")).toBeUndefined();
  expect(localStorage.getItem("dvi.checked-hotel-rates.v1")).not.toContain("test-supplier-token");
  act(() => page.result.current.handleCancelHotelAction());
  page.unmount();
  act(() => vi.advanceTimersByTime(29 * 60_000));
  page = mount();
  expect(page.result.current.getCheckedHotelCardQuote(room, "HOTEL")?.payableAmount).toBe(10681.78);
  expect(previewHotelIntent).toHaveBeenCalledOnce();
  await choose();
  expect(previewHotelIntent).toHaveBeenCalledOnce();
  expect(setHotelActionPhase).not.toHaveBeenCalledWith("checking");
  expect(checkHotelHoldEligibility).not.toHaveBeenCalled();
  expect(setPendingHotelAction).toHaveBeenLastCalledWith(expect.objectContaining({ room: expect.objectContaining({ totalPrice: 10681.78 }) }));
  expect(setShowConfirmDialog).toHaveBeenLastCalledWith(true);
  expect(selectHotelIntent).not.toHaveBeenCalled();

  page.unmount();
  act(() => vi.advanceTimersByTime(60_000));
  page = mount();
  expect(page.result.current.getCheckedHotelCardQuote(room, "HOTEL")).toBeUndefined();
  expect(previewHotelIntent).toHaveBeenCalledOnce();
  needsSearch = true;
  await choose();
  expect(previewHotelIntent).toHaveBeenCalledTimes(3);
  expect(previewHotelIntent.mock.calls[1][0].reuseCheckedRateOnly).toBe(true);
  expect(previewHotelIntent.mock.calls[2][0].reuseCheckedRateOnly).toBeUndefined();
  expect(setHotelActionPhase.mock.calls.filter(([phase]) => phase === "checking")).toHaveLength(1);
  expect(setHotelActionPhase).toHaveBeenLastCalledWith("idle");
  needsSearch = false;
  page.rerender({ adultCount: 6 });
  expect(page.result.current.getCheckedHotelCardQuote(room, "HOTEL")).toBeUndefined();
  await choose();
  expect(previewHotelIntent).toHaveBeenCalledTimes(4);
  expect(setHotelActionPhase.mock.calls.filter(([phase]) => phase === "checking")).toHaveLength(1);
  expect(checkHotelHoldEligibility).not.toHaveBeenCalled();
});
