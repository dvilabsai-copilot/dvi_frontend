import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ItineraryService } from '@/services/itinerary';
import { toast } from 'sonner';

interface CancelItineraryModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  itineraryPlanId: number | null;
  onSuccess?: () => void;
}

export const CancelItineraryModal: React.FC<CancelItineraryModalProps> = ({
  open,
  onOpenChange,
  itineraryPlanId,
  onSuccess,
}) => {
  const [cancelReason, setCancelReason] = useState('');
  const [isCancelling, setIsCancelling] = useState(false);
  
  // Cancellation options
  const [cancellationOptions, setCancellationOptions] = useState({
    selectAll: false,
    modifyHotspot: false,
    modifyHotel: false,
    modifyVehicle: false,
    modifyGuide: false,
    modifyActivity: false,
  });

  // Cancellation result
  const [cancellationResult, setCancellationResult] = useState<any | null>(null);

  const resetCancellationState = () => {
    setCancelReason('');
    setCancellationOptions({
      selectAll: false,
      modifyHotspot: false,
      modifyHotel: false,
      modifyVehicle: false,
      modifyGuide: false,
      modifyActivity: false,
    });
    setCancellationResult(null);
  };

  // Reset state when modal opens
  useEffect(() => {
    if (open) {
      resetCancellationState();
    }
  }, [open]);

  const handleCancelItinerary = async () => {
    if (!itineraryPlanId || !cancelReason.trim()) {
      toast.error('Please provide a reason for cancellation');
      return;
    }

    setIsCancelling(true);
    try {
      const response = await ItineraryService.cancelItinerary({
        itinerary_plan_ID: itineraryPlanId,
        reason: cancelReason,
        cancellation_percentage: 10,
        cancellation_options: {
          modify_hotspot: cancellationOptions.modifyHotspot,
          modify_hotel: cancellationOptions.modifyHotel,
          modify_vehicle: cancellationOptions.modifyVehicle,
          modify_guide: cancellationOptions.modifyGuide,
          modify_activity: cancellationOptions.modifyActivity,
        },
      });

      // Show result with detailed breakdown
      if (response.data) {
        setCancellationResult(response.data);
        toast.success(`Itinerary cancelled successfully - Ref: ${response.data.cancellation_reference}`);
      } else {
        toast.success('Itinerary cancelled successfully');
        onOpenChange(false);
        resetCancellationState();
        if (onSuccess) onSuccess();
      }
    } catch (error: any) {
      console.error('Failed to cancel itinerary', error);
      const errorMessage = error.response?.data?.message || error.message || 'Failed to cancel itinerary';
      
      if (error.response?.status === 409) {
        toast.error('This itinerary is already cancelled');
      } else if (error.response?.status === 404) {
        toast.error('Itinerary not found');
      } else if (error.response?.status === 400) {
        toast.error('Missing required fields: reason is required');
      } else {
        toast.error(errorMessage);
      }
    } finally {
      setIsCancelling(false);
    }
  };

  return (
    <>
      {/* Cancellation Dialog */}
      <Dialog open={open && !cancellationResult} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[500px] flex flex-col max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="text-[#4a4260]">Confirm Itinerary Cancellation</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-4 overflow-y-auto flex-1 min-h-0 pr-1">
            {/* Itinerary Plan ID - Read Only */}
            <div>
              <Label className="text-sm font-medium text-[#4a4260] mb-1 block">
                Itinerary Plan ID
              </Label>
              <input
                type="text"
                value={itineraryPlanId || 'N/A'}
                readOnly
                className="w-full px-3 py-2 border border-[#e5d9f2] rounded-lg bg-gray-50 text-gray-600 cursor-not-allowed"
              />
            </div>

            {/* Cancellation Options */}
            <div className="space-y-3 border-t pt-4">
              <Label className="text-sm font-medium text-[#4a4260]">Cancellation Options</Label>
              
              {/* Select All */}
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="selectAll"
                  checked={cancellationOptions.selectAll}
                  onChange={(e) => {
                    const checked = e.target.checked;
                    setCancellationOptions({
                      selectAll: checked,
                      modifyHotspot: checked,
                      modifyHotel: checked,
                      modifyVehicle: checked,
                      modifyGuide: checked,
                      modifyActivity: checked,
                    });
                  }}
                  className="accent-[#d546ab] cursor-pointer w-4 h-4"
                />
                <Label htmlFor="selectAll" className="text-sm text-gray-700 cursor-pointer">
                  Select All
                </Label>
              </div>
              <div className="text-xs text-gray-500 mt-2">Select components to cancel:</div>

              {/* Modify Hotspot */}
              <div className="flex items-center space-x-2 ml-4">
                <input
                  type="checkbox"
                  id="modifyHotspot"
                  checked={cancellationOptions.modifyHotspot}
                  onChange={(e) => {
                    setCancellationOptions({
                      ...cancellationOptions,
                      modifyHotspot: e.target.checked,
                      selectAll: false,
                    });
                  }}
                  className="accent-[#d546ab] cursor-pointer w-4 h-4"
                />
                <Label htmlFor="modifyHotspot" className="text-sm text-gray-700 cursor-pointer">
                  Modify Hotspot
                </Label>
              </div>

              {/* Modify Hotel */}
              <div className="flex items-center space-x-2 ml-4">
                <input
                  type="checkbox"
                  id="modifyHotel"
                  checked={cancellationOptions.modifyHotel}
                  onChange={(e) => {
                    setCancellationOptions({
                      ...cancellationOptions,
                      modifyHotel: e.target.checked,
                      selectAll: false,
                    });
                  }}
                  className="accent-[#d546ab] cursor-pointer w-4 h-4"
                />
                <Label htmlFor="modifyHotel" className="text-sm text-gray-700 cursor-pointer">
                  Modify Hotel
                </Label>
              </div>

              {/* Modify Vehicle */}
              <div className="flex items-center space-x-2 ml-4">
                <input
                  type="checkbox"
                  id="modifyVehicle"
                  checked={cancellationOptions.modifyVehicle}
                  onChange={(e) => {
                    setCancellationOptions({
                      ...cancellationOptions,
                      modifyVehicle: e.target.checked,
                      selectAll: false,
                    });
                  }}
                  className="accent-[#d546ab] cursor-pointer w-4 h-4"
                />
                <Label htmlFor="modifyVehicle" className="text-sm text-gray-700 cursor-pointer">
                  Modify Vehicle
                </Label>
              </div>

              {/* Modify Guide */}
              <div className="flex items-center space-x-2 ml-4">
                <input
                  type="checkbox"
                  id="modifyGuide"
                  checked={cancellationOptions.modifyGuide}
                  onChange={(e) => {
                    setCancellationOptions({
                      ...cancellationOptions,
                      modifyGuide: e.target.checked,
                      selectAll: false,
                    });
                  }}
                  className="accent-[#d546ab] cursor-pointer w-4 h-4"
                />
                <Label htmlFor="modifyGuide" className="text-sm text-gray-700 cursor-pointer">
                  Modify Guide
                </Label>
              </div>

              {/* Modify Activity */}
              <div className="flex items-center space-x-2 ml-4">
                <input
                  type="checkbox"
                  id="modifyActivity"
                  checked={cancellationOptions.modifyActivity}
                  onChange={(e) => {
                    setCancellationOptions({
                      ...cancellationOptions,
                      modifyActivity: e.target.checked,
                      selectAll: false,
                    });
                  }}
                  className="accent-[#d546ab] cursor-pointer w-4 h-4"
                />
                <Label htmlFor="modifyActivity" className="text-sm text-gray-700 cursor-pointer">
                  Modify Activity
                </Label>
              </div>
            </div>

            {/* Reason for Cancellation */}
            <div>
              <Label htmlFor="reason" className="text-sm font-medium text-[#4a4260] mb-1 block">
                Reason for Cancellation
              </Label>
              <textarea
                id="reason"
                className="w-full px-3 py-2 border border-[#e5d9f2] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#d546ab]"
                rows={3}
                placeholder="Enter the reason for cancellation..."
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
              />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => {
                onOpenChange(false);
                resetCancellationState();
              }}
              disabled={isCancelling}
            >
              Cancel
            </Button>
            <Button
              className="bg-[#d546ab] hover:bg-[#c03d9f] text-white"
              onClick={handleCancelItinerary}
              disabled={isCancelling || !cancelReason.trim() || !itineraryPlanId}
            >
              {isCancelling ? 'Confirming...' : 'Confirm'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Cancellation Success Dialog */}
      {cancellationResult && (
        <Dialog open={!!cancellationResult} onOpenChange={(open) => {
          if (!open) {
            setCancellationResult(null);
            onOpenChange(false);
            resetCancellationState();
            if (onSuccess) onSuccess();
          }
        }}>
          <DialogContent className="sm:max-w-[500px] flex flex-col max-h-[90vh]">
            <DialogHeader>
              <DialogTitle className="text-green-600 text-lg">✓ Cancellation Successful</DialogTitle>
            </DialogHeader>
            
            <div className="space-y-4 py-4 overflow-y-auto flex-1 min-h-0 pr-1">
              {/* Cancellation Reference */}
              <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                <div className="text-xs text-green-600 font-semibold">Cancellation Reference</div>
                <div className="text-2xl font-bold text-green-700 mt-1">{cancellationResult.cancellation_reference}</div>
              </div>

              {/* Refund Amount */}
              {cancellationResult.refund_amount > 0 && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <div className="text-xs text-blue-600 font-semibold">Refund Amount</div>
                  <div className="text-2xl font-bold text-blue-700 mt-1">₹{cancellationResult.refund_amount.toLocaleString('en-IN')}</div>
                </div>
              )}

              {/* Cancellation Details Breakdown */}
              {cancellationResult.cancellation_details && (
                <div className="border rounded-lg p-4 space-y-2">
                  <div className="text-sm font-semibold text-gray-700 mb-3">Cancellation Breakdown</div>
                  {cancellationResult.cancellation_details.hotspots_cancelled > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Hotspots Cancelled:</span>
                      <span className="font-semibold text-gray-800">{cancellationResult.cancellation_details.hotspots_cancelled}</span>
                    </div>
                  )}
                  {cancellationResult.cancellation_details.hotels_cancelled > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Hotels Cancelled:</span>
                      <span className="font-semibold text-gray-800">{cancellationResult.cancellation_details.hotels_cancelled}</span>
                    </div>
                  )}
                  {cancellationResult.cancellation_details.vehicles_cancelled > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Vehicles Cancelled:</span>
                      <span className="font-semibold text-gray-800">{cancellationResult.cancellation_details.vehicles_cancelled}</span>
                    </div>
                  )}
                  {cancellationResult.cancellation_details.guides_cancelled > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Guides Cancelled:</span>
                      <span className="font-semibold text-gray-800">{cancellationResult.cancellation_details.guides_cancelled}</span>
                    </div>
                  )}
                  {cancellationResult.cancellation_details.activities_cancelled > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Activities Cancelled:</span>
                      <span className="font-semibold text-gray-800">{cancellationResult.cancellation_details.activities_cancelled}</span>
                    </div>
                  )}
                </div>
              )}

              {/* Cancelled On */}
              <div className="text-xs text-gray-500 text-center pt-2">
                Cancelled on: {new Date(cancellationResult.cancelled_on).toLocaleString('en-IN')}
              </div>
            </div>

            <DialogFooter>
              <Button
                className="bg-[#d546ab] hover:bg-[#c03d9f] text-white w-full"
                onClick={() => {
                  setCancellationResult(null);
                  onOpenChange(false);
                  resetCancellationState();
                  if (onSuccess) onSuccess();
                }}
              >
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
};
