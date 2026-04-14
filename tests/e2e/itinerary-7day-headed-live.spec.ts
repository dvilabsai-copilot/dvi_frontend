import { expect, test, type APIRequestContext, type Page, type TestInfo } from '@playwright/test';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

type CreatedItinerary = {
  quoteId: string;
  planId: number;
};

type DayRoute = {
  id: number;
  dayNumber: number;
  departure?: string;
  arrival?: string;
  viaRoutes?: Array<{ id: number; name: string }>;
  startTime?: string;
  endTime?: string;
  segments?: Array<any>;
};

type ItineraryDetailsResponse = {
  quoteId?: string;
  planId?: number;
  days?: DayRoute[];
};

const USER_EMAIL = process.env.E2E_HOTSPOT_USER ?? process.env.E2E_VENDOR_USER ?? 'admin@dvi.co.in';
const USER_PASSWORD =
  process.env.E2E_HOTSPOT_PASSWORD ?? process.env.E2E_VENDOR_PASSWORD ?? 'Keerthi@2404ias';
const API_BASE_URL = process.env.E2E_API_BASE_URL ?? 'http://127.0.0.1:4006/api/v1';
const THIS_FILE = fileURLToPath(import.meta.url);
const THIS_DIR = path.dirname(THIS_FILE);
const ROOT_REPORT_PATH = path.resolve(THIS_DIR, '../../../PLAYWRIGHT_ITINERARY_E2E_REPORT.md');

function isoWithOffset(date: Date, hour = 9, minute = 0): string {
  const d = new Date(date);
  d.setHours(hour, minute, 0, 0);
  return d.toISOString().replace('Z', '+05:30');
}

function plusDays(base: Date, days: number): Date {
  const d = new Date(base);
  d.setDate(d.getDate() + days);
  return d;
}

function unique<T>(arr: T[]): T[] {
  return [...new Set(arr)];
}

async function loginForToken(request: APIRequestContext): Promise<string> {
  const loginRes = await request.post(`${API_BASE_URL}/auth/login`, {
    data: { email: USER_EMAIL, password: USER_PASSWORD },
  });

  if (!loginRes.ok()) {
    const body = await loginRes.text().catch(() => '');
    throw new Error(`Auth login failed: status=${loginRes.status()} body=${body}`);
  }

  const json = (await loginRes.json()) as { accessToken?: string; access_token?: string };
  const token = String(json?.accessToken || json?.access_token || '').trim();
  if (!token) {
    throw new Error('Auth login succeeded but accessToken missing');
  }

  return token;
}

async function seedAuthToken(page: Page, request: APIRequestContext): Promise<string> {
  const token = await loginForToken(request);
  await page.addInitScript((t) => {
    window.localStorage.setItem('accessToken', t);
  }, token);
  return token;
}

