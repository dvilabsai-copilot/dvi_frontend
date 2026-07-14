import { useEffect, useMemo, type Dispatch, type SetStateAction } from "react";
import type { ItineraryVehicleRow } from "../itinerary-details.types";
import { getCheapestVehicleForType, getVehicleAmountNumber } from "../utils/domain.utils";

type VehicleTotals = Record<number, { totalAmount: number; totalQty: number }>;

interface VehicleTotalsSyncOptions {
  quoteId?: string | number | null;
  vehicles?: ItineraryVehicleRow[] | null;
  shouldShowVehicles: boolean;
  setSelectedVehicleTotalsByType: Dispatch<SetStateAction<VehicleTotals>>;
}

/** Keeps selected vehicle totals aligned with the current itinerary vehicle rows. */
export const useVehicleTotalsSync = ({
  quoteId,
  vehicles,
  shouldShowVehicles,
  setSelectedVehicleTotalsByType,
}: VehicleTotalsSyncOptions) => {
  const activeVehicleTypeIds = useMemo(() => (
    new Set(
      (vehicles || [])
        .map((vehicle) => Number(vehicle.vehicleTypeId || 0))
        .filter(Boolean)
    )
  ), [vehicles]);

  useEffect(() => {
    setSelectedVehicleTotalsByType({});
  }, [quoteId, setSelectedVehicleTotalsByType]);

  useEffect(() => {
    setSelectedVehicleTotalsByType((prev) => {
      const next: VehicleTotals = {};
      for (const [rawTypeId, value] of Object.entries(prev)) {
        const typeId = Number(rawTypeId);
        if (activeVehicleTypeIds.has(typeId)) next[typeId] = value;
      }

      return Object.keys(next).length === Object.keys(prev).length ? prev : next;
    });
  }, [activeVehicleTypeIds, setSelectedVehicleTotalsByType]);

  useEffect(() => {
    if (!shouldShowVehicles || !vehicles?.length) return;

    const vehiclesByType = new Map<number, ItineraryVehicleRow[]>();
    for (const vehicle of vehicles) {
      const typeId = Number(vehicle.vehicleTypeId || 0);
      if (!typeId) continue;
      const rows = vehiclesByType.get(typeId) || [];
      rows.push(vehicle);
      vehiclesByType.set(typeId, rows);
    }

    setSelectedVehicleTotalsByType((prev) => {
      let changed = false;
      const next: VehicleTotals = { ...prev };
      vehiclesByType.forEach((rows, typeId) => {
        if (next[typeId]?.totalAmount > 0) return;
        const cheapestVehicle = getCheapestVehicleForType(rows);
        if (!cheapestVehicle) return;
        next[typeId] = {
          totalAmount: getVehicleAmountNumber(cheapestVehicle),
          totalQty: Number(cheapestVehicle.totalQty || 1),
        };
        changed = true;
      });
      return changed ? next : prev;
    });
  }, [setSelectedVehicleTotalsByType, shouldShowVehicles, vehicles]);
};

