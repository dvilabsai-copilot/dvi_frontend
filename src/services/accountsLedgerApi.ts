// FILE: src/services/accountsLedgerApi.ts
import { API_BASE_URL } from "@/lib/api";

// Component type – matches backend DTO / PHP split
export type ComponentType =
  | "all"
  | "guide"
  | "hotspot"
  | "activity"
  | "hotel"
  | "vehicle"
  | "agent";

// Flattened row used by AccountsLedger UI
export type LedgerRow = {
  id: number;
  bookingId: string;
  componentType: ComponentType;
  agentName: string;
  branch?: string;
  vehicle?: string;
  vehicleVendor?: string;
  guideName?: string;
  hotspotName?: string;
  activityName?: string;
  hotelName?: string;
  totalBilled: number;
  totalReceived: number;
  totalReceivable: number;
  totalPaid: number;
  totalBalance: number;
  guest: string;
  arrival: string;
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
};

// Dynamic dropdown options type
export type LedgerOption = {
  id: number;
  label: string;
};

export type LedgerFilterOptions = {
  agents: LedgerOption[];
  vehicleBranches: LedgerOption[];
  vehicles: LedgerOption[];
  vendors: LedgerOption[];
  guides: LedgerOption[];
  hotspots: LedgerOption[];
  activities: LedgerOption[];
  hotels: LedgerOption[];
};


// 🔐 Helper: attach JWT from localStorage (same idea as other secured APIs)
function getAuthHeaders(): Record<string, string> {
  if (typeof window === "undefined") return {};
  const token =
    window.localStorage.getItem("token") ||
    window.localStorage.getItem("accessToken") ||
    window.localStorage.getItem("access_token") ||
    window.localStorage.getItem("jwt");

  return token ? { Authorization: `Bearer ${token}` } : {};
}

// Raw header type (dvi_accounts_itinerary_details)
type HeaderRow = {
  accounts_itinerary_details_ID: number;
  itinerary_plan_ID: number;
  agent_id: number;
  staff_id: number;
  confirmed_itinerary_plan_ID: number;
  itinerary_quote_ID: string | null;
  trip_start_date_and_time: string | null;
  trip_end_date_and_time: string | null;
  total_billed_amount: number;
  total_received_amount: number;
  total_receivable_amount: number;
  total_payable_amount: number;
  total_payout_amount: number;
};

// Generic component row returned by backend for non-agent types
type ComponentBackendRow = {
  componentType?: ComponentType; // present for "all" API
  header: HeaderRow;
  details: any; // specific *_details table (hotel/vehicle/guide/...)
  transactions: any[]; // *_transaction_history rows
};

// Helper: format Date / DateTime → "YYYY-MM-DD"
function toYyyyMmDd(dt: string | Date | null | undefined): string {
  if (!dt) return "";

  // If backend sent a JS Date
  if (dt instanceof Date) {
    // toISOString: "2025-10-03T00:00:00.000Z"
    return dt.toISOString().slice(0, 10);
  }

  // If it’s a string (e.g. "2025-10-03T00:00:00.000Z" or "2025-10-03")
  if (typeof dt === "string") {
    if (dt.length >= 10) {
      return dt.slice(0, 10);
    }
    return dt; // already short, just return
  }

  return "";
}


// Flatten backend (PHP-style data) → UI LedgerRow[]
function mapBackendToLedgerRows(
  data: any[],
  requestedComponentType: ComponentType
): LedgerRow[] {
  const rows: LedgerRow[] = [];

  for (const raw of data) {
    // 1) AGENT LEDGER (componentType=agent in query)
    // Backend returns plain header rows (no "header"/"details" wrapper)
    if (requestedComponentType === "agent" && !("header" in raw)) {
      const h = raw as HeaderRow;

      rows.push({
        id: h.accounts_itinerary_details_ID,
        bookingId: h.itinerary_quote_ID ?? "",
        componentType: "agent",
        agentName: `Agent #${h.agent_id}`, // TODO: later join dvi_agent for real names
        branch: undefined,
        vehicle: undefined,
        vehicleVendor: undefined,
        guideName: undefined,
        hotspotName: undefined,
        activityName: undefined,
        hotelName: undefined,
        totalBilled: h.total_billed_amount ?? 0,
        totalReceived: h.total_received_amount ?? 0,
        totalReceivable: h.total_receivable_amount ?? 0,
        totalPaid: h.total_payout_amount ?? 0,
        totalBalance: h.total_receivable_amount ?? 0,
        guest: "",
        arrival: "",
        startDate: toYyyyMmDd(h.trip_start_date_and_time),
        endDate: toYyyyMmDd(h.trip_end_date_and_time),
      });

      continue;
    }

    // 2) OTHER COMPONENTS & "all" – backend returns { header, details, transactions }
    const row = raw as ComponentBackendRow;
    const h = row.header;
    const d = row.details || {};
    const effectiveType: ComponentType =
      (row.componentType as ComponentType) || requestedComponentType;

    // Base totals (header-level)
    let totalBilled = h.total_billed_amount ?? 0;
    let totalReceived = h.total_received_amount ?? 0;
    let totalReceivable = h.total_receivable_amount ?? 0;
    let totalPaid = 0;
    let totalBalance = 0;

    // Component-specific override using *_details totals
    if (
      effectiveType === "vehicle" ||
      effectiveType === "hotel" ||
      effectiveType === "guide" ||
      effectiveType === "activity" ||
      effectiveType === "hotspot"
    ) {
      totalBilled =
        typeof d.total_payable === "number"
          ? d.total_payable
          : typeof d.total_purchase === "number"
          ? d.total_purchase
          : 0;
      totalReceived = 0;
      totalReceivable = 0;
      totalPaid = typeof d.total_paid === "number" ? d.total_paid : 0;
      totalBalance =
        typeof d.total_balance === "number" ? d.total_balance : 0;
    } else if (effectiveType === "agent") {
      // agent row wrapped inside "all" result
      totalPaid = h.total_payout_amount ?? 0;
      totalBalance = h.total_receivable_amount ?? 0;
    }

    // Component-specific label fields – currently showing IDs.
    const agentName = `Agent #${h.agent_id}`;
    let branch: string | undefined;
    let vehicle: string | undefined;
    let vehicleVendor: string | undefined;
    let guideName: string | undefined;
    let hotspotName: string | undefined;
    let activityName: string | undefined;
    let hotelName: string | undefined;

    if (effectiveType === "vehicle") {
      vehicleVendor =
        d.vendor_id !== undefined ? `Vendor #${d.vendor_id}` : undefined;
      branch =
        d.vendor_branch_id !== undefined
          ? `Branch #${d.vendor_branch_id}`
          : undefined;
      vehicle =
        d.vehicle_id !== undefined ? `Vehicle #${d.vehicle_id}` : undefined;
    } else if (effectiveType === "guide") {
      guideName =
        d.guide_id !== undefined ? `Guide #${d.guide_id}` : undefined;
    } else if (effectiveType === "hotel") {
      hotelName =
        d.hotel_id !== undefined ? `Hotel #${d.hotel_id}` : undefined;
    } else if (effectiveType === "hotspot") {
      hotspotName =
        d.hotspot_ID !== undefined ? `Hotspot #${d.hotspot_ID}` : undefined;
    } else if (effectiveType === "activity") {
      activityName =
        d.activity_ID !== undefined ? `Activity #${d.activity_ID}` : undefined;
    }

    rows.push({
      id: rows.length + 1,
      bookingId: h.itinerary_quote_ID ?? "",
      componentType: effectiveType,
      agentName,
      branch,
      vehicle,
      vehicleVendor,
      guideName,
      hotspotName,
      activityName,
      hotelName,
      totalBilled,
      totalReceived,
      totalReceivable,
      totalPaid,
      totalBalance,
      guest: "",
      arrival: "",
      startDate: toYyyyMmDd(h.trip_start_date_and_time),
      endDate: toYyyyMmDd(h.trip_end_date_and_time),
    });
  }

  return rows;
}

// 1.1) Export Excel
export async function exportLedgerExcel(
  componentType: ComponentType,
  quoteId?: string,
  fromDate?: string,
  toDate?: string,
): Promise<void> {
  const params = new URLSearchParams();
  params.append("componentType", componentType);
  if (quoteId) params.append("quoteId", quoteId);
  if (fromDate) params.append("fromDate", fromDate);
  if (toDate) params.append("toDate", toDate);

  const response = await fetch(`${API_BASE_URL}/accounts-export/ledger/excel?${params.toString()}`, {
    method: "GET",
    headers: getAuthHeaders(),
  });

  if (!response.ok) {
    throw new Error("Failed to export excel");
  }

  const blob = await response.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `accounts_ledger_${new Date().getTime()}.xlsx`;
  document.body.appendChild(a);
  a.click();
  window.URL.revokeObjectURL(url);
  document.body.removeChild(a);
}

