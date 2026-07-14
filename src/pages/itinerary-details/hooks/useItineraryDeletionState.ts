import { useState } from "react";

export interface DeleteHotspotModalState {
  open: boolean;
  planId: number | null;
  routeId: number | null;
  routeHotspotId: number | null;
  masterHotspotId: number | null;
  hotspotName: string;
  hotspotWasPrebuilt: boolean;
}

export interface AllHotspotsPreviewModalState {
  open: boolean;
  loading: boolean;
  data: any | null;
  planId: number | null;
  routeId: number | null;
  activityId: number | null;
}

export interface DeleteActivityModalState {
  open: boolean;
  planId: number | null;
  routeId: number | null;
  activityId: number | null;
  activityName: string;
}

/** Owns modal and in-flight flags for destructive itinerary actions. */
export const useItineraryDeletionState = () => {
  const [deleteHotspotModal, setDeleteHotspotModal] = useState<DeleteHotspotModalState>({
    open: false,
    planId: null,
    routeId: null,
    routeHotspotId: null,
    masterHotspotId: null,
    hotspotName: "",
    hotspotWasPrebuilt: false,
  });
  const [isDeleting, setIsDeleting] = useState(false);
  const [routeNeedsRebuild, setRouteNeedsRebuild] = useState<number | null>(null);
  const [isRebuilding, setIsRebuilding] = useState(false);
  const [excludedHotspotIds, setExcludedHotspotIds] = useState<number[]>([]);
  const [allHotspotsPreviewModal, setAllHotspotsPreviewModal] = useState<AllHotspotsPreviewModalState>({
    open: false,
    loading: false,
    data: null,
    planId: null,
    routeId: null,
    activityId: null,
  });
  const [deleteActivityModal, setDeleteActivityModal] = useState<DeleteActivityModalState>({
    open: false,
    planId: null,
    routeId: null,
    activityId: null,
    activityName: "",
  });
  const [isDeletingActivity, setIsDeletingActivity] = useState(false);

  return {
    deleteHotspotModal,
    setDeleteHotspotModal,
    isDeleting,
    setIsDeleting,
    routeNeedsRebuild,
    setRouteNeedsRebuild,
    isRebuilding,
    setIsRebuilding,
    excludedHotspotIds,
    setExcludedHotspotIds,
    allHotspotsPreviewModal,
    setAllHotspotsPreviewModal,
    deleteActivityModal,
    setDeleteActivityModal,
    isDeletingActivity,
    setIsDeletingActivity,
  };
};

