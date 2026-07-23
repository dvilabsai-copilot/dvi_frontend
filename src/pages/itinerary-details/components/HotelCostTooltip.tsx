import React, { useState } from "react";
import { FloatingHoverTooltip, getFloatingTooltipPosition } from "@/components/FloatingHoverTooltip";
import type { CostBreakdown } from "../itinerary-details.types";

type HotelCostTooltipProps = {
  costBreakdown?: CostBreakdown | null;
  canViewCostBreakdown: boolean;
  hotelCost: number;
  children: React.ReactNode;
};

const formatMoney = (value: unknown) => `₹ ${Number(value ?? 0).toLocaleString("en-IN", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})}`;

const readMoney = (value: unknown) => {
  const amount = Number(value ?? 0);
  return Number.isFinite(amount) ? amount : 0;
};

/** Shows only the backend-returned hotel pricing chain used by the summary. */
export const HotelCostTooltip: React.FC<HotelCostTooltipProps> = ({
  costBreakdown,
  canViewCostBreakdown,
  hotelCost,
  children,
}) => {
  const [position, setPosition] = useState<{ left: number; top: number } | null>(null);

  if (!canViewCostBreakdown || !costBreakdown) return <>{children}</>;

  const rows = costBreakdown.hotelRateBreakdown || [];
  const selectedBase = rows.reduce((sum, row) => sum + readMoney(row.baseAmount), 0);
  const selectedRoomGst = rows.reduce((sum, row) => sum + readMoney(row.roomGstAmount), 0);
  const selectedMargin = rows.reduce((sum, row) => sum + readMoney(row.marginAmount), 0);
  const selectedMarginGst = rows.reduce((sum, row) => sum + readMoney(row.marginGstAmount), 0);
  const selectedTotal = rows.reduce((sum, row) => sum + readMoney(row.totalAmount), 0);
  const base = selectedBase || readMoney(costBreakdown.hotelRoomBaseCost);
  const roomGst = selectedRoomGst || readMoney(costBreakdown.hotelRoomGstCost);
  const margin = selectedMargin || readMoney(costBreakdown.hotelMarginCost);
  const marginGst = selectedMarginGst || readMoney(costBreakdown.hotelMarginGstCost);
  const total = selectedTotal || readMoney(costBreakdown.selectedHotelRateTotal || hotelCost);

  const showTooltip = (event: React.MouseEvent<HTMLElement>) => {
    setPosition(getFloatingTooltipPosition(event.clientX, event.clientY, 400, 320));
  };
  const moveTooltip = (event: React.MouseEvent<HTMLElement>) => {
    setPosition((current) => current
      ? getFloatingTooltipPosition(event.clientX, event.clientY, 400, 320)
      : current);
  };
  const showTooltipFromFocus = (event: React.FocusEvent<HTMLElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    setPosition(getFloatingTooltipPosition(rect.right, rect.top, 400, 320));
  };

  return (
    <div
      className="cursor-help"
      tabIndex={0}
      onMouseEnter={showTooltip}
      onMouseMove={moveTooltip}
      onMouseLeave={() => setPosition(null)}
      onFocus={showTooltipFromFocus}
      onBlur={() => setPosition(null)}
      aria-label="Show backend hotel cost breakdown"
    >
      {children}
      {position && (
        <FloatingHoverTooltip left={position.left} top={position.top} className="w-[400px] max-w-[calc(100vw-24px)]">
          <div className="mb-2 flex justify-between gap-4 border-b border-gray-200 pb-2">
            <span className="font-semibold text-gray-700">Hotel Cost Breakdown</span>
            <span className="font-semibold text-[#d546ab]">{formatMoney(hotelCost)}</span>
          </div>

          <div className="space-y-2 text-xs">
            <div className="flex justify-between gap-4 font-medium text-gray-700">
              <span>1. Selected hotel rate (room/meal)</span>
              <span className="shrink-0 text-right">{formatMoney(base)}</span>
            </div>
            {roomGst > 0 && (
              <div className="flex justify-between gap-4 text-gray-600">
                <span>+ Hotel room GST</span>
                <span className="shrink-0 text-right">{formatMoney(roomGst)}</span>
              </div>
            )}
            {margin > 0 && (
              <div className="flex justify-between gap-4 text-gray-600">
                <span>+ Hotel margin</span>
                <span className="shrink-0 text-right">{formatMoney(margin)}</span>
              </div>
            )}
            {marginGst > 0 && (
              <div className="flex justify-between gap-4 text-gray-600">
                <span>+ GST on hotel margin</span>
                <span className="shrink-0 text-right">{formatMoney(marginGst)}</span>
              </div>
            )}
            <div className="flex justify-between gap-4 border-t border-gray-200 pt-2 font-semibold text-[#4a4260]">
              <span>2. Selected hotel total</span>
              <span>{formatMoney(total || hotelCost)}</span>
            </div>
            <div className="flex justify-between gap-4 border-t border-gray-200 pt-2 font-semibold text-[#4a4260]">
              <span>Summary Total Hotel Cost</span>
              <span>{formatMoney(hotelCost)}</span>
            </div>
            {rows.length > 0 && (
              <div className="border-t border-gray-100 pt-2 text-[11px] leading-4 text-gray-500">
                Backend-selected rates: {rows.map((row) => `${row.hotelName} (${row.date || `route ${row.routeId}`})`).join(", ")}.
              </div>
            )}
            <p className="border-t border-gray-100 pt-2 text-[11px] leading-4 text-gray-500">
              The summary and quotation use this same backend pricing response. No second room price is added in the browser.
            </p>
          </div>
        </FloatingHoverTooltip>
      )}
    </div>
  );
};
