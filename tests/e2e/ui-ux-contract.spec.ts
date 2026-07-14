import { expect, test } from './fixtures/auth.fixture';

const routes = [
  { path: '/create-itinerary', landmark: /Save & Continue/i },
  { path: '/hotels', landmark: /List of Hotel/i },
  { path: '/hotspots', landmark: /List of Hotspot/i },
  { path: '/activities', landmark: /List of Activity/i },
  { path: '/locations', landmark: /List of Locations/i },
] as const;

for (const route of routes) {
  test(`@ui-ux ${route.path} is usable on a narrow viewport`, async ({ adminPage }) => {
    await adminPage.setViewportSize({ width: 390, height: 844 });
    await adminPage.goto(route.path, { waitUntil: 'domcontentloaded' });
    await expect(adminPage.getByText(route.landmark, { exact: false }).first()).toBeVisible();

    const layout = await adminPage.evaluate(() => ({
      viewportWidth: window.innerWidth,
      documentWidth: document.documentElement.scrollWidth,
      visibleButtons: [...document.querySelectorAll('button')].filter((button) => {
        const style = window.getComputedStyle(button);
        return style.visibility !== 'hidden' && style.display !== 'none';
      }).length,
    }));

    expect(layout.documentWidth, `${route.path} must not overflow horizontally`).toBeLessThanOrEqual(layout.viewportWidth + 2);
    expect(layout.visibleButtons, `${route.path} should expose actionable controls`).toBeGreaterThan(0);
  });
}

test('@ui-ux itinerary details exposes safe sharing controls without confirmation', async ({ adminPage }) => {
  const quoteId = process.env.E2E_ITINERARY_QUOTE_ID?.trim();
  expect(quoteId, 'E2E_ITINERARY_QUOTE_ID is required for itinerary-details UI/UX coverage').toBeTruthy();

  await adminPage.goto(`/itinerary-details/${encodeURIComponent(quoteId as string)}`, { waitUntil: 'domcontentloaded' });
  await expect(adminPage).toHaveURL(new RegExp(`/itinerary-details/${quoteId}$`), { timeout: 30000 });
  await expect(adminPage.getByText(/Tour Itinerary Plan/i).first()).toBeVisible({ timeout: 60000 });

  const shareButton = adminPage.getByRole('button', { name: /Share/i }).first();
  await expect(shareButton).toBeVisible();
  await shareButton.hover();
  await expect(adminPage.getByRole('button', { name: /Copy Link/i })).toBeVisible();
  await expect(adminPage.getByRole('button', { name: /Share on WhatsApp/i })).toBeVisible();

  const clipboardButton = adminPage.getByRole('button', { name: /Clipboard/i }).first();
  await expect(clipboardButton).toBeVisible();
  await clipboardButton.hover();
  await expect(adminPage.getByRole('button', { name: /Copy Recommended/i })).toBeVisible();
  await adminPage.getByRole('button', { name: /Copy Recommended/i }).click();
  await expect(adminPage.getByRole('button', { name: /Copy Clipboard/i })).toBeVisible();
  await adminPage.getByRole('button', { name: /Cancel/i }).click();

  expect(adminPage.url()).not.toContain('/confirm-quotation');
});
