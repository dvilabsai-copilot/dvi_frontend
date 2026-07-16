import { expect, test, type APIRequestContext } from "@playwright/test";
import { fetchItineraryDetails, seedAuthToken } from "../booking-engine-test-utils";

const QUOTE_ID = "DVI2026071";
const PLAN_ID = 9706;
const ROUTE_ID = 7877;
const APJ_ID = 41;
const MEENAKSHI_ID = 26;
const THIRUMALAI_ID = 27;
const RAMANATHA_ID = 35;
const AGNI_ID = 36;

type FitPayload = {
  routeId: number;
  selectedHotspotId: number;
  anchor: Record<string, any>;
  allowP3Removal: boolean;
  allowP1P2Removal: boolean;
};

const payloads: Array<{ name: string; payload: FitPayload }> = [
  {
    name: "APJ before first attraction",
    payload: {
      routeId: ROUTE_ID,
      selectedHotspotId: APJ_ID,
      anchor: {
        anchorType: "BETWEEN_ROWS",
        anchorIntent: "AFTER_START",
        anchorIndex: 0,
        anchorFrom: "Start your Journey",
        anchorTo: "Meenakshi Amman Temple",
        anchorLabel: "Before first attraction: Meenakshi Amman Temple",
        anchorTimeRange: "08:00 AM - 09:00 AM",
        afterRowType: "start",
        beforeRowType: "hotspot",
        afterHotspotId: null,
        afterRouteHotspotId: null,
        beforeHotspotId: MEENAKSHI_ID,
        beforeRouteHotspotId: 135042,
      },
      allowP3Removal: true,
      allowP1P2Removal: true,
    },
  },
  {
    name: "APJ after Meenakshi",
    payload: {
      routeId: ROUTE_ID,
      selectedHotspotId: APJ_ID,
      anchor: {
        anchorType: "BETWEEN_ROWS",
        anchorIntent: "AFTER_ATTRACTION",
        anchorIndex: 3,
        anchorFrom: "Meenakshi Amman Temple",
        anchorTo: "Thirumalai Nayakkar Mahal",
        anchorLabel: "After Meenakshi Amman Temple",
        anchorTimeRange: "09:30 AM - 11:00 AM",
        afterRowType: "attraction",
        beforeRowType: "hotspot",
        afterHotspotId: MEENAKSHI_ID,
        afterRouteHotspotId: 135042,
        beforeHotspotId: THIRUMALAI_ID,
        beforeRouteHotspotId: 135044,
      },
      allowP3Removal: true,
      allowP1P2Removal: true,
    },
  },
  {
    name: "APJ after Thirumalai",
    payload: {
      routeId: ROUTE_ID,
      selectedHotspotId: APJ_ID,
      anchor: {
        anchorType: "BETWEEN_ROWS",
        anchorIntent: "AFTER_ATTRACTION",
        anchorIndex: 4,
        anchorFrom: "Thirumalai Nayakkar Mahal",
        anchorTo: "Ramanatha swami Temple",
        anchorLabel: "After Thirumalai Nayakkar Mahal",
        anchorTimeRange: "11:03 AM - 12:03 PM",
        afterRowType: "attraction",
        beforeRowType: "hotspot",
        afterHotspotId: THIRUMALAI_ID,
        afterRouteHotspotId: 135044,
        beforeHotspotId: RAMANATHA_ID,
        beforeRouteHotspotId: 135046,
      },
      allowP3Removal: true,
      allowP1P2Removal: true,
    },
  },
  {
    name: "APJ after Ramanatha",
    payload: {
      routeId: ROUTE_ID,
      selectedHotspotId: APJ_ID,
      anchor: {
        anchorType: "BETWEEN_ROWS",
        anchorIntent: "AFTER_ATTRACTION",
        anchorIndex: 5,
        anchorFrom: "Ramanatha swami Temple",
        anchorTo: "Agni Teertham",
        anchorLabel: "After Ramanatha swami Temple",
        anchorTimeRange: "03:58 PM - 04:58 PM",
        afterRowType: "attraction",
        beforeRowType: "hotspot",
        afterHotspotId: RAMANATHA_ID,
        afterRouteHotspotId: 135046,
        beforeHotspotId: AGNI_ID,
        beforeRouteHotspotId: 135048,
      },
      allowP3Removal: true,
      allowP1P2Removal: true,
    },
  },
  {
    name: "APJ after Agni",
    payload: {
      routeId: ROUTE_ID,
      selectedHotspotId: APJ_ID,
      anchor: {
        anchorType: "BETWEEN_ROWS",
        anchorIntent: "AFTER_ATTRACTION",
        anchorIndex: 6,
        anchorFrom: "Agni Teertham",
        anchorTo: "Hotel",
        anchorLabel: "After Agni Teertham",
        anchorTimeRange: "03:58 PM - 04:58 PM",
        afterRowType: "attraction",
        beforeRowType: "hotel",
        afterHotspotId: AGNI_ID,
        afterRouteHotspotId: 135048,
        beforeHotspotId: null,
        beforeRouteHotspotId: null,
      },
      allowP3Removal: true,
      allowP1P2Removal: true,
    },
  },
];

function timelineRows(response: any): any[] {
  return Array.isArray(response?.finalizedTimeline) && response.finalizedTimeline.length > 0
    ? response.finalizedTimeline
    : Array.isArray(response?.proposedTimeline)
      ? response.proposedTimeline
      : [];
}

