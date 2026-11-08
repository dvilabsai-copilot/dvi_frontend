import { isHoldableVsrRate } from "@/utils/hotelProviderDisplay";

export type HotelHoldEligibility = {
  provider: string;
  holdable: boolean;
  reason?: "VSR_RATE_NOT_REFUNDABLE" | "VSR_LCD_MISSING" | "VSR_LCD_WITHIN_BUFFER" | "VSR_ELIGIBILITY_CHECK_FAILED";
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

/** Prefer the persisted stay's current check-in over stale route-selection dates. */
export const resolveHotelHoldCheckInDate = (
  selection: Record<string, unknown>,
  persistedStay?: Record<string, unknown>,
): string => {
  const snapshot = parseSnapshot(selection.selectedPriceSnapshot || selection.selected_price_snapshot) || {};
  const persistedSnapshot = parseSnapshot(
    persistedStay?.selectedPriceSnapshot || persistedStay?.selected_price_snapshot,
  ) || {};
  const candidates = [
    persistedStay?.hotel_check_in_date,
    persistedStay?.hotelCheckInDate,
    persistedStay?.checkInDate,
    persistedStay?.check_in,
    persistedStay?.itinerary_route_date,
    persistedStay?.itineraryRouteDate,
    persistedStay?.routeDate,
    persistedStay?.date,
    persistedSnapshot.checkInDate,
    persistedSnapshot.check_in,
    selection.hotel_check_in_date,
    selection.hotelCheckInDate,
    selection.checkInDate,
    selection.check_in,
    selection.itinerary_route_date,
    selection.itineraryRouteDate,
    selection.routeDate,
    selection.date,
    snapshot.checkInDate,
    snapshot.check_in,
    snapshot.authoritativeCheckInDate,
  ];
  return String(candidates.find((value) => String(value || "").trim()) || "").slice(0, 10);
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
    if (!source || depth > 3) return;
    values.push(source.isRefundable, source.IsRefundable, source.refundable, source.Refundable);
    for (const key of ["rateOptions", "roomTypes", "selectedRateOption", "selectedRate", "rateOption", "currentRateOption", "selectedPriceSnapshot", "pendingAvailabilityChange", "option"]) {
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
    const holdCheck = asRecord(hotel.holdEligibilityCheck);
    if (holdCheck && typeof holdCheck.holdable === "boolean") {
      const reason = String(holdCheck.reason || "").toUpperCase();
      if (holdCheck.holdable) return { provider, holdable: true };
      if (reason === "CHECK_FAILED") return { provider, holdable: false, reason: "VSR_ELIGIBILITY_CHECK_FAILED" };
      if (reason === "LCD_MISSING") return { provider, holdable: false, reason: "VSR_LCD_MISSING" };
      if (reason === "LCD_WITHIN_BUFFER") return { provider, holdable: false, reason: "VSR_LCD_WITHIN_BUFFER" };
      return { provider, holdable: false, reason: "VSR_RATE_NOT_REFUNDABLE" };
    }
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

const hotelRouteIds = (hotel: Record<string, unknown>): number[] => [
  ...(Array.isArray(hotel.routeIds) ? hotel.routeIds : []),
  hotel.routeId,
  hotel.itineraryRouteId,
  hotel.itinerary_route_id,
].map(Number).filter((id) => Number.isInteger(id) && id > 0);

const normalizedIdentityValue = (value: unknown): string => String(value ?? "").trim().toLowerCase();

const sameContinuousHotel = (
  left: Record<string, unknown>,
  right: Record<string, unknown>,
  routeOrder: readonly number[],
): boolean => {
  if (resolveProvider(left) !== "tbo" || resolveProvider(right) !== "tbo") return false;

  const identity = (hotel: Record<string, unknown>) => {
    const code = normalizedIdentityValue(hotel.hotelCode || hotel.hotel_code || hotel.hotel_id || hotel.canonicalHotelId);
    const name = normalizedIdentityValue(hotel.hotelName || hotel.hotel_name);
    return code ? `code:${code}` : name ? `name:${name}` : "";
  };
  const leftIdentity = identity(left);
  if (!leftIdentity || leftIdentity !== identity(right)) return false;

  for (const [keys, read] of [
    [["roomType", "room_type"], normalizedIdentityValue],
    [["mealPlan", "meal_plan", "mealPlanCode", "meal_plan_code"], normalizedIdentityValue],
  ] as const) {
    const leftValue = read(keys.map((key) => left[key]).find((value) => value != null && String(value).trim() !== ""));
    const rightValue = read(keys.map((key) => right[key]).find((value) => value != null && String(value).trim() !== ""));
    if (leftValue && rightValue && leftValue !== rightValue) return false;
  }

  const leftRoutes = hotelRouteIds(left);
  const rightRoutes = hotelRouteIds(right);
  const routeIndex = new Map(routeOrder.map((id, index) => [Number(id), index]));
  const leftIndexes = leftRoutes.map((id) => routeIndex.get(id)).filter((index): index is number => index !== undefined);
  const rightIndexes = rightRoutes.map((id) => routeIndex.get(id)).filter((index): index is number => index !== undefined);
  if (leftIndexes.some((leftIndex) => rightIndexes.some((rightIndex) => Math.abs(leftIndex - rightIndex) <= 1))) return true;

  const dateValue = (hotel: Record<string, unknown>, ...keys: string[]) => {
    const raw = keys.map((key) => hotel[key]).find((value) => value != null && String(value).trim() !== "");
    const timestamp = raw ? Date.parse(String(raw)) : NaN;
    return Number.isFinite(timestamp) ? new Date(timestamp).toISOString().slice(0, 10) : "";
  };
  const leftIn = dateValue(left, "checkInDate", "check_in", "check_in_date");
  const leftOut = dateValue(left, "checkOutDate", "check_out", "check_out_date");
  const rightIn = dateValue(right, "checkInDate", "check_in", "check_in_date");
  const rightOut = dateValue(right, "checkOutDate", "check_out", "check_out_date");
  return Boolean((leftOut && rightIn && leftOut === rightIn) || (rightOut && leftIn && rightOut === leftIn));
};

/**
 * A continuous VSR stay can return refundability once for the whole booking,
 * while itinerary selections are represented as one row per route/night.
 * Carry that known result across adjacent nights of the same selected hotel.
 */
export const applyContinuousVsrRefundability = <T extends Record<string, unknown>>(
  hotels: readonly T[],
  orderedRouteIds: readonly number[] = [],
): T[] => {
  const result = hotels.map((hotel) => ({ ...hotel }));
  const parent = result.map((_hotel, index) => index);
  const find = (index: number): number => {
    if (parent[index] !== index) parent[index] = find(parent[index]);
    return parent[index];
  };
  const union = (left: number, right: number) => {
    const leftRoot = find(left);
    const rightRoot = find(right);
    if (leftRoot !== rightRoot) parent[rightRoot] = leftRoot;
  };

  for (let left = 0; left < result.length; left += 1) {
    for (let right = left + 1; right < result.length; right += 1) {
      if (sameContinuousHotel(result[left], result[right], orderedRouteIds)) union(left, right);
    }
  }

  const groups = new Map<number, number[]>();
  result.forEach((_hotel, index) => {
    const root = find(index);
    groups.set(root, [...(groups.get(root) || []), index]);
  });
  groups.forEach((indexes) => {
    const knownValues = new Set(indexes
      .map((index) => getHotelRefundableRateValue(result[index]))
      .filter((value): value is boolean => value !== undefined));
    if (knownValues.size === 1) {
      const [knownValue] = knownValues;
      indexes.forEach((index) => {
        if (getHotelRefundableRateValue(result[index]) === undefined) {
          result[index].isRefundable = knownValue;
        }
      });
    }

    const checks = indexes
      .map((index) => asRecord(result[index].holdEligibilityCheck))
      .filter((check): check is Record<string, unknown> => Boolean(check && typeof check.holdable === "boolean"));
    if (checks.length > 0) {
      const sharedCheck = checks.some((check) => check.holdable === false)
        ? checks.find((check) => check.holdable === false)!
        : checks[0];
      indexes.forEach((index) => {
        if (!asRecord(result[index].holdEligibilityCheck)) {
          result[index].holdEligibilityCheck = sharedCheck;
        }
      });
    }
  });
  return result;
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

