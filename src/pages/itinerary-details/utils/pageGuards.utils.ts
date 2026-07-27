import type { ItineraryDetailsResponse, ItineraryHotelDetailsResponse } from "../itinerary-details.types";

export function isItineraryHotelTimelineLoading({
  shouldShowHotels,
  hotelDetails,
  itinerary,
  error,
  isSwitchingRouteOption,
}: {
  shouldShowHotels: boolean;
  hotelDetails: ItineraryHotelDetailsResponse | null;
  itinerary: ItineraryDetailsResponse | null;
  error: string | null;
  isSwitchingRouteOption: boolean;
}) {
  return Boolean(shouldShowHotels && !hotelDetails && itinerary && !error && !isSwitchingRouteOption);
}

export function isItineraryVehicleBuildInProgress({
  shouldShowVehicles,
  vehicleBuildStatus,
}: {
  shouldShowVehicles: boolean;
  vehicleBuildStatus: string;
}) {
  return shouldShowVehicles && (vehicleBuildStatus === "PENDING" || vehicleBuildStatus === "PROCESSING");
}

export function buildItineraryModifyHref(planId?: number) {
  return planId ? `/create-itinerary?id=${planId}` : "#";
}
