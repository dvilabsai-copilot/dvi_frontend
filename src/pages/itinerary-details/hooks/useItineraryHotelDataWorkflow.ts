import { useCallback, useEffect, useRef, useState } from "react";
import { ItineraryService } from "@/services/itinerary";
import { toast } from "sonner";
import { useHotelDataController } from "./useHotelDataController";
import { useHotelVoucherController, type HotelVoucherItem } from "./useHotelVoucherController";
import {
  mergeHotelSelections,
  type HotelSelectionChangeMap,
  type HotelSelectionPreviewCommitResult,
  type HotelSelectionPreviewOptions,
  type HotelSelectionPreviewResult,
} from "./useHotelSelectionsChangeMutation";
import type { useItineraryRouteState } from "./useItineraryRouteState";
import type { useHotelWorkflowState } from "./useHotelWorkflowState";
import type { useHotelSelectionState } from "./useHotelSelectionState";
import type { HotelAvailabilityChangeSummary } from "../itinerary-details.types";
import { claimAutomaticHotelValidation, mergeAcknowledgedHotelDetails } from "../utils/automaticHotelValidation";

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
  enableAutomaticValidation = true,
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
  enableAutomaticValidation?: boolean;
}) {
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [hotelVoucherModalOpen, setHotelVoucherModalOpen] = useState(false);
  const [selectedHotelForVoucher, setSelectedHotelForVoucher] = useState<HotelVoucherItem | null>(null);
  const [hotelAvailabilityChangeSummary, setHotelAvailabilityChangeSummary] = useState<HotelAvailabilityChangeSummary | null>(null);
  const {
    activeHotelGroupType,
    setActiveHotelGroupType,
    selectedHotelBookings,
    setSelectedHotelBookings,
    selectedHotelBookingsByGroup,
    setSelectedHotelBookingsByGroup,
  } = hotelSelectionState;
  const selectedHotelBookingsByGroupRef = useRef(selectedHotelBookingsByGroup);
  selectedHotelBookingsByGroupRef.current = selectedHotelBookingsByGroup;
  const selectedHotelBookingsRef = useRef(selectedHotelBookings);
  selectedHotelBookingsRef.current = selectedHotelBookings;
  // Keep these as separate numeric refs. Vite preserves hook state during HMR;
  // changing the old numeric ref into an object would make confirmation throw
  // before the API call with "Cannot create property 'commit' on number '0'".
  const previewSequenceRef = useRef(0);
  const displayPreviewSequenceRef = useRef(0);
  const previewInFlightRef = useRef(new Map<string, Promise<HotelSelectionPreviewResult>>());
  const automaticValidationStartedQuotesRef = useRef(new Set<string>());
  const skipAutomaticValidationAfterResetRef = useRef(false);
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
    const summary = await rebuildHotels({ background: true });
    // Keep the persisted selection maps visible while background validation
    // is running. The authoritative response updates the hotel rows in one
    // render after comparison completes.
    setHotelAvailabilityChangeSummary(summary?.hasChanges ? summary : null);
    return summary;
  }, [rebuildHotels]);

  const handleResetHotels = useCallback(async () => {
    setHotelAvailabilityChangeSummary(null);
    // Reset returns a new availability snapshot. Clear client-side selections
    // first so a stale VSR/offline booking cannot be painted onto the fresh
    // inventory or collapse a continuous stay to its anchor night.
    setSelectedHotelBookings({});
    setSelectedHotelBookingsByGroup({});
    skipAutomaticValidationAfterResetRef.current = true;
    try {
      return await resetHotels();
    } catch (error) {
      skipAutomaticValidationAfterResetRef.current = false;
      throw error;
    }
  }, [resetHotels, setSelectedHotelBookings, setSelectedHotelBookingsByGroup]);

