// FILE: src/services/guideService.ts

import { api } from "@/lib/api";

/* -------------------------------------------------------
   Shared: List page helpers (works with multiple shapes)
   ------------------------------------------------------- */

type GuideListRowWire = any;

function normalizeRows(input: any): Array<{
  id: number;
  name: string;
  mobileNumber: string;
  email: string;
  status: 0 | 1;
}> {
  const rows: GuideListRowWire[] = Array.isArray(input?.data)
    ? input.data
    : Array.isArray(input)
    ? input
    : [];

  return rows.map((r: any) => {
    const id =
      Number(r?.modify ?? r?.id ?? r?.guide_id ?? r?.guideId ?? r?.GUIDE_ID ?? 0) || 0;

    const name = r?.guide_name ?? r?.name ?? r?.fullName ?? r?.GUIDE_NAME ?? "";

    const mobileNumber =
      r?.guide_primary_mobile_number ??
      r?.mobileNumber ??
      r?.primaryMobile ??
      r?.phone ??
      "";

    const email = r?.guide_email ?? r?.email ?? r?.mail ?? "";

    const statusNum =
      r?.status === true
        ? 1
        : r?.status === false
        ? 0
        : Number(r?.status ?? r?.active ?? 0);

    return {
      id,
      name: String(name ?? ""),
      mobileNumber: String(mobileNumber ?? ""),
      email: String(email ?? ""),
      status: (statusNum === 1 ? 1 : 0) as 0 | 1,
    };
  });
}

/* -------------------------------------------------------
   Export #1: GuideAPI (list/toggle/delete + full CRUD used by form)
   ------------------------------------------------------- */

