import { expect, test, type Locator, type Page } from './fixtures/auth.fixture';

/**
 * Recreates the input shape of DVI20260947 through the create-itinerary UI.
 * Override E2E_REPLAY_START_DATE, E2E_REPLAY_END_DATE, or
 * E2E_REPLAY_STAY_PATTERN (for example: "Munnar -2, Thekkady -1, Alleppey -3").
 */
test.describe('DVI20260947 itinerary replay', () => {
  test('creates the replay itinerary from the supplied stay pattern', async ({ adminPage }) => {
    test.setTimeout(10 * 60 * 1000);

    const page = adminPage;
    const startDate = process.env.E2E_REPLAY_START_DATE?.trim() || nextSeptemberDate(6);
    const stayPattern = process.env.E2E_REPLAY_STAY_PATTERN?.trim()
      || 'Munnar -2, Thekkady -1, Alleppey -1';
    const destinations = expandStayPattern(stayPattern);
    const endDate = process.env.E2E_REPLAY_END_DATE?.trim()
      || addDays(startDate, destinations.length);
    expect(destinations.length).toBeGreaterThan(0);

    await page.goto('/create-itinerary', { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('button', { name: 'Save & Continue' })).toBeVisible();

    await page.getByRole('radio').nth(2).check(); // Hotel + Vehicle
    await chooseAutoSuggest(page.locator('[data-field="agentId"]'), 'DVI Holidays India Company Pvt. Ltd.', page);
    await chooseAutoSuggest(page.locator('[data-field="arrivalLocation"]'), 'Cochin International Airport', page);
    await chooseAutoSuggest(page.locator('[data-field="departureLocation"]'), 'Cochin International Airport', page);
    await chooseAutoSuggest(page.locator('[data-field="hotelCategory"]'), '3*', page);
    await chooseRadixOption(page.locator('[data-field="itineraryTypeSelect"]'), 'Customize', page);
    await chooseDateRange(page, startDate, endDate);
    await setTime(page, 'Start Time *', 12, 0, 'PM');
    await setTime(page, 'End Time *', 5, 30, 'PM');
    await chooseRadixOption(page.locator('[data-field="arrivalType"]'), 'By Flight', page);
    await page.locator('[data-field="budget"] input').fill('15000');

    const room = page.getByText('#Room 1', { exact: true }).locator('xpath=../..');
    await room.getByRole('button', { name: '+' }).first().click(); // third adult = one extra bed

    await chooseRadixOption(page.locator('[data-field="guideRequired"]'), 'Whole Itinerary', page);
    await chooseAutoSuggest(page.locator('[data-field="nationality"]'), 'India', page);
    await chooseRadixOption(page.locator('[data-field="foodPreference"]'), 'Vegetarian', page);
    await chooseMealPlan(page, 'CP');

    for (let index = 0; index < destinations.length; index += 1) {
      const row = page.getByRole('row').nth(index + 1);
      await row.getByRole('button').first().click();
      await chooseOpenAutoSuggestOption(page, destinations[index]);
    }

    await page.locator('[data-field="vehicleType"]').getByRole('button').click();
    await page.getByRole('listbox', { name: 'Vehicle Type' })
      .getByRole('option', { name: 'Sedan', exact: true }).click();
    await page.locator('[data-field="vehicleType"]').locator('xpath=../..')
      .getByRole('spinbutton').fill('1');

    await page.getByRole('button', { name: 'Save & Continue' }).click();
    const routeDialog = page.getByRole('button', { name: 'Continue with My Route' });
    if (await routeDialog.isVisible({ timeout: 15_000 }).catch(() => false)) {
      await routeDialog.click();
    }

    await expect(page).toHaveURL(/\/itinerary-details\/DVI\d+$/, { timeout: 10 * 60 * 1000 });
    const quoteId = page.url().split('/').pop();
    expect(quoteId).toMatch(/^DVI\d+$/);
    await expect(page.getByRole('heading', { name: 'HOTEL LIST', exact: true }))
      .toBeVisible({ timeout: 120_000 });
    await expect(page.getByText('Day 1 |', { exact: false })).toBeVisible();
    await expect(page.getByText('Day 4 |', { exact: false })).toBeVisible();
    await expect(page.getByRole('heading', { name: /VEHICLE LIST FOR.*Sedan/i }))
      .toBeVisible();

    console.log(`[dvi20260947-replay] created ${quoteId} for ${startDate} - ${endDate} (${stayPattern})`);
  });
});

async function chooseAutoSuggest(container: Locator, value: string, page: Page): Promise<void> {
  await container.getByRole('button').first().click();
  await chooseOpenAutoSuggestOption(page, value);
}

async function chooseOpenAutoSuggestOption(page: Page, value: string): Promise<void> {
  const escaped = value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const option = page.locator('div.cursor-pointer')
    .filter({ hasText: new RegExp(`^${escaped}$`) }).last();
  await expect(option).toBeVisible({ timeout: 30_000 });
  await option.click();
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
  await page.getByRole('combobox', { name: 'Month:' }).first().selectOption({ label: monthName });
  await page.getByRole('combobox', { name: 'Year:' }).first().selectOption(String(year));
  const calendar = page.getByRole('grid', { name: `${monthName} ${year}` });
  await expect(calendar).toBeVisible();
  await calendar.getByRole('gridcell', { name: String(day), exact: true }).click();
}

function nextSeptemberDate(day: number): string {
  const now = new Date();
  const year = now.getMonth() < 8 ? now.getFullYear() : now.getFullYear() + 1;
  return `${String(day).padStart(2, '0')}/09/${year}`;
}

function addDays(date: string, days: number): string {
  const [day, month, year] = date.split('/').map(Number);
  const value = new Date(year, month - 1, day + days);
  return `${String(value.getDate()).padStart(2, '0')}/${String(value.getMonth() + 1).padStart(2, '0')}/${value.getFullYear()}`;
}

function expandStayPattern(pattern: string): string[] {
  return pattern.split(',').flatMap((segment) => {
    const match = segment.trim().match(/^(.+?)\s*-\s*(\d+)$/);
    if (!match) {
      throw new Error(`Invalid E2E_REPLAY_STAY_PATTERN segment: "${segment.trim()}"`);
    }

    const destination = match[1].trim();
    const nights = Number(match[2]);
    if (!destination || !Number.isInteger(nights) || nights < 1) {
      throw new Error(`Invalid stay pattern segment: "${segment.trim()}"`);
    }

    return Array.from({ length: nights }, () => destination);
  });
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
