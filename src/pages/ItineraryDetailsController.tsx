// FILE: src/pages/ItineraryDetails.tsx
// Keep this as a named + default export module for router compatibility across HMR reloads.
import React, { useEffect, useMemo, useState, useRef, useCallback } from "react";
import { useParams, Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ArrowLeft, Clock, MapPin, Car, Calendar, Plus, ArrowRight, Ticket, Building2, Timer, RefreshCw, AlertTriangle, Route, Utensils } from "lucide-react";
import { TimePickerPopover } from "@/components/itinerary/TimePickerPopover";
import { ItineraryService } from "@/services/itinerary";
import { AgentAPI } from "@/services/agentService";
import { api } from "@/lib/api";
import { SupplementDisplay } from "@/components/hotels/SupplementDisplay";
import { MarkdownPreview } from "@/components/itinerary/MarkdownPreview";
import {
  buildExactManualHotspotPreviewPayload,
} from "./itinerary-details/manual-hotspot-preview.shared";
import { toast } from "sonner";
import {
  DEFAULT_EXTERNAL_STAY_MESSAGE,
} from "./itinerary-details/hooks/useExternalStayEntries";
import { useVehicleRateSelectionGuard } from "./itinerary-details/hooks/useVehicleRateSelectionGuard";
import { useFitHereTimelineHelpers } from "./itinerary-details/hooks/useFitHereTimelineHelpers";
import { FitHereAnchorButton } from "./itinerary-details/components/FitHereAnchorButton";
import type {
  Activity,
  AttractionSegment,
  AvailableHotspot,
  BreakSegment,
  CheckinSegment,
  ConfirmedHotelResponseShape,
  CostBreakdown,
  FitHereAnchorIntent,
  GuideAvailabilityDay,
  GuideAvailabilityResponse,
  GuideModalOptions,
  HotspotAnchor,
  HotelAvailabilityMeta,
  ItineraryDay,
  ItineraryDetailsResponse,
  ItineraryDetailsProps,
  ItineraryGuideAssignment,
  ItineraryHotelDetailsResponse,
  ItineraryHotelRow,
  ItineraryHotelTab,
  ItineraryPlanRouteOption,
  ItinerarySegment,
  ItineraryVehicleRow,
  PackageIncludes,
  ReturnSegment,
  StartSegment,
  TravelSegment,
  TriedAnchorState,
  VehicleCostBreakdownItem,
  ViaRouteItem,
} from "./itinerary-details/itinerary-details.types";
import {
  isSupplierBookableHotel,
  normalizeMealPlanLabel,
} from "./itinerary-details/utils/domain.utils";
import { deriveHotspotCityContext as deriveHotspotCityContextUtil } from "./itinerary-details/utils/hotspotCityContext.utils";
import { mapDaySegmentToPreview as mapDaySegmentToPreviewUtil } from "./itinerary-details/utils/fitHerePreviewTimeline.utils";
import { getPreviewValidationReasonText } from "./itinerary-details/utils/previewValidationReason.utils";
import { isMatrixApplyBlocked as isMatrixApplyBlockedUtil } from "./itinerary-details/utils/matrixApplyBlocked.utils";
import { normalizeInsertionSlots } from "./itinerary-details/utils/normalizedInsertionSlots.utils";
import {
  estimateHotelTravelMinutesFromDistance,
  extractCheckinHotelName,
  filterAvailableHotspotsForAnchor,
  formatHeaderDate,
  formatManualPolicyTime,
  formatMinutesDuration,
  formatMinutesToDisplay,
  formatPreviewDuration,
  getDisplayDistances,
  getGuestFoodPreferenceText,
  getHotspotFromLocationText,
  getHotspotToLocationText,
  getManualTimingPolicyFromPreview,
  hasManualOpeningOrTimingConflict,
  isAvailableHotspotForAnchorOrRoutePair,
  isAvailableHotspotForRoutePair,
  isEarlyMorningTime,
  isManualRelaxedRouteFitPolicy,
  isRouteMovementAvailableHotspot,
  locationTokenMatchesCity,
  normalizeCityKeyForHotspotFilter,
  normalizeDateToYmd,
  normalizeDurationAgainstDistance,
  normalizeTimelineLabel,
  parseDisplayMinutes,
  parseDisplayTimeToHms,
  parseDistanceKmValue,
  parseDurationMinutesValue,
  splitHotspotLocationTokens,
} from "./itinerary-details/utils/timeline.utils";
import {
  buildTboOccupancies,
} from "./itinerary-details/utils/quotationOccupancy.utils";
import { buildQuotationConfirmationPayload } from "./itinerary-details/utils/quotationConfirmation.utils";
import { buildQuotationHotelBookings } from "./itinerary-details/utils/quotationHotelBookings.utils";
import {
  getSafeErrorMessage,
  normalizeCancellationPolicyItems,
  normalizePrebookItems,
  resolvePrebookInclusions,
  resolvePrebookMealPlan,
} from "./itinerary-details/utils/quotationConfirmationDetails.utils";
import {
  escapeHtml,
  formatCurrency,
  getHotelSelectionAmount,
  getWalletAmountFromResponse,
  parseWalletAmount,
  toMoneyNumber,
} from "./itinerary-details/utils/clipboardFormatting.utils";
import {
  extractHotelSectionFromHtml,
  mergeClipboardWithB2BRecommendedPackages,
  mergeClipboardWithRenderedCost,
  mergeClipboardWithRenderedHotels,
} from "./itinerary-details/utils/clipboardHtmlMerge.utils";
import { htmlToPlainText } from "./itinerary-details/utils/htmlToPlainText.utils";
import { copyHtmlToClipboard } from "./itinerary-details/utils/copyHtmlToClipboard.utils";
import {
  getBookingCodeForBooking,
  getHotelAmountForBooking,
  getHotelCodeForBooking,
  inferHotelProvider,
  isNoHotelAvailableEntry,
  normalizeHotelProvider,
  parseStaahSearchReference,
  type HotelProvider,
} from "./itinerary-details/utils/hotelBookingNormalization.utils";
import { buildQuotationModalPrefill } from "./itinerary-details/utils/quotationModalPrefill.utils";
import { useRouteHotelPrefetch } from "./itinerary-details/hooks/useRouteHotelPrefetch";
import { useRelatedRouteOptionsLoader } from "./itinerary-details/hooks/useRelatedRouteOptionsLoader";
import { resolveQuotationBookingOccupancy } from "./itinerary-details/utils/quotationBookingOccupancy.utils";
import { getQuoteNumberFromValue, normalizeRouteOptionList } from "./itinerary-details/utils/routeOptions.utils";
import {
  formatActivityDuration,
  formatActivityMoney,
  formatPreviewTime,
  getActivityTotalAmount,
} from "./itinerary-details/utils/activityFormatting.utils";
import {
  buildHighlightsHotspotDetailsHtml as buildHighlightsHotspotDetailsHtmlUtil,
  replaceHighlightsHotspotDetailsHtml,
} from "./itinerary-details/utils/highlightsHotspotHtml.utils";
import { prepareQuotationPrebookSelections } from "./itinerary-details/utils/quotationPrebookSelections.utils";
import { buildQuotationHotelRouteContext } from "./itinerary-details/utils/quotationHotelRouteContext.utils";
import { autoLoadStartedQuotes, getDetailsDeduped } from "./itinerary-details/utils/details-dedupe";
import { ItineraryPageLoader } from "./itinerary-details/components/ItineraryPageLoader";
import { ItineraryDetailsErrorState } from "./itinerary-details/components/ItineraryDetailsErrorState";
import { VehicleBuildErrorState } from "./itinerary-details/components/VehicleBuildErrorState";
import { ItineraryActionButtons, type ClipboardMode } from "./itinerary-details/components/ItineraryActionButtons";
import { QuotationWalletInsufficientPanel } from "./itinerary-details/components/QuotationWalletInsufficientPanel";
import { ConfirmedQuoteBanner } from "./itinerary-details/components/ConfirmedQuoteBanner";
import { ItineraryAncillaryModals } from "./itinerary-details/components/ItineraryAncillaryModals";
import { ItineraryFitHereDialogs } from "./itinerary-details/components/ItineraryFitHereDialogs";
import { ItineraryMediaDialogs } from "./itinerary-details/components/ItineraryMediaDialogs";
import { ItineraryHotelDialogs } from "./itinerary-details/components/ItineraryHotelDialogs";
import { ItineraryAddHotspotDialog } from "./itinerary-details/components/ItineraryAddHotspotDialog";
import { ItineraryRouteProgressOverlay } from "./itinerary-details/components/ItineraryRouteProgressOverlay";
import { ItineraryDetailsTravelSections } from "./itinerary-details/components/ItineraryDetailsTravelSections";
import { ItineraryActivityGuideDialogs } from "./itinerary-details/components/ItineraryActivityGuideDialogs";
import { ArrivalHotelDecisionModal } from "@/components/hotels/ArrivalHotelDecisionModal";
import { useHotspotState } from "./itinerary-details/hooks/useHotspotState";
import { useFitHereProgressTimer } from "./itinerary-details/hooks/useFitHereProgressTimer";
import { useItineraryCostViewModel } from "./itinerary-details/hooks/useItineraryCostViewModel";
import { useClipboardContentBuilder } from "./itinerary-details/hooks/useClipboardContentBuilder";
import { useSourcePreviewController } from "./itinerary-details/hooks/useSourcePreviewController";
import { useRouteHotelDetailsCache } from "./itinerary-details/hooks/useRouteHotelDetailsCache";
import {
  buildCurrentRouteAttractionHotspotIds,
  buildCurrentRouteManualHotspotIds,
  buildCurrentRouteManualHotspotMetaById,
} from "./itinerary-details/utils/routeHotspotIds.utils";
import { useItineraryRouteState } from "./itinerary-details/hooks/useItineraryRouteState";
import { useItineraryQuotationState } from "./itinerary-details/hooks/useItineraryQuotationState";
import { useHotelSelectionState } from "./itinerary-details/hooks/useHotelSelectionState";
import { useMediaShareState } from "./itinerary-details/hooks/useMediaShareState";
import { useHotelWorkflowState } from "./itinerary-details/hooks/useHotelWorkflowState";
import { useActivityState } from "./itinerary-details/hooks/useActivityState";
import { useVehicleOnlyClipboardAction } from "./itinerary-details/hooks/useVehicleOnlyClipboardAction";
import { useItineraryQuotationConfirmationWorkflow } from "./itinerary-details/hooks/useItineraryQuotationConfirmationWorkflow";
import { useItineraryPreparedPageWorkflow } from "./itinerary-details/hooks/useItineraryPreparedPageWorkflow";
import { useItineraryRouteMutationWorkflow } from "./itinerary-details/hooks/useItineraryRouteMutationWorkflow";
import { useArrivalPolicyDecisionDialog } from "./itinerary-details/hooks/useArrivalPolicyDecisionDialog";
import { useFitHereDialogProps } from "./itinerary-details/hooks/useFitHereDialogProps";
import { useItineraryHotelDialogProps } from "./itinerary-details/hooks/useItineraryHotelDialogProps";
import { useItineraryMediaDialogProps } from "./itinerary-details/hooks/useItineraryMediaDialogProps";
import { useItineraryQuotationDialogProps } from "./itinerary-details/hooks/useItineraryQuotationDialogProps";
import { useItineraryAncillaryModalProps } from "./itinerary-details/hooks/useItineraryAncillaryModalProps";
import { useItineraryShareActions } from "./itinerary-details/hooks/useItineraryShareActions";
import { useHotspotApplyPresentation } from "./itinerary-details/hooks/useHotspotApplyPresentation";
import { useItineraryAddHotspotDialogProps } from "./itinerary-details/hooks/useItineraryAddHotspotDialogProps";
import { useItineraryHotelSelectionWorkflow } from "./itinerary-details/hooks/useItineraryHotelSelectionWorkflow";
import { useMediaModalController } from "./itinerary-details/hooks/useMediaModalController";
import { useEnsureHotelDetailsLoaded } from "./itinerary-details/hooks/useEnsureHotelDetailsLoaded";
import { useItineraryHotelDataWorkflow } from "./itinerary-details/hooks/useItineraryHotelDataWorkflow";
import {
  buildArrivalPolicyDecisionKey,
} from "./itinerary-details/utils/routeArrivalPolicy.utils";
import { QuotationConfirmationDialog } from "./itinerary-details/components/QuotationConfirmationDialog";
import { useItineraryHotspotMutationWorkflow } from "./itinerary-details/hooks/useItineraryHotspotMutationWorkflow";
import { useItineraryHotspotPreviewWorkflow } from "./itinerary-details/hooks/useItineraryHotspotPreviewWorkflow";
import { useItineraryClipboardSelectionWorkflow } from "./itinerary-details/hooks/useItineraryClipboardSelectionWorkflow";
import { useItineraryScrollEffects } from "./itinerary-details/hooks/useItineraryScrollEffects";
import { useAddHotspotModalController } from "./itinerary-details/hooks/useAddHotspotModalController";
import { useItineraryFitHereWorkflow } from "./itinerary-details/hooks/useItineraryFitHereWorkflow";
import { useWalletTopUpController } from "./itinerary-details/hooks/useWalletTopUpController";
import { useGuideState } from "./itinerary-details/hooks/useGuideState";
import { useItineraryDeletionState } from "./itinerary-details/hooks/useItineraryDeletionState";
import { useRouteTimeProgressController } from "./itinerary-details/hooks/useRouteTimeProgressController";
import { useVehicleTotalsSync } from "./itinerary-details/hooks/useVehicleTotalsSync";
import { useItineraryScrollController } from "./itinerary-details/hooks/useItineraryScrollController";
import { useHotelPaginationController } from "./itinerary-details/hooks/useHotelPaginationController";
import { useItineraryDocumentActions } from "./itinerary-details/hooks/useItineraryDocumentActions";
import { useHotelDetailsLoader } from "./itinerary-details/hooks/useHotelDetailsLoader";
import { useItineraryQuotationHotelContext } from "./itinerary-details/hooks/useItineraryQuotationHotelContext";
import { useHotelClipboardAction } from "./itinerary-details/hooks/useHotelClipboardAction";
import { useRouteOptionSwitchController } from "./itinerary-details/hooks/useRouteOptionSwitchController";
import { extractTravelFromToFromText as extractTravelFromToFromTextUtil, extractTravelToFromText as extractTravelToFromTextUtil } from "./itinerary-details/utils/hotspotText.utils";
import { useItinerarySummaryValues } from "./itinerary-details/hooks/useItinerarySummaryValues";
import { useParaRecommendations } from "./itinerary-details/hooks/useParaRecommendations";
import { useItineraryRouteOptionsViewModel } from "./itinerary-details/hooks/useItineraryRouteOptionsViewModel";
import { PAGE_LOADER_STAGE_DETAILS } from "./itinerary-details/itinerary-details.constants";
import { useItineraryDisplayMode } from "./itinerary-details/hooks/useItineraryDisplayMode";
import { ItineraryDetailsPageView } from "./itinerary-details/components/ItineraryDetailsPageView";
import { useItineraryActivityGuideWorkflow } from "./itinerary-details/hooks/useItineraryActivityGuideWorkflow";

