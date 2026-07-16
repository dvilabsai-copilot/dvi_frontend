import { test as base, expect, type Page } from '@playwright/test';
import { createNetworkMonitor } from './network-monitor';

type Credentials = { email: string; password: string };
type AuthFixtures = { adminPage: Page; agentPage: Page };

function required(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Missing ${name}; run E2E preflight before using authenticated fixtures`);
  return value;
}

async function authenticatedPage(page: Page, credentials: Credentials, apiBaseUrl: string): Promise<void> {
  const response = await page.request.post(`${apiBaseUrl}/auth/login`, { data: credentials });
  if (!response.ok()) throw new Error(`E2E authentication failed with status ${response.status()}`);
  const body = (await response.json()) as { accessToken?: unknown };
  if (typeof body.accessToken !== 'string' || !body.accessToken) throw new Error('E2E authentication response did not contain an access token');
  await page.addInitScript((token) => window.localStorage.setItem('accessToken', token), body.accessToken);
}

export const test = base.extend<AuthFixtures>({
  adminPage: async ({ browser }, fixtureUse) => {
    const context = await browser.newContext({ baseURL: required('E2E_FRONTEND_BASE_URL') });
    const page = await context.newPage();
    const monitor = createNetworkMonitor(page);
    try {
      await authenticatedPage(page, { email: required('E2E_ADMIN_EMAIL'), password: required('E2E_ADMIN_PASSWORD') }, required('E2E_API_BASE_URL'));
      await fixtureUse(page);
    } finally {
      await monitor.finish();
      await context.close();
    }
  },
  agentPage: async ({ browser }, fixtureUse) => {
    const context = await browser.newContext({ baseURL: required('E2E_FRONTEND_BASE_URL') });
    const page = await context.newPage();
    const monitor = createNetworkMonitor(page);
    try {
      await authenticatedPage(page, { email: required('E2E_AGENT_EMAIL'), password: required('E2E_AGENT_PASSWORD') }, required('E2E_API_BASE_URL'));
      await fixtureUse(page);
    } finally {
      await monitor.finish();
      await context.close();
    }
  },
});

export { expect };
