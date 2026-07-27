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
