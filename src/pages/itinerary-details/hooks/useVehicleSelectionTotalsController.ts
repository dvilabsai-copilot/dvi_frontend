import { useCallback, type Dispatch, type SetStateAction } from "react";

interface VehicleSelectionTotals {
  totalAmount: number;
  totalQty: number;
}

interface VehicleSelectionTotalsControllerOptions {
  setSelectedVehicleTotalsByType: Dispatch<SetStateAction<Record<number, VehicleSelectionTotals>>>;
}

/** Owns the idempotent update from vehicle selection rows into itinerary totals state. */
export const useVehicleSelectionTotalsController = ({
  setSelectedVehicleTotalsByType,
}: VehicleSelectionTotalsControllerOptions) => {
  const handleVehicleSelectedTotalChange = useCallback((payload: {
    vehicleTypeId: number;
    totalAmount: number;
    totalQty: number;
  }) => {
    const key = Number(payload.vehicleTypeId || 0);
    const nextAmount = Number(payload.totalAmount || 0);
    const nextQty = Number(payload.totalQty || 0);

    setSelectedVehicleTotalsByType((previous) => {
      const existing = previous[key];
      if (existing && existing.totalAmount === nextAmount && existing.totalQty === nextQty) {
        return previous;
      }

      return {
        ...previous,
        [key]: { totalAmount: nextAmount, totalQty: nextQty },
      };
    });
  }, [setSelectedVehicleTotalsByType]);

  return { handleVehicleSelectedTotalChange };
};
