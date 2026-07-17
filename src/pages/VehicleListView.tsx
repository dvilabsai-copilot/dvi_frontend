/* eslint-disable @typescript-eslint/no-explicit-any */
import React from "react";
import { AlertTriangle, Check, Copy, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "../components/ui/dialog";
import { Button } from "../components/ui/button";
import { FloatingHoverTooltip } from "../components/FloatingHoverTooltip";

export const VehicleListView = ({ context }: { context: Record<string, any> }) => {
  const {
    vehicleTypeLabel, vehicles, vehicleTypeId, dateRange, routes, canViewCostBreakdown, showVendorDetails,
    vehicleOriginTooltip, hoveredTotalAmountIndex, setHoveredTotalAmountIndex, sortedVehicles,
    showVehicleOriginTooltip, moveVehicleOriginTooltip, hideVehicleOriginTooltip,
    showVehicleOriginTooltipFromFocus, selectedVendorEligibleId, setSelectedVendorEligibleId,
    carouselIndex, handleCarouselPrevious, handleCarouselNext, copiedVendorIndex, setCopiedVendorIndex,
    copyVehicleBreakdownForOutlook, selectedVehicle, totalAmount, totalQty,
    onSelectedTotalChange, expandedVendorEligibleId, setExpandedVendorEligibleId,
    handleRadioChange, getDayLabelParts, formatTotalTime, formatMinutesDuration,
    splitDurationLines, isOutstationDay, vehicleHasUnavailableOutstationRate,
    getRentalCellLines, getSlabDisplayText, formatCurrencyINR, formatKm,
    getAllowedKmSummaryRows, safe, getVisibleDayTotal, getVehicleRentalSummaryText,
    readVehicleLocalExtraKmCharge, readVehicleOutstationExtraKmCharge, readVehicleExtraHourCharge,
    readVehicleSubtotal, readVehicleGstPercentage,
    readVehicleGstAmount, readVehicleVendorMarginPercentage, readVehicleVendorMarginAmount,
    readVehicleMarginServiceTaxPercentage, readVehicleMarginServiceTaxAmount,
    readVehicleGrandTotal, resolveVehicleDisplayAmount,
    showConfirmDialog, setShowConfirmDialog, pendingVendorSelection,
    setPendingVendorSelection, isUpdatingVehicle, handleConfirmSelection,
  } = context;
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mt-4">
      <div className="flex items-center justify-between mb-4">
        <h5 className="text-base font-bold uppercase">
          VEHICLE LIST FOR{" "}
          <span className="text-purple-600">"{vehicleTypeLabel}"</span>
        </h5>
        {dateRange && (
          <span className="text-sm text-gray-600">{dateRange}</span>
        )}
      </div>

   {/* Vehicle Table View */}
<div className="w-full min-w-0 overflow-x-hidden">
  <table className="w-full table-fixed text-sm">
    <colgroup>
      <col className="w-[5%]" />

      {showVendorDetails && <col className="w-[22%]" />}
      {showVendorDetails && <col className="w-[20%]" />}

      <col className={showVendorDetails ? "w-[23%]" : "w-[45%]"} />
      <col className="w-[8%]" />
      <col className={showVendorDetails ? "w-[22%]" : "w-[42%]"} />
    </colgroup>

    <thead>
      <tr className="border-b border-gray-200 bg-gray-50">
        <th className="break-words px-2 py-2 text-left text-xs font-semibold uppercase text-gray-600">
          #
        </th>

        {showVendorDetails && (
          <th className="break-words px-2 py-2 text-left text-xs font-semibold uppercase text-gray-600">
            Vendor Name
          </th>
        )}

        {showVendorDetails && (
          <th className="break-words px-2 py-2 text-left text-xs font-semibold uppercase text-gray-600">
            Branch Name
          </th>
        )}

        <th className="break-words px-2 py-2 text-left text-xs font-semibold uppercase text-gray-600">
          Vehicle Origin
        </th>

        <th className="px-2 py-2 text-center text-xs font-semibold uppercase text-gray-600">
          Qty
        </th>

        <th className="break-words px-2 py-2 text-right text-xs font-semibold uppercase text-gray-600">
          Total Amount
        </th>
      </tr>
    </thead>
          <tbody>
            {sortedVehicles.map((v, index) => {
              const rowKey =
                v.vendorEligibleId != null
                  ? `eligible-${v.vendorEligibleId}`
                  : `type-${vehicleTypeId ?? vehicleTypeLabel}-index-${index}`;
              const radioId = `vehicle_${vehicleTypeId ?? "type"}_${v.vendorEligibleId ?? index}`;
              const qty = parseInt(String(v.totalQty || "1"), 10) || 1;

const subtotalVehicle = readVehicleSubtotal(v);
const gstPercentage = readVehicleGstPercentage(v);
const gstAmount = readVehicleGstAmount(v);
const vendorMarginPercentage = readVehicleVendorMarginPercentage(v);
const vendorMargin = readVehicleVendorMarginAmount(v);
const marginServiceTaxPercentage = readVehicleMarginServiceTaxPercentage(v);
const marginServiceTax = readVehicleMarginServiceTaxAmount(v);
const calculatedGrandTotal = readVehicleGrandTotal(v);
const displayTotalAmount = resolveVehicleDisplayAmount(v);

const isExpanded = expandedVendorEligibleId === rowKey;
const isHoveredTotalAmount = hoveredTotalAmountIndex === index;
              return (
                <React.Fragment key={rowKey}>
                  <tr
                    onClick={() => {
                      if (!canViewCostBreakdown) return;
                      setExpandedVendorEligibleId((prev) => (prev === rowKey ? null : rowKey));
                    }}
                    className={`border-b border-gray-100 hover:bg-purple-50 transition-colors ${canViewCostBreakdown ? "cursor-pointer" : ""}`}
                  >
                      <td className="py-3 px-3">
                        {canViewCostBreakdown ? (
                        <input
                        type="radio"
                        id={radioId}
                        name={`selected_vehicle_${vehicleTypeLabel.replace(/\s+/g, '_')}`}
                        checked={
                          selectedVendorEligibleId != null
                            ? Number(selectedVendorEligibleId) === Number(v.vendorEligibleId || 0)
                            : index === 0
                        }
                        onChange={() => handleRadioChange(v, index)}
                        onClick={(e) => e.stopPropagation()}
                          className="w-4 h-4 text-purple-600 border-gray-300 focus:ring-purple-500"
                        />
                        ) : null}
                      </td>
                    {showVendorDetails && <td className="py-3 px-3 font-medium text-gray-900">{safe(v.vendorName)}</td>}
                    {showVendorDetails && <td className="py-3 px-3 text-gray-700">{safe(v.branchName)}</td>}
                    <td
                      className="py-3 px-3 text-gray-600 text-xs relative"
                      onMouseEnter={(e) => showVehicleOriginTooltip(index, e)}
                      onMouseMove={(e) => moveVehicleOriginTooltip(index, e)}
                      onMouseLeave={hideVehicleOriginTooltip}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <span
                        className="cursor-help underline decoration-dotted underline-offset-2"
                        tabIndex={0}
                        onFocus={(e) => showVehicleOriginTooltipFromFocus(index, e)}
                        onBlur={hideVehicleOriginTooltip}
                      >
                        {safe(v.vehicleOrigin) || "-"}
                      </span>

                      {vehicleOriginTooltip?.index === index && (
                        <FloatingHoverTooltip left={vehicleOriginTooltip.left} top={vehicleOriginTooltip.top}>
                          <div className="mb-2 border-b border-gray-200 pb-2">
                            <div className="flex justify-between gap-4">
                              <span className="text-gray-700 font-semibold">Vehicle Origin</span>
                              <span className="font-semibold text-gray-900 text-right">
                                {safe(v.vehicleOrigin) || "-"}
                              </span>
                            </div>
                          </div>

                          <div className="mb-1">
                            <div className="flex justify-between gap-4">
                              <span className="text-gray-600">Vehicle No</span>
                              <span className="text-gray-900 font-semibold text-right">
                                {Array.isArray(v.vehicleNumbers) && v.vehicleNumbers.length > 0
                                  ? v.vehicleNumbers.join(", ")
                                  : (safe(v.vehicleNumber || v.vehicleRegistrationNumber) || "-")}
                              </span>
                            </div>
                          </div>

                          {(Number(v.availableVehicleCount || 0) > 1 || (Array.isArray(v.vehicleIds) && v.vehicleIds.length > 1)) && (
                            <div className="mb-1">
                              <div className="flex justify-between gap-4">
                                <span className="text-gray-600">Available Vehicles</span>
                                <span className="text-gray-900 font-semibold text-right">
                                  {Number(v.availableVehicleCount || v.vehicleIds?.length || 0)}
                                </span>
                              </div>
                            </div>
                          )}

                          <div className="mb-1">
                            <div className="flex justify-between gap-4">
                              <span className="text-gray-600">Permit State</span>
                              <span className="text-gray-900 text-right">
                                {safe(v.vehicleRegistrationStateName) || "-"}
                                {v.vehicleRegistrationStateCode ? ` (${v.vehicleRegistrationStateCode})` : ""}
                              </span>
                            </div>
                          </div>

                          <div className="mt-2 border-t border-gray-200 pt-2 text-xs text-purple-900 font-semibold">
                            Permit source state is derived from vehicle number prefix.
                          </div>
                        </FloatingHoverTooltip>
                      )}
                    </td>
                    <td className="py-3 px-3 text-center text-gray-800 font-medium">{qty}</td>
                    <td 
                      className={`py-3 px-3 text-right font-semibold text-gray-900 ${canViewCostBreakdown ? "" : "[&>span]:hidden"}`}
                      onMouseEnter={() => setHoveredTotalAmountIndex(index)}
                      onMouseLeave={() => setHoveredTotalAmountIndex(null)}
                    >
{formatCurrencyINR(displayTotalAmount)}
                      <span className="ml-2 text-xs text-gray-500">{isExpanded ? "â–¼" : "â–¶"}</span>
                      
                      {/* Hover Tooltip - Price Breakdown */}
                       {canViewCostBreakdown && hoveredTotalAmountIndex === index && (
                        <FloatingHoverTooltip left={0} top={80} style={{ right: "20px", left: "auto" }}>
                          <div className="mb-2 border-b border-gray-200 pb-2">
                            <div className="flex justify-between mb-1">
                              <span className="text-gray-700 font-semibold">Subtotal Vehicle</span>
                              <span className="font-semibold text-gray-900">{formatCurrencyINR(subtotalVehicle)}</span>
                            </div>
                          </div>
                          <div className="mb-1">
                            <div className="flex justify-between">
                              <span className="text-gray-600">GST {gstPercentage}%</span>
                              <span className="text-gray-900">{formatCurrencyINR(gstAmount)}</span>
                            </div>
                          </div>
                          <div className="mb-1">
                            <div className="flex justify-between">
                              <span className="text-gray-600">Vendor Margin ({vendorMarginPercentage}%)</span>
                              <span className="text-gray-900">{formatCurrencyINR(vendorMargin)}</span>
                            </div>
                          </div>
                          <div className="mb-2 border-b border-gray-200 pb-2">
                            <div className="flex justify-between">
                              <span className="text-gray-600">Margin Service Tax {marginServiceTaxPercentage}%</span>
                              <span className="text-gray-900">{formatCurrencyINR(marginServiceTax)}</span>
                            </div>
                          </div>

                          <div className="flex justify-between gap-4 font-bold pt-2 border-t border-gray-300">
  <span className="text-purple-900">
    Grand Total ({qty} x {formatCurrencyINR(calculatedGrandTotal)})
  </span>
  <span className="text-purple-900 whitespace-nowrap">
    {formatCurrencyINR(displayTotalAmount)}
  </span>
</div>

                        </FloatingHoverTooltip>
                      )}
                    </td>
                  </tr>
                  
                  {/* Expanded Row - PHP-style full pricing breakdown */}
                  {canViewCostBreakdown && isExpanded && v.dayWisePricing && v.dayWisePricing.length > 0 && (
                   <tr className="border-b border-gray-100 bg-gray-50">
  <td
    colSpan={showVendorDetails ? 6 : 4}
    className="min-w-0 overflow-hidden px-2 py-3"
  >
    <div
      data-testid="vehicle-cost-breakdown"
      className="w-full min-w-0 space-y-3"
    >
      <div className="w-full min-w-0 space-y-3">

                          {/* â”€â”€ Day-wise per-route table â”€â”€ */}
                          <div>
                            <div className="flex items-center justify-between gap-3 mb-2">
                              <h6 className="text-sm font-semibold text-gray-900">Day-wise Pricing Breakdown</h6>
                              <div className="flex items-center gap-2">
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  className="h-8 px-3 text-xs"
                                  onClick={async () => {
                                    try {
                                      await copyVehicleBreakdownForOutlook(v);
                                      setCopiedVendorIndex(index);
                                      toast.success("Copied with Outlook formatting");
                                      setTimeout(() => setCopiedVendorIndex((prev) => (prev === index ? null : prev)), 1600);
                                    } catch (error) {
                                      console.error("Failed to copy vehicle breakdown", error);
                                      toast.error("Failed to copy. Please try again.");
                                    }
                                  }}
                                >
                                  {copiedVendorIndex === index ? (
                                    <>
                                      <Check className="h-3.5 w-3.5 mr-1" />
                                      Copied
                                    </>
                                  ) : (
                                    <>
                                      <Copy className="h-3.5 w-3.5 mr-1" />
                                      Copy for Outlook
                                    </>
                                  )}
                                </Button>
                              </div>
                            </div>
                            <div className="w-full min-w-0 overflow-x-hidden">
  <table className="w-full table-fixed border-collapse border border-gray-300 bg-white text-[10px] leading-tight [overflow-wrap:anywhere] [&_td]:!whitespace-normal [&_th]:!whitespace-normal">
    <colgroup>
      <col className="w-[8%]" />
      <col className="w-[12%]" />
      <col className="w-[12%]" />
      <col className="w-[7%]" />
      <col className="w-[7%]" />
      <col className="w-[7%]" />
      <col className="w-[10%]" />
      <col className="w-[8%]" />
      <col className="w-[6%]" />
      <col className="w-[6%]" />
      <col className="w-[6%]" />
      <col className="w-[5%]" />
      <col className="w-[6%]" />
    </colgroup>

    <thead>
                                  <tr className="bg-purple-100">
                                    <th className="border border-gray-300 text-left py-1 px-1 font-semibold text-gray-700 whitespace-nowrap">Date</th>
                                    <th className="border border-gray-300 text-left py-1 px-1 font-semibold text-gray-700">Route</th>
                                    <th className="border border-gray-300 text-left py-1 px-1 font-semibold text-gray-700 whitespace-nowrap">Pickup / Drop</th>
                                    <th className="border border-gray-300 text-right py-1 px-1 font-semibold text-gray-700 whitespace-nowrap">Travel KM</th>
                                    <th className="border border-gray-300 text-right py-1 px-1 font-semibold text-gray-700"><span className="leading-tight inline-block">Sightseeing<br />KM</span></th>
                                    <th className="border border-gray-300 text-right py-1 px-1 font-semibold text-gray-700"><span className="leading-tight inline-block">Running<br />Time</span></th>
                                    <th className="border border-gray-300 text-right py-1 px-1 font-semibold text-gray-700 whitespace-nowrap">Total KM</th>
                                    <th className="border border-gray-300 text-right py-1 px-1 font-semibold text-gray-700 whitespace-nowrap">Rental</th>
                                    <th className="border border-gray-300 text-right py-1 px-1 font-semibold text-gray-700 whitespace-nowrap">Toll</th>
                                    <th className="border border-gray-300 text-right py-1 px-1 font-semibold text-gray-700 whitespace-nowrap">Parking</th>
                                    <th className="border border-gray-300 text-right py-1 px-1 font-semibold text-gray-700 whitespace-nowrap">Driver</th>
                                    <th className="border border-gray-300 text-right py-1 px-1 font-semibold text-gray-700 whitespace-nowrap">Permit</th>
                                    <th className="border border-gray-300 text-right py-1 px-1 font-semibold text-gray-700 whitespace-nowrap">Total</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {v.dayWisePricing.map((dp, di) => {
                                    const { dayPart, datePart } = getDayLabelParts(dp.dayLabel);
                                    return (
                                    <tr key={di} className="bg-white hover:bg-purple-50 transition-colors">
                                      <td className="border border-gray-300 py-1 px-1 text-gray-700 font-medium whitespace-nowrap align-top">
                                        <div>{dayPart || dp.dayLabel}</div>
                                        {datePart ? <div>{datePart}</div> : null}
                                        <div className="font-semibold">Time: {formatTotalTime(dp)}</div>
                                        <div className="font-semibold">{getSlabDisplayText(dp)}</div>
                                      </td>
                                      <td className="border border-gray-300 py-1 px-1 text-gray-600 leading-5 break-words">{dp.route}</td>
                                      <td className="border border-gray-300 py-1 px-1 text-gray-700 font-semibold whitespace-nowrap leading-tight">
                                        <div>Pickup KM: {(dp.pickupKms ?? 0).toFixed(2)} KM</div>
                                        <div>Pickup Time: {formatMinutesDuration(dp.pickupDurationMinutes)}</div>
                                        <div>Drop KM: {(dp.dropKms ?? 0).toFixed(2)} KM</div>
                                        <div>Drop Time: {formatMinutesDuration(dp.dropDurationMinutes)}</div>
                                      </td>
                                      <td className="border border-gray-300 py-1 px-1 text-right text-gray-700 font-semibold whitespace-nowrap">{(dp.travelKms ?? 0).toFixed(2)} KM</td>
                                      <td className="border border-gray-300 py-1 px-1 text-right text-gray-700 font-semibold whitespace-nowrap">{(dp.sightseeingKms ?? 0).toFixed(2)} KM</td>
                                      <td className="border border-gray-300 py-1 px-1 text-right text-gray-700 font-semibold whitespace-nowrap leading-tight">
                                        {splitDurationLines(formatMinutesDuration(dp.travelDurationMinutes)).map((line, lineIndex) => (
                                          <div key={lineIndex}>{line}</div>
                                        ))}
                                      </td>
                                      <td className="border border-gray-300 py-1 px-1 text-right text-gray-700 font-semibold whitespace-nowrap">
                                        {Number(dp.totalKms ?? 0).toFixed(2)} KM

                                        {String(dp.travelType || "").toLowerCase() === "local" && (
                                          <div className="mt-1 text-[11px] text-gray-500 leading-tight text-left">
                                            <div>
                                              Actual Usage: {formatTotalTime(dp)} / {Number(dp.totalKms ?? 0).toFixed(2)} KM
                                            </div>
                                            <div>
                                              Chargeable Package: {Number(dp.slabHoursLimit ?? 0)} HRS / {Number(dp.slabKmLimit ?? 0)} KM
                                            </div>
                                            {dp.slabUpgraded && String(dp.originalSlabTitle || "").trim() && (
                                              <div>
                                                Upgraded from {String(dp.originalSlabTitle || "").trim()}
                                              </div>
                                            )}
                                          </div>
                                        )}
                                      </td>
                                      <td className="border border-gray-300 py-1 px-1 text-right text-gray-700 whitespace-nowrap leading-tight">
                                        {String(dp.travelType || "").toLowerCase() === "local" ? (
                                          <>
                                            <div>Local Usage Charge</div>
                                            <div>{formatCurrencyINR(dp.rentalCharges)}</div>
                                          </>
                                        ) : (
                                          getRentalCellLines(dp).map((line, lineIndex) => (
                                            <div key={lineIndex}>{line}</div>
                                          ))
                                        )}
                                      </td>
                                      <td
                                        className="border border-gray-300 py-1 px-1 text-right text-gray-700 whitespace-nowrap cursor-help"
                                        title={dp.tollBreakupText?.length ? `Toll Breakup\n${dp.tollBreakupText.join('\n')}` : undefined}
                                      >
                                        {formatCurrencyINR(dp.tollCharges)}
                                      </td>
                                        <td
                                          className="border border-gray-300 py-1 px-1 text-right text-gray-700 whitespace-nowrap cursor-help"
                                          title={dp.parkingBreakupText?.length ? `Parking Breakup\n${dp.parkingBreakupText.join('\n')}` : undefined}
                                        >
                                          {formatCurrencyINR(dp.parkingCharges)}
                                        </td>
                                      <td className="border border-gray-300 py-1 px-1 text-right text-gray-700 whitespace-nowrap">{formatCurrencyINR(dp.driverCharges)}</td>
                                      <td className="border border-gray-300 py-1 px-1 text-right text-gray-700 whitespace-nowrap">{formatCurrencyINR(dp.permitCharges)}</td>
                                      <td className="border border-gray-300 py-1 px-1 text-right text-purple-700 font-bold whitespace-nowrap">{formatCurrencyINR(getVisibleDayTotal(dp))}</td>
                                    </tr>
                                  );})}
                                </tbody>
                              </table>
                            </div>
                          </div>

    {/* â”€â”€ Full-width stacked summary tables â”€â”€ */}
<div className="w-full min-w-0 space-y-3">
  <div className="w-full min-w-0 overflow-hidden">
    <table className="w-full table-fixed border-collapse border border-gray-300 bg-white text-sm [overflow-wrap:anywhere]">
                                <thead>
                                  <tr className="bg-purple-100">
                                    <th colSpan={2} className="border border-gray-300 px-1 py-1 text-left font-semibold text-gray-700">
                                      Charge Summary
                                    </th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {[
                                    { label: 'Total Days', value: String(v.totalDays ?? v.dayWisePricing.length) },
                                    { label: 'Rental Charges', value: getVehicleRentalSummaryText(v) },
                                    { label: 'Toll Charges', value: formatCurrencyINR(v.tollCharges) },
                                    { label: 'Parking Charges', value: formatCurrencyINR(v.parkingCharges) },
                                    { label: 'Driver Charges', value: formatCurrencyINR(v.driverCharges) },
                                    { label: 'Permit Charges', value: formatCurrencyINR(v.permitCharges) },
                                    ...(readVehicleLocalExtraKmCharge(v) > 0
                                      ? [{
                                          label: 'Local Extra KM Charges',
                                          value: formatCurrencyINR(readVehicleLocalExtraKmCharge(v)),
                                        }]
                                      : []),
                                    ...(readVehicleOutstationExtraKmCharge(v) > 0
                                      ? [{
                                          label: 'Outstation Extra KM Charges',
                                          value: formatCurrencyINR(readVehicleOutstationExtraKmCharge(v)),
                                        }]
                                      : []),
                                    ...(readVehicleExtraHourCharge(v) > 0
                                      ? [{
                                          label: `Extra Hour Charges (Rs ${Number(v.extraHourRate ?? 0).toFixed(0)} * ${Number(v.extraHourCount ?? 0).toFixed(0)} hrs)`,
                                          value: formatCurrencyINR(readVehicleExtraHourCharge(v)),
                                        }]
                                      : []),
                                    { label: 'Before 6 AM Charges (D)', value: formatCurrencyINR(v.before6amDriver) },
                                    { label: 'Before 6 AM Charges (V)', value: formatCurrencyINR(v.before6amVendor) },
                                    { label: 'After 8 PM Charges (D)', value: formatCurrencyINR(v.after8pmDriver) },
                                    { label: 'After 8 PM Charges (V)', value: formatCurrencyINR(v.after8pmVendor) },
                                  ].map(({ label, value }) => (
                                    <tr key={label}>
                                      <td className="w-1/2 border border-gray-300 px-1 py-1 text-gray-600 font-medium">{label}</td>
                                      <td className="w-1/2 border border-gray-300 px-1 py-1 text-right text-gray-800 font-semibold">{value}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
<div className="w-full min-w-0 overflow-hidden">
  <table className="w-full table-fixed border-collapse border border-gray-300 bg-white text-xs [overflow-wrap:anywhere]">
                                <thead>
                                  <tr className="bg-purple-100">
                                    <th colSpan={2} className="border border-gray-300 px-1 py-1 text-left font-semibold text-gray-700">
                                      Distance Summary
                                    </th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {(v.totalPickupKm ?? 0) > 0 && (
                                    <>
                                      <tr>
                                        <td className="w-1/2 border border-gray-300 px-1 py-1 text-gray-600 font-medium">Total Pickup KM</td>
                                        <td className="w-1/2 border border-gray-300 px-1 py-1 text-right text-gray-800 font-semibold">{(v.totalPickupKm ?? 0).toFixed(2)}</td>
                                      </tr>
                                      <tr>
                                        <td className="w-1/2 border border-gray-300 px-1 py-1 text-gray-600 font-medium">Total Pickup Duration</td>
                                        <td className="w-1/2 border border-gray-300 px-1 py-1 text-right text-gray-800 font-semibold">{v.totalPickupDuration}</td>
                                      </tr>
                                    </>
                                  )}
                                  {(v.totalDropKm ?? 0) > 0 && (
                                    <>
                                      <tr>
                                        <td className="w-1/2 border border-gray-300 px-1 py-1 text-gray-600 font-medium">Total Drop KM</td>
                                        <td className="w-1/2 border border-gray-300 px-1 py-1 text-right text-gray-800 font-semibold">{(v.totalDropKm ?? 0).toFixed(2)}</td>
                                      </tr>
                                      <tr>
                                        <td className="w-1/2 border border-gray-300 px-1 py-1 text-gray-600 font-medium">Total Drop Duration</td>
                                        <td className="w-1/2 border border-gray-300 px-1 py-1 text-right text-gray-800 font-semibold">{v.totalDropDuration}</td>
                                      </tr>
                                    </>
                                  )}
                                  {(v.localUsedKm ?? 0) > 0 && (
                                    <tr>
                                      <td className="w-1/2 border border-gray-300 px-1 py-1 text-gray-600 font-medium">LOCAL USED KM</td>
                                      <td className="w-1/2 border border-gray-300 px-1 py-1 text-right text-gray-800 font-semibold">{formatKm(v.localUsedKm)}</td>
                                    </tr>
                                  )}
                                  {(v.outstationUsedKm ?? 0) > 0 && (
                                    <tr>
                                      <td className="w-1/2 border border-gray-300 px-1 py-1 text-gray-600 font-medium">OUTSTATION USED KM</td>
                                      <td className="w-1/2 border border-gray-300 px-1 py-1 text-right text-gray-800 font-semibold">{formatKm(v.outstationUsedKm)}</td>
                                    </tr>
                                  )}
                                  <tr>
                                    <td className="w-1/2 border border-gray-300 px-1 py-1 text-gray-700 font-semibold">TOTAL USED KM</td>
                                    <td className="w-1/2 border border-gray-300 px-1 py-1 text-right text-gray-800 font-semibold">{formatKm(v.totalUsedKm)}</td>
                                  </tr>
                                  {getAllowedKmSummaryRows(v).map(([label, value]) => (
                                    <tr key={`${label}-${value}`}>
                                      <td className="w-1/2 border border-gray-300 px-1 py-1 text-gray-600 font-medium">{label}</td>
                                      <td className="w-1/2 border border-gray-300 px-1 py-1 text-right text-gray-800 font-semibold">
                                        {value}
                                      </td>
                                    </tr>
                                  ))}
                                  {(v.localExtraKms ?? 0) > 0 && (
                                    <tr>
                                      <td className="w-1/2 border border-gray-300 px-1 py-1 text-gray-600 font-medium">LOCAL EXTRA KM</td>
                                      <td className="w-1/2 border border-gray-300 px-1 py-1 text-right text-gray-800 font-semibold">
                                        {(v.localExtraKms ?? 0).toFixed(0)} * â‚¹{(v.extraKmRate ?? 0).toFixed(2)} = {formatCurrencyINR(v.localExtraKmCharge)}
                                      </td>
                                    </tr>
                                  )}
                                  {(v.outstationExtraKms ?? 0) > 0 && (
                                    <tr>
                                      <td className="w-1/2 border border-gray-300 px-1 py-1 text-gray-600 font-medium">OUTSTATION EXTRA KM</td>
                                      <td className="w-1/2 border border-gray-300 px-1 py-1 text-right text-gray-800 font-semibold">
                                        {(v.outstationExtraKms ?? 0).toFixed(0)} * â‚¹{(v.extraKmRate ?? 0).toFixed(2)} = {formatCurrencyINR(v.outstationExtraKmCharge)}
                                      </td>
                                    </tr>
                                  )}
                                </tbody>
                              </table>
                            </div>

                            <div className="w-full min-w-0 overflow-hidden">
  <table className="w-full table-fixed border-collapse border border-gray-300 bg-white text-sm [overflow-wrap:anywhere]">
                                <thead>
                                  <tr className="bg-purple-600">
                                    <th colSpan={2} className="border border-gray-300 px-1 py-1 text-left font-semibold text-white">
                                      Consolidated Totals
                                    </th>
                                  </tr>
                                </thead>


    <tbody>
  <tr>
    <td className="w-1/2 border border-gray-300 px-1 py-1 text-gray-700 font-semibold">
      SUBTOTAL
    </td>
    <td className="w-1/2 border border-gray-300 px-1 py-1 text-right text-gray-800 font-semibold">
      {formatCurrencyINR(subtotalVehicle)}
    </td>
  </tr>

  {gstAmount > 0 && (
    <tr>
      <td className="w-1/2 border border-gray-300 px-1 py-1 text-gray-600 font-medium">
        GST ({gstPercentage}%)
      </td>
      <td className="w-1/2 border border-gray-300 px-1 py-1 text-right text-gray-800 font-semibold">
        {formatCurrencyINR(gstAmount)}
      </td>
    </tr>
  )}

  {vendorMargin > 0 && (
    <tr>
      <td className="w-1/2 border border-gray-300 px-1 py-1 text-gray-600 font-medium">
        DVI Margin ({vendorMarginPercentage}%)
      </td>
      <td className="w-1/2 border border-gray-300 px-1 py-1 text-right text-gray-800 font-semibold">
        {formatCurrencyINR(vendorMargin)}
      </td>
    </tr>
  )}

  {marginServiceTax > 0 && (
    <tr>
      <td className="w-1/2 border border-gray-300 px-1 py-1 text-gray-600 font-medium">
        DVI Margin Service Tax ({marginServiceTaxPercentage}%)
      </td>
      <td className="w-1/2 border border-gray-300 px-1 py-1 text-right text-gray-800 font-semibold">
        {formatCurrencyINR(marginServiceTax)}
      </td>
    </tr>
  )}

  <tr>
    <td className="w-1/2 border border-gray-300 px-1 py-1 text-purple-700 font-bold text-base">
      GRAND TOTAL ({qty} x {formatCurrencyINR(calculatedGrandTotal)})
    </td>
    <td className="w-1/2 border border-gray-300 px-1 py-1 text-right text-purple-700 font-bold text-base">
      {formatCurrencyINR(displayTotalAmount)}
    </td>
  </tr>
</tbody>

                              </table>
                            </div>
                          </div>

                          </div>

                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Confirmation Dialog */}
      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-orange-100">
                <AlertTriangle className="h-5 w-5 text-orange-600" />
              </div>
              <DialogTitle className="text-lg">Confirm Vendor Selection</DialogTitle>
            </div>
            <DialogDescription className="pt-4">
              Are you sure you want to select <strong>{pendingVendorSelection?.vendorName}</strong> as the vendor for <strong>{vehicleTypeLabel}</strong>?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => {
                setShowConfirmDialog(false);
                setPendingVendorSelection(null);
              }}
              disabled={isUpdatingVehicle}
            >
              Cancel
            </Button>
            <Button
              onClick={handleConfirmSelection}
              className="bg-purple-600 hover:bg-purple-700"
              disabled={isUpdatingVehicle}
            >
              {isUpdatingVehicle ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Updating...
                </>
              ) : (
                "Confirm"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
