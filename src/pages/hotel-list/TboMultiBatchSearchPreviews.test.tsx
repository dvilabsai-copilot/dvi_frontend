import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { TboMultiBatchSearchPreviews } from "./TboMultiBatchSearchPreviews";

vi.mock("@/services/itinerary", () => ({
  ItineraryService: { getPersistedHotelDetails: async () => ({ hotels: [] }) },
}));

type Props = Parameters<typeof TboMultiBatchSearchPreviews>[0];
const routeId = 26765;

function offer(hotelCode: string, hotelName: string, roomType: string, mealPlan: string, full = true) {
  return {
    provider: "tbo", hotelCode, hotelName, roomType, mealPlan: "CP",
    itineraryRouteId: routeId, groupType: 0, day: "1", destination: "Mangalore",
    hotelId: 0, category: 3, totalHotelCost: 0, totalHotelTaxAmount: 0,
    tboRoomBatches: (full ? [6, 2] : [6]).map((roomCount, batchIndex) => ({
      hotelCode, roomType, mealPlan, roomCount, batchIndex,
      startRoomIndex: 6 * batchIndex, bookingCode: hotelCode + "!TB!" + batchIndex,
      currency: "INR", isRefundable: false, supplierTotalFare: 2000 * roomCount,
    })),
  };
}

function scenario(selectionOrigin = "AUTO_SELECTED"): Props {
  return {
    quoteId: "DVI20261156", roomCount: 8, activeGroupType: 1,
    hotels: [
      offer("1141249", "Metro Plaza Hotel", "Executive Room", "CP"),
      offer("1738421", "Hotel Citywalk Residency", "Deluxe Double Room", "EP"),
      offer("11111", "Partial Inventory", "Deluxe", "CP", false),
    ],
    hotelTabs: [],
    hotelAvailability: {
      hasSupplierHotels: true, supplierHotelCount: 3, placeholderRowCount: 0,
      totalSearchRoutes: 1, emptySearchRoutes: 0, isPlaceholderOnly: false, message: "",
      stayRoutes: [{ routeId, dayNumber: 1, date: "2026-11-25", destination: "Mangalore" }],
    },
    hotelSelectionState: [{ groupType: 1, label: "Recommended #1", totalAmount: 44520, selectionStatus: "SELECTED", routes: [{
      routeId, routeDate: "2026-11-25", selectionStatus: "SELECTED",
      selected: {
        provider: "offline", hotelCode: "DVIHTL867537", hotelName: "Offline Hotel",
        providerHotelCode: null, canonicalHotelId: null, roomType: "Deluxe", mealPlan: "CP",
        selectionKey: null, rateOptionId: null, supplierBookingCode: null,
        pricePerNight: 44520, totalPrice: 44520, selectedPriceSnapshot: { selectionOrigin },
      },
    }] }],
  };
}

describe("VSR 6+2 replacement rates", () => {
  afterEach(() => vi.restoreAllMocks());

  it("allows a complete CP offer to replace the automatically selected offline stay", async () => {
    const onChooseStay = vi.fn(async () => {});
    render(<TboMultiBatchSearchPreviews {...scenario()} onChooseStay={onChooseStay} />);
    expect(screen.getByText(/replace the auto-selected offline hotel/)).toBeInTheDocument();
    expect(screen.getByText("Partial Inventory").closest("tr")).toHaveTextContent("Room availability unverified");
    fireEvent.click(screen.getByRole("button", { name: "Choose this hotel" }));
    await waitFor(() => expect(onChooseStay).toHaveBeenCalledExactlyOnceWith({
      routeId, hotelCode: "1141249", hotelName: "Metro Plaza Hotel",
      roomType: "Executive Room", mealPlan: "CP", checkInDate: "2026-11-25",
    }));
  });

  it("keeps the actual supplier EP meal code and requires acknowledgement", async () => {
    const onChooseStay = vi.fn(async () => {});
    const confirm = vi.spyOn(window, "confirm").mockReturnValueOnce(false).mockReturnValueOnce(true);
    render(<TboMultiBatchSearchPreviews {...scenario()} onChooseStay={onChooseStay} />);
    const choose = screen.getByRole("button", { name: "Choose room-only rate" });
    fireEvent.click(choose);
    expect(onChooseStay).not.toHaveBeenCalled();
    fireEvent.click(choose);
    await waitFor(() => expect(onChooseStay).toHaveBeenCalledExactlyOnceWith({
      routeId, hotelCode: "1738421", hotelName: "Hotel Citywalk Residency",
      roomType: "Deluxe Double Room", mealPlan: "EP", checkInDate: "2026-11-25",
    }));
    expect(confirm).toHaveBeenCalledTimes(2);
  });

  it("keeps manually selected offline stays and read-only itineraries protected", () => {
    const { rerender } = render(<TboMultiBatchSearchPreviews {...scenario("USER_SELECTED")} onChooseStay={vi.fn()} />);
    expect(screen.queryByRole("button", { name: /choose/ })).toBeNull();
    rerender(<TboMultiBatchSearchPreviews {...scenario()} readOnly onChooseStay={vi.fn()} />);
    expect(screen.queryByRole("button", { name: /choose/ })).toBeNull();
  });
});
