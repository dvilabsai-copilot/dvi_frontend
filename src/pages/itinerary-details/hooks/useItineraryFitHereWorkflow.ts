import { useCallback } from "react";
import { useAutoFitHereAnchors } from "./useAutoFitHereAnchors";
import { useAutoFitHerePreviewController } from "./useAutoFitHerePreviewController";
import { useFitHereHotspotSelection } from "./useFitHereHotspotSelection";
import { useFitHerePreviewController } from "./useFitHerePreviewController";
import { useFitHereDialogController } from "./useFitHereDialogController";
import { useFitHereConfirmationReset } from "./useFitHereConfirmationReset";
import { useFitHereConfirmationState } from "./useFitHereConfirmationState";
import { useFitHereConfirmationRefresh } from "./useFitHereConfirmationRefresh";
import { useFitHereConfirmationMutation } from "./useFitHereConfirmationMutation";
import { buildFitHereAnchorKey as buildFitHereAnchorKeyUtil, serializeFitHereAnchor as serializeFitHereAnchorUtil } from "../utils/fitHereAnchor.utils";
import { getFitHereTriedState } from "../utils/fitHereAttemptStatus.utils";
import { buildAutoPreviewAnchorProgressText as buildAutoPreviewAnchorProgressTextUtil } from "../utils/autoPreviewProgress.utils";
import type { HotspotAnchor, ItineraryDay } from "../itinerary-details.types";
import type { HotspotStateSnapshot, DeletionStateSnapshot, RouteStateSnapshot } from "./useHotspotPreviewViewModel.types";

export function useItineraryFitHereWorkflow({
  hotspotState,
  deletionState,
  routeState,
  itinerary,
  quoteId,
  selectedFitHotspot,
  selectedFitHereDay,
  addHotspotModal,
  fitHereModal,
  availableHotspots,
  shouldShowHotels,
  buildFitHereAnchorForTimelineRow,
  startFitHereProgressTimer,
  stopFitHereProgressTimer,
  resetManualHotspotPreviewState,
  resetManualHotspotPreviewStateButKeepActiveHotspot,
}: {
  hotspotState: HotspotStateSnapshot;
  deletionState: DeletionStateSnapshot;
  routeState: RouteStateSnapshot;
  itinerary: RouteStateSnapshot["itinerary"];
  quoteId: string | undefined;
  selectedFitHotspot: HotspotStateSnapshot["selectedFitHotspot"];
  selectedFitHereDay: ItineraryDay | null;
  addHotspotModal: HotspotStateSnapshot["addHotspotModal"];
  fitHereModal: HotspotStateSnapshot["fitHereModal"];
  availableHotspots: HotspotStateSnapshot["availableHotspots"];
  shouldShowHotels: boolean;
  buildFitHereAnchorForTimelineRow: Parameters<typeof useAutoFitHereAnchors>[0]["buildFitHereAnchorForTimelineRow"];
  startFitHereProgressTimer: () => void;
  stopFitHereProgressTimer: () => void;
  resetManualHotspotPreviewState: () => void;
  resetManualHotspotPreviewStateButKeepActiveHotspot: (candidateId: number) => void;
}) {
  const {
    previewRequestIdRef, setSelectedFitHotspot, setTriedFitHereAnchors, setFitHereModal, setAutoFitHereModal,
    setActivePreviewHotspotId, setSelectedHotspotIds, setManualPreviewState, setPreviewTimelinesByHotspot,
    setPreviewResolutionsByHotspot, setGroupPreviewTimeline, setGroupPreviewResolution, setTempModalTimeline,
    setAddedInModalHotspotIds, setExcludedHotspotIds, setAvailableHotspots, setRouteNeedsRebuild,
    setConfirmFitHereLoading,
  } = { ...hotspotState, ...deletionState };
  const { setItinerary, setHotelDetails } = routeState;
  const buildFitHereAnchorKey = buildFitHereAnchorKeyUtil;
  const serializeFitHereAnchor = useCallback(serializeFitHereAnchorUtil, []);
  const buildAutoFitHereAnchorsForDay = useAutoFitHereAnchors({ buildFitHereAnchorForTimelineRow });
  const buildAutoPreviewAnchorProgressText = useCallback(buildAutoPreviewAnchorProgressTextUtil, []);

  const handleSelectFitHotspot = useFitHereHotspotSelection({ previewRequestIdRef, stopFitHereProgressTimer, setSelectedFitHotspot, setTriedFitHereAnchors, setFitHereModal, setAutoFitHereModal, resetManualHotspotPreviewState, setActivePreviewHotspotId, setSelectedHotspotIds });
  const handleFitHereClick = useFitHerePreviewController({ selectedFitHotspot, itineraryPlanId: itinerary?.planId || null, buildFitHereAnchorKey, startFitHereProgressTimer, stopFitHereProgressTimer, setFitHereModal });
  const handleAutoPreviewFitHere = useAutoFitHerePreviewController({ itineraryPlanId: itinerary?.planId, selectedFitHereDay, buildAutoFitHereAnchorsForDay, buildFitHereAnchorKey, serializeFitHereAnchor, buildAutoPreviewAnchorProgressText, setSelectedFitHotspot, setActivePreviewHotspotId, setSelectedHotspotIds, setFitHereModal, setAutoFitHereModal, previewRequestIdRef, resetManualHotspotPreviewStateButKeepActiveHotspot, stopFitHereProgressTimer });
  const { handleFitHereCancel, handleRetryFitHere } = useFitHereDialogController({ fitHereModal, stopFitHereProgressTimer, getFitHereTriedState, setTriedFitHereAnchors, setFitHereModal, handleFitHereClick });
  const resetFitHereAfterConfirmation = useFitHereConfirmationReset({ setSelectedFitHotspot, setActivePreviewHotspotId, setSelectedHotspotIds, setManualPreviewState, setPreviewTimelinesByHotspot, setPreviewResolutionsByHotspot, setGroupPreviewTimeline, setGroupPreviewResolution, setTempModalTimeline, setFitHereModal, setAutoFitHereModal, setTriedFitHereAnchors });
  const applyFitHereConfirmationState = useFitHereConfirmationState({ itinerary, availableHotspots, setAddedInModalHotspotIds, setExcludedHotspotIds, setAvailableHotspots, setItinerary, setRouteNeedsRebuild });
  const refreshAfterFitHereConfirmation = useFitHereConfirmationRefresh({ quoteId, shouldShowHotels, setItinerary, setHotelDetails });
  const getFitHereRefreshScrollStorageKey = useCallback(() => {
    const normalizedQuoteId = String(quoteId || "").trim();
    return normalizedQuoteId ? `fit-here-refresh-day:${normalizedQuoteId}` : null;
  }, [quoteId]);
  const handleConfirmFitHere = useFitHereConfirmationMutation({
    itinerary, fitHereModal, selectedFitHotspot, selectedFitHereDay, fallbackRouteId: addHotspotModal.routeId,
    handleFitHereClick, stopFitHereProgressTimer, setConfirmFitHereLoading, resetFitHereAfterConfirmation,
    applyFitHereConfirmationState, refreshAfterFitHereConfirmation, getFitHereRefreshScrollStorageKey,
  });

  return {
    buildFitHereAnchorKey,
    handleSelectFitHotspot, handleFitHereClick, handleAutoPreviewFitHere, handleFitHereCancel, handleRetryFitHere,
    handleConfirmFitHere, getFitHereRefreshScrollStorageKey,
  };
}
