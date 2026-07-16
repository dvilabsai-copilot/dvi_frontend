import { useCallback, type Dispatch, type SetStateAction } from "react";
import { ItineraryService } from "@/services/itinerary";
import { toast } from "sonner";
import type { ItineraryGuideAssignment } from "../itinerary-details.types";

interface GuideDeleteModalState {
  open: boolean;
  assignment: ItineraryGuideAssignment | null;
  deleting: boolean;
}

interface GuideDeleteMutationOptions {
  itineraryPlanId: number;
  deleteGuideModal: GuideDeleteModalState;
  refreshGuideData: () => Promise<void>;
  setDeleteGuideModal: Dispatch<SetStateAction<GuideDeleteModalState>>;
}

/** Owns guide assignment deletion and post-delete refresh/toast behavior. */
export const useGuideDeleteMutation = ({
  itineraryPlanId,
  deleteGuideModal,
  refreshGuideData,
  setDeleteGuideModal,
}: GuideDeleteMutationOptions) => useCallback(async () => {
  const assignment = deleteGuideModal.assignment;
  if (!assignment || !(itineraryPlanId > 0)) return;

  try {
    setDeleteGuideModal((previous) => ({ ...previous, deleting: true }));
    await ItineraryService.deleteGuideAssignment(
      itineraryPlanId,
      assignment.routeGuideId,
      assignment.routeId ?? undefined,
    );
    await refreshGuideData();
    setDeleteGuideModal({ open: false, assignment: null, deleting: false });
    toast.success("Guide deleted successfully");
  } catch (error) {
    console.error("Failed to delete guide assignment", error);
    setDeleteGuideModal((previous) => ({ ...previous, deleting: false }));
    toast.error(error?.message || "Failed to delete guide");
  }
}, [deleteGuideModal.assignment, itineraryPlanId, refreshGuideData, setDeleteGuideModal]);
