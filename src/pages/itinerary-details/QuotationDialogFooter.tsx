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
}: QuotationDialogFooterProps) {
  return (
<DialogFooter className="gap-2">
  <Button
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
  </Button>
  <Button
    type="button"
    className="bg-[#8b43d1] hover:bg-[#7c37c1]"
    onClick={() => {
      void handleConfirmQuotation();
    }}
    disabled={isConfirmingQuotation || isPrebooking || isWalletTopUpSubmitting}
  >
    {isPrebooking ? 'Running Prebook...' : isConfirmingQuotation ? 'Submitting...' : 'Confirm Booking'}
  </Button>
</DialogFooter>
  );
}
