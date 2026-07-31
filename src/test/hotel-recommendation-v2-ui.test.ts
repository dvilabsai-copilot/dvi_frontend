import { describe, expect, it } from 'vitest';
import {
  getStayKey,
  isSelectableHotel,
  normalizeMealPlanLabel,
} from '../pages/hotel-list/hotelList.utils';

describe('hotel recommendation v2 UI contract', () => {
  it('uses the backend logical stay key instead of rebuilding a one-night key', () => {
    expect(getStayKey({
      itineraryRouteId: 101,
      date: '2026-08-02',
      day: 'Day 1',
      stayKey: '101|2026-08-02|2026-08-04',
      routeIds: [101, 102],
    })).toBe('101|2026-08-02|2026-08-04');
  });

  it('allows selectable offline approval inventory without live-bookable status', () => {
    expect(isSelectableHotel({
      provider: 'offline',
      bookingMode: 'MANUAL_APPROVAL',
      availabilityStatus: 'OFFLINE_APPROVAL_REQUIRED',
      isBookable: false,
      isLiveBookable: false,
      isSelectable: true,
      totalHotelCost: 1200,
      hotelName: 'Offline Hotel',
    })).toBe(true);
  });

  it('does not convert missing meal data to EP', () => {
    expect(normalizeMealPlanLabel('')).toBe('UNKNOWN');
    expect(normalizeMealPlanLabel('Parking and Wi-Fi included')).toBe('UNKNOWN');
  });
});
