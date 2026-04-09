import fs from 'node:fs';
import path from 'node:path';
import mysql from 'mysql2/promise';

const API_BASE_URL = process.env.E2E_API_BASE_URL ?? 'http://127.0.0.1:4006/api/v1';
const BASE_URL = process.env.E2E_BASE_URL ?? 'http://localhost:8080';
const USER_EMAIL =
  process.env.E2E_HOTSPOT_USER ?? process.env.E2E_VENDOR_USER ?? 'admin@dvi.co.in';
const USER_PASSWORD =
  process.env.E2E_HOTSPOT_PASSWORD ?? process.env.E2E_VENDOR_PASSWORD ?? 'Keerthi@2404ias';

const MAX_QUOTES_TO_SCAN = Number(process.env.E2E_BOOKING_SEED_SCAN_LIMIT || '300');
const PAGE_SIZE = 50;

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
  planId?: number;
  days?: Day[];
  costBreakdown?: {
    kmLimitWarning?: string;
    totalGuideCost?: number;
  };
};

type LatestResponse = {
  data?: Array<{
    itinerary_quote_ID?: string | null;
    itinerary_booking_ID?: string | null;
  }>;
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

type DbConnInfo = {
  databaseUrl: string;
};

type Day1Metrics = {
  day1: Day;
  segments: Seg[];
  attractions: Seg[];
  checkins: Seg[];
  firstAttractionIndex: number;
  firstCheckinIndex: number;
  firstAttractionStartMinutes: number | null;
  firstCheckinMinutes: number | null;
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
    isDifferentCity: differentCity && firstAttractionIndex >= 0 && firstCheckinIndex >= 0 && firstAttractionIndex < firstCheckinIndex,
    hasClosedAnnotation,
    hasHouseboat: attractions.length === 0 && checkins.length > 0 && (hasHouseboatCheckin || sameCity),
    hasKmWarning,
    hasGuideCost,
    firstAttractionHotspotId: Number(attractions[0]?.hotspotId || 0) || null,
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

async function fetchLatestQuotes(token: string): Promise<string[]> {
  const out = new Set<string>();
  for (let start = 0; start < MAX_QUOTES_TO_SCAN; start += PAGE_SIZE) {
    const res = await fetch(
      `${API_BASE_URL}/itineraries/latest?start=${start}&length=${PAGE_SIZE}`,
      {
        headers: { Authorization: `Bearer ${token}` },
      },
    );

    if (!res.ok) {
      const body = await res.text();
      throw new Error(`latest API failed at start=${start}: ${res.status} ${body}`);
    }

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

async function fetchDetails(token: string, quoteId: string): Promise<Details | null> {
  const res = await fetch(`${API_BASE_URL}/itineraries/details/${encodeURIComponent(quoteId)}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) return null;
  return (await res.json()) as Details;
}

function extractDay1Metrics(details: Details): Day1Metrics | null {
  const d1 = dayOne(details);
  if (!d1) return null;
  const segments = Array.isArray(d1.segments) ? d1.segments : [];
  const attractions = segments.filter((s) => s.type === 'attraction');
  const checkins = segments.filter((s) => s.type === 'checkin');
  const firstAttractionIndex = segments.findIndex((s) => s.type === 'attraction');
  const firstCheckinIndex = segments.findIndex((s) => s.type === 'checkin');
  const firstAttractionStartMinutes = parseDisplayTimeToMinutes(attractions[0]?.visitTime || null);
  const firstCheckinMinutes = parseDisplayTimeToMinutes(checkins[0]?.time || null);
  return {
    day1: d1,
    segments,
    attractions,
    checkins,
    firstAttractionIndex,
    firstCheckinIndex,
    firstAttractionStartMinutes,
    firstCheckinMinutes,
  };
}

async function apiGet<T>(token: string, endpoint: string): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${endpoint}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    const body = await res.text();
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
    const body = await res.text();
    throw new Error(`POST ${endpoint} failed: ${res.status} ${body}`);
  }
  return (await res.json()) as T;
}

async function addManualHotspotsForRoute(
  token: string,
  planId: number,
  routeId: number,
  count: number,
): Promise<void> {
  const available = await apiGet<any[]>(token, `/itineraries/hotspots/available/${routeId}`);
  if (!Array.isArray(available) || available.length === 0) return;

  const candidates = available
    .map((h) => Number((h as any).hotspot_ID || (h as any).hotspotId || 0))
    .filter((id) => id > 0)
    .slice(0, count);

  for (const hotspotId of candidates) {
    try {
      await apiPost(token, `/itineraries/${planId}/manual-hotspot`, { routeId, hotspotId });
    } catch {
      // best-effort hotspot shaping; continue
    }
  }
}

function parseDotEnv(raw: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const idx = trimmed.indexOf('=');
    if (idx <= 0) continue;
    const key = trimmed.slice(0, idx).trim();
    let value = trimmed.slice(idx + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (key) out[key] = value;
  }
  return out;
}

let dbConnInfoCache: DbConnInfo | null = null;

function getDbConnInfo(): DbConnInfo {
  if (dbConnInfoCache) return dbConnInfoCache;
  const backendEnvPath = path.resolve(process.cwd(), '../api.dvi.travel/.env');
  if (!fs.existsSync(backendEnvPath)) {
    throw new Error(`Backend .env not found at ${backendEnvPath}`);
  }
  const envRaw = fs.readFileSync(backendEnvPath, 'utf8');
  const env = parseDotEnv(envRaw);
  const databaseUrl = env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error('DATABASE_URL missing in backend .env');
  }
  dbConnInfoCache = { databaseUrl };
  return dbConnInfoCache;
}

async function getDbConnection() {
  const { databaseUrl } = getDbConnInfo();
  return mysql.createConnection(databaseUrl);
}

function haversineKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const toRad = (v: number) => (v * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

async function getRouteSourceCoords(routeId: number): Promise<{ lat: number; lon: number } | null> {
  const conn = await getDbConnection();
  try {
    const [rows] = await conn.query<any[]>(
      `SELECT sl.source_location_lattitude AS lat, sl.source_location_longitude AS lon
       FROM dvi_itinerary_route_details rd
       JOIN dvi_stored_locations sl ON sl.location_ID = rd.location_id
       WHERE rd.itinerary_route_ID = ?
       LIMIT 1`,
      [routeId],
    );
    const row = Array.isArray(rows) ? rows[0] : null;
    if (!row) return null;
    const lat = Number(row.lat || 0);
    const lon = Number(row.lon || 0);
    if (!Number.isFinite(lat) || !Number.isFinite(lon) || lat === 0 || lon === 0) return null;
    return { lat, lon };
  } finally {
    await conn.end();
  }
}

async function pickHotelIdByDistance(
  source: { lat: number; lon: number },
  mode: 'near' | 'far',
): Promise<{ hotelId: number; distanceKm: number } | null> {
  const conn = await getDbConnection();
  try {
    const [rows] = await conn.query<any[]>(
      `SELECT hotel_id, hotel_name
       FROM dvi_hotel
       WHERE deleted = 0 AND status = 1`,
    );

    const candidates = (Array.isArray(rows) ? rows : [])
      .map((r) => {
        const hotelId = Number(r.hotel_id || 0);
        const hotelName = String(r.hotel_name || '').toLowerCase();
        if (!hotelId) return null;
        if (/house\s*boat/.test(hotelName)) return null;
        return { hotelId };
      })
      .filter((x): x is { hotelId: number } => Boolean(x));

    if (!candidates.length) return null;

    // Use stable deterministic coordinate offsets from route source to force intended branch.
    const chosen = candidates[0];
    const nearOffset = 0.08; // ~9km
    const farOffset = 0.45; // ~50km
    const offset = mode === 'near' ? nearOffset : farOffset;
    const lat = source.lat + offset;
    const lon = source.lon + offset;

    await conn.query(
      `UPDATE dvi_hotel
       SET hotel_latitude = ?, hotel_longitude = ?, updatedon = NOW()
       WHERE hotel_id = ?`,
      [String(lat), String(lon), chosen.hotelId],
    );

    return {
      hotelId: chosen.hotelId,
      distanceKm: haversineKm(source.lat, source.lon, lat, lon),
    };
  } finally {
    await conn.end();
  }
}

async function setHotelForRoute(
  planId: number,
  routeId: number,
  hotelId: number,
): Promise<void> {
  const conn = await getDbConnection();
  try {
    const [rows] = await conn.query<any[]>(
      `SELECT itinerary_plan_hotel_details_ID
       FROM dvi_itinerary_plan_hotel_details
       WHERE itinerary_plan_id = ? AND itinerary_route_id = ? AND deleted = 0`,
      [planId, routeId],
    );

    if (Array.isArray(rows) && rows.length > 0) {
      await conn.query(
        `UPDATE dvi_itinerary_plan_hotel_details
         SET hotel_id = ?, group_type = 1, status = 1, hotel_required = 1, updatedon = NOW()
         WHERE itinerary_plan_id = ? AND itinerary_route_id = ? AND deleted = 0`,
        [hotelId, planId, routeId],
      );
      return;
    }

    await conn.query(
      `INSERT INTO dvi_itinerary_plan_hotel_details
       (group_type, itinerary_plan_id, itinerary_route_id, itinerary_route_date, itinerary_route_location, hotel_required, hotel_id, createdby, createdon, status, deleted)
       VALUES (?, ?, ?, CURDATE(), '', ?, ?, ?, NOW(), ?, ?)`,
      [1, planId, routeId, 1, hotelId, 1, 1, 0],
    );
  } finally {
    await conn.end();
  }
}

async function updateRouteTimes(
  token: string,
  planId: number,
  routeId: number,
  startTime: string,
  endTime: string,
): Promise<void> {
  await fetch(`${API_BASE_URL}/itineraries/${planId}/route/${routeId}/times`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ startTime, endTime }),
  });
}

async function rebuildRoute(token: string, planId: number, routeId: number): Promise<void> {
  await apiPost(token, `/itineraries/${planId}/route/${routeId}/rebuild`, {});
}

async function ensureGuideCostRow(details: Details): Promise<boolean> {
  const planId = Number(details.planId || 0);
  const d1 = dayOne(details);
  const routeId = Number(d1?.id || 0);
  if (!planId || !routeId) return false;

  const conn = await getDbConnection();
  try {
    const [rows] = await conn.query<any[]>(
      `SELECT route_guide_ID FROM dvi_itinerary_route_guide_details
       WHERE itinerary_plan_ID = ? AND itinerary_route_ID = ? AND deleted = 0 AND status = 1
       LIMIT 1`,
      [planId, routeId],
    );

    if (Array.isArray(rows) && rows.length > 0) {
      return true;
    }

    await conn.query(
      `INSERT INTO dvi_itinerary_route_guide_details
       (itinerary_plan_ID, itinerary_route_ID, guide_id, guide_type, guide_language, guide_slot, guide_cost, createdby, createdon, status, deleted)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW(), ?, ?)`,
      [planId, routeId, 1, 1, 'English', 'FULL_DAY', 1200, 1, 1, 0],
    );
    return true;
  } finally {
    await conn.end();
  }
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
      special_instructions: `E2E_SEED_${input.label}`,
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
    console.warn('[seed] create scenario failed', input.label, res.status, body.slice(0, 300));
    return null;
  }

  const json = (await res.json()) as { quoteId?: string; planId?: number; routeIds?: number[] };
  const quoteId = String(json?.quoteId || '').trim();
  const planId = Number(json?.planId || 0);
  const routeIds = Array.isArray(json?.routeIds) ? json.routeIds.map((r) => Number(r || 0)).filter((r) => r > 0) : [];
  if (!quoteId || !planId) return null;
  return { quoteId, planId, routeIds };
}

async function forceScenario2Quote(token: string): Promise<string> {
  const cityPairs: Array<[string, string]> = [
    ['Ooty', 'Ooty'],
    ['Chennai International Airport', 'Chennai International Airport'],
    ['Coimbatore, International Airport', 'Coimbatore, International Airport'],
    ['Madurai Airport', 'Madurai Airport'],
  ];

  for (let attempt = 1; attempt <= 12; attempt++) {
    const pair = cityPairs[(attempt - 1) % cityPairs.length];
    const created = await createScenarioQuote(token, {
      label: `AFTER_NOON_SAME_CITY_WITHIN20_${attempt}`,
      arrivalPoint: pair[0],
      departurePoint: pair[1],
      day1Location: pair[0],
      day1NextLocation: pair[1],
      day2Location: pair[0],
      day2NextLocation: pair[1],
      startHour: 12,
      tripEndHour: 10,
      day1DirectToNext: 1,
    });
    if (!created) continue;

    const routeId = Number(created.routeIds[0] || 0);
    if (!routeId) continue;

    await updateRouteTimes(token, created.planId, routeId, '12:00:00', '23:00:00');

    const source = await getRouteSourceCoords(routeId);
    if (!source) continue;

    const nearHotel = await pickHotelIdByDistance(source, 'near');
    if (!nearHotel) {
      console.log(`[seed][scenario2] attempt ${attempt}: no near hotel found for route ${routeId}`);
      continue;
    }
    console.log(
      `[seed][scenario2] attempt ${attempt}: selected near hotel ${nearHotel.hotelId} at ${nearHotel.distanceKm.toFixed(2)}km`,
    );
    await setHotelForRoute(created.planId, routeId, nearHotel.hotelId);

    await addManualHotspotsForRoute(token, created.planId, routeId, 6);
    await rebuildRoute(token, created.planId, routeId);

    let details = await fetchDetails(token, created.quoteId);
    let metrics = details ? extractDay1Metrics(details) : null;
    if (metrics && metrics.attractions.length < 2) {
      await addManualHotspotsForRoute(token, created.planId, routeId, 6);
      await rebuildRoute(token, created.planId, routeId);
      details = await fetchDetails(token, created.quoteId);
      metrics = details ? extractDay1Metrics(details) : null;
    }

    if (!metrics) continue;

    const hotelFirst =
      metrics.firstCheckinIndex >= 0 &&
      (metrics.firstAttractionIndex < 0 || metrics.firstCheckinIndex < metrics.firstAttractionIndex);
    const hasTwoAttractions = metrics.attractions.length >= 2;
    const checkinAfter2 = metrics.firstCheckinMinutes !== null && metrics.firstCheckinMinutes >= 14 * 60;
    const restGapOk =
      metrics.firstCheckinMinutes !== null &&
      metrics.firstAttractionStartMinutes !== null &&
      metrics.firstAttractionStartMinutes - metrics.firstCheckinMinutes >= 120;

    console.log(
      `[seed][scenario2] attempt ${attempt} quote=${created.quoteId}: hotelFirst=${hotelFirst}, attractions=${metrics.attractions.length}, checkinAfter2=${checkinAfter2}, restGapOk=${restGapOk}, firstCheckin=${metrics.firstCheckinMinutes}, firstAttraction=${metrics.firstAttractionStartMinutes}`,
    );

    if (hotelFirst && hasTwoAttractions && checkinAfter2 && restGapOk) {
      return created.quoteId;
    }
  }
  throw new Error('Unable to deterministically generate Scenario 2 quote with hotel-first + >=2 post-checkin attractions + rest gap');
}

async function forceScenario3Quote(token: string): Promise<string> {
  const cityPairs = [
    ['Chennai International Airport', 'Chennai International Airport'],
    ['Coimbatore, International Airport', 'Coimbatore, International Airport'],
    ['Madurai Airport', 'Madurai Airport'],
  ];

  for (let attempt = 1; attempt <= 9; attempt++) {
    const pair = cityPairs[(attempt - 1) % cityPairs.length];
    const created = await createScenarioQuote(token, {
      label: `AFTER_NOON_SAME_CITY_BEYOND20_${attempt}`,
      arrivalPoint: pair[0],
      departurePoint: pair[1],
      day1Location: pair[0],
      day1NextLocation: pair[1],
      day2Location: pair[0],
      day2NextLocation: pair[1],
      startHour: 16,
      tripEndHour: 10,
      day1DirectToNext: 1,
    });
    if (!created) continue;

    const routeId = Number(created.routeIds[0] || 0);
    if (!routeId) continue;

    await updateRouteTimes(token, created.planId, routeId, '16:00:00', '20:00:00');

    const source = await getRouteSourceCoords(routeId);
    if (!source) continue;

    const farHotel = await pickHotelIdByDistance(source, 'far');
    if (!farHotel) continue;
    await setHotelForRoute(created.planId, routeId, farHotel.hotelId);

    await addManualHotspotsForRoute(token, created.planId, routeId, 5);
    await rebuildRoute(token, created.planId, routeId);

    let details = await fetchDetails(token, created.quoteId);
    if (!details) continue;
    let metrics = extractDay1Metrics(details);
    if (metrics && metrics.attractions.length < 1) {
      await addManualHotspotsForRoute(token, created.planId, routeId, 6);
      await rebuildRoute(token, created.planId, routeId);
      details = await fetchDetails(token, created.quoteId);
      metrics = details ? extractDay1Metrics(details) : null;
    }

    if (!metrics) continue;
    const hasAttractionBeforeHotel =
      metrics.firstAttractionIndex >= 0 &&
      metrics.firstCheckinIndex >= 0 &&
      metrics.firstAttractionIndex < metrics.firstCheckinIndex;
    const lastSegmentType = String(metrics.segments[metrics.segments.length - 1]?.type || '').toLowerCase();

    console.log(
      `[seed][scenario3] attempt ${attempt} quote=${created.quoteId}: attractions=${metrics.attractions.length}, firstAttractionIndex=${metrics.firstAttractionIndex}, firstCheckinIndex=${metrics.firstCheckinIndex}, lastSegmentType=${lastSegmentType}, hasAttractionBeforeHotel=${hasAttractionBeforeHotel}`,
    );

    if (hasAttractionBeforeHotel) {
      return created.quoteId;
    }
  }
  throw new Error('Unable to deterministically generate Scenario 3 quote with attraction-before-hotel ordering');
}

async function forceScenario8Quote(token: string): Promise<string> {
  for (let attempt = 1; attempt <= 4; attempt++) {
    const created = await createScenarioQuote(token, {
      label: `GUIDE_TOTAL_${attempt}`,
      arrivalPoint: 'Ooty',
      departurePoint: 'Ooty',
      day1Location: 'Ooty',
      day1NextLocation: 'Ooty',
      day2Location: 'Ooty',
      day2NextLocation: 'Ooty',
      startHour: 10,
      tripEndHour: 10,
      guideForItinerary: true,
    });
    if (!created) continue;

    const before = await fetchDetails(token, created.quoteId);
    if (!before) continue;

    const inserted = await ensureGuideCostRow(before);
    if (!inserted) continue;

    const after = await fetchDetails(token, created.quoteId);
    const totalGuide = Number(after?.costBreakdown?.totalGuideCost || 0);
    if (totalGuide > 0) {
      return created.quoteId;
    }
  }
  throw new Error('Unable to deterministically generate Scenario 8 quote with totalGuideCost > 0');
}

function writeEnvE2E(values: Record<string, string>, mustVisitHotspotId?: number | null): string {
  const envPath = path.join(process.cwd(), '.env.e2e');
  const lines: string[] = [];

  lines.push(`# Auto-generated by tests/e2e/seed-booking-test-data.ts`);
  lines.push(`E2E_BASE_URL=${BASE_URL}`);
  lines.push(`E2E_API_BASE_URL=${API_BASE_URL}`);
  lines.push(`BOOKING_DEBUG=true`);

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
  console.log('[seed] login...');
  const token = await login();

  console.log('[seed] fetching latest quotes...');
  const quoteIds = await fetchLatestQuotes(token);
  if (!quoteIds.length) {
    throw new Error('No quotes found from /itineraries/latest');
  }

  const selected: Partial<Record<ScenarioKey, string>> = {};
  let expectedMustVisitFirstHotspotId: number | null = null;

  for (const quoteId of quoteIds) {
    if (Object.keys(selected).length === 8) break;

    const details = await fetchDetails(token, quoteId);
    if (!details) continue;
    const c = classify(details);
    if (!c) continue;

    if (!selected.beforeNoonSameCity && c.isBeforeNoonSameCity) {
      selected.beforeNoonSameCity = quoteId;
    }

    if (
      !selected.afterNoonSameCityWithin20 &&
      c.isAfterNoonSameCityHotelFirst &&
      c.inferredRestGapAfterHotel
    ) {
      selected.afterNoonSameCityWithin20 = quoteId;
    }

    if (!selected.afterNoonSameCityBeyond20 && c.isAfterNoonSameCityHotelLast) {
      selected.afterNoonSameCityBeyond20 = quoteId;
    }

    if (!selected.differentCityDay1 && c.isDifferentCity) {
      selected.differentCityDay1 = quoteId;
    }

    if (!selected.closedHotspotDeferred && c.hasClosedAnnotation) {
      selected.closedHotspotDeferred = quoteId;
      expectedMustVisitFirstHotspotId = c.firstAttractionHotspotId;
    }

    if (!selected.houseboat && c.hasHouseboat) {
      selected.houseboat = quoteId;
    }

    if (!selected.kmWarning && c.hasKmWarning) {
      selected.kmWarning = quoteId;
    }

    if (!selected.guideTotal && c.hasGuideCost) {
      selected.guideTotal = quoteId;
    }
  }

  const missing = (Object.keys(SCENARIO_ENV) as ScenarioKey[]).filter((k) => !selected[k]);
  if (missing.length) {
    console.log('[seed] missing after fetch-only pass:', missing.join(', '));

    const creationPlan: Array<{ scenario: ScenarioKey; input: CreateScenarioInput }> = [
      {
        scenario: 'beforeNoonSameCity',
        input: {
          label: 'BEFORE_NOON_SAME_CITY',
          arrivalPoint: 'Ooty',
          departurePoint: 'Ooty',
          day1Location: 'Ooty',
          day1NextLocation: 'Ooty',
          day2Location: 'Ooty',
          day2NextLocation: 'Ooty',
          startHour: 10,
          tripEndHour: 10,
        },
      },
      {
        scenario: 'differentCityDay1',
        input: {
          label: 'DIFFERENT_CITY_DAY1',
          arrivalPoint: 'Chennai International Airport',
          departurePoint: 'Madurai',
          day1Location: 'Chennai International Airport',
          day1NextLocation: 'Madurai',
          day2Location: 'Madurai',
          day2NextLocation: 'Madurai',
          startHour: 12,
          tripEndHour: 10,
        },
      },
      {
        scenario: 'houseboat',
        input: {
          label: 'HOUSEBOAT_PATTERN',
          arrivalPoint: 'Alleppey',
          departurePoint: 'Alleppey',
          day1Location: 'Alleppey',
          day1NextLocation: 'Alleppey',
          day2Location: 'Alleppey',
          day2NextLocation: 'Alleppey',
          startHour: 21,
          tripEndHour: 10,
        },
      },
    ];

    const createdQuoteIds: string[] = [];
    const createdByScenario: Partial<Record<ScenarioKey, string>> = {};
    for (const step of creationPlan) {
      if (selected[step.scenario]) continue;
      const createdQuote = await createScenarioQuote(token, step.input);
      if (createdQuote) {
        createdQuoteIds.push(createdQuote.quoteId);
        createdByScenario[step.scenario] = createdQuote.quoteId;
      }
    }

    for (const quoteId of createdQuoteIds) {
      const details = await fetchDetails(token, quoteId);
      if (!details) continue;
      const c = classify(details);
      if (!c) continue;

      if (!selected.beforeNoonSameCity && c.isBeforeNoonSameCity) {
        selected.beforeNoonSameCity = quoteId;
      }
      if (
        !selected.afterNoonSameCityWithin20 &&
        c.isAfterNoonSameCityHotelFirst &&
        c.inferredRestGapAfterHotel
      ) {
        selected.afterNoonSameCityWithin20 = quoteId;
      }
      if (!selected.afterNoonSameCityBeyond20 && c.isAfterNoonSameCityHotelLast) {
        selected.afterNoonSameCityBeyond20 = quoteId;
      }
      if (!selected.differentCityDay1 && c.isDifferentCity) {
        selected.differentCityDay1 = quoteId;
      }
      if (!selected.closedHotspotDeferred && c.hasClosedAnnotation) {
        selected.closedHotspotDeferred = quoteId;
        expectedMustVisitFirstHotspotId = c.firstAttractionHotspotId;
      }
      if (!selected.houseboat && c.hasHouseboat) {
        selected.houseboat = quoteId;
      }
      if (!selected.kmWarning && c.hasKmWarning) {
        selected.kmWarning = quoteId;
      }
      if (!selected.guideTotal && c.hasGuideCost) {
        selected.guideTotal = quoteId;
      }
    }

    const stillMissing = (Object.keys(SCENARIO_ENV) as ScenarioKey[]).filter((k) => !selected[k]);
    if (stillMissing.length) {
      for (const m of stillMissing) {
        if (createdByScenario[m]) {
          selected[m] = createdByScenario[m] as string;
        }
      }

      const unresolved = (Object.keys(SCENARIO_ENV) as ScenarioKey[]).filter((k) => !selected[k]);
      if (unresolved.length) {
        throw new Error(
          `Unable to auto-match/create quotes for scenarios: ${unresolved.join(', ')}. ` +
            `Scanned=${quoteIds.length}, created=${createdQuoteIds.length}.`
        );
      }

      console.warn(
        `[seed] fallback assignments used for: ${stillMissing.join(', ')} (quotes created but strict classifier not fully matched).`,
      );
    }
  }

  // Regenerate strict branch-sensitive scenarios on every run to keep results deterministic.
  selected.afterNoonSameCityWithin20 = await forceScenario2Quote(token);
  selected.afterNoonSameCityBeyond20 = await forceScenario3Quote(token);
  selected.guideTotal = await forceScenario8Quote(token);

  const envMap: Record<string, string> = {};
  for (const [scenario, envName] of Object.entries(SCENARIO_ENV)) {
    envMap[envName] = String(selected[scenario as ScenarioKey]);
  }

  if (!expectedMustVisitFirstHotspotId && selected.closedHotspotDeferred) {
    const closedDetails = await fetchDetails(token, selected.closedHotspotDeferred);
    const metrics = closedDetails ? extractDay1Metrics(closedDetails) : null;
    const firstAttractionHotspotId = Number(metrics?.attractions?.[0]?.hotspotId || 0);
    if (firstAttractionHotspotId > 0) {
      expectedMustVisitFirstHotspotId = firstAttractionHotspotId;
    }
  }

  if (!expectedMustVisitFirstHotspotId || expectedMustVisitFirstHotspotId <= 0) {
    expectedMustVisitFirstHotspotId = 1;
  }

  const envPath = writeEnvE2E(envMap, expectedMustVisitFirstHotspotId);

  console.log('[seed] completed');
  console.log('[seed] .env.e2e:', envPath);
  console.log('[seed] selected quotes:', JSON.stringify(selected, null, 2));
  if (expectedMustVisitFirstHotspotId) {
    console.log('[seed] expected must-visit first hotspot id:', expectedMustVisitFirstHotspotId);
  }
}

main().catch((err) => {
  console.error('[seed] failed:', err instanceof Error ? err.message : err);
  process.exit(1);
});
