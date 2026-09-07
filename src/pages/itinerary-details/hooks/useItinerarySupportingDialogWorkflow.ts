import type { MutableRefObject } from "react";
import type { ItineraryDetailsResponse } from "../itinerary-details.types";
import { useArrivalPolicyDecisionDialog } from "./useArrivalPolicyDecisionDialog";
import { useFitHereDialogProps } from "./useFitHereDialogProps";
import { useItineraryHotelDialogProps } from "./useItineraryHotelDialogProps";
import type { useHotelWorkflowState } from "./useHotelWorkflowState";
import type { useItineraryQuotationState } from "./useItineraryQuotationState";
import type { useHotspotState } from "./useHotspotState";
import type { useItineraryHotelSelectionWorkflow } from "./useItineraryHotelSelectionWorkflow";
import type { useItineraryDeletionState } from "./useItineraryDeletionState";
import type { useItineraryHotelDataWorkflow } from "./useItineraryHotelDataWorkflow";
import { useItineraryAncillaryModalProps } from "./useItineraryAncillaryModalProps";
import { toast } from "sonner";

type HotelWorkflowState = ReturnType<typeof useHotelWorkflowState>;
type QuotationState = ReturnType<typeof useItineraryQuotationState>;
type HotspotState = ReturnType<typeof useHotspotState>;
type HotelSelectionWorkflow = ReturnType<typeof useItineraryHotelSelectionWorkflow>;
type DeletionState = ReturnType<typeof useItineraryDeletionState>;
type HotelDataWorkflow = ReturnType<typeof useItineraryHotelDataWorkflow>;
type ArrivalOptions = Parameters<typeof useArrivalPolicyDecisionDialog>[0];
type FitOptions = Parameters<typeof useFitHereDialogProps>[0];
type HotelOptions = Parameters<typeof useItineraryHotelDialogProps>[0];

