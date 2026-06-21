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
  travelType?: string;
  timeLimitId?: number;
  slabTitle?: string;
  slabHoursLimit?: number;
  slabKmLimit?: number;
  pickupKms: number;
  pickupDurationMinutes?: number;
  dropKms: number;
  dropDurationMinutes?: number;
  travelKms: number; // Travel KM per day
  travelDurationMinutes?: number;
  sightseeingKms: number; // Sightseeing KM per day
  sightseeingDurationMinutes?: number;
  totalDurationMinutes?: number;
  totalKms: number; // Total KM per day
  rentalCharges: number;
  tollCharges: number;
  tollBreakupText?: string[];
  parkingCharges: number;
  parkingBreakupText?: string[];
  driverCharges: number;
  permitCharges: number;
  extraHourCount: number;
  extraHourRate: number;
  extraHourCharges: number;
  extraKms: number;
  extraKmCharges: number;
  totalCharges: number;
}

export interface ItineraryVehicleRow {
  vendorName?: string | null;
  branchName?: string | null;
  vehicleOrigin?: string | null;
  totalQty?: string | null;
  totalAmount?: number | string | null;
  vehicleId?: number | null;
  vehicleIds?: number[];
  vehicleNumber?: string | null;
  vehicleNumbers?: string[];
  availableVehicleCount?: number;
  vehicleRegistrationNumber?: string | null;
  vehicleRegistrationStateCode?: string | null;
  vehicleRegistrationStateName?: string | null;
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
  localTrip?: boolean;
  dayWisePricing?: DayWisePricingItem[];
  // PHP summary panel fields
  totalDays?: number;
  totalCostOfVehicle?: number;
  totalPickupKm?: number;
  totalPickupDuration?: string;
  totalDropKm?: number;
  totalDropDuration?: string;
  totalUsedKm?: number;
  totalAllowedLocalKm?: number;
  totalAllowedOutstationKm?: number;
  totalAllowedKm?: number;
  localDaysCount?: number;
  outstationDaysCount?: number;
  outstationAllowedKmPerDay?: number;
  localAllowedKmBreakdown?: Array<{
    timeLimitId?: number;
    allowedKm: number;
    days: number;
    label?: string;
  }>;
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

const toNumber = (value: unknown): number => {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  const parsed = Number(String(value ?? "").replace(/,/g, "").trim());
  return Number.isFinite(parsed) ? parsed : 0;
};

const formatKm = (value: unknown): string => {
  const n = toNumber(value);
  return Number.isInteger(n) ? String(n) : n.toFixed(2);
};

const getAllowedKmSummaryRows = (vehicle: ItineraryVehicleRow): Array<[string, string]> => {
  const totalAllowedLocalKm = toNumber(vehicle.totalAllowedLocalKm);
  const totalAllowedOutstationKm = toNumber(vehicle.totalAllowedOutstationKm);
  const totalAllowedKm = toNumber(vehicle.totalAllowedKm);
  const localDaysCount = toNumber(vehicle.localDaysCount);
  const outstationAllowedKmPerDay = toNumber(vehicle.outstationAllowedKmPerDay);
  const outstationDaysCount = toNumber(vehicle.outstationDaysCount);

  const rows: Array<[string, string]> = [];

  if (totalAllowedLocalKm > 0) {
    rows.push([
      "TOTAL ALLOWED LOCAL KM",
      localDaysCount > 0
        ? `${formatKm(totalAllowedLocalKm / localDaysCount)} * ${formatKm(localDaysCount)} = ${formatKm(totalAllowedLocalKm)}`
        : formatKm(totalAllowedLocalKm),
    ]);
  }

  if (totalAllowedOutstationKm > 0) {
    rows.push([
      "TOTAL ALLOWED OUTSTATION KM",
      outstationAllowedKmPerDay > 0 && outstationDaysCount > 0
        ? `${formatKm(outstationAllowedKmPerDay)} * ${formatKm(outstationDaysCount)} = ${formatKm(totalAllowedOutstationKm)}`
        : formatKm(totalAllowedOutstationKm),
    ]);
  }

  if (totalAllowedKm > 0) {
    rows.push(["TOTAL ALLOWED KM", formatKm(totalAllowedKm)]);
  }

  if (!rows.length && totalAllowedKm > 0) {
    rows.push(["TOTAL ALLOWED KM", formatKm(totalAllowedKm)]);
  }

  return rows;
};

const readVehicleSubtotal = (vehicle: ItineraryVehicleRow): number =>
  toAmount(vehicle.subtotal);

const readVehicleGstPercentage = (vehicle: ItineraryVehicleRow): number =>
  toAmount(vehicle.vehicleGstPercentage) || 5;

const readVehicleVendorMarginPercentage = (vehicle: ItineraryVehicleRow): number =>
  toAmount(vehicle.vendorMarginPercentage) || 10;

const readVehicleMarginServiceTaxPercentage = (vehicle: ItineraryVehicleRow): number =>
  toAmount(vehicle.vendorMarginGstPercentage) || 5;

const readVehicleGstAmount = (vehicle: ItineraryVehicleRow): number => {
  return toAmount(vehicle.vehicleGstAmount);
};

const readVehicleExtraKmCharge = (vehicle: ItineraryVehicleRow): number =>
  toAmount(vehicle.extraKmCharge);

const readVehicleExtraHourCharge = (vehicle: ItineraryVehicleRow): number =>
  toAmount(vehicle.extraHourCharge);

const readVehicleVendorMarginAmount = (vehicle: ItineraryVehicleRow): number =>
  toAmount(vehicle.vendorMarginAmount);

const readVehicleMarginServiceTaxAmount = (vehicle: ItineraryVehicleRow): number => {
  return toAmount(vehicle.vendorMarginGstAmount);
};

const readVehicleGrandTotal = (vehicle: ItineraryVehicleRow): number =>
  toAmount(vehicle.grandTotal);

const resolveVehicleDisplayAmount = (vehicle: ItineraryVehicleRow): number => {
  return toAmount(vehicle.grandTotal) || toAmount(vehicle.totalAmount);
};

const formatTotalTime = (day: DayWisePricingItem): string => {
  const computedTotalMinutes =
    Number(day.totalDurationMinutes ?? 0) ||
    (
      Number(day.pickupDurationMinutes ?? 0) +
      Number(day.travelDurationMinutes ?? 0) +
      Number(day.dropDurationMinutes ?? 0)
    );

  const safeTotalMinutes = Math.max(0, Math.round(computedTotalMinutes));

  if (safeTotalMinutes <= 0) {
    const slabHours = Number(day.slabHoursLimit ?? 0);
    const extraHours = Number(day.extraHourCount ?? 0);
    const fallbackHours = slabHours + extraHours;
    if (fallbackHours > 0) return `${fallbackHours} HRS`;
    return "-";
  }

  const hours = Math.floor(safeTotalMinutes / 60);
  const minutes = safeTotalMinutes % 60;

  if (minutes === 0) {
    return `${hours} HRS`;
  }

  return `${hours} HRS ${minutes} MIN`;
};

const formatMinutesDuration = (value?: number): string => {
  const safeTotalMinutes = Math.max(0, Math.round(Number(value ?? 0)));
  if (safeTotalMinutes <= 0) return "-";
  const hours = Math.floor(safeTotalMinutes / 60);
  const minutes = safeTotalMinutes % 60;
  if (minutes === 0) return `${hours} HRS`;
  return `${hours} HRS ${minutes} MIN`;
};

const splitDurationLines = (formattedDuration: string): string[] => {
  const text = String(formattedDuration || "").trim();
  if (!text || text === "-") return ["-"];

  const parts = text.match(/\d+\s+HRS|\d+\s+MIN/gi) || [];
  if (parts.length) return parts;

  return [text];
};

const isOutstationDay = (day: DayWisePricingItem): boolean =>
  String(day.travelType || '').toLowerCase() === 'outstation';

const hasUnavailableVendorRate = (day: DayWisePricingItem): boolean =>
  toNumber(day.totalKms) > 0 && toNumber(day.rentalCharges) <= 0;

const vehicleHasUnavailableOutstationRate = (vehicle: ItineraryVehicleRow): boolean =>
  Array.isArray(vehicle.dayWisePricing) && vehicle.dayWisePricing.some(hasUnavailableVendorRate);

const getRentalCellLines = (day: DayWisePricingItem): string[] => {
  if (hasUnavailableVendorRate(day)) {
    return isOutstationDay(day)
      ? ['Outstation', 'Rates not available']
      : ['Rates not available'];
  }
  const amount = formatCurrencyINR(Number(day.rentalCharges || 0));
  return isOutstationDay(day) ? ['Outstation', amount] : [amount];
};

const getVehicleRentalSummaryText = (vehicle: ItineraryVehicleRow): string =>
  vehicleHasUnavailableOutstationRate(vehicle)
    ? 'Rates not available'
    : formatCurrencyINR(vehicle.rentalCharges);

const getSlabDisplayText = (day: DayWisePricingItem): string => {
  const slabTitle = String(day.slabTitle || "-").trim();

  if (!slabTitle || slabTitle === "-") {
    return "-";
  }

  const cleanSlabTitle = slabTitle.replace(/^SLAB:\s*/i, "");

  return isOutstationDay(day)
    ? cleanSlabTitle
    : `SLAB: ${cleanSlabTitle}`;
};

const getDayLabelParts = (dayLabel: string | undefined): { dayPart: string; datePart: string } => {
  const [dayPartRaw, datePartRaw] = String(dayLabel || "").split("|");
  return {
    dayPart: (dayPartRaw || "").trim(),
    datePart: (datePartRaw || "").trim(),
  };
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
  const prevAmount = resolveVehicleDisplayAmount(prev);
  const currAmount = resolveVehicleDisplayAmount(curr);

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
  const [vehicleOriginTooltip, setVehicleOriginTooltip] = useState<{
    index: number;
    left: number;
    top: number;
  } | null>(null);
  const [expandedVendorEligibleId, setExpandedVendorEligibleId] = useState<number | string | null>(null);
  const [selectedVendorEligibleId, setSelectedVendorEligibleId] = useState<number | null>(null);
  const [carouselIndex, setCarouselIndex] = useState(0);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [pendingVendorSelection, setPendingVendorSelection] = useState<{
    index: number;
    vendorEligibleId: number;
    vehicleTypeId: number;
    vendorName: string;
  } | null>(null);
  const [isUpdatingVehicle, setIsUpdatingVehicle] = useState(false);
  const [copiedVendorIndex, setCopiedVendorIndex] = useState<number | null>(null);
  const vehicleIdentitySignature = useMemo(
    () =>
      vehicles
        .map(
          (v) =>
            `${v.vehicleTypeId || 0}:${v.vendorEligibleId || 0}:${v.totalAmount || ""}:${v.dayWisePricing?.map((d) => d.totalKms).join("|") || ""}`
        )
        .join(","),
    [vehicles]
  );

  useEffect(() => {
    setExpandedVendorEligibleId(null);
    setHoveredTotalAmountIndex(null);
    setVehicleOriginTooltip(null);
  }, [vehicleIdentitySignature]);

  const getFloatingTooltipPosition = (
    clientX: number,
    clientY: number,
    tooltipWidth = 320,
    tooltipHeight = 150,
  ) => {
    const padding = 12;
    const offset = 14;

    let left = clientX + offset;
    let top = clientY + offset;

    if (left + tooltipWidth + padding > window.innerWidth) {
      left = clientX - tooltipWidth - offset;
    }

    if (top + tooltipHeight + padding > window.innerHeight) {
      top = clientY - tooltipHeight - offset;
    }

    return {
      left: Math.max(padding, left),
      top: Math.max(padding, top),
    };
  };

  const showVehicleOriginTooltip = (
    index: number,
    event: React.MouseEvent<HTMLElement>,
  ) => {
    const position = getFloatingTooltipPosition(event.clientX, event.clientY);
    setVehicleOriginTooltip({
      index,
      ...position,
    });
  };

  const moveVehicleOriginTooltip = (
    index: number,
    event: React.MouseEvent<HTMLElement>,
  ) => {
    setVehicleOriginTooltip((current) => {
      if (!current || current.index !== index) return current;

      const position = getFloatingTooltipPosition(event.clientX, event.clientY);
      return {
        index,
        ...position,
      };
    });
  };

  const hideVehicleOriginTooltip = () => {
    setVehicleOriginTooltip(null);
  };

  const showVehicleOriginTooltipFromFocus = (
    index: number,
    event: React.FocusEvent<HTMLElement>,
  ) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const position = getFloatingTooltipPosition(rect.right, rect.top);
    setVehicleOriginTooltip({
      index,
      ...position,
    });
  };

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
            const { dayPart, datePart } = getDayLabelParts(dp.dayLabel);

