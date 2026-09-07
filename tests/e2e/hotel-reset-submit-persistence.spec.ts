import { expect, test } from './fixtures/auth.fixture';
import type { Page } from '@playwright/test';

const quoteId = String(process.env.E2E_ITINERARY_QUOTE_ID || '').trim();

type PackageSnapshot = { label: string; rows: string[] };

async function hotelListSnapshot(page: Page): Promise<PackageSnapshot[]> {
  const tabs = page.getByRole('tablist', { name: 'Hotel recommendation packages' }).getByRole('tab');
  const tabCount = await tabs.count();
  expect(tabCount, 'The itinerary must expose four recommendation packages').toBe(4);

  const hotelTable = page.locator('table:visible').filter({ hasText: 'DAY' });
  expect(await hotelTable.count(), 'The hotel list table must be rendered').toBe(1);

  const packages: PackageSnapshot[] = [];
  for (let index = 0; index < tabCount; index += 1) {
    const tab = tabs.nth(index);
    await tab.click();
    await expect(tab).toHaveAttribute('aria-selected', 'true');
    packages.push({
      label: (await tab.innerText()).replace(/\s+/g, ' ').trim(),
      rows: (await hotelTable.locator('tbody tr').allTextContents())
        .map((row) => row.replace(/\s+/g, ' ').trim())
        .filter(Boolean),
    });
  }
  return packages;
}

async function openDetails(page: Page): Promise<void> {
  await page.goto(`/itinerary-details/${encodeURIComponent(quoteId)}`, { waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('heading', { name: 'HOTEL LIST', exact: true })).toBeVisible();
}

test.describe('Persisted-first automatic hotel validation', () => {
  test.skip(!quoteId, 'Set E2E_ITINERARY_QUOTE_ID to the itinerary used for this regression test.');

  test('renders persisted packages and validates exactly once per page lifecycle', async ({ adminPage }, testInfo) => {
    test.setTimeout(180_000);
    await adminPage.route('**/uploads/**', async (route) => {
      await route.fulfill({ status: 204 });
    });
    const requestSequence: string[] = [];
    let validationRequestCount = 0;
    adminPage.on('request', (request) => {
      const pathname = new URL(request.url()).pathname;
      if (pathname.endsWith(`/hotel_details/${quoteId}/persisted`)) {
        requestSequence.push('persisted');
      }
      if (
        request.method() === 'POST' &&
        pathname.endsWith(`/hotel_details/${quoteId}/check-availability`)
      ) {
        requestSequence.push('validation');
        validationRequestCount += 1;
      }
    });

    const validationResponsePromise = adminPage.waitForResponse((response) => (
      response.request().method() === 'POST' &&
      new URL(response.url()).pathname.endsWith(`/hotel_details/${quoteId}/check-availability`)
    ));
    await openDetails(adminPage);

    const persistedPackages = await hotelListSnapshot(adminPage);
    await expect(adminPage.getByRole('button', {
      name: /Check Availability|Refresh Availability|Reset Availability|Rebuild Hotels/,
    })).toHaveCount(0);

    const validationResponse = await validationResponsePromise;
    expect(validationResponse.ok(), `Validation returned ${validationResponse.status()}`).toBeTruthy();
    expect(requestSequence.indexOf('persisted')).toBeGreaterThanOrEqual(0);
    expect(requestSequence.indexOf('validation')).toBeGreaterThan(requestSequence.indexOf('persisted'));
    expect(validationRequestCount).toBe(1);
    expect(
      new Set(persistedPackages.map((hotelPackage) => JSON.stringify(hotelPackage.rows))).size,
      'Every recommendation tab rendered the same hotel rows',
    ).toBeGreaterThan(1);

    expect(validationRequestCount, 'Recommendation tab changes retriggered validation').toBe(1);

    const evidence = { quoteId, requestSequence, validationRequestCount, persistedPackages };
    await test.info().attach('hotel-automatic-validation.json', {
      body: JSON.stringify(evidence, null, 2),
      contentType: 'application/json',
    });
    console.log(JSON.stringify(evidence, null, 2));
    await adminPage.screenshot({
      path: testInfo.outputPath('hotel-automatic-validation.png'),
      fullPage: false,
    });
    // Let the shared network monitor observe request completion before the
    // fixture tears down the page.
    await adminPage.waitForTimeout(1_000);
  });
});
