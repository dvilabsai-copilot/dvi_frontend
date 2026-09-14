import type { CalendarEvent } from "@/services/calendarEvents";
import { dedupeCalendarEvents, formatCalendarEventRange } from "@/pages/CreateItinerary/helpers/calendarEvents.utils";

export function TripFestivalWarnings({ events }: { events: CalendarEvent[] }) {
  const uniqueEvents = dedupeCalendarEvents(events);
  if (!uniqueEvents.length) return null;
  const visible = uniqueEvents.slice(0, 3);
  return (
    <div className="mt-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-950" role="status">
      <div className="font-semibold">Festival / holiday impact</div>
      <div className="mt-1">Your itinerary overlaps:</div>
      <ul className="mt-1 list-disc pl-4">
        {visible.map((event) => <li key={event.id || event.eventKey}>{event.title} — {formatCalendarEventRange(event)}{event.travelImpact !== "UNSPECIFIED" ? ` (${event.travelImpact})` : ""}{event.travelAdvisory ? ` — ${event.travelAdvisory}` : ""}</li>)}
      </ul>
      {uniqueEvents.length > visible.length && <div className="mt-1">and {uniqueEvents.length - visible.length} more</div>}
    </div>
  );
}
