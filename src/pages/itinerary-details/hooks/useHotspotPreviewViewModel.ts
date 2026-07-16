import { useEffect, useMemo } from "react";
import type { ItineraryDay, ItinerarySegment } from "../itinerary-details.types";
import { useEffectivePreviewTimeline } from "./useEffectivePreviewTimeline";
import { useDestinationHotelDisplayName } from "./useDestinationHotelDisplayName";
import { useMatrixFitState } from "./useMatrixFitState";
import { usePreviewCityContext } from "./usePreviewCityContext";
import { useMatrixAvailabilityState } from "./useMatrixAvailabilityState";
import { usePreviewDecisionState } from "./usePreviewDecisionState";
import { useInsertionDecisionSummary } from "./useInsertionDecisionSummary";
import { usePreviewSlotState } from "./usePreviewSlotState";
import { useBestInsertionSlot } from "./useBestInsertionSlot";
import { usePreviewHotspotMeta } from "./usePreviewHotspotMeta";
import { useCurrentRouteHotspotState } from "./useCurrentRouteHotspotState";
import { useNormalizedAvailableHotspots } from "./useNormalizedAvailableHotspots";
import { useActiveAnchorFitInsight } from "./useActiveAnchorFitInsight";
import { useFilteredHotspots } from "./useFilteredHotspots";
import { useHotspotRouteCityContext } from "./useHotspotRouteCityContext";
import { useHotspotCityPresentation } from "./useHotspotCityPresentation";
import { useDestinationInsertionSlotLabel } from "./useDestinationInsertionSlotLabel";
import { mapDaySegmentToPreview as mapDaySegmentToPreviewUtil } from "../utils/fitHerePreviewTimeline.utils";
import { getSelectedPreviewSegments as getSelectedPreviewSegmentsUtil } from "../utils/fitHereSelectedPreview.utils";
import { getOptionalPreviewRemovedHotspotDetails, getPreviewRemovedHotspotDetails } from "../utils/previewRemovedHotspots.utils";
import { getPendingPriorityReplacementHotspotId } from "../utils/previewPriority.utils";
import { resolveActivePreviewTimeline } from "../utils/activePreviewTimeline.utils";
import { resolveActivePreviewResolution } from "../utils/activePreviewResolution.utils";
import type { DeletionStateSnapshot, HotspotStateSnapshot, RouteStateSnapshot } from "./useHotspotPreviewViewModel.types";

export type HotspotPreviewViewModelArgs = {
  itinerary: RouteStateSnapshot["itinerary"];
  hotelDetails: RouteStateSnapshot["hotelDetails"];
  addHotspotModal: HotspotStateSnapshot["addHotspotModal"];
  activePreviewHotspotId: HotspotStateSnapshot["activePreviewHotspotId"];
  availableHotspots: HotspotStateSnapshot["availableHotspots"];
  previewTimelinesByHotspot: HotspotStateSnapshot["previewTimelinesByHotspot"];
  previewResolutionsByHotspot: HotspotStateSnapshot["previewResolutionsByHotspot"];
  groupPreviewResolution: HotspotStateSnapshot["groupPreviewResolution"];
  manualPreviewState: HotspotStateSnapshot["manualPreviewState"];
  selectedHotspotIds: HotspotStateSnapshot["selectedHotspotIds"];
  topPriorityReplacementApproved: HotspotStateSnapshot["topPriorityReplacementApproved"];
  selectedHotspotAnchor: HotspotStateSnapshot["selectedHotspotAnchor"];
  addedInModalHotspotIds: HotspotStateSnapshot["addedInModalHotspotIds"];
  excludedHotspotIds: DeletionStateSnapshot["excludedHotspotIds"];
  hotspotFilterMeta: HotspotStateSnapshot["hotspotFilterMeta"];
  activeHotspotCityTab: HotspotStateSnapshot["activeHotspotCityTab"];
  setActiveHotspotCityTab: HotspotStateSnapshot["setActiveHotspotCityTab"];
  hotspotSearchQuery: HotspotStateSnapshot["hotspotSearchQuery"];
  hotspotListRef: HotspotStateSnapshot["hotspotListRef"];
  priorityConfirmRef: HotspotStateSnapshot["priorityConfirmRef"];
  selectedHotspotId: number | null;
  selectedFitHereDay: ItineraryDay | null;
  currentRouteForModal: ItineraryDay | null;
  mapDaySegmentToPreview: (segment: ItinerarySegment) => ReturnType<typeof mapDaySegmentToPreviewUtil>;
};

