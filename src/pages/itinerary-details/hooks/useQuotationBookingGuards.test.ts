import { renderHook } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { useQuotationBookingGuards } from "./useQuotationBookingGuards";

afterEach(() => vi.unstubAllGlobals());

it("lets the server refresh expired VSR sessions and still checks session age for other providers", async () => {
  const fetch = vi.fn().mockResolvedValue({ json: async () => ({ ip: "192.0.2.1" }) });
  vi.stubGlobal("fetch", fetch);
  const setPrebookData = vi.fn();
  const setHasAcceptedUpdatedPrice = vi.fn();
  const { result } = renderHook(() => useQuotationBookingGuards({
    requiresHotelBookingFlow: true,
    externalStayCount: 0,
    tboSessionWindowMs: 35 * 60_000,
    hasAcceptedUpdatedPrice: true,
    setPrebookData,
    setHasAcceptedUpdatedPrice,
  }));
  const searchInitiatedAt = new Date(Date.now() - 60 * 60_000).toISOString();
  expect(await result.current([{ provider: "tbo", searchInitiatedAt }])).toEqual({ clientIp: "192.0.2.1" });
  expect(setPrebookData).not.toHaveBeenCalled();
  expect(await result.current([{ provider: "axisrooms", searchInitiatedAt }])).toBeNull();
  expect(setPrebookData).toHaveBeenCalledWith(null);
  expect(setHasAcceptedUpdatedPrice).toHaveBeenCalledWith(false);
  expect(fetch).toHaveBeenCalledOnce();
});
