import { useCallback, type Dispatch, type SetStateAction } from "react";
import { ItineraryService } from "@/services/itinerary";
import { toast } from "sonner";
import type { AvailableHotspot, AttractionSegment, HotspotAnchor, ItineraryDetailsResponse, ItineraryHotelDetailsResponse } from "../itinerary-details.types";
import type { DeleteHotspotModalState } from "./useItineraryDeletionState";
import { filterAvailableHotspotsForAnchor } from "../utils/timeline.utils";

interface HotspotDeleteMutationOptions {
  deleteHotspotModal: DeleteHotspotModalState;
  itinerary: ItineraryDetailsResponse | null;
  quoteId: string | null;
  shouldShowHotels: boolean;
  addHotspotModalOpen: boolean;
  selectedHotspotAnchor: HotspotAnchor | null;
  normalizeAvailableHotspots: (hotspots: AvailableHotspot[], options: { routeId: number; excludedIds: number[]; activeIds: Set<number> }) => AvailableHotspot[];
  setIsDeleting: Dispatch<SetStateAction<boolean>>;
  setAddedInModalHotspotIds: Dispatch<SetStateAction<Set<number>>>;
  setExcludedHotspotIds: Dispatch<SetStateAction<number[]>>;
  setItinerary: Dispatch<SetStateAction<ItineraryDetailsResponse | null>>;
  setAvailableHotspots: Dispatch<SetStateAction<AvailableHotspot[]>>;
  setDeleteHotspotModal: Dispatch<SetStateAction<DeleteHotspotModalState>>;
  setRouteNeedsRebuild: Dispatch<SetStateAction<number | null>>;
  setHotelDetails: Dispatch<SetStateAction<ItineraryHotelDetailsResponse | null>>;
  setHotspotFilterMeta: Dispatch<SetStateAction<unknown>>;
}

