import { describe, expect, it } from "vitest";
import { findActiveHotelHoldRequestForSelection } from "./hotelChangeHold.utils";

describe("findActiveHotelHoldRequestForSelection", () => {
  it("does not prompt to remove a cancelled or superseded request", () => {
    const history = [
      { id: 7, status: "CANCELLED", selectionIds: [101] },
      { id: 8, status: "SUPERSEDED", selection_ids: [101] },
    ];

    expect(findActiveHotelHoldRequestForSelection(history, [101])).toBeUndefined();
  });

  it("finds an active request for the intended stay", () => {
    const active = { id: 9, status: "BLOCKED", selectionIds: [101, 102] };
    const otherStay = { id: 10, status: "REQUESTED", selection_ids: [201] };

    expect(findActiveHotelHoldRequestForSelection([otherStay, active], [102])).toBe(active);
  });

  it("does not match when no stay selection IDs are available", () => {
    expect(findActiveHotelHoldRequestForSelection([
      { id: 9, status: "BLOCKED", selectionIds: [101] },
    ], [])).toBeUndefined();
  });
});
