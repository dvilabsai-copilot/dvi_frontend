import { useSelectedHotelSummary } from "./useSelectedHotelSummary";
import { useRoomBreakdownNights } from "./useRoomBreakdownNights";
import { useComputedVehicleTotals } from "./useComputedVehicleTotals";
import { useHotelsForDisplay } from "./useHotelsForDisplay";
import { useFinancialTotals } from "./useFinancialTotals";
import { useHotelHydratedDays } from "./useHotelHydratedDays";
import { useDisplayItineraryDays } from "./useDisplayItineraryDays";
import type { RouteStateSnapshot, HotelSelectionStateSnapshot } from "./useItineraryCostViewModel.types";

type ItineraryCostViewModelArgs = {
  itinerary: RouteStateSnapshot["itinerary"];
  hotelDetails: RouteStateSnapshot["hotelDetails"];
  hotelReadOnly: boolean;
  selectedHotelBookings: HotelSelectionStateSnapshot["selectedHotelBookings"];
  activeHotelGroupType: HotelSelectionStateSnapshot["activeHotelGroupType"];
  shouldShowHotels: boolean;
  shouldShowVehicles: boolean;
  selectedVehicleTotalsByType: HotelSelectionStateSnapshot["selectedVehicleTotalsByType"];
  hasRequiredVehicleSelection: boolean;
};

export function useItineraryCostViewModel({
  itinerary,
  hotelDetails,
  hotelReadOnly,
  selectedHotelBookings,
  activeHotelGroupType,
  shouldShowHotels,
  shouldShowVehicles,
  selectedVehicleTotalsByType,
  hasRequiredVehicleSelection,
}: ItineraryCostViewModelArgs) {
  const { selectedHotelTotal, selectedHotelMetaByRoute } = useSelectedHotelSummary({
    selectedHotelBookings,
    hotelDetails,
    activeHotelGroupType,
    roomCount: itinerary?.roomCount,
  });
  const roomBreakdownRoomNights = useRoomBreakdownNights({
    hotelDetails,
    activeHotelGroupType,
    dayCount: itinerary?.dayCount,
    daysLength: itinerary?.days?.length,
    roomCount: itinerary?.roomCount,
    selectedHotelBookings,
  });
  const { computedVehicleAmount, computedVehicleQty } = useComputedVehicleTotals({
    shouldShowVehicles,
    selectedVehicleTotalsByType,
    costBreakdown: itinerary?.costBreakdown,
  });
  const entryTicketBreakdownByLocation = itinerary?.costBreakdown?.entryTicketBreakdown || [];
  const hotelsForDisplay = useHotelsForDisplay({
    hotelDetails,
    itineraryDays: itinerary?.days,
    itineraryDayCount: itinerary?.dayCount,
    shouldShowHotels,
    activeHotelGroupType,
    hotelReadOnly,
  });
  const financialTotals = useFinancialTotals({
    costBreakdown: itinerary?.costBreakdown,
    overallCost: itinerary?.overallCost,
  });
  const effectiveEntryTicketAmount = itinerary?.costBreakdown?.totalHotspotCost || 0;
  const hotelHydratedDays = useHotelHydratedDays({ itineraryDays: itinerary?.days, selectedHotelMetaByRoute });
  const displayDays = useDisplayItineraryDays({ hotelHydratedDays, itineraryDays: itinerary?.days });

  return {
    selectedHotelTotal,
    selectedHotelMetaByRoute,
    roomBreakdownRoomNights,
    computedVehicleAmount,
    computedVehicleQty,
    entryTicketBreakdownByLocation,
    hotelsForDisplay,
    financialTotals,
    effectiveEntryTicketAmount,
    hotelHydratedDays,
    displayDays,
  };
}
