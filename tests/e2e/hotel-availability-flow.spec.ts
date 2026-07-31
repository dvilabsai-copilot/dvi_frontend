import { expect, test } from './fixtures/auth.fixture';
import type { Page } from '@playwright/test';

const QUOTE_ID = String(process.env.E2E_ITINERARY_QUOTE_ID || '').trim();

type HotelAvailabilityPayload = {
  hotelDetails?: {
    hotels?: Array<Record<string, unknown>>;
    hotelAvailability?: Record<string, unknown>;
  };
  hotels?: Array<Record<string, unknown>>;
  hotelAvailability?: Record<string, unknown>;
  changeSummary?: {
    hasChanges?: boolean;
    changes?: Array<Record<string, unknown>>;
  } | null;
};

function hotelPath(url: string): string {
  return new URL(url).pathname;
}

async function openHotelDetails(page: Page) {
  const requestPaths: string[] = [];
  page.on('request', (request) => {
    const path = hotelPath(request.url());
    if (path.includes('/api/v1/itineraries/')) requestPaths.push(path);
  });

  const detailsResponsePromise = page.waitForResponse((response) => (
    response.request().method() === 'GET' &&
    hotelPath(response.url()).includes(`/api/v1/itineraries/details/${QUOTE_ID}`)
  ));
  const persistedResponsePromise = page.waitForResponse((response) => (
    response.request().method() === 'GET' &&
    hotelPath(response.url()).includes(`/api/v1/itineraries/hotel_details/${QUOTE_ID}`)
  ));

  await page.goto(`/itinerary-details/${encodeURIComponent(QUOTE_ID)}`, { waitUntil: 'domcontentloaded' });
  const [detailsResponse, persistedResponse] = await Promise.all([
    detailsResponsePromise,
    persistedResponsePromise,
  ]);

  expect(detailsResponse.ok(), `Itinerary details returned ${detailsResponse.status()}`).toBeTruthy();
  expect(persistedResponse.ok(), `Persisted hotel details returned ${persistedResponse.status()}`).toBeTruthy();
  await expect(page.getByRole('heading', { name: 'HOTEL LIST', exact: true })).toBeVisible();

  return {
    requestPaths,
    persistedPayload: await persistedResponse.json() as HotelAvailabilityPayload,
  };
}

function hotelRows(payload: HotelAvailabilityPayload): Array<Record<string, unknown>> {
  return Array.isArray(payload.hotels)
    ? payload.hotels
    : Array.isArray(payload.hotelDetails?.hotels)
      ? payload.hotelDetails.hotels
      : [];
}

function availabilityMeta(payload: HotelAvailabilityPayload): Record<string, unknown> {
  return (payload.hotelAvailability || payload.hotelDetails?.hotelAvailability || {}) as Record<string, unknown>;
}

function selectedHotelNames(payload: HotelAvailabilityPayload): string[] {
  return hotelRows(payload)
    .filter((row) => row.isSelected === true)
    .map((row) => String(row.hotelName || '').trim())
    .filter(Boolean);
}

async function renderedHotelDayKeys(page: Page): Promise<string[]> {
  const hotelTables = page.locator('table').filter({ hasText: 'DAY' });
  const tableCount = await hotelTables.count();
  expect(tableCount, 'The hotel list table must be rendered').toBe(1);

  const rows = hotelTables.locator('tbody tr');
  const texts = await rows.allTextContents();
  return Array.from(new Set(
    texts
      .map((text) => text.match(/Day\s+(\d+)/i)?.[1])
      .filter((day): day is string => Boolean(day)),
  ));
}

function hasHotelMutation(path: string): boolean {
  return /\/hotel_details\/[^/]+\/(check-availability|reset|offline-availability)$/.test(path);
}