/** Owns hotspot deletion, optimistic timeline cleanup, and modal hotspot refresh. */
export const useHotspotDeleteMutation = ({
  deleteHotspotModal,
  itinerary,
  quoteId,
  shouldShowHotels,
  addHotspotModalOpen,
  selectedHotspotAnchor,
  normalizeAvailableHotspots,
  setIsDeleting,
  setAddedInModalHotspotIds,
  setExcludedHotspotIds,
  setItinerary,
  setAvailableHotspots,
  setDeleteHotspotModal,
  setRouteNeedsRebuild,
  setHotelDetails,
  setHotspotFilterMeta,
}: HotspotDeleteMutationOptions) => useCallback(async () => {
  if (!deleteHotspotModal.planId || !deleteHotspotModal.routeId || !deleteHotspotModal.routeHotspotId) return;

  setIsDeleting(true);
  try {
    const deletedMasterHotspotId = Number(deleteHotspotModal.masterHotspotId || 0);
    const deletedRouteId = Number(deleteHotspotModal.routeId);
    const planId = Number(deleteHotspotModal.planId || itinerary?.planId || 0);
    const confirmedRouteId = deletedRouteId;
    await ItineraryService.deleteHotspot(deleteHotspotModal.planId, deleteHotspotModal.routeId, deleteHotspotModal.routeHotspotId);
    toast.success("Hotspot deleted successfully");

    setAddedInModalHotspotIds((previous) => {
      const next = new Set(previous);
      if (deletedMasterHotspotId > 0) next.delete(deletedMasterHotspotId);
      return next;
    });
    if (deletedMasterHotspotId > 0) {
      setExcludedHotspotIds((previous) => Array.from(new Set([...previous.map(Number), deletedMasterHotspotId])));
    }
    setItinerary((previous) => {
      if (!previous) return previous;
      return {
        ...previous,
        days: previous.days.map((day) => Number(day.id) !== deletedRouteId ? day : {
          ...day,
          segments: day.segments.filter((segment) => {
            if (String(segment?.type || "").toLowerCase() !== "attraction") return true;
            const attraction = segment as AttractionSegment;
            const segmentHotspotId = Number(attraction?.hotspotId ?? attraction?.locationId ?? 0);
            return deletedMasterHotspotId <= 0 || segmentHotspotId !== deletedMasterHotspotId;
          }),
        }),
      };
    });
    setAvailableHotspots((previous) => previous.map((row) => Number(row.id) === deletedMasterHotspotId ? {
      ...row,
      alreadyAdded: false,
      availabilityStatus: "EXCLUDED_BY_ROUTE",
      actionDisabled: false,
      buttonLabel: "Preview",
    } : row));
    setDeleteHotspotModal({ open: false, planId: null, routeId: null, routeHotspotId: null, masterHotspotId: null, hotspotName: "", hotspotWasPrebuilt: false });
    if (deleteHotspotModal.hotspotWasPrebuilt && deleteHotspotModal.routeId) setRouteNeedsRebuild(deleteHotspotModal.routeId);

    if (quoteId) {
      const [detailsRes, hotelRes] = await Promise.all([
        ItineraryService.getDetails(quoteId),
        shouldShowHotels ? ItineraryService.getHotelDetails(quoteId) : Promise.resolve(null),
      ]);
      const refreshedDetails = detailsRes as ItineraryDetailsResponse;
      setItinerary(refreshedDetails);
      setHotelDetails(hotelRes as ItineraryHotelDetailsResponse);

      if (addHotspotModalOpen && confirmedRouteId > 0) {
        try {
          const refreshedRoute = refreshedDetails.days?.find((day) => Number(day?.id || 0) === confirmedRouteId);
          const refreshedRouteRecord = refreshedRoute as (typeof refreshedRoute & { excluded_hotspot_ids?: number[] }) | undefined;
          const refreshedSegments = (Array.isArray(refreshedRouteRecord?.segments) ? refreshedRouteRecord.segments : []) as Array<Record<string, unknown>>;
          const refreshedActiveIds = new Set<number>(refreshedSegments
            .filter((segment) => String(segment?.type || "").toLowerCase() === "attraction")
            .filter((segment) => ![segment?.isDeleted, segment?.deleted, segment?.isExcluded, segment?.excluded, segment?.removed].some(Boolean) && segment?.deletedAt == null && segment?.deleted_at == null && !["deleted", "excluded"].includes(String(segment?.status || "").toLowerCase()))
            .map((segment) => Number(segment?.hotspotId ?? segment?.locationId ?? 0))
            .filter((id) => Number.isFinite(id) && id > 0));
          const refreshedExcludedIds = Array.isArray(refreshedRouteRecord?.excluded_hotspot_ids) ? refreshedRouteRecord.excluded_hotspot_ids.map(Number) : [];
          const hotspotResponse = selectedHotspotAnchor
            ? await ItineraryService.getAvailableHotspotsForAnchor({ planId, routeId: confirmedRouteId, anchorType: selectedHotspotAnchor.anchorType, anchorIndex: Number(selectedHotspotAnchor.anchorIndex) })
            : await ItineraryService.getAvailableHotspots(confirmedRouteId);
          const refreshedHotspots = Array.isArray(hotspotResponse) ? hotspotResponse : ((hotspotResponse as { hotspots?: AvailableHotspot[] })?.hotspots || []);
          const responseFilterMeta = Array.isArray(hotspotResponse) ? null : (hotspotResponse as { hotspotFilterMeta?: unknown })?.hotspotFilterMeta || null;
          const routePairFilteredHotspots = filterAvailableHotspotsForAnchor(refreshedHotspots, String(refreshedRoute?.departure || "").trim(), String(refreshedRoute?.arrival || "").trim(), String(selectedHotspotAnchor?.anchorFrom || "").trim(), String(selectedHotspotAnchor?.anchorTo || "").trim());
          setHotspotFilterMeta(responseFilterMeta);
          setExcludedHotspotIds(refreshedExcludedIds);
          setAvailableHotspots(normalizeAvailableHotspots(routePairFilteredHotspots, { routeId: confirmedRouteId, excludedIds: refreshedExcludedIds, activeIds: refreshedActiveIds }));
        } catch (refreshError) {
          console.warn("[FitHereConfirm] Modal hotspot refresh failed after confirm", refreshError);
        }
      }
    }
  } catch (error) {
    console.error("Failed to delete hotspot", error);
    toast.error(error?.message || "Failed to delete hotspot");
  } finally {
    setIsDeleting(false);
  }
}, [addHotspotModalOpen, deleteHotspotModal, itinerary, normalizeAvailableHotspots, quoteId, selectedHotspotAnchor, setAddedInModalHotspotIds, setAvailableHotspots, setDeleteHotspotModal, setExcludedHotspotIds, setHotelDetails, setHotspotFilterMeta, setIsDeleting, setItinerary, setRouteNeedsRebuild, shouldShowHotels]);
