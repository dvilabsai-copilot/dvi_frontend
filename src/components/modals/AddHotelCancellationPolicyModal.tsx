import React, { useState } from 'react';
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
import { HotelVoucherService, AddCancellationPolicyPayload } from '@/services/hotelVoucher';
import { toast } from 'sonner';
import { Calendar } from 'lucide-react';

interface AddHotelCancellationPolicyModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  itineraryPlanId: number;
  hotelId: number;
  hotelName: string;
  onSuccess?: () => void;
}

export const AddHotelCancellationPolicyModal: React.FC<AddHotelCancellationPolicyModalProps> = ({
  open,
  onOpenChange,
  itineraryPlanId,
  hotelId,
  hotelName,
  onSuccess,
}) => {
  const [cancellationDate, setCancellationDate] = useState(new Date().toISOString().split('T')[0]);
  const [cancellationPercentage, setCancellationPercentage] = useState('');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleReset = () => {
    setCancellationDate('');
    setCancellationPercentage('');
    setDescription('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!cancellationDate || !cancellationPercentage || !description.trim()) {
      toast.error('Please fill in all required fields');
      return;
    }

    const percentage = parseFloat(cancellationPercentage);
    if (isNaN(percentage) || percentage < 0 || percentage > 100) {
      toast.error('Cancellation percentage must be between 0 and 100');
      return;
    }

    setIsSubmitting(true);

    try {
      const payload: AddCancellationPolicyPayload = {
        itineraryPlanId,
        hotelId,
        cancellationDate,
        cancellationPercentage: percentage,
        description,
      };

      const response = await HotelVoucherService.addCancellationPolicy(payload);

      if (response.success) {
        toast.success('Cancellation policy added successfully');
        handleReset();
        onOpenChange(false);
        if (onSuccess) onSuccess();
      }
    } catch (error: any) {
 console.error('Failed to add cancellation policy', error);
      toast.error(error.message || 'Failed to add cancellation policy');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="text-[#4a4260]">Add Cancellation Policy</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
 {/* Hotel Name - Read Only */}
            <div>
              <Label className="text-sm font-medium text-[#4a4260] mb-1 block">
                Hotel Name
              </Label>
              <Input
                type="text"
                value={hotelName}
                readOnly
                className="bg-gray-50 cursor-not-allowed"
              />
            </div>

 {/* Cancellation Date */}
            <div>
              <Label htmlFor="cancellationDate" className="text-sm font-medium text-[#4a4260] mb-1 block">
                Cancellation Date <span className="text-red-500">*</span>
              </Label>
              <div className="relative">
                <Input
                  id="cancellationDate"
                  type="date"
                  value={cancellationDate}
                  onChange={(e) => setCancellationDate(e.target.value)}
                  className="pr-10"
                  required
                />
                <Calendar className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
              </div>
            </div>

 {/* Cancellation Percentage */}
            <div>
              <Label htmlFor="cancellationPercentage" className="text-sm font-medium text-[#4a4260] mb-1 block">
                Cancellation Percentage <span className="text-red-500">*</span>
              </Label>
              <div className="relative">
                <Input
                  id="cancellationPercentage"
                  type="number"
                  min="0"
                  max="100"
                  step="0.01"
                  value={cancellationPercentage}
                  onChange={(e) => setCancellationPercentage(e.target.value)}
                  placeholder="Enter percentage (0-100)"
                  className="pr-10"
                  required
                />
                <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 font-medium">
                  %
                </span>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                This percentage will be deducted from the total hotel cost
              </p>
            </div>

 {/* Description */}
            <div>
              <Label htmlFor="description" className="text-sm font-medium text-[#4a4260] mb-1 block">
                Description <span className="text-red-500">*</span>
              </Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="E.g., Cancellation before 7 days - 10% deduction"
                rows={3}
                className="resize-none"
                required
              />
            </div>

 {/* Info Box */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <p className="text-xs text-blue-800">
                <strong>Note:</strong> This cancellation policy will be applied to the hotel voucher.
                Multiple policies can be added based on different cancellation dates.
              </p>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                handleReset();
                onOpenChange(false);
              }}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="bg-[#d546ab] hover:bg-[#c03d9f] text-white"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Adding...' : 'Add Policy'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
