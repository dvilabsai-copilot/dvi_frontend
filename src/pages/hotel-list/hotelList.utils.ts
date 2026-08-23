import type { ItineraryHotelRow } from "../ItineraryDetails";
import type { HotelRoomDetail } from "./hotelList.types";

export type HotelLike = Partial<ItineraryHotelRow> & Record<string, unknown>;

/** Build the immutable property identity sent for both preview and commit.
 * Supplier property codes (for example STAAH's property ID) must never be
 * replaced by the internal DVI hotel ID between the two requests. */
export const getHotelIntentIdentity = (hotel: HotelLike) => {
  const providerHotelCode = String(hotel.providerHotelCode ?? '').trim();
  const legacyHotelCode = String(hotel.hotelCode ?? hotel.hotelId ?? '').trim();
  const canonicalHotelIdValue = Number(hotel.canonicalHotelId ?? hotel.hotelId ?? 0);
  const canonicalHotelId = Number.isFinite(canonicalHotelIdValue) && canonicalHotelIdValue > 0
    ? canonicalHotelIdValue
    : undefined;
  const hotelIdValue = Number(hotel.hotelId ?? hotel.canonicalHotelId ?? 0);
  const hotelId = Number.isFinite(hotelIdValue) && hotelIdValue > 0
    ? hotelIdValue
    : undefined;

  return {
    providerHotelCode: providerHotelCode || undefined,
    hotelCode: providerHotelCode || legacyHotelCode,
    canonicalHotelId,
    hotelId,
  };
};

/** Manual selections are owned by the active recommendation tab, never by the
 * recommendation package that supplied the shared inventory row. */
export const resolveTargetGroupType = (activeGroupType: unknown): number => {
  const targetGroupType = Number(activeGroupType);
  if (!Number.isInteger(targetGroupType) || targetGroupType < 1 || targetGroupType > 4) {
    throw new Error('A valid active recommendation group is required to select a hotel.');
  }
  return targetGroupType;
};

export const normalizeManualHotelSelection = <T extends Record<string, unknown>>(
  room: T,
  targetGroupType: number,
): T & { groupType: number } => ({
  ...room,
  groupType: resolveTargetGroupType(targetGroupType),
});

export const getMissingAuthoritativeSelectionFields = (
  selection: Record<string, unknown>,
): string[] => {
  const missing: string[] = [];
  const hasText = (value: unknown) => value !== undefined && value !== null && String(value).trim() !== '';
  if (!hasText(selection.provider)) missing.push('provider');
  if (!hasText(selection.hotelName)) missing.push('hotelName');
  if (![selection.hotelCode, selection.providerHotelCode, selection.canonicalHotelId, selection.hotelId].some(hasText)) {
    missing.push('hotelCode/canonicalHotelId');
  }
  if (![selection.selectedRateOptionId, selection.rateOptionId].some(hasText)) missing.push('selectedRateOptionId');
  if (!hasText(selection.pricePerNight)) missing.push('pricePerNight');
  if (!hasText(selection.totalPrice)) missing.push('totalPrice');
  return missing;
};

const parsePricingSnapshot = (value: unknown): Record<string, unknown> | null => {
  if (value && typeof value === 'object') return value as Record<string, unknown>;
  if (typeof value !== 'string' || !value.trim()) return null;
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === 'object' ? parsed as Record<string, unknown> : null;
  } catch {
    return null;
  }
};

const normalizedRateIdentity = (value?: Record<string, unknown> | null) => {
  const snapshot = parsePricingSnapshot(
    value?.selectedPriceSnapshot ?? value?.selected_price_snapshot,
  ) || {};
  const normalize = (candidate: unknown) => String(candidate ?? '').trim().toLowerCase();
  return {
    provider: normalize(value?.provider ?? value?.hotel_provider ?? snapshot.provider),
    canonicalHotelId: normalize(
      value?.canonicalHotelId ?? value?.hotelId ?? snapshot.canonicalHotelId ?? snapshot.hotelId,
    ),
    providerHotelCode: normalize(
      value?.providerHotelCode ?? value?.provider_hotel_code ??
      snapshot.providerHotelCode ?? snapshot.provider_hotel_code,
    ),
    legacyHotelCode: normalize(value?.hotelCode ?? value?.hotel_code ?? snapshot.hotelCode),
    rate: normalize(
      value?.selectedRateOptionId ?? value?.selected_rate_option_id ?? value?.rateOptionId ?? value?.optionKey ??
      snapshot.rateOptionId ?? snapshot.optionKey,
    ),
  };
};

export const pricingSnapshotMatchesSelection = (
  snapshotValue: unknown,
  selection: Record<string, unknown>,
): boolean => {
  const snapshot = parsePricingSnapshot(snapshotValue);
  if (!snapshot) return false;
  const selectedIdentity = normalizedRateIdentity(selection);
  const snapshotIdentity = normalizedRateIdentity(snapshot);
  return Boolean(
    selectedIdentity.provider && selectedIdentity.rate &&
    snapshotIdentity.provider === selectedIdentity.provider &&
    isSameHotelPropertyIdentity(selection, snapshot) &&
    snapshotIdentity.rate === selectedIdentity.rate
  );
};

/** Return only a pricing snapshot proven to belong to the selected rate. */
export const getIdentitySafeSelectedPriceSnapshot = (
  selection?: Record<string, unknown> | null,
  fallbackRow?: Record<string, unknown> | null,
): Record<string, unknown> | null => {
  const target = selection || fallbackRow;
  if (!target) return null;
  const candidates = [
    selection?.selectedPriceSnapshot,
    selection?.selected_price_snapshot,
    fallbackRow?.selectedPriceSnapshot,
    fallbackRow?.selected_price_snapshot,
  ];
  for (const candidate of candidates) {
    if (pricingSnapshotMatchesSelection(candidate, target)) return parsePricingSnapshot(candidate);
  }
  return null;
};

/**
 * Build post-selection state without inheriting financial metadata from the
 * previously rendered hotel/rate. Route and itinerary presentation fields are
 * structural; every rate identity and amount comes from the server response.
 */
export const buildAuthoritativeSelectedHotelRow = <T extends Record<string, unknown>>(
  base: Record<string, unknown>,
  serverSelection: T,
): T & Record<string, unknown> => {
  const structuralFields = [
    'day', 'destination', 'itineraryRouteLocation', 'itinerary_route_location',
    'itineraryPlanId', 'itineraryRouteId', 'routeId', 'groupType', 'date',
    'checkInDate', 'hotelCheckInDate', 'checkOutDate', 'actualGuestArrivalAt',
    'earlyCheckIn', 'earlyCheckInExtraPaymentApplicable', 'earlyCheckInPaymentStatus',
    'hotelierEarlyCheckInNote', 'previousDayBillingSynthetic', 'hotelDistance',
    'noOfRooms', 'roomCount', 'extraBedCount', 'childWithBedCount', 'childWithoutBedCount',
  ] as const;
  const structural: Record<string, unknown> = {};
  for (const field of structuralFields) {
    if (Object.prototype.hasOwnProperty.call(base, field)) structural[field] = base[field];
  }
  const row: Record<string, unknown> = { ...structural, ...serverSelection };
  const snapshot = getIdentitySafeSelectedPriceSnapshot(serverSelection, null);
  if (snapshot) row.selectedPriceSnapshot = snapshot;
  else delete row.selectedPriceSnapshot;
  delete row.selected_price_snapshot;
  return row as T & Record<string, unknown>;
};

/**
 * Supplier booking/search fields are credentials, not aliases for a stable
 * commercial rate identity. In particular, a TBO selectionKey/rateOptionId
 * must never be copied into bookingCode when the API did not return a fresh
 * opaque supplier token.
 */
export const getSupplierCredentialFields = (
  serverSelection: Record<string, unknown>,
): { bookingCode: string; searchReference: string } => {
  const supplierBookingCode = String(serverSelection.supplierBookingCode || '').trim();
  return {
    bookingCode: supplierBookingCode,
    searchReference: supplierBookingCode,
  };
};

/**
 * Merge a freshly refreshed supplier option without carrying a stale rate
 * identity from the option that triggered the refresh.  The refresh response
 * is authoritative for rate-level fields; route/group context remains owned
 * by the caller.
 */
export const applyAuthoritativeRefreshedRateIdentity = <T extends Record<string, unknown>>(
  previous: T,
  fresh: Record<string, unknown>,
): T => {
  const rateFields = [
    'rateOptionId', 'selectedRateOptionId', 'selected_rate_option_id',
    'optionKey', 'bookingCode', 'searchReference', 'roomId', 'roomTypeId',
    'roomType', 'roomTypeName', 'rateId', 'mealPlan', 'mealPlanCode',
    'pricePerNight', 'totalPrice', 'totalStayPrice', 'currency',
    'checkInDate', 'checkOutDate', 'routeDate', 'date', 'provider',
    'hotelCode', 'providerHotelCode', 'canonicalHotelId', 'hotelId',
  ] as const;
  const merged: Record<string, unknown> = { ...previous };
  for (const field of rateFields) {
    if (Object.prototype.hasOwnProperty.call(fresh, field)) merged[field] = fresh[field];
  }
  // Preserve non-rate presentation/route context, while taking every other
  // fresh supplier field (taxes, bed supplements, meal labels, etc.).
  return { ...merged, ...fresh } as T;
};

