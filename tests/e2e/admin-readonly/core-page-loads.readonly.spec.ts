import { test, expect } from '../fixtures/auth.fixture';

const pageLoads = [
  { path: '/', landmark: /Welcome back, Admin/i, name: 'dashboard' },
  { path: '/hotels', landmark: 'List of Hotel', name: 'hotels' },
  { path: '/vendor', landmark: 'List of Vendor', name: 'vendors' },
  { path: '/latest-itinerary', landmark: 'List of Itinerary', name: 'latest itineraries' },
  { path: '/confirmed-itinerary', landmark: 'Confirmed Itineraries', name: 'confirmed itineraries' },
  { path: '/cancelled-itinerary', landmark: 'Cancelled Itineraries', name: 'cancelled itineraries' },
  { path: '/settings/global', landmark: 'Global Settings', name: 'global settings' },
  { path: '/settings/cities', landmark: 'Cities', name: 'cities settings' },
  { path: '/settings/hotel-category', landmark: 'List of Hotel Category', name: 'hotel category settings' },
  { path: '/settings/gst', landmark: 'List of GST Settings', name: 'gst settings' },
  { path: '/settings/amenities', landmark: 'List of Inbuilt Amenities', name: 'amenities settings' },
  { path: '/settings/vehicle-type', landmark: 'List of Vehicle Type', name: 'vehicle type settings' },
  { path: '/settings/language', landmark: 'List of Language', name: 'language settings' },
  { path: '/settings/role-permission', landmark: 'Role Permission', name: 'role permission settings' },
  { path: '/settings/subscription-plan', landmark: 'List of Subscription Plan', name: 'subscription plan settings' },
  { path: '/drivers', landmark: 'List of Driver', name: 'drivers' },
  { path: '/vehicle-availability', landmark: 'List of Vehicle Availability', name: 'vehicle availability' },
  { path: '/hotspots', landmark: 'List of Hotspot', name: 'hotspots' },
  { path: '/activities', landmark: 'List of Activity', name: 'activities' },
  { path: '/staff', landmark: 'Staff', name: 'staff' },
  { path: '/agent', landmark: 'List of Agent', name: 'agents' },
  { path: '/guide', landmark: 'List of Guide', name: 'guides' },
  { path: '/locations', landmark: 'List of Locations', name: 'locations' },
  { path: '/daily-moment', landmark: 'List of Daily Moment', name: 'daily moment' },
  { path: '/accounts-manager', landmark: 'List of Accounts Details', name: 'accounts manager' },
  { path: '/accounts-ledger', landmark: 'List of Vehicle', name: 'accounts ledger' },
  { path: '/hotspot-distance-cache', landmark: 'Hotspot Distance Cache', name: 'hotspot distance cache' },
  { path: '/locations/between-hotspots', landmark: 'Between Hotspots', name: 'between-hotspots locations' },
  { path: '/toll-charge', landmark: 'Toll Charge', name: 'toll charges' },
  { path: '/pricebook-export', landmark: 'Export Price Details', name: 'pricebook export' },
  { path: '/payments/success', landmark: 'Payment Successful', name: 'payment success' },
  { path: '/daily-moment-tracker', landmark: 'List of Daily Moment', name: 'daily moment tracker' },
  { path: '/hotels/axisrooms', landmark: 'AxisRooms Hotels', name: 'AxisRooms hotels' },
  { path: '/parking-charge-bulk-import', landmark: 'Vehicle Parking Charge Bulk import', name: 'parking charge bulk import' },
  { path: '/book-activities', landmark: /Discover\. Book\./i, name: 'book activities' },
  { path: '/create-itinerary', landmark: 'Save & Continue', name: 'create itinerary form' },
  { path: '/guide/new', landmark: 'Add Guide', name: 'add guide form' },
  { path: '/hotels/new', landmark: 'Basic Info', name: 'add hotel form' },
  { path: '/vendor/new', landmark: 'Add Vendor', name: 'add vendor form' },
  { path: '/driver/new', landmark: 'Add Driver', name: 'add driver form' },
  { path: '/drivers/new', landmark: 'Add Driver', name: 'add driver alias form' },
  { path: '/driver', landmark: 'List of Driver', name: 'driver list alias' },
  { path: '/drivers/create', landmark: 'Add Driver', name: 'create driver form' },
  { path: '/driver/create', landmark: 'Add Driver', name: 'create driver alias form' },
  { path: '/hotspots/new', landmark: 'Basic Info', name: 'add hotspot form' },
  { path: '/hotspot-distance-cache/new', landmark: 'Add New Record', name: 'add hotspot distance record form' },
  { path: '/activities/new', landmark: 'Add Activity', name: 'add activity form' },
  { path: '/staff/new', landmark: 'Add Staff', name: 'add staff form' },
  { path: '/role-permission/new', landmark: 'Add Role Permission', name: 'add role permission form' },
  { path: '/agent-subscription-plan/new', landmark: 'Add Subscription Plan', name: 'add subscription plan form' },
  { path: '/wallet', landmark: 'Cash Wallet History', name: 'wallet alias' },
];