            return `
          <tr>
            <td style="padding:3px 4px;border:1px solid #cfd4dc;color:#1f2937;font-weight:500;white-space:nowrap;line-height:1.25;vertical-align:top;">
              <div style="font-weight:600;">${escapeHtml(dayPart || String(dp.dayLabel || ''))}</div>
              ${datePart ? `<div style="font-weight:500;">${escapeHtml(datePart)}</div>` : ''}
              <div style="font-weight:600;">Time: ${escapeHtml(formatTotalTime(dp))}</div>
              <div style="font-weight:600;">${escapeHtml(dp.slabTitle || '-')}</div>
            </td>
            <td style="padding:3px 4px;border:1px solid #cfd4dc;color:#374151;">${escapeHtml(dp.route)}</td>
            <td style="padding:3px 4px;border:1px solid #cfd4dc;color:#1f2937;font-weight:600;line-height:1.2;white-space:nowrap;">
              <div>Pickup KM: ${Number(dp.pickupKms ?? 0).toFixed(2)} KM</div>
              <div>Pickup Time: ${escapeHtml(formatMinutesDuration(dp.pickupDurationMinutes))}</div>
              <div>Drop KM: ${Number(dp.dropKms ?? 0).toFixed(2)} KM</div>
              <div>Drop Time: ${escapeHtml(formatMinutesDuration(dp.dropDurationMinutes))}</div>
            </td>
            <td style="padding:3px 4px;border:1px solid #cfd4dc;color:#1f2937;font-weight:600;text-align:right;white-space:nowrap;">${Number(dp.travelKms ?? 0).toFixed(2)} KM</td>
            <td style="padding:3px 4px;border:1px solid #cfd4dc;color:#1f2937;font-weight:600;text-align:right;white-space:nowrap;">${Number(dp.sightseeingKms ?? 0).toFixed(2)} KM</td>
            <td style="padding:3px 4px;border:1px solid #cfd4dc;color:#1f2937;font-weight:600;text-align:right;white-space:nowrap;line-height:1.2;">${splitDurationLines(formatMinutesDuration(dp.travelDurationMinutes)).map((line) => `<div>${escapeHtml(line)}</div>`).join("")}</td>
            <td style="padding:3px 4px;border:1px solid #cfd4dc;color:#1f2937;font-weight:600;text-align:right;white-space:nowrap;">${Number(dp.totalKms ?? 0).toFixed(2)} KM</td>
            <td style="padding:3px 4px;border:1px solid #cfd4dc;color:#1f2937;text-align:right;white-space:nowrap;line-height:1.2;">${getRentalCellLines(dp).map((line) => `<div>${escapeHtml(line)}</div>`).join("")}</td>
              <td style="padding:3px 4px;border:1px solid #cfd4dc;color:#1f2937;text-align:right;white-space:nowrap;" title="${escapeHtml(dp.tollBreakupText?.length ? `Toll Breakup\n${dp.tollBreakupText.join('\n')}` : '')}">${escapeHtml(formatCurrencyINR(dp.tollCharges))}</td>
              <td style="padding:3px 4px;border:1px solid #cfd4dc;color:#1f2937;text-align:right;white-space:nowrap;" title="${escapeHtml(dp.parkingBreakupText?.length ? `Parking Breakup\n${dp.parkingBreakupText.join('\n')}` : '')}">${escapeHtml(formatCurrencyINR(dp.parkingCharges))}</td>
            <td style="padding:3px 4px;border:1px solid #cfd4dc;color:#1f2937;text-align:right;white-space:nowrap;">${escapeHtml(formatCurrencyINR(dp.driverCharges))}</td>
            <td style="padding:3px 4px;border:1px solid #cfd4dc;color:#1f2937;text-align:right;white-space:nowrap;">${escapeHtml(formatCurrencyINR(dp.permitCharges))}</td>
            <td style="padding:3px 4px;border:1px solid #cfd4dc;color:#6d28d9;font-weight:700;text-align:right;white-space:nowrap;">${escapeHtml(formatCurrencyINR(dp.totalCharges))}</td>
          </tr>
        `;
          },
        )
        .join("");

      const chargeRows = [
        ["Total Days", String(vehicle.totalDays ?? vehicle.dayWisePricing?.length ?? 0)],
        ["Rental Charges", getVehicleRentalSummaryText(vehicle)],
        ["Toll Charges", formatCurrencyINR(vehicle.tollCharges)],
        ["Parking Charges", formatCurrencyINR(vehicle.parkingCharges)],
        ["Driver Charges", formatCurrencyINR(vehicle.driverCharges)],
        ["Permit Charges", formatCurrencyINR(vehicle.permitCharges)],
        (readVehicleExtraHourCharge(vehicle) > 0)
          ? [
              `Extra Hour Charges (Rs ${Number(vehicle.extraHourRate ?? 0).toFixed(0)} * ${Number(vehicle.extraHourCount ?? 0).toFixed(0)} hrs)`,
              formatCurrencyINR(readVehicleExtraHourCharge(vehicle)),
            ]
          : null,
        ["Before 6 AM Charges (D)", formatCurrencyINR(vehicle.before6amDriver)],
        ["Before 6 AM Charges (V)", formatCurrencyINR(vehicle.before6amVendor)],
        ["After 8 PM Charges (D)", formatCurrencyINR(vehicle.after8pmDriver)],
        ["After 8 PM Charges (V)", formatCurrencyINR(vehicle.after8pmVendor)],
      ]
        .filter(Boolean)
        .map(
          ([label, value]) => `
          <tr>
            <td style="padding:3px 4px;border:1px solid #cfd4dc;color:#374151;font-weight:500;">${escapeHtml(label)}</td>
            <td style="padding:3px 4px;border:1px solid #cfd4dc;color:#111827;font-weight:600;text-align:right;white-space:nowrap;">${escapeHtml(value)}</td>
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
        ...getAllowedKmSummaryRows(vehicle),
        (vehicle.extraKms ?? 0) > 0
          ? [
              "TOTAL EXTRA KM",
              `${Number(vehicle.extraKms ?? 0).toFixed(0)} * ₹${Number(vehicle.extraKmRate ?? 0).toFixed(2)} = ${formatCurrencyINR(readVehicleExtraKmCharge(vehicle))}`,
            ]
          : null,
      ]
        .filter(Boolean)
        .map(
          (row) => `
          <tr>
            <td style="padding:3px 4px;border:1px solid #cfd4dc;color:#374151;font-weight:500;">${escapeHtml((row as string[])[0])}</td>
            <td style="padding:3px 4px;border:1px solid #cfd4dc;color:#111827;font-weight:600;text-align:right;white-space:nowrap;">${escapeHtml((row as string[])[1])}</td>
          </tr>
        `,
        )
        .join("");


     const vehicleSubtotal = readVehicleSubtotal(vehicle);
const vehicleGstPercentage = readVehicleGstPercentage(vehicle);
const vehicleGstAmount = readVehicleGstAmount(vehicle);
const vendorMarginPercentage = readVehicleVendorMarginPercentage(vehicle);
const vendorMarginAmount = readVehicleVendorMarginAmount(vehicle);
const marginServiceTaxPercentage = readVehicleMarginServiceTaxPercentage(vehicle);
const marginServiceTaxAmount = readVehicleMarginServiceTaxAmount(vehicle);
const vehicleGrandTotal = readVehicleGrandTotal(vehicle);

const totalRows = [
  ["SUBTOTAL", formatCurrencyINR(vehicleSubtotal)],
  vehicleGstAmount > 0
    ? [`GST (${vehicleGstPercentage}%)`, formatCurrencyINR(vehicleGstAmount)]
    : null,
  vendorMarginAmount > 0
    ? [`DVI Margin (${vendorMarginPercentage}%)`, formatCurrencyINR(vendorMarginAmount)]
    : null,
  marginServiceTaxAmount > 0
    ? [
        `DVI Margin Service Tax (${marginServiceTaxPercentage}%)`,
        formatCurrencyINR(marginServiceTaxAmount),
      ]
    : null,
  [
    `GRAND TOTAL (${vehicle.totalQty || 1} x ${formatCurrencyINR(vehicleGrandTotal)})`,
    formatCurrencyINR(vehicleGrandTotal),
  ],
]
        .filter(Boolean)
        .map((row, idx, all) => {
          const isGrand = idx === all.length - 1;
          return `
          <tr>
            <td style="padding:${isGrand ? "4px 4px" : "3px 4px"};border:1px solid #cfd4dc;color:${isGrand ? "#6d28d9" : "#374151"};font-weight:${isGrand ? "700" : "500"};font-size:${isGrand ? "15px" : "14px"};">${escapeHtml((row as string[])[0])}</td>
            <td style="padding:${isGrand ? "4px 4px" : "3px 4px"};border:1px solid #cfd4dc;color:${isGrand ? "#6d28d9" : "#111827"};font-weight:${isGrand ? "700" : "600"};font-size:${isGrand ? "15px" : "14px"};text-align:right;white-space:nowrap;">${escapeHtml((row as string[])[1])}</td>
          </tr>
        `;
        })
        .join("");

      const html = `
        <div style="font-family:Calibri, Arial, sans-serif;font-size:14px;color:#1f2937; width:100%; max-width:100%;">
          <div style="font-size:28px;font-weight:700;color:#111827;margin-bottom:8px;">Day-wise Pricing Breakdown</div>
          <table cellpadding="0" cellspacing="0" border="0" style="width:100%;border:1px solid #cfd4dc;border-collapse:collapse;background:#fff;">
            <thead>
              <tr style="background:#e9dff5;color:#334155;">
                <th style="padding:3px 4px;border:1px solid #cfd4dc;text-align:left;font-weight:700;white-space:nowrap;">Date</th>
                <th style="padding:3px 4px;border:1px solid #cfd4dc;text-align:left;font-weight:700;">Route</th>
                <th style="padding:3px 4px;border:1px solid #cfd4dc;text-align:left;font-weight:700;white-space:nowrap;">Pickup / Drop</th>
                <th style="padding:3px 4px;border:1px solid #cfd4dc;text-align:right;font-weight:700;white-space:nowrap;">Travel KM</th>
                <th style="padding:3px 4px;border:1px solid #cfd4dc;text-align:right;font-weight:700;">Sightseeing<br/>KM</th>
                <th style="padding:3px 4px;border:1px solid #cfd4dc;text-align:right;font-weight:700;"><span style="line-height:1.1;display:inline-block;">Running<br/>Time</span></th>
                <th style="padding:3px 4px;border:1px solid #cfd4dc;text-align:right;font-weight:700;white-space:nowrap;">Total KM</th>
                <th style="padding:3px 4px;border:1px solid #cfd4dc;text-align:right;font-weight:700;white-space:nowrap;">Rental</th>
                <th style="padding:3px 4px;border:1px solid #cfd4dc;text-align:right;font-weight:700;white-space:nowrap;">Toll</th>
                <th style="padding:3px 4px;border:1px solid #cfd4dc;text-align:right;font-weight:700;white-space:nowrap;">Parking</th>
                <th style="padding:3px 4px;border:1px solid #cfd4dc;text-align:right;font-weight:700;white-space:nowrap;">Driver</th>
                <th style="padding:3px 4px;border:1px solid #cfd4dc;text-align:right;font-weight:700;white-space:nowrap;">Permit</th>
                <th style="padding:3px 4px;border:1px solid #cfd4dc;text-align:right;font-weight:700;white-space:nowrap;">Total</th>
              </tr>
            </thead>
            <tbody>${dayRows}</tbody>
          </table>

          <div style="height:12px;"></div>

          <table cellpadding="0" cellspacing="0" border="0" style="width:100%;border:1px solid #cfd4dc;border-collapse:collapse;background:#fff;">
            <thead>
              <tr style="background:#e9dff5;"><th colspan="2" style="padding:3px 4px;border:1px solid #cfd4dc;text-align:left;font-size:20px;font-weight:700;color:#334155;">Charge Summary</th></tr>
            </thead>
            <tbody>${chargeRows}</tbody>
          </table>

          <div style="height:12px;"></div>

          <table cellpadding="0" cellspacing="0" border="0" style="width:100%;border:1px solid #cfd4dc;border-collapse:collapse;background:#fff;">
            <thead>
              <tr style="background:#e9dff5;"><th colspan="2" style="padding:3px 4px;border:1px solid #cfd4dc;text-align:left;font-size:20px;font-weight:700;color:#334155;">Distance Summary</th></tr>
            </thead>
            <tbody>${distanceRows}</tbody>
          </table>

          <div style="height:12px;"></div>

          <table cellpadding="0" cellspacing="0" border="0" style="width:100%;border:1px solid #cfd4dc;border-collapse:collapse;background:#fff;">
            <thead>
              <tr style="background:#6d28d9;"><th colspan="2" style="padding:3px 4px;border:1px solid #cfd4dc;text-align:left;font-size:20px;font-weight:700;color:#fff;">Consolidated Totals</th></tr>
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

  const sortedVehicles = useMemo(() => {
  return [...vehicles].sort((a, b) => {
    const aAmount = resolveVehicleDisplayAmount(a);
    const bAmount = resolveVehicleDisplayAmount(b);

    return aAmount - bAmount;
  });
}, [vehicles]);


  useEffect(() => {
  if (!onSelectedTotalChange || sortedVehicles.length === 0) return;

  const selectedVehicle =
    selectedVendorEligibleId != null
      ? sortedVehicles.find(
          (v) =>
            Number(v.vendorEligibleId || 0) ===
            Number(selectedVendorEligibleId || 0)
        ) || sortedVehicles[0]
      : sortedVehicles[0];

  if (!selectedVehicle) return;

  const totalAmount = resolveVehicleDisplayAmount(selectedVehicle);
  const totalQty = parseInt(String(selectedVehicle.totalQty || "0"), 10) || 0;

  const resolvedVehicleTypeId =
    Number(selectedVehicle.vehicleTypeId || 0) || Number(vehicleTypeId || 0);

  if (!resolvedVehicleTypeId) return;

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
                    onClick={() =>
                      setExpandedVendorEligibleId((prev) => (prev === rowKey ? null : rowKey))
                    }
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
                        <div
                          className="fixed bg-white border-2 border-gray-300 rounded-lg shadow-2xl p-4 w-80 text-sm z-[9999]"
                          style={{
                            left: `${vehicleOriginTooltip.left}px`,
                            top: `${vehicleOriginTooltip.top}px`,
                            pointerEvents: "none",
                          }}
                        >
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
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-3 text-center text-gray-800 font-medium">{qty}</td>
                    <td 
                      className="py-3 px-3 text-right font-semibold text-gray-900"
                      onMouseEnter={() => setHoveredTotalAmountIndex(index)}
                      onMouseLeave={() => setHoveredTotalAmountIndex(null)}
                    >
{formatCurrencyINR(displayTotalAmount)}
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
                              <table className="w-full text-xs border border-gray-300 bg-white border-collapse">
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
                                      <td className="border border-gray-300 py-1 px-1 text-right text-gray-700 font-semibold whitespace-nowrap">{(dp.totalKms ?? 0).toFixed(2)} KM</td>
                                      <td className="border border-gray-300 py-1 px-1 text-right text-gray-700 whitespace-nowrap leading-tight">
                                        {getRentalCellLines(dp).map((line, lineIndex) => (
                                          <div key={lineIndex}>{line}</div>
                                        ))}
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
                                      <td className="border border-gray-300 py-1 px-1 text-right text-purple-700 font-bold whitespace-nowrap">{formatCurrencyINR(dp.totalCharges)}</td>
                                    </tr>
                                  );})}
                                </tbody>
                              </table>
                            </div>
                          </div>

                          {/* ── Stacked full-width summary tables ── */}
                          <div className="space-y-3">
                            <div className="overflow-x-auto">
                              <table
                                className="w-full border border-gray-300 bg-white text-sm table-fixed border-collapse"
                              >
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

                            <div className="overflow-x-auto">
                              <table
                                className="w-full border border-gray-300 bg-white text-sm table-fixed border-collapse"
                              >
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
                                  <tr>
                                    <td className="w-1/2 border border-gray-300 px-1 py-1 text-gray-700 font-semibold">TOTAL USED KM</td>
                                    <td className="w-1/2 border border-gray-300 px-1 py-1 text-right text-gray-800 font-semibold">{(v.totalUsedKm ?? 0).toFixed(0)}</td>
                                  </tr>
                                  {getAllowedKmSummaryRows(v).map(([label, value]) => (
                                    <tr key={`${label}-${value}`}>
                                      <td className="w-1/2 border border-gray-300 px-1 py-1 text-gray-600 font-medium">{label}</td>
                                      <td className="w-1/2 border border-gray-300 px-1 py-1 text-right text-gray-800 font-semibold">
                                        {value}
                                      </td>
                                    </tr>
                                  ))}
                                  {(v.extraKms ?? 0) > 0 && (
                                    <tr>
                                      <td className="w-1/2 border border-gray-300 px-1 py-1 text-gray-600 font-medium">TOTAL EXTRA KM</td>
                                      <td className="w-1/2 border border-gray-300 px-1 py-1 text-right text-gray-800 font-semibold">
                                        {(v.extraKms ?? 0).toFixed(0)} * ₹{(v.extraKmRate ?? 0).toFixed(2)} = {formatCurrencyINR(readVehicleExtraKmCharge(v))}
                                      </td>
                                    </tr>
                                  )}
                                </tbody>
                              </table>
                            </div>

                            <div className="overflow-x-auto">
                              <table
                                className="w-full border border-gray-300 bg-white text-sm table-fixed border-collapse"
                              >
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

