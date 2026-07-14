import { useCallback, type Dispatch, type SetStateAction } from "react";
import { ItineraryService } from "@/services/itinerary";
import { toast } from "sonner";
import type { Activity } from "../itinerary-details.types";

interface ActivityAvailabilityLoaderOptions {
  setAddActivityModal: Dispatch<SetStateAction<Record<string, unknown>>>;
  setActivityPreview: Dispatch<SetStateAction<unknown>>;
  setPreviewingActivityId: Dispatch<SetStateAction<number | null>>;
  setAvailableActivities: Dispatch<SetStateAction<Activity[]>>;
  setLoadingActivities: Dispatch<SetStateAction<boolean>>;
}

/** Opens the activity modal and hydrates activities available for the selected hotspot. */
export const useActivityAvailabilityLoader = ({
  setAddActivityModal,
  setActivityPreview,
  setPreviewingActivityId,
  setAvailableActivities,
  setLoadingActivities,
}: ActivityAvailabilityLoaderOptions) => useCallback(async (
  planId: number,
  routeId: number,
  routeHotspotId: number,
  hotspotId: number,
  hotspotName: string,
) => {
  setAddActivityModal({ open: true, planId, routeId, routeHotspotId, hotspotId, hotspotName });
  setActivityPreview(null);
  setPreviewingActivityId(null);
  setLoadingActivities(true);
  try {
    const activities = await ItineraryService.getAvailableActivities(hotspotId, planId, routeId);
    setAvailableActivities(activities as Activity[]);
  } catch (error) {
    console.error("Failed to load activities", error);
    toast.error(error?.message || "Failed to load activities");
    setAvailableActivities([]);
  } finally {
    setLoadingActivities(false);
  }
}, [setActivityPreview, setAddActivityModal, setAvailableActivities, setLoadingActivities, setPreviewingActivityId]);
