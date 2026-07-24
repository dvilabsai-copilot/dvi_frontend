import { api } from "../lib/api";

export type State = {
  state_id: number;
  state_name: string;
};

export type City = {
  city_id: number;
  city_name: string;
  state_id: number;
  status: 0 | 1;
  state?: State;
};

type StateDTO = Partial<{ id: number; state_id: number; name: string; state_name: string }>;
type CityDTO = Partial<{
  id: number;
  city_id: number;
  name: string;
  city_name: string;
  state_id: number;
  status: any;
  state_name: string;
  state: any;
}>;

type ListResponseDTO<T> = { data: T[]; meta?: any } | T[];
type OneResponseDTO<T> = { data: T } | T;

const to01 = (v: any): 0 | 1 => {
  if (typeof v === "number") return (v === 1 ? 1 : 0) as 0 | 1;
  if (typeof v === "boolean") return (v ? 1 : 0) as 0 | 1;
  if (typeof v === "string") {
    const s = v.trim().toLowerCase();
    return (s === "1" || s === "true" ? 1 : 0) as 0 | 1;
  }
  return 0;
};

const unwrapList = <T,>(res: ListResponseDTO<T>): { rows: T[]; meta?: any } => {
  if (Array.isArray(res)) return { rows: res };
  if (res && Array.isArray((res as any).data)) return { rows: (res as any).data, meta: (res as any).meta };
  return { rows: [] };
};

const unwrapOne = <T,>(res: OneResponseDTO<T>): T => {
  if (res && typeof res === "object" && "data" in (res as any)) return (res as any).data;
  return res as T;
};

const toState = (r: StateDTO): State => {
  const state_id = Number(r.state_id ?? r.id ?? 0);
  const state_name = String(r.state_name ?? r.name ?? "").trim();
  return { state_id, state_name };
};

const toCity = (r: CityDTO): City => {
  const city_id = Number(r.city_id ?? r.id ?? 0);
  const city_name = String(r.city_name ?? r.name ?? "").trim();
  const state_id = Number(r.state_id ?? 0);

  const nestedStateName =
    (r.state && (r.state.state_name ?? r.state.name)) ||
    (r as any).state_name ||
    "";

  const state_name = String(nestedStateName ?? "").trim();

  return {
    city_id,
    city_name,
    state_id,
    status: to01(r.status),
    state: state_name ? { state_id, state_name } : undefined,
  };
};

export const CitiesAPI = {
  async getStates(countryId: number = 101): Promise<State[]> {
    const res = (await api(`/cities/states?countryId=${countryId}`)) as ListResponseDTO<StateDTO>;
    return unwrapList(res).rows.map(toState);
  },

 // one-state fetch
  async getCitiesByState(stateId: number): Promise<City[]> {
    const res = (await api(`/cities/by-state/${stateId}`)) as ListResponseDTO<CityDTO>;
    return unwrapList(res).rows.map(toCity);
  },

 // paginated by-country fetch (new endpoint)
  async getCitiesByCountry(countryId = 101, page = 1, pageSize = 500, search = ""): Promise<{ rows: City[]; meta?: any }> {
    const qs =
      `countryId=${countryId}` +
      `&page=${page}` +
      `&pageSize=${pageSize}` +
      (search ? `&search=${encodeURIComponent(search)}` : "");

    const res = (await api(`/cities/by-country?${qs}`)) as any;
    const { rows, meta } = unwrapList<CityDTO>(res);
    return { rows: rows.map(toCity), meta };
  },

 // helper: fetch ALL pages (used when UI selects "All States")
  async getAllCitiesByCountry(countryId = 101, search = ""): Promise<City[]> {
    const all: City[] = [];
    let page = 1;

    while (true) {
      const { rows, meta } = await CitiesAPI.getCitiesByCountry(countryId, page, 1000, search);
      all.push(...rows);

      const total = Number(meta?.total ?? all.length);
      if (all.length >= total) break;

      page += 1;
 if (page > 50) break; // safety
    }

    return all;
  },

  async createCity(payload: { city_name: string; state_id: number; status?: number }): Promise<City> {
    const res = (await api("/cities", {
      method: "POST",
      body: {
        city_name: payload.city_name,
        state_id: payload.state_id,
        status: typeof payload.status === "number" ? payload.status : undefined,
      },
    })) as OneResponseDTO<CityDTO>;

    return toCity(unwrapOne(res));
  },

  async updateCity(cityId: number, payload: { city_name?: string; state_id?: number; status?: number }): Promise<City> {
    const res = (await api(`/cities/${cityId}`, {
      method: "PUT",
      body: {
        city_name: payload.city_name,
        state_id: typeof payload.state_id === "number" ? payload.state_id : undefined,
        status: typeof payload.status === "number" ? payload.status : undefined,
      },
    })) as OneResponseDTO<CityDTO>;

    return toCity(unwrapOne(res));
  },

  async deleteCity(cityId: number): Promise<void> {
    await api(`/cities/${cityId}`, { method: "DELETE" });
  },
};
