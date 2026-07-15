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
import { ArrowLeft, Clock, MapPin, Car, Calendar, Plus, Trash2, ArrowRight, Ticket, Building2, Timer, Loader2, RefreshCw, Edit, AlertTriangle, Route, Utensils } from "lucide-react";
import { TimePickerPopover } from "@/components/itinerary/TimePickerPopover";
import { ItineraryService } from "@/services/itinerary";
import { AgentAPI } from "@/services/agentService";
import { api } from "@/lib/api";
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
  buildExactManualHotspotPreviewPayload,
} from "./itinerary-details/manual-hotspot-preview.shared";
import { HotelArrivalPolicyRequest } from "@/services/itinerary";
import { toast } from "sonner";
import { useEffectivePreviewTimeline } from "./itinerary-details/hooks/useEffectivePreviewTimeline";
import { useHotelHydratedDays } from "./itinerary-details/hooks/useHotelHydratedDays";
import { useHotelsForDisplay } from "./itinerary-details/hooks/useHotelsForDisplay";
import {
  DEFAULT_EXTERNAL_STAY_MESSAGE,
  useExternalStayEntries,
} from "./itinerary-details/hooks/useExternalStayEntries";
import { useNonTboSelectedHotelEntries } from "./itinerary-details/hooks/useNonTboSelectedHotelEntries";
import { useDestinationHotelDisplayName } from "./itinerary-details/hooks/useDestinationHotelDisplayName";
import { useMatrixFitState } from "./itinerary-details/hooks/useMatrixFitState";
import { usePreviewCityContext } from "./itinerary-details/hooks/usePreviewCityContext";
import { useMatrixAvailabilityState } from "./itinerary-details/hooks/useMatrixAvailabilityState";
import { usePreviewDecisionState } from "./itinerary-details/hooks/usePreviewDecisionState";
import { useInsertionDecisionSummary } from "./itinerary-details/hooks/useInsertionDecisionSummary";
import { usePreviewSlotState } from "./itinerary-details/hooks/usePreviewSlotState";
import { useBestInsertionSlot } from "./itinerary-details/hooks/useBestInsertionSlot";
import { usePreviewHotspotMeta } from "./itinerary-details/hooks/usePreviewHotspotMeta";
import { useCurrentRouteHotspotState } from "./itinerary-details/hooks/useCurrentRouteHotspotState";
import { useNormalizedAvailableHotspots } from "./itinerary-details/hooks/useNormalizedAvailableHotspots";
import { useActiveAnchorFitInsight } from "./itinerary-details/hooks/useActiveAnchorFitInsight";
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
import { getSelectedPreviewSegments as getSelectedPreviewSegmentsUtil } from "./itinerary-details/utils/fitHereSelectedPreview.utils";
import {
  getOptionalPreviewRemovedHotspotDetails,
  getPreviewRemovedHotspotDetails,
} from "./itinerary-details/utils/previewRemovedHotspots.utils";
import { getPendingPriorityReplacementHotspotId } from "./itinerary-details/utils/previewPriority.utils";
import {
  getAutoPreviewHighestRemovedPriority as getAutoPreviewHighestRemovedPriorityUtil,
  getAutoPreviewRemovedRows as getAutoPreviewRemovedRowsUtil,
  scoreAutoPreviewAttempt as scoreAutoPreviewAttemptUtil,
} from "./itinerary-details/utils/autoPreviewScoring.utils";
import { buildAutoPreviewAnchorProgressText as buildAutoPreviewAnchorProgressTextUtil } from "./itinerary-details/utils/autoPreviewProgress.utils";
import { resolveActivePreviewTimeline } from "./itinerary-details/utils/activePreviewTimeline.utils";
import { resolveActivePreviewResolution } from "./itinerary-details/utils/activePreviewResolution.utils";
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
import { ItineraryOverallCost } from "./itinerary-details/components/ItineraryOverallCost";
import { ItineraryActionButtons, type ClipboardMode } from "./itinerary-details/components/ItineraryActionButtons";
import { QuotationNonTboSelectedHotels } from "./itinerary-details/components/QuotationNonTboSelectedHotels";
import { HotspotSelectionCard } from "./itinerary-details/components/HotspotSelectionCard";
import { HotspotPreviewTimelineNotices } from "./itinerary-details/components/HotspotPreviewTimelineNotices";
import { HotspotPreviewApplyAction } from "./itinerary-details/components/HotspotPreviewApplyAction";
import { HotspotPreviewWaitingSegment } from "./itinerary-details/components/HotspotPreviewWaitingSegment";
import { HotspotPreviewSegmentSummary } from "./itinerary-details/components/HotspotPreviewSegmentSummary";
import { HotspotBestInsertionSlotPanel } from "./itinerary-details/components/HotspotBestInsertionSlotPanel";
import { HotspotPreviewRouteSummary } from "./itinerary-details/components/HotspotPreviewRouteSummary";
import { HotspotPreviewInsertedStatus } from "./itinerary-details/components/HotspotPreviewInsertedStatus";
import { HotspotPriorityConfirmation } from "./itinerary-details/components/HotspotPriorityConfirmation";
import { HotspotPreviewAttractionMeta } from "./itinerary-details/components/HotspotPreviewAttractionMeta";
import { HotspotConflictNotice } from "./itinerary-details/components/HotspotConflictNotice";
import { HotspotConflictTimingDetails } from "./itinerary-details/components/HotspotConflictTimingDetails";
import { QuotationHotelReviewSections } from "./itinerary-details/components/QuotationHotelReviewSections";
import { QuotationWalletInsufficientPanel } from "./itinerary-details/components/QuotationWalletInsufficientPanel";
import { QuotationConfirmationOverview } from "./itinerary-details/components/QuotationConfirmationOverview";
import { ConfirmedQuoteBanner } from "./itinerary-details/components/ConfirmedQuoteBanner";
import { ItineraryHeader } from "./itinerary-details/components/ItineraryHeader";
import { useHotspotState } from "./itinerary-details/hooks/useHotspotState";
import { useAutoFitHerePreviewController } from "./itinerary-details/hooks/useAutoFitHerePreviewController";
import { useFitHereConfirmationMutation } from "./itinerary-details/hooks/useFitHereConfirmationMutation";
import { useClipboardContentBuilder } from "./itinerary-details/hooks/useClipboardContentBuilder";
import { useDisplayItineraryDays } from "./itinerary-details/hooks/useDisplayItineraryDays";
import { useSourcePreviewController } from "./itinerary-details/hooks/useSourcePreviewController";
import { useRouteHotelDetailsCache } from "./itinerary-details/hooks/useRouteHotelDetailsCache";
import { useFilteredHotspots } from "./itinerary-details/hooks/useFilteredHotspots";
import { useHotspotRouteCityContext } from "./itinerary-details/hooks/useHotspotRouteCityContext";
import { useHotspotCityPresentation } from "./itinerary-details/hooks/useHotspotCityPresentation";
import { useDestinationInsertionSlotLabel } from "./itinerary-details/hooks/useDestinationInsertionSlotLabel";
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
import { QuotationPassengerForm } from "./itinerary-details/QuotationPassengerForm";
import { QuotationTravelDetailsForm } from "./itinerary-details/QuotationTravelDetailsForm";
import { QuotationDialogFooter } from "./itinerary-details/QuotationDialogFooter";
import { QuotationPassengerNotice } from "./itinerary-details/QuotationPassengerNotice";
import { QuotationPrebookLoadingNotice } from "./itinerary-details/QuotationPrebookLoadingNotice";
import { QuotationAgentSummary } from "./itinerary-details/QuotationAgentSummary";
import { QuotationRoomingPreview } from "./itinerary-details/QuotationRoomingPreview";
import { QuotationWalletTopUpActions } from "./itinerary-details/QuotationWalletTopUpActions";
import { QuotationPrebookHotelRows } from "./itinerary-details/QuotationPrebookHotelRows";
import { QuotationPrebookAcceptanceNotice } from "./itinerary-details/QuotationPrebookAcceptanceNotice";
import { HotspotDialogHeader } from "./itinerary-details/components/HotspotDialogHeader";
import { HotspotCityTabs } from "./itinerary-details/components/HotspotCityTabs";
import { HotspotListState } from "./itinerary-details/components/HotspotListState";
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
import { QuotationConfirmationDialogShell } from "./itinerary-details/QuotationConfirmationDialogShell";
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


