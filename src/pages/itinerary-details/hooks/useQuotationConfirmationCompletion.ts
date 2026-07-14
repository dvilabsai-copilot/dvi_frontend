import { useCallback, type MutableRefObject } from "react";
import { toast } from "sonner";
import type { AdditionalPassenger } from "./useQuotationState";
import type { ItineraryDetailsResponse, ItineraryHotelDetailsResponse } from "../itinerary-details.types";

interface ConfirmationResponse {
  message?: unknown;
  confirmed_itinerary_plan_ID?: unknown;
  confirmedHotelDetails?: unknown;
  hotelDetails?: unknown;
}

interface GuestDetailsReset {
  salutation: string;
  name: string;
  contactNo: string;
  age: string;
  nationality: string;
  panNo: string;
  passportNo: string;
  alternativeContactNo: string;
  emailId: string;
  arrivalDateTime: string;
  arrivalPlace: string;
  arrivalFlightDetails: string;
  departureDateTime: string;
  departurePlace: string;
  departureFlightDetails: string;
}

interface ConfirmationCompletionOptions {
  confirmDefaultNationality: string;
  setConfirmQuotationModal: (open: boolean) => void;
  setLoadingHotels: (loading: boolean) => void;
  setActiveHotelListTotal: (total: number) => void;
  setSelectedVehicleTotalsByType: (totals: Record<number, { totalAmount: number; totalQty: number }>) => void;
  setSelectedHotelBookings: (bookings: Record<number, unknown>) => void;
  setActiveHotelGroupType: (groupType: number | null) => void;
  loadConfirmedHotelsFromDb: (planId: number, responseDetails: unknown) => Promise<ItineraryHotelDetailsResponse | null>;
  setItinerary: (updater: (previous: ItineraryDetailsResponse | null) => ItineraryDetailsResponse | null) => void;
  setHotelDetails: (details: ItineraryHotelDetailsResponse | null) => void;
  setGuestDetails: (details: GuestDetailsReset) => void;
  setAdditionalAdults: (passengers: AdditionalPassenger[]) => void;
  setAdditionalChildren: (passengers: AdditionalPassenger[]) => void;
  setAdditionalInfants: (passengers: AdditionalPassenger[]) => void;
  setPrebookData: (data: unknown) => void;
  prebookDataRef: MutableRefObject<unknown>;
  setHasAcceptedUpdatedPrice: (accepted: boolean) => void;
  setFormErrors: (errors: Record<string, string>) => void;
}

/** Owns the successful-confirmation refresh and form reset sequence. */
export const useQuotationConfirmationCompletion = ({
  confirmDefaultNationality,
  setConfirmQuotationModal,
  setLoadingHotels,
  setActiveHotelListTotal,
  setSelectedVehicleTotalsByType,
  setSelectedHotelBookings,
  setActiveHotelGroupType,
  loadConfirmedHotelsFromDb,
  setItinerary,
  setHotelDetails,
  setGuestDetails,
  setAdditionalAdults,
  setAdditionalChildren,
  setAdditionalInfants,
  setPrebookData,
  prebookDataRef,
  setHasAcceptedUpdatedPrice,
  setFormErrors,
}: ConfirmationCompletionOptions) => useCallback(async (confirmResponse: ConfirmationResponse) => {
  toast.success(String(confirmResponse?.message || "Quotation confirmed successfully!"));
  setConfirmQuotationModal(false);
  setLoadingHotels(true);
  setActiveHotelListTotal(0);
  setSelectedVehicleTotalsByType({});
  setSelectedHotelBookings({});
  setActiveHotelGroupType(null);

  const confirmedPlanId = Number(confirmResponse?.confirmed_itinerary_plan_ID || 0);
  if (confirmedPlanId > 0) {
    const responseDetails = confirmResponse?.confirmedHotelDetails || confirmResponse?.hotelDetails || null;
    const refreshedHotelDetails = await loadConfirmedHotelsFromDb(confirmedPlanId, responseDetails);
    setItinerary((previous) => {
      if (!previous) return previous;
      return { ...previous, confirmed_itinerary_plan_ID: confirmedPlanId, isConfirmed: true };
    });
    setHotelDetails(refreshedHotelDetails);
  } else {
    console.warn('[CONFIRM_QUOTATION_NO_CONFIRMED_PLAN_ID]', confirmResponse);
  }

  setLoadingHotels(false);
  setGuestDetails({
    salutation: 'Mr',
    name: '',
    contactNo: '',
    age: '',
    nationality: confirmDefaultNationality,
    panNo: '',
    passportNo: '',
    alternativeContactNo: '',
    emailId: '',
    arrivalDateTime: '',
    arrivalPlace: '',
    arrivalFlightDetails: '',
    departureDateTime: '',
    departurePlace: '',
    departureFlightDetails: '',
  });
  setAdditionalAdults([]);
  setAdditionalChildren([]);
  setAdditionalInfants([]);
  setPrebookData(null);
  prebookDataRef.current = null;
  setHasAcceptedUpdatedPrice(false);
  setFormErrors({});
  setSelectedHotelBookings({});
}, [confirmDefaultNationality, loadConfirmedHotelsFromDb, prebookDataRef, setActiveHotelGroupType, setActiveHotelListTotal, setAdditionalAdults, setAdditionalChildren, setAdditionalInfants, setConfirmQuotationModal, setFormErrors, setGuestDetails, setHasAcceptedUpdatedPrice, setHotelDetails, setItinerary, setLoadingHotels, setPrebookData, setSelectedHotelBookings, setSelectedVehicleTotalsByType]);