/** Composes the non-quotation itinerary dialogs from their domain state/workflows. */
export function useItinerarySupportingDialogWorkflow({
  itinerary,
  hotelWorkflowState,
  quotationState,
  hotspotState,
  deletionState,
  hotelSelectionWorkflow,
  hotelDataWorkflow,
  selectedFitHereDay,
  fitHereHandlers,
  arrivalHandlers,
  hotelHandlers,
}: {
  itinerary: ItineraryDetailsResponse | null;
  hotelWorkflowState: HotelWorkflowState;
  quotationState: QuotationState;
  hotspotState: HotspotState;
  deletionState: DeletionState;
  hotelSelectionWorkflow: HotelSelectionWorkflow;
  hotelDataWorkflow: HotelDataWorkflow;
  selectedFitHereDay: FitOptions["selectedFitHereDay"];
  fitHereHandlers: {
    onManualClose: () => void;
    onManualConfirm: FitOptions["onManualConfirm"];
    onManualRetry: FitOptions["onManualRetry"];
    onAutomaticConfirm: FitOptions["onAutomaticConfirm"];
  };
  arrivalHandlers: {
    applyRouteTimePatch: ArrivalOptions["applyRouteTimePatch"];
    persistArrivalPolicyDecision: ArrivalOptions["persistArrivalPolicyDecision"];
    resolveArrivalPolicyForArrivalTimeChange: ArrivalOptions["resolveArrivalPolicyForArrivalTimeChange"];
  };
  hotelHandlers: {
    handleSelectHotelFromSearch: HotelOptions["handleSelectHotelFromSearch"];
  };
}) {
  const fitHereDialogProps = useFitHereDialogProps({
    fitHereModal: hotspotState.fitHereModal,
    selectedFitHotspot: hotspotState.selectedFitHotspot,
    selectedFitHereDay,
    onManualClose: fitHereHandlers.onManualClose,
    onManualConfirm: fitHereHandlers.onManualConfirm,
    onManualRetry: fitHereHandlers.onManualRetry,
    confirmLoading: hotspotState.confirmFitHereLoading,
    autoFitHereModal: hotspotState.autoFitHereModal,
    selectedHotspot: hotspotState.selectedFitHotspot,
    previewRequestIdRef: hotspotState.previewRequestIdRef,
    setAutoFitHereModal: hotspotState.setAutoFitHereModal,
    onAutomaticConfirm: fitHereHandlers.onAutomaticConfirm,
  });
  const arrivalPolicyDialogProps = useArrivalPolicyDecisionDialog({
    itinerary,
    arrivalPolicyConfirmModal: hotelWorkflowState.arrivalPolicyConfirmModal,
    setArrivalPolicyConfirmModal: hotelWorkflowState.setArrivalPolicyConfirmModal,
    pendingRouteTimeUpdate: hotelWorkflowState.pendingRouteTimeUpdate,
    setPendingRouteTimeUpdate: hotelWorkflowState.setPendingRouteTimeUpdate,
    setLastArrivalPolicyDecisionKey: hotelWorkflowState.setLastArrivalPolicyDecisionKey,
    isResolvingArrivalPolicy: hotelWorkflowState.isResolvingArrivalPolicy,
    isApplyingRouteTimeUpdate: hotelWorkflowState.isApplyingRouteTimeUpdate,
    ...arrivalHandlers,
  });
  const hotelDialogProps = useItineraryHotelDialogProps({
    hotelSelectionModal: hotelWorkflowState.hotelSelectionModal,
    roomSelectionModal: hotelWorkflowState.roomSelectionModal,
    itinerary,
    guestDetails: quotationState.guestDetails,
    hotelSearchChildAges: hotelWorkflowState.hotelSearchChildAges,
    setHotelSearchChildAges: hotelWorkflowState.setHotelSearchChildAges,
    handleSelectHotelFromSearch: hotelHandlers.handleSelectHotelFromSearch,
    isSelectingHotel: hotelWorkflowState.isSelectingHotel,
    setHotelSelectionModal: hotelWorkflowState.setHotelSelectionModal,
    setRoomSelectionModal: hotelWorkflowState.setRoomSelectionModal,
    onRoomSelectionSuccess: async (payload) => {
      const refreshedHotelDetails = await hotelDataWorkflow.refreshHotelData();
      if (!payload?.rooms?.length || !refreshedHotelDetails?.hotels?.length) return;

      const normalizedRequestedRoomTypes = new Set(
        payload.rooms
          .map((room) => String(room.room_type_title || '').trim().toLowerCase().replace(/[^a-z0-9]/g, ''))
          .filter(Boolean),
      );
      const requestedRouteId = Number(payload.itinerary_route_id || 0);
      const requestedHotelId = Number(payload.hotel_id || 0);
      const requestedGroupType = Number(payload.group_type || 0);
      const isMixedRoomAllocation = payload.rooms.length > 1 || normalizedRequestedRoomTypes.size > 1;

      const matchedHotelRow = refreshedHotelDetails.hotels.find((hotel) => {
        const routeMatch = Number(hotel.itineraryRouteId || 0) === requestedRouteId;
        const hotelMatch = Number(hotel.hotelId || hotel.canonicalHotelId || 0) === requestedHotelId;
        const groupMatch = Number(hotel.groupType || 0) === requestedGroupType;
        const rowRoomIdentity = String(hotel.roomType || hotel.roomId || '')
          .trim()
          .toLowerCase()
          .replace(/[^a-z0-9]/g, '');
        // A mixed-room allocation is represented by one aggregate hotel row;
        // its `roomType` is a display label such as "2 Rooms Deluxe / 1 Room
        // Garden Cottage", so it cannot equal any individual room submitted
        // by the modal.  Route + hotel + group identify that row uniquely.
        // Keep the room identity guard for single-room edits so an unrelated
        // row cannot overwrite the active selection.
        const roomTypeMatch = isMixedRoomAllocation ||
          normalizedRequestedRoomTypes.size === 0 ||
          normalizedRequestedRoomTypes.has(rowRoomIdentity);
        return routeMatch && hotelMatch && groupMatch && roomTypeMatch;
      });

      if (!matchedHotelRow) return;
      hotelDataWorkflow.handleHotelSelectionsChange({
        [requestedRouteId]: {
          provider: String(matchedHotelRow.provider || '').trim().toLowerCase(),
          hotelCode: String(matchedHotelRow.hotelCode || matchedHotelRow.hotelId || '').trim(),
          hotelId: Number(matchedHotelRow.hotelId || 0) || undefined,
          canonicalHotelId: Number(matchedHotelRow.canonicalHotelId || 0) || undefined,
          bookingCode: String(matchedHotelRow.bookingCode || matchedHotelRow.searchReference || '').trim(),
          rateOptionId: String(matchedHotelRow.rateOptionId || '').trim() || undefined,
          roomType: String(matchedHotelRow.roomType || '').trim(),
          netAmount: Number(matchedHotelRow.totalHotelCost || 0) + Number(matchedHotelRow.totalHotelTaxAmount || 0),
          hotelName: String(matchedHotelRow.hotelName || payload.hotel_name || '').trim(),
          checkInDate: String(matchedHotelRow.checkInDate || matchedHotelRow.date || '').trim(),
          checkOutDate: String(matchedHotelRow.checkOutDate || '').trim(),
          groupType: Number(matchedHotelRow.groupType || requestedGroupType || 0),
          mealPlan: String(matchedHotelRow.mealPlan || '').trim() || undefined,
          // Preserve the complete read-after-write pricing contract.  The
          // room editor refreshes hotel details, but the selection store is
          // also used to overlay the table row and tooltip.  Sending only the
          // compact identity here caused the previous room's total/margin to
          // survive the merge and made the UI disagree with the refreshed API
          // row (especially for mixed room allocations).
          roomSelections: (matchedHotelRow as any).roomSelections,
          roomTypeBreakdown: (matchedHotelRow as any).roomTypeBreakdown,
          selectedPriceSnapshot: (matchedHotelRow as any).selectedPriceSnapshot || (matchedHotelRow as any).selected_price_snapshot,
          selectedPricePerNight: (matchedHotelRow as any).selectedPricePerNight,
          selectedTotalPrice: (matchedHotelRow as any).selectedTotalPrice,
          totalHotelCost: Number((matchedHotelRow as any).totalHotelCost || 0) || undefined,
          totalStayPrice: Number((matchedHotelRow as any).totalStayPrice || 0) || undefined,
          hotelMarginBaseAmount: Number((matchedHotelRow as any).hotelMarginBaseAmount || 0) || undefined,
          hotelMarginAmount: Number((matchedHotelRow as any).hotelMarginAmount || 0) || undefined,
          hotelMarginTotalAmount: Number((matchedHotelRow as any).hotelMarginTotalAmount || 0) || undefined,
          hotelMarginPercentage: Number((matchedHotelRow as any).hotelMarginPercentage || 0) || undefined,
          totalExtraBedCost: Number((matchedHotelRow as any).totalExtraBedCost || 0) || undefined,
          totalChildWithBedCost: Number((matchedHotelRow as any).totalChildWithBedCost || 0) || undefined,
          totalChildWithoutBedCost: Number((matchedHotelRow as any).totalChildWithoutBedCost || 0) || undefined,
          extraBedCount: Number((matchedHotelRow as any).extraBedCount || 0) || undefined,
          childWithBedCount: Number((matchedHotelRow as any).childWithBedCount || 0) || undefined,
          childWithoutBedCount: Number((matchedHotelRow as any).childWithoutBedCount || 0) || undefined,
          searchReference: String(matchedHotelRow.searchReference || '').trim() || undefined,
          roomId: String(matchedHotelRow.roomId || '').trim() || undefined,
          rateId: String(matchedHotelRow.rateId || '').trim() || undefined,
          optionKey: String((matchedHotelRow as any).optionKey || '').trim() || undefined,
          pricePerNight: Number((matchedHotelRow as any).pricePerNight || 0) || undefined,
          totalPrice: Number((matchedHotelRow as any).totalHotelCost || (matchedHotelRow as any).totalStayPrice || 0) || undefined,
          totalAmountAfterTax: Number(matchedHotelRow.totalHotelCost || 0) + Number(matchedHotelRow.totalHotelTaxAmount || 0),
        },
      });
    },
  });
  const ancillaryModalProps = useItineraryAncillaryModalProps({
    itineraryPlanId: itinerary?.planId || 0,
    voucherModal: quotationState.voucherModal,
    setVoucherModal: quotationState.setVoucherModal,
    pluckCardModal: quotationState.pluckCardModal,
    setPluckCardModal: quotationState.setPluckCardModal,
    invoiceModal: quotationState.invoiceModal,
    setInvoiceModal: quotationState.setInvoiceModal,
    invoiceType: quotationState.invoiceType,
    incidentalModal: quotationState.incidentalModal,
    setIncidentalModal: quotationState.setIncidentalModal,
    onIncidentalSuccess: () => quotationState.setIncidentalHistoryRefreshToken((current) => current + 1),
    cancelModalOpen: hotelDataWorkflow.cancelModalOpen,
    setCancelModalOpen: hotelDataWorkflow.setCancelModalOpen,
    onCancellationSuccess: () => {
      toast.success("Itinerary data will be refreshed");
      window.location.reload();
    },
    selectedHotelForVoucher: hotelDataWorkflow.selectedHotelForVoucher,
    hotelVoucherModalOpen: hotelDataWorkflow.hotelVoucherModalOpen,
    setHotelVoucherModalOpen: hotelDataWorkflow.setHotelVoucherModalOpen,
    onHotelVoucherSuccess: hotelDataWorkflow.refreshHotelData,
  });
  return { arrivalPolicyDialogProps, fitHereDialogProps, hotelDialogProps, ancillaryModalProps };
}
