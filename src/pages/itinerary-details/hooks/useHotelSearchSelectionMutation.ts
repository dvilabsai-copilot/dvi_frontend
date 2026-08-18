import { useCallback, type Dispatch, type MutableRefObject, type SetStateAction } from "react";
import { ItineraryService } from "@/services/itinerary";
import { toast } from "sonner";
import type { ItineraryDetailsResponse, ItineraryHotelDetailsResponse } from "../itinerary-details.types";
import { normalizeHotelStayDates } from "../utils/hotelStayDates.utils";

interface HotelSelectionModalState {
  open?: boolean;
  planId: number | null;
  routeId: number | null;
  routeDate?: string;
  checkInDate?: string;
  checkOutDate?: string;
  groupType?: number;
}

interface MealPlanSelection {
  all: boolean;
  breakfast: boolean;
  lunch: boolean;
  dinner: boolean;
}

interface HotelSearchResultLike {
  canonicalHotelId?: number;
  hotelId?: number;
  hotelCode?: string | number;
  bookingCode?: string;
  searchReference?: string;
  provider?: string;
  providerHotelCode?: string;
  rateOptionId?: string;
  roomId?: string | number;
  rateId?: string | number;
  roomTypeId?: number;
  roomSelections?: Array<{
    roomIndex: number;
    roomId?: string | number;
    rateId?: string | number;
    roomType?: string;
    mealPlan?: string;
    pricePerNight?: number;
    totalStayPrice?: number;
    numberOfNights?: number;
  }>;
  numberOfNights?: number;
  mealPlan?: string;
  requiresHotelApproval?: boolean;
  priceSource?: string;
  roomTypes?: Array<{ roomCode?: string | number; roomName?: string }>;
  netAmount?: number;
  totalCost?: number;
  totalRoomCost?: number;
  price?: number;
  hotelName?: string;
}

interface SelectedHotelBooking {
  [key: string]: unknown;
}

interface HotelSearchSelectionOptions {
  readOnly: boolean;
  quoteId: string | null;
  shouldShowHotels: boolean;
  selectedMealPlan?: unknown;
  hotelSelectionModal: HotelSelectionModalState;
  prebookDataRef: MutableRefObject<unknown | null>;
  parseStaahSearchReference: (reference: unknown) => { roomId?: string; rateId?: string };
  isSupplierBookableHotel: (hotel: unknown) => boolean;
  getSafeErrorMessage: (error: unknown, fallback: string) => string;
  setIsSelectingHotel: Dispatch<SetStateAction<boolean>>;
  setSelectedHotelBookings: Dispatch<SetStateAction<Record<number, SelectedHotelBooking>>>;
  setPrebookData: Dispatch<SetStateAction<unknown>>;
  setHasAcceptedUpdatedPrice: Dispatch<SetStateAction<boolean>>;
  setHotelSelectionModal: Dispatch<SetStateAction<HotelSelectionModalState>>;
  setHotelSearchQuery: Dispatch<SetStateAction<string>>;
  setSelectedMealPlan: Dispatch<SetStateAction<MealPlanSelection>>;
  setItinerary: Dispatch<SetStateAction<ItineraryDetailsResponse | null>>;
  setHotelDetails: Dispatch<SetStateAction<ItineraryHotelDetailsResponse | null>>;
}

