import { act, fireEvent, render, renderHook, screen, cleanup } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { FinalDepartureTimeControl } from "../pages/itinerary-details/components/FinalDepartureTimeControl";
import { useArrivalPolicyRouteTimeController } from "../pages/itinerary-details/hooks/useArrivalPolicyRouteTimeController";

vi.mock("@/services/itinerary", () => ({ ItineraryService: { resolveHotelArrivalPolicy: vi.fn() } }));
vi.mock("@/components/itinerary/TimePickerPopover", () => ({
  TimePickerPopover: ({ value, label, onSave }: any) => <button onClick={() => onSave("09:00 PM")}>{label}: {value}</button>,
}));

beforeEach(() => vi.stubGlobal("ResizeObserver", class {
  observe() {}
  unobserve() {}
  disconnect() {}
}));
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });
const day = { id: 30, dayNumber: 3, startTime: "07:06 AM", endTime: "09:00 PM", departureTime: "12:00 PM" } as any;

describe("explicit final departure control", () => {
  it("shows the saved actual departure and emits a departure edit, independent of the day end", async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    render(<FinalDepartureTimeControl day={day} planId={12180} isFinalDay onSave={onSave} />);
    fireEvent.click(screen.getByRole("button", { name: "Edit final departure time, 12:00 PM" }));
    const save = await screen.findByRole("button", { name: "Departure Time: 12:00 PM" });
    await act(async () => { fireEvent.click(save); });
    expect(onSave).toHaveBeenCalledWith(12180, 30, 3, "07:06 AM", "09:00 PM", "FINAL_DAY_DEPARTURE");
  });

  it("is disabled for read-only quotes and hidden on non-final or missing-departure days", () => {
    const props = { day, planId: 1, isFinalDay: true, onSave: vi.fn() };
    const { rerender, container } = render(<FinalDepartureTimeControl {...props} readOnly />);
    expect(screen.getByRole("button")).toBeDisabled();
    rerender(<FinalDepartureTimeControl {...props} isFinalDay={false} />);
    expect(container).toBeEmptyDOMElement();
    rerender(<FinalDepartureTimeControl {...props} day={{ ...day, departureTime: null }} />);
    expect(container).toBeEmptyDOMElement();
  });
});

function controller(route = day) {
  const applyRouteTimePatch = vi.fn().mockResolvedValue(undefined);
  const { result } = renderHook(() => useArrivalPolicyRouteTimeController({
    itinerary: { days: [route], itineraryPreference: 2 } as any,
    requiresHotelBookingFlow: true, applyRouteTimePatch,
    setIsResolvingArrivalPolicy: vi.fn(), setPendingRouteTimeUpdate: vi.fn(), setArrivalPolicyConfirmModal: vi.fn(),
  }));
  return { result, applyRouteTimePatch };
}

it("does not discard a departure change equal to the current day end", async () => {
  const h = controller();
  await act(() => h.result.current.handleUpdateRouteTimesDirect(1, 30, 3, "07:06 AM", "09:00 PM", "FINAL_DAY_DEPARTURE"));
  expect(h.applyRouteTimePatch).toHaveBeenCalledWith(1, 30, 3, "07:06:00", "21:00:00", { changeType: "FINAL_DAY_DEPARTURE" });
});

it("same actual departure is a no-op even when the day end differs", async () => {
  const h = controller();
  await act(() => h.result.current.handleUpdateRouteTimesDirect(1, 30, 3, "07:06 AM", "12:00 PM", "FINAL_DAY_DEPARTURE"));
  expect(h.applyRouteTimePatch).not.toHaveBeenCalled();
});

it("single-day early arrival departure edits bypass arrival-policy dialogs", async () => {
  const h = controller({ ...day, dayNumber: 1, startTime: "05:00 AM" });
  await act(() => h.result.current.handleUpdateRouteTimesDirect(1, 30, 1, "05:00 AM", "09:00 PM", "FINAL_DAY_DEPARTURE"));
  expect(h.applyRouteTimePatch).toHaveBeenCalledWith(1, 30, 1, "05:00:00", "21:00:00", { changeType: "FINAL_DAY_DEPARTURE" });
  expect(h.result.current.transportEarlyArrivalDialog.open).toBe(false);
});

it("ordinary day-end edits retain their existing action", async () => {
  const h = controller({ ...day, startTime: "09:00 AM" });
  await act(() => h.result.current.handleUpdateRouteTimesDirect(1, 30, 3, "09:00 AM", "08:00 PM", "ROUTE_END"));
  expect(h.applyRouteTimePatch).toHaveBeenCalledWith(1, 30, 3, "09:00:00", "20:00:00", { changeType: "ROUTE_END" });
});
