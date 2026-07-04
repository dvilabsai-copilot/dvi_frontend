import { api } from "@/lib/api";

const ACCOUNTS_BASE_PATH = "/accounts-manager";
const AGENTS_BASE_PATH = "/agents";

export type AccountsStatus = "all" | "paid" | "due";
export type AccountsComponentType =
  | "all"
  | "hotel"
  | "vehicle"
  | "guide"
  | "hotspot"
  | "activity";

export interface AccountsFilters {
  quoteId?: string;
  agent?: string; // backend expects agent name substring
  status?: AccountsStatus;
  componentType?: AccountsComponentType;
  fromDate?: string; // "DD/MM/YYYY"
  toDate?: string; // "DD/MM/YYYY"
  search?: string;
}

export interface AccountsRow {
  id: number;
  headerId: number;
  quoteId: string;
  hotelName: string;
  amount: number;
  payout: number;
  payable: number;
  status: "paid" | "due";
  componentType: AccountsComponentType;
  agent: string;
  startDate: string; // "DD/MM/YYYY"
  endDate: string; // "DD/MM/YYYY"
  routeDate?: string;
  vehicleId?: number;
  vendorId?: number;
}

export interface AccountsSummary {
  totalPayable: number;
  totalPaid: number;
  totalBalance: number;
  rowCount: number;
}

export interface QuoteOption {
  quoteId: string;
}

export interface AgentOption {
  id: number;
  name: string;
}

export interface PaymentModeOption {
  id: number;
  label: string;
}

export interface PayPayload {
  componentType: Exclude<AccountsComponentType, "all">;
  accountsItineraryDetailsId: number;
  componentDetailId: number;
  routeDate?: string;
  amount: number;
  modeOfPaymentId?: number;
  utrNumber?: string;
  processedBy?: string;
}

// Helpers
function buildQuery(params: Record<string, any>): string {
  const searchParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (
      value !== undefined &&
      value !== null &&
      value !== "" &&
      !(Array.isArray(value) && value.length === 0)
    ) {
      searchParams.append(key, String(value));
    }
  });
  const qs = searchParams.toString();
  return qs ? `?${qs}` : "";
}

// 1) Main list
export async function fetchAccountsList(
  filters: AccountsFilters,
): Promise<AccountsRow[]> {
  const qs = buildQuery(filters);
  return api(`${ACCOUNTS_BASE_PATH}${qs}`, {
    method: "GET",
    auth: true,
  });
}

// 1.1) Export Excel
export async function exportAccountsManagerExcel(
  filters: AccountsFilters,
): Promise<void> {
  const qs = buildQuery(filters);
  const response = await fetch(`${import.meta.env.VITE_API_DVI_BASE_URL}/accounts-export/manager/excel${qs}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${localStorage.getItem("token")}`,
    },
  });

  if (!response.ok) {
    throw new Error("Failed to export excel");
  }

  const blob = await response.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `accounts_manager_${new Date().getTime()}.xlsx`;
  document.body.appendChild(a);
  a.click();
  window.URL.revokeObjectURL(url);
  document.body.removeChild(a);
}

// 2) Summary
export async function fetchAccountsSummary(
  filters: AccountsFilters,
): Promise<AccountsSummary> {
  const qs = buildQuery(filters);
  return api(`${ACCOUNTS_BASE_PATH}/summary${qs}`, {
    method: "GET",
    auth: true,
  });
}

// 3) Quote autocomplete
export async function searchQuotes(
  phrase: string,
): Promise<QuoteOption[]> {
  const qs = phrase ? `?q=${encodeURIComponent(phrase)}` : "";
  return api(`${ACCOUNTS_BASE_PATH}/quotes${qs}`, {
    method: "GET",
    auth: true,
  });
}

// 4) Agent dropdown (uses full agent list so city/location label is available)
export async function fetchAgents(
  travelExpertId?: number,
): Promise<AgentOption[]> {
  const qs = buildQuery({
    page: 0,
    limit: 1000,
  });

  const response = await api(`${AGENTS_BASE_PATH}/full${qs}`, {
    method: "GET",
    auth: true,
  });

  const rows = Array.isArray(response)
    ? response
    : Array.isArray((response as any)?.data)
      ? (response as any).data
      : [];

  return rows
    .filter((agent: any) => {
      if (!travelExpertId) return true;
      return Number(agent.travel_expert_id || 0) === Number(travelExpertId);
    })
    .map((agent: any) => {
      const agentName = String(agent.agent_name || agent.name || "")
        .replace(/\s+/g, " ")
        .trim();

      const cityName = String(agent.city_label || agent.city || agent.location || "")
        .replace(/\s+/g, " ")
        .trim();

      const displayName =
        cityName && !agentName.toLowerCase().includes(cityName.toLowerCase())
          ? `${agentName} - ${cityName}`
          : agentName;

      return {
        id: Number(agent.agent_ID || agent.id || agent.agent_id),
        name: displayName || "Agent",
      };
    })
    .filter((agent) => Number.isFinite(agent.id) && agent.id > 0);
}

// 5) Payment modes
export async function fetchPaymentModes(): Promise<PaymentModeOption[]> {
  return api(`${ACCOUNTS_BASE_PATH}/payment-modes`, {
    method: "GET",
    auth: true,
  });
}

// 6) Pay Now
export async function postPayment(payload: PayPayload): Promise<void> {
  await api(`${ACCOUNTS_BASE_PATH}/pay`, {
    method: "POST",
    auth: true,
    body: payload,
  });
}
