import { expect, test, type APIRequestContext } from "@playwright/test";
import {
  API_BASE_URL,
  fetchItineraryDetails,
  seedAuthToken,
} from "../booking-engine-test-utils";

const QUOTE_ID = "DVI202606167";
const PLAN_ID = 9706;
const ALAGAR_KOYIL_ID = 28;
const RAMANATHA_SWAMI_TEMPLE_ID = 35;
const AGNI_TEERTHAM_ID = 36;
const FIVE_FACED_HANUMAN_TEMPLE_ID = 37;
const DHANUSHKODI_AND_KOTHANDARAMA_ID = 42;
const APJ_ABDUL_KALAM_ID = 41;
const GANDHAMADHANA_PARVATHAM_ID = 38;
const ARIYAMAAN_BEACH_ID = 636;
const OUR_LADY_OF_RANSOM_CHURCH_ID = 51;
const RESET_BASIC_INFO_PAYLOAD = {"plan":{"itinerary_plan_id":9706,"agent_id":126,"staff_id":0,"location_id":0,"arrival_point":"Madurai Airport","departure_point":"Trivandrum, Domestic Airport","itinerary_preference":2,"itinerary_type":2,"preferred_hotel_category":[],"hotel_facilities":[],"trip_start_date":"2026-07-01T16:00:00+05:30","trip_end_date":"2026-07-04T12:00:00+05:30","pick_up_date_and_time":"2026-07-01T16:00:00+05:30","arrival_type":1,"departure_type":1,"no_of_nights":3,"no_of_days":4,"budget":15000,"entry_ticket_required":0,"guide_for_itinerary":0,"nationality":101,"food_type":0,"meal_plan_breakfast":0,"meal_plan_lunch":0,"meal_plan_dinner":0,"adult_count":2,"child_count":0,"infant_count":0,"special_instructions":""},"routes":[{"location_name":"Madurai Airport","next_visiting_location":"Madurai","itinerary_route_date":"2026-07-01T00:00:00+05:30","no_of_days":1,"no_of_km":12.4,"direct_to_next_visiting_place":0,"via_route":"","via_routes":[]},{"location_name":"Madurai","next_visiting_location":"Rameswaram","itinerary_route_date":"2026-07-02T00:00:00+05:30","no_of_days":2,"no_of_km":173,"direct_to_next_visiting_place":0,"via_route":"","via_routes":[]},{"location_name":"Rameswaram","next_visiting_location":"Kanyakumari","itinerary_route_date":"2026-07-03T00:00:00+05:30","no_of_days":3,"no_of_km":308,"direct_to_next_visiting_place":0,"via_route":"","via_routes":[]},{"location_name":"Kanyakumari","next_visiting_location":"Trivandrum, Domestic Airport","itinerary_route_date":"2026-07-04T00:00:00+05:30","no_of_days":4,"no_of_km":89.4,"direct_to_next_visiting_place":0,"via_route":"","via_routes":[]}],"vehicles":[{"vehicle_type_id":1,"vehicle_count":1}],"travellers":[{"room_id":1,"traveller_type":1},{"room_id":1,"traveller_type":1}],"previousDayBillingDecisionProvided":false,"previousDayBillingConfirmed":false};

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

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
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

async function openHotspotListForDay(page: any, dayNumber: number): Promise<void> {
  const dayCard = page.locator(`#itinerary-day-${dayNumber}[data-day-number="${dayNumber}"]`).first();
  await expect(dayCard).toBeVisible({ timeout: 30000 });
  await dayCard.scrollIntoViewIfNeeded();

  const addHotspotButton = dayCard.getByRole("button", {
    name: /add hotspot|click to add hotspot/i,
  }).first();
  await expect(addHotspotButton).toBeVisible({ timeout: 30000 });
  await addHotspotButton.click();

  await expect(page.getByRole("heading", { name: /fit here hotspot list|hotspot list/i })).toBeVisible({
    timeout: 30000,
  });
}

