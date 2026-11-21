import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import type { ItineraryDetailsResponse } from "../itinerary-details.types";
import { EntryTicketCostTooltip } from "./EntryTicketCostTooltip";
import { HotelMealSupplementSummary } from "./HotelMealSupplementSummary";

type FinancialTotals = {
  hotelAmount: number;
  totalAmount: number;
  netPayable: number;
  totalRoundOff: number;
  agentMargin: number;
  additionalMargin: number;
};

type ItineraryOverallCostProps = {
  itinerary: Pick<
    ItineraryDetailsResponse,
    "costBreakdown" | "agentSellingProfit"
  >;
  canViewCostBreakdown: boolean;
  financialTotals: FinancialTotals;
  vehicleSelectionPreview?: {
    items: Array<{
      vehicleTypeId: number;
      name: string;
      amount: number;
      quantity: number;
      included: boolean;
    }>;
    amount: number;
    quantity: number;
    changed: boolean;
  };
};

const formatMoney = (value: number) => value.toLocaleString("en-IN", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const CostRow: React.FC<{ label: string; value: number; emphasized?: boolean }> = ({ label, value, emphasized }) => (
  <div className={`flex justify-between gap-4 ${emphasized ? "font-semibold text-[#4a4260]" : "text-[#6c6c6c]"}`}>
    <span>{label}</span>
    <span className="text-right">{"\u20b9"} {formatMoney(value)}</span>
  </div>
);

/** Displays backend-provided totals; duplicated explanation rows are never added again. */
export const AdminItineraryOverallCost: React.FC<ItineraryOverallCostProps> = ({
  itinerary,
  canViewCostBreakdown,
  financialTotals,
  vehicleSelectionPreview,
}) => {
  const cost = itinerary.costBreakdown;

  const savedAgentProfit = Number(itinerary.agentSellingProfit ?? 0);
  const agentSellingProfit =
    Number.isFinite(savedAgentProfit) && savedAgentProfit >= 0
      ? savedAgentProfit
      : 0;

  // Saved Agent final price uses the Agent's visible cost basis. Admin's
  // separate additional-margin/net-payable rows must not be added to it again.
  const sharedFinalPrice = (itinerary as typeof itinerary & {
    agentFinalSellingPrice?: number | null;
  }).agentFinalSellingPrice;
const agentFinalSellingPrice = sharedFinalPrice !== null &&
  sharedFinalPrice !== undefined && Number.isFinite(Number(sharedFinalPrice))
    ? Number(sharedFinalPrice)
    : Number((financialTotals.netPayable + agentSellingProfit).toFixed(2));

const hotelCost = financialTotals.hotelAmount;

const vehicleCost = vehicleSelectionPreview
  ? vehicleSelectionPreview.amount
  : Number(cost?.totalVehicleCost ?? cost?.totalVehicleAmount ?? 0);
  const vehicleQuantity = vehicleSelectionPreview
    ? vehicleSelectionPreview.quantity
    : Number(cost?.totalVehicleQty ?? 0);
  const entryTicketCost = Number(cost?.totalHotspotCost ?? 0);

  return (
    <Card className="border-none bg-gradient-to-br from-[#faf5ff] to-white shadow-none">
      <CardContent className="pt-2">
        <h2 className="mb-4 text-lg font-semibold text-[#4a4260]">OVERALL COST</h2>
        {vehicleSelectionPreview?.changed && (
          <p className="mb-3 text-xs text-gray-500" role="status">
            Cost preview only. Include selections are not saved to the booking.
          </p>
        )}
        <div className="space-y-2 text-sm">
         {hotelCost > 0 && (
  <CostRow
    label="Total Hotel Cost"
    value={hotelCost}
    emphasized
  />
)}

<HotelMealSupplementSummary cost={cost} />

{vehicleSelectionPreview ? (
  vehicleSelectionPreview.items
    .filter((item) => item.included)
    .map((item) => (
      <CostRow
        key={item.vehicleTypeId}
        label={`${item.name} (${item.quantity})`}
        value={item.amount}
      />
    ))
) : vehicleCost > 0 ? (
  <CostRow
    label={`Total Vehicle Cost${vehicleQuantity > 0 ? ` (${vehicleQuantity})` : ""}`}
    value={vehicleCost}
    emphasized
  />
) : null}
          {Number(cost?.totalGuideCost ?? 0) > 0 && <CostRow label="Total Guide Cost" value={Number(cost.totalGuideCost)} />}
          {entryTicketCost > 0 && (
            <div className="flex items-center justify-between gap-4">
              <span className="text-[#6c6c6c]">Total Entry Ticket Cost</span>
              <EntryTicketCostTooltip costBreakdown={cost} canViewCostBreakdown={canViewCostBreakdown}>
                <span className="text-[#4a4260]">{"\u20b9"} {formatMoney(entryTicketCost)}</span>
              </EntryTicketCostTooltip>
            </div>
          )}
          {Number(cost?.totalActivityCost ?? 0) > 0 && <CostRow label="Total Activity Cost" value={Number(cost.totalActivityCost)} />}
          {financialTotals.additionalMargin > 0 && <CostRow label="Additional Margin" value={financialTotals.additionalMargin} />}

          <div className="mt-1 space-y-2 border-t border-[#e5d9f2] pt-3">
            {financialTotals.agentMargin > 0 && <CostRow label="Agent Margin (included in Total Amount)" value={financialTotals.agentMargin} />}
            <CostRow label="Total Amount" value={financialTotals.totalAmount} emphasized />
            {Number(cost?.couponDiscount ?? 0) > 0 && <CostRow label="Coupon Discount (deducted)" value={Number(cost.couponDiscount)} />}
            <CostRow label="Total Round Off" value={financialTotals.totalRoundOff} />
              <div className="flex justify-between gap-4 border-t border-[#e5d9f2] pt-2 text-base font-bold text-[#4a4260]">
              <span>Net Payable To Doview Holidays India Pvt ltd</span>
              <span>{"\u20b9"} {formatMoney(financialTotals.netPayable)}</span>
            </div>

            <div className="mt-3 space-y-2 border-t border-[#e5d9f2] pt-3">
              <CostRow
                label="Agent Added Profit"
                value={agentSellingProfit}
              />

              <div className="flex justify-between gap-4 border-t border-[#e5d9f2] pt-3 text-base font-bold text-[#4a4260]">
                <span>Agent Final Selling Price</span>
                <span>
                  {"\u20b9"} {formatMoney(agentFinalSellingPrice)}
                </span>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default AdminItineraryOverallCost;