/**
 * Availability responses can carry a legacy stayKey after a route/date edit.
 * Selection state must therefore be resolvable by the current route/date
 * identity as well as by the serialized key.
 */
export const getHotelLogicalStayKey = (hotel?: Record<string, unknown> | null): string => {
  if (!hotel) return '';
  const routeIds = [
    hotel.itineraryRouteId,
    hotel.routeId,
    ...(Array.isArray(hotel.routeIds) ? hotel.routeIds : []),
  ]
    .map((value) => Number(value || 0))
    .filter((value, index, values) => Number.isFinite(value) && value > 0 && values.indexOf(value) === index)
    .sort((left, right) => left - right);
  const rawDate = String(
    hotel.date || hotel.checkInDate || hotel.itineraryRouteDate || hotel.itinerary_route_date || '',
  ).trim();
  const date = rawDate.match(/\d{4}-\d{2}-\d{2}/)?.[0] || rawDate.slice(0, 10);
  return `${routeIds.join(',')}::${date}`;
};

export const findHotelSelectionForStay = <T extends object>(
  selections: Record<string, T> | undefined,
  hotel: Record<string, unknown>,
  getStayKey: (value: any) => string,
): T | undefined => {
  if (!selections) return undefined;
  const exactKey = getStayKey(hotel);
  if (exactKey && selections[exactKey]) return selections[exactKey];
  const logicalKey = getHotelLogicalStayKey(hotel);
  if (logicalKey) {
    const logicalMatch = Object.values(selections).find((selection) =>
    getHotelLogicalStayKey(selection) === logicalKey,
    );
    if (logicalMatch) return logicalMatch;
  }

  // A continuous-stay availability row can carry both route IDs while the
  // authoritative selection is persisted against its anchor night only.
  // Match that selection by the shared route/date identity instead of
  // falling back to whichever supplier row happens to be first in inventory.
  const hotelRouteIds = new Set(
    [hotel.itineraryRouteId, hotel.routeId, ...(Array.isArray(hotel.routeIds) ? hotel.routeIds : [])]
      .map((value) => Number(value || 0))
      .filter((value) => Number.isFinite(value) && value > 0),
  );
  const hotelDate = String(
    hotel.date || hotel.checkInDate || hotel.itineraryRouteDate || hotel.itinerary_route_date || '',
  ).match(/\d{4}-\d{2}-\d{2}/)?.[0] || '';
  return Object.values(selections).find((selection: any) => {
    const selectionRouteIds = [
      selection?.itineraryRouteId,
      selection?.routeId,
      ...(Array.isArray(selection?.routeIds) ? selection.routeIds : []),
    ]
      .map((value) => Number(value || 0))
      .filter((value) => Number.isFinite(value) && value > 0);
    const selectionDate = String(
      selection?.date || selection?.checkInDate || selection?.itineraryRouteDate || selection?.itinerary_route_date || '',
    ).match(/\d{4}-\d{2}-\d{2}/)?.[0] || '';
    return selectionRouteIds.some((routeId) => hotelRouteIds.has(routeId)) &&
      (!hotelDate || !selectionDate || hotelDate === selectionDate);
  });
};

export const MEAL_CODE_LABEL: Record<string, string> = { CP: "CP", EP: "EP", MAP: "MAP", AP: "AP" };

