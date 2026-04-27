// FILE: src/services/dailyMomentTracker.ts

export type TripType = "Arrival" | "Departure" | "Ongoing";

// Raw backend DTO (DailyMomentRowDto from NestJS)
export type DailyMomentApiRow = {
  count: number;

  // Guest details
  guest_name: string;
  guest_mobile: string | null; // NEW
  guest_email: string | null; // NEW

  quote_id: string | null;
  itinerary_plan_ID: number;
  itinerary_route_ID: number;
  route_date: string; // "dd-mm-yyyy"
  trip_type: TripType;
  location_name: string | null;
  next_visiting_location: string | null;
  arrival_flight_details: string | null;
  departure_flight_details: string | null;
  hotel_name: string | null;
  vehicle_type_title: string | null;
  vendor_name: string | null;
  meal_plan: string | null;
  vehicle_no: string | null;
  driver_name: string | null;
  driver_mobile: string | null;
  special_remarks: string | null;

  // Travel expert details
  travel_expert_name: string | null;
  travel_expert_mobile: string | null; // NEW
  travel_expert_email: string | null; // NEW

  agent_name: string | null;
};

// ---------------------------------------------------------------------------
// Mapped row for React UI (DailyMoment list / header for Day View)
// ---------------------------------------------------------------------------

export type DailyMomentListRow = {
  itineraryPlanId?: number;
  itineraryRouteId?: number;

  // Guest
  guestName: string;
  guestMobile?: string | null;
  guestEmail?: string | null;

  // Travel expert
  travelExpert: string;
  travelExpertMobile?: string | null;
  travelExpertEmail?: string | null;

  quoteId: string;
  routeDate: Date;
  type: TripType | string;

  fromLocation: string;
  toLocation: string;

  hotel: string;
  vendor: string;
  vehicle: string;
  vehicleNo: string;

  driverName: string;
  driverMobile: string;

  agent: string;
};

// Safely parse "dd-mm-yyyy" (PHP style) into Date, with fallbacks
function parseRouteDate(routeDate: string | null | undefined): Date {
  if (!routeDate) return new Date();

  const parts = routeDate.split("-");
  if (parts.length === 3) {
    const [ddStr, mmStr, yyyyStr] = parts;
    const dd = Number(ddStr);
    const mm = Number(mmStr);
    const yyyy = Number(yyyyStr);

    if (
      Number.isFinite(dd) &&
      Number.isFinite(mm) &&
      Number.isFinite(yyyy) &&
      dd > 0 &&
      dd <= 31 &&
      mm > 0 &&
      mm <= 12
    ) {
      const d = new Date(yyyy, mm - 1, dd);
      if (!Number.isNaN(d.getTime())) return d;
    }
  }

  // Fallback: let JS try to parse whatever came
  const fallback = new Date(routeDate);
  if (!Number.isNaN(fallback.getTime())) return fallback;

  return new Date();
}

// Map a raw API row into a UI-friendly row (used by list + DayView header)
export function mapDailyMomentApiRowToListRow(
  apiRow: DailyMomentApiRow
): DailyMomentListRow {
  return {
    itineraryPlanId: apiRow.itinerary_plan_ID,
    itineraryRouteId: apiRow.itinerary_route_ID,

    guestName: apiRow.guest_name ?? "",
    guestMobile: apiRow.guest_mobile ?? null,
    guestEmail: apiRow.guest_email ?? null,

    travelExpert: apiRow.travel_expert_name ?? "",
    travelExpertMobile: apiRow.travel_expert_mobile ?? null,
    travelExpertEmail: apiRow.travel_expert_email ?? null,

    quoteId: apiRow.quote_id ?? "",
    routeDate: parseRouteDate(apiRow.route_date),
    type: apiRow.trip_type ?? "Ongoing",

    fromLocation: apiRow.location_name ?? "",
    toLocation: apiRow.next_visiting_location ?? "",

    hotel: apiRow.hotel_name ?? "",
    vendor: apiRow.vendor_name ?? "",
    vehicle: apiRow.vehicle_type_title ?? "",
    vehicleNo: apiRow.vehicle_no ?? "",

    driverName: apiRow.driver_name ?? "",
    driverMobile: apiRow.driver_mobile ?? "",

    agent: apiRow.agent_name ?? "",
  };
}

