import type { CalendarEvent } from "@/services/calendarEvents";
import { formatCalendarEventRange, formatObservedDate, dedupeCalendarEvents } from "@/pages/CreateItinerary/helpers/calendarEvents.utils";

export function FestivalCalendarLegend({ events, isLoading, isError }: { events: CalendarEvent[]; isLoading: boolean; isError: boolean }) {
  const uniqueEvents = dedupeCalendarEvents(events);
  return (
    <div className="border-t border-[#efe7fb] px-3 py-2" aria-label="Holiday and festival legend">
      <div className="mb-1 text-[11px] font-semibold text-[#4a4260]">Holiday / festival dates</div>
      {isLoading && <div className="text-[11px] text-muted-foreground">Loading holiday information…</div>}
      {isError && <div className="text-[11px] text-muted-foreground">Holiday/festival information unavailable</div>}
      {!isLoading && !isError && uniqueEvents.length === 0 && <div className="text-[11px] text-muted-foreground">No holidays in this view</div>}
      {!isLoading && !isError && uniqueEvents.length > 0 && (
        <div className="grid max-h-28 grid-cols-1 gap-x-4 gap-y-1 overflow-y-auto sm:grid-cols-2">
          {uniqueEvents.map((event) => (
            <div key={event.id || event.eventKey} className="flex min-w-0 items-start gap-1.5 text-[11px] text-[#4a4260]" title={event.travelAdvisory || undefined}>
              <span aria-hidden="true" className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-500" />
              <span className="shrink-0 font-medium">{formatCalendarEventRange(event)}</span>
              <span className="truncate">{event.title}</span>
              {event.eventStartDate !== event.travelWindowStartDate || event.eventEndDate !== event.travelWindowEndDate ? <span className="sr-only">Observed {formatObservedDate(event)}</span> : null}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
