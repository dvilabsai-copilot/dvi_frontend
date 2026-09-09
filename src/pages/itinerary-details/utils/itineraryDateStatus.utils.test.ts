import { describe, expect, it } from 'vitest';
import type { ItineraryDetailsResponse } from '../itinerary-details.types';
import { getItineraryStartDate, isItineraryDateExpired } from './itineraryDateStatus.utils';

type ItineraryDateFields = Pick<ItineraryDetailsResponse, 'days' | 'dateRange'>;

describe('itinerary date status', () => {
  it('uses the first persisted day as the itinerary start date', () => {
    const itinerary = {
      days: [{ date: '2026-09-06T00:00:00.000Z' }],
      dateRange: '2026-09-07 to 2026-09-09',
    } as unknown as ItineraryDateFields;

    expect(getItineraryStartDate(itinerary)).toBe('2026-09-06');
  });

  it('treats a start date before today as expired', () => {
    const itinerary = { days: [{ date: '2026-09-06' }], dateRange: '2026-09-06 to 2026-09-09' } as unknown as ItineraryDateFields;

    expect(isItineraryDateExpired(itinerary, new Date(2026, 8, 9))).toBe(true);
  });

  it('does not expire an itinerary that starts today', () => {
    const itinerary = { days: [{ date: '2026-09-09' }], dateRange: '2026-09-09 to 2026-09-12' } as unknown as ItineraryDateFields;

    expect(isItineraryDateExpired(itinerary, new Date(2026, 8, 9))).toBe(false);
  });
});