useEffect(() => {
  if (skipAutomaticValidationAfterResetRef.current) {
    skipAutomaticValidationAfterResetRef.current = false;
    return;
  }
  if (!claimAutomaticHotelValidation(
    automaticValidationStartedQuotesRef.current,
    quoteId,
    Boolean(hotelDetails),
    enableAutomaticValidation,
  )) return;

  void rebuildHotels({ background: true });
}, [
  enableAutomaticValidation,
  hotelDetails,
  quoteId,
  rebuildHotels,
]);

  const handleShowOfflineHotels = useCallback(async (routeId?: number) => {
    // Offline availability is a separate fetch action. Do not re-open a
    // previously dismissed live-refresh reconciliation dialog when the hotel
    // data is replaced by this response.
    setHotelAvailabilityChangeSummary(null);
    await showOfflineHotels(routeId);
  }, [showOfflineHotels]);
  const acknowledgeHotelAvailabilityChanges = useCallback(async (selectionIds: number[]) => {
    if (!quoteId) return { appliedCount: 0, selectionIds: [] };
    const result = await ItineraryService.acknowledgeHotelAvailabilityChanges(quoteId, selectionIds);
    if (result.hotelDetails) {
      const mergedHotelDetails = mergeAcknowledgedHotelDetails(hotelDetails, result.hotelDetails);
      setHotelDetails(mergedHotelDetails);
      cacheRouteHotelDetails(quoteId, mergedHotelDetails);
    }
    if (result.financialSummary) {
      setItinerary((previous) => previous ? {
        ...previous,
        overallCost: result.financialSummary?.overallCost ?? previous.overallCost,
        costBreakdown: result.financialSummary?.costBreakdown ?? previous.costBreakdown,
      } : previous);
    }
    setHotelAvailabilityChangeSummary(null);
    return { appliedCount: result.appliedCount, selectionIds: result.selectionIds };
  }, [cacheRouteHotelDetails, hotelDetails, quoteId, setHotelDetails, setItinerary]);
  const handleHotelSelectionsChange = useCallback((selections: HotelSelectionChangeMap) => {
    const targetGroupType = Number(
      Object.values(selections).find((selection) => Number(selection?.groupType || 0) > 0)?.groupType
        || activeHotelGroupType
        || 0,
    );
    if (!targetGroupType) return;

    const nextGroupBookings = mergeHotelSelections(
      selectedHotelBookingsByGroupRef.current[targetGroupType] || {},
      selections,
    );
    setSelectedHotelBookingsByGroup((previousByGroup) => {
      const previousGroupBookings = previousByGroup[targetGroupType] || {};
      if (JSON.stringify(previousGroupBookings) === JSON.stringify(nextGroupBookings)) {
        return previousByGroup;
      }
      const nextByGroup = {
        ...previousByGroup,
        [targetGroupType]: nextGroupBookings,
      };
      selectedHotelBookingsByGroupRef.current = nextByGroup;
      return nextByGroup;
    });
    setSelectedHotelBookings((previousActive) =>
      JSON.stringify(previousActive) === JSON.stringify(nextGroupBookings)
        ? previousActive
        : nextGroupBookings,
    );
  }, [activeHotelGroupType, setSelectedHotelBookings, setSelectedHotelBookingsByGroup]);

  const handleHotelGroupTypeChange = useCallback((groupType: number) => {
    setActiveHotelGroupType(groupType);
    setSelectedHotelBookings(selectedHotelBookingsByGroupRef.current[groupType] || {});
  }, [setActiveHotelGroupType, setSelectedHotelBookings]);

  const previewTemporarySelectionCost = useCallback((
    selections: HotelSelectionChangeMap,
    options?: HotelSelectionPreviewOptions,
  ): Promise<HotelSelectionPreviewResult> => {
    if (!itineraryPlanId) return Promise.resolve(false);

    const mode = options?.mode === "display" ? "display" : "commit";

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
          rateOptionId: selection?.rateOptionId || null,
          optionKey: selection?.optionKey || null,
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
    const requestKey = `${mode}:${fingerprint}`;
    const existingRequest = previewInFlightRef.current.get(requestKey);
    if (existingRequest) return existingRequest;

    const sequenceRef = mode === "display" ? displayPreviewSequenceRef : previewSequenceRef;
    const requestId = ++sequenceRef.current;
    const request = ItineraryService.previewHotelSelectionCost(
      itineraryPlanId,
      mergedSelections as unknown as Record<number, Record<string, unknown> | null>,
      groupType,
    )
      .then((response) => {
        if (requestId !== sequenceRef.current) {
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
            // The breakdown is authoritative for price only. It is built from
            // the server's current route snapshot, which can still contain the
            // previously selected property when a copied cross-group card is
            // being changed. Never let that snapshot replace the user's
            // provider/rate identity (for example Tall Trees with Clouds
            // Valley) before /hotels/select receives the explicit choice.
            netAmount: Number(fresh.totalAmount ?? selection.netAmount ?? 0),
            totalAmountAfterTax: Number(fresh.totalAmount ?? selection.totalAmountAfterTax ?? 0),
            totalPrice: Number(fresh.totalAmount ?? selection.totalPrice ?? 0),
            pricePerNight: Number(fresh.totalAmount ?? selection.pricePerNight ?? 0),
            currency: String(fresh.currency || selection.currency || 'INR').trim() || 'INR',
            checkInDate: String(fresh.checkInDate || fresh.date || selection.checkInDate || '').trim(),
            checkOutDate: String(fresh.checkOutDate || selection.checkOutDate || '').trim(),
            // The preview breakdown may carry the inventory/source package;
            // preserve the target group used for this preview.
            groupType,
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
          // Only apply pricing fields from the preview. It is a temporary
          // calculation response, not a replacement page snapshot; merging
          // the returned itinerary can reset display mode and live selections.
          commit: () => setItinerary((previous) => previous
            ? {
                ...previous,
                overallCost: response.itinerary?.overallCost ?? previous.overallCost,
                costBreakdown: response.itinerary?.costBreakdown ?? previous.costBreakdown,
              }
            : response.itinerary),
        };
        return result;
      })
      .catch((error) => {
        console.error("Failed to preview temporary hotel selection cost", error);
        if (requestId === sequenceRef.current) {
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
        previewInFlightRef.current.delete(requestKey);
      });

    previewInFlightRef.current.set(requestKey, request);
    return request;
  }, [itineraryPlanId, setItinerary]);

  return {
    ...hotelData,
    handleHotelGroupTypeChange,
    handleRebuildHotels,
    handleResetHotels,
    handleShowOfflineHotels,
    acknowledgeHotelAvailabilityChanges,
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
