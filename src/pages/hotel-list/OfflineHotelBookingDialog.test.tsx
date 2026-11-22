import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { USER_ROLES } from "@/constants/systemRoles";
import { ItineraryService } from "@/services/itinerary";
import { HotelList } from "../HotelList";
import type { ItineraryHotelRow } from "../itinerary-details/itinerary-details.types";
import { offlineHotelBookingApi, type SavedOfflineBooking } from "./offlineHotelBooking";

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

describe("Offline Booking from the Hotel List", () => {
  beforeEach(() => {
    vi.spyOn(ItineraryService, "getDetails").mockResolvedValue({});
    vi.spyOn(offlineHotelBookingApi, "contacts").mockResolvedValue({
      "offline:123": { emails: ["reservations@tea-castle.example"], phone: "9876543100" },
      "tbo:vsr_52": { emails: ["booking@cloud-valley.example"], phone: "9876543200" },
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    localStorage.removeItem("accessToken");
  });

  it("opens the active group's offline and live stays and restores a saved edit after remount", async () => {
    setRole(USER_ROLES.ADMIN);
    const savedByGroup: Record<number, SavedOfflineBooking[]> = {};
    const list = vi.spyOn(offlineHotelBookingApi, "list").mockImplementation(async (_, group) => savedByGroup[group] ?? []);
    const save = vi.spyOn(offlineHotelBookingApi, "save").mockImplementation(async (_, group, details) => {
      const saved = { ...details, version: details.version + 1 };
      savedByGroup[group] = [saved];
      return saved;
    });
    const user = userEvent.setup();
    const view = renderHotelList();
    await user.click(bookingButton());
    let dialog = within(await screen.findByRole("dialog", { name: "Hotel Stays" }));
    expect(dialog.getByText("Recommended #1 · 2 stays")).toBeVisible();
    expect(await dialog.findByRole("button", { name: /Tea Castle.*10 Jan 2027.*12 Jan 2027/ })).toBeVisible();
    expect(dialog.getByLabelText("Email ID")).toHaveValue("reservations@tea-castle.example");
    expect(dialog.getByLabelText("Mobile number")).toHaveValue("9876543100");
    expect(dialog.getByLabelText("Confirmed by")).toHaveValue("");
    expect(dialog.queryByRole("button", { name: /Lake Lodge/ })).toBeNull();
    await user.click(dialog.getByRole("button", { name: /Cloud Valley/ }));
    const editor = within(dialog.getByRole("form", { name: "Booking details for Cloud Valley" }));
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
    expect(await editor.findByText("Booking details saved.")).toBeVisible();
    expect(save).toHaveBeenCalledWith(42, 1, expect.objectContaining({
      hotelKey: "tbo:vsr_52", routeId: 12, checkIn: "2027-01-12", checkOut: "2027-01-13", version: 0,
      details: expect.objectContaining({
        status: "confirmed",
        rooms: [expect.objectContaining({ rate: 4500 })],
        cancellationPolicies: [{ beforeDate: "2027-01-09", percentage: 50 }],
      }),
    }));
    await user.click(dialog.getByRole("button", { name: "Close" }));
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
    expect(await dialog.findByText("Booking details saved.")).toBeVisible();
    expect(save).toHaveBeenLastCalledWith(42, 1, expect.objectContaining({ version: 1 }));
    await user.keyboard("{Escape}");

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
    await user.type(await dialog.findByLabelText("Confirmed by"), "Nandini");
    fireEvent.change(dialog.getByLabelText("Mobile number"), { target: { value: "" } });
    await user.selectOptions(dialog.getByLabelText("Status"), "confirmed");
    await user.click(dialog.getByRole("button", { name: "Save Booking" }));
    expect(save).not.toHaveBeenCalled();
    await user.selectOptions(dialog.getByLabelText("Status"), "pending");
    await user.click(dialog.getByRole("button", { name: "Save Booking" }));
    expect(await dialog.findByRole("alert")).toHaveTextContent("This stay was updated.");
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
});
