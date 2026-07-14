import { expect, test } from "@playwright/test";
import { seedAuthToken } from "../booking-engine-test-utils";

const QUOTE_ID = "DVI2026071";

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

test("DVI2026071 APJ exact-anchor preview does not show Ramanatha before APJ for the Thirumalai anchor", async ({
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
  const rameswaramTab = page.getByRole("button", { name: /Rameswaram Hotspots/i }).first();
  await expect(rameswaramTab).toBeVisible({ timeout: 30000 });
  await rameswaramTab.click();

  await searchInput.fill("Abdul Kalam");

  const apjCard = page.locator("[data-hotspot-id]").filter({
    hasText: /AP[IJ]\s+Abdul Kalam|Abdul Kalam National Memorial|National Memorial/i,
  }).first();
  await expect(apjCard).toBeVisible({ timeout: 30000 });
  await apjCard.getByRole("button", { name: /auto-preview/i }).click();

  const dialog = page.getByTestId("auto-fit-here-preview-dialog");
  await expect(dialog).toBeVisible({ timeout: 30000 });

  const targetRow = page.getByTestId("auto-fit-here-result-row").filter({
    hasText: /After Thirumalai Nayakkar Mahal/i,
  }).first();
  await expect(targetRow).toBeVisible({ timeout: 180000 });
  await targetRow.click();

  const dialogText = String(await dialog.innerText()).trim();
  const mismatchVisible = /could not be kept at the exact fit here position after Thirumalai Nayakkar Mahal/i.test(dialogText);

  const timeline = page.getByTestId("auto-fit-here-main-timeline");
  await expect(timeline).toBeVisible({ timeout: 30000 });

  const cardTexts = await timeline.locator("div.rounded-xl").allInnerTexts();
  const normalized = cardTexts.map((text) => String(text).trim()).filter(Boolean);

  const apjIndex = normalized.findIndex((text) => /APJ Abdul Kalam National Memorial/i.test(text));
  const ramanathaIndex = normalized.findIndex((text) => /Ramanatha swami Temple/i.test(text));

  if (mismatchVisible) {
    expect(
      apjIndex >= 0 && ramanathaIndex >= 0 && ramanathaIndex < apjIndex,
      "Exact-anchor mismatch preview must not show Ramanatha before APJ for the selected Tirumalai anchor",
      "Exact-anchor mismatch preview must not show Ramanatha before APJ for the selected Thirumalai anchor",
    ).toBeFalsy();
    return;
  }

  expect(apjIndex, "APJ should appear in the selected Thirumalai anchor preview when the anchor fits").toBeGreaterThanOrEqual(0);
  expect(
    ramanathaIndex < 0 || apjIndex < ramanathaIndex,
    "When the Thirumalai anchor fits, APJ must stay before Ramanatha in the timeline",
  ).toBeTruthy();
});
