import { useCallback, useState, type Dispatch, type SetStateAction } from "react";
import { HotelArrivalPolicyRequest, ItineraryService } from "@/services/itinerary";
import { toast } from "sonner";
import type { ItineraryDetailsResponse } from "../itinerary-details.types";
import { isEarlyMorningTime, normalizeDateToYmd, parseDisplayTimeToHms } from "../utils/timeline.utils";
import type { RouteTimeChangeType, RouteTimePatchOptions } from "./useRouteTimePatchMutation";
import {
  TRANSPORT_DEFAULT_HOTEL_REST_MINUTES,
  timeToMinutes,
  type TransportEarlyArrivalOption,
} from "../../CreateItinerary/helpers/transportEarlyArrival";
import type { TransportEarlyArrivalPreferenceValue } from "../components/TransportEarlyArrivalPreferenceDialog";

export interface PendingRouteTimeUpdate {
  planId: number;
  routeId: number;
  dayNumber: number;
  startTimeHms: string;
  endTimeHms: string;
}

export interface ArrivalPolicyConfirmModalState {
  open: boolean;
  arrivalDate: string;
  previousDayDate: string;
  request: HotelArrivalPolicyRequest | null;
}

export interface ArrivalPolicyRouteTimeControllerProps {
  itinerary: ItineraryDetailsResponse | null;
  requiresHotelBookingFlow: boolean;
  applyRouteTimePatch: (
    planId: number,
    routeId: number,
    dayNumber: number,
    startTimeHms: string,
    endTimeHms: string,
    options?: RouteTimePatchOptions,
  ) => Promise<void>;
  setIsResolvingArrivalPolicy: Dispatch<SetStateAction<boolean>>;
  setPendingRouteTimeUpdate: Dispatch<SetStateAction<PendingRouteTimeUpdate | null>>;
  setArrivalPolicyConfirmModal: Dispatch<SetStateAction<ArrivalPolicyConfirmModalState>>;
}

export type TransportEarlyArrivalDialogState = {
  open: boolean;
  option: TransportEarlyArrivalOption | "";
  hotelName: string;
  restMinutes: number;
  pendingUpdate: PendingRouteTimeUpdate | null;
};

