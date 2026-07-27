import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ItineraryService } from "@/services/itinerary";
import { getDetailsDeduped } from "@/pages/itinerary-details/utils/details-dedupe";
import { usePreparedItineraryPageLoader } from "@/pages/itinerary-details/hooks/usePreparedItineraryPageLoader";
import { getInitialHotelGroupType } from "@/pages/hotel-list/initialHotelGroupType";
import { retryVehiclePricing } from "@/pages/itinerary-details/utils/retryVehiclePricing";
import { getAuthoritativeVehiclePricingState } from "@/pages/itinerary-details/utils/vehicleAvailability.utils";

describe("vehicle creation/details request flow", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("deduplicates one initial details load under concurrent callers", async () => {
    const getDetails = vi.spyOn(ItineraryService, "getDetails").mockResolvedValue(
      { quoteId: "Q" } as unknown as Awaited<ReturnType<typeof ItineraryService.getDetails>>,
    );

    await Promise.all([getDetailsDeduped("Q"), getDetailsDeduped("Q")]);

    expect(getDetails).toHaveBeenCalledTimes(1);
    expect(getDetails).toHaveBeenCalledWith("Q");
  });

  it("loads details once and renders the completed response without vehicle status/sync calls", async () => {
    const getDetailsDedupedMock = vi.fn().mockResolvedValue({
      quoteId: "Q",
      planId: 9965,
      itineraryPreference: 2,
      vehicles: [{ vendorEligibleId: 5493, vehicleTypeId: 1, totalAmount: 20196, vendorName: "MYSORE" }],
      vehiclePricingState: {
        status: "READY",
        requestedVehicleTypeCount: 1,
        usableVehicleDetailCount: 1,
        selectedVehicleTypeCount: 1,
        requiredSelectionCount: 1,
      },
    });
    const setItinerary = vi.fn();
    const setPageReady = vi.fn();
    const setVehicleBuildStatus = vi.fn();
    const setVehicleBuildError = vi.fn();
    const { result } = renderHook(() => usePreparedItineraryPageLoader({
      isMountedRef: { current: true },
      latestRouteRequestRef: { current: 0 },
      currentFetchRef: { current: null },
      setLoading: vi.fn(),
      setLoadingHotels: vi.fn(),
      setHotelError: vi.fn(),
      setPageReady,
      setError: vi.fn(),
      setPageLoaderHistory: vi.fn(),
      pushPageLoaderStage: vi.fn(),
      getDetailsDeduped: getDetailsDedupedMock,
      loadHotelDetailsForItinerary: vi.fn(),
      cacheRouteHotelDetails: vi.fn(),
      setItinerary,
      setHotelDetails: vi.fn(),
      setActiveHotelListTotal: vi.fn(),
      setVehicleBuildStatus,
      setVehicleBuildError,
    }));

    await act(async () => {
      await result.current("Q");
    });

    expect(getDetailsDedupedMock).toHaveBeenCalledTimes(1);
    expect(setItinerary).toHaveBeenCalledWith(expect.objectContaining({ vehicles: expect.any(Array) }));
    expect(setVehicleBuildStatus).toHaveBeenCalledWith("READY");
    expect(setPageReady).toHaveBeenCalledWith(true);
  });

  it("initializes the first hotel tab locally without emitting a parent change", () => {
    expect(getInitialHotelGroupType(null, [{ groupType: 1 }])).toBe(1);
    expect(getInitialHotelGroupType(2, [{ groupType: 1 }])).toBe(2);
    expect(getInitialHotelGroupType(null, [])).toBeNull();
  });

  it("performs one explicit synchronous retry and one details reload", async () => {
    const buildVehiclesSync = vi.fn().mockResolvedValue({ status: "READY" });
    const loadPreparedItineraryPage = vi.fn().mockResolvedValue("READY");

    await retryVehiclePricing({
      planId: 9965,
      quoteId: "Q",
      buildVehiclesSync,
      loadPreparedItineraryPage,
    });

    expect(buildVehiclesSync).toHaveBeenCalledTimes(1);
    expect(buildVehiclesSync).toHaveBeenCalledWith(9965);
    expect(loadPreparedItineraryPage).toHaveBeenCalledTimes(1);
    expect(loadPreparedItineraryPage).toHaveBeenCalledWith("Q", { ignorePartialSave: true });
  });

  it("does not infer READY from vehicle rate rows when the authoritative response is incomplete", () => {
    const state = getAuthoritativeVehiclePricingState({
      vehiclePricingState: {
        status: "RECOVERY_REQUIRED",
        requestedVehicleTypeCount: 1,
        usableVehicleDetailCount: 0,
        selectedVehicleTypeCount: 0,
        requiredSelectionCount: 1,
      },
    });

    expect(state.status).toBe("RECOVERY_REQUIRED");
  });

  it("consumes partial-save route state as explicit recovery even when details contain vehicle rows", async () => {
    const setVehicleBuildStatus = vi.fn();
    const details = {
      quoteId: "Q",
      planId: 9965,
      itineraryPreference: 2,
      vehicles: [{ vendorEligibleId: 5493, vehicleTypeId: 1, totalAmount: 20196 }],
      vehiclePricingState: {
        status: "READY",
        requestedVehicleTypeCount: 1,
        usableVehicleDetailCount: 1,
        selectedVehicleTypeCount: 1,
        requiredSelectionCount: 1,
      },
    };
    const { result } = renderHook(() => usePreparedItineraryPageLoader({
      isMountedRef: { current: true }, latestRouteRequestRef: { current: 0 }, currentFetchRef: { current: null },
      setLoading: vi.fn(), setLoadingHotels: vi.fn(), setHotelError: vi.fn(), setPageReady: vi.fn(), setError: vi.fn(),
      setPageLoaderHistory: vi.fn(), pushPageLoaderStage: vi.fn(), getDetailsDeduped: vi.fn().mockResolvedValue(details),
      loadHotelDetailsForItinerary: vi.fn(), cacheRouteHotelDetails: vi.fn(), setItinerary: vi.fn(), setHotelDetails: vi.fn(),
      setActiveHotelListTotal: vi.fn(), setVehicleBuildStatus, setVehicleBuildError: vi.fn(),
    }));

    await act(async () => {
      await result.current("Q", { partialSave: { planId: 9965, quoteId: "Q" } });
    });

    expect(setVehicleBuildStatus).toHaveBeenCalledWith("RECOVERY_REQUIRED");
  });

  it("keeps hotel failure isolated from an authoritative READY vehicle state", async () => {
    const setVehicleBuildStatus = vi.fn();
    const setHotelError = vi.fn();
    const { result } = renderHook(() => usePreparedItineraryPageLoader({
      isMountedRef: { current: true }, latestRouteRequestRef: { current: 0 }, currentFetchRef: { current: null },
      setLoading: vi.fn(), setLoadingHotels: vi.fn(), setHotelError, setPageReady: vi.fn(), setError: vi.fn(),
      setPageLoaderHistory: vi.fn(), pushPageLoaderStage: vi.fn(),
      getDetailsDeduped: vi.fn().mockResolvedValue({
        quoteId: "Q", planId: 9965, itineraryPreference: 3, vehicles: [],
        vehiclePricingState: { status: "READY", requestedVehicleTypeCount: 1, usableVehicleDetailCount: 1, selectedVehicleTypeCount: 1, requiredSelectionCount: 1 },
      }),
      loadHotelDetailsForItinerary: vi.fn().mockRejectedValue(new Error("hotel timeout")),
      cacheRouteHotelDetails: vi.fn(), setItinerary: vi.fn(), setHotelDetails: vi.fn(), setActiveHotelListTotal: vi.fn(),
      setVehicleBuildStatus, setVehicleBuildError: vi.fn(),
    }));

    await act(async () => {
      await result.current("Q");
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    expect(setVehicleBuildStatus).toHaveBeenCalledWith("READY");
    expect(setVehicleBuildStatus).not.toHaveBeenCalledWith("FAILED");
    expect(setHotelError).toHaveBeenCalledWith("hotel timeout");
  });

  it("requires the refreshed authoritative details response to confirm retry success", async () => {
    const loadPreparedItineraryPage = vi.fn().mockResolvedValue("RECOVERY_REQUIRED");
    await expect(retryVehiclePricing({
      planId: 9965, quoteId: "Q", buildVehiclesSync: vi.fn().mockResolvedValue({ status: "READY" }), loadPreparedItineraryPage,
    })).rejects.toThrow("refreshed itinerary is not ready");
  });

  it("keeps retry failure from issuing a details reload", async () => {
    const buildVehiclesSync = vi.fn().mockRejectedValue(new Error("retry failed"));
    const loadPreparedItineraryPage = vi.fn();

    await expect(retryVehiclePricing({
      planId: 9965,
      quoteId: "Q",
      buildVehiclesSync,
      loadPreparedItineraryPage,
    })).rejects.toThrow("retry failed");

    expect(buildVehiclesSync).toHaveBeenCalledTimes(1);
    expect(loadPreparedItineraryPage).not.toHaveBeenCalled();
  });
});
