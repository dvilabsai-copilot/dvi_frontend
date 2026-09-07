type UnknownRecord = Record<string, unknown>;

const asRecord = (value: unknown): UnknownRecord =>
  value !== null && typeof value === 'object' ? (value as UnknownRecord) : {};

const normalizeDate = (value: unknown): string => {
  const raw = String(value ?? '').trim();
  return raw ? raw.slice(0, 10) : '';
};

const isEarlyCheckIn = (hotel: UnknownRecord): boolean =>
  hotel.earlyCheckIn === true ||
  Number(hotel.early_checkin || 0) === 1 ||
  (hotel.selection !== null && typeof hotel.selection === 'object' &&
    ((hotel.selection as UnknownRecord).earlyCheckIn === true ||
      Number((hotel.selection as UnknownRecord).early_checkin || 0) === 1));

const getHotelCheckInDate = (hotel: UnknownRecord): string => normalizeDate(
  hotel.hotelCheckInDate ||
  hotel.hotel_check_in_date ||
  (hotel.selection !== null && typeof hotel.selection === 'object'
    ? (hotel.selection as UnknownRecord).hotelCheckInDate || (hotel.selection as UnknownRecord).hotel_check_in_date
    : ''),
);
const getDayNumber = (hotel: UnknownRecord, fallback: number): number => {
  const explicitDay = Number(hotel.dayNumber || 0);
  if (Number.isFinite(explicitDay) && explicitDay > 0) return explicitDay;

  const match = String(hotel.day || '').match(/day\s*(\d+)/i);
  const parsedDay = Number(match?.[1] || 0);
  return Number.isFinite(parsedDay) && parsedDay > 0 ? parsedDay : fallback;
};

/** Adds a display-only previous-night row without creating another price line. */
export const expandHotelRowsForClipboard = (hotels: unknown[]): UnknownRecord[] =>
  hotels.reduce<UnknownRecord[]>((expanded, hotelValue) => {
    const hotel = asRecord(hotelValue);
    const previousNight = getHotelCheckInDate(hotel);
    // Early-arrival metadata can be copied onto every row in a continuous
    // stay. Within one clipboard group, the blocked date is the stable
    // identity of the single Day 0 display row; route/stay IDs differ across
    // the continuous rows and must not create repeated Day 0 entries.
    const dayZeroKey = previousNight;
    const isSyntheticDayZero = hotel.previousDayBillingSynthetic === true;

    if (isSyntheticDayZero) {
      if (expanded.some((row) => row.__clipboardDayZeroKey === dayZeroKey)) return expanded;
      expanded.push({ ...hotel, __clipboardDayZeroKey: dayZeroKey });
      return expanded;
    }

    if (!isEarlyCheckIn(hotel) || !previousNight) {
      expanded.push(hotel);
      return expanded;
    }

    if (!expanded.some((row) => row.__clipboardDayZeroKey === dayZeroKey)) {
      expanded.push({
        ...hotel,
        __clipboardDayZero: true,
        __clipboardDayZeroKey: dayZeroKey,
        day: 'Day 0',
        dayNumber: 0,
        date: previousNight,
        hotelCheckInDate: previousNight,
        earlyCheckIn: true,
        previousDayBillingSynthetic: true,
      });
    }
    expanded.push(hotel);
    return expanded;
  }, []);

export const getClipboardHotelDayLabel = (
  hotelValue: unknown,
  fallbackDayNumber: number,
): string => {
  const hotel = asRecord(hotelValue);
  const isDayZero = hotel.__clipboardDayZero === true || hotel.previousDayBillingSynthetic === true;
  const dayNumber = isDayZero ? 0 : getDayNumber(hotel, fallbackDayNumber);
  const date = isDayZero
    ? getHotelCheckInDate(hotel) || normalizeDate(hotel.date)
    : normalizeDate(hotel.date) || String(hotel.day || '').split('|')[1]?.trim() || '';

  return `Day- ${dayNumber}${date ? ` | ${date}` : ''}`;
};
