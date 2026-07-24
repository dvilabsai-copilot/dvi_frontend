import { useCallback, type Dispatch, type MutableRefObject, type SetStateAction } from "react";
import { ItineraryService } from "@/services/itinerary";
import { toast } from "sonner";
import type { ItineraryDetailsResponse, ItineraryHotelDetailsResponse } from "../itinerary-details.types";

interface HotelSelectionModalState {
  open?: boolean;
  planId: number | null;
  routeId: number | null;
  routeDate?: string;
  checkInDate?: string;
  checkOutDate?: string;
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
  roomTypeId?: number;
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
  selectedMealPlan: unknown;
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
  selectedMealPlan,
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
      const roomTypeId = Number(hotel.roomTypeId ?? (hotel.roomTypes?.[0]?.roomCode ? parseInt(String(hotel.roomTypes[0].roomCode), 10) : 1)) || 1;
      const isOffline = String(hotel.provider || '').trim().toLowerCase() === 'offline' || hotel.requiresHotelApproval === true;
      const checkInDate = new Date(hotelSelectionModal.checkInDate || hotelSelectionModal.routeDate);
      const checkOutDate = new Date(hotelSelectionModal.checkOutDate || hotelSelectionModal.routeDate);
      if (!hotelSelectionModal.checkOutDate) checkOutDate.setDate(checkOutDate.getDate() + 1);
      const formatDate = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
      const searchReference = hotel.searchReference || hotel.bookingCode;
      const selectedHotelPayload = {
        provider: String(hotel.provider || "tbo").trim().toLowerCase(),
        hotelCode: String(hotel.hotelCode || ""),
        bookingCode: String(hotel.bookingCode || hotel.searchReference || ""),
        searchReference: String(hotel.searchReference || hotel.bookingCode || "").trim() || undefined,
        roomId: parseStaahSearchReference(searchReference)?.roomId || String(hotel.roomTypes?.[0]?.roomCode || "").trim() || undefined,
        rateId: parseStaahSearchReference(searchReference)?.rateId || undefined,
        roomType: hotel.roomTypes?.[0]?.roomName || "Standard",
        netAmount: hotel.netAmount || hotel.totalCost || hotel.totalRoomCost || hotel.price || 0,
        hotelName: hotel.hotelName,
        checkInDate: formatDate(checkInDate),
        checkOutDate: formatDate(checkOutDate),
        searchInitiatedAt: new Date().toISOString(),
      };

      if (!isOffline && !isSupplierBookableHotel(selectedHotelPayload)) {
        toast.error("This hotel does not have a valid live supplier booking code. Please search again and select an available room.");
        return;
      }

      setSelectedHotelBookings((previous) => ({
        ...previous,
        [hotelSelectionModal.routeId]: {
          ...selectedHotelPayload,
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

      await ItineraryService.selectHotel(
        hotelSelectionModal.planId,
        hotelSelectionModal.routeId,
        hotelId,
        roomTypeId,
        mealPlan || selectedMealPlan,
        undefined,
        {
          canonicalHotelId: hotel.canonicalHotelId ?? hotel.hotelId,
          rateOptionId: hotel.rateOptionId || hotel.searchReference || hotel.bookingCode,
          provider: String(hotel.provider || '').trim().toLowerCase(),
          roomId: hotel.roomId,
          roomCount: hotelSelectionModal.routeId ? undefined : undefined,
        },
      );
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
  }, [getSafeErrorMessage, hotelSelectionModal, isSupplierBookableHotel, parseStaahSearchReference, prebookDataRef, quoteId, readOnly, selectedMealPlan, setHasAcceptedUpdatedPrice, setHotelDetails, setHotelSearchQuery, setHotelSelectionModal, setIsSelectingHotel, setItinerary, setPrebookData, setSelectedHotelBookings, setSelectedMealPlan, shouldShowHotels]);
};
