import React, { useState, useEffect, useMemo } from "react";
import { toast } from "sonner";
import { ItineraryService } from "../services/itinerary";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../components/ui/dialog";
import { Button } from "../components/ui/button";
import { AlertTriangle, Loader2 } from "lucide-react";


export interface DayWisePricingItem {
  date: string; // "2025-12-26"
  dayLabel: string; // "Day 1 | 26 Dec 2025"
  route: string; // "Chennai → Mahabalipuram"
  travelKms: number; // Travel KM per day
  sightseeingKms: number; // Sightseeing KM per day
  totalKms: number; // Total KM per day
  rentalCharges: number;
  tollCharges: number;
  parkingCharges: number;
  driverCharges: number;
  permitCharges: number;
  totalCharges: number;
}

export interface ItineraryVehicleRow {
  vendorName?: string | null;
  branchName?: string | null;
  vehicleOrigin?: string | null;
  totalQty?: string | null;
  totalAmount?: number | string | null;
  rentalCharges?: number | string | null;
  tollCharges?: number | string | null;
  parkingCharges?: number | string | null;
  driverCharges?: number | string | null;
  permitCharges?: number | string | null;
  before6amDriver?: number | string | null;
  after8pmDriver?: number | string | null;
  before6amVendor?: number | string | null;
  after8pmVendor?: number | string | null;
  imageUrl?: string | null;
  dayLabel?: string | null;
  fromLabel?: string | null;
  toLabel?: string | null;
  packageLabel?: string | null;
  col1Distance?: string | null;
  col1Duration?: string | null;
  col2Distance?: string | null;
  col2Duration?: string | null;
  col3Distance?: string | null;
  col3Duration?: string | null;
  vendorEligibleId?: number;
  vehicleTypeId?: number;
  vehicleTypeName?: string;
  isAssigned?: boolean;
  dayWisePricing?: DayWisePricingItem[];
  // PHP summary panel fields
  totalDays?: number;
  totalCostOfVehicle?: number;
  totalPickupKm?: number;
  totalPickupDuration?: string;
  totalDropKm?: number;
  totalDropDuration?: string;
  totalUsedKm?: number;
  totalAllowedKm?: number;
  extraKms?: number;
  extraKmRate?: number;
  extraKmCharge?: number;
  subtotal?: number;
  vehicleGstPercentage?: number;
  vehicleGstAmount?: number;
  vendorMarginPercentage?: number;
  vendorMarginAmount?: number;
  vendorMarginGstPercentage?: number;
  vendorMarginGstAmount?: number;
  grandTotal?: number;
}

