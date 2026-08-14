import { describe, expect, it } from 'vitest';
import {
  buildAuthoritativeSelectedHotelRow,
  getAuthoritativeSelectedHotelForCards,
  getMissingAuthoritativeSelectionFields,
  getIdentitySafeSelectedPriceSnapshot,
} from '@/pages/hotel-list/hotelList.utils';

const spriseSnapshot = {
  provider: 'offline',
  canonicalHotelId: 435,
  hotelCode: '435',
  rateOptionId: 'sprise-rate',
  basePricePerNight: 4750,
  baseTotalPrice: 4750,
  hotelMarginPercentage: 20,
  hotelMarginAmount: 950,
  hotelMarginTotalAmount: 950,
  pricePerNight: 5700,
  totalPrice: 5700,
};

describe('post-selection hotel price hydration', () => {
  it('does not mark a display-only meal-plan fallback as the selected card', () => {
    const epFallback = {
      provider: 'resavenue',
      hotelName: 'Vinayaga Inn by Poppys Ooty',
      mealPlan: 'EP',
      isDisplayOnlyFallback: true,
    };

    expect(getAuthoritativeSelectedHotelForCards(epFallback, undefined)).toBeUndefined();
  });

  it('keeps an effective API selection authoritative for card state', () => {
    const mapSelection = {
      provider: 'resavenue',
      hotelName: 'Vinayaga Inn by Poppys Ooty',
      mealPlan: 'MAP',
      selectionId: 123,
    };

    expect(getAuthoritativeSelectedHotelForCards(mapSelection, mapSelection)).toBe(mapSelection);
  });

  it('treats meal plan and room labels as optional after a committed response', () => {
    expect(getMissingAuthoritativeSelectionFields({
      provider: 'axisrooms',
      hotelName: 'THE ARBOUR RESORT',
      hotelCode: '435',
      canonicalHotelId: 232,
      selectedRateOptionId: 'axisrooms:232:605:CP_PLAN:2026-08-12',
      pricePerNight: 5040,
      totalPrice: 5040,
      mealPlan: null,
      roomType: null,
    })).toEqual([]);
  });

  it('keeps supplier and rate identity strict after a committed response', () => {
    expect(getMissingAuthoritativeSelectionFields({
      hotelName: 'THE ARBOUR RESORT',
      hotelCode: '435',
      pricePerNight: 5040,
      totalPrice: 5040,
    })).toEqual(['provider', 'selectedRateOptionId']);
  });

  it('does not inherit the old hotel financial fields', () => {
    const row = buildAuthoritativeSelectedHotelRow({
      day: 'Day 1 | 2026-08-12',
      itineraryRouteId: 10145,
      provider: 'offline',
      hotelCode: '211',
      selectedRateOptionId: 'old-rate',
      baseHotelCost: 2640,
      basePricePerNight: 2640,
      totalRoomCost: 2640,
      hotelMarginAmount: 0,
      selectedPriceSnapshot: { provider: 'offline', hotelCode: '211', rateOptionId: 'old-rate', baseTotalPrice: 2640 },
    }, {
      provider: 'offline',
      canonicalHotelId: 435,
      hotelCode: '435',
      hotelName: 'SPRISE MUNNAR RESORT & SPA',
      selectedRateOptionId: 'sprise-rate',
      rateOptionId: 'sprise-rate',
      basePricePerNight: 4750,
      baseTotalPrice: 4750,
      hotelMarginPercentage: 20,
      hotelMarginAmount: 950,
      hotelMarginTotalAmount: 950,
      pricePerNight: 5700,
      totalPrice: 5700,
      selectedPriceSnapshot: spriseSnapshot,
    });

    expect(row).not.toHaveProperty('baseHotelCost');
    expect(row).not.toHaveProperty('totalRoomCost');
    expect(JSON.stringify(row)).not.toContain('2640');
    expect(row.basePricePerNight).toBe(4750);
    expect(row.hotelMarginAmount).toBe(950);
    expect(row.selectedPriceSnapshot).toEqual(spriseSnapshot);
  });

  it('rejects a fallback snapshot from another rate identity', () => {
    expect(getIdentitySafeSelectedPriceSnapshot({
      provider: 'offline', canonicalHotelId: 435, hotelCode: '435', selectedRateOptionId: 'sprise-rate',
    }, {
      provider: 'offline', canonicalHotelId: 211, hotelCode: '211', rateOptionId: 'old-rate',
      selectedPriceSnapshot: { provider: 'offline', canonicalHotelId: 211, hotelCode: '211', rateOptionId: 'old-rate' },
    })).toBeNull();
  });

  it('accepts a snapshot only when provider, hotel and rate all match', () => {
    expect(getIdentitySafeSelectedPriceSnapshot({
      provider: 'offline', canonicalHotelId: 435, hotelCode: '435', selectedRateOptionId: 'sprise-rate',
      selectedPriceSnapshot: spriseSnapshot,
    }, null)).toEqual(spriseSnapshot);
  });
});
