type HotelEntry = Record<string, unknown>;

export type HotelReviewItineraryDay = {
  id?: number;
  routeId?: number;
  dayNumber: number;
};

export type HotelReviewDisplayRow = {
  day: string;
  routeDate?: string;
};

/** Sort provider-grouped hotel rows into itinerary order without breaking ties. */
export const sortHotelReviewRowsChronologically = <T extends HotelReviewDisplayRow>(
  rows: readonly T[],
): T[] => rows
  .map((row, index) => ({ row, index }))
  .sort((left, right) => {
    const leftDay = Number(left.row.day.match(/\d+/)?.[0] || Number.MAX_SAFE_INTEGER);
    const rightDay = Number(right.row.day.match(/\d+/)?.[0] || Number.MAX_SAFE_INTEGER);
    return leftDay - rightDay
      || String(left.row.routeDate || "").localeCompare(String(right.row.routeDate || ""))
      || left.index - right.index;
  })
  .map(({ row }) => row);

/** Prefer the itinerary route identity over the entry's position in a grouped list. */
export const resolveHotelEntryDayNumbers = (
  hotel: HotelEntry,
  itineraryDays: readonly HotelReviewItineraryDay[],
  fallbackDayNumber: number,
): number[] => {
  const routeIds = Array.isArray(hotel.routeIds) && hotel.routeIds.length > 0
    ? hotel.routeIds
    : [hotel.routeId || hotel.itineraryRouteId];
  const dayNumbersFromRoutes = routeIds
    .map(Number)
    .map((routeId) => itineraryDays.find((day) => Number(day.id || day.routeId || 0) === routeId)?.dayNumber)
    .filter((dayNumber): dayNumber is number => Number.isFinite(Number(dayNumber)) && Number(dayNumber) > 0);

  if (dayNumbersFromRoutes.length > 0) return dayNumbersFromRoutes;

  const explicitDayNumbers = Array.isArray(hotel.dayNumbers)
    ? hotel.dayNumbers.map(Number).filter((dayNumber) => Number.isFinite(dayNumber) && dayNumber > 0)
    : [];
  if (explicitDayNumbers.length > 0) return explicitDayNumbers;

  const explicitDayNumber = Number(hotel.dayNumber || hotel.day || hotel.routeDayNumber || 0);
  return [explicitDayNumber > 0 ? explicitDayNumber : fallbackDayNumber];
};
