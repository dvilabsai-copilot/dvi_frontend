// FILE: src/pages/ItineraryDetails.tsx
// Keep this as a named + default export module for router compatibility across HMR reloads.
import React, { useCallback, useEffect, useState } from "react";
import { useParams, useLocation, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import {
  DEFAULT_EXTERNAL_STAY_MESSAGE,
} from "./itinerary-details/hooks/useExternalStayEntries";
import { useFitHereTimelineHelpers } from "./itinerary-details/hooks/useFitHereTimelineHelpers";
import { FitHereAnchorButton } from "./itinerary-details/components/FitHereAnchorButton";
import type {
  HotspotAnchor,
  ItineraryDay,
  ItineraryDetailsProps,
  ItinerarySegment,
} from "./itinerary-details/itinerary-details.types";
import {
  isSupplierBookableHotel,
} from "./itinerary-details/utils/domain.utils";
import { mapDaySegmentToPreview as mapDaySegmentToPreviewUtil } from "./itinerary-details/utils/fitHerePreviewTimeline.utils";
import {
  filterAvailableHotspotsForAnchor,
  formatHeaderDate,
  formatManualPolicyTime,
  formatMinutesToDisplay,
  formatPreviewDuration,
  getDisplayDistances,
  getGuestFoodPreferenceText,
  getManualTimingPolicyFromPreview,
  hasManualOpeningOrTimingConflict,
  isEarlyMorningTime,
  isManualRelaxedRouteFitPolicy,
  normalizeDateToYmd,
  normalizeDurationAgainstDistance,
  parseDisplayMinutes,
  parseDisplayTimeToHms,
} from "./itinerary-details/utils/timeline.utils";
import {
  getSafeErrorMessage,
} from "./itinerary-details/utils/quotationConfirmationDetails.utils";
import {
  formatCurrency,
  getHotelSelectionAmount,
  getWalletAmountFromResponse,
} from "./itinerary-details/utils/clipboardFormatting.utils";
import {
  inferHotelProvider,
  normalizeHotelProvider,
  parseStaahSearchReference,
} from "./itinerary-details/utils/hotelBookingNormalization.utils";
import {
  formatActivityDuration,
  formatActivityMoney,
  formatPreviewTime,
  getActivityTotalAmount,
} from "./itinerary-details/utils/activityFormatting.utils";
import { autoLoadStartedQuotes, getDetailsDeduped } from "./itinerary-details/utils/details-dedupe";
import { ItineraryPageLoader } from "./itinerary-details/components/ItineraryPageLoader";
import { ItineraryDetailsErrorState } from "./itinerary-details/components/ItineraryDetailsErrorState";
import { useHotspotState } from "./itinerary-details/hooks/useHotspotState";
import { useFitHereProgressTimer } from "./itinerary-details/hooks/useFitHereProgressTimer";
import { useItineraryCostViewModel } from "./itinerary-details/hooks/useItineraryCostViewModel";
import { useItineraryRouteState } from "./itinerary-details/hooks/useItineraryRouteState";
import { useItineraryQuotationState } from "./itinerary-details/hooks/useItineraryQuotationState";
import { useHotelSelectionState } from "./itinerary-details/hooks/useHotelSelectionState";
import { useMediaShareState } from "./itinerary-details/hooks/useMediaShareState";
import { useHotelWorkflowState } from "./itinerary-details/hooks/useHotelWorkflowState";
import { useActivityState } from "./itinerary-details/hooks/useActivityState";
import { useItineraryQuotationConfirmationWorkflow } from "./itinerary-details/hooks/useItineraryQuotationConfirmationWorkflow";
import { useItineraryPreparedPageWorkflow } from "./itinerary-details/hooks/useItineraryPreparedPageWorkflow";
import { useItineraryRouteMutationWorkflow } from "./itinerary-details/hooks/useItineraryRouteMutationWorkflow";
import { useItineraryShareActions } from "./itinerary-details/hooks/useItineraryShareActions";
import { useItineraryHotelSelectionWorkflow } from "./itinerary-details/hooks/useItineraryHotelSelectionWorkflow";
import { useMediaModalController } from "./itinerary-details/hooks/useMediaModalController";
import { useEnsureHotelDetailsLoaded } from "./itinerary-details/hooks/useEnsureHotelDetailsLoaded";
import { useItineraryHotelDataWorkflow } from "./itinerary-details/hooks/useItineraryHotelDataWorkflow";
import {
  buildArrivalPolicyDecisionKey,
} from "./itinerary-details/utils/routeArrivalPolicy.utils";
import { useItineraryHotspotMutationWorkflow } from "./itinerary-details/hooks/useItineraryHotspotMutationWorkflow";
import { useItineraryHotspotPreviewWorkflow } from "./itinerary-details/hooks/useItineraryHotspotPreviewWorkflow";
import { useItineraryScrollEffects } from "./itinerary-details/hooks/useItineraryScrollEffects";
import { useItineraryHotspotDialogWorkflow } from "./itinerary-details/hooks/useItineraryHotspotDialogWorkflow";
import { useItineraryQuotationDialogWorkflow } from "./itinerary-details/hooks/useItineraryQuotationDialogWorkflow";
import { useItineraryMediaDialogWorkflow } from "./itinerary-details/hooks/useItineraryMediaDialogWorkflow";
import { useItinerarySupportingDialogWorkflow } from "./itinerary-details/hooks/useItinerarySupportingDialogWorkflow";
import { useItineraryPageRefs } from "./itinerary-details/hooks/useItineraryPageRefs";
import { useItineraryHotelPageWorkflow } from "./itinerary-details/hooks/useItineraryHotelPageWorkflow";
import { useItineraryRouteProgressWorkflow } from "./itinerary-details/hooks/useItineraryRouteProgressWorkflow";
import { useItineraryRouteSupportWorkflow } from "./itinerary-details/hooks/useItineraryRouteSupportWorkflow";
import { useItineraryRouteOptionsWorkflow } from "./itinerary-details/hooks/useItineraryRouteOptionsWorkflow";
import { useAddHotspotModalController } from "./itinerary-details/hooks/useAddHotspotModalController";
import { useItineraryFitHereWorkflow } from "./itinerary-details/hooks/useItineraryFitHereWorkflow";
import { useWalletTopUpController } from "./itinerary-details/hooks/useWalletTopUpController";
import { useGuideState } from "./itinerary-details/hooks/useGuideState";
import { useItineraryDeletionState } from "./itinerary-details/hooks/useItineraryDeletionState";
import { useItineraryDocumentActions } from "./itinerary-details/hooks/useItineraryDocumentActions";
import { useHotelDetailsLoader } from "./itinerary-details/hooks/useHotelDetailsLoader";
import { useItineraryQuotationHotelContext } from "./itinerary-details/hooks/useItineraryQuotationHotelContext";
import { useItineraryClipboardWorkflow } from "./itinerary-details/hooks/useItineraryClipboardWorkflow";
import { useItineraryArrivalPolicyHydration } from "./itinerary-details/hooks/useItineraryArrivalPolicyHydration";
import { buildItineraryModifyHref } from "./itinerary-details/utils/pageGuards.utils";
import { parseItineraryDetailsLocationState } from "./itinerary-details/itinerary-details-route-state";
import { extractTravelFromToFromText as extractTravelFromToFromTextUtil, extractTravelToFromText as extractTravelToFromTextUtil } from "./itinerary-details/utils/hotspotText.utils";
import { useItinerarySummaryValues } from "./itinerary-details/hooks/useItinerarySummaryValues";
import { useParaRecommendations } from "./itinerary-details/hooks/useParaRecommendations";
import { useItineraryDisplayMode } from "./itinerary-details/hooks/useItineraryDisplayMode";
import { dedupeItineraryHotelRows } from "./itinerary-details/utils/hotelRows.utils";
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
const navigate = useNavigate();
const locationState = parseItineraryDetailsLocationState(location.state);
const partialSave = locationState.partialSave;
const [activeHotelListTotal, setActiveHotelListTotal] = useState(0);
  //Extra

  const routeState = useItineraryRouteState(quoteId);
  const {
    itinerary, hotelDetails, setHotelDetails,
    loading, error, setError, pageLoaderStage, pageLoaderDetail,
    pageLoaderHistory, pageReady,
    activeRouteQuoteId, isSwitchingRouteOption,
    latestRouteOptions, itineraryDaysCountRef, fetchCompleteHotelDetailsRef,
  } = routeState;
  const {
    isConfirmedItinerary, canViewCostBreakdown, isAgentLogin, hotelReadOnly,
    isConfirmedPresentation, shouldShowHotels, shouldShowVehicles,
    isVehicleOnlyItinerary, requiresHotelBookingFlow,
  } = useItineraryDisplayMode(itinerary, readOnly, presentationMode);

  const routeSupportWorkflow = useItineraryRouteSupportWorkflow({
    routeState,
    activeRouteQuoteId,
    quoteId,
    itineraryQuoteId: itinerary?.quoteId,
  });
  const { openSourcePreview, cacheRouteHotelDetails, loadAndCacheRouteHotelDetails } = routeSupportWorkflow;

  const deletionState = useItineraryDeletionState();
  const {
    deleteHotspotModal, setDeleteHotspotModal, isDeleting,
    routeNeedsRebuild, isRebuilding,
    excludedHotspotIds, setExcludedHotspotIds,
    deleteActivityModal, setDeleteActivityModal, isDeletingActivity,
  } = deletionState;

  const activityState = useActivityState();
  const {
    addActivityModal, setAddActivityModal, availableActivities,
    loadingActivities, isAddingActivity,
    activityPreview, previewingActivityId,
  } = activityState;

  const guideState = useGuideState();
  const {
    guideAssignments, guideAvailability,
    guideAvailabilityLoading, guideModal, setGuideModal,
    deleteGuideModal, setDeleteGuideModal,
  } = guideState;
  const hotspotState = useHotspotState();
  const {
    addHotspotModal, setAddHotspotModal, setLoadingHotspots,
    availableHotspots, setAvailableHotspots, setHotspotFilterMeta,
    setActivePreviewHotspotId, setAddedInModalHotspotIds,
    setSelectedHotspotIds,
    selectedHotspotAnchor, setSelectedHotspotAnchor,
    selectedFitHotspot, setSelectedFitHotspot, triedFitHereAnchors, setTriedFitHereAnchors,
    fitHereModal, setFitHereModal, setAutoFitHereModal,
    isApplyingPreviewHotspot,
    isBuildingMatrix,
    previewRequestIdRef, fitHereProgressTimerRef,
  } = hotspotState;

  const { startFitHereProgressTimer, stopFitHereProgressTimer } = useFitHereProgressTimer({
    timerRef: fitHereProgressTimerRef,
    setFitHereModal,
  });

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
    resetManualHotspotPreviewState,
    resetManualHotspotPreviewStateButKeepActiveHotspot,
    hotspotPreviewViewModel,
  } = hotspotPreviewWorkflow;
  const { normalizeAvailableHotspots } = hotspotPreviewViewModel;

  const hotelWorkflowState = useHotelWorkflowState();
  const {
    setLastArrivalPolicyDecisionKey,
    loadingHotels, setLoadingHotels, hotelError, isRebuildingHotels, setRoomSelectionModal,
    isApplyingRouteTimeUpdate, routeTimeProgressPercent,
    routeTimeEstimatedMs, routeProgressTitle,
    routeProgressDetail, routeProgressHistory,
    pendingScrollDayNumber, setPendingScrollDayNumber,
  } = hotelWorkflowState;

  const routeProgressWorkflow = useItineraryRouteProgressWorkflow({
    routeState,
    hotelWorkflowState,
    dayCount: itinerary?.days?.length ?? 0,
  });
  const { pushPageLoaderStage, stopRouteTimeProgress, pushRouteProgressStage, startRouteTimeProgress, getRouteTimeUpdateEstimateMs } = routeProgressWorkflow;

  const mediaShareState = useMediaShareState();
  const {
    setGalleryModal, setGalleryActiveIdx,
    setVideoModal, clipboardModal, setClipboardModal,
    setShareModal, clipboardType, setClipboardType,
    clipboardRatesVisible, setClipboardRatesVisible,
  } = mediaShareState;

  // Hotel Selection State (Multi-Provider)
  const hotelSelectionState = useHotelSelectionState();
   const {
    selectedHotelBookings,
    setSelectedHotelBookings,
    selectedHotels,
    setSelectedHotels,
    activeHotelGroupType,
    setActiveHotelGroupType,
    summaryStickyRef,
    hotelListRef,
    vehicleListRef,
    summaryStickyHeight,
    setHotelPageByGroupRoute,
    isLoadingMoreHotels,
    setIsLoadingMoreHotels,
    hotelPaginationMessage,
  } = hotelSelectionState;
  const hotelPageWorkflow = useItineraryHotelPageWorkflow({
    itinerary,
    quoteId,
    shouldShowVehicles,
    routeState,
    hotelSelectionState,
    isLoadingMoreHotels,
    setIsLoadingMoreHotels,
    setHotelPageByGroupRoute,
  });
  const {
  scrollToHotelList,
  scrollToVehicleList,
  itineraryPreference,
  canConfirmQuotation,
  handleHotelLoadMore,
} = hotelPageWorkflow;

  const {
    fetchCompleteHotelDetails,
    loadConfirmedHotelsFromDb,
    loadHotelDetailsForItinerary,
  } = useHotelDetailsLoader({
    itineraryDaysCountRef,
    fetchCompleteHotelDetailsRef,
    dedupeHotelRows: dedupeItineraryHotelRows,
  });

