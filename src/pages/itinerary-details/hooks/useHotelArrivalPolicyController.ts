import { useCallback, type Dispatch, type SetStateAction } from "react";
import { ItineraryService, type HotelArrivalPolicyRequest, type HotelArrivalPolicyResponse } from "@/services/itinerary";
import { toast } from "sonner";
import type { GuestDetails } from "./useQuotationState";
import type { ItineraryDetailsResponse } from "../itinerary-details.types";

type HotelSelectionModalState = {
  open: boolean;
  planId?: number | null;
  routeId?: number | null;
  routeDate?: string;
  cityCode?: string;
  cityName?: string;
  checkInDate?: string;
  checkOutDate?: string;
};

type ArrivalPolicyConfirmModalState = {
  open: boolean;
  arrivalDate: string;
  previousDayDate: string;
  request: HotelArrivalPolicyRequest | null;
};

type ArrivalPolicyControllerProps = {
  itinerary: ItineraryDetailsResponse | null;
  guestDetails: GuestDetails;
  latestArrivalPolicy: HotelArrivalPolicyResponse | null;
  lastArrivalPolicyDecisionKey: string | null;
  setGuestDetails: Dispatch<SetStateAction<GuestDetails>>;
  setHotelSearchChildAges: Dispatch<SetStateAction<string[]>>;
  setHotelSelectionModal: Dispatch<SetStateAction<HotelSelectionModalState>>;
  setIsResolvingArrivalPolicy: Dispatch<SetStateAction<boolean>>;
  setLatestArrivalPolicy: Dispatch<SetStateAction<HotelArrivalPolicyResponse | null>>;
  setArrivalPolicyConfirmModal: Dispatch<SetStateAction<ArrivalPolicyConfirmModalState>>;
  ensureHotelDetailsLoaded: () => Promise<unknown>;
  parseDisplayTimeToHms: (value: string) => string;
  isEarlyMorningTime: (value: string) => boolean;
  normalizeDateToYmd: (value?: string | Date | null) => string;
  buildArrivalPolicyDecisionKey: (routeId?: number, routeDate?: string, timeHms?: string) => string | null;
};

const normalizeArrivalDateTime = (input: string): string | null => {
  const directParsed = new Date(input);
  if (!Number.isNaN(directParsed.getTime())) {
    return directParsed.toISOString();
  }

  const match = input
    .trim()
    .match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})\s+(\d{1,2}):(\d{2})\s*(AM|PM)?$/i);
  if (!match) return null;

  const day = Number(match[1]);
  const month = Number(match[2]);
  const year = Number(match[3]);
  let hour = Number(match[4]);
  const minute = Number(match[5]);
  const ampm = (match[6] || "").toUpperCase();

  if (ampm === "PM" && hour < 12) hour += 12;
  if (ampm === "AM" && hour === 12) hour = 0;

  const parsed = new Date(year, month - 1, day, hour, minute, 0);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
};

const formatDate = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

