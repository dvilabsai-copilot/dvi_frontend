import React from "react";
import { AlertTriangle, Clock, MapPin, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";

type HotspotPreviewSegmentSummaryProps = {
  segmentType: string;
  isConflict: boolean;
  isUserSelected: boolean;
  selectedId: number;
  effectiveTimeRange: string;
  displayText: string;
  isZeroDurationHotel: boolean;
  actualHotelName: string;
  isTravelSegment: boolean;
  travelDistanceLabel: string;
  travelDurationLabel: string;
  isMatrixSplitTravel: boolean;
  fromName?: string;
  toName?: string;
  matrixDistanceKm?: number;
  normalizedMatrixDurationMin: number | null;
  onRemove: (hotspotId: number) => void;
};

/** Renders the common header, labels, travel metrics, and remove action for a preview row. */
export const HotspotPreviewSegmentSummary: React.FC<HotspotPreviewSegmentSummaryProps> = ({
  segmentType,
  isConflict,
  isUserSelected,
  selectedId,
  effectiveTimeRange,
  displayText,
  isZeroDurationHotel,
  actualHotelName,
  isTravelSegment,
  travelDistanceLabel,
  travelDurationLabel,
  isMatrixSplitTravel,
  fromName,
  toName,
  matrixDistanceKm,
  normalizedMatrixDurationMin,
  onRemove,
}) => (
  <>
    <div className="mb-1 flex items-start justify-between gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <span className={`rounded px-1.5 py-0.5 text-[10px] font-bold uppercase ${segmentType === "travel" ? "bg-blue-100 text-blue-700" : segmentType === "attraction" ? "bg-green-100 text-green-700" : "bg-gray-200 text-gray-700"}`}>{segmentType || "item"}</span>
        <span className="text-xs font-bold text-[#4a4260]">{effectiveTimeRange}</span>
      </div>
      <div className="flex items-center gap-2">
        {isConflict ? <span className="flex items-center gap-1 rounded bg-red-100 px-2 py-0.5 text-[10px] font-bold uppercase text-red-600"><AlertTriangle className="h-3 w-3" />Conflict</span> : isUserSelected ? <span className="flex items-center gap-1 rounded bg-green-100 px-2 py-0.5 text-[10px] font-bold uppercase text-green-600"><Plus className="h-3 w-3" />New</span> : null}
        {isUserSelected && selectedId > 0 && <Button size="sm" variant="ghost" className="h-6 px-2 text-red-600 hover:bg-red-50 hover:text-red-700" onClick={() => onRemove(selectedId)}><Trash2 className="mr-1 h-3 w-3" />Remove</Button>}
      </div>
    </div>
    <p className={`text-sm font-bold ${isUserSelected ? "text-green-800" : "text-[#4a4260]"}`}>{isZeroDurationHotel ? <>Check-in at {actualHotelName} <span className="text-purple-600">{effectiveTimeRange?.split(" - ")[0]}</span></> : displayText}</p>
    {isTravelSegment && <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[#6c6c6c]"><span className="flex items-center gap-1"><Clock className="h-3 w-3" />{effectiveTimeRange}</span>{travelDistanceLabel && <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{travelDistanceLabel}</span>}{travelDurationLabel && <span className="flex items-center gap-1">⏱ {travelDurationLabel}</span>}</div>}
    {isMatrixSplitTravel && <div className="mt-2 space-y-0.5 text-xs text-gray-600">{(fromName || toName) && <p>Route leg: {fromName || "A"} → {toName || "B"}</p>}{matrixDistanceKm != null && <p>Distance: {Number(matrixDistanceKm).toFixed(1)} km</p>}{normalizedMatrixDurationMin != null && <p>Duration: {Math.max(1, Math.round(Number(normalizedMatrixDurationMin)))} min</p>}</div>}
  </>
);

export default HotspotPreviewSegmentSummary;
