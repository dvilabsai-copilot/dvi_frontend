/* eslint-disable @typescript-eslint/no-explicit-any */
import React from "react";
import { VehicleVendorInlineSummary } from "./VehicleVendorInlineSummary";
import { USER_ROLES } from "@/constants/systemRoles";
import { getAuthenticatedRoleId, isTravelExpertUIAccount } from "@/services/accessControl";
import { SuperAdminCumulativeVehicleComparison } from "./SuperAdminCumulativeVehicleComparison";
import { AlertTriangle, Check, ChevronDown, ChevronRight, Copy, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "../components/ui/dialog";
import { Button } from "../components/ui/button";
import { FloatingHoverTooltip } from "../components/FloatingHoverTooltip";

import {
  fetchVehicleUpgradePrices,
  confirmVehicleUpgrade,
  type VehicleUpgradePricesResponse,
} from "@/services/vehicleUpgradePrices";

export const VehicleListView = ({ context }: { context: Record<string, any> }) => {
  const {
    vehicleTypeLabel, vehicles, vehicleTypeId, itineraryPlanId, dateRange, routes, canViewCostBreakdown, showVendorDetails,
    superAdminExpanded, onToggleSuperAdminExpanded,
    vehicleOriginTooltip, hoveredTotalAmountIndex, setHoveredTotalAmountIndex, sortedVehicles,
    showVehicleOriginTooltip, moveVehicleOriginTooltip, hideVehicleOriginTooltip,
   showVehicleOriginTooltipFromFocus,
selectedVendorEligibleId,
upgradeOptions,
vehicleCostIncluded,
onVehicleCostIncludedChange,
carouselIndex,
    handleCarouselPrevious,
    handleCarouselNext,
        copiedVendorIndex,
    setCopiedVendorIndex,
    copyVehicleBreakdownForOutlook,
    expandedVendorEligibleId,
    setExpandedVendorEligibleId,
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

  // Only the Super Admin login (role 1) gets the spreadsheet-style view.
const authenticatedRole = getAuthenticatedRoleId();

const isSuperAdmin =
  authenticatedRole === USER_ROLES.ADMIN;

const isAgent =
  authenticatedRole === USER_ROLES.AGENT;

const showSuperAdminVendorComparison =
  isSuperAdmin ||
  isTravelExpertUIAccount() ||
  authenticatedRole === USER_ROLES.ACCOUNTS;

const showSharedVehicleLayout =
  showSuperAdminVendorComparison || isAgent;

const canUseVehicleUpgrade =
  showSharedVehicleLayout &&
  (canViewCostBreakdown || isAgent);
// V11: the parent VehicleSection controls which Super Admin vehicle is open.
const isSuperAdminVehicleListExpanded = Boolean(superAdminExpanded);
const superAdminVehicleListPanelId = React.useId();

// Inline upgrade form: a quote is required before an additional amount can be shown.
const [showUpgradeInline, setShowUpgradeInline] = React.useState(false);
const [selectedUpgradeTypeId, setSelectedUpgradeTypeId] = React.useState<number | null>(null);
const [showAllUpgradeOptions, setShowAllUpgradeOptions] = React.useState(false);
const upgradeInlineId = React.useId();
const [upgradePricePreview, setUpgradePricePreview] =
  React.useState<VehicleUpgradePricesResponse | null>(null);

const [upgradePriceLoading, setUpgradePriceLoading] =
  React.useState(false);

const [upgradePriceError, setUpgradePriceError] =
  React.useState<string | null>(null);

const [isConfirmingUpgrade, setIsConfirmingUpgrade] =
  React.useState(false);

React.useEffect(() => {
  if (!showUpgradeInline) return;

  const planId = Number(itineraryPlanId);
  const typeId = Number(vehicleTypeId);

  if (!Number.isInteger(planId) || planId <= 0 ||
      !Number.isInteger(typeId) || typeId <= 0) {
    setUpgradePricePreview(null);
    setUpgradePriceError("Itinerary plan or vehicle type ID is missing.");
    return;
  }

  let cancelled = false;

  setUpgradePriceLoading(true);
  setUpgradePriceError(null);
  setUpgradePricePreview(null);

  const vendorId = Number(selectedVendorEligibleId);

  fetchVehicleUpgradePrices({
    itineraryPlanId: planId,
    currentVehicleTypeId: typeId,
    ...(Number.isInteger(vendorId) && vendorId > 0
      ? { selectedVendorEligibleId: vendorId }
      : {}),
  })
    .then((response) => {
      if (!cancelled) {
        setUpgradePricePreview(response);
      }
    })
    .catch((error: unknown) => {
      if (!cancelled) {
        setUpgradePriceError(
          error instanceof Error ? error.message : "Unable to load prices",
        );
      }
    })
    .finally(() => {
      if (!cancelled) {
        setUpgradePriceLoading(false);
      }
    });

  return () => {
    cancelled = true;
  };
}, [
  showUpgradeInline,
  itineraryPlanId,
  vehicleTypeId,
  selectedVendorEligibleId,
]);

const selectedVehicle = sortedVehicles.find(
  (vehicle: { vendorEligibleId?: number }) =>
    Number(selectedVendorEligibleId || 0) > 0 &&
    Number(vehicle.vendorEligibleId || 0) === Number(selectedVendorEligibleId)
) ?? sortedVehicles.find((vehicle: { isAssigned?: boolean }) => vehicle.isAssigned === true);

const rawSelectedPrice = selectedVehicle
  ? Number(resolveVehicleDisplayAmount(selectedVehicle))
  : NaN;

const selectedVehiclePrice =
  Number.isFinite(rawSelectedPrice) && rawSelectedPrice > 0
    ? rawSelectedPrice
    : null;

const priceBaseMatches =
  upgradePricePreview !== null &&
  selectedVehiclePrice !== null &&
  typeof upgradePricePreview.currentVehiclePrice === "number" &&
  Number.isFinite(upgradePricePreview.currentVehiclePrice) &&
  Math.abs(
    upgradePricePreview.currentVehiclePrice - selectedVehiclePrice
  ) < 0.02;

type InlineUpgradeOption = {
  vehicleTypeId: number;
  name: string;
  price: number | null;
  estimatedPrice?: number | null;
  estimatedExtra?: number | null;
  occupancy?: number;
};

// Preserve vehicle metadata, but use only validated
// backend quotations for actual upgrade prices.
const mergedUpgradeOptions = new Map<number, InlineUpgradeOption>(
  ((upgradeOptions ?? []) as InlineUpgradeOption[]).map(
    (option) => [
      Number(option.vehicleTypeId),
      {
        ...option,
        price: null,
        estimatedPrice: null,
        estimatedExtra: null,
      },
    ],
  ),
);

// Add valid quotations received from the backend.
if (priceBaseMatches && upgradePricePreview) {
  for (const quote of upgradePricePreview.prices) {
    const amount = quote.price;

    if (
      Number(quote.vehicleTypeId) === Number(vehicleTypeId) ||
      typeof amount !== "number" ||
      !Number.isFinite(amount) ||
      amount <= 0 ||
      (
        quote.source === "calculated_preview" &&
        !upgradePricePreview.parityValidated
      )
    ) {
      continue;
    }

    const id = Number(quote.vehicleTypeId);
    const existing = mergedUpgradeOptions.get(id);

    mergedUpgradeOptions.set(id, {
      ...existing,
      vehicleTypeId: id,
      name:
        quote.vehicleName ||
        existing?.name ||
        `Vehicle Type ${id}`,
      price: amount,
      occupancy: existing?.occupancy ?? quote.capacity,
      estimatedPrice: null,
      estimatedExtra: null,
    });
  }
}

const visibleUpgradeOptions = [...mergedUpgradeOptions.values()]
  .filter(
    (option) =>
      option.vehicleTypeId !== Number(vehicleTypeId) &&
      (
        option.price == null ||
        (
          Number.isFinite(option.price) &&
          option.price > 0
        )
      )
  )
  .sort((a, b) => {
    const rank = (option: InlineUpgradeOption) =>
      option.price != null
        ? 0
        : option.estimatedExtra != null
          ? 1
          : option.estimatedPrice != null
            ? 2
            : 3;

    const priority = rank(a) - rank(b);

    if (priority !== 0) return priority;

    if (a.price != null && b.price != null) {
      return a.price - b.price;
    }

    if (
      a.estimatedExtra != null &&
      b.estimatedExtra != null
    ) {
      return a.estimatedExtra - b.estimatedExtra;
    }

    return (
      (a.occupancy ?? 0) - (b.occupancy ?? 0) ||
      a.name.localeCompare(b.name)
    );
  });
// Show real/estimated *additional amounts* first. Other master vehicle types
// remain available on demand, without misleading "upgrade price" claims.
const pricedUpgradeOptions = visibleUpgradeOptions.filter(
  (option) =>
    typeof option.price === "number" &&
    Number.isFinite(option.price) &&
    option.price > 0,
);

const unpricedUpgradeOptions = visibleUpgradeOptions.filter(
  (option) => option.price == null,
);

const displayedUpgradeOptions =
  isSuperAdmin && showAllUpgradeOptions
    ? visibleUpgradeOptions
    : pricedUpgradeOptions;

const selectedUpgrade = visibleUpgradeOptions.find(
  (option) => option.vehicleTypeId === selectedUpgradeTypeId,
) ?? null;

const quoteToConfirm = (upgradePricePreview?.prices ?? []).find(
  (option) =>
    option.vehicleTypeId === selectedUpgradeTypeId &&
    typeof option.price === "number" &&
    Number.isFinite(option.price) &&
    option.price > 0 &&
    (
      option.source === "saved_quote" ||
      upgradePricePreview?.parityValidated === true
    ),
) ?? null;

const canConfirmUpgrade =
  priceBaseMatches &&
  selectedVehiclePrice !== null &&
  selectedUpgrade?.price != null &&
  quoteToConfirm?.price != null &&
 Number.isFinite(quoteToConfirm.price) &&
quoteToConfirm.price > 0 &&
  Math.abs(selectedUpgrade.price - quoteToConfirm.price) < 0.02 &&
  !upgradePriceLoading &&
  !isConfirmingUpgrade;

const vehicleOriginTooltipSuppressedUntilRef = React.useRef(0);

  const suppressVehicleOriginTooltipBriefly = () => {
    vehicleOriginTooltipSuppressedUntilRef.current = Date.now() + 800;
    hideVehicleOriginTooltip();
  };

  const canShowVehicleOriginTooltip = () => {
    return (
      !showConfirmDialog &&
      !isUpdatingVehicle &&
      Date.now() >= vehicleOriginTooltipSuppressedUntilRef.current
    );
  };

  const handleConfirmDialogOpenChange = (open: boolean) => {
    if (!open) {
      suppressVehicleOriginTooltipBriefly();
    }

    setShowConfirmDialog(open);
  };

  return (
    <div
      // V12 Super Admin single-box accordion: outer border/dividers are owned by VehicleSection.
data-super-admin-vehicle-type-id={
  showSharedVehicleLayout
    ? String(vehicleTypeId ?? "")
    : undefined
}
className={showSharedVehicleLayout
  ? "bg-white px-4 py-3"
  : "bg-white rounded-lg shadow-sm border border-gray-200 p-4 mt-4"}
style={showSharedVehicleLayout
  ? { scrollMarginTop: "var(--dvi-vehicle-scroll-offset, 96px)" }
  : undefined}
    >
  <div
  className={
   showSharedVehicleLayout
  ? `flex flex-wrap items-center gap-x-6 gap-y-2 ${
          isSuperAdminVehicleListExpanded ? "mb-4" : "mb-0"
        }`
      : "flex flex-wrap items-center gap-x-6 gap-y-2 mb-4"
  }
>
  {/* LEFT: Vehicle heading and date underneath */}
  <div className="flex min-w-0 flex-1 flex-col items-start gap-1">
    {showSharedVehicleLayout ? (
  <button
        type="button"
        data-testid="super-admin-vehicle-list-toggle"
        onClick={onToggleSuperAdminExpanded}
        aria-expanded={isSuperAdminVehicleListExpanded}
        aria-controls={superAdminVehicleListPanelId}
        aria-label={`${isSuperAdminVehicleListExpanded ? "Collapse" : "Expand"} vehicle list for ${vehicleTypeLabel}`}
        className="inline-flex min-w-0 items-center gap-2 rounded-md px-1 py-1 text-left transition-colors hover:bg-purple-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500"
      >
        <span className="text-base font-bold uppercase">
          VEHICLE LIST FOR{" "}
          <span className="text-purple-600">
            "{vehicleTypeLabel}"
          </span>
        </span>

        {isSuperAdminVehicleListExpanded ? (
          <ChevronDown
            className="h-4 w-4 shrink-0 text-purple-700"
            aria-hidden="true"
          />
        ) : (
          <ChevronRight
            className="h-4 w-4 shrink-0 text-purple-700"
            aria-hidden="true"
          />
        )}
      </button>
    ) : (
      <h5 className="text-base font-bold uppercase">
        VEHICLE LIST FOR{" "}
        <span className="text-purple-600">
          "{vehicleTypeLabel}"
        </span>
      </h5>
    )}

{showSuperAdminVendorComparison &&
  showVendorDetails && (
    <VehicleVendorInlineSummary
      vehicles={sortedVehicles}
      selectedVendorEligibleId={selectedVendorEligibleId}
      resolveVehicleDisplayAmount={resolveVehicleDisplayAmount}
      formatCurrencyINR={formatCurrencyINR}
      vehicleTypeLabel={String(vehicleTypeLabel ?? "")}
      hideSelectedPrice={
        canUseVehicleUpgrade &&
        selectedVehiclePrice !== null
      }
    />
  )}

{isAgent && selectedVehicle && (
  <span className="pl-1 text-sm font-semibold text-purple-800">
    {selectedVehicle.vehicleOrigin || "Selected vehicle"}
  </span>
)}

    {dateRange && (
      <span className="pl-1 text-sm text-gray-600">
        {dateRange}
      </span>
    )}
  </div>

  {/* MIDDLE: Selected vehicle quotation */}
  {canUseVehicleUpgrade && (
      <div className="shrink-0 text-right">
        <span className="whitespace-nowrap text-base font-bold text-purple-700">
          {selectedVehiclePrice !== null
            ? formatCurrencyINR(selectedVehiclePrice)
            : "Price unavailable"}
        </span>
      </div>
    )}

  {/* RIGHT: Upgrade Vehicle button */}
 {canUseVehicleUpgrade && (
      <Button
        type="button"
        size="sm"
        variant="outline"
        onClick={() => {
          setShowUpgradeInline((previous: boolean) => !previous);
          setSelectedUpgradeTypeId(null);
          setShowAllUpgradeOptions(false);
        }}
        aria-controls={upgradeInlineId}
        aria-expanded={showUpgradeInline}
        className="ml-auto shrink-0 whitespace-nowrap border-purple-300 font-semibold text-purple-700 hover:bg-purple-50"
      >
        {showUpgradeInline ? "Hide Upgrades" : "Upgrade Vehicle"}
      </Button>
    )}
{(isSuperAdmin ||
  isTravelExpertUIAccount() ||
  isAgent) &&
  typeof vehicleCostIncluded === "boolean" &&
  typeof onVehicleCostIncludedChange === "function" && (
      <label
        className="inline-flex shrink-0 items-center gap-1.5 text-sm font-medium text-purple-700"
        title="Include this vehicle in the cost preview (not saved)"
      >
        <input
          type="checkbox"
          checked={vehicleCostIncluded}
          onChange={(event) => onVehicleCostIncludedChange(event.target.checked)}
          aria-label={`Include ${vehicleTypeLabel} in cost preview`}
          className="h-4 w-4 accent-purple-600"
        />
        Include
      </label>
    )}
</div>

      {canUseVehicleUpgrade && showUpgradeInline && (
        <section
          id={upgradeInlineId}
          aria-label={`Upgrade options for ${vehicleTypeLabel}`}
          className="mb-4 mt-3 rounded-xl border border-purple-200 bg-[#fcfaff] p-4 sm:p-5"
        >
          <h6 className="mb-3 text-base font-bold text-gray-900">Vehicle Upgrade</h6>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-purple-200 bg-white px-4 py-3">
            <div>
              <p className="text-xs font-medium text-purple-700">Selected vehicle</p>
              <p className="font-semibold text-gray-900">{vehicleTypeLabel}</p>
            </div>
            <p className="text-lg font-bold text-purple-700">
              {selectedVehiclePrice !== null ? formatCurrencyINR(selectedVehiclePrice) : "Price not available"}
            </p>
          </div>

          <p className="mb-2 text-sm font-semibold text-gray-900">Upgrade to</p>
          {upgradePriceLoading && (
  <p className="mb-2 text-sm text-gray-600">
    Loading vehicle upgrade prices...
  </p>
)}

{upgradePriceError && (
  <p role="alert" className="mb-2 text-sm text-red-600">
    Unable to load upgrade prices: {upgradePriceError}
  </p>
)}

{upgradePricePreview && !priceBaseMatches && (
  <p className="mb-2 text-sm text-amber-700">
    Backend and displayed vehicle totals do not match.
    New preview prices have not been applied.
  </p>
)}

{upgradePricePreview &&
  priceBaseMatches &&
  !upgradePricePreview.parityValidated && (
    <p className="mb-2 text-sm text-amber-700">
      The backend could not verify its recalculation against
      the saved quotation. Unselected vehicle prices may
      be unavailable.
    </p>
)}
          {selectedVehiclePrice === null ? (
            <p className="rounded-lg border border-gray-200 bg-white px-3 py-3 text-sm text-gray-600">
              Select a priced vehicle first to compare upgrade costs.
            </p>
          ) : visibleUpgradeOptions.length === 0 ? (
            <p className="rounded-lg border border-gray-200 bg-white px-3 py-3 text-sm text-gray-600">
              No other vehicle types are available for this itinerary.
            </p>
          ) : (
            <div className="space-y-2">
              {pricedUpgradeOptions.length === 0 && (
                <p className="rounded-lg border border-gray-200 bg-white px-3 py-3 text-sm text-gray-600">
                  No alternative vehicle price is available yet for this itinerary.
                </p>
              )}
              <div className="grid max-h-80 gap-2 overflow-y-auto pr-1 sm:grid-cols-2">
                {displayedUpgradeOptions.map((option) => {
              const isSelected =
  selectedUpgradeTypeId === option.vehicleTypeId;

const extra =
  option.price != null
    ? option.price - selectedVehiclePrice
    : null;

const estimatedExtra =
  extra === null
    ? option.estimatedExtra ?? null
    : null;

const canCompare =
  priceBaseMatches &&
  !upgradePriceLoading &&
  !isConfirmingUpgrade &&
extra !== null &&
Number.isFinite(extra) &&
  (upgradePricePreview?.prices ?? []).some(
    (quote) =>
      Number(quote.vehicleTypeId) ===
        Number(option.vehicleTypeId) &&
      typeof quote.price === "number" &&
      Number.isFinite(quote.price) &&
      quote.price > 0 &&
      Math.abs(quote.price - Number(option.price)) < 0.02 &&
      (
        quote.source === "saved_quote" ||
        (
          quote.source === "calculated_preview" &&
          upgradePricePreview?.parityValidated === true
        )
      ),
  );
                  return (
                    <button
                      key={option.vehicleTypeId}
                      type="button"
                      disabled={!canCompare}
                      aria-pressed={isSelected}
                      onClick={() => setSelectedUpgradeTypeId(option.vehicleTypeId)}
                      className={`min-w-0 rounded-lg border px-3 py-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500 ${
                        isSelected ? "border-purple-500 bg-purple-50" : canCompare
                          ? "border-gray-200 bg-white hover:border-purple-300"
                          : "cursor-not-allowed border-gray-200 bg-gray-50"
                      }`}
                    >
                      <span className="flex min-w-0 items-center justify-between gap-3">
                        <span className="truncate text-sm font-semibold text-gray-900">{option.name}</span>
                        <span className={`shrink-0 text-sm font-bold ${canCompare ? "text-purple-700" : "text-gray-500"}`}>
                          {extra !== null
                          ? extra > 0
                            ? `+${formatCurrencyINR(extra)}`
                            : extra < 0
                              ? `${formatCurrencyINR(Math.abs(extra))} lower`
                              : "Same price"
                          : "Quote required"}
                        </span>
                      </span>
                      {option.price != null && (
                        <span className="mt-1 block text-xs text-gray-600">
                          Vehicle price: {formatCurrencyINR(option.price)}
                        </span>
                      )}
                      {estimatedExtra !== null && option.estimatedPrice != null && (
                        <span className="mt-1 block text-xs text-gray-600">
                          Estimated vehicle price: {formatCurrencyINR(option.estimatedPrice)}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
              {isSuperAdmin && unpricedUpgradeOptions.length > 0 && (
                <button
                  type="button"
                  onClick={() => setShowAllUpgradeOptions((previous) => !previous)}
                  className="text-left text-sm font-medium text-purple-700 hover:underline"
                >
                  {showAllUpgradeOptions
                    ? "Hide vehicles without comparable prices"
                    : `Show ${unpricedUpgradeOptions.length} other vehicle types (quote required)`}
                </button>
              )}
            </div>
          )}

          {selectedUpgrade && selectedVehiclePrice !== null &&
            (selectedUpgrade.price != null || selectedUpgrade.estimatedExtra != null) && (
            <div className="mt-3 space-y-2 rounded-lg border border-purple-200 bg-white px-4 py-3 text-sm">
              <div className="flex items-center justify-between gap-3">
                <span className="text-gray-600">Current {vehicleTypeLabel}</span>
                <span className="font-semibold text-gray-900">{formatCurrencyINR(selectedVehiclePrice)}</span>
              </div>
              {selectedUpgrade.price != null ? (
                <>
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-gray-600">New {selectedUpgrade.name}</span>
                    <span className="font-semibold text-gray-900">{formatCurrencyINR(selectedUpgrade.price)}</span>
                  </div>
                  <div className="flex items-center justify-between gap-3 border-t border-purple-100 pt-2 font-bold text-purple-700">
                    <span>Extra amount (difference)</span>
                    <span>+{formatCurrencyINR(selectedUpgrade.price - selectedVehiclePrice)}</span>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-gray-600">New {selectedUpgrade.name}</span>
                    <span className="font-medium text-gray-700">Estimated separately</span>
                  </div>
                  <div className="flex items-center justify-between gap-3 border-t border-purple-100 pt-2 font-bold text-purple-700">
                    <span>Estimated extra amount</span>
                    <span>+{formatCurrencyINR(selectedUpgrade.estimatedExtra ?? 0)}</span>
                  </div>
                </>
              )}
            </div>
          )}
<div className="mt-4 flex justify-end gap-3">
  <Button
    type="button"
    variant="outline"
    disabled={isConfirmingUpgrade}
    onClick={() => {
      setSelectedUpgradeTypeId(null);
      setShowUpgradeInline(false);
      setShowAllUpgradeOptions(false);
    }}
  >
    Back
  </Button>

  <Button
    type="button"
    disabled={!canConfirmUpgrade}
    className="bg-purple-600 text-white hover:bg-purple-700"
    onClick={async () => {
      if (
        !canConfirmUpgrade ||
        quoteToConfirm?.price == null ||
        selectedVehiclePrice === null
      ) {
        return;
      }

      setIsConfirmingUpgrade(true);

      try {
        const vendorId = Number(selectedVendorEligibleId || 0);

        const result = await confirmVehicleUpgrade({
          planId: Number(itineraryPlanId),
          currentVehicleTypeId: Number(vehicleTypeId),
          newVehicleTypeId: quoteToConfirm.vehicleTypeId,
          expectedCurrentPrice: selectedVehiclePrice,
          expectedNewPrice: quoteToConfirm.price,
          ...(Number.isInteger(vendorId) && vendorId > 0
            ? { selectedVendorEligibleId: vendorId }
            : {}),
        });

        if (!result.success) {
          throw new Error("Vehicle upgrade was not confirmed.");
        }

        toast.success("Vehicle upgraded successfully.");

        // Reload the authoritative itinerary details and overall cost.
        window.location.reload();
      } catch (error) {
        toast.error(
          error instanceof Error
            ? error.message
            : "Unable to confirm vehicle upgrade.",
        );
      } finally {
        setIsConfirmingUpgrade(false);
      }
    }}
  >
    {isConfirmingUpgrade ? (
      <>
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        Confirming...
      </>
    ) : (
      "Confirm Upgrade"
    )}
  </Button>
</div>
        </section>
      )}

      {showSuperAdminVendorComparison ? (
        <div id={superAdminVehicleListPanelId} hidden={!isSuperAdminVehicleListExpanded}>
          <SuperAdminCumulativeVehicleComparison
          vehicleTypeLabel={vehicleTypeLabel}
          dateRange={dateRange}
          routes={routes}
          vehicles={sortedVehicles}
          selectedVendorEligibleId={selectedVendorEligibleId}
          onSelectVendor={handleRadioChange}
          onCopyBreakdown={copyVehicleBreakdownForOutlook}
          formatCurrencyINR={formatCurrencyINR}
          resolveVehicleDisplayAmount={resolveVehicleDisplayAmount}
          />
        </div>
      ) : (
        <div
          id={
            showSharedVehicleLayout
              ? superAdminVehicleListPanelId
              : undefined
          }
          hidden={
            showSharedVehicleLayout &&
            !isSuperAdminVehicleListExpanded
          }
        >
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
  Number(selectedVendorEligibleId || 0) > 0 &&
  Number(selectedVendorEligibleId) ===
    Number(v.vendorEligibleId || 0)
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
  onMouseEnter={(e) => {
    if (!canShowVehicleOriginTooltip()) return;

    showVehicleOriginTooltip(index, e);
  }}
  onMouseMove={(e) => {
    if (!canShowVehicleOriginTooltip()) {
      hideVehicleOriginTooltip();
      return;
    }

    moveVehicleOriginTooltip(index, e);
  }}
  onMouseLeave={hideVehicleOriginTooltip}
  onClick={(e) => e.stopPropagation()}
>
  <span
    className="cursor-help underline decoration-dotted underline-offset-2"
    tabIndex={0}
    onFocus={(e) => {
      if (!canShowVehicleOriginTooltip()) return;

      showVehicleOriginTooltipFromFocus(index, e);
    }}
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
                      <span className="ml-2 text-xs text-gray-500">{isExpanded ? "\u25BC" : "\u25B6"}</span>

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

                          {/* Ã¢â€â‚¬Ã¢â€â‚¬ Day-wise per-route table Ã¢â€â‚¬Ã¢â€â‚¬ */}
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

    {/* Ã¢â€â‚¬Ã¢â€â‚¬ Full-width stacked summary tables Ã¢â€â‚¬Ã¢â€â‚¬ */}
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
                                        {(v.localExtraKms ?? 0).toFixed(0)} * {"\u20B9"}{(v.extraKmRate ?? 0).toFixed(2)} = {formatCurrencyINR(v.localExtraKmCharge)}
                                      </td>
                                    </tr>
                                  )}
                                  {(v.outstationExtraKms ?? 0) > 0 && (
                                    <tr>
                                      <td className="w-1/2 border border-gray-300 px-1 py-1 text-gray-600 font-medium">OUTSTATION EXTRA KM</td>
                                      <td className="w-1/2 border border-gray-300 px-1 py-1 text-right text-gray-800 font-semibold">
                                        {(v.outstationExtraKms ?? 0).toFixed(0)} * {"\u20B9"}{(v.extraKmRate ?? 0).toFixed(2)} = {formatCurrencyINR(v.outstationExtraKmCharge)}
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

        </div>
      )}

      {/* Confirmation Dialog */}
      <Dialog
        open={showConfirmDialog}
        onOpenChange={handleConfirmDialogOpenChange}
      >
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
    suppressVehicleOriginTooltipBriefly();
    setShowConfirmDialog(false);
    setPendingVendorSelection(null);
  }}
  disabled={isUpdatingVehicle}
>
  Cancel
</Button>
           <Button
  onClick={async () => {
    suppressVehicleOriginTooltipBriefly();

    try {
      await handleConfirmSelection();
    } finally {
      suppressVehicleOriginTooltipBriefly();
    }
  }}
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
