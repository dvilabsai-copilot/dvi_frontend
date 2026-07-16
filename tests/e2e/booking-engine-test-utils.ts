import { expect, type APIRequestContext, type Page } from '@playwright/test';

export const API_BASE_URL =
  process.env.E2E_API_BASE_URL!;

function plusDays(base: Date, days: number): Date {
  const result = new Date(base.getTime());
  result.setDate(result.getDate() + days);
  return result;
}

function formatIso0530(date: Date, hour: number, minute: number): string {
  const ymd = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  return `${ymd}T${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:00+05:30`;
}

export function buildMultiRoomBookingPayload(now = new Date()) {
  const day1 = plusDays(now, 4);
  const day2 = plusDays(now, 5);
  const day3 = plusDays(now, 6);
  const day4 = plusDays(now, 7);
  const route = (locationName: string, nextLocation: string, date: Date, km: number, dayNumber: number) => ({
    location_name: locationName,
    next_visiting_location: nextLocation,
    itinerary_route_date: formatIso0530(date, 0, 0),
    no_of_days: dayNumber,
    no_of_km: km,
    direct_to_next_visiting_place: 0,
    via_route: '',
    via_routes: [],
  });

  return {
    plan: {
      agent_id: 8,
      staff_id: 0,
      location_id: 0,
      arrival_point: 'Chennai International Airport',
      departure_point: 'Chennai International Airport',
      itinerary_preference: 3,
      itinerary_type: 2,
      preferred_hotel_category: [2],
      hotel_facilities: [],
      trip_start_date: formatIso0530(day1, 8, 0),
      trip_end_date: formatIso0530(day4, 20, 0),
      pick_up_date_and_time: formatIso0530(day1, 8, 0),
      arrival_type: 1,
      departure_type: 1,
      no_of_nights: 3,
      no_of_days: 4,
      budget: 20000,
      entry_ticket_required: 0,
      guide_for_itinerary: 0,
      nationality: 229,
      food_type: 0,
      meal_plan_code: 'CP',
      meal_plan_breakfast: 1,
      meal_plan_lunch: 0,
      meal_plan_dinner: 0,
      adult_count: 2,
      child_count: 1,
      infant_count: 0,
      special_instructions: 'PW_E2E multi-room booking contract',
    },
    routes: [
      route('Chennai International Airport', 'Chennai', day1, 16.61, 1),
      route('Chennai', 'Mahabalipuram', day2, 52.07, 2),
      route('Mahabalipuram', 'Pondicherry', day3, 86.57, 3),
      route('Pondicherry', 'Chennai International Airport', day4, 40.17, 4),
    ],
    vehicles: [{ vehicle_type_id: 1, vehicle_count: 1 }],
    travellers: [
      { room_id: 1, traveller_type: 1 },
      { room_id: 1, traveller_type: 2, traveller_age: '7', child_bed_type: 1 },
      { room_id: 2, traveller_type: 1 },
    ],
    previousDayBillingDecisionProvided: false,
    previousDayBillingConfirmed: false,
  };
}

const USER_EMAIL =
  process.env.E2E_ADMIN_EMAIL!;
const USER_PASSWORD =
  process.env.E2E_ADMIN_PASSWORD!;

export const SCENARIO_QUOTE_ENV = {
  beforeNoonSameCity: 'E2E_BOOKING_RULE_QUOTE_BEFORE_NOON_SAME_CITY',
  afterNoonSameCityWithin20: 'E2E_BOOKING_RULE_QUOTE_AFTER_NOON_SAME_CITY_WITHIN_20KM',
  afterNoonSameCityBeyond20: 'E2E_BOOKING_RULE_QUOTE_AFTER_NOON_SAME_CITY_BEYOND_20KM',
  differentCityDay1: 'E2E_BOOKING_RULE_QUOTE_DAY1_DIFFERENT_CITY',
  closedHotspotDeferred: 'E2E_BOOKING_RULE_QUOTE_CLOSED_HOTSPOT_DEFERRED',
  houseboat: 'E2E_BOOKING_RULE_QUOTE_HOUSEBOAT',
  kmWarning: 'E2E_BOOKING_RULE_QUOTE_KM_WARNING',
  guideTotal: 'E2E_BOOKING_RULE_QUOTE_GUIDE_TOTAL',
} as const;

export type ScenarioKey = keyof typeof SCENARIO_QUOTE_ENV;

export type ItinerarySegment = {
  type?: string;
  time?: string | null;
  timeRange?: string | null;
  visitTime?: string | null;
  from?: string | null;
  to?: string | null;
  hotspotId?: number | null;
  priority?: number | null;
};

export type ItineraryDay = {
  dayNumber?: number;
  segments?: ItinerarySegment[];
};

export type ItineraryDetailsResponse = {
  quoteId?: string;
  days?: ItineraryDay[];
  costBreakdown?: {
    totalGuideCost?: number;
    kmLimitWarning?: string;
    totalAllowedKm?: number;
    totalTravelledKm?: number;
    totalExtraKm?: number;
  };
};

export async function loginForToken(request: APIRequestContext): Promise<string> {
  const loginRes = await request.post(`${API_BASE_URL}/auth/login`, {
    data: { email: USER_EMAIL, password: USER_PASSWORD },
  });

  if (!loginRes.ok()) {
    const body = await loginRes.text().catch(() => '');
    throw new Error(`Auth login failed: status=${loginRes.status()} body=${body}`);
  }

  const json = (await loginRes.json()) as { accessToken?: string };
  const token = String(json?.accessToken || '').trim();
  if (!token) {
    throw new Error('Auth login succeeded but accessToken missing');
  }

  return token;
}

export async function seedAuthToken(storage: Pick<Page, 'addInitScript'>, request: APIRequestContext): Promise<string> {
  const token = await loginForToken(request);
  await storage.addInitScript((t: string) => {
    window.localStorage.setItem('accessToken', t);
  }, token);
  return token;
}

export async function fetchItineraryDetails(
  request: APIRequestContext,
  token: string,
  quoteId: string,
): Promise<ItineraryDetailsResponse> {
  const res = await request.get(`${API_BASE_URL}/itineraries/details/${encodeURIComponent(quoteId)}`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok()) {
    const body = await res.text().catch(() => '');
    throw new Error(`Itinerary details API failed: status=${res.status()} body=${body}`);
  }

  return (await res.json()) as ItineraryDetailsResponse;
}

export function scenarioQuoteId(key: ScenarioKey): string | null {
  const envName = SCENARIO_QUOTE_ENV[key];
  const value = String(process.env[envName] || '').trim();
  return value || null;
}

export function requireScenarioQuoteId(key: ScenarioKey): string {
  const quoteId = scenarioQuoteId(key);
  const envName = SCENARIO_QUOTE_ENV[key];
  expect(quoteId, `Set ${envName} to run this scenario`).toBeTruthy();
  return quoteId as string;
}

export function dayOne(details: ItineraryDetailsResponse): ItineraryDay {
  const days = Array.isArray(details.days) ? details.days : [];
  const firstDay = days.find((d) => Number(d?.dayNumber || 0) === 1) ?? days[0];
  expect(firstDay, 'Day 1 missing in itinerary details').toBeTruthy();
  return firstDay as ItineraryDay;
}

export function segmentsOf(day: ItineraryDay): ItinerarySegment[] {
  return Array.isArray(day.segments) ? day.segments : [];
}

export function parseDisplayTimeToMinutes(display: string | null | undefined): number | null {
  const source = String(display || '').trim();
  if (!source) return null;

  const match = source.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
  if (!match) return null;

  let hours = Number(match[1]);
  const minutes = Number(match[2]);
  const meridiem = String(match[3]).toUpperCase();

  if (Number.isNaN(hours) || Number.isNaN(minutes)) return null;
  if (meridiem === 'PM' && hours < 12) hours += 12;
  if (meridiem === 'AM' && hours === 12) hours = 0;

  return hours * 60 + minutes;
}

export function extractVisitStartMinutes(seg: ItinerarySegment): number | null {
  return parseDisplayTimeToMinutes(seg.visitTime || null);
}

export function findFirstIndex(
  segments: ItinerarySegment[],
  predicate: (segment: ItinerarySegment) => boolean,
): number {
  return segments.findIndex(predicate);
}

export function allAttractions(segments: ItinerarySegment[]): ItinerarySegment[] {
  return segments.filter((s) => s.type === 'attraction');
}

export function allCheckins(segments: ItinerarySegment[]): ItinerarySegment[] {
  return segments.filter((s) => s.type === 'checkin');
}
