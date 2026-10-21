import { expect, test, type Page } from './fixtures/auth.fixture';
import {
  assertBackendPricingContract,
  formatOccupancyCase,
  getBackendPayable,
  getSelectedBackendRows,
  parseCurrency,
  type HotelPricingPayload,
  type PricingRecord,
} from '../../src/test/hotelPricingParity.utils';

const quoteIds = (process.env.E2E_HOTEL_PARITY_ITINERARIES || '')
  .split(',')
  .map((value) => value.trim())
  .filter(Boolean);

const requiredCases = (process.env.E2E_HOTEL_PARITY_REQUIRED_CASES || '')
  .split(',')
  .map((value) => value.trim())
  .filter(Boolean);

type DetailsPayload = PricingRecord & {
  financialSummary?: PricingRecord;
  roomCount?: number;
  extraBed?: number;
  childWithBed?: number;
  childWithoutBed?: number;
};

function pathname(url: string): string {
  return new URL(url).pathname;
}

function isDetailsResponse(response: { request(): { method(): string }; url(): string }, quoteId: string): boolean {
  return response.request().method() === 'GET' && pathname(response.url()).includes(`/itineraries/details/${quoteId}`);
}

function isHotelResponse(response: { request(): { method(): string }; url(): string }, quoteId: string): boolean {
  const path = pathname(response.url());
  return response.request().method() === 'GET'
    && path.includes(`/itineraries/hotel_details/${quoteId}`)
    && !path.endsWith('/check-availability');
}

async function openItinerary(page: Page, quoteId: string): Promise<{ details: DetailsPayload; hotels: HotelPricingPayload }> {
  const detailsPromise = page.waitForResponse((response) => isDetailsResponse(response, quoteId));
  const hotelPromise = page.waitForResponse((response) => isHotelResponse(response, quoteId));
  await page.goto(`/itinerary-details/${encodeURIComponent(quoteId)}`, { waitUntil: 'domcontentloaded' });
  const [detailsResponse, hotelResponse] = await Promise.all([detailsPromise, hotelPromise]);
  expect(detailsResponse.ok(), `Details API returned ${detailsResponse.status()}`).toBeTruthy();
  expect(hotelResponse.ok(), `Hotel API returned ${hotelResponse.status()}`).toBeTruthy();
  return {
    details: await detailsResponse.json() as DetailsPayload,
    hotels: await hotelResponse.json() as HotelPricingPayload,
  };
}

function apiRowsForGroup(payload: HotelPricingPayload, groupType: number): PricingRecord[] {
  return getSelectedBackendRows(payload, groupType);
}

async function verifyVisibleGroup(page: Page, payload: HotelPricingPayload, groupType: number): Promise<void> {
  const table = page.locator(`[data-testid="hotel-list-table"][data-group-type="${groupType}"]:visible`);
  await expect(table, `Visible hotel table for group ${groupType}`).toHaveCount(1);

  for (const apiRow of apiRowsForGroup(payload, groupType)) {
    const routeId = String(apiRow.itineraryRouteId || apiRow.routeId || '');
    const date = String(apiRow.date || apiRow.checkInDate || '').slice(0, 10);
    const row = table.locator(`[data-testid="hotel-row"][data-hotel-route-id="${routeId}"][data-hotel-date="${date}"]`);
    await expect(row, `Rendered row ${routeId}/${date}`).toHaveCount(1);
    await expect(row).toContainText(String(apiRow.hotelName || '').trim());

    const renderedTotal = parseCurrency(await row.getByTestId('hotel-row-total').innerText());
    expect(renderedTotal, `Row ${apiRow.hotelName || routeId} ${date}`).toBeCloseTo(getBackendPayable(apiRow), 2);
  }
}

async function verifyRecommendationTabs(page: Page, payload: HotelPricingPayload): Promise<void> {
  const tabs = Array.isArray(payload.hotelTabs) ? payload.hotelTabs : [];
  expect(tabs.length, 'The API must return recommendation packages').toBeGreaterThan(0);

  for (let index = 0; index < tabs.length; index += 1) {
    const tab = tabs[index];
    const groupType = Number(tab.groupType || index + 1);
    const tabButton = page.getByTestId(`hotel-recommendation-${index + 1}`);
    await expect(tabButton).toHaveCount(1);
    expect(parseCurrency(await tabButton.getByTestId('hotel-recommendation-total').innerText()))
      .toBeCloseTo(Number(tab.totalAmount), 2);
    await tabButton.click();
    await expect(tabButton).toHaveAttribute('aria-selected', 'true');
    await verifyVisibleGroup(page, payload, groupType);
  }
}

function verifyRequiredCases(observedCases: Set<string>): void {
  for (const requiredCase of requiredCases) {
    const requiredParts = requiredCase.split('|').map((part) => part.trim()).filter(Boolean);
    const found = Array.from(observedCases).some((observed) => {
      const observedParts = new Set(observed.split('|'));
      return requiredParts.every((part) => observedParts.has(part));
    });
    expect(found, `Required provider/occupancy case was not observed: ${requiredCase}\nObserved: ${Array.from(observedCases).join(', ')}`).toBe(true);
  }
}