export const GuideAPI = {
  /** DataTable list */
  async list(): Promise<
    Array<{ id: number; name: string; mobileNumber: string; email: string; status: 0 | 1 }>
  > {
    const res = await api("/guides", { method: "GET" });
    return normalizeRows(res);
  },

  /** DataTable list with optional server-side query */
  async listQuery(params?: {
    q?: string;
    page?: number;
    size?: number;
    status?: 0 | 1;
  }): Promise<Array<{ id: number; name: string; mobileNumber: string; email: string; status: 0 | 1 }>> {
    const qp = new URLSearchParams();
    if (params?.q?.trim()) qp.set("q", params.q.trim());
    if (typeof params?.page === "number" && Number.isFinite(params.page)) {
      qp.set("page", String(params.page));
    }
    if (typeof params?.size === "number" && Number.isFinite(params.size)) {
      qp.set("size", String(params.size));
    }
    if (typeof params?.status === "number") {
      qp.set("status", String(params.status));
    }

    const query = qp.toString();
    const path = query ? `/guides?${query}` : "/guides";
    const res = await api(path, { method: "GET" });
    return normalizeRows(res);
  },

  /** Toggle active/inactive */
  async toggleStatus(id: number, status: 0 | 1): Promise<void> {
    await api(`/guides/${id}/status`, {
      method: "PATCH",
      body: { status },
    });
  },

  /** Delete guide */
  async delete(id: number): Promise<void> {
    await api(`/guides/${id}`, { method: "DELETE" });
  },

  /* ---------- Added so GuideFormPage compiles & works ---------- */

  /** Get one guide for edit/preview */
  async get(id: number): Promise<{
    id: number;
    name: string;
    dateOfBirth: string;
    bloodGroup: string;
    gender: string;
    primaryMobile: string;
    alternativeMobile: string;
    email: string;
    emergencyMobile: string;
    password: string;
    role: string | number;
    experience: number;
    aadharCardNo: string;
    languageProficiency: string | number;
    country: string | number;
    state: string | number;
    city: string | number;
    gstType: string | number;
    gstPercentage: string;
    availableSlots: string[];
    bankDetails: {
      bankName: string;
      branchName: string;
      ifscCode: string;
      accountNumber: string;
      confirmAccountNumber: string;
    };
    preferredFor: { hotspot: boolean; activity: boolean; itinerary: boolean };
    hotspotPlaces: string[];
    activityPlaces: string[];
    pricebook: {
      startDate: string;
      endDate: string;
      pax1to5: { slot1: number; slot2: number; slot3: number; slot4: number };
      pax6to14: { slot1: number; slot2: number; slot3: number; slot4: number };
      pax15to40: { slot1: number; slot2: number; slot3: number; slot4: number };
    };
    reviews: Array<{ id: string; rating: number; description: string; createdOn: string }>;
  }> {
    const res = await api(`/guides/${id}`, { method: "GET" });
    return normalizeGuideForForm(res);
  },

  /** Create */
  async create(body: any): Promise<{ id: number }> {
    const res = await api("/guides", { method: "POST", body: mapGuideBasicPayload(body) });
    // allow either {id} or {data:{id}}
    const id =
      Number(res?.id ?? res?.data?.id ?? res?.guide_id ?? res?.GUIDE_ID ?? 0) || 0;
    return { id };
  },

  /** Update */
  async update(id: number, body: any): Promise<void> {
    await api(`/guides/${id}`, { method: "PUT", body: mapGuideBasicPayload(body) });
  },

  /** Fetch pricebook rows for a date range (for the day-by-day display table) */
  async getPricebook(
    id: number,
    startDate: string,
    endDate: string,
  ): Promise<any[]> {
    const res = await api(
      `/guides/${id}/pricebook?startDate=${encodeURIComponent(startDate)}&endDate=${encodeURIComponent(endDate)}`,
      { method: "GET" }
    );
    return Array.isArray(res?.rows) ? res.rows : [];
  },

  /** Update pricebook only */
  async updatePricebook(
    id: number,
    data: {
      startDate: string;
      endDate: string;
      priceInputs: {
        pax1_slot1: string; pax1_slot2: string; pax1_slot3: string; pax1_slot4: string;
        pax2_slot1: string; pax2_slot2: string; pax2_slot3: string; pax2_slot4: string;
        pax3_slot1: string; pax3_slot2: string; pax3_slot3: string; pax3_slot4: string;
      };
    }
  ): Promise<void> {
    await api(`/guides/${id}/pricebook`, {
      method: "PATCH",
      body: mapGuidePricebookPayload(data),
    });
  },

  /** Add a review */
  async addReview(
    id: number,
    payload: { rating: number; description: string; createdOn?: string }
  ): Promise<{ id: string; rating: number; description: string; createdOn: string }> {
    const res = await api(`/guides/${id}/reviews`, { method: "POST", body: payload });
    return {
      id: String(res?.id ?? res?.review_id ?? res?.GUIDE_REVIEW_ID ?? cryptoRandomId()),
      rating: Number(res?.rating ?? res?.guide_rating ?? payload.rating),
      description: String(res?.description ?? res?.guide_description ?? payload.description ?? ""),
      createdOn: String(res?.createdOn ?? res?.createdon ?? payload.createdOn ?? ""),
    };
  },

  /** Delete a review */
  async deleteReview(id: number, reviewId: string): Promise<void> {
    await api(`/guides/${id}/reviews/${reviewId}`, { method: "DELETE" });
  },

  /** Update a review */
  async updateReview(
    id: number,
    reviewId: string,
    payload: { rating: number; description: string }
  ): Promise<void> {
    await api(`/guides/${id}/reviews/${reviewId}`, {
      method: "PUT",
      body: payload,
    });
  },
};

function mapGuidePricebookPayload(data: {
  startDate: string;
  endDate: string;
  priceInputs: {
    pax1_slot1: string; pax1_slot2: string; pax1_slot3: string; pax1_slot4: string;
    pax2_slot1: string; pax2_slot2: string; pax2_slot3: string; pax2_slot4: string;
    pax3_slot1: string; pax3_slot2: string; pax3_slot3: string; pax3_slot4: string;
  };
}) {
  return {
    start_date: data.startDate,
    end_date: data.endDate,
    pax_prices: [
      { pax_id: 1, slot_id: 1, price: data.priceInputs.pax1_slot1 },
      { pax_id: 1, slot_id: 2, price: data.priceInputs.pax1_slot2 },
      { pax_id: 1, slot_id: 3, price: data.priceInputs.pax1_slot3 },
      { pax_id: 1, slot_id: 4, price: data.priceInputs.pax1_slot4 },
      { pax_id: 2, slot_id: 1, price: data.priceInputs.pax2_slot1 },
      { pax_id: 2, slot_id: 2, price: data.priceInputs.pax2_slot2 },
      { pax_id: 2, slot_id: 3, price: data.priceInputs.pax2_slot3 },
      { pax_id: 2, slot_id: 4, price: data.priceInputs.pax2_slot4 },
      { pax_id: 3, slot_id: 1, price: data.priceInputs.pax3_slot1 },
      { pax_id: 3, slot_id: 2, price: data.priceInputs.pax3_slot2 },
      { pax_id: 3, slot_id: 3, price: data.priceInputs.pax3_slot3 },
      { pax_id: 3, slot_id: 4, price: data.priceInputs.pax3_slot4 },
    ],
  };
}

