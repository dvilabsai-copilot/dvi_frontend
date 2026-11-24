/**
 * Turn a server-owned, persisted one-property TBO stay into separate supplier
 * requests. This utility never creates a rate/BookingCode and never performs
 * PreBook or Book. Persisted route-night rows are deduplicated by stay key.
 */
export type TboBatchSelection = {
  batchIndex: number;
  startRoomIndex: number;
  roomCount: number;
  bookingCode: string;
  supplierNetAmount: number;
  supplierTotalFare: number;
  hotelCode: string;
  roomType: string;
  mealPlan: string;
  currency: string;
  isRefundable: boolean;
  occupancies: Array<{ adults: number; children: number; childrenAges?: number[] }>;
};
export type SavedTboMultiBatchStay = {
  schemaVersion: 1;
  provider: 'tbo';
  hotelCode: string;
  roomType: string;
  mealPlan: string;
  currency: string;
  isRefundable: boolean;
  anchorRouteId: number;
  routeIds: number[];
  roomCount: number;
  checkInDate: string;
  checkOutDate: string;
  supplierNetAmount: number;
  supplierTotalFare: number;
  searchVerifiedAt: string;
  batches: TboBatchSelection[];
  dviMealSupplement?: { mealPlan: 'CP' | 'MAP'; breakfastRate: number; breakfastPerNight: number };
};

type Row = Record<string, unknown>;
export function formatTboRoomAllocation(batches: readonly { roomType: string; roomCount: number }[]): string {
  const counts = new Map<string, number>();
  for (const batch of batches) {
    const roomType = typeof batch?.roomType === 'string' ? batch.roomType.trim() : '';
    if (!roomType || !Number.isSafeInteger(batch.roomCount) || batch.roomCount < 1) return '';
    counts.set(roomType, (counts.get(roomType) || 0) + batch.roomCount);
  }
  if (counts.size === 1) return counts.keys().next().value || '';
  return [...counts].map(([roomType, count]) => `${count} ${count === 1 ? 'room' : 'rooms'} · ${roomType}`).join('\n');
}

type Occupancy = { adults: number; children: number; childrenAges?: number[] };
export type TboSupplierBatchBooking = {
  provider: 'tbo';
  routeId: number;
  routeIds: number[];
  hotelCode: string;
  hotelName: string;
  bookingCode: string;
  roomType: string;
  mealPlan: string;
  checkInDate: string;
  checkOutDate: string;
  numberOfRooms: number;
  batchIndex: number;
  startRoomIndex: number;
  guestNationality: string;
  netAmount: number;
  currency: string;
  isRefundable: boolean;
  searchInitiatedAt: string;
  occupancies: Occupancy[];
  passengers: Row[];
  roomPassengerIndices?: number[][];
  isBookable: true;
  availabilityStatus: 'SEARCH_MATCH_SELECTED';
};

const own = (value: unknown): Row => value && typeof value === 'object' && !Array.isArray(value)
  ? value as Row : {};
const snapshotFromRow = (row: Row): Row => {
  const raw = row.selectedPriceSnapshot ?? row.selected_price_snapshot;
  if (typeof raw === 'string') {
    try { return own(JSON.parse(raw)); } catch { return {}; }
  }
  return own(raw);
};
export const getSavedTboMultiBatchStay = (row: Row): SavedTboMultiBatchStay | null => {
  const raw = own(row.tboMultiBatchStay || snapshotFromRow(row).tboMultiBatchStay);
  return raw.schemaVersion === 1 && raw.provider === 'tbo' && Array.isArray(raw.batches)
    ? raw as unknown as SavedTboMultiBatchStay : null;
};

