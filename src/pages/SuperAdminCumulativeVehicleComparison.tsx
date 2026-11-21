import React, { useMemo, useState } from "react";
import { ClipboardCopy, Download, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useParams } from "react-router-dom";
import { getDetailsDeduped } from "./itinerary-details/utils/details-dedupe";
import { globalSettingsService } from "@/services/GlobalSettingsService";
import { resolveComparisonAdditionalMargins, type ComparisonMarginSnapshot } from "./vehicleComparisonAdditionalMarginParity";
import { USER_ROLES } from "@/constants/systemRoles";
import { getAuthenticatedRoleId, isTravelExpertUIAccount } from "@/services/accessControl";
import {
  buildReadableVehicleClipboard,
  downloadReadableVehicleWorkbook,
  type VehicleExportRecord,
} from "./SuperAdminVehicleExcelWorkbook";
import type { DayWisePricingItem, ItineraryVehicleRow } from "./VehicleList";
import { useSuperAdminVehicleWorkbook } from "./SuperAdminVehicleWorkbookContext";

type DisplayKind = "currency" | "number" | "text";
type CellValue = number | string | null;
type ComparisonRow = {
  label: string;
  kind: DisplayKind;
  values: CellValue[];
  emphasis?: "section" | "total" | "check";
};
type ComparisonProps = {
  vehicleTypeLabel: string;
  dateRange?: string;
  routes?: Array<{
    date: string;
    destination: string;
    label: string;
    hotspotKmLegs?: Array<{ from: string; to: string; distance: string | number | null }>;
  }>;
  vehicles: ItineraryVehicleRow[];
  selectedVendorEligibleId?: number | null;
  onSelectVendor: (vehicle: ItineraryVehicleRow, index: number) => void;
  onCopyBreakdown: (vehicle: ItineraryVehicleRow) => Promise<void>;
  formatCurrencyINR: (value: number | string | undefined | null) => string;
  resolveVehicleDisplayAmount: (vehicle: ItineraryVehicleRow) => number;
};

// Use backend amounts only. Zero is an actual quote; null/undefined is unavailable.
const numeric = (value: unknown): number | null => {
  if (value === null || value === undefined || value === "") return null;
  const amount = Number(String(value).replace(/,/g, ""));
  return Number.isFinite(amount) ? amount : null;
};
const amountOrZero = (value: unknown): number => numeric(value) ?? 0;
const moneyRound = (value: number): number => Math.round((value + Number.EPSILON) * 100) / 100;
const shortText = (value: unknown): string => {
  const text = String(value ?? "").trim();
  return text || "—";
};
// The downloaded workbook and clipboard share one annotated data model.
type ExportRecord = VehicleExportRecord;

const displayDistance = (value: number): string =>
  Number.isInteger(value) ? String(value) : value.toFixed(2);

// A timeline leg may contain "12.50 KM", "Distance: 12.50 km", or a numeric KM.
// Never infer distance from the displayed vendor Running KM or from locations alone.
const readRecordedHotspotKm = (value: unknown): number | null => {
  if (typeof value === "number") return Number.isFinite(value) && value >= 0 ? value : null;
  const text = String(value ?? "").replace(/,/g, "").trim();
  if (!text) return null;
  const match = text.match(/(\d+(?:\.\d+)?)\s*(?:kms?|kilomet(?:er|re)s?)\b/i)
    ?? text.match(/^(\d+(?:\.\d+)?)$/);
  if (!match) return null;
  const km = Number(match[1]);
  return Number.isFinite(km) && km >= 0 ? km : null;
};
// Compact the day-by-day route without counting a transfer point twice.
// A repeated *daily destination* is displayed as a stay, e.g. Cochin (2N).
// We do not count "arrive in X" followed by "leave X" as two nights.
export const summarizeVehicleStayRoute = (
  days: Array<Pick<DayWisePricingItem, "route">>,
  fallbackRoutes?: Array<{ date: string; destination: string; label: string }>,
): string => {
  const fullRoutes = days.map((day) => String(day.route ?? "").trim()).filter(Boolean);
  if (fullRoutes.length === days.length && fullRoutes.length > 0) {
    const legs = fullRoutes.map((route) => {
      const parts = route.split(/\s*(?:→|➜|➔|➡|->|–|—|\s+-\s+|\s+to\s+)\s*/iu)
        .map((part) => part.replace(/\s+/g, " ").trim()).filter(Boolean);
      return parts.length >= 2 ? { from: parts[0], to: parts[parts.length - 1] } : null;
    });
    // No invented destination: fall back to the original detailed route if
    // any day has an ambiguous or unparseable route description.
    if (legs.every((leg) => leg !== null)) {
      const start = legs[0]!.from;
      const stays: Array<{ destination: string; days: number }> = [];
      for (const leg of legs) {
        const destination = leg!.to;
        const last = stays[stays.length - 1];
        if (last && last.destination.toLocaleLowerCase() === destination.toLocaleLowerCase()) {
          last.days += 1;
        } else {
          stays.push({ destination, days: 1 });
        }
      }
      return [start, ...stays.map(({ destination, days }) =>
        days > 1 ? `${destination} (${days}N)` : destination)].join(" → ");
    }
  }
  // Preserve the original backend route labels whenever a reliable summary
  // cannot be derived. This keeps a custom itinerary readable and complete.
  return fullRoutes.filter((route, index, all) => index === 0 || route !== all[index - 1]).join(" | ") ||
    fallbackRoutes?.map((route) => route.destination).filter(Boolean).join(" → ") || "—";
};

const formatDuration = (day: DayWisePricingItem | undefined): string => {
  if (!day) return "—";
  const minutes = numeric(day.totalDurationMinutes) ??
    (amountOrZero(day.pickupDurationMinutes) + amountOrZero(day.travelDurationMinutes) +
      amountOrZero(day.sightseeingDurationMinutes) + amountOrZero(day.dropDurationMinutes));
  if (minutes <= 0) return "—";
  const rounded = Math.round(minutes);
  return `${Math.floor(rounded / 60)}h ${String(rounded % 60).padStart(2, "0")}m`;
};

