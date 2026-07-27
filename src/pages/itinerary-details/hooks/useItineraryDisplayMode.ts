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
  const isVehicleOnlyItinerary = shouldShowVehicles && !shouldShowHotels;

  return {
    isConfirmedItinerary,
    canViewCostBreakdown: canViewItineraryCostBreakdown(),
    isAgentLogin: getAuthenticatedRole() === 4,
    // Vehicle-only plans retain the check-in label for itinerary context, but
    // never expose hotel editing or room-category controls to any role.
    hotelReadOnly: Boolean(readOnly || isConfirmedItinerary || isVehicleOnlyItinerary),
    isConfirmedPresentation: presentationMode === "confirmed" || Boolean(readOnly || isConfirmedItinerary),
    shouldShowHotels,
    shouldShowVehicles,
    isVehicleOnlyItinerary,
    requiresHotelBookingFlow: shouldShowHotels,
  };
}