/** Validate before submitting anything to the supplier. */
export const assertSavedTboMultiBatchStay = (stay: SavedTboMultiBatchStay, requiredRooms: number): void => {
  const invalid = (why: string): never => { throw new Error(`Invalid saved VSR stay: ${why}. Refresh availability and select the hotel again.`); };
  if (!Number.isInteger(requiredRooms) || requiredRooms < 7 || requiredRooms > 25 ||
      stay.roomCount !== requiredRooms || stay.schemaVersion !== 1 || stay.provider !== 'tbo' ||
      !stay.hotelCode || !stay.roomType || !stay.currency ||
      !Number.isInteger(stay.anchorRouteId) || stay.anchorRouteId <= 0 ||
      !Array.isArray(stay.routeIds) || !stay.routeIds.includes(stay.anchorRouteId) ||
      new Set(stay.routeIds).size !== stay.routeIds.length ||
      !Array.isArray(stay.batches) || stay.batches.length !== Math.ceil(requiredRooms / 6)) {
    invalid('incomplete logical stay or batch count');
  }
  const nights = (Date.parse(`${stay.checkOutDate}T00:00:00Z`) - Date.parse(`${stay.checkInDate}T00:00:00Z`)) / 86400000;
  if (!Number.isInteger(nights) || nights !== stay.routeIds.length) invalid('stay dates do not match route nights');
  let netCents = 0;
  let fareCents = 0;
  const codes = new Set<string>();
  stay.batches.forEach((batch, index) => {
    if (batch.batchIndex !== index || batch.startRoomIndex !== index * 6 ||
        batch.roomCount !== Math.min(6, requiredRooms - index * 6) ||
        !String(batch.bookingCode || '').includes('!TB!') || codes.has(batch.bookingCode) ||
        batch.hotelCode !== stay.hotelCode || typeof batch.roomType !== 'string' || !batch.roomType.trim() ||
        !batch.mealPlan || batch.currency !== stay.currency ||
        batch.isRefundable !== stay.isRefundable ||
        !Number.isFinite(batch.supplierNetAmount) || batch.supplierNetAmount <= 0 ||
        !Number.isFinite(batch.supplierTotalFare) || batch.supplierTotalFare <= 0 ||
        !Array.isArray(batch.occupancies) || batch.occupancies.length !== batch.roomCount) {
      invalid(`supplier batch ${index + 1} is inconsistent`);
    }
    for (const occupancy of batch.occupancies) {
      if (!Number.isInteger(occupancy.adults) || occupancy.adults < 1 ||
          !Number.isInteger(occupancy.children) || occupancy.children < 0 ||
          !Array.isArray(occupancy.childrenAges) || occupancy.childrenAges.length !== occupancy.children ||
          occupancy.childrenAges.some((age) => !Number.isInteger(age) || age < 0 || age > 11)) {
        invalid('missing room occupant ages');
      }
    }
    codes.add(batch.bookingCode);
    netCents += Math.round(batch.supplierNetAmount * 100);
    fareCents += Math.round(batch.supplierTotalFare * 100);
  });
  if ([...new Set(stay.batches.map(batch => batch.roomType))].join(' + ') !== stay.roomType) invalid('room summary does not match batches');
  const supplierMeals = new Set(stay.batches.map(batch => batch.mealPlan));
  if (supplierMeals.size > 1) {
    const meals = stay.dviMealSupplement;
    const breakfastGuests = stay.batches.filter(batch => batch.mealPlan === 'EP').flatMap(batch => batch.occupancies)
      .reduce((guests, room) => guests + room.adults + room.children, 0);
    if (!(supplierMeals.size === 2 && supplierMeals.has('CP') && supplierMeals.has('EP') &&
        stay.mealPlan === 'EP' && stay.currency === 'INR' && meals && ['CP', 'MAP'].includes(meals.mealPlan) &&
        meals.breakfastRate > 0 && Math.round(meals.breakfastPerNight * 100) === Math.round(meals.breakfastRate * breakfastGuests * 100))) {
      invalid('supplier meal plans require a matching DVI breakfast supplement');
    }
  } else if (!supplierMeals.has(stay.mealPlan)) invalid('meal plan does not match batches');
  if (netCents !== Math.round(stay.supplierNetAmount * 100) ||
      fareCents !== Math.round(stay.supplierTotalFare * 100)) invalid('supplier fare mismatch');
};

