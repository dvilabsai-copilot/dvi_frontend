import { api } from "../lib/api";

export type RouteOption = {
  location_ID: number | string;
  source_location: string;
  destination_location: string;
  distance?: number;
  duration?: string | null;
};

export type RouteOptionsResponse = {
  items: RouteOption[];
  page: number;
  limit: number;
  total: number;
  hasNextPage: boolean;
};

export type VehicleOption = {
  vehicle_type_id: number;
  vehicle_type_title: string | null;
  occupancy: number;
};

export type VehicleRouteRestriction = {
  route_vehicle_restriction_id: number | string;
  rule_code: string;
  title: string;
  location_id: number | string;
  applies_to_all_vehicle_types: number;
  direction: "FORWARD" | "REVERSE" | "BOTH";
  is_all_day: number;
  start_local_time?: string | null;
  end_local_time?: string | null;
  priority: number;
  enforcement_mode: "SHADOW" | "ENFORCE";
  status: number;
  deleted: number;
  source_reference?: string | null;
  vehicle_types: Array<{ vehicle_type_id: number }>;
};

export type VehicleRouteRestrictionPayload = {
  ruleCode: string;
  title: string;
  description?: string;
  locationId: number;
  viaRouteLocationId?: number | null;
  direction: "FORWARD" | "REVERSE" | "BOTH";
  restrictionAction: "BLOCK";
  isAllDay: boolean;
  appliesToAllVehicleTypes: boolean;
  startLocalTime?: string | null;
  endLocalTime?: string | null;
  timezoneName: string;
  priority: number;
  enforcementMode: "SHADOW" | "ENFORCE";
  vehicleTypeIds: number[];
};

export const vehicleRouteRestrictionsApi = {
  list: () => api("/route-vehicle-restrictions"),
  routes: (params: { search?: string; page?: number; limit?: number } = {}) => {
    const query = new URLSearchParams();
    if (params.search?.trim()) query.set("search", params.search.trim());
    query.set("page", String(params.page || 1));
    query.set("limit", String(params.limit || 50));
    return api(`/route-vehicle-restrictions/route-options?${query.toString()}`) as Promise<RouteOptionsResponse>;
  },
  vehicles: () => api("/route-vehicle-restrictions/vehicle-options"),
  create: (body: VehicleRouteRestrictionPayload) => api("/route-vehicle-restrictions", { method: "POST", body }),
  update: (id: number | string, body: VehicleRouteRestrictionPayload) => api(`/route-vehicle-restrictions/${id}`, { method: "PATCH", body }),
  remove: (id: number | string) => api(`/route-vehicle-restrictions/${id}`, { method: "DELETE" }),
};
