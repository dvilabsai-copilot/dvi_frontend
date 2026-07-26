import { api } from "../lib/api";

// ---------- Shared DTO helpers (same style as rolePermissionService) ----------

type ListResponseDTO<T> = { data: T[]; meta?: any } | T[];
type OneResponseDTO<T> = { data: T } | T;

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

const toBool = (v: any): boolean => {
  if (typeof v === "boolean") return v;
  if (typeof v === "number") return v === 1;
  if (typeof v === "string") {
    const s = v.trim().toLowerCase();
    return s === "1" || s === "true" || s === "yes";
  }
  return false;
};

const toNumber = (v: any, fallback = 0): number => {
  if (v === null || v === undefined || v === "") return fallback;
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
};

const toTimeInput = (value: string | null | undefined): string => {
  if (!value) return "";

  const direct = value.match(/^(\d{1,2}):(\d{2})(?::\d{2})?$/);
  if (direct) return `${direct[1].padStart(2, "0")}:${direct[2]}`;

  // Prisma serializes MySQL TIME columns as ISO date strings. Preserve the
  // stored clock value instead of passing the full ISO value to <input type=time>.
  const isoTime = value.match(/T(\d{2}):(\d{2})/);
  if (isoTime) return `${isoTime[1]}:${isoTime[2]}`;

  return value;
};

const normalizeTime = (value: string | null | undefined): string | null => {
  const time = toTimeInput(value);
  return time ? `${time}:00` : null;
};

// ---------- Backend DTO shapes ----------

type GlobalSettingsDTO = Partial<{
  global_settings_ID: number | string;

  eligibile_country_code: string | null;

  extrabed_rate_percentage: number | string | null;
  childwithbed_rate_percentage: number | string | null;
  childnobed_rate_percentage: number | string | null;

  hotel_margin: number | string | null;
  hotel_margin_gst_type: any;
  hotel_margin_gst_percentage: number | string | null;

  itinerary_distance_limit: number | string | null;
  allowed_km_limit_per_day: number | string | null;
  itinerary_common_buffer_time: string | null;

  itinerary_travel_by_flight_buffer_time: string | null;
  itinerary_travel_by_train_buffer_time: string | null;
  itinerary_travel_by_road_buffer_time: string | null;
  itinerary_break_time: string | null;

  itinerary_hotel_start: string | null;
  itinerary_hotel_return: string | null;
  itinerary_additional_margin_percentage: number | string | null;
  itinerary_additional_margin_day_limit: number | string | null;

  custom_hotspot_or_activity: string | null;
  accommodation_return: string | null;
  vehicle_terms_condition: string | null;

  itinerary_local_speed_limit: number | string | null;
  itinerary_outstation_speed_limit: number | string | null;

  agent_referral_bonus_credit: number | string | null;

  hotel_terms_condition: string | null;
  hotel_voucher_terms_condition: string | null;
  vehicle_voucher_terms_condition: string | null;

  site_title: string | null;

  company_name: string | null;
  company_address: string | null;
  company_pincode: string | null;
  company_gstin_no: string | null;
  company_pan_no: string | null;
  company_contact_no: string | null;
  company_email_id: string | null;
  company_logo: string | null;

  hotel_hsn: string | null;
  vehicle_hsn: string | null;
  service_component_hsn: string | null;

  site_seeing_restriction_km_limit: number | string | null;

  youtube_link: string | null;
  facebook_link: string | null;
  instagram_link: string | null;
  linkedin_link: string | null;

  cc_email_id: string | null;
  default_hotel_voucher_email_id: string | null;
  default_vehicle_voucher_email_id: string | null;
  default_accounts_email_id: string | null;

  company_cin: string | null;
  bank_acc_holder_name: string | null;
  bank_acc_no: string | null;
  bank_ifsc_code: string | null;
  bank_name: string | null;
  branch_name: string | null;

  // bookkeeping
  createdby: number | null;
  createdon: string | null;
  updatedon: string | null;
  status: number | null;
  deleted: number | null;
}>;

type StateDTO = Partial<{
  id: number | string;
  name: string;
  country_id: number | string;
  vehicle_onground_support_number: string | null;
  vehicle_escalation_call_number: string | null;
}>;

type StateConfigDTO = Partial<{
  stateId: number | string;
  countryId: number | string;
  stateName: string;
  vehicleOngroundSupportNumber: string | null;
  vehicleEscalationCallNumber: string | null;
}>;

// ---------- Frontend types (used by GlobalSettings.tsx) ----------

export type GlobalSettings = {
  global_settings_ID?: string;

  // State configuration – UI only, stored in dvi_states via separate calls
  state_id?: string;
  state_name?: string;
  onground_support_number?: string;
  escalation_call_number?: string;

  // Hotel API Config
  tbo_eligible_country: string;

  // Extra Occupancy
  extrabed_rate_percentage: number;
  childwithbed_rate_percentage: number;
  child_nobed_rate_percentage: number;

  // Hotel Default Margin
  hotel_margin_in_percentage: number;
  hotel_margin_gst_type: boolean;
  hotel_margin_gst_percentage: number;

  // Itinerary Distance
  itinerary_distance_limit: number;
  allowed_km_per_day: number;
  common_buffer_time: string; // "HH:MM" or "HH:MM:SS"

  // Site Seeing KM Limit Restriction
  site_seeing_km_limit: number;

  // Itinerary Travel Buffer Time
  flight_buffer_time: string;
  train_buffer_time: string;
  road_buffer_time: string;

  // Itinerary Customize Text
  journey_start_text: string;
  between_day_start_text: string;
  between_day_end_text: string;
  hotel_terms_condition: string;
  vehicle_terms_condition: string;
  hotel_voucher_terms: string;
  vehicle_voucher_terms: string;

  // Itinerary Travel Speed
  local_travel_speed_limit: number;
  outstation_travel_speed_limit: number;

  // Itinerary Additional Margin Settings
  additional_margin_percentage: number;
  additional_margin_day_limit: number;
  referral_bonus_credit: number;

  // Site Settings
  site_title: string;
  company_name: string;
  address: string;
  pincode: string;
  gstin_no: string;
  pan_no: string;
  contact_no: string;
  email_id: string;
  cc_email_id: string;

  hotel_voucher_email: string;
  vehicle_voucher_email: string;
  accounts_email: string;

  hotel_hsn: string;
  vehicle_hsn: string;
  guide_hotspot_activity_hsn: string;

  logo_path: string;
  cin_number: string;

  youtube_link: string;
  facebook_link: string;
  instagram_link: string;
  linkedin_link: string;

  account_holder_name: string;
  account_number: string;
  ifsc_code: string;
  bank_name: string;
  branch_name: string;
};

export type State = {
  id: string;
  name: string;
  countryId?: number;
  vehicleOngroundSupportNumber?: string | null;
  vehicleEscalationCallNumber?: string | null;
};

export type StateConfig = {
  stateId: string;
  countryId: number | null;
  stateName: string;
  vehicleOngroundSupportNumber: string | null;
  vehicleEscalationCallNumber: string | null;
};

export type StateConfigUpdatePayload = {
  stateId: string | number;
  vehicleOngroundSupportNumber?: string | null;
  vehicleEscalationCallNumber?: string | null;
};

// ---------- Mapping functions ----------

const toGlobalSettings = (r: GlobalSettingsDTO): GlobalSettings => {
  const id = r.global_settings_ID ?? 1;

  return {
    global_settings_ID: String(id),

    // UI-only state fields (not coming from dvi_global_settings)
    state_id: "",
    state_name: "",
    onground_support_number: "",
    escalation_call_number: "",

    tbo_eligible_country: r.eligibile_country_code ?? "",

    extrabed_rate_percentage: toNumber(r.extrabed_rate_percentage),
    childwithbed_rate_percentage: toNumber(r.childwithbed_rate_percentage),
    child_nobed_rate_percentage: toNumber(r.childnobed_rate_percentage),

    hotel_margin_in_percentage: toNumber(r.hotel_margin),
    hotel_margin_gst_type: toBool(r.hotel_margin_gst_type),
    hotel_margin_gst_percentage: toNumber(r.hotel_margin_gst_percentage),

    itinerary_distance_limit: toNumber(r.itinerary_distance_limit, 600),
    allowed_km_per_day: toNumber(r.allowed_km_limit_per_day, 450),
    common_buffer_time: toTimeInput(r.itinerary_common_buffer_time) || "01:00",

    site_seeing_km_limit: toNumber(r.site_seeing_restriction_km_limit, 25),

    flight_buffer_time: toTimeInput(r.itinerary_travel_by_flight_buffer_time) || "02:00",
    train_buffer_time: toTimeInput(r.itinerary_travel_by_train_buffer_time) || "01:00",
    road_buffer_time: toTimeInput(r.itinerary_travel_by_road_buffer_time) || "01:00",

    // Keep the same field mapping as the PHP form:
    // Journey Start -> itinerary_break_time,
    // In-Between Start -> itinerary_hotel_start,
    // In-Between End -> itinerary_hotel_return.
    journey_start_text: r.itinerary_break_time || "",
    between_day_start_text: r.itinerary_hotel_start || "",
    between_day_end_text: r.itinerary_hotel_return || "",
    hotel_terms_condition: r.hotel_terms_condition || "",
    vehicle_terms_condition: r.vehicle_terms_condition || "",
    hotel_voucher_terms: r.hotel_voucher_terms_condition || "",
    vehicle_voucher_terms: r.vehicle_voucher_terms_condition || "",

    local_travel_speed_limit: toNumber(r.itinerary_local_speed_limit, 40),
    outstation_travel_speed_limit: toNumber(r.itinerary_outstation_speed_limit, 60),

    additional_margin_percentage: toNumber(r.itinerary_additional_margin_percentage, 10),
    additional_margin_day_limit: toNumber(r.itinerary_additional_margin_day_limit, 3),
    referral_bonus_credit: toNumber(r.agent_referral_bonus_credit, 20),

    site_title: r.site_title || "",
    company_name: r.company_name || "",
    address: r.company_address || "",
    pincode: r.company_pincode || "",
    gstin_no: r.company_gstin_no || "",
    pan_no: r.company_pan_no || "",
    contact_no: r.company_contact_no || "",
    email_id: r.company_email_id || "",
    cc_email_id: r.cc_email_id || "",

    hotel_voucher_email: r.default_hotel_voucher_email_id || "",
    vehicle_voucher_email: r.default_vehicle_voucher_email_id || "",
    accounts_email: r.default_accounts_email_id || "",

    hotel_hsn: r.hotel_hsn || "",
    vehicle_hsn: r.vehicle_hsn || "",
    guide_hotspot_activity_hsn: r.service_component_hsn || "",

    logo_path: r.company_logo || "",
    cin_number: r.company_cin || "",

    youtube_link: r.youtube_link || "",
    facebook_link: r.facebook_link || "",
    instagram_link: r.instagram_link || "",
    linkedin_link: r.linkedin_link || "",

    account_holder_name: r.bank_acc_holder_name || "",
    account_number: r.bank_acc_no || "",
    ifsc_code: r.bank_ifsc_code || "",
    bank_name: r.bank_name || "",
    branch_name: r.branch_name || "",
  };
};

