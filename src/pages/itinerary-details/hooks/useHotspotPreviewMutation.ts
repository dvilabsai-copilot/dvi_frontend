import { useCallback, type Dispatch, type MutableRefObject, type SetStateAction } from "react";
import { ItineraryService } from "@/services/itinerary";
import { toast } from "sonner";
import type { AvailableHotspot, HotspotAnchor } from "../itinerary-details.types";

type PreviewSource = "AFTER_MATRIX_BUILD" | "USER_REFRESH" | "DESTINATION_SIDE_MATRIX_NOT_REQUIRED";

interface PreviewOptions {
  planId?: number;
  routeId?: number;
  anchor?: HotspotAnchor;
  allowTopPriorityRemoval?: boolean;
  selectedHotspotIds?: number[];
  forceRefresh?: boolean;
  source?: PreviewSource;
}

interface PreviewResponse extends Record<string, unknown> {
  fullTimeline?: unknown[];
  resolution?: Record<string, unknown>;
  anchorPreference?: Record<string, unknown> | null;
  newHotspot?: Record<string, unknown> | null;
  allInsertionSlots?: unknown[];
  manualInsertionFit?: Record<string, unknown> | null;
}

interface HotspotPreviewMutationOptions {
  addHotspotModal: { planId: number | null; routeId: number | null };
  activePreviewHotspotId: number | null;
  selectedHotspotAnchor: HotspotAnchor | null;
  previewRequestIdRef: MutableRefObject<number>;
  timelinePreviewRef: MutableRefObject<HTMLDivElement | null>;
  resetManualHotspotPreviewState: () => void;
  getManualTimingPolicyFromPreview: (preview: unknown) => unknown;
  setActivePreviewHotspotId: Dispatch<SetStateAction<number | null>>;
  setSelectedHotspotIds: Dispatch<SetStateAction<number[]>>;
  setForceReplacementApprovedByHotspot: Dispatch<SetStateAction<Record<number, boolean>>>;
  setTopPriorityReplacementApproved: Dispatch<SetStateAction<boolean>>;
  setIsPreviewingHotspotId: Dispatch<SetStateAction<number | null>>;
  setManualPreviewState: Dispatch<SetStateAction<Record<string, unknown> | null>>;
  setPreviewTimelinesByHotspot: Dispatch<SetStateAction<Record<number, unknown[]>>>;
  setPreviewResolutionsByHotspot: Dispatch<SetStateAction<Record<number, Record<string, unknown>>>>;
  setGroupPreviewResolution: Dispatch<SetStateAction<Record<string, unknown> | null>>;
}

const getErrorMessage = (error: unknown): string => {
  if (typeof error === "object" && error !== null) {
    const message = (error as { message?: unknown }).message;
    if (message) return String(message);
  }
  return "Failed to preview hotspot";
};

