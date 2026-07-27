import { describe, expect, it } from 'vitest';
import { useItineraryDisplayMode } from './useItineraryDisplayMode';

describe('useItineraryDisplayMode', () => {
  it('makes vehicle-only itineraries hotel-read-only for every role', () => {
    const mode = useItineraryDisplayMode(
      { itineraryPreference: 2 } as any,
      false,
      'draft',
    );

    expect(mode.isVehicleOnlyItinerary).toBe(true);
    expect(mode.hotelReadOnly).toBe(true);
    expect(mode.shouldShowHotels).toBe(false);
  });

  it('keeps hotel controls available for editable hotel itineraries', () => {
    const mode = useItineraryDisplayMode(
      { itineraryPreference: 1 } as any,
      false,
      'draft',
    );

    expect(mode.isVehicleOnlyItinerary).toBe(false);
    expect(mode.hotelReadOnly).toBe(false);
    expect(mode.shouldShowHotels).toBe(true);
  });
});
