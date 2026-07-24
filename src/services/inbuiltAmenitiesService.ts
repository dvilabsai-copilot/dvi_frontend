// FILE: src/services/inbuiltAmenitiesService.ts

import { api } from "../lib/api";

/** ========= Frontend-facing types (used by your pages) ========= */
export type InbuiltAmenityId = number;

export interface InbuiltAmenityListRow {
  id: InbuiltAmenityId;
  title: string;
  status: 0 | 1;
}

export interface InbuiltAmenity extends InbuiltAmenityListRow {}

export type InbuiltAmenityUpsertInput = {
  title: string;
 status?: 0 | 1; // UI uses 0/1 like other modules
};

/** ========= Backend DTO shapes (Nest responses) ========= */
type InbuiltAmenityDTO = {
  id?: number;
  amenity_id?: number;
  inbuiltAmenityId?: number;
  inbuild_amenity_id?: number;

  title?: string;
  amenity_title?: string;
  inbuiltAmenityTitle?: string;
  inbuild_amenity_title?: string;

  status?: number | string | boolean;
};

type ListResponseDTO = { data: InbuiltAmenityDTO[] } | InbuiltAmenityDTO[];
type OneResponseDTO = { data: InbuiltAmenityDTO } | InbuiltAmenityDTO;

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

const toRow = (r: InbuiltAmenityDTO): InbuiltAmenityListRow => {
  const id =
    (r.id ??
      r.amenity_id ??
      r.inbuiltAmenityId ??
      r.inbuild_amenity_id ??
      0) as number;

  const title =
    String(
      r.title ??
        r.amenity_title ??
        r.inbuiltAmenityTitle ??
        r.inbuild_amenity_title ??
        ""
    ).trim();

  const status = to01(r.status);

  return { id, title, status };
};

const unwrapList = (res: ListResponseDTO): InbuiltAmenityDTO[] => {
  if (Array.isArray(res)) return res;
  if (res && Array.isArray((res as any).data)) return (res as any).data;
  return [];
};

const unwrapOne = (res: OneResponseDTO): InbuiltAmenityDTO => {
  if (res && typeof res === "object" && "data" in (res as any)) return (res as any).data;
  return res as InbuiltAmenityDTO;
};

/** ========= Public API =========
 * Backend base path must match your NestJS controller: @Controller('inbuilt-amenities')
 */
export const InbuiltAmenitiesAPI = {
  async list(): Promise<InbuiltAmenityListRow[]> {
    const res = (await api("/inbuilt-amenities")) as ListResponseDTO;
    return unwrapList(res).map(toRow);
  },

  async get(id: number): Promise<InbuiltAmenity> {
    const res = (await api(`/inbuilt-amenities/${id}`)) as OneResponseDTO;
    return toRow(unwrapOne(res));
  },

  async create(input: InbuiltAmenityUpsertInput): Promise<InbuiltAmenity> {
    const payload = {
      title: input.title,
      status: typeof input.status === "number" ? input.status : undefined,
    };

    const res = (await api("/inbuilt-amenities", {
      method: "POST",
      body: payload,
    })) as OneResponseDTO;

    return toRow(unwrapOne(res));
  },

  async update(id: number, input: Partial<InbuiltAmenityUpsertInput>): Promise<InbuiltAmenity> {
    const payload: Record<string, unknown> = {
      title: input.title,
      status: typeof input.status === "number" ? input.status : undefined,
    };

    const res = (await api(`/inbuilt-amenities/${id}`, {
      method: "PUT",
      body: payload,
    })) as OneResponseDTO;

    return toRow(unwrapOne(res));
  },

 /** Soft delete / delete */
  async delete(id: number): Promise<void> {
    await api(`/inbuilt-amenities/${id}`, { method: "DELETE" });
  },

 /** Backward-compatible name (some pages call .remove()) */
  async remove(id: number): Promise<void> {
    await InbuiltAmenitiesAPI.delete(id);
  },

 /** Toggle active/inactive (same style as Staff) */
  async toggleStatus(id: number, status: 0 | 1): Promise<void> {
    await api(`/inbuilt-amenities/${id}`, {
      method: "PUT",
      body: { status },
    });
  },
};

/** Backward-compatible export name (your pages likely import inbuiltAmenitiesService) */
export const inbuiltAmenitiesService = InbuiltAmenitiesAPI;
