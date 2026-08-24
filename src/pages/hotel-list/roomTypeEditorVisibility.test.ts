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
      "EXTRAADULT",
      "CHILD_WITH_BED",
      "CHILD_WITHOUT_BED",
    ]);
  });
});
