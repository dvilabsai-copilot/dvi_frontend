import { describe, expect, it } from 'vitest';
import { readApiNumber } from '@/pages/hotel-list/HotelRowPriceTooltip';

describe('hotel tooltip pricing contract', () => {
  it('reads direct API values and preserves an API zero', () => {
    expect(readApiNumber({ totalHotelCost: 0, totalRoomCost: 6000 }, 'totalHotelCost', 'totalRoomCost')).toBe(0);
    expect(readApiNumber({ totalRoomCost: 6000 }, 'missing', 'totalRoomCost')).toBe(6000);
    expect(readApiNumber({}, 'totalHotelCost')).toBeNull();
  });
});
