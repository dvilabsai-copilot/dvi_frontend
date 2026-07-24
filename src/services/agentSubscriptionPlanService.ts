// FILE: src/services/agentSubscriptionPlanService.ts

import { api } from "../lib/api";

export type SubscriptionType = "Free" | "Paid";

export type AgentSubscriptionPlanListItem = {
  id: string;
  planTitle: string;
  itineraryCount: number;
  cost: number;
  joiningBonus: number;
  itineraryCost: number;
  validityDays: number;
  recommended: boolean;
  status: boolean;
};

export type AgentSubscriptionPlanDetails = AgentSubscriptionPlanListItem & {
  type: SubscriptionType;
  adminCount: number;
  staffCount: number;
  additionalChargePerStaff: number;
 notes: string; // HTML/string (CKEditor-like)
};

export type AgentSubscriptionPlanPayload = {
  planTitle: string;
  type: SubscriptionType;
  cost: number;
  itineraryCount: number;
  itineraryCost: number;
  joiningBonus: number;
  validityDays: number;
  adminCount: number;
  staffCount: number;
  additionalChargePerStaff: number;
  notes: string;
};

/**
 * We support both:
 * - Old PHP-shaped responses (agent_subscription_plan_*, status = 0/1, etc.)
 * - New NestJS-shaped responses (planTitle, cost, etc.)
 */

type ListResponseDTO<T> = { data: T[]; meta?: any } | T[];
type OneResponseDTO<T> = { data: T } | T;

type PlanListDTO = Partial<{
 // Generic identifiers
  id: string | number;

 // Legacy DB fields
  agent_subscription_plan_ID: number;
  agent_subscription_plan_title: string;
  itinerary_allowed: number;
  subscription_amount: number;
  joining_bonus: number;
  per_itinerary_cost: number;
  validity_in_days: string | number;
  recommended_status: number;
  status: any;
  deleted: any;

 // New API fields (NestJS)
  planTitle: string;
  itineraryCount: number;
  cost: number;
  itineraryCost: number;
  validityDays: number;
  recommended: boolean;
}>;

type PlanDetailsDTO = PlanListDTO &
  Partial<{
 // Legacy / DB
    subscription_type: number | string;
    admin_count: number;
    staff_count: number;
    additional_charge_for_per_staff: number;
    subscription_notes: string;

 // New API fields
    type: SubscriptionType;
    adminCount: number;
    staffCount: number;
    additionalChargePerStaff: number;
    notes: string;
  }>;

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

const intToSubscriptionType = (v: number | string | null | undefined): SubscriptionType => {
  if (typeof v === "string") {
    const s = v.trim().toLowerCase();
    if (s === "paid") return "Paid";
    return "Free";
  }
  if (typeof v === "number" && v === 1) return "Paid";
  return "Free";
};

const toListItem = (r: PlanListDTO): AgentSubscriptionPlanListItem => {
  const id =
    r.id ??
    r.agent_subscription_plan_ID ??
    "";

  const planTitle =
    r.planTitle ??
    r.agent_subscription_plan_title ??
    "";

  const itineraryCount =
    r.itineraryCount ??
    r.itinerary_allowed ??
    0;

  const cost =
    r.cost ??
    r.subscription_amount ??
    0;

  const joiningBonus =
    r.joiningBonus ??
    r.joining_bonus ??
    0;

  const itineraryCost =
    r.itineraryCost ??
    r.per_itinerary_cost ??
    0;

  const rawValidity =
    r.validityDays ??
    r.validity_in_days ??
    0;

  const validityDays =
    typeof rawValidity === "string" ? Number(rawValidity) || 0 : Number(rawValidity || 0);

  const recommended =
    typeof r.recommended !== "undefined"
      ? !!r.recommended
      : toBool(r.recommended_status);

 // If "status" is provided, respect it; if "deleted" is true/1, force false.
  let status = true;
  if (typeof r.status !== "undefined") status = toBool(r.status);
  if (typeof r.deleted !== "undefined" && toBool(r.deleted)) status = false;

  return {
    id: String(id),
    planTitle: String(planTitle).trim(),
    itineraryCount,
    cost,
    joiningBonus,
    itineraryCost,
    validityDays,
    recommended,
    status,
  };
};

const toDetails = (r: PlanDetailsDTO): AgentSubscriptionPlanDetails => {
  const base = toListItem(r);

  const type =
    r.type ??
    intToSubscriptionType(r.subscription_type ?? 0);

  const adminCount =
    r.adminCount ??
    r.admin_count ??
    0;

  const staffCount =
    r.staffCount ??
    r.staff_count ??
    0;

  const additionalChargePerStaff =
    r.additionalChargePerStaff ??
    r.additional_charge_for_per_staff ??
    0;

  const notes =
    r.notes ??
    r.subscription_notes ??
    "";

  return {
    ...base,
    type,
    adminCount,
    staffCount,
    additionalChargePerStaff,
    notes,
  };
};

