import React, { useEffect, useMemo, useState } from "react";
import {
  Calculator,
  CarFront,
  Hotel,
  Info,
  SlidersHorizontal,
  Tag,
  Trash2,
  TrendingUp,
  Trophy,
  UserRound,
  Ticket,
} from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";

import type {
  ItineraryDetailsResponse,
  ItineraryVehicleRow,
  VehicleSelection,
} from "../itinerary-details.types";

import { getVehicleAmountNumber } from "../utils/domain.utils";

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
    "quoteId" |
      "costBreakdown" |
      "itineraryPreference"
  >;

  canViewCostBreakdown: boolean;
  financialTotals: FinancialTotals;

  vehicles?: ItineraryVehicleRow[];
  vehicleSelections?: VehicleSelection[];

  liveGuideCost?: number;
  liveActivityCost?: number;

  showHotelCost?: boolean;
  showVehicleCost?: boolean;

  onFinalSellingPriceChange?: (value: number) => void;
};

type SelectedVehicleCost = {
  key: string;
  vehicleTypeId: number;
  vehicleName: string;
  quantity: number;
  amount: number;
};
const formatMoney = (value: number) =>
  Number(value || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const toNumber = (value: unknown) => {
  const amount = Number(value ?? 0);

  return Number.isFinite(amount) ? amount : 0;
};

export const ItineraryOverallCost: React.FC<
  ItineraryOverallCostProps
> = ({
  itinerary,
  financialTotals,
  vehicles = [],
  vehicleSelections = [],
  liveGuideCost,
  liveActivityCost,
  showHotelCost = true,
  showVehicleCost = true,
  onFinalSellingPriceChange,
}) => {
 const cost = itinerary.costBreakdown;

const profitStorageKey =
  itinerary.quoteId
    ? `public-itinerary-profit:${itinerary.quoteId}`
    : "";

const [profitInput, setProfitInput] =
  useState("");

const [removedVehicleKeys, setRemovedVehicleKeys] =
  useState<string[]>([]);

  useEffect(() => {
  if (!profitStorageKey) {
    setProfitInput("");
    return;
  }

  const savedProfit =
    window.localStorage.getItem(
      profitStorageKey,
    );

  if (savedProfit === null) {
    setProfitInput("");
    return;
  }

  const parsedProfit =
    Number(savedProfit);

  if (
    Number.isFinite(parsedProfit) &&
    parsedProfit >= 0
  ) {
    setProfitInput(
      String(parsedProfit),
    );

    return;
  }

  setProfitInput("");
}, [profitStorageKey]);

const hotelCost =
  showHotelCost
    ? toNumber(
        financialTotals.hotelAmount,
      )
    : 0;

/*
 * Guide and Activity prices are already calculated by the backend.
 * Do not recalculate them in the frontend.
 */
const backendGuideCost = toNumber(
  cost?.totalGuideCost,
);

const backendActivityCost = toNumber(
  cost?.totalActivityCost,
);

/*
 * Prefer the live itinerary values so Cost Summary updates
 * immediately after Add/Edit/Delete Guide or Activity.
 *
 * Fall back to persisted backend costBreakdown when live values
 * are not supplied.
 */
const guideCost =
  typeof liveGuideCost === "number"
    ? Math.max(0, liveGuideCost)
    : backendGuideCost;

const activityCost =
  typeof liveActivityCost === "number"
    ? Math.max(0, liveActivityCost)
    : backendActivityCost;

const selectedVehicles = useMemo<SelectedVehicleCost[]>(() => {
  if (!showVehicleCost) {
    return [];
  }

  const rows = new Map<string, SelectedVehicleCost>();

  const addVehicleRow = (
    vehicle: ItineraryVehicleRow,
    vehicleTypeId: number,
    fallbackKey: string,
  ) => {
    const vendorEligibleId = Number(
      vehicle.vendorEligibleId || 0,
    );

    const key =
      vendorEligibleId > 0
        ? `${vehicleTypeId}:${vendorEligibleId}`
        : `${vehicleTypeId}:${fallbackKey}`;

    rows.set(key, {
      key,
      vehicleTypeId,
      vehicleName:
        vehicle.vehicleTypeName ||
        `Vehicle Type ${vehicleTypeId}`,
      quantity: Math.max(
        toNumber(vehicle.totalQty),
        1,
      ),
      amount: getVehicleAmountNumber(vehicle),
    });
  };

  vehicleSelections.forEach((selection) => {
    const vehicleTypeId = Number(
      selection.vehicleTypeId || 0,
    );

    if (!vehicleTypeId) {
      return;
    }

    const sameTypeVehicles = vehicles.filter(
      (vehicle) =>
        Number(vehicle.vehicleTypeId || 0) ===
        vehicleTypeId,
    );

    const selectedVendorEligibleId = Number(
      selection.selectedVendorEligibleId || 0,
    );

    const assignedVendorEligibleIds = (
      selection.assignedVendorEligibleIds || []
    )
      .map((id) => Number(id))
      .filter((id) => id > 0);

    /*
     * Include every assigned vehicle/vendor.
     * Also include selectedVendorEligibleId when it is not already
     * present in assignedVendorEligibleIds.
     */
    const selectedIds = Array.from(
      new Set([
        ...assignedVendorEligibleIds,
        ...(selectedVendorEligibleId > 0
          ? [selectedVendorEligibleId]
          : []),
      ]),
    );

    if (selectedIds.length > 0) {
      selectedIds.forEach((vendorEligibleId) => {
        const selectedVehicle = sameTypeVehicles.find(
          (vehicle) =>
            Number(vehicle.vendorEligibleId || 0) ===
            vendorEligibleId,
        );

        if (selectedVehicle) {
          addVehicleRow(
            selectedVehicle,
            vehicleTypeId,
            String(vendorEligibleId),
          );
        }
      });

      return;
    }

    /*
     * Older/fallback response where selection IDs are missing
     * but the vehicle row itself is marked assigned.
     */
    const assignedVehicles = sameTypeVehicles.filter(
      (vehicle) => vehicle.isAssigned,
    );

    if (assignedVehicles.length > 0) {
      assignedVehicles.forEach((vehicle, index) => {
        addVehicleRow(
          vehicle,
          vehicleTypeId,
          `assigned-${index}`,
        );
      });

      return;
    }

    /*
     * If there is only one candidate for the required type,
     * preserve the existing fallback behavior.
     */
    if (sameTypeVehicles.length === 1) {
      addVehicleRow(
        sameTypeVehicles[0],
        vehicleTypeId,
        "single",
      );
    }
  });

  /*
   * Fallback when vehicleSelections itself is unavailable.
   */
  if (rows.size === 0) {
    vehicles
      .filter((vehicle) => vehicle.isAssigned)
      .forEach((vehicle, index) => {
        const vehicleTypeId = Number(
          vehicle.vehicleTypeId || 0,
        );

        if (!vehicleTypeId) {
          return;
        }

        addVehicleRow(
          vehicle,
          vehicleTypeId,
          `fallback-${index}`,
        );
      });
  }

  /*
   * Final fallback when only the aggregate backend amount exists.
   */
if (rows.size === 0) {
  const fallbackVehicleAmount = toNumber(
    cost?.totalVehicleAmount ??
      cost?.totalVehicleCost,
  );

  const fallbackVehicleQty = Math.max(
    toNumber(cost?.totalVehicleQty),
    1,
  );

  if (fallbackVehicleAmount > 0) {
    rows.set("backend-total", {
      key: "backend-total",
      vehicleTypeId: -1,
      vehicleName: "Selected Vehicle",
      quantity: fallbackVehicleQty,
      amount:
        fallbackVehicleAmount /
        fallbackVehicleQty,
    });
  }
}

  return Array.from(rows.values());
}, [
  cost,
  vehicleSelections,
  vehicles,
  showVehicleCost,
]);

 const visibleVehicles = selectedVehicles.filter(
  (vehicle) =>
    !removedVehicleKeys.includes(vehicle.key),
);

const vehicleTotal = visibleVehicles.reduce(
  (total, vehicle) =>
    total +
    vehicle.amount *
      Math.max(vehicle.quantity, 1),
  0,
);

  useEffect(() => {
  if (!itinerary.quoteId) {
    return;
  }

  window.localStorage.setItem(
    `public-itinerary-vehicle-total:${itinerary.quoteId}`,
    String(
      vehicleTotal,
    ),
  );
}, [
  itinerary.quoteId,
  vehicleTotal,
]);

/*
 * Additional Margin is already calculated/persisted by
 * the itinerary pricing flow.
 *
 * Do not calculate the percentage again here.
 * Use the exact persisted amount so the Agent Cost Summary
 * matches Overall Cost / Clipboard costing.
 */
const profitAmount = Math.max(
  0,
  toNumber(profitInput),
);

/*
 * Agent Cost Summary must reconcile only from the
 * cost cards visible to the Agent.
 *
 * Hotel
 * + Vehicle
 * + Guide
 * + Activity
 * = Net Package Cost
 *
 * Do not inject the persisted backend additionalMargin
 * here because it is not represented as a separate
 * visible cost in this Agent summary.
 */
const netPackageCost =
  hotelCost +
  vehicleTotal +
  guideCost +
  activityCost;

const amountBeforeRoundOff =
  netPackageCost + profitAmount;

const calculatedFinalSellingPrice =
  Math.round(amountBeforeRoundOff);

const finalSellingPrice = Number(
  calculatedFinalSellingPrice.toFixed(2),
);

/*
 * Calculate the displayed Round Off from the final payable
 * so all cards reconcile exactly.
 */
const roundOffAmount = Number(
  (
    finalSellingPrice -
    amountBeforeRoundOff
  ).toFixed(2),
);

useEffect(() => {
  onFinalSellingPriceChange?.(finalSellingPrice);
}, [finalSellingPrice, onFinalSellingPriceChange]);

const totalProfit = Math.round(profitAmount);

  const margin =
    netPackageCost > 0
      ? (totalProfit / netPackageCost) * 100
      : 0;

const removeVehicle = (vehicleKey: string) => {
  setRemovedVehicleKeys((current) =>
    current.includes(vehicleKey)
      ? current
      : [...current, vehicleKey],
  );
};

const costSummaryDescription =
  showHotelCost && showVehicleCost
    ? "Review costs, vehicle selection, add your markup and set the selling price"
    : showHotelCost
      ? "Review hotel cost, add your markup and set the selling price"
      : "Review vehicle cost, add your markup and set the selling price";

const costFlowGridClassName =
  showHotelCost && showVehicleCost
    ? "grid w-full grid-cols-1 gap-2 px-3 py-4 sm:grid-cols-2 lg:grid-cols-[0.72fr_1.45fr_0.72fr_0.72fr_0.82fr_0.82fr_0.68fr_0.95fr_0.82fr]"
    : showVehicleCost
      ? "grid w-full grid-cols-1 gap-2 px-3 py-4 sm:grid-cols-2 lg:grid-cols-[1.45fr_0.72fr_0.72fr_0.82fr_0.82fr_0.68fr_0.95fr_0.82fr]"
      : "grid w-full grid-cols-1 gap-2 px-3 py-4 sm:grid-cols-2 lg:grid-cols-[0.72fr_0.72fr_0.72fr_0.82fr_0.82fr_0.68fr_0.95fr_0.82fr]";

  return (
    <Card className="mt-6 overflow-hidden border border-[#eee6f7] bg-white shadow-sm">
      <CardContent className="p-0">
        {/* HEADER */}

        <div className="flex items-start gap-3 border-b border-[#eee6f7] px-5 py-4">
         <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#f5efff] text-[#7c3fe0]">
            <Calculator className="h-6 w-6" />
          </div>

          <div>
            <h2 className="text-xl font-bold text-[#29205d]">
              Cost Summary
            </h2>

         <p className="mt-1 text-sm text-[#77718c]">
  {costSummaryDescription}
</p>
          </div>
        </div>

        {/* COST FLOW */}

<div className={costFlowGridClassName}>
{/* HOTEL COST */}

{showHotelCost && (
  <div className="relative min-w-0 self-start rounded-xl border border-[#e6def1] bg-white p-3">
    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#f5efff] text-[#6f3bd7]">
      <Hotel className="h-5 w-5" />
    </div>

    <div className="mt-3 text-sm font-semibold text-[#32286b]">
      Hotel Cost
    </div>

  <div className="mt-2 min-w-0 whitespace-nowrap text-[clamp(11px,0.95vw,15px)] font-bold tracking-tight text-[#29205d]">
  ₹ {formatMoney(hotelCost)}
</div>

    <div className="absolute -right-[23px] top-1/2 z-20 hidden h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-[#f5efff] text-lg font-bold text-[#6f3bd7] lg:flex">
      +
    </div>
  </div>
)}


{/* VEHICLE COST */}

{showVehicleCost && (
  <div className="relative min-w-0 rounded-xl border border-[#e6def1] bg-white p-3">
    <div className="flex items-start gap-2">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#f5efff] text-[#6f3bd7]">
        <CarFront className="h-5 w-5" />
      </div>

      <div>
        <div className="text-sm font-semibold text-[#32286b]">
          Vehicle Cost
        </div>

        <div className="mt-0.5 flex items-center gap-1 text-[11px] leading-tight text-[#77718c]">
          <Info className="h-3 w-3 shrink-0" />
          <span>Remove any vehicle if not required</span>
        </div>
      </div>
    </div>

    <div className="mt-3 space-y-2">
      {visibleVehicles.length > 0 ? (
        visibleVehicles.map((vehicle) => (
          <div
            key={vehicle.key}
            className="grid grid-cols-[16px_minmax(0,1fr)_auto_28px] items-center gap-2 border-b border-[#eee8f5] pb-2 last:border-0 last:pb-0"
          >
            <CarFront className="h-4 w-4 shrink-0 text-[#4d4770]" />

            <div
              className="min-w-0 truncate whitespace-nowrap text-xs font-medium text-[#40395f]"
              title={`${vehicle.vehicleName} × ${vehicle.quantity}`}
            >
              {vehicle.vehicleName} × {vehicle.quantity}
            </div>

          <div className="min-w-0 whitespace-nowrap text-[clamp(10px,0.75vw,12px)] font-semibold tracking-tight text-[#32286b]">
  ₹ {formatMoney(vehicle.amount)}
</div>

            <button
              type="button"
              aria-label={`Remove ${vehicle.vehicleName}`}
              onClick={() => removeVehicle(vehicle.key)}
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-red-100 bg-red-50 text-red-500 transition hover:bg-red-100"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        ))
      ) : (
        <div className="py-2 text-sm text-[#77718c]">
          No vehicle included
        </div>
      )}
    </div>

<div className="mt-2 flex min-w-0 items-center justify-between gap-1 border-t border-[#ddd2eb] pt-2">
  <span className="shrink-0 whitespace-nowrap text-[11px] font-semibold text-[#32286b]">
    Vehicle Total
  </span>

  <span
    className="min-w-0 whitespace-nowrap text-right text-[clamp(10px,0.8vw,13px)] font-bold tracking-tight text-[#32286b]"
    title={`₹ ${formatMoney(vehicleTotal)}`}
  >
    ₹ {formatMoney(vehicleTotal)}
  </span>
</div>

    <div className="absolute -right-[18px] top-1/2 z-20 hidden h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-[#f5efff] text-lg font-bold text-[#6f3bd7] lg:flex">
      +
    </div>
  </div>
)}

{/* GUIDE COST */}

<div className="relative min-w-0 self-start rounded-xl border border-[#e6def1] bg-white p-3">
  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#f5efff] text-[#6f3bd7]">
    <UserRound className="h-5 w-5" />
  </div>

  <div className="mt-3 text-sm font-semibold leading-tight text-[#32286b]">
    Guide Cost
  </div>

  <div className="mt-2 min-w-0 whitespace-nowrap text-[clamp(11px,0.9vw,14px)] font-bold tracking-tight text-[#29205d]">
    ₹ {formatMoney(guideCost)}
  </div>

  <div className="absolute -right-[18px] top-1/2 z-20 hidden h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-[#f5efff] text-lg font-bold text-[#6f3bd7] lg:flex">
    +
  </div>
</div>

{/* ACTIVITY COST */}

<div className="relative min-w-0 self-start rounded-xl border border-[#e6def1] bg-white p-3">
  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#f5efff] text-[#6f3bd7]">
    <Ticket className="h-5 w-5" />
  </div>

  <div className="mt-3 text-sm font-semibold leading-tight text-[#32286b]">
    Activity Cost
  </div>

  <div className="mt-2 whitespace-nowrap text-[14px] font-bold text-[#29205d]">
    ₹ {formatMoney(activityCost)}
  </div>

  <div className="absolute -right-[18px] top-1/2 z-20 hidden h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-[#f5efff] text-lg font-bold text-[#6f3bd7] lg:flex">
    +
  </div>
</div>

{/* NET PACKAGE COST */}

<div className="relative min-w-0 self-start rounded-xl border border-[#e6def1] bg-white p-3">
  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#f5efff] text-[#6f3bd7]">
    <Calculator className="h-5 w-5" />
  </div>

  <div className="mt-3 text-sm font-semibold text-[#32286b]">
    Net Package Cost
  </div>

<div className="mt-2 min-w-0 whitespace-nowrap text-[clamp(10px,0.85vw,14px)] font-bold tracking-tight text-[#29205d]">
  ₹ {formatMoney(netPackageCost)}
</div>

  <div className="absolute -right-[23px] top-1/2 z-20 hidden h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-[#f5efff] text-lg font-bold text-[#6f3bd7] lg:flex">
    +
  </div>
</div>

         {/* PROFIT */}

<div className="relative min-w-0 self-start rounded-xl border border-[#e6def1] bg-white p-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#f5efff] text-[#6f3bd7]">
              <TrendingUp className="h-5 w-5" />
            </div>

            <div className="mt-3 text-sm font-semibold text-[#32286b]">
              Add Your Profit
            </div>

            <div className="mt-3 flex h-11 overflow-hidden rounded-lg border border-[#d8cce9] bg-white">
             <span className="flex w-8 shrink-0 items-center justify-center border-r border-[#d8cce9] font-semibold text-[#51476b]">
  ₹
</span>

     <input
  type="number"
  min="0"
  step="0.01"
  value={profitInput}
  onChange={(event) => {
    const value =
      event.target.value;

   if (value === "") {
  setProfitInput("");

  if (profitStorageKey) {
    window.localStorage.removeItem(
      profitStorageKey,
    );

    window.dispatchEvent(
      new CustomEvent("dvi-profit-change", {
        detail: {
          key: profitStorageKey,
          value: "0",
        },
      }),
    );
  }

  return;
}

    const amount =
      Number(value);

  if (
  Number.isFinite(amount) &&
  amount >= 0
) {
  setProfitInput(value);

  if (profitStorageKey) {
    window.localStorage.setItem(
      profitStorageKey,
      String(amount),
    );

    window.dispatchEvent(
      new CustomEvent("dvi-profit-change", {
        detail: {
          key: profitStorageKey,
          value: String(amount),
        },
      }),
    );
  }
}
  }}
  placeholder="0"
  className="min-w-0 flex-1 bg-transparent px-2 text-right text-sm outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
/>
</div>

<div className="absolute -right-[23px] top-1/2 z-20 hidden h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-[#f5efff] text-lg font-bold text-[#6f3bd7] lg:flex">
  +
</div>
</div>

{/* ROUND OFF */}
<div className="relative min-w-0 rounded-xl border border-[#e6def1] bg-white p-3">
  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#f5efff] text-[#6f3bd7]">
    <SlidersHorizontal className="h-5 w-5" />
  </div>

  <div className="mt-3 text-sm font-semibold text-[#32286b]">
    Round Off
  </div>

 <div className="mt-2 min-w-0 whitespace-nowrap text-[clamp(11px,0.95vw,16px)] font-bold tracking-tight text-[#29205d]">
  ₹ {formatMoney(roundOffAmount)}
</div>

  <div className="absolute -right-[23px] top-1/2 z-20 hidden h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-[#f5efff] text-lg font-bold text-[#6f3bd7] lg:flex">
    =
  </div>
</div>

          {/* FINAL SELLING PRICE */}

          <div className="min-w-0 rounded-xl border border-[#dfb9ee] bg-gradient-to-br from-[#f5ddff] to-[#ffe4f8] p-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br from-[#8050e6] to-[#db49cd] text-white">
              <Tag className="h-5 w-5" />
            </div>

            <div className="mt-3 text-sm font-semibold text-[#32286b]">
              Final Selling Price
            </div>

<div
  className="mt-2 min-w-0 whitespace-nowrap text-[clamp(10px,0.85vw,13px)] font-bold tracking-tight text-[#5f2bd1]"
  title={`₹ ${formatMoney(finalSellingPrice)}`}
>
  ₹ {formatMoney(finalSellingPrice)}
</div>
          </div>

        {/* TOTAL PROFIT */}

<div className="min-w-0 rounded-xl border border-[#e6def1] bg-white p-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#f5efff] text-[#6f3bd7]">
              <Trophy className="h-4 w-4" />
            </div>

            <div className="mt-3 text-sm font-semibold text-[#32286b]">
              Your Total Profit
            </div>
<div
  className="mt-2 min-w-0 whitespace-nowrap text-[clamp(10px,0.85vw,13px)] font-bold tracking-tight text-[#29205d]"
  title={`₹ ${formatMoney(totalProfit)}`}
>
  ₹ {formatMoney(totalProfit)}
</div>

            <div className="mt-2 text-sm font-medium text-emerald-600">
              Margin: {margin.toFixed(2)}%
            </div>
          </div>
        </div>

        <div className="px-6 pb-5 text-right text-sm italic text-[#8d84a0]">
          Better Journeys. Stronger Business.
        </div>
      </CardContent>
    </Card>
  );
};

export default ItineraryOverallCost;
