import { useSelectedHotelSummary } from "./useSelectedHotelSummary";
import { useRoomBreakdownNights } from "./useRoomBreakdownNights";
import { useComputedVehicleTotals } from "./useComputedVehicleTotals";
import { useHotelsForDisplay } from "./useHotelsForDisplay";
import { useFinancialTotals } from "./useFinancialTotals";
import { useHotelHydratedDays } from "./useHotelHydratedDays";
import { useDisplayItineraryDays } from "./useDisplayItineraryDays";
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

const calculatedFinancialTotals = useFinancialTotals({
  costBreakdown: itinerary?.costBreakdown,
  overallCost: itinerary?.overallCost,
  activeHotelAmount: shouldShowHotels ? activeHotelListTotal : 0,
});

const backendTotalAmountRaw =
  itinerary?.costBreakdown?.totalAmount;

const backendNetPayableRaw =
  itinerary?.costBreakdown?.netPayable ??
  itinerary?.overallCost;

const backendRoundOffRaw =
  itinerary?.costBreakdown?.totalRoundOff;

const backendTotalAmount =
  Number(backendTotalAmountRaw);

const backendNetPayable =
  Number(backendNetPayableRaw);

const backendRoundOff =
  Number(backendRoundOffRaw);

const hasBackendTotalAmount =
  backendTotalAmountRaw !== undefined &&
  backendTotalAmountRaw !== null &&
  Number.isFinite(backendTotalAmount);

const hasBackendNetPayable =
  backendNetPayableRaw !== undefined &&
  backendNetPayableRaw !== null &&
  Number.isFinite(backendNetPayable);

const hasBackendRoundOff =
  backendRoundOffRaw !== undefined &&
  backendRoundOffRaw !== null &&
  Number.isFinite(backendRoundOff);

const financialTotals = {
  ...calculatedFinancialTotals,

  // Keep the selected hotel amount for display,
  // but use backend totals because backend already includes hotel cost.
  totalAmount: hasBackendTotalAmount
    ? backendTotalAmount
    : calculatedFinancialTotals.totalAmount,

  netPayable: hasBackendNetPayable
    ? backendNetPayable
    : calculatedFinancialTotals.netPayable,

  totalRoundOff: hasBackendRoundOff
    ? backendRoundOff
    : calculatedFinancialTotals.totalRoundOff,
};

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
    effectiveEntryTicketAmount,
    hotelHydratedDays,
    displayDays,
  };
}