const fromGlobalSettings = (g: GlobalSettings): Partial<GlobalSettingsDTO> => {
  return {
    eligibile_country_code: g.tbo_eligible_country || null,

    extrabed_rate_percentage: g.extrabed_rate_percentage,
    childwithbed_rate_percentage: g.childwithbed_rate_percentage,
    childnobed_rate_percentage: g.child_nobed_rate_percentage,

    hotel_margin: g.hotel_margin_in_percentage,
    hotel_margin_gst_type: g.hotel_margin_gst_type,
    hotel_margin_gst_percentage: g.hotel_margin_gst_percentage,

    itinerary_distance_limit: g.itinerary_distance_limit,
    allowed_km_limit_per_day: g.allowed_km_per_day,
    itinerary_common_buffer_time: normalizeTime(g.common_buffer_time),

    itinerary_travel_by_flight_buffer_time: normalizeTime(g.flight_buffer_time),
    itinerary_travel_by_train_buffer_time: normalizeTime(g.train_buffer_time),
    itinerary_travel_by_road_buffer_time: normalizeTime(g.road_buffer_time),

    itinerary_break_time: g.journey_start_text,
    itinerary_hotel_start: g.between_day_start_text,
    itinerary_hotel_return: g.between_day_end_text,
    hotel_terms_condition: g.hotel_terms_condition,
    vehicle_terms_condition: g.vehicle_terms_condition,
    hotel_voucher_terms_condition: g.hotel_voucher_terms,
    vehicle_voucher_terms_condition: g.vehicle_voucher_terms,

    itinerary_local_speed_limit: g.local_travel_speed_limit,
    itinerary_outstation_speed_limit: g.outstation_travel_speed_limit,
    site_seeing_restriction_km_limit: g.site_seeing_km_limit,

    itinerary_additional_margin_percentage: g.additional_margin_percentage,
    itinerary_additional_margin_day_limit: g.additional_margin_day_limit,
    agent_referral_bonus_credit: g.referral_bonus_credit,

    site_title: g.site_title,
    company_name: g.company_name,
    company_address: g.address,
    company_pincode: g.pincode,
    company_gstin_no: g.gstin_no,
    company_pan_no: g.pan_no,
    company_contact_no: g.contact_no,
    company_email_id: g.email_id,

    cc_email_id: g.cc_email_id,
    default_hotel_voucher_email_id: g.hotel_voucher_email,
    default_vehicle_voucher_email_id: g.vehicle_voucher_email,
    default_accounts_email_id: g.accounts_email,

    hotel_hsn: g.hotel_hsn,
    vehicle_hsn: g.vehicle_hsn,
    service_component_hsn: g.guide_hotspot_activity_hsn,

    company_logo: g.logo_path,
    company_cin: g.cin_number,

    youtube_link: g.youtube_link,
    facebook_link: g.facebook_link,
    instagram_link: g.instagram_link,
    linkedin_link: g.linkedin_link,

    bank_acc_holder_name: g.account_holder_name,
    bank_acc_no: g.account_number,
    bank_ifsc_code: g.ifsc_code,
    bank_name: g.bank_name,
    branch_name: g.branch_name,
  };
};

