# Nationality Dropdown & Booking Flow E2E Test

## Overview
This Playwright E2E test suite validates the nationality dropdown functionality and full booking flow with international guests (specifically UAE/United Arab Emirates).

**Test File:** [`tests/e2e/nationality-booking-flow.spec.ts`](tests/e2e/nationality-booking-flow.spec.ts)

## What Gets Tested

| Test | Purpose |
|------|---------|
| **Test 1** | Search "arab" in nationality dropdown → finds UAE |
| **Test 2** | Select UAE nationality and verify it persists |
| **Test 3** | Multi-word search "emirates" finds UAE |
| **Test 4** | Create itinerary form with UAE nationality selected |
| **Test 5** | Full booking flow: Select UAE → Set dates → Search hotels |
| **Test 6** | Verify UAE nationality persists through form interactions |

## Quick Start

### 1. Prerequisites
```bash
cd dvi_frontend

# Make sure dependencies are installed
npm install

# Make sure Playwright browsers are installed
npx playwright install chromium
```

### 2. Run All Tests
```bash
npm run e2e
```

### 3. Run Tests in Headed Mode (see browser)
```bash
npm run e2e:headed
```

### 4. Run Only This Test File
```bash
npx playwright test tests/e2e/nationality-booking-flow.spec.ts
```

### 5. Run Specific Test by Name
```bash
# Test 1: Search "arab" finds UAE
npx playwright test nationality-booking-flow -g "search \"arab\" finds UAE"

# Test 5: Full booking flow
npx playwright test nationality-booking-flow -g "Full booking flow"
```

### 6. Run in Debug Mode
```bash
npx playwright test tests/e2e/nationality-booking-flow.spec.ts --debug
```

## Configuration

### Base URL
By default, tests run against: `http://localhost:8080`

To run against production:
```bash
E2E_BASE_URL=https://dvi.travel npm run e2e
```

### Credentials
Tests use these environment variables for login:
- `PROD_EMAIL` (default: `admin@dvi.co.in`)
- `PROD_PASSWORD` (default: `Keerthi@2404ias`)

To use different credentials:
```bash
PROD_EMAIL=your@email.com PROD_PASSWORD=yourpassword npm run e2e
```

## Output & Reports

### Screenshot (On Failure)
- **Location:** `playwright-report/`
- Screenshots are captured automatically on test failure

### Screenshot (On Success - Test 5)
- **Location:** `nationality-booking-flow-screenshot.png`
- Captured after full booking flow completes

### HTML Report
```bash
npm run e2e
# Then view report
npx playwright show-report
```

### Videos 
Created on failure, stored in `playwright-report/` folder

## Expected Results

### ✅ All Tests Pass When:
1. ✅ Nationality dropdown search works with multi-word queries
2. ✅ UAE can be selected from dropdown
3. ✅ UAE nationality persists in form
4. ✅ Hotel search includes UAE guests
5. ✅ Booking flow completes without errors

### ❌ Tests Fail When:
1. ❌ Search "arab" returns no results
2. ❌ UAE option not clickable
3. ❌ Nationality reverts after selection
4. ❌ Hotel search page doesn't load
5. ❌ Dropdown selector structure changed

## Troubleshooting

### Test Timeout Issues
If tests timeout, increase wait times or debugLocator elements:
```typescript
// In test file, find the problematic line and add:
page.locator('selector').isVisible({ timeout: 10000 })
```

### Selector Not Found
If selectors fail, use Playwright Inspector:
```bash
PWDEBUG=1 npm run e2e
```

This opens an interactive debugger where you can:
- Inspect page elements
- Test selectors in real-time
- Step through test execution

### Login Issues
If login fails:
1. Verify credentials are correct
2. Check if login page URL changed
3. Increase `waitForURL` timeout
4. Check for 2FA or captcha

## CI/CD Integration

For GitHub Actions or similar CI:

```yaml
- name: Install dependencies
  run: npm install

- name: Install Playwright browsers
  run: npx playwright install chromium

- name: Run E2E tests
  run: npm run e2e
  env:
    E2E_BASE_URL: https://dvi.travel
    PROD_EMAIL: ${{ secrets.PROD_EMAIL }}
    PROD_PASSWORD: ${{ secrets.PROD_PASSWORD }}

- name: Upload report on failure
  if: failure()
  uses: actions/upload-artifact@v3
  with:
    name: playwright-report
    path: playwright-report/
```

## Customization

### Add More Tests
Add new test cases to the file:
```typescript
test('Test 7: Your new test', async ({ page }) => {
  // Your test code
});
```

### Change Search Terms
Search for different nationalities:
```typescript
// Instead of 'arab', use other search terms:
const searchInput = page.locator('input[placeholder*="Search" i], input[type="text"]').first();
await searchInput.fill('united'); // Find all "United" countries
await searchInput.fill('states'); // Find "United States"
```

### Modify Dates
Change the date offset:
```typescript
const startDate = new Date();
startDate.setDate(startDate.getDate() + 10); // Change from 5 to 10 days
```

## Performance Notes

- **Average Runtime:** ~30-45 seconds per test (6 tests = 3-5 minutes total)
- **Parallel:** Tests run sequentially by default (`fullyParallel: false`)
- **Retries:** 1 retry on CI, 0 on local

## Related Files

- **Frontend Component:** [`src/components/AutoSuggestSelect.tsx`](../src/components/AutoSuggestSelect.tsx)
- **Playwright Config:** [`playwright.config.ts`](../../playwright.config.ts)
- **E2E Utils:** [`tests/e2e/booking-engine-test-utils.ts`](booking-engine-test-utils.ts)

---

**Last Updated:** April 29, 2026  
**Created For:** Testing UAE (United Arab Emirates) nationality selection in create-itinerary flow