export const normalizeHotelDisplayName = (value?: string | null): string =>
  String(value || "")
    .replace(/&amp;/gi, "&")
    .replace(/&#38;|&#x26;/gi, "&")
    .replace(/\s+/g, " ")
    .trim();

export const normalizeMealPlanLabel = (value?: string | null): string => {
  const mealPlanLabelByCode: Record<string, string> = {
    CP: "CP",
    EP: "EP",
    MAP: "MAP",
    AP: "AP",
  };

  const raw = String(value || "").trim();
  if (!raw || raw === "-") return "UNKNOWN";

  const upper = raw.toUpperCase();
  if (upper === "CP" || upper.includes("CONTINENTAL PLAN")) return mealPlanLabelByCode.CP;
  if (upper === "MAP" || upper.includes("MODIFIED AMERICAN PLAN")) return mealPlanLabelByCode.MAP;
  if (upper === "AP" || upper === "AMERICAN PLAN") return mealPlanLabelByCode.AP;
  if (upper === "EP" || upper.includes("EUROPEAN PLAN") || upper.includes("ROOM ONLY") || upper.includes("NO MEAL")) {
    return mealPlanLabelByCode.EP;
  }
  if (upper.includes("ALL MEALS") || upper.includes("FULL BOARD") || upper.includes("FULLBOARD")) return mealPlanLabelByCode.AP;
  if (upper.includes("HALF BOARD") || upper.includes("HALFBOARD")) return mealPlanLabelByCode.MAP;

  const hasBreakfast = upper.includes("BREAKFAST");
  const hasLunch = upper.includes("LUNCH");
  const hasDinner = upper.includes("DINNER");
  if (hasBreakfast && hasLunch && hasDinner) return mealPlanLabelByCode.AP;
  if ((hasBreakfast && hasLunch) || (hasBreakfast && hasDinner) || (hasLunch && hasDinner)) return mealPlanLabelByCode.MAP;
  if (hasBreakfast) return mealPlanLabelByCode.CP;
  return "UNKNOWN";
};

/**
 * Reads the canonical meal-plan value from both live rows and persisted
 * selection metadata. Persisted selections can arrive with the value nested
 * under `selection` or serialized in `selectedPriceSnapshot` after a reload.
 */
export const getHotelMealPlanValue = (hotel?: Record<string, unknown> | null): string => {
  if (!hotel) return "";

  let snapshot: Record<string, unknown> = {};
  const rawSnapshot = hotel.selectedPriceSnapshot ?? hotel.selected_price_snapshot;
  if (rawSnapshot && typeof rawSnapshot === "object") {
    snapshot = rawSnapshot as Record<string, unknown>;
  } else if (typeof rawSnapshot === "string" && rawSnapshot.trim()) {
    try {
      const parsed = JSON.parse(rawSnapshot);
      if (parsed && typeof parsed === "object") snapshot = parsed as Record<string, unknown>;
    } catch {
      // Ignore malformed legacy snapshots and continue with the row fields.
    }
  }

  const selection = hotel.selection && typeof hotel.selection === "object"
    ? hotel.selection as Record<string, unknown>
    : {};
  const candidates = [
    // A persisted user selection is authoritative. Supplier/base row fields
    // can continue to report the original CP label after a MAP update.
    snapshot.mealPlan,
    snapshot.meal_plan,
    snapshot.mealPlanCode,
    selection.mealPlan,
    selection.meal_plan,
    hotel.selectedMealPlan,
    hotel.mealPlanCode,
    hotel.meal_plan_code,
    hotel.mealPlan,
    hotel.meal_plan,
  ];

  for (const candidate of candidates) {
    const normalized = normalizeMealPlanLabel(String(candidate ?? ""));
    if (normalized !== "UNKNOWN") return normalized;
  }

  return "";
};

/**
 * A displayed itinerary row may be backed by an availability fallback even
 * when the API has no active selection for that stay. Card selection styling
 * must only use the row after the selection has passed the authoritative
 * persisted/user-selection checks performed by HotelListTable.
 */
export const getAuthoritativeSelectedHotelForCards = <T>(
  displayedHotel: T,
  effectiveSelection?: Record<string, unknown> | null,
): T | undefined => effectiveSelection ? displayedHotel : undefined;

/**
 * Reads the canonical room-type label from supplier rows and persisted
 * selections. Some supplier payloads expose the value as roomTypeName,
 * while older/persisted rows use roomType or availableRoomTypes.
 */
export const getHotelRoomTypeValue = (hotel?: Record<string, unknown> | null): string => {
  if (!hotel) return "";

  const selection = hotel.selection && typeof hotel.selection === "object"
    ? hotel.selection as Record<string, unknown>
    : {};
  const directCandidates = [
    hotel.roomTypeName,
    hotel.roomType,
    hotel.room_type,
    hotel.selectedRoomTypeName,
    hotel.selectedRoomType,
    selection.roomTypeName,
    selection.roomType,
    selection.room_type,
  ];

  for (const candidate of directCandidates) {
    const normalized = normalizeHotelDisplayName(String(candidate ?? ""));
    if (normalized && normalized !== "-") return normalized;
  }

  const availableRoomTypes = hotel.availableRoomTypes ?? hotel.available_room_types;
  if (Array.isArray(availableRoomTypes)) {
    const firstRoom = availableRoomTypes.find((room) => room && typeof room === "object") as Record<string, unknown> | undefined;
    const fallback = normalizeHotelDisplayName(String(
      firstRoom?.roomTypeTitle ?? firstRoom?.roomTypeName ?? firstRoom?.room_type_title ?? "",
    ));
    if (fallback && fallback !== "-") return fallback;
  }

  return "";
};

/**
 * Creates a compact, user-facing room-type grouping label.
 *
 * Supplier room names commonly append presentation-only qualifiers such as
 * "City View" or "Non-Smoking" and vary the spelling of bed counts. Those
 * differences make the filter unusably long, but the raw room name and rate
 * identity must remain untouched for selection and booking.
 *
 * Bed configuration is deliberately retained. For example, a king room and
 * a twin room must never be grouped into the same filter option.
 */
export const normalizeRoomTypeFilterLabel = (value?: unknown): string => {
  let label = normalizeHotelDisplayName(String(value ?? ""));
  if (!label || label === "-") return "";

  label = label
    .replace(/\bnon[- ]?smoking\b/gi, "")
    .replace(/\bsmoking\b/gi, "")
    .replace(/\b(?:partial|side|full)?\s*(?:city|garden|pool|park|valley|sea|ocean|mountain|lake|river|courtyard|beach)\s+view\b/gi, "")
    .replace(/\bview\b/gi, "")
    .replace(/\broom\s+only\b/gi, "")
    .replace(/\b(\d+)\s+(king|queen|double|twin|single)\s+beds?\b/gi, (_match, count: string, bedType: string) =>
      `${count} ${bedType} ${count === "1" ? "Bed" : "Beds"}`,
    )
    .replace(/\b(king|queen|double|twin|single)\s+bed\b/gi, "$1 Bed")
    .replace(/\s*,\s*/g, ", ")
    .replace(/\s{2,}/g, " ")
    .replace(/\s*([,/-])\s*/g, "$1 ")
    .replace(/(?:,\s*){2,}/g, ", ")
    .replace(/^\s*[,/-]\s*|\s*[,/-]\s*$/g, "")
    .trim();

  return label;
};

const normalizeRoomTypeFilterKey = (value?: unknown): string =>
  normalizeRoomTypeFilterLabel(value).toLowerCase();

/** Returns unique room types present in the supplied selectable options. */
export const getRoomTypeFilterOptions = (hotels: Array<Record<string, unknown>> = []): string[] => {
  const options = new Map<string, string>();
  hotels.forEach((hotel) => {
    const rawLabel = getHotelRoomTypeValue(hotel);
    const key = normalizeRoomTypeFilterKey(rawLabel);
    const label = normalizeRoomTypeFilterLabel(rawLabel);
    if (key && label && !options.has(key)) options.set(key, label);
  });

  return Array.from(options.values()).sort((a, b) => a.localeCompare(b));
};

/** A single-room stay only needs a room editor when another room category is
 * actually available. Multi-room stays still need the room-category modal so
 * each room can be configured independently. */
export const shouldShowRoomTypeEditor = (
  roomCount: number,
  roomTypeOptions: string[] = [],
): boolean => roomCount > 1 || roomTypeOptions.length > 1;

/** Applies a room-type filter without mutating the supplied hotel rows. */
export const filterHotelsByRoomType = <T extends Record<string, unknown>>(
  hotels: T[],
  selectedRoomType?: string,
): T[] => {
  const normalizedFilter = normalizeRoomTypeFilterKey(selectedRoomType);
  if (!normalizedFilter) return hotels;

  return hotels.filter((hotel) =>
    normalizeRoomTypeFilterKey(getHotelRoomTypeValue(hotel)) === normalizedFilter,
  );
};

/**
 * Keeps the room-type filter aligned with the cards that can actually be
 * shown for a stay. Availability snapshots may contain both live and offline
 * copies of the same property; the card list hides the offline copy when a
 * live copy exists, so the row filter must apply the same rule.
 */
export const getVisibleHotelCardOptions = <T extends Record<string, unknown>>(
  hotels: T[] = [],
  selectedHotels: T[] = [],
): T[] => {
  const getPropertyKey = (hotel: Record<string, unknown>): string => {
    const name = normalizeHotelDisplayName(String(hotel.hotelName || ""))
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "");
    if (name) return `name:${name}`;
    const id = String(hotel.canonicalHotelId || hotel.hotelId || hotel.hotelCode || "")
      .trim()
      .toLowerCase();
    return id ? `id:${id}` : "";
  };

  const candidates = [...hotels, ...selectedHotels]
    .filter((hotel, index, values) => {
      const soldOutForCompleteStay = hotel.completeStayBookable === false;
      if (!soldOutForCompleteStay && !isSelectableHotel(hotel)) return false;
      const optionIdentity = String(
        hotel.optionKey || hotel.rateOptionId || hotel.bookingCode || hotel.searchReference || "",
      ).trim().toLowerCase();
      const identity = optionIdentity
        ? `${getPropertyKey(hotel)}|${optionIdentity}`
        : "";
      return !identity || values.findIndex((value) => {
        const valueIdentity = String(
          value.optionKey || value.rateOptionId || value.bookingCode || value.searchReference || "",
        ).trim().toLowerCase();
        return `${getPropertyKey(value)}|${valueIdentity}` === identity;
      }) === index;
    });

  const livePropertyKeys = new Set(
    candidates
      .filter((hotel) => String(hotel.provider || "").trim().toLowerCase() !== "offline")
      .map(getPropertyKey)
      .filter(Boolean),
  );
  const selectedPropertyKeys = new Set(selectedHotels.map(getPropertyKey).filter(Boolean));

  return candidates.filter((hotel) => {
    const isOffline = String(hotel.provider || "").trim().toLowerCase() === "offline";
    const propertyKey = getPropertyKey(hotel);
    if (!isOffline || !propertyKey || !livePropertyKeys.has(propertyKey)) return true;
    return selectedPropertyKeys.has(propertyKey);
  });
};

export const normalizedLabelToCode = (label: string): string | null => {
  const normalized = String(label || "").trim().toUpperCase();
  if (normalized.startsWith("CP")) return "CP";
  if (normalized.startsWith("EP")) return "EP";
  if (normalized.startsWith("MAP")) return "MAP";
  if (normalized.startsWith("AP")) return "AP";
  return null;
};

export const toMoneyNumber = (value: number | string | undefined | null): number => {
  const num = Number(value ?? 0);
  if (!Number.isFinite(num)) return 0;
  return Number(num.toFixed(2));
};

export const formatCurrency = (value: number | string | undefined | null): string =>
  `\u20B9 ${toMoneyNumber(value).toFixed(2)}`;

