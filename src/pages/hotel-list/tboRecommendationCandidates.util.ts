import { getVerifiedTboSupplierOffer } from "./tboSupplierBatchOffer.util";

/**
 * Search inventory is NOT a quote or booking. Saved recommendation identities
 * must come from the persisted server response for ALL recommendation groups;
 * the currently displayed group's hotel rows are not sufficient.
 */
export type SavedTboRecommendation = {
  groupType: number;
  hotelCode: string;
};

export type TboRecommendationCandidate = {
  groupType: number;
  routeId: number;
  checkInDate: string;
  hotelCode: string;
  hotelName: string;
  roomType: string;
  mealPlan: string;
  currency: string;
  supplierFare: number;
  /** A duplicate persisted package requiring an explicit user replacement. */
  replacesHotelCode?: string;
};

type SearchInventoryRow = {
  provider?: unknown;
  hotelCode?: unknown;
  hotelName?: unknown;
  roomType?: unknown;
  itineraryRouteId?: unknown;
  routeId?: unknown;
  routeIds?: unknown;
  checkInDate?: unknown;
  date?: unknown;
  tboRoomBatches?: unknown;
};

type JsonRecord = Record<string, unknown>;
const record = (value: unknown): JsonRecord | null =>
  value && typeof value === "object" && !Array.isArray(value) ? value as JsonRecord : null;
const str = (v: unknown): string => String(v ?? "").trim();
const normCode = (v: unknown): string => str(v).toLowerCase();
const groupNo = (v: unknown): number => {
  const group = Number(v);
  return Number.isInteger(group) && group >= 1 && group <= 4 ? group : 0;
};
const savedSnapshot = (value: unknown): JsonRecord | null => {
  if (typeof value === "string") {
    try { return record(JSON.parse(value)); } catch { return null; }
  }
  return record(value);
};
const codeFrom = (value: unknown): string => {
  const row = record(value);
  if (!row) return "";
  const snapshot = savedSnapshot(row.selectedPriceSnapshot ?? row.selected_price_snapshot);
  const stay = record(row.tboMultiBatchStay ?? snapshot?.tboMultiBatchStay);
  return str(stay?.hotelCode ?? row.hotelCode ?? row.providerHotelCode ??
    row.hotel_code ?? snapshot?.hotelCode ?? snapshot?.providerHotelCode);
};

/**
 * Read every committed recommendation, not only the active group's hotel list.
 * Throw when a single group's two route nights point to different hotels; never
 * create a replacement preview from inconsistent saved state.
 */
export function getSavedTboRecommendations(response: unknown): SavedTboRecommendation[] {
  const payload = record(response);
  if (!payload) return [];
  const found = new Map<number, string>();
  const add = (group: number, code: string) => {
    if (!group || !code) return;
    const previous = found.get(group);
    if (previous && normCode(previous) !== normCode(code)) {
      throw new Error(`Saved Recommended #${group} has inconsistent hotels across nights.`);
    }
    found.set(group, code);
  };

  for (const value of Array.isArray(payload.hotelSelectionState) ? payload.hotelSelectionState : []) {
    const group = record(value);
    const number = groupNo(group?.groupType);
    for (const item of Array.isArray(group?.routes) ? group.routes : []) {
      const route = record(item);
      if (str(route?.selectionStatus).toUpperCase() !== "SELECTED") continue;
      add(number, codeFrom(route?.selected));
    }
  }
  for (const value of Array.isArray(payload.hotels) ? payload.hotels : []) {
    const row = record(value);
    if (!row) continue;
    const snapshot = savedSnapshot(row.selectedPriceSnapshot ?? row.selected_price_snapshot);
    const provider = str(row.provider ?? row.hotelProvider ?? row.hotel_provider ?? snapshot?.provider).toLowerCase();
    // Do not mistake regular inventory, or a non-TBO selection, for a booked
    // TBO recommendation. Multi-batch snapshots are also authoritative.
    if (provider !== "tbo" && !record(snapshot?.tboMultiBatchStay)) continue;
    if (row.isSelected !== true && !record(snapshot?.tboMultiBatchStay)) continue;
    add(groupNo(row.groupType ?? row.group_type), codeFrom(row));
  }
  return [...found.entries()].sort((a, b) => a[0] - b[0])
    .map(([groupType, hotelCode]) => ({ groupType, hotelCode }));
}

