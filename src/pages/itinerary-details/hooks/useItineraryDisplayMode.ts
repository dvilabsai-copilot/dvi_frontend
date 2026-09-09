import { canViewItineraryCostBreakdown, getAuthenticatedRole } from "@/lib/itinerary-cost-visibility";
import type { ItineraryDetailsResponse, ItineraryDetailsProps } from "../itinerary-details.types";
import { isItineraryDateExpired } from "../utils/itineraryDateStatus.utils";

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
  const isExpiredItinerary = isItineraryDateExpired(itinerary);

  return {
    isConfirmedItinerary,
    canViewCostBreakdown: canViewItineraryCostBreakdown(),
    isAgentLogin: getAuthenticatedRole() === 4,
    // Vehicle-only plans retain the check-in label for itinerary context, but
    // never expose hotel editing or room-category controls to any role.
    hotelReadOnly: Boolean(readOnly || isConfirmedItinerary || isVehicleOnlyItinerary || isExpiredItinerary),
    isConfirmedPresentation: presentationMode === "confirmed" || Boolean(readOnly || isConfirmedItinerary),
    isExpiredItinerary,
    shouldShowHotels,
    shouldShowVehicles,
    isVehicleOnlyItinerary,
    requiresHotelBookingFlow: shouldShowHotels,
  };
}
