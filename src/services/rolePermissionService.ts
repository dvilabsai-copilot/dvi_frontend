// FILE: src/services/rolePermissionService.ts

import { api } from "../lib/api";

export type RolePermissionListItem = {
  id: string;
  roleName: string;
  status: boolean;
};

export type RolePermissionPageRow = {
  pageKey: string;
  pageName: string;
  read: boolean;
  write: boolean;
  modify: boolean;
  full: boolean;
};

export type RolePermissionPayload = {
  roleName: string;
  pages: RolePermissionPageRow[];
};

export type RolePermissionDetails = {
  id: string;
  roleName: string;
  status: boolean;
  pages: RolePermissionPageRow[];
};

type ListResponseDTO<T> = { data: T[]; meta?: any } | T[];
type OneResponseDTO<T> = { data: T } | T;

// Backend DTO shapes (flexible / tolerant)
type RolePermissionListDTO = Partial<{
  id: string | number;
  role_ID: number;
  roleName: string;
  role_name: string;
  status: any;
  deleted: any;
}>;

type RolePermissionPageDTO = Partial<{
  pageKey: string;
  pageName: string;
  page_key: string;
  page_name: string;
  page_title: string;
  read: any;
  write: any;
  modify: any;
  full: any;
  read_access: any;
  write_access: any;
  modify_access: any;
  full_access: any;
}>;

type RolePermissionDetailsDTO = Partial<{
  id: string | number;
  roleName: string;
  role_name: string;
  status: any;
  pages: RolePermissionPageDTO[];
}>;

const BASE = "/role-permissions";

const toBool = (v: any): boolean => {
  if (typeof v === "boolean") return v;
  if (typeof v === "number") return v === 1;
  if (typeof v === "string") {
    const s = v.trim().toLowerCase();
    return s === "1" || s === "true" || s === "yes";
  }
  return false;
};

const unwrapList = <T,>(res: ListResponseDTO<T>): { rows: T[]; meta?: any } => {
  if (Array.isArray(res)) return { rows: res };
  if (res && Array.isArray((res as any).data)) {
    return { rows: (res as any).data, meta: (res as any).meta };
  }
  return { rows: [] };
};

const unwrapOne = <T,>(res: OneResponseDTO<T>): T => {
  if (res && typeof res === "object" && "data" in (res as any)) {
    return (res as any).data;
  }
  return res as T;
};

const toListItem = (r: RolePermissionListDTO): RolePermissionListItem => {
  const id = String(r.id ?? r.role_ID ?? "");
  const roleName = String(r.roleName ?? r.role_name ?? "").trim();

  let status = true;
  if (typeof r.status !== "undefined") status = toBool(r.status);
  if (typeof r.deleted !== "undefined" && toBool(r.deleted)) status = false;

  return { id, roleName, status };
};

const toPageRow = (p: RolePermissionPageDTO): RolePermissionPageRow => {
 // key
  const rawKey =
    p.pageKey ??
    p.page_key ??
    p.page_name ??
    "";

  const pageKey = String(rawKey).trim();

 // name (with safe fallback, no + || mixing)
  const rawName =
    p.pageName ??
    p.page_title ??
    p.page_name ??
    pageKey;

  const trimmedName = String(rawName ?? "").trim();
  const pageName = trimmedName.length > 0 ? trimmedName : "Unknown";

  const read = toBool(p.read ?? p.read_access ?? false);
  const write = toBool(p.write ?? p.write_access ?? false);
  const modify = toBool(p.modify ?? p.modify_access ?? false);
  const full = toBool(p.full ?? p.full_access ?? false);

  return { pageKey, pageName, read, write, modify, full };
};

const toDetails = (r: RolePermissionDetailsDTO): RolePermissionDetails => {
  const id = String(r.id ?? "");
  const roleName = String(r.roleName ?? r.role_name ?? "").trim();
  const status = toBool(r.status);

  const pagesRaw = (r.pages ?? []) as RolePermissionPageDTO[];
  const pages = pagesRaw.map(toPageRow);

  return { id, roleName, status, pages };
};

export const rolePermissionService = {
 /**
   * GET /role-permissions
   * Returns: RolePermissionListItem[]
 */
  async list(): Promise<RolePermissionListItem[]> {
    const res = (await api(BASE)) as ListResponseDTO<RolePermissionListDTO>;
    const { rows } = unwrapList(res);
    return rows.map(toListItem);
  },

 /**
   * GET /role-permissions/:id
   * Returns: RolePermissionDetails
 */
  async getOne(id: string | number): Promise<RolePermissionDetails> {
    const res = (await api(`${BASE}/${id}`)) as OneResponseDTO<RolePermissionDetailsDTO>;
    const dto = unwrapOne(res);
    return toDetails(dto);
  },

 /**
   * POST /role-permissions
   * Body: RolePermissionPayload
   * Returns: { id: string }
 */
  async create(payload: RolePermissionPayload): Promise<{ id: string }> {
    const res = (await api(BASE, {
      method: "POST",
      body: {
        roleName: payload.roleName,
        pages: payload.pages,
      },
    })) as OneResponseDTO<{ id: string | number }>;

    const dto = unwrapOne(res);
    return { id: String(dto.id) };
  },

 /**
   * PUT /role-permissions/:id
   * Body: RolePermissionPayload
   * Returns: { ok: true }
 */
  async update(id: string | number, payload: RolePermissionPayload): Promise<{ ok: true }> {
    const res = (await api(`${BASE}/${id}`, {
      method: "PUT",
      body: {
        roleName: payload.roleName,
        pages: payload.pages,
      },
    })) as OneResponseDTO<{ ok: true } | { success?: boolean }>;

    const dto = unwrapOne(res) as any;
    return { ok: dto.ok ?? dto.success ?? true };
  },

 /**
   * DELETE /role-permissions/:id
 */
  async remove(id: string | number): Promise<void> {
    await api(`${BASE}/${id}`, { method: "DELETE" });
  },

 /**
   * PATCH /role-permissions/:id/status
   * Body: { status: boolean }
 */
  async updateStatus(id: string | number, status: boolean): Promise<{ ok: true }> {
    const res = (await api(`${BASE}/${id}/status`, {
      method: "PATCH",
      body: {
        status: !!status,
      },
    })) as OneResponseDTO<{ ok: true } | { success?: boolean }>;

    const dto = unwrapOne(res) as any;
    return { ok: dto.ok ?? dto.success ?? true };
  },

 /**
   * GET /role-permissions/pages
   * Returns: RolePermissionPageRow[]
 */
  async listPages(): Promise<RolePermissionPageRow[]> {
    const res = (await api(`${BASE}/pages`)) as ListResponseDTO<RolePermissionPageDTO>;
    const { rows } = unwrapList(res);
    return rows.map(toPageRow);
  },
};
