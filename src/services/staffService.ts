// FILE: src/services/staffService.ts
import { api } from "../lib/api";

/** ========= Frontend-facing types (used by your pages) ========= */
export interface StaffListRow {
  id: number;
  name: string;
  mobileNumber: string;
  email: string;
  agentName: string;
  status: 0 | 1;
  roleAccess: string; // human label (now uses backend roleName)
  roleId: number;     // carry roleId for edits
}

export interface Staff {
  id: number;
  name: string;
  mobileNumber: string;
  email: string;
  roleAccess: string; // human label (now uses backend roleName)
  roleId: number;     // needed by form / preview
  status: 0 | 1;
  agentName: string;
}

/** ========= Backend DTO shapes (Nest responses) ========= */
type StaffLoginDTO =
  | {
      userId: number;
      userEmail: string;
      lastLoggedOn: string | null;
      status: number;
    }
  | null;

type StaffViewDTO = {
  staffId: number;
  agentId: number;
  staffName: string;
  staffMobile: string;
  staffEmail: string;
  roleId: number;
  status: number;
  deleted: number;
  createdOn: string | null;
  updatedOn: string | null;
  login: StaffLoginDTO;
  /** Enriched by backend (dvi_rolemenu.role_name) */
  roleName?: string;
  /** Enriched by backend (dvi_agent.agent_name + agent_lastname) */
  agentName?: string;
};

type ListResponseDTO = {
  total: number;
  page: number;
  pageSize: number;
  data: StaffViewDTO[];
};

/** ========= Local map helpers ========= */
const toListRow = (r: StaffViewDTO): StaffListRow => ({
  id: r.staffId,
  name: r.staffName,
  mobileNumber: r.staffMobile,
  email: r.staffEmail,
  agentName: r.agentName ?? "-", // now uses backend-provided full name
  status: (r.status ?? 0) as 0 | 1,
  roleId: r.roleId ?? 0,
  roleAccess: r.roleName ?? `Role ${r.roleId}`, // use real role name when provided
});

const toStaff = (r: StaffViewDTO): Staff => ({
  id: r.staffId,
  name: r.staffName,
  mobileNumber: r.staffMobile,
  email: r.staffEmail,
  roleId: r.roleId ?? 0,
  roleAccess: r.roleName ?? `Role ${r.roleId}`,
  status: (r.status ?? 0) as 0 | 1,
  agentName: r.agentName ?? "-",
});

/** ========= Public API consumed by your pages ========= */
export const StaffAPI = {
  /** Fetch list (server returns {total, page, pageSize, data}) */
  async list(): Promise<StaffListRow[]> {
    const res = (await api("/staff")) as ListResponseDTO;
    if (!res || !Array.isArray(res.data)) {
      throw new Error("Unexpected staff list response");
    }
    return res.data.map(toListRow);
  },

  /** Fetch a single staff by id (used by preview/edit) */ 
  async get(id: number): Promise<Staff> { 
    const res = (await api(`/staff/${id}`)) as StaffViewDTO; 
    return toStaff(res); 
  },

  async checkDuplicate(input: {
    email?: string;
    mobileNumber?: string;
    ignoreStaffId?: number;
  }): Promise<{ emailExists: boolean; mobileExists: boolean }> {
    const params = new URLSearchParams();

    if (input.email) {
      params.set("email", input.email);
    }

    if (input.mobileNumber) {
      params.set("mobile", input.mobileNumber);
    }

    if (input.ignoreStaffId) {
      params.set("ignoreStaffId", String(input.ignoreStaffId));
    }

    return (await api(
      `/staff/check-duplicate?${params.toString()}`
    )) as {
      emailExists: boolean;
      mobileExists: boolean;
    };
  },
 
  /** Create staff (backend creates login when password is provided) */ 
  async create(input: {
    name: string;
    email: string;
    mobileNumber: string;
    /** If your form has a roles dropdown, pass roleId here */
    roleId?: number;
    /** Optional label shown in UI; backend uses roleId */
    roleAccess?: string;
    agentName: string;
    status: number;
    password: string; // required on create
  }): Promise<Staff> {
    const payload = {
      agentId: 0, // replace when you have the active agent id
      staffName: input.name,
      staffMobile: input.mobileNumber,
      staffEmail: input.email,
      roleId: input.roleId ?? 0, // <- pass real roleId (prefer)
      status: input.status ?? 1,
      loginEmail: input.email,
      password: input.password,
    };

    const res = (await api("/staff", {
      method: "POST",
      body: payload,
    })) as StaffViewDTO;

    return toStaff(res);
  },

  /** Update staff (optionally updates login email/password) */
  async update(
    id: number,
    input: {
      name?: string;
      email?: string;
      mobileNumber?: string;
      /** pass roleId to actually change role */
      roleId?: number;
      /** UI label only */
      roleAccess?: string;
      password?: string; // optional on update
      status?: 0 | 1;
    }
  ): Promise<Staff> {
    const payload: Record<string, unknown> = {
      staffName: input.name,
      staffEmail: input.email,
      staffMobile: input.mobileNumber,
      roleId: typeof input.roleId === "number" ? input.roleId : undefined,
      status: typeof input.status === "number" ? input.status : undefined,
    };

    if (input.password && input.password.trim()) {
      payload.password = input.password;
      if (input.email) payload.loginEmail = input.email;
    }

    const res = (await api(`/staff/${id}`, {
      method: "PUT",
      body: payload,
    })) as StaffViewDTO;

    return toStaff(res);
  },

  /** Toggle active/inactive */
  async toggleStatus(id: number, status: 0 | 1): Promise<void> {
    await api(`/staff/${id}`, {
      method: "PUT",
      body: { status },
    });
  },

  /** Soft delete */
  async delete(id: number): Promise<void> {
    await api(`/staff/${id}`, { method: "DELETE" });
  },
};
export type RoleOption = { id: number; label: string };

export async function fetchStaffRoles(): Promise<RoleOption[]> {
  // GET /api/v1/staff/roles  → [{id,label}]
  const res = await api("/staff/roles");
  if (!Array.isArray(res)) return [];
  return res as RoleOption[];
}