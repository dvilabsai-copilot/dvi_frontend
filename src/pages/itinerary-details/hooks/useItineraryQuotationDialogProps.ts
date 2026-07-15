import type { ComponentProps } from "react";
import { QuotationConfirmationDialog } from "../components/QuotationConfirmationDialog";
import { useQuotationState } from "./useQuotationState";

type QuotationProps = ComponentProps<typeof QuotationConfirmationDialog>;
type QuotationState = ReturnType<typeof useQuotationState>;

type QuotationDialogOptions = {
  state: QuotationState;
  itinerary: (NonNullable<QuotationProps["passenger"]["guestDetails"]> extends never ? never : {
    children?: number;
    infants?: number;
  }) | null;
  requiresHotelBookingFlow: boolean;
  shouldEnableWalletTopUpOnConfirm: boolean;
  confirmRequiredAmount: number;
  isWalletInsufficientForConfirm: boolean;
  confirmRoomCount: number;
  confirmPassengerMix: string;
  confirmOccupancyPreview: Array<{ adults: number; children: number }>;
  requiresDetailedPassengerFlow: boolean;
  isOpeningConfirmQuotation: boolean;
  isPrebooking: boolean;
  externalStayEntries: QuotationProps["hotelReview"]["externalStayEntries"];
  nonTboSelectedHotelEntries: QuotationProps["hotelReview"]["nonTboSelectedHotelEntries"];
  prebookHotelEntries: QuotationProps["hotelReview"]["prebookHotelEntries"];
  hasPrebookPriceChanged: boolean;
  defaultExternalStayMessage: string;
  normalizePrebookItems: QuotationProps["hotelReview"]["normalizePrebookItems"];
  resolvePrebookInclusions: QuotationProps["hotelReview"]["resolvePrebookInclusions"];
  resolvePrebookMealPlan: QuotationProps["hotelReview"]["resolvePrebookMealPlan"];
  normalizeCancellationPolicyItems: QuotationProps["hotelReview"]["normalizeCancellationPolicyItems"];
  normalizeMealPlanLabel: QuotationProps["hotelReview"]["normalizeMealPlanLabel"];
  parseWalletAmount: QuotationProps["overview"]["parseWalletAmount"];
  formatCurrency: QuotationProps["overview"]["formatCurrency"];
  handleWalletTopUpAndContinue: QuotationProps["overview"]["handleWalletTopUpAndContinue"];
  refreshConfirmWalletBalance: QuotationProps["overview"]["refreshConfirmWalletBalance"];
  defaultPassenger: QuotationProps["passenger"]["defaultPassenger"];
  getPassengerFieldError: QuotationProps["passenger"]["getPassengerFieldError"];
  handleArrivalDateTimeChange: QuotationProps["travel"]["handleArrivalDateTimeChange"];
  resetConfirmWalletTopUpPanel: QuotationProps["footer"]["resetConfirmWalletTopUpPanel"];
  handleConfirmQuotation: QuotationProps["footer"]["handleConfirmQuotation"];
  canConfirmQuotation: boolean;
};