const normalizeRouteFamilyBaseQuoteId = useCallback((value?: string | null) => {
  const raw = String(value || "").trim();
  if (!raw) return "";

  const match = raw.match(/^(.*)-R(\d+)$/i);
  return String(match?.[1] || raw).trim();
}, []);

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

  const mapDaySegmentToPreview = useCallback(
    (segment: ItinerarySegment) => mapDaySegmentToPreviewUtil(segment, extractTravelToFromText),
    [extractTravelToFromText],
  );

  const defaultPreviewTimeline = useMemo(() => {
    const routeId = addHotspotModal.routeId;
    if (!routeId || !itinerary?.days?.length) return [];

    const day = itinerary.days.find((d) => Number(d.id) === Number(routeId));
    if (!day?.segments?.length) return [];

    return day.segments
      .map(mapDaySegmentToPreview)
      .filter(Boolean);
  }, [addHotspotModal.routeId, itinerary?.days, mapDaySegmentToPreview]);

  const selectedPreviewSegments = useMemo(
    () => getSelectedPreviewSegmentsUtil(
      availableHotspots,
      previewTimelinesByHotspot,
      selectedHotspotIds,
    ),
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
    () => resolveActivePreviewResolution(
      manualPreviewState,
      groupPreviewResolution,
      selectedHotspotId,
      previewResolutionsByHotspot,
    ),
    [groupPreviewResolution, manualPreviewState, previewResolutionsByHotspot, selectedHotspotId],
  );

  const activePreviewValidation = useMemo(() => {
    return activePreviewResolution?.validation || null;
  }, [activePreviewResolution]);

  const normalizedDecision = useMemo(() => {
    return (activePreviewResolution as any)?.normalizedDecision
      || (activePreviewResolution as any)?.resolution?.normalizedDecision
      || (manualPreviewState as any)?.normalizedDecision
      || null;
  }, [activePreviewResolution, manualPreviewState]);

  const previewRemovedHotspotDetails = useMemo(
    () => getPreviewRemovedHotspotDetails(activePreviewResolution),
    [activePreviewResolution],
  );

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

  // Scroll the confirm box into view when it appears
  useEffect(() => {
    if (pendingPriorityReplacementHotspotId && priorityConfirmRef.current) {
      priorityConfirmRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [pendingPriorityReplacementHotspotId]);

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

  const destinationHotelDisplayName = useDestinationHotelDisplayName({
    addHotspotRouteId: addHotspotModal.routeId,
    effectivePreviewTimeline,
    hotelDetails,
    itinerary,
    matrixFit,
  });

  const {
    matrixBuildSuggestion,
    hasValidChosenMatrixSlot,
    matrixFitAlreadyHasUsableData,
  } = useMatrixFitState({
    activePreviewResolution,
    groupPreviewResolution,
    matrixFit,
  });

  const {
    deriveHotspotCityContext,
    activePreviewHotspot,
    selectedPreviewCityContext,
    isDestinationSideManualPreview,
  } = usePreviewCityContext({
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

  const {
    matrixRequiresBuild,
    isMatrixMissingBlockedState,
    isMatrixBuiltButNoFeasibleSlot,
    shouldShowBuildMatrixButton,
  } = useMatrixAvailabilityState({
    activePreviewResolution,
    activePreviewValidation,
    groupPreviewResolution,
    isDestinationSideManualPreview,
    matrixFit,
    matrixFitAlreadyHasUsableData,
    normalizedDecision,
  });

  const {
    previewValidationReasonText,
    matrixApplyBlocked,
    decisionStatus,
    confirmActionConfig,
  } = usePreviewDecisionState({
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

  const {
    resolvedRemovalTimelineLeak,
    safeMatrixSlots,
    effectiveFitSlot,
    routeFitBadgeClass,
    normalizedInsertionSlots,
  } = usePreviewSlotState({
    activePreviewResolution,
    destinationHotelDisplayName,
    effectivePreviewTimeline,
    matrixFit,
    matrixRequiresBuild,
    manualPreviewState,
    selectedHotspotAnchor,
    selectedHotspotId,
  });

      // ── From manualInsertionFit.allSlotResults ──
  const activeAnchorFitInsight = useActiveAnchorFitInsight({
    matrixRequiresBuild,
    normalizedInsertionSlots,
    addHotspotRouteId: addHotspotModal.routeId,
    selectedHotspotId,
    matrixFit,
    manualPreviewState,
    activePreviewResolution,
    destinationHotelDisplayName,
  });


  const bestInsertionSlot = useBestInsertionSlot({
    matrixRequiresBuild,
    normalizedInsertionSlots,
  });

  const previewHotspotMetaById = usePreviewHotspotMeta({
    addHotspotRouteId: addHotspotModal.routeId,
    availableHotspots,
    itineraryDays: itinerary?.days,
  });

  const {
    currentRouteAttractionHotspotIds,
    currentRouteManualHotspotIds,
    currentRouteManualHotspotMetaById,
    isCurrentPreviewAlreadyAdded,
  } = useCurrentRouteHotspotState({
    activePreviewHotspotId,
    addedInModalHotspotIds,
    excludedHotspotIds,
    itineraryDays: itinerary?.days,
    routeId: addHotspotModal.routeId,
  });

  const normalizeAvailableHotspots = useNormalizedAvailableHotspots({
    excludedHotspotIds,
    currentRouteAttractionHotspotIds,
    currentRouteManualHotspotMetaById,
  });

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

  const filteredHotspots = useFilteredHotspots({
    availableHotspots,
    searchQuery: hotspotSearchQuery,
    currentRouteAttractionHotspotIds,
    currentRouteManualHotspotIds,
    addedInModalHotspotIds,
  });

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

  const {
    hotspotListRows,
    hotspotCityBuckets,
    hotspotCityTabs,
    visibleHotspotsForActiveTab,
  } = useHotspotCityPresentation({
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
  const NAME_REGEX = /^[A-Za-z][A-Za-z\s'-]{1,24}$/;
  const PAN_REGEX = /^[A-Z]{5}[0-9]{4}[A-Z]$/;
  const isValidPassengerName = (value: string) => NAME_REGEX.test(value.trim());
  const isValidPan = (value: string) => PAN_REGEX.test(value.trim().toUpperCase());
  const isValidIsoNationality = (value: string) => /^[A-Z]{2}$/.test(value.trim().toUpperCase());
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
  // Temporary compatibility placeholders for the removed segment markup during this extraction boundary.
  const segment: any = {};
  const activity: any = {};
  const conflict: any = {};
  const seg: any = {};
  const idx = 0;

  const handleClipboardMode = useCallback((mode: ClipboardMode) => {
    if (itineraryPreference === 2) {
      handleVehicleOnlyClipboardCopyRefactored(mode);
      return;
    }
    setClipboardType(mode);
    setSelectedHotels(buildDefaultClipboardSelection());
    setClipboardModal(true);
  }, [buildDefaultClipboardSelection, handleVehicleOnlyClipboardCopyRefactored, itineraryPreference]);

  const handleCopyLink = useCallback(() => {
    void navigator.clipboard.writeText(window.location.href);
    toast.success("Link copied to clipboard!");
  }, [toast]);

  const handleShareWhatsApp = useCallback(() => {
    const message = `Check out this itinerary: ${window.location.href}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, "_blank");
  }, []);

  const handleShareEmail = useCallback(() => setShareModal(true), [setShareModal]);

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
              day, itinerary, summaryStickyHeight, routeNeedsRebuild, dayHasManualOverride, isRebuilding, handleRebuildRoute, handleUpdateRouteTimesDirectFromHook,
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
          <HotspotDialogHeader
            selectedPreviewCityContext={selectedPreviewCityContext}
            destinationCityLabel={destinationCityLabel}
            hotspotSearchQuery={hotspotSearchQuery}
            setHotspotSearchQuery={setHotspotSearchQuery}
          />
          <div className="py-4 flex-1 overflow-hidden flex min-h-0">
            <div className="flex flex-col lg:flex-row gap-4 w-full min-h-0">
              {/* Left Column: Hotspot List */}
              <div ref={hotspotListRef} className="w-full lg:w-1/2 overflow-y-auto min-h-0">
                <HotspotCityTabs
                  visible={routeIsDifferentCity}
                  tabs={hotspotCityTabs}
                  activeTab={activeHotspotCityTab}
                  setActiveTab={setActiveHotspotCityTab}
                />
                <HotspotListState
                  loading={loadingHotspots}
                  searchQuery={hotspotSearchQuery}
                  hasVisibleHotspots={visibleHotspotsForActiveTab.length > 0}
                />
                {!loadingHotspots && visibleHotspotsForActiveTab.length > 0 && (
                  <div className="grid grid-cols-1 gap-4">
                    {visibleHotspotsForActiveTab.map((hotspot) => (
                      <HotspotSelectionCard
                        key={hotspot.id}
                        hotspot={hotspot}
                        selected={Number(selectedFitHotspot?.id || 0) === Number(hotspot.id)}
                        excludedHotspotIds={excludedHotspotIds}
                        currentRouteAttractionHotspotIds={currentRouteAttractionHotspotIds}
                        currentRouteManualHotspotIds={currentRouteManualHotspotIds}
                        addedInModalHotspotIds={addedInModalHotspotIds}
                        manualMetaById={currentRouteManualHotspotMetaById as ReadonlyMap<number, unknown>}
                        getPreviewTimeline={(hotspotId) => previewTimelinesByHotspot[hotspotId] || []}
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
                <HotspotFitHereEmptyState visible={!selectedFitHotspot && !manualPreviewState} />
                {selectedFitHotspot && selectedFitHereDay && !manualPreviewState && (
                  <div className="mb-4 space-y-4">
                    <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
                      <HotspotFitHereSelectionHeader selectedFitHotspot={selectedFitHotspot} />
                      <p className="mt-2 text-sm text-slate-600">
                        Choose the exact anchor below. We’ll calculate a preview for that position before anything is saved.
                      </p>
                    </div>

                    <HotspotFitHereTimelineRows
                      selectedFitHereDay={selectedFitHereDay}
                      selectedFitHotspot={selectedFitHotspot}
                      buildFitHereAnchorForTimelineRow={buildFitHereAnchorForTimelineRow}
                      getFitHereSegmentLabel={getFitHereSegmentLabel}
                      getFitHereSegmentTime={getFitHereSegmentTime}
                      renderFitHereButton={renderFitHereButton}
                    />
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

                  </div>
                )}
                <div ref={timelinePreviewRef} className="flex-1 space-y-3 min-h-0 pb-4">
                  <HotspotPreviewLoadingState visible={Boolean(isPreviewingHotspotId)} />

                  {effectivePreviewTimeline.length > 0 ? (
                    <>
                      <HotspotPreviewTimelineNotices
                        effectivePreviewTimelineLength={effectivePreviewTimeline.length}
                        sameCityShuffleApplied={(activePreviewResolution as any)?.sameCityShuffleApplied === true}
                        manualInsertionFit={manualInsertionFit}
                        resolvedEndLabel={(() => {
                          const manualTimingPolicy = getManualTimingPolicyFromPreview(manualPreviewState)
                            || getManualTimingPolicyFromPreview(activePreviewResolution)
                            || getManualTimingPolicyFromPreview(groupPreviewResolution);
                          return formatManualPolicyTime(manualTimingPolicy?.endTime) || "route end time";
                        })()}
                        resolvedRemovalTimelineLeak={resolvedRemovalTimelineLeak}
                        optionalPreviewRemovedHotspotDetails={optionalPreviewRemovedHotspotDetails}
                      />



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
                          return <HotspotPreviewWaitingSegment segment={seg} index={idx} timeRange={effectiveSegTimeRange} />;
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
                            <HotspotPreviewSegmentSummary
                              segmentType={String(seg?.type || "")}
                              isConflict={seg?.isConflict === true}
                              isUserSelected={isUserSelected}
                              selectedId={selectedId}
                              effectiveTimeRange={effectiveSegTimeRange}
                              displayText={displaySegmentText}
                              isZeroDurationHotel={isZeroDurationHotel}
                              actualHotelName={actualHotelName}
                              isTravelSegment={isTravelSegment}
                              travelDistanceLabel={previewTravelDistanceLabel}
                              travelDurationLabel={previewTravelDurationLabel}
                              isMatrixSplitTravel={seg?.isMatrixSplitTravel === true}
                              fromName={seg?.fromName}
                              toName={seg?.toName}
                              matrixDistanceKm={seg?.matrixDistanceKm}
                              normalizedMatrixDurationMin={normalizedMatrixDurationMin}
                              onRemove={handleRemovePreviewHotspot}
                            />


                            {isUserSelected && String(seg?.type || '').toLowerCase() === 'attraction' && (
                              <div className="mt-3 space-y-2">
                                {!matrixRequiresBuild && effectiveFitSlot && (
                                  <HotspotBestInsertionSlotPanel
                                    slot={effectiveFitSlot}
                                    matrixFit={matrixFit}
                                    destinationHotelDisplayName={destinationHotelDisplayName}
                                    selectedSlotHasRouteData={selectedSlotHasRouteData}
                                    routeFitBadgeClass={routeFitBadgeClass}
                                  />
                                )}

                                {seg?.matrixFit?.routeLegSummary && selectedSlotHasRouteData && (
                                  <HotspotPreviewRouteSummary
                                    fromName={effectiveFitSlot?.fromName || seg?.matrixFit?.fromName || 'A'}
                                    insertedName={seg?.text || seg?.name || 'Inserted hotspot'}
                                    destinationName={((
                                      /^hotel$/i.test(String(effectiveFitSlot?.toName || seg?.matrixFit?.toName || '').trim())
                                      || (
                                        String((matrixFit as any)?.destinationHotelName || '').trim().length > 0
                                        && String(effectiveFitSlot?.toName || seg?.matrixFit?.toName || '').trim().toLowerCase() === String((matrixFit as any)?.destinationHotelName || '').trim().toLowerCase()
                                      )
                                      || Number((effectiveFitSlot as any)?.destinationHotelId || 0) > 0
                                    ) && destinationHotelDisplayName) ? destinationHotelDisplayName : (effectiveFitSlot?.toName || seg?.matrixFit?.toName || 'B')}
                                    routeLegSummary={seg.matrixFit.routeLegSummary}
                                    distanceComparisonNote={seg.matrixFit.distanceComparisonNote}
                                  />
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

                                <HotspotPreviewInsertedStatus
                                  matrixRequiresBuild={matrixRequiresBuild}
                                  activeAnchorFitInsight={activeAnchorFitInsight}
                                  selectedSlotHasRouteData={selectedSlotHasRouteData}
                                  effectiveSegTimeRange={effectiveSegTimeRange}
                                />

                                  {/* Reschedule Priority Confirmation — shown inline inside the selected card */}
                                  {pendingPriorityReplacementHotspotId && (
                                    <HotspotPriorityConfirmation
                                      priorityConfirmRef={priorityConfirmRef}
                                      pendingPriorityResolution={pendingPriorityResolution}
                                      isBusy={isPreviewingHotspotId === pendingPriorityReplacementHotspotId}
                                      onConfirm={handleConfirmPriorityReplacement}
                                      onCancel={handleCancelPriorityReplacement}
                                    />
                                  )}
                                </div>
                              )}
                            {String(seg?.type || '').toLowerCase() === 'attraction' && (
                              <HotspotPreviewAttractionMeta
                                priorityLabel={priorityLabel}
                                activityVisitTime={activityVisitTime}
                                activityDuration={activityDuration}
                                activityDurationLabel={formatPreviewDuration(seg?.duration || seg?.hotspot_traveling_time || seg?.hotspot_duration || hotspotMeta?.duration)}
                                activityTimings={activityTimings}
                              />
                            )}

                            {seg?.isConflict && (
                              <div className="mt-2 p-2 bg-white/50 rounded border border-red-100">
                                <HotspotConflictNotice conflictReason={seg?.conflictReason} />
                                <HotspotConflictTimingDetails
                                  segment={seg}
                                  index={idx}
                                  timeline={effectivePreviewTimeline}
                                  activityDuration={activityDuration}
                                  formatPreviewDuration={formatPreviewDuration}
                                  parseDisplayMinutes={parseDisplayMinutes}
                                  formatMinutesToDisplay={formatMinutesToDisplay}
                                />
                              </div>
                            )}
                          </div>
                        );
                      })}

                      <HotspotPreviewApplyAction
                        isFitHereSelectionMode={isFitHereSelectionMode}
                        forceConflict={hotspotForceConflictMode}
                        loading={isApplyingPreviewHotspot}
                        disabled={
                          isApplyingPreviewHotspot
                          || isBuildingMatrix
                          || !activePreviewHotspotId
                          || isCurrentPreviewAlreadyAdded
                          || matrixApplyBlocked
                          || hotspotEffectiveDecisionBlocked
                          || hotspotBlockForValidation
                        }
                        onClick={handleAddHotspot}
                        label={hotspotApplyLabel}
                      />
                    </>
                  ) : (
                    <HotspotPreviewEmptyTimeline />
                  )}
                </div>
              </div>
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

      <QuotationConfirmationDialogShell
        open={confirmQuotationModal}
        onOpenChange={setConfirmQuotationModal}
      >

          <div className="space-y-4 py-4">
            <QuotationConfirmationOverview
              agentInfo={agentInfo}
              walletBalance={walletBalance}
              walletBalanceAmount={walletBalanceAmount}
              parseWalletAmount={parseWalletAmount}
              confirmRequiredAmount={confirmRequiredAmount}
              formatCurrency={formatCurrency}
              shouldEnableWalletTopUpOnConfirm={shouldEnableWalletTopUpOnConfirm}
              showWalletTopUpPanel={showWalletTopUpPanel}
              walletShortfallAmount={walletShortfallAmount}
              walletTopUpAmount={walletTopUpAmount}
              setWalletTopUpAmount={setWalletTopUpAmount}
              walletTopUpRemark={walletTopUpRemark}
              setWalletTopUpRemark={setWalletTopUpRemark}
              isWalletTopUpSubmitting={isWalletTopUpSubmitting}
              handleWalletTopUpAndContinue={handleWalletTopUpAndContinue}
              refreshConfirmWalletBalance={refreshConfirmWalletBalance}
              isWalletInsufficientForConfirm={isWalletInsufficientForConfirm}
              requiresHotelBookingFlow={requiresHotelBookingFlow}
              confirmRoomCount={confirmRoomCount}
              confirmPassengerMix={confirmPassengerMix}
              confirmOccupancyPreview={confirmOccupancyPreview}
              requiresDetailedPassengerFlow={requiresDetailedPassengerFlow}
              childrenCount={Number(itinerary?.children || 0)}
              infantsCount={Number(itinerary?.infants || 0)}
              isOpeningConfirmQuotation={isOpeningConfirmQuotation}
              isPrebooking={isPrebooking}
              prebookData={prebookData}
            />

            <QuotationHotelReviewSections
              requiresHotelBookingFlow={requiresHotelBookingFlow}
              externalStayEntries={externalStayEntries as readonly Record<string, unknown>[]}
              defaultExternalStayMessage={DEFAULT_EXTERNAL_STAY_MESSAGE}
              hasAcceptedUpdatedPrice={hasAcceptedUpdatedPrice}
              setHasAcceptedUpdatedPrice={setHasAcceptedUpdatedPrice}
              prebookData={prebookData}
              isPrebooking={isPrebooking}
              isOpeningConfirmQuotation={isOpeningConfirmQuotation}
              nonTboSelectedHotelEntries={nonTboSelectedHotelEntries as readonly Record<string, unknown>[]}
              prebookHotelEntries={prebookHotelEntries as readonly Record<string, unknown>[]}
              hasPrebookPriceChanged={hasPrebookPriceChanged}
              normalizePrebookItems={normalizePrebookItems}
              resolvePrebookInclusions={resolvePrebookInclusions}
              resolvePrebookMealPlan={resolvePrebookMealPlan}
              normalizeCancellationPolicyItems={normalizeCancellationPolicyItems}
              normalizeMealPlanLabel={normalizeMealPlanLabel}
            />
            <QuotationPassengerForm
              guestDetails={guestDetails}
              setGuestDetails={setGuestDetails}
              formErrors={formErrors}
              setFormErrors={setFormErrors}
              requiresDetailedPassengerFlow={requiresDetailedPassengerFlow}
              additionalAdults={additionalAdults}
              setAdditionalAdults={setAdditionalAdults}
              additionalChildren={additionalChildren}
              setAdditionalChildren={setAdditionalChildren}
              additionalInfants={additionalInfants}
              setAdditionalInfants={setAdditionalInfants}
              defaultPassenger={defaultPassenger}
              getPassengerFieldError={getPassengerFieldError}
            />
            <QuotationTravelDetailsForm
              guestDetails={guestDetails}
              setGuestDetails={setGuestDetails}
              handleArrivalDateTimeChange={handleArrivalDateTimeChange}
            />
          </div>
          <QuotationDialogFooter
            setConfirmQuotationModal={setConfirmQuotationModal}
            setGuestDetails={setGuestDetails}
            confirmDefaultNationality={confirmDefaultNationality}
            setAdditionalAdults={setAdditionalAdults}
            setAdditionalChildren={setAdditionalChildren}
            setAdditionalInfants={setAdditionalInfants}
            setPrebookData={setPrebookData}
            setHasAcceptedUpdatedPrice={setHasAcceptedUpdatedPrice}
            setFormErrors={setFormErrors}
            resetConfirmWalletTopUpPanel={resetConfirmWalletTopUpPanel}
            handleConfirmQuotation={handleConfirmQuotation}
            isConfirmingQuotation={isConfirmingQuotation}
            isPrebooking={isPrebooking}
            isWalletTopUpSubmitting={isWalletTopUpSubmitting}
            canConfirmQuotation={canConfirmQuotation}
          />
      </QuotationConfirmationDialogShell>

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