function mapGuideBasicPayload(body: any) {
  const preferredFor = body?.preferredFor || {};
  const preferredValue = preferredFor.hotspot ? 1 : preferredFor.activity ? 2 : preferredFor.itinerary ? 3 : 0;

  const slotIds = Array.isArray(body?.availableSlots)
    ? body.availableSlots
        .map((s: string) => {
          if (s === "slot1") return 1;
          if (s === "slot2") return 2;
          if (s === "slot3") return 3;
          if (s === "slot4") return 4;
          const n = Number(s);
          return Number.isFinite(n) ? n : 0;
        })
        .filter((x: number) => x > 0)
    : [];

  const genderMap: Record<string, number> = { male: 1, female: 2, other: 3 };
  const genderRaw = String(body?.gender ?? "").trim().toLowerCase();
  const gender = genderMap[genderRaw] ?? Number(body?.gender || 0);

  const bloodGroups = [
    "A RhD positive (A+)",
    "A RhD negative (A-)",
    "B RhD positive (B+)",
    "B RhD negative (B-)",
    "O RhD positive (O+)",
    "O RhD negative (O-)",
    "AB RhD positive (AB+)",
    "AB RhD negative (AB-)",
  ];
  const bloodRaw = String(body?.bloodGroup ?? body?.guide_bloodgroup ?? "").trim();
  const bloodIndex = bloodGroups.findIndex((b) => b.toLowerCase() === bloodRaw.toLowerCase());
  const bloodGroup = bloodIndex >= 0 ? String(bloodIndex + 1) : bloodRaw;

  return {
    id: Number(body?.id || 0) || undefined,
    guide_name: String(body?.name ?? body?.guide_name ?? "").trim(),
    guide_dob: String(body?.dateOfBirth ?? body?.guide_dob ?? "").trim(),
    guide_bloodgroup: bloodGroup,
    guide_gender: gender,
    guide_primary_mobile_number: String(body?.primaryMobile ?? body?.guide_primary_mobile_number ?? "").trim(),
    guide_alternative_mobile_number: String(body?.alternativeMobile ?? body?.guide_alternative_mobile_number ?? "").trim(),
    guide_email: String(body?.email ?? body?.guide_email ?? "").trim(),
    guide_emergency_mobile_number: String(body?.emergencyMobile ?? body?.guide_emergency_mobile_number ?? "").trim(),
    guide_language_proficiency: String(body?.languageProficiency ?? body?.guide_language_proficiency ?? "").trim(),
    guide_aadhar_number: String(body?.aadharCardNo ?? body?.guide_aadhar_number ?? "").trim(),
    guide_experience: String(body?.experience ?? body?.guide_experience ?? "").trim(),
    guide_country: Number(body?.country ?? body?.guide_country ?? 0),
    guide_state: Number(body?.state ?? body?.guide_state ?? 0),
    guide_city: Number(body?.city ?? body?.guide_city ?? 0),
    gst_type: Number(body?.gstType ?? body?.gst_type ?? 0),
    guide_gst:
      Number(body?.gstPercentage ?? body?.guide_gst ?? 0) ||
      Number(String(body?.gstPercentage ?? "").match(/\d+(?:\.\d+)?/)?.[0] || 0),
    guide_available_slot: slotIds,
    guide_bank_name: String(body?.bankDetails?.bankName ?? body?.guide_bank_name ?? "").trim(),
    guide_bank_branch_name: String(body?.bankDetails?.branchName ?? body?.guide_bank_branch_name ?? "").trim(),
    guide_ifsc_code: String(body?.bankDetails?.ifscCode ?? body?.guide_ifsc_code ?? "").trim(),
    guide_account_number: String(body?.bankDetails?.accountNumber ?? body?.guide_account_number ?? "").trim(),
    guide_confirm_account_number: String(body?.bankDetails?.confirmAccountNumber ?? body?.guide_confirm_account_number ?? "").trim(),
    guide_preffered_for: preferredValue,
    applicable_hotspot_places: Array.isArray(body?.hotspotPlaces) ? body.hotspotPlaces.join(",") : "",
    applicable_activity_places: Array.isArray(body?.activityPlaces) ? body.activityPlaces.join(",") : "",
    guide_select_role: String(body?.role ?? body?.guide_select_role ?? "").trim(),
    guide_password: String(body?.password ?? body?.guide_password ?? "").trim(),
    status: Number(body?.status ?? 1) === 1 ? 1 : 0,
  };
}

