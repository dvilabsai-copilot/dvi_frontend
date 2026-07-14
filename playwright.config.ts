import { defineConfig, devices } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

const envFile = path.resolve('.env.e2e');
if (fs.existsSync(envFile)) {
  for (const rawLine of fs.readFileSync(envFile, 'utf8').split(/\r?\n/)) {
    const line = rawLine.trim();
    const match = line.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
    if (match && !process.env[match[1]]) process.env[match[1]] = match[2].replace(/^['"]|['"]$/g, '');
  }
}

const includeExternal = process.env.E2E_INCLUDE_EXTERNAL === 'true';
const includeLegacy = process.env.E2E_INCLUDE_LEGACY === 'true';
const includeLegacyFixtures = process.env.E2E_INCLUDE_LEGACY_FIXTURES === 'true';
const explicitBaseURL = process.env.E2E_FRONTEND_BASE_URL;
const desktopChrome = { ...devices['Desktop Chrome'] };

function groupProject(
  name: string,
  testMatch: string[],
  grep: RegExp,
  grepInvert?: RegExp,
) {
  return {
    name,
    testMatch,
    grep,
    ...(grepInvert ? { grepInvert } : {}),
    use: desktopChrome,
  };
}

export default defineConfig({
  testDir: './tests/e2e',
  globalSetup: './tests/e2e/setup/global-setup.mjs',
  timeout: 120_000,
  expect: {
    timeout: 10_000,
  },
  fullyParallel: false,
  forbidOnly: true,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: explicitBaseURL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    viewport: { width: 1536, height: 900 },
  },
  testIgnore: [
    '**/quarantine/**',
    ...(includeExternal ? [] : ['**/external-sandbox/**']),
    ...(includeLegacy ? [] : ['**/legacy-environment/**']),
    ...(includeLegacyFixtures ? [] : ['**/legacy-fixture/**']),
  ],
  projects: [
    {
      name: 'smoke',
      testMatch: '**/smoke/**/*.spec.ts',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox-smoke',
      testMatch: '**/smoke/**/*.spec.ts',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit-smoke',
      testMatch: '**/smoke/**/*.spec.ts',
      use: { ...devices['Desktop Safari'] },
    },
    {
      name: 'mobile-smoke',
      testMatch: '**/smoke/**/*.spec.ts',
      use: { ...devices['iPhone 13'] },
    },
    {
      name: 'admin-readonly',
      testMatch: '**/*.readonly.spec.ts',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'admin-mutation',
      testMatch: '**/*.spec.ts',
      testIgnore: [
        '**/smoke/**',
        '**/admin-readonly/**',
        '**/*.readonly.spec.ts',
        '**/*-api*.spec.ts',
        '**/external-sandbox/**',
        '**/legacy-environment/**',
        '**/legacy-fixture/**',
        '**/quarantine/**',
      ],
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'api-contract',
      testMatch: '**/*-api*.spec.ts',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'agent',
      testMatch: '**/*.agent.spec.ts',
      grep: /@agent/,
      use: { ...devices['Desktop Chrome'] },
    },
    groupProject(
      'group-itinerary',
      [
        '**/booking-engine-validation.spec.ts',
        '**/manual-hotspot-five-day-quote.spec.ts',
        '**/vehicle-only-itinerary.spec.ts',
        '**/admin-readonly/core-page-loads.readonly.spec.ts',
      ],
      /create itinerary|latest itineraries|Booking engine validation|manual hotspot|vehicle-only itinerary/i,
    ),
    groupProject(
      'group-confirmed-itinerary',
      ['**/admin-readonly/core-page-loads.readonly.spec.ts'],
      /confirmed itineraries|cancelled itineraries/i,
    ),
    groupProject(
      'group-hotels',
      [
        '**/hotel-form-structure-check.spec.ts',
        '**/hotel-form-tabs-verification.spec.ts',
        '**/hotel-day-continuity.spec.ts',
        '**/admin-readonly/core-page-loads.readonly.spec.ts',
      ],
      /hotels loads|hotel list|add hotel|Hotel Form|hotel day continuity/i,
      /settings|pricebook|price[- ]book|axisrooms/i,
    ),
    groupProject(
      'group-vendors',
      ['**/admin-readonly/core-page-loads.readonly.spec.ts'],
      /vendors loads|vendor list|add vendor/i,
    ),
    groupProject(
      'group-drivers-vehicles',
      [
        '**/driver-new-flow.spec.ts',
        '**/vehicle-availability-add-forms.spec.ts',
        '**/vehicle-availability-duplicate-registration.spec.ts',
        '**/admin-readonly/core-page-loads.readonly.spec.ts',
      ],
      /drivers loads|driver list|add driver|vehicle availability/i,
    ),
    groupProject(
      'group-hotspots',
      [
        '**/hotspot-form-upload.spec.ts',
        '**/hotspot-itinerary-timing.spec.ts',
        '**/admin-readonly/core-page-loads.readonly.spec.ts',
      ],
      /hotspots loads|hotspot list|add hotspot|hotspot opening|include hotspot|hotspot distance/i,
    ),
    groupProject(
      'group-activities',
      ['**/admin-readonly/core-page-loads.readonly.spec.ts'],
      /activities loads|book activities|add activity|activity list/i,
    ),
    groupProject(
      'group-locations',
      ['**/admin-readonly/core-page-loads.readonly.spec.ts'],
      /locations loads|locations list/i,
      /between-hotspots/i,
    ),
    groupProject(
      'group-guides',
      [
        '**/admin-readonly/core-page-loads.readonly.spec.ts',
      ],
      /guides loads|add guide|guide form/i,
    ),
    groupProject(
      'group-staff-agents',
      ['**/admin-readonly/core-page-loads.readonly.spec.ts'],
      /staff loads|staff list|add staff|agents loads|agent list|agent profile|agent dashboard/i,
    ),
    groupProject(
      'group-business-rules',
      ['**/business-rules-invariants.spec.ts'],
      /Business-rule invariant coverage/i,
    ),
    groupProject(
      'group-ui-ux',
      ['**/ui-ux-contract.spec.ts'],
      /@ui-ux/i,
    ),
    {
      name: 'external-sandbox',
      testMatch: '**/external-sandbox/**/*.spec.ts',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'legacy-environment',
      testMatch: '**/legacy-environment/**/*.spec.ts',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'legacy-fixture',
      testMatch: '**/legacy-fixture/**/*.spec.ts',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
