import { expect, type APIRequestContext, type Page } from "@playwright/test";

export const API_BASE_URL = process.env.E2E_API_BASE_URL!;
export const DEFAULT_QUOTE_ID = String(process.env.E2E_ITINERARY_QUOTE_ID || "").trim();

const USER_EMAIL =
  process.env.E2E_ADMIN_EMAIL!;
const USER_PASSWORD =
  process.env.E2E_ADMIN_PASSWORD!;

export type ManualHotspotFixture = {
  token: string;
  quoteId: string;
  planId: number;
  routeId: number;
  hotspotId: number;
  hotspotName: string;
  day: any;
  anchor: Record<string, any>;
};

export type MultiDayManualHotspotFixture = {
  token: string;
  quoteId: string;
  planId: number;
  days: ManualHotspotFixture[];
};

export async function loginForToken(request: APIRequestContext): Promise<string> {
  const response = await request.post(`${API_BASE_URL}/auth/login`, {
    data: { email: USER_EMAIL, password: USER_PASSWORD },
  });

  expect(response.ok(), `Auth login failed: ${response.status()}`).toBeTruthy();
  const body = (await response.json()) as { accessToken?: string };
  const token = String(body?.accessToken || "").trim();
  expect(token, "Auth login response did not include accessToken").toBeTruthy();
  return token;
}

export async function seedAuthToken(page: Page, token: string): Promise<void> {
  await page.addInitScript((value) => {
    window.localStorage.setItem("accessToken", value);
  }, token);
}

function responseArray(body: any): any[] {
  if (Array.isArray(body)) return body;
  if (Array.isArray(body?.data)) return body.data;
  if (Array.isArray(body?.hotspots)) return body.hotspots;
  if (Array.isArray(body?.items)) return body.items;
  return [];
}

export async function loadManualHotspotFixture(
  request: APIRequestContext,
  quoteId = DEFAULT_QUOTE_ID,
): Promise<ManualHotspotFixture> {
  expect(quoteId, "Set E2E_ITINERARY_QUOTE_ID for legacy manual-hotspot fixtures").toBeTruthy();
  const token = await loginForToken(request);
  const headers = { Authorization: `Bearer ${token}` };
  const detailsResponse = await request.get(
    `${API_BASE_URL}/itineraries/details/${encodeURIComponent(quoteId)}`,
    { headers },
  );
  expect(detailsResponse.ok(), `Itinerary details failed: ${detailsResponse.status()}`).toBeTruthy();

  const details = await detailsResponse.json();
  const days = Array.isArray(details?.days) ? details.days : [];
  const day = days.find((candidate: any) =>
    Array.isArray(candidate?.segments) &&
    candidate.segments.some((segment: any) => segment?.type === "attraction"),
  );
  expect(day, "No itinerary day with an attraction was found").toBeTruthy();

  const routeId = Number(day.id || 0);
  const planId = Number(details?.planId || 0);
  expect(planId).toBeGreaterThan(0);
  expect(routeId).toBeGreaterThan(0);

  const firstAttraction = day.segments.find((segment: any) => segment?.type === "attraction");
  expect(firstAttraction, "No first attraction was found on the selected route").toBeTruthy();

  const availableResponse = await request.get(
    `${API_BASE_URL}/itineraries/hotspots/available/${routeId}`,
    { headers },
  );
  expect(availableResponse.ok(), `Available hotspots failed: ${availableResponse.status()}`).toBeTruthy();
  const available = responseArray(await availableResponse.json());
  const candidate = available.find((hotspot: any) =>
    Number(hotspot?.id || hotspot?.hotspotId || 0) > 0 &&
    String(hotspot?.availabilityStatus || "AVAILABLE").toUpperCase() === "AVAILABLE" &&
    hotspot?.alreadyAdded !== true &&
    hotspot?.actionDisabled !== true,
  );
  expect(candidate, "No available manual hotspot candidate was found").toBeTruthy();

  const start = day.segments.find((segment: any) => segment?.type === "start") || {};
  const hotspotId = Number(candidate.id || candidate.hotspotId);
  const firstAttractionId = Number(firstAttraction.hotspotId || firstAttraction.locationId || 0);
  const firstRouteHotspotId = Number(firstAttraction.routeHotspotId || 0);

  return {
    token,
    quoteId,
    planId,
    routeId,
    hotspotId,
    hotspotName: String(candidate.name || candidate.hotspot_name || `Hotspot #${hotspotId}`),
    day,
    anchor: {
      anchorType: "BETWEEN_ROWS",
      anchorIntent: "AFTER_START",
      anchorIndex: 0,
      anchorFrom: String(start.text || start.title || "Start your Journey"),
      anchorTo: String(firstAttraction.name || firstAttraction.text || "First attraction"),
      anchorLabel: `Before first attraction: ${String(firstAttraction.name || firstAttraction.text || "First attraction")}`,
      anchorTimeRange: String(start.timeRange || start.visitTime || start.time || "08:00 AM - 09:00 AM"),
      afterRowType: "start",
      beforeRowType: "attraction",
      afterHotspotId: null,
      afterRouteHotspotId: null,
      beforeHotspotId: firstAttractionId || null,
      beforeRouteHotspotId: firstRouteHotspotId || null,
      isBeforeHotel: false,
    },
  };
}

