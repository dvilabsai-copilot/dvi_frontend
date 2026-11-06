import { describe, expect, it } from "vitest";
import { resolveContinuousHotelHoldSelectionIds } from "./continuousHotelHoldSelection.utils";

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
});
