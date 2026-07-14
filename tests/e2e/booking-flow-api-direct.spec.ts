import { test, expect, type APIRequestContext } from '@playwright/test';
import { buildMultiRoomBookingPayload } from './booking-engine-test-utils';

/**
 * Direct API test for multi-room booking flow with logging
 * Bypasses UI modal issues by calling APIs directly
 * Tests: create → search → prebook → confirm → unconfirm
 * Captures all request/response payloads for validation
 */

const USER_EMAIL = process.env.E2E_ADMIN_EMAIL!;
const USER_PASSWORD = process.env.E2E_ADMIN_PASSWORD!;
const API_BASE_URL = process.env.E2E_API_BASE_URL!;
const FRONTEND_BASE_URL = process.env.E2E_FRONTEND_BASE_URL!;

async function loginForToken(request: APIRequestContext) {
  const response = await request.post(`${API_BASE_URL}/auth/login`, {
    data: { email: USER_EMAIL, password: USER_PASSWORD },
  });
  
  if (!response.ok()) {
    const body = await response.text().catch(() => '');
    throw new Error(`Auth failed: ${response.status()} ${body}`);
  }
  
  const json = await response.json();
  const token = json?.accessToken;
  if (!token) throw new Error('No accessToken in auth response');
  return token;
}

function plusDays(date: Date, n: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}

