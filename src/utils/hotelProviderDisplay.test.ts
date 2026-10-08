import { describe, expect, it } from 'vitest';
import { getHotelCardProviderDisplayName, isDirectApiTboRate } from './hotelProviderDisplay';

describe('hotel card provider labels', () => {
  it('marks priority VSR cards with an asterisk', () => {
    expect(getHotelCardProviderDisplayName('tbo', undefined, true)).toBe('VSR*');
  });

  it('marks a priority VSR card with # when its rate is direct from the API', () => {
    expect(getHotelCardProviderDisplayName('tbo', undefined, true, true)).toBe('VSR*#');
  });

  it('marks a non-priority direct VSR rate with #', () => {
    expect(getHotelCardProviderDisplayName('tbo', undefined, false, true)).toBe('VSR#');
  });

  it('keeps non-priority VSR and other provider labels unchanged', () => {
    expect(getHotelCardProviderDisplayName('tbo', undefined, false)).toBe('VSR');
    expect(getHotelCardProviderDisplayName('axisrooms', undefined, true)).toBe('AX');
    expect(getHotelCardProviderDisplayName('offline', undefined, true)).toBe('Offline');
  });

  it('recognizes live TBO rates but excludes synthetic MAP fallback rates', () => {
    expect(isDirectApiTboRate({ provider: 'tbo', priceSource: 'LIVE_API' })).toBe(true);
    expect(isDirectApiTboRate({ provider: 'tbo', isLiveRate: true })).toBe(true);
    expect(isDirectApiTboRate({
      provider: 'tbo',
      priceSource: 'LIVE_API',
      isLiveRate: true,
      tboMapFallbackApplied: true,
    })).toBe(false);
  });

  it('never marks offline rates as direct supplier API rates', () => {
    expect(isDirectApiTboRate({ provider: 'offline', priceSource: 'LIVE_API', isLiveRate: true })).toBe(false);
    expect(getHotelCardProviderDisplayName('offline', undefined, false, true)).toBe('Offline');
  });
});
