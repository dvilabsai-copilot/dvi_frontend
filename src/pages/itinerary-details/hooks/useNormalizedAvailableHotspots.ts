import { useCallback } from "react";
import type { AvailableHotspot } from "../itinerary-details.types";
import { normalizeAvailableHotspots } from "../utils/hotspotAvailability.utils";

type NormalizeOptions = {
  routeId?: number | null;
  excludedIds?: number[];
  activeIds?: Set<number>;
};

type UseNormalizedAvailableHotspotsOptions = {
  excludedHotspotIds: number[];
  currentRouteAttractionHotspotIds: Set<number>;
  currentRouteManualHotspotMetaById: Map<number, unknown>;
};

/** Keeps the modal's available-hotspot normalization policy outside the page controller. */
export const useNormalizedAvailableHotspots = ({
  excludedHotspotIds,
  currentRouteAttractionHotspotIds,
  currentRouteManualHotspotMetaById,
}: UseNormalizedAvailableHotspotsOptions) => useCallback((
  hotspots: AvailableHotspot[],
  options?: NormalizeOptions,
): AvailableHotspot[] => normalizeAvailableHotspots(
  hotspots,
  {
    excludedIds: excludedHotspotIds,
    activeIds: currentRouteAttractionHotspotIds,
    manualMetaById: currentRouteManualHotspotMetaById,
  },
  options,
), [excludedHotspotIds, currentRouteAttractionHotspotIds, currentRouteManualHotspotMetaById]);
