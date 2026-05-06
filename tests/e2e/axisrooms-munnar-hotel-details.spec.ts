/**
 * axisrooms-munnar-hotel-details.spec.ts
 *
 * Verifies that MUNNAR QUEEN (hotel_id=153, axisrooms_property_id=AX_DVI_HOTEL_153)
 * appears in the hotel details API response for a Munnar itinerary route,
 * after AxisRooms inventory + rate data has been seeded.
 *
 * Prerequisites (handled in beforeAll):
 *   - POST /axisrooms/inventoryUpdate for each room ref code
 *   - POST /axisrooms/rateUpdate      for each room ref code
 *
 * Then verifies via GET /itineraries/hotel_details/:quoteId that
 * MUNNAR QUEEN is present with provider='axisrooms'.
 */

import { expect, test, type APIRequestContext } from '@playwright/test';

const API_BASE = process.env.E2E_API_BASE_URL ?? 'http://127.0.0.1:4006/api/v1';
const QUOTE_ID = process.env.E2E_MUNNAR_QUOTE_ID ?? 'DVI20260320';

// AxisRooms auth key
const AUTH_KEY = 'axis_C3g8K3b1wray989DVih37od3314r6444';
const PROPERTY_ID = 'AX_DVI_HOTEL_153';
const EXPECTED_HOTEL_NAME = 'MUNNAR QUEEN';

const START_DATE = '2026-05-01';
const END_DATE = '2026-12-31';
const FREE_COUNT = 5;

// Rooms: ref code -> external rateplan ID (CP=12, MAP=13)
const ROOMS: Array<{ roomId: string; extRateplanId: string }> = [
  { roomId: 'DVIRHON666981', extRateplanId: '12' },
  { roomId: 'DVIREXE136214', extRateplanId: '13' },
  { roomId: 'DVIRSUI200245', extRateplanId: '12' },
  { roomId: 'DVIRLUX836022', extRateplanId: '12' },
  { roomId: 'DVIREXE771617', extRateplanId: '12' },
  { roomId: 'DVIREXE96359',  extRateplanId: '12' },
];

async function seedInventory(request: APIRequestContext, roomId: string) {
  return request.post(`${API_BASE}/axisrooms/inventoryUpdate`, {
    data: {
      auth: { key: AUTH_KEY },
      data: {
        propertyId: PROPERTY_ID,
        roomId,
        inventory: [{ startDate: START_DATE, endDate: END_DATE, free: FREE_COUNT }],
      },
    },
  });
}

async function seedRate(request: APIRequestContext, roomId: string, rateplanId: string) {
  return request.post(`${API_BASE}/axisrooms/rateUpdate`, {
    data: {
      auth: { key: AUTH_KEY },
      data: {
        propertyId: PROPERTY_ID,
        roomId,
        rateplanId,
        rate: [
          {
            startDate: START_DATE,
            endDate: END_DATE,
            SINGLE: 2500,
            DOUBLE: 3200,
            TRIPLE: 4200,
            EXTRABED: 800,
          },
        ],
      },
    },
  });
}

test.describe('AxisRooms MUNNAR QUEEN hotel details integration', () => {
  // Seed inventory + rates before running the assertion test
  test.beforeAll(async ({ request }) => {
    for (const room of ROOMS) {
      const invRes = await seedInventory(request, room.roomId);
      expect(invRes.ok(), `inventoryUpdate HTTP for ${room.roomId}`).toBeTruthy();
      const invJson = (await invRes.json()) as { status: string; message?: string };
      expect(invJson.status, `inventoryUpdate body.status for ${room.roomId}: ${invJson.message}`).toBe('success');

      const rateRes = await seedRate(request, room.roomId, room.extRateplanId);
      expect(rateRes.ok(), `rateUpdate HTTP for ${room.roomId}`).toBeTruthy();
      const rateJson = (await rateRes.json()) as { status: string; message?: string };
      expect(rateJson.status, `rateUpdate body.status for ${room.roomId}: ${rateJson.message}`).toBe('success');
    }
  });

  test('MUNNAR QUEEN appears in hotel_details API response for Munnar quote', async ({
    request,
  }) => {
    // Clear cache first to force a fresh fetch
    const rebuildRes = await request.post(`${API_BASE}/itineraries/hotel_details/${QUOTE_ID}/rebuild`);
    // Cache rebuild may return 200 or 404 if unsupported — we just continue
    console.log(`Cache rebuild status: ${rebuildRes.status()}`);

    // Fetch hotel details
    const res = await request.get(`${API_BASE}/itineraries/hotel_details/${QUOTE_ID}`, {
      params: { page: '1', pageSize: '50' },
    });

    expect(res.ok(), `hotel_details API returned ${res.status()}`).toBeTruthy();

    type HotelRow = {
      hotelName?: string;
      hotel_name?: string;
      name?: string;
      provider?: string;
      hotelId?: number;
      hotel_id?: number;
    };

    type HotelDetailsResponse = {
      hotels?: HotelRow[];
      hotelTabs?: Array<{ hotels?: HotelRow[] }>;
    };

    const body = (await res.json()) as HotelDetailsResponse;

    // Collect all hotel rows from both top-level and nested tabs
    const allHotels: HotelRow[] = [
      ...(body.hotels ?? []),
      ...(body.hotelTabs ?? []).flatMap((tab) => tab.hotels ?? []),
    ];

    console.log(
      `Total hotel rows returned: ${allHotels.length}`,
    );
    console.log(
      'All hotels:',
      allHotels.map((h) => ({
        name: h.hotelName ?? h.hotel_name ?? h.name,
        provider: h.provider,
        id: h.hotelId ?? h.hotel_id,
      })),
    );

    const munnarQueen = allHotels.find((h) => {
      const name = String(h.hotelName ?? h.hotel_name ?? h.name ?? '').toUpperCase();
      return name.includes('MUNNAR QUEEN');
    });

    expect(
      munnarQueen,
      `Expected to find "${EXPECTED_HOTEL_NAME}" in hotel_details for quote ${QUOTE_ID}. ` +
        `Got: ${allHotels.map((h) => h.hotelName ?? h.hotel_name ?? h.name).join(', ')}`,
    ).toBeTruthy();

    expect(
      munnarQueen?.provider,
      `Expected provider='axisrooms' for MUNNAR QUEEN, got '${munnarQueen?.provider}'`,
    ).toBe('axisrooms');
  });
});