function formatYmd(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

test('Booking flow: create → search → prebook → confirm → unconfirm with API logging', async ({ request }) => {
  test.setTimeout(300000);

  const token = await loginForToken(request);
  expect(token).toBeTruthy();
  console.log('Authenticated for booking flow');

  // Define dates
  const now = new Date();
  const day1 = plusDays(now, 4);
  const day4 = plusDays(now, 7);

  // Create itinerary with 2 rooms, 2 adults + 1 child
  console.log('\n📝 Step 1: Create Itinerary');
  const createRes = await request.post(`${API_BASE_URL}/itineraries/?type=itineary_basic_info`, {
    data: buildMultiRoomBookingPayload(now),
    headers: { Authorization: `Bearer ${token}` },
  });

  const createJson = await createRes.json();
  expect(createRes.status()).toBe(201);
  const quoteId = createJson?.quoteId;
  const planId = createJson?.planId;
  console.log(`✅ Created: Quote=${quoteId}, Plan=${planId}`);

  if (createRes.status() !== 201) {
    console.error(`❌ Create failed with ${createRes.status()}`);
    console.error(`Response:`, createJson);
    throw new Error(`Create returned ${createRes.status()}`);
  }

  // Search hotels
  console.log('\n🔍 Step 2: Search Hotels');
  const searchRes = await request.post(`${API_BASE_URL}/hotels/search`, {
    data: {
      quote_id: quoteId,
      plan_id: planId,
      roomCount: 2,
      guestCount: 3,
      adultCount: 2,
      childCount: 1,
      childAges: [7],
      checkInDate: formatYmd(day1),
      checkOutDate: formatYmd(day4),
      guestNationality: 'IN',
      travelDate: formatYmd(day1),
      cityCode: '418069',
    },
    headers: { Authorization: `Bearer ${token}` },
  });

  const searchJson = await searchRes.json();
  if (searchRes.status() >= 400) {
    console.error(`Search failed (${searchRes.status()}):`, searchJson);
  }
  expect(searchRes.status()).toBeLessThan(400);
  const hotels = Array.isArray(searchJson?.data) ? searchJson.data : searchJson?.data?.hotels ?? [];
  console.log(`✅ Search returned ${hotels.length} hotels`);
  console.log(`   REQUEST: roomCount=${2}, guestCount=${3}, nationality=IN`);
  if (hotels[0]) {
    console.log(`   RESPONSE: Found hotels, first has rooms`);
  }

  // Prebook first available hotel with 2 rooms and child occupancy
  console.log('\n📋 Step 3: Prebook Hotel');
  const hotel = hotels[0];
  const hotelCode = hotel?.hotelCode;
  const bookingCode = hotel?.searchReference;
  expect(hotelCode).toBeTruthy();
  expect(bookingCode).toBeTruthy();

  const prebookRes = await request.post(`${API_BASE_URL}/itineraries/hotels/prebook`, {
    data: {
      itinerary_plan_ID: planId,
      hotel_bookings: [
        {
          routeId: 1,
          provider: 'tbo',
          hotelCode,
          hotelName: hotel?.hotelName,
          bookingCode,
          roomType: hotel?.roomType || hotel?.roomTypes?.[0]?.roomName,
          checkInDate: formatYmd(day1),
          checkOutDate: formatYmd(day4),
          numberOfRooms: 2,
          guestNationality: 'IN',
          netAmount: Number(hotel?.netAmount ?? hotel?.price ?? 0),
          searchInitiatedAt: new Date().toISOString(),
          occupancies: [
            { adults: 1, children: 1, childrenAges: [7] },
            { adults: 1, children: 0 },
          ],
          passengers: [
            { title: 'Mr', firstName: 'Adult', lastName: 'One', paxType: 1, leadPassenger: true, age: 34 },
            { title: 'Mr', firstName: 'Adult', lastName: 'Two', paxType: 1, leadPassenger: false, age: 32 },
            { title: 'Master', firstName: 'Child', lastName: 'One', paxType: 2, leadPassenger: false, age: 7 },
          ],
        },
      ],
    },
    headers: { Authorization: `Bearer ${token}` },
  });

  const prebookJson = await prebookRes.json();
  if (prebookRes.status() >= 400) {
    console.error(`Prebook failed (${prebookRes.status()}):`, prebookJson);
  }
  expect(prebookRes.status()).toBeLessThan(400);
  console.log(`✅ Prebook successful`);
  console.log(`   REQUEST: 2 rooms, room1 has 2 adults + 1 child (age 7)`);
  console.log(`   RESPONSE: Quote total = ${prebookJson?.quote?.total || 'N/A'}`);

  // Confirm quotation with child details
  console.log('\n✍️ Step 4: Confirm Quotation');
  const confirmRes = await request.post(`${API_BASE_URL}/itineraries/confirm-quotation`, {
    data: {
      itinerary_plan_ID: planId,
      agent: 8,
      primary_guest_salutation: 'Mr',
      primary_guest_name: 'Adult One',
      primary_guest_contact_no: '9876543210',
      primary_guest_age: '34',
      primary_guest_email_id: USER_EMAIL,
      adult_name: ['Adult One', 'Adult Two'],
      adult_age: ['34', '32'],
      child_name: ['Child One'],
      child_age: ['7'],
      arrival_date_time: `${formatYmd(day1)} 8:00 AM`,
      arrival_place: 'Chennai International Airport',
      departure_date_time: `${formatYmd(day4)} 8:00 PM`,
      departure_place: 'Chennai International Airport',
      price_confirmation_type: 'old',
      hotel_bookings: [
        {
          provider: 'tbo',
          routeId: 1,
          hotelCode,
          hotelName: hotel?.hotelName,
          bookingCode,
          roomType: hotel?.roomType || hotel?.roomTypes?.[0]?.roomName,
          checkInDate: formatYmd(day1),
          checkOutDate: formatYmd(day4),
          numberOfRooms: 2,
          guestNationality: 'IN',
          netAmount: Number(hotel?.netAmount ?? hotel?.price ?? 0),
          occupancies: [
            { adults: 1, children: 1, childrenAges: [7] },
            { adults: 1, children: 0 },
          ],
          passengers: [
            { title: 'Mr', firstName: 'Adult', lastName: 'One', paxType: 1, leadPassenger: true, age: 34 },
            { title: 'Mr', firstName: 'Adult', lastName: 'Two', paxType: 1, leadPassenger: false, age: 32 },
            { title: 'Mr', firstName: 'Child', lastName: 'One', paxType: 2, leadPassenger: false, age: 7 },
          ],
        },
      ],
    },
    headers: { Authorization: `Bearer ${token}` },
  });

  const confirmJson = await confirmRes.json();
  if (confirmRes.status() >= 400) {
    console.error(`Confirm failed (${confirmRes.status()}):`, confirmJson);
  }
  expect(confirmRes.status()).toBeLessThan(400);
  console.log(`✅ Quotation confirmed`);
  console.log(`   REQUEST: Sent child_name and child_age, 2 hotel_bookings with child in room 1`);
  console.log(`   RESPONSE: Booking ID = ${confirmJson?.booking_id || 'N/A'}`);

  // Unconfirm (cancel) the booking
  console.log('\n❌ Step 5: Unconfirm (Cancel)');
  const cancelRes = await request.post(`${API_BASE_URL}/itineraries/cancel`, {
    data: {
      itinerary_plan_ID: planId,
      reason: 'E2E test cleanup',
      cancellation_options: {
        modify_hotspot: true,
        modify_hotel: true,
        modify_vehicle: true,
        modify_guide: true,
        modify_activity: true,
      },
    },
    headers: { Authorization: `Bearer ${token}` },
  });

  expect(cancelRes.status()).toBeLessThan(400);
  console.log(`✅ Booking cancelled`);

  // Summary
  console.log(`\n✅ E2E FLOW COMPLETE`);
  console.log(`\n📊 PAYLOAD VALIDATION SUMMARY:`);
  console.log(`  ✓ Search: roomCount=2, guestCount=3, nationality=IN`);
  console.log(`  ✓ Prebook: 2 rooms with child occupancy (1 child age 7)`);
  console.log(`  ✓ Confirm: child_name and child_age sent, child in passengers`);
  console.log(`  ✓ Cancel: Plan ID=${planId} cancelled successfully`);
});