function normalizeGuideForForm(res: any) {
  const data = res?.payload ? res.payload : res;
  const reviewsSrc = Array.isArray(res?.reviews) ? res.reviews : Array.isArray(data?.reviews) ? data.reviews : [];
  const normalizedPricebook = normalizePricebook(data?.pricebook ?? res?.pricebook);
  const toSlot = (v: number | string) => `slot${Number(v)}`;
  return {
    id: Number(data?.id ?? data?.guide_id ?? 0),
    name: String(data?.name ?? data?.guide_name ?? ""),
    dateOfBirth: String(data?.dateOfBirth ?? data?.guide_dob ?? ""),
    bloodGroup: String(data?.bloodGroup ?? data?.guide_bloodgroup ?? ""),
    gender: String(data?.gender ?? data?.guide_gender ?? ""),
    primaryMobile: String(data?.primaryMobile ?? data?.guide_primary_mobile_number ?? ""),
    alternativeMobile: String(data?.alternativeMobile ?? data?.guide_alternative_mobile_number ?? ""),
    email: String(data?.email ?? data?.guide_email ?? ""),
    emergencyMobile: String(data?.emergencyMobile ?? data?.guide_emergency_mobile_number ?? ""),
    password: "",
    role: String(data?.role ?? data?.guide_select_role ?? ""),
    experience: Number(data?.experience ?? data?.guide_experience ?? 0),
    aadharCardNo: String(data?.aadharCardNo ?? data?.guide_aadhar_number ?? ""),
    languageProficiency: String(data?.languageProficiency ?? data?.guide_language_proficiency ?? ""),
    country: String(data?.country ?? data?.guide_country ?? ""),
    state: String(data?.state ?? data?.guide_state ?? ""),
    city: String(data?.city ?? data?.guide_city ?? ""),
    gstType: String(data?.gstType ?? data?.gst_type ?? ""),
    gstPercentage: String(data?.gstPercentage ?? data?.guide_gst ?? ""),
    availableSlots: Array.isArray(data?.availableSlots)
      ? data.availableSlots
      : Array.isArray(data?.guide_available_slot)
      ? data.guide_available_slot.map(toSlot)
      : String(data?.guide_available_slot ?? "")
          .split(",")
          .map((s: string) => s.trim())
          .filter(Boolean)
          .map(toSlot),
    bankDetails: {
      bankName: String(data?.bankDetails?.bankName ?? data?.guide_bank_name ?? ""),
      branchName: String(data?.bankDetails?.branchName ?? data?.guide_bank_branch_name ?? ""),
      ifscCode: String(data?.bankDetails?.ifscCode ?? data?.guide_ifsc_code ?? ""),
      accountNumber: String(data?.bankDetails?.accountNumber ?? data?.guide_account_number ?? ""),
      confirmAccountNumber: String(data?.bankDetails?.confirmAccountNumber ?? data?.guide_account_number ?? ""),
    },
    preferredFor: {
      hotspot: Number(data?.guide_preffered_for ?? 0) === 1 || Boolean(data?.preferredFor?.hotspot),
      activity: Number(data?.guide_preffered_for ?? 0) === 2 || Boolean(data?.preferredFor?.activity),
      itinerary: Number(data?.guide_preffered_for ?? 0) === 3 || Boolean(data?.preferredFor?.itinerary),
    },
    hotspotPlaces: Array.isArray(data?.hotspotPlaces)
      ? data.hotspotPlaces
      : String(data?.applicable_hotspot_places ?? "")
          .split(",")
          .map((s: string) => s.trim())
          .filter(Boolean),
    activityPlaces: Array.isArray(data?.activityPlaces)
      ? data.activityPlaces
      : String(data?.applicable_activity_places ?? "")
          .split(",")
          .map((s: string) => s.trim())
          .filter(Boolean),
    pricebook: normalizedPricebook,
    reviews: reviewsSrc.map((r: any) => ({
      id: String(r?.id ?? r?.guide_review_id ?? ""),
      rating: Number(r?.rating ?? r?.guide_rating ?? 0),
      description: String(r?.description ?? r?.guide_description ?? ""),
      createdOn: String(r?.createdOn ?? r?.createdon ?? ""),
    })),
  };
}

