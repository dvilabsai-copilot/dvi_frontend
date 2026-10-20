import { isTboPrebookCandidate } from './domain.utils';
import { inferHotelProvider } from './hotelBookingNormalization.utils';
type HotelRow = Record<string, unknown>;
type HotelSelection = Record<string, unknown>;

interface QuotationPrebookSelectionOptions {
  selectedHotelBookings: Record<number, HotelSelection>;
  hotelRows: HotelRow[];
  preferredGroupType: number;
  itineraryDays: Array<{ id: number | string; date: string }>;
  normalizeHotelProvider: (hotel: HotelRow) => string;
  isSupplierBookableHotel: (hotel: HotelRow) => boolean;
  parseStaahSearchReference: (value: unknown) => { roomId?: string; rateId?: string } | null;
  getHotelSelectionAmount: (hotel: HotelRow) => number;
  getCoveredRouteIdsFromHotelSelections: (selections: Record<number, HotelSelection>) => Set<number>;
}

const parseSelectedPriceSnapshot = (hotel: HotelRow): Record<string, unknown> => {
  const raw = hotel.selectedPriceSnapshot ?? hotel.selected_price_snapshot;
  if (!raw) return {};
  if (typeof raw === 'object') return raw as Record<string, unknown>;
  try { return JSON.parse(String(raw)) as Record<string, unknown>; } catch { return {}; }
};

/** Identifies persisted hotel rows that represent an intentional own-stay choice. */
export const isUserRemovedHotel = (hotel: HotelRow): boolean =>
  String(
    hotel.selectionOrigin ||
    hotel.selection_origin ||
    parseSelectedPriceSnapshot(hotel).selectionOrigin ||
    '',
  ).trim().toUpperCase() === 'USER_REMOVED';

/** Returns every route intentionally left without a supplier hotel. */
export const getIntentionallyEmptyRouteIds = (hotelRows: HotelRow[]): Set<number> => new Set(
  hotelRows
    .filter(isUserRemovedHotel)
    .flatMap((hotel) => {
      const snapshot = parseSelectedPriceSnapshot(hotel);
      return [
        Number(hotel.itineraryRouteId || hotel.routeId || 0),
        ...(Array.isArray(hotel.routeIds) ? hotel.routeIds.map(Number) : []),
        ...(Array.isArray(snapshot.removedRouteIds) ? snapshot.removedRouteIds.map(Number) : []),
      ];
    })
    .filter((routeId) => routeId > 0),
);

export interface QuotationPrebookSelections {
  selectedHotelsForPrebook: Record<number, HotelSelection>;
  mergedPersisted: Record<number, HotelSelection>;
  autoSelections: Record<number, HotelSelection>;
}

