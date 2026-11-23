/**
 * Verify TBO/VSR selections before any supplier PreBook/Book request.
 * This does not synthesize rates, BookingCodes or supplier availability.
 */
type Booking = Record<string, unknown>;
const isTbo = (row: Booking): boolean =>
  ['tbo', 'vsr'].includes(String(row.provider || '').trim().toLowerCase());

export function getTboMultiBatchValidationError(
  bookings: readonly Booking[],
  expectedRoomCount: number,
): string | null {
  if (expectedRoomCount <= 6) return null;
  const tbo = bookings.filter(isTbo);
  if (!tbo.length) return null;
  const blocked = 'The 6+2 VSR room selection is incomplete. Re-search and select each supplier batch before confirming.';
  if (!Number.isSafeInteger(expectedRoomCount) || expectedRoomCount > 25) return blocked;

  const byRoute = new Map<number, Booking[]>();
  for (const row of tbo) {
    const routeId = Number(row.routeId);
    if (!Number.isSafeInteger(routeId) || routeId <= 0) return blocked;
    byRoute.set(routeId, [...(byRoute.get(routeId) || []), row]);
  }

  for (const rows of byRoute.values()) {
    const first = rows[0];
    const hotelKey = [first.hotelCode, first.checkInDate, first.checkOutDate].map(String).join('|');
    if (rows.some((row) =>
      [row.hotelCode, row.checkInDate, row.checkOutDate].map(String).join('|') !== hotelKey
    )) return blocked;
    const sorted = [...rows].sort((a,b) => Number(a.batchIndex) - Number(b.batchIndex));
    const expectedBatches = Math.ceil(expectedRoomCount / 6);
    if (sorted.length !== expectedBatches) return blocked;
    const usedCodes = new Set<string>();
    let nextRoomIndex = 0;
    for (let i = 0; i < sorted.length; i++) {
      const row = sorted[i];
      const rooms = Number(row.numberOfRooms);
      const code = String(row.bookingCode || '').trim();
      const amount = Number(row.netAmount);
      const expectedRoomsInBatch = Math.min(6, expectedRoomCount - nextRoomIndex);
      if (
        Number(row.batchIndex) !== i ||
        Number(row.startRoomIndex) !== nextRoomIndex ||
        rooms !== expectedRoomsInBatch ||
        !code.includes('!TB!') || usedCodes.has(code) ||
        !Number.isFinite(amount) || amount <= 0
      ) return blocked;
      const occupancies = row.occupancies;
      if (Array.isArray(occupancies) && occupancies.length !== rooms) return blocked;
      usedCodes.add(code);
      nextRoomIndex += rooms;
    }
    if (nextRoomIndex !== expectedRoomCount) return blocked;
  }
  return null;
}