// The Excel example allocates non-rental costs and taxes by daily KM. Last day
// takes the rounding residual, so totals always reconcile to the input amounts.
const allocateByWeight = (total: number, weights: number[]): number[] => {
  if (!weights.length) return [];
  const positive = weights.map((weight) => Math.max(0, weight));
  const sum = positive.reduce((a, b) => a + b, 0);
  const result: number[] = [];
  let used = 0;
  for (let i = 0; i < weights.length; i += 1) {
    const amount = i === weights.length - 1
      ? moneyRound(total - used)
      : moneyRound(total * (sum > 0 ? positive[i] / sum : 1 / weights.length));
    used = moneyRound(used + amount);
    result.push(amount);
  }
  return result;
};

type VendorTotals = {
  vehicle: ItineraryVehicleRow;
  rentalDays: number | null;
  dailyRent: number | null;
  subtotal: number | null;
  gst: number | null;
  purchase: number | null;
  margin: number | null;
  marginGst: number | null;
  selling: number | null;
  daily: Array<{
    day: DayWisePricingItem;
    rental: number;
    operational: number;
    gst: number;
    purchase: number;
    marginAndGst: number;
    selling: number;
  }>;
  dailyPurchaseTotal: number | null;
  dailySellingTotal: number | null;
  reconciliationDifference: number | null;
};

const calculateVendorTotals = (
  vehicle: ItineraryVehicleRow,
  resolveVehicleDisplayAmount: ComparisonProps["resolveVehicleDisplayAmount"],
): VendorTotals => {
  const days = vehicle.dayWisePricing ?? [];
  const chargeableDays = days.filter((day) => amountOrZero(day.rentalCharges) > 0).length;
  const rentalDays = chargeableDays > 0 ? chargeableDays : (numeric(vehicle.totalDays) ?? (days.length || null));
  const rental = numeric(vehicle.rentalCharges);
  const subtotal = numeric(vehicle.subtotal);
  const gst = numeric(vehicle.vehicleGstAmount);
  const margin = numeric(vehicle.vendorMarginAmount);
  const marginGst = numeric(vehicle.vendorMarginGstAmount);
  const purchase = subtotal === null || gst === null ? null : moneyRound(subtotal + gst);
  const backendSelling = numeric(vehicle.grandTotal) ?? numeric(vehicle.totalAmount);
  const selling = backendSelling === null ? null : resolveVehicleDisplayAmount(vehicle);
  const dailyRent = rental !== null && rentalDays !== null && rentalDays > 0
    ? moneyRound(rental / rentalDays) : null;
  const weights = days.map((day) => amountOrZero(day.totalKms));

  // Prefer the provided day-specific rental amounts when they add up to the
  // vendor's quoted rental. Otherwise use the spreadsheet's equal allocation.
  const directRent = days.map((day) => amountOrZero(day.rentalCharges));
  const sameQuotedRental = rental !== null &&
    Math.abs(directRent.reduce((a, b) => a + b, 0) - rental) < 0.015;
  const allocatedRent = rental === null ? days.map(() => 0) :
    sameQuotedRental ? directRent : allocateByWeight(rental, days.map((day) =>
      amountOrZero(day.rentalCharges) > 0 ? 1 : 0));
  const operational = subtotal === null || rental === null ? null : moneyRound(subtotal - rental);
  const allocatedOperational = operational === null ? [] : allocateByWeight(operational, weights);
  const allocatedGst = gst === null ? allocateByWeight(0, weights) : allocateByWeight(gst, weights);
  const allocatedMargin = margin === null ? allocateByWeight(0, weights) : allocateByWeight(margin, weights);
  const allocatedMarginGst = marginGst === null ? allocateByWeight(0, weights) : allocateByWeight(marginGst, weights);

  const complete = rental !== null && operational !== null && subtotal !== null &&
    gst !== null && margin !== null && marginGst !== null &&
    purchase !== null && selling !== null && days.length > 0;
  const daily = complete ? days.map((day, index) => {
    const dayPurchase = moneyRound(allocatedRent[index] + allocatedOperational[index] + allocatedGst[index]);
    const marginAndGst = moneyRound(allocatedMargin[index] + allocatedMarginGst[index]);
    return {
      day,
      rental: allocatedRent[index],
      operational: allocatedOperational[index],
      gst: allocatedGst[index],
      purchase: dayPurchase,
      marginAndGst,
      selling: moneyRound(dayPurchase + marginAndGst),
    };
  }) : [];
  const dailyPurchaseTotal = complete ? moneyRound(daily.reduce((sum, day) => sum + day.purchase, 0)) : null;
  const dailySellingTotal = complete ? moneyRound(daily.reduce((sum, day) => sum + day.selling, 0)) : null;
  const reconciliationDifference = dailySellingTotal === null || selling === null
    ? null : moneyRound(dailySellingTotal - selling);
  return { vehicle, rentalDays, dailyRent, subtotal, gst, purchase, margin, marginGst,
    selling, daily, dailyPurchaseTotal, dailySellingTotal, reconciliationDifference };
};

