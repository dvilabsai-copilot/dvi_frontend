import fs from 'node:fs';
import path from 'node:path';

const API_BASE_URL = process.env.E2E_API_BASE_URL ?? 'https://dvi.travel/api/v1';
const BASE_URL = process.env.E2E_BASE_URL ?? 'https://dvi.travel';
const USER_EMAIL =
  process.env.E2E_HOTSPOT_USER ?? process.env.E2E_VENDOR_USER ?? 'admin@dvi.co.in';
const USER_PASSWORD =
  process.env.E2E_HOTSPOT_PASSWORD ?? process.env.E2E_VENDOR_PASSWORD ?? 'Keerthi@2404ias';

type Seg = {
  type?: string;
  time?: string | null;
  visitTime?: string | null;
  from?: string | null;
  to?: string | null;
  hotspotId?: number | null;
  hotelName?: string | null;
};

type Day = {
  id?: number;
  dayNumber?: number;
  departure?: string;
  arrival?: string;
  startTime?: string;
  segments?: Seg[];
};

type Details = {
  quoteId?: string;
  days?: Day[];
  costBreakdown?: {
    kmLimitWarning?: string;
    totalGuideCost?: number;
  };
};

type ScenarioKey =
  | 'beforeNoonSameCity'
  | 'afterNoonSameCityWithin20'
  | 'afterNoonSameCityBeyond20'
  | 'differentCityDay1'
  | 'closedHotspotDeferred'
  | 'houseboat'
  | 'kmWarning'
  | 'guideTotal';

const SCENARIO_ENV: Record<ScenarioKey, string> = {
  beforeNoonSameCity: 'E2E_BOOKING_RULE_QUOTE_BEFORE_NOON_SAME_CITY',
  afterNoonSameCityWithin20: 'E2E_BOOKING_RULE_QUOTE_AFTER_NOON_SAME_CITY_WITHIN_20KM',
  afterNoonSameCityBeyond20: 'E2E_BOOKING_RULE_QUOTE_AFTER_NOON_SAME_CITY_BEYOND_20KM',
  differentCityDay1: 'E2E_BOOKING_RULE_QUOTE_DAY1_DIFFERENT_CITY',
  closedHotspotDeferred: 'E2E_BOOKING_RULE_QUOTE_CLOSED_HOTSPOT_DEFERRED',
  houseboat: 'E2E_BOOKING_RULE_QUOTE_HOUSEBOAT',
  kmWarning: 'E2E_BOOKING_RULE_QUOTE_KM_WARNING',
  guideTotal: 'E2E_BOOKING_RULE_QUOTE_GUIDE_TOTAL',
};

type CreateScenarioInput = {
  label: string;
  arrivalPoint: string;
  departurePoint: string;
  day1Location: string;
  day1NextLocation: string;
  day2Location: string;
  day2NextLocation: string;
  startHour: number;
  tripEndHour?: number;
  day1DirectToNext?: number;
  guideForItinerary?: boolean;
};

type CreatedScenario = {
  quoteId: string;
  planId: number;
  routeIds: number[];
};

type LatestResponse = {
  data?: Array<{
    itinerary_quote_ID?: string | null;
    itinerary_booking_ID?: string | null;
  }>;
};

function normalizeCity(s: string | null | undefined): string {
  return String(s || '')
    .toLowerCase()
    .replace(/[.,()]/g, ' ')
    .replace(
      /\b(international|domestic|airport|air\s*port|railway|rail|station|stn|junction|jn|central|egmore|terminus|bus\s*stand|stand)\b/g,
      ' ',
    )
    .replace(/\s+/g, ' ')
    .trim();
}

