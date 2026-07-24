// FILE: src/services/vehicleTypeService.ts

import { api } from "../lib/api";

/** ========= Frontend-facing types (used by your pages) ========= */
export type VehicleTypeId = number;

export interface VehicleTypeListRow {
  id: VehicleTypeId;
  title: string;
  occupancy: number;
  status: 0 | 1;
}

export interface VehicleType extends VehicleTypeListRow {}

export type VehicleTypeUpsertInput = {
  title: string;
  occupancy: number;
 status?: 0 | 1; // UI uses 0/1 like other modules
};

/** ========= Backend DTO shapes (Nest responses) ========= */
type VehicleTypeDTO = {
 // id variants
  id?: number;
  vehicleTypeId?: number;
  vehicle_type_id?: number;
  vehicle_type_ID?: number;
  vehicleType_ID?: number;

 // title variants
  title?: string;
  vehicleTypeTitle?: string;
  vehicle_type_title?: string;
  vehicle_type_name?: string;

 // occupancy variants
  occupancy?: number | string;
  vehicleTypeOccupancy?: number | string;
  vehicle_type_occupancy?: number | string;
  no_of_seats?: number | string;

 // status variants
  status?: number | string | boolean;
};

type ListResponseDTO = { data: VehicleTypeDTO[] } | VehicleTypeDTO[];
type OneResponseDTO = { data: VehicleTypeDTO } | VehicleTypeDTO;

/** ========= Helpers ========= */
const to01 = (v: any): 0 | 1 => {
  if (typeof v === "number") return (v === 1 ? 1 : 0) as 0 | 1;
  if (typeof v === "boolean") return (v ? 1 : 0) as 0 | 1;
  if (typeof v === "string") {
    const s = v.trim().toLowerCase();
    return (s === "1" || s === "true" ? 1 : 0) as 0 | 1;
  }
  return 0;
};

const toNum = (v: any): number => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

const toRow = (r: VehicleTypeDTO): VehicleTypeListRow => {
  const id =
    (r.id ??
      r.vehicleTypeId ??
      r.vehicle_type_id ??
      r.vehicle_type_ID ??
      r.vehicleType_ID ??
      0) as number;

  const title = String(
    r.title ?? r.vehicleTypeTitle ?? r.vehicle_type_title ?? r.vehicle_type_name ?? ""
  ).trim();

  const occupancy = toNum(
    r.occupancy ?? r.vehicleTypeOccupancy ?? r.vehicle_type_occupancy ?? r.no_of_seats ?? 0
  );

  const status = to01(r.status);

  return { id, title, occupancy, status };
};

const unwrapList = (res: ListResponseDTO): VehicleTypeDTO[] => {
  if (Array.isArray(res)) return res;
  if (res && Array.isArray((res as any).data)) return (res as any).data;
  return [];
};

const unwrapOne = (res: OneResponseDTO): VehicleTypeDTO => {
  if (res && typeof res === "object" && "data" in (res as any)) return (res as any).data;
  return res as VehicleTypeDTO;
};

/** ========= Public API =========
 * Backend base path must match your NestJS controller: @Controller('vehicle-types')
 */
export const VehicleTypesAPI = {
  async list(): Promise<VehicleTypeListRow[]> {
    const res = (await api("/vehicle-types")) as ListResponseDTO;
    return unwrapList(res).map(toRow);
  },

  async get(id: number): Promise<VehicleType> {
    const res = (await api(`/vehicle-types/${id}`)) as OneResponseDTO;
    return toRow(unwrapOne(res));
  },

  async create(input: VehicleTypeUpsertInput): Promise<VehicleType> {
    const payload = {
      title: input.title,
      occupancy: input.occupancy,
      status: typeof input.status === "number" ? input.status : undefined,
    };

    const res = (await api("/vehicle-types", {
      method: "POST",
      body: payload,
    })) as OneResponseDTO;

    return toRow(unwrapOne(res));
  },

  async update(id: number, input: Partial<VehicleTypeUpsertInput>): Promise<VehicleType> {
    const payload: Record<string, unknown> = {
      title: input.title,
      occupancy: typeof input.occupancy === "number" ? input.occupancy : undefined,
      status: typeof input.status === "number" ? input.status : undefined,
    };

    const res = (await api(`/vehicle-types/${id}`, {
      method: "PUT",
      body: payload,
    })) as OneResponseDTO;

    return toRow(unwrapOne(res));
  },

 /** Soft delete / delete */
  async delete(id: number): Promise<void> {
    await api(`/vehicle-types/${id}`, { method: "DELETE" });
  },

 /** Backward-compatible name (some pages call .remove()) */
  async remove(id: number): Promise<void> {
    await VehicleTypesAPI.delete(id);
  },

 /**
   * Toggle active/inactive (PHP parity style)
   * NOTE: backend should flip based on the CURRENT status passed (0->1, 1->0)
 */
  async toggleStatus(id: number, status: 0 | 1): Promise<void> {
    await api(`/vehicle-types/${id}`, {
      method: "PUT",
      body: { status },
    });
  },
};

/** Backward-compatible export name (your pages likely import vehicleTypeService) */
export const vehicleTypeService = VehicleTypesAPI;