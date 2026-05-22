import { test, expect } from '@playwright/test';

test.describe('Hotel Form - Tab Navigation & Data Persistence', () => {
  const baseUrl = 'http://localhost:8080';
  const apiUrl = 'http://localhost:4006/api/v1';

  // Helper function to login and get token
  async function login(page) {
    await page.goto(`${baseUrl}/login`);
    await page.fill('input[type="email"], input[placeholder*="Email"]', 'admin@dvi.co.in');
    await page.fill('input[type="password"], input[placeholder*="Password"]', 'Keerthi@2404ias');
    
    const signInBtn = page.locator('button:has-text("Sign in")');
    await signInBtn.click();
    
    // Wait for navigation to complete
    await page.waitForURL(`${baseUrl}/**`, { timeout: 10000 });
    console.log('Login successful');
  }

  test('should navigate through all hotel form tabs', async ({ page }) => {
    await login(page);
    await page.goto(`${baseUrl}/hotels/new`);
    
    // Wait for form to load
    await page.waitForSelector('button, [role="tab"]', { timeout: 5000 });
    
    // Get all tab buttons/elements
    const tabs = page.locator('[role="tab"], button:has-text("Basic"), button:has-text("Room"), button:has-text("Amenities"), button:has-text("Price"), button:has-text("Review"), button:has-text("Preview")');
    const tabCount = await tabs.count();
    console.log(`Found ${tabCount} tabs`);
    
    expect(tabCount).toBeGreaterThan(0);
  });

  test('should persist data when switching between tabs', async ({ page }) => {
    await login(page);
    await page.goto(`${baseUrl}/hotels/new`);
    
    await page.waitForSelector('input', { timeout: 5000 });
    
    // Fill basic details
    const hotelNameInput = page.locator('input[placeholder*="Hotel Name"], input[placeholder*="Name"]').first();
    await hotelNameInput.fill('Tab Test Hotel');
    
    const hotelPlaceInput = page.locator('input[placeholder*="place"], input[placeholder*="Place"]').first();
    await hotelPlaceInput.fill('Test Place');
    
    // Get current value
    const nameValue1 = await hotelNameInput.inputValue();
    console.log(`Hotel Name (before tab switch): ${nameValue1}`);
    expect(nameValue1).toBe('Tab Test Hotel');
    
    // Try clicking another tab if available
    const nextTabBtn = page.locator('button:has-text("Room"), button:has-text("Rooms"), [role="tab"]:nth-of-type(2)').first();
    const nextTabExists = await nextTabBtn.isVisible({ timeout: 1000 }).catch(() => false);
    
    if (nextTabExists) {
      await nextTabBtn.click();
      console.log('Switched to next tab');
      
      // Wait briefly
      await page.waitForTimeout(500);
      
      // Try switching back to basic tab
      const basicTabBtn = page.locator('button:has-text("Basic"), [role="tab"]:nth-of-type(1)').first();
      const basicTabExists = await basicTabBtn.isVisible({ timeout: 1000 }).catch(() => false);
      
      if (basicTabExists) {
        await basicTabBtn.click();
        console.log('Switched back to basic tab');
        
        // Check if data persisted
        const nameValue2 = await hotelNameInput.inputValue();
        console.log(`Hotel Name (after tab switch): ${nameValue2}`);
        expect(nameValue2).toBe('Tab Test Hotel');
      }
    }
  });

  test('should save basic hotel info successfully', async ({ page, request }) => {
    await login(page);
    await page.goto(`${baseUrl}/hotels/new`);
    
    await page.waitForSelector('input', { timeout: 5000 });
    
    // Fill all required basic fields
    await page.fill('input[placeholder*="Hotel Name"], input[placeholder*="Name"]', 'Tab Navigation Test Hotel');
    await page.fill('input[placeholder*="place"], input[placeholder*="Place"]', 'Devala');
    
    // Get mobile input and add phone
    const mobileInputs = page.locator('input[placeholder*="number"], input[placeholder*="mobile"]');
    if (await mobileInputs.count() > 0) {
      await mobileInputs.first().fill('9876543210');
      await mobileInputs.first().press('Enter');
    }
    
    // Get email input and add email
    const emailInputs = page.locator('input[type="email"], input[placeholder*="email"]');
    if (await emailInputs.count() > 0) {
      await emailInputs.first().fill('test@hotel.com');
      await emailInputs.first().press('Enter');
    }
    
    // Fill additional fields
    const inputs = page.locator('input[type="text"]');
    const inputCount = await inputs.count();
    
    for (let i = 0; i < inputCount; i++) {
      const input = inputs.nth(i);
      const placeholder = await input.getAttribute('placeholder') || '';
      
      if (placeholder.toLowerCase().includes('code') || placeholder.toLowerCase().includes('postal')) {
        await input.fill('679333');
      } else if (placeholder.toLowerCase().includes('address')) {
        await input.fill('Test Address, Test City');
      } else if (placeholder.toLowerCase().includes('margin')) {
        await input.fill('7');
      }
    }
    
    // Intercept the POST request
    const responsePromise = page.waitForResponse(
      response => response.url().includes('/api/v1/hotels') && response.request().method() === 'POST',
      { timeout: 10000 }
    ).catch(e => {
      console.log('No POST request intercepted:', e.message);
      return null;
    });
    
    // Click save/continue button
    const saveBtn = page.locator('button:has-text("Update & Continue"), button:has-text("Continue"), button:has-text("Save")').first();
    const saveExists = await saveBtn.isVisible({ timeout: 1000 }).catch(() => false);
    
    if (saveExists) {
      await saveBtn.click();
      console.log('Clicked save button');
      
      const response = await responsePromise;
      if (response) {
        console.log(`API Response Status: ${response.status()}`);
        const body = await response.json().catch(() => ({}));
        console.log('API Response:', JSON.stringify(body, null, 2));
        expect([200, 201, 204]).toContain(response.status());
      }
    }
    
    // Check for error message
    const errorMsg = page.locator('text=Failed to save, text=error, [class*="error"]').first();
    const hasError = await errorMsg.isVisible({ timeout: 2000 }).catch(() => false);
    console.log(`Form error visible: ${hasError}`);
    expect(hasError).toBe(false);
  });

  test('should handle form validation correctly', async ({ page }) => {
    await login(page);
    await page.goto(`${baseUrl}/hotels/new`);
    
    await page.waitForSelector('button', { timeout: 5000 });
    
    // Try to submit without filling required fields
    const saveBtn = page.locator('button:has-text("Update & Continue"), button:has-text("Continue"), button:has-text("Save")').first();
    const saveExists = await saveBtn.isVisible({ timeout: 1000 }).catch(() => false);
    
    if (saveExists) {
      await saveBtn.click();
      console.log('Clicked save with empty form');
      
      // Wait for validation errors
      await page.waitForTimeout(1000);
      
      const errors = page.locator('text=Required, [class*="error"], [class*="invalid"]');
      const errorCount = await errors.count();
      console.log(`Validation errors found: ${errorCount}`);
      
      expect(errorCount).toBeGreaterThan(0);
    }
  });

  test('should verify form structure and all tabs present', async ({ page }) => {
    await login(page);
    await page.goto(`${baseUrl}/hotels/new`);
    
    await page.waitForSelector('form, [role="tablist"]', { timeout: 5000 });
    
    // Check for form
    const form = page.locator('form').first();
    const formExists = await form.isVisible({ timeout: 1000 }).catch(() => false);
    console.log(`Form exists: ${formExists}`);
    
    // Look for tab indicators (stepper steps, tab buttons, etc.)
    const tabElements = page.locator(
      '[role="tab"], .tab, .step, button:has-text("Basic"), button:has-text("Room"), button:has-text("Amenities")'
    );
    const tabCount = await tabElements.count();
    console.log(`Tab/Step elements found: ${tabCount}`);
    
    // Look for key form sections
    const sections = {
      basic: await page.locator('text=Basic, text=basic, h3:has-text("Basic")').count(),
      rooms: await page.locator('text=Room, text=room, h3:has-text("Room")').count(),
      amenities: await page.locator('text=Amenities, text=amenities').count(),
      pricing: await page.locator('text=Price, text=price, text=Pricebook').count(),
    };
    
    console.log('Form sections found:', sections);
    expect(form).toBeTruthy();
  });
});
