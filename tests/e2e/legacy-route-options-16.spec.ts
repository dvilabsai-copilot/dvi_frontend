import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { expect, test, type APIRequestContext, type Page } from '@playwright/test';
import { loginForToken } from './booking-engine-test-utils';

const FRONTEND_BASE_URL = process.env.E2E_FRONTEND_BASE_URL ?? 'http://localhost:8080';
const TEST_DIR = path.dirname(fileURLToPath(import.meta.url));
const FIXTURE_PATH = path.resolve(TEST_DIR, 'generated', 'legacy-route-options-16.json');

type LegacyRouteFixture = {
  primaryQuoteId: string;
  quotes: string[];
  routeOptions: Array<{ quoteId: string; label: string }>;
  storageMap: Record<string, string>;
};

function readFixture(): LegacyRouteFixture {
  if (!fs.existsSync(FIXTURE_PATH)) {
    throw new Error(`Legacy route fixture not found: ${FIXTURE_PATH}`);
  }

  const raw = fs.readFileSync(FIXTURE_PATH, 'utf8');
  const parsed = JSON.parse(raw) as LegacyRouteFixture;

  expect(parsed.primaryQuoteId, 'primaryQuoteId missing from legacy route fixture').toBeTruthy();
  expect(Array.isArray(parsed.quotes), 'quotes missing from legacy route fixture').toBeTruthy();
  expect(parsed.quotes.length, 'quotes missing from legacy route fixture').toBeGreaterThan(0);
  expect(Array.isArray(parsed.routeOptions), 'routeOptions missing from legacy route fixture').toBeTruthy();
  expect(Object.keys(parsed.storageMap || {}).length, 'storageMap missing from legacy route fixture').toBeGreaterThan(0);

  return parsed;
}

async function seedLegacyRouteStorage(page: Page, request: APIRequestContext, fixture: LegacyRouteFixture) {
  const token = await loginForToken(request);
  await page.addInitScript(
    ({ authToken, storageMap }) => {
      window.localStorage.setItem('accessToken', authToken);
      Object.entries(storageMap || {}).forEach(([key, value]) => {
        window.localStorage.setItem(key, value);
      });
    },
    { authToken: token, storageMap: fixture.storageMap },
  );
}

test('legacy 16 route options load cleanly when clicking every route tab', async ({ page, request }) => {
  test.setTimeout(240_000);

  const fixture = readFixture();
  const networkFailures: string[] = [];
  const pageErrors: string[] = [];

  page.on('pageerror', (error) => {
    pageErrors.push(String(error?.message || error));
  });

  page.on('response', async (response) => {
    const url = response.url();
    const isRelevantApi =
      url.includes('/api/v1/itineraries/details/') ||
      url.includes('/api/v1/itineraries/hotel_details/') ||
      url.includes('/api/v1/itineraries/hotel_room_details/');

    if (!isRelevantApi) return;
    if (response.status() < 400) return;

    const body = await response.text().catch(() => '');
    networkFailures.push(`${response.status()} ${url} ${body}`.trim());
  });

  await seedLegacyRouteStorage(page, request, fixture);

  const firstQuoteId = fixture.primaryQuoteId;
  await page.goto(`${FRONTEND_BASE_URL}/itinerary-details/${encodeURIComponent(firstQuoteId)}`, {
    waitUntil: 'domcontentloaded',
  });

  await expect(page.getByText('Tour Itinerary Plan')).toBeVisible({ timeout: 120_000 });
  await expect(page.getByText(firstQuoteId)).toBeVisible({ timeout: 120_000 });
  await expect(page.getByRole('button', { name: 'Route 16', exact: true })).toBeVisible({ timeout: 120_000 });

  for (let index = 0; index < fixture.routeOptions.length; index += 1) {
    const routeOption = fixture.routeOptions[index];
    const label = routeOption.label || `Route ${index + 1}`;
    const quoteId = String(routeOption.quoteId || '').trim();

    const routeButton = page.getByRole('button', { name: label, exact: true }).first();
    await routeButton.scrollIntoViewIfNeeded();

    if (index > 0) {
      const detailsResponsePromise = page.waitForResponse((response) => {
        return (
          response.url().includes(`/api/v1/itineraries/details/${encodeURIComponent(quoteId)}`) &&
          response.status() < 400
        );
      }, { timeout: 120_000 }).catch(() => null);

      await routeButton.click();
      await page.waitForURL(new RegExp(`/itinerary-details/${quoteId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`), {
        timeout: 120_000,
      });
      await detailsResponsePromise;
    }

    await expect(page.getByText(quoteId)).toBeVisible({ timeout: 120_000 });
    await expect(page.getByRole('button', { name: label, exact: true })).toBeVisible({ timeout: 120_000 });
  }

  expect(networkFailures, `Relevant itinerary API failures detected:\n${networkFailures.join('\n')}`).toEqual([]);
  expect(pageErrors, `Browser page errors detected:\n${pageErrors.join('\n')}`).toEqual([]);
});
