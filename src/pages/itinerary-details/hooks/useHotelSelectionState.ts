import { useRef, useState } from "react";

export function useHotelSelectionState() {
    const [selectedHotelBookings, setSelectedHotelBookings] = useState<{
      [routeId: number]: {
        provider: string;
        hotelCode: string;
        bookingCode: string;
        searchReference?: string;
        roomId?: string;
        rateId?: string;
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
    }>({});
  
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
  return {
    selectedHotelBookings, setSelectedHotelBookings, selectedHotels, setSelectedHotels,
    activeHotelGroupType, setActiveHotelGroupType, activeHotelListTotal, setActiveHotelListTotal,
    activeHotelListPriceBreakdown, setActiveHotelListPriceBreakdown,
    selectedVehicleTotalsByType, setSelectedVehicleTotalsByType, isRoomCostPopoverOpen, setIsRoomCostPopoverOpen,
    summaryStickyRef, hotelListRef, vehicleListRef, summaryStickyHeight, setSummaryStickyHeight,
    hotelPageByGroupRoute, setHotelPageByGroupRoute, isLoadingMoreHotels, setIsLoadingMoreHotels,
  };
}