export function useHotspotPreviewViewModel({
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
}: HotspotPreviewViewModelArgs) {
  const asRecord = (value: unknown): Record<string, unknown> => (
    value && typeof value === "object" ? value as Record<string, unknown> : {}
  );

  const defaultPreviewTimeline = useMemo(() => {
    const routeId = addHotspotModal.routeId;
    if (!routeId || !itinerary?.days?.length) return [];

    const day = itinerary.days.find((d) => Number(d.id) === Number(routeId));
    if (!day?.segments?.length) return [];

    return day.segments.map(mapDaySegmentToPreview).filter(Boolean);
  }, [addHotspotModal.routeId, itinerary?.days, mapDaySegmentToPreview]);

  const selectedPreviewSegments = useMemo(
    () => getSelectedPreviewSegmentsUtil(availableHotspots, previewTimelinesByHotspot, selectedHotspotIds),
    [availableHotspots, previewTimelinesByHotspot, selectedHotspotIds],
  );

  const activePreviewTimeline = useMemo(() => {
    const sourceTimeline = (Array.isArray(manualPreviewState?.fullTimeline) && manualPreviewState.fullTimeline.length > 0)
      ? manualPreviewState.fullTimeline
      : (selectedHotspotId ? (previewTimelinesByHotspot[selectedHotspotId] || []) : []);
    if (!selectedHotspotId && sourceTimeline.length === 0) return [];
    return resolveActivePreviewTimeline(
      sourceTimeline,
      (manualPreviewState?.resolution || manualPreviewState || null) as Record<string, unknown> | null,
      addHotspotModal.routeId,
    );
  }, [addHotspotModal.routeId, manualPreviewState, previewTimelinesByHotspot, selectedHotspotId]);

  const activePreviewResolution = useMemo(
    () => resolveActivePreviewResolution(manualPreviewState, groupPreviewResolution, selectedHotspotId, previewResolutionsByHotspot),
    [groupPreviewResolution, manualPreviewState, previewResolutionsByHotspot, selectedHotspotId],
  );

  const activePreviewValidation = useMemo(() => activePreviewResolution?.validation || null, [activePreviewResolution]);
  const normalizedDecision = useMemo(
    () => asRecord(activePreviewResolution).normalizedDecision
      || asRecord(asRecord(activePreviewResolution).resolution).normalizedDecision
      || asRecord(manualPreviewState).normalizedDecision
      || null,
    [activePreviewResolution, manualPreviewState],
  );
  const previewRemovedHotspotDetails = useMemo(() => getPreviewRemovedHotspotDetails(activePreviewResolution), [activePreviewResolution]);
  const optionalPreviewRemovedHotspotDetails = useMemo(
    () => getOptionalPreviewRemovedHotspotDetails(activePreviewResolution, previewRemovedHotspotDetails),
    [activePreviewResolution, previewRemovedHotspotDetails],
  );
  const pendingPriorityReplacementHotspotId = useMemo(
    () => getPendingPriorityReplacementHotspotId(
      (groupPreviewResolution || activePreviewResolution) as Record<string, unknown> | null,
      selectedHotspotIds,
      topPriorityReplacementApproved,
    ),
    [activePreviewResolution, groupPreviewResolution, selectedHotspotIds, topPriorityReplacementApproved],
  );
  const pendingPriorityResolution = useMemo(() => {
    if (!pendingPriorityReplacementHotspotId) return null;
    return groupPreviewResolution || previewResolutionsByHotspot[pendingPriorityReplacementHotspotId] || null;
  }, [groupPreviewResolution, pendingPriorityReplacementHotspotId, previewResolutionsByHotspot]);

  useEffect(() => {
    if (pendingPriorityReplacementHotspotId && priorityConfirmRef.current) {
      priorityConfirmRef.current.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  }, [pendingPriorityReplacementHotspotId, priorityConfirmRef]);

  const effectivePreviewTimeline = useEffectivePreviewTimeline({
    activePreviewResolution,
    activePreviewTimeline,
    defaultPreviewTimeline,
    groupPreviewResolution,
    pendingPriorityReplacementHotspotId,
    selectedHotspotId,
    selectedHotspotIds,
    selectedPreviewSegments,
  });

  const manualInsertionFit = useMemo(() => asRecord(activePreviewResolution).manualInsertionFit ?? null, [activePreviewResolution]);
  const matrixFit = useMemo(
    () => asRecord(activePreviewResolution).manualInsertionFit || asRecord(groupPreviewResolution).manualInsertionFit || null,
    [activePreviewResolution, groupPreviewResolution],
  );
  const activeManualOptimizer = useMemo(
    () => {
      const value = asRecord(activePreviewResolution).manualOptimizer
        || asRecord(asRecord(activePreviewResolution).resolution).manualOptimizer;
      return value && typeof value === "object" ? value as Record<string, unknown> : null;
    },
    [activePreviewResolution],
  );
  const manualAttemptDisplayMeta = useMemo(() => {
    const attempts = Array.isArray(activeManualOptimizer?.attempts)
      ? activeManualOptimizer.attempts.filter((attempt): attempt is Record<string, unknown> => Boolean(attempt && typeof attempt === "object"))
      : [];
    const authoritative = attempts.length > 0 && attempts.every((attempt) => String(attempt?.source || "").toUpperCase() === "REAL_CLUSTER_SIMULATION");
    const wrapperOnly = attempts.length > 0 && attempts.every((attempt) => String(attempt?.source || "").toUpperCase() === "CANDIDATE_WRAPPER");
    return { attempts, authoritative, wrapperOnly };
  }, [activeManualOptimizer]);
  const backendForceConflictState = useMemo(() => {
    const source = asRecord(activePreviewResolution).resolution || activePreviewResolution || null;
    const sourceRecord = asRecord(source);
    return {
      canForceConflict: sourceRecord.canForceConflict === true,
      finalConflictModeOnly: sourceRecord.finalConflictModeOnly === true,
      selectedStrategyLabel: String(sourceRecord.selectedStrategyLabel || "").trim(),
    };
  }, [activePreviewResolution]);

  const destinationHotelDisplayName = useDestinationHotelDisplayName({ addHotspotRouteId: addHotspotModal.routeId, effectivePreviewTimeline, hotelDetails, itinerary, matrixFit });
  const { matrixBuildSuggestion, hasValidChosenMatrixSlot, matrixFitAlreadyHasUsableData } = useMatrixFitState({ activePreviewResolution, groupPreviewResolution, matrixFit });
  const { deriveHotspotCityContext, activePreviewHotspot, selectedPreviewCityContext, isDestinationSideManualPreview } = usePreviewCityContext({
    activePreviewHotspotId,
    activePreviewResolution,
    addHotspotModal,
    availableHotspots,
    currentRouteForModal,
    groupPreviewResolution,
    hotspotFilterMeta,
    manualPreviewState,
    matrixFit,
  });
  const { matrixRequiresBuild, isMatrixMissingBlockedState, isMatrixBuiltButNoFeasibleSlot, shouldShowBuildMatrixButton } = useMatrixAvailabilityState({
    activePreviewResolution,
    activePreviewValidation,
    groupPreviewResolution,
    isDestinationSideManualPreview,
    matrixFit,
    matrixFitAlreadyHasUsableData,
    normalizedDecision,
  });
  const { previewValidationReasonText, matrixApplyBlocked, decisionStatus, confirmActionConfig } = usePreviewDecisionState({
    activePreviewResolution,
    activePreviewValidation,
    destinationHotelDisplayName,
    groupPreviewResolution,
    isMatrixBuiltButNoFeasibleSlot,
    isMatrixMissingBlockedState,
    matrixFit,
    matrixRequiresBuild,
    manualPreviewState,
    normalizedDecision,
  });
  const insertionDecisionSummary = useInsertionDecisionSummary({
    activePreviewHotspotId,
    activePreviewResolution,
    activePreviewValidation,
    groupPreviewResolution,
    isMatrixBuiltButNoFeasibleSlot,
    isMatrixMissingBlockedState,
    matrixApplyBlocked,
    matrixFit,
    matrixRequiresBuild,
    manualPreviewState,
  });
  const { resolvedRemovalTimelineLeak, safeMatrixSlots, effectiveFitSlot, routeFitBadgeClass, normalizedInsertionSlots } = usePreviewSlotState({
    activePreviewResolution,
    destinationHotelDisplayName,
    effectivePreviewTimeline,
    matrixFit,
    matrixRequiresBuild,
    manualPreviewState,
    selectedHotspotAnchor,
    selectedHotspotId,
  });
  const activeAnchorFitInsight = useActiveAnchorFitInsight({ matrixRequiresBuild, normalizedInsertionSlots, addHotspotRouteId: addHotspotModal.routeId, selectedHotspotId, matrixFit, manualPreviewState, activePreviewResolution, destinationHotelDisplayName });
  const bestInsertionSlot = useBestInsertionSlot({ matrixRequiresBuild, normalizedInsertionSlots });
  const previewHotspotMetaById = usePreviewHotspotMeta({ addHotspotRouteId: addHotspotModal.routeId, availableHotspots, itineraryDays: itinerary?.days });
  const { currentRouteAttractionHotspotIds, currentRouteManualHotspotIds, currentRouteManualHotspotMetaById, isCurrentPreviewAlreadyAdded } = useCurrentRouteHotspotState({
    activePreviewHotspotId,
    addedInModalHotspotIds,
    excludedHotspotIds,
    itineraryDays: itinerary?.days,
    routeId: addHotspotModal.routeId,
  });
  const normalizeAvailableHotspots = useNormalizedAvailableHotspots({ excludedHotspotIds, currentRouteAttractionHotspotIds, currentRouteManualHotspotMetaById });

  useEffect(() => {
    if (!addHotspotModal.open || !selectedHotspotId) return;
    const raf = requestAnimationFrame(() => {
      if (!hotspotListRef.current) return;
      const card = hotspotListRef.current.querySelector(`[data-hotspot-id="${selectedHotspotId}"]`) as HTMLElement | null;
      if (!card) return;
      const targetScrollTop = Math.max(0, card.offsetTop - 150);
      hotspotListRef.current.scrollTo({ top: targetScrollTop, behavior: "auto" });
    });
    return () => cancelAnimationFrame(raf);
  }, [addHotspotModal.open, selectedHotspotId, hotspotListRef]);

  useEffect(() => {
    if (hotspotListRef.current && addHotspotModal.open) hotspotListRef.current.scrollTop = 0;
  }, [hotspotSearchQuery, addHotspotModal.open, hotspotListRef]);

  const filteredHotspots = useFilteredHotspots({ availableHotspots, searchQuery: hotspotSearchQuery, currentRouteAttractionHotspotIds, currentRouteManualHotspotIds, addedInModalHotspotIds });
  const { sourceCityLabel, destinationCityLabel, routeIsDifferentCity } = useHotspotRouteCityContext({
    sourceCityKey: hotspotFilterMeta?.sourceCityKey,
    destinationCityKey: hotspotFilterMeta?.destinationCityKey,
    routeDeparture: currentRouteForModal?.departure,
    routeArrival: currentRouteForModal?.arrival,
    modalLocationName: addHotspotModal.locationName,
    selectedAnchorTo: selectedHotspotAnchor?.anchorTo,
  });
  const destinationInsertionSlotLabel = useDestinationInsertionSlotLabel({
    matrixFit,
    selectedAnchorSlot: (selectedHotspotAnchor as { slot?: unknown } | null)?.slot,
    selectedPreviewCityContext,
    destinationCityLabel,
    destinationHotelDisplayName,
  });
  const { hotspotListRows, hotspotCityBuckets, hotspotCityTabs, visibleHotspotsForActiveTab } = useHotspotCityPresentation({
    filteredHotspots,
    routeIsDifferentCity,
    sourceCityLabel,
    destinationCityLabel,
    sourceCityKey: hotspotFilterMeta?.sourceCityKey,
    activeHotspotCityTab,
    selectedPreviewCityContext,
    setActiveHotspotCityTab,
    deriveHotspotCityContext,
  });

  return {
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
    activeManualOptimizerSummary: String(activeManualOptimizer?.summary || ""),
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
    selectedFitHereDay,
  };
}
