import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import type { ItineraryDetailsResponse } from "../itinerary-details.types";

type FinancialTotals = {
  hotelAmount: number;
  totalAmount: number;
  netPayable: number;
  totalRoundOff: number;
  agentMargin: number;
};

type HotelCostMeta = {
  hotelName: string;
  noOfRooms?: number;
  totalAmount?: number;
};

type ItineraryOverallCostProps = {
  itinerary: Pick<ItineraryDetailsResponse, "costBreakdown" | "extraBed" | "childWithBed" | "childWithoutBed">;
  canViewCostBreakdown: boolean;
  shouldShowHotels: boolean;
  shouldShowVehicles: boolean;
  financialTotals: FinancialTotals;
  roomBreakdownRoomNights: number;
  selectedHotelMetaByRoute: Map<number, HotelCostMeta>;
  clipboardRatesVisible: boolean;
  isRoomCostPopoverOpen: boolean;
  setIsRoomCostPopoverOpen: (open: boolean) => void;
  computedVehicleAmount: number;
  computedVehicleQty: number;
  effectiveEntryTicketAmount: number;
  entryTicketBreakdownByLocation: Array<{ dayNumber: number; locationName: string; amount: number }>;
};

/** Renders the customer-facing cost breakdown and keeps its hover details local. */
export const ItineraryOverallCost: React.FC<ItineraryOverallCostProps> = ({
  itinerary,
  canViewCostBreakdown,
  shouldShowHotels,
  shouldShowVehicles,
  financialTotals,
  roomBreakdownRoomNights,
  selectedHotelMetaByRoute,
  clipboardRatesVisible,
  isRoomCostPopoverOpen,
  setIsRoomCostPopoverOpen,
  computedVehicleAmount,
  computedVehicleQty,
  effectiveEntryTicketAmount,
  entryTicketBreakdownByLocation,
}) => {
  itinerary = {
    ...itinerary,
    costBreakdown: itinerary.costBreakdown ?? ({} as NonNullable<typeof itinerary.costBreakdown>),
  };

  return (
    <Card className="border-none bg-gradient-to-br from-[#faf5ff] to-white shadow-none">
    <CardContent className="pt-2">
      <h2 className="mb-4 text-lg font-semibold text-[#4a4260]">OVERALL COST</h2>
      <div className="space-y-2 text-sm">
        {canViewCostBreakdown && (
          <>
            {shouldShowHotels && (() => {
              const roomTotal = Number(financialTotals.hotelAmount || 0);
              const hotelRoomNights = Math.max(Number(roomBreakdownRoomNights || 0), 1);
              const roomNightsLabel = `${hotelRoomNights} room-night${hotelRoomNights > 1 ? "s" : ""}`;

              return (
                <Popover
                  open={isRoomCostPopoverOpen && selectedHotelMetaByRoute.size > 0 && clipboardRatesVisible}
                  onOpenChange={(open) => {
                    if (!open) setIsRoomCostPopoverOpen(false);
                  }}
                >
                  <PopoverTrigger asChild>
                    <div
                      className="flex cursor-pointer justify-between"
                      onClick={(event) => event.preventDefault()}
                      onMouseEnter={() => selectedHotelMetaByRoute.size > 0 && clipboardRatesVisible && setIsRoomCostPopoverOpen(true)}
                      onMouseLeave={() => setIsRoomCostPopoverOpen(false)}
                    >
                      <div className="flex items-center">
                        <span className="text-[#6c6c6c]">Total Hotel Cost For ({roomNightsLabel})</span>
                        {selectedHotelMetaByRoute.size > 0 && clipboardRatesVisible && (
                          <span className="ml-1 inline-flex h-4 w-4 items-center justify-center text-[11px] leading-none">▶️</span>
                        )}
                      </div>
                      <span className="text-[#4a4260]">₹ {roomTotal.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    </div>
                  </PopoverTrigger>
                  <PopoverContent
                    className="w-80 rounded-lg border border-[#ddd5e8] bg-white p-4 shadow-lg"
                    align="end"
                    onMouseEnter={() => setIsRoomCostPopoverOpen(true)}
                    onMouseLeave={() => setIsRoomCostPopoverOpen(false)}
                  >
                    <div className="space-y-2 text-sm">
                      {Array.from(selectedHotelMetaByRoute.entries()).map(([routeId, meta]) => (
                        <div key={routeId} className="flex justify-between text-[#6c6c6c]">
                          <span>{meta.hotelName}{Number(meta.noOfRooms || 1) > 1 ? ` * ${Number(meta.noOfRooms)} rooms` : ""}</span>
                          <span className="font-medium text-[#4a4260]">₹ {Number(meta.totalAmount || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                        </div>
                      ))}
                      <div className="mt-2 flex justify-between border-t border-[#ddd5e8] pt-2 font-semibold text-[#4a4260]">
                        <span>Total Hotel Cost</span>
                        <span>₹ {roomTotal.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                      </div>
                    </div>
                  </PopoverContent>
                </Popover>
              );
            })()}
            {itinerary.costBreakdown.totalAmenitiesCost !== undefined && itinerary.costBreakdown.totalAmenitiesCost > 0 && (
              <div className="flex justify-between"><span className="text-[#6c6c6c]">Total Amenities Cost</span><span className="text-[#4a4260]">₹ {itinerary.costBreakdown.totalAmenitiesCost.toFixed(2)}</span></div>
            )}
            {(Number(itinerary.extraBed || 0) > 0 || Number(itinerary.costBreakdown.extraBedCost || 0) > 0) && (
              <div className="flex justify-between"><span className="text-[#6c6c6c]">Extra Bed Cost ({itinerary.extraBed || 0})</span><span className="text-[#4a4260]">₹ {Number(itinerary.costBreakdown.extraBedCost || 0).toFixed(2)}</span></div>
            )}
            {(Number(itinerary.childWithBed || 0) > 0 || Number(itinerary.costBreakdown.childWithBedCost || 0) > 0) && (
              <div className="flex justify-between"><span className="text-[#6c6c6c]">Child With Bed Cost ({itinerary.childWithBed || 0})</span><span className="text-[#4a4260]">₹ {Number(itinerary.costBreakdown.childWithBedCost || 0).toFixed(2)}</span></div>
            )}
            {itinerary.costBreakdown.childWithoutBedCost !== undefined && itinerary.costBreakdown.childWithoutBedCost > 0 && (
              <div className="flex justify-between"><span className="text-[#6c6c6c]">Child Without Bed Cost ({itinerary.childWithoutBed || 0})</span><span className="text-[#4a4260]">₹ {itinerary.costBreakdown.childWithoutBedCost.toFixed(2)}</span></div>
            )}
            {shouldShowVehicles && computedVehicleAmount > 0 && (
              <div className="flex justify-between"><span className="text-[#6c6c6c]">Total Vehicle Cost{computedVehicleQty ? ` (${computedVehicleQty})` : ""}</span><span className="text-[#4a4260]">₹ {computedVehicleAmount.toFixed(2)}</span></div>
            )}
            {itinerary.costBreakdown.totalGuideCost !== undefined && itinerary.costBreakdown.totalGuideCost > 0 && (
              <div className="flex justify-between"><span className="text-[#6c6c6c]">Total Guide Cost</span><span className="text-[#4a4260]">₹ {itinerary.costBreakdown.totalGuideCost.toFixed(2)}</span></div>
            )}
            {effectiveEntryTicketAmount > 0 && (
              <div className="space-y-1">
                <div className="flex justify-between"><span className="text-[#6c6c6c]">Total Entry Ticket Cost</span><span className="text-[#4a4260]">₹ {effectiveEntryTicketAmount.toFixed(2)}</span></div>
                {entryTicketBreakdownByLocation.length > 0 && <div className="ml-3 space-y-1">{entryTicketBreakdownByLocation.map((row) => <div key={`${row.dayNumber}-${row.locationName}`} className="flex justify-between text-xs"><span className="text-[#7a7a7a]">Day {row.dayNumber} - {row.locationName}</span><span className="text-[#5e5e5e]">₹ {Number(row.amount || 0).toFixed(2)}</span></div>)}</div>}
              </div>
            )}
            {itinerary.costBreakdown.totalActivityCost !== undefined && itinerary.costBreakdown.totalActivityCost > 0 && (
              <div className="flex justify-between"><span className="text-[#6c6c6c]">Total Activity Cost</span><span className="text-[#4a4260]">₹ {itinerary.costBreakdown.totalActivityCost.toFixed(2)}</span></div>
            )}
            {itinerary.costBreakdown.additionalMargin !== undefined && itinerary.costBreakdown.additionalMargin > 0 && (
              <div className="flex justify-between"><span className="text-[#6c6c6c]">Total Additional Margin (10%)</span><span className="text-[#4a4260]">₹ {itinerary.costBreakdown.additionalMargin.toFixed(2)}</span></div>
            )}
          </>
        )}
        <div className="mt-1 border-t border-[#e5d9f2] pt-3"><div className="flex justify-between font-semibold"><span className="text-[#4a4260]">Total Amount</span><span className="text-[#4a4260]">₹ {financialTotals.totalAmount.toFixed(2)}</span></div></div>
        {(itinerary.costBreakdown.couponDiscount ?? 0) > 0 && <div className="flex justify-between text-[#d546ab]"><span>Coupon Discount</span><span>- ₹ {itinerary.costBreakdown.couponDiscount!.toFixed(2)}</span></div>}
        {(financialTotals.agentMargin ?? 0) > 0 && <div className="flex justify-between"><span className="text-[#6c6c6c]">Agent Margin</span><span className="text-[#4a4260]">₹ {financialTotals.agentMargin.toFixed(2)}</span></div>}
        <div className="mt-1 space-y-1 border-t border-[#e5d9f2] pt-2"><div className="flex justify-between text-[#6c6c6c]"><span>Total Round Off</span><span>{(financialTotals.totalRoundOff ?? 0) > 0 ? "+ " : ""}₹ {financialTotals.totalRoundOff.toFixed(2)}</span></div><div className="flex justify-between pt-1 text-base font-bold"><span className="text-[#4a4260]">Net Payable To {itinerary.costBreakdown.companyName || "Doview Holidays India Pvt ltd"}</span><span className="text-[#4a4260]">₹ {financialTotals.netPayable.toFixed(2)}</span></div></div>
      </div>
    </CardContent>
    </Card>
  );
};

export default ItineraryOverallCost;
