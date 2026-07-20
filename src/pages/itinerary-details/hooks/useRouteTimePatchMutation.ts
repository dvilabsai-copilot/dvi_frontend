import { useCallback, type Dispatch, type SetStateAction } from "react";
import { toast } from "sonner";
import { ItineraryService } from "@/services/itinerary";
import type {
  ItineraryDetailsResponse,
  ItineraryHotelDetailsResponse,
} from "../itinerary-details.types";

export interface RouteTimePatchOptions {
  previousDayBillingDecisionProvided?: boolean;
  previousDayBillingConfirmed?: boolean;
  transportEarlyArrivalOption?: "HOTEL_REST" | "REFRESHMENT_BEFORE_SIGHTSEEING" | null;
  transportEarlyArrivalHotelName?: string | null;
  transportEarlyArrivalRestMinutes?: number | null;
}

export interface RouteTimePatchMutationProps {
  quoteId: string | null;
  hotelDetails: ItineraryHotelDetailsResponse | null;
  setIsApplyingRouteTimeUpdate: Dispatch<SetStateAction<boolean>>;
  getRouteTimeUpdateEstimateMs: (dayNumber: number) => number;
  setRouteTimeEstimatedMs: Dispatch<SetStateAction<number>>;
  setRouteProgressTitle: Dispatch<SetStateAction<string>>;
  setRouteProgressHistory: Dispatch<SetStateAction<string[]>>;
  startRouteTimeProgress: (estimateMs: number) => void;
  stopRouteTimeProgress: () => void;
  pushRouteProgressStage: (stage: string, detail?: string) => void;
  setItinerary: Dispatch<SetStateAction<ItineraryDetailsResponse | null>>;
  setHotelDetails: Dispatch<SetStateAction<ItineraryHotelDetailsResponse | null>>;
  setRouteTimeProgressPercent: Dispatch<SetStateAction<number>>;
  setPendingScrollDayNumber: Dispatch<SetStateAction<number | null>>;
  setRouteRestrictionError?: Dispatch<SetStateAction<string | null>>;
}

export function useRouteTimePatchMutation({
  quoteId,
  hotelDetails,
  setIsApplyingRouteTimeUpdate,
  getRouteTimeUpdateEstimateMs,
  setRouteTimeEstimatedMs,
  setRouteProgressTitle,
  setRouteProgressHistory,
  startRouteTimeProgress,
  stopRouteTimeProgress,
  pushRouteProgressStage,
  setItinerary,
  setHotelDetails,
  setRouteTimeProgressPercent,
  setPendingScrollDayNumber,
  setRouteRestrictionError,
}: RouteTimePatchMutationProps) {
  return useCallback(async (
    planId: number,
    routeId: number,
    dayNumber: number,
    startTimeHms: string,
    endTimeHms: string,
    options?: RouteTimePatchOptions,
  ) => {
    setIsApplyingRouteTimeUpdate(true);
    const estimatedMs = getRouteTimeUpdateEstimateMs(dayNumber);
    setRouteTimeEstimatedMs(estimatedMs);
    setRouteProgressTitle(`Updating Day ${dayNumber} timings`);
    setRouteProgressHistory([]);
    startRouteTimeProgress(estimatedMs);
    pushRouteProgressStage(
      `Saving Day ${dayNumber} start/end time`,
      `Updating Day ${dayNumber} timing window to ${startTimeHms.slice(0, 5)} - ${endTimeHms.slice(0, 5)} and triggering itinerary rebuild.`,
    );

    try {
      const previousHotelDetails = hotelDetails;
      await ItineraryService.updateRouteTimes(planId, routeId, startTimeHms, endTimeHms, options);
      pushRouteProgressStage(
        `Reloading updated Day ${dayNumber} itinerary`,
        "Fetching the rebuilt day timeline after the new timing window was saved.",
      );

      if (quoteId) {
        const detailsRes = await ItineraryService.getDetails(quoteId);
        const nextItinerary = detailsRes as ItineraryDetailsResponse;
        setItinerary({
          ...nextItinerary,
          vehicles: nextItinerary.vehicles,
          costBreakdown: nextItinerary.costBreakdown,
          overallCost: nextItinerary.overallCost,
        });
        setHotelDetails(previousHotelDetails);
        pushRouteProgressStage(
          `Applying refreshed Day ${dayNumber} timeline`,
          "Refreshing the page with the latest timings, route rows, and updated totals.",
        );
      }

      setRouteTimeProgressPercent(100);
      setPendingScrollDayNumber(dayNumber);
      toast.success(`Day ${dayNumber} times updated`);
    } catch (error) {
      console.error("Failed to update route times", error);
      const message = error instanceof Error ? error.message : String(error || "");
      if (message.includes("unavailable for the selected vehicle because")) {
        setRouteRestrictionError?.(message);
      } else {
        toast.error(message || "Failed to update route times");
      }
    } finally {
      stopRouteTimeProgress();
      setIsApplyingRouteTimeUpdate(false);
    }
  }, [
    getRouteTimeUpdateEstimateMs,
    hotelDetails,
    pushRouteProgressStage,
    quoteId,
    setHotelDetails,
    setIsApplyingRouteTimeUpdate,
    setItinerary,
    setPendingScrollDayNumber,
    setRouteProgressHistory,
    setRouteProgressTitle,
    setRouteTimeEstimatedMs,
    setRouteTimeProgressPercent,
    setRouteRestrictionError,
    startRouteTimeProgress,
    stopRouteTimeProgress,
  ]);
}

export default useRouteTimePatchMutation;
