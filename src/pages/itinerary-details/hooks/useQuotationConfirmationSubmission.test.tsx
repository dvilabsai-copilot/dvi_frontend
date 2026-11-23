import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@/lib/api";
import { ItineraryService } from "@/services/itinerary";
import { useQuotationConfirmationSubmission } from "./useQuotationConfirmationSubmission";

vi.mock("@/services/itinerary", () => ({
  ItineraryService: {
    confirmQuotation: vi.fn(),
    confirmManualQuotation: vi.fn(),
    getHotelBlockRequests: vi.fn(),
    getHotelHoldPolicy: vi.fn(),
  },
}));

function setup(overrides: Partial<Parameters<typeof useQuotationConfirmationSubmission>[0]> = {}) {
  const complete = vi.fn();
  const options = {
    itinerary: { planId: 12206, roomCount: 1, adults: 1 },
    guestDetails: { salutation: "Mr", name: "Guest", nationality: "IN" },
    confirmDefaultNationality: "IN",
    requiresHotelBookingFlow: true,
    canConfirmQuotation: true,
    hasAcceptedUpdatedPrice: true,
    agentInfo: { agent_id: 1 },
    externalStayEntries: [],
    validateQuotationPassengers: () => ({ normalizedAdditionalAdults: [], normalizedAdditionalChildren: [], normalizedAdditionalInfants: [], passengers: [] }),
    prepareQuotationHotelSelections: () => ({ groupTypeValue: 3, autoSelectedHotels: { 10: { hotelCode: "123", hotelName: "Tea Castle", netAmount: 1050 } } }),
    validateQuotationBookingGuards: async () => ({}),
    completeQuotationConfirmation: complete,
    setFormErrors: vi.fn(), setIsConfirmingQuotation: vi.fn(), setLoadingHotels: vi.fn(), setIsPrebooking: vi.fn(),
    isSupplierBookableHotel: () => true, inferHotelProvider: () => "tbo", manualHotelHoldWorkflow: true, holdRequests: [],
    ...overrides,
  } as unknown as Parameters<typeof useQuotationConfirmationSubmission>[0];
  return { complete, result: renderHook(() => useQuotationConfirmationSubmission(options)).result };
}

describe("VSR confirmation availability review", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(ItineraryService.getHotelBlockRequests).mockResolvedValue([]);
  });

  it("submits a direct confirmation without requiring cached client PreBook data", async () => {
    vi.mocked(ItineraryService.confirmQuotation).mockResolvedValue({ success: true });
    const { result, complete } = setup();
    await act(async () => result.current.handleConfirmQuotation());
    expect(ItineraryService.getHotelBlockRequests).toHaveBeenCalledWith(12206, 3);
    expect(ItineraryService.getHotelHoldPolicy).not.toHaveBeenCalled();
    expect(ItineraryService.confirmManualQuotation).not.toHaveBeenCalled();
    expect(ItineraryService.confirmQuotation).toHaveBeenCalledOnce();
    expect(ItineraryService.confirmQuotation).toHaveBeenCalledWith(expect.objectContaining({
      hotel_group_type: "3",
      hotel_bookings: [expect.objectContaining({ provider: "tbo", routeId: 10 })],
    }));
    expect(complete).toHaveBeenCalledOnce();
  });

  it("uses the hold flow when an existing hold is discovered during submission", async () => {
    vi.mocked(ItineraryService.getHotelBlockRequests).mockResolvedValue([
      { status: "BLOCKED", cutoffAt: new Date(Date.now() + 3600_000).toISOString() },
    ]);
    vi.mocked(ItineraryService.confirmManualQuotation).mockResolvedValue({ success: true });
    const { result } = setup();
    await act(async () => result.current.handleConfirmQuotation());
    expect(ItineraryService.confirmManualQuotation).toHaveBeenCalledOnce();
    expect(ItineraryService.confirmQuotation).not.toHaveBeenCalled();
  });

  it("preserves policy-based routing for a selection that also contains a non-VSR hotel", async () => {
    vi.mocked(ItineraryService.getHotelHoldPolicy).mockResolvedValue({ allowed: true });
    vi.mocked(ItineraryService.confirmManualQuotation).mockResolvedValue({ success: true });
    const { result } = setup({
      prepareQuotationHotelSelections: () => ({
        groupTypeValue: 3,
        autoSelectedHotels: {
          10: { provider: "tbo", hotelCode: "123", checkInDate: "2026-12-06" },
          11: { provider: "axisrooms", hotelCode: "456", checkInDate: "2026-12-07" },
        },
      }),
      inferHotelProvider: (hotel) => String(hotel.provider),
    });
    await act(async () => result.current.handleConfirmQuotation());
    expect(ItineraryService.getHotelHoldPolicy).toHaveBeenCalledTimes(2);
    expect(ItineraryService.getHotelBlockRequests).not.toHaveBeenCalled();
    expect(ItineraryService.confirmManualQuotation).toHaveBeenCalledOnce();
    expect(ItineraryService.confirmQuotation).not.toHaveBeenCalled();
  });

  it("does not submit a confirmation when the current holds cannot be verified", async () => {
    vi.mocked(ItineraryService.getHotelBlockRequests).mockRejectedValue(new Error("Hold lookup failed"));
    const { result } = setup();
    await act(async () => result.current.handleConfirmQuotation());
    expect(ItineraryService.confirmManualQuotation).not.toHaveBeenCalled();
    expect(ItineraryService.confirmQuotation).not.toHaveBeenCalled();
  });

  it("shows previous and latest supplier rates when the confirmation is stopped", async () => {
    const rates = [{ routeId: 10, hotelName: "Tea Castle", previousAmount: 1000, newAmount: 1100 }];
    vi.mocked(ItineraryService.confirmQuotation).mockRejectedValue(new ApiError("VSR rates changed.", 409, { code: "VSR_RATE_CHANGED", reviews: rates }));
    const { result, complete } = setup();
    await act(async () => result.current.handleConfirmQuotation());
    expect(result.current.vsrConfirmationReview).toEqual({ message: "VSR rates changed.", rates });
    expect(complete).not.toHaveBeenCalled();
  });

  it("shows the unavailable hotel and stops the confirmation", async () => {
    vi.mocked(ItineraryService.confirmQuotation).mockRejectedValue(new ApiError("Hotel is not available for the selected stay.", 400, { code: "VSR_HOTEL_UNAVAILABLE", hotelName: "Tea Castle" }));
    const { result, complete } = setup();
    await act(async () => result.current.handleConfirmQuotation());
    expect(result.current.vsrConfirmationReview).toEqual({ message: "Tea Castle. Hotel is not available for the selected stay.", rates: [] });
    expect(complete).not.toHaveBeenCalled();
  });
});
