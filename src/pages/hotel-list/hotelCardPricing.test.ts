import { describe, expect, it } from 'vitest';
import { getHotelCardPricing, getHotelRoutePayable, quoteFromHotelPreview } from './hotelCardPricing';

const scope = { routeId: 26404, date: '2026-12-06', roomCount: 1 };
const current = (price: number) => ({ selectedPricePerNight: price, pricePerNight: price, totalPrice: price });
const quote = (price: number) => ({ cardQuote: { basis: 'ROUTE_NIGHT', ...scope, currency: 'INR', payableAmount: price, baseAmount: price } });

describe('hotel card and confirmation payable comparison', () => {
  it('ignores corrupted nested price/night metadata and stale API deltas', () => {
    const candidate = { ...quote(3278.72), pricePerNight: 819.68, totalPrice: 1639.36, numberOfNights: 4, priceDifference: -2459.04 };
    expect(getHotelCardPricing(candidate, current(3527.63), scope)).toMatchObject({ startingFromAmount: 3278.72, priceDifference: -248.91 });
    expect(getHotelCardPricing(quote(3527.63), current(3278.72), scope).priceDifference).toBe(248.91);
    expect(getHotelCardPricing(quote(3278.72), current(3278.72), scope).priceDifference).toBe(0);
  });
  it('uses the AX payable quote instead of the marketing/base amount', () => {
    expect(getHotelCardPricing({ ...quote(3745), pricePerNight: 3500 }, current(3527.63), scope).priceDifference).toBe(217.37);
    expect(getHotelCardPricing(quote(3592.44), current(3527.63), scope).priceDifference).toBe(64.81);
  });
  it('normalizes display per room but compares whole occupancy totals once', () => {
    const candidate = quote(8660);
    candidate.cardQuote.roomCount = 2;
    expect(getHotelCardPricing(candidate, current(8000), { ...scope, roomCount: 2 })).toMatchObject({ startingFromAmount: 4330, priceDifference: 660 });
  });
  it('rejects missing/unavailable/stale route/date/room quotes and foreign currency', () => {
    expect(getHotelRoutePayable({ pricePerNight: 819.68 })).toBeNull();
    expect(getHotelRoutePayable({ cardQuote: null }, true)).toBeNull();
    for (const changed of [{ routeId: 99 }, { date: '2026-12-07' }, { roomCount: 2 }]) {
      expect(getHotelCardPricing(quote(3278.72), current(3527.63), { ...scope, ...changed }).priceDifference).toBeNull();
    }
    expect(getHotelCardPricing(quote(3278.72), { ...current(3527.63), currency: 'USD' }, scope).priceDifference).toBeNull();
  });
  it('preview and card use identical route payable after rerender/group switches', () => {
    const preview = { totalPrice: 3278.72, pricePerNight: 3278.72 };
    const candidate = { ...preview, cardQuote: quoteFromHotelPreview(preview, scope.routeId, scope.date, 1) };
    expect(getHotelRoutePayable(candidate, true)).toBe(3278.72);
    for (const baseline of [3527.63, 3278.72, 3527.63]) {
      expect(getHotelCardPricing(candidate, current(baseline), scope).priceDifference).toBe(Number((3278.72 - baseline).toFixed(2)));
    }
  });
});
