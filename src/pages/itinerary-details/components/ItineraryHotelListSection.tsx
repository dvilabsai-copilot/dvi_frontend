import type { RefObject } from "react";
import { HotelList } from "../../HotelList";
import type { ItineraryHotelRow, ItineraryHotelTab } from "../../ItineraryDetails";
import type { HotelAvailabilityChangeSummary, HotelAvailabilityMeta, ItineraryHotelSelectionGroupState } from "../itinerary-details.types";

type HotelSelectionUpdate = {
  provider: string; hotelCode: string; bookingCode: string; roomType: string; netAmount: number; hotelName: string;
  checkInDate: string; checkOutDate: string; groupType: number; mealPlan?: string; searchReference?: string;
  roomId?: string; rateId?: string; multiNightBooking?: boolean; stayKey?: string; routeIds?: number[]; nights?: number;
  nightlyRates?: unknown; totalAmountAfterTax?: number; totalPrice?: number; pricePerNight?: number; currency?: string;
  manualRoomMealMismatchOverride?: boolean; optionKey?: string;
};
type Pagination = Record<number, { hasMore: boolean; page: number; pageSize: number; total: number }>;
type RoutePagination = Record<string, { hasMore: boolean; page: number; pageSize: number; total: number; groupType: number }>;
type VoucherData = { routeId: number; hotelId: number; hotelName: string; hotelEmail: string; hotelStateCity: string; routeDates: string[]; dayNumbers: number[]; hotelDetailsIds: number[] };
type ItineraryHotelListSectionProps = {
  hotelListRef: RefObject<HTMLDivElement | null>; summaryStickyHeight: number; hotels: ItineraryHotelRow[]; restrictedHotels: ItineraryHotelRow[];
  hotelTabs: ItineraryHotelTab[]; hotelRatesVisible: boolean; showHotelMargins: boolean; roomCount: number;
  hotelSelectionState?: ItineraryHotelSelectionGroupState[];
  extraBedCount?: number; childWithBedCount?: number; childWithoutBedCount?: number;
  onToggleHotelRates: (visible: boolean) => void; quoteId: string; planId: number; onGroupTypeChange: (groupType: number) => void;
  onRefreshSelectedHotel?: (payload: { routeId: number; provider: string; hotelCode: string }) => Promise<unknown>;
  onAcknowledgeAvailabilityChanges?: (selectionIds: number[]) => Promise<{ appliedCount: number; selectionIds: number[] }>;
  onGetSaveFunction: (saveFn: () => Promise<boolean>) => void; readOnly: boolean; onCreateVoucher: (data: VoucherData) => void;
  onCancelVoucher: (data: VoucherData) => void | Promise<void>; onBulkCancelVouchers: (data: VoucherData[]) => void | Promise<void>;
  onHotelSelectionsChange: (selections: Record<number, HotelSelectionUpdate | null>, financialSummary?: { overallCost?: number | string | null; costBreakdown?: Record<string, unknown> | null }) => void; pagination?: Pagination; routePagination?: RoutePagination; hotelAvailability?: HotelAvailabilityMeta; hotelAvailabilityChangeSummary?: HotelAvailabilityChangeSummary | null; hotelSearchRecoveryMessage?: string | null;
  isValidatingAvailability?: boolean;
  onTemporarySelectionCostPreview?: (selections: Record<number, HotelSelectionUpdate | null>) => Promise<boolean | Record<number, HotelSelectionUpdate | null>>;
  onTotalChange?: (totalAmount: number) => void;
  onLoadMore: (groupType: number, routeId: number, nextPage: number) => void; isLoadingMore: boolean; mealPlanCode?: string; dayDestinationFallback: Record<number, string>;
};

/** Owns the hotel list scroll anchor and the large HotelList callback contract. */
export function ItineraryHotelListSection({ hotelListRef, summaryStickyHeight, ...props }: ItineraryHotelListSectionProps) {
  return (
    <div ref={hotelListRef} id="hotel-list-section" style={{ scrollMarginTop: `${summaryStickyHeight + 12}px` }}>
      <HotelList {...props} hotelAvailability={props.hotelAvailability} />
    </div>
  );
}

export default ItineraryHotelListSection;
