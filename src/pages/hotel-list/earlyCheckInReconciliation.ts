import type { ItineraryHotelRow } from "../ItineraryDetails";

const dateOnly = (value: unknown): string => {
  const raw = String(value || "").trim();
  if (!raw) return "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
  const parsed = new Date(raw);
  return Number.isNaN(parsed.getTime()) ? raw.slice(0, 10) : parsed.toISOString().slice(0, 10);
};

const addUtcDays = (value: string, days: number): string => {
  if (!value) return "";
  const parsed = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(parsed.getTime())) return "";
  parsed.setUTCDate(parsed.getUTCDate() + days);
  return parsed.toISOString().slice(0, 10);
};

const routeIdOf = (hotel: ItineraryHotelRow): number =>
  Number(hotel.itineraryRouteId || (hotel as ItineraryHotelRow & { routeId?: number }).routeId || 0);

const groupTypeOf = (hotel: ItineraryHotelRow): number => Number(hotel.groupType || 0);

const hotelDateOf = (hotel: ItineraryHotelRow): string => dateOnly(
  hotel.date || hotel.checkInDate || (hotel as ItineraryHotelRow & { itineraryRouteDate?: string }).itineraryRouteDate,
);

const normalizedText = (value: unknown): string => String(value || "").trim().toLowerCase();

const hasCompatibleHotelIdentity = (
  synthetic: ItineraryHotelRow,
  real: ItineraryHotelRow,
): boolean => {
  const syntheticProvider = normalizedText(synthetic.provider);
  const realProvider = normalizedText(real.provider);
  if (syntheticProvider && realProvider && syntheticProvider !== realProvider) return false;

  const syntheticCanonicalId = Number((synthetic as ItineraryHotelRow & { canonicalHotelId?: number }).canonicalHotelId || 0);
  const realCanonicalId = Number((real as ItineraryHotelRow & { canonicalHotelId?: number }).canonicalHotelId || 0);
  if (syntheticCanonicalId > 0 && realCanonicalId > 0 && syntheticCanonicalId !== realCanonicalId) return false;

  const syntheticName = normalizedText(synthetic.hotelName);
  const realName = normalizedText(real.hotelName);
  return !syntheticName || !realName || syntheticName === realName;
};

export const isSyntheticPreviousDayBillingRow = (
  hotel?: ItineraryHotelRow | null,
): boolean => (
  hotel?.previousDayBillingSynthetic === true ||
  normalizedText(hotel?.previousDayBillingSynthetic) === "true" ||
  Number(hotel?.previousDayBillingSynthetic || 0) === 1
);

export const getSyntheticArrivalDate = (hotel: ItineraryHotelRow): string => {
  const explicitGuestArrival = dateOnly(hotel.actualGuestArrivalAt);
  if (explicitGuestArrival) return explicitGuestArrival;

  const checkOutDate = dateOnly(hotel.checkOutDate);
  if (checkOutDate) return checkOutDate;

  return addUtcDays(hotelDateOf(hotel), 1);
};

const toPreviousDayBilling = (synthetic: ItineraryHotelRow) => ({
  date: hotelDateOf(synthetic),
  hotelCheckInDate: synthetic.hotelCheckInDate || hotelDateOf(synthetic),
  actualGuestArrivalAt: synthetic.actualGuestArrivalAt,
  earlyCheckInExtraPaymentApplicable: synthetic.earlyCheckInExtraPaymentApplicable,
  earlyCheckInPaymentStatus: synthetic.earlyCheckInPaymentStatus,
  hotelierEarlyCheckInNote: synthetic.hotelierEarlyCheckInNote,
});

/**
 * Converts persisted previous-night billing markers into metadata on the real
 * guest-arrival row. Synthetic rows are never returned as hotel inventory.
 */
export const reconcilePreviousDayBillingRows = (
  hotels: ItineraryHotelRow[],
): ItineraryHotelRow[] => {
  const syntheticRows = hotels.filter(isSyntheticPreviousDayBillingRow);
  const realRows = hotels.filter((hotel) => !isSyntheticPreviousDayBillingRow(hotel));

  return realRows.map((real) => {
    if (real.previousDayBilling?.date) {
      return { ...real, earlyCheckIn: true, previousDayBillingSynthetic: false };
    }

    const realRouteId = routeIdOf(real);
    const realGroupType = groupTypeOf(real);
    const realArrivalDate = hotelDateOf(real);
    if (!realRouteId || !realGroupType || !realArrivalDate) return real;

    const synthetic = syntheticRows.find((candidate) =>
      routeIdOf(candidate) === realRouteId &&
      groupTypeOf(candidate) === realGroupType &&
      getSyntheticArrivalDate(candidate) === realArrivalDate &&
      hasCompatibleHotelIdentity(candidate, real),
    );
    if (!synthetic) return real;

    return {
      ...real,
      earlyCheckIn: true,
      previousDayBillingSynthetic: false,
      previousDayBilling: toPreviousDayBilling(synthetic),
      earlyCheckInExtraPaymentApplicable: synthetic.earlyCheckInExtraPaymentApplicable,
      earlyCheckInPaymentStatus: synthetic.earlyCheckInPaymentStatus,
      actualGuestArrivalAt: synthetic.actualGuestArrivalAt,
      hotelierEarlyCheckInNote: synthetic.hotelierEarlyCheckInNote,
    };
  });
};

/** Keeps the chosen hotel/rate while restoring route-level display metadata. */
export const mergeEarlyArrivalDisplayMetadata = (
  selected: ItineraryHotelRow,
  normalizedStayRow?: ItineraryHotelRow,
): ItineraryHotelRow => {
  if (!normalizedStayRow) {
    return { ...selected, previousDayBillingSynthetic: false };
  }

  const previousDayBilling =
    normalizedStayRow.previousDayBilling || selected.previousDayBilling;

  return {
    ...normalizedStayRow,
    ...selected,
    itineraryRouteId: normalizedStayRow.itineraryRouteId,
    routeId: (normalizedStayRow as ItineraryHotelRow & { routeId?: number }).routeId,
    day: normalizedStayRow.day,
    dayNumber: normalizedStayRow.dayNumber,
    date: normalizedStayRow.date,
    destination: normalizedStayRow.destination,
    earlyCheckIn: Boolean(previousDayBilling || normalizedStayRow.earlyCheckIn || selected.earlyCheckIn),
    previousDayBillingSynthetic: false,
    previousDayBilling,
    earlyCheckInExtraPaymentApplicable:
      normalizedStayRow.earlyCheckInExtraPaymentApplicable ?? selected.earlyCheckInExtraPaymentApplicable,
    earlyCheckInPaymentStatus:
      normalizedStayRow.earlyCheckInPaymentStatus ?? selected.earlyCheckInPaymentStatus,
    actualGuestArrivalAt:
      normalizedStayRow.actualGuestArrivalAt ?? selected.actualGuestArrivalAt,
    hotelierEarlyCheckInNote:
      normalizedStayRow.hotelierEarlyCheckInNote ?? selected.hotelierEarlyCheckInNote,
  } as ItineraryHotelRow;
};
