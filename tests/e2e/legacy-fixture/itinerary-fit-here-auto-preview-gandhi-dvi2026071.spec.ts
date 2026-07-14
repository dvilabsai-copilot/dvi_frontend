import { expect, test } from "@playwright/test";
import { seedAuthToken } from "../booking-engine-test-utils";

const QUOTE_ID = "DVI2026071";
const GANDHI_MUSEUM_ID = 31;

async function openDayOneHotspotList(page: any, appBaseUrl: string) {
  await page.goto(`${appBaseUrl}/itinerary-details/${encodeURIComponent(QUOTE_ID)}`, {
    waitUntil: "domcontentloaded",
  });
  await expect(page).toHaveURL(new RegExp(`/itinerary-details/${QUOTE_ID}$`), {
    timeout: 30000,
  });

  const dayOneCard = page.locator('#itinerary-day-1[data-day-number="1"]').first();
  await expect(dayOneCard).toBeVisible({ timeout: 30000 });
  await dayOneCard.scrollIntoViewIfNeeded();

  const addHotspotButton = dayOneCard.getByRole("button", {
    name: /add hotspot|click to add hotspot/i,
  }).first();
  await expect(addHotspotButton).toBeVisible({ timeout: 30000 });
  await addHotspotButton.click();

  await expect(page.getByRole("heading", { name: /fit here hotspot list|hotspot list/i })).toBeVisible({
    timeout: 30000,
  });
}

async function expectSelectedTabShowsTravelBeforeHotel(page: any, rowIndex: number) {
  const rankedRow = page.getByTestId("auto-fit-here-result-row").nth(rowIndex);
  await expect(rankedRow).toBeVisible({ timeout: 30000 });

  const rowLabel = String(await rankedRow.innerText()).split("\n")[0]?.trim() || `row-${rowIndex + 1}`;
  await rankedRow.click();

  const timeline = page.getByTestId("auto-fit-here-main-timeline");
  await expect(timeline).toBeVisible({ timeout: 30000 });

  const cards = timeline.locator("div.rounded-xl");
  const cardCount = await cards.count();
  const texts: string[] = [];

  for (let index = 0; index < cardCount; index += 1) {
    const text = String(await cards.nth(index).innerText()).trim();
    if (text) texts.push(text);
  }

  const checkinIndex = texts.findIndex((text) => /check-in at hotel/i.test(text));
  if (checkinIndex < 0) {
    return;
  }

  expect(
    checkinIndex,
    `${rowLabel} should not render Check-in at Hotel as the first timeline card`,
  ).toBeGreaterThan(0);

  expect(
    texts[checkinIndex - 1],
    `${rowLabel} should render a travel-to-hotel card immediately before Check-in at Hotel`,
  ).toMatch(/travel to hotel|travelling from .* to hotel/i);

  expect(
    texts[checkinIndex - 1],
    `${rowLabel} should show a computed hotel-travel distance before Check-in at Hotel`,
  ).toMatch(/\b\d+(?:\.\d+)?\s*km\b/i);

  const hotelTravelText = texts[checkinIndex - 1];
  const distanceKm = Number(hotelTravelText.match(/(\d+(?:\.\d+)?)\s*km\b/i)?.[1] || 0);
  const hours = Number(hotelTravelText.match(/(\d+)\s*hour/i)?.[1] || 0);
  const minutes = Number(hotelTravelText.match(/(\d+)\s*min/i)?.[1] || 0);
  const totalMinutes = (hours * 60) + minutes;

  expect(
    distanceKm,
    `${rowLabel} should use a sane backend-computed hotel distance, not a runaway preview distance`,
  ).toBeGreaterThan(0);
  expect(
    distanceKm,
    `${rowLabel} hotel distance should stay within a realistic same-day range for DVI2026071`,
  ).toBeLessThan(250);

  expect(
    totalMinutes,
    `${rowLabel} should show a bounded hotel-travel duration, not an overnight preview artifact`,
  ).toBeGreaterThan(0);
  expect(
    totalMinutes,
    `${rowLabel} hotel-travel duration should stay within a realistic same-day range for DVI2026071`,
  ).toBeLessThan(240);
}

test("DVI2026071 Gandhi auto-preview tabs keep the hotel travel leg before check-in", async ({
  page,
  request,
  baseURL,
}) => {
  test.setTimeout(240000);

  const appBaseUrl = baseURL ?? process.env.E2E_FRONTEND_BASE_URL!;
  await seedAuthToken(page, request);
  await openDayOneHotspotList(page, appBaseUrl);

  const searchInput = page.getByPlaceholder(/search hotspot/i).first();
  await expect(searchInput).toBeVisible({ timeout: 30000 });
  await searchInput.fill("Gandhi Museum");

  const gandhiCard = page.locator(`[data-hotspot-id="${GANDHI_MUSEUM_ID}"]`).first();
  await expect(gandhiCard).toBeVisible({ timeout: 30000 });

  await gandhiCard.getByRole("button", { name: /auto-preview/i }).click();

  const dialog = page.getByTestId("auto-fit-here-preview-dialog");
  await expect(dialog).toBeVisible({ timeout: 30000 });

  const rankedRows = page.getByTestId("auto-fit-here-result-row");
  await expect(rankedRows.first()).toBeVisible({ timeout: 180000 });
  const rankedCount = await rankedRows.count();
  expect(rankedCount, "Expected Gandhi auto-preview to show ranked tabs").toBeGreaterThan(0);

  const rowsToCheck = Math.min(rankedCount, 4);
  for (let index = 0; index < rowsToCheck; index += 1) {
    await expectSelectedTabShowsTravelBeforeHotel(page, index);
  }
});
