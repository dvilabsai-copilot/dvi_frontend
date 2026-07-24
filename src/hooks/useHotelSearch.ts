import { useState, useCallback, useRef } from 'react';
import { ItineraryService } from '@/services/itinerary';

export type HotelSearchResult = {
  provider: string; // Provider source: 'tbo' or 'ResAvenue'
  providerDisplayName?: string;
  canonicalHotelId?: number | null;
  providerHotelCode?: string;
  rateOptionId?: string;
  roomId?: string | number;
  roomTypeId?: number;
  rateOptions?: Array<Record<string, unknown>>;
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
  rateConditions?: unknown[];
  mealPlan?: string;
  images?: string[];
  availableRooms?: number;
  // API-specific fields
  bookingCode?: string;
  searchReference?: string;
  bookingMode?: 'LIVE_API' | 'MANUAL_APPROVAL';
  priceSource?: 'LIVE_API' | 'DATABASE' | 'LEGACY_UNKNOWN';
  priceLabel?: string;
  pricePerNight?: number;
  totalStayPrice?: number;
  numberOfNights?: number;
  nightlyRates?: Array<{
    date: string;
    baseAmount: number;
    sellAmount: number;
  }>;
  requiresHotelApproval?: boolean;
  isLiveRate?: boolean;
  isLiveBookable?: boolean;
  isSelectable?: boolean;
  approvalStatus?: 'NOT_REQUESTED' | 'NOT_REQUIRED' | 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED';
  manualConfirmationStatus?: 'NOT_STARTED' | 'PENDING_CONFIRMATION' | 'CONFIRMED' | 'FAILED' | 'CANCELLED';
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

const toRateOption = (hotel: HotelSearchResult): Record<string, unknown> => ({
  rateOptionId: hotel.rateOptionId || hotel.searchReference || hotel.bookingCode || `${hotel.provider}:${hotel.hotelCode}:${hotel.price}`,
  canonicalHotelId: hotel.canonicalHotelId ?? null,
  provider: hotel.provider,
  providerDisplayName: hotel.providerDisplayName,
  providerHotelCode: hotel.providerHotelCode,
  roomId: hotel.roomId,
  roomTypeId: hotel.roomTypeId ?? hotel.roomTypes?.[0]?.roomCode,
  roomType: hotel.roomType,
  mealPlan: hotel.mealPlan,
  rateId: hotel.rateId,
  bookingCode: hotel.bookingCode,
  searchReference: hotel.searchReference,
  bookingMode: hotel.bookingMode,
  priceSource: hotel.priceSource,
  pricePerNight: hotel.pricePerNight ?? hotel.price,
  totalStayPrice: hotel.totalStayPrice ?? hotel.price,
  numberOfNights: hotel.numberOfNights,
  currency: hotel.currency,
  priceLabel: hotel.priceLabel,
  isLiveRate: hotel.isLiveRate ?? hotel.provider !== 'offline',
  isLiveBookable: hotel.isLiveBookable ?? hotel.provider !== 'offline',
  isSelectable: hotel.isSelectable ?? true,
  requiresHotelApproval: hotel.requiresHotelApproval ?? hotel.provider === 'offline',
  availabilityStatus: hotel.availabilityStatus,
  approvalStatus: hotel.approvalStatus ?? (hotel.provider === 'offline' ? 'NOT_REQUESTED' : 'NOT_REQUIRED'),
  manualConfirmationStatus: hotel.manualConfirmationStatus ?? 'NOT_STARTED',
  nightlyRates: hotel.nightlyRates,
});

export const canonicalizeHotelSearchResults = (results: HotelSearchResult[]): HotelSearchResult[] => {
  const grouped = new Map<string, HotelSearchResult[]>();
  results.forEach((hotel) => {
    const canonicalId = Number(hotel.canonicalHotelId || 0);
    const key = canonicalId > 0 ? `hotel:${canonicalId}` : `provider:${hotel.provider}:${hotel.hotelCode}`;
    grouped.set(key, [...(grouped.get(key) || []), hotel]);
  });

  return Array.from(grouped.values()).map((group) => {
    const uniqueOptions = new Map<string, Record<string, unknown>>();
    group.forEach((hotel) => {
      const options = Array.isArray(hotel.rateOptions) && hotel.rateOptions.length > 0
        ? hotel.rateOptions
        : [toRateOption(hotel)];
      options.forEach((option) => {
        const key = JSON.stringify([
          option.provider,
          option.roomId,
          option.roomTypeId,
          option.mealPlan,
          option.rateId,
          option.bookingCode,
          option.searchReference,
          option.pricePerNight,
          option.totalStayPrice,
        ]);
        if (!uniqueOptions.has(key)) uniqueOptions.set(key, option);
      });
    });
    const rateOptions = Array.from(uniqueOptions.values());
    const liveOptions = rateOptions.filter((option) => option.isLiveBookable === true && option.provider === 'axisrooms');
    const offlineOptions = rateOptions.filter((option) => option.provider === 'offline' && option.isSelectable !== false);
    const defaultOption = [...(liveOptions.length > 0 ? liveOptions : offlineOptions.length > 0 ? offlineOptions : rateOptions)]
      .sort((a, b) => Number(a.pricePerNight || 0) - Number(b.pricePerNight || 0))[0];
    const source = group.find((hotel) => hotel.provider === defaultOption?.provider) || group[0];
    return {
      ...source,
      ...defaultOption,
      rateOptions,
      rateOptionId: String(defaultOption?.rateOptionId || source.rateOptionId || ''),
      hotelCode: source.hotelCode,
      hotelName: source.hotelName,
      canonicalHotelId: source.canonicalHotelId ?? null,
    } as HotelSearchResult;
  });
};

interface UseHotelSearchOptions {
  debounceMs?: number;
}

type RawHotelSearchResult = Record<string, unknown> & {
  searchReference?: string;
  bookingCode?: string;
  rooms?: Array<Record<string, unknown>>;
  inclusions?: unknown;
  Inclusions?: unknown;
  inclusion?: unknown;
  Inclusion?: unknown;
  amenities?: unknown;
  Amenities?: unknown;
  amenity?: unknown;
  Amenity?: unknown;
  rateConditions?: unknown;
  RateConditions?: unknown;
  rateCondition?: unknown;
  RateCondition?: unknown;
  mealPlan?: string;
  MealPlan?: string;
  mealType?: string;
  MealType?: string;
  meal_type?: string;
};

export const useHotelSearch = (options: UseHotelSearchOptions = {}) => {
  const MAX_ROOMS = 25;
  const MAX_ADULTS_PER_ROOM = 8;
  const MAX_CHILDREN_PER_ROOM = 4;
  const { debounceMs = 500 } = options;
  const [searchResults, setSearchResults] = useState<HotelSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  const normalizeStringList = (value: unknown): string[] => {
    if (!value) {
      return [];
    }
    if (Array.isArray(value)) {
      return value.map((item) => String(item || '').trim()).filter(Boolean);
    }
    if (typeof value === 'string') {
      return value
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean);
    }
    return [String(value).trim()].filter(Boolean);
  };

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
          const mapBookingCode = (hotel: RawHotelSearchResult): HotelSearchResult => ({
            ...hotel,
            bookingCode: hotel.searchReference || hotel.bookingCode,
            inclusions: normalizeStringList(
              hotel.inclusions ??
              hotel.Inclusions ??
              hotel.inclusion ??
              hotel.Inclusion ??
              hotel?.rooms?.[0]?.inclusion ??
              hotel?.rooms?.[0]?.Inclusion ??
              hotel?.Rooms?.[0]?.Inclusion ??
              hotel?.Rooms?.[0]?.inclusion,
            ),
            amenities: normalizeStringList(
              hotel.amenities ?? hotel.Amenities ?? hotel.amenity ?? hotel.Amenity,
            ),
            rateConditions: normalizeStringList(
              hotel.rateConditions ?? hotel.RateConditions ?? hotel.rateCondition ?? hotel.RateCondition,
            ),
            mealPlan:
              hotel.mealPlan ||
              hotel.MealPlan ||
              hotel.mealType ||
              hotel.MealType ||
              hotel.meal_type ||
              hotel?.rooms?.[0]?.mealType ||
              hotel?.rooms?.[0]?.MealType ||
              hotel?.Rooms?.[0]?.MealType ||
              hotel?.Rooms?.[0]?.mealType,
            // Provider field comes from backend (tbo, ResAvenue, etc.)
          });

          if (response?.data?.hotels) {
            const hotels = response.data.hotels.map(mapBookingCode);
            setSearchResults(canonicalizeHotelSearchResults(hotels));
          } else if (response?.hotels) {
            const hotels = response.hotels.map(mapBookingCode);
            setSearchResults(canonicalizeHotelSearchResults(hotels));
          } else {
            setSearchResults([]);
          }
        } catch (err: unknown) {
          console.error('Hotel search error:', err);
          setError(
            err instanceof Error ? err.message :
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
