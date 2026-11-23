import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@/lib/api";
import { ItineraryService } from "@/services/itinerary";
import { useQuotationConfirmationSubmission } from "./useQuotationConfirmationSubmission";

vi.mock("@/services/itinerary", () => ({ ItineraryService: { confirmQuotation: vi.fn(), confirmManualQuotation: vi.fn() } }));

function setup() {
  const complete = vi.fn();
  const options = {
    itinerary: { planId: 1, roomCount: 1, adults: 1 },
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
    isSupplierBookableHotel: () => true, inferHotelProvider: () => "tbo", manualHotelHoldWorkflow: false, holdRequests: [],
  } as unknown as Parameters<typeof useQuotationConfirmationSubmission>[0];
  return { complete, result: renderHook(() => useQuotationConfirmationSubmission(options)).result };
}

describe("VSR confirmation availability review", () => {
  beforeEach(() => vi.resetAllMocks());

  it("submits a direct confirmation without requiring cached client PreBook data", async () => {
    vi.mocked(ItineraryService.confirmQuotation).mockResolvedValue({ success: true });
    const { result, complete } = setup();
    await act(async () => result.current.handleConfirmQuotation());
    expect(ItineraryService.confirmQuotation).toHaveBeenCalledOnce();
    expect(complete).toHaveBeenCalledOnce();
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