/** Owns manual hotspot preview API calls and preview-state cleanup. */
export const useHotspotPreviewMutation = ({
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
}: HotspotPreviewMutationOptions) => {
  const handlePreviewHotspot = useCallback(async (hotspotId: number, options?: PreviewOptions) => {
    const planId = options?.planId || addHotspotModal.planId;
    const routeId = options?.routeId || addHotspotModal.routeId;
    const anchor = options?.anchor || selectedHotspotAnchor || undefined;
    if (!planId || !routeId) return;

    const requestId = ++previewRequestIdRef.current;
    resetManualHotspotPreviewState();
    setActivePreviewHotspotId(hotspotId);
    setSelectedHotspotIds([hotspotId]);
    setTopPriorityReplacementApproved(false);
    setIsPreviewingHotspotId(hotspotId);

    if (timelinePreviewRef.current) timelinePreviewRef.current.scrollTop = 0;

    try {
      const preview = await ItineraryService.previewAddHotspot(
        planId,
        routeId,
        hotspotId,
        anchor ? { anchorType: anchor.anchorType, anchorIndex: anchor.anchorIndex } : undefined,
        { allowTopPriorityRemoval: options?.allowTopPriorityRemoval === true, selectedHotspotIds: [hotspotId] },
      ) as PreviewResponse;

      if (requestId !== previewRequestIdRef.current) return;

      const fullTimeline = Array.isArray(preview?.fullTimeline) ? [...preview.fullTimeline] : [];
      console.log("[ManualHotspotModal] received_timeline", {
        hotspotId: Number(hotspotId),
        segments: fullTimeline.length,
        hasPreviewOrder: fullTimeline.some((segment) => Number.isFinite(Number((segment as { matrixPreviewOrder?: unknown; previewOrder?: unknown })?.matrixPreviewOrder ?? (segment as { previewOrder?: unknown })?.previewOrder))),
      });

      const manualTimingPolicy = getManualTimingPolicyFromPreview(preview);
      const previewResolution: Record<string, unknown> = {
        ...(preview?.resolution || {}),
        anchorPreference: preview?.anchorPreference || null,
        newHotspot: preview?.newHotspot || null,
        allInsertionSlots: preview?.allInsertionSlots || [],
        slotInsights: preview?.resolution?.slotInsights || [],
        manualTimingPolicy,
      };
      setManualPreviewState({
        ...preview,
        fullTimeline,
        manualTimingPolicy,
        manualInsertionFit: preview?.manualInsertionFit || previewResolution.manualInsertionFit || preview?.resolution?.manualInsertionFit || null,
      });
      setPreviewTimelinesByHotspot((previous) => ({ ...previous, [hotspotId]: fullTimeline }));
      setPreviewResolutionsByHotspot((previous) => ({ ...previous, [hotspotId]: previewResolution }));
      setGroupPreviewResolution(previewResolution);

      if (options?.allowTopPriorityRemoval === true) {
        setForceReplacementApprovedByHotspot((previous) => ({ ...previous, [hotspotId]: true }));
        setTopPriorityReplacementApproved(true);
      }

      if (preview?.anchorPreference?.honored === false) {
        const requestedIndex = (preview.anchorPreference.requested as { anchorIndex?: unknown } | undefined)?.anchorIndex;
        const resolvedIndex = (preview.anchorPreference.resolved as { anchorIndex?: unknown } | undefined)?.anchorIndex;
        const resolvedTimeRange = (preview.anchorPreference.resolved as { timeRange?: unknown } | undefined)?.timeRange;
        toast.info(`Preferred anchor ${requestedIndex} moved to ${resolvedIndex}${resolvedTimeRange ? ` (${resolvedTimeRange})` : ""} due to timing constraints.`);
      }
    } catch (error) {
      if (requestId !== previewRequestIdRef.current) return;
      console.error("Failed to preview hotspot", error);
      toast.error(getErrorMessage(error));
      setActivePreviewHotspotId(null);
      setSelectedHotspotIds([]);
    } finally {
      if (requestId === previewRequestIdRef.current) setIsPreviewingHotspotId(null);
    }
  }, [addHotspotModal.planId, addHotspotModal.routeId, getManualTimingPolicyFromPreview, previewRequestIdRef, resetManualHotspotPreviewState, selectedHotspotAnchor, setActivePreviewHotspotId, setForceReplacementApprovedByHotspot, setGroupPreviewResolution, setIsPreviewingHotspotId, setManualPreviewState, setPreviewResolutionsByHotspot, setPreviewTimelinesByHotspot, setSelectedHotspotIds, setTopPriorityReplacementApproved, timelinePreviewRef]);

  const handleRemovePreviewHotspot = useCallback(async (hotspotId: number) => {
    if (Number(activePreviewHotspotId || 0) !== Number(hotspotId)) return;
    previewRequestIdRef.current += 1;
    resetManualHotspotPreviewState();
    setActivePreviewHotspotId(null);
    setSelectedHotspotIds([]);
  }, [activePreviewHotspotId, previewRequestIdRef, resetManualHotspotPreviewState, setActivePreviewHotspotId, setSelectedHotspotIds]);

  return { handlePreviewHotspot, handleRemovePreviewHotspot };
};
