import { useCallback, useEffect, type Dispatch, type SetStateAction } from "react";
import type { AttractionSegment, ItineraryDay, ItineraryDetailsResponse, ItineraryGuideAssignment } from "../itinerary-details.types";
import { findGuideAssignmentForDay, isAttractionCoveredByGuide as isAttractionCoveredByGuideUtil, isGuidePriceAvailableForDay as isGuidePriceAvailableForDayUtil } from "../utils/guideAssignment.utils";
import { parseDisplayMinutes } from "../utils/timeline.utils";
import { useActivityAvailabilityLoader } from "./useActivityAvailabilityLoader";
import { useActivityMutationController } from "./useActivityMutationController";
import { useActivityPreviewController } from "./useActivityPreviewController";
import { useActivityState } from "./useActivityState";
import { useGuideAssignmentSaveMutation } from "./useGuideAssignmentSaveMutation";
import { useGuideAvailabilityLoader } from "./useGuideAvailabilityLoader";
import { useGuideDataRefresh } from "./useGuideDataRefresh";
import { useGuideDeleteMutation } from "./useGuideDeleteMutation";
import { useGuideModalController } from "./useGuideModalController";
import { useGuideState } from "./useGuideState";
import type { useItineraryDeletionState } from "./useItineraryDeletionState";
import type { useItineraryRouteState } from "./useItineraryRouteState";

type ActivityState = ReturnType<typeof useActivityState>;
type GuideState = ReturnType<typeof useGuideState>;
type DeletionState = ReturnType<typeof useItineraryDeletionState>;
type RouteState = ReturnType<typeof useItineraryRouteState>;

/** Coordinates activity dialogs and guide assignment workflows for the itinerary page. */
export function useItineraryActivityGuideWorkflow({
  activityState,
  guideState,
  deletionState,
  routeState,
  itinerary,
  quoteId,
  readOnly,
  shouldShowHotels,
  setActiveHotelListTotal,
}: {
  activityState: ActivityState;
  guideState: GuideState;
  deletionState: DeletionState;
  routeState: RouteState;
  itinerary: ItineraryDetailsResponse | null;
  quoteId?: string;
  readOnly: boolean;
  shouldShowHotels: boolean;
  setActiveHotelListTotal: Dispatch<SetStateAction<number>>;
}) {
  const {
    addActivityModal, setAddActivityModal, availableActivities, setAvailableActivities,
    loadingActivities, setLoadingActivities, isAddingActivity, setIsAddingActivity,
    activityPreview, setActivityPreview, previewingActivityId, setPreviewingActivityId,
  } = activityState;
  const { guideAssignments, setGuideAssignments, guideAvailability, setGuideAvailability, guideAvailabilityLoading, setGuideAvailabilityLoading, guideModal, setGuideModal } = guideState;
  const { deleteActivityModal, setDeleteActivityModal, allHotspotsPreviewModal, setAllHotspotsPreviewModal } = deletionState;
  const { setItinerary, setHotelDetails } = routeState;

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
    setIsDeletingActivity: deletionState.setIsDeletingActivity,
    setAddActivityModal,
    setDeleteActivityModal,
    setActivityPreview,
    setPreviewingActivityId,
    setItinerary,
    setHotelDetails,
    setActiveHotelListTotal,
  });

  const getSelectedPreviewActivity = useCallback(
    () => availableActivities.find((activity) => activity.id === activityPreview?.activity?.id) || null,
    [activityPreview?.activity?.id, availableActivities],
  );

  const { handleOpenPreviewAllHotspots, handlePreviewActivity } = useActivityPreviewController({
    addActivityModal,
    setPreviewingActivityId,
    setActivityPreview,
    setAllHotspotsPreviewModal,
  });

  const openDeleteActivityModal = useCallback((planId: number, routeId: number, activityId: number, activityName: string) => {
    setDeleteActivityModal({ open: true, planId, routeId, activityId, activityName });
  }, [setDeleteActivityModal]);

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

  const handleAddGuideClick = useCallback((day: ItineraryDay) => {
    const existing = guideAssignments.find((assignment) => Number(assignment.guideType || 0) === 2 && Number(assignment.routeId || 0) === Number(day.id));
    void openGuideModal(day, existing ?? null, 2);
  }, [guideAssignments, openGuideModal]);

  const handleWholeItineraryGuideClick = useCallback(() => {
    const existing = guideAssignments.find((assignment) => Number(assignment.guideType || 0) === 1) ?? null;
    void openGuideModal(null, existing, 1);
  }, [guideAssignments, openGuideModal]);

  const loadGuideAvailability = useGuideAvailabilityLoader({ setGuideAvailability, setGuideAvailabilityLoading });

  const getGuideAssignmentForDay = useCallback(
    (day: ItineraryDay) => findGuideAssignmentForDay(guideAssignments, day),
    [guideAssignments],
  );

  const isGuidePriceAvailableForDay = useCallback(
    (day: ItineraryDay) => isGuidePriceAvailableForDayUtil(guideAvailability, itinerary?.guideForItinerary, day),
    [guideAvailability, itinerary?.guideForItinerary],
  );

  const isAttractionCoveredByGuide = useCallback(
    (segment: AttractionSegment, assignment: ItineraryGuideAssignment | null): boolean => isAttractionCoveredByGuideUtil(segment, assignment, parseDisplayMinutes),
    [],
  );

  useEffect(() => {
    const planId = Number(itinerary?.planId || 0);
    if (!(planId > 0)) {
      setGuideAvailability(null);
      return;
    }
    void loadGuideAvailability(planId);
  }, [itinerary?.planId, loadGuideAvailability, setGuideAvailability]);

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
    deleteGuideModal: guideState.deleteGuideModal,
    refreshGuideData,
    setDeleteGuideModal: guideState.setDeleteGuideModal,
  });

  useEffect(() => {
    const planId = Number(itinerary?.planId || 0);
    if (!(planId > 0)) {
      setGuideAssignments([]);
      return;
    }
    void loadGuideAssignments(planId);
  }, [itinerary?.planId, loadGuideAssignments, setGuideAssignments]);

  return {
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
    activityViewState: { addActivityModal, setAddActivityModal, loadingActivities, availableActivities, activityPreview, isAddingActivity, previewingActivityId },
    guideViewState: { guideModal, setGuideModal },
    allHotspotsPreviewModal,
  };
}
