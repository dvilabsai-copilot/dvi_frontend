import { useHotspotPreviewMutation } from "./useHotspotPreviewMutation";
import { useHotspotPriorityReplacementController } from "./useHotspotPriorityReplacementController";
import { useHotspotMatrixPreviewController } from "./useHotspotMatrixPreviewController";
import { useHotspotAddMutation } from "./useHotspotAddMutation";
import type { HotspotStateSnapshot, DeletionStateSnapshot, RouteStateSnapshot } from "./useHotspotPreviewViewModel.types";
import type { useHotspotPreviewViewModel } from "./useHotspotPreviewViewModel";
import type { ItineraryDetailsResponse } from "../itinerary-details.types";

type PreviewModel = ReturnType<typeof useHotspotPreviewViewModel>;
type HotspotAddArgs = Parameters<typeof useHotspotAddMutation>[0];

export function useItineraryHotspotMutationWorkflow({
  hotspotState,
  deletionState,
  routeState,
  previewModel,
  selectedHotspotAnchor,
  selectedHotspotId,
  groupPreviewResolution,
  pendingPriorityReplacementHotspotId,
  addHotspotModal,
  itinerary,
  quoteId,
  readOnly,
  shouldShowHotels,
  isDestinationSideManualPreview,
  resetManualHotspotPreviewState,
  resetManualHotspotPreviewStateButKeepActiveHotspot,
  getManualTimingPolicyFromPreview,
  filterAvailableHotspotsForAnchor,
}: {
  hotspotState: HotspotStateSnapshot;
  deletionState: DeletionStateSnapshot;
  routeState: RouteStateSnapshot;
  previewModel: PreviewModel;
  selectedHotspotAnchor: HotspotStateSnapshot["selectedHotspotAnchor"];
  selectedHotspotId: number | null;
  groupPreviewResolution: HotspotStateSnapshot["groupPreviewResolution"];
  pendingPriorityReplacementHotspotId: number | null;
  addHotspotModal: HotspotStateSnapshot["addHotspotModal"];
  itinerary: ItineraryDetailsResponse | null;
  quoteId: string | undefined;
  readOnly: boolean;
  shouldShowHotels: boolean;
  isDestinationSideManualPreview: boolean;
  resetManualHotspotPreviewState: () => void;
  resetManualHotspotPreviewStateButKeepActiveHotspot: (candidateId: number) => void;
  getManualTimingPolicyFromPreview: (value: unknown) => { endTime?: unknown } | null;
  filterAvailableHotspotsForAnchor: HotspotAddArgs["filterAvailableHotspotsForAnchor"];
}) {
  const {
    activePreviewHotspotId, previewRequestIdRef, timelinePreviewRef, setActivePreviewHotspotId,
    setSelectedHotspotIds, setForceReplacementApprovedByHotspot, setTopPriorityReplacementApproved,
    setIsPreviewingHotspotId, setManualPreviewState, setPreviewTimelinesByHotspot, setPreviewResolutionsByHotspot,
    setGroupPreviewResolution, setIsBuildingMatrix, setIsAddingHotspot, setIsApplyingPreviewHotspot,
    setAddedInModalHotspotIds, setAvailableHotspots, setHotspotFilterMeta,
  } = hotspotState;
  const { setRouteNeedsRebuild } = deletionState;
  const { setItinerary, setHotelDetails } = routeState;

  const { handlePreviewHotspot, handleRemovePreviewHotspot } = useHotspotPreviewMutation({
    addHotspotModal, activePreviewHotspotId, selectedHotspotAnchor, previewRequestIdRef, timelinePreviewRef,
    resetManualHotspotPreviewState, getManualTimingPolicyFromPreview, setActivePreviewHotspotId,
    setSelectedHotspotIds, setForceReplacementApprovedByHotspot, setTopPriorityReplacementApproved,
    setIsPreviewingHotspotId, setManualPreviewState, setPreviewTimelinesByHotspot, setPreviewResolutionsByHotspot,
    setGroupPreviewResolution,
  });
  const { handleConfirmPriorityReplacement, handleCancelPriorityReplacement } = useHotspotPriorityReplacementController({
    groupPreviewResolution, pendingPriorityReplacementHotspotId, selectedHotspotId,
    selectedHotspotIds: hotspotState.selectedHotspotIds, handlePreviewHotspot, handleRemovePreviewHotspot,
    setForceReplacementApprovedByHotspot, setTopPriorityReplacementApproved,
  });
  const handleBuildMatrixAndPreviewAgain = useHotspotMatrixPreviewController({
    activePreviewHotspotId, planId: addHotspotModal.planId, routeId: addHotspotModal.routeId,
    isDestinationSideManualPreview, resetManualHotspotPreviewStateButKeepActiveHotspot, handlePreviewHotspot,
    setIsBuildingMatrix,
  });
  const handleAddHotspot = useHotspotAddMutation({
    readOnly, addHotspotModal, selectedHotspotAnchor, activePreviewResolution: previewModel.activePreviewResolution,
    manualPreviewState: hotspotState.manualPreviewState, activePreviewHotspotId,
    groupPreviewResolution, topPriorityReplacementApproved: hotspotState.topPriorityReplacementApproved,
    selectedPreviewSegments: previewModel.selectedPreviewSegments, currentRouteAttractionHotspotIds: previewModel.currentRouteAttractionHotspotIds,
    addedInModalHotspotIds: hotspotState.addedInModalHotspotIds, selectedHotspotIds: hotspotState.selectedHotspotIds,
    itinerary, quoteId: quoteId || null, shouldShowHotels, normalizeAvailableHotspots: previewModel.normalizeAvailableHotspots,
    getManualTimingPolicyFromPreview, filterAvailableHotspotsForAnchor, resetManualHotspotPreviewState,
    setIsAddingHotspot, setIsApplyingPreviewHotspot, setAddedInModalHotspotIds, setAvailableHotspots,
    setRouteNeedsRebuild, setActivePreviewHotspotId, setItinerary, setHotelDetails, setHotspotFilterMeta,
  });

  return { handlePreviewHotspot, handleRemovePreviewHotspot, handleConfirmPriorityReplacement, handleCancelPriorityReplacement, handleBuildMatrixAndPreviewAgain, handleAddHotspot };
}
