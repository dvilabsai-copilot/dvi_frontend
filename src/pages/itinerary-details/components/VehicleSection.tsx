import React, { type RefObject } from "react";
import { USER_ROLES } from "@/constants/systemRoles";
import { getAuthenticatedRoleId, isTravelExpertUIAccount } from "@/services/accessControl";
import { VehicleList } from "../../VehicleList";
import { SuperAdminVehicleWorkbookProvider, SuperAdminVehicleExcelPicker } from "../../SuperAdminVehicleWorkbookContext";
import { getVehicleAmountNumber } from "../utils/domain.utils";
import { VehicleTypesAPI, type VehicleTypeListRow } from "@/services/vehicleTypeService";
import { fetchEligibleVehicleTypes, fetchVehicleTypes, type SimpleOption } from "@/services/itineraryDropdownsMock";
import { getVehicleOptionCalculatedCost } from "../../CreateItinerary/helpers/createItinerary.utils";
import type {
  ItineraryDay,
  ItineraryVehicleRow,
  VehicleSelection,
} from "../itinerary-details.types";

interface VehicleSectionProps {
  vehicleListRef: RefObject<HTMLDivElement>;
  summaryStickyHeight: number;
   vehicles: ItineraryVehicleRow[];
  vehicleSelections?: VehicleSelection[];
  vehicleRateAvailability?: Array<{
    vehicleTypeId: number;
    vehicleTypeName: string;
    message: string;
  }>;
  planId: number;
  dateRange?: string;
  days: ItineraryDay[];
  canViewCostBreakdown: boolean;
  showVendorDetails: boolean;
    onRefresh: () => void;
  vehicleCostSelection?: {
    includeByType: Record<number, boolean>;
    onChange: (vehicleTypeId: number, included: boolean) => void;
  };
}

// Use the same positive quoted amount priority as VehicleList's displayed price.
// A zero grandTotal must not hide a valid totalAmount quotation.
const getVehicleQuotedAmount = (vehicle: ItineraryVehicleRow): number => {
  const quote = vehicle as ItineraryVehicleRow & { grandTotal?: number | string | null };
  for (const raw of [quote.grandTotal, quote.totalAmount]) {
    if (raw == null || raw === "") continue;
    const amount = typeof raw === "number"
      ? raw
      : Number(String(raw).replace(/,/g, "").replace(/[^\d.-]/g, ""));
    if (Number.isFinite(amount) && amount > 0) return amount;
  }
  return getVehicleAmountNumber(vehicle);
};