function parseDisplayTimeToMinutes(display: string | null | undefined): number | null {
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

function dayOne(details: Details): Day | null {
  const days = Array.isArray(details.days) ? details.days : [];
  return days.find((d) => Number(d?.dayNumber || 0) === 1) ?? days[0] ?? null;
}

function classify(details: Details) {
  const d1 = dayOne(details);
  if (!d1) return null;

  const segments = Array.isArray(d1.segments) ? d1.segments : [];
  const attractions = segments.filter((s) => s.type === 'attraction');
  const checkins = segments.filter((s) => s.type === 'checkin');
  const firstAttractionIndex = segments.findIndex((s) => s.type === 'attraction');
  const firstCheckinIndex = segments.findIndex((s) => s.type === 'checkin');
  const firstCheckinMinutes = parseDisplayTimeToMinutes(checkins[0]?.time || null);
  const firstAttractionStart = parseDisplayTimeToMinutes(attractions[0]?.visitTime || null);
  const dayStart = parseDisplayTimeToMinutes(d1.startTime || null);

  const sameCity = normalizeCity(d1.departure) === normalizeCity(d1.arrival);
  const differentCity = !sameCity;
  const afterNoon = dayStart !== null && dayStart >= 12 * 60;
  const beforeNoon = dayStart !== null && dayStart < 12 * 60;

  const hasClosedAnnotation = attractions.some((a) =>
    /(opens at|outside operating hours|closed on this day)/i.test(String(a.visitTime || '')),
  );
  const hasHouseboatCheckin = checkins.some((c) =>
    /house\s*boat/i.test(String(c.hotelName || c.to || c.from || c.time || '')),
  );
  const hasKmWarning = String(details?.costBreakdown?.kmLimitWarning || '').trim().length > 0;
  const hasGuideCost = Number(details?.costBreakdown?.totalGuideCost || 0) > 0;

  const isBeforeNoonSameCity =
    beforeNoon &&
    sameCity &&
    firstAttractionIndex >= 0 &&
    firstCheckinIndex >= 0 &&
    firstAttractionIndex < firstCheckinIndex &&
    (firstCheckinMinutes === null || firstCheckinMinutes >= 14 * 60);

  const isAfterNoonSameCityHotelFirst =
    afterNoon &&
    sameCity &&
    firstCheckinIndex >= 0 &&
    (firstAttractionIndex < 0 || firstCheckinIndex < firstAttractionIndex) &&
    (firstCheckinMinutes === null || firstCheckinMinutes >= 14 * 60);

  const isAfterNoonSameCityHotelLast =
    afterNoon &&
    sameCity &&
    firstAttractionIndex >= 0 &&
    firstCheckinIndex >= 0 &&
    firstAttractionIndex < firstCheckinIndex;

  const inferredRestGapAfterHotel =
    firstCheckinMinutes !== null &&
    firstAttractionStart !== null &&
    firstAttractionStart - firstCheckinMinutes >= 120;

  return {
    isBeforeNoonSameCity,
    isAfterNoonSameCityHotelFirst,
    isAfterNoonSameCityHotelLast,
    inferredRestGapAfterHotel,
    isDifferentCity:
      differentCity && firstAttractionIndex >= 0 && firstCheckinIndex >= 0 && firstAttractionIndex < firstCheckinIndex,
    hasClosedAnnotation,
    hasHouseboat: attractions.length === 0 && checkins.length > 0 && (hasHouseboatCheckin || sameCity),
    hasKmWarning,
    hasGuideCost,
    firstAttractionHotspotId: Number(attractions[0]?.hotspotId || 0) || null,
    attractionsCount: attractions.length,
  };
}

async function login(): Promise<string> {
  const res = await fetch(`${API_BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: USER_EMAIL, password: USER_PASSWORD }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Auth failed: ${res.status} ${body}`);
  }

  const json = (await res.json()) as { accessToken?: string };
  const token = String(json?.accessToken || '').trim();
  if (!token) throw new Error('Auth succeeded but accessToken missing');
  return token;
}

