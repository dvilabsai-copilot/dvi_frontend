import { describe, expect, it } from 'vitest';
import { useItineraryDisplayMode } from './useItineraryDisplayMode';
import type { ItineraryDetailsResponse } from '../itinerary-details.types';

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

  it('archives itineraries whose start date is before today', () => {
    const itinerary = {
      itineraryPreference: 1,
      days: [{ date: '2020-09-06' }],
      dateRange: '2020-09-06 to 2020-09-09',
    } as unknown as ItineraryDetailsResponse;
    const mode = useItineraryDisplayMode(
      itinerary,
      false,
      'draft',
    );

    expect(mode.isExpiredItinerary).toBe(true);
    expect(mode.hotelReadOnly).toBe(true);
    expect(mode.isConfirmedPresentation).toBe(false);
  });
});