export const SuperAdminCumulativeVehicleComparison: React.FC<ComparisonProps> = ({
  vehicleTypeLabel,
  dateRange,
  routes,
  vehicles,
  selectedVendorEligibleId,
  onSelectVendor,
  formatCurrencyINR,
  resolveVehicleDisplayAmount,
}) => {
  const { id: quoteId } = useParams<{ id: string }>();
  const multiVehicleWorkbook = useSuperAdminVehicleWorkbook();
  const [copyingFullList, setCopyingFullList] = useState(false);
  const [downloadingExcel, setDownloadingExcel] = useState(false);
  // The new row is visible ONLY to Super Admin and Travel Expert.
  // Accounts, Agent and other role-specific views do not gain this row.
  const showComparisonAdditionalMargin =
    getAuthenticatedRoleId() === USER_ROLES.ADMIN || isTravelExpertUIAccount();
  // DVI_SELECTED_VENDOR_MARGIN_PARITY_V5
  // The backend gives the selected ITINERARY margin, not a vehicle allocation.
  // Only display it under a vendor when that vendor is the whole quote base.
  // Other columns receive estimates ONLY when a uniform rate is verified.
  const comparisonVehicleTypeId = Number(vehicles[0]?.vehicleTypeId ?? 0);
  const comparisonVehicleRevision = vehicles.map((vehicle) =>
    [vehicle.vendorEligibleId, vehicle.grandTotal, vehicle.totalAmount,
      vehicle.isAssigned].join(":"),
  ).join("|");
  const [marginContext, setMarginContext] = useState<{
    quoteId: string;
    vehicleTypeId: number;
    snapshot: ComparisonMarginSnapshot;
  } | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    setMarginContext(null);
    if (!showComparisonAdditionalMargin || !quoteId || comparisonVehicleTypeId <= 0) {
      return () => { cancelled = true; };
    }
    void (async () => {
      try {
        const itinerary = await getDetailsDeduped(quoteId);
        const selection = itinerary.vehicleSelections?.find(
          (entry) => Number(entry.vehicleTypeId) === comparisonVehicleTypeId,
        );
        const rawMargin = itinerary.costBreakdown?.additionalMargin;
        const rawTotal = itinerary.costBreakdown?.totalAmount;
        const additionalMargin = numeric(rawMargin);
        const totalAmount = numeric(rawTotal);
        const baseBeforeMargin = additionalMargin !== null && totalAmount !== null &&
          totalAmount >= additionalMargin ? moneyRound(totalAmount - additionalMargin) : null;
        // Show the authoritative selected value immediately. Settings and rule
        // requests only determine whether OTHER vendor values are provable.
        const selectedSnapshot: ComparisonMarginSnapshot = {
          selectedVendorEligibleId: selection?.selectedVendorEligibleId ?? null,
          additionalMargin,
          baseBeforeMargin,
          dayCount: numeric(itinerary.dayCount),
          defaultPercent: null,
          dayLimit: null,
          noActiveVendorRules: false,
        };
        if (!cancelled) setMarginContext({
          quoteId, vehicleTypeId: comparisonVehicleTypeId, snapshot: selectedSnapshot,
        });
        // Settings/rules may be inaccessible to some roles. Keep the exact
        // selected backend amount, but do not guess unselected-vendor prices.
        const [settingsResult, rulesResult] = await Promise.allSettled([
          globalSettingsService.get(),
          globalSettingsService.listExtraMarginRules(),
        ]);
        const settings = settingsResult.status === "fulfilled" ? settingsResult.value : null;
        const defaultPercent = settings ? numeric(settings.additional_margin_percentage) : null;
        const dayLimit = settings ? numeric(settings.additional_margin_day_limit) : null;
        const noActiveVendorRules = rulesResult.status === "fulfilled" &&
          Array.isArray(rulesResult.value) &&
          rulesResult.value.every((rule) => Number(rule.status) !== 1);
        const snapshot: ComparisonMarginSnapshot = {
          ...selectedSnapshot, defaultPercent, dayLimit, noActiveVendorRules,
        };
        if (!cancelled) setMarginContext({ quoteId, vehicleTypeId: comparisonVehicleTypeId, snapshot });
      } catch (error) {
        console.error("Unable to verify selected-vendor Additional Margin", error);
        if (!cancelled) setMarginContext(null);
      }
    })();
    return () => { cancelled = true; };
  }, [showComparisonAdditionalMargin, quoteId, comparisonVehicleTypeId,
    selectedVendorEligibleId, comparisonVehicleRevision]);
  // V19.1: Super Admin location charge accordion
  const [openLocationRowKey, setOpenLocationRowKey] = useState<string | null>(null);
  // V21.1: day accordion single-open: only one day may be expanded at a time.
  const [openDayIndex, setOpenDayIndex] = useState<number | null>(null);
  const dayHeadingRefs = React.useRef(new Map<number, HTMLButtonElement>());
  React.useEffect(() => {
    if (openDayIndex === null) return;
    const frame = window.requestAnimationFrame(() => {
      dayHeadingRefs.current.get(openDayIndex)?.scrollIntoView({ block: "start", behavior: "smooth" });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [openDayIndex]);
  const data = useMemo(
    () => vehicles.map((vehicle) => calculateVendorTotals(vehicle, resolveVehicleDisplayAmount)),
    [vehicles, resolveVehicleDisplayAmount],
  );
  const lowest = Math.min(...data.map((item) => item.selling ?? Number.POSITIVE_INFINITY));
  const selected = data.find(({ vehicle }) =>
    Number(vehicle.vendorEligibleId || 0) > 0 &&
    Number(vehicle.vendorEligibleId) === Number(selectedVendorEligibleId));
  const assigned = selected ?? data.find(({ vehicle }) => vehicle.isAssigned);
  const maxDays = Math.max(0, ...data.map((item) => item.vehicle.dayWisePricing?.length ?? 0));
  const primaryDays = data.find((item) => item.vehicle.dayWisePricing?.length)?.vehicle.dayWisePricing ?? [];
  const shownRoute = summarizeVehicleStayRoute(primaryDays, routes);
  const maxTotalDays = Math.max(0, ...data.map((item) => item.vehicle.totalDays ?? 0), maxDays);

  const row = (label: string, kind: DisplayKind, values: CellValue[], emphasis?: ComparisonRow["emphasis"]): ComparisonRow =>
    ({ label, kind, values, emphasis });
  const summaryRows: ComparisonRow[] = [
    row("Per day rent (₹)", "currency", data.map((v) => v.dailyRent)),
    row("Vehicle origin", "text", data.map((v) => v.vehicle.vehicleOrigin ?? null)),
    row("Rental days", "number", data.map((v) => v.rentalDays)),
    row("Rental charges", "currency", data.map((v) => numeric(v.vehicle.rentalCharges))),
    row("Toll charges", "currency", data.map((v) => numeric(v.vehicle.tollCharges))),
    row("Parking charges", "currency", data.map((v) => numeric(v.vehicle.parkingCharges))),
    row("Driver charges", "currency", data.map((v) => numeric(v.vehicle.driverCharges))),
    row("Permit charges", "currency", data.map((v) => numeric(v.vehicle.permitCharges))),
    row("Before 6 AM – driver", "currency", data.map((v) => numeric(v.vehicle.before6amDriver))),
    row("Before 6 AM – vehicle", "currency", data.map((v) => numeric(v.vehicle.before6amVendor))),
    row("After 8 PM – driver", "currency", data.map((v) => numeric(v.vehicle.after8pmDriver))),
    row("After 8 PM – vehicle", "currency", data.map((v) => numeric(v.vehicle.after8pmVendor))),
    row("Total running KM", "number", data.map((v) =>
      numeric(v.vehicle.totalUsedKm) ?? (v.vehicle.dayWisePricing?.length ?
        v.vehicle.dayWisePricing.reduce((sum, day) => sum + amountOrZero(day.totalKms), 0) : null))),
    row("Allowed outstation KM", "number", data.map((v) => numeric(v.vehicle.totalAllowedOutstationKm))),
    row("Allowed local KM", "number", data.map((v) => numeric(v.vehicle.totalAllowedLocalKm))),
    row("Extra KM (quoted)", "number", data.map((v) => numeric(v.vehicle.extraKms))),
    row("Extra KM rate", "currency", data.map((v) => numeric(v.vehicle.extraKmRate))),
    row("Extra KM charges", "currency", data.map((v) => numeric(v.vehicle.extraKmCharge) ?? (numeric(v.vehicle.localExtraKmCharge) !== null && numeric(v.vehicle.outstationExtraKmCharge) !== null ? moneyRound(amountOrZero(v.vehicle.localExtraKmCharge) + amountOrZero(v.vehicle.outstationExtraKmCharge)) : null))),
    row("Subtotal", "currency", data.map((v) => v.subtotal), "total"),
    row("Vendor GST", "currency", data.map((v) => v.gst)),
    row("Margin amount", "currency", data.map((v) => v.margin)),
    row("Margin GST", "currency", data.map((v) => v.marginGst)),
    // This additional margin is informational in the vendor comparison:
    // existing pricing, backend totals and cumulative reconciliation stay unchanged.
    ...(showComparisonAdditionalMargin ? [
      row("Additional Margin", "currency", resolveComparisonAdditionalMargins(
        data.map(({ vehicle, selling }) => ({ vendorEligibleId: vehicle.vendorEligibleId, selling })),
        selectedVendorEligibleId,
        marginContext?.quoteId === quoteId && marginContext.vehicleTypeId === comparisonVehicleTypeId
          ? marginContext.snapshot : null,
      )),
    ] : []),
    row("Difference from lowest selling price", "currency", data.map((v) =>
      v.selling !== null && Number.isFinite(lowest) ? moneyRound(v.selling - lowest) : null), "check"),
  ];

  const dailyRows: ComparisonRow[] = [];
  for (let index = 0; index < maxDays; index += 1) {
    const example = primaryDays[index] ?? data.find((v) => v.daily[index])?.daily[index]?.day;
    const heading = example?.dayLabel ?? `DAY ${index + 1}`;
    dailyRows.push(row(`${heading}${example?.route ? ` – ${example.route}` : ""}`, "text", [], "section"));
    dailyRows.push(row("Running KM", "number", data.map((v) => numeric(v.vehicle.dayWisePricing?.[index]?.totalKms))));
    // V18.1: Use recorded itinerary travel legs for hotspot/location KM.
    // The date match protects multi-day ordering; vendor-specific garage KM is NOT redistributed.
    const dayDate = String(example?.date ?? "").slice(0, 10);
    const matchedRoute = dayDate.length === 10
      ? routes?.find((route) => String(route.date ?? "").slice(0, 10) === dayDate)
      : undefined;
    const indexedRoute = routes?.length === maxDays ? routes[index] : undefined;
    const routeForDay = matchedRoute ?? (
      indexedRoute && (!dayDate || !indexedRoute.date ||
        String(indexedRoute.date).slice(0, 10) === dayDate) ? indexedRoute : undefined
    );
    const hotspotKmLegs = routeForDay?.hotspotKmLegs ?? [];
    if (!hotspotKmLegs.length) {
      dailyRows.push(row("\u21B3 Hotspot/location KM not available for this day", "text",
        data.map(() => "\u2014")));
    } else {
      hotspotKmLegs.forEach((leg) => {
        const km = readRecordedHotspotKm(leg.distance);
        dailyRows.push(row(`\u21B3 ${leg.from} \u2192 ${leg.to} (KM)`, "number",
          data.map((vendor) => vendor.vehicle.dayWisePricing?.[index] ? km : null)));
      });
    }
    dailyRows.push(row("Travel time", "text", data.map((v) => v.vehicle.dayWisePricing?.[index] ? formatDuration(v.vehicle.dayWisePricing[index]) : null)));
    const pickupKms = data.map((v) => numeric(v.vehicle.dayWisePricing?.[index]?.pickupKms));
    const dropKms = data.map((v) => numeric(v.vehicle.dayWisePricing?.[index]?.dropKms));
    // Mirror the reference sheet: a pickup/drop row appears only on a relevant day.
    if (pickupKms.some((km) => km !== null && km > 0)) {
      dailyRows.push(row("Garage to pickup KM", "number", pickupKms));
    }
    if (dropKms.some((km) => km !== null && km > 0)) {
      dailyRows.push(row("Drop to garage KM", "number", dropKms));
    }
    dailyRows.push(row("Rental (allocated)", "currency", data.map((v) => v.daily[index]?.rental ?? null)));
    dailyRows.push(row("Other operational charges (allocated)", "currency", data.map((v) => v.daily[index]?.operational ?? null)));
    dailyRows.push(row("Vendor GST (allocated)", "currency", data.map((v) => v.daily[index]?.gst ?? null)));
    dailyRows.push(row("Daily purchase cost", "currency", data.map((v) => v.daily[index]?.purchase ?? null), "total"));
    dailyRows.push(row("Daily margin + margin GST", "currency", data.map((v) => v.daily[index]?.marginAndGst ?? null)));
    dailyRows.push(row(`DAY ${index + 1} TOTAL COST`, "currency", data.map((v) => v.daily[index]?.selling ?? null), "total"));
  }
  const checkRows: ComparisonRow[] = [
    row("CUMULATIVE CHECK", "text", [], "section"),
    row("Total day-wise purchase cost", "currency", data.map((v) => v.dailyPurchaseTotal)),
    row("Total day-wise selling price", "currency", data.map((v) => v.dailySellingTotal)),
    row("Reconciliation difference", "currency", data.map((v) => v.reconciliationDifference), "check"),
  ];

  const renderValue = (value: CellValue, kind: DisplayKind) => {
    if (value === null || value === undefined || value === "") return "—";
    if (kind === "currency") return formatCurrencyINR(value);
    if (kind === "number") return typeof value === "number" ? displayDistance(value) : value;
    return String(value);
  };

  const activeVendor = (vehicle: ItineraryVehicleRow): boolean =>
    Number(vehicle.vendorEligibleId || 0) > 0 &&
    Number(vehicle.vendorEligibleId) === Number(selectedVendorEligibleId);

  // Keep this export in lockstep with the UI: all vendors, every detail row,
  // all day-wise breakdowns, and the cumulative reconciliation, plus context.
  // Vendor headers appear before the cost table so Excel can freeze them
  // while people scroll through long day-wise comparisons.
  const dailyRoutePlan = primaryDays.length
    ? primaryDays.map((day, index) => ({
        label: `Day ${index + 1}${day.dayLabel ? ` | ${day.dayLabel.split("|").slice(1).join("|").trim()}` : ""}`,
        route: shortText(day.route),
      }))
    : (routes ?? []).map((route, index) => ({
        label: `Day ${index + 1}${route.date ? ` | ${route.date}` : ""}`,
        route: shortText(route.destination),
      }));
  // V16: Exclude only these daily allocation labels from exports, not from the visible table.
  const hiddenDailyExportLabels = new Set([
    "Rental (allocated)",
    "Other operational charges (allocated)",
    "Vendor GST (allocated)",
    "Daily purchase cost",
    "Daily margin + margin GST",
  ]);
  // Render all day headings, but detail rows for the currently opened day only.
  // The full dailyRows list remains unchanged for Excel and clipboard exports.
  const visibleDayRows = [] as typeof dailyRows;
  const dayHeadings = dailyRows.filter((line) => line.emphasis === "section");
  let currentDaySection = -1;
  for (const line of dailyRows) {
    if (line.emphasis === "section") {
      currentDaySection++;
      visibleDayRows.push(line);
    } else if (currentDaySection === openDayIndex && !hiddenDailyExportLabels.has(line.label)) {
      visibleDayRows.push(line);
    }
  }

  const records: ExportRecord[] = [
    { cells: [`VEHICLE LIST FOR "${vehicleTypeLabel}"`], category: "title" },
    { cells: ["DVI.TRAVEL | CUMULATIVE VEHICLE COSTING"], category: "title" },
    { cells: ["PARTICULARS", ...data.map((vendor) => shortText(vendor.vehicle.vendorName))], category: "header" },
    { cells: ["Vendor status", ...data.map((vendor) =>
      activeVendor(vendor.vehicle) ? "Current vendor" : "Not selected")], category: "status" },
    { cells: ["QUOTE INFORMATION"], category: "section" },
    { cells: ["Quote ID", shortText(quoteId)], category: "metadata" },
    { cells: ["Travel dates", shortText(dateRange)], category: "metadata" },
    { cells: ["Total days", maxTotalDays || "—"], category: "metadata" },
    { cells: ["Vehicle category", vehicleTypeLabel], category: "metadata" },
    { cells: ["Assigned vendor", assigned ? shortText(assigned.vehicle.vendorName) : "Not assigned"], category: "metadata" },
    { cells: ["Route summary", shownRoute], category: "metadata" },
    { cells: ["ROUTE PLAN - DAY BY DAY"], category: "section" },
    ...(dailyRoutePlan.length
      ? dailyRoutePlan.map(({ label, route }): ExportRecord => ({ cells: [label, route], category: "metadata" }))
      : [{ cells: ["Route", shownRoute], category: "metadata" as const }]),
    { cells: ["VENDOR COST COMPARISON"], category: "section" },
    ...summaryRows.map((line): ExportRecord => ({
      cells: [line.label, ...line.values], category: line.emphasis || "normal", kind: line.kind,
    })),
    { cells: ["DAY-WISE COST BREAKDOWN"], category: "section" },
    ...dailyRows.filter((line) => !hiddenDailyExportLabels.has(line.label)).map((line): ExportRecord => ({
      cells: line.emphasis === "section" ? [line.label] : [line.label, ...line.values],
      category: line.emphasis || "normal", kind: line.kind,
    })),
    ...checkRows.map((line): ExportRecord => ({
      cells: line.emphasis === "section" ? [line.label] : [line.label, ...line.values],
      category: line.emphasis || "normal", kind: line.kind,
    })),
    { cells: ["HOW TO READ THIS COMPARISON"], category: "section" },
    { cells: ["Vendor columns", "Each column represents one live vendor quotation for this vehicle category."], category: "metadata" },
    { cells: ["Amounts", "₹ amounts are numeric Excel values. They are taken from the live quotation, not sample rates."], category: "metadata" },
    { cells: ["Daily figures", "Allocated costs are shown separately from vendor-quoted daily charges."], category: "metadata" },
    { cells: ["Missing amount", "— means the backend did not provide this value; it is not treated as ₹0."], category: "metadata" },
    { cells: ["Reconciliation", "Difference should be ₹0.00; a nonzero amount means the day-wise allocation needs review."], category: "metadata" },
  ];

  const columnCount = data.length + 1;

  // V24: Register this comparison for the selected-vehicle Excel workbook.
  // Each comparison remains mounted even when its vehicle/day accordion is closed.
  React.useEffect(() => {
    const typeId = Number(vehicles[0]?.vehicleTypeId ?? 0);
    if (multiVehicleWorkbook && typeId > 0) {
      multiVehicleWorkbook.register({ typeId, label: vehicleTypeLabel, records, columns: columnCount });
    }
  });

  // Browser clipboard HTML cannot control the column widths of a NEW Excel
  // worksheet. Give users both the editable clipboard data and the EXACT same
  // styled XLSX generated by Download Excel. Start both while the click's
  // user-activation is active (before awaiting clipboard permission).
  const copyEntireVehicleList = async () => {
    if (copyingFullList) return;
    setCopyingFullList(true);
    let formattedWorkbookStarted = false;
    try {
      const { html, tsv } = buildReadableVehicleClipboard(records, columnCount);
      let clipboardWrite: Promise<void>;
      if (navigator.clipboard?.write && typeof ClipboardItem !== "undefined") {
        clipboardWrite = navigator.clipboard.write([new ClipboardItem({
          "text/html": new Blob([html], { type: "text/html" }),
          "text/plain": new Blob([tsv], { type: "text/plain" }),
        })]);
      } else if (navigator.clipboard?.writeText) {
        clipboardWrite = navigator.clipboard.writeText(tsv);
      } else {
        throw new Error("Clipboard API is unavailable. Use Download Excel instead.");
      }

      // The same function, records, column count, and filename as Download Excel.
      // A real .xlsx is the only reliable way to preserve widths in Excel.
      const safe = (value: string) => value.replace(/[^a-zA-Z0-9_-]+/g, "_").slice(0, 60);
      try {
        downloadReadableVehicleWorkbook(
          records,
          columnCount,
          `DVI_${safe(quoteId || "Quote")}_${safe(vehicleTypeLabel)}_Vehicle_Comparison_CLEAN_V16.xlsx`,
        );
        formattedWorkbookStarted = true;
      } catch (downloadError) {
        console.error("Could not create the matching formatted workbook", downloadError);
        // Clipboard copying still works even if the browser blocks downloads.
      }

      await clipboardWrite;
      if (formattedWorkbookStarted) {
        toast.success("Comparison copied and formatted Excel downloaded. Open the XLSX for the exact column widths.");
      } else {
        toast.success("Comparison copied. For identical Excel formatting, click Download Excel.");
      }
    } catch (error) {
      console.error("Unable to copy the full vehicle list", error);
      if (formattedWorkbookStarted) {
        toast.error("Clipboard access was blocked. The formatted workbook was downloaded; open it in Excel.");
      } else {
        toast.error("Copy failed. Use Download Excel, or allow clipboard permission.");
      }
    } finally {
      setCopyingFullList(false);
    }
  };

  const downloadFullExcel = () => {
    if (downloadingExcel) return;
    setDownloadingExcel(true);
    try {
      const safe = (value: string) => value.replace(/[^a-zA-Z0-9_-]+/g, "_").slice(0, 60);
      if (multiVehicleWorkbook) {
        const sheets = multiVehicleWorkbook.download(
          `DVI_${safe(quoteId || "Quote")}_Selected_Vehicles_Comparison.xlsx`,
        );
        toast.success(`Excel workbook downloaded: ${sheets} vehicle sheet${sheets === 1 ? "" : "s"}.`);
      } else {
        downloadReadableVehicleWorkbook(records, columnCount, `DVI_${safe(quoteId || "Quote")}_${safe(vehicleTypeLabel)}_Vehicle_Comparison_CLEAN_V16.xlsx`);
        toast.success("Full vehicle comparison Excel file downloaded.");
      }
    } catch (error) {
      console.error("Unable to export the full vehicle list", error);
      toast.error("Excel download failed. Please try again.");
    } finally {
      setDownloadingExcel(false);
    }
  };

  // Always occupy the visible comparison panel when there are few vendors.
  // Preserve the per-vendor minimums for many/long names, allowing horizontal
  // scrolling instead of shrinking prices and radio buttons beyond readability.
  // Extra available width is shared by the table columns; no empty right gutter.
  const particularColumnWidth = 220;
  const vendorColumnWidths = data.map(({ vehicle }) =>
    Math.min(148, Math.max(112, Math.ceil(shortText(vehicle.vendorName).length * 6 + 12))),
  );
  const comparisonTableWidth = particularColumnWidth +
    vendorColumnWidths.reduce((total, width) => total + width, 0);
  const wideVendorHeaders = data.length <= 3;

  return (
    <section data-testid="super-admin-cumulative-vehicle-comparison" className="min-w-0 space-y-3">
      <div className="rounded-lg border border-purple-200 bg-purple-50/60 p-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <h6 className="text-sm font-bold tracking-wide text-purple-900">DVI.TRAVEL | CUMULATIVE VEHICLE COSTING</h6>
            <span data-testid="super-admin-vehicle-days" className="whitespace-nowrap text-xs font-semibold text-purple-900">
              Days: {maxTotalDays || "—"}
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-2" data-testid="vehicle-list-export-actions">
            <button type="button" onClick={downloadFullExcel} disabled={downloadingExcel || !data.length}
              className="inline-flex min-h-8 items-center gap-1.5 rounded-md border border-purple-700 bg-purple-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-purple-800 disabled:cursor-not-allowed disabled:opacity-60">
              {downloadingExcel ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
              Download Excel
            </button>
          </div>
        </div>
        <div className="mt-2 grid grid-cols-1 gap-x-5 gap-y-1 text-xs text-gray-700 sm:grid-cols-2">
          <div><strong>Quote ID:</strong> {shortText(quoteId)}</div>
          <div><strong>Dates:</strong> {shortText(dateRange)}</div>
          <div><strong>Vehicle:</strong> {vehicleTypeLabel}</div>
          <div><strong>Assigned Vendor:</strong> {assigned ? shortText(assigned.vehicle.vendorName) : "Not assigned"}</div>
          <div className="min-w-0 break-words sm:col-span-2"><strong>Route:</strong> {shownRoute}</div>
        </div>
      </div>

      <div className="max-w-full overflow-x-auto rounded-lg border border-gray-200" role="region" tabIndex={0} aria-label={`${vehicleTypeLabel} cumulative vendor costing comparison`}>
        <table className="w-full table-fixed border-collapse text-xs text-gray-800"
          style={{ width: "100%", minWidth: `${comparisonTableWidth}px` }}>
          <colgroup>
            <col style={{ width: `${particularColumnWidth}px` }} />
            {data.map((item, index) =>
              <col key={`${item.vehicle.vendorEligibleId ?? 'vendor'}-${index}`} style={{ width: `${vendorColumnWidths[index]}px` }} />)}
          </colgroup>
          <thead>
            <tr className="bg-purple-100">
              <th scope="col" className="sticky left-0 z-20 border-b border-r border-purple-200 bg-purple-100 px-3 py-2 text-left font-bold uppercase">
                PARTICULARS
              </th>
              {data.map((item, index) => {
                const active = Number(item.vehicle.vendorEligibleId || 0) > 0 &&
                  Number(item.vehicle.vendorEligibleId) === Number(selectedVendorEligibleId);
                return (
                  <th scope="col" key={`${item.vehicle.vendorEligibleId ?? 'vendor'}-${index}`}
                    className={`border-b border-r border-purple-200 px-1.5 py-1 text-left align-top ${active ? "bg-violet-100" : "bg-purple-100"}`}>
                    <div className={wideVendorHeaders ? "flex flex-wrap items-center justify-between gap-x-3 gap-y-1" : ""}>
                      <div className="break-words text-[11px] font-bold leading-tight">{shortText(item.vehicle.vendorName)}</div>
                      <div className={wideVendorHeaders ? "" : "mt-0.5"}>
                        <label className="inline-flex cursor-pointer items-center gap-1 whitespace-nowrap text-[11px] font-medium">
                          <input type="radio" name={`comparison-vehicle-${vehicleTypeLabel}-${item.vehicle.vehicleTypeId ?? ''}`}
                            checked={active}
                            disabled={!item.vehicle.vendorEligibleId || !item.vehicle.vehicleTypeId}
                            onChange={() => onSelectVendor(item.vehicle, index)}
                            aria-label={`Select ${shortText(item.vehicle.vendorName)} for ${vehicleTypeLabel}`}
                            className="h-3.5 w-3.5 shrink-0 accent-purple-700" />
                          {active ? "Current vendor" : "Select vendor"}
                        </label>
                      </div>
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {[...summaryRows, ...visibleDayRows, ...checkRows].map((comparisonRow, rowIndex) => {
              if (comparisonRow.emphasis === "section") {
                const daySectionIndex = dayHeadings.indexOf(comparisonRow);
                return <tr key={`section-${rowIndex}`}>
                  <th scope="rowgroup" colSpan={data.length + 1}
                    className="border-y border-purple-300 bg-purple-200 px-3 py-2 text-left font-bold text-purple-950">
                    {daySectionIndex >= 0 ? (
                      <button type="button"
                        ref={(element) => {
                          if (element) dayHeadingRefs.current.set(daySectionIndex, element);
                          else dayHeadingRefs.current.delete(daySectionIndex);
                        }}
                        aria-expanded={openDayIndex === daySectionIndex}
                        aria-label={"Toggle " + comparisonRow.label}
                        onClick={() => {
                          setOpenLocationRowKey(null);
                          setOpenDayIndex((previous) => previous === daySectionIndex ? null : daySectionIndex);
                        }}
                        className="flex w-full items-center justify-between gap-3 rounded-sm text-left hover:text-purple-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-purple-600"
                        style={{ scrollMarginTop: "170px" }}>
                        <span className="min-w-0">{comparisonRow.label}</span>
                        <span aria-hidden="true" className="shrink-0 text-sm">{openDayIndex === daySectionIndex ? "−" : "+"}</span>
                      </button>
                    ) : comparisonRow.label}
                  </th>
                </tr>;
              }
              const isTotal = comparisonRow.emphasis === "total";
              const isCheck = comparisonRow.emphasis === "check";
              const cellBg = isTotal ? "bg-purple-50" : isCheck ? "bg-gray-50" : "bg-white";
              const locationMatch = /^\u21B3\s+(.+?)\s+\u2192\s+(.+?)\s+\(KM\)$/u.exec(comparisonRow.label);
              const dayIndexForLocation = locationMatch
                ? dailyRows.slice(0, dailyRows.indexOf(comparisonRow)).filter(
                    (prev) => /^DAY\s+\d+\s+TOTAL COST$/i.test(prev.label)).length
                : -1;
              const locationKey = locationMatch ? `${dayIndexForLocation}-${rowIndex}` : null;
              const locationIsOpen = locationKey !== null && openLocationRowKey === locationKey;
              const toggleLocation = () => {
                if(locationKey!==null) setOpenLocationRowKey(old=>old===locationKey?null:locationKey);
              };
              const locationDetailsId = `vehicle-location-charge-${rowIndex}`;
              return <React.Fragment key={`${comparisonRow.label}-${rowIndex}`}>
                <tr onClick={locationMatch ? toggleLocation : undefined}
                  className={locationMatch ? "cursor-pointer hover:bg-violet-50" : undefined}>
                <th scope="row" className={`sticky left-0 z-10 border-b border-r border-gray-200 px-3 py-2 text-left ${isTotal ? "font-bold" : "font-medium"} ${cellBg}`}>
                  {locationMatch ? (
                    <button type="button" aria-expanded={locationIsOpen} aria-controls={locationDetailsId}
                      onClick={(event) => { event.stopPropagation(); toggleLocation(); }}
                      className="flex w-full items-start justify-between gap-2 text-left font-medium text-purple-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-purple-600">
                      <span className="min-w-0 break-words">{comparisonRow.label}</span>
                      <span className="shrink-0 text-[10px] font-semibold text-purple-700">{locationIsOpen ? "Hide" : "Charges"}</span>
                    </button>
                  ) : comparisonRow.label}
                </th>
                {comparisonRow.values.map((value, index) => {
                  const mismatch = comparisonRow.label === "Reconciliation difference" && typeof value === "number" && Math.abs(value) >= 0.01;
                  return <td key={index} title={comparisonRow.label === "Additional Margin" && value === null ? "No verified vendor-specific margin is available. The itinerary may include other vehicles, hotels, or custom pricing; select a vendor and see Overall Cost for the package margin." : undefined} className={`border-b border-r border-gray-200 px-2 py-2 text-right tabular-nums ${cellBg} ${isTotal ? "font-bold text-purple-950" : ""} ${mismatch ? "font-bold text-red-700" : ""}`}>
                    {renderValue(value, comparisonRow.kind)}
                  </td>;
                })}
              </tr>
                {locationIsOpen && locationMatch && (
                  <tr id={locationDetailsId}>
                    <td colSpan={data.length + 1} className="border-b border-purple-200 bg-violet-50 p-2">
                      <div className="rounded-lg border border-purple-200 bg-white p-3 text-xs">
                        <h6 className="mb-1 font-semibold text-purple-950">
                          Day {dayIndexForLocation + 1}: {locationMatch[1]} {"\u2192"} {locationMatch[2]}
                        </h6>
                        <p className="mb-3 text-[11px] leading-relaxed text-amber-800">
                          Charges shown are vendor totals for the entire day, NOT a charge attributed to this leg.
                          Do not add these day totals for each location.
                        </p>
                        <div className="overflow-x-auto">
                          <table className="w-full table-fixed border-collapse text-[11px]" style={{ minWidth: `${comparisonTableWidth}px` }}>
                            <colgroup>
                              <col style={{ width: `${particularColumnWidth}px` }} />
                              {data.map((item, vendorIndex) => (
                                <col key={vendorIndex} style={{ width: `${vendorColumnWidths[vendorIndex]}px` }} />
                              ))}
                            </colgroup>
                            <thead><tr className="bg-purple-100">
                              <th className="border border-purple-200 px-2 py-2 text-left">Day {dayIndexForLocation + 1} charges</th>
                              {data.map((item, vendorIndex) => (
                                <th key={vendorIndex} className="break-words border border-purple-200 px-2 py-2 text-left">
                                  {shortText(item.vehicle.vendorName)}
                                </th>
                              ))}
                            </tr></thead>
                            <tbody>
                              {(["toll", "parking", "permit"] as const).map((kind) => (
                                <tr key={kind}>
                                  <th scope="row" className="border border-gray-200 px-2 py-2 text-left font-medium">
                                    {kind === "toll" ? "Toll charges (day total)" :
                                      kind === "parking" ? "Parking charges (day total)" : "Permit charges (day total)"}
                                  </th>
                                  {data.map((item, vendorIndex) => {
                                    const dayPrice = item.vehicle.dayWisePricing?.[dayIndexForLocation];
                                    const raw = kind === "toll" ? dayPrice?.tollCharges :
                                      kind === "parking" ? dayPrice?.parkingCharges : dayPrice?.permitCharges;
                                    const amount = numeric(raw);
                                    const notes = kind === "toll" ? dayPrice?.tollBreakupText :
                                      kind === "parking" ? dayPrice?.parkingBreakupText : undefined;
                                    return (
                                      <td key={vendorIndex} className="break-words border border-gray-200 px-2 py-2 text-right align-top tabular-nums">
                                        <div className="font-semibold">{amount === null ? "\u2014" : formatCurrencyINR(amount)}</div>
                                        {Array.isArray(notes) && notes.length > 0 && (
                                          <div className="mt-1 text-left text-[10px] leading-relaxed text-gray-600">
                                            {notes.filter(Boolean).join(" | ")}
                                          </div>
                                        )}
                                      </td>
                                    );
                                  })}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                        <p className="mt-2 text-[10px] text-gray-500">
                          The pricing API has not supplied location-specific charge amounts. A dash means missing source data;
                          zero means the source supplied zero.
                        </p>
                      </div>
                    </td>
                  </tr>
                )}
              </React.Fragment>
            })}
          </tbody>
        </table>
      </div>
      <p className="text-[11px] leading-relaxed text-gray-600">
        Location-wise distances are copied from itinerary travel legs, not calculated from city names. The same route legs apply to every vendor. Their sum may differ from Running KM, which can include garage/pickup/drop and local travel. An unavailable recorded distance is shown with a dash. {" "}
        Amounts are read from live vendor quotes, not the sample vendors in the Excel reference. Daily rental is allocated equally when source daily rentals do not reconcile; other operational costs, GST and margin are allocated by daily KM, with final-day rounding. The quoted selling price is never overwritten. Missing backend fields display as —, rather than invented zeros. A non-zero reconciliation difference needs review. “—” means source data is missing.
      </p>
    </section>
  );
};
