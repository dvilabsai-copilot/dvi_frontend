/* eslint-disable @typescript-eslint/no-explicit-any */
import { useMemo } from "react";
import {
  buildCurrentRouteAttractionHotspotIds,
  buildCurrentRouteManualHotspotIds,
  buildCurrentRouteManualHotspotMetaById,
} from "../utils/routeHotspotIds.utils";

type UseCurrentRouteHotspotStateOptions = {
  activePreviewHotspotId: number | null;
  addedInModalHotspotIds: Set<number>;
  excludedHotspotIds: readonly number[];
  itineraryDays: any[] | null | undefined;
  routeId: number | null | undefined;
};

/** Derives route hotspot IDs, manual metadata, and already-added preview state. */
export const useCurrentRouteHotspotState = ({
  activePreviewHotspotId,
  addedInModalHotspotIds,
  excludedHotspotIds,
  itineraryDays,
  routeId,
}: UseCurrentRouteHotspotStateOptions) => {
  const currentRouteAttractionHotspotIds = useMemo(
    () => buildCurrentRouteAttractionHotspotIds(itineraryDays, routeId, excludedHotspotIds),
    [routeId, excludedHotspotIds, itineraryDays],
  );

  const currentRouteManualHotspotIds = useMemo(
    () => buildCurrentRouteManualHotspotIds(itineraryDays, routeId, excludedHotspotIds, addedInModalHotspotIds),
    [addedInModalHotspotIds, routeId, excludedHotspotIds, itineraryDays],
  );

  const currentRouteManualHotspotMetaById = useMemo(
    () => buildCurrentRouteManualHotspotMetaById(itineraryDays, routeId, excludedHotspotIds),
    [routeId, excludedHotspotIds, itineraryDays],
  );

  const isCurrentPreviewAlreadyAdded = useMemo(() => {
    const id = Number(activePreviewHotspotId || 0);
    if (!id) return false;
    return currentRouteAttractionHotspotIds.has(id) || addedInModalHotspotIds.has(id);
  }, [activePreviewHotspotId, addedInModalHotspotIds, currentRouteAttractionHotspotIds]);

  return {
    currentRouteAttractionHotspotIds,
    currentRouteManualHotspotIds,
    currentRouteManualHotspotMetaById,
    isCurrentPreviewAlreadyAdded,
  };
};
