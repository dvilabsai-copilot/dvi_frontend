import { renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { useClipboardContentBuilder } from '@/pages/itinerary-details/hooks/useClipboardContentBuilder';

describe('clipboard package ticket pricing', () => {
  it.each(['recommended', 'highlights', 'para'] as const)('includes tickets once in %s hotel-only pricing', (mode) => {
    const hotel = {groupType: 1, itineraryRouteId: 1, hotelName: 'Test Hotel', totalHotelCost: 1000.25, totalPrice: 1000.25, day: 'Day 1 | 2026-11-20', date: '2026-11-20', roomType: 'Double', mealPlan: 'CP'};
    const groups = [{groupType: 1, label: 'Recommended #1', hotels: [hotel]}];
    const {result} = renderHook(() => useClipboardContentBuilder({
      itinerary: {quoteId: 'PRICING-TEST', itineraryPreference: 1, adults: 2, children: 0, infants: 0, roomCount: 1, days: [{day: 1, date: '2026-11-20', itineraryRouteId: 1}], vehicles: [], vehicleSelections: [], startDate: '2026-11-20', endDate: '2026-11-21', costBreakdown: {totalHotelAmount: 1000.25, totalGuideCost: 100, totalActivityCost: 50, totalHotspotCost: 25, additionalMargin: 0}},
      hotelDetails: {hotels: [hotel], hotelTabs: [{groupType: 1, totalAmount: 1000.25}]},
      paraRecommendations: groups, selectedHotels: {'clipboard-group-1': true}, shouldShowHotels: true, shouldShowVehicles: false, computedVehicleAmount: 0, computedVehicleQty: 0, isAgentLogin: true, activeHotelGroupType: 1, selectedHotelTotal: 1000.25,
    } as any));
    const output = result.current.buildClipboardHtml(mode, {}, undefined, groups as any);
    expect(output.html).toContain('1,175');
    expect(output.html).not.toContain('1,150');
  });
});
