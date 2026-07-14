type HotelBooking = Record<string, unknown>;
type PrebookEntry = Record<string, unknown>;

interface QuotationHotelRouteContextOptions {
  requiresHotelBookingFlow: boolean;
  hotelBookings: readonly HotelBooking[];
  prebookHotelEntries: readonly PrebookEntry[];
  externalStayEntries: readonly Record<string, unknown>[];
}

export interface QuotationHotelRouteContext {
  hotelBookingsWithPrebookContext: HotelBooking[];
  selectedHotelRouteIds: number[];
  externalStayRouteIds: number[];
}

/** Attaches matching prebook context and derives the route-id lists for confirmation. */
export const buildQuotationHotelRouteContext = ({
  requiresHotelBookingFlow,
  hotelBookings,
  prebookHotelEntries,
  externalStayEntries,
}: QuotationHotelRouteContextOptions): QuotationHotelRouteContext => {
  if (!requiresHotelBookingFlow) {
    return { hotelBookingsWithPrebookContext: [], selectedHotelRouteIds: [], externalStayRouteIds: [] };
  }

  const hotelBookingsWithPrebookContext = hotelBookings.map((booking) => {
    const matchingPrebook = prebookHotelEntries.find(
      (item) =>
        Number(item.routeId) === Number(booking.routeId) &&
        String(item.hotelCode || '') === String(booking.hotelCode || ''),
    );
    return { ...booking, prebookContext: matchingPrebook?.prebookContext } as HotelBooking;
  });

  const selectedHotelRouteIds = Array.from(new Set(
    hotelBookingsWithPrebookContext
      .flatMap((booking) =>
        Array.isArray(booking.routeIds) && booking.routeIds.length > 0
          ? booking.routeIds
          : [booking.routeId],
      )
      .map((routeId) => Number(routeId || 0))
      .filter((routeId) => Number.isFinite(routeId) && routeId > 0),
  ));

  const externalStayRouteIds = externalStayEntries
    .map((entry) => Number(entry.routeId || 0))
    .filter((routeId) => Number.isFinite(routeId) && routeId > 0);

  return { hotelBookingsWithPrebookContext, selectedHotelRouteIds, externalStayRouteIds };
};