export function useItineraryQuotationDialogProps({
  state,
  itinerary,
  requiresHotelBookingFlow,
  shouldEnableWalletTopUpOnConfirm,
  confirmRequiredAmount,
  isWalletInsufficientForConfirm,
  confirmRoomCount,
  confirmPassengerMix,
  confirmOccupancyPreview,
  requiresDetailedPassengerFlow,
  isOpeningConfirmQuotation,
  isPrebooking,
  externalStayEntries,
  nonTboSelectedHotelEntries,
  prebookHotelEntries,
  hasPrebookPriceChanged,
  defaultExternalStayMessage,
  normalizePrebookItems,
  resolvePrebookInclusions,
  resolvePrebookMealPlan,
  normalizeCancellationPolicyItems,
  normalizeMealPlanLabel,
  parseWalletAmount,
  formatCurrency,
  handleWalletTopUpAndContinue,
  refreshConfirmWalletBalance,
  defaultPassenger,
  getPassengerFieldError,
  handleArrivalDateTimeChange,
  resetConfirmWalletTopUpPanel,
  handleConfirmQuotation,
  canConfirmQuotation,
}: QuotationDialogOptions): Omit<QuotationProps, "open" | "onOpenChange"> {
  return {
    overview: {
      agentInfo: state.agentInfo,
      walletBalance: state.walletBalance,
      walletBalanceAmount: state.walletBalanceAmount,
      parseWalletAmount,
      confirmRequiredAmount,
      formatCurrency,
      shouldEnableWalletTopUpOnConfirm,
      showWalletTopUpPanel: state.showWalletTopUpPanel,
      walletShortfallAmount: state.walletShortfallAmount,
      walletTopUpAmount: state.walletTopUpAmount,
      setWalletTopUpAmount: state.setWalletTopUpAmount,
      walletTopUpRemark: state.walletTopUpRemark,
      setWalletTopUpRemark: state.setWalletTopUpRemark,
      isWalletTopUpSubmitting: state.isWalletTopUpSubmitting,
      handleWalletTopUpAndContinue,
      refreshConfirmWalletBalance,
      isWalletInsufficientForConfirm,
      requiresHotelBookingFlow,
      confirmRoomCount,
      confirmPassengerMix,
      confirmOccupancyPreview,
      requiresDetailedPassengerFlow,
      childrenCount: Number(itinerary?.children || 0),
      infantsCount: Number(itinerary?.infants || 0),
      isOpeningConfirmQuotation,
      isPrebooking,
      prebookData: state.prebookData,
    },
    hotelReview: {
      requiresHotelBookingFlow,
      externalStayEntries,
      defaultExternalStayMessage,
      hasAcceptedUpdatedPrice: state.hasAcceptedUpdatedPrice,
      setHasAcceptedUpdatedPrice: state.setHasAcceptedUpdatedPrice,
      prebookData: state.prebookData,
      isPrebooking,
      isOpeningConfirmQuotation,
      nonTboSelectedHotelEntries,
      prebookHotelEntries,
      hasPrebookPriceChanged,
      normalizePrebookItems,
      resolvePrebookInclusions,
      resolvePrebookMealPlan,
      normalizeCancellationPolicyItems,
      normalizeMealPlanLabel,
    },
    passenger: {
      guestDetails: state.guestDetails,
      setGuestDetails: state.setGuestDetails,
      formErrors: state.formErrors,
      setFormErrors: state.setFormErrors,
      requiresDetailedPassengerFlow,
      additionalAdults: state.additionalAdults,
      setAdditionalAdults: state.setAdditionalAdults,
      additionalChildren: state.additionalChildren,
      setAdditionalChildren: state.setAdditionalChildren,
      additionalInfants: state.additionalInfants,
      setAdditionalInfants: state.setAdditionalInfants,
      defaultPassenger,
      getPassengerFieldError,
    },
    travel: { guestDetails: state.guestDetails, setGuestDetails: state.setGuestDetails, handleArrivalDateTimeChange },
    footer: {
      setConfirmQuotationModal: state.setConfirmQuotationModal,
      setGuestDetails: state.setGuestDetails,
      confirmDefaultNationality: state.confirmDefaultNationality,
      setAdditionalAdults: state.setAdditionalAdults,
      setAdditionalChildren: state.setAdditionalChildren,
      setAdditionalInfants: state.setAdditionalInfants,
      setPrebookData: state.setPrebookData,
      setHasAcceptedUpdatedPrice: state.setHasAcceptedUpdatedPrice,
      setFormErrors: state.setFormErrors,
      resetConfirmWalletTopUpPanel,
      handleConfirmQuotation,
      isConfirmingQuotation: state.isConfirmingQuotation,
      isPrebooking,
      isWalletTopUpSubmitting: state.isWalletTopUpSubmitting,
      canConfirmQuotation,
    },
  };
}
