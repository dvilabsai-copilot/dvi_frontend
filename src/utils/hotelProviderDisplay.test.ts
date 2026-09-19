import { describe, expect, it } from 'vitest';
import { getHotelCardProviderDisplayName } from './hotelProviderDisplay';

describe('hotel card provider labels', () => {
  it('marks priority VSR cards with an asterisk', () => {
    expect(getHotelCardProviderDisplayName('tbo', undefined, true)).toBe('VSR*');
  });

  it('keeps non-priority VSR and other provider labels unchanged', () => {
    expect(getHotelCardProviderDisplayName('tbo', undefined, false)).toBe('VSR');
    expect(getHotelCardProviderDisplayName('axisrooms', undefined, true)).toBe('AX');
    expect(getHotelCardProviderDisplayName('offline', undefined, true)).toBe('Offline');
  });
});
