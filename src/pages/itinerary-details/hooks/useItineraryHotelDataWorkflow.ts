import { useCallback, useRef, useState } from "react";
import { ItineraryService } from "@/services/itinerary";
import { toast } from "sonner";
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
  const { activeHotelGroupType, setActiveHotelGroupType, activeHotelListTotal, setActiveHotelListTotal, selectedHotelBookings, setSelectedHotelBookings } = hotelSelectionState;
  const selectedHotelBookingsRef = useRef(selectedHotelBookings);
  selectedHotelBookingsRef.current = selectedHotelBookings;
  const previewSequenceRef = useRef(0);
  const previewInFlightRef = useRef(new Map<string, Promise<boolean>>());
  const lastSuccessfulPreviewRef = useRef<string | null>(null);
  const { isRebuildingHotels, setIsRebuildingHotels, setLoadingHotels } = hotelWorkflowState;
  const { setHotelDetails, setItinerary } = routeState;
  const hotelData = useHotelDataController({
    quoteId: quoteId || null,
    activeHotelGroupType,
    isRebuildingHotels,
    setActiveHotelGroupType,
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

  const previewTemporarySelectionCost = useCallback((selections: HotelSelectionChangeMap) => {
    if (!itineraryPlanId) return Promise.resolve(false);

    const mergedSelections = mergeHotelSelections(selectedHotelBookingsRef.current, selections);
    const groupType = Number(
      Object.values(mergedSelections).find((selection) => Number(selection?.groupType || 0) > 0)?.groupType || 0,
    ) || undefined;
    const fingerprint = JSON.stringify({
      groupType: groupType || null,
      selections: Object.entries(mergedSelections)
        .sort(([a], [b]) => Number(a) - Number(b))
        .map(([routeId, selection]) => ({
          routeId: Number(routeId),
          provider: selection?.provider || null,
          hotelCode: selection?.hotelCode || null,
          bookingCode: selection?.bookingCode || null,
          searchReference: selection?.searchReference || null,
          roomId: selection?.roomId || null,
          rateId: selection?.rateId || null,
          roomType: selection?.roomType || null,
          mealPlan: selection?.mealPlan || null,
          netAmount: Number(selection?.netAmount || 0),
          totalAmountAfterTax: Number(selection?.totalAmountAfterTax || 0),
          nights: Number(selection?.nights || 0),
          stayKey: selection?.stayKey || null,
          nightlyRates: Array.isArray(selection?.nightlyRates) ? selection.nightlyRates : [],
          routeIds: Array.isArray(selection?.routeIds) ? [...selection.routeIds].sort() : [],
        })),
    });

    if (lastSuccessfulPreviewRef.current === fingerprint) return Promise.resolve(true);
    const existingRequest = previewInFlightRef.current.get(fingerprint);
    if (existingRequest) return existingRequest;

    const requestId = ++previewSequenceRef.current;
    const request = ItineraryService.previewHotelSelectionCost(
      itineraryPlanId,
      mergedSelections as unknown as Record<number, Record<string, unknown> | null>,
      groupType,
    )
      .then((response) => {
        if (requestId !== previewSequenceRef.current) {
          // A newer preview owns the UI; prevent this caller from committing
          // its pending room/rate state after becoming stale.
          return false;
        }
        setItinerary(response.itinerary as any);
        lastSuccessfulPreviewRef.current = fingerprint;
        return true;
      })
      .catch((error) => {
        console.error("Failed to preview temporary hotel selection cost", error);
        if (requestId === previewSequenceRef.current) {
          const typedError = error as any;
          const backendMessage = typedError?.response?.data?.message || typedError?.message || "Unable to calculate the hotel price";
          toast.error(Array.isArray(backendMessage) ? backendMessage.join("; ") : String(backendMessage));
        }
        return false;
      })
      .finally(() => {
        previewInFlightRef.current.delete(fingerprint);
      });

    previewInFlightRef.current.set(fingerprint, request);
    return request;
  }, [itineraryPlanId, setItinerary]);

  return {
    ...hotelData,
    ...hotelVouchers,
    cancelModalOpen,
    setCancelModalOpen,
    hotelVoucherModalOpen,
    setHotelVoucherModalOpen,
    selectedHotelForVoucher,
    handleHotelSelectionsChange,
    previewTemporarySelectionCost,
  };
}
