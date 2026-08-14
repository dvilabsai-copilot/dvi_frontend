import { describe, expect, it } from "vitest";
import { shouldShowRoomTypeEditor } from "./hotelList.utils";

describe("shouldShowRoomTypeEditor", () => {
  it("hides the row editor for one room with one category", () => {
    expect(shouldShowRoomTypeEditor(1, ["Garden View"])).toBe(false);
  });

  it("shows the row editor for one room with multiple categories", () => {
    expect(shouldShowRoomTypeEditor(1, ["Deluxe", "Suite"])).toBe(true);
  });

  it("keeps the editor for multi-room stays", () => {
    expect(shouldShowRoomTypeEditor(2, ["Garden View"])).toBe(true);
  });
});
