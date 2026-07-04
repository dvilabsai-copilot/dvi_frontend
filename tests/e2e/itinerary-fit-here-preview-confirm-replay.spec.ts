import { expect, test, type APIRequestContext } from "@playwright/test";
import { API_BASE_URL, loginForToken } from "./booking-engine-test-utils";

const PLAN_ID = 9825;
const ROUTE_ID = 8155;
const SELECTED_HOTSPOT_ID = 898;

const PREVIEW_ANCHOR = {
  anchorIntent: "AFTER_ATTRACTION" as const,
  afterHotspotId: 257,
  anchorIndex: 1,
};

function getTimeline(rows: any): any[] {
  if (Array.isArray(rows?.routeTimeline) && rows.routeTimeline.length > 0) {
    return rows.routeTimeline;
  }
  if (Array.isArray(rows?.finalizedTimeline) && rows.finalizedTimeline.length > 0) {
    return rows.finalizedTimeline;
  }
  return Array.isArray(rows?.proposedTimeline) ? rows.proposedTimeline : [];
}

function normalizeTimeline(rows: any[]): Array<{
  type: string;
  hotspotId: number;
  text: string;
  timeRange: string;
  isConflict: boolean;
}> {
  return (Array.isArray(rows) ? rows : []).map((row: any) => ({
    type: String(row?.type || "").trim().toLowerCase(),
    hotspotId: Number(row?.hotspotId || row?.hotspot_ID || row?.locationId || row?.id || 0),
    text: String(row?.text || row?.name || "").trim(),
    timeRange: String(row?.timeRange || "").trim(),
    isConflict: row?.isConflict === true || Number(row?.is_conflict || 0) === 1,
  }));
}

async function deleteManualHotspotIfPresent(
  request: APIRequestContext,
  token: string,
  planId: number,
  hotspotId: number,
): Promise<void> {
  const response = await request.delete(
    `${API_BASE_URL}/itineraries/${planId}/manual-hotspot/${hotspotId}`,
    {
      headers: { Authorization: `Bearer ${token}` },
      failOnStatusCode: false,
    },
  );

  if (response.ok() || response.status() === 404 || response.status() === 409) {
    return;
  }

  const body = await response.text().catch(() => "");
  throw new Error(`Cleanup delete failed: status=${response.status()} body=${body}`);
}

async function buildMatrix(request: APIRequestContext, token: string): Promise<void> {
  const response = await request.post(
    `${API_BASE_URL}/itineraries/${PLAN_ID}/routes/${ROUTE_ID}/manual-hotspots/${SELECTED_HOTSPOT_ID}/build-matrix`,
    {
      headers: { Authorization: `Bearer ${token}` },
    },
  );

  expect(response.ok(), "Matrix build should succeed").toBeTruthy();
}

test("Fit Here confirm replays the exact preview timeline on save", async ({ request }) => {
  test.setTimeout(300000);

  const token = await loginForToken(request);

  await deleteManualHotspotIfPresent(request, token, PLAN_ID, SELECTED_HOTSPOT_ID);
  await buildMatrix(request, token);

  try {
    const previewResponse = await request.post(
      `${API_BASE_URL}/itineraries/${PLAN_ID}/manual-hotspot/fit-preview`,
      {
        headers: { Authorization: `Bearer ${token}` },
        data: {
          routeId: ROUTE_ID,
          selectedHotspotId: SELECTED_HOTSPOT_ID,
          anchor: PREVIEW_ANCHOR,
          allowP3Removal: true,
          allowP1P2Removal: true,
        },
      },
    );

    expect(previewResponse.ok(), "Fit preview should succeed").toBeTruthy();
    const previewJson = await previewResponse.json();
    expect(previewJson?.attemptId, "Preview should return an attemptId").toBeTruthy();
    expect(previewJson?.canConfirm, "Preview should be confirmable").toBe(true);
    expect(previewJson?.canForceConflict, "Preview should allow force conflict confirmation").toBe(true);
    expect(previewJson?.selectedOpeningConflict, "Preview should expose the opening conflict").toBeTruthy();

    const previewTimeline = getTimeline(previewJson);
    const previewSignature = normalizeTimeline(previewTimeline);
    const previewSelectedRow = previewSignature.find(
      (row) => row.hotspotId === SELECTED_HOTSPOT_ID && row.type === "attraction",
    );

    expect(previewSignature.length, "Preview timeline should not be empty").toBeGreaterThan(0);
    expect(previewSelectedRow, "Preview should include the selected hotspot").toBeTruthy();

    const confirmResponse = await request.post(
      `${API_BASE_URL}/itineraries/${PLAN_ID}/manual-hotspot/fit-confirm`,
      {
        headers: { Authorization: `Bearer ${token}` },
        data: {
          attemptId: String(previewJson?.attemptId || "").trim(),
          allowTimingRisk: true,
          allowClosedHotspotConflict: true,
          allowPriorityRemoval: false,
          acknowledgedRemovedHotspotIds: [],
        },
      },
    );

    expect(confirmResponse.ok(), "Fit confirm should succeed").toBeTruthy();
    const confirmJson = await confirmResponse.json();

    expect(confirmJson?.success, "Confirm should return success").toBe(true);
    expect(confirmJson?.inserted, "Confirm should insert the hotspot").toBe(true);
    expect(confirmJson?.forceConflictInsertionApplied, "Confirm should apply force conflict insertion").toBe(true);

    const confirmTimeline = getTimeline(confirmJson);
    const confirmSignature = normalizeTimeline(confirmTimeline);
    const confirmSelectedRow = confirmSignature.find(
      (row) => row.hotspotId === SELECTED_HOTSPOT_ID && row.type === "attraction",
    );

    expect(confirmSignature).toEqual(previewSignature);
    expect(confirmSelectedRow, "Confirmed timeline should include the selected hotspot").toBeTruthy();
    expect(confirmSelectedRow?.timeRange).toBe(previewSelectedRow?.timeRange);
  } finally {
    await deleteManualHotspotIfPresent(request, token, PLAN_ID, SELECTED_HOTSPOT_ID);
  }
});