test.describe('Hotel availability flow', () => {
  test.skip(!QUOTE_ID, 'Set E2E_ITINERARY_QUOTE_ID to an E2E-owned itinerary fixture.');

  test('loads itinerary details before persisted hotels and keeps every stay row', async ({ adminPage }) => {
    const { requestPaths, persistedPayload } = await openHotelDetails(adminPage);
    const detailsIndex = requestPaths.findIndex((path) => path.includes(`/itineraries/details/${QUOTE_ID}`));
    const hotelIndex = requestPaths.findIndex((path) => path.includes(`/itineraries/hotel_details/${QUOTE_ID}`));

    expect(detailsIndex, 'The itinerary details request must be made').toBeGreaterThanOrEqual(0);
    expect(hotelIndex, 'The persisted hotel request must be made').toBeGreaterThan(detailsIndex);
    expect(requestPaths.some(hasHotelMutation), 'Edit-mode load must not call live hotel mutations').toBe(false);

    const meta = availabilityMeta(persistedPayload);
    const expectedStayCount = Number(meta.totalSearchRoutes || 0);
    const dayKeys = await renderedHotelDayKeys(adminPage);
    expect(expectedStayCount, 'Persisted response must identify the number of hotel stays').toBeGreaterThan(0);
    expect(dayKeys.length, 'Every hotel stay must have a rendered day row').toBe(expectedStayCount);

    // This catches the synthetic "Selected hotel -3*" rows seen in the UI.
    await expect(adminPage.getByText(/Selected hotel\s*-\d+\*/i)).toHaveCount(0);

    const selectedNames = selectedHotelNames(persistedPayload);
    for (const hotelName of selectedNames) {
      await expect(adminPage.getByText(hotelName, { exact: true }).first()).toBeVisible();
    }
  });

  test('exposes one scoped offline action for each empty stay and keeps the global toggle separate', async ({ adminPage }) => {
    const { persistedPayload } = await openHotelDetails(adminPage);
    const meta = availabilityMeta(persistedPayload);
    const emptyStayCount = Number(meta.emptySearchRoutes || 0);

    const globalToggle = adminPage.getByRole('checkbox', { name: 'Show Offline Hotels', exact: true });
    expect(await globalToggle.count(), 'The global offline-hotels toggle must exist').toBe(1);

    const scopedButtons = adminPage.getByRole('button', { name: 'Show Offline Hotels', exact: true });
    expect(
      await scopedButtons.count(),
      'Each empty stay must own its offline action; the global toggle is not a substitute',
    ).toBe(emptyStayCount);

    if (emptyStayCount > 0) {
      const firstScopedButton = scopedButtons.nth(0);
      const parentRow = firstScopedButton.locator('xpath=ancestor::tr[1]');
      await expect(parentRow).toContainText(/Day\s+\d+/i);
      await expect(parentRow).toContainText(/Show Offline Hotels/i);
    }
  });

  test('global offline fetch preserves the existing day rows', async ({ adminPage }) => {
    test.skip(process.env.E2E_ALLOW_WRITES?.toLowerCase() !== 'true', 'Enable E2E_ALLOW_WRITES=true for hotel availability mutations.');

    const before = await openHotelDetails(adminPage);
    const beforeDayKeys = await renderedHotelDayKeys(adminPage);
    const requestPromise = adminPage.waitForRequest((request) => (
      request.request().method() === 'POST' && hotelPath(request.url()).endsWith('/offline-availability')
    ));
    const responsePromise = adminPage.waitForResponse((response) => (
      response.request().method() === 'POST' && hotelPath(response.url()).endsWith('/offline-availability')
    ));

    await adminPage.getByRole('checkbox', { name: 'Show Offline Hotels', exact: true }).setChecked(true);
    const [offlineRequest, offlineResponse] = await Promise.all([requestPromise, responsePromise]);
    expect(offlineRequest.postDataJSON()).toEqual({});
    expect(offlineResponse.ok(), `Offline fetch returned ${offlineResponse.status()}`).toBeTruthy();

    const afterPayload = await offlineResponse.json() as HotelAvailabilityPayload;
    const afterDayKeys = await renderedHotelDayKeys(adminPage);
    expect(afterDayKeys).toEqual(beforeDayKeys);
    expect(selectedHotelNames(afterPayload)).toEqual(expect.arrayContaining(selectedHotelNames(before.persistedPayload)));
  });

  test('reset rebuilds fresh hotel availability without the stale unavailable message', async ({ adminPage }) => {
    test.skip(process.env.E2E_ALLOW_WRITES?.toLowerCase() !== 'true', 'Enable E2E_ALLOW_WRITES=true for hotel availability mutations.');

    await openHotelDetails(adminPage);
    const vehicleRequests: string[] = [];
    adminPage.on('request', (request) => {
      const path = hotelPath(request.url());
      if (/\/vehicle-build|\/vehicle-build-status|\/vehicles\//i.test(path)) vehicleRequests.push(path);
    });
    const resetResponsePromise = adminPage.waitForResponse((response) => (
      response.request().method() === 'POST' && hotelPath(response.url()).endsWith('/reset')
    ));

    const resetButton = adminPage.getByRole('button', { name: 'Reset Hotels', exact: true });
    expect(await resetButton.count()).toBe(1);
    await resetButton.click();
    const resetResponse = await resetResponsePromise;
    expect(resetResponse.ok(), `Reset returned ${resetResponse.status()}`).toBeTruthy();

    const resetPayload = await resetResponse.json() as HotelAvailabilityPayload;
    const resetMeta = availabilityMeta(resetPayload);
    const expectedStayCount = Number(resetMeta.totalSearchRoutes || 0);
    expect(expectedStayCount).toBeGreaterThan(0);
    expect(await renderedHotelDayKeys(adminPage)).toHaveLength(expectedStayCount);
    await expect(adminPage.getByText(/Previously selected hotel unavailable\s*[—-]\s*refresh availability/i)).toHaveCount(0);
    await expect(adminPage.getByText(/Selected hotel\s*-\d+\*/i)).toHaveCount(0);

    // Reset is a hotel-only action and must not trigger vehicle recovery APIs.
    expect(vehicleRequests).toEqual([]);
  });

  test('refresh presents the comparison modal only when the backend reports changes', async ({ adminPage }) => {
    test.skip(process.env.E2E_ALLOW_WRITES?.toLowerCase() !== 'true', 'Enable E2E_ALLOW_WRITES=true for hotel availability mutations.');

    const before = await openHotelDetails(adminPage);
    const beforeDayKeys = await renderedHotelDayKeys(adminPage);
    const refreshButton = adminPage.getByRole('button', { name: /^(Check|Refresh) Availability$/, exact: true });
    expect(await refreshButton.count()).toBe(1);

    const refreshResponsePromise = adminPage.waitForResponse((response) => (
      response.request().method() === 'POST' && hotelPath(response.url()).endsWith('/check-availability')
    ));
    await refreshButton.click();
    const refreshResponse = await refreshResponsePromise;
    expect(refreshResponse.ok(), `Refresh returned ${refreshResponse.status()}`).toBeTruthy();

    const refreshPayload = await refreshResponse.json() as HotelAvailabilityPayload;
    const changed = refreshPayload.changeSummary?.hasChanges === true;
    const comparisonHeading = adminPage.getByRole('heading', { name: 'Hotel Availability Updated', exact: true });
    if (changed) {
      await expect(comparisonHeading).toBeVisible();
      const okButton = adminPage.getByRole('button', { name: 'OK', exact: true });
      expect(await okButton.count()).toBe(1);
      await okButton.click();
    } else {
      await expect(comparisonHeading).toHaveCount(0);
    }

    expect(await renderedHotelDayKeys(adminPage)).toEqual(beforeDayKeys);
    await expect(adminPage.getByText(/Previously selected hotel unavailable\s*[—-]\s*refresh availability/i)).toHaveCount(0);
    expect(selectedHotelNames(refreshPayload)).toEqual(expect.arrayContaining(selectedHotelNames(before.persistedPayload)));
  });
});
