// FILE: src/pages/itineraries/HotelList.tsx
import React, { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import styles from "./HotelList.module.css";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { AlertTriangle, Loader2, Edit } from "lucide-react";
import { toast } from "sonner";
import type {
  ItineraryHotelRow,
  ItineraryHotelTab,
} from "./ItineraryDetails";
import { ItineraryService } from "@/services/itinerary";
import { HotelRoomSelectionModal } from "@/components/hotels/HotelRoomSelectionModal";

type HotelListProps = {
  hotels: ItineraryHotelRow[];
  hotelTabs: ItineraryHotelTab[];
  hotelRatesVisible: boolean;
  hotelAvailability?: {
    hasSupplierHotels: boolean;
    supplierHotelCount: number;
    placeholderRowCount: number;
    totalSearchRoutes: number;
    emptySearchRoutes: number;
    isPlaceholderOnly: boolean;
    message: string;
  };
  quoteId: string; // ✅ Required: Quote ID from parent
  planId: number; // ✅ Required: Plan ID for hotel selection
  // Optional: in case you later wire an API to persist the toggle
  onToggleHotelRates?: (visible: boolean) => void;
  // Callback to refresh parent data after hotel update
  onRefresh?: () => void;
  // Callback when hotel group type (recommendation tab) changes
  onGroupTypeChange?: (groupType: number) => void;
  // ✅ Callback to get save function reference (called once on mount)
  onGetSaveFunction?: (saveFn: () => Promise<boolean>) => void;
  // ✅ NEW: Read-only mode for confirmed itinerary
  readOnly?: boolean;
  // ✅ NEW: Callback to open hotel voucher modal
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
  // ✅ NEW: Callback when total selected hotel amount changes
  onTotalChange?: (totalAmount: number) => void;
  roomCount?: number;
  // ✅ NEW: Callback when hotel selections change (for confirm quotation payload)
  onHotelSelectionsChange?: (selections: Record<number, {
    provider: string;
    hotelCode: string;
    bookingCode: string;
    roomType: string;
    netAmount: number;
    hotelName: string;
    checkInDate: string;
    checkOutDate: string;
    groupType: number;
  }>) => void;
  dayDestinationFallback?: Record<number, string>;
  /** Pagination metadata: Record<groupType, { hasMore, page, pageSize, total }> */
  pagination?: Record<number, { hasMore: boolean; page: number; pageSize: number; total: number }>;
  /** Per-route/day metadata for day-wise load more */
  routePagination?: Record<string, { hasMore: boolean; page: number; pageSize: number; total: number; groupType: number }>;
  /** Called when user clicks Load More inside a day/route */
  onLoadMore?: (groupType: number, routeId: number, nextPage: number) => void;
  /** Whether Load More is currently fetching */
  isLoadingMore?: boolean;
};

// Shape of each room item coming from /itineraries/hotel_room_details
type RoomTypeOption = {
  roomTypeId: number;
  roomTypeTitle: string;
};

type HotelRoomDetail = {
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
  pricePerNight?: number; // ✅ Price from TBO API
  taxAmount?: number;
  totalAmount?: number;
  groupType?: number; // ✅ Tier/category from TBO API
  [key: string]: any; // keep flexible – we only use a few fields
};

const formatCurrency = (value: number | undefined | null): string => {
  const num = Number(value ?? 0);
  if (Number.isNaN(num)) return "₹ 0.00";
  return (
    "₹ " +
    num.toLocaleString("en-IN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
  );
};

export const HotelList: React.FC<HotelListProps> = ({
  hotels,
  hotelTabs,
  hotelRatesVisible,
  hotelAvailability,
  quoteId, // ✅ Receive quoteId from parent
  planId, // ✅ Receive planId from parent
  onToggleHotelRates,
  onRefresh,
  onGroupTypeChange,
  onGetSaveFunction,
  readOnly = false, // ✅ NEW: Default to edit mode
  onCreateVoucher, // ✅ NEW: Callback for voucher creation
  onTotalChange, // ✅ NEW: Callback for total amount changes
  roomCount = 1,
  onHotelSelectionsChange, // ✅ NEW: Callback for selections
  dayDestinationFallback = {},
  pagination,
  routePagination,
  onLoadMore,
  isLoadingMore = false,
}) => {
  const toNumber = (value: unknown, fallback = 0): number => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  };

  const getStayKey = (hotel: Pick<ItineraryHotelRow, 'itineraryRouteId' | 'date' | 'day'>): string => {
    return `${toNumber(hotel.itineraryRouteId, 0)}::${String(hotel.date || hotel.day || '').trim()}`;
  };

  const getEffectiveRoomCount = (hotel: Pick<ItineraryHotelRow, 'noOfRooms'>): number => {
    const rowRooms = toNumber((hotel as any).noOfRooms, 0);
    const itineraryRooms = toNumber(roomCount, 1);
    return Math.max(rowRooms || itineraryRooms || 1, 1);
  };

  const getHotelAmountWithRooms = (hotel: Pick<ItineraryHotelRow, 'totalHotelCost' | 'totalHotelTaxAmount' | 'noOfRooms'>): number => {
    const baseAmount = toNumber(hotel.totalHotelCost, 0) + toNumber(hotel.totalHotelTaxAmount, 0);
    return baseAmount * getEffectiveRoomCount(hotel);
  };

  const getHotelsForStay = (sourceHotels: ItineraryHotelRow[], routeId: number, stayDate: string) => {
    const hotelsForRoute = sourceHotels
      .filter((h: any) => toNumber(h.itineraryRouteId, 0) === routeId)
      .filter((h: any) => String(h.date || '').trim() === stayDate)
      .map((h: any) => ({
        ...h,
        itineraryPlanId: planId,
        hotelCategory: h.category,
        pricePerNight: h.totalHotelCost,
        perNightAmount: h.totalHotelCost,
        taxAmount: h.totalHotelTaxAmount || 0,
        totalAmount: getHotelAmountWithRooms(h),
        noOfRooms: getEffectiveRoomCount(h),
        roomTypeName: h.roomType,
        availableRoomTypes: h.roomType
          ? [
              {
                roomTypeId: 1,
                roomTypeTitle: h.roomType,
              },
            ]
          : [],
      }));

    return Array.from(new Map(hotelsForRoute.map((hotel) => [`${hotel.hotelId}-${hotel.hotelName}`, hotel])).values());
  };

  // ✅ Track selected hotel PER GROUP TYPE and PER STAY
  // Structure: selectedByGroup[groupType][stayKey] = selected hotel row
  // This allows separate selections for previous-day billed stays on the same route.
  const [selectedByGroup, setSelectedByGroup] = useState<Record<number, Record<string, ItineraryHotelRow>>>({});

  // ✅ Track unsaved hotel selections (for batch save on confirm)
  const [unsavedSelections, setUnsavedSelections] = useState<Map<string, HotelRoomDetail>>(new Map());

  // ✅ Local copy of hotels that can be updated immediately
  const [localHotels, setLocalHotels] = useState<ItineraryHotelRow[]>(hotels);

  // Active tab = current group_type from backend
  const [activeGroupType, setActiveGroupType] = useState<number | null>(null);
  // Local "Display Rates" state driven by backend flag
  const [showRates, setShowRates] = useState<boolean>(hotelRatesVisible);

  // Expanded hotel row key & loaded rooms
  const [expandedRowKey, setExpandedRowKey] = useState<string | null>(null);
  const [loadingRowKey, setLoadingRowKey] = useState<string | null>(null);
  const [loadingProgress, setLoadingProgress] = useState<number>(0);
  const [roomDetails, setRoomDetails] = useState<HotelRoomDetail[]>([]);
  const [selectedHotelId, setSelectedHotelId] = useState<number | null>(null);
  const [isUpdatingHotel, setIsUpdatingHotel] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false); // ✅ Track sync operation

  // Cache for hotel room details by quoteId
  const [roomDetailsCache, setRoomDetailsCache] = useState<Record<string, HotelRoomDetail[]>>({});

  // ✅ Sync local hotels with prop changes and auto-select hotels for ALL groupTypes
  useEffect(() => {
    setLocalHotels(hotels);

    if (hotels.length === 0) return;

    // Auto-select cheapest hotel per stay for EACH groupType.
    setSelectedByGroup(prev => {
      const newSelected = { ...prev };
      const hotelsByGroupAndStay: Record<number, Record<string, ItineraryHotelRow[]>> = {};

      hotels.forEach(h => {
        if (!hotelsByGroupAndStay[h.groupType]) {
          hotelsByGroupAndStay[h.groupType] = {};
        }
        const stayKey = getStayKey(h);
        if (!hotelsByGroupAndStay[h.groupType][stayKey]) {
          hotelsByGroupAndStay[h.groupType][stayKey] = [];
        }
        hotelsByGroupAndStay[h.groupType][stayKey].push(h);
      });

      Object.entries(hotelsByGroupAndStay).forEach(([groupTypeStr, stayMap]) => {
        const groupType = Number(groupTypeStr);

        if (!newSelected[groupType]) {
          newSelected[groupType] = {};
        }

        Object.entries(stayMap).forEach(([stayKey, hotelOptions]) => {
          if (!newSelected[groupType][stayKey]) {
            const sortedByPrice = [...hotelOptions].sort((a, b) => {
              const priceA = (a.totalHotelCost || 0) + (a.totalHotelTaxAmount || 0);
              const priceB = (b.totalHotelCost || 0) + (b.totalHotelTaxAmount || 0);
              return priceA - priceB;
            });

            const cheapest = sortedByPrice[0];
            if (cheapest) {
              newSelected[groupType][stayKey] = cheapest;
            }
          }
        });
      });

      return newSelected;
    });
  }, [hotels, planId]);

  // Confirmation dialog state
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [pendingHotelAction, setPendingHotelAction] = useState<{
    room: HotelRoomDetail;
    isReplacing: boolean;
    previousHotelName: string;
    newHotelName: string;
    routeDate: string;
    groupType?: number; // ✅ NEW: The groupType (tier) of the selected hotel
  } | null>(null);

  // Room selection modal state
  const [roomSelectionModal, setRoomSelectionModal] = useState<{
    open: boolean;
    itinerary_plan_hotel_details_ID: number;
    itinerary_plan_id: number;
    itinerary_route_id: number;
    hotel_id: number;
    group_type: number;
    hotel_name: string;
  } | null>(null);

  // ✅ NEW: Hotel search query for expanded row
  const [hotelSearchQuery, setHotelSearchQuery] = useState<string>("");

  // Initialise active tab from backend groups
  useEffect(() => {
    if (!activeGroupType && hotelTabs && hotelTabs.length > 0) {
      const initialGroupType = toNumber(hotelTabs[0].groupType, 1);
      setActiveGroupType(initialGroupType);
      // Notify parent of initial group type
      if (onGroupTypeChange) {
        onGroupTypeChange(initialGroupType);
      }
    }
  }, [activeGroupType, hotelTabs, onGroupTypeChange]);

  // Keep local switch in sync if backend changes
  useEffect(() => {
    setShowRates(hotelRatesVisible);
  }, [hotelRatesVisible]);

  // Keep expanded panel in sync when hotel rows change (e.g. load more)
  useEffect(() => {
    setLoadingRowKey(null);
    if (!expandedRowKey) {
      setRoomDetails([]);
      setSelectedHotelId(null);
      return;
    }

    const [routeIdText, stayDate = ''] = expandedRowKey.split('::');
    const routeId = toNumber(routeIdText, 0);
    if (!routeId || !stayDate) {
      setExpandedRowKey(null);
      setRoomDetails([]);
      setSelectedHotelId(null);
      return;
    }

    const updatedHotels = getHotelsForStay(hotels, routeId, stayDate);
    if (updatedHotels.length === 0) {
      setExpandedRowKey(null);
      setRoomDetails([]);
      setSelectedHotelId(null);
      return;
    }

    setRoomDetails(updatedHotels);
  }, [hotels]);

  // ✅ Get selected hotels for a specific groupType
  const getSelectedHotelsForGroup = (groupType: number): ItineraryHotelRow[] => {
    if (!selectedByGroup[groupType]) return [];
    return Object.values(selectedByGroup[groupType]);
  };

  // ✅ Calculate total for a specific groupType (sum of selected hotels)
  const getGroupTotal = (groupType: number): number => {
    const selectedHotels = getSelectedHotelsForGroup(groupType);
    return selectedHotels.reduce((sum, h) => sum + getHotelAmountWithRooms(h), 0);
  };

  // ✅ Get active tab total
  const getActiveTabTotal = (): number => {
    if (activeGroupType === null) return 0;
    return getGroupTotal(activeGroupType);
  };

  // ✅ Get overall total (sum of active groupType only, as per requirements)
  const getOverallSelectedHotelTotal = (): number => {
    return getActiveTabTotal();
  };

  // Current group's total for display
  const currentTabTotal = useMemo(() => {
    return getActiveTabTotal();
  }, [activeGroupType, selectedByGroup]);

  // Filter hotel rows by groupType (tab) and show SELECTED hotel per route
  const currentHotelRows = useMemo(() => {
    if (!localHotels || !localHotels.length || activeGroupType === null) return [];
    
    // ✅ For confirmed itineraries (readOnly mode), show ONLY ONE confirmed hotel per route
    if (readOnly) {
      const hotelsByRoute = new Map<number, ItineraryHotelRow>();
      const confirmedHotels = localHotels.filter(
        (h) => toNumber(h.itineraryPlanHotelDetailsId) > 0,
      );
      const sourceHotels =
        confirmedHotels.length > 0
          ? confirmedHotels
          : (() => {
              const fallbackGroupType = toNumber(
                activeGroupType ?? hotelTabs?.[0]?.groupType,
                1,
              );
              const hotelsInFallbackGroup = localHotels.filter(
                (h) => toNumber(h.groupType) === fallbackGroupType,
              );
              return hotelsInFallbackGroup.length > 0
                ? hotelsInFallbackGroup
                : localHotels;
            })();
      
      // For each route, keep only the first (confirmed) hotel
      sourceHotels.forEach(h => {
          // Only add if this route doesn't already have a confirmed hotel
          const routeId = toNumber(h.itineraryRouteId);
          if (!hotelsByRoute.has(routeId)) {
            hotelsByRoute.set(routeId, h);
          }
        });
      
      return Array.from(hotelsByRoute.values()).sort((a, b) => {
        const dayA = parseInt(a.day?.replace(/\D/g, '') || '0');
        const dayB = parseInt(b.day?.replace(/\D/g, '') || '0');
        return dayA - dayB;
      });
    }
    
    const hotelsForActiveGroup = localHotels.filter(
      (h) => toNumber(h.groupType) === toNumber(activeGroupType),
    );

    const groupedByStay = new Map<string, ItineraryHotelRow[]>();
    hotelsForActiveGroup.forEach((hotel) => {
      const stayKey = getStayKey(hotel);
      if (!groupedByStay.has(stayKey)) {
        groupedByStay.set(stayKey, []);
      }
      groupedByStay.get(stayKey)!.push(hotel);
    });

    const displayHotels = Array.from(groupedByStay.values()).map((stayHotels) => {
      const stayKey = getStayKey(stayHotels[0]);
      const selectedForStay = selectedByGroup[activeGroupType]?.[stayKey];
      const sortedStayHotels = [...stayHotels].sort((a, b) => {
        const ratingDiff = toNumber(b.category, 0) - toNumber(a.category, 0);
        if (ratingDiff !== 0) return ratingDiff;
        const priceA = getHotelAmountWithRooms(a);
        const priceB = getHotelAmountWithRooms(b);
        if (priceA !== priceB) return priceA - priceB;
        return String(a.hotelName || '').localeCompare(String(b.hotelName || ''));
      });

      if (selectedForStay) {
        const sameStaySelection = sortedStayHotels.find(
          (option) => toNumber(option.hotelId, 0) === toNumber(selectedForStay.hotelId, 0),
        );
        if (sameStaySelection) {
          return sameStaySelection;
        }
      }

      return sortedStayHotels[0];
    });

    return displayHotels.sort((a, b) => {
      const dayA = parseInt(a.day?.replace(/\D/g, '') || '0');
      const dayB = parseInt(b.day?.replace(/\D/g, '') || '0');
      if (dayA !== dayB) return dayA - dayB;
      const dateA = String(a.date || '');
      const dateB = String(b.date || '');
      return dateA.localeCompare(dateB);
    });
  }, [localHotels, activeGroupType, selectedByGroup, readOnly, roomCount]);

  const routeDestinationFallback = useMemo(() => {
    const map: Record<number, string> = {};
    localHotels.forEach((hotel) => {
      const routeId = toNumber(hotel.itineraryRouteId, 0);
      const destination = String(hotel.destination || '').trim();
      if (!routeId || !destination) return;
      if (!map[routeId]) {
        map[routeId] = destination;
      }
    });
    return map;
  }, [localHotels]);

  const getResolvedDestination = (hotel: ItineraryHotelRow): string => {
    const direct = String(hotel.destination || '').trim();
    if (direct) return direct;

    const dayMatch = String(hotel.day || '').match(/Day\s*(\d+)/i);
    const dayNumber = dayMatch ? Number(dayMatch[1]) : 0;
    const fromDay = dayNumber ? String(dayDestinationFallback[dayNumber] || '').trim() : '';
    if (fromDay) return fromDay;

    const fromRoute = String(routeDestinationFallback[toNumber(hotel.itineraryRouteId, 0)] || '').trim();
    if (fromRoute) return fromRoute;

    return '-';
  };

  // ---------- CLICK HANDLER: OPEN HOTEL SELECTION MODAL ----------
  const handleRowClick = async (hotel: ItineraryHotelRow) => {
    if (readOnly) return; // Don't expand in read-only mode

    const rowKey = getStayKey(hotel);

    // Collapse if already open
    if (expandedRowKey === rowKey) {
      setExpandedRowKey(null);
      setRoomDetails([]);
      setSelectedHotelId(null);
      setHotelSearchQuery("");
      return;
    }

    // Collapse any currently expanded row before loading new one
    if (expandedRowKey !== null) {
      setExpandedRowKey(null);
      setRoomDetails([]);
    }

    const itineraryRouteId = hotel.itineraryRouteId;
    const itineraryStayDate = String(hotel.date || '').trim();
    setSelectedHotelId(hotel.hotelId);

    let uniqueHotels = getHotelsForStay(localHotels, Number(itineraryRouteId || 0), itineraryStayDate);

    // ✅ Sort to put selected hotel first, then remaining hotels
    const selectedHotelId = hotel.hotelId;
    if (selectedHotelId) {
      uniqueHotels.sort((a, b) => {
        // Selected hotel comes first
        if (a.hotelId === selectedHotelId) return -1;
        if (b.hotelId === selectedHotelId) return 1;
        // Keep original order for others
        return 0;
      });
    }

    console.log('✅ Filtered from local state:', uniqueHotels.length, 'hotels');
    
    if (uniqueHotels.length > 0) {
      setRoomDetails(uniqueHotels);
      setExpandedRowKey(rowKey);
      setHotelSearchQuery("");
    } else {
      toast.warning('No hotels found for this route');
    }
  };

  // ---------- HELPER: NORMALIZE API ROOM RESPONSE TO UI SHAPE ----------
  const normalizeRoom = (r: any): HotelRoomDetail => {
    const perNightAmount = Number(r.perNightAmount ?? r.pricePerNight ?? 0);
    const nights = Number(r.numberOfNights ?? 1);
    const taxAmount = Number(r.taxAmount ?? 0);
    const baseAmount = Number(
      r.totalAmount ?? r.totalPrice ?? (perNightAmount * nights + taxAmount)
    );
    const effectiveRooms = Math.max(Number(r.noOfRooms ?? roomCount ?? 1), 1);
    const totalAmount = baseAmount * effectiveRooms;

    return {
      ...r,
      itineraryPlanId: Number(r.itineraryPlanId ?? planId),
      itineraryRouteId: Number(r.itineraryRouteId),
      hotelId: Number(r.hotelId),
      hotelName: r.hotelName ?? "",
      hotelCategory: r.hotelCategory ?? r.category ?? null,
      groupType: Number(r.groupType ?? 1),
      perNightAmount,
      taxAmount,
      totalAmount,
      noOfRooms: effectiveRooms,
      roomTypeName: r.roomTypeName ?? r.roomType ?? "",
      availableRoomTypes: Array.isArray(r.availableRoomTypes) ? r.availableRoomTypes : [],
    };
  };

  // ---------- HANDLER: SYNC FRESH HOTELS FOR ROUTE ----------
  const handleSyncRoute = async (routeId: number) => {
    if (!quoteId) return;
    
    // ✅ BLOCK sync when in read-only mode (confirmed itinerary)
    if (readOnly) {
      console.log('⛔ [HotelList] Blocked handleSyncRoute - read-only mode');
      return;
    }

    // ✅ Check for unsaved changes and warn user
    if (unsavedSelections.size > 0) {
      const confirmed = window.confirm(
        `⚠️ You have ${unsavedSelections.size} unsaved hotel selection(s).\n\nSyncing will discard your unsaved changes and fetch fresh hotels from TBO.\n\nDo you want to continue?`
      );
      if (!confirmed) return;
      
      // Clear unsaved selections for this route
      setUnsavedSelections(prev => {
        const newMap = new Map(prev);
        // Remove selections for this specific route
        Array.from(newMap.keys()).forEach(key => {
          if (key.startsWith(`${routeId}-`)) {
            newMap.delete(key);
          }
        });
        return newMap;
      });
    }

    // Save current expanded state to restore it after sync
    const currentExpandedKey = expandedRowKey;
    
    // ✅ Show loader
    setIsSyncing(true);
    
    try {
      // ✅ Pass clearCache: true to force backend to bypass its memory cache
      const response = await ItineraryService.getHotelRoomDetails(quoteId, routeId, true);
      
      // ✅ API returns 'rooms' property, not 'roomDetails'
      const roomsRaw = response?.rooms || response?.roomDetails || [];
      const normalizedRooms: HotelRoomDetail[] = roomsRaw.map((r: any) => normalizeRoom(r));
      
      // ✅ Deduplicate by hotelId to prevent duplicate entries
      const uniqueRooms = Array.from(
        new Map(normalizedRooms.map((r: any) => [r.hotelId, r])).values()
      );
      
      if (uniqueRooms.length > 0) {
        // ✅ Update cache for ALL groupTypes for this route
        const groupedByTier = new Map<number, any[]>();
        uniqueRooms.forEach((room: any) => {
          if (!groupedByTier.has(room.groupType)) {
            groupedByTier.set(room.groupType, []);
          }
          groupedByTier.get(room.groupType)!.push(room);
        });
        
        // Update cache for each tier
        const newCache = { ...roomDetailsCache };
        groupedByTier.forEach((hotels, groupType) => {
          const cacheKey = `${routeId}-${groupType}`;
          newCache[cacheKey] = hotels;
        });
        setRoomDetailsCache(newCache);
        
        // If a row is currently expanded, update its display with fresh data
        if (currentExpandedKey) {
          const expandedHotel = currentHotelRows.find((h) => getStayKey(h) === currentExpandedKey);
          if (expandedHotel) {
            const hotelsForTier = uniqueRooms.filter((r: any) => r.groupType === expandedHotel.groupType);
            setRoomDetails(hotelsForTier);
          }
          setExpandedRowKey(currentExpandedKey);
        }
        
        toast.success(`Hotels refreshed from TBO (${uniqueRooms.length} options found)`);
      } else {
        toast.error('No hotels found for this route');
      }
    } catch (err) {
      console.error('Error syncing hotels:', err);
      toast.error('Failed to sync hotels');
    } finally {
      // ✅ Hide loader
      setIsSyncing(false);
    }
  };

  // ---------- HANDLER: CHOOSE/UPDATE HOTEL ----------
  const handleChooseOrUpdateHotel = async (room: HotelRoomDetail) => {
    console.log('🏨 Choose button clicked', room);
    
    // ✅ BLOCK hotel selection when in read-only mode (confirmed itinerary)
    if (readOnly) {
      console.log('⛔ [HotelList] Blocked handleChooseOrUpdateHotel - read-only mode');
      return;
    }
    
    if (!room.itineraryPlanId || !room.itineraryRouteId || !room.hotelId) {
      console.error('❌ Missing required fields:', {
        itineraryPlanId: room.itineraryPlanId,
        itineraryRouteId: room.itineraryRouteId,
        hotelId: room.hotelId
      });
      toast.error('Missing required hotel information');
      return;
    }

    const roomHotelId = Number(room.hotelId);
    const roomRouteId = Number(room.itineraryRouteId);
    
    const isReplacing = roomHotelId !== selectedHotelId;
    const currentHotel = localHotels.find(h => h.itineraryRouteId === roomRouteId);
    const routeDate = currentHotel?.day || "";

    // Show confirmation dialog
    setPendingHotelAction({
      room,
      isReplacing,
      previousHotelName: currentHotel?.hotelName || "",
      newHotelName: room.hotelName || "",
      routeDate,
      groupType: room.groupType ? Number(room.groupType) : undefined, // ✅ Use hotel's ORIGINAL groupType from TBO (maintains correct tier classification)
    });
    setShowConfirmDialog(true);
  };

  const handleConfirmHotelSelection = async () => {
    if (!pendingHotelAction) return;

    const { room, isReplacing } = pendingHotelAction;

    // Validate required fields
    if (!room.itineraryPlanId || !room.itineraryRouteId || !room.hotelId) {
      toast.error("Missing required hotel information");
      return;
    }

    setIsUpdatingHotel(true);
    try {
      console.log("🏨 [HotelList] Storing hotel selection in state:", {
        hotelName: room.hotelName,
        hotelId: room.hotelId,
        groupType: pendingHotelAction.groupType,
        isReplacing,
      });
      
      // ✅ Store selection by groupType and routeId
      const routeId = toNumber(room.itineraryRouteId);
      const groupType = toNumber(pendingHotelAction.groupType ?? activeGroupType, 1);
      
      // Find the full hotel row from localHotels
      const selectedHotel = localHotels.find(h => 
        toNumber(h.hotelId) === toNumber(room.hotelId) && 
        toNumber(h.itineraryRouteId) === routeId &&
        toNumber(h.groupType) === groupType
      );
      
      if (!selectedHotel) {
        console.error('❌ Could not find hotel in localHotels');
        toast.error('Failed to select hotel');
        return;
      }
      
      const stayKey = getStayKey(selectedHotel);

      // Update selectedByGroup[groupType][stayKey]
      setSelectedByGroup(prev => {
        const newSelected = { ...prev };
        if (!newSelected[groupType]) {
          newSelected[groupType] = {};
        }
        newSelected[groupType][stayKey] = selectedHotel;
        return newSelected;
      });
      
      // Mark as unsaved selection for backend save
      const selectionKey = `${routeId}-${groupType}`;
      setUnsavedSelections(prev => {
        const newMap = new Map(prev);
        newMap.set(selectionKey, room);
        return newMap;
      });
      
      setShowConfirmDialog(false);
      setPendingHotelAction(null);
      
      // ✅ Keep expanded row open and update selectedHotelId to show correct button state
      setSelectedHotelId(Number(room.hotelId));
      
      toast.success("Hotel selected! 👍", {
        description: `${room.hotelName} - Changes will be saved when you confirm the quotation`,
      });
      
      // ✅ Switch to the hotel's tier tab automatically (show where it was saved)
      if (pendingHotelAction?.groupType !== undefined && pendingHotelAction.groupType !== activeGroupType) {
        setActiveGroupType(pendingHotelAction.groupType);
        if (onGroupTypeChange) {
          onGroupTypeChange(pendingHotelAction.groupType);
        }
        console.log(`🔄 [HotelList] Switched to hotel's tier tab (groupType: ${pendingHotelAction.groupType})`);
      }
    } catch (err) {
      console.error("❌ [HotelList] Error selecting hotel:", err);
      setShowConfirmDialog(false);
      setPendingHotelAction(null);
      toast.error("Failed to select hotel", {
        description: "Please try again",
      });
    } finally {
      setIsUpdatingHotel(false);
    }
  };

  // ---------- FUNCTION: SAVE ALL HOTEL SELECTIONS TO DB ----------
  const saveAllHotelSelections = async () => {
    if (unsavedSelections.size === 0) {
      toast.info("No unsaved hotel selections to save");
      return true;
    }

    console.log(`💾 Saving ${unsavedSelections.size} hotel selections to database...`);
    
    const savePromises: Promise<any>[] = [];
    
    unsavedSelections.forEach((room, selectionKey) => {
      const defaultRoomTypeId = Number(room.availableRoomTypes?.[0]?.roomTypeId ?? 1);
      
      const promise = ItineraryService.selectHotel(
        Number(room.itineraryPlanId),
        Number(room.itineraryRouteId),
        Number(room.hotelId),
        defaultRoomTypeId,
        {
          all: false,
          breakfast: false,
          lunch: false,
          dinner: false,
        },
        Number(room.groupType ?? 1)
      );
      
      savePromises.push(promise);
    });

    try {
      await Promise.all(savePromises);
      console.log("✅ All hotel selections saved successfully");
      
      // Clear unsaved selections
      setUnsavedSelections(new Map());
      
      toast.success(`✅ ${savePromises.length} hotel selection(s) saved successfully!`);
      return true;
    } catch (error) {
      console.error("❌ Error saving hotel selections:", error);
      toast.error("Failed to save some hotel selections");
      return false;
    }
  };

  // Expose save function to parent via callback
  React.useEffect(() => {
    if (onGetSaveFunction) {
      onGetSaveFunction(saveAllHotelSelections);
    }
  }, [onGetSaveFunction]);

  // ✅ Notify parent when active group total changes (active groupType only)
  React.useEffect(() => {
    if (onTotalChange && activeGroupType !== null) {
      const total = getActiveTabTotal();
      onTotalChange(total);
    }
  }, [activeGroupType, selectedByGroup, onTotalChange, roomCount]);

  // ✅ Notify parent when hotel selections change (for confirm quotation)
  React.useEffect(() => {
    if (onHotelSelectionsChange && activeGroupType !== null) {
      // Get selected hotels for the active group type
      const selectedHotels = getSelectedHotelsForGroup(activeGroupType);
      
      // Build selections map by routeId
      const selections: Record<number, any> = {};
      selectedHotels.forEach(hotel => {
        const routeDay = localHotels.find(h => 
          toNumber(h.itineraryRouteId) === toNumber(hotel.itineraryRouteId) && 
          toNumber(h.groupType) === toNumber(activeGroupType)
        );
        
        if (routeDay) {
          const checkInDate = hotel.checkInDate || hotel.date || routeDay.day?.split(' | ')[1] || '';
          const checkOutDate = hotel.checkOutDate || (checkInDate 
            ? new Date(new Date(checkInDate).getTime() + 24*60*60*1000).toISOString().split('T')[0]
            : '');
          
          // ✅ HOBSE support: Use hotelCode/bookingCode if available (provider-specific), fallback to hotelId
          const hotelCodeForProvider = hotel.hotelCode || String(hotel.hotelId);
          const bookingCodeForProvider = hotel.bookingCode || String(hotel.hotelId);
          
          const existingEntry = selections[hotel.itineraryRouteId];
          selections[hotel.itineraryRouteId] = {
            provider: hotel.provider || 'tbo',
            hotelCode: hotelCodeForProvider,
            bookingCode: bookingCodeForProvider,
            roomType: hotel.roomType || 'Standard',
            netAmount: (existingEntry?.netAmount || 0) + (hotel.totalHotelCost || 0),
            hotelName: hotel.hotelName || '',
            checkInDate: existingEntry?.checkInDate || checkInDate,
            checkOutDate,
            groupType: toNumber(activeGroupType, 1),
          };
        }
      });
      
      onHotelSelectionsChange(selections);
    }
  }, [activeGroupType, selectedByGroup, onHotelSelectionsChange, localHotels]);


  // ---------- RENDER ----------
  return (
    <Card className="border-none shadow-none bg-white relative">
      {/* Loading Overlay with Spinner */}
      {loadingRowKey !== null && (
        <div className="fixed inset-0 bg-black/20 flex items-center justify-center z-50 rounded-lg">
          <div className="bg-white rounded-lg p-8 shadow-lg flex flex-col items-center gap-4">
            <Loader2 className="w-12 h-12 text-[#7c3aed] animate-spin" />
            <p className="text-sm font-medium text-[#4a4260]">Loading hotel details...</p>
          </div>
        </div>
      )}
      <CardContent className="pt-2">
        {/* Header + Display Rates toggle */}
        <div className="flex justify-between items-center py-2 mb-1">
          {/* ✅ Read-only mode: Show simple "Hotel Details (₹ total)" like PHP */}
          {readOnly ? (
            <h2 className="text-lg font-semibold text-[#4a4260]">
              Hotel Details ({formatCurrency(getOverallSelectedHotelTotal())})
            </h2>
          ) : (
            <h2 className="text-sm font-bold tracking-wider text-[#5d5f65]">HOTEL LIST</h2>
          )}

          {/* PHP-style toggle switch */}
          <div className="flex items-center gap-3">
            <span className="text-xs font-medium text-[#5d5f65]">Display Rates</span>
            <label className={styles["switch-label"]}>
              <input
                type="checkbox"
                checked={showRates}
                onChange={() => {
                  const next = !showRates;
                  setShowRates(next);
                  if (onToggleHotelRates) {
                    onToggleHotelRates(next);
                  }
                }}
                className={styles["switch-input"]}
              />
              <span className={styles["switch-toggle-slider"]}>
                <span className={styles["switch-on"]}></span>
              </span>
            </label>
          </div>
        </div>

        {/* ✅ Unsaved Changes Indicator */}
        {unsavedSelections.size > 0 && (
          <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-center gap-2">
            <span className="text-amber-600 font-medium">⚠️ {unsavedSelections.size} unsaved hotel selection(s)</span>
            <span className="text-amber-600 text-sm">- Changes will be saved when you confirm the quotation</span>
          </div>
        )}

        {hotelAvailability && (
          <div
            className={`mb-4 rounded-lg border px-3 py-2 text-sm ${
              hotelAvailability.isPlaceholderOnly
                ? "border-red-200 bg-red-50 text-red-700"
                : "border-emerald-200 bg-emerald-50 text-emerald-700"
            }`}
          >
            <p className="font-medium">{hotelAvailability.message}</p>
            <p className="mt-1 text-xs opacity-90">
              Supplier hotels: {hotelAvailability.supplierHotelCount} | Placeholder rows: {hotelAvailability.placeholderRowCount} | Empty routes: {hotelAvailability.emptySearchRoutes}/{hotelAvailability.totalSearchRoutes}
            </p>
          </div>
        )}

        {/* Recommended Hotel Groups – based on real backend groups */}
        {/* ✅ IN READ-ONLY MODE: Hide tabs completely, no group type display */}
        {!readOnly && (
          <div className={styles["hotel-list-nav"]}>
            {hotelTabs && hotelTabs.length > 0 ? (
              hotelTabs.map((tab, index) => {
                const tabGroupType = toNumber(tab.groupType, index + 1);
                const isActive = tabGroupType === toNumber(activeGroupType, -1);
                const tabTotal = getGroupTotal(tabGroupType);
                const recommendationLabels = [
                  "Recommended #1",
                  "Recommended #2", 
                  "Recommended #3",
                  "Recommended #4"
                ];
                return (
                  <button
                    key={tabGroupType}
                    disabled={loadingRowKey !== null}
                    onClick={() => {
                      setActiveGroupType(tabGroupType);
                      setLoadingRowKey("tab-switch");
                      setExpandedRowKey(null);
                      setRoomDetails([]);
                      // Small delay to show loader and simulate tab switch
                      setTimeout(() => {
                        setLoadingRowKey(null);
                        // Notify parent that group type changed
                        if (onGroupTypeChange) {
                          onGroupTypeChange(tabGroupType);
                        }
                      }, 500);
                    }}
                    className={`${styles["nav-link"]} ${isActive ? styles["active"] : ""} disabled:opacity-50 disabled:cursor-not-allowed`}
                    role="tab"
                  >
                    {recommendationLabels[index] || `Option ${index + 1}`} ({formatCurrency(tabTotal)})
                  </button>
                );
              })
            ) : (
              <span className="text-sm text-gray-500">No hotel groups available</span>
            )}
          </div>
        )}

        {/* Hotel Table */}
        <div className="overflow-hidden border border-[#8e59cf]/30 rounded-lg bg-white shadow-sm">
          <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[980px]">
            <thead>
              <tr>
                <th className="px-6 py-4 text-left text-[11px] font-semibold uppercase tracking-[0.025em] text-[#797a81] border-b border-[#dbdade] bg-[#f4f3f8]/70">
                  DAY
                </th>
                <th className="px-6 py-4 text-left text-[11px] font-semibold uppercase tracking-[0.025em] text-[#797a81] border-b border-[#dbdade] bg-[#f4f3f8]/70">
                  DESTINATION
                </th>
                <th className="px-6 py-4 text-left text-[11px] font-semibold uppercase tracking-[0.025em] text-[#797a81] border-b border-[#dbdade] bg-[#f4f3f8]/70 min-w-[220px]">
                  HOTEL NAME - CATEGORY
                </th>
                <th className="px-6 py-4 text-left text-[11px] font-semibold uppercase tracking-[0.025em] text-[#797a81] border-b border-[#dbdade] bg-[#f4f3f8]/70">
                  HOTEL ROOM TYPE
                </th>
                {showRates && (
                  <th className="px-6 py-4 text-left text-[11px] font-semibold uppercase tracking-[0.025em] text-[#797a81] border-b border-[#dbdade] bg-[#f4f3f8]/70 whitespace-nowrap">
                    PRICE
                  </th>
                )}
                <th className="px-6 py-4 text-left text-[11px] font-semibold uppercase tracking-[0.025em] text-[#797a81] border-b border-[#dbdade] bg-[#f4f3f8]/70 whitespace-nowrap">
                  MEAL PLAN
                </th>
              </tr>
            </thead>
            <tbody>
              {currentHotelRows.map((hotel, idx) => {
                const rowKey = getStayKey(hotel);
                const isExpanded = expandedRowKey === rowKey;
                const rowTotal =
                  (hotel.totalHotelCost ?? 0) +
                  (hotel.totalHotelTaxAmount ?? 0);
                const resolvedDestination = getResolvedDestination(hotel);

                return (
                  <React.Fragment key={rowKey}>
                    {/* MAIN ROW */}
                    {/* ✅ IN READ-ONLY MODE: Make row non-clickable */}
                    <tr
                      className={`border-t ${
                        !readOnly && loadingRowKey === null ? "cursor-pointer hover:bg-[#f8f5fc]" : readOnly ? "cursor-default" : "cursor-not-allowed opacity-50"
                      }`}
                      onClick={() => {
                        // Only allow clicking if not in read-only mode and not loading
                        if (!readOnly && loadingRowKey === null) {
                          handleRowClick(hotel);
                        }
                      }}
                    >
                      <td className="px-6 py-4 text-[12px] text-[#5d5f65]">
                        {hotel.day}
                      </td>
                      <td className="px-6 py-4 text-[12px] text-[#5d5f65] font-medium">
                        {resolvedDestination}
                      </td>
                      <td className="px-6 py-4 text-[12px] text-[#5d5f65]">
                        {hotel.hotelName
                          ? hotel.category
                            ? `${hotel.hotelName} -${hotel.category}*`
                            : hotel.hotelName
                          : "-"}
                      </td>
                      <td className="px-6 py-4 text-[12px] text-[#5d5f65]">
                        {hotel.roomType || "-"}
                      </td>
                      {showRates && (
                        <td className="px-6 py-4 text-[12px] text-[#5d5f65] whitespace-nowrap font-bold text-[#303238]">
                          {formatCurrency(rowTotal)}
                        </td>
                      )}
                      <td className="px-6 py-4 text-[12px] text-[#5d5f65] flex items-center justify-between">
                        <span>{hotel.mealPlan || "-"}</span>
                        {readOnly && onCreateVoucher && hotel.hotelId && hotel.hotelName && (
                          hotel.voucherCancelled ? (
                            <Button
                              size="sm"
                              variant="outline"
                              className="ml-2 border-gray-400 text-gray-500 cursor-not-allowed text-xs"
                              disabled
                            >
                              Voucher Cancelled
                            </Button>
                          ) : (
                            <Button
                              size="sm"
                              variant="outline"
                              className="ml-2 border-[#d546ab] text-[#d546ab] hover:bg-[#fdf6ff] text-xs"
                              onClick={(e) => {
                                e.stopPropagation();
                                // Ensure we have a valid date, fallback to today's date if missing
                                const routeDate = hotel.date || new Date().toISOString().split('T')[0];
                                onCreateVoucher({
                                  routeId: hotel.itineraryRouteId,
                                  hotelId: hotel.hotelId!,
                                  hotelName: hotel.hotelName!,
                                  hotelEmail: '',
                                  hotelStateCity: resolvedDestination === '-' ? '' : resolvedDestination,
                                  routeDates: [routeDate],
                                  dayNumbers: [parseInt(hotel.day?.replace('Day ', '') || '0')],
                                  hotelDetailsIds: [hotel.itineraryPlanHotelDetailsId || 0]
                                });
                              }}
                            >
                              Cancel Voucher
                            </Button>
                          )
                        )}
                      </td>
                    </tr>

                    {/* EXPANDED ROW WITH ROOM CARDS */}
                    {isExpanded && (
                      <tr className="bg-[#fdf6ff] border-t">
                        <td
                          colSpan={showRates ? 6 : 5}
                          className="px-4 py-3 text-sm text-[#4a4260]"
                        >
                          {loadingRowKey === rowKey ? (
                            <div className="text-center py-4 text-[#6c6c6c]">
                              Loading room details…
                            </div>
                          ) : roomDetails.length === 0 ? (
                            <div className="text-center py-4 text-[#6c6c6c]">
                              No room details available for this day.
                            </div>
                          ) : (
                            <>
                              {/* Search Box + Sync Button */}
                              <div className="flex justify-between items-center mb-4 gap-3">
                                <input
                                  type="text"
                                  placeholder="Search Hotel..."
                                  value={hotelSearchQuery}
                                  onChange={(e) => setHotelSearchQuery(e.target.value)}
                                  className="flex-1 px-3 py-2 border border-[#e5d9f2] rounded-lg text-sm focus:outline-none focus:border-[#7c3aed]"
                                />
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleSyncRoute(Number(hotel.itineraryRouteId))}
                                  disabled={isSyncing}
                                  className="border-[#7c3aed] text-[#7c3aed] hover:bg-[#f3e8ff] disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                                >
                                  {isSyncing ? (
                                    <>
                                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                      Syncing...
                                    </>
                                  ) : (
                                    <>🔄 Sync Fresh Hotels</>
                                  )}
                                </Button>
                              </div>
                              
                              <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3 lg:grid-cols-4">
                              {roomDetails
                                .filter(h => 
                                  h.hotelName?.toLowerCase().includes(hotelSearchQuery.toLowerCase())
                                )
                                .map((hotel) => {
                                const roomKey = `hotel-${hotel.hotelId}`;

                                return (
                                <div
                                  key={roomKey}
                                  className="bg-white rounded-lg shadow-md border border-[#e5d9f2] overflow-hidden"
                                >
                                  {/* Hotel Image/Header */}
                                  <div className="relative h-40 bg-gradient-to-r from-[#7c3aed] to-[#a855f7]">
                                    {/* Provider Badge */}
                                    {hotel.provider && (
                                      <div className="absolute top-2 right-2 z-10">
                                        <span 
                                          className={`px-2 py-1 rounded-full text-xs font-semibold ${
                                            hotel.provider.toLowerCase() === 'resavenue' 
                                              ? 'bg-emerald-500 text-white' 
                                              : hotel.provider.toLowerCase() === 'tbo'
                                              ? 'bg-blue-500 text-white'
                                              : 'bg-gray-500 text-white'
                                          }`}
                                        >
                                          {hotel.provider.toLowerCase() === 'resavenue' ? '🌟 ResAvenue' : 
                                           hotel.provider.toLowerCase() === 'tbo' ? '🔵 TBO' : 
                                           hotel.provider?.toUpperCase()}
                                        </span>
                                      </div>
                                    )}
                                    <div className="absolute inset-0 flex flex-col justify-end p-3 bg-black/30">
                                      <h3 className="text-white font-semibold text-sm">
                                        {hotel.hotelName}
                                      </h3>
                                      <p className="text-white/90 text-xs">
                                        Category: {hotel.hotelCategory}*
                                      </p>
                                    </div>
                                  </div>

                                  <div className="p-4">{/* Check-in/Check-out times */}
                                    <div className="grid grid-cols-2 gap-2 mb-3 pb-3 border-b">
                                      <div className="flex items-center gap-2">
                                        <div className="w-8 h-8 rounded-full bg-[#f3e8ff] flex items-center justify-center">
                                          <span className="text-[#7c3aed] text-xs">📥</span>
                                        </div>
                                        <div>
                                          <p className="text-xs font-semibold text-[#4a4260]">02:00 PM</p>
                                          <p className="text-xs text-gray-500">Check In</p>
                                        </div>
                                      </div>
                                      <div className="flex items-center gap-2">
                                        <div className="w-8 h-8 rounded-full bg-[#f3e8ff] flex items-center justify-center">
                                          <span className="text-[#7c3aed] text-xs">📤</span>
                                        </div>
                                        <div>
                                          <p className="text-xs font-semibold text-[#4a4260]">12:00 PM</p>
                                          <p className="text-xs text-gray-500">Check Out</p>
                                        </div>
                                      </div>
                                    </div>

                                    {/* Room Type Display with Edit Button */}
                                    <div className="mb-3">
                                      <div className="flex items-center justify-between mb-1">
                                        <label className="block text-xs font-medium text-[#4a4260]">
                                          Room Type
                                        </label>
                                        {!readOnly && (
                                          <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-6 w-6 rounded-full bg-[#d546ab]/10 hover:bg-[#d546ab]/20 text-[#d546ab]"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              
                                              // Ensure group_type is valid (1-4)
                                              const groupType = hotel.groupType || activeGroupType || 1;
                                              
                                              console.log('Opening room selection modal:', {
                                                hotel_id: hotel.hotelId,
                                                group_type: groupType,
                                                hotel_name: hotel.hotelName,
                                              });
                                              
                                              setRoomSelectionModal({
                                                open: true,
                                                itinerary_plan_hotel_details_ID: hotel.itineraryPlanHotelDetailsId || 0,
                                                itinerary_plan_id: planId,
                                                itinerary_route_id: hotel.itineraryRouteId || 0,
                                                hotel_id: hotel.hotelId || 0,
                                                group_type: groupType,
                                                hotel_name: hotel.hotelName || '',
                                              });
                                            }}
                                            title="Select room categories"
                                          >
                                            <Edit className="h-3 w-3" />
                                          </Button>
                                        )}
                                      </div>
                                      <p className="text-sm text-[#4a4260] font-medium">
                                        {hotel.availableRoomTypes && hotel.availableRoomTypes.length > 0 
                                          ? hotel.availableRoomTypes[0].roomTypeTitle 
                                          : "Not Available"}
                                      </p>
                                    </div>

                                    {/* Price Summary */}
                                    <div className="mb-3 p-2 bg-gray-50 rounded text-xs space-y-1">
                                      <div className="flex justify-between">
                                        <span className="text-gray-600">Rooms:</span>
                                        <span className="font-medium">{hotel.noOfRooms ?? 1}</span>
                                      </div>
                                      <div className="flex justify-between">
                                        <span className="text-gray-600">Per night:</span>
                                        <span className="font-medium">{formatCurrency(hotel.perNightAmount)}</span>
                                      </div>
                                      <div className="flex justify-between">
                                        <span className="text-gray-600">Tax:</span>
                                        <span className="font-medium">{formatCurrency(hotel.taxAmount)}</span>
                                      </div>
                                      <div className="flex justify-between pt-1 border-t">
                                        <span className="font-semibold">Total:</span>
                                        <span className="font-semibold text-[#7c3aed]">
                                          {formatCurrency(hotel.totalAmount)}
                                        </span>
                                      </div>
                                    </div>

                                    {/* Choose/Update Button - Conditional based on selection status */}
                                    <button
                                      className="w-full py-2 px-4 bg-[#7c3aed] hover:bg-[#6d28d9] text-white font-medium rounded-md transition-colors text-sm"
                                      onClick={() => handleChooseOrUpdateHotel(hotel)}
                                    >
                                      {(() => {
                                        const groupType = activeGroupType || 1;
                                        const routeId = Number(hotel.itineraryRouteId);
                                        const selected = selectedByGroup[groupType]?.[routeId];
                                        return selected?.hotelId === hotel.hotelId ? "Update" : "Choose";
                                      })()}
                                    </button>
                                  </div>
                                </div>
                              );})}
                            </div>

                              {!readOnly && activeGroupType !== null && (() => {
                                const routeId = Number(hotel.itineraryRouteId || 0);
                                const routeMeta = routePagination?.[`${activeGroupType}-${routeId}`];
                                const hasMoreForRoute = Boolean(routeMeta?.hasMore && routeMeta?.groupType === activeGroupType);
                                if (!hasMoreForRoute) return null;

                                const remaining = Math.max(
                                  0,
                                  Number(routeMeta?.total || 0) - Number(routeMeta?.page || 1) * Number(routeMeta?.pageSize || 20),
                                );

                                return (
                                  <div className="mt-4 flex justify-center">
                                    <Button
                                      variant="outline"
                                      disabled={isLoadingMore}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        onLoadMore?.(activeGroupType, routeId, Number(routeMeta?.page || 1) + 1);
                                      }}
                                      className="border-[#7c3aed] text-[#7c3aed] hover:bg-[#f3eeff]"
                                    >
                                      {isLoadingMore ? (
                                        <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Loading…</>
                                      ) : (
                                        `Load More for this day (${remaining} remaining)`
                                      )}
                                    </Button>
                                  </div>
                                );
                              })()}
                            </>
                          )}
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}

              {/* Hotel Total row for active group */}
              <tr className="border-t bg-[#fdf6ff]">
                <td
                  colSpan={showRates ? 4 : 3}
                  className="px-4 py-3 text-sm font-medium text-[#4a4260] text-right"
                >
                  Hotel Total :
                </td>
                <td className="px-4 py-3 text-sm font-semibold text-[#4a4260]">
                  {formatCurrency(currentTabTotal)}
                </td>
                {!showRates && (
                  <td className="px-4 py-3 text-sm font-semibold text-[#4a4260]" />
                )}
              </tr>
            </tbody>
          </table>
        </div>
        </div>

      </CardContent>

      {/* Confirmation Dialog */}
      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="flex justify-center mb-4">
              <div className="rounded-full bg-yellow-100 p-3">
                <AlertTriangle className="h-6 w-6 text-yellow-600" />
              </div>
            </div>
            <DialogTitle className="text-center">
              {pendingHotelAction?.isReplacing
                ? `Confirm Hotel Modification for ${pendingHotelAction?.routeDate}?`
                : "Confirm Hotel Update"}
            </DialogTitle>
            <DialogDescription className="text-center pt-2">
              {pendingHotelAction?.isReplacing ? (
                <>
                  Are you sure you want to modify the hotel from{" "}
                  <strong>{pendingHotelAction?.previousHotelName}</strong> to{" "}
                  <strong>{pendingHotelAction?.newHotelName}</strong> for{" "}
                  <strong>{pendingHotelAction?.routeDate}</strong>?
                </>
              ) : (
                <>Are you sure you want to update the hotel details?</>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="sm:justify-center">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setShowConfirmDialog(false);
                setPendingHotelAction(null);
              }}
              disabled={isUpdatingHotel}
            >
              Close
            </Button>
            <Button
              type="button"
              onClick={handleConfirmHotelSelection}
              disabled={isUpdatingHotel}
            >
              {isUpdatingHotel ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Updating...
                </>
              ) : (
                "Confirm"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Hotel Room Selection Modal */}
      {roomSelectionModal && (
        <HotelRoomSelectionModal
          open={roomSelectionModal.open}
          onOpenChange={(open) => {
            if (!open) {
              setRoomSelectionModal(null);
            }
          }}
          itinerary_plan_hotel_details_ID={roomSelectionModal.itinerary_plan_hotel_details_ID}
          itinerary_plan_id={roomSelectionModal.itinerary_plan_id}
          itinerary_route_id={roomSelectionModal.itinerary_route_id}
          hotel_id={roomSelectionModal.hotel_id}
          group_type={roomSelectionModal.group_type}
          hotel_name={roomSelectionModal.hotel_name}
          onSuccess={() => {
            toast.success('Room categories updated successfully');
            // Note: Room selection doesn't affect hotel list, no refresh needed
          }}
        />
      )}
    </Card>
  );
};
