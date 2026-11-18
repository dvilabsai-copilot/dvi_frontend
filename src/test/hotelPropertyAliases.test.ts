import { describe, it, expect } from 'vitest';
import { isSameHotelPropertyIdentity, getHotelSupplierPropertyCode, getRoomTypeFilterOptions } from '@/pages/hotel-list/hotelList.utils';

const saved = { provider: 'axisrooms', canonicalHotelId: 232, hotelId: 232, hotelCode: 'AX_DVI_HOTEL_232' };
const fresh = { provider: 'axisrooms', canonicalHotelId: 232, hotelId: 232, hotelCode: '232' };

describe('AxisRooms room option property identity', () => {
  it('accepts the proven local property alias in both directions', () => {
    expect(isSameHotelPropertyIdentity(saved, fresh)).toBe(true);
    expect(isSameHotelPropertyIdentity(fresh, saved)).toBe(true);
    expect(getHotelSupplierPropertyCode(saved)).toBe('232');
  });
  it('does not alias another property, external mapping or provider', () => {
    expect(isSameHotelPropertyIdentity(saved, { ...fresh, hotelCode: '435' })).toBe(false);
    expect(isSameHotelPropertyIdentity(saved, { ...fresh, canonicalHotelId: 435, hotelId: 435 })).toBe(false);
    expect(isSameHotelPropertyIdentity(saved, { ...fresh, canonicalHotelId: 435, hotelId: 435, hotelCode: 'AX_DVI_HOTEL_435' })).toBe(false);
    expect(isSameHotelPropertyIdentity(saved, { ...fresh, provider: 'staah' })).toBe(false);
    expect(isSameHotelPropertyIdentity({ ...saved, canonicalHotelId: 435, hotelId: 435 }, fresh)).toBe(false);
    expect(isSameHotelPropertyIdentity({ ...saved, provider: 'tbo' }, { ...fresh, provider: 'tbo' })).toBe(false);
  });
  it('retains both eligible room categories while excluding a different property and unpriced room', () => {
    const options = [
      { ...fresh, roomType: 'Club room A/C', totalPrice: 6625 },
      { ...fresh, roomType: 'Club Room With Valley View', totalPrice: 7200 },
      { ...fresh, hotelCode: '435', roomType: 'Other hotel room', totalPrice: 1 },
      { ...fresh, roomType: 'No rate', totalPrice: 0, isSelectable: false },
    ].filter(option => isSameHotelPropertyIdentity(saved, option));
    expect(getRoomTypeFilterOptions(options)).toHaveLength(2);
  });
  it('keeps offline catalog room labels out of the AX property rate choices', () => {
    const catalog = [
      { ...fresh, roomId: 606, roomType: 'Club room A/C', totalPrice: 6625 },
      { ...fresh, roomId: 607, roomType: 'Club with Valley View A/C', totalPrice: 7420 },
      { provider: 'offline', hotelCode: '232', roomType: 'Club Room With Valley View', totalPrice: 7200 },
    ];
    expect(catalog.filter(rate => isSameHotelPropertyIdentity(rate, saved)).map(rate => rate.roomType))
      .toEqual(['Club room A/C', 'Club with Valley View A/C']);
  });
});