async function createSevenDayItinerary(request: APIRequestContext): Promise<CreatedItinerary> {
  const token = await loginForToken(request);
  const start = plusDays(new Date(), 28);
  const end = plusDays(start, 6);

  const payload = {
    plan: {
      agent_id: 126,
      staff_id: 0,
      location_id: 0,
      arrival_point: 'Chennai',
      departure_point: 'Chennai',
      itinerary_preference: 3,
      itinerary_type: 2,
      preferred_hotel_category: [2],
      hotel_facilities: [],
      trip_start_date: isoWithOffset(start, 8, 0),
      trip_end_date: isoWithOffset(end, 20, 0),
      pick_up_date_and_time: isoWithOffset(start, 9, 0),
      arrival_type: 1,
      departure_type: 1,
      no_of_nights: 6,
      no_of_days: 7,
      budget: 65000,
      entry_ticket_required: 1,
      guide_for_itinerary: 1,
      nationality: 101,
      food_type: 0,
      adult_count: 2,
      child_count: 0,
      infant_count: 0,
      special_instructions:
        'Playwright 7-day live scenario: 2-night stay + via route + direct destination + activity/hotspot lifecycle',
    },
    routes: [
      {
        location_name: 'Chennai',
        next_visiting_location: 'Mahabalipuram',
        itinerary_route_date: isoWithOffset(plusDays(start, 0), 0, 0),
        no_of_days: 1,
        no_of_km: '',
        direct_to_next_visiting_place: 0,
        via_route: '',
        via_routes: [],
      },
      {
        location_name: 'Mahabalipuram',
        next_visiting_location: 'Mahabalipuram',
        itinerary_route_date: isoWithOffset(plusDays(start, 1), 0, 0),
        no_of_days: 2,
        no_of_km: '',
        direct_to_next_visiting_place: 0,
        via_route: '',
        via_routes: [],
      },
      {
        location_name: 'Mahabalipuram',
        next_visiting_location: 'Pondicherry',
        itinerary_route_date: isoWithOffset(plusDays(start, 2), 0, 0),
        no_of_days: 3,
        no_of_km: '',
        direct_to_next_visiting_place: 0,
        via_route: 'Auroville',
        via_routes: [{ itinerary_via_location_ID: 1, itinerary_via_location_name: 'Auroville' }],
      },
      {
        location_name: 'Pondicherry',
        next_visiting_location: 'Pondicherry',
        itinerary_route_date: isoWithOffset(plusDays(start, 3), 0, 0),
        no_of_days: 4,
        no_of_km: '',
        direct_to_next_visiting_place: 1,
        via_route: '',
        via_routes: [],
      },
      {
        location_name: 'Pondicherry',
        next_visiting_location: 'Chennai',
        itinerary_route_date: isoWithOffset(plusDays(start, 4), 0, 0),
        no_of_days: 5,
        no_of_km: '',
        direct_to_next_visiting_place: 0,
        via_route: '',
        via_routes: [],
      },
      {
        location_name: 'Chennai',
        next_visiting_location: 'Chennai',
        itinerary_route_date: isoWithOffset(plusDays(start, 5), 0, 0),
        no_of_days: 6,
        no_of_km: '',
        direct_to_next_visiting_place: 0,
        via_route: '',
        via_routes: [],
      },
      {
        location_name: 'Chennai',
        next_visiting_location: 'Chennai',
        itinerary_route_date: isoWithOffset(plusDays(start, 6), 0, 0),
        no_of_days: 7,
        no_of_km: '',
        direct_to_next_visiting_place: 0,
        via_route: '',
        via_routes: [],
      },
    ],
    vehicles: [{ vehicle_type_id: 1, vehicle_count: 1 }],
    travellers: [
      { room_id: 1, traveller_type: 1 },
      { room_id: 1, traveller_type: 1 },
    ],
  };

  const res = await request.post(`${API_BASE_URL}/itineraries`, {
    headers: { Authorization: `Bearer ${token}` },
    data: payload,
  });

  if (!res.ok()) {
    const body = await res.text().catch(() => '');
    throw new Error(`Create itinerary failed: status=${res.status()} body=${body}`);
  }

  const json = (await res.json()) as { quoteId?: string; planId?: number; itinerary_plan_id?: number };
  const quoteId = String(json?.quoteId || '').trim();
  const planId = Number(json?.planId || json?.itinerary_plan_id || 0);
  if (!quoteId || !planId) {
    throw new Error(`Create itinerary succeeded but quoteId/planId missing: ${JSON.stringify(json)}`);
  }

  return { quoteId, planId };
}

async function fetchItineraryDetails(
  request: APIRequestContext,
  token: string,
  quoteId: string,
): Promise<ItineraryDetailsResponse> {
  const res = await request.get(`${API_BASE_URL}/itineraries/details/${encodeURIComponent(quoteId)}`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok()) {
    const body = await res.text().catch(() => '');
    throw new Error(`Details API failed: status=${res.status()} body=${body}`);
  }

  return (await res.json()) as ItineraryDetailsResponse;
}

async function saveCheckpointScreenshot(page: Page, testInfo: TestInfo, name: string): Promise<string> {
  const fileName = `${Date.now()}-${name}.png`;
  const target = testInfo.outputPath(fileName);
  await page.screenshot({ path: target, fullPage: true });
  return target;
}

