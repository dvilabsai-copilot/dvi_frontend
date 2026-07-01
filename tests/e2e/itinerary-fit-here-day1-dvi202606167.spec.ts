import { expect, test, type APIRequestContext } from "@playwright/test";
import {
  API_BASE_URL,
  fetchItineraryDetails,
  seedAuthToken,
} from "./booking-engine-test-utils";

const QUOTE_ID = "DVI202606167";
const SELECTED_HOTSPOT_ID = 42;
const RAMANATHA_SWAMI_TEMPLE_ID = 35;
const AGNI_TEERTHAM_ID = 36;
const PAMBAN_BRIDGE_ID = 40;
const GANDHAMADHANA_PARVATHAM_ID = 38;
const ALAGAR_KOYIL_ID = 28;
const FLOWER_MARKET_ID = 894;
const ARIYAMAAN_ID = 636;
const RESET_BASIC_INFO_PAYLOAD = {"plan":{"itinerary_plan_id":9706,"agent_id":126,"staff_id":0,"location_id":0,"arrival_point":"Madurai Airport","departure_point":"Trivandrum, Domestic Airport","itinerary_preference":2,"itinerary_type":2,"preferred_hotel_category":[],"hotel_facilities":[],"trip_start_date":"2026-07-01T16:00:00+05:30","trip_end_date":"2026-07-04T12:00:00+05:30","pick_up_date_and_time":"2026-07-01T16:00:00+05:30","arrival_type":1,"departure_type":1,"no_of_nights":3,"no_of_days":4,"budget":15000,"entry_ticket_required":0,"guide_for_itinerary":0,"nationality":101,"food_type":0,"meal_plan_breakfast":0,"meal_plan_lunch":0,"meal_plan_dinner":0,"adult_count":2,"child_count":0,"infant_count":0,"special_instructions":""},"routes":[{"location_name":"Madurai Airport","next_visiting_location":"Madurai","itinerary_route_date":"2026-07-01T00:00:00+05:30","no_of_days":1,"no_of_km":12.4,"direct_to_next_visiting_place":0,"via_route":"","via_routes":[]},{"location_name":"Madurai","next_visiting_location":"Rameswaram","itinerary_route_date":"2026-07-02T00:00:00+05:30","no_of_days":2,"no_of_km":173,"direct_to_next_visiting_place":0,"via_route":"","via_routes":[]},{"location_name":"Rameswaram","next_visiting_location":"Kanyakumari","itinerary_route_date":"2026-07-03T00:00:00+05:30","no_of_days":3,"no_of_km":308,"direct_to_next_visiting_place":0,"via_route":"","via_routes":[]},{"location_name":"Kanyakumari","next_visiting_location":"Trivandrum, Domestic Airport","itinerary_route_date":"2026-07-04T00:00:00+05:30","no_of_days":4,"no_of_km":89.4,"direct_to_next_visiting_place":0,"via_route":"","via_routes":[]}],"vehicles":[{"vehicle_type_id":1,"vehicle_count":1}],"travellers":[{"room_id":1,"traveller_type":1},{"room_id":1,"traveller_type":1}],"previousDayBillingDecisionProvided":false,"previousDayBillingConfirmed":false};

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

