import type { Dispatch, SetStateAction } from "react";
import { ItineraryService } from "@/services/itinerary";
import { toast } from "sonner";
import type { ItineraryDetailsResponse } from "../itinerary-details.types";
import type { AdditionalPassenger, GuestDetails } from "./useQuotationState";
import type { ValidatedQuotationPassengers } from "./useQuotationPassengerValidation";
import { buildQuotationConfirmationPayload } from "../utils/quotationConfirmation.utils";
import { buildQuotationHotelBookings } from "../utils/quotationHotelBookings.utils";
import { buildQuotationHotelRouteContext } from "../utils/quotationHotelRouteContext.utils";
import { resolveQuotationBookingOccupancy } from "../utils/quotationBookingOccupancy.utils";
import { getSafeErrorMessage } from "../utils/quotationConfirmationDetails.utils";
import { toMoneyNumber } from "../utils/clipboardFormatting.utils";

type UnknownRecord = Record<string, unknown>;
type PreparedHotels = {
  autoSelectedHotels: Record<number, UnknownRecord>;
  groupTypeValue: number;
};
type BookingGuardResult = { clientIp?: string } | null;
type ConfirmationResponse = {
  message?: unknown;
  confirmed_itinerary_plan_ID?: unknown;
  confirmedHotelDetails?: unknown;
  hotelDetails?: unknown;
};

