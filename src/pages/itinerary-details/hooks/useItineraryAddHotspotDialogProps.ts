import type { ComponentProps } from "react";
import { ItineraryAddHotspotDialog } from "../components/ItineraryAddHotspotDialog";
import type { HotspotStateSnapshot } from "./useHotspotPreviewViewModel.types";

type DialogProps = ComponentProps<typeof ItineraryAddHotspotDialog>;
type ListProps = DialogProps["list"];
type PreviewProps = DialogProps["preview"];

type ListContext = Pick<
  ListProps,
  | "routeIsDifferentCity"
  | "hotspotCityTabs"
  | "toImgSrc"
  | "openGalleryModal"
  | "openVideoModal"
  | "onDeleteManual"
  | "onSelectFitHotspot"
  | "onPreviewHotspot"
  | "onAutoPreviewFitHere"
  | "toast"
>;

type PreviewContext = Pick<
  PreviewProps,
  | "getFitHereSegmentLabel"
  | "getFitHereSegmentTime"
  | "buildFitHereAnchorForTimelineRow"
  | "renderFitHereButton"
  | "onBuildMatrixAndPreviewAgain"
  | "getManualTimingPolicyFromPreview"
  | "formatManualPolicyTime"
  | "extractTravelToFromText"
  | "parseDisplayMinutes"
  | "formatMinutesToDisplay"
  | "normalizeDurationAgainstDistance"
  | "onRemove"
  | "onConfirmPriorityReplacement"
  | "onCancelPriorityReplacement"
  | "formatPreviewDuration"
  | "handleAddHotspot"
> & {
  backendStrategyLabel?: string;
  matrixBuildCommand?: string;
};

type PreviewModel = {
  effectivePreviewTimeline: PreviewProps["effectivePreviewTimeline"];
  selectedFitHotspot: PreviewProps["selectedFitHotspot"];
  selectedFitHereDay: PreviewProps["selectedFitHereDay"];
  activePreviewHotspotId: PreviewProps["activePreviewHotspotId"];
  selectedHotspotAnchor: PreviewProps["selectedHotspotAnchor"];
  bestInsertionSlot: PreviewProps["bestInsertionSlot"];
  matrixRequiresBuild: PreviewProps["matrixRequiresBuild"];
  isMatrixBuiltButNoFeasibleSlot: PreviewProps["isMatrixBuiltButNoFeasibleSlot"];
  isMatrixMissingBlockedState: PreviewProps["isMatrixMissingBlockedState"];
  matrixFit: PreviewProps["matrixFit"];
  insertionDecisionSummary: PreviewProps["insertionDecisionSummary"];
  manualAttemptDisplayMeta: PreviewProps["manualAttemptDisplayMeta"];
  activeManualOptimizerSummary: PreviewProps["activeManualOptimizerSummary"];
  activeAnchorFitInsight: PreviewProps["activeAnchorFitInsight"];
  safeMatrixSlots: PreviewProps["safeMatrixSlots"];
  destinationHotelDisplayName: PreviewProps["destinationHotelDisplayName"];
  routeFitBadgeClass: PreviewProps["routeFitBadgeClass"];
  pendingPriorityReplacementHotspotId: PreviewProps["pendingPriorityReplacementHotspotId"];
  previewRemovedHotspotDetails: PreviewProps["previewRemovedHotspotDetails"];
  activePreviewValidation: PreviewProps["activePreviewValidation"];
  hasManualOpeningOrTimingConflict: PreviewProps["hasManualOpeningOrTimingConflict"];
  previewValidationReasonText: PreviewProps["previewValidationReasonText"];
  shouldShowBuildMatrixButton: PreviewProps["shouldShowBuildMatrixButton"];
  activePreviewResolution: PreviewProps["activePreviewResolution"];
  manualInsertionFit: PreviewProps["manualInsertionFit"];
  resolvedRemovalTimelineLeak: PreviewProps["resolvedRemovalTimelineLeak"];
  optionalPreviewRemovedHotspotDetails: PreviewProps["optionalPreviewRemovedHotspotDetails"];
  groupPreviewResolution: PreviewProps["groupPreviewResolution"];
  previewHotspotMetaById: PreviewProps["previewHotspotMetaById"];
  selectedHotelMetaByRoute: PreviewProps["selectedHotelMetaByRoute"];
  selectedHotspotId: PreviewProps["selectedHotspotId"];
  effectiveFitSlot: PreviewProps["effectiveFitSlot"];
  normalizedInsertionSlots: PreviewProps["normalizedInsertionSlots"];
  pendingPriorityResolution: PreviewProps["pendingPriorityResolution"];
};

type Presentation = Pick<
  PreviewProps,
  | "hotspotForceConflictMode"
  | "isCurrentPreviewAlreadyAdded"
  | "matrixApplyBlocked"
  | "hotspotEffectiveDecisionBlocked"
  | "hotspotBlockForValidation"
  | "hotspotApplyLabel"
>;