const toState = (s: StateDTO): State => {
  const id = s.id ?? s.country_id ?? "";
  const name = String(s.name ?? "").trim();

  return {
    id: String(id),
    name,
    countryId: typeof s.country_id === "number" ? s.country_id : undefined,
    vehicleOngroundSupportNumber: s.vehicle_onground_support_number ?? null,
    vehicleEscalationCallNumber: s.vehicle_escalation_call_number ?? null,
  };
};

const toStateConfig = (r: StateConfigDTO): StateConfig => {
  return {
    stateId: String(r.stateId ?? ""),
    countryId: typeof r.countryId === "number" ? r.countryId : r.countryId != null ? Number(r.countryId) : null,
    stateName: String(r.stateName ?? "").trim(),
    vehicleOngroundSupportNumber: r.vehicleOngroundSupportNumber ?? null,
    vehicleEscalationCallNumber: r.vehicleEscalationCallNumber ?? null,
  };
};

// ---------- Base paths ----------

const GLOBAL_BASE = "/global-settings";

// ---------- Main service (rolePermissionService-style) ----------

export const globalSettingsService = {
  /**
   * GET /global-settings
   * Returns the single global settings row.
   */
  async get(): Promise<GlobalSettings> {
    const res = (await api(GLOBAL_BASE)) as OneResponseDTO<GlobalSettingsDTO>;
    const dto = unwrapOne(res);
    return toGlobalSettings(dto);
  },

  /**
   * PUT /global-settings
   * Body: mapped GlobalSettings → dvi_global_settings columns.
   */
  async update(payload: GlobalSettings): Promise<GlobalSettings> {
    const body = fromGlobalSettings(payload);
    const res = (await api(GLOBAL_BASE, {
      method: "PUT",
      body,
    })) as OneResponseDTO<GlobalSettingsDTO>;

    const dto = unwrapOne(res);
    return toGlobalSettings(dto);
  },

  /**
   * GET /global-settings/states
   * Optional ?countryId=
   */
  async listStates(countryId?: number): Promise<State[]> {
    const query =
      typeof countryId === "number" && !Number.isNaN(countryId)
        ? `?countryId=${countryId}`
        : "";
    const res = (await api(`${GLOBAL_BASE}/states${query}`)) as ListResponseDTO<StateDTO>;
    const { rows } = unwrapList(res);
    return rows.map(toState);
  },

  /**
   * GET /global-settings/state-config?stateId=XX
   * Fetch current on-ground / escalation numbers for a state.
   */
  async getStateConfig(stateId: string | number): Promise<StateConfig> {
    const res = (await api(
      `${GLOBAL_BASE}/state-config?stateId=${encodeURIComponent(String(stateId))}`,
    )) as OneResponseDTO<StateConfigDTO>;
    const dto = unwrapOne(res);
    return toStateConfig(dto);
  },

  /**
   * PUT /global-settings/state-config
   * Body: { stateId, vehicleOngroundSupportNumber?, vehicleEscalationCallNumber? }
   */
  async updateStateConfig(payload: StateConfigUpdatePayload): Promise<StateConfig> {
    const res = (await api(`${GLOBAL_BASE}/state-config`, {
      method: "PUT",
      body: {
        stateId: payload.stateId,
        vehicleOngroundSupportNumber: payload.vehicleOngroundSupportNumber ?? null,
        vehicleEscalationCallNumber: payload.vehicleEscalationCallNumber ?? null,
      },
    })) as OneResponseDTO<StateConfigDTO>;

    const dto = unwrapOne(res);
    return toStateConfig(dto);
  },
};

// ---------- Named helpers (so GlobalSettings.tsx can import functions directly) ----------

export async function getGlobalSettings(): Promise<GlobalSettings> {
  return globalSettingsService.get();
}

export async function updateGlobalSettings(payload: GlobalSettings): Promise<GlobalSettings> {
  return globalSettingsService.update(payload);
}

export async function getStates(countryId?: number): Promise<State[]> {
  return globalSettingsService.listStates(countryId);
}

export async function getStateConfig(stateId: string | number): Promise<StateConfig> {
  return globalSettingsService.getStateConfig(stateId);
}

export async function updateStateConfig(payload: StateConfigUpdatePayload): Promise<StateConfig> {
  return globalSettingsService.updateStateConfig(payload);
}
