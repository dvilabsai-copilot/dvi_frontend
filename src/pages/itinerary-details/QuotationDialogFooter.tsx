import type { Dispatch, SetStateAction } from "react";
import { Button } from "@/components/ui/button";
import { DialogFooter } from "@/components/ui/dialog";
import type { AdditionalPassenger, GuestDetails } from "./hooks/useQuotationState";

type QuotationDialogFooterProps = {
  setConfirmQuotationModal: Dispatch<SetStateAction<boolean>>;
  setGuestDetails: Dispatch<SetStateAction<GuestDetails>>;
  confirmDefaultNationality: string;
  setAdditionalAdults: Dispatch<SetStateAction<AdditionalPassenger[]>>;
  setAdditionalChildren: Dispatch<SetStateAction<AdditionalPassenger[]>>;
  setAdditionalInfants: Dispatch<SetStateAction<AdditionalPassenger[]>>;
  setPrebookData: (value: null) => void;
  setHasAcceptedUpdatedPrice: Dispatch<SetStateAction<boolean>>;
  setFormErrors: Dispatch<SetStateAction<Record<string, string>>>;
  resetConfirmWalletTopUpPanel: () => void;
  handleConfirmQuotation: () => void | Promise<void>;
  isConfirmingQuotation: boolean;
  isPrebooking: boolean;
  isWalletTopUpSubmitting: boolean;
  canConfirmQuotation: boolean;
  showCancel?: boolean;
  stitchStyle?: boolean;
};

export function QuotationDialogFooter({
  setConfirmQuotationModal,
  setGuestDetails,
  confirmDefaultNationality,
  setAdditionalAdults,
  setAdditionalChildren,
  setAdditionalInfants,
  setPrebookData,
  setHasAcceptedUpdatedPrice,
  setFormErrors,
  resetConfirmWalletTopUpPanel,
  handleConfirmQuotation,
  isConfirmingQuotation,
  isPrebooking,
  isWalletTopUpSubmitting,
  canConfirmQuotation,
  showCancel = true,
  stitchStyle = false,
}: QuotationDialogFooterProps) {
  return (
<DialogFooter className="gap-2">
  {showCancel && <Button
    variant="outline"
    onClick={() => {
      setConfirmQuotationModal(false);
      setGuestDetails({
        salutation: 'Mr',
        name: '',
        contactNo: '',
        age: '',
        nationality: confirmDefaultNationality,
        panNo: '',
        passportNo: '',
        alternativeContactNo: '',
        emailId: '',
        arrivalDateTime: '',
        arrivalPlace: '',
        arrivalFlightDetails: '',
        departureDateTime: '',
        departurePlace: '',
        departureFlightDetails: '',
      });
      setAdditionalAdults([]);
      setAdditionalChildren([]);
      setAdditionalInfants([]);
      setPrebookData(null);
      setHasAcceptedUpdatedPrice(false);
      setFormErrors({});
      resetConfirmWalletTopUpPanel();
    }}
  >
    Cancel
  </Button>}
  <Button
    type="button"
    className={stitchStyle ? "bg-[#059669] hover:bg-[#047857]" : "bg-[#8b43d1] hover:bg-[#7c37c1]"}
    onClick={() => {
      void handleConfirmQuotation();
    }}
    disabled={isConfirmingQuotation || isPrebooking || isWalletTopUpSubmitting || !canConfirmQuotation}
    title={!canConfirmQuotation ? "Select a vehicle with valid rates before confirming." : undefined}
  >
    {isPrebooking ? 'Holding Hotels...' : isConfirmingQuotation ? 'Submitting...' : 'Confirm & Pay'}
  </Button>
</DialogFooter>
  );
}
