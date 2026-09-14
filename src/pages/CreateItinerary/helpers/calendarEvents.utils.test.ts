import { describe, expect, it } from "vitest";
import {
  dedupeCalendarEvents,
  eventsOverlapTrip,
  getEventsByActualStartDate,
  getEventsByTravelDate,
  normalizeCalendarLocationNames,
} from "./calendarEvents.utils";
import type { CalendarEvent } from "@/services/calendarEvents";

const event = (overrides: Partial<CalendarEvent> = {}): CalendarEvent => ({
  id: "1", eventKey: "diwali", title: "Diwali / Deepavali", shortTitle: "Diwali", eventType: "FESTIVAL", sortPriority: 100,
  eventStartDate: "2026-11-08", eventEndDate: "2026-11-08", travelWindowStartDate: "2026-11-07", travelWindowEndDate: "2026-11-09",
  isPublicHoliday: true, travelImpact: "HIGH", description: null, travelAdvisory: null, scopes: [], ...overrides,
});

describe("calendar event utilities", () => {
  it("normalizes and sorts itinerary locations", () => {
    expect(normalizeCalendarLocationNames([" Madurai ", "Chennai", "madurai", ""])).toEqual(["Chennai", "Madurai"]);
  });

  it("maps every travel-window day but labels only the actual start", () => {
    const item = event();
    expect(Array.from(getEventsByTravelDate([item]).keys())).toEqual(["2026-11-07", "2026-11-08", "2026-11-09"]);
    expect(getEventsByActualStartDate([item]).get("2026-11-08")).toHaveLength(1);
    expect(getEventsByActualStartDate([item]).get("2026-11-07")).toBeUndefined();
  });

  it("preserves multiple events and removes duplicate response scopes", () => {
    const second = event({ id: "2", eventKey: "dussehra", title: "Dussehra" });
    expect(getEventsByTravelDate([event(), event(), second]).get("2026-11-08")).toHaveLength(2);
    expect(dedupeCalendarEvents([event(), event()])).toHaveLength(1);
  });

  it("uses inclusive selected-trip overlap", () => {
    expect(eventsOverlapTrip([event()], "2026-11-09", "2026-11-09")).toHaveLength(1);
    expect(eventsOverlapTrip([event()], "2026-11-10", "2026-11-11")).toHaveLength(0);
  });
});
