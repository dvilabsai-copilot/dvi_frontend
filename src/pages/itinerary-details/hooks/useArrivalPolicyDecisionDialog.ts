import type { Dispatch, SetStateAction } from "react";
import type { ComponentProps } from "react";
import type { HotelArrivalPolicyRequest } from "@/services/itinerary";
import type { ArrivalHotelDecisionModal } from "@/components/hotels/ArrivalHotelDecisionModal";
import type { ItineraryDetailsResponse } from "../itinerary-details.types";
import type { RouteTimePatchOptions } from "./useRouteTimePatchMutation";
import type {
  ArrivalPolicyConfirmModalState,
  PendingRouteTimeUpdate,
} from "./useArrivalPolicyRouteTimeController";
import { getRequestArrivalPolicyDecisionKey } from "../utils/routeArrivalPolicy.utils";

type ArrivalPolicyDialogProps = ComponentProps<typeof ArrivalHotelDecisionModal>;

type ArrivalPolicyDecisionDialogOptions = {
  itinerary: ItineraryDetailsResponse | null;
  arrivalPolicyConfirmModal: ArrivalPolicyConfirmModalState;
  setArrivalPolicyConfirmModal: Dispatch<SetStateAction<ArrivalPolicyConfirmModalState>>;
  pendingRouteTimeUpdate: PendingRouteTimeUpdate | null;
  setPendingRouteTimeUpdate: Dispatch<SetStateAction<PendingRouteTimeUpdate | null>>;
  setLastArrivalPolicyDecisionKey: Dispatch<SetStateAction<string | null>>;
  isResolvingArrivalPolicy: boolean;
  isApplyingRouteTimeUpdate: boolean;
  applyRouteTimePatch: (
    planId: number,
    routeId: number,
    dayNumber: number,
    startTimeHms: string,
    endTimeHms: string,
    options?: RouteTimePatchOptions,
  ) => Promise<void>;
  persistArrivalPolicyDecision: (
    request: HotelArrivalPolicyRequest,
    confirmed: boolean,
  ) => Promise<boolean>;
  resolveArrivalPolicyForArrivalTimeChange: (
    request: HotelArrivalPolicyRequest,
  ) => Promise<void>;
};

const closedArrivalPolicyModal: ArrivalPolicyConfirmModalState = {
  open: false,
  arrivalDate: "",
  previousDayDate: "",
  request: null,
};

export function useArrivalPolicyDecisionDialog({
  itinerary,
  arrivalPolicyConfirmModal,
  setArrivalPolicyConfirmModal,
  pendingRouteTimeUpdate,
  setPendingRouteTimeUpdate,
  setLastArrivalPolicyDecisionKey,
  isResolvingArrivalPolicy,
  isApplyingRouteTimeUpdate,
  applyRouteTimePatch,
  persistArrivalPolicyDecision,
  resolveArrivalPolicyForArrivalTimeChange,
}: ArrivalPolicyDecisionDialogOptions): ArrivalPolicyDialogProps {
  const closeDialog = () => {
    setPendingRouteTimeUpdate(null);
    setArrivalPolicyConfirmModal(closedArrivalPolicyModal);
  };

  const handleDecision = async (confirmed: boolean) => {
    const request = arrivalPolicyConfirmModal.request;
    if (!request) return;

    const decisionKey = getRequestArrivalPolicyDecisionKey(request, itinerary);
    setArrivalPolicyConfirmModal(closedArrivalPolicyModal);

    if (pendingRouteTimeUpdate) {
      const {
        planId,
        routeId,
        dayNumber,
        startTimeHms,
        endTimeHms,
      } = pendingRouteTimeUpdate;
      setPendingRouteTimeUpdate(null);
      await applyRouteTimePatch(planId, routeId, dayNumber, startTimeHms, endTimeHms, {
        previousDayBillingDecisionProvided: true,
        previousDayBillingConfirmed: confirmed,
      });
      if (decisionKey) setLastArrivalPolicyDecisionKey(decisionKey);
      return;
    }

    const persisted = await persistArrivalPolicyDecision(request, confirmed);
    if (!persisted) {
      await resolveArrivalPolicyForArrivalTimeChange({
        ...request,
        previousDayBillingDecisionProvided: true,
        previousDayBillingConfirmed: confirmed,
      });
      return;
    }

    if (decisionKey) setLastArrivalPolicyDecisionKey(decisionKey);
  };

  return {
    open: arrivalPolicyConfirmModal.open,
    onOpenChange: (open) => {
      if (!open) closeDialog();
    },
    arrivalDate: arrivalPolicyConfirmModal.arrivalDate,
    previousDayDate: arrivalPolicyConfirmModal.previousDayDate,
    isLoading: isResolvingArrivalPolicy || isApplyingRouteTimeUpdate,
    onConfirmPreviousDayBilling: () => handleDecision(true),
    onDeclinePreviousDayBilling: () => handleDecision(false),
  };
}