function normalizePricebook(input: any) {
  const base = {
    startDate: "",
    endDate: "",
    pax1to5: { slot1: 0, slot2: 0, slot3: 0, slot4: 0 },
    pax6to14: { slot1: 0, slot2: 0, slot3: 0, slot4: 0 },
    pax15to40: { slot1: 0, slot2: 0, slot3: 0, slot4: 0 },
  };

  if (!input) return base;

  if (Array.isArray(input)) {
    let minDate: Date | null = null;
    let maxDate: Date | null = null;

    for (const row of input) {
      const pax = Number(row?.pax_count ?? row?.pax_id ?? 0);
      const slot = Number(row?.slot_type ?? row?.slot_id ?? 0);
      const rowPrice = firstDayPrice(row);

      if (pax === 1 && slot >= 1 && slot <= 4) {
        (base.pax1to5 as any)[`slot${slot}`] = rowPrice;
      }
      if (pax === 2 && slot >= 1 && slot <= 4) {
        (base.pax6to14 as any)[`slot${slot}`] = rowPrice;
      }
      if (pax === 3 && slot >= 1 && slot <= 4) {
        (base.pax15to40 as any)[`slot${slot}`] = rowPrice;
      }

      const year = Number(row?.year ?? 0);
      const month = monthNameToIndex(String(row?.month ?? ""));
      if (!year || month < 0) continue;

      for (let day = 1; day <= 31; day++) {
        const value = row?.[`day_${day}`];
        if (value === null || value === undefined || String(value).trim() === "") continue;
        const dt = new Date(Date.UTC(year, month, day));
        if (Number.isNaN(dt.getTime())) continue;
        if (!minDate || dt < minDate) minDate = dt;
        if (!maxDate || dt > maxDate) maxDate = dt;
      }
    }

    base.startDate = minDate ? minDate.toISOString().slice(0, 10) : "";
    base.endDate = maxDate ? maxDate.toISOString().slice(0, 10) : "";
    return base;
  }

  const obj = input as any;
  const paxRows = Array.isArray(obj?.pax_prices) ? obj.pax_prices : [];
  if (paxRows.length > 0) {
    for (const row of paxRows) {
      const pax = Number(row?.pax_id ?? 0);
      const slot = Number(row?.slot_id ?? 0);
      const price = Number(row?.price ?? 0);
      if (pax === 1 && slot >= 1 && slot <= 4) (base.pax1to5 as any)[`slot${slot}`] = price;
      if (pax === 2 && slot >= 1 && slot <= 4) (base.pax6to14 as any)[`slot${slot}`] = price;
      if (pax === 3 && slot >= 1 && slot <= 4) (base.pax15to40 as any)[`slot${slot}`] = price;
    }
  } else {
    base.pax1to5 = {
      slot1: Number(obj?.pax1to5?.slot1 ?? 0),
      slot2: Number(obj?.pax1to5?.slot2 ?? 0),
      slot3: Number(obj?.pax1to5?.slot3 ?? 0),
      slot4: Number(obj?.pax1to5?.slot4 ?? 0),
    };
    base.pax6to14 = {
      slot1: Number(obj?.pax6to14?.slot1 ?? 0),
      slot2: Number(obj?.pax6to14?.slot2 ?? 0),
      slot3: Number(obj?.pax6to14?.slot3 ?? 0),
      slot4: Number(obj?.pax6to14?.slot4 ?? 0),
    };
    base.pax15to40 = {
      slot1: Number(obj?.pax15to40?.slot1 ?? 0),
      slot2: Number(obj?.pax15to40?.slot2 ?? 0),
      slot3: Number(obj?.pax15to40?.slot3 ?? 0),
      slot4: Number(obj?.pax15to40?.slot4 ?? 0),
    };
  }

  base.startDate = String(obj?.startDate ?? obj?.start_date ?? "");
  base.endDate = String(obj?.endDate ?? obj?.end_date ?? "");
  return base;
}

