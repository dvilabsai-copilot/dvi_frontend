import { api } from "@/lib/api";

export interface VehicleUpgradePrice {
  vehicleTypeId: number;
  vehicleName: string;
  capacity: number;
  unitPrice: number | null;
  price: number | null;
  extraPayment: number | null;
  quantity: number;
  source: "saved_quote" | "calculated_preview" | "unavailable";
}

export interface VehicleUpgradePricesResponse {
  itineraryPlanId: number;
  currentVehicleTypeId: number;
  currentVehiclePrice: number;
  quantity: number;
  parityValidated: boolean;
  prices: VehicleUpgradePrice[];
}

export async function fetchVehicleUpgradePrices(args: {
  itineraryPlanId: number;
  currentVehicleTypeId: number;
  selectedVendorEligibleId?: number;
}): Promise<VehicleUpgradePricesResponse> {
  const response = await api(
    "/itinerary-dropdowns/vehicle-upgrade-prices",
    {
      method: "POST",
      auth: true,
      body: args,
    },
  );

  if (!response || !Array.isArray(response.prices)) {
    throw new Error("Invalid vehicle upgrade pricing response");
  }

  return response as VehicleUpgradePricesResponse;
}

export interface ConfirmVehicleUpgradeRequest {
  planId: number;
  currentVehicleTypeId: number;
  newVehicleTypeId: number;
  expectedCurrentPrice: number;
  expectedNewPrice: number;
  selectedVendorEligibleId?: number;
}

export interface ConfirmVehicleUpgradeResponse {
  success: boolean;
  message: string;
  planId: number;
  currentVehicleTypeId: number;
  newVehicleTypeId: number;
  currentVehiclePrice: number;
  newVehiclePrice: number;
  extraPayment: number;
  overallTripCost: number;
}

export async function confirmVehicleUpgrade(
  request: ConfirmVehicleUpgradeRequest,
): Promise<ConfirmVehicleUpgradeResponse> {
  const response = await api(
    "/itineraries/vehicles/confirm-upgrade",
    {
      method: "POST",
      auth: true,
      body: request,
    },
  );

  if (!response || response.success !== true) {
    throw new Error("Vehicle upgrade confirmation failed.");
  }

  return response as ConfirmVehicleUpgradeResponse;
}