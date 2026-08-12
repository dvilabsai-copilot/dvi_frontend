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
  getVisibleHotelCardOptions,
  getHotelRoomTypeValue,
  getHotelIntentIdentity,
  getHotelCardGroupingIdentity,
  buildAuthoritativeSelectedHotelRow,
  getSupplierCredentialFields,
  isSameHotelPropertyIdentity,
  normalizeRoomTypeFilterLabel,
  isSelectableHotel,
  normalizeMealPlanLabel,
} from '../pages/hotel-list/hotelList.utils';

describe('hotel recommendation v2 UI contract', () => {
  it('matches canonical and provider property identities only within their own namespace', () => {
    const current = {
      provider: 'axisrooms',
      canonicalHotelId: 232,
      providerHotelCode: '435',
    };

    expect(isSameHotelPropertyIdentity(current, {
      provider: 'axisrooms',
      canonicalHotelId: 232,
      providerHotelCode: '435',
    })).toBe(true);
    expect(isSameHotelPropertyIdentity(current, {
      provider: 'axisrooms',
      canonicalHotelId: 435,
      providerHotelCode: '232',
    })).toBe(false);
  });

  it('keeps API-selected hotel B authoritative even when presentation base hotel A is cheaper', () => {
    const selected = buildAuthoritativeSelectedHotelRow(
      {
        provider: 'offline',
        canonicalHotelId: 100,
        hotelName: 'Cheaper Hotel A',
        roomType: 'Standard',
        mealPlan: 'CP',
        totalPrice: 3000,
      },
      {
        provider: 'axisrooms',
        canonicalHotelId: 232,
        providerHotelCode: '435',
        hotelName: 'Selected Hotel B',
        roomType: 'Club Rooms Non AC',
        mealPlan: 'CP',
        rateOptionId: 'axis:435:club:cp',
        totalPrice: 5040,
      },
    );

    expect(selected).toMatchObject({
      provider: 'axisrooms',
      canonicalHotelId: 232,
      providerHotelCode: '435',
      hotelName: 'Selected Hotel B',
      totalPrice: 5040,
    });
  });

  it('does not manufacture supplier credentials from a TBO rate identity', () => {
    expect(getSupplierCredentialFields({
      provider: 'tbo',
      selectionKey: 'tbo:1313362:1',
      rateOptionId: 'tbo:1313362:1',
      supplierBookingCode: null,
    })).toEqual({
      bookingCode: '',
      searchReference: '',
    });

    const supplierBookingCode = '1313362!TB!1!TB!fresh-session!TB!N!TB!AFF!';
    expect(getSupplierCredentialFields({ supplierBookingCode })).toEqual({
      bookingCode: supplierBookingCode,
      searchReference: supplierBookingCode,
    });
  });

  it('keeps the STAAH supplier property code authoritative across preview and commit', () => {
    expect(getHotelIntentIdentity({
      provider: 'staah',
      canonicalHotelId: 44596,
      hotelId: 44596,
      hotelCode: '44596',
      providerHotelCode: 'STAAHTESTHOTELPROD',
    })).toEqual({
      providerHotelCode: 'STAAHTESTHOTELPROD',
      hotelCode: 'STAAHTESTHOTELPROD',
      canonicalHotelId: 44596,
      hotelId: 44596,
    });
  });

  it('groups one STAAH property card when legacy hotelCode differs across recommendation rows', () => {
    const canonicalAliasRow = {
      provider: 'staah',
      canonicalHotelId: 44596,
      hotelId: 44596,
      hotelCode: '44596',
      providerHotelCode: 'STAAHTESTHOTELPROD',
    };
    const supplierAliasRow = {
      provider: 'staah',
      canonicalHotelId: 44596,
      hotelCode: 'STAAHTESTHOTELPROD',
      providerHotelCode: 'STAAHTESTHOTELPROD',
    };

    expect(getHotelCardGroupingIdentity(canonicalAliasRow)).toBe(
      getHotelCardGroupingIdentity(supplierAliasRow),
    );
    expect(getHotelCardGroupingIdentity(canonicalAliasRow)).toBe(
      'staah|provider:staahtesthotelprod',
    );
  });

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

  it('groups supplier presentation variants without merging bed configurations', () => {
    const hotels = [
      { roomType: 'Deluxe Double Room, 1 King Bed, City View', hotelName: 'King city' },
      { roomType: 'Deluxe Double Room, 1 King Bed, Non-Smoking', hotelName: 'King non-smoking' },
      { roomType: 'Deluxe Double Room, 1 Queen Bed, Garden View', hotelName: 'Queen garden' },
    ];

    expect(normalizeRoomTypeFilterLabel(hotels[0].roomType)).toBe('Deluxe Double Room, 1 King Bed');
    expect(normalizeRoomTypeFilterLabel('Deluxe Room, 2 Twin Beds, Pool View')).toBe('Deluxe Room, 2 Twin Beds');
    expect(getRoomTypeFilterOptions(hotels)).toEqual([
      'Deluxe Double Room, 1 King Bed',
      'Deluxe Double Room, 1 Queen Bed',
    ]);
    expect(filterHotelsByRoomType(hotels, 'Deluxe Double Room, 1 King Bed').map((hotel) => hotel.hotelName))
      .toEqual(['King city', 'King non-smoking']);
  });

  it('does not expose a duplicate offline property in the room filter when live is visible', () => {
    const live = {
      provider: 'staah',
      hotelName: 'Same Hotel',
      roomType: 'Deluxe Room',
      mealPlan: 'CP',
      optionKey: 'live|same|deluxe',
      isSelectable: true,
      isBookable: true,
      isLiveBookable: true,
      availabilityStatus: 'LIVE_AVAILABLE',
      totalHotelCost: 2500,
    };
    const offline = {
      provider: 'offline',
      hotelName: 'Same Hotel',
      roomType: 'Suite Room',
      mealPlan: 'CP',
      optionKey: 'offline|same|suite',
      isSelectable: true,
      bookingMode: 'MANUAL_APPROVAL',
      availabilityStatus: 'OFFLINE_APPROVAL_REQUIRED',
      isBookable: false,
      isLiveBookable: false,
      totalHotelCost: 3000,
    };

    expect(getRoomTypeFilterOptions(getVisibleHotelCardOptions([live, offline]))).toEqual(['Deluxe Room']);
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
