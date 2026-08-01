import { useCallback, useRef, useState } from "react";
import { ItineraryService } from "@/services/itinerary";
import { toast } from "sonner";
import { useHotelDataController } from "./useHotelDataController";
import { useHotelVoucherController, type HotelVoucherItem } from "./useHotelVoucherController";
import {
  mergeHotelSelections,
  type HotelSelectionChangeMap,
  type HotelSelectionPreviewCommitResult,
  type HotelSelectionPreviewResult,
} from "./useHotelSelectionsChangeMutation";
import type { useItineraryRouteState } from "./useItineraryRouteState";
import type { useHotelWorkflowState } from "./useHotelWorkflowState";
import type { useHotelSelectionState } from "./useHotelSelectionState";
import type { HotelAvailabilityChangeSummary } from "../itinerary-details.types";

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
  const [hotelAvailabilityChangeSummary, setHotelAvailabilityChangeSummary] = useState<HotelAvailabilityChangeSummary | null>(null);
  const { activeHotelGroupType, setActiveHotelGroupType, activeHotelListTotal, setActiveHotelListTotal, selectedHotelBookings, setSelectedHotelBookings } = hotelSelectionState;
  const selectedHotelBookingsRef = useRef(selectedHotelBookings);
  selectedHotelBookingsRef.current = selectedHotelBookings;
  const previewSequenceRef = useRef(0);
  const previewInFlightRef = useRef(new Map<string, Promise<HotelSelectionPreviewResult>>());
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
  const {
    handleRebuildHotels: rebuildHotels,
    handleResetHotels: resetHotels,
    handleShowOfflineHotels: showOfflineHotels,
  } = hotelData;
  const hotelVouchers = useHotelVoucherController({
    itineraryPlanId,
    hotelSaveFunctionRef,
    refreshHotelData: hotelData.refreshHotelData,
    setHotelVoucherModalOpen,
    setSelectedHotelForVoucher,
  });
  const handleRebuildHotels = useCallback(async () => {
    const summary = await rebuildHotels();
    // A refresh creates a new supplier snapshot. Do not send the previous
    // snapshot's rate references in the next temporary preview; the backend
    // response remains authoritative and the hotel list rehydrates its
    // persisted selections from the refreshed rows.
    setSelectedHotelBookings({});
    setHotelAvailabilityChangeSummary(summary?.hasChanges ? summary : null);
    return summary;
  }, [rebuildHotels, setSelectedHotelBookings]);
  const handleResetHotels = useCallback(async () => {
    const summary = await resetHotels();
    // The reset endpoint creates fresh auto-selections; discard the old
    // client-side selection map so it cannot reappear over the new snapshot.
    setSelectedHotelBookings({});
    // Reset is an intentional clean rebuild, not a refresh reconciliation.
    // Do not show an old-versus-new change dialog for selections that were
    // explicitly cleared by the user.
    setHotelAvailabilityChangeSummary(null);
    return summary;
  }, [resetHotels, setSelectedHotelBookings]);

  const handleShowOfflineHotels = useCallback(async (routeId?: number) => {
    // Offline availability is a separate fetch action. Do not re-open a
    // previously dismissed live-refresh reconciliation dialog when the hotel
    // data is replaced by this response.
    setHotelAvailabilityChangeSummary(null);
    await showOfflineHotels(routeId);
  }, [showOfflineHotels]);
  const handleHotelSelectionsChange = useCallback((selections: HotelSelectionChangeMap) => {
    setSelectedHotelBookings((previous) => mergeHotelSelections(previous, selections));
    console.log("🏨 Hotel selections updated from HotelList:", selections);
  }, [setSelectedHotelBookings]);

  const previewTemporarySelectionCost = useCallback((selections: HotelSelectionChangeMap): Promise<HotelSelectionPreviewResult> => {
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

    // A successful preview is not reusable across a later supplier snapshot.
    // The same rate reference can remain stable while its price changes, so
    // skipping this call can send an old amount to /hotels/select and trigger
    // the backend's price-change guard. Keep in-flight de-duplication below,
    // but always obtain a fresh authoritative price before persistence.
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
        const refreshedSelections: HotelSelectionChangeMap = {};
        const breakdown = Array.isArray(response.selectedHotelBreakdown)
          ? response.selectedHotelBreakdown
          : [];
        Object.entries(mergedSelections).forEach(([routeIdText, selection]) => {
          if (!selection) return;
          const routeId = Number(routeIdText);
          const fresh = breakdown.find((row) => Number(row?.routeId || 0) === routeId);
          if (!fresh) return;

          refreshedSelections[routeId] = {
            ...selection,
            provider: String(fresh.provider || selection.provider || '').trim().toLowerCase(),
            hotelCode: String(fresh.hotelCode || selection.hotelCode || '').trim(),
            bookingCode: String(fresh.bookingCode || selection.bookingCode || '').trim(),
            searchReference: String(fresh.searchReference || selection.searchReference || '').trim() || undefined,
            roomType: String(fresh.roomType || selection.roomType || '').trim(),
            mealPlan: String(fresh.mealPlan || selection.mealPlan || '').trim() || undefined,
            hotelName: String(fresh.hotelName || selection.hotelName || '').trim(),
            netAmount: Number(fresh.totalAmount ?? selection.netAmount ?? 0),
            totalAmountAfterTax: Number(fresh.totalAmount ?? selection.totalAmountAfterTax ?? 0),
            totalPrice: Number(fresh.totalAmount ?? selection.totalPrice ?? 0),
            pricePerNight: Number(fresh.totalAmount ?? selection.pricePerNight ?? 0),
            currency: String(fresh.currency || selection.currency || 'INR').trim() || 'INR',
            checkInDate: String(fresh.checkInDate || fresh.date || selection.checkInDate || '').trim(),
            checkOutDate: String(fresh.checkOutDate || selection.checkOutDate || '').trim(),
            groupType: Number(fresh.groupType || selection.groupType || groupType || 1),
          };
        });

        // A successful preview without a breakdown is not safe to persist.
        // Returning true here allowed the original card amount to reach
        // /hotels/select even though the server had no authoritative price
        // for that route.
        if (Object.keys(refreshedSelections).length === 0) {
          toast.error('The current hotel rate could not be confirmed. Refresh availability and select again.');
          return false;
        }
        const result: HotelSelectionPreviewCommitResult = {
          selections: refreshedSelections,
          // Keep the cost-preview response staged until the corresponding
          // hotel selection persistence request has succeeded.
          commit: () => setItinerary(response.itinerary),
        };
        return result;
      })
      .catch((error) => {
        console.error("Failed to preview temporary hotel selection cost", error);
        if (requestId === previewSequenceRef.current) {
          const typedError = error as {
            response?: { data?: { message?: unknown } };
            message?: unknown;
          };
          const backendMessage = typedError?.response?.data?.message || typedError?.message || "Unable to calculate the hotel price";
          const message = Array.isArray(backendMessage) ? backendMessage.join("; ") : String(backendMessage);
          toast.error(/stale|does not belong to this itinerary route/i.test(message)
            ? "No current hotel availability for this stay"
            : message);
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
    handleRebuildHotels,
    handleResetHotels,
    handleShowOfflineHotels,
    hotelAvailabilityChangeSummary,
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
