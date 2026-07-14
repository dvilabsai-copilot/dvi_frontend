import { useCallback, type Dispatch, type SetStateAction } from "react";
import { toast } from "sonner";
import { ItineraryService } from "@/services/itinerary";
import type {
  ItineraryDetailsResponse,
  ItineraryHotelDetailsResponse,
} from "../itinerary-details.types";

export interface RouteRebuildMutationProps {
  quoteId: string | null;
  itinerary: ItineraryDetailsResponse | null;
  shouldShowHotels: boolean;
  setItinerary: Dispatch<SetStateAction<ItineraryDetailsResponse | null>>;
  setHotelDetails: Dispatch<SetStateAction<ItineraryHotelDetailsResponse | null>>;
  setIsRebuilding: Dispatch<SetStateAction<boolean>>;
  setRouteProgressTitle: Dispatch<SetStateAction<string>>;
  setRouteProgressHistory: Dispatch<SetStateAction<string[]>>;
  setRouteTimeEstimatedMs: Dispatch<SetStateAction<number>>;
  setRouteNeedsRebuild: Dispatch<SetStateAction<number | null>>;
  getRouteTimeUpdateEstimateMs: (dayNumber: number) => number;
  startRouteTimeProgress: (estimateMs: number) => void;
  stopRouteTimeProgress: () => void;
  pushRouteProgressStage: (stage: string, detail?: string) => void;
}

export function useRouteRebuildMutation({
  quoteId,
  itinerary,
  shouldShowHotels,
  setItinerary,
  setHotelDetails,
  setIsRebuilding,
  setRouteProgressTitle,
  setRouteProgressHistory,
  setRouteTimeEstimatedMs,
  setRouteNeedsRebuild,
  getRouteTimeUpdateEstimateMs,
  startRouteTimeProgress,
  stopRouteTimeProgress,
  pushRouteProgressStage,
}: RouteRebuildMutationProps) {
  return useCallback(async (planId: number, routeId: number) => {
    console.log("[REBUILD_ROUTE_CLICK]", {
      quoteId,
      planId: itinerary?.planId,
      clickedRouteId: routeId,
      currentDayIds: itinerary?.days?.map((day) => ({
        dayNumber: day.dayNumber,
        id: day.id,
        needsRebuild: day.needsRebuild,
        excludedHotspotIds: day.excludedHotspotIds,
      })),
    });

    const currentRouteIds = new Set((itinerary?.days || []).map((day) => Number(day.id)));
    if (!currentRouteIds.has(Number(routeId))) {
      if (quoteId) {
        const detailsRes = await ItineraryService.getDetails(quoteId);
        setItinerary(detailsRes as ItineraryDetailsResponse);
      }
      toast.error("Itinerary changed. Please try rebuild again.");
      return;
    }

    setIsRebuilding(true);
    const rebuildDay = itinerary?.days?.find((day) => Number(day.id) === Number(routeId)) || null;
    const rebuildDayNumber = Number(rebuildDay?.dayNumber || 0);
    const rebuildEstimateMs = Math.max(12000, getRouteTimeUpdateEstimateMs(rebuildDayNumber || 1));
    setRouteProgressTitle(rebuildDayNumber > 0 ? `Rebuilding Day ${rebuildDayNumber} route` : "Rebuilding route");
    setRouteProgressHistory([]);
    setRouteTimeEstimatedMs(rebuildEstimateMs);
    startRouteTimeProgress(rebuildEstimateMs);
    pushRouteProgressStage(
      rebuildDayNumber > 0 ? `Submitting rebuild request for Day ${rebuildDayNumber}` : "Submitting rebuild request",
      rebuildDayNumber > 0
        ? `Recomputing the saved route sequence, timings, and travel legs for Day ${rebuildDayNumber}.`
        : "Recomputing the saved route sequence, timings, and travel legs.",
    );

    try {
      await ItineraryService.rebuildRoute(planId, routeId);
      pushRouteProgressStage(
        rebuildDayNumber > 0 ? `Reloading rebuilt Day ${rebuildDayNumber} itinerary` : "Reloading rebuilt itinerary",
        "Fetching the rebuilt timeline and updated route details from the backend.",
      );
      toast.success("Route rebuilt successfully");

      if (quoteId) {
        const [detailsRes, hotelRes] = await Promise.all([
          ItineraryService.getDetails(quoteId),
          shouldShowHotels ? ItineraryService.getHotelDetails(quoteId) : Promise.resolve(null),
        ]);
        const nextItinerary = detailsRes as ItineraryDetailsResponse;
        setItinerary(nextItinerary);
        setHotelDetails(hotelRes as ItineraryHotelDetailsResponse | null);
        pushRouteProgressStage(
          rebuildDayNumber > 0 ? `Applying rebuilt Day ${rebuildDayNumber} timeline` : "Applying rebuilt timeline",
          "Refreshing the page with the rebuilt route, distances, and latest totals.",
        );
        const rebuiltDay = nextItinerary.days?.find((day) => Number(day.id) === Number(routeId));
        if (rebuiltDay && rebuiltDay.needsRebuild !== true) {
          setRouteNeedsRebuild((previousRouteId) => (
            Number(previousRouteId) === Number(routeId) ? null : previousRouteId
          ));
        }
      }
    } catch (error) {
      console.error("Failed to rebuild route", error);
      const message = error instanceof Error ? error.message : String(error || "");
      toast.error(message || "Failed to rebuild route");
    } finally {
      stopRouteTimeProgress();
      setIsRebuilding(false);
    }
  }, [
    getRouteTimeUpdateEstimateMs,
    itinerary,
    pushRouteProgressStage,
    quoteId,
    setHotelDetails,
    setItinerary,
    setIsRebuilding,
    setRouteNeedsRebuild,
    setRouteProgressHistory,
    setRouteProgressTitle,
    setRouteTimeEstimatedMs,
    shouldShowHotels,
    startRouteTimeProgress,
    stopRouteTimeProgress,
  ]);
}

export default useRouteRebuildMutation;
