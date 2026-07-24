import { describe, expect, it } from 'vitest';
import { canonicalizeHotelSearchResults, type HotelSearchResult } from '../hooks/useHotelSearch';

const option = (provider: string, rateOptionId: string, pricePerNight: number, extra: Partial<HotelSearchResult> = {}): HotelSearchResult => ({
  provider,
  canonicalHotelId: 153,
  hotelCode: provider === 'offline' ? '153' : 'AX-153',
  hotelName: 'ABC Resort',
  address: 'Munnar',
  rating: 4,
  price: pricePerNight,
  pricePerNight,
  totalStayPrice: pricePerNight * 2,
  currency: 'INR',
  roomTypes: [],
  searchReference: rateOptionId,
  rateOptionId,
  isSelectable: true,
  isLiveRate: provider !== 'offline',
  isLiveBookable: provider !== 'offline',
  requiresHotelApproval: provider === 'offline',
  priceSource: provider === 'offline' ? 'DATABASE' : 'LIVE_API',
  bookingMode: provider === 'offline' ? 'MANUAL_APPROVAL' : 'LIVE_API',
  availabilityStatus: provider === 'offline' ? 'OFFLINE_APPROVAL_REQUIRED' : 'LIVE_AVAILABLE',
  approvalStatus: provider === 'offline' ? 'NOT_REQUESTED' : 'NOT_REQUIRED',
  ...extra,
});

describe('offline and AxisRooms canonical hotel cards', () => {
  it('renders one canonical hotel with live default and offline alternative', () => {
    const cards = canonicalizeHotelSearchResults([
      option('offline', 'offline:153:22:7:2099-01-01:2099-01-03', 4500),
      option('axisrooms', 'axisrooms:153:22:RP:2099-01-01', 5200),
    ]);
    expect(cards).toHaveLength(1);
    expect(cards[0].provider).toBe('axisrooms');
    expect(cards[0].rateOptions).toHaveLength(2);
    expect(cards[0].rateOptions?.some((rate) => rate.provider === 'offline')).toBe(true);
  });

  it('uses offline as default only when there is no live-bookable AxisRooms rate', () => {
    const cards = canonicalizeHotelSearchResults([
      option('offline', 'offline:153:22:7:2099-01-01:2099-01-03', 4500),
    ]);
    expect(cards[0]).toMatchObject({ provider: 'offline', priceSource: 'DATABASE', approvalStatus: 'NOT_REQUESTED', requiresHotelApproval: true, isLiveBookable: false });
  });

  it('removes only exact duplicate rate options and retains room/meal alternatives', () => {
    const cards = canonicalizeHotelSearchResults([
      option('offline', 'offline:153:22:7:2099-01-01:2099-01-03', 4500, { mealPlan: 'CP' }),
      option('offline', 'offline:153:22:7:2099-01-01:2099-01-03', 4500, { mealPlan: 'CP' }),
      option('offline', 'offline:153:22:7:2099-01-01:2099-01-03', 4700, { mealPlan: 'AP' }),
    ]);
    expect(cards[0].rateOptions).toHaveLength(2);
    expect(cards[0].rateOptions?.map((rate) => rate.mealPlan)).toEqual(expect.arrayContaining(['CP', 'AP']));
  });
});