/** Groups and renders available vehicles while keeping assignment and sort rules local to the section. */
export const VehicleSection: React.FC<VehicleSectionProps> = ({
  vehicleListRef,
  summaryStickyHeight,
   vehicles,
  vehicleSelections = [],
  vehicleRateAvailability = [],
  planId,
  dateRange = "",
  days,
  canViewCostBreakdown,
  showVendorDetails,
  onRefresh,
  vehicleCostSelection,
}) => {
  // V11 Super Admin accordion: one expanded vehicle category at a time.
  // null = all collapsed; clicking the open category collapses it.
  const [openSuperAdminVehicleTypeId, setOpenSuperAdminVehicleTypeId] = React.useState<number | null>(null);
  // V12 Super Admin single-box accordion. The role guard matches VehicleListView.
 const authenticatedRole = getAuthenticatedRoleId();

const isAgentVehicleLogin =
  authenticatedRole === USER_ROLES.AGENT;

const isInternalVehicleAccordion =
  authenticatedRole === USER_ROLES.ADMIN ||
  isTravelExpertUIAccount() ||
  authenticatedRole === USER_ROLES.ACCOUNTS;

const isSuperAdminVehicleAccordion =
  isInternalVehicleAccordion || isAgentVehicleLogin;

const canLoadVehicleUpgradeOptions =
  canViewCostBreakdown || isAgentVehicleLogin;

  // Vehicle master provides additional names and seating capacities even when
  // that type has not been quoted for this itinerary yet.
  const [vehicleCatalog, setVehicleCatalog] = React.useState<VehicleTypeListRow[]>([]);

  React.useEffect(() => {
    if (!isSuperAdminVehicleAccordion || !canLoadVehicleUpgradeOptions) return;
    let cancelled = false;

    const loadCatalog = async () => {
      // Some roles cannot read Vehicle Type settings. Use the itinerary
      // dropdown if the master list is inaccessible or returns no active rows.
      try {
        const types = await VehicleTypesAPI.list();
        const active = types.filter((type) => type.status === 1 && type.id > 0 && type.title.trim());
        if (active.length) {
          if (!cancelled) setVehicleCatalog(active);
          return;
        }
      } catch {
        // Try the itinerary dropdown below.
      }

      try {
        const types = await fetchVehicleTypes();
        if (!cancelled) {
          setVehicleCatalog(types
            .filter((type) => Number(type.id) > 0 && type.label.trim())
            .map((type) => ({
              id: Number(type.id),
              title: type.label,
              occupancy: Number(type.capacity || 0),
              status: 1 as const,
            })));
        }
      } catch {
        if (!cancelled) setVehicleCatalog([]);
      }
    };

    void loadCatalog();
    return () => { cancelled = true; };
  }, [isSuperAdminVehicleAccordion, canLoadVehicleUpgradeOptions]);

  // Use the same eligible-vehicle pricing source as Create Itinerary.
  // The returned calculatedCost is an estimate, NOT a saved vendor quotation.
  // Build aligned source/destination pairs from itinerary days (with travel-leg fallback).
  const vehiclePricingRouteKey = JSON.stringify(days.flatMap((day) => {
    const from = String(day.departure ?? "").trim();
    const to = String(day.arrival ?? "").trim();
    if (from && to) return [{ from, to }];
    return (day.segments ?? [])
      .filter((segment) => segment.type === "travel")
      .map((segment) => ({ from: segment.from.trim(), to: segment.to.trim() }))
      .filter((pair) => pair.from && pair.to);
  }));
  const [createItineraryVehicleOptions, setCreateItineraryVehicleOptions] = React.useState<SimpleOption[]>([]);

  React.useEffect(() => {
    if (
  !isSuperAdminVehicleAccordion ||
  !canLoadVehicleUpgradeOptions ||
  !(planId > 0)
) return;
    const pairs = JSON.parse(vehiclePricingRouteKey) as Array<{ from: string; to: string }>;
    if (!pairs.length) {
      setCreateItineraryVehicleOptions([]);
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const result = await fetchEligibleVehicleTypes({
          itineraryPlanId: planId,
          sourceLocation: pairs.map((pair) => pair.from),
          nextVisitingLocation: pairs.map((pair) => pair.to),
        });
        if (!cancelled) setCreateItineraryVehicleOptions(result.vehicleTypes ?? []);
      } catch {
        if (!cancelled) setCreateItineraryVehicleOptions([]);
      }
    })();
    return () => { cancelled = true; };
  }, [isSuperAdminVehicleAccordion, canLoadVehicleUpgradeOptions, planId, vehiclePricingRouteKey]);

  // Changing vehicle types can collapse a tall table above the next heading.
  // After React commits the new layout, align the OPENED heading to the top.
  React.useEffect(() => {
    if (!isSuperAdminVehicleAccordion || openSuperAdminVehicleTypeId === null) return;
    const frame = window.requestAnimationFrame(() => {
      const activeVehicle = vehicleListRef.current?.querySelector<HTMLElement>(
        `[data-super-admin-vehicle-type-id="${openSuperAdminVehicleTypeId}"]`,
      );
      activeVehicle?.scrollIntoView({ behavior: "auto", block: "start" });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [isSuperAdminVehicleAccordion, openSuperAdminVehicleTypeId, vehicleListRef]);

  const vehiclesByType = new Map<number, ItineraryVehicleRow[]>();
  const typeOrder: number[] = [];
  vehicles.forEach((vehicle) => {
    const typeId = vehicle.vehicleTypeId || 0;
    if (!vehiclesByType.has(typeId)) {
      vehiclesByType.set(typeId, []);
      typeOrder.push(typeId);
    }
    vehiclesByType.get(typeId)?.push(vehicle);
  });

  const routes = days.map((day) => ({
    date: day.date,
    destination: day.departure || "",
    // V18.1: Use recorded itinerary travel legs for hotspot/location KM.
    // No new API call and no guess based on straight-line map distances.
    hotspotKmLegs: (day.segments ?? []).flatMap((segment) => {
      if (segment.type !== "travel") return [];
      const metadata = segment as unknown as Record<string, unknown>;
      if (metadata.isDeleted === true || metadata.deleted === true ||
          metadata.isExcluded === true || metadata.excluded === true ||
          metadata.removed === true || metadata.deletedAt != null ||
          metadata.deleted_at != null ||
          ["deleted", "excluded"].includes(String(metadata.status ?? "").toLowerCase())) return [];
      const from = String(segment.from || "").trim();
      const to = String(segment.to || "").trim();
      if (!from || !to) return [];
      return [{ from, to, distance: segment.distance ?? null }];
    }),
    label: `Day ${day.dayNumber} - ${day.date ? new Date(day.date).toLocaleDateString('en-GB', { month: 'short', day: '2-digit' }) : ""}`,
  }));

  const availabilityByType = new Map(
    vehicleRateAvailability.map((item) => [Number(item.vehicleTypeId || 0), item]),
  );
  const renderTypeOrder = [
    ...typeOrder,
    ...vehicleRateAvailability
      .map((item) => Number(item.vehicleTypeId || 0))
      .filter((typeId) => typeId > 0 && !typeOrder.includes(typeId)),
  ];

  return (
 <SuperAdminVehicleWorkbookProvider
  enabled={isInternalVehicleAccordion}
      vehicleTypes={renderTypeOrder.filter((typeId) => (vehiclesByType.get(typeId)?.length ?? 0) > 0).map((typeId) => ({
        id: typeId, label: vehiclesByType.get(typeId)?.[0]?.vehicleTypeName || `Vehicle Type ${typeId}`,
      }))}
    >
    <div
      ref={vehicleListRef}
      id="vehicle-list-section"
      style={{
        scrollMarginTop: `${summaryStickyHeight + 12}px`,
        ["--dvi-vehicle-scroll-offset" as string]: `${summaryStickyHeight + 12}px`,
      } as React.CSSProperties}
    >
      <div className={isSuperAdminVehicleAccordion
        ? "rounded-xl border border-gray-200 bg-white shadow-sm divide-y divide-gray-200"
        : "contents"}>
      {/* V24: Super Admin multi-sheet vehicle workbook; category selection does not alter vendor selection. */}
      {isInternalVehicleAccordion && <SuperAdminVehicleExcelPicker />}
      {renderTypeOrder.map((typeId) => {
        const rawVehicles = vehiclesByType.get(typeId) || [];
        const availabilityMessage = availabilityByType.get(typeId);

        if (rawVehicles.length === 0 && availabilityMessage) {
          return (
            <div
              key={`vehicle-rate-message-${typeId}`}
              className={isSuperAdminVehicleAccordion
                ? "bg-white px-4 py-3"
                : "bg-white rounded-lg shadow-sm border border-[#eadcf5] p-6 mt-4"}
            >
              <h5 className="text-base font-bold uppercase">
                VEHICLE LIST FOR{" "}
                <span className="text-purple-600">"{availabilityMessage.vehicleTypeName}"</span>
              </h5>
              <div className="mt-4 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                {availabilityMessage.message}
              </div>
            </div>
          );
        }

        if (rawVehicles.length === 0) return null;

        const sortedVehicles = [...rawVehicles].sort(
          (a, b) =>
            getVehicleQuotedAmount(a) -
            getVehicleQuotedAmount(b),
        );

        const backendSelection = vehicleSelections.find(
          (selection) =>
            Number(selection.vehicleTypeId || 0) ===
            Number(typeId),
        );

        const selectedVendorEligibleId =
          backendSelection?.selectedVendorEligibleId ?? null;
        const assignedVendorEligibleIds =
          backendSelection?.assignedVendorEligibleIds ?? [];

      const vehicleTypeLabel =
  sortedVehicles[0]?.vehicleTypeName ||
  `Vehicle Type ${typeId}`;

// Show all potential upgrades from the real vehicle master, not only types
// already quoted inside this itinerary. A missing quote has no price.
const currentType = vehicleCatalog.find((item) => item.id === typeId);
const currentOccupancy = Number(currentType?.occupancy ?? 0);
const candidateTypes = new Map<number, { name: string; occupancy: number }>();

vehicleCatalog.forEach((item) => {
  if (item.id === typeId) return;
  // Larger capacity and same-capacity premium alternatives remain discoverable.
  if (currentOccupancy > 0 && item.occupancy > 0 &&
      item.occupancy < currentOccupancy) return;
  candidateTypes.set(item.id, { name: item.title, occupancy: item.occupancy });
});

// Include the same eligible types shown during Create Itinerary.
createItineraryVehicleOptions.forEach((option) => {
  const id = Number(option.id);
  if (!(id > 0) || id === typeId) return;
  const occupancy = Number(option.capacity ?? 0);
  if (currentOccupancy > 0 && occupancy > 0 && occupancy < currentOccupancy) return;
  if (!candidateTypes.has(id)) {
    candidateTypes.set(id, { name: option.label, occupancy });
  }
});

const currentCalculatedCost = getVehicleOptionCalculatedCost(
  createItineraryVehicleOptions.find((option) => Number(option.id) === typeId),
);

// Keep valid quoted categories visible if the vehicle master is unavailable.
typeOrder.forEach((otherTypeId) => {
  if (otherTypeId === typeId || candidateTypes.has(otherTypeId)) return;
  const vehicle = vehiclesByType.get(otherTypeId)?.[0];
  if (vehicle) candidateTypes.set(otherTypeId, {
    name: vehicle.vehicleTypeName || `Vehicle Type ${otherTypeId}`,
    occupancy: 0,
  });
});

const upgradeOptions = Array.from(candidateTypes, ([otherTypeId, info]) => {
  const selectedOtherVendorId = Number(vehicleSelections.find(
    (item) => Number(item.vehicleTypeId || 0) === otherTypeId,
  )?.selectedVendorEligibleId || 0);

  const quotedVehicles = (vehiclesByType.get(otherTypeId) ?? [])
    .filter((vehicle) =>
      Number(vehicle.vendorEligibleId || 0) > 0 &&
      vehicle.rateAvailable !== false &&
      (vehicle.availableVehicleCount == null || vehicle.availableVehicleCount > 0) &&
      getVehicleQuotedAmount(vehicle) > 0
    )
    .sort((a, b) => getVehicleQuotedAmount(a) - getVehicleQuotedAmount(b));

  const chosen = quotedVehicles.find((vehicle) =>
    selectedOtherVendorId > 0 && Number(vehicle.vendorEligibleId) === selectedOtherVendorId,
  ) ?? quotedVehicles.find((vehicle) => vehicle.isAssigned === true) ?? quotedVehicles[0];

  const targetCalculatedCost = getVehicleOptionCalculatedCost(
    createItineraryVehicleOptions.find((option) => Number(option.id) === otherTypeId),
  );
  // Never subtract a Create Itinerary estimate from a vendor's final quote.
  const estimatedExtra = !chosen && currentCalculatedCost !== null &&
    targetCalculatedCost !== null && targetCalculatedCost > currentCalculatedCost
      ? targetCalculatedCost - currentCalculatedCost
      : null;

  return {
    vehicleTypeId: otherTypeId,
    name: chosen?.vehicleTypeName || info.name,
    price: chosen ? getVehicleQuotedAmount(chosen) : null,
    estimatedPrice: !chosen ? targetCalculatedCost : null,
    estimatedExtra,
    occupancy: info.occupancy,
  };
}).filter((option) =>
  // Do not advertise a cheaper Create Itinerary estimate as an upgrade.
  option.price !== null || currentCalculatedCost === null ||
  option.estimatedPrice === null || option.estimatedExtra !== null
);

return (
  <VehicleList
    key={typeId}
    upgradeOptions={upgradeOptions}
    vehicleCostIncluded={vehicleCostSelection?.includeByType[typeId]}
    onVehicleCostIncludedChange={vehicleCostSelection
      ? (included) => vehicleCostSelection.onChange(typeId, included)
      : undefined}
            vehicleTypeId={typeId}
            vehicleTypeLabel={vehicleTypeLabel}
            vehicles={sortedVehicles}
            selectedVendorEligibleId={selectedVendorEligibleId}
            assignedVendorEligibleIds={assignedVendorEligibleIds}
            itineraryPlanId={planId}
            onRefresh={onRefresh}
            dateRange={dateRange}
            routes={routes}
            canViewCostBreakdown={canViewCostBreakdown}
            showVendorDetails={showVendorDetails}
            superAdminExpanded={openSuperAdminVehicleTypeId === typeId}
            onToggleSuperAdminExpanded={() =>
              setOpenSuperAdminVehicleTypeId((current) => current === typeId ? null : typeId)
            }
          />
        );
      })}
      </div>
    </div>
    </SuperAdminVehicleWorkbookProvider>
  );
};