// Convenience helper if you want to map an entire list at once
export function mapDailyMomentApiRowsToListRows(
  apiRows: DailyMomentApiRow[]
): DailyMomentListRow[] {
  return apiRows.map(mapDailyMomentApiRowToListRow);
}

// Optional convenience: fetch + map in one call (non-breaking addition)
export async function fetchDailyMomentList(params: {
  fromDate: string; // DD-MM-YYYY
  toDate: string; // DD-MM-YYYY
  itineraryPlanId?: number;
  agentId?: number;
}): Promise<DailyMomentListRow[]> {
  const raw = await fetchDailyMoments(params);
  return mapDailyMomentApiRowsToListRows(raw);
}

// Charges DTO (extra charges form via car icon)
export type DailyMomentCharge = {
  driver_charge_ID: number;
  itinerary_plan_ID: number;
  itinerary_route_ID: number;
  charge_type: string;
  charge_amount: number;
};

// Vite-style base URL with localhost fallback for local parity testing
const API_BASE_URL = (
  (import.meta as any).env?.VITE_API_DVI_BASE_URL || "http://localhost:4006"
)
  .toString()
  .replace(/\/+$/, "");

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

/**
 * Fetch list of Daily Moments between fromDate and toDate.
 * fromDate / toDate are expected in DD-MM-YYYY format (same as PHP UI).
 * (Existing behaviour preserved – still returns raw DailyMomentApiRow[])
 */
export async function fetchDailyMoments(params: {
  fromDate: string; // DD-MM-YYYY
  toDate: string; // DD-MM-YYYY
  itineraryPlanId?: number;
  agentId?: number;
}): Promise<DailyMomentApiRow[]> {
  const search = new URLSearchParams();

  if (params.fromDate.trim()) {
    search.set("fromDate", params.fromDate.trim());
  }
  if (params.toDate.trim()) {
    search.set("toDate", params.toDate.trim());
  }
  if (params.itineraryPlanId) {
    search.set("itineraryPlanId", String(params.itineraryPlanId));
  }
  if (params.agentId) {
    search.set("agentId", String(params.agentId));
  }

  // include global prefix /api/v1 from main.ts
  const url = `${API_BASE_URL}/api/v1/daily-moment-tracker?${search.toString()}`;

  const res = await fetch(url, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      ...getAuthHeaders(),
    },
  });

  if (!res.ok) {
    console.error(
      "Failed to fetch daily moments",
      res.status,
      await safeReadText(res)
    );
    throw new Error("Failed to fetch daily moments");
  }

  const data = (await res.json()) as DailyMomentApiRow[];
  return data;
}

/**
 * Fetch extra charges for a given itinerary plan + route
 * (used by car icon popup).
 */
export async function fetchDailyMomentCharges(
  itineraryPlanId: number,
  itineraryRouteId: number
): Promise<DailyMomentCharge[]> {
  const search = new URLSearchParams();
  search.set("itineraryPlanId", String(itineraryPlanId));
  search.set("itineraryRouteId", String(itineraryRouteId));

  const url = `${API_BASE_URL}/api/v1/daily-moment-tracker/charges?${search.toString()}`;

  const res = await fetch(url, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      ...getAuthHeaders(),
    },
  });

  if (!res.ok) {
    console.error(
      "Failed to fetch daily moment charges",
      res.status,
      await safeReadText(res)
    );
    throw new Error("Failed to fetch daily moment charges");
  }

  const data = (await res.json()) as DailyMomentCharge[];
  return data;
}

/**
 * Create / update an extra charge row for Daily Moment.
 * Matches UpsertDailyMomentChargeDto on the backend.
 */
export async function upsertDailyMomentCharge(payload: {
  driverChargeId?: number;
  itineraryPlanId: number;
  itineraryRouteId: number;
  chargeType: string;
  chargeAmount: number;
}): Promise<DailyMomentCharge> {
  const body = {
    driverChargeId: payload.driverChargeId ?? null,
    itineraryPlanId: payload.itineraryPlanId,
    itineraryRouteId: payload.itineraryRouteId,
    chargeType: payload.chargeType,
    chargeAmount: payload.chargeAmount,
  };

  const url = `${API_BASE_URL}/api/v1/daily-moment-tracker/charges`;

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...getAuthHeaders(),
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    console.error(
      "Failed to save daily moment charge",
      res.status,
      await safeReadText(res)
    );
    throw new Error("Failed to save daily moment charge");
  }

  const data = (await res.json()) as DailyMomentCharge;
  return data;
}

