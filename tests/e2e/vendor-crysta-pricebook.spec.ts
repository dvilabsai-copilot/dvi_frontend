import { expect, test, type Page } from '@playwright/test';

const EMAIL =
  process.env.E2E_VENDOR_USER ||
  process.env.PROD_EMAIL ||
  'admin@dvi.co.in';
const PASSWORD =
  process.env.E2E_VENDOR_PASSWORD ||
  process.env.PROD_PASSWORD ||
  'Keerthi@2404ias';

async function loginIfNeeded(page: Page): Promise<void> {
  await page.goto('/vendor/60', { waitUntil: 'domcontentloaded' });

  const signInHeading = page.getByRole('heading', { name: /sign\s*in/i }).first();
  const onLoginPage = page.url().includes('/login') || (await signInHeading.count()) > 0;
  if (!onLoginPage) return;

  const emailInput = page
    .locator('input[type="email"], input[name="email"], input[placeholder*="Email" i]')
    .first();
  const passwordInput = page
    .locator('input[type="password"], input[name="password"], input[placeholder*="Password" i]')
    .first();

  const emailBox = (await emailInput.count()) > 0 ? emailInput : page.getByRole('textbox').first();
  const passwordBox = (await passwordInput.count()) > 0 ? passwordInput : page.locator('input[type="password"]').first();

  await expect(emailBox).toBeVisible();
  await expect(passwordBox).toBeVisible();

  await emailBox.fill(EMAIL);
  await passwordBox.fill(PASSWORD);

  const loginButton = page.getByRole('button', { name: /log\s*in|login|sign\s*in/i }).first();
  if ((await loginButton.count()) > 0) {
    await loginButton.click();
  } else {
    await passwordBox.press('Enter');
  }

  await page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 15_000 }).catch(() => {});
  await page.goto('/vendor/60', { waitUntil: 'domcontentloaded' });
}

async function openVehicleTypeDriverCostStep(page: Page): Promise<void> {
  await page.getByRole('button', { name: /Vehicle Type \(Driver Cost\)/i }).click();
  await expect(page.getByRole('heading', { name: /Vehicle Type.*Driver Cost/i }).first()).toBeVisible();
}

async function selectVendorVehicleType(page: Page, label: string): Promise<void> {
  const select = page.getByRole('combobox').first();
  await select.click();
  await expect(page.getByRole('option', { name: label }).first()).toBeVisible();
  await page.getByRole('option', { name: label }).first().click();
}

test('vendor 60 can add Innova Crysta 6+1 and edit its price in pricebook', async ({ page }) => {
  await loginIfNeeded(page);

  await openVehicleTypeDriverCostStep(page);

  await page.getByRole('button', { name: /\+\s*Add Vehicle Type - Driver Cost/i }).click();
  await expect(page.getByRole('heading', { name: /Vehicle Type - Driver Cost/i })).toBeVisible();

  await selectVendorVehicleType(page, 'Innova Crysta 6+1');
  await page.getByPlaceholder('Driver Bhatta').fill('500');
  await page.getByPlaceholder('Food Cost').fill('100');
  await page.getByPlaceholder('Accomodation Cost').fill('100');
  await page.getByPlaceholder('Extra Cost').fill('100');
  await page.getByPlaceholder('Early Morning Charges').fill('100');
  await page.getByPlaceholder('Evening Charges').fill('100');
  await page.getByRole('button', { name: /^Save|^Update/i }).click();

  await expect(page.getByText('Innova Crysta 6+1', { exact: true }).first()).toBeVisible();

  await page.getByRole('button', { name: /Local KM Limit/i }).click();
  await expect(page.getByRole('heading', { name: /List of Local KM Limit/i })).toBeVisible();

  await page.getByRole('button', { name: /\+\s*Add Local KM Limit/i }).click();
  await expect(page.getByRole('heading', { name: /Add Local KM Limit/i })).toBeVisible();

  await selectVendorVehicleType(page, 'Innova Crysta 6+1');
  await page.getByPlaceholder('Enter Title').fill('8 HRS 80 KMS');
  await page.getByPlaceholder('Enter Hours').fill('8');
  await page.getByPlaceholder('KM Limit').fill('80');
  await page.getByRole('button', { name: /^Save$/i }).click();

  await expect(page.getByText('Innova Crysta 6+1', { exact: true }).first()).toBeVisible();

  await page.getByRole('button', { name: /5\s*Vehicle Pricebook/i }).click();
  await expect(page.getByRole('heading', { name: /Vehicle Pricebook/i })).toBeVisible();

  const localSection = page
    .locator('section')
    .filter({ hasText: 'Vehicle Rental Cost Details | Local Pricebook' })
    .first();
  await expect(localSection).toBeVisible();
  await localSection.scrollIntoViewIfNeeded();

  const crystaCard = localSection
    .getByText('Innova Crysta 6+1', { exact: true })
    .first()
    .locator('xpath=ancestor::div[contains(@class,"relative")][1]');

  await expect(crystaCard).toBeVisible();
  await expect(crystaCard.getByText('8 HRS 80 KMS', { exact: true }).first()).toBeVisible();

  const rentalInput = crystaCard.getByPlaceholder('Enter the Rental Charge').first();
  await expect(rentalInput).toBeVisible();
  await rentalInput.fill('750');
  await expect(rentalInput).toHaveValue('750');

  await page.getByRole('button', { name: /Update/i }).last().click();
});