/** Actual passenger names are required at Book time; no placeholders. */
const allocateNamedPassengers = (passengers: readonly Row[], roomOccupancies: readonly Occupancy[]): Row[][] => {
  const adults = passengers.filter((item) => Number(item.paxType || 1) === 1);
  const children = passengers.filter((item) => Number(item.paxType) === 2);
  let adultIndex = 0;
  const assignedChildren = new Set<number>();
  const roomAssignments = roomOccupancies.map((occupancy) => {
    const adultPeople = adults.slice(adultIndex, adultIndex + occupancy.adults);
    adultIndex += occupancy.adults;
    if (adultPeople.length !== occupancy.adults) throw new Error('Actual adult passenger names are missing for one or more TBO rooms.');
    const childPeople = (occupancy.childrenAges || []).map((age) => {
      const index = children.findIndex((child, childIndex) =>
        !assignedChildren.has(childIndex) && Number(child.age) === age,
      );
      if (index < 0) throw new Error('Actual passenger name/age is missing for a TBO child.');
      assignedChildren.add(index);
      return children[index];
    });
    return [...adultPeople, ...childPeople];
  });
  if (adultIndex !== adults.length || assignedChildren.size !== children.length) {
    throw new Error('The passenger list does not match the selected TBO room occupancies.');
  }
  return roomAssignments;
};

/** Expand one saved stay exactly once, even when two itinerary nights contain the same snapshot. */
export const expandSavedTboStayBookings = (
  selectedHotels: readonly Row[],
  roomCount: number,
  guestNationality: string,
  passengers: readonly Row[] = [],
  requireNamedPassengers = false,
): TboSupplierBatchBooking[] => {
  const seen = new Map<string, string>();
  const bookings: TboSupplierBatchBooking[] = [];
  for (const row of selectedHotels) {
    const stay = getSavedTboMultiBatchStay(row);
    if (!stay) continue;
    assertSavedTboMultiBatchStay(stay, roomCount);
    const key = JSON.stringify([stay.anchorRouteId, stay.hotelCode, stay.checkInDate, stay.checkOutDate]);
    const fingerprint = JSON.stringify(stay);
    const prior = seen.get(key);
    if (prior) {
      if (prior !== fingerprint) throw new Error('Conflicting saved TBO batches were found on adjacent itinerary nights.');
      continue;
    }
    seen.set(key, fingerprint);
    const roomOccupancies = stay.batches.flatMap((batch) => batch.occupancies);
    const namedByRoom = requireNamedPassengers ? allocateNamedPassengers(passengers, roomOccupancies) : [];
    stay.batches.forEach((batch) => {
      const batchRooms = namedByRoom.slice(batch.startRoomIndex, batch.startRoomIndex + batch.roomCount);
      const batchPassengers = batchRooms.flat().map((person, index) => ({ ...person, leadPassenger: index === 0 }));
      let passengerIndex = 0;
      const roomPassengerIndices = requireNamedPassengers
        ? batchRooms.map((room) => room.map(() => passengerIndex++))
        : undefined;
      bookings.push({
        provider: 'tbo', routeId: stay.anchorRouteId, routeIds: [...stay.routeIds],
        hotelCode: stay.hotelCode, hotelName: String(row.hotelName || row.hotel_name || stay.hotelCode),
        bookingCode: batch.bookingCode, roomType: batch.roomType, mealPlan: batch.mealPlan,
        checkInDate: stay.checkInDate, checkOutDate: stay.checkOutDate,
        numberOfRooms: batch.roomCount, batchIndex: batch.batchIndex,
        startRoomIndex: batch.startRoomIndex,
        guestNationality: guestNationality.trim().toUpperCase(),
        netAmount: batch.supplierNetAmount, currency: batch.currency,
        isRefundable: batch.isRefundable,
        searchInitiatedAt: stay.searchVerifiedAt,
        occupancies: batch.occupancies.map((occupancy) => ({ ...occupancy, childrenAges: [...(occupancy.childrenAges || [])] })),
        passengers: batchPassengers, roomPassengerIndices,
        isBookable: true, availabilityStatus: 'SEARCH_MATCH_SELECTED',
      });
    });
  }
  return bookings;
};
