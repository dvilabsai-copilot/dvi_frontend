import { useCallback } from "react";
import type { useItineraryRouteState } from "./useItineraryRouteState";
import type { useHotelWorkflowState } from "./useHotelWorkflowState";
import { useRouteTimeProgressController } from "./useRouteTimeProgressController";
import { PAGE_LOADER_STAGE_DETAILS } from "../itinerary-details.constants";

type RouteState = ReturnType<typeof useItineraryRouteState>;
type HotelWorkflowState = ReturnType<typeof useHotelWorkflowState>;

/** Composes page-loader stage updates with route-time progress lifecycle. */
export function useItineraryRouteProgressWorkflow({
  routeState,
  hotelWorkflowState,
  dayCount,
}: {
  routeState: RouteState;
  hotelWorkflowState: HotelWorkflowState;
  dayCount: number;
}) {
  const pushPageLoaderStage = useCallback((stage: string, detail?: string) => {
    routeState.setPageLoaderStage(stage);
    routeState.setPageLoaderDetail(detail || PAGE_LOADER_STAGE_DETAILS[stage] || "Preparing the latest itinerary data.");
    routeState.setPageLoaderHistory((previous) => previous[previous.length - 1] === stage ? previous : [...previous, stage].slice(-6));
  }, []);
  const progress = useRouteTimeProgressController({
    dayCount,
    timerRef: hotelWorkflowState.routeTimeProgressTimerRef,
    setProgressPercent: hotelWorkflowState.setRouteTimeProgressPercent,
    setProgressDetail: hotelWorkflowState.setRouteProgressDetail,
    setProgressHistory: hotelWorkflowState.setRouteProgressHistory,
  });
  return { pushPageLoaderStage, ...progress };
}
