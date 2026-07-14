import { expect, test } from '@playwright/test';
import { loginForToken } from './booking-engine-test-utils';

type ConfirmedItineraryRow = {
  booking_quote_id?: string;
  arrival_location?: string;
  departure_location?: string;
  agent_name?: string;
};

type ConfirmedItineraryResponse = {
  recordsTotal?: number;
  recordsFiltered?: number;
  data?: ConfirmedItineraryRow[];
  error?: string;
};

function isConfirmedItineraryRequest(url: string): boolean {
  return new URL(url).pathname.endsWith('/api/v1/itineraries/confirmed');
}

async function responseJson(response: import('@playwright/test').Response) {
  return (await response.json()) as ConfirmedItineraryResponse;
}

test('confirmed itinerary search filters results and clears correctly', async ({
  page,
  request,
  baseURL,
}) => {
  test.setTimeout(120_000);

  const token = await loginForToken(request);
  await page.addInitScript((accessToken) => {
    window.localStorage.setItem('accessToken', accessToken);
  }, token);

  const initialResponsePromise = page.waitForResponse(
    (response) =>
      isConfirmedItineraryRequest(response.url()) &&
      response.request().method() === 'GET' &&
      !new URL(response.url()).searchParams.has('search'),
  );

  await page.goto(`${baseURL}/confirmed-itinerary`, {
    waitUntil: 'domcontentloaded',
  });

  await expect(page).toHaveURL(/\/confirmed-itinerary$/);
  const searchInput = page.getByRole('textbox', {
    name: 'Search confirmed itineraries',
  });
  await expect(searchInput).toBeVisible();

  const initialResponse = await initialResponsePromise;
  expect(initialResponse.ok()).toBeTruthy();
  const initialBody = await responseJson(initialResponse);

  expect(initialBody.error).toBeFalsy();
  expect(Array.isArray(initialBody.data)).toBeTruthy();
  expect(Number(initialBody.recordsTotal)).toBeGreaterThanOrEqual(0);
  expect(Number(initialBody.recordsFiltered)).toBe(
    Number(initialBody.recordsTotal),
  );

  const firstRow = initialBody.data?.[0];
  expect(firstRow, 'The local test database needs at least one confirmed itinerary').toBeTruthy();

  const searchTerm = String(firstRow?.booking_quote_id || '').trim();
  expect(searchTerm).not.toBe('');

  const matchingResponsePromise = page.waitForResponse((response) => {
    if (!isConfirmedItineraryRequest(response.url()) || response.request().method() !== 'GET') {
      return false;
    }

    return new URL(response.url()).searchParams.get('search') === searchTerm;
  });

  await searchInput.fill(searchTerm);

  const matchingResponse = await matchingResponsePromise;
  expect(matchingResponse.ok()).toBeTruthy();
  const matchingBody = await responseJson(matchingResponse);

  expect(matchingBody.error).toBeFalsy();
  expect(Number(matchingBody.recordsFiltered)).toBeGreaterThan(0);
  expect(matchingBody.data?.length).toBeGreaterThan(0);
  expect(
    matchingBody.data?.some((row) => row.booking_quote_id === searchTerm),
  ).toBeTruthy();
  expect(new URL(matchingResponse.url()).searchParams.has('search[value]')).toBeFalsy();

  const noMatchTerm = `__playwright_no_match_${Date.now()}`;
  const noMatchResponsePromise = page.waitForResponse((response) => {
    if (!isConfirmedItineraryRequest(response.url()) || response.request().method() !== 'GET') {
      return false;
    }

    return new URL(response.url()).searchParams.get('search') === noMatchTerm;
  });

  await searchInput.fill(noMatchTerm);

  const noMatchResponse = await noMatchResponsePromise;
  expect(noMatchResponse.ok()).toBeTruthy();
  const noMatchBody = await responseJson(noMatchResponse);

  expect(noMatchBody.error).toBeFalsy();
  expect(Number(noMatchBody.recordsFiltered)).toBe(0);
  expect(noMatchBody.data ?? []).toHaveLength(0);

  const clearResponsePromise = page.waitForResponse((response) => {
    if (!isConfirmedItineraryRequest(response.url()) || response.request().method() !== 'GET') {
      return false;
    }

    return !new URL(response.url()).searchParams.has('search');
  });

  await page.getByRole('button', { name: 'Clear' }).click();

  await expect(searchInput).toHaveValue('');
  const clearResponse = await clearResponsePromise;
  expect(clearResponse.ok()).toBeTruthy();
  const clearBody = await responseJson(clearResponse);
  expect(clearBody.error).toBeFalsy();
  expect(Number(clearBody.recordsFiltered)).toBe(Number(clearBody.recordsTotal));
});
