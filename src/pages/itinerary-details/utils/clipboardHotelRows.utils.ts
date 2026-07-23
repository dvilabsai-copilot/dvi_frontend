type UnknownRecord = Record<string, unknown>;

const asRecord = (value: unknown): UnknownRecord =>
  value !== null && typeof value === 'object' ? (value as UnknownRecord) : {};

const normalizeDate = (value: unknown): string => {
  const raw = String(value ?? '').trim();
  return raw ? raw.slice(0, 10) : '';
};
const getDayNumber = (hotel: UnknownRecord, fallback: number): number => {
  const explicitDay = Number(hotel.dayNumber || 0);
  if (Number.isFinite(explicitDay) && explicitDay > 0) return explicitDay;

  const match = String(hotel.day || '').match(/day\s*(\d+)/i);
  const parsedDay = Number(match?.[1] || 0);
  return Number.isFinite(parsedDay) && parsedDay > 0 ? parsedDay : fallback;
};

/** Adds a display-only previous-night row without creating another price line. */
export const expandHotelRowsForClipboard = (hotels: unknown[]): UnknownRecord[] =>
  hotels.flatMap((hotelValue) => {
    const hotel = asRecord(hotelValue);
    const previousNight = normalizeDate(hotel.hotelCheckInDate);

    if (
      hotel.previousDayBillingSynthetic === true ||
      hotel.earlyCheckIn !== true ||
      !previousNight
    ) {
      return [hotel];
    }

    return [
      {
        ...hotel,
        __clipboardDayZero: true,
        day: 'Day 0',
        dayNumber: 0,
        date: previousNight,
        previousDayBillingSynthetic: true,
      },
      hotel,
    ];
  });

export const getClipboardHotelDayLabel = (
  hotelValue: unknown,
  fallbackDayNumber: number,
): string => {
  const hotel = asRecord(hotelValue);
  const isDayZero = hotel.__clipboardDayZero === true || hotel.previousDayBillingSynthetic === true;
  const dayNumber = isDayZero ? 0 : getDayNumber(hotel, fallbackDayNumber);
  const date = isDayZero
    ? normalizeDate(hotel.hotelCheckInDate || hotel.date)
    : normalizeDate(hotel.date) || String(hotel.day || '').split('|')[1]?.trim() || '';

  return `Day- ${dayNumber}${date ? ` | ${date}` : ''}`;
};
