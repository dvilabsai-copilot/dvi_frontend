# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: razorpay-local-sandbox.spec.ts >> Razorpay sandbox local e2e >> wallet top-up checkout and confirmation
- Location: tests\e2e\razorpay-local-sandbox.spec.ts:72:3

# Error details

```
Test timeout of 240000ms exceeded.
```

```
Error: locator.fill: Test timeout of 240000ms exceeded.
Call log:
  - waiting for locator('input[type="email"], input[name="email"]').first()

```

# Page snapshot

```yaml
- generic [ref=e2]:
  - region "Notifications (F8)":
    - list
  - region "Notifications alt+T"
  - generic [ref=e5]:
    - heading "Sign in" [level=1] [ref=e6]
    - generic [ref=e7]:
      - generic [ref=e8]:
        - generic [ref=e9]: Email
        - textbox [ref=e10]
      - generic [ref=e11]:
        - generic [ref=e12]: Password
        - textbox [ref=e13]
      - button "Sign in" [ref=e14] [cursor=pointer]
```

# Test source

```ts
  1   | import { expect, test, type Page } from '@playwright/test';
  2   | 
  3   | const USER_EMAIL = process.env.E2E_AGENT_USER ?? 'demo@dvi.co.in';
  4   | const USER_PASSWORD = process.env.E2E_AGENT_PASSWORD ?? 'Agent@12345';
  5   | const TOPUP_AMOUNT = process.env.E2E_RAZORPAY_TOPUP_AMOUNT ?? '1';
  6   | 
  7   | async function maybeLogin(page: Page): Promise<void> {
  8   |   const signInHeading = page.getByRole('heading', { name: /sign\s*in/i }).first();
  9   | 
  10  |   if ((await signInHeading.count()) === 0) return;
  11  | 
  12  |   const emailInput = page.locator('input[type="email"], input[name="email"]').first();
  13  |   const passwordInput = page.locator('input[type="password"], input[name="password"]').first();
  14  | 
> 15  |   await emailInput.fill(USER_EMAIL);
      |                    ^ Error: locator.fill: Test timeout of 240000ms exceeded.
  16  |   await passwordInput.fill(USER_PASSWORD);
  17  | 
  18  |   await page.getByRole('button', { name: /sign\s*in|login|log\s*in/i }).first().click();
  19  |   await page.waitForLoadState('networkidle');
  20  | }
  21  | 
  22  | async function completeRazorpaySandboxPayment(page: Page): Promise<void> {
  23  |   // Razorpay checkout renders inside an iframe overlay.
  24  |   const checkoutFrame = page.frameLocator('iframe[src*="razorpay.com"]');
  25  |   await expect(page.locator('iframe[src*="razorpay.com"]').first()).toBeVisible({ timeout: 30000 });
  26  | 
  27  |   const cardTab = checkoutFrame.getByText(/card/i).first();
  28  |   if (await cardTab.isVisible().catch(() => false)) {
  29  |     await cardTab.click();
  30  |   }
  31  | 
  32  |   const cardNumber = checkoutFrame
  33  |     .locator('input[name="card[number]"], input[autocomplete="cc-number"], input[placeholder*="Card number" i]')
  34  |     .first();
  35  |   await cardNumber.fill('4111 1111 1111 1111');
  36  | 
  37  |   const expiry = checkoutFrame
  38  |     .locator('input[name="card[expiry]"], input[autocomplete="cc-exp"], input[placeholder*="MM" i]')
  39  |     .first();
  40  |   await expiry.fill('12/30');
  41  | 
  42  |   const cvv = checkoutFrame
  43  |     .locator('input[name="card[cvv]"], input[autocomplete="cc-csc"], input[placeholder*="CVV" i]')
  44  |     .first();
  45  |   await cvv.fill('123');
  46  | 
  47  |   const holder = checkoutFrame
  48  |     .locator('input[name="card[name]"], input[placeholder*="name on card" i]')
  49  |     .first();
  50  |   if (await holder.isVisible().catch(() => false)) {
  51  |     await holder.fill('Playwright Agent');
  52  |   }
  53  | 
  54  |   await checkoutFrame
  55  |     .getByRole('button', { name: /pay|proceed|submit/i })
  56  |     .first()
  57  |     .click();
  58  | 
  59  |   // Some test flows ask for OTP in the same frame.
  60  |   const otpInput = checkoutFrame
  61  |     .locator('input[type="tel"], input[name="otp"], input[placeholder*="otp" i]')
  62  |     .first();
  63  |   if (await otpInput.isVisible().catch(() => false)) {
  64  |     await otpInput.fill('111111');
  65  |     await checkoutFrame.getByRole('button', { name: /submit|verify|continue/i }).first().click();
  66  |   }
  67  | }
  68  | 
  69  | test.describe('Razorpay sandbox local e2e', () => {
  70  |   test.setTimeout(240000);
  71  | 
  72  |   test('wallet top-up checkout and confirmation', async ({ page, baseURL }) => {
  73  |     await page.goto(`${baseURL}/wallet-history`, { waitUntil: 'domcontentloaded' });
  74  |     await maybeLogin(page);
  75  | 
  76  |     if (!page.url().includes('/wallet-history')) {
  77  |       await page.goto(`${baseURL}/wallet-history`, { waitUntil: 'domcontentloaded' });
  78  |     }
  79  | 
  80  |     await expect(page.getByRole('button', { name: /add cash wallet/i }).first()).toBeVisible();
  81  |     await page.getByRole('button', { name: /add cash wallet/i }).first().click();
  82  | 
  83  |     await page.locator('input#cash-topup-amount').fill(TOPUP_AMOUNT);
  84  | 
  85  |     const createOrderPromise = page.waitForResponse(
  86  |       (r) => r.request().method() === 'POST' && r.url().includes('/payments/razorpay/wallet-topup/create-order'),
  87  |       { timeout: 30000 },
  88  |     );
  89  | 
  90  |     await page.getByRole('button', { name: /^pay now$/i }).last().click();
  91  |     await createOrderPromise;
  92  | 
  93  |     await completeRazorpaySandboxPayment(page);
  94  | 
  95  |     await page.waitForURL(/\/payments\/success\?flow=wallet_topup/, { timeout: 120000 });
  96  |     await expect(page.getByText(/payment successful/i).first()).toBeVisible();
  97  |   });
  98  | 
  99  |   test('subscription renewal checkout and confirmation', async ({ page, baseURL }) => {
  100 |     await page.goto(`${baseURL}/subscription-history`, { waitUntil: 'domcontentloaded' });
  101 |     await maybeLogin(page);
  102 | 
  103 |     if (!page.url().includes('/subscription-history')) {
  104 |       await page.goto(`${baseURL}/subscription-history`, { waitUntil: 'domcontentloaded' });
  105 |     }
  106 | 
  107 |     const renewButton = page.getByRole('button', { name: /renew subscription/i }).first();
  108 |     await expect(renewButton).toBeVisible();
  109 | 
  110 |     const createOrderPromise = page.waitForResponse(
  111 |       (r) =>
  112 |         r.request().method() === 'POST' &&
  113 |         r.url().includes('/payments/razorpay/subscription-renewal/create-order'),
  114 |       { timeout: 30000 },
  115 |     );
```