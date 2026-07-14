import { expect, test, type Locator, type Page } from '@playwright/test';

const EMAIL = process.env.E2E_ADMIN_EMAIL!;
const PASSWORD = process.env.E2E_ADMIN_PASSWORD!;

const HYCROSS_LABEL = 'Innova Hycross 7+1';

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
  const modal = page.locator('div.fixed.inset-0.z-50').last();
  await expect(modal.getByRole('button', { name: /^Delete$/i })).toBeVisible();
  await modal.getByRole('button', { name: /^Delete$/i }).click();
}

async function deleteMatchingRows(page: Page, label: string): Promise<number> {
  const rows = page.getByRole('row').filter({ hasText: label });
  let deleted = 0;

  while (await rows.count()) {
    const row = rows.first();
    await row.scrollIntoViewIfNeeded();
    await row.getByRole('button', { name: /Delete/i }).click();

    await expect(page.getByText(/Are you sure\?/i).first()).toBeVisible();
    await expect(page.getByText(/Do you really want to delete this record\?/i).first()).toBeVisible();

    await confirmDelete(page);
    await expect(rows).toHaveCount(0, { timeout: 15_000 });
    deleted += 1;
  }

  return deleted;
}

async function deleteMatchingVehicleCards(section: Locator, page: Page, label: string): Promise<number> {
  const cards = section
    .locator('div.relative.grid.grid-cols-3')
    .filter({ hasText: label });

  let deleted = 0;
  while (await cards.count()) {
    const card = cards.first();
    await card.scrollIntoViewIfNeeded();
    await card.getByTitle('Delete this KM limit').click();

    await expect(page.getByRole('heading', { name: /Delete KM Limit/i }).first()).toBeVisible();
    await expect(page.getByText(new RegExp(label, 'i')).first()).toBeVisible();

    await confirmDelete(page);
    await expect(cards).toHaveCount(0, { timeout: 15_000 });
    deleted += 1;
  }

  return deleted;
}

test('vendor 60 deletes Hycross from driver cost, vehicles, and pricebook', async ({ page }) => {
  await loginIfNeeded(page);

  await test.step('Delete Hycross from vehicle type driver cost', async () => {
    await openStep(page, /Vehicle Type \(Driver Cost\)/i);
    const deleted = await deleteMatchingRows(page, HYCROSS_LABEL);
    console.log(`Driver cost rows deleted: ${deleted}`);
  });

  await test.step('Delete Hycross from vehicle list', async () => {
    await openStep(page, /Vehicle\s*$/i);
    const deleted = await deleteMatchingRows(page, HYCROSS_LABEL);
    console.log(`Vehicle rows deleted: ${deleted}`);
  });

  await test.step('Delete Hycross from local and outstation pricebook', async () => {
    await openStep(page, /Vehicle Pricebook/i);
    await expect(page.getByRole('heading', { name: /Vehicle Pricebook/i })).toBeVisible();

    const localSection = page
      .locator('section')
      .filter({ hasText: 'Vehicle Rental Cost Details | Local Pricebook' })
      .first();
    await expect(localSection).toBeVisible();
    await localSection.scrollIntoViewIfNeeded();

    const localDeleted = await deleteMatchingVehicleCards(localSection, page, HYCROSS_LABEL);
    console.log(`Local pricebook cards deleted: ${localDeleted}`);

    const outstationSection = page
      .locator('section')
      .filter({ hasText: 'Vehicle Rental Cost Details | Outstation Pricebook' })
      .first();
    await expect(outstationSection).toBeVisible();
    await outstationSection.scrollIntoViewIfNeeded();

    const outstationDeleted = await deleteMatchingVehicleCards(outstationSection, page, HYCROSS_LABEL);
    console.log(`Outstation pricebook cards deleted: ${outstationDeleted}`);
  });

  await test.step('Verify Hycross is no longer visible in the vendor UI sections we cleaned up', async () => {
    await openStep(page, /Vehicle Type \(Driver Cost\)/i);
    await expect(page.getByRole('row').filter({ hasText: HYCROSS_LABEL })).toHaveCount(0);

    await openStep(page, /Vehicle Pricebook/i);
    const localSection = page
      .locator('section')
      .filter({ hasText: 'Vehicle Rental Cost Details | Local Pricebook' })
      .first();
    const outstationSection = page
      .locator('section')
      .filter({ hasText: 'Vehicle Rental Cost Details | Outstation Pricebook' })
      .first();

    await expect(localSection.locator('div.relative.grid.grid-cols-3').filter({ hasText: HYCROSS_LABEL })).toHaveCount(0);
    await expect(outstationSection.locator('div.relative.grid.grid-cols-3').filter({ hasText: HYCROSS_LABEL })).toHaveCount(0);
  });
});
