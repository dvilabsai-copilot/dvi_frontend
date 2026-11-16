import { expect, test } from '../fixtures/auth.fixture';

async function setStartTime(page: import('@playwright/test').Page, hour12: number, period: 'AM' | 'PM') {
  const startTimeField = page.getByText('Start Time *').locator('..');
  await startTimeField.getByRole('button').first().click();

  const hourButton = page.getByRole('button', { name: 'Hour' });
  const periodButton = page.getByRole('button', { name: /^(AM|PM)$/ });

  for (let attempts = 0; attempts < 12; attempts += 1) {
    if (Number(await hourButton.innerText()) === hour12) break;
    await hourButton.press('ArrowDown');
  }

  if ((await periodButton.innerText()).trim() !== period) {
    await periodButton.click();
  }

  await page.getByRole('button', { name: 'Update Time' }).click();
}

async function chooseLocation(
  page: import('@playwright/test').Page,
  field: 'arrivalLocation' | 'departureLocation' | 'firstRouteNext',
  location: string,
) {
  const locationField = page.locator(`[data-field="${field}"]`);
  await locationField.getByRole('button').click();
  await page.getByPlaceholder('Type to search...').fill(location);
  await page.locator('div.cursor-pointer').filter({ has: page.getByText(location, { exact: true }) }).click();
}

async function chooseTripDates(page: import('@playwright/test').Page) {
  const tripDatesField = page.locator('[data-field="tripStartDate"]').first();
  await tripDatesField.getByRole('button').first().click();
  const availableDays = page
    .locator('[role="gridcell"]:not([disabled])')
    .filter({ hasText: /^\d+$/ });
  await availableDays.first().click();
  await page
    .locator('[role="gridcell"]:not([disabled])')
    .filter({ hasText: /^\d+$/ })
    .nth(1)
    .click();
}

test.describe('Transport Only early-arrival preference', () => {
  test('opens the early-arrival preference popup, captures a selection, and closes', async ({ adminPage }, testInfo) => {
    await adminPage.goto('/create-itinerary', { waitUntil: 'domcontentloaded' });
    await adminPage.getByRole('tab', { name: 'Cabs', exact: true }).click();
    await setStartTime(adminPage, 6, 'AM');

    const preferenceDialog = adminPage.getByRole('dialog', {
      name: 'Early-morning arrival preference',
    });
    await expect(preferenceDialog).not.toBeVisible();

    await chooseLocation(adminPage, 'arrivalLocation', 'Madurai Airport');
    await chooseLocation(adminPage, 'departureLocation', 'Madurai Airport');
    await chooseTripDates(adminPage);
    await chooseLocation(adminPage, 'firstRouteNext', 'Madurai');
    await expect(preferenceDialog).toBeVisible();
    await preferenceDialog.getByRole('button', { name: 'Close' }).click();
    await expect(preferenceDialog).not.toBeVisible();

    await setStartTime(adminPage, 7, 'AM');
    await expect(preferenceDialog).toBeVisible();
    await expect(preferenceDialog).toContainText('Early-morning arrival preference');
    await expect(preferenceDialog).toContainText('before 08:00');

    await expect(
      preferenceDialog.getByRole('button', { name: /Proceed directly to a hotel for freshening up and rest/i }),
    ).toBeVisible();
    await expect(
      preferenceDialog.getByRole('button', { name: /Take a refreshment or waiting break before sightseeing/i }),
    ).toBeVisible();

    await preferenceDialog.getByRole('button', { name: /Proceed directly to a hotel for freshening up and rest/i }).click();
    await expect(preferenceDialog.getByLabel('Hotel name (optional)')).toBeVisible();
    await preferenceDialog.getByLabel('Hotel name (optional)').fill('Guest Hotel');
    await expect(preferenceDialog).toContainText(
      'Guest has opted to proceed to the hotel first for rest and refreshment before commencing sightseeing.',
    );
    await adminPage.screenshot({
      path: testInfo.outputPath('transport-early-arrival-hotel-name-dialog.png'),
      fullPage: true,
    });

    await preferenceDialog.getByRole('button', { name: /Take a refreshment or waiting break before sightseeing/i }).click();
    await expect(preferenceDialog.getByRole('button', { name: 'Use this preference' })).toBeEnabled();
    await adminPage.screenshot({
      path: testInfo.outputPath('transport-early-arrival-preference-dialog.png'),
      fullPage: true,
    });
    await preferenceDialog.getByRole('button', { name: 'Use this preference' }).click();
    await expect(preferenceDialog).not.toBeVisible();
    await expect(
      adminPage.getByRole('button', { name: /Early-morning arrival preference.*Take a refreshment or waiting break.*Change/i }),
    ).toBeVisible();

    await chooseLocation(adminPage, 'firstRouteNext', 'Rameswaram');
    await expect(preferenceDialog).not.toBeVisible();
    await expect(adminPage.getByRole('button', { name: /Early-morning arrival preference.*Change/i })).not.toBeVisible();
  });
});
