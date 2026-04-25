import React, { useState, useEffect, useMemo, useRef } from "react";
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
import { AlertTriangle, Check, Copy, Loader2 } from "lucide-react";


export interface DayWisePricingItem {
  date: string; // "2025-12-26"
  dayLabel: string; // "Day 1 | 26 Dec 2025"
  route: string; // "Chennai → Mahabalipuram"
  pickupKms: number;
  travelKms: number; // Travel KM per day
  sightseeingKms: number; // Sightseeing KM per day
  totalKms: number; // Total KM per day
  rentalCharges: number;
  tollCharges: number;
  parkingCharges: number;
  driverCharges: number;
  permitCharges: number;
  extraHourCount: number;
  extraHourRate: number;
  extraHourCharges: number;
  extraKmCharges: number;
  dropKms: number;
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
  selectedTimeLimitId?: number;
  availableSlabs?: Array<{
    timeLimitId: number;
    title: string;
    hoursLimit: number;
    kmLimit: number;
  }>;
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
  extraHourCount?: number;
  extraHourRate?: number;
  extraHourCharge?: number;
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
  const [isAutoSelectingSlabs, setIsAutoSelectingSlabs] = useState(false);
  const autoSlabSyncKeysRef = useRef<Set<string>>(new Set());
  const [copiedVendorIndex, setCopiedVendorIndex] = useState<number | null>(null);

