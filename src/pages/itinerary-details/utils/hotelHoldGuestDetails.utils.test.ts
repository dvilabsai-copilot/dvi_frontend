import { describe, expect, it } from "vitest";
import { canPersistHotelHoldGuestDetails } from "./hotelHoldGuestDetails.utils";

describe("canPersistHotelHoldGuestDetails", () => {
  it("allows complete primary guest details to be persisted after a hold", () => {
    expect(canPersistHotelHoldGuestDetails({
      name: "Guest Name",
      contactNo: "9876543210",
      emailId: "guest@example.com",
      age: "35",
    })).toBe(true);
  });

  it("does not make age a hold requirement when deciding whether to persist", () => {
    expect(canPersistHotelHoldGuestDetails({
      name: "Guest Name",
      contactNo: "9876543210",
      emailId: "guest@example.com",
      age: "",
    })).toBe(false);
  });

  it("rejects incomplete required details for persistence", () => {
    expect(canPersistHotelHoldGuestDetails({
      name: " ",
      contactNo: "9876543210",
      emailId: "guest@example.com",
      age: "35",
    })).toBe(false);
  });
});
