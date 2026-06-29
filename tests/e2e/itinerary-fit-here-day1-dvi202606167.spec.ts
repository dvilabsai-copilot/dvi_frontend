import { expect, test, type APIRequestContext, type Page } from '@playwright/test';

const API_BASE_URL = process.env.E2E_API_BASE_URL ?? 'http://127.0.0.1:4006/api/v1';
const QUOTE_ID = 'DVI202606167';
const USER_EMAIL =
  process.env.E2E_HOTSPOT_USER ??
  process.env.E2E_VENDOR_USER ??
  process.env.PROD_EMAIL ??
  'admin@dvi.co.in';
const USER_PASSWORD =
  process.env.E2E_HOTSPOT_PASSWORD ??
  process.env.E2E_VENDOR_PASSWORD ??
  process.env.PROD_PASSWORD ??
  'Keerthi@2404ias';

type ItineraryDetailsResponse = {
  planId?: number;
  days?: Array<{
    id?: number;
    dayNumber?: number;
    segments?: Array<{ type?: string }>;
  }>;
};

type AvailableHotspot = {
  id?: number;
  name?: string;
  buttonLabel?: string;
  actionDisabled?: boolean;
  alreadyAdded?: boolean;
};

const TARGET_HOTSPOT_NAME = 'Dhanushkodi and Kothandarama swamy Temple';

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
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

async function seedAuthToken(page: Page, token: string): Promise<void> {
  await page.addInitScript((t) => {
    window.localStorage.setItem('accessToken', t);
  }, token);
}

async function getDayOneRouteAndHotspot(
  request: APIRequestContext,
  token: string,
): Promise<{ planId: number; routeId: number; hotspotId: number; hotspotName: string }> {
  const headers = { Authorization: `Bearer ${token}` };
  const detailsRes = await request.get(
    `${API_BASE_URL}/itineraries/details/${encodeURIComponent(QUOTE_ID)}`,
    { headers },
  );
  expect(detailsRes.ok(), `Failed to fetch itinerary details for ${QUOTE_ID}`).toBeTruthy();

  const details = (await detailsRes.json()) as ItineraryDetailsResponse;
  const planId = Number(details?.planId || 0);
  const dayOne = (details?.days || []).find((day) => Number(day?.dayNumber) === 1);
  const routeId = Number(dayOne?.id || 0);

  expect(planId).toBeGreaterThan(0);
  expect(routeId).toBeGreaterThan(0);

  const availableRes = await request.get(
    `${API_BASE_URL}/itineraries/hotspots/available/${routeId}`,
    { headers },
  );
  expect(availableRes.ok(), `Failed to fetch available hotspots for route ${routeId}`).toBeTruthy();

  const available = (await availableRes.json().catch(() => [])) as AvailableHotspot[];
  const previewable = available.filter(
    (hotspot) => {
      const timingText = String((hotspot as any)?.timings || '').trim().toLowerCase();
      const hasUsableTimings = timingText.length > 0 && timingText !== 'no timings available';
      return (
      Number(hotspot?.id || 0) > 0 &&
      hotspot?.actionDisabled !== true &&
      !hotspot?.alreadyAdded &&
      /preview/i.test(String(hotspot?.buttonLabel || '')) &&
      hasUsableTimings
      );
    },
  );
  const exactCandidate = previewable.find(
    (hotspot) =>
      String(hotspot?.name || '').trim().toLowerCase() === TARGET_HOTSPOT_NAME.toLowerCase(),
  );
  const finalCandidate = exactCandidate || previewable[0] || null;

  expect(finalCandidate?.name, `No previewable hotspot found for route ${routeId}`).toBeTruthy();

  return {
    planId,
    routeId,
    hotspotId: Number(finalCandidate?.id || 0),
    hotspotName: String(finalCandidate?.name || '').trim(),
  };
}

async function openDayOneHotspotModal(page: Page): Promise<void> {
  const addHotspotTriggers = page.getByRole('button', {
    name: /add hotspot|click to add hotspot/i,
  });
  await expect(addHotspotTriggers.first()).toBeVisible({ timeout: 30000 });
  await addHotspotTriggers.first().click();

  await expect(page.getByRole('heading', { name: /hotspot list/i })).toBeVisible({
    timeout: 30000,
  });
  await expect(page.getByText(/proposed timeline/i)).toBeVisible({ timeout: 30000 });
}

test('day 1 fit here flow works for itinerary DVI202606167', async ({
  page,
  request,
  baseURL,
}) => {
  test.setTimeout(300000);

  const token = await loginForToken(request);
  const { planId, routeId, hotspotId, hotspotName } = await getDayOneRouteAndHotspot(request, token);

  await seedAuthToken(page, token);
  await page.goto(`${baseURL}/itinerary-details/${encodeURIComponent(QUOTE_ID)}`, {
    waitUntil: 'domcontentloaded',
  });
  await expect(page).toHaveURL(new RegExp(`/itinerary-details/${QUOTE_ID}$`), {
    timeout: 30000,
  });

  await openDayOneHotspotModal(page);

  const hotspotCard = page.locator(`[data-hotspot-id="${hotspotId}"]`).first();
  await expect(hotspotCard).toBeVisible({ timeout: 30000 });

  const previewButton = hotspotCard.locator('button').last();
  await expect(previewButton).toBeVisible({ timeout: 15000 });
  await previewButton.click();

  await expect(page.getByText(/selected for fit here/i)).toBeVisible({ timeout: 30000 });
  await expect(page.getByText(new RegExp(escapeRegExp(hotspotName), 'i')).first()).toBeVisible({
    timeout: 30000,
  });

  const anchors = page.locator('[data-testid="fit-here-anchor"]');
  await expect(anchors.first()).toBeVisible({ timeout: 30000 });

  await expect(
    page.locator('[data-testid="fit-here-anchor"][data-anchor-intent="AFTER_START"]').first(),
  ).toBeVisible({ timeout: 30000 });

  await expect(
    page.locator('[data-testid="fit-here-anchor"][data-anchor-intent="AFTER_ATTRACTION"]').first(),
  ).toBeVisible({ timeout: 30000 });

  await expect(
    page.locator('[data-testid="fit-here-anchor"][data-anchor-intent="BEFORE_ATTRACTION"]'),
  ).toHaveCount(0);

  await expect(
    page.locator('[data-testid="fit-here-anchor"][data-anchor-intent="BEFORE_HOTEL_CHECKIN"]'),
  ).toHaveCount(0);

  const travelRows = page.locator('[data-testid="fit-here-timeline-row"][data-segment-type="travel"]');
  const travelCount = await travelRows.count();

  for (let index = 0; index < travelCount; index += 1) {
    const travelLabel = await travelRows.nth(index).getAttribute('data-segment-label');
    const matchingTravelAnchor = page.locator(
      `[data-testid="fit-here-anchor"][data-anchor-from="${travelLabel || ''}"]`,
    );
    await expect(matchingTravelAnchor).toHaveCount(0);
  }

  const afterMeenakshiAnchor = page
    .locator('[data-testid="fit-here-anchor"][data-anchor-intent="AFTER_ATTRACTION"][data-anchor-from*="Meenakshi"]')
    .first();

  await expect(afterMeenakshiAnchor).toBeVisible({ timeout: 30000 });
  const anchorFrom = await afterMeenakshiAnchor.getAttribute('data-anchor-from');
  const anchorTo = await afterMeenakshiAnchor.getAttribute('data-anchor-to');
  const anchorLabel = await afterMeenakshiAnchor.getAttribute('data-anchor-label');

  expect(anchorFrom || '').toMatch(/Meenakshi/i);
  expect(anchorLabel || '').toMatch(/After Meenakshi/i);
  expect(anchorTo || '').toBeTruthy();

  const fitPreviewResponsePromise = page.waitForResponse(
    (resp) =>
      resp.request().method() === 'POST' &&
      resp.url().includes(`/itineraries/${planId}/manual-hotspot/fit-preview`),
    { timeout: 90000 },
  );

  await afterMeenakshiAnchor.getByRole('button', { name: /fit here/i }).click();

  const progressText = page.getByText(/optimising this insertion position/i);
  await progressText.isVisible({ timeout: 3000 }).catch(() => false);

  const fitPreviewResponse = await fitPreviewResponsePromise;
  expect(fitPreviewResponse.ok(), `Fit preview failed for route ${routeId}`).toBeTruthy();
  const previewJson = await fitPreviewResponse.json();

  expect(previewJson?.selectedAnchor?.anchorLabel || previewJson?.anchorLabel)
    .toMatch(/After Meenakshi/i);

  expect(JSON.stringify(previewJson?.proposedTimeline || []))
    .toMatch(/Meenakshi/i);

  expect(JSON.stringify(previewJson?.proposedTimeline || []))
    .toMatch(new RegExp(escapeRegExp(hotspotName), 'i'));

  const timelineText = JSON.stringify(previewJson?.proposedTimeline || []);
  const meenakshiIndex = timelineText.toLowerCase().indexOf('meenakshi');
  const selectedHotspotIndex = timelineText.toLowerCase().indexOf(hotspotName.toLowerCase());
  const ramanathaIndex = timelineText.toLowerCase().indexOf('ramanatha');

  expect(meenakshiIndex).toBeGreaterThanOrEqual(0);
  expect(selectedHotspotIndex).toBeGreaterThan(meenakshiIndex);

  if (ramanathaIndex >= 0) {
    expect(selectedHotspotIndex).toBeLessThan(ramanathaIndex);
  }

  const removedText = JSON.stringify(previewJson?.removedHotspots || []).toLowerCase();
  const proposedText = JSON.stringify(previewJson?.proposedTimeline || []).toLowerCase();

  if (removedText.includes('agni')) {
    expect(proposedText).not.toContain('agni teertham');
  }

  await expect(page.getByRole('heading', { name: /fit here preview/i })).toBeVisible({
    timeout: 30000,
  });
  const insertPositionBlock = page.getByText(/insert position/i).locator('..').first();
  await expect(insertPositionBlock).toContainText(/After Meenakshi/i, { timeout: 30000 });
  await expect(
    page.getByText(/optimiser decision log|checking selected hotspot details|reading current itinerary timeline/i).first(),
  ).toBeVisible({
    timeout: 30000,
  });
  await expect(page.getByRole('button', { name: /confirm fit here/i })).toBeVisible({
    timeout: 30000,
  });

  const confirmButton = page.getByRole('button', { name: /confirm fit here/i });
  await expect(confirmButton).toBeVisible({ timeout: 30000 });

  if (previewJson?.resultType === 'FITS_WITH_OPTIONAL_REMOVAL') {
    expect(previewJson?.canConfirm).toBeTruthy();
    await expect(confirmButton).toBeEnabled({ timeout: 30000 });
  }

  if (await confirmButton.isEnabled()) {
    const fitConfirmResponsePromise = page.waitForResponse(
      (resp) =>
        resp.request().method() === 'POST' &&
        resp.url().includes(`/itineraries/${planId}/manual-hotspot/fit-confirm`),
      { timeout: 120000 },
    );

    await confirmButton.click();
    const fitConfirmResponse = await fitConfirmResponsePromise;
    expect(fitConfirmResponse.ok(), `Fit confirm failed for route ${routeId}`).toBeTruthy();

    await expect(page.getByRole('heading', { name: /fit here preview/i })).toHaveCount(0, {
      timeout: 30000,
    });
    await expect(page.getByText(/hotspot inserted successfully|timeline updated/i)).toBeVisible({
      timeout: 30000,
    });
  } else {
    await expect(
      page.getByText(/cannot fit here without affecting priority hotspots|cannot fit at this position/i).first(),
    ).toBeVisible({ timeout: 30000 });
  }

  await page.screenshot({
    path: 'test-results/manual-hotspot-screenshots/dvi202606167-day1-fit-here-result.png',
    fullPage: true,
  });
});
