import { useCallback, type Dispatch, type SetStateAction } from "react";
import { ItineraryService } from "@/services/itinerary";
import { toast } from "sonner";
import type { ItineraryDetailsResponse, ItineraryHotelDetailsResponse } from "../itinerary-details.types";

interface HotelSelectionModalState {
  open?: boolean;
  planId: number | null;
  routeId: number | null;
  routeDate?: string;
}

interface MealPlanSelection {
  all: boolean;
  breakfast: boolean;
  lunch: boolean;
  dinner: boolean;
}

interface HotelSelectionMutationOptions {
  readOnly: boolean;
  quoteId: string | null;
  shouldShowHotels: boolean;
  selectedMealPlan: unknown;
  hotelSelectionModal: HotelSelectionModalState;
  setIsSelectingHotel: Dispatch<SetStateAction<boolean>>;
  setHotelSelectionModal: Dispatch<SetStateAction<HotelSelectionModalState>>;
  setHotelSearchQuery: Dispatch<SetStateAction<string>>;
  setSelectedMealPlan: Dispatch<SetStateAction<MealPlanSelection>>;
  setItinerary: Dispatch<SetStateAction<ItineraryDetailsResponse | null>>;
  setHotelDetails: Dispatch<SetStateAction<ItineraryHotelDetailsResponse | null>>;
  getSafeErrorMessage: (error: unknown, fallback: string) => string;
}

/** Owns the persisted hotel-selection mutation and post-selection itinerary refresh. */
export const useHotelSelectionMutation = ({
  readOnly,
  quoteId,
  shouldShowHotels,
  selectedMealPlan,
  hotelSelectionModal,
  setIsSelectingHotel,
  setHotelSelectionModal,
  setHotelSearchQuery,
  setSelectedMealPlan,
  setItinerary,
  setHotelDetails,
  getSafeErrorMessage,
}: HotelSelectionMutationOptions) => {
  return useCallback(async (hotelId: number, roomTypeId: number = 1) => {
    if (readOnly) {
      console.log("Cannot select hotel in read-only mode");
      return;
    }
    if (!hotelSelectionModal.planId || !hotelSelectionModal.routeId) return;

    setIsSelectingHotel(true);
    try {
      await ItineraryService.selectHotel(
        hotelSelectionModal.planId,
        hotelSelectionModal.routeId,
        hotelId,
        roomTypeId,
        selectedMealPlan,
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
    } finally {
      setIsSelectingHotel(false);
    }
  }, [getSafeErrorMessage, hotelSelectionModal.planId, hotelSelectionModal.routeId, quoteId, readOnly, selectedMealPlan, setHotelDetails, setHotelSearchQuery, setHotelSelectionModal, setIsSelectingHotel, setItinerary, setSelectedMealPlan, shouldShowHotels]);
};
