// FILE: src/services/exportPricebookService.ts

import { API_BASE_URL, getToken, api } from "@/lib/api";
import type {
  VehiclePricebookQuery,
  VehiclePricebookResponse,
  HotelRoomExportQuery,
  HotelAmenityExportQuery,
  GuideExportQuery,
  HotspotExportQuery,
  ActivityQuery,
  ActivityPricebookResponse,
  TollQuery,
  TollPricebookResponse,
  ParkingQuery,
  ParkingPricebookResponse,
} from "@/types/exportPricebook";

export type MasterOption = { id: string; label: string };

function toQueryString(params: Record<string, any>) {
  const sp = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v === undefined || v === null || v === "") return;
    sp.set(k, String(v));
  });
  const s = sp.toString();
  return s ? `?${s}` : "";
}

/**
 * Downloads a file from backend (Excel endpoints).
 * - Uses fetch because api() tries to parse JSON/text.
 */
async function downloadExcel(
  path: string,
  params: Record<string, any>,
  filenameFallback: string
) {
  const qs = toQueryString(params);
  const url = `${API_BASE_URL}${path}${qs}`;
  const token = getToken();

  const res = await fetch(url, {
    method: "GET",
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(
      `Download failed: ${res.status} ${res.statusText} ${text}`.trim()
    );
  }

  const blob = await res.blob();

 // Try to pick filename from Content-Disposition
  const cd = res.headers.get("content-disposition") || "";
  const match = cd.match(/filename="([^"]+)"/i);
  const filename = match?.[1] || filenameFallback;

  const a = document.createElement("a");
  const objectUrl = URL.createObjectURL(blob);
  a.href = objectUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(objectUrl);

  return { filename };
}

// ---------- helpers for masters ----------
async function tryApi<T = any>(paths: string[]): Promise<T> {
  let lastErr: any = null;
  for (const p of paths) {
    try {
      return (await api(p, { method: "GET", auth: true })) as T;
    } catch (e) {
      lastErr = e;
    }
  }
  throw lastErr ?? new Error("All endpoints failed");
}

function normalizeOptions(input: any, idKeys: string[], labelKeys: string[]): MasterOption[] {
  const list = Array.isArray(input) ? input : input?.rows ?? input?.data ?? [];
  if (!Array.isArray(list)) return [];

 // array of strings
  if (list.every((x) => typeof x === "string")) {
    return list.map((s) => ({ id: s, label: s }));
  }

 // array of objects
  return list
    .map((x: any) => {
      if (!x || typeof x !== "object") return null;

      const id =
        idKeys.map((k) => x[k]).find((v) => v !== undefined && v !== null) ??
        x.id ??
        x.value;

      const label =
        labelKeys.map((k) => x[k]).find((v) => v !== undefined && v !== null) ??
        x.name ??
        x.title ??
        x.label;

      if (id === undefined || label === undefined) return null;
      return { id: String(id), label: String(label) };
    })
    .filter(Boolean) as MasterOption[];
}

