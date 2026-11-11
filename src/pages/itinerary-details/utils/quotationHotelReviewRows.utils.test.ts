import { describe, expect, it } from "vitest";
import { resolveHotelEntryDayNumbers, sortHotelReviewRowsChronologically } from "./quotationHotelReviewRows.utils";

describe("resolveHotelEntryDayNumbers", () => {
  const itineraryDays = [
    { id: 25944, dayNumber: 1 },
    { id: 25945, dayNumber: 2 },
    { id: 25946, dayNumber: 3 },
    { id: 25947, dayNumber: 4 },
  ];

  it("maps a selected hotel to its route day instead of its list position", () => {
    expect(resolveHotelEntryDayNumbers(
      { routeId: 25947, hotelName: "Southern Panorama Cruise" },
      itineraryDays,
      3,
    )).toEqual([4]);
  });

  it("keeps each route day for a multi-night hotel stay", () => {
    expect(resolveHotelEntryDayNumbers(
      { routeIds: [25944, 25945], dayNumbers: [1, 2] },
      itineraryDays,
      1,
    )).toEqual([1, 2]);
  });

  it("uses explicit day numbers when route identities are unavailable", () => {
    expect(resolveHotelEntryDayNumbers(
      { dayNumbers: [2, 3] },
      itineraryDays,
      1,
    )).toEqual([2, 3]);
  });

  it("uses the row position only when no route or day metadata exists", () => {
    expect(resolveHotelEntryDayNumbers({}, itineraryDays, 5)).toEqual([5]);
  });
});

describe("sortHotelReviewRowsChronologically", () => {
  it("orders mixed provider rows by itinerary day and keeps early check-in before its stay", () => {
    const dayOne = { day: "Day 1", routeDate: "2026-11-09", hotel: "Greenridge" };
    const earlyNight = { day: "Day 0", routeDate: "2026-11-08", hotel: "Greenridge" };
    const dayThreeSupplier = { day: "Day 3", routeDate: "2026-11-11", hotel: "Xandari Riverscapes" };
    const dayTwo = { day: "Day 2", routeDate: "2026-11-10", hotel: "Greenridge" };

    expect(sortHotelReviewRowsChronologically([dayThreeSupplier, dayOne, dayTwo, earlyNight]))
      .toEqual([earlyNight, dayOne, dayTwo, dayThreeSupplier]);
  });

  it("preserves source order for rows on the same day and date", () => {
    const first = { day: "Day 1", routeDate: "2026-11-09", hotel: "First" };
    const second = { day: "Day 1", routeDate: "2026-11-09", hotel: "Second" };
    expect(sortHotelReviewRowsChronologically([first, second])).toEqual([first, second]);
  });
});
