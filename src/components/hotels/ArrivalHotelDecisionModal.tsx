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
import { AlertTriangle, CalendarDays, CreditCard, Moon } from 'lucide-react';

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
      <DialogContent className="overflow-hidden border-[#eadcf4] p-0 shadow-2xl sm:max-w-xl">
        <DialogHeader className="border-b border-[#f0e6f7] bg-gradient-to-br from-[#fffaff] to-[#f8f1ff] px-6 pb-5 pt-6">
          <div className="flex items-start gap-3 pr-6">
            <div className="mt-0.5 rounded-full bg-[#fbe7f6] p-2 text-[#c2389c]">
              <AlertTriangle className="h-5 w-5" aria-hidden="true" />
            </div>
            <div>
              <DialogTitle className="text-xl text-[#272735]">Confirm early-morning hotel blocking</DialogTitle>
              <DialogDescription className="mt-1.5 text-sm leading-6 text-[#6b6576]">
                Arrival before 8:00 AM requires the room to be blocked from the previous night. An extra hotel night payment will apply.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 px-6 py-5">
          <div className="rounded-xl border border-[#e5d9f2] bg-[#fbf7ff] p-4">
            <p className="mb-3 text-sm font-semibold text-[#4a4260]">What will be recorded in the itinerary?</p>
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="flex gap-2.5">
                <CalendarDays className="mt-0.5 h-4 w-4 shrink-0 text-[#9354c9]" aria-hidden="true" />
                <div>
                  <p className="text-[11px] font-medium uppercase tracking-wide text-[#81768e]">Guest arrival</p>
                  <p className="mt-0.5 text-sm font-semibold text-[#373244]">{arrivalDate || 'Selected date'}</p>
                </div>
              </div>
              <div className="flex gap-2.5">
                <Moon className="mt-0.5 h-4 w-4 shrink-0 text-[#9354c9]" aria-hidden="true" />
                <div>
                  <p className="text-[11px] font-medium uppercase tracking-wide text-[#81768e]">Room blocked from</p>
                  <p className="mt-0.5 text-sm font-semibold text-[#373244]">{previousDayDate || 'Previous date'}</p>
                </div>
              </div>
              <div className="flex gap-2.5">
                <CreditCard className="mt-0.5 h-4 w-4 shrink-0 text-[#9354c9]" aria-hidden="true" />
                <div>
                  <p className="text-[11px] font-medium uppercase tracking-wide text-[#81768e]">Payment</p>
                  <p className="mt-0.5 text-sm font-semibold text-[#373244]">Extra payment applicable</p>
                </div>
              </div>
            </div>
          </div>
          <p className="text-sm leading-5 text-[#6b6576]">
            Choose <strong>Yes, block room</strong> to save these details for the hotelier. Choose No to keep the hotel check-in on the guest arrival date.
          </p>
        </div>

        <DialogFooter className="flex-col-reverse gap-2 border-t border-[#f0e6f7] bg-white px-6 py-4 sm:flex-row sm:justify-end">
          <Button
            variant="outline"
            onClick={onDeclinePreviousDayBilling}
            disabled={isLoading}
            className="h-11 w-full border-[#ddd9e2] text-[#4a4651] sm:w-auto"
          >
            No, keep same-day
          </Button>
          <Button
            className="h-11 w-full bg-[#d546ab] text-white shadow-sm hover:bg-[#c4359a] sm:w-auto"
            onClick={onConfirmPreviousDayBilling}
            disabled={isLoading}
          >
            Yes, block room
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
