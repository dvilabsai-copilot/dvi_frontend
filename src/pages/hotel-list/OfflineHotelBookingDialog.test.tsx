import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { toast } from "sonner";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { USER_ROLES } from "@/constants/systemRoles";
import { ItineraryService } from "@/services/itinerary";
import { HotelList } from "../HotelList";
import type { ItineraryHotelRow } from "../itinerary-details/itinerary-details.types";
import { getOfflineBookingStays, offlineBookingKey, offlineHotelBookingApi, retainExistingBookingRanges, type SavedOfflineBooking } from "./offlineHotelBooking";
import { OfflineHotelBookingDialog } from "./OfflineHotelBookingDialog";

function stay(overrides: Partial<ItineraryHotelRow> = {}): ItineraryHotelRow {
  return {
    groupType: 1, itineraryRouteId: 10, day: "Day 1", date: "2027-01-10", destination: "Munnar",
    hotelId: 123, hotelName: "Tea Castle", hotelCode: "123", category: 3, provider: "offline",
    roomType: "Executive Room", mealPlan: "MAP", totalHotelCost: 6800, totalHotelTaxAmount: 0,
    isSelected: true, selectionId: 1,
    ...overrides,
  };
}

const hotels = [
  stay(),
  stay({ itineraryRouteId: 11, day: "Day 2", date: "2027-01-11", selectionId: 2 }),
  stay({ itineraryRouteId: 12, day: "Day 3", date: "2027-01-12", hotelId: 0, hotelCode: "VSR_52", provider: "tbo", hotelName: "Cloud Valley", selectionId: 3 }),
  stay({ groupType: 2, hotelId: 222, hotelCode: "222", hotelName: "Lake Lodge", selectionId: 4 }),
];
const tabs = [1, 2, 3].map((groupType) => ({ groupType, label: `Recommended #${groupType}`, totalAmount: 6800 }));

function setRole(role: number) {
  localStorage.setItem("accessToken", `fixture.${btoa(JSON.stringify({ role, staffId: 50 }))}.test`);
}

function renderHotelList() {
  return render(<HotelList hotels={hotels} restrictedHotels={[]} hotelTabs={tabs} hotelRatesVisible quoteId="TEST-BOOKING" planId={42} />);
}

const bookingButton = () => screen.getByRole("button", { name: "Offline Booking" });
const waitForBookingToClose = () => waitFor(() =>
  expect(screen.queryByRole("dialog", { name: "Hotel Stays" })).not.toBeInTheDocument());

