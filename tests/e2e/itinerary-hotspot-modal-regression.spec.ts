import { expect, test } from "@playwright/test";
import {
  assertNoExactDuplicateRows,
  DEFAULT_QUOTE_ID,
  loadManualHotspotFixture,
  seedAuthToken,
} from "./manual-hotspot-test-utils";

test("manual hotspot preview preserves the selected hotspot and has no exact duplicate timeline rows", async ({
  page,
  request,
  baseURL,
}) => {
  test.setTimeout(240000);

  const fixture = await loadManualHotspotFixture(request, DEFAULT_QUOTE_ID);
  await seedAuthToken(page, fixture.token);

  await page.goto(`${baseURL}/itinerary-details/${encodeURIComponent(fixture.quoteId)}`, {
    waitUntil: "domcontentloaded",
  });
  await expect(page).toHaveURL(new RegExp(`/itinerary-details/${fixture.quoteId}$`), { timeout: 30000 });

  const dayCard = page.locator(`#itinerary-day-${fixture.day.dayNumber || 1}`).first();
  await expect(dayCard).toBeVisible({ timeout: 30000 });
  await dayCard.getByRole("button", { name: /add hotspot|click to add hotspot/i }).first().click();

  await expect(page.getByRole("heading", { name: /fit here hotspot list/i })).toBeVisible({ timeout: 30000 });
  const candidateCard = page.locator(`[data-hotspot-id="${fixture.hotspotId}"]`).first();
  await expect(candidateCard).toBeVisible({ timeout: 30000 });
  await candidateCard.getByRole("button", { name: /^Preview$/i }).click();

  const fitHereButton = page.getByRole("button", { name: /Fit Here/i }).first();
  await expect(fitHereButton).toBeVisible({ timeout: 30000 });
  const previewResponsePromise = page.waitForResponse(
    (response) =>
      response.request().method() === "POST" &&
      /\/itineraries\/\d+\/manual-hotspot\/fit-preview(?:\?|$)/.test(response.url()),
    { timeout: 120000 },
  );
  await fitHereButton.click();

  const previewResponse = await previewResponsePromise;
  const preview = await previewResponse.json();
  expect(previewResponse.ok()).toBeTruthy();
  expect(preview?.attemptId).toBeTruthy();
  expect(preview?.selectedAnchor?.anchorIntent).toBe("AFTER_START");
  assertNoExactDuplicateRows(Array.isArray(preview?.finalizedTimeline) ? preview.finalizedTimeline : []);

  const timeline = page.getByTestId("fit-here-main-timeline");
  await expect(timeline).toBeVisible({ timeout: 30000 });
  await expect(page.getByText(/finalized timeline preview/i)).toBeVisible({ timeout: 30000 });

  const requestBody = previewResponse.request().postDataJSON();
  expect(requestBody?.routeId).toBe(fixture.routeId);
  expect(requestBody?.selectedHotspotId).toBe(fixture.hotspotId);
  expect(requestBody?.anchor?.anchorIntent).toBe("AFTER_START");
  expect(requestBody?.anchor?.beforeRouteHotspotId).toBe(fixture.anchor.beforeRouteHotspotId);
});