for (const pageLoad of pageLoads) {
  test(`@readonly ${pageLoad.name} loads directly for an authenticated admin`, async ({ adminPage }) => {
    await adminPage.goto(pageLoad.path, { waitUntil: 'domcontentloaded' });
    await expect(adminPage).toHaveURL(new RegExp(`${pageLoad.path === '/' ? '/$' : `${pageLoad.path.replaceAll('/', '\\/')}(?:[?#].*)?$`}`));
    await expect(adminPage.getByText(pageLoad.landmark, { exact: false }).first()).toBeVisible();
  });
}

for (const pageLoad of pageLoads) {
  test(`@readonly ${pageLoad.name} loads directly for an authenticated agent`, async ({ agentPage }) => {
    await agentPage.goto(pageLoad.path, { waitUntil: 'domcontentloaded' });
    await expect(agentPage).toHaveURL(new RegExp(`${pageLoad.path === '/' ? '/$' : `${pageLoad.path.replaceAll('/', '\\/')}(?:[?#].*)?$`}`));
    await expect(agentPage.getByText(pageLoad.landmark, { exact: false }).first()).toBeVisible();
  });
}

test('@readonly agent dashboard loads directly for the agent role', async ({ agentPage }) => {
  await agentPage.goto('/', { waitUntil: 'domcontentloaded' });
  await expect(agentPage).toHaveURL(/\/$/);
  await expect(agentPage.getByText(/Welcome back, Agent/i).first()).toBeVisible();
});

for (const pageLoad of [
  { path: '/profile', landmark: 'My Profile', name: 'agent profile' },
  { path: '/subscription-history', landmark: 'List of Subscription History', name: 'subscription history' },
  { path: '/wallet-history', landmark: 'Cash Wallet History', name: 'wallet history' },
]) {
  test(`@readonly ${pageLoad.name} loads directly for the agent role`, async ({ agentPage }) => {
    await agentPage.goto(pageLoad.path, { waitUntil: 'domcontentloaded' });
    await expect(agentPage).toHaveURL(new RegExp(`${pageLoad.path.replaceAll('/', '\\/')}(?:[?#].*)?$`));
    await expect(agentPage.getByText(pageLoad.landmark, { exact: false }).first()).toBeVisible();
  });
}

test('@readonly vendor list supports search, page size, and add navigation', async ({ adminPage }) => {
  await adminPage.goto('/vendor', { waitUntil: 'domcontentloaded' });
  const search = adminPage.getByPlaceholder('Search vendors');
  await expect(search).toBeVisible();
  await search.fill('PW_E2E_no_match');
  await expect(search).toHaveValue('PW_E2E_no_match');

  const pageSize = adminPage.getByRole('combobox').first();
  await pageSize.selectOption('25');
  await expect(pageSize).toHaveValue('25');

  await adminPage.getByRole('button', { name: /add vendor/i }).click();
  await adminPage.waitForURL('**/vendor/new');
  await expect(adminPage.getByRole('heading', { name: 'Add Vendor' })).toBeVisible();
});

test('@readonly hotel list exercises search, filters, price-book menu, and add navigation', async ({ adminPage }) => {
  const listResponse = adminPage.waitForResponse((response) =>
    response.request().method() === 'GET' && /\/hotels(?:\?|$)/.test(response.url()),
  );

  await adminPage.goto('/hotels', { waitUntil: 'domcontentloaded' });
  await expect(adminPage.getByText('List of Hotel', { exact: true })).toBeVisible();
  expect((await listResponse).status(), 'hotel list load').toBeLessThan(400);

  const search = adminPage.locator('input').first();
  await expect(search).toBeVisible();
  await search.fill('PW_E2E_no_match');
  await expect(search).toHaveValue('PW_E2E_no_match');

  await adminPage.getByRole('button', { name: 'Filter', exact: true }).click();
  const stateFilter = adminPage.locator('select').first();
  const cityFilter = adminPage.locator('select').nth(1);
  await expect(stateFilter).toBeVisible();
  await expect(cityFilter).toBeDisabled();
  if (await stateFilter.locator('option').count() > 1) {
    await stateFilter.selectOption({ index: 1 });
    await expect(cityFilter).toBeEnabled();
  }
  await adminPage.getByRole('button', { name: 'Clear', exact: true }).click();
  await expect(stateFilter).toHaveValue('');

  const entries = adminPage.locator('select').last();
  await entries.selectOption('25');
  await expect(entries).toHaveValue('25');

  await adminPage.getByRole('button', { name: 'Price Book', exact: true }).click();
  await expect(adminPage.getByRole('menuitem', { name: 'Rooms Price Book (Import)' })).toBeVisible();
  await expect(adminPage.getByRole('menuitem', { name: 'Amenities Price Book (Import)' })).toBeVisible();
  await adminPage.getByRole('button', { name: 'Price Book', exact: true }).click();

  await adminPage.getByRole('button', { name: '+ Add Hotel', exact: true }).click();
  await adminPage.waitForURL('**/hotels/new');
  await expect(adminPage.getByText('Basic Info', { exact: true })).toBeVisible();
});

test('@readonly driver list exercises search and add navigation', async ({ adminPage }) => {
  const listResponse = adminPage.waitForResponse((response) =>
    response.request().method() === 'GET' && /\/drivers(?:\?|$)/.test(response.url()),
  );

  await adminPage.goto('/drivers', { waitUntil: 'domcontentloaded' });
  await expect(adminPage.getByRole('heading', { name: 'List of Driver' })).toBeVisible();
  expect((await listResponse).status(), 'driver list load').toBeLessThan(400);

  const search = adminPage.locator('input').first();
  await expect(search).toBeVisible();
  await search.fill('PW_E2E_no_match');
  await expect(search).toHaveValue('PW_E2E_no_match');

  await adminPage.getByRole('button', { name: '+ Add Driver', exact: true }).click();
  await adminPage.waitForURL('**/driver/create?from=*');
  await expect(adminPage.getByText('Add Driver', { exact: true }).first()).toBeVisible();
});

test('@readonly staff list exercises search, page size, and add navigation', async ({ adminPage }) => {
  const listResponse = adminPage.waitForResponse((response) =>
    response.request().method() === 'GET' && /\/staff(?:\?|$)/.test(response.url()),
  );

  await adminPage.goto('/staff', { waitUntil: 'domcontentloaded' });
  await expect(adminPage.getByRole('heading', { name: 'Staff', exact: true }).first()).toBeVisible();
  expect((await listResponse).status(), 'staff list load').toBeLessThan(400);

  const search = adminPage.locator('input').first();
  await expect(search).toBeVisible();
  await search.fill('PW_E2E_no_match');
  await expect(search).toHaveValue('PW_E2E_no_match');

  const pageSize = adminPage.getByRole('combobox').first();
  await pageSize.click();
  await adminPage.getByRole('option', { name: '25', exact: true }).click();
  await expect(pageSize).toContainText('25');

  await adminPage.getByRole('button', { name: 'Add Staff', exact: true }).click();
  await adminPage.waitForURL('**/staff/new');
  await expect(adminPage.getByRole('heading', { name: 'Add Staff' })).toBeVisible();
});

test('@readonly activity list exercises search, page size, and add navigation', async ({ adminPage }) => {
  const listResponse = adminPage.waitForResponse((response) =>
    response.request().method() === 'GET' && /\/activities(?:\?|$)/.test(response.url()),
  );

  await adminPage.goto('/activities', { waitUntil: 'domcontentloaded' });
  await expect(adminPage.getByRole('heading', { name: 'List of Activity' })).toBeVisible();
  expect((await listResponse).status(), 'activity list load').toBeLessThan(400);

  const search = adminPage.locator('input').first();
  await expect(search).toBeVisible();
  await search.fill('PW_E2E_no_match');
  await expect(search).toHaveValue('PW_E2E_no_match');

  const pageSize = adminPage.getByRole('combobox').first();
  await pageSize.click();
  await adminPage.getByRole('option', { name: '25', exact: true }).click();
  await expect(pageSize).toContainText('25');

  await adminPage.getByRole('button', { name: 'Add Activity', exact: true }).click();
  await adminPage.waitForURL('**/activities/new');
  await expect(adminPage.getByText('Add Activity', { exact: true })).toBeVisible();
});

test('@readonly locations list exercises source/destination filters, search, clear, and page size', async ({ adminPage }) => {
  const listResponse = adminPage.waitForResponse((response) =>
    response.request().method() === 'GET' && /\/locations(?:\?|$)/.test(response.url()),
  );

  await adminPage.goto('/locations', { waitUntil: 'domcontentloaded' });
  await expect(adminPage.getByRole('heading', { name: 'List of Locations' })).toBeVisible();
  expect((await listResponse).status(), 'locations list load').toBeLessThan(400);

  await expect(adminPage.getByRole('button', { name: 'Choose Source Location', exact: true })).toBeVisible();
  await expect(adminPage.getByRole('button', { name: 'Choose Destination Location', exact: true })).toBeVisible();

  const search = adminPage.getByPlaceholder('Type to search…');
  await expect(search).toBeVisible();
  await search.fill('PW_E2E_no_match');
  await expect(search).toHaveValue('PW_E2E_no_match');

  await adminPage.getByRole('button', { name: 'Clear', exact: true }).click();
  await expect(search).toHaveValue('');

  const pageSize = adminPage.getByRole('combobox').last();
  await pageSize.click();
  await adminPage.getByRole('option', { name: '25', exact: true }).click();
  await expect(pageSize).toContainText('25');
});

test('@readonly agent list exercises search and page size', async ({ adminPage }) => {
  const listResponse = adminPage.waitForResponse((response) =>
    response.request().method() === 'GET' && response.url().includes('/agents/full?limit=1000'),
  );

  await adminPage.goto('/agent', { waitUntil: 'domcontentloaded' });
  await expect(adminPage.getByRole('heading', { name: 'Agent', exact: true }).first()).toBeVisible();
  expect((await listResponse).status(), 'agent list load').toBeLessThan(400);

  const search = adminPage.locator('input').first();
  await expect(search).toBeVisible();
  await search.fill('PW_E2E_no_match');
  await expect(search).toHaveValue('PW_E2E_no_match');

  const pageSize = adminPage.getByRole('combobox').first();
  await pageSize.click();
  await adminPage.getByRole('option', { name: '25', exact: true }).click();
  await expect(pageSize).toContainText('25');
});

test('@readonly cities list exercises search, filters, export disabled states, and cancel', async ({ adminPage }) => {
  await adminPage.goto('/settings/cities', { waitUntil: 'domcontentloaded' });
  const search = adminPage.locator('input').first();
  await expect(search).toBeVisible();
  await search.fill('PW_E2E_no_match');
  await expect(search).toHaveValue('PW_E2E_no_match');

  const pageSize = adminPage.getByRole('combobox').first();
  await pageSize.click();
  await adminPage.getByRole('option', { name: '25', exact: true }).click();
  await expect(pageSize).toContainText('25');

  const stateFilter = adminPage.getByRole('combobox').nth(1);
  await stateFilter.click();
  await adminPage.getByRole('option', { name: 'All States', exact: true }).click();
  await expect(stateFilter).toContainText('All States');

  await expect(adminPage.getByRole('button', { name: 'Copy', exact: true })).toBeDisabled();
  await expect(adminPage.getByRole('button', { name: 'Excel', exact: true })).toBeDisabled();
  await expect(adminPage.getByRole('button', { name: 'CSV', exact: true })).toBeDisabled();

  await adminPage.getByRole('button', { name: '+ Add City', exact: true }).click();
  const dialog = adminPage.getByRole('dialog');
  await expect(dialog.getByRole('heading', { name: 'Add City' })).toBeVisible();
  await expect(dialog.getByPlaceholder('Enter the City Name')).toBeVisible();
  await dialog.getByRole('button', { name: 'Cancel', exact: true }).click();
  await expect(dialog).toBeHidden();
});

test('@readonly global settings exposes state, support, and country controls', async ({ adminPage }) => {
  const settingsResponse = adminPage.waitForResponse((response) =>
    response.request().method() === 'GET' && /\/global-settings(?:\?|$)/.test(response.url()),
  );
  const statesResponse = adminPage.waitForResponse((response) =>
    response.request().method() === 'GET' && response.url().includes('/global-settings/states'),
  );

  await adminPage.goto('/settings/global', { waitUntil: 'domcontentloaded' });
  await expect(adminPage.getByRole('heading', { name: 'Global Settings' })).toBeVisible();
  expect((await settingsResponse).status(), 'global settings load').toBeLessThan(400);
  expect((await statesResponse).status(), 'global settings states load').toBeLessThan(400);

  const stateControl = adminPage.getByLabel('State Name *');
  await expect(stateControl).toBeVisible();
  const stateOptions = adminPage.getByRole('option');
  await stateControl.click();
  if (await stateOptions.count()) {
    await expect(stateOptions.first()).toBeVisible();
    await stateOptions.first().click();
  }

  const supportNumber = adminPage.getByLabel('On Ground Support Number *');
  await expect(supportNumber).toBeVisible();
  await supportNumber.fill('PW_E2E_support_check');
  await expect(supportNumber).toHaveValue('PW_E2E_support_check');

  const escalationNumber = adminPage.getByLabel('Escalation Call Number *');
  await expect(escalationNumber).toBeVisible();
  await escalationNumber.fill('PW_E2E_escalation_check');
  await expect(escalationNumber).toHaveValue('PW_E2E_escalation_check');

  const eligibleCountry = adminPage.getByLabel('Choosen Country *');
  await expect(eligibleCountry).toBeVisible();
  await eligibleCountry.fill('PW_E2E_country_check');
  await expect(eligibleCountry).toHaveValue('PW_E2E_country_check');
});

test('@readonly GST settings exercises list controls and opens the create form safely', async ({ adminPage }) => {
  const listResponse = adminPage.waitForResponse((response) =>
    response.request().method() === 'GET' && /\/gst-settings(?:\?|$)/.test(response.url()),
  );

  await adminPage.goto('/settings/gst', { waitUntil: 'domcontentloaded' });
  await expect(adminPage.getByRole('heading', { name: 'List of GST Settings' })).toBeVisible();
  expect((await listResponse).status(), 'GST settings list load').toBeLessThan(400);

  const search = adminPage.locator('input').first();
  await expect(search).toBeVisible();
  await search.fill('PW_E2E_no_match');
  await expect(search).toHaveValue('PW_E2E_no_match');

  const pageSize = adminPage.getByRole('combobox').first();
  await pageSize.click();
  await adminPage.getByRole('option', { name: '25', exact: true }).click();
  await expect(pageSize).toContainText('25');

  await expect(adminPage.getByRole('button', { name: 'Copy', exact: true })).toBeVisible();
  await expect(adminPage.getByRole('button', { name: 'Excel', exact: true })).toBeVisible();
  await expect(adminPage.getByRole('button', { name: 'CSV', exact: true })).toBeVisible();

  await adminPage.getByRole('button', { name: '+ Add GST Settings', exact: true }).click();
  await expect(adminPage.getByRole('heading', { name: 'Add GST Settings' })).toBeVisible();
  await expect(adminPage.getByPlaceholder('Enter the GST title')).toBeVisible();
  await expect(adminPage.getByPlaceholder('Enter the Gst value')).toBeVisible();
  await expect(adminPage.getByPlaceholder('Enter the CGST Value')).toBeVisible();
  await expect(adminPage.getByPlaceholder('Enter the SGST Value')).toBeVisible();
  await expect(adminPage.getByPlaceholder('Enter the IGST Value')).toBeVisible();
  await adminPage.getByRole('button', { name: 'Cancel', exact: true }).click();
  await expect(adminPage.getByRole('heading', { name: 'Add GST Settings' })).toBeHidden();
});

for (const settingsList of [
  {
    path: '/settings/hotel-category',
    endpoint: '/hotel-categories',
    heading: 'List of Hotel Category',
    addButton: '+ Add Hotel Category',
    modalHeading: 'Add Hotel Category',
    placeholders: ['e.g., Budget, STD, 5*, 4*', 'e.g., DVIB-918791'],
  },
  {
    path: '/settings/vehicle-type',
    endpoint: '/vehicle-types',
    heading: 'List of Vehicle Type',
    addButton: '+ Add Vehicle Type',
    modalHeading: 'Add Vehicle Type',
    placeholders: ['Enter the Vehicle Type Title', 'Enter the occupancy'],
  },
  {
    path: '/settings/language',
    endpoint: '/languages',
    heading: 'List of Language',
    addButton: '+ Add Language',
    modalHeading: 'Add Language',
    placeholders: ['Enter the Language'],
  },
  {
    path: '/settings/amenities',
    endpoint: '/inbuilt-amenities',
    heading: 'List of Inbuilt Amenities',
    addButton: '+ Add Inbuild Amenity',
    modalHeading: 'Add Inbuild Amenity',
    placeholders: ['Enter the Inbuilt Amenity Title'],
  },
]) {
  test(`@readonly ${settingsList.heading} exercises list controls and safely cancels create`, async ({ adminPage }) => {
    const listResponse = adminPage.waitForResponse((response) =>
      response.request().method() === 'GET' && new RegExp(`${settingsList.endpoint}(?:\\?|$)`).test(response.url()),
    );

    await adminPage.goto(settingsList.path, { waitUntil: 'domcontentloaded' });
    await expect(adminPage.getByRole('heading', { name: settingsList.heading })).toBeVisible();
    expect((await listResponse).status(), `${settingsList.heading} list load`).toBeLessThan(400);

    const search = adminPage.locator('input').first();
    await expect(search).toBeVisible();
    await search.fill('PW_E2E_no_match');
    await expect(search).toHaveValue('PW_E2E_no_match');

    const pageSize = adminPage.getByRole('combobox').first();
    await pageSize.click();
    await adminPage.getByRole('option', { name: '25', exact: true }).click();
    await expect(pageSize).toContainText('25');

    for (const exportName of ['Copy', 'Excel', 'CSV']) {
      await expect(adminPage.getByRole('button', { name: exportName, exact: true })).toBeVisible();
    }

    await adminPage.getByRole('button', { name: settingsList.addButton, exact: true }).click();
    await expect(adminPage.getByRole('heading', { name: settingsList.modalHeading })).toBeVisible();
    for (const placeholder of settingsList.placeholders) {
      await expect(adminPage.getByPlaceholder(placeholder)).toBeVisible();
    }
    await adminPage.getByRole('button', { name: 'Cancel', exact: true }).click();
    await expect(adminPage.getByRole('heading', { name: settingsList.modalHeading })).toBeHidden();
  });
}

for (const settingsList of [
  {
    path: '/settings/role-permission',
    endpoint: '/role-permissions',
    heading: 'Role Permission',
    addButton: 'Add Role Permission',
    createPath: '/role-permission/new',
    createHeading: 'Add Role Permission',
  },
  {
    path: '/settings/subscription-plan',
    endpoint: '/agent-subscription-plans',
    heading: 'List of Subscription Plan',
    addButton: '+ Add Subscription Plan',
    createPath: '/agent-subscription-plan/new',
    createHeading: 'Add Subscription Plan',
  },
]) {
  test(`@readonly ${settingsList.heading} exercises search, page size, and create navigation`, async ({ adminPage }) => {
    const listResponse = adminPage.waitForResponse((response) =>
      response.request().method() === 'GET' && new RegExp(`${settingsList.endpoint}(?:\\?|$)`).test(response.url()),
    );

    await adminPage.goto(settingsList.path, { waitUntil: 'domcontentloaded' });
    await expect(adminPage.getByRole('heading', { name: settingsList.heading }).first()).toBeVisible();
    expect((await listResponse).status(), `${settingsList.heading} list load`).toBeLessThan(400);

    const search = adminPage.locator('input').first();
    await expect(search).toBeVisible();
    await search.fill('PW_E2E_no_match');
    await expect(search).toHaveValue('PW_E2E_no_match');

    const pageSize = adminPage.getByRole('combobox').first();
    await pageSize.click();
    await adminPage.getByRole('option', { name: '25', exact: true }).click();
    await expect(pageSize).toContainText('25');

    await adminPage.getByRole('button', { name: settingsList.addButton, exact: true }).click();
    await adminPage.waitForURL(`**${settingsList.createPath}`);
    await expect(adminPage.getByRole('heading', { name: settingsList.createHeading })).toBeVisible();
  });
}

test('@readonly guide form loads its required dropdown contracts', async ({ adminPage }) => {
  const requiredGuideDropdowns = [
    '/guides/dropdowns/roles',
    '/guides/dropdowns/languages',
    '/guides/dropdowns/countries',
    '/guides/dropdowns/gst-percentages',
    '/guides/dropdowns/hotspots',
    '/guides/dropdowns/activities',
  ];
  const responses = requiredGuideDropdowns.map((path) =>
    adminPage.waitForResponse((response) => response.request().method() === 'GET' && response.url().includes(path)),
  );

  await adminPage.goto('/guide/new', { waitUntil: 'domcontentloaded' });
  await expect(adminPage).toHaveURL(/\/guide\/new(?:[?#].*)?$/);
  await expect(adminPage.getByRole('heading', { name: 'Add Guide' })).toBeVisible();

  for (const response of await Promise.all(responses)) {
    expect(response.status(), `required guide dropdown ${response.url()}`).toBeLessThan(400);
  }

  const stateResponse = adminPage.waitForResponse((response) =>
    response.request().method() === 'GET' && response.url().includes('/guides/dropdowns/states?countryId='),
  );
  const countryTrigger = adminPage.getByText('Select Country', { exact: true }).or(adminPage.getByText('India', { exact: true })).first();
  await countryTrigger.click();
  const countryOption = adminPage.getByRole('option').first();
  await expect(countryOption).toBeVisible();
  await countryOption.click();
  expect((await stateResponse).status(), 'guide state dropdown').toBeLessThan(400);

  const cityResponse = adminPage.waitForResponse((response) =>
    response.request().method() === 'GET' && response.url().includes('/guides/dropdowns/cities?stateId='),
  );
  await adminPage.getByText('Select State', { exact: true }).click();
  const stateOption = adminPage.getByRole('option').first();
  await expect(stateOption).toBeVisible();
  await stateOption.click();
  expect((await cityResponse).status(), 'guide city dropdown').toBeLessThan(400);

  const emailCheckResponse = adminPage.waitForResponse((response) =>
    response.request().method() === 'POST' && response.url().includes('/guides/ajax/check-guide-email'),
  );
  const guideEmail = adminPage.locator('input[type="email"]').first();
  await expect(guideEmail).toBeVisible();
  await guideEmail.fill(`PW_E2E_guide_check_${process.env.E2E_RUN_ID}@example.test`);
  await guideEmail.press('Tab');
  expect((await emailCheckResponse).status(), 'guide email availability check').toBeLessThan(400);
});