/** Selects persisted rows first, then cheapest supplier rows, without mutating React state. */
export const prepareQuotationPrebookSelections = ({
  selectedHotelBookings,
  hotelRows,
  preferredGroupType,
  itineraryDays,
  normalizeHotelProvider,
  isSupplierBookableHotel,
  parseStaahSearchReference,
  getHotelSelectionAmount,
  getCoveredRouteIdsFromHotelSelections,
}: QuotationPrebookSelectionOptions): QuotationPrebookSelections => {
  const removedRouteIds = getIntentionallyEmptyRouteIds(hotelRows);
  let selectedHotelsForPrebook = Object.fromEntries(
    Object.entries(selectedHotelBookings).filter(([routeId, hotel]) =>
      !isUserRemovedHotel(hotel) && !removedRouteIds.has(Number(routeId))),
  );
  const persistedSelections: Record<number, HotelSelection> = {};
  const rows = hotelRows.filter(
    (hotel) => Number(hotel.groupType) === Number(preferredGroupType) &&
      !isUserRemovedHotel(hotel) &&
      !removedRouteIds.has(Number(hotel.itineraryRouteId || hotel.routeId || 0)) &&
      (isSupplierBookableHotel(hotel) || isTboPrebookCandidate(hotel)),
  );

  const toSelection = (hotel: HotelRow, routeId: number): HotelSelection => {
    const routeDay = itineraryDays.find((day) => Number(day.id) === routeId);
    const checkInDate = routeDay ? String(routeDay.date).split('T')[0] : '';
    const checkOutDate = routeDay
      ? new Date(new Date(String(routeDay.date)).getTime() + 86400000).toISOString().split('T')[0]
      : '';
    const reference = hotel.searchReference || hotel.bookingCode;
    const supplierBookable = isSupplierBookableHotel(hotel) || isTboPrebookCandidate(hotel);
    return {
      provider: inferHotelProvider(hotel),
      hotelCode: String(hotel.hotelCode || hotel.hotelId || ''),
      bookingCode: String(hotel.bookingCode || hotel.searchReference || ''),
      searchReference: String(reference || '').trim() || undefined,
      roomId: parseStaahSearchReference(reference)?.roomId || undefined,
      rateId: parseStaahSearchReference(reference)?.rateId || undefined,
      roomType: hotel.roomType || 'Standard',
      netAmount: getHotelSelectionAmount(hotel),
      hotelName: hotel.hotelName,
      checkInDate,
      checkOutDate,
      searchInitiatedAt: new Date().toISOString(),
      groupType: preferredGroupType,
      isBookable: hotel.isBookable ?? supplierBookable,
      externalStay: hotel.externalStay,
      availabilityStatus: hotel.availabilityStatus || (supplierBookable ? 'AVAILABLE' : 'NO_SUPPLIER_AVAILABILITY'),
      availabilityMessage: hotel.availabilityMessage || (supplierBookable ? null : undefined),
    };
  };

  rows.forEach((hotel) => {
    const routeId = Number(hotel.itineraryRouteId || 0);
    if (routeId && Number(hotel.itineraryPlanHotelDetailsId || 0) > 0) {
      persistedSelections[routeId] = { ...toSelection(hotel, routeId), isBookable: true, externalStay: false, availabilityStatus: 'AVAILABLE', availabilityMessage: null };
    }
  });

  const mergedPersisted: Record<number, HotelSelection> = {};
  Object.entries(persistedSelections).forEach(([routeId, selection]) => {
    const routeIdNum = Number(routeId);
    if (!getCoveredRouteIdsFromHotelSelections(selectedHotelsForPrebook).has(routeIdNum)) {
      mergedPersisted[routeIdNum] = selection;
    }
  });
  selectedHotelsForPrebook = { ...selectedHotelsForPrebook, ...mergedPersisted };

  const routeBuckets = new Map<number, HotelRow[]>();
  rows.forEach((hotel) => {
    const routeId = Number(hotel.itineraryRouteId || 0);
    if (!routeId) return;
    if (!routeBuckets.has(routeId)) routeBuckets.set(routeId, []);
    routeBuckets.get(routeId)!.push(hotel);
  });

  const autoSelections: Record<number, HotelSelection> = {};
  routeBuckets.forEach((routeHotels, routeId) => {
    if (getCoveredRouteIdsFromHotelSelections(selectedHotelsForPrebook).has(routeId)) return;
    const cheapest = routeHotels.reduce((best, current) => {
      const bestTotal = Number(best.totalHotelCost || 0) + Number(best.totalHotelTaxAmount || 0);
      const currentTotal = Number(current.totalHotelCost || 0) + Number(current.totalHotelTaxAmount || 0);
      return currentTotal < bestTotal ? current : best;
    });
    if (isSupplierBookableHotel(cheapest) || isTboPrebookCandidate(cheapest)) {
      autoSelections[routeId] = toSelection(cheapest, routeId);
    }
  });

  return {
    selectedHotelsForPrebook: { ...selectedHotelsForPrebook, ...autoSelections },
    mergedPersisted,
    autoSelections,
  };
};
