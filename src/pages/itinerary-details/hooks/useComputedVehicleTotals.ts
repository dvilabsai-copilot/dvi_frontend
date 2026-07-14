import { useMemo } from "react";

interface VehicleTotals {
  totalAmount?: number;
  totalQty?: number;
}

interface ComputedVehicleTotalsOptions {
  shouldShowVehicles: boolean;
  selectedVehicleTotalsByType: Record<number, VehicleTotals>;
  costBreakdown?: {
    totalVehicleAmount?: number | string | null;
    totalVehicleCost?: number | string | null;
    totalVehicleQty?: number | string | null;
  } | null;
}

/** Derives vehicle amount and quantity from selections with itinerary fallbacks. */
export const useComputedVehicleTotals = ({
  shouldShowVehicles,
  selectedVehicleTotalsByType,
  costBreakdown,
}: ComputedVehicleTotalsOptions) => {
  const computedVehicleAmount = useMemo(() => {
    if (!shouldShowVehicles) return 0;
    const selectedTotal = Object.values(selectedVehicleTotalsByType).reduce((sum, row) => sum + Number(row.totalAmount || 0), 0);
    return selectedTotal > 0 ? selectedTotal : Number(costBreakdown?.totalVehicleAmount ?? costBreakdown?.totalVehicleCost ?? 0);
  }, [costBreakdown, selectedVehicleTotalsByType, shouldShowVehicles]);

  const computedVehicleQty = useMemo(() => {
    if (!shouldShowVehicles) return 0;
    const selectedQty = Object.values(selectedVehicleTotalsByType).reduce((sum, row) => sum + Number(row.totalQty || 0), 0);
    return selectedQty > 0 ? selectedQty : Number(costBreakdown?.totalVehicleQty || 0);
  }, [costBreakdown, selectedVehicleTotalsByType, shouldShowVehicles]);

  return { computedVehicleAmount, computedVehicleQty };
};

