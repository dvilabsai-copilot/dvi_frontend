/** Itinerary presentation only. Never derive finance amounts from this data. */
export type RouteDay = {
  dayNumber: number;
  date: string;
  departure: string | null;
  arrival: string | null;
  startTime?: string;
  endTime?: string;
  distance?: string;
  viaRoutes?: { name: string }[];
  segments?: readonly object[];
};
export type RouteItinerary = { days: readonly RouteDay[]; nightCount?: number; dayCount?: number };
const text = (value: unknown) => typeof value === "string" ? value.trim() : "";
const normalized = (value: unknown) => text(value).toLowerCase();
export function orderedRouteDays(days: readonly RouteDay[]): RouteDay[] {
  return [...days].sort((a, b) => a.dayNumber - b.dayNumber);
}
export function tripDate(value: unknown): string {
  const raw = text(value);
  const dmy = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(raw);
  return dmy ? `${dmy[3]}-${dmy[2]}-${dmy[1]}` : /^\d{4}-\d{2}-\d{2}/.test(raw) ? raw.slice(0, 10) : "";
}
function consecutiveDates(a: string, b: string): boolean {
  const start = Date.parse(tripDate(a) + "T00:00:00Z");
  const end = Date.parse(tripDate(b) + "T00:00:00Z");
  return Number.isFinite(start) && end - start === 86400000;
}
export function buildRouteSummary(itinerary: RouteItinerary, arrival = "", drop = "") {
  const days = orderedRouteDays(itinerary.days);
  if (!days.length) throw new Error("Day-wise itinerary unavailable");
  // Only count complete consecutive overnight days. Never count via stops,
  // attractions, or the final drop as overnight stays.
  const expected = itinerary.nightCount ?? days.length - 1;
  const complete = expected === days.length - 1 &&
    (itinerary.dayCount == null || itinerary.dayCount === days.length) &&
    days.every((d, i) => d.dayNumber === i + 1 && (i === days.length - 1 ||
      (Boolean(text(d.arrival)) && consecutiveDates(d.date, days[i + 1].date))));
  const stays: { name: string; nights: number }[] = [];
  for (const day of days.slice(0, -1)) {
    const name = text(day.arrival);
    if (!name) continue;
    const previous = stays[stays.length - 1];
    if (previous && normalized(previous.name) === normalized(name)) previous.nights++;
    else stays.push({ name, nights: 1 });
  }
  const start = text(arrival) || text(days[0].departure) || "Arrival unavailable";
  const end = text(drop) || text(days[days.length - 1].arrival) || "Drop unavailable";
  return {
    label: [`(Arr) ${start}`, ...stays.map(s => complete ? `${s.name} ${s.nights}N` : s.name), `(Drop) ${end}`].join(" > "),
    nightsVerified: complete,
  };
}
/** Read-only, single-booking workbook data. Financial fields are intentionally excluded. */
export function itineraryExcelRows(bookingId: string, itinerary: RouteItinerary, arrival = "", drop = "") {
  const days = orderedRouteDays(itinerary.days);
  if (!days.length) throw new Error("Day-wise itinerary unavailable");
  const schedule: (string | number)[][] = [["Day", "Date", "From", "Via locations", "To", "Start time", "End time", "Distance"]];
  const activities: (string | number)[][] = [["Day", "Date", "Type", "Details", "Time / duration"]];
  for (const day of days) {
    schedule.push([day.dayNumber, tripDate(day.date), text(day.departure), (day.viaRoutes || []).map(v => text(v.name)).filter(Boolean).join(", "), text(day.arrival), text(day.startTime), text(day.endTime), text(day.distance)]);
    for (const segment of day.segments || []) {
      const s = segment as Record<string, unknown>;
      const description = [text(s.from) && text(s.to) ? `${text(s.from)} > ${text(s.to)}` : "", text(s.name), text(s.title), text(s.location), text(s.hotelName), text(s.text)].filter(Boolean).join(" / ");
      activities.push([day.dayNumber, tripDate(day.date), text(s.type), description, [text(s.timeRange), text(s.visitTime), text(s.time), text(s.duration)].filter(Boolean).join(" / ")]);
    }
  }
  return { summary: [["Booking ID", bookingId], ["Route", buildRouteSummary(itinerary, arrival, drop).label]], schedule, activities };
}
