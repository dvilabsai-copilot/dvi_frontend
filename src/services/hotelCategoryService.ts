// FILE: src/services/hotelCategoryService.ts

import { api } from "@/lib/api";

export type HotelCategoryId = string | number;

export type HotelCategoryRow = {
  id: HotelCategoryId;
  title: string;
  code: string;
 status: boolean; // UI-friendly boolean
};

export type HotelCategoryUpsertInput = {
  title: string;
  code: string;
  status?: boolean;
};

// ---- Internal DTO types (handle multiple backend shapes safely) ----

type HotelCategoryDTO = Partial<{
  id: number | string;
  hotel_category_id: number;
  hotel_category_title: string;
  title: string;
  hotel_category_code: string;
  code: string;
  status: any;
  deleted: any;
}>;

type ListResponseDTO<T> = { data: T[]; meta?: any } | T[];
type OneResponseDTO<T> = { data: T } | T;

// ---- Helpers (same style as languageService / CitiesAPI) ----

const toBool = (v: any): boolean => {
  if (typeof v === "boolean") return v;
  if (typeof v === "number") return v === 1;
  if (typeof v === "string") {
    const s = v.trim().toLowerCase();
    return s === "1" || s === "true" || s === "yes";
  }
  return false;
};

const unwrapList = <T,>(
  res: ListResponseDTO<T>
): { rows: T[]; meta?: any } => {
  if (Array.isArray(res)) return { rows: res };
  if (res && Array.isArray((res as any).data))
    return { rows: (res as any).data, meta: (res as any).meta };
  return { rows: [] };
};

const unwrapOne = <T,>(res: OneResponseDTO<T>): T => {
  if (res && typeof res === "object" && "data" in (res as any))
    return (res as any).data;
  return res as T;
};

const toHotelCategoryRow = (r: HotelCategoryDTO): HotelCategoryRow => {
  const id =
    r.id ??
    r.hotel_category_id ??
    (typeof r.hotel_category_id === "number" ? r.hotel_category_id : 0);

  const title = String(
    r.hotel_category_title ?? r.title ?? ""
  ).trim();

  const code = String(
    r.hotel_category_code ?? r.code ?? ""
  ).trim();

  const status = toBool(r.status);

  return {
    id,
    title,
    code,
    status,
  };
};

// ---- Public API (used by UI) ----

const HOTEL_CATEGORIES_BASE_PATH = "/hotel-categories";

export const hotelCategoryService = {
 /**
   * GET /hotel-categories
   * Accepts either:
   *  - [ { ... } ] OR
   *  - { data: [ { ... } ], meta: {...} }
 */
  async list(): Promise<HotelCategoryRow[]> {
    const res = (await api(HOTEL_CATEGORIES_BASE_PATH, {
      method: "GET",
    })) as ListResponseDTO<HotelCategoryDTO>;

    const { rows } = unwrapList<HotelCategoryDTO>(res);
    return rows.map(toHotelCategoryRow);
  },

 /**
   * POST /hotel-categories
   * Body: { title: string, code: string, status?: boolean }
   * Response: row OR { data: row }
 */
  async create(payload: HotelCategoryUpsertInput): Promise<HotelCategoryRow> {
    const res = (await api(HOTEL_CATEGORIES_BASE_PATH, {
      method: "POST",
      body: {
        title: payload.title,
        code: payload.code,
 // if status is undefined, backend will use default (1/active)
        status:
          typeof payload.status === "boolean"
            ? payload.status
            : undefined,
      },
    })) as OneResponseDTO<HotelCategoryDTO>;

    return toHotelCategoryRow(unwrapOne(res));
  },

 /**
   * PUT /hotel-categories/:id
   * Body: { title?: string, code?: string, status?: boolean }
   * Response: row OR { data: row }
 */
  async update(
    id: HotelCategoryId,
    payload: Partial<HotelCategoryUpsertInput>
  ): Promise<HotelCategoryRow> {
    const res = (await api(`${HOTEL_CATEGORIES_BASE_PATH}/${id}`, {
      method: "PUT",
      body: {
        title: payload.title,
        code: payload.code,
        status:
          typeof payload.status === "boolean"
            ? payload.status
            : undefined,
      },
    })) as OneResponseDTO<HotelCategoryDTO>;

    return toHotelCategoryRow(unwrapOne(res));
  },

 /**
   * PATCH /hotel-categories/:id/status
   * Toggles active/inactive status.
 */
  async toggleStatus(id: HotelCategoryId): Promise<HotelCategoryRow> {
    const res = (await api(
      `${HOTEL_CATEGORIES_BASE_PATH}/${id}/status`,
      { method: "PATCH" }
    )) as OneResponseDTO<HotelCategoryDTO>;

    return toHotelCategoryRow(unwrapOne(res));
  },

 /**
   * DELETE /hotel-categories/:id
   * Soft delete on backend.
 */
  async remove(id: HotelCategoryId): Promise<void> {
    await api(`${HOTEL_CATEGORIES_BASE_PATH}/${id}`, {
      method: "DELETE",
    });
  },

 /**
   * POST /hotel-categories/check-code
   * Body: { code: string, excludeId?: number }
   * Returns: { unique: boolean } OR { data: { unique: boolean } }
 */
  async checkCodeUnique(
    code: string,
    excludeId?: HotelCategoryId
  ): Promise<boolean> {
    const res = (await api(
      `${HOTEL_CATEGORIES_BASE_PATH}/check-code`,
      {
        method: "POST",
        body: {
          code,
          excludeId,
        },
      }
    )) as OneResponseDTO<{ unique: boolean }>;

    const { unique } = unwrapOne(res);
    return unique;
  },

 /**
   * POST /hotel-categories/check-title
   * Body: { title: string, excludeId?: number }
   * Returns: { unique: boolean } OR { data: { unique: boolean } }
 */
  async checkTitleUnique(
    title: string,
    excludeId?: HotelCategoryId
  ): Promise<boolean> {
    const res = (await api(
      `${HOTEL_CATEGORIES_BASE_PATH}/check-title`,
      {
        method: "POST",
        body: {
          title,
          excludeId,
        },
      }
    )) as OneResponseDTO<{ unique: boolean }>;

    const { unique } = unwrapOne(res);
    return unique;
  },
};