function buildReportMd(input: {
  startedAt: string;
  finishedAt: string;
  status: string;
  quoteId?: string;
  planId?: number;
  checks: string[];
  failures: string[];
  fixes: string[];
  remaining: string[];
  screenshots: string[];
}): string {
  const lines: string[] = [];
  lines.push('# PLAYWRIGHT ITINERARY E2E REPORT');
  lines.push('');
  lines.push(`- Started: ${input.startedAt}`);
  lines.push(`- Finished: ${input.finishedAt}`);
  lines.push(`- Status: ${input.status}`);
  if (input.quoteId) lines.push(`- Quote ID: ${input.quoteId}`);
  if (input.planId) lines.push(`- Plan ID: ${input.planId}`);
  lines.push('');

  lines.push('## What Was Tested');
  for (const c of input.checks) lines.push(`- ${c}`);
  lines.push('');

  lines.push('## Initial Failures');
  if (!input.failures.length) {
    lines.push('- No functional failures observed in this run.');
  } else {
    for (const f of input.failures) lines.push(`- ${f}`);
  }
  lines.push('');

  lines.push('## Fixes Applied');
  if (!input.fixes.length) {
    lines.push('- No code fixes were required for this run.');
  } else {
    for (const f of input.fixes) lines.push(`- ${f}`);
  }
  lines.push('');

  lines.push('## Remaining Risks / Follow-ups');
  if (!input.remaining.length) {
    lines.push('- None identified in this execution.');
  } else {
    for (const r of input.remaining) lines.push(`- ${r}`);
  }
  lines.push('');

  lines.push('## Screenshot Checkpoints');
  for (const s of input.screenshots) lines.push(`- ${s}`);
  lines.push('');

  lines.push('## Re-run (Headed)');
  lines.push('- cd dvi_frontend');
  lines.push('- npm run e2e:headed -- tests/e2e/itinerary-7day-headed-live.spec.ts');
  lines.push('');
  lines.push('## Notes');
  lines.push('- This suite runs in headed mode when executed with the command above.');
  lines.push('- Playwright trace/video are already configured in the existing project config (retain-on-failure).');

  return lines.join('\n');
}

