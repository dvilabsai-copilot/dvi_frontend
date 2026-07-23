import { describe, expect, it } from 'vitest';
import { resolveActivePreviewResolution } from '../pages/itinerary-details/utils/activePreviewResolution.utils';
import { resolveActivePreviewTimeline } from '../pages/itinerary-details/utils/activePreviewTimeline.utils';
import { getFitHereTriedState } from '../pages/itinerary-details/utils/fitHereAttemptStatus.utils';
import { normalizeAvailableHotspots } from '../pages/itinerary-details/utils/hotspotAvailability.utils';
import type { AvailableHotspot } from '../pages/itinerary-details/itinerary-details.types';
import { getHotelOptionKey } from '../pages/hotel-list/hotelList.utils';
import { mergeHotelSelections } from '../pages/itinerary-details/hooks/useHotelSelectionsChangeMutation';

const hotspot = (id: number, name = `Hotspot ${id}`): AvailableHotspot => ({
  id,
  name,
  amount: 0,
  description: '',
  timeSpend: 60,
  locationMap: null,
});

describe('itinerary details pure utilities', () => {
  it('resolves manual preview state before group and selected-hotspot fallbacks', () => {
    const selected = { source: 'selected' };
    const group = { source: 'group' };
    const manual = { resolution: { source: 'manual-resolution' } };

    expect(resolveActivePreviewResolution(manual, group, 7, { 7: selected })).toEqual(manual.resolution);
    expect(resolveActivePreviewResolution(null, group, 7, { 7: selected })).toEqual(group);
    expect(resolveActivePreviewResolution(null, null, 7, { 7: selected })).toEqual(selected);
    expect(resolveActivePreviewResolution(null, null, null, {})).toBeNull();
  });

  it('normalizes active and excluded hotspot actions without dropping backend rows', () => {
    const rows = [
      hotspot(1),
      { ...hotspot(2), availabilityStatus: 'EXCLUDED_BY_ROUTE' as const },
      hotspot(3),
    ];

    const normalized = normalizeAvailableHotspots(rows, {
      excludedIds: [2],
      activeIds: new Set([1]),
      manualMetaById: new Map([[1, { routeHotspotId: 101, isManual: true }]]),
    });

    expect(normalized).toHaveLength(3);
    expect(normalized[0]).toMatchObject({
      alreadyAdded: true,
      availabilityStatus: 'ACTIVE_THIS_ROUTE',
      actionDisabled: true,
      buttonLabel: 'Added',
      routeHotspotId: 101,
      isManual: true,
    });
    expect(normalized[1]).toMatchObject({
      availabilityStatus: 'EXCLUDED_BY_ROUTE',
      actionDisabled: false,
      buttonLabel: 'Preview',
    });
    expect(normalized[2]).toEqual(rows[2]);
  });

  it('filters removed and unrelated route rows, then orders a preview by schedule', () => {
    const rows = [
      { id: 10, itinerary_route_ID: 2, timeRange: '09:00 AM - 10:00 AM', type: 'attraction' },
      { id: 11, itinerary_route_ID: 1, timeRange: '11:00 AM - 12:00 PM', type: 'attraction' },
      { id: 12, itinerary_route_ID: 1, timeRange: '08:00 AM - 09:00 AM', type: 'travel' },
      { id: 13, hotspotId: 13, itinerary_route_ID: 1, timeRange: '10:00 AM - 11:00 AM', type: 'attraction' },
    ];

    expect(resolveActivePreviewTimeline(rows, { removedHotspots: [{ id: 13 }] }, 1)).toEqual([
      rows[2],
      rows[1],
    ]);
  });

  it('maps fit-here result types to stable user-facing status labels', () => {
    expect(getFitHereTriedState('FITS_DIRECTLY')).toEqual({ status: 'DIRECT_FIT', label: 'Tried: fits directly' });
    expect(getFitHereTriedState('requires_p3_confirmation')).toEqual({
      status: 'P3_CONFIRMATION',
      label: 'Tried: needs P3 confirmation',
    });
    expect(getFitHereTriedState('unknown')).toEqual({ status: 'CANNOT_FIT', label: 'Tried: does not fit' });
  });

  it('treats room, meal, booking, and supplier identity changes as rate changes even at the same price', () => {
    const confirmed = {
      provider: 'staah',
      hotelCode: '629',
      hotelName: 'Paloma Back Water Resort',
      bookingCode: 'old-booking',
      searchReference: 'old-search',
      roomType: 'Deluxe Room',
      mealPlan: 'CP',
      roomId: 'room-1',
      rateId: 'rate-1',
      totalHotelCost: 8900,
      totalHotelTaxAmount: 0,
    };

    expect(getHotelOptionKey({ ...confirmed })).toBe(getHotelOptionKey({ ...confirmed }));
    expect(getHotelOptionKey({ ...confirmed, roomType: 'Suite Room' })).not.toBe(getHotelOptionKey(confirmed));
    expect(getHotelOptionKey({ ...confirmed, mealPlan: 'MAP' })).not.toBe(getHotelOptionKey(confirmed));
    expect(getHotelOptionKey({ ...confirmed, bookingCode: 'new-booking', totalHotelCost: 8900 })).not.toBe(getHotelOptionKey(confirmed));
    expect(getHotelOptionKey({ ...confirmed, totalHotelCost: 9500 })).not.toBe(getHotelOptionKey(confirmed));
    expect(getHotelOptionKey({ ...confirmed, nightlyRates: [{ date: '2026-07-28', amountAfterTax: 8900 }] })).not.toBe(getHotelOptionKey(confirmed));
  });

  it('replaces the complete affected selection instead of carrying old rate fields', () => {
    const previous = {
      provider: 'staah',
      hotelCode: '629',
      hotelName: 'Paloma Back Water Resort',
      bookingCode: 'old-booking',
      searchReference: 'old-search',
      roomType: 'Deluxe Room',
      mealPlan: 'CP',
      netAmount: 8900,
      checkInDate: '2026-07-28',
      checkOutDate: '2026-07-29',
      groupType: 1,
      nightlyRates: [{ date: '2026-07-28', amountAfterTax: 8900 }],
    };
    const next = {
      ...previous,
      bookingCode: 'new-booking',
      searchReference: 'new-search',
      roomType: 'Suite Room',
      mealPlan: 'MAP',
      netAmount: 9500,
      nightlyRates: [{ date: '2026-07-28', amountAfterTax: 9500 }],
    };

    const merged = mergeHotelSelections({ 42: previous }, { 42: next });
    expect(merged[42]).toEqual({ ...next, routeId: 42 });
    expect(merged[42].bookingCode).toBe('new-booking');
    expect(merged[42].nightlyRates).toEqual([{ date: '2026-07-28', amountAfterTax: 9500 }]);
  });
});
