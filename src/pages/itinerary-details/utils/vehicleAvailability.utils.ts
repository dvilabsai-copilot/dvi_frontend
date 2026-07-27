import type {
  ItineraryDetailsResponse,
  VehiclePricingState,
  VehiclePricingStateStatus,
} from "../itinerary-details.types";

/**
 * Vehicle readiness is deliberately sourced only from the backend summary.
 * Display availability rows are not persisted selection evidence.
 */
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
