/**
 * One hotel per contiguous destination stay, scoped to a recommendation.
 * A saved Mangalore hotel must not suppress Udupi search offers. No supplier
 * search or booking evidence is manufactured by this display helper.
 */
export type TboStayRoute = { routeId: number; date: string; destination: string; dayNumber?: number };
export type TboSelectedRoute = {
  routeId: number;
  selectionStatus?: string;
  selected?: { hotelCode?: string | null; providerHotelCode?: string | null; hotelName?: string | null } | null;
};
export type TboSelectionGroup = { groupType: number; routes?: TboSelectedRoute[] };
export type TboStayBlock = {
  firstRouteId: number;
  routeIds: number[];
  destination: string;
  checkInDate: string;
  checkOutDate: string;
  selectionStatus: "UNSELECTED" | "PARTIAL" | "COMPLETE";
};
const nextDate = (date: string): string => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return "";
  const millis = Date.parse(date + "T00:00:00Z");
  return Number.isFinite(millis) ? new Date(millis + 86400000).toISOString().slice(0, 10) : "";
};
export function getTboStayBlocks(
  routes: readonly TboStayRoute[],
  selectionGroups: readonly TboSelectionGroup[],
  groupType: number,
): TboStayBlock[] {
  const selectedRoutes = new Set<number>();
  const group = selectionGroups.find((item) => Number(item.groupType) === groupType);
  for (const route of group?.routes || []) {
    const id = Number(route.routeId || 0);
    if (id > 0 && route.selectionStatus === "SELECTED" && route.selected &&
        (String(route.selected.hotelCode || route.selected.providerHotelCode || route.selected.hotelName || "").trim())) {
      selectedRoutes.add(id);
    }
  }
  const blocks: TboStayBlock[] = [];
  const sorted = [...routes].sort((a,b) => String(a.date || "").localeCompare(String(b.date || "")));
  const seen = new Set<number>();
  for (const route of sorted) {
    const routeId = Number(route.routeId || 0);
    const date = String(route.date || "").slice(0,10);
    const destination = String(route.destination || "").trim();
    if (!routeId || seen.has(routeId) || !/^\d{4}-\d{2}-\d{2}$/.test(date) || !destination) continue;
    seen.add(routeId);
    const prior = blocks[blocks.length - 1];
    if (prior && prior.destination.toLowerCase() === destination.toLowerCase() && prior.checkOutDate === date) {
      prior.routeIds.push(routeId);
      prior.checkOutDate = nextDate(date);
    } else {
      blocks.push({firstRouteId: routeId, routeIds: [routeId], destination,
        checkInDate: date, checkOutDate: nextDate(date), selectionStatus: "UNSELECTED"});
    }
  }
  for (const block of blocks) {
    const selectedCount = block.routeIds.filter((id) => selectedRoutes.has(id)).length;
    block.selectionStatus = selectedCount === 0 ? "UNSELECTED" :
      selectedCount === block.routeIds.length ? "COMPLETE" : "PARTIAL";
  }
  return blocks;
}

/**
 * A saved recommendation is not evidence that other destinations have been
 * searched. Always display unsaved supplier-stay controls, regardless of the
 * current searchRunId, availabilityState or how many recommendation tabs exist.
 */
export function shouldShowUnselectedTboStays(
  roomCount: number,
  readOnly: boolean,
  blocks: readonly TboStayBlock[],
): boolean {
  return !readOnly && Number.isInteger(roomCount) && roomCount >= 7 && roomCount <= 25 &&
    blocks.some((block) => block.selectionStatus !== "COMPLETE");
}

/** This only requests another search; it never establishes availability. */
export function unpricedUnselectedTboStayRoutes(
  blocks: readonly TboStayBlock[],
  routeIdsWithVerifiedOffers: readonly number[],
): number[] {
  const verified = new Set(routeIdsWithVerifiedOffers);
  return blocks
    .filter((block) => block.selectionStatus === "UNSELECTED" && !verified.has(block.firstRouteId))
    .map((block) => block.firstRouteId);
}
