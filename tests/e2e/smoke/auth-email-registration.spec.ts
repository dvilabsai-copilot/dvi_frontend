import { test, expect } from '../fixtures/network-monitor';

test('@smoke email sign-in keeps public errors on the email screen', async ({ page }) => {
  await page.route('**/auth/email-login/send-otp', (route) =>
    route.fulfill({
      status: 401,
      contentType: 'application/json',
      body: JSON.stringify({ message: 'No active partner account was found for this email.' }),
    }),
  );

  await page.goto('/login', { waitUntil: 'domcontentloaded' });
  await page.getByRole('button', { name: 'Sign in with Email OTP' }).click();
  await page.getByLabel('Partner email address').fill('unknown@example.com');
  await page.getByRole('button', { name: 'Send verification code' }).click();

  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByText('No active partner account was found for this email.', { exact: true })).toBeVisible();
  await expect(page.locator('#login-email-otp')).toHaveCount(0);
});

test('@smoke registration verifies email separately and submits a pending application', async ({ page }) => {
  await page.route('**/auth/registration/email/send-otp', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ message: 'Verification code sent to your email.' }),
    }),
  );
  await page.route('**/auth/registration/email/verify-otp', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ verified: true, verificationToken: 'test-registration-token' }),
    }),
  );
  await page.route('**/auth/registration', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ ok: true, status: 'pending_approval' }),
    }),
  );

  await page.goto('/partner-registration', { waitUntil: 'domcontentloaded' });
  await page.getByPlaceholder('Enter your company name').fill('DVI Test Travel');
  await page.getByPlaceholder('Enter mobile number').first().fill('9876543210');
  await page.getByPlaceholder('Enter email ID').fill('new@partner.example');
  await page.getByPlaceholder(/10 digit PAN/i).fill('ABCDE1234F');
  await page.getByRole('button', { name: 'Send verification code' }).click();
  await page.getByPlaceholder('Enter 6-digit code').fill('123456');
  await page.getByRole('button', { name: 'Verify email' }).click();
  await page.locator('#registrationDeclaration').check();
  await page.getByRole('button', { name: 'Create Account' }).click();

  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByText('Registration submitted', { exact: true })).toBeVisible();
});
