import React from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export interface AllHotspotsPreviewDialogProps {
  open: boolean;
  loading: boolean;
  data: any;
  onOpenChange: (open: boolean) => void;
  formatTime: (value: string | Date | null | undefined) => string;
  formatDuration: (value: string | null | undefined) => string;
}

export const AllHotspotsPreviewDialog: React.FC<AllHotspotsPreviewDialogProps> = ({
  open,
  loading,
  data,
  onOpenChange,
  formatTime,
  formatDuration,
}) => (
  <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle>Preview Activity for All Hotspots</DialogTitle>
        <DialogDescription>
          {data?.activity?.title} - Duration: {formatDuration(data?.activity?.duration)}
        </DialogDescription>
      </DialogHeader>

      <div className="py-4 space-y-4 max-h-[70vh] overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-[#d546ab]" />
          </div>
        ) : data?.hotspots && data.hotspots.length > 0 ? (
          data.hotspots.map((hotspotPreview: any, idx: number) => (
            <Card
              key={hotspotPreview.routeHotspotId}
              className={`border-2 ${hotspotPreview.isAlreadyAdded
                ? 'border-gray-300 bg-gray-50'
                : hotspotPreview.hasConflicts
                  ? 'border-red-500 bg-red-50'
                  : 'border-green-500 bg-green-50'
                }`}
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h4 className="font-semibold text-[#4a4260]">
                        {hotspotPreview.hotspotName || `Hotspot #${idx + 1}`}
                      </h4>
                      <span
                        className={`text-xs font-bold px-2 py-1 rounded-full ${hotspotPreview.isAlreadyAdded
                          ? 'bg-gray-300 text-gray-700'
                          : hotspotPreview.hasConflicts
                            ? 'bg-red-300 text-red-700'
                            : 'bg-green-300 text-green-700'
                          }`}
                      >
                        {hotspotPreview.isAlreadyAdded
                          ? 'Already Added'
                          : hotspotPreview.hasConflicts
                            ? 'Conflict'
                            : 'Fits'}
                      </span>
                    </div>

                    <p className="text-sm text-[#6c6c6c] mb-2">
                      Hotspot Time Window: {formatTime(hotspotPreview.hotspotTiming.startTime)} - {formatTime(hotspotPreview.hotspotTiming.endTime)}
                    </p>

                    {!hotspotPreview.isAlreadyAdded && hotspotPreview.proposedTiming && (
                      <div className="bg-white rounded-lg border border-gray-200 p-3 space-y-1 text-sm">
                        <div className="flex justify-between">
                          <span className="text-[#6c6c6c]">Proposed Insertion:</span>
                          <span className="font-medium text-[#4a4260]">
                            {formatTime(hotspotPreview.proposedTiming.startTime)} - {formatTime(hotspotPreview.proposedTiming.endTime)}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-[#6c6c6c]">Position:</span>
                          <span className="font-medium text-[#4a4260]">#{hotspotPreview.proposedTiming.order}</span>
                        </div>
                        {hotspotPreview.proposedTiming.willExtendHotspot && (
                          <div className="text-amber-700 font-medium">⚠️ Will extend hotspot end time</div>
                        )}
                      </div>
                    )}

                    {hotspotPreview.hasConflicts && hotspotPreview.conflicts?.length > 0 && (
                      <div className="bg-red-100 rounded-lg border border-red-200 p-3 mt-2 text-sm">
                        <div className="font-semibold text-red-700 mb-1">
                          {hotspotPreview.conflicts.length} Conflict{hotspotPreview.conflicts.length > 1 ? 's' : ''}:
                        </div>
                        {hotspotPreview.conflicts.map((conflict: any, conflictIndex: number) => (
                          <div key={conflictIndex} className="text-red-700 ml-3 text-xs">• {conflict.reason}</div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          <p className="text-sm text-[#6c6c6c] text-center py-8">No hotspots found for this route</p>
        )}
      </div>

      <DialogFooter>
        <Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
);