function firstDayPrice(row: any) {
  for (let day = 1; day <= 31; day++) {
    const raw = row?.[`day_${day}`];
    if (raw === null || raw === undefined || String(raw).trim() === "") continue;
    const num = Number(raw);
    if (Number.isFinite(num)) return num;
  }
  return 0;
}

function monthNameToIndex(value: string) {
  const month = value.trim().toLowerCase();
  const months = [
    "january",
    "february",
    "march",
    "april",
    "may",
    "june",
    "july",
    "august",
    "september",
    "october",
    "november",
    "december",
  ];
  return months.indexOf(month);
}

/* -------------------------------------------------------
   Export #2: Preview + options (as you already had)
   ------------------------------------------------------- */

export type GuideBasicRow = {
  guide_id: number;
  guide_name: string | null;
  guide_dob: string | null; // backend may send Date or {}
  guide_bloodgroup: string | null;
  guide_gender: number | null;
  guide_primary_mobile_number: string | null;
  guide_alternative_mobile_number: string | null;
  guide_email: string | null;
  guide_emergency_mobile_number: string | null;
  guide_language_proficiency: string | null;
  guide_aadhar_number: string | null;
  guide_experience: string | null;
  guide_country: number | null;
  guide_state: number | null;
  guide_city: number | null;

  guide_gst?: number | null;
  gst_type?: number | null;
  guide_available_slot?: string | null;

  guide_bank_name?: string | null;
  guide_bank_branch_name?: string | null;
  guide_ifsc_code?: string | null;
  guide_account_number?: string | null;
  guide_confirm_account_number?: string | null;

  guide_preffered_for?: string | null;
};

export type GuidePreviewView = {
  dob_text: string;
  gender_label: string;
  blood_group_label: string;
  language_label: string;
  state_name: string;
  country_name: string; // numeric string like "101" to mirror PHP payload
  gst_percent_text: string;
};

export type GuidePreviewResponse = {
  basic: GuideBasicRow;
  view?: GuidePreviewView; // new: server-rendered labels
  reviews: Array<{
    guide_review_id: number;
    guide_id: number;
    guide_rating: string | null; // "1".."5"
    guide_description: string | null;
    createdon?: string | null;
  }>;
  slots: string[];
  preferredFor: string[];
};

export type OptionsResponse = {
  // flexible shape; we normalize below
  roles?: Array<{ id: number | string; name: string }>;
  languages?: Array<{ id: number | string; name: string }>;
  countries?: Array<{ id: number; name: string }>;
  states?: Array<{ id: number; name: string; countryId?: number }>;
  cities?: Array<{ id: number; name: string; stateId?: number }>;
  gstPercentages?: Array<{ id: number | string; name: string }>;
};

export async function getGuidePreview(guideId: number): Promise<GuidePreviewResponse> {
  const res = await api(`/guides/${guideId}/preview`, { method: "GET" });
  return res as GuidePreviewResponse;
}

/* -------------------------------------------------------
   Dropdowns: single loader that works with /guides/options
   (and gracefully tolerates alternate server shapes)
   ------------------------------------------------------- */

