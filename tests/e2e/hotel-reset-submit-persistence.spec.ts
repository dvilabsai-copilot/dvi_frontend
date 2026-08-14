import { expect, test } from './fixtures/auth.fixture';
import type { Page } from '@playwright/test';

const quoteId = String(process.env.E2E_ITINERARY_QUOTE_ID || '').trim();

type PackageSnapshot = { label: string; rows: string[] };

async function hotelListSnapshot(page: Page): Promise<PackageSnapshot[]> {
  const tabs = page.getByRole('tablist', { name: 'Hotel recommendation packages' }).getByRole('tab');
  const tabCount = await tabs.count();
  expect(tabCount, 'The itinerary must expose four recommendation packages').toBe(4);

  const hotelTable = page.locator('table').filter({ hasText: 'DAY' });
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

test.describe('Hotel reset -> edit submit persistence', () => {
  test.skip(!quoteId, 'Set E2E_ITINERARY_QUOTE_ID to the itinerary used for this regression test.');
  test.skip(
    process.env.E2E_ALLOW_WRITES?.toLowerCase() !== 'true',
    'Enable E2E_ALLOW_WRITES=true because this test resets and submits an itinerary.',
  );

  test('keeps every reset package unchanged after a non-route edit', async ({ adminPage }) => {
    await openDetails(adminPage);

    const resetResponsePromise = adminPage.waitForResponse((response) => (
      response.request().method() === 'POST' &&
      new URL(response.url()).pathname.endsWith(`/hotel_details/${quoteId}/reset`)
    ));
    await adminPage.getByRole('button', { name: 'Reset Hotels', exact: true }).click();
    const resetResponse = await resetResponsePromise;
    expect(resetResponse.ok(), `Reset returned ${resetResponse.status()}`).toBeTruthy();

    const afterReset = await hotelListSnapshot(adminPage);

    const backToList = adminPage.getByRole('link', { name: 'Back to List', exact: true });
    expect(await backToList.count()).toBe(1);
    await backToList.click();
    await adminPage.waitForURL(/\/create-itinerary\?id=\d+$/);

    // Special instructions are itinerary metadata, not route data. Saving
    // this change must not replace the hotel package snapshot.
    const instructions = adminPage.getByRole('textbox', { name: 'Enter the Special Instruction' });
    await expect(instructions).toHaveCount(1);
    await instructions.fill(`Hotel persistence regression ${Date.now()}`);

    await adminPage.getByRole('button', { name: 'Save & Continue', exact: true }).click();
    const keepRoute = adminPage.getByRole('button', { name: 'Continue with My Route', exact: true });
    if (await keepRoute.isVisible().catch(() => false)) await keepRoute.click();
    await adminPage.waitForURL(new RegExp(`/itinerary-details/${quoteId}$`));
    await expect(adminPage.getByRole('heading', { name: 'HOTEL LIST', exact: true })).toBeVisible();

    const afterSubmit = await hotelListSnapshot(adminPage);
    await adminPage.reload();
    await expect(adminPage.getByRole('heading', { name: 'HOTEL LIST', exact: true })).toBeVisible();
    const afterReload = await hotelListSnapshot(adminPage);

    const comparison = { quoteId, afterReset, afterSubmit, afterReload };
    await test.info().attach('hotel-reset-submit-persistence.json', {
      body: JSON.stringify(comparison, null, 2),
      contentType: 'application/json',
    });
    console.log(JSON.stringify(comparison, null, 2));

    expect(afterSubmit, 'Submitting without edits changed the reset recommendation packages').toEqual(afterReset);
    expect(afterReload, 'Reloading did not restore the submitted recommendation packages').toEqual(afterReset);
  });
});
