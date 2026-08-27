import type { AgentOption } from "@/services/accountsManagerApi";
import type { StayExtensionPreviewResponse } from "@/services/itinerary";
import type { ItineraryHotelRow, ItineraryHotelTab } from "../ItineraryDetails";
import type { ItineraryHotelSelectionGroupState } from "../itinerary-details/itinerary-details.types";
import type { HotelAvailabilityChangeSummary } from "../itinerary-details/itinerary-details.types";
import type {
  HotelSelectionPreviewOptions,
  HotelSelectionPreviewResult,
} from "../itinerary-details/hooks/useHotelSelectionsChangeMutation";

export type HotelSelectionUpdate = {
  provider: string;
  hotelCode: string;
  bookingCode: string;
  roomType: string;
  netAmount: number;
  hotelName: string;
  hotelId?: number;
  checkInDate: string;
  checkOutDate: string;
  groupType: number;
  mealPlan?: string;
  /** Supplier-specific rate identity used to match the current snapshot. */
  rateOptionId?: string;
  searchReference?: string;
  roomId?: string;
  rateId?: string;
  roomSelections?: Array<Record<string, unknown>>;
  multiNightBooking?: boolean;
  stayKey?: string;
  routeIds?: number[];
  nights?: number;
  nightlyRates?: StayExtensionPreviewResponse["nightlyRates"];
  totalAmountAfterTax?: number;
  totalPrice?: number;
  pricePerNight?: number;
  currency?: string;
  routeId?: number;
  manualRoomMealMismatchOverride?: boolean;
  optionKey?: string;
  roomCount?: number;
  extraBedCount?: number;
  childWithBedCount?: number;
  childWithoutBedCount?: number;
};

export type HotelListProps = {
  hotels: ItineraryHotelRow[];
  restrictedHotels?: ItineraryHotelRow[];
  hotelTabs: ItineraryHotelTab[];
  hotelSelectionState?: ItineraryHotelSelectionGroupState[];
  hotelRatesVisible: boolean;
  showHotelMargins?: boolean;
  hotelAvailability?: {
    sharedHotelInventory?: ItineraryHotelRow[];
    hasSupplierHotels: boolean;
    supplierHotelCount: number;
    placeholderRowCount: number;
    totalSearchRoutes: number;
    emptySearchRoutes: number;
    isPlaceholderOnly: boolean;
    message: string;
    availabilityState?: string;
    recommendationAlgorithm?: "v1" | "v2";
    recommendationGeneration?: {
      version: "v1" | "v2";
      algorithm: "LEGACY_PRICE_PACKAGE" | "TARGET_PRICE_DIVERSITY_BEAM_SEARCH";
      searchRunId?: string;
      generatedAt?: string;
      warnings: string[];
    };
    checkedAt?: string;
    searchRunId?: string;
    providerErrors?: Array<{ provider?: string; message?: string }>;
    emptyStayBlocks?: Array<{
      routeIds: number[];
      dayNumbers: number[];
      dates: string[];
      destination: string;
    }>;
    stayRoutes?: Array<{
      routeId: number;
      dayNumber: number;
      date: string;
      destination: string;
    }>;
    offlineFetch?: {
      requestedRouteIds: number[];
      fetchedHotelCount: number;
      noResultRouteIds: number[];
    };
    earlyArrivalMarkers?: Array<{
      routeId: number;
      groupType: number;
      blockedFromDate: string;
      location: string;
    }>;
    mealPlanAutoSelectionBlocks?: Array<{
      routeId: number;
      groupType: number;
      date: string;
      destination: string;
      requestedMealPlanCode: string;
      availableMealPlanCodes: string[];
      code: string;
      message: string;
    }>;
  };
  hotelAvailabilityChangeSummary?: HotelAvailabilityChangeSummary | null;
  hotelSearchRecoveryMessage?: string | null;
  isValidatingAvailability?: boolean;
  quoteId: string;
  planId: number;
  onToggleHotelRates?: (visible: boolean) => void;
  onRefreshSelectedHotel?: (payload: { routeId: number; provider: string; hotelCode: string; groupType?: number }) => Promise<unknown>;
  onResetHotels?: () => Promise<unknown>;
  onShowOfflineHotels?: (routeId?: number) => void | Promise<void>;
  onAcknowledgeAvailabilityChanges?: (selectionIds: number[]) => Promise<{ appliedCount: number; selectionIds: number[] }>;
  offlineVisibleRouteIds?: number[];
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
  /** Legacy display callback; authoritative totals come from the preview response. */
  onTotalChange?: (totalAmount: number) => void;
  roomCount?: number;
  extraBedCount?: number;
  childWithBedCount?: number;
  childWithoutBedCount?: number;
  onHotelSelectionsChange?: (selections: Record<number, HotelSelectionUpdate | null>) => void;
  onTemporarySelectionCostPreview?: (
    selections: Record<number, HotelSelectionUpdate | null>,
    options?: HotelSelectionPreviewOptions,
  ) => Promise<HotelSelectionPreviewResult>;
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
  extraBedRate?: number;
  extraBedAmount?: number;
  extraBedGstAmount?: number;
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
  isRateUpdate?: boolean;
  previousSelection?: Record<string, unknown> | null;
  previousHotelName: string;
  newHotelName: string;
  routeDate: string;
  groupType?: number;
  multiNightPreview?: StayExtensionPreviewResponse | null;
  skipCostPreview?: boolean;
  keepExpanded?: boolean;
  keepExpandedRowKey?: string | null;
  manualRoomMealMismatchWarning?: ManualRoomMealMismatchWarning | null;
  selectionIntent?: 'HOTEL' | 'ROOM_TYPE' | 'MEAL_PLAN' | 'RATE_OPTION';
  singleNightOnly?: boolean;
  onSelectionApplied?: () => void;
};