// Small helper to safely read text for logging
async function safeReadText(res: Response): Promise<string> {
  try {
    return await res.text();
  } catch {
    return "";
  }
}

// ─── Day-View types ───────────────────────────────────────────────────────────

export type DayViewHotspot = {
  serial_no: number;
  confirmed_route_hotspot_ID: number;
  route_hotspot_ID: number;
  itinerary_plan_ID: number;
  itinerary_route_ID: number;
  hotspot_ID: number;
  item_type: number; // 4=hotspot,6=hotel,7=travel
  hotspot_name: string;
  hotspot_location: string;
  start_time: string;
  end_time: string;
  duration_minutes: number;
  duration_label: string;
  driver_hotspot_status: number; // 0=pending,1=visited,2=not-visited
  driver_not_visited_description: string | null;
  guide_hotspot_status: number;
  guide_not_visited_description: string | null;
  activities?: DayViewActivity[];
};

export type DayViewActivity = {
  confirmed_route_activity_ID: number;
  route_activity_ID: number;
  route_hotspot_ID: number;
  hotspot_ID: number;
  activity_ID: number;
  activity_title: string;
  driver_activity_status: number;
  driver_not_visited_description: string | null;
  guide_activity_status: number;
  guide_not_visited_description: string | null;
};

export type DayViewGuide = {
  confirmed_route_guide_ID: number;
  guide_id: number;
  guide_name: string;
  guide_type: number;
  driver_guide_status: number;
  driver_not_visited_description: string | null;
};

export type DayViewDay = {
  day_number: number;
  itinerary_route_ID: number;
  confirmed_itinerary_route_ID?: number;
  route_date: string; // DD-MM-YYYY
  from_location: string;
  to_location: string;
  km: {
    opening_km: string;
    closing_km: string;
    opening_speedmeter_image?: string | null;
    closing_speedmeter_image?: string | null;
    running_km: number;
    completed: boolean;
  };
  trip_type: TripType;
  arrival_flight_details: string;
  departure_flight_details: string;
  hotel_name: string;
  vehicle_type_title: string;
  vendor_name: string;
  meal_plan: string;
  vehicle_no: string;
  driver_name: string;
  driver_mobile: string;
  agent_name: string;
  special_remarks: string;
  wholeday_guide: DayViewGuide | null;
  guides: DayViewGuide[];
  hotspots: DayViewHotspot[];
};

export type DayViewPlan = {
  itinerary_plan_ID: number;
  quote_id: string;
  trip_start_date: string;
  trip_end_date: string;
  no_of_days: number;
  no_of_nights: number;
  arrival_location: string;
  departure_location: string;
  guest_name: string;
  guest_mobile: string;
  guest_email: string;
  travel_expert_name: string;
  travel_expert_mobile: string;
  travel_expert_email: string;
  days: DayViewDay[];
};

// ─── Day-View fetch ───────────────────────────────────────────────────────────

export async function fetchDayView(planId: number): Promise<DayViewPlan> {
  const url = `${API_BASE_URL}/api/v1/daily-moment-tracker/day-view/${planId}`;
  const res = await fetch(url, { headers: { ...getAuthHeaders() } });
  if (!res.ok) {
    throw new Error(`Failed to load day view: ${res.status} ${await safeReadText(res)}`);
  }
  return res.json();
}

// ─── Hotspot status update ────────────────────────────────────────────────────

export async function updateHotspotStatus(payload: {
  confirmedRouteHotspotId: number;
  status: number;
  description?: string;
  perspective?: "driver" | "guide";
}): Promise<void> {
  const endpoint = payload.perspective === "guide" ? "guide-hotspot-status" : "hotspot-status";
  const url = `${API_BASE_URL}/api/v1/daily-moment-tracker/${endpoint}`;
  const res = await fetch(url, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", ...getAuthHeaders() },
    body: JSON.stringify({
      confirmedRouteHotspotId: payload.confirmedRouteHotspotId,
      status: payload.status,
      description: payload.description ?? "",
    }),
  });
  if (!res.ok) throw new Error(`Failed to update hotspot status: ${res.status}`);
}

