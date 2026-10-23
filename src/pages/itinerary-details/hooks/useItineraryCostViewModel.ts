import { useSelectedHotelSummary } from "./useSelectedHotelSummary";
import { useRoomBreakdownNights } from "./useRoomBreakdownNights";
import { useComputedVehicleTotals } from "./useComputedVehicleTotals";
import { useHotelsForDisplay } from "./useHotelsForDisplay";
import { useFinancialTotals } from "./useFinancialTotals";
import { useComputedHotelCost } from "./useComputedHotelCost";
import { useHotelHydratedDays } from "./useHotelHydratedDays";
import { useDisplayItineraryDays } from "./useDisplayItineraryDays";
import { getTboMapFallbackSummary } from "../utils/tboMapFallbackSummary.utils";
import type {
  RouteStateSnapshot,
  HotelSelectionStateSnapshot,
} from "./useItineraryCostViewModel.types";

type ItineraryCostViewModelArgs = {
  itinerary: RouteStateSnapshot["itinerary"];
  hotelDetails: RouteStateSnapshot["hotelDetails"];
  hotelReadOnly: boolean;
  selectedHotelBookings: HotelSelectionStateSnapshot["selectedHotelBookings"];
  activeHotelGroupType: HotelSelectionStateSnapshot["activeHotelGroupType"];
  activeHotelListTotal: number;
  shouldShowHotels: boolean;
  shouldShowVehicles: boolean;
};

export function useItineraryCostViewModel({
  itinerary,
  hotelDetails,
  hotelReadOnly,
  selectedHotelBookings,
  activeHotelGroupType,
  activeHotelListTotal,
  shouldShowHotels,
  shouldShowVehicles,
}: ItineraryCostViewModelArgs) {
  const {
    selectedHotelTotal,
    selectedHotelMetaByRoute,
  } = useSelectedHotelSummary({
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

const {
  computedVehicleAmount,
  computedVehicleQty,
} = useComputedVehicleTotals({
  shouldShowVehicles,
  costBreakdown: itinerary?.costBreakdown,
  vehicles: itinerary?.vehicles,
});

  const entryTicketBreakdownByLocation =
    itinerary?.costBreakdown?.entryTicketBreakdown || [];

  const hotelsForDisplay = useHotelsForDisplay({
    hotelDetails,
    itineraryDays: itinerary?.days,
    itineraryDayCount: itinerary?.dayCount,
    shouldShowHotels,
    activeHotelGroupType,
    hotelReadOnly,
  });

const computedHotelCost = useComputedHotelCost({
  hotelReadOnly,
  activeHotelListTotal: shouldShowHotels ? activeHotelListTotal : 0,
  selectedHotelTotal,
  hotelDetails,
  activeHotelGroupType,
  roomCount: itinerary?.roomCount,
  costBreakdown: itinerary?.costBreakdown,
});

const baseCostBreakdown =
  itinerary?.costBreakdown ?? null;

const activeTboMapFallback = getTboMapFallbackSummary(
  hotelDetails?.hotelSelectionState,
  activeHotelGroupType,
);

// The persisted itinerary breakdown belongs to the initially loaded package.
// Recommendation tabs are switched locally, so replace only the explanatory
// MAP fields with the active group's API selection-state values.
const activeGroupCostBreakdown =
  baseCostBreakdown && activeTboMapFallback.hasGroup
    ? {
        ...baseCostBreakdown,
        tboMapFallbackTargetMealPlan: activeTboMapFallback.targetMealPlan,
        tboMapFallbackLunchRate: activeTboMapFallback.lunchRate,
        tboMapFallbackLunchCost: activeTboMapFallback.lunchCost,
        tboMapFallbackDinnerRate: activeTboMapFallback.dinnerRate,
        tboMapFallbackDinnerCost: activeTboMapFallback.dinnerCost,
        tboMapFallbackDinnerComponentCost: activeTboMapFallback.dinnerComponentCost,
      }
    : baseCostBreakdown;

const isVehicleOnlyItinerary =
  Number(itinerary?.itineraryPreference || 0) === 2;

/*
 * Vehicle Only:
 *
 * computedVehicleAmount is the current selected
 * vehicle amount and already reflects the selected
 * vehicle quantities.
 *
 * The persisted costBreakdown can contain an older
 * vehicle amount, especially after changing vehicle
 * quantity.
 *
 * Replace only the vehicle amount before calculating
 * the financial totals.
 */
const effectiveCostBreakdown =
  isVehicleOnlyItinerary &&
  activeGroupCostBreakdown &&
  computedVehicleAmount > 0
    ? {
        ...activeGroupCostBreakdown,

        totalVehicleAmount:
          computedVehicleAmount,

        totalVehicleCost:
          computedVehicleAmount,
      }
    : activeGroupCostBreakdown;

const financialTotals = useFinancialTotals({
  costBreakdown: effectiveCostBreakdown,
  overallCost: itinerary?.overallCost,
  activeHotelAmount: shouldShowHotels
    ? computedHotelCost
    : 0,
});

  const effectiveEntryTicketAmount =
    itinerary?.costBreakdown?.totalHotspotCost || 0;

  const hotelHydratedDays = useHotelHydratedDays({
    itineraryDays: itinerary?.days,
    selectedHotelMetaByRoute,
  });

  const displayDays = useDisplayItineraryDays({
    hotelHydratedDays,
    itineraryDays: itinerary?.days,
  });

  return {
    selectedHotelTotal,
    selectedHotelMetaByRoute,
    roomBreakdownRoomNights,
    computedVehicleAmount,
    computedVehicleQty,
    entryTicketBreakdownByLocation,
    hotelsForDisplay,
    financialTotals,
    displayItinerary: itinerary && effectiveCostBreakdown && effectiveCostBreakdown !== itinerary.costBreakdown
      ? { ...itinerary, costBreakdown: effectiveCostBreakdown }
      : itinerary,
    effectiveEntryTicketAmount,
    hotelHydratedDays,
    displayDays,
  };
}
