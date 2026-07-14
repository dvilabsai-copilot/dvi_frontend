import { useCallback, type Dispatch, type MutableRefObject, type SetStateAction } from "react";
import { ItineraryService } from "@/services/itinerary";
import { toast } from "sonner";
import type { ManualFitHerePreviewResponse } from "@/components/itinerary/manual-fit/ManualFitHerePreviewDialog";
import type { AvailableHotspot, HotspotAnchor, ItineraryDay, ItineraryDetailsResponse, TriedAnchorState } from "../itinerary-details.types";
import { filterAvailableHotspotsForAnchor } from "../utils/timeline.utils";

interface AddHotspotModalState {
  open: boolean;
  planId: number | null;
  routeId: number | null;
  locationId: number | null;
  locationName: string;
}

interface FitHereModalState {
  open: boolean;
  loading: boolean;
  loadingStepIndex: number;
  failedReason: string | null;
  attempt: ManualFitHerePreviewResponse | null;
  anchorKey: string | null;
}

interface AutoFitHereModalState {
  open: boolean;
  loading: boolean;
  failedReason: string | null;
  results: unknown[];
  selectedAnchorKey: string | null;
  loadingAnchorCount?: number;
  loadingStartedAtMs?: number | null;
  performanceSummary?: unknown;
}

interface AddHotspotModalControllerOptions {
  itinerary: ItineraryDetailsResponse | null;
  previewRequestIdRef: MutableRefObject<number>;
  resetManualHotspotPreviewState: () => void;
  normalizeAvailableHotspots: (hotspots: AvailableHotspot[], options: { routeId: number; excludedIds: number[]; activeIds: Set<number> }) => AvailableHotspot[];
  setAddHotspotModal: Dispatch<SetStateAction<AddHotspotModalState>>;
  setActivePreviewHotspotId: Dispatch<SetStateAction<number | null>>;
  setAddedInModalHotspotIds: Dispatch<SetStateAction<Set<number>>>;
  setSelectedHotspotAnchor: Dispatch<SetStateAction<HotspotAnchor | null>>;
  setSelectedFitHotspot: Dispatch<SetStateAction<AvailableHotspot | null>>;
  setTriedFitHereAnchors: Dispatch<SetStateAction<Record<string, TriedAnchorState>>>;
  setFitHereModal: Dispatch<SetStateAction<FitHereModalState>>;
  setAutoFitHereModal: Dispatch<SetStateAction<AutoFitHereModalState>>;
  setLoadingHotspots: Dispatch<SetStateAction<boolean>>;
  setExcludedHotspotIds: Dispatch<SetStateAction<number[]>>;
  setHotspotFilterMeta: Dispatch<SetStateAction<unknown>>;
  setAvailableHotspots: Dispatch<SetStateAction<AvailableHotspot[]>>;
  setSelectedHotspotIds: Dispatch<SetStateAction<number[]>>;
}

