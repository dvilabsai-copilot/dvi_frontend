import { useCallback, useMemo } from "react";
import type { ItineraryDetailsResponse, ItineraryHotelDetailsResponse, ItinerarySegment } from "../itinerary-details.types";
import { useHotspotPreviewViewModel } from "./useHotspotPreviewViewModel";
import type { useHotspotState } from "./useHotspotState";
import type { useItineraryDeletionState } from "./useItineraryDeletionState";

type HotspotState = ReturnType<typeof useHotspotState>;
type DeletionState = ReturnType<typeof useItineraryDeletionState>;

/** Composes hotspot preview state, reset callbacks, and the preview view model. */
export function useItineraryHotspotPreviewWorkflow({
  hotspotState,
  deletionState,
  itinerary,
  hotelDetails,
  mapDaySegmentToPreview,
}: {
  hotspotState: HotspotState;
  deletionState: DeletionState;
  itinerary: ItineraryDetailsResponse | null;
  hotelDetails: ItineraryHotelDetailsResponse | null;
  mapDaySegmentToPreview: (segment: ItinerarySegment) => Record<string, unknown>;
}) {
  const {
    addHotspotModal,
    activePreviewHotspotId,
    availableHotspots,
    previewTimelinesByHotspot,
    previewResolutionsByHotspot,
    groupPreviewResolution,
    manualPreviewState,
    selectedHotspotIds,
    topPriorityReplacementApproved,
    selectedHotspotAnchor,
    addedInModalHotspotIds,
    hotspotFilterMeta,
    activeHotspotCityTab,
    setActiveHotspotCityTab,
    hotspotSearchQuery,
    hotspotListRef,
    priorityConfirmRef,
    setManualPreviewState,
    setPreviewTimelinesByHotspot,
    setPreviewResolutionsByHotspot,
    setGroupPreviewTimeline,
    setGroupPreviewResolution,
    setTempModalTimeline,
    setForceReplacementApprovedByHotspot,
    setTopPriorityReplacementApproved,
    setSelectedHotspotIds,
    setIsPreviewingHotspotId,
    setActivePreviewHotspotId,
  } = hotspotState;
  const { excludedHotspotIds } = deletionState;

  const selectedHotspotId = activePreviewHotspotId ?? (selectedHotspotIds.length > 0
    ? selectedHotspotIds[selectedHotspotIds.length - 1]
    : null);
  const selectedFitHereDay = useMemo(
    () => itinerary?.days?.find((day) => Number(day.id) === Number(addHotspotModal.routeId || 0)) || null,
    [addHotspotModal.routeId, itinerary?.days],
  );
  const currentRouteForModal = useMemo(
    () => itinerary?.days?.find((day) => Number(day.id) === Number(addHotspotModal.routeId || 0)) || null,
    [addHotspotModal.routeId, itinerary?.days],
  );

  const resetManualHotspotPreviewState = useCallback(() => {
    setManualPreviewState(null);
    setPreviewTimelinesByHotspot({});
    setPreviewResolutionsByHotspot({});
    setGroupPreviewTimeline([]);
    setGroupPreviewResolution(null);
    setTempModalTimeline([]);
    setForceReplacementApprovedByHotspot({});
    setTopPriorityReplacementApproved(false);
    setSelectedHotspotIds([]);
    setIsPreviewingHotspotId(null);
  }, []);
  const resetManualHotspotPreviewStateButKeepActiveHotspot = useCallback((candidateId: number) => {
    resetManualHotspotPreviewState();
    setActivePreviewHotspotId(candidateId);
  }, [resetManualHotspotPreviewState]);

  const hotspotPreviewViewModel = useHotspotPreviewViewModel({
    itinerary,
    hotelDetails,
    addHotspotModal,
    activePreviewHotspotId,
    availableHotspots,
    previewTimelinesByHotspot,
    previewResolutionsByHotspot,
    groupPreviewResolution,
    manualPreviewState,
    selectedHotspotIds,
    topPriorityReplacementApproved,
    selectedHotspotAnchor,
    addedInModalHotspotIds,
    excludedHotspotIds,
    hotspotFilterMeta,
    activeHotspotCityTab,
    setActiveHotspotCityTab,
    hotspotSearchQuery,
    hotspotListRef,
    priorityConfirmRef,
    selectedHotspotId,
    selectedFitHereDay,
    currentRouteForModal,
    mapDaySegmentToPreview,
  });

  return {
    selectedHotspotId,
    selectedFitHereDay,
    currentRouteForModal,
    resetManualHotspotPreviewState,
    resetManualHotspotPreviewStateButKeepActiveHotspot,
    hotspotPreviewViewModel,
  };
}
