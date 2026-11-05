import { describe, expect, it } from 'vitest';
import { resolveHotelBoundTravelDestination } from './hotelTravelLabel.utils';

describe('resolveHotelBoundTravelDestination', () => {
  it('uses the current selected hotel when a stale named destination precedes check-in', () => {
    expect(resolveHotelBoundTravelDestination({
      rawDestination: 'HAVELI BACKWATER RESORT',
      nextSegment: { type: 'checkin' },
      currentHotelName: 'Pagoda Resorts',
    })).toBe('Pagoda Resorts');
  });

  it('preserves non-hotel travel destinations', () => {
    expect(resolveHotelBoundTravelDestination({
      rawDestination: 'Alleppy Railway Station',
      nextSegment: { type: 'travel' },
      currentHotelName: 'Pagoda Resorts',
      destinationHotelDisplayName: 'Pagoda Resorts',
    })).toBe('Alleppy Railway Station');
  });

  it('keeps the existing generic hotel fallback', () => {
    expect(resolveHotelBoundTravelDestination({
      rawDestination: 'Hotel',
      destinationHotelDisplayName: 'Pagoda Resorts',
    })).toBe('Pagoda Resorts');
  });
});