export async function loadRandomFiveDayQuote(
  request: APIRequestContext,
): Promise<MultiDayManualHotspotFixture> {
  const token = await loginForToken(request);
  const headers = { Authorization: `Bearer ${token}` };
  const latestResponse = await request.get(`${API_BASE_URL}/itineraries/latest?start=0&length=1000`, { headers });
  expect(latestResponse.ok(), `Latest itineraries failed: ${latestResponse.status()}`).toBeTruthy();
  const latestBody = await latestResponse.json();
  const rows = responseArray(latestBody).filter((row: any) => {
    const declaredDays = Number(String(row?.no_of_days_and_nights || "").split("&")[0]);
    return String(row?.itinerary_quote_ID || "").trim() && declaredDays === 5;
  });

  const overrideQuote = String(process.env.E2E_MANUAL_HOTSPOT_QUOTE_ID || "").trim();
  const shuffled = [...rows].sort(() => Math.random() - 0.5);
  const candidates = overrideQuote
    ? [{ itinerary_quote_ID: overrideQuote }, ...shuffled.filter((row: any) => row.itinerary_quote_ID !== overrideQuote)]
    : shuffled;

  for (const candidateRow of candidates) {
    const quoteId = String(candidateRow?.itinerary_quote_ID || "").trim();
    if (!quoteId) continue;

    const detailsResponse = await request.get(
      `${API_BASE_URL}/itineraries/details/${encodeURIComponent(quoteId)}`,
      { headers },
    );
    if (!detailsResponse.ok()) continue;

    const details = await detailsResponse.json();
    const routeDays = (Array.isArray(details?.days) ? details.days : [])
      .filter((day: any) => Number(day?.id || 0) > 0);
    if (routeDays.length !== 5) continue;

    const dayFixtures = await Promise.all(routeDays.map(async (day: any, index: number) => {
      const routeId = Number(day.id);
      const firstAttraction = (Array.isArray(day?.segments) ? day.segments : [])
        .find((segment: any) => segment?.type === "attraction") || null;
      const start = (Array.isArray(day?.segments) ? day.segments : [])
        .find((segment: any) => segment?.type === "start") || {};

      const availableResponse = await request.get(
        `${API_BASE_URL}/itineraries/hotspots/available/${routeId}`,
        { headers },
      );
      if (!availableResponse.ok()) return null;
      const available = responseArray(await availableResponse.json());
      const hotspot = available.find((candidate: any) =>
        Number(candidate?.id || candidate?.hotspotId || 0) > 0 &&
        String(candidate?.availabilityStatus || "AVAILABLE").toUpperCase() === "AVAILABLE" &&
        candidate?.alreadyAdded !== true &&
        candidate?.actionDisabled !== true,
      );
      if (!hotspot) return null;

      const hotspotId = Number(hotspot.id || hotspot.hotspotId);
      const firstAttractionId = Number(firstAttraction?.hotspotId || firstAttraction?.locationId || 0);
      const firstRouteHotspotId = Number(firstAttraction?.routeHotspotId || 0);
      return {
        token,
        quoteId,
        planId: Number(details?.planId || 0),
        routeId,
        hotspotId,
        hotspotName: String(hotspot.name || hotspot.hotspot_name || `Hotspot #${hotspotId}`),
        day: { ...day, dayNumber: Number(day.dayNumber || index + 1) },
        anchor: {
          anchorType: "BETWEEN_ROWS",
          anchorIntent: "AFTER_START",
          anchorIndex: 0,
          anchorFrom: String(start.text || start.title || "Start your Journey"),
          anchorTo: String(firstAttraction?.name || firstAttraction?.text || "First attraction"),
          anchorLabel: `Before first attraction: ${String(firstAttraction?.name || firstAttraction?.text || "First attraction")}`,
          anchorTimeRange: String(start.timeRange || start.visitTime || start.time || "08:00 AM - 09:00 AM"),
          afterRowType: "start",
          beforeRowType: firstAttraction ? "attraction" : undefined,
          afterHotspotId: null,
          afterRouteHotspotId: null,
          beforeHotspotId: firstAttractionId || null,
          beforeRouteHotspotId: firstRouteHotspotId || null,
          isBeforeHotel: false,
        },
      } satisfies ManualHotspotFixture;
    }));

    if (Number(details?.planId || 0) > 0 && dayFixtures.every(Boolean)) {
      console.log(`[ManualHotspot] selected random ${routeDays.length}-day quote ${quoteId}`);
      return {
        token,
        quoteId,
        planId: Number(details.planId),
        days: dayFixtures as ManualHotspotFixture[],
      };
    }
  }

  throw new Error("Could not find an existing quote with at least five route days and an available hotspot on every day");
}

