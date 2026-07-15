import type { MutableRefObject } from "react";
import type { ItineraryDetailsResponse } from "../itinerary-details.types";
import { useHotspotApplyPresentation } from "./useHotspotApplyPresentation";
import { useItineraryAddHotspotDialogProps } from "./useItineraryAddHotspotDialogProps";
import type { useHotspotPreviewViewModel } from "./useHotspotPreviewViewModel";
import type { useHotspotState } from "./useHotspotState";

type HotspotState = ReturnType<typeof useHotspotState>;
type PreviewModel = ReturnType<typeof useHotspotPreviewViewModel>;
type AddDialogProps = Parameters<typeof useItineraryAddHotspotDialogProps>[0];
type ApplyOptions = Parameters<typeof useHotspotApplyPresentation>[0];

/** Composes hotspot presentation and dialog props after mutation handlers are ready. */
export function useItineraryHotspotDialogWorkflow({
  hotspotState,
  previewModel,
  itinerary,
  selectedFitHotspot,
  selectedHotspotAnchor,
  selectedHotspotId,
  selectedFitHereDay,
  selectedHotelMetaByRoute,
  destinationCityLabel,
  selectedPreviewCityContext,
  excludedHotspotIds,
  isBuildingMatrix,
  isApplyingPreviewHotspot,
  hasManualOpeningOrTimingConflict,
  toImgSrc,
  openGalleryModal,
  openVideoModal,
  openDeleteHotspotModal,
  handleSelectFitHotspot,
  handlePreviewHotspot,
  handleAutoPreviewFitHere,
  handleBuildMatrixAndPreviewAgain,
  handleRemovePreviewHotspot,
  handleConfirmPriorityReplacement,
  handleCancelPriorityReplacement,
  handleAddHotspot,
  getFitHereSegmentLabel,
  getFitHereSegmentTime,
  buildFitHereAnchorForTimelineRow,
  renderFitHereButton,
  getManualTimingPolicyFromPreview,
  formatManualPolicyTime,
  extractTravelToFromText,
  parseDisplayMinutes,
  formatMinutesToDisplay,
  normalizeDurationAgainstDistance,
  formatPreviewDuration,
  backendStrategyLabel,
  matrixBuildCommand,
  isManualRelaxedRouteFitPolicy,
  toast,
  resetManualHotspotPreviewState,
  previewRequestIdRef,
}: {
  hotspotState: HotspotState;
  previewModel: PreviewModel;
  itinerary: ItineraryDetailsResponse | null;
  selectedFitHotspot: HotspotState["selectedFitHotspot"];
  selectedHotspotAnchor: HotspotState["selectedHotspotAnchor"];
  selectedHotspotId: number | null;
  selectedFitHereDay: PreviewModel["selectedFitHereDay"];
  selectedHotelMetaByRoute: AddDialogProps["previewModel"]["selectedHotelMetaByRoute"];
  destinationCityLabel: string;
  selectedPreviewCityContext: PreviewModel["selectedPreviewCityContext"];
  excludedHotspotIds: number[];
  isBuildingMatrix: boolean;
  isApplyingPreviewHotspot: boolean;
  hasManualOpeningOrTimingConflict: AddDialogProps["previewModel"]["hasManualOpeningOrTimingConflict"];
  toImgSrc: AddDialogProps["list"]["toImgSrc"];
  openGalleryModal: AddDialogProps["list"]["openGalleryModal"];
  openVideoModal: AddDialogProps["list"]["openVideoModal"];
  openDeleteHotspotModal: (planId: number, routeId: number, routeHotspotId: number, masterHotspotId: number, hotspotName: string, isManualHotspot?: boolean) => void;
  handleSelectFitHotspot: AddDialogProps["list"]["onSelectFitHotspot"];
  handlePreviewHotspot: AddDialogProps["list"]["onPreviewHotspot"];
  handleAutoPreviewFitHere: AddDialogProps["list"]["onAutoPreviewFitHere"];
  handleBuildMatrixAndPreviewAgain: AddDialogProps["preview"]["onBuildMatrixAndPreviewAgain"];
  handleRemovePreviewHotspot: AddDialogProps["preview"]["onRemove"];
  handleConfirmPriorityReplacement: AddDialogProps["preview"]["onConfirmPriorityReplacement"];
  handleCancelPriorityReplacement: AddDialogProps["preview"]["onCancelPriorityReplacement"];
  handleAddHotspot: AddDialogProps["preview"]["handleAddHotspot"];
  getFitHereSegmentLabel: AddDialogProps["preview"]["getFitHereSegmentLabel"];
  getFitHereSegmentTime: AddDialogProps["preview"]["getFitHereSegmentTime"];
  buildFitHereAnchorForTimelineRow: AddDialogProps["preview"]["buildFitHereAnchorForTimelineRow"];
  renderFitHereButton: AddDialogProps["preview"]["renderFitHereButton"];
  getManualTimingPolicyFromPreview: AddDialogProps["preview"]["getManualTimingPolicyFromPreview"];
  formatManualPolicyTime: AddDialogProps["preview"]["formatManualPolicyTime"];
  extractTravelToFromText: AddDialogProps["preview"]["extractTravelToFromText"];
  parseDisplayMinutes: AddDialogProps["preview"]["parseDisplayMinutes"];
  formatMinutesToDisplay: AddDialogProps["preview"]["formatMinutesToDisplay"];
  normalizeDurationAgainstDistance: AddDialogProps["preview"]["normalizeDurationAgainstDistance"];
  formatPreviewDuration: AddDialogProps["preview"]["formatPreviewDuration"];
  backendStrategyLabel: string;
  matrixBuildCommand: string;
  isManualRelaxedRouteFitPolicy: ApplyOptions["isManualRelaxedRouteFitPolicy"];
  toast: AddDialogProps["list"]["toast"];
  resetManualHotspotPreviewState: () => void;
  previewRequestIdRef: MutableRefObject<number>;
}) {
  const { addHotspotModal, setAddHotspotModal, setHotspotSearchQuery, setActivePreviewHotspotId, setAddedInModalHotspotIds, setSelectedHotspotAnchor } = hotspotState;
  const hotspotApplyPresentation = useHotspotApplyPresentation({
    backendForceConflictState: previewModel.backendForceConflictState,
    activePreviewValidation: previewModel.activePreviewValidation,
    matrixApplyBlocked: previewModel.matrixApplyBlocked,
    confirmActionConfig: previewModel.confirmActionConfig,
    isCurrentPreviewAlreadyAdded: previewModel.isCurrentPreviewAlreadyAdded,
    isMatrixMissingBlockedState: previewModel.isMatrixMissingBlockedState,
    matrixRequiresBuild: previewModel.matrixRequiresBuild,
    isMatrixBuiltButNoFeasibleSlot: previewModel.isMatrixBuiltButNoFeasibleSlot,
    manualPreviewState: hotspotState.manualPreviewState,
    activePreviewResolution: previewModel.activePreviewResolution,
    groupPreviewResolution: hotspotState.groupPreviewResolution,
    isManualRelaxedRouteFitPolicy,
  });
  const addHotspotDialogProps = useItineraryAddHotspotDialogProps({
    state: {
      ...hotspotState,
      visibleHotspotsForActiveTab: previewModel.visibleHotspotsForActiveTab,
      routeIsDifferentCity: previewModel.routeIsDifferentCity,
      hotspotCityTabs: previewModel.hotspotCityTabs,
      currentRouteAttractionHotspotIds: previewModel.currentRouteAttractionHotspotIds,
      currentRouteManualHotspotIds: previewModel.currentRouteManualHotspotIds,
      currentRouteManualHotspotMetaById: previewModel.currentRouteManualHotspotMetaById,
    },
    previewModel: { ...previewModel, selectedFitHotspot, activePreviewHotspotId: hotspotState.activePreviewHotspotId, selectedHotspotAnchor, hasManualOpeningOrTimingConflict, groupPreviewResolution: hotspotState.groupPreviewResolution, selectedHotelMetaByRoute, selectedHotspotId },
    selectedPreviewCityContext,
    destinationCityLabel,
    previewRouteId: Number(addHotspotModal.routeId || 0),
    excludedHotspotIds,
    selectedFitHereDay,
    isBuildingMatrix,
    isApplyingPreviewHotspot,
    list: {
      routeIsDifferentCity: previewModel.routeIsDifferentCity,
      hotspotCityTabs: previewModel.hotspotCityTabs,
      toImgSrc,
      openGalleryModal,
      openVideoModal,
      onDeleteManual: (routeHotspotId, hotspotId, hotspotName) => openDeleteHotspotModal(addHotspotModal.planId || itinerary?.planId || 0, addHotspotModal.routeId || 0, routeHotspotId, hotspotId, hotspotName, true),
      onSelectFitHotspot: handleSelectFitHotspot,
      onPreviewHotspot: handlePreviewHotspot,
      onAutoPreviewFitHere: handleAutoPreviewFitHere,
      toast,
    },
    preview: {
      getFitHereSegmentLabel,
      getFitHereSegmentTime,
      buildFitHereAnchorForTimelineRow,
      renderFitHereButton,
      onBuildMatrixAndPreviewAgain: handleBuildMatrixAndPreviewAgain,
      getManualTimingPolicyFromPreview,
      formatManualPolicyTime,
      extractTravelToFromText,
      parseDisplayMinutes,
      formatMinutesToDisplay,
      normalizeDurationAgainstDistance,
      onRemove: handleRemovePreviewHotspot,
      onConfirmPriorityReplacement: handleConfirmPriorityReplacement,
      onCancelPriorityReplacement: handleCancelPriorityReplacement,
      formatPreviewDuration,
      handleAddHotspot,
      backendStrategyLabel,
      matrixBuildCommand,
    },
    presentation: { ...hotspotApplyPresentation, isCurrentPreviewAlreadyAdded: previewModel.isCurrentPreviewAlreadyAdded, matrixApplyBlocked: previewModel.matrixApplyBlocked },
    onClose: () => {
      previewRequestIdRef.current += 1;
      setAddHotspotModal({ open: false, planId: null, routeId: null, locationId: null, locationName: "" });
      setHotspotSearchQuery("");
      resetManualHotspotPreviewState();
      setActivePreviewHotspotId(null);
      setAddedInModalHotspotIds(new Set());
      setSelectedHotspotAnchor(null);
    },
  });
  return { hotspotApplyPresentation, addHotspotDialogProps };
}
