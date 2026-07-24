// FILE: src/services/gstSettingsService.ts
// REPLACE-WHOLE-FILE

import { api } from "../lib/api";

/** ========= Frontend-facing types (used by your pages) ========= */
export interface GstSettingListRow {
  id: number;
  gstTitle: string;
  gst: number;
  cgst: number;
  sgst: number;
  igst: number;
  status: 0 | 1;
}
export interface GstSetting extends GstSettingListRow {}

/** ========= Backend DTO shapes (Nest responses) ========= */
type GstSettingDTO = {
  id?: number;
  gst_setting_id?: number;

  gstTitle?: string;
  gst_title?: string;

  gst?: number | string;
  gst_value?: number | string;

  cgst?: number | string;
  cgst_value?: number | string;

  sgst?: number | string;
  sgst_value?: number | string;

  igst?: number | string;
  igst_value?: number | string;

  status?: number | string | boolean;
};

type ListResponseDTO = { data: GstSettingDTO[] } | GstSettingDTO[];
type OneResponseDTO = { data: GstSettingDTO } | GstSettingDTO;

/** ========= Local map helpers ========= */
const toNum = (v: any): number => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

const to01 = (v: any): 0 | 1 => {
  if (typeof v === "number") return (v === 1 ? 1 : 0) as 0 | 1;
  if (typeof v === "boolean") return (v ? 1 : 0) as 0 | 1;
  if (typeof v === "string") {
    const s = v.trim().toLowerCase();
    return (s === "1" || s === "true" ? 1 : 0) as 0 | 1;
  }
  return 0;
};

const toRow = (r: GstSettingDTO): GstSettingListRow => ({
  id: (r.id ?? r.gst_setting_id ?? 0) as number,
  gstTitle: String(r.gstTitle ?? r.gst_title ?? "").trim(),
  gst: toNum(r.gst ?? r.gst_value ?? 0),
  cgst: toNum(r.cgst ?? r.cgst_value ?? 0),
  sgst: toNum(r.sgst ?? r.sgst_value ?? 0),
  igst: toNum(r.igst ?? r.igst_value ?? 0),
  status: to01(r.status),
});

const unwrapList = (res: ListResponseDTO): GstSettingDTO[] => {
  if (Array.isArray(res)) return res;
  if (res && Array.isArray((res as any).data)) return (res as any).data;
  return [];
};

const unwrapOne = (res: OneResponseDTO): GstSettingDTO => {
  if (res && typeof res === "object" && "data" in (res as any)) return (res as any).data;
  return res as GstSettingDTO;
};

/** ========= Public API consumed by your pages ========= */
export const GstSettingsAPI = {
  async list(): Promise<GstSettingListRow[]> {
    const res = (await api("/gst-settings")) as ListResponseDTO;
    return unwrapList(res).map(toRow);
  },

  async get(id: number): Promise<GstSetting> {
    const res = (await api(`/gst-settings/${id}`)) as OneResponseDTO;
    return toRow(unwrapOne(res));
  },

  async create(input: {
    gstTitle: string;
    gst: number;
    cgst: number;
    sgst: number;
    igst: number;
    status?: 0 | 1;
  }): Promise<GstSetting> {
    const res = (await api("/gst-settings", {
      method: "POST",
      body: {
        gstTitle: input.gstTitle,
        gst: input.gst,
        cgst: input.cgst,
        sgst: input.sgst,
        igst: input.igst,
        status: input.status,
      },
    })) as OneResponseDTO;

    return toRow(unwrapOne(res));
  },

  async update(
    id: number,
    input: {
      gstTitle?: string;
      gst?: number;
      cgst?: number;
      sgst?: number;
      igst?: number;
      status?: 0 | 1;
    }
  ): Promise<GstSetting> {
    const payload: Record<string, unknown> = {
      gstTitle: input.gstTitle,
      gst: typeof input.gst === "number" ? input.gst : undefined,
      cgst: typeof input.cgst === "number" ? input.cgst : undefined,
      sgst: typeof input.sgst === "number" ? input.sgst : undefined,
      igst: typeof input.igst === "number" ? input.igst : undefined,
      status: typeof input.status === "number" ? input.status : undefined,
    };

    const res = (await api(`/gst-settings/${id}`, {
      method: "PUT",
      body: payload,
    })) as OneResponseDTO;

    return toRow(unwrapOne(res));
  },

 /** Soft delete */
  async delete(id: number): Promise<void> {
    await api(`/gst-settings/${id}`, { method: "DELETE" });
  },

 /** Backward-compatible name (your old UI calls .remove()) */
  async remove(id: number): Promise<void> {
    await GstSettingsAPI.delete(id);
  },

 /** Optional */
  async toggleStatus(id: number, status: 0 | 1): Promise<void> {
    await api(`/gst-settings/${id}`, { method: "PUT", body: { status } });
  },
};

/** Backward-compatible export name (your page imports gstSettingsService) */
export const gstSettingsService = GstSettingsAPI;
