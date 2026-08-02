import { describe, expect, it } from 'vitest';
import {
  filterHotelsByMealPlan,
  filterHotelsByRoomType,
  getStayKey,
  getAutoSelectableHotelsRespectingPreviousRoomMeal,
  getMealPlanDisplayLabel,
  getMealPlanFilterOptions,
  getMealPlanSelectionFlags,
  getRoomTypeFilterOptions,
  getHotelRoomTypeValue,
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

  it('prefers live inventory and falls back to offline only when live is absent', () => {
    const options = [
      {
        provider: 'offline',
        hotelName: 'Offline Hotel',
        totalHotelCost: 500,
        isSelectable: true,
        availabilityStatus: 'OFFLINE_APPROVAL_REQUIRED',
      },
      {
        provider: 'staah',
        hotelName: 'Live Hotel',
        totalHotelCost: 5000,
        isSelectable: true,
        availabilityStatus: 'LIVE_AVAILABLE',
      },
    ];

    expect(getAutoSelectableHotelsRespectingPreviousRoomMeal(options)).toEqual([options[1]]);
    expect(getAutoSelectableHotelsRespectingPreviousRoomMeal([options[0]])).toEqual([options[0]]);
  });

  it('supports a day-level meal-plan view filter without changing the selected tuple', () => {
    const hotels = [
      { mealPlan: 'CP', hotelName: 'A' },
      { mealPlan: 'MAP', hotelName: 'B' },
      { mealPlan: 'EP', hotelName: 'C' },
    ];

    expect(getMealPlanFilterOptions(hotels)).toEqual([
      'EP',
      'CP',
      'MAP',
      'AP',
    ]);
    expect(filterHotelsByMealPlan(hotels, 'CP').map((hotel) => hotel.hotelName)).toEqual(['A']);
    expect(filterHotelsByMealPlan(hotels).map((hotel) => hotel.hotelName)).toEqual(['A', 'B', 'C']);
  });

  it('derives and applies a day-level room-type filter', () => {
    const hotels = [
      { roomType: 'Deluxe Room', mealPlan: 'CP', hotelName: 'A' },
      { roomTypeName: 'Deluxe Room', mealPlan: 'MAP', hotelName: 'B' },
      { roomType: 'Suite', mealPlan: 'CP', hotelName: 'C' },
    ];

    expect(getHotelRoomTypeValue(hotels[0])).toBe('Deluxe Room');
    expect(getRoomTypeFilterOptions(hotels)).toEqual(['Deluxe Room', 'Suite']);
    expect(filterHotelsByRoomType(hotels, 'Deluxe Room').map((hotel) => hotel.hotelName)).toEqual(['A', 'B']);
    expect(filterHotelsByRoomType(hotels).map((hotel) => hotel.hotelName)).toEqual(['A', 'B', 'C']);
    expect(getMealPlanFilterOptions(filterHotelsByRoomType(hotels, 'Deluxe Room'), false)).toEqual(['CP', 'MAP']);
  });

  it('does not convert missing meal data to EP', () => {
    expect(normalizeMealPlanLabel('')).toBe('UNKNOWN');
    expect(normalizeMealPlanLabel('Parking and Wi-Fi included')).toBe('UNKNOWN');
  });

  it('derives AxisRooms meal-plan display from rate conditions when mealPlan is absent', () => {
    expect(getMealPlanDisplayLabel({
      mealPlan: '',
      rateConditions: ['Continental Plan', 'Modified American Plan', 'American Plan'],
    })).toBe('CP / MAP / AP');
  });

  it('derives compatibility flags from the canonical meal-plan code', () => {
    expect(getMealPlanSelectionFlags('CP')).toEqual({
      all: false,
      breakfast: true,
      lunch: false,
      dinner: false,
    });
    expect(getMealPlanSelectionFlags('Modified American Plan')).toEqual({
      all: false,
      breakfast: true,
      lunch: false,
      dinner: true,
    });
    expect(getMealPlanSelectionFlags('AP')).toEqual({
      all: true,
      breakfast: true,
      lunch: true,
      dinner: true,
    });
  });
});
