
import type { RouteRow } from "./useItineraryRoutes";

const BREAK_MINUTES = 10;
const DAY_MS = 24 * 60 * 60 * 1000;

const pad = (value: number) => String(value).padStart(2, "0");

const parseSavedDateTime = (value: unknown): Date | null => {
  const match = String(value ?? "").match(
    /^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})/,
  );
  if (!match) return null;

  const [, y, m, d, hour, minute] = match;
  const date = new Date(
    Number(y),
    Number(m) - 1,
    Number(d),
    Number(hour),
    Number(minute),
  );

  if (
    date.getFullYear() !== Number(y) ||
    date.getMonth() !== Number(m) - 1 ||
    date.getDate() !== Number(d) ||
    date.getHours() !== Number(hour) ||
    date.getMinutes() !== Number(minute)
  ) {
    return null;
  }

  return date;
};

const formatDate = (date: Date) =>
  `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()}`;

const formatTime = (date: Date) =>
  `${pad(date.getHours())}:${pad(date.getMinutes())}`;

const calendarDayNumber = (date: Date) =>
  Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / DAY_MS;

export const buildAddRoutePrefill = (previous: any) => {
  const plan = previous?.plan;

  const previousStart = parseSavedDateTime(
    plan?.trip_start_date_and_time,
  );
  const previousEnd = parseSavedDateTime(
    plan?.trip_end_date_and_time,
  );

  if (!previousStart || !previousEnd || previousEnd < previousStart) {
    throw new Error("Previous itinerary dates are invalid.");
  }

  const nextStart = new Date(
    previousEnd.getTime() + BREAK_MINUTES * 60_000,
  );

  // Copy the previous journey's calendar-day duration.
  const previousDaySpan = Math.max(
    0,
    calendarDayNumber(previousEnd) - calendarDayNumber(previousStart),
  );

  const nextEnd = new Date(nextStart);
  nextEnd.setDate(nextEnd.getDate() + previousDaySpan);
  nextEnd.setHours(previousEnd.getHours(), previousEnd.getMinutes(), 0, 0);

  if (nextEnd <= nextStart) {
    nextEnd.setDate(nextEnd.getDate() + 1);
  }

  const totalDays =
    calendarDayNumber(nextEnd) - calendarDayNumber(nextStart) + 1;

  const previousDeparture = String(
    plan?.departure_location ?? "",
  ).trim();

  const oldRoutes = Array.isArray(previous?.routes)
    ? previous.routes
    : [];

  const routeDetails: RouteRow[] = Array.from(
    { length: totalDays },
    (_, index) => {
      const date = new Date(nextStart);
      date.setDate(date.getDate() + index);

      const previousDestination = String(
        oldRoutes[index]?.next_visiting_location ?? "",
      ).trim();

      const previousDayDestination = String(
        oldRoutes[index - 1]?.next_visiting_location ?? "",
      ).trim();

      return {
        id: index + 1,
        itinerary_route_id: undefined,
        day: index + 1,
        date: formatDate(date),
        source:
          index === 0
            ? previousDeparture
            : previousDayDestination || previousDeparture,
        next:
          index === totalDays - 1
            ? previousDeparture
            : previousDestination,
        via: "",
        via_routes: [],
        no_of_km: 0,
        directVisit: "No",
      };
    },
  );

  return {
    arrivalLocation: previousDeparture,
    departureLocation: previousDeparture,
    tripStartDate: formatDate(nextStart),
    tripEndDate: formatDate(nextEnd),
    startTime: formatTime(nextStart),
    endTime: formatTime(nextEnd),
    routeDetails,
  };
};

export const isAddRouteStartValid = (
  dateValue: string,
  timeValue: string,
  previousEndValue: unknown,
): boolean => {
  const previousEnd = parseSavedDateTime(previousEndValue);
  const dateMatch = dateValue.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  const timeMatch = timeValue.match(/^(\d{2}):(\d{2})$/);

  if (!previousEnd || !dateMatch || !timeMatch) return false;

  const candidate = new Date(
    Number(dateMatch[3]),
    Number(dateMatch[2]) - 1,
    Number(dateMatch[1]),
    Number(timeMatch[1]),
    Number(timeMatch[2]),
  );

  return (
    !Number.isNaN(candidate.getTime()) &&
    candidate.getTime() >=
      previousEnd.getTime() + BREAK_MINUTES * 60_000
  );
};
