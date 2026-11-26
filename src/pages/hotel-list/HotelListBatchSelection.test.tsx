import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import * as apiClient from "@/lib/api";
import { ApiError } from "@/lib/api";
import { HotelRoomSelectionModal } from "@/components/hotels/HotelRoomSelectionModal";
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
const rateDialog = () => screen.findByRole("dialog", { name: "Confirm Hotel Modification" });

function liveFare(amount: number, hotel: ItineraryHotelRow = inventory[0]) {
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

  it("shows and approves DVI meals on the normal split-room card", async () => {
    const props = fixture();
    const citywalk = { ...inventory[1], batchMealPlanQuotes: [
      { mealPlan: "EP", amount: 13917.46, currency: "INR", dviMealSupplement: 0 },
      { mealPlan: "CP", amount: 20317.46, currency: "INR", dviMealSupplement: 6400 },
      { mealPlan: "MAP", amount: 34717.46, currency: "INR", dviMealSupplement: 20800 },
    ] };
    props.hotels = props.hotels.map(hotel => hotel.hotelCode === citywalk.hotelCode ? citywalk : hotel);
    vi.mocked(ItineraryService.getPersistedHotelDetails).mockResolvedValue({
      hotelRatesVisible: true, hotels: props.hotels, hotelTabs: props.hotelTabs,
      hotelAvailability: props.hotelAvailability as HotelAvailabilityMeta, hotelSelectionState: props.hotelSelectionState,
    });
    const quote = liveFare(34717.46, citywalk);
    const preview = vi.mocked(ItineraryService.previewHotelIntent).mockResolvedValue({
      ...quote, selections: quote.selections.map(selection => ({
        ...selection, mealPlan: "MAP", supplierMealPlan: "EP", hotelMealPlanCost: 20800,
      })),
    });
    const select = vi.spyOn(ItineraryService, "selectHotelIntent").mockRejectedValue(new Error("Fixture fare expired"));
    render(<HotelList {...props} />);
    const { table } = openSavedStay();
    const choose = await table.findByRole("button", { name: "Choose Hotel Citywalk Residency" });
    expect(await table.findByText("₹20,317.46")).toBeVisible();
    expect(table.getByText(/DVI breakfast included/)).toBeVisible();
    fireEvent.click(table.getByRole("button", { name: "Edit meal plan for Hotel Citywalk Residency" }));
    fireEvent.change(table.getByRole("combobox", { name: "Meal plan for Hotel Citywalk Residency" }), { target: { value: "MAP" } });
    expect(table.getByText("₹34,717.46")).toBeVisible();
    fireEvent.click(choose);
    const dialog = within(await rateDialog());
    expect(preview).toHaveBeenCalledWith(expect.objectContaining({ mealPlanCode: "MAP" }));
    expect(dialog.getByText("Meal plan: MAP")).toBeVisible();
    expect(dialog.getByText("DVI meals included: ₹ 20800.00")).toBeVisible();
    expect(dialog.queryByText(/Breakfast is excluded/)).toBeNull();
    expect(select).not.toHaveBeenCalled();
    fireEvent.click(dialog.getByRole("button", { name: "Confirm Update" }));
    await waitFor(() => expect(select).toHaveBeenCalledWith(expect.objectContaining({
      mealPlanCode: "MAP", expectedBatchFare: { amount: 34717.46, currency: "INR" },
    })));
  });

  it("reopens the split meal choices for a hotel saved before the inventory was refreshed", async () => {
    const props = fixture("USER_SELECTED");
    const citywalk: ItineraryHotelRow = { ...inventory[1],
      groupType: 1, mealPlan: "CP", totalHotelCost: 20317.46, pricePerNight: 2539.68,
      isSelected: true, selectionOrigin: "USER_SELECTED", isSelectable: true, isBookable: true,
      hotelStayCompleteStayBookable: true, availabilityStatus: "AVAILABLE",
      tboRoomBatches: undefined, batchSupplierQuote: null,
    };
    props.hotels = [citywalk, inventory[0]];
    const state = props.hotelSelectionState![0].routes[0];
    state.selected = { ...state.selected!, provider: "tbo", hotelCode: citywalk.hotelCode!, hotelName: citywalk.hotelName,
      roomType: citywalk.roomType, mealPlan: "CP", pricePerNight: 2539.68, totalPrice: 20317.46 };
    props.onRefreshSelectedHotel = vi.fn().mockResolvedValue({ hotels: [{
      ...inventory[1], batchMealPlanQuotes: [
        { mealPlan: "EP", amount: 13917.46, currency: "INR", dviMealSupplement: 0 },
        { mealPlan: "CP", amount: 20317.46, currency: "INR", dviMealSupplement: 6400 },
        { mealPlan: "MAP", amount: 34717.46, currency: "INR", dviMealSupplement: 20800 },
      ],
    }] });
    const quote = liveFare(34717.46, citywalk);
    vi.mocked(ItineraryService.previewHotelIntent).mockResolvedValue({
      ...quote, selections: quote.selections.map(selection => ({
        ...selection, mealPlan: "MAP", supplierMealPlan: "EP", hotelMealPlanCost: 20800,
      })),
    });
    render(<HotelList {...props} />);
    const { table } = openSavedStay();
    fireEvent.click(await table.findByRole("button", { name: "Edit meal plan for Hotel Citywalk Residency" }));
    const editor = await table.findByRole("combobox", { name: "Meal plan for Hotel Citywalk Residency" });
    expect(editor).toHaveValue("CP");
    fireEvent.change(editor, { target: { value: "MAP" } });
    fireEvent.click(table.getByText("Update", { selector: "button" }));
    const dialog = within(await rateDialog());
    expect(dialog.getByText("Price: ₹ 20317.46")).toBeVisible();
    expect(dialog.getByText("Price: ₹ 34717.46")).toBeVisible();
    expect(dialog.getByText("DVI meals included: ₹ 20800.00")).toBeVisible();
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
    const hotelHeading = await table.findByRole("heading", { name: "Metro Plaza Hotel" });
    const hotelCard = hotelHeading.closest<HTMLElement>(".bg-white.rounded-lg");
    expect(hotelCard).not.toBeNull();
    fireEvent.click(within(hotelCard!).getByRole("button", { name: "Choose" }));
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
    expect(screen.queryByRole("button", { name: "View hotel options" })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: /Choose hotel for Day 1/ }));
    expect(await metroChoice()).toBeEnabled();
  });

  it.each([true, false])("keeps both property types manually selectable with houseboat preference %s", async (preference) => {
    const props = fixture();
    const savedHotel = { ...currentHotel, provider: "tbo" };
    const houseboat = {
      ...offer("1141250", "Alleppey Houseboat", "Deluxe Cabin", "AP", 19800),
      mealPlan: "AP",
      houseboatOnly: true,
      batchMealPlanQuotes: [{ mealPlan: "AP", amount: 19800, currency: "INR", dviMealSupplement: 0 }],
    };
    props.hotels = [savedHotel, ...inventory, houseboat];
    props.hotelAvailability = { ...props.hotelAvailability!, houseboatPreferences: { [routeId]: preference } };
    props.hotelSelectionState![0].routes[0].selected!.provider = "tbo";
    vi.mocked(ItineraryService.getPersistedHotelDetails).mockResolvedValue({
      hotelRatesVisible: true, hotels: props.hotels, hotelTabs: props.hotelTabs,
      hotelAvailability: props.hotelAvailability, hotelSelectionState: props.hotelSelectionState,
    });

    render(<HotelList {...props} />);
    const { table, row } = openSavedStay();
    expect(await table.findByRole("heading", { name: "Alleppey Houseboat" })).toBeVisible();
    expect(row).toHaveTextContent(savedHotel.hotelName);
    expect(table.getByRole("button", { name: "Choose Metro Plaza Hotel" })).toBeEnabled();
    expect(table.getByRole("button", { name: "Choose Alleppey Houseboat" })).toBeEnabled();
  });

  it("opens the normal Udupi cards and assigned room categories in draft Recommended #2", async () => {
    const props = fixture(null);
    const udupiRoutes = [
      { routeId: routeId + 1, dayNumber: 2, date: "2026-11-26", destination: "Udupi" },
      { routeId: routeId + 2, dayNumber: 3, date: "2026-11-27", destination: "Udupi" },
    ];
    const roomTypes = ["Superior King", "Deluxe Twin"];
    const fortune = offer("6437125", "Fortune Plaza Hotel", roomTypes.join(" + "), "CP", 74236.36);
    const udupiInventory = udupiRoutes.map((route) => ({
      ...fortune, itineraryRouteId: route.routeId, date: route.date, day: `Day ${route.dayNumber}`,
      destination: route.destination, checkInDate: "2026-11-26", checkOutDate: "2026-11-28",
      tboRoomBatches: fortune.tboRoomBatches!.map((batch, index) => ({ ...batch, roomType: roomTypes[index] })),
    }));
    props.hotels = [...inventory, ...udupiInventory];
    props.hotelAvailability = {
      ...props.hotelAvailability!,
      totalSearchRoutes: 3,
      stayRoutes: [...props.hotelAvailability!.stayRoutes!, ...udupiRoutes],
    };
    const getInventory = vi.mocked(ItineraryService.getPersistedHotelDetails);
    getInventory.mockResolvedValue({
      hotelRatesVisible: true, hotels: props.hotels, hotelTabs: [], hotelAvailability: props.hotelAvailability,
      hotelSelectionState: [],
    });
    const preview = vi.mocked(ItineraryService.previewHotelIntent)
      .mockRejectedValueOnce(new Error("Supplier rate could not be verified"));
    const select = vi.spyOn(ItineraryService, "selectHotelIntent");
    render(<HotelList {...props} />);
    const tab = screen.getByRole("tab", { name: /Recommended #2/ });
    fireEvent.click(tab);
    expect(tab).toHaveAttribute("aria-selected", "true");
    const table = within(screen.getByRole("table"));
    const open = table.getByRole("button", { name: /Choose hotel for Day 2/ });
    fireEvent.click(open);
    const title = await table.findByRole("heading", { name: "Fortune Plaza Hotel" });
    const card = within(title.closest<HTMLElement>(".bg-white.rounded-lg")!);
    const choose = card.getByRole("button", { name: "Choose Fortune Plaza Hotel" });
    expect(choose).toBeEnabled();
    fireEvent.click(card.getByRole("button", { name: "View room categories" }));
    const dialog = within(await screen.findByRole("dialog", { name: "Choose Room Category" }));
    expect(dialog.getAllByRole("combobox").map((category) => category.textContent)).toEqual([
      ...Array(6).fill(roomTypes[0]), ...Array(2).fill(roomTypes[1]),
    ]);
    fireEvent.click(dialog.getByText("Close", { selector: "button" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    fireEvent.click(choose);
    expect(await card.findByText("Supplier rate could not be verified")).toBeVisible();
    expect(preview).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({
      groupType: 2, routeId: routeId + 1, routeDate: "2026-11-26", hotelCode: "6437125",
    }));
    expect(select).not.toHaveBeenCalled();
  });

  it("refreshes an open card list and prefills the existing room category dialog from the new inventory", async () => {
    const api = vi.spyOn(apiClient, "api");
    const props = fixture();
    const candidate = offer("6437125", "Fortune Plaza Hotel", "Superior King + Deluxe Twin", "CP", 74236.36);
    const mixed = {
      ...candidate,
      tboRoomBatches: (candidate.tboRoomBatches as Array<Record<string, unknown>>).map((batch, index) => ({
        ...batch, roomType: index === 0 ? "Superior King" : "Deluxe Twin",
      })),
    };
    const { rerender } = render(<HotelList {...props} />);
    const { table, row } = openSavedStay();
    expect(await metroChoice()).toBeVisible();
    expect(table.queryByRole("heading", { name: "Fortune Plaza Hotel" })).toBeNull();
    const getInventory = vi.mocked(ItineraryService.getPersistedHotelDetails);
    const priorRequests = getInventory.mock.calls.length;
    getInventory.mockImplementation(async (_quote, _page, size) => ({
      hotelRatesVisible: true, hotels: size === 20 ? [mixed] : [currentHotel],
      hotelTabs: props.hotelTabs, hotelSelectionState: props.hotelSelectionState,
    }));
    rerender(<HotelList {...props} hotels={[currentHotel]} hotelAvailability={{
      ...props.hotelAvailability!, searchRunId: "fresh-split-search", inventorySearchRunId: "fresh-split-search",
    }} />);
    const title = await table.findByRole("heading", { name: "Fortune Plaza Hotel" });
    expect(getInventory.mock.calls.slice(priorRequests).filter(([, , size]) => size === 20))
      .toEqual([["DVI20261156", 1, 20, 1, routeId]]);
    expect(table.queryByRole("heading", { name: "Metro Plaza Hotel" })).toBeNull();
    expect(row).toHaveTextContent("The Ocean Pearl Inn Bejai");
    const card = within(title.closest<HTMLElement>(".bg-white.rounded-lg")!);
    expect(card.getByText(/6 Rooms Superior King.*2 Rooms Deluxe Twin/)).toBeVisible();
    expect(card.getByRole("button", { name: "Choose Fortune Plaza Hotel" })).toBeEnabled();
    for (let attempt = 0; attempt < 2; attempt++) {
      fireEvent.click(card.getByRole("button", { name: "View room categories" }));
      const dialog = within(await screen.findByRole("dialog", { name: "Choose Room Category" }));
      const categories = dialog.getAllByRole("combobox");
      expect(categories.map((category) => category.textContent)).toEqual([
        ...Array(6).fill("Superior King"), ...Array(2).fill("Deluxe Twin"),
      ]);
      expect(categories.every((category) => category.hasAttribute("disabled"))).toBe(true);
      expect(dialog.queryByRole("button", { name: "Confirm" })).toBeNull();
      fireEvent.click(dialog.getByText("Close", { selector: "button" }));
      await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    }
    expect(api.mock.calls.filter(([path]) => path.startsWith("itineraries/hotel-rooms/"))).toEqual([]);
  });

  it("keeps manually chosen room categories editable and saves their original IDs", async () => {
    const roomTypes = [
      { room_type_id: 10, room_type_title: "Deluxe" },
      { room_type_id: 20, room_type_title: "Suite" },
    ];
    const api = vi.spyOn(apiClient, "api").mockResolvedValueOnce({
      preferred_room_count: 2,
      rooms: roomTypes.map((roomType, index) => ({
        ...roomType, room_number: index + 1, room_qty: 1, available_room_types: roomTypes,
      })),
    }).mockResolvedValueOnce({});
    render(<HotelRoomSelectionModal open onOpenChange={vi.fn()} itinerary_plan_hotel_details_ID={1}
      itinerary_plan_id={planId} itinerary_route_id={routeId} hotel_id={909} group_type={1}
      hotel_name="The Ocean Pearl Inn Bejai" />);
    const dialog = within(await screen.findByRole("dialog", { name: "Choose Room Category" }));
    const categories = await dialog.findAllByRole("combobox");
    expect(categories.map((category) => category.textContent)).toEqual(["Deluxe", "Suite"]);
    categories.forEach((category) => expect(category).toBeEnabled());
    fireEvent.click(dialog.getByRole("button", { name: "Confirm" }));
    await waitFor(() => expect(api).toHaveBeenCalledTimes(2));
    expect(api.mock.calls[1][0]).toBe("itineraries/hotel-rooms/update-categories");
    expect(JSON.parse(String(api.mock.calls[1][1]?.body)).rooms).toEqual([
      { itinerary_plan_hotel_room_details_ID: 0, room_number: 1, room_type_id: 10, room_qty: 1 },
      { itinerary_plan_hotel_room_details_ID: 0, room_number: 2, room_type_id: 20, room_qty: 1 },
    ]);
  });

  it("reopens and refreshes a saved split assignment without a parent rate ID", async () => {
    const props = fixture("USER_SELECTED");
    const roomType = "Superior King + Deluxe Twin";
    const hotelCode = "6437125";
    const batches = [
      { roomType: "Superior King", roomCount: 6 },
      { roomType: "Deluxe Twin", roomCount: 2 },
    ].map((batch, batchIndex) => ({
      ...batch, batchIndex, startRoomIndex: batchIndex * 6,
      hotelCode, mealPlan: "CP", currency: "INR", isRefundable: false,
      bookingCode: hotelCode + "!TB!fixture" + batchIndex,
      supplierNetAmount: 2000 * batch.roomCount, supplierTotalFare: 2000 * batch.roomCount,
      occupancies: Array.from({ length: batch.roomCount }, () => ({ adults: 2, children: 0, childrenAges: [] })),
    }));
    const savedStay = {
      schemaVersion: 1, provider: "tbo", roomCount: 8, mealPlan: "CP",
      roomType, hotelCode, currency: "INR", isRefundable: false,
      anchorRouteId: routeId, routeIds: [routeId], checkInDate: date, checkOutDate: "2026-11-26",
      supplierNetAmount: 16000, supplierTotalFare: 16000,
      batches,
      dviMealSupplement: { mealPlan: "MAP", breakfastRate: 0, breakfastPerNight: 0, dinnerRate: 900, dinnerPerNight: 14400 },
    };
    const fortune = {
      ...currentHotel, provider: "tbo", hotelCode, hotelId: 0,
      hotelName: "Fortune Plaza Hotel", roomType, mealPlan: "MAP",
    } as ItineraryHotelRow;
    props.hotels = [fortune];
    const state = props.hotelSelectionState![0].routes[0];
    const selected = {
      ...state.selected!, canonicalHotelId: null,
      provider: "tbo", hotelCode: fortune.hotelCode!, providerHotelCode: fortune.hotelCode,
      rateOptionId: null,
      hotelName: fortune.hotelName, roomType, mealPlan: "MAP", selectedPriceSnapshot: null,
      tboMultiBatchStay: savedStay,
    };
    state.selected = selected;
    const refreshedFare = liveFare(60000, fortune);
    const preview = vi.mocked(ItineraryService.previewHotelIntent).mockResolvedValue({
      ...refreshedFare,
      selections: [{
        ...refreshedFare.selections[0], selectedRateOptionId: undefined,
        mealPlan: "MAP", hotelMealPlanCost: 24000,
      }],
    });
    const save = vi.spyOn(ItineraryService, "selectHotelIntent").mockRejectedValue(new Error("Supplier rate expired"));
    render(<HotelList {...props} allowSelectedRateRefresh />);
    const row = await within(document.querySelector<HTMLElement>('table[data-group-type="1"]')!).findByTestId("hotel-row");
    expect(row).toHaveTextContent(/Fortune Plaza Hotel.*6 Rooms Superior King\s*2 Rooms Deluxe Twin/);
    fireEvent.focus(within(row).getByLabelText("Show hotel price breakdown"));
    const meals = within(screen.getByLabelText("VSR meal breakdown by room group"));
    expect(meals.getByText("6 × Superior King · 12 guests")).toBeVisible();
    expect(meals.getByText("2 × Deluxe Twin · 4 guests")).toBeVisible();
    expect(meals.getAllByText("Breakfast included by VSR · Dinner added by DVI")).toHaveLength(2);
    fireEvent.click(within(row).getByRole("button", { name: "Refresh rate for Fortune Plaza Hotel" }));
    const rateReview = within(await rateDialog());
    expect(preview).toHaveBeenCalledWith(expect.objectContaining({
      planId, routeId, groupType: 1, selectionIntent: "ROOM_TYPE", hotelCode, roomType, mealPlanCode: "MAP",
    }));
    expect(rateReview.getByText("Price: ₹ 60000.00")).toBeVisible();
    expect(save).not.toHaveBeenCalled();
    fireEvent.click(rateReview.getByRole("button", { name: "Confirm Update" }));
    await waitFor(() => expect(save).toHaveBeenCalledWith(expect.objectContaining({
      expectedBatchFare: { amount: 60000, currency: "INR" },
    })));
    await waitFor(() => expect(screen.queryByRole("dialog", { name: "Confirm Hotel Modification" })).toBeNull());
    const editor = within(row).getByRole("button", { name: /View room categories for Day 1/ });
    fireEvent.click(editor);
    const dialog = within(await screen.findByRole("dialog", { name: "Choose Room Category" }));
    expect(dialog.getAllByRole("combobox").map((category) => category.textContent)).toEqual([
      ...Array(6).fill("Superior King"), ...Array(2).fill("Deluxe Twin"),
    ]);
  });

  it("keeps the replacement action disabled for a manually selected offline stay", async () => {
    render(<HotelList {...fixture("USER_SELECTED")} />);
    const { table } = openSavedStay();
    expect(await table.findByText("Breakfast included")).toBeVisible();
    expect(screen.queryByRole("button", { name: "Choose Metro Plaza Hotel" })).toBeNull();
  });
});
