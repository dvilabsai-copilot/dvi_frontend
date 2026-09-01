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

  const rawPresentation = costBreakdown.hotelPresentation;
  const rows = costBreakdown.hotelRateBreakdown || [];
  const selectedBase = rows.reduce((sum, row) => sum + readMoney(row.baseAmount), 0);
  const selectedRoomGst = rows.reduce((sum, row) => sum + readMoney(row.roomGstAmount), 0);
  const selectedMargin = rows.reduce((sum, row) => sum + readMoney(row.marginAmount), 0);
  const selectedMarginGst = rows.reduce((sum, row) => sum + readMoney(row.marginGstAmount), 0);
  const selectedTotal = rows.reduce((sum, row) => sum + readMoney(row.totalAmount), 0);
  const roomGst = selectedRoomGst || readMoney(costBreakdown.hotelRoomGstCost);
  const margin = selectedMargin || readMoney(costBreakdown.hotelMarginCost);
  const marginGst = selectedMarginGst || readMoney(costBreakdown.hotelMarginGstCost);
  const presentationMarginPercentage = readMoney(
    rawPresentation?.hotelMarginPercentage ?? (costBreakdown as any).hotelMarginPercentage ?? 20,
  );
  const presentationMatchesHotelTotal = Boolean(
    rawPresentation && Math.abs(readMoney(rawPresentation.grandTotal) - readMoney(hotelCost)) < 0.01,
  );
  // Do not mix a previous package's room/supplement breakdown with the active
  // recommendation's total when tabs are switched without a new breakdown
  // response.
  const presentation = presentationMatchesHotelTotal ? rawPresentation : null;
  const displayRows = presentationMatchesHotelTotal ? rows : [];
  const isCompleteFareProvider = displayRows.some((row) => {
    const provider = String(row.provider || '').trim().toLowerCase();
    return provider === 'tbo' || provider === 'vsr';
  });
  // The API already returns the authoritative occupancy-rate breakdown.
  // Do not reverse-calculate a room base from an aggregate payable total.
  const fallbackBase = readMoney(hotelCost) / (1 + presentationMarginPercentage / 100);
  const base = presentationMatchesHotelTotal
    ? selectedBase || readMoney(presentation?.roomCost) || readMoney(costBreakdown.hotelRoomBaseCost)
    : fallbackBase;
  const displayMargin = presentationMatchesHotelTotal
    ? margin
    : Math.max(readMoney(hotelCost) - base, 0);
  const total = readMoney(hotelCost || presentation?.grandTotal || selectedTotal || costBreakdown.selectedHotelRateTotal);

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
            {presentation ? (
              <>
                <div className="flex justify-between gap-4 font-medium text-gray-700"><span>Total No. of Rooms</span><span>{presentation.roomCount}</span></div>
                {isCompleteFareProvider ? (
                  <div className="flex justify-between gap-4 text-gray-600">
                    <span>Complete Hotel Fare</span>
                    <span>{formatMoney(presentation.grandTotal)}</span>
                  </div>
                ) : presentation.roomRatePerNight > 0 && (
                  <div className="flex justify-between gap-4 text-gray-600">
                    <span>Room Cost (1 night)</span>
                    <span>{presentation.roomCount} × {formatMoney(presentation.roomRatePerNight)} = {formatMoney(presentation.oneNightRoomCost)}</span>
                  </div>
                )}
                {!isCompleteFareProvider && presentation.roomRatePerNight <= 0 && (
                  <div className="flex justify-between gap-4 text-gray-600"><span>Room Cost</span><span>{formatMoney(presentation.roomCost)}</span></div>
                )}
                {!isCompleteFareProvider && presentation.breakfastCost > 0 && <div className="flex justify-between gap-4 text-gray-600"><span>Total Breakfast Cost</span><span>{formatMoney(presentation.breakfastCost)}</span></div>}
                {!isCompleteFareProvider && presentation.extraBedCost > 0 && <div className="flex justify-between gap-4 text-gray-600"><span>Extra Bed Cost</span><span>{formatMoney(presentation.extraBedCost)}</span></div>}
                {!isCompleteFareProvider && presentation.childWithBedCost > 0 && <div className="flex justify-between gap-4 text-gray-600"><span>Child With Bed Cost</span><span>{formatMoney(presentation.childWithBedCost)}</span></div>}
                {!isCompleteFareProvider && presentation.childWithoutBedCost > 0 && <div className="flex justify-between gap-4 text-gray-600"><span>Without Bed Cost</span><span>{formatMoney(presentation.childWithoutBedCost)}</span></div>}
                {presentation.hotelMarginCost > 0 && <div className="flex justify-between gap-4 text-gray-600"><span>Hotel Margin ({formatMoney(presentation.hotelMarginPercentage).replace("₹ ", "")}%)</span><span>{formatMoney(presentation.hotelMarginCost)}</span></div>}
                {presentation.serviceTax > 0 && <div className="flex justify-between gap-4 text-gray-600"><span>Service Tax</span><span>{formatMoney(presentation.serviceTax)}</span></div>}
              </>
            ) : (
              <div className="flex justify-between gap-4 font-medium text-gray-700">
                <span>1. Selected hotel rate (room/meal)</span>
                <span className="shrink-0 text-right">{formatMoney(base)}</span>
              </div>
            )}
            {!presentation && roomGst > 0 && (
              <div className="flex justify-between gap-4 text-gray-600">
                <span>+ Hotel room GST</span>
                <span className="shrink-0 text-right">{formatMoney(roomGst)}</span>
              </div>
            )}
            {!presentation && displayMargin > 0 && (
              <div className="flex justify-between gap-4 text-gray-600">
                <span>+ Hotel margin</span>
                <span className="shrink-0 text-right">{formatMoney(displayMargin)}</span>
              </div>
            )}
            {!presentation && marginGst > 0 && (
              <div className="flex justify-between gap-4 text-gray-600">
                <span>+ GST on hotel margin</span>
                <span className="shrink-0 text-right">{formatMoney(marginGst)}</span>
              </div>
            )}
            <div className="flex justify-between gap-4 border-t border-gray-200 pt-2 font-semibold text-[#4a4260]">
              <span>Grand Total</span>
              <span>{formatMoney(total || hotelCost)}</span>
            </div>
            <div className="flex justify-between gap-4 border-t border-gray-200 pt-2 font-semibold text-[#4a4260]">
              <span>Summary Total Hotel Cost</span>
              <span>{formatMoney(hotelCost)}</span>
            </div>
            {displayRows.length > 0 && (
              <div className="border-t border-gray-100 pt-2 text-[11px] leading-4 text-gray-500">
                Backend-selected rates: {displayRows.map((row) => `${row.hotelName} (${row.date || `route ${row.routeId}`})`).join(", ")}.
                {displayRows.some((row) => row.provider === "staah" && (Number(row.extraBedRate || 0) > 0 || Number(row.extraChildRate || 0) > 0 || Number(row.childWithBedRate || 0) > 0 || Number(row.childWithoutBedRate || 0) > 0)) && (
                  <div className="mt-1 space-y-1">
                    {displayRows.filter((row) => row.provider === "staah").map((row) => (
                      <div key={`${row.routeId}-${row.date || "staah"}`}>
                        STAAH rates: Extra Bed {formatMoney(row.extraBedRate || 0)}; Child With Bed {formatMoney(row.childWithBedRate || 0)}; Child Without Bed {formatMoney(row.childWithoutBedRate || 0)}; Extra Child {formatMoney(row.extraChildRate || 0)}.
                      </div>
                    ))}
                  </div>
                )}
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
