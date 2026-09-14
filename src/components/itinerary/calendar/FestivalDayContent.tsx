import { format } from "date-fns";
import type { CalendarEvent } from "@/services/calendarEvents";

export function FestivalDayContent({ date, events = [], actualEvents = [] }: {
  date: Date;
  events?: CalendarEvent[];
  actualEvents?: CalendarEvent[];
}) {
  const label = actualEvents[0]?.shortTitle || actualEvents[0]?.title;
  const extra = actualEvents.length > 1 ? ` +${actualEvents.length - 1}` : "";
  const title = events.map((event) => event.title).join("; ");
  return (
    <span className="flex h-full w-full flex-col items-center justify-center leading-none" title={title || undefined}>
      {label && <span className="max-w-full truncate px-0.5 text-[8px] font-semibold text-amber-800">{label}{extra}</span>}
      <span>{format(date, "d")}</span>
      {events.length > 0 && <span aria-hidden="true" className="mt-0.5 h-1 w-5 rounded-full bg-amber-500" />}
    </span>
  );
}
