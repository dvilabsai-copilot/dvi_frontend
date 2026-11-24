import { describe, expect, it } from "vitest";
import { canRefreshSelectedTboRate, getRoomCategoryEditorTarget, getRoomSelectionDisplayLabel, getRoomTypeEditorProvider, shouldShowRoomTypeEditor } from "./hotelList.utils";

it("shows the saved VSR room allocation with a count for each category", () => {
  expect(getRoomSelectionDisplayLabel({
    roomType: "Superior King + Deluxe Twin",
    selectedPriceSnapshot: JSON.stringify({
      tboMultiBatchStay: {
        schemaVersion: 1, provider: "tbo", roomCount: 8,
        batches: [
          { roomType: "Superior King", roomCount: 6 },
          { roomType: "Deluxe Twin", roomCount: 2 },
        ],
      },
    }),
  }, "", 8)).toBe("6 Rooms Superior King\n2 Rooms Deluxe Twin");
});
import { isOfflineHotelRecord, OCCUPANCY_FIELDS } from "../hotel-form/priceBook.utils";

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

  it("treats VSR display labels as the TBO category provider", () => {
    expect(shouldShowRoomTypeEditor(2, [
      "Deluxe Room, 1 Double Bed",
      "Deluxe Room, 2 Twin Beds",
    ], "VSR")).toBe(false);
  });

  it("resolves VSR from persisted display-provider fields", () => {
    expect(getRoomTypeEditorProvider({ providerDisplayName: "VSR" })).toBe("vsr");
    expect(getRoomTypeEditorProvider({ provider: "tbo", providerDisplayName: "VSR" })).toBe("tbo");
  });

  it("shows the VSR editor for distinct categories", () => {
    expect(shouldShowRoomTypeEditor(2, [
      "Standard Room, 1 King Bed",
      "Deluxe Room, 1 King Bed",
    ], "tbo")).toBe(true);
  });
});

describe("selected TBO rate refresh visibility", () => {
  const base = {
    enabled: true,
    editable: true,
    externalStay: false,
    provider: "tbo",
    hotelCode: "5110229",
  };

  it("allows an editable itinerary TBO/VSR stay with supplier identity", () => {
    expect(canRefreshSelectedTboRate(base)).toBe(true);
    expect(canRefreshSelectedTboRate({ ...base, provider: "VSR" })).toBe(true);
  });

  it("does not expose the action outside itinerary context or for restricted stays", () => {
    expect(canRefreshSelectedTboRate({ ...base, enabled: false })).toBe(false);
    expect(canRefreshSelectedTboRate({ ...base, editable: false })).toBe(false);
    expect(canRefreshSelectedTboRate({ ...base, externalStay: true })).toBe(false);
    expect(canRefreshSelectedTboRate({ ...base, provider: "offline" })).toBe(false);
    expect(canRefreshSelectedTboRate({ ...base, provider: "axisrooms" })).toBe(false);
    expect(canRefreshSelectedTboRate({ ...base, hotelCode: " " })).toBe(false);
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

describe("room category editor target", () => {
  const firstNight = {
    itineraryRouteId: 21, itineraryPlanHotelDetailsId: 31, groupType: 4,
    hotelId: 238, provider: "axisrooms", hotelCode: "238",
  };
  const sharedSelection = {
    ...firstNight, itineraryRouteId: 22, itineraryPlanHotelDetailsId: 32,
    providerHotelCode: "AX_DVI_HOTEL_238",
  };

  it("keeps the clicked route and its parent when the shared selection points to the second night", () => {
    expect(getRoomCategoryEditorTarget(firstNight, sharedSelection, 10, 4)).toMatchObject({
      itinerary_plan_id: 10,
      itinerary_route_id: 21,
      itinerary_plan_hotel_details_ID: 31,
      hotel_code: "AX_DVI_HOTEL_238",
      group_type: 4,
    });
  });

  it("leaves parent resolution to the API for a different hotel or recommendation group", () => {
    expect(getRoomCategoryEditorTarget({ ...firstNight, groupType: 1 }, sharedSelection, 10, 4)
      .itinerary_plan_hotel_details_ID).toBe(0);
    expect(getRoomCategoryEditorTarget({ ...firstNight, hotelId: 237, hotelCode: "237" }, sharedSelection, 10, 4)
      .itinerary_plan_hotel_details_ID).toBe(0);
  });

  it("uses the selected parent when it belongs to the clicked route", () => {
    expect(getRoomCategoryEditorTarget(sharedSelection, sharedSelection, 10, 4)).toMatchObject({
      itinerary_route_id: 22,
      itinerary_plan_hotel_details_ID: 32,
    });
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

describe("hotel pricebook provider label", () => {
  it("identifies a hotel without a live provider mapping as offline", () => {
    expect(isOfflineHotelRecord({ hotel_id: 42 })).toBe(true);
  });

  it("does not identify a TBO-mapped hotel as offline", () => {
    expect(isOfflineHotelRecord({ tbo_hotel_code: "TBO-42" })).toBe(false);
  });

  it("honours the backend classification when it is present", () => {
    expect(isOfflineHotelRecord({ is_offline: false })).toBe(false);
    expect(isOfflineHotelRecord({ is_offline: true, tbo_hotel_code: "TBO-42" })).toBe(true);
  });
});