export async function updateActivityStatus(payload: {
  confirmedRouteActivityId: number;
  status: number;
  description?: string;
  perspective?: "driver" | "guide";
}): Promise<void> {
  const endpoint = payload.perspective === "guide" ? "guide-activity-status" : "activity-status";
  const url = `${API_BASE_URL}/api/v1/daily-moment-tracker/${endpoint}`;
  const res = await fetch(url, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", ...getAuthHeaders() },
    body: JSON.stringify({
      confirmedRouteActivityId: payload.confirmedRouteActivityId,
      status: payload.status,
      description: payload.description ?? "",
    }),
  });
  if (!res.ok) throw new Error(`Failed to update activity status: ${res.status}`);
}

// ─── Guide status update ──────────────────────────────────────────────────────

export async function updateGuideStatus(payload: {
  confirmedRouteGuideId: number;
  status: number;
  description?: string;
}): Promise<void> {
  const url = `${API_BASE_URL}/api/v1/daily-moment-tracker/guide-status`;
  const res = await fetch(url, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", ...getAuthHeaders() },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(`Failed to update guide status: ${res.status}`);
}

export async function updateWholedayGuideStatus(payload: {
  confirmedItineraryRouteId: number;
  status: number;
  description?: string;
}): Promise<void> {
  const url = `${API_BASE_URL}/api/v1/daily-moment-tracker/wholeday-guide-status`;
  const res = await fetch(url, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", ...getAuthHeaders() },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(`Failed to update wholeday guide status: ${res.status}`);
}

// ─── Delete charge ────────────────────────────────────────────────────────────

export async function deleteDailyMomentCharge(driverChargeId: number): Promise<void> {
  const url = `${API_BASE_URL}/api/v1/daily-moment-tracker/charges/${driverChargeId}`;
  const res = await fetch(url, { method: "DELETE", headers: getAuthHeaders() });
  if (!res.ok) throw new Error(`Failed to delete charge: ${res.status}`);
}

// ─── Driver rating CRUD ───────────────────────────────────────────────────────

export async function upsertDriverRating(payload: {
  driverFeedbackId?: number;
  itineraryPlanId: number;
  itineraryRouteId: number;
  customerRating: number;
  feedbackDescription?: string;
}): Promise<{ driver_feedback_ID: number }> {
  const url = `${API_BASE_URL}/api/v1/daily-moment-tracker/driver-ratings`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...getAuthHeaders() },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(`Failed to save driver rating: ${res.status}`);
  return res.json();
}

export async function deleteDriverRating(driverFeedbackId: number): Promise<void> {
  const url = `${API_BASE_URL}/api/v1/daily-moment-tracker/driver-ratings/${driverFeedbackId}`;
  const res = await fetch(url, { method: "DELETE", headers: getAuthHeaders() });
  if (!res.ok) throw new Error(`Failed to delete driver rating: ${res.status}`);
}

export async function fetchDriverRatings(itineraryPlanId: number): Promise<any[]> {
  const url = `${API_BASE_URL}/api/v1/daily-moment-tracker/driver-ratings?itineraryPlanId=${itineraryPlanId}`;
  const res = await fetch(url, { headers: getAuthHeaders() });
  if (!res.ok) throw new Error(`Failed to fetch driver ratings: ${res.status}`);
  return res.json();
}

export async function fetchGuideRatings(itineraryPlanId: number): Promise<any[]> {
  const url = `${API_BASE_URL}/api/v1/daily-moment-tracker/guide-ratings?itineraryPlanId=${itineraryPlanId}`;
  const res = await fetch(url, { headers: getAuthHeaders() });
  if (!res.ok) throw new Error(`Failed to fetch guide ratings: ${res.status}`);
  return res.json();
}

// ─── Guide rating ─────────────────────────────────────────────────────────────

export async function upsertGuideRating(payload: {
  guideReviewId?: number;
  itineraryPlanId: number;
  itineraryRouteId: number;
  guideId?: number;
  guideRating: number;
  guideDescription?: string;
}): Promise<{ guide_review_id: number }> {
  const url = `${API_BASE_URL}/api/v1/daily-moment-tracker/guide-ratings`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...getAuthHeaders() },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(`Failed to save guide rating: ${res.status}`);
  return res.json();
}

