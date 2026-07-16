import { useCallback, type Dispatch, type SetStateAction } from "react";
import { toast } from "sonner";
import type { ItineraryDetailsResponse, ItineraryHotelDetailsResponse } from "../itinerary-details.types";

export function useEnsureHotelDetailsLoaded({
  quoteId,
  itinerary,
  hotelDetails,
  setHotelDetails,
  setLoadingHotels,
  loadHotelDetailsForItinerary,
}: {
  quoteId?: string;
  itinerary: ItineraryDetailsResponse | null;
  hotelDetails: ItineraryHotelDetailsResponse | null;
  setHotelDetails: Dispatch<SetStateAction<ItineraryHotelDetailsResponse | null>>;
  setLoadingHotels: Dispatch<SetStateAction<boolean>>;
  loadHotelDetailsForItinerary: (
    currentQuoteId: string,
    details: ItineraryDetailsResponse,
  ) => Promise<ItineraryHotelDetailsResponse | null>;
}) {
  return useCallback(async (): Promise<ItineraryHotelDetailsResponse | null> => {
    if (hotelDetails) return hotelDetails;
    if (!quoteId || !itinerary) return null;

    try {
      setLoadingHotels(true);
      const hotelRes = await loadHotelDetailsForItinerary(quoteId, itinerary);
      setHotelDetails(hotelRes);
      return hotelRes;
    } catch (error) {
      console.error("Failed to load hotel details", error);
      toast.error("Failed to load hotel details");
      return null;
    } finally {
      setLoadingHotels(false);
    }
  }, [hotelDetails, itinerary, loadHotelDetailsForItinerary, quoteId, setHotelDetails, setLoadingHotels]);
}
