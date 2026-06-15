import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { VehicleVoucherService } from '@/services/vehicleVoucher';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

interface VehicleVoucherConfirmationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  itineraryPlanId: number;
  vendorEligibleId: number;
  vehicleTypeTitle: string;
  vendorName: string;
  vendorBranchName?: string;
  onSuccess?: () => void;
}

const STATUS_OPTIONS = [
  { value: '1', label: 'Awaiting' },
  { value: '2', label: 'Waiting List' },
  { value: '3', label: 'Blocked' },
  { value: '4', label: 'Confirmed' },
  { value: '5', label: 'Sold Out' },
  { value: '6', label: 'Cancelled' },
];

export const VehicleVoucherConfirmationModal: React.FC<VehicleVoucherConfirmationModalProps> = ({
  open,
  onOpenChange,
  itineraryPlanId,
  vendorEligibleId,
  vehicleTypeTitle,
  vendorName,
  vendorBranchName = '',
  onSuccess,
}) => {
  const [reservationNo, setReservationNo] = useState('');
  const [verifiedBy, setVerifiedBy] = useState('');
  const [verifiedMobileNo, setVerifiedMobileNo] = useState('');
  const [verifiedEmailId, setVerifiedEmailId] = useState('');
  const [bookingStatus, setBookingStatus] = useState('1');
  const [statusRemarks, setStatusRemarks] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      void loadVoucherDetails();
    }
  }, [open, itineraryPlanId, vendorEligibleId]);

  const loadVoucherDetails = async () => {
    setIsLoading(true);

    try {
      const voucher = await VehicleVoucherService.getVehicleVoucher(itineraryPlanId, vendorEligibleId);
      if (!voucher) {
        toast.error('Create the vehicle voucher before updating supplier confirmation');
        onOpenChange(false);
        return;
      }

      setReservationNo(voucher.reservationNo || '');
      setVerifiedBy(voucher.verifiedBy || '');
      setVerifiedMobileNo(voucher.verifiedMobileNo || '');
      setVerifiedEmailId(voucher.verifiedEmailId || voucher.emailId || '');
      setBookingStatus(String(voucher.bookingStatusCode || 1));
      setStatusRemarks(voucher.statusRemarks || '');
    } catch (error) {
      console.error('Failed to load vehicle confirmation details', error);
      toast.error('Failed to load vehicle confirmation details');
      onOpenChange(false);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!reservationNo.trim() || !verifiedBy.trim() || !verifiedMobileNo.trim() || !bookingStatus) {
      toast.error('Please fill in all required fields');
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await VehicleVoucherService.updateVehicleVoucherConfirmation({
        itineraryPlanId,
        vendorEligibleId,
        reservationNo: reservationNo.trim(),
        verifiedBy: verifiedBy.trim(),
        verifiedMobileNo: verifiedMobileNo.trim(),
        verifiedEmailId: verifiedEmailId.trim(),
        bookingStatus: Number(bookingStatus),
        statusRemarks: statusRemarks.trim(),
      });

      if (response.success) {
        toast.success(response.message);
        onOpenChange(false);
        onSuccess?.();
      }
    } catch (error: any) {
      console.error('Failed to update vehicle confirmation', error);
      toast.error(error.message || 'Failed to update vehicle confirmation');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[640px]">
        <DialogHeader>
          <DialogTitle className="text-[#4a4260]">Vehicle Supplier Confirmation</DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-10">
            <Loader2 className="h-8 w-8 animate-spin text-[#d546ab]" />
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="space-y-4 py-4">
              <div className="rounded-lg bg-gradient-to-r from-purple-50 to-pink-50 p-3 text-sm text-[#4a4260]">
                <strong>{vehicleTypeTitle}</strong> | {vendorName}
                {vendorBranchName ? ` - ${vendorBranchName}` : ''}
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <Label htmlFor="reservationNo" className="text-sm font-medium text-[#4a4260]">
                    Reservation No <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="reservationNo"
                    value={reservationNo}
                    onChange={(e) => setReservationNo(e.target.value)}
                    className="mt-1"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="bookingStatus" className="text-sm font-medium text-[#4a4260]">
                    Booking Status <span className="text-red-500">*</span>
                  </Label>
                  <Select value={bookingStatus} onValueChange={setBookingStatus}>
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      {STATUS_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="verifiedBy" className="text-sm font-medium text-[#4a4260]">
                    Verified By <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="verifiedBy"
                    value={verifiedBy}
                    onChange={(e) => setVerifiedBy(e.target.value)}
                    className="mt-1"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="verifiedMobileNo" className="text-sm font-medium text-[#4a4260]">
                    Verified Mobile No <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="verifiedMobileNo"
                    value={verifiedMobileNo}
                    onChange={(e) => setVerifiedMobileNo(e.target.value)}
                    className="mt-1"
                    required
                  />
                </div>

                <div className="md:col-span-2">
                  <Label htmlFor="verifiedEmailId" className="text-sm font-medium text-[#4a4260]">
                    Verified Email ID
                  </Label>
                  <Input
                    id="verifiedEmailId"
                    type="email"
                    value={verifiedEmailId}
                    onChange={(e) => setVerifiedEmailId(e.target.value)}
                    className="mt-1"
                  />
                </div>

                <div className="md:col-span-2">
                  <Label htmlFor="statusRemarks" className="text-sm font-medium text-[#4a4260]">
                    Status Remarks
                  </Label>
                  <Textarea
                    id="statusRemarks"
                    value={statusRemarks}
                    onChange={(e) => setStatusRemarks(e.target.value)}
                    rows={4}
                    className="mt-1 resize-none"
                    placeholder="Optional notes from the supplier confirmation"
                  />
                </div>
              </div>
            </div>

            <DialogFooter className="gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="bg-[#d546ab] text-white hover:bg-[#c03d9f]"
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Saving...' : 'Save Confirmation'}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
};
