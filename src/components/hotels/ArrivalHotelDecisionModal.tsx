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
          <DialogTitle>Previous-Day Hotel Billing Confirmation</DialogTitle>
          <DialogDescription>
            Arrival before 8:00 AM can use immediate hotel check-in only with previous-day billing approval.
          </DialogDescription>
        </DialogHeader>

        <div className="rounded-md border border-[#e5d9f2] bg-[#faf5ff] p-4 text-sm text-[#4a4260]">
          <p className="font-medium">Billing impact</p>
          <p className="mt-2">
            If arrival is on <strong>{arrivalDate || 'selected date'}</strong>, previous-day check-in starts from{' '}
            <strong>{previousDayDate || 'previous date'}</strong>.
          </p>
          <p className="mt-2 text-xs text-[#6c6c6c]">
            Select Yes to search hotels from previous day. Select No to continue same-day flow.
          </p>
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={onDeclinePreviousDayBilling}
            disabled={isLoading}
          >
            No, keep same-day booking
          </Button>
          <Button
            className="bg-[#d546ab] hover:bg-[#c4359a] text-white"
            onClick={onConfirmPreviousDayBilling}
            disabled={isLoading}
          >
            Yes, use previous-day billing
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