// Preserve the historical type exports consumed by HotelList and other modules.
export type { ItineraryHotelRow, ItineraryHotelTab, ItineraryVehicleRow } from "./itinerary-details/itinerary-details.types";

// --------- VEHICLES ---------

// ----------------- Helper functions -----------------
// ----------------- Main Component -----------------
// Note: keep explicit named + default export shape for router/HMR compatibility.

export const ItineraryDetails: React.FC<ItineraryDetailsProps> = ({ readOnly = false, presentationMode = 'standard' }) => {
const { id: quoteId } = useParams();
const location = useLocation();
  console.log('🔵 ItineraryDetails component MOUNTED with quoteId:', quoteId, 'readOnly:', readOnly);
  //Extra
  console.log('🔵 Current location pathname:', location.pathname);

  const routeState = useItineraryRouteState(quoteId);
  const {
    itinerary, setItinerary, hotelDetails, setHotelDetails, routeHotelDetailsByQuoteId, setRouteHotelDetailsByQuoteId,
    loading, setLoading, error, setError, pageLoaderStage, setPageLoaderStage, pageLoaderDetail, setPageLoaderDetail,
    pageLoaderHistory, setPageLoaderHistory, pageReady, setPageReady, sourcePreviewOpen, setSourcePreviewOpen,
    sourcePreviewLoading, setSourcePreviewLoading, sourcePreviewError, setSourcePreviewError, sourcePreviewMarkdown,
    setSourcePreviewMarkdown, sourcePreviewHeading, setSourcePreviewHeading, vehicleBuildStatus, setVehicleBuildStatus,
    vehicleBuildError, setVehicleBuildError, activeRouteQuoteId, setActiveRouteQuoteId, isSwitchingRouteOption,
    setIsSwitchingRouteOption, latestRouteOptions, setLatestRouteOptions, itineraryDaysCountRef,
    routeHotelFetchPromisesRef, routeHotelPrefetchedRef, routeHotelFamilyKeyRef, fetchCompleteHotelDetailsRef,
  } = routeState;
  const {
    isConfirmedItinerary, canViewCostBreakdown, isAgentLogin, hotelReadOnly,
    isConfirmedPresentation, shouldShowHotels, shouldShowVehicles,
    isVehicleOnlyItinerary, requiresHotelBookingFlow,
  } = useItineraryDisplayMode(itinerary, readOnly, presentationMode);

  const openSourcePreview = useSourcePreviewController({
    activeRouteQuoteId,
    quoteId,
    itineraryQuoteId: itinerary?.quoteId,
    setOpen: setSourcePreviewOpen,
    setLoading: setSourcePreviewLoading,
    setError: setSourcePreviewError,
    setMarkdown: setSourcePreviewMarkdown,
    setHeading: setSourcePreviewHeading,
  });


const { cacheRouteHotelDetails, loadAndCacheRouteHotelDetails } = useRouteHotelDetailsCache({
  routeHotelDetailsByQuoteId,
  setRouteHotelDetailsByQuoteId,
  routeHotelFetchPromisesRef,
  fetchCompleteHotelDetailsRef,
});

  const deletionState = useItineraryDeletionState();
  const {
    deleteHotspotModal, setDeleteHotspotModal, isDeleting, setIsDeleting,
    routeNeedsRebuild, setRouteNeedsRebuild, isRebuilding, setIsRebuilding,
    excludedHotspotIds, setExcludedHotspotIds,
    allHotspotsPreviewModal, setAllHotspotsPreviewModal,
    deleteActivityModal, setDeleteActivityModal, isDeletingActivity, setIsDeletingActivity,
  } = deletionState;

  const activityState = useActivityState();
  const {
    addActivityModal, setAddActivityModal, availableActivities, setAvailableActivities,
    loadingActivities, setLoadingActivities, isAddingActivity, setIsAddingActivity,
    activityPreview, setActivityPreview, previewingActivityId, setPreviewingActivityId,
  } = activityState;

  const guideState = useGuideState();
  const {
    guideAssignments, setGuideAssignments, guideAvailability, setGuideAvailability,
    guideAvailabilityLoading, setGuideAvailabilityLoading, guideModal, setGuideModal,
    deleteGuideModal, setDeleteGuideModal,
  } = guideState;
  const hotspotState = useHotspotState();
  const {
    addHotspotModal, setAddHotspotModal, loadingHotspots, setLoadingHotspots,
    isAddingHotspot, setIsAddingHotspot, hotspotSearchQuery, setHotspotSearchQuery,
    availableHotspots, setAvailableHotspots, hotspotFilterMeta, setHotspotFilterMeta,
    groupPreviewResolution,
    activePreviewHotspotId, setActivePreviewHotspotId, addedInModalHotspotIds, setAddedInModalHotspotIds,
    manualPreviewState, isApplyingPreviewHotspot, setIsApplyingPreviewHotspot,
    isBuildingMatrix, setIsBuildingMatrix, setSelectedHotspotIds,
    selectedHotspotAnchor, setSelectedHotspotAnchor, activeHotspotCityTab, setActiveHotspotCityTab,
    selectedFitHotspot, setSelectedFitHotspot, triedFitHereAnchors, setTriedFitHereAnchors,
    fitHereModal, setFitHereModal, autoFitHereModal, setAutoFitHereModal,
    confirmFitHereLoading, setConfirmFitHereLoading, hotspotListRef, timelinePreviewRef,
    priorityConfirmRef, previewRequestIdRef, fitHereProgressTimerRef,
  } = hotspotState;

  const { startFitHereProgressTimer, stopFitHereProgressTimer } = useFitHereProgressTimer({
    timerRef: fitHereProgressTimerRef,
    setFitHereModal,
  });

  const isFitHereSelectionMode = addHotspotModal.open;

  const {
    getFitHereSegmentLabel,
    getFitHereSegmentTime,
    buildFitHereAnchorForTimelineRow,
  } = useFitHereTimelineHelpers();

  function renderFitHereButton(day: ItineraryDay, anchor: HotspotAnchor) {
    if (!selectedFitHotspot) return null;

    const anchorKey = buildFitHereAnchorKey(anchor);
    const tried = triedFitHereAnchors[anchorKey];
    return (
      <FitHereAnchorButton
        anchor={anchor}
        tried={tried}
        onClick={() => void handleFitHereClick(day, anchor)}
      />
    );
  }

  const extractTravelToFromText = extractTravelToFromTextUtil;
  const extractTravelFromToFromText = extractTravelFromToFromTextUtil;

  const mapDaySegmentToPreview = useCallback(
    (segment: ItinerarySegment) => mapDaySegmentToPreviewUtil(segment, extractTravelToFromText),
    [extractTravelToFromText],
  );

  const hotspotPreviewWorkflow = useItineraryHotspotPreviewWorkflow({
    hotspotState,
    deletionState,
    itinerary,
    hotelDetails,
    mapDaySegmentToPreview,
  });
  const {
    selectedHotspotId,
    selectedFitHereDay,
    currentRouteForModal,
    resetManualHotspotPreviewState,
    resetManualHotspotPreviewStateButKeepActiveHotspot,
    hotspotPreviewViewModel,
  } = hotspotPreviewWorkflow;
  const {
    defaultPreviewTimeline,
    selectedPreviewSegments,
    activePreviewTimeline,
    activePreviewResolution,
    activePreviewValidation,
    normalizedDecision,
    previewRemovedHotspotDetails,
    optionalPreviewRemovedHotspotDetails,
    pendingPriorityReplacementHotspotId,
    pendingPriorityResolution,
    effectivePreviewTimeline,
    manualInsertionFit,
    matrixFit,
    activeManualOptimizer,
    activeManualOptimizerSummary,
    manualAttemptDisplayMeta,
    backendForceConflictState,
    destinationHotelDisplayName,
    matrixBuildSuggestion,
    hasValidChosenMatrixSlot,
    matrixFitAlreadyHasUsableData,
    deriveHotspotCityContext,
    activePreviewHotspot,
    selectedPreviewCityContext,
    isDestinationSideManualPreview,
    matrixRequiresBuild,
    isMatrixMissingBlockedState,
    isMatrixBuiltButNoFeasibleSlot,
    shouldShowBuildMatrixButton,
    previewValidationReasonText,
    matrixApplyBlocked,
    decisionStatus,
    confirmActionConfig,
    insertionDecisionSummary,
    resolvedRemovalTimelineLeak,
    safeMatrixSlots,
    effectiveFitSlot,
    routeFitBadgeClass,
    normalizedInsertionSlots,
    activeAnchorFitInsight,
    bestInsertionSlot,
    previewHotspotMetaById,
    currentRouteAttractionHotspotIds,
    currentRouteManualHotspotIds,
    currentRouteManualHotspotMetaById,
    isCurrentPreviewAlreadyAdded,
    normalizeAvailableHotspots,
    filteredHotspots,
    sourceCityLabel,
    destinationCityLabel,
    routeIsDifferentCity,
    destinationInsertionSlotLabel,
    hotspotListRows,
    hotspotCityBuckets,
    hotspotCityTabs,
    visibleHotspotsForActiveTab,
  } = hotspotPreviewViewModel;

  const hotelWorkflowState = useHotelWorkflowState();
  const {
    hotelSelectionModal, setHotelSelectionModal, hotelSearchChildAges, setHotelSearchChildAges,
    isResolvingArrivalPolicy, setIsResolvingArrivalPolicy, latestArrivalPolicy, setLatestArrivalPolicy,
    pendingRouteTimeUpdate, setPendingRouteTimeUpdate, lastArrivalPolicyDecisionKey, setLastArrivalPolicyDecisionKey,
    arrivalPolicyConfirmModal, setArrivalPolicyConfirmModal, roomSelectionModal, setRoomSelectionModal,
    loadingHotels, setLoadingHotels, isRebuildingHotels, setIsRebuildingHotels,
    isApplyingRouteTimeUpdate, setIsApplyingRouteTimeUpdate, routeTimeProgressPercent, setRouteTimeProgressPercent,
    routeTimeEstimatedMs, setRouteTimeEstimatedMs, routeProgressTitle, setRouteProgressTitle,
    routeProgressDetail, setRouteProgressDetail, routeProgressHistory, setRouteProgressHistory,
    pendingScrollDayNumber, setPendingScrollDayNumber, routeTimeProgressTimerRef,
    isSelectingHotel, setIsSelectingHotel, hotelSearchQuery, setHotelSearchQuery, selectedMealPlan, setSelectedMealPlan,
  } = hotelWorkflowState;

  const pushPageLoaderStage = useCallback((stage: string, detail?: string) => {
    setPageLoaderStage(stage);
    setPageLoaderDetail(detail || PAGE_LOADER_STAGE_DETAILS[stage] || "Preparing the latest itinerary data.");
    setPageLoaderHistory((prev) => (
      prev[prev.length - 1] === stage ? prev : [...prev, stage].slice(-6)
    ));
  }, []);

  const {
    stopRouteTimeProgress,
    pushRouteProgressStage,
    startRouteTimeProgress,
    getRouteTimeUpdateEstimateMs,
  } = useRouteTimeProgressController({
    dayCount: itinerary?.days?.length ?? 0,
    timerRef: routeTimeProgressTimerRef,
    setProgressPercent: setRouteTimeProgressPercent,
    setProgressDetail: setRouteProgressDetail,
    setProgressHistory: setRouteProgressHistory,
  });

  const mediaShareState = useMediaShareState();
  const {
    galleryModal, setGalleryModal, galleryActiveIdx, setGalleryActiveIdx,
    videoModal, setVideoModal, clipboardModal, setClipboardModal,
    shareModal, setShareModal, clipboardType, setClipboardType,
    clipboardRatesVisible, setClipboardRatesVisible,
  } = mediaShareState;

  // Hotel Selection State (Multi-Provider)
  const hotelSelectionState = useHotelSelectionState();
  const {
    selectedHotelBookings, setSelectedHotelBookings, selectedHotels, setSelectedHotels,
    activeHotelGroupType, setActiveHotelGroupType, activeHotelListTotal, setActiveHotelListTotal,
    selectedVehicleTotalsByType, setSelectedVehicleTotalsByType, isRoomCostPopoverOpen, setIsRoomCostPopoverOpen,
    summaryStickyRef, hotelListRef, vehicleListRef, summaryStickyHeight, setSummaryStickyHeight,
    hotelPageByGroupRoute, setHotelPageByGroupRoute, isLoadingMoreHotels, setIsLoadingMoreHotels,
  } = hotelSelectionState;
  useVehicleTotalsSync({
    quoteId: itinerary?.quoteId,
    vehicles: itinerary?.vehicles,
    shouldShowVehicles,
    setSelectedVehicleTotalsByType,
  });

  const { scrollToHotelList, scrollToVehicleList } = useItineraryScrollController({
    quoteId: itinerary?.quoteId,
    days: itinerary?.days,
    summaryStickyRef,
    hotelListRef,
    vehicleListRef,
    summaryStickyHeight,
    setSummaryStickyHeight,
    itineraryDaysCountRef,
  });

  const itineraryPreference = Number(itinerary?.itineraryPreference ?? 0);
  const {
    vehicleTypeIdsRequiringSelection,
    hasRequiredVehicleSelection,
    canConfirmQuotation,
  } = useVehicleRateSelectionGuard({
    shouldShowVehicles,
    vehicles: itinerary?.vehicles,
    vehicleRateAvailability: itinerary?.vehicleRateAvailability,
    selectedVehicleTotalsByType,
  });
  const { handleHotelLoadMore } = useHotelPaginationController({
    quoteId: quoteId || null,
    isLoadingMoreHotels,
    setIsLoadingMoreHotels,
    setHotelDetails,
    setHotelPageByGroupRoute,
  });

  const dedupeHotelRows = useCallback((rows: ItineraryHotelRow[]): ItineraryHotelRow[] => {
    const seen = new Set<string>();
    const unique: ItineraryHotelRow[] = [];

    rows.forEach((row) => {
      const key = [
        Number(row.groupType || 0),
        Number(row.itineraryRouteId || 0),
        String(row.date || row.checkInDate || ''),
        String(row.hotelCode || ''),
        String(row.bookingCode || ''),
        String(row.roomType || ''),
        String(row.hotelName || ''),
      ].join('|');

      if (seen.has(key)) return;
      seen.add(key);
      unique.push(row);
    });

    return unique;
  }, []);

  const {
    fetchCompleteHotelDetails,
    loadConfirmedHotelsFromDb,
    loadHotelDetailsForItinerary,
  } = useHotelDetailsLoader({
    itineraryDaysCountRef,
    fetchCompleteHotelDetailsRef,
    dedupeHotelRows,
  });

  const costViewModel = useItineraryCostViewModel({
    itinerary,
    hotelDetails,
    hotelReadOnly,
    activeHotelListTotal,
    selectedHotelBookings,
    activeHotelGroupType,
    shouldShowHotels,
    shouldShowVehicles,
    selectedVehicleTotalsByType,
    hasRequiredVehicleSelection,
  });
  const {
    selectedHotelTotal,
    selectedHotelMetaByRoute,
    computedHotelCost,
    roomBreakdownRoomNights,
    computedVehicleAmount,
    computedVehicleQty,
    entryTicketBreakdownByLocation,
    entryTicketLocationWiseTotal,
    hotelsForDisplay,
    financialTotals,
    effectiveEntryTicketAmount,
    hotelHydratedDays,
    displayDays,
  } = costViewModel;

const { overallTripCostWithHotels, specialInstructionsText } = useItinerarySummaryValues({
  netPayable: financialTotals.netPayable,
  overallCost: itinerary?.overallCost,
  itinerary: itinerary as Record<string, unknown> | null,
});

  // ✅ Para should use recommendation GROUPS, not first 4 random hotels
  const paraRecommendations = useParaRecommendations(hotelDetails);

  const { buildDefaultClipboardSelection } = useItineraryClipboardSelectionWorkflow({
    hotelDetails,
    activeHotelGroupType,
    setActiveHotelGroupType,
    setClipboardRatesVisible,
    clipboardModal,
    paraRecommendations,
    selectedHotels,
    setSelectedHotels,
  });

  useEffect(() => {
    const firstDay = itinerary?.days?.find((day) => Number(day.dayNumber) === 1) || itinerary?.days?.[0];
    if (!firstDay || !hotelDetails) {
      return;
    }

    const routeDateYmd = normalizeDateToYmd(firstDay.date);
    const startTimeHms = parseDisplayTimeToHms(firstDay.startTime || '');
    if (!routeDateYmd || !startTimeHms || !isEarlyMorningTime(startTimeHms)) {
      return;
    }

    const hasPreviousDayMarkerRow = hotelDetails.hotels.some((hotel) => {
      const hotelDateYmd = normalizeDateToYmd(hotel.date);
      return (
        Number(hotel.itineraryRouteId || 0) === Number(firstDay.id || 0) &&
        Number(hotel.hotelId || 0) === 0 &&
        Boolean(hotelDateYmd) &&
        hotelDateYmd !== routeDateYmd
      );
    });

    if (hasPreviousDayMarkerRow) {
      setLastArrivalPolicyDecisionKey(
        buildArrivalPolicyDecisionKey(firstDay.id, firstDay.date, startTimeHms),
      );
    }
  }, [hotelDetails, itinerary]);

  const {
    getSelectedClipboardGroups,
    buildClipboardHtml,
  } = useClipboardContentBuilder({
    hotelDetails,
    itinerary,
    paraRecommendations,
    selectedHotels,
    shouldShowHotels,
    shouldShowVehicles,
    computedVehicleAmount,
    computedVehicleQty,
  });
  const buildHighlightsHotspotDetailsHtml = useCallback(
    () => buildHighlightsHotspotDetailsHtmlUtil(itinerary?.days),
    [itinerary?.days],
  );

  const handleVehicleOnlyClipboardCopyRefactored = useVehicleOnlyClipboardAction({
    quoteId: quoteId || null,
    itineraryPreference,
    replaceHighlightsHotspotDetailsHtml,
    buildHighlightsHotspotDetailsHtml,
    htmlToPlainText,
    copyHtmlToClipboard,
  });

  const quotationState = useItineraryQuotationState({ itinerary, financialTotals });
  const {
    confirmQuotationModal, setConfirmQuotationModal, voucherModal, setVoucherModal, pluckCardModal, setPluckCardModal,
    invoiceModal, setInvoiceModal, invoiceType, setInvoiceType, incidentalModal, setIncidentalModal,
    incidentalHistoryRefreshToken, setIncidentalHistoryRefreshToken, isConfirmingQuotation, setIsConfirmingQuotation,
    walletBalance, setWalletBalance, walletBalanceAmount, setWalletBalanceAmount, showWalletTopUpPanel, setShowWalletTopUpPanel,
    walletTopUpAmount, setWalletTopUpAmount, walletTopUpRemark, setWalletTopUpRemark, walletShortfallAmount, setWalletShortfallAmount,
    isWalletTopUpSubmitting, setIsWalletTopUpSubmitting, agentInfo, setAgentInfo, guestDetails, setGuestDetails,
    confirmDefaultNationality, setConfirmDefaultNationality, additionalAdults, setAdditionalAdults, additionalChildren, setAdditionalChildren,
    additionalInfants, setAdditionalInfants, formErrors, setFormErrors, prebookData, setPrebookData, isPrebooking, setIsPrebooking,
    isOpeningConfirmQuotation, setIsOpeningConfirmQuotation, hasAcceptedUpdatedPrice, setHasAcceptedUpdatedPrice,
    confirmOccupanciesTemplate, setConfirmOccupanciesTemplate,
    confirmRequiredAmount, isWalletInsufficientForConfirm, confirmRoomCount, confirmPassengerMix,
    confirmOccupancyPreview, defaultPassenger, getPassengerFieldError,
  } = quotationState;
  const currentItineraryPlanId = Number(itinerary?.planId || 0);

  const { handleDownloadPluckCard, handleDownloadInvoice } = useItineraryDocumentActions(currentItineraryPlanId);

  // ✅ Reference to hotel save function
  const hotelSaveFunctionRef = React.useRef<(() => Promise<boolean>) | null>(null);

  // ✅ Track if component is mounted to prevent state updates after unmount
  const isMountedRef = useRef(true);

// ✅ Track which quoteId we're currently fetching to prevent duplicate fetches
const currentFetchRef = useRef<string | null>(null);

// ✅ Prevent older route/detail API responses from overwriting the latest selected route
const latestRouteRequestRef = useRef(0);

// Prevent route-tab navigation from causing a duplicate details fetch.
const switchedRouteRef = useRef<string | null>(null);
  const shouldEnableWalletTopUpOnConfirm = confirmQuotationModal === true && Boolean(agentInfo?.agent_id);
  const TBO_SESSION_WINDOW_MS = 35 * 60 * 1000;
  const quotationHotelContext = useItineraryQuotationHotelContext({
    selectedHotelBookings,
    hotelDetails,
    activeHotelGroupType,
    prebookData,
    requiresHotelBookingFlow,
    shouldShowHotels,
    itineraryPlanId: itinerary?.planId,
    setHotelDetails,
    setSelectedHotelBookings,
    setActiveHotelGroupType,
    setPrebookData,
    setHasAcceptedUpdatedPrice,
    setConfirmOccupanciesTemplate,
  });
  const {
    prebookTotalAmount, selectedTboHotelTotal, hasSelectedTboHotels, requiresDetailedPassengerFlow,
    hasPrebookPriceChanged, prebookHotelEntries, getCoveredRouteIdsFromHotelSelections,
    selectedHotelCoveredRouteIds, nonTboSelectedHotelEntries, externalStayEntries, prebookDataRef,
  } = quotationHotelContext;

  const hotelDataWorkflow = useItineraryHotelDataWorkflow({
    routeState,
    hotelWorkflowState,
    hotelSelectionState,
    quoteId,
    itineraryPlanId: Number(itinerary?.planId || 0),
    hotelDetails,
    cacheRouteHotelDetails,
    fetchCompleteHotelDetails,
    loadHotelDetailsForItinerary,
    hotelSaveFunctionRef,
  });
  const {
    handleHotelGroupTypeChange, handleRebuildHotels, refreshHotelData, refreshVehicleData,
    handleCancelVoucherItems, handleCancelVoucherSingle, handleCreateVoucher, handleGetSaveFunction,
    cancelModalOpen, setCancelModalOpen, hotelVoucherModalOpen, setHotelVoucherModalOpen,
    selectedHotelForVoucher, handleHotelSelectionsChange,
  } = hotelDataWorkflow;

  const preparedPageWorkflow = useItineraryPreparedPageWorkflow({
    routeState,
    hotelWorkflowState,
    hotelSelectionState,
    hotelDetails,
    quoteId,
    pathname: location.pathname,
    isMountedRef,
    latestRouteRequestRef,
    currentFetchRef,
    switchedRouteRef,
    autoLoadStartedQuotes,
    pushPageLoaderStage,
    getDetailsDeduped,
    loadHotelDetailsForItinerary,
    cacheRouteHotelDetails,
    isSupplierBookableHotel,
  });
  const { handleVehicleSelectedTotalChange, shouldShowRebuildHotelsButton, loadPreparedItineraryPage } = preparedPageWorkflow;

  /**
   * ⚡ Lazy-load hotel details when needed (e.g., when user opens hotel selection)
   * This prevents the initial page load from making the unnecessary second API call
   */
  const ensureHotelDetailsLoaded = useEnsureHotelDetailsLoaded({
    quoteId,
    itinerary,
    hotelDetails,
    setHotelDetails,
    setLoadingHotels,
    loadHotelDetailsForItinerary,
  });
  const routeMutationWorkflow = useItineraryRouteMutationWorkflow({
    routeState,
    hotelWorkflowState,
    hotspotState,
    deletionState,
    itinerary,
    hotelDetails,
    quoteId,
    shouldShowHotels,
    requiresHotelBookingFlow,
    addHotspotModalOpen: addHotspotModal.open,
    selectedHotspotAnchor,
    normalizeAvailableHotspots,
    getRouteTimeUpdateEstimateMs,
    startRouteTimeProgress,
    stopRouteTimeProgress,
    pushRouteProgressStage,
  });
  const {
    handleDeleteHotspot,
    handleRebuildRoute,
    dayHasManualInserts,
    applyRouteTimePatch,
    handleUpdateRouteTimesDirect: handleUpdateRouteTimesDirectFromHook,
    persistArrivalPolicyDecision,
  } = routeMutationWorkflow;

  const openDeleteHotspotModal = (
    planId: number,
    routeId: number,
    routeHotspotId: number,
    masterHotspotId: number,
    hotspotName: string,
    isManualHotspot: boolean = false,
  ) => {
    setDeleteHotspotModal({
      open: true,
      planId,
      routeId,
      routeHotspotId,
      masterHotspotId,
      hotspotName,
      hotspotWasPrebuilt: !isManualHotspot,
    });
  };

  const activityGuideWorkflow = useItineraryActivityGuideWorkflow({
    activityState,
    guideState,
    deletionState,
    routeState,
    itinerary,
    quoteId,
    readOnly,
    shouldShowHotels,
    setActiveHotelListTotal,
  });
  const {
    openAddActivityModal,
    handleAddActivity,
    handleDeleteActivity,
    getSelectedPreviewActivity,
    handleOpenPreviewAllHotspots,
    handlePreviewActivity,
    openDeleteActivityModal,
    openGuideModal,
    handleAddGuideClick,
    handleWholeItineraryGuideClick,
    getGuideAssignmentForDay,
    isGuidePriceAvailableForDay,
    isAttractionCoveredByGuide,
    handleSaveGuideAssignment,
    handleDeleteGuideAssignment,
    activityViewState,
    guideViewState,
  } = activityGuideWorkflow;

  const openAddHotspotModal = useAddHotspotModalController({
    itinerary,
    previewRequestIdRef,
    resetManualHotspotPreviewState,
    normalizeAvailableHotspots,
    setAddHotspotModal,
    setActivePreviewHotspotId,
    setAddedInModalHotspotIds,
    setSelectedHotspotAnchor,
    setSelectedFitHotspot,
    setTriedFitHereAnchors,
    setFitHereModal,
    setAutoFitHereModal,
    setLoadingHotspots,
    setExcludedHotspotIds,
    setHotspotFilterMeta,
    setAvailableHotspots,
    setSelectedHotspotIds,
  });

  const fitHereWorkflow = useItineraryFitHereWorkflow({
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
  });
  const {
    buildFitHereAnchorKey, handleSelectFitHotspot, handleFitHereClick, handleAutoPreviewFitHere,
    handleFitHereCancel, handleRetryFitHere, handleConfirmFitHere, getFitHereRefreshScrollStorageKey,
  } = fitHereWorkflow;
  const hotspotMutationWorkflow = useItineraryHotspotMutationWorkflow({
    hotspotState,
    deletionState,
    routeState,
    previewModel: hotspotPreviewViewModel,
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
  });
  const {
    handlePreviewHotspot, handleRemovePreviewHotspot, handleConfirmPriorityReplacement,
    handleCancelPriorityReplacement, handleBuildMatrixAndPreviewAgain, handleAddHotspot,
  } = hotspotMutationWorkflow;

  const { toImgSrc, openGalleryModal, openVideoModal } = useMediaModalController({
    setGalleryModal,
    setGalleryActiveIdx,
    setVideoModal,
  });
  const hotelSelectionWorkflow = useItineraryHotelSelectionWorkflow({
    hotelWorkflowState,
    hotelSelectionState,
    quotationState,
    routeState,
    prebookDataRef,
    quoteId,
    readOnly,
    shouldShowHotels,
    ensureHotelDetailsLoaded,
    parseDisplayTimeToHms,
    isEarlyMorningTime,
    normalizeDateToYmd,
    buildArrivalPolicyDecisionKey,
    parseStaahSearchReference,
    isSupplierBookableHotel,
    getSafeErrorMessage,
  });
  const {
    applyArrivalPolicyDecision, resolveArrivalPolicyForArrivalTimeChange, handleArrivalDateTimeChange,
    openHotelSelectionModal, handleSelectHotel, handleSelectHotelFromSearch,
  } = hotelSelectionWorkflow;

  const {
    handleWalletTopUpAndContinue,
    prepareWalletTopUpPanel,
    refreshConfirmWalletBalance,
    resetConfirmWalletTopUpPanel,
  } = useWalletTopUpController({
    shouldEnableWalletTopUpOnConfirm,
    quoteId: itinerary?.quoteId,
    planId: itinerary?.planId,
    agentInfo,
    walletTopUpAmount,
    walletTopUpRemark,
    confirmRequiredAmount,
    setWalletBalance,
    setWalletBalanceAmount,
    setShowWalletTopUpPanel,
    setWalletTopUpAmount,
    setWalletTopUpRemark,
    setWalletShortfallAmount,
    getWalletAmountFromResponse,
    formatCurrency,
    setIsWalletTopUpSubmitting,
    handleConfirmQuotation: (options) => handleConfirmQuotation(options),
  });

  const quotationConfirmationWorkflow = useItineraryQuotationConfirmationWorkflow({
    routeState, quotationState, hotelSelectionState, hotelWorkflowState, hotelContext: quotationHotelContext,
    itinerary, hotelDetails, quoteId, requiresHotelBookingFlow, requiresDetailedPassengerFlow,
    canConfirmQuotation, isVehicleOnlyItinerary, shouldEnableWalletTopUpOnConfirm,
    tboSessionWindowMs: TBO_SESSION_WINDOW_MS, defaultExternalStayMessage: DEFAULT_EXTERNAL_STAY_MESSAGE,
    loadConfirmedHotelsFromDb, normalizeHotelProvider: normalizeHotelProvider as (hotel: Record<string, unknown>) => string,
    isSupplierBookableHotel: isSupplierBookableHotel as (hotel: Record<string, unknown>) => boolean,
    parseStaahSearchReference, getHotelSelectionAmount: getHotelSelectionAmount as (hotel: Record<string, unknown>) => number,
    inferHotelProvider: inferHotelProvider as (hotel: Record<string, unknown>) => string,
    walletTopUp: { handleWalletTopUpAndContinue, prepareWalletTopUpPanel, refreshConfirmWalletBalance, resetConfirmWalletTopUpPanel },
  });
  const { openConfirmQuotationModal, handleConfirmQuotation } = quotationConfirmationWorkflow;

  useItineraryScrollEffects({
    itinerary,
    pendingScrollDayNumber,
    setPendingScrollDayNumber,
    getFitHereRefreshScrollStorageKey,
    stopRouteTimeProgress,
  });

useRelatedRouteOptionsLoader({ quoteId, itinerary, setLatestRouteOptions });

const { itineraryRouteOptions, routeFamilyBaseQuoteId } = useItineraryRouteOptionsViewModel({
  latestRouteOptions,
  itinerary,
  activeRouteQuoteId,
  quoteId,
});

useEffect(() => {
  if (!routeFamilyBaseQuoteId) return;
  if (routeHotelFamilyKeyRef.current === routeFamilyBaseQuoteId) return;

  routeHotelFamilyKeyRef.current = routeFamilyBaseQuoteId;
  routeHotelPrefetchedRef.current = new Set();
  routeHotelFetchPromisesRef.current.clear();
  setRouteHotelDetailsByQuoteId({});
}, [routeFamilyBaseQuoteId]);

  useRouteHotelPrefetch({
    itinerary,
    shouldShowHotels,
    isConfirmedItinerary,
    activeRouteQuoteId,
    quoteId,
    itineraryRouteOptions,
    routeHotelPrefetchedRef,
    loadAndCacheRouteHotelDetails,
  });

const handleItineraryRouteOptionClick = useRouteOptionSwitchController({
  activeRouteQuoteId,
  quoteId: quoteId || null,
  itineraryQuoteId: itinerary?.quoteId,
  routeHotelDetailsByQuoteId,
  isMountedRef,
  latestRouteRequestRef,
  switchedRouteRef,
  currentFetchRef,
  setIsSwitchingRouteOption,
  setActiveRouteQuoteId,
  setError,
  setPageReady,
  setLoading,
  setLoadingHotels,
  setItinerary,
  setHotelDetails,
  setActiveHotelListTotal,
  setVehicleBuildError,
  setVehicleBuildStatus,
  pushPageLoaderStage,
  getDetailsDeduped,
  loadAndCacheRouteHotelDetails,
});

const hotelTimelineLoading = Boolean(
  shouldShowHotels &&
    !hotelDetails &&
    itinerary &&
    !error &&
    !isSwitchingRouteOption
);

  const handleCopyClipboard = useHotelClipboardAction({
    selectedHotels,
    clipboardType,
    hotelDetails,
    itinerary,
    getSelectedClipboardGroups,
    buildClipboardHtml,
    mergeClipboardWithB2BRecommendedPackages,
    replaceHighlightsHotspotDetailsHtml,
    buildHighlightsHotspotDetailsHtml,
    copyHtmlToClipboard,
    htmlToPlainText,
    setClipboardModal,
    setSelectedHotels,
  });

  const arrivalPolicyDialogProps = useArrivalPolicyDecisionDialog({
    itinerary,
    arrivalPolicyConfirmModal,
    setArrivalPolicyConfirmModal,
    pendingRouteTimeUpdate,
    setPendingRouteTimeUpdate,
    setLastArrivalPolicyDecisionKey,
    isResolvingArrivalPolicy,
    isApplyingRouteTimeUpdate,
    applyRouteTimePatch,
    persistArrivalPolicyDecision,
    resolveArrivalPolicyForArrivalTimeChange,
  });
  const fitHereDialogProps = useFitHereDialogProps({
    fitHereModal,
    selectedFitHotspot,
    selectedFitHereDay,
    onManualClose: handleFitHereCancel,
    onManualConfirm: handleConfirmFitHere,
    onManualRetry: handleRetryFitHere,
    confirmLoading: confirmFitHereLoading,
    autoFitHereModal,
    selectedHotspot: selectedFitHotspot,
    previewRequestIdRef,
    setAutoFitHereModal,
    onAutomaticConfirm: (options, attempt) => { void handleConfirmFitHere(options, attempt); },
  });
  const hotelDialogProps = useItineraryHotelDialogProps({
    hotelSelectionModal,
    roomSelectionModal,
    itinerary,
    guestDetails,
    hotelSearchChildAges,
    setHotelSearchChildAges,
    handleSelectHotelFromSearch,
    isSelectingHotel,
    setHotelSelectionModal,
    setRoomSelectionModal,
    onRoomSelectionSuccess: () => toast.success("Room categories updated successfully"),
  });
  const mediaDialogProps = useItineraryMediaDialogProps({
    mediaShareState,
    itineraryPreference,
    paraRecommendations,
    selectedHotels,
    setSelectedHotels,
    handleCopyClipboard,
    sourcePreviewOpen,
    setSourcePreviewOpen,
    sourcePreviewHeading,
    sourcePreviewLoading,
    sourcePreviewError,
    sourcePreviewMarkdown,
    quoteId: String(quoteId || ""),
    allHotspotsPreviewModal,
    onOpenAllHotspotsPreview: (open) => setAllHotspotsPreviewModal((previous) => ({ ...previous, open })),
    formatTime: formatPreviewTime,
    formatDuration: formatActivityDuration,
  });
  const quotationDialogProps = useItineraryQuotationDialogProps({
    state: quotationState,
    itinerary,
    requiresHotelBookingFlow,
    shouldEnableWalletTopUpOnConfirm,
    confirmRequiredAmount,
    isWalletInsufficientForConfirm,
    confirmRoomCount,
    confirmPassengerMix,
    confirmOccupancyPreview,
    requiresDetailedPassengerFlow,
    isOpeningConfirmQuotation,
    isPrebooking,
    externalStayEntries: externalStayEntries as readonly Record<string, unknown>[],
    nonTboSelectedHotelEntries: nonTboSelectedHotelEntries as readonly Record<string, unknown>[],
    prebookHotelEntries: prebookHotelEntries as readonly Record<string, unknown>[],
    hasPrebookPriceChanged,
    defaultExternalStayMessage: DEFAULT_EXTERNAL_STAY_MESSAGE,
    normalizePrebookItems,
    resolvePrebookInclusions,
    resolvePrebookMealPlan,
    normalizeCancellationPolicyItems,
    normalizeMealPlanLabel,
    parseWalletAmount,
    formatCurrency,
    handleWalletTopUpAndContinue,
    refreshConfirmWalletBalance,
    defaultPassenger,
    getPassengerFieldError,
    handleArrivalDateTimeChange,
    resetConfirmWalletTopUpPanel,
    handleConfirmQuotation,
    canConfirmQuotation,
  });
  const ancillaryModalProps = useItineraryAncillaryModalProps({
    itineraryPlanId: itinerary?.planId || 0,
    voucherModal,
    setVoucherModal,
    pluckCardModal,
    setPluckCardModal,
    invoiceModal,
    setInvoiceModal,
    invoiceType,
    incidentalModal,
    setIncidentalModal,
    onIncidentalSuccess: () => setIncidentalHistoryRefreshToken((current) => current + 1),
    cancelModalOpen,
    setCancelModalOpen,
    onCancellationSuccess: () => {
      toast.success("Itinerary data will be refreshed");
      window.location.reload();
    },
    selectedHotelForVoucher,
    hotelVoucherModalOpen,
    setHotelVoucherModalOpen,
    onHotelVoucherSuccess: refreshHotelData,
  });
  const { handleCopyLink, handleShareWhatsApp, handleShareEmail } = useItineraryShareActions(setShareModal);
  const hotspotApplyPresentation = useHotspotApplyPresentation({
    backendForceConflictState,
    activePreviewValidation,
    matrixApplyBlocked,
    confirmActionConfig,
    isCurrentPreviewAlreadyAdded,
    isMatrixMissingBlockedState,
    matrixRequiresBuild,
    isMatrixBuiltButNoFeasibleSlot,
    manualPreviewState,
    activePreviewResolution,
    groupPreviewResolution,
    isManualRelaxedRouteFitPolicy,
  });
  const {
    hotspotForceConflictMode,
    hotspotEffectiveDecisionBlocked,
    hotspotBlockForValidation,
    hotspotApplyLabel,
  } = hotspotApplyPresentation;

  const addHotspotDialogProps = useItineraryAddHotspotDialogProps({
    state: {
      ...hotspotState,
      visibleHotspotsForActiveTab,
      routeIsDifferentCity,
      hotspotCityTabs,
      currentRouteAttractionHotspotIds,
      currentRouteManualHotspotIds,
      currentRouteManualHotspotMetaById,
    },
    previewModel: { ...hotspotPreviewViewModel, selectedFitHotspot, activePreviewHotspotId, selectedHotspotAnchor, hasManualOpeningOrTimingConflict, groupPreviewResolution, selectedHotelMetaByRoute, selectedHotspotId },
    selectedPreviewCityContext,
    destinationCityLabel,
    previewRouteId: Number(addHotspotModal.routeId || 0),
    excludedHotspotIds,
    selectedFitHereDay,
    isBuildingMatrix,
    isApplyingPreviewHotspot,
    list: {
      routeIsDifferentCity,
      hotspotCityTabs,
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
      backendStrategyLabel: backendForceConflictState.selectedStrategyLabel,
      matrixBuildCommand: String(matrixBuildSuggestion?.command || ""),
    },
    presentation: { ...hotspotApplyPresentation, isCurrentPreviewAlreadyAdded, matrixApplyBlocked },
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

  const vehicleBuildInProgress = shouldShowVehicles && (vehicleBuildStatus === "PENDING" || vehicleBuildStatus === "PROCESSING");

  if (location.pathname.startsWith("/confirmed-itinerary/")) {
    return null;
  }
  if (vehicleBuildStatus === "FAILED" && shouldShowVehicles) {
    return (
      <VehicleBuildErrorState
        error={vehicleBuildError}
        onRetry={async () => {
          if (!quoteId) return;
          setVehicleBuildStatus("PROCESSING");
          setVehicleBuildError(null);
          setError(null);
          await loadPreparedItineraryPage(quoteId, true);
        }}
      />
    );
  }

  if ((!pageReady || loading || hotelTimelineLoading || vehicleBuildInProgress) && !isApplyingRouteTimeUpdate) {
    return <ItineraryPageLoader stage={pageLoaderStage} detail={pageLoaderDetail} history={pageLoaderHistory} />;
  }

  if (error || !itinerary) {
    return <ItineraryDetailsErrorState error={error} planId={itinerary?.planId} />;
  }

  const backToListHref = itinerary.planId
    ? `/create-itinerary?id=${itinerary.planId}`
    : "#";
  const modifyItineraryHref = backToListHref;
  const handleClipboardMode = (mode: ClipboardMode) => {
    if (itineraryPreference === 2) {
      handleVehicleOnlyClipboardCopyRefactored(mode);
      return;
    }
    setClipboardType(mode);
    setSelectedHotels(buildDefaultClipboardSelection());
    setClipboardModal(true);
  };

  return <ItineraryDetailsPageView
      isConfirmedPresentation={isConfirmedPresentation}
      routeProgress={{
        visible: isApplyingRouteTimeUpdate || isRebuilding || isSwitchingRouteOption,
        isSwitchingRouteOption,
        routeProgressTitle,
        routeProgressDetail,
        routeProgressPercent: routeTimeProgressPercent,
        routeTimeEstimatedMs,
        routeProgressHistory,
      }}
      travelSections={{
        isConfirmedPresentation,
        header: { summaryStickyRef, itineraryRouteOptions, activeRouteQuoteId, quoteId, isSwitchingRouteOption, handleItineraryRouteOptionClick, itineraryPreference, scrollToVehicleList, vehicleBuildStatus, scrollToHotelList, backToListHref, itinerary, handleDownloadPluckCard, setVoucherModal, setIncidentalModal, modifyItineraryHref, handleDownloadInvoice, shouldShowRebuildHotelsButton, hotelReadOnly, handleRebuildHotels, isRebuildingHotels, overallTripCostWithHotels },
        daysContext: { displayDays, getDisplayDistances, getGuestFoodPreferenceText, itinerary, guideAssignments, readOnly, guideAvailability, guideAvailabilityLoading, isGuidePriceAvailableForDay, getGuideAssignmentForDay, routeNeedsRebuild, summaryStickyHeight, isRebuilding, handleRebuildRoute, handleUpdateRouteTimesDirectFromHook, openSourcePreview, openAddHotspotModal, handleWholeItineraryGuideClick, handleAddGuideClick, openGuideModal, setDeleteGuideModal, destinationHotelDisplayName, selectedHotelMetaByRoute, hotelDetails, hotelReadOnly, openDeleteHotspotModal, openAddActivityModal, openGalleryModal, openVideoModal, openDeleteActivityModal, toImgSrc, isAttractionCoveredByGuide, openHotelSelectionModal, setRoomSelectionModal, toast, extractTravelFromToFromText, extractTravelToFromText },
        specialInstructionsText,
        hotelListRef,
        summaryStickyHeight,
        shouldShowHotels,
        loadingHotels,
        hotelDetailsPresent: Boolean(hotelDetails),
        hotelList: { hotelListRef, summaryStickyHeight, hotels: hotelsForDisplay, restrictedHotels: hotelDetails?.restrictedHotels || [], hotelTabs: hotelDetails?.hotelTabs || [], hotelRatesVisible: Boolean(hotelDetails?.hotelRatesVisible), showHotelMargins: Boolean(hotelDetails?.showHotelMargins), roomCount: Number(itinerary.roomCount || 1), onTotalChange: (total) => { if (!hotelReadOnly) setActiveHotelListTotal(Number(total || 0)); }, onToggleHotelRates: setClipboardRatesVisible, quoteId: quoteId!, planId: itinerary.planId, onRefresh: refreshHotelData, onGroupTypeChange: handleHotelGroupTypeChange, onGetSaveFunction: handleGetSaveFunction, readOnly: hotelReadOnly, onCreateVoucher: handleCreateVoucher, onCancelVoucher: handleCancelVoucherSingle, onBulkCancelVouchers: handleCancelVoucherItems, onHotelSelectionsChange: handleHotelSelectionsChange, pagination: hotelDetails?.pagination, routePagination: hotelDetails?.routePagination, onLoadMore: handleHotelLoadMore, isLoadingMore: isLoadingMoreHotels, mealPlanCode: itinerary?.meal_plan_code, dayDestinationFallback: itinerary?.days?.reduce<Record<number, string>>((acc, day) => { const fallback = String(day.arrival || day.departure || '').trim(); if (fallback) acc[Number(day.dayNumber)] = fallback; return acc; }, {}) || {} },
        shouldShowVehicles,
        vehicleBuildStatus,
        hasVehicles: Boolean((itinerary.vehicles && itinerary.vehicles.length) || (itinerary.vehicleRateAvailability && itinerary.vehicleRateAvailability.length)),
        vehicleSection: { vehicleListRef, summaryStickyHeight, vehicles: itinerary.vehicles, vehicleRateAvailability: itinerary.vehicleRateAvailability, planId: itinerary.planId, dateRange: itinerary.dateRange, days: itinerary.days || [], canViewCostBreakdown, showVendorDetails: !isAgentLogin, onRefresh: refreshVehicleData, onSelectedTotalChange: handleVehicleSelectedTotalChange },
        vehicleUnavailable: { vehicleListRef, summaryStickyHeight },
        incidentalHistory: isConfirmedPresentation && itinerary.planId ? { planId: itinerary.planId, refreshToken: incidentalHistoryRefreshToken } : null,
        packageIncludes: itinerary.packageIncludes,
        cost: { itinerary, canViewCostBreakdown, shouldShowHotels, shouldShowVehicles, financialTotals, roomBreakdownRoomNights, selectedHotelMetaByRoute, clipboardRatesVisible, isRoomCostPopoverOpen, setIsRoomCostPopoverOpen, computedVehicleAmount, computedVehicleQty, effectiveEntryTicketAmount, entryTicketBreakdownByLocation },
        actions: { isConfirmedPresentation, onCopyClipboard: handleClipboardMode, onDownloadPluckCard: handleDownloadPluckCard, onOpenVoucher: () => setVoucherModal(true), onOpenIncidentalExpenses: () => setIncidentalModal(true), modifyItineraryHref, onDownloadInvoice: handleDownloadInvoice, readOnly, isConfirmedItinerary, onExtendTrip: () => setCancelModalOpen(true), onConfirmQuotation: openConfirmQuotationModal, isOpeningConfirmQuotation, canConfirmQuotation, onCopyLink: handleCopyLink, onShareWhatsApp: handleShareWhatsApp, onShareEmail: handleShareEmail, onBackToTop: () => window.scrollTo({ top: 0, behavior: "smooth" }) },
      }}
      activityGuideDialogs={{
        hotspotDelete: {
          open: deleteHotspotModal.open,
          title: "Delete Hotspot",
          description: <>Are you sure you want to delete "{deleteHotspotModal.hotspotName}"? This will also remove all associated activities.</>,
          deleting: isDeleting,
          onOpenChange: (open) => setDeleteHotspotModal({ ...deleteHotspotModal, open }),
          onCancel: () => setDeleteHotspotModal({ open: false, planId: null, routeId: null, routeHotspotId: null, masterHotspotId: null, hotspotName: "", hotspotWasPrebuilt: false }),
          onConfirm: handleDeleteHotspot,
        },
        activity: { context: { addActivityModal, setAddActivityModal, loadingActivities, availableActivities, activityPreview, isAddingActivity, previewingActivityId, handlePreviewActivity, handleOpenPreviewAllHotspots, formatActivityDuration, formatActivityMoney, formatPreviewTime, getActivityTotalAmount, getSelectedPreviewActivity, handleAddActivity } },
        activityDelete: {
          open: deleteActivityModal.open,
          title: "Delete Activity",
          description: <>Are you sure you want to delete "{deleteActivityModal.activityName}"?</>,
          deleting: isDeletingActivity,
          onOpenChange: (open) => setDeleteActivityModal({ ...deleteActivityModal, open }),
          onCancel: () => setDeleteActivityModal({ open: false, planId: null, routeId: null, activityId: null, activityName: "" }),
          onConfirm: handleDeleteActivity,
        },
        guide: { guideModal, setGuideModal, formatDate: (value) => formatHeaderDate(value), onSave: handleSaveGuideAssignment },
        guideDelete: {
          open: deleteGuideModal.open,
          title: "Delete Guide",
          description: Number(deleteGuideModal.assignment?.guideType || 0) === 1 ? "Are you sure you want to remove this whole-itinerary guide assignment?" : "Are you sure you want to remove this guide assignment from the itinerary day?",
          deleting: deleteGuideModal.deleting,
          onOpenChange: (open) => { if (!deleteGuideModal.deleting) setDeleteGuideModal((prev) => ({ ...prev, open })); },
          onCancel: () => setDeleteGuideModal({ open: false, assignment: null, deleting: false }),
          onConfirm: () => void handleDeleteGuideAssignment(),
        },
      }}
      addHotspotDialog={addHotspotDialogProps}
      arrivalPolicyDialog={arrivalPolicyDialogProps}
      hotelDialogs={hotelDialogProps}
      mediaDialogs={mediaDialogProps}
      quotation={{ open: confirmQuotationModal, onOpenChange: setConfirmQuotationModal, ...quotationDialogProps }}
      fitHereDialogs={fitHereDialogProps}
      ancillaryModals={ancillaryModalProps}
    />;
};

export default ItineraryDetails;
