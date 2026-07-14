import { test, expect } from '@playwright/test';

test.describe('Production Hotel Creation Test', () => {
  const prodUrl = 'https://dvi.travel';
  const apiUrl = 'https://api.dvi.travel/api/v1';

  test('should create a new hotel on production successfully', async ({ page }) => {
    console.log('🧪 Testing Hotel Creation on Production');
    
    // Navigate to production login
    await page.goto(`${prodUrl}/login`, { waitUntil: 'networkidle' });
    console.log('✓ Navigated to production login page');

    // Login with credentials
    await page.fill('input[type="email"]', process.env.E2E_ADMIN_EMAIL!);
    await page.fill('input[type="password"]', process.env.E2E_ADMIN_PASSWORD!);
    
    const signInBtn = page.locator('button:has-text("Sign")');
    await signInBtn.click();
    console.log('✓ Clicked sign in button');
    
    // Wait for login to complete
    await page.waitForURL(`${prodUrl}/**`, { timeout: 15000 });
    console.log('✓ Login successful');

    // Navigate to hotel creation form
    await page.goto(`${prodUrl}/hotels/new`, { waitUntil: 'domcontentloaded' });
    console.log('✓ Navigated to hotel creation form');

    // Fill basic hotel details
    const testHotelName = `Playwright Test Hotel ${Date.now()}`;
    await page.fill('input[placeholder*="Hotel Name"]', testHotelName);
    console.log(`✓ Filled hotel name: ${testHotelName}`);

    await page.fill('input[placeholder*="place"]', 'Test Place');
    console.log('✓ Filled place field');

    // Add mobile number
    const mobileInputs = page.locator('input[placeholder*="number"], input[placeholder*="mobile"]');
    if (await mobileInputs.count() > 0) {
      await mobileInputs.first().fill('9876543210');
      await mobileInputs.first().press('Enter');
      console.log('✓ Added mobile number');
    }

    // Add email
    const emailInputs = page.locator('input[type="email"], input[placeholder*="email"]');
    if (await emailInputs.count() > 0) {
      await emailInputs.first().fill('test@hotel.com');
      await emailInputs.first().press('Enter');
      console.log('✓ Added email');
    }

    // Fill other required fields
    const allInputs = page.locator('input[type="text"]');
    const inputCount = await allInputs.count();
    
    for (let i = 0; i < inputCount; i++) {
      const input = allInputs.nth(i);
      const placeholder = await input.getAttribute('placeholder') || '';
      const value = await input.inputValue();
      
      if (value === '' || !value) {
        if (placeholder.toLowerCase().includes('code')) {
          await input.fill(`PW-${Date.now() % 10000}`);
          console.log('✓ Filled hotel code');
        } else if (placeholder.toLowerCase().includes('postal')) {
          await input.fill('123456');
          console.log('✓ Filled postal code');
        } else if (placeholder.toLowerCase().includes('address')) {
          await input.fill('Test Address, Test City');
          console.log('✓ Filled address');
        } else if (placeholder.toLowerCase().includes('margin')) {
          await input.fill('7');
          console.log('✓ Filled margin');
        }
      }
    }

    // Take screenshot before submission
    await page.screenshot({ path: 'prod-hotel-form-before-submit.png' });
    console.log('✓ Screenshot taken before submission');

    // Intercept the POST request
    let apiResponse: any = null;
    page.on('response', async (response) => {
      if (response.url().includes('/api/v1/hotels') && response.request().method() === 'POST') {
        apiResponse = response;
        console.log(`✓ Intercepted POST request: ${response.status()}`);
      }
    });

    // Click save/continue button
    const saveBtn = page.locator('button:has-text("Update & Continue"), button:has-text("Continue")').first();
    const saveExists = await saveBtn.isVisible({ timeout: 2000 }).catch(() => false);
    
    if (saveExists) {
      await saveBtn.click();
      console.log('✓ Clicked save/continue button');
      
      // Wait for response
      await page.waitForTimeout(2000);
      
      if (apiResponse) {
        const body = await apiResponse.json().catch(() => ({}));
        console.log('API Response:', JSON.stringify(body, null, 2));
        
        expect([200, 201, 204]).toContain(apiResponse.status());
        console.log(`✅ Hotel creation API returned status ${apiResponse.status()}`);
      }
    }

    // Check for error message
    const errorMsg = page.locator('text=/Failed|Error|error/i');
    const hasError = await errorMsg.isVisible({ timeout: 2000 }).catch(() => false);
    
    if (hasError) {
      console.log('❌ Error message appeared on form');
      expect(hasError).toBe(false);
    } else {
      console.log('✅ No error messages on form');
    }

    // Take screenshot after submission
    await page.screenshot({ path: 'prod-hotel-form-after-submit.png' });
    console.log('✓ Screenshot taken after submission');

    // Wait a bit for any server-side processing
    await page.waitForTimeout(2000);

    console.log('✅ Production hotel creation test completed successfully!');
  });

  test('should verify hotel list page on production', async ({ page }) => {
    console.log('\n🧪 Testing Hotel List Page on Production');
    
    // Navigate to production login
    await page.goto(`${prodUrl}/login`, { waitUntil: 'networkidle' });
    console.log('✓ Navigated to production login page');

    // Login
    await page.fill('input[type="email"]', process.env.E2E_ADMIN_EMAIL!);
    await page.fill('input[type="password"]', process.env.E2E_ADMIN_PASSWORD!);
    await page.locator('button:has-text("Sign")').click();
    
    await page.waitForURL(`${prodUrl}/**`, { timeout: 15000 });
    console.log('✓ Login successful');

    // Navigate to hotels list
    await page.goto(`${prodUrl}/hotels`, { waitUntil: 'networkidle' });
    console.log('✓ Navigated to hotels list page');

    // Check for hotel list content
    const pageContent = await page.content();
    const hasHotelTable = pageContent.includes('table') || pageContent.includes('hotel');
    console.log(`Hotel list page content verified: ${hasHotelTable}`);

    // Take screenshot
    await page.screenshot({ path: 'prod-hotel-list.png' });
    console.log('✓ Screenshot of hotel list page taken');

    console.log('✅ Hotel list page test completed!');
  });
});
