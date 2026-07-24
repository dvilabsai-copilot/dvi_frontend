// FILE: src/services/languageService.ts

import { api } from "@/lib/api";

export type LanguageId = string | number;

export type LanguageRow = {
  id: LanguageId;
  language: string;
 status: boolean; // UI-friendly boolean
};

export type LanguageUpsertInput = {
  language: string;
  status?: boolean;
};

// ---- Internal DTO types (handle multiple backend shapes safely) ----

type LanguageDTO = Partial<{
  id: number | string;
  language_id: number;
  language: string;
  language_name: string;
  title: string;
  status: any;
}>;

type ListResponseDTO<T> = { data: T[]; meta?: any } | T[];
type OneResponseDTO<T> = { data: T } | T;

// ---- Helpers (same style as CitiesAPI) ----

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
  if (res && Array.isArray((res as any).data))
    return { rows: (res as any).data, meta: (res as any).meta };
  return { rows: [] };
};

const unwrapOne = <T,>(res: OneResponseDTO<T>): T => {
  if (res && typeof res === "object" && "data" in (res as any))
    return (res as any).data;
  return res as T;
};

const toLanguageRow = (r: LanguageDTO): LanguageRow => {
  const id =
    r.id ??
    r.language_id ??
    (typeof r.language_id === "number" ? r.language_id : 0);

  const language = String(
    r.language ?? r.language_name ?? r.title ?? ""
  ).trim();

  const status = toBool(r.status);

  return {
    id,
    language,
    status,
  };
};

// ---- Public API (used by UI) ----

const LANGUAGES_BASE_PATH = "/languages";

export const languageService = {
 /**
   * GET /languages
   * Accepts either:
   *  - [ { ... } ] OR
   *  - { data: [ { ... } ], meta: {...} }
 */
  async list(): Promise<LanguageRow[]> {
    const res = (await api(
      `${LANGUAGES_BASE_PATH}`,
      { method: "GET" }
    )) as ListResponseDTO<LanguageDTO>;

    const { rows } = unwrapList<LanguageDTO>(res);
    return rows.map(toLanguageRow);
  },

 /**
   * POST /languages
   * Body: { language: string, status?: boolean }
   * Response: row OR { data: row }
 */
  async create(payload: LanguageUpsertInput): Promise<LanguageRow> {
    const res = (await api(LANGUAGES_BASE_PATH, {
      method: "POST",
      body: {
        language: payload.language,
 // if status is undefined, backend will use default (1/active)
        status:
          typeof payload.status === "boolean"
            ? payload.status
            : undefined,
      },
    })) as OneResponseDTO<LanguageDTO>;

    return toLanguageRow(unwrapOne(res));
  },

 /**
   * PUT /languages/:id
   * Body: { language?: string, status?: boolean }
   * Response: row OR { data: row }
 */
  async update(
    id: LanguageId,
    payload: Partial<LanguageUpsertInput>
  ): Promise<LanguageRow> {
    const res = (await api(`${LANGUAGES_BASE_PATH}/${id}`, {
      method: "PUT",
      body: {
        language: payload.language,
        status:
          typeof payload.status === "boolean"
            ? payload.status
            : undefined,
      },
    })) as OneResponseDTO<LanguageDTO>;

    return toLanguageRow(unwrapOne(res));
  },

 /**
   * DELETE /languages/:id
   * Soft delete on backend.
 */
  async remove(id: LanguageId): Promise<void> {
    await api(`${LANGUAGES_BASE_PATH}/${id}`, { method: "DELETE" });
  },
};
