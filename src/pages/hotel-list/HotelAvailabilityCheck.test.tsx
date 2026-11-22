import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useRef } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ItineraryService } from "@/services/itinerary";
import { HotelList } from "../HotelList";
import { useHotelSelectionState } from "../itinerary-details/hooks/useHotelSelectionState";
import { useHotelWorkflowState } from "../itinerary-details/hooks/useHotelWorkflowState";
import { useItineraryHotelDataWorkflow } from "../itinerary-details/hooks/useItineraryHotelDataWorkflow";
import { useItineraryRouteState } from "../itinerary-details/hooks/useItineraryRouteState";
import type { ItineraryHotelDetailsResponse } from "../itinerary-details/itinerary-details.types";

const quoteId = "DVI20261132-V4";
const savedDetails: ItineraryHotelDetailsResponse = {
  hotelRatesVisible: true,
  hotelTabs: [{ groupType: 1, label: "Recommended #1", totalAmount: 27085.88 }],
  restrictedHotels: [],
  hotels: [1, 2].map((day) => ({
    groupType: 1,
    itineraryRouteId: day,
    day: `Day ${day}`,
    date: `2027-01-${9 + day}`,
    destination: "Munnar",
    hotelId: 1,
    hotelName: "At Wood Resort",
    provider: "tbo",
    category: 3,
    roomType: "Deluxe Room",
    mealPlan: "MAP",
    totalHotelCost: 13542.94,
    totalHotelTaxAmount: 0,
    isSelected: true,
    selectionId: day,
  })),
  hotelAvailability: {
    hasSupplierHotels: true,
    supplierHotelCount: 1,
    placeholderRowCount: 0,
    totalSearchRoutes: 2,
    emptySearchRoutes: 0,
    isPlaceholderOnly: false,
    availabilityState: "FRESH",
    message: "",
  },
};
const unchangedResponse = {
  reconciliationEnabled: true,
  hotelDetails: savedDetails,
  changeSummary: { hasChanges: false, totalChanges: 0, changes: [] },
};

function HotelAvailabilityFixture() {
  const routeState = useItineraryRouteState(quoteId);
  const hotelSelectionState = useHotelSelectionState();
  const hotelWorkflowState = useHotelWorkflowState();
  const hotelDetails = routeState.hotelDetails ?? savedDetails;
  const workflow = useItineraryHotelDataWorkflow({
    routeState,
    hotelSelectionState,
    hotelWorkflowState,
    hotelDetails,
    quoteId,
    itineraryPlanId: 1,
    hotelSaveFunctionRef: useRef(null),
    enableAutomaticValidation: false,
    cacheRouteHotelDetails: vi.fn(),
    fetchCompleteHotelDetails: async () => savedDetails,
    loadHotelDetailsForItinerary: async () => savedDetails,
  });

  return (
    <HotelList
      {...hotelDetails}
      quoteId={quoteId}
      planId={1}
      isValidatingAvailability={hotelWorkflowState.isRebuildingHotels}
      onRefreshHotelAvailability={workflow.refreshHotelAvailability}
      onAcknowledgeAvailabilityChanges={workflow.acknowledgeHotelAvailabilityChanges}
      hotelAvailabilityChangeSummary={workflow.hotelAvailabilityChangeSummary}
    />
  );
}

const unchangedDialog = () => screen.queryByRole("dialog", { name: "Hotel rates unchanged" });
const checkButton = () => screen.getByRole("button", { name: "Check Availability" });

describe("itinerary hotel availability feedback", () => {
  beforeEach(() => {
    vi.spyOn(ItineraryService, "getDetails").mockResolvedValue({});
  });

  afterEach(() => vi.restoreAllMocks());

  it("confirms unchanged rates after each explicit check and leaves the saved offers intact", async () => {
    const check = vi.spyOn(ItineraryService, "checkHotelAvailability").mockResolvedValue(unchangedResponse);
    const acknowledge = vi.spyOn(ItineraryService, "acknowledgeHotelAvailabilityChanges");
    const user = userEvent.setup();
    const page = render(<HotelAvailabilityFixture />);

    expect(unchangedDialog()).not.toBeInTheDocument();
    expect(check).not.toHaveBeenCalled();
    await user.click(checkButton());
    const dialog = await screen.findByRole("dialog", { name: "Hotel rates unchanged" });
    expect(within(dialog).getByText("No rate changes were found for the selected hotels.")).toBeVisible();
    await user.click(within(dialog).getByRole("button", { name: "OK" }));
    await waitFor(() => expect(checkButton()).toHaveFocus());
    expect(screen.getAllByText(/At Wood Resort/)).toHaveLength(2);

    await user.click(checkButton());
    expect(await screen.findByRole("dialog", { name: "Hotel rates unchanged" })).toBeVisible();
    await user.keyboard("{Escape}");
    expect(unchangedDialog()).not.toBeInTheDocument();
    expect(check).toHaveBeenCalledTimes(2);
    expect(acknowledge).not.toHaveBeenCalled();

    page.unmount();
    render(<HotelAvailabilityFixture />);
    expect(unchangedDialog()).not.toBeInTheDocument();
    expect(check).toHaveBeenCalledTimes(2);
  });

  it("opens the existing review for a changed rate and keeps it unapproved when dismissed", async () => {
    vi.spyOn(ItineraryService, "checkHotelAvailability").mockResolvedValue({
      ...unchangedResponse,
      changeSummary: {
        hasChanges: true,
        totalChanges: 1,
        changes: [{ changeType: "PRICE_CHANGED", selectionId: 1, routeId: 1, groupType: 1, requiresAcceptance: true }],
      },
    });
    const acknowledge = vi.spyOn(ItineraryService, "acknowledgeHotelAvailabilityChanges");
    const user = userEvent.setup();
    render(<HotelAvailabilityFixture />);

    await user.click(checkButton());
    const dialog = await screen.findByRole("dialog", { name: "Hotel Availability Updated" });
    expect(unchangedDialog()).not.toBeInTheDocument();
    await user.click(within(dialog).getByRole("button", { name: "Keep saved prices" }));
    expect(acknowledge).not.toHaveBeenCalled();
  });

  it.each([
    ["partial", { ...savedDetails, hotelAvailability: { availabilityState: "PARTIAL" } }],
    ["empty", { ...savedDetails, hotels: [] }],
  ])("does not confirm unchanged rates when the result is %s", async (_scenario, hotelDetails) => {
    vi.spyOn(ItineraryService, "checkHotelAvailability").mockResolvedValue({ ...unchangedResponse, hotelDetails });
    render(<HotelAvailabilityFixture />);

    await act(async () => { fireEvent.click(checkButton()); });
    expect(ItineraryService.getDetails).toHaveBeenCalledWith(quoteId);
    expect(unchangedDialog()).not.toBeInTheDocument();
  });

  it("does not confirm unchanged rates after a failed request", async () => {
    const check = vi.spyOn(ItineraryService, "checkHotelAvailability").mockRejectedValue(new Error("Availability check failed"));
    render(<HotelAvailabilityFixture />);

    await act(async () => { fireEvent.click(checkButton()); });
    expect(check).toHaveBeenCalledOnce();
    expect(checkButton()).toBeEnabled();
    expect(unchangedDialog()).not.toBeInTheDocument();
  });
});