  const escapeHtml = (value: unknown) =>
    String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/\"/g, "&quot;")
      .replace(/'/g, "&#039;");

  const copyVehicleBreakdownForOutlook = async (vehicle: ItineraryVehicleRow) => {
    try {
      const dayRows = (vehicle.dayWisePricing || [])
        .map(
          (dp) => {
            const [dayPartRaw, datePartRaw] = String(dp.dayLabel || '').split('|');
            const dayPart = (dayPartRaw || '').trim();
            const datePart = (datePartRaw || '').trim();

            return `
          <tr>
            <td style="padding:6px 10px;border-bottom:1px solid #ececf1;color:#1f2937;font-weight:500;white-space:nowrap;line-height:1.25;">
              <div>${escapeHtml(dayPart || String(dp.dayLabel || ''))}</div>
              ${datePart ? `<div style="font-weight:500;">${escapeHtml(datePart)}</div>` : ''}
            </td>
            <td style="padding:6px 10px;border-bottom:1px solid #ececf1;color:#374151;">${escapeHtml(dp.route)}</td>
            <td style="padding:6px 10px;border-bottom:1px solid #ececf1;color:#1f2937;font-weight:600;text-align:right;white-space:nowrap;">${Number(dp.pickupKms ?? 0).toFixed(2)} KM</td>
            <td style="padding:6px 10px;border-bottom:1px solid #ececf1;color:#1f2937;font-weight:600;text-align:right;white-space:nowrap;">${Number(dp.travelKms ?? 0).toFixed(2)} KM</td>
            <td style="padding:6px 10px;border-bottom:1px solid #ececf1;color:#1f2937;font-weight:600;text-align:right;white-space:nowrap;">${Number(dp.sightseeingKms ?? 0).toFixed(2)} KM</td>
            <td style="padding:6px 10px;border-bottom:1px solid #ececf1;color:#1f2937;font-weight:600;text-align:right;white-space:nowrap;">${Number(dp.totalKms ?? 0).toFixed(2)} KM</td>
            <td style="padding:6px 10px;border-bottom:1px solid #ececf1;color:#1f2937;text-align:right;white-space:nowrap;">${escapeHtml(formatCurrencyINR(dp.rentalCharges))}</td>
            <td style="padding:6px 10px;border-bottom:1px solid #ececf1;color:#1f2937;text-align:right;white-space:nowrap;">${escapeHtml(formatCurrencyINR(dp.tollCharges))}</td>
            <td style="padding:6px 10px;border-bottom:1px solid #ececf1;color:#1f2937;text-align:right;white-space:nowrap;">${escapeHtml(formatCurrencyINR(dp.parkingCharges))}</td>
            <td style="padding:6px 10px;border-bottom:1px solid #ececf1;color:#1f2937;text-align:right;white-space:nowrap;">${escapeHtml(formatCurrencyINR(dp.driverCharges))}</td>
            <td style="padding:6px 10px;border-bottom:1px solid #ececf1;color:#1f2937;text-align:right;white-space:nowrap;">${escapeHtml(formatCurrencyINR(dp.permitCharges))}</td>
            <td style="padding:6px 10px;border-bottom:1px solid #ececf1;color:#1f2937;text-align:right;white-space:nowrap;">${escapeHtml(formatCurrencyINR(dp.extraHourCharges))}</td>
            <td style="padding:6px 10px;border-bottom:1px solid #ececf1;color:#1f2937;text-align:right;white-space:nowrap;">${escapeHtml(formatCurrencyINR(dp.extraKmCharges))}</td>
            <td style="padding:6px 10px;border-bottom:1px solid #ececf1;color:#1f2937;font-weight:600;text-align:right;white-space:nowrap;">${Number(dp.dropKms ?? 0).toFixed(2)} KM</td>
            <td style="padding:6px 10px;border-bottom:1px solid #ececf1;color:#6d28d9;font-weight:700;text-align:right;white-space:nowrap;">${escapeHtml(formatCurrencyINR(dp.totalCharges))}</td>
          </tr>
        `;
          },
        )
        .join("");

      const chargeRows = [
        ["Total Days", String(vehicle.totalDays ?? vehicle.dayWisePricing?.length ?? 0)],
        ["Rental Charges", formatCurrencyINR(vehicle.rentalCharges)],
        ["Toll Charges", formatCurrencyINR(vehicle.tollCharges)],
        ["Parking Charges", formatCurrencyINR(vehicle.parkingCharges)],
        ["Driver Charges", formatCurrencyINR(vehicle.driverCharges)],
        ["Permit Charges", formatCurrencyINR(vehicle.permitCharges)],
        (Number(vehicle.extraHourCharge ?? 0) > 0)
          ? [
              `Extra Hour Charges (Rs ${Number(vehicle.extraHourRate ?? 0).toFixed(0)} * ${Number(vehicle.extraHourCount ?? 0).toFixed(0)} hrs)`,
              formatCurrencyINR(vehicle.extraHourCharge),
            ]
          : null,
        (Number(vehicle.extraKmCharge ?? 0) > 0)
          ? ["Extra KM Charges", formatCurrencyINR(vehicle.extraKmCharge)]
          : null,
        ["6AM Charges (D)", formatCurrencyINR(vehicle.before6amDriver)],
        ["6AM Charges (V)", formatCurrencyINR(vehicle.before6amVendor)],
        ["8PM Charges (D)", formatCurrencyINR(vehicle.after8pmDriver)],
        ["8PM Charges (V)", formatCurrencyINR(vehicle.after8pmVendor)],
      ]
        .filter(Boolean)
        .map(
          ([label, value]) => `
          <tr>
            <td style="padding:6px 14px;border-bottom:1px solid #ececf1;color:#374151;font-weight:500;">${escapeHtml(label)}</td>
            <td style="padding:6px 14px;border-bottom:1px solid #ececf1;color:#111827;font-weight:600;text-align:right;white-space:nowrap;">${escapeHtml(value)}</td>
          </tr>
        `,
        )
        .join("");

      const distanceRows = [
        (vehicle.totalPickupKm ?? 0) > 0
          ? ["Total Pickup KM", Number(vehicle.totalPickupKm ?? 0).toFixed(2)]
          : null,
        (vehicle.totalPickupKm ?? 0) > 0
          ? ["Total Pickup Duration", vehicle.totalPickupDuration || "-"]
          : null,
        (vehicle.totalDropKm ?? 0) > 0
          ? ["Total Drop KM", Number(vehicle.totalDropKm ?? 0).toFixed(2)]
          : null,
        (vehicle.totalDropKm ?? 0) > 0
          ? ["Total Drop Duration", vehicle.totalDropDuration || "-"]
          : null,
        ["TOTAL USED KM", Number(vehicle.totalUsedKm ?? 0).toFixed(0)],
        [
          "TOTAL ALLOWED OUTSTATION KM",
          `${vehicle.totalAllowedKm != null && vehicle.totalDays ? `${Math.round((vehicle.totalAllowedKm) / vehicle.totalDays)} * ${vehicle.totalDays}` : (vehicle.totalAllowedKm ?? 0)} = ${Number(vehicle.totalAllowedKm ?? 0).toFixed(0)}`,
        ],
        (vehicle.extraKms ?? 0) > 0
          ? [
              "TOTAL EXTRA KM",
              `${Number(vehicle.extraKms ?? 0).toFixed(0)} * ₹${Number(vehicle.extraKmRate ?? 0).toFixed(2)} = ${formatCurrencyINR(vehicle.extraKmCharge)}`,
            ]
          : null,
      ]
        .filter(Boolean)
        .map(
          (row) => `
          <tr>
            <td style="padding:6px 14px;border-bottom:1px solid #ececf1;color:#374151;font-weight:500;">${escapeHtml((row as string[])[0])}</td>
            <td style="padding:6px 14px;border-bottom:1px solid #ececf1;color:#111827;font-weight:600;text-align:right;white-space:nowrap;">${escapeHtml((row as string[])[1])}</td>
          </tr>
        `,
        )
        .join("");

      const totalRows = [
        ["TOTAL COST OF VEHICLE", formatCurrencyINR(vehicle.totalCostOfVehicle)],
        ["SUBTOTAL", formatCurrencyINR(vehicle.subtotal)],
        (vehicle.vehicleGstAmount ?? 0) > 0
          ? [`GST (${vehicle.vehicleGstPercentage ?? 0}%)`, formatCurrencyINR(vehicle.vehicleGstAmount)]
          : null,
        (vehicle.vendorMarginAmount ?? 0) > 0
          ? [`DVI Margin (${vehicle.vendorMarginPercentage ?? 0}%)`, formatCurrencyINR(vehicle.vendorMarginAmount)]
          : null,
        (vehicle.vendorMarginGstAmount ?? 0) > 0
          ? [
              `DVI Margin Service Tax (${vehicle.vendorMarginGstPercentage ?? 0}%)`,
              formatCurrencyINR(vehicle.vendorMarginGstAmount),
            ]
          : null,
        [
          `GRAND TOTAL (${vehicle.totalQty || 1} x ${formatCurrencyINR(vehicle.grandTotal ?? vehicle.totalAmount)})`,
          formatCurrencyINR(vehicle.grandTotal ?? vehicle.totalAmount),
        ],
      ]
        .filter(Boolean)
        .map((row, idx, all) => {
          const isGrand = idx === all.length - 1;
          return `
          <tr>
            <td style="padding:${isGrand ? "8px 14px" : "6px 14px"};border-bottom:${isGrand ? "0" : "1px solid #ececf1"};color:${isGrand ? "#6d28d9" : "#374151"};font-weight:${isGrand ? "700" : "500"};font-size:${isGrand ? "16px" : "14px"};">${escapeHtml((row as string[])[0])}</td>
            <td style="padding:${isGrand ? "8px 14px" : "6px 14px"};border-bottom:${isGrand ? "0" : "1px solid #ececf1"};color:${isGrand ? "#6d28d9" : "#111827"};font-weight:${isGrand ? "700" : "600"};font-size:${isGrand ? "16px" : "14px"};text-align:right;white-space:nowrap;">${escapeHtml((row as string[])[1])}</td>
          </tr>
        `;
        })
        .join("");

      const html = `
        <div style="font-family:Calibri, Arial, sans-serif;font-size:14px;color:#1f2937; width:1120px; max-width:1120px;">
          <div style="font-size:28px;font-weight:700;color:#111827;margin-bottom:8px;">Day-wise Pricing Breakdown</div>
          <table cellpadding="0" cellspacing="0" border="0" style="width:1120px;border:1px solid #e5e7eb;border-radius:10px;overflow:hidden;border-collapse:separate;background:#fff;">
            <thead>
              <tr style="background:#e9dff5;color:#334155;">
                <th style="padding:6px 10px;text-align:left;font-weight:700;white-space:nowrap;">Date</th>
                <th style="padding:6px 10px;text-align:left;font-weight:700;">Route</th>
                <th style="padding:6px 10px;text-align:right;font-weight:700;white-space:nowrap;">Pickup KM</th>
                <th style="padding:6px 10px;text-align:right;font-weight:700;white-space:nowrap;">Travel KM</th>
                <th style="padding:6px 10px;text-align:right;font-weight:700;white-space:nowrap;">Sightseeing KM</th>
                <th style="padding:6px 10px;text-align:right;font-weight:700;white-space:nowrap;">Total KM</th>
                <th style="padding:6px 10px;text-align:right;font-weight:700;white-space:nowrap;">Rental</th>
                <th style="padding:6px 10px;text-align:right;font-weight:700;white-space:nowrap;">Toll</th>
                <th style="padding:6px 10px;text-align:right;font-weight:700;white-space:nowrap;">Parking</th>
                <th style="padding:6px 10px;text-align:right;font-weight:700;white-space:nowrap;">Driver</th>
                <th style="padding:6px 10px;text-align:right;font-weight:700;white-space:nowrap;">Permit</th>
                <th style="padding:6px 10px;text-align:right;font-weight:700;white-space:nowrap;">Extra Hour</th>
                <th style="padding:6px 10px;text-align:right;font-weight:700;white-space:nowrap;">Extra KM</th>
                <th style="padding:6px 10px;text-align:right;font-weight:700;white-space:nowrap;">Drop KM</th>
                <th style="padding:6px 10px;text-align:right;font-weight:700;white-space:nowrap;">Total</th>
              </tr>
            </thead>
            <tbody>${dayRows}</tbody>
          </table>

          <div style="height:12px;"></div>

          <table cellpadding="0" cellspacing="0" border="0" style="width:1120px;border:1px solid #e5e7eb;border-radius:10px;overflow:hidden;border-collapse:separate;background:#fff;">
            <thead>
              <tr style="background:#e9dff5;"><th colspan="2" style="padding:8px 14px;text-align:left;font-size:28px;font-weight:700;color:#334155;">Charge Summary</th></tr>
            </thead>
            <tbody>${chargeRows}</tbody>
          </table>

          <div style="height:12px;"></div>

          <table cellpadding="0" cellspacing="0" border="0" style="width:1120px;border:1px solid #e5e7eb;border-radius:10px;overflow:hidden;border-collapse:separate;background:#fff;">
            <thead>
              <tr style="background:#e9dff5;"><th colspan="2" style="padding:8px 14px;text-align:left;font-size:28px;font-weight:700;color:#334155;">Distance Summary</th></tr>
            </thead>
            <tbody>${distanceRows}</tbody>
          </table>

          <div style="height:12px;"></div>

          <table cellpadding="0" cellspacing="0" border="0" style="width:1120px;border:1px solid #e5e7eb;border-radius:10px;overflow:hidden;border-collapse:separate;background:#fff;">
            <thead>
              <tr style="background:#6d28d9;"><th colspan="2" style="padding:8px 14px;text-align:left;font-size:28px;font-weight:700;color:#fff;">Consolidated Totals</th></tr>
            </thead>
            <tbody>${totalRows}</tbody>
          </table>
        </div>
      `;

      const plainText = `Vehicle Breakdown\n${(vehicle.dayWisePricing || [])
        .map((dp) => `${dp.dayLabel} | ${dp.route} | ${Number(dp.totalCharges || 0).toFixed(2)}`)
        .join("\n")}`;

      if (navigator.clipboard && (window as any).ClipboardItem) {
        const htmlBlob = new Blob([html], { type: "text/html" });
        const textBlob = new Blob([plainText], { type: "text/plain" });
        await navigator.clipboard.write([
          new (window as any).ClipboardItem({
            "text/html": htmlBlob,
            "text/plain": textBlob,
          }),
        ]);
      } else {
        await navigator.clipboard.writeText(plainText);
      }
    } catch (error) {
      throw error;
    }
  };

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

  useEffect(() => {
    if (!itineraryPlanId || !vehicleTypeId || vehicles.length === 0) return;

    const syncKey = `${itineraryPlanId}_${vehicleTypeId}`;
    if (autoSlabSyncKeysRef.current.has(syncKey)) return;

    autoSlabSyncKeysRef.current.add(syncKey);
    let cancelled = false;

    (async () => {
      try {
        setIsAutoSelectingSlabs(true);
        const result = await ItineraryService.autoSelectVehicleSlabs(itineraryPlanId, vehicleTypeId);
        const updatedCount = Number((result as any)?.updatedCount || 0);
        if (!cancelled && updatedCount > 0) {
          toast.success(`Auto-selected slab for ${updatedCount} vendor option(s)`);
          onRefresh?.();
        }
      } catch (error) {
        console.error(`[${vehicleTypeLabel}] Failed to auto-select slabs:`, error);
        if (!cancelled) {
          toast.error("Failed to auto-select slabs");
        }
      } finally {
        if (!cancelled) {
          setIsAutoSelectingSlabs(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [itineraryPlanId, vehicleTypeId, vehicles.length, onRefresh, vehicleTypeLabel]);


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
                        <div className="ml-6 space-y-3">

                          <div style={{ width: '100%' }} className="space-y-3">

                          {/* ── Day-wise per-route table ── */}
                          <div>
                            <div className="flex items-center justify-between gap-3 mb-2">
                              <h6 className="text-sm font-semibold text-gray-900">Day-wise Pricing Breakdown</h6>
                              <div className="flex items-center gap-2">
                                {isAutoSelectingSlabs && (
                                  <span className="inline-flex items-center gap-1 rounded-md border border-purple-200 bg-purple-50 px-2 py-1 text-[11px] font-semibold text-purple-700">
                                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                    Auto selecting slab...
                                  </span>
                                )}
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
                            <div className="overflow-x-auto">
                              <table className="w-full text-xs border border-gray-200 rounded-lg overflow-hidden bg-white">
                                <thead>
                                  <tr className="bg-purple-100 border-b border-gray-200">
                                    <th className="text-left py-1.5 px-2.5 font-semibold text-gray-700 whitespace-nowrap">Date</th>
                                    <th className="text-left py-1.5 px-2.5 font-semibold text-gray-700">Route</th>
                                    <th className="text-right py-1.5 px-2.5 font-semibold text-gray-700 whitespace-nowrap">Pickup KM</th>
                                    <th className="text-right py-1.5 px-2.5 font-semibold text-gray-700 whitespace-nowrap">Travel KM</th>
                                    <th className="text-right py-1.5 px-2.5 font-semibold text-gray-700 whitespace-nowrap">Sightseeing KM</th>
                                    <th className="text-right py-1.5 px-2.5 font-semibold text-gray-700 whitespace-nowrap">Total KM</th>
                                    <th className="text-right py-1.5 px-2.5 font-semibold text-gray-700 whitespace-nowrap">Rental</th>
                                    <th className="text-right py-1.5 px-2.5 font-semibold text-gray-700 whitespace-nowrap">Toll</th>
                                    <th className="text-right py-1.5 px-2.5 font-semibold text-gray-700 whitespace-nowrap">Parking</th>
                                    <th className="text-right py-1.5 px-2.5 font-semibold text-gray-700 whitespace-nowrap">Driver</th>
                                    <th className="text-right py-1.5 px-2.5 font-semibold text-gray-700 whitespace-nowrap">Permit</th>
                                    <th className="text-right py-1.5 px-2.5 font-semibold text-gray-700 whitespace-nowrap">Extra Hour</th>
                                    <th className="text-right py-1.5 px-2.5 font-semibold text-gray-700 whitespace-nowrap">Extra KM</th>
                                    <th className="text-right py-1.5 px-2.5 font-semibold text-gray-700 whitespace-nowrap">Drop KM</th>
                                    <th className="text-right py-1.5 px-2.5 font-semibold text-gray-700 whitespace-nowrap">Total</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {v.dayWisePricing.map((dp, di) => (
                                    <tr key={di} className={`border-b border-gray-100 ${di % 2 === 0 ? 'bg-white' : 'bg-purple-50/40'} hover:bg-purple-100 transition-colors`}>
                                      <td className="py-1.5 px-2.5 text-gray-700 font-medium whitespace-nowrap">{dp.dayLabel}</td>
                                      <td className="py-1.5 px-2.5 text-gray-600 leading-5 break-words">{dp.route}</td>
                                      <td className="py-1.5 px-2.5 text-right text-gray-700 font-semibold whitespace-nowrap">{(dp.pickupKms ?? 0).toFixed(2)} KM</td>
                                      <td className="py-1.5 px-2.5 text-right text-gray-700 font-semibold whitespace-nowrap">{(dp.travelKms ?? 0).toFixed(2)} KM</td>
                                      <td className="py-1.5 px-2.5 text-right text-gray-700 font-semibold whitespace-nowrap">{(dp.sightseeingKms ?? 0).toFixed(2)} KM</td>
                                      <td className="py-1.5 px-2.5 text-right text-gray-700 font-semibold whitespace-nowrap">{(dp.totalKms ?? 0).toFixed(2)} KM</td>
                                      <td className="py-1.5 px-2.5 text-right text-gray-700 whitespace-nowrap">{formatCurrencyINR(dp.rentalCharges)}</td>
                                      <td className="py-1.5 px-2.5 text-right text-gray-700 whitespace-nowrap">{formatCurrencyINR(dp.tollCharges)}</td>
                                      <td className="py-1.5 px-2.5 text-right text-gray-700 whitespace-nowrap">{formatCurrencyINR(dp.parkingCharges)}</td>
                                      <td className="py-1.5 px-2.5 text-right text-gray-700 whitespace-nowrap">{formatCurrencyINR(dp.driverCharges)}</td>
                                      <td className="py-1.5 px-2.5 text-right text-gray-700 whitespace-nowrap">{formatCurrencyINR(dp.permitCharges)}</td>
                                      <td className="py-1.5 px-2.5 text-right text-gray-700 whitespace-nowrap">{formatCurrencyINR(dp.extraHourCharges)}</td>
                                      <td className="py-1.5 px-2.5 text-right text-gray-700 whitespace-nowrap">{formatCurrencyINR(dp.extraKmCharges)}</td>
                                      <td className="py-1.5 px-2.5 text-right text-gray-700 font-semibold whitespace-nowrap">{(dp.dropKms ?? 0).toFixed(2)} KM</td>
                                      <td className="py-1.5 px-2.5 text-right text-purple-700 font-bold whitespace-nowrap">{formatCurrencyINR(dp.totalCharges)}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </div>

                          {/* ── Stacked full-width summary tables ── */}
                          <div className="space-y-3">
                            <div className="overflow-x-auto">
                              <table
                                className="w-full border border-gray-200 rounded-lg overflow-hidden bg-white text-sm table-fixed"
                              >
                                <thead>
                                  <tr className="bg-purple-100 border-b border-gray-200">
                                    <th colSpan={2} className="px-3 py-2 text-left font-semibold text-gray-700">
                                      Charge Summary
                                    </th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {[
                                    { label: 'Total Days', value: String(v.totalDays ?? v.dayWisePricing.length) },
                                    { label: 'Rental Charges', value: formatCurrencyINR(v.rentalCharges) },
                                    { label: 'Toll Charges', value: formatCurrencyINR(v.tollCharges) },
                                    { label: 'Parking Charges', value: formatCurrencyINR(v.parkingCharges) },
                                    { label: 'Driver Charges', value: formatCurrencyINR(v.driverCharges) },
                                    { label: 'Permit Charges', value: formatCurrencyINR(v.permitCharges) },
                                    ...(Number(v.extraHourCharge ?? 0) > 0
                                      ? [{
                                          label: `Extra Hour Charges (Rs ${Number(v.extraHourRate ?? 0).toFixed(0)} * ${Number(v.extraHourCount ?? 0).toFixed(0)} hrs)`,
                                          value: formatCurrencyINR(v.extraHourCharge),
                                        }]
                                      : []),
                                    ...(Number(v.extraKmCharge ?? 0) > 0
                                      ? [{ label: 'Extra KM Charges', value: formatCurrencyINR(v.extraKmCharge) }]
                                      : []),
                                    { label: '6AM Charges (D)', value: formatCurrencyINR(v.before6amDriver) },
                                    { label: '6AM Charges (V)', value: formatCurrencyINR(v.before6amVendor) },
                                    { label: '8PM Charges (D)', value: formatCurrencyINR(v.after8pmDriver) },
                                    { label: '8PM Charges (V)', value: formatCurrencyINR(v.after8pmVendor) },
                                  ].map(({ label, value }) => (
                                    <tr key={label} className="border-b border-gray-100 last:border-b-0">
                                      <td className="w-1/2 px-3 py-1.5 text-gray-600 font-medium">{label}</td>
                                      <td className="w-1/2 px-3 py-1.5 text-right text-gray-800 font-semibold">{value}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>

                            <div className="overflow-x-auto">
                              <table
                                className="w-full border border-gray-200 rounded-lg overflow-hidden bg-white text-sm table-fixed"
                              >
                                <thead>
                                  <tr className="bg-purple-100 border-b border-gray-200">
                                    <th colSpan={2} className="px-3 py-2 text-left font-semibold text-gray-700">
                                      Distance Summary
                                    </th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {(v.totalPickupKm ?? 0) > 0 && (
                                    <>
                                      <tr className="border-b border-gray-100">
                                        <td className="w-1/2 px-3 py-1.5 text-gray-600 font-medium">Total Pickup KM</td>
                                        <td className="w-1/2 px-3 py-1.5 text-right text-gray-800 font-semibold">{(v.totalPickupKm ?? 0).toFixed(2)}</td>
                                      </tr>
                                      <tr className="border-b border-gray-100">
                                        <td className="w-1/2 px-3 py-1.5 text-gray-600 font-medium">Total Pickup Duration</td>
                                        <td className="w-1/2 px-3 py-1.5 text-right text-gray-800 font-semibold">{v.totalPickupDuration}</td>
                                      </tr>
                                    </>
                                  )}
                                  {(v.totalDropKm ?? 0) > 0 && (
                                    <>
                                      <tr className="border-b border-gray-100">
                                        <td className="w-1/2 px-3 py-1.5 text-gray-600 font-medium">Total Drop KM</td>
                                        <td className="w-1/2 px-3 py-1.5 text-right text-gray-800 font-semibold">{(v.totalDropKm ?? 0).toFixed(2)}</td>
                                      </tr>
                                      <tr className="border-b border-gray-100">
                                        <td className="w-1/2 px-3 py-1.5 text-gray-600 font-medium">Total Drop Duration</td>
                                        <td className="w-1/2 px-3 py-1.5 text-right text-gray-800 font-semibold">{v.totalDropDuration}</td>
                                      </tr>
                                    </>
                                  )}
                                  <tr className="border-b border-gray-100">
                                    <td className="w-1/2 px-3 py-1.5 text-gray-700 font-semibold">TOTAL USED KM</td>
                                    <td className="w-1/2 px-3 py-1.5 text-right text-gray-800 font-semibold">{(v.totalUsedKm ?? 0).toFixed(0)}</td>
                                  </tr>
                                  <tr className="border-b border-gray-100">
                                    <td className="w-1/2 px-3 py-1.5 text-gray-600 font-medium">TOTAL ALLOWED OUTSTATION KM</td>
                                    <td className="w-1/2 px-3 py-1.5 text-right text-gray-800 font-semibold">
                                      {v.totalAllowedKm != null && v.totalDays
                                        ? `${Math.round((v.totalAllowedKm) / (v.totalDays))} * ${v.totalDays}`
                                        : (v.totalAllowedKm ?? 0)}{' '}
                                      = {(v.totalAllowedKm ?? 0).toFixed(0)}
                                    </td>
                                  </tr>
                                  {(v.extraKms ?? 0) > 0 && (
                                    <tr>
                                      <td className="w-1/2 px-3 py-1.5 text-gray-600 font-medium">TOTAL EXTRA KM</td>
                                      <td className="w-1/2 px-3 py-1.5 text-right text-gray-800 font-semibold">
                                        {(v.extraKms ?? 0).toFixed(0)} * ₹{(v.extraKmRate ?? 0).toFixed(2)} = {formatCurrencyINR(v.extraKmCharge)}
                                      </td>
                                    </tr>
                                  )}
                                </tbody>
                              </table>
                            </div>

                            <div className="overflow-x-auto">
                              <table
                                className="w-full border border-gray-200 rounded-lg overflow-hidden bg-white text-sm table-fixed"
                              >
                                <thead>
                                  <tr className="bg-purple-600 border-b border-purple-300">
                                    <th colSpan={2} className="px-3 py-2 text-left font-semibold text-white">
                                      Consolidated Totals
                                    </th>
                                  </tr>
                                </thead>
                                <tbody>
                                  <tr className="border-b border-gray-100">
                                    <td className="w-1/2 px-3 py-1.5 text-gray-700 font-semibold">TOTAL COST OF VEHICLE</td>
                                    <td className="w-1/2 px-3 py-1.5 text-right text-gray-800 font-semibold">{formatCurrencyINR(v.totalCostOfVehicle)}</td>
                                  </tr>
                                  <tr className="border-b border-gray-100">
                                    <td className="w-1/2 px-3 py-1.5 text-gray-700 font-semibold">SUBTOTAL</td>
                                    <td className="w-1/2 px-3 py-1.5 text-right text-gray-800 font-semibold">{formatCurrencyINR(v.subtotal)}</td>
                                  </tr>
                                  {(v.vehicleGstAmount ?? 0) > 0 && (
                                    <tr className="border-b border-gray-100">
                                      <td className="w-1/2 px-3 py-1.5 text-gray-600 font-medium">GST ({v.vehicleGstPercentage ?? 0}%)</td>
                                      <td className="w-1/2 px-3 py-1.5 text-right text-gray-800 font-semibold">{formatCurrencyINR(v.vehicleGstAmount)}</td>
                                    </tr>
                                  )}
                                  {(v.vendorMarginAmount ?? 0) > 0 && (
                                    <tr className="border-b border-gray-100">
                                      <td className="w-1/2 px-3 py-1.5 text-gray-600 font-medium">DVI Margin ({v.vendorMarginPercentage ?? 0}%)</td>
                                      <td className="w-1/2 px-3 py-1.5 text-right text-gray-800 font-semibold">{formatCurrencyINR(v.vendorMarginAmount)}</td>
                                    </tr>
                                  )}
                                  {(v.vendorMarginGstAmount ?? 0) > 0 && (
                                    <tr className="border-b border-gray-100">
                                      <td className="w-1/2 px-3 py-1.5 text-gray-600 font-medium">DVI Margin Service Tax ({v.vendorMarginGstPercentage ?? 0}%)</td>
                                      <td className="w-1/2 px-3 py-1.5 text-right text-gray-800 font-semibold">{formatCurrencyINR(v.vendorMarginGstAmount)}</td>
                                    </tr>
                                  )}
                                  <tr>
                                    <td className="w-1/2 px-3 py-2 text-purple-700 font-bold text-base">GRAND TOTAL ({v.totalQty || 1} x {formatCurrencyINR(v.grandTotal ?? v.totalAmount)})</td>
                                    <td className="w-1/2 px-3 py-2 text-right text-purple-700 font-bold text-base">{formatCurrencyINR(v.grandTotal ?? v.totalAmount)}</td>
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