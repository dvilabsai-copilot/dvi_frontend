import { describe, expect, it } from 'vitest';
import {
  expandHotelRowsForClipboard,
  getClipboardHotelDayLabel,
} from '@/pages/itinerary-details/utils/clipboardHotelRows.utils';

describe('clipboard early-arrival hotel rows', () => {
  it('adds a display-only Day 0 row from persisted camel-case metadata', () => {
    const rows = expandHotelRowsForClipboard([{
      day: 'Day 1',
      date: '2026-08-31',
      hotelName: 'MAMALLA HERITAGE',
      earlyCheckIn: true,
      hotelCheckInDate: '2026-08-30',
    }]);

    expect(rows).toHaveLength(2);
    expect(getClipboardHotelDayLabel(rows[0], 1)).toBe('Day- 0 | 2026-08-30');
    expect(rows[0].previousDayBillingSynthetic).toBe(true);
    expect(rows[1].previousDayBillingSynthetic).toBeUndefined();
  });

  it('supports persisted snake-case or nested selection metadata', () => {
    expect(expandHotelRowsForClipboard([{
      date: '2026-08-31',
      selection: { early_checkin: 1, hotel_check_in_date: '2026-08-30' },
    }])).toHaveLength(2);
  });

  it('does not repeat Day 0 when the marker row is also present', () => {
    const rows = expandHotelRowsForClipboard([
      {
        itineraryRouteId: 1,
        date: '2026-08-31',
        hotelName: 'MAMALLA HERITAGE',
        earlyCheckIn: true,
        hotelCheckInDate: '2026-08-30',
      },
      {
        itineraryRouteId: 2,
        date: '2026-09-01',
        hotelName: 'MAMALLA HERITAGE',
        earlyCheckIn: true,
        hotelCheckInDate: '2026-08-30',
      },
    ]);

    expect(rows.filter((row) => row.__clipboardDayZero === true)).toHaveLength(1);
    expect(rows.filter((row) => row.previousDayBillingSynthetic !== true)).toHaveLength(2);
  });
});