function attractionIds(response: any): number[] {
  return timelineRows(response)
    .filter((row) => String(row?.type || "").toLowerCase() === "attraction")
    .map((row) => Number(row?.hotspotId || row?.locationId || row?.hotspot_ID || 0))
    .filter((id) => Number.isFinite(id) && id > 0);
}

function assertCleanExactAnchorFailure(response: any) {
  expect(String(response?.authoritativeTimelineSource || "").toUpperCase()).toBe("EXACT_ANCHOR_NO_VALID_RESULT");
  expect(Array.isArray(response?.proposedTimeline) ? response.proposedTimeline : []).toHaveLength(0);
  expect(Array.isArray(response?.finalizedTimeline) ? response.finalizedTimeline : []).toHaveLength(0);
  expect(response?.selectedAnchorPreserved).toBe(false);
  expect(response?.selectedHotspotPreserved).toBe(false);
}

function assertNoMaduraiBacktrackAfterApj(response: any) {
  const ids = attractionIds(response);
  const apjIndex = ids.indexOf(APJ_ID);
  expect(apjIndex, "APJ should appear in the rescued timeline").toBeGreaterThanOrEqual(0);
  expect(ids.indexOf(MEENAKSHI_ID) < 0 || ids.indexOf(MEENAKSHI_ID) < apjIndex).toBeTruthy();
  expect(ids.indexOf(THIRUMALAI_ID) < 0 || ids.indexOf(THIRUMALAI_ID) < apjIndex).toBeTruthy();
}

async function previewFit(request: APIRequestContext, token: string, planId: number, payload: FitPayload) {
  const response = await request.post(`${process.env.E2E_API_BASE_URL!}/itineraries/${planId}/manual-hotspot/fit-preview`, {
    headers: { Authorization: `Bearer ${token}` },
    data: payload,
  });

  expect(response.ok(), "Fit Here preview API should return 2xx").toBeTruthy();
  return response.json();
}

async function getPlanAndToken(page: any, request: APIRequestContext) {
  const token = await seedAuthToken(page, request);
  const details = await fetchItineraryDetails(request, token, QUOTE_ID);
  return { token, planId: Number(details.planId || PLAN_ID) };
}

test.describe("DVI2026071 APJ selected-hotspot-first rescue", () => {
  test.setTimeout(240000);

  for (const item of payloads) {
    test(item.name, async ({ page, request }) => {
      const { token, planId } = await getPlanAndToken(page, request);
      const previewJson = await previewFit(request, token, planId, item.payload);

      if (previewJson?.canConfirm === true) {
        expect(previewJson?.resultType).not.toBe("CANNOT_FIT");
        expect(previewJson?.selectedHotspotPreserved).toBe(true);
        expect(previewJson?.selectedAnchorPreserved).not.toBe(false);
      } else {
        expect(previewJson?.canConfirm).toBe(false);
        expect(previewJson?.selectedHotspotPreserved).not.toBe(true);
        expect(previewJson?.selectedAnchorPreserved).toBe(false);
        if (String(previewJson?.authoritativeTimelineSource || "").toUpperCase() === "EXACT_ANCHOR_NO_VALID_RESULT") {
          assertCleanExactAnchorFailure(previewJson);
        }
      }

      const ids = attractionIds(previewJson);

      if (item.name === "APJ before first attraction") {
        if (previewJson?.canConfirm === true) {
          expect(ids[0]).toBe(APJ_ID);
          assertNoMaduraiBacktrackAfterApj(previewJson);
        }
      }

      if (item.name === "APJ after Meenakshi") {
        if (previewJson?.canConfirm === true) {
          const apjIndex = ids.indexOf(APJ_ID);
          const meenakshiIndex = ids.indexOf(MEENAKSHI_ID);
          expect(apjIndex).toBeGreaterThanOrEqual(0);
          if (previewJson?.selectedAnchorPreserved === true) {
            expect(apjIndex).toBe(meenakshiIndex + 1);
          } else {
            expect(previewJson?.selectedAnchorPreserved).toBe(false);
            assertNoMaduraiBacktrackAfterApj(previewJson);
          }
        }
      }

      if (item.name === "APJ after Thirumalai") {
        if (previewJson?.canConfirm === true) {
          const apjIndex = ids.indexOf(APJ_ID);
          expect(apjIndex).toBeGreaterThanOrEqual(0);
          expect(ids.indexOf(THIRUMALAI_ID)).toBeLessThan(apjIndex);
          expect(ids.indexOf(RAMANATHA_ID) < 0 || ids.indexOf(RAMANATHA_ID) > apjIndex).toBeTruthy();
          assertNoMaduraiBacktrackAfterApj(previewJson);
        }
      }

      if (item.name === "APJ after Ramanatha") {
        if (previewJson?.resultType === "SELECTED_HOTSPOT_CLOSED_AT_ATTEMPTED_TIME") {
          throw new Error("APJ after Ramanatha must not stop only because APJ was closed at the first attempted time");
        }
        if (previewJson?.canConfirm === true) {
          expect(ids.includes(APJ_ID)).toBeTruthy();
          assertNoMaduraiBacktrackAfterApj(previewJson);
        }
      }

      if (item.name === "APJ after Agni") {
        if (previewJson?.canConfirm === true) {
          expect(ids.includes(APJ_ID)).toBeTruthy();
          expect(ids.indexOf(AGNI_ID) < 0 || ids.indexOf(AGNI_ID) < ids.indexOf(APJ_ID)).toBeTruthy();
          assertNoMaduraiBacktrackAfterApj(previewJson);
        }
      }
    });
  }
});