export const agentSubscriptionPlanService = {
 /**
   * GET /agent-subscription-plans
   * Returns: AgentSubscriptionPlanListItem[]
 */
  async list(): Promise<AgentSubscriptionPlanListItem[]> {
    const res = (await api("/agent-subscription-plans")) as ListResponseDTO<PlanListDTO>;
    const { rows } = unwrapList(res);
    return rows.map(toListItem);
  },

 /**
   * GET /agent-subscription-plans/:id
   * Returns: AgentSubscriptionPlanDetails
 */
  async getOne(id: string | number): Promise<AgentSubscriptionPlanDetails> {
    const res = (await api(`/agent-subscription-plans/${id}`)) as OneResponseDTO<PlanDetailsDTO>;
    const dto = unwrapOne(res);
    return toDetails(dto);
  },

 /**
   * POST /agent-subscription-plans
   * Body: AgentSubscriptionPlanPayload
   * Returns: { id: string }
 */
  async create(payload: AgentSubscriptionPlanPayload): Promise<{ id: string }> {
    const res = (await api("/agent-subscription-plans", {
      method: "POST",
      body: {
        planTitle: payload.planTitle,
        type: payload.type,
        cost: payload.cost,
        itineraryCount: payload.itineraryCount,
        itineraryCost: payload.itineraryCost,
        joiningBonus: payload.joiningBonus,
        validityDays: payload.validityDays,
        adminCount: payload.adminCount,
        staffCount: payload.staffCount,
        additionalChargePerStaff: payload.additionalChargePerStaff,
        notes: payload.notes,
      },
    })) as OneResponseDTO<{ id?: string | number; agent_subscription_plan_ID?: number }>;

    const dto = unwrapOne(res);
    const id =
      dto.id ??
      dto.agent_subscription_plan_ID ??
      "";

    return { id: String(id) };
  },

 /**
   * PUT /agent-subscription-plans/:id
   * Body: AgentSubscriptionPlanPayload
   * Returns: { ok: true }
 */
  async update(
    id: string | number,
    payload: AgentSubscriptionPlanPayload
  ): Promise<{ ok: true }> {
    const res = (await api(`/agent-subscription-plans/${id}`, {
      method: "PUT",
      body: {
        planTitle: payload.planTitle,
        type: payload.type,
        cost: payload.cost,
        itineraryCount: payload.itineraryCount,
        itineraryCost: payload.itineraryCost,
        joiningBonus: payload.joiningBonus,
        validityDays: payload.validityDays,
        adminCount: payload.adminCount,
        staffCount: payload.staffCount,
        additionalChargePerStaff: payload.additionalChargePerStaff,
        notes: payload.notes,
      },
    })) as OneResponseDTO<{ ok?: boolean; success?: boolean }>;

    const dto = unwrapOne(res) as any;
    return { ok: dto?.ok ?? dto?.success ?? true };
  },

 /**
   * DELETE /agent-subscription-plans/:id
   * Returns: { ok: true } or void
 */
  async remove(id: string | number): Promise<{ ok: true }> {
    const res = (await api(`/agent-subscription-plans/${id}`, {
      method: "DELETE",
    })) as OneResponseDTO<{ ok?: boolean; success?: boolean }> | void;

    if (!res) {
 // If backend returns empty body, still consider delete successful if no error thrown.
      return { ok: true };
    }

    const dto = unwrapOne(res as OneResponseDTO<{ ok?: boolean; success?: boolean }>) as any;
    return { ok: dto?.ok ?? dto?.success ?? true };
  },

 /**
   * PATCH /agent-subscription-plans/:id/status
   * Body: { status: boolean }
 */
  async updateStatus(id: string | number, status: boolean): Promise<{ ok: true }> {
    const res = (await api(`/agent-subscription-plans/${id}/status`, {
      method: "PATCH",
      body: {
        status: !!status,
      },
    })) as OneResponseDTO<{ ok?: boolean; success?: boolean }>;

    const dto = unwrapOne(res) as any;
    return { ok: dto?.ok ?? dto?.success ?? true };
  },

 /**
   * PATCH /agent-subscription-plans/:id/recommended
   * Body: { recommended: boolean }
 */
  async updateRecommended(
    id: string | number,
    recommended: boolean
  ): Promise<{ ok: true }> {
    const res = (await api(`/agent-subscription-plans/${id}/recommended`, {
      method: "PATCH",
      body: {
        recommended: !!recommended,
      },
    })) as OneResponseDTO<{ ok?: boolean; success?: boolean }>;

    const dto = unwrapOne(res) as any;
    return { ok: dto?.ok ?? dto?.success ?? true };
  },
};
