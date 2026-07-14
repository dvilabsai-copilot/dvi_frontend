import React, { type RefObject } from "react";
import { VehicleList } from "../../VehicleList";
import { getVehicleAmountNumber } from "../utils/domain.utils";
import type { ItineraryDay, ItineraryVehicleRow } from "../itinerary-details.types";

interface VehicleSectionProps {
  vehicleListRef: RefObject<HTMLDivElement>;
  summaryStickyHeight: number;
  vehicles: ItineraryVehicleRow[];
  planId: number;
  dateRange?: string;
  days: ItineraryDay[];
  canViewCostBreakdown: boolean;
  showVendorDetails: boolean;
  onRefresh: () => void;
  onSelectedTotalChange: (payload: { vehicleTypeId: number; totalAmount: number; totalQty: number }) => void;
}

/** Groups and renders available vehicles while keeping assignment and sort rules local to the section. */
export const VehicleSection: React.FC<VehicleSectionProps> = ({
  vehicleListRef,
  summaryStickyHeight,
  vehicles,
  planId,
  dateRange = "",
  days,
  canViewCostBreakdown,
  showVendorDetails,
  onRefresh,
  onSelectedTotalChange,
}) => {
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
    label: `Day ${day.dayNumber} - ${day.date ? new Date(day.date).toLocaleDateString('en-GB', { month: 'short', day: '2-digit' }) : ""}`,
  }));

  return (
    <div ref={vehicleListRef} id="vehicle-list-section" style={{ scrollMarginTop: `${summaryStickyHeight + 12}px` }}>
      {typeOrder.map((typeId) => {
        const rawVehicles = vehiclesByType.get(typeId) || [];
        const sortedVehicles = [...rawVehicles].sort((a, b) => getVehicleAmountNumber(a) - getVehicleAmountNumber(b));
        const cheapest = sortedVehicles[0];
        const vehicleKey = (vehicle: ItineraryVehicleRow) => String(
          vehicle.vendorEligibleId ?? vehicle.vehicleId ?? vehicle.vehicleIds?.[0] ?? `${vehicle.vendorName}-${vehicle.branchName}-${vehicle.totalAmount}`,
        );
        const cheapestKey = cheapest ? vehicleKey(cheapest) : "";
        const vehiclesForType = sortedVehicles.map((vehicle) => ({ ...vehicle, isAssigned: vehicleKey(vehicle) === cheapestKey }));
        const vehicleTypeLabel = vehiclesForType[0]?.vehicleTypeName || `Vehicle Type ${typeId}`;

        return (
          <VehicleList
            key={typeId}
            vehicleTypeId={typeId}
            vehicleTypeLabel={vehicleTypeLabel}
            vehicles={vehiclesForType}
            itineraryPlanId={planId}
            onRefresh={onRefresh}
            onSelectedTotalChange={onSelectedTotalChange}
            dateRange={dateRange}
            routes={routes}
            canViewCostBreakdown={canViewCostBreakdown}
            showVendorDetails={showVendorDetails}
          />
        );
      })}
    </div>
  );
};
