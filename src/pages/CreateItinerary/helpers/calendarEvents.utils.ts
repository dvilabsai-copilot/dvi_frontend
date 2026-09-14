import { addDays, format, isBefore, parse } from "date-fns";
import type { CalendarEvent } from "@/services/calendarEvents";

export function normalizeCalendarLocationNames(values: unknown[]): string[] {
  const unique = new Map<string, string>();
  values
    .map((value) => String(value ?? "").trim())
    .filter(Boolean)
    .forEach((value) => {
      const key = value.toLocaleLowerCase();
      if (!unique.has(key)) unique.set(key, value);
    });
  return Array.from(unique.values()).sort((a, b) => a.localeCompare(b));
}

export function calendarDateKey(date: Date): string {
  return format(date, "yyyy-MM-dd");
}

function parseCalendarDate(value: string): Date {
  return parse(value, "yyyy-MM-dd", new Date());
}

function compareCalendarEvents(a: CalendarEvent, b: CalendarEvent): number {
  const impactRank: Record<string, number> = { HIGH: 3, MEDIUM: 2, LOW: 1, UNSPECIFIED: 0 };
  return (b.sortPriority - a.sortPriority)
    || ((impactRank[b.travelImpact] || 0) - (impactRank[a.travelImpact] || 0))
    || a.title.localeCompare(b.title)
    || a.id.localeCompare(b.id);
}

export function getEventsByTravelDate(events: CalendarEvent[]): Map<string, CalendarEvent[]> {
  const result = new Map<string, CalendarEvent[]>();
  for (const event of dedupeCalendarEvents(events)) {
    let date = parseCalendarDate(event.travelWindowStartDate);
    const end = parseCalendarDate(event.travelWindowEndDate);
    while (!isBefore(end, date)) {
      const key = calendarDateKey(date);
      result.set(key, [...(result.get(key) || []), event].sort(compareCalendarEvents));
      date = addDays(date, 1);
    }
  }
  return result;
}

export function getEventsByActualStartDate(events: CalendarEvent[]): Map<string, CalendarEvent[]> {
  const result = new Map<string, CalendarEvent[]>();
  for (const event of dedupeCalendarEvents(events)) {
    const key = event.eventStartDate;
    result.set(key, [...(result.get(key) || []), event].sort(compareCalendarEvents));
  }
  return result;
}

export function dedupeCalendarEvents(events: CalendarEvent[]): CalendarEvent[] {
  return Array.from(new Map(events.map((event) => [event.id || event.eventKey, event])).values());
}

export function eventsOverlapTrip(events: CalendarEvent[], from: string, to: string): CalendarEvent[] {
  return dedupeCalendarEvents(events).filter(
    (event) => event.travelWindowStartDate <= to && event.travelWindowEndDate >= from,
  );
}

export function formatCalendarEventRange(event: CalendarEvent): string {
  const start = parseCalendarDate(event.travelWindowStartDate);
  const end = parseCalendarDate(event.travelWindowEndDate);
  return calendarDateKey(start) === calendarDateKey(end)
    ? format(start, "dd MMM")
    : `${format(start, "dd MMM")}–${format(end, "dd MMM")}`;
}

export function formatObservedDate(event: CalendarEvent): string {
  return format(parseCalendarDate(event.eventStartDate), "dd MMM yyyy");
}
