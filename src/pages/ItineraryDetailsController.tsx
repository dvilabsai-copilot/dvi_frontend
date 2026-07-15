// FILE: src/pages/ItineraryDetails.tsx
// Keep this as a named + default export module for router compatibility across HMR reloads.
import React, { useEffect, useMemo, useState, useRef, useCallback } from "react";
import { useParams, Link, useLocation } from "react-router-dom";
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
import { ArrowLeft, Clock, MapPin, Car, Calendar, Plus, ArrowRight, Ticket, Building2, Timer, Loader2, RefreshCw, AlertTriangle, Route, Utensils } from "lucide-react";
import { TimePickerPopover } from "@/components/itinerary/TimePickerPopover";
import { ItineraryService } from "@/services/itinerary";
import { AgentAPI } from "@/services/agentService";
import { api } from "@/lib/api";
import { IncidentalExpensesHistorySection } from "./IncidentalExpensesHistorySection";
import { ArrivalHotelDecisionModal } from "@/components/hotels/ArrivalHotelDecisionModal";
import { SupplementDisplay } from "@/components/hotels/SupplementDisplay";
import { MarkdownPreview } from "@/components/itinerary/MarkdownPreview";
import {
  buildExactManualHotspotPreviewPayload,
} from "./itinerary-details/manual-hotspot-preview.shared";
import { HotelArrivalPolicyRequest } from "@/services/itinerary";
import { toast } from "sonner";
import { useHotelHydratedDays } from "./itinerary-details/hooks/useHotelHydratedDays";
import { useHotelsForDisplay } from "./itinerary-details/hooks/useHotelsForDisplay";
import {
  DEFAULT_EXTERNAL_STAY_MESSAGE,
  useExternalStayEntries,
} from "./itinerary-details/hooks/useExternalStayEntries";
import { useNonTboSelectedHotelEntries } from "./itinerary-details/hooks/useNonTboSelectedHotelEntries";
import { useAutoFitHereAnchors } from "./itinerary-details/hooks/useAutoFitHereAnchors";
import { useVehicleRateSelectionGuard } from "./itinerary-details/hooks/useVehicleRateSelectionGuard";
import { useFitHereTimelineHelpers } from "./itinerary-details/hooks/useFitHereTimelineHelpers";
import { useTboHotelSelectionSummary } from "./itinerary-details/hooks/useTboHotelSelectionSummary";
import { hasUsableVehicleRows as hasUsableVehicleRowsUtil } from "./itinerary-details/utils/vehicleAvailability.utils";
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
import {
  findGuideAssignmentForDay,
  isAttractionCoveredByGuide as isAttractionCoveredByGuideUtil,
  isGuidePriceAvailableForDay as isGuidePriceAvailableForDayUtil,
} from "./itinerary-details/utils/guideAssignment.utils";
import { deriveHotspotCityContext as deriveHotspotCityContextUtil } from "./itinerary-details/utils/hotspotCityContext.utils";
import {
  buildFitHereAnchorKey as buildFitHereAnchorKeyUtil,
  serializeFitHereAnchor as serializeFitHereAnchorUtil,
} from "./itinerary-details/utils/fitHereAnchor.utils";
import { mapDaySegmentToPreview as mapDaySegmentToPreviewUtil } from "./itinerary-details/utils/fitHerePreviewTimeline.utils";
import {
  getAutoPreviewHighestRemovedPriority as getAutoPreviewHighestRemovedPriorityUtil,
  getAutoPreviewRemovedRows as getAutoPreviewRemovedRowsUtil,
  scoreAutoPreviewAttempt as scoreAutoPreviewAttemptUtil,
} from "./itinerary-details/utils/autoPreviewScoring.utils";
import { buildAutoPreviewAnchorProgressText as buildAutoPreviewAnchorProgressTextUtil } from "./itinerary-details/utils/autoPreviewProgress.utils";
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
  buildOccupancyPreview,
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
import { DeleteConfirmationDialog } from "./itinerary-details/components/DeleteConfirmationDialog";
import { GuideAssignmentDialog } from "./itinerary-details/components/GuideAssignmentDialog";
import { AddActivityDialog } from "./itinerary-details/components/AddActivityDialog";
import { SpecialInstructionsSection } from "./itinerary-details/components/SpecialInstructionsSection";
import { PackageIncludesCard } from "./itinerary-details/components/PackageIncludesCard";
import { ItineraryOverallCost } from "./itinerary-details/components/ItineraryOverallCost";
import { ItineraryActionButtons, type ClipboardMode } from "./itinerary-details/components/ItineraryActionButtons";
import { QuotationNonTboSelectedHotels } from "./itinerary-details/components/QuotationNonTboSelectedHotels";
import { HotspotPreviewTimelineNotices } from "./itinerary-details/components/HotspotPreviewTimelineNotices";
import { HotspotPreviewApplyAction } from "./itinerary-details/components/HotspotPreviewApplyAction";
import { QuotationWalletInsufficientPanel } from "./itinerary-details/components/QuotationWalletInsufficientPanel";
import { ItineraryDaysSection } from "./itinerary-details/components/ItineraryDaysSection";
import { HotelListLoadingState } from "./itinerary-details/components/HotelListLoadingState";
import { VehicleUnavailableState } from "./itinerary-details/components/VehicleUnavailableState";
import { ItineraryHotelListSection } from "./itinerary-details/components/ItineraryHotelListSection";
import { HotspotDialogListColumn } from "./itinerary-details/components/HotspotDialogListColumn";
import { HotspotPreviewStrategyPanel } from "./itinerary-details/components/HotspotPreviewStrategyPanel";
import { HotspotPreviewTimelineRows } from "./itinerary-details/components/HotspotPreviewTimelineRows";
import { HotspotPreviewValidationNotice } from "./itinerary-details/components/HotspotPreviewValidationNotice";
import { HotspotPreviewPane } from "./itinerary-details/components/HotspotPreviewPane";
import { ConfirmedQuoteBanner } from "./itinerary-details/components/ConfirmedQuoteBanner";
import { ItineraryHeader } from "./itinerary-details/components/ItineraryHeader";
import { ItineraryAncillaryModals } from "./itinerary-details/components/ItineraryAncillaryModals";
import { ItineraryFitHereDialogs } from "./itinerary-details/components/ItineraryFitHereDialogs";
import { ItineraryMediaDialogs } from "./itinerary-details/components/ItineraryMediaDialogs";
import { ItineraryHotelDialogs } from "./itinerary-details/components/ItineraryHotelDialogs";
import { useHotspotState } from "./itinerary-details/hooks/useHotspotState";
import { useHotspotPreviewViewModel } from "./itinerary-details/hooks/useHotspotPreviewViewModel";
import { useAutoFitHerePreviewController } from "./itinerary-details/hooks/useAutoFitHerePreviewController";
import { useFitHereConfirmationMutation } from "./itinerary-details/hooks/useFitHereConfirmationMutation";
import { useClipboardContentBuilder } from "./itinerary-details/hooks/useClipboardContentBuilder";
import { useDisplayItineraryDays } from "./itinerary-details/hooks/useDisplayItineraryDays";
import { useSourcePreviewController } from "./itinerary-details/hooks/useSourcePreviewController";
import { useRouteHotelDetailsCache } from "./itinerary-details/hooks/useRouteHotelDetailsCache";
import { getFitHereTriedState } from "./itinerary-details/utils/fitHereAttemptStatus.utils";
import {
  buildCurrentRouteAttractionHotspotIds,
  buildCurrentRouteManualHotspotIds,
  buildCurrentRouteManualHotspotMetaById,
} from "./itinerary-details/utils/routeHotspotIds.utils";
import { useFitHereHotspotSelection } from "./itinerary-details/hooks/useFitHereHotspotSelection";
import { useItineraryRouteState } from "./itinerary-details/hooks/useItineraryRouteState";
import { useQuotationState, type AdditionalPassenger } from "./itinerary-details/hooks/useQuotationState";
import { useHotelSelectionState } from "./itinerary-details/hooks/useHotelSelectionState";
import { useMediaShareState } from "./itinerary-details/hooks/useMediaShareState";
import { useHotelWorkflowState } from "./itinerary-details/hooks/useHotelWorkflowState";
import { useActivityState } from "./itinerary-details/hooks/useActivityState";
import { useGuideModalController } from "./itinerary-details/hooks/useGuideModalController";
import { useGuideDeleteMutation } from "./itinerary-details/hooks/useGuideDeleteMutation";
import { useActivityPreviewController } from "./itinerary-details/hooks/useActivityPreviewController";
import { useActivityAvailabilityLoader } from "./itinerary-details/hooks/useActivityAvailabilityLoader";
import { useActivityMutationController } from "./itinerary-details/hooks/useActivityMutationController";
import { useVehicleOnlyClipboardAction } from "./itinerary-details/hooks/useVehicleOnlyClipboardAction";
import { useQuotationPassengerValidation } from "./itinerary-details/hooks/useQuotationPassengerValidation";
import { useQuotationConfirmationCompletion } from "./itinerary-details/hooks/useQuotationConfirmationCompletion";
import { useQuotationBookingGuards } from "./itinerary-details/hooks/useQuotationBookingGuards";
import { useVehicleBuildController } from "./itinerary-details/hooks/useVehicleBuildController";
import { usePreparedItineraryPageLoader } from "./itinerary-details/hooks/usePreparedItineraryPageLoader";
import { useRouteRebuildMutation } from "./itinerary-details/hooks/useRouteRebuildMutation";
import { useRouteTimePatchMutation } from "./itinerary-details/hooks/useRouteTimePatchMutation";
import { useArrivalPolicyRouteTimeController } from "./itinerary-details/hooks/useArrivalPolicyRouteTimeController";
import { useHotelArrivalPolicyController } from "./itinerary-details/hooks/useHotelArrivalPolicyController";
import { useMediaModalController } from "./itinerary-details/hooks/useMediaModalController";
import { useEnsureHotelDetailsLoaded } from "./itinerary-details/hooks/useEnsureHotelDetailsLoaded";
import { useQuotationConfirmationModalController } from "./itinerary-details/hooks/useQuotationConfirmationModalController";
import { useQuotationConfirmationSubmission } from "./itinerary-details/hooks/useQuotationConfirmationSubmission";
import { useGuideAvailabilityLoader } from "./itinerary-details/hooks/useGuideAvailabilityLoader";
import { useGuideAssignmentSaveMutation } from "./itinerary-details/hooks/useGuideAssignmentSaveMutation";
import { mergeHotelSelections } from "./itinerary-details/hooks/useHotelSelectionsChangeMutation";
import {
  buildArrivalPolicyDecisionKey,
  getRequestArrivalPolicyDecisionKey,
} from "./itinerary-details/utils/routeArrivalPolicy.utils";
import { VehicleSection } from "./itinerary-details/components/VehicleSection";
import { QuotationPassengerNotice } from "./itinerary-details/QuotationPassengerNotice";
import { QuotationPrebookLoadingNotice } from "./itinerary-details/QuotationPrebookLoadingNotice";
import { QuotationAgentSummary } from "./itinerary-details/QuotationAgentSummary";
import { QuotationRoomingPreview } from "./itinerary-details/QuotationRoomingPreview";
import { QuotationWalletTopUpActions } from "./itinerary-details/QuotationWalletTopUpActions";
import { QuotationPrebookHotelRows } from "./itinerary-details/QuotationPrebookHotelRows";
import { QuotationPrebookAcceptanceNotice } from "./itinerary-details/QuotationPrebookAcceptanceNotice";
import { HotspotDialogHeader } from "./itinerary-details/components/HotspotDialogHeader";
import { HotspotSelectionNotice } from "./itinerary-details/components/HotspotSelectionNotice";
import { HotspotDialogFooter } from "./itinerary-details/components/HotspotDialogFooter";
import { HotspotApplyButton } from "./itinerary-details/components/HotspotApplyButton";
import { HotspotFitHereTimelineRows } from "./itinerary-details/components/HotspotFitHereTimelineRows";
import { HotspotFitHereEmptyState } from "./itinerary-details/components/HotspotFitHereEmptyState";
import { HotspotFitHereSelectionHeader } from "./itinerary-details/components/HotspotFitHereSelectionHeader";
import { HotspotPreviewLoadingState } from "./itinerary-details/components/HotspotPreviewLoadingState";
import { HotspotPreviewRescheduleNotice } from "./itinerary-details/components/HotspotPreviewRescheduleNotice";
import { HotspotPreviewRouteFitNotice } from "./itinerary-details/components/HotspotPreviewRouteFitNotice";
import { HotspotPreviewEmptyTimeline } from "./itinerary-details/components/HotspotPreviewEmptyTimeline";
import { HotspotPreviewOverflowResolvedHeader } from "./itinerary-details/components/HotspotPreviewOverflowResolvedHeader";
import { HotspotPreviewResolvedTimelineNotice } from "./itinerary-details/components/HotspotPreviewResolvedTimelineNotice";
import { HotspotPreviewOverflowLeakNotice } from "./itinerary-details/components/HotspotPreviewOverflowLeakNotice";
import { HotspotPreviewDayEndOverflowNotice } from "./itinerary-details/components/HotspotPreviewDayEndOverflowNotice";
import { QuotationNonTboAcceptanceNotice } from "./itinerary-details/QuotationNonTboAcceptanceNotice";
import { QuotationConfirmationDialog } from "./itinerary-details/components/QuotationConfirmationDialog";
import { useQuotationHotelSelectionPreparation } from "./itinerary-details/hooks/useQuotationHotelSelectionPreparation";
import { useHotspotAddMutation } from "./itinerary-details/hooks/useHotspotAddMutation";
import { useAddHotspotModalController } from "./itinerary-details/hooks/useAddHotspotModalController";
import { useHotspotMatrixPreviewController } from "./itinerary-details/hooks/useHotspotMatrixPreviewController";
import { useHotspotPreviewMutation } from "./itinerary-details/hooks/useHotspotPreviewMutation";
import { useHotspotPriorityReplacementController } from "./itinerary-details/hooks/useHotspotPriorityReplacementController";
import { useFitHerePreviewController } from "./itinerary-details/hooks/useFitHerePreviewController";
import { useFitHereDialogController } from "./itinerary-details/hooks/useFitHereDialogController";
import { useFitHereConfirmationReset } from "./itinerary-details/hooks/useFitHereConfirmationReset";
import { useFitHereConfirmationState } from "./itinerary-details/hooks/useFitHereConfirmationState";
import { useFitHereConfirmationRefresh } from "./itinerary-details/hooks/useFitHereConfirmationRefresh";
import { useHotspotDeleteMutation } from "./itinerary-details/hooks/useHotspotDeleteMutation";
import { useWalletTopUpController } from "./itinerary-details/hooks/useWalletTopUpController";
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
import { useRouteOptionSwitchController } from "./itinerary-details/hooks/useRouteOptionSwitchController";
import { useHotelSearchSelectionMutation } from "./itinerary-details/hooks/useHotelSearchSelectionMutation";
import { useSelectedHotelSummary } from "./itinerary-details/hooks/useSelectedHotelSummary";
import { useComputedHotelCost } from "./itinerary-details/hooks/useComputedHotelCost";
import { useComputedVehicleTotals } from "./itinerary-details/hooks/useComputedVehicleTotals";
import { extractTravelFromToFromText as extractTravelFromToFromTextUtil, extractTravelToFromText as extractTravelToFromTextUtil } from "./itinerary-details/utils/hotspotText.utils";
import { normalizeRouteFamilyBaseQuoteId } from "./itinerary-details/utils/routeFamily.utils";
import { useEntryTicketSummary } from "./itinerary-details/hooks/useEntryTicketSummary";
import { useFinancialTotals } from "./itinerary-details/hooks/useFinancialTotals";
import { useRoomBreakdownNights } from "./itinerary-details/hooks/useRoomBreakdownNights";
import { useItinerarySummaryValues } from "./itinerary-details/hooks/useItinerarySummaryValues";
import { useParaRecommendations } from "./itinerary-details/hooks/useParaRecommendations";
import { PAGE_LOADER_STAGE_DETAILS } from "./itinerary-details/itinerary-details.constants";
import { canViewItineraryCostBreakdown, getAuthenticatedRole } from "@/lib/itinerary-cost-visibility";

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
  const canViewCostBreakdown = canViewItineraryCostBreakdown();
  const isAgentLogin = getAuthenticatedRole() === 4;
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

  const extractTravelToFromText = extractTravelToFromTextUtil;
  const extractTravelFromToFromText = extractTravelFromToFromTextUtil;

  const mapDaySegmentToPreview = useCallback(
    (segment: ItinerarySegment) => mapDaySegmentToPreviewUtil(segment, extractTravelToFromText),
    [extractTravelToFromText],
  );

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

  const hotelsForDisplay = useHotelsForDisplay({
    hotelDetails,
    itineraryDays: itinerary?.days,
    itineraryDayCount: itinerary?.dayCount,
    shouldShowHotels,
    activeHotelGroupType,
    hotelReadOnly,
  });

  const financialTotals = useFinancialTotals({
    costBreakdown: itinerary?.costBreakdown,
    overallCost: itinerary?.overallCost,
    computedHotelCost,
    computedVehicleAmount,
    shouldShowHotels,
    shouldShowVehicles,
    hasRequiredVehicleSelection,
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

  const hotelHydratedDays = useHotelHydratedDays({
    itineraryDays: itinerary?.days,
    selectedHotelMetaByRoute,
  });

  const displayDays = useDisplayItineraryDays({
    hotelHydratedDays,
    itineraryDays: itinerary?.days,
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

  const {
    prebookTotalAmount,
    selectedTboHotelTotal,
    hasSelectedTboHotels,
    requiresDetailedPassengerFlow,
    hasPrebookPriceChanged,
    prebookHotelEntries,
  } = useTboHotelSelectionSummary({
    selectedHotelBookings,
    prebookData,
    requiresHotelBookingFlow,
  });
  const { getCoveredRouteIdsFromHotelSelections, selectedHotelCoveredRouteIds } = useHotelSelectionCoverage({
    selectedHotelBookings,
  });

  // Non-TBO user-selected hotels — shown in the review modal but NOT sent to prebook API
  const nonTboSelectedHotelEntries = useNonTboSelectedHotelEntries({
    selectedHotelBookings,
    selectedHotelCoveredRouteIds,
    hotelDetails,
  });

  const externalStayEntries = useExternalStayEntries({
    hotelDetails,
    activeHotelGroupType,
  });

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

  const TBO_SESSION_WINDOW_MS = 35 * 60 * 1000;
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


  // Hotel voucher modal state
  const [hotelVoucherModalOpen, setHotelVoucherModalOpen] = useState(false);
  const [selectedHotelForVoucher, setSelectedHotelForVoucher] = useState<HotelVoucherItem | null>(null);

  const {
    handleHotelGroupTypeChange,
    handleRebuildHotels,
    refreshHotelData,
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
    setSelectedHotelBookings((previous) => mergeHotelSelections(previous, selections));
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

  const hasUsableVehicleRows = hasUsableVehicleRowsUtil;

  const prepareVehicleBuild = useVehicleBuildController({
    pushPageLoaderStage,
    hasUsableVehicleRows,
    setVehicleBuildStatus,
    setVehicleBuildError,
  });

  const loadPreparedItineraryPage = usePreparedItineraryPageLoader({
    isMountedRef,
    latestRouteRequestRef,
    currentFetchRef,
    setLoading,
    setLoadingHotels,
    setPageReady,
    setError,
    setPageLoaderHistory,
    pushPageLoaderStage,
    getDetailsDeduped,
    loadHotelDetailsForItinerary,
    cacheRouteHotelDetails,
    setItinerary,
    setHotelDetails,
    setActiveHotelListTotal,
    setVehicleBuildStatus,
    setVehicleBuildError,
    prepareVehicleBuild,
  });

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
  const ensureHotelDetailsLoaded = useEnsureHotelDetailsLoaded({
    quoteId,
    itinerary,
    hotelDetails,
    setHotelDetails,
    setLoadingHotels,
    loadHotelDetailsForItinerary,
  });
  const handleDeleteHotspot = useHotspotDeleteMutation({
    deleteHotspotModal,
    itinerary,
    quoteId: quoteId || null,
    shouldShowHotels,
    addHotspotModalOpen: addHotspotModal.open,
    selectedHotspotAnchor,
    normalizeAvailableHotspots,
    setIsDeleting,
    setAddedInModalHotspotIds,
    setExcludedHotspotIds,
    setItinerary,
    setAvailableHotspots,
    setDeleteHotspotModal,
    setRouteNeedsRebuild,
    setHotelDetails,
    setHotspotFilterMeta,
  });

  const handleRebuildRoute = useRouteRebuildMutation({
    quoteId: quoteId || null,
    itinerary,
    shouldShowHotels,
    setItinerary,
    setHotelDetails,
    setIsRebuilding,
    setRouteProgressTitle,
    setRouteProgressHistory,
    setRouteTimeEstimatedMs,
    setRouteNeedsRebuild,
    getRouteTimeUpdateEstimateMs,
    startRouteTimeProgress,
    stopRouteTimeProgress,
    pushRouteProgressStage,
  });

  const dayHasManualInserts = (day): boolean => {
    const segments = Array.isArray(day?.segments) ? day.segments : [];
    return segments.some((seg) => (
      String(seg?.type || '').toLowerCase() === 'attraction'
      && (seg?.planOwnWay === true || seg?.isManual === true)
    ));
  };

  const applyRouteTimePatch = useRouteTimePatchMutation({
    quoteId: quoteId || null,
    hotelDetails,
    setIsApplyingRouteTimeUpdate,
    getRouteTimeUpdateEstimateMs,
    setRouteTimeEstimatedMs,
    setRouteProgressTitle,
    setRouteProgressHistory,
    startRouteTimeProgress,
    stopRouteTimeProgress,
    pushRouteProgressStage,
    setItinerary,
    setHotelDetails,
    setRouteTimeProgressPercent,
    setPendingScrollDayNumber,
  });

  const {
    handleUpdateRouteTimesDirect: handleUpdateRouteTimesDirectFromHook,
    persistArrivalPolicyDecision: persistArrivalPolicyDecision,
  } = useArrivalPolicyRouteTimeController({
    itinerary,
    requiresHotelBookingFlow,
    applyRouteTimePatch,
    setIsResolvingArrivalPolicy,
    setPendingRouteTimeUpdate,
    setArrivalPolicyConfirmModal,
  });

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

  const openAddActivityModal = useActivityAvailabilityLoader({
    setAddActivityModal,
    setActivityPreview,
    setPreviewingActivityId,
    setAvailableActivities,
    setLoadingActivities,
  });

  const { handleAddActivity, handleDeleteActivity } = useActivityMutationController({
    addActivityModal,
    activityPreview,
    deleteActivityModal,
    quoteId: quoteId || null,
    shouldShowHotels,
    setIsAddingActivity,
    setIsDeletingActivity,
    setAddActivityModal,
    setDeleteActivityModal,
    setActivityPreview,
    setPreviewingActivityId,
    setItinerary,
    setHotelDetails,
    setActiveHotelListTotal,
  });

const getSelectedPreviewActivity = () =>
  availableActivities.find((activity) => activity.id === activityPreview?.activity?.id) || null;

  const { handleOpenPreviewAllHotspots, handlePreviewActivity } = useActivityPreviewController({
    addActivityModal,
    setPreviewingActivityId,
    setActivityPreview,
    setAllHotspotsPreviewModal,
  });

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

  const openGuideModal = useGuideModalController({
    readOnly,
    itineraryPlanId: Number(itinerary?.planId || 0),
    setGuideModal,
  });

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

  const loadGuideAvailability = useGuideAvailabilityLoader({
    setGuideAvailability,
    setGuideAvailabilityLoading,
  });

  const getGuideAssignmentForDay = useCallback(
    (day: ItineraryDay) => findGuideAssignmentForDay(guideAssignments, day),
    [guideAssignments],
  );

  const isGuidePriceAvailableForDay = useCallback(
    (day: ItineraryDay) => isGuidePriceAvailableForDayUtil(
      guideAvailability,
      itinerary?.guideForItinerary,
      day,
    ),
    [guideAvailability, itinerary?.guideForItinerary],
  );

  const isAttractionCoveredByGuide = (
    segment: AttractionSegment,
    assignment: ItineraryGuideAssignment | null,
  ): boolean => isAttractionCoveredByGuideUtil(segment, assignment, parseDisplayMinutes);

  useEffect(() => {
    const planId = Number(itinerary?.planId || 0);

    if (!(planId > 0)) {
      setGuideAvailability(null);
      return;
    }

    void loadGuideAvailability(planId);
  }, [itinerary?.planId, loadGuideAvailability]);

  const handleSaveGuideAssignment = useGuideAssignmentSaveMutation({
    guideModal,
    itineraryDays: itinerary?.days,
    refreshGuideData,
    setGuideAssignments,
    setGuideModal,
    setItinerary,
  });

  const handleDeleteGuideAssignment = useGuideDeleteMutation({
    itineraryPlanId: Number(itinerary?.planId || 0),
    deleteGuideModal,
    refreshGuideData,
    setDeleteGuideModal,
  });

  useEffect(() => {
    const planId = Number(itinerary?.planId || 0);
    if (!(planId > 0)) {
      setGuideAssignments([]);
      return;
    }
    void loadGuideAssignments(planId);
  }, [itinerary?.planId, loadGuideAssignments]);

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

  const buildFitHereAnchorKey = buildFitHereAnchorKeyUtil;

  const serializeFitHereAnchor = useCallback(serializeFitHereAnchorUtil, []);

  const buildAutoFitHereAnchorsForDay = useAutoFitHereAnchors({
    buildFitHereAnchorForTimelineRow,
  });

  const getAutoPreviewRemovedRows = getAutoPreviewRemovedRowsUtil;
  const getAutoPreviewHighestRemovedPriority = getAutoPreviewHighestRemovedPriorityUtil;
  const scoreAutoPreviewAttempt = scoreAutoPreviewAttemptUtil;

  const buildAutoPreviewAnchorProgressText = useCallback(buildAutoPreviewAnchorProgressTextUtil, []);

  const handleSelectFitHotspot = useFitHereHotspotSelection({
    previewRequestIdRef,
    stopFitHereProgressTimer,
    setSelectedFitHotspot,
    setTriedFitHereAnchors,
    setFitHereModal,
    setAutoFitHereModal,
    resetManualHotspotPreviewState,
    setActivePreviewHotspotId,
    setSelectedHotspotIds,
  });

  const handleFitHereClick = useFitHerePreviewController({
    selectedFitHotspot,
    itineraryPlanId: itinerary?.planId || null,
    buildFitHereAnchorKey,
    startFitHereProgressTimer,
    stopFitHereProgressTimer,
    setFitHereModal,
  });

  const handleAutoPreviewFitHere = useAutoFitHerePreviewController({
    itineraryPlanId: itinerary?.planId,
    selectedFitHereDay,
    buildAutoFitHereAnchorsForDay,
    buildFitHereAnchorKey,
    serializeFitHereAnchor,
    buildAutoPreviewAnchorProgressText,
    setSelectedFitHotspot,
    setActivePreviewHotspotId,
    setSelectedHotspotIds,
    setFitHereModal,
    setAutoFitHereModal,
    previewRequestIdRef,
    resetManualHotspotPreviewStateButKeepActiveHotspot,
    stopFitHereProgressTimer,
  });

  const { handleFitHereCancel, handleRetryFitHere } = useFitHereDialogController({
    fitHereModal,
    stopFitHereProgressTimer,
    getFitHereTriedState,
    setTriedFitHereAnchors,
    setFitHereModal,
    handleFitHereClick,
  });

  const resetFitHereAfterConfirmation = useFitHereConfirmationReset({
    setSelectedFitHotspot,
    setActivePreviewHotspotId,
    setSelectedHotspotIds,
    setManualPreviewState,
    setPreviewTimelinesByHotspot,
    setPreviewResolutionsByHotspot,
    setGroupPreviewTimeline,
    setGroupPreviewResolution,
    setTempModalTimeline,
    setFitHereModal,
    setAutoFitHereModal,
    setTriedFitHereAnchors,
  });

  const applyFitHereConfirmationState = useFitHereConfirmationState({
    itinerary,
    availableHotspots,
    setAddedInModalHotspotIds,
    setExcludedHotspotIds,
    setAvailableHotspots,
    setItinerary,
    setRouteNeedsRebuild,
  });

  const refreshAfterFitHereConfirmation = useFitHereConfirmationRefresh({
    quoteId,
    shouldShowHotels,
    setItinerary,
    setHotelDetails,
  });

  const getFitHereRefreshScrollStorageKey = useCallback(() => {
    const normalizedQuoteId = String(quoteId || "").trim();
    return normalizedQuoteId ? `fit-here-refresh-day:${normalizedQuoteId}` : null;
  }, [quoteId]);

  const handleConfirmFitHere = useFitHereConfirmationMutation({
    itinerary,
    fitHereModal,
    selectedFitHotspot,
    selectedFitHereDay,
    fallbackRouteId: addHotspotModal.routeId,
    handleFitHereClick,
    stopFitHereProgressTimer,
    setConfirmFitHereLoading,
    resetFitHereAfterConfirmation,
    applyFitHereConfirmationState,
    refreshAfterFitHereConfirmation,
    getFitHereRefreshScrollStorageKey,
  });
  const { handlePreviewHotspot, handleRemovePreviewHotspot } = useHotspotPreviewMutation({
    addHotspotModal,
    activePreviewHotspotId,
    selectedHotspotAnchor,
    previewRequestIdRef,
    timelinePreviewRef,
    resetManualHotspotPreviewState,
    getManualTimingPolicyFromPreview,
    setActivePreviewHotspotId,
    setSelectedHotspotIds,
    setForceReplacementApprovedByHotspot,
    setTopPriorityReplacementApproved,
    setIsPreviewingHotspotId,
    setManualPreviewState,
    setPreviewTimelinesByHotspot,
    setPreviewResolutionsByHotspot,
    setGroupPreviewResolution,
  });

  const { handleConfirmPriorityReplacement, handleCancelPriorityReplacement } = useHotspotPriorityReplacementController({
    groupPreviewResolution,
    pendingPriorityReplacementHotspotId,
    selectedHotspotId,
    selectedHotspotIds,
    handlePreviewHotspot,
    handleRemovePreviewHotspot,
    setForceReplacementApprovedByHotspot,
    setTopPriorityReplacementApproved,
  });

  const handleBuildMatrixAndPreviewAgain = useHotspotMatrixPreviewController({
    activePreviewHotspotId,
    planId: addHotspotModal.planId,
    routeId: addHotspotModal.routeId,
    isDestinationSideManualPreview,
    resetManualHotspotPreviewStateButKeepActiveHotspot,
    handlePreviewHotspot,
    setIsBuildingMatrix,
  });

  const handleAddHotspot = useHotspotAddMutation({
    readOnly,
    addHotspotModal,
    selectedHotspotAnchor,
    activePreviewResolution,
    manualPreviewState,
    activePreviewHotspotId,
    groupPreviewResolution,
    topPriorityReplacementApproved,
    selectedPreviewSegments,
    currentRouteAttractionHotspotIds,
    addedInModalHotspotIds,
    selectedHotspotIds,
    itinerary,
    quoteId: quoteId || null,
    shouldShowHotels,
    normalizeAvailableHotspots,
    getManualTimingPolicyFromPreview,
    filterAvailableHotspotsForAnchor,
    resetManualHotspotPreviewState,
    setIsAddingHotspot,
    setIsApplyingPreviewHotspot,
    setAddedInModalHotspotIds,
    setAvailableHotspots,
    setRouteNeedsRebuild,
    setActivePreviewHotspotId,
    setItinerary,
    setHotelDetails,
    setHotspotFilterMeta,
  });

  const { toImgSrc, openGalleryModal, openVideoModal } = useMediaModalController({
    setGalleryModal,
    setGalleryActiveIdx,
    setVideoModal,
  });
  const {
    applyArrivalPolicyDecision,
    resolveArrivalPolicyForArrivalTimeChange,
    handleArrivalDateTimeChange,
    openHotelSelectionModal,
  } = useHotelArrivalPolicyController({
    itinerary,
    guestDetails,
    latestArrivalPolicy,
    lastArrivalPolicyDecisionKey,
    setGuestDetails,
    setHotelSearchChildAges,
    setHotelSelectionModal,
    setIsResolvingArrivalPolicy,
    setLatestArrivalPolicy,
    setArrivalPolicyConfirmModal,
    ensureHotelDetailsLoaded,
    parseDisplayTimeToHms,
    isEarlyMorningTime,
    normalizeDateToYmd,
    buildArrivalPolicyDecisionKey,
  });
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

  const handleSelectHotelFromSearch = useHotelSearchSelectionMutation({
    readOnly,
    quoteId: quoteId || null,
    shouldShowHotels,
    selectedMealPlan,
    hotelSelectionModal,
    prebookDataRef,
    parseStaahSearchReference,
    isSupplierBookableHotel,
    getSafeErrorMessage,
    setIsSelectingHotel,
    setSelectedHotelBookings,
    setPrebookData,
    setHasAcceptedUpdatedPrice,
    setHotelSelectionModal,
    setHotelSearchQuery,
    setSelectedMealPlan,
    setItinerary,
    setHotelDetails,
  });

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

  const openConfirmQuotationModal = useQuotationConfirmationModalController({
    itinerary,
    hotelDetails: hotelDetails as unknown as { hotels?: Array<Record<string, unknown>>; hotelTabs?: Array<{ groupType?: number }> } | null,
    guestDetails,
    confirmDefaultNationality,
    requiresDetailedPassengerFlow,
    isVehicleOnlyItinerary,
    isOpeningConfirmQuotation,
    selectedHotelBookings: selectedHotelBookings as unknown as Record<number, Record<string, unknown>>,
    activeHotelGroupType,
    prebookDataRef: prebookDataRef as unknown as React.MutableRefObject<unknown | null>,
    tboSessionWindowMs: TBO_SESSION_WINDOW_MS,
    nonTboSelectedHotelEntries: nonTboSelectedHotelEntries as unknown as Array<Record<string, unknown>>,
    setIsOpeningConfirmQuotation,
    setConfirmQuotationModal,
    setPrebookData: (data) => setPrebookData(data as typeof prebookData),
    setHasAcceptedUpdatedPrice,
    setConfirmOccupanciesTemplate,
    setFormErrors,
    resetConfirmWalletTopUpPanel,
    setAdditionalAdults,
    setAdditionalChildren,
    setAdditionalInfants,
    setWalletBalance,
    setWalletBalanceAmount,
    setAgentInfo,
    setConfirmDefaultNationality,
    setGuestDetails,
    setSelectedHotelBookings: (updater) => setSelectedHotelBookings((previous) => updater(previous as unknown as Record<number, Record<string, unknown>>) as unknown as typeof previous),
    setIsPrebooking,
    refreshConfirmWalletBalance,
    getCoveredRouteIdsFromHotelSelections: getCoveredRouteIdsFromHotelSelections as (selections: Record<number, Record<string, unknown>>) => Set<number>,
    normalizeHotelProvider: normalizeHotelProvider as (hotel: Record<string, unknown>) => string,
    isSupplierBookableHotel: isSupplierBookableHotel as (hotel: Record<string, unknown>) => boolean,
    parseStaahSearchReference,
    getHotelSelectionAmount: getHotelSelectionAmount as (hotel: Record<string, unknown>) => number,
  });
  const validateQuotationPassengers = useQuotationPassengerValidation({
    guestDetails,
    additionalAdults,
    additionalChildren,
    additionalInfants,
    requiresDetailedPassengerFlow,
    expectedAdults: Math.max(Number(itinerary?.adults || 0) - 1, 0),
    expectedChildren: Math.max(Number(itinerary?.children || 0), 0),
    expectedInfants: Math.max(Number(itinerary?.infants || 0), 0),
    setFormErrors,
  });

  const prepareQuotationHotelSelections = useQuotationHotelSelectionPreparation({
    selectedHotelBookings: selectedHotelBookings as unknown as Record<number, Record<string, unknown>>,
    hotelDetails: hotelDetails as unknown as { hotels?: Array<Record<string, unknown>>; hotelTabs?: Array<{ groupType?: number }> } | null,
    activeHotelGroupType,
    requiresHotelBookingFlow,
    itineraryDays: itinerary?.days || [],
    defaultExternalStayMessage: DEFAULT_EXTERNAL_STAY_MESSAGE,
    normalizeHotelProvider: normalizeHotelProvider as (hotel: Record<string, unknown>) => string,
    isSupplierBookableHotel: isSupplierBookableHotel as (hotel: Record<string, unknown>) => boolean,
    parseStaahSearchReference,
    getHotelSelectionAmount: getHotelSelectionAmount as (hotel: Record<string, unknown>) => number,
    getCoveredRouteIdsFromHotelSelections: getCoveredRouteIdsFromHotelSelections as (selections: Record<number, Record<string, unknown>>) => Set<number>,
    setSelectedHotelBookings: (updater: (previous: Record<number, Record<string, unknown>>) => Record<number, Record<string, unknown>>) => setSelectedHotelBookings((previous) => updater(previous as unknown as Record<number, Record<string, unknown>>) as unknown as typeof previous),
  });

  const completeQuotationConfirmation = useQuotationConfirmationCompletion({
    confirmDefaultNationality,
    setConfirmQuotationModal,
    setLoadingHotels,
    setActiveHotelListTotal,
    setSelectedVehicleTotalsByType,
    setSelectedHotelBookings: (bookings) => setSelectedHotelBookings(bookings as unknown as typeof selectedHotelBookings),
    setActiveHotelGroupType,
    loadConfirmedHotelsFromDb,
    setItinerary,
    setHotelDetails,
    setGuestDetails,
    setAdditionalAdults,
    setAdditionalChildren,
    setAdditionalInfants,
    setPrebookData: (data) => setPrebookData(data as typeof prebookData),
    prebookDataRef: prebookDataRef as unknown as React.MutableRefObject<unknown>,
    setHasAcceptedUpdatedPrice,
    setFormErrors,
  });

  const validateQuotationBookingGuards = useQuotationBookingGuards({
    requiresHotelBookingFlow,
    externalStayCount: externalStayEntries.length,
    tboSessionWindowMs: TBO_SESSION_WINDOW_MS,
    prebookData,
    prebookDataRef: prebookDataRef as unknown as React.MutableRefObject<Record<string, unknown> | null>,
    hasAcceptedUpdatedPrice,
    setPrebookData: (data) => setPrebookData(data as typeof prebookData),
    setHasAcceptedUpdatedPrice,
  });
  const handleConfirmQuotation = useQuotationConfirmationSubmission({
    itinerary,
    guestDetails,
    confirmDefaultNationality,
    additionalAdults,
    additionalChildren,
    additionalInfants,
    confirmOccupanciesTemplate,
    requiresHotelBookingFlow,
    canConfirmQuotation,
    requiresDetailedPassengerFlow,
    hasAcceptedUpdatedPrice,
    shouldEnableWalletTopUpOnConfirm,
    agentInfo,
    confirmRequiredAmount,
    prebookHotelEntries: prebookHotelEntries as readonly Record<string, unknown>[],
    externalStayEntries: externalStayEntries as readonly Record<string, unknown>[],
    validateQuotationPassengers,
    prepareQuotationHotelSelections,
    validateQuotationBookingGuards: validateQuotationBookingGuards as unknown as (hotelBookings: readonly Record<string, unknown>[]) => Promise<{ clientIp?: string } | null>,
    completeQuotationConfirmation,
    refreshConfirmWalletBalance,
    prepareWalletTopUpPanel,
    resetConfirmWalletTopUpPanel,
    setFormErrors,
    setIsConfirmingQuotation,
    setLoadingHotels,
    setIsPrebooking,
    isSupplierBookableHotel: isSupplierBookableHotel as (hotel: Record<string, unknown>) => boolean,
    inferHotelProvider: inferHotelProvider as (hotel: Record<string, unknown>) => string,
  });

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

useRelatedRouteOptionsLoader({ quoteId, itinerary, setLatestRouteOptions });

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
  const handleClipboardMode = (mode: ClipboardMode) => {
    if (itineraryPreference === 2) {
      handleVehicleOnlyClipboardCopyRefactored(mode);
      return;
    }
    setClipboardType(mode);
    setSelectedHotels(buildDefaultClipboardSelection());
    setClipboardModal(true);
  };

  const handleCopyLink = () => {
    void navigator.clipboard.writeText(window.location.href);
    toast.success("Link copied to clipboard!");
  };

  const handleShareWhatsApp = () => {
    const message = `Check out this itinerary: ${window.location.href}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, "_blank");
  };

  const handleShareEmail = () => setShareModal(true);

  const hotspotForceConflictMode = (
    (backendForceConflictState.canForceConflict || backendForceConflictState.finalConflictModeOnly)
    && activePreviewValidation?.readyToApply === false
    && activePreviewValidation?.requiresPriorityConfirmation !== true
    && !matrixApplyBlocked
  );
  const hotspotEffectiveDecisionBlocked = confirmActionConfig.disabled && !hotspotForceConflictMode;
  const hotspotBlockForValidation = activePreviewValidation?.readyToApply === false && !hotspotForceConflictMode;
  const hotspotApplyLabel = isCurrentPreviewAlreadyAdded
    ? "Added"
    : isMatrixMissingBlockedState || matrixRequiresBuild
      ? "Build matrix from the warning box above"
      : isMatrixBuiltButNoFeasibleSlot && !(
        isManualRelaxedRouteFitPolicy(manualPreviewState)
        || isManualRelaxedRouteFitPolicy(activePreviewResolution)
        || isManualRelaxedRouteFitPolicy(groupPreviewResolution)
      )
        ? "Cannot Add - Off Route"
        : matrixApplyBlocked
          ? "Cannot Apply"
          : activePreviewValidation?.requiresForceConfirmation === true
            ? "Confirm Force Add (Opening / Timing Conflict)"
            : hotspotForceConflictMode
              ? "Confirm Force Add (Conflict)"
              : confirmActionConfig.label;

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


      {/* Daily Itinerary */}
      <ItineraryDaysSection context={{
        displayDays, getDisplayDistances, getGuestFoodPreferenceText, itinerary, guideAssignments, readOnly,
        guideAvailability, guideAvailabilityLoading, isGuidePriceAvailableForDay, getGuideAssignmentForDay,
        routeNeedsRebuild, summaryStickyHeight, isRebuilding, handleRebuildRoute, handleUpdateRouteTimesDirectFromHook,
        openSourcePreview, openAddHotspotModal, handleWholeItineraryGuideClick, handleAddGuideClick, openGuideModal, setDeleteGuideModal,
        destinationHotelDisplayName, selectedHotelMetaByRoute, hotelDetails, hotelReadOnly, openDeleteHotspotModal,
        openAddActivityModal, openGalleryModal, openVideoModal, openDeleteActivityModal, toImgSrc, isAttractionCoveredByGuide,
        openHotelSelectionModal, setRoomSelectionModal, toast, extractTravelFromToFromText, extractTravelToFromText,
      }} />
      {/* Special Instructions — outside the sticky summary and before hotel/vehicle lists */}
      <SpecialInstructionsSection text={specialInstructionsText} />

      {/* Hotel List (separate component) */}
      {shouldRenderBottomHotelList && shouldShowHotels && loadingHotels && (
        <HotelListLoadingState hotelListRef={hotelListRef} summaryStickyHeight={summaryStickyHeight} />
      )}

      {shouldRenderBottomHotelList && shouldShowHotels && !loadingHotels && hotelDetails && (
        <ItineraryHotelListSection
          hotelListRef={hotelListRef}
          summaryStickyHeight={summaryStickyHeight}
          hotels={hotelsForDisplay}
          restrictedHotels={hotelDetails.restrictedHotels || []}
          hotelTabs={hotelDetails.hotelTabs}
          hotelRatesVisible={hotelDetails.hotelRatesVisible}
          showHotelMargins={Boolean(hotelDetails.showHotelMargins)}
          roomCount={Number(itinerary.roomCount || 1)}
          onTotalChange={(total) => { if (!hotelReadOnly) setActiveHotelListTotal(Number(total || 0)); }}
          onToggleHotelRates={(visible) => setClipboardRatesVisible(visible)}
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
          dayDestinationFallback={itinerary?.days?.reduce<Record<number, string>>((acc, day) => { const fallback = String(day.arrival || day.departure || '').trim(); if (fallback) acc[Number(day.dayNumber)] = fallback; return acc; }, {}) || {}}
        />
      )}

      {shouldShowVehicles && vehicleBuildStatus === "READY" &&
        ((itinerary.vehicles && itinerary.vehicles.length > 0) ||
          (itinerary.vehicleRateAvailability && itinerary.vehicleRateAvailability.length > 0)) && (
        <VehicleSection
          vehicleListRef={vehicleListRef}
          summaryStickyHeight={summaryStickyHeight}
          vehicles={itinerary.vehicles}
          vehicleRateAvailability={itinerary.vehicleRateAvailability}
          planId={itinerary.planId}
          dateRange={itinerary.dateRange}
          days={itinerary.days || []}
          canViewCostBreakdown={canViewCostBreakdown}
          showVendorDetails={!isAgentLogin}
          onRefresh={refreshVehicleData}
          onSelectedTotalChange={handleVehicleSelectedTotalChange}
        />
      )}

      {shouldShowVehicles && vehicleBuildStatus === "READY" &&
        (!itinerary.vehicles || itinerary.vehicles.length === 0) &&
        (!itinerary.vehicleRateAvailability || itinerary.vehicleRateAvailability.length === 0) && (
        <VehicleUnavailableState vehicleListRef={vehicleListRef} summaryStickyHeight={summaryStickyHeight} />
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
      <div className="grid gap-6 lg:grid-cols-2">
        <PackageIncludesCard packageIncludes={itinerary.packageIncludes} />
        <ItineraryOverallCost
          itinerary={itinerary}
          canViewCostBreakdown={canViewCostBreakdown}
          shouldShowHotels={shouldShowHotels}
          shouldShowVehicles={shouldShowVehicles}
          financialTotals={financialTotals}
          roomBreakdownRoomNights={roomBreakdownRoomNights}
          selectedHotelMetaByRoute={selectedHotelMetaByRoute}
          clipboardRatesVisible={clipboardRatesVisible}
          isRoomCostPopoverOpen={isRoomCostPopoverOpen}
          setIsRoomCostPopoverOpen={setIsRoomCostPopoverOpen}
          computedVehicleAmount={computedVehicleAmount}
          computedVehicleQty={computedVehicleQty}
          effectiveEntryTicketAmount={effectiveEntryTicketAmount}
          entryTicketBreakdownByLocation={entryTicketBreakdownByLocation}
        />
      </div>
      <ItineraryActionButtons
        isConfirmedPresentation={isConfirmedPresentation}
        onCopyClipboard={handleClipboardMode}
        onDownloadPluckCard={handleDownloadPluckCard}
        onOpenVoucher={() => setVoucherModal(true)}
        onOpenIncidentalExpenses={() => setIncidentalModal(true)}
        modifyItineraryHref={modifyItineraryHref}
        onDownloadInvoice={handleDownloadInvoice}
        readOnly={readOnly}
        isConfirmedItinerary={isConfirmedItinerary}
        onExtendTrip={() => setCancelModalOpen(true)}
        onConfirmQuotation={openConfirmQuotationModal}
        isOpeningConfirmQuotation={isOpeningConfirmQuotation}
        canConfirmQuotation={canConfirmQuotation}
        onCopyLink={handleCopyLink}
        onShareWhatsApp={handleShareWhatsApp}
        onShareEmail={handleShareEmail}
        onBackToTop={() => window.scrollTo({ top: 0, behavior: "smooth" })}
      />


      <DeleteConfirmationDialog
        open={deleteHotspotModal.open}
        title="Delete Hotspot"
        description={<>Are you sure you want to delete "{deleteHotspotModal.hotspotName}"? This will also remove all associated activities.</>}
        deleting={isDeleting}
        onOpenChange={(open) => setDeleteHotspotModal({ ...deleteHotspotModal, open })}
        onCancel={() => setDeleteHotspotModal({ open: false, planId: null, routeId: null, routeHotspotId: null, masterHotspotId: null, hotspotName: "", hotspotWasPrebuilt: false })}
        onConfirm={handleDeleteHotspot}
      />
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
          <HotspotDialogHeader
            selectedPreviewCityContext={selectedPreviewCityContext}
            destinationCityLabel={destinationCityLabel}
            hotspotSearchQuery={hotspotSearchQuery}
            setHotspotSearchQuery={setHotspotSearchQuery}
          />
          <div className="py-4 flex-1 overflow-hidden flex min-h-0">
            <div className="flex flex-col lg:flex-row gap-4 w-full min-h-0">
              <HotspotDialogListColumn
                hotspotListRef={hotspotListRef}
                routeIsDifferentCity={routeIsDifferentCity}
                hotspotCityTabs={hotspotCityTabs}
                activeHotspotCityTab={activeHotspotCityTab}
                setActiveHotspotCityTab={setActiveHotspotCityTab}
                loadingHotspots={loadingHotspots}
                hotspotSearchQuery={hotspotSearchQuery}
                visibleHotspotsForActiveTab={visibleHotspotsForActiveTab}
                selectedFitHotspot={selectedFitHotspot}
                excludedHotspotIds={excludedHotspotIds}
                currentRouteAttractionHotspotIds={currentRouteAttractionHotspotIds}
                currentRouteManualHotspotIds={currentRouteManualHotspotIds}
                addedInModalHotspotIds={addedInModalHotspotIds}
                currentRouteManualHotspotMetaById={currentRouteManualHotspotMetaById}
                previewTimelinesByHotspot={previewTimelinesByHotspot}
                isFitHereSelectionMode={isFitHereSelectionMode}
                isPreviewingHotspotId={isPreviewingHotspotId}
                isBuildingMatrix={isBuildingMatrix}
                isApplyingPreviewHotspot={isApplyingPreviewHotspot}
                autoPreviewLoading={autoFitHereModal.loading}
                toImgSrc={toImgSrc}
                openGalleryModal={openGalleryModal}
                openVideoModal={openVideoModal}
                onDeleteManual={(routeHotspotId, hotspotId, hotspotName) => openDeleteHotspotModal(addHotspotModal.planId || itinerary?.planId || 0, addHotspotModal.routeId || 0, routeHotspotId, hotspotId, hotspotName, true)}
                onSelectFitHotspot={handleSelectFitHotspot}
                onPreviewHotspot={handlePreviewHotspot}
                onAutoPreviewFitHere={handleAutoPreviewFitHere}
                toast={toast}
              />

              {/* Right Column: Preview */}
              <HotspotPreviewPane
                timelinePreviewRef={timelinePreviewRef}
                isPreviewingHotspotId={isPreviewingHotspotId}
                effectivePreviewTimeline={effectivePreviewTimeline}
                selectedFitHotspot={selectedFitHotspot}
                selectedFitHereDay={selectedFitHereDay}
                manualPreviewState={manualPreviewState}
                buildFitHereAnchorForTimelineRow={buildFitHereAnchorForTimelineRow}
                getFitHereSegmentLabel={getFitHereSegmentLabel}
                getFitHereSegmentTime={getFitHereSegmentTime}
                renderFitHereButton={renderFitHereButton}
                isFitHereSelectionMode={isFitHereSelectionMode}
                activePreviewHotspotId={activePreviewHotspotId}
                selectedHotspotAnchor={selectedHotspotAnchor}
                bestInsertionSlot={bestInsertionSlot}
                matrixRequiresBuild={matrixRequiresBuild}
                isMatrixBuiltButNoFeasibleSlot={isMatrixBuiltButNoFeasibleSlot}
                isMatrixMissingBlockedState={isMatrixMissingBlockedState}
                backendStrategyLabel={backendForceConflictState.selectedStrategyLabel}
                matrixFit={matrixFit}
                selectedPreviewCityContext={selectedPreviewCityContext}
                destinationInsertionSlotLabel={destinationInsertionSlotLabel}
                insertionDecisionSummary={insertionDecisionSummary}
                manualAttemptDisplayMeta={manualAttemptDisplayMeta}
                activeManualOptimizerSummary={activeManualOptimizerSummary}
                activeAnchorFitInsight={activeAnchorFitInsight}
                safeMatrixSlots={safeMatrixSlots}
                destinationHotelDisplayName={destinationHotelDisplayName}
                isBuildingMatrix={isBuildingMatrix}
                isApplyingPreviewHotspot={isApplyingPreviewHotspot}
                matrixBuildCommand={String(matrixBuildSuggestion?.command || "")}
                onBuildMatrixAndPreviewAgain={handleBuildMatrixAndPreviewAgain}
                routeFitBadgeClass={routeFitBadgeClass}
                pendingPriorityReplacementHotspotId={pendingPriorityReplacementHotspotId}
                previewRemovedHotspotDetails={previewRemovedHotspotDetails}
                activePreviewValidation={activePreviewValidation}
                hasManualOpeningOrTimingConflict={hasManualOpeningOrTimingConflict}
                previewValidationReasonText={previewValidationReasonText}
                shouldShowBuildMatrixButton={shouldShowBuildMatrixButton}
                activePreviewResolution={activePreviewResolution}
                manualInsertionFit={manualInsertionFit}
                getManualTimingPolicyFromPreview={getManualTimingPolicyFromPreview}
                formatManualPolicyTime={formatManualPolicyTime}
                resolvedRemovalTimelineLeak={resolvedRemovalTimelineLeak}
                optionalPreviewRemovedHotspotDetails={optionalPreviewRemovedHotspotDetails}
                groupPreviewResolution={groupPreviewResolution}
                previewHotspotMetaById={previewHotspotMetaById}
                selectedHotelMetaByRoute={selectedHotelMetaByRoute}
                previewRouteId={Number(addHotspotModal.routeId || 0)}
                selectedHotspotId={selectedHotspotId}
                extractTravelToFromText={extractTravelToFromText}
                parseDisplayMinutes={parseDisplayMinutes}
                formatMinutesToDisplay={formatMinutesToDisplay}
                normalizeDurationAgainstDistance={normalizeDurationAgainstDistance}
                effectiveFitSlot={effectiveFitSlot}
                normalizedInsertionSlots={normalizedInsertionSlots}
                onRemove={handleRemovePreviewHotspot}
                priorityConfirmRef={priorityConfirmRef}
                pendingPriorityResolution={pendingPriorityResolution}
                onConfirmPriorityReplacement={handleConfirmPriorityReplacement}
                onCancelPriorityReplacement={handleCancelPriorityReplacement}
                formatPreviewDuration={formatPreviewDuration}
                hotspotForceConflictMode={hotspotForceConflictMode}
                isCurrentPreviewAlreadyAdded={isCurrentPreviewAlreadyAdded}
                matrixApplyBlocked={matrixApplyBlocked}
                hotspotEffectiveDecisionBlocked={hotspotEffectiveDecisionBlocked}
                hotspotBlockForValidation={hotspotBlockForValidation}
                handleAddHotspot={handleAddHotspot}
                hotspotApplyLabel={hotspotApplyLabel}
              />

            </div>
          </div>
          <HotspotDialogFooter
            disabled={isApplyingPreviewHotspot || isBuildingMatrix}
            onClose={() => {
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
          />
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
          const decisionKey = getRequestArrivalPolicyDecisionKey(request, itinerary);

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
          const decisionKey = getRequestArrivalPolicyDecisionKey(request, itinerary);

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

      <ItineraryHotelDialogs
        search={{
          open: hotelSelectionModal.open,
          onOpenChange: (open) => {
            if (!open) {
              setHotelSelectionModal({ open: false, planId: null, routeId: null, routeDate: "" });
              setHotelSearchChildAges([]);
            }
          },
          cityCode: hotelSelectionModal.cityCode || "",
          cityName: hotelSelectionModal.cityName || "",
          checkInDate: hotelSelectionModal.checkInDate || hotelSelectionModal.routeDate,
          checkOutDate: hotelSelectionModal.checkOutDate || hotelSelectionModal.routeDate,
          roomCount: Number(itinerary?.roomCount || 1),
          adultCount: Number(itinerary?.adults || 0),
          childCount: Number(itinerary?.children || 0),
          infantCount: Number(itinerary?.infants || 0),
          childAges: hotelSearchChildAges,
          guestNationality: guestDetails.nationality.toUpperCase(),
          onChildAgesChange: setHotelSearchChildAges,
          onSelectHotel: handleSelectHotelFromSearch,
          isSelectingHotel,
        }}
        roomSelection={roomSelectionModal ? {
          open: roomSelectionModal.open,
          onOpenChange: (open) => {
            if (!open) setRoomSelectionModal(null);
          },
          itinerary_plan_hotel_details_ID: roomSelectionModal.itinerary_plan_hotel_details_ID,
          itinerary_plan_id: roomSelectionModal.itinerary_plan_id,
          itinerary_route_id: roomSelectionModal.itinerary_route_id,
          hotel_id: roomSelectionModal.hotel_id,
          group_type: roomSelectionModal.group_type,
          hotel_name: roomSelectionModal.hotel_name,
          onSuccess: () => {
            toast.success('Room categories updated successfully');
          },
        } : null}
      />

      <ItineraryMediaDialogs
        gallery={{ state: galleryModal, setState: setGalleryModal, activeIndex: galleryActiveIdx, setActiveIndex: setGalleryActiveIdx }}
        video={{ state: videoModal, setState: setVideoModal }}
        clipboard={{
          open: clipboardModal,
          preference: itineraryPreference,
          clipboardType,
          recommendations: paraRecommendations,
          selectedHotels,
          onOpenChange: setClipboardModal,
          onSelectionChange: setSelectedHotels,
          onCopy: handleCopyClipboard,
        }}
        source={{ open: sourcePreviewOpen, setOpen: setSourcePreviewOpen, heading: sourcePreviewHeading, loading: sourcePreviewLoading, error: sourcePreviewError, markdown: sourcePreviewMarkdown }}
        shareEmail={{ open: shareModal, setOpen: setShareModal, quoteId: String(quoteId || "") }}
        allHotspotsPreview={{
          open: allHotspotsPreviewModal.open,
          loading: allHotspotsPreviewModal.loading,
          data: allHotspotsPreviewModal.data,
          onOpenChange: (open) => setAllHotspotsPreviewModal((prev) => ({ ...prev, open })),
          formatTime: formatPreviewTime,
          formatDuration: formatActivityDuration,
        }}
      />

      <QuotationConfirmationDialog
        open={confirmQuotationModal}
        onOpenChange={setConfirmQuotationModal}
        overview={{
          agentInfo,
          walletBalance,
          walletBalanceAmount,
          parseWalletAmount,
          confirmRequiredAmount,
          formatCurrency,
          shouldEnableWalletTopUpOnConfirm,
          showWalletTopUpPanel,
          walletShortfallAmount,
          walletTopUpAmount,
          setWalletTopUpAmount,
          walletTopUpRemark,
          setWalletTopUpRemark,
          isWalletTopUpSubmitting,
          handleWalletTopUpAndContinue,
          refreshConfirmWalletBalance,
          isWalletInsufficientForConfirm,
          requiresHotelBookingFlow,
          confirmRoomCount,
          confirmPassengerMix,
          confirmOccupancyPreview,
          requiresDetailedPassengerFlow,
          childrenCount: Number(itinerary?.children || 0),
          infantsCount: Number(itinerary?.infants || 0),
          isOpeningConfirmQuotation,
          isPrebooking,
          prebookData,
        }}
        hotelReview={{
          requiresHotelBookingFlow,
          externalStayEntries: externalStayEntries as readonly Record<string, unknown>[],
          defaultExternalStayMessage: DEFAULT_EXTERNAL_STAY_MESSAGE,
          hasAcceptedUpdatedPrice,
          setHasAcceptedUpdatedPrice,
          prebookData,
          isPrebooking,
          isOpeningConfirmQuotation,
          nonTboSelectedHotelEntries: nonTboSelectedHotelEntries as readonly Record<string, unknown>[],
          prebookHotelEntries: prebookHotelEntries as readonly Record<string, unknown>[],
          hasPrebookPriceChanged,
          normalizePrebookItems,
          resolvePrebookInclusions,
          resolvePrebookMealPlan,
          normalizeCancellationPolicyItems,
          normalizeMealPlanLabel,
        }}
        passenger={{
          guestDetails,
          setGuestDetails,
          formErrors,
          setFormErrors,
          requiresDetailedPassengerFlow,
          additionalAdults,
          setAdditionalAdults,
          additionalChildren,
          setAdditionalChildren,
          additionalInfants,
          setAdditionalInfants,
          defaultPassenger,
          getPassengerFieldError,
        }}
        travel={{ guestDetails, setGuestDetails, handleArrivalDateTimeChange }}
        footer={{
          setConfirmQuotationModal,
          setGuestDetails,
          confirmDefaultNationality,
          setAdditionalAdults,
          setAdditionalChildren,
          setAdditionalInfants,
          setPrebookData,
          setHasAcceptedUpdatedPrice,
          setFormErrors,
          resetConfirmWalletTopUpPanel,
          handleConfirmQuotation,
          isConfirmingQuotation,
          isPrebooking,
          isWalletTopUpSubmitting,
          canConfirmQuotation,
        }}
      />

      <ItineraryFitHereDialogs
        manual={{
          open: fitHereModal.open,
          loading: fitHereModal.loading,
          loadingStepIndex: fitHereModal.loadingStepIndex,
          failedReason: fitHereModal.failedReason,
          attempt: fitHereModal.attempt,
          selectedHotspot: selectedFitHotspot,
          baseTimeline: selectedFitHereDay?.segments || [],
          onClose: handleFitHereCancel,
          onConfirm: handleConfirmFitHere,
          onRetry: handleRetryFitHere,
          confirmLoading: confirmFitHereLoading,
        }}
        automatic={{
          open: autoFitHereModal.open,
          loading: autoFitHereModal.loading,
          failedReason: autoFitHereModal.failedReason,
          results: autoFitHereModal.results,
          selectedAnchorKey: autoFitHereModal.selectedAnchorKey,
          selectedHotspot: selectedFitHotspot,
          baseTimeline: selectedFitHereDay?.segments || [],
          loadingAnchorCount: autoFitHereModal.loadingAnchorCount || 0,
          loadingStartedAtMs: autoFitHereModal.loadingStartedAtMs || null,
          performanceSummary: autoFitHereModal.performanceSummary || null,
          onClose: () => {
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
          },
          onSelectAnchorKey: (anchorKey) => {
            setAutoFitHereModal((prev) => ({
              ...prev,
              selectedAnchorKey: anchorKey,
            }));
          },
          onConfirm: (options, attempt) => {
            void handleConfirmFitHere(options, attempt);
          },
          confirmLoading: confirmFitHereLoading,
        }}
      />

      {itinerary?.planId && (
        <ItineraryAncillaryModals
          voucher={{
            isOpen: voucherModal,
            onClose: () => setVoucherModal(false),
            itineraryPlanId: itinerary.planId,
          }}
          pluckCard={{
            isOpen: pluckCardModal,
            onClose: () => setPluckCardModal(false),
            itineraryPlanId: itinerary.planId,
          }}
          invoice={{
            isOpen: invoiceModal,
            onClose: () => setInvoiceModal(false),
            itineraryPlanId: itinerary.planId,
            type: invoiceType,
          }}
          incidentalExpenses={{
            isOpen: incidentalModal,
            onClose: () => setIncidentalModal(false),
            itineraryPlanId: itinerary.planId,
            onSuccess: () => setIncidentalHistoryRefreshToken((current) => current + 1),
          }}
          cancellation={{
            open: cancelModalOpen,
            onOpenChange: setCancelModalOpen,
            itineraryPlanId: itinerary.planId,
            onSuccess: () => {
              toast.success('Itinerary data will be refreshed');
              window.location.reload();
            },
          }}
          hotelVoucher={selectedHotelForVoucher ? {
            open: hotelVoucherModalOpen,
            onOpenChange: setHotelVoucherModalOpen,
            itineraryPlanId: itinerary.planId,
            routeId: selectedHotelForVoucher.routeId,
            hotelId: selectedHotelForVoucher.hotelId,
            hotelName: selectedHotelForVoucher.hotelName,
            hotelEmail: selectedHotelForVoucher.hotelEmail,
            hotelStateCity: selectedHotelForVoucher.hotelStateCity,
            routeDates: selectedHotelForVoucher.routeDates,
            dayNumbers: selectedHotelForVoucher.dayNumbers,
            hotelDetailsIds: selectedHotelForVoucher.hotelDetailsIds,
            initialStatus: selectedHotelForVoucher.initialStatus,
            onSuccess: refreshHotelData,
          } : null}
        />
      )}

    </div>
  );
};

export default ItineraryDetails;
