import { describe, expect, it } from "vitest";
import { getRoomSelectionDisplayLabel, shouldShowRoomTypeEditor } from "./hotelList.utils";
import { OCCUPANCY_FIELDS } from "../hotel-form/priceBook.utils";

describe("shouldShowRoomTypeEditor", () => {
  it("hides the row editor for one room with one category", () => {
    expect(shouldShowRoomTypeEditor(1, ["Garden View"])).toBe(false);
  });

  it("shows the row editor for one room with multiple categories", () => {
    expect(shouldShowRoomTypeEditor(1, ["Deluxe", "Suite"])).toBe(true);
  });

  it("hides the editor for multi-room stays with one available category", () => {
    expect(shouldShowRoomTypeEditor(2, ["Garden View"])).toBe(false);
  });

  it("shows the editor for multi-room stays with multiple categories", () => {
    expect(shouldShowRoomTypeEditor(2, ["Garden View", "Suite"])).toBe(true);
  });

  it("treats VSR bed and view variants as one category", () => {
    expect(shouldShowRoomTypeEditor(2, [
      "Standard Room, 1 King Bed",
      "Standard Room, Plantation, 1 Double Bed",
    ], "tbo")).toBe(false);
  });

  it("shows the VSR editor for distinct categories", () => {
    expect(shouldShowRoomTypeEditor(2, [
      "Standard Room, 1 King Bed",
      "Deluxe Room, 1 King Bed",
    ], "tbo")).toBe(true);
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

  it("shows counts for each category when room assignments are mixed", () => {
    expect(getRoomSelectionDisplayLabel({
      roomSelections: [
        { room_type_title: "Suite Room" },
        { room_type_title: "Club Room" },
        { room_type_title: "Club Room" },
        { room_type_title: "Club Room" },
        { room_type_title: "Club Room" },
      ],
    }, "Suite Room", 5)).toBe("4 Rooms Club Room\n1 Room Suite Room");
  });
});

describe("hotel pricebook occupancy fields", () => {
  it("uses DOUBLE as the room-price input and excludes PENTA through DECA", () => {
    expect(OCCUPANCY_FIELDS).toEqual([
      "SINGLE",
      "DOUBLE",
      "EXTRABED",
      "CHILD_WITH_BED",
      "CHILD_WITHOUT_BED",
    ]);
  });
});