export function useHotelArrivalPolicyController({
  itinerary,
  guestDetails,
  latestArrivalPolicy,
  lastArrivalPolicyDecisionKey,
  setGuestDetails,
  setHotelSearchChildAges,
  setHotelSelectionModal,
  setIsResolvingArrivalPolicy,
  setLatestArrivalPolicy,
  setArrivalPolicyConfirmModal,
  ensureHotelDetailsLoaded,
  parseDisplayTimeToHms,
  isEarlyMorningTime,
  normalizeDateToYmd,
  buildArrivalPolicyDecisionKey,
}: ArrivalPolicyControllerProps) {
  const applyArrivalPolicyDecision = useCallback((
    policy: HotelArrivalPolicyResponse,
    context: {
      planId: number;
      routeId: number;
      routeDate: string;
      cityCode: string;
      cityName: string;
    },
  ) => {
    if (!policy.shouldOpenHotelSearch) {
      if (policy.message) {
        toast.info(policy.message);
      }
      return;
    }

    if (policy.hotelFlowAction === "DIRECT_SIGHTSEEING" && policy.deferHotelToEndOfDay) {
      toast.info("Arrival policy: sightseeing first, hotel check-in later in the day.");
    } else if (policy.hotelFlowAction === "DIRECT_HOTEL" && policy.goToHotelImmediately) {
      toast.info("Arrival policy: proceed to hotel first.");
    }

    void ensureHotelDetailsLoaded();

    const itineraryChildCount = Number(itinerary?.children || 0);
    setHotelSearchChildAges((previous) =>
      Array.from({ length: itineraryChildCount }, (_, index) => previous[index] || ""),
    );

    setHotelSelectionModal({
      open: true,
      planId: context.planId,
      routeId: context.routeId,
      routeDate: context.routeDate,
      cityCode: context.cityCode,
      cityName: context.cityName,
      checkInDate: policy.effectiveCheckInDate,
      checkOutDate: policy.effectiveCheckOutDate,
    });
  }, [ensureHotelDetailsLoaded, itinerary?.children, setHotelSearchChildAges, setHotelSelectionModal]);

  const resolveArrivalPolicyForArrivalTimeChange = useCallback(async (
    request: HotelArrivalPolicyRequest,
  ) => {
    setIsResolvingArrivalPolicy(true);
    try {
      const policy = await ItineraryService.resolveHotelArrivalPolicy(request);
      setLatestArrivalPolicy(policy);

      if (policy.requiresPreviousDayBillingConfirmation) {
        const normalizedRouteDate = normalizeDateToYmd(request.routeDate) || new Date().toISOString().split("T")[0];
        const routeDate = new Date(`${normalizedRouteDate}T00:00:00`);
        const previousDay = new Date(routeDate);
        previousDay.setDate(previousDay.getDate() - 1);

        setArrivalPolicyConfirmModal({
          open: true,
          arrivalDate: formatDate(routeDate),
          previousDayDate: formatDate(previousDay),
          request,
        });
        return;
      }

      if (policy.message) {
        toast.info(policy.message);
      }
    } catch (error) {
      console.error("Failed to resolve arrival hotel policy from arrival-time change", error);
      const message = error instanceof Error
        ? error.message
        : error && typeof error === "object" && "message" in error
          ? String((error as { message?: unknown }).message || "Failed to resolve hotel arrival policy")
          : "Failed to resolve hotel arrival policy";
      toast.error(message);
    } finally {
      setIsResolvingArrivalPolicy(false);
    }
  }, [normalizeDateToYmd, setArrivalPolicyConfirmModal, setIsResolvingArrivalPolicy, setLatestArrivalPolicy]);

  const handleArrivalDateTimeChange = useCallback(async (newArrivalDateTime: string) => {
    setGuestDetails((previous) => ({
      ...previous,
      arrivalDateTime: newArrivalDateTime,
    }));

    if (!newArrivalDateTime || !itinerary?.planId || !itinerary.days?.length) return;

    const normalizedArrivalDateTime = normalizeArrivalDateTime(newArrivalDateTime);
    if (!normalizedArrivalDateTime) return;

    const firstDay = itinerary.days[0];
    if (!firstDay?.date || !firstDay?.id) return;

    const request: HotelArrivalPolicyRequest = {
      itineraryPlanId: itinerary.planId,
      itineraryRouteId: firstDay.id,
      routeDayNumber: firstDay.dayNumber || 1,
      routeDate: firstDay.date,
      arrivalDateTime: normalizedArrivalDateTime,
      arrivalCityName: guestDetails.arrivalPlace || firstDay.departure || "",
      routeSourceCityName: firstDay.departure || "",
      nightStayCityName: firstDay.arrival || "",
      previousDayBillingDecisionProvided: false,
      previousDayBillingConfirmed: false,
    };

    await resolveArrivalPolicyForArrivalTimeChange(request);
  }, [guestDetails.arrivalPlace, itinerary, resolveArrivalPolicyForArrivalTimeChange, setGuestDetails]);

  const openHotelSelectionModal = useCallback(async (
    planId: number,
    routeId: number,
    routeDate: string,
    cityCode: string,
    cityName: string,
  ) => {
    const routeDay = itinerary?.days?.find((day) => Number(day.id) === Number(routeId));
    const currentRouteStartTimeHms = parseDisplayTimeToHms(routeDay?.startTime || "");
    const currentDecisionKey = buildArrivalPolicyDecisionKey(routeId, routeDate, currentRouteStartTimeHms);
    const isDay1EarlyArrival = Number(routeDay?.dayNumber || 0) === 1 && isEarlyMorningTime(currentRouteStartTimeHms);

    if (isDay1EarlyArrival && itinerary?.planId && currentDecisionKey !== lastArrivalPolicyDecisionKey) {
      const request: HotelArrivalPolicyRequest = {
        itineraryPlanId: itinerary.planId,
        itineraryRouteId: routeId,
        routeDayNumber: routeDay?.dayNumber || 1,
        routeDate,
        arrivalDateTime: normalizeDateToYmd(routeDate)
          ? `${normalizeDateToYmd(routeDate)}T${currentRouteStartTimeHms}`
          : undefined,
        arrivalCityName: routeDay?.departure || cityName || "",
        routeSourceCityName: routeDay?.departure || cityName || "",
        nightStayCityName: routeDay?.arrival || cityName || "",
        previousDayBillingDecisionProvided: false,
        previousDayBillingConfirmed: false,
      };

      await resolveArrivalPolicyForArrivalTimeChange(request);
      return;
    }

    const shouldUseLatestArrivalPolicy = !!latestArrivalPolicy && Number(routeDay?.dayNumber || 0) === 1;
    const policyToApply: HotelArrivalPolicyResponse = shouldUseLatestArrivalPolicy
      ? latestArrivalPolicy
      : {
          resolutionStatus: "RESOLVED",
          arrivalWindow: Number(routeDay?.dayNumber || 0) === 1 ? "AFTERNOON_14_TO_1659" : "NON_ARRIVAL_DAY",
          requiresPreviousDayBillingConfirmation: false,
          shouldOpenHotelSearch: true,
          hotelSearchMode: "SAME_DAY",
          hotelFlowAction: "DIRECT_SIGHTSEEING",
          deferHotelToEndOfDay: true,
          goToHotelImmediately: false,
          effectiveCheckInDate: routeDate,
          effectiveCheckOutDate: routeDate,
          sameCityArrival: true,
          normalizationApplied: false,
          message: "Arrival policy: sightseeing first, hotel check-in later in the day.",
        };

    applyArrivalPolicyDecision(policyToApply, { planId, routeId, routeDate, cityCode, cityName });
  }, [applyArrivalPolicyDecision, buildArrivalPolicyDecisionKey, isEarlyMorningTime, itinerary, lastArrivalPolicyDecisionKey, latestArrivalPolicy, normalizeDateToYmd, parseDisplayTimeToHms, resolveArrivalPolicyForArrivalTimeChange]);

  return {
    applyArrivalPolicyDecision,
    resolveArrivalPolicyForArrivalTimeChange,
    handleArrivalDateTimeChange,
    openHotelSelectionModal,
  };
}
