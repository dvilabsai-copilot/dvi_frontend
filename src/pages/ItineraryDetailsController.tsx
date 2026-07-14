// FILE: src/pages/ItineraryDetails.tsx
// Keep this as a named + default export module for router compatibility across HMR reloads.
import React, { useEffect, useMemo, useState, useRef, useCallback } from "react";
import { useParams, Link, useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { ArrowLeft, ArrowUp, Clock, MapPin, Car, Calendar, Plus, Trash2, ArrowRight, Ticket, Bell, Building2, Timer, FileText, CreditCard, Receipt, Loader2, RefreshCw, Edit, AlertTriangle, Route, Utensils } from "lucide-react";
import { TimePickerPopover } from "@/components/itinerary/TimePickerPopover";
import { ItineraryService } from "@/services/itinerary";
import { AgentAPI } from "@/services/agentService";
import { api } from "@/lib/api";
import { VehicleList } from "./VehicleList";
import { HotelList } from "./HotelList";
import { VoucherDetailsModal } from "./VoucherDetailsModal";
import { PluckCardModal } from "./PluckCardModal";
import { InvoiceModal } from "./InvoiceModal";
import { IncidentalExpensesModal } from "./IncidentalExpensesModal";
import { IncidentalExpensesHistorySection } from "./IncidentalExpensesHistorySection";
import { HotelSearchModal } from "@/components/hotels/HotelSearchModal";
import { ArrivalHotelDecisionModal } from "@/components/hotels/ArrivalHotelDecisionModal";
import { HotelRoomSelectionModal } from "@/components/hotels/HotelRoomSelectionModal";
import { SupplementDisplay } from "@/components/hotels/SupplementDisplay";
import { CancelItineraryModal } from "@/components/modals/CancelItineraryModal";
import { HotelVoucherModal } from "@/components/modals/HotelVoucherModal";
import {
  ManualFitHerePreviewDialog,
  ManualFitHerePreviewResponse,
} from "@/components/itinerary/manual-fit/ManualFitHerePreviewDialog";
import { AutoFitHerePreviewDialog } from "@/components/itinerary/manual-fit/AutoFitHerePreviewDialog";
import { MarkdownPreview } from "@/components/itinerary/MarkdownPreview";
import {
  buildAutoManualHotspotPreviewPayload,
  buildExactManualHotspotPreviewPayload,
  extractAutoPreviewResults,
  pickBestAutoPreviewAnchorKey,
} from "./itinerary-details/manual-hotspot-preview.shared";
import { HotelSearchResult } from "@/hooks/useHotelSearch";
import { HotelArrivalPolicyRequest, HotelArrivalPolicyResponse } from "@/services/itinerary";
import { toast } from "sonner";
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
  HotspotSegment,
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
  getVehicleAmountNumber,
  isSupplierBookableHotel,
  normalizeMealPlanLabel,
} from "./itinerary-details/utils/domain.utils";
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
  normalizeConfirmedTimelineToSegments,
  normalizeDateToYmd,
  normalizeDurationAgainstDistance,
  normalizeTimelineLabel,
  parseDisplayMinutes,
  parseDisplayTimeToHms,
  parseDistanceKmValue,
  parseDurationMinutesValue,
  splitHotspotLocationTokens,
} from "./itinerary-details/utils/timeline.utils";
import { autoLoadStartedQuotes, getDetailsDeduped } from "./itinerary-details/utils/details-dedupe";
import { ItineraryPageLoader } from "./itinerary-details/components/ItineraryPageLoader";
import { ItineraryDetailsErrorState } from "./itinerary-details/components/ItineraryDetailsErrorState";
import { VehicleBuildErrorState } from "./itinerary-details/components/VehicleBuildErrorState";
import { GalleryDialog, VideoDialog } from "./itinerary-details/components/MediaDialogs";
import { ShareEmailDialog, SourcePreviewDialog } from "./itinerary-details/components/ShareAndSourceDialogs";
import { DeleteConfirmationDialog } from "./itinerary-details/components/DeleteConfirmationDialog";
import { AllHotspotsPreviewDialog } from "./itinerary-details/components/AllHotspotsPreviewDialog";
import { ClipboardDialog } from "./itinerary-details/components/ClipboardDialog";
import { ItineraryDayHeader } from "./itinerary-details/components/ItineraryDayHeader";
import { ItinerarySegments } from "./itinerary-details/components/ItinerarySegments";
import { GuideAssignmentDialog } from "./itinerary-details/components/GuideAssignmentDialog";
import { AddActivityDialog } from "./itinerary-details/components/AddActivityDialog";
import { SpecialInstructionsSection } from "./itinerary-details/components/SpecialInstructionsSection";
import { PackageIncludesCard } from "./itinerary-details/components/PackageIncludesCard";
import { ConfirmedQuoteBanner } from "./itinerary-details/components/ConfirmedQuoteBanner";
import { ItineraryHeader } from "./itinerary-details/components/ItineraryHeader";
import { useHotspotState } from "./itinerary-details/hooks/useHotspotState";
import { useItineraryRouteState } from "./itinerary-details/hooks/useItineraryRouteState";
import { useQuotationState, type AdditionalPassenger } from "./itinerary-details/hooks/useQuotationState";
import { useHotelSelectionState } from "./itinerary-details/hooks/useHotelSelectionState";
import { useMediaShareState } from "./itinerary-details/hooks/useMediaShareState";
import { useHotelWorkflowState } from "./itinerary-details/hooks/useHotelWorkflowState";
import { useActivityState } from "./itinerary-details/hooks/useActivityState";
import { useGuideState } from "./itinerary-details/hooks/useGuideState";
import { useItineraryDeletionState } from "./itinerary-details/hooks/useItineraryDeletionState";
import { useRouteTimeProgressController } from "./itinerary-details/hooks/useRouteTimeProgressController";
import { useVehicleTotalsSync } from "./itinerary-details/hooks/useVehicleTotalsSync";
import { useItineraryScrollController } from "./itinerary-details/hooks/useItineraryScrollController";
import { useHotelPaginationController } from "./itinerary-details/hooks/useHotelPaginationController";
import { useGuideDataRefresh } from "./itinerary-details/hooks/useGuideDataRefresh";
import { useItineraryDocumentActions } from "./itinerary-details/hooks/useItineraryDocumentActions";
import { useHotelDetailsLoader } from "./itinerary-details/hooks/useHotelDetailsLoader";
import { useHotelDataController } from "./itinerary-details/hooks/useHotelDataController";
import { useHotelVoucherController, type HotelVoucherItem } from "./itinerary-details/hooks/useHotelVoucherController";
import { useVehicleSelectionTotalsController } from "./itinerary-details/hooks/useVehicleSelectionTotalsController";
import { useHotelSelectionCoverage } from "./itinerary-details/hooks/useHotelSelectionCoverage";
import { useHotelClipboardAction } from "./itinerary-details/hooks/useHotelClipboardAction";
import { useHotelSelectionMutation } from "./itinerary-details/hooks/useHotelSelectionMutation";
import { useSelectedHotelSummary } from "./itinerary-details/hooks/useSelectedHotelSummary";
import { useComputedHotelCost } from "./itinerary-details/hooks/useComputedHotelCost";
import { useComputedVehicleTotals } from "./itinerary-details/hooks/useComputedVehicleTotals";
import { useEntryTicketSummary } from "./itinerary-details/hooks/useEntryTicketSummary";
import { useFinancialTotals } from "./itinerary-details/hooks/useFinancialTotals";
import { useRoomBreakdownNights } from "./itinerary-details/hooks/useRoomBreakdownNights";
import { useItinerarySummaryValues } from "./itinerary-details/hooks/useItinerarySummaryValues";
import { useParaRecommendations } from "./itinerary-details/hooks/useParaRecommendations";
import { PAGE_LOADER_STAGE_DETAILS } from "./itinerary-details/itinerary-details.constants";

// Preserve the historical type exports consumed by HotelList and other modules.
export type { ItineraryHotelRow, ItineraryHotelTab, ItineraryVehicleRow } from "./itinerary-details/itinerary-details.types";

// Legacy hotel DTO fields are defined in itinerary-details.types.ts.
  // ✅ HOBSE-specific fields (optional, used if provider === "HOBSE")
/*
  hotelCode?: string; // HOBSE hotel code
  bookingCode?: string; // HOBSE booking code
  searchReference?: string;
  checkInDate?: string; // YYYY-MM-DD format
  checkOutDate?: string; // YYYY-MM-DD format
  // ✅ Hotel distance from route location (calculated via Haversine on backend)
  hotelDistance?: string | null; // Distance in "XX.XX KM" format
  hotelAddress?: string | null;
  cancellationPolicy?: string[];
  isBookable?: boolean;
  externalStay?: boolean;
  availabilityStatus?: 'AVAILABLE' | 'NO_SUPPLIER_AVAILABILITY' | 'NOT_BOOKABLE';
  availabilityMessage?: string | null;
  availableAgainFrom?: string | null;
  displayRoomType?: string;
  displayMealPlan?: string;
};
*/


// --------- VEHICLES ---------

// ----------------- Helper functions -----------------
// ----------------- Main Component -----------------
// Note: keep explicit named + default export shape for router/HMR compatibility.

export const ItineraryDetails: React.FC<ItineraryDetailsProps> = ({ readOnly = false, presentationMode = 'standard' }) => {
const { id: quoteId } = useParams();
const location = useLocation();
const navigate = useNavigate();
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
  const isConfirmedItinerary = Number((itinerary as any)?.confirmed_itinerary_plan_ID || 0) > 0 || itinerary?.isConfirmed === true;
  const hotelReadOnly = readOnly || isConfirmedItinerary;
  const isConfirmedPresentation = presentationMode === 'confirmed' || readOnly || isConfirmedItinerary;
  const shouldShowHotels = (() => {
    const pref = Number(itinerary?.itineraryPreference ?? 0);
    return pref === 1 || pref === 3;
  })();
  const shouldShowVehicles = (() => {
    const pref = Number(itinerary?.itineraryPreference ?? 0);
    return pref === 2 || pref === 3;
  })();
  const isVehicleOnlyItinerary = shouldShowVehicles && !shouldShowHotels;
  const requiresHotelBookingFlow = shouldShowHotels;

const openSourcePreview = useCallback(async (dayNo: number) => {
  const currentQuoteId = String(activeRouteQuoteId || quoteId || itinerary?.quoteId || "").trim();
  if (!currentQuoteId) {
    toast.error("Quote ID is not available for source preview.");
    return;
  }

  setSourcePreviewOpen(true);
  setSourcePreviewLoading(true);
  setSourcePreviewError(null);
  setSourcePreviewMarkdown("");
  setSourcePreviewHeading("");

  try {
    const result = await ItineraryService.getHotspotScenarioMarkdown(currentQuoteId, dayNo);
    setSourcePreviewMarkdown(String(result.markdown || ""));
    setSourcePreviewHeading(String(result.heading || `${currentQuoteId} Day ${dayNo}`));
  } catch (error) {
    const message = String(error?.message || "Failed to load source preview.");
    setSourcePreviewError(message);
  } finally {
    setSourcePreviewLoading(false);
  }
}, [activeRouteQuoteId, itinerary?.quoteId, quoteId]);


const normalizeRouteFamilyBaseQuoteId = useCallback((value?: string | null) => {
  const raw = String(value || "").trim();
  if (!raw) return "";

  const match = raw.match(/^(.*)-R(\d+)$/i);
  return String(match?.[1] || raw).trim();
}, []);

const cacheRouteHotelDetails = useCallback(
  (routeQuoteId: string, hotelRes: ItineraryHotelDetailsResponse | null) => {
    const normalizedRouteQuoteId = String(routeQuoteId || "").trim();
    if (!normalizedRouteQuoteId || !hotelRes) return;

    setRouteHotelDetailsByQuoteId((prev) => {
      if (prev[normalizedRouteQuoteId] === hotelRes) {
        return prev;
      }

      return {
        ...prev,
        [normalizedRouteQuoteId]: hotelRes,
      };
    });
  },
  [],
);

const loadAndCacheRouteHotelDetails = useCallback(
  async (routeQuoteId: string): Promise<ItineraryHotelDetailsResponse | null> => {
    const normalizedRouteQuoteId = String(routeQuoteId || "").trim();
    if (!normalizedRouteQuoteId) return null;

    const cachedHotelDetails = routeHotelDetailsByQuoteId[normalizedRouteQuoteId];
    if (cachedHotelDetails) {
      return cachedHotelDetails;
    }

    const inFlight = routeHotelFetchPromisesRef.current.get(normalizedRouteQuoteId);
    if (inFlight) {
      return inFlight;
    }

    const request = (async () => {
      const fetcher = fetchCompleteHotelDetailsRef.current;
      if (!fetcher) {
        throw new ReferenceError("fetchCompleteHotelDetails is not ready yet");
      }

      const hotelRes = (await fetcher(normalizedRouteQuoteId)) as ItineraryHotelDetailsResponse;
      cacheRouteHotelDetails(normalizedRouteQuoteId, hotelRes);
      return hotelRes;
    })().finally(() => {
      routeHotelFetchPromisesRef.current.delete(normalizedRouteQuoteId);
    });

    routeHotelFetchPromisesRef.current.set(normalizedRouteQuoteId, request);
    return request;
  },
  [cacheRouteHotelDetails, routeHotelDetailsByQuoteId],
);

  const {
    deleteHotspotModal, setDeleteHotspotModal, isDeleting, setIsDeleting,
    routeNeedsRebuild, setRouteNeedsRebuild, isRebuilding, setIsRebuilding,
    excludedHotspotIds, setExcludedHotspotIds,
    allHotspotsPreviewModal, setAllHotspotsPreviewModal,
    deleteActivityModal, setDeleteActivityModal, isDeletingActivity, setIsDeletingActivity,
  } = useItineraryDeletionState();

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
    previewTimelinesByHotspot, setPreviewTimelinesByHotspot, previewResolutionsByHotspot, setPreviewResolutionsByHotspot,
    groupPreviewTimeline, setGroupPreviewTimeline, groupPreviewResolution, setGroupPreviewResolution,
    tempModalTimeline, setTempModalTimeline, forceReplacementApprovedByHotspot, setForceReplacementApprovedByHotspot,
    topPriorityReplacementApproved, setTopPriorityReplacementApproved, isPreviewingHotspotId, setIsPreviewingHotspotId,
    activePreviewHotspotId, setActivePreviewHotspotId, addedInModalHotspotIds, setAddedInModalHotspotIds,
    manualPreviewState, setManualPreviewState, isApplyingPreviewHotspot, setIsApplyingPreviewHotspot,
    isBuildingMatrix, setIsBuildingMatrix, selectedHotspotIds, setSelectedHotspotIds,
    selectedHotspotAnchor, setSelectedHotspotAnchor, activeHotspotCityTab, setActiveHotspotCityTab,
    selectedFitHotspot, setSelectedFitHotspot, triedFitHereAnchors, setTriedFitHereAnchors,
    fitHereModal, setFitHereModal, autoFitHereModal, setAutoFitHereModal,
    confirmFitHereLoading, setConfirmFitHereLoading, hotspotListRef, timelinePreviewRef,
    priorityConfirmRef, previewRequestIdRef, fitHereProgressTimerRef,
  } = hotspotState;

  const stopFitHereProgressTimer = () => {
    if (fitHereProgressTimerRef.current) {
      window.clearInterval(fitHereProgressTimerRef.current);
      fitHereProgressTimerRef.current = null;
    }
  };

  const startFitHereProgressTimer = () => {
    stopFitHereProgressTimer();

    fitHereProgressTimerRef.current = window.setInterval(() => {
      setFitHereModal((prev) => {
        if (!prev.open || !prev.loading) return prev;

        return {
          ...prev,
          loadingStepIndex: Math.min(prev.loadingStepIndex + 1, 10),
        };
      });
    }, 700);
  };

  useEffect(() => {
    return () => {
      stopFitHereProgressTimer();
    };
  }, []);

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

  const isFitHereSelectionMode = addHotspotModal.open;

  const getFitHereSegmentLabel = useCallback((segment: ItinerarySegment | any): string => {
    if (!segment) return 'Timeline row';
    if (segment.type === 'attraction') return String(segment.name || 'Hotspot');
    if (segment.type === 'travel') {
      const travelText = String(segment.to || segment.text || 'Travel').trim();
      return travelText.startsWith('Travel') ? travelText : `Travel to ${travelText}`;
    }
    if (segment.type === 'checkin') return String(segment.hotelName || 'Hotel');
    if (segment.type === 'break') return String(segment.location || 'Break');
    if (segment.type === 'start') return String(segment.title || 'Route start');
    if (segment.type === 'return') return 'Return';
    return String(segment.text || segment.title || 'Timeline row');
  }, []);

  const getFitHereSegmentTime = useCallback((segment: ItinerarySegment | any): string => {
    if (!segment) return '';
    return String(
      segment.visitTime ||
      segment.timeRange ||
      segment.time ||
      '',
    ).trim();
  }, []);

  const isFitHereStartSegment = useCallback((
    segment: ItinerarySegment | null | undefined,
  ): segment is StartSegment => {
    return segment?.type === 'start';
  }, []);

  const isFitHereAttractionSegment = useCallback((
    segment: ItinerarySegment | null | undefined,
  ): segment is AttractionSegment => {
    return segment?.type === 'attraction';
  }, []);

  const getAttractionHotspotId = useCallback((
    segment: ItinerarySegment | null | undefined,
  ): number | null => {
    if (!isFitHereAttractionSegment(segment)) return null;
    return Number(segment.hotspotId || segment.locationId || 0) || null;
  }, [isFitHereAttractionSegment]);

  const getAttractionRouteHotspotId = useCallback((
    segment: ItinerarySegment | null | undefined,
  ): number | null => {
    if (!isFitHereAttractionSegment(segment)) return null;
    return Number(segment.routeHotspotId || 0) || null;
  }, [isFitHereAttractionSegment]);

  const findNextAttractionAfterIndex = useCallback((
    day: ItineraryDay,
    startIndex: number,
  ): AttractionSegment | null => {
    for (let index = startIndex + 1; index < day.segments.length; index += 1) {
      const candidate = day.segments[index];
      if (candidate?.type === 'attraction') {
        return candidate as AttractionSegment;
      }
    }

    return null;
  }, []);

  const buildFitHereAnchorForTimelineRow = useCallback((
    day: ItineraryDay,
    index: number,
  ): HotspotAnchor | null => {
    const current = day.segments[index] || null;
    const next = day.segments[index + 1] || null;

    if (!current) return null;

    if (isFitHereStartSegment(current)) {
      const nextAttraction = findNextAttractionAfterIndex(day, index);

      return {
        anchorType: 'BETWEEN_ROWS',
        anchorIndex: index,
        anchorIntent: 'AFTER_START',
        anchorFrom: getFitHereSegmentLabel(current),
        anchorTo: nextAttraction
          ? getFitHereSegmentLabel(nextAttraction)
          : getFitHereSegmentLabel(next),
        anchorLabel: nextAttraction
          ? `Before first attraction: ${getFitHereSegmentLabel(nextAttraction)}`
          : 'After start',
        anchorTimeRange: getFitHereSegmentTime(current) || null,
        afterRowType: current.type,
        beforeRowType: next?.type,
        afterHotspotId: null,
        afterRouteHotspotId: null,
        beforeHotspotId: getAttractionHotspotId(nextAttraction),
        beforeRouteHotspotId: getAttractionRouteHotspotId(nextAttraction),
        isBeforeHotel: false,
      };
    }

    if (isFitHereAttractionSegment(current)) {
      const nextAttraction = findNextAttractionAfterIndex(day, index);

      return {
        anchorType: 'BETWEEN_ROWS',
        anchorIndex: index,
        anchorIntent: 'AFTER_ATTRACTION',
        anchorFrom: getFitHereSegmentLabel(current),
        anchorTo: nextAttraction
          ? getFitHereSegmentLabel(nextAttraction)
          : getFitHereSegmentLabel(next),
        anchorLabel: `After ${getFitHereSegmentLabel(current)}`,
        anchorTimeRange: getFitHereSegmentTime(current) || null,
        afterRowType: current.type,
        beforeRowType: next?.type,
        afterHotspotId: getAttractionHotspotId(current),
        afterRouteHotspotId: getAttractionRouteHotspotId(current),
        beforeHotspotId: getAttractionHotspotId(nextAttraction),
        beforeRouteHotspotId: getAttractionRouteHotspotId(nextAttraction),
        isBeforeHotel: false,
      };
    }

    return null;
  }, [
    findNextAttractionAfterIndex,
    getAttractionHotspotId,
    getAttractionRouteHotspotId,
    getFitHereSegmentLabel,
    getFitHereSegmentTime,
    isFitHereAttractionSegment,
    isFitHereStartSegment,
  ]);

  function renderFitHereButton(day: ItineraryDay, anchor: HotspotAnchor) {
    if (!selectedFitHotspot) return null;

    const anchorKey = buildFitHereAnchorKey(anchor);
    const tried = triedFitHereAnchors[anchorKey];

    return (
      <div
        data-testid="fit-here-anchor"
        data-anchor-index={anchor.anchorIndex}
        data-anchor-intent={anchor.anchorIntent}
        data-anchor-from={anchor.anchorFrom || ""}
        data-anchor-to={anchor.anchorTo || ""}
        data-anchor-label={anchor.anchorLabel || ""}
        className="relative ml-8 mt-3 flex items-center gap-2"
      >
        <button
          type="button"
          title={anchor.anchorLabel || "Fit Here"}
          onClick={() => void handleFitHereClick(day, anchor)}
          className="group flex items-center gap-2 rounded-full border-2 border-emerald-200 bg-white px-4 py-1.5 text-xs font-bold text-emerald-700 shadow-sm transition-all hover:bg-emerald-50 active:scale-95"
        >
          <span className="transition-transform group-hover:rotate-90">+</span>
          Fit Here
        </button>

        {tried && (
          <span
            className={[
              'rounded-lg px-3 py-1.5 text-xs font-semibold shadow-sm',
              tried.status === 'DIRECT_FIT'
                ? 'border border-emerald-200 bg-emerald-50 text-emerald-700'
                : tried.status === 'REMOVES_OPTIONAL'
                  ? 'border border-amber-200 bg-amber-50 text-amber-700'
                  : tried.status === 'P3_CONFIRMATION'
                    ? 'border border-amber-200 bg-amber-50 text-amber-700'
                    : tried.status === 'PRIORITY_CONFLICT'
                      ? 'border border-red-200 bg-red-50 text-red-700'
                      : 'border border-slate-200 bg-slate-100 text-slate-600',
            ].join(' ')}
          >
            {tried.label}
          </span>
        )}
      </div>
    );
  }

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

  const extractTravelToFromText = useCallback((value: unknown): string => {
    const raw = String(value || '').trim();
    if (!raw) return '';
    const match = raw.match(/^travel\s+to\s+(.+)$/i);
    return String(match?.[1] || '').trim();
  }, []);

  const extractTravelFromToFromText = useCallback((value: unknown): { from: string; to: string } => {
    const raw = String(value || '').trim();
    if (!raw) return { from: '', to: '' };
    const match = raw.match(/^travell?ing\s+from\s+(.+?)\s+to\s+(.+)$/i);
    if (!match) return { from: '', to: '' };
    return {
      from: String(match[1] || '').trim(),
      to: String(match[2] || '').trim(),
    };
  }, []);

  const mapDaySegmentToPreview = useCallback((seg: ItinerarySegment): any | null => {
    if (!seg) return null;

    if (seg.type === "hotspot") return null;

    if (seg.type === "attraction") {
      return {
        type: "attraction",
        text: seg.name,
        timeRange: seg.visitTime || null,
        visitTime: seg.visitTime || null,
        duration: seg.duration || null,
        timings: seg.timings || null,
        priority: seg.priority ?? null,
        locationId: Number(seg.hotspotId ?? seg.locationId ?? 0) || null,
        isConflict: seg.isConflict === true,
        conflictReason: seg.conflictReason ?? null,
      };
    }

    if (seg.type === "travel") {
      const travelSeg = seg as any;
      const resolvedTo = String(travelSeg?.to || extractTravelToFromText(travelSeg?.text) || '').trim();
      return {
        type: "travel",
        text: resolvedTo ? `Travel to ${resolvedTo}` : (travelSeg?.text || 'Travel'),
        timeRange: travelSeg?.timeRange || null,
        locationId: null,
        isConflict: travelSeg?.isConflict === true,
        conflictReason: travelSeg?.conflictReason ?? null,
        from: travelSeg?.from,
        to: travelSeg?.to,
        fromName: travelSeg?.from,
        toName: travelSeg?.to,
        displayFromName: travelSeg?.from,
        displayToName: travelSeg?.to,
        distance: travelSeg?.distance || null,
        duration: travelSeg?.duration || null,
      };
    }

    if (seg.type === "start") {
      return {
        type: "start",
        text: seg.title || "Start",
        timeRange: seg.timeRange || null,
        locationId: null,
      };
    }

    if (seg.type === "break") {
      return {
        type: "break",
        text: `Break at ${seg.location}`,
        timeRange: seg.timeRange || null,
        locationId: null,
      };
    }

    if (seg.type === "checkin") {
      return {
        type: "checkin",
        text: `Check-in at ${seg.hotelName}`,
        timeRange: seg.time || null,
        locationId: null,
      };
    }

    if (seg.type === "return") {
      return {
        type: "return",
        text: "Return",
        timeRange: seg.time || null,
        locationId: null,
      };
    }

    return null;
  }, [extractTravelToFromText]);

  const defaultPreviewTimeline = useMemo(() => {
    const routeId = addHotspotModal.routeId;
    if (!routeId || !itinerary?.days?.length) return [];

    const day = itinerary.days.find((d) => Number(d.id) === Number(routeId));
    if (!day?.segments?.length) return [];

    return day.segments
      .map(mapDaySegmentToPreview)
      .filter(Boolean);
  }, [addHotspotModal.routeId, itinerary?.days, mapDaySegmentToPreview]);

  const selectedPreviewSegments = useMemo(() => {
    const fallbackFor = (hotspotId: number) => {
      const hotspot = availableHotspots.find((h) => Number(h.id) === Number(hotspotId));
      return {
        type: "attraction",
        text: hotspot?.name || "Selected Hotspot",
        timeRange: null,
        locationId: hotspotId,
        isConflict: false,
        conflictReason: null,
        isUserSelectedPreview: true,
        selectedHotspotId: hotspotId,
      };
    };

    return selectedHotspotIds.map((hotspotId) => {
      const timeline = previewTimelinesByHotspot[hotspotId] || [];
      const candidates = timeline.filter((seg) => (
        seg?.type === "attraction" && Number(seg?.locationId) === Number(hotspotId)
      ));

      const hasConflictCandidate = candidates.some((seg) => seg?.isConflict === true);
      const fromTimeline = candidates.sort((a, b) => {
        const aConflict = a?.isConflict === true ? 1 : 0;
        const bConflict = b?.isConflict === true ? 1 : 0;
        if (aConflict !== bConflict) {
          return hasConflictCandidate ? (bConflict - aConflict) : (aConflict - bConflict);
        }
        const toStartMinutes = (timeRange: string): number => {
          const raw = String(timeRange || '').trim();
          const startPart = raw.split('-')[0]?.trim() || raw;
          const match = startPart.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
          if (!match) return Number.MAX_SAFE_INTEGER;
          let h = Number(match[1]);
          const m = Number(match[2]);
          const ampm = match[3].toUpperCase();
          if (ampm === 'AM' && h === 12) h = 0;
          if (ampm === 'PM' && h !== 12) h += 12;
          return (h * 60) + m;
        };
        return toStartMinutes(String(a?.timeRange || '')) - toStartMinutes(String(b?.timeRange || ''));
      })[0];

      if (!fromTimeline) {
        return fallbackFor(hotspotId);
      }

      return {
        ...fromTimeline,
        isUserSelectedPreview: true,
        selectedHotspotId: hotspotId,
      };
    });
  }, [availableHotspots, previewTimelinesByHotspot, selectedHotspotIds]);

  const activePreviewTimeline = useMemo(() => {
    const sourceTimeline = (Array.isArray(manualPreviewState?.fullTimeline) && manualPreviewState.fullTimeline.length > 0)
      ? manualPreviewState.fullTimeline
      : (selectedHotspotId ? (previewTimelinesByHotspot[selectedHotspotId] || []) : []);
    if (!selectedHotspotId && sourceTimeline.length === 0) return [];

    const previewResolutionSource = manualPreviewState?.resolution || manualPreviewState || null;
    const removedRows = [
      ...(Array.isArray((previewResolutionSource as any)?.removedHotspots)
        ? (previewResolutionSource as any).removedHotspots
        : []),
      ...(Array.isArray((previewResolutionSource as any)?.removedTopPriorityHotspots)
        ? (previewResolutionSource as any).removedTopPriorityHotspots
        : []),
      ...(Array.isArray((previewResolutionSource as any)?.deferredHotspots)
        ? (previewResolutionSource as any).deferredHotspots
        : []),
    ];
    const removedIds = new Set(
      removedRows
        .map((row) => Number(row?.id ?? row?.hotspotId ?? row?.hotspot_ID ?? 0))
        .filter((id: number) => id > 0),
    );

    const routeScopedRows = sourceTimeline
      .filter((row) => {
        const rowRouteId = Number(
          row?.itinerary_route_ID ??
          row?.itineraryRouteId ??
          row?.itinerary_route_id ??
          row?.route_id ??
          row?.routeId ??
          row?.dayId ??
          row?.routeID ??
          row?.route,
        );
        if (!Number.isFinite(rowRouteId) || rowRouteId <= 0) return true;
        return rowRouteId === Number(addHotspotModal.routeId);
      })
      .filter((row) => {
        if (removedIds.size === 0) return true;

        const hotspotId = Number(row?.hotspotId ?? row?.hotspot_ID ?? row?.locationId ?? 0);
        if (removedIds.has(hotspotId)) return false;

        const toHotspotId = Number(row?.toHotspotId ?? 0);
        if (removedIds.has(toHotspotId)) return false;

        const text = String(row?.text || row?.name || '').toLowerCase();
        const toName = String(row?.toName || row?.to || row?.displayToName || '').toLowerCase();

        return !removedRows.some((removed) => {
          const removedName = String(removed?.name || '').toLowerCase().trim();
          return (
            removedName
            && (
              text === removedName
              || text.includes(`travel to ${removedName}`)
              || toName.includes(removedName)
            )
          );
        });
      });
    const rows = [...routeScopedRows];

    const anyHavePreviewOrder = rows.some((row) => (
      Number.isFinite(Number(row?.matrixPreviewOrder ?? row?.previewOrder))
    ));
    if (anyHavePreviewOrder) {
      return [...rows].sort((a, b) => (
        Number(a?.matrixPreviewOrder ?? a?.previewOrder ?? 9999)
        - Number(b?.matrixPreviewOrder ?? b?.previewOrder ?? 9999)
      ));
    }

    const hasMatrixOrderedRows = rows.some((row) => (
      row?.isMatrixSplitTravel === true || row?.isMatrixPositioned === true
    ));
    if (hasMatrixOrderedRows) {
      return rows;
    }

    const parseStartMinutes = (value): number => {
      const raw = String(value || '').trim();
      if (!raw || raw === '--' || /manual override/i.test(raw) || raw === 'Not schedulable') {
        return Number.POSITIVE_INFINITY;
      }

      const startPart = raw.split('-')[0]?.trim() || raw;
      const match = startPart.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
      if (!match) return Number.POSITIVE_INFINITY;

      let hour = Number(match[1]);
      const minute = Number(match[2]);
      const ampm = match[3].toUpperCase();

      if (ampm === 'AM' && hour === 12) hour = 0;
      if (ampm === 'PM' && hour !== 12) hour += 12;

      return hour * 60 + minute;
    };

    const typePriority = (segment): number => {
      const rawType = String(segment?.type || segment?.itemType || '').toLowerCase();
      if (rawType === 'refreshment' || Number(segment?.item_type) === 1) return 0;
      if (rawType === 'travel' || Number(segment?.item_type) === 3) return 1;
      if (rawType === 'attraction' || Number(segment?.item_type) === 4) return 2;
      if (rawType === 'hotel' || Number(segment?.item_type) === 6) return 4;
      return 3;
    };

    return rows.sort((a, b) => {
      const startDiff = parseStartMinutes(a?.timeRange) - parseStartMinutes(b?.timeRange);
      if (startDiff !== 0) return startDiff;
      return typePriority(a) - typePriority(b);
    });
  }, [addHotspotModal.routeId, manualPreviewState, previewTimelinesByHotspot, selectedHotspotId]);

  const activePreviewResolution = useMemo(() => {
    if (manualPreviewState) {
      return manualPreviewState?.resolution || manualPreviewState || null;
    }
    if (groupPreviewResolution) return groupPreviewResolution;
    if (!selectedHotspotId) return null;
    return previewResolutionsByHotspot[selectedHotspotId] || null;
  }, [groupPreviewResolution, manualPreviewState, previewResolutionsByHotspot, selectedHotspotId]);

  const activePreviewValidation = useMemo(() => {
    return activePreviewResolution?.validation || null;
  }, [activePreviewResolution]);

  const normalizedDecision = useMemo(() => {
    return (activePreviewResolution as any)?.normalizedDecision
      || (activePreviewResolution as any)?.resolution?.normalizedDecision
      || (manualPreviewState as any)?.normalizedDecision
      || null;
  }, [activePreviewResolution, manualPreviewState]);

  const previewRemovedHotspotDetails = useMemo(() => {
    const rows = [
      ...(Array.isArray(activePreviewResolution?.removedHotspots) ? activePreviewResolution.removedHotspots : []),
      ...(Array.isArray(activePreviewResolution?.removedOptionalHotspots) ? activePreviewResolution.removedOptionalHotspots : []),
      ...(Array.isArray(activePreviewResolution?.removedTopPriorityHotspots) ? activePreviewResolution.removedTopPriorityHotspots : []),
      ...(Array.isArray((activePreviewResolution as any)?.changesRequiredDisplay?.removedItems)
        ? (activePreviewResolution as any).changesRequiredDisplay.removedItems
        : []),
    ];

    const seen = new Set<string>();

    return rows
      .map((row) => {
        const hotspotId = Number(
          row?.hotspotId ||
          row?.hotspot_ID ||
          row?.hotspot_id ||
          row?.locationId ||
          row?.id ||
          0,
        );
        const name = String(row?.name || row?.hotspotName || row?.hotspot_name || '').trim();
        const priorityValue = Number(
          row?.priority ||
          row?.workPriority ||
          row?.effectivePriority ||
          0,
        );
        const key = hotspotId > 0 ? String(hotspotId) : name.toLowerCase();

        return {
          hotspotId,
          key,
          name,
          priorityLabel: Number.isFinite(priorityValue) && priorityValue > 0
            ? `Work Priority ${priorityValue}`
            : String(row?.workPriorityLabel || row?.priorityLabel || '').trim() || null,
          workPriorityLabel: Number.isFinite(priorityValue) && priorityValue > 0
            ? `Work Priority ${priorityValue}`
            : String(row?.workPriorityLabel || '').trim() || null,
          reason: String(row?.fitFailureExplanation || row?.reason || row?.message || '').trim() || null,
          removalReasonCode: String(row?.removalReasonCode || '').trim() || null,
        };
      })
      .filter((row) => {
        if (!row.name || !row.key) return false;
        if (seen.has(row.key)) return false;
        seen.add(row.key);
        return true;
      });
  }, [activePreviewResolution]);

  const optionalPreviewRemovedHotspotDetails = useMemo(() => {
    const optionalRows = Array.isArray(activePreviewResolution?.removedOptionalHotspots)
      ? activePreviewResolution.removedOptionalHotspots
      : [];

    const optionalKeys = new Set(
      optionalRows.map((row) => {
        const hotspotId = Number(
          row?.hotspotId ||
          row?.hotspot_ID ||
          row?.hotspot_id ||
          row?.locationId ||
          row?.id ||
          0,
        );
        const name = String(row?.name || row?.hotspotName || row?.hotspot_name || '').trim().toLowerCase();
        return hotspotId > 0 ? String(hotspotId) : name;
      }),
    );

    return previewRemovedHotspotDetails.filter((row) => optionalKeys.has(row.key));
  }, [activePreviewResolution, previewRemovedHotspotDetails]);

  const pendingPriorityReplacementHotspotId = useMemo(() => {
    const needsReplacementApproval = (resolution): boolean => {
      if (!resolution) return false;
      const removedTopPriorityCount = Array.isArray(resolution?.removedTopPriorityHotspots)
        ? resolution.removedTopPriorityHotspots.length
        : 0;
      const affectedPriorityCount = Array.isArray(resolution?.topPriorityAffected)
        ? resolution.topPriorityAffected.length
        : 0;
      const p3Count = Array.isArray((resolution as any)?.p3HotspotsToRemove)
        ? (resolution as any).p3HotspotsToRemove.length
        : 0;
      return (
        removedTopPriorityCount > 0
        || affectedPriorityCount > 0
        || p3Count > 0
        || resolution?.requiresP3RemovalConfirmation === true
        || resolution?.validation?.requiresPriorityConfirmation === true
      );
    };

    const resolution = groupPreviewResolution || activePreviewResolution;
    if (!needsReplacementApproval(resolution)) return null;
    if (topPriorityReplacementApproved) return null;
    const fallbackHotspotId = selectedHotspotIds.length > 0
      ? selectedHotspotIds[selectedHotspotIds.length - 1]
      : null;
    return Number.isFinite(Number(fallbackHotspotId)) ? Number(fallbackHotspotId) : null;
  }, [activePreviewResolution, groupPreviewResolution, selectedHotspotIds, topPriorityReplacementApproved]);

  const pendingPriorityResolution = useMemo(() => {
    if (!pendingPriorityReplacementHotspotId) return null;
    return groupPreviewResolution || previewResolutionsByHotspot[pendingPriorityReplacementHotspotId] || null;
  }, [groupPreviewResolution, pendingPriorityReplacementHotspotId, previewResolutionsByHotspot]);

  // Scroll the confirm box into view when it appears
  useEffect(() => {
    if (pendingPriorityReplacementHotspotId && priorityConfirmRef.current) {
      priorityConfirmRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [pendingPriorityReplacementHotspotId]);

  const effectivePreviewTimeline = useMemo(() => {
    const enforceHotelOrderingSafety = (rows: any[]): any[] => {
      if (!Array.isArray(rows) || rows.length === 0) return rows;

      const isHotelLike = (row): boolean => {
        const type = String(row?.type || '').toLowerCase();
        const text = String(row?.text || row?.name || '').toLowerCase();
        return type === 'hotel' || Number(row?.item_type) === 6 || text.includes('check-in at hotel');
      };
      const isRouteContent = (row): boolean => {
        const type = String(row?.type || '').toLowerCase();
        return type === 'attraction' || type === 'travel' || Number(row?.item_type) === 3 || Number(row?.item_type) === 4;
      };

      const hotelIndex = rows.findIndex((row) => isHotelLike(row));
      if (hotelIndex < 0) return rows;

      const hasLaterRouteContent = rows.slice(hotelIndex + 1).some((row) => isRouteContent(row));
      if (!hasLaterRouteContent) return rows;

      const anyHavePreviewOrder = rows.some((row) => Number.isFinite(Number(row?.matrixPreviewOrder ?? row?.previewOrder)));
      if (!anyHavePreviewOrder) return rows;

      return [...rows].sort((a, b) => (
        Number(a?.matrixPreviewOrder ?? a?.previewOrder ?? 9999)
        - Number(b?.matrixPreviewOrder ?? b?.previewOrder ?? 9999)
      ));
    };

    const prunePrematureHotelTravelLegs = (rows: any[]): any[] => {
      if (!Array.isArray(rows) || rows.length === 0) return rows;

      const isTravel = (row): boolean => {
        const type = String(row?.type || '').toLowerCase();
        return type === 'travel' || Number(row?.item_type || 0) === 3 || Number(row?.item_type || 0) === 5;
      };
      const isAttraction = (row): boolean => {
        const type = String(row?.type || '').toLowerCase();
        return type === 'attraction' || Number(row?.item_type || 0) === 4;
      };
      const isHotelLike = (row): boolean => {
        const type = String(row?.type || '').toLowerCase();
        const text = String(row?.text || row?.name || '').toLowerCase();
        return type === 'hotel' || type === 'checkin' || Number(row?.item_type || 0) === 6 || text.includes('check-in at ');
      };
      const normalizeLabel = (value): string => String(value || '')
        .toLowerCase()
        .replace(/^travel\s+to\s+/i, '')
        .replace(/^check-?in\s+at\s+/i, '')
        .replace(/\s+/g, ' ')
        .trim();
      const parseStartMinutes = (value): number | null => {
        const raw = String(value || '').trim();
        if (!raw) return null;
        const startPart = raw.split('-')[0]?.trim() || raw;
        const match = startPart.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
        if (!match) return null;
        let h = Number(match[1]);
        const m = Number(match[2]);
        const ampm = String(match[3]).toUpperCase();
        if (ampm === 'AM' && h === 12) h = 0;
        if (ampm === 'PM' && h !== 12) h += 12;
        return (h * 60) + m;
      };
      const parseEndMinutes = (value): number | null => {
        const raw = String(value || '').trim();
        if (!raw || !raw.includes('-')) return null;
        const endPart = raw.split('-')[1]?.trim() || '';
        const match = endPart.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
        if (!match) return null;
        let h = Number(match[1]);
        const m = Number(match[2]);
        const ampm = String(match[3]).toUpperCase();
        if (ampm === 'AM' && h === 12) h = 0;
        if (ampm === 'PM' && h !== 12) h += 12;
        return (h * 60) + m;
      };

      const hotelIndex = rows.findIndex((row) => isHotelLike(row));
      if (hotelIndex <= 0) return rows;

      const hotelRow = rows[hotelIndex];
      const hotelNameFromCheckin = (() => {
        const text = String(hotelRow?.text || hotelRow?.name || '').trim();
        const match = text.match(/check-?in\s+at\s+(.+)/i);
        return String(match?.[1] || '').trim();
      })();
      const hotelLabel = normalizeLabel(hotelNameFromCheckin || hotelRow?.toName || hotelRow?.name || 'hotel');
      const hotelStart = parseStartMinutes(hotelRow?.timeRange);

      const lastAttractionBeforeHotel = (() => {
        for (let i = hotelIndex - 1; i >= 0; i -= 1) {
          if (isAttraction(rows[i])) return i;
        }
        return -1;
      })();

      const hotelTravelCandidates = rows
        .map((row, index: number) => ({ row, index }))
        .filter(({ row, index }) => {
          if (index >= hotelIndex || !isTravel(row)) return false;
          const target = normalizeLabel(row?.toName || row?.to || row?.text || row?.name);
          return target === hotelLabel;
        });

      if (hotelTravelCandidates.length <= 1) return rows;

      const keepIndex = (() => {
        const explicitMatrixHotelLeg = hotelTravelCandidates.find(({ row }) => (
          row?.isMatrixSplitTravel === true
          && String(row?.matrixTravelLeg || '').toUpperCase() === 'C_TO_B'
        ));
        if (explicitMatrixHotelLeg) {
          return explicitMatrixHotelLeg.index;
        }

        const valid = hotelTravelCandidates
          .map(({ row, index }) => {
            const endMin = parseEndMinutes(row?.timeRange);
            return { index, endMin };
          })
          .filter((entry) => hotelStart !== null && entry.endMin !== null && entry.endMin <= hotelStart);

        if (valid.length > 0) {
          return valid.sort((a, b) => Number(b.endMin || 0) - Number(a.endMin || 0))[0].index;
        }

        return hotelTravelCandidates[hotelTravelCandidates.length - 1].index;
      })();

      const dropSet = new Set<number>();
      for (const { index } of hotelTravelCandidates) {
        if (index !== keepIndex) dropSet.add(index);
        if (index < lastAttractionBeforeHotel && index !== keepIndex) dropSet.add(index);
      }

      const filteredRows = dropSet.size === 0
        ? rows
        : rows.filter((_, index: number) => !dropSet.has(index));

      // When we keep computed C->B leg, align hotel/check-in to the travel end in preview.
      const retainedTravel = filteredRows.find((row, index: number) => (
        isTravel(row)
        && normalizeLabel(row?.toName || row?.to || row?.text || row?.name) === hotelLabel
        && index < filteredRows.findIndex((candidate) => isHotelLike(candidate))
      ));
      const retainedRange = String(retainedTravel?.timeRange || '').trim();
      const retainedEndText = retainedRange.includes(' - ')
        ? String(retainedRange.split(' - ')[1] || '').trim()
        : '';

      if (!retainedEndText) return filteredRows;

      return filteredRows.map((row) => {
        if (!isHotelLike(row)) return row;
        return {
          ...row,
          timeRange: `${retainedEndText} - ${retainedEndText}`,
        };
      });
    };

    const applyBestSlotOrdering = (rows: any[]): any[] => {
      if (!Array.isArray(rows) || rows.length === 0 || !selectedHotspotId) return rows;

      // Backend-provided matrix split travel rows already represent the correct route shape.
      if (rows.some((row) => row?.isMatrixSplitTravel === true)) {
        return rows;
      }

      const fit = (activePreviewResolution as any)?.manualInsertionFit;
      const selectedIdNum = Number(selectedHotspotId);
      const fitBest = fit?.bestSlot || null;
      const fitChosen = fit?.chosenSlot || null;
      const chosenInvalid = Boolean(
        fitChosen
        && (Number(fitChosen?.fromHotspotId) === selectedIdNum || Number(fitChosen?.toHotspotId) === selectedIdNum),
      );
      const safeChosen = chosenInvalid ? null : fitChosen;
      const safeBest = (fitBest
        && Number(fitBest?.fromHotspotId) !== selectedIdNum
        && Number(fitBest?.toHotspotId) !== selectedIdNum)
        ? fitBest
        : null;

      const fromName = String(safeChosen?.fromName || safeBest?.fromName || '').trim();
      if (!fromName) return rows;

      const getSegHotspotId = (seg): number => Number(
        seg?.selectedHotspotId ??
        seg?.locationId ??
        seg?.hotspotId ??
        seg?.hotspot_ID ??
        seg?.hotspot_id ??
        0,
      );

      const selectedIdx = rows.findIndex((seg) => (
        String(seg?.type || '').toLowerCase() === 'attraction'
        && getSegHotspotId(seg) === selectedIdNum
      ));
      if (selectedIdx < 0) return rows;

      const fromIdx = rows.findIndex((seg) => (
        String(seg?.type || '').toLowerCase() === 'attraction'
        && String(seg?.text || '').trim() === fromName
      ));
      if (fromIdx < 0) return rows;

      const targetIdx = Math.min(fromIdx + 1, rows.length);
      if (targetIdx === selectedIdx || targetIdx === (selectedIdx + 1)) return rows;

      const reordered = [...rows];
      const [selectedSeg] = reordered.splice(selectedIdx, 1);
      const adjustedTargetIdx = selectedIdx < targetIdx ? targetIdx - 1 : targetIdx;
      reordered.splice(adjustedTargetIdx, 0, selectedSeg);
      return reordered;
    };

    const fit = (activePreviewResolution as any)?.manualInsertionFit
      || (groupPreviewResolution as any)?.manualInsertionFit
      || null;
    const resolvedLowPriorityPlan = fit?.lowPriorityRemovalPlanPreview?.resolved === true;
    const backendResolvedTimeline = Boolean(
      resolvedLowPriorityPlan
      || fit?.fullTimelineIsResolvedRemovalPlan === true
      || fit?.timelineSource === 'LOW_PRIORITY_REMOVAL_FINAL_TIMELINE',
    );
    const plannedRemovals: any[] = Array.isArray(fit?.lowPriorityRemovalPlanPreview?.plannedRemovals)
      ? fit.lowPriorityRemovalPlanPreview.plannedRemovals
      : [];

    const removePlannedRemovalRows = (rows: any[]): any[] => {
      const removedIds = new Set(
        plannedRemovals
          .map((row) => Number(row?.id || row?.hotspotId || row?.hotspot_ID || row?.locationId || 0))
          .filter((id: number) => Number.isFinite(id) && id > 0),
      );
      const removedNames = new Set(
        plannedRemovals
          .map((row) => String(row?.name || row?.hotspotName || '').trim().toLowerCase())
          .filter(Boolean),
      );

      return (rows || []).filter((row) => {
        const rowId = Number(row?.locationId || row?.hotspotId || row?.hotspot_ID || row?.hotspot_id || 0);
        const rowText = String(row?.text || row?.name || row?.to || row?.toName || '').trim().toLowerCase();

        if (rowId > 0 && removedIds.has(rowId)) return false;
        for (const removedName of removedNames) {
          if (removedName && rowText.includes(removedName)) return false;
        }
        return true;
      });
    };

    const sortByPreviewOrder = (rows: any[]): any[] => {
      if ((rows || []).some((row) => Number.isFinite(Number(row?.matrixPreviewOrder ?? row?.previewOrder)))) {
        return [...rows].sort((a, b) => (
          Number(a?.matrixPreviewOrder ?? a?.previewOrder ?? 9999)
          - Number(b?.matrixPreviewOrder ?? b?.previewOrder ?? 9999)
        ));
      }
      return rows;
    };

    if (backendResolvedTimeline && activePreviewTimeline.length > 0) {
      return prunePrematureHotelTravelLegs(
        enforceHotelOrderingSafety(
          sortByPreviewOrder(removePlannedRemovalRows(activePreviewTimeline)),
        ),
      );
    }

    if (activePreviewTimeline.length > 0) {
      const orderedTimeline = prunePrematureHotelTravelLegs(
        enforceHotelOrderingSafety(sortByPreviewOrder(activePreviewTimeline)),
      );
      const insertedIndex = orderedTimeline.findIndex((row) => Number(
        row?.selectedHotspotId
        ?? row?.locationId
        ?? row?.hotspotId
        ?? row?.hotspot_ID
        ?? row?.hotspot_id
        ?? 0,
      ) === Number(selectedHotspotId || 0));

      console.log('[ManualHotspotModal] rendering_order', orderedTimeline.map((row, index: number) => ({
        index,
        type: String(row?.type || '').toLowerCase(),
        text: String(row?.text || row?.name || ''),
        hotspotId: Number(row?.locationId || row?.hotspotId || row?.hotspot_ID || row?.hotspot_id || 0) || null,
        previewOrder: Number(row?.matrixPreviewOrder ?? row?.previewOrder ?? -1),
      })));
      console.log('[ManualHotspotModal] inserted_hotspot_position', {
        selectedHotspotId: Number(selectedHotspotId || 0),
        index: insertedIndex,
      });

      return orderedTimeline;
    }

    const activeAttractionCount = activePreviewTimeline.filter(
      (seg) => String(seg?.type || '').toLowerCase() === 'attraction',
    ).length;
    const selectedCount = selectedHotspotIds.length;
    const hasMatrixFit = Boolean(fit);
    const isMinimalPreview = activeAttractionCount <= Math.max(1, selectedCount + 1);
    const shouldMergeBaselineForMatrix = Boolean(
      hasMatrixFit
      && !backendResolvedTimeline
      && activePreviewTimeline.length > 0
      && isMinimalPreview,
    );

    // Some priority-confirmation previews return a minimal timeline (selected hotspot only).
    // In that case, show the default route timeline plus selected segments so users can review full context.
    const useMergedBaselineDuringPriorityConfirm = Boolean(
      pendingPriorityReplacementHotspotId
      && activePreviewTimeline.length > 0
      && activeAttractionCount <= Math.max(1, selectedCount + 1),
    );

    if (activePreviewTimeline.length > 0 && !useMergedBaselineDuringPriorityConfirm && !shouldMergeBaselineForMatrix) {
      return enforceHotelOrderingSafety(sortByPreviewOrder(activePreviewTimeline));
    }

    const merged = [...defaultPreviewTimeline, ...selectedPreviewSegments];

    const parseStartMinutes = (value): number => {
      const raw = String(value || '').trim();
      if (!raw || raw === '--') return Number.POSITIVE_INFINITY;

      const startPart = raw.split('-')[0]?.trim() || raw;
      const match = startPart.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
      if (!match) return Number.POSITIVE_INFINITY;

      let hour = Number(match[1]);
      const minute = Number(match[2]);
      const ampm = match[3].toUpperCase();

      if (ampm === 'AM' && hour === 12) hour = 0;
      if (ampm === 'PM' && hour !== 12) hour += 12;

      return hour * 60 + minute;
    };

    const sortedMerged = merged.sort((a, b) => parseStartMinutes(a?.timeRange) - parseStartMinutes(b?.timeRange));
    return enforceHotelOrderingSafety(applyBestSlotOrdering(sortedMerged));
  }, [
    activePreviewResolution,
    activePreviewTimeline,
    defaultPreviewTimeline,
    groupPreviewResolution,
    pendingPriorityReplacementHotspotId,
    selectedHotspotId,
    selectedHotspotIds.length,
    selectedPreviewSegments,
  ]);

  // ── Route-intelligence: manualInsertionFit from backend ─────────────────────
  const manualInsertionFit = useMemo(() => {
    return (activePreviewResolution as any)?.manualInsertionFit ?? null;
  }, [activePreviewResolution]);

  const matrixFit = useMemo(() => {
    return (activePreviewResolution as any)?.manualInsertionFit
      || (groupPreviewResolution as any)?.manualInsertionFit
      || null;
  }, [activePreviewResolution, groupPreviewResolution]);

  const activeManualOptimizer = useMemo(() => {
    return (activePreviewResolution as any)?.manualOptimizer
      || (activePreviewResolution as any)?.resolution?.manualOptimizer
      || null;
  }, [activePreviewResolution]);

  const manualAttemptDisplayMeta = useMemo(() => {
    const attempts = Array.isArray(activeManualOptimizer?.attempts) ? activeManualOptimizer.attempts : [];
    const authoritative = attempts.length > 0 && attempts.every((attempt) => (
      String(attempt?.source || '').toUpperCase() === 'REAL_CLUSTER_SIMULATION'
    ));
    const wrapperOnly = attempts.length > 0 && attempts.every((attempt) => (
      String(attempt?.source || '').toUpperCase() === 'CANDIDATE_WRAPPER'
    ));
    return { attempts, authoritative, wrapperOnly };
  }, [activeManualOptimizer]);

  const backendForceConflictState = useMemo(() => {
    const source = (activePreviewResolution as any)?.resolution || activePreviewResolution || null;
    return {
      canForceConflict: source?.canForceConflict === true,
      finalConflictModeOnly: source?.finalConflictModeOnly === true,
      selectedStrategyLabel: String(source?.selectedStrategyLabel || '').trim(),
    };
  }, [activePreviewResolution]);

  const destinationHotelDisplayName = useMemo(() => {
    const sanitize = (raw: unknown): string => {
      const value = String(raw || '').trim();
      if (!value) return '';
      const lower = value.toLowerCase();
      if (lower === 'hotel' || lower === 'no hotels available' || lower === 'hotel / route start') {
        return '';
      }
      return value;
    };

    const routeId = Number(addHotspotModal.routeId || 0);
    const routeDay = itinerary?.days?.find((day) => Number(day?.id) === routeId);
    const routeCheckin = Array.isArray(routeDay?.segments)
      ? [...routeDay!.segments].reverse().find((segment) => String(segment?.type || '').toLowerCase() === 'checkin')
      : null;
    const routeCheckinName = sanitize((routeCheckin as any)?.hotelName);
    if (routeCheckinName) return routeCheckinName;

    const selectedRouteHotelName = sanitize(
      (hotelDetails?.hotels || [])
        .filter((hotel) => Number(hotel?.itineraryRouteId) === routeId)
        .filter((hotel) => Number(hotel?.itineraryPlanHotelDetailsId || 0) > 0)
        .sort((a, b) => Number(b?.itineraryPlanHotelDetailsId || 0) - Number(a?.itineraryPlanHotelDetailsId || 0))
        .map((hotel) => hotel?.hotelName)
        .find((name) => sanitize(name).length > 0)
    );
    if (selectedRouteHotelName) return selectedRouteHotelName;

    const fitName = sanitize((matrixFit as any)?.destinationHotelName);
    if (fitName) return fitName;

    const hotelDetailsName = sanitize(
      hotelDetails?.hotels?.find((hotel) => Number(hotel?.itineraryRouteId) === routeId)?.hotelName
    );
    if (hotelDetailsName) return hotelDetailsName;

    const previewRows = Array.isArray(effectivePreviewTimeline)
      ? [...(effectivePreviewTimeline as any[])].reverse()
      : [];
    for (const row of previewRows) {
      const type = String(row?.type || '').toLowerCase();
      if (type !== 'hotel' && type !== 'checkin' && Number(row?.item_type) !== 6) {
        continue;
      }

      const rowName = sanitize(row?.hotelName || row?.toName || row?.to);
      if (rowName) return rowName;

      const rowText = String(row?.text || '').trim();
      const match = rowText.match(/check-?in\s+(?:to|at)\s+(.+)/i);
      const parsed = sanitize(match?.[1] || '');
      if (parsed) return parsed;
    }

    return '';
  }, [addHotspotModal.routeId, effectivePreviewTimeline, hotelDetails?.hotels, itinerary?.days, matrixFit]);

  const matrixBuildSuggestion = useMemo(() => {
    return (activePreviewResolution as any)?.missingMatrixBuildSuggestion
      || (activePreviewResolution as any)?.resolution?.missingMatrixBuildSuggestion
      || (groupPreviewResolution as any)?.missingMatrixBuildSuggestion
      || (groupPreviewResolution as any)?.resolution?.missingMatrixBuildSuggestion
      || null;
  }, [activePreviewResolution, groupPreviewResolution]);

  const hasValidChosenMatrixSlot = useMemo(() => {
    const chosen = matrixFit?.chosenSlot;
    if (!chosen) return false;
    const routeFitType = String(chosen?.routeFitType || '').toUpperCase();
    if (matrixFit?.destinationInsertionMode === true) {
      return (
        Number(chosen?.fromHotspotId || 0) > 0
        && ['DESTINATION_SIDE_INSERTION', 'MINOR_DETOUR'].includes(routeFitType)
      );
    }

    if (routeFitType === 'SINGLE_HOTSPOT_BEFORE') {
      return (
        matrixFit?.routeFitAvailable !== false
        && Number(chosen?.toHotspotId || 0) > 0
      );
    }

    if (routeFitType === 'SINGLE_HOTSPOT_AFTER') {
      return (
        matrixFit?.routeFitAvailable !== false
        && Number(chosen?.fromHotspotId || 0) > 0
      );
    }

    return (
      matrixFit?.routeFitAvailable !== false
      && ['ON_ROUTE', 'MINOR_DETOUR'].includes(routeFitType)
      && Number(chosen?.fromHotspotId || 0) > 0
      && Number(chosen?.toHotspotId || 0) > 0
    );
  }, [matrixFit]);

  const matrixFitAlreadyHasUsableData = useMemo(() => {
    const fit = matrixFit as any;
    const chosen = fit?.chosenSlot || fit?.bestSlot || null;
    const slotContext = String(chosen?.slotContext || '').toUpperCase();
    const routeFitType = String(chosen?.routeFitType || '').toUpperCase();

    return (
      fit?.requiresMatrixBuild !== true
      && (
        fit?.hasAnyMatrixData === true
        || fit?.hasFeasibleMatrixSlot === true
        || (
          fit?.cityEndpointInsertionMode === true
          && ['CITY_TO_CITY', 'CITY_TO_HOTSPOT', 'HOTSPOT_TO_CITY'].includes(slotContext)
          && ['ON_ROUTE', 'MINOR_DETOUR'].includes(routeFitType)
        )
      )
    );
  }, [matrixFit]);

  const deriveHotspotCityContext = useCallback((hotspot: AvailableHotspot): 'SOURCE_CITY' | 'DESTINATION_CITY' | 'UNKNOWN' => {
    const backend = String((hotspot as any)?.cityContext || '').trim().toUpperCase();
    if (backend === 'SOURCE_CITY' || backend === 'DESTINATION_CITY') {
      return backend;
    }

    const sourceKey = String(
      hotspotFilterMeta?.sourceCityKey ||
      currentRouteForModal?.departure ||
      addHotspotModal.locationName ||
      '',
    ).trim().toLowerCase();
    const destinationKey = String(
      hotspotFilterMeta?.destinationCityKey ||
      currentRouteForModal?.arrival ||
      '',
    ).trim().toLowerCase();
    const hay = `${String(hotspot?.locationMap || '')} ${String(hotspot?.name || '')}`.toLowerCase();

    if (destinationKey && hay.includes(destinationKey)) return 'DESTINATION_CITY';
    if (sourceKey && hay.includes(sourceKey)) return 'SOURCE_CITY';
    return 'UNKNOWN';
  }, [
    hotspotFilterMeta?.destinationCityKey,
    hotspotFilterMeta?.sourceCityKey,
    currentRouteForModal?.arrival,
    currentRouteForModal?.departure,
    addHotspotModal.locationName,
  ]);

  const activePreviewHotspot = useMemo(
    () => availableHotspots.find((h) => Number(h.id) === Number(activePreviewHotspotId || 0)) || null,
    [availableHotspots, activePreviewHotspotId],
  );

  const selectedPreviewCityContext = useMemo(() => {
    const backend = String(manualPreviewState?.manualInsertionFit?.hotspotCityContext || '').trim().toUpperCase();
    if (backend === 'SOURCE_CITY' || backend === 'DESTINATION_CITY') {
      return backend as 'SOURCE_CITY' | 'DESTINATION_CITY';
    }
    if (!activePreviewHotspot) return null;
    return deriveHotspotCityContext(activePreviewHotspot);
  }, [manualPreviewState?.manualInsertionFit?.hotspotCityContext, activePreviewHotspot, deriveHotspotCityContext]);

  const isDestinationSideManualPreview = useMemo(() => {
    const sources: any[] = [
      matrixFit,
      manualPreviewState,
      activePreviewResolution,
      (activePreviewResolution as any)?.manualInsertionFit,
      (activePreviewResolution as any)?.resolution?.manualInsertionFit,
      groupPreviewResolution,
      (groupPreviewResolution as any)?.manualInsertionFit,
      (groupPreviewResolution as any)?.resolution?.manualInsertionFit,
      (matrixFit as any)?.chosenSlot,
      (matrixFit as any)?.bestSlot,
      (matrixFit as any)?.requestedSlot,
      (activePreviewResolution as any)?.manualInsertionFit?.chosenSlot,
      (activePreviewResolution as any)?.manualInsertionFit?.bestSlot,
      (activePreviewResolution as any)?.resolution?.manualInsertionFit?.chosenSlot,
      (activePreviewResolution as any)?.resolution?.manualInsertionFit?.bestSlot,
    ];

    return (
      selectedPreviewCityContext === 'DESTINATION_CITY'
      || sources.some((source) => {
        const code = String(source?.code || '').toUpperCase();
        const reason = String(source?.validation?.reason || source?.reason || '').toUpperCase();
        const cityContext = String(source?.hotspotCityContext || '').toUpperCase();
        const slotSource = String(source?.source || '').toUpperCase();
        const routeFitType = String(source?.routeFitType || '').toUpperCase();
        const slotContext = String(source?.slotContext || '').toUpperCase();

        return (
          source?.destinationInsertionMode === true
          || cityContext === 'DESTINATION_CITY'
          || code === 'MANUAL_HOTSPOT_DESTINATION_INSERT_PREVIEW_READY'
          || code === 'DESTINATION_SIDE_MATRIX_NOT_REQUIRED'
          || reason === 'DESTINATION_SIDE_MATRIX_NOT_REQUIRED'
          || slotSource === 'DESTINATION_CITY_AFTER_REACHED'
          || slotSource === 'DESTINATION_CITY_REACHED_TO_HOTEL'
          || slotSource === 'DESTINATION_CITY_ENDPOINT'
          || routeFitType === 'DESTINATION_SIDE_INSERTION'
          || slotContext === 'DESTINATION_CITY_TO_HOTEL'
        );
      })
    );
  }, [
    matrixFit,
    manualPreviewState,
    activePreviewResolution,
    groupPreviewResolution,
    selectedPreviewCityContext,
  ]);

  const matrixRequiresBuild = useMemo(() => {
    if (!matrixFit) return false;
    if (isDestinationSideManualPreview) return false;
    if (matrixFit?.destinationInsertionMode === true) return false;
    if (matrixFit?.singleHotspotInsertionMode === true) return false;
    if (matrixFit?.emptyRouteInsertionMode === true) return false;

    const chosenRouteFitType = String(matrixFit?.chosenSlot?.routeFitType || '').toUpperCase();
    if (chosenRouteFitType === 'SINGLE_HOTSPOT_BEFORE' || chosenRouteFitType === 'SINGLE_HOTSPOT_AFTER') {
      return false;
    }

    return matrixFit?.requiresMatrixBuild === true || matrixFit?.routeFitAvailable === false;
  }, [isDestinationSideManualPreview, matrixFit]);

  const isMatrixMissingBlockedState = useMemo(() => {
    if (isDestinationSideManualPreview) {
      return false;
    }

    const matrixCode = String(matrixFit?.code || '').toUpperCase();
    const previewCode = String((activePreviewResolution as any)?.code || '').toUpperCase();
    const previewBlockReason = String((activePreviewResolution as any)?.previewBlockReason || '').toUpperCase();
    const validationReason = String(activePreviewValidation?.reason || '').toUpperCase();

    const matrixAlreadyBuiltButNotFeasible =
      matrixCode === 'MANUAL_HOTSPOT_NO_FEASIBLE_ROUTE_SLOT'
      || previewCode === 'MANUAL_HOTSPOT_NO_FEASIBLE_ROUTE_SLOT'
      || previewBlockReason === 'NO_FEASIBLE_ROUTE_SLOT'
      || validationReason === 'NO_FEASIBLE_ROUTE_SLOT'
      || (
        matrixFit?.requiresMatrixBuild !== true
        && matrixFit?.hasAnyMatrixData === true
        && matrixFit?.hasFeasibleMatrixSlot === false
      );

    if (matrixAlreadyBuiltButNotFeasible) {
      return false;
    }

    if (matrixFitAlreadyHasUsableData) {
      return false;
    }

    const decisionStatus = String(normalizedDecision?.decisionStatus || '').toUpperCase();

    const previewSaysMatrixMissing =
      validationReason === 'MATRIX_DATA_MISSING'
      || decisionStatus === 'MATRIX_UNAVAILABLE'
      || previewCode === 'MANUAL_HOTSPOT_MATRIX_DATA_MISSING'
      || previewCode === 'MATRIX_DATA_MISSING'
      || previewBlockReason === 'MATRIX_MISSING'
      || String((groupPreviewResolution as any)?.code || '').toUpperCase() === 'MANUAL_HOTSPOT_MATRIX_DATA_MISSING'
      || String((groupPreviewResolution as any)?.code || '').toUpperCase() === 'MATRIX_DATA_MISSING'
      || String((groupPreviewResolution as any)?.previewBlockReason || '').toUpperCase() === 'MATRIX_MISSING';

    if (!matrixFit) return previewSaysMatrixMissing;

    if (matrixFit?.destinationInsertionMode === true && !previewSaysMatrixMissing) {
      return false;
    }

    return (
      matrixFit?.requiresMatrixBuild === true
      || matrixCode === 'MANUAL_HOTSPOT_MATRIX_DATA_MISSING'
      || matrixCode === 'MATRIX_DATA_MISSING'
      || previewSaysMatrixMissing
    );
  }, [
    activePreviewResolution,
    activePreviewValidation?.reason,
    groupPreviewResolution,
    isDestinationSideManualPreview,
    matrixFit,
    matrixFitAlreadyHasUsableData,
    normalizedDecision,
  ]);

  const isMatrixBuiltButNoFeasibleSlot = useMemo(() => {
    if (isDestinationSideManualPreview) {
      return false;
    }

    const previewCode = String((activePreviewResolution as any)?.code || '').toUpperCase();
    const unscheduledReason = String(
      (activePreviewResolution as any)?.resolution?.unscheduledManualHotspots?.[0]?.reason
      || (activePreviewResolution as any)?.unscheduledManualHotspots?.[0]?.reason
      || '',
    ).toUpperCase();

    const schedulerProducedFinalFitFailure =
      previewCode === 'MANUAL_HOTSPOT_CANNOT_FIT'
      || unscheduledReason.includes('OPENING HOURS')
      || unscheduledReason.includes('ROUTE TIME WINDOW');

    if (schedulerProducedFinalFitFailure) {
      return false;
    }

    return (
      matrixFit?.code === 'MANUAL_HOTSPOT_NO_FEASIBLE_ROUTE_SLOT'
      || (activePreviewResolution as any)?.code === 'MANUAL_HOTSPOT_NO_FEASIBLE_ROUTE_SLOT'
      || (activePreviewResolution as any)?.previewBlockReason === 'NO_FEASIBLE_ROUTE_SLOT'
      || (groupPreviewResolution as any)?.code === 'MANUAL_HOTSPOT_NO_FEASIBLE_ROUTE_SLOT'
      || (groupPreviewResolution as any)?.previewBlockReason === 'NO_FEASIBLE_ROUTE_SLOT'
      || (
        matrixFit?.requiresMatrixBuild !== true
        && matrixFit?.hasAnyMatrixData === true
        && matrixFit?.hasFeasibleMatrixSlot === false
      )
    );
  }, [activePreviewResolution, groupPreviewResolution, isDestinationSideManualPreview, matrixFit]);

  const shouldShowBuildMatrixButton = useMemo(() => {
    if (isDestinationSideManualPreview) {
      return false;
    }

    if (isMatrixBuiltButNoFeasibleSlot) {
      return false;
    }

    if (matrixFitAlreadyHasUsableData) {
      return false;
    }

    const validationReason = String(activePreviewValidation?.reason || '').toUpperCase();
    const decisionStatus = String(normalizedDecision?.decisionStatus || '').toUpperCase();

    return (
      isMatrixMissingBlockedState
      || validationReason === 'MATRIX_DATA_MISSING'
      || decisionStatus === 'MATRIX_UNAVAILABLE'
      || (activePreviewResolution as any)?.canBuildMatrix === true
      || (matrixFit as any)?.canBuildMatrix === true
      || String((activePreviewResolution as any)?.code || '').toUpperCase() === 'MANUAL_HOTSPOT_MATRIX_DATA_MISSING'
      || String((activePreviewResolution as any)?.code || '').toUpperCase() === 'MATRIX_DATA_MISSING'
      || String((activePreviewResolution as any)?.previewBlockReason || '').toUpperCase() === 'MATRIX_MISSING'
    );
  }, [
    activePreviewResolution,
    activePreviewValidation?.reason,
    isDestinationSideManualPreview,
    isMatrixBuiltButNoFeasibleSlot,
    isMatrixMissingBlockedState,
    matrixFitAlreadyHasUsableData,
    matrixFit,
    normalizedDecision,
  ]);

  const previewValidationReasonText = useMemo(() => {
    const previewCode = String((activePreviewResolution as any)?.code || '').toUpperCase();
    const unscheduledReason = String(
      (activePreviewResolution as any)?.resolution?.unscheduledManualHotspots?.[0]?.reason
      || (activePreviewResolution as any)?.unscheduledManualHotspots?.[0]?.reason
      || '',
    ).trim();

    if (previewCode === 'MANUAL_HOTSPOT_CANNOT_FIT' && unscheduledReason) {
      return unscheduledReason;
    }

    if (normalizedDecision?.primaryMessage) {
      return String(normalizedDecision.primaryMessage);
    }
    const reason = String(activePreviewValidation?.reason || '').toUpperCase();
    if (reason === 'NO_FEASIBLE_ROUTE_SLOT') {
      const manualRelaxedRouteFit =
        isManualRelaxedRouteFitPolicy(manualPreviewState)
        || isManualRelaxedRouteFitPolicy(activePreviewResolution)
        || isManualRelaxedRouteFitPolicy(groupPreviewResolution);

      return manualRelaxedRouteFit
        ? 'This hotspot adds extra distance/off-route travel. Manual add allows this when the rebuilt day still finishes within the allowed timing window.'
        : 'Matrix data exists, but this hotspot is off-route or backtracking for all current route segments.';
    }
    if (reason === 'MATRIX_DATA_MISSING') {
      return 'Route-fit matrix data is missing for the selected hotspot and current route.';
    }
    if (reason === 'OSRM_ROUTE_CHECK_FAILED') {
      return 'OSRM route validation failed while checking the source-city route anchor.';
    }
    const baseReason = activePreviewValidation?.reason || 'The rebuilt timeline still has timing, distance, or operating-window conflicts for this manual hotspot.';
    const matrixDestinationName = String((matrixFit as any)?.destinationHotelName || '').trim();
    if (!destinationHotelDisplayName || !matrixDestinationName) {
      return baseReason;
    }
    const escapedDestinationName = matrixDestinationName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return String(baseReason).replace(new RegExp(escapedDestinationName, 'gi'), destinationHotelDisplayName);
  }, [activePreviewResolution, activePreviewValidation, destinationHotelDisplayName, matrixFit, normalizedDecision, manualPreviewState, groupPreviewResolution]);

  const matrixApplyBlocked = useMemo(() => {
    const decisionStatus = String(normalizedDecision?.decisionStatus || '').toUpperCase();
    if (decisionStatus === 'UNSCHEDULABLE_FOR_DAY' || decisionStatus === 'MATRIX_UNAVAILABLE') {
      return true;
    }

    if (!matrixFit) return false;

    const manualRelaxedRouteFit =
      isManualRelaxedRouteFitPolicy(manualPreviewState)
      || isManualRelaxedRouteFitPolicy(activePreviewResolution)
      || isManualRelaxedRouteFitPolicy(groupPreviewResolution);

    if (matrixFit?.destinationInsertionMode === true) {
      return matrixFit?.canApply === false;
    }

    const canBypassMatrixApplyForManualRouteFit =
      manualRelaxedRouteFit
      && isMatrixBuiltButNoFeasibleSlot;

    return (
      isMatrixMissingBlockedState
      || (!manualRelaxedRouteFit && isMatrixBuiltButNoFeasibleSlot)
      || (
        matrixFit?.canApply === false
        && !canBypassMatrixApplyForManualRouteFit
      )
    );
  }, [
    isMatrixBuiltButNoFeasibleSlot,
    isMatrixMissingBlockedState,
    matrixFit,
    normalizedDecision,
    manualPreviewState,
    activePreviewResolution,
    groupPreviewResolution,
  ]);

  const decisionStatus = useMemo(() => {
    return String(normalizedDecision?.decisionStatus || '').toUpperCase();
  }, [normalizedDecision]);

  const confirmActionConfig = useMemo(() => {
    if (decisionStatus === 'MATRIX_UNAVAILABLE') {
      return { label: 'Build Matrix First', disabled: true };
    }
    if (decisionStatus === 'UNSCHEDULABLE_FOR_DAY') {
      return { label: 'Cannot Add', disabled: true };
    }
    if (decisionStatus === 'OFF_ROUTE' || decisionStatus === 'BACKTRACK') {
      const manualRelaxedRouteFit =
        isManualRelaxedRouteFitPolicy(manualPreviewState)
        || isManualRelaxedRouteFitPolicy(activePreviewResolution)
        || isManualRelaxedRouteFitPolicy(groupPreviewResolution);
      return manualRelaxedRouteFit
        ? { label: 'Confirm Add Hotspot', disabled: false }
        : { label: 'Cannot Add - Off Route', disabled: true };
    }
    if (decisionStatus === 'NEEDS_RESCHEDULE') {
      return { label: 'Add with Reschedule', disabled: false };
    }
    return { label: 'Confirm Add Hotspot', disabled: false };
  }, [decisionStatus, manualPreviewState, activePreviewResolution, groupPreviewResolution]);

  const insertionDecisionSummary = useMemo(() => {
    if (!activePreviewHotspotId || !matrixFit) return null;
    const canProceedWithReschedule = (
      activePreviewValidation?.readyToApply === false
      && activePreviewValidation?.requiresPriorityConfirmation !== true
      && !matrixApplyBlocked
    );
    if (matrixRequiresBuild || isMatrixMissingBlockedState) {
      return {
        willInsert: false,
        text: 'Will not be inserted: route-fit matrix is missing.',
      };
    }
    if (isMatrixBuiltButNoFeasibleSlot) {
      const manualRelaxedRouteFit =
        isManualRelaxedRouteFitPolicy(manualPreviewState)
        || isManualRelaxedRouteFitPolicy(activePreviewResolution)
        || isManualRelaxedRouteFitPolicy(groupPreviewResolution);
      return {
        willInsert: manualRelaxedRouteFit,
        text: manualRelaxedRouteFit
          ? 'Can be inserted manually. This adds extra distance/off-route travel, but timing will decide final fit.'
          : 'Will not be inserted: hotspot is off-route/backtracking for current route.',
      };
    }
    if (canProceedWithReschedule) {
      const routeEndOverflowMinutes = Number(activePreviewValidation?.routeEndOverflowMinutes || 0);
      const hasOpeningOrTimingConflict = hasManualOpeningOrTimingConflict(activePreviewValidation);

      if (routeEndOverflowMinutes > 0) {
        return {
          willInsert: false,
          text: `Cannot insert normally because the rebuilt route exceeds the allowed manual day end by ${routeEndOverflowMinutes} minutes.`,
        };
      }

      if (hasOpeningOrTimingConflict) {
        return {
          willInsert: false,
          text: 'Route-fit slot found, but the hotspot conflicts with opening/timing rules. Use force add only if you want to keep it as a conflict.',
        };
      }

      return {
        willInsert: true,
        text: 'Route-fit slot found. Timeline can be recalculated within the manual timing window.',
      };
    }
    if (matrixApplyBlocked || activePreviewValidation?.readyToApply === false) {
      return {
        willInsert: false,
        text: 'Will not be inserted: current preview is not ready to apply.',
      };
    }
    return {
      willInsert: true,
      text: 'Will be inserted when you click Add hotspot.',
    };
  }, [
    activePreviewHotspotId,
    isMatrixBuiltButNoFeasibleSlot,
    isMatrixMissingBlockedState,
    matrixApplyBlocked,
    matrixFit,
    matrixRequiresBuild,
    manualPreviewState,
    activePreviewResolution,
    groupPreviewResolution,
    activePreviewValidation,
  ]);

  const resolvedRemovalTimelineLeak = useMemo(() => {
    const resolved = (matrixFit as any)?.lowPriorityRemovalPlanPreview?.resolved === true;
    if (!resolved || !Array.isArray(effectivePreviewTimeline) || effectivePreviewTimeline.length === 0) return false;

    const plannedRemovals: any[] = Array.isArray((matrixFit as any)?.lowPriorityRemovalPlanPreview?.plannedRemovals)
      ? (matrixFit as any).lowPriorityRemovalPlanPreview.plannedRemovals
      : [];
    if (plannedRemovals.length === 0) return false;

    const removedIds = new Set(
      plannedRemovals
        .map((row) => Number(row?.id || row?.hotspotId || row?.hotspot_ID || row?.locationId || 0))
        .filter((id: number) => Number.isFinite(id) && id > 0),
    );
    const removedNames = new Set(
      plannedRemovals
        .map((row) => String(row?.name || row?.hotspotName || '').trim().toLowerCase())
        .filter(Boolean),
    );

    return effectivePreviewTimeline.some((row) => {
      const rowId = Number(row?.locationId || row?.hotspotId || row?.hotspot_ID || row?.hotspot_id || 0);
      const rowText = String(row?.text || row?.name || row?.to || row?.toName || '').trim().toLowerCase();
      if (rowId > 0 && removedIds.has(rowId)) return true;
      for (const removedName of removedNames) {
        if (removedName && rowText.includes(removedName)) return true;
      }
      return false;
    });
  }, [effectivePreviewTimeline, matrixFit]);

  const safeMatrixSlots = useMemo(() => {
    const selectedIdNum = Number(selectedHotspotId || 0);
    const allSlots: any[] = Array.isArray(matrixFit?.allSlotResults)
      ? matrixFit.allSlotResults
      : [];
    return allSlots.filter((slot) => (
      Number(slot?.fromHotspotId) !== selectedIdNum
      && Number(slot?.toHotspotId) !== selectedIdNum
    ));
  }, [matrixFit, selectedHotspotId]);

  const effectiveFitSlot = useMemo(() => {
    if (matrixRequiresBuild) return null;
    if (!matrixFit) return null;
    const selectedIdNum = Number(selectedHotspotId || 0);
    const chosen = (matrixFit as any)?.chosenSlot ?? null;
    const best = (matrixFit as any)?.bestSlot ?? null;

    const isInvalid = (slot): boolean => {
      if (!slot) return true;
      return Number(slot?.fromHotspotId) === selectedIdNum || Number(slot?.toHotspotId) === selectedIdNum;
    };

    if (!isInvalid(chosen)) return chosen;
    if (!isInvalid(best)) return best;

    return safeMatrixSlots.find((slot) => !isInvalid(slot)) || null;
  }, [matrixFit, matrixRequiresBuild, safeMatrixSlots, selectedHotspotId]);

  /** Helper: map route_fit_type to Tailwind badge classes */
  const routeFitBadgeClass = (routeFitType: string | undefined): string => {
    switch (routeFitType) {
      case 'ON_ROUTE':    return 'bg-green-100 text-green-800';
      case 'MINOR_DETOUR': return 'bg-amber-100 text-amber-700';
      case 'BACKTRACK':   return 'bg-orange-100 text-orange-700';
      case 'OFF_ROUTE':   return 'bg-red-100 text-red-700';
      case 'DESTINATION_SIDE_INSERTION': return 'bg-blue-100 text-blue-700';
      case 'MATRIX_UNAVAILABLE': return 'bg-gray-100 text-gray-600';
      default:            return 'bg-gray-100 text-gray-500';
    }
  };

  const normalizedInsertionSlots = useMemo(() => {
    const isDestinationSidePreview =
      (matrixFit as any)?.destinationInsertionMode === true
      || String(manualPreviewState?.manualInsertionFit?.hotspotCityContext || '').trim().toUpperCase() === 'DESTINATION_CITY';

    const rawSlots = Array.isArray(matrixFit?.allSlotResults) && matrixFit.allSlotResults.length > 0
      ? matrixFit.allSlotResults
      : (Array.isArray(activePreviewResolution?.slotInsights)
        ? activePreviewResolution.slotInsights
        : (Array.isArray(activePreviewResolution?.allInsertionSlots)
          ? activePreviewResolution.allInsertionSlots
          : []));

    if (rawSlots.length === 0) return [];

    const stopNames: string[] = [];

    const requestedFrom = String(selectedHotspotAnchor?.anchorFrom || '').trim();
    if (requestedFrom) {
      stopNames.push(requestedFrom);
    }

    for (const seg of effectivePreviewTimeline as any[]) {
      const type = String(seg?.type || '').toLowerCase();
      const hotspotId = Number(seg?.hotspotId ?? seg?.locationId ?? seg?.hotspot_ID ?? 0);

      if (type === 'attraction' && hotspotId === Number(selectedHotspotId || 0)) {
        continue;
      }

      let label = '';
      if (type === 'attraction') {
        label = String(seg?.text || seg?.name || '').trim();
      } else if (type === 'hotel' || type === 'checkin') {
        label = String(seg?.hotelName || seg?.toName || '').trim() || destinationHotelDisplayName || 'Hotel';
      }

      if (!label) continue;
      if (stopNames[stopNames.length - 1] === label) continue;
      stopNames.push(label);
    }

    // Determine which slotIndex is best from matrix-fit payload
    const bestSlotIndex: number | null = matrixFit?.bestSlot?.slotIndex ?? null;

    return rawSlots.map((slot, index: number) => {
      const fromName = slot?.fromName || stopNames[index] || `Stop ${index + 1}`;
      const rawToName = String(slot?.toName || stopNames[index + 1] || 'Destination').trim();
      const matrixDestinationName = String((matrixFit as any)?.destinationHotelName || '').trim().toLowerCase();
      const toName = (
        isDestinationSidePreview
        && destinationHotelDisplayName
        && (
          /^hotel$/i.test(rawToName)
          || (matrixDestinationName.length > 0 && rawToName.toLowerCase() === matrixDestinationName)
          || Number(slot?.destinationHotelId || 0) > 0
        )
      )
        ? destinationHotelDisplayName
        : rawToName;

      // ── From manualInsertionFit.allSlotResults ──
      const routeFitType: string = slot?.routeFitType || '';
      const routeFitStatus: string = String(slot?.routeFitStatus || routeFitType || '').toUpperCase();
      const routeFitLabel: string = slot?.label || '';
      const routeFitDisplayLabel: string = slot?.displayLabel || routeFitLabel;
      const routeFitShortLabel: string = slot?.shortLabel || routeFitDisplayLabel || routeFitLabel;
      const roadDetourKm: number | null = slot?.roadDetourKm != null ? Number(slot.roadDetourKm) : null;
      const isZeroExtraDetour: boolean = slot?.isZeroExtraDetour === true || (roadDetourKm != null && roadDetourKm <= 0.5);
      const distanceComparisonNote: string | null = slot?.distanceComparisonNote ?? null;
      const routeDecisionReason: string | null = slot?.routeDecisionReason ?? null;
      const timingDecisionReason: string | null = slot?.timingDecisionReason ?? null;
      const priorityDecisionReason: string | null = slot?.priorityDecisionReason ?? null;
      const finalDecisionReason: string | null = slot?.finalDecisionReason ?? null;
      const routePossible: boolean = slot?.routePossible !== false;
      const timingPossible: boolean = slot?.timingPossible === true;
      const prioritySafe: boolean = slot?.prioritySafe !== false;

      // Legacy fallback fields
      const metricsSource = String(slot?.routeMetrics?.source || 'NONE').toUpperCase();
      const hasTrustedMetrics = metricsSource === 'MATRIX_CACHE';
      const directKmRaw = hasTrustedMetrics ? slot?.routeMetrics?.directKm : null;
      const viaKmRaw = hasTrustedMetrics ? slot?.routeMetrics?.viaKm : null;
      const extraKmRaw = hasTrustedMetrics ? slot?.routeMetrics?.extraKm : null;
      const directKm: number = Number(directKmRaw ?? slot?.directKm ?? slot?.abOsrmDistanceKm ?? 0);
      const distanceDeltaRaw: number = roadDetourKm != null ? roadDetourKm : Number(slot?.distanceDelta || 0);
      const distanceDelta: number = Math.max(0, Number.isFinite(distanceDeltaRaw) ? distanceDeltaRaw : 0);
      const viaKm: number = Number(viaKmRaw ?? slot?.insertedRouteDistanceKm ?? slot?.viaKm ?? (directKm + distanceDelta));
      const normalizedDisplayLabel = (routeFitStatus === 'MATRIX_UNAVAILABLE' || routeFitStatus === 'NO_ROUTE_DATA')
        ? 'Route data unavailable for this slot'
        : routeFitDisplayLabel;

      const isFeasibleType = routeFitType === 'ON_ROUTE' || routeFitType === 'MINOR_DETOUR';
      const fitsOverall: boolean = routeFitType
        ? isFeasibleType
        : slot?.fitsOverall !== false;
      const isBest = !matrixRequiresBuild && (bestSlotIndex != null
        ? (slot?.slotIndex === bestSlotIndex || index === bestSlotIndex)
        : slot?.isBest === true);

      return {
        ...slot,
        slot: `${fromName} → ${toName}`,
        fromName,
        toName,
        directKm,
        viaKm,
        distanceDelta,
        routeFitType,
        routeFitStatus,
        routeFitLabel,
        displayLabel: normalizedDisplayLabel,
        shortLabel: routeFitShortLabel,
        roadDetourKm,
        isZeroExtraDetour,
        distanceComparisonNote,
        routeDecisionReason,
        timingDecisionReason,
        priorityDecisionReason,
        finalDecisionReason,
        proposedTimeRange: slot?.proposedTimeRange || null,
        operatingHours: slot?.operatingHours || null,
        fitsTiming: timingPossible,
        fitsOverall,
        isBest: matrixRequiresBuild ? false : (slot?.selectedAsBest === true || isBest),
        routePossible,
        timingPossible,
        prioritySafe,
        selectedAsBest: matrixRequiresBuild ? false : (slot?.selectedAsBest === true || isBest),
        attempted: slot?.attempted === true || true,
        timingReason: timingDecisionReason || slot?.timingReason || slot?.reason || routeDecisionReason || null,
        routeMetrics: {
          directKm: hasTrustedMetrics ? Number(directKmRaw ?? directKm) : null,
          viaKm: hasTrustedMetrics ? Number(viaKmRaw ?? viaKm) : null,
          extraKm: hasTrustedMetrics ? Number(extraKmRaw ?? distanceDelta) : null,
          source: metricsSource,
        },
      };
    });
  }, [
    activePreviewResolution,
    effectivePreviewTimeline,
    selectedHotspotAnchor,
    selectedHotspotId,
    matrixFit,
    matrixRequiresBuild,
    destinationHotelDisplayName,
    manualPreviewState?.manualInsertionFit?.hotspotCityContext,
  ]);
  // ─────────────────────────────────────────────────────────────────────────────

  const activeAnchorFitInsight = useMemo(() => {
    if (matrixRequiresBuild) return null;
    const bestSlot = normalizedInsertionSlots.find((slot) => slot?.isBest)
      || normalizedInsertionSlots[0]
      || null;
    const routeId = Number(addHotspotModal.routeId || 0);
    if (!routeId || !selectedHotspotId) return null;

    // Prefer matrix-fit chosen/best slot for inserted-hotspot labels.
    const fitBest = (matrixFit as any)?.bestSlot ?? null;
    const fitChosen = (matrixFit as any)?.chosenSlot ?? null;
    const selectedIdNum = Number(selectedHotspotId || 0);
    const chosenInvalid = Boolean(
      fitChosen
      && (Number(fitChosen?.fromHotspotId) === selectedIdNum || Number(fitChosen?.toHotspotId) === selectedIdNum),
    );
    const safeChosen = chosenInvalid ? null : fitChosen;
    const sourceSlot = safeChosen || fitBest;

    if (sourceSlot) {
      const fitType: string = sourceSlot.routeFitType || '';
      const fitTypeUpper = String(fitType || '').toUpperCase();
      const sourceLabelText = String(sourceSlot.displayLabel || sourceSlot.label || '').toLowerCase();
      const sourceFinalReasonText = String(sourceSlot.finalDecisionReason || '').toLowerCase();
      const sourceNoRouteTagged = sourceLabelText.includes('no route data')
        || sourceFinalReasonText.includes('no route data');
      const hasRouteDataForSlot = (
        sourceSlot?.routePossible !== false
        && fitTypeUpper !== 'UNKNOWN'
        && fitTypeUpper !== 'MATRIX_UNAVAILABLE'
        && !sourceNoRouteTagged
      );
      const label: string = sourceSlot.displayLabel || sourceSlot.label || fitType;
      const detour: number | null = sourceSlot.roadDetourKm != null ? Number(sourceSlot.roadDetourKm) : null;
      const isDestinationSidePreview = String((manualPreviewState as any)?.manualInsertionFit?.hotspotCityContext || '').trim().toUpperCase() === 'DESTINATION_CITY';
      const rawToName = String(sourceSlot?.toName || '').trim();
      const matrixDestinationName = String((matrixFit as any)?.destinationHotelName || '').trim().toLowerCase();
      const resolvedToName = (
        isDestinationSidePreview
        && destinationHotelDisplayName
        && (
          /^hotel$/i.test(rawToName)
          || (matrixDestinationName.length > 0 && rawToName.toLowerCase() === matrixDestinationName)
          || Number(sourceSlot?.destinationHotelId || 0) > 0
        )
      ) ? destinationHotelDisplayName : rawToName;
      const tone = fitType === 'ON_ROUTE' || fitType === 'MINOR_DETOUR'
        ? 'green' as const
        : fitType === 'BACKTRACK'
          ? 'amber' as const
          : 'red' as const;
      const hasNamedAnchors = String(sourceSlot?.fromName || '').trim().length > 0
        && String(resolvedToName || '').trim().length > 0;
      const between = hasNamedAnchors ? `${sourceSlot.fromName} → ${resolvedToName}` : null;
      const extraLabel = hasRouteDataForSlot && detour != null ? `+${detour.toFixed(1)} km` : null;
      return {
        label,
        tone: hasRouteDataForSlot ? tone : ('red' as const),
        extraDistanceLabel: extraLabel,
        anchorLegLabel: between,
        insertedLabel: hasRouteDataForSlot ? label : 'No route data',
        reason: sourceSlot.decisionReason || null,
        source: (matrixFit as any)?.chosenSlotSource || null,
        warning: (matrixFit as any)?.warning || null,
        requestedSlot: (matrixFit as any)?.requestedSlot || null,
        chosenSlot: safeChosen,
      };
    }

    const distanceDelta = bestSlot?.distanceDelta ?? activePreviewResolution?.newHotspot?.distanceDelta;
    const bestFits = bestSlot ? (bestSlot?.fitsOverall !== false) : true;
    const bestReason = bestSlot?.timingReason || null;

    if (!bestFits) {
      return {
        label: 'Not on the way',
        tone: 'red' as const,
        extraDistanceLabel: null,
        anchorLegLabel: null,
        insertedLabel: 'Selected slot is not feasible',
        reason: bestReason,
      };
    }

    // If backend provided distanceDelta, use it directly
    if (Number.isFinite(distanceDelta) && distanceDelta !== null) {
      const delta = Number(distanceDelta);
      const isNeutral = Math.abs(delta) <= 0.5; // Within tolerance

      if (isNeutral || delta <= 0) {
        return {
          label: 'Fits on the way',
          tone: 'green' as const,
          extraDistanceLabel: delta < -0.5 ? `~${Math.abs(delta).toFixed(1)} km shorter` : 'No extra backtrack',
          anchorLegLabel: null,
          insertedLabel: 'Inserted correctly between spots',
        };
      }

      return {
        label: 'Distance increased',
        tone: 'red' as const,
        extraDistanceLabel: `+${delta.toFixed(1)} km extra travel`,
        anchorLegLabel: null,
        insertedLabel: `Inserted with detour (+${delta.toFixed(1)} km)`,
        reason: null,
      };
    }

    // Fallback: no distance delta available from backend
    return {
      label: 'Inserted',
      tone: 'amber' as const,
      extraDistanceLabel: null,
      anchorLegLabel: null,
      insertedLabel: 'Inserted (distance unavailable)',
      reason: null,
    };
  }, [
    addHotspotModal.routeId,
    activePreviewResolution,
    matrixRequiresBuild,
    normalizedInsertionSlots,
    selectedHotspotId,
    matrixFit,
    manualPreviewState,
    destinationHotelDisplayName,
  ]);


  const bestInsertionSlot = useMemo(() => {
    if (matrixRequiresBuild) return null;
    const slots = normalizedInsertionSlots;

    if (slots.length === 0) return null;

    return slots.find((slot) => slot?.isBest)
      || [...slots].sort(
        (a, b) => Number(a?.distanceDelta || 0) - Number(b?.distanceDelta || 0),
      )[0]
      || null;
  }, [matrixRequiresBuild, normalizedInsertionSlots]);

  const previewHotspotMetaById = useMemo(() => {
    const routeId = Number(addHotspotModal.routeId || 0);
    const day = itinerary?.days?.find((d) => Number(d.id) === routeId);
    const map = new Map<number, { visitTime?: string | null; duration?: string | null; timings?: string | null; priority?: number | null }>();

    const daySegments = Array.isArray(day?.segments) ? day!.segments : [];
    for (const seg of daySegments as any[]) {
      if (String(seg?.type || '').toLowerCase() !== 'attraction') continue;
      const hotspotId = Number(seg?.hotspotId ?? seg?.locationId ?? 0);
      if (!Number.isFinite(hotspotId) || hotspotId <= 0) continue;

      map.set(hotspotId, {
        visitTime: seg?.visitTime || null,
        duration: seg?.duration || null,
        timings: seg?.timings || null,
        priority: Number.isFinite(Number(seg?.priority)) ? Number(seg.priority) : null,
      });
    }

    for (const hotspot of availableHotspots) {
      const hotspotId = Number(hotspot?.id || 0);
      if (!Number.isFinite(hotspotId) || hotspotId <= 0) continue;

      const existing = map.get(hotspotId) || {};
      const durationFromHours = Number(hotspot?.timeSpend || 0) > 0
        ? formatMinutesDuration(Math.round(Number(hotspot.timeSpend) * 60))
        : null;

      map.set(hotspotId, {
        visitTime: existing.visitTime || null,
        duration: existing.duration || durationFromHours,
        timings: existing.timings || hotspot?.timings || null,
        priority:
          existing.priority ??
          (Number.isFinite(Number((hotspot as any)?.priority)) ? Number((hotspot as any).priority) : null) ??
          (Number.isFinite(Number((hotspot as any)?.hotspotPriority)) ? Number((hotspot as any).hotspotPriority) : null) ??
          (Number.isFinite(Number((hotspot as any)?.hotspot_priority)) ? Number((hotspot as any).hotspot_priority) : null),
      });
    }

    return map;
  }, [addHotspotModal.routeId, availableHotspots, itinerary?.days]);

  const currentRouteAttractionHotspotIds = useMemo(() => {
    const routeId = Number(addHotspotModal.routeId || 0);
    if (!routeId || !Array.isArray(itinerary?.days)) return new Set<number>();
    const day = itinerary.days.find((d) => Number(d?.id) === routeId);
    const ids = new Set<number>();
    const excludedSet = new Set(excludedHotspotIds.map(Number));
    for (const seg of Array.isArray(day?.segments) ? day!.segments : []) {
      const routeSeg = seg as any;
      if (String(routeSeg?.type || '').toLowerCase() !== 'attraction') continue;
      // Skip deleted/excluded rows
      if (
        routeSeg?.isDeleted === true ||
        routeSeg?.deleted === true ||
        routeSeg?.isExcluded === true ||
        routeSeg?.excluded === true ||
        routeSeg?.removed === true ||
        routeSeg?.deletedAt != null ||
        routeSeg?.deleted_at != null ||
        String(routeSeg?.status || '').toLowerCase() === 'deleted' ||
        String(routeSeg?.status || '').toLowerCase() === 'excluded'
      ) {
        continue;
      }
      const id = Number(routeSeg?.hotspotId ?? routeSeg?.locationId ?? 0);
      if (Number.isFinite(id) && id > 0 && !excludedSet.has(id)) ids.add(id);
    }
    return ids;
  }, [addHotspotModal.routeId, itinerary?.days, excludedHotspotIds]);

  const currentRouteManualHotspotIds = useMemo(() => {
    const routeId = Number(addHotspotModal.routeId || 0);
    if (!routeId || !Array.isArray(itinerary?.days)) return new Set<number>();
    const day = itinerary.days.find((d) => Number(d?.id) === routeId);
    const ids = new Set<number>();
    const excludedSet = new Set(excludedHotspotIds.map(Number));
    for (const seg of Array.isArray(day?.segments) ? day!.segments : []) {
      const routeSeg = seg as any;
      if (String(routeSeg?.type || '').toLowerCase() !== 'attraction') continue;
      // Skip deleted/excluded rows
      if (
        routeSeg?.isDeleted === true ||
        routeSeg?.deleted === true ||
        routeSeg?.isExcluded === true ||
        routeSeg?.excluded === true ||
        routeSeg?.removed === true ||
        routeSeg?.deletedAt != null ||
        routeSeg?.deleted_at != null ||
        String(routeSeg?.status || '').toLowerCase() === 'deleted' ||
        String(routeSeg?.status || '').toLowerCase() === 'excluded'
      ) {
        continue;
      }
      const isManual = routeSeg?.planOwnWay === true || routeSeg?.isManual === true;
      const id = Number(routeSeg?.hotspotId ?? routeSeg?.locationId ?? 0);
      if (Number.isFinite(id) && id > 0 && isManual && !excludedSet.has(id)) {
        ids.add(id);
      }
    }
    for (const id of addedInModalHotspotIds) {
      ids.add(Number(id));
    }
    return ids;
  }, [addHotspotModal.routeId, itinerary?.days, excludedHotspotIds, addedInModalHotspotIds]);

  const currentRouteManualHotspotMetaById = useMemo(() => {
    const map = new Map<number, {
      hotspotId: number;
      routeHotspotId: number | null;
      isManual: boolean;
    }>();

    const routeId = Number(addHotspotModal.routeId || 0);
    const day = itinerary?.days?.find((d) => Number(d.id) === routeId) || null;
    const excludedSet = new Set(excludedHotspotIds.map(Number));

    for (const seg of day?.segments || []) {
      const routeSeg = seg as any;

      if (String(routeSeg?.type || '').toLowerCase() !== 'attraction') continue;

      const hotspotId = Number(routeSeg?.hotspotId ?? routeSeg?.locationId ?? 0);
      if (!Number.isFinite(hotspotId) || hotspotId <= 0) continue;
      if (excludedSet.has(hotspotId)) continue;

      const isDeleted =
        routeSeg?.isDeleted === true ||
        routeSeg?.deleted === true ||
        routeSeg?.isExcluded === true ||
        routeSeg?.excluded === true ||
        routeSeg?.removed === true ||
        routeSeg?.deletedAt != null ||
        routeSeg?.deleted_at != null ||
        String(routeSeg?.status || '').toLowerCase() === 'deleted' ||
        String(routeSeg?.status || '').toLowerCase() === 'excluded';

      if (isDeleted) continue;

      const isManual =
        routeSeg?.planOwnWay === true ||
        routeSeg?.isManual === true;

      if (!isManual) continue;

      map.set(hotspotId, {
        hotspotId,
        routeHotspotId: Number(routeSeg?.routeHotspotId || 0) || null,
        isManual: true,
      });
    }

    return map;
  }, [addHotspotModal.routeId, itinerary?.days, excludedHotspotIds]);

  const isCurrentPreviewAlreadyAdded = useMemo(() => {
    const id = Number(activePreviewHotspotId || 0);
    if (!id) return false;
    return currentRouteAttractionHotspotIds.has(id) || addedInModalHotspotIds.has(id);
  }, [activePreviewHotspotId, addedInModalHotspotIds, currentRouteAttractionHotspotIds]);

  // Helper to normalize available hotspots after fetching
  // Accepts explicit context options to avoid stale async state issues
  const normalizeAvailableHotspots = useCallback((
    hotspots: AvailableHotspot[],
    options?: {
      routeId?: number | null;
      excludedIds?: number[];
      activeIds?: Set<number>;
    }
  ): AvailableHotspot[] => {
    const excludedSet = new Set((options?.excludedIds || excludedHotspotIds).map(Number));
    const activeSet = options?.activeIds || currentRouteAttractionHotspotIds;

    return hotspots.map((hotspot) => {
      const hotspotId = Number(hotspot.id);
      const backendStatus = String(hotspot.availabilityStatus || '').trim().toUpperCase();
      const reason = String(hotspot.availabilityReason || '').trim().toLowerCase();

      const isExcludedByBackend =
        backendStatus === 'EXCLUDED_BY_ROUTE' ||
        reason.includes('excluded for this route') ||
        reason.includes('currently excluded');

      const isDeletedOrExcluded =
        excludedSet.has(hotspotId) || isExcludedByBackend;

      const isActuallyActive =
        activeSet.has(hotspotId);

      if (isDeletedOrExcluded && !isActuallyActive) {
        return {
          ...hotspot,
          alreadyAdded: false,
          availabilityStatus: 'EXCLUDED_BY_ROUTE',
          actionDisabled: false,
          buttonLabel: 'Preview',
        };
      }

      const manualMeta = currentRouteManualHotspotMetaById.get(hotspotId) || null;

      if (isActuallyActive) {
        return {
          ...hotspot,
          alreadyAdded: true,
          visitAgain: true,
          availabilityStatus: 'ACTIVE_THIS_ROUTE',
          availabilityReason: 'Hotspot is already active on this route.',
          actionDisabled: true,
          buttonLabel: 'Added',
          routeHotspotId: Number(hotspot.routeHotspotId || manualMeta?.routeHotspotId || 0) || null,
          planOwnWay: hotspot.planOwnWay === true || manualMeta?.isManual === true,
          isManual: hotspot.isManual === true || manualMeta?.isManual === true,
        };
      }

      return hotspot;
    });
  }, [excludedHotspotIds, currentRouteAttractionHotspotIds, currentRouteManualHotspotMetaById]);

  // Keep left list focused near latest selected card.
  useEffect(() => {
    if (!addHotspotModal.open) return;
    if (!selectedHotspotId) return;

    const raf = requestAnimationFrame(() => {
      if (!hotspotListRef.current) return;
      const card = hotspotListRef.current.querySelector(
        `[data-hotspot-id="${selectedHotspotId}"]`
      ) as HTMLElement | null;
      if (!card) return;

      const targetScrollTop = Math.max(0, card.offsetTop - 150);
      hotspotListRef.current.scrollTo({ top: targetScrollTop, behavior: "auto" });
    });

    return () => cancelAnimationFrame(raf);
  }, [addHotspotModal.open, selectedHotspotId]);

  // Scroll list to top when search query changes
  useEffect(() => {
    if (hotspotListRef.current && addHotspotModal.open) {
      hotspotListRef.current.scrollTop = 0;
    }
  }, [hotspotSearchQuery, addHotspotModal.open]);

  // Filter hotspots based on search query, keep no-timing hotspots visible,
  // then sort: non-closed first, visitAgain at bottom, closed/no-timing last.
  const filteredHotspots = availableHotspots
    .filter(
      (h) => {
        const query = hotspotSearchQuery.toLowerCase();
        const matchesQuery =
          h.name.toLowerCase().includes(query) ||
          h.description.toLowerCase().includes(query);
        return matchesQuery;
      }
    )
    .sort((a, b) => {
      const aTimingText = String(a.timings || '').trim().toLowerCase();
      const bTimingText = String(b.timings || '').trim().toLowerCase();
      const aClosed = aTimingText.length === 0 || aTimingText === 'no timings available';
      const bClosed = bTimingText.length === 0 || bTimingText === 'no timings available';

      const isDeletedFromTimeline = (h: AvailableHotspot): boolean => {
        const backendStatus = String(h.availabilityStatus || '').trim().toUpperCase();
        const availabilityReason = String(h.availabilityReason || '').trim().toLowerCase();
        return (
          backendStatus === 'EXCLUDED_BY_ROUTE'
          || availabilityReason.includes('excluded for this route')
          || availabilityReason.includes('currently excluded')
        );
      };

      const isAddedInCurrentRoute = (h: AvailableHotspot): boolean => {
        const hotspotId = Number(h?.id || 0);
        const deletedFromTimeline = isDeletedFromTimeline(h);
        const backendStatus = String(h.availabilityStatus || '').trim().toUpperCase();
        const isAddedOnOtherRoute =
          h.alreadyAddedOnOtherRoute === true || backendStatus === 'ACTIVE_OTHER_ROUTE';
        return (
          !deletedFromTimeline
          && (
            currentRouteAttractionHotspotIds.has(hotspotId)
            || addedInModalHotspotIds.has(hotspotId)
            || (h.alreadyAdded === true && !isAddedOnOtherRoute)
            || backendStatus === 'ACTIVE_THIS_ROUTE'
          )
        );
      };

      const canPreview = (h: AvailableHotspot): boolean => {
        const deletedFromTimeline = isDeletedFromTimeline(h);
        const added = isAddedInCurrentRoute(h);
        const backendStatus = String(h.availabilityStatus || '').trim().toUpperCase();
        const isAddedOnOtherRoute =
          h.alreadyAddedOnOtherRoute === true || backendStatus === 'ACTIVE_OTHER_ROUTE';
        const disabled = added || (h.actionDisabled === true && !isAddedOnOtherRoute && !deletedFromTimeline);
        const timingText = String(h.timings || '').trim().toLowerCase();
        const closed = timingText.length === 0 || timingText === 'no timings available';
        return !disabled && !closed;
      };

      const getSortRank = (h: AvailableHotspot): number => {
        if (canPreview(h)) return 1; // Group 1: Previewable (available to add)
        const added = isAddedInCurrentRoute(h);
        const hotspotId = Number(h.id || 0);
        if (
          added &&
          (
            currentRouteManualHotspotIds.has(hotspotId) ||
            addedInModalHotspotIds.has(hotspotId) ||
            h.isManual === true ||
            h.planOwnWay === true
          )
        ) return 2; // Group 2: Manually added on this route
        return 3; // Group 3: Closed or Auto-added / Prebuilt
      };

      const rankA = getSortRank(a);
      const rankB = getSortRank(b);

      if (rankA !== rankB) return rankA - rankB;

      if (aClosed !== bClosed) return aClosed ? 1 : -1;
      // visitAgain (already visited) goes to the bottom
      if (a.visitAgain !== b.visitAgain) return a.visitAgain ? 1 : -1;
      // Within same group: lower priority number = more important = shown first
      // Treat 0 as unset (worst) so it never floats above real P1-P18
      const normP = (p) => { const n = Number(p ?? 0); return n > 0 ? n : 9999; };
      const pa = normP((a as any).priority);
      const pb = normP((b as any).priority);
      if (pa !== pb) return pa - pb;
      return 0;
    });

  const sourceCityLabel = useMemo(() => {
    const raw = String(
      hotspotFilterMeta?.sourceCityKey ||
      currentRouteForModal?.departure ||
      addHotspotModal.locationName ||
      '',
    ).trim();
    if (!raw) return 'source city';
    return raw.charAt(0).toUpperCase() + raw.slice(1);
  }, [
    hotspotFilterMeta?.sourceCityKey,
    currentRouteForModal?.departure,
    addHotspotModal.locationName,
  ]);

  const destinationCityLabel = useMemo(() => {
    const raw = String(
      hotspotFilterMeta?.destinationCityKey ||
      selectedHotspotAnchor?.anchorTo ||
      currentRouteForModal?.arrival ||
      '',
    ).trim();
    if (!raw) return 'destination city';
    return raw.charAt(0).toUpperCase() + raw.slice(1);
  }, [
    hotspotFilterMeta?.destinationCityKey,
    selectedHotspotAnchor?.anchorTo,
    currentRouteForModal?.arrival,
  ]);

  const routeIsDifferentCity = useMemo(() => {
    const source = String(
      hotspotFilterMeta?.sourceCityKey ||
      currentRouteForModal?.departure ||
      addHotspotModal.locationName ||
      '',
    ).trim().toLowerCase();
    const destination = String(
      hotspotFilterMeta?.destinationCityKey ||
      currentRouteForModal?.arrival ||
      '',
    ).trim().toLowerCase();
    return source.length > 0 && destination.length > 0 && source !== destination;
  }, [
    hotspotFilterMeta?.sourceCityKey,
    hotspotFilterMeta?.destinationCityKey,
    currentRouteForModal?.departure,
    currentRouteForModal?.arrival,
    addHotspotModal.locationName,
  ]);

  const destinationInsertionSlotLabel = useMemo(() => {
    const preferredRaw = String(
      matrixFit?.chosenSlot?.attemptedSlotLabel
      || matrixFit?.bestSlot?.attemptedSlotLabel
      || (selectedHotspotAnchor as any)?.slot
      || ''
    ).trim();
    const matrixDestinationName = String((matrixFit as any)?.destinationHotelName || '').trim();
    const escapedDestinationName = matrixDestinationName
      ? matrixDestinationName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      : '';
    const preferred = preferredRaw
      .replace(/^Will\s+be\s+inserted\s+/i, '')
      .replace(/^Insert\s+after\s+/i, 'After ')
      .replace(/->\s*Hotel(\b|$)/i, destinationHotelDisplayName ? `-> ${destinationHotelDisplayName}` : '-> Hotel')
      .replace(escapedDestinationName ? new RegExp(escapedDestinationName, 'gi') : /$^/, destinationHotelDisplayName || matrixDestinationName)
      .trim();
    if (preferred.length > 0) return preferred;
    if (selectedPreviewCityContext === 'DESTINATION_CITY') {
      return `After reaching ${destinationCityLabel}`;
    }
    return '';
  }, [matrixFit, selectedHotspotAnchor, selectedPreviewCityContext, destinationCityLabel, destinationHotelDisplayName]);

  const hotspotListRows = useMemo(() => {
    if (!routeIsDifferentCity) {
      return filteredHotspots.map((hotspot) => ({ kind: 'hotspot' as const, hotspot }));
    }

    const source: AvailableHotspot[] = [];
    const destination: AvailableHotspot[] = [];
    const other: AvailableHotspot[] = [];

    for (const hotspot of filteredHotspots) {
      const context = deriveHotspotCityContext(hotspot);
      if (context === 'SOURCE_CITY') source.push(hotspot);
      else if (context === 'DESTINATION_CITY') destination.push(hotspot);
      else other.push(hotspot);
    }

    const sourceLabel = `${String(hotspotFilterMeta?.sourceCityKey || 'Source').replace(/^./, (c: string) => c.toUpperCase())} Hotspots`;
    const destinationLabel = `${destinationCityLabel} Hotspots`;
    const rows: Array<{ kind: 'header'; label: string } | { kind: 'hotspot'; hotspot: AvailableHotspot }> = [];
    if (source.length > 0) {
      rows.push({ kind: 'header', label: sourceLabel });
      rows.push(...source.map((hotspot) => ({ kind: 'hotspot' as const, hotspot })));
    }
    if (destination.length > 0) {
      rows.push({ kind: 'header', label: destinationLabel });
      rows.push(...destination.map((hotspot) => ({ kind: 'hotspot' as const, hotspot })));
    }
    if (other.length > 0) {
      rows.push({ kind: 'header', label: 'Other Hotspots' });
      rows.push(...other.map((hotspot) => ({ kind: 'hotspot' as const, hotspot })));
    }
    return rows;
  }, [routeIsDifferentCity, filteredHotspots, deriveHotspotCityContext, hotspotFilterMeta?.sourceCityKey, destinationCityLabel]);

  const hotspotCityBuckets = useMemo(() => {
    const source: AvailableHotspot[] = [];
    const destination: AvailableHotspot[] = [];
    const other: AvailableHotspot[] = [];

    for (const hotspot of filteredHotspots) {
      const context = deriveHotspotCityContext(hotspot);
      if (context === 'SOURCE_CITY') source.push(hotspot);
      else if (context === 'DESTINATION_CITY') destination.push(hotspot);
      else other.push(hotspot);
    }

    return { source, destination, other };
  }, [filteredHotspots, deriveHotspotCityContext]);

  const hotspotCityTabs = useMemo(() => {
    const formatCityLabel = (value: unknown, fallback: string) => {
      const raw = String(value || '').trim();
      if (!raw) return fallback;
      return raw.charAt(0).toUpperCase() + raw.slice(1);
    };

    if (!routeIsDifferentCity) {
      return [{
        key: 'ALL' as const,
        label: 'All Hotspots',
        count: filteredHotspots.length,
      }];
    }

    const sourceLabel = `${formatCityLabel(sourceCityLabel, 'Source')} Hotspots`;
    const destinationLabel = `${formatCityLabel(
      destinationCityLabel,
      'Destination',
    )} Hotspots`;
    const tabs: Array<{ key: 'SOURCE_CITY' | 'DESTINATION_CITY' | 'UNKNOWN'; label: string; count: number }> = [
      {
        key: 'SOURCE_CITY',
        label: sourceLabel,
        count: hotspotCityBuckets.source.length,
      },
      {
        key: 'DESTINATION_CITY',
        label: destinationLabel,
        count: hotspotCityBuckets.destination.length,
      },
    ];

    if (hotspotCityBuckets.other.length > 0) {
      tabs.push({
        key: 'UNKNOWN',
        label: 'Other Hotspots',
        count: hotspotCityBuckets.other.length,
      });
    }

    return tabs;
  }, [
    routeIsDifferentCity,
    filteredHotspots.length,
    sourceCityLabel,
    destinationCityLabel,
    hotspotCityBuckets,
  ]);

  const visibleHotspotsForActiveTab = useMemo(() => {
    if (!routeIsDifferentCity || activeHotspotCityTab === 'ALL') return filteredHotspots;
    if (activeHotspotCityTab === 'SOURCE_CITY') return hotspotCityBuckets.source;
    if (activeHotspotCityTab === 'DESTINATION_CITY') return hotspotCityBuckets.destination;
    return hotspotCityBuckets.other;
  }, [routeIsDifferentCity, activeHotspotCityTab, filteredHotspots, hotspotCityBuckets]);

  useEffect(() => {
    if (!routeIsDifferentCity) {
      if (activeHotspotCityTab !== 'ALL') {
        setActiveHotspotCityTab('ALL');
      }
      return;
    }

    const validKeys = new Set(hotspotCityTabs.map((tab) => tab.key));

    if (
      selectedPreviewCityContext === 'DESTINATION_CITY' &&
      validKeys.has('DESTINATION_CITY') &&
      activeHotspotCityTab !== 'DESTINATION_CITY'
    ) {
      setActiveHotspotCityTab('DESTINATION_CITY');
      return;
    }

    if (!validKeys.has(activeHotspotCityTab as any)) {
      const first = hotspotCityTabs[0];
      if (first) {
        setActiveHotspotCityTab(first.key);
      }
    }
  }, [
    routeIsDifferentCity,
    hotspotCityTabs,
    activeHotspotCityTab,
    selectedPreviewCityContext,
  ]);

  // Hotel selection modal state
  type AvailableHotel = {
    id: number;
    name: string;
    address: string;
    category: string;
    checkIn: string;
    checkOut: string;
    distance: string;
  };
  const hotelWorkflowState = useHotelWorkflowState();
  const {
    hotelSelectionModal, setHotelSelectionModal, hotelSearchChildAges, setHotelSearchChildAges,
    isResolvingArrivalPolicy, setIsResolvingArrivalPolicy, latestArrivalPolicy, setLatestArrivalPolicy,
    pendingRouteTimeUpdate, setPendingRouteTimeUpdate, lastArrivalPolicyDecisionKey, setLastArrivalPolicyDecisionKey,
    arrivalPolicyConfirmModal, setArrivalPolicyConfirmModal, roomSelectionModal, setRoomSelectionModal,
    availableHotels, setAvailableHotels, loadingHotels, setLoadingHotels, isRebuildingHotels, setIsRebuildingHotels,
    isApplyingRouteTimeUpdate, setIsApplyingRouteTimeUpdate, routeTimeProgressPercent, setRouteTimeProgressPercent,
    routeTimeEstimatedMs, setRouteTimeEstimatedMs, routeProgressTitle, setRouteProgressTitle,
    routeProgressDetail, setRouteProgressDetail, routeProgressHistory, setRouteProgressHistory,
    pendingScrollDayNumber, setPendingScrollDayNumber, routeTimeProgressTimerRef,
    isSelectingHotel, setIsSelectingHotel, hotelSearchQuery, setHotelSearchQuery, selectedMealPlan, setSelectedMealPlan,
  } = hotelWorkflowState;

  // Filter hotels based on search query
  const filteredHotels = availableHotels.filter(
    (h) =>
      h.name.toLowerCase().includes(hotelSearchQuery.toLowerCase()) ||
      h.address.toLowerCase().includes(hotelSearchQuery.toLowerCase())
  );

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
  // Keep the bottom hotel list enabled for hotel-bearing itineraries.
  // The actual render is still gated by `shouldShowHotels` below.
  const shouldRenderBottomHotelList = true;

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

  const { selectedHotelTotal, selectedHotelMetaByRoute } = useSelectedHotelSummary({
    selectedHotelBookings,
    hotelDetails,
    activeHotelGroupType,
    roomCount: itinerary?.roomCount,
  });

  const computedHotelCost = useComputedHotelCost({
    hotelReadOnly,
    activeHotelListTotal,
    selectedHotelTotal,
    hotelDetails,
    activeHotelGroupType,
    roomCount: itinerary?.roomCount,
    costBreakdown: itinerary?.costBreakdown,
  });

  const roomBreakdownRoomNights = useRoomBreakdownNights({
    hotelDetails,
    activeHotelGroupType,
    dayCount: itinerary?.dayCount,
    daysLength: itinerary?.days?.length,
    roomCount: itinerary?.roomCount,
    selectedHotelBookings,
  });

  const { computedVehicleAmount, computedVehicleQty } = useComputedVehicleTotals({
    shouldShowVehicles,
    selectedVehicleTotalsByType,
    costBreakdown: itinerary?.costBreakdown,
  });

  const { entryTicketBreakdownByLocation, entryTicketLocationWiseTotal } = useEntryTicketSummary(itinerary?.days);

  const hotelsForDisplay = useMemo(() => {
    const rows = Array.isArray(hotelDetails?.hotels) ? hotelDetails.hotels : [];

    if (!shouldShowHotels || !itinerary?.days?.length || !hotelDetails) {
      return rows;
    }

    const activeGroupType =
      activeHotelGroupType ??
      hotelDetails.hotelTabs?.[0]?.groupType ??
      rows?.[0]?.groupType ??
      1;

    // Draft mode must keep the original supplier hotel rows.
    // Otherwise the hotel selection screen collapses to one row per day
    // and users cannot choose from all supplier options.
    if (!hotelReadOnly) {
      return rows;
    }

    const normalizeText = (value: unknown): string =>
      String(value || '')
        .trim()
        .toLowerCase()
        .replace(/\s+/g, ' ');

    const normalizeDateOnly = (value: unknown): string => {
      const raw = String(value || '').trim();
      if (!raw) return '';

      if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
        return raw;
      }

      const parsed = new Date(raw);
      if (!Number.isNaN(parsed.getTime())) {
        return parsed.toISOString().split('T')[0];
      }

      return raw.split('T')[0] || raw;
    };

    const formatHotelDayLabel = (day, index: number): string => {
      const dayNumber = Number(day?.dayNumber || index + 1);
      const dateOnly = normalizeDateOnly(day?.date);

      return dateOnly
        ? `Day ${dayNumber} | ${dateOnly}`
        : `Day ${dayNumber}`;
    };

    const getHotelRouteId = (hotel): number =>
      Number(
        hotel?.itineraryRouteId ||
        hotel?.routeId ||
        hotel?.itinerary_route_id ||
        0,
      );

    const getHotelDayNumber = (hotel): number => {
      const explicitDayNumber = Number(
        hotel?.dayNumber ||
        hotel?.noOfDays ||
        hotel?.no_of_days ||
        0,
      );

      if (Number.isFinite(explicitDayNumber) && explicitDayNumber > 0) {
        return explicitDayNumber;
      }

      const parsedFromText = Number(
        String(hotel?.day || '').match(/day\s*(\d+)/i)?.[1] || 0,
      );

      return Number.isFinite(parsedFromText) && parsedFromText > 0
        ? parsedFromText
        : 0;
    };

    const getHotelDate = (hotel): string =>
      normalizeDateOnly(
        hotel?.date ||
        hotel?.checkInDate ||
        hotel?.itineraryRouteDate ||
        hotel?.itinerary_route_date ||
        '',
      );

    const isSameDestination = (hotel, day): boolean => {
      const hotelDestination = normalizeText(hotel?.destination);
      const dayDestination = normalizeText(day?.arrival || day?.departure);

      if (!hotelDestination || !dayDestination) return false;

      return (
        hotelDestination === dayDestination ||
        hotelDestination.includes(dayDestination) ||
        dayDestination.includes(hotelDestination)
      );
    };

    const usedHotelIndexes = new Set<number>();

    const findHotelForDay = (day, dayIndex: number): ItineraryHotelRow | null => {
      const routeId = Number(day?.id || 0);
      const dayNumber = Number(day?.dayNumber || dayIndex + 1);
      const dayDate = normalizeDateOnly(day?.date);

      let matchedIndex = rows.findIndex((hotel, index: number) => {
        if (usedHotelIndexes.has(index)) return false;
        return routeId > 0 && getHotelRouteId(hotel) === routeId;
      });

      if (matchedIndex < 0) {
        matchedIndex = rows.findIndex((hotel, index: number) => {
          if (usedHotelIndexes.has(index)) return false;
          return getHotelDayNumber(hotel) === dayNumber;
        });
      }

      if (matchedIndex < 0) {
        matchedIndex = rows.findIndex((hotel, index: number) => {
          if (usedHotelIndexes.has(index)) return false;

          const hotelDate = getHotelDate(hotel);
          const dateMatches = Boolean(dayDate && hotelDate && dayDate === hotelDate);

          return dateMatches && isSameDestination(hotel, day);
        });
      }

      if (matchedIndex < 0) {
        return null;
      }

      usedHotelIndexes.add(matchedIndex);

      const matched = rows[matchedIndex] as any;

      const itineraryPlanHotelDetailsId = Number(
        matched?.itineraryPlanHotelDetailsId ||
        matched?.itinerary_plan_hotel_details_ID ||
        0,
      );

      const confirmedItineraryPlanHotelDetailsId = Number(
        matched?.confirmedItineraryPlanHotelDetailsId ||
        matched?.confirmed_itinerary_plan_hotel_details_ID ||
        0,
      );

      const hotelDetailsIds = Array.isArray(matched?.hotelDetailsIds)
        ? matched.hotelDetailsIds
            .map((id) => Number(id))
            .filter((id: number) => Number.isFinite(id) && id > 0)
        : itineraryPlanHotelDetailsId > 0
          ? [itineraryPlanHotelDetailsId]
          : [];

      const voucherCancelled = matched?.voucherCancelled === true;

      return {
        ...matched,
        groupType: Number(matched?.groupType || activeGroupType),
        itineraryRouteId: routeId || getHotelRouteId(matched),
        day: formatHotelDayLabel(day, dayIndex),
        dayNumber,
        sortOrder: dayNumber,
        destination:
          String(day?.arrival || day?.departure || '').trim() ||
          matched?.destination ||
          `Day ${dayNumber}`,
        date: dayDate || matched?.date,

        itineraryPlanHotelDetailsId,
        confirmedItineraryPlanHotelDetailsId,
        hotelDetailsIds,
        voucherCancelled,
        canCancelVoucher:
          !voucherCancelled &&
          (hotelDetailsIds.length > 0 || Number(routeId || 0) > 0),
      } as ItineraryHotelRow;
    };

    const totalDays = Number(itinerary?.dayCount || itinerary?.days?.length || 0);

    const orderedRows = itinerary.days
      .filter((day, index: number) => {
        const dayNumber = Number(day?.dayNumber || index + 1);

        if (totalDays > 0 && dayNumber === totalDays) {
          return rows.some((hotel) => {
            const routeId = Number(day?.id || 0);
            return (
              getHotelRouteId(hotel) === routeId ||
              getHotelDayNumber(hotel) === dayNumber
            );
          });
        }

        return true;
      })
      .map((day, index: number) => {
        const routeId = Number(day?.id || 0);
        const dayNumber = Number(day?.dayNumber || index + 1);
        const dateOnly = normalizeDateOnly(day?.date);
        const destination =
          String(day?.arrival || day?.departure || '').trim() ||
          `Day ${dayNumber}`;

        const matchedHotel = findHotelForDay(day, index);

        if (matchedHotel) {
          return matchedHotel;
        }

        return {
          groupType: activeGroupType,
          itineraryRouteId: routeId,
          day: formatHotelDayLabel(day, index),
          dayNumber,
          sortOrder: dayNumber,
          destination,
          hotelId: 0,
          hotelName: 'No Hotels Available',
          category: 0,
          roomType: '',
          mealPlan: '',
          displayRoomType: '-',
          displayMealPlan: '-',
          totalHotelCost: 0,
          totalHotelTaxAmount: 0,
          provider: 'external',
          isBookable: false,
          externalStay: true,
          availabilityStatus: 'NO_SUPPLIER_AVAILABILITY' as const,
          availabilityMessage:
            'No supplier hotel rooms are available for this city/date. Customer must arrange stay manually.',
          voucherCancelled: false,
          itineraryPlanHotelDetailsId: 0,
          date: dateOnly,
        } as ItineraryHotelRow;
      });

    return orderedRows;
  }, [hotelDetails, itinerary, shouldShowHotels, activeHotelGroupType, hotelReadOnly]);

  const financialTotals = useFinancialTotals({
    costBreakdown: itinerary?.costBreakdown,
    overallCost: itinerary?.overallCost,
    computedHotelCost,
    computedVehicleAmount,
    shouldShowHotels,
    shouldShowVehicles,
    selectedVehicleTotalsByType,
    activeHotelListTotal,
    selectedHotelTotal,
    entryTicketBreakdownCount: entryTicketBreakdownByLocation.length,
    entryTicketLocationWiseTotal,
  });

  const effectiveEntryTicketAmount = useMemo(() => {
    const fallback = Number(itinerary?.costBreakdown?.totalHotspotCost || 0);
    if (entryTicketBreakdownByLocation.length > 0) {
      return Number(entryTicketLocationWiseTotal || 0);
    }
    return Number.isFinite(fallback) ? fallback : 0;
  }, [entryTicketBreakdownByLocation.length, entryTicketLocationWiseTotal, itinerary?.costBreakdown?.totalHotspotCost]);

  const hotelHydratedDays = useMemo(() => {
    if (!itinerary?.days?.length) return [];

    return itinerary.days.map((day, dayIndex) => {
      // ALWAYS ensure we have a segments array to process
      let segments = Array.isArray(day.segments) ? [...day.segments] : [];
      
      // If no segments,  just return the day with empty segments
      // (don't try to process hotel logic if there's nothing to process)
      if (!segments || segments.length === 0) {
        return {
          ...day,
          segments: [],
        };
      }
      
      const currentHotelName = selectedHotelMetaByRoute.get(day.id)?.hotelName?.trim() || null;
      const currentHotelDistance = selectedHotelMetaByRoute.get(day.id)?.hotelDistance?.trim() || null;
      const previousDay = dayIndex > 0 ? itinerary.days[dayIndex - 1] : null;
      const previousHotelName = previousDay
        ? selectedHotelMetaByRoute.get(previousDay.id)?.hotelName?.trim() || null
        : null;

      let firstTravelSeen = false;
      let derivedHotelArrivalMinutes: number | null = null;
      const getSegmentAnchorLabel = (segment: ItinerarySegment | undefined, fallbackHotelName?: string | null): string => {
        if (!segment) return day.arrival || day.departure || fallbackHotelName || 'Hotel';
        if (segment.type === 'attraction') return segment.name;
        if (segment.type === 'travel') return segment.to || segment.from || day.arrival || fallbackHotelName || 'Hotel';
        if (segment.type === 'break') return segment.location || day.arrival || fallbackHotelName || 'Hotel';
        if (segment.type === 'checkin') return segment.hotelName || fallbackHotelName || 'Hotel';
        if (segment.type === 'start') return day.arrival || day.departure || fallbackHotelName || 'Hotel';
        if (segment.type === 'return') return day.arrival || day.departure || fallbackHotelName || 'Hotel';
        return day.arrival || day.departure || fallbackHotelName || 'Hotel';
      };

      const getSegmentEndMinutes = (segment: ItinerarySegment | undefined): number | null => {
        if (!segment) return null;
        if (segment.type === 'attraction') return parseDisplayMinutes(segment.visitTime, 'end');
        if (segment.type === 'travel') return parseDisplayMinutes(segment.timeRange, 'end');
        if (segment.type === 'break') return parseDisplayMinutes(segment.timeRange, 'end');
        if (segment.type === 'checkin') return parseDisplayMinutes(segment.time);
        if (segment.type === 'start') return parseDisplayMinutes(segment.timeRange, 'end');
        if (segment.type === 'return') return parseDisplayMinutes(segment.time);
        return null;
      };

      const ensureTravelBeforeCheckin = (
        checkinIndex: number,
        fallbackHotelName?: string | null,
      ) => {
        if (checkinIndex <= 0) return;

        const checkin = segments[checkinIndex];
        if (!checkin || checkin.type !== 'checkin') return;

        const targetHotelName = String(
          fallbackHotelName ||
          checkin.hotelName ||
          currentHotelName ||
          'Hotel',
        ).trim() || 'Hotel';

        let previousRenderableIndex = -1;
        for (let index = checkinIndex - 1; index >= 0; index -= 1) {
          if (segments[index]?.type === 'hotspot') continue;
          previousRenderableIndex = index;
          break;
        }

        if (previousRenderableIndex < 0) {
          segments[checkinIndex] = {
            ...checkin,
            hotelName: targetHotelName,
          };
          return;
        }

        const previousSegment = segments[previousRenderableIndex];
        const previousLabel = getSegmentAnchorLabel(previousSegment, targetHotelName);

        const alreadyArrivesAtHotel =
          previousSegment.type === 'checkin' ||
          (
            previousSegment.type === 'travel' &&
            normalizeTimelineLabel(previousSegment.to || '') === normalizeTimelineLabel(targetHotelName)
          ) ||
          normalizeTimelineLabel(previousLabel) === 'hotel' ||
          normalizeTimelineLabel(previousLabel) === normalizeTimelineLabel(targetHotelName);

        if (alreadyArrivesAtHotel) {
          segments[checkinIndex] = {
            ...checkin,
            hotelName: targetHotelName,
          };
          return;
        }

        const previousEndMinutes = getSegmentEndMinutes(previousSegment);
        const checkinMinutes = parseDisplayMinutes(checkin.time);
        const scheduleGapMinutes =
          previousEndMinutes !== null && checkinMinutes !== null
            ? Math.max(0, checkinMinutes - previousEndMinutes)
            : 0;
        const estimatedTravelMinutes = estimateHotelTravelMinutesFromDistance(currentHotelDistance);
        const effectiveTravelMinutes =
          estimatedTravelMinutes != null
            ? Math.max(scheduleGapMinutes, estimatedTravelMinutes)
            : Math.max(scheduleGapMinutes, 10);

        if (previousEndMinutes === null) {
          segments[checkinIndex] = {
            ...checkin,
            hotelName: targetHotelName,
          };
          return;
        }

        const travelEndMinutes = previousEndMinutes + effectiveTravelMinutes;
        const adjustedCheckinMinutes =
          checkinMinutes !== null
            ? Math.max(checkinMinutes, travelEndMinutes)
            : travelEndMinutes;

        const travelSegment: TravelSegment = {
          type: 'travel',
          from: previousLabel,
          to: targetHotelName,
          timeRange: `${formatMinutesToDisplay(previousEndMinutes)} - ${formatMinutesToDisplay(travelEndMinutes)}`,
          distance: currentHotelDistance || '',
          duration: formatMinutesDuration(effectiveTravelMinutes),
          note: 'This may vary due to traffic conditions',
        };

        segments.splice(checkinIndex, 0, travelSegment);
        segments[checkinIndex + 1] = {
          ...checkin,
          hotelName: targetHotelName,
          hotelAddress: checkin.hotelAddress || '',
          time: formatMinutesToDisplay(adjustedCheckinMinutes),
        };
      };

      segments = segments.map((segment) => {
        if (segment.type === 'travel') {
          const isFirstTravelOfDay = !firstTravelSeen;
          firstTravelSeen = true;

          let from = segment.from;
          let to = segment.to;

          if (currentHotelName && /\bhotel\b/i.test(String(segment.to || '').trim())) {
            to = currentHotelName;
          }

          if (isFirstTravelOfDay && previousHotelName) {
            const normalizedFrom = normalizeTimelineLabel(segment.from);
            const normalizedDeparture = normalizeTimelineLabel(day.departure);
            const normalizedArrival = normalizeTimelineLabel(day.arrival);

            if (
              /\bhotel\b/i.test(String(segment.from || '').trim()) ||
              normalizedFrom === normalizedDeparture ||
              normalizedFrom === normalizedArrival
            ) {
              from = previousHotelName;
            }
          } else if (currentHotelName && /\bhotel\b/i.test(String(segment.from || '').trim())) {
            from = currentHotelName;
          }

          const isTravelToCurrentHotel =
            !!currentHotelName &&
            normalizeTimelineLabel(to) === normalizeTimelineLabel(currentHotelName);

          if (isTravelToCurrentHotel) {
            const estimatedTravelMinutes = estimateHotelTravelMinutesFromDistance(currentHotelDistance);
            const travelStartMinutes = parseDisplayMinutes(segment.timeRange, 'start');
            const travelEndMinutes = parseDisplayMinutes(segment.timeRange, 'end');

            if (
              estimatedTravelMinutes != null &&
              travelStartMinutes !== null &&
              travelEndMinutes !== null
            ) {
              const scheduledTravelMinutes = Math.max(0, travelEndMinutes - travelStartMinutes);
              const effectiveTravelMinutes = Math.max(scheduledTravelMinutes, estimatedTravelMinutes);
              const adjustedTravelEndMinutes = travelStartMinutes + effectiveTravelMinutes;
              derivedHotelArrivalMinutes = adjustedTravelEndMinutes;

              return {
                ...segment,
                from,
                to,
                timeRange: `${formatMinutesToDisplay(travelStartMinutes)} - ${formatMinutesToDisplay(adjustedTravelEndMinutes)}`,
                duration: formatMinutesDuration(effectiveTravelMinutes),
                distance: currentHotelDistance || segment.distance,
              };
            }
          }

          return {
            ...segment,
            from,
            to,
          };
        }

        if (segment.type === 'checkin' && currentHotelName) {
          const existingCheckinMinutes = parseDisplayMinutes(segment.time);
          const adjustedCheckinMinutes =
            derivedHotelArrivalMinutes != null && existingCheckinMinutes != null
              ? Math.max(existingCheckinMinutes, derivedHotelArrivalMinutes)
              : (derivedHotelArrivalMinutes ?? existingCheckinMinutes);

          return {
            ...segment,
            hotelName: currentHotelName,
            time: adjustedCheckinMinutes !== null ? formatMinutesToDisplay(adjustedCheckinMinutes) : segment.time,
          };
        }

        return segment;
      });

      const lastCheckinIndex = (() => {
        for (let index = segments.length - 1; index >= 0; index -= 1) {
          if (segments[index]?.type === 'checkin') return index;
        }
        return -1;
      })();

      if (lastCheckinIndex >= 0) {
        ensureTravelBeforeCheckin(lastCheckinIndex, currentHotelName);
      }

      const earlyCheckinIndex = segments.findIndex((segment) => {
        if (segment.type !== 'checkin') return false;
        const timeMinutes = parseDisplayMinutes(segment.time);
        if (timeMinutes === null) return false;
        return isEarlyMorningTime(parseDisplayTimeToHms(segment.time || ''));
      });

      const hasEarlyMorningArrival = dayIndex === 0 && earlyCheckinIndex >= 0;

      const hasLateHotelTravel =
        hasEarlyMorningArrival &&
        currentHotelName &&
        segments.some((segment, segmentIndex) => (
          segmentIndex > earlyCheckinIndex &&
          segment.type === 'travel' &&
          normalizeTimelineLabel(segment.to) === normalizeTimelineLabel(currentHotelName)
        ));

      const hasLateCheckin =
        hasEarlyMorningArrival &&
        segments.some((segment, segmentIndex) => (
          segmentIndex > earlyCheckinIndex && segment.type === 'checkin'
        ));

      if (hasEarlyMorningArrival && currentHotelName && !hasLateHotelTravel) {
        const lateCheckinIndex = segments.findIndex((segment, segmentIndex) => (
          segmentIndex > earlyCheckinIndex && segment.type === 'checkin'
        ));
        const lateCheckinSegment = lateCheckinIndex >= 0 ? segments[lateCheckinIndex] as CheckinSegment : null;

        const searchEndIndex = lateCheckinIndex >= 0 ? lateCheckinIndex : segments.length;
        let anchorIndex = -1;
        for (let index = searchEndIndex - 1; index > earlyCheckinIndex; index -= 1) {
          if (segments[index]?.type === 'hotspot') continue;
          anchorIndex = index;
          break;
        }

        const anchorSegment = anchorIndex >= 0 ? segments[anchorIndex] : undefined;
        const anchorLabel = getSegmentAnchorLabel(anchorSegment);
        const anchorEndMinutes = getSegmentEndMinutes(anchorSegment);
        const existingCheckinMinutes = lateCheckinSegment ? parseDisplayMinutes(lateCheckinSegment.time) : parseDisplayMinutes(day.endTime);
        const dayEndMinutes = parseDisplayMinutes(day.endTime);
        const desiredCheckinMinutes = existingCheckinMinutes ?? dayEndMinutes ?? anchorEndMinutes;
        const estimatedTravelMinutes = estimateHotelTravelMinutesFromDistance(currentHotelDistance);

        const tailAlreadyArrivesAtHotel =
          !!anchorSegment &&
          (
            anchorSegment.type === 'checkin' ||
            (
              anchorSegment.type === 'travel' &&
              normalizeTimelineLabel(anchorSegment.to || '') === normalizeTimelineLabel(currentHotelName)
            ) ||
            normalizeTimelineLabel(anchorLabel) === 'hotel' ||
            normalizeTimelineLabel(anchorLabel) === normalizeTimelineLabel(currentHotelName)
          );

        if (!tailAlreadyArrivesAtHotel && anchorLabel && normalizeTimelineLabel(anchorLabel) !== normalizeTimelineLabel(currentHotelName)) {
          const scheduleGapMinutes =
            anchorEndMinutes !== null && desiredCheckinMinutes !== null
              ? Math.max(0, desiredCheckinMinutes - anchorEndMinutes)
              : 0;
          const effectiveTravelMinutes =
            estimatedTravelMinutes != null
              ? Math.max(scheduleGapMinutes, estimatedTravelMinutes)
              : scheduleGapMinutes;

          if (anchorEndMinutes !== null) {
            const travelEndMinutes = anchorEndMinutes + effectiveTravelMinutes;
            const travelSegment: TravelSegment = {
              type: 'travel',
              from: anchorLabel,
              to: currentHotelName,
              timeRange: `${formatMinutesToDisplay(anchorEndMinutes)} - ${formatMinutesToDisplay(travelEndMinutes)}`,
              distance: currentHotelDistance || '',
              duration: formatMinutesDuration(effectiveTravelMinutes),
              note: 'This may vary due to traffic conditions',
            };
            const adjustedCheckinMinutes = desiredCheckinMinutes !== null
              ? Math.max(desiredCheckinMinutes, travelEndMinutes)
              : travelEndMinutes;

            if (lateCheckinIndex >= 0) {
              segments.splice(lateCheckinIndex, 0, travelSegment);
              segments[lateCheckinIndex + 1] = {
                ...(segments[lateCheckinIndex + 1] as CheckinSegment),
                hotelName: currentHotelName,
                hotelAddress: '',
                time: formatMinutesToDisplay(adjustedCheckinMinutes),
              };
            } else {
              segments.push(travelSegment);
              segments.push({
                type: 'checkin',
                hotelName: currentHotelName,
                hotelAddress: '',
                time: formatMinutesToDisplay(adjustedCheckinMinutes),
              });
            }
          } else if (lateCheckinIndex < 0) {
            segments.push({
              type: 'checkin',
              hotelName: currentHotelName,
              hotelAddress: '',
              time: desiredCheckinMinutes !== null ? formatMinutesToDisplay(desiredCheckinMinutes) : day.endTime || null,
            });
          }
        } else if (lateCheckinIndex >= 0) {
          segments[lateCheckinIndex] = {
            ...(segments[lateCheckinIndex] as CheckinSegment),
            hotelName: currentHotelName,
            hotelAddress: '',
          };
        }
      }

      return {
        ...day,
        segments,
      };
    });
  }, [itinerary?.days, selectedHotelMetaByRoute]);

  // Ensure "start" segment always appears before first travel segment within each day
  const displayDays = (hotelHydratedDays.length ? hotelHydratedDays : itinerary?.days || []).map((day, idx) => {
    // CRITICAL SAFEGUARD: Ensure segments always exist as an array
    const rawSegments = (() => {
      // First try hotelHydratedDays/current day segments
      if (day.segments && Array.isArray(day.segments) && day.segments.length > 0) {
        return day.segments;
      }
      
      // Fallback: try to get from original itinerary.days in case hotelHydratedDays lost them
      if (itinerary?.days && itinerary.days.length > idx) {
        const originalDay = itinerary.days[idx];
        if (originalDay.segments && Array.isArray(originalDay.segments)) {
          return originalDay.segments;
        }
      }
      
      // Last resort: empty array
      return [];
    })();
    
    // DEBUG: Log for first day
    if (idx === 0 && rawSegments.length === 0) {
      console.warn('[ItineraryDetails] DisplayDays: No segments found for day 0!', {
        dayFromHydrated: day,
        dayFromOriginal: itinerary?.days?.[0],
        hotelHydratedDaysLength: hotelHydratedDays.length,
        itineraryDaysLength: itinerary?.days?.length,
      });
    }
    
    if (idx === 0) {
      console.log('[ItineraryDetails] DisplayDays day 0:', {
        segmentCount: rawSegments.length,
        hasSegments: rawSegments.length > 0,
        types: rawSegments.map(s => s?.type),
      });
    }
    
    return {
      ...day,
      segments: rawSegments.length > 0 ? rawSegments.sort((a, b) => {
        if (a.type === 'start' && b.type !== 'start') return -1;
        if (b.type === 'start' && a.type !== 'start') return 1;
        return 0;
      }) : [],
    };
  });

const { overallTripCostWithHotels, specialInstructionsText } = useItinerarySummaryValues({
  netPayable: financialTotals.netPayable,
  overallCost: itinerary?.overallCost,
  itinerary: itinerary as Record<string, unknown> | null,
});

  // ✅ Para should use recommendation GROUPS, not first 4 random hotels
  const paraRecommendations = useParaRecommendations(hotelDetails);

  const buildDefaultClipboardSelection = useCallback(() => {
    const next: Record<string, boolean> = {};
    paraRecommendations.forEach((_item, idx) => {
      next[`para-${idx}`] = true;
    });
    return next;
  }, [paraRecommendations]);

  useEffect(() => {
    setClipboardRatesVisible(Boolean(hotelDetails?.hotelRatesVisible));
  }, [hotelDetails]);

  useEffect(() => {
    if (!hotelDetails?.hotelTabs?.length) return;
    if (activeHotelGroupType == null) {
      setActiveHotelGroupType(hotelDetails.hotelTabs[0].groupType);
    }
  }, [hotelDetails, activeHotelGroupType]);

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

  useEffect(() => {
    if (!clipboardModal || !paraRecommendations.length) return;

    const hasAnySelected = Object.values(selectedHotels).some(Boolean);
    if (!hasAnySelected) {
      setSelectedHotels(buildDefaultClipboardSelection());
    }
  }, [clipboardModal, paraRecommendations, selectedHotels, buildDefaultClipboardSelection]);

  const escapeHtml = (value: unknown) => {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  };

  const formatCurrency = (value?: number | string | null) => {
    const amount = Number(value || 0);
    return `₹ ${amount.toFixed(2)}`;
  };

  const parseWalletAmount = (value: unknown): number => {
    if (typeof value === "number") {
      return Number.isFinite(value) ? value : 0;
    }

    const cleaned = String(value ?? "").replace(/[^\d.-]/g, "");
    const amount = Number(cleaned);

    return Number.isFinite(amount) ? amount : 0;
  };

  const getWalletAmountFromResponse = (walletData): number => {
    return parseWalletAmount(
      walletData?.balance ??
        walletData?.wallet_balance ??
        walletData?.formatted_balance ??
        walletData?.cashWalletBalance ??
        walletData?.formattedBalance ??
        walletData,
    );
  };

  const toMoneyNumber = (value?: number | string | null): number => {
    const amount = Number(value || 0);
    if (!Number.isFinite(amount)) return 0;

    return Number(amount.toFixed(2));
  };
  /*

  if (typeof raw === "number") {
    return Number.isFinite(raw) ? raw : 0;
  }

  const cleaned = String(raw)
    .replace(/₹/g, "")
    .replace(/,/g, "")
    .replace(/[^\d.-]/g, "")
    .trim();

  const amount = Number(cleaned);

  return Number.isFinite(amount) ? amount : 0;
};

  */
  const getHotelSelectionAmount = (hotel): number => {
    const directTotal = Number(hotel?.totalAmount ?? hotel?.totalPrice ?? 0);
    if (Number.isFinite(directTotal) && directTotal > 0) {
      return toMoneyNumber(directTotal);
    }

    const totalHotelCost = Number(hotel?.totalHotelCost ?? hotel?.perNightAmount ?? hotel?.pricePerNight ?? 0);
    const totalHotelTaxAmount = Number(hotel?.totalHotelTaxAmount ?? hotel?.taxAmount ?? 0);
    const computedTotal = totalHotelCost + totalHotelTaxAmount;

    return toMoneyNumber(computedTotal);
  };

  const copyHtmlToClipboard = async (html: string, plainText: string) => {
    try {
      const outlookSafeHtml = `
        <div style="display:block;width:100%;margin:0;padding:0;font-family:Calibri;font-size:11px;color:#302c6e;">
          ${html.trim()}
          <table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0" style="border-collapse:collapse;width:100%;">
            <tr><td style="font-size:1px;line-height:1px;height:1px;">&nbsp;</td></tr>
          </table>
        </div>
      `;

      if (window.ClipboardItem && navigator.clipboard?.write) {
        const item = new ClipboardItem({
          "text/html": new Blob([outlookSafeHtml], { type: "text/html" }),
          "text/plain": new Blob([plainText], { type: "text/plain" }),
        });

        await navigator.clipboard.write([item]);
      } else {
        await navigator.clipboard.writeText(plainText);
      }
    } catch (error) {
      console.error("Clipboard copy failed", error);
      await navigator.clipboard.writeText(plainText);
    }
  };

  type ClipboardMode = "recommended" | "highlights" | "para";

  type ClipboardGroup = {
    label: string;
    groupType: number;
    hotels: ItineraryHotelRow[];
  };

  const getSelectedClipboardGroups = (_mode: ClipboardMode): ClipboardGroup[] => {
    if (!hotelDetails) return [];

    return paraRecommendations
      .filter((item, idx) => selectedHotels[`para-${idx}`])
      .map((item) => ({
        label: item.label,
        groupType: item.groupType,
        hotels: item.hotels,
      }));
  };

const buildClipboardHtml = (mode: ClipboardMode) => {
  if (!hotelDetails || !itinerary) {
    return { html: "", plainText: "", packageSectionsHtml: "" };
  }

  const selectedGroups = getSelectedClipboardGroups(mode);

  if (!selectedGroups.length) {
    return { html: "", plainText: "", packageSectionsHtml: "" };
  }

  const sectionTitle = "Recommended Hotel";

  const tableStyle =
    "border-collapse:collapse;background:#fff;font-family:Calibri,Arial,sans-serif;font-size:16px;line-height:1.25;color:#000;";
  const borderStyle = "border:1px solid #b1b1b1;";
  const cellStyle = `${borderStyle}padding:6px;text-align:left;vertical-align:middle;`;
  const headerCellStyle = `${cellStyle}background:#f2f2f2;font-weight:700;`;
  const centerTitleStyle =
    "font-family:Calibri,Arial,sans-serif;font-size:20px;line-height:42px;font-weight:700;text-align:center;color:#000;";

  const money = (value?: number | string | null) => {
    const amount = Number(value || 0);
    return Number.isFinite(amount)
      ? amount.toLocaleString("en-IN", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })
      : "0.00";
  };

  const moneyWithSymbol = (value?: number | string | null) => `₹ ${money(value)}`;

  const getHotelPaxCount = () => {
    const paxFromCostBreakdown = Number(itinerary.costBreakdown.hotelPaxCount || 0);
    const paxFromItinerary =
      Number(itinerary.adults || 0) + Number(itinerary.children || 0);

    return Math.max(paxFromCostBreakdown || paxFromItinerary || 1, 1);
  };

  const getActivityAmountFromItineraryDays = () => {
    return (itinerary.days || []).reduce((total, day) => {
      return total + (day.segments || []).reduce((dayTotal, segment) => {
        if (segment.type !== "attraction") return dayTotal;

        const activities = Array.isArray(segment.activities)
          ? segment.activities
          : [];

        return dayTotal + activities.reduce((sum, activity) => {
          return sum + Number(activity.amount || 0);
        }, 0);
      }, 0);
    }, 0);
  };

  const getEntryTicketBreakdownFromItineraryDays = () => {
    const grouped = new Map<string, { dayNumber: number; locationName: string; amount: number }>();

    for (const day of itinerary.days || []) {
      const dayNumber = Number(day?.dayNumber || 0);
      for (const segment of day.segments || []) {
        if (segment.type !== "attraction") continue;

        const amount = Number(segment.amount || 0);
        if (!Number.isFinite(amount) || amount <= 0) continue;

        const locationName = String(segment.name || "Sightseeing Location").trim() || "Sightseeing Location";
        const key = `${dayNumber}|${locationName.toLowerCase()}`;
        const existing = grouped.get(key);

        if (existing) {
          existing.amount += amount;
        } else {
          grouped.set(key, { dayNumber, locationName, amount });
        }
      }
    }

    return Array.from(grouped.values())
      .map((row) => ({
        ...row,
        amount: Number(row.amount.toFixed(2)),
      }))
      .sort((a, b) => {
        if (a.dayNumber !== b.dayNumber) return a.dayNumber - b.dayNumber;
        return a.locationName.localeCompare(b.locationName);
      });
  };

  const getHotelBaseAmountForGroup = (group: ClipboardGroup) => {
    return group.hotels.reduce((sum, hotel) => {
      const rowTotal =
        Number(hotel.totalHotelCost || 0) +
        Number(hotel.totalHotelTaxAmount || 0);

      return sum + rowTotal;
    }, 0);
  };

  const getGroupFinancialTotals = (group: ClipboardGroup) => {
    const hotelAmount = shouldShowHotels ? getHotelBaseAmountForGroup(group) : 0;

    const amenitiesAmount = Number(itinerary.costBreakdown.totalAmenitiesCost || 0);
    const extraBedAmount = Number(itinerary.costBreakdown.extraBedCost || 0);
    const childWithBedAmount = Number(itinerary.costBreakdown.childWithBedCost || 0);
    const childWithoutBedAmount = Number(itinerary.costBreakdown.childWithoutBedCost || 0);
    const guideAmount = Number(itinerary.costBreakdown.totalGuideCost || 0);
    const entryTicketBreakdown = getEntryTicketBreakdownFromItineraryDays();
    const hotspotAmountFromCostBreakdown = Number(itinerary.costBreakdown.totalHotspotCost || 0);
    const hotspotAmount =
      entryTicketBreakdown.length > 0
        ? entryTicketBreakdown.reduce((sum, item) => sum + Number(item.amount || 0), 0)
        : hotspotAmountFromCostBreakdown;

    const activityAmountFromCostBreakdown = Number(
      itinerary.costBreakdown.totalActivityCost || 0,
    );
    const activityAmountFromDays = getActivityAmountFromItineraryDays();

    const activityAmount =
      activityAmountFromCostBreakdown > 0
        ? activityAmountFromCostBreakdown
        : activityAmountFromDays;

    const additionalMargin = Number(itinerary.costBreakdown.additionalMargin || 0);

    const vehicleAmount = shouldShowVehicles ? Number(computedVehicleAmount || 0) : 0;

    const totalAmount =
      hotelAmount +
      amenitiesAmount +
      extraBedAmount +
      childWithBedAmount +
      childWithoutBedAmount +
      guideAmount +
      hotspotAmount +
      activityAmount +
      additionalMargin +
      vehicleAmount;

    const couponDiscount = Number(itinerary.costBreakdown.couponDiscount || 0);
    const agentMargin = Number(itinerary.costBreakdown.agentMargin || 0);
    const netBeforeRound = totalAmount - couponDiscount + agentMargin;
    const netPayable = Math.round(netBeforeRound);
    const roundOff = Number((netPayable - netBeforeRound).toFixed(2));

    return {
      hotelAmount,
      vehicleAmount,
      totalAmount,
      roundOff,
      netPayable,
      amenitiesAmount,
      extraBedAmount,
      childWithBedAmount,
      childWithoutBedAmount,
      guideAmount,
      hotspotAmount,
      entryTicketBreakdown,
      activityAmount,
      couponDiscount,
      agentMargin,
    };
  };

  const buildVehicleSectionHtml = () => {
    if (!shouldShowVehicles) return "";

    const vehicleRowsHtml =
      itinerary.vehicles?.length > 0
        ? itinerary.vehicles
            .map((vehicle) => {
              const startDate =
                itinerary.days?.[0]?.date ? formatHeaderDate(itinerary.days[0].date).replace(/^\w+,\s*/, "") : "";
              const endDate =
                itinerary.days?.[itinerary.days.length - 1]?.date
                  ? formatHeaderDate(itinerary.days[itinerary.days.length - 1].date).replace(/^\w+,\s*/, "")
                  : "";

              const fromToText =
                vehicle.fromLabel || vehicle.toLabel
                  ? `${vehicle.fromLabel || ""} ==> ${vehicle.toLabel || ""}`
                  : `${itinerary.days?.[0]?.departure || ""} ==> ${
                      itinerary.days?.[itinerary.days.length - 1]?.arrival || ""
                    }`;

              return `
                <tr>
                  <td style="${cellStyle}">
                    ${escapeHtml(vehicle.vehicleTypeName || "Vehicle")} (${escapeHtml(vehicle.totalQty || 1)}) -
                    ${escapeHtml(fromToText)}
                    ${startDate || endDate ? ` - ${escapeHtml(startDate)} ==> ${escapeHtml(endDate)}` : ""}
                  </td>
                  <td style="${cellStyle}font-weight:700;">
                    ${escapeHtml(money(vehicle.totalAmount || 0))}
                  </td>
                </tr>
              `;
            })
            .join("")
        : `
          <tr>
            <td colspan="2" style="${cellStyle}text-align:center;">No Vehicle available</td>
          </tr>
        `;

    return `
      <div style="${centerTitleStyle}margin-top:22px;">Vehicle Details</div>
      <table width="700" border="1" cellpadding="0" cellspacing="0" style="${tableStyle}">
        <tr>
          <th style="${headerCellStyle}width:85%;">Vehicle Details</th>
          <th style="${headerCellStyle}width:15%;">Total Amount</th>
        </tr>
        ${vehicleRowsHtml}
      </table>
    `;
  };

  const buildCostSectionHtml = (group: ClipboardGroup) => {
    const totals = getGroupFinancialTotals(group);
    const hotelPaxCount = getHotelPaxCount();
    const hotelPerPaxAmount =
      hotelPaxCount > 0
        ? Number(totals.hotelAmount || 0) / hotelPaxCount
        : 0;

    return `
      <table width="700" border="1" cellpadding="0" cellspacing="0" style="${tableStyle}margin-top:18px;">
        ${
          shouldShowHotels
            ? `
              <tr>
                <td style="${cellStyle}font-weight:700;">Total Room Cost (${escapeHtml(hotelPaxCount)} Pax * ${escapeHtml(
                money(hotelPerPaxAmount),
              )})</td>
                <td style="${cellStyle}">${escapeHtml(moneyWithSymbol(totals.hotelAmount))}</td>
              </tr>
            `
            : ""
        }

        ${
          totals.extraBedAmount > 0 || Number(itinerary.extraBed || 0) > 0
            ? `
              <tr>
                <td style="${cellStyle}font-weight:700;">Extra Bed Cost (${escapeHtml(itinerary.extraBed || 0)})</td>
                <td style="${cellStyle}">${escapeHtml(moneyWithSymbol(totals.extraBedAmount))}</td>
              </tr>
            `
            : ""
        }

        ${
          totals.childWithBedAmount > 0 || Number(itinerary.childWithBed || 0) > 0
            ? `
              <tr>
                <td style="${cellStyle}font-weight:700;">Child With Bed Cost (${escapeHtml(itinerary.childWithBed || 0)})</td>
                <td style="${cellStyle}">${escapeHtml(moneyWithSymbol(totals.childWithBedAmount))}</td>
              </tr>
            `
            : ""
        }

        ${
          totals.childWithoutBedAmount > 0 || Number(itinerary.childWithoutBed || 0) > 0
            ? `
              <tr>
                <td style="${cellStyle}font-weight:700;">Child Without Bed Cost (${escapeHtml(itinerary.childWithoutBed || 0)})</td>
                <td style="${cellStyle}">${escapeHtml(moneyWithSymbol(totals.childWithoutBedAmount))}</td>
              </tr>
            `
            : ""
        }

        ${
          shouldShowVehicles
            ? `
              <tr>
                <td style="${cellStyle}font-weight:700;">Total Vehicle Cost (${escapeHtml(computedVehicleQty || 0)})</td>
                <td style="${cellStyle}">${escapeHtml(moneyWithSymbol(totals.vehicleAmount))}</td>
              </tr>
            `
            : ""
        }

        ${
          totals.hotspotAmount > 0
            ? `
              <tr>
                <td style="${cellStyle}font-weight:700;">Total Entry Ticket Cost</td>
                <td style="${cellStyle}">${escapeHtml(moneyWithSymbol(totals.hotspotAmount))}</td>
              </tr>
            `
            : ""
        }

        ${
          Array.isArray(totals.entryTicketBreakdown) && totals.entryTicketBreakdown.length > 0
            ? totals.entryTicketBreakdown
                .map((item) => `
                  <tr>
                    <td style="${cellStyle}padding-left:18px;color:#5d5d5d;">Day ${escapeHtml(item.dayNumber || 0)} - ${escapeHtml(item.locationName || "Sightseeing Location")}</td>
                    <td style="${cellStyle}color:#5d5d5d;">${escapeHtml(moneyWithSymbol(item.amount || 0))}</td>
                  </tr>
                `)
                .join("")
            : ""
        }

        ${
          totals.activityAmount > 0
            ? `
              <tr>
                <td style="${cellStyle}font-weight:700;">Total Activity Cost</td>
                <td style="${cellStyle}">${escapeHtml(moneyWithSymbol(totals.activityAmount))}</td>
              </tr>
            `
            : ""
        }

        <tr>
          <td style="${cellStyle}font-weight:700;">Total Amount</td>
          <td style="${cellStyle}font-weight:700;">${escapeHtml(moneyWithSymbol(totals.totalAmount))}</td>
        </tr>

        ${
          totals.couponDiscount > 0
            ? `
              <tr>
                <td style="${cellStyle}font-weight:700;">Coupon Discount</td>
                <td style="${cellStyle}">- ${escapeHtml(moneyWithSymbol(totals.couponDiscount))}</td>
              </tr>
            `
            : ""
        }

        <tr>
          <td style="${cellStyle}font-weight:700;">Total Round Off</td>
          <td style="${cellStyle}">
            ${totals.roundOff >= 0 ? "+ " : "- "}${escapeHtml(moneyWithSymbol(Math.abs(totals.roundOff)))}
          </td>
        </tr>

        <tr>
          <td style="${cellStyle}font-weight:700;">Net Payable To ${escapeHtml(
            itinerary.costBreakdown.companyName || "Doview Holidays India Pvt ltd",
          )}</td>
          <td style="${cellStyle}font-weight:700;">${escapeHtml(moneyWithSymbol(totals.netPayable))}</td>
        </tr>
      </table>
    `;
  };

  const packageSectionsHtml = selectedGroups
    .map((group, groupIndex) => {
      const rowsHtml =
        group.hotels.length > 0
          ? group.hotels
              .map((hotel, index) => {
                return `
                  <tr>
                    <td style="${cellStyle}white-space:nowrap;">
                      Day- ${index + 1} | ${escapeHtml(hotel.date || hotel.day)}
                    </td>
                    <td style="${cellStyle}">
                      ${escapeHtml(hotel.destination)}
                    </td>
                    <td style="${cellStyle}">
                      ${escapeHtml(hotel.hotelName)} - ${escapeHtml(hotel.category)}
                    </td>
                    <td style="${cellStyle}">
                      ${escapeHtml(hotel.roomType)} - ${escapeHtml(itinerary.roomCount)}
                    </td>
                    <td style="${cellStyle}">
                      ${escapeHtml(String(hotel.mealPlan || "").trim() || "CP")}
                    </td>
                  </tr>
                `;
              })
              .join("")
          : `
            <tr>
              <td colspan="5" style="${cellStyle}text-align:center;">No hotel available</td>
            </tr>
          `;

      return `
        <div style="${centerTitleStyle}margin-top:${groupIndex === 0 ? "10px" : "34px"};">
          ${escapeHtml(sectionTitle)} - ${groupIndex + 1}
        </div>

        <table width="700" border="1" cellpadding="0" cellspacing="0" style="${tableStyle}">
          <tr>
            <th style="${headerCellStyle}width:20%;">Day</th>
            <th style="${headerCellStyle}width:20%;">Destination</th>
            <th style="${headerCellStyle}width:20%;">Hotel Name -<br/>Category</th>
            <th style="${headerCellStyle}width:20%;">Room Type -<br/>Count</th>
            <th style="${headerCellStyle}width:20%;">Meal Plan</th>
          </tr>
          ${rowsHtml}
        </table>

        ${buildVehicleSectionHtml()}
        ${buildCostSectionHtml(group)}
      `;
    })
    .join("");

  const plainText = selectedGroups
    .map((group, groupIndex) => {
      const hotelLines = group.hotels
        .map(
          (hotel, index) =>
            `Day-${index + 1} | ${hotel.day} | ${hotel.destination} | ${hotel.hotelName} - ${hotel.category} | ${hotel.roomType} - ${itinerary.roomCount} | ${hotel.mealPlan || "CP"}`
        )
        .join("\n");

      return `${sectionTitle} - ${groupIndex + 1}\n${hotelLines}`;
    })
    .join("\n\n");

  return {
    html: packageSectionsHtml,
    plainText,
    packageSectionsHtml,
  };
};

  const extractHotelSectionFromHtml = (html: string): string => {
    if (!html) return "";

    const hotelHeadingMatch = html.match(/Recommended Hotel(?:s)?\s*-/i);
    if (!hotelHeadingMatch || hotelHeadingMatch.index === undefined) {
      return "";
    }

    const headingIndex = hotelHeadingMatch.index;
    const hotelSectionStart = html.lastIndexOf("<table", headingIndex);
    if (hotelSectionStart === -1) return "";

    const vehicleHeadingMatch = html.match(/Vehicle Details/i);
    if (!vehicleHeadingMatch || vehicleHeadingMatch.index === undefined) {
      return "";
    }

    const vehicleHeadingIndex = vehicleHeadingMatch.index;
    const vehicleSectionStart = html.lastIndexOf("<table", vehicleHeadingIndex);
    if (vehicleSectionStart === -1 || vehicleSectionStart <= hotelSectionStart) {
      return "";
    }

    return html.slice(hotelSectionStart, vehicleSectionStart);
  };

  const mergeClipboardWithRenderedHotels = (
    backendHtml: string,
    renderedHotelsHtml: string,
  ): string => {
    if (!backendHtml || !renderedHotelsHtml) return backendHtml;

    const backendVehicleHeadingMatch = backendHtml.match(/Vehicle Details/i);
    if (!backendVehicleHeadingMatch || backendVehicleHeadingMatch.index === undefined) {
      return backendHtml;
    }

    const backendVehicleHeadingIndex = backendVehicleHeadingMatch.index;
    const backendVehicleStart = backendHtml.lastIndexOf("<table", backendVehicleHeadingIndex);
    if (backendVehicleStart === -1) {
      return backendHtml;
    }

    const backendHotelHeadingMatch = backendHtml.match(/Recommended Hotel(?:s)?\s*-/i);
    if (!backendHotelHeadingMatch || backendHotelHeadingMatch.index === undefined) {
      return `${backendHtml.slice(0, backendVehicleStart)}${renderedHotelsHtml}${backendHtml.slice(backendVehicleStart)}`;
    }

    const backendHotelHeadingIndex = backendHotelHeadingMatch.index;
    const backendHotelStart = backendHtml.lastIndexOf("<table", backendHotelHeadingIndex);
    if (backendHotelStart === -1 || backendVehicleStart <= backendHotelStart) {
      return `${backendHtml.slice(0, backendVehicleStart)}${renderedHotelsHtml}${backendHtml.slice(backendVehicleStart)}`;
    }

    return `${backendHtml.slice(0, backendHotelStart)}${renderedHotelsHtml}${backendHtml.slice(backendVehicleStart)}`;
  };

  const mergeClipboardWithRenderedCost = (
    backendHtml: string,
    renderedCostHtml: string,
  ): string => {
    if (!backendHtml || !renderedCostHtml) return backendHtml;

    const backendHotspotHeadingMatch = backendHtml.match(/Hotspot Details/i);
    if (!backendHotspotHeadingMatch || backendHotspotHeadingMatch.index === undefined) {
      return backendHtml;
    }

    const backendHotspotHeadingIndex = backendHotspotHeadingMatch.index;
    const backendHotspotStart = backendHtml.lastIndexOf("<table", backendHotspotHeadingIndex);
    if (backendHotspotStart === -1) return backendHtml;

    const roundOffIndex = backendHtml.lastIndexOf("Total Round Off", backendHotspotStart);
    const netPayableIndex = backendHtml.lastIndexOf("Net Payable To", backendHotspotStart);
    const totalAmountIndex = backendHtml.lastIndexOf("Total Amount", backendHotspotStart);
    const anchorIndex = Math.max(roundOffIndex, netPayableIndex, totalAmountIndex);

    if (anchorIndex === -1) {
      return `${backendHtml.slice(0, backendHotspotStart)}${renderedCostHtml}${backendHtml.slice(backendHotspotStart)}`;
    }

    const backendCostStart = backendHtml.lastIndexOf("<table", anchorIndex);
    if (backendCostStart === -1 || backendCostStart >= backendHotspotStart) {
      return `${backendHtml.slice(0, backendHotspotStart)}${renderedCostHtml}${backendHtml.slice(backendHotspotStart)}`;
    }

    return `${backendHtml.slice(0, backendCostStart)}${renderedCostHtml}${backendHtml.slice(backendHotspotStart)}`;
  };

  const mergeClipboardWithB2BRecommendedPackages = (
  backendHtml: string,
  renderedPackageSectionsHtml: string,
): string => {
  if (!backendHtml || !renderedPackageSectionsHtml) return backendHtml;

  const hotspotHeadingMatch = backendHtml.match(/Hotspot Details/i);
  if (!hotspotHeadingMatch || hotspotHeadingMatch.index === undefined) {
    return backendHtml;
  }

  const hotspotHeadingIndex = hotspotHeadingMatch.index;
  const hotspotSectionStart = backendHtml.lastIndexOf("<table", hotspotHeadingIndex);
  if (hotspotSectionStart === -1) return backendHtml;

  const recommendedHeadingMatch = backendHtml.match(/Recommended Hotel(?:s)?\s*-/i);
  const vehicleHeadingMatch = backendHtml.match(/Vehicle Details/i);

  const firstMiddleHeadingIndex =
    recommendedHeadingMatch?.index !== undefined
      ? recommendedHeadingMatch.index
      : vehicleHeadingMatch?.index !== undefined
        ? vehicleHeadingMatch.index
        : -1;

  if (firstMiddleHeadingIndex === -1) {
    return `${backendHtml.slice(0, hotspotSectionStart)}${renderedPackageSectionsHtml}${backendHtml.slice(hotspotSectionStart)}`;
  }

  const middleSectionStart = backendHtml.lastIndexOf("<table", firstMiddleHeadingIndex);

  if (middleSectionStart === -1 || middleSectionStart >= hotspotSectionStart) {
    return `${backendHtml.slice(0, hotspotSectionStart)}${renderedPackageSectionsHtml}${backendHtml.slice(hotspotSectionStart)}`;
  }

  return `${backendHtml.slice(0, middleSectionStart)}${renderedPackageSectionsHtml}${backendHtml.slice(hotspotSectionStart)}`;
};

const htmlToPlainText = (html: string): string => {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
};

const buildHighlightsHotspotDetailsHtml = (): string => {
  if (!itinerary?.days?.length) return "";

  const tableStyle =
    "border-collapse:collapse;background:#fff;font-family:Calibri,Arial,sans-serif;font-size:16px;line-height:1.35;color:#000;";
  const borderStyle = "border:1px solid #b1b1b1;";
  const cellStyle = `${borderStyle}padding:6px;text-align:left;vertical-align:middle;`;
  const dayCellStyle = `${cellStyle}background:#f2f2f2;font-weight:700;`;
  const titleStyle =
    "font-family:Calibri,Arial,sans-serif;font-size:18px;line-height:36px;font-weight:700;text-align:center;color:#000;";

  const formatB2BDate = (iso: string) => {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;

    return d.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "2-digit",
      year: "numeric",
    });
  };

  const getHotspotLine = (day: ItineraryDay) => {
    const attractions = day.segments.filter(
      (segment): segment is AttractionSegment => segment.type === "attraction",
    );

    if (!attractions.length) {
      return "No Hotspot Details Available";
    }

    return attractions
      .map((segment) => {
        const name = escapeHtml(segment.name || "");
        const duration = escapeHtml(segment.duration || "");

        return `<b>${name}</b>${duration ? ` - ${duration}` : ""}`;
      })
      .join(", ");
  };

  const rowsHtml = itinerary.days
    .map((day) => {
      const fromText = day.departure || "";
      const toText = day.arrival || "";
      const routeText =
        fromText || toText
          ? ` - ${escapeHtml(fromText)} to ${escapeHtml(toText)}`
          : "";

      return `
        <tr>
          <td style="${dayCellStyle}">
            Day ${escapeHtml(day.dayNumber)} - ${escapeHtml(formatB2BDate(day.date))}
            (${escapeHtml(day.startTime || "")} - ${escapeHtml(day.endTime || "")})${routeText}
          </td>
        </tr>
        <tr>
          <td style="${cellStyle}">
            ${getHotspotLine(day)}
          </td>
        </tr>
      `;
    })
    .join("");

  return `
    <div style="${titleStyle}margin-top:22px;">Hotspot Details</div>
    <table width="700" border="1" cellpadding="0" cellspacing="0" style="${tableStyle}">
      ${rowsHtml}
    </table>
  `;
};

const replaceHighlightsHotspotDetailsHtml = (
  backendHtml: string,
  highlightsHotspotHtml: string,
): string => {
  if (!backendHtml || !highlightsHotspotHtml) return backendHtml;

  const hotspotHeadingMatch = backendHtml.match(/Hotspot Details/i);

  if (!hotspotHeadingMatch || hotspotHeadingMatch.index === undefined) {
    return backendHtml;
  }

  const hotspotHeadingIndex = hotspotHeadingMatch.index;

  const hotspotTableStart = backendHtml.lastIndexOf("<table", hotspotHeadingIndex);

  if (hotspotTableStart === -1) {
    return backendHtml;
  }

  const afterHotspotHtml = backendHtml.slice(
    hotspotHeadingIndex + "Hotspot Details".length,
  );

  const nextSectionMatchers = [
    /Terms\s*&?\s*Condition/i,
    /Package Includes/i,
    /Package Excludes/i,
    /Inclusion/i,
    /Exclusion/i,
    /Important Instructions/i,
    /Instructions/i,
    /Cancellation/i,
    /Payment Policy/i,
  ];

  const nextSectionIndex = nextSectionMatchers
    .map((regex) => {
      const match = afterHotspotHtml.match(regex);

      return match?.index !== undefined
        ? hotspotHeadingIndex + "Hotspot Details".length + match.index
        : -1;
    })
    .filter((index) => index > hotspotHeadingIndex)
    .sort((a, b) => a - b)[0];

  if (!nextSectionIndex) {
    return `${backendHtml.slice(0, hotspotTableStart)}${highlightsHotspotHtml}`;
  }

  const nextSectionTableStart = backendHtml.lastIndexOf("<table", nextSectionIndex);
  const hotspotSectionEnd =
    nextSectionTableStart > hotspotTableStart ? nextSectionTableStart : nextSectionIndex;

  return `${backendHtml.slice(
    0,
    hotspotTableStart,
  )}${highlightsHotspotHtml}${backendHtml.slice(hotspotSectionEnd)}`;
};

const buildVehicleOnlyClipboardHtml = (): { html: string; plainText: string } => {
  if (!itinerary) {
    return { html: "", plainText: "" };
  }

  const money = (value?: number | string | null) => {
    const amount = Number(value || 0);

    return Number.isFinite(amount)
      ? amount.toLocaleString("en-IN", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })
      : "0.00";
  };

  const moneyWithSymbol = (value?: number | string | null) => `₹ ${money(value)}`;

  const vehicleQty =
    Number(computedVehicleQty || 0) ||
    Number(itinerary.costBreakdown?.totalVehicleQty || 0) ||
    1;

  const vehicleAmount =
    Number(computedVehicleAmount || 0) ||
    Number(itinerary.costBreakdown?.totalVehicleAmount || 0) ||
    Number(itinerary.costBreakdown?.totalVehicleCost || 0) ||
    Number(financialTotals?.totalAmount || 0) ||
    Number(financialTotals?.netPayable || 0) ||
    Number(itinerary.overallCost || 0) ||
    0;

  const companyName =
    itinerary.costBreakdown?.companyName || "Doview Holidays India Pvt ltd";

  const packageDescription =
    itinerary.packageIncludes?.description ||
    itinerary.packageIncludes?.rateNote ||
    `The Quotation quoted is valid for 3 days from the date of quote, if the travel of the Guest is below then three of from the quoted date the valid quote only for quoted date and Company Reserves the right to change the prices depends on the availability of prices and inventory`;

  const packageNote =
    itinerary.packageIncludes?.houseBoatNote ||
    `Kindly note that names of hotels mentioned above only indicate that our rates have been based on usage of these hotels and it is not to be construed that accommodation is confirmed at these hotels until and unless we convey such confirmation to you.`;

  const tableStyle =
    "border-collapse:collapse;background:#fff;font-family:Calibri,Arial,sans-serif;font-size:16px;line-height:1.35;color:#000;";
  const borderStyle = "border:1px solid #b1b1b1;";
  const cellStyle = `${borderStyle}padding:8px;text-align:left;vertical-align:middle;`;
  const amountCellStyle = `${cellStyle}text-align:right;white-space:nowrap;`;
  const titleStyle =
    "font-family:Calibri,Arial,sans-serif;font-size:20px;line-height:36px;font-weight:700;color:#000;text-align:left;";

  const html = `
    <table width="700" border="0" cellpadding="0" cellspacing="0" style="${tableStyle}">
      <tr>
        <td width="50%" style="padding:8px 14px 8px 0;vertical-align:top;">
          <div style="${titleStyle}">Package Includes</div>

          <div style="font-family:Calibri,Arial,sans-serif;font-size:16px;line-height:1.45;color:#000;margin-top:28px;">
            ${escapeHtml(packageDescription).replace(/\n/g, "<br/>")}
          </div>

          <div style="font-family:Calibri,Arial,sans-serif;font-size:16px;line-height:1.45;color:#000;margin-top:24px;">
            ${escapeHtml(packageNote).replace(/\n/g, "<br/>")}
          </div>
        </td>

        <td width="50%" style="padding:8px 0 8px 22px;vertical-align:top;">
          <div style="${titleStyle}">OVERALL COST</div>

          <table width="100%" border="0" cellpadding="0" cellspacing="0" style="${tableStyle};margin-top:16px;">
            <tr>
              <td style="${cellStyle}border-left:0;border-right:0;border-top:0;">
                Total Vehicle Cost (${escapeHtml(vehicleQty)})
              </td>
              <td style="${amountCellStyle}border-left:0;border-right:0;border-top:0;">
                ${escapeHtml(moneyWithSymbol(vehicleAmount))}
              </td>
            </tr>

            <tr>
              <td style="${cellStyle}border-left:0;border-right:0;border-top:0;font-weight:700;">
                Total Vehicle Amount
              </td>
              <td style="${amountCellStyle}border-left:0;border-right:0;border-top:0;font-weight:700;">
                ${escapeHtml(moneyWithSymbol(vehicleAmount))}
              </td>
            </tr>

            <tr>
              <td colspan="2" style="border-top:1px solid #b1b1b1;height:18px;font-size:1px;line-height:1px;">
                &nbsp;
              </td>
            </tr>

            <tr>
              <td style="${cellStyle}border-left:0;border-right:0;border-top:0;font-weight:700;">
                Total Amount
              </td>
              <td style="${amountCellStyle}border-left:0;border-right:0;border-top:0;font-weight:700;">
                ${escapeHtml(moneyWithSymbol(vehicleAmount))}
              </td>
            </tr>

            <tr>
              <td colspan="2" style="border-top:1px solid #b1b1b1;height:18px;font-size:1px;line-height:1px;">
                &nbsp;
              </td>
            </tr>

            <tr>
              <td style="${cellStyle}border-left:0;border-right:0;border-top:0;font-weight:700;">
                Net Payable To ${escapeHtml(companyName)}
              </td>
              <td style="${amountCellStyle}border-left:0;border-right:0;border-top:0;font-weight:700;">
                ${escapeHtml(moneyWithSymbol(vehicleAmount))}
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  `;

  const plainText = htmlToPlainText(html);

  return { html, plainText };
};

const handleVehicleOnlyClipboardCopy = async (
  type: "recommended" | "highlights" | "para" = "recommended",
) => {
  if (!quoteId || itineraryPreference !== 2) return;

  try {
    /*
      Vehicle Only clipboard rules:

      recommended = backend recommended format
      para        = backend para format
      highlights  = backend base format + ONLY compact highlights hotspot table

      Do NOT use buildVehicleOnlyClipboardHtml() here.
    */

    const backendMode =
      type === "highlights" ? "recommended" : type;

    const response = await ItineraryService.getClipboardContent(
      quoteId,
      backendMode,
      [],
    );

    const backendHtml = response?.html || "";
    const backendPlainText = response?.plainText || "";

    const cleanVehicleOnlyB2BHtml = (rawHtml: string): string => {
      if (!rawHtml) return rawHtml;

      const parser = new DOMParser();
      const doc = parser.parseFromString(rawHtml, "text/html");

      // Remove hotel-only rows/sections if backend sends them by mistake.
      doc.querySelectorAll("tr").forEach((row) => {
        const text = row.textContent?.replace(/\s+/g, " ").trim() || "";

        if (
          /^Recommended Hotel/i.test(text) ||
          /^Hotel Details/i.test(text) ||
          /^Total Room Cost/i.test(text) ||
          /^Total Hotel Cost/i.test(text) ||
          /^Total Hotel Amount/i.test(text) ||
          /^Room Count\b/i.test(text)
        ) {
          row.remove();
        }
      });

      // Fix wrong merged vehicle label:
      // "Total Vehicle Amount Total Vehicle Cost (1)" -> "Total Vehicle Amount"
      doc.querySelectorAll("tr").forEach((row) => {
        const rowText = row.textContent?.replace(/\s+/g, " ").trim() || "";

        if (
          /Total Vehicle Amount/i.test(rowText) &&
          /Total Vehicle Cost\s*\(/i.test(rowText)
        ) {
          const cells = Array.from(row.querySelectorAll("td, th"));
          if (!cells.length) return;

          const firstCell = cells[0];

          const amountCell = cells.find((cell) => {
            const text = cell.textContent?.replace(/\s+/g, " ").trim() || "";
            return /₹|Rs\.?|[0-9]+,[0-9]+|\d+\.\d{2}/i.test(text);
          });

          firstCell.textContent = "Total Vehicle Amount";

          cells.forEach((cell) => {
            if (cell === firstCell) return;
            if (amountCell && cell === amountCell) return;

            const text = cell.textContent?.replace(/\s+/g, " ").trim() || "";

            if (/Total Vehicle Cost\s*\(/i.test(text)) {
              cell.remove();
            }
          });
        }
      });

      // Extra safety if both labels are inside one single cell.
      doc.querySelectorAll("td, th").forEach((cell) => {
        const text = cell.textContent?.replace(/\s+/g, " ").trim() || "";

        if (
          /Total Vehicle Amount/i.test(text) &&
          /Total Vehicle Cost\s*\(/i.test(text)
        ) {
          cell.textContent = "Total Vehicle Amount";
        }
      });

      // Remove tiny empty cells that Outlook shows as square boxes.
      doc.querySelectorAll("td, th").forEach((cell) => {
        const text = cell.textContent?.replace(/\s+/g, " ").trim() || "";
        const hasContentElement =
          cell.querySelectorAll("table, img, a, span, div, p, b, strong").length > 0;

        const widthValue = Number(
          String(cell.getAttribute("width") || "").replace(/[^0-9.]/g, ""),
        );

        if (!text && !hasContentElement && widthValue > 0 && widthValue <= 40) {
          cell.remove();
        }
      });

      return doc.body.innerHTML;
    };

    let html = backendHtml
      ? cleanVehicleOnlyB2BHtml(backendHtml)
      : backendPlainText;

    /*
      VERY IMPORTANT:
      Only Copy to Highlights should replace Hotspot Details.
      This removes paragraph/travel/full-description hotspot content
      and inserts the compact highlight table:
      Day 1...
      Hotspot Name - Duration, Hotspot Name - Duration
    */
  if (type === "highlights" && html) {
  html = replaceHighlightsHotspotDetailsHtml(
    html,
    buildHighlightsHotspotDetailsHtml(),
  );

  const moveHighlightSignatureBelow = (rawHtml: string): string => {
    if (!rawHtml) return rawHtml;

    const parser = new DOMParser();
    const doc = parser.parseFromString(rawHtml, "text/html");

    const signatureCell = Array.from(doc.querySelectorAll("td, th")).find((cell) => {
      const text = cell.textContent?.replace(/\s+/g, " ").trim() || "";

      return (
        /Nisha/i.test(text) &&
        /Sales Support/i.test(text) &&
        /Mobile/i.test(text)
      );
    });

    if (!signatureCell) {
      return doc.body.innerHTML;
    }

    const signatureHtml = signatureCell.innerHTML;

    const parentRow = signatureCell.closest("tr");
    const rowCells = parentRow ? Array.from(parentRow.querySelectorAll(":scope > td, :scope > th")) : [];

    // If signature is in right-side column, remove that right column.
    if (parentRow && rowCells.length > 1) {
      signatureCell.remove();
    }

    const signatureWrapper = doc.createElement("div");
    signatureWrapper.innerHTML = `
      <div style="margin-top:18px;font-family:Arial,sans-serif;font-size:12px;line-height:1.35;color:#003366;">
        ${signatureHtml}
      </div>
    `;

    doc.body.appendChild(signatureWrapper);

    return doc.body.innerHTML;
  };

  html = moveHighlightSignatureBelow(html);
}

const plainText = html ? htmlToPlainText(html) : backendPlainText;

    if (!html && !plainText) {
      toast.error("Failed to prepare clipboard content");
      return;
    }

    await copyHtmlToClipboard(html, plainText);

    if (type === "recommended") {
      toast.success("Copy Recommended copied!");
    } else if (type === "highlights") {
      toast.success("Copy to Highlights copied!");
    } else {
      toast.success("Copy to Para copied!");
    }
  } catch (error) {
    console.error("Failed to copy vehicle-only clipboard content", error);
    toast.error("Failed to copy clipboard content");
  }
};
  const quotationState = useQuotationState();
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
  } = quotationState;
  const currentItineraryPlanId = Number(itinerary?.planId || 0);
  const confirmRequiredAmount = Number(financialTotals.netPayable || itinerary?.overallCost || 0);
  const isWalletInsufficientForConfirm =
    walletBalanceAmount !== null &&
    confirmRequiredAmount > 0 &&
    walletBalanceAmount < confirmRequiredAmount;

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
  const prebookDataRef = useRef<any | null>(null);
  const shouldEnableWalletTopUpOnConfirm = confirmQuotationModal === true && Boolean(agentInfo?.agent_id);

  const prebookTotalAmount = Number(prebookData?.updatedTotalPrice || prebookData?.finalPrice || prebookData?.totalAmount || 0);
  const selectedTboHotelTotal = useMemo(
    () =>
      Object.values(selectedHotelBookings)
        .filter((item) => normalizeHotelProvider(item) === 'tbo')
        .reduce((sum, item) => sum + Number(item.netAmount || 0), 0),
    [selectedHotelBookings],
  );
  const hasSelectedTboHotels = useMemo(
    () =>
      Object.values(selectedHotelBookings).some(
        (item) => isSupplierBookableHotel(item) && normalizeHotelProvider(item) === 'tbo',
      ),
    [selectedHotelBookings],
  );
  const requiresDetailedPassengerFlow = requiresHotelBookingFlow && hasSelectedTboHotels;
  const hasPrebookPriceChanged =
    prebookTotalAmount > 0 && Math.abs(prebookTotalAmount - selectedTboHotelTotal) > 0.01;
  const prebookHotelEntries = Array.isArray(prebookData?.hotels) ? prebookData.hotels : [];
  const { getCoveredRouteIdsFromHotelSelections, selectedHotelCoveredRouteIds } = useHotelSelectionCoverage({
    selectedHotelBookings,
  });

  // Non-TBO user-selected hotels — shown in the review modal but NOT sent to prebook API
  const nonTboSelectedHotelEntries = useMemo(() => {
    return Object.entries(selectedHotelBookings)
    .filter(([routeId, h]) => {
      if (!isSupplierBookableHotel(h) || normalizeHotelProvider(h) === 'tbo') {
        return false;
      }

      const routeIdNum = Number(routeId);

      if (!h?.multiNightBooking && selectedHotelCoveredRouteIds.has(routeIdNum)) {
        const parentForRoute = Object.values(selectedHotelBookings).find((selected) => {
          const routeIds = Array.isArray(selected?.routeIds)
            ? selected.routeIds.map((id) => Number(id))
            : [];

          return selected?.multiNightBooking && routeIds.includes(routeIdNum);
        });

        if (parentForRoute) {
          return false;
        }
      }

      return true;
    })
    .map(([routeId, h]: [string, any]) => {
      const routeIdNum = parseInt(routeId, 10);
      const selectedProvider = normalizeHotelProvider(h);
      const selectedBookingCode = getBookingCodeForBooking(h);
      const selectedHotelCode = getHotelCodeForBooking(h);
      const selectedHotelName = String((h as any)?.hotelName || '').trim().toLowerCase();
      const selectedRoomType = String((h as any)?.roomType || '').trim().toLowerCase();
      const selectedAmount = getHotelAmountForBooking(h);

      const displayRouteIds = Array.isArray(h?.routeIds) && h.routeIds.length > 0
        ? h.routeIds
            .map((id) => Number(id))
            .filter((id: number) => Number.isFinite(id) && id > 0)
        : [routeIdNum];

      const routeRows = (Array.isArray(hotelDetails?.hotels) ? hotelDetails.hotels : []).filter((row) =>
        displayRouteIds.includes(Number(row?.itineraryRouteId || 0)) &&
        normalizeHotelProvider(row) === selectedProvider &&
        isSupplierBookableHotel(row),
      );

      const matchedHotelRow =
        routeRows.find((row) => {
          const rowBookingCode = String(row?.bookingCode || row?.searchReference || '').trim();
          const rowHotelCode = String(row?.hotelCode || '').trim();
          const rowHotelName = String(row?.hotelName || '').trim().toLowerCase();
          const rowRoomType = String(row?.roomType || '').trim().toLowerCase();
          const rowAmount = Number(row?.totalHotelCost || 0) + Number(row?.totalHotelTaxAmount || 0);

          const bookingCodeMatch = selectedBookingCode !== '' && rowBookingCode !== '' && selectedBookingCode === rowBookingCode;
          const hotelCodeMatch = selectedHotelCode !== '' && rowHotelCode !== '' && selectedHotelCode === rowHotelCode;
          const hotelNameMatch = selectedHotelName !== '' && rowHotelName !== '' && selectedHotelName === rowHotelName;
          const roomTypeMatch = selectedRoomType !== '' && rowRoomType !== '' && selectedRoomType === rowRoomType;
          const amountMatch = selectedAmount > 0 && Math.abs(selectedAmount - rowAmount) <= 0.01;

          return (bookingCodeMatch && (roomTypeMatch || amountMatch)) || hotelCodeMatch || (hotelNameMatch && amountMatch);
        }) || routeRows[0] || null;

      return {
        routeId: routeIdNum,
        ...h,
        matchedHotelRow,
        displayRouteIds,
        displayNights: Number(h?.nights || displayRouteIds.length || 1),
        displayCheckInDate: h?.checkInDate,
        displayCheckOutDate: h?.checkOutDate,
      };
    });
  }, [
    hotelDetails?.hotels,
    selectedHotelBookings,
    selectedHotelCoveredRouteIds,
  ]);
  const DEFAULT_EXTERNAL_STAY_MESSAGE =
    'No supplier hotel rooms are available for this city/date. Customer must arrange stay manually.';

  useEffect(() => {
    if (!confirmQuotationModal || requiresDetailedPassengerFlow) return;
    setAdditionalAdults([]);
    setAdditionalChildren([]);
    setAdditionalInfants([]);
    setFormErrors((prev) => {
      const next = Object.fromEntries(
        Object.entries(prev).filter(([key]) => {
          return !(
            key.startsWith('count-adult') ||
            key.startsWith('count-child') ||
            key.startsWith('count-infant') ||
            key.startsWith('adult-') ||
            key.startsWith('child-') ||
            key.startsWith('infant-')
          );
        }),
      );
      return next;
    });
  }, [confirmQuotationModal, requiresDetailedPassengerFlow]);

  const externalStayEntries = useMemo(() => {
    if (!hotelDetails?.hotels?.length) {
      return [];
    }

    const preferredGroupType =
      activeHotelGroupType ??
      hotelDetails.hotelTabs?.[0]?.groupType ??
      1;

    return hotelDetails.hotels
      .filter((row) =>
        Number(row?.groupType) === Number(preferredGroupType) &&
        !isSupplierBookableHotel(row),
      )
      .map((row) => ({
        routeId: Number(row?.itineraryRouteId || 0),
        destination: String(row?.destination || '').trim(),
        day: String(row?.day || '').trim(),
        hotelName: String(row?.hotelName || '').trim(),
        availabilityStatus: row?.availabilityStatus || 'NO_SUPPLIER_AVAILABILITY',
        availabilityMessage: row?.availabilityMessage || DEFAULT_EXTERNAL_STAY_MESSAGE,
      }));
  }, [activeHotelGroupType, hotelDetails]);
  const confirmRoomCount = Math.max(Number(itinerary?.roomCount || 1), 1);
  const confirmPassengerMix = [
    Number(itinerary?.adults || 0) > 0 ? `${Number(itinerary?.adults || 0)} Adult${Number(itinerary?.adults || 0) === 1 ? '' : 's'}` : null,
    Number(itinerary?.children || 0) > 0 ? `${Number(itinerary?.children || 0)} Child${Number(itinerary?.children || 0) === 1 ? '' : 'ren'}` : null,
    Number(itinerary?.infants || 0) > 0 ? `${Number(itinerary?.infants || 0)} Infant${Number(itinerary?.infants || 0) === 1 ? '' : 's'}` : null,
  ].filter(Boolean).join(', ');
  const confirmOccupancyPreview = (confirmOccupanciesTemplate && confirmOccupanciesTemplate.length > 0
    ? confirmOccupanciesTemplate
    : buildOccupancyPreview(
        confirmRoomCount,
        Number(itinerary?.adults || 0),
        Number(itinerary?.children || 0),
      )
  ).map((room) => ({ adults: room.adults, children: room.children }));

  const ALLOWED_TITLES = ['Mr', 'Ms', 'Mrs'];
  const TBO_SESSION_WINDOW_MS = 35 * 60 * 1000;
  const NAME_REGEX = /^[A-Za-z][A-Za-z\s'-]{1,24}$/;
  const PAN_REGEX = /^[A-Z]{5}[0-9]{4}[A-Z]$/;
  const isValidPassengerName = (value: string) => NAME_REGEX.test(value.trim());
  const isValidPan = (value: string) => PAN_REGEX.test(value.trim().toUpperCase());
  const isValidIsoNationality = (value: string) => /^[A-Z]{2}$/.test(value.trim().toUpperCase());
  type HotelProvider = 'tbo' | 'resavenue' | 'hobse' | 'axisrooms' | 'staah';

const inferHotelProvider = (entry): HotelProvider => {
  const provider = String(entry?.provider || '')
    .trim()
    .toLowerCase();

  if (
    provider === 'tbo' ||
    provider === 'resavenue' ||
    provider === 'hobse' ||
    provider === 'axisrooms' ||
    provider === 'staah'
  ) {
    return provider;
  }

  const bookingCode = String(entry?.bookingCode || '').trim().toUpperCase();
  if (bookingCode.includes('!TB!')) return 'tbo';
  if (bookingCode.startsWith('STAAH-')) return 'staah';

  return 'tbo';
};
  function normalizeHotelProvider(entry): string {
    return String(entry?.provider || '').trim().toLowerCase();
  }

  function getHotelCodeForBooking(entry): string {
    return String(entry?.hotelCode || entry?.hotelId || '').trim();
  }

  function getBookingCodeForBooking(entry): string {
    return String(
      entry?.bookingCode ||
      entry?.searchReference ||
      entry?.roomTypes?.[0]?.roomCode ||
      '',
    ).trim();
  }

  function parseStaahSearchReference(reference): {
    propertyId: string;
    roomId: string;
    rateId: string;
  } | null {
    const raw = String(reference || '').trim();
    if (!raw.startsWith('STAAH-')) {
      return null;
    }

    const parts = raw.split('-');
    if (parts.length < 5) {
      return null;
    }

    const propertyId = String(parts[1] || '').trim();
    const roomId = String(parts[2] || '').trim();
    const rateId = String(parts[3] || '').trim();

    if (!propertyId || !roomId || !rateId) {
      return null;
    }

    return { propertyId, roomId, rateId };
  }

function getHotelAmountForBooking(entry): number {
  const netAmount = Number(entry?.netAmount);
  if (Number.isFinite(netAmount) && netAmount > 0) {
    return netAmount;
  }

  const totalHotelCost = Number(entry?.totalHotelCost || 0);
  const totalHotelTaxAmount = Number(entry?.totalHotelTaxAmount || 0);
  const computedAmount = totalHotelCost + totalHotelTaxAmount;

  if (Number.isFinite(computedAmount) && computedAmount > 0) {
    return computedAmount;
  }

  const price = Number(entry?.price);
  if (Number.isFinite(price) && price > 0) {
    return price;
  }

  return 0;
}

  function isNoHotelAvailableEntry(entry): boolean {
    const hotelName = String(entry?.hotelName || '').trim().toLowerCase();
    const hotelCode = getHotelCodeForBooking(entry);
    const provider = normalizeHotelProvider(entry);
    const availabilityStatus = String(entry?.availabilityStatus || '').trim().toUpperCase();

    return (
      entry?.externalStay === true ||
      entry?.isBookable === false ||
      availabilityStatus === 'NO_SUPPLIER_AVAILABILITY' ||
      availabilityStatus === 'NOT_BOOKABLE' ||
      provider === 'external' ||
      provider === 'none' ||
      provider === 'self-arranged' ||
      hotelName === 'no hotels available' ||
      !hotelCode ||
      hotelCode === '0'
    );
  }

  const resolveConfirmNationality = (plan, fallbackNationality: string = 'IN'): string => {
    const explicitIso2 = String(
      plan?.nationality_iso2 ||
      plan?.nationality_shortname ||
      plan?.guestNationality ||
      '',
    )
      .trim()
      .toUpperCase();
    if (/^[A-Z]{2}$/.test(explicitIso2)) {
      return explicitIso2;
    }

    const rawNationality = plan?.nationality;
    if (typeof rawNationality === 'string' && /^[A-Z]{2}$/i.test(rawNationality.trim())) {
      return rawNationality.trim().toUpperCase();
    }

    const legacyMap: Record<number, string> = {
      284: 'AE',
      229: 'NO',
      101: 'IN',
      177: 'IN',
    };
    const mapped = legacyMap[Number(rawNationality || 0)];
    const fallback = String(fallbackNationality || 'IN').trim().toUpperCase();
    return mapped || (/^[A-Z]{2}$/.test(fallback) ? fallback : 'IN');
  };
  const getPassengerFieldError = (
    label: 'adult' | 'child' | 'infant',
    index: number,
    field: 'title' | 'name' | 'age' | 'nationality',
  ) => formErrors[`${label}-${index}-${field}`];

  useEffect(() => {
    prebookDataRef.current = prebookData;
  }, [prebookData]);

  useEffect(() => {
    if (!shouldShowHotels) {
      setHotelDetails(null);
      setSelectedHotelBookings({});
      setActiveHotelGroupType(null);
      setPrebookData(null);
      prebookDataRef.current = null;
      setHasAcceptedUpdatedPrice(false);
      setConfirmOccupanciesTemplate(null);
    }
  }, [shouldShowHotels, itinerary?.planId]);

  // Cancellation modal state
  const [cancelModalOpen, setCancelModalOpen] = useState(false);

  const defaultPassenger = (title: string): AdditionalPassenger => ({
    title,
    name: '',
    age: '',
    nationality: guestDetails.nationality,
    panNo: '',
    passportNo: '',
  });

  const buildTboOccupancies = (
    roomCount: number,
    totalAdults: number,
    childAges: number[],
  ): Array<{ adults: number; children: number; childrenAges: number[] }> => {
    const rooms = Math.max(Number(roomCount) || 1, 1);
    const occupancies = Array.from({ length: rooms }, () => ({
      adults: 1,
      children: 0,
      childrenAges: [] as number[],
    }));

    let adultsLeft = Math.max(totalAdults - rooms, 0);
    let roomIndex = 0;
    while (adultsLeft > 0) {
      if (occupancies[roomIndex].adults < 8) {
        occupancies[roomIndex].adults += 1;
        adultsLeft -= 1;
      }
      roomIndex = (roomIndex + 1) % rooms;
    }

    for (const age of childAges) {
      let assigned = false;
      for (let offset = 0; offset < rooms; offset++) {
        const idx = (roomIndex + offset) % rooms;
        if (occupancies[idx].children < 4) {
          occupancies[idx].children += 1;
          occupancies[idx].childrenAges.push(age);
          roomIndex = (idx + 1) % rooms;
          assigned = true;
          break;
        }
      }
      if (!assigned) {
        break;
      }
    }

    return occupancies;
  };

  const buildSupplierOccupancies = (
    roomCount: number,
    totalAdults: number,
    totalChildren: number,
    childAges: number[] = [],
  ): Array<{ adults: number; children: number; childrenAges: number[] }> => {
    if (childAges.length > 0) {
      return buildTboOccupancies(roomCount, totalAdults, childAges);
    }

    const rooms = Math.max(Number(roomCount) || 1, 1);
    const occupancies = Array.from({ length: rooms }, () => ({
      adults: 1,
      children: 0,
      childrenAges: [] as number[],
    }));

    let adultsLeft = Math.max(totalAdults - rooms, 0);
    let roomIndex = 0;
    while (adultsLeft > 0) {
      if (occupancies[roomIndex].adults < 8) {
        occupancies[roomIndex].adults += 1;
        adultsLeft -= 1;
      }
      roomIndex = (roomIndex + 1) % rooms;
    }

    let childrenLeft = Math.max(totalChildren, 0);
    let nextChildRoom = 0;
    while (childrenLeft > 0) {
      let assigned = false;
      for (let offset = 0; offset < rooms; offset++) {
        const idx = (nextChildRoom + offset) % rooms;
        if (occupancies[idx].children < 4) {
          occupancies[idx].children += 1;
          occupancies[idx].childrenAges.push(7);
          childrenLeft -= 1;
          nextChildRoom = (idx + 1) % rooms;
          assigned = true;
          break;
        }
      }
      if (!assigned) {
        break;
      }
    }

    return occupancies;
  };

  const buildOccupanciesFromTravellers = (
    travellers: any[],
    fallbackRooms: number,
  ): Array<{ adults: number; children: number; childrenAges: number[] }> => {
    const rooms = Math.max(Number(fallbackRooms) || 1, 1);
    const byRoom = new Map<number, { adults: number; children: number; childrenAges: number[] }>();

    for (const t of Array.isArray(travellers) ? travellers : []) {
      const roomIdRaw = Number((t as any)?.room_id ?? (t as any)?.roomId ?? 1);
      const roomId = Number.isFinite(roomIdRaw) && roomIdRaw > 0 ? roomIdRaw : 1;
      const paxType = Number((t as any)?.traveller_type ?? (t as any)?.travellerType ?? 0);
      const age = Number((t as any)?.traveller_age ?? (t as any)?.travellerAge);

      if (!byRoom.has(roomId)) {
        byRoom.set(roomId, { adults: 0, children: 0, childrenAges: [] });
      }

      const occ = byRoom.get(roomId)!;
      if (paxType === 1) {
        occ.adults += 1;
      } else if (paxType === 2) {
        occ.children += 1;
        if (Number.isFinite(age) && age >= 0 && age <= 11) {
          occ.childrenAges.push(Math.trunc(age));
        }
      }
    }

    const maxRoomId = Math.max(rooms, ...Array.from(byRoom.keys()), 1);
    return Array.from({ length: maxRoomId }, (_, idx) => {
      const roomNo = idx + 1;
      const occ = byRoom.get(roomNo) || { adults: 0, children: 0, childrenAges: [] };
      return {
        adults: Math.max(occ.adults, 1),
        children: Math.max(occ.children, 0),
        childrenAges: occ.childrenAges.slice(0, occ.children),
      };
    });
  };

const applyChildAgesToTemplate = (
  template: Array<{ adults: number; children: number; childrenAges: number[] }>,
  childAges: number[],
): Array<{ adults: number; children: number; childrenAges: number[] }> => {
    const agesPool = [...childAges];
    return template.map((occ) => {
      const ages: number[] = [];
      for (let i = 0; i < Math.max(occ.children, 0); i++) {
        const nextAge = agesPool.length > 0 ? Number(agesPool.shift()) : Number(occ.childrenAges?.[i]);
        ages.push(Number.isFinite(nextAge) && nextAge >= 0 && nextAge <= 11 ? Math.trunc(nextAge) : 7);
      }
      return {
        adults: Math.max(Number(occ.adults || 1), 1),
        children: Math.max(Number(occ.children || 0), 0),
        childrenAges: ages,
      };
    });
  };


  function buildOccupancyPreview(
    roomCount: number,
    totalAdults: number,
    totalChildren: number,
  ): Array<{ adults: number; children: number }> {
    const rooms = Math.max(Number(roomCount) || 1, 1);
    const occupancies = Array.from({ length: rooms }, () => ({
      adults: 1,
      children: 0,
    }));

    let adultsLeft = Math.max(totalAdults - rooms, 0);
    let roomIndex = 0;
    while (adultsLeft > 0) {
      if (occupancies[roomIndex].adults < 8) {
        occupancies[roomIndex].adults += 1;
        adultsLeft -= 1;
      }
      roomIndex = (roomIndex + 1) % rooms;
    }

    let childrenLeft = Math.max(totalChildren, 0);
    let nextChildRoom = 0;
    while (childrenLeft > 0) {
      let assigned = false;
      for (let offset = 0; offset < rooms; offset++) {
        const idx = (nextChildRoom + offset) % rooms;
        if (occupancies[idx].children < 4) {
          occupancies[idx].children += 1;
          childrenLeft -= 1;
          nextChildRoom = (idx + 1) % rooms;
          assigned = true;
          break;
        }
      }
      if (!assigned) {
        break;
      }
    }

    return occupancies;
  }

  const normalizeNameParts = (name: string) => {
    const trimmed = name.trim();
    const parts = trimmed.split(/\s+/).filter(Boolean);
    const firstName = parts[0] || trimmed;
    const lastName = parts.slice(1).join(' ') || firstName;
    return { firstName, lastName };
  };

  const validateNameParts = (name: string) => {
    const parts = normalizeNameParts(name);
    if (!isValidPassengerName(parts.firstName) || !isValidPassengerName(parts.lastName)) {
      return false;
    }
    return true;
  };

  const getSafeErrorMessage = (error: unknown, fallback: string) => {
    const text = String((error as any)?.message || fallback);
    if (/session expired|stale|availability changed|booking code invalid|price changed/i.test(text)) {
      return 'This hotel session has expired or rates changed. Please refresh hotel selection and run prebook again.';
    }
    return text;
  };

  const normalizePrebookItems = (value): string[] => {
    if (!value) {
      return [];
    }
    const list = Array.isArray(value) ? value : [value];
    return list
      .map((item) => {
        if (typeof item === 'string') {
          return item;
        }
        return item?.name || item?.text || item?.description || JSON.stringify(item);
      })
      .map((text) => String(text || '').trim())
      .filter(Boolean);
  };

  const resolvePrebookInclusions = (hotel): string[] => {
    const candidateLists = [
      hotel?.inclusions,
      hotel?.Inclusions,
      hotel?.inclusion,
      hotel?.Inclusion,
      hotel?.facilities,
      hotel?.Facilities,
      hotel?.rooms?.[0]?.inclusion,
      hotel?.rooms?.[0]?.Inclusion,
      hotel?.Rooms?.[0]?.inclusion,
      hotel?.Rooms?.[0]?.Inclusion,
    ];

    const merged = candidateLists.flatMap((value) => normalizePrebookItems(value));
    return Array.from(new Set(merged.map((item) => String(item || '').trim()).filter(Boolean)));
  };

  const resolvePrebookMealPlan = (hotel): string => {
    const direct = [
      hotel?.mealPlan,
      hotel?.MealPlan,
      hotel?.mealType,
      hotel?.MealType,
      hotel?.meal_type,
      hotel?.mealTypeName,
      hotel?.MealTypeName,
      hotel?.boardType,
      hotel?.BoardType,
      hotel?.boardBasis,
      hotel?.BoardBasis,
      hotel?.room?.mealType,
      hotel?.room?.MealType,
      hotel?.Room?.mealType,
      hotel?.Room?.MealType,
      hotel?.rooms?.[0]?.mealType,
      hotel?.rooms?.[0]?.MealType,
      hotel?.rooms?.[0]?.boardBasis,
      hotel?.Rooms?.[0]?.mealType,
      hotel?.Rooms?.[0]?.MealType,
      hotel?.Rooms?.[0]?.boardBasis,
    ];

    for (const value of direct) {
      const text = String(value || '').trim();
      if (text) {
        return text;
      }
    }

    const inclusionText = resolvePrebookInclusions(hotel).join(' ').toLowerCase();
    if (inclusionText.includes('full board')) return 'Full Board';
    if (inclusionText.includes('half board')) return 'Half Board';
    if (inclusionText.includes('room only') || inclusionText.includes('no meals')) return 'Room Only';
    if (inclusionText.includes('breakfast')) return 'Breakfast Included';

    return '';
  };

  const normalizeCancellationPolicyItems = (value): string[] => {
    if (!value) {
      return [];
    }

    const chargeLabel = (chargeType: string, amount) => {
      const normalizedType = String(chargeType || '').toLowerCase();
      const num = Number(amount);
      const safeAmount = Number.isFinite(num) ? num : amount;
      if (normalizedType === 'percentage' || normalizedType === '2') {
        return `${safeAmount}%`;
      }
      if (normalizedType === 'fixed' || normalizedType === '1') {
        return `INR ${safeAmount}`;
      }
      return String(safeAmount);
    };

    const formatEntry = (item) => {
      if (!item) return '';

      if (typeof item === 'string') {
        const trimmed = item.trim();
        if (!trimmed) return '';

        if ((trimmed.startsWith('{') && trimmed.endsWith('}')) || (trimmed.startsWith('[') && trimmed.endsWith(']'))) {
          try {
            const parsed = JSON.parse(trimmed);
            if (Array.isArray(parsed)) {
              return parsed
                .map((p) => formatEntry(p))
                .filter(Boolean)
                .join('\n');
            }
            return formatEntry(parsed);
          } catch {
            return trimmed;
          }
        }

        // Handle legacy TBO concatenated strings
        if (trimmed.includes('#^#') || trimmed.includes('#!#')) {
          return trimmed
            .replace(/#\^#|#!#/g, '')
            .split('|')
            .map((part) => part.trim())
            .filter(Boolean)
            .join('\n');
        }

        return trimmed;
      }

      const fromDate = item.FromDate || item.fromDate || item.startDate || '-';
      const chargeType = item.ChargeType || item.chargeType || '-';
      const cancellationCharge =
        item.CancellationCharge ?? item.cancellationCharge ?? item.Charge ?? item.charge ?? '-';

      return `From ${fromDate} | ${chargeType} | Charge: ${chargeLabel(chargeType, cancellationCharge)}`;
    };

    const list = Array.isArray(value) ? value : [value];
    return list
      .flatMap((item) => {
        const formatted = formatEntry(item);
        return formatted ? formatted.split('\n') : [];
      })
      .map((item) => item.trim())
      .filter(Boolean);
  };

  // Hotel voucher modal state
  const [hotelVoucherModalOpen, setHotelVoucherModalOpen] = useState(false);
  const [selectedHotelForVoucher, setSelectedHotelForVoucher] = useState<HotelVoucherItem | null>(null);

  // Refresh hotel data after hotel update
  const refreshHotelData = useCallback(async () => {
    if (!quoteId) return;

    try {
      setLoadingHotels(true);
      console.log("🔄 [ItineraryDetails] Starting hotel data refresh for quoteId:", quoteId);
      const detailsRes = await ItineraryService.getDetails(quoteId);
      const details = detailsRes as ItineraryDetailsResponse;
      setItinerary(details);

      const pref = Number(details.itineraryPreference ?? 3);
      const useHotels = pref === 1 || pref === 3;

      if (useHotels) {
        const hotelRes = await loadHotelDetailsForItinerary(quoteId, details);
        console.log("✅ [ItineraryDetails] Hotel data received:", { detailsRes, hotelRes });
        setHotelDetails(hotelRes as ItineraryHotelDetailsResponse | null);
        cacheRouteHotelDetails(quoteId, hotelRes as ItineraryHotelDetailsResponse | null);
      } else {
        setHotelDetails(null);
        setActiveHotelListTotal(0);
      }
      console.log("✅ [ItineraryDetails] State updated with new hotel data");
    } catch (e) {
      console.error("❌ [ItineraryDetails] Failed to refresh hotel data", e);
    } finally {
      setLoadingHotels(false);
    }
  }, [quoteId, cacheRouteHotelDetails, loadHotelDetailsForItinerary]);

  const {
    handleCancelVoucherItems,
    handleCancelVoucherSingle,
    handleCreateVoucher,
    handleGetSaveFunction,
  } = useHotelVoucherController({
    itineraryPlanId: Number(itinerary?.planId || 0),
    hotelSaveFunctionRef,
    refreshHotelData,
    setHotelVoucherModalOpen,
    setSelectedHotelForVoucher,
  });

  const handleHotelSelectionsChange = useCallback((selections: Record<number, {
    provider: string;
    hotelCode: string;
    bookingCode: string;
    roomType: string;
    netAmount: number;
    hotelName: string;
    checkInDate: string;
    checkOutDate: string;
    groupType: number;
    mealPlan?: string;
    searchReference?: string;
    roomId?: string;
    rateId?: string;
    multiNightBooking?: boolean;
    stayKey?: string;
    routeIds?: number[];
    nights?: number;
    nightlyRates?: Array<{
      date: string;
      amountAfterTax: number;
      baseAmount?: number;
      extraAdultCount?: number;
      extraChildCount?: number;
      extraAdultRate?: number;
      extraChildRate?: number;
    }>;
    totalAmountAfterTax?: number;
  } | null>) => {
    setSelectedHotelBookings((prev) => {
      const next: Record<number, any> = { ...prev };

      Object.entries(selections).forEach(([routeIdRaw, value]) => {
        const routeIdNum = Number(routeIdRaw);

        if (!Number.isFinite(routeIdNum) || routeIdNum <= 0) {
          return;
        }

        if (value === null) {
          delete next[routeIdNum];
          return;
        }

        next[routeIdNum] = {
          ...(next[routeIdNum] || {}),
          ...value,
          routeId: Number((value as any)?.routeId || routeIdNum),
        };
      });

      const canonicalParents = new Map<number, any>();

      Object.entries(next).forEach(([routeIdRaw, booking]) => {
        const routeIdNum = Number(routeIdRaw);
        const routeIds = Array.isArray((booking as any)?.routeIds)
          ? (booking as any).routeIds
              .map((id) => Number(id))
              .filter((id: number) => Number.isFinite(id) && id > 0)
          : [];

        if (
          !(booking as any)?.multiNightBooking ||
          !routeIdNum ||
          routeIds.length <= 1
        ) {
          return;
        }

        const canonicalRouteId = routeIds[0];
        const currentParent = canonicalParents.get(canonicalRouteId);
        const normalizedBooking = {
          ...(booking as any),
          routeId: canonicalRouteId,
          routeIds,
        };

        if (!currentParent || routeIdNum === canonicalRouteId) {
          canonicalParents.set(canonicalRouteId, normalizedBooking);
        }
      });

      canonicalParents.forEach((parentBooking, canonicalRouteId) => {
        const routeIds = Array.isArray(parentBooking.routeIds)
          ? parentBooking.routeIds
              .map((id) => Number(id))
              .filter((id: number) => Number.isFinite(id) && id > 0)
          : [];

        routeIds.forEach((routeId: number) => {
          if (routeId !== canonicalRouteId) {
            delete next[routeId];
          }
        });

        next[canonicalRouteId] = parentBooking;
      });

      return next;
    });
    console.log('🏨 Hotel selections updated from HotelList:', selections);
  }, []);

  const { handleVehicleSelectedTotalChange } = useVehicleSelectionTotalsController({
    setSelectedVehicleTotalsByType,
  });

  const shouldShowRebuildHotelsButton = useMemo(() => {
    if (!hotelDetails?.hotels?.length) return false;
    if (hotelDetails.hotelAvailability?.isPlaceholderOnly) return true;
    return hotelDetails.hotels.every((h) => !isSupplierBookableHotel(h));
  }, [hotelDetails]);

  const {
    handleHotelGroupTypeChange,
    handleRebuildHotels,
    refreshVehicleData,
  } = useHotelDataController({
    quoteId: quoteId || null,
    activeHotelGroupType,
    isRebuildingHotels,
    setActiveHotelGroupType,
    setActiveHotelListTotal,
    setHotelDetails,
    setIsRebuildingHotels,
    setItinerary,
    setLoadingHotels,
    cacheRouteHotelDetails,
    fetchCompleteHotelDetails,
    loadHotelDetailsForItinerary,
  });

  const hasUsableVehicleRows = useCallback((details: ItineraryDetailsResponse | null | undefined) => {
    const vehicles = Array.isArray(details?.vehicles) ? details.vehicles : [];
    if (!vehicles.length) return false;
    return vehicles.some((vehicle) => {
      const vendorEligibleId = Number(vehicle?.vendorEligibleId || 0);
      const vehicleTypeId = Number(vehicle?.vehicleTypeId || 0);
      const totalAmount = Number(vehicle?.totalAmount);
      const vendorName = String(vehicle?.vendorName || "").trim();
      const vehicleOrigin = String(vehicle?.vehicleOrigin || "").trim();
      return (
        vendorEligibleId > 0 &&
        vehicleTypeId > 0 &&
        Number.isFinite(totalAmount) &&
        (vendorName.length > 0 || vehicleOrigin.length > 0)
      );
    });
  }, []);

  const loadPreparedItineraryPage = useCallback(async (requestedQuoteId: string, forceVehicleRebuild = false) => {
  isMountedRef.current = true;
  const loadRequestId = ++latestRouteRequestRef.current;

  setLoading(true);
  setLoadingHotels(true);
  setPageReady(false);
    setError(null);
    setVehicleBuildError(null);

    try {
      setPageLoaderHistory([]);
      pushPageLoaderStage("Building itinerary details");
      const detailsRes = await getDetailsDeduped(requestedQuoteId);
      const initialDetails = detailsRes as ItineraryDetailsResponse;
      const itineraryPreference = Number(initialDetails.itineraryPreference ?? 3);
      const useHotels = itineraryPreference === 1 || itineraryPreference === 3;
      const useVehicles = itineraryPreference === 2 || itineraryPreference === 3;
      const planId = Number(initialDetails.planId || 0);

      const finalizePage = async (details: ItineraryDetailsResponse) => {
        let hotelRes: ItineraryHotelDetailsResponse | null = null;
        if (useHotels) {
          pushPageLoaderStage("Loading hotel selections");
          hotelRes = await loadHotelDetailsForItinerary(requestedQuoteId, details);
        }

if (!isMountedRef.current || latestRouteRequestRef.current !== loadRequestId) return;

setItinerary(details);
        setHotelDetails(hotelRes as ItineraryHotelDetailsResponse | null);
        cacheRouteHotelDetails(requestedQuoteId, hotelRes as ItineraryHotelDetailsResponse | null);
        if (!useHotels) {
          setActiveHotelListTotal(0);
        }
        setVehicleBuildStatus(useVehicles ? "READY" : "READY");
        setPageReady(true);
      };

      if (!useVehicles || !planId) {
        await finalizePage(initialDetails);
        return;
      }

      const extractRouteOptionQuoteId = (option) =>
  String(
    option?.quoteId ||
      option?.routeQuoteId ||
      option?.quotationNo ||
      option?.quotation_no ||
      option?.itinerary_quote_ID ||
      option?.itinerary_quote_id ||
      option?.quote_id ||
      (typeof option === "string" ? option : "")
  ).trim();

let storedRouteOptions: any[] = [];
if (typeof window !== "undefined") {
  try {
    const storedRouteOptionsRaw = localStorage.getItem(
      `itinerary-route-options:${requestedQuoteId}`
    );
    const parsedStoredRouteOptions = storedRouteOptionsRaw
      ? JSON.parse(storedRouteOptionsRaw)
      : [];
    storedRouteOptions = Array.isArray(parsedStoredRouteOptions)
      ? parsedStoredRouteOptions
      : [];
  } catch {
    storedRouteOptions = [];
  }
}

const routeOptionQuoteIds = [
  ...((Array.isArray((initialDetails as any)?.routeOptions)
    ? (initialDetails as any).routeOptions
    : []) as any[]),
  ...((Array.isArray((initialDetails as any)?.suggestedRoutes)
    ? (initialDetails as any).suggestedRoutes
    : []) as any[]),
  ...((Array.isArray((initialDetails as any)?.siblingRoutes)
    ? (initialDetails as any).siblingRoutes
    : []) as any[]),
  ...storedRouteOptions,
]
  .map(extractRouteOptionQuoteId)
  .filter((id) => id && id.startsWith("DVI"));

const isSuggestedRouteItinerary =
  new Set(routeOptionQuoteIds).size > 1;

const shouldStrictlyRequireVehicleBuild =
  forceVehicleRebuild || isSuggestedRouteItinerary;

try {
  pushPageLoaderStage("Checking vehicle build status");
  const buildStatus: any = await ItineraryService.getVehicleBuildStatus(planId);
  const normalizedStatus = (["PENDING", "PROCESSING", "READY", "FAILED"].includes(String(buildStatus?.status || "").toUpperCase())
    ? String(buildStatus?.status || "").toUpperCase()
    : "PENDING") as "PENDING" | "PROCESSING" | "READY" | "FAILED";
  setVehicleBuildStatus(normalizedStatus);
  setVehicleBuildError(String(buildStatus?.error || "") || null);

  const isLatestBuildReady = Boolean(buildStatus?.isLatestBuildReady);
  if (!forceVehicleRebuild && isLatestBuildReady && hasUsableVehicleRows(initialDetails)) {
    await finalizePage(initialDetails);
    return;
  }

  pushPageLoaderStage("Building permit charges");
  await ItineraryService.buildPermitsSync(planId);

  pushPageLoaderStage("Building vehicle details and pricing");
  const vehicleBuildResult: any = await ItineraryService.buildVehiclesSync(planId);
  const vehicleBuildState = String(vehicleBuildResult?.status || "FAILED").toUpperCase();
  if (vehicleBuildState !== "READY") {
    throw new Error(String(vehicleBuildResult?.error || "Vehicle pricing failed to prepare"));
  }
  setVehicleBuildStatus("READY");

  pushPageLoaderStage("Loading completed itinerary");
  const finalDetailsRes = await ItineraryService.getDetails(requestedQuoteId);
  const finalDetails = finalDetailsRes as ItineraryDetailsResponse;
  if (!hasUsableVehicleRows(finalDetails)) {
    throw new Error("Vehicle details are still incomplete after rebuild");
  }

  await finalizePage(finalDetails);
} catch (vehicleBuildError) {
  if (shouldStrictlyRequireVehicleBuild) {
    throw vehicleBuildError;
  }

  console.warn(
    "Vehicle build failed for non-suggested itinerary. Showing itinerary details without blocking the page.",
    vehicleBuildError
  );

  setVehicleBuildStatus("READY");
  setVehicleBuildError(
    vehicleBuildError?.message || "Vehicle pricing failed to prepare"
  );

  await finalizePage(initialDetails);
}
    } catch (e) {
      if (!isMountedRef.current) return;
      console.error("Failed to load staged itinerary details", e);
      setVehicleBuildStatus("FAILED");
      setVehicleBuildError(e?.message || "Vehicle pricing failed to prepare");
      setError(e?.message || "Failed to load itinerary details");
      setItinerary(null);
      setHotelDetails(null);
      setPageReady(false);
   } finally {
  if (latestRouteRequestRef.current === loadRequestId) {
    currentFetchRef.current = null;
    if (isMountedRef.current) {
      setLoading(false);
      setLoadingHotels(false);
    }
  }
}
  }, [cacheRouteHotelDetails, hasUsableVehicleRows, loadHotelDetailsForItinerary, pushPageLoaderStage]);

  useEffect(() => {
    if (!quoteId) {
      setError("Missing quote id in URL");
      setLoading(false);
      return;
    }

    // Prevent wrong API call when this component is opened on confirmed route
    if (location.pathname.startsWith("/confirmed-itinerary/")) {
      console.warn(
        "⚠️ ItineraryDetails mounted on confirmed itinerary route. Skipping getDetails() call.",
        { quoteId, pathname: location.pathname }
      );
      setLoading(false);
      return;
    }

    // If we're already fetching this quoteId, skip duplicate fetch
    // If we're already fetching this quoteId, skip duplicate fetch
if (currentFetchRef.current === quoteId) {
  console.log("🔄 [ItineraryDetails] Already fetching quoteId:", quoteId, "- skipping duplicate");
  return;
}

// If route tab click already started loading this quoteId, skip the re-fetch caused by URL change.
if (switchedRouteRef.current === quoteId) {
  console.log("⚡ [ItineraryDetails] Route already loading from tab switch, skipping duplicate re-fetch:", quoteId);
  // The URL changed, so the previous effect cleanup may have marked this ref false.
  // Keep it true because the route-tab handler is still loading this same page.
  isMountedRef.current = true;
  switchedRouteRef.current = null;
  return;
}

// React StrictMode can mount/effect twice in dev; keep the initial staged load single-shot.
    if (autoLoadStartedQuotes.has(quoteId)) {
      return;
    }
    autoLoadStartedQuotes.add(quoteId);

    // Mark that we're fetching this quoteId
    currentFetchRef.current = quoteId;
    isMountedRef.current = true;

    void loadPreparedItineraryPage(quoteId);

    // Cleanup: Mark component as unmounted
    return () => {
      isMountedRef.current = false;
      currentFetchRef.current = null;
      if (quoteId) {
        autoLoadStartedQuotes.delete(quoteId);
      }
    };
  }, [quoteId, location.pathname, loadPreparedItineraryPage]);

  /**
   * ⚡ Lazy-load hotel details when needed (e.g., when user opens hotel selection)
   * This prevents the initial page load from making the unnecessary second API call
   */
  const ensureHotelDetailsLoaded = async () => {
    if (hotelDetails) {
      // Already loaded
      return hotelDetails;
    }

    if (!quoteId) return null;

    try {
      setLoadingHotels(true);
      if (!itinerary) return null;
      const hotelRes = await loadHotelDetailsForItinerary(quoteId, itinerary);

      setHotelDetails(hotelRes as ItineraryHotelDetailsResponse | null);
      return hotelRes;
    } catch (error) {
      console.error("Failed to load hotel details", error);
      toast.error("Failed to load hotel details");
      return null;
    } finally {
      setLoadingHotels(false);
    }
  };

  const handleDeleteHotspot = async () => {
    if (!deleteHotspotModal.planId || !deleteHotspotModal.routeId || !deleteHotspotModal.routeHotspotId) {
      return;
    }

    setIsDeleting(true);
    try {
      const deletedMasterHotspotId = Number(deleteHotspotModal.masterHotspotId || 0);
      const deletedRouteId = Number(deleteHotspotModal.routeId);
      const planId = Number(deleteHotspotModal.planId || itinerary?.planId || 0);
      const confirmedRouteId = deletedRouteId;

      await ItineraryService.deleteHotspot(
        deleteHotspotModal.planId,
        deleteHotspotModal.routeId,
        deleteHotspotModal.routeHotspotId
      );

      toast.success("Hotspot deleted successfully");

      // Update local state immediately before reload
      // Remove from modal added set
      setAddedInModalHotspotIds((prev) => {
        const next = new Set(prev);
        if (deletedMasterHotspotId > 0) {
          next.delete(deletedMasterHotspotId);
        }
        return next;
      });

      // Add to excluded set
      if (deletedMasterHotspotId > 0) {
        setExcludedHotspotIds((prev) =>
          Array.from(new Set([...prev.map(Number), deletedMasterHotspotId]))
        );
      }

      // Update itinerary to remove deleted attraction segment
      setItinerary((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          days: prev.days.map((day) => {
            if (Number(day.id) !== deletedRouteId) return day;
            return {
              ...day,
              segments: day.segments.filter((seg) => {
                if (String(seg?.type || '').toLowerCase() !== 'attraction') return true;
                const attraction = seg as AttractionSegment;
                const segHotspotId = Number(attraction?.hotspotId ?? attraction?.locationId ?? 0);
                if (deletedMasterHotspotId <= 0) return true;
                return segHotspotId !== deletedMasterHotspotId;
              }),
            };
          }),
        };
      });

      // Also immediately update availableHotspots if modal is already open
      setAvailableHotspots((prev) =>
        prev.map((row) =>
          Number(row.id) === deletedMasterHotspotId
            ? {
                ...row,
                alreadyAdded: false,
                availabilityStatus: 'EXCLUDED_BY_ROUTE',
                actionDisabled: false,
                buttonLabel: 'Preview',
              }
            : row
        )
      );

      // Close modal
      setDeleteHotspotModal({
        open: false,
        planId: null,
        routeId: null,
        routeHotspotId: null,
        masterHotspotId: null,
        hotspotName: "",
        hotspotWasPrebuilt: false,
      });

      // Show rebuild button only when a prebuilt hotspot was deleted.
      if (deleteHotspotModal.hotspotWasPrebuilt && deleteHotspotModal.routeId) {
        setRouteNeedsRebuild(deleteHotspotModal.routeId);
      }

      // Reload itinerary data
      if (quoteId) {
        const [detailsRes, hotelRes] = await Promise.all([
          ItineraryService.getDetails(quoteId),
          shouldShowHotels ? ItineraryService.getHotelDetails(quoteId) : Promise.resolve(null),
        ]);
        const refreshedDetails = detailsRes as ItineraryDetailsResponse;
        setItinerary(refreshedDetails);
        setHotelDetails(hotelRes as ItineraryHotelDetailsResponse);

        if (addHotspotModal.open && confirmedRouteId > 0) {
          try {
            const refreshedRoute = refreshedDetails?.days?.find(
              (day) => Number(day?.id || 0) === confirmedRouteId,
            );

            const refreshedActiveIds = new Set<number>(
              (Array.isArray((refreshedRoute as any)?.segments)
                ? (refreshedRoute as any).segments
                : []
              )
                .filter((seg) => String(seg?.type || '').toLowerCase() === 'attraction')
                .filter((seg) => {
                  const deletedLike =
                    seg?.isDeleted === true ||
                    seg?.deleted === true ||
                    seg?.isExcluded === true ||
                    seg?.excluded === true ||
                    seg?.removed === true ||
                    seg?.deletedAt != null ||
                    seg?.deleted_at != null ||
                    String(seg?.status || '').toLowerCase() === 'deleted' ||
                    String(seg?.status || '').toLowerCase() === 'excluded';

                  return !deletedLike;
                })
                .map((seg) => Number(seg?.hotspotId ?? seg?.locationId ?? 0))
                .filter((id: number) => Number.isFinite(id) && id > 0),
            );

            const refreshedExcludedIds: number[] = Array.isArray((refreshedRoute as any)?.excluded_hotspot_ids)
              ? (refreshedRoute as any).excluded_hotspot_ids.map(Number)
              : [];

            const hotspotResponse = selectedHotspotAnchor
              ? await ItineraryService.getAvailableHotspotsForAnchor({
                  planId,
                  routeId: confirmedRouteId,
                  anchorType: selectedHotspotAnchor.anchorType,
                  anchorIndex: Number(selectedHotspotAnchor.anchorIndex),
                })
              : await ItineraryService.getAvailableHotspots(confirmedRouteId);

            const refreshedHotspots = Array.isArray(hotspotResponse)
              ? hotspotResponse
              : (Array.isArray((hotspotResponse as any)?.hotspots)
                ? (hotspotResponse as any).hotspots
                : []);

            const responseFilterMeta = Array.isArray(hotspotResponse)
              ? null
              : ((hotspotResponse as any)?.hotspotFilterMeta || null);

            const routeSourceName = String((refreshedRoute as any)?.departure || '').trim();
            const routeDestinationName = String((refreshedRoute as any)?.arrival || '').trim();
            const anchorFromName = String(selectedHotspotAnchor?.anchorFrom || '').trim();
            const anchorToName = String(selectedHotspotAnchor?.anchorTo || '').trim();

            const routePairFilteredHotspots = filterAvailableHotspotsForAnchor(
              refreshedHotspots as AvailableHotspot[],
              routeSourceName,
              routeDestinationName,
              anchorFromName,
              anchorToName,
            );

            setHotspotFilterMeta(responseFilterMeta);
            setExcludedHotspotIds(refreshedExcludedIds);
            setAvailableHotspots(
              normalizeAvailableHotspots(routePairFilteredHotspots, {
                routeId: confirmedRouteId,
                excludedIds: refreshedExcludedIds,
                activeIds: refreshedActiveIds,
              }),
            );
          } catch (refreshError) {
            console.warn('[FitHereConfirm] Modal hotspot refresh failed after confirm', refreshError);
          }
        }
      }
    } catch (e) {
      console.error("Failed to delete hotspot", e);
      toast.error(e?.message || "Failed to delete hotspot");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleRebuildRoute = async (planId: number, routeId: number) => {
    console.log('[REBUILD_ROUTE_CLICK]', {
      quoteId,
      planId: itinerary?.planId,
      clickedRouteId: routeId,
      currentDayIds: itinerary?.days?.map((d) => ({
        dayNumber: d.dayNumber,
        id: d.id,
        needsRebuild: d.needsRebuild,
        excludedHotspotIds: d.excludedHotspotIds,
      })),
    });
    const currentRouteIds = new Set((itinerary?.days || []).map((d) => Number(d.id)));
    if (!currentRouteIds.has(Number(routeId))) {
      if (quoteId) {
        const detailsRes = await ItineraryService.getDetails(quoteId);
        setItinerary(detailsRes as ItineraryDetailsResponse);
      }
      toast.error('Itinerary changed. Please try rebuild again.');
      return;
    }

    setIsRebuilding(true);
    const rebuildDay = itinerary?.days?.find((d) => Number(d?.id) === Number(routeId)) || null;
    const rebuildDayNumber = Number(rebuildDay?.dayNumber || 0);
    const rebuildEstimateMs = Math.max(12000, getRouteTimeUpdateEstimateMs(rebuildDayNumber || 1));
    setRouteProgressTitle(rebuildDayNumber > 0 ? `Rebuilding Day ${rebuildDayNumber} route` : "Rebuilding route");
    setRouteProgressHistory([]);
    setRouteTimeEstimatedMs(rebuildEstimateMs);
    startRouteTimeProgress(rebuildEstimateMs);
    pushRouteProgressStage(
      rebuildDayNumber > 0 ? `Submitting rebuild request for Day ${rebuildDayNumber}` : "Submitting rebuild request",
      rebuildDayNumber > 0
        ? `Recomputing the saved route sequence, timings, and travel legs for Day ${rebuildDayNumber}.`
        : "Recomputing the saved route sequence, timings, and travel legs.",
    );
    try {
      await ItineraryService.rebuildRoute(planId, routeId);
      pushRouteProgressStage(
        rebuildDayNumber > 0 ? `Reloading rebuilt Day ${rebuildDayNumber} itinerary` : "Reloading rebuilt itinerary",
        "Fetching the rebuilt timeline and updated route details from the backend.",
      );
      toast.success("Route rebuilt successfully");

      // Reload itinerary data
      if (quoteId) {
        const [detailsRes, hotelRes] = await Promise.all([
          ItineraryService.getDetails(quoteId),
          shouldShowHotels ? ItineraryService.getHotelDetails(quoteId) : Promise.resolve(null),
        ]);
        const nextItinerary = detailsRes as ItineraryDetailsResponse;
        setItinerary(nextItinerary);
        setHotelDetails(hotelRes as ItineraryHotelDetailsResponse);
        pushRouteProgressStage(
          rebuildDayNumber > 0 ? `Applying rebuilt Day ${rebuildDayNumber} timeline` : "Applying rebuilt timeline",
          "Refreshing the page with the rebuilt route, distances, and latest totals.",
        );
        const rebuiltDay = Array.isArray((nextItinerary as any)?.days)
          ? (nextItinerary as any).days.find((d) => Number(d?.id) === Number(routeId))
          : null;
        if (rebuiltDay && (rebuiltDay as any).needsRebuild !== true) {
          setRouteNeedsRebuild((prev) => (Number(prev) === Number(routeId) ? null : prev));
        }
      }
    } catch (e) {
      console.error("Failed to rebuild route", e);
      toast.error(e?.message || "Failed to rebuild route");
    } finally {
      stopRouteTimeProgress();
      setIsRebuilding(false);
    }
  };

  const dayHasManualInserts = (day): boolean => {
    const segments = Array.isArray(day?.segments) ? day.segments : [];
    return segments.some((seg) => (
      String(seg?.type || '').toLowerCase() === 'attraction'
      && (seg?.planOwnWay === true || seg?.isManual === true)
    ));
  };

const applyRouteTimePatch = async (
  planId: number,
  routeId: number,
  dayNumber: number,
  startTimeHms: string,
  endTimeHms: string,
  options?: {
    previousDayBillingDecisionProvided?: boolean;
    previousDayBillingConfirmed?: boolean;
  },
) => {
  setIsApplyingRouteTimeUpdate(true);
  const estimatedMs = getRouteTimeUpdateEstimateMs(dayNumber);
  setRouteTimeEstimatedMs(estimatedMs);
  setRouteProgressTitle(`Updating Day ${dayNumber} timings`);
  setRouteProgressHistory([]);
  startRouteTimeProgress(estimatedMs);
  pushRouteProgressStage(
    `Saving Day ${dayNumber} start/end time`,
    `Updating Day ${dayNumber} timing window to ${startTimeHms.slice(0, 5)} - ${endTimeHms.slice(0, 5)} and triggering itinerary rebuild.`,
  );

  try {
    const previousHotelDetails = hotelDetails;

    await ItineraryService.updateRouteTimes(planId, routeId, startTimeHms, endTimeHms, options);
    pushRouteProgressStage(
      `Reloading updated Day ${dayNumber} itinerary`,
      "Fetching the rebuilt day timeline after the new timing window was saved.",
    );

    if (quoteId) {
      const detailsRes = await ItineraryService.getDetails(quoteId);
      const nextItinerary = detailsRes as ItineraryDetailsResponse;

      setItinerary({
        ...nextItinerary,
        // After route time / hotspot changes, details API is the source of truth.
        // Do not preserve stale vehicle rows or stale vehicle totals.
        vehicles: nextItinerary.vehicles,
        costBreakdown: nextItinerary.costBreakdown,
        overallCost: nextItinerary.overallCost,
      });

      // Do not reload hotel details here.
      // Reloading hotelDetails can refresh supplier/TBO amount and change package cost.
      setHotelDetails(previousHotelDetails);
      pushRouteProgressStage(
        `Applying refreshed Day ${dayNumber} timeline`,
        "Refreshing the page with the latest timings, route rows, and updated totals.",
      );
    }

    setRouteTimeProgressPercent(100);
    setPendingScrollDayNumber(dayNumber);

    toast.success(`Day ${dayNumber} times updated`);
  } catch (e) {
    console.error('Failed to update route times', e);
    toast.error(e?.message || 'Failed to update route times');
    } finally {
    stopRouteTimeProgress();
    setIsApplyingRouteTimeUpdate(false);
  }
};

  const buildArrivalPolicyDecisionKey = (
    routeId?: number,
    routeDate?: string,
    startTimeHms?: string,
  ) => {
    const normalizedRouteId = Number(routeId || 0);
    const normalizedRouteDate = normalizeDateToYmd(routeDate);
    const normalizedStartTime = String(startTimeHms || '').trim();

    if (!normalizedRouteId || !normalizedRouteDate || !normalizedStartTime) {
      return null;
    }

    return `${normalizedRouteId}|${normalizedRouteDate}|${normalizedStartTime}`;
  };

  const getRequestArrivalPolicyDecisionKey = (request: HotelArrivalPolicyRequest | null) => {
    if (!request) {
      return null;
    }

    const arrivalTimeHms = (() => {
      if (request.arrivalDateTime && request.arrivalDateTime.includes('T')) {
        return request.arrivalDateTime.split('T')[1]?.slice(0, 8) || '';
      }

      const routeDay = itinerary?.days?.find(
        (day) => Number(day.id) === Number(request.itineraryRouteId),
      );
      return parseDisplayTimeToHms(routeDay?.startTime || '');
    })();

    return buildArrivalPolicyDecisionKey(
      request.itineraryRouteId,
      request.routeDate,
      arrivalTimeHms,
    );
  };

  const handleUpdateRouteTimesDirect = async (
    planId: number,
    routeId: number,
    dayNumber: number,
    startTimeDisplay: string,
    endTimeDisplay: string
  ) => {
    const startTimeHms = parseDisplayTimeToHms(startTimeDisplay);
    const endTimeHms = parseDisplayTimeToHms(endTimeDisplay);
    const routeDay =
      itinerary?.days?.find((d) => Number(d.id) === Number(routeId)) ||
      itinerary?.days?.find((d) => Number(d.dayNumber) === Number(dayNumber));
    const currentStartTimeHms = parseDisplayTimeToHms(routeDay?.startTime || '');
    const currentEndTimeHms = parseDisplayTimeToHms(routeDay?.endTime || '');
    const hasTimeChanged =
      startTimeHms !== currentStartTimeHms ||
      endTimeHms !== currentEndTimeHms;

    console.log(`Updating route times: planId=${planId}, routeId=${routeId}, day=${dayNumber}, start=${startTimeHms}, end=${endTimeHms}`);

    if (!hasTimeChanged) {
      return;
    }

      // Day 1 early-morning gate is needed only for Hotel / Vehicle + Hotel itineraries.
    // Vehicle-only itinerary should not show previous-day hotel billing popup.
    if (requiresHotelBookingFlow && dayNumber === 1 && isEarlyMorningTime(startTimeHms)) {
      const resolvedRouteDay =
        routeDay ||
        itinerary?.days?.find((d) => Number(d.dayNumber) === 1) ||
        itinerary?.days?.[0];
      const routeDateYmd = normalizeDateToYmd(resolvedRouteDay?.date);
      const request: HotelArrivalPolicyRequest = {
        itineraryPlanId: planId,
        itineraryRouteId: routeId,
        routeDayNumber: 1,
        routeDate: routeDateYmd,
        arrivalDateTime: routeDateYmd ? `${routeDateYmd}T${startTimeHms}` : undefined,
        arrivalCityName: resolvedRouteDay?.departure || '',
        routeSourceCityName: resolvedRouteDay?.departure || '',
        nightStayCityName: resolvedRouteDay?.arrival || '',
        previousDayBillingDecisionProvided: false,
        previousDayBillingConfirmed: false,
      };

      setIsResolvingArrivalPolicy(true);
      try {
      const policy = await ItineraryService.resolveHotelArrivalPolicy(request);
if (policy.requiresPreviousDayBillingConfirmation) {
          console.log('[ArrivalPolicy][confirm_required]', { planId, routeId, dayNumber, startTimeHms, endTimeHms });
          setPendingRouteTimeUpdate({
            planId,
            routeId,
            dayNumber,
            startTimeHms,
            endTimeHms,
          });
          const safeRouteDate = normalizeDateToYmd(request.routeDate) || new Date().toISOString().split('T')[0];
          const routeDate = new Date(`${safeRouteDate}T00:00:00`);
          const previousDay = new Date(routeDate);
          previousDay.setDate(previousDay.getDate() - 1);
          const fmt = (d: Date) =>
            `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
          setArrivalPolicyConfirmModal({
            open: true,
            arrivalDate: fmt(routeDate),
            previousDayDate: fmt(previousDay),
            request,
          });
          return;
        }
        // Policy resolved without needing confirmation – fall through to PATCH
      } catch (e) {
        toast.error(e?.message || 'Failed to resolve arrival policy');
        return;
      } finally {
        setIsResolvingArrivalPolicy(false);
      }
    }

    await applyRouteTimePatch(planId, routeId, dayNumber, startTimeHms, endTimeHms);
  };

  const persistArrivalPolicyDecision = async (
    request: HotelArrivalPolicyRequest,
    confirmed: boolean,
  ): Promise<boolean> => {
    try {
      const routeDay =
        itinerary?.days?.find((d) => Number(d.id) === Number(request.itineraryRouteId)) ||
        itinerary?.days?.find((d) => Number(d.dayNumber) === Number(request.routeDayNumber || 1));

      if (!routeDay?.startTime || !routeDay?.endTime) {
        return false;
      }

      const startTimeHms = parseDisplayTimeToHms(routeDay.startTime);
      const endTimeHms = parseDisplayTimeToHms(routeDay.endTime);

      await applyRouteTimePatch(
        request.itineraryPlanId,
        request.itineraryRouteId,
        routeDay.dayNumber || request.routeDayNumber || 1,
        startTimeHms,
        endTimeHms,
        {
          previousDayBillingDecisionProvided: true,
          previousDayBillingConfirmed: confirmed,
        },
      );

      return true;
    } catch (e) {
      console.error('Failed to persist arrival policy decision', e);
      return false;
    }
  };

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

  const openAddActivityModal = async (
    planId: number,
    routeId: number,
    routeHotspotId: number,
    hotspotId: number,
    hotspotName: string
  ) => {
    setAddActivityModal({
      open: true,
      planId,
      routeId,
      routeHotspotId,
      hotspotId,
      hotspotName,
    });

    // Reset stale preview state whenever modal opens for a hotspot.
    setActivityPreview(null);
    setPreviewingActivityId(null);

    // Fetch available activities
    setLoadingActivities(true);
    try {
const activities = await ItineraryService.getAvailableActivities(hotspotId, planId, routeId);
setAvailableActivities(activities as any[]);
    } catch (e) {
      console.error("Failed to load activities", e);
      toast.error(e?.message || "Failed to load activities");
      setAvailableActivities([]);
    } finally {
      setLoadingActivities(false);
    }
  };

  const handleAddActivity = async (activityId: number, amount: number) => {
    if (!addActivityModal.planId || !addActivityModal.routeId || !addActivityModal.routeHotspotId || !addActivityModal.hotspotId) {
      return;
    }

    // Check for conflicts in preview
    let shouldSkipConflictCheck = false;
    if (activityPreview?.hasConflicts && activityPreview.activity?.id === activityId) {
      const conflictMessages = activityPreview.conflicts
        .map((c) => c.reason)
        .join('\n\n');

      const confirm = window.confirm(
        `TIMING CONFLICTS DETECTED:\n\n${conflictMessages}\n\nDo you want to add this activity anyway?`
      );

      if (!confirm) return;
      shouldSkipConflictCheck = true; // User confirmed override
    }

    setIsAddingActivity(true);
    try {
      const payload: any = {
        planId: addActivityModal.planId,
        routeId: addActivityModal.routeId,
        routeHotspotId: addActivityModal.routeHotspotId,
        hotspotId: addActivityModal.hotspotId,
        activityId,
        amount,
      };

      // Only add skipConflictCheck if user confirmed conflict override
      if (shouldSkipConflictCheck) {
        payload.skipConflictCheck = true;
      }

      await ItineraryService.addActivity(payload);

      toast.success("Activity added successfully");

      // Close modal
      setAddActivityModal({
        open: false,
        planId: null,
        routeId: null,
        routeHotspotId: null,
        hotspotId: null,
        hotspotName: "",
      });
      setActivityPreview(null);
      setPreviewingActivityId(null);

      // Reload itinerary — always, independently of hotel reload
      if (quoteId) {
        try {
          const detailsRes = await ItineraryService.getDetails(quoteId);
          setItinerary(detailsRes as ItineraryDetailsResponse);
        } catch (reloadErr) {
          console.error("Failed to reload itinerary after add", reloadErr);
        }
        try {
          if (shouldShowHotels) {
            const hotelRes = await ItineraryService.getHotelDetails(quoteId);
            setHotelDetails(hotelRes as ItineraryHotelDetailsResponse);
          } else {
            setHotelDetails(null);
            setActiveHotelListTotal(0);
          }
        } catch {
          // Non-critical
        }
      }
    } catch (e) {
      console.error("Failed to add activity", e);
      toast.error(e?.message || "Failed to add activity");
    } finally {
      setIsAddingActivity(false);
    }
  };

  const formatPreviewTime = (value: string | Date | null | undefined) => {
    if (!value) return 'N/A';

    const d = new Date(value as any);
    if (Number.isNaN(d.getTime())) return String(value);

    const hours = d.getUTCHours();
    const minutes = d.getUTCMinutes().toString().padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const h12 = hours % 12 || 12;
    return `${h12}:${minutes} ${ampm}`;
  };

  const formatActivityDuration = (value: string | null | undefined) => {
    if (!value) return 'Not specified';

    const match = String(value).match(/(?:T)?(\d{2}):(\d{2})(?::(\d{2}))?/);
    if (!match) return String(value);

    const hours = Number(match[1] || 0);
    const minutes = Number(match[2] || 0);
    const parts: string[] = [];

    if (hours > 0) {
      parts.push(`${hours} Hour${hours === 1 ? '' : 's'}`);
    }

    if (minutes > 0) {
      parts.push(`${minutes} Min`);
    }

    return parts.length > 0 ? parts.join(' ') : '0 Min';
  }

  const formatActivityMoney = (value: number | string | null | undefined) =>
  `₹${Number(value || 0).toFixed(2)}`;

const getActivityTotalAmount = (activity?: any | null) =>
  Number(activity?.totalAmount ?? activity?.totalPrice ?? 0);

const getSelectedPreviewActivity = () =>
  availableActivities.find((activity) => activity.id === activityPreview?.activity?.id) || null;

  const handlePreviewActivity = async (activityId: number) => {
    if (!addActivityModal.planId || !addActivityModal.routeId ||
      !addActivityModal.routeHotspotId || !addActivityModal.hotspotId) {
      return;
    }

    setPreviewingActivityId(activityId);
    try {
      const preview = await ItineraryService.previewActivityAddition({
        planId: addActivityModal.planId,
        routeId: addActivityModal.routeId,
        routeHotspotId: addActivityModal.routeHotspotId,
        hotspotId: addActivityModal.hotspotId,
        activityId,
      });

      setActivityPreview(preview);
    } catch (e) {
      console.error("Failed to preview activity", e);
      toast.error(e?.message || "Failed to preview activity");
      setActivityPreview(null);
    } finally {
      setPreviewingActivityId(null);
    }
  };

  const handleOpenPreviewAllHotspots = async (activityId: number) => {
    if (!addActivityModal.planId || !addActivityModal.routeId) {
      return;
    }

    setAllHotspotsPreviewModal(prev => ({
      ...prev,
      loading: true,
      open: true,
      planId: addActivityModal.planId,
      routeId: addActivityModal.routeId,
      activityId: activityId,
    }));

    try {
      const preview = await ItineraryService.previewActivityForAllHotspots({
        planId: addActivityModal.planId,
        routeId: addActivityModal.routeId,
        activityId,
      });

      setAllHotspotsPreviewModal(prev => ({
        ...prev,
        loading: false,
        data: preview,
      }));
    } catch (e) {
      console.error("Failed to preview activity for all hotspots", e);
      toast.error(e?.message || "Failed to preview activity");
      setAllHotspotsPreviewModal(prev => ({
        ...prev,
        loading: false,
        open: false,
      }));
    }
  };

  const handleDeleteActivity = async () => {
    if (!deleteActivityModal.planId || !deleteActivityModal.routeId || !deleteActivityModal.activityId) {
      return;
    }

    setIsDeletingActivity(true);
    try {
      await ItineraryService.deleteActivity(
        deleteActivityModal.planId,
        deleteActivityModal.routeId,
        deleteActivityModal.activityId
      );

      toast.success("Activity deleted successfully");

      // Close modal
      setDeleteActivityModal({
        open: false,
        planId: null,
        routeId: null,
        activityId: null,
        activityName: "",
      });

      // Reload itinerary — always, independently of hotel reload
      if (quoteId) {
        try {
          const detailsRes = await ItineraryService.getDetails(quoteId);
          setItinerary(detailsRes as ItineraryDetailsResponse);
        } catch (reloadErr) {
          console.error("Failed to reload itinerary after delete", reloadErr);
        }
        // Hotel reload is best-effort and must not block the itinerary refresh
        try {
          if (shouldShowHotels) {
            const hotelRes = await ItineraryService.getHotelDetails(quoteId);
            setHotelDetails(hotelRes as ItineraryHotelDetailsResponse);
          } else {
            setHotelDetails(null);
            setActiveHotelListTotal(0);
          }
        } catch {
          // Non-critical — silence hotel reload errors
        }
      }
    } catch (e) {
      console.error("Failed to delete activity", e);
      toast.error(e?.message || "Failed to delete activity");
    } finally {
      setIsDeletingActivity(false);
    }
  };

  const openDeleteActivityModal = (
    planId: number,
    routeId: number,
    activityId: number,
    activityName: string
  ) => {
    setDeleteActivityModal({
      open: true,
      planId,
      routeId,
      activityId,
      activityName,
    });
  };

  const { loadGuideAssignments, refreshGuideData } = useGuideDataRefresh({
    quoteId,
    itineraryPlanId: itinerary?.planId,
    setGuideAssignments,
    setItinerary,
  });

  const openGuideModal = async (
    day?: ItineraryDay | null,
    assignment?: ItineraryGuideAssignment | null,
    guideTypeOverride?: 1 | 2,
  ) => {
    if (readOnly) {
      toast.error("Guide cannot be added in read-only mode");
      return;
    }

    const planId = Number(itinerary?.planId || 0);
    if (!(planId > 0)) {
      toast.error("Plan ID not found");
      return;
    }

    const guideType = Number(guideTypeOverride || assignment?.guideType || 2);

    setGuideModal((prev) => ({
      ...prev,
      open: true,
      loading: true,
      planId,
      day,
      routeGuideId: assignment?.routeGuideId ?? null,
      guideType,
      guideLanguage: assignment?.guideLanguageIds?.[0] ? String(assignment.guideLanguageIds[0]) : "",
      guideSlots: assignment?.guideSlotIds ?? [],
      options: { languages: [], slots: [], assignment: assignment ?? null },
    }));

    try {
  const options = await ItineraryService.getGuideAssignmentOptions(
  planId,
  assignment?.routeGuideId,
) as GuideModalOptions;

const apiAssignment = options?.assignment ?? null;
const localAssignment = assignment ?? null;

/*
  Important:
  For full-itinerary guide, the row may already have updated slots in frontend state.
  API options can still return old guideSlotIds, so prefer local assignment slots first.
*/
const existing = localAssignment ?? apiAssignment ?? null;

const localGuideSlotIds = Array.isArray(localAssignment?.guideSlotIds)
  ? localAssignment.guideSlotIds.map(Number).filter((id) => Number.isFinite(id) && id > 0)
  : [];

const apiGuideSlotIds = Array.isArray(apiAssignment?.guideSlotIds)
  ? apiAssignment.guideSlotIds.map(Number).filter((id) => Number.isFinite(id) && id > 0)
  : [];

const localLanguageId = Number(localAssignment?.guideLanguageIds?.[0] || 0);
const apiLanguageId = Number(apiAssignment?.guideLanguageIds?.[0] || 0);

setGuideModal((prev) => {
  const resolvedGuideSlotIds =
    localGuideSlotIds.length > 0
      ? localGuideSlotIds
      : apiGuideSlotIds.length > 0
        ? apiGuideSlotIds
        : prev.guideSlots;

  return {
    ...prev,
    loading: false,
    options: {
      languages: Array.isArray(options?.languages) ? options.languages : [],
      slots: Array.isArray(options?.slots) ? options.slots : [],
      assignment: existing,
    },
    routeGuideId: existing?.routeGuideId ?? prev.routeGuideId,
    guideLanguage:
      localLanguageId > 0
        ? String(localLanguageId)
        : apiLanguageId > 0
          ? String(apiLanguageId)
          : prev.guideLanguage,
    guideSlots: resolvedGuideSlotIds,
  };
});
    } catch (e) {
      console.error("Failed to load guide modal options", e);
      setGuideModal((prev) => ({ ...prev, loading: false, open: false }));
      toast.error(e?.message || "Failed to load guide options");
    }
  };

  const handleAddGuideClick = (day: ItineraryDay) => {
    const existing = guideAssignments.find((assignment) => (
      Number(assignment.guideType || 0) === 2
      && Number(assignment.routeId || 0) === Number(day.id)
    ));
    void openGuideModal(day, existing ?? null, 2);
  };

  const handleWholeItineraryGuideClick = () => {
    const existing = guideAssignments.find((assignment) => Number(assignment.guideType || 0) === 1) ?? null;
    void openGuideModal(null, existing, 1);
  };

  const loadGuideAvailability = useCallback(async (planId: number) => {
    if (!(planId > 0)) {
      setGuideAvailability(null);
      return;
    }

    setGuideAvailabilityLoading(true);

    try {
      const response = await api(`/itineraries/${planId}/guides/availability`) as GuideAvailabilityResponse;

console.log("[GuideAvailability]", {
  planId,
  response,
});

setGuideAvailability(response || null);
    } catch (e) {
      console.error("Failed to load guide availability", e);
      setGuideAvailability(null);
    } finally {
      setGuideAvailabilityLoading(false);
    }
  }, []);

  const getGuideAssignmentForDay = useCallback((day: ItineraryDay): ItineraryGuideAssignment | null => {
    const dayGuideAssignment =
      guideAssignments.find((assignment) => (
        Number(assignment.guideType || 0) === 2 &&
        Number(assignment.routeId || 0) === Number(day.id)
      )) ?? null;

    const wholeItineraryGuideAssignment =
      guideAssignments.find((assignment) => Number(assignment.guideType || 0) === 1) ?? null;

    return dayGuideAssignment ?? wholeItineraryGuideAssignment;
  }, [guideAssignments]);

  const isGuidePriceAvailableForDay = useCallback((day: ItineraryDay): boolean => {
    if (!guideAvailability) return false;

    if (Number(itinerary?.guideForItinerary || 0) === 1) {
      return guideAvailability.wholeItineraryAvailable === true;
    }

    const dayAvailability = guideAvailability.days.find((item) => (
      Number(item.routeId || 0) === Number(day.id)
    ));

    return dayAvailability?.available === true;
  }, [guideAvailability, itinerary?.guideForItinerary]);

  const getGuideSlotWindowMinutes = (slotId: number): { start: number; end: number } | null => {
    switch (Number(slotId || 0)) {
      case 1:
        return { start: 8 * 60, end: 13 * 60 };
      case 2:
        return { start: 13 * 60, end: 18 * 60 };
      case 3:
        return { start: 8 * 60, end: 18 * 60 };
      case 4:
        return { start: 18 * 60, end: 21 * 60 };
      default:
        return null;
    }
  };

  const isAttractionCoveredByGuide = (
    segment: AttractionSegment,
    assignment: ItineraryGuideAssignment | null,
  ): boolean => {
    if (!assignment) return false;

    const guideSlotIds = Array.isArray(assignment.guideSlotIds)
      ? assignment.guideSlotIds.map(Number).filter((slotId) => Number.isFinite(slotId) && slotId > 0)
      : [];

    if (guideSlotIds.length === 0) return true;

    const visitStart = parseDisplayMinutes(segment.visitTime, "start");
    const visitEnd = parseDisplayMinutes(segment.visitTime, "end");

    if (visitStart === null || visitEnd === null) return true;

    const normalizedVisitEnd = visitEnd <= visitStart ? visitEnd + 1440 : visitEnd;

    return guideSlotIds.some((slotId) => {
      const slotWindow = getGuideSlotWindowMinutes(slotId);
      if (!slotWindow) return false;

      const normalizedSlotEnd = slotWindow.end <= slotWindow.start
        ? slotWindow.end + 1440
        : slotWindow.end;

      return visitStart < normalizedSlotEnd && normalizedVisitEnd > slotWindow.start;
    });
  };

  useEffect(() => {
    const planId = Number(itinerary?.planId || 0);

    if (!(planId > 0)) {
      setGuideAvailability(null);
      return;
    }

    void loadGuideAvailability(planId);
  }, [itinerary?.planId, loadGuideAvailability]);

const handleSaveGuideAssignment = async () => {
  const planId = Number(guideModal.planId || 0);
  const day = guideModal.day;
  const guideLanguage = Number(guideModal.guideLanguage || 0);
  const selectedGuideSlots = [...guideModal.guideSlots];
  const isWholeItineraryGuide = Number(guideModal.guideType || 0) === 1;

  const firstDay =
    itinerary?.days?.find((item) => Number(item.dayNumber || 0) === 1) ||
    itinerary?.days?.[0] ||
    null;

  if (!(planId > 0) || (!isWholeItineraryGuide && !day)) {
    toast.error("Guide form is incomplete");
    return;
  }

  if (!(guideLanguage > 0)) {
    toast.error("Guide language is required");
    return;
  }

  if (selectedGuideSlots.length === 0) {
    toast.error("Guide slot is required");
    return;
  }

  try {
    setGuideModal((prev) => ({ ...prev, saving: true }));

    const savedGuide = await ItineraryService.saveGuideAssignment(planId, {
      routeGuideId: guideModal.routeGuideId ?? undefined,
      routeId: isWholeItineraryGuide ? firstDay?.id : day?.id,
      routeDate: isWholeItineraryGuide ? firstDay?.date : day?.date,
      guideType: guideModal.guideType,
      guideLanguage,
      guideSlots: selectedGuideSlots,
    }) as any;

 await refreshGuideData();

let refreshedGuideAssignment: ItineraryGuideAssignment | null = null;

try {
  const refreshedOptions = await ItineraryService.getGuideAssignmentOptions(
    planId,
    Number(savedGuide?.routeGuideId || savedGuide?.route_guide_id || guideModal.routeGuideId || 0) || undefined,
  ) as GuideModalOptions;

  refreshedGuideAssignment = refreshedOptions?.assignment ?? null;
} catch (costRefreshError) {
  console.warn("Failed to refresh guide cost after save", costRefreshError);
}

const selectedLanguageLabel =
  guideModal.options.languages.find((item) => Number(item.id) === guideLanguage)?.label ||
  refreshedGuideAssignment?.guideLanguageLabels?.[0] ||
  guideModal.options.assignment?.guideLanguageLabels?.[0] ||
  "English";

const selectedSlotLabels = guideModal.options.slots
  .filter((slot) => selectedGuideSlots.map(Number).includes(Number(slot.id)))
  .map((slot) => slot.label);

let oldGuideCostForHeader = 0;
let newGuideCostForHeader = 0;

setGuideAssignments((prev) => {
  const existingIndex = prev.findIndex((assignment) => (
    guideModal.routeGuideId
      ? Number(assignment.routeGuideId || 0) === Number(guideModal.routeGuideId)
      : Number(assignment.guideType || 0) === Number(guideModal.guideType || 0) &&
        (
          isWholeItineraryGuide ||
          Number(assignment.routeId || 0) === Number(day?.id || 0)
        )
  ));

  if (existingIndex < 0) {
    return prev;
  }

  const next = [...prev];
  const existing = next[existingIndex];

  const backendGuideCost = Number(
    savedGuide?.guideCost ??
    savedGuide?.guide_cost ??
    refreshedGuideAssignment?.guideCost ??
    (refreshedGuideAssignment as any)?.guide_cost ??
    0
  );

  const oldGuideCost = Number(existing.guideCost || 0);
  const oldSlotCount = Math.max(
    Array.isArray(existing.guideSlotIds) ? existing.guideSlotIds.length : 0,
    1
  );
  const newSlotCount = Math.max(selectedGuideSlots.length, 1);

  /*
    Backend is currently returning the old guide cost for full-itinerary guide.
    So if backend cost is missing or same as old cost, calculate price by slot count.
    Example: ₹21600 / 3 slots = ₹7200 per slot.
    4 slots => ₹28800.
  */
  const fallbackGuideCost = Number(((oldGuideCost / oldSlotCount) * newSlotCount).toFixed(2));

  const updatedGuideCost =
    backendGuideCost > 0 && Math.abs(backendGuideCost - oldGuideCost) > 0.01
      ? backendGuideCost
      : fallbackGuideCost;

  oldGuideCostForHeader = oldGuideCost;
  newGuideCostForHeader = updatedGuideCost;

  next[existingIndex] = {
    ...existing,
    routeGuideId: Number(savedGuide?.routeGuideId || savedGuide?.route_guide_id || existing.routeGuideId || guideModal.routeGuideId || 0),
    guideLanguage: selectedLanguageLabel,
    guideLanguageIds: [guideLanguage],
    guideLanguageLabels: [selectedLanguageLabel],
    guideSlotIds: selectedGuideSlots.map(Number),
    guideSlotLabels: selectedSlotLabels,
    guideSlot: selectedSlotLabels.join(", "),
    guideCost: updatedGuideCost,
  };

  return next;
});

if (oldGuideCostForHeader !== newGuideCostForHeader) {
  const guideCostDiff = Number((newGuideCostForHeader - oldGuideCostForHeader).toFixed(2));

  setItinerary((prev) => {
    if (!prev) return prev;

    const currentTotalGuideCost = Number(prev.costBreakdown?.totalGuideCost || 0);
    const currentTotalAmount = Number(prev.costBreakdown?.totalAmount || 0);
    const currentNetPayable = Number(prev.costBreakdown?.netPayable || prev.overallCost || 0);
    const currentOverallCost = Number(prev.overallCost || 0);

    return {
      ...prev,
      overallCost: Number((currentOverallCost + guideCostDiff).toFixed(2)),
      costBreakdown: {
        ...prev.costBreakdown,
        totalGuideCost: Number((currentTotalGuideCost + guideCostDiff).toFixed(2)),
        totalAmount: Number((currentTotalAmount + guideCostDiff).toFixed(2)),
        netPayable: Number((currentNetPayable + guideCostDiff).toFixed(2)),
      },
    };
  });
}

    setGuideModal((prev) => ({ ...prev, open: false, saving: false }));
    toast.success(guideModal.routeGuideId ? "Guide updated successfully" : "Guide added successfully");
  } catch (e) {
    console.error("Failed to save guide assignment", e);
    setGuideModal((prev) => ({ ...prev, saving: false }));
    const rawMessage = String(e?.message || "");

    if (rawMessage.includes("guide_not_available")) {
      toast.error("Sorry, Guide Cost Not Available. So Unable to Add");
      return;
    }

    toast.error(rawMessage || "Failed to save guide");
  }
};

  const handleDeleteGuideAssignment = async () => {
    const assignment = deleteGuideModal.assignment;
    const planId = Number(itinerary?.planId || 0);
    if (!assignment || !(planId > 0)) return;

    try {
      setDeleteGuideModal((prev) => ({ ...prev, deleting: true }));
      await ItineraryService.deleteGuideAssignment(
        planId,
        assignment.routeGuideId,
        assignment.routeId ?? undefined,
      );
      await refreshGuideData();
      setDeleteGuideModal({ open: false, assignment: null, deleting: false });
      toast.success("Guide deleted successfully");
    } catch (e) {
      console.error("Failed to delete guide assignment", e);
      setDeleteGuideModal((prev) => ({ ...prev, deleting: false }));
      toast.error(e?.message || "Failed to delete guide");
    }
  };

  useEffect(() => {
    const planId = Number(itinerary?.planId || 0);
    if (!(planId > 0)) {
      setGuideAssignments([]);
      return;
    }
    void loadGuideAssignments(planId);
  }, [itinerary?.planId, loadGuideAssignments]);

  const openAddHotspotModal = async (
    planId: number,
    routeId: number,
    locationId: number,
    locationName: string,
    anchor?: HotspotAnchor | null,
  ) => {
    previewRequestIdRef.current += 1;
    setAddHotspotModal({
      open: true,
      planId,
      routeId,
      locationId,
      locationName,
    });
    resetManualHotspotPreviewState();
    setActivePreviewHotspotId(null);
    setAddedInModalHotspotIds(new Set());
    setSelectedHotspotAnchor(anchor || null);
    setSelectedFitHotspot(null);
    setTriedFitHereAnchors({});
    setFitHereModal({
      open: false,
      loading: false,
      loadingStepIndex: 0,
      failedReason: null,
      attempt: null,
      anchorKey: null,
    });
    setAutoFitHereModal({
      open: false,
      loading: false,
      failedReason: null,
      results: [],
      selectedAnchorKey: null,
      loadingAnchorCount: 0,
      loadingStartedAtMs: null,
      performanceSummary: null,
    });

    // Fetch available hotspots for this location
    setLoadingHotspots(true);
    try {
      // Calculate route excluded IDs and active IDs BEFORE fetching, to avoid stale state
      const currentRoute = itinerary?.days.find((d) => Number(d.id) === Number(routeId));

      const routeExcludedIds: number[] = Array.isArray((currentRoute as any)?.excluded_hotspot_ids)
        ? (currentRoute as any).excluded_hotspot_ids.map(Number)
        : [];

      const routeActiveIds = new Set<number>(
        (Array.isArray((currentRoute as any)?.segments) ? (currentRoute as any).segments : [])
          .filter((seg) => String(seg?.type || '').toLowerCase() === 'attraction')
          .filter((seg) => {
            const deletedLike =
              seg?.isDeleted === true ||
              seg?.deleted === true ||
              seg?.isExcluded === true ||
              seg?.excluded === true ||
              seg?.removed === true ||
              seg?.deletedAt != null ||
              seg?.deleted_at != null ||
              String(seg?.status || '').toLowerCase() === 'deleted' ||
              String(seg?.status || '').toLowerCase() === 'excluded';
            return !deletedLike;
          })
          .map((seg) => Number(seg?.hotspotId ?? seg?.locationId ?? 0))
          .filter((id: number) => Number.isFinite(id) && id > 0)
      );

      setExcludedHotspotIds(routeExcludedIds);

      const hotspotResponse = anchor
        ? await ItineraryService.getAvailableHotspotsForAnchor({
            planId,
            routeId,
            anchorType: anchor.anchorType,
            anchorIndex: Number(anchor.anchorIndex),
          })
        : await ItineraryService.getAvailableHotspots(routeId);

      const hotspots = Array.isArray(hotspotResponse)
        ? hotspotResponse
        : (Array.isArray((hotspotResponse as any)?.hotspots)
          ? (hotspotResponse as any).hotspots
          : []);
      const responseFilterMeta = Array.isArray(hotspotResponse)
        ? null
        : ((hotspotResponse as any)?.hotspotFilterMeta || null);

      setHotspotFilterMeta(responseFilterMeta);
      console.log('[AddHotspotModal] hotspot_filter_meta', responseFilterMeta);

      const routeSourceName = String((currentRoute as any)?.departure || '').trim();
      const routeDestinationName = String((currentRoute as any)?.arrival || '').trim();
      const anchorFromName = String(anchor?.anchorFrom || '').trim();
      const anchorToName = String(anchor?.anchorTo || '').trim();

      const routePairFilteredHotspots = filterAvailableHotspotsForAnchor(
        hotspots as AvailableHotspot[],
        routeSourceName,
        routeDestinationName,
        anchorFromName,
        anchorToName,
      );

      setAvailableHotspots(
        normalizeAvailableHotspots(routePairFilteredHotspots, {
          routeId,
          excludedIds: routeExcludedIds,
          activeIds: routeActiveIds,
        })
      );

      if (currentRoute) {

        const existingManualHotspotIds: number[] = Array.from(
          new Set(
            (Array.isArray((currentRoute as any).segments) ? (currentRoute as any).segments : [])
              .filter((seg) => String(seg?.type || '').toLowerCase() === 'attraction')
              .filter((seg) => seg?.planOwnWay === true || seg?.isManual === true)
              .map((seg) => Number(seg?.hotspotId ?? seg?.locationId ?? 0))
              .filter((id: number): id is number => Number.isFinite(id) && id > 0),
          ),
        );

        if (existingManualHotspotIds.length > 0) {
          // Existing manual hotspots should appear as already added on the left list,
          // but must not become preselected preview candidates in sequential mode.
          setSelectedHotspotIds([]);
        }
      }
    } catch (e) {
      console.error("Failed to fetch available hotspots", e);
      toast.error(e?.message || "Failed to load available hotspots");
    } finally {
      setLoadingHotspots(false);
    }
  };

  const buildFitHereAnchorKey = (anchor: HotspotAnchor): string => {
    const from = String(anchor.anchorFrom || "UNKNOWN_FROM")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "");

    const to = String(anchor.anchorTo || "UNKNOWN_TO")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "");

    return [
      anchor.anchorType,
      anchor.anchorIntent,
      Number(anchor.anchorIndex ?? -1),
      from,
      to,
    ].join(":");
  };

  const serializeFitHereAnchor = useCallback((anchor: HotspotAnchor) => ({
    anchorType: anchor.anchorType || 'BETWEEN_ROWS',
    anchorIntent: anchor.anchorIntent,
    anchorIndex: anchor.anchorIndex,
    anchorFrom: anchor.anchorFrom,
    anchorTo: anchor.anchorTo,
    anchorLabel: anchor.anchorLabel,
    anchorTimeRange: anchor.anchorTimeRange,
    afterRowType: anchor.afterRowType,
    beforeRowType: anchor.beforeRowType,
    afterHotspotId: anchor.afterHotspotId,
    afterRouteHotspotId: anchor.afterRouteHotspotId,
    beforeHotspotId: anchor.beforeHotspotId,
    beforeRouteHotspotId: anchor.beforeRouteHotspotId,
  }), []);

  const buildAutoFitHereAnchorsForDay = useCallback((day: ItineraryDay): HotspotAnchor[] => {
    const anchors: HotspotAnchor[] = [];

    for (let index = 0; index < day.segments.length; index += 1) {
      const anchor = buildFitHereAnchorForTimelineRow(day, index);

      if (!anchor) continue;

      if (
        anchor.anchorIntent !== 'AFTER_START' &&
        anchor.anchorIntent !== 'AFTER_ATTRACTION'
      ) {
        continue;
      }

      anchors.push(anchor);
    }

    const seen = new Set<string>();

    return anchors.filter((anchor) => {
      const key = buildFitHereAnchorKey(anchor);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [buildFitHereAnchorForTimelineRow]);

  const getFitHereTriedState = (resultType?: string): Omit<TriedAnchorState, 'anchorKey'> => {
    const normalized = String(resultType || '').toUpperCase();

    if (normalized === 'FITS_DIRECTLY') {
      return { status: 'DIRECT_FIT', label: 'Tried: fits directly' };
    }
    if (normalized === 'FITS_WITH_OPTIONAL_REMOVAL') {
      return { status: 'REMOVES_OPTIONAL', label: 'Tried: removes optional hotspot' };
    }
    if (normalized === 'REQUIRES_P3_CONFIRMATION') {
      return { status: 'P3_CONFIRMATION', label: 'Tried: needs P3 confirmation' };
    }
    if (normalized === 'PRIORITY_CONFLICT') {
      return { status: 'PRIORITY_CONFLICT', label: 'Tried: priority conflict' };
    }

    return { status: 'CANNOT_FIT', label: 'Tried: does not fit' };
  };

  const getAutoPreviewRemovedRows = (attempt): any[] => {
    const rows = [
      ...(Array.isArray(attempt?.removedHotspots) ? attempt.removedHotspots : []),
      ...(Array.isArray(attempt?.resolution?.removedHotspots) ? attempt.resolution.removedHotspots : []),
      ...(Array.isArray(attempt?.changesRequiredDisplay?.removedItems) ? attempt.changesRequiredDisplay.removedItems : []),
    ];

    const seen = new Set<number>();

    return rows.filter((row) => {
      const id = Number(row?.id || row?.hotspotId || row?.hotspot_ID || row?.hotspot_id || row?.locationId || 0);
      if (!(id > 0) || seen.has(id)) return false;
      seen.add(id);
      return true;
    });
  };

  const getAutoPreviewHighestRemovedPriority = (attempt): number | null => {
    const priorities = getAutoPreviewRemovedRows(attempt)
      .map((row) => Number(row?.priority || row?.hotspotPriority || row?.hotspot_priority || row?.rawPriority || row?.workPriority || 0))
      .filter((priority: number) => [1, 2, 3].includes(priority));

    return priorities.length > 0 ? Math.min(...priorities) : null;
  };

  const scoreAutoPreviewAttempt = (attempt): { score: number; reason: string; removedCount: number } => {
    const resultType = String(attempt?.resultType || '').toUpperCase();
    const removedRows = getAutoPreviewRemovedRows(attempt);
    const removedCount = removedRows.length;
    const highestRemovedPriority = getAutoPreviewHighestRemovedPriority(attempt);

    let score = 0;
    let reason = 'Cannot fit at this position.';

    if (resultType === 'FITS_DIRECTLY' && attempt?.canConfirm === true) {
      score = 1000;
      reason = 'Clean fit. No hotspot removal required.';
    } else if (resultType === 'FITS_WITH_OPTIONAL_REMOVAL' && attempt?.canConfirm === true) {
      score = 800;
      reason = 'Fits with confirmed changes.';
    } else if (resultType === 'REQUIRES_P3_CONFIRMATION' && attempt?.canConfirm === true) {
      score = 650;
      reason = 'Fits with Priority 3 removal acknowledgement.';
    } else if (resultType === 'PRIORITY_CONFLICT') {
      score = 250;
      reason = 'Protected hotspot impact detected.';
    } else if (resultType === 'SELECTED_HOTSPOT_CLOSED_AT_ATTEMPTED_TIME') {
      score = 150;
      reason = 'Selected hotspot is closed at attempted time.';
    } else if (attempt?.canConfirm === true) {
      score = 500;
      reason = 'Can confirm with warnings.';
    }

    score -= removedCount * 120;
    if (highestRemovedPriority === 1) score -= 400;
    if (highestRemovedPriority === 2) score -= 250;
    if (highestRemovedPriority === 3) score -= 100;
    if (attempt?.requiresTimingRiskConfirmation === true) score -= 150;
    if (attempt?.requiresPriorityRemovalConfirmation === true) score -= 100;
    if (attempt?.selectedOpeningConflict) score -= 150;

    return {
      score: Math.max(0, score),
      reason,
      removedCount,
    };
  };

  const buildAutoPreviewAnchorProgressText = useCallback((day: ItineraryDay, anchor: HotspotAnchor): string => {
    const attractionRows = day.segments
      .map((segment, index) => ({ segment, index }))
      .filter(({ segment }) => segment?.type === 'attraction');

    const startIndex = anchor.anchorIntent === 'AFTER_START'
      ? 0
      : attractionRows.findIndex(({ segment }) => {
          const hotspotId = Number((segment as AttractionSegment)?.hotspotId || (segment as AttractionSegment)?.locationId || 0);
          const routeHotspotId = Number((segment as AttractionSegment)?.routeHotspotId || 0);
          return (
            hotspotId === Number(anchor.afterHotspotId || 0) ||
            routeHotspotId === Number(anchor.afterRouteHotspotId || 0)
          );
        }) + 1;

    const downstreamHotspots = attractionRows
      .slice(Math.max(0, startIndex))
      .map(({ segment }) => String((segment as AttractionSegment)?.name || '').trim())
      .filter(Boolean);

    const previewLabels = downstreamHotspots.slice(0, 4);
    const hasHotel = day.segments.some((segment) => segment?.type === 'checkin');
    if (hasHotel) {
      previewLabels.push('Hotel check-in');
    }

    if (previewLabels.length === 0) {
      return 'Rebuilding this position and validating the final timeline.';
    }

    return `Rebuilding downstream timeline: ${previewLabels.join(' -> ')}`;
  }, []);

  const handleSelectFitHotspot = (hotspot: AvailableHotspot) => {
    previewRequestIdRef.current += 1;
    stopFitHereProgressTimer();
    setSelectedFitHotspot(hotspot);
    setTriedFitHereAnchors({});
    setFitHereModal({
      open: false,
      loading: false,
      loadingStepIndex: 0,
      failedReason: null,
      attempt: null,
      anchorKey: null,
      retryPayload: null,
    });
    setAutoFitHereModal({
      open: false,
      loading: false,
      failedReason: null,
      results: [],
      selectedAnchorKey: null,
    });
    resetManualHotspotPreviewState();
    setActivePreviewHotspotId(null);
    setSelectedHotspotIds([]);
  };

  const runAutoPreviewFitHere = async (
    planId: number,
    day: ItineraryDay,
    hotspot: AvailableHotspot,
    anchors: HotspotAnchor[],
  ) => {
    return ItineraryService.previewManualHotspotAutoFitHere(
      planId,
      buildAutoManualHotspotPreviewPayload(
        Number(day.id),
        Number(hotspot.id),
        anchors.map((item) => serializeFitHereAnchor(item)),
      ),
    );
  };

  const executeAutoPreviewFitHere = async (day: ItineraryDay, hotspot: AvailableHotspot) => {
    const planId = Number(itinerary?.planId || 0);

    if (!(planId > 0)) {
      toast.error('Plan ID missing.');
      return;
    }

    if (!day) {
      toast.error('Could not find the selected route day.');
      return;
    }

    const anchors = buildAutoFitHereAnchorsForDay(day);

    if (anchors.length === 0) {
      toast.error('No valid Fit Here positions found for Auto-Preview.');
      return;
    }

    stopFitHereProgressTimer();
    const requestId = ++previewRequestIdRef.current;
    setSelectedFitHotspot(hotspot);
    setActivePreviewHotspotId(hotspot.id);
    setSelectedHotspotIds([hotspot.id]);
    resetManualHotspotPreviewStateButKeepActiveHotspot(hotspot.id);
    setFitHereModal({
      open: false,
      loading: false,
      loadingStepIndex: 0,
      failedReason: null,
      attempt: null,
      anchorKey: null,
      retryPayload: null,
    });

    const initialRows = anchors.map((anchor, index) => ({
      anchorKey: buildFitHereAnchorKey(anchor),
      anchor: serializeFitHereAnchor(anchor),
      attempt: null,
      status: 'PENDING' as const,
      score: 0,
      rankReason: 'Waiting to simulate this position.',
      removedCount: 0,
      progressText: buildAutoPreviewAnchorProgressText(day, anchor),
      elapsedMs: 0,
      sortIndex: index,
    }));

    setAutoFitHereModal({
      open: true,
      loading: true,
      failedReason: null,
      results: initialRows,
      selectedAnchorKey: null,
      loadingAnchorCount: anchors.length,
      loadingStartedAtMs: Date.now(),
      performanceSummary: null,
    });

    try {
      const response = await runAutoPreviewFitHere(planId, day, hotspot, anchors);
      if (requestId !== previewRequestIdRef.current) {
        return;
      }

      const results = extractAutoPreviewResults(response).map((row, index: number) => ({
        ...row,
        progressText: buildAutoPreviewAnchorProgressText(day, row?.anchor || anchors[index] || anchors[0]),
        sortIndex: Number.isFinite(Number(row?.sortIndex)) ? Number(row?.sortIndex) : index,
      }));
      const selectedAnchorKey = pickBestAutoPreviewAnchorKey(response, results[0]?.anchorKey || null);

      setAutoFitHereModal({
        open: true,
        loading: false,
        failedReason: null,
        results,
        selectedAnchorKey,
        loadingAnchorCount: anchors.length,
        loadingStartedAtMs: null,
        performanceSummary: (response as any)?.performanceSummary || null,
      });
    } catch (error) {
      if (requestId !== previewRequestIdRef.current) {
        return;
      }

      setAutoFitHereModal({
        open: true,
        loading: false,
        failedReason: error?.message || 'Could not run Auto-Preview.',
        results: initialRows,
        selectedAnchorKey: null,
        loadingAnchorCount: anchors.length,
        loadingStartedAtMs: null,
        performanceSummary: null,
      });

      toast.error(error?.message || 'Could not run Auto-Preview.');
    }
  };

  const handleFitHereClick = async (day: ItineraryDay, anchor: HotspotAnchor) => {
    if (!selectedFitHotspot) {
      toast.error('Please select a hotspot first.');
      return;
    }

    const planId = Number(itinerary?.planId || 0);
    if (!(planId > 0)) {
      toast.error('Plan ID missing.');
      return;
    }

    const anchorKey = buildFitHereAnchorKey(anchor);
    console.log('[FitHere] selected_anchor', {
      hotspotId: selectedFitHotspot?.id,
      anchor,
    });
    setFitHereModal({
      open: true,
      loading: true,
      loadingStepIndex: 0,
      failedReason: null,
      attempt: null,
      anchorKey,
      retryPayload: {
        day,
        anchor,
      },
    });
    startFitHereProgressTimer();

    try {
      const previewPayload = buildExactManualHotspotPreviewPayload(
        Number(day.id),
        Number(selectedFitHotspot.id),
        {
          anchorType: anchor.anchorType,
          anchorIntent: anchor.anchorIntent,
          anchorIndex: anchor.anchorIndex,
          anchorFrom: anchor.anchorFrom,
          anchorTo: anchor.anchorTo,
          anchorLabel: anchor.anchorLabel,
          anchorTimeRange: anchor.anchorTimeRange,
          afterRowType: anchor.afterRowType,
          beforeRowType: anchor.beforeRowType,
          afterHotspotId: anchor.afterHotspotId,
          afterRouteHotspotId: anchor.afterRouteHotspotId,
          beforeHotspotId: anchor.beforeHotspotId,
          beforeRouteHotspotId: anchor.beforeRouteHotspotId,
        },
      );
      console.log("[FitHere] clicked anchor", previewPayload);

      const response = await ItineraryService.previewManualHotspotFitHere(
        planId,
        previewPayload,
      );
      stopFitHereProgressTimer();

      setFitHereModal({
        open: true,
        loading: false,
        loadingStepIndex: 10,
        failedReason: null,
        attempt: response as ManualFitHerePreviewResponse,
        anchorKey,
        retryPayload: {
          day,
          anchor,
        },
      });
    } catch (error) {
      stopFitHereProgressTimer();
      setFitHereModal({
        open: true,
        loading: false,
        loadingStepIndex: 0,
        failedReason: error?.message || 'Could not calculate Fit Here preview.',
        attempt: null,
        anchorKey,
        retryPayload: {
          day,
          anchor,
        },
      });
      toast.error(error?.message || 'Could not calculate Fit Here preview.');
    }
  };

  const handleAutoPreviewFitHere = async (hotspot: AvailableHotspot) => {
    const day = selectedFitHereDay;

    if (!day) {
      toast.error('Could not find the selected route day.');
      return;
    }

    void executeAutoPreviewFitHere(day, hotspot);
  };

  const handleFitHereCancel = () => {
    stopFitHereProgressTimer();
    const attempt = fitHereModal.attempt;
    const anchorKey = fitHereModal.anchorKey;

    if (anchorKey && attempt) {
      const triedState = getFitHereTriedState(attempt.resultType);
      setTriedFitHereAnchors((prev) => ({
        ...prev,
        [anchorKey]: {
          ...triedState,
          anchorKey,
          attemptId: attempt.attemptId,
        },
      }));
    }

    setFitHereModal({
      open: false,
      loading: false,
      loadingStepIndex: 0,
      failedReason: null,
      attempt: null,
      anchorKey: null,
      retryPayload: null,
    });
  };

  const handleRetryFitHere = () => {
    const retryPayload = fitHereModal.retryPayload;

    if (!retryPayload) {
      toast.error('Retry details are missing. Please click Fit Here again.');
      return;
    }

    void handleFitHereClick(retryPayload.day, retryPayload.anchor);
  };

  const isRetryableFitHereConfirmError = (error): boolean => {
    const message = String(error?.message || "");
    return (
      message.includes("Fit Here preview attempt was not found")
      || (message.includes("404") && message.includes("/manual-hotspot/fit-confirm"))
      || (
        message.includes("/manual-hotspot/fit-confirm")
        && message.includes("409")
        && (
          message.includes("Timeline changed after preview")
          || message.includes("cannot be confirmed as a clean fit")
          || message.includes("Fit Here confirm was rejected")
          || message.includes("MANUAL_INSERT_")
          || message.includes("MATRIX_SAFE_")
        )
      )
    );
  };

  const extractFitHereConfirmErrorCode = (error): string => {
    const message = String(error?.message || "");
    const codeMatch = message.match(/"code"\s*:\s*"([^"]+)"/i);
    if (codeMatch?.[1]) {
      return String(codeMatch[1]).trim();
    }

    const fallbackMatch = message.match(/MANUAL_INSERT_[A-Z0-9_]+/i);
    return fallbackMatch?.[0] ? String(fallbackMatch[0]).trim() : "";
  };

  const isExpiredOrMissingFitHereAttemptError = (error): boolean => {
    const message = String(error?.message || "");
    return (
      message.includes("Fit Here preview attempt was not found")
      || message.includes("Fit Here preview attempt expired")
      || (
        message.includes("/manual-hotspot/fit-confirm")
        && message.includes("409")
        && message.includes("preview attempt expired")
      )
    );
  };

  const getFitHereRefreshScrollStorageKey = useCallback(() => {
    const normalizedQuoteId = String(quoteId || "").trim();
    return normalizedQuoteId ? `fit-here-refresh-day:${normalizedQuoteId}` : null;
  }, [quoteId]);

  const resolveActiveFitHereDayNumber = useCallback(
    (attempt?: ManualFitHerePreviewResponse | null): number | null => {
      const attemptRouteId = Number(
        attempt?.routeId
        || fitHereModal?.retryPayload?.day?.id
        || addHotspotModal.routeId
        || 0,
      );

      if (attemptRouteId > 0) {
        const matchedDay = itinerary?.days?.find((day) => Number(day.id) === attemptRouteId);
        const matchedDayNumber = Number(matchedDay?.dayNumber || 0);
        if (matchedDayNumber > 0) {
          return matchedDayNumber;
        }
      }

      const fallbackDayNumber = Number(
        fitHereModal?.retryPayload?.day?.dayNumber
        || selectedFitHereDay?.dayNumber
        || 0,
      );

      return fallbackDayNumber > 0 ? fallbackDayNumber : null;
    },
    [addHotspotModal.routeId, fitHereModal?.retryPayload?.day?.dayNumber, fitHereModal?.retryPayload?.day?.id, itinerary?.days, selectedFitHereDay?.dayNumber],
  );

  const handleConfirmFitHere = async (
    options?: {
      allowClosedHotspotConflict?: boolean;
      allowTimingRisk?: boolean;
      allowPriorityRemoval?: boolean;
      acknowledgedRemovedHotspotIds?: number[];
    },
    attemptOverride?: ManualFitHerePreviewResponse | null,
  ) => {
    const selectedAttempt = attemptOverride || fitHereModal.attempt;
    const attemptId = selectedAttempt?.attemptId;
    const planId = Number(itinerary?.planId || 0);
    const confirmRemovedRows = [
      ...(Array.isArray(selectedAttempt?.removedHotspots) ? selectedAttempt.removedHotspots : []),
      ...(Array.isArray(selectedAttempt?.resolution?.removedHotspots) ? selectedAttempt.resolution.removedHotspots : []),
      ...(Array.isArray(selectedAttempt?.resolution?.removedOptionalHotspots) ? selectedAttempt.resolution.removedOptionalHotspots : []),
      ...(Array.isArray(selectedAttempt?.resolution?.removedTopPriorityHotspots) ? selectedAttempt.resolution.removedTopPriorityHotspots : []),
      ...(Array.isArray(selectedAttempt?.changesRequiredDisplay?.removedItems) ? selectedAttempt.changesRequiredDisplay.removedItems : []),
    ];
    const acknowledgedRemovedHotspotIdsSource = options?.acknowledgedRemovedHotspotIds;
    const acknowledgedRemovedHotspotIds = Array.from(new Set(
      (Array.isArray(acknowledgedRemovedHotspotIdsSource) ? acknowledgedRemovedHotspotIdsSource : [])
        .map((id) => Number(id))
        .filter((id: number) => id > 0),
    ));
    const hasTimingRisk =
      selectedAttempt?.timingRisk?.type === 'PARTIAL_STAY_AFTER_CLOSING'
      || selectedAttempt?.requiresTimingRiskConfirmation === true;
    const hasPriorityRemoval =
      confirmRemovedRows.length > 0
      || selectedAttempt?.requiresPriorityRemovalConfirmation === true
      || acknowledgedRemovedHotspotIds.length > 0;
    const hasP3Removal = confirmRemovedRows.some((row) => {
      const priority = Number(row?.priority || row?.hotspot_priority || row?.rawPriority || row?.workPriority || 0);
      return priority === 3;
    });
    const hasP1P2Removal = confirmRemovedRows.some((row) => {
      const priority = Number(row?.priority || row?.hotspot_priority || row?.rawPriority || row?.workPriority || 0);
      return priority === 1 || priority === 2;
    });
    const selectedOpeningConflict =
      selectedAttempt?.selectedOpeningConflict ||
      selectedAttempt?.resolution?.selectedOpeningConflict ||
      selectedAttempt?.resolution?.manualInsertionFit?.selectedOpeningConflict ||
      null;
    const canForceClosedHotspotConflict =
      options?.allowClosedHotspotConflict === true ||
      (selectedAttempt?.canForceConflict === true && !!selectedOpeningConflict);
    const hasUnprovenProtectedRemoval = confirmRemovedRows.some((row) => {
      const priority = Number(row?.priority || row?.hotspot_priority || row?.rawPriority || row?.workPriority || 0);
      const reasonCode = String(row?.removalReasonCode || '').toUpperCase();
      return (priority === 1 || priority === 2) && reasonCode === 'UNPROVEN_REMOVAL';
    });

    if (!attemptId) {
      toast.error('Preview attempt is missing.');
      return;
    }
    if (!(planId > 0)) {
      toast.error('Plan ID missing.');
      return;
    }
    if (hasUnprovenProtectedRemoval) {
      toast.error('This preview removes a protected hotspot without proven route-feasibility evidence. Please recalculate before confirming.');
      return;
    }
    if (hasP3Removal && selectedAttempt?.removalPolicy?.allowP3Removal !== true) {
      toast.error('This preview removes a Priority 3 hotspot without approval. Please recalculate with P3 removal allowed.');
      return;
    }
    if (hasP1P2Removal && selectedAttempt?.removalPolicy?.allowP1P2Removal !== true) {
      toast.error('This preview removes a Priority 1 / Priority 2 hotspot without approval. Please recalculate with protected removal allowed.');
      return;
    }

    setConfirmFitHereLoading(true);
    stopFitHereProgressTimer();
    try {
      const confirmResult: any = await ItineraryService.confirmManualHotspotFitHere(planId, {
        attemptId,
        allowTimingRisk: options?.allowTimingRisk === true || hasTimingRisk || canForceClosedHotspotConflict,
        allowClosedHotspotConflict: canForceClosedHotspotConflict,
        allowPriorityRemoval:
          options?.allowPriorityRemoval === true ||
          hasPriorityRemoval ||
          selectedAttempt?.removedPrioritySummary?.requiresPriorityRemovalConfirmation === true,
        acknowledgedRemovedHotspotIds,
      });
      const confirmedHotspotId = Number(
        confirmResult?.selectedHotspotId
        || selectedAttempt?.selectedHotspotId
        || selectedFitHotspot?.id
        || 0,
      );
      const confirmedRouteId = Number(
        confirmResult?.routeId
        || selectedAttempt?.routeId
        || addHotspotModal.routeId
        || 0,
      );
      const persistedTimeline = Array.isArray(confirmResult?.routeTimeline)
        ? confirmResult.routeTimeline
        : (Array.isArray(confirmResult?.fullTimeline) ? confirmResult.fullTimeline : []);
      const insertedTimelineRow = persistedTimeline.find((row) => (
        String(row?.type || '').toLowerCase() === 'attraction'
        && Number(row?.hotspotId ?? row?.locationId ?? 0) === confirmedHotspotId
        && (row?.planOwnWay === true || row?.isManual === true)
      ));
      const backendScheduledManualHotspot = Array.isArray(confirmResult?.resolution?.scheduledManualHotspots)
        ? confirmResult.resolution.scheduledManualHotspots.find((row) =>
            Number(row?.hotspotId || row?.id || 0) === confirmedHotspotId
          )
        : null;

      const insertedRouteHotspotId = Number(
        confirmResult?.routeHotspotId
        || backendScheduledManualHotspot?.routeHotspotId
        || insertedTimelineRow?.routeHotspotId
        || 0,
      ) || null;
      const removedRows = [
        ...(Array.isArray(selectedAttempt?.removedHotspots) ? selectedAttempt.removedHotspots : []),
        ...(Array.isArray(confirmResult?.removedHotspots) ? confirmResult.removedHotspots : []),
        ...(Array.isArray(confirmResult?.resolution?.removedHotspots) ? confirmResult.resolution.removedHotspots : []),
        ...(Array.isArray(confirmResult?.resolution?.removedOptionalHotspots) ? confirmResult.resolution.removedOptionalHotspots : []),
        ...(Array.isArray(confirmResult?.resolution?.removedTopPriorityHotspots) ? confirmResult.resolution.removedTopPriorityHotspots : []),
      ];
      const removedHotspotIds = Array.from(new Set(
        removedRows
          .map((row) => Number(row?.id || row?.hotspotId || row?.hotspot_ID || 0))
          .filter((id: number) => id > 0),
      ));

      if (confirmedHotspotId > 0) {
        setAddedInModalHotspotIds((prev) => {
          const next = new Set(prev);
          next.add(confirmedHotspotId);
          for (const removedId of removedHotspotIds) {
            next.delete(removedId);
          }
          return next;
        });
      }

      setExcludedHotspotIds((prev) => {
        const next = new Set(prev.map(Number).filter((id: number) => id > 0));
        for (const removedId of removedHotspotIds) {
          next.add(removedId);
        }
        if (confirmedHotspotId > 0) {
          next.delete(confirmedHotspotId);
        }
        return Array.from(next);
      });

      setAvailableHotspots((prev) => prev.map((row) => {
        const rowId = Number(row?.id || 0);

        if (confirmedHotspotId > 0 && rowId === confirmedHotspotId) {
          return {
            ...row,
            alreadyAdded: true,
            visitAgain: true,
            availabilityStatus: 'ACTIVE_THIS_ROUTE',
            availabilityReason: 'Hotspot is already active on this route.',
            actionDisabled: true,
            buttonLabel: 'Added',
            routeHotspotId: insertedRouteHotspotId ?? row.routeHotspotId ?? null,
            planOwnWay: true,
            isManual: true,
          };
        }

        if (removedHotspotIds.includes(rowId)) {
          return {
            ...row,
            alreadyAdded: false,
            visitAgain: false,
            availabilityStatus: 'EXCLUDED_BY_ROUTE',
            availabilityReason: 'Hotspot is currently excluded for this route.',
            actionDisabled: false,
            buttonLabel: 'Preview',
            routeHotspotId: null,
            planOwnWay: false,
            isManual: false,
          };
        }

        return row;
      }));

      const existingConfirmedRoute = itinerary?.days?.find(
        (day) => Number(day.id) === Number(confirmedRouteId),
      );

      const confirmedSegments = normalizeConfirmedTimelineToSegments(persistedTimeline, {
        existingSegments: existingConfirmedRoute?.segments || [],
        availableHotspots,
      });

      if (confirmedRouteId > 0 && persistedTimeline.length > 0) {
        setItinerary((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            days: prev.days.map((day) => (
              Number(day.id) !== confirmedRouteId
                ? day
                : {
                    ...day,
                    segments: confirmedSegments.length > 0 ? confirmedSegments : day.segments,
                  }
            )),
          };
        });
        setRouteNeedsRebuild(confirmedRouteId);
      }

      toast.success('Hotspot inserted successfully. Timeline updated.');
      setSelectedFitHotspot(null);
      setActivePreviewHotspotId(null);
      setSelectedHotspotIds([]);
      setManualPreviewState(null);
      setPreviewTimelinesByHotspot({});
      setPreviewResolutionsByHotspot({});
      setGroupPreviewTimeline([]);
      setGroupPreviewResolution(null);
      setTempModalTimeline([]);
      setFitHereModal({
        open: false,
        loading: false,
        loadingStepIndex: 0,
        failedReason: null,
        attempt: null,
        anchorKey: null,
        retryPayload: null,
      });
      setAutoFitHereModal({
        open: false,
        loading: false,
        failedReason: null,
        results: [],
        selectedAnchorKey: null,
        loadingAnchorCount: 0,
        loadingStartedAtMs: null,
        performanceSummary: null,
      });
      setTriedFitHereAnchors({});

      if (quoteId) {
        const [detailsRes, hotelRes] = await Promise.all([
          ItineraryService.getDetails(quoteId),
          shouldShowHotels ? ItineraryService.getHotelDetails(quoteId) : Promise.resolve(null),
        ]);
        const refreshedDetails = detailsRes as ItineraryDetailsResponse;
        const mergedDetails: ItineraryDetailsResponse = {
          ...refreshedDetails,
          days: (refreshedDetails.days || []).map((day) => {
            if (Number(day.id) !== Number(confirmedRouteId)) {
              return day;
            }

            return {
              ...day,
              segments: confirmedSegments.length > 0 ? confirmedSegments : day.segments,
            };
          }),
        };

        setItinerary(mergedDetails);
        setHotelDetails(hotelRes as ItineraryHotelDetailsResponse);
      }
    } catch (error) {
      if (isExpiredOrMissingFitHereAttemptError(error)) {
        const scrollDayNumber = resolveActiveFitHereDayNumber(selectedAttempt);
        const scrollStorageKey = getFitHereRefreshScrollStorageKey();
        if (scrollStorageKey && scrollDayNumber) {
          window.sessionStorage.setItem(scrollStorageKey, String(scrollDayNumber));
        }
        toast.info('This Fit Here preview expired. Refreshing the itinerary now.');
        window.setTimeout(() => {
          window.location.reload();
        }, 600);
        return;
      }

      const confirmErrorCode = extractFitHereConfirmErrorCode(error);
      if (
        confirmErrorCode === 'MANUAL_INSERT_SELECTED_HOTSPOT_CLOSING_NOT_RESOLVED' &&
        !options?.allowClosedHotspotConflict &&
        selectedAttempt?.attemptId &&
        (selectedAttempt?.selectedOpeningConflict || selectedAttempt?.canForceConflict === true)
      ) {
        toast.info('Retrying the same Fit Here attempt with the approved conflict-save path.');
        await handleConfirmFitHere(
          {
            allowTimingRisk: true,
            allowClosedHotspotConflict: true,
            acknowledgedRemovedHotspotIds,
          },
          selectedAttempt,
        );
        return;
      }

      if (isRetryableFitHereConfirmError(error)) {
        const retryPayload = fitHereModal.retryPayload;
        if (retryPayload) {
          toast.error('This preview changed on the server. Recalculating the latest Fit Here preview now.');
          await handleFitHereClick(retryPayload.day, retryPayload.anchor);
          return;
        }
      }
      toast.error(error?.message || 'Could not confirm Fit Here insertion.');
    } finally {
      stopFitHereProgressTimer();
      setConfirmFitHereLoading(false);
    }
  };

  const handlePreviewHotspot = async (
    hotspotId: number,
    options?: {
      planId?: number;
      routeId?: number;
      anchor?: HotspotAnchor;
      allowTopPriorityRemoval?: boolean;
      selectedHotspotIds?: number[];
      forceRefresh?: boolean;
      source?: 'AFTER_MATRIX_BUILD' | 'USER_REFRESH' | 'DESTINATION_SIDE_MATRIX_NOT_REQUIRED';
    },
  ) => {
    const pId = options?.planId || addHotspotModal.planId;
    const rId = options?.routeId || addHotspotModal.routeId;
    const anchor = options?.anchor || selectedHotspotAnchor || undefined;
    if (!pId || !rId) return;

    const requestId = ++previewRequestIdRef.current;
    resetManualHotspotPreviewState();
    setActivePreviewHotspotId(hotspotId);
    setSelectedHotspotIds([hotspotId]);
    setTopPriorityReplacementApproved(false);
    setIsPreviewingHotspotId(hotspotId);

    // Don't force scroll list to top here, let the user stay where they clicked
    if (timelinePreviewRef.current) {
      timelinePreviewRef.current.scrollTop = 0;
    }

    try {
      const preview = await ItineraryService.previewAddHotspot(
        pId,
        rId,
        hotspotId,
        anchor
          ? {
            anchorType: anchor.anchorType,
            anchorIndex: anchor.anchorIndex,
          }
          : undefined,
        {
          allowTopPriorityRemoval: options?.allowTopPriorityRemoval === true,
          selectedHotspotIds: [hotspotId],
        },
      );

      if (requestId !== previewRequestIdRef.current) {
        return;
      }

      const fullTimeline = Array.isArray(preview?.fullTimeline) ? [...preview.fullTimeline] : [];
      console.log('[ManualHotspotModal] received_timeline', {
        hotspotId: Number(hotspotId),
        segments: fullTimeline.length,
        hasPreviewOrder: fullTimeline.some((seg) => Number.isFinite(Number(seg?.matrixPreviewOrder ?? seg?.previewOrder))),
      });

      const manualTimingPolicy = getManualTimingPolicyFromPreview(preview);

      // The backend returns { newHotspot, otherConflicts, fullTimeline, allInsertionSlots }.
      const previewResolution = {
        ...(preview?.resolution || {}),
        anchorPreference: preview?.anchorPreference || null,
        newHotspot: preview?.newHotspot || null,
        allInsertionSlots: preview?.allInsertionSlots || [],
        slotInsights: preview?.resolution?.slotInsights || [],
        manualTimingPolicy,
      };
      setManualPreviewState({
        ...preview,
        fullTimeline,
        manualTimingPolicy,
        manualInsertionFit:
          preview?.manualInsertionFit
          || previewResolution?.manualInsertionFit
          || preview?.resolution?.manualInsertionFit
          || null,
      });
      setPreviewTimelinesByHotspot((prev) => ({
        ...prev,
        [hotspotId]: fullTimeline,
      }));
      setPreviewResolutionsByHotspot((prev) => ({
        ...prev,
        [hotspotId]: previewResolution,
      }));
      setGroupPreviewResolution(previewResolution);
      if (options?.allowTopPriorityRemoval === true) {
        setForceReplacementApprovedByHotspot((prev) => ({
          ...prev,
          [hotspotId]: true,
        }));
        setTopPriorityReplacementApproved(true);
      }

      if (preview?.anchorPreference?.honored === false) {
        const requestedIndex = preview?.anchorPreference?.requested?.anchorIndex;
        const resolvedIndex = preview?.anchorPreference?.resolved?.anchorIndex;
        const resolvedTimeRange = preview?.anchorPreference?.resolved?.timeRange;
        toast.info(
          `Preferred anchor ${requestedIndex} moved to ${resolvedIndex}${resolvedTimeRange ? ` (${resolvedTimeRange})` : ''} due to timing constraints.`
        );
      }
    } catch (e) {
      if (requestId !== previewRequestIdRef.current) {
        return;
      }
      console.error("Failed to preview hotspot", e);
      toast.error(e?.message || "Failed to preview hotspot");
      setActivePreviewHotspotId(null);
      setSelectedHotspotIds([]);
    } finally {
      if (requestId === previewRequestIdRef.current) {
        setIsPreviewingHotspotId(null);
      }
    }
  };

  const handleRemovePreviewHotspot = async (hotspotId: number) => {
    if (Number(activePreviewHotspotId || 0) !== Number(hotspotId)) return;
    previewRequestIdRef.current += 1;
    resetManualHotspotPreviewState();
    setActivePreviewHotspotId(null);
    setSelectedHotspotIds([]);
  };

  const handleConfirmPriorityReplacement = async () => {
    const targetHotspotId = pendingPriorityReplacementHotspotId || selectedHotspotId;
    if (!targetHotspotId) return;

    const needsReplacementApproval =
      (
        (Array.isArray(groupPreviewResolution?.removedTopPriorityHotspots) && groupPreviewResolution.removedTopPriorityHotspots.length > 0)
        || (Array.isArray(groupPreviewResolution?.topPriorityAffected) && groupPreviewResolution.topPriorityAffected.length > 0)
        || (Array.isArray((groupPreviewResolution as any)?.p3HotspotsToRemove) && (groupPreviewResolution as any).p3HotspotsToRemove.length > 0)
        || groupPreviewResolution?.requiresP3RemovalConfirmation === true
      );

    if (needsReplacementApproval) {
      await handlePreviewHotspot(targetHotspotId, {
        allowTopPriorityRemoval: true,
        selectedHotspotIds,
      });

      setForceReplacementApprovedByHotspot((prev) => ({
        ...prev,
        [targetHotspotId]: true,
      }));
      setTopPriorityReplacementApproved(true);
      return;
    }

    setForceReplacementApprovedByHotspot((prev) => ({
      ...prev,
      [targetHotspotId]: true,
    }));
    setTopPriorityReplacementApproved(true);
  };

  const handleCancelPriorityReplacement = async () => {
    const targetHotspotId = pendingPriorityReplacementHotspotId || selectedHotspotId;
    if (!targetHotspotId) return;
    await handleRemovePreviewHotspot(targetHotspotId);
  };

  const handleBuildMatrixAndPreviewAgain = async () => {
    const candidateId = Number(activePreviewHotspotId || 0);
    const planId = Number(addHotspotModal.planId || 0);
    const routeId = Number(addHotspotModal.routeId || 0);

    if (isDestinationSideManualPreview) {
      resetManualHotspotPreviewStateButKeepActiveHotspot(candidateId);
      await handlePreviewHotspot(candidateId, {
        forceRefresh: true,
        source: 'DESTINATION_SIDE_MATRIX_NOT_REQUIRED',
      });
      return;
    }

    if (!planId || !routeId || !candidateId) {
      toast.error('Missing plan, route, or hotspot.');
      return;
    }

    setIsBuildingMatrix(true);
    try {
      const result: any = await ItineraryService.buildMissingManualHotspotMatrix(planId, routeId, candidateId);
      const resultCode = String(result?.code || '').toUpperCase();

      if (
        !result?.success
        && resultCode !== 'SINGLE_HOTSPOT_CITY_MATRIX_BUILT'
        && resultCode !== 'EMPTY_ROUTE_CITY_MATRIX_BUILT'
        && resultCode !== 'DESTINATION_SIDE_MATRIX_NOT_REQUIRED'
        && resultCode !== 'NO_ROUTE_HOTSPOT_ANCHOR_FOR_MATRIX'
        && resultCode !== 'CITY_ENDPOINT_NOT_FOUND_FOR_SINGLE_HOTSPOT_MATRIX'
        && resultCode !== 'CITY_ENDPOINT_NOT_FOUND_FOR_EMPTY_ROUTE_MATRIX'
      ) {
        toast.error(result?.message || 'Matrix build failed.');
        return;
      }

      if (
        resultCode === 'SINGLE_HOTSPOT_CITY_MATRIX_BUILT'
        || resultCode === 'EMPTY_ROUTE_CITY_MATRIX_BUILT'
      ) {
        toast.success(result?.message || 'Matrix built using city endpoint. Rebuilding preview...');
      } else if (
        resultCode === 'CITY_ENDPOINT_NOT_FOUND_FOR_SINGLE_HOTSPOT_MATRIX'
        || resultCode === 'CITY_ENDPOINT_NOT_FOUND_FOR_EMPTY_ROUTE_MATRIX'
      ) {
        toast.error(result?.message || 'Cannot build matrix because city endpoint was not found.');
        return;
      } else if (resultCode === 'EMPTY_ROUTE_CITY_MATRIX_FAILED') {
        toast.error(result?.message || 'City endpoint matrix failed for first hotspot insertion.');
        return;
      } else if (resultCode === 'NO_ROUTE_HOTSPOT_ANCHOR_FOR_MATRIX') {
        toast.error(result?.message || 'Cannot build matrix because this route has no hotspot anchor and no city endpoint.');
        return;
      } else if (resultCode !== 'DESTINATION_SIDE_MATRIX_NOT_REQUIRED') {
        toast.success('Matrix data built. Rebuilding preview...');
      } else {
        // Destination-side re-preview is silent to avoid implying matrix was needed.
      }
      resetManualHotspotPreviewStateButKeepActiveHotspot(candidateId);
      await handlePreviewHotspot(candidateId, { forceRefresh: true, source: 'AFTER_MATRIX_BUILD' });
    } catch (error) {
      toast.error(error?.response?.data?.message || error?.message || 'Matrix build failed.');
    } finally {
      setIsBuildingMatrix(false);
    }
  };

  const handleAddHotspot = async () => {
    if (readOnly) {
      console.log('Cannot add hotspot in read-only mode');
      return;
    }

    if (!addHotspotModal.planId || !addHotspotModal.routeId) {
      return;
    }

    if (selectedHotspotAnchor) {
      toast.error('Please use the Fit Here button on the timeline to add this hotspot at an exact position.');
      return;
    }

    const getCurrentPreviewCandidateId = (): number => {
      const fit =
        (activePreviewResolution as any)?.manualInsertionFit
        || (manualPreviewState as any)?.manualInsertionFit
        || (activePreviewResolution as any)?.resolution?.manualInsertionFit
        || null;
      return Number(
        fit?.selectedHotspotId
        || fit?.hotspotId
        || activePreviewHotspotId
        || 0,
      );
    };

    const candidateId = getCurrentPreviewCandidateId();
    if (!candidateId) {
      toast.error('Please preview one hotspot first.');
      return;
    }

    const unresolvedPriorityReplacement = (() => {
      const resolution = groupPreviewResolution || activePreviewResolution;
      const removedTopPriorityCount = Array.isArray(resolution?.removedTopPriorityHotspots)
        ? resolution.removedTopPriorityHotspots.length
        : 0;
      const affectedPriorityCount = Array.isArray(resolution?.topPriorityAffected)
        ? resolution.topPriorityAffected.length
        : 0;
      const p3Count = Array.isArray((resolution as any)?.p3HotspotsToRemove)
        ? (resolution as any).p3HotspotsToRemove.length
        : 0;
      const needsReplacementApproval =
        removedTopPriorityCount > 0
        || affectedPriorityCount > 0
        || p3Count > 0
        || resolution?.requiresP3RemovalConfirmation === true;
      return needsReplacementApproval && topPriorityReplacementApproved !== true;
    })();

    if (unresolvedPriorityReplacement) {
      toast.error("Confirm the priority replacement in the temp timeline before adding this hotspot.");
      return;
    }

    const previewSource = groupPreviewResolution || activePreviewResolution || manualPreviewState;
    const previewValidation = previewSource?.validation || null;
    const manualTimingPolicy = getManualTimingPolicyFromPreview(previewSource);
    const forceConflictInsertion =
      previewValidation?.readyToApply === false
      && previewValidation?.requiresPriorityConfirmation !== true;

    const hasConflicts = selectedPreviewSegments.some((seg) => seg?.isConflict === true);
    if (!forceConflictInsertion && hasConflicts) {
      toast.error("Selected hotspot still has timing conflicts in the proposed timeline.");
      return;
    }

    const alreadyAddedIds = new Set<number>([
      ...Array.from(currentRouteAttractionHotspotIds || []).map((id: number) => Number(id)),
      ...Array.from(addedInModalHotspotIds || []).map((id: number) => Number(id)),
    ]);
    if (alreadyAddedIds.has(candidateId)) {
      toast.info('This hotspot is already added.');
      return;
    }

    setIsAddingHotspot(true);
    setIsApplyingPreviewHotspot(true);
    try {
      const affectedRouteId = addHotspotModal.routeId;
      const matrixFit =
        (activePreviewResolution as any)?.manualInsertionFit
        || (groupPreviewResolution as any)?.manualInsertionFit
        || (activePreviewResolution as any)?.resolution?.manualInsertionFit
        || (groupPreviewResolution as any)?.resolution?.manualInsertionFit
        || null;
      const applyHotspotIds = [candidateId];

      const bestSlot = matrixFit?.bestSlot || null;
      const bestRouteFitType = String(bestSlot?.routeFitType || '').toUpperCase();
      const isNormalMatrixSlot =
        bestRouteFitType === 'ON_ROUTE' || bestRouteFitType === 'MINOR_DETOUR';
      const isSingleHotspotSlot =
        bestRouteFitType === 'SINGLE_HOTSPOT_BEFORE' || bestRouteFitType === 'SINGLE_HOTSPOT_AFTER';
      const isDestinationSideSlot =
        bestRouteFitType === 'DESTINATION_SIDE_INSERTION';
      const shouldSendPreferredSlot =
        !!bestSlot
        && (
          (
            matrixFit?.chosenSlotSource === 'BEST_FIT'
            && isNormalMatrixSlot
            && Number(bestSlot?.fromHotspotId || 0) > 0
            && Number(bestSlot?.toHotspotId || 0) > 0
          )
          || (
            isSingleHotspotSlot
            && (
              Number(bestSlot?.fromHotspotId || 0) > 0
              || Number(bestSlot?.toHotspotId || 0) > 0
            )
          )
          || (
            isDestinationSideSlot
            && Number(bestSlot?.fromHotspotId || 0) > 0
          )
        );
      const matrixPreferredSlot = shouldSendPreferredSlot
        ? {
            fromHotspotId: Number(bestSlot?.fromHotspotId || 0),
            toHotspotId: Number(bestSlot?.toHotspotId || 0),
            slotIndex: Number.isFinite(Number(bestSlot?.slotIndex)) ? Number(bestSlot.slotIndex) : 0,
            source: 'BEST_FIT' as const,
          }
        : undefined;

      console.log('[ManualHotspotApply][payload]', {
        selectedHotspotIds,
        activeRouteHotspotIds: Array.from(currentRouteAttractionHotspotIds),
        previewCandidateId: candidateId,
        applyHotspotIds,
        matrixPreferredSlot,
      });

      const addResult: any = await ItineraryService.applyManualHotspots(
        addHotspotModal.planId,
        addHotspotModal.routeId,
        applyHotspotIds,
        selectedHotspotAnchor
          ? {
              anchorType: selectedHotspotAnchor.anchorType,
              anchorIndex: selectedHotspotAnchor.anchorIndex,
            }
          : undefined,
        {
          allowTopPriorityRemoval: topPriorityReplacementApproved === true,
          forceConflictInsertion,
          matrixPreferredSlot,
          manualTimingPolicy,
        },
      );

      if (addResult?.code === 'MANUAL_HOTSPOT_ALREADY_EXISTS_IN_ROUTE' || addResult?.alreadyExists === true) {
        toast.info('This hotspot is already added.');
        setAddedInModalHotspotIds((prev) => {
          const next = new Set(prev);
          next.add(candidateId);
          return next;
        });
        setAvailableHotspots((prev) => prev.map((row) => (
          Number(row?.id || 0) === candidateId
            ? {
                ...row,
                alreadyAdded: true,
                availabilityStatus: 'ACTIVE_THIS_ROUTE',
                actionDisabled: true,
                buttonLabel: 'Added',
              }
            : row
        )));
        resetManualHotspotPreviewState();
        setActivePreviewHotspotId(null);
        return;
      }

      if (addResult?.success === false || addResult?.inserted === false) {
        toast.error(addResult?.message || addResult?.reason || "Failed to add selected hotspots at this position");
        return;
      }

      if (addResult?.code === 'MANUAL_HOTSPOT_INSERTED_WITH_LOW_PRIORITY_REMOVAL') {
        toast.success('Added hotspot by removing lower-priority stops on this route');
      } else if (addResult?.code === 'MANUAL_HOTSPOT_INSERTED_WITH_MATRIX_SLOT') {
        toast.success('Added hotspot using best route-fit slot');
      } else if (addResult?.resolution?.forceConflictInsertionApplied === true) {
        toast.success('Hotspot added successfully.');
      } else {
        toast.success('Hotspot added successfully.');
      }

      setAddedInModalHotspotIds((prev) => {
        const next = new Set(prev);
        next.add(candidateId);
        return next;
      });
      setAvailableHotspots((prev) => prev.map((row) => (
        Number(row?.id || 0) === candidateId
          ? {
              ...row,
              alreadyAdded: true,
              availabilityStatus: 'ACTIVE_THIS_ROUTE',
              actionDisabled: true,
              buttonLabel: 'Added',
            }
          : row
      )));

      // Show rebuild button for the day where a manual hotspot was added.
      if (affectedRouteId) {
        setRouteNeedsRebuild(affectedRouteId);
      }

      // Keep modal open for sequential add flow.
      resetManualHotspotPreviewState();
      setActivePreviewHotspotId(null);

      // Reload itinerary data in background while modal stays open.
      if (quoteId) {
        const [detailsRes, hotelRes] = await Promise.all([
          ItineraryService.getDetails(quoteId),
          shouldShowHotels ? ItineraryService.getHotelDetails(quoteId) : Promise.resolve(null),
        ]);
        setItinerary(detailsRes as ItineraryDetailsResponse);
        setHotelDetails(hotelRes as ItineraryHotelDetailsResponse);
      }

      if (addHotspotModal.routeId) {
        const currentRoute = itinerary?.days?.find(
          (day) => Number(day?.id || 0) === Number(addHotspotModal.routeId),
        );
        const refreshRequest = selectedHotspotAnchor
          ? ItineraryService.getAvailableHotspotsForAnchor({
              planId: Number(addHotspotModal.planId || 0),
              routeId: Number(addHotspotModal.routeId || 0),
              anchorType: selectedHotspotAnchor.anchorType,
              anchorIndex: Number(selectedHotspotAnchor.anchorIndex),
            })
          : ItineraryService.getAvailableHotspots(addHotspotModal.routeId);

        refreshRequest
          .then((rows) => {
            const refreshRows = Array.isArray(rows)
              ? rows
              : (Array.isArray(rows?.hotspots) ? rows.hotspots : []);
            const refreshMeta = Array.isArray(rows) ? null : (rows?.hotspotFilterMeta || null);
            setHotspotFilterMeta(refreshMeta);
            console.log('[AddHotspotModal] hotspot_filter_meta', refreshMeta);
            const routeSourceName = String((currentRoute as any)?.departure || '').trim();
            const routeDestinationName = String((currentRoute as any)?.arrival || '').trim();
            const anchorFromName = String(selectedHotspotAnchor?.anchorFrom || '').trim();
            const anchorToName = String(selectedHotspotAnchor?.anchorTo || '').trim();
            const filteredRefreshRows = filterAvailableHotspotsForAnchor(
              refreshRows as AvailableHotspot[],
              routeSourceName,
              routeDestinationName,
              anchorFromName,
              anchorToName,
            );
            setAvailableHotspots(normalizeAvailableHotspots(filteredRefreshRows));
          })
          .catch(() => {
            // Local optimistic update already applied; silent background sync failure.
          });
      }
    } catch (e) {
      console.error("Failed to add hotspot", e);
      const rawMessage = String(e?.message || '').trim();
      let backendCode = '';
      let backendMessage = '';

      try {
        // api(...) throws Error with response text appended after status text.
        const jsonStart = rawMessage.indexOf('{');
        if (jsonStart >= 0) {
          const payload = JSON.parse(rawMessage.slice(jsonStart));
          backendCode = String(payload?.code || payload?.error?.code || '').trim();
          backendMessage = String(payload?.message || payload?.error?.message || '').trim();
        }
      } catch {
        // Fall through to generic extraction.
      }

      const fallbackFromStatus = (() => {
        if (rawMessage.includes(' 409 ')) return 'Conflict while applying hotspot.';
        if (rawMessage.includes(' 422 ')) return 'Validation failed while applying hotspot.';
        return '';
      })();

      const displayMessage = [backendCode, backendMessage || fallbackFromStatus]
        .filter((v) => String(v || '').trim().length > 0)
        .join(': ')
        || rawMessage
        || 'Failed to add hotspot';

      if (backendCode === 'MANUAL_HOTSPOT_ALREADY_EXISTS_IN_ROUTE') {
        toast.info('This hotspot is already added.');
        setAddedInModalHotspotIds((prev) => {
          const next = new Set(prev);
          next.add(candidateId);
          return next;
        });
        return;
      }

      toast.error(displayMessage);
    } finally {
      setIsAddingHotspot(false);
      setIsApplyingPreviewHotspot(false);
    }
  };

  const toImgSrc = (path: string | null | undefined): string | undefined => {
    if (!path || !path.trim()) return undefined;
    if (path.startsWith('http')) return path;
    const apiBase = (import.meta.env.VITE_API_DVI_BASE_URL as string || '').replace(/\/$/, '');
    return `${apiBase}${path}`;
  };

  const openGalleryModal = (images: string[], title: string) => {
    const apiBase = (import.meta.env.VITE_API_DVI_BASE_URL as string || '').replace(/\/$/, '');
    const resolved = images
      .filter(img => img && img.trim() !== '')
      .map(img => img.startsWith('http') ? img : `${apiBase}${img}`);
    setGalleryActiveIdx(0);
    setGalleryModal({
      open: true,
      images: resolved,
      title,
    });
  };

  const applyArrivalPolicyDecision = (
    policy: HotelArrivalPolicyResponse,
    context: {
      planId: number;
      routeId: number;
      routeDate: string;
      cityCode: string;
      cityName: string;
    },
  ) => {
    if (!policy.shouldOpenHotelSearch) {
      if (policy.message) {
        toast.info(policy.message);
      }
      return;
    }

    if (policy.hotelFlowAction === 'DIRECT_SIGHTSEEING' && policy.deferHotelToEndOfDay) {
      toast.info('Arrival policy: sightseeing first, hotel check-in later in the day.');
    } else if (policy.hotelFlowAction === 'DIRECT_HOTEL' && policy.goToHotelImmediately) {
      toast.info('Arrival policy: proceed to hotel first.');
    }

    // ⚡ Lazy-load hotel details when modal opens (not on initial page load)
    ensureHotelDetailsLoaded();

    const itineraryChildCount = Number(itinerary?.children || 0);
    setHotelSearchChildAges((prev) =>
      Array.from({ length: itineraryChildCount }, (_, idx) => prev[idx] || '')
    );

    setHotelSelectionModal({
      open: true,
      planId: context.planId,
      routeId: context.routeId,
      routeDate: context.routeDate,
      cityCode: context.cityCode,
      cityName: context.cityName,
      checkInDate: policy.effectiveCheckInDate,
      checkOutDate: policy.effectiveCheckOutDate,
    });
  };

  const resolveArrivalPolicyForArrivalTimeChange = async (
    request: HotelArrivalPolicyRequest,
  ) => {
    setIsResolvingArrivalPolicy(true);
    try {
      const policy = await ItineraryService.resolveHotelArrivalPolicy(request);
      setLatestArrivalPolicy(policy);

      if (policy.requiresPreviousDayBillingConfirmation) {
        const normalizedRouteDate = normalizeDateToYmd(request.routeDate) || new Date().toISOString().split('T')[0];
        const routeDate = new Date(`${normalizedRouteDate}T00:00:00`);
        const previousDay = new Date(routeDate);
        previousDay.setDate(previousDay.getDate() - 1);

        const formatDate = (d: Date) => {
          const y = d.getFullYear();
          const m = String(d.getMonth() + 1).padStart(2, '0');
          const day = String(d.getDate()).padStart(2, '0');
          return `${y}-${m}-${day}`;
        };

        setArrivalPolicyConfirmModal({
          open: true,
          arrivalDate: formatDate(routeDate),
          previousDayDate: formatDate(previousDay),
          request,
        });
        return;
      }

      if (policy.message) {
        toast.info(policy.message);
      }
    } catch (e) {
      console.error('Failed to resolve arrival hotel policy from arrival-time change', e);
      toast.error(e?.message || 'Failed to resolve hotel arrival policy');
    } finally {
      setIsResolvingArrivalPolicy(false);
    }
  };

  const handleArrivalDateTimeChange = async (newArrivalDateTime: string) => {
    setGuestDetails((prev) => ({
      ...prev,
      arrivalDateTime: newArrivalDateTime,
    }));

    if (!newArrivalDateTime || !itinerary?.planId || !itinerary?.days?.length) {
      return;
    }

    const normalizeArrivalDateTime = (input: string): string | null => {
      const directParsed = new Date(input);
      if (!Number.isNaN(directParsed.getTime())) {
        return directParsed.toISOString();
      }

      const m = input
        .trim()
        .match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})\s+(\d{1,2}):(\d{2})\s*(AM|PM)?$/i);
      if (!m) {
        return null;
      }

      const day = Number(m[1]);
      const month = Number(m[2]);
      const year = Number(m[3]);
      let hour = Number(m[4]);
      const minute = Number(m[5]);
      const ampm = (m[6] || '').toUpperCase();

      if (ampm === 'PM' && hour < 12) hour += 12;
      if (ampm === 'AM' && hour === 12) hour = 0;

      const parsed = new Date(year, month - 1, day, hour, minute, 0);
      if (Number.isNaN(parsed.getTime())) {
        return null;
      }
      return parsed.toISOString();
    };

    const normalizedArrivalDateTime = normalizeArrivalDateTime(newArrivalDateTime);
    if (!normalizedArrivalDateTime) {
      return;
    }

    const firstDay = itinerary.days[0];
    if (!firstDay?.date || !firstDay?.id) {
      return;
    }

    const request: HotelArrivalPolicyRequest = {
      itineraryPlanId: itinerary.planId,
      itineraryRouteId: firstDay.id,
      routeDayNumber: firstDay.dayNumber || 1,
      routeDate: firstDay.date,
      arrivalDateTime: normalizedArrivalDateTime,
      arrivalCityName: guestDetails.arrivalPlace || firstDay.departure || '',
      routeSourceCityName: firstDay.departure || '',
      nightStayCityName: firstDay.arrival || '',
      previousDayBillingDecisionProvided: false,
      previousDayBillingConfirmed: false,
    };

    await resolveArrivalPolicyForArrivalTimeChange(request);
  };

  const openHotelSelectionModal = async (
    planId: number,
    routeId: number,
    routeDate: string,
    cityCode: string,
    cityName: string
  ) => {
    const routeDay = itinerary?.days?.find((d) => Number(d.id) === Number(routeId));
    const currentRouteStartTimeHms = parseDisplayTimeToHms(routeDay?.startTime || '');
    const currentDecisionKey = buildArrivalPolicyDecisionKey(routeId, routeDate, currentRouteStartTimeHms);
    const isDay1EarlyArrival =
      Number(routeDay?.dayNumber || 0) === 1 &&
      isEarlyMorningTime(currentRouteStartTimeHms);

    if (
      isDay1EarlyArrival &&
      itinerary?.planId &&
      currentDecisionKey !== lastArrivalPolicyDecisionKey
    ) {
      const request: HotelArrivalPolicyRequest = {
        itineraryPlanId: itinerary.planId,
        itineraryRouteId: routeId,
        routeDayNumber: routeDay?.dayNumber || 1,
        routeDate,
        arrivalDateTime: normalizeDateToYmd(routeDate)
          ? `${normalizeDateToYmd(routeDate)}T${currentRouteStartTimeHms}`
          : undefined,
        arrivalCityName: routeDay?.departure || cityName || '',
        routeSourceCityName: routeDay?.departure || cityName || '',
        nightStayCityName: routeDay?.arrival || cityName || '',
        previousDayBillingDecisionProvided: false,
        previousDayBillingConfirmed: false,
      };

      await resolveArrivalPolicyForArrivalTimeChange(request);
      return;
    }

    const shouldUseLatestArrivalPolicy =
      !!latestArrivalPolicy && Number(routeDay?.dayNumber || 0) === 1;

    const policyToApply: HotelArrivalPolicyResponse =
      shouldUseLatestArrivalPolicy
        ? latestArrivalPolicy
        : {
            resolutionStatus: 'RESOLVED',
            arrivalWindow:
              Number(routeDay?.dayNumber || 0) === 1
                ? 'AFTERNOON_14_TO_1659'
                : 'NON_ARRIVAL_DAY',
            requiresPreviousDayBillingConfirmation: false,
            shouldOpenHotelSearch: true,
            hotelSearchMode: 'SAME_DAY',
            hotelFlowAction: 'DIRECT_SIGHTSEEING',
            deferHotelToEndOfDay: true,
            goToHotelImmediately: false,
            effectiveCheckInDate: routeDate,
            effectiveCheckOutDate: routeDate,
            sameCityArrival: true,
            normalizationApplied: false,
            message:
              'Arrival policy: sightseeing first, hotel check-in later in the day.',
          };

    applyArrivalPolicyDecision(policyToApply, {
      planId,
      routeId,
      routeDate,
      cityCode,
      cityName,
    });
  };

  const handleSelectHotel = useHotelSelectionMutation({
    readOnly,
    quoteId: quoteId || null,
    shouldShowHotels,
    selectedMealPlan,
    hotelSelectionModal,
    setIsSelectingHotel,
    setHotelSelectionModal,
    setHotelSearchQuery,
    setSelectedMealPlan,
    setItinerary,
    setHotelDetails,
    getSafeErrorMessage,
  });

  // Handle hotel selection from HotelSearchModal
  const handleSelectHotelFromSearch = async (
    hotel: HotelSearchResult,
    mealPlan?: any
  ) => {
    if (readOnly) {
      console.log('Cannot select hotel in read-only mode');
      return;
    }

    if (!hotelSelectionModal.planId || !hotelSelectionModal.routeId) {
      return;
    }

    setIsSelectingHotel(true);
    try {
      // For now, use hotelCode as hotelId. If backend expects different format, adjust here
      const hotelId = parseInt(hotel.hotelCode) || 0;
      const roomTypeId = hotel.roomTypes?.[0]?.roomCode ? parseInt(hotel.roomTypes[0].roomCode) : 1;

      // Store hotel details for TBO confirmation (ALL hotel selections)
      // Calculate checkout date (next day after check-in)
      const checkInDate = new Date(hotelSelectionModal.checkInDate || hotelSelectionModal.routeDate);
      const checkOutDate = new Date(
        hotelSelectionModal.checkOutDate || hotelSelectionModal.routeDate,
      );
      if (!hotelSelectionModal.checkOutDate) {
        checkOutDate.setDate(checkOutDate.getDate() + 1);
      }

      // Format dates to YYYY-MM-DD
      const formatDate = (date: Date) => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
      };

      const selectedHotelPayload = {
        provider: String(hotel.provider || 'tbo').trim().toLowerCase(),
        hotelCode: String(hotel.hotelCode || ''),
        bookingCode: String(hotel.bookingCode || hotel.searchReference || ''),
        searchReference: String(hotel.searchReference || hotel.bookingCode || '').trim() || undefined,
        roomId:
          parseStaahSearchReference(hotel.searchReference || hotel.bookingCode)?.roomId ||
          String(hotel.roomTypes?.[0]?.roomCode || '').trim() ||
          undefined,
        rateId:
          parseStaahSearchReference(hotel.searchReference || hotel.bookingCode)?.rateId ||
          undefined,
        roomType: hotel.roomTypes?.[0]?.roomName || 'Standard',
        netAmount: hotel.netAmount || hotel.totalCost || hotel.totalRoomCost || hotel.price || 0,
        hotelName: hotel.hotelName,
        checkInDate: formatDate(checkInDate),
        checkOutDate: formatDate(checkOutDate),
        searchInitiatedAt: new Date().toISOString(),
      };

      if (!isSupplierBookableHotel(selectedHotelPayload)) {
        toast.error('This hotel does not have a valid live supplier booking code. Please search again and select an available room.');
        return;
      }

      // Store ALL selected hotels with provider info (multi-provider support)
      setSelectedHotelBookings(prev => ({
        ...prev,
        [hotelSelectionModal.routeId]: {
          ...selectedHotelPayload,
          isBookable: true,
          externalStay: false,
          availabilityStatus: 'AVAILABLE',
          availabilityMessage: null,
        }
      }));
      setPrebookData(null);
      prebookDataRef.current = null;
      setHasAcceptedUpdatedPrice(false);

      console.log('DEBUG: Hotel selected and stored', {
        routeId: hotelSelectionModal.routeId,
        hotelCode: hotel.hotelCode,
        hotelName: hotel.hotelName,
      });

      await ItineraryService.selectHotel(
        hotelSelectionModal.planId,
        hotelSelectionModal.routeId,
        hotelId,
        roomTypeId,
        mealPlan || selectedMealPlan
      );

      toast.success("Hotel selected successfully");

      // Close modal
      setHotelSelectionModal({
        open: false,
        planId: null,
        routeId: null,
        routeDate: "",
      });
      setHotelSearchQuery("");
      setSelectedMealPlan({ all: false, breakfast: false, lunch: false, dinner: false });

      // Reload itinerary data
      if (quoteId) {
        const [detailsRes, hotelRes] = await Promise.all([
          ItineraryService.getDetails(quoteId),
          shouldShowHotels ? ItineraryService.getHotelDetails(quoteId) : Promise.resolve(null),
        ]);
        setItinerary(detailsRes as ItineraryDetailsResponse);
        setHotelDetails(hotelRes as ItineraryHotelDetailsResponse);
      }
    } catch (e) {
      console.error("Failed to select hotel", e);
      toast.error(getSafeErrorMessage(e, "Failed to select hotel"));
      throw e; // Re-throw for modal to handle
    } finally {
      setIsSelectingHotel(false);
    }
  };

  const openVideoModal = (videoUrl: string, title: string) => {
    // Convert YouTube watch URLs to embed URLs
    let embedUrl = videoUrl;
    const ytMatch = videoUrl.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([A-Za-z0-9_-]{11})/);
    if (ytMatch) {
      embedUrl = `https://www.youtube.com/embed/${ytMatch[1]}`;
    }
    setVideoModal({
      open: true,
      videoUrl: embedUrl,
      title,
    });
  };

  const refreshConfirmWalletBalance = async (agentId?: number): Promise<number> => {
    if (!agentId) return 0;

    const walletData = await ItineraryService.checkWalletBalance(agentId);
    const amount = getWalletAmountFromResponse(walletData);

    setWalletBalance(walletData?.formatted_balance || walletData?.formattedBalance || formatCurrency(amount));
    setWalletBalanceAmount(amount);

    return amount;
  };

  const resetConfirmWalletTopUpPanel = () => {
    setShowWalletTopUpPanel(false);
    setWalletTopUpAmount("");
    setWalletTopUpRemark("");
    setWalletShortfallAmount(0);
  };

  const prepareWalletTopUpPanel = (currentBalance: number) => {
    const shortfall = Math.max(confirmRequiredAmount - currentBalance, 0);
    const suggestedAmount = Math.ceil(shortfall);

    setWalletShortfallAmount(shortfall);
    setWalletTopUpAmount(String(suggestedAmount > 0 ? suggestedAmount : ""));
    setWalletTopUpRemark(
      `Cash wallet top-up before confirming quotation ${itinerary?.quoteId || itinerary?.planId || ""}`,
    );
    setShowWalletTopUpPanel(true);
  };

  const handleWalletTopUpAndContinue = async () => {
    if (!shouldEnableWalletTopUpOnConfirm || !agentInfo?.agent_id) {
      toast.error("Agent information is missing. Please reopen Confirm Quotation.");
      return;
    }

    const amount = Number(walletTopUpAmount);

    if (!Number.isFinite(amount) || amount <= 0) {
      toast.error("Please enter a valid cash amount greater than 0.");
      return;
    }

    if (!String(walletTopUpRemark || "").trim()) {
      toast.error("Please enter a remark for this wallet top-up.");
      return;
    }

    setIsWalletTopUpSubmitting(true);
    try {
      await AgentAPI.addCashWallet(agentInfo.agent_id, Number(amount.toFixed(2)), walletTopUpRemark.trim());
      toast.success("Cash wallet amount added successfully.");

      const latestWalletBalance = await refreshConfirmWalletBalance(agentInfo.agent_id);

      if (latestWalletBalance < confirmRequiredAmount) {
        prepareWalletTopUpPanel(latestWalletBalance);
        toast.error("Wallet is still insufficient. Please add the remaining shortfall.");
        return;
      }

      resetConfirmWalletTopUpPanel();
      await handleConfirmQuotation({ skipWalletCheck: true });
    } catch (error) {
      console.error("Failed to add cash wallet amount", error);
      toast.error(getSafeErrorMessage(error, "Failed to add cash wallet amount."));
    } finally {
      setIsWalletTopUpSubmitting(false);
    }
  };

  const openConfirmQuotationModal = async () => {
    if (isOpeningConfirmQuotation) {
      return;
    }

    if (!itinerary?.planId) {
      toast.error('Plan ID not found');
      return;
    }

    setIsOpeningConfirmQuotation(true);
    setConfirmQuotationModal(true);
    setPrebookData(null);
    prebookDataRef.current = null;
    setHasAcceptedUpdatedPrice(false);
    setConfirmOccupanciesTemplate(null);
    setFormErrors({});
    resetConfirmWalletTopUpPanel();
    // Reset dynamic passenger rows to avoid stale validation errors from prior modal sessions.
    setAdditionalAdults([]);
    setAdditionalChildren([]);
    setAdditionalInfants([]);

    try {
      // Fetch customer info form data
      const customerInfo = await ItineraryService.getCustomerInfoForm(itinerary.planId);
      const initialWalletAmount = parseWalletAmount(customerInfo.wallet_balance);

      setWalletBalance(customerInfo.wallet_balance || formatCurrency(initialWalletAmount));
      setWalletBalanceAmount(initialWalletAmount);

      // Check wallet balance and get plan details
      const planDetails = await api(`itineraries/edit/${itinerary.planId}`, { method: 'GET' });

      // ✅ FIX: Set agent_id from planDetails - try multiple possible field names
      const agentId = planDetails?.plan?.agent_ID
        || planDetails?.plan?.agent_id
        || planDetails?.agent_ID
        || planDetails?.agent_id
        || customerInfo?.agent_id;

      console.log('🔍 [openConfirmQuotationModal] planDetails:', planDetails);
      console.log('🔍 [openConfirmQuotationModal] customerInfo:', customerInfo);
      console.log('🔍 [openConfirmQuotationModal] agentId resolved to:', agentId);

      if (agentId) {
        try {
          await refreshConfirmWalletBalance(Number(agentId));
        } catch (e) {
          console.warn('⚠️ Failed to fetch wallet balance:', e);
        }
      }

      // Set agentInfo with correct agent_id (only if we have valid agentId)
      if (agentId) {
        setAgentInfo({
          quotation_no: customerInfo.quotation_no,
          agent_name: customerInfo.agent_name,
          agent_display_name:
            customerInfo.agent_display_name || customerInfo.agent_name,
          agent_id: agentId, // Use actual agent ID from plan
        });
        console.log('✅ [openConfirmQuotationModal] agentInfo set with agent_id:', agentId);
      } else {
        console.error('❌ [openConfirmQuotationModal] Failed to get agent_id. Available data:', { planDetails, customerInfo });
        toast.error('Failed to load agent information. Please try again.');
        setConfirmQuotationModal(false);
        return;
      }

      let modalNationalityForSession = confirmDefaultNationality;

      // Prefill arrival and departure details from plan
      if (planDetails?.plan) {
        const plan = planDetails.plan;
        const modalNationality = resolveConfirmNationality(
          plan,
          guestDetails.nationality || confirmDefaultNationality || 'IN',
        );
        modalNationalityForSession = modalNationality;
        setConfirmDefaultNationality(modalNationality);
        const formatDateTime = (dateTime: string) => {
          if (!dateTime) return '';
          const date = new Date(dateTime);
          const day = String(date.getDate()).padStart(2, '0');
          const month = String(date.getMonth() + 1).padStart(2, '0');
          const year = date.getFullYear();
          const hours = date.getHours();
          const minutes = String(date.getMinutes()).padStart(2, '0');
          const ampm = hours >= 12 ? 'PM' : 'AM';
          const displayHours = hours % 12 || 12;
          return `${day}-${month}-${year} ${displayHours}:${minutes} ${ampm}`;
        };

        setGuestDetails(prev => ({
          ...prev,
          nationality: modalNationality,
          arrivalDateTime: plan.trip_start_date_and_time ? formatDateTime(plan.trip_start_date_and_time) : '',
          arrivalPlace: plan.arrival_location || '',
          departureDateTime: plan.trip_end_date_and_time ? formatDateTime(plan.trip_end_date_and_time) : '',
          departurePlace: plan.departure_location || '',
        }));
      }

      let occupanciesTemplateFromPlan: Array<{ adults: number; children: number; childrenAges: number[] }> | null = null;
      const travellersFromPlan = Array.isArray(planDetails?.travellers) ? planDetails.travellers : [];
      if (travellersFromPlan.length > 0) {
        const sortedTravellers = [...travellersFromPlan].sort(
          (a, b) => Number(a?.traveller_details_ID || 0) - Number(b?.traveller_details_ID || 0),
        );
        const adults = sortedTravellers.filter((t) => Number(t?.traveller_type || 0) === 1);
        const children = sortedTravellers.filter((t) => Number(t?.traveller_type || 0) === 2);
        const infants = sortedTravellers.filter((t) => Number(t?.traveller_type || 0) === 3);

        const toPrefillPassenger = (title: string, traveller): AdditionalPassenger => {
          const ageNum = Number(traveller?.traveller_age);
          return {
            title,
            name: '',
            age: Number.isFinite(ageNum) ? String(Math.trunc(ageNum)) : '',
            nationality: modalNationalityForSession,
            panNo: '',
            passportNo: '',
          };
        };

        // Keep primary guest as Adult 1 row and prefill only additional passenger rows.
        if (requiresDetailedPassengerFlow) {
          setAdditionalAdults(adults.slice(1).map((t) => toPrefillPassenger('Mr', t)));
          setAdditionalChildren(children.map((t) => toPrefillPassenger('Ms', t)));
          setAdditionalInfants(infants.map((t) => toPrefillPassenger('Ms', t)));

          const template = buildOccupanciesFromTravellers(
            travellersFromPlan,
            Number(itinerary?.roomCount || 1),
          );
          occupanciesTemplateFromPlan = template;
          setConfirmOccupanciesTemplate(template);
        } else {
          setAdditionalAdults([]);
          setAdditionalChildren([]);
          setAdditionalInfants([]);
          setConfirmOccupanciesTemplate(null);
        }
      }

      if (isVehicleOnlyItinerary) {
        setAdditionalAdults([]);
        setAdditionalChildren([]);
        setAdditionalInfants([]);
        setConfirmOccupanciesTemplate(null);
        setPrebookData(null);
        prebookDataRef.current = null;
        setHasAcceptedUpdatedPrice(false);
        return;
      }

      // ── Auto-accept visually-displayed recommended hotels for unselected routes ──
      // The recommended tab shows a cheapest-per-route hotel for each day. If the user
      // hasn't explicitly clicked "Choose" on some days, mirror those into selectedHotelBookings
      // so the confirm modal and prebook reflect exactly what the user sees.
      let selectedHotelsForPrebook = { ...selectedHotelBookings };
      console.log('[CONFIRM_HOTELS] selectedHotelBookings', selectedHotelBookings);
      console.log(
        '[CONFIRM_HOTELS] coveredRouteIds',
        Array.from(getCoveredRouteIdsFromHotelSelections(selectedHotelBookings)),
      );
      if (hotelDetails?.hotels?.length) {
        const preferredGroupType =
          activeHotelGroupType ?? hotelDetails.hotelTabs?.[0]?.groupType ?? 1;

        const persistedSelections: typeof selectedHotelBookings = {};
        hotelDetails.hotels
          .filter((h) => Number(h.groupType) === Number(preferredGroupType) && isSupplierBookableHotel(h))
          .forEach((h) => {
            const routeId = Number(h.itineraryRouteId || 0);
            if (!routeId) return;
            if (Number(h?.itineraryPlanHotelDetailsId || 0) <= 0) return;

            const routeDay = itinerary?.days?.find((d) => Number(d.id) === routeId);
            const checkInDate = routeDay ? String(routeDay.date).split('T')[0] : '';
            const checkOutDate = routeDay
              ? new Date(new Date(String(routeDay.date)).getTime() + 86400000).toISOString().split('T')[0]
              : '';

            persistedSelections[routeId] = {
              provider: normalizeHotelProvider(h) || 'tbo',
              hotelCode: String(h.hotelCode || h.hotelId || ''),
              bookingCode: String(h.bookingCode || h.searchReference || ''),
              searchReference: String(h.searchReference || h.bookingCode || '').trim() || undefined,
              roomId:
                parseStaahSearchReference(h.searchReference || h.bookingCode)?.roomId ||
                undefined,
              rateId:
                parseStaahSearchReference(h.searchReference || h.bookingCode)?.rateId ||
                undefined,
              roomType: h.roomType || 'Standard',
              netAmount: getHotelSelectionAmount(h),
              hotelName: h.hotelName,
              checkInDate,
              checkOutDate,
              searchInitiatedAt: new Date().toISOString(),
              groupType: preferredGroupType,
              isBookable: true,
              externalStay: false,
              availabilityStatus: 'AVAILABLE',
              availabilityMessage: null,
            };
          });

        if (Object.keys(persistedSelections).length > 0) {
          // ✅ User's in-session selection wins over persisted DB value — only fill routes
          // that the user has NOT explicitly selected in this session.
          const mergedPersisted: typeof persistedSelections = {};
          Object.entries(persistedSelections).forEach(([routeId, val]) => {
            const routeIdNum = Number(routeId);
            const coveredRouteIds = getCoveredRouteIdsFromHotelSelections(selectedHotelsForPrebook);

            if (!coveredRouteIds.has(routeIdNum)) {
              mergedPersisted[routeIdNum] = val;
            }
          });
          selectedHotelsForPrebook = { ...selectedHotelsForPrebook, ...mergedPersisted };
          setSelectedHotelBookings(prev => ({ ...prev, ...mergedPersisted }));
        }

        const routeBuckets = new Map<number, typeof hotelDetails.hotels[0][]>();
        hotelDetails.hotels
          .filter((h) => Number(h.groupType) === Number(preferredGroupType) && isSupplierBookableHotel(h))
          .forEach((h) => {
            const routeId = Number(h.itineraryRouteId || 0);
            if (!routeId) return;
            if (!routeBuckets.has(routeId)) routeBuckets.set(routeId, []);
            routeBuckets.get(routeId)!.push(h);
          });

        const autoSelections: typeof selectedHotelBookings = {};
        routeBuckets.forEach((rows, routeId) => {
          const coveredRouteIds = getCoveredRouteIdsFromHotelSelections(selectedHotelsForPrebook);
          if (coveredRouteIds.has(Number(routeId))) return;

          const cheapest = rows.reduce((best, curr) => {
            const bestTotal = Number(best.totalHotelCost || 0) + Number(best.totalHotelTaxAmount || 0);
            const currTotal = Number(curr.totalHotelCost || 0) + Number(curr.totalHotelTaxAmount || 0);
            return currTotal < bestTotal ? curr : best;
          });

          if (!isSupplierBookableHotel(cheapest)) return;

          const routeDay = itinerary?.days?.find((d) => Number(d.id) === routeId);
          const checkInDate = routeDay ? String(routeDay.date).split('T')[0] : '';
          const checkOutDate = routeDay
            ? new Date(new Date(String(routeDay.date)).getTime() + 86400000).toISOString().split('T')[0]
            : '';

          autoSelections[routeId] = {
            provider: normalizeHotelProvider(cheapest) || 'tbo',
            hotelCode: String(cheapest.hotelCode || cheapest.hotelId || ''),
            bookingCode: String(cheapest.bookingCode || cheapest.searchReference || ''),
            searchReference: String(cheapest.searchReference || cheapest.bookingCode || '').trim() || undefined,
            roomId:
              parseStaahSearchReference(cheapest.searchReference || cheapest.bookingCode)?.roomId ||
              undefined,
            rateId:
              parseStaahSearchReference(cheapest.searchReference || cheapest.bookingCode)?.rateId ||
              undefined,
            roomType: cheapest.roomType || 'Standard',
            netAmount: getHotelSelectionAmount(cheapest),
            hotelName: cheapest.hotelName,
            checkInDate,
            checkOutDate,
            searchInitiatedAt: new Date().toISOString(),
            groupType: preferredGroupType,
            isBookable: true,
            externalStay: false,
            availabilityStatus: 'AVAILABLE',
            availabilityMessage: null,
          };
        });

        if (Object.keys(autoSelections).length > 0) {
          selectedHotelsForPrebook = { ...selectedHotelsForPrebook, ...autoSelections };
          setSelectedHotelBookings(prev => ({ ...prev, ...autoSelections }));
        }
      }

      // ── Prebook only user-explicitly-selected TBO hotels ──
      // Non-TBO hotels are shown in the review modal but are not sent to the TBO prebook API.

      const prebookOccupancies =
        occupanciesTemplateFromPlan && occupanciesTemplateFromPlan.length > 0
          ? occupanciesTemplateFromPlan
          : confirmOccupanciesTemplate && confirmOccupanciesTemplate.length > 0
          ? confirmOccupanciesTemplate
          : buildTboOccupancies(
              Number(itinerary?.roomCount || 1),
              Math.max(Number(itinerary?.adults || 1), 1),
              [],
            );

      const prebookHotelBookings: any[] = Object.entries(selectedHotelsForPrebook)
        .filter(([, hotelData]) => {
          const provider = normalizeHotelProvider(hotelData);
          return provider === 'tbo' && isSupplierBookableHotel(hotelData);
        })
        .map(([routeId, hotelData]) => ({
          occupancies: prebookOccupancies,
          provider: hotelData.provider,
          routeId: parseInt(routeId, 10),
          hotelCode: hotelData.hotelCode,
          hotelName: hotelData.hotelName,
          bookingCode: hotelData.bookingCode,
          roomType: hotelData.roomType,
          checkInDate: hotelData.checkInDate,
          checkOutDate: hotelData.checkOutDate,
          numberOfRooms: Number(itinerary?.roomCount || 1),
          guestNationality: modalNationalityForSession,
          netAmount: toMoneyNumber(hotelData.netAmount),
          searchInitiatedAt: hotelData.searchInitiatedAt,
          passengers: [],
        }));
      console.log('[CONFIRM_HOTELS] nonTboSelectedHotelEntries', nonTboSelectedHotelEntries);

      if (prebookHotelBookings.length > 0) {
        const staleHotel = prebookHotelBookings.find((booking) => {
          if (!booking.searchInitiatedAt) return false;
          const parsed = new Date(String(booking.searchInitiatedAt));
          if (Number.isNaN(parsed.getTime())) return true;
          return Date.now() - parsed.getTime() > TBO_SESSION_WINDOW_MS;
        });

        if (staleHotel) {
          toast.error('Hotel search session exceeded 35 minutes. Please search/select hotel again before prebook.');
          setConfirmQuotationModal(false);
          return;
        }

        const clientIp = await fetch('https://api.ipify.org?format=json')
          .then((res) => res.json())
          .then((data) => data.ip)
          .catch(() => '192.168.1.1');

        setIsPrebooking(true);
        try {
          const prebookResp = await ItineraryService.prebookHotels({
            itinerary_plan_ID: itinerary.planId,
            hotel_bookings: prebookHotelBookings,
            endUserIp: clientIp,
          });
          const normalizedPrebook = prebookResp?.data || prebookResp;
          prebookDataRef.current = normalizedPrebook;
          setPrebookData(normalizedPrebook);
        } catch (prebookErr) {
          toast.error(getSafeErrorMessage(prebookErr, 'Failed to prebook selected hotels. Please retry.'));
        } finally {
          setIsPrebooking(false);
        }
      }
    } catch (e) {
      console.error('Failed to load customer info', e);
      toast.error(e?.message || 'Failed to load customer information');
    } finally {
      setIsOpeningConfirmQuotation(false);
    }
  };

  const handleConfirmQuotation = async (options: { skipWalletCheck?: boolean } = {}) => {
    if (!itinerary?.planId) {
      toast.error('Missing itinerary plan information');
      return;
    }

    const nextErrors: Record<string, string> = {};
    const requiredPrimaryFields: Array<[keyof typeof guestDetails, string]> = [
      ['name', 'Primary guest name is required.'],
      ['contactNo', 'Primary guest contact number is required.'],
      ['nationality', 'Primary guest nationality is required.'],
    ];

    requiredPrimaryFields.forEach(([key, message]) => {
      if (!String(guestDetails[key] || '').trim()) {
        nextErrors[`primary-${String(key)}`] = message;
      }
    });

    if (!ALLOWED_TITLES.includes(guestDetails.salutation)) {
      nextErrors['primary-salutation'] = 'Primary guest salutation is invalid.';
    }

    if (!validateNameParts(guestDetails.name)) {
      nextErrors['primary-name'] = 'Primary guest first name/last name must each be 2-25 valid characters.';
    }

    if (!isValidIsoNationality(guestDetails.nationality)) {
      nextErrors['primary-nationality'] = 'Primary guest nationality must be a valid ISO-2 code (example: IN).';
    }

    const primaryAge = Number(guestDetails.age);
    if (!Number.isFinite(primaryAge) || primaryAge <= 0) {
      nextErrors['primary-age'] = 'Primary guest age must be a valid number.';
    }

    const sanitizeAdditionalPassengers = (list: AdditionalPassenger[]) =>
      list
        .map((item) => ({
          ...item,
          title: String(item.title || '').trim(),
          name: String(item.name || '').trim(),
          age: String(item.age || '').trim(),
          nationality: String(item.nationality || '').trim().toUpperCase(),
          panNo: String(item.panNo || '').trim().toUpperCase(),
          passportNo: String(item.passportNo || '').trim().toUpperCase(),
        }))
        .filter((item) => item.title || item.name || item.age || item.nationality || item.panNo || item.passportNo);

    const normalizedAdditionalAdults = sanitizeAdditionalPassengers(additionalAdults);
    const normalizedAdditionalChildren = sanitizeAdditionalPassengers(additionalChildren);
    const normalizedAdditionalInfants = sanitizeAdditionalPassengers(additionalInfants);

    const validateAdditionalPassengers = (
      list: AdditionalPassenger[],
      label: 'adult' | 'child' | 'infant',
      expectedCount: number,
      minAge: number,
      maxAge: number,
    ) => {
      if (list.length !== expectedCount) {
        nextErrors[`count-${label}`] = `Expected ${expectedCount} ${label}${expectedCount === 1 ? '' : 's'}, but found ${list.length}.`;
      }

      list.forEach((item, index) => {
        if (!item.title) {
          nextErrors[`${label}-${index}-title`] = `${label} ${index + 1} title is required.`;
        } else if (!ALLOWED_TITLES.includes(item.title)) {
          nextErrors[`${label}-${index}-title`] = `${label} ${index + 1} title is invalid.`;
        }
        if (!item.name.trim()) {
          nextErrors[`${label}-${index}-name`] = `${label} ${index + 1} name is required.`;
        } else if (!validateNameParts(item.name)) {
          nextErrors[`${label}-${index}-name`] = `${label} ${index + 1} first/last name must each be 2-25 valid characters.`;
        }
        if (!item.nationality.trim()) {
          nextErrors[`${label}-${index}-nationality`] = `${label} ${index + 1} nationality is required.`;
        } else if (!isValidIsoNationality(item.nationality)) {
          nextErrors[`${label}-${index}-nationality`] = `${label} ${index + 1} nationality must be ISO-2 code (example: IN).`;
        }
        const parsedAge = Number(item.age);
        if (!Number.isFinite(parsedAge) || parsedAge < minAge || parsedAge > maxAge) {
          nextErrors[`${label}-${index}-age`] = `${label} ${index + 1} age must be between ${minAge} and ${maxAge}.`;
        }
        if (item.panNo && !isValidPan(item.panNo)) {
          nextErrors[`${label}-${index}-panNo`] = `${label} ${index + 1} PAN must be valid format (example: ABCDE1234F).`;
        }
      });
    };

    if (requiresDetailedPassengerFlow) {
      const expectedAdditionalAdults = Math.max(Number(itinerary.adults || 0) - 1, 0);
      const expectedChildren = Math.max(Number(itinerary.children || 0), 0);
      const expectedInfants = Math.max(Number(itinerary.infants || 0), 0);

      validateAdditionalPassengers(normalizedAdditionalAdults, 'adult', expectedAdditionalAdults, 12, 120);
      validateAdditionalPassengers(normalizedAdditionalChildren, 'child', expectedChildren, 2, 11);
      validateAdditionalPassengers(normalizedAdditionalInfants, 'infant', expectedInfants, 0, 5);
    }

    if (Object.keys(nextErrors).length > 0) {
      setFormErrors(nextErrors);
      const firstError = Object.values(nextErrors)[0];
      toast.error(firstError || 'Please fix guest details before confirming quotation.');
      return;
    }

    setFormErrors({});

    if (
      shouldEnableWalletTopUpOnConfirm &&
      !options.skipWalletCheck &&
      agentInfo?.agent_id &&
      confirmRequiredAmount > 0
    ) {
      try {
        const latestWalletBalance = await refreshConfirmWalletBalance(agentInfo.agent_id);

        if (latestWalletBalance < confirmRequiredAmount) {
          prepareWalletTopUpPanel(latestWalletBalance);
          toast.error(
            `Insufficient wallet balance to confirm booking. Please add at least ${formatCurrency(
              confirmRequiredAmount - latestWalletBalance,
            )} and continue.`,
          );
          return;
        }

        resetConfirmWalletTopUpPanel();
      } catch (error) {
        toast.error('Failed to refresh wallet balance. Please try again.');
        return;
      }
    }

    setIsConfirmingQuotation(true);

    try {
      const autoSelectedHotels = { ...selectedHotelBookings };
      const groupTypeValue =
        activeHotelGroupType ??
        Object.values(autoSelectedHotels)[0]?.groupType ??
        hotelDetails?.hotelTabs?.[0]?.groupType ??
        1;
      const selectedProvidersForConfirm = requiresHotelBookingFlow
        ? Array.from(
            new Set(
              Object.values(autoSelectedHotels)
                .map((h) => String(h?.provider || '').trim().toLowerCase())
                .filter(Boolean),
            ),
          )
        : [];
      const preferredProviderForConfirm =
        selectedProvidersForConfirm.length === 1 ? selectedProvidersForConfirm[0] : '';
      const skippedRouteIdsForConfirm: number[] = [];

      if (requiresHotelBookingFlow && hotelDetails?.hotels && hotelDetails.hotels.length > 0) {
        const routesWithHotels = new Set(hotelDetails.hotels.map((h) => h.itineraryRouteId));

        const toAutoSelection = (hotelRow, routeId: number) => {
          const routeDay = itinerary?.days?.find((d) => d.id === routeId);
          const checkInDate = routeDay?.date || '';
          const checkOutDate = routeDay
            ? new Date(new Date(routeDay.date).getTime() + 24 * 60 * 60 * 1000).toISOString().split('T')[0]
            : '';

          return {
            provider: normalizeHotelProvider(hotelRow) || 'tbo',
            hotelCode: String(hotelRow?.hotelCode || hotelRow?.hotelId || ''),
            bookingCode: String(hotelRow?.bookingCode || hotelRow?.searchReference || ''),
            searchReference: String(hotelRow?.searchReference || hotelRow?.bookingCode || '').trim() || undefined,
            roomId:
              parseStaahSearchReference(hotelRow?.searchReference || hotelRow?.bookingCode)?.roomId ||
              undefined,
            rateId:
              parseStaahSearchReference(hotelRow?.searchReference || hotelRow?.bookingCode)?.rateId ||
              undefined,
            roomType: hotelRow?.roomType || 'Standard',
            netAmount: getHotelSelectionAmount(hotelRow),
            hotelName: hotelRow?.hotelName,
            checkInDate,
            checkOutDate,
            searchInitiatedAt: new Date().toISOString(),
            isBookable: hotelRow?.isBookable ?? isSupplierBookableHotel(hotelRow),
            externalStay: hotelRow?.externalStay ?? !isSupplierBookableHotel(hotelRow),
            availabilityStatus: hotelRow?.availabilityStatus || (isSupplierBookableHotel(hotelRow) ? 'AVAILABLE' : 'NO_SUPPLIER_AVAILABILITY'),
            availabilityMessage: hotelRow?.availabilityMessage || (isSupplierBookableHotel(hotelRow) ? null : DEFAULT_EXTERNAL_STAY_MESSAGE),
          };
        };

        routesWithHotels.forEach((routeId: number) => {
          const coveredRouteIdsForConfirm = getCoveredRouteIdsFromHotelSelections(autoSelectedHotels);
          if (coveredRouteIdsForConfirm.has(Number(routeId))) {
            return;
          }

          const routeHotels = hotelDetails.hotels.filter(
            (h) =>
              Number(h.itineraryRouteId) === Number(routeId) &&
              Number(h.groupType) === Number(groupTypeValue),
          );
          const persistedRouteSelection = routeHotels.find(
            (h) => Number(h?.itineraryPlanHotelDetailsId || 0) > 0,
          );

          // Never overwrite an explicit in-memory user selection for this route.
          // Persisted backend selection should only backfill missing routes.
          if (persistedRouteSelection) {
            autoSelectedHotels[routeId] = toAutoSelection(persistedRouteSelection, routeId);
            return;
          }

          if (!autoSelectedHotels[routeId]) {
            const firstHotelForRoute = preferredProviderForConfirm
              ? routeHotels.find(
                  (h) =>
                    String(h?.provider || '')
                      .trim()
                      .toLowerCase() === preferredProviderForConfirm,
                )
              : routeHotels[0];

            if (!firstHotelForRoute && preferredProviderForConfirm && routeHotels.length > 0) {
              skippedRouteIdsForConfirm.push(routeId);
            }

            if (firstHotelForRoute) {
              autoSelectedHotels[routeId] = toAutoSelection(firstHotelForRoute, routeId);
            }
          }
        });

        if (skippedRouteIdsForConfirm.length > 0) {
          toast.error(
            `Please select ${preferredProviderForConfirm.toUpperCase()} hotel(s) for route ID(s): ${skippedRouteIdsForConfirm.join(', ')}.`,
          );
          return;
        }
      }

      const primaryName = normalizeNameParts(guestDetails.name);
      const passengers = [
        {
          title: guestDetails.salutation,
          firstName: primaryName.firstName,
          lastName: primaryName.lastName,
          nationality: guestDetails.nationality,
          email: guestDetails.emailId || undefined,
          paxType: 1,
          leadPassenger: true,
          age: Number(guestDetails.age),
          panNo: undefined,
          passportNo: guestDetails.passportNo || undefined,
          passportIssueDate: undefined,
          passportExpDate: undefined,
          phoneNo: guestDetails.contactNo,
        },
        ...normalizedAdditionalAdults.map((adult) => {
          const name = normalizeNameParts(adult.name);
          return {
            title: adult.title,
            firstName: name.firstName,
            lastName: name.lastName,
            nationality: adult.nationality,
            email: undefined,
            paxType: 1,
            leadPassenger: false,
            age: Number(adult.age),
            panNo: adult.panNo || undefined,
            passportNo: adult.passportNo || undefined,
            passportIssueDate: undefined,
            passportExpDate: undefined,
            phoneNo: guestDetails.contactNo,
          };
        }),
        ...normalizedAdditionalChildren.map((child) => {
          const name = normalizeNameParts(child.name);
          return {
            title: child.title,
            firstName: name.firstName,
            lastName: name.lastName,
            nationality: child.nationality,
            email: undefined,
            paxType: 2,
            leadPassenger: false,
            age: Number(child.age),
            panNo: undefined,
            passportNo: child.passportNo || undefined,
            passportIssueDate: undefined,
            passportExpDate: undefined,
            phoneNo: guestDetails.contactNo,
          };
        }),
        ...normalizedAdditionalInfants.map((infant) => {
          const name = normalizeNameParts(infant.name);
          return {
            title: infant.title,
            firstName: name.firstName,
            lastName: name.lastName,
            nationality: infant.nationality,
            email: undefined,
            paxType: 3,
            leadPassenger: false,
            age: Number(infant.age),
            panNo: undefined,
            passportNo: infant.passportNo || undefined,
            passportIssueDate: undefined,
            passportExpDate: undefined,
            phoneNo: guestDetails.contactNo,
          };
        }),
      ];

      // Child ages must be locked from plan/search template to avoid mismatch with TBO
      const childAgesForBooking = requiresDetailedPassengerFlow
        ? (
            confirmOccupanciesTemplate && confirmOccupanciesTemplate.length > 0
              ? confirmOccupanciesTemplate.flatMap((occ) =>
                  Array.isArray(occ.childrenAges) ? occ.childrenAges.map(Number) : []
                )
              : normalizedAdditionalChildren.map((c) => Number(c.age))
          ).filter((age: number) => Number.isFinite(age) && age >= 0 && age <= 11)
        : [];

      const totalAdultsForBooking = Math.max(Number(itinerary.adults || 1), 1);
      const totalChildrenForBooking = Math.max(Number(itinerary.children || 0), 0);
      const occupanciesForBooking = requiresHotelBookingFlow
        ? requiresDetailedPassengerFlow
          ? confirmOccupanciesTemplate && confirmOccupanciesTemplate.length > 0
            ? applyChildAgesToTemplate(confirmOccupanciesTemplate, childAgesForBooking)
            : buildTboOccupancies(
                Number(itinerary.roomCount || 1),
                totalAdultsForBooking,
                childAgesForBooking,
              )
          : buildSupplierOccupancies(
              Number(itinerary.roomCount || 1),
              totalAdultsForBooking,
              totalChildrenForBooking,
            )
        : [];

      const bookingGuestNationality = (
        guestDetails.nationality ||
        confirmDefaultNationality ||
        'IN'
      )
        .trim()
        .toUpperCase();

      const providerBookableSelections = requiresHotelBookingFlow
        ? Object.entries(autoSelectedHotels).filter(([, hotelData]) =>
            isSupplierBookableHotel(hotelData),
          )
        : [];

      const hotelBookings: any[] = requiresHotelBookingFlow
        ? providerBookableSelections.map(([routeId, hotelData]) => ({
            occupancies: occupanciesForBooking,
            provider: inferHotelProvider(hotelData),
            routeId: parseInt(routeId, 10),
            hotelCode: hotelData.hotelCode,
            hotelName: hotelData.hotelName,
            bookingCode: hotelData.bookingCode,
            searchReference: hotelData.searchReference,
            roomId: hotelData.roomId,
            rateId: hotelData.rateId,
            mealPlan: hotelData.mealPlan,
            roomType: hotelData.roomType,
            checkInDate: hotelData.checkInDate,
            checkOutDate: hotelData.checkOutDate,
            numberOfRooms: Number(itinerary.roomCount || 1),
            guestNationality: bookingGuestNationality,
            netAmount: toMoneyNumber(hotelData.netAmount),
            searchInitiatedAt: hotelData.searchInitiatedAt,
            isBookable: hotelData.isBookable,
            externalStay: hotelData.externalStay,
            availabilityStatus: hotelData.availabilityStatus,
            availabilityMessage: hotelData.availabilityMessage,
            multiNightBooking: hotelData.multiNightBooking,
            stayKey: hotelData.stayKey,
            routeIds: hotelData.routeIds,
            nights: hotelData.nights,
            nightlyRates: hotelData.nightlyRates,
            totalAmountAfterTax: hotelData.totalAmountAfterTax,
            passengers,
          }))
        : [];

      const tboCount = hotelBookings.filter((booking) => booking.provider === 'tbo').length;
      const nonTboRouteIds = hotelBookings
        .filter((booking) => booking.provider !== 'tbo')
        .map((booking) => Number(booking.routeId))
        .filter((id) => Number.isFinite(id));

      if (requiresHotelBookingFlow && tboCount > 0 && nonTboRouteIds.length > 0) {
        const uniqueNonTboRouteIds = Array.from(new Set(nonTboRouteIds));
        const shouldContinueWithMixedProviders = window.confirm(
          `Mixed providers detected. Non-TBO route ID(s): ${uniqueNonTboRouteIds.join(', ')}.\n\nPress OK to continue with mixed-provider booking, or Cancel to reselect hotels.`,
        );
        if (!shouldContinueWithMixedProviders) {
          toast.error(
            `Mixed providers detected. Non-TBO route ID(s): ${uniqueNonTboRouteIds.join(', ')}. Please reselect hotels before confirming.`,
          );
          return;
        }
        toast.warning('Proceeding with mixed-provider booking as confirmed.');
      }

      if (requiresHotelBookingFlow && hotelBookings.length === 0 && externalStayEntries.length === 0) {
        toast.error('No supplier-bookable hotels selected. Please select available hotels and retry.');
        return;
      }

      const staleHotel = requiresHotelBookingFlow
        ? hotelBookings.find((booking) => {
            if (!booking.searchInitiatedAt) {
              return false;
            }
            const parsed = new Date(String(booking.searchInitiatedAt));
            if (Number.isNaN(parsed.getTime())) {
              return true;
            }
            return Date.now() - parsed.getTime() > TBO_SESSION_WINDOW_MS;
          })
        : null;

      if (staleHotel) {
        setPrebookData(null);
        setHasAcceptedUpdatedPrice(false);
        toast.error('Hotel search session exceeded 35 minutes. Please search/select hotel again before prebook.');
        return;
      }

      const clientIp = requiresHotelBookingFlow
        ? await fetch('https://api.ipify.org?format=json')
            .then((res) => res.json())
            .then((data) => data.ip)
            .catch(() => '192.168.1.1')
        : undefined;

      const effectivePrebookData = prebookDataRef.current || prebookData;
      const hasTboBookings = requiresHotelBookingFlow && hotelBookings.some((b) => b.provider === 'tbo');
      console.log('hasTboBookings', hasTboBookings);
      console.log(hotelBookings,'hotelBookings');
      if (requiresHotelBookingFlow && hasTboBookings && !effectivePrebookData) {
        toast.error('TBO prebook data missing. Reopen Confirm Quotation to prebook before final booking.');
        return;
      }

      const prebookTotal = Number(
        effectivePrebookData?.updatedTotalPrice ||
        effectivePrebookData?.finalPrice ||
        effectivePrebookData?.totalAmount ||
        0,
      );
      const currentTboTotal = hotelBookings
        .filter((booking) => booking.provider === 'tbo')
        .reduce((sum, booking) => sum + Number(booking.netAmount || 0), 0);
      if (
        requiresHotelBookingFlow &&
        prebookTotal > 0 &&
        Math.abs(prebookTotal - currentTboTotal) > 0.01 &&
        !hasAcceptedUpdatedPrice
      ) {
        toast.warning('Accept updated prebook price before final confirmation.');
        return;
      }

      // Require acknowledgement of review details before final booking
      if (requiresHotelBookingFlow && !hasAcceptedUpdatedPrice) {
        toast.warning('Please review and acknowledge the hotel details before final booking confirmation.');
        return;
      }

      const selectedGroupType = String(groupTypeValue);

      const primaryGuest = {
        salutation: guestDetails.salutation,
        name: guestDetails.name,
        phone: guestDetails.contactNo,
        email: guestDetails.emailId,
      };

      if (!agentInfo?.agent_id) {
        toast.error('Missing agent information for final confirmation. Please reopen Confirm Quotation and retry.');
        return;
      }

      const hotelBookingsWithPrebookContext = requiresHotelBookingFlow
        ? hotelBookings.map((booking) => {
            const matchingPrebook = prebookHotelEntries.find(
              (item) =>
                Number(item?.routeId) === Number(booking.routeId) &&
                String(item?.hotelCode || '') === String(booking.hotelCode || ''),
            );

            return {
              ...booking,
              prebookContext: matchingPrebook?.prebookContext,
            };
          })
        : [];

      if (requiresHotelBookingFlow) {
        console.log('[CONFIRM_PAYLOAD_HOTELS]', hotelBookingsWithPrebookContext.map((h) => ({
          routeId: h.routeId,
          provider: h.provider,
          hotelCode: h.hotelCode,
          hotelName: h.hotelName,
          bookingCodePresent: Boolean(String(h.bookingCode || '').trim()),
          bookingCodeLooksTbo: String(h.bookingCode || '').includes('!TB!'),
          roomType: h.roomType,
          checkInDate: h.checkInDate,
          checkOutDate: h.checkOutDate,
          netAmount: h.netAmount,
        })));
      }

      const selectedHotelRouteIds = requiresHotelBookingFlow
        ? Array.from(new Set(
            hotelBookingsWithPrebookContext
            .flatMap((booking) =>
              Array.isArray(booking.routeIds) && booking.routeIds.length > 0
                ? booking.routeIds
                : [booking.routeId],
            )
            .map((routeId) => Number(routeId || 0))
            .filter((routeId: number) => Number.isFinite(routeId) && routeId > 0)
          ))
        : [];

      const externalStayRouteIds = requiresHotelBookingFlow
        ? externalStayEntries
            .map((entry) => Number(entry.routeId || 0))
            .filter((routeId: number) => Number.isFinite(routeId) && routeId > 0)
        : [];

      const confirmPayload: any = {
        itinerary_plan_ID: itinerary.planId,
        agent: agentInfo.agent_id,
        primary_guest_salutation: guestDetails.salutation,
        primary_guest_name: guestDetails.name,
        primary_guest_contact_no: guestDetails.contactNo,
        primary_guest_age: guestDetails.age,
        primary_guest_alternative_contact_no: guestDetails.alternativeContactNo,
        primary_guest_email_id: guestDetails.emailId,
        adult_name: requiresDetailedPassengerFlow ? normalizedAdditionalAdults.map(a => a.name) : [],
        adult_age: requiresDetailedPassengerFlow ? normalizedAdditionalAdults.map(a => a.age) : [],
        child_name: requiresDetailedPassengerFlow ? normalizedAdditionalChildren.map(c => c.name) : [],
        child_age: requiresDetailedPassengerFlow ? normalizedAdditionalChildren.map(c => c.age) : [],
        infant_name: requiresDetailedPassengerFlow ? normalizedAdditionalInfants.map(i => i.name) : [],
        infant_age: requiresDetailedPassengerFlow ? normalizedAdditionalInfants.map(i => i.age) : [],
        arrival_date_time: guestDetails.arrivalDateTime,
        arrival_place: guestDetails.arrivalPlace,
        arrival_flight_details: guestDetails.arrivalFlightDetails,
        departure_date_time: guestDetails.departureDateTime,
        departure_place: guestDetails.departurePlace,
        departure_flight_details: guestDetails.departureFlightDetails,
        price_confirmation_type: requiresHotelBookingFlow && hasAcceptedUpdatedPrice ? 'new' : 'old',
        primaryGuest,
        endUserIp: clientIp,
      };

      if (requiresHotelBookingFlow) {
        confirmPayload.hotel_group_type = selectedGroupType;
        confirmPayload.hotel_bookings = hotelBookingsWithPrebookContext;
        confirmPayload.selected_hotel_route_ids = selectedHotelRouteIds;
        confirmPayload.external_stay_route_ids = externalStayRouteIds;
      }

      console.log('[CONFIRM_HOTELS] final hotel_bookings payload', confirmPayload.hotel_bookings);
      console.log('📦 [handleConfirmQuotation] confirmQuotation payload:', confirmPayload);

      const confirmResponse: any = await ItineraryService.confirmQuotation(confirmPayload);

      toast.success(confirmResponse?.message || 'Quotation confirmed successfully!');
      setConfirmQuotationModal(false);

      setLoadingHotels(true);
      setActiveHotelListTotal(0);
      setSelectedVehicleTotalsByType({});
      setSelectedHotelBookings({});
      setActiveHotelGroupType(null);

      const confirmedPlanId = Number(confirmResponse?.confirmed_itinerary_plan_ID || 0);

      if (confirmedPlanId > 0) {
        const confirmedHotelDetailsFromResponse =
          confirmResponse?.confirmedHotelDetails ||
          confirmResponse?.hotelDetails ||
          null;

        const refreshedHotelDetails = await loadConfirmedHotelsFromDb(
          confirmedPlanId,
          confirmedHotelDetailsFromResponse,
        );

        setItinerary((prev) => {
          if (!prev) return prev;

          return {
            ...prev,
            confirmed_itinerary_plan_ID: confirmedPlanId,
            isConfirmed: true,
          };
        });

        setHotelDetails(refreshedHotelDetails as ItineraryHotelDetailsResponse | null);
      } else {
        console.warn('[CONFIRM_QUOTATION_NO_CONFIRMED_PLAN_ID]', confirmResponse);
      }

      setLoadingHotels(false);

      // Reset form and selected hotels
      setGuestDetails({
        salutation: 'Mr',
        name: '',
        contactNo: '',
        age: '',
        nationality: confirmDefaultNationality,
        panNo: '',
        passportNo: '',
        alternativeContactNo: '',
        emailId: '',
        arrivalDateTime: '',
        arrivalPlace: '',
        arrivalFlightDetails: '',
        departureDateTime: '',
        departurePlace: '',
        departureFlightDetails: '',
      });
      setAdditionalAdults([]);
      setAdditionalChildren([]);
      setAdditionalInfants([]);
      setPrebookData(null);
      prebookDataRef.current = null;
      setHasAcceptedUpdatedPrice(false);
      setFormErrors({});
      setSelectedHotelBookings({});
    } catch (e) {
      setLoadingHotels(false);
      console.error('Failed to confirm quotation', e);
      toast.error(getSafeErrorMessage(e, 'Failed to confirm quotation'));
    } finally {
      setIsConfirmingQuotation(false);
      setIsPrebooking(false);
    }
  };

  useEffect(() => {
    if (!pendingScrollDayNumber) {
      return;
    }

    const timer = window.setTimeout(() => {
      const dayElement = document.getElementById(`itinerary-day-${pendingScrollDayNumber}`);
      if (dayElement) {
        dayElement.scrollIntoView({ behavior: "smooth", block: "start" });
      }
      setPendingScrollDayNumber(null);
    }, 180);

    return () => window.clearTimeout(timer);
  }, [itinerary, pendingScrollDayNumber]);

  useEffect(() => {
    if (!itinerary?.days?.length || pendingScrollDayNumber) {
      return;
    }

    const scrollStorageKey = getFitHereRefreshScrollStorageKey();
    if (!scrollStorageKey) {
      return;
    }

    const storedDayNumber = Number(window.sessionStorage.getItem(scrollStorageKey) || 0);
    if (!storedDayNumber) {
      return;
    }

    window.sessionStorage.removeItem(scrollStorageKey);
    setPendingScrollDayNumber(storedDayNumber);
  }, [getFitHereRefreshScrollStorageKey, itinerary?.days, pendingScrollDayNumber]);

  useEffect(() => {
    return () => {
      stopRouteTimeProgress();
    };
  }, [stopRouteTimeProgress]);

useEffect(() => {
  if (!quoteId || !itinerary) return;

  const getQuoteNumberFromValue = (value?: string) => {
    const match = String(value || "").match(/(\d+)$/);
    return match ? Number(match[1]) : 0;
  };

  const normalizeRouteOptionList = (rawOptions: any[]) => {
    const options = rawOptions
      .map((option, index: number) => {
        const rawQuoteId =
          typeof option === "string"
            ? option
            : option?.quoteId ||
              option?.routeQuoteId ||
              option?.quotationNo ||
              option?.quotation_no ||
              option?.itinerary_quote_ID ||
              option?.itinerary_quote_id ||
              option?.quote_id ||
              "";

        return {
          quoteId: String(rawQuoteId || "").trim(),
          label: option?.label || option?.routeName || `Route ${index + 1}`,
        };
      })
      .filter((option) => option.quoteId && option.quoteId.startsWith("DVI"));

    return Array.from(
      new Map(options.map((option) => [option.quoteId, option])).values()
    )
      .sort(
        (a, b) =>
          getQuoteNumberFromValue(a.quoteId) -
          getQuoteNumberFromValue(b.quoteId)
      )
      .map((option, index) => ({
        ...option,
        label: `Route ${index + 1}`,
      }));
  };

  const loadRelatedRouteOptions = async () => {
    try {
      const apiRouteOptions = normalizeRouteOptionList([
        ...((Array.isArray((itinerary as any)?.routeOptions)
          ? (itinerary as any).routeOptions
          : []) as any[]),
        ...((Array.isArray((itinerary as any)?.suggestedRoutes)
          ? (itinerary as any).suggestedRoutes
          : []) as any[]),
        ...((Array.isArray((itinerary as any)?.siblingRoutes)
          ? (itinerary as any).siblingRoutes
          : []) as any[]),
      ]);

      if (apiRouteOptions.length > 0) {
        const routeOptionPayload = JSON.stringify(apiRouteOptions);

        apiRouteOptions.forEach((option) => {
          localStorage.setItem(
            `itinerary-route-options:${option.quoteId}`,
            routeOptionPayload
          );
        });

        setLatestRouteOptions(apiRouteOptions);
        return;
      }

      const storedRouteOptionsRaw = localStorage.getItem(
        `itinerary-route-options:${quoteId}`
      );

      if (storedRouteOptionsRaw) {
        try {
          const storedRouteOptions = JSON.parse(storedRouteOptionsRaw);
          const parsedOptions = Array.isArray(storedRouteOptions)
            ? normalizeRouteOptionList(storedRouteOptions)
            : [];

          if (parsedOptions.length > 0) {
            setLatestRouteOptions(parsedOptions);
            return;
          }
        } catch (storageError) {
          console.error("Failed to parse saved route options", storageError);
        }
      }

      const currentPlanId = Number(
        (itinerary as any)?.planId || (itinerary as any)?.itineraryPlanId || 0
      );

      const formatDate = (value?: string) => {
        if (!value) return "";
        if (/^\d{2}\/\d{2}\/\d{4}$/.test(value)) return value;

        const date = new Date(value);
        if (Number.isNaN(date.getTime())) return "";

        const dd = String(date.getDate()).padStart(2, "0");
        const mm = String(date.getMonth() + 1).padStart(2, "0");
        const yyyy = date.getFullYear();
        return `${dd}/${mm}/${yyyy}`;
      };

      const startDate = itinerary.days?.[0]?.date;
      const endDate = itinerary.days?.[itinerary.days.length - 1]?.date;

      const res: any = await ItineraryService.getLatest({
        page: 1,
        pageSize: 100,
        startDate: formatDate(startDate),
        endDate: formatDate(endDate),
      });

      const rows = Array.isArray(res?.data) ? res.data : [];
      const relatedRows = currentPlanId
        ? rows.filter((row) => {
            const rowPlanId = Number(
              row?.planId ||
                row?.plan_id ||
                row?.itineraryPlanId ||
                row?.itinerary_plan_id ||
                row?.itinerary_plan_ID ||
                0
            );

            return rowPlanId === currentPlanId;
          })
        : rows;

      const fallbackOptions = normalizeRouteOptionList(relatedRows);

      const withCurrentQuote = normalizeRouteOptionList([
        { quoteId: String(quoteId), label: "Route 1" },
        ...fallbackOptions,
      ]);

      setLatestRouteOptions(withCurrentQuote.length > 0 ? withCurrentQuote : [
        { quoteId: String(quoteId), label: "Route 1" },
      ]);
    } catch (error) {
      console.error("Failed to load related route options", error);
      setLatestRouteOptions([
        {
          quoteId: String(quoteId),
          label: "Route 1",
        },
      ]);
    }
  };

  loadRelatedRouteOptions();
}, [quoteId, itinerary]);

const getQuoteNumber = (value?: string) => {
  const match = String(value || "").match(/(\d+)$/);
  return match ? Number(match[1]) : 0;
};

const itineraryRouteOptions = useMemo(() => {
  return Array.from(
    new Map(latestRouteOptions.map((option) => [option.quoteId, option])).values()
  ).sort((a, b) => getQuoteNumber(a.quoteId) - getQuoteNumber(b.quoteId));
}, [latestRouteOptions]);

const routeFamilyBaseQuoteId = useMemo(() => {
  const fromApi = String((itinerary as any)?.routeFamilyBaseQuoteId || "").trim();
  if (fromApi) return fromApi;

  return normalizeRouteFamilyBaseQuoteId(
    activeRouteQuoteId || quoteId || itinerary?.quoteId,
  );
}, [
  activeRouteQuoteId,
  itinerary,
  normalizeRouteFamilyBaseQuoteId,
  quoteId,
]);

useEffect(() => {
  if (!routeFamilyBaseQuoteId) return;
  if (routeHotelFamilyKeyRef.current === routeFamilyBaseQuoteId) return;

  routeHotelFamilyKeyRef.current = routeFamilyBaseQuoteId;
  routeHotelPrefetchedRef.current = new Set();
  routeHotelFetchPromisesRef.current.clear();
  setRouteHotelDetailsByQuoteId({});
}, [routeFamilyBaseQuoteId]);

useEffect(() => {
  if (!itinerary || !shouldShowHotels || isConfirmedItinerary) return;

  const routeQuoteIds = itineraryRouteOptions
    .map((option) => String(option.quoteId || "").trim())
    .filter((id) => id.startsWith("DVI"));

  const currentQuoteId = String(activeRouteQuoteId || quoteId || itinerary?.quoteId || "").trim();
  const normalizedQuoteIds = Array.from(
    new Set([currentQuoteId, ...routeQuoteIds].filter((id) => id.startsWith("DVI"))),
  );

  if (normalizedQuoteIds.length === 0) return;

  let cancelled = false;

  const warmRouteHotelCache = async () => {
    for (const routeQuoteId of normalizedQuoteIds) {
      if (cancelled) return;
      if (routeHotelPrefetchedRef.current.has(routeQuoteId)) continue;

      routeHotelPrefetchedRef.current.add(routeQuoteId);

      try {
        await loadAndCacheRouteHotelDetails(routeQuoteId);
      } catch (error) {
        routeHotelPrefetchedRef.current.delete(routeQuoteId);
        console.warn("[ItineraryDetails] Failed to prefetch hotels for route quote", {
          routeQuoteId,
          error,
        });
      }
    }
  };

  void warmRouteHotelCache();

  return () => {
    cancelled = true;
  };
}, [
  activeRouteQuoteId,
  itinerary,
  itineraryRouteOptions,
  isConfirmedItinerary,
  loadAndCacheRouteHotelDetails,
  quoteId,
  shouldShowHotels,
]);

const handleItineraryRouteOptionClick = async (routeQuoteId: string) => {
  const normalizedRouteQuoteId = String(routeQuoteId || "").trim();
  const selectedRouteQuoteId = activeRouteQuoteId || quoteId || itinerary?.quoteId;

  if (!normalizedRouteQuoteId || normalizedRouteQuoteId === selectedRouteQuoteId) {
    return;
  }

  if (!normalizedRouteQuoteId.startsWith("DVI")) {
    toast.error("Invalid route option. Route quote ID is missing.");
    return;
  }

  const routeRequestId = ++latestRouteRequestRef.current;

  try {
    setIsSwitchingRouteOption(true);
    setActiveRouteQuoteId(normalizedRouteQuoteId);

    // Keep the current page visible while the selected sibling route loads.
    isMountedRef.current = true;
    switchedRouteRef.current = normalizedRouteQuoteId;
    currentFetchRef.current = normalizedRouteQuoteId;
    setError(null);
    setPageReady(true);
    setLoading(false);
    setLoadingHotels(true);
    pushPageLoaderStage("Loading selected route");

    navigate(`/itinerary-details/${normalizedRouteQuoteId}`, { replace: true });

    // Fast route switch: load route details first and show them immediately.
    // Do not rebuild permits/vehicles here; the initial page load/retry flow still handles that.
    const detailsRes = await getDetailsDeduped(normalizedRouteQuoteId);
    const details = detailsRes as ItineraryDetailsResponse;

    if (!isMountedRef.current || latestRouteRequestRef.current !== routeRequestId) {
      return;
    }

    setItinerary(details);
    setVehicleBuildError(null);

    const pref = Number(details.itineraryPreference ?? 3);
    const useHotels = pref === 1 || pref === 3;
    const useVehicles = pref === 2 || pref === 3;

    setVehicleBuildStatus(useVehicles ? "READY" : "READY");

    if (!useHotels) {
      setHotelDetails(null);
      setActiveHotelListTotal(0);
      return;
    }

    const cachedHotelDetails = routeHotelDetailsByQuoteId[normalizedRouteQuoteId];
    if (cachedHotelDetails) {
      setHotelDetails(cachedHotelDetails);
      return;
    }

    setHotelDetails(null);

    const hotelRes = await loadAndCacheRouteHotelDetails(normalizedRouteQuoteId);

    if (!isMountedRef.current || latestRouteRequestRef.current !== routeRequestId) {
      return;
    }

    setHotelDetails(hotelRes as ItineraryHotelDetailsResponse | null);
  } catch (e) {
    if (latestRouteRequestRef.current !== routeRequestId) {
      return;
    }

    switchedRouteRef.current = null;
    console.error("Failed to switch itinerary route option", e);
    toast.error(e?.message || "Failed to load selected route option");
  } finally {
    if (latestRouteRequestRef.current === routeRequestId) {
      currentFetchRef.current = null;
      setLoading(false);
      setLoadingHotels(false);
      setIsSwitchingRouteOption(false);
    }
  }
};

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
  const routeProgressPct = Math.max(0, Math.min(100, Math.round(routeTimeProgressPercent)));
  const routeCircleRadius = 42;
  const routeCircleCircumference = 2 * Math.PI * routeCircleRadius;
  const routeDashOffset = routeCircleCircumference - (routeProgressPct / 100) * routeCircleCircumference;
  // Temporary compatibility placeholders for the removed segment markup during this extraction boundary.
  const segment: any = {};
  const activity: any = {};
  const conflict: any = {};
  const seg: any = {};
  const idx = 0;

  return (
    <div className="w-full max-w-full space-y-1 pb-8">
      {isConfirmedPresentation && <ConfirmedQuoteBanner />}

      {(isApplyingRouteTimeUpdate || isRebuilding || isSwitchingRouteOption) && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/40">
          <div className="w-[340px] rounded-2xl bg-white p-6 text-center shadow-2xl">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-[#ffe9d6] text-2xl">
              ⏱
            </div>
            <p className="text-sm text-slate-600">
              {isSwitchingRouteOption ? "Loading selected route" : routeProgressTitle}
            </p>
            <div className="mt-5 flex flex-col items-center gap-3">
              <div className="relative h-28 w-28">
                <svg className="h-28 w-28 -rotate-90" viewBox="0 0 100 100" role="img" aria-label="Route update progress">
                  <circle cx="50" cy="50" r={routeCircleRadius} stroke="#e8edf4" strokeWidth="8" fill="none" />
                  <circle
                    cx="50"
                    cy="50"
                    r={routeCircleRadius}
                    stroke="#d546ab"
                    strokeWidth="8"
                    strokeLinecap="round"
                    fill="none"
                    strokeDasharray={routeCircleCircumference}
                    strokeDashoffset={routeDashOffset}
                    style={{ transition: "stroke-dashoffset 250ms linear" }}
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center text-xl font-semibold text-slate-900">
                  {routeProgressPct}%
                </div>
              </div>

              <div className="text-sm font-semibold text-slate-800">
                {routeProgressHistory[routeProgressHistory.length - 1] || "Updating itinerary..."}
              </div>
              <div className="min-h-[20px] text-xs font-medium text-slate-500">
                {routeProgressDetail}
              </div>
              <div className="text-xs text-slate-500">Estimated ~{Math.max(1, Math.round(routeTimeEstimatedMs / 1000))}s</div>
              {routeProgressHistory.length > 0 ? (
                <div className="mt-1 w-full rounded-2xl border border-slate-200 bg-slate-50 p-3 text-left">
                  <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500">Progress log</p>
                  <div className="mt-2 space-y-2">
                    {routeProgressHistory.map((step, index) => {
                      const isLatest = index === routeProgressHistory.length - 1;
                      return (
                        <div
                          key={`${step}-${index}`}
                          className={`rounded-xl border px-3 py-2 text-xs ${
                            isLatest
                              ? "border-[#d9b6f3] bg-white text-[#4a4260]"
                              : "border-slate-200 bg-white/70 text-slate-500"
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            {isLatest ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin text-[#d546ab]" />
                            ) : (
                              <div className="h-2 w-2 rounded-full bg-[#d546ab]" />
                            )}
                            <span>{step}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      )}

      <ItineraryHeader
        summaryStickyRef={summaryStickyRef}
        itineraryRouteOptions={itineraryRouteOptions}
        activeRouteQuoteId={activeRouteQuoteId}
        quoteId={quoteId}
        isSwitchingRouteOption={isSwitchingRouteOption}
        handleItineraryRouteOptionClick={handleItineraryRouteOptionClick}
        itineraryPreference={itineraryPreference}
        scrollToVehicleList={scrollToVehicleList}
        vehicleBuildStatus={vehicleBuildStatus}
        scrollToHotelList={scrollToHotelList}
        backToListHref={backToListHref}
        itinerary={itinerary}
        handleDownloadPluckCard={handleDownloadPluckCard}
        setVoucherModal={setVoucherModal}
        setIncidentalModal={setIncidentalModal}
        modifyItineraryHref={modifyItineraryHref}
        handleDownloadInvoice={handleDownloadInvoice}
        shouldShowRebuildHotelsButton={shouldShowRebuildHotelsButton}
        hotelReadOnly={hotelReadOnly}
        handleRebuildHotels={handleRebuildHotels}
        isRebuildingHotels={isRebuildingHotels}
        overallTripCostWithHotels={overallTripCostWithHotels}
      />


                {false && <>
                  <Card>
                    <CardContent>
                      <div>
                        <div>
                          <div>
                  <span>
                  <span className="text-xl font-bold text-[#d546ab] sm:text-2xl">
                    ₹ {overallTripCostWithHotels}
                  </span>
                </span>
              </div>
            </div>

          </div>
          </CardContent>
        </Card>
                </>}

{/* Daily Itinerary */}
<div>
{(() => {
  return (
    <>
{displayDays.map((day) => {
  const { intercityDistance, sightseeingDistance } = getDisplayDistances(day);
  const guestFoodPreferenceText = getGuestFoodPreferenceText(itinerary, day);
  const dayHasManualOverride = day.segments.some((segment) => (
    String(segment?.type || '').toLowerCase() === 'attraction'
    && (
      (segment as AttractionSegment).planOwnWay === true
      || (segment as AttractionSegment).isManual === true
    )
  ));

  const addHotspotCta = day.segments.find(
    (segment): segment is HotspotSegment => segment.type === "hotspot"
  );
  const canShowAddHotspotButton = !readOnly;
  const addHotspotLocationName = day.arrival || day.departure || "Location";
 const isWholeItineraryGuideMode = Number(itinerary.guideForItinerary || 0) === 1;

const wholeItineraryGuideAssignment =
  guideAssignments.find((assignment) => Number(assignment.guideType || 0) === 1) ?? null;

const dayGuideAssignment =
  guideAssignments.find((assignment) => (
    Number(assignment.guideType || 0) === 2
    && Number(assignment.routeId || 0) === Number(day.id)
  )) ?? null;

const currentGuideAssignment =
  isWholeItineraryGuideMode && Number(day.dayNumber || 0) === 1
    ? wholeItineraryGuideAssignment
    : dayGuideAssignment;

const dayFlowGuideAssignment = getGuideAssignmentForDay(day);
const guidePriceAvailableForDay = isGuidePriceAvailableForDay(day);

const isGuideEnabledForItinerary = [1, 2].includes(Number(itinerary?.guideForItinerary || 0));

const canShowGuideActionButton =
  Boolean(currentGuideAssignment) ||
  (
    isGuideEnabledForItinerary &&
    guideAvailability !== null &&
    !guideAvailabilityLoading &&
    guidePriceAvailableForDay === true
  );

  return (
    <section
      key={day.id}
      className="mb-4 rounded-lg bg-white pb-6 pt-1 shadow-sm"
    >
             {/* Compact day header */}
            <ItineraryDayHeader context={{
              day, itinerary, summaryStickyHeight, routeNeedsRebuild, dayHasManualOverride, isRebuilding, handleRebuildRoute, handleUpdateRouteTimesDirect,
              canShowGuideActionButton, openSourcePreview, canShowAddHotspotButton, openAddHotspotModal, addHotspotCta, addHotspotLocationName,
              readOnly, isWholeItineraryGuideMode, handleWholeItineraryGuideClick, handleAddGuideClick, currentGuideAssignment, guestFoodPreferenceText,
              intercityDistance, openGuideModal, setDeleteGuideModal,
            }} />

            <Card className="border border-[#e5d9f2] bg-white">
              <CardContent className="pt-2">

                {currentGuideAssignment && (
                  <div className="mb-4 flex items-center justify-between rounded-lg bg-[#f8f5fc] px-4 py-3">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-[#4a4260]">
                        Guide
                        {currentGuideAssignment.guideLanguageLabels.length > 0 && (
                          <>
                            {" "}
                            Language - <span className="text-[#d546ab]">{currentGuideAssignment.guideLanguageLabels.join(", ")}</span>
                          </>
                        )}
                      </p>
                      {currentGuideAssignment.guideSlotLabels.length > 0 && (
                        <p className="mt-1 text-sm text-[#6c6c6c]">
                          Slot Timing -{" "}
                          <span className="font-medium text-[#4a4260]">
                            {currentGuideAssignment.guideSlotLabels.join(", ")}
                          </span>
                        </p>
                      )}
                    </div>
                    <div className="ml-4 flex items-center gap-2">
                      <span className="text-lg font-bold text-[#d546ab]">
                        ₹ {Number(currentGuideAssignment.guideCost || 0).toFixed(2)}
                      </span>
                      {!readOnly && (
                        <>
                         <button
  type="button"
  className="rounded-full p-2 text-[#4a4260] hover:bg-white hover:text-[#d546ab]"
  onClick={() =>
    void openGuideModal(
      Number(currentGuideAssignment.guideType || 0) === 1 ? null : day,
      currentGuideAssignment,
      Number(currentGuideAssignment.guideType || 0) === 1 ? 1 : 2
    )
  }
  aria-label="Edit guide"
>
  <Edit className="h-4 w-4" />
</button>
                          <button
                            type="button"
                            className="rounded-full p-2 text-[#4a4260] hover:bg-white hover:text-red-600"
                            onClick={() => setDeleteGuideModal({ open: true, assignment: currentGuideAssignment, deleting: false })}
                            aria-label="Delete guide"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                )}


                {/* Segments */}
                {false && <>
                      {/* Connector dots — only between real segments, never around hotspot CTAs */}
                                <span className="flex items-center gap-1">⏱ {segment.duration}</span>
                                        ₹{segment.amount.toFixed(0)}
                                {/* Thumbnail with overlaid gallery/video icons — matches PHP layout */}
                                      🖼️
                                        ▶️
                                                  {activity.startTime} – {activity.endTime}
                                                  ₹ {activity.amount.toFixed(2)}
                                                🖼️
                                  <span>⏱ {segment.duration}</span>
                                  <span className="ml-2">🔘 {segment.note}</span>
                </>}
                <ItinerarySegments context={{
                  day, dayFlowGuideAssignment, itinerary, destinationHotelDisplayName, selectedHotelMetaByRoute, hotelDetails, hotelReadOnly,
                  openDeleteHotspotModal, openAddActivityModal, openGalleryModal, openVideoModal, openDeleteActivityModal, toImgSrc,
                  isAttractionCoveredByGuide, openHotelSelectionModal, setRoomSelectionModal, toast, extractTravelFromToFromText,
                  extractTravelToFromText,
                }} />
              </CardContent>
            </Card>
    </section>
          );
        })}
          </>
        );
      })()}
      </div>

      {/* Special Instructions — outside the sticky summary and before hotel/vehicle lists */}
      <SpecialInstructionsSection text={specialInstructionsText} />

      {/* Hotel List (separate component) */}
      {shouldRenderBottomHotelList && shouldShowHotels && loadingHotels && (
        <div
          ref={hotelListRef}
          id="hotel-list-section"
          style={{ scrollMarginTop: `${summaryStickyHeight + 12}px` }}
        >
          <Card className="border border-[#e5d9f2] bg-white">
            <CardContent className="py-10 flex items-center justify-center gap-3 text-[#6c6c6c]">
              <Loader2 className="h-5 w-5 animate-spin text-[#d546ab]" />
              <span>Loading hotel list for all days...</span>
            </CardContent>
          </Card>
        </div>
      )}

      {shouldRenderBottomHotelList && shouldShowHotels && !loadingHotels && hotelDetails && (
        <div
          ref={hotelListRef}
          id="hotel-list-section"
          style={{ scrollMarginTop: `${summaryStickyHeight + 12}px` }}
        >
          <HotelList
            hotels={hotelsForDisplay}
            restrictedHotels={hotelDetails.restrictedHotels || []}
            hotelTabs={hotelDetails.hotelTabs}
            hotelRatesVisible={hotelDetails.hotelRatesVisible}
            showHotelMargins={Boolean(hotelDetails.showHotelMargins)}
            roomCount={Number(itinerary.roomCount || 1)}
            onTotalChange={(total) => {
              if (hotelReadOnly) return;
              setActiveHotelListTotal(Number(total || 0));
            }}
                       onToggleHotelRates={(visible) => setClipboardRatesVisible(visible)}
            hotelAvailability={undefined}
            quoteId={quoteId!}
            planId={itinerary.planId}
            onRefresh={refreshHotelData}
            onGroupTypeChange={handleHotelGroupTypeChange}
            onGetSaveFunction={handleGetSaveFunction}
            readOnly={hotelReadOnly}
            onCreateVoucher={handleCreateVoucher}
            onCancelVoucher={handleCancelVoucherSingle}
            onBulkCancelVouchers={handleCancelVoucherItems}
            onHotelSelectionsChange={handleHotelSelectionsChange}
            pagination={hotelDetails.pagination}
            routePagination={hotelDetails.routePagination}
            onLoadMore={handleHotelLoadMore}
            isLoadingMore={isLoadingMoreHotels}
            mealPlanCode={itinerary?.meal_plan_code}
            dayDestinationFallback={
              itinerary?.days?.reduce<Record<number, string>>((acc, day) => {
                const fallback = String(day.arrival || day.departure || '').trim();
                if (fallback) {
                  acc[Number(day.dayNumber)] = fallback;
                }
                return acc;
              }, {}) || {}
            }
          />
        </div>
      )}

      {shouldShowVehicles && vehicleBuildStatus === "READY" && itinerary.vehicles && itinerary.vehicles.length > 0 && (() => {
        // Group vehicles by vehicleTypeId
        const vehiclesByType = new Map<number, typeof itinerary.vehicles>();
        const typeOrder: number[] = [];

        for (const vehicle of itinerary.vehicles) {
          const typeId = vehicle.vehicleTypeId || 0;
          if (!vehiclesByType.has(typeId)) {
            vehiclesByType.set(typeId, []);
            typeOrder.push(typeId);
          }
          vehiclesByType.get(typeId)?.push(vehicle);
        }

        // Prepare date range and routes for day-wise breakdown
        const dateRange = itinerary.dateRange || "";
        const routes = itinerary.days?.map((day) => ({
          date: day.date,
          destination: day.departure || "",
          label: `Day ${day.dayNumber} - ${day.date ? new Date(day.date).toLocaleDateString('en-GB', { month: 'short', day: '2-digit' }) : ""}`,
        })) || [];

        return (
          <div
            ref={vehicleListRef}
            id="vehicle-list-section"
            style={{ scrollMarginTop: `${summaryStickyHeight + 12}px` }}
          >
            {typeOrder.map((typeId) => {
     const rawVehiclesForType = vehiclesByType.get(typeId) || [];

const sortedVehiclesForType = [...rawVehiclesForType].sort(
  (a, b) => getVehicleAmountNumber(a) - getVehicleAmountNumber(b)
);

const cheapestVehicle = sortedVehiclesForType[0];

const cheapestVehicleKey = cheapestVehicle
  ? String(
      cheapestVehicle.vendorEligibleId ??
        cheapestVehicle.vehicleId ??
        cheapestVehicle.vehicleIds?.[0] ??
        `${cheapestVehicle.vendorName}-${cheapestVehicle.branchName}-${cheapestVehicle.totalAmount}`
    )
  : "";

const vehiclesForType = sortedVehiclesForType.map((vehicle) => {
  const vehicleKey = String(
    vehicle.vendorEligibleId ??
      vehicle.vehicleId ??
      vehicle.vehicleIds?.[0] ??
      `${vehicle.vendorName}-${vehicle.branchName}-${vehicle.totalAmount}`
  );

  return {
    ...vehicle,
    isAssigned: vehicleKey === cheapestVehicleKey,
  };
});

const firstVehicle = vehiclesForType[0];
const vehicleTypeLabel = firstVehicle?.vehicleTypeName || `Vehicle Type ${typeId}`;
              return (
                <VehicleList
                  key={typeId}
                  vehicleTypeId={typeId}
                  vehicleTypeLabel={vehicleTypeLabel}
                  vehicles={vehiclesForType}
                  itineraryPlanId={itinerary.planId}
                  onRefresh={refreshVehicleData}
                  onSelectedTotalChange={handleVehicleSelectedTotalChange}
                  dateRange={dateRange}
                  routes={routes}
                />
              );
            })}
          </div>
        );
      })()}

      {shouldShowVehicles && vehicleBuildStatus === "READY" && (!itinerary.vehicles || itinerary.vehicles.length === 0) && (
        <div
          ref={vehicleListRef}
          id="vehicle-list-section"
          style={{ scrollMarginTop: `${summaryStickyHeight + 12}px` }}
        >
          <Card className="border border-[#e5d9f2] bg-white">
            <CardContent className="py-10 px-6">
              <div className="text-center text-[#6c6c6c]">No vehicle available</div>
            </CardContent>
          </Card>
        </div>
      )}

      {isConfirmedPresentation && itinerary?.planId && (
        <div className="mt-6">
          <IncidentalExpensesHistorySection
            itineraryPlanId={itinerary.planId}
            refreshToken={incidentalHistoryRefreshToken}
          />
        </div>
      )}

      {/* Package Includes & Overall Cost */}
      <div className="grid lg:grid-cols-2 gap-6">
        <PackageIncludesCard packageIncludes={itinerary.packageIncludes} />

        {/* Overall Cost */}
        <Card className="border-none shadow-none bg-gradient-to-br from-[#faf5ff] to-white">
          <CardContent className="pt-2">
            <h2 className="text-lg font-semibold text-[#4a4260] mb-4">
              OVERALL COST
            </h2>
            <div className="space-y-2 text-sm">
              {/* ── Hotel Cost Group ── */}
              {shouldShowHotels && (() => {
                const roomTotal = Number(financialTotals.hotelAmount || 0);
                const hotelRoomNights = Math.max(Number(roomBreakdownRoomNights || 0), 1);
                const roomNightsLabel = `${hotelRoomNights} room-night${hotelRoomNights > 1 ? 's' : ''}`;

                return (
                  <Popover
                    open={isRoomCostPopoverOpen && selectedHotelMetaByRoute.size > 0 && clipboardRatesVisible}
                    onOpenChange={(open) => {
                      if (!open) setIsRoomCostPopoverOpen(false);
                    }}
                  >
                    <PopoverTrigger asChild>
                      <div
                        className="flex justify-between cursor-pointer"
                        onClick={(e) => {
                          e.preventDefault();
                        }}
                        onMouseEnter={() => selectedHotelMetaByRoute.size > 0 && clipboardRatesVisible && setIsRoomCostPopoverOpen(true)}
                        onMouseLeave={() => setIsRoomCostPopoverOpen(false)}
                      >
                        <div className="flex items-center">
                          <span className="text-[#6c6c6c]">Total Hotel Cost For ({roomNightsLabel})</span>
                          {selectedHotelMetaByRoute.size > 0 && clipboardRatesVisible && (
                            <span className="ml-1 inline-flex h-4 w-4 items-center justify-center text-[11px] leading-none">▶️</span>
                          )}
                        </div>
                        <span className="text-[#4a4260]">₹ {roomTotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                      </div>
                    </PopoverTrigger>
                    <PopoverContent
                      className="w-80 bg-white border border-[#ddd5e8] shadow-lg rounded-lg p-4"
                      align="end"
                      onMouseEnter={() => setIsRoomCostPopoverOpen(true)}
                      onMouseLeave={() => setIsRoomCostPopoverOpen(false)}
                    >
                      <div className="space-y-2 text-sm">
                        {Array.from(selectedHotelMetaByRoute.entries()).map(([routeId, meta]) => (
                          <div key={routeId} className="flex justify-between text-[#6c6c6c]">
                            <span>{meta.hotelName}{Number(meta.noOfRooms || 1) > 1 ? ` * ${Number(meta.noOfRooms)} rooms` : ''}</span>
                            <span className="font-medium text-[#4a4260]">₹ {Number(meta.totalAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                          </div>
                        ))}
                        <div className="border-t border-[#ddd5e8] pt-2 mt-2 flex justify-between font-semibold text-[#4a4260]">
                          <span>Total Hotel Cost</span>
                          <span>₹ {roomTotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                        </div>
                      </div>
                    </PopoverContent>
                  </Popover>
                );
              })()}
              {itinerary.costBreakdown.totalAmenitiesCost !== undefined && itinerary.costBreakdown.totalAmenitiesCost > 0 && (
                <div className="flex justify-between">
                  <span className="text-[#6c6c6c]">Total Amenities Cost</span>
                  <span className="text-[#4a4260]">₹ {itinerary.costBreakdown.totalAmenitiesCost.toFixed(2)}</span>
                </div>
              )}
              {(Number(itinerary.extraBed || 0) > 0 || Number(itinerary.costBreakdown.extraBedCost || 0) > 0) && (
                <div className="flex justify-between">
                  <span className="text-[#6c6c6c]">Extra Bed Cost ({itinerary.extraBed || 0})</span>
                  <span className="text-[#4a4260]">₹ {Number(itinerary.costBreakdown.extraBedCost || 0).toFixed(2)}</span>
                </div>
              )}
              {(Number(itinerary.childWithBed || 0) > 0 || Number(itinerary.costBreakdown.childWithBedCost || 0) > 0) && (
                <div className="flex justify-between">
                  <span className="text-[#6c6c6c]">Child With Bed Cost ({itinerary.childWithBed || 0})</span>
                  <span className="text-[#4a4260]">₹ {Number(itinerary.costBreakdown.childWithBedCost || 0).toFixed(2)}</span>
                </div>
              )}
              {itinerary.costBreakdown.childWithoutBedCost !== undefined && itinerary.costBreakdown.childWithoutBedCost > 0 && (
                <div className="flex justify-between">
                  <span className="text-[#6c6c6c]">Child Without Bed Cost ({itinerary.childWithoutBed || 0})</span>
                  <span className="text-[#4a4260]">₹ {itinerary.costBreakdown.childWithoutBedCost.toFixed(2)}</span>
                </div>
              )}


              {/* ── Vehicle Cost Group ── */}
{shouldShowVehicles && computedVehicleAmount > 0 && (
  <div className="flex justify-between">
    <span className="text-[#6c6c6c]">
      Total Vehicle Cost{computedVehicleQty ? ` (${computedVehicleQty})` : ''}
    </span>
    <span className="text-[#4a4260]">₹ {computedVehicleAmount.toFixed(2)}</span>
  </div>
)}

              {/* ── Guide / Activity / Hotspot ── */}
              {itinerary.costBreakdown.totalGuideCost !== undefined && itinerary.costBreakdown.totalGuideCost > 0 && (
                <div className="flex justify-between">
                  <span className="text-[#6c6c6c]">Total Guide Cost</span>
                  <span className="text-[#4a4260]">₹ {itinerary.costBreakdown.totalGuideCost.toFixed(2)}</span>
                </div>
              )}
              {effectiveEntryTicketAmount > 0 && (
                <div className="space-y-1">
                  <div className="flex justify-between">
                    <span className="text-[#6c6c6c]">Total Entry Ticket Cost</span>
                    <span className="text-[#4a4260]">₹ {effectiveEntryTicketAmount.toFixed(2)}</span>
                  </div>

                  {entryTicketBreakdownByLocation.length > 0 && (
                    <div className="ml-3 space-y-1">
                      {entryTicketBreakdownByLocation.map((row) => (
                        <div
                          key={`${row.dayNumber}-${row.locationName}`}
                          className="flex justify-between text-xs"
                        >
                          <span className="text-[#7a7a7a]">Day {row.dayNumber} - {row.locationName}</span>
                          <span className="text-[#5e5e5e]">₹ {Number(row.amount || 0).toFixed(2)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
              {itinerary.costBreakdown.totalActivityCost !== undefined && itinerary.costBreakdown.totalActivityCost > 0 && (
                <div className="flex justify-between">
                  <span className="text-[#6c6c6c]">Total Activity Cost</span>
                  <span className="text-[#4a4260]">₹ {itinerary.costBreakdown.totalActivityCost.toFixed(2)}</span>
                </div>
              )}
              {itinerary.costBreakdown.additionalMargin !== undefined && itinerary.costBreakdown.additionalMargin > 0 && (
                <div className="flex justify-between">
                  <span className="text-[#6c6c6c]">Total Additional Margin (10%)</span>
                  <span className="text-[#4a4260]">₹ {itinerary.costBreakdown.additionalMargin.toFixed(2)}</span>
                </div>
              )}

              {/* ── Total Amount ── */}
              <div className="border-t border-[#e5d9f2] pt-3 mt-1">
                <div className="flex justify-between font-semibold">
                  <span className="text-[#4a4260]">Total Amount</span>
                  <span className="text-[#4a4260]">₹ {financialTotals.totalAmount.toFixed(2)}</span>
                </div>
              </div>

              {/* ── Discounts / Adjustments (only when non-zero) ── */}
              {(itinerary.costBreakdown.couponDiscount ?? 0) > 0 && (
                <div className="flex justify-between text-[#d546ab]">
                  <span>Coupon Discount</span>
                  <span>- ₹ {itinerary.costBreakdown.couponDiscount!.toFixed(2)}</span>
                </div>
              )}
              {(itinerary.costBreakdown.agentMargin ?? 0) > 0 && (
                <div className="flex justify-between">
                  <span className="text-[#6c6c6c]">Agent Margin</span>
                  <span className="text-[#4a4260]">₹ {itinerary.costBreakdown.agentMargin!.toFixed(2)}</span>
                </div>
              )}

              {/* ── Net Payable ── */}
              <div className="border-t border-[#e5d9f2] pt-2 mt-1 space-y-1">
                <div className="flex justify-between text-[#6c6c6c]">
                  <span>Total Round Off</span>
                  <span>
                    {(financialTotals.totalRoundOff ?? 0) > 0 ? "+ " : ""}₹ {financialTotals.totalRoundOff.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between text-base font-bold pt-1">
                  <span className="text-[#4a4260]">
                    Net Payable To {itinerary.costBreakdown.companyName || "Doview Holidays India Pvt ltd"}
                  </span>
                  <span className="text-[#4a4260]">₹ {financialTotals.netPayable.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Action Buttons */}
      {!isConfirmedPresentation && (
      <div className="flex flex-wrap gap-3 justify-center">
       {/* Clipboard Dropdown */}

<div className="relative group">
  <Button className="bg-[#8b43d1] hover:bg-[#7c37c1] focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#8b43d1]">
    Clipboard ▼
  </Button>

  <div className="absolute left-0 mt-1 w-56 max-w-[80vw] bg-white border border-gray-200 rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible group-focus-within:opacity-100 group-focus-within:visible transition-all duration-200 z-50">
    <button
      className="w-full text-left px-4 py-2 hover:bg-[#f8f5fc] text-[#4a4260] flex items-center gap-2"
      onClick={() => {
        if (itineraryPreference === 2) {
          handleVehicleOnlyClipboardCopy("recommended");
          return;
        }

        setClipboardType("recommended");
        setSelectedHotels(buildDefaultClipboardSelection());
        setClipboardModal(true);
      }}
    >
      <span>📋</span> Copy Recommended
    </button>

    <button
      className="w-full text-left px-4 py-2 hover:bg-[#f8f5fc] text-[#4a4260] flex items-center gap-2"
      onClick={() => {
        if (itineraryPreference === 2) {
          handleVehicleOnlyClipboardCopy("highlights");
          return;
        }

        setClipboardType("highlights");
        setSelectedHotels(buildDefaultClipboardSelection());
        setClipboardModal(true);
      }}
    >
      <span>✨</span> Copy to Highlights
    </button>

    <button
      className="w-full text-left px-4 py-2 hover:bg-[#f8f5fc] text-[#4a4260] flex items-center gap-2 rounded-b-lg"
      onClick={() => {
        if (itineraryPreference === 2) {
          handleVehicleOnlyClipboardCopy("para");
          return;
        }

        setClipboardType("para");
        setSelectedHotels(buildDefaultClipboardSelection());
        setClipboardModal(true);
      }}
    >
      <span>📝</span> Copy to Para
    </button>
  </div>
</div>

        {isConfirmedPresentation ? (
          <>
            <Button
              variant="outline"
              className="border-[#d546ab] text-[#d546ab] hover:bg-[#fdf6ff]"
              onClick={() => void handleDownloadPluckCard()}
            >
              <CreditCard className="mr-2 h-4 w-4" />
              Download Pluck Card
            </Button>
            <Button
              variant="outline"
              className="border-[#28a745] text-[#28a745] hover:bg-[#28a745] hover:text-white"
              onClick={() => setVoucherModal(true)}
            >
              <FileText className="mr-2 h-4 w-4" />
              Voucher Details
            </Button>
            <Button
              variant="outline"
              className="border-[#fd7e14] text-[#fd7e14] hover:bg-[#fd7e14] hover:text-white"
              onClick={() => setIncidentalModal(true)}
            >
              <Plus className="mr-2 h-4 w-4" />
              Add Incidental Expenses
            </Button>
            <Link to={modifyItineraryHref}>
              <Button
                variant="outline"
                className="border-[#dc3545] text-[#dc3545] hover:bg-[#dc3545] hover:text-white"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Extend Trip
              </Button>
            </Link>
            <Button
              variant="outline"
              className="border-[#17a2b8] text-[#17a2b8] hover:bg-[#17a2b8] hover:text-white"
              onClick={() => void handleDownloadInvoice('tax')}
            >
              <Receipt className="mr-2 h-4 w-4" />
              Invoice Tax
            </Button>
            <Button
              variant="outline"
              className="border-[#fd7e14] text-[#fd7e14] hover:bg-[#fd7e14] hover:text-white"
              onClick={() => void handleDownloadInvoice('proforma')}
            >
              <FileText className="mr-2 h-4 w-4" />
              Invoice Proforma
            </Button>
          </>
        ) : (
          <>
             <Link to="/create-itinerary">
  <Button className="bg-[#28a745] hover:bg-[#218838]">
    Continue Planning
  </Button>
</Link>

        {(readOnly || isConfirmedItinerary) && (
  <Button
    variant="outline"
    className="border-[#dc3545] text-[#dc3545] hover:bg-[#dc3545] hover:text-white"
    onClick={() => setCancelModalOpen(true)}
  >
    <Trash2 className="mr-2 h-4 w-4" />
    Extend Trip
  </Button>
)}

        <Button
          className="bg-[#d546ab] hover:bg-[#c03d9f]"
          onClick={openConfirmQuotationModal}
          disabled={isOpeningConfirmQuotation}
        >
          {isOpeningConfirmQuotation ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Loading Prebook...
            </>
          ) : (
            <>
              <Bell className="mr-2 h-4 w-4" />
              Confirm Quotation
            </>
          )}
        </Button>

        {/* Share Dropdown */}
        <div className="relative group">
          <Button className="bg-[#17a2b8] hover:bg-[#138496] focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#17a2b8]">
            Share ▼
          </Button>
          <div className="absolute left-0 mt-1 w-56 max-w-[80vw] bg-white border border-gray-200 rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible group-focus-within:opacity-100 group-focus-within:visible transition-all duration-200 z-50">
            <button
              className="w-full text-left px-4 py-2 hover:bg-[#f8f5fc] text-[#4a4260] flex items-center gap-2"
              onClick={() => {
                const url = window.location.href;
                navigator.clipboard.writeText(url);
                toast.success("Link copied to clipboard!");
              }}
            >
              <span>🔗</span> Copy Link
            </button>
            <button
              className="w-full text-left px-4 py-2 hover:bg-[#f8f5fc] text-[#4a4260] flex items-center gap-2"
              onClick={() => {
                const url = window.location.href;
                const message = `Check out this itinerary: ${url}`;
                window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank');
              }}
            >
              <span>💬</span> Share on WhatsApp
            </button>
            <button
              className="w-full text-left px-4 py-2 hover:bg-[#f8f5fc] text-[#4a4260] flex items-center gap-2 rounded-b-lg"
              onClick={() => setShareModal(true)}
            >
              <span>✉️</span> Share via Email
            </button>
          </div>
        </div>

          </>
        )}
      </div>
      )}

      <div className="buy-now">
        <button
          id="scrollToTopButton"
          type="button"
          aria-label="Back to top"
          title="Back to top"
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          className="fixed bottom-12 right-3 z-[1080] inline-flex h-10 w-10 items-center justify-center rounded-md bg-[#7367f0] text-white shadow-[0_1px_20px_1px_#ea5455] transition-shadow hover:shadow-none"
        >
          <ArrowUp className="h-4 w-4" />
        </button>
      </div>

      <DeleteConfirmationDialog
        open={deleteHotspotModal.open}
        title="Delete Hotspot"
        description={<>Are you sure you want to delete "{deleteHotspotModal.hotspotName}"? This will also remove all associated activities.</>}
        deleting={isDeleting}
        onOpenChange={(open) => setDeleteHotspotModal({ ...deleteHotspotModal, open })}
        onCancel={() => setDeleteHotspotModal({ open: false, planId: null, routeId: null, routeHotspotId: null, masterHotspotId: null, hotspotName: "", hotspotWasPrebuilt: false })}
        onConfirm={handleDeleteHotspot}
      />

      {false && `

{/* ① Placement */}
                      <div className="text-xs font-semibold text-[#4a4260] uppercase tracking-wide">① Placement</div>
                          {formatPreviewTime(activityPreview.hotspotTiming?.startTime)} – {formatPreviewTime(activityPreview.hotspotTiming?.endTime)}
                              {formatPreviewTime(activityPreview.proposedTiming.startTime)} – {formatPreviewTime(activityPreview.proposedTiming.endTime)}
                    {/* ② Hotspot Impact */}
                          ② Hotspot Impact — {
                            activityPreview.hasConflicts ? '⛔ Conflict'
                              : activityPreview.proposedTiming?.willExtendHotspot ? '⚠️ Extends Window'
                                : '✅ Fits within window'
                          {' '}→{' '}
                            <div key={idx}>• {conflict.reason}</div>
                    {/* ③ Day Cascade */}
                          ③ Day Cascade — everything after shifts +{activityPreview.cascade.shiftMinutes} min
                                {seg.type === 'travel' ? '🚌 Travel'
                                  : seg.type === 'break' ? '⏸ Break'
                                    : seg.type === 'hotel' ? '🏨 Hotel'
                                      : seg.type === 'return' ? '🔄 Return'
                                        : '📍 Place'}
                        ③ Day Cascade — <span className="font-semibold">No downstream impact.</span> Activity fits within the existing hotspot window.
      `}
      <AddActivityDialog context={{
        addActivityModal, setAddActivityModal, loadingActivities, availableActivities, activityPreview, isAddingActivity,
        previewingActivityId, handlePreviewActivity, handleOpenPreviewAllHotspots, formatActivityDuration, formatActivityMoney, formatPreviewTime,
        getActivityTotalAmount, getSelectedPreviewActivity, handleAddActivity,
      }} />

      <DeleteConfirmationDialog
        open={deleteActivityModal.open}
        title="Delete Activity"
        description={<>Are you sure you want to delete "{deleteActivityModal.activityName}"?</>}
        deleting={isDeletingActivity}
        onOpenChange={(open) => setDeleteActivityModal({ ...deleteActivityModal, open })}
        onCancel={() => setDeleteActivityModal({ open: false, planId: null, routeId: null, activityId: null, activityName: '' })}
        onConfirm={handleDeleteActivity}
      />

      <GuideAssignmentDialog
        guideModal={guideModal}
        setGuideModal={setGuideModal}
        formatDate={(value) => formatHeaderDate(value)}
        onSave={handleSaveGuideAssignment}
      />

      <DeleteConfirmationDialog
        open={deleteGuideModal.open}
        title="Delete Guide"
        description={Number(deleteGuideModal.assignment?.guideType || 0) === 1
          ? "Are you sure you want to remove this whole-itinerary guide assignment?"
          : "Are you sure you want to remove this guide assignment from the itinerary day?"}
        deleting={deleteGuideModal.deleting}
        onOpenChange={(open) => { if (!deleteGuideModal.deleting) setDeleteGuideModal((prev) => ({ ...prev, open })); }}
        onCancel={() => setDeleteGuideModal({ open: false, assignment: null, deleting: false })}
        onConfirm={() => void handleDeleteGuideAssignment()}
      />

      {/* Add Hotspot Modal */}
      <Dialog
        open={addHotspotModal.open}
        onOpenChange={(open) => {
          if (!open) {
            setAddHotspotModal({
              open: false,
              planId: null,
              routeId: null,
              locationId: null,
              locationName: "",
            });
            setHotspotSearchQuery("");
            setPreviewTimelinesByHotspot({});
            setPreviewResolutionsByHotspot({});
            setTempModalTimeline([]);
            setForceReplacementApprovedByHotspot({});
            setSelectedHotspotIds([]);
            setIsPreviewingHotspotId(null);
            setSelectedHotspotAnchor(null);
            setHotspotFilterMeta(null);
            setActiveHotspotCityTab('ALL');
            setSelectedFitHotspot(null);
            setTriedFitHereAnchors({});
            setFitHereModal({
              open: false,
              loading: false,
              loadingStepIndex: 0,
              failedReason: null,
              attempt: null,
              anchorKey: null,
            });
            return;
          }

          setAddHotspotModal({ ...addHotspotModal, open: true });
        }}
      >
        <DialogContent className="w-[96vw] sm:max-w-5xl max-h-[90vh] flex flex-col">
          <DialogHeader>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
              <div>
                <DialogTitle>Fit Here Hotspot List</DialogTitle>
                <DialogDescription>
                  {selectedPreviewCityContext === 'DESTINATION_CITY'
                    ? `Destination-side hotspots after reaching ${destinationCityLabel}. Preview checks one exact Fit Here position; Auto-Preview checks all valid positions.`
                    : "Select a hotspot, then use Preview for one exact Fit Here position or Auto-Preview for all valid positions."}
                </DialogDescription>
              </div>
              <input
                type="text"
                placeholder="Search Hotspot..."
                className="px-3 py-2 border border-gray-300 rounded-md text-sm w-full sm:w-64"
                value={hotspotSearchQuery}
                onChange={(e) => setHotspotSearchQuery(e.target.value)}
              />
            </div>
          </DialogHeader>
          <div className="py-4 flex-1 overflow-hidden flex min-h-0">
            <div className="flex flex-col lg:flex-row gap-4 w-full min-h-0">
              {/* Left Column: Hotspot List */}
              <div ref={hotspotListRef} className="w-full lg:w-1/2 overflow-y-auto min-h-0">
                {routeIsDifferentCity && hotspotCityTabs.length > 0 && (
                  <div className="sticky top-0 z-10 bg-white pb-2">
                    <div className="flex flex-wrap gap-2">
                      {hotspotCityTabs.map((tab) => {
                        const isActive = tab.key === activeHotspotCityTab;
                        return (
                          <button
                            key={tab.key}
                            type="button"
                            onClick={() => setActiveHotspotCityTab(tab.key)}
                            className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
                              isActive
                                ? 'bg-[#d546ab] text-white border-[#d546ab]'
                                : 'bg-white text-[#6c6c6c] border-[#e5d7e3] hover:border-[#d546ab] hover:text-[#4a4260]'
                            }`}
                          >
                            {tab.label} ({tab.count})
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
                {loadingHotspots ? (
                  <p className="text-sm text-[#6c6c6c] text-center py-8">
                    Loading available hotspots...
                  </p>
                ) : visibleHotspotsForActiveTab.length === 0 ? (
                  <p className="text-sm text-[#6c6c6c] text-center py-8">
                    {hotspotSearchQuery ? "No hotspots match your search" : "No hotspots available for this location"}
                  </p>
                ) : (
                  <div className="grid grid-cols-1 gap-4">
                    {visibleHotspotsForActiveTab.map((hotspot) => (
                      (() => {
                        const isSelected = Number(selectedFitHotspot?.id || 0) === Number(hotspot.id);
                        const hotspotId = Number(hotspot.id);
                        const backendStatus = String(hotspot.availabilityStatus || '').trim().toUpperCase();
                        const availabilityReason = String(hotspot.availabilityReason || '').trim().toLowerCase();

                        const isDeletedFromTimeline =
                          excludedHotspotIds.map(Number).includes(hotspotId) ||
                          backendStatus === 'EXCLUDED_BY_ROUTE' ||
                          availabilityReason.includes('excluded for this route') ||
                          availabilityReason.includes('currently excluded');

                        const isActuallyInCurrentTimeline =
                          currentRouteAttractionHotspotIds.has(hotspotId) ||
                          addedInModalHotspotIds.has(hotspotId);
                        const isAddedOnOtherRoute =
                          hotspot.alreadyAddedOnOtherRoute === true
                          || backendStatus === 'ACTIVE_OTHER_ROUTE';
                        const isAdded =
                          isActuallyInCurrentTimeline ||
                          (
                            !isDeletedFromTimeline &&
                            (
                              (hotspot.alreadyAdded === true && !isAddedOnOtherRoute) ||
                              backendStatus === 'ACTIVE_THIS_ROUTE'
                            )
                          );
                        const isAlsoOnOtherRoute = isAddedOnOtherRoute;
                        const isActionDisabled =
                          isAdded ||
                          (
                            hotspot.actionDisabled === true &&
                            !isAddedOnOtherRoute &&
                            !isDeletedFromTimeline
                          );
                        const timingText = String(hotspot.timings || '').trim().toLowerCase();
                        const hasUsableTimings = timingText.length > 0 && timingText !== 'no timings available';
                        const isClosedTiming = !hasUsableTimings;
                        const hotspotTimeline = previewTimelinesByHotspot[hotspot.id] || [];
                        const hasConflict = hotspotTimeline.some(
                          (seg) => seg?.isConflict === true && Number(seg?.locationId) === hotspot.id,
                        );
                        const isLoadingThis = isPreviewingHotspotId === hotspot.id;
                        const manualMeta = currentRouteManualHotspotMetaById.get(hotspotId) || null;
                        const resolvedRouteHotspotId = Number(
                          (hotspot as any).routeHotspotId ||
                          manualMeta?.routeHotspotId ||
                          0,
                        );
                        const isManualAddedOnCurrentRoute =
                          isAdded &&
                          (
                            currentRouteManualHotspotIds.has(hotspotId) ||
                            addedInModalHotspotIds.has(hotspotId) ||
                            hotspot.isManual === true ||
                            hotspot.planOwnWay === true ||
                            manualMeta?.isManual === true
                          ) &&
                          resolvedRouteHotspotId > 0;

                        return (
                          <div
                            key={hotspot.id}
                            data-hotspot-id={hotspot.id}
                            className={`border rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow bg-white ${isSelected ? 'ring-2 ring-[#d546ab]' : ''}`}
                          >
                            <div className="p-4">
                              <div className="flex gap-3 mb-3">
                                <div className="relative flex-shrink-0">
                                  <img
                                    src={
                                      toImgSrc(hotspot.image || null)
                                      || "https://placehold.co/185x115/e9d5f7/4a4260?text=Spot"
                                    }
                                    alt={hotspot.name}
                                    className="rounded-lg object-cover shadow-sm w-[120px] h-[86px] sm:w-[148px] sm:h-[102px]"
                                  />
                                  <div className="absolute top-1 right-1 flex flex-col gap-1">
                                    <button
                                      type="button"
                                      title="Click to View the Images"
                                      className="bg-white/90 hover:bg-white rounded-full p-1 shadow"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        openGalleryModal(
                                          Array.isArray(hotspot.galleryImages) && hotspot.galleryImages.length > 0
                                            ? hotspot.galleryImages
                                            : hotspot.image ? [hotspot.image] : [],
                                          hotspot.name,
                                        );
                                      }}
                                    >
                                      🖼️
                                    </button>
                                    {hotspot.videoUrl && (
                                      <button
                                        type="button"
                                        title="Click to View the Video"
                                        className="bg-white/90 hover:bg-white rounded-full p-1 shadow"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          openVideoModal(hotspot.videoUrl || '', hotspot.name);
                                        }}
                                      >
                                        ▶️
                                      </button>
                                    )}
                                  </div>
                                </div>
                                <div className="min-w-0 flex-1">
                                  <div className="flex justify-between items-start mb-2 gap-2">
                                    <div className="min-w-0 flex-1">
                                      <h4 className="font-semibold text-base text-[#4a4260] truncate">
                                        {hotspot.name}
                                      </h4>
                                      <div className="mt-1 flex flex-wrap items-center gap-2">
                                        {hotspot.visitAgain && (
                                          <span className="text-[9px] font-bold text-white bg-blue-500 px-2 py-0.5 rounded whitespace-nowrap">
                                            Visit Again
                                          </span>
                                        )}
                                        {isDeletedFromTimeline && (
                                          <span className="text-[9px] font-bold text-white bg-orange-500 px-2 py-0.5 rounded whitespace-nowrap">
                                            Deleted from timeline
                                          </span>
                                        )}
                                        {isSelected && (
                                          <span className={`text-[10px] px-2 py-0.5 rounded-full uppercase font-bold ${hasConflict
                                              ? 'bg-red-100 text-red-700'
                                              : 'bg-green-100 text-green-700'
                                            }`}>
                                            {hasConflict ? 'Conflict' : 'Selected'}
                                          </span>
                                        )}
                                        {isAdded && (
                                          <span className="text-[10px] px-2 py-0.5 rounded-full uppercase font-bold bg-green-100 text-green-700">
                                            Added
                                          </span>
                                        )}
                                        {isAlsoOnOtherRoute && (
                                          <span className="text-[10px] px-2 py-0.5 rounded-full uppercase font-bold bg-blue-100 text-blue-800">
                                            Also used on another day
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                    <div className="flex gap-2 shrink-0">
                                      {isManualAddedOnCurrentRoute ? (
                                        <div className="flex items-center gap-2">
                                          <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            className="border-emerald-300 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                                            disabled
                                          >
                                            Added
                                          </Button>

                                          <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            className="border-red-200 bg-red-50 text-red-700 hover:bg-red-100"
                                            onClick={() => {
                                              if (!(resolvedRouteHotspotId > 0)) {
                                                toast.error('Could not find the route hotspot row ID. Please refresh and try again.');
                                                return;
                                              }

                                              openDeleteHotspotModal(
                                                addHotspotModal.planId || itinerary?.planId || 0,
                                                addHotspotModal.routeId || 0,
                                                resolvedRouteHotspotId,
                                                hotspotId,
                                                hotspot.name,
                                                true,
                                              );
                                            }}
                                          >
                                            <Trash2 className="mr-1 h-4 w-4" />
                                            Delete
                                          </Button>
                                        </div>
                                      ) : isAdded ? (
                                        <Button
                                          type="button"
                                          variant="outline"
                                          size="sm"
                                          className="border-slate-200 bg-slate-100 text-slate-500"
                                          disabled
                                        >
                                          Added
                                        </Button>
                                      ) : (
                                        <div className="flex gap-2">
                                          <Button
                                            type="button"
                                            size="sm"
                                            disabled={isActionDisabled || isClosedTiming || isLoadingThis || isBuildingMatrix || isApplyingPreviewHotspot}
                                            onClick={() => {
                                              if (isFitHereSelectionMode) {
                                                handleSelectFitHotspot(hotspot);
                                                toast.info('Now choose the exact Fit Here position from the timeline on the right.');
                                                return;
                                              }

                                              handlePreviewHotspot(hotspot.id);
                                            }}
                                            className="bg-[#d546ab] hover:bg-[#c03d9f] text-white"
                                          >
                                            {isLoadingThis ? (
                                              <>
                                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                Previewing
                                              </>
                                            ) : (
                                              hotspot.buttonLabel || 'Preview'
                                            )}
                                          </Button>
                                          {isFitHereSelectionMode && (
                                            <Button
                                              type="button"
                                              size="sm"
                                              variant="outline"
                                              disabled={isActionDisabled || isClosedTiming || isLoadingThis || isBuildingMatrix || isApplyingPreviewHotspot || autoFitHereModal.loading}
                                              onClick={() => {
                                                void handleAutoPreviewFitHere(hotspot);
                                              }}
                                              className="border-emerald-300 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                                            >
                                              Auto-Preview
                                            </Button>
                                          )}
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                  <p className="text-sm text-[#6c6c6c] mb-3 line-clamp-2">
                                    {hotspot.description}
                                  </p>
                                  <div className="flex flex-wrap gap-3 text-xs text-[#6c6c6c]">
                                    {String(hotspot.availabilityReason || '').trim().length > 0 && (
                                      <span className="text-[11px] text-[#4a4260]">
                                        {hotspot.availabilityReason}
                                      </span>
                                    )}
                                    {hotspot.amount > 0 && (
                                      <span className="flex items-center">
                                        <Ticket className="h-3 w-3 mr-1" />
                                        ₹ {hotspot.amount.toFixed(2)}
                                      </span>
                                    )}
                                    {hotspot.timeSpend > 0 && (
                                      <span className="flex items-center">
                                        <Clock className="h-3 w-3 mr-1" />
                                        {hotspot.timeSpend} hrs
                                      </span>
                                    )}
                                    {hotspot.timings && String(hotspot.timings).trim().toLowerCase() !== 'no timings available' && (
                                      <span className="flex items-center">
                                        <Timer className="h-3 w-3 mr-1" />
                                        {hotspot.timings}
                                      </span>
                                    )}
                                    {isClosedTiming && (
                                      <span className="flex items-center text-[#a35c1a]">
                                        <Timer className="h-3 w-3 mr-1" />
                                        No timings available
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })()
                    ))}
                  </div>
                )}
              </div>

              {/* Right Column: Preview */}
              <div className="w-full lg:w-1/2 lg:border-l lg:pl-4 border-t lg:border-t-0 pt-4 lg:pt-0 flex flex-col overflow-y-auto min-h-0 pr-1">
                <h3 className="font-semibold text-[#4a4260] mb-4 flex items-center gap-2 flex-shrink-0">
                  <Clock className="h-4 w-4" />
                  Proposed Timeline
                </h3>
                {!selectedFitHotspot && !manualPreviewState && (
                  <div className="mb-4 rounded-2xl border border-slate-200 bg-slate-50 p-5">
                    <p className="text-sm font-semibold text-slate-900">Select a hotspot to start Fit Here mode</p>
                    <p className="mt-1 text-sm text-slate-600">
                      Pick a hotspot from the left, then choose the exact insertion anchor on this timeline.
                    </p>
                  </div>
                )}
                {selectedFitHotspot && selectedFitHereDay && !manualPreviewState && (
                  <div className="mb-4 space-y-4">
                    <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
                      <p className="text-xs font-bold uppercase tracking-wide text-emerald-700">
                        Selected for Fit Here
                      </p>
                      <p className="mt-1 text-base font-semibold text-slate-900">
                        {selectedFitHotspot.name}
                      </p>
                      <p className="mt-2 text-sm text-slate-600">
                        Choose the exact anchor below. We’ll calculate a preview for that position before anything is saved.
                      </p>
                    </div>

                    <div className="space-y-3">
                      {selectedFitHereDay.segments.map((segment, idx) => {
                        if (segment.type === 'hotspot') return null;

                        const anchor = buildFitHereAnchorForTimelineRow(selectedFitHereDay, idx);
                        const shouldRenderAnchor = Boolean(selectedFitHotspot && anchor);

                        return (
                          <React.Fragment key={`fit-here-row-${idx}`}>
                            <div
                              data-testid="fit-here-timeline-row"
                              data-segment-type={segment.type}
                              data-segment-label={getFitHereSegmentLabel(segment)}
                              className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm"
                            >
                              <div className="flex items-start justify-between gap-3">
                                <div>
                                  <p className="text-sm font-semibold text-slate-900">
                                    {getFitHereSegmentLabel(segment)}
                                  </p>
                                  {getFitHereSegmentTime(segment) && (
                                    <p className="mt-1 text-xs text-slate-500">
                                      {getFitHereSegmentTime(segment)}
                                    </p>
                                  )}
                                </div>
                                <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-bold uppercase text-slate-600">
                                  {segment.type}
                                </span>
                              </div>
                            </div>
                            {shouldRenderAnchor && anchor ? renderFitHereButton(selectedFitHereDay, anchor) : null}
                          </React.Fragment>
                        );
                      })}
                    </div>
                  </div>
                )}
                {!isFitHereSelectionMode && (activePreviewHotspotId && (selectedHotspotAnchor || bestInsertionSlot || matrixRequiresBuild || isMatrixBuiltButNoFeasibleSlot)) && (
                  <div className="mb-3 p-3 rounded-xl border border-[#f0d9ea] bg-[#fff7fc] shadow-sm flex-shrink-0">
                    <p className="text-xs text-[#6c6c6c]">
                      {backendForceConflictState.selectedStrategyLabel
                        || ((matrixFit as any)?.cityEndpointInsertionMode === true
                        ? 'Selected Timing-Safe Schedule'
                        : matrixFit?.singleHotspotInsertionMode === true
                        ? 'Selected Timing-Safe Schedule'
                        : isMatrixMissingBlockedState
                          ? 'Route-fit matrix data missing'
                          : isMatrixBuiltButNoFeasibleSlot
                            ? 'Conflict Mode Only'
                            : 'Selected Timing-Safe Schedule')}
                    </p>
                    {!isMatrixMissingBlockedState && !isMatrixBuiltButNoFeasibleSlot ? (
                      <p className="text-sm font-semibold text-[#4a4260] mt-0.5">
                        {((matrixFit as any)?.cityEndpointInsertionMode === true
                          ? (matrixFit?.chosenSlot?.label || matrixFit?.bestSlot?.label || null)
                          : null) || bestInsertionSlot?.slot || (
                          selectedPreviewCityContext === 'DESTINATION_CITY'
                            ? ((destinationInsertionSlotLabel || '').replace(/^Will\s+be\s+inserted\s+/i, '') || 'Computing best slot...')
                            : 'Computing best slot...'
                        )}
                      </p>
                    ) : isMatrixMissingBlockedState ? (
                      <p className="text-sm font-semibold text-red-700 mt-0.5">
                        Cannot preview accurate insertion until matrix data is built.
                      </p>
                    ) : (
                      <p className="text-sm font-semibold text-orange-700 mt-0.5">
                        This hotspot adds extra distance or off-route travel. Since this is a manual add, it can still be inserted if the rebuilt route reaches the hotel within the allowed manual timing window.
                      </p>
                    )}

                    {insertionDecisionSummary && (
                      <p
                        className={`mt-2 text-xs font-semibold ${
                          insertionDecisionSummary.willInsert ? 'text-green-700' : 'text-red-700'
                        }`}
                      >
                        {insertionDecisionSummary.text}
                      </p>
                    )}

                    {manualAttemptDisplayMeta.attempts.length > 0 && (
                      <div className="mt-2 rounded-lg border border-slate-200 bg-slate-50 p-3">
                        <p className="text-xs font-semibold text-slate-800">
                          {manualAttemptDisplayMeta.authoritative ? 'Attempted schedules' : 'Candidate-wrapped attempt log'} ({manualAttemptDisplayMeta.attempts.length})
                        </p>
                        {activeManualOptimizer?.summary ? (
                          <p className="mt-1 text-[11px] text-slate-700">
                            Selected: {activeManualOptimizer.summary}
                          </p>
                        ) : null}
                        {manualAttemptDisplayMeta.wrapperOnly && (
                          <p className="mt-1 text-[11px] text-amber-700">
                            These rows are candidate-wrapper diagnostics, not authoritative real cluster simulations yet.
                          </p>
                        )}
                        <div className="mt-2 space-y-2">
                          {manualAttemptDisplayMeta.attempts.slice(0, 6).map((attempt, idx: number) => (
                            <div
                              key={`${String(attempt?.strategyKey || 'attempt')}-${idx}`}
                              className={`rounded-md border px-2 py-2 text-[11px] ${
                                attempt?.selected === true
                                  ? 'border-green-300 bg-green-50'
                                  : attempt?.readyToApply === true
                                    ? 'border-blue-200 bg-white'
                                    : 'border-slate-200 bg-white'
                              }`}
                            >
                              <p className="font-semibold text-slate-800">
                                {attempt?.selected === true ? 'Selected: ' : ''}
                                {attempt?.strategyLabel || attempt?.strategyKey || `Attempt ${idx + 1}`}
                              </p>
                              <p className="mt-1 text-[10px] uppercase tracking-wide text-slate-500">
                                Source: {String(attempt?.source || 'UNKNOWN').replace(/_/g, ' ')}
                              </p>
                              <p className="mt-1 text-slate-600">
                                {attempt?.summary || attempt?.reason || 'No explanation available.'}
                              </p>
                              <p className="mt-1 text-slate-500">
                                {attempt?.openingHourConflictCount > 0 ? `Opening conflicts: ${attempt.openingHourConflictCount}. ` : ''}
                                {Number(attempt?.routeEndOverflowMinutes || 0) > 0 ? `Overflow: ${attempt.routeEndOverflowMinutes} min. ` : ''}
                                {Number(attempt?.removedOptionalCount || 0) > 0 ? `Removed P4+: ${attempt.removedOptionalCount}. ` : ''}
                                {Number(attempt?.removedTopPriorityCount || 0) > 0 ? `Removed P3: ${attempt.removedTopPriorityCount}. ` : ''}
                                {Number(attempt?.extraTravelKm || 0) > 0 ? `Extra detour: ${Number(attempt.extraTravelKm).toFixed(1)} km.` : ''}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {!isMatrixMissingBlockedState && !isMatrixBuiltButNoFeasibleSlot && activePreviewResolution?.anchorPreference?.honored === false && (
                      <p className="text-xs text-amber-700 mt-1">
                        The system tested the available insertion positions and selected the best timing / lowest extra-distance slot.
                      </p>
                    )}

                    {!isMatrixMissingBlockedState && !isMatrixBuiltButNoFeasibleSlot && activeAnchorFitInsight && (
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <span
                          className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                            activeAnchorFitInsight.tone === 'green'
                              ? 'bg-green-100 text-green-700'
                              : activeAnchorFitInsight.tone === 'red'
                                ? 'bg-red-100 text-red-700'
                                : 'bg-amber-100 text-amber-700'
                          }`}
                        >
                          {activeAnchorFitInsight.label}
                        </span>
                        {activeAnchorFitInsight.extraDistanceLabel && (
                          <span className="text-xs font-semibold text-[#4a4260]">
                            {activeAnchorFitInsight.extraDistanceLabel}
                          </span>
                        )}
                        {activeAnchorFitInsight.anchorLegLabel && (
                          <span className="text-xs text-[#6c6c6c]">
                            Anchor leg: {activeAnchorFitInsight.anchorLegLabel}
                          </span>
                        )}
                      </div>
                    )}

                    {isMatrixMissingBlockedState && (
                      <div className="mt-2 rounded-lg border border-red-200 bg-red-50 p-3">
                        <p className="text-xs font-semibold text-red-800 leading-4">
                          Route-fit matrix data is missing for the selected hotspot and current route.
                        </p>

                        <p className="text-xs text-red-700 leading-4 mt-1">
                          Build the route-fit matrix first, then preview this hotspot again.
                        </p>

                        {activePreviewHotspotId ? (
                          <Button
                            type="button"
                            size="sm"
                            className="mt-3 bg-[#d546ab] hover:bg-[#b93a8f] text-white"
                            disabled={
                              isBuildingMatrix
                              || isPreviewingHotspotId === activePreviewHotspotId
                              || isApplyingPreviewHotspot
                            }
                            onClick={handleBuildMatrixAndPreviewAgain}
                          >
                            {isBuildingMatrix ? (
                              <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Building matrix...
                              </>
                            ) : (
                              'Build Matrix & Preview Again'
                            )}
                          </Button>
                        ) : null}
                        {String(matrixBuildSuggestion?.command || '').trim().length > 0 && (
                          <p className="text-[11px] text-red-800 font-mono mt-2 break-all">
                            {String(matrixBuildSuggestion.command)}
                          </p>
                        )}
                      </div>
                    )}

                    {isMatrixBuiltButNoFeasibleSlot && (
                      <div className="mt-2 rounded-lg border border-orange-200 bg-orange-50 p-2">
                        <p className="text-xs text-orange-700 leading-4">
                          This hotspot adds extra distance or off-route travel. For manual add, this is treated as a warning. The final decision is based on whether the rebuilt timeline fits within the manual timing window.
                        </p>
                        {Array.isArray(safeMatrixSlots) && safeMatrixSlots.length > 0 && (
                          <div className="mt-2 text-xs text-orange-700">
                            <p className="font-semibold text-orange-800 mb-1">Insertion attempts:</p>
                            <ul className="space-y-1 pl-3">
                              {safeMatrixSlots.slice(0, 5).map((slot, idx: number) => (
                                <li key={idx} className="list-disc">
                                  {slot.fromName} → {((
                                    /^hotel$/i.test(String(slot.toName || '').trim())
                                    || (
                                      String((matrixFit as any)?.destinationHotelName || '').trim().length > 0
                                      && String(slot.toName || '').trim().toLowerCase() === String((matrixFit as any)?.destinationHotelName || '').trim().toLowerCase()
                                    )
                                    || Number((slot as any)?.destinationHotelId || 0) > 0
                                  ) && destinationHotelDisplayName) ? destinationHotelDisplayName : slot.toName}:{' '}
                                  <span className={`text-[11px] font-bold px-1.5 py-0.5 rounded-full ${routeFitBadgeClass(slot.routeFitType)}`}>
                                    {slot.label || slot.routeFitType}
                                  </span>
                                </li>
                              ))}
                              {safeMatrixSlots.length > 5 && (
                                <li className="text-orange-600">+{safeMatrixSlots.length - 5} more</li>
                              )}
                            </ul>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
                {!pendingPriorityReplacementHotspotId && (
                  <div className="mb-2 flex-shrink-0 space-y-2 max-h-32 overflow-y-auto pr-1">
                    {previewRemovedHotspotDetails.length > 0
                      && activePreviewValidation?.readyToApply === false && (
                      <div className="mb-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
                        <p className="font-bold">P3 hotspot removed, but manual hotspot still has a timing conflict</p>
                        <ul className="mt-2 space-y-2">
                          {previewRemovedHotspotDetails.map((row) => (
                            <li key={`preview-removed-summary-${row.key}`} className="rounded-lg border border-amber-200 bg-white/70 p-2">
                              <p className="font-semibold text-amber-900">
                                {row.name}
                                {row.workPriorityLabel || row.priorityLabel ? ` • ${row.workPriorityLabel || row.priorityLabel}` : ''}
                              </p>
                              {row.reason ? (
                                <p className="mt-1 leading-4">{row.reason}</p>
                              ) : null}
                              {row.removalReasonCode ? (
                                <p className="mt-1 font-mono text-[11px] uppercase tracking-wide text-amber-700">
                                  {row.removalReasonCode}
                                </p>
                              ) : null}
                            </li>
                          ))}
                        </ul>
                        <p className="mt-2">
                          You can force add only if you want to keep the selected manual hotspot as a conflict.
                        </p>
                      </div>
                    )}
                    {activePreviewValidation?.readyToApply === false
                      && activePreviewValidation?.requiresPriorityConfirmation !== true
                      && !isMatrixBuiltButNoFeasibleSlot ? (
                      <div className="p-3 rounded-xl border border-red-200 bg-red-50 shadow-sm">
                        <p className="text-sm font-bold text-red-800">
                          {isMatrixBuiltButNoFeasibleSlot
                            ? 'Selected hotspot is off-route for this route'
                            : 'Selected hotspot does not fit the rebuilt slot'}
                        </p>
                        {hasManualOpeningOrTimingConflict(activePreviewValidation) ? (
                          <p className="text-xs text-red-700 mt-1">
                            The route can be recalculated, but this hotspot conflicts with its opening/timing window.
                          </p>
                        ) : activePreviewValidation?.readyToApply === false ? (
                          <p className="text-xs text-red-700 mt-1">
                            This hotspot cannot be inserted normally in the current preview.
                          </p>
                        ) : null}
                        <p className="text-xs text-red-700 mt-1 leading-4 line-clamp-2">
                          {previewValidationReasonText}
                        </p>
                        {shouldShowBuildMatrixButton && activePreviewHotspotId ? (
                          <Button
                            type="button"
                            size="sm"
                            className="mt-2 bg-[#d546ab] hover:bg-[#b93a8f] text-white"
                            disabled={
                              isBuildingMatrix
                              || isPreviewingHotspotId === activePreviewHotspotId
                              || isApplyingPreviewHotspot
                            }
                            onClick={handleBuildMatrixAndPreviewAgain}
                          >
                            {isBuildingMatrix ? 'Building matrix...' : 'Build Matrix & Preview Again'}
                          </Button>
                        ) : null}
                        {selectedHotspotAnchor ? (
                          <p className="text-xs text-red-700 mt-2 leading-4">
                            Attempted insertion slot:{' '}
                            <span className="font-semibold">
                              {selectedPreviewCityContext === 'DESTINATION_CITY'
                                ? ((destinationInsertionSlotLabel || '').replace(/^Will\s+be\s+inserted\s+/i, ''))
                                : `${selectedHotspotAnchor.anchorFrom || 'Current stop'} -> ${selectedHotspotAnchor.anchorTo || 'Next stop'}`}
                            </span>
                            {selectedPreviewCityContext !== 'DESTINATION_CITY' && selectedHotspotAnchor.anchorTimeRange ? ` (${selectedHotspotAnchor.anchorTimeRange})` : ''}
                          </p>
                        ) : null}
                        {Array.isArray(activePreviewResolution?.unscheduledManualHotspots)
                        && activePreviewResolution.unscheduledManualHotspots.length > 0 ? (
                          <div className="mt-2 text-xs text-red-700 leading-4">
                            <p className="font-semibold text-red-800">Could not schedule:</p>
                            <ul className="mt-1 list-disc pl-4 space-y-1">
                              {activePreviewResolution.unscheduledManualHotspots
                                .slice(0, 3)
                                .map((row, idx: number) => (
                                  <li key={`unscheduled-manual-${Number(row?.id || 0)}-${idx}`}>
                                    <span className="font-semibold">{row?.name || `Hotspot ${row?.id || ''}`}</span>
                                    {row?.reason ? `: ${row.reason}` : ''}
                                  </li>
                                ))}
                            </ul>
                          </div>
                        ) : null}
                        {previewRemovedHotspotDetails.length > 0 ? (
                          <div className="mt-2 text-xs text-red-700 leading-4">
                            <p className="font-semibold text-red-800">Removed while trying to fit:</p>
                            <ul className="mt-1 space-y-2">
                              {previewRemovedHotspotDetails.map((row) => (
                                <li key={`preview-removed-detail-${row.key}`} className="rounded-lg border border-red-200 bg-white/70 p-2">
                                  <p className="font-semibold text-red-900">
                                    {row.name}
                                    {row.workPriorityLabel || row.priorityLabel ? ` • ${row.workPriorityLabel || row.priorityLabel}` : ''}
                                  </p>
                                  {row.reason ? (
                                    <p className="mt-1 leading-4">{row.reason}</p>
                                  ) : null}
                                  {row.removalReasonCode ? (
                                    <p className="mt-1 font-mono text-[11px] uppercase tracking-wide text-red-700">
                                      {row.removalReasonCode}
                                    </p>
                                  ) : null}
                                </li>
                              ))}
                            </ul>
                          </div>
                        ) : !isMatrixBuiltButNoFeasibleSlot ? (
                          <p className="text-xs text-red-700 mt-2 leading-4">
                            No more removable optional hotspots are available in this slot.
                          </p>
                        ) : null}
                        {isMatrixBuiltButNoFeasibleSlot ? (
                          <p className="text-xs text-red-700 mt-1 font-medium leading-4">
                            This hotspot cannot be added on the current route. Please choose a different hotspot or route segment.
                          </p>
                        ) : (
                          <p className="text-xs text-red-700 mt-1 font-medium leading-4">
                            Use confirm below to insert it as conflict.
                          </p>
                        )}
                      </div>
                    ) : null}

                    {optionalPreviewRemovedHotspotDetails.length > 0 ? (
                      <div className="p-3 rounded-xl border border-amber-200 bg-amber-50 shadow-sm">
                        <p className="text-sm font-bold text-amber-800">Optional hotspots will be removed</p>
                        <p className="text-xs text-amber-700 mt-1 leading-4">
                          To fit your selected hotspot(s), these optional hotspots will be removed:
                        </p>
                        <ul className="mt-2 space-y-2 text-xs text-amber-800">
                          {optionalPreviewRemovedHotspotDetails.map((row) => (
                            <li key={`optional-removed-${row.key}`} className="rounded-lg border border-amber-200 bg-white/70 p-2">
                              <p className="font-semibold">
                                {row.name}
                                {row.workPriorityLabel || row.priorityLabel ? ` • ${row.workPriorityLabel || row.priorityLabel}` : ''}
                              </p>
                              {row.reason ? (
                                <p className="mt-1 leading-4">{row.reason}</p>
                              ) : null}
                              {row.removalReasonCode ? (
                                <p className="mt-1 font-mono text-[11px] uppercase tracking-wide text-amber-700">
                                  {row.removalReasonCode}
                                </p>
                              ) : null}
                            </li>
                          ))}
                        </ul>
                      </div>
                    ) : null}
                  </div>
                )}
                <div ref={timelinePreviewRef} className="flex-1 space-y-3 min-h-0 pb-4">
                  {isPreviewingHotspotId ? (
                    <div className="flex flex-col items-center justify-center h-24 text-[#6c6c6c]">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#d546ab] mb-2"></div>
                      <p className="text-sm">Calculating selected slot...</p>
                    </div>
                  ) : null}

                  {effectivePreviewTimeline.length > 0 ? (
                    <>
                      {/* Rescheduling Applied Banner */}
                      {(activePreviewResolution as any)?.sameCityShuffleApplied === true && (
                        <div className="mb-2 rounded-xl border border-blue-200 bg-blue-50 p-3 text-xs text-blue-800">
                          <p className="font-bold">Timings reshuffled to fit manual hotspot</p>
                          <p className="mt-1">
                            The system reordered nearby same-city hotspots based on opening and closing time before removing any hotspot.
                          </p>
                        </div>
                      )}
                      {manualInsertionFit?.rescheduleApplied === true && (
                        <div className="p-3 rounded-lg border border-blue-300 bg-blue-50 text-sm">
                          <p className="font-semibold text-blue-900">✓ Timings recalculated after insertion.</p>
                          <p className="text-xs text-blue-800 mt-1">
                            Route-fit is feasible. Timeline rows below B have been shifted forward accordingly.
                          </p>
                        </div>
                      )}

                      {/* Day End Overflow — only show if no resolved removal plan replaces it */}
                      {manualInsertionFit?.exceedsDayEnd === true &&
                        (manualInsertionFit as any)?.lowPriorityRemovalPlanPreview?.resolved !== true && (
                        <div className="p-3 rounded-lg border border-amber-300 bg-amber-50 text-sm">
                          <p className="font-semibold text-amber-900">⚠ Timeline exceeds day end.</p>
                          <p className="text-xs text-amber-800 mt-1">
                            Final hotel check-in would exceed day end by {manualInsertionFit?.dayOverflowMinutes || 0} minutes.
                          </p>
                        </div>
                      )}

                      {/* Low-priority removal plan — resolved case */}
                      {(manualInsertionFit as any)?.lowPriorityRemovalPlanPreview?.resolved === true && (
                        <div className="p-3 rounded-lg border border-orange-300 bg-orange-50 text-sm">
                          <p className="font-semibold text-orange-900">Overflow resolved by removing lower-priority hotspots.</p>
                          {(() => {
                            const manualTimingPolicy =
                              getManualTimingPolicyFromPreview(manualPreviewState)
                              || getManualTimingPolicyFromPreview(activePreviewResolution)
                              || getManualTimingPolicyFromPreview(groupPreviewResolution);

                            const endLabel = formatManualPolicyTime(manualTimingPolicy?.endTime) || 'route end time';

                            return (
                              <p className="text-xs text-orange-700 mt-1 leading-4">
                                To fit this manual hotspot and keep hotel check-in before {endLabel}, these lower-priority hotspots will be removed:
                              </p>
                            );
                          })()}
                          {Array.isArray((manualInsertionFit as any)?.lowPriorityRemovalPlanPreview?.plannedRemovals) &&
                            (manualInsertionFit as any).lowPriorityRemovalPlanPreview.plannedRemovals.length > 0 ? (
                            <ul className="mt-2 space-y-1">
                              {((manualInsertionFit as any).lowPriorityRemovalPlanPreview.plannedRemovals as any[]).map((row, ri: number) => (
                                <li key={ri} className="text-xs text-orange-900 leading-4">
                                  <span className="font-semibold">{row?.name || 'Unknown stop'}</span>
                                  {row?.priority ? <span className="ml-1 text-orange-700">(Work Priority {row.priority})</span> : null}
                                  {row?.reason ? <span className="text-orange-700"> {'—'} {row.reason}</span> : null}
                                  {row?.removalReasonCode ? (
                                    <span className="ml-1 font-mono uppercase tracking-wide text-orange-700">
                                      {row.removalReasonCode}
                                    </span>
                                  ) : null}
                                </li>
                              ))}
                            </ul>
                          ) : null}
                          <p className="text-xs text-orange-800 mt-2 font-medium leading-4">
                            The preview below already shows the final resolved timeline after these stops are removed.
                          </p>
                          {import.meta.env.DEV && resolvedRemovalTimelineLeak && (
                            <p className="text-xs text-red-700 mt-2 font-semibold leading-4">
                              BUG: resolved-removal timeline still contains planned removals.
                            </p>
                          )}
                        </div>
                      )}

                      {effectivePreviewTimeline.map((seg, idx: number) => {
                        const isUserSelected = seg?.isUserSelectedPreview === true;
                        const isConflictSegment = seg?.isConflict === true;
                        const selectedId = Number(seg?.selectedHotspotId || seg?.locationId || 0);
                        const hotspotId = Number(seg?.locationId || seg?.hotspot_ID || seg?.hotspotId || selectedId || 0);
                        const selectedPreviewHotspotMeta = previewHotspotMetaById.get(Number(selectedHotspotId || 0)) || null;
                        const hotspotMeta = previewHotspotMetaById.get(hotspotId) || selectedPreviewHotspotMeta || null;
                        const activityVisitTime = isConflictSegment
                          ? 'Needs reschedule'
                          : (seg?.visitTime || seg?.timeRange || hotspotMeta?.visitTime || null);
                        const activityDuration = seg?.duration || hotspotMeta?.duration || null;
                        const activityTimings = seg?.timings || hotspotMeta?.timings || null;
                        const activityPriority = Number.isFinite(Number(seg?.priority))
                          ? Number(seg.priority)
                          : (Number.isFinite(Number(hotspotMeta?.priority)) ? Number(hotspotMeta?.priority) : null);
                        
                        // ✅ FIX: Manual hotspots should display as "Manual / P4", never P0
                        const computedPriorityLabel = (): string | null => {
                          const isManual = seg?.planOwnWay === true || seg?.isManual === true;
                          const priority = activityPriority;

                          if (isManual) {
                            return "Manual / P4";
                          }

                          if (priority !== null && priority > 0) {
                            return `P${priority}`;
                          }

                          return null;
                        };

                        const priorityLabel = computedPriorityLabel();
                        const previewRouteId = Number(addHotspotModal.routeId || 0);
                        const hotelMetaForDay = selectedHotelMetaByRoute.get(previewRouteId);
                        const actualHotelName = String(
                          hotelMetaForDay?.hotelName
                          || seg?.hotelName
                          || seg?.toName
                          || seg?.to
                          || 'Hotel'
                        ).trim();

                        // ✅ FIX: Handle waiting/break synthetic segments
                        const isWaitingSegment = seg?.type === 'waiting' || seg?.isSyntheticWaiting === true;
                        const travelToLabel = String(
                          seg?.toName
                          || seg?.displayToName
                          || seg?.to
                          || extractTravelToFromText(seg?.text || seg?.name)
                          || '',
                        ).trim();
                        const resolvedTravelToLabel = /\bhotel\b/i.test(travelToLabel)
                          ? (destinationHotelDisplayName || actualHotelName || travelToLabel)
                          : travelToLabel;
                        const displaySegmentText = String(seg?.type || '').toLowerCase() === 'travel'
                          ? (resolvedTravelToLabel ? `Travel to ${resolvedTravelToLabel}` : (seg?.text || seg?.name || 'Travel'))
                          : (seg?.text || seg?.name || '');

                        // ✅ FIX: Handle hotel check-in zero-duration segments
                        const isZeroDurationHotel = seg?.isZeroDurationHotel === true ||
                          (seg?.type === 'hotel' && seg?.timeRange && seg.timeRange.split(' - ').length === 2 &&
                           seg.timeRange.split(' - ')[0].trim() === seg.timeRange.split(' - ')[1].trim());

                        const getTimeRangeDurationMinutes = (range: string): number | null => {
                          const start = parseDisplayMinutes(range, 'start');
                          const end = parseDisplayMinutes(range, 'end');
                          if (start == null || end == null) return null;
                          let delta = end - start;
                          if (delta < 0) delta += 24 * 60;
                          return delta > 0 ? delta : null;
                        };
                        const parseDurationMinutesText = (value: unknown): number | null => {
                          const raw = String(value || '').trim();
                          if (!raw) return null;
                          const h = raw.match(/(\d+)\s*(?:hour|hours|hr|hrs|h)/i);
                          const m = raw.match(/(\d+)\s*(?:min|mins|m)/i);
                          if (!h && !m) return null;
                          const total = (h ? Number(h[1]) * 60 : 0) + (m ? Number(m[1]) : 0);
                          return Number.isFinite(total) && total > 0 ? total : null;
                        };

                        const timingOverride = (() => {
                          const currentType = String(seg?.type || '').toLowerCase();
                          if (currentType !== 'travel' && currentType !== 'hotel') return null;

                          let conflictIdx = -1;
                          for (let p = idx - 1; p >= 0; p -= 1) {
                            const cand = effectivePreviewTimeline[p];
                            if (cand?.isConflict === true && String(cand?.type || '').toLowerCase() === 'attraction') {
                              conflictIdx = p;
                              break;
                            }
                          }
                          if (conflictIdx < 0) return null;

                          const conflictSeg = effectivePreviewTimeline[conflictIdx];

                          let prevTravelForConflict: any = null;
                          for (let p = conflictIdx - 1; p >= 0; p -= 1) {
                            const cand = effectivePreviewTimeline[p];
                            if (String(cand?.type || '').toLowerCase() === 'travel' && String(cand?.timeRange || '').trim()) {
                              prevTravelForConflict = cand;
                              break;
                            }
                          }
                          const arrivalMinutes = parseDisplayMinutes(String(prevTravelForConflict?.timeRange || ''), 'end');

                          const conflictHotspotId = Number(
                            conflictSeg?.locationId
                            || conflictSeg?.hotspot_ID
                            || conflictSeg?.hotspotId
                            || conflictSeg?.selectedHotspotId
                            || selectedHotspotId
                            || 0
                          );
                          const conflictHotspotMeta = previewHotspotMetaById.get(conflictHotspotId)
                            || previewHotspotMetaById.get(Number(selectedHotspotId || 0))
                            || null;
                          const conflictDurationText = conflictSeg?.duration || conflictHotspotMeta?.duration || null;
                          const stayMinutes = parseDurationMinutesText(conflictDurationText)
                            ?? (() => {
                              const fallback = Number(
                                conflictSeg?.durationMin
                                ?? conflictSeg?.matrixFit?.insertedStopDurationMin
                                ?? conflictSeg?.matrixFit?.stopDurationMin
                                ?? conflictSeg?.matrixFit?.visitDurationMin
                                ?? conflictSeg?.matrixFit?.attractionDurationMin
                                ?? 0
                              );
                              return Number.isFinite(fallback) && fallback > 0 ? Math.max(1, Math.round(fallback)) : null;
                            })();

                          if (arrivalMinutes == null || stayMinutes == null) return null;
                          const leaveMinutes = arrivalMinutes + stayMinutes;

                          let firstTravelIdx = -1;
                          for (let n = conflictIdx + 1; n < effectivePreviewTimeline.length; n += 1) {
                            const cand = effectivePreviewTimeline[n];
                            if (String(cand?.type || '').toLowerCase() === 'travel' && String(cand?.timeRange || '').trim()) {
                              firstTravelIdx = n;
                              break;
                            }
                          }
                          if (firstTravelIdx < 0) return null;

                          const firstTravelSeg = effectivePreviewTimeline[firstTravelIdx];
                          const firstTravelStart = parseDisplayMinutes(String(firstTravelSeg?.timeRange || ''), 'start');
                          const firstTravelDuration = getTimeRangeDurationMinutes(String(firstTravelSeg?.timeRange || ''));
                          if (firstTravelStart == null || firstTravelDuration == null || leaveMinutes <= firstTravelStart) {
                            return null;
                          }
                          const firstTravelNewStart = leaveMinutes;
                          const firstTravelNewEnd = firstTravelNewStart + firstTravelDuration;

                          if (currentType === 'travel' && idx === firstTravelIdx) {
                            return {
                              timeRange: `${formatMinutesToDisplay(firstTravelNewStart)} - ${formatMinutesToDisplay(firstTravelNewEnd)}`,
                            };
                          }

                          if (currentType === 'hotel') {
                            let firstHotelIdx = -1;
                            for (let n = firstTravelIdx + 1; n < effectivePreviewTimeline.length; n += 1) {
                              const cand = effectivePreviewTimeline[n];
                              if (String(cand?.type || '').toLowerCase() === 'hotel') {
                                firstHotelIdx = n;
                                break;
                              }
                            }
                            if (firstHotelIdx === idx) {
                              const newCheckIn = formatMinutesToDisplay(firstTravelNewEnd);
                              return {
                                timeRange: `${newCheckIn} - ${newCheckIn}`,
                              };
                            }
                          }

                          return null;
                        })();

                        const normalizedMatrixDurationMin = seg?.isMatrixSplitTravel === true
                          ? normalizeDurationAgainstDistance(seg?.matrixDistanceKm, seg?.matrixDurationMin)
                          : null;
                        const matrixStartMinutes = seg?.isMatrixSplitTravel === true
                          ? parseDisplayMinutes(seg?.timeRange, 'start')
                          : null;
                        const matrixEndMinutes = seg?.isMatrixSplitTravel === true
                          ? parseDisplayMinutes(seg?.timeRange, 'end')
                          : null;
                        const matrixHasRange = matrixStartMinutes !== null && matrixEndMinutes !== null && matrixEndMinutes >= matrixStartMinutes;
                        const matrixRangeDuration = matrixHasRange ? Math.max(1, matrixEndMinutes - matrixStartMinutes) : null;
                        const effectiveSegTimeRangeRaw = seg?.isMatrixSplitTravel === true
                          && normalizedMatrixDurationMin !== null
                          && matrixStartMinutes !== null
                          && matrixRangeDuration !== null
                          && matrixRangeDuration !== normalizedMatrixDurationMin
                          ? `${formatMinutesToDisplay(matrixStartMinutes)} - ${formatMinutesToDisplay(matrixStartMinutes + normalizedMatrixDurationMin)}`
                          : (timingOverride?.timeRange || seg?.timeRange || '--');
                        const effectiveSegTimeRange = isConflictSegment && String(seg?.type || '').toLowerCase() === 'attraction'
                          ? 'Needs reschedule'
                          : effectiveSegTimeRangeRaw;
                        const isTravelSegment = String(seg?.type || '').toLowerCase() === 'travel';
                        const previewTravelDistanceLabel = (() => {
                          if (!isTravelSegment) return '';

                          const rawDistance = String(seg?.distance || seg?.hotspot_travelling_distance || '').trim();
                          if (rawDistance && rawDistance !== '--') {
                            return /km/i.test(rawDistance) ? rawDistance : `${rawDistance} KM`;
                          }

                          const numericDistance = [
                            Number(seg?.matrixDistanceKm || 0),
                            Number(seg?.distanceKm || 0),
                            Number(seg?.travelDistanceKm || 0),
                          ].find((value) => Number.isFinite(value) && value > 0) || 0;

                          return numericDistance > 0 ? `${numericDistance.toFixed(2)} KM` : '';
                        })();
                        const previewTravelDurationLabel = (() => {
                          if (!isTravelSegment) return '';
                          if (String(seg?.duration || '').trim()) return String(seg.duration).trim();
                          if (normalizedMatrixDurationMin != null) {
                            return `${Math.max(1, Math.round(Number(normalizedMatrixDurationMin)))} Min`;
                          }
                          return '';
                        })();
                        const selectedSlotFitTypeUpper = String(
                          effectiveFitSlot?.routeFitType
                          || seg?.matrixFit?.routeFitType
                          || ''
                        ).toUpperCase();
                        const selectedSlotLabelText = String(
                          effectiveFitSlot?.displayLabel
                          || effectiveFitSlot?.label
                          || seg?.matrixFit?.displayLabel
                          || seg?.matrixFit?.label
                          || ''
                        ).toLowerCase();
                        const selectedSlotFinalReasonText = String(
                          effectiveFitSlot?.finalDecisionReason
                          || seg?.matrixFit?.finalDecisionReason
                          || ''
                        ).toLowerCase();
                        const selectedSlotNoRouteTagged = selectedSlotLabelText.includes('no route data')
                          || selectedSlotFinalReasonText.includes('no route data')
                          || selectedSlotLabelText.includes('route data unavailable')
                          || selectedSlotFinalReasonText.includes('route-fit data unavailable');
                        const selectedSlotRouteFitStatus = String(
                          (effectiveFitSlot as any)?.routeFitStatus
                          || (seg?.matrixFit as any)?.routeFitStatus
                          || selectedSlotFitTypeUpper
                          || ''
                        ).toUpperCase();
                        const selectedSlotMetricsSource = String(
                          (effectiveFitSlot as any)?.routeMetrics?.source
                          || (seg?.matrixFit as any)?.routeMetrics?.source
                          || 'NONE'
                        ).toUpperCase();
                        const shouldSuppressRouteMetrics = (
                          selectedSlotNoRouteTagged
                          || selectedSlotFitTypeUpper === 'UNKNOWN'
                          || selectedSlotFitTypeUpper === 'MATRIX_UNAVAILABLE'
                          || selectedSlotRouteFitStatus === 'NO_ROUTE_DATA'
                          || selectedSlotRouteFitStatus === 'MATRIX_UNAVAILABLE'
                          || selectedSlotMetricsSource !== 'MATRIX_CACHE'
                        );
                        const selectedSlotHasRouteData = (
                          (!selectedSlotFitTypeUpper || (
                            selectedSlotFitTypeUpper !== 'UNKNOWN'
                            && selectedSlotFitTypeUpper !== 'MATRIX_UNAVAILABLE'
                          ))
                          && ((effectiveFitSlot as any)?.routePossible ?? seg?.matrixFit?.routePossible) !== false
                          && !shouldSuppressRouteMetrics
                        );

                        // If waiting segment, render a distinct waiting block
                        if (isWaitingSegment) {
                          return (
                            <div
                              key={`${idx}-waiting`}
                              className="p-3 rounded-lg border-2 border-orange-200 bg-orange-50 transition-all"
                            >
                              <div className="flex justify-between items-start mb-1 gap-2">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded uppercase bg-orange-200 text-orange-800">
                                    ⏳ waiting
                                  </span>
                                  <span className="text-xs font-bold text-[#4a4260]">
                                    {effectiveSegTimeRange}
                                  </span>
                                </div>
                              </div>
                              <p className="text-sm font-bold text-orange-700">{seg?.text || 'Waiting'}</p>
                              {seg?.reason && (
                                <p className="text-xs text-orange-600 mt-1">{seg.reason}</p>
                              )}
                              {seg?.gapMinutes > 0 && (
                                <p className="text-xs text-orange-500 mt-1">
                                  Gap: {Math.floor(seg.gapMinutes / 60) > 0 ? `${Math.floor(seg.gapMinutes / 60)}h ` : ''}{seg.gapMinutes % 60}min
                                </p>
                              )}
                            </div>
                          );
                        }

                        return (
                          <div
                            key={`${idx}-${seg?.type}-${seg?.text || ''}`}
                            data-selected={isUserSelected ? "true" : "false"}
                            className={`p-3 rounded-lg border-2 transition-all ${seg?.isConflict
                                ? 'bg-red-50 border-red-300 shadow-sm'
                                : isUserSelected
                                  ? 'bg-green-50 border-green-500 ring-2 ring-green-200 shadow-md scale-[1.02]'
                                  : 'bg-gray-50 border-gray-200 opacity-90'
                              }`}
                          >
                            <div className="flex justify-between items-start mb-1 gap-2">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded uppercase ${seg?.type === 'travel' ? 'bg-blue-100 text-blue-700'
                                    : seg?.type === 'attraction' ? 'bg-green-100 text-green-700'
                                      : 'bg-gray-200 text-gray-700'
                                  }`}>
                                  {seg?.type || 'item'}
                                </span>
                                <span className="text-xs font-bold text-[#4a4260]">
                                  {effectiveSegTimeRange}
                                </span>
                              </div>

                              <div className="flex items-center gap-2">
                                {seg?.isConflict ? (
                                  <span className="flex items-center gap-1 text-[10px] font-bold text-red-600 uppercase bg-red-100 px-2 py-0.5 rounded">
                                    <AlertTriangle className="h-3 w-3" />
                                    Conflict
                                  </span>
                                ) : isUserSelected ? (
                                  <span className="flex items-center gap-1 text-[10px] font-bold text-green-600 uppercase bg-green-100 px-2 py-0.5 rounded">
                                    <Plus className="h-3 w-3" />
                                    New
                                  </span>
                                ) : null}

                                {isUserSelected && selectedId > 0 && (
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="h-6 px-2 text-red-600 hover:text-red-700 hover:bg-red-50"
                                    onClick={() => handleRemovePreviewHotspot(selectedId)}
                                  >
                                    <Trash2 className="h-3 w-3 mr-1" />
                                    Remove
                                  </Button>
                                )}
                              </div>
                            </div>

                            <p className={`text-sm font-bold ${isUserSelected ? 'text-green-800' : 'text-[#4a4260]'}`}>
                              {/* ✅ FIX: Hotel zero-duration shows check-in label, not "Hotel Stay 8:00 PM - 8:00 PM" */}
                              {isZeroDurationHotel ? (
                                <>Check-in at {actualHotelName} <span className="text-purple-600">{effectiveSegTimeRange?.split(' - ')[0]}</span></>
                              ) : (
                                displaySegmentText
                              )}
                            </p>

                            {isTravelSegment && (
                              <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[#6c6c6c]">
                                <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{effectiveSegTimeRange}</span>
                                {previewTravelDistanceLabel && (
                                  <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{previewTravelDistanceLabel}</span>
                                )}
                                {previewTravelDurationLabel && (
                                  <span className="flex items-center gap-1">⏱ {previewTravelDurationLabel}</span>
                                )}
                              </div>
                            )}

                            {/* Display distance and duration for matrix split travel rows */}
                            {seg?.isMatrixSplitTravel === true && (
                              <div className="mt-2 text-xs text-gray-600 space-y-0.5">
                                {(seg?.fromName || seg?.toName) && (
                                  <p>Route leg: {seg?.fromName || 'A'} → {seg?.toName || 'B'}</p>
                                )}
                                {seg?.matrixDistanceKm != null && (
                                  <p>Distance: {Number(seg.matrixDistanceKm).toFixed(1)} km</p>
                                )}
                                {normalizedMatrixDurationMin != null && (
                                  <p>Duration: {Math.max(1, Math.round(Number(normalizedMatrixDurationMin)))} min</p>
                                )}
                              </div>
                            )}

                            {isUserSelected && String(seg?.type || '').toLowerCase() === 'attraction' && (
                              <div className="mt-3 space-y-2">
                                {/* ── manualInsertionFit: Best slot panel ── */}
                                {!matrixRequiresBuild && effectiveFitSlot && (
                                  <div className="border border-blue-200 bg-blue-50 p-3 rounded-lg text-sm">
                                    <p className="font-bold text-blue-900 text-[11px] mb-1.5 uppercase tracking-wide">Best insertion slot</p>
                                    <div className="flex items-start gap-2">
                                      <div className="flex-1 min-w-0">
                                        <p className="text-xs font-semibold text-gray-800 truncate">
                                          {effectiveFitSlot.fromName} → {((
                                            /^hotel$/i.test(String(effectiveFitSlot.toName || '').trim())
                                            || (
                                              String((matrixFit as any)?.destinationHotelName || '').trim().length > 0
                                              && String(effectiveFitSlot.toName || '').trim().toLowerCase() === String((matrixFit as any)?.destinationHotelName || '').trim().toLowerCase()
                                            )
                                            || Number((effectiveFitSlot as any)?.destinationHotelId || 0) > 0
                                          ) && destinationHotelDisplayName) ? destinationHotelDisplayName : effectiveFitSlot.toName}
                                        </p>
                                        {selectedSlotHasRouteData && effectiveFitSlot.roadDetourKm != null && (
                                          <p className="text-[10px] text-gray-600 mt-0.5">
                                            Extra distance: +{Number(effectiveFitSlot.roadDetourKm).toFixed(1)} km
                                          </p>
                                        )}
                                        {effectiveFitSlot.finalDecisionReason && (
                                          <p className="text-[10px] text-gray-500 mt-0.5 italic">Final reason: {effectiveFitSlot.finalDecisionReason}</p>
                                        )}
                                        {!effectiveFitSlot.finalDecisionReason && effectiveFitSlot.decisionReason && (
                                          <p className="text-[10px] text-gray-500 mt-0.5 italic">{effectiveFitSlot.decisionReason}</p>
                                        )}
                                      </div>
                                      <span className={`flex-shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full ${routeFitBadgeClass(effectiveFitSlot.routeFitType)}`}>
                                        {effectiveFitSlot.displayLabel || effectiveFitSlot.label}
                                      </span>
                                    </div>
                                    {effectiveFitSlot?.distanceComparisonNote && (
                                      <p className="text-[10px] text-blue-700 mt-1">Note: {effectiveFitSlot.distanceComparisonNote}</p>
                                    )}
                                    {/* Requested slot if different */}
                                    {matrixFit?.requestedSlot && matrixFit.requestedSlot.routeFitType === 'MATRIX_UNAVAILABLE' && (
                                      <div className="mt-2 pt-2 border-t border-blue-200">
                                        <p className="text-[10px] font-semibold text-gray-500 mb-0.5">Requested slot:</p>
                                        <p className="text-[10px] text-gray-600">
                                          {matrixFit.requestedSlot.fromName} → {((
                                            /^hotel$/i.test(String(matrixFit.requestedSlot.toName || '').trim())
                                            || (
                                              String((matrixFit as any)?.destinationHotelName || '').trim().length > 0
                                              && String(matrixFit.requestedSlot.toName || '').trim().toLowerCase() === String((matrixFit as any)?.destinationHotelName || '').trim().toLowerCase()
                                            )
                                            || Number((matrixFit.requestedSlot as any)?.destinationHotelId || 0) > 0
                                          ) && destinationHotelDisplayName) ? destinationHotelDisplayName : matrixFit.requestedSlot.toName}
                                        </p>
                                        <span className="text-[10px] text-gray-400 italic">{matrixFit.requestedSlot.label}</span>
                                      </div>
                                    )}
                                    {matrixFit?.warning && (
                                      <p className="mt-1.5 text-[10px] text-amber-700 bg-amber-50 rounded px-2 py-1">
                                        ⚠ {matrixFit.warning}
                                      </p>
                                    )}
                                  </div>
                                )}

                                {/* Inserted hotspot route summary */}
                                {seg?.matrixFit?.routeLegSummary && selectedSlotHasRouteData && (
                                  <div className="border border-emerald-200 bg-emerald-50 p-3 rounded-lg text-xs text-emerald-900 space-y-1">
                                    <p className="font-semibold">Route summary:</p>
                                    <p>
                                      {effectiveFitSlot?.fromName || seg?.matrixFit?.fromName || 'A'} → {seg?.text || seg?.name || 'Inserted hotspot'}:{' '}
                                      {seg?.matrixFit?.routeLegSummary?.acDistanceKm != null ? `${Number(seg.matrixFit.routeLegSummary.acDistanceKm).toFixed(1)} km` : '--'}
                                      {' / '}
                                      {seg?.matrixFit?.routeLegSummary?.acDurationMin != null ? `${Math.max(1, Math.round(Number(seg.matrixFit.routeLegSummary.acDurationMin)))} min` : '--'}
                                    </p>
                                    <p>
                                      {seg?.text || seg?.name || 'Inserted hotspot'} → {((
                                        /^hotel$/i.test(String(effectiveFitSlot?.toName || seg?.matrixFit?.toName || '').trim())
                                        || (
                                          String((matrixFit as any)?.destinationHotelName || '').trim().length > 0
                                          && String(effectiveFitSlot?.toName || seg?.matrixFit?.toName || '').trim().toLowerCase() === String((matrixFit as any)?.destinationHotelName || '').trim().toLowerCase()
                                        )
                                        || Number((effectiveFitSlot as any)?.destinationHotelId || 0) > 0
                                      ) && destinationHotelDisplayName)
                                        ? destinationHotelDisplayName
                                        : (effectiveFitSlot?.toName || seg?.matrixFit?.toName || 'B')}:{' '}
                                      {seg?.matrixFit?.routeLegSummary?.cbDistanceKm != null ? `${Number(seg.matrixFit.routeLegSummary.cbDistanceKm).toFixed(1)} km` : '--'}
                                      {' / '}
                                      {seg?.matrixFit?.routeLegSummary?.cbDurationMin != null ? `${Math.max(1, Math.round(Number(seg.matrixFit.routeLegSummary.cbDurationMin)))} min` : '--'}
                                    </p>
                                    <p>
                                      Via total: {seg?.matrixFit?.routeLegSummary?.viaDistanceKm != null ? `${Number(seg.matrixFit.routeLegSummary.viaDistanceKm).toFixed(1)} km` : '--'}
                                    </p>
                                    <p>
                                      Direct: {seg?.matrixFit?.routeLegSummary?.directDistanceKm != null ? `${Number(seg.matrixFit.routeLegSummary.directDistanceKm).toFixed(1)} km` : '--'}
                                    </p>
                                    <p>
                                      Extra: +{seg?.matrixFit?.routeLegSummary?.extraDistanceKm != null ? Number(Math.max(0, Number(seg.matrixFit.routeLegSummary.extraDistanceKm))).toFixed(1) : '--'} km
                                    </p>
                                    {seg?.matrixFit?.distanceComparisonNote && (
                                      <p className="text-emerald-800">Note: {seg.matrixFit.distanceComparisonNote}</p>
                                    )}
                                  </div>
                                )}

                                {/* Show all insertion slots */}
                                {normalizedInsertionSlots.length > 0 && (
                                  <div className="border border-purple-200 bg-purple-50 p-3 rounded-lg text-sm space-y-2">
                                    <p className="font-bold text-purple-900 text-xs">
                                      All insertion attempts ({normalizedInsertionSlots.length}):
                                    </p>
                                    {normalizedInsertionSlots.map((slotOption, slotIdx: number) => {
                                      const isBest = slotOption?.selectedAsBest === true || slotOption?.isBest === true;
                                      const fits = slotOption?.fitsOverall !== false;
                                      const routeFitTypeUpper = String(slotOption?.routeFitType || '').toUpperCase();
                                      const routeFitStatusUpper = String(slotOption?.routeFitStatus || routeFitTypeUpper || '').toUpperCase();
                                      const slotLabelText = String(slotOption?.displayLabel || slotOption?.label || '').toLowerCase();
                                      const slotFinalReasonText = String(slotOption?.finalDecisionReason || '').toLowerCase();
                                      const slotNoRouteTagged = slotLabelText.includes('no route data')
                                        || slotFinalReasonText.includes('no route data')
                                        || slotLabelText.includes('route data unavailable')
                                        || slotFinalReasonText.includes('route-fit data unavailable');
                                      const routeMetricsSource = String(slotOption?.routeMetrics?.source || 'NONE').toUpperCase();
                                      const slotHasRouteData = (
                                        slotOption?.routePossible !== false
                                        && routeFitTypeUpper !== 'UNKNOWN'
                                        && routeFitTypeUpper !== 'MATRIX_UNAVAILABLE'
                                        && routeFitStatusUpper !== 'NO_ROUTE_DATA'
                                        && routeFitStatusUpper !== 'MATRIX_UNAVAILABLE'
                                        && routeMetricsSource === 'MATRIX_CACHE'
                                        && !slotNoRouteTagged
                                      );
                                      const fitLabel: string = slotOption.displayLabel || slotOption.routeFitLabel || slotOption.label || slotOption.routeFitType || (fits ? 'On route' : 'Off route');
                                      const badgeClass: string = routeFitBadgeClass(slotOption.routeFitType);

                                      const detourKm: number | null = slotOption?.roadDetourKm != null
                                        ? Number(slotOption.roadDetourKm)
                                        : (slotOption?.distanceDelta != null ? Number(slotOption.distanceDelta) : null);
                                      const displayDetourKm: number | null = detourKm != null
                                        ? Math.max(0, Number.isFinite(detourKm) ? detourKm : 0)
                                        : null;
                                      const abKm: number | null = slotOption?.abOsrmDistanceKm != null
                                        ? Number(slotOption.abOsrmDistanceKm)
                                        : null;
                                      const viaKm: number | null = slotOption?.insertedRouteDistanceKm != null
                                        ? Number(slotOption.insertedRouteDistanceKm)
                                        : null;
                                      const showDistanceBreakdown = slotHasRouteData && (abKm != null || viaKm != null || detourKm != null);
                                      const showBestBadge = isBest && slotHasRouteData;

                                      return (
                                        <div
                                          key={slotIdx}
                                          className={`rounded-lg border px-3 py-2 ${
                                            isBest
                                              ? 'border-green-400 bg-green-50'
                                              : fits
                                                ? 'border-gray-200 bg-white'
                                                : 'border-red-200 bg-red-50 opacity-80'
                                          }`}
                                        >
                                          {/* Slot header */}
                                          <div className="flex items-start justify-between gap-2">
                                            <span className={`text-xs font-semibold flex-1 truncate ${isBest ? 'text-green-800' : 'text-gray-800'}`}>
                                              {isBest ? '⭐ ' : `${slotIdx + 1}. `}
                                              {slotOption?.fromName} → {((
                                                /^hotel$/i.test(String(slotOption?.toName || '').trim())
                                                || (
                                                  String((matrixFit as any)?.destinationHotelName || '').trim().length > 0
                                                  && String(slotOption?.toName || '').trim().toLowerCase() === String((matrixFit as any)?.destinationHotelName || '').trim().toLowerCase()
                                                )
                                                || Number((slotOption as any)?.destinationHotelId || 0) > 0
                                              ) && destinationHotelDisplayName) ? destinationHotelDisplayName : slotOption?.toName}
                                            </span>
                                            <span className={`flex-shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full ${badgeClass}`}>
                                              {fitLabel}
                                            </span>
                                          </div>

                                          {showDistanceBreakdown && (
                                            <div className="mt-1.5 grid grid-cols-3 gap-x-2 text-[10px] text-gray-600 bg-gray-50 rounded px-2 py-1">
                                              {abKm != null && (
                                                <div>
                                                  <span className="block text-gray-400">A→B direct</span>
                                                  <span className="font-semibold text-gray-700">{abKm.toFixed(1)} km</span>
                                                </div>
                                              )}
                                              {viaKm != null && (
                                                <div>
                                                  <span className="block text-gray-400">Via hotspot</span>
                                                  <span className="font-semibold text-gray-700">{viaKm.toFixed(1)} km</span>
                                                </div>
                                              )}
                                              {displayDetourKm != null && (
                                                <div>
                                                  <span className="block text-gray-400">Extra</span>
                                                  <span className={`font-bold ${displayDetourKm <= 0.5 ? 'text-green-600' : displayDetourKm <= 5 ? 'text-yellow-700' : 'text-red-600'}`}>
                                                    +{displayDetourKm.toFixed(1)} km
                                                  </span>
                                                </div>
                                              )}
                                            </div>
                                          )}

                                          {slotHasRouteData && slotOption?.distanceComparisonNote && (
                                            <p className="mt-0.5 text-[10px] text-blue-700">Note: {slotOption.distanceComparisonNote}</p>
                                          )}

                                          {/* Decision reason */}
                                          {slotOption?.routeDecisionReason && (
                                            <p className="mt-0.5 text-[10px] text-gray-500 italic">{slotOption.routeDecisionReason}</p>
                                          )}

                                          {slotOption?.timingDecisionReason && (
                                            <p className="mt-0.5 text-[10px] text-gray-500 italic">Timing reason: {slotOption.timingDecisionReason}</p>
                                          )}

                                          {slotOption?.finalDecisionReason && (
                                            <p className={`mt-0.5 text-[10px] italic ${showBestBadge ? 'text-green-700' : 'text-gray-700'}`}>
                                              {showBestBadge ? 'Final reason: ' : 'Why not selected: '}
                                              {slotOption.finalDecisionReason}
                                            </p>
                                          )}

                                          {!slotOption?.prioritySafe && slotOption?.priorityDecisionReason && (
                                            <p className="mt-0.5 text-[10px] text-red-700 italic">Priority reason: {slotOption.priorityDecisionReason}</p>
                                          )}

                                          {/* Best badge */}
                                          {showBestBadge && (
                                            <p className="mt-1 text-[10px] font-semibold text-green-700">✓ Best available slot</p>
                                          )}
                                        </div>
                                      );
                                    })}
                                  </div>
                                )}

                                {/* Show current insertion status on the inserted hotspot row */}
                                <div className="flex flex-wrap items-center gap-2">
                                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full uppercase bg-green-100 text-green-700">
                                    Inserted hotspot
                                  </span>
                                  {!matrixRequiresBuild && activeAnchorFitInsight?.label && (
                                    <span
                                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                        activeAnchorFitInsight.tone === 'green'
                                          ? 'bg-green-100 text-green-700'
                                          : activeAnchorFitInsight.tone === 'red'
                                            ? 'bg-red-100 text-red-700'
                                            : 'bg-amber-100 text-amber-700'
                                      }`}
                                    >
                                      {activeAnchorFitInsight.insertedLabel || activeAnchorFitInsight.label}
                                    </span>
                                  )}
                                  {!matrixRequiresBuild && activeAnchorFitInsight?.anchorLegLabel && (
                                    <span className="text-[10px] text-gray-500">
                                      Between: {activeAnchorFitInsight.anchorLegLabel}
                                    </span>
                                  )}
                                  {selectedSlotHasRouteData && activeAnchorFitInsight?.extraDistanceLabel && (
                                    <span className="text-[11px] font-semibold text-[#4a4260]">
                                      Extra distance: {activeAnchorFitInsight.extraDistanceLabel}
                                    </span>
                                  )}
                                  {selectedSlotHasRouteData && String(effectiveSegTimeRange || '').trim() && (
                                    <span className="text-[11px] font-semibold text-[#4a4260]">
                                      Timing: {String(effectiveSegTimeRange || '').trim()}
                                    </span>
                                  )}
                                  {(activeAnchorFitInsight as any)?.reason && (
                                    <span className="w-full text-[10px] text-gray-500 italic">{(activeAnchorFitInsight as any).reason}</span>
                                  )}
                                </div>

                                {/* Reschedule Priority Confirmation — shown inline inside the selected card */}
                                {pendingPriorityReplacementHotspotId && (
                                  <div ref={priorityConfirmRef} className="mt-3 p-3 rounded-xl border border-red-200 bg-red-50">
                                    {(() => {
                                      const p3Rows = Array.isArray((pendingPriorityResolution as any)?.p3HotspotsToRemove)
                                        ? (pendingPriorityResolution as any).p3HotspotsToRemove
                                        : [];
                                      const removedPriorityRows = Array.isArray(pendingPriorityResolution?.removedTopPriorityHotspots)
                                        ? pendingPriorityResolution.removedTopPriorityHotspots
                                        : [];
                                      const affectedPriorityRows = Array.isArray(pendingPriorityResolution?.topPriorityAffected)
                                        ? pendingPriorityResolution.topPriorityAffected
                                        : [];
                                      const sourceRows = p3Rows.length > 0
                                        ? p3Rows
                                        : (removedPriorityRows.length > 0 ? removedPriorityRows : affectedPriorityRows);
                                      const affectedPriorityHotspots = sourceRows
                                        .map((row) => {
                                          const id = Number(row?.id ?? row?.hotspotId ?? row?.hotspot_id ?? 0);
                                          const name = String(row?.name || row?.hotspot_name || row?.hotspotName || '').trim();
                                          if (name) return name;
                                          if (id > 0) return `Hotspot #${id}`;
                                          return '';
                                        })
                                        .filter(Boolean);
                                      const affectedPriorityLabel = affectedPriorityHotspots.length > 0
                                        ? affectedPriorityHotspots.join(', ') : 'one or more priority hotspots';
                                      const pluralSuffix = affectedPriorityHotspots.length === 1 ? '' : 's';
                                      const removedPriorityRowsWithValues = sourceRows.map((row) => Number(
                                        row?.priority
                                        ?? row?.effectivePriority
                                        ?? row?.normalizedPriority
                                        ?? row?.rawPriority
                                        ?? 0,
                                      ));
                                      const isP3RemovalConfirmation = removedPriorityRowsWithValues.some((priority: number) => priority === 3)
                                        || pendingPriorityResolution?.requiresP3RemovalConfirmation === true;
                                      return (
                                        <div className="flex items-start gap-2 mb-3">
                                          <div className="h-7 w-7 rounded-full bg-red-100 text-red-600 flex items-center justify-center shrink-0 mt-0.5">
                                            <AlertTriangle className="h-3.5 w-3.5" />
                                          </div>
                                          <div className="min-w-0 flex-1">
                                            <p className="text-sm font-bold text-red-700">
                                              {isP3RemovalConfirmation ? `Remove P3 Hotspot${pluralSuffix} & Recalculate?` : `Reschedule Priority Hotspot${pluralSuffix}?`}
                                            </p>
                                            <p className="text-xs text-red-700 mt-1 leading-5">
                                              {isP3RemovalConfirmation
                                                ? (
                                                  <>
                                                    Adding this hotspot requires removing these P3 hotspot{pluralSuffix}:
                                                    <span className="font-semibold"> {affectedPriorityLabel}</span>.
                                                    {' '}After removal, the route will be recalculated automatically.
                                                  </>
                                                )
                                                : (
                                                  <>
                                                    Adding this hotspot requires moving these priority hotspot{pluralSuffix} from the current slot:
                                                    <span className="font-semibold"> {affectedPriorityLabel}</span>.
                                                    {' '}No hotspot is deleted. The timeline will be reshuffled and following items will be rescheduled.
                                                  </>
                                                )}
                                            </p>
                                          </div>
                                        </div>
                                      );
                                    })()}
                                    <div className="grid grid-cols-2 gap-2">
                                      <Button
                                        size="sm"
                                        className="w-full bg-red-600 hover:bg-red-700 text-white"
                                        onClick={handleConfirmPriorityReplacement}
                                        disabled={isPreviewingHotspotId === pendingPriorityReplacementHotspotId}
                                      >
                                        {(() => {
                                          const rows = Array.isArray(pendingPriorityResolution?.removedTopPriorityHotspots)
                                            ? pendingPriorityResolution.removedTopPriorityHotspots
                                            : [];
                                          const isP3RemovalConfirmation = rows.some((row) => Number(
                                            row?.priority
                                            ?? row?.effectivePriority
                                            ?? row?.normalizedPriority
                                            ?? row?.rawPriority
                                            ?? 0,
                                          ) === 3) || pendingPriorityResolution?.requiresP3RemovalConfirmation === true;
                                          return isP3RemovalConfirmation ? 'Remove P3 & Recalculate' : 'Confirm Reschedule';
                                        })()}
                                      </Button>
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        className="w-full border-gray-300 text-gray-700 bg-white hover:bg-gray-50"
                                        onClick={handleCancelPriorityReplacement}
                                        disabled={isPreviewingHotspotId === pendingPriorityReplacementHotspotId}
                                      >
                                        Cancel
                                      </Button>
                                    </div>
                                  </div>
                                )}
                              </div>
                            )}

                            {String(seg?.type || '').toLowerCase() === 'attraction' && (
                              <div className="mt-2 flex flex-wrap gap-3 text-xs text-[#6c6c6c]">
                                {priorityLabel !== null && (
                                  <span className="flex items-center font-bold text-indigo-700 bg-indigo-50 px-2 py-1 rounded border border-indigo-100">
                                    Priority: {priorityLabel}
                                  </span>
                                )}
                                {activityVisitTime && (
                                  <span className="flex items-center font-bold text-[#d546ab] bg-[#fdf6ff] px-2 py-1 rounded border border-[#f3e8ff]">
                                    <Clock className="h-3 w-3 mr-1" />
                                    {activityVisitTime}
                                  </span>
                                )}
                                {activityDuration && (
                                  <span className="flex items-center">
                                    <Clock className="h-3 w-3 mr-1" />
                                    {formatPreviewDuration(seg?.duration || seg?.hotspot_traveling_time || seg?.hotspot_duration || hotspotMeta?.duration)}
                                  </span>
                                )}
                                {activityTimings && (
                                  <span className="flex items-center">
                                    <Timer className="h-3 w-3 mr-1" />
                                    {activityTimings}
                                  </span>
                                )}
                              </div>
                            )}

                            {seg?.isConflict && (
                              <div className="mt-2 p-2 bg-white/50 rounded border border-red-100">
                                <p className="text-xs text-red-600 font-medium leading-tight">
                                  {/forced manual insertion after user confirmation/i.test(String(seg?.conflictReason || ''))
                                    ? 'Manual override confirmed. This stop will be included; exact timing may shift.'
                                    : seg?.conflictReason}
                                </p>
                                {(() => {
                                  const parseDurationMinutes = (value: unknown): number | null => {
                                    const raw = String(value || '').trim();
                                    if (!raw) return null;
                                    const h = raw.match(/(\d+)\s*(?:hour|hours|hr|hrs|h)/i);
                                    const m = raw.match(/(\d+)\s*(?:min|mins|m)/i);
                                    if (!h && !m) return null;
                                    const minutes = (h ? Number(h[1]) * 60 : 0) + (m ? Number(m[1]) : 0);
                                    return Number.isFinite(minutes) && minutes > 0 ? minutes : null;
                                  };
                                  const getTimeRangeDurationMinutes = (range: string): number | null => {
                                    const start = parseDisplayMinutes(range, 'start');
                                    const end = parseDisplayMinutes(range, 'end');
                                    if (start == null || end == null) return null;
                                    let delta = end - start;
                                    if (delta < 0) delta += 24 * 60;
                                    return delta > 0 ? delta : null;
                                  };
                                  const formatMinutesLabel = (minutes: number): string => {
                                    const safeMinutes = Math.max(1, Math.round(minutes));
                                    const hours = Math.floor(safeMinutes / 60);
                                    const mins = safeMinutes % 60;
                                    if (hours > 0 && mins > 0) return `${hours}h ${mins}m`;
                                    if (hours > 0) return `${hours}h`;
                                    return `${mins}m`;
                                  };

                                  const prevSeg = idx > 0 ? effectivePreviewTimeline[idx - 1] : null;
                                  const nextSeg = idx + 1 < effectivePreviewTimeline.length ? effectivePreviewTimeline[idx + 1] : null;
                                  const prevSegType = String(prevSeg?.type || '').toLowerCase();
                                  const nextSegType = String(nextSeg?.type || '').toLowerCase();

                                  let nearestPrevTravel: any = null;
                                  for (let p = idx - 1; p >= 0; p -= 1) {
                                    const cand = effectivePreviewTimeline[p];
                                    if (String(cand?.type || '').toLowerCase() === 'travel' && String(cand?.timeRange || '').trim()) {
                                      nearestPrevTravel = cand;
                                      break;
                                    }
                                  }

                                  let nearestNextTravel: any = null;
                                  for (let n = idx + 1; n < effectivePreviewTimeline.length; n += 1) {
                                    const cand = effectivePreviewTimeline[n];
                                    if (String(cand?.type || '').toLowerCase() === 'travel' && String(cand?.timeRange || '').trim()) {
                                      nearestNextTravel = cand;
                                      break;
                                    }
                                  }

                                  const arrivalMinutesFromPrev = (prevSegType === 'travel'
                                    ? parseDisplayMinutes(String(prevSeg?.timeRange || ''), 'end')
                                    : null)
                                    ?? parseDisplayMinutes(String(nearestPrevTravel?.timeRange || ''), 'end');
                                  const nextTravelStartMinutes = parseDisplayMinutes(
                                    String(nextSeg?.timeRange || nearestNextTravel?.timeRange || ''),
                                    'start'
                                  );

                                  const stayMinutesFromText = parseDurationMinutes(activityDuration);
                                  const stayMinutesFromMeta = Number(
                                    seg?.durationMin
                                    ?? seg?.matrixFit?.insertedStopDurationMin
                                    ?? seg?.matrixFit?.stopDurationMin
                                    ?? seg?.matrixFit?.visitDurationMin
                                    ?? seg?.matrixFit?.attractionDurationMin
                                    ?? 0
                                  );
                                  let stayMinutes = stayMinutesFromText
                                    ?? (Number.isFinite(stayMinutesFromMeta) && stayMinutesFromMeta > 0
                                      ? Math.max(1, Math.round(stayMinutesFromMeta))
                                      : null);
                                  if (stayMinutes == null && arrivalMinutesFromPrev != null && nextTravelStartMinutes != null && nextTravelStartMinutes > arrivalMinutesFromPrev) {
                                    stayMinutes = Math.max(1, Math.round(nextTravelStartMinutes - arrivalMinutesFromPrev));
                                  }

                                  let arrivalMinutes = arrivalMinutesFromPrev;
                                  if (arrivalMinutes == null && nextTravelStartMinutes != null && stayMinutes != null) {
                                    arrivalMinutes = nextTravelStartMinutes - stayMinutes;
                                  }

                                  const stayLabel =
                                    formatPreviewDuration(activityDuration)
                                    || (stayMinutes != null ? formatMinutesLabel(stayMinutes) : '');
                                  const departureMinutes = arrivalMinutes != null && stayMinutes != null
                                    ? arrivalMinutes + stayMinutes
                                    : null;

                                  const nextTravelTo = nextSegType === 'travel'
                                    ? String(nextSeg?.toName || nextSeg?.to || '').trim()
                                    : String(nearestNextTravel?.toName || nearestNextTravel?.to || '').trim();
                                  const nextTravelRange = nextSegType === 'travel'
                                    ? String(nextSeg?.timeRange || '').trim()
                                    : String(nearestNextTravel?.timeRange || '').trim();
                                  const nextTravelDurationMinutes = getTimeRangeDurationMinutes(nextTravelRange);
                                  const hasTravelTimingConflict = (
                                    departureMinutes != null
                                    && nextTravelStartMinutes != null
                                    && departureMinutes > nextTravelStartMinutes
                                  );
                                  const effectiveTravelStartMinutes = hasTravelTimingConflict
                                    ? departureMinutes
                                    : nextTravelStartMinutes;
                                  const effectiveTravelEndMinutes = (
                                    effectiveTravelStartMinutes != null
                                    && nextTravelDurationMinutes != null
                                  )
                                    ? effectiveTravelStartMinutes + nextTravelDurationMinutes
                                    : null;
                                  const effectiveTravelRange = (
                                    effectiveTravelStartMinutes != null
                                    && effectiveTravelEndMinutes != null
                                  )
                                    ? `${formatMinutesToDisplay(effectiveTravelStartMinutes)} - ${formatMinutesToDisplay(effectiveTravelEndMinutes)}`
                                    : nextTravelRange;

                                  if (arrivalMinutes == null && !stayLabel && !nextTravelTo && !nextTravelRange) {
                                    return null;
                                  }

                                  return (
                                    <div className="mt-1.5 space-y-1 text-[11px] text-red-700">
                                      <p>
                                        Proposed arrival after anchor travel:{' '}
                                        {arrivalMinutes != null ? formatMinutesToDisplay(arrivalMinutes) : 'before the next onward leg'}
                                      </p>
                                      <p>
                                        Planned stay at hotspot: {stayLabel || 'as configured for this hotspot'}
                                        {departureMinutes != null ? ` (leave around ${formatMinutesToDisplay(departureMinutes)})` : ''}
                                      </p>
                                      {(nextTravelTo || nextTravelRange) && (
                                        <p>
                                          Then travel to {nextTravelTo || 'hotel'}
                                          {effectiveTravelRange ? ` (${effectiveTravelRange})` : ''}
                                          {hasTravelTimingConflict ? ' after reschedule' : ''}
                                        </p>
                                      )}
                                    </div>
                                  );
                                })()}
                              </div>
                            )}
                          </div>
                        );
                      })}

                      <div className="pt-4 sticky bottom-0 bg-white">
                        {(() => {
                          const forceConflictMode =
                            (backendForceConflictState.canForceConflict || backendForceConflictState.finalConflictModeOnly)
                            && activePreviewValidation?.readyToApply === false
                            && activePreviewValidation?.requiresPriorityConfirmation !== true
                            && !matrixApplyBlocked;
                          const effectiveDecisionBlocked = confirmActionConfig.disabled && !forceConflictMode;
                          const blockForValidation =
                            activePreviewValidation?.readyToApply === false && !forceConflictMode;
                          if (isFitHereSelectionMode) {
                            return (
                              <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
                                <p className="font-bold">Choose exact position</p>
                                <p className="mt-1">
                                  Click a <b>Fit Here</b> button in the timeline above. We will calculate and confirm that exact position.
                                </p>
                              </div>
                            );
                          }
                          return (
                        <Button
                          className={`w-full text-white shadow-lg ${
                            forceConflictMode
                              ? 'bg-red-600 hover:bg-red-700'
                              : 'bg-green-600 hover:bg-green-700'
                          }`}
                          onClick={handleAddHotspot}
                          disabled={
                            isApplyingPreviewHotspot
                            || isBuildingMatrix
                            || !activePreviewHotspotId
                            || isCurrentPreviewAlreadyAdded
                            || matrixApplyBlocked
                            || effectiveDecisionBlocked
                            || blockForValidation
                          }
                        >
                          {isApplyingPreviewHotspot ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Adding Hotspot...
                            </>
                          ) : (
                            isCurrentPreviewAlreadyAdded
                              ? 'Added'
                              : isMatrixMissingBlockedState || matrixRequiresBuild
                                ? 'Build matrix from the warning box above'
                                : isMatrixBuiltButNoFeasibleSlot
                                  && !(
                                    isManualRelaxedRouteFitPolicy(manualPreviewState)
                                    || isManualRelaxedRouteFitPolicy(activePreviewResolution)
                                    || isManualRelaxedRouteFitPolicy(groupPreviewResolution)
                                  )
                                  ? 'Cannot Add - Off Route'
                                  : matrixApplyBlocked
                                    ? 'Cannot Apply'
                                    : activePreviewValidation?.requiresForceConfirmation === true
                                      ? 'Confirm Force Add (Opening / Timing Conflict)'
                                      : forceConflictMode
                                        ? 'Confirm Force Add (Conflict)'
                                      : confirmActionConfig.label
                          )}
                        </Button>
                          );
                        })()}
                      </div>
                    </>
                  ) : (
                    <div className="flex flex-col items-center justify-center h-32 text-[#6c6c6c] border-2 border-dashed rounded-lg">
                      <p className="text-sm">No timeline available for this route.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                previewRequestIdRef.current += 1;
                setAddHotspotModal({
                  open: false,
                  planId: null,
                  routeId: null,
                  locationId: null,
                  locationName: "",
                });
                setHotspotSearchQuery("");
                resetManualHotspotPreviewState();
                setActivePreviewHotspotId(null);
                setAddedInModalHotspotIds(new Set());
                setSelectedHotspotAnchor(null);
              }}
              disabled={isApplyingPreviewHotspot || isBuildingMatrix}
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ArrivalHotelDecisionModal
        open={arrivalPolicyConfirmModal.open}
        onOpenChange={(open) => {
          if (!open) {
            setPendingRouteTimeUpdate(null);
            setArrivalPolicyConfirmModal({
              open: false,
              arrivalDate: '',
              previousDayDate: '',
              request: null,
            });
          }
        }}
        arrivalDate={arrivalPolicyConfirmModal.arrivalDate}
        previousDayDate={arrivalPolicyConfirmModal.previousDayDate}
        isLoading={isResolvingArrivalPolicy || isApplyingRouteTimeUpdate}
        onConfirmPreviousDayBilling={async () => {
          if (!arrivalPolicyConfirmModal.request) {
            return;
          }

          const request = arrivalPolicyConfirmModal.request;
          const decisionKey = getRequestArrivalPolicyDecisionKey(request);

          setArrivalPolicyConfirmModal({
            open: false,
            arrivalDate: '',
            previousDayDate: '',
            request: null,
          });

          if (pendingRouteTimeUpdate) {
            // Triggered by a Day-1 route time change – proceed with the PATCH
            const { planId, routeId, dayNumber, startTimeHms, endTimeHms } = pendingRouteTimeUpdate;
            setPendingRouteTimeUpdate(null);
            await applyRouteTimePatch(planId, routeId, dayNumber, startTimeHms, endTimeHms, {
              previousDayBillingDecisionProvided: true,
              previousDayBillingConfirmed: true,
            });
            if (decisionKey) {
              setLastArrivalPolicyDecisionKey(decisionKey);
            }
            return;
          }

          const persisted = await persistArrivalPolicyDecision(
            request,
            true,
          );

          if (!persisted) {
            const nextRequest: HotelArrivalPolicyRequest = {
              ...request,
              previousDayBillingDecisionProvided: true,
              previousDayBillingConfirmed: true,
            };
            await resolveArrivalPolicyForArrivalTimeChange(nextRequest);
            return;
          }

          if (decisionKey) {
            setLastArrivalPolicyDecisionKey(decisionKey);
          }
        }}
        onDeclinePreviousDayBilling={async () => {
          if (!arrivalPolicyConfirmModal.request) {
            return;
          }

          const request = arrivalPolicyConfirmModal.request;
          const decisionKey = getRequestArrivalPolicyDecisionKey(request);

          setArrivalPolicyConfirmModal({
            open: false,
            arrivalDate: '',
            previousDayDate: '',
            request: null,
          });

          if (pendingRouteTimeUpdate) {
            // User declined previous-day billing – still apply the route time change
            const { planId, routeId, dayNumber, startTimeHms, endTimeHms } = pendingRouteTimeUpdate;
            setPendingRouteTimeUpdate(null);
            await applyRouteTimePatch(planId, routeId, dayNumber, startTimeHms, endTimeHms, {
              previousDayBillingDecisionProvided: true,
              previousDayBillingConfirmed: false,
            });
            if (decisionKey) {
              setLastArrivalPolicyDecisionKey(decisionKey);
            }
            return;
          }

          const persisted = await persistArrivalPolicyDecision(
            request,
            false,
          );

          if (!persisted) {
            const nextRequest: HotelArrivalPolicyRequest = {
              ...request,
              previousDayBillingDecisionProvided: true,
              previousDayBillingConfirmed: false,
            };
            await resolveArrivalPolicyForArrivalTimeChange(nextRequest);
            return;
          }

          if (decisionKey) {
            setLastArrivalPolicyDecisionKey(decisionKey);
          }
        }}
      />

      {/* Hotel Search Modal - NEW Real-Time Search */}
      <HotelSearchModal
        open={hotelSelectionModal.open}
        onOpenChange={(open) => {
          if (!open) {
            setHotelSelectionModal({
              open: false,
              planId: null,
              routeId: null,
              routeDate: "",
            });
            setHotelSearchChildAges([]);
          }
        }}
        cityCode={hotelSelectionModal.cityCode || ""}
        cityName={hotelSelectionModal.cityName || ""}
        checkInDate={hotelSelectionModal.checkInDate || hotelSelectionModal.routeDate}
        checkOutDate={hotelSelectionModal.checkOutDate || hotelSelectionModal.routeDate}
        roomCount={Number(itinerary?.roomCount || 1)}
        adultCount={Number(itinerary?.adults || 0)}
        childCount={Number(itinerary?.children || 0)}
        infantCount={Number(itinerary?.infants || 0)}
        childAges={hotelSearchChildAges}
        guestNationality={guestDetails.nationality.toUpperCase()}
        onChildAgesChange={setHotelSearchChildAges}
        onSelectHotel={handleSelectHotelFromSearch}
        isSelectingHotel={isSelectingHotel}
      />

      {/* Hotel Room Selection Modal */}
      {roomSelectionModal && (
        <HotelRoomSelectionModal
          open={roomSelectionModal.open}
          onOpenChange={(open) => {
            if (!open) {
              setRoomSelectionModal(null);
            }
          }}
          itinerary_plan_hotel_details_ID={roomSelectionModal.itinerary_plan_hotel_details_ID}
          itinerary_plan_id={roomSelectionModal.itinerary_plan_id}
          itinerary_route_id={roomSelectionModal.itinerary_route_id}
          hotel_id={roomSelectionModal.hotel_id}
          group_type={roomSelectionModal.group_type}
          hotel_name={roomSelectionModal.hotel_name}
          onSuccess={() => {
            toast.success('Room categories updated successfully');
            // Note: Room selection is saved to DB but doesn't affect the hotel list display
          }}
        />
      )}

      <GalleryDialog state={galleryModal} setState={setGalleryModal} activeIndex={galleryActiveIdx} setActiveIndex={setGalleryActiveIdx} />
      <VideoDialog state={videoModal} setState={setVideoModal} />
      <ClipboardDialog
        open={clipboardModal}
        preference={itineraryPreference}
        clipboardType={clipboardType}
        recommendations={paraRecommendations}
        selectedHotels={selectedHotels}
        onOpenChange={setClipboardModal}
        onSelectionChange={setSelectedHotels}
        onCopy={handleCopyClipboard}
      />

      <SourcePreviewDialog open={sourcePreviewOpen} setOpen={setSourcePreviewOpen} heading={sourcePreviewHeading} loading={sourcePreviewLoading} error={sourcePreviewError} markdown={sourcePreviewMarkdown} />
      <ShareEmailDialog open={shareModal} setOpen={setShareModal} quoteId={String(quoteId || "")} />
      {/* stale preview text retained temporarily for encoding-safe cleanup
                                    ⚠️ Will extend hotspot end time
                                    • {c.reason}
      */}
      <AllHotspotsPreviewDialog
        open={allHotspotsPreviewModal.open}
        loading={allHotspotsPreviewModal.loading}
        data={allHotspotsPreviewModal.data}
        onOpenChange={(open) => setAllHotspotsPreviewModal(prev => ({ ...prev, open }))}
        formatTime={formatPreviewTime}
        formatDuration={formatActivityDuration}
      />

      {/* Confirm Quotation Modal */}
      <Dialog open={confirmQuotationModal} onOpenChange={setConfirmQuotationModal}>
        <DialogContent className="w-[96vw] sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add Guest Details</DialogTitle>
            <DialogDescription>
              Enter primary guest information and travel details
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Quotation Details */}
            {agentInfo && (
              <div className="bg-[#f8f9fa] p-4 rounded-lg space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-[#6c6c6c]">Quotation No:</span>
                  <span className="font-medium text-[#4a4260]">{agentInfo.quotation_no}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-[#6c6c6c]">Agent Name:</span>
                  <span className="font-medium text-[#4a4260]">
                    {agentInfo.agent_display_name || agentInfo.agent_name}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-[#6c6c6c]">Wallet Balance:</span>
                  <span className={`font-medium ${(walletBalanceAmount ?? parseWalletAmount(walletBalance)) < 0 ? 'text-red-600' : 'text-green-600'}`}>
                    {walletBalance}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-[#6c6c6c]">Amount Required:</span>
                  <span className="font-medium text-[#4a4260]">
                    {formatCurrency(confirmRequiredAmount)}
                  </span>
                </div>
              </div>
            )}

            {shouldEnableWalletTopUpOnConfirm && showWalletTopUpPanel && agentInfo && (
              <div className="space-y-3 rounded-lg border border-red-200 bg-red-50 p-4">
                <div>
                  <h3 className="font-semibold text-red-800">Agent wallet balance is insufficient</h3>
                  <p className="text-xs text-red-700 mt-1">
                    Required: {formatCurrency(confirmRequiredAmount)} · Current Wallet:{" "}
                    {walletBalance || formatCurrency(walletBalanceAmount || 0)} · Shortfall:{" "}
                    {formatCurrency(walletShortfallAmount)}
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-sm font-medium text-[#4a4260] mb-1 block">Add Cash Amount</label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={walletTopUpAmount}
                      onChange={(e) => setWalletTopUpAmount(e.target.value)}
                      placeholder="Enter amount"
                      className="w-full px-3 py-2 border border-[#e5d9f2] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#d546ab]"
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium text-[#4a4260] mb-1 block">Remark</label>
                    <input
                      type="text"
                      value={walletTopUpRemark}
                      onChange={(e) => setWalletTopUpRemark(e.target.value)}
                      placeholder="Wallet top-up remark"
                      className="w-full px-3 py-2 border border-[#e5d9f2] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#d546ab]"
                    />
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    onClick={handleWalletTopUpAndContinue}
                    disabled={isWalletTopUpSubmitting}
                    className="bg-[#d546ab] hover:bg-[#be3f97]"
                  >
                    {isWalletTopUpSubmitting ? "Adding Cash..." : "Add Cash Wallet & Continue"}
                  </Button>

                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => void (agentInfo?.agent_id && refreshConfirmWalletBalance(agentInfo.agent_id))}
                    disabled={isWalletTopUpSubmitting}
                    className="border-[#d546ab] text-[#d546ab]"
                  >
                    Refresh Wallet
                  </Button>
                </div>
              </div>
            )}

            {isWalletInsufficientForConfirm && !showWalletTopUpPanel && shouldEnableWalletTopUpOnConfirm && (
              <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                Wallet balance is currently below required amount. Click Confirm Booking to auto-check and open top-up panel.
              </div>
            )}

            {requiresHotelBookingFlow && (
              <div className="bg-[#f8f9fa] p-4 rounded-lg space-y-2">
                <div className="flex justify-between text-sm gap-4">
                  <span className="text-[#6c6c6c]">Rooms To Be Booked:</span>
                  <span className="font-medium text-[#4a4260]">{confirmRoomCount}</span>
                </div>
                <div className="flex justify-between text-sm gap-4">
                  <span className="text-[#6c6c6c]">Passenger Mix:</span>
                  <span className="font-medium text-[#4a4260] text-right">{confirmPassengerMix || 'No passengers selected'}</span>
                </div>
                <div className="pt-2 border-t border-[#e6e6e6]">
                  <p className="text-sm text-[#6c6c6c] mb-2">Rooming Preview</p>
                  <div className="space-y-1">
                    {confirmOccupancyPreview.map((room, index) => {
                      const roomMix = [
                        room.adults > 0 ? `${room.adults} Adult${room.adults === 1 ? '' : 's'}` : null,
                        room.children > 0 ? `${room.children} Child${room.children === 1 ? '' : 'ren'}` : null,
                      ].filter(Boolean).join(', ');

                      return (
                        <div key={`confirm-room-${index}`} className="flex justify-between text-sm gap-4">
                          <span className="text-[#6c6c6c]">Room {index + 1}:</span>
                          <span className="font-medium text-[#4a4260] text-right">{roomMix || 'No passengers assigned'}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {requiresDetailedPassengerFlow && (Number(itinerary?.children || 0) > 0 || Number(itinerary?.infants || 0) > 0) && (
              <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
                <p className="text-sm font-medium text-amber-800">Passenger details required for final booking</p>
                <p className="text-xs text-amber-700 mt-1">
                  Please review the child and infant details below before confirming the booking.
                </p>
              </div>
            )}

            {requiresHotelBookingFlow && (isOpeningConfirmQuotation || isPrebooking) && !prebookData && (
              <div className="flex items-center gap-3 border border-[#e5d9f2] rounded-lg p-4 bg-[#faf5ff]">
                <Loader2 className="h-5 w-5 animate-spin text-[#d546ab]" />
                <div>
                  <p className="text-sm font-medium text-[#4a4260]">Fetching latest prebook details...</p>
                  <p className="text-xs text-[#6c6c6c]">Loading updated price, amenities, rate conditions, and inclusions.</p>
                </div>
              </div>
            )}

            {requiresHotelBookingFlow && externalStayEntries.length > 0 && (
              <div className="space-y-3 rounded-lg border border-amber-200 bg-amber-50 p-4">
                <div>
                  <h3 className="font-semibold text-amber-900">External / self-arranged stay required</h3>
                  <p className="text-xs text-amber-800 mt-1">
                    These city/date rows do not have supplier-bookable rooms. They will be shown in the itinerary, but they will not be sent to prebook or final supplier booking.
                  </p>
                </div>
                <div className="space-y-2">
                  {externalStayEntries.map((entry, index: number) => (
                    <div
                      key={`external-stay-${entry.routeId || 'na'}-${index}`}
                      className="rounded-md border border-amber-100 bg-white/80 px-3 py-2"
                    >
                      <p className="text-sm font-medium text-amber-900">
                        Route {entry.routeId || '-'}
                        {entry.destination ? ` · ${entry.destination}` : ''}
                        {entry.day ? ` · ${entry.day}` : ''}
                      </p>
                      <p className="text-xs text-amber-800 mt-1">
                        {entry.availabilityMessage || DEFAULT_EXTERNAL_STAY_MESSAGE}
                      </p>
                    </div>
                  ))}
                </div>
                <label className="flex items-start gap-2 text-sm text-amber-900">
                  <input
                    type="checkbox"
                    className="mt-1"
                    checked={hasAcceptedUpdatedPrice}
                    onChange={(e) => setHasAcceptedUpdatedPrice(e.target.checked)}
                  />
                  <span>
                    I understand these hotel stays are external/self-arranged and will not be booked through supplier APIs.
                  </span>
                </label>
              </div>
            )}

            {requiresHotelBookingFlow && !prebookData && !isPrebooking && !isOpeningConfirmQuotation && nonTboSelectedHotelEntries.length > 0 && (
              <div className="space-y-3 border border-[#e5d9f2] rounded-lg p-4 bg-[#faf5ff]">
                <h3 className="font-semibold text-[#4a4260]">Selected Hotels (Non-TBO)</h3>
                <p className="text-xs text-[#6c6c6c]">No TBO hotels selected — TBO prebook not required for this booking.</p>
                {nonTboSelectedHotelEntries.map((hotel, index: number) => {
                  const detailRow = (hotel?.matchedHotelRow || hotel) as any;
                  const hotelAmenities = normalizePrebookItems(detailRow?.amenities || detailRow?.facilities);
                  const hotelRateConditions = normalizePrebookItems(detailRow?.rateConditions);
                  const hotelInclusions = resolvePrebookInclusions(detailRow);
                  const hotelMealType = resolvePrebookMealPlan(detailRow);
                  const hotelCancellation = normalizeCancellationPolicyItems(
                    detailRow?.cancellationPolicy || detailRow?.cancellationPoliciesText,
                  );

                  return (
                    <details key={`ntbo-only-${hotel?.routeId ?? index}`} className="rounded-lg border border-[#e5d9f2] bg-white p-4 space-y-3">
                      <summary className="cursor-pointer list-none">
                        <div className="flex flex-col gap-1 md:flex-row md:items-start md:justify-between">
                          <div>
                            <p className="font-semibold text-[#4a4260]">{hotel?.hotelName || `Hotel ${index + 1}`}</p>
                            <p className="text-xs text-[#6c6c6c]">
                              {hotel?.displayCheckInDate && hotel?.displayCheckOutDate ? (
                                <>
                                  Stay: <span className="font-medium text-[#4a4260]">
                                    {hotel.displayCheckInDate} to {hotel.displayCheckOutDate}
                                  </span>
                                  {hotel?.displayNights ? ` · ${hotel.displayNights} night(s)` : ''}
                                </>
                              ) : null}
                            </p>
                            <p className="text-xs text-[#6c6c6c]">
                              Provider: <span className="uppercase font-medium">{hotel?.provider || 'Non-TBO'}</span>
                              {hotel?.roomType ? ` · ${hotel.roomType}` : ''}
                            </p>
                            {hotel?.multiNightBooking && Array.isArray(hotel?.displayRouteIds) && hotel.displayRouteIds.length > 1 ? (
                              <p className="text-xs text-green-700 font-medium">
                                Continuous stay selected for {hotel.displayRouteIds.length} route(s)
                              </p>
                            ) : null}
                            <p className="text-xs text-[#6c6c6c]">Tap to view details</p>
                          </div>
                          <div className="text-sm text-left md:text-right">
                            <p className="text-[#6c6c6c]">Selected Price</p>
                            <p className="font-semibold text-[#4a4260]">₹ {Number(hotel?.netAmount || 0).toFixed(2)}</p>
                          </div>
                        </div>
                      </summary>

                      <div className="pt-3 space-y-3 border-t border-[#f1e7fb]">
                        {hotelMealType ? (
                          <p className="text-xs text-[#6c6c6c]">
                            Meal Plan: <span className="font-medium text-[#4a4260]">{normalizeMealPlanLabel(hotelMealType)}</span>
                          </p>
                        ) : null}

                        <details className="rounded-lg border border-[#eadcfb] bg-[#fcf9ff] px-3 py-2" open>
                          <summary className="cursor-pointer text-sm font-medium text-[#4a4260]">Cancellation Policy ({hotelCancellation.length})</summary>
                          <div className="mt-2">
                            {hotelCancellation.length > 0 ? (
                              <ul className="text-sm text-[#4a4260] list-disc pl-5 space-y-1 whitespace-pre-wrap">
                                {hotelCancellation.map((item, idx) => (
                                  <li key={`ntbo-only-cancel-${hotel?.routeId ?? index}-${idx}`}>{item}</li>
                                ))}
                              </ul>
                            ) : (
                              <p className="text-sm text-[#4a4260]">No cancellation policy available</p>
                            )}
                          </div>
                        </details>

                        <details className="rounded-lg border border-[#eadcfb] bg-[#fcf9ff] px-3 py-2">
                          <summary className="cursor-pointer text-sm font-medium text-[#4a4260]">Rate Conditions ({hotelRateConditions.length})</summary>
                          <div className="mt-2">
                            {hotelRateConditions.length > 0 ? (
                              <ul className="text-sm text-[#4a4260] list-disc pl-5 space-y-1 whitespace-pre-wrap">
                                {hotelRateConditions.map((item, idx) => (
                                  <li key={`ntbo-only-rate-${hotel?.routeId ?? index}-${idx}`}>{item}</li>
                                ))}
                              </ul>
                            ) : (
                              <p className="text-sm text-[#4a4260]">No rate conditions available</p>
                            )}
                          </div>
                        </details>

                        <details className="rounded-lg border border-[#eadcfb] bg-[#fcf9ff] px-3 py-2">
                          <summary className="cursor-pointer text-sm font-medium text-[#4a4260]">Amenities ({hotelAmenities.length})</summary>
                          <div className="mt-2">
                            {hotelAmenities.length > 0 ? (
                              <ul className="text-sm text-[#4a4260] list-disc pl-5 space-y-1 whitespace-pre-wrap">
                                {hotelAmenities.map((item, idx) => (
                                  <li key={`ntbo-only-amenity-${hotel?.routeId ?? index}-${idx}`}>{item}</li>
                                ))}
                              </ul>
                            ) : (
                              <p className="text-sm text-[#4a4260]">No amenities available</p>
                            )}
                          </div>
                        </details>

                        <details className="rounded-lg border border-[#eadcfb] bg-[#fcf9ff] px-3 py-2">
                          <summary className="cursor-pointer text-sm font-medium text-[#4a4260]">Package Inclusions ({hotelInclusions.length})</summary>
                          <div className="mt-2">
                            {hotelInclusions.length > 0 ? (
                              <ul className="text-sm text-[#4a4260] list-disc pl-5 space-y-1 whitespace-pre-wrap">
                                {hotelInclusions.map((item, idx) => (
                                  <li key={`ntbo-only-inc-${hotel?.routeId ?? index}-${idx}`}>{item}</li>
                                ))}
                              </ul>
                            ) : (
                              <p className="text-sm text-[#4a4260]">No inclusions available</p>
                            )}
                          </div>
                        </details>

                        <p className="text-xs text-[#9c7fb8] bg-[#f5eeff] border border-[#e5d9f2] rounded px-2 py-1">
                          Policies and rate conditions are managed by the provider. TBO prebook is not applicable.
                        </p>
                      </div>
                    </details>
                  );
                })}
                <label className="flex items-start gap-2 text-sm text-[#4a4260]">
                  <input
                    type="checkbox"
                    className="mt-1"
                    checked={hasAcceptedUpdatedPrice}
                    onChange={(e) => setHasAcceptedUpdatedPrice(e.target.checked)}
                  />
                  <span>I have reviewed the selected hotel details before final booking confirmation.</span>
                </label>
              </div>
            )}

          {requiresHotelBookingFlow && prebookData && (
  <div className="space-y-3 border border-[#e5d9f2] rounded-lg p-4 bg-[#faf5ff]">
    <h3 className="font-semibold text-[#4a4260]">Prebook Review</h3>

    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
      <div>
        <p className="text-[#6c6c6c]">Hotel Final Cost</p>
        <p className="font-semibold text-[#4a4260]">
          ₹ {Number(prebookData.updatedTotalPrice || prebookData.finalPrice || prebookData.totalAmount || 0).toFixed(2)}
        </p>
      </div>

      <div>
        <p className="text-[#6c6c6c]">Hotels Prebooked</p>
        <p className="font-semibold text-[#4a4260]">{prebookHotelEntries.length || 0}</p>
      </div>
    </div>

    {prebookHotelEntries.map((hotel, index: number) => {
      const hotelAmenities = normalizePrebookItems(hotel?.amenities);
      const hotelRateConditions = normalizePrebookItems(hotel?.rateConditions);
      const hotelInclusions = resolvePrebookInclusions(hotel);
      const hotelMealType = resolvePrebookMealPlan(hotel);
      const hotelCancellation = normalizeCancellationPolicyItems(hotel?.cancellationPolicy || hotel?.cancellationPoliciesText);
      const hotelPromotions = normalizePrebookItems(hotel?.roomPromotion);
      const hotelSupplements = Array.isArray(hotel?.normalizedSupplements) ? hotel.normalizedSupplements : [];
      const hotelMandatorySupplements = normalizePrebookItems(hotel?.mandatorySupplements);

      return (
        <details key={`prebook-hotel-${hotel?.routeId ?? index}-${hotel?.hotelCode ?? index}`} className="rounded-lg border border-[#eadcfb] bg-white p-4 space-y-3">
          <summary className="cursor-pointer list-none">
            <div className="flex flex-col gap-1">
              <p className="font-semibold text-[#4a4260]">{hotel?.hotelName || `Hotel ${index + 1}`}</p>
              <p className="text-xs text-[#6c6c6c]">Tap to view details</p>
            </div>
          </summary>

                      <div className="pt-3 space-y-3 border-t border-[#f1e7fb]">
                        <div>
                          <p className="text-xs text-[#6c6c6c]">Hotel Code: {hotel?.hotelCode || '-'}</p>
                          {hotel?.routeId ? <p className="text-xs text-[#6c6c6c]">Route ID: {hotel.routeId}</p> : null}
                          {hotelMealType ? (
                            <p className="text-xs text-[#6c6c6c]">
                              Meal Plan: <span className="font-medium text-[#4a4260]">{normalizeMealPlanLabel(hotelMealType)}</span>
                            </p>
                          ) : null}
                        </div>

                      <details className="rounded-lg border border-[#eadcfb] bg-[#fcf9ff] px-3 py-2" open>
                        <summary className="cursor-pointer text-sm font-medium text-[#4a4260]">Cancellation Policy ({hotelCancellation.length})</summary>
                        <div className="mt-2">
                          {hotelCancellation.length > 0 ? (
                            <ul className="text-sm text-[#4a4260] list-disc pl-5 space-y-1 whitespace-pre-wrap">
                              {hotelCancellation.map((item, idx) => (
                                <li key={`hotel-cancel-${hotel?.routeId ?? index}-${idx}`}>{item}</li>
                              ))}
                            </ul>
                          ) : (
                            <p className="text-sm text-[#4a4260]">No cancellation policy returned</p>
                          )}
                        </div>
                      </details>

                      <details className="rounded-lg border border-[#eadcfb] bg-[#fcf9ff] px-3 py-2">
                        <summary className="cursor-pointer text-sm font-medium text-[#4a4260]">Room Promotion ({hotelPromotions.length})</summary>
                        <div className="mt-2">
                          {hotelPromotions.length > 0 ? (
                            <ul className="text-sm text-[#4a4260] list-disc pl-5 space-y-1 whitespace-pre-wrap">
                              {hotelPromotions.map((item, idx) => (
                                <li key={`hotel-promo-${hotel?.routeId ?? index}-${idx}`}>{item}</li>
                              ))}
                            </ul>
                          ) : (
                            <p className="text-sm text-[#4a4260]">No room promotion returned</p>
                          )}
                        </div>
                      </details>

                      <details className="rounded-lg border border-[#eadcfb] bg-[#fcf9ff] px-3 py-2">
                        <summary className="cursor-pointer text-sm font-medium text-[#4a4260]">Rate Conditions ({hotelRateConditions.length})</summary>
                        <div className="mt-2">
                          {hotelRateConditions.length > 0 ? (
                            <ul className="text-sm text-[#4a4260] list-disc pl-5 space-y-1 whitespace-pre-wrap">
                              {hotelRateConditions.map((item, idx) => (
                                <li key={`hotel-rate-${hotel?.routeId ?? index}-${idx}`}>{item}</li>
                              ))}
                            </ul>
                          ) : (
                            <p className="text-sm text-[#4a4260]">No rate conditions returned</p>
                          )}
                        </div>
                      </details>

                      <details className="rounded-lg border border-[#eadcfb] bg-[#fcf9ff] px-3 py-2">
                        <summary className="cursor-pointer text-sm font-medium text-[#4a4260]">Amenities ({hotelAmenities.length})</summary>
                        <div className="mt-2">
                          {hotelAmenities.length > 0 ? (
                            <ul className="text-sm text-[#4a4260] list-disc pl-5 space-y-1 whitespace-pre-wrap">
                              {hotelAmenities.map((item, idx) => (
                                <li key={`hotel-amenity-${hotel?.routeId ?? index}-${idx}`}>{item}</li>
                              ))}
                            </ul>
                          ) : (
                            <p className="text-sm text-[#4a4260]">No amenities returned</p>
                          )}
                        </div>
                      </details>

                      <details className="rounded-lg border border-[#eadcfb] bg-[#fcf9ff] px-3 py-2">
                        <summary className="cursor-pointer text-sm font-medium text-[#4a4260]">Package Inclusions ({hotelInclusions.length})</summary>
                        <div className="mt-2">
                          {hotelInclusions.length > 0 ? (
                            <ul className="text-sm text-[#4a4260] list-disc pl-5 space-y-1 whitespace-pre-wrap">
                              {hotelInclusions.map((item, idx) => (
                                <li key={`hotel-inclusion-${hotel?.routeId ?? index}-${idx}`}>{item}</li>
                              ))}
                            </ul>
                          ) : (
                            <p className="text-sm text-[#4a4260]">No inclusions returned</p>
                          )}
                        </div>
                      </details>

                      <div>
                        <p className="text-[#6c6c6c] text-sm">Mandatory Supplements & Additional Charges</p>
                        {hotelSupplements.length > 0 ? (
                          <SupplementDisplay supplements={hotelSupplements} showHeading={false} />
                        ) : hotelMandatorySupplements.length > 0 ? (
                          <ul className="text-sm text-[#4a4260] list-disc pl-5 space-y-1 whitespace-pre-wrap">
                            {hotelMandatorySupplements.map((item, idx) => (
                              <li key={`hotel-supplement-${hotel?.routeId ?? index}-${idx}`}>{item}</li>
                            ))}
                          </ul>
                        ) : (
                          <p className="text-sm text-[#4a4260]">No mandatory supplements returned</p>
                        )}
                      </div>
                      </div>
                    </details>
                  );
                })}

                {nonTboSelectedHotelEntries.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-[#6c6c6c] uppercase tracking-wide mt-1">Non-TBO Selected Hotels</p>
                    {nonTboSelectedHotelEntries.map((hotel, index: number) => {
                      const detailRow = (hotel?.matchedHotelRow || hotel) as any;
                      const hotelAmenities = normalizePrebookItems(detailRow?.amenities || detailRow?.facilities);
                      const hotelRateConditions = normalizePrebookItems(detailRow?.rateConditions);
                      const hotelInclusions = resolvePrebookInclusions(detailRow);
                      const hotelMealType = resolvePrebookMealPlan(detailRow);
                      const hotelCancellation = normalizeCancellationPolicyItems(
                        detailRow?.cancellationPolicy || detailRow?.cancellationPoliciesText,
                      );

                      return (
                        <details
                          key={`non-tbo-hotel-${hotel?.routeId ?? index}`}
                          className="rounded-lg border border-[#e5d9f2] bg-white p-4 space-y-3"
                        >
                          <summary className="cursor-pointer list-none">
                            <div className="flex flex-col gap-1 md:flex-row md:items-start md:justify-between">
                              <div>
                                <p className="font-semibold text-[#4a4260]">{hotel?.hotelName || `Hotel ${index + 1}`}</p>
                                <p className="text-xs text-[#6c6c6c]">
                                  {hotel?.displayCheckInDate && hotel?.displayCheckOutDate ? (
                                    <>
                                      Stay: <span className="font-medium text-[#4a4260]">
                                        {hotel.displayCheckInDate} to {hotel.displayCheckOutDate}
                                      </span>
                                      {hotel?.displayNights ? ` · ${hotel.displayNights} night(s)` : ''}
                                    </>
                                  ) : null}
                                </p>
                                <p className="text-xs text-[#6c6c6c]">
                                  Provider: <span className="uppercase font-medium">{hotel?.provider || 'Non-TBO'}</span>
                                  {hotel?.roomType ? ` · ${hotel.roomType}` : ''}
                                </p>
                                {hotel?.multiNightBooking && Array.isArray(hotel?.displayRouteIds) && hotel.displayRouteIds.length > 1 ? (
                                  <p className="text-xs text-green-700 font-medium">
                                    Continuous stay selected for {hotel.displayRouteIds.length} route(s)
                                  </p>
                                ) : null}
                                <p className="text-xs text-[#6c6c6c]">Tap to view details</p>
                              </div>
                              <div className="text-sm text-left md:text-right">
                                <p className="text-[#6c6c6c]">Selected Price</p>
                                <p className="font-semibold text-[#4a4260]">₹ {Number(hotel?.netAmount || 0).toFixed(2)}</p>
                              </div>
                            </div>
                          </summary>

                          <div className="pt-3 space-y-3 border-t border-[#f1e7fb]">
                            <div>
                              <p className="text-xs text-[#6c6c6c]">Hotel Code: {hotel?.hotelCode || detailRow?.hotelCode || '-'}</p>
                              {hotel?.routeId ? <p className="text-xs text-[#6c6c6c]">Route ID: {hotel.routeId}</p> : null}
                              {hotelMealType ? (
                                <p className="text-xs text-[#6c6c6c]">
                                  Meal Plan: <span className="font-medium text-[#4a4260]">{normalizeMealPlanLabel(hotelMealType)}</span>
                                </p>
                              ) : null}
                            </div>

                            <details className="rounded-lg border border-[#eadcfb] bg-[#fcf9ff] px-3 py-2" open>
                              <summary className="cursor-pointer text-sm font-medium text-[#4a4260]">Cancellation Policy ({hotelCancellation.length})</summary>
                              <div className="mt-2">
                                {hotelCancellation.length > 0 ? (
                                  <ul className="text-sm text-[#4a4260] list-disc pl-5 space-y-1 whitespace-pre-wrap">
                                    {hotelCancellation.map((item, idx) => (
                                      <li key={`non-tbo-cancel-${hotel?.routeId ?? index}-${idx}`}>{item}</li>
                                    ))}
                                  </ul>
                                ) : (
                                  <p className="text-sm text-[#4a4260]">No cancellation policy available</p>
                                )}
                              </div>
                            </details>

                            <details className="rounded-lg border border-[#eadcfb] bg-[#fcf9ff] px-3 py-2">
                              <summary className="cursor-pointer text-sm font-medium text-[#4a4260]">Rate Conditions ({hotelRateConditions.length})</summary>
                              <div className="mt-2">
                                {hotelRateConditions.length > 0 ? (
                                  <ul className="text-sm text-[#4a4260] list-disc pl-5 space-y-1 whitespace-pre-wrap">
                                    {hotelRateConditions.map((item, idx) => (
                                      <li key={`non-tbo-rate-${hotel?.routeId ?? index}-${idx}`}>{item}</li>
                                    ))}
                                  </ul>
                                ) : (
                                  <p className="text-sm text-[#4a4260]">No rate conditions available</p>
                                )}
                              </div>
                            </details>

                            <details className="rounded-lg border border-[#eadcfb] bg-[#fcf9ff] px-3 py-2">
                              <summary className="cursor-pointer text-sm font-medium text-[#4a4260]">Amenities ({hotelAmenities.length})</summary>
                              <div className="mt-2">
                                {hotelAmenities.length > 0 ? (
                                  <ul className="text-sm text-[#4a4260] list-disc pl-5 space-y-1 whitespace-pre-wrap">
                                    {hotelAmenities.map((item, idx) => (
                                      <li key={`non-tbo-amenity-${hotel?.routeId ?? index}-${idx}`}>{item}</li>
                                    ))}
                                  </ul>
                                ) : (
                                  <p className="text-sm text-[#4a4260]">No amenities available</p>
                                )}
                              </div>
                            </details>

                            <details className="rounded-lg border border-[#eadcfb] bg-[#fcf9ff] px-3 py-2">
                              <summary className="cursor-pointer text-sm font-medium text-[#4a4260]">Package Inclusions ({hotelInclusions.length})</summary>
                              <div className="mt-2">
                                {hotelInclusions.length > 0 ? (
                                  <ul className="text-sm text-[#4a4260] list-disc pl-5 space-y-1 whitespace-pre-wrap">
                                    {hotelInclusions.map((item, idx) => (
                                      <li key={`non-tbo-inc-${hotel?.routeId ?? index}-${idx}`}>{item}</li>
                                    ))}
                                  </ul>
                                ) : (
                                  <p className="text-sm text-[#4a4260]">No inclusions available</p>
                                )}
                              </div>
                            </details>

                            <p className="text-xs text-[#9c7fb8] bg-[#f5eeff] border border-[#e5d9f2] rounded px-2 py-1">
                              This hotel is managed outside TBO. Details shown here come from the selected provider record.
                            </p>
                          </div>
                        </details>
                      );
                    })}
                  </div>
                )}

                {hasPrebookPriceChanged && (
                  <p className="text-sm font-medium text-amber-700 bg-amber-50 border border-amber-200 rounded p-2">
                    Prebook returned a changed price compared to selected hotel rates. You must accept the updated amount before final booking.
                  </p>
                )}

                <label className="flex items-start gap-2 text-sm text-[#4a4260]">
                  <input
                    type="checkbox"
                    className="mt-1"
                    checked={hasAcceptedUpdatedPrice}
                    onChange={(e) => setHasAcceptedUpdatedPrice(e.target.checked)}
                  />
                  <span>I have reviewed the inclusions, amenities, rate conditions, cancellation policy, room promotion, and additional charge details before final booking confirmation.</span>
                </label>
              </div>
            )}

            {/* Primary Guest Details */}
            <div className="space-y-3">
              <h3 className="font-semibold text-[#4a4260]">Primary Guest Details - Adult 1</h3>

              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <div className="sm:col-span-1">
                  <label className="text-sm font-medium text-[#4a4260] mb-1 block">
                    Salutation
                  </label>
                  <select
                    className="w-full px-3 py-2 border border-[#e5d9f2] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#d546ab]"
                    value={guestDetails.salutation}
                    onChange={(e) => setGuestDetails({ ...guestDetails, salutation: e.target.value })}
                  >
                    <option value="Mr">Mr</option>
                    <option value="Ms">Ms</option>
                    <option value="Mrs">Mrs</option>
                    <option value="Miss">Miss</option>
                    <option value="Mx">Mx</option>
                    <option value="Dr">Dr</option>
                  </select>
                </div>

                <div className="sm:col-span-2">
                  <label className="text-sm font-medium text-[#4a4260] mb-1 block">
                    Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    className="w-full px-3 py-2 border border-[#e5d9f2] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#d546ab]"
                    placeholder="Enter the Name"
                    value={guestDetails.name}
                    onChange={(e) => {
                      setGuestDetails({ ...guestDetails, name: e.target.value });
                      setFormErrors((prev) => {
                        const next = { ...prev };
                        delete next['primary-name'];
                        return next;
                      });
                    }}
                  />
                  {formErrors['primary-name'] && <p className="text-[11px] text-red-600 mt-1">{formErrors['primary-name']}</p>}
                </div>

                <div className="sm:col-span-1">
                  <label className="text-sm font-medium text-[#4a4260] mb-1 block">
                    Age
                  </label>
                  <input
                    type="text"
                    className="w-full px-3 py-2 border border-[#e5d9f2] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#d546ab]"
                    placeholder="Enter the Age"
                    value={guestDetails.age}
                    onChange={(e) => setGuestDetails({ ...guestDetails, age: e.target.value })}
                  />
                  {formErrors['primary-age'] && <p className="text-[11px] text-red-600 mt-1">{formErrors['primary-age']}</p>}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium text-[#4a4260] mb-1 block">
                    Primary Contact No. <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    className="w-full px-3 py-2 border border-[#e5d9f2] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#d546ab]"
                    placeholder="Enter the Contact No"
                    value={guestDetails.contactNo}
                    onChange={(e) => {
                      setGuestDetails({ ...guestDetails, contactNo: e.target.value });
                      setFormErrors((prev) => {
                        const next = { ...prev };
                        delete next['primary-contactNo'];
                        return next;
                      });
                    }}
                  />
                  {formErrors['primary-contactNo'] && <p className="text-[11px] text-red-600 mt-1">{formErrors['primary-contactNo']}</p>}
                </div>

                <div>
                  <label className="text-sm font-medium text-[#4a4260] mb-1 block">
                    Alternative Contact No.
                  </label>
                  <input
                    type="text"
                    className="w-full px-3 py-2 border border-[#e5d9f2] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#d546ab]"
                    placeholder="Enter the Alternative Contact No"
                    value={guestDetails.alternativeContactNo}
                    onChange={(e) => setGuestDetails({ ...guestDetails, alternativeContactNo: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-sm font-medium text-[#4a4260] mb-1 block">
                    Nationality <span className="text-red-500">*</span>
                    <span className="ml-1 text-[10px] text-[#8b43d1] font-normal">(locked from search)</span>
                  </label>
                  <input
                    type="text"
                    className="w-full px-3 py-2 border border-[#e5d9f2] rounded-lg bg-[#f9f7fc] text-[#4a4260] cursor-not-allowed"
                    placeholder="IN"
                    value={guestDetails.nationality}
                    readOnly
                    title="Nationality is locked from itinerary search and cannot be changed at booking time"
                  />
                  {formErrors['primary-nationality'] && <p className="text-[11px] text-red-600 mt-1">{formErrors['primary-nationality']}</p>}
                </div>
                <div>
                  <label className="text-sm font-medium text-[#4a4260] mb-1 block">
                    PAN (Optional)
                  </label>
                  <input
                    type="text"
                    className="w-full px-3 py-2 border border-[#e5d9f2] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#d546ab]"
                    placeholder="ABCDE1234F"
                    value={guestDetails.panNo}
                    onChange={(e) => setGuestDetails({ ...guestDetails, panNo: e.target.value.toUpperCase() })}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-[#4a4260] mb-1 block">
                    Passport No (Optional)
                  </label>
                  <input
                    type="text"
                    className="w-full px-3 py-2 border border-[#e5d9f2] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#d546ab]"
                    placeholder="Passport number"
                    value={guestDetails.passportNo}
                    onChange={(e) => setGuestDetails({ ...guestDetails, passportNo: e.target.value.toUpperCase() })}
                  />
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-[#4a4260] mb-1 block">
                  Email ID
                </label>
                <input
                  type="email"
                  className="w-full px-3 py-2 border border-[#e5d9f2] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#d546ab]"
                  placeholder="Enter the Email ID"
                  value={guestDetails.emailId}
                  onChange={(e) => setGuestDetails({ ...guestDetails, emailId: e.target.value })}
                />
              </div>

              {requiresDetailedPassengerFlow && (
                <>
              {/* Additional Adults */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-semibold text-[#4a4260]">Additional Adults</h4>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setAdditionalAdults([...additionalAdults, defaultPassenger('Mr')])}
                    className="h-8 px-2 text-xs border-[#e5d9f2] text-[#8b43d1] hover:bg-[#f8f4ff]"
                  >
                    <Plus className="w-3 h-3 mr-1" /> Add Adult
                  </Button>
                </div>
                {formErrors['count-adult'] && <p className="text-[11px] text-red-600">{formErrors['count-adult']}</p>}
                {additionalAdults.map((adult, index) => (
                  <div key={index} className="space-y-2 rounded-lg border border-[#f0e6fb] p-3">
                    <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-end">
                      <div className="sm:col-span-2">
                        <label className="text-[10px] font-medium text-[#4a4260] mb-1 block">Title</label>
                        <select
                          className="w-full px-2 py-1.5 text-sm border border-[#e5d9f2] rounded-lg"
                          value={adult.title}
                          onChange={(e) => {
                            const next = [...additionalAdults];
                            next[index].title = e.target.value;
                            setAdditionalAdults(next);
                          }}
                        >
                          {ALLOWED_TITLES.map((title) => (
                            <option key={title} value={title}>{title}</option>
                          ))}
                        </select>
                      </div>
                      <div className="sm:col-span-5">
                        <label className="text-[10px] font-medium text-[#4a4260] mb-1 block">Adult {index + 2} Name</label>
                        <input
                          type="text"
                          className="w-full px-2 py-1.5 text-sm border border-[#e5d9f2] rounded-lg"
                          placeholder="Name"
                          value={adult.name}
                          onChange={(e) => {
                            const next = [...additionalAdults];
                            next[index].name = e.target.value;
                            setAdditionalAdults(next);
                          }}
                        />
                      </div>
                      <div className="sm:col-span-2">
                        <label className="text-[10px] font-medium text-[#4a4260] mb-1 block">Age</label>
                        <input
                          type="text"
                          className="w-full px-2 py-1.5 text-sm border border-[#e5d9f2] rounded-lg"
                          placeholder="Age"
                          value={adult.age}
                          onChange={(e) => {
                            const next = [...additionalAdults];
                            next[index].age = e.target.value;
                            setAdditionalAdults(next);
                          }}
                        />
                      </div>
                      <div className="sm:col-span-2">
                        <label className="text-[10px] font-medium text-[#4a4260] mb-1 block">Nationality</label>
                        <input
                          type="text"
                          className="w-full px-2 py-1.5 text-sm border border-[#e5d9f2] rounded-lg bg-[#f9f7fc] text-[#4a4260] cursor-not-allowed"
                          placeholder="IN"
                          value={adult.nationality}
                          readOnly
                          title="Nationality is locked from itinerary search"
                        />
                      </div>
                      <div className="sm:col-span-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => setAdditionalAdults(additionalAdults.filter((_, i) => i !== index))}
                          className="h-9 w-full text-red-500 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <input
                        type="text"
                        className="w-full px-2 py-1.5 text-sm border border-[#e5d9f2] rounded-lg"
                        placeholder="PAN (Optional)"
                        value={adult.panNo}
                        onChange={(e) => {
                          const next = [...additionalAdults];
                          next[index].panNo = e.target.value.toUpperCase();
                          setAdditionalAdults(next);
                        }}
                      />
                      <input
                        type="text"
                        className="w-full px-2 py-1.5 text-sm border border-[#e5d9f2] rounded-lg"
                        placeholder="Passport No (Optional)"
                        value={adult.passportNo}
                        onChange={(e) => {
                          const next = [...additionalAdults];
                          next[index].passportNo = e.target.value.toUpperCase();
                          setAdditionalAdults(next);
                        }}
                      />
                    </div>
                    {(getPassengerFieldError('adult', index, 'title') ||
                      getPassengerFieldError('adult', index, 'name') ||
                      getPassengerFieldError('adult', index, 'age') ||
                      getPassengerFieldError('adult', index, 'nationality')) && (
                      <p className="text-[11px] text-red-600">
                        {getPassengerFieldError('adult', index, 'title') ||
                          getPassengerFieldError('adult', index, 'name') ||
                          getPassengerFieldError('adult', index, 'age') ||
                          getPassengerFieldError('adult', index, 'nationality')}
                      </p>
                    )}
                  </div>
                ))}
              </div>

              {/* Additional Children */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-semibold text-[#4a4260]">Children (5-12 years)</h4>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setAdditionalChildren([...additionalChildren, defaultPassenger('Ms')])}
                    className="h-8 px-2 text-xs border-[#e5d9f2] text-[#8b43d1] hover:bg-[#f8f4ff]"
                  >
                    <Plus className="w-3 h-3 mr-1" /> Add Child
                  </Button>
                </div>
                {formErrors['count-child'] && <p className="text-[11px] text-red-600">{formErrors['count-child']}</p>}
                {additionalChildren.map((child, index) => (
                  <div key={index} className="space-y-2 rounded-lg border border-[#f0e6fb] p-3">
                    <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-end">
                      <div className="sm:col-span-2">
                        <label className="text-[10px] font-medium text-[#4a4260] mb-1 block">Title</label>
                        <select
                          className="w-full px-2 py-1.5 text-sm border border-[#e5d9f2] rounded-lg"
                          value={child.title}
                          onChange={(e) => {
                            const next = [...additionalChildren];
                            next[index].title = e.target.value;
                            setAdditionalChildren(next);
                          }}
                        >
                          {ALLOWED_TITLES.map((title) => (
                            <option key={title} value={title}>{title}</option>
                          ))}
                        </select>
                      </div>
                      <div className="sm:col-span-5">
                        <label className="text-[10px] font-medium text-[#4a4260] mb-1 block">Child {index + 1} Name</label>
                        <input type="text" className="w-full px-2 py-1.5 text-sm border border-[#e5d9f2] rounded-lg" placeholder="Name" value={child.name} onChange={(e) => { const next = [...additionalChildren]; next[index].name = e.target.value; setAdditionalChildren(next); }} />
                      </div>
                      <div className="sm:col-span-2">
                        <label className="text-[10px] font-medium text-[#4a4260] mb-1 block">Age</label>
                        <input
                          type="text"
                          className="w-full px-2 py-1.5 text-sm border border-[#e5d9f2] rounded-lg bg-[#f9f7fc] text-[#6c6c6c]"
                          placeholder="Age"
                          value={child.age}
                          readOnly
                          title="Child age is locked from itinerary/search and cannot be changed at booking time"
                        />
                      </div>
                      <div className="sm:col-span-2">
                        <label className="text-[10px] font-medium text-[#4a4260] mb-1 block">Nationality</label>
                        <input type="text" className="w-full px-2 py-1.5 text-sm border border-[#e5d9f2] rounded-lg bg-[#f9f7fc] text-[#4a4260] cursor-not-allowed" placeholder="IN" value={child.nationality} readOnly title="Nationality is locked from itinerary search" />
                      </div>
                      <div className="sm:col-span-1">
                        <Button type="button" variant="ghost" size="sm" onClick={() => setAdditionalChildren(additionalChildren.filter((_, i) => i !== index))} className="h-9 w-full text-red-500 hover:text-red-700 hover:bg-red-50">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <input type="text" className="w-full px-2 py-1.5 text-sm border border-[#e5d9f2] rounded-lg" placeholder="PAN (Optional)" value={child.panNo} onChange={(e) => { const next = [...additionalChildren]; next[index].panNo = e.target.value.toUpperCase(); setAdditionalChildren(next); }} />
                      <input type="text" className="w-full px-2 py-1.5 text-sm border border-[#e5d9f2] rounded-lg" placeholder="Passport No (Optional)" value={child.passportNo} onChange={(e) => { const next = [...additionalChildren]; next[index].passportNo = e.target.value.toUpperCase(); setAdditionalChildren(next); }} />
                    </div>
                    {(getPassengerFieldError('child', index, 'title') ||
                      getPassengerFieldError('child', index, 'name') ||
                      getPassengerFieldError('child', index, 'age') ||
                      getPassengerFieldError('child', index, 'nationality')) && (
                      <p className="text-[11px] text-red-600">
                        {getPassengerFieldError('child', index, 'title') ||
                          getPassengerFieldError('child', index, 'name') ||
                          getPassengerFieldError('child', index, 'age') ||
                          getPassengerFieldError('child', index, 'nationality')}
                      </p>
                    )}
                  </div>
                ))}
              </div>

              {/* Additional Infants */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-semibold text-[#4a4260]">Infants (Below 5 years)</h4>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setAdditionalInfants([...additionalInfants, defaultPassenger('Ms')])}
                    className="h-8 px-2 text-xs border-[#e5d9f2] text-[#8b43d1] hover:bg-[#f8f4ff]"
                  >
                    <Plus className="w-3 h-3 mr-1" /> Add Infant
                  </Button>
                </div>
                {formErrors['count-infant'] && <p className="text-[11px] text-red-600">{formErrors['count-infant']}</p>}
                {additionalInfants.map((infant, index) => (
                  <div key={index} className="space-y-2 rounded-lg border border-[#f0e6fb] p-3">
                    <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-end">
                      <div className="sm:col-span-2">
                        <label className="text-[10px] font-medium text-[#4a4260] mb-1 block">Title</label>
                        <select
                          className="w-full px-2 py-1.5 text-sm border border-[#e5d9f2] rounded-lg"
                          value={infant.title}
                          onChange={(e) => {
                            const next = [...additionalInfants];
                            next[index].title = e.target.value;
                            setAdditionalInfants(next);
                          }}
                        >
                          {ALLOWED_TITLES.map((title) => (
                            <option key={title} value={title}>{title}</option>
                          ))}
                        </select>
                      </div>
                      <div className="sm:col-span-5">
                        <label className="text-[10px] font-medium text-[#4a4260] mb-1 block">Infant {index + 1} Name</label>
                        <input type="text" className="w-full px-2 py-1.5 text-sm border border-[#e5d9f2] rounded-lg" placeholder="Name" value={infant.name} onChange={(e) => { const next = [...additionalInfants]; next[index].name = e.target.value; setAdditionalInfants(next); }} />
                      </div>
                      <div className="sm:col-span-2">
                        <label className="text-[10px] font-medium text-[#4a4260] mb-1 block">Age</label>
                        <input type="text" className="w-full px-2 py-1.5 text-sm border border-[#e5d9f2] rounded-lg bg-[#f9f7fc] text-[#6c6c6c]" placeholder="Age" value={infant.age} readOnly title="Infant age is locked from itinerary/search and cannot be changed at booking time" />
                      </div>
                      <div className="sm:col-span-2">
                        <label className="text-[10px] font-medium text-[#4a4260] mb-1 block">Nationality</label>
                        <input type="text" className="w-full px-2 py-1.5 text-sm border border-[#e5d9f2] rounded-lg bg-[#f9f7fc] text-[#4a4260] cursor-not-allowed" placeholder="IN" value={infant.nationality} readOnly title="Nationality is locked from itinerary search" />
                      </div>
                      <div className="sm:col-span-1">
                        <Button type="button" variant="ghost" size="sm" onClick={() => setAdditionalInfants(additionalInfants.filter((_, i) => i !== index))} className="h-9 w-full text-red-500 hover:text-red-700 hover:bg-red-50">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <input type="text" className="w-full px-2 py-1.5 text-sm border border-[#e5d9f2] rounded-lg" placeholder="PAN (Optional)" value={infant.panNo} onChange={(e) => { const next = [...additionalInfants]; next[index].panNo = e.target.value.toUpperCase(); setAdditionalInfants(next); }} />
                      <input type="text" className="w-full px-2 py-1.5 text-sm border border-[#e5d9f2] rounded-lg" placeholder="Passport No (Optional)" value={infant.passportNo} onChange={(e) => { const next = [...additionalInfants]; next[index].passportNo = e.target.value.toUpperCase(); setAdditionalInfants(next); }} />
                    </div>
                    {(getPassengerFieldError('infant', index, 'title') ||
                      getPassengerFieldError('infant', index, 'name') ||
                      getPassengerFieldError('infant', index, 'age') ||
                      getPassengerFieldError('infant', index, 'nationality')) && (
                      <p className="text-[11px] text-red-600">
                        {getPassengerFieldError('infant', index, 'title') ||
                          getPassengerFieldError('infant', index, 'name') ||
                          getPassengerFieldError('infant', index, 'age') ||
                          getPassengerFieldError('infant', index, 'nationality')}
                      </p>
                    )}
                  </div>
                ))}
              </div>
                </>
              )}
            </div>

            {/* Arrival Details */}
            <div className="space-y-3">
              <h3 className="font-semibold text-[#4a4260]">Arrival Details</h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium text-[#4a4260] mb-1 block">
                    Date & Time
                  </label>
                  <input
                    type="text"
                    className="w-full px-3 py-2 border border-[#e5d9f2] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#d546ab]"
                    placeholder="12-12-2025 9:00 AM"
                    value={guestDetails.arrivalDateTime}
                    onChange={(e) => {
                      void handleArrivalDateTimeChange(e.target.value);
                    }}
                  />
                </div>

                <div>
                  <label className="text-sm font-medium text-[#4a4260] mb-1 block">
                    Arrival Place
                  </label>
                  <input
                    type="text"
                    className="w-full px-3 py-2 border border-[#e5d9f2] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#d546ab]"
                    placeholder="Chennai International Airport"
                    value={guestDetails.arrivalPlace}
                    onChange={(e) => setGuestDetails({ ...guestDetails, arrivalPlace: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-[#4a4260] mb-1 block">
                  Flight Details
                </label>
                <textarea
                  className="w-full px-3 py-2 border border-[#e5d9f2] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#d546ab]"
                  rows={2}
                  placeholder="Enter the Flight Details"
                  value={guestDetails.arrivalFlightDetails}
                  onChange={(e) => setGuestDetails({ ...guestDetails, arrivalFlightDetails: e.target.value })}
                />
              </div>
            </div>

            {/* Departure Details */}
            <div className="space-y-3">
              <h3 className="font-semibold text-[#4a4260]">Departure Details</h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium text-[#4a4260] mb-1 block">
                    Date & Time
                  </label>
                  <input
                    type="text"
                    className="w-full px-3 py-2 border border-[#e5d9f2] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#d546ab]"
                    placeholder="19-12-2025 4:00 PM"
                    value={guestDetails.departureDateTime}
                    onChange={(e) => setGuestDetails({ ...guestDetails, departureDateTime: e.target.value })}
                  />
                </div>

                <div>
                  <label className="text-sm font-medium text-[#4a4260] mb-1 block">
                    Departure Place
                  </label>
                  <input
                    type="text"
                    className="w-full px-3 py-2 border border-[#e5d9f2] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#d546ab]"
                    placeholder="Trivandrum, Domestic Airport"
                    value={guestDetails.departurePlace}
                    onChange={(e) => setGuestDetails({ ...guestDetails, departurePlace: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-[#4a4260] mb-1 block">
                  Flight Details
                </label>
                <textarea
                  className="w-full px-3 py-2 border border-[#e5d9f2] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#d546ab]"
                  rows={2}
                  placeholder="Enter the Flight Details"
                  value={guestDetails.departureFlightDetails}
                  onChange={(e) => setGuestDetails({ ...guestDetails, departureFlightDetails: e.target.value })}
                />
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setConfirmQuotationModal(false);
                setGuestDetails({
                  salutation: 'Mr',
                  name: '',
                  contactNo: '',
                  age: '',
                  nationality: confirmDefaultNationality,
                  panNo: '',
                  passportNo: '',
                  alternativeContactNo: '',
                  emailId: '',
                  arrivalDateTime: '',
                  arrivalPlace: '',
                  arrivalFlightDetails: '',
                  departureDateTime: '',
                  departurePlace: '',
                  departureFlightDetails: '',
                });
                setAdditionalAdults([]);
                setAdditionalChildren([]);
                setAdditionalInfants([]);
                setPrebookData(null);
                setHasAcceptedUpdatedPrice(false);
                setFormErrors({});
                resetConfirmWalletTopUpPanel();
              }}
            >
              Cancel
            </Button>
            <Button
              type="button"
              className="bg-[#8b43d1] hover:bg-[#7c37c1]"
              onClick={() => {
                void handleConfirmQuotation();
              }}
              disabled={isConfirmingQuotation || isPrebooking || isWalletTopUpSubmitting}
            >
              {isPrebooking ? 'Running Prebook...' : isConfirmingQuotation ? 'Submitting...' : 'Confirm Booking'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ManualFitHerePreviewDialog
        open={fitHereModal.open}
        loading={fitHereModal.loading}
        loadingStepIndex={fitHereModal.loadingStepIndex}
        failedReason={fitHereModal.failedReason}
        attempt={fitHereModal.attempt}
        selectedHotspot={selectedFitHotspot}
        baseTimeline={selectedFitHereDay?.segments || []}
        onClose={handleFitHereCancel}
        onConfirm={handleConfirmFitHere}
        onRetry={handleRetryFitHere}
        confirmLoading={confirmFitHereLoading}
      />

      <AutoFitHerePreviewDialog
        open={autoFitHereModal.open}
        loading={autoFitHereModal.loading}
        failedReason={autoFitHereModal.failedReason}
        results={autoFitHereModal.results}
        selectedAnchorKey={autoFitHereModal.selectedAnchorKey}
        selectedHotspot={selectedFitHotspot}
        baseTimeline={selectedFitHereDay?.segments || []}
        loadingAnchorCount={autoFitHereModal.loadingAnchorCount || 0}
        loadingStartedAtMs={autoFitHereModal.loadingStartedAtMs || null}
        performanceSummary={autoFitHereModal.performanceSummary || null}
        onClose={() => {
          previewRequestIdRef.current += 1;
          setAutoFitHereModal({
            open: false,
            loading: false,
            failedReason: null,
            results: [],
            selectedAnchorKey: null,
            loadingAnchorCount: 0,
            loadingStartedAtMs: null,
            performanceSummary: null,
          });
        }}
        onSelectAnchorKey={(anchorKey) => {
          setAutoFitHereModal((prev) => ({
            ...prev,
            selectedAnchorKey: anchorKey,
          }));
        }}
        onConfirm={(options, attempt) => {
          void handleConfirmFitHere(options, attempt);
        }}
        confirmLoading={confirmFitHereLoading}
      />

      {itinerary?.planId && (
        <>
          <VoucherDetailsModal
            isOpen={voucherModal}
            onClose={() => setVoucherModal(false)}
            itineraryPlanId={itinerary.planId}
          />
          <PluckCardModal
            isOpen={pluckCardModal}
            onClose={() => setPluckCardModal(false)}
            itineraryPlanId={itinerary.planId}
          />
          <InvoiceModal
            isOpen={invoiceModal}
            onClose={() => setInvoiceModal(false)}
            itineraryPlanId={itinerary.planId}
            type={invoiceType}
          />
          <IncidentalExpensesModal
            isOpen={incidentalModal}
            onClose={() => setIncidentalModal(false)}
            itineraryPlanId={itinerary.planId}
            onSuccess={() => setIncidentalHistoryRefreshToken((current) => current + 1)}
          />
          <CancelItineraryModal
            open={cancelModalOpen}
            onOpenChange={setCancelModalOpen}
            itineraryPlanId={itinerary.planId ?? null}
            onSuccess={() => {
              toast.success('Itinerary data will be refreshed');
              window.location.reload();
            }}
          />
          {selectedHotelForVoucher && (
            <HotelVoucherModal
              open={hotelVoucherModalOpen}
              onOpenChange={setHotelVoucherModalOpen}
              itineraryPlanId={itinerary.planId}
              routeId={selectedHotelForVoucher.routeId}
              hotelId={selectedHotelForVoucher.hotelId}
              hotelName={selectedHotelForVoucher.hotelName}
              hotelEmail={selectedHotelForVoucher.hotelEmail}
              hotelStateCity={selectedHotelForVoucher.hotelStateCity}
              routeDates={selectedHotelForVoucher.routeDates}
              dayNumbers={selectedHotelForVoucher.dayNumbers}
              hotelDetailsIds={selectedHotelForVoucher.hotelDetailsIds}
              initialStatus={selectedHotelForVoucher.initialStatus}
              onSuccess={() => {
                refreshHotelData();
              }}
            />
          )}
        </>
      )}

    </div>
  );
};

export default ItineraryDetails;
