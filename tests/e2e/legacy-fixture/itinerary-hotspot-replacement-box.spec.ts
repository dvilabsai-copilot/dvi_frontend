import { expect, test, type APIRequestContext, type Page } from '@playwright/test';

const API_BASE_URL = process.env.E2E_API_BASE_URL!;
const QUOTE_ID = process.env.E2E_ITINERARY_QUOTE_ID?.trim() ?? '';
const USER_EMAIL =
  process.env.E2E_ADMIN_EMAIL!;
const USER_PASSWORD =
  process.env.E2E_ADMIN_PASSWORD!;

type JsonRecord = Record<string, unknown>;

function asRecord(value: unknown): JsonRecord {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as JsonRecord : {};
}

async function loginForToken(request: APIRequestContext): Promise<string> {
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

async function seedAuthToken(page: Page, request: APIRequestContext): Promise<void> {
  const token = await loginForToken(request);
  await page.addInitScript((t) => {
    window.localStorage.setItem('accessToken', t);
  }, token);
}

async function openHotspotModal(page: Page): Promise<void> {
  const trigger = page.getByRole('button', { name: /add hotspot|click to add hotspot/i }).first();
  await expect(trigger).toBeVisible({ timeout: 30000 });
  await trigger.click();

  await expect(page.getByRole('heading', { name: /hotspot list/i })).toBeVisible({ timeout: 30000 });
  await expect(page.getByText(/proposed timeline/i)).toBeVisible({ timeout: 30000 });
}

async function findReplacementCandidate(
  request: APIRequestContext,
  token: string,
  routeId: number,
): Promise<{ id: number; name: string } | null> {
  const availableRes = await request.get(`${API_BASE_URL}/itineraries/hotspots/available/${routeId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!availableRes.ok()) return null;

  const available = (await availableRes.json().catch(() => [])) as Array<{ id?: number; name?: string }>;
  const hotspots = Array.isArray(available) ? available.filter((h) => Number(h?.id) > 0) : [];

  // Keep this probe short so tests stay stable in slow environments.
  for (const hotspot of hotspots.slice(0, 6)) {
    const hotspotId = Number(hotspot.id);
    const previewRes = await request
      .post(`${API_BASE_URL}/itineraries/292/manual-hotspot/preview`, {
        headers: { Authorization: `Bearer ${token}` },
        timeout: 15000,
        data: {
          routeId,
          hotspotId,
          anchorType: 'after_travel',
          anchorIndex: 0,
          allowTopPriorityRemoval: false,
          selectedHotspotIds: [hotspotId],
        },
      })
      .catch(() => null);

    if (!previewRes || !previewRes.ok()) continue;
    const body = asRecord(await previewRes.json().catch(() => ({})));
    const resolution = asRecord(body.resolution);
    const topPriorityAffected = Array.isArray(resolution?.topPriorityAffected)
      ? resolution.topPriorityAffected.length
      : 0;
    const removedTopPriority = Array.isArray(resolution?.removedTopPriorityHotspots)
      ? resolution.removedTopPriorityHotspots.length
      : 0;

    if (resolution?.requiresConfirmation === true || topPriorityAffected > 0 || removedTopPriority > 0) {
      return {
        id: hotspotId,
        name: String(hotspot?.name || '').trim(),
      };
    }
  }

  return null;
}

test('shows replacement confirmation box when preview implies hotspot removals', async ({ page, request, baseURL }) => {
  test.skip(!QUOTE_ID, 'Set E2E_ITINERARY_QUOTE_ID for this legacy itinerary fixture.');
  test.setTimeout(240000);

  const token = await loginForToken(request);

  const detailsRes = await request.get(
    `${API_BASE_URL}/itineraries/details/${encodeURIComponent(QUOTE_ID)}`,
    { headers: { Authorization: `Bearer ${token}` } },
  );
  expect(detailsRes.ok()).toBeTruthy();

  const details = asRecord(await detailsRes.json());
  const days = Array.isArray(details.days) ? details.days.map(asRecord) : [];
  const routeId = Number(days[0]?.id || 0);
  expect(routeId).toBeGreaterThan(0);

  const replacementCandidate = await findReplacementCandidate(request, token, routeId);

  await page.addInitScript((t) => {
    window.localStorage.setItem('accessToken', t);
  }, token);

  await page.goto(`${baseURL}/itinerary-details/${encodeURIComponent(QUOTE_ID)}`, {
    waitUntil: 'domcontentloaded',
  });
  await expect(page).toHaveURL(new RegExp(`/itinerary-details/${QUOTE_ID}$`), { timeout: 30000 });

  await openHotspotModal(page);

  let replacementDetected = false;
  const previewButtons = page.getByRole('button', { name: /^(preview|refresh)$/i });
  const previewCount = await previewButtons.count();

  if (previewCount === 0) {
    test.skip(true, 'No Preview/Refresh actions available in current hotspot modal state.');
  }

  if (replacementCandidate?.name) {
    const card = page.locator('div').filter({ hasText: new RegExp(replacementCandidate.name, 'i') }).first();
    await expect(card).toBeVisible({ timeout: 30000 });

    const previewBtn = card.getByRole('button', { name: /^(preview|refresh)$/i }).first();
    await expect(previewBtn).toBeVisible({ timeout: 15000 });

    const responsePromise = page.waitForResponse(
      (resp) =>
        resp.request().method() === 'POST' &&
        /\/itineraries\/\d+\/manual-hotspot\/preview(\?|$)/.test(resp.url()),
      { timeout: 90000 },
    );

    await previewBtn.click();
    const response = await responsePromise;
    expect(response.ok()).toBeTruthy();

    replacementDetected = true;
  } else {
    // Fallback for data states with no explicit replacement candidate in API precheck.
    if (previewCount > 0) {
      await previewButtons.first().click();
    }
  }

  if (!replacementDetected) {
    test.skip(true, 'No priority-replacement scenario available for current itinerary data.');
  }

  await expect(page.getByText(/replace priority hotspot\?/i)).toBeVisible({ timeout: 15000 });
  await expect(page.getByRole('button', { name: /confirm replace/i })).toBeVisible({ timeout: 15000 });
  await expect(page.getByRole('button', { name: /^cancel$/i })).toBeVisible({ timeout: 15000 });

  await page.screenshot({ path: 'test-results/manual-hotspot-screenshots/hotspot-replacement-box-result.png', fullPage: true });
});
