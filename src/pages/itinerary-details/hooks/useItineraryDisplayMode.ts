import { canViewItineraryCostBreakdown, getAuthenticatedRole } from "@/lib/itinerary-cost-visibility";
import type { ItineraryDetailsResponse, ItineraryDetailsProps } from "../itinerary-details.types";

export function useItineraryDisplayMode(
  itinerary: ItineraryDetailsResponse | null,
  readOnly: ItineraryDetailsProps["readOnly"],
  presentationMode: ItineraryDetailsProps["presentationMode"],
) {
  const isConfirmedItinerary = Number((itinerary as { confirmed_itinerary_plan_ID?: unknown } | null)?.confirmed_itinerary_plan_ID || 0) > 0 || itinerary?.isConfirmed === true;
  const itineraryPreference = Number(itinerary?.itineraryPreference ?? 0);
  const shouldShowHotels = itineraryPreference === 1 || itineraryPreference === 3;
  const shouldShowVehicles = itineraryPreference === 2 || itineraryPreference === 3;

  return {
    isConfirmedItinerary,
    canViewCostBreakdown: canViewItineraryCostBreakdown(),
    isAgentLogin: getAuthenticatedRole() === 4,
    hotelReadOnly: Boolean(readOnly || isConfirmedItinerary),
    isConfirmedPresentation: presentationMode === "confirmed" || Boolean(readOnly || isConfirmedItinerary),
    shouldShowHotels,
    shouldShowVehicles,
    isVehicleOnlyItinerary: shouldShowVehicles && !shouldShowHotels,
    requiresHotelBookingFlow: shouldShowHotels,
  };
}
