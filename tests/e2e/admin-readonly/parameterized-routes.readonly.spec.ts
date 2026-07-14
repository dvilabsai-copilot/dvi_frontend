import { expect, test } from '../fixtures/auth.fixture';

type ParameterizedRoute = {
  name: string;
  route: string;
  fixtureEnv: string;
};

const routes: ParameterizedRoute[] = [
  { name: 'itinerary details', route: '/itinerary-details/:id', fixtureEnv: 'E2E_ITINERARY_QUOTE_ID' },
  { name: 'hotel details', route: '/hotels/:id', fixtureEnv: 'E2E_HOTEL_ID' },
  { name: 'vendor details', route: '/vendor/:id', fixtureEnv: 'E2E_VENDOR_EDIT_ID' },
  { name: 'driver details', route: '/drivers/:id', fixtureEnv: 'E2E_DRIVER_ID' },
  { name: 'driver edit', route: '/drivers/:id/edit', fixtureEnv: 'E2E_DRIVER_ID' },
];

for (const route of routes) {
  test(`@readonly ${route.name} parameterized route loads from its explicit fixture`, async ({ adminPage }) => {
    const fixtureId = process.env[route.fixtureEnv]?.trim();
    test.skip(!fixtureId, `Set ${route.fixtureEnv} for this parameterized route fixture.`);

    const target = route.route.replace(':id', encodeURIComponent(fixtureId!));
    await adminPage.goto(target, { waitUntil: 'domcontentloaded' });
    await expect(adminPage).toHaveURL(new RegExp(`${target.replaceAll('/', '\\/')}(?:[?#].*)?$`));
    await expect(adminPage.locator('body')).toBeVisible();
    await expect(adminPage).not.toHaveURL(/\/login(?:[/?#]|$)/);
  });
}
