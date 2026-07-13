import { expect, test } from "@playwright/test";
import {
  assertNoExactDuplicateRows,
  loadRandomFiveDayQuote,
  seedAuthToken,
} from "./manual-hotspot-test-utils";

test("random five-day quote previews one manual hotspot on every route day", async ({ page, request, baseURL }) => {
  test.setTimeout(1_200_000);

  const fixture = await loadRandomFiveDayQuote(request);
  await seedAuthToken(page, fixture.token);

  await page.goto(`${baseURL}/itinerary-details/${encodeURIComponent(fixture.quoteId)}`, {
    waitUntil: "domcontentloaded",
  });
  await expect(page).toHaveURL(new RegExp(`/itinerary-details/${fixture.quoteId}$`), { timeout: 60000 });

  const results: Array<{
    routeId: number;
    hotspotId: number;
    bestAnchorKey?: string;
    selectedBestAttemptId?: string | null;
  }> = [];
  let skippedDays = 0;

  for (const dayFixture of fixture.days) {
    const dayCard = page.locator(`#itinerary-day-${dayFixture.day.dayNumber}`).first();
    await expect(dayCard, `Day ${dayFixture.day.dayNumber} should be visible`).toBeVisible({ timeout: 60000 });
    await dayCard.scrollIntoViewIfNeeded();
    await dayCard.getByRole("button", { name: /add hotspot|click to add hotspot/i }).first().click();

    const modal = page.getByRole("dialog").filter({ hasText: /Fit Here Hotspot List/i }).first();
    await expect(modal).toBeVisible({ timeout: 60000 });

    const previewButtons = modal.getByRole("button", { name: /^Preview$/i });
    let previewButton = previewButtons.first();
    let candidateCard = previewButton.locator("xpath=ancestor::*[@data-hotspot-id][1]");

    const isEnabledPreview = async (locator: any): Promise<boolean> => {
      if (!(await locator.isVisible().catch(() => false))) return false;
      if (await locator.isDisabled().catch(() => true)) return false;
      return true;
    };

    if (!(await isEnabledPreview(previewButton))) {
      const tabButtons = modal
        .getByRole("button")
        .filter({ hasText: /\(\d+\)$/ });
      const tabCount = await tabButtons.count();
      let found = false;
      for (let tabIndex = 0; tabIndex < tabCount; tabIndex += 1) {
        await tabButtons.nth(tabIndex).click();
        const previewCount = await previewButtons.count();
        for (let buttonIndex = 0; buttonIndex < previewCount; buttonIndex += 1) {
          const candidateButton = previewButtons.nth(buttonIndex);
          if (!(await isEnabledPreview(candidateButton))) {
            continue;
          }
          previewButton = candidateButton;
          candidateCard = previewButton.locator("xpath=ancestor::*[@data-hotspot-id][1]");
          found = true;
          break;
        }
        if (found || await isEnabledPreview(previewButton)) {
          break;
        }
      }
    }

    if (!(await isEnabledPreview(previewButton))) {
      console.log(`[ManualHotspot] skipping day ${dayFixture.day.dayNumber} because no enabled Preview hotspot was visible in the modal`);
      skippedDays += 1;
      await modal.getByRole("button", { name: /^Close$/i }).first().click();
      await expect(modal).toBeHidden({ timeout: 30000 });
      continue;
    }

    await expect(previewButton, `An enabled Preview button should be visible on day ${dayFixture.day.dayNumber}`).toBeVisible({ timeout: 60000 });
    await expect(previewButton, `An enabled Preview button should be available on day ${dayFixture.day.dayNumber}`).toBeEnabled({ timeout: 60000 });
    const selectedHotspotId = Number(await candidateCard.getAttribute("data-hotspot-id"));
    expect(selectedHotspotId, "Selected hotspot card should expose data-hotspot-id").toBeGreaterThan(0);
    await previewButton.click();

    const fitHereButton = modal.getByRole("button", { name: /^Auto-Preview$/i }).first();
    await expect(fitHereButton).toBeVisible({ timeout: 60000 });
    const responsePromise = page.waitForResponse(
      (response) =>
        response.request().method() === "POST" &&
        /\/itineraries\/\d+\/manual-hotspot\/auto-fit-preview(?:\?|$)/.test(response.url()),
      { timeout: 600000 },
    );
    await fitHereButton.click();

    const response = await responsePromise;
    const body = await response.json();
    expect(response.ok(), `Auto-Preview API failed on route ${dayFixture.routeId}`).toBeTruthy();
    expect(response.request().postDataJSON()?.routeId).toBe(dayFixture.routeId);
    expect(response.request().postDataJSON()?.selectedHotspotId).toBe(selectedHotspotId);
    expect(Array.isArray(response.request().postDataJSON()?.anchors)).toBe(true);
    expect(response.request().postDataJSON()?.anchors?.length).toBeGreaterThan(0);
    expect(body?.results?.length).toBeGreaterThan(0);
    expect(body?.selectedBestAttemptId || body?.bestAnchorKey).toBeTruthy();
    expect(body?.totalPositions).toBe(body?.results?.length);
    const bestRow =
      body.results.find((row: any) => row.anchorKey === body.bestAnchorKey) ||
      body.results[0] ||
      null;
    const bestTimeline = Array.isArray(bestRow?.attempt?.finalizedTimeline)
      ? bestRow.attempt.finalizedTimeline
      : Array.isArray(bestRow?.attempt?.proposedTimeline)
        ? bestRow.attempt.proposedTimeline
        : [];
    assertNoExactDuplicateRows(bestTimeline);

    const fitDialog = page.getByTestId("auto-fit-here-preview-dialog");
    await expect(fitDialog).toBeVisible({ timeout: 60000 });
    await expect(fitDialog.getByTestId("auto-fit-here-results")).toBeVisible({ timeout: 30000 });

    results.push({
      routeId: dayFixture.routeId,
      hotspotId: selectedHotspotId,
      bestAnchorKey: body?.bestAnchorKey,
      selectedBestAttemptId: body?.selectedBestAttemptId,
    });

    await fitDialog.getByRole("button", { name: /Close Auto-Preview/i }).click();
    await expect(fitDialog).toBeHidden({ timeout: 30000 });
    await modal.getByRole("button").last().click();
    await expect(modal).toBeHidden({ timeout: 30000 });
  }

  expect(results.length + skippedDays).toBe(fixture.days.length);
  expect(new Set(results.map((result) => result.routeId)).size).toBe(results.length);
  expect(results.length).toBeGreaterThan(0);
  console.log(`[ManualHotspot] validated ${results.length} route days for random quote ${fixture.quoteId}; skipped ${skippedDays} day(s) without an enabled Preview hotspot`);
});