test('live headed 7-day itinerary flow with planner edge coverage', async ({ page, request, baseURL }, testInfo) => {
  test.setTimeout(420_000);

  const checks: string[] = [];
  const failures: string[] = [];
  const fixes: string[] = [];
  const remaining: string[] = [];
  const screenshots: string[] = [];

  const startedAt = new Date().toISOString();
  let created: CreatedItinerary | null = null;
  let token = '';

  page.on('dialog', async (dialog) => {
    await dialog.accept();
  });

  try {
    token = await seedAuthToken(page, request);
    created = await createSevenDayItinerary(request);

    checks.push('Created a new realistic 7-day itinerary via authenticated API save path.');
    checks.push('Scenario includes 2-night continuity, via-route data, and a direct-destination day.');

    const detailsBefore = await fetchItineraryDetails(request, token, created.quoteId);
    const daysBefore = Array.isArray(detailsBefore.days) ? detailsBefore.days : [];

    expect(daysBefore.length).toBe(7);
    checks.push('Verified itinerary details API returns 7 route days.');

    const hasTwoNightPattern =
      daysBefore.length >= 2 &&
      String(daysBefore[0].arrival || '').trim() !== '' &&
      String(daysBefore[0].arrival || '').trim().toLowerCase() ===
        String(daysBefore[1].departure || '').trim().toLowerCase();
    expect(hasTwoNightPattern).toBeTruthy();
    checks.push('Validated day-2 continuation behavior against day-1 destination (2-night stay signal).');

    const editRes = await request.get(`${API_BASE_URL}/itineraries/edit/${created.planId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(editRes.ok()).toBeTruthy();
    const editJson = (await editRes.json()) as { routes?: Array<any> };
    const routeRows = Array.isArray(editJson.routes) ? editJson.routes : [];

    const hasViaPersisted = routeRows.some(
      (r) =>
        String(r?.via_route || '').trim().length > 0 ||
        (Array.isArray(r?.via_routes) && r.via_routes.length > 0),
    );
    const hasDirectPersisted = routeRows.some((r) => Number(r?.direct_to_next_visiting_place || 0) === 1);
    expect(hasViaPersisted).toBeTruthy();
    expect(hasDirectPersisted).toBeTruthy();
    checks.push('Validated via-route and direct-destination persistence from itinerary edit API.');

    await page.goto(`${baseURL}/itinerary-details/${encodeURIComponent(created.quoteId)}`, {
      waitUntil: 'domcontentloaded',
    });
    await expect(page).toHaveURL(new RegExp(`/itinerary-details/${created.quoteId}$`), { timeout: 45_000 });
    await expect(page.getByText(/DAY 1 -/i).first()).toBeVisible({ timeout: 45_000 });

    screenshots.push(await saveCheckpointScreenshot(page, testInfo, '01-details-loaded'));

    await expect(page.getByText(/DAY\s+7\s+-/i).first()).toBeVisible({ timeout: 45_000 });
    checks.push('Opened itinerary details page successfully and confirmed day rows from DAY 1 to DAY 7 are visible.');

    const dayCardHeaders = page.locator('h3', { hasText: /^DAY\s+\d+\s+-/i });
    expect(await dayCardHeaders.count()).toBeGreaterThanOrEqual(7);

    const day5 = daysBefore.find((d) => Number(d.dayNumber) === 5) || daysBefore[4];
    expect(day5?.id).toBeTruthy();

    const beforeAttractionKeys = new Set(
      (daysBefore || []).flatMap((d) =>
        (Array.isArray(d.segments) ? d.segments : [])
          .filter((s: any) => String(s?.type || '').toLowerCase() === 'attraction')
          .map((s: any) => `${Number(d.dayNumber)}|${Number(s?.routeHotspotId || s?.route_hotspot_id || 0)}|${String(s?.name || '').trim()}`),
      ),
    );

    const availableHotspotRes = await request.get(
      `${API_BASE_URL}/itineraries/hotspots/available/${Number(day5?.id || 0)}`,
      { headers: { Authorization: `Bearer ${token}` } },
    );
    expect(availableHotspotRes.ok()).toBeTruthy();
    const availableHotspotsJson = (await availableHotspotRes.json()) as Array<{ id: number; name: string }>;
    const pickedHotspot = availableHotspotsJson.find((h) => Number(h.id) > 0);
    expect(pickedHotspot?.id).toBeTruthy();

    const addManualRes = await request.post(`${API_BASE_URL}/itineraries/${created.planId}/manual-hotspot`, {
      headers: { Authorization: `Bearer ${token}` },
      data: {
        routeId: Number(day5?.id || 0),
        hotspotId: Number(pickedHotspot?.id || 0),
      },
    });
    expect(addManualRes.ok()).toBeTruthy();

    const detailsAfterManualAdd = await fetchItineraryDetails(request, token, created.quoteId);
    const allAfterAttractions = (detailsAfterManualAdd.days || []).flatMap((d) =>
      (Array.isArray(d.segments) ? d.segments : [])
        .filter((s: any) => String(s?.type || '').toLowerCase() === 'attraction')
        .map((s: any) => ({
          dayNumber: Number(d.dayNumber),
          routeId: Number(d.id || 0),
          name: String(s?.name || '').trim(),
          routeHotspotId: Number(s?.routeHotspotId || s?.route_hotspot_id || 0),
          hotspotId: Number(s?.hotspotId || 0),
        })),
    );

    const addedCandidates = allAfterAttractions.filter(
      (s) => !beforeAttractionKeys.has(`${s.dayNumber}|${s.routeHotspotId}|${s.name}`),
    );
    const addedSegment = addedCandidates[0];
    expect(addedSegment).toBeTruthy();

    const addedHotspotName = String(addedSegment?.name || pickedHotspot?.name || '').trim();
    const addedRouteHotspotId = Number(addedSegment?.routeHotspotId || 0);
    const addedRouteId = Number(addedSegment?.routeId || 0);

    await page.reload({ waitUntil: 'domcontentloaded' });
    await expect(page.getByText(/DAY\s+1\s+-/i).first()).toBeVisible({ timeout: 30_000 });
    checks.push('Added a manual hotspot and verified persistence via API while keeping details view stable after reload.');

    screenshots.push(await saveCheckpointScreenshot(page, testInfo, '02-manual-hotspot-added'));

    expect(addedRouteHotspotId).toBeGreaterThan(0);
    expect(addedRouteId).toBeGreaterThan(0);
    const deleteRes = await request.delete(
      `${API_BASE_URL}/itineraries/hotspot/${created.planId}/${addedRouteId}/${addedRouteHotspotId}`,
      { headers: { Authorization: `Bearer ${token}` } },
    );
    expect(deleteRes.ok()).toBeTruthy();
    checks.push('Deleted the manually added hotspot using route-scoped delete API for the exact inserted row.');

    const detailsAfterHotspotDelete = await fetchItineraryDetails(request, token, created.quoteId);
    const allAfterDeleteAttractions = (detailsAfterHotspotDelete.days || []).flatMap((d) =>
      (Array.isArray(d.segments) ? d.segments : [])
        .filter((s: any) => String(s?.type || '').toLowerCase() === 'attraction')
        .map((s: any) => Number(s?.routeHotspotId || s?.route_hotspot_id || 0)),
    );
    expect(allAfterDeleteAttractions.includes(addedRouteHotspotId)).toBeFalsy();
    checks.push('Verified the manual hotspot is removed after delete.');

    const detailsBeforeActivityAdd = await fetchItineraryDetails(request, token, created.quoteId);
    const attractionCandidatesForActivity = (detailsBeforeActivityAdd.days || []).flatMap((d) => {
      const segments = Array.isArray(d.segments) ? d.segments : [];
      return segments
        .filter((s: any) => String(s?.type || '').toLowerCase() === 'attraction')
        .map((s: any) => ({
          routeId: Number(d.id || 0),
          routeHotspotId: Number(s?.routeHotspotId || s?.route_hotspot_id || 0),
          hotspotId: Number(s?.hotspotId || 0),
          hotspotName: String(s?.name || '').trim(),
        }));
    });

    let firstAttractionForActivity: {
      routeId: number;
      routeHotspotId: number;
      hotspotId: number;
      hotspotName: string;
    } | null = null;
    let activityToAdd: { id: number; costAdult?: number } | null = null;
    let addActivityWorked = false;

    for (const candidate of attractionCandidatesForActivity) {
      if (candidate.hotspotId <= 0 || candidate.routeId <= 0 || candidate.routeHotspotId <= 0) continue;
      const availableActivitiesRes = await request.get(
        `${API_BASE_URL}/itineraries/activities/available/${candidate.hotspotId}`,
        { headers: { Authorization: `Bearer ${token}` } },
      );
      if (!availableActivitiesRes.ok()) continue;

      const availableActivities = (await availableActivitiesRes.json()) as Array<{ id: number; costAdult?: number }>;
      const validActivities = availableActivities.filter((a) => Number(a.id) > 0);
      if (validActivities.length) {
        firstAttractionForActivity = candidate;
        activityToAdd = validActivities[0];
        for (const act of validActivities) {
          const addActivityRes = await request.post(`${API_BASE_URL}/itineraries/activities/add`, {
            headers: { Authorization: `Bearer ${token}` },
            data: {
              planId: created.planId,
              routeId: candidate.routeId,
              routeHotspotId: candidate.routeHotspotId,
              hotspotId: candidate.hotspotId,
              activityId: Number(act.id || 0),
              amount: Number(act.costAdult || 0),
              skipConflictCheck: true,
            },
          });
          if (addActivityRes.ok()) {
            activityToAdd = act;
            addActivityWorked = true;
            break;
          }
        }
      }

      if (addActivityWorked) {
        break;
      }
    }

    expect(firstAttractionForActivity).toBeTruthy();
    expect(activityToAdd?.id).toBeTruthy();
    expect(addActivityWorked).toBeTruthy();

    await page.reload({ waitUntil: 'domcontentloaded' });
    await expect(page.locator('button[aria-label^="Delete activity"]').first()).toBeVisible({ timeout: 45_000 });
    checks.push('Added an activity via API and confirmed it renders in itinerary details UI.');

    screenshots.push(await saveCheckpointScreenshot(page, testInfo, '03-activity-added'));

    const detailsAfterActivityAdd = await fetchItineraryDetails(request, token, created.quoteId);
    const addedActivity = (detailsAfterActivityAdd.days || []).flatMap((d) => {
      const segments = Array.isArray(d.segments) ? d.segments : [];
      return segments
        .filter((s: any) => String(s?.type || '').toLowerCase() === 'attraction')
        .flatMap((s: any) =>
          (Array.isArray(s?.activities) ? s.activities : []).map((a: any) => ({
            routeId: Number(d.id || 0),
            activityId: Number(a?.id || 0),
          })),
        );
    })[0];

    expect(addedActivity?.activityId).toBeGreaterThan(0);

    const deleteActivityRes = await request.delete(
      `${API_BASE_URL}/itineraries/activities/${created.planId}/${addedActivity.routeId}/${addedActivity.activityId}`,
      { headers: { Authorization: `Bearer ${token}` } },
    );
    expect(deleteActivityRes.ok()).toBeTruthy();
    await page.reload({ waitUntil: 'domcontentloaded' });

    const detailsAfterActivityDelete = await fetchItineraryDetails(request, token, created.quoteId);
    const hasAnyActivity = (detailsAfterActivityDelete.days || []).some((d) =>
      (Array.isArray(d.segments) ? d.segments : []).some(
        (s: any) => String(s?.type || '').toLowerCase() === 'attraction' && Array.isArray(s?.activities) && s.activities.length > 0,
      ),
    );
    expect(hasAnyActivity).toBeFalsy();
    checks.push('Deleted the added activity and verified activity rows are cleared.');

    const day7 = daysBefore.find((d) => Number(d.dayNumber) === 7) || daysBefore[6];
    expect(day7?.id).toBeTruthy();

    const updateTimesRes = await request.patch(
      `${API_BASE_URL}/itineraries/${created.planId}/route/${Number(day7?.id || 0)}/times`,
      {
        headers: { Authorization: `Bearer ${token}` },
        data: {
          startTime: '10:00:00',
          endTime: '20:00:00',
        },
      },
    );
    expect(updateTimesRes.ok()).toBeTruthy();

    await page.reload({ waitUntil: 'domcontentloaded' });
    await expect(page.getByText(/DAY\s+7\s+-/i).first()).toBeVisible({ timeout: 30_000 });
    await expect(page.getByText(/10:00\s*AM/i).first()).toBeVisible({ timeout: 30_000 });
    checks.push('Updated day timing and verified refreshed display reflects the new start time.');

    const detailsAfter = await fetchItineraryDetails(request, token, created.quoteId);
    const daysAfter = Array.isArray(detailsAfter.days) ? detailsAfter.days : [];

    const duplicatesByDay: string[] = [];
    for (const d of daysAfter) {
      const attractions = (Array.isArray(d.segments) ? d.segments : [])
        .filter((s) => String(s?.type || '').toLowerCase() === 'attraction')
        .map((s) => String(s?.name || '').trim())
        .filter(Boolean);

      const dupes = attractions.filter((name, idx) => attractions.indexOf(name) !== idx);
      if (dupes.length) {
        duplicatesByDay.push(`Day ${d.dayNumber}: ${unique(dupes).join(', ')}`);
      }
    }

    expect(duplicatesByDay.length).toBe(0);
    checks.push('Checked API day segments for obvious duplicate attraction rows after operations.');

    const rebuildButtonsCount = await page.getByRole('button', { name: /Rebuild Route/i }).count();
    expect(rebuildButtonsCount).toBe(0);
    checks.push('Verified there is no stale Rebuild Route prompt after add/delete/timing operations and reload.');

    screenshots.push(await saveCheckpointScreenshot(page, testInfo, '04-final-stable-state'));
  } catch (err: any) {
    const message = String(err?.message || err || 'Unknown failure');
    failures.push(message);
    throw err;
  } finally {
    const finishedAt = new Date().toISOString();
    const status = failures.length ? 'FAILED' : 'PASSED';

    if (!fixes.length) {
      fixes.push('No application code changes were required from this test run.');
    }

    if (!remaining.length) {
      remaining.push(
        'If any instability appears in CI/headless, rerun in headed mode and inspect retained trace/video artifacts.',
      );
    }

    const report = buildReportMd({
      startedAt,
      finishedAt,
      status,
      quoteId: created?.quoteId,
      planId: created?.planId,
      checks,
      failures,
      fixes,
      remaining,
      screenshots,
    });

    fs.writeFileSync(ROOT_REPORT_PATH, report, 'utf8');
  }
});
