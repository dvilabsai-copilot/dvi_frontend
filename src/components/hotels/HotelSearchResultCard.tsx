import React from 'react';
import { Building2, Star, MapPin, Loader2 } from 'lucide-react';
import { HotelRoomSelection, HotelSearchResult } from '@/hooks/useHotelSearch';
import { Button } from '@/components/ui/button';
import { getHotelProviderDisplayName } from '@/utils/hotelProviderDisplay';

interface HotelSearchResultCardProps {
  hotel: HotelSearchResult;
  onSelect: (hotel: HotelSearchResult) => void;
  isLoading?: boolean;
  checkInDate: string;
  checkOutDate: string;
  roomCount?: number;
  showHotelMargins?: boolean;
}

export const HotelSearchResultCard: React.FC<HotelSearchResultCardProps> = ({
  hotel,
  onSelect,
  isLoading,
  checkInDate,
  checkOutDate,
  roomCount = 1,
  showHotelMargins = false,
}) => {
  const checkIn = new Date(checkInDate);
  const checkOut = new Date(checkOutDate);
  const nights = Math.max(1, Math.ceil(
    (checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24),
  ));
  const normalizedRateOptions = React.useMemo(() => (hotel.rateOptions && hotel.rateOptions.length > 0
    ? hotel.rateOptions
    : [hotel as unknown as Record<string, unknown>]
  ).map((option, index) => ({
    ...option,
    rateOptionId: String(option.rateOptionId || option.searchReference || option.bookingCode || index),
    roomId: option.roomId,
    rateId: option.rateId,
    roomType: String(option.roomType || option.roomName || 'Room'),
    mealPlan: String(option.mealPlan || 'UNKNOWN'),
    pricePerNight: Number(option.pricePerNight || option.price || 0),
    totalStayPrice: Number(option.totalStayPrice || option.price || 0),
    numberOfNights: Number(option.numberOfNights || nights || 1),
  })), [hotel, nights]);
  const defaultOption = normalizedRateOptions.find(
    (option) => String(option.rateOptionId) === String(hotel.rateOptionId || ''),
  ) || normalizedRateOptions[0];
  const [selectedOption, setSelectedOption] = React.useState(defaultOption);
  const [roomSelections, setRoomSelections] = React.useState<HotelRoomSelection[]>(() =>
    Array.from({ length: Math.max(roomCount, 1) }, (_, roomIndex) => ({
      roomIndex,
      roomId: defaultOption?.roomId,
      rateId: defaultOption?.rateId,
      rateOptionId: String(defaultOption?.rateOptionId || ''),
      roomType: String(defaultOption?.roomType || hotel.roomType || 'Room'),
      mealPlan: String(defaultOption?.mealPlan || hotel.mealPlan || 'UNKNOWN'),
      pricePerNight: Number(defaultOption?.pricePerNight || 0),
      totalStayPrice: Number(defaultOption?.totalStayPrice || 0),
      numberOfNights: Number(defaultOption?.numberOfNights || nights || 1),
    })),
  );

  React.useEffect(() => {
    const nextDefault = normalizedRateOptions.find(
      (option) => String(option.rateOptionId) === String(hotel.rateOptionId || ''),
    ) || normalizedRateOptions[0];
    setSelectedOption(nextDefault);
    setRoomSelections((current) => Array.from({ length: Math.max(roomCount, 1) }, (_, roomIndex) =>
      current[roomIndex] || {
        roomIndex,
        roomId: nextDefault?.roomId,
        rateId: nextDefault?.rateId,
        rateOptionId: String(nextDefault?.rateOptionId || ''),
        roomType: String(nextDefault?.roomType || hotel.roomType || 'Room'),
      mealPlan: String(nextDefault?.mealPlan || hotel.mealPlan || 'UNKNOWN'),
        pricePerNight: Number(nextDefault?.pricePerNight || 0),
        totalStayPrice: Number(nextDefault?.totalStayPrice || 0),
        numberOfNights: Number(nextDefault?.numberOfNights || nights || 1),
      },
    ));
  }, [hotel.rateOptionId, hotel.roomType, hotel.mealPlan, normalizedRateOptions, roomCount, nights]);

  const handleSelect = () => {
    if (!isSelectable) return;

    onSelect({
      ...hotel,
      ...selectedOption,
      rateOptionId: String(selectedOption?.rateOptionId || hotel.rateOptionId || ''),
      roomSelections,
    } as HotelSearchResult);
  };

  const handleRoomSelectionChange = (roomIndex: number, rateOptionId: string) => {
    const option = normalizedRateOptions.find((candidate) => String(candidate.rateOptionId) === rateOptionId);
    if (!option) return;
    setRoomSelections((current) => current.map((selection, index) => index === roomIndex ? {
      roomIndex,
      roomId: option.roomId,
      rateId: option.rateId,
      rateOptionId: String(option.rateOptionId),
      roomType: String(option.roomType || 'Room'),
      mealPlan: String(option.mealPlan || 'UNKNOWN'),
      pricePerNight: Number(option.pricePerNight || option.price || 0),
      totalStayPrice: Number(option.totalStayPrice || option.price || 0),
      numberOfNights: Number(option.numberOfNights || nights || 1),
    } : selection));
  };
  const displayInclusions = (hotel.inclusions || []).slice(0, 3);
  const displayAmenities = (hotel.amenities || []).slice(0, 3);
  const displayRateConditions = (hotel.rateConditions || [])
    .map((item) => String(item || '').replace(/<[^>]*>/g, '').trim())
    .filter(Boolean)
    .slice(0, 2);
  const getBaseAmount = (value: unknown): number => {
    const hotelData = value as Record<string, unknown> | null | undefined;
    const raw = Number(
      hotelData?.baseHotelCost ??
      hotelData?.basePricePerNight ??
      hotelData?.baseAmount ??
      hotelData?.basePrice ??
      0,
    );
    return Number.isFinite(raw) && raw > 0 ? raw : 0;
  };

  const perNightPrice = Number(hotel.pricePerNight ?? hotel.totalFare ?? hotel.price ?? 0);
  const totalStayPrice = Number(hotel.totalStayPrice ?? hotel.totalFare ?? hotel.price ?? 0);
  const startingFrom = perNightPrice;
  const baseStartingFrom = getBaseAmount(hotel);
  const providerLabel = getHotelProviderDisplayName(
    hotel.provider,
    hotel.providerDisplayName,
  );
  const isOfflineOption = String(hotel.provider || '').trim().toLowerCase() === 'offline';
  const availabilityStatus = String(hotel.availabilityStatus || '').trim().toUpperCase();
  const blockedAvailabilityStatuses = new Set([
    'UNAVAILABLE',
    'RESTRICTED',
    'STALE',
    'UNKNOWN',
    'NOT_BOOKABLE',
    'NO_AVAILABILITY',
    'NO_SUPPLIER_AVAILABILITY',
  ]);
  const isSoldOut = hotel.availableRooms !== undefined && hotel.availableRooms <= 0;
  const isBlockedByStatus = blockedAvailabilityStatuses.has(availabilityStatus);
  const isSelectable = isOfflineOption
    ? hotel.isSelectable !== false && !isBlockedByStatus
    : hotel.isSelectable !== false &&
      hotel.isLiveBookable !== false &&
      !isSoldOut &&
      !isBlockedByStatus;
  const availabilityLabel = isSoldOut
    ? 'Sold Out'
    : availabilityStatus === 'RESTRICTED'
      ? 'Restricted'
      : availabilityStatus === 'STALE'
        ? 'Refresh required'
        : availabilityStatus === 'UNKNOWN'
          ? 'Availability unknown'
          : availabilityStatus === 'UNAVAILABLE' ||
              availabilityStatus === 'NO_AVAILABILITY' ||
              availabilityStatus === 'NO_SUPPLIER_AVAILABILITY' ||
              availabilityStatus === 'NOT_BOOKABLE'
            ? 'Unavailable'
            : null;
  const distanceKm = Number(hotel.distanceKm);
  const hasKnownDistance =
    hotel.distanceStatus !== 'UNKNOWN' &&
    Number.isFinite(distanceKm) &&
    distanceKm >= 0;
  const distanceReferenceLabel =
    hotel.distanceReference === 'HOTSPOT'
      ? 'from hotspot'
      : hotel.distanceReference === 'DESTINATION_CENTRE'
        ? 'from destination centre'
        : hotel.distanceReference === 'ROUTE_DESTINATION'
          ? 'from route destination'
          : '';

  return (
    <div className="border rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow bg-white">
      {/* Image Section */}
      <div className="aspect-video bg-gradient-to-br from-blue-100 to-cyan-100 flex items-center justify-center relative overflow-hidden">
        {hotel.images && hotel.images.length > 0 ? (
          <img
            src={hotel.images[0]}
            alt={hotel.hotelName}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="text-center">
            <Building2 className="h-12 w-12 text-[#4ba3c3] mx-auto mb-2" />
            <p className="text-xs text-gray-500">No Photos Available</p>
          </div>
        )}

        {/* Provider Badge */}
        {hotel.provider && (
          <div className={`absolute top-2 left-2 px-3 py-1 rounded-full text-xs font-bold shadow-lg text-white ${
            isOfflineOption
              ? 'bg-gradient-to-r from-slate-700 to-slate-500'
              : 'bg-gradient-to-r from-purple-600 to-blue-600'
          }`}>
            {providerLabel}
          </div>
        )}

        {/* Availability Badge */}
        {(hotel.availableRooms !== undefined || availabilityLabel) && (
          <div className="absolute top-2 right-2 rounded-full bg-white px-3 py-1 text-xs font-semibold shadow-sm">
            {availabilityLabel ? (
              <span className="text-red-600">{availabilityLabel}</span>
            ) : (
              <span className="flex items-center gap-1 text-[#4ba3c3]">
                <span className="inline-block h-2 w-2 rounded-full bg-green-500"></span>
                {hotel.availableRooms} rooms
              </span>
            )}
          </div>
        )}
      </div>

      {/* Content Section */}
      <div className="p-4">
        {/* Header with rating */}
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="flex-1">
            <h4 className="font-semibold text-base text-[#4a4260] mb-1">
              {hotel.hotelName}
            </h4>
            {hotel.rating && (
              <div className="flex items-center gap-1 mb-2">
                <div className="flex items-center gap-0.5">
                  {[...Array(5)].map((_, i) => (
                    <Star
                      key={i}
                      className={`h-3.5 w-3.5 ${
                        i < Math.round(hotel.rating)
                          ? 'fill-yellow-400 text-yellow-400'
                          : 'text-gray-300'
                      }`}
                    />
                  ))}
                </div>
                <span className="text-xs text-gray-600">
                  {hotel.rating.toFixed(1)}
                  {hotel.reviewCount && (
                    <span> ({hotel.reviewCount} reviews)</span>
                  )}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Address */}
        <div className="flex items-start gap-1 mb-2">
          <MapPin className="h-4 w-4 text-gray-400 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-[#6c6c6c] line-clamp-2">{hotel.address}</p>
        </div>

        <div className="mb-3 flex items-start gap-1">
          <MapPin className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-slate-400" />
          {hasKnownDistance ? (
            <p
              className={`text-xs ${
                hotel.distanceStatus === 'OUTSIDE_RADIUS'
                  ? 'font-medium text-amber-700'
                  : 'text-slate-600'
              }`}
            >
              {distanceKm.toFixed(1)} km {distanceReferenceLabel}
              {hotel.distanceStatus === 'OUTSIDE_RADIUS'
                ? ' — outside preferred 15 km radius'
                : ''}
            </p>
          ) : (
            <p className="text-xs text-slate-500">Distance unavailable</p>
          )}
        </div>

        <div className="bg-gray-50 rounded-lg p-3 mb-3">
          <div className="flex justify-between items-center gap-2">
            <span className="text-xs text-gray-600 font-medium">starting from</span>
            <span className="text-base font-bold text-[#4ba3c3]">
              ₹ {startingFrom.toLocaleString("en-IN")}
              {showHotelMargins && baseStartingFrom > 0 && (
                <span className="ml-1 text-xs font-medium text-gray-500">
                  ({`₹ ${baseStartingFrom.toLocaleString("en-IN")}`})
                </span>
              )}
              <span className="text-xs font-semibold text-gray-500">/ night</span>
            </span>
          </div>
          <div className="mt-1 text-[11px] text-gray-500">
            {nights} night{nights !== 1 ? 's' : ''}
          </div>
          {isOfflineOption && (
            <div className="mt-2 rounded-md border border-amber-200 bg-amber-50 px-2 py-2">
              <div className="text-xs font-bold uppercase tracking-wide text-amber-800">
                Offline
              </div>
              <div className="mt-1 text-xs font-semibold text-amber-900">
                {hotel.priceLabel || 'Price subject to hotel approval'}
              </div>
              <div className="mt-1 text-xs text-amber-800">
                Availability and confirmation are subject to hotel approval.
              </div>
              <div className="mt-1 text-xs text-slate-600">
                INR {totalStayPrice.toLocaleString("en-IN")} total for {nights} night{nights !== 1 ? 's' : ''}
              </div>
            </div>
          )}
        </div>

        {normalizedRateOptions.length > 1 && (
          <div className="mb-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
            <p className="mb-2 text-xs font-semibold text-slate-700">Rate options</p>
            <div className="space-y-1">
              {normalizedRateOptions.map((option, index) => {
                const optionProvider = String(option.provider || '').trim().toLowerCase();
                const optionPrice = Number(option.pricePerNight || 0);
                const optionRateId = String(option.rateOptionId || index);
                const isSelected = optionRateId === String(selectedOption?.rateOptionId || hotel.rateOptionId || '');
                return (
                  <button
                    key={optionRateId}
                    type="button"
                    className={`flex w-full items-center justify-between rounded border px-2 py-1 text-left text-xs ${isSelected ? 'border-cyan-500 bg-white' : 'border-transparent bg-white/70'}`}
                    onClick={() => {
                      setSelectedOption(option);
                      setRoomSelections((current) => current.map((selection) => ({
                        ...selection,
                        roomId: option.roomId,
                        rateId: option.rateId,
                        rateOptionId: optionRateId,
                        roomType: String(option.roomType || 'Room'),
                        mealPlan: String(option.mealPlan || 'UNKNOWN'),
                        pricePerNight: Number(option.pricePerNight || option.price || 0),
                        totalStayPrice: Number(option.totalStayPrice || option.price || 0),
                        numberOfNights: Number(option.numberOfNights || nights || 1),
                      })));
                    }}
                  >
                    <span>{getHotelProviderDisplayName(optionProvider, option.providerDisplayName)} / {String(option.roomType || 'Room')} / {String(option.mealPlan || 'UNKNOWN')}</span>
                    <span className="font-semibold">INR {optionPrice.toLocaleString('en-IN')} / night</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {roomCount > 1 && normalizedRateOptions.length > 0 && (
          <div className="mb-3 rounded-lg border border-cyan-200 bg-cyan-50/50 p-3">
            <p className="mb-2 text-xs font-semibold text-slate-700">Room selections</p>
            <div className="space-y-2">
              {roomSelections.map((selection, roomIndex) => (
                <div key={`room-selection-${roomIndex}`} className="flex items-center gap-2 text-xs text-slate-700">
                  <span className="w-16 font-medium">Room {roomIndex + 1}</span>
                  <select
                    value={String(selection.rateOptionId || '')}
                    onChange={(event) => handleRoomSelectionChange(roomIndex, event.target.value)}
                    className="min-w-0 flex-1 rounded border border-slate-300 bg-white px-2 py-1 text-xs"
                  >
                    {normalizedRateOptions.map((option) => (
                      <option key={`${roomIndex}-${String(option.rateOptionId)}`} value={String(option.rateOptionId)}>
                        {String(option.roomType || 'Room')} / {String(option.mealPlan || 'UNKNOWN')} / INR {Number(option.pricePerNight || option.price || 0).toLocaleString('en-IN')} / night
                      </option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Room Types */}
        {hotel.roomTypes && hotel.roomTypes.length > 0 && (
          <div className="mb-3">
            <p className="text-xs font-medium text-[#4a4260] mb-2">Room Types:</p>
            <div className="flex flex-wrap gap-1">
              {hotel.roomTypes.map((room) => (
                <span
                  key={room.roomCode}
                  className="inline-block bg-blue-50 text-blue-700 text-xs px-2 py-1 rounded"
                >
                  {room.roomTypeName || room.roomName || 'Room'}
                </span>
              ))}
            </div>
          </div>
        )}

        {hotel.mealPlan && (
          <div className="mb-3">
            <p className="text-xs font-medium text-[#4a4260] mb-2">Meal Plan:</p>
            <span className="inline-block bg-amber-50 text-amber-700 text-xs px-2 py-1 rounded">
              {hotel.mealPlan}
            </span>
          </div>
        )}

        {hotel.supplementSummary?.hasSupplements && (
          <div className="mb-3 rounded-md border border-amber-200 bg-amber-50 p-2">
            <p className="text-xs font-medium text-amber-800">Supplements</p>
            <p className="text-xs text-amber-700 mt-1">
              {hotel.supplementSummary.supplementCount} charge(s)
              {hotel.supplementSummary.atPropertyChargeCount > 0
                ? `, ${hotel.supplementSummary.atPropertyChargeCount} at property`
                : ''}
              {hotel.supplementSummary.requiresReview ? ' (review required)' : ''}
            </p>
          </div>
        )}

        {displayInclusions.length > 0 && (
          <div className="mb-3">
            <p className="text-xs font-medium text-[#4a4260] mb-2">Inclusions:</p>
            <div className="flex flex-wrap gap-1">
              {displayInclusions.map((item, idx) => (
                <span
                  key={`inc-${idx}`}
                  className="inline-block bg-indigo-50 text-indigo-700 text-xs px-2 py-1 rounded"
                >
                  {item}
                </span>
              ))}
            </div>
          </div>
        )}

        {displayAmenities.length > 0 && (
          <div className="mb-3">
            <p className="text-xs font-medium text-[#4a4260] mb-2">Amenities:</p>
            <div className="flex flex-wrap gap-1">
              {displayAmenities.map((item, idx) => (
                <span
                  key={`amen-${idx}`}
                  className="inline-block bg-sky-50 text-sky-700 text-xs px-2 py-1 rounded"
                >
                  {item}
                </span>
              ))}
            </div>
          </div>
        )}

        {displayRateConditions.length > 0 && (
          <div className="mb-3 rounded-md border border-gray-200 bg-gray-50 p-2">
            <p className="text-xs font-medium text-[#4a4260] mb-1">Rate Conditions:</p>
            <div className="space-y-1">
              {displayRateConditions.map((item, idx) => (
                <p key={`rc-${idx}`} className="text-xs text-gray-700 line-clamp-2">
                  {item}
                </p>
              ))}
            </div>
          </div>
        )}

        {/* Facilities */}
        {hotel.facilities && hotel.facilities.length > 0 && (
          <div className="mb-3">
            <p className="text-xs font-medium text-[#4a4260] mb-2">Facilities:</p>
            <div className="flex flex-wrap gap-1">
              {hotel.facilities.slice(0, 3).map((facility, idx) => (
                <span
                  key={idx}
                  className="inline-block bg-green-50 text-green-700 text-xs px-2 py-1 rounded"
                >
                  {facility}
                </span>
              ))}
              {hotel.facilities.length > 3 && (
                <span className="inline-block text-xs text-gray-500 px-2 py-1">
                  +{hotel.facilities.length - 3} more
                </span>
              )}
            </div>
          </div>
        )}

        {/* Select Button */}
        <Button
          onClick={handleSelect}
          disabled={isLoading || !isSelectable}
          className="w-full bg-[#4ba3c3] hover:bg-[#3a92b2] text-white h-10 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-600"
        >
          {isLoading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Selecting...
            </>
          ) : !isSelectable ? (
            availabilityLabel || 'Unavailable'
          ) : isOfflineOption ? (
            'Choose for Approval'
          ) : (
            'Select & Continue'
          )}
        </Button>
      </div>
    </div>
  );
};
