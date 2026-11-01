import { isHoldableVsrRate } from "@/utils/hotelProviderDisplay";

export type HotelHoldEligibility = {
  provider: string;
  holdable: boolean;
  reason?: "VSR_RATE_NOT_REFUNDABLE";
};

const asRecord = (value: unknown): Record<string, unknown> | null => (
  value && typeof value === "object" ? value as Record<string, unknown> : null
);

const parseSnapshot = (value: unknown): Record<string, unknown> | null => {
  if (value && typeof value === "object") return asRecord(value);
  if (typeof value !== "string" || !value.trim()) return null;
  try {
    return asRecord(JSON.parse(value));
  } catch {
    return null;
  }
};

const refundableValue = (value: unknown): boolean | undefined => {
  if (value === true || value === 1 || String(value ?? "").trim().toLowerCase() === "true") return true;
  if (value === false || value === 0 || String(value ?? "").trim().toLowerCase() === "false") return false;
  return undefined;
};

/** Reads the selected rate's refundability, including nested supplier rate data. */
export const getHotelRefundableRateValue = (hotel: Record<string, unknown>): boolean | undefined => {
  const values: unknown[] = [];
  const visit = (source: Record<string, unknown> | null, depth = 0) => {
    if (!source || depth > 2) return;
    values.push(source.isRefundable, source.IsRefundable, source.refundable, source.Refundable);
    for (const key of ["rateOptions", "roomTypes", "selectedRateOption", "selectedRate", "rateOption", "currentRateOption", "selectedPriceSnapshot"]) {
      const nested = source[key];
      if (Array.isArray(nested)) {
        nested.forEach((item) => visit(asRecord(item), depth + 1));
      } else {
        const nestedRecord = typeof nested === "string" ? parseSnapshot(nested) : asRecord(nested);
        if (nestedRecord) visit(nestedRecord, depth + 1);
      }
    }
  };
  visit(hotel);
  const normalized = values.map(refundableValue);
  if (normalized.includes(true)) return true;
  if (normalized.includes(false)) return false;
  return undefined;
};

export const normalizeHoldProvider = (value: unknown): string => {
  const provider = String(value ?? "").trim().toLowerCase();
  return provider === "vsr" ? "tbo" : provider;
};

const resolveProvider = (hotel: Record<string, unknown>): string => {
  const explicit = normalizeHoldProvider(hotel.provider || hotel.hotelProvider || hotel.hotel_provider);
  if (explicit === "vsr") return "tbo";
  if (explicit) return explicit;

  // Prebook rows are sometimes returned without the normalized provider field,
  // but a TBO booking code is still a stable supplier marker.
  const bookingCode = String(
    hotel.bookingCode
      || hotel.BookingCode
      || hotel.searchReference
      || hotel.search_reference
      || "",
  ).trim();
  return bookingCode.includes("!TB!") ? "tbo" : "";
};

/**
 * Hold is provider-neutral for AX/offline rows. VSR/TBO is holdable only
 * when the selected rate is refundable; non-refundable VSR must go through
 * the paid confirmation flow instead.
 */
export const getHotelHoldEligibility = (hotel: Record<string, unknown>): HotelHoldEligibility => {
  const provider = resolveProvider(hotel);
  if (provider === "tbo") {
    const snapshot = parseSnapshot(hotel.selectedPriceSnapshot || hotel.selected_price_snapshot);
    const holdable = isHoldableVsrRate(
      provider,
      hotel,
      snapshot,
      asRecord(hotel.rateOption),
      asRecord(hotel.selectedRateOption),
      asRecord(hotel.currentRateOption),
    );
    return holdable
      ? { provider, holdable: true }
      : { provider, holdable: false, reason: "VSR_RATE_NOT_REFUNDABLE" };
  }

  return { provider, holdable: true };
};

export const getHotelDetailsId = (hotel: Record<string, unknown>): number => {
  const candidates = [
    hotel.itineraryPlanHotelDetailsId,
    hotel.itinerary_plan_hotel_details_ID,
    hotel.itinerary_plan_hotel_details_id,
    hotel.hotelDetailsId,
    hotel.hotel_details_id,
  ];
  const id = candidates.map(Number).find((value) => Number.isInteger(value) && value > 0);
  return id || 0;
};

export const getHotelDetailsIds = (hotel: Record<string, unknown>): number[] => {
  const direct = [getHotelDetailsId(hotel)];
  for (const key of ["hotelDetailsIds", "displayHotelDetailsIds", "itineraryPlanHotelDetailsIds"]) {
    const value = hotel[key];
    if (Array.isArray(value)) direct.push(...value.map(Number));
  }
  return Array.from(new Set(direct.filter((value) => Number.isInteger(value) && value > 0)));
};

/**
 * Resolve the persisted hotel-detail rows for a selected hotel. A selection
 * can be freshly changed in the hotel list before its detail id is copied into
 * local selection state, so use the current route and hotel identity as a
 * safe fallback for the hold action.
 */
export const resolveHotelDetailsIdsFromRows = (
  hotel: Record<string, unknown>,
  hotelRows: readonly Record<string, unknown>[] = [],
): number[] => {
  const directIds = getHotelDetailsIds(hotel);
  if (directIds.length > 0) return directIds;

  const routeIds = [
    ...(Array.isArray(hotel.routeIds) ? hotel.routeIds : []),
    hotel.routeId,
    hotel.itineraryRouteId,
  ].map(Number).filter((value) => Number.isInteger(value) && value > 0);
  const provider = normalizeHoldProvider(hotel.provider || hotel.hotelProvider || hotel.hotel_provider);
  const hotelCode = String(hotel.hotelCode || hotel.hotel_id || hotel.canonicalHotelId || "").trim();
  const bookingCode = String(hotel.bookingCode || hotel.BookingCode || hotel.searchReference || hotel.search_reference || "").trim();
  const hotelName = String(hotel.hotelName || "").trim().toLowerCase();

  return Array.from(new Set(
    hotelRows
      .filter((row) => {
        const rowRouteId = Number(row.itineraryRouteId || row.routeId || 0);
        const routeMatches = routeIds.length === 0 || routeIds.includes(rowRouteId);
        if (!routeMatches) return false;

        const rowProvider = normalizeHoldProvider(row.provider || row.hotelProvider || row.hotel_provider);
        if (provider && rowProvider && provider !== rowProvider) return false;

        const rowCode = String(row.hotelCode || row.hotel_id || row.canonicalHotelId || "").trim();
        const rowBookingCode = String(row.bookingCode || row.BookingCode || row.searchReference || row.search_reference || "").trim();
        const rowName = String(row.hotelName || "").trim().toLowerCase();
        return Boolean(
          (bookingCode && rowBookingCode && bookingCode === rowBookingCode)
          || (hotelCode && rowCode && hotelCode === rowCode)
          || (hotelName && rowName && hotelName === rowName),
        );
      })
      .flatMap((row) => getHotelDetailsIds(row)),
  ));
};