describe("Offline Booking from the Hotel List", () => {
  beforeEach(() => {
    vi.spyOn(ItineraryService, "getDetails").mockResolvedValue({});
    vi.spyOn(offlineHotelBookingApi, "roomCategories").mockResolvedValue(["Deluxe Double Room"]);
    vi.spyOn(offlineHotelBookingApi, "defaults").mockResolvedValue({
      confirmedBy: "Assigned Travel Expert",
      contacts: {
        "offline:123": { emails: ["reservations@tea-castle.example"], phone: "9876543100" },
        "tbo:vsr_52": { emails: ["booking@cloud-valley.example"], phone: "9876543200" },
      },
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    localStorage.removeItem("accessToken");
  });

  it("shows the saved continuous stay and its exact nightly prices with sparse or expanded table rows", async () => {
    const dates = ["2026-12-14", "2026-12-15", "2026-12-16", "2026-12-17"];
    const routeIds = [10, 11, 12, 13];
    const rates = [2063.11, 2063.10, 2063.10, 2063.10];
    const hotelName = "Hotel Ramakrishna";
    const savedRoutes = dates.map((routeDate, index) => ({
      routeId: routeIds[index], routeDate, selectionStatus: "SELECTED" as const,
      selected: {
        provider: "tbo", canonicalHotelId: null, providerHotelCode: "1089692", hotelCode: "1089692",
        hotelName, roomType: "Compact A/C Room,1 Double Bed", mealPlan: "CP", roomCount: 1,
        selectionKey: null, rateOptionId: null, supplierBookingCode: null, selectedPriceSnapshot: null,
        pricePerNight: rates[index], totalPrice: rates[index], roomRate: rates[index],
        authoritativeParentRouteId: 10, authoritativeRouteIds: routeIds,
        authoritativeCheckInDate: dates[0], authoritativeCheckOutDate: "2026-12-18",
      },
    }));
    const expanded = dates.map((date, i) => stay({
      date, itineraryRouteId: routeIds[i], hotelName, provider: "tbo", hotelCode: "1089692", hotelId: 0,
    }));
    const destinations = { 10: "Mahabalipuram" };
    const [fullStay] = getOfflineBookingStays(expanded, 1, savedRoutes, destinations);
    vi.spyOn(offlineHotelBookingApi, "list")
      .mockResolvedValueOnce([])
      .mockResolvedValue([{ ...fullStay, version: 1, details: fullStay.defaults }]);
    const save = vi.spyOn(offlineHotelBookingApi, "save").mockImplementation(async (_, __, booking) =>
      ({ ...booking, version: booking.version + 1 }));
    const preview = vi.spyOn(offlineHotelBookingApi, "previewVoucher");
    const user = userEvent.setup();
    for (const rows of [expanded.slice(0, 1), expanded]) {
      let finishPreview!: (voucher: { subject: string; html: string }) => void;
      preview.mockReturnValueOnce(new Promise(resolve => { finishPreview = resolve; }));
      const beforeClick = preview.mock.calls.length;
      const view = render(<OfflineHotelBookingDialog planId={42} groupType={1} rows={rows} savedRoutes={savedRoutes}
        destinations={destinations} roomCount={1} groupChanging={false} />);
      await user.click(bookingButton());
      const dialog = within(await screen.findByRole("dialog", { name: "Hotel Stays" }));
      expect(dialog.getByText("Recommended #1 · 1 stay")).toBeVisible();
      expect(await dialog.findByRole("button", { name: /Hotel Ramakrishna.*14 Dec 2026.*18 Dec 2026/ })).toBeVisible();
      const rooms = within(dialog.getByRole("region", { name: "Room category details" }));
      const category = rooms.getByRole("combobox", { name: "Room category", exact: true });
      expect(category).toHaveValue("Compact A/C Room,1 Double Bed");
      expect(await within(category).findByRole("option", { name: "Deluxe Double Room" })).toBeInTheDocument();
      expect(rooms.queryByText(/Dec 2026/)).not.toBeInTheDocument();
      const displayedRate = "₹2,063.10 – ₹2,063.11";
      expect(rooms.getByText(displayedRate)).toBeVisible();
      expect(rooms.getByLabelText("Rate / room / night")).toHaveAccessibleDescription(displayedRate);
      await user.click(dialog.getByRole("button", { name: "Preview Voucher" }));
      const voucherDialog = within(await screen.findByRole("dialog", { name: "Preview Voucher" }));
      expect(voucherDialog.getByRole("status")).toHaveTextContent("Loading voucher");
      expect(preview).toHaveBeenCalledTimes(beforeClick + 1);
      expect(preview).toHaveBeenLastCalledWith(42, 1, "hotel-voucher", expect.objectContaining({
        checkIn: dates[0], checkOut: "2026-12-18", destination: "Mahabalipuram",
      }), expect.objectContaining({
        rooms: dates.map((nightDate, i) => expect.objectContaining({ nightDate, rate: rates[i], quantity: 1 })),
      }));
      finishPreview({ subject: "Hotel Voucher", html: "<h1>Voucher</h1>" });
      expect(await voucherDialog.findByTitle("Hotel voucher email")).toHaveAttribute("srcdoc", "<h1>Voucher</h1>");
      await user.click(voucherDialog.getByRole("button", { name: "Close" }));
      await user.selectOptions(category, "Deluxe Double Room");
      await user.click(dialog.getByRole("button", { name: "Save Booking" }));
      await waitForBookingToClose();
      expect(save).toHaveBeenLastCalledWith(42, 1, expect.objectContaining({
        checkIn: dates[0], checkOut: "2026-12-18",
        details: expect.objectContaining({
          rooms: dates.map((nightDate, i) => expect.objectContaining({
            nightDate, rate: rates[i], category: "Deluxe Double Room",
          })),
        }),
      }));
      view.unmount();
    }
    const existingFirstNight = { ...fullStay, checkOut: dates[1], version: 2, details: fullStay.defaults };
    const split = retainExistingBookingRanges([fullStay], [existingFirstNight]);
    expect(split.map(entry => [entry.routeId, entry.checkIn, entry.checkOut])).toEqual([
      [10, dates[0], dates[1]], [11, dates[1], "2026-12-18"],
    ]);
    expect(split[1].defaults.rooms.map(room => room.nightDate)).toEqual(dates.slice(1));
  });

  it("closes after a successful save and restores the saved stay after remount", async () => {
    setRole(USER_ROLES.ADMIN);
    const savedByGroup: Record<number, SavedOfflineBooking[]> = {};
    const list = vi.spyOn(offlineHotelBookingApi, "list").mockImplementation(async (_, group) => savedByGroup[group] ?? []);
    const save = vi.spyOn(offlineHotelBookingApi, "save").mockImplementation(async (_, group, details) => {
      const saved = { ...details, version: details.version + 1 };
      savedByGroup[group] = [saved];
      return saved;
    });
    const notifySaved = vi.spyOn(toast, "success");
    const user = userEvent.setup();
    const view = renderHotelList();
    await user.click(bookingButton());
    let dialog = within(await screen.findByRole("dialog", { name: "Hotel Stays" }));
    expect(dialog.getByText("Recommended #1 · 2 stays")).toBeVisible();
    expect(await dialog.findByRole("button", { name: /Tea Castle.*10 Jan 2027.*12 Jan 2027/ })).toBeVisible();
    expect(dialog.getByLabelText("Email ID")).toHaveValue("reservations@tea-castle.example");
    expect(dialog.getByLabelText("Mobile number")).toHaveValue("9876543100");
    expect(dialog.getByLabelText("Confirmed by")).toHaveValue("Assigned Travel Expert");
    expect(dialog.queryByRole("button", { name: /Lake Lodge/ })).toBeNull();
    await user.click(dialog.getByRole("button", { name: /Cloud Valley/ }));
    const editor = within(dialog.getByRole("form", { name: "Booking details for Cloud Valley" }));
    expect(editor.getByLabelText("Confirmed by")).toHaveValue("Assigned Travel Expert");
    expect(editor.getByLabelText("Email ID")).toHaveValue("booking@cloud-valley.example");
    fireEvent.change(editor.getByLabelText("Confirmed by"), { target: { value: "Nandini" } });
    fireEvent.change(editor.getByLabelText("Email ID"), { target: { value: "contact@example.com" } });
    fireEvent.change(editor.getByLabelText("Mobile number"), { target: { value: "9876543210" } });
    await user.selectOptions(editor.getByLabelText("Status"), "confirmed");
    fireEvent.change(editor.getByLabelText("Rate / room / night"), { target: { value: "4500" } });
    await user.click(editor.getByRole("button", { name: "Add Policy Row" }));
    fireEvent.change(editor.getByLabelText("Before date"), { target: { value: "2027-01-09" } });
    fireEvent.change(editor.getByLabelText("Cancellation %"), { target: { value: "50" } });
    await user.click(editor.getByRole("button", { name: "Save Booking" }));
    await waitForBookingToClose();
    expect(notifySaved).toHaveBeenCalledWith("Booking details saved.");
    expect(save).toHaveBeenCalledWith(42, 1, expect.objectContaining({
      hotelKey: "tbo:vsr_52", routeId: 12, checkIn: "2027-01-12", checkOut: "2027-01-13", version: 0,
      details: expect.objectContaining({
        status: "confirmed",
        rooms: [expect.objectContaining({ rate: 4500 })],
        cancellationPolicies: [{ beforeDate: "2027-01-09", percentage: 50 }],
      }),
    }));
    expect(bookingButton()).toHaveFocus();
    view.unmount();

    renderHotelList();
    await user.click(bookingButton());
    dialog = within(await screen.findByRole("dialog", { name: "Hotel Stays" }));
    await user.selectOptions(dialog.getByLabelText("Filter by status"), "confirmed");
    expect(await dialog.findByRole("button", { name: /Cloud Valley.*Confirmed/ })).toBeVisible();
    expect(dialog.queryByRole("button", { name: /Tea Castle/ })).toBeNull();
    await user.click(dialog.getByRole("button", { name: /Cloud Valley/ }));
    expect(dialog.getByLabelText("Confirmed by")).toHaveValue("Nandini");
    expect(dialog.getByLabelText("Email ID")).toHaveValue("contact@example.com");
    expect(dialog.getByLabelText("Rate / room / night")).toHaveValue(4500);
    expect(dialog.getByLabelText("Cancellation %")).toHaveValue(50);
    await user.click(dialog.getByRole("button", { name: "Save Booking" }));
    await waitForBookingToClose();
    expect(save).toHaveBeenLastCalledWith(42, 1, expect.objectContaining({ version: 1 }));

    const secondGroup = screen.getByRole("tab", { name: /Recommended #2/ });
    await user.click(secondGroup);
    await waitFor(() => expect(secondGroup).toHaveAttribute("aria-selected", "true"), { timeout: 5000 });
    await user.click(bookingButton());
    dialog = within(await screen.findByRole("dialog", { name: "Hotel Stays" }));
    expect(await dialog.findByRole("button", { name: /Lake Lodge/ })).toBeVisible();
    expect(dialog.getByLabelText("Email ID")).toHaveValue("");
    expect(dialog.queryByRole("button", { name: /Cloud Valley/ })).toBeNull();
    expect(list).toHaveBeenLastCalledWith(42, 2, expect.any(AbortSignal));
  }, 15000);

  it("allows Travel Experts to reopen after errors and keeps unsaved inputs when a save fails", async () => {
    setRole(USER_ROLES.TRAVEL_EXPERT);
    const list = vi.spyOn(offlineHotelBookingApi, "list")
      .mockRejectedValueOnce(new Error("Saved details are temporarily unavailable"))
      .mockResolvedValue([]);
    const save = vi.spyOn(offlineHotelBookingApi, "save").mockRejectedValue(new Error("This stay was updated."));
    const user = userEvent.setup();
    renderHotelList();
    await user.click(bookingButton());
    const dialog = within(await screen.findByRole("dialog", { name: "Hotel Stays" }));
    expect(await dialog.findByRole("alert")).toHaveTextContent("Saved details are temporarily unavailable");
    await user.click(dialog.getByRole("button", { name: "Retry" }));
    fireEvent.change(await dialog.findByLabelText("Confirmed by"), { target: { value: "Nandini" } });
    fireEvent.change(dialog.getByLabelText("Mobile number"), { target: { value: "" } });
    await user.selectOptions(dialog.getByLabelText("Status"), "confirmed");
    await user.click(dialog.getByRole("button", { name: "Save Booking" }));
    expect(save).not.toHaveBeenCalled();
    await user.selectOptions(dialog.getByLabelText("Status"), "pending");
    await user.click(dialog.getByRole("button", { name: "Save Booking" }));
    expect(await dialog.findByRole("alert")).toHaveTextContent("This stay was updated.");
    expect(screen.getByRole("dialog", { name: "Hotel Stays" })).toBeVisible();
    expect(dialog.getByLabelText("Confirmed by")).toHaveValue("Nandini");
    expect(list).toHaveBeenCalledTimes(2);
  });

  it("shows an empty recommendation for eligible users and hides the action for agents", async () => {
    const list = vi.spyOn(offlineHotelBookingApi, "list");
    setRole(USER_ROLES.AGENT);
    const agentView = renderHotelList();
    expect(screen.queryByRole("button", { name: "Offline Booking" })).toBeNull();
    expect(screen.queryByText("Live and offline hotels are shown together")).toBeNull();
    agentView.unmount();

    setRole(USER_ROLES.TRAVEL_EXPERT);
    const user = userEvent.setup();
    renderHotelList();
    const emptyGroup = screen.getByRole("tab", { name: /Recommended #3/ });
    await user.click(emptyGroup);
    await waitFor(() => expect(emptyGroup).toHaveAttribute("aria-selected", "true"), { timeout: 5000 });
    await user.click(bookingButton());
    expect(await screen.findByText("There are no hotel stays in this recommendation.")).toBeVisible();
    expect(list).not.toHaveBeenCalled();
  });

  it("previews and sends a saved voucher without changing the booking status", async () => {
    setRole(USER_ROLES.ADMIN);
    const booking: SavedOfflineBooking = {
      routeId: 10, hotelKey: "offline:123", checkIn: "2027-01-10", checkOut: "2027-01-12", version: 1,
      details: { confirmedBy: "Aparna", emails: ["booking@example.com"], phone: "", status: "pending", rooms: [], cancellationPolicies: [] },
    };
    vi.spyOn(offlineHotelBookingApi, "list").mockResolvedValue([booking]);
    const preview = vi.spyOn(offlineHotelBookingApi, "previewVoucher").mockResolvedValue({
      subject: "DVi Travel | Hotel Voucher", html: "<h1>Voucher</h1>",
    });
    const key = JSON.stringify([10, "offline:123", "2027-01-10", "2027-01-12"]);
    const send = vi.spyOn(offlineHotelBookingApi, "sendVouchers").mockResolvedValue({ results: [{ key, status: "sent" }] });
    const save = vi.spyOn(offlineHotelBookingApi, "save");
    const user = userEvent.setup();
    renderHotelList();
    await user.click(bookingButton());
    const dialog = within(await screen.findByRole("dialog", { name: "Hotel Stays" }));
    const actions = within(await dialog.findByRole("region", { name: "Email Actions" }));
    const statuses = ["Awaiting", "Waitinglist", "Blocked", "Confirmed", "Sold Out", "Cancelled"];
    const filter = dialog.getByRole("combobox", { name: "Filter by status" });
    expect(within(filter).getAllByRole("option").map((option) => option.textContent)).toEqual(["All Statuses", ...statuses]);
    const status = dialog.getByRole("combobox", { name: "Status" });
    expect(within(status).getAllByRole("option").map((option) => option.textContent)).toEqual(statuses);
    await user.selectOptions(filter, "blocked");
    expect(dialog.queryByRole("button", { name: /Tea Castle.*Awaiting/ })).not.toBeInTheDocument();
    await user.selectOptions(filter, "pending");
    expect(dialog.getByRole("button", { name: /Tea Castle.*Awaiting/ })).toBeVisible();
    expect(dialog.getByRole("button", { name: /Cloud Valley.*Awaiting/ })).toBeVisible();
    expect(actions.getByLabelText("Email Template")).toHaveValue("hotel-voucher");
    expect(actions.getByRole("button", { name: "Send to Selected (0)" })).toBeDisabled();
    await user.click(actions.getByRole("button", { name: "Preview Voucher" }));
    const voucher = await screen.findByRole("dialog", { name: "Preview Voucher" });
    expect(await within(voucher).findByTitle("Hotel voucher email")).toHaveAttribute("srcdoc", "<h1>Voucher</h1>");
    expect(preview).toHaveBeenCalledWith(42, 1, "hotel-voucher", expect.objectContaining({ hotelName: "Tea Castle" }), expect.any(Object));
    await user.click(within(voucher).getByRole("button", { name: "Close" }));
    await user.click(dialog.getByRole("checkbox", { name: /Select Tea Castle for email/ }));
    await user.click(actions.getByRole("button", { name: "Send to Selected (1)" }));
    expect(await actions.findByText("1 voucher sent.")).toBeVisible();
    expect(send).toHaveBeenCalledWith(42, 1, "hotel-voucher", [expect.objectContaining({ routeId: 10, hotelName: "Tea Castle" })]);
    expect(dialog.getByLabelText("Status", { exact: true })).toHaveValue("pending");
    expect(dialog.getByLabelText("Mobile number")).not.toBeRequired();
    expect(dialog.getByRole("button", { name: /Cloud Valley.*Awaiting/ })).toBeVisible();
    await user.click(actions.getByRole("button", { name: "Send to Selected (1)" }));
    expect(send).toHaveBeenLastCalledWith(42, 1, "hotel-voucher", [expect.objectContaining({ routeId: 10, version: 1 })]);
    expect(save).not.toHaveBeenCalled();
  }, 15000);

  it("saves only the selected stay and sends its voucher after explicit confirmation", async () => {
    setRole(USER_ROLES.ADMIN);
    vi.mocked(offlineHotelBookingApi.defaults).mockResolvedValue({ confirmedBy: "", contacts: {} });
    vi.spyOn(offlineHotelBookingApi, "list").mockResolvedValue([]);
    const save = vi.spyOn(offlineHotelBookingApi, "save").mockImplementation(async (_, __, booking) => ({ ...booking, version: 1 }));
    const send = vi.spyOn(offlineHotelBookingApi, "sendVouchers").mockImplementation(async (_, __, ___, stays) => ({
      results: stays.map((entry) => ({ key: offlineBookingKey(entry), status: "sent" })),
    }));
    const user = userEvent.setup();
    renderHotelList();
    await user.click(bookingButton());
    const dialog = within(await screen.findByRole("dialog", { name: "Hotel Stays" }));
    const actions = within(await dialog.findByRole("region", { name: "Email Actions" }));
    const cloudValley = dialog.getByRole("checkbox", { name: /Select Cloud Valley for email/ });
    await user.click(cloudValley);
    expect(cloudValley).toBeChecked();
    const sendSelected = actions.getByRole("button", { name: "Send to Selected (1)" });
    await user.click(sendSelected);
    let validation = within(await screen.findByRole("dialog", { name: "Hotel contacts for vouchers" }));
    expect(validation.getByText("Cloud Valley")).toBeVisible();
    expect(validation.queryByText("Tea Castle")).not.toBeInTheDocument();
    expect(save).not.toHaveBeenCalled();
    expect(send).not.toHaveBeenCalled();
    await user.click(validation.getByRole("button", { name: "Back to hotel stays" }));
    expect(cloudValley).toBeChecked();

    await user.type(dialog.getByRole("searchbox", { name: "Search hotel" }), "Tea Castle");
    expect(cloudValley).not.toBeInTheDocument();
    await user.click(sendSelected);
    validation = within(await screen.findByRole("dialog", { name: "Hotel contacts for vouchers" }));
    expect(validation.getByText("Cloud Valley")).toBeVisible();
    expect(send).not.toHaveBeenCalled();
    const email = validation.getByRole("textbox", { name: "Hotel email" });
    await user.type(email, "invalid");
    await user.type(validation.getByRole("textbox", { name: "Mobile number (optional)" }), "+91 98765 43210");
    await user.click(validation.getByRole("button", { name: "Save bookings and send vouchers" }));
    expect(email).toBeInvalid();
    expect(save).not.toHaveBeenCalled();
    expect(send).not.toHaveBeenCalled();
    await user.clear(email);
    await user.type(email, "cloud@example.com");
    await user.click(validation.getByRole("button", { name: "Save bookings and send vouchers" }));
    expect(await actions.findByText("1 voucher sent.")).toBeVisible();
    await waitFor(() => expect(save).toHaveBeenCalledExactlyOnceWith(42, 1, expect.objectContaining({
      routeId: 12,
      version: 0,
      details: expect.objectContaining({ emails: ["cloud@example.com"], phone: "+91 98765 43210", status: "pending" }),
    })));
    expect(send).toHaveBeenCalledExactlyOnceWith(42, 1, "hotel-voucher", [
      expect.objectContaining({ hotelName: "Cloud Valley", version: 1 }),
    ]);
  }, 15000);

  it("saves both pending stays before sending and retries only the failed save", async () => {
    setRole(USER_ROLES.ADMIN);
    vi.spyOn(offlineHotelBookingApi, "list").mockResolvedValue([]);
    let rejectCloudValley = true;
    const save = vi.spyOn(offlineHotelBookingApi, "save").mockImplementation(async (_, __, booking) => {
      if (booking.routeId === 12 && rejectCloudValley) throw new Error("Unable to save Cloud Valley.");
      return { ...booking, version: 1 };
    });
    const send = vi.spyOn(offlineHotelBookingApi, "sendVouchers").mockImplementation(async (_, __, ___, stays) => ({
      results: stays.map((entry) => ({ key: offlineBookingKey(entry), status: "sent" })),
    }));
    const user = userEvent.setup();
    renderHotelList();
    await user.click(bookingButton());
    const dialog = within(await screen.findByRole("dialog", { name: "Hotel Stays" }));
    await user.click(await dialog.findByRole("button", { name: "Send to All Hotels" }));
    const contacts = within(await screen.findByRole("dialog", { name: "Hotel contacts for vouchers" }));
    expect(contacts.getAllByRole("listitem")).toHaveLength(2);
    expect(contacts.getAllByRole("textbox", { name: "Hotel email" }).map((input) => (input as HTMLInputElement).value))
      .toEqual(["reservations@tea-castle.example", "booking@cloud-valley.example"]);
    const submit = contacts.getByRole("button", { name: "Save bookings and send vouchers" });
    await user.click(submit);
    expect(await contacts.findByRole("alert")).toHaveTextContent("Unable to save Cloud Valley.");
    expect(send).not.toHaveBeenCalled();
    expect(contacts.getAllByRole("listitem")).toHaveLength(1);
    rejectCloudValley = false;
    await user.click(submit);
    expect(await dialog.findByText("2 vouchers sent.")).toBeVisible();
    expect(save.mock.calls.map(([, , booking]) => [booking.routeId, booking.version, booking.details.status])).toEqual([
      [10, 0, "pending"], [12, 0, "pending"], [12, 0, "pending"],
    ]);
    expect(send).toHaveBeenCalledExactlyOnceWith(42, 1, "hotel-voucher", [
      expect.objectContaining({ routeId: 10, version: 1 }),
      expect.objectContaining({ routeId: 12, version: 1 }),
    ]);
  }, 15000);

  it("keeps other hotel drafts after saving, closing, and switching recommendations", async () => {
    setRole(USER_ROLES.ADMIN);
    const savedHotels: SavedOfflineBooking[] = [];
    vi.spyOn(offlineHotelBookingApi, "list").mockImplementation(async (_, group) => group === 1 ? [...savedHotels] : []);
    const save = vi.spyOn(offlineHotelBookingApi, "save").mockImplementation(async (_, __, booking) => {
      const saved = { ...booking, version: 1 };
      savedHotels.push(saved);
      return saved;
    });
    const send = vi.spyOn(offlineHotelBookingApi, "sendVouchers").mockResolvedValue({ results: [] });
    const user = userEvent.setup();
    renderHotelList();
    await user.click(bookingButton());
    let dialog = within(await screen.findByRole("dialog", { name: "Hotel Stays" }));
    const status = () => dialog.getByLabelText("Status", { exact: true });
    await user.selectOptions(await dialog.findByLabelText("Status", { exact: true }), "confirmed");
    await user.click(dialog.getByRole("button", { name: /Cloud Valley.*Awaiting/ }));
    await user.selectOptions(status(), "cancelled");
    await user.click(dialog.getByRole("button", { name: "Send to All Hotels" }));
    const validation = within(await screen.findByRole("dialog", { name: "Unsaved booking changes" }));
    expect(validation.getAllByRole("listitem")).toHaveLength(2);
    await user.click(validation.getByRole("button", { name: "Open booking to save" }));
    expect(status()).toHaveValue("confirmed");
    expect(dialog.getByRole("button", { name: /Tea Castle.*Awaiting.*Unsaved/ })).toBeVisible();
    expect(save).not.toHaveBeenCalled();
    expect(send).not.toHaveBeenCalled();
    await user.click(dialog.getByRole("button", { name: "Save Booking" }));
    await waitForBookingToClose();
    expect(save.mock.calls.map(([, , booking]) => [booking.routeId, booking.details.status])).toEqual([[10, "confirmed"]]);
    await user.click(screen.getByRole("tab", { name: /Recommended #2/ }));
    await user.click(screen.getByRole("tab", { name: /Recommended #1/ }));
    await user.click(bookingButton());
    dialog = within(await screen.findByRole("dialog", { name: "Hotel Stays" }));
    expect(await dialog.findByRole("button", { name: /Tea Castle.*Confirmed/ })).toBeVisible();
    await user.click(dialog.getByRole("button", { name: /Cloud Valley.*Awaiting.*Unsaved/ }));
    expect(status()).toHaveValue("cancelled");
    await user.click(dialog.getByRole("button", { name: "Save Booking" }));
    await waitForBookingToClose();
    expect(save.mock.calls.map(([, , booking]) => [booking.routeId, booking.details.status])).toEqual([
      [10, "confirmed"], [12, "cancelled"],
    ]);
    await user.click(bookingButton());
    dialog = within(await screen.findByRole("dialog", { name: "Hotel Stays" }));
    expect(await dialog.findByRole("button", { name: /Cloud Valley.*Cancelled/ })).toBeVisible();
    await user.click(dialog.getByRole("button", { name: "Send to All Hotels" }));
    await waitFor(() => expect(send).toHaveBeenCalledTimes(1));
    expect(save).toHaveBeenCalledTimes(2);
  }, 15000);
});
