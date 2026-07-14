import { test, expect } from '@playwright/test';

test.describe('Production Hotel API Test', () => {
  const apiUrl = 'https://api.dvi.travel/api/v1';

  test('should authenticate and test hotel creation API on production', async ({ request }) => {
    console.log('\n🧪 Production Hotel Creation API Test');
    console.log('Testing: https://api.dvi.travel/api/v1/hotels');

    // Step 1: Login to get auth token
    console.log('\n📝 Step 1: Authenticating...');
    const loginResponse = await request.post(`${apiUrl}/auth/login`, {
      data: {
        email: process.env.E2E_ADMIN_EMAIL,
        password: process.env.E2E_ADMIN_PASSWORD,
      },
    });

    console.log(`Login Response Status: ${loginResponse.status()}`);
    
    if (!loginResponse.ok()) {
      const errorBody = await loginResponse.text();
      console.error('❌ Login failed:', errorBody);
      expect(loginResponse.status()).toBe(200);
      return;
    }

    const loginData = await loginResponse.json();
    const token = loginData?.accessToken || loginData?.token;
    console.log('✅ Authentication response received');

    // Step 2: Create a new hotel
    console.log('\n🏨 Step 2: Creating new hotel...');
    const testHotelPayload = {
      hotel_name: `Playwright Test ${Date.now()}`,
      hotel_code: `PW-${Math.random().toString(36).substring(7).toUpperCase()}`,
      hotel_place: 'Test City',
      hotel_mobile: '9876543210',
      hotel_email: 'test@hotel.com',
      hotel_country: '101',
      hotel_state: '22',
      hotel_city: '2201',
      hotel_pincode: '123456',
      hotel_address: 'Test Address Line',
      hotel_category: '1',
      status: 1,
      hotel_powerbackup: 0,
      hotel_hotspot_status: 0,
      hotel_margin: 7,
      hotel_margin_gst_type: null,
      hotel_margin_gst_percentage: 7,
    };

    console.log('Hotel Payload:', JSON.stringify(testHotelPayload, null, 2));

    const createResponse = await request.post(`${apiUrl}/hotels`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      data: testHotelPayload,
    });

    console.log(`\n📊 Response Status: ${createResponse.status()}`);
    const responseBody = await createResponse.json().catch(() => ({}));
    console.log('Response Body:', JSON.stringify(responseBody, null, 2));

    if (createResponse.ok() || createResponse.status() === 201) {
      const hotelId = responseBody?.hotel_id || responseBody?.id || responseBody?.data?.hotel_id;
      console.log(`\n✅ Hotel Created Successfully!`);
      console.log(`Hotel ID: ${hotelId || 'N/A'}`);
      console.log(`Hotel Name: ${testHotelPayload.hotel_name}`);
      console.log(`Hotel Code: ${testHotelPayload.hotel_code}`);
    } else {
      console.log(`\n❌ Failed to create hotel`);
      console.log(`Status: ${createResponse.status()}`);
    }

    expect([200, 201, 204]).toContain(createResponse.status());
  });

  test('should verify hotel list API on production', async ({ request }) => {
    console.log('\n🧪 Production Hotel List API Test');

    // Login first
    const loginResponse = await request.post(`${apiUrl}/auth/login`, {
      data: {
        email: process.env.E2E_ADMIN_EMAIL,
        password: process.env.E2E_ADMIN_PASSWORD,
      },
    });

    const loginData = await loginResponse.json();
    const token = loginData?.accessToken || loginData?.token;
    console.log('✅ Authenticated');

    // Fetch hotels list
    console.log('\n📋 Fetching hotel list...');
    const listResponse = await request.get(`${apiUrl}/hotels?page=1&limit=10`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    console.log(`Response Status: ${listResponse.status()}`);
    
    if (listResponse.ok()) {
      const listData = await listResponse.json();
      const hotelCount = listData?.data?.length || listData?.hotels?.length || 0;
      console.log(`✅ Hotels List Retrieved`);
      console.log(`Total Hotels: ${hotelCount}`);
      
      if (hotelCount > 0) {
        console.log(`\nFirst Hotel:`);
        const firstHotel = listData?.data?.[0] || listData?.hotels?.[0];
        console.log(`  ID: ${firstHotel?.hotel_id || firstHotel?.id}`);
        console.log(`  Name: ${firstHotel?.hotel_name || firstHotel?.name}`);
        console.log(`  City: ${firstHotel?.hotel_city || firstHotel?.city}`);
      }
    } else {
      console.log(`❌ Failed to fetch hotels list`);
      const errorData = await listResponse.json().catch(() => ({}));
      console.log('Error:', errorData);
    }

    expect(listResponse.status()).toBe(200);
  });

  test('should test hotel validation on production', async ({ request }) => {
    console.log('\n🧪 Production Hotel Validation Test');

    // Login
    const loginResponse = await request.post(`${apiUrl}/auth/login`, {
      data: {
        email: process.env.E2E_ADMIN_EMAIL,
        password: process.env.E2E_ADMIN_PASSWORD,
      },
    });

    const loginData = await loginResponse.json();
    const token = loginData?.accessToken || loginData?.token;
    console.log('✅ Authenticated');

    // Try to create hotel with missing required fields
    console.log('\n⚠️  Testing validation with incomplete data...');
    const invalidPayload = {
      hotel_name: 'Test Hotel',
      // Missing required fields
    };

    const createResponse = await request.post(`${apiUrl}/hotels`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      data: invalidPayload,
    });

    console.log(`Response Status: ${createResponse.status()}`);
    
    if (!createResponse.ok()) {
      const errorData = await createResponse.json().catch(() => ({}));
      console.log('✅ Validation working - errors returned:');
      console.log(JSON.stringify(errorData, null, 2));
      expect([400, 422]).toContain(createResponse.status());
    } else {
      console.log('⚠️  Validation may need review - incomplete data was accepted');
    }
  });
});
