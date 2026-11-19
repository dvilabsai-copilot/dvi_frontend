import { beforeEach, describe, expect, it, vi } from "vitest";
import { ItineraryService } from "@/services/itinerary";
import { holdGroupWithPriceApproval, type ReviewHoldPrices } from "./tboHoldPriceApproval";

vi.mock("@/services/itinerary", () => ({ ItineraryService: { holdHotelGroup: vi.fn() } }));

const hold = vi.mocked(ItineraryService.holdHotelGroup);
const input = {
  itineraryPlanId: 123,
  groupType: 1,
  hotelDetailsIds: [5, 6],
  tboHoldBookings: [{ hotelDetailsIds: [5], selection: { netAmount: 1000 } }],
};
const held = { success: true, status: "HELD", selectionIds: [6] };
const pending = (token: string, newAmount: number) => ({
  success: false,
  status: "PRICE_APPROVAL_REQUIRED",
  hotelName: "Sample VSR Hotel",
  selectionIds: [5],
  priceApproval: { token, previousAmount: 1000, newAmount, currency: "INR" },
});

describe("VSR hold price approval", () => {
  beforeEach(() => hold.mockReset());

  it("waits for approval and retries only the changed stay with its token", async () => {
    hold.mockResolvedValueOnce({ outcomes: [held, pending("first", 1200)] });
    hold.mockResolvedValueOnce({ outcomes: [pending("second", 1300)] });
    hold.mockResolvedValueOnce({ outcomes: [{ ...held, selectionIds: [5] }] });
    const review = vi.fn<ReviewHoldPrices>()
      .mockImplementationOnce(async (changes) => {
        expect(hold).toHaveBeenCalledTimes(1);
        expect(changes[0]).toMatchObject({ previousAmount: 1000, newAmount: 1200 });
        return true;
      })
      .mockImplementationOnce(async (changes) => {
        expect(hold).toHaveBeenCalledTimes(2);
        expect(changes[0].newAmount).toBe(1300);
        return true;
      });

    const result = await holdGroupWithPriceApproval(input, review);

    expect(hold).toHaveBeenCalledTimes(3);
    expect(hold).toHaveBeenNthCalledWith(2, {
      ...input, hotelDetailsIds: [5],
      tboHoldBookings: [{ ...input.tboHoldBookings[0], priceApprovalToken: "first" }],
    });
    expect(hold.mock.calls[2][0].tboHoldBookings?.[0].priceApprovalToken).toBe("second");
    expect(result.outcomes.map((outcome) => outcome.selectionIds)).toEqual([[6], [5]]);
  });

  it("keeps existing results and sends no second request when the agent cancels", async () => {
    hold.mockResolvedValueOnce({ outcomes: [held, pending("first", 1200)] });

    const result = await holdGroupWithPriceApproval(input, async () => false);

    expect(hold).toHaveBeenCalledTimes(1);
    expect(result.cancelledPriceReview).toBe(true);
    expect(result.outcomes).toEqual([held]);
  });
});