export function useArrivalPolicyRouteTimeController({
  itinerary,
  requiresHotelBookingFlow,
  applyRouteTimePatch,
  setIsResolvingArrivalPolicy,
  setPendingRouteTimeUpdate,
  setArrivalPolicyConfirmModal,
}: ArrivalPolicyRouteTimeControllerProps) {
  const [transportEarlyArrivalDialog, setTransportEarlyArrivalDialog] = useState<TransportEarlyArrivalDialogState>({
    open: false,
    option: "",
    hotelName: "",
    restMinutes: TRANSPORT_DEFAULT_HOTEL_REST_MINUTES,
    pendingUpdate: null,
  });

  const closeTransportEarlyArrivalDialog = useCallback((open: boolean) => {
    if (!open) {
      setTransportEarlyArrivalDialog((current) => ({ ...current, open: false, pendingUpdate: null }));
    }
  }, []);

  const confirmTransportEarlyArrival = useCallback(async (value: TransportEarlyArrivalPreferenceValue) => {
    const pending = transportEarlyArrivalDialog.pendingUpdate;
    if (!pending) return;

    await applyRouteTimePatch(
      pending.planId,
      pending.routeId,
      pending.dayNumber,
      pending.startTimeHms,
      pending.endTimeHms,
      {
        transportEarlyArrivalOption: value.option,
        transportEarlyArrivalHotelName: value.hotelName,
        transportEarlyArrivalRestMinutes: value.restMinutes,
        changeType: "ROUTE_START",
      },
    );
    setTransportEarlyArrivalDialog({
      open: false,
      option: value.option,
      hotelName: value.hotelName,
      restMinutes: value.restMinutes,
      pendingUpdate: null,
    });
  }, [applyRouteTimePatch, transportEarlyArrivalDialog.pendingUpdate]);

  const handleUpdateRouteTimesDirect = useCallback(async (
    planId: number,
    routeId: number,
    dayNumber: number,
    startTimeDisplay: string,
    endTimeDisplay: string,
    changeType?: RouteTimeChangeType,
  ) => {
    const startTimeHms = parseDisplayTimeToHms(startTimeDisplay);
    const endTimeHms = parseDisplayTimeToHms(endTimeDisplay);
    const routeDay = itinerary?.days?.find((day) => Number(day.id) === Number(routeId))
      || itinerary?.days?.find((day) => Number(day.dayNumber) === Number(dayNumber));
    const currentStartTimeHms = parseDisplayTimeToHms(routeDay?.startTime || "");
    const currentEndTimeHms = parseDisplayTimeToHms(routeDay?.endTime || "");
    const hasTimeChanged = startTimeHms !== currentStartTimeHms || endTimeHms !== currentEndTimeHms;

    console.log(`Updating route times: planId=${planId}, routeId=${routeId}, day=${dayNumber}, start=${startTimeHms}, end=${endTimeHms}`);
    if (!hasTimeChanged) return;

    const isTransportOnly = Number(itinerary?.itineraryPreference) === 2;
    const startMinutes = timeToMinutes(startTimeHms);
    const isTransportEarlyArrival = startMinutes !== null && startMinutes < 8 * 60;
    if (isTransportOnly && dayNumber === 1 && isTransportEarlyArrival) {
      const existingOption = itinerary?.transport_early_arrival_option;
      const option = existingOption === "HOTEL_REST" || existingOption === "REFRESHMENT_BEFORE_SIGHTSEEING"
        ? existingOption
        : "";
      setTransportEarlyArrivalDialog({
        open: true,
        option,
        hotelName: String(itinerary?.transport_early_arrival_hotel_name || ""),
        restMinutes: Number(itinerary?.transport_early_arrival_rest_minutes || TRANSPORT_DEFAULT_HOTEL_REST_MINUTES),
        pendingUpdate: { planId, routeId, dayNumber, startTimeHms, endTimeHms },
      });
      return;
    }

    if (requiresHotelBookingFlow && dayNumber === 1 && isEarlyMorningTime(startTimeHms)) {
      const resolvedRouteDay = routeDay
        || itinerary?.days?.find((day) => Number(day.dayNumber) === 1)
        || itinerary?.days?.[0];
      const routeDateYmd = normalizeDateToYmd(resolvedRouteDay?.date);
      const request: HotelArrivalPolicyRequest = {
        itineraryPlanId: planId,
        itineraryRouteId: routeId,
        routeDayNumber: 1,
        routeDate: routeDateYmd,
        arrivalDateTime: routeDateYmd ? `${routeDateYmd}T${startTimeHms}` : undefined,
        arrivalCityName: resolvedRouteDay?.departure || "",
        routeSourceCityName: resolvedRouteDay?.departure || "",
        nightStayCityName: resolvedRouteDay?.arrival || "",
        previousDayBillingDecisionProvided: false,
        previousDayBillingConfirmed: false,
      };

      setIsResolvingArrivalPolicy(true);
      try {
        const policy = await ItineraryService.resolveHotelArrivalPolicy(request);
        if (policy.requiresPreviousDayBillingConfirmation) {
          console.log("[ArrivalPolicy][confirm_required]", { planId, routeId, dayNumber, startTimeHms, endTimeHms });
          setPendingRouteTimeUpdate({ planId, routeId, dayNumber, startTimeHms, endTimeHms });
          const safeRouteDate = normalizeDateToYmd(request.routeDate) || new Date().toISOString().split("T")[0];
          const routeDate = new Date(`${safeRouteDate}T00:00:00`);
          const previousDay = new Date(routeDate);
          previousDay.setDate(previousDay.getDate() - 1);
          const formatDate = (date: Date) => (
            `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`
          );
          setArrivalPolicyConfirmModal({
            open: true,
            arrivalDate: formatDate(routeDate),
            previousDayDate: formatDate(previousDay),
            request,
          });
          return;
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error || "");
        toast.error(message || "Failed to resolve arrival policy");
        return;
      } finally {
        setIsResolvingArrivalPolicy(false);
      }
    }

    await applyRouteTimePatch(planId, routeId, dayNumber, startTimeHms, endTimeHms, {
      changeType: changeType || (dayNumber === 1 ? "ROUTE_START" : "ROUTE_END"),
    });
  }, [
    applyRouteTimePatch,
    itinerary,
    requiresHotelBookingFlow,
    setArrivalPolicyConfirmModal,
    setIsResolvingArrivalPolicy,
    setPendingRouteTimeUpdate,
    setTransportEarlyArrivalDialog,
  ]);

  const persistArrivalPolicyDecision = useCallback(async (
    request: HotelArrivalPolicyRequest,
    confirmed: boolean,
  ): Promise<boolean> => {
    try {
      const routeDay = itinerary?.days?.find((day) => Number(day.id) === Number(request.itineraryRouteId))
        || itinerary?.days?.find((day) => Number(day.dayNumber) === Number(request.routeDayNumber || 1));
      if (!routeDay?.startTime || !routeDay?.endTime) return false;

      await applyRouteTimePatch(
        request.itineraryPlanId,
        request.itineraryRouteId,
        routeDay.dayNumber || request.routeDayNumber || 1,
        parseDisplayTimeToHms(routeDay.startTime),
        parseDisplayTimeToHms(routeDay.endTime),
        {
          previousDayBillingDecisionProvided: true,
          previousDayBillingConfirmed: confirmed,
          changeType: "ROUTE_START",
        },
      );
      return true;
    } catch (error) {
      console.error("Failed to persist arrival policy decision", error);
      return false;
    }
  }, [applyRouteTimePatch, itinerary]);

  return {
    handleUpdateRouteTimesDirect,
    persistArrivalPolicyDecision,
    transportEarlyArrivalDialog,
    closeTransportEarlyArrivalDialog,
    confirmTransportEarlyArrival,
  };
}

export default useArrivalPolicyRouteTimeController;
