import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@/lib/api";
import { ItineraryService } from "@/services/itinerary";
import { HotelList } from "../HotelList";
import type { HotelListProps } from "./hotelList.types";
import type { HotelCardQuote } from "./hotelCardPricing";
import type { HotelAvailabilityMeta, ItineraryHotelRow } from "../itinerary-details/itinerary-details.types";

const planId = 12254;
const routeId = 26765;
const date = "2026-11-25";

const currentHotel: ItineraryHotelRow = {
  groupType: 1, itineraryRouteId: routeId, day: "Day 1", date, destination: "Mangalore",
  hotelId: 909, hotelCode: "DVIHTL867537", hotelName: "The Ocean Pearl Inn Bejai",
  provider: "offline", category: 3, roomType: "Deluxe", mealPlan: "CP",
  totalHotelCost: 44520, totalHotelTaxAmount: 0, pricePerNight: 44520,
  isSelected: true, selectionOrigin: "AUTO_SELECTED", isSelectable: true, isBookable: true,
};

function offer(hotelCode: string, hotelName: string, roomType: string, mealPlan: string, payable: number, roomCounts = [6, 2]): ItineraryHotelRow & { cardQuote: HotelCardQuote } {
  return {
    groupType: 0, hotelId: 0, category: 3, date, checkInDate: date, checkOutDate: "2026-11-26",
    day: "Day 1", itineraryRouteId: routeId, destination: "Mangalore", noOfRooms: 8,
    totalHotelCost: payable, totalHotelTaxAmount: 0,
    provider: "tbo", hotelCode, hotelName, roomType, mealPlan: "CP",
    isSelectable: false, isBookable: false, hotelStayCompleteStayBookable: false,
    availabilityStatus: roomCounts.length === 2 ? "BATCH_SEARCH_MATCH" : "NO_AVAILABILITY",
    availabilityMessage: roomCounts.length === 2 ? "Rates found for all supplier batches. Verify the complete stay before choosing." : undefined,
    batchSupplierQuote: { amount: mealPlan === "EP" ? 13917.46 : payable, currency: "INR" },
    ...(mealPlan === "EP" ? { tboMapFallbackApplied: true } : {}),
    cardQuote: { basis: "ROUTE_NIGHT", routeId, date, roomCount: 8, currency: "INR",
      payableAmount: payable, baseAmount: 19007.04 },
    tboRoomBatches: roomCounts.map((roomCount, batchIndex) => ({
      hotelCode, roomType, mealPlan, roomCount, batchIndex,
      startRoomIndex: 6 * batchIndex, bookingCode: hotelCode + "!TB!fixture" + batchIndex,
      currency: "INR", isRefundable: false, supplierTotalFare: 2000 * roomCount,
    })),
  };
}

const inventory = [
  offer("1141249", "Metro Plaza Hotel", "Executive Room", "CP", 19957.39),
  offer("1738421", "Hotel Citywalk Residency", "Deluxe Double Room", "EP", 20317.46),
  offer("1199999", "Partial Inventory", "Deluxe", "CP", 10000, [6]),
];

function fixture(origin: "AUTO_SELECTED" | "USER_SELECTED" | null = "AUTO_SELECTED"): HotelListProps {
  const hotels = origin ? [{ ...currentHotel, selectionOrigin: origin }, ...inventory] : inventory;
  const hotelTabs = origin ? [{ groupType: 1, label: "Recommended #1", totalAmount: 44520 }] : [];
  return {
    planId, quoteId: "DVI20261156", roomCount: 8, mealPlanCode: "CP", hotels, hotelTabs,
    hotelRatesVisible: true, restrictedHotels: [],
    hotelAvailability: {
      hasSupplierHotels: true, supplierHotelCount: 2, placeholderRowCount: 0, totalSearchRoutes: 1,
      emptySearchRoutes: 0, isPlaceholderOnly: false, message: "", availabilityState: "FRESH",
      stayRoutes: [{ routeId, dayNumber: 1, date, destination: "Mangalore" }],
    },
    hotelSelectionState: origin ? [{ groupType: 1, label: "Recommended #1", totalAmount: 44520, selectionStatus: "SELECTED", routes: [{
      routeId, routeDate: date, selectionStatus: "SELECTED",
      selected: {
        provider: "offline", hotelCode: currentHotel.hotelCode!, hotelName: currentHotel.hotelName,
        providerHotelCode: null, canonicalHotelId: 909, roomType: "Deluxe", mealPlan: "CP",
        selectionKey: null, rateOptionId: null, supplierBookingCode: null,
        pricePerNight: 44520, totalPrice: 44520, selectedPriceSnapshot: { selectionOrigin: origin },
      },
    }] }] : [],
  };
}

