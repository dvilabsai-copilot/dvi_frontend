import React from "react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

type CancellationResult = {
  slotCost?: number;
  cancellationCharge?: number;
  refundAmount?: number;
  cancellation_reference?: string;
  refund_amount?: number;
  cancellation_details?: {
    hotspots_cancelled?: number;
    hotels_cancelled?: number;
    vehicles_cancelled?: number;
    guides_cancelled?: number;
    activities_cancelled?: number;
  };
  cancelled_on?: string;
};

type ConfirmedItineraryCancellationResultsProps = {
  guideResult: CancellationResult | null;
  itineraryResult: CancellationResult | null;
  selectedGuideSlotLabel?: string;
  onCloseGuide: () => void;
  onCloseItinerary: () => void;
};

export const ConfirmedItineraryCancellationResults: React.FC<ConfirmedItineraryCancellationResultsProps> = ({
  guideResult,
  itineraryResult,
  selectedGuideSlotLabel,
  onCloseGuide,
  onCloseItinerary,
}) => (
  <>
    {guideResult && (
      <Dialog open={!!guideResult} onOpenChange={(open) => { if (!open) onCloseGuide(); }}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader><DialogTitle className="text-green-600 text-lg">Guide Slot Cancelled</DialogTitle></DialogHeader>
          <div className="space-y-4 py-4">
            <div className="rounded-lg border border-green-200 bg-green-50 p-3"><div className="text-xs font-semibold text-green-700">Cancelled Slot</div><div className="mt-1 text-base font-bold text-green-800">{selectedGuideSlotLabel || "Guide Slot"}</div></div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="rounded-lg border bg-gray-50 p-3"><div className="text-xs text-gray-500">Service Amount</div><div className="mt-1 font-semibold text-gray-800">₹{Number(guideResult.slotCost || 0).toLocaleString("en-IN")}</div></div>
              <div className="rounded-lg border bg-red-50 p-3"><div className="text-xs text-red-600">Cancellation Charge</div><div className="mt-1 font-semibold text-red-700">₹{Number(guideResult.cancellationCharge || 0).toLocaleString("en-IN")}</div></div>
              <div className="rounded-lg border bg-blue-50 p-3"><div className="text-xs text-blue-600">Refund Amount</div><div className="mt-1 font-semibold text-blue-700">₹{Number(guideResult.refundAmount || 0).toLocaleString("en-IN")}</div></div>
            </div>
          </div>
          <DialogFooter><Button className="bg-[#d546ab] hover:bg-[#c03d9f] text-white w-full" onClick={onCloseGuide}>Close</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    )}

    {itineraryResult && (
      <Dialog open={!!itineraryResult} onOpenChange={(open) => { if (!open) onCloseItinerary(); }}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader><DialogTitle className="text-green-600 text-lg">✓ Cancellation Successful</DialogTitle></DialogHeader>
          <div className="space-y-4 py-4">
            <div className="bg-green-50 border border-green-200 rounded-lg p-3"><div className="text-xs text-green-600 font-semibold">Cancellation Reference</div><div className="text-2xl font-bold text-green-700 mt-1">{itineraryResult.cancellation_reference}</div></div>
            {Number(itineraryResult.refund_amount || 0) > 0 && <div className="bg-blue-50 border border-blue-200 rounded-lg p-3"><div className="text-xs text-blue-600 font-semibold">Refund Amount</div><div className="text-2xl font-bold text-blue-700 mt-1">₹{Number(itineraryResult.refund_amount || 0).toLocaleString("en-IN")}</div></div>}
            {itineraryResult.cancellation_details && <div className="border rounded-lg p-4 space-y-2"><div className="text-sm font-semibold text-gray-700 mb-3">Cancellation Breakdown</div>
              {Number(itineraryResult.cancellation_details.hotspots_cancelled || 0) > 0 && <div className="flex justify-between text-sm"><span className="text-gray-600">Hotspots Cancelled:</span><span className="font-semibold text-gray-800">{itineraryResult.cancellation_details.hotspots_cancelled}</span></div>}
              {Number(itineraryResult.cancellation_details.hotels_cancelled || 0) > 0 && <div className="flex justify-between text-sm"><span className="text-gray-600">Hotels Cancelled:</span><span className="font-semibold text-gray-800">{itineraryResult.cancellation_details.hotels_cancelled}</span></div>}
              {Number(itineraryResult.cancellation_details.vehicles_cancelled || 0) > 0 && <div className="flex justify-between text-sm"><span className="text-gray-600">Vehicles Cancelled:</span><span className="font-semibold text-gray-800">{itineraryResult.cancellation_details.vehicles_cancelled}</span></div>}
              {Number(itineraryResult.cancellation_details.guides_cancelled || 0) > 0 && <div className="flex justify-between text-sm"><span className="text-gray-600">Guides Cancelled:</span><span className="font-semibold text-gray-800">{itineraryResult.cancellation_details.guides_cancelled}</span></div>}
              {Number(itineraryResult.cancellation_details.activities_cancelled || 0) > 0 && <div className="flex justify-between text-sm"><span className="text-gray-600">Activities Cancelled:</span><span className="font-semibold text-gray-800">{itineraryResult.cancellation_details.activities_cancelled}</span></div>}
            </div>}
            <div className="text-xs text-gray-500 text-center pt-2">Cancelled on: {itineraryResult.cancelled_on ? new Date(itineraryResult.cancelled_on).toLocaleString("en-IN") : "-"}</div>
          </div>
          <DialogFooter><Button className="bg-[#d546ab] hover:bg-[#c03d9f] text-white w-full" onClick={onCloseItinerary}>Close</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    )}
  </>
);
