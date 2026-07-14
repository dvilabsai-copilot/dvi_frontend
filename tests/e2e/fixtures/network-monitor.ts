import { test as base, expect, type Page } from '@playwright/test';

export type NetworkMonitor = {
  allowStatus: (status: number, method?: string, path?: string) => void;
  requests: Array<{
    method: string;
    url: string;
    status?: number;
    failed?: string;
    requestPayload?: '[redacted]' | null;
    responseContentType?: string | null;
    externalHost?: boolean;
  }>;
  externalHosts: string[];
};

export function createNetworkMonitor(page: Page): NetworkMonitor & { finish: () => Promise<void> } {
    const requests: NetworkMonitor['requests'] = [];
    const externalHostSet = new Set<string>();
    const externalHosts: string[] = [];
    const unexpectedErrors: string[] = [];
    const monitorTasks: Promise<void>[] = [];
    const pending = new Set<string>();
    const allowed = new Set<string>();
    const internalOrigins = new Set([process.env.E2E_FRONTEND_BASE_URL, process.env.E2E_API_BASE_URL].filter(Boolean).map((value) => new URL(value as string).origin));
    const trackExternalHost = (origin: string) => {
      if (!externalHostSet.has(origin)) {
        externalHostSet.add(origin);
        externalHosts.push(origin);
      }
    };
    const allowStatus = (status: number, method = '*', path = '*') => allowed.add(`${method} ${status} ${path}`);
    const isAllowed = (status: number, method: string, url: string) =>
      [...allowed].some((rule) => {
        const [ruleMethod, ruleStatus, rulePath] = rule.split(' ');
        return (ruleMethod === '*' || ruleMethod === method) && ruleStatus === String(status) && (rulePath === '*' || url.includes(rulePath));
      });

    const requestUrl = (request: import('@playwright/test').Request) => {
      const url = new URL(request.url());
      return `${url.origin}${url.pathname}${url.search}`;
    };
    const isIgnoredExternalUrl = (urlString: string) => {
      const url = new URL(urlString);
      return url.hostname === 'api.razorpay.com' || url.hostname === 'cdn.razorpay.com';
    };
    const payloadMarker = (request: import('@playwright/test').Request): '[redacted]' | null => request.postData() ? '[redacted]' : null;

    page.on('request', (request) => {
      const url = new URL(request.url());
      pending.add(requestUrl(request));
      if (!internalOrigins.has(url.origin)) trackExternalHost(url.origin);
    });
    page.on('response', (response) => {
      const monitorTask = (async () => {
        const url = new URL(response.url());
        const request = response.request();
        const externalHost = !internalOrigins.has(url.origin);
        if (externalHost) trackExternalHost(url.origin);
        requests.push({ method: request.method(), url: `${url.origin}${url.pathname}${url.search}`, status: response.status(), requestPayload: payloadMarker(request), responseContentType: (await response.headerValue('content-type')) ?? null, externalHost });
        if (response.status() >= 400 && !isIgnoredExternalUrl(response.url()) && !isAllowed(response.status(), response.request().method(), url.pathname)) {
          unexpectedErrors.push(`Unexpected HTTP ${response.status()} ${response.request().method()} ${url.pathname}`);
        }
      })();
      monitorTasks.push(monitorTask);
    });
    page.on('requestfinished', (request) => pending.delete(requestUrl(request)));
    page.on('requestfailed', (request) => {
      const url = new URL(request.url());
      pending.delete(requestUrl(request));
      requests.push({ method: request.method(), url: `${url.origin}${url.pathname}${url.search}`, failed: request.failure()?.errorText, requestPayload: payloadMarker(request), externalHost: !internalOrigins.has(url.origin) });
      if (!isIgnoredExternalUrl(request.url())) {
        unexpectedErrors.push(`Failed request ${request.method()} ${url.pathname}: ${request.failure()?.errorText ?? 'unknown'}`);
      }
    });
    page.on('pageerror', (error) => { unexpectedErrors.push(`Browser page error: ${error.message}`); });
    page.on('console', (message) => {
      if (message.type() === 'error') unexpectedErrors.push(`Browser console error: ${message.text()}`);
    });
    return {
      allowStatus,
      requests,
      externalHosts,
      finish: async () => {
        await Promise.all(monitorTasks);
        const unfinished = [...pending].filter((url) => !isIgnoredExternalUrl(url));
        if (unfinished.length) unexpectedErrors.push(`Unfinished requests: ${unfinished.join(', ')}`);
        if (unexpectedErrors.length) throw new Error(unexpectedErrors.join('\n'));
      },
    };
}

export const test = base.extend<{ networkMonitor: NetworkMonitor }>({
  networkMonitor: async ({ page }, fixtureUse) => {
    const monitor = createNetworkMonitor(page);
    await fixtureUse(monitor);
    await monitor.finish();
  },
});

export { expect };
