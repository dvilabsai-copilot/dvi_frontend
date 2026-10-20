import { describe, expect, it } from 'vitest';
import {
  getIntentionallyEmptyRouteIds,
  prepareQuotationPrebookSelections,
} from './quotationPrebookSelections.utils';

const buildOptions = (overrides: Record<string, unknown> = {}) => ({
  selectedHotelBookings: {},
  hotelRows: [],
  preferredGroupType: 1,
  itineraryDays: [
    { id: 101, date: '2026-10-21' },
    { id: 102, date: '2026-10-22' },
  ],
  normalizeHotelProvider: (hotel: Record<string, unknown>) => String(hotel.provider || ''),
  isSupplierBookableHotel: (hotel: Record<string, unknown>) => String(hotel.provider || '') === 'tbo',
  parseStaahSearchReference: () => null,
  getHotelSelectionAmount: (hotel: Record<string, unknown>) => Number(hotel.totalHotelCost || 0),
  getCoveredRouteIdsFromHotelSelections: (selections: Record<number, Record<string, unknown>>) =>
    new Set(Object.keys(selections).map(Number)),
  ...overrides,
});

describe('quotation prebook selection handling for removed hotels', () => {
  it('marks the removed route and serialized removed nights as intentionally empty', () => {
    const routeIds = getIntentionallyEmptyRouteIds([
      {
        itineraryRouteId: 101,
        selectedPriceSnapshot: JSON.stringify({ selectionOrigin: 'USER_REMOVED', removedRouteIds: [101, 102] }),
      },
    ]);

    expect([...routeIds].sort()).toEqual([101, 102]);
  });

  it('does not prebook or auto-select a serialized multi-night removed stay', () => {
    const result = prepareQuotationPrebookSelections(buildOptions({
      selectedHotelBookings: {
        101: { hotelName: 'Removed hotel', selectionOrigin: 'USER_REMOVED' },
      },
      hotelRows: [
        {
          groupType: 1,
          itineraryRouteId: 101,
          provider: 'tbo',
          hotelName: 'Removed hotel',
          selectedPriceSnapshot: JSON.stringify({ selectionOrigin: 'USER_REMOVED', removedRouteIds: [101, 102] }),
        },
        {
          groupType: 1,
          itineraryRouteId: 102,
          provider: 'tbo',
          hotelName: 'Also removed stay night',
          totalHotelCost: 1000,
        },
        {
          groupType: 1,
          itineraryRouteId: 103,
          provider: 'tbo',
          hotelName: 'Unrelated eligible hotel',
          totalHotelCost: 1200,
        },
      ],
    }));

    expect(result.selectedHotelsForPrebook[101]).toBeUndefined();
    expect(result.selectedHotelsForPrebook[102]).toBeUndefined();
    expect(result.autoSelections[101]).toBeUndefined();
    expect(result.autoSelections[102]).toBeUndefined();
    expect(result.autoSelections[103]?.hotelName).toBe('Unrelated eligible hotel');
  });
});
