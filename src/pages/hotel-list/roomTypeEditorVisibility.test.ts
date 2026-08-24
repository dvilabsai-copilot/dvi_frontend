import { describe, expect, it } from "vitest";
import { getRoomSelectionDisplayLabel, shouldShowRoomTypeEditor } from "./hotelList.utils";

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

describe("room selection display", () => {
  it("shows the concrete category when every room has the same selection", () => {
    expect(getRoomSelectionDisplayLabel({
      roomSelections: [
        { room_type_title: "DELUXE ROOM" },
        { room_type_title: "DELUXE ROOM" },
        { room_type_title: "DELUXE ROOM" },
        { room_type_title: "DELUXE ROOM" },
        { room_type_title: "DELUXE ROOM" },
      ],
    }, "DELUXE ROOM", 5)).toBe("DELUXE ROOM");
  });

  it("keeps the room-count label for mixed room assignments", () => {
    expect(getRoomSelectionDisplayLabel({
      roomSelections: [
        { room_type_title: "DELUXE ROOM" },
        { room_type_title: "Premium Sea View Room" },
      ],
    }, "DELUXE ROOM", 5)).toBe("5 Rooms Selected");
  });
});
