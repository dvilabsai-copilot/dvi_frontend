import { useCallback, useMemo } from "react";

interface HotelSelectionCoverageBooking {
  routeIds?: number[];
  multiNightBooking?: boolean;
}

interface HotelSelectionCoverageOptions {
  selectedHotelBookings: Record<number, HotelSelectionCoverageBooking>;
}

/** Derives every route covered by selected single-night or multi-night hotel bookings. */
export const useHotelSelectionCoverage = ({
  selectedHotelBookings,
}: HotelSelectionCoverageOptions) => {
  const getCoveredRouteIdsFromHotelSelections = useCallback((selections: Record<number, HotelSelectionCoverageBooking>) => {
    const covered = new Set<number>();

    Object.entries(selections || {}).forEach(([routeIdRaw, hotel]) => {
      const fallbackRouteId = Number(routeIdRaw);
      const routeIds = Array.isArray(hotel?.routeIds)
        ? hotel.routeIds.map((id) => Number(id)).filter((id: number) => Number.isFinite(id) && id > 0)
        : [];

      if (hotel?.multiNightBooking && routeIds.length > 1) {
        routeIds.forEach((routeId: number) => covered.add(routeId));
        return;
      }

      if (Number.isFinite(fallbackRouteId) && fallbackRouteId > 0) {
        covered.add(fallbackRouteId);
      }
    });

    return covered;
  }, []);

  const selectedHotelCoveredRouteIds = useMemo(
    () => getCoveredRouteIdsFromHotelSelections(selectedHotelBookings),
    [getCoveredRouteIdsFromHotelSelections, selectedHotelBookings],
  );

  return { getCoveredRouteIdsFromHotelSelections, selectedHotelCoveredRouteIds };
};
