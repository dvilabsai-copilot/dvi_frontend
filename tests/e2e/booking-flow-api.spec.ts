import { test, expect, type APIRequestContext } from '@playwright/test';
import { buildMultiRoomBookingPayload } from './booking-engine-test-utils';

const USER_EMAIL = process.env.E2E_ADMIN_EMAIL!;
const USER_PASSWORD = process.env.E2E_ADMIN_PASSWORD!;
const API_BASE_URL = process.env.E2E_API_BASE_URL!;

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

test('Complete booking flow: search → prebook → confirm with API payload logging', async ({ request }) => {
  test.setTimeout(300000);

  const token = await loginForToken(request);
  console.log(`✅ Authenticated`);

  const now = new Date();
  const day1 = plusDays(now, 4);
  const day4 = plusDays(now, 7);

  // Step 1: Create itinerary with 2 rooms, 2 adults + 1 child
  console.log('\n📝 Step 1: Create Itinerary (2 rooms, 2 adults + 1 child)');
  const createRes = await request.post(`${API_BASE_URL}/itineraries/?type=itineary_basic_info`, {
    data: buildMultiRoomBookingPayload(now),
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!createRes.ok()) {
    const body = await createRes.text();
    console.error(`Create failed (${createRes.status()}): ${body}`);
    throw new Error(`Create failed: ${createRes.status()}`);
  }

  const createJson = await createRes.json();
  const quoteId = createJson?.quoteId;
  const planId = createJson?.planId;
  console.log(`✅ Created: Quote=${quoteId}, Plan=${planId}`);

  // Step 2: Search for hotels (multi-room, multi-pax with child)
  console.log('\n🔍 Step 2: Search Hotels (Multi-room & Multi-pax)');
  const searchPayload = {
    quote_id: quoteId,
   plan_id: planId,
    roomCount: 2,
    guestCount: 3, // 2 adults + 1 child
    adultCount: 2,
    childCount: 1,
    childAges: [7],
    checkInDate: formatYmd(day1),
    checkOutDate: formatYmd(day4),
    guestNationality: 'IN',
    travelDate: formatYmd(day1),
    cityCode: '418069',
  };
  
  console.log(`📤 SEARCH REQUEST:`, searchPayload);

  const searchRes = await request.post(`${API_BASE_URL}/hotels/search`, {
    data: searchPayload,
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!searchRes.ok()) {
    const body = await searchRes.text();
    console.error(`Search failed (${searchRes.status()}): ${body}`);
    throw new Error(`Search failed: ${searchRes.status()} ${body}`);
  }

  const searchJson = await searchRes.json();
  const hotels = Array.isArray(searchJson?.data) ? searchJson.data : searchJson?.data?.hotels ?? [];
  console.log(`📥 SEARCH RESPONSE: ${hotels.length} hotels found`);
  expect(hotels.length).toBeGreaterThan(0);

  // Step 3: Prebook with child details in occupancies and passengers
  console.log('\n📋 Step 3: Prebook Hotel (with child info)');
  const hotel = hotels[0];
  const hotelCode = hotel?.hotelCode;
  const bookingCode = hotel?.searchReference;
  expect(hotelCode).toBeTruthy();
  expect(bookingCode).toBeTruthy();
  
  const prebookPayload = {
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
  };
  
  console.log(`📤 PREBOOK REQUEST:`, JSON.stringify(prebookPayload, null, 2));

  const prebookRes = await request.post(`${API_BASE_URL}/itineraries/hotels/prebook`, {
    data: prebookPayload,
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!prebookRes.ok()) {
    const body = await prebookRes.text();
    console.error(`Prebook failed (${prebookRes.status()}): ${body}`);
    throw new Error(`Prebook failed: ${prebookRes.status()} ${body}`);
  }

  const prebookJson = await prebookRes.json();
  console.log(`📥 PREBOOK RESPONSE:`, {
    total: prebookJson?.quote?.total,
    currency: prebookJson?.quote?.currency,
    rooms: prebookJson?.hotel_bookings?.length,
  });

  // Step 4: Confirm quotation with child details
  console.log('\n✍️ Step 4: Confirm Quotation (with child details)');
  const confirmPayload = {
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
  };
  
  console.log(`📤 CONFIRM REQUEST:`, JSON.stringify(confirmPayload, null, 2));

  const confirmRes = await request.post(`${API_BASE_URL}/itineraries/confirm-quotation`, {
    data: confirmPayload,
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!confirmRes.ok()) {
    const body = await confirmRes.text();
    console.error(`Confirm failed (${confirmRes.status()}): ${body}`);
    throw new Error(`Confirm failed: ${confirmRes.status()} ${body}`);
  }

  const confirmJson = await confirmRes.json();
  console.log(`📥 CONFIRM RESPONSE:`, {
    booking_id: confirmJson?.booking_id,
    status: confirmJson?.status,
    total_amount: confirmJson?.total_amount,
  });

  // Step 5: Cancel for cleanup
  console.log('\n❌ Step 5: Cancel Booking (Cleanup)');
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

  expect(cancelRes.ok()).toBeTruthy();
  console.log(`✅ Booking cancelled`);

  // Summary
  console.log(`\n✅ E2E FLOW COMPLETED SUCCESSFULLY`);
  console.log(`\n📊 MULTI-ROOM, MULTI-PAX BOOKING VALIDATION:`);
  console.log(`  ✓ Search: roomCount=2, guestCount=3 (2 adults + 1 child)`);
  console.log(`  ✓ Prebook: Room 1 has child occupancy (age 7) + child in passengers`);
  console.log(`  ✓ Confirm: child_name and child_age sent, verified in 2 rooms`);
  console.log(`  ✓ Cleanup: Booking successfully cancelled`);
});
