import type { AvailableHotspot } from "../itinerary-details.types";

export interface HotspotAvailabilityNormalizationOptions {
  excludedIds?: number[];
  activeIds?: Set<number>;
  manualMetaById?: Map<number, { routeHotspotId?: number | null; isManual?: boolean }>;
}

/** Normalizes backend hotspot availability against the active route and local exclusions. */
export function normalizeAvailableHotspots(
  hotspots: AvailableHotspot[],
  defaults: {
    excludedIds: number[];
    activeIds: Set<number>;
    manualMetaById: Map<number, { routeHotspotId?: number | null; isManual?: boolean }>;
  },
  options?: HotspotAvailabilityNormalizationOptions,
): AvailableHotspot[] {
  const excludedSet = new Set((options?.excludedIds || defaults.excludedIds).map(Number));
  const activeSet = options?.activeIds || defaults.activeIds;
  const manualMetaById = options?.manualMetaById || defaults.manualMetaById;

  return hotspots.map((hotspot) => {
    const hotspotId = Number(hotspot.id);
    const backendStatus = String(hotspot.availabilityStatus || "").trim().toUpperCase();
    const reason = String(hotspot.availabilityReason || "").trim().toLowerCase();
    const isExcludedByBackend =
      backendStatus === "EXCLUDED_BY_ROUTE" ||
      reason.includes("excluded for this route") ||
      reason.includes("currently excluded");
    const isDeletedOrExcluded = excludedSet.has(hotspotId) || isExcludedByBackend;
    const isActuallyActive = activeSet.has(hotspotId);

    if (isDeletedOrExcluded && !isActuallyActive) {
      return {
        ...hotspot,
        alreadyAdded: false,
        availabilityStatus: "EXCLUDED_BY_ROUTE",
        actionDisabled: false,
        buttonLabel: "Preview",
      };
    }

    const manualMeta = manualMetaById.get(hotspotId) || null;
    if (isActuallyActive) {
      return {
        ...hotspot,
        alreadyAdded: true,
        visitAgain: true,
        availabilityStatus: "ACTIVE_THIS_ROUTE",
        availabilityReason: "Hotspot is already active on this route.",
        actionDisabled: true,
        buttonLabel: "Added",
        routeHotspotId: Number(hotspot.routeHotspotId || manualMeta?.routeHotspotId || 0) || null,
        planOwnWay: hotspot.planOwnWay === true || manualMeta?.isManual === true,
        isManual: hotspot.isManual === true || manualMeta?.isManual === true,
      };
    }

    return hotspot;
  });
}
