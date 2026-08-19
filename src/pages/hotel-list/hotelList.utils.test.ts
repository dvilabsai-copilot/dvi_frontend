import { describe, expect, it } from 'vitest';
import {
  getHotelCardGroupingIdentity,
  getHotelRateIdentity,
  findHotelSelectionForStay,
  isSameHotelRateIdentity,
  isSameHotelPropertyIdentity,
} from './hotelList.utils';

describe('hotel supplier identity', () => {
  it('groups providerHotelCode and hotelCode aliases into one HOBSE card', () => {
    const a = { provider: 'HOBSE', hotelCode: 'ABC', hotelName: 'juSTa Sarang Rameshwaram' };
    const b = { provider: 'hobse', providerHotelCode: 'ABC', hotelCode: 'ABC', hotelName: a.hotelName };
    expect(getHotelCardGroupingIdentity(a)).toBe(getHotelCardGroupingIdentity(b));
    expect(isSameHotelPropertyIdentity(a, b)).toBe(true);
  });

  it('keeps different supplier properties separate', () => {
    expect(getHotelCardGroupingIdentity({ provider: 'resavenue', hotelCode: '20' }))
      .not.toBe(getHotelCardGroupingIdentity({ provider: 'resavenue', hotelCode: '21' }));
  });

  it('includes the exact rateOptionId in the selected-rate identity', () => {
    const map = getHotelRateIdentity({ provider: 'axisrooms', hotelCode: '237', rateOptionId: 'axisrooms:237:625:MAP_PLAN:2026-08-25' });
    const cp = getHotelRateIdentity({ provider: 'axisrooms', hotelCode: '237', rateOptionId: 'axisrooms:237:625:CP_PLAN:2026-08-25' });
    expect(map).not.toBe(cp);
    expect(map).toContain('axisrooms:237:625:map_plan:2026-08-25');
  });

  it('matches an exact MAP rate across provider hotel-code aliases', () => {
    const selected = {
      provider: 'axisrooms',
      hotelCode: 'AX_DVI_HOTEL_237',
      rateOptionId: 'axisrooms:237:625:MAP_PLAN:2026-08-25',
      mealPlan: 'Modified American Plan',
    };
    const cardOption = {
      provider: 'axisrooms',
      hotelCode: '237',
      rateOptionId: 'axisrooms:237:625:MAP_PLAN:2026-08-25',
      mealPlan: 'MAP',
    };
    expect(isSameHotelRateIdentity(selected, cardOption)).toBe(true);
  });

  it('matches an anchor-night selection to a continuous-stay inventory row', () => {
    const selection = { itineraryRouteId: 10719, date: '2026-08-22', hotelName: 'Eastend Munnar' };
    const stayRow = {
      itineraryRouteId: 10719,
      routeIds: [10719, 10720],
      date: '2026-08-22',
      stayKey: 'axisrooms:504:2026-08-22_to_2026-08-24',
      hotelName: 'AURUM RESORT',
    };
    expect(findHotelSelectionForStay({ '10719::2026-08-22': selection }, stayRow, (value) => value.stayKey || `${value.itineraryRouteId}::${value.date}`))
      .toBe(selection);
  });
});