async function assertDay2RamanathaResetBaseline(
  request: APIRequestContext,
  token: string,
  quoteId: string,
  routeId: number,
): Promise<void> {
  const details = await fetchItineraryDetails(request, token, quoteId);
  const dayTwo = (details.days || []).find((row: any) => Number(row?.dayNumber || 0) === 2);
  expect(dayTwo, `Day 2 should exist for ${quoteId}`).toBeTruthy();

  const dayTwoNames = Array.isArray(dayTwo?.segments)
    ? dayTwo.segments.map((row: any) => getSegmentName(row)).filter(Boolean)
    : [];
  const ramanathaInDayTwoDetails = dayTwoNames.some((name: string) => /Ramanatha/i.test(name));

  const availableHotspots = await fetchAvailableHotspots(request, token, routeId);
  const ramanatha = availableHotspots.find((row) => Number(row?.id || 0) === RAMANATHA_SWAMI_TEMPLE_ID) || null;

  console.log("[FitHere][ramanatha_reset_baseline]", {
    routeId,
    ramanathaInDayTwoDetails,
    ramanathaAvailable: !!ramanatha,
    ramanathaAlreadyAdded: ramanatha?.alreadyAdded ?? null,
    ramanathaAlreadyAddedOnOtherRoute: (ramanatha as any)?.alreadyAddedOnOtherRoute ?? null,
    ramanathaAvailabilityStatus: (ramanatha as any)?.availabilityStatus ?? null,
    ramanathaActionDisabled: ramanatha?.actionDisabled ?? null,
    ramanathaReason: (ramanatha as any)?.availabilityReason ?? null,
    dayTwoNames,
  });

  expect(
    ramanathaInDayTwoDetails,
    "After reset, Ramanatha should not exist in Day 2 details before UI Fit Here begins",
  ).toBe(false);

  expect(ramanatha, "After reset, Ramanatha should still be available for Day 2").toBeTruthy();
  expect(
    Boolean(ramanatha?.alreadyAdded),
    "After reset, Ramanatha should not be marked alreadyAdded for Day 2",
  ).toBe(false);
  expect(
    String((ramanatha as any)?.availabilityStatus || ""),
    "After reset, Ramanatha availability should be AVAILABLE for Day 2",
  ).toBe("AVAILABLE");
  expect(
    Boolean(ramanatha?.actionDisabled),
    "After reset, Ramanatha should not be actionDisabled for Day 2",
  ).toBe(false);
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

function getSegmentName(row: any): string {
  return String(
    row?.name ||
    row?.title ||
    row?.text ||
    row?.label ||
    row?.hotspotName ||
    row?.description ||
    "",
  ).trim();
}

async function getRouteIdForDay(
  request: APIRequestContext,
  token: string,
  quoteId: string,
  dayNumber: number,
): Promise<number> {
  const details = await fetchItineraryDetails(request, token, quoteId);
  const day = (details.days || []).find((row: any) => Number(row?.dayNumber || 0) === dayNumber);
  const routeId = Number(day?.id || 0);

  expect(routeId, `Day ${dayNumber} route ID should exist for ${quoteId}`).toBeGreaterThan(0);

  return routeId;
}

async function deleteManualHotspotIfPresent(
  request: APIRequestContext,
  token: string,
  planId: number,
  hotspotId: number,
): Promise<void> {
  let response;
  try {
    response = await request.delete(`${API_BASE_URL}/itineraries/${planId}/manual-hotspot/${hotspotId}`, {
      headers: { Authorization: `Bearer ${token}` },
      failOnStatusCode: false,
    });
  } catch (error) {
    const message = String((error as Error)?.message || error || "");
    if (message.includes("ECONNRESET") || message.includes("ECONNREFUSED")) {
      return;
    }
    throw error;
  }

  if (response.ok() || response.status() === 404 || response.status() === 409) {
    return;
  }

  const body = await response.text().catch(() => "");
  throw new Error(`Cleanup delete failed: status=${response.status()} body=${body}`);
}

async function resetItineraryBasicInfo(request: APIRequestContext, token: string): Promise<void> {
  const response = await request.post(`${API_BASE_URL}/itineraries/?type=itineary_basic_info`, {
    headers: { Authorization: `Bearer ${token}` },
    data: RESET_BASIC_INFO_PAYLOAD,
  });

  expect(response.ok(), "Resetting itinerary basic info should succeed").toBeTruthy();
}

async function openHotspotPreview(page: any, hotspotId: number, hotspotName: string): Promise<void> {
  const searchInput = page.getByPlaceholder(/search hotspot/i).first();
  if (await searchInput.isVisible().catch(() => false)) {
    await searchInput.fill(hotspotName);
  }

  const hotspotCard = page.locator(`[data-hotspot-id="${hotspotId}"]`).first();
  await expect(hotspotCard, `${hotspotName} hotspot card should be visible`).toBeVisible({ timeout: 30000 });
  await hotspotCard.getByRole("button", { name: /preview/i }).click();

  await expect(page.getByText(/selected for fit here/i)).toBeVisible({ timeout: 30000 });
  await expect(page.getByText(new RegExp(hotspotName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i")).first()).toBeVisible({ timeout: 30000 });
}

async function confirmFitHereViaUi(page: any, hotspotId: number, hotspotName: string, anchorSelector: string): Promise<string> {
  const hotspotCard = page.locator(`[data-hotspot-id="${hotspotId}"]`).first();
  await expect(hotspotCard, `${hotspotName} hotspot card should be visible`).toBeVisible({ timeout: 30000 });
  await hotspotCard.getByRole("button", { name: /preview/i }).click();

  const anchor = page.locator(anchorSelector).first();
  await expect(anchor, `Fit Here anchor for ${hotspotName} should be visible`).toBeVisible({ timeout: 30000 });

  const fitPreviewResponsePromise = page.waitForResponse(
    (resp) =>
      resp.request().method() === "POST" &&
      resp.url().includes("/manual-hotspot/fit-preview"),
    { timeout: 90000 },
  );

  await anchor.getByRole("button", { name: /fit here/i }).click();
  const fitPreviewResponse = await fitPreviewResponsePromise;
  expect(fitPreviewResponse.ok(), `${hotspotName} preview should succeed`).toBeTruthy();

  const previewJson = await fitPreviewResponse.json();
  expect(previewJson?.selectedHotspotId || previewJson?.hotspotId || 0).toBeTruthy();

  const dialog = page.getByTestId("fit-here-preview-dialog");
  await expect(dialog).toBeVisible({ timeout: 30000 });

  const removalAckCheckbox = dialog.getByTestId("fit-here-removal-ack-checkbox");
  if (await removalAckCheckbox.count()) {
    await expect(removalAckCheckbox).toBeVisible({ timeout: 30000 });
    await removalAckCheckbox.check();
  }

  const confirmButton = dialog.getByRole("button", { name: /confirm/i }).first();
  await expect(confirmButton).toBeEnabled({ timeout: 30000 });

  const fitConfirmResponsePromise = page.waitForResponse(
    (resp) =>
      resp.request().method() === "POST" &&
      resp.url().includes("/manual-hotspot/fit-confirm"),
    { timeout: 90000 },
  );

  await confirmButton.click();
  const fitConfirmResponse = await fitConfirmResponsePromise;
  expect(fitConfirmResponse.ok(), `${hotspotName} confirm should succeed`).toBeTruthy();

  const fitConfirmJson = await fitConfirmResponse.json();
  expect(fitConfirmJson?.success).toBe(true);
  expect(String(fitConfirmJson?.selectedHotspotId || "")).toBe(String(hotspotId));
  await expect(dialog).toHaveCount(0);

  const finalRowName = String(
    fitConfirmJson?.routeTimeline?.find((row: any) => (
      getHotspotId(row) === hotspotId && String(row?.type || "").toLowerCase() === "attraction"
    ))?.hotspotName ||
    fitConfirmJson?.routeTimeline?.find((row: any) => (
      getHotspotId(row) === hotspotId && String(row?.type || "").toLowerCase() === "attraction"
    ))?.name ||
    "",
  ).trim();

  return finalRowName;
}

async function previewExactAnchorAndReadResponse(page: any, anchorSelector: string) {
  const anchor = page.locator(anchorSelector).first();
  await expect(anchor, `Fit Here anchor matching ${anchorSelector} should be visible`).toBeVisible({ timeout: 30000 });

  const fitPreviewResponsePromise = page.waitForResponse(
    (resp) =>
      resp.request().method() === "POST" &&
      resp.url().includes("/manual-hotspot/fit-preview"),
    { timeout: 90000 },
  );

  await anchor.getByRole("button", { name: /fit here/i }).click();

  const fitPreviewResponse = await fitPreviewResponsePromise;
  expect(fitPreviewResponse.ok(), "Fit preview API should succeed").toBeTruthy();
  return {
    requestPayload: fitPreviewResponse.request().postDataJSON(),
    previewJson: await fitPreviewResponse.json(),
  };
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

  const dayTwoRouteId = await getRouteIdForDay(request, token, QUOTE_ID, 2);

  const availableHotspots = await fetchAvailableHotspots(request, token, dayTwoRouteId);
  const dhanushkodi = availableHotspots.find((row) => Number(row?.id || 0) === SELECTED_HOTSPOT_ID);
  expect(dhanushkodi, `Dhanushkodi should be available for preview on day 2 route ${dayTwoRouteId}`).toBeTruthy();
  expect(dhanushkodi?.actionDisabled).not.toBeTruthy();

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
  expect(requestPayload?.routeId).toBe(dayTwoRouteId);
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
    const removalAckCheckbox = dialog.getByTestId("fit-here-removal-ack-checkbox");
    if (await removalAckCheckbox.count()) {
      await expect(removalAckCheckbox).toBeVisible({ timeout: 30000 });
      await removalAckCheckbox.check();
      await expect(removalAckCheckbox).toBeChecked();
    }

    const footer = page.getByTestId("fit-here-modal-footer");
    const confirmButton = footer.getByRole("button", { name: /confirm/i });
    await expect(confirmButton).toBeEnabled();

    const fitConfirmResponsePromise = page.waitForResponse(
      (resp) =>
        resp.request().method() === "POST" &&
        resp.url().includes("/manual-hotspot/fit-confirm"),
      { timeout: 90000 },
    );

    await confirmButton.click();

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

test("day 2 UI Fit Here flow adds Ramanatha, Agni, and Gandhamadhana to the main timeline", async ({
  page,
  request,
  baseURL,
}) => {
  test.setTimeout(300000);

  const appBaseUrl = baseURL ?? "http://localhost:8080";
  const token = await seedAuthToken(page, request);

  const details = await fetchItineraryDetails(request, token, QUOTE_ID);
  const dayTwo = (details.days || []).find((day: any) => Number(day?.dayNumber || 0) === 2);
  const dayTwoRouteId = Number(dayTwo?.id || 0);
  expect(dayTwoRouteId, "Day 2 route ID should exist").toBeGreaterThan(0);

  const availableHotspots = await fetchAvailableHotspots(request, token, dayTwoRouteId);
  for (const id of [RAMANATHA_SWAMI_TEMPLE_ID, AGNI_TEERTHAM_ID, GANDHAMADHANA_PARVATHAM_ID]) {
    const hotspot = availableHotspots.find((row) => Number(row?.id || 0) === id);
    expect(hotspot, `Hotspot ${id} should be available on Day 2`).toBeTruthy();
  }

  await page.goto(`${appBaseUrl}/itinerary-details/${encodeURIComponent(QUOTE_ID)}`, {
    waitUntil: "domcontentloaded",
  });
  await expect(page).toHaveURL(new RegExp(`/itinerary-details/${QUOTE_ID}$`), { timeout: 30000 });

  const dayTwoCard = page.locator('#itinerary-day-2[data-day-number="2"]').first();
  await expect(dayTwoCard).toBeVisible({ timeout: 30000 });
  await dayTwoCard.scrollIntoViewIfNeeded();

  const addHotspotButton = dayTwoCard.getByRole("button", { name: /add hotspot|click to add hotspot/i }).first();
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
  await confirmFitHereViaUi(
    page,
    RAMANATHA_SWAMI_TEMPLE_ID,
    "Ramanatha swami Temple",
    '[data-testid="fit-here-anchor"][data-anchor-intent="AFTER_ATTRACTION"][data-anchor-from*="Pamban"]',
  );

  await page.goto(`${appBaseUrl}/itinerary-details/${encodeURIComponent(QUOTE_ID)}`, { waitUntil: "domcontentloaded" });
  const dayTwoCardAfterRamanatha = page.locator('#itinerary-day-2[data-day-number="2"]').first();
  await expect(dayTwoCardAfterRamanatha).toContainText(/Ramanatha/i, { timeout: 30000 });

  await dayTwoCardAfterRamanatha.getByRole("button", { name: /add hotspot|click to add hotspot/i }).first().click();
  await expect(page.getByRole("heading", { name: /hotspot list/i })).toBeVisible({ timeout: 30000 });
  if (await rameswaramTab.isVisible().catch(() => false)) {
    await rameswaramTab.click();
  }
  if (await searchInput.isVisible().catch(() => false)) {
    await searchInput.fill("Agni");
  }
  await confirmFitHereViaUi(
    page,
    AGNI_TEERTHAM_ID,
    "Agni Teertham",
    '[data-testid="fit-here-anchor"][data-anchor-intent="AFTER_ATTRACTION"][data-anchor-from*="Ramanatha"]',
  );

  await page.goto(`${appBaseUrl}/itinerary-details/${encodeURIComponent(QUOTE_ID)}`, { waitUntil: "domcontentloaded" });
  const dayTwoCardAfterAgni = page.locator('#itinerary-day-2[data-day-number="2"]').first();
  await expect(dayTwoCardAfterAgni).toContainText(/Agni/i, { timeout: 30000 });

  await dayTwoCardAfterAgni.getByRole("button", { name: /add hotspot|click to add hotspot/i }).first().click();
  await expect(page.getByRole("heading", { name: /hotspot list/i })).toBeVisible({ timeout: 30000 });
  if (await rameswaramTab.isVisible().catch(() => false)) {
    await rameswaramTab.click();
  }
  if (await searchInput.isVisible().catch(() => false)) {
    await searchInput.fill("Gandhamadhana");
  }
  await confirmFitHereViaUi(
    page,
    GANDHAMADHANA_PARVATHAM_ID,
    "Gandhamadhana Parvatham",
    '[data-testid="fit-here-anchor"][data-anchor-intent="AFTER_ATTRACTION"][data-anchor-from*="Agni"]',
  );

  await page.goto(`${appBaseUrl}/itinerary-details/${encodeURIComponent(QUOTE_ID)}`, { waitUntil: "domcontentloaded" });
  const finalDayTwoCard = page.locator('#itinerary-day-2[data-day-number="2"]').first();
  await expect(finalDayTwoCard).toBeVisible({ timeout: 30000 });
  await expect(finalDayTwoCard).toContainText(/Pamban Bridge/i, { timeout: 30000 });
  await expect(finalDayTwoCard).toContainText(/Ramanatha/i, { timeout: 30000 });
  await expect(finalDayTwoCard).toContainText(/Agni/i, { timeout: 30000 });
  await expect(finalDayTwoCard).toContainText(/Gandhamadhana/i, { timeout: 30000 });
});

test("reset DVI202606167 basic itinerary info only", async ({ page, request }) => {
  test.setTimeout(120000);

  const token = await seedAuthToken(page, request);

  await resetItineraryBasicInfo(request, token);

  const details = await fetchItineraryDetails(request, token, QUOTE_ID);
  const dayTwo = (details.days || []).find((day: any) => Number(day?.dayNumber || 0) === 2);

  expect(Number(dayTwo?.id || 0)).toBeGreaterThan(0);
});

test.describe("day 2 fit here slowMo flows", () => {
  test("day 2 UI Fit Here flow adds only Ramanatha and Agni without Gandhamadhana", async ({
    page,
    request,
    baseURL,
  }) => {
    test.setTimeout(300000);

    const appBaseUrl = baseURL ?? "http://localhost:8080";
    const token = await seedAuthToken(page, request);

    await resetItineraryBasicInfo(request, token);
    const dayTwoRouteId = await getRouteIdForDay(request, token, QUOTE_ID, 2);
    expect(dayTwoRouteId, "Day 2 route ID should exist after reset").toBeGreaterThan(0);

    await assertDay2RamanathaResetBaseline(request, token, QUOTE_ID, dayTwoRouteId);

    const availableHotspots = await fetchAvailableHotspots(request, token, dayTwoRouteId);
    for (const id of [RAMANATHA_SWAMI_TEMPLE_ID, AGNI_TEERTHAM_ID]) {
      const hotspot = availableHotspots.find((row) => Number(row?.id || 0) === id);
      expect(hotspot, `Hotspot ${id} should be available on Day 2`).toBeTruthy();
    }

    await page.goto(`${appBaseUrl}/itinerary-details/${encodeURIComponent(QUOTE_ID)}`, {
      waitUntil: "domcontentloaded",
    });
    await expect(page).toHaveURL(new RegExp(`/itinerary-details/${QUOTE_ID}$`), {
      timeout: 30000,
    });

    const dayTwoCard = page.locator('#itinerary-day-2[data-day-number="2"]').first();
    await expect(dayTwoCard).toBeVisible({ timeout: 30000 });
    await dayTwoCard.scrollIntoViewIfNeeded();

    const addHotspotButton = dayTwoCard
      .getByRole("button", { name: /add hotspot|click to add hotspot/i })
      .first();
    await expect(addHotspotButton).toBeVisible({ timeout: 30000 });
    await addHotspotButton.click();
    await expect(page.getByRole("heading", { name: /hotspot list/i })).toBeVisible({
      timeout: 30000,
    });

    const rameswaramTab = page.getByText(/rameswaram hotspots/i).first();
    if (await rameswaramTab.isVisible().catch(() => false)) {
      await rameswaramTab.click();
    }

    const searchInput = page.getByPlaceholder(/search hotspot/i).first();
    if (await searchInput.isVisible().catch(() => false)) {
      await searchInput.fill("Ramanatha");
    }

    await confirmFitHereViaUi(
      page,
      RAMANATHA_SWAMI_TEMPLE_ID,
      "Ramanatha swami Temple",
      '[data-testid="fit-here-anchor"][data-anchor-intent="AFTER_ATTRACTION"][data-anchor-from*="Pamban"]',
    );

    await page.goto(`${appBaseUrl}/itinerary-details/${encodeURIComponent(QUOTE_ID)}`, {
      waitUntil: "domcontentloaded",
    });
    const dayTwoCardAfterRamanatha = page.locator('#itinerary-day-2[data-day-number="2"]').first();
    await expect(dayTwoCardAfterRamanatha).toBeVisible({ timeout: 30000 });
    await expect(dayTwoCardAfterRamanatha).toContainText(/Ramanatha/i, { timeout: 30000 });
    await expect(dayTwoCardAfterRamanatha).not.toContainText(/Agni/i);
    await expect(dayTwoCardAfterRamanatha).not.toContainText(/Gandhamadhana/i);

    await dayTwoCardAfterRamanatha
      .getByRole("button", { name: /add hotspot|click to add hotspot/i })
      .first()
      .click();
    await expect(page.getByRole("heading", { name: /hotspot list/i })).toBeVisible({
      timeout: 30000,
    });

    const rameswaramTabAfterRamanatha = page.getByText(/rameswaram hotspots/i).first();
    if (await rameswaramTabAfterRamanatha.isVisible().catch(() => false)) {
      await rameswaramTabAfterRamanatha.click();
    }

    const searchInputAfterRamanatha = page.getByPlaceholder(/search hotspot/i).first();
    if (await searchInputAfterRamanatha.isVisible().catch(() => false)) {
      await searchInputAfterRamanatha.fill("Agni");
    }

    await confirmFitHereViaUi(
      page,
      AGNI_TEERTHAM_ID,
      "Agni Teertham",
      '[data-testid="fit-here-anchor"][data-anchor-intent="AFTER_ATTRACTION"][data-anchor-from*="Ramanatha"]',
    );

    await page.goto(`${appBaseUrl}/itinerary-details/${encodeURIComponent(QUOTE_ID)}`, {
      waitUntil: "domcontentloaded",
    });
    const finalDayTwoCard = page.locator('#itinerary-day-2[data-day-number="2"]').first();
    await expect(finalDayTwoCard).toBeVisible({ timeout: 30000 });
    await expect(finalDayTwoCard).toContainText(/Pamban Bridge/i, { timeout: 30000 });
    await expect(finalDayTwoCard).toContainText(/Ramanatha/i, { timeout: 30000 });
    await expect(finalDayTwoCard).toContainText(/Agni/i, { timeout: 30000 });
    await expect(finalDayTwoCard).not.toContainText(/Gandhamadhana/i);

    const finalDetails = await fetchItineraryDetails(request, token, QUOTE_ID);
    const finalDayTwo = (finalDetails.days || []).find((day: any) => Number(day?.dayNumber || 0) === 2);
    const finalDayTwoNames = Array.isArray(finalDayTwo?.segments)
      ? finalDayTwo.segments.map((row: any) => getSegmentName(row)).filter(Boolean)
      : [];

    expect(finalDayTwoNames.some((name: string) => /Ramanatha/i.test(name))).toBe(true);
    expect(finalDayTwoNames.some((name: string) => /Agni/i.test(name))).toBe(true);
    expect(finalDayTwoNames.some((name: string) => /Gandhamadhana/i.test(name))).toBe(false);
  });

  test("day 2 chained Fit Here flow adds Ramanatha, then Agni, then Gandhamadhana and reports the final Gandhamadhana state", async ({
    page,
    request,
    baseURL,
  }) => {
    test.setTimeout(300000);

    const appBaseUrl = baseURL ?? "http://localhost:8080";
    const token = await seedAuthToken(page, request);

    const planId = 9706;

    await resetItineraryBasicInfo(request, token);

    const details = await fetchItineraryDetails(request, token, QUOTE_ID);
    const dayTwo = (details.days || []).find((day: any) => Number(day?.dayNumber || 0) === 2);
    const dayTwoRouteId = Number(dayTwo?.id || 0);
    expect(dayTwoRouteId, "Day 2 route ID should exist after reset").toBeGreaterThan(0);

    await assertDay2RamanathaResetBaseline(request, token, QUOTE_ID, dayTwoRouteId);

    const chainSteps = [
      {
        hotspotId: RAMANATHA_SWAMI_TEMPLE_ID,
        hotspotName: "Ramanatha swami Temple",
        anchor: {
          anchorType: "BETWEEN_ROWS",
          anchorIntent: "AFTER_ATTRACTION",
          anchorLabel: "After Pamban Bridge",
          afterHotspotId: PAMBAN_BRIDGE_ID,
        },
      },
      {
        hotspotId: AGNI_TEERTHAM_ID,
        hotspotName: "Agni Teertham",
        anchor: {
          anchorType: "BETWEEN_ROWS",
          anchorIntent: "AFTER_ATTRACTION",
          anchorLabel: "After Ramanatha swami Temple",
          afterHotspotId: RAMANATHA_SWAMI_TEMPLE_ID,
        },
      },
      {
        hotspotId: GANDHAMADHANA_PARVATHAM_ID,
        hotspotName: "Gandhamadhana Parvatham",
        anchor: {
          anchorType: "BETWEEN_ROWS",
          anchorIntent: "AFTER_ATTRACTION",
          anchorLabel: "After Agni Teertham",
          afterHotspotId: AGNI_TEERTHAM_ID,
        },
      },
    ];

    const chainedResults: Array<{
      hotspotId: number;
      hotspotName: string;
      previewJson: any;
      previewTime?: string;
      confirmJson?: any;
    }> = [];

    for (const step of chainSteps) {
      const previewResponse = await request.post(`${API_BASE_URL}/itineraries/${planId}/manual-hotspot/fit-preview`, {
        headers: { Authorization: `Bearer ${token}` },
        data: {
          routeId: dayTwoRouteId,
          selectedHotspotId: step.hotspotId,
          anchor: step.anchor,
          allowP3Removal: true,
          allowP1P2Removal: true,
        },
      });

      expect(previewResponse.ok(), `${step.hotspotName} preview should succeed`).toBeTruthy();
      const previewJson = await previewResponse.json();
      const previewSelectedRow = getPreviewTimeline(previewJson).find((row: any) => (
        getHotspotId(row) === step.hotspotId && String(row?.type || "").toLowerCase() === "attraction"
      ));
      expect(previewSelectedRow, `${step.hotspotName} should appear in preview timeline`).toBeTruthy();

      const previewTime = String(previewSelectedRow?.timeRange || "");
      expect(previewTime).toBeTruthy();

      chainedResults.push({
        hotspotId: step.hotspotId,
        hotspotName: step.hotspotName,
        previewJson,
        previewTime,
      });

      if (previewJson?.canConfirm === true) {
        const acknowledgedRemovedHotspotIds = Array.isArray(previewJson?.removedHotspots)
          ? previewJson.removedHotspots
              .map((row: any) => Number(row?.id || row?.hotspotId || row?.hotspot_ID || 0))
              .filter((id: number) => Number.isFinite(id) && id > 0)
          : [];
        const confirmResponse = await request.post(`${API_BASE_URL}/itineraries/${planId}/manual-hotspot/fit-confirm`, {
          headers: { Authorization: `Bearer ${token}` },
          data: {
            attemptId: previewJson?.attemptId,
            allowTimingRisk: false,
            allowPriorityRemoval: acknowledgedRemovedHotspotIds.length > 0,
            allowClosedHotspotConflict: false,
            acknowledgedRemovedHotspotIds,
          },
        });

        expect(confirmResponse.ok(), `${step.hotspotName} confirm should succeed`).toBeTruthy();
        const confirmJson = await confirmResponse.json();
        expect(confirmJson?.success).toBe(true);
        expect(Number(confirmJson?.routeId || 0)).toBe(dayTwoRouteId);

        const confirmSelectedRow = (Array.isArray(confirmJson?.routeTimeline) ? confirmJson.routeTimeline : []).find((row: any) => (
          getHotspotId(row) === step.hotspotId && String(row?.type || "").toLowerCase() === "attraction"
        ));
        expect(confirmSelectedRow, `${step.hotspotName} should persist in confirmed timeline`).toBeTruthy();
        expect(String(confirmSelectedRow?.timeRange || "")).toBe(previewTime);

        chainedResults[chainedResults.length - 1].confirmJson = confirmJson;

        const postConfirmDetails = await fetchItineraryDetails(request, token, QUOTE_ID);
        const postConfirmDayTwo = (postConfirmDetails.days || []).find((day: any) => Number(day?.dayNumber || 0) === 2);
        const postConfirmDayTwoNames = Array.isArray(postConfirmDayTwo?.segments)
          ? postConfirmDayTwo.segments.map((row: any) => getSegmentName(row)).filter((value: string) => Boolean(value))
          : [];

        if (step.hotspotId === AGNI_TEERTHAM_ID || step.hotspotId === GANDHAMADHANA_PARVATHAM_ID) {
          expect(
            postConfirmDayTwoNames.some((name) => /Alagar Koyil/i.test(name)),
            `${step.hotspotName} confirm should keep Alagar Koyil absent from Day 2`,
          ).toBe(false);
          expect(
            postConfirmDayTwoNames.some((name) => /Ramanatha/i.test(name)),
            `${step.hotspotName} confirm should keep Ramanatha on Day 2`,
          ).toBe(true);
        }

        if (step.hotspotId === GANDHAMADHANA_PARVATHAM_ID) {
          expect(
            postConfirmDayTwoNames.some((name) => /Agni/i.test(name)),
            'Gandhamadhana confirm should keep Agni on Day 2',
          ).toBe(true);
        }
      } else {
        console.log('[FitHere][chained_final_preview]', {
          hotspotId: step.hotspotId,
          hotspotName: step.hotspotName,
          resultType: previewJson?.resultType,
          canConfirm: previewJson?.canConfirm,
          rejectedReason: Array.isArray(previewJson?.rejectedReasons) ? previewJson.rejectedReasons[0] : null,
          removedHotspots: Array.isArray(previewJson?.removedHotspots) ? previewJson.removedHotspots.length : 0,
          timelineCount: getPreviewTimeline(previewJson).length,
        });

        expect(["FITS_DIRECTLY", "FITS_WITH_OPTIONAL_REMOVAL", "REQUIRES_P3_CONFIRMATION", "PRIORITY_CONFLICT", "CANNOT_FIT", "SELECTED_HOTSPOT_CLOSED_AT_ATTEMPTED_TIME"])
          .toContain(String(previewJson?.resultType || ""));
      }
    }

    const finalDetails = await fetchItineraryDetails(request, token, QUOTE_ID);
    const finalDayTwo = (finalDetails.days || []).find((day: any) => Number(day?.dayNumber || 0) === 2);
    const finalSegments = Array.isArray(finalDayTwo?.segments) ? finalDayTwo.segments : [];
    const finalDayOne = (finalDetails.days || []).find((day: any) => Number(day?.dayNumber || 0) === 1);
    const finalDayOneNames = Array.isArray(finalDayOne?.segments)
      ? finalDayOne.segments.map((row: any) => getSegmentName(row)).filter((value: string) => Boolean(value))
      : [];
    const finalDayTwoNames = finalSegments.map((row: any) => getSegmentName(row)).filter((value: string) => Boolean(value));

    console.log('[FitHere][gandhamadhana_chain_final]', {
      routeId: dayTwoRouteId,
      confirmedHotspots: chainedResults.map((row) => ({
        hotspotId: row.hotspotId,
        hotspotName: row.hotspotName,
        previewTime: row.previewTime,
        confirmed: !!row.confirmJson,
      })),
      finalSegmentCount: finalSegments.length,
      finalHotspotIds: finalSegments
        .map((row: any) => getHotspotId(row))
        .filter((id: number) => id > 0),
    });

    await page.goto(`${appBaseUrl}/itinerary-details/${encodeURIComponent(QUOTE_ID)}`, {
      waitUntil: "domcontentloaded",
    });
    await expect(page).toHaveURL(new RegExp(`/itinerary-details/${QUOTE_ID}$`), {
      timeout: 30000,
    });

    const dayOneCard = page.locator('#itinerary-day-1[data-day-number="1"]').first();
    const dayTwoCard = page.locator('#itinerary-day-2[data-day-number="2"]').first();
    await expect(dayOneCard).toBeVisible({ timeout: 30000 });
    await expect(dayTwoCard).toBeVisible({ timeout: 30000 });
    await expect(dayOneCard).toContainText(/Meenakshi/i);
    await expect(dayTwoCard).not.toContainText(/Meenakshi/i);

    expect(finalDayOneNames.some((name) => /Meenakshi/i.test(name))).toBe(true);
    expect(finalDayTwoNames.some((name) => /Meenakshi/i.test(name))).toBe(false);
    expect(finalDayTwoNames.some((name) => /Alagar Koyil/i.test(name))).toBe(false);
    expect(finalDayTwoNames.some((name) => /Ramanatha/i.test(name))).toBe(true);
    expect(finalDayTwoNames.some((name) => /Agni/i.test(name))).toBe(true);
    const confirmedHotspotIds = new Set(
      chainedResults
        .filter((row) => row.confirmJson)
        .map((row) => row.hotspotId),
    );
    if (confirmedHotspotIds.has(GANDHAMADHANA_PARVATHAM_ID)) {
      expect(finalDayTwoNames.some((name) => /Gandhamadhana/i.test(name))).toBe(true);
    }

    expect(chainedResults.map((row) => row.hotspotId)).toEqual([
      RAMANATHA_SWAMI_TEMPLE_ID,
      AGNI_TEERTHAM_ID,
      GANDHAMADHANA_PARVATHAM_ID,
    ]);
  });
});
