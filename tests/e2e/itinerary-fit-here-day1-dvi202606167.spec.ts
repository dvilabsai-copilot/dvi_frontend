import { expect, test, type APIRequestContext } from "@playwright/test";
import {
  API_BASE_URL,
  fetchItineraryDetails,
  seedAuthToken,
} from "./booking-engine-test-utils";

const QUOTE_ID = "DVI202606167";
const ROUTE_ID = 7194;
const SELECTED_HOTSPOT_ID = 42;
const RAMANATHA_SWAMI_TEMPLE_ID = 35;
const PAMBAN_BRIDGE_ID = 40;
const ALAGAR_KOYIL_ID = 28;
const FLOWER_MARKET_ID = 894;
const ARIYAMAAN_ID = 636;

type AvailableHotspot = {
  id?: number;
  name?: string;
  actionDisabled?: boolean;
  alreadyAdded?: boolean;
};

async function fetchAvailableHotspots(
  request: APIRequestContext,
  token: string,
  routeId: number,
): Promise<AvailableHotspot[]> {
  const response = await request.get(`${API_BASE_URL}/itineraries/hotspots/available/${routeId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  expect(response.ok(), `Failed to fetch available hotspots for route ${routeId}`).toBeTruthy();
  return (await response.json().catch(() => [])) as AvailableHotspot[];
}

function getHotspotId(row: any): number {
  return Number(row?.hotspotId || row?.hotspot_ID || row?.hotspot_id || row?.locationId || row?.id || 0);
}

function getPreviewTimeline(json: any): any[] {
  if (Array.isArray(json?.finalizedTimeline) && json.finalizedTimeline.length > 0) {
    return json.finalizedTimeline;
  }
  return Array.isArray(json?.proposedTimeline) ? json.proposedTimeline : [];
}

async function deleteManualHotspotIfPresent(
  request: APIRequestContext,
  token: string,
  planId: number,
  hotspotId: number,
): Promise<void> {
  const response = await request.delete(`${API_BASE_URL}/itineraries/${planId}/manual-hotspot/${hotspotId}`, {
    headers: { Authorization: `Bearer ${token}` },
    failOnStatusCode: false,
  });

  if (response.ok() || response.status() === 404 || response.status() === 409) {
    return;
  }

  const body = await response.text().catch(() => "");
  throw new Error(`Cleanup delete failed: status=${response.status()} body=${body}`);
}

test("day 2 Dhanushkodi after Alagar stays rejected when the exact anchor still cannot be preserved", async ({
  page,
  request,
  baseURL,
}) => {
  test.setTimeout(300000);

  const appBaseUrl = baseURL ?? "http://localhost:8080";
  const token = await seedAuthToken(page, request);

  await deleteManualHotspotIfPresent(request, token, 9706, SELECTED_HOTSPOT_ID);

  const details = await fetchItineraryDetails(request, token, QUOTE_ID);
  const dayTwo = (details.days || []).find((day: any) => Number(day?.dayNumber || 0) === 2);
  expect(Number(dayTwo?.id || 0)).toBe(ROUTE_ID);

  const availableHotspots = await fetchAvailableHotspots(request, token, ROUTE_ID);
  const dhanushkodi = availableHotspots.find((row) => Number(row?.id || 0) === SELECTED_HOTSPOT_ID);
  expect(dhanushkodi, "Dhanushkodi should be available for preview on route 7194").toBeTruthy();
  expect(dhanushkodi?.actionDisabled).not.toBeTruthy();
  expect(dhanushkodi?.alreadyAdded).not.toBeTruthy();

  await page.goto(`${appBaseUrl}/itinerary-details/${encodeURIComponent(QUOTE_ID)}`, {
    waitUntil: "domcontentloaded",
  });
  await expect(page).toHaveURL(new RegExp(`/itinerary-details/${QUOTE_ID}$`), {
    timeout: 30000,
  });

  const dayTwoCard = page.locator('#itinerary-day-2[data-day-number="2"]').first();
  await expect(dayTwoCard).toBeVisible({ timeout: 30000 });
  await dayTwoCard.scrollIntoViewIfNeeded();

  const addHotspotButton = dayTwoCard.getByRole("button", {
    name: /add hotspot|click to add hotspot/i,
  }).first();
  await expect(addHotspotButton).toBeVisible({ timeout: 30000 });
  await addHotspotButton.click();

  await expect(page.getByRole("heading", { name: /hotspot list/i })).toBeVisible({ timeout: 30000 });

  const rameswaramTab = page.getByText(/rameswaram hotspots/i).first();
  if (await rameswaramTab.isVisible().catch(() => false)) {
    await rameswaramTab.click();
  }

  const searchInput = page.getByPlaceholder(/search hotspot/i).first();
  if (await searchInput.isVisible().catch(() => false)) {
    await searchInput.fill("Dhanushkodi");
  }

  const hotspotCard = page.locator(`[data-hotspot-id="${SELECTED_HOTSPOT_ID}"]`).first();
  await expect(hotspotCard).toBeVisible({ timeout: 30000 });
  await hotspotCard.getByRole("button", { name: /preview/i }).click();

  await expect(page.getByText(/selected for fit here/i)).toBeVisible({ timeout: 30000 });
  await expect(page.getByText(/dhanushkodi/i).first()).toBeVisible({ timeout: 30000 });

  const anchor = page
    .locator('[data-testid="fit-here-anchor"][data-anchor-intent="AFTER_ATTRACTION"][data-anchor-from*="Alagar"][data-anchor-to*="Flower"]')
    .first();
  await expect(anchor).toBeVisible({ timeout: 30000 });

  const fitPreviewResponsePromise = page.waitForResponse(
    (resp) =>
      resp.request().method() === "POST" &&
      resp.url().includes("/manual-hotspot/fit-preview"),
    { timeout: 90000 },
  );

  await anchor.getByRole("button", { name: /fit here/i }).click();

  const fitPreviewResponse = await fitPreviewResponsePromise;
  expect(fitPreviewResponse.ok(), "Fit preview API should succeed").toBeTruthy();

  const requestPayload = fitPreviewResponse.request().postDataJSON();
  expect(requestPayload?.routeId).toBe(ROUTE_ID);
  expect(requestPayload?.selectedHotspotId).toBe(SELECTED_HOTSPOT_ID);
  expect(requestPayload?.allowP3Removal).toBe(true);
  expect(requestPayload?.allowP1P2Removal).toBe(true);
  expect(requestPayload?.anchor?.afterHotspotId).toBe(ALAGAR_KOYIL_ID);
  expect(requestPayload?.anchor?.beforeHotspotId).toBe(FLOWER_MARKET_ID);

  const previewJson = await fitPreviewResponse.json();
  expect(previewJson?.resultType).toBe("CANNOT_FIT");
  expect(previewJson?.canConfirm).toBe(false);
  expect(String(previewJson?.rejectedReasons?.[0] || "")).toMatch(/could not fit|could not preserve|route end/i);

  const proposedTimeline = getPreviewTimeline(previewJson);
  const selectedAttractionRows = proposedTimeline.filter((row: any) => (
    getHotspotId(row) === SELECTED_HOTSPOT_ID && String(row?.type || "").toLowerCase() === "attraction"
  ));
  expect(selectedAttractionRows.length, "Finalized preview should still show the inserted Dhanushkodi row").toBeGreaterThan(0);

  const removedIds = [
    ...(Array.isArray(previewJson?.removedHotspots) ? previewJson.removedHotspots : []),
    ...(Array.isArray(previewJson?.resolution?.removedHotspots) ? previewJson.resolution.removedHotspots : []),
  ].map((row: any) => getHotspotId(row));
  expect(removedIds).not.toContain(SELECTED_HOTSPOT_ID);
  expect(removedIds).not.toContain(ARIYAMAAN_ID);

  const dialog = page.getByTestId("fit-here-preview-dialog");
  await expect(dialog).toBeVisible({ timeout: 30000 });

  const mainTimeline = page.getByTestId("fit-here-main-timeline");
  await expect(mainTimeline).toBeVisible({ timeout: 30000 });
  await expect(mainTimeline).toContainText(/dhanushkodi/i);
  await expect(mainTimeline).toContainText(/ariyamaan/i);

  const changes = page.getByTestId("fit-here-changes-required");
  await expect(changes).toBeVisible();
  await expect(changes).toContainText(/changes required/i);
  await expect(changes).toContainText(/no hotspot removed/i);
  await expect(changes.getByRole("checkbox")).toHaveCount(0);

  const rescueAttempts = page.getByTestId("fit-here-rescue-attempts");
  await expect(rescueAttempts).toHaveCount(0);

  const confirmButton = page.getByRole("button", { name: /confirm fit here/i });
  await expect(confirmButton).toBeVisible();
  await expect(confirmButton).toBeDisabled();
  await expect(page.getByRole("button", { name: /add anyway as conflict/i })).toHaveCount(0);
});

test("day 2 Dhanushkodi after Flower keeps the clicked exact-anchor timeline", async ({
  page,
  request,
  baseURL,
}) => {
  test.setTimeout(300000);

  const appBaseUrl = baseURL ?? "http://localhost:8080";
  const token = await seedAuthToken(page, request);

  await page.goto(`${appBaseUrl}/itinerary-details/${encodeURIComponent(QUOTE_ID)}`, {
    waitUntil: "domcontentloaded",
  });
  await expect(page).toHaveURL(new RegExp(`/itinerary-details/${QUOTE_ID}$`), {
    timeout: 30000,
  });

  const dayTwoCard = page.locator('#itinerary-day-2[data-day-number="2"]').first();
  await expect(dayTwoCard).toBeVisible({ timeout: 30000 });
  await dayTwoCard.scrollIntoViewIfNeeded();

  const addHotspotButton = dayTwoCard.getByRole("button", {
    name: /add hotspot|click to add hotspot/i,
  }).first();
  await expect(addHotspotButton).toBeVisible({ timeout: 30000 });
  await addHotspotButton.click();

  await expect(page.getByRole("heading", { name: /hotspot list/i })).toBeVisible({ timeout: 30000 });

  const rameswaramTab = page.getByText(/rameswaram hotspots/i).first();
  if (await rameswaramTab.isVisible().catch(() => false)) {
    await rameswaramTab.click();
  }

  const searchInput = page.getByPlaceholder(/search hotspot/i).first();
  if (await searchInput.isVisible().catch(() => false)) {
    await searchInput.fill("Dhanushkodi");
  }

  const hotspotCard = page.locator(`[data-hotspot-id="${SELECTED_HOTSPOT_ID}"]`).first();
  await expect(hotspotCard).toBeVisible({ timeout: 30000 });
  await hotspotCard.getByRole("button", { name: /preview/i }).click();

  const anchor = page
    .locator('[data-testid="fit-here-anchor"][data-anchor-intent="AFTER_ATTRACTION"][data-anchor-from*="Flower"][data-anchor-to*="Ariyamaan"]')
    .first();
  await expect(anchor).toBeVisible({ timeout: 30000 });

  const fitPreviewResponsePromise = page.waitForResponse(
    (resp) =>
      resp.request().method() === "POST" &&
      resp.url().includes("/manual-hotspot/fit-preview"),
    { timeout: 90000 },
  );

  await anchor.getByRole("button", { name: /fit here/i }).click();

  const fitPreviewResponse = await fitPreviewResponsePromise;
  expect(fitPreviewResponse.ok(), "Fit preview API should succeed").toBeTruthy();

  const previewJson = await fitPreviewResponse.json();
  expect(previewJson?.resultType).toBe("FITS_DIRECTLY");
  expect(previewJson?.canConfirm).toBe(true);

  const proposedTimeline = getPreviewTimeline(previewJson);
  const flowerIndex = proposedTimeline.findIndex((row: any) => (
    getHotspotId(row) === FLOWER_MARKET_ID && String(row?.type || "").toLowerCase() === "attraction"
  ));
  const dhanushTravelIndex = proposedTimeline.findIndex((row: any) => (
    getHotspotId(row) === SELECTED_HOTSPOT_ID && String(row?.type || "").toLowerCase() === "travel"
  ));
  const dhanushIndex = proposedTimeline.findIndex((row: any) => (
    getHotspotId(row) === SELECTED_HOTSPOT_ID && String(row?.type || "").toLowerCase() === "attraction"
  ));
  const ariyamaanTravelIndex = proposedTimeline.findIndex((row: any) => (
    getHotspotId(row) === ARIYAMAAN_ID && String(row?.type || "").toLowerCase() === "travel"
  ));
  const ariyamaanIndex = proposedTimeline.findIndex((row: any) => (
    getHotspotId(row) === ARIYAMAAN_ID && String(row?.type || "").toLowerCase() === "attraction"
  ));

  expect(flowerIndex).toBeGreaterThanOrEqual(0);
  expect(dhanushTravelIndex).toBeGreaterThan(flowerIndex);
  expect(dhanushIndex).toBeGreaterThan(dhanushTravelIndex);
  expect(ariyamaanTravelIndex).toBeGreaterThan(dhanushIndex);
  expect(ariyamaanIndex).toBeGreaterThan(ariyamaanTravelIndex);

  const dialog = page.getByTestId("fit-here-preview-dialog");
  await expect(dialog).toBeVisible({ timeout: 30000 });
  await expect(page.getByTestId("fit-here-main-timeline")).toContainText(/flower market/i);
  await expect(page.getByTestId("fit-here-main-timeline")).toContainText(/dhanushkodi/i);
  await expect(page.getByTestId("fit-here-main-timeline")).toContainText(/ariyamaan/i);
  await expect(page.getByTestId("fit-here-rescue-attempts")).toHaveCount(0);
  await expect(page.getByRole("button", { name: /confirm fit here/i })).toBeEnabled();
});

test("day 2 Fit Here confirm saves the same preview timeline for the Dhanushkodi exact-anchor fix", async ({
  page,
  request,
  baseURL,
}) => {
  test.setTimeout(300000);

  const appBaseUrl = baseURL ?? "http://localhost:8080";
  const token = await seedAuthToken(page, request);

  await deleteManualHotspotIfPresent(request, token, 9706, SELECTED_HOTSPOT_ID);

  const details = await fetchItineraryDetails(request, token, QUOTE_ID);
  const dayTwo = (details.days || []).find((day: any) => Number(day?.dayNumber || 0) === 2);
  const dayTwoRouteId = Number(dayTwo?.id || 0);
  expect(dayTwoRouteId, "Day 2 route ID should exist after row rebuild").toBeGreaterThan(0);

  const availableBefore = await fetchAvailableHotspots(request, token, dayTwoRouteId);
  const dhanushBefore = availableBefore.find((row) => Number(row?.id || 0) === SELECTED_HOTSPOT_ID);
  expect(dhanushBefore, "Dhanushkodi should be available before confirm test").toBeTruthy();
  expect(dhanushBefore?.alreadyAdded).not.toBeTruthy();

  let cleanupNeeded = false;

  try {
    await page.goto(`${appBaseUrl}/itinerary-details/${encodeURIComponent(QUOTE_ID)}`, {
      waitUntil: "domcontentloaded",
    });
    await expect(page).toHaveURL(new RegExp(`/itinerary-details/${QUOTE_ID}$`), {
      timeout: 30000,
    });

    const dayTwoCard = page.locator('#itinerary-day-2[data-day-number="2"]').first();
    await expect(dayTwoCard).toBeVisible({ timeout: 30000 });
    await dayTwoCard.scrollIntoViewIfNeeded();

    const addHotspotButton = dayTwoCard.getByRole("button", {
      name: /add hotspot|click to add hotspot/i,
    }).first();
    await expect(addHotspotButton).toBeVisible({ timeout: 30000 });
    await addHotspotButton.click();

    await expect(page.getByRole("heading", { name: /hotspot list/i })).toBeVisible({ timeout: 30000 });

    const rameswaramTab = page.getByText(/rameswaram hotspots/i).first();
    if (await rameswaramTab.isVisible().catch(() => false)) {
      await rameswaramTab.click();
    }

    const searchInput = page.getByPlaceholder(/search hotspot/i).first();
    if (await searchInput.isVisible().catch(() => false)) {
      await searchInput.fill("Dhanushkodi");
    }

    const hotspotCard = page.locator(`[data-hotspot-id="${SELECTED_HOTSPOT_ID}"]`).first();
    await expect(hotspotCard).toBeVisible({ timeout: 30000 });
    await hotspotCard.getByRole("button", { name: /preview/i }).click();

    await expect(page.getByText(/selected for fit here/i)).toBeVisible({ timeout: 30000 });
    await expect(page.getByText(/dhanushkodi/i).first()).toBeVisible({ timeout: 30000 });

    const anchor = page
      .locator('[data-testid="fit-here-anchor"][data-anchor-intent="AFTER_ATTRACTION"][data-anchor-from*="Flower"][data-anchor-to*="Ariyamaan"]')
      .first();
    await expect(anchor).toBeVisible({ timeout: 30000 });

    const fitPreviewResponsePromise = page.waitForResponse(
      (resp) =>
        resp.request().method() === "POST" &&
        resp.url().includes("/manual-hotspot/fit-preview"),
      { timeout: 90000 },
    );

    await anchor.getByRole("button", { name: /fit here/i }).click();

    const fitPreviewResponse = await fitPreviewResponsePromise;
    expect(fitPreviewResponse.ok(), "Fit preview API should succeed").toBeTruthy();

    const previewJson = await fitPreviewResponse.json();
    expect(previewJson?.resultType).toBe("FITS_DIRECTLY");
    expect(previewJson?.canConfirm).toBe(true);

    const previewSelectedRow = getPreviewTimeline(previewJson).find((row: any) => (
      getHotspotId(row) === SELECTED_HOTSPOT_ID && String(row?.type || "").toLowerCase() === "attraction"
    ));
    expect(previewSelectedRow, "Preview should include Dhanushkodi attraction row").toBeTruthy();
    const previewSelectedTime = String(previewSelectedRow?.timeRange || "");
    expect(previewSelectedTime).toBeTruthy();

    const dialog = page.getByTestId("fit-here-preview-dialog");
    await expect(dialog).toBeVisible({ timeout: 30000 });
    await expect(page.getByRole("button", { name: /confirm fit here/i })).toBeEnabled();

    const fitConfirmResponsePromise = page.waitForResponse(
      (resp) =>
        resp.request().method() === "POST" &&
        resp.url().includes("/manual-hotspot/fit-confirm"),
      { timeout: 90000 },
    );

    await page.getByRole("button", { name: /confirm fit here/i }).click();

    const fitConfirmResponse = await fitConfirmResponsePromise;
    expect(fitConfirmResponse.ok(), "Fit confirm API should succeed").toBeTruthy();
    const confirmJson = await fitConfirmResponse.json();
    cleanupNeeded = true;

    expect(confirmJson?.success).toBe(true);
    expect(Number(confirmJson?.routeId || 0)).toBe(dayTwoRouteId);

    const confirmSelectedRow = (Array.isArray(confirmJson?.routeTimeline) ? confirmJson.routeTimeline : []).find((row: any) => (
      getHotspotId(row) === SELECTED_HOTSPOT_ID && String(row?.type || "").toLowerCase() === "attraction"
    ));
    expect(confirmSelectedRow, "Confirmed route timeline should include Dhanushkodi attraction row").toBeTruthy();
    expect(String(confirmSelectedRow?.timeRange || "")).toBe(previewSelectedTime);

    await expect(dialog).toHaveCount(0);
    await expect(dayTwoCard).toContainText(/dhanushkodi/i, { timeout: 30000 });

    const availableAfter = await fetchAvailableHotspots(request, token, dayTwoRouteId);
    const dhanushAfter = availableAfter.find((row) => Number(row?.id || 0) === SELECTED_HOTSPOT_ID);
    expect(dhanushAfter, "Dhanushkodi should still appear in available-hotspots payload after confirm").toBeTruthy();
    expect(dhanushAfter?.alreadyAdded).toBeTruthy();
    expect(dhanushAfter?.actionDisabled).toBeTruthy();
  } finally {
    if (cleanupNeeded) {
      await deleteManualHotspotIfPresent(request, token, 9706, SELECTED_HOTSPOT_ID);
    }
  }
});

test("day 2 Ramanatha Fit Here confirm saves the exact preview timeline without 409 retry", async ({
  page,
  request,
  baseURL,
}) => {
  test.setTimeout(300000);

  const appBaseUrl = baseURL ?? "http://localhost:8080";
  const token = await seedAuthToken(page, request);

  await deleteManualHotspotIfPresent(request, token, 9706, RAMANATHA_SWAMI_TEMPLE_ID);

  const details = await fetchItineraryDetails(request, token, QUOTE_ID);
  const dayTwo = (details.days || []).find((day: any) => Number(day?.dayNumber || 0) === 2);
  const dayTwoRouteId = Number(dayTwo?.id || 0);
  expect(dayTwoRouteId, "Day 2 route ID should exist after row rebuild").toBeGreaterThan(0);

  const availableHotspots = await fetchAvailableHotspots(request, token, dayTwoRouteId);
  const ramanatha = availableHotspots.find((row) => Number(row?.id || 0) === RAMANATHA_SWAMI_TEMPLE_ID);
  expect(ramanatha, "Ramanatha swami Temple should be available for preview on day 2").toBeTruthy();
  expect(ramanatha?.actionDisabled).not.toBeTruthy();

  await page.goto(`${appBaseUrl}/itinerary-details/${encodeURIComponent(QUOTE_ID)}`, {
    waitUntil: "domcontentloaded",
  });
  await expect(page).toHaveURL(new RegExp(`/itinerary-details/${QUOTE_ID}$`), {
    timeout: 30000,
  });

  const dayTwoCard = page.locator('#itinerary-day-2[data-day-number="2"]').first();
  await expect(dayTwoCard).toBeVisible({ timeout: 30000 });
  await dayTwoCard.scrollIntoViewIfNeeded();

  const addHotspotButton = dayTwoCard.getByRole("button", {
    name: /add hotspot|click to add hotspot/i,
  }).first();
  await expect(addHotspotButton).toBeVisible({ timeout: 30000 });
  await addHotspotButton.click();

  await expect(page.getByRole("heading", { name: /hotspot list/i })).toBeVisible({ timeout: 30000 });

  const rameswaramTab = page.getByText(/rameswaram hotspots/i).first();
  if (await rameswaramTab.isVisible().catch(() => false)) {
    await rameswaramTab.click();
  }

  const searchInput = page.getByPlaceholder(/search hotspot/i).first();
  if (await searchInput.isVisible().catch(() => false)) {
    await searchInput.fill("Ramanatha");
  }

  const hotspotCard = page.locator(`[data-hotspot-id="${RAMANATHA_SWAMI_TEMPLE_ID}"]`).first();
  await expect(hotspotCard).toBeVisible({ timeout: 30000 });
  await hotspotCard.getByRole("button", { name: /preview/i }).click();

  const anchor = page
    .locator(`[data-testid="fit-here-anchor"][data-anchor-intent="AFTER_ATTRACTION"][data-anchor-from*="Pamban"]`)
    .first();
  await expect(anchor).toBeVisible({ timeout: 30000 });

  const fitPreviewResponsePromise = page.waitForResponse(
    (resp) =>
      resp.request().method() === "POST" &&
      resp.url().includes("/manual-hotspot/fit-preview"),
    { timeout: 90000 },
  );

  await anchor.getByRole("button", { name: /fit here/i }).click();

  const fitPreviewResponse = await fitPreviewResponsePromise;
  expect(fitPreviewResponse.ok(), "Ramanatha Fit Here preview API should succeed").toBeTruthy();

  const fitPreviewRequestPayload = fitPreviewResponse.request().postDataJSON();
  expect(fitPreviewRequestPayload?.anchor?.anchorIntent).toMatch(/AFTER_ATTRACTION/i);
  expect(Number(fitPreviewRequestPayload?.anchor?.afterHotspotId || 0)).toBe(PAMBAN_BRIDGE_ID);

  const previewJson = await fitPreviewResponse.json();
  expect(previewJson?.resultType).toBe("FITS_DIRECTLY");
  expect(previewJson?.canConfirm).toBe(true);
  expect(previewJson?.selectedAnchor?.anchorIntent || previewJson?.anchor?.anchorIntent).toMatch(/AFTER_ATTRACTION/i);
  const previewSelectedRow = getPreviewTimeline(previewJson).find((row: any) => (
    getHotspotId(row) === RAMANATHA_SWAMI_TEMPLE_ID && String(row?.type || "").toLowerCase() === "attraction"
  ));
  expect(previewSelectedRow, "Preview should include Ramanatha attraction row").toBeTruthy();
  const previewSelectedTime = String(previewSelectedRow?.timeRange || "");
  expect(previewSelectedTime).toBeTruthy();

  const dialog = page.getByTestId("fit-here-preview-dialog");
  await expect(dialog).toBeVisible({ timeout: 30000 });

  const confirmButton = page.getByRole("button", { name: /confirm fit here/i });
  await expect(confirmButton).toBeVisible();
  await expect(confirmButton).toBeEnabled();

  const fitConfirmResponsePromise = page.waitForResponse(
    (resp) =>
      resp.request().method() === "POST" &&
      resp.url().includes("/manual-hotspot/fit-confirm"),
    { timeout: 90000 },
  );

  await confirmButton.click();

  const fitConfirmResponse = await fitConfirmResponsePromise;
  expect(fitConfirmResponse.ok(), "Fit confirm should succeed without a server-preview-changed retry").toBeTruthy();

  const fitConfirmJson = await fitConfirmResponse.json();
  expect(fitConfirmJson?.success).toBe(true);
  expect(Number(fitConfirmJson?.routeId || 0)).toBe(dayTwoRouteId);
  expect(Number(fitConfirmJson?.selectedHotspotId || 0)).toBe(RAMANATHA_SWAMI_TEMPLE_ID);
  const confirmSelectedRow = (Array.isArray(fitConfirmJson?.routeTimeline) ? fitConfirmJson.routeTimeline : []).find((row: any) => (
    getHotspotId(row) === RAMANATHA_SWAMI_TEMPLE_ID && String(row?.type || "").toLowerCase() === "attraction"
  ));
  expect(confirmSelectedRow, "Confirmed route timeline should include Ramanatha attraction row").toBeTruthy();
  expect(String(confirmSelectedRow?.timeRange || "")).toBe(previewSelectedTime);

  await expect(dialog).toHaveCount(0);
});