export async function deleteManualHotspot(
  request: APIRequestContext,
  fixture: Pick<ManualHotspotFixture, "token" | "planId" | "hotspotId">,
): Promise<void> {
  const response = await request.delete(
    `${API_BASE_URL}/itineraries/${fixture.planId}/manual-hotspot/${fixture.hotspotId}`,
    {
      headers: { Authorization: `Bearer ${fixture.token}` },
      failOnStatusCode: false,
    },
  );
  expect(
    response.ok() || response.status() === 404 || response.status() === 409,
    `Manual hotspot cleanup failed: ${response.status()}`,
  ).toBeTruthy();
}

export async function previewFitHere(
  request: APIRequestContext,
  fixture: ManualHotspotFixture,
): Promise<{ response: any; body: any }> {
  const response = await request.post(
    `${API_BASE_URL}/itineraries/${fixture.planId}/manual-hotspot/fit-preview`,
    {
      headers: { Authorization: `Bearer ${fixture.token}` },
      data: {
        routeId: fixture.routeId,
        selectedHotspotId: fixture.hotspotId,
        anchor: fixture.anchor,
        allowP3Removal: true,
        allowP1P2Removal: true,
      },
    },
  );
  expect(response.ok(), `Fit Here preview failed: ${response.status()}`).toBeTruthy();
  return { response, body: await response.json() };
}

export function previewTimeline(body: any): any[] {
  if (Array.isArray(body?.finalizedTimeline) && body.finalizedTimeline.length > 0) {
    return body.finalizedTimeline;
  }
  if (Array.isArray(body?.proposedTimeline) && body.proposedTimeline.length > 0) {
    return body.proposedTimeline;
  }
  return Array.isArray(body?.routeTimeline) ? body.routeTimeline : [];
}

export function assertManualHotspotOutcome(body: any, hotspotId: number): void {
  expect(body?.attemptId, "Fit Here preview should return an attemptId").toBeTruthy();

  if (body?.canConfirm === true) {
    expect(body?.selectedHotspotPreserved).toBe(true);
    expect(body?.resultType).not.toBe("CANNOT_FIT");
  } else if (body?.resultType === "SELECTED_HOTSPOT_CLOSED_AT_ATTEMPTED_TIME") {
    expect(body?.canConfirm).toBe(false);
    expect(body?.canForceConflict).toBe(true);
    expect(body?.selectedOpeningConflict?.hotspotId).toBe(hotspotId);
  } else {
    expect(body?.selectedHotspotPreserved).not.toBe(true);
    expect(body?.selectedAnchorPreserved).toBe(false);
  }
}

export function assertNoExactDuplicateRows(rows: any[]): void {
  const keys = rows.map((row: any) => [
    String(row?.type || row?.item_type || "").toLowerCase(),
    Number(row?.hotspotId || row?.locationId || row?.hotspot_ID || 0),
    String(row?.timeRange || "").trim(),
  ].join("|"));
  expect(new Set(keys).size, "Preview timeline contains exact duplicate rows").toBe(keys.length);
}
