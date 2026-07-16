import type { ComponentProps } from "react";
import { QuotationConfirmationDialogShell } from "../QuotationConfirmationDialogShell";
import { QuotationConfirmationOverview } from "./QuotationConfirmationOverview";
import { QuotationHotelReviewSections } from "./QuotationHotelReviewSections";
import { QuotationPassengerForm } from "../QuotationPassengerForm";
import { QuotationTravelDetailsForm } from "../QuotationTravelDetailsForm";
import { QuotationDialogFooter } from "../QuotationDialogFooter";

type QuotationConfirmationDialogProps = {
  open: ComponentProps<typeof QuotationConfirmationDialogShell>["open"];
  onOpenChange: ComponentProps<typeof QuotationConfirmationDialogShell>["onOpenChange"];
  overview: ComponentProps<typeof QuotationConfirmationOverview>;
  hotelReview: ComponentProps<typeof QuotationHotelReviewSections>;
  passenger: ComponentProps<typeof QuotationPassengerForm>;
  travel: ComponentProps<typeof QuotationTravelDetailsForm>;
  footer: ComponentProps<typeof QuotationDialogFooter>;
};

/** Composes the quotation confirmation workflow without owning its state or mutations. */
export function QuotationConfirmationDialog({
  open,
  onOpenChange,
  overview,
  hotelReview,
  passenger,
  travel,
  footer,
}: QuotationConfirmationDialogProps) {
  return (
    <QuotationConfirmationDialogShell open={open} onOpenChange={onOpenChange}>
      <div className="space-y-4 py-4">
        <QuotationConfirmationOverview {...overview} />
        <QuotationHotelReviewSections {...hotelReview} />
        <QuotationPassengerForm {...passenger} />
        <QuotationTravelDetailsForm {...travel} />
      </div>
      <QuotationDialogFooter {...footer} />
    </QuotationConfirmationDialogShell>
  );
}

export default QuotationConfirmationDialog;
