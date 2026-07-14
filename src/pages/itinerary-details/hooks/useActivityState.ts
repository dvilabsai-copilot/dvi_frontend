import { useState } from "react";

export function useActivityState() {
  const [addActivityModal, setAddActivityModal] = useState<any>({ open: false, planId: null, routeId: null, locationId: null, locationName: "" });
  const [availableActivities, setAvailableActivities] = useState<any[]>([]);
  const [loadingActivities, setLoadingActivities] = useState(false);
  const [isAddingActivity, setIsAddingActivity] = useState(false);
  const [activityPreview, setActivityPreview] = useState<any>(null);
  const [previewingActivityId, setPreviewingActivityId] = useState<number | null>(null);
  return {
    addActivityModal, setAddActivityModal, availableActivities, setAvailableActivities,
    loadingActivities, setLoadingActivities, isAddingActivity, setIsAddingActivity,
    activityPreview, setActivityPreview, previewingActivityId, setPreviewingActivityId,
  };
}
