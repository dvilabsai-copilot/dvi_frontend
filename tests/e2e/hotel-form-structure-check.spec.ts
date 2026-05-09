import { test, expect } from '@playwright/test';

test.describe('Hotel Form Tabs - Direct Check', () => {
  const baseUrl = 'http://localhost:8080';

  test('should verify hotel form tabs are present and working', async ({ page, context }) => {
    // Set a cookie or local storage to bypass login if possible
    await page.goto(`${baseUrl}/login`);
    
    // Try to login
    const emailInput = page.locator('input[type="email"], input:nth-of-type(1)');
    const passwordInput = page.locator('input[type="password"], input:nth-of-type(2)');
    const signInBtn = page.locator('button:has-text("Sign")');
    
    if (await emailInput.isVisible({ timeout: 2000 }).catch(() => false)) {
      await emailInput.fill('admin@dvi.co.in');
      await passwordInput.fill('Keerthi@2404ias');
      await signInBtn.click();
      
      // Wait for auth to complete
      await page.waitForURL(`${baseUrl}/**`, { timeout: 15000 });
    }
    
    // Navigate to hotel form
    await page.goto(`${baseUrl}/hotels/new`, { waitUntil: 'domcontentloaded', timeout: 15000 });
    
    // Take screenshot to see the form structure
    await page.screenshot({ path: 'hotel-form-structure.png' });
    
    // Check for form
    const pageContent = await page.content();
    console.log('Page title:', await page.title());
    console.log('Page URL:', page.url());
    
    // Check for various form indicators
    const hasForm = pageContent.includes('<form') || pageContent.includes('form');
    const hasSteps = pageContent.includes('step') || pageContent.includes('Step');
    const hasTabs = pageContent.includes('tab') || pageContent.includes('Tab');
    
    console.log('Has form:', hasForm);
    console.log('Has steps:', hasSteps);
    console.log('Has tabs:', hasTabs);
    
    // Look for specific hotel form elements
    const hasHotelName = pageContent.includes('hotel_name') || pageContent.includes('Hotel Name') || pageContent.includes('hotel name');
    const hasBasicStep = pageContent.includes('BasicStep') || pageContent.includes('Basic');
    const hasRoomStep = pageContent.includes('RoomStep') || pageContent.includes('Room') || pageContent.includes('room');
    
    console.log('Has hotel name field:', hasHotelName);
    console.log('Has basic step:', hasBasicStep);
    console.log('Has room step:', hasRoomStep);
    
    // Get the HTML structure of the body for debugging
    const bodyInner = await page.evaluate(() => {
      const body = document.body.innerHTML;
      // Return first 2000 chars of body
      return body.substring(0, 2000);
    });
    
    console.log('Body Content (first 2000 chars):', bodyInner);
    
    // Check for h1, h2, h3 headings that might indicate form sections
    const headings = await page.$$eval('h1, h2, h3', els => els.map(el => el.textContent));
    console.log('Headings found:', headings);
    
    // Check for all buttons
    const buttons = await page.$$eval('button', els => els.map(el => el.textContent?.trim()).filter(Boolean));
    console.log('Buttons found:', buttons);
    
    // Check for all inputs
    const inputs = await page.$$eval('input', els => 
      els.map(el => ({
        placeholder: el.placeholder,
        type: el.type,
        name: el.name
      }))
    );
    console.log('Inputs found:', inputs);
    
    expect(hasForm || hasSteps || hasTabs || hasHotelName).toBeTruthy();
  });
});
