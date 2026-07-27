import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ApiError } from "@/lib/api";
import { useCreateItineraryRouteSave } from "@/pages/CreateItinerary/helpers/useCreateItineraryRouteSave";

describe("partial itinerary creation recovery", () => {
  it("preserves the saved plan and never submits a duplicate create request", async () => {
    const create = vi.fn().mockRejectedValue(new ApiError(
      "Itinerary saved, but vehicle pricing failed",
      422,
      {
        planId: 9965,
        quoteId: "DVI-PARTIAL",
        creationStatus: "PARTIAL",
        vehicleBuild: { status: "FAILED", buildRunId: "run-1" },
      },
    ));
    const navigate = vi.fn();
    const context = {
      buildPayload: () => ({ plan: {}, vehicles: [] }),
      arrivalPolicyDecisionRef: { current: {} },
      setIsSaving: vi.fn(),
      setActiveSaveType: vi.fn(),
      setEstimatedSaveMs: vi.fn(),
      startSaveProgress: vi.fn(),
      itineraryPlanId: null,
      isDefaultItineraryTypeSelected: () => false,
      suggestedDefaultRoutes: [],
      buildPayloadForSuggestedRoute: vi.fn(),
      ItineraryService: { create },
      extractCreatedQuoteId: vi.fn(),
      extractRouteFamilyBaseQuoteId: vi.fn(),
      setSaveProgressPercent: vi.fn(),
      toast: vi.fn(),
      setSaveErrorMessage: vi.fn(),
      setShowRouteConfirm: vi.fn(),
      navigate,
      stopSaveProgress: vi.fn(),
      setTransportLoadingMessageIndex: vi.fn(),
      getEstimatedSaveMs: () => 1000,
    } as Parameters<typeof useCreateItineraryRouteSave>[0];
    const { result } = renderHook(() => useCreateItineraryRouteSave(context));

    await act(async () => {
      await result.current.handleSaveWithType("itineary_basic_info");
      await result.current.handleSaveWithType("itineary_basic_info");
    });

    expect(create).toHaveBeenCalledTimes(1);
    expect(navigate).toHaveBeenCalledWith(
      "/itinerary-details/DVI-PARTIAL",
      expect.objectContaining({ state: { partialSave: { planId: 9965, quoteId: "DVI-PARTIAL" } } }),
    );
    expect(context.setSaveErrorMessage).toHaveBeenCalledWith(
      expect.stringContaining("Itinerary saved (plan 9965, quote DVI-PARTIAL)"),
    );
  });
});