test.describe('Hotel API-to-UI pricing parity', () => {
  test.skip(quoteIds.length === 0, 'Set E2E_HOTEL_PARITY_ITINERARIES to comma-separated staging itinerary IDs.');

  test('matches backend totals for every provider, package, stay, and reload', async ({ adminPage }, testInfo) => {
    test.setTimeout(300_000);
    expect(requiredCases.length, 'Set E2E_HOTEL_PARITY_REQUIRED_CASES so the provider/occupancy matrix is explicit').toBeGreaterThan(0);
    const observedCases = new Set<string>();
    const evidence: Array<Record<string, unknown>> = [];

    for (const quoteId of quoteIds) {
      const { details, hotels } = await openItinerary(adminPage, quoteId);
      const contract = assertBackendPricingContract(hotels, quoteId);
      expect(contract.breakdownChecked, `${quoteId}: no complete backend breakdown was available`).toBeGreaterThan(0);
      await expect(adminPage.getByRole('heading', { name: 'HOTEL LIST', exact: true })).toBeVisible();

      const detailsSummary = details.financialSummary || {};
      const backendOverall = Number(detailsSummary.netPayable ?? detailsSummary.totalAmount ?? details.overallCost ?? 0);
      if (Number.isFinite(backendOverall) && backendOverall > 0) {
        const renderedOverall = parseCurrency(await adminPage.getByTestId('overall-trip-cost').innerText());
        expect(renderedOverall, `${quoteId}: overall trip cost`).toBe(Math.round(backendOverall));
      }

      for (const record of contract.selectedRecords) {
        observedCases.add(formatOccupancyCase(record, details));
      }
      await adminPage.getByTestId('display-hotel-rates').check();
      await verifyRecommendationTabs(adminPage, hotels);

      await adminPage.reload({ waitUntil: 'domcontentloaded' });
      const reloaded = await openItinerary(adminPage, quoteId);
      assertBackendPricingContract(reloaded.hotels, `${quoteId} after reload`);
      await expect(adminPage.getByRole('heading', { name: 'HOTEL LIST', exact: true })).toBeVisible();
      await verifyRecommendationTabs(adminPage, reloaded.hotels);

      const firstGroup = Number(reloaded.hotels.hotelTabs?.[0]?.groupType || 1);
      const firstRow = apiRowsForGroup(reloaded.hotels, firstGroup)[0];
      if (firstRow) {
        const routeId = String(firstRow.itineraryRouteId || firstRow.routeId || '');
        const date = String(firstRow.date || firstRow.checkInDate || '').slice(0, 10);
        const row = adminPage.locator(`[data-testid="hotel-list-table"][data-group-type="${firstGroup}"]:visible [data-testid="hotel-row"][data-hotel-route-id="${routeId}"][data-hotel-date="${date}"]`);
        await row.getByLabel('Show hotel price breakdown').hover();
        const grandTotal = adminPage.getByText('Grand Total', { exact: true }).last().locator('..');
        await expect(grandTotal).toContainText(getBackendPayable(firstRow).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
      }

      evidence.push({ quoteId, providers: contract.providers, breakdownChecked: contract.breakdownChecked });
    }

    verifyRequiredCases(observedCases);
    await testInfo.attach('hotel-pricing-parity.json', {
      body: JSON.stringify({ itineraries: evidence, observedCases: Array.from(observedCases), requiredCases }, null, 2),
      contentType: 'application/json',
    });
  });

  test('reset preserves API/UI parity on repeated actions', async ({ adminPage }) => {
    test.skip(process.env.E2E_ALLOW_WRITES?.toLowerCase() !== 'true', 'Enable E2E_ALLOW_WRITES=true for reset parity tests.');
    for (const quoteId of quoteIds) {
      await openItinerary(adminPage, quoteId);
      await expect(adminPage.getByRole('heading', { name: 'HOTEL LIST', exact: true })).toBeVisible();
      for (let attempt = 1; attempt <= 2; attempt += 1) {
        const resetResponsePromise = adminPage.waitForResponse((response) => (
          response.request().method() === 'POST'
          && pathname(response.url()).endsWith(`/hotel_details/${quoteId}/reset`)
        ));
        await adminPage.getByRole('button', { name: 'Reset Hotels', exact: true }).click();
        const resetResponse = await resetResponsePromise;
        expect(resetResponse.ok(), `${quoteId} reset ${attempt} returned ${resetResponse.status()}`).toBeTruthy();

        const afterReset = await openItinerary(adminPage, quoteId);
        const contract = assertBackendPricingContract(afterReset.hotels, `${quoteId} after reset ${attempt}`);
        expect(contract.breakdownChecked).toBeGreaterThan(0);
        await adminPage.getByTestId('display-hotel-rates').check();
        await verifyRecommendationTabs(adminPage, afterReset.hotels);
      }
    }
  });
});

