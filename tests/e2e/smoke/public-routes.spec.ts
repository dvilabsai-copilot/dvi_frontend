import { test, expect } from '../fixtures/network-monitor';

test('@smoke public partner registration page loads directly', async ({ page }) => {
  await page.goto('/partner-registration', { waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('heading', { name: 'Welcome to DVI Holidays' })).toBeVisible();
});

test('@smoke partner registration links back to login', async ({ page }) => {
  await page.goto('/partner-registration', { waitUntil: 'domcontentloaded' });
  await page.getByRole('button', { name: 'Back to Login' }).click();
  await page.waitForURL('**/login');
  await expect(page.getByRole('heading', { name: 'Travel Partner Login' })).toBeVisible();
});

test('@smoke unknown routes render the not-found page', async ({ page }) => {
  await page.goto('/this-route-does-not-exist', { waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('heading', { name: '404' })).toBeVisible();
});

test('@smoke partner registration exposes verification and declaration controls', async ({ page }) => {
  await page.goto('/partner-registration', { waitUntil: 'domcontentloaded' });

  await expect(page.getByPlaceholder('Enter mobile number').first()).toBeVisible();
  await expect(page.getByPlaceholder('Enter 6-digit code')).toBeVisible();

  const declaration = page.getByRole('checkbox', { name: /I hereby declare/i });
  await expect(declaration).not.toBeChecked();
  await declaration.check();
  await expect(declaration).toBeChecked();

  await expect(page.getByRole('link', { name: 'Terms & Conditions' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Privacy Policy' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Create Account' })).toBeVisible();
});
