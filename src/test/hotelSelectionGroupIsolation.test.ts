import { describe, expect, it } from "vitest";
import {
  getHotelOptionKey,
  normalizeManualHotelSelection,
  resolveTargetGroupType,
} from "@/pages/hotel-list/hotelList.utils";

type Selection = {
  hotelName: string;
  groupType: number;
  totalAmount: number;
};

describe("manual hotel selection group ownership", () => {
  it("reuses a Group 4 inventory hotel in Group 1 without changing Group 4", () => {
    const group4Selection: Selection = { hotelName: "Hotel B", groupType: 4, totalAmount: 400 };
    const group1Selection: Selection = { hotelName: "Hotel A", groupType: 1, totalAmount: 100 };
    const selectedFromSharedInventory = normalizeManualHotelSelection(
      group4Selection,
      resolveTargetGroupType(1),
    );

    const selectedByGroup = {
      1: selectedFromSharedInventory,
      4: group4Selection,
    };
    const userSelectedByGroup = {
      1: selectedFromSharedInventory,
      4: group4Selection,
    };

    expect(selectedFromSharedInventory.groupType).toBe(1);
    expect(selectedByGroup[1].hotelName).toBe("Hotel B");
    expect(userSelectedByGroup[1].groupType).toBe(1);
    expect(selectedByGroup[4]).toBe(group4Selection);
    expect(userSelectedByGroup[4]).toBe(group4Selection);
    expect(group1Selection).not.toBe(selectedByGroup[1]);
  });

  it("preserves a different Group 4 selection and emits the target group in the payload", () => {
    const group4Selection: Selection = { hotelName: "Hotel C", groupType: 4, totalAmount: 450 };
    const selectedFromSharedInventory = normalizeManualHotelSelection(
      { hotelName: "Hotel B", groupType: 4, totalAmount: 400 },
      1,
    );

    const payload = { groupType: selectedFromSharedInventory.groupType };
    expect(payload).toEqual({ groupType: 1 });
    expect(group4Selection).toEqual({ hotelName: "Hotel C", groupType: 4, totalAmount: 450 });
    expect(selectedFromSharedInventory.totalAmount).toBe(400);
    expect(getHotelOptionKey({ ...selectedFromSharedInventory, groupType: 1 }))
      .toBe(getHotelOptionKey({ ...selectedFromSharedInventory, groupType: 4 }));
  });

  it("rejects persistence when there is no valid active target group", () => {
    expect(() => resolveTargetGroupType(undefined)).toThrow(/valid active recommendation group/);
    expect(() => resolveTargetGroupType(5)).toThrow(/valid active recommendation group/);
  });
});
