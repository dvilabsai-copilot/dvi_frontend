import type { ItineraryDetailsResponse } from "../itinerary-details.types";
import { DEFAULT_EXTERNAL_STAY_MESSAGE } from "./useExternalStayEntries";
import { useItineraryQuotationDialogProps } from "./useItineraryQuotationDialogProps";
import type { useItineraryQuotationState } from "./useItineraryQuotationState";
import type { useItineraryQuotationHotelContext } from "./useItineraryQuotationHotelContext";
import { normalizeCancellationPolicyItems, normalizePrebookItems, resolvePrebookInclusions, resolvePrebookMealPlan } from "../utils/quotationConfirmationDetails.utils";
import { normalizeMealPlanLabel } from "../utils/domain.utils";
import { formatCurrency, parseWalletAmount } from "../utils/clipboardFormatting.utils";

type QuotationState = ReturnType<typeof useItineraryQuotationState>;
type HotelContext = ReturnType<typeof useItineraryQuotationHotelContext>;
type DialogOptions = Parameters<typeof useItineraryQuotationDialogProps>[0];

/** Shapes quotation state, review data, and callbacks into the confirmation dialog props. */
export function useItineraryQuotationDialogWorkflow({
  state,
  itinerary,
  requiresHotelBookingFlow,
  shouldEnableWalletTopUpOnConfirm,
  confirmation,
  hotelContext,
  actions,
}: {
  state: QuotationState;
  itinerary: ItineraryDetailsResponse | null;
  requiresHotelBookingFlow: boolean;
  shouldEnableWalletTopUpOnConfirm: boolean;
  confirmation: Pick<DialogOptions, "confirmRequiredAmount" | "isWalletInsufficientForConfirm" | "confirmRoomCount" | "confirmPassengerMix" | "confirmOccupancyPreview" | "requiresDetailedPassengerFlow" | "isOpeningConfirmQuotation" | "isPrebooking" | "hasPrebookPriceChanged" | "canConfirmQuotation">;
  hotelContext: Pick<HotelContext, "externalStayEntries" | "nonTboSelectedHotelEntries" | "prebookHotelEntries">;
  actions: Pick<DialogOptions, "handleWalletTopUpAndContinue" | "refreshConfirmWalletBalance" | "defaultPassenger" | "getPassengerFieldError" | "handleArrivalDateTimeChange" | "resetConfirmWalletTopUpPanel" | "handleConfirmQuotation">;
}) {
  return useItineraryQuotationDialogProps({
    state,
    itinerary,
    requiresHotelBookingFlow,
    shouldEnableWalletTopUpOnConfirm,
    ...confirmation,
    externalStayEntries: hotelContext.externalStayEntries as readonly Record<string, unknown>[],
    nonTboSelectedHotelEntries: hotelContext.nonTboSelectedHotelEntries as readonly Record<string, unknown>[],
    prebookHotelEntries: hotelContext.prebookHotelEntries as readonly Record<string, unknown>[],
    defaultExternalStayMessage: DEFAULT_EXTERNAL_STAY_MESSAGE,
    normalizePrebookItems,
    resolvePrebookInclusions,
    resolvePrebookMealPlan,
    normalizeCancellationPolicyItems,
    normalizeMealPlanLabel,
    parseWalletAmount,
    formatCurrency,
    ...actions,
  });
}
