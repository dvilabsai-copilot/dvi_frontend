import type { ComponentProps } from "react";
import { ItineraryAncillaryModals } from "../components/ItineraryAncillaryModals";
import type { HotelVoucherItem } from "./useHotelVoucherController";

type AncillaryProps = ComponentProps<typeof ItineraryAncillaryModals>;

type AncillaryModalOptions = {
  itineraryPlanId: number;
  voucherModal: AncillaryProps["voucher"]["isOpen"];
  setVoucherModal: (open: boolean) => void;
  pluckCardModal: AncillaryProps["pluckCard"]["isOpen"];
  setPluckCardModal: (open: boolean) => void;
  invoiceModal: AncillaryProps["invoice"]["isOpen"];
  setInvoiceModal: (open: boolean) => void;
  invoiceType: AncillaryProps["invoice"]["type"];
  incidentalModal: AncillaryProps["incidentalExpenses"]["isOpen"];
  setIncidentalModal: (open: boolean) => void;
  onIncidentalSuccess: NonNullable<AncillaryProps["incidentalExpenses"]["onSuccess"]>;
  cancelModalOpen: AncillaryProps["cancellation"]["open"];
  setCancelModalOpen: AncillaryProps["cancellation"]["onOpenChange"];
  onCancellationSuccess: NonNullable<AncillaryProps["cancellation"]["onSuccess"]>;
  selectedHotelForVoucher: HotelVoucherItem | null;
  hotelVoucherModalOpen: NonNullable<AncillaryProps["hotelVoucher"]>["open"];
  setHotelVoucherModalOpen: NonNullable<AncillaryProps["hotelVoucher"]>["onOpenChange"];
  onHotelVoucherSuccess: NonNullable<AncillaryProps["hotelVoucher"]>["onSuccess"];
};

export function useItineraryAncillaryModalProps(options: AncillaryModalOptions): AncillaryProps | null {
  const {
    itineraryPlanId, voucherModal, setVoucherModal, pluckCardModal, setPluckCardModal, invoiceModal,
    setInvoiceModal, invoiceType, incidentalModal, setIncidentalModal, onIncidentalSuccess,
    cancelModalOpen, setCancelModalOpen, onCancellationSuccess, selectedHotelForVoucher,
    hotelVoucherModalOpen, setHotelVoucherModalOpen, onHotelVoucherSuccess,
  } = options;

  if (!itineraryPlanId) return null;

  return {
    voucher: { isOpen: voucherModal, onClose: () => setVoucherModal(false), itineraryPlanId },
    pluckCard: { isOpen: pluckCardModal, onClose: () => setPluckCardModal(false), itineraryPlanId },
    invoice: { isOpen: invoiceModal, onClose: () => setInvoiceModal(false), itineraryPlanId, type: invoiceType },
    incidentalExpenses: { isOpen: incidentalModal, onClose: () => setIncidentalModal(false), itineraryPlanId, onSuccess: onIncidentalSuccess },
    cancellation: { open: cancelModalOpen, onOpenChange: setCancelModalOpen, itineraryPlanId, onSuccess: onCancellationSuccess },
    hotelVoucher: selectedHotelForVoucher ? {
      open: hotelVoucherModalOpen,
      onOpenChange: setHotelVoucherModalOpen,
      itineraryPlanId,
      routeId: selectedHotelForVoucher.routeId,
      hotelId: selectedHotelForVoucher.hotelId,
      hotelName: selectedHotelForVoucher.hotelName,
      hotelEmail: selectedHotelForVoucher.hotelEmail,
      hotelStateCity: selectedHotelForVoucher.hotelStateCity,
      routeDates: selectedHotelForVoucher.routeDates,
      dayNumbers: selectedHotelForVoucher.dayNumbers,
      hotelDetailsIds: selectedHotelForVoucher.hotelDetailsIds,
      initialStatus: selectedHotelForVoucher.initialStatus,
      onSuccess: onHotelVoucherSuccess,
    } : null,
  };
}
