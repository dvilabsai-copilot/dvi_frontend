import { expect, test, type Locator, type Page } from './fixtures/auth.fixture';

test.describe('Fresh itinerary uses the reset hotel flow', () => {
  test('creates the 10193-equivalent itinerary and reloads persisted hotels', async ({ adminPage }) => {
    test.setTimeout(10 * 60 * 1000);

    const page = adminPage;
    const startDate = process.env.E2E_CREATE_START_DATE?.trim() || nextSeptemberDate(13);
    const endDate = process.env.E2E_CREATE_END_DATE?.trim() || nextSeptemberDate(18);
    const earlyArrivalDate = previousDate(startDate);
    await page.goto('/create-itinerary', { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('button', { name: 'Save & Continue' })).toBeVisible();

    // The source itinerary (10193) values used for this repeatable regression.
    await page.getByRole('radio').nth(2).check(); // Both Hotel and Vehicle
    await chooseAutoSuggest(page.locator('[data-field="agentId"]'), 'MMT', page);
    await chooseAutoSuggest(page.locator('[data-field="arrivalLocation"]'), 'Cochin International Airport', page);
    await chooseAutoSuggest(page.locator('[data-field="departureLocation"]'), 'Cochin International Airport', page);
    await chooseAutoSuggest(page.locator('[data-field="hotelCategory"]'), '3*', page);

    await chooseRadixOption(page.locator('[data-field="itineraryTypeSelect"]'), 'Customize', page);
    await chooseDateRange(page, startDate, endDate);
    await setTime(page, 'Start Time *', 5, 0, 'AM');
    await setTime(page, 'End Time *', 12, 0, 'PM');
    await chooseRadixOption(page.locator('[data-field="arrivalType"]'), 'By Flight', page);

    await page.locator('[data-field="budget"] input').fill('15000');

    const room = page.getByText('#Room 1', { exact: true }).locator('xpath=../..');
    // A new room starts with two adults. Add the third adult and one child.
    await room.getByRole('button', { name: '+' }).first().click();
    await room.getByRole('button', { name: '+ Add Child' }).click();
    await room.getByRole('spinbutton').fill('5');
    await room.getByRole('combobox').selectOption({ label: 'Without Bed' });

    await chooseRadixOption(page.locator('[data-field="guideRequired"]'), 'Whole Itinerary', page);
    await chooseAutoSuggest(page.locator('[data-field="nationality"]'), 'India', page);
    await chooseRadixOption(page.locator('[data-field="foodPreference"]'), 'Vegetarian', page);
    await chooseMealPlan(page, 'CP');
    await page.getByPlaceholder('Enter the Special Instruction').fill('VIP');

    const destinations = ['Munnar', 'Munnar', 'Thekkady', 'Alleppey', 'Alleppey'];
    for (let index = 0; index < destinations.length; index += 1) {
      const row = page.getByRole('row').nth(index + 1);
      await row.getByRole('button').first().click();
      await chooseOpenAutoSuggestOption(page, destinations[index]);
    }

    await page.locator('[data-field="vehicleType"]').getByRole('button').click();
    await page.getByRole('listbox', { name: 'Vehicle Type' })
      .getByRole('option', { name: 'MUV 6+1', exact: true }).click();

    const vehicleCount = page.locator('[data-field="vehicleType"]').locator('xpath=../..')
      .getByRole('spinbutton');
    await vehicleCount.fill('1');

    await page.getByRole('button', { name: 'Save & Continue' }).click();
    const billingDialog = page.getByRole('dialog', { name: /early-morning hotel blocking/i });
    await expect(billingDialog).toBeVisible({ timeout: 15_000 });
    await billingDialog.getByRole('button', { name: 'Yes, block room' }).click();

    const routeDialog = page.getByRole('button', { name: 'Continue with My Route' });
    if (await routeDialog.isVisible({ timeout: 10_000 }).catch(() => false)) {
      await routeDialog.click();
    }

    await expect(page).toHaveURL(/\/itinerary-details\/DVI\d+$/, { timeout: 10 * 60 * 1000 });
    const quoteId = page.url().split('/').pop();
    expect(quoteId).toMatch(/^DVI\d+$/);

    await expect(page.getByRole('heading', { name: 'HOTEL LIST', exact: true })).toBeVisible({ timeout: 120_000 });
    await expect(page.getByText(`Day 0 | ${earlyArrivalDate}`, { exact: true })).toBeVisible();
    await expect(page.getByText('Hotel Total :', { exact: false })).toBeVisible();
    await expect(page.getByRole('heading', { name: /VEHICLE LIST FOR/ })).toBeVisible();

    // Reload proves the details are read from persisted data, not only navigation state.
    await page.goto(page.url(), { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { name: 'HOTEL LIST', exact: true })).toBeVisible({ timeout: 120_000 });
    await expect(page.getByText(`Day 0 | ${earlyArrivalDate}`, { exact: true })).toBeVisible();
    await expect(page.getByRole('heading', { name: /VEHICLE LIST FOR/ })).toBeVisible();

    console.log(`[create-itinerary-reset-parity] created and reloaded ${quoteId}`);
  });
});

async function chooseAutoSuggest(container: Locator, value: string, page: Page): Promise<void> {
  await container.getByRole('button').first().click();
  await chooseOpenAutoSuggestOption(page, value);
}

async function chooseOpenAutoSuggestOption(page: Page, value: string): Promise<void> {
  const escaped = value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const option = page.locator('div.cursor-pointer').filter({ hasText: new RegExp(`^${escaped}$`) }).last();
  await expect(option).toBeVisible({ timeout: 30_000 });
  await option.click();
  await page.waitForTimeout(150);
}

async function chooseRadixOption(container: Locator, value: string, page: Page): Promise<void> {
  await container.getByRole('combobox').click();
  await page.getByRole('option', { name: value, exact: true }).click();
}

async function chooseMealPlan(page: Page, code: string): Promise<void> {
  const mealPlan = page.getByText('Meal Plan', { exact: true }).locator('..');
  await mealPlan.getByRole('combobox').click();
  await page.getByRole('option', { name: new RegExp(`^${code}\\s*-`) }).click();
}

async function chooseDateRange(page: Page, start: string, end: string): Promise<void> {
  await page.locator('[data-field="tripStartDate"]').getByRole('button').first().click();
  await chooseCalendarDate(page, start);
  await chooseCalendarDate(page, end);
}

async function chooseCalendarDate(page: Page, date: string): Promise<void> {
  const [day, month, year] = date.split('/').map(Number);
  const monthName = new Date(year, month - 1, 1).toLocaleString('en-US', { month: 'long' });
  const monthSelect = page.getByRole('combobox', { name: 'Month:' }).first();
  const yearSelect = page.getByRole('combobox', { name: 'Year:' }).first();
  await monthSelect.selectOption({ label: monthName });
  await yearSelect.selectOption(String(year));

  const calendar = page.getByRole('grid', { name: `${monthName} ${year}` });
  await expect(calendar).toBeVisible();
  await calendar.getByRole('gridcell', { name: String(day), exact: true }).click();
}

function nextSeptemberDate(day: number): string {
  const now = new Date();
  const year = now.getMonth() < 8 ? now.getFullYear() : now.getFullYear() + 1;
  return `${String(day).padStart(2, '0')}/09/${year}`;
}

function previousDate(date: string): string {
  const [day, month, year] = date.split('/').map(Number);
  const value = new Date(year, month - 1, day - 1);
  return `${String(value.getDate()).padStart(2, '0')}/${String(value.getMonth() + 1).padStart(2, '0')}/${value.getFullYear()}`;
}

async function setTime(
  page: Page,
  label: string,
  targetHour: number,
  targetMinute: number,
  targetPeriod: 'AM' | 'PM',
): Promise<void> {
  const field = page.getByText(label, { exact: true }).locator('..');
  await field.getByRole('button').first().click();

  const picker = page.getByText(label.replace(' *', ''), { exact: true }).locator('..');
  const hour = picker.getByRole('button', { name: 'Hour' });
  const minute = picker.getByRole('button', { name: 'Minute' });
  const period = picker.getByRole('button', { name: /^(AM|PM)$/ });

  let currentHour = Number(await hour.innerText());
  while (currentHour !== targetHour) {
    await hour.press(currentHour > targetHour ? 'ArrowDown' : 'ArrowUp');
    currentHour = Number(await hour.innerText());
  }
  let currentMinute = Number(await minute.innerText());
  while (currentMinute !== targetMinute) {
    await minute.press(currentMinute > targetMinute ? 'ArrowDown' : 'ArrowUp');
    currentMinute = Number(await minute.innerText());
  }
  if ((await period.innerText()) !== targetPeriod) await period.click();
  await picker.getByRole('button', { name: 'Update Time' }).click();
}
