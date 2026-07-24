import { isManualApprovalHotel } from "./domain.utils";

type HotelSelectionRecord = Record<string, unknown>;

export interface QuotationHotelBooking {
  provider: string;
  routeId: number;
  hotelCode?: unknown;
  hotelName?: unknown;
  bookingCode?: unknown;
  roomType?: unknown;
  checkInDate?: unknown;
  checkOutDate?: unknown;
  netAmount?: unknown;
  searchInitiatedAt?: unknown;
  routeIds?: unknown;
  [key: string]: unknown;
}

interface QuotationHotelBookingOptions {
  autoSelectedHotels: Record<number, HotelSelectionRecord>;
  requiresHotelBookingFlow: boolean;
  isSupplierBookableHotel: (hotel: HotelSelectionRecord) => boolean;
  inferHotelProvider: (hotel: HotelSelectionRecord) => string;
  occupancies: readonly { adults: number; children: number; childrenAges: number[] }[];
  roomCount: number;
  guestNationality: string;
  passengers: readonly Record<string, unknown>[];
  toMoneyNumber: (value: string | number | null | undefined) => number;
}

/** Normalizes selected hotel rows into the provider-neutral confirmation booking shape. */
export const buildQuotationHotelBookings = ({
  autoSelectedHotels,
  requiresHotelBookingFlow,
  isSupplierBookableHotel,
  inferHotelProvider,
  occupancies,
  roomCount,
  guestNationality,
  passengers,
  toMoneyNumber,
}: QuotationHotelBookingOptions): QuotationHotelBooking[] => {
  if (!requiresHotelBookingFlow) return [];

  return Object.entries(autoSelectedHotels)
    .filter(([, hotel]) => isSupplierBookableHotel(hotel) || isManualApprovalHotel(hotel))
    .map(([routeId, hotel]) => ({
      occupancies,
      provider: inferHotelProvider(hotel),
      routeId: parseInt(routeId, 10),
      hotelCode: hotel.hotelCode,
      hotelName: hotel.hotelName,
      bookingCode: hotel.bookingCode,
      searchReference: hotel.searchReference,
      roomId: hotel.roomId,
      rateId: hotel.rateId,
      mealPlan: hotel.mealPlan,
      roomType: hotel.roomType,
      checkInDate: hotel.checkInDate,
      checkOutDate: hotel.checkOutDate,
      numberOfRooms: Number(roomCount || 1),
      guestNationality,
      netAmount: toMoneyNumber(hotel.netAmount as string | number),
      searchInitiatedAt: hotel.searchInitiatedAt,
      isBookable: hotel.isBookable,
      externalStay: hotel.externalStay,
      availabilityStatus: hotel.availabilityStatus,
      availabilityMessage: hotel.availabilityMessage,
      bookingMode: hotel.bookingMode,
      priceSource: hotel.priceSource,
      requiresHotelApproval: hotel.requiresHotelApproval,
      approvalStatus: hotel.approvalStatus,
      manualConfirmationStatus: hotel.manualConfirmationStatus,
      selectedRateOptionId: hotel.selectedRateOptionId || hotel.rateOptionId,
      selectedPricePerNight: hotel.selectedPricePerNight || hotel.pricePerNight,
      selectedTotalPrice: hotel.selectedTotalPrice || hotel.totalStayPrice,
      selectedCurrency: hotel.selectedCurrency || hotel.currency,
      selectedPriceSnapshot: hotel.selectedPriceSnapshot,
      multiNightBooking: hotel.multiNightBooking,
      stayKey: hotel.stayKey,
      routeIds: hotel.routeIds,
      nights: hotel.nights,
      nightlyRates: hotel.nightlyRates,
      totalAmountAfterTax: hotel.totalAmountAfterTax,
      passengers,
    }));
};
