import { describe, expect, it } from 'vitest';
import { resolveAuthoritativeHotelMargin } from '@/pages/hotel-list/HotelRowPriceTooltip';

describe('hotel tooltip margin breakdown', () => {
  it('uses an authoritative margin amount and percentage', () => {
    expect(resolveAuthoritativeHotelMargin({
      baseAmount: 2600,
      payableAmount: 2860,
      marginPercentage: 10,
      marginAmount: 260,
      sameScope: true,
    })).toEqual({ percentage: 10, marginAmount: 260, unavailable: false });
  });

  it('never derives 100 percent from a stay total and nightly amount', () => {
    expect(resolveAuthoritativeHotelMargin({
      baseAmount: 2420,
      payableAmount: 4840,
      marginPercentage: 0,
      marginAmount: 0,
      sameScope: false,
    })).toEqual({ percentage: 0, marginAmount: 0, unavailable: true });
  });

  it('does not combine an explicit percentage with a base from another rate', () => {
    expect(resolveAuthoritativeHotelMargin({
      baseAmount: 2600,
      payableAmount: 5720,
      marginPercentage: 20,
      marginAmount: 0,
      sameScope: false,
    })).toEqual({ percentage: 20, marginAmount: 0, unavailable: true });
  });
});
