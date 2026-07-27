import { useMemo } from "react";

interface ComputedVehicleTotalsOptions {
  shouldShowVehicles: boolean;
  costBreakdown?: {
    totalVehicleAmount?: number | string | null;
    totalVehicleCost?: number | string | null;
    totalVehicleQty?: number | string | null;
  } | null;
}

/**
 * Reads vehicle totals only from the latest backend
 * itinerary-pricing response.
 */
export const useComputedVehicleTotals = ({
  shouldShowVehicles,
  costBreakdown,
}: ComputedVehicleTotalsOptions) => {
  const computedVehicleAmount = useMemo(() => {
    if (!shouldShowVehicles) {
      return 0;
    }

    return Number(
      costBreakdown?.totalVehicleAmount ??
        costBreakdown?.totalVehicleCost ??
        0,
    );
  }, [costBreakdown, shouldShowVehicles]);

  const computedVehicleQty = useMemo(() => {
    if (!shouldShowVehicles) {
      return 0;
    }

    return Number(
      costBreakdown?.totalVehicleQty ?? 0,
    );
  }, [costBreakdown, shouldShowVehicles]);

  return {
    computedVehicleAmount,
    computedVehicleQty,
  };
};