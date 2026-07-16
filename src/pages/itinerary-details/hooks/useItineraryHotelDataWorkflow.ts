import { useCallback, useState } from "react";
import { useHotelDataController } from "./useHotelDataController";
import { useHotelVoucherController, type HotelVoucherItem } from "./useHotelVoucherController";
import { mergeHotelSelections, type HotelSelectionChangeMap } from "./useHotelSelectionsChangeMutation";
import type { useItineraryRouteState } from "./useItineraryRouteState";
import type { useHotelWorkflowState } from "./useHotelWorkflowState";
import type { useHotelSelectionState } from "./useHotelSelectionState";

type RouteState = ReturnType<typeof useItineraryRouteState>;
type HotelWorkflowState = ReturnType<typeof useHotelWorkflowState>;
type HotelSelectionState = ReturnType<typeof useHotelSelectionState>;
type HotelDataArgs = Parameters<typeof useHotelDataController>[0];

export function useItineraryHotelDataWorkflow({
  routeState,
  hotelWorkflowState,
  hotelSelectionState,
  quoteId,
  itineraryPlanId,
  hotelDetails,
  cacheRouteHotelDetails,
  fetchCompleteHotelDetails,
  loadHotelDetailsForItinerary,
  hotelSaveFunctionRef,
}: {
  routeState: RouteState;
  hotelWorkflowState: HotelWorkflowState;
  hotelSelectionState: HotelSelectionState;
  quoteId: string | undefined;
  itineraryPlanId: number;
  hotelDetails: RouteState["hotelDetails"];
  cacheRouteHotelDetails: HotelDataArgs["cacheRouteHotelDetails"];
  fetchCompleteHotelDetails: HotelDataArgs["fetchCompleteHotelDetails"];
  loadHotelDetailsForItinerary: HotelDataArgs["loadHotelDetailsForItinerary"];
  hotelSaveFunctionRef: React.MutableRefObject<(() => Promise<boolean>) | null>;
}) {
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [hotelVoucherModalOpen, setHotelVoucherModalOpen] = useState(false);
  const [selectedHotelForVoucher, setSelectedHotelForVoucher] = useState<HotelVoucherItem | null>(null);
  const { activeHotelGroupType, setActiveHotelGroupType, activeHotelListTotal, setActiveHotelListTotal, setSelectedHotelBookings } = hotelSelectionState;
  const { isRebuildingHotels, setIsRebuildingHotels, setLoadingHotels } = hotelWorkflowState;
  const { setHotelDetails, setItinerary } = routeState;
  const hotelData = useHotelDataController({
    quoteId: quoteId || null,
    activeHotelGroupType,
    isRebuildingHotels,
    setActiveHotelGroupType,
    setActiveHotelListTotal,
    setHotelDetails,
    setIsRebuildingHotels,
    setItinerary,
    setLoadingHotels,
    cacheRouteHotelDetails,
    fetchCompleteHotelDetails,
    loadHotelDetailsForItinerary,
  });
  const hotelVouchers = useHotelVoucherController({
    itineraryPlanId,
    hotelSaveFunctionRef,
    refreshHotelData: hotelData.refreshHotelData,
    setHotelVoucherModalOpen,
    setSelectedHotelForVoucher,
  });
  const handleHotelSelectionsChange = useCallback((selections: HotelSelectionChangeMap) => {
    setSelectedHotelBookings((previous) => mergeHotelSelections(previous, selections));
    console.log("🏨 Hotel selections updated from HotelList:", selections);
  }, [setSelectedHotelBookings]);

  return {
    ...hotelData,
    ...hotelVouchers,
    cancelModalOpen,
    setCancelModalOpen,
    hotelVoucherModalOpen,
    setHotelVoucherModalOpen,
    selectedHotelForVoucher,
    handleHotelSelectionsChange,
  };
}
