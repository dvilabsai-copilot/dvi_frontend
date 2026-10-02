import { useMemo } from "react";

interface ComputedVehicleTotalsOptions {
  shouldShowVehicles: boolean;

  costBreakdown?: {
    totalVehicleAmount?: number | string | null;
    totalVehicleCost?: number | string | null;
    totalVehicleQty?: number | string | null;
  } | null;

  vehicles?: Array<{
    totalQty?: number | string | null;
    totalAmount?: number | string | null;
    isAssigned?: boolean | null;
  }> | null;
}

/**
 * Calculates the selected vehicle total using:
 *
 * unit vehicle amount × selected quantity
 *
 * Example:
 * Innova Hycross
 * ₹15,856.75 × 4 = ₹63,427.00
 *
 * If selected vehicle rows are unavailable, keep the
 * existing backend costBreakdown as the safe fallback.
 */
export const useComputedVehicleTotals = ({
  shouldShowVehicles,
  costBreakdown,
  vehicles,
}: ComputedVehicleTotalsOptions) => {
  const selectedVehicleRows = useMemo(() => {
    if (!shouldShowVehicles) {
      return [];
    }

    return (vehicles || []).filter(
      (vehicle) => vehicle.isAssigned === true,
    );
  }, [shouldShowVehicles, vehicles]);

  const computedVehicleAmount = useMemo(() => {
    if (!shouldShowVehicles) {
      return 0;
    }

    if (selectedVehicleRows.length > 0) {
      return selectedVehicleRows.reduce(
        (sum, vehicle) => {
          const quantity = Math.max(
            Number(vehicle.totalQty ?? 1) || 1,
            1,
          );

          const unitAmount = Number(
            vehicle.totalAmount || 0,
          );

          return sum + unitAmount * quantity;
        },
        0,
      );
    }

    return Number(
      costBreakdown?.totalVehicleAmount ??
        costBreakdown?.totalVehicleCost ??
        0,
    );
  }, [
    costBreakdown,
    selectedVehicleRows,
    shouldShowVehicles,
  ]);

  const computedVehicleQty = useMemo(() => {
    if (!shouldShowVehicles) {
      return 0;
    }

    if (selectedVehicleRows.length > 0) {
      return selectedVehicleRows.reduce(
        (sum, vehicle) =>
          sum +
          Math.max(
            Number(vehicle.totalQty ?? 1) || 1,
            1,
          ),
        0,
      );
    }

    return Number(
      costBreakdown?.totalVehicleQty ?? 0,
    );
  }, [
    costBreakdown,
    selectedVehicleRows,
    shouldShowVehicles,
  ]);

  return {
    computedVehicleAmount,
    computedVehicleQty,
  };
};