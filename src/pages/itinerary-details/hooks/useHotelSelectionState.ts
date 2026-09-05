import { useRef, useState } from "react";

export type HotelPaginationMessage = {
  groupType: number;
  routeId: number;
  message: string;
};

export interface HotelBookingSelection {
  provider: string;
  hotelCode: string;
  bookingCode: string;
  searchReference?: string;
  roomId?: string;
  rateId?: string;
  roomSelections?: Array<Record<string, unknown>>;
  roomType: string;
  netAmount: number;
  hotelName: string;
  checkInDate: string;
  checkOutDate: string;
  searchInitiatedAt?: string;
  groupType?: number;
  isBookable?: boolean;
  externalStay?: boolean;
  availabilityStatus?: string;
  availabilityMessage?: string | null;
  routeId?: number;
  multiNightBooking?: boolean;
  stayKey?: string;
  routeIds?: number[];
  nights?: number;
  nightlyRates?: Array<{
    date: string;
    amountAfterTax: number;
    baseAmount?: number;
    extraAdultCount?: number;
    extraChildCount?: number;
    extraAdultRate?: number;
    extraChildRate?: number;
  }>;
  totalAmountAfterTax?: number;
  mealPlan?: string;
}

export function useHotelSelectionState() {
    // Consumers intentionally receive a route-keyed map for the active tab.
    // Keep the backing store group-keyed so the same route can hold an
    // independent Group 1 and Group 4 selection at the same time.
    const [selectedHotelBookings, setSelectedHotelBookings] = useState<Record<number, HotelBookingSelection>>({});
    const [selectedHotelBookingsByGroup, setSelectedHotelBookingsByGroup] = useState<Record<number, Record<number, HotelBookingSelection>>>({});
  
    const [selectedHotels, setSelectedHotels] = useState<{ [key: string]: boolean }>({});
    const [activeHotelGroupType, setActiveHotelGroupType] = useState<number | null>(null);
    const [activeHotelListTotal, setActiveHotelListTotal] = useState<number>(0);
    const [activeHotelListPriceBreakdown, setActiveHotelListPriceBreakdown] = useState({
      totalAmount: 0,
      baseAmount: 0,
      marginAmount: 0,
    });
    const [selectedVehicleTotalsByType, setSelectedVehicleTotalsByType] = useState<
      Record<number, { totalAmount: number; totalQty: number }>
    >({});
  const summaryStickyRef = useRef<HTMLDivElement | null>(null);
  const hotelListRef = useRef<HTMLDivElement | null>(null);
  const vehicleListRef = useRef<HTMLDivElement | null>(null);
  const [isRoomCostPopoverOpen, setIsRoomCostPopoverOpen] = useState(false);
  const [summaryStickyHeight, setSummaryStickyHeight] = useState(0);
  const [hotelPageByGroupRoute, setHotelPageByGroupRoute] = useState<Record<string, number>>({});
  const [isLoadingMoreHotels, setIsLoadingMoreHotels] = useState(false);
  const [hotelPaginationMessage, setHotelPaginationMessage] = useState<HotelPaginationMessage | null>(null);
  return {
    selectedHotelBookings, setSelectedHotelBookings, selectedHotels, setSelectedHotels,
    selectedHotelBookingsByGroup, setSelectedHotelBookingsByGroup,
    activeHotelGroupType, setActiveHotelGroupType, activeHotelListTotal, setActiveHotelListTotal,
    activeHotelListPriceBreakdown, setActiveHotelListPriceBreakdown,
    selectedVehicleTotalsByType, setSelectedVehicleTotalsByType, isRoomCostPopoverOpen, setIsRoomCostPopoverOpen,
    summaryStickyRef, hotelListRef, vehicleListRef, summaryStickyHeight, setSummaryStickyHeight,
    hotelPageByGroupRoute, setHotelPageByGroupRoute, isLoadingMoreHotels, setIsLoadingMoreHotels,
    hotelPaginationMessage, setHotelPaginationMessage,
  };
}
