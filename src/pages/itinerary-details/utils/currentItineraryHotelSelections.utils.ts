type HotelSelection = Record<string, unknown>;

type ItineraryDay = {
  id: number | string;
  date: string;
};

type CoveredRouteIds = (selections: Record<number, HotelSelection>) => Set<number>;

export interface CurrentItineraryHotelSelections {
  selections: Record<number, HotelSelection>;
  staleRouteIds: number[];
}

const dateOnly = (value: unknown) => String(value || '').split('T')[0];

const nextDate = (value: string) => {
  if (!value) return '';
  const date = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return '';
  date.setUTCDate(date.getUTCDate() + 1);
  return date.toISOString().split('T')[0];
};

/** Drops selections from rebuilt routes and refreshes dates from the current itinerary. */
export const normalizeHotelSelectionsForCurrentItinerary = ({
  selectedHotelBookings,
  itineraryDays,
  getCoveredRouteIdsFromHotelSelections,
}: {
  selectedHotelBookings: Record<number, HotelSelection>;
  itineraryDays: ItineraryDay[];
  getCoveredRouteIdsFromHotelSelections: CoveredRouteIds;
}): CurrentItineraryHotelSelections => {
  const currentRouteIds = new Set(
    itineraryDays
      .map((day) => Number(day.id))
      .filter((routeId) => Number.isFinite(routeId) && routeId > 0),
  );
  const dayByRouteId = new Map(itineraryDays.map((day) => [Number(day.id), day]));
  const selections: Record<number, HotelSelection> = {};
  const staleRouteIds: number[] = [];

  Object.entries(selectedHotelBookings || {}).forEach(([routeIdText, selection]) => {
    const routeId = Number(routeIdText);
    const coveredRouteIds = Array.from(
      getCoveredRouteIdsFromHotelSelections({ [routeId]: selection }),
    );
    const selectedRouteIds = coveredRouteIds.length > 0 ? coveredRouteIds : [routeId];
    if (
      !Number.isFinite(routeId) ||
      routeId <= 0 ||
      selectedRouteIds.some((coveredRouteId) => !currentRouteIds.has(coveredRouteId))
    ) {
      staleRouteIds.push(routeId);
      return;
    }

    const orderedDays = selectedRouteIds
      .map((coveredRouteId) => dayByRouteId.get(coveredRouteId))
      .filter((day): day is ItineraryDay => Boolean(day))
      .sort((left, right) => dateOnly(left.date).localeCompare(dateOnly(right.date)));
    const checkInDate = dateOnly(orderedDays[0]?.date);
    const checkOutDate = nextDate(dateOnly(orderedDays[orderedDays.length - 1]?.date));

    selections[routeId] = {
      ...selection,
      routeId,
      routeIds: selection.multiNightBooking ? selectedRouteIds : selection.routeIds,
      checkInDate: checkInDate || selection.checkInDate,
      checkOutDate: checkOutDate || selection.checkOutDate,
    };
  });

  return { selections, staleRouteIds };
};
