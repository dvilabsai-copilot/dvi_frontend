import React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

export interface VehicleCardProps {
  dayLabel?: string;
  fromLabel?: string;
  toLabel?: string;
  packageLabel?: string;
  col1Distance?: string;
  col1Duration?: string;
  col2Distance?: string;
  col2Duration?: string;
  col3Distance?: string;
  col3Duration?: string;
  imageUrl?: string | null;
  onPrevious?: () => void;
  onNext?: () => void;
  currentIndex?: number;
  totalCount?: number;
}

export const VehicleCard: React.FC<VehicleCardProps> = ({
  dayLabel,
  fromLabel,
  toLabel,
  packageLabel,
  col1Distance,
  col1Duration,
  col2Distance,
  col2Duration,
  col3Distance,
  col3Duration,
  imageUrl,
  onPrevious,
  onNext,
  currentIndex = 0,
  totalCount = 1,
}) => {
  return (
    <div className="bg-white border border-[#e5d9f2] rounded-lg overflow-hidden shadow-md">
 {/* Image Section */}
      <div className="relative bg-gradient-to-br from-purple-100 to-pink-100 h-48 flex items-center justify-center">
        {imageUrl && imageUrl.trim() !== '' ? (
          <img
            src={imageUrl}
            alt="Vehicle"
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="text-center">
            <div className="text-6xl mb-2">🚗</div>
            <p className="text-sm text-[#6c6c6c]">No Photos Available</p>
          </div>
        )}

 {/* Navigation Arrows */}
        {totalCount > 1 && (
          <>
            <button
              onClick={onPrevious}
              className="absolute left-2 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white rounded-full p-1 shadow-md"
              aria-label="Previous"
            >
              <ChevronLeft className="h-5 w-5 text-[#4a4260]" />
            </button>
            <button
              onClick={onNext}
              className="absolute right-2 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white rounded-full p-1 shadow-md"
              aria-label="Next"
            >
              <ChevronRight className="h-5 w-5 text-[#4a4260]" />
            </button>
          </>
        )}
      </div>

 {/* Info Section */}
      <div className="p-4 space-y-3">
 {/* Day Label */}
        {dayLabel && (
          <div className="text-sm font-semibold text-[#4a4260] bg-[#f8f5fc] px-3 py-1 rounded-full inline-block">
            {dayLabel}
          </div>
        )}

 {/* Route Information */}
        <div className="space-y-1">
          {fromLabel && toLabel && (
            <div className="text-sm text-[#6c6c6c]">
              <span className="font-medium text-[#4a4260]">{fromLabel}</span>
              <span className="mx-2">→</span>
              <span className="font-medium text-[#4a4260]">{toLabel}</span>
            </div>
          )}
          {packageLabel && (
            <div className="text-xs text-[#6c6c6c] italic">{packageLabel}</div>
          )}
        </div>

 {/* Three KMS Columns */}
        <div className="grid grid-cols-3 gap-2 bg-[#f8f5fc] p-3 rounded-lg border border-[#e5d9f2]">
 {/* Column 1: Travel Distance */}
          <div className="text-center">
            <div className="text-sm font-bold text-[#d546ab] bg-white px-2 py-1 rounded border border-[#e5d9f2]">
              {col1Distance || "0.00 KM"}
            </div>
            <div className="text-xs text-[#6c6c6c] mt-1 font-medium">
              {col1Duration || "0 Min"}
            </div>
            <div className="text-xs text-[#6c6c6c] font-semibold mt-0.5">Travel</div>
          </div>

 {/* Column 2: Sightseeing Distance */}
          <div className="text-center">
            <div className="text-sm font-bold text-[#4ba3c3] bg-white px-2 py-1 rounded border border-[#e5d9f2]">
              {col2Distance || "0.00 KM"}
            </div>
            <div className="text-xs text-[#6c6c6c] mt-1 font-medium">
              {col2Duration || "0 Min"}
            </div>
            <div className="text-xs text-[#6c6c6c] font-semibold mt-0.5">Sightseeing</div>
          </div>

 {/* Column 3: Total Distance */}
          <div className="text-center">
            <div className="text-sm font-bold text-[#17a2b8] bg-white px-2 py-1 rounded border border-[#e5d9f2]">
              {col3Distance || "0.00 KM"}
            </div>
            <div className="text-xs text-[#6c6c6c] mt-1 font-medium">
              {col3Duration || "0 Min"}
            </div>
            <div className="text-xs text-[#6c6c6c] font-semibold mt-0.5">Total</div>
          </div>
        </div>
      </div>
    </div>
  );
};
