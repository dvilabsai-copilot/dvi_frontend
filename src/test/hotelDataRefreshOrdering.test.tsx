import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ItineraryService } from '@/services/itinerary';
import { useHotelDataController } from '@/pages/itinerary-details/hooks/useHotelDataController';
import type { ItineraryHotelDetailsResponse } from '@/pages/itinerary-details/itinerary-details.types';

function deferredDetails() {
  let resolve!: (details: ItineraryHotelDetailsResponse) => void;
  const response = new Promise<ItineraryHotelDetailsResponse>((complete) => { resolve = complete; });
  return { resolve, response };
}

function hotelDetails(quoteId: string, mealPlanCode = 'CP'): ItineraryHotelDetailsResponse {
  return { quoteId, mealPlanCode, hotelRatesVisible: true, hotelTabs: [], hotels: [] };
}

function fixture() {
  const previous = deferredDetails();
  const next = deferredDetails();
  const options = {
    quoteId: 'DVI20261117',
    activeHotelGroupType: 1,
    isRebuildingHotels: false,
    setActiveHotelGroupType: vi.fn(),
    setHotelDetails: vi.fn(),
    setIsRebuildingHotels: vi.fn(),
    setItinerary: vi.fn(),
    setLoadingHotels: vi.fn(),
    cacheRouteHotelDetails: vi.fn(),
    fetchCompleteHotelDetails: vi.fn().mockReturnValueOnce(previous.response).mockReturnValueOnce(next.response),
    loadHotelDetailsForItinerary: vi.fn(),
  };
  vi.spyOn(ItineraryService, 'getDetails').mockResolvedValue({ overallCost: 13056 } as Awaited<ReturnType<typeof ItineraryService.getDetails>>);
  const hook = renderHook((group: number) => useHotelDataController({ ...options, activeHotelGroupType: group }), { initialProps: 1 });
  return { ...hook, options, previous, next };
}

describe('itinerary hotel refresh ordering', () => {
  afterEach(() => vi.restoreAllMocks());

  it('keeps the later refresh in page state and cache when the earlier response finishes last', async () => {
    const { result, options, previous, next } = fixture();
    const oldDetails = hotelDetails(options.quoteId, 'CP');
    const latestDetails = hotelDetails(options.quoteId, 'MAP');
    const first = result.current.refreshHotelData();
    const second = result.current.refreshHotelData();

    await act(async () => {
      next.resolve(latestDetails);
      expect(await second).toBe(latestDetails);
    });
    await act(async () => {
      previous.resolve(oldDetails);
      expect(await first).toBeNull();
    });

    expect(options.setHotelDetails).toHaveBeenCalledExactlyOnceWith(latestDetails);
    expect(options.cacheRouteHotelDetails).toHaveBeenCalledExactlyOnceWith(options.quoteId, latestDetails);
    expect(options.setItinerary).toHaveBeenCalledTimes(1);
    expect(options.setLoadingHotels.mock.calls).toEqual([[true], [true], [false]]);
  });

  it('discards a pending response after the recommendation group changes', async () => {
    const { result, rerender, options, previous } = fixture();
    const request = result.current.refreshHotelData();
    rerender(2);
    await act(async () => {
      previous.resolve(hotelDetails(options.quoteId));
      expect(await request).toBeNull();
    });
    expect(options.setHotelDetails).not.toHaveBeenCalled();
    expect(options.cacheRouteHotelDetails).not.toHaveBeenCalled();
    expect(options.setItinerary).not.toHaveBeenCalled();
    expect(options.setLoadingHotels).toHaveBeenLastCalledWith(false);
  });

  it('discards a refresh when a saved server price has already superseded it', async () => {
    const { result, options, previous } = fixture();
    const request = result.current.refreshHotelData();
    result.current.invalidateHotelReads();
    await act(async () => {
      previous.resolve(hotelDetails(options.quoteId));
      expect(await request).toBeNull();
    });
    expect(options.setHotelDetails).not.toHaveBeenCalled();
    expect(options.setItinerary).not.toHaveBeenCalled();
  });
});
