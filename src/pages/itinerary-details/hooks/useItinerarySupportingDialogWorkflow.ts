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
    onRoomSelectionSuccess: () => undefined,
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
