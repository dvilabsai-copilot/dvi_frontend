import { useCallback, type Dispatch, type MutableRefObject, type SetStateAction } from "react";
import { ItineraryService } from "@/services/itinerary";
import { toast } from "sonner";
import type { ItineraryDetailsResponse, ItineraryHotelDetailsResponse } from "../itinerary-details.types";

interface HotelSearchSelectionOptions {
  readOnly: boolean;
  quoteId: string | null;
  shouldShowHotels: boolean;
  selectedMealPlan: unknown;
  hotelSelectionModal: any;
  prebookDataRef: MutableRefObject<any | null>;
  parseStaahSearchReference: (reference: unknown) => { roomId?: string; rateId?: string };
  isSupplierBookableHotel: (hotel: any) => boolean;
  getSafeErrorMessage: (error: unknown, fallback: string) => string;
  setIsSelectingHotel: Dispatch<SetStateAction<boolean>>;
  setSelectedHotelBookings: Dispatch<SetStateAction<Record<number, any>>>;
  setPrebookData: Dispatch<SetStateAction<any>>;
  setHasAcceptedUpdatedPrice: Dispatch<SetStateAction<boolean>>;
  setHotelSelectionModal: Dispatch<SetStateAction<any>>;
  setHotelSearchQuery: Dispatch<SetStateAction<string>>;
  setSelectedMealPlan: Dispatch<SetStateAction<any>>;
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
  return useCallback(async (hotel: any, mealPlan?: any) => {
    if (readOnly) {
      console.log("Cannot select hotel in read-only mode");
      return;
    }
    if (!hotelSelectionModal.planId || !hotelSelectionModal.routeId) return;

    setIsSelectingHotel(true);
    try {
      const hotelId = parseInt(hotel.hotelCode) || 0;
      const roomTypeId = hotel.roomTypes?.[0]?.roomCode ? parseInt(hotel.roomTypes[0].roomCode) : 1;
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

      if (!isSupplierBookableHotel(selectedHotelPayload)) {
        toast.error("This hotel does not have a valid live supplier booking code. Please search again and select an available room.");
        return;
      }

      setSelectedHotelBookings((previous) => ({
        ...previous,
        [hotelSelectionModal.routeId]: {
          ...selectedHotelPayload,
          isBookable: true,
          externalStay: false,
          availabilityStatus: "AVAILABLE",
          availabilityMessage: null,
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
