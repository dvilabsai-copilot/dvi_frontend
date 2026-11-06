import { describe, expect, it } from "vitest";
import {
  propagateContinuousHotelHoldStatus,
  resolveContinuousHotelHoldSelectionIds,
} from "./continuousHotelHoldSelection.utils";

const row = (hotel: string, date: string, id: number, provider = "offline") => ({
  hotel,
  routeDate: date,
  hotelDetailsIds: [id],
  hotelEntry: { provider },
});

describe("resolveContinuousHotelHoldSelectionIds", () => {
  it("includes all adjacent nights for the same hotel and provider", () => {
    const firstNight = row("Tea Castle", "2026-11-09", 101);
    expect(resolveContinuousHotelHoldSelectionIds(firstNight, [
      firstNight,
      row("TEA CASTLE", "2026-11-10", 102),
      row("Classic Regency", "2026-11-11", 103),
    ])).toEqual([101, 102]);
  });

  it("keeps a one-night stay scoped to its own selection", () => {
    const stay = row("Tea Castle", "2026-11-09", 101);
    expect(resolveContinuousHotelHoldSelectionIds(stay, [stay, row("Tea Castle", "2026-11-11", 102)])).toEqual([101]);
  });

  it("does not combine providers or hotels with a date gap", () => {
    const stay = row("Tea Castle", "2026-11-09", 101);
    expect(resolveContinuousHotelHoldSelectionIds(stay, [
      stay,
      row("Tea Castle", "2026-11-10", 102, "axisrooms"),
      row("Tea Castle", "2026-11-11", 103),
    ])).toEqual([101]);
  });

  it("shows an active hold across every adjacent night in the continuous stay", () => {
    const dayOne = {
      ...row("Tea Castle", "2026-11-09", 101),
      status: "BLOCKED",
      holdRequestId: 8,
      holdUntil: "2026-11-07T01:33:00.000Z",
      cutoffAt: "2026-11-07T01:33:00.000Z",
      canExtendHold: true,
    };
    const dayTwo = { ...row("Tea Castle", "2026-11-10", 102), status: "Not Started" };
    const [heldDayOne, heldDayTwo] = propagateContinuousHotelHoldStatus([dayOne, dayTwo]);
    expect(heldDayOne.status).toBe("BLOCKED");
    expect(heldDayTwo).toMatchObject({
      status: "BLOCKED",
      holdRequestId: 8,
      holdUntil: dayOne.holdUntil,
      canExtendHold: true,
    });
  });

  it("does not spread an expired or cancelled hold", () => {
    const expired = { ...row("Tea Castle", "2026-11-09", 101), status: "Hold expired", holdRequestId: 8 };
    const nextNight = { ...row("Tea Castle", "2026-11-10", 102), status: "Not Started" };
    expect(propagateContinuousHotelHoldStatus([expired, nextNight])[1].status).toBe("Not Started");
  });
});