function openSavedStay() {
  const table = document.querySelector('table[data-group-type="1"]');
  expect(table).not.toBeNull();
  const row = table!.querySelector('[data-testid="hotel-row"]');
  expect(row).not.toBeNull();
  fireEvent.click(row!);
  return { table: within(table as HTMLElement), row: row as HTMLElement };
}

const metroChoice = () => screen.findByRole("button", { name: "Choose Metro Plaza Hotel" });
const rateDialog = () => screen.findByRole("dialog", { name: "Confirm Hotel Modification", exact: true });

function liveFare(amount: number, hotel = inventory[0]) {
  return {
    status: "AVAILABLE" as const, affectedRouteIds: [routeId], selections: [{
      routeId, routeDate: date, provider: "tbo", hotelCode: hotel.hotelCode!, hotelName: hotel.hotelName,
      roomType: hotel.roomType!, mealPlan: hotel.tboRoomBatches?.[0]?.mealPlan || "CP",
      selectedRateOptionId: `rate-${hotel.hotelCode}`,
      currency: "INR", totalPrice: amount, pricePerNight: amount,
    }],
  };
}

describe("6+2 VSR selection in the normal hotel cards", () => {
  beforeEach(() => {
    const props = fixture();
    vi.spyOn(ItineraryService, "previewHotelIntent").mockResolvedValue(liveFare(19957.39));
    vi.spyOn(ItineraryService, "getPersistedHotelDetails").mockResolvedValue({
      hotelRatesVisible: true,
      hotels: props.hotels, hotelTabs: props.hotelTabs, hotelAvailability: props.hotelAvailability as HotelAvailabilityMeta,
      hotelSelectionState: props.hotelSelectionState,
    });
  });
  afterEach(() => vi.restoreAllMocks());

  it("chooses Metro directly from its card with the supplier CP rate and the correct group", async () => {
    const select = vi.spyOn(ItineraryService, "selectHotelIntent").mockRejectedValue(new Error("Supplier rate expired"));
    render(<HotelList {...fixture()} />);
    expect(screen.queryByRole("region", { name: "VSR/TBO hotel search details" })).toBeNull();
    const { table, row } = openSavedStay();
    const choose = await metroChoice();
    const metroRate = table.getByText("₹19,957.39");
    expect(metroRate).toBeVisible();
    expect(metroRate.parentElement).toHaveTextContent("Estimated stay total ₹19,957.39 · 8 rooms");
    expect(table.getByText("Executive Room")).toBeVisible();
    expect(table.getByText("Breakfast included")).toBeVisible();
    expect(table.queryByText(/VSR rates found/i)).toBeNull();
    expect(screen.queryByRole("button", { name: "Choose Partial Inventory" })).toBeNull();
    fireEvent.click(choose);
    const dialog = await rateDialog();
    expect(within(dialog).getByText("Price: ₹ 19957.39")).toBeVisible();
    expect(select).not.toHaveBeenCalled();
    fireEvent.click(within(dialog).getByRole("button", { name: "Confirm Update" }));
    await screen.findByText("Supplier rate expired");
    expect(select).toHaveBeenCalledExactlyOnceWith({
      planId, routeId, groupType: 1, selectionIntent: "ROOM_TYPE", provider: "tbo",
      hotelCode: "1141249", providerHotelCode: "1141249", hotelName: "Metro Plaza Hotel",
      roomType: "Executive Room", mealPlanCode: "CP", routeDate: date,
      expectedBatchFare: { amount: 19957.39, currency: "INR" },
    });
    expect(row).toHaveTextContent("The Ocean Pearl Inn Bejai");
    expect(choose).toBeEnabled();
  });

  it("keeps room-only acknowledgement and the real EP supplier code", async () => {
    const select = vi.spyOn(ItineraryService, "selectHotelIntent").mockRejectedValue(new Error("Fixture supplier unavailable"));
    const confirm = vi.spyOn(window, "confirm");
    vi.mocked(ItineraryService.previewHotelIntent).mockResolvedValue(liveFare(13917.46, inventory[1]));
    render(<HotelList {...fixture()} />);
    const { table } = openSavedStay();
    const choose = await screen.findByRole("button", { name: "Choose Hotel Citywalk Residency" });
    expect(table.getByText("₹13,917.46")).toBeVisible();
    expect(table.getByText("Room only")).toBeVisible();
    expect(table.queryByText(/With DVI meals|Rates found for all/i)).toBeNull();
    fireEvent.click(choose);
    let dialog = await rateDialog();
    expect(within(dialog).getByText("Room only. Breakfast is excluded.")).toBeVisible();
    fireEvent.click(within(dialog).getByText("Close", { selector: "button", exact: true }));
    await waitFor(() => expect(choose).toBeEnabled());
    expect(select).not.toHaveBeenCalled();
    fireEvent.click(choose);
    dialog = await rateDialog();
    fireEvent.click(within(dialog).getByRole("button", { name: "Confirm Update" }));
    await waitFor(() => expect(select).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({
      mealPlanCode: "EP", expectedBatchFare: { amount: 13917.46, currency: "INR" },
    })));
    expect(confirm).not.toHaveBeenCalled();
  });

  it("requires approval for a changed live fare and resubmits the reviewed amount", async () => {
    const changed = new ApiError("Fare changed", 409, {
      code: "TBO_BATCH_CARD_FARE_CHANGED", amount: 21083.69, currency: "INR",
    });
    const select = vi.spyOn(ItineraryService, "selectHotelIntent")
      .mockRejectedValueOnce(changed)
      .mockResolvedValueOnce({
        status: "AVAILABLE", affectedRouteIds: [routeId],
        selections: [{ routeId, roomType: "Executive Room", totalPrice: 21083.69 }],
      });
    const confirm = vi.spyOn(window, "confirm");
    const onHotelSelectionsChange = vi.fn();
    render(<HotelList {...fixture()} onHotelSelectionsChange={onHotelSelectionsChange} />);
    const { row } = openSavedStay();
    const choose = await metroChoice();
    fireEvent.click(choose);
    const initialReview = await rateDialog();
    fireEvent.click(within(initialReview).getByRole("button", { name: "Confirm Update" }));
    const changedFare = await screen.findByText("Price: ₹ 21083.69");
    expect(select).toHaveBeenCalledTimes(1);
    expect(row).toHaveTextContent("The Ocean Pearl Inn Bejai");
    expect(onHotelSelectionsChange.mock.calls.some(([selection]) => selection[routeId]?.provider === "tbo")).toBe(false);
    expect(changedFare).toBeVisible();
    fireEvent.click(within(await rateDialog()).getByRole("button", { name: "Confirm Update" }));
    await waitFor(() => expect(onHotelSelectionsChange).toHaveBeenCalledWith(
      expect.objectContaining({ [routeId]: expect.objectContaining({ provider: "tbo", totalPrice: 21083.69 }) }),
      undefined,
    ));
    expect(confirm).not.toHaveBeenCalled();
    expect(select).toHaveBeenLastCalledWith(expect.objectContaining({
      expectedBatchFare: { amount: 21083.69, currency: "INR" },
    }));
  });

  it("offers a VSR replacement for a saved VSR stay and reviews the increase", async () => {
    const props = fixture("USER_SELECTED");
    const citywalk: ItineraryHotelRow = { ...inventory[1],
      groupType: 1, mealPlan: "EP", totalHotelCost: 13917.46, pricePerNight: 1739.68,
      isSelected: true, selectionOrigin: "USER_SELECTED" as const, isSelectable: true, isBookable: true,
      hotelStayCompleteStayBookable: true, availabilityStatus: "AVAILABLE" as const,
      availabilityMessage: undefined,
    };
    props.hotels = [citywalk, ...inventory];
    const state = props.hotelSelectionState![0].routes[0];
    state.selected = { ...state.selected!, provider: "tbo", hotelCode: citywalk.hotelCode!, hotelName: citywalk.hotelName,
      roomType: citywalk.roomType!, mealPlan: "EP", pricePerNight: 1739.68, totalPrice: 13917.46 };
    const select = vi.spyOn(ItineraryService, "selectHotelIntent");
    render(<HotelList {...props} />);
    const { table, row } = openSavedStay();
    expect(row).toHaveTextContent("Hotel Citywalk Residency");
    const choose = await metroChoice();
    expect(choose).toBeEnabled();
    expect(table.queryByText(/Verify the complete stay before choosing/i)).toBeNull();
    fireEvent.click(choose);
    const dialog = within(await rateDialog());
    expect(dialog.getByText("Current").parentElement).toHaveTextContent("Hotel: Hotel Citywalk Residency");
    expect(dialog.getByText("Price: ₹ 13917.46")).toBeVisible();
    expect(dialog.getByText("New").parentElement).toHaveTextContent("Hotel: Metro Plaza Hotel");
    expect(dialog.getByText("Price: ₹ 19957.39")).toBeVisible();
    expect(dialog.getByText("Difference: Increase by ₹ 6039.93")).toBeVisible();
    fireEvent.click(dialog.getByText("Close", { selector: "button", exact: true }));
    await waitFor(() => expect(choose).toBeEnabled());
    expect(select).not.toHaveBeenCalled();
  });

  it.each([
    [2, 50000, "Difference: Increase by ₹ 5480.00"],
    [6, 42000, "Difference: Decrease by ₹ 2520.00"],
  ])("keeps the standard modification popup for %i rooms", async (roomCount, amount, difference) => {
    const props = fixture();
    props.roomCount = roomCount;
    const candidate = { ...inventory[0], noOfRooms: roomCount, tboRoomBatches: undefined, batchSupplierQuote: null,
      availabilityStatus: "AVAILABLE" as const, isSelectable: true, isBookable: true, isLiveBookable: true,
      completeStayBookable: true, hotelStayCompleteStayBookable: true };
    props.hotels = [currentHotel, candidate];
    vi.mocked(ItineraryService.previewHotelIntent).mockResolvedValue(liveFare(amount, candidate));
    const select = vi.spyOn(ItineraryService, "selectHotelIntent");
    render(<HotelList {...props} />);
    const { table } = openSavedStay();
    const hotelHeading = await table.findByRole("heading", { name: "Metro Plaza Hotel", exact: true });
    const hotelCard = hotelHeading.closest<HTMLElement>(".bg-white.rounded-lg");
    expect(hotelCard).not.toBeNull();
    fireEvent.click(within(hotelCard!).getByRole("button", { name: "Choose", exact: true }));
    const dialog = within(await rateDialog());
    expect(dialog.getByText("Current").parentElement).toHaveTextContent("Hotel: The Ocean Pearl Inn Bejai");
    expect(dialog.getByText("New").parentElement).toHaveTextContent("Hotel: Metro Plaza Hotel");
    expect(dialog.getByText(difference)).toBeVisible();
    expect(select).not.toHaveBeenCalled();
  });

  it("keeps the current hotel when the live check cannot cover every night", async () => {
    vi.mocked(ItineraryService.previewHotelIntent).mockResolvedValue({
      ...liveFare(19957.39), affectedRouteIds: [routeId, routeId + 1],
    });
    const select = vi.spyOn(ItineraryService, "selectHotelIntent");
    render(<HotelList {...fixture()} />);
    const { row } = openSavedStay();
    fireEvent.click(await metroChoice());
    expect(await screen.findByText("Could not verify the hotel rate for every night of the stay.")).toBeVisible();
    expect(row).toHaveTextContent("The Ocean Pearl Inn Bejai");
    expect(select).not.toHaveBeenCalled();
  });

  it("opens the normal cards for a stay with no saved hotel or recommendation tab", async () => {
    render(<HotelList {...fixture(null)} />);
    fireEvent.click(screen.getByRole("button", { name: "View hotel options" }));
    expect(await metroChoice()).toBeEnabled();
  });

  it("keeps the replacement action disabled for a manually selected offline stay", async () => {
    render(<HotelList {...fixture("USER_SELECTED")} />);
    const { table } = openSavedStay();
    expect(await table.findByText("Breakfast included")).toBeVisible();
    expect(screen.queryByRole("button", { name: "Choose Metro Plaza Hotel" })).toBeNull();
  });
});
