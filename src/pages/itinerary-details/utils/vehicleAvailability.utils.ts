type VehicleAvailabilityRow = {
  vendorEligibleId?: number | string | null;
  vehicleTypeId?: number | string | null;
  totalAmount?: number | string | null;
  vendorName?: string | null;
  vehicleOrigin?: string | null;
};

type VehicleAvailabilityDetails = {
  vehicles?: VehicleAvailabilityRow[] | null;
  vehicleRateAvailability?: unknown[] | null;
} | null | undefined;

/** Returns whether vehicle-build completion has usable rows or a deliberate no-rate state. */
export const hasUsableVehicleRows = (details: VehicleAvailabilityDetails): boolean => {
  const vehicles = Array.isArray(details?.vehicles) ? details.vehicles : [];
  if (!vehicles.length && (details?.vehicleRateAvailability?.length || 0) > 0) return true;
  if (!vehicles.length) return false;

  return vehicles.some((vehicle) => {
    const vendorEligibleId = Number(vehicle?.vendorEligibleId || 0);
    const vehicleTypeId = Number(vehicle?.vehicleTypeId || 0);
    const totalAmount = Number(vehicle?.totalAmount);
    const vendorName = String(vehicle?.vendorName || "").trim();
    const vehicleOrigin = String(vehicle?.vehicleOrigin || "").trim();
    return (
      vendorEligibleId > 0
      && vehicleTypeId > 0
      && Number.isFinite(totalAmount)
      && (vendorName.length > 0 || vehicleOrigin.length > 0)
    );
  });
};
import type {
  ItineraryDetailsResponse,
  VehiclePricingState,
  VehiclePricingStateStatus,
} from "../itinerary-details.types";

/** Vehicle readiness is sourced from the backend pricing summary. */
export function getAuthoritativeVehiclePricingState(
  details: Pick<ItineraryDetailsResponse, "vehiclePricingState">,
): VehiclePricingState {
  const state = details.vehiclePricingState;
  if (!state || typeof state !== "object") {
    return {
      status: "RECOVERY_REQUIRED",
      requestedVehicleTypeCount: 0,
      usableVehicleDetailCount: 0,
      selectedVehicleTypeCount: 0,
      requiredSelectionCount: 0,
      failureReason: "Vehicle pricing readiness was not returned by the server.",
    };
  }

  const status = String(state.status || "RECOVERY_REQUIRED").toUpperCase() as VehiclePricingStateStatus;
  return {
    ...state,
    status: ["READY", "FAILED", "NOT_REQUIRED", "RECOVERY_REQUIRED"].includes(status)
      ? status
      : "RECOVERY_REQUIRED",
  };
}
