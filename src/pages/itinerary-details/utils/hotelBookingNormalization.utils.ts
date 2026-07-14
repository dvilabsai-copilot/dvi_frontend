type UnknownRecord = Record<string, unknown>;

const asRecord = (value: unknown): UnknownRecord =>
  value !== null && typeof value === 'object' ? (value as UnknownRecord) : {};

export type HotelProvider = 'tbo' | 'resavenue' | 'hobse' | 'axisrooms' | 'staah';

export const inferHotelProvider = (entry: unknown): HotelProvider => {
  const row = asRecord(entry);
  const provider = String(row.provider || '').trim().toLowerCase();
  if (provider === 'tbo' || provider === 'resavenue' || provider === 'hobse' || provider === 'axisrooms' || provider === 'staah') {
    return provider;
  }
  const bookingCode = String(row.bookingCode || '').trim().toUpperCase();
  if (bookingCode.includes('!TB!')) return 'tbo';
  if (bookingCode.startsWith('STAAH-')) return 'staah';
  return 'tbo';
};

export const normalizeHotelProvider = (entry: unknown): string => String(asRecord(entry).provider || '').trim().toLowerCase();

export const getHotelCodeForBooking = (entry: unknown): string => {
  const row = asRecord(entry);
  return String(row.hotelCode || row.hotelId || '').trim();
};

export const getBookingCodeForBooking = (entry: unknown): string => {
  const row = asRecord(entry);
  const roomTypes = Array.isArray(row.roomTypes) ? asRecord(row.roomTypes[0]) : {};
  return String(row.bookingCode || row.searchReference || roomTypes.roomCode || '').trim();
};

export const parseStaahSearchReference = (reference: unknown): { propertyId: string; roomId: string; rateId: string } | null => {
  const raw = String(reference || '').trim();
  if (!raw.startsWith('STAAH-')) return null;
  const parts = raw.split('-');
  if (parts.length < 5) return null;
  const propertyId = String(parts[1] || '').trim();
  const roomId = String(parts[2] || '').trim();
  const rateId = String(parts[3] || '').trim();
  if (!propertyId || !roomId || !rateId) return null;
  return { propertyId, roomId, rateId };
};

export const getHotelAmountForBooking = (entry: unknown): number => {
  const row = asRecord(entry);
  const netAmount = Number(row.netAmount);
  if (Number.isFinite(netAmount) && netAmount > 0) return netAmount;
  const computedAmount = Number(row.totalHotelCost || 0) + Number(row.totalHotelTaxAmount || 0);
  if (Number.isFinite(computedAmount) && computedAmount > 0) return computedAmount;
  const price = Number(row.price);
  return Number.isFinite(price) && price > 0 ? price : 0;
};

export const isNoHotelAvailableEntry = (entry: unknown): boolean => {
  const row = asRecord(entry);
  const hotelName = String(row.hotelName || '').trim().toLowerCase();
  const hotelCode = getHotelCodeForBooking(row);
  const provider = normalizeHotelProvider(row);
  const availabilityStatus = String(row.availabilityStatus || '').trim().toUpperCase();
  return row.externalStay === true || row.isBookable === false ||
    availabilityStatus === 'NO_SUPPLIER_AVAILABILITY' || availabilityStatus === 'NOT_BOOKABLE' ||
    provider === 'external' || provider === 'none' || provider === 'self-arranged' ||
    hotelName === 'no hotels available' || !hotelCode || hotelCode === '0';
};