export async function deleteGuideRating(guideReviewId: number): Promise<void> {
  const url = `${API_BASE_URL}/api/v1/daily-moment-tracker/guide-ratings/${guideReviewId}`;
  const res = await fetch(url, { method: "DELETE", headers: getAuthHeaders() });
  if (!res.ok) throw new Error(`Failed to delete guide rating: ${res.status}`);
}

// ─── Kilometer ────────────────────────────────────────────────────────────────

export async function saveOpeningKm(payload: {
  itineraryPlanId: number;
  itineraryRouteId: number;
  startingKilometer: string;
}): Promise<void> {
  const url = `${API_BASE_URL}/api/v1/daily-moment-tracker/kilometer/opening`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...getAuthHeaders() },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const text = await safeReadText(res);
    throw new Error(text || `Failed to save opening KM: ${res.status}`);
  }
}

export async function saveClosingKm(payload: {
  itineraryPlanId: number;
  itineraryRouteId: number;
  closingKilometer: string;
}): Promise<void> {
  const url = `${API_BASE_URL}/api/v1/daily-moment-tracker/kilometer/closing`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...getAuthHeaders() },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const text = await safeReadText(res);
    throw new Error(text || `Failed to save closing KM: ${res.status}`);
  }
}

export async function uploadDayImages(payload: {
  itineraryPlanId: number;
  itineraryRouteId: number;
  files: File[];
  createdby?: number;
}): Promise<{ count: number; files: string[]; ids: number[] }> {
  const url = `${API_BASE_URL}/api/v1/daily-moment-tracker/day-images`;
  const fd = new FormData();
  fd.append('itineraryPlanId', String(payload.itineraryPlanId));
  fd.append('itineraryRouteId', String(payload.itineraryRouteId));
  if (payload.createdby != null) fd.append('createdby', String(payload.createdby));
  payload.files.forEach((f) => fd.append('images', f));
  const res = await fetch(url, {
    method: 'POST',
    headers: { ...getAuthHeaders() }, // no Content-Type — browser sets multipart boundary
    body: fd,
  });
  if (!res.ok) {
    const text = await safeReadText(res);
    throw new Error(text || `Failed to upload images: ${res.status}`);
  }
  return res.json();
}

export async function uploadOpeningSpeedometerImage(payload: {
  itineraryPlanId: number;
  itineraryRouteId: number;
  file: File;
}): Promise<{ file: string }> {
  const url = `${API_BASE_URL}/api/v1/daily-moment-tracker/kilometer/opening-image`;
  const fd = new FormData();
  fd.append("itineraryPlanId", String(payload.itineraryPlanId));
  fd.append("itineraryRouteId", String(payload.itineraryRouteId));
  fd.append("image", payload.file);
  const res = await fetch(url, {
    method: "POST",
    headers: { ...getAuthHeaders() },
    body: fd,
  });
  if (!res.ok) {
    const text = await safeReadText(res);
    throw new Error(text || `Failed to upload opening speedometer image: ${res.status}`);
  }
  return res.json();
}

export async function uploadClosingSpeedometerImage(payload: {
  itineraryPlanId: number;
  itineraryRouteId: number;
  file: File;
}): Promise<{ file: string }> {
  const url = `${API_BASE_URL}/api/v1/daily-moment-tracker/kilometer/closing-image`;
  const fd = new FormData();
  fd.append("itineraryPlanId", String(payload.itineraryPlanId));
  fd.append("itineraryRouteId", String(payload.itineraryRouteId));
  fd.append("image", payload.file);
  const res = await fetch(url, {
    method: "POST",
    headers: { ...getAuthHeaders() },
    body: fd,
  });
  if (!res.ok) {
    const text = await safeReadText(res);
    throw new Error(text || `Failed to upload closing speedometer image: ${res.status}`);
  }
  return res.json();
}
