import { test, expect } from '../fixtures/network-monitor';

test('@smoke login page loads with a usable authentication form', async ({ page }) => {
  await page.goto('/login', { waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('heading', { name: 'Travel Partner Login' })).toBeVisible();
  await expect(page.getByRole('textbox').first()).toBeVisible();
  await expect(page.locator('input[type="password"]')).toBeVisible();
  await expect(page.getByRole('button', { name: /sign in/i })).toBeVisible();
});

test('@smoke login links to public partner registration', async ({ page }) => {
  await page.goto('/login', { waitUntil: 'domcontentloaded' });
  await page.getByRole('button', { name: 'Login via Email Verification' }).click();
  await page.waitForURL('**/partner-registration');
  await expect(page.getByRole('heading', { name: 'Welcome to DVI Holidays' })).toBeVisible();
});

test('@smoke login exposes functional remember-me and password visibility controls', async ({ page }) => {
  await page.goto('/login', { waitUntil: 'domcontentloaded' });

  const rememberMe = page.getByLabel('Remember Me');
  await expect(rememberMe).not.toBeChecked();
  await rememberMe.check();
  await expect(rememberMe).toBeChecked();

  const password = page.getByRole('textbox', { name: 'Password' });
  await expect(password).toHaveAttribute('type', 'password');
  await page.getByRole('button', { name: 'Show password' }).click();
  await expect(password).toHaveAttribute('type', 'text');
  await expect(page.getByRole('button', { name: 'Hide password' })).toBeVisible();
});