/** Owns live supplier-search hotel selection and its booking payload normalization. */
export const useHotelSearchSelectionMutation = ({
  readOnly,
  quoteId,
  shouldShowHotels,
  hotelSelectionModal,
  prebookDataRef,
  parseStaahSearchReference,
  isSupplierBookableHotel,
  getSafeErrorMessage,
  setIsSelectingHotel,
  setSelectedHotelBookings,
  setPrebookData,
  setHasAcceptedUpdatedPrice,
  setHotelSelectionModal,
  setHotelSearchQuery,
  setSelectedMealPlan,
  setItinerary,
  setHotelDetails,
}: HotelSearchSelectionOptions) => {
  return useCallback(async (hotel: HotelSearchResultLike, mealPlan?: unknown) => {
    if (readOnly) {
      console.log("Cannot select hotel in read-only mode");
      return;
    }
    if (!hotelSelectionModal.planId || !hotelSelectionModal.routeId) return;

    setIsSelectingHotel(true);
    try {
      const hotelId =
        Number(hotel.canonicalHotelId ?? hotel.hotelId ?? Number.parseInt(String(hotel.hotelCode || ""), 10)) || 0;
      const isOffline = String(hotel.provider || '').trim().toLowerCase() === 'offline' || hotel.requiresHotelApproval === true;
      const stayDates = normalizeHotelStayDates({
        checkInDate: hotelSelectionModal.checkInDate,
        checkOutDate: hotelSelectionModal.checkOutDate,
        fallbackDate: hotelSelectionModal.routeDate,
      });
      const searchReference = hotel.searchReference || hotel.bookingCode;
      const roomSelections = hotel.roomSelections || [];
      const firstRoomSelection = roomSelections[0] || null;
      const selectedHotelPayload = {
        provider: String(hotel.provider || "tbo").trim().toLowerCase(),
        hotelCode: String(hotel.hotelCode || ""),
        bookingCode: String(hotel.bookingCode || hotel.searchReference || ""),
        searchReference: String(hotel.searchReference || hotel.bookingCode || "").trim() || undefined,
        roomId: String(firstRoomSelection?.roomId || parseStaahSearchReference(searchReference)?.roomId || String(hotel.roomTypes?.[0]?.roomCode || "").trim() || "").trim() || undefined,
        rateId: String(firstRoomSelection?.rateId || parseStaahSearchReference(searchReference)?.rateId || "").trim() || undefined,
        roomType: String(firstRoomSelection?.roomType || hotel.roomTypes?.[0]?.roomName || "Standard"),
        mealPlan: String(firstRoomSelection?.mealPlan || hotel.mealPlan || '').trim() || undefined,
        roomSelections,
        // The API resolves the authoritative rate and complete payable total.
        // Do not calculate a booking amount from supplier search fields here.
        netAmount: undefined,
        hotelName: hotel.hotelName,
        checkInDate: stayDates.checkInDate,
        checkOutDate: stayDates.checkOutDate,
        searchInitiatedAt: new Date().toISOString(),
      };

      if (!isOffline && !isSupplierBookableHotel(selectedHotelPayload)) {
        toast.error("This hotel does not have a valid live supplier booking code. Please search again and select an available room.");
        return;
      }

      const provider = String(hotel.provider || "tbo").trim().toLowerCase();
      const rateIdentity = String(hotel.rateOptionId || hotel.searchReference || hotel.bookingCode || "").trim();
      const intent = rateIdentity ? "RATE_OPTION" : "HOTEL";
      const intentResult: any = await ItineraryService.selectHotelIntent({
        planId: hotelSelectionModal.planId,
        routeId: hotelSelectionModal.routeId,
        groupType: Number(hotelSelectionModal.groupType || 1),
        selectionIntent: intent,
        provider,
        hotelCode: String(hotel.providerHotelCode || hotel.hotelCode || hotel.hotelId || "").trim(),
        providerHotelCode: String(hotel.providerHotelCode || hotel.hotelCode || "").trim() || undefined,
        canonicalHotelId: hotel.canonicalHotelId ?? hotel.hotelId,
        hotelId,
        hotelName: hotel.hotelName,
        roomType: String(firstRoomSelection?.roomType || hotel.roomTypes?.[0]?.roomName || "Standard"),
        mealPlanCode: String(firstRoomSelection?.mealPlan || hotel.mealPlan || "").trim() || undefined,
        rateOptionId: intent === "RATE_OPTION" ? rateIdentity : undefined,
        optionKey: intent === "RATE_OPTION" ? rateIdentity : undefined,
        routeDate: stayDates.checkInDate,
      });
      const serverSelections = Array.isArray(intentResult?.selections) ? intentResult.selections : [];
      const serverSelection = serverSelections.find((selection: any) =>
        Number(selection?.routeId || selection?.itineraryRouteId) === Number(hotelSelectionModal.routeId),
      ) || serverSelections[0];
      if (intentResult?.status !== "AVAILABLE" || !serverSelection) {
        throw new Error("The API did not return an authoritative hotel price and selection");
      }
      const serverTotal = Number(serverSelection.totalPrice ?? serverSelection.totalAmount ?? 0);
      const serverNightly = Number(serverSelection.pricePerNight ?? serverTotal ?? 0);
      setSelectedHotelBookings((previous) => ({
        ...previous,
        [hotelSelectionModal.routeId as number]: {
          ...selectedHotelPayload,
          ...serverSelection,
          netAmount: serverTotal,
          totalPrice: serverTotal,
          totalAmount: serverTotal,
          pricePerNight: serverNightly,
          isBookable: true,
          externalStay: false,
          availabilityStatus: isOffline ? "OFFLINE_APPROVAL_REQUIRED" : "AVAILABLE",
          availabilityMessage: isOffline ? "Price subject to hotel approval" : null,
          requiresHotelApproval: isOffline,
          approvalStatus: isOffline ? "PENDING_APPROVAL" : "NOT_REQUIRED",
          manualConfirmationStatus: isOffline ? "NOT_STARTED" : undefined,
        },
      }));
      setPrebookData(null);
      prebookDataRef.current = null;
      setHasAcceptedUpdatedPrice(false);

      toast.success("Hotel selected successfully");
      setHotelSelectionModal({ open: false, planId: null, routeId: null, routeDate: "" });
      setHotelSearchQuery("");
      setSelectedMealPlan({ all: false, breakfast: false, lunch: false, dinner: false });

      if (quoteId) {
        const [detailsRes, hotelRes] = await Promise.all([
          ItineraryService.getDetails(quoteId),
          shouldShowHotels ? ItineraryService.getHotelDetails(quoteId) : Promise.resolve(null),
        ]);
        setItinerary(detailsRes as ItineraryDetailsResponse);
        setHotelDetails(hotelRes as ItineraryHotelDetailsResponse);
      }
    } catch (error) {
      console.error("Failed to select hotel", error);
      toast.error(getSafeErrorMessage(error, "Failed to select hotel"));
      throw error;
    } finally {
      setIsSelectingHotel(false);
    }
  }, [getSafeErrorMessage, hotelSelectionModal, isSupplierBookableHotel, parseStaahSearchReference, prebookDataRef, quoteId, readOnly, setHasAcceptedUpdatedPrice, setHotelDetails, setHotelSearchQuery, setHotelSelectionModal, setIsSelectingHotel, setItinerary, setPrebookData, setSelectedHotelBookings, setSelectedMealPlan, shouldShowHotels]);
};