export function getDuplicateTboRecommendationGroups(saved: SavedTboRecommendation[]): number[] {
  const firstByHotel = new Map<string, number>();
  const duplicates: number[] = [];
  for (const entry of [...saved].sort((a, b) => a.groupType - b.groupType)) {
    const groupType = groupNo(entry.groupType);
    const code = normCode(entry.hotelCode);
    if (!groupType || !code) continue;
    if (firstByHotel.has(code)) duplicates.push(groupType);
    else firstByHotel.set(code, groupType);
  }
  return [...new Set(duplicates)];
}

/**
 * A genuine distinct property per recommendation group. After each save,
 * slot allocation is recomputed from ALL persisted group identities. A group
 * that already repeats another hotel may be repaired, but ONLY after an
 * explicit Replace action revalidates the supplier offers server-side.
 */
export function getTboRecommendationCandidates(args: {
  inventory: SearchInventoryRow[];
  requestedRooms: number;
  anchorRouteId: number;
  checkInDate: string;
  usedGroupTypes: number[];
  selectedHotelCodes: string[];
  savedRecommendations?: SavedTboRecommendation[];
}): TboRecommendationCandidate[] {
  const { inventory, requestedRooms, anchorRouteId, checkInDate } = args;
  if (!Number.isInteger(requestedRooms) || requestedRooms < 7 || requestedRooms > 25 ||
      !Number.isInteger(anchorRouteId) || anchorRouteId < 1 ||
      !/^\d{4}-\d{2}-\d{2}$/.test(checkInDate)) return [];

  const saved = [...(args.savedRecommendations || [])].sort((a, b) => a.groupType - b.groupType);
  const used = new Set(args.usedGroupTypes.map(groupNo).filter(Boolean));
  const selectedCodes = new Set(args.selectedHotelCodes.map(normCode).filter(Boolean));
  const firstSeen = new Set<string>();
  const replacements = new Map<number, string>();
  saved.forEach((entry) => {
    const group = groupNo(entry.groupType);
    const code = normCode(entry.hotelCode);
    if (!group || !code) return;
    used.add(group);
    selectedCodes.add(code);
    if (firstSeen.has(code)) replacements.set(group, entry.hotelCode);
    else firstSeen.add(code);
  });
  const slots = [1, 2, 3, 4].filter((groupType) => !used.has(groupType) || replacements.has(groupType));
  if (!slots.length) return [];

  const cheapestPerHotel = new Map<string, Omit<TboRecommendationCandidate, "groupType" | "replacesHotelCode">>();
  for (const row of inventory) {
    if (str(row?.provider).toLowerCase() !== "tbo") continue;
    const hotelCode = str(row.hotelCode);
    const identity = normCode(hotelCode);
    if (!hotelCode || selectedCodes.has(identity)) continue;
    const routeIds = Array.isArray(row.routeIds) ? row.routeIds.map(Number) : [];
    const rowRouteId = Number(row.itineraryRouteId || row.routeId || 0);
    if (rowRouteId !== anchorRouteId && !routeIds.includes(anchorRouteId)) continue;
    const rowDate = str(row.checkInDate || row.date).slice(0, 10);
    if (rowDate && rowDate !== checkInDate) continue;

    const verified = getVerifiedTboSupplierOffer(row, requestedRooms);
    if (!verified || verified.currency.toUpperCase() !== "INR") continue;
    const value = {
      routeId: anchorRouteId,
      checkInDate,
      hotelCode,
      hotelName: str(row.hotelName) || hotelCode,
      roomType: verified.roomType,
      mealPlan: verified.mealPlan,
      currency: verified.currency,
      supplierFare: verified.fullStayFare,
    };
    const current = cheapestPerHotel.get(identity);
    if (!current || value.supplierFare < current.supplierFare) cheapestPerHotel.set(identity, value);
  }
  const available = [...cheapestPerHotel.values()]
    .sort((a, b) => a.supplierFare - b.supplierFare || a.hotelCode.localeCompare(b.hotelCode));
  return slots.slice(0, available.length).map((groupType, index) => ({
    groupType,
    ...available[index],
    ...(replacements.has(groupType) ? { replacesHotelCode: replacements.get(groupType) } : {}),
  }));
}
