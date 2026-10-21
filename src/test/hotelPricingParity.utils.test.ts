import { describe, expect, it } from 'vitest';
import {
  assertBackendPricingContract,
  formatOccupancyCase,
  getBackendBreakdown,
  getBackendPayable,
} from './hotelPricingParity.utils';

const cases = [
  { provider: 'tbo', noOfRooms: 1, totalRoomCost: 10000, totalExtraBedCost: 0, hotelMarginAmount: 1000, hotelMarginGstAmount: 180, totalHotelCost: 11000, totalPrice: 11000 },
  { provider: 'vsr', noOfRooms: 2, totalRoomCost: 18000, totalExtraBedCost: 1200, hotelMarginAmount: 1920, totalHotelCost: 21120, totalPrice: 21120, extraBedCount: 1 },
  { provider: 'axisrooms', noOfRooms: 3, totalRoomCost: 24840, totalExtraBedCost: 700, hotelMarginAmount: 1532.4, totalHotelCost: 27072.4, totalPrice: 27072.4, extraBedCount: 1 },
  { provider: 'offline', noOfRooms: 2, totalRoomCost: 12000, hotelMealPlanCost: 800, hotelMarginAmount: 640, totalHotelCost: 13440, totalPrice: 13440 },
];

describe('backend hotel pricing parity contract', () => {
  it.each(cases)('accepts the $provider occupancy case', (record) => {
    expect(getBackendPayable(record)).toBe(record.totalHotelCost);
    expect(getBackendBreakdown(record)?.expected).toBe(record.totalHotelCost);
    expect(formatOccupancyCase(record)).toContain(`${record.provider}|rooms=${record.noOfRooms}`);
  });

  it('rejects a missing authoritative payable field', () => {
    expect(() => getBackendPayable({ pricePerNight: 9518.8 })).toThrow(/totalHotelCost or totalPrice/);
  });

  it('rejects contradictory backend totals', () => {
    expect(() => getBackendPayable({ totalHotelCost: 27072.4, totalPrice: 9518.8 })).toThrow(/differs from totalPrice/);
  });

  it('rejects a breakdown that does not reconcile to the backend payable', () => {
    expect(() => assertBackendPricingContract({
      hotels: [{ provider: 'axisrooms', isSelected: true, totalRoomCost: 24840, totalExtraBedCost: 700, hotelMarginAmount: 1532.4, totalHotelCost: 9518.8 }],
      hotelTabs: [{ groupType: 1, totalAmount: 9518.8 }],
    })).toThrow(/breakdown totals/);
  });
});
