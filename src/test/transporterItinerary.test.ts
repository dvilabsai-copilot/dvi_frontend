import { describe, expect, it } from "vitest";
import { buildRouteSummary, itineraryExcelRows, tripDate, type RouteDay } from "../pages/accounts/transporterItinerary";
const day = (dayNumber: number, departure: string, arrival: string): RouteDay => ({
  dayNumber, date: `2026-12-${String(21 + dayNumber).padStart(2, "0")}`, departure, arrival,
  viaRoutes: [{ name: "Sightseeing stop" }], segments: [{ type: "travel", from: departure, to: arrival, amount: 12345 }],
});
const days = [day(1,"Cochin Airport","Munnar"), day(2,"Munnar","Munnar"), day(3,"Munnar","Alleppey"), day(4,"Alleppey","Alleppey"), day(5,"Alleppey","Cochin Airport")];
describe("Accounts transporter itinerary display", () => {
  it("counts consecutive overnight destinations, never via stops or final drop", () => {
    expect(buildRouteSummary({ days, nightCount: 4, dayCount: 5 })).toEqual({label: "(Arr) Cochin Airport > Munnar 2N > Alleppey 2N > (Drop) Cochin Airport", nightsVerified: true});
  });
  it("sorts day order and preserves repeated non-consecutive stays separately", () => {
    const result = buildRouteSummary({ days: [day(4,"Munnar","Airport"),day(3,"Alleppey","Munnar"),day(1,"Airport","Munnar"),day(2,"Munnar","Alleppey")], nightCount: 3 });
    expect(result.label).toBe("(Arr) Airport > Munnar 1N > Alleppey 1N > Munnar 1N > (Drop) Airport");
  });
  it("does not invent nights for same-day trips", () => {
    expect(buildRouteSummary({days: [day(1,"Airport","Hotel")], nightCount: 0}).label).toBe("(Arr) Airport > (Drop) Hotel");
  });
  it("marks missing itinerary nights unverified instead of inventing counts", () => {
    const result = buildRouteSummary({days: [days[0], days[2], days[4]], nightCount: 4});
    expect(result.nightsVerified).toBe(false);
    expect(result.label).not.toMatch(/\dN/);
  });
  it("exports only one itinerary and excludes financial amounts", () => {
    const rows = itineraryExcelRows("DVI2026105-R1", {days,nightCount:4});
    expect(rows.summary[0]).toEqual(["Booking ID", "DVI2026105-R1"]);
    expect(rows.schedule).toHaveLength(6);
    expect(rows.activities).toHaveLength(6);
    expect(JSON.stringify(rows)).not.toContain("12345");
  });
  it("handles DD/MM/YYYY and ISO date formats", () => {
    expect(tripDate("22/12/2026")).toBe("2026-12-22");
    expect(tripDate("2026-12-26T00:00:00Z")).toBe("2026-12-26");
  });
});
