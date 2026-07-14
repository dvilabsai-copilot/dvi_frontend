import { useCallback, type Dispatch, type SetStateAction } from "react";
import { ItineraryService } from "@/services/itinerary";
import type { ItineraryDetailsResponse, ItineraryHotelDetailsResponse, ItinerarySegment } from "../itinerary-details.types";

interface FitHereConfirmationRefreshOptions {
  quoteId: string | null;
  shouldShowHotels: boolean;
  setItinerary: Dispatch<SetStateAction<ItineraryDetailsResponse | null>>;
  setHotelDetails: Dispatch<SetStateAction<ItineraryHotelDetailsResponse | null>>;
}

/** Owns details/hotel hydration after a successful Fit Here confirmation. */
export const useFitHereConfirmationRefresh = ({
  quoteId,
  shouldShowHotels,
  setItinerary,
  setHotelDetails,
}: FitHereConfirmationRefreshOptions) => useCallback(async (confirmedRouteId: number, confirmedSegments: ItinerarySegment[]) => {
  if (!quoteId) return;
  const [detailsRes, hotelRes] = await Promise.all([
    ItineraryService.getDetails(quoteId),
    shouldShowHotels ? ItineraryService.getHotelDetails(quoteId) : Promise.resolve(null),
  ]);
  const refreshedDetails = detailsRes as ItineraryDetailsResponse;
  const mergedDetails: ItineraryDetailsResponse = {
    ...refreshedDetails,
    days: (refreshedDetails.days || []).map((day) => Number(day.id) !== Number(confirmedRouteId)
      ? day
      : { ...day, segments: confirmedSegments.length > 0 ? confirmedSegments : day.segments }),
  };
  setItinerary(mergedDetails);
  setHotelDetails(hotelRes as ItineraryHotelDetailsResponse);
}, [quoteId, setHotelDetails, setItinerary, shouldShowHotels]);
