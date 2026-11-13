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


describe('clipboard exact hotel amounts', () => {
  const modes = ['recommended', 'highlights', 'para'] as const;
  const makeHotel = (amount: number, groupType = 1) => ({groupType, itineraryRouteId: 1, hotelId: 5, hotelName: 'Priced Hotel', isSelected: true, totalHotelCost: amount, totalPrice: amount, day: 'Day 1 | 2026-11-20', date: '2026-11-20', roomType: 'Double', mealPlan: 'CP'});
  const makeItinerary = (quoteId: string, hotelAmount: number, vehicleAmount: number, tickets: number) => ({quoteId, itineraryPreference: 3, adults: 2, children: 0, infants: 0, roomCount: 1, days: [{day: 1, date: '2026-11-20', itineraryRouteId: 1}], vehicles: [{vehicleTypeId: 1, vehicleTypeName: 'Sedan', totalQty: 1, totalAmount: vehicleAmount, isAssigned: true}], vehicleSelections: [], startDate: '2026-11-20', endDate: '2026-11-21', costBreakdown: {totalHotelAmount: hotelAmount, totalVehicleAmount: vehicleAmount, totalHotspotCost: tickets, additionalMargin: 0, netPayable: Math.round(hotelAmount + vehicleAmount + tickets)}});
  const hotelLines = (html: string) => Array.from(new DOMParser().parseFromString(html, 'text/html').querySelectorAll('tr')).filter(row => row.textContent?.includes('Total Hotel Cost For') && row.children.length === 3).map(row => row.lastElementChild?.textContent?.replace(/\s+/g, ' ').trim());
  it.each(modes)('uses exact hotel cost for %s with or without entry tickets and for different recommendations', (mode) => {
    for (const isAgentLogin of [false, true]) for (const tickets of [0, 1610]) {
      const groups = [{groupType: 1, label: 'Recommended #1', hotels: [makeHotel(18753.40)]}, {groupType: 2, label: 'Recommended #2', hotels: [makeHotel(20000.27, 2)]}];
      const options = {itinerary: makeItinerary(`HOTEL-${mode}-${isAgentLogin}-${tickets}`, 18753.40, 16127.47, tickets), hotelDetails: {hotels: groups.flatMap(group => group.hotels), hotelTabs: groups.map(group => ({groupType: group.groupType, totalAmount: group.hotels[0].totalHotelCost}))}, paraRecommendations: groups, selectedHotels: {'clipboard-group-1': true}, shouldShowHotels: true, shouldShowVehicles: true, computedVehicleAmount: 16127.47, computedVehicleQty: 1, isAgentLogin, activeHotelGroupType: 1, selectedHotelTotal: 18753.40};
      const {result, unmount} = renderHook(() => useClipboardContentBuilder(options as any));
      const copied = result.current.buildClipboardHtml(mode, {}, undefined, [groups[0]] as any);
      expect(hotelLines(copied.html)).toEqual(['₹ 18,753.40']);
      expect(copied.html).toContain(tickets ? '36,491.00' : '34,881.00');
      expect(hotelLines(result.current.buildClipboardHtml(mode, {}, undefined, [groups[1]] as any).html)).toEqual(['₹ 20,000.27']);
      unmount();
    }
  });
  it.each(modes)('keeps each continued leg hotel amount exact in %s', (mode) => {
    const firstGroup = {groupType: 1, label: 'Recommended #1', hotels: [makeHotel(1000.25)]};
    const nextGroup = {groupType: 1, label: 'Recommended #1', hotels: [makeHotel(2000.50)]};
    const first = makeItinerary('EXACT-LEG-1', 1000.25, 500.15, 0);
    const next = makeItinerary('EXACT-LEG-2', 2000.50, 700.35, 100);
    const legs = [{label: 'Leg 1', itinerary: first, groups: [firstGroup], hotelTotals: {1: 1000.25}}, {label: 'Leg 2', itinerary: next, groups: [nextGroup], hotelTotals: {1: 2000.50}}];
    const {result} = renderHook(() => useClipboardContentBuilder({itinerary: next, hotelDetails: {hotels: nextGroup.hotels, hotelTabs: [{groupType: 1, totalAmount: 2000.50}]}, paraRecommendations: [nextGroup], selectedHotels: {'clipboard-group-1': true}, shouldShowHotels: true, shouldShowVehicles: true, computedVehicleAmount: 700.35, computedVehicleQty: 1, isAgentLogin: false, activeHotelGroupType: 1, selectedHotelTotal: 2000.50, multiLegHotelGroups: legs} as any));
    expect(hotelLines(result.current.buildClipboardHtml(mode, {}, legs as any).html)).toEqual(['₹ 1,000.25', '₹ 2,000.50']);
  });
});