export type ItineraryAddHotspotDialogPropsArgs = {
  state: HotspotStateSnapshot & {
    visibleHotspotsForActiveTab: ListProps["visibleHotspotsForActiveTab"];
    routeIsDifferentCity: ListProps["routeIsDifferentCity"];
    hotspotCityTabs: ListProps["hotspotCityTabs"];
    currentRouteAttractionHotspotIds: ListProps["currentRouteAttractionHotspotIds"];
    currentRouteManualHotspotIds: ListProps["currentRouteManualHotspotIds"];
    currentRouteManualHotspotMetaById: ListProps["currentRouteManualHotspotMetaById"];
  };
  excludedHotspotIds: ListProps["excludedHotspotIds"];
  selectedFitHereDay: PreviewProps["selectedFitHereDay"];
  isBuildingMatrix: PreviewProps["isBuildingMatrix"];
  isApplyingPreviewHotspot: PreviewProps["isApplyingPreviewHotspot"];
  previewModel: PreviewModel;
  selectedPreviewCityContext: string;
  destinationCityLabel: string;
  previewRouteId: number;
  list: ListContext;
  preview: PreviewContext;
  presentation: Presentation;
  onClose: () => void;
};

export function useItineraryAddHotspotDialogProps({
  state,
  previewModel,
  selectedPreviewCityContext,
  destinationCityLabel,
  previewRouteId,
  excludedHotspotIds,
  selectedFitHereDay: selectedFitHereDayArg,
  isBuildingMatrix: isBuildingMatrixArg,
  isApplyingPreviewHotspot: isApplyingPreviewHotspotArg,
  list,
  preview,
  presentation,
  onClose,
}: ItineraryAddHotspotDialogPropsArgs): DialogProps {
  const {
    addHotspotModal,
    setAddHotspotModal,
    hotspotSearchQuery,
    setHotspotSearchQuery,
    setPreviewTimelinesByHotspot,
    setPreviewResolutionsByHotspot,
    setTempModalTimeline,
    setForceReplacementApprovedByHotspot,
    setSelectedHotspotIds,
    setIsPreviewingHotspotId,
    setSelectedHotspotAnchor,
    setHotspotFilterMeta,
    setActiveHotspotCityTab,
    setSelectedFitHotspot,
    setTriedFitHereAnchors,
    setFitHereModal,
    previewRequestIdRef,
    
    loadingHotspots,
    visibleHotspotsForActiveTab,
    hotspotListRef,
    routeIsDifferentCity,
    hotspotCityTabs,
    activeHotspotCityTab,
    selectedFitHotspot,
    currentRouteAttractionHotspotIds,
    currentRouteManualHotspotIds,
    addedInModalHotspotIds,
    currentRouteManualHotspotMetaById,
    previewTimelinesByHotspot,
    isPreviewingHotspotId,
    autoFitHereModal,
    timelinePreviewRef,
    manualPreviewState,
    activePreviewHotspotId,
    selectedHotspotAnchor,
    priorityConfirmRef,
  } = state;

  const {
    effectivePreviewTimeline,
    matrixRequiresBuild,
    isMatrixBuiltButNoFeasibleSlot,
    isMatrixMissingBlockedState,
  } = previewModel;

  return {
    open: addHotspotModal.open,
    onOpenChange: (open) => {
      if (!open) {
        setAddHotspotModal({ open: false, planId: null, routeId: null, locationId: null, locationName: "" });
        setHotspotSearchQuery("");
        setPreviewTimelinesByHotspot({});
        setPreviewResolutionsByHotspot({});
        setTempModalTimeline([]);
        setForceReplacementApprovedByHotspot({});
        setSelectedHotspotIds([]);
        setIsPreviewingHotspotId(null);
        setSelectedHotspotAnchor(null);
        setHotspotFilterMeta(null);
        setActiveHotspotCityTab("ALL");
        setSelectedFitHotspot(null);
        setTriedFitHereAnchors({});
        setFitHereModal({ open: false, loading: false, loadingStepIndex: 0, failedReason: null, attempt: null, anchorKey: null });
        return;
      }
      setAddHotspotModal({ ...addHotspotModal, open: true });
    },
    header: { selectedPreviewCityContext, destinationCityLabel, hotspotSearchQuery, setHotspotSearchQuery },
    list: {
      ...list,
      hotspotListRef,
      activeHotspotCityTab,
      setActiveHotspotCityTab,
      loadingHotspots,
      hotspotSearchQuery,
      visibleHotspotsForActiveTab,
      selectedFitHotspot,
      excludedHotspotIds,
      currentRouteAttractionHotspotIds,
      currentRouteManualHotspotIds,
      addedInModalHotspotIds,
      currentRouteManualHotspotMetaById,
      previewTimelinesByHotspot,
      isFitHereSelectionMode: addHotspotModal.open,
      isPreviewingHotspotId,
       isBuildingMatrix: isBuildingMatrixArg,
       isApplyingPreviewHotspot: isApplyingPreviewHotspotArg,
      autoPreviewLoading: autoFitHereModal.loading,
    },
    preview: {
      ...preview,
      ...previewModel,
      selectedPreviewCityContext,
      timelinePreviewRef,
      isPreviewingHotspotId,
      selectedFitHereDay: selectedFitHereDayArg,
      manualPreviewState,
      isFitHereSelectionMode: addHotspotModal.open,
      activePreviewHotspotId,
      selectedHotspotAnchor,
      previewRouteId,
      priorityConfirmRef,
      groupPreviewResolution: previewModel.groupPreviewResolution,
      matrixRequiresBuild,
      isMatrixBuiltButNoFeasibleSlot,
      isMatrixMissingBlockedState,
      isBuildingMatrix: isBuildingMatrixArg,
      isApplyingPreviewHotspot: isApplyingPreviewHotspotArg,
      ...presentation,
    },
    footer: { disabled: isApplyingPreviewHotspotArg || isBuildingMatrixArg, onClose },
  };
}