const formatCurrencyINR = (value: number | string | undefined | null) => {
  const n =
    typeof value === "number" ? value : parseFloat((value as string) || "0");
  if (Number.isNaN(n)) return "₹ 0.00";
  return `₹ ${n.toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
};

const safe = (v?: string | null) => v || "";

const toAmount = (value: number | string | undefined | null): number => {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  const cleaned = String(value || "").replace(/,/g, "").trim();
  const parsed = parseFloat(cleaned);
  return Number.isFinite(parsed) ? parsed : 0;
};

const getPreferredVendorEligibleId = (vehicles: ItineraryVehicleRow[]): number | null => {
  if (!vehicles.length) return null;

  // Respect explicit user selection persisted at DB level.
  const assigned = vehicles.find((v) => v.isAssigned && v.vendorEligibleId);
  if (assigned?.vendorEligibleId) {
    return assigned.vendorEligibleId;
  }

  // Always pick the lowest quote as default selection.
  const cheapest = vehicles.reduce((prev, curr) => {
    const prevAmount = toAmount(prev.totalAmount);
    const currAmount = toAmount(curr.totalAmount);

    return currAmount < prevAmount ? curr : prev;
  });

  return cheapest.vendorEligibleId ?? null;
};

export type VehicleListProps = {
  vehicleTypeId?: number;
  vehicleTypeLabel: string;
  vehicles: ItineraryVehicleRow[];
  itineraryPlanId?: number;
  onRefresh?: () => void;
  onSelectedTotalChange?: (payload: {
    vehicleTypeId: number;
    totalAmount: number;
    totalQty: number;
  }) => void;
  dateRange?: string; // e.g., "Dec 26 - Dec 30, 2025"
  routes?: Array<{ date: string; destination: string; label: string }>; // Day-wise route information
};

export const VehicleList: React.FC<VehicleListProps> = ({
  vehicleTypeId,
  vehicleTypeLabel,
  vehicles,
  itineraryPlanId,
  onRefresh,
  onSelectedTotalChange,
  dateRange,
  routes,
}) => {
  const [hoveredTotalAmountIndex, setHoveredTotalAmountIndex] = useState<number | null>(null);
  const [expandedVendorIndex, setExpandedVendorIndex] = useState<number | null>(null);
 const [selectedVendorEligibleId, setSelectedVendorEligibleId] = useState<number | null>(null);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [pendingVendorSelection, setPendingVendorSelection] = useState<{
    index: number;
    vendorEligibleId: number;
    vehicleTypeId: number;
    vendorName: string;
  } | null>(null);
  const [isUpdatingVehicle, setIsUpdatingVehicle] = useState(false);

  // Sync selected vendor when assigned vendor changes (from API refresh)
  // Always auto-select cheapest if no assignment exists
 useEffect(() => {
  const preferredId = getPreferredVendorEligibleId(vehicles);

  if (preferredId !== null && preferredId !== selectedVendorEligibleId) {
    console.log(`[${vehicleTypeLabel}] Auto-selecting cheapest vendor:`, preferredId, 'from vehicles:', vehicles.map(v => ({ id: v.vendorEligibleId, amount: v.totalAmount })));
    setSelectedVendorEligibleId(preferredId);
  }
}, [vehicles, vehicleTypeLabel]);



  const handleRadioChange = (vendor: ItineraryVehicleRow, index: number) => {
    
    console.log(`[${vehicleTypeLabel}] Radio clicked:`, { 
      index, 
      vendorName: vendor?.vendorName,
      vendorEligibleId: vendor?.vendorEligibleId,
      vehicleTypeId: vendor?.vehicleTypeId,
      itineraryPlanId
    });

    if (!vendor || !itineraryPlanId || !vendor.vendorEligibleId || !vendor.vehicleTypeId) {
      console.error(`[${vehicleTypeLabel}] Missing required vendor data`, { vendor, itineraryPlanId });
      toast.error("Missing required vendor data");
      return;
    }

    setPendingVendorSelection({
      index,
      vendorEligibleId: vendor.vendorEligibleId,
      vehicleTypeId: vendor.vehicleTypeId,
      vendorName: vendor.vendorName || "Unknown Vendor",
    });
    setShowConfirmDialog(true);
  };

  const handleConfirmSelection = async () => {
    if (!pendingVendorSelection || !itineraryPlanId) return;

    console.log(`[${vehicleTypeLabel}] Confirming vendor selection:`, pendingVendorSelection);
    setIsUpdatingVehicle(true);
    try {
      await ItineraryService.selectVehicleVendor(
        itineraryPlanId,
        pendingVendorSelection.vehicleTypeId,
        pendingVendorSelection.vendorEligibleId
      );

      console.log(`[${vehicleTypeLabel}] Selection confirmed, setting selectedVendorEligibleId to:`, pendingVendorSelection.vendorEligibleId);
      toast.success("Vehicle vendor changed successfully. Please update the amount.");
      setSelectedVendorEligibleId(pendingVendorSelection.vendorEligibleId);
      setShowConfirmDialog(false);
      setPendingVendorSelection(null);

      if (onRefresh) {
        console.log(`[${vehicleTypeLabel}] Calling onRefresh`);
        onRefresh();
      }
    } catch (error) {
      console.error(`[${vehicleTypeLabel}] Failed to select vehicle vendor:`, error);
      toast.error("Failed to update vehicle vendor");
    } finally {
      setIsUpdatingVehicle(false);
    }
  };

  const handleCarouselPrevious = () => {
    setCarouselIndex((prev) => (prev === 0 ? vehicles.length - 1 : prev - 1));
  };

  const handleCarouselNext = () => {
    setCarouselIndex((prev) => (prev === vehicles.length - 1 ? 0 : prev + 1));
  };


  const sortedVehicles = useMemo(() => {
    return [...vehicles].sort((a, b) => {
      const aAmount =
        typeof a.totalAmount === "number"
          ? a.totalAmount
          : parseFloat(String(a.totalAmount || "0")) || 0;

      const bAmount =
        typeof b.totalAmount === "number"
          ? b.totalAmount
          : parseFloat(String(b.totalAmount || "0")) || 0;

      return aAmount - bAmount;
    });
  }, [vehicles]);

  useEffect(() => {
    if (!onSelectedTotalChange || sortedVehicles.length === 0) return;

    const selectedVehicle =
      selectedVendorEligibleId != null
        ? sortedVehicles.find((v) => v.vendorEligibleId === selectedVendorEligibleId) || sortedVehicles[0]
        : sortedVehicles[0];

    const totalAmount =
      typeof selectedVehicle.totalAmount === "number"
        ? selectedVehicle.totalAmount
        : parseFloat(String(selectedVehicle.totalAmount || "0")) || 0;

    const totalQty = parseInt(String(selectedVehicle.totalQty || "0"), 10) || 0;
    const resolvedVehicleTypeId = Number(selectedVehicle.vehicleTypeId || vehicleTypeId || 0);

    onSelectedTotalChange({
      vehicleTypeId: resolvedVehicleTypeId,
      totalAmount,
      totalQty,
    });
  }, [sortedVehicles, selectedVendorEligibleId, onSelectedTotalChange, vehicleTypeId]);

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

      {/* Horizontal Table View */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50">
              <th className="text-left py-2 px-3 font-semibold text-gray-600 uppercase text-xs w-12">#</th>
              <th className="text-left py-2 px-3 font-semibold text-gray-600 uppercase text-xs min-w-[120px]">Vendor Name</th>
              <th className="text-left py-2 px-3 font-semibold text-gray-600 uppercase text-xs min-w-[120px]">Branch Name</th>
              <th className="text-left py-2 px-3 font-semibold text-gray-600 uppercase text-xs min-w-[100px]">Vehicle Origin</th>
              <th className="text-center py-2 px-3 font-semibold text-gray-600 uppercase text-xs">Qty</th>
              <th className="text-right py-2 px-3 font-semibold text-gray-600 uppercase text-xs min-w-[120px]">Total Amount</th>
            </tr>
          </thead>
          <tbody>
            {sortedVehicles.map((v, index) => {
              const radioId = `vehicle_${index}`;
              const qty = parseInt(v.totalQty || "0", 10) || 0;
              const totalAmtNum =
                typeof v.totalAmount === "number"
                  ? v.totalAmount
                  : parseFloat(v.totalAmount || "0") || 0;

              const parseN = (val: number | string | undefined | null) =>
                typeof val === "number"
                  ? val
                  : parseFloat((val as string) || "0") || 0;

              const rental = parseN(v.rentalCharges ?? totalAmtNum);
              const toll = parseN(v.tollCharges);
              const parking = parseN(v.parkingCharges);
              const driver = parseN(v.driverCharges);
              const permit = parseN(v.permitCharges);
              const b6d = parseN(v.before6amDriver);
              const a8d = parseN(v.after8pmDriver);
              const b6v = parseN(v.before6amVendor);
              const a8v = parseN(v.after8pmVendor);
              const grandTotal = rental + toll + parking + driver + permit + b6d + a8d + b6v + a8v;
              const isExpanded = expandedVendorIndex === index;
              const isHoveredTotalAmount = hoveredTotalAmountIndex === index;
              
              // Calculate price breakdown for tooltip
              const subtotalVehicle = totalAmtNum;
              const gstAmount = subtotalVehicle * 0.05; // 5% GST
              const vendorMargin = subtotalVehicle * 0.10; // 10% Vendor Margin
              const marginServiceTax = (subtotalVehicle + vendorMargin) * 0.05; // 5% on subtotal + margin
              const calculatedGrandTotal = subtotalVehicle + gstAmount + vendorMargin + marginServiceTax;

              return (
                <React.Fragment key={index}>
                  <tr
                    onClick={() => setExpandedVendorIndex(expandedVendorIndex === index ? null : index)}
                    className="border-b border-gray-100 hover:bg-purple-50 transition-colors cursor-pointer"
                  >
                    <td className="py-3 px-3">
                      <input
                        type="radio"
                        id={radioId}
                        name={`selected_vehicle_${vehicleTypeLabel.replace(/\s+/g, '_')}`}
                        checked={
                          selectedVendorEligibleId != null
                            ? selectedVendorEligibleId === v.vendorEligibleId
                            : index === 0
                        }
                        onChange={() => handleRadioChange(v, index)}
                        onClick={(e) => e.stopPropagation()}
                        className="w-4 h-4 text-purple-600 border-gray-300 focus:ring-purple-500"
                      />
                    </td>
                    <td className="py-3 px-3 font-medium text-gray-900">{safe(v.vendorName)}</td>
                    <td className="py-3 px-3 text-gray-700">{safe(v.branchName)}</td>
                    <td className="py-3 px-3 text-gray-600 text-xs">{safe(v.vehicleOrigin)}</td>
                    <td className="py-3 px-3 text-center text-gray-800 font-medium">{qty}</td>
                    <td 
                      className="py-3 px-3 text-right font-semibold text-gray-900"
                      onMouseEnter={() => setHoveredTotalAmountIndex(index)}
                      onMouseLeave={() => setHoveredTotalAmountIndex(null)}
                    >
                      {formatCurrencyINR(totalAmtNum)}
                      <span className="ml-2 text-xs text-gray-500">{isExpanded ? "▼" : "▶"}</span>
                      
                      {/* Hover Tooltip - Price Breakdown */}
                      {hoveredTotalAmountIndex === index && (
                        <div className="fixed bg-white border-2 border-gray-300 rounded-lg shadow-2xl p-4 w-80 text-sm z-[9999]" 
                             style={{
                               bottom: 'auto',
                               right: '20px',
                               top: '80px',
                               pointerEvents: 'none'
                             }}>
                          <div className="mb-2 border-b border-gray-200 pb-2">
                            <div className="flex justify-between mb-1">
                              <span className="text-gray-700 font-semibold">Subtotal Vehicle</span>
                              <span className="font-semibold text-gray-900">{formatCurrencyINR(subtotalVehicle)}</span>
                            </div>
                          </div>
                          <div className="mb-1">
                            <div className="flex justify-between">
                              <span className="text-gray-600">GST 5%</span>
                              <span className="text-gray-900">{formatCurrencyINR(gstAmount)}</span>
                            </div>
                          </div>
                          <div className="mb-1">
                            <div className="flex justify-between">
                              <span className="text-gray-600">Vendor Margin (10%)</span>
                              <span className="text-gray-900">{formatCurrencyINR(vendorMargin)}</span>
                            </div>
                          </div>
                          <div className="mb-2 border-b border-gray-200 pb-2">
                            <div className="flex justify-between">
                              <span className="text-gray-600">Margin Service Tax 5%</span>
                              <span className="text-gray-900">{formatCurrencyINR(marginServiceTax)}</span>
                            </div>
                          </div>
                          <div className="flex justify-between font-bold pt-2 border-t border-gray-300">
                            <span className="text-purple-900">Grand Total</span>
                            <span className="text-purple-900">{formatCurrencyINR(calculatedGrandTotal)}</span>
                          </div>
                        </div>
                      )}
                    </td>
                  </tr>
                  
                  {/* Expanded Row - PHP-style full pricing breakdown */}
                  {isExpanded && v.dayWisePricing && v.dayWisePricing.length > 0 && (
                    <tr className="border-b border-gray-100 bg-gray-50">
                      <td colSpan={6} className="py-4 px-4">
                        <div className="ml-6 space-y-4">

                          {/* ── Day-wise per-route table ── */}
                          <div>
                            <h6 className="text-sm font-semibold text-gray-900 mb-2">Day-wise Pricing Breakdown</h6>
                            <div className="overflow-x-auto">
                              <table className="w-full text-xs border border-gray-200 rounded-lg overflow-hidden">
                                <thead>
                                  <tr className="bg-purple-100 border-b border-gray-200">
                                    <th className="text-left py-2 px-3 font-semibold text-gray-700 whitespace-nowrap">Date</th>
                                    <th className="text-left py-2 px-3 font-semibold text-gray-700 min-w-[180px]">Route</th>
                                    <th className="text-right py-2 px-3 font-semibold text-gray-700 whitespace-nowrap">Travel KM</th>
                                    <th className="text-right py-2 px-3 font-semibold text-gray-700 whitespace-nowrap">Sightseeing KM</th>
                                    <th className="text-right py-2 px-3 font-semibold text-gray-700 whitespace-nowrap">Total KM</th>
                                    <th className="text-right py-2 px-3 font-semibold text-gray-700 whitespace-nowrap">Rental</th>
                                    <th className="text-right py-2 px-3 font-semibold text-gray-700 whitespace-nowrap">Toll</th>
                                    <th className="text-right py-2 px-3 font-semibold text-gray-700 whitespace-nowrap">Parking</th>
                                    <th className="text-right py-2 px-3 font-semibold text-gray-700 whitespace-nowrap">Driver</th>
                                    <th className="text-right py-2 px-3 font-semibold text-gray-700 whitespace-nowrap">Permit</th>
                                    <th className="text-right py-2 px-3 font-semibold text-gray-700 whitespace-nowrap">Total</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {v.dayWisePricing.map((dp, di) => (
                                    <tr key={di} className={`border-b border-gray-100 ${di % 2 === 0 ? 'bg-white' : 'bg-purple-50/40'} hover:bg-purple-100 transition-colors`}>
                                      <td className="py-2 px-3 text-gray-700 font-medium whitespace-nowrap">{dp.dayLabel}</td>
                                      <td className="py-2 px-3 text-gray-600">{dp.route}</td>
                                      <td className="py-2 px-3 text-right text-gray-700 font-semibold whitespace-nowrap">{(dp.travelKms ?? 0).toFixed(2)} KM</td>
                                      <td className="py-2 px-3 text-right text-gray-700 font-semibold whitespace-nowrap">{(dp.sightseeingKms ?? 0).toFixed(2)} KM</td>
                                      <td className="py-2 px-3 text-right text-gray-700 font-semibold whitespace-nowrap">{(dp.totalKms ?? 0).toFixed(2)} KM</td>
                                      <td className="py-2 px-3 text-right text-gray-700 whitespace-nowrap">{formatCurrencyINR(dp.rentalCharges)}</td>
                                      <td className="py-2 px-3 text-right text-gray-700 whitespace-nowrap">{formatCurrencyINR(dp.tollCharges)}</td>
                                      <td className="py-2 px-3 text-right text-gray-700 whitespace-nowrap">{formatCurrencyINR(dp.parkingCharges)}</td>
                                      <td className="py-2 px-3 text-right text-gray-700 whitespace-nowrap">{formatCurrencyINR(dp.driverCharges)}</td>
                                      <td className="py-2 px-3 text-right text-gray-700 whitespace-nowrap">{formatCurrencyINR(dp.permitCharges)}</td>
                                      <td className="py-2 px-3 text-right text-purple-700 font-bold whitespace-nowrap">{formatCurrencyINR(dp.totalCharges)}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </div>

                          {/* ── Summary grid (below day-wise table) ── */}
                          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 bg-white border border-gray-200 rounded-lg p-4">
                            {[
                              { label: 'Total Days', value: String(v.totalDays ?? v.dayWisePricing.length) },
                              { label: 'Rental Charges', value: formatCurrencyINR(v.rentalCharges) },
                              { label: 'Toll Charges', value: formatCurrencyINR(v.tollCharges) },
                              { label: 'Parking Charges', value: formatCurrencyINR(v.parkingCharges) },
                              { label: 'Driver Charges', value: formatCurrencyINR(v.driverCharges) },
                              { label: 'Permit Charges', value: formatCurrencyINR(v.permitCharges) },
                              { label: '6AM Charges (D)', value: formatCurrencyINR(v.before6amDriver) },
                              { label: '6AM Charges (V)', value: formatCurrencyINR(v.before6amVendor) },
                              { label: '8PM Charges (D)', value: formatCurrencyINR(v.after8pmDriver) },
                              { label: '8PM Charges (V)', value: formatCurrencyINR(v.after8pmVendor) },
                            ].map(({ label, value }) => (
                              <div key={label} className="flex flex-col gap-0.5">
                                <span className="text-xs text-gray-500 font-medium">{label}</span>
                                <span className="text-sm font-semibold text-gray-800">{value}</span>
                              </div>
                            ))}
                          </div>

                          {/* ── Cost summary right-aligned rows (below day-wise table, matching PHP) ── */}
                          <div className="bg-white border border-gray-200 rounded-lg p-4 max-w-lg ml-auto space-y-1 text-sm">
                            <div className="flex justify-between font-bold text-gray-900 border-b border-gray-200 pb-2 mb-2">
                              <span>TOTAL COST OF VEHICLE</span>
                              <span>{formatCurrencyINR(v.totalCostOfVehicle)}</span>
                            </div>
                            {(v.totalPickupKm ?? 0) > 0 && (
                              <>
                                <div className="flex justify-between text-gray-600">
                                  <span>Total Pickup KM</span>
                                  <span>{(v.totalPickupKm ?? 0).toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between text-gray-600">
                                  <span>Total Pickup Duration</span>
                                  <span>{v.totalPickupDuration}</span>
                                </div>
                              </>
                            )}
                            {(v.totalDropKm ?? 0) > 0 && (
                              <>
                                <div className="flex justify-between text-gray-600">
                                  <span>Total Drop KM</span>
                                  <span>{(v.totalDropKm ?? 0).toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between text-gray-600">
                                  <span>Total Drop Duration</span>
                                  <span>{v.totalDropDuration}</span>
                                </div>
                              </>
                            )}
                            <div className="flex justify-between text-gray-700 font-semibold pt-1 border-t border-gray-100">
                              <span>TOTAL USED KM</span>
                              <span>{(v.totalUsedKm ?? 0).toFixed(0)}</span>
                            </div>
                            <div className="flex justify-between text-gray-600">
                              <span>TOTAL ALLOWED OUTSTATION KM</span>
                              <span>
                                {v.totalAllowedKm != null && v.totalDays
                                  ? `${Math.round((v.totalAllowedKm) / (v.totalDays))} * ${v.totalDays}`
                                  : (v.totalAllowedKm ?? 0)}{' '}
                                = {(v.totalAllowedKm ?? 0).toFixed(0)}
                              </span>
                            </div>
                            {(v.extraKms ?? 0) > 0 && (
                              <div className="flex justify-between text-gray-600">
                                <span>TOTAL EXTRA KM</span>
                                <span>
                                  {(v.extraKms ?? 0).toFixed(0)} * ₹{(v.extraKmRate ?? 0).toFixed(2)} = {formatCurrencyINR(v.extraKmCharge)}
                                </span>
                              </div>
                            )}
                            <div className="flex justify-between font-semibold text-gray-800 border-t border-gray-200 pt-2 mt-1">
                              <span>SUBTOTAL</span>
                              <span>{formatCurrencyINR(v.subtotal)}</span>
                            </div>
                            {(v.vehicleGstAmount ?? 0) > 0 && (
                              <div className="flex justify-between text-gray-600">
                                <span>GST ({v.vehicleGstPercentage ?? 0}%)</span>
                                <span>{formatCurrencyINR(v.vehicleGstAmount)}</span>
                              </div>
                            )}
                            {(v.vendorMarginAmount ?? 0) > 0 && (
                              <div className="flex justify-between text-gray-600">
                                <span>DVI Margin ({v.vendorMarginPercentage ?? 0}%)</span>
                                <span>{formatCurrencyINR(v.vendorMarginAmount)}</span>
                              </div>
                            )}
                            {(v.vendorMarginGstAmount ?? 0) > 0 && (
                              <div className="flex justify-between text-gray-600">
                                <span>DVI Margin Service Tax ({v.vendorMarginGstPercentage ?? 0}%)</span>
                                <span>{formatCurrencyINR(v.vendorMarginGstAmount)}</span>
                              </div>
                            )}
                            <div className="flex justify-between font-bold text-purple-700 border-t-2 border-purple-300 pt-2 mt-1 text-base">
                              <span>GRAND TOTAL ({v.totalQty || 1} x {formatCurrencyINR(v.grandTotal ?? v.totalAmount)})</span>
                              <span>{formatCurrencyINR(v.grandTotal ?? v.totalAmount)}</span>
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