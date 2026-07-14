import { useMemo } from "react";

type VehicleRow = { vehicleTypeId?: number | string | null };
type RateAvailabilityRow = { vehicleTypeId?: number | string | null };

type UseVehicleRateSelectionGuardOptions = {
  shouldShowVehicles: boolean;
  vehicles: VehicleRow[] | null | undefined;
  vehicleRateAvailability: RateAvailabilityRow[] | null | undefined;
  selectedVehicleTotalsByType: Record<number, { totalAmount?: number | string }>;
};

/** Derives the vehicle-selection gate used by quotation confirmation. */
export const useVehicleRateSelectionGuard = ({
  shouldShowVehicles,
  vehicles,
  vehicleRateAvailability,
  selectedVehicleTotalsByType,
}: UseVehicleRateSelectionGuardOptions) => {
  const vehicleTypeIdsRequiringSelection = useMemo(() => {
    const typeIds = new Set<number>();
    (vehicles || []).forEach((vehicle) => {
      const typeId = Number(vehicle.vehicleTypeId || 0);
      if (typeId > 0) typeIds.add(typeId);
    });
    (vehicleRateAvailability || []).forEach((item) => {
      const typeId = Number(item.vehicleTypeId || 0);
      if (typeId > 0) typeIds.add(typeId);
    });
    return typeIds;
  }, [vehicleRateAvailability, vehicles]);

  const hasRequiredVehicleSelection = !shouldShowVehicles || (
    vehicleTypeIdsRequiringSelection.size > 0
    && vehicleTypeIdsRequiringSelection.size === Object.keys(selectedVehicleTotalsByType).filter(
      (typeId) => Number(selectedVehicleTotalsByType[Number(typeId)]?.totalAmount || 0) > 0,
    ).length
    && Array.from(vehicleTypeIdsRequiringSelection).every(
      (typeId) => Number(selectedVehicleTotalsByType[typeId]?.totalAmount || 0) > 0,
    )
    && (vehicleRateAvailability?.length || 0) === 0
  );

  return { vehicleTypeIdsRequiringSelection, hasRequiredVehicleSelection, canConfirmQuotation: hasRequiredVehicleSelection };
};
