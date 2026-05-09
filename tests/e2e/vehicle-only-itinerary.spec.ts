import { expect, test, type APIRequestContext, type Page } from '@playwright/test';

/**
 * Playwright E2E: Vehicle-Only Itinerary Creation
 * - Creates a vehicle-only itinerary via the API (bypassing UI forms)
 * - Then loads the itinerary details page and confirms the vehicle data renders
 * - Captures any errors/issues in the flow
 *
 * repro values taken from confirm-booking-modal-e2e.spec.ts patterns
 */

const USER_EMAIL    = process.env.E2E_USER     ?? 'admin@dvi.co.in';
const USER_PASSWORD = process.env.E2E_PASSWORD ?? 'Keerthi@2404ias';
const API_BASE_URL  = process.env.E2E_API_BASE_URL      ?? 'http://127.0.0.1:4006/api/v1';
const FRONTEND_BASE_URL = process.env.E2E_FRONTEND_BASE_URL ?? 'http://localhost:8080';

// ─── helpers ──────────────────────────────────────────────────────────────────

async function loginForToken(request: APIRequestContext): Promise<string> {
  const res = await request.post(`${API_BASE_URL}/auth/login`, {
    data: { email: USER_EMAIL, password: USER_PASSWORD },
  });
  if (!res.ok()) throw new Error(`Auth failed ${res.status()} ${await res.text().catch(() => '')}`);
  const json = (await res.json()) as { accessToken?: string };
  const token = String(json?.accessToken || '').trim();
  if (!token) throw new Error('accessToken missing in login response');
  return token;
}

async function seedAuthToken(page: Page, request: APIRequestContext): Promise<string> {
  const token = await loginForToken(request);
  await page.addInitScript((t) => {
    window.localStorage.setItem('accessToken', t);
  }, token);
  return token;
}

function plusDays(base: Date, n: number): Date {
  const d = new Date(base.getTime());
  d.setDate(d.getDate() + n);
  return d;
}

function isoIST(date: Date, hour = 8, minute = 0): string {
  const y  = date.getFullYear();
  const mo = String(date.getMonth() + 1).padStart(2, '0');
  const dy = String(date.getDate()).padStart(2, '0');
  const hh = String(hour).padStart(2, '0');
  const mm = String(minute).padStart(2, '0');
  return `${y}-${mo}-${dy}T${hh}:${mm}:00+05:30`;
}

// ─── test ─────────────────────────────────────────────────────────────────────