/** Owns add-hotspot modal initialization and available-hotspot hydration. */
export const useAddHotspotModalController = ({
  itinerary,
  previewRequestIdRef,
  resetManualHotspotPreviewState,
  normalizeAvailableHotspots,
  setAddHotspotModal,
  setActivePreviewHotspotId,
  setAddedInModalHotspotIds,
  setSelectedHotspotAnchor,
  setSelectedFitHotspot,
  setTriedFitHereAnchors,
  setFitHereModal,
  setAutoFitHereModal,
  setLoadingHotspots,
  setExcludedHotspotIds,
  setHotspotFilterMeta,
  setAvailableHotspots,
  setSelectedHotspotIds,
}: AddHotspotModalControllerOptions) => useCallback(async (
  planId: number,
  routeId: number,
  locationId: number,
  locationName: string,
  anchor?: HotspotAnchor | null,
) => {
  previewRequestIdRef.current += 1;
  setAddHotspotModal({ open: true, planId, routeId, locationId, locationName });
  resetManualHotspotPreviewState();
  setActivePreviewHotspotId(null);
  setAddedInModalHotspotIds(new Set());
  setSelectedHotspotAnchor(anchor || null);
  setSelectedFitHotspot(null);
  setTriedFitHereAnchors({});
  setFitHereModal({ open: false, loading: false, loadingStepIndex: 0, failedReason: null, attempt: null, anchorKey: null });
  setAutoFitHereModal({ open: false, loading: false, failedReason: null, results: [], selectedAnchorKey: null, loadingAnchorCount: 0, loadingStartedAtMs: null, performanceSummary: null });

  setLoadingHotspots(true);
  try {
    const currentRoute = itinerary?.days.find((day) => Number(day.id) === Number(routeId));
    const routeRecord = currentRoute as (ItineraryDay & { excluded_hotspot_ids?: number[]; segments?: Array<Record<string, unknown>> }) | undefined;
    const routeExcludedIds = Array.isArray(routeRecord?.excluded_hotspot_ids) ? routeRecord.excluded_hotspot_ids.map(Number) : [];
    const segments = (Array.isArray(routeRecord?.segments) ? routeRecord.segments : []) as Array<Record<string, unknown>>;
    const routeActiveIds = new Set<number>(segments
      .filter((segment) => String(segment?.type || "").toLowerCase() === "attraction")
      .filter((segment) => ![segment?.isDeleted, segment?.deleted, segment?.isExcluded, segment?.excluded, segment?.removed].some(Boolean) && segment?.deletedAt == null && segment?.deleted_at == null && !["deleted", "excluded"].includes(String(segment?.status || "").toLowerCase()))
      .map((segment) => Number(segment?.hotspotId ?? segment?.locationId ?? 0))
      .filter((id) => Number.isFinite(id) && id > 0));
    setExcludedHotspotIds(routeExcludedIds);

    const hotspotResponse = anchor
      ? await ItineraryService.getAvailableHotspotsForAnchor({ planId, routeId, anchorType: anchor.anchorType, anchorIndex: Number(anchor.anchorIndex) })
      : await ItineraryService.getAvailableHotspots(routeId);
    const hotspots = Array.isArray(hotspotResponse) ? hotspotResponse : (Array.isArray((hotspotResponse as { hotspots?: unknown[] })?.hotspots) ? (hotspotResponse as { hotspots: AvailableHotspot[] }).hotspots : []);
    const responseFilterMeta = Array.isArray(hotspotResponse) ? null : (hotspotResponse as { hotspotFilterMeta?: unknown })?.hotspotFilterMeta || null;
    setHotspotFilterMeta(responseFilterMeta);
    const routePairFilteredHotspots = filterAvailableHotspotsForAnchor(
      hotspots as AvailableHotspot[],
      String((routeRecord as { departure?: string })?.departure || "").trim(),
      String((routeRecord as { arrival?: string })?.arrival || "").trim(),
      String(anchor?.anchorFrom || "").trim(),
      String(anchor?.anchorTo || "").trim(),
    );
    setAvailableHotspots(normalizeAvailableHotspots(routePairFilteredHotspots, { routeId, excludedIds: routeExcludedIds, activeIds: routeActiveIds }));

    if (currentRoute) {
      const existingManualHotspotIds = Array.from(new Set(segments
        .filter((segment) => String(segment?.type || "").toLowerCase() === "attraction" && (segment?.planOwnWay === true || segment?.isManual === true))
        .map((segment) => Number(segment?.hotspotId ?? segment?.locationId ?? 0))
        .filter((id) => Number.isFinite(id) && id > 0)));
      if (existingManualHotspotIds.length > 0) setSelectedHotspotIds([]);
    }
  } catch (error) {
    console.error("Failed to fetch available hotspots", error);
    toast.error(error?.message || "Failed to load available hotspots");
  } finally {
    setLoadingHotspots(false);
  }
}, [itinerary, normalizeAvailableHotspots, previewRequestIdRef, resetManualHotspotPreviewState, setActivePreviewHotspotId, setAddHotspotModal, setAddedInModalHotspotIds, setAutoFitHereModal, setAvailableHotspots, setExcludedHotspotIds, setFitHereModal, setHotspotFilterMeta, setLoadingHotspots, setSelectedFitHotspot, setSelectedHotspotAnchor, setSelectedHotspotIds, setTriedFitHereAnchors]);
