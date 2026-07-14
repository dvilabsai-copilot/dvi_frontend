import { useCallback, type Dispatch, type SetStateAction } from "react";
import { ItineraryService } from "@/services/itinerary";
import { toast } from "sonner";
import type { ItineraryDetailsResponse, ItineraryHotelDetailsResponse } from "../itinerary-details.types";
import type { DeleteActivityModalState } from "./useItineraryDeletionState";

interface AddActivityModalState {
  open: boolean;
  planId: number | null;
  routeId: number | null;
  routeHotspotId: number | null;
  hotspotId: number | null;
  hotspotName: string;
}

interface ActivityPreviewState {
  hasConflicts?: boolean;
  activity?: { id?: number } | null;
  conflicts?: Array<{ reason?: string }>;
}

interface ActivityAddPayload {
  planId: number;
  routeId: number;
  routeHotspotId: number;
  hotspotId: number;
  activityId: number;
  amount: number;
  skipConflictCheck?: boolean;
}

interface ActivityMutationControllerOptions {
  addActivityModal: AddActivityModalState;
  activityPreview: ActivityPreviewState | null;
  deleteActivityModal: DeleteActivityModalState;
  quoteId: string | null;
  shouldShowHotels: boolean;
  setIsAddingActivity: Dispatch<SetStateAction<boolean>>;
  setIsDeletingActivity: Dispatch<SetStateAction<boolean>>;
  setAddActivityModal: Dispatch<SetStateAction<AddActivityModalState>>;
  setDeleteActivityModal: Dispatch<SetStateAction<DeleteActivityModalState>>;
  setActivityPreview: Dispatch<SetStateAction<ActivityPreviewState | null>>;
  setPreviewingActivityId: Dispatch<SetStateAction<number | null>>;
  setItinerary: Dispatch<SetStateAction<ItineraryDetailsResponse | null>>;
  setHotelDetails: Dispatch<SetStateAction<ItineraryHotelDetailsResponse | null>>;
  setActiveHotelListTotal: Dispatch<SetStateAction<number>>;
}

const errorMessage = (error: unknown, fallback: string): string => {
  if (typeof error === "object" && error !== null) {
    const message = (error as { message?: unknown }).message;
    if (message) return String(message);
  }
  return fallback;
};

const closedAddModal: AddActivityModalState = { open: false, planId: null, routeId: null, routeHotspotId: null, hotspotId: null, hotspotName: "" };
const closedDeleteModal: DeleteActivityModalState = { open: false, planId: null, routeId: null, activityId: null, activityName: "" };

/** Owns activity add/delete mutations and their best-effort itinerary/hotel refreshes. */
export const useActivityMutationController = ({
  addActivityModal,
  activityPreview,
  deleteActivityModal,
  quoteId,
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
}: ActivityMutationControllerOptions) => {
  const refreshAfterMutation = useCallback(async () => {
    if (!quoteId) return;
    try {
      const detailsRes = await ItineraryService.getDetails(quoteId);
      setItinerary(detailsRes as ItineraryDetailsResponse);
    } catch (reloadError) {
      console.error("Failed to reload itinerary after activity mutation", reloadError);
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
      // Hotel hydration is best-effort and must not block the itinerary refresh.
    }
  }, [quoteId, setActiveHotelListTotal, setHotelDetails, setItinerary, shouldShowHotels]);

  const handleAddActivity = useCallback(async (activityId: number, amount: number) => {
    if (!addActivityModal.planId || !addActivityModal.routeId || !addActivityModal.routeHotspotId || !addActivityModal.hotspotId) return;
    let shouldSkipConflictCheck = false;
    if (activityPreview?.hasConflicts && activityPreview.activity?.id === activityId) {
      const conflictMessages = (activityPreview.conflicts || []).map((conflict) => conflict.reason || "").join("\n\n");
      if (!window.confirm(`TIMING CONFLICTS DETECTED:\n\n${conflictMessages}\n\nDo you want to add this activity anyway?`)) return;
      shouldSkipConflictCheck = true;
    }
    setIsAddingActivity(true);
    try {
      const payload: ActivityAddPayload = {
        planId: addActivityModal.planId,
        routeId: addActivityModal.routeId,
        routeHotspotId: addActivityModal.routeHotspotId,
        hotspotId: addActivityModal.hotspotId,
        activityId,
        amount,
      };
      if (shouldSkipConflictCheck) payload.skipConflictCheck = true;
      await ItineraryService.addActivity(payload);
      toast.success("Activity added successfully");
      setAddActivityModal(closedAddModal);
      setActivityPreview(null);
      setPreviewingActivityId(null);
      await refreshAfterMutation();
    } catch (error) {
      console.error("Failed to add activity", error);
      toast.error(errorMessage(error, "Failed to add activity"));
    } finally {
      setIsAddingActivity(false);
    }
  }, [activityPreview, addActivityModal.hotspotId, addActivityModal.planId, addActivityModal.routeHotspotId, addActivityModal.routeId, refreshAfterMutation, setActivityPreview, setAddActivityModal, setIsAddingActivity, setPreviewingActivityId]);

  const handleDeleteActivity = useCallback(async () => {
    if (!deleteActivityModal.planId || !deleteActivityModal.routeId || !deleteActivityModal.activityId) return;
    setIsDeletingActivity(true);
    try {
      await ItineraryService.deleteActivity(deleteActivityModal.planId, deleteActivityModal.routeId, deleteActivityModal.activityId);
      toast.success("Activity deleted successfully");
      setDeleteActivityModal(closedDeleteModal);
      await refreshAfterMutation();
    } catch (error) {
      console.error("Failed to delete activity", error);
      toast.error(errorMessage(error, "Failed to delete activity"));
    } finally {
      setIsDeletingActivity(false);
    }
  }, [deleteActivityModal.activityId, deleteActivityModal.planId, deleteActivityModal.routeId, refreshAfterMutation, setDeleteActivityModal, setIsDeletingActivity]);

  return { handleAddActivity, handleDeleteActivity };
};