export const formatDisplayDate = (value?: string | null): string => {
  if (!value) return "";
  const parsed = new Date(`${value}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

export const stripHtml = (value: string): string =>
  String(value || "").replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();

export const normalizeTextList = (value: unknown): string[] => {
  if (Array.isArray(value)) {
    return value
      .flatMap((item) => {
        if (typeof item === "string") return [stripHtml(item)];
        if (typeof item === "number") return [String(item)];
        if (item && typeof item === "object") {
          const record = item as Record<string, unknown>;
          const candidate =
            record.description ??
            record.text ??
            record.title ??
            record.name ??
            record.type;
          return candidate ? [stripHtml(String(candidate))] : [];
        }
        return [];
      })
      .map((entry) => entry.trim())
      .filter(Boolean);
  }

  if (typeof value === "string") {
    const text = value.trim();
    if (!text) return [];
    if ((text.startsWith("[") && text.endsWith("]")) || (text.startsWith("{") && text.endsWith("}"))) {
      try {
        return normalizeTextList(JSON.parse(text));
      } catch {
        // Fall through to plain text parsing.
      }
    }
    return text.split(/\r?\n|\||;/).map(stripHtml).map((part) => part.trim()).filter(Boolean);
  }

  if (typeof value === "number") return [String(value)];
  return [];
};

/**
 * Returns the canonical meal plans that can be inferred from a hotel option.
 *
 * Some AxisRooms rows do not populate `mealPlan`; they only send the
 * supported plans in `rateConditions`. Those conditions are useful display
 * metadata, but must not overwrite an explicit rate-level meal plan.
 */
export const getMealPlanCodes = (hotel: Record<string, unknown> | null | undefined): string[] => {
  if (!hotel) return [];

  const explicitValues = [hotel.mealPlan, hotel.meal_plan, hotel.mealPlanCode, hotel.meal_plan_code]
    .flatMap((value) => normalizeTextList(value));
  const conditionValues = [hotel.rateConditions, hotel.RateConditions, hotel.rate_conditions]
    .flatMap((value) => normalizeTextList(value));

  return Array.from(new Set(
    [...explicitValues, ...conditionValues]
      .map((value) => normalizeMealPlanLabel(value))
      .filter((value) => value !== "UNKNOWN"),
  ));
};

/**
 * Returns meal plans backed by the option's actual selectable rate identity.
 *
 * `rateConditions` are descriptive metadata and can list MAP/AP even when
 * the selected rate is actually CP. Header editors must not use those values
 * as selectable choices.
 */
export const getSelectableMealPlanCodes = (hotel: Record<string, unknown> | null | undefined): string[] => {
  if (!hotel) return [];

  const explicitCodes = [hotel.mealPlan, hotel.meal_plan, hotel.mealPlanCode, hotel.meal_plan_code]
    .flatMap((value) => normalizeTextList(value))
    .map((value) => normalizeMealPlanLabel(value))
    .filter((value) => value !== "UNKNOWN");
  const rateIdentityText = [
    hotel.rateOptionId,
    hotel.rateId,
    hotel.optionKey,
    hotel.bookingCode,
    hotel.searchReference,
    hotel.ratePlanCode,
    hotel.ratePlanName,
  ].map((value) => String(value || "").trim().toUpperCase()).join("|");
  const identityCodes = Array.from(rateIdentityText.matchAll(/(?:^|[^A-Z0-9])(CP|EP|MAP|AP)_PLAN(?:$|[^A-Z0-9])/g))
    .map((match) => match[1]);

  if (identityCodes.length > 0) {
    const identitySet = new Set(identityCodes);
    return Array.from(new Set(explicitCodes.filter((code) => identitySet.has(code))));
  }

  return Array.from(new Set(explicitCodes));
};

export const getSelectableMealPlanFilterOptions = (
  hotels: Array<unknown> = [],
): string[] => Array.from(new Set(
  hotels.flatMap((hotel) => {
    const record = hotel && typeof hotel === "object" ? hotel as Record<string, unknown> : {};
    return getSelectableMealPlanCodes(record);
  }),
)).sort((a, b) => a.localeCompare(b));

/** Display fallback for supplier rows whose meal plan is only in conditions. */
export const getMealPlanDisplayLabel = (hotel: Record<string, unknown> | null | undefined): string => {
  const codes = getMealPlanCodes(hotel);
  return codes.length > 0 ? codes.join(" / ") : "UNKNOWN";
};

export const pickListFromKeys = (source: Record<string, unknown>, keys: string[]): string[] => {
  for (const key of keys) {
    const values = normalizeTextList(source[key]);
    if (values.length > 0) return Array.from(new Set(values));
  }
  return [];
};

export const normalizeHotelStarCategory = (value: unknown): number | null => {
  const raw = String(value ?? "").trim();
  if (!raw) return null;
  const starLabelMatch = raw.match(/([1-5])\s*(?:\*|STAR)?/i);
  if (starLabelMatch) {
    const parsed = Number(starLabelMatch[1]);
    if (parsed >= 1 && parsed <= 5) return parsed;
  }
  const numeric = Number(raw);
  if (!Number.isFinite(numeric)) return null;
  if (numeric >= 1 && numeric <= 5) return numeric;
  const lastDigit = Math.floor(numeric) % 10;
  if (numeric >= 10 && numeric < 100 && lastDigit >= 1 && lastDigit <= 5) return lastDigit;
  return null;
};

export const toNumber = (value: unknown, fallback = 0): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

export const getStayKey = (hotel: Pick<ItineraryHotelRow, "itineraryRouteId" | "date" | "day"> & { stayKey?: string; routeIds?: number[] }): string => {
  const persistedStayKey = String((hotel as any).stayKey || "").trim();
  if (persistedStayKey) return persistedStayKey;
  const routeIds = Array.isArray((hotel as any).routeIds)
    ? (hotel as any).routeIds.map((id: unknown) => toNumber(id, 0)).filter((id: number) => id > 0)
    : [];
  if (routeIds.length > 1) {
    return `${routeIds.join(",")}|${String(hotel.date || hotel.day || "").trim()}`;
  }
  return `${toNumber(hotel.itineraryRouteId, 0)}::${String(hotel.date || hotel.day || "").trim()}`;
};

const normalizeRateIdentityText = (value: unknown): string => String(value ?? "").trim().toLowerCase();

const normalizeRateIdentityMoney = (value: unknown): number => {
  const amount = Number(value ?? 0);
  return Number.isFinite(amount) ? Number(amount.toFixed(2)) : 0;
};

const normalizeNightlyRatesForIdentity = (value: unknown): Array<Record<string, unknown>> => {
  if (!Array.isArray(value)) return [];

  return (value as Array<Record<string, unknown>>).map((night) => ({
    date: normalizeRateIdentityText(night?.date),
    amountAfterTax: normalizeRateIdentityMoney(night?.amountAfterTax ?? night?.totalAmountAfterTax),
    baseAmount: normalizeRateIdentityMoney(night?.baseAmount),
    extraAdultCount: normalizeRateIdentityMoney(night?.extraAdultCount),
    extraChildCount: normalizeRateIdentityMoney(night?.extraChildCount),
    extraAdultRate: normalizeRateIdentityMoney(night?.extraAdultRate),
    extraChildRate: normalizeRateIdentityMoney(night?.extraChildRate),
  }));
};

/** Complete room/rate identity used for pending-vs-confirmed comparisons. */
export const getHotelRateIdentity = (hotel: HotelLike): string => JSON.stringify({
  canonicalHotelId: normalizeRateIdentityMoney(hotel.canonicalHotelId),
  provider: normalizeRateIdentityText(hotel.provider),
  hotelCode: normalizeRateIdentityText(hotel.hotelCode || hotel.hotelId),
  hotelName: normalizeRateIdentityText(hotel.hotelName),
  bookingCode: normalizeRateIdentityText(hotel.bookingCode),
  searchReference: normalizeRateIdentityText(hotel.searchReference),
  rateOptionId: normalizeRateIdentityText(hotel.rateOptionId ?? hotel.selectedRateOptionId),
  selectedRateOptionId: normalizeRateIdentityText(hotel.selectedRateOptionId),
  roomType: normalizeRateIdentityText(hotel.roomType || hotel.roomTypeName),
  mealPlan: normalizeRateIdentityText(normalizeMealPlanLabel(String(hotel.mealPlan || ""))),
  rateId: normalizeRateIdentityText(hotel.rateId),
  roomId: normalizeRateIdentityText(hotel.roomId),
  amountAfterTax: normalizeRateIdentityMoney(
    hotel.totalAmountAfterTax ??
      hotel.totalAmount ??
      hotel.netAmount ??
      (Number(hotel.totalHotelCost ?? hotel.pricePerNight ?? 0) + Number(hotel.totalHotelTaxAmount ?? hotel.taxAmount ?? 0)),
  ),
  routeIds: Array.isArray(hotel.routeIds)
    ? hotel.routeIds.map((id) => Number(id)).filter((id) => Number.isFinite(id) && id > 0)
    : [],
  nightlyRates: normalizeNightlyRatesForIdentity(hotel.nightlyRates),
});

export const getHotelOptionKey = (hotel: HotelLike): string => getHotelRateIdentity(hotel);

const getHotelRateReferences = (hotel: HotelLike): Set<string> => new Set(
  [hotel.selectedRateOptionId, hotel.rateOptionId, hotel.optionKey, hotel.searchReference, hotel.bookingCode]
    .map((value) => String(value ?? "").trim().toLowerCase())
    .filter(Boolean),
);

/**
 * Compares commercial rate identity before comparing the complete UI option
 * shape. Persisted selections may use a provider-prefixed hotel code while
 * the shared card uses the supplier's numeric code; the rateOptionId still
 * identifies the exact room/meal/rate and must win that alias difference.
 */
export const isSameHotelRateIdentity = (left: HotelLike, right: HotelLike): boolean => {
  const leftReferences = getHotelRateReferences(left);
  const rightReferences = getHotelRateReferences(right);
  if (leftReferences.size > 0 && rightReferences.size > 0) {
    for (const reference of leftReferences) {
      if (rightReferences.has(reference)) return true;
    }
    return false;
  }
  return getHotelOptionKey(left) === getHotelOptionKey(right);
};

/**
 * Resolve the persisted row for a selected room without silently substituting
 * another rate from the same property. Supplier booking references are
 * route/date/rate scoped (especially TBO), so matching only by hotel name or
 * hotel code can persist the wrong night's reference and trigger the backend's
 * stale-rate guard.
 */
export const findRouteHotelForSelection = (
  hotels: ItineraryHotelRow[],
  selectedHotel: HotelLike,
  routeId: number,
  groupType: number,
): ItineraryHotelRow | null => {
  const candidates = hotels.filter((hotel) =>
    toNumber(hotel.itineraryRouteId || hotel.routeId, 0) === Number(routeId) &&
    (!groupType || toNumber(hotel.groupType, 0) === Number(groupType)),
  );
  if (candidates.length === 0) return null;

  const selectedReferences = getHotelRateReferences(selectedHotel);
  const rateMatch = candidates.find((candidate) => {
    const candidateReferences = getHotelRateReferences(candidate);
    return Array.from(selectedReferences).some((reference) => candidateReferences.has(reference));
  });
  if (rateMatch) return rateMatch;

  const selectedOptionKey = getHotelOptionKey(selectedHotel);
  const optionKeyMatches = candidates.filter((candidate) => getHotelOptionKey(candidate) === selectedOptionKey);
  if (optionKeyMatches.length === 1) return optionKeyMatches[0];

  const selectedDate = String(selectedHotel.date || selectedHotel.checkInDate || "").trim();
  const selectedAmount = getHotelDisplayAmount(selectedHotel);
  const sameStayMatches = candidates.filter((candidate) => {
    const candidateDate = String(candidate.date || candidate.checkInDate || "").trim();
    const dateMatches = !selectedDate || !candidateDate || candidateDate === selectedDate;
    const sameProperty = isSameHotelIdentity(candidate, selectedHotel);
    const sameRoomMeal = isSameRoomMealIdentity(candidate, selectedHotel);
    const candidateAmount = getHotelDisplayAmount(candidate);
    const amountMatches = selectedAmount <= 0 || candidateAmount <= 0 || Math.abs(candidateAmount - selectedAmount) <= 0.01;
    return dateMatches && sameProperty && sameRoomMeal && amountMatches;
  });

  // A unique fallback is safe; an arbitrary first row is not.
  return sameStayMatches.length === 1 ? sameStayMatches[0] : null;
};

const normalizeIdentityPart = (value: unknown): string => String(value ?? '').trim().toLowerCase();

export const normalizeHotelIdentity = (hotel: HotelLike): string => {
  const provider = normalizeIdentityPart(hotel.provider ?? hotel.hotel_provider);
  const canonicalHotelId = normalizeIdentityPart(hotel.canonicalHotelId ?? hotel.hotelId);
  const providerHotelCode = normalizeIdentityPart(hotel.providerHotelCode ?? hotel.provider_hotel_code);
  const legacyHotelCode = normalizeIdentityPart(hotel.hotelCode ?? hotel.hotel_code);
  const property = canonicalHotelId
    ? `canonical:${canonicalHotelId}`
    : providerHotelCode
      ? `provider:${providerHotelCode}`
      : legacyHotelCode
        ? `legacy:${legacyHotelCode}`
        : 'unresolved';
  return `${provider}|${property}`;
};

/**
 * Stable identity for grouping supplier inventory into one property card.
 * The picker intentionally combines options from multiple recommendation
 * groups, whose supplier aliases can differ across rows. Prefer the canonical
 * property ID when it is available; supplier and legacy codes are fallbacks.
 * This prevents one physical hotel from becoming multiple cards when the
 * supplier returns different aliases for different rates or recommendation
 * groups.
 */
export const getHotelCardGroupingIdentity = (hotel: HotelLike): string => {
  const provider = normalizeIdentityPart(hotel.provider ?? hotel.hotel_provider);
  if (!provider) return '';
  const canonicalHotelId = normalizeIdentityPart(hotel.canonicalHotelId ?? hotel.hotelId);
  if (canonicalHotelId) return `${provider}|canonical:${canonicalHotelId}`;
  // All of these fields are supplier property-code aliases.  They must not
  // create different card namespaces merely because one normalization stage
  // populated providerHotelCode and another populated hotelCode.
  const supplierHotelCode = normalizeIdentityPart(
    hotel.providerHotelCode ?? hotel.provider_hotel_code ?? hotel.hotelCode ?? hotel.hotel_code,
  );
  return supplierHotelCode ? `${provider}|supplier:${supplierHotelCode}` : '';
};

/** Compare explicit property namespaces without treating an internal hotel ID
 * as though it were a supplier property code. Hotel names are never identity. */
export const isSameHotelPropertyIdentity = (a: HotelLike, b: HotelLike): boolean => {
  const providerA = normalizeIdentityPart(a.provider ?? a.hotel_provider);
  const providerB = normalizeIdentityPart(b.provider ?? b.hotel_provider);
  if (!providerA || !providerB || providerA !== providerB) return false;

  const canonicalA = normalizeIdentityPart(a.canonicalHotelId ?? a.hotelId);
  const canonicalB = normalizeIdentityPart(b.canonicalHotelId ?? b.hotelId);
  if (canonicalA && canonicalB) return canonicalA === canonicalB;

  const supplierCodeA = normalizeIdentityPart(
    a.providerHotelCode ?? a.provider_hotel_code ?? a.hotelCode ?? a.hotel_code,
  );
  const supplierCodeB = normalizeIdentityPart(
    b.providerHotelCode ?? b.provider_hotel_code ?? b.hotelCode ?? b.hotel_code,
  );
  return Boolean(supplierCodeA && supplierCodeB && supplierCodeA === supplierCodeB);
};

export const normalizeRoomMealIdentity = (hotel: HotelLike): string => [
  String(hotel.roomId || "").trim().toLowerCase(),
  String(hotel.rateId || "").trim().toLowerCase(),
  String(hotel.roomType || hotel.roomTypeName || "").trim().toLowerCase(),
  normalizeMealPlanLabel(String(hotel.mealPlan || "")).trim().toLowerCase(),
].join("|");

export const isSameHotelIdentity = (a: HotelLike, b: HotelLike): boolean =>
  isSameHotelPropertyIdentity(a, b);

export const isSameRoomMealIdentity = (a: HotelLike, b: HotelLike): boolean =>
  normalizeRoomMealIdentity(a) === normalizeRoomMealIdentity(b);

export const getStaySortValue = (hotel: HotelLike): string => [
  String(hotel.date || hotel.checkInDate || ""),
  String(hotel.day || ""),
  String(hotel.itineraryRouteId || hotel.routeId || ""),
].join("|");

export const sortStayGroupsByDate = (groups: ItineraryHotelRow[][]): ItineraryHotelRow[][] =>
  [...groups].sort((a, b) => getStaySortValue(a[0]).localeCompare(getStaySortValue(b[0])));

export const getEffectiveRoomCount = (hotel: Pick<ItineraryHotelRow, "noOfRooms">, roomCount: number): number =>
  Math.max(toNumber(roomCount, 0) || toNumber(hotel.noOfRooms, 1) || 1, 1);

export const getHotelBaseAmount = (hotel: HotelLike): number => toNumber(
  hotel.baseHotelCost ?? hotel.basePricePerNight ?? hotel.baseAmount ?? 0,
);

const getDirectHotelAmount = (hotel: HotelLike): number => {
  const directTotal = toNumber(hotel.totalAmount ?? hotel.totalPrice, 0);
  if (directTotal > 0) return directTotal;
  const totalHotelCost = toNumber(hotel.totalHotelCost ?? hotel.perNightAmount ?? hotel.pricePerNight, 0);
  const totalHotelTaxAmount = toNumber(hotel.totalHotelTaxAmount ?? hotel.taxAmount, 0);
  const computedAmount = totalHotelCost + totalHotelTaxAmount;
  return computedAmount > 0 ? computedAmount : totalHotelCost;
};

const getSelectionMetadata = (hotel: HotelLike): Record<string, unknown> => {
  const rawSnapshot = (hotel as any).selectedPriceSnapshot ?? (hotel as any).selected_price_snapshot;
  let snapshot: Record<string, unknown> = {};
  if (rawSnapshot && typeof rawSnapshot === 'object') {
    snapshot = rawSnapshot as Record<string, unknown>;
  } else if (typeof rawSnapshot === 'string' && rawSnapshot.trim()) {
    try {
      const parsed = JSON.parse(rawSnapshot);
      if (parsed && typeof parsed === 'object') snapshot = parsed as Record<string, unknown>;
    } catch {
      // Ignore malformed legacy snapshots and use the normalized row fields.
    }
  }
  const selection = (hotel as any).selection && typeof (hotel as any).selection === 'object'
    ? (hotel as any).selection as Record<string, unknown>
    : {};
  return { ...selection, ...snapshot };
};

/**
 * A persisted price is valid only for the same provider/rate currently being
 * rendered. Older rows can survive a supplier switch and otherwise make a
 * newly selected offline hotel inherit a previous TBO price.
 */
const hasCurrentSelectionIdentity = (hotel: HotelLike): boolean => {
  const metadata = getSelectionMetadata(hotel);
  const normalize = (value: unknown): string => String(value ?? '').trim().toLowerCase();
  const currentProvider = normalize((hotel as any).provider || (hotel as any).hotel_provider);
  const selectedProvider = normalize(metadata.provider || (hotel as any).selectedProvider);
  if (currentProvider && selectedProvider && currentProvider !== selectedProvider) return false;

  const currentOptionKey = normalize((hotel as any).optionKey);
  const selectedOptionKey = normalize(metadata.optionKey);
  const currentIdentities = [
    (hotel as any).rateOptionId,
    (hotel as any).bookingCode,
    (hotel as any).searchReference,
  ].map(normalize).filter(Boolean);
  const selectedIdentities = [
    metadata.rateOptionId,
    metadata.rateId,
    metadata.bookingCode,
    metadata.searchReference,
    (hotel as any).selectedRateOptionId,
    (hotel as any).selected_rate_option_id,
  ].map(normalize).filter(Boolean);

  // A persisted offline option key may omit the room ID while the current
  // availability key includes it. Compare the stable rate portion of the
  // composite key before declaring the persisted amount stale.
  const comparableOptionKey = (value: string): string => {
    const parts = value.split('|');
    return parts.length >= 5 ? parts.filter((_, index) => index !== 2).join('|') : value;
  };
  const hasSharedExplicitIdentity = currentIdentities.some((identity) => selectedIdentities.includes(identity));
  const optionKeysMatch = Boolean(
    currentOptionKey && selectedOptionKey &&
    comparableOptionKey(currentOptionKey) === comparableOptionKey(selectedOptionKey),
  );
  if ((currentIdentities.length > 0 || currentOptionKey) &&
      (selectedIdentities.length > 0 || selectedOptionKey) &&
      !hasSharedExplicitIdentity && !optionKeysMatch) {
    // The current row has a rate identity and it is not the persisted rate.
    // Same-property rows can still have different room/meal prices, so a
    // property match is not enough to reuse the old payable total.
    return false;
  }

  // Room IDs are not stable across all persisted supplier snapshots: some
  // offline rows include the room ID in the composite option key while the
  // persisted selection snapshot only contains the room-type label. Compare
  // IDs when both sides have them; otherwise compare room-type labels. This
  // keeps a valid payable selection (e.g. 4,389) while still rejecting a
  // genuinely different room.
  const currentRoomId = normalize((hotel as any).roomId);
  const selectedRoomId = normalize(metadata.roomId || metadata.room_id);
  if (currentRoomId && selectedRoomId && currentRoomId !== selectedRoomId) return false;
  const currentRoomType = normalize((hotel as any).roomType || (hotel as any).roomTypeName);
  const selectedRoomType = normalize(metadata.roomType || metadata.room_type || metadata.roomTypeName);
  if (currentRoomType && selectedRoomType && currentRoomType !== selectedRoomType) return false;
  const currentMeal = normalizeMealPlanLabel(String((hotel as any).mealPlan || '')).toLowerCase();
  const selectedMeal = normalizeMealPlanLabel(String(metadata.mealPlan || metadata.meal_plan || '')).toLowerCase();
  if (currentMeal && currentMeal !== 'unknown' && selectedMeal && selectedMeal !== 'unknown' && currentMeal !== selectedMeal) return false;
  return true;
};

/**
 * Returns the current availability amount for a row that contains nested
 * rate options. The parent row may also contain selected_* fields from an
 * older provider/rate; those fields must not win over the current option.
 */
const getCurrentRateOptionAmount = (hotel: HotelLike): number => {
  const rateOptions = Array.isArray((hotel as any).rateOptions)
    ? (hotel as any).rateOptions
    : [];
  if (rateOptions.length === 0) return 0;

  const normalize = (value: unknown): string => String(value ?? '').trim().toLowerCase();
  const rowIdentities = new Set(
    [
      (hotel as any).optionKey,
      (hotel as any).rateOptionId,
      (hotel as any).selectedRateOptionId,
      (hotel as any).selected_rate_option_id,
      (hotel as any).bookingCode,
      (hotel as any).searchReference,
    ].map(normalize).filter(Boolean),
  );
  const rowRoomId = normalize((hotel as any).roomId);
  const rowRoomType = normalize((hotel as any).roomType || (hotel as any).roomTypeName);
  const rowMealPlan = normalizeMealPlanLabel(String((hotel as any).mealPlan || '')).toLowerCase();

  const matchingOption = rateOptions.find((option: any) => {
    const optionIdentities = [
      option?.optionKey,
      option?.rateOptionId,
      option?.bookingCode,
      option?.searchReference,
    ].map(normalize).filter(Boolean);
    if (rowIdentities.size > 0 && optionIdentities.some((identity) => rowIdentities.has(identity))) {
      return true;
    }
    const optionRoomId = normalize(option?.roomId);
    const optionRoomType = normalize(option?.roomType || option?.roomTypeName);
    const optionMealPlan = normalizeMealPlanLabel(String(option?.mealPlan || '')).toLowerCase();
    return Boolean(
      rowRoomId && optionRoomId && rowRoomId === optionRoomId ||
      rowRoomType && optionRoomType && rowRoomType === optionRoomType &&
        (!rowMealPlan || !optionMealPlan || rowMealPlan === optionMealPlan),
    );
  });

  // A single current option is unambiguous even when legacy rows have no
  // option identity. With multiple options, never guess a rate.
  const option = matchingOption || (rateOptions.length === 1 ? rateOptions[0] : null);
  return option ? getDirectHotelAmount(option) : 0;
};

export const getHotelDisplayAmount = (hotel: HotelLike): number => {
  const persistedTotal = toNumber(
    (hotel as any).selectedTotalPrice ??
      (hotel as any).selected_total_price ??
      (hotel as any).selection?.totalPrice ??
      0,
    0,
  );

  // A selected row is a financial record, not merely an availability card.
  // Prefer its current payable total over the card's base/rate-option amount.
  // The identity guard prevents an old provider/rate from leaking into a
  // newly displayed live/offline row.
  const hasSelectionMarker = Boolean(
    (hotel as any).isSelected === true ||
    String((hotel as any).selectionOrigin || '').trim().toUpperCase() === 'USER_SELECTED' ||
    Number((hotel as any).selectionId || 0) > 0,
  );
  const currentSelectionIdentity = hasCurrentSelectionIdentity(hotel);
  if (persistedTotal > 0 && hasSelectionMarker && currentSelectionIdentity) {
    return persistedTotal;
  }

  const currentRateOptionAmount = getCurrentRateOptionAmount(hotel);
  if (currentRateOptionAmount > 0) return currentRateOptionAmount;

  return getDirectHotelAmount(hotel);
};

export const getHotelAmountWithRooms = (hotel: HotelLike): number => getHotelDisplayAmount(hotel);

export const isPlaceholderHotel = (hotel?: HotelLike | null): boolean => {
  if (!hotel) return true;
  const name = String(hotel.hotelName || "").trim().toLowerCase();
  const provider = String(hotel.provider || "").trim().toLowerCase();
  const availabilityStatus = String(hotel.availabilityStatus || "").trim().toUpperCase();
  return name === "no hotel available" ||
    name === "no hotels available" ||
    name.includes("no hotel booked") ||
    name.includes("stay arranged externally") ||
    provider === "external" ||
    availabilityStatus === "NO_SUPPLIER_AVAILABILITY" ||
    availabilityStatus === "UNAVAILABLE" ||
    availabilityStatus === "RESTRICTED" ||
    availabilityStatus === "STALE" ||
    availabilityStatus === "UNKNOWN" ||
    hotel.externalStay === true;
};

export const isExternalStayRow = (hotel?: HotelLike | null): boolean => {
  if (!hotel) return false;
  const provider = String(hotel.provider || "").trim().toLowerCase();
  const hotelName = String(hotel.hotelName || "").trim().toLowerCase();
  const availabilityStatus = String(hotel.availabilityStatus || "").trim().toUpperCase();
  return hotel.externalStay === true ||
    provider === "external" || provider === "none" || provider === "self-arranged" ||
    availabilityStatus === "NO_SUPPLIER_AVAILABILITY" ||
    hotelName === "no hotel available" ||
    hotelName === "no hotels available" ||
    hotelName.includes("no hotel booked") ||
    hotelName.includes("no hotels available") ||
    hotelName.includes("stay arranged externally");
};

export const isSelectableHotel = (hotel?: HotelLike | null): boolean => {
  if (!hotel) return false;
  if (hotel.completeStayBookable === false) return false;
  const availabilityStatus = String(hotel.availabilityStatus || "").trim().toUpperCase();
  const offlineApproval = availabilityStatus === "OFFLINE_APPROVAL_REQUIRED" ||
    String(hotel.provider || "").trim().toLowerCase() === "offline" ||
    hotel.bookingMode === "MANUAL_APPROVAL" ||
    hotel.requiresHotelApproval === true;
  if (["NOT_BOOKABLE", "NO_SUPPLIER_AVAILABILITY", "UNAVAILABLE", "RESTRICTED", "STALE", "UNKNOWN"].includes(availabilityStatus)) return false;
  if (hotel.externalStay === true) return false;
  if (!offlineApproval && (hotel.isBookable === false || hotel.isLiveBookable === false)) return false;
  if (offlineApproval && hotel.isSelectable === false) return false;
  const provider = String(hotel.provider || "").trim().toLowerCase();
  if (!provider || provider === "external" || provider === "none" || provider === "self-arranged") return false;
  const amount = getHotelAmountWithRooms(hotel);
  return Number.isFinite(amount) && amount > 0;
};

export const findMatchingRoomMealInStay = (
  stayHotels: ItineraryHotelRow[],
  previousSelectedHotel?: ItineraryHotelRow | null,
): ItineraryHotelRow | null => {
  if (!previousSelectedHotel) return null;
  return stayHotels.find((hotel) =>
    isSelectableHotel(hotel) &&
    isSameHotelIdentity(hotel, previousSelectedHotel) &&
    isSameRoomMealIdentity(hotel, previousSelectedHotel),
  ) || null;
};

/**
 * Returns rows that may be selected automatically. Live supplier rows always
 * win; offline inventory is eligible only when this stay has no live option.
 * Persisted or user-selected rows are handled separately by the selection
 * state and are never overwritten here.
 */
export const getAutoSelectableHotelsRespectingPreviousRoomMeal = (
  stayHotels: ItineraryHotelRow[],
  previousSelectedHotel?: ItineraryHotelRow | null,
): ItineraryHotelRow[] => {
  const liveSelectableHotels = stayHotels.filter((hotel) =>
    isSelectableHotel(hotel) && String(hotel.provider || '').trim().toLowerCase() !== 'offline',
  );
  const selectableHotels = liveSelectableHotels.length > 0
    ? liveSelectableHotels
    : stayHotels.filter((hotel) => isSelectableHotel(hotel));

  if (!previousSelectedHotel || selectableHotels.length === 0) {
    return selectableHotels;
  }

  const fairCandidates = selectableHotels.filter((hotel) => {
    if (!isSameHotelIdentity(hotel, previousSelectedHotel)) return true;
    return isSameRoomMealIdentity(hotel, previousSelectedHotel);
  });

  return fairCandidates.length > 0 ? fairCandidates : selectableHotels;
};

export const getMealPlanCodeOnly = (value: unknown): string => {
  const code = normalizedLabelToCode(normalizeMealPlanLabel(String(value || "")));
  return code || String(value || "").trim() || "-";
};

const MEAL_PLAN_FILTER_ORDER = [
  "EP",
  "CP",
  "MAP",
  "AP",
];

/**
 * Meal-plan choices for a stay-level filter/selection.
 *
 * Keep the four supported plans visible even when the current supplier
 * snapshot has no matching rate. This makes the control a stable filter
 * contract; selecting an unavailable plan can then show an explicit empty
 * state instead of making the options appear/disappear between refreshes.
 */
export const getMealPlanFilterOptions = (
  hotels: Array<unknown> = [],
  includeDefaultPlans = true,
): string[] => {
  const options = new Set([
    ...(includeDefaultPlans ? MEAL_PLAN_FILTER_ORDER : []),
    ...hotels.flatMap((hotel) => {
      const record = hotel && typeof hotel === "object" ? hotel as Record<string, unknown> : {};
      return [
        normalizeMealPlanLabel(String(record.mealPlan ?? "")),
        ...getMealPlanCodes(record),
      ];
    }).filter((mealPlan) => mealPlan && mealPlan !== "UNKNOWN"),
  ]);

  return Array.from(options).sort((a, b) => {
    const aIndex = MEAL_PLAN_FILTER_ORDER.indexOf(a);
    const bIndex = MEAL_PLAN_FILTER_ORDER.indexOf(b);
    if (aIndex === -1 && bIndex === -1) return a.localeCompare(b);
    if (aIndex === -1) return 1;
    if (bIndex === -1) return -1;
    return aIndex - bIndex;
  });
};

/** Applies a meal-plan filter without mutating the supplied hotel rows. */
export const filterHotelsByMealPlan = <T>(
  hotels: T[],
  selectedMealPlan?: string,
): T[] => {
  const normalizedFilter = normalizeMealPlanLabel(String(selectedMealPlan || "")).trim().toLowerCase();
  if (!normalizedFilter || normalizedFilter === "unknown") return hotels;

  return hotels.filter((hotel) => {
    const record = hotel && typeof hotel === "object"
      ? hotel as Record<string, unknown>
      : {};
    return getSelectableMealPlanCodes(record).some((value) =>
      normalizeMealPlanLabel(value).trim().toLowerCase() === normalizedFilter,
    );
  });
};

export type MealPlanSelectionFlags = {
  all: boolean;
  breakfast: boolean;
  lunch: boolean;
  dinner: boolean;
};

/**
 * Builds the legacy selection flags from the canonical meal-plan code.
 * The code/rate identity is authoritative; these flags are compatibility
 * fields only. MAP is represented as breakfast plus one major meal (the
 * canonical backend definition uses dinner as its deterministic flag form).
 */
export const getMealPlanSelectionFlags = (value: unknown): MealPlanSelectionFlags => {
  const code = normalizedLabelToCode(normalizeMealPlanLabel(String(value || "")));
  switch (code) {
    case "CP":
      return { all: false, breakfast: true, lunch: false, dinner: false };
    case "MAP":
      return { all: false, breakfast: true, lunch: false, dinner: true };
    case "AP":
      return { all: true, breakfast: true, lunch: true, dinner: true };
    case "EP":
      return { all: false, breakfast: false, lunch: false, dinner: false };
    default:
      return { all: false, breakfast: false, lunch: false, dinner: false };
  }
};

export const getRoomMealDisplayLabel = (hotel: HotelLike): string => {
  const roomType = String(hotel.roomType || hotel.roomTypeName || "Room").trim();
  return `${roomType} / ${getMealPlanCodeOnly(hotel.mealPlan)}`;
};

export const getAutoSkipRoomMealMismatchMessage = (
  hotel: HotelLike,
  selectedForStay?: HotelLike | null,
  previousSelectedHotel?: HotelLike | null,
): string => {
  if (!hotel || !previousSelectedHotel || !isSelectableHotel(hotel)) return "";
  if (selectedForStay && getHotelOptionKey(hotel) === getHotelOptionKey(selectedForStay)) return "";
  if (!isSameHotelIdentity(hotel, previousSelectedHotel) || isSameRoomMealIdentity(hotel, previousSelectedHotel)) return "";
  return [
    "Not auto-selected because the room type or meal plan is different from the previous night.",
    `Previous: ${getRoomMealDisplayLabel(previousSelectedHotel)}.`,
    `This option: ${getRoomMealDisplayLabel(hotel)}.`,
    "You can still choose this manually if you want.",
  ].join(" ");
};

export const hasSelectableHotelIdentity = (hotel: HotelLike): boolean => {
  const canonicalHotelId = Number(hotel.canonicalHotelId ?? hotel.canonical_hotel_id ?? NaN);
  if (Number.isFinite(canonicalHotelId) && canonicalHotelId > 0) return true;
  const hotelId = Number(hotel.hotelId ?? hotel.hotel_id ?? hotel.id ?? NaN);
  if (Number.isFinite(hotelId) && hotelId > 0) return true;
  return Boolean(String(hotel.bookingCode || "").trim() || String(hotel.searchReference || "").trim() || String(hotel.hotelName || "").trim());
};

export const getLowestRoomTypeAmount = (roomTypeOptions: HotelRoomDetail[]): number =>
  roomTypeOptions.reduce((lowest, option) => {
    const optionAmount = getHotelDisplayAmount(option);
    if (lowest === 0) return optionAmount;
    if (optionAmount <= 0) return lowest;
    return optionAmount < lowest ? optionAmount : lowest;
  }, 0);

export const getLowestRoomTypeBaseAmount = (roomTypeOptions: HotelRoomDetail[]): number =>
  roomTypeOptions.reduce((lowest, option) => {
    const optionAmount = getHotelBaseAmount(option);
    if (lowest === 0) return optionAmount;
    if (optionAmount <= 0) return lowest;
    return optionAmount < lowest ? optionAmount : lowest;
  }, 0);

export const getHotelsForStay = (
  sourceHotels: ItineraryHotelRow[],
  routeId: number,
  stayDate: string,
  groupType: number | undefined,
  planId: number,
  roomCount: number,
  stayDestination = '',
): HotelRoomDetail[] => {
  const normalizeStayDate = (value: unknown): string => {
    const raw = String(value || '').trim();
    if (!raw) return '';
    if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
    const parsed = new Date(raw);
    if (Number.isNaN(parsed.getTime())) return raw.slice(0, 10);
    // Route timestamps are stored as UTC representations of India-local
    // midnight. Compare the business date, not the UTC calendar date.
    return new Date(parsed.getTime() + 330 * 60 * 1000).toISOString().slice(0, 10);
  };
  const normalizedStayDate = normalizeStayDate(stayDate);
  const normalizeDestination = (value: unknown): string => String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '');
  const normalizedStayDestination = normalizeDestination(stayDestination);
  const destinationMatches = (hotel: ItineraryHotelRow): boolean => {
    if (!normalizedStayDestination) return true;
    const hotelDestination = normalizeDestination(hotel.destination);
    if (!hotelDestination) return true;
    return hotelDestination === normalizedStayDestination ||
      hotelDestination.includes(normalizedStayDestination) ||
      normalizedStayDestination.includes(hotelDestination);
  };
  const isIncompleteStayRow = (hotel: ItineraryHotelRow): boolean =>
    hotel.completeStayBookable === false;
  const routeMatches = (hotel: ItineraryHotelRow): boolean => {
    const primaryRouteId = toNumber(hotel.itineraryRouteId || hotel.routeId, 0);
    if (primaryRouteId === routeId) return true;
    if (!isIncompleteStayRow(hotel)) return false;
    return (Array.isArray(hotel.completeStayRouteIds) ? hotel.completeStayRouteIds : [])
      .some((candidateRouteId) => toNumber(candidateRouteId, 0) === routeId);
  };
  const dateMatches = (hotel: ItineraryHotelRow): boolean => {
    const hotelDate = normalizeStayDate(hotel.date || hotel.checkInDate || hotel.itineraryRouteDate);
    if (hotelDate === normalizedStayDate) return true;
    if (!isIncompleteStayRow(hotel)) return false;
    return (Array.isArray(hotel.unavailableDates) ? hotel.unavailableDates : [])
      .some((unavailableDate) => normalizeStayDate(unavailableDate) === normalizedStayDate);
  };
  const hotelsForRoute = sourceHotels
    .filter(routeMatches)
    .filter((hotel) => !groupType || groupType <= 0 || toNumber(hotel.groupType, 0) === toNumber(groupType, 0))
    .filter(dateMatches)
    .filter(destinationMatches)
    .flatMap((hotel) => {
      const rateOptions = Array.isArray((hotel as any).rateOptions)
        ? (hotel as any).rateOptions
        : [];

      // Supplier rows (especially TBO) can contain several meal-plan rates in
      // one `rateOptions` array. Expose each rate as a selectable UI option;
      // filtering only the parent row makes MAP/AP/EP appear to have no rates.
      // When rate options are present they are the current provider snapshot.
      // Do not also expose the parent row: it can carry selected_* pricing
      // from a previous hotel/rate and would otherwise become a duplicate
      // card with a stale amount.
      const expandedRows = (rateOptions.length > 0 ? rateOptions : [null]).map((rateOption: any) => rateOption ? ({
          ...hotel,
          ...rateOption,
          hotelId: hotel.hotelId,
          canonicalHotelId: hotel.canonicalHotelId,
          hotelCode: hotel.hotelCode,
          hotelName: hotel.hotelName,
          category: hotel.category,
          provider: rateOption.provider || hotel.provider,
          providerDisplayName: rateOption.providerDisplayName || hotel.providerDisplayName,
          groupType: hotel.groupType,
          itineraryRouteId: hotel.itineraryRouteId,
          routeIds: hotel.routeIds,
          date: hotel.date,
          day: hotel.day,
          destination: hotel.destination,
          mealPlan:
            rateOption.mealPlan ||
            rateOption.mealPlanCode ||
            rateOption.ratePlanName ||
            hotel.mealPlan,
          roomType: rateOption.roomType || hotel.roomType,
          // A nested option is authoritative for room/rate identity. Do not
          // fall back to the parent row here: parent rows can still contain
          // the previously selected room's booking code, roomId, rateId, or
          // price. That creates the recorded Suite/MAP versus Deluxe/CP mix.
          bookingCode: rateOption.bookingCode || rateOption.booking_code,
          searchReference: rateOption.searchReference || rateOption.search_reference,
          rateOptionId: rateOption.rateOptionId || rateOption.rate_option_id,
          optionKey: rateOption.optionKey || rateOption.option_key,
          roomId: rateOption.roomId || rateOption.room_id,
          rateId: rateOption.rateId || rateOption.rate_id,
          roomTypeId: rateOption.roomTypeId || rateOption.room_type_id,
          pricePerNight: rateOption.pricePerNight ?? hotel.pricePerNight ?? hotel.totalHotelCost,
          totalStayPrice:
            rateOption.totalStayPrice ??
            rateOption.totalPrice ??
            rateOption.price ??
            hotel.totalStayPrice,
          totalHotelCost:
            rateOption.totalStayPrice ??
            rateOption.totalPrice ??
            rateOption.price ??
            hotel.totalHotelCost,
          totalHotelTaxAmount: rateOption.totalHotelTaxAmount ?? hotel.totalHotelTaxAmount,
          totalAmount:
            rateOption.totalStayPrice ??
            rateOption.totalPrice ??
            rateOption.price ??
            getHotelAmountWithRooms(hotel),
          // Availability is computed at the parent stay level for some
          // supplier snapshots. Preserve it when expanding a nested rate
          // option; otherwise a partial-stay Axis rate can lose the
          // unavailable dates and render as merely "Restricted".
          availableDates: rateOption.availableDates ?? hotel.availableDates,
          unavailableDates: rateOption.unavailableDates ?? hotel.unavailableDates,
          completeStayBookable: rateOption.completeStayBookable ?? hotel.completeStayBookable,
          completeStayRouteIds: rateOption.completeStayRouteIds ?? hotel.completeStayRouteIds,
          availabilityStatus: rateOption.availabilityStatus ?? hotel.availabilityStatus,
          availabilityMessage: rateOption.availabilityMessage ?? hotel.availabilityMessage,
          isSelectable: rateOption.isSelectable ?? hotel.isSelectable,
          // The expanded option is priced by the current snapshot. Clear
          // legacy selection fields inherited from the parent row so an old
          // provider selection cannot override this rate.
          selectedTotalPrice: undefined,
          selected_total_price: undefined,
          selectedPricePerNight: undefined,
          selected_price_per_night: undefined,
          selection: undefined,
          rateOptions: undefined,
        }) : hotel);

      return expandedRows.map((expandedHotel) => ({
        ...expandedHotel,
        itineraryPlanId: planId,
        hotelCategory: expandedHotel.category,
        pricePerNight: expandedHotel.pricePerNight ?? expandedHotel.totalHotelCost,
        perNightAmount: expandedHotel.totalHotelCost,
        taxAmount: expandedHotel.totalHotelTaxAmount || 0,
        totalAmount: getHotelAmountWithRooms(expandedHotel),
        noOfRooms: getEffectiveRoomCount(expandedHotel, roomCount),
        roomTypeName: expandedHotel.roomType,
        availableRoomTypes: expandedHotel.roomType
          ? [{ roomTypeId: 1, roomTypeTitle: expandedHotel.roomType }]
          : [],
      } as HotelRoomDetail));
    });

  const uniqueByRateOption = new Map<string, HotelRoomDetail>();
  hotelsForRoute.forEach((hotel) => {
    const key = [
      String(hotel.provider || ""), String(hotel.bookingCode || ""), String(hotel.searchReference || ""),
      String(hotel.hotelId || ""), String(hotel.roomType || ""), String(hotel.mealPlan || ""),
      String(hotel.availabilityStatus || ""), String(hotel.totalHotelCost || 0), String(hotel.totalHotelTaxAmount || 0),
    ].join("|");
    if (!uniqueByRateOption.has(key)) uniqueByRateOption.set(key, hotel);
  });
  return Array.from(uniqueByRateOption.values());
};

export const mergeHotelOptions = (...hotelGroups: HotelRoomDetail[][]): HotelRoomDetail[] => {
  const uniqueByRateOption = new Map<string, HotelRoomDetail>();
  hotelGroups.flat().filter(Boolean).forEach((hotel) => {
    // A supplier rate identity is canonical.  Do not merge a fresh rate with
    // an older option merely because the property/room/meal/price happen to
    // look similar.  This is especially important for date-scoped offline
    // and AxisRooms references.
    const canonicalRateId = String(
      hotel.rateOptionId || hotel.selectedRateOptionId || hotel.optionKey || "",
    ).trim();
    const propertyIdentity = normalizeHotelDisplayName(String(hotel.hotelName || ""))
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "") ||
      String(hotel.canonicalHotelId || hotel.hotelId || hotel.hotelCode || "")
        .trim()
        .toLowerCase();
    const key = canonicalRateId
      ? `rate:${propertyIdentity}:${canonicalRateId}`
      : [
          "legacy",
          String(hotel.provider || ""), String(hotel.bookingCode || ""), String(hotel.searchReference || ""),
          String(hotel.hotelId || ""), String(hotel.roomType || hotel.roomTypeName || ""), String(hotel.mealPlan || ""),
          String(hotel.availabilityStatus || ""), String(hotel.totalHotelCost || hotel.pricePerNight || 0),
          String(hotel.totalHotelTaxAmount || hotel.taxAmount || 0),
        ].join("|");
    if (!uniqueByRateOption.has(key)) uniqueByRateOption.set(key, hotel);
  });
  return Array.from(uniqueByRateOption.values());
};
