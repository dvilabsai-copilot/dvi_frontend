import { useQuotationConfirmationModalController } from "./useQuotationConfirmationModalController";
import { useQuotationPassengerValidation } from "./useQuotationPassengerValidation";
import { useQuotationHotelSelectionPreparation } from "./useQuotationHotelSelectionPreparation";
import { useQuotationConfirmationCompletion } from "./useQuotationConfirmationCompletion";
import { useQuotationBookingGuards } from "./useQuotationBookingGuards";
import { useQuotationConfirmationSubmission } from "./useQuotationConfirmationSubmission";
import type { useItineraryRouteState } from "./useItineraryRouteState";
import type { useItineraryQuotationState } from "./useItineraryQuotationState";
import type { useHotelSelectionState } from "./useHotelSelectionState";
import type { useHotelWorkflowState } from "./useHotelWorkflowState";
import type { useItineraryQuotationHotelContext } from "./useItineraryQuotationHotelContext";
import type { ItineraryDetailsResponse } from "../itinerary-details.types";
import type { useWalletTopUpController } from "./useWalletTopUpController";

type RouteState = ReturnType<typeof useItineraryRouteState>;
type QuotationState = ReturnType<typeof useItineraryQuotationState>;
type HotelSelectionState = ReturnType<typeof useHotelSelectionState>;
type HotelWorkflowState = ReturnType<typeof useHotelWorkflowState>;
type HotelContext = ReturnType<typeof useItineraryQuotationHotelContext>;
type WalletTopUp = ReturnType<typeof useWalletTopUpController>;
type LoadConfirmedHotels = Parameters<typeof useQuotationConfirmationCompletion>[0]["loadConfirmedHotelsFromDb"];

export function useItineraryQuotationConfirmationWorkflow({
  routeState,
  quotationState,
  hotelSelectionState,
  hotelWorkflowState,
  hotelContext,
  itinerary,
  hotelDetails,
  quoteId,
  requiresHotelBookingFlow,
  requiresDetailedPassengerFlow,
  canConfirmQuotation,
  isVehicleOnlyItinerary,
  shouldEnableWalletTopUpOnConfirm,
  tboSessionWindowMs,
  defaultExternalStayMessage,
  loadConfirmedHotelsFromDb,
  normalizeHotelProvider,
  isSupplierBookableHotel,
  parseStaahSearchReference,
  getHotelSelectionAmount,
  inferHotelProvider,
  walletTopUp,
}: {
  routeState: RouteState;
  quotationState: QuotationState;
  hotelSelectionState: HotelSelectionState;
  hotelWorkflowState: HotelWorkflowState;
  hotelContext: HotelContext;
  itinerary: ItineraryDetailsResponse | null;
  hotelDetails: RouteState["hotelDetails"];
  quoteId: string | undefined;
  requiresHotelBookingFlow: boolean;
  requiresDetailedPassengerFlow: boolean;
  canConfirmQuotation: boolean;
  isVehicleOnlyItinerary: boolean;
  shouldEnableWalletTopUpOnConfirm: boolean;
  tboSessionWindowMs: number;
  defaultExternalStayMessage: string;
  loadConfirmedHotelsFromDb: LoadConfirmedHotels;
  normalizeHotelProvider: (hotel: Record<string, unknown>) => string;
  isSupplierBookableHotel: (hotel: Record<string, unknown>) => boolean;
  parseStaahSearchReference: (reference: unknown) => { roomId?: string; rateId?: string };
  getHotelSelectionAmount: (hotel: Record<string, unknown>) => number;
  inferHotelProvider: (hotel: Record<string, unknown>) => string;
  walletTopUp: Pick<WalletTopUp, "handleWalletTopUpAndContinue" | "prepareWalletTopUpPanel" | "refreshConfirmWalletBalance" | "resetConfirmWalletTopUpPanel">;
}) {
  const { setItinerary, setHotelDetails } = routeState;
  const {
    guestDetails, confirmDefaultNationality, setConfirmQuotationModal,
    setGuestDetails, setAdditionalAdults, setAdditionalChildren, setAdditionalInfants, setPrebookData,
    setHasAcceptedUpdatedPrice, setFormErrors, setIsOpeningConfirmQuotation, setConfirmOccupanciesTemplate,
    setIsPrebooking, setIsConfirmingQuotation,
  } = quotationState;
  const {
    selectedHotelBookings, setSelectedHotelBookings, setSelectedVehicleTotalsByType,
    setActiveHotelGroupType, setActiveHotelListTotal,
  } = hotelSelectionState;
  const { setLoadingHotels: setWorkflowLoadingHotels } = hotelWorkflowState;
  const {
    prebookDataRef, nonTboSelectedHotelEntries, externalStayEntries, getCoveredRouteIdsFromHotelSelections,
    prebookHotelEntries,
  } = hotelContext;

  const openConfirmQuotationModal = useQuotationConfirmationModalController({
    itinerary,
    hotelDetails: hotelDetails as unknown as { hotels?: Array<Record<string, unknown>>; hotelTabs?: Array<{ groupType?: number }> } | null,
    guestDetails, confirmDefaultNationality, requiresDetailedPassengerFlow, isVehicleOnlyItinerary,
    isOpeningConfirmQuotation: quotationState.isOpeningConfirmQuotation,
    selectedHotelBookings: selectedHotelBookings as unknown as Record<number, Record<string, unknown>>,
    activeHotelGroupType: hotelSelectionState.activeHotelGroupType,
    prebookDataRef: prebookDataRef as unknown as React.MutableRefObject<unknown | null>,
    tboSessionWindowMs,
    nonTboSelectedHotelEntries: nonTboSelectedHotelEntries as unknown as Array<Record<string, unknown>>,
    setIsOpeningConfirmQuotation, setConfirmQuotationModal, setPrebookData: (data) => setPrebookData(data as typeof quotationState.prebookData),
    setHasAcceptedUpdatedPrice, setConfirmOccupanciesTemplate, setFormErrors, resetConfirmWalletTopUpPanel: walletTopUp.resetConfirmWalletTopUpPanel,
    setAdditionalAdults, setAdditionalChildren, setAdditionalInfants, setWalletBalance: quotationState.setWalletBalance,
    setWalletBalanceAmount: quotationState.setWalletBalanceAmount, setAgentInfo: quotationState.setAgentInfo,
    setConfirmDefaultNationality: quotationState.setConfirmDefaultNationality, setGuestDetails,
    setSelectedHotelBookings: (updater) => setSelectedHotelBookings((previous) => updater(previous as unknown as Record<number, Record<string, unknown>>) as unknown as typeof previous),
    setIsPrebooking, refreshConfirmWalletBalance: walletTopUp.refreshConfirmWalletBalance,
    getCoveredRouteIdsFromHotelSelections: getCoveredRouteIdsFromHotelSelections as (selections: Record<number, Record<string, unknown>>) => Set<number>,
    normalizeHotelProvider, isSupplierBookableHotel, parseStaahSearchReference, getHotelSelectionAmount,
  });
  const validateQuotationPassengers = useQuotationPassengerValidation({
    guestDetails, additionalAdults: quotationState.additionalAdults, additionalChildren: quotationState.additionalChildren,
    additionalInfants: quotationState.additionalInfants, requiresDetailedPassengerFlow,
    expectedAdults: Math.max(Number(itinerary?.adults || 0) - 1, 0), expectedChildren: Math.max(Number(itinerary?.children || 0), 0),
    expectedInfants: Math.max(Number(itinerary?.infants || 0), 0), setFormErrors,
  });
  const prepareQuotationHotelSelections = useQuotationHotelSelectionPreparation({
    selectedHotelBookings: selectedHotelBookings as unknown as Record<number, Record<string, unknown>>,
    hotelDetails: hotelDetails as unknown as { hotels?: Array<Record<string, unknown>>; hotelTabs?: Array<{ groupType?: number }> } | null,
    activeHotelGroupType: hotelSelectionState.activeHotelGroupType, requiresHotelBookingFlow, itineraryDays: itinerary?.days || [],
    defaultExternalStayMessage: defaultExternalStayMessage, normalizeHotelProvider, isSupplierBookableHotel,
    parseStaahSearchReference, getHotelSelectionAmount,
    getCoveredRouteIdsFromHotelSelections: getCoveredRouteIdsFromHotelSelections as (selections: Record<number, Record<string, unknown>>) => Set<number>,
    setSelectedHotelBookings: (updater) => setSelectedHotelBookings((previous) => updater(previous as unknown as Record<number, Record<string, unknown>>) as unknown as typeof previous),
  });
  const completeQuotationConfirmation = useQuotationConfirmationCompletion({
    confirmDefaultNationality, setConfirmQuotationModal, setLoadingHotels: setWorkflowLoadingHotels,
    setActiveHotelListTotal, setSelectedVehicleTotalsByType, setSelectedHotelBookings: (bookings) => setSelectedHotelBookings(bookings as unknown as typeof selectedHotelBookings),
    setActiveHotelGroupType, loadConfirmedHotelsFromDb, setItinerary, setHotelDetails, setGuestDetails,
    setAdditionalAdults, setAdditionalChildren, setAdditionalInfants, setPrebookData: (data) => setPrebookData(data as typeof quotationState.prebookData),
    prebookDataRef: prebookDataRef as unknown as React.MutableRefObject<unknown>, setHasAcceptedUpdatedPrice, setFormErrors,
  });
  const validateQuotationBookingGuards = useQuotationBookingGuards({
    requiresHotelBookingFlow, externalStayCount: externalStayEntries.length, tboSessionWindowMs,
    prebookData: quotationState.prebookData, prebookDataRef: prebookDataRef as unknown as React.MutableRefObject<Record<string, unknown> | null>,
    hasAcceptedUpdatedPrice: quotationState.hasAcceptedUpdatedPrice,
    setPrebookData: (data) => setPrebookData(data as typeof quotationState.prebookData), setHasAcceptedUpdatedPrice,
  });
  const handleConfirmQuotation = useQuotationConfirmationSubmission({
    itinerary, guestDetails, confirmDefaultNationality, additionalAdults: quotationState.additionalAdults,
    additionalChildren: quotationState.additionalChildren, additionalInfants: quotationState.additionalInfants,
    confirmOccupanciesTemplate: quotationState.confirmOccupanciesTemplate, requiresHotelBookingFlow, canConfirmQuotation,
    requiresDetailedPassengerFlow, hasAcceptedUpdatedPrice: quotationState.hasAcceptedUpdatedPrice,
    shouldEnableWalletTopUpOnConfirm, agentInfo: quotationState.agentInfo, confirmRequiredAmount: quotationState.confirmRequiredAmount,
    prebookHotelEntries: prebookHotelEntries as readonly Record<string, unknown>[], externalStayEntries: externalStayEntries as readonly Record<string, unknown>[],
    validateQuotationPassengers, prepareQuotationHotelSelections,
    validateQuotationBookingGuards: validateQuotationBookingGuards as unknown as (hotelBookings: readonly Record<string, unknown>[]) => Promise<{ clientIp?: string } | null>,
    completeQuotationConfirmation, refreshConfirmWalletBalance: walletTopUp.refreshConfirmWalletBalance,
    prepareWalletTopUpPanel: walletTopUp.prepareWalletTopUpPanel, resetConfirmWalletTopUpPanel: walletTopUp.resetConfirmWalletTopUpPanel,
    setFormErrors, setIsConfirmingQuotation, setLoadingHotels: setWorkflowLoadingHotels, setIsPrebooking,
    isSupplierBookableHotel, inferHotelProvider,
  });
  return { openConfirmQuotationModal, handleConfirmQuotation };
}
