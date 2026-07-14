import type { ItineraryDay } from "../itinerary-details.types";

export type RouteHotspotMeta = {
  hotspotId: number;
  routeHotspotId: number | null;
  isManual: boolean;
};

const isDeletedRouteSegment = (segment: Record<string, unknown>): boolean => (
  segment.isDeleted === true
  || segment.deleted === true
  || segment.isExcluded === true
  || segment.excluded === true
  || segment.removed === true
  || segment.deletedAt != null
  || segment.deleted_at != null
  || String(segment.status || "").toLowerCase() === "deleted"
  || String(segment.status || "").toLowerCase() === "excluded"
);

const getRouteSegments = (days: ItineraryDay[] | null | undefined, routeId: number): Record<string, unknown>[] => {
  const day = days?.find((candidate) => Number(candidate.id) === routeId);
  return (Array.isArray(day?.segments) ? day.segments : []) as unknown as Record<string, unknown>[];
};

export const buildCurrentRouteAttractionHotspotIds = (
  days: ItineraryDay[] | null | undefined,
  routeIdValue: number | null | undefined,
  excludedHotspotIds: readonly number[],
): Set<number> => {
  const routeId = Number(routeIdValue || 0);
  if (!routeId || !Array.isArray(days)) return new Set<number>();
  const excluded = new Set(excludedHotspotIds.map(Number));
  const ids = new Set<number>();
  for (const segment of getRouteSegments(days, routeId)) {
    if (String(segment.type || "").toLowerCase() !== "attraction" || isDeletedRouteSegment(segment)) continue;
    const id = Number(segment.hotspotId ?? segment.locationId ?? 0);
    if (Number.isFinite(id) && id > 0 && !excluded.has(id)) ids.add(id);
  }
  return ids;
};

export const buildCurrentRouteManualHotspotIds = (
  days: ItineraryDay[] | null | undefined,
  routeIdValue: number | null | undefined,
  excludedHotspotIds: readonly number[],
  addedInModalHotspotIds: ReadonlySet<number>,
): Set<number> => {
  const routeId = Number(routeIdValue || 0);
  if (!routeId || !Array.isArray(days)) return new Set<number>();
  const excluded = new Set(excludedHotspotIds.map(Number));
  const ids = new Set<number>();
  for (const segment of getRouteSegments(days, routeId)) {
    if (String(segment.type || "").toLowerCase() !== "attraction" || isDeletedRouteSegment(segment)) continue;
    const id = Number(segment.hotspotId ?? segment.locationId ?? 0);
    const isManual = segment.planOwnWay === true || segment.isManual === true;
    if (Number.isFinite(id) && id > 0 && isManual && !excluded.has(id)) ids.add(id);
  }
  for (const id of addedInModalHotspotIds) ids.add(Number(id));
  return ids;
};

export const buildCurrentRouteManualHotspotMetaById = (
  days: ItineraryDay[] | null | undefined,
  routeIdValue: number | null | undefined,
  excludedHotspotIds: readonly number[],
): Map<number, RouteHotspotMeta> => {
  const routeId = Number(routeIdValue || 0);
  const excluded = new Set(excludedHotspotIds.map(Number));
  const map = new Map<number, RouteHotspotMeta>();
  for (const segment of getRouteSegments(days, routeId)) {
    if (String(segment.type || "").toLowerCase() !== "attraction") continue;
    const hotspotId = Number(segment.hotspotId ?? segment.locationId ?? 0);
    if (!Number.isFinite(hotspotId) || hotspotId <= 0 || excluded.has(hotspotId) || isDeletedRouteSegment(segment)) continue;
    if (segment.planOwnWay !== true && segment.isManual !== true) continue;
    map.set(hotspotId, {
      hotspotId,
      routeHotspotId: Number(segment.routeHotspotId || 0) || null,
      isManual: true,
    });
  }
  return map;
};
