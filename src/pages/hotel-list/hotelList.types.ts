import type { AgentOption } from "@/services/accountsManagerApi";
import type { StayExtensionPreviewResponse } from "@/services/itinerary";
import type { ItineraryHotelRow, ItineraryHotelTab } from "../ItineraryDetails";

export type HotelSelectionUpdate = {
  provider: string;
  hotelCode: string;
  bookingCode: string;
  roomType: string;
  netAmount: number;
  hotelName: string;
  checkInDate: string;
  checkOutDate: string;
  groupType: number;
  mealPlan?: string;
  searchReference?: string;
  roomId?: string;
  rateId?: string;
  multiNightBooking?: boolean;
  stayKey?: string;
  routeIds?: number[];
  nights?: number;
  nightlyRates?: StayExtensionPreviewResponse["nightlyRates"];
  totalAmountAfterTax?: number;
  manualRoomMealMismatchOverride?: boolean;
};

export type HotelListProps = {
  hotels: ItineraryHotelRow[];
  restrictedHotels?: ItineraryHotelRow[];
  hotelTabs: ItineraryHotelTab[];
  hotelRatesVisible: boolean;
  showHotelMargins?: boolean;
  hotelAvailability?: {
    hasSupplierHotels: boolean;
    supplierHotelCount: number;
    placeholderRowCount: number;
    totalSearchRoutes: number;
    emptySearchRoutes: number;
    isPlaceholderOnly: boolean;
    message: string;
  };
  quoteId: string;
  planId: number;
  onToggleHotelRates?: (visible: boolean) => void;
  onRefresh?: () => void;
  onGroupTypeChange?: (groupType: number) => void;
  onGetSaveFunction?: (saveFn: () => Promise<boolean>) => void;
  readOnly?: boolean;
  onCreateVoucher?: (hotelData: {
    routeId: number;
    hotelId: number;
    hotelName: string;
    hotelEmail: string;
    hotelStateCity: string;
    routeDates: string[];
    dayNumbers: number[];
    hotelDetailsIds: number[];
  }) => void;
  onCancelVoucher?: (hotelData: {
    routeId: number;
    hotelId: number;
    hotelName: string;
    hotelEmail: string;
    hotelStateCity: string;
    routeDates: string[];
    dayNumbers: number[];
    hotelDetailsIds: number[];
  }) => void | Promise<void>;
  onBulkCancelVouchers?: (hotels: Array<{
    routeId: number;
    hotelId: number;
    hotelName: string;
    hotelEmail: string;
    hotelStateCity: string;
    routeDates: string[];
    dayNumbers: number[];
    hotelDetailsIds: number[];
  }>) => void | Promise<void>;
  onTotalChange?: (totalAmount: number) => void;
  roomCount?: number;
  onHotelSelectionsChange?: (selections: Record<number, HotelSelectionUpdate | null>) => void;
  dayDestinationFallback?: Record<number, string>;
  pagination?: Record<number, { hasMore: boolean; page: number; pageSize: number; total: number }>;
  routePagination?: Record<string, { hasMore: boolean; page: number; pageSize: number; total: number; groupType: number }>;
  onLoadMore?: (groupType: number, routeId: number, nextPage: number) => void;
  isLoadingMore?: boolean;
  mealPlanCode?: string | null;
};

export type RoomTypeOption = {
  roomTypeId: number;
  roomTypeTitle: string;
};

export type HotelRoomDetail = {
  itineraryPlanId?: number;
  itineraryRouteId?: number;
  itineraryPlanHotelRoomDetailsId?: number;
  hotelId?: number;
  hotelName?: string;
  hotelCategory?: number | null;
  roomTypeId?: number;
  roomTypeName?: string;
  availableRoomTypes?: RoomTypeOption[];
  noOfRooms?: number;
  adultCount?: number;
  childWithBed?: number;
  childWithoutBed?: number;
  extraBedCount?: number;
  perNightAmount?: number;
  pricePerNight?: number;
  taxAmount?: number;
  totalAmount?: number;
  groupType?: number;
  [key: string]: unknown;
};

export type ManualRoomMealMismatchWarning = {
  enabled: boolean;
  message: string;
  previousLabel?: string;
  selectedLabel?: string;
};

export type PendingHotelAction = {
  room: HotelRoomDetail;
  isReplacing: boolean;
  previousHotelName: string;
  newHotelName: string;
  routeDate: string;
  groupType?: number;
  multiNightPreview?: StayExtensionPreviewResponse | null;
  manualRoomMealMismatchWarning?: ManualRoomMealMismatchWarning | null;
};
