import { useState } from "react";
import { useHotspotDeleteMutation } from "./useHotspotDeleteMutation";
import { useRouteRebuildMutation } from "./useRouteRebuildMutation";
import { useRouteTimePatchMutation } from "./useRouteTimePatchMutation";
import { useArrivalPolicyRouteTimeController } from "./useArrivalPolicyRouteTimeController";
import type { useItineraryRouteState } from "./useItineraryRouteState";
import type { useHotelWorkflowState } from "./useHotelWorkflowState";
import type { useHotspotState } from "./useHotspotState";
import type { useItineraryDeletionState } from "./useItineraryDeletionState";
import type { ItineraryDetailsResponse } from "../itinerary-details.types";

type RouteState = ReturnType<typeof useItineraryRouteState>;
type HotelWorkflowState = ReturnType<typeof useHotelWorkflowState>;
type HotspotState = ReturnType<typeof useHotspotState>;
type DeletionState = ReturnType<typeof useItineraryDeletionState>;
type RouteTimeArgs = Parameters<typeof useRouteTimePatchMutation>[0];

export function useItineraryRouteMutationWorkflow({
  routeState,
  hotelWorkflowState,
  hotspotState,
  deletionState,
  itinerary,
  hotelDetails,
  quoteId,
  shouldShowHotels,
  requiresHotelBookingFlow,
  addHotspotModalOpen,
  selectedHotspotAnchor,
  normalizeAvailableHotspots,
  getRouteTimeUpdateEstimateMs,
  startRouteTimeProgress,
  stopRouteTimeProgress,
  pushRouteProgressStage,
}: {
  routeState: RouteState;
  hotelWorkflowState: HotelWorkflowState;
  hotspotState: HotspotState;
  deletionState: DeletionState;
  itinerary: ItineraryDetailsResponse | null;
  hotelDetails: RouteState["hotelDetails"];
  quoteId: string | undefined;
  shouldShowHotels: boolean;
  requiresHotelBookingFlow: boolean;
  addHotspotModalOpen: boolean;
  selectedHotspotAnchor: HotspotState["selectedHotspotAnchor"];
  normalizeAvailableHotspots: Parameters<typeof useHotspotDeleteMutation>[0]["normalizeAvailableHotspots"];
  getRouteTimeUpdateEstimateMs: RouteTimeArgs["getRouteTimeUpdateEstimateMs"];
  startRouteTimeProgress: RouteTimeArgs["startRouteTimeProgress"];
  stopRouteTimeProgress: RouteTimeArgs["stopRouteTimeProgress"];
  pushRouteProgressStage: RouteTimeArgs["pushRouteProgressStage"];
}) {
  const { setItinerary, setHotelDetails } = routeState;
  const { setIsRebuilding, setRouteNeedsRebuild } = deletionState;
  const { deleteHotspotModal, setIsDeleting, setExcludedHotspotIds, setDeleteHotspotModal } = deletionState;
  const { setAddedInModalHotspotIds, setAvailableHotspots, setHotspotFilterMeta } = hotspotState;
  const { setIsApplyingRouteTimeUpdate, setRouteTimeEstimatedMs, setRouteProgressTitle, setRouteProgressHistory, setRouteTimeProgressPercent, setPendingScrollDayNumber, setIsResolvingArrivalPolicy, setPendingRouteTimeUpdate, setArrivalPolicyConfirmModal } = hotelWorkflowState;
  const [routeRestrictionError, setRouteRestrictionError] = useState<string | null>(null);
  const handleDeleteHotspot = useHotspotDeleteMutation({
    deleteHotspotModal, itinerary, quoteId: quoteId || null, shouldShowHotels, addHotspotModalOpen,
    selectedHotspotAnchor, normalizeAvailableHotspots, setIsDeleting, setAddedInModalHotspotIds,
    setExcludedHotspotIds, setItinerary, setAvailableHotspots, setDeleteHotspotModal,
    setRouteNeedsRebuild, setHotelDetails, setHotspotFilterMeta,
  });
  const handleRebuildRoute = useRouteRebuildMutation({
    quoteId: quoteId || null, itinerary, shouldShowHotels, setItinerary, setHotelDetails,
    setIsRebuilding, setRouteProgressTitle, setRouteProgressHistory, setRouteTimeEstimatedMs,
    setRouteNeedsRebuild, getRouteTimeUpdateEstimateMs, startRouteTimeProgress, stopRouteTimeProgress,
    pushRouteProgressStage,
  });
  const dayHasManualInserts = (day: { segments?: Array<{ type?: string; planOwnWay?: boolean; isManual?: boolean }> }): boolean => {
    const segments = Array.isArray(day?.segments) ? day.segments : [];
    return segments.some((segment) => String(segment?.type || "").toLowerCase() === "attraction" && (segment?.planOwnWay === true || segment?.isManual === true));
  };
  const applyRouteTimePatch = useRouteTimePatchMutation({
    quoteId: quoteId || null, hotelDetails, setIsApplyingRouteTimeUpdate, getRouteTimeUpdateEstimateMs,
    setRouteTimeEstimatedMs, setRouteProgressTitle, setRouteProgressHistory, startRouteTimeProgress,
    stopRouteTimeProgress, pushRouteProgressStage, setItinerary, setHotelDetails, setRouteTimeProgressPercent,
    setRouteRestrictionError,
    setPendingScrollDayNumber,
  });
  const arrivalPolicy = useArrivalPolicyRouteTimeController({
    itinerary, requiresHotelBookingFlow, applyRouteTimePatch, setIsResolvingArrivalPolicy,
    setPendingRouteTimeUpdate, setArrivalPolicyConfirmModal,
  });
  return { handleDeleteHotspot, handleRebuildRoute, dayHasManualInserts, applyRouteTimePatch, routeRestrictionError, setRouteRestrictionError, ...arrivalPolicy };
}
