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
    const bookingRouteId = Number(booking.routeId || 0);
    const bookingHotelCode = String(booking.hotelCode || '').trim();

    const bookingCode = String(booking.bookingCode || '').trim();
    const hasBatchIdentity = booking.batchIndex !== undefined || booking.startRoomIndex !== undefined;
    const batchIndex = Number(booking.batchIndex ?? 0);
    const startRoomIndex = Number(booking.startRoomIndex ?? 0);

    const routeMatches = prebookHotelEntries.filter(
      (item) =>
        Number(item.routeId || 0) === bookingRouteId &&
        String(item.hotelCode || '').trim() === bookingHotelCode,
    );
    const matchingByIdentity = routeMatches.filter((item) => {
      const context = item.prebookContext && typeof item.prebookContext === 'object'
        ? item.prebookContext as PrebookEntry
        : {};
      const prebookCode = String(item.bookingCode || context.bookingCode || '').trim();
      if (bookingCode && prebookCode !== bookingCode) return false;
      if (!hasBatchIdentity) return true;
      return Number(item.batchIndex ?? context.batchIndex ?? -1) === batchIndex &&
        Number(item.startRoomIndex ?? context.startRoomIndex ?? -1) === startRoomIndex;
    });

    // Never attach a different batch's PreBook context, even for the same
    // hotel and itinerary route. Ambiguous matches must fail closed.
    const matchingPrebook = matchingByIdentity.length === 1
      ? matchingByIdentity[0]
      : undefined;

    return {
      ...booking,
      prebookContext: matchingPrebook?.prebookContext ?? booking.prebookContext,
    } as HotelBooking;
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

const selectedHotelRouteIdSet =
  new Set(selectedHotelRouteIds);

/*
 * A route covered by a real hotel_booking must never also
 * be submitted as an external/self-arranged stay.
 */
const externalStayRouteIds =
  Array.from(
    new Set(
      externalStayEntries
        .map((entry) =>
          Number(entry.routeId || 0),
        )
        .filter(
          (routeId) =>
            Number.isFinite(routeId) &&
            routeId > 0 &&
            !selectedHotelRouteIdSet.has(routeId),
        ),
    ),
  );

return {
  hotelBookingsWithPrebookContext,
  selectedHotelRouteIds,
  externalStayRouteIds,
};
};
