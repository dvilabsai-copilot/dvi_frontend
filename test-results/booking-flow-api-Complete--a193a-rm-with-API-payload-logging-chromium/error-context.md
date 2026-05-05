# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: booking-flow-api.spec.ts >> Complete booking flow: search → prebook → confirm with API payload logging
- Location: tests\e2e\booking-flow-api.spec.ts:36:1

# Error details

```
Error: Create failed: 400
```

# Test source

```ts
  1   | import { test, expect } from '@playwright/test';
  2   | 
  3   | const USER_EMAIL = process.env.E2E_USER ?? process.env.E2E_HOTSPOT_USER ?? 'admin@dvi.co.in';
  4   | const USER_PASSWORD = process.env.E2E_PASSWORD ?? process.env.E2E_HOTSPOT_PASSWORD ?? 'Keerthi@2404ias';
  5   | const API_BASE_URL = process.env.E2E_API_BASE_URL ?? 'http://127.0.0.1:4006/api/v1';
  6   | 
  7   | async function loginForToken(request: any) {
  8   |   const response = await request.post(`${API_BASE_URL}/auth/login`, {
  9   |     data: { email: USER_EMAIL, password: USER_PASSWORD },
  10  |   });
  11  |   
  12  |   if (!response.ok()) {
  13  |     const body = await response.text().catch(() => '');
  14  |     throw new Error(`Auth failed: ${response.status()} ${body}`);
  15  |   }
  16  |   
  17  |   const json = await response.json();
  18  |   const token = json?.accessToken;
  19  |   if (!token) throw new Error('No accessToken in auth response');
  20  |   return token;
  21  | }
  22  | 
  23  | function plusDays(date: Date, n: number): Date {
  24  |   const d = new Date(date);
  25  |   d.setDate(d.getDate() + n);
  26  |   return d;
  27  | }
  28  | 
  29  | function formatYmd(date: Date): string {
  30  |   const y = date.getFullYear();
  31  |   const m = String(date.getMonth() + 1).padStart(2, '0');
  32  |   const d = String(date.getDate()).padStart(2, '0');
  33  |   return `${y}-${m}-${d}`;
  34  | }
  35  | 
  36  | test('Complete booking flow: search → prebook → confirm with API payload logging', async ({ request }) => {
  37  |   test.setTimeout(300000);
  38  | 
  39  |   const token = await loginForToken(request);
  40  |   console.log(`✅ Authenticated`);
  41  | 
  42  |   const now = new Date();
  43  |   const day1 = plusDays(now, 4);
  44  |   const day4 = plusDays(now, 7);
  45  | 
  46  |   // Step 1: Create itinerary with 2 rooms, 2 adults + 1 child
  47  |   console.log('\n📝 Step 1: Create Itinerary (2 rooms, 2 adults + 1 child)');
  48  |   const createRes = await request.post(`${API_BASE_URL}/itineraries`, {
  49  |     data: {
  50  |       itinerary_name: 'E2E Multi-room Test',
  51  |       trip_type: 'multi-day',
  52  |       country_id: 1,
  53  |       state_id: 1,
  54  |       number_of_days: 4,
  55  |       number_of_room: 2,
  56  |       number_of_adult: 2,
  57  |       number_of_child: 1,
  58  |       days: [
  59  |         { day_number: 1, date: formatYmd(day1) },
  60  |         { day_number: 2, date: formatYmd(plusDays(now, 5)) },
  61  |         { day_number: 3, date: formatYmd(plusDays(now, 6)) },
  62  |         { day_number: 4, date: formatYmd(day4) },
  63  |       ],
  64  |     },
  65  |     headers: { Authorization: `Bearer ${token}` },
  66  |   });
  67  | 
  68  |   if (!createRes.ok()) {
  69  |     const body = await createRes.text();
  70  |     console.error(`Create failed (${createRes.status()}): ${body}`);
> 71  |     throw new Error(`Create failed: ${createRes.status()}`);
      |           ^ Error: Create failed: 400
  72  |   }
  73  | 
  74  |   const createJson = await createRes.json();
  75  |   const quoteId = createJson?.quoteId;
  76  |   const planId = createJson?.planId;
  77  |   console.log(`✅ Created: Quote=${quoteId}, Plan=${planId}`);
  78  | 
  79  |   // Step 2: Search for hotels (multi-room, multi-pax with child)
  80  |   console.log('\n🔍 Step 2: Search Hotels (Multi-room & Multi-pax)');
  81  |   const searchPayload = {
  82  |     quote_id: quoteId,
  83  |    plan_id: planId,
  84  |     roomCount: 2,
  85  |     guestCount: 3, // 2 adults + 1 child
  86  |     checkInDate: formatYmd(day1),
  87  |     checkOutDate: formatYmd(day4),
  88  |     guestNationality: 'IN',
  89  |     travelDate: formatYmd(day1),
  90  |     cityId: 1,
  91  |   };
  92  |   
  93  |   console.log(`📤 SEARCH REQUEST:`, searchPayload);
  94  | 
  95  |   const searchRes = await request.post(`${API_BASE_URL}/hotels/search`, {
  96  |     data: searchPayload,
  97  |     headers: { Authorization: `Bearer ${token}` },
  98  |   });
  99  | 
  100 |   if (!searchRes.ok()) {
  101 |     const body = await searchRes.text();
  102 |     console.error(`Search failed (${searchRes.status()}): ${body}`);
  103 |     throw new Error(`Search failed: ${searchRes.status()}`);
  104 |   }
  105 | 
  106 |   const searchJson = await searchRes.json();
  107 |   console.log(`📥 SEARCH RESPONSE: ${searchJson?.data?.length || 0} hotels found`);
  108 |   expect(searchJson?.data?.length).toBeGreaterThan(0);
  109 | 
  110 |   // Step 3: Prebook with child details in occupancies and passengers
  111 |   console.log('\n📋 Step 3: Prebook Hotel (with child info)');
  112 |   const hotelId = searchJson?.data?.[0]?.hotel_id;
  113 |   const rateId = searchJson?.data?.[0]?.rooms?.[0]?.rate_id;
  114 |   
  115 |   const prebookPayload = {
  116 |     quote_id: quoteId,
  117 |     plan_id: planId,
  118 |     hotel_id: hotelId,
  119 |     hotel_bookings: [
  120 |       {
  121 |         room_id: 1,
  122 |         occupancies: [
  123 |           { adults: 2, children: 1, child_age: [7] },
  124 |         ],
  125 |         passengers: [
  126 |           { pax_type: 1, name: 'Adult 1', age: 34, nationality: 'IN' },
  127 |           { pax_type: 1, name: 'Adult 2', age: 32, nationality: 'IN' },
  128 |           { pax_type: 2, name: 'Child 1', age: 7, nationality: 'IN' },
  129 |         ],
  130 |         rate_id: rateId,
  131 |         check_in: formatYmd(day1),
  132 |         check_out: formatYmd(day4),
  133 |       },
  134 |       {
  135 |         room_id: 2,
  136 |         occupancies: [
  137 |           { adults: 0, children: 0 },
  138 |         ],
  139 |         passengers: [],
  140 |         rate_id: rateId,
  141 |         check_in: formatYmd(day1),
  142 |         check_out: formatYmd(day4),
  143 |       },
  144 |     ],
  145 |   };
  146 |   
  147 |   console.log(`📤 PREBOOK REQUEST:`, JSON.stringify(prebookPayload, null, 2));
  148 | 
  149 |   const prebookRes = await request.post(`${API_BASE_URL}/hotels/prebook`, {
  150 |     data: prebookPayload,
  151 |     headers: { Authorization: `Bearer ${token}` },
  152 |   });
  153 | 
  154 |   if (!prebookRes.ok()) {
  155 |     const body = await prebookRes.text();
  156 |     console.error(`Prebook failed (${prebookRes.status()}): ${body}`);
  157 |     throw new Error(`Prebook failed: ${prebookRes.status()}`);
  158 |   }
  159 | 
  160 |   const prebookJson = await prebookRes.json();
  161 |   console.log(`📥 PREBOOK RESPONSE:`, {
  162 |     total: prebookJson?.quote?.total,
  163 |     currency: prebookJson?.quote?.currency,
  164 |     rooms: prebookJson?.hotel_bookings?.length,
  165 |   });
  166 | 
  167 |   // Step 4: Confirm quotation with child details
  168 |   console.log('\n✍️ Step 4: Confirm Quotation (with child details)');
  169 |   const confirmPayload = {
  170 |     quote_id: quoteId,
  171 |     plan_id: planId,
```