import { test, expect } from '@playwright/test';

const EMAIL = process.env.E2E_ADMIN_EMAIL!;
const PASSWORD = process.env.E2E_ADMIN_PASSWORD!;
const CREATE_ITINERARY_ID = String(process.env.E2E_CREATE_ITINERARY_ID || '').trim();
const ITINERARY_QUOTE_ID = String(process.env.E2E_ITINERARY_QUOTE_ID || '').trim();

async function loginIfNeeded(page: import('@playwright/test').Page) {
  await page.goto(`/create-itinerary?id=${encodeURIComponent(CREATE_ITINERARY_ID)}`, { waitUntil: 'domcontentloaded' });
  if (page.url().includes('/login')) {
    await expect(page.getByRole('heading', { name: 'Sign in' })).toBeVisible();
    await page.getByRole('textbox').first().fill(EMAIL);
    await page.locator('input[type="password"]').first().fill(PASSWORD);
    await page.getByRole('button', { name: 'Sign in' }).click();
    await page.waitForURL((url) => !url.pathname.includes('/login'));
    await page.goto(`/create-itinerary?id=${encodeURIComponent(CREATE_ITINERARY_ID)}`, { waitUntil: 'domcontentloaded' });
  }
}

async function setCreateStartTimeAndSave(page: import('@playwright/test').Page, startTime: string) {
  const startTimeInput = page.locator('label:has-text("Start Time")').locator('xpath=following::input[@type="time"][1]');
  await expect(startTimeInput).toBeVisible();
  await startTimeInput.fill(startTime);

  await page.getByRole('button', { name: 'Save & Continue' }).click();
}

test.describe('Arrival Policy E2E', () => {
  test('Create itinerary: 06:00 shows confirmation modal and NO continues same-day flow', async ({ page }) => {
    test.skip(!CREATE_ITINERARY_ID, 'Set E2E_CREATE_ITINERARY_ID for the arrival-policy create fixture.');
    await loginIfNeeded(page);

    await setCreateStartTimeAndSave(page, '06:00');

    const policyModalTitle = page.getByText('Previous-Day Hotel Billing Confirmation');
    await expect(policyModalTitle).toBeVisible();

    await page.getByRole('button', { name: 'No, keep same-day booking' }).click();

    await expect(policyModalTitle).not.toBeVisible();
    await expect(page.getByText('Optimize route for')).toBeVisible();
  });

  test('Create itinerary: 10:00 should not show confirmation modal', async ({ page }) => {
    test.skip(!CREATE_ITINERARY_ID, 'Set E2E_CREATE_ITINERARY_ID for the arrival-policy create fixture.');
    await loginIfNeeded(page);

    await setCreateStartTimeAndSave(page, '10:00');

    await expect(page.getByText('Previous-Day Hotel Billing Confirmation')).not.toBeVisible();
    await expect(page.getByText('Optimize route for')).toBeVisible();
  });

  test('Details page: 13:30 no modal; 06:30 opens modal', async ({ page }) => {
    test.skip(!ITINERARY_QUOTE_ID, 'Set E2E_ITINERARY_QUOTE_ID for the arrival-policy details fixture.');
    await page.goto(`/itinerary-details/${encodeURIComponent(ITINERARY_QUOTE_ID)}`, { waitUntil: 'domcontentloaded' });
    if (page.url().includes('/login')) {
      await expect(page.getByRole('heading', { name: 'Sign in' })).toBeVisible();
      await page.getByRole('textbox').first().fill(EMAIL);
      await page.locator('input[type="password"]').first().fill(PASSWORD);
      await page.getByRole('button', { name: 'Sign in' }).click();
      await page.waitForURL((url) => !url.pathname.includes('/login'));
      await page.goto(`/itinerary-details/${encodeURIComponent(ITINERARY_QUOTE_ID)}`, { waitUntil: 'domcontentloaded' });
    }

    await page.getByRole('button', { name: /Confirm Quotation/i }).click();

    const arrivalInput = page.getByPlaceholder('12-12-2025 9:00 AM').first();
    await expect(arrivalInput).toBeVisible();

    const currentArrival = (await arrivalInput.inputValue()).trim();
    const datePrefix = (currentArrival.match(/^(\d{1,2}[-\/]\d{1,2}[-\/]\d{4})/) || [])[1] || '15-04-2026';

    await arrivalInput.fill(`${datePrefix} 1:30 PM`);
    await expect(page.getByText('Previous-Day Hotel Billing Confirmation')).not.toBeVisible();

    await arrivalInput.fill(`${datePrefix} 6:30 AM`);
    await expect(page.getByText('Previous-Day Hotel Billing Confirmation')).toBeVisible();
  });
});
