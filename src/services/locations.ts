// FILE: src/services/locations.ts
import { api } from "@/lib/api";

export type LocationRow = {
  location_ID: number;
  source_location: string;
  source_city: string;
  source_state: string;
  source_latitude: string;
  source_longitude: string;

  destination_location: string;
  destination_city: string;
  destination_state: string;
  destination_latitude: string;
  destination_longitude: string;

  distance_km: number;
  duration_text: string;
  location_description?: string | null;
};

/** Source-only payload for creating a new location (Add Location modal) */
export type CreateLocationPayload = {
  source_location: string;
  source_city: string;
  source_state: string;
  source_latitude: string;
  source_longitude: string;
};

export type TollRow = {
  vehicle_type_id: number;
  vehicle_type_name: string;
  toll_charge: number;
};

/* -----------------------------
   Helpers
------------------------------ */
function qs(params?: Record<string, string | number | boolean | undefined | null>) {
  const u = new URLSearchParams();
  if (!params) return "";
  Object.entries(params).forEach(([k, v]) => {
    if (v === undefined || v === null || v === "") return;
    u.set(k, String(v));
  });
  const s = u.toString();
  return s ? `?${s}` : "";
}

const asStr = (v: any) => (v === null || v === undefined ? "" : String(v));
const asNum = (v: any) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

function uniqueCaseInsensitive(values: string[]) {
  const seen = new Set<string>();
  const result: string[] = [];

  for (const value of values) {
    const text = asStr(value).trim();
    if (!text) continue;

    const key = text.toLowerCase();
    if (seen.has(key)) continue;

    seen.add(key);
    result.push(text);
  }

  return result;
}

/** Normalize one raw row from backend (PHP/Nest) into LocationRow expected by UI */
function toLocationRow(raw: any): LocationRow {
  // Handle alternate keys + common typos ("lattitude")
  const srcCity = raw.source_city ?? raw.source_location_city;
  const srcState = raw.source_state ?? raw.source_location_state;
  const srcLat =
    raw.source_latitude ?? raw.source_location_latitude ?? raw.source_location_lattitude;
  const srcLng = raw.source_longitude ?? raw.source_location_longitude;

  const dstCity = raw.destination_city ?? raw.destination_location_city;
  const dstState = raw.destination_state ?? raw.destination_location_state;
  const dstLat =
    raw.destination_latitude ??
    raw.destination_location_latitude ??
    raw.destination_location_lattitude;
  const dstLng = raw.destination_longitude ?? raw.destination_location_longitude;

  const distance = raw.distance_km ?? raw.distance;
  const duration = raw.duration_text ?? raw.duration;

  return {
    location_ID: asNum(raw.location_ID ?? raw.id),
    source_location: asStr(raw.source_location),
    source_city: asStr(srcCity),
    source_state: asStr(srcState),
    source_latitude: asStr(srcLat),
    source_longitude: asStr(srcLng),

    destination_location: asStr(raw.destination_location),
    destination_city: asStr(dstCity),
    destination_state: asStr(dstState),
    destination_latitude: asStr(dstLat),
    destination_longitude: asStr(dstLng),

    distance_km: asNum(distance),
    duration_text: asStr(duration),
    location_description:
      raw.location_description === undefined ? null : raw.location_description,
  };
}

/* -----------------------------
   Public API
------------------------------ */
export const locationsApi = {
  async list(params: {
    source?: string;
    destination?: string;
    search?: string;
    page?: number;
    pageSize?: number;
  }) {
    const data = (await api(`/locations${qs(params)}`)) as any;
    const rows = Array.isArray(data?.rows) ? data.rows.map(toLocationRow) : [];
    return {
      rows,
      total: Number(data?.total ?? rows.length),
      page: Number(data?.page ?? params?.page ?? 1),
      pageSize: Number(data?.pageSize ?? params?.pageSize ?? 10),
    };
  },

  async dropdowns() {
    const data = (await api(`/locations/dropdowns`)) as any;
    return {
      sources: Array.isArray(data?.sources) ? data.sources.map(asStr) : [],
      destinations: Array.isArray(data?.destinations) ? data.destinations.map(asStr) : [],
    };
  },

  async create(payload: CreateLocationPayload) {
    const data = (await api(`/locations`, { method: "POST", body: payload })) as any;
    return toLocationRow(data);
  },

  async update(id: number, payload: Partial<LocationRow>) {
    const data = (await api(`/locations/${id}`, {
      method: "PATCH",
      body: payload,
    })) as any;
    return toLocationRow(data);
  },

  async modifyName(id: number, scope: "source" | "destination", new_name: string) {
    const data = (await api(`/locations/${id}/modify-name`, {
      method: "PATCH",
      body: { scope, new_name },
    })) as any;
    return toLocationRow(data);
  },

  async remove(id: number) {
    await api(`/locations/${id}`, { method: "DELETE" });
  },

  async tolls(id: number) {
    const data = (await api(`/locations/${id}/tolls`)) as any[];
    return (Array.isArray(data) ? data : []).map((r) => ({
      vehicle_type_id: asNum(r.vehicle_type_id),
      vehicle_type_name: asStr(r.vehicle_type_name ?? r.vehicle_type),
      toll_charge: asNum(r.toll_charge),
    }));
  },

  async saveTolls(id: number, items: { vehicle_type_id: number; toll_charge: number }[]) {
    const data = (await api(`/locations/${id}/tolls`, {
      method: "POST",
      body: { items },
    })) as any;
    return data as { ok: true };
  },

  async get(id: number) {
    const data = (await api(`/locations/${id}`)) as any;
    return toLocationRow(data);
  },

  async searchCities(phrase: string) {
    const normalized = asStr(phrase).trim();
    if (!normalized) return [];

    const data = (await api(
      `/locations/autosuggest/cities${qs({
        phrase: normalized,
        format: "json",
        type: "city",
      })}`
    )) as any;

    const rows = Array.isArray(data) ? data : [];
    return uniqueCaseInsensitive(rows.map((r) => asStr(r?.get_city)));
  },

  async searchStates(phrase: string) {
    const normalized = asStr(phrase).trim();
    if (!normalized) return [];

    const data = (await api(
      `/locations/autosuggest/states${qs({
        phrase: normalized,
        format: "json",
        type: "state",
      })}`
    )) as any;

    const rows = Array.isArray(data) ? data : [];
    return uniqueCaseInsensitive(rows.map((r) => asStr(r?.get_state)));
  },
};
