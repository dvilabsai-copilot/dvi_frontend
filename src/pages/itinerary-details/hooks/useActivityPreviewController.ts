import { useCallback, type Dispatch, type SetStateAction } from "react";
import { ItineraryService } from "@/services/itinerary";
import { toast } from "sonner";

interface ActivityModalState {
  planId: number | null;
  routeId: number | null;
  routeHotspotId: number | null;
  hotspotId: number | null;
}

interface ActivityPreviewModalState {
  open?: boolean;
  loading?: boolean;
  planId?: number | null;
  routeId?: number | null;
  activityId?: number | null;
  data?: unknown;
}

interface ActivityPreviewControllerOptions {
  addActivityModal: ActivityModalState;
  setPreviewingActivityId: Dispatch<SetStateAction<number | null>>;
  setActivityPreview: Dispatch<SetStateAction<unknown>>;
  setAllHotspotsPreviewModal: Dispatch<SetStateAction<ActivityPreviewModalState>>;
}

/** Owns single-activity and all-hotspots preview API workflows. */
export const useActivityPreviewController = ({
  addActivityModal,
  setPreviewingActivityId,
  setActivityPreview,
  setAllHotspotsPreviewModal,
}: ActivityPreviewControllerOptions) => {
  const handlePreviewActivity = useCallback(async (activityId: number) => {
    if (!addActivityModal.planId || !addActivityModal.routeId || !addActivityModal.routeHotspotId || !addActivityModal.hotspotId) return;

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
    } catch (error) {
      console.error("Failed to preview activity", error);
      toast.error(error?.message || "Failed to preview activity");
      setActivityPreview(null);
    } finally {
      setPreviewingActivityId(null);
    }
  }, [addActivityModal, setActivityPreview, setPreviewingActivityId]);

  const handleOpenPreviewAllHotspots = useCallback(async (activityId: number) => {
    if (!addActivityModal.planId || !addActivityModal.routeId) return;

    setAllHotspotsPreviewModal((previous) => ({
      ...previous,
      loading: true,
      open: true,
      planId: addActivityModal.planId,
      routeId: addActivityModal.routeId,
      activityId,
    }));

    try {
      const preview = await ItineraryService.previewActivityForAllHotspots({
        planId: addActivityModal.planId,
        routeId: addActivityModal.routeId,
        activityId,
      });
      setAllHotspotsPreviewModal((previous) => ({ ...previous, loading: false, data: preview }));
    } catch (error) {
      console.error("Failed to preview activity for all hotspots", error);
      toast.error(error?.message || "Failed to preview activity");
      setAllHotspotsPreviewModal((previous) => ({ ...previous, loading: false, open: false }));
    }
  }, [addActivityModal, setAllHotspotsPreviewModal]);

  return { handleOpenPreviewAllHotspots, handlePreviewActivity };
};
