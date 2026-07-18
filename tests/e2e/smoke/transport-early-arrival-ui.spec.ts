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

async function chooseFirstLocation(
  page: import('@playwright/test').Page,
  field: 'arrivalLocation' | 'departureLocation',
) {
  const locationField = page.locator(`[data-field="${field}"]`);
  await locationField.getByRole('button').click();
  await page.getByPlaceholder('Type to search...').press('Enter');
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
    await expect(adminPage.getByText('Itinerary Preference *')).toBeVisible();

    await adminPage.getByRole('radio', { name: 'Vehicle', exact: true }).check();
    await setStartTime(adminPage, 6, 'AM');

    const preferenceDialog = adminPage.getByRole('dialog', {
      name: 'Early-morning arrival preference',
    });
    await expect(preferenceDialog).not.toBeVisible();

    await chooseFirstLocation(adminPage, 'arrivalLocation');
    await chooseFirstLocation(adminPage, 'departureLocation');
    await chooseTripDates(adminPage);
    await expect(preferenceDialog).toBeVisible();
    await preferenceDialog.getByRole('button', { name: 'Close' }).click();
    await expect(preferenceDialog).not.toBeVisible();

    await setStartTime(adminPage, 7, 'AM');
    await expect(preferenceDialog).toBeVisible();
    await expect(preferenceDialog).toContainText('Early-morning arrival preference');
    await expect(preferenceDialog).toContainText('before 08:00 AM');

    await expect(
      preferenceDialog.getByRole('button', { name: /Proceed directly to a hotel for freshening up and rest/i }),
    ).toBeVisible();
    await expect(
      preferenceDialog.getByRole('button', { name: /Start the tour immediately with a refreshment\/break stop/i }),
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

    await preferenceDialog.getByRole('button', { name: /Start the tour immediately with a refreshment\/break stop/i }).click();
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

    await adminPage.getByRole('radio', { name: 'Both Hotel and Vehicle', exact: true }).check();
    await expect(preferenceDialog).not.toBeVisible();

    await adminPage.getByRole('radio', { name: 'Vehicle', exact: true }).check();
    await expect(preferenceDialog).toBeVisible();
    await preferenceDialog.getByRole('button', { name: 'Close' }).click();
    await expect(preferenceDialog).not.toBeVisible();
  });
});
