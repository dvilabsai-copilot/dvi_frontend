import { describe, expect, it } from 'vitest';
import {
  getHotelCardGroupingIdentity,
  getHotelRateIdentity,
  findHotelSelectionForStay,
  isSameHotelRateIdentity,
  isSameHotelPropertyIdentity,
  isSelectableHotel,
  mergeHotelOptions,
} from './hotelList.utils';

describe('hotel supplier identity', () => {
  it('excludes supplement-only room types but keeps a room with a base rate selectable', () => {
    const suite = {
      provider: 'axisrooms',
      hotelName: 'Hotel X',
      roomType: 'Suite Room AC',
      totalHotelCost: 6700,
      baseHotelCost: 0,
      extraBedRate: 5000,
      childWithoutBedRate: 1700,
      isBookable: true,
      isSelectable: true,
    };
    const deluxe = {
      ...suite,
      roomType: 'Deluxe Room AC',
      baseHotelCost: 4400,
      totalHotelCost: 6100,
    };

    expect(isSelectableHotel(suite as any)).toBe(false);
    expect(isSelectableHotel(deluxe as any)).toBe(true);
  });

  it('collapses identical visible offers while retaining distinct supplier rate identities', () => {
    const options = mergeHotelOptions([
      { provider: 'tbo', hotelCode: '5004143', hotelName: 'Itsy Hotels Deluxe Inn', roomType: 'Economy Double Room,1 Queen Bed', mealPlan: 'CP', pricePerNight: 2916.7, rateOptionId: 'booking-a' } as any,
      { provider: 'tbo', hotelCode: '5004143', hotelName: 'Itsy Hotels Deluxe Inn', roomType: 'Economy Double Room,1 Queen Bed', mealPlan: 'CP', pricePerNight: 2916.7, rateOptionId: 'booking-b' } as any,
      { provider: 'tbo', hotelCode: '5004143', hotelName: 'Itsy Hotels Deluxe Inn', roomType: 'Economy Double Room,1 Queen Bed', mealPlan: 'CP', pricePerNight: 3000, rateOptionId: 'booking-c' } as any,
    ]);

    expect(options).toHaveLength(2);
    expect(options[0].rateOptions).toHaveLength(2);
    expect(options[0].rateOptions?.map((option: any) => option.rateOptionId)).toEqual(['booking-a', 'booking-b']);
  });

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

  it('uses the VSR supplier hotel code before an inconsistent internal canonical id', () => {
    const first = {
      provider: 'tbo',
      canonicalHotelId: 9001,
      providerHotelCode: '1186072',
      hotelName: 'Eastend Munnar',
    };
    const second = {
      provider: 'tbo',
      canonicalHotelId: 9002,
      providerHotelCode: '1186072',
      hotelName: 'Eastend Munnar',
    };

    expect(getHotelCardGroupingIdentity(first)).toBe(getHotelCardGroupingIdentity(second));
  });

  it('groups duplicate VSR rows by provider and displayed property name', () => {
    const first = {
      provider: 'tbo',
      hotelId: 1129627,
      hotelCode: '1129627',
      hotelName: 'Mount Residency',
      roomType: 'Standard Double Room',
      rateOptionId: 'rate-1',
    };
    const second = {
      provider: 'tbo',
      hotelId: 998877,
      hotelCode: 'different-normalized-id',
      hotelName: 'Mount Residency',
      roomType: 'Standard Double Room',
      rateOptionId: 'rate-2',
    };

    expect(getHotelCardGroupingIdentity(first)).toBe(getHotelCardGroupingIdentity(second));
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
