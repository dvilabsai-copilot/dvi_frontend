import { expect, type APIRequestContext } from '@playwright/test';

export const API_BASE_URL =
  process.env.E2E_API_BASE_URL ?? 'http://127.0.0.1:4006/api/v1';

const USER_EMAIL =
  process.env.E2E_HOTSPOT_USER ??
  process.env.E2E_VENDOR_USER ??
  'admin@dvi.co.in';
const USER_PASSWORD =
  process.env.E2E_HOTSPOT_PASSWORD ??
  process.env.E2E_VENDOR_PASSWORD ??
  'Keerthi@2404ias';

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

export async function seedAuthToken(storage: { addInitScript: Function }, request: APIRequestContext): Promise<string> {
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
