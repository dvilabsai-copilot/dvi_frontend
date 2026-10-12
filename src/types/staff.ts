// src/types/staff.ts

export interface Staff {
  id: number;
  name: string;
  mobileNumber: string;
  email: string;
  agentName: string;
  status: 0 | 1;
  roleAccess: string;
  password?: string;
}

export interface StaffListRow {
  id: number;
  /** Existing backend login association used for verified Login As selection. */
  verifiedUserId?: string;
  name: string;
  mobileNumber: string;
  email: string;
  agentName: string;
  status: 0 | 1;
  roleAccess: string;
}

export const ROLE_OPTIONS = [
  { value: "staff", label: "Staff" },
  { value: "agent", label: "Agent" },
  { value: "travel_expert", label: "Travel Expert" },
  { value: "admin", label: "Admin" },
];