const costViewModel = useItineraryCostViewModel({
  itinerary,
  hotelDetails,
  hotelReadOnly,
  selectedHotelBookings,
  activeHotelGroupType,
  activeHotelListTotal,
  shouldShowHotels,
  shouldShowVehicles,
});
  const {
    selectedHotelMetaByRoute,
    roomBreakdownRoomNights,
    computedVehicleAmount,
    computedVehicleQty,
    entryTicketBreakdownByLocation,
    hotelsForDisplay,
    financialTotals,
    effectiveEntryTicketAmount,
    displayDays,
  } = costViewModel;

const { overallTripCostWithHotels, specialInstructionsText, earlyArrivalPreferenceMessage } = useItinerarySummaryValues({
  netPayable: financialTotals.netPayable,
  overallCost: itinerary?.overallCost,
  itinerary: itinerary as Record<string, unknown> | null,
});

  // ✅ Para should use recommendation GROUPS, not first 4 random hotels
  const paraRecommendations = useParaRecommendations(hotelDetails);

  const clipboardWorkflow = useItineraryClipboardWorkflow({
    quoteId,
    itineraryPreference,
    itinerary,
    hotelDetails,
    activeHotelGroupType,
    setActiveHotelGroupType,
    setClipboardRatesVisible,
    clipboardModal,
    clipboardType,
    setClipboardType,
    paraRecommendations,
    selectedHotels,
    setSelectedHotels,
    setClipboardModal,
    shouldShowHotels,
    shouldShowVehicles,
    computedVehicleAmount,
    computedVehicleQty,
  });
  const {
    handleClipboardMode,
  } = clipboardWorkflow;

  useItineraryArrivalPolicyHydration({ itinerary, hotelDetails, setLastArrivalPolicyDecisionKey });

  const quotationState = useItineraryQuotationState({ itinerary, financialTotals });
  const {
    confirmQuotationModal, setConfirmQuotationModal, setVoucherModal,
    incidentalHistoryRefreshToken, setIncidentalModal,
    walletTopUpAmount, setWalletTopUpAmount, walletTopUpRemark, setWalletTopUpRemark,
    agentInfo, prebookData, setPrebookData, isPrebooking,
    isOpeningConfirmQuotation,
    setWalletBalance, setWalletBalanceAmount, setShowWalletTopUpPanel, setWalletShortfallAmount,
    setIsWalletTopUpSubmitting, setHasAcceptedUpdatedPrice, setConfirmOccupanciesTemplate,
    confirmRequiredAmount, isWalletInsufficientForConfirm, confirmRoomCount, confirmPassengerMix,
    confirmOccupancyPreview, defaultPassenger, getPassengerFieldError,
  } = quotationState;
const {
  handleDownloadPluckCard,
  handleDownloadInvoice,
  handleDownloadDetailedVoucher,
} = useItineraryDocumentActions(
  Number(itinerary?.planId || 0),
  Number(itineraryPreference || 0),
);

const handleOpenVoucher = () => {
  const preference = Number(itineraryPreference || 0);

  if (
    [1, 2].includes(preference) ||
    (isAgentLogin && preference === 3)
  ) {
    void handleDownloadDetailedVoucher();
    return;
  }

  setVoucherModal(true);
};
  const { hotelSaveFunctionRef, isMountedRef, currentFetchRef, latestRouteRequestRef, switchedRouteRef } = useItineraryPageRefs();
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
    requiresDetailedPassengerFlow, hasPrebookPriceChanged, prebookHotelEntries,
    nonTboSelectedHotelEntries, externalStayEntries, prebookDataRef,
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
    // Existing itinerary pages must not refresh supplier availability during
    // mount/reload. That is a mutating operation and can replace a persisted
    // mixed-room allocation with the supplier's default allocation. Availability
    // refresh remains explicit through Reset/Check Availability actions.
    enableAutomaticValidation: false,
  });
  const {
    handleHotelGroupTypeChange, handleResetHotels, handleShowOfflineHotels, acknowledgeHotelAvailabilityChanges, refreshHotelAvailability, hotelAvailabilityChangeSummary, refreshHotelData, refreshVehicleData, refreshSelectedHotelRates,
    handleCancelVoucherItems, handleCancelVoucherSingle, handleCreateVoucher, handleGetSaveFunction,
    setCancelModalOpen, handleHotelSelectionsChange, previewTemporarySelectionCost,
  } = hotelDataWorkflow;

  const preparedPageWorkflow = useItineraryPreparedPageWorkflow({
    routeState,
    hotelWorkflowState,
    hotelSelectionState,
    hotelDetails,
    initialHotelDetails: locationState.initialHotelDetails as any,
    initialHotelDetailsAt: locationState.initialHotelDetailsAt,
    initialHotelReset: Boolean((location.state as any)?.skipInitialHotelAvailabilityValidation),
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
    partialSave,
  });
    const {
    loadPreparedItineraryPage,
  } = preparedPageWorkflow;

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
    applyRouteTimePatch,
    handleUpdateRouteTimesDirect: handleUpdateRouteTimesDirectFromHook,
    persistArrivalPolicyDecision,
    transportEarlyArrivalDialog,
    closeTransportEarlyArrivalDialog,
    confirmTransportEarlyArrival,
    routeRestrictionError,
    setRouteRestrictionError,
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
    groupPreviewResolution: hotspotState.groupPreviewResolution,
    pendingPriorityReplacementHotspotId: hotspotPreviewViewModel.pendingPriorityReplacementHotspotId,
    addHotspotModal,
    itinerary,
    quoteId,
    readOnly,
    shouldShowHotels,
    isDestinationSideManualPreview: hotspotPreviewViewModel.isDestinationSideManualPreview,
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
    resolveArrivalPolicyForArrivalTimeChange, handleArrivalDateTimeChange,
    openHotelSelectionModal, handleSelectHotelFromSearch,
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

  const routeOptionsWorkflow = useItineraryRouteOptionsWorkflow({
    itinerary,
    quoteId,
    activeRouteQuoteId,
    latestRouteOptions,
    routeState,
    hotelWorkflowState,
    hotelSelectionState,
    isConfirmedItinerary,
    shouldShowHotels,
    isMountedRef,
    latestRouteRequestRef,
    switchedRouteRef,
    currentFetchRef,
    loadAndCacheRouteHotelDetails,
    getDetailsDeduped,
    pushPageLoaderStage,
  });
  const { itineraryRouteOptions, handleItineraryRouteOptionClick } = routeOptionsWorkflow;

  const { handleCopyClipboard } = clipboardWorkflow;

  const mediaDialogProps = useItineraryMediaDialogWorkflow({
    mediaShareState,
    routeState,
    deletionState,
    itineraryPreference,
    paraRecommendations,
    selectedHotels,
    setSelectedHotels,
    handleCopyClipboard,
    quoteId,
  });
  const quotationDialogProps = useItineraryQuotationDialogWorkflow({
    state: quotationState,
    itinerary,
    requiresHotelBookingFlow,
    shouldEnableWalletTopUpOnConfirm,
    confirmation: { confirmRequiredAmount, isWalletInsufficientForConfirm, confirmRoomCount, confirmPassengerMix, confirmOccupancyPreview, requiresDetailedPassengerFlow, isOpeningConfirmQuotation, isPrebooking, hasPrebookPriceChanged, canConfirmQuotation },
    hotelContext: { externalStayEntries, nonTboSelectedHotelEntries, prebookHotelEntries },
    actions: { handleWalletTopUpAndContinue, refreshConfirmWalletBalance, defaultPassenger, getPassengerFieldError, handleArrivalDateTimeChange, resetConfirmWalletTopUpPanel, handleConfirmQuotation },
  });
  const supportingDialogProps = useItinerarySupportingDialogWorkflow({
    itinerary,
    hotelWorkflowState,
    quotationState,
    hotspotState,
    deletionState,
    hotelSelectionWorkflow,
    hotelDataWorkflow,
    selectedFitHereDay,
    fitHereHandlers: {
      onManualClose: handleFitHereCancel,
      onManualConfirm: handleConfirmFitHere,
      onManualRetry: handleRetryFitHere,
      onAutomaticConfirm: (options, attempt) => { void handleConfirmFitHere(options, attempt); },
    },
    arrivalHandlers: { applyRouteTimePatch, persistArrivalPolicyDecision, resolveArrivalPolicyForArrivalTimeChange },
    hotelHandlers: { handleSelectHotelFromSearch },
  });
  const { arrivalPolicyDialogProps, fitHereDialogProps, hotelDialogProps, ancillaryModalProps } = supportingDialogProps;