function mapArray(
  input: any,
  idKeys: string[],
  nameKeys: string[],
  extra: Record<string, string[]> = {}
) {
  const arr: any[] = Array.isArray(input) ? input : [];
  return arr.map((r) => {
    const idKey = idKeys.find((k) => r?.[k] !== undefined);
    const nameKey = nameKeys.find((k) => r?.[k] !== undefined);
    const out: any = {
      id: idKey ? r[idKey] : r?.id,
      name: nameKey ? r[nameKey] : r?.name,
    };
    for (const [outKey, keys] of Object.entries(extra)) {
      const found = keys.find((k) => r?.[k] !== undefined);
      if (found) out[outKey] = r[found];
    }
    return out;
  });
}

export async function fetchGuideOptions(): Promise<OptionsResponse> {
  // Your backend exposes a SINGLE endpoint
  const res = await api(`/guides/options`, { method: "GET" });

  // Normalize multiple possible shapes safely
  const roles = mapArray(
    res?.roles ?? res?.data?.roles,
    ["role_id", "id", "ROLE_ID", "value"],
    ["role_name", "name", "ROLE_NAME"]
  );

  const languages = mapArray(
    res?.languages ?? res?.data?.languages,
    ["language_id", "id", "LANGUAGE_ID", "value"],
    ["language", "name", "LANGUAGE"]
  );

  const countries = mapArray(
    res?.countries ?? res?.data?.countries,
    ["country_id", "id", "COUNTRY_ID"],
    ["country_name", "name", "COUNTRY_NAME"]
  );

  const states = mapArray(
    res?.states ?? res?.data?.states,
    ["state_id", "id", "STATE_ID"],
    ["state_name", "name", "STATE_NAME"],
    { countryId: ["country_id", "COUNTRY_ID"] }
  );

  const cities = mapArray(
    res?.cities ?? res?.data?.cities,
    ["city_id", "id", "CITY_ID"],
    ["city_name", "name", "CITY_NAME"],
    { stateId: ["state_id", "STATE_ID"] }
  );

  const gstPercentages = mapArray(
    res?.gstPercentages ?? res?.gst ?? res?.data?.gstPercentages,
    ["gst_id", "id", "value"],
    ["gst_title", "title", "name"]
  );

  return {
    roles,
    languages,
    countries,
    states,
    cities,
    gstPercentages,
  };
}

/* Optional helpers if you later split endpoints on the server.
   These first try split paths; if 404, they fall back to /guides/options. */

export const GuideOptions = {
  async loadAll(): Promise<OptionsResponse> {
    try {
      // primary: single endpoint
      return await fetchGuideOptions();
    } catch {
      // if something breaks, at least return empty structure
      return {
        roles: [],
        languages: [],
        countries: [],
        states: [],
        cities: [],
        gstPercentages: [],
      };
    }
  },

  async states(countryId: string | number): Promise<Array<{ id: number; name: string; countryId?: number }>> {
    // try split path first
    try {
      const res = await api(`/geo/states?countryId=${countryId}`, { method: "GET" });
      return mapArray(res, ["state_id", "id", "STATE_ID"], ["state_name", "name", "STATE_NAME"], {
        countryId: ["country_id", "COUNTRY_ID"],
      });
    } catch {
      const all = await fetchGuideOptions();
      return (all.states ?? []).filter((s) => String(s.countryId ?? "") === String(countryId));
    }
  },

  async cities(stateId: string | number): Promise<Array<{ id: number; name: string; stateId?: number }>> {
    try {
      const res = await api(`/geo/cities?stateId=${stateId}`, { method: "GET" });
      return mapArray(res, ["city_id", "id", "CITY_ID"], ["city_name", "name", "CITY_NAME"], {
        stateId: ["state_id", "STATE_ID"],
      });
    } catch {
      const all = await fetchGuideOptions();
      return (all.cities ?? []).filter((c) => String(c.stateId ?? "") === String(stateId));
    }
  },
};
 
/* -------------------------------------------------------
   Legacy exported function kept for compatibility
   ------------------------------------------------------- */
export async function getGuideOptions(): Promise<OptionsResponse> {
  return fetchGuideOptions();
}

/* -------------------------------------------------------
   Small util
   ------------------------------------------------------- */
function cryptoRandomId(): string {
  // simple fallback for client id
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}
