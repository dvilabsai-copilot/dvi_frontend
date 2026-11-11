import { renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { useQuotationPassengerValidation } from "./useQuotationPassengerValidation";

describe("quotation passenger child age defaults", () => {
  it("uses age 5 when a child age is blank and preserves supplied child ages", () => {
    const { result } = renderHook(() => useQuotationPassengerValidation({
      guestDetails: {
        name: "Srinivas Guest",
        salutation: "Mr",
        contactNo: "9843288844",
        nationality: "IN",
        age: 45,
        emailId: "guest@example.com",
      },
      additionalAdults: [],
      additionalChildren: [
        { title: "Ms", name: "Child One", age: "", nationality: "IN" },
        { title: "Ms", name: "Child Two", age: "8", nationality: "IN" },
      ],
      additionalInfants: [],
      requiresDetailedPassengerFlow: true,
      expectedAdults: 0,
      expectedChildren: 2,
      expectedInfants: 0,
      setFormErrors: vi.fn(),
    }));

    const validated = result.current();

    expect(validated?.normalizedAdditionalChildren.map((child) => child.age)).toEqual(["5", "8"]);
    expect(validated?.passengers.filter((passenger) => passenger.paxType === 2).map((passenger) => passenger.age)).toEqual([5, 8]);
  });
});
