import { useState, useCallback, useRef } from 'react';
import { ItineraryService } from '@/services/itinerary';

export type HotelSearchResult = {
  provider: string; // Provider source: 'tbo' or 'ResAvenue'
  hotelCode: string;
  hotelName: string;
  address: string;
  rating: number;
  reviewCount?: number;
  price: number;
  currency?: string;
  roomTypes?: Array<{
    roomTypeName?: string;
    roomCode: string;
    maxOccupancy?: number;
    roomName?: string;
  }>;
  facilities?: string[];
  amenities?: string[];
  inclusions?: string[];
  rateConditions?: any[];
  mealPlan?: string;
  images?: string[];
  availableRooms?: number;
  // API-specific fields
  bookingCode?: string;
  searchReference?: string;
  totalCost?: number;
  totalRoomCost?: number;
  netAmount?: number;
  totalFare?: number;
  supplementSummary?: {
    hasSupplements: boolean;
    supplementCount: number;
    atPropertyChargeCount: number;
    requiresReview: boolean;
  };
};

interface UseHotelSearchOptions {
  debounceMs?: number;
}

export const useHotelSearch = (options: UseHotelSearchOptions = {}) => {
  const MAX_ROOMS = 6;
  const MAX_ADULTS_PER_ROOM = 8;
  const MAX_CHILDREN_PER_ROOM = 4;
  const { debounceMs = 500 } = options;
  const [searchResults, setSearchResults] = useState<HotelSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  const search = useCallback(
    async (
      searchQuery: string,
      cityCode: string,
      checkInDate: string,
      checkOutDate: string,
      roomCount: number = 1,
      guestCount: number = 2,
      occupancy?: {
        adultCount?: number;
        childCount?: number;
        infantCount?: number;
        childAges?: number[];
      },
      guestNationality?: string
    ) => {
      // Clear previous timer
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }

      // If query is empty, clear results
      if (!searchQuery.trim()) {
        setSearchResults([]);
        setError(null);
        return;
      }

      if (!cityCode || !checkInDate || !checkOutDate) {
        setError('Missing destination or travel dates for hotel search.');
        setSearchResults([]);
        return;
      }

      const normalizedGuestNationality = (guestNationality || '').trim().toUpperCase();

      if (!normalizedGuestNationality || !/^[A-Z]{2}$/i.test(normalizedGuestNationality)) {
        setError('Guest nationality is required as ISO-2 code (example: IN).');
        setSearchResults([]);
        return;
      }

      if (!Number.isFinite(roomCount) || roomCount < 1) {
        setError('Please provide a valid room count before searching hotels.');
        setSearchResults([]);
        return;
      }

      if (roomCount > MAX_ROOMS) {
        setError(`Maximum ${MAX_ROOMS} rooms are allowed per search.`);
        setSearchResults([]);
        return;
      }

      const adultCount = occupancy?.adultCount ?? 0;
      const childCount = occupancy?.childCount ?? 0;
      const childAges = occupancy?.childAges ?? [];

      if (roomCount === 1 && adultCount > MAX_ADULTS_PER_ROOM) {
        setError(`Maximum ${MAX_ADULTS_PER_ROOM} adults are allowed per room.`);
        setSearchResults([]);
        return;
      }

      if (roomCount === 1 && childCount > MAX_CHILDREN_PER_ROOM) {
        setError(`Maximum ${MAX_CHILDREN_PER_ROOM} children are allowed per room.`);
        setSearchResults([]);
        return;
      }

      if (adultCount > 0 && adultCount + childCount > 0 && guestCount < adultCount + childCount) {
        setError('Invalid guest combination. Please verify adults and children count.');
        setSearchResults([]);
        return;
      }

      if (childCount > 0 && childAges.length !== childCount) {
        setError('Please provide age for each child before searching hotels.');
        setSearchResults([]);
        return;
      }

      // Set debounced search
      debounceTimerRef.current = setTimeout(async () => {
        setIsSearching(true);
        setError(null);

        try {
          const response = await ItineraryService.searchHotels({
            cityCode,
            checkInDate,
            checkOutDate,
            roomCount,
            guestCount,
            adultCount: occupancy?.adultCount,
            childCount: occupancy?.childCount,
            infantCount: occupancy?.infantCount,
            childAges: occupancy?.childAges,
            guestNationality: normalizedGuestNationality,
            hotelName: searchQuery,
          });

          // Map searchReference from backend to bookingCode for API compatibility
          const mapBookingCode = (hotel: any): HotelSearchResult => ({
            ...hotel,
            bookingCode: hotel.searchReference || hotel.bookingCode,
            // Provider field comes from backend (tbo, ResAvenue, etc.)
          });

          if (response?.data?.hotels) {
            const hotels = response.data.hotels.map(mapBookingCode);
            setSearchResults(hotels);
          } else if (response?.hotels) {
            const hotels = response.hotels.map(mapBookingCode);
            setSearchResults(hotels);
          } else {
            setSearchResults([]);
          }
        } catch (err: any) {
          console.error('Hotel search error:', err);
          setError(
            err?.message ||
            'Failed to search hotels. Please try again.'
          );
          setSearchResults([]);
        } finally {
          setIsSearching(false);
        }
      }, debounceMs);
    },
    [debounceMs]
  );

  const clearSearch = useCallback(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    setSearchResults([]);
    setError(null);
    setIsSearching(false);
  }, []);

  return {
    searchResults,
    isSearching,
    error,
    search,
    clearSearch,
  };
};
