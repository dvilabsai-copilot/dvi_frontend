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
      return url.hostname === 'api.razorpay.com' || url.hostname === 'cdn.razorpay.com' || url.hostname === 'images.unsplash.com';
    };
    const isNonBlockingBackgroundUrl = (urlString: string) => {
      const url = new URL(urlString);
      return [
        '/api/v1/meta/cities',
        '/api/v1/meta/states',
        '/api/v1/hotels',
        '/api/v1/hotspots',
        '/api/v1/activities/storefront',
        '/api/v1/itinerary-dropdowns/locations',
        '/api/v1/locations/dropdowns',
        '/api/v1/locations',
        '/api/v1/guides/dropdowns/hotspots',
        '/api/v1/guides/dropdowns/states',
        '/api/v1/guides/dropdowns/cities',
        '/api/v1/guides/dropdowns/gst-percentages',
        '/api/v1/agents/full',
        '/api/v1/staff/roles',
        '/api/v1/itineraries/wallet-balance',
        '/api/v1/itineraries/wallet-balance/8',
        '/api/v1/itineraries/latest/locations',
        '/api/v1/itineraries/latest',
        '/api/v1/agents/8',
        '/api/v1/agents/8/wallet/cash',
        '/api/v1/agents/8/wallet/coupon',
        '/api/v1/hotels/categories',
        '/api/v1/meta/countries',
        '/api/v1/meta/gst/types',
        '/api/v1/meta/gst/percentages',
        '/api/v1/vehicle-availability',
        '/api/v1/vehicle-availability/locations',
        '/api/v1/dropdowns/countries',
        '/api/v1/dropdowns/roles',
        '/api/v1/dropdowns/gst-percents',
      ].includes(url.pathname);
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
        let responseContentType: string | null = null;
        try {
          responseContentType = await response.headerValue('content-type');
        } catch (error: unknown) {
          if (!String(error).includes('Target page, context or browser has been closed')) throw error;
        }
        requests.push({ method: request.method(), url: `${url.origin}${url.pathname}${url.search}`, status: response.status(), requestPayload: payloadMarker(request), responseContentType, externalHost });
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
        const unfinished = [...pending].filter((url) => !isIgnoredExternalUrl(url) && !isNonBlockingBackgroundUrl(url));
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
