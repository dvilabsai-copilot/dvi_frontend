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
import { VehicleVoucherService, AddVehicleCancellationPolicyPayload } from '@/services/vehicleVoucher';
import { toast } from 'sonner';
import { Calendar } from 'lucide-react';

interface AddVehicleCancellationPolicyModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  itineraryPlanId: number;
  vendorId: number;
  vendorName: string;
  vendorVehicleTypeId: number;
  vehicleTypeName: string;
  onSuccess?: () => void;
}

export const AddVehicleCancellationPolicyModal: React.FC<AddVehicleCancellationPolicyModalProps> = ({
  open,
  onOpenChange,
  itineraryPlanId,
  vendorId,
  vendorName,
  vendorVehicleTypeId,
  vehicleTypeName,
  onSuccess,
}) => {
  const [cancellationDate, setCancellationDate] = useState(new Date().toISOString().split('T')[0]);
  const [cancellationPercentage, setCancellationPercentage] = useState('');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleReset = () => {
    setCancellationDate(new Date().toISOString().split('T')[0]);
    setCancellationPercentage('');
    setDescription('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!cancellationDate || !cancellationPercentage) {
      toast.error('Please fill in all required fields');
      return;
    }

    const percentage = parseFloat(cancellationPercentage);
    if (Number.isNaN(percentage) || percentage < 0 || percentage > 100) {
      toast.error('Cancellation percentage must be between 0 and 100');
      return;
    }

    setIsSubmitting(true);

    try {
      const payload: AddVehicleCancellationPolicyPayload = {
        itineraryPlanId,
        vendorId,
        vendorVehicleTypeId,
        cancellationDate,
        cancellationPercentage: percentage,
        description: description.trim() || `Cancellation policy as of ${cancellationDate}`,
      };

      const response = await VehicleVoucherService.addCancellationPolicy(payload);

      if (response.success) {
        toast.success('Vehicle cancellation policy added successfully');
        handleReset();
        onOpenChange(false);
        onSuccess?.();
      }
    } catch (error: any) {
      console.error('Failed to add vehicle cancellation policy', error);
      toast.error(error.message || 'Failed to add vehicle cancellation policy');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle className="text-[#4a4260]">Add Vehicle Cancellation Policy</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            <div>
              <Label className="mb-1 block text-sm font-medium text-[#4a4260]">
                Vendor
              </Label>
              <Input value={vendorName} readOnly className="cursor-not-allowed bg-gray-50" />
            </div>

            <div>
              <Label className="mb-1 block text-sm font-medium text-[#4a4260]">
                Vehicle Type
              </Label>
              <Input value={vehicleTypeName} readOnly className="cursor-not-allowed bg-gray-50" />
            </div>

            <div>
              <Label htmlFor="vehicleCancellationDate" className="mb-1 block text-sm font-medium text-[#4a4260]">
                Cancellation Date <span className="text-red-500">*</span>
              </Label>
              <div className="relative">
                <Input
                  id="vehicleCancellationDate"
                  type="date"
                  value={cancellationDate}
                  onChange={(e) => setCancellationDate(e.target.value)}
                  className="pr-10"
                  required
                />
                <Calendar className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              </div>
            </div>

            <div>
              <Label htmlFor="vehicleCancellationPercentage" className="mb-1 block text-sm font-medium text-[#4a4260]">
                Cancellation Percentage <span className="text-red-500">*</span>
              </Label>
              <div className="relative">
                <Input
                  id="vehicleCancellationPercentage"
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
                <span className="absolute right-3 top-1/2 -translate-y-1/2 font-medium text-gray-500">
                  %
                </span>
              </div>
            </div>

            <div>
              <Label htmlFor="vehicleCancellationDescription" className="mb-1 block text-sm font-medium text-[#4a4260]">
                Description
              </Label>
              <Textarea
                id="vehicleCancellationDescription"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Optional description for this cancellation slab"
                rows={3}
                className="resize-none"
              />
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
              className="bg-[#d546ab] text-white hover:bg-[#c03d9f]"
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