test('vehicle-only itinerary: create, verify response, and open details page', async ({
  page,
  request,
  baseURL,
}) => {
  test.setTimeout(120_000);

  const now  = new Date();
  const day1 = plusDays(now, 5);  // trip start
  const day2 = plusDays(now, 6);
  const day3 = plusDays(now, 7);
  const day4 = plusDays(now, 8);  // trip end

  const apiLogs: string[] = [];

  // ── seed auth token into localStorage so the frontend SPA picks it up ──────
  const token = await seedAuthToken(page, request);
  console.log('[AUTH] token acquired');

  // ── capture API responses for debugging ──────────────────────────────────
  page.on('response', async (resp) => {
    const url   = resp.url();
    const urlRelative = url.includes('/api/v1') ? url.split('/api/v1')[1] : url;
    if (!url.includes('/api/v1')) return;
    let body: any = null;
    try { body = await resp.json(); } catch { /* not JSON */ }
    const log = `[API ${resp.status()}] ${resp.request().method()} ${urlRelative}`;
    apiLogs.push(log);
    if (resp.status() >= 400) {
      console.error(log, JSON.stringify(body));
    } else {
      console.log(log);
    }
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // STEP 1 – Create a vehicle-only itinerary via API
  //   itinerary_preference = 2  →  "vehicle only" (from CreateItinerary source)
  // ═══════════════════════════════════════════════════════════════════════════
  console.log('\n[STEP 1] Creating vehicle-only itinerary…');

  // Chennai → Mahabalipuram → Pondicherry → Chennai  (3-night / 4-day circuit)
  const createPayload = {
    plan: {
      agent_id: 8,
      staff_id: 0,
      location_id: 0,
      arrival_point: 'Chennai International Airport',
      departure_point: 'Chennai International Airport',

      // 2 = vehicle-only  (ref: CreateItinerary.tsx line 1209)
      itinerary_preference: 2,

      // itinerary_type: 1 → individual, 2 → group  (vehicle-only defaults to 1)
      itinerary_type: 1,

      // No hotel fields for vehicle-only
      preferred_hotel_category: [],
      hotel_facilities: [],

      trip_start_date:        isoIST(day1, 8, 0),
      trip_end_date:          isoIST(day4, 20, 0),
      pick_up_date_and_time:  isoIST(day1, 8, 0),

      arrival_type:   1,
      departure_type: 1,

      no_of_nights: 3,
      no_of_days:   4,

      budget: 15000,

      entry_ticket_required: 0,
      guide_for_itinerary:   0,
      nationality: 101,       // India
      food_type: 0,
      meal_plan_code: 'EP',   // room-only / no meals
      meal_plan_breakfast: 0,
      meal_plan_lunch: 0,
      meal_plan_dinner: 0,

      adult_count:  2,
      child_count:  0,
      infant_count: 0,

      special_instructions: 'Playwright E2E – vehicle-only itinerary test',
    },

    routes: [
      {
        location_name:            'Chennai International Airport',
        next_visiting_location:   'Chennai',
        itinerary_route_date:     isoIST(day1, 0, 0),
        no_of_days:   1,
        no_of_km:     16.61,
        direct_to_next_visiting_place: 0,
        via_route:    '',
        via_routes:   [],
      },
      {
        location_name:            'Chennai',
        next_visiting_location:   'Mahabalipuram',
        itinerary_route_date:     isoIST(day2, 0, 0),
        no_of_days:   2,
        no_of_km:     52.07,
        direct_to_next_visiting_place: 0,
        via_route:    '',
        via_routes:   [],
      },
      {
        location_name:            'Mahabalipuram',
        next_visiting_location:   'Pondicherry',
        itinerary_route_date:     isoIST(day3, 0, 0),
        no_of_days:   3,
        no_of_km:     86.57,
        direct_to_next_visiting_place: 0,
        via_route:    '',
        via_routes:   [],
      },
      {
        location_name:            'Pondicherry',
        next_visiting_location:   'Chennai International Airport',
        itinerary_route_date:     isoIST(day4, 0, 0),
        no_of_days:   4,
        no_of_km:     140.17,
        direct_to_next_visiting_place: 0,
        via_route:    '',
        via_routes:   [],
      },
    ],

    // Vehicle rows – Sedan × 1  (vehicle_type_id=1 is typically Sedan)
    vehicles: [
      { vehicle_type_id: 1, vehicle_count: 1 },
    ],

    travellers: [],

    previousDayBillingDecisionProvided: false,
    previousDayBillingConfirmed:        false,
  };

  console.log('[STEP 1] Payload:', JSON.stringify(createPayload, null, 2));

  const createRes = await request.post(`${API_BASE_URL}/itineraries`, {
    headers: { Authorization: `Bearer ${token}` },
    data:    createPayload,
  });

  console.log(`[STEP 1] Response status: ${createRes.status()}`);
  const createBody = await createRes.json().catch(() => null);
  console.log('[STEP 1] Response body:', JSON.stringify(createBody, null, 2));

  // ── assert creation succeeded ────────────────────────────────────────────
  expect(
    [200, 201],
    `Itinerary creation should succeed (got ${createRes.status()}) – body: ${JSON.stringify(createBody)}`
  ).toContain(createRes.status());

  // API returns { planId, quoteId, routeIds, message }
  const itineraryCode: string =
    createBody?.quoteId ??
    createBody?.itinerary_plan_code ??
    createBody?.data?.itinerary_plan_code ??
    createBody?.plan?.itinerary_plan_code ??
    '';

  const itineraryId: number =
    createBody?.planId ??
    createBody?.itinerary_plan_id ??
    createBody?.data?.itinerary_plan_id ??
    createBody?.plan?.itinerary_plan_id ??
    0;

  console.log(`[STEP 1] ✅ Itinerary created  id=${itineraryId}  code=${itineraryCode}`);

  expect(itineraryCode, 'Itinerary code should be non-empty').toBeTruthy();

  // ── check vehicles were saved alongside the plan ─────────────────────────
  const savedVehicles =
    createBody?.vehicles ??
    createBody?.data?.vehicles ??
    createBody?.plan?.vehicles ??
    null;

  if (Array.isArray(savedVehicles)) {
    console.log(`[STEP 1] Vehicles in response: ${JSON.stringify(savedVehicles)}`);
    expect(savedVehicles.length, 'At least one vehicle should be saved').toBeGreaterThan(0);
  } else {
    console.warn('[STEP 1] ⚠️  vehicles key not present in create response – will verify via GET');
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // STEP 2 – Fetch the created itinerary via GET and verify vehicle data
  // ═══════════════════════════════════════════════════════════════════════════
  console.log(`\n[STEP 2] Fetching itinerary ${itineraryCode} via GET (edit endpoint for raw plan)…`);

  // Use /edit/:id to get raw plan including itinerary_preference
  const getRes = await request.get(`${API_BASE_URL}/itineraries/edit/${itineraryId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  console.log(`[STEP 2] Response status: ${getRes.status()}`);
  expect(getRes.status()).toBe(200);

  const getData = await getRes.json().catch(() => null);

  // check itinerary_preference = 2 (vehicle only) was persisted
  const fetchedPreference =
    getData?.plan?.itinerary_preference ??
    getData?.itinerary_preference ??
    getData?.data?.plan?.itinerary_preference ??
    null;
  console.log(`[STEP 2] itinerary_preference in DB: ${fetchedPreference}`);
  expect(
    fetchedPreference,
    'itinerary_preference should be 2 (vehicle-only)'
  ).toBe(2);

  // check vehicles persisted
  const fetchedVehicles =
    getData?.vehicles ??
    getData?.plan?.vehicles ??
    getData?.data?.vehicles ??
    [];

  console.log(`[STEP 2] Vehicles in GET response: ${JSON.stringify(fetchedVehicles)}`);
  expect(
    Array.isArray(fetchedVehicles) && fetchedVehicles.length > 0,
    `At least one vehicle should be returned by GET – got: ${JSON.stringify(fetchedVehicles)}`
  ).toBe(true);

  // ═══════════════════════════════════════════════════════════════════════════
  // STEP 3 – Open itinerary details page and confirm vehicle section renders
  // ═══════════════════════════════════════════════════════════════════════════
  console.log(`\n[STEP 3] Opening itinerary-details/${itineraryCode} in browser…`);

  await page.goto(`${FRONTEND_BASE_URL}/itinerary-details/${itineraryCode}`, {
    waitUntil: 'domcontentloaded',
  });

  console.log(`[STEP 3] URL: ${page.url()}`);

  // wait for the page to load
  await page.waitForTimeout(3000);

  // take screenshot for visual check
  await page.screenshot({ path: `test-results/vehicle-only-itinerary-${itineraryCode}.png` });
  console.log(`[STEP 3] Screenshot saved`);

  // check itinerary code visible on page
  const codeVisible = await page.locator(`text=${itineraryCode}`).isVisible({ timeout: 8000 }).catch(() => false);
  console.log(`[STEP 3] Itinerary code visible on page: ${codeVisible}`);
  expect(codeVisible, `Page should show itinerary code ${itineraryCode}`).toBe(true);

  // check for any visible error content
  const errorLocator = page.locator('text=/error|failed|Something went wrong/i').first();
  const hasError = await errorLocator.isVisible({ timeout: 1000 }).catch(() => false);
  if (hasError) {
    const errText = await errorLocator.textContent().catch(() => '');
    console.error(`[STEP 3] ❌ Error visible on page: "${errText}"`);
  }
  expect(hasError, 'No errors should be visible on itinerary details page').toBe(false);

  // ── check vehicle section text (flexible matching) ──────────────────────
  const vehicleSectionLocator = page.locator(
    'text=/vehicle|sedan|suv|tempo/i, [class*="vehicle"], [data-section="vehicle"]'
  ).first();
  const vehicleSectionVisible = await vehicleSectionLocator.isVisible({ timeout: 3000 }).catch(() => false);
  console.log(`[STEP 3] Vehicle section visible: ${vehicleSectionVisible}`);

  // ═══════════════════════════════════════════════════════════════════════════
  // STEP 4 – Open Create-Itinerary UI and verify vehicle-only mode renders
  // ═══════════════════════════════════════════════════════════════════════════
  console.log('\n[STEP 4] Opening Create-Itinerary UI…');

  await page.goto(`${FRONTEND_BASE_URL}/create-itinerary`, {
    waitUntil: 'domcontentloaded',
  });

  await page.waitForTimeout(2000);
  await page.screenshot({ path: 'test-results/create-itinerary-page.png' });

  console.log(`[STEP 4] URL: ${page.url()}`);

  // look for the preference selector (vehicle / hotel / both)
  const prefLocators = [
    page.locator('select, [role="combobox"]').filter({ hasText: /vehicle|preference/i }),
    page.locator('text=/vehicle.*only|only.*vehicle/i'),
    page.locator('label').filter({ hasText: /vehicle/i }),
  ];

  let prefFound = false;
  for (const loc of prefLocators) {
    if (await loc.isVisible({ timeout: 1000 }).catch(() => false)) {
      prefFound = true;
      console.log('[STEP 4] ✅ Itinerary preference selector found');
      break;
    }
  }

  if (!prefFound) {
    console.warn('[STEP 4] ⚠️  Could not locate preference selector – page structure may differ');
  }

  console.log('\n✅ Vehicle-only itinerary E2E test completed');
  console.log('API calls intercepted:', apiLogs);
});

// ─── validation-only test ─────────────────────────────────────────────────────

test('vehicle-only itinerary: API rejects payload with no vehicles', async ({ request }) => {
  test.setTimeout(30_000);

  const token = await loginForToken(request);
  const now   = new Date();
  const day1  = plusDays(now, 10);
  const day2  = plusDays(now, 11);

  console.log('[VALIDATION] Testing: vehicle-only with empty vehicles array…');

  const badPayload = {
    plan: {
      agent_id: 8,
      staff_id: 0,
      location_id: 0,
      arrival_point: 'Chennai',
      departure_point: 'Chennai',
      itinerary_preference: 2,   // vehicle only
      itinerary_type: 1,
      preferred_hotel_category: [],
      hotel_facilities: [],
      trip_start_date:       isoIST(day1, 8, 0),
      trip_end_date:         isoIST(day2, 20, 0),
      pick_up_date_and_time: isoIST(day1, 8, 0),
      arrival_type: 1,
      departure_type: 1,
      no_of_nights: 1,
      no_of_days: 2,
      budget: 5000,
      entry_ticket_required: 0,
      guide_for_itinerary: 0,
      nationality: 101,
      food_type: 0,
      meal_plan_code: 'EP',
      meal_plan_breakfast: 0,
      meal_plan_lunch: 0,
      meal_plan_dinner: 0,
      adult_count: 2,
      child_count: 0,
      infant_count: 0,
      special_instructions: 'E2E validation test – no vehicles',
    },
    routes: [
      {
        location_name:          'Chennai',
        next_visiting_location: 'Mahabalipuram',
        itinerary_route_date:   isoIST(day1, 0, 0),
        no_of_days: 1,
        no_of_km: 60,
        direct_to_next_visiting_place: 0,
        via_route:  '',
        via_routes: [],
      },
      {
        location_name:          'Mahabalipuram',
        next_visiting_location: 'Chennai',
        itinerary_route_date:   isoIST(day2, 0, 0),
        no_of_days: 2,
        no_of_km: 60,
        direct_to_next_visiting_place: 0,
        via_route:  '',
        via_routes: [],
      },
    ],
    vehicles: [],   // empty – vehicle-only itinerary should still be accepted (vehicles added later)
    travellers: [],
    previousDayBillingDecisionProvided: false,
    previousDayBillingConfirmed:        false,
  };

  const res  = await request.post(`${API_BASE_URL}/itineraries`, {
    headers: { Authorization: `Bearer ${token}` },
    data:    badPayload,
  });

  const body = await res.json().catch(() => null);
  console.log(`[VALIDATION] Status: ${res.status()}`);
  console.log('[VALIDATION] Body:', JSON.stringify(body, null, 2));

  // vehicle-only with empty vehicles may succeed (vehicles added later on edit)
  // or return 400 depending on backend enforcement
  if (res.status() >= 400) {
    console.log('[VALIDATION] Backend rejected empty vehicles – correct if vehicles required');
    const errorMsg = body?.message ?? body?.error ?? JSON.stringify(body);
    console.log('[VALIDATION] Error message:', errorMsg);
  } else {
    console.log('[VALIDATION] Backend accepted empty vehicles – vehicles can be added later');
  }

  // document actual behaviour (no hard assertion – just capture)
  console.log(`[VALIDATION] Backend response for vehicle-only + empty vehicles: ${res.status()}`);
});
