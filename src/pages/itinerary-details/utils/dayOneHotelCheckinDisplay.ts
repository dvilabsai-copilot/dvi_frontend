
import type { ItineraryDay } from "../itinerary-details.types";

type DayOneHotelCheckinDisplay = {
  time: string;
  nextDay: boolean;
};

const parseTime = (value: unknown): number | null => {
  const match = String(value ?? "").trim().match(
    /^(\d{1,2}):(\d{2})(?::\d{2})?\s*(AM|PM)$/i,
  );

  if (!match) return null;

  const hour = Number(match[1]);
  const minute = Number(match[2]);

  if (hour < 1 || hour > 12 || minute > 59) return null;

  return (hour % 12) * 60 +
    (match[3].toUpperCase() === "PM" ? 720 : 0) +
    minute;
};

export function getDayOneHotelCheckinDisplay(
  day: Pick<ItineraryDay, "dayNumber" | "startTime" | "segments">,
): DayOneHotelCheckinDisplay | null {
  if (Number(day.dayNumber) !== 1) return null;

  const segments = day.segments ?? [];

  // Only the final destination check-in is relevant.
  const lastSegment = segments[segments.length - 1];

  if (!lastSegment || lastSegment.type !== "checkin") {
    return null;
  }

  const time = String(lastSegment.time ?? "").trim();
  const checkinMinutes = parseTime(time);

  if (checkinMinutes === null) return null;

  const previousSegment = segments[segments.length - 2];
  const startMinutes = parseTime(day.startTime);

  let nextDay = false;

  if (previousSegment?.type === "travel") {
    const match = String(previousSegment.timeRange ?? "")
      .trim()
      .match(
        /^(\d{1,2}:\d{2}(?::\d{2})?\s*[AP]M)\s*(?:-|–|->)\s*(\d{1,2}:\d{2}(?::\d{2})?\s*[AP]M)$/i,
      );

    if (match) {
      const travelStart = parseTime(match[1]);
      const travelEnd = parseTime(match[2]);

      const validTravel =
        travelStart !== null &&
        travelEnd !== null &&
        travelEnd === checkinMinutes;

      if (validTravel && startMinutes !== null) {
        const journeyStartsAfterRouteStart =
          travelStart! >= startMinutes ||
          (
            startMinutes >= 12 * 60 &&
            travelStart! < 12 * 60
          );

        nextDay =
          journeyStartsAfterRouteStart &&
          checkinMinutes < startMinutes;
      }
    }
  }

  return { time, nextDay };
}
