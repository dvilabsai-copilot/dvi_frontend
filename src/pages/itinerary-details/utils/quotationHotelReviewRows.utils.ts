type HotelEntry = Record<string, unknown>;

export type HotelReviewItineraryDay = {
  id?: number;
  routeId?: number;
  dayNumber: number;
};

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