const publicShareGroupType = Number(
  activeHotelGroupType ??
  hotelDetails?.hotelTabs?.[0]?.groupType ??
  1
);

const { handleCopyLink, handleShareWhatsApp, handleShareEmail } =
  useItineraryShareActions(
    setShareModal,
    Number(itinerary?.planId || 0),
    publicShareGroupType,
  );
  const { addHotspotDialogProps } = useItineraryHotspotDialogWorkflow({
    hotspotState,
    previewModel: hotspotPreviewViewModel,
    itinerary,
    selectedFitHotspot,
    selectedHotspotAnchor,
    selectedHotspotId,
    selectedFitHereDay,
    selectedHotelMetaByRoute,
    destinationCityLabel: hotspotPreviewViewModel.destinationCityLabel,
    selectedPreviewCityContext: hotspotPreviewViewModel.selectedPreviewCityContext,
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
    backendStrategyLabel: hotspotPreviewViewModel.backendForceConflictState.selectedStrategyLabel,
    matrixBuildCommand: String(hotspotPreviewViewModel.matrixBuildSuggestion?.command || ""),
    isManualRelaxedRouteFitPolicy,
    toast,
    resetManualHotspotPreviewState,
    previewRequestIdRef,
  });

  if (location.pathname.startsWith("/confirmed-itinerary/")) {
    return null;
  }

  if ((!pageReady || loading) && !isApplyingRouteTimeUpdate) {
    return <ItineraryPageLoader stage={pageLoaderStage} detail={pageLoaderDetail} history={pageLoaderHistory} />;
  }

  if (error || !itinerary) {
    return <ItineraryDetailsErrorState error={error} planId={itinerary?.planId} />;
  }

  const modifyItineraryHref = buildItineraryModifyHref(itinerary.planId);
  // Hotel rows may be persisted without a destination label. Resolve the
  // display destination from every route representation available in the
  // itinerary payload before allowing the hotel table to render "-".
  const dayDestinationFallback = itinerary.days?.reduce<Record<number, string>>((acc, day) => {
    const rawDay = day as typeof day & {
      segments?: Array<Record<string, unknown>>;
      destination?: string;
      nextVisitingLocation?: string;
      next_visiting_location?: string;
      arrival?: string;
      arrival_location?: string;
      departure?: string;
      departure_location?: string;
    };
    const segmentValues = (Array.isArray(rawDay.segments) ? rawDay.segments : [])
      .slice()
      .reverse()
      .flatMap((segment: Record<string, unknown>) => [
        segment?.destination,
        segment?.to,
        segment?.toName,
        segment?.arrival,
        segment?.location,
        segment?.place,
      ]);
    const destination = [
      rawDay.destination,
      rawDay.nextVisitingLocation,
      rawDay.next_visiting_location,
      rawDay.arrival,
      rawDay.arrival_location,
      rawDay.departure,
      rawDay.departure_location,
      ...segmentValues,
    ]
      .map((value) => String(value || '').trim())
      .find((value) => value && !/^hotel$/i.test(value));
    if (destination) acc[Number(rawDay.dayNumber)] = destination;
    return acc;
  }, {});
  (hotelDetails?.hotelAvailability?.stayRoutes || []).forEach((route) => {
    const dayNumber = Number(route?.dayNumber || 0);
    const destination = String(route?.destination || '').trim();
    if (dayNumber > 0 && destination && !dayDestinationFallback[dayNumber]) {
      dayDestinationFallback[dayNumber] = destination;
    }
  });
  const hotelDetailsMealPlanCode = (hotelDetails as (typeof hotelDetails & { meal_plan_code?: string }))?.meal_plan_code;
  const itineraryMealPlanCode = (itinerary as typeof itinerary & { mealPlanCode?: string }).mealPlanCode;
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
header: {
  summaryStickyRef,
  itineraryRouteOptions,
  activeRouteQuoteId,
  quoteId,
  isSwitchingRouteOption,
  handleItineraryRouteOptionClick,
  itineraryPreference,
  scrollToVehicleList,
  scrollToHotelList,
  backToListHref: modifyItineraryHref,
  itinerary,
isAgentLogin,
handleDownloadPluckCard,
handleOpenVoucher,
setVoucherModal,
setIncidentalModal,
modifyItineraryHref,
handleDownloadInvoice,
  hotelReadOnly,
  overallTripCostWithHotels,
},
        daysContext: { displayDays, getDisplayDistances, getGuestFoodPreferenceText, itinerary, guideAssignments, readOnly, guideAvailability, guideAvailabilityLoading, isGuidePriceAvailableForDay, getGuideAssignmentForDay, routeNeedsRebuild, summaryStickyHeight, isRebuilding, handleRebuildRoute, handleUpdateRouteTimesDirectFromHook, openSourcePreview, openAddHotspotModal, handleWholeItineraryGuideClick, handleAddGuideClick, openGuideModal, setDeleteGuideModal, destinationHotelDisplayName: hotspotPreviewViewModel.destinationHotelDisplayName, selectedHotelMetaByRoute, selectedHotelBookings, hotelDetails, hotelsForDisplay, hotelReadOnly, openDeleteHotspotModal, openAddActivityModal, openGalleryModal, openVideoModal, openDeleteActivityModal, toImgSrc, isAttractionCoveredByGuide, openHotelSelectionModal, setRoomSelectionModal, toast, extractTravelFromToFromText, extractTravelToFromText },
        specialInstructionsText,
        earlyArrivalPreferenceMessage,
        transportEarlyArrivalDialog: {
          open: transportEarlyArrivalDialog.open,
          option: transportEarlyArrivalDialog.option,
          hotelName: transportEarlyArrivalDialog.hotelName,
          restMinutes: transportEarlyArrivalDialog.restMinutes,
          onOpenChange: closeTransportEarlyArrivalDialog,
          onConfirm: confirmTransportEarlyArrival,
        },
        hotelListRef,
        summaryStickyHeight,
         shouldShowHotels,
         loadingHotels: loadingHotels || isRebuildingHotels,
         hotelError,
         hotelDetailsPresent: Boolean(hotelDetails),
        // The hotel pane must consume the complete top-level snapshot returned
        // by Reset/check-availability. hotelsForDisplay is intentionally
        // reduced for the itinerary summary and can collapse a continuous
        // stay to its first night.
        hotelList: { hotelListRef, summaryStickyHeight, hotels: hotelDetails?.hotels?.length ? hotelDetails.hotels : hotelsForDisplay, restrictedHotels: hotelDetails?.restrictedHotels || [], hotelTabs: hotelDetails?.hotelTabs || [], hotelSelectionState: hotelDetails?.hotelSelectionState || [], hotelIndex: hotelDetails?.hotelIndex || [], hotelRatesVisible: Boolean(hotelDetails?.hotelRatesVisible), showHotelMargins: Boolean(hotelDetails?.showHotelMargins), roomCount: Number(itinerary.roomCount || 1), extraBedCount: Number(itinerary.extraBed || 0), childWithBedCount: Number(itinerary.childWithBed || 0), childWithoutBedCount: Number(itinerary.childWithoutBed || 0), onToggleHotelRates: setClipboardRatesVisible, quoteId: quoteId!, planId: itinerary.planId, onResetHotels: handleResetHotels, onRefreshSelectedHotel: refreshHotelData, onShowOfflineHotels: handleShowOfflineHotels, onAcknowledgeAvailabilityChanges: acknowledgeHotelAvailabilityChanges, onRefreshHotelAvailability: refreshHotelAvailability, onGroupTypeChange: handleHotelGroupTypeChange, onGetSaveFunction: handleGetSaveFunction, readOnly: hotelReadOnly, onCreateVoucher: handleCreateVoucher, onCancelVoucher: handleCancelVoucherSingle, onBulkCancelVouchers: handleCancelVoucherItems, onHotelSelectionsChange: handleHotelSelectionsChange, onTemporarySelectionCostPreview: previewTemporarySelectionCost, onTotalChange: setActiveHotelListTotal, hotelAvailability: hotelDetails?.hotelAvailability, hotelAvailabilityChangeSummary, hotelSearchRecoveryMessage: partialSave?.hotelSearch?.status === "FAILED" ? (partialSave.hotelSearch.message || "The itinerary was saved, but hotel availability could not be checked.") : null, hotelPaginationMessage, isValidatingAvailability: isRebuildingHotels, pagination: hotelDetails?.pagination, routePagination: hotelDetails?.routePagination, onLoadMore: handleHotelLoadMore, isLoadingMore: isLoadingMoreHotels, mealPlanCode: hotelDetailsMealPlanCode || itinerary?.meal_plan_code || itineraryMealPlanCode || itinerary?.mealPlan || '', dayDestinationFallback },
        shouldShowVehicles,
        hasVehicles: Boolean((itinerary.vehicles && itinerary.vehicles.length) || (itinerary.vehicleRateAvailability && itinerary.vehicleRateAvailability.length)),
       vehicleSection: {
  vehicleListRef,
  summaryStickyHeight,
  vehicles: itinerary.vehicles,
  vehicleSelections:
    itinerary.vehicleSelections || [],
  vehicleRateAvailability:
    itinerary.vehicleRateAvailability,
  planId: itinerary.planId,
  dateRange: itinerary.dateRange,
  days: itinerary.days || [],
  canViewCostBreakdown,
  showVendorDetails: !isAgentLogin,
  onRefresh: refreshVehicleData,
},
        incidentalHistory:
  isConfirmedPresentation && !isAgentLogin && itinerary.planId
    ? {
        planId: itinerary.planId,
        refreshToken: incidentalHistoryRefreshToken,
      }
    : null,
        packageIncludes: itinerary.packageIncludes,
        cost: { itinerary, canViewCostBreakdown, financialTotals },
        actions: { isConfirmedPresentation, onCopyClipboard: handleClipboardMode, onDownloadPluckCard: handleDownloadPluckCard,onOpenVoucher: handleOpenVoucher,onOpenIncidentalExpenses: () => {
  if (!isAgentLogin) {
    setIncidentalModal(true);
  }
}, modifyItineraryHref, onDownloadInvoice: handleDownloadInvoice, readOnly, isConfirmedItinerary, onExtendTrip: () => setCancelModalOpen(true), onConfirmQuotation: openConfirmQuotationModal, isOpeningConfirmQuotation, canConfirmQuotation, onCopyLink: handleCopyLink, onShareWhatsApp: handleShareWhatsApp, onShareEmail: handleShareEmail, onBackToTop: () => window.scrollTo({ top: 0, behavior: "smooth" }) },
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
      routeRestrictionError={routeRestrictionError}
      onCloseRouteRestrictionError={() => setRouteRestrictionError(null)}
    />;
};

export default ItineraryDetails;