export const ExportPricebookAPI = {
 // ---------------- VEHICLE ----------------

  getVehiclePricebook(q: VehiclePricebookQuery) {
    return api(`/export-pricebook/vehicle${toQueryString(q)}`, {
      method: "GET",
      auth: true,
    }) as Promise<VehiclePricebookResponse>;
  },

  downloadVehicleExcel(q: VehiclePricebookQuery) {
    return downloadExcel("/export-pricebook/vehicle/excel", q, `vehicle_price_book.xlsx`);
  },

 // ---------------- HOTEL ROOM (DATE RANGE) ----------------

  downloadHotelRoomExcel(q: HotelRoomExportQuery) {
    return downloadExcel("/export-pricebook/hotel-room/excel", q, `hotel_room_price_book.xlsx`);
  },

 // ---------------- HOTEL AMENITIES ----------------

  downloadHotelAmenitiesExcel(q: HotelAmenityExportQuery) {
    return downloadExcel(
      "/export-pricebook/hotel-amenities/excel",
      q,
      `hotel_amenities_price_book.xlsx`
    );
  },

 // ---------------- GUIDE ----------------

  downloadGuideExcel(q: GuideExportQuery) {
    return downloadExcel("/export-pricebook/guide/excel", q, `guide_price_book.xlsx`);
  },

 // ---------------- HOTSPOT ----------------

  downloadHotspotExcel(q: HotspotExportQuery) {
    return downloadExcel("/export-pricebook/hotspot/excel", q, `hotspot_price_book.xlsx`);
  },

 // ---------------- ACTIVITY ----------------

  getActivityPricebook(q: ActivityQuery) {
    return api(`/export-pricebook/activity${toQueryString(q)}`, {
      method: "GET",
      auth: true,
    }) as Promise<ActivityPricebookResponse>;
  },

  downloadActivityExcel(q: ActivityQuery) {
    return downloadExcel("/export-pricebook/activity/excel", q, `activity_price_book.xlsx`);
  },

 // ---------------- TOLL ----------------

  getTollPricebook(q: TollQuery) {
    return api(`/export-pricebook/toll${toQueryString(q)}`, {
      method: "GET",
      auth: true,
    }) as Promise<TollPricebookResponse>;
  },

  downloadTollExcel(q: TollQuery) {
    return downloadExcel("/export-pricebook/toll/excel", q, `toll_price_book.xlsx`);
  },

 // ---------------- PARKING ----------------

  getParkingPricebook(q: ParkingQuery) {
    return api(`/export-pricebook/parking${toQueryString(q)}`, {
      method: "GET",
      auth: true,
    }) as Promise<ParkingPricebookResponse>;
  },

  downloadParkingExcel(q: ParkingQuery) {
    return downloadExcel("/export-pricebook/parking/excel", q, `parking_price_book.xlsx`);
  },

 // ============================================================
 // MASTERS (Dropdown real APIs) - kept in SAME service file
 // ============================================================

  async getStates(countryId = 101): Promise<MasterOption[]> {
    const res = await tryApi<any>([
      `/masters/states?countryId=${countryId}`,
      `/states?countryId=${countryId}`,
      `/locations/states?countryId=${countryId}`,
      `/dvi/states?countryId=${countryId}`,
    ]);
    return normalizeOptions(res, ["id", "state_id", "STATE_ID"], ["name", "state_name", "STATE_NAME"]);
  },

  async getCitiesByState(stateId: string): Promise<MasterOption[]> {
    const res = await tryApi<any>([
      `/masters/cities?stateId=${stateId}`,
      `/cities?stateId=${stateId}`,
      `/locations/cities?stateId=${stateId}`,
      `/dvi/cities?stateId=${stateId}`,
    ]);
    return normalizeOptions(res, ["id", "city_id", "CITY_ID"], ["name", "city_name", "CITY_NAME"]);
  },

  async getVendors(): Promise<MasterOption[]> {
    const res = await tryApi<any>([
      `/vendors`,
      `/vendor`,
      `/vendors/list`,
      `/dvi/vendors`,
      `/vendor-details`,
    ]);
    return normalizeOptions(res, ["vendor_id", "id"], ["vendor_name", "name"]);
  },

  async getVendorBranches(vendorId: string): Promise<MasterOption[]> {
    const res = await tryApi<any>([
      `/vendors/${vendorId}/branches`,
      `/vendor/${vendorId}/branches`,
      `/vendor-branches?vendorId=${vendorId}`,
      `/vendors/branches?vendorId=${vendorId}`,
      `/dvi/vendor-branches?vendorId=${vendorId}`,
    ]);
    return normalizeOptions(res, ["vendor_branch_id", "id"], ["vendor_branch_name", "name"]);
  },

  async getVehicleTypes(): Promise<MasterOption[]> {
    const res = await tryApi<any>([
      `/vehicle-types`,
      `/vehicles/types`,
      `/masters/vehicle-types`,
      `/dvi/vehicle-types`,
    ]);
    return normalizeOptions(res, ["vehicle_type_id", "id"], ["vehicle_type_title", "name", "title"]);
  },

  async getHotspotLocations(): Promise<MasterOption[]> {
    const res = await tryApi<any>([
      `/hotspots/locations`,
      `/hotspot/locations`,
      `/masters/hotspot-locations`,
      `/hotspots`,
      `/hotspot-place`,
      `/dvi/hotspots`,
    ]);

    const list = Array.isArray(res) ? res : res?.rows ?? res?.data ?? [];

 // If API returns strings
    if (Array.isArray(list) && list.every((x) => typeof x === "string")) {
      return list.map((s) => ({ id: s, label: s }));
    }

 // If API returns objects containing hotspot_location
    const set = new Set<string>();
    for (const x of list) {
      const loc = x?.hotspot_location ?? x?.location ?? x?.hotspotLocation;
      if (loc) set.add(String(loc));
    }
    return [...set].map((s) => ({ id: s, label: s }));
  },
};
