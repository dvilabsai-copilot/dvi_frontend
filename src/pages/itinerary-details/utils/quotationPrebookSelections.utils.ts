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
  let selectedHotelsForPrebook = { ...selectedHotelBookings };
  const persistedSelections: Record<number, HotelSelection> = {};
  const rows = hotelRows.filter(
    (hotel) => Number(hotel.groupType) === Number(preferredGroupType) && isSupplierBookableHotel(hotel),
  );

  const toSelection = (hotel: HotelRow, routeId: number): HotelSelection => {
    const routeDay = itineraryDays.find((day) => Number(day.id) === routeId);
    const checkInDate = routeDay ? String(routeDay.date).split('T')[0] : '';
    const checkOutDate = routeDay
      ? new Date(new Date(String(routeDay.date)).getTime() + 86400000).toISOString().split('T')[0]
      : '';
    const reference = hotel.searchReference || hotel.bookingCode;
    const supplierBookable = isSupplierBookableHotel(hotel);
    return {
      provider: normalizeHotelProvider(hotel) || 'tbo',
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
      externalStay: hotel.externalStay ?? !supplierBookable,
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
    if (isSupplierBookableHotel(cheapest)) autoSelections[routeId] = toSelection(cheapest, routeId);
  });

  return {
    selectedHotelsForPrebook: { ...selectedHotelsForPrebook, ...autoSelections },
    mergedPersisted,
    autoSelections,
  };
};
