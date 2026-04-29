import React from 'react';
import { Building2, Star, MapPin, Loader2 } from 'lucide-react';
import { HotelSearchResult } from '@/hooks/useHotelSearch';
import { Button } from '@/components/ui/button';

interface HotelSearchResultCardProps {
  hotel: HotelSearchResult;
  onSelect: (hotelCode: string, hotelName: string, bookingCode?: string) => void;
  isLoading?: boolean;
  checkInDate: string;
  checkOutDate: string;
}

export const HotelSearchResultCard: React.FC<HotelSearchResultCardProps> = ({
  hotel,
  onSelect,
  isLoading,
  checkInDate,
  checkOutDate,
}) => {
  const handleSelect = () => {
    onSelect(hotel.hotelCode, hotel.hotelName, hotel.bookingCode);
  };
  const displayInclusions = (hotel.inclusions || []).slice(0, 3);
  const displayAmenities = (hotel.amenities || []).slice(0, 3);
  const displayRateConditions = (hotel.rateConditions || [])
    .map((item) => String(item || '').replace(/<[^>]*>/g, '').trim())
    .filter(Boolean)
    .slice(0, 2);

  // Calculate number of nights
  const checkIn = new Date(checkInDate);
  const checkOut = new Date(checkOutDate);
  const nights = Math.ceil(
    (checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24)
  );
  const totalPrice = hotel.price * nights;

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
          <div className="absolute top-2 left-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white px-3 py-1 rounded-full text-xs font-bold shadow-lg">
            {hotel.provider === 'tbo' ? 'TBO' : hotel.provider}
          </div>
        )}

        {/* Availability Badge */}
        {hotel.availableRooms !== undefined && (
          <div className="absolute top-2 right-2 bg-white px-3 py-1 rounded-full text-xs font-semibold text-[#4ba3c3]">
            {hotel.availableRooms > 0 ? (
              <span className="flex items-center gap-1">
                <span className="inline-block w-2 h-2 bg-green-500 rounded-full"></span>
                {hotel.availableRooms} rooms
              </span>
            ) : (
              <span className="text-red-600">Sold Out</span>
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
        <div className="flex items-start gap-1 mb-3">
          <MapPin className="h-4 w-4 text-gray-400 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-[#6c6c6c] line-clamp-2">{hotel.address}</p>
        </div>

        {/* Pricing Section */}
        <div className="bg-gray-50 rounded-lg p-3 mb-3">
          <div className="flex justify-between items-center mb-1">
            <span className="text-xs text-gray-600">Net Amount</span>
            <span className="text-lg font-bold text-[#4ba3c3]">
              ₹ {hotel.price.toLocaleString()}
            </span>
          </div>
          {hotel.totalFare && Number(hotel.totalFare) !== Number(hotel.price) && (
            <div className="flex justify-between items-center text-xs text-gray-500 mb-1">
              <span>Total Fare</span>
              <span>₹ {Number(hotel.totalFare).toLocaleString()}</span>
            </div>
          )}
          <div className="flex justify-between items-center pt-2 border-t border-gray-200">
            <span className="text-xs text-gray-600">
              {nights} night{nights !== 1 ? 's' : ''}
            </span>
            <span className="text-sm font-semibold text-[#4a4260]">
              ₹ {totalPrice.toLocaleString()}
            </span>
          </div>
        </div>

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
          disabled={isLoading}
          className="w-full bg-[#4ba3c3] hover:bg-[#3a92b2] text-white h-10"
        >
          {isLoading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Selecting...
            </>
          ) : (
            'Select & Continue'
          )}
        </Button>
      </div>
    </div>
  );
};
