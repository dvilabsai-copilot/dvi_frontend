import { useState, useCallback, useRef } from 'react';
import { ItineraryService } from '@/services/itinerary';
import { buildTboOccupancies } from '@/pages/itinerary-details/utils/quotationOccupancy.utils';

export type HotelRoomSelection = {
  roomIndex: number;
  roomId?: string | number;
  rateId?: string | number;
  rateOptionId?: string;
  roomType?: string;
  mealPlan?: string;
  roomName?: string;
  pricePerNight?: number;
  totalStayPrice?: number;
  numberOfNights?: number;
};

export type HotelSearchResult = {
  provider: string; // Provider source: 'tbo' or 'ResAvenue'
  providerDisplayName?: string;
  isPriority?: boolean;
  canonicalHotelId?: number | null;
  providerHotelCode?: string;
  rateOptionId?: string;
  roomId?: string | number;
  rateId?: string | number;
  roomTypeId?: number;
  rateOptions?: Array<Record<string, unknown>>;
  roomSelections?: HotelRoomSelection[];
  hotelCode: string;
  hotelName: string;
  address: string;
  rating: number;
  reviewCount?: number;
  price: number;
  currency?: string;
  roomType?: string;
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
  primaryImageUrl?: string | null;
  availableRooms?: number;
  availabilityStatus?:
    | 'AVAILABLE'
    | 'UNAVAILABLE'
    | 'RESTRICTED'
    | 'STALE'
    | 'UNKNOWN'
    | 'OFFLINE_APPROVAL_REQUIRED'
    | string;
  distanceKm?: number | null;
  distanceStatus?: 'WITHIN_RADIUS' | 'OUTSIDE_RADIUS' | 'UNKNOWN';
  distanceReference?: 'HOTSPOT' | 'DESTINATION_CENTRE' | 'ROUTE_DESTINATION' | 'UNKNOWN';
  // API-specific fields
  bookingCode?: string;
  searchReference?: string;
  bookingMode?: 'LIVE_API' | 'MANUAL_APPROVAL';
  priceSource?: 'LIVE_API' | 'DATABASE' | 'LEGACY_UNKNOWN';
  priceLabel?: string;
  isRefundable?: boolean;
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

export type TboMatchedHotel = {
  hotelCode: string;
  roomType: string;
  mealPlan: string;
  currency: string;
  batches: Array<{
    batch: {
      batchIndex: number;
      roomCount: number;
    };
    rates: HotelSearchResult[];
  }>;
};

const toRateOption = (hotel: HotelSearchResult): Record<string, unknown> => ({
  rateOptionId: hotel.rateOptionId || hotel.searchReference || hotel.bookingCode || `${hotel.provider}:${hotel.hotelCode}:${hotel.price}`,
  canonicalHotelId: hotel.canonicalHotelId ?? null,
  provider: hotel.provider,
  providerDisplayName: hotel.providerDisplayName,
  isPriority: hotel.isPriority,
  providerHotelCode: hotel.providerHotelCode,
  images: hotel.images,
  primaryImageUrl: hotel.primaryImageUrl,
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
  isRefundable: hotel.isRefundable,
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
      isPriority: Boolean(source.isPriority) || rateOptions.some((option) => Boolean(option.isPriority)),
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

type RawHotelSearchResult = Omit<HotelSearchResult, 'inclusions' | 'amenities' | 'rateConditions' | 'isRefundable'> & Record<string, unknown> & {
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
  const [batchSearchResults, setBatchSearchResults] = useState<TboMatchedHotel[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const searchVersionRef = useRef(0);

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
      // Invalidate any previous pending or running search.
      const searchVersion = ++searchVersionRef.current;

      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
        debounceTimerRef.current = null;
      }
      setIsSearching(false);
      setBatchSearchResults([]);

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
          if (roomCount > 6) {
            if (
              !Number.isSafeInteger(roomCount) ||
              roomCount > 25 ||
              !Number.isSafeInteger(adultCount) ||
              adultCount < roomCount ||
              adultCount > roomCount * MAX_ADULTS_PER_ROOM ||
              !Number.isSafeInteger(childCount) ||
              childCount < 0 ||
              childCount > roomCount * MAX_CHILDREN_PER_ROOM ||
              childAges.length !== childCount ||
              childAges.some(
                (age) =>
                  !Number.isSafeInteger(age) ||
                  age < 0 ||
                  age > 11
              )
            ) {
              throw new Error(
                'Invalid room-wise occupancy for TBO multi-batch search.'
              );
            }

            // Until infants are mapped to supplier rooms, do not silently
            // exclude them from a multi-batch search.
            if (Number(occupancy?.infantCount || 0) > 0) {
              throw new Error(
                'Multi-batch infant room allocation is not yet supported.'
              );
            }

            // Search-only allocation from the entered guest totals.
            // The booking flow must later use verified saved rooming.
            const occupancies = buildTboOccupancies(
              roomCount,
              adultCount,
              childAges
            );

            const response = await ItineraryService.searchTboRoomBatches({
              cityCode,
              checkInDate,
              checkOutDate,
              roomCount,
              guestCount: adultCount + childCount,
              adultCount,
              childCount,
              infantCount: 0,
              childAges,
              guestNationality: normalizedGuestNationality,
              hotelName: searchQuery,
              occupancies,
            });

            if (searchVersion !== searchVersionRef.current) {
              return;
            }

            if (!Array.isArray(response?.data?.hotels)) {
              throw new Error(
                'Invalid TBO batch-search response. Expected data.hotels.'
              );
            }

            const expectedBatchSizes = Array.from(
              { length: Math.ceil(roomCount / 6) },
              (_, index) => Math.min(6, roomCount - index * 6)
            );

            const matchingHotels = (
              response.data.hotels as TboMatchedHotel[]
            ).filter((hotel) => {
              if (
                !hotel ||
                !hotel.hotelCode ||
                !Array.isArray(hotel.batches) ||
                hotel.batches.length !== expectedBatchSizes.length
              ) {
                return false;
              }

              const hasCompleteBatches = hotel.batches.every(
                (entry, index) =>
                  entry?.batch?.batchIndex === index &&
                  entry?.batch?.roomCount === expectedBatchSizes[index] &&
                  Array.isArray(entry.rates) &&
                  entry.rates.length > 0 &&
                  entry.rates.every(
                    (rate) =>
                      rate.hotelCode === hotel.hotelCode &&
                      rate.isLiveBookable === true &&
                      String(rate.searchReference || '').includes('!TB!') &&
                      Number.isFinite(Number(rate.price)) &&
                      Number(rate.price) > 0
                  )
              );

              if (!hasCompleteBatches) {
                return false;
              }

              // The supplier search may return other hotels too.
              const name = String(
                hotel.batches[0]?.rates[0]?.hotelName || ''
              ).toLowerCase();

              return name.includes(searchQuery.trim().toLowerCase());
            });

            // Do not convert multi-batch hotels into ordinary
            // single-BookingCode HotelSearchResult objects.
            setBatchSearchResults(matchingHotels);
            setSearchResults([]);
            return;
          }

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
          const mapBookingCode = (hotel: RawHotelSearchResult): HotelSearchResult => {
            const rawIsRefundable = hotel.isRefundable ??
              (hotel as Record<string, unknown>).IsRefundable ??
              (hotel.rooms?.[0] as Record<string, unknown> | undefined)?.isRefundable ??
              (hotel.rooms?.[0] as Record<string, unknown> | undefined)?.IsRefundable ??
              ((hotel as Record<string, unknown>).Rooms as Array<Record<string, unknown>> | undefined)?.[0]?.isRefundable ??
              ((hotel as Record<string, unknown>).Rooms as Array<Record<string, unknown>> | undefined)?.[0]?.IsRefundable;
            const isRefundable = rawIsRefundable === true ||
              rawIsRefundable === 1 ||
              String(rawIsRefundable ?? '').trim().toLowerCase() === 'true';

          return {
            ...hotel,
            bookingCode: hotel.bookingCode || hotel.searchReference,
            isRefundable,
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
            };
          };
          // Ignore a response belonging to an older search.
          if (searchVersion !== searchVersionRef.current) {
            return;
          }

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
          if (searchVersion === searchVersionRef.current) {
            console.error('Hotel search error:', err);
            setError(
              err instanceof Error
                ? err.message
                : 'Failed to search hotels. Please try again.'
            );
            setSearchResults([]);
          }
        } finally {
          if (searchVersion === searchVersionRef.current) {
            setIsSearching(false);
          }
        }
      }, debounceMs);
    },
    [debounceMs]
  );

  const clearSearch = useCallback(() => {
    // Prevent any previous API response from restoring old results.
    searchVersionRef.current += 1;

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }

    setSearchResults([]);
    setBatchSearchResults([]);
    setError(null);
    setIsSearching(false);
  }, []);

  return {
    searchResults,
    batchSearchResults,
    isSearching,
    error,
    search,
    clearSearch,
  };
};