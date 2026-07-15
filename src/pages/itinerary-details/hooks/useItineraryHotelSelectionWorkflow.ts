import type { MutableRefObject } from "react";
import { useHotelArrivalPolicyController } from "./useHotelArrivalPolicyController";
import { useHotelSelectionMutation } from "./useHotelSelectionMutation";
import { useHotelSearchSelectionMutation } from "./useHotelSearchSelectionMutation";
import type { useHotelWorkflowState } from "./useHotelWorkflowState";
import type { useHotelSelectionState } from "./useHotelSelectionState";
import type { useQuotationState } from "./useQuotationState";
import type { useItineraryRouteState } from "./useItineraryRouteState";

type HotelWorkflowState = ReturnType<typeof useHotelWorkflowState>;
type HotelSelectionState = ReturnType<typeof useHotelSelectionState>;
type QuotationState = ReturnType<typeof useQuotationState>;
type RouteState = ReturnType<typeof useItineraryRouteState>;

export function useItineraryHotelSelectionWorkflow({
  hotelWorkflowState,
  hotelSelectionState,
  quotationState,
  routeState,
  prebookDataRef,
  quoteId,
  readOnly,
  shouldShowHotels,
  ensureHotelDetailsLoaded,
  parseDisplayTimeToHms,
  isEarlyMorningTime,
  normalizeDateToYmd,
  buildArrivalPolicyDecisionKey,
  parseStaahSearchReference,
  isSupplierBookableHotel,
  getSafeErrorMessage,
}: {
  hotelWorkflowState: HotelWorkflowState;
  hotelSelectionState: HotelSelectionState;
  quotationState: QuotationState;
  routeState: RouteState;
  prebookDataRef: MutableRefObject<unknown | null>;
  quoteId: string | undefined;
  readOnly: boolean;
  shouldShowHotels: boolean;
  ensureHotelDetailsLoaded: () => Promise<unknown>;
  parseDisplayTimeToHms: (value: string) => string;
  isEarlyMorningTime: (value: string) => boolean;
  normalizeDateToYmd: (value?: string | Date | null) => string;
  buildArrivalPolicyDecisionKey: (routeId?: number, routeDate?: string, timeHms?: string) => string | null;
  parseStaahSearchReference: (reference: unknown) => { roomId?: string; rateId?: string };
  isSupplierBookableHotel: (hotel: unknown) => boolean;
  getSafeErrorMessage: (error: unknown, fallback: string) => string;
}) {
  const arrivalPolicy = useHotelArrivalPolicyController({
    itinerary: routeState.itinerary,
    guestDetails: quotationState.guestDetails,
    latestArrivalPolicy: hotelWorkflowState.latestArrivalPolicy,
    lastArrivalPolicyDecisionKey: hotelWorkflowState.lastArrivalPolicyDecisionKey,
    setGuestDetails: quotationState.setGuestDetails,
    setHotelSearchChildAges: hotelWorkflowState.setHotelSearchChildAges,
    setHotelSelectionModal: hotelWorkflowState.setHotelSelectionModal,
    setIsResolvingArrivalPolicy: hotelWorkflowState.setIsResolvingArrivalPolicy,
    setLatestArrivalPolicy: hotelWorkflowState.setLatestArrivalPolicy,
    setArrivalPolicyConfirmModal: hotelWorkflowState.setArrivalPolicyConfirmModal,
    ensureHotelDetailsLoaded, parseDisplayTimeToHms, isEarlyMorningTime, normalizeDateToYmd, buildArrivalPolicyDecisionKey,
  });
  const handleSelectHotel = useHotelSelectionMutation({
    readOnly, quoteId: quoteId || null, shouldShowHotels, selectedMealPlan: hotelWorkflowState.selectedMealPlan,
    hotelSelectionModal: hotelWorkflowState.hotelSelectionModal, setIsSelectingHotel: hotelWorkflowState.setIsSelectingHotel,
    setHotelSelectionModal: hotelWorkflowState.setHotelSelectionModal, setHotelSearchQuery: hotelWorkflowState.setHotelSearchQuery,
    setSelectedMealPlan: hotelWorkflowState.setSelectedMealPlan, setItinerary: routeState.setItinerary,
    setHotelDetails: routeState.setHotelDetails, getSafeErrorMessage,
  });
  const handleSelectHotelFromSearch = useHotelSearchSelectionMutation({
    readOnly, quoteId: quoteId || null, shouldShowHotels, selectedMealPlan: hotelWorkflowState.selectedMealPlan,
    hotelSelectionModal: hotelWorkflowState.hotelSelectionModal, prebookDataRef, parseStaahSearchReference,
    isSupplierBookableHotel, getSafeErrorMessage, setIsSelectingHotel: hotelWorkflowState.setIsSelectingHotel,
    setSelectedHotelBookings: hotelSelectionState.setSelectedHotelBookings, setPrebookData: quotationState.setPrebookData,
    setHasAcceptedUpdatedPrice: quotationState.setHasAcceptedUpdatedPrice, setHotelSelectionModal: hotelWorkflowState.setHotelSelectionModal,
    setHotelSearchQuery: hotelWorkflowState.setHotelSearchQuery, setSelectedMealPlan: hotelWorkflowState.setSelectedMealPlan,
    setItinerary: routeState.setItinerary, setHotelDetails: routeState.setHotelDetails,
  });
  return { ...arrivalPolicy, handleSelectHotel, handleSelectHotelFromSearch };
}
