import { useRef, useState } from "react";
import type {
  AvailableHotspot,
  HotspotAnchor,
  ItineraryDay,
  TriedAnchorState,
} from "../itinerary-details.types";
import type { ManualFitHerePreviewResponse } from "@/components/itinerary/manual-fit/ManualFitHerePreviewDialog";

export function useHotspotState() {
  const [addHotspotModal, setAddHotspotModal] = useState<{
    open: boolean;
    planId: number | null;
    routeId: number | null;
    locationId: number | null;
    locationName: string;
  }>({ open: false, planId: null, routeId: null, locationId: null, locationName: "" });

  const [loadingHotspots, setLoadingHotspots] = useState(false);
  const [isAddingHotspot, setIsAddingHotspot] = useState(false);
  const [hotspotSearchQuery, setHotspotSearchQuery] = useState("");
  const [availableHotspots, setAvailableHotspots] = useState<AvailableHotspot[]>([]);
  const [hotspotFilterMeta, setHotspotFilterMeta] = useState<any | null>(null);
  const [previewTimelinesByHotspot, setPreviewTimelinesByHotspot] = useState<Record<number, any[]>>({});
  const [previewResolutionsByHotspot, setPreviewResolutionsByHotspot] = useState<Record<number, any>>({});
  const [groupPreviewTimeline, setGroupPreviewTimeline] = useState<any[]>([]);
  const [groupPreviewResolution, setGroupPreviewResolution] = useState<any | null>(null);
  const [tempModalTimeline, setTempModalTimeline] = useState<any[]>([]);
  const [forceReplacementApprovedByHotspot, setForceReplacementApprovedByHotspot] = useState<Record<number, boolean>>({});
  const [topPriorityReplacementApproved, setTopPriorityReplacementApproved] = useState(false);
  const [isPreviewingHotspotId, setIsPreviewingHotspotId] = useState<number | null>(null);
  const [activePreviewHotspotId, setActivePreviewHotspotId] = useState<number | null>(null);
  const [addedInModalHotspotIds, setAddedInModalHotspotIds] = useState<Set<number>>(new Set());
  const [manualPreviewState, setManualPreviewState] = useState<any | null>(null);
  const [isApplyingPreviewHotspot, setIsApplyingPreviewHotspot] = useState(false);
  const [isBuildingMatrix, setIsBuildingMatrix] = useState(false);
  const [selectedHotspotIds, setSelectedHotspotIds] = useState<number[]>([]);
  const [selectedHotspotAnchor, setSelectedHotspotAnchor] = useState<HotspotAnchor | null>(null);
  const [activeHotspotCityTab, setActiveHotspotCityTab] = useState<"ALL" | "SOURCE_CITY" | "DESTINATION_CITY" | "UNKNOWN">("ALL");
  const [selectedFitHotspot, setSelectedFitHotspot] = useState<AvailableHotspot | null>(null);
  const [triedFitHereAnchors, setTriedFitHereAnchors] = useState<Record<string, TriedAnchorState>>({});
  const [fitHereModal, setFitHereModal] = useState<{
    open: boolean;
    loading: boolean;
    loadingStepIndex: number;
    failedReason: string | null;
    attempt: ManualFitHerePreviewResponse | null;
    anchorKey: string | null;
    retryPayload?: { day: ItineraryDay; anchor: any } | null;
  }>({ open: false, loading: false, loadingStepIndex: 0, failedReason: null, attempt: null, anchorKey: null, retryPayload: null });
  const [autoFitHereModal, setAutoFitHereModal] = useState<{
    open: boolean;
    loading: boolean;
    failedReason: string | null;
    results: any[];
    selectedAnchorKey: string | null;
    loadingAnchorCount?: number;
    loadingStartedAtMs?: number | null;
    performanceSummary?: {
      totalElapsedMs?: number;
      avgAnchorMs?: number;
      slowestAnchorLabel?: string | null;
      slowestAnchorMs?: number;
    } | null;
  }>({ open: false, loading: false, failedReason: null, results: [], selectedAnchorKey: null, loadingAnchorCount: 0, loadingStartedAtMs: null, performanceSummary: null });
  const [confirmFitHereLoading, setConfirmFitHereLoading] = useState(false);

  const hotspotListRef = useRef<HTMLDivElement>(null);
  const timelinePreviewRef = useRef<HTMLDivElement>(null);
  const priorityConfirmRef = useRef<HTMLDivElement>(null);
  const previewRequestIdRef = useRef(0);
  const fitHereProgressTimerRef = useRef<number | null>(null);

  return {
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
  };
}
