import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

interface ArrivalHotelDecisionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  arrivalDate?: string;
  previousDayDate?: string;
  onConfirmPreviousDayBilling: () => void;
  onDeclinePreviousDayBilling: () => void;
  isLoading?: boolean;
}

export const ArrivalHotelDecisionModal: React.FC<ArrivalHotelDecisionModalProps> = ({
  open,
  onOpenChange,
  arrivalDate,
  previousDayDate,
  onConfirmPreviousDayBilling,
  onDeclinePreviousDayBilling,
  isLoading = false,
}) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Early-Morning Hotel Check-in Confirmation</DialogTitle>
          <DialogDescription>
            Immediate hotel check-in before 8:00 AM requires the room to be blocked from the previous night, with extra payment applicable.
          </DialogDescription>
        </DialogHeader>

        <div className="rounded-md border border-[#e5d9f2] bg-[#faf5ff] p-4 text-sm text-[#4a4260]">
          <p className="font-medium">Room blocking and payment impact</p>
          <p className="mt-2">
            If the guest arrives on <strong>{arrivalDate || 'selected date'}</strong>, the hotel check-in date will be{' '}
            <strong>{previousDayDate || 'previous date'}</strong>. The guest will physically arrive and check in the next morning.
          </p>
          <p className="mt-2 text-xs text-[#6c6c6c]">
            Select Yes to block the room from the previous night with extra payment. Select No to continue the same-day hotel flow.
          </p>
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={onDeclinePreviousDayBilling}
            disabled={isLoading}
          >
            No, keep same-day check-in
          </Button>
          <Button
            className="bg-[#d546ab] hover:bg-[#c4359a] text-white"
            onClick={onConfirmPreviousDayBilling}
            disabled={isLoading}
          >
            Yes, block room from previous night
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