async function confirmDay3RamanathaBeforeFirstAttractionViaUi(
  page: any,
  request: APIRequestContext,
  token: string,
  appBaseUrl: string,
): Promise<number> {
  const routeId = await getRouteIdForDay(request, token, QUOTE_ID, 3);

  await page.goto(`${appBaseUrl}/itinerary-details/${encodeURIComponent(QUOTE_ID)}`, {
    waitUntil: "domcontentloaded",
  });
  await expect(page).toHaveURL(new RegExp(`/itinerary-details/${QUOTE_ID}$`), {
    timeout: 30000,
  });

  await openHotspotListForDay(page, 3);

  const searchInput = page.getByPlaceholder(/search hotspot/i).first();
  await expect(searchInput).toBeVisible({ timeout: 30000 });
  await searchInput.fill("Ramanatha");

  const ramanathaCard = page.locator(`[data-hotspot-id="${RAMANATHA_SWAMI_TEMPLE_ID}"]`).first();
  await expect(ramanathaCard).toBeVisible({ timeout: 30000 });
  await ramanathaCard.getByRole("button", { name: /^preview$/i }).click();

  const previewResponsePromise = page.waitForResponse(
    (resp) =>
      resp.request().method() === "POST" &&
      resp.url().includes("/manual-hotspot/fit-preview"),
    { timeout: 120000 },
  );

  const beforeFirstAnchor = page
    .locator('[data-testid="fit-here-anchor"][data-anchor-intent="AFTER_START"]')
    .first();
  await expect(beforeFirstAnchor).toBeVisible({ timeout: 30000 });
  await beforeFirstAnchor.getByRole("button", { name: /fit here/i }).click();

  const previewResponse = await previewResponsePromise;
  expect(previewResponse.ok(), "Day 3 Ramanatha preview should succeed").toBeTruthy();

  const previewJson = await previewResponse.json();
  expect(previewJson?.canConfirm).toBe(true);
  expect(previewJson?.attemptId).toBeTruthy();

  const dialog = page.getByTestId("fit-here-preview-dialog");
  await expect(dialog).toBeVisible({ timeout: 30000 });

  const removalAckCheckbox = dialog.getByTestId("fit-here-removal-ack-checkbox");
  if (await removalAckCheckbox.count()) {
    await removalAckCheckbox.check();
  }

  const confirmResponsePromise = page.waitForResponse(
    (resp) =>
      resp.request().method() === "POST" &&
      resp.url().includes("/manual-hotspot/fit-confirm"),
    { timeout: 120000 },
  );

  const confirmButton = dialog.getByRole("button", { name: /confirm/i }).first();
  await expect(confirmButton).toBeEnabled({ timeout: 30000 });
  await confirmButton.click();

  const confirmResponse = await confirmResponsePromise;
  expect(confirmResponse.ok(), "Day 3 Ramanatha confirm should succeed").toBeTruthy();

  const confirmJson = await confirmResponse.json();
  expect(confirmJson?.success).toBe(true);
  return routeId;
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

  if (response.ok() || response.status() === 404 || response.status() === 409) return;

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

type VisitAgainCandidate = {
  id: number;
  name: string;
  timings: string;
  availabilityStatus: string;
  actionDisabled: boolean;
};

async function fetchVisitAgainCandidatesForDay(
  request: APIRequestContext,
  token: string,
  routeId: number,
): Promise<VisitAgainCandidate[]> {
  const response = await request.get(`${API_BASE_URL}/itineraries/hotspots/available/${routeId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  expect(response.ok(), `Fetching available hotspots for route ${routeId} should succeed`).toBeTruthy();

  const rows = (await response.json().catch(() => [])) as any[];
  return (Array.isArray(rows) ? rows : [])
    .map((row: any) => ({
      id: Number(row?.id || 0),
      name: String(row?.name || "").trim(),
      timings: String(row?.timings || "").trim(),
      availabilityStatus: String(row?.availabilityStatus || "").trim().toUpperCase(),
      actionDisabled: row?.actionDisabled === true,
    }))
    .filter((row) => (
      row.id > 0
      && row.name.length > 0
      && row.availabilityStatus === "ACTIVE_OTHER_ROUTE"
      && row.actionDisabled !== true
      && row.timings.length > 0
      && !/no timings available/i.test(row.timings)
    ));
}

async function findVisitAgainCardByCandidates(
  page: any,
  candidates: VisitAgainCandidate[],
): Promise<{
  hotspotId: number;
  hotspotName: string;
  card: any;
}> {
  const searchInput = page.getByPlaceholder(/search hotspot/i).first();
  await expect(searchInput).toBeVisible({ timeout: 30000 });

  for (const candidate of candidates) {
    await searchInput.fill("");
    await searchInput.fill(candidate.name);

    const card = page.locator(`[data-hotspot-id="${candidate.id}"]`).first();
    const visible = await card.isVisible().catch(() => false);
    if (!visible) continue;

    const cardText = await card.innerText().catch(() => "");
    if (!/visit again/i.test(cardText) && !/also used on another day/i.test(cardText)) continue;

    const previewButton = card.getByRole("button", { name: /^preview$/i });
    const autoPreviewButton = card.getByRole("button", { name: /auto-preview/i });
    const previewVisible = await previewButton.isVisible().catch(() => false);
    const autoVisible = await autoPreviewButton.isVisible().catch(() => false);
    const previewEnabled = previewVisible && await previewButton.isEnabled().catch(() => false);
    const autoEnabled = autoVisible && await autoPreviewButton.isEnabled().catch(() => false);

    if (!previewEnabled || !autoEnabled) continue;

    return {
      hotspotId: candidate.id,
      hotspotName: candidate.name,
      card,
    };
  }

  throw new Error("Could not find a Visit Again hotspot with enabled Preview and Auto-Preview buttons.");
}

async function confirmAutoPreviewHotspotBySearch(
  page: any,
  searchText: string,
  hotspotId: number,
): Promise<any> {
  const searchInput = page.getByPlaceholder(/search hotspot/i).first();
  await expect(searchInput).toBeVisible({ timeout: 30000 });
  await searchInput.fill("");
  await searchInput.fill(searchText);

  const hotspotCard = page.locator(`[data-hotspot-id="${hotspotId}"]`).first();
  await expect(hotspotCard).toBeVisible({ timeout: 30000 });

  const autoPreviewButton = hotspotCard.getByRole("button", { name: /auto-preview/i });
  await expect(autoPreviewButton, `${searchText} Auto-Preview button should be enabled`).toBeEnabled({
    timeout: 30000,
  });

  const autoPreviewResponsePromise = page.waitForResponse(
    (resp) =>
      resp.request().method() === "POST" &&
      resp.url().includes("/manual-hotspot/auto-fit-preview"),
    { timeout: 120000 },
  );

  await autoPreviewButton.click();

  const autoPreviewResponse = await autoPreviewResponsePromise;
  expect(autoPreviewResponse.ok(), `${searchText} Auto-Preview should succeed`).toBeTruthy();
  const autoPreviewJson = await autoPreviewResponse.json();

  const dialog = page.getByTestId("auto-fit-here-preview-dialog");
  await expect(dialog).toBeVisible({ timeout: 30000 });

  const removalAckCheckboxes = dialog.getByTestId("auto-fit-here-removal-ack-checkbox");
  const removalAckCount = await removalAckCheckboxes.count();
  for (let index = 0; index < removalAckCount; index += 1) {
    await removalAckCheckboxes.nth(index).check();
  }

  const confirmButton = dialog.getByRole("button", {
    name: /confirm fit here|confirm and remove hotspots/i,
  }).first();
  await expect(confirmButton).toBeEnabled({ timeout: 30000 });

  const confirmResponsePromise = page.waitForResponse(
    (resp) =>
      resp.request().method() === "POST" &&
      resp.url().includes("/manual-hotspot/fit-confirm"),
    { timeout: 120000 },
  );

  await confirmButton.click();

  const confirmResponse = await confirmResponsePromise;
  expect(confirmResponse.ok(), `${searchText} Auto-Preview confirm should succeed`).toBeTruthy();

  const confirmJson = await confirmResponse.json();
  expect(confirmJson?.success).toBe(true);
  expect(Number(confirmJson?.selectedHotspotId || 0)).toBe(hotspotId);

  return { autoPreviewJson, confirmJson };
}

test("day 2 Visit Again hotspot enables both Auto-Preview and exact Preview popups", async ({
  page,
  request,
  baseURL,
}) => {
  test.setTimeout(420000);

  const appBaseUrl = baseURL ?? process.env.E2E_FRONTEND_BASE_URL!;
  const token = await seedAuthToken(page, request);

  await resetItineraryBasicInfo(request, token);

  try {
    const dayTwoRouteId = await getRouteIdForDay(request, token, QUOTE_ID, 2);
    const visitAgainCandidates = await fetchVisitAgainCandidatesForDay(request, token, dayTwoRouteId);

    expect(
      visitAgainCandidates.length,
      "Day 2 should expose at least one ACTIVE_OTHER_ROUTE hotspot for this Visit Again flow",
    ).toBeGreaterThan(0);

    await page.goto(`${appBaseUrl}/itinerary-details/${encodeURIComponent(QUOTE_ID)}`, {
      waitUntil: "domcontentloaded",
    });
    await expect(page).toHaveURL(new RegExp(`/itinerary-details/${QUOTE_ID}$`), {
      timeout: 30000,
    });

    await openHotspotListForDay(page, 2);

    const {
      hotspotId: dayTwoHotspotId,
      hotspotName: dayTwoHotspotName,
      card: dayTwoCard,
    } = await findVisitAgainCardByCandidates(page, visitAgainCandidates);

    await expect(dayTwoCard).toContainText(/visit again/i);
    await expect(dayTwoCard).toContainText(/also used on another day/i);

    const dayTwoPreviewButton = dayTwoCard.getByRole("button", { name: /^preview$/i });
    const dayTwoAutoPreviewButton = dayTwoCard.getByRole("button", { name: /auto-preview/i });
    await expect(dayTwoPreviewButton, `${dayTwoHotspotName} Preview button should be enabled`).toBeEnabled({ timeout: 30000 });
    await expect(dayTwoAutoPreviewButton, `${dayTwoHotspotName} Auto-Preview button should be enabled`).toBeEnabled({ timeout: 30000 });

    const dayTwoAutoPreviewResponsePromise = page.waitForResponse(
      (resp) =>
        resp.request().method() === "POST" &&
        resp.url().includes("/manual-hotspot/auto-fit-preview"),
      { timeout: 120000 },
    );

    await dayTwoAutoPreviewButton.click();

    const dayTwoAutoPreviewResponse = await dayTwoAutoPreviewResponsePromise;
    expect(dayTwoAutoPreviewResponse.ok(), `${dayTwoHotspotName} Visit Again Auto-Preview should succeed`).toBeTruthy();

    const dayTwoAutoDialog = page.getByTestId("auto-fit-here-preview-dialog");
    await expect(dayTwoAutoDialog).toBeVisible({ timeout: 30000 });
    await expect(dayTwoAutoDialog).toContainText(new RegExp(escapeRegExp(dayTwoHotspotName), "i"));
    await dayTwoAutoDialog.getByRole("button", { name: /close auto-preview|close/i }).first().click();
    await expect(dayTwoAutoDialog).toBeHidden({ timeout: 30000 });

    const dayTwoExactPreviewResponsePromise = page.waitForResponse(
      (resp) =>
        resp.request().method() === "POST" &&
        resp.url().includes("/manual-hotspot/fit-preview"),
      { timeout: 120000 },
    );

    await dayTwoPreviewButton.click();
    await expect(page.getByText(/selected for fit here/i)).toBeVisible({ timeout: 30000 });
    const dayTwoFirstAnchor = page.locator('[data-testid="fit-here-anchor"]').first();
    await expect(dayTwoFirstAnchor).toBeVisible({ timeout: 30000 });
    await dayTwoFirstAnchor.getByRole("button", { name: /fit here/i }).click();

    const dayTwoExactPreviewResponse = await dayTwoExactPreviewResponsePromise;
    expect(dayTwoExactPreviewResponse.ok(), `${dayTwoHotspotName} Visit Again exact Preview should succeed`).toBeTruthy();

    const dayTwoFitDialog = page.getByTestId("fit-here-preview-dialog");
    await expect(dayTwoFitDialog).toBeVisible({ timeout: 30000 });
    await expect(dayTwoFitDialog).toContainText(new RegExp(escapeRegExp(dayTwoHotspotName), "i"));
    await dayTwoFitDialog.getByRole("button", { name: /close fit here preview|cancel/i }).first().click();
    await expect(dayTwoFitDialog).toBeHidden({ timeout: 30000 });
  } finally {
    await resetItineraryBasicInfo(request, token);
  }
});

test("day 1 Auto-Preview tests Before first hotspot anchor for Alagar", async ({
  page,
  request,
  baseURL,
}) => {
  test.setTimeout(300000);

  const appBaseUrl = baseURL ?? process.env.E2E_FRONTEND_BASE_URL!;
  const token = await seedAuthToken(page, request);
  let cleanupNeeded = false;

  try {
    await deleteManualHotspotIfPresent(request, token, PLAN_ID, ALAGAR_KOYIL_ID);

    const detailsBefore = await fetchItineraryDetails(request, token, QUOTE_ID);
    const dayOne = (detailsBefore.days || []).find((day: any) => Number(day?.dayNumber || 0) === 1);
    const dayOneRouteId = Number(dayOne?.id || 0);

    expect(dayOneRouteId, "Day 1 route ID should exist").toBeGreaterThan(0);

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

    await expect(page.getByRole("heading", { name: /hotspot list/i })).toBeVisible({ timeout: 30000 });

    const searchInput = page.getByPlaceholder(/search hotspot/i).first();
    if (await searchInput.isVisible().catch(() => false)) {
      await searchInput.fill("Alagar");
    }

    const hotspotCard = page.locator(`[data-hotspot-id="${ALAGAR_KOYIL_ID}"]`).first();
    await expect(hotspotCard, "Alagar hotspot card should be visible").toBeVisible({ timeout: 30000 });

    const autoPreviewResponsePromise = page.waitForResponse(
      (resp) =>
        resp.request().method() === "POST" &&
        resp.url().includes("/manual-hotspot/auto-fit-preview"),
      { timeout: 120000 },
    );

    await hotspotCard.getByRole("button", { name: /auto-preview/i }).click();

    const autoPreviewResponse = await autoPreviewResponsePromise;
    expect(autoPreviewResponse.ok(), "Auto-Preview API should succeed").toBeTruthy();

    const requestPayload = autoPreviewResponse.request().postDataJSON();

    expect(Number(requestPayload?.routeId || 0)).toBe(dayOneRouteId);
    expect(Number(requestPayload?.selectedHotspotId || 0)).toBe(ALAGAR_KOYIL_ID);
    expect(Array.isArray(requestPayload?.anchors)).toBe(true);
    expect(requestPayload.anchors.length).toBeGreaterThan(0);

    const beforeFirstAnchor = requestPayload.anchors.find((anchor: any) =>
      String(anchor?.anchorIntent || "").toUpperCase() === "AFTER_START",
    );

    expect(beforeFirstAnchor, "Auto-Preview must include Before first attraction / AFTER_START anchor").toBeTruthy();
    expect(
      Number(beforeFirstAnchor?.beforeHotspotId || 0),
      "AFTER_START should be pinned to first route hotspot",
    ).toBeGreaterThan(0);

    const invalidIntent = requestPayload.anchors.find((anchor: any) =>
      ["BEFORE_HOTEL", "BETWEEN_ROUTE_ROWS"].includes(String(anchor?.anchorIntent || "").toUpperCase()),
    );
    expect(invalidIntent, "Auto-Preview must not send BEFORE_HOTEL or BETWEEN_ROUTE_ROWS").toBeFalsy();

    const autoPreviewJson = await autoPreviewResponse.json();

    expect(Array.isArray(autoPreviewJson?.results)).toBe(true);
    expect(autoPreviewJson.results.length).toBeGreaterThan(0);
    expect(autoPreviewJson?.bestAnchorKey || null).toBeTruthy();

    const responseBeforeFirstResult = autoPreviewJson.results.find((row: any) =>
      String(row?.anchor?.anchorIntent || "").toUpperCase() === "AFTER_START",
    );
    expect(responseBeforeFirstResult, "Auto-Preview response must include AFTER_START result").toBeTruthy();

    await expect(page.getByTestId("auto-fit-here-preview-dialog")).toBeVisible({ timeout: 30000 });
    await expect(page.getByTestId("auto-fit-here-results")).toBeVisible({ timeout: 30000 });
    await expect(page.getByTestId("auto-fit-here-selected-details")).toBeVisible({ timeout: 30000 });
    await expect(page.getByTestId("auto-fit-here-changes-required")).toBeVisible({ timeout: 30000 });
    await expect(page.getByTestId("auto-fit-here-main-timeline")).toBeVisible({ timeout: 30000 });

    const selectedDetails = page.getByTestId("auto-fit-here-selected-details");
    await expect(selectedDetails).toContainText(/before first|after start|fit|selected/i);

    const confirmButton = page.getByRole("button", {
      name: /confirm fit here|confirm and remove hotspots/i,
    }).first();

    const confirmVisible = await confirmButton.isVisible().catch(() => false);
    const confirmEnabled = confirmVisible && await confirmButton.isEnabled().catch(() => false);

    if (confirmEnabled) {
      const ackCheckboxes = page.getByTestId("auto-fit-here-removal-ack-checkbox");
      const ackCount = await ackCheckboxes.count();

      for (let index = 0; index < ackCount; index += 1) {
        await ackCheckboxes.nth(index).check();
      }

      const confirmResponsePromise = page.waitForResponse(
        (resp) =>
          resp.request().method() === "POST" &&
          resp.url().includes("/manual-hotspot/fit-confirm"),
        { timeout: 120000 },
      );

      await confirmButton.click();

      const confirmResponse = await confirmResponsePromise;
      expect(confirmResponse.ok(), "Auto-Preview selected Fit Here confirm should succeed").toBeTruthy();
      cleanupNeeded = true;

      const detailsAfter = await fetchItineraryDetails(request, token, QUOTE_ID);
      const dayOneAfter = (detailsAfter.days || []).find((day: any) => Number(day?.dayNumber || 0) === 1);
      const dayOneNames = Array.isArray(dayOneAfter?.segments)
        ? dayOneAfter.segments.map((row: any) => getSegmentName(row)).filter(Boolean)
        : [];

      expect(
        dayOneNames.some((name: string) => /Alagar/i.test(name)),
        "After confirm, Alagar should appear on Day 1 timeline",
      ).toBe(true);

      const dayOneSegments = Array.isArray(dayOneAfter?.segments) ? dayOneAfter.segments : [];
      const lastCheckinIndex = dayOneSegments.reduce((foundIndex: number, row: any, index: number) => (
        String(row?.type || "").toLowerCase() === "checkin" ? index : foundIndex
      ), -1);
      const finalTravelToHotel = lastCheckinIndex >= 0
        ? [...dayOneSegments]
            .slice(0, lastCheckinIndex)
            .reverse()
            .find((row: any) => (
              String(row?.type || "").toLowerCase() === "travel"
              && /hotel/i.test(String(row?.to || row?.toName || row?.displayToName || row?.text || ""))
            ))
        : null;
      const expectedHotelTravelFrom = String(
        finalTravelToHotel?.from ||
        finalTravelToHotel?.fromName ||
        finalTravelToHotel?.displayFromName ||
        "",
      ).trim();

      await page.goto(`${appBaseUrl}/itinerary-details/${encodeURIComponent(QUOTE_ID)}`, {
        waitUntil: "domcontentloaded",
      });
      await expect(page).toHaveURL(new RegExp(`/itinerary-details/${QUOTE_ID}$`), {
        timeout: 30000,
      });

      const refreshedDayOneCard = page.locator('#itinerary-day-1[data-day-number="1"]').first();
      await expect(refreshedDayOneCard).toBeVisible({ timeout: 30000 });
      const refreshedDayOneText = await refreshedDayOneCard.innerText();

      expect(
        refreshedDayOneText,
        "Day 1 details page should not render a duplicated check-in label after confirm",
      ).not.toMatch(/Check-in to\s+Check-in at Hotel/i);

      if (expectedHotelTravelFrom) {
        expect(
          refreshedDayOneText,
          `Day 1 details page should show the final travel-to-hotel leg from ${expectedHotelTravelFrom} after confirm`,
        ).toMatch(new RegExp(`Travelling from\\s+${escapeRegExp(expectedHotelTravelFrom)}\\s+to\\s+`, "i"));
      }
    } else {
      const dialogText = await page.getByTestId("auto-fit-here-preview-dialog").innerText();
      expect(dialogText).toMatch(/cannot fit|failed|rejected|no hotspot removed|changes required|best/i);
    }
  } finally {
    if (cleanupNeeded) {
      await deleteManualHotspotIfPresent(request, token, PLAN_ID, ALAGAR_KOYIL_ID);
    }
  }
});

test("day 3 Auto-Preview for Agni matches exact-anchor normal Fit Here rescue after Ramanatha is confirmed", async ({
  page,
  request,
  baseURL,
}) => {
  test.setTimeout(300000);

  const appBaseUrl = baseURL ?? process.env.E2E_FRONTEND_BASE_URL!;
  const token = await seedAuthToken(page, request);

  await deleteManualHotspotIfPresent(request, token, PLAN_ID, AGNI_TEERTHAM_ID);
  await deleteManualHotspotIfPresent(request, token, PLAN_ID, RAMANATHA_SWAMI_TEMPLE_ID);

  let routeId = 0;

  try {
    routeId = await confirmDay3RamanathaBeforeFirstAttractionViaUi(page, request, token, appBaseUrl);
    expect(routeId).toBeGreaterThan(0);

    const detailsBeforeAutoPreview = await fetchItineraryDetails(request, token, QUOTE_ID);
    const dayThreeBeforeAutoPreview = (detailsBeforeAutoPreview.days || []).find(
      (day: any) => Number(day?.dayNumber || 0) === 3,
    );
    const originalDayThreeAttractionNames = Array.isArray(dayThreeBeforeAutoPreview?.segments)
      ? dayThreeBeforeAutoPreview.segments
          .filter((row: any) => String(row?.type || "").toLowerCase() === "attraction")
          .map((row: any) => getSegmentName(row))
          .filter(Boolean)
      : [];

    await page.goto(`${appBaseUrl}/itinerary-details/${encodeURIComponent(QUOTE_ID)}`, {
      waitUntil: "domcontentloaded",
    });
    await expect(page).toHaveURL(new RegExp(`/itinerary-details/${QUOTE_ID}$`), {
      timeout: 30000,
    });

    await openHotspotListForDay(page, 3);

    const searchInput = page.getByPlaceholder(/search hotspot/i).first();
    await expect(searchInput).toBeVisible({ timeout: 30000 });
    await searchInput.fill("Agni");

    const agniCard = page.locator(`[data-hotspot-id="${AGNI_TEERTHAM_ID}"]`).first();
    await expect(agniCard).toBeVisible({ timeout: 30000 });

    const autoPreviewResponsePromise = page.waitForResponse(
      (resp) =>
        resp.request().method() === "POST" &&
        resp.url().includes("/manual-hotspot/auto-fit-preview"),
      { timeout: 120000 },
    );

    await agniCard.getByRole("button", { name: /auto-preview/i }).click();

    const autoPreviewResponse = await autoPreviewResponsePromise;
    expect(autoPreviewResponse.ok(), "Day 3 Agni Auto-Preview should succeed").toBeTruthy();
    const autoPreviewJson = await autoPreviewResponse.json();
    const targetRow = (Array.isArray(autoPreviewJson?.results) ? autoPreviewJson.results : []).find((row: any) =>
      /Dhanushkodi/i.test(String(row?.anchor?.anchorFrom || "")),
    );

    expect(targetRow, "Auto-Preview response should include the After Dhanushkodi anchor").toBeTruthy();
    expect(String(targetRow?.attempt?.resultType || "")).toBe("FITS_WITH_OPTIONAL_REMOVAL");
    expect(targetRow?.attempt?.canConfirm).toBe(true);
    expect(targetRow?.attempt?.selectedAnchorPreserved).toBe(true);
    expect(
      Array.isArray(targetRow?.attempt?.resolution?.manualInsertionFit?.lowPriorityRemovalPlanPreview?.simulationAttempts),
      "Target row should include sequential rescue attempts",
    ).toBe(true);

    const successfulRemovalAttempt = targetRow?.attempt?.resolution?.manualInsertionFit?.lowPriorityRemovalPlanPreview?.simulationAttempts?.find((attempt: any) =>
      attempt?.resolved === true || attempt?.valid === true,
    );
    expect(successfulRemovalAttempt, "Target row should have at least one successful tried-removal attempt").toBeTruthy();
    expect(
      Array.isArray(successfulRemovalAttempt?.removedHotspotIds) && successfulRemovalAttempt.removedHotspotIds.includes(FIVE_FACED_HANUMAN_TEMPLE_ID),
      "Target row should remove Five Faced Hanuman Temple to preserve the exact anchor",
    ).toBe(true);

    const targetRemovedIds = [
      ...(Array.isArray(targetRow?.attempt?.removedHotspots) ? targetRow.attempt.removedHotspots : []),
      ...(Array.isArray(targetRow?.attempt?.resolution?.removedHotspots) ? targetRow.attempt.resolution.removedHotspots : []),
    ].map((row: any) => Number(row?.id || row?.hotspotId || 0));
    expect(targetRemovedIds).toContain(FIVE_FACED_HANUMAN_TEMPLE_ID);

    const targetTimeline = Array.isArray(targetRow?.attempt?.finalizedTimeline)
      ? targetRow.attempt.finalizedTimeline
      : [];
    const targetAttractionNames = targetTimeline
      .filter((row: any) => String(row?.type || "").toLowerCase() === "attraction")
      .map((row: any) => getSegmentName(row));
    const agniIndex = targetAttractionNames.findIndex((name: string) => /Agni Teertham/i.test(name));
    const dhanushkodiIndex = targetAttractionNames.findIndex((name: string) => /Dhanushkodi/i.test(name));
    const fiveFacedIndex = targetAttractionNames.findIndex((name: string) => /Five Faced/i.test(name));

    expect(agniIndex, "Target timeline should contain Agni Teertham").toBeGreaterThanOrEqual(0);
    expect(dhanushkodiIndex, "Target timeline should contain Dhanushkodi").toBeGreaterThanOrEqual(0);
    expect(
      agniIndex,
      "Exact-anchor After Dhanushkodi preview must not relocate Agni before Dhanushkodi in the displayed timeline",
    ).toBeGreaterThan(dhanushkodiIndex);
    expect(fiveFacedIndex, "Removed Five Faced Hanuman Temple should be absent from finalized auto-preview timeline").toBe(-1);

    const removedFromOriginalRoute = originalDayThreeAttractionNames.filter(
      (name: string) => !targetAttractionNames.some((finalName: string) => finalName === name),
    );
    expect(
      removedFromOriginalRoute.length,
      "At least one original attraction should be absent from the finalized exact-anchor rescue timeline",
    ).toBeGreaterThan(0);

    const dialog = page.getByTestId("auto-fit-here-preview-dialog");
    await expect(dialog).toBeVisible({ timeout: 30000 });

    const rankedRow = page.getByTestId("auto-fit-here-result-row").filter({
      hasText: /After Dhanushkodi and Kothandarama swamy Temple/i,
    }).first();
    await expect(rankedRow).toBeVisible({ timeout: 30000 });
    await rankedRow.click();

    const selectedDetails = page.getByTestId("auto-fit-here-selected-details");
    await expect(selectedDetails).toContainText(/after dhanushkodi/i);

    const changesRequired = page.getByTestId("auto-fit-here-changes-required");
    await expect(changesRequired).toContainText(/Removal order checked: Non-manual \/ Priority 4 -> Priority 3 -> Priority 2 -> Priority 1/i);
    await expect(changesRequired).toContainText(/Five Faced Hanuman Temple/i);
    await expect(changesRequired).toContainText(/removed/i);
    for (const removedName of removedFromOriginalRoute) {
      await expect(
        changesRequired,
        `Changes required must list each hotspot removed from the original route: ${removedName}`,
      ).toContainText(new RegExp(escapeRegExp(removedName), "i"));
    }

    const mainTimeline = page.getByTestId("auto-fit-here-main-timeline");
    await expect(mainTimeline).toContainText(/Agni Teertham/i);
    await expect(mainTimeline).toContainText(/Dhanushkodi and/i);
    await expect(mainTimeline).not.toContainText(/Five Faced Hanuman Temple/i);
    const mainTimelineText = await mainTimeline.innerText();
    expect(
      mainTimelineText.indexOf("Agni Teertham"),
      "UI should not render Agni before Dhanushkodi for the After Dhanushkodi row",
    ).toBeGreaterThan(mainTimelineText.indexOf("Dhanushkodi and"));

    const removalAckCheckbox = dialog.getByTestId("auto-fit-here-removal-ack-checkbox");
    await expect(removalAckCheckbox).toHaveCount(1);

    const confirmButton = dialog.getByRole("button", { name: /confirm fit here|confirm and remove hotspots/i }).first();
    await expect(confirmButton).toBeDisabled();
    await removalAckCheckbox.first().check();
    await expect(confirmButton).toBeEnabled({ timeout: 30000 });
  } finally {
    await deleteManualHotspotIfPresent(request, token, PLAN_ID, AGNI_TEERTHAM_ID);
    await deleteManualHotspotIfPresent(request, token, PLAN_ID, RAMANATHA_SWAMI_TEMPLE_ID);
  }
});

test("day 3 Auto-Preview chain keeps confirming source-side hotspots until destination-side Our Lady becomes cannot fit", async ({
  page,
  request,
  baseURL,
}) => {
  test.setTimeout(420000);

  const appBaseUrl = baseURL ?? process.env.E2E_FRONTEND_BASE_URL!;
  const token = await seedAuthToken(page, request);

  await resetItineraryBasicInfo(request, token);

  let routeId = 0;

  try {
    routeId = await confirmDay3RamanathaBeforeFirstAttractionViaUi(page, request, token, appBaseUrl);
    expect(routeId).toBeGreaterThan(0);

    const confirmedSourceChain = [
      {
        hotspotId: AGNI_TEERTHAM_ID,
        searchText: "Agni",
        hotspotName: "Agni Teertham",
      },
      {
        hotspotId: APJ_ABDUL_KALAM_ID,
        searchText: "APJ Abdul Kalam",
        hotspotName: "APJ Abdul Kalam National Memorial",
      },
      {
        hotspotId: GANDHAMADHANA_PARVATHAM_ID,
        searchText: "Gandhamadhana",
        hotspotName: "Gandhamadhana Parvatham",
      },
      {
        hotspotId: ARIYAMAAN_BEACH_ID,
        searchText: "Ariyamaan",
        hotspotName: "Ariyamaan Beach (Kushi Beach)",
      },
    ];

    const confirmedHotspotNames: string[] = ["Ramanatha swami Temple"];

    for (const step of confirmedSourceChain) {
      await page.goto(`${appBaseUrl}/itinerary-details/${encodeURIComponent(QUOTE_ID)}`, {
        waitUntil: "domcontentloaded",
      });
      await expect(page).toHaveURL(new RegExp(`/itinerary-details/${QUOTE_ID}$`), {
        timeout: 30000,
      });

      await openHotspotListForDay(page, 3);
      const { autoPreviewJson, confirmJson } = await confirmAutoPreviewHotspotBySearch(
        page,
        step.searchText,
        step.hotspotId,
      );

      expect(Array.isArray(autoPreviewJson?.results)).toBe(true);
      expect(autoPreviewJson.results.length).toBeGreaterThan(0);
      expect(String(autoPreviewJson?.results?.[0]?.attempt?.resultType || "")).toMatch(/FITS_/i);
      expect(Number(confirmJson?.routeId || 0)).toBe(routeId);

      confirmedHotspotNames.push(step.hotspotName);
    }

    await page.goto(`${appBaseUrl}/itinerary-details/${encodeURIComponent(QUOTE_ID)}`, {
      waitUntil: "domcontentloaded",
    });
    await expect(page).toHaveURL(new RegExp(`/itinerary-details/${QUOTE_ID}$`), {
      timeout: 30000,
    });

    await openHotspotListForDay(page, 3);

    const destinationTab = page.getByRole("button", { name: /Kanyakumari Hotspots/i }).first();
    await expect(destinationTab).toBeVisible({ timeout: 30000 });
    await destinationTab.click();

    const destinationSearch = page.getByPlaceholder(/search hotspot/i).first();
    await expect(destinationSearch).toBeVisible({ timeout: 30000 });
    await destinationSearch.fill("Our Lady");

    const ourLadyCard = page.locator(`[data-hotspot-id="${OUR_LADY_OF_RANSOM_CHURCH_ID}"]`).first();
    await expect(ourLadyCard).toBeVisible({ timeout: 30000 });
    const ourLadyAutoPreviewButton = ourLadyCard.getByRole("button", { name: /auto-preview/i });
    await expect(ourLadyAutoPreviewButton).toBeEnabled({ timeout: 30000 });

    const autoPreviewResponsePromise = page.waitForResponse(
      (resp) =>
        resp.request().method() === "POST" &&
        resp.url().includes("/manual-hotspot/auto-fit-preview"),
      { timeout: 120000 },
    );

    await ourLadyAutoPreviewButton.click();

    const autoPreviewResponse = await autoPreviewResponsePromise;
    expect(autoPreviewResponse.ok(), "Our Lady Auto-Preview should succeed").toBeTruthy();

    const autoPreviewJson = await autoPreviewResponse.json();
    const results = Array.isArray(autoPreviewJson?.results) ? autoPreviewJson.results : [];
    expect(results.length, "Our Lady Auto-Preview should return ranked results").toBeGreaterThan(0);

    const topResult = results[0];
    expect(String(topResult?.attempt?.resultType || "")).toBe("CANNOT_FIT");
    expect(topResult?.attempt?.canConfirm).toBe(false);
    expect(
      results.some((row: any) => String(row?.attempt?.resultType || "") === "CANNOT_FIT"),
      "At least one ranked Our Lady position should end in a cannot-fit state",
    ).toBe(true);

    const dialog = page.getByTestId("auto-fit-here-preview-dialog");
    await expect(dialog).toBeVisible({ timeout: 30000 });
    await expect(dialog).toContainText(/our lady of ransom church/i);

    const rankedResults = page.getByTestId("auto-fit-here-results");
    await expect(rankedResults).toContainText(/cannot fit/i);

    const selectedDetails = page.getByTestId("auto-fit-here-selected-details");
    await expect(selectedDetails).toContainText(/before first attraction|after/i);

    const changesRequired = page.getByTestId("auto-fit-here-changes-required");
    await expect(changesRequired).toContainText(/no hotspot removed/i);
    await expect(rankedResults).toContainText(/route end time overflow|could not be kept at the exact fit here position|closed at attempted time/i);

    const confirmButton = dialog.getByRole("button", {
      name: /confirm fit here|confirm and remove hotspots/i,
    }).first();
    await expect(confirmButton).toBeDisabled();

    const detailsAfter = await fetchItineraryDetails(request, token, QUOTE_ID);
    const dayThree = (detailsAfter.days || []).find((day: any) => Number(day?.dayNumber || 0) === 3);
    const dayThreeNames = Array.isArray(dayThree?.segments)
      ? dayThree.segments.map((row: any) => getSegmentName(row)).filter(Boolean)
      : [];

    for (const hotspotName of confirmedHotspotNames) {
      expect(
        dayThreeNames.some((name: string) => name.includes(hotspotName)),
        `${hotspotName} should remain persisted on Day 3 before the stop-state hotspot`,
      ).toBe(true);
    }

    expect(
      dayThreeNames.some((name: string) => /Our Lady Of Ransom Church/i.test(name)),
      "Our Lady should not be persisted after a cannot-fit auto-preview stop state",
    ).toBe(false);
  } finally {
    await resetItineraryBasicInfo(request, token);
  }
});
