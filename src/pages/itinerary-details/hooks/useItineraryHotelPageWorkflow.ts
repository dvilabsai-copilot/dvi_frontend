import type { useItineraryRouteState } from "./useItineraryRouteState";
import type { useHotelSelectionState } from "./useHotelSelectionState";
import { useVehicleTotalsSync } from "./useVehicleTotalsSync";
import { useItineraryScrollController } from "./useItineraryScrollController";
import { useVehicleRateSelectionGuard } from "./useVehicleRateSelectionGuard";
import { useHotelPaginationController } from "./useHotelPaginationController";
import type { ItineraryDetailsResponse } from "../itinerary-details.types";

type RouteState = ReturnType<typeof useItineraryRouteState>;
type HotelSelectionState = ReturnType<typeof useHotelSelectionState>;

/** Coordinates hotel/vehicle page totals, scrolling, selection guards, and pagination. */
export function useItineraryHotelPageWorkflow({
  itinerary,
  quoteId,
  shouldShowVehicles,
  routeState,
  hotelSelectionState,
  isLoadingMoreHotels,
  setIsLoadingMoreHotels,
  setHotelPageByGroupRoute,
}: {
  itinerary: ItineraryDetailsResponse | null;
  quoteId?: string;
  shouldShowVehicles: boolean;
  routeState: RouteState;
  hotelSelectionState: HotelSelectionState;
  isLoadingMoreHotels: boolean;
  setIsLoadingMoreHotels: (value: boolean) => void;
  setHotelPageByGroupRoute: (value: Record<string, number>) => void;
}) {
  const {
    selectedVehicleTotalsByType,
    setSelectedVehicleTotalsByType,
    summaryStickyRef,
    hotelListRef,
    vehicleListRef,
    summaryStickyHeight,
    setSummaryStickyHeight,
    isLoadingMoreHotels: _isLoadingMoreHotels,
    setIsLoadingMoreHotels: _setIsLoadingMoreHotels,
    hotelPageByGroupRoute: _hotelPageByGroupRoute,
    setHotelPageByGroupRoute: _setHotelPageByGroupRoute,
  } = hotelSelectionState;
  useVehicleTotalsSync({
    quoteId: itinerary?.quoteId,
    vehicles: itinerary?.vehicles,
    shouldShowVehicles,
    setSelectedVehicleTotalsByType,
  });
  const { scrollToHotelList, scrollToVehicleList } = useItineraryScrollController({
    quoteId: itinerary?.quoteId,
    days: itinerary?.days,
    summaryStickyRef,
    hotelListRef,
    vehicleListRef,
    summaryStickyHeight,
    setSummaryStickyHeight,
    itineraryDaysCountRef: routeState.itineraryDaysCountRef,
  });
  const itineraryPreference = Number(itinerary?.itineraryPreference ?? 0);
  const guard = useVehicleRateSelectionGuard({
    shouldShowVehicles,
    vehicles: itinerary?.vehicles,
    vehicleRateAvailability: itinerary?.vehicleRateAvailability,
    selectedVehicleTotalsByType,
  });
  const { handleHotelLoadMore } = useHotelPaginationController({
    quoteId: quoteId || null,
    isLoadingMoreHotels,
    setIsLoadingMoreHotels,
    setHotelDetails: routeState.setHotelDetails,
    setHotelPageByGroupRoute,
  });
  return { ...guard, itineraryPreference, scrollToHotelList, scrollToVehicleList, handleHotelLoadMore };
}