export function useQuotationConfirmationSubmission({
  itinerary,
  guestDetails,
  confirmDefaultNationality,
  additionalAdults,
  additionalChildren,
  additionalInfants,
  confirmOccupanciesTemplate,
  requiresHotelBookingFlow,
  canConfirmQuotation,
  requiresDetailedPassengerFlow,
  hasAcceptedUpdatedPrice,
  shouldEnableWalletTopUpOnConfirm,
  agentInfo,
  confirmRequiredAmount,
  prebookHotelEntries,
  externalStayEntries,
  validateQuotationPassengers,
  prepareQuotationHotelSelections,
  validateQuotationBookingGuards,
  completeQuotationConfirmation,
  refreshConfirmWalletBalance,
  prepareWalletTopUpPanel,
  resetConfirmWalletTopUpPanel,
  setFormErrors,
  setIsConfirmingQuotation,
  setLoadingHotels,
  setIsPrebooking,
  isSupplierBookableHotel,
  inferHotelProvider,
}: {
  itinerary: ItineraryDetailsResponse | null;
  guestDetails: GuestDetails;
  confirmDefaultNationality: string;
  additionalAdults: AdditionalPassenger[];
  additionalChildren: AdditionalPassenger[];
  additionalInfants: AdditionalPassenger[];
  confirmOccupanciesTemplate: Array<{ adults: number; children: number; childrenAges: number[] }> | null;
  requiresHotelBookingFlow: boolean;
  canConfirmQuotation: boolean;
  requiresDetailedPassengerFlow: boolean;
  hasAcceptedUpdatedPrice: boolean;
  shouldEnableWalletTopUpOnConfirm: boolean;
  agentInfo: { agent_id?: number } | null;
  confirmRequiredAmount: number;
  prebookHotelEntries: readonly UnknownRecord[];
  externalStayEntries: readonly UnknownRecord[];
  validateQuotationPassengers: () => ValidatedQuotationPassengers | null;
  prepareQuotationHotelSelections: () => PreparedHotels | null;
  validateQuotationBookingGuards: (hotelBookings: readonly UnknownRecord[]) => Promise<BookingGuardResult>;
  completeQuotationConfirmation: (response: ConfirmationResponse) => Promise<void>;
  refreshConfirmWalletBalance: (agentId: number) => Promise<number>;
  prepareWalletTopUpPanel: (walletBalance: number) => void;
  resetConfirmWalletTopUpPanel: () => void;
  setFormErrors: Dispatch<SetStateAction<Record<string, string>>>;
  setIsConfirmingQuotation: Dispatch<SetStateAction<boolean>>;
  setLoadingHotels: Dispatch<SetStateAction<boolean>>;
  setIsPrebooking: Dispatch<SetStateAction<boolean>>;
  isSupplierBookableHotel: (hotel: UnknownRecord) => boolean;
  inferHotelProvider: (hotel: UnknownRecord) => string;
}) {
  const handleConfirmQuotation = async (options: { skipWalletCheck?: boolean } = {}) => {
    if (!itinerary?.planId) {
      toast.error("Missing itinerary plan information");
      return;
    }

    if (!canConfirmQuotation) {
      toast.error("A vehicle with valid rates must be selected before confirmation.");
      return;
    }

    const validatedPassengers = validateQuotationPassengers();
    if (!validatedPassengers) return;
    const {
      normalizedAdditionalAdults,
      normalizedAdditionalChildren,
      normalizedAdditionalInfants,
      passengers,
    } = validatedPassengers;

    setFormErrors({});

    if (
      shouldEnableWalletTopUpOnConfirm &&
      !options.skipWalletCheck &&
      agentInfo?.agent_id &&
      confirmRequiredAmount > 0
    ) {
      try {
        const latestWalletBalance = await refreshConfirmWalletBalance(agentInfo.agent_id);
        if (latestWalletBalance < confirmRequiredAmount) {
          prepareWalletTopUpPanel(latestWalletBalance);
          toast.error(
            `Insufficient wallet balance to confirm booking. Please add at least ${toMoneyNumber(
              confirmRequiredAmount - latestWalletBalance,
            ).toFixed(2)} and continue.`,
          );
          return;
        }
        resetConfirmWalletTopUpPanel();
      } catch {
        toast.error("Failed to refresh wallet balance. Please try again.");
        return;
      }
    }

    setIsConfirmingQuotation(true);
    try {
      const preparedHotels = prepareQuotationHotelSelections();
      if (!preparedHotels) return;
      const { autoSelectedHotels, groupTypeValue } = preparedHotels;
      const { occupancies: occupanciesForBooking } = resolveQuotationBookingOccupancy({
        requiresHotelBookingFlow,
        requiresDetailedPassengerFlow,
        confirmOccupanciesTemplate,
        normalizedAdditionalChildren,
        roomCount: Number(itinerary.roomCount || 1),
        adults: Number(itinerary.adults || 1),
        children: Number(itinerary.children || 0),
      });

      const bookingGuestNationality = (guestDetails.nationality || confirmDefaultNationality || "IN")
        .trim()
        .toUpperCase();
      const hotelBookings = buildQuotationHotelBookings({
        autoSelectedHotels,
        requiresHotelBookingFlow,
        isSupplierBookableHotel,
        inferHotelProvider,
        occupancies: occupanciesForBooking,
        roomCount: Number(itinerary.roomCount || 1),
        guestNationality: bookingGuestNationality,
        passengers: passengers as readonly UnknownRecord[],
        toMoneyNumber,
      });

      const bookingGuardResult = await validateQuotationBookingGuards(hotelBookings);
      if (!bookingGuardResult) return;
      const primaryGuest = {
        salutation: guestDetails.salutation,
        name: guestDetails.name,
        phone: guestDetails.contactNo,
        email: guestDetails.emailId,
      };
      if (!agentInfo?.agent_id) {
        toast.error("Missing agent information for final confirmation. Please reopen Confirm Quotation and retry.");
        return;
      }

      const routeContext = buildQuotationHotelRouteContext({
        requiresHotelBookingFlow,
        hotelBookings: hotelBookings as readonly UnknownRecord[],
        prebookHotelEntries,
        externalStayEntries,
      });
      const confirmPayload = buildQuotationConfirmationPayload({
        planId: itinerary.planId,
        agentId: agentInfo.agent_id,
        guestDetails,
        additionalAdults: normalizedAdditionalAdults,
        additionalChildren: normalizedAdditionalChildren,
        additionalInfants: normalizedAdditionalInfants,
        requiresDetailedPassengerFlow,
        priceConfirmationType: requiresHotelBookingFlow && hasAcceptedUpdatedPrice ? "new" : "old",
        primaryGuest,
        endUserIp: bookingGuardResult.clientIp,
        requiresHotelBookingFlow,
        selectedGroupType: String(groupTypeValue),
        hotelBookings: routeContext.hotelBookingsWithPrebookContext,
        selectedHotelRouteIds: routeContext.selectedHotelRouteIds,
        externalStayRouteIds: routeContext.externalStayRouteIds,
      });

      const confirmResponse = await ItineraryService.confirmQuotation(
        confirmPayload as Parameters<typeof ItineraryService.confirmQuotation>[0],
      );
      await completeQuotationConfirmation(confirmResponse as ConfirmationResponse);
    } catch (error) {
      setLoadingHotels(false);
      console.error("Failed to confirm quotation", error);
      toast.error(getSafeErrorMessage(error, "Failed to confirm quotation"));
    } finally {
      setIsConfirmingQuotation(false);
      setIsPrebooking(false);
    }
  };

  return handleConfirmQuotation;
}
