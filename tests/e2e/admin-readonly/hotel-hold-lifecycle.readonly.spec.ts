import { test, expect } from '../fixtures/auth.fixture';

const quoteId = String(process.env.E2E_HOTEL_HOLD_LIFECYCLE_QUOTE_ID || 'PW_E2E_HOTEL_HOLD_20261105_2318').trim();

test('@readonly hotel hold can be simulated and paid without writing to the E2E database', async ({ adminPage }) => {

  let selectedHotelDetailsIds: number[] = [];
  let activeHoldRequests: Array<Record<string, unknown>> = [];
  let holdPostCount = 0;
  let confirmationPostCount = 0;
  let confirmationPayload: Record<string, unknown> | null = null;

  await adminPage.route('**/itineraries/hotel_details/**', async (route) => {
    const response = await route.fetch();
    if (response.ok()) {
      const payload = await response.json().catch(() => null) as Record<string, unknown> | null;
      const data = payload && typeof payload.data === 'object' && payload.data !== null
        ? payload.data as Record<string, unknown>
        : payload;
      const rows = Array.isArray(data?.hotels) ? data.hotels as Array<Record<string, unknown>> : [];
      selectedHotelDetailsIds = Array.from(new Set(rows.flatMap((row) => {
        const ids = Array.isArray(row.hotelDetailsIds) ? row.hotelDetailsIds : [];
        const singular = row.itineraryPlanHotelDetailsId;
        return [...ids, singular].map(Number).filter((id) => Number.isInteger(id) && id > 0);
      })));
    }
    await route.fulfill({ response });
  });

  await adminPage.route(/\/hotel-blocks\/policy(?:\?|$)/, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        allowed: true,
        leadDays: 6,
        durationHours: 48,
        cutoffAt: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(),
        band: '3-15',
        reason: null,
      }),
    });
  });

  await adminPage.route(/\/hotel-blocks\/itinerary\/\d+/, async (route) => {
    if (route.request().method() !== 'GET') return route.continue();
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(activeHoldRequests) });
  });

  await adminPage.route('**/hotel-blocks/hold-group', async (route) => {
    holdPostCount += 1;
    const payload = route.request().postDataJSON() as Record<string, unknown>;
    const requestedIds = Array.isArray(payload.hotelDetailsIds) ? payload.hotelDetailsIds.map(Number) : [];
    const selectionIds = Array.from(new Set(requestedIds.length ? requestedIds : selectedHotelDetailsIds));
    expect(selectionIds.length, 'the hold request must identify the selected hotel rows').toBeGreaterThan(0);
    const request = {
      id: 910001,
      itineraryPlanId: Number(payload.itineraryPlanId),
      groupType: Number(payload.groupType),
      hotelName: 'E2E mock offline hotel',
      provider: 'offline',
      status: 'BLOCKED',
      selectionIds,
      cutoffAt: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(),
      paidConfirmedAt: null,
      releaseStatus: 'NOT_REQUIRED',
      releaseEmailStatus: 'QUEUED',
    };
    activeHoldRequests = [request];
    await route.fulfill({
      status: 201,
      contentType: 'application/json',
      body: JSON.stringify({ requests: activeHoldRequests, contactRequired: 0, supplierBookingCalls: 0 }),
    });
  });

  await adminPage.route('**/itineraries/wallet-balance/**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ balance: 100000, formatted_balance: '₹ 100,000.00' }),
    });
  });

  await adminPage.route('**/itineraries/manual-confirm-quotation', async (route) => {
    confirmationPostCount += 1;
    confirmationPayload = route.request().postDataJSON() as Record<string, unknown>;
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        itinerary_plan_ID: Number(confirmationPayload.itinerary_plan_ID),
        confirmed_itinerary_plan_ID: 910002,
        confirmedHotelDetails: { hotels: [] },
        supplierBookingCalls: 0,
      }),
    });
  });

  await adminPage.goto(`/itinerary-details/${encodeURIComponent(quoteId)}?openHotelConfirmation=1`, {
    waitUntil: 'domcontentloaded',
  });

  const dialog = adminPage.getByRole('dialog');
  await expect(dialog.getByRole('heading', { name: 'Book Total Package' }).last()).toBeVisible({ timeout: 60_000 });
  await expect(dialog.getByRole('button', { name: 'Hold Hotels' })).toBeEnabled({ timeout: 30_000 });
  await dialog.getByRole('button', { name: 'Hold Hotels' }).click();
  await expect(adminPage.getByText('Hotel hold requests created. No supplier booking was called.')).toBeVisible();
  await expect(adminPage.getByRole('cell', { name: 'Blocked' })).toBeVisible();

  const confirmButton = dialog.getByRole('button', { name: 'Confirm & Pay' });
  await expect(confirmButton).toBeEnabled();
  await confirmButton.click();

  await expect.poll(() => confirmationPostCount).toBe(1);
  expect(holdPostCount).toBe(1);
  expect(confirmationPayload).not.toBeNull();
  expect(confirmationPayload?.hotel_bookings).toEqual([]);
  expect(confirmationPayload?.tbo_hotels).toEqual([]);
  await expect(adminPage.getByText('Quotation confirmed successfully!')).toBeVisible({ timeout: 30_000 });
  await expect(dialog).not.toBeVisible({ timeout: 30_000 });
});
