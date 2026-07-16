import type { ComponentProps } from "react";
import { VoucherDetailsModal } from "../../VoucherDetailsModal";
import { PluckCardModal } from "../../PluckCardModal";
import { InvoiceModal } from "../../InvoiceModal";
import { IncidentalExpensesModal } from "../../IncidentalExpensesModal";
import { CancelItineraryModal } from "@/components/modals/CancelItineraryModal";
import { HotelVoucherModal } from "@/components/modals/HotelVoucherModal";

type ItineraryAncillaryModalsProps = {
  voucher: ComponentProps<typeof VoucherDetailsModal>;
  pluckCard: ComponentProps<typeof PluckCardModal>;
  invoice: ComponentProps<typeof InvoiceModal>;
  incidentalExpenses: ComponentProps<typeof IncidentalExpensesModal>;
  cancellation: ComponentProps<typeof CancelItineraryModal>;
  hotelVoucher?: ComponentProps<typeof HotelVoucherModal> | null;
};

/** Composes itinerary-level voucher, invoice, cancellation, and expense dialogs. */
export function ItineraryAncillaryModals({
  voucher,
  pluckCard,
  invoice,
  incidentalExpenses,
  cancellation,
  hotelVoucher,
}: ItineraryAncillaryModalsProps) {
  return (
    <>
      <VoucherDetailsModal {...voucher} />
      <PluckCardModal {...pluckCard} />
      <InvoiceModal {...invoice} />
      <IncidentalExpensesModal {...incidentalExpenses} />
      <CancelItineraryModal {...cancellation} />
      {hotelVoucher && <HotelVoucherModal {...hotelVoucher} />}
    </>
  );
}

export default ItineraryAncillaryModals;
