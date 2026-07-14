import { expect, test, type Locator, type Page } from '@playwright/test';

const EMAIL = process.env.E2E_ADMIN_EMAIL!;
const PASSWORD = process.env.E2E_ADMIN_PASSWORD!;

const VEHICLE_LABEL = 'Innova Crysta 6+1';
const OUTSTATION_TITLE = '250';
const OUTSTATION_LIMIT = '250';
const OUTSTATION_RENTAL = '600';

async function loginIfNeeded(page: Page): Promise<void> {
  await page.goto('/vendor/60', { waitUntil: 'domcontentloaded' });

  const signInHeading = page.getByRole('heading', { name: /sign\s*in/i }).first();
  const onLoginPage = page.url().includes('/login') || (await signInHeading.count()) > 0;
  if (!onLoginPage) return;

  const emailInput = page.locator('input[type="email"], input[name="email"], input[placeholder*="Email" i]').first();
  const passwordInput = page.locator('input[type="password"], input[name="password"], input[placeholder*="Password" i]').first();

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

async function openStep(page: Page, stepName: RegExp): Promise<void> {
  await page.getByRole('button', { name: stepName }).click();
}

async function confirmDelete(page: Page): Promise<void> {
  await expect(page.getByText(/Delete KM Limit/i).first()).toBeVisible();
  await page.getByRole('button', { name: /^Delete$/i }).last().click();
}

async function deleteMatchingCards(section: Locator, page: Page, label: string): Promise<number> {
  const cards = section.locator('div.relative.grid.grid-cols-3').filter({ hasText: label });
  let deleted = 0;

  while (await cards.count()) {
    const card = cards.first();
    await card.scrollIntoViewIfNeeded();
    await card.getByTitle('Delete this KM limit').click();
    await expect(page.getByRole('heading', { name: /Delete KM Limit/i }).first()).toBeVisible();
    await confirmDelete(page);
    await expect(cards).toHaveCount(0, { timeout: 15_000 });
    deleted += 1;
  }

  return deleted;
}

async function openVehicleTypeSelect(dialog: Locator): Promise<void> {
  const select = dialog.getByRole('combobox').first();
  await select.click();
  await expect(dialog.getByRole('option', { name: VEHICLE_LABEL }).first()).toBeVisible();
}

test('vendor 60 removes and re-adds Innova Crysta 6+1 outstation pricebook through UI', async ({ page }) => {
  await loginIfNeeded(page);

  await test.step('Confirm the driver-cost row exists because it powers the pricebook dropdown', async () => {
    await openStep(page, /Vehicle Type \(Driver Cost\)/i);
    await expect(page.getByRole('row').filter({ hasText: VEHICLE_LABEL })).toHaveCount(1);
  });

  await test.step('Delete any existing outstation row for Innova Crysta 6+1', async () => {
    await openStep(page, /Vehicle Pricebook/i);
    const outstationSection = page
      .locator('section')
      .filter({ hasText: 'Vehicle Rental Cost Details | Outstation Pricebook' })
      .first();
    await expect(outstationSection).toBeVisible();
    await outstationSection.scrollIntoViewIfNeeded();

    const deleted = await deleteMatchingCards(outstationSection, page, VEHICLE_LABEL);
    console.log(`Outstation rows deleted: ${deleted}`);
  });

  await test.step('Re-add Innova Crysta 6+1 in the outstation KM limit modal', async () => {
    await page.getByRole('button', { name: /Vehicle Pricebook/i }).click();
    const outstationSection = page
      .locator('section')
      .filter({ hasText: 'Vehicle Rental Cost Details | Outstation Pricebook' })
      .first();

    await outstationSection.scrollIntoViewIfNeeded();
    await outstationSection.getByRole('button', { name: /\+\s*Add KM Limit/i }).click();

    const dialog = page.getByRole('dialog').last();
    await expect(dialog.getByRole('heading', { name: /Add Outstation KM Limit/i })).toBeVisible();

    await openVehicleTypeSelect(dialog);
    await dialog.getByRole('option', { name: VEHICLE_LABEL }).first().click();
    await dialog.getByPlaceholder('Outstation KM Limit Title', { exact: true }).fill(OUTSTATION_TITLE);
    await dialog.getByPlaceholder('Outstation KM Limit', { exact: true }).fill(OUTSTATION_LIMIT);
    await dialog.getByRole('button', { name: /^Save$/i }).click();

    await expect(
      outstationSection.locator('div.relative.grid.grid-cols-3').filter({ hasText: VEHICLE_LABEL }),
    ).toHaveCount(1, { timeout: 15_000 });
  });

  await test.step('Set rental charge and refresh preview', async () => {
    const outstationSection = page
      .locator('section')
      .filter({ hasText: 'Vehicle Rental Cost Details | Outstation Pricebook' })
      .first();

    const card = outstationSection
      .locator('div.relative.grid.grid-cols-3')
      .filter({ hasText: VEHICLE_LABEL })
      .first();
    await card.getByPlaceholder('Enter the Rental Charge').fill(OUTSTATION_RENTAL);

    await outstationSection.getByRole('button', { name: /Update/i }).click();

    await expect(card.getByPlaceholder('Enter the Rental Charge')).toHaveValue(OUTSTATION_RENTAL);
  });

  await test.step('Verify the dropdown source now includes Innova Crysta 6+1', async () => {
    const outstationSection = page
      .locator('section')
      .filter({ hasText: 'Vehicle Rental Cost Details | Outstation Pricebook' })
      .first();

    const filterTrigger = outstationSection.getByRole('combobox').first();
    await filterTrigger.click();
    await expect(page.getByRole('option', { name: VEHICLE_LABEL }).first()).toBeVisible();
    await page.keyboard.press('Escape');
  });
});
