import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import type { ItineraryDetailsResponse } from "../itinerary-details.types";
import { EntryTicketCostTooltip } from "./EntryTicketCostTooltip";
import { HotelCostTooltip } from "./HotelCostTooltip";

type FinancialTotals = {
  hotelAmount: number;
  totalAmount: number;
  netPayable: number;
  totalRoundOff: number;
  agentMargin: number;
  additionalMargin: number;
};

type ItineraryOverallCostProps = {
  itinerary: Pick<ItineraryDetailsResponse, "costBreakdown">;
  canViewCostBreakdown: boolean;
  financialTotals: FinancialTotals;
};

const formatMoney = (value: number) => value.toLocaleString("en-IN", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const CostRow: React.FC<{ label: string; value: number; emphasized?: boolean }> = ({ label, value, emphasized }) => (
  <div className={`flex justify-between gap-4 ${emphasized ? "font-semibold text-[#4a4260]" : "text-[#6c6c6c]"}`}>
    <span>{label}</span>
    <span className="text-right">₹ {formatMoney(value)}</span>
  </div>
);

/** Displays backend-provided component totals with explanations for composite hotel and entry-ticket amounts. */
export const ItineraryOverallCost: React.FC<ItineraryOverallCostProps> = ({
  itinerary,
  canViewCostBreakdown,
  financialTotals,
}) => {
  const cost = itinerary.costBreakdown;
  const hotelCost = financialTotals.hotelAmount;
  const vehicleCost = Number(cost?.totalVehicleCost ?? cost?.totalVehicleAmount ?? 0);
  const entryTicketCost = Number(cost?.totalHotspotCost ?? 0);

  return (
    <Card className="border-none bg-gradient-to-br from-[#faf5ff] to-white shadow-none">
      <CardContent className="pt-2">
        <h2 className="mb-4 text-lg font-semibold text-[#4a4260]">OVERALL COST</h2>
        <div className="space-y-2 text-sm">
          {hotelCost > 0 && (
            <HotelCostTooltip
              costBreakdown={cost}
              canViewCostBreakdown={canViewCostBreakdown}
              hotelCost={hotelCost}
            >
              <CostRow label="Total Hotel Cost" value={hotelCost} />
            </HotelCostTooltip>
          )}
          {Number(cost?.totalAmenitiesCost ?? 0) > 0 && <CostRow label="Total Amenities Cost" value={Number(cost.totalAmenitiesCost)} />}
          {Number(cost?.extraBedCost ?? 0) > 0 && <CostRow label="Extra Bed Cost" value={Number(cost.extraBedCost)} />}
          {Number(cost?.childWithBedCost ?? 0) > 0 && <CostRow label="Child With Bed Cost" value={Number(cost.childWithBedCost)} />}
          {Number(cost?.childWithoutBedCost ?? 0) > 0 && <CostRow label="Child Without Bed Cost" value={Number(cost.childWithoutBedCost)} />}
          {vehicleCost > 0 && (
            <CostRow
              label={`Total Vehicle Cost${cost?.totalVehicleQty ? ` (${cost.totalVehicleQty})` : ""}`}
              value={vehicleCost}
            />
          )}
          {Number(cost?.totalGuideCost ?? 0) > 0 && <CostRow label="Total Guide Cost" value={Number(cost.totalGuideCost)} />}
          {entryTicketCost > 0 && (
            <div className="flex items-center justify-between gap-4">
              <span className="text-[#6c6c6c]">Total Entry Ticket Cost</span>
              <EntryTicketCostTooltip costBreakdown={cost} canViewCostBreakdown={canViewCostBreakdown}>
                <span className="text-[#4a4260]">₹ {formatMoney(entryTicketCost)}</span>
              </EntryTicketCostTooltip>
            </div>
          )}
          {Number(cost?.totalActivityCost ?? 0) > 0 && <CostRow label="Total Activity Cost" value={Number(cost.totalActivityCost)} />}
          {financialTotals.additionalMargin > 0 && <CostRow label="Additional Margin" value={financialTotals.additionalMargin} />}

          <div className="mt-1 space-y-2 border-t border-[#e5d9f2] pt-3">
            <CostRow label="Total Amount" value={financialTotals.totalAmount} emphasized />
            {Number(cost?.couponDiscount ?? 0) > 0 && <CostRow label="Coupon Discount" value={Number(cost.couponDiscount)} />}
            {financialTotals.agentMargin > 0 && <CostRow label="Agent Margin" value={financialTotals.agentMargin} />}
            <CostRow label="Total Round Off" value={financialTotals.totalRoundOff} />
            <div className="flex justify-between gap-4 border-t border-[#e5d9f2] pt-2 text-base font-bold text-[#4a4260]">
              <span>Net Payable</span>
              <span>₹ {formatMoney(financialTotals.netPayable)}</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default ItineraryOverallCost;