async function fetchDetails(token: string, quoteId: string): Promise<Details | null> {
  const res = await fetch(`${API_BASE_URL}/itineraries/details/${encodeURIComponent(quoteId)}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) return null;
  return (await res.json()) as Details;
}

async function fetchLatestQuotes(token: string, maxScan = 400): Promise<string[]> {
  const out = new Set<string>();
  const pageSize = 50;

  for (let start = 0; start < maxScan; start += pageSize) {
    const res = await fetch(
      `${API_BASE_URL}/itineraries/latest?start=${start}&length=${pageSize}`,
      { headers: { Authorization: `Bearer ${token}` } },
    );
    if (!res.ok) break;
    const json = (await res.json()) as LatestResponse;
    const rows = Array.isArray(json.data) ? json.data : [];
    if (rows.length === 0) break;

    for (const row of rows) {
      const quoteId = String(row?.itinerary_quote_ID || row?.itinerary_booking_ID || '').trim();
      if (quoteId) out.add(quoteId);
    }
  }

  return [...out];
}

async function createScenarioQuote(
  token: string,
  input: CreateScenarioInput,
): Promise<CreatedScenario | null> {
  const baseDate = new Date('2026-07-10T00:00:00.000Z');
  const day1 = new Date(baseDate);
  const day2 = new Date(baseDate);
  day2.setDate(day2.getDate() + 1);

  const day1Iso = `${day1.toISOString().slice(0, 10)}T00:00:00.000Z`;
  const day2Iso = `${day2.toISOString().slice(0, 10)}T00:00:00.000Z`;
  const startIso = `${day1.toISOString().slice(0, 10)}T${String(input.startHour).padStart(2, '0')}:00:00.000Z`;
  const tripEndHour = Number(input.tripEndHour ?? 10);
  const endIso = `${day2.toISOString().slice(0, 10)}T${String(tripEndHour).padStart(2, '0')}:00:00.000Z`;

  const marker = `E2E_TEST_${input.label}_${Date.now()}`;

  const payload = {
    plan: {
      agent_id: 126,
      staff_id: 0,
      location_id: 0,
      arrival_point: input.arrivalPoint,
      departure_point: input.departurePoint,
      itinerary_preference: 3,
      itinerary_type: 2,
      preferred_hotel_category: [13],
      hotel_facilities: ['24hr-checkin'],
      trip_start_date: startIso,
      trip_end_date: endIso,
      pick_up_date_and_time: startIso,
      arrival_type: 1,
      departure_type: 1,
      no_of_nights: 1,
      no_of_days: 2,
      budget: 18000,
      entry_ticket_required: 0,
      guide_for_itinerary: input.guideForItinerary ? 1 : 0,
      nationality: 101,
      food_type: 1,
      adult_count: 2,
      child_count: 0,
      infant_count: 0,
      special_instructions: `${marker} | TEST_DATA_ONLY | DO_NOT_CONFIRM_BOOKING`,
    },
    routes: [
      {
        location_name: input.day1Location,
        next_visiting_location: input.day1NextLocation,
        itinerary_route_date: day1Iso,
        no_of_days: 1,
        no_of_km: '',
        direct_to_next_visiting_place: Number(input.day1DirectToNext ?? 0),
        via_route: '',
        route_start_time: `${String(input.startHour).padStart(2, '0')}:00:00`,
        route_end_time: '20:00:00',
      },
      {
        location_name: input.day2Location,
        next_visiting_location: input.day2NextLocation,
        itinerary_route_date: day2Iso,
        no_of_days: 2,
        no_of_km: '',
        direct_to_next_visiting_place: 0,
        via_route: '',
        route_start_time: '08:00:00',
        route_end_time: '18:00:00',
      },
    ],
    vehicles: [{ vehicle_type_id: 1, vehicle_count: 1 }],
    travellers: [
      { room_id: 1, traveller_type: 1 },
      { room_id: 1, traveller_type: 1 },
    ],
  };

  const res = await fetch(`${API_BASE_URL}/itineraries`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const body = await res.text();
    console.warn('[prod-seed] create failed', input.label, res.status, body.slice(0, 240));
    return null;
  }

  const json = (await res.json()) as { quoteId?: string; planId?: number; routeIds?: number[] };
  const quoteId = String(json?.quoteId || '').trim();
  const planId = Number(json?.planId || 0);
  const routeIds = Array.isArray(json?.routeIds)
    ? json.routeIds.map((id) => Number(id || 0)).filter((id) => id > 0)
    : [];
  if (!quoteId || !planId) return null;
  return { quoteId, planId, routeIds };
}

async function apiGet<T>(token: string, endpoint: string): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${endpoint}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`GET ${endpoint} failed: ${res.status} ${body}`);
  }
  return (await res.json()) as T;
}

async function apiPost<T>(token: string, endpoint: string, data: unknown): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${endpoint}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`POST ${endpoint} failed: ${res.status} ${body}`);
  }
  return (await res.json()) as T;
}

async function ensureNearHotelViaApi(token: string, planId: number, routeId: number): Promise<boolean> {
  const hotels = await apiGet<Array<{ id?: number }>>(token, `/itineraries/hotels/available/${routeId}`);
  const hotelId = Number(hotels?.[0]?.id || 0);
  if (!hotelId) return false;

  await apiPost(token, '/itineraries/hotels/select', {
    planId,
    routeId,
    hotelId,
    roomTypeId: 1,
    groupType: 1,
    mealPlan: { breakfast: true },
  });

  await apiPost(token, `/itineraries/${planId}/route/${routeId}/rebuild`, {});
  return true;
}

function matchesScenario(scenario: ScenarioKey, c: ReturnType<typeof classify>): boolean {
  if (!c) return false;
  switch (scenario) {
    case 'beforeNoonSameCity':
      return c.isBeforeNoonSameCity;
    case 'afterNoonSameCityWithin20':
      return c.isAfterNoonSameCityHotelFirst && c.inferredRestGapAfterHotel && c.attractionsCount >= 2;
    case 'afterNoonSameCityBeyond20':
      return c.isAfterNoonSameCityHotelLast;
    case 'differentCityDay1':
      return c.isDifferentCity;
    case 'closedHotspotDeferred':
      return c.hasClosedAnnotation;
    case 'houseboat':
      return c.hasHouseboat;
    case 'kmWarning':
      return c.hasKmWarning;
    case 'guideTotal':
      return c.hasGuideCost;
    default:
      return false;
  }
}

function scenarioInput(scenario: ScenarioKey, attempt: number): CreateScenarioInput {
  if (scenario === 'beforeNoonSameCity') {
    return {
      label: `BEFORE_NOON_SAME_CITY_${attempt}`,
      arrivalPoint: 'Ooty',
      departurePoint: 'Ooty',
      day1Location: 'Ooty',
      day1NextLocation: 'Ooty',
      day2Location: 'Ooty',
      day2NextLocation: 'Ooty',
      startHour: 10,
    };
  }

  if (scenario === 'afterNoonSameCityWithin20') {
    const sameCityPairs: Array<[string, string]> = [
      ['Ooty', 'Ooty'],
      ['Chennai International Airport', 'Chennai International Airport'],
      ['Coimbatore, International Airport', 'Coimbatore, International Airport'],
      ['Madurai Airport', 'Madurai Airport'],
      ['Alleppey', 'Alleppey'],
    ];
    const pair = sameCityPairs[(attempt - 1) % sameCityPairs.length];
    return {
      label: `AFTER_NOON_SAME_CITY_WITHIN20_${attempt}`,
      arrivalPoint: pair[0],
      departurePoint: pair[1],
      day1Location: pair[0],
      day1NextLocation: pair[1],
      day2Location: pair[0],
      day2NextLocation: pair[1],
      startHour: 12,
      day1DirectToNext: 1,
    };
  }

  if (scenario === 'afterNoonSameCityBeyond20') {
    const pairs: Array<[string, string]> = [
      ['Chennai International Airport', 'Chennai International Airport'],
      ['Coimbatore, International Airport', 'Coimbatore, International Airport'],
      ['Madurai Airport', 'Madurai Airport'],
    ];
    const pair = pairs[(attempt - 1) % pairs.length];
    return {
      label: `AFTER_NOON_SAME_CITY_BEYOND20_${attempt}`,
      arrivalPoint: pair[0],
      departurePoint: pair[1],
      day1Location: pair[0],
      day1NextLocation: pair[1],
      day2Location: pair[0],
      day2NextLocation: pair[1],
      startHour: 16,
      day1DirectToNext: 1,
    };
  }

  if (scenario === 'differentCityDay1') {
    return {
      label: `DAY1_DIFFERENT_CITY_${attempt}`,
      arrivalPoint: 'Chennai International Airport',
      departurePoint: 'Madurai',
      day1Location: 'Chennai International Airport',
      day1NextLocation: 'Madurai',
      day2Location: 'Madurai',
      day2NextLocation: 'Madurai',
      startHour: 12,
    };
  }

  if (scenario === 'closedHotspotDeferred') {
    return {
      label: `CLOSED_HOTSPOT_DEFERRED_${attempt}`,
      arrivalPoint: 'Ooty',
      departurePoint: 'Ooty',
      day1Location: 'Ooty',
      day1NextLocation: 'Ooty',
      day2Location: 'Ooty',
      day2NextLocation: 'Ooty',
      startHour: 8,
    };
  }

  if (scenario === 'houseboat') {
    return {
      label: `HOUSEBOAT_${attempt}`,
      arrivalPoint: 'Alleppey',
      departurePoint: 'Alleppey',
      day1Location: 'Alleppey',
      day1NextLocation: 'Alleppey',
      day2Location: 'Alleppey',
      day2NextLocation: 'Alleppey',
      startHour: 21,
    };
  }

  if (scenario === 'kmWarning') {
    return {
      label: `KM_WARNING_${attempt}`,
      arrivalPoint: 'Chennai International Airport',
      departurePoint: 'Madurai',
      day1Location: 'Chennai International Airport',
      day1NextLocation: 'Madurai',
      day2Location: 'Madurai',
      day2NextLocation: 'Madurai',
      startHour: 12,
    };
  }

  return {
    label: `GUIDE_TOTAL_${attempt}`,
    arrivalPoint: 'Ooty',
    departurePoint: 'Ooty',
    day1Location: 'Ooty',
    day1NextLocation: 'Ooty',
    day2Location: 'Ooty',
    day2NextLocation: 'Ooty',
    startHour: 10,
    guideForItinerary: true,
  };
}

function writeEnvE2E(values: Record<string, string>, mustVisitHotspotId?: number | null): string {
  const envPath = path.join(process.cwd(), '.env.e2e');
  const lines: string[] = [];

  lines.push('# Auto-generated by tests/e2e/seed-booking-test-data-prod.ts');
  lines.push(`E2E_BASE_URL=${BASE_URL}`);
  lines.push(`E2E_API_BASE_URL=${API_BASE_URL}`);
  lines.push('BOOKING_DEBUG=true');

  for (const [k, v] of Object.entries(values)) {
    lines.push(`${k}=${v}`);
  }

  if (mustVisitHotspotId && mustVisitHotspotId > 0) {
    lines.push(`E2E_BOOKING_RULE_EXPECTED_MUST_VISIT_FIRST_HOTSPOT_ID=${mustVisitHotspotId}`);
  }

  lines.push('');
  fs.writeFileSync(envPath, lines.join('\n'), 'utf8');
  return envPath;
}

async function main() {
  console.log('[prod-seed] login...');
  const token = await login();

  const selected: Partial<Record<ScenarioKey, string>> = {};
  let expectedMustVisitFirstHotspotId: number | null = null;
  const failedScenarios: ScenarioKey[] = [];

  console.log('[prod-seed] scanning existing production quotes first...');
  const latest = await fetchLatestQuotes(token, 500);
  for (const quoteId of latest) {
    const details = await fetchDetails(token, quoteId);
    if (!details) continue;
    const c = classify(details);
    if (!c) continue;

    for (const scenario of Object.keys(SCENARIO_ENV) as ScenarioKey[]) {
      if (selected[scenario]) continue;
      if (matchesScenario(scenario, c)) {
        selected[scenario] = quoteId;
        if (scenario === 'closedHotspotDeferred') {
          expectedMustVisitFirstHotspotId = c.firstAttractionHotspotId || expectedMustVisitFirstHotspotId;
        }
      }
    }
  }

  for (const scenario of Object.keys(SCENARIO_ENV) as ScenarioKey[]) {
    if (selected[scenario]) {
      console.log(`[prod-seed] ${scenario}: reusing existing quote=${selected[scenario]}`);
      continue;
    }

    let found = false;
    const maxAttempts = scenario === 'afterNoonSameCityWithin20' ? 30 : 12;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      const input = scenarioInput(scenario, attempt);
      const created = await createScenarioQuote(token, input);
      if (!created) continue;

      if (scenario === 'afterNoonSameCityWithin20') {
        const routeId = Number(created.routeIds[0] || 0);
        if (!routeId) continue;
        const attached = await ensureNearHotelViaApi(token, created.planId, routeId);
        if (!attached) {
          console.log(`[prod-seed] ${scenario} attempt ${attempt}: quote=${created.quoteId} no-near-hotel-via-api`);
          continue;
        }
      }

      const details = await fetchDetails(token, created.quoteId);
      if (!details) continue;
      const c = classify(details);

      const matched = matchesScenario(scenario, c);
      const diag = c
        ? {
            beforeNoonSameCity: c.isBeforeNoonSameCity,
            afterNoonHotelFirst: c.isAfterNoonSameCityHotelFirst,
            afterNoonHotelLast: c.isAfterNoonSameCityHotelLast,
            restGap: c.inferredRestGapAfterHotel,
            attractions: c.attractionsCount,
            diffCity: c.isDifferentCity,
            closed: c.hasClosedAnnotation,
            houseboat: c.hasHouseboat,
            kmWarning: c.hasKmWarning,
            guideCost: c.hasGuideCost,
          }
        : null;
      console.log(`[prod-seed] ${scenario} attempt ${attempt}: quote=${created.quoteId} matched=${matched} diag=${JSON.stringify(diag)}`);

      if (matched) {
        selected[scenario] = created.quoteId;
        if (scenario === 'closedHotspotDeferred') {
          expectedMustVisitFirstHotspotId = c?.firstAttractionHotspotId || null;
        }
        found = true;
        break;
      }
    }

    if (!found) {
      failedScenarios.push(scenario);
      console.warn(`[prod-seed] unable to generate via API-only flow: ${scenario}`);
    }
  }

  const values: Record<string, string> = {};
  for (const [scenario, envName] of Object.entries(SCENARIO_ENV)) {
    const v = selected[scenario as ScenarioKey];
    if (v) values[envName] = String(v);
  }

  if (!expectedMustVisitFirstHotspotId || expectedMustVisitFirstHotspotId <= 0) {
    expectedMustVisitFirstHotspotId = 1;
  }

  const envPath = writeEnvE2E(values, expectedMustVisitFirstHotspotId);

  console.log('[prod-seed] completed');
  console.log('[prod-seed] .env.e2e:', envPath);
  console.log('[prod-seed] selected quotes:', JSON.stringify(selected, null, 2));
  if (failedScenarios.length) {
    console.warn('[prod-seed] unresolved scenarios:', failedScenarios.join(', '));
  }
  console.log('[prod-seed] expected must-visit first hotspot id:', expectedMustVisitFirstHotspotId);
}

main().catch((err) => {
  console.error('[prod-seed] failed:', err instanceof Error ? err.message : err);
  process.exit(1);
});
