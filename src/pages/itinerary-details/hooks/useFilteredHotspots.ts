import { useMemo } from "react";
import type { AvailableHotspot } from "../itinerary-details.types";

type FilteredHotspotsOptions = {
  availableHotspots: AvailableHotspot[];
  searchQuery: string;
  currentRouteAttractionHotspotIds: ReadonlySet<number>;
  currentRouteManualHotspotIds: ReadonlySet<number>;
  addedInModalHotspotIds: ReadonlySet<number>;
};

/** Owns hotspot search filtering and preview/added/closed ordering for the modal list. */
export const useFilteredHotspots = ({
  availableHotspots,
  searchQuery,
  currentRouteAttractionHotspotIds,
  currentRouteManualHotspotIds,
  addedInModalHotspotIds,
}: FilteredHotspotsOptions): AvailableHotspot[] => useMemo(() => {
  const query = searchQuery.toLowerCase();
  const isDeletedFromTimeline = (hotspot: AvailableHotspot): boolean => {
    const backendStatus = String(hotspot.availabilityStatus || "").trim().toUpperCase();
    const availabilityReason = String(hotspot.availabilityReason || "").trim().toLowerCase();
    return backendStatus === "EXCLUDED_BY_ROUTE"
      || availabilityReason.includes("excluded for this route")
      || availabilityReason.includes("currently excluded");
  };

  const isAddedInCurrentRoute = (hotspot: AvailableHotspot): boolean => {
    const hotspotId = Number(hotspot.id || 0);
    const backendStatus = String(hotspot.availabilityStatus || "").trim().toUpperCase();
    const isAddedOnOtherRoute = hotspot.alreadyAddedOnOtherRoute === true || backendStatus === "ACTIVE_OTHER_ROUTE";
    return !isDeletedFromTimeline(hotspot) && (
      currentRouteAttractionHotspotIds.has(hotspotId)
      || addedInModalHotspotIds.has(hotspotId)
      || (hotspot.alreadyAdded === true && !isAddedOnOtherRoute)
      || backendStatus === "ACTIVE_THIS_ROUTE"
    );
  };

  const canPreview = (hotspot: AvailableHotspot): boolean => {
    const deletedFromTimeline = isDeletedFromTimeline(hotspot);
    const added = isAddedInCurrentRoute(hotspot);
    const backendStatus = String(hotspot.availabilityStatus || "").trim().toUpperCase();
    const isAddedOnOtherRoute = hotspot.alreadyAddedOnOtherRoute === true || backendStatus === "ACTIVE_OTHER_ROUTE";
    const disabled = added || (hotspot.actionDisabled === true && !isAddedOnOtherRoute && !deletedFromTimeline);
    const timingText = String(hotspot.timings || "").trim().toLowerCase();
    const closed = hotspot.isClosedOnRouteDate === true
      || backendStatus === "CLOSED_ON_ROUTE_DATE"
      || timingText === "closed"
      || timingText.length === 0
      || timingText === "no timings available";
    return !disabled && !closed;
  };

  const getSortRank = (hotspot: AvailableHotspot): number => {
    if (canPreview(hotspot)) return 1;
    const added = isAddedInCurrentRoute(hotspot);
    const hotspotId = Number(hotspot.id || 0);
    if (added && (
      currentRouteManualHotspotIds.has(hotspotId)
      || addedInModalHotspotIds.has(hotspotId)
      || hotspot.isManual === true
      || hotspot.planOwnWay === true
    )) return 2;
    return 3;
  };

  return availableHotspots
    .filter((hotspot) => (
      String(hotspot.name ?? "").toLowerCase().includes(query)
      || String(hotspot.description ?? "").toLowerCase().includes(query)
    ))
    .sort((a, b) => {
      const aTimingText = String(a.timings || "").trim().toLowerCase();
      const bTimingText = String(b.timings || "").trim().toLowerCase();
      const aClosed = a.isClosedOnRouteDate === true || String(a.availabilityStatus || "").toUpperCase() === "CLOSED_ON_ROUTE_DATE" || aTimingText === "closed" || aTimingText.length === 0 || aTimingText === "no timings available";
      const bClosed = b.isClosedOnRouteDate === true || String(b.availabilityStatus || "").toUpperCase() === "CLOSED_ON_ROUTE_DATE" || bTimingText === "closed" || bTimingText.length === 0 || bTimingText === "no timings available";
      const rankA = getSortRank(a);
      const rankB = getSortRank(b);

      if (rankA !== rankB) return rankA - rankB;
      if (aClosed !== bClosed) return aClosed ? 1 : -1;
      if (a.visitAgain !== b.visitAgain) return a.visitAgain ? 1 : -1;

      const normalizePriority = (priority: unknown): number => {
        const normalized = Number(priority ?? 0);
        return normalized > 0 ? normalized : 9999;
      };
      return normalizePriority(a.priority) - normalizePriority(b.priority);
    });
}, [addedInModalHotspotIds, availableHotspots, currentRouteAttractionHotspotIds, currentRouteManualHotspotIds, searchQuery]);
