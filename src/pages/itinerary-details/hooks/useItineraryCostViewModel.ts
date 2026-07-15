import { useMemo } from "react";
import { useSelectedHotelSummary } from "./useSelectedHotelSummary";
import { useComputedHotelCost } from "./useComputedHotelCost";
import { useRoomBreakdownNights } from "./useRoomBreakdownNights";
import { useComputedVehicleTotals } from "./useComputedVehicleTotals";
import { useEntryTicketSummary } from "./useEntryTicketSummary";
import { useHotelsForDisplay } from "./useHotelsForDisplay";
import { useFinancialTotals } from "./useFinancialTotals";
import { useHotelHydratedDays } from "./useHotelHydratedDays";
import { useDisplayItineraryDays } from "./useDisplayItineraryDays";
import type { RouteStateSnapshot, HotelSelectionStateSnapshot } from "./useItineraryCostViewModel.types";

type ItineraryCostViewModelArgs = {
  itinerary: RouteStateSnapshot["itinerary"];
  hotelDetails: RouteStateSnapshot["hotelDetails"];
  hotelReadOnly: boolean;
  activeHotelListTotal: HotelSelectionStateSnapshot["activeHotelListTotal"];
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
  activeHotelListTotal,
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
  const computedHotelCost = useComputedHotelCost({
    hotelReadOnly,
    activeHotelListTotal,
    selectedHotelTotal,
    hotelDetails,
    activeHotelGroupType,
    roomCount: itinerary?.roomCount,
    costBreakdown: itinerary?.costBreakdown,
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
  const { entryTicketBreakdownByLocation, entryTicketLocationWiseTotal } = useEntryTicketSummary(itinerary?.days);
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
    computedHotelCost,
    computedVehicleAmount,
    shouldShowHotels,
    shouldShowVehicles,
    hasRequiredVehicleSelection,
    selectedVehicleTotalsByType,
    activeHotelListTotal,
    selectedHotelTotal,
    entryTicketBreakdownCount: entryTicketBreakdownByLocation.length,
    entryTicketLocationWiseTotal,
  });
  const effectiveEntryTicketAmount = useMemo(() => {
    const fallback = Number(itinerary?.costBreakdown?.totalHotspotCost || 0);
    if (entryTicketBreakdownByLocation.length > 0) return Number(entryTicketLocationWiseTotal || 0);
    return Number.isFinite(fallback) ? fallback : 0;
  }, [entryTicketBreakdownByLocation.length, entryTicketLocationWiseTotal, itinerary?.costBreakdown?.totalHotspotCost]);
  const hotelHydratedDays = useHotelHydratedDays({ itineraryDays: itinerary?.days, selectedHotelMetaByRoute });
  const displayDays = useDisplayItineraryDays({ hotelHydratedDays, itineraryDays: itinerary?.days });

  return {
    selectedHotelTotal,
    selectedHotelMetaByRoute,
    computedHotelCost,
    roomBreakdownRoomNights,
    computedVehicleAmount,
    computedVehicleQty,
    entryTicketBreakdownByLocation,
    entryTicketLocationWiseTotal,
    hotelsForDisplay,
    financialTotals,
    effectiveEntryTicketAmount,
    hotelHydratedDays,
    displayDays,
  };
}