// Main ledger rows
export async function fetchLedgerFromApi(params: {
  quoteId: string;
  componentType: ComponentType;
  fromDate: string; // DD/MM/YYYY
  toDate: string; // DD/MM/YYYY
  guideName: string;
  hotspotName: string;
  activityName: string;
  hotelName: string;
  branch: string;
  vehicle: string;
  vehicleVendor: string;
  agentName: string;
}): Promise<LedgerRow[]> {
  const search = new URLSearchParams();

  search.set("componentType", params.componentType);
  if (params.quoteId.trim()) {
    search.set("quoteId", params.quoteId.trim());
  }
  if (params.fromDate.trim()) {
    search.set("fromDate", params.fromDate.trim());
  }
if (params.toDate.trim()) {
  search.set("toDate", params.toDate.trim());
}

const appendPositiveId = (
  key: string,
  value: string
) => {
  const id = Number(value);

  if (
    Number.isInteger(id) &&
    id > 0
  ) {
    search.set(key, String(id));
  }
};

appendPositiveId(
  "guideId",
  params.guideName
);

appendPositiveId(
  "hotspotId",
  params.hotspotName
);

appendPositiveId(
  "activityId",
  params.activityName
);

appendPositiveId(
  "hotelId",
  params.hotelName
);

appendPositiveId(
  "vendorBranchId",
  params.branch
);

appendPositiveId(
  "vehicleTypeId",
  params.vehicle
);

appendPositiveId(
  "vendorId",
  params.vehicleVendor
);

appendPositiveId(
  "agentId",
  params.agentName
);

// Vendor login is still protected on backend.
// Any browser vendorId is ignored for roleID 2.
const url =
  `${API_BASE_URL}/accounts-ledger?${search.toString()}`;

  const res = await fetch(url, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      ...getAuthHeaders(),
    },
  });

  if (!res.ok) {
    console.error("Failed to fetch ledger", res.status, await res.text());
    throw new Error("Failed to fetch ledger");
  }

  const data = (await res.json()) as any[];
  return mapBackendToLedgerRows(data, params.componentType);
}

// Dynamic dropdown options
export async function fetchLedgerFilterOptions(params: {
  quoteId: string;
  componentType: ComponentType;
  fromDate: string; // DD/MM/YYYY
  toDate: string; // DD/MM/YYYY
}): Promise<LedgerFilterOptions> {
  const search = new URLSearchParams();

  search.set("componentType", params.componentType);
  if (params.quoteId.trim()) {
    search.set("quoteId", params.quoteId.trim());
  }
  if (params.fromDate.trim()) {
    search.set("fromDate", params.fromDate.trim());
  }
  if (params.toDate.trim()) {
    search.set("toDate", params.toDate.trim());
  }

  // include global prefix /api/v1 from main.ts
  const url = `${API_BASE_URL}/accounts-ledger/options?${search.toString()}`;

  const res = await fetch(url, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      ...getAuthHeaders(),
    },
  });

  if (!res.ok) {
    console.error(
      "Failed to fetch ledger filter options",
      res.status,
      await res.text()
    );
    // safe fallback
   const allOnly: LedgerOption[] = [
  {
    id: 0,
    label: "All",
  },
];

return {
  agents: allOnly,
  vehicleBranches: allOnly,
  vehicles: allOnly,
  vendors: allOnly,
  guides: allOnly,
  hotspots: allOnly,
  activities: allOnly,
  hotels: allOnly,
};
  }

  const raw =
  (await res.json()) as Partial<LedgerFilterOptions>;

const withAll = (
  items: LedgerOption[] | undefined,
): LedgerOption[] => [
  {
    id: 0,
    label: "All",
  },
  ...(items ?? []).filter(
    (item) =>
      Number(item.id) > 0 &&
      String(item.label || "").trim(),
  ),
];

return {
  agents: withAll(raw.agents),
  vehicleBranches: withAll(
    raw.vehicleBranches
  ),
  vehicles: withAll(raw.vehicles),
  vendors: withAll(raw.vendors),
  guides: withAll(raw.guides),
  hotspots: withAll(raw.hotspots),
  activities: withAll(
    raw.activities
  ),
  hotels: withAll(raw.hotels),
};
}
