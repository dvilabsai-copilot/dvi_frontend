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
import { AlertTriangle, Loader2, ArrowDown, ArrowUp } from "lucide-react";
import { toast } from "sonner";
import type {
  ItineraryHotelRow,
  ItineraryHotelTab,
} from "./ItineraryDetails";
import { ItineraryService } from "@/services/itinerary";
import { HotelRoomSelectionModal } from "@/components/hotels/HotelRoomSelectionModal";

type HotelListProps = {
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
  quoteId: string; // âœ… Required: Quote ID from parent
  planId: number; // âœ… Required: Plan ID for hotel selection
  // Optional: in case you later wire an API to persist the toggle
  onToggleHotelRates?: (visible: boolean) => void;
  // Callback to refresh parent data after hotel update
  onRefresh?: () => void;
  // Callback when hotel group type (recommendation tab) changes
  onGroupTypeChange?: (groupType: number) => void;
  // âœ… Callback to get save function reference (called once on mount)
  onGetSaveFunction?: (saveFn: () => Promise<boolean>) => void;
  // âœ… NEW: Read-only mode for confirmed itinerary
  readOnly?: boolean;
  // âœ… NEW: Callback to open hotel voucher modal
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
  // âœ… NEW: Callback when total selected hotel amount changes
  onTotalChange?: (totalAmount: number) => void;
  roomCount?: number;
  // âœ… NEW: Callback when hotel selections change (for confirm quotation payload)
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
  /** The itinerary-level meal plan code (CP/EP/MAP/AP) used when fetching hotels */
  mealPlanCode?: string | null;
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
  pricePerNight?: number; // âœ… Price from TBO API
  taxAmount?: number;
  totalAmount?: number;
  groupType?: number; // âœ… Tier/category from TBO API
  [key: string]: any; // keep flexible â€“ we only use a few fields
};

// Normalizes supplier/raw meal text into display labels.
const normalizeMealPlanLabel = (value?: string | null): string => {
  const mealPlanLabelByCode: Record<string, string> = {
    CP: 'CP - Continental Plan (Breakfast only)',
    EP: 'EP - European Plan (Room only)',
    MAP: 'MAP - Modified American Plan (Breakfast + Lunch or Dinner)',
    AP: 'AP - American Plan (Breakfast + Lunch + Dinner)',
  };

  const raw = String(value || '').trim();
  if (!raw || raw === '-') return mealPlanLabelByCode.EP;

  const upper = raw.toUpperCase();
  if (upper === 'CP' || upper.includes('CONTINENTAL PLAN')) return mealPlanLabelByCode.CP;
  if (upper === 'MAP' || upper.includes('MODIFIED AMERICAN PLAN')) return mealPlanLabelByCode.MAP;
  if (upper === 'AP' || upper === 'AMERICAN PLAN') return mealPlanLabelByCode.AP;
  if (upper === 'EP' || upper.includes('EUROPEAN PLAN') || upper.includes('ROOM ONLY') || upper.includes('NO MEAL')) return mealPlanLabelByCode.EP;

  if (upper.includes('ALL MEALS') || upper.includes('FULL BOARD') || upper.includes('FULLBOARD')) return mealPlanLabelByCode.AP;
  if (upper.includes('HALF BOARD') || upper.includes('HALFBOARD')) return mealPlanLabelByCode.MAP;

  const hasBreakfast = upper.includes('BREAKFAST');
  const hasLunch = upper.includes('LUNCH');
  const hasDinner = upper.includes('DINNER');

  if (hasBreakfast && hasLunch && hasDinner) return mealPlanLabelByCode.AP;
  if ((hasBreakfast && hasLunch) || (hasBreakfast && hasDinner) || (hasLunch && hasDinner)) return mealPlanLabelByCode.MAP;
  if (hasBreakfast) return mealPlanLabelByCode.CP;

  return mealPlanLabelByCode.EP;
};

const normalizedLabelToCode = (label: string): string | null => {
  const normalized = String(label || '').trim().toUpperCase();
  if (normalized.startsWith('CP')) return 'CP';
  if (normalized.startsWith('EP')) return 'EP';
  if (normalized.startsWith('MAP')) return 'MAP';
  if (normalized.startsWith('AP')) return 'AP';
  return null;
};

const MEAL_CODE_LABEL: Record<string, string> = { CP: 'CP', EP: 'EP', MAP: 'MAP', AP: 'AP' };

const MealPlanCell: React.FC<{ mealPlanText: string; selectedCode?: string | null }> = ({
  mealPlanText,
  selectedCode,
}) => {
  const text = normalizeMealPlanLabel(mealPlanText);
  if (!selectedCode || selectedCode === '__ALL__') return <span>{text}</span>;
  const roomCode = normalizedLabelToCode(text);
  const matches = roomCode === selectedCode;
  return (
    <span className="flex items-center gap-1.5">
      <span>{text}</span>
      {matches ? (
        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-green-100 text-green-700 border border-green-300" title={`Matches selected plan: ${MEAL_CODE_LABEL[selectedCode]}`}>
          âœ“ {MEAL_CODE_LABEL[selectedCode]}
        </span>
      ) : (
        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-50 text-amber-700 border border-amber-300" title={`Selected: ${MEAL_CODE_LABEL[selectedCode] ?? selectedCode}`}>
          âš  {MEAL_CODE_LABEL[selectedCode] ?? selectedCode}
        </span>
      )}
    </span>
  );
};

const toMoneyNumber = (value: number | string | undefined | null): number => {
  const num = Number(value ?? 0);
  if (!Number.isFinite(num)) return 0;

  return Number(num.toFixed(2));
};

const formatCurrency = (value: number | string | undefined | null): string => {
  return `\u20B9 ${toMoneyNumber(value).toFixed(2)}`;
};

const stripHtml = (value: string): string =>
  String(value || "")
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const normalizeTextList = (value: unknown): string[] => {
  if (Array.isArray(value)) {
    return value
      .flatMap((item) => {
        if (typeof item === "string") return [stripHtml(item)];
        if (typeof item === "number") return [String(item)];
        if (item && typeof item === "object") {
          const candidate =
            (item as any).description ??
            (item as any).text ??
            (item as any).title ??
            (item as any).name ??
            (item as any).type;
          return candidate ? [stripHtml(String(candidate))] : [];
        }
        return [];
      })
      .map((entry) => entry.trim())
      .filter(Boolean);
  }

  if (typeof value === "string") {
    const text = value.trim();
    if (!text) return [];

    if ((text.startsWith("[") && text.endsWith("]")) || (text.startsWith("{") && text.endsWith("}"))) {
      try {
        return normalizeTextList(JSON.parse(text));
      } catch {
        // Continue with plain string fallback below.
      }
    }

    return text
      .split(/\r?\n|\||;/)
      .map((part) => stripHtml(part))
      .map((part) => part.trim())
      .filter(Boolean);
  }

  if (typeof value === "number") return [String(value)];
  return [];
};

const pickListFromKeys = (source: Record<string, unknown>, keys: string[]): string[] => {
  for (const key of keys) {
    const values = normalizeTextList(source[key]);
    if (values.length > 0) {
      return Array.from(new Set(values));
    }
  }
  return [];
};

const normalizeHotelStarCategory = (value: unknown): number | null => {
  const raw = String(value ?? '').trim();
  if (!raw) return null;

  // Handles labels like "3*", "4-Star", "5 star".
  const starLabelMatch = raw.match(/([1-5])\s*(?:\*|STAR)?/i);
  if (starLabelMatch) {
    const parsed = Number(starLabelMatch[1]);
    if (parsed >= 1 && parsed <= 5) return parsed;
  }

  const numeric = Number(raw);
  if (!Number.isFinite(numeric)) return null;
  if (numeric >= 1 && numeric <= 5) return numeric;

  // Some environments leak category IDs (e.g. 13, 14) for 3*/4*.
  const lastDigit = Math.floor(numeric) % 10;
  if (numeric >= 10 && numeric < 100 && lastDigit >= 1 && lastDigit <= 5) {
    return lastDigit;
  }

  return null;
};

export const HotelList: React.FC<HotelListProps> = ({
  hotels,
  restrictedHotels = [],
  hotelTabs,
  hotelRatesVisible,
  showHotelMargins = false,
  hotelAvailability,
  quoteId, // âœ… Receive quoteId from parent
  planId, // âœ… Receive planId from parent
  onToggleHotelRates,
  onRefresh,
  onGroupTypeChange,
  onGetSaveFunction,
  readOnly = false, // âœ… NEW: Default to edit mode
  onCreateVoucher, // âœ… NEW: Callback for voucher creation
  onCancelVoucher,
  onBulkCancelVouchers,
  onTotalChange, // âœ… NEW: Callback for total amount changes
  roomCount = 1,
  onHotelSelectionsChange, // âœ… NEW: Callback for selections
  dayDestinationFallback = {},
  pagination,
  routePagination,
  onLoadMore,
  isLoadingMore = false,
  mealPlanCode,
}) => {
  const toNumber = (value: unknown, fallback = 0): number => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  };

  const getStayKey = (hotel: Pick<ItineraryHotelRow, 'itineraryRouteId' | 'date' | 'day'>): string => {
    return `${toNumber(hotel.itineraryRouteId, 0)}::${String(hotel.date || hotel.day || '').trim()}`;
  };

  const getHotelOptionKey = (hotel: any): string => {
    return [
      String(hotel?.provider || ''),
      String(hotel?.bookingCode || ''),
      String(hotel?.searchReference || ''),
      String(hotel?.hotelId || ''),
      String(hotel?.roomType || hotel?.roomTypeName || ''),
      String(hotel?.mealPlan || ''),
      String(hotel?.availabilityStatus || ''),
      String(Number(hotel?.totalHotelCost ?? hotel?.totalAmount ?? 0)),
      String(Number(hotel?.totalHotelTaxAmount ?? hotel?.taxAmount ?? 0)),
    ].join('|');
  };

  const getExpandedRouteId = (): number => {
    if (!expandedRowKey) return 0;
    const [routeIdText] = expandedRowKey.split('::');
    return toNumber(routeIdText, 0);
  };

  const hasSelectableHotelIdentity = (hotel: Partial<HotelRoomDetail> & Record<string, any>): boolean => {
    const hotelId = Number(hotel?.hotelId ?? hotel?.hotel_id ?? hotel?.id ?? NaN);
    const bookingCode = String(hotel?.bookingCode || '').trim();
    const searchReference = String(hotel?.searchReference || '').trim();
    const hotelName = String(hotel?.hotelName || '').trim();

    if (Number.isFinite(hotelId) && hotelId > 0) {
      return true;
    }

    return bookingCode !== '' || searchReference !== '' || hotelName !== '';
  };

  const getEffectiveRoomCount = (hotel: Pick<ItineraryHotelRow, 'noOfRooms'>): number => {
    const rowRooms = toNumber((hotel as any).noOfRooms, 0);
    const itineraryRooms = toNumber(roomCount, 1);
    return Math.max(rowRooms || itineraryRooms || 1, 1);
  };

  const getHotelAmountWithRooms = (hotel: Pick<ItineraryHotelRow, 'totalHotelCost' | 'totalHotelTaxAmount' | 'noOfRooms'>): number => {
    const baseAmount = getHotelDisplayAmount(hotel);
    // API row totals are already for the effective rooming; do not multiply again.
    return baseAmount;
  };

  const getHotelBaseAmount = (hotel: any): number => {
    return toNumber(
      hotel?.baseHotelCost ??
      hotel?.basePricePerNight ??
      hotel?.baseAmount ??
      0,
    );
  };

  const getHotelDisplayAmount = (hotel: any): number => {
    const directTotal = toNumber(hotel?.totalAmount ?? hotel?.totalPrice, 0);
    if (directTotal > 0) {
      return directTotal;
    }

    const totalHotelCost = toNumber(hotel?.totalHotelCost ?? hotel?.perNightAmount ?? hotel?.pricePerNight, 0);
    const totalHotelTaxAmount = toNumber(hotel?.totalHotelTaxAmount ?? hotel?.taxAmount, 0);
    const computedAmount = totalHotelCost + totalHotelTaxAmount;

    if (computedAmount > 0) {
      return computedAmount;
    }

    return totalHotelCost;
  };

  const getLowestRoomTypeAmount = (roomTypeOptions: HotelRoomDetail[]): number => {
    if (!roomTypeOptions.length) return 0;

    return roomTypeOptions.reduce((lowest, option) => {
      const optionAmount = getHotelDisplayAmount(option);
      if (lowest === 0) return optionAmount;
      if (optionAmount <= 0) return lowest;
      return optionAmount < lowest ? optionAmount : lowest;
    }, 0);
  };

  const getLowestRoomTypeBaseAmount = (roomTypeOptions: HotelRoomDetail[]): number => {
    if (!roomTypeOptions.length) return 0;

    return roomTypeOptions.reduce((lowest, option) => {
      const optionAmount = getHotelBaseAmount(option);
      if (lowest === 0) return optionAmount;
      if (optionAmount <= 0) return lowest;
      return optionAmount < lowest ? optionAmount : lowest;
    }, 0);
  };

  const getSelectedHotelAmount = (selectedHotel?: ItineraryHotelRow | HotelRoomDetail | null): number => {
    if (!selectedHotel) return 0;
    return getHotelDisplayAmount(selectedHotel);
  };

  const getHotelsForStay = (
    sourceHotels: ItineraryHotelRow[],
    routeId: number,
    stayDate: string,
    groupType?: number,
  ) => {
    const hotelsForRoute = sourceHotels
      .filter((h: any) => toNumber(h.itineraryRouteId, 0) === routeId)
      .filter((h: any) => {
        if (!groupType || groupType <= 0) return true;
        return toNumber((h as any).groupType, 0) === toNumber(groupType, 0);
      })
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

    // Keep rate options distinct; same hotel can have multiple room/rate plans with different prices.
    const uniqueByRateOption = new Map<string, (typeof hotelsForRoute)[number]>();
    hotelsForRoute.forEach((hotel) => {
      const key = [
        String((hotel as any).provider || ''),
        String((hotel as any).bookingCode || ''),
        String((hotel as any).searchReference || ''),
        String(hotel.hotelId || ''),
        String(hotel.roomType || ''),
        String((hotel as any).mealPlan || ''),
        String((hotel as any).availabilityStatus || ''),
        String(hotel.totalHotelCost || 0),
        String(hotel.totalHotelTaxAmount || 0),
      ].join('|');

      if (!uniqueByRateOption.has(key)) {
        uniqueByRateOption.set(key, hotel);
      }
    });

    return Array.from(uniqueByRateOption.values());
  };

  const mergeHotelOptions = (...hotelGroups: HotelRoomDetail[][]): HotelRoomDetail[] => {
    const merged = hotelGroups.flat().filter(Boolean);
    const uniqueByRateOption = new Map<string, HotelRoomDetail>();
    merged.forEach((hotel) => {
      const key = [
        String((hotel as any)?.provider || ''),
        String((hotel as any)?.bookingCode || ''),
        String((hotel as any)?.searchReference || ''),
        String((hotel as any)?.hotelId || ''),
        String((hotel as any)?.roomType || (hotel as any)?.roomTypeName || ''),
        String((hotel as any)?.mealPlan || ''),
        String((hotel as any)?.availabilityStatus || ''),
        String((hotel as any)?.totalHotelCost || (hotel as any)?.pricePerNight || 0),
        String((hotel as any)?.totalHotelTaxAmount || (hotel as any)?.taxAmount || 0),
      ].join('|');
      if (!uniqueByRateOption.has(key)) {
        uniqueByRateOption.set(key, hotel);
      }
    });
    return Array.from(uniqueByRateOption.values());
  };

  const isPlaceholderHotel = (hotel?: Partial<ItineraryHotelRow> | null): boolean => {
    if (!hotel) return true;
    const name = String((hotel as any).hotelName || '').trim().toLowerCase();
    const provider = String((hotel as any).provider || '').trim().toLowerCase();
    const availabilityStatus = String((hotel as any).availabilityStatus || '').trim().toUpperCase();

    return (
      name === 'no hotels available' ||
      name.includes('no hotel booked') ||
      name.includes('stay arranged externally') ||
      provider === 'external' ||
      availabilityStatus === 'NO_SUPPLIER_AVAILABILITY' ||
      (hotel as any).externalStay === true
    );
  };

  const isExternalStayRow = (hotel?: Partial<ItineraryHotelRow> | null): boolean => {
    if (!hotel) return false;
    const provider = String((hotel as any)?.provider || '').trim().toLowerCase();
    const hotelName = String((hotel as any)?.hotelName || '').trim().toLowerCase();
    const availabilityStatus = String((hotel as any)?.availabilityStatus || '').trim().toUpperCase();

    return (
      (hotel as any)?.externalStay === true ||
      provider === 'external' ||
      provider === 'none' ||
      provider === 'self-arranged' ||
      availabilityStatus === 'NO_SUPPLIER_AVAILABILITY' ||
      hotelName === 'no hotels available' ||
      hotelName.includes('no hotel booked') ||
      hotelName.includes('no hotels available') ||
      hotelName.includes('stay arranged externally')
    );
  };

  const isSelectableHotel = (hotel?: Partial<ItineraryHotelRow> | null): boolean => {
    if (!hotel) return false;

    const availabilityStatus = String((hotel as any)?.availabilityStatus || '').trim().toUpperCase();
    if (availabilityStatus === 'NOT_BOOKABLE' || availabilityStatus === 'NO_SUPPLIER_AVAILABILITY') {
      return false;
    }

    if ((hotel as any)?.isBookable === false || (hotel as any)?.externalStay === true) {
      return false;
    }

    const provider = String((hotel as any)?.provider || '').trim().toLowerCase();
    if (!provider || provider === 'external' || provider === 'none' || provider === 'self-arranged') {
      return false;
    }

    const amount = getHotelAmountWithRooms(hotel as ItineraryHotelRow);
    return Number.isFinite(amount) && amount > 0;
  };

  const resolveHotelRestriction = (
    hotel?: Partial<ItineraryHotelRow> | Partial<HotelRoomDetail> | null,
    groupTypeHint?: number | null,
  ): { blocked: boolean; reason: string } => {
    if (!hotel) {
      return { blocked: true, reason: 'Hotel is not available for selection.' };
    }

    const directAvailabilityStatus = String((hotel as any)?.availabilityStatus || '').trim().toUpperCase();
    const directReason = String((hotel as any)?.availabilityMessage || '').trim();
    if (directAvailabilityStatus === 'NOT_BOOKABLE' || directAvailabilityStatus === 'NO_SUPPLIER_AVAILABILITY') {
      return {
        blocked: true,
        reason: directReason || 'This hotel cannot be selected for the chosen stay.',
      };
    }

    const routeId = toNumber((hotel as any)?.itineraryRouteId ?? (hotel as any)?.itinerary_route_id ?? (hotel as any)?.routeId, 0);
    const hotelId = toNumber((hotel as any)?.hotelId ?? (hotel as any)?.hotel_id ?? (hotel as any)?.id, 0);
    const hotelCode = String((hotel as any)?.hotelCode || hotelId || '').trim();
    const provider = String((hotel as any)?.provider || '').trim().toLowerCase();
    const roomType = String((hotel as any)?.roomTypeName || (hotel as any)?.roomType || '').trim();
    const groupType = toNumber(groupTypeHint ?? (hotel as any)?.groupType ?? activeGroupType, 0);

    const localMatch = localHotels.find((row) => {
      if (routeId > 0 && toNumber((row as any)?.itineraryRouteId, 0) !== routeId) return false;
      if (groupType > 0 && toNumber((row as any)?.groupType, 0) !== groupType) return false;

      const rowProvider = String((row as any)?.provider || '').trim().toLowerCase();
      const rowHotelCode = String((row as any)?.hotelCode || (row as any)?.hotelId || '').trim();
      const rowRoomType = String((row as any)?.roomType || '').trim();

      const sameProvider = provider ? rowProvider === provider : true;
      const sameHotel = hotelCode ? rowHotelCode === hotelCode : true;
      const sameRoomType = roomType ? rowRoomType === roomType : true;

      return sameProvider && sameHotel && sameRoomType;
    });

    const matchedAvailabilityStatus = String((localMatch as any)?.availabilityStatus || '').trim().toUpperCase();
    const matchedReason = String((localMatch as any)?.availabilityMessage || '').trim();
    if (matchedAvailabilityStatus === 'NOT_BOOKABLE' || matchedAvailabilityStatus === 'NO_SUPPLIER_AVAILABILITY') {
      return {
        blocked: true,
        reason: matchedReason || 'This hotel cannot be selected for the chosen stay.',
      };
    }

    if (!isSelectableHotel(localMatch as any) && localMatch) {
      return {
        blocked: true,
        reason: matchedReason || 'This hotel cannot be selected for the chosen stay.',
      };
    }

    return { blocked: false, reason: '' };
  };

  const getRoomTypeDisplay = (hotel: any): React.ReactNode => {
    if (isExternalStayRow(hotel)) {
      return <span className="text-slate-400">{hotel?.displayRoomType || '-'}</span>;
    }

    return hotel?.roomType || hotel?.roomTypeName || '-';
  };

  const getMealPlanDisplay = (hotel: any): React.ReactNode => {
    if (isExternalStayRow(hotel)) {
      return <span className="text-slate-400">{hotel?.displayMealPlan || '-'}</span>;
    }

    return normalizeMealPlanLabel(hotel?.mealPlan);
  };

  // âœ… Track selected hotel PER GROUP TYPE and PER STAY
  // Structure: selectedByGroup[groupType][stayKey] = selected hotel row
  // This allows separate selections for previous-day billed stays on the same route.
  const [selectedByGroup, setSelectedByGroup] = useState<Record<number, Record<string, ItineraryHotelRow>>>({});
  // User override should win for a stay across all tabs (group types).
  const [userSelectedByStay, setUserSelectedByStay] = useState<Record<string, ItineraryHotelRow>>({});

  // âœ… Track unsaved hotel selections (for batch save on confirm)
  const [unsavedSelections, setUnsavedSelections] = useState<Map<string, HotelRoomDetail>>(new Map());

  // âœ… Local copy of hotels that can be updated immediately
  const [localHotels, setLocalHotels] = useState<ItineraryHotelRow[]>(hotels);
  const [localRestrictedHotels, setLocalRestrictedHotels] = useState<ItineraryHotelRow[]>(restrictedHotels);

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
  const [isSyncing, setIsSyncing] = useState(false); // âœ… Track sync operation

  // Cache for hotel room details by quoteId
  const [roomDetailsCache, setRoomDetailsCache] = useState<Record<string, HotelRoomDetail[]>>({});

  // âœ… Sync local hotels with prop changes and auto-select hotels for ALL groupTypes
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
          const hasExistingSelection = Boolean(newSelected[groupType][stayKey]);
          const existingSelection = newSelected[groupType][stayKey];
          const selectableOptions = hotelOptions.filter((option) => isSelectableHotel(option));
          const hasSelectableOptions = selectableOptions.length > 0;
          const hasRealOptions = hotelOptions.some((option) => !isPlaceholderHotel(option));

          // Replace stale placeholder default with real option as soon as any real option exists.
          if (
            hasExistingSelection &&
            (!isSelectableHotel(existingSelection) || isPlaceholderHotel(existingSelection)) &&
            hasSelectableOptions
          ) {
            delete newSelected[groupType][stayKey];
          }

          if (!newSelected[groupType][stayKey]) {
            const persistedSelection = [...hotelOptions]
              .filter((option) =>
                toNumber((option as any).itineraryPlanHotelDetailsId, 0) > 0 &&
                isSelectableHotel(option),
              )
              .sort((a, b) => getHotelAmountWithRooms(a) - getHotelAmountWithRooms(b))[0];

            if (persistedSelection) {
              newSelected[groupType][stayKey] = persistedSelection;
              return;
            }

            const candidateOptions = hasSelectableOptions
              ? selectableOptions
              : hasRealOptions
              ? hotelOptions.filter((option) => !isPlaceholderHotel(option))
              : [...hotelOptions];

            const sortedByPrice = [...candidateOptions].sort((a, b) => {
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

  useEffect(() => {
    setLocalRestrictedHotels(restrictedHotels);
  }, [restrictedHotels]);

  // Keep only overrides that still exist in current hotel data.
  useEffect(() => {
    const validStayKeys = new Set(hotels.map((h) => getStayKey(h)));
    setUserSelectedByStay((prev) => {
      const next: Record<string, ItineraryHotelRow> = {};
      Object.entries(prev).forEach(([stayKey, hotel]) => {
        if (validStayKeys.has(stayKey)) {
          next[stayKey] = hotel;
        }
      });
      return next;
    });
  }, [hotels]);

  // âœ… Track selected room-type option key per hotel inside expanded panel
  // Key: hotel identity key (hotelName|provider), Value: getHotelOptionKey of selected rate
  const [selectedRoomTypeByHotel, setSelectedRoomTypeByHotel] = useState<Record<string, string>>({});
  // âœ… Track which hotel's room type dropdown is open
  const [, setRoomTypeDropdownOpen] = useState<string | null>(null);

  // Confirmation dialog state
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [pendingHotelAction, setPendingHotelAction] = useState<{
    room: HotelRoomDetail;
    isReplacing: boolean;
    previousHotelName: string;
    newHotelName: string;
    routeDate: string;
    groupType?: number; // âœ… NEW: The groupType (tier) of the selected hotel
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

  // âœ… NEW: Hotel search query for expanded row
  const [hotelSearchQuery, setHotelSearchQuery] = useState<string>("");
  const [selectedVoucherRows, setSelectedVoucherRows] = useState<Record<string, {
    routeId: number;
    hotelId: number;
    hotelName: string;
    hotelEmail: string;
    hotelStateCity: string;
    routeDates: string[];
    dayNumbers: number[];
    hotelDetailsIds: number[];
  }>>({});

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

    const updatedHotels = mergeHotelOptions(
      getHotelsForStay(
        hotels,
        routeId,
        stayDate,
        toNumber(activeGroupType, 0),
      ),
      getHotelsForStay(
        localRestrictedHotels,
        routeId,
        stayDate,
        toNumber(activeGroupType, 0),
      ),
    );
    if (updatedHotels.length === 0) {
      setExpandedRowKey(null);
      setRoomDetails([]);
      setSelectedHotelId(null);
      return;
    }

    setRoomDetails(updatedHotels);
  }, [hotels, localRestrictedHotels]);

  // âœ… Get selected hotels for a specific groupType
  const getSelectedHotelsForGroup = (groupType: number): ItineraryHotelRow[] => {
    const hotelsForGroup = localHotels.filter(
      (h) => toNumber(h.groupType) === toNumber(groupType),
    );

    if (!hotelsForGroup.length) return [];

    const groupedByStay = new Map<string, ItineraryHotelRow[]>();
    hotelsForGroup.forEach((hotel) => {
      const stayKey = getStayKey(hotel);
      if (!groupedByStay.has(stayKey)) {
        groupedByStay.set(stayKey, []);
      }
      groupedByStay.get(stayKey)!.push(hotel);
    });

    return Array.from(groupedByStay.values()).map((stayHotels) => {
      const stayKey = getStayKey(stayHotels[0]);
      const userSelected = userSelectedByStay[stayKey];
      if (userSelected && isSelectableHotel(userSelected)) {
        return userSelected;
      }

      const selectedForGroup = selectedByGroup[groupType]?.[stayKey];
      if (selectedForGroup && isSelectableHotel(selectedForGroup)) {
        return selectedForGroup;
      }

      const selectableHotels = stayHotels.filter((hotel) => isSelectableHotel(hotel));
      const candidateHotels = selectableHotels.length > 0
        ? selectableHotels
        : stayHotels.some((hotel) => !isPlaceholderHotel(hotel))
        ? stayHotels.filter((hotel) => !isPlaceholderHotel(hotel))
        : [...stayHotels];

      const sortedStayHotels = [...candidateHotels].sort((a, b) => {
        const priceA = getHotelAmountWithRooms(a);
        const priceB = getHotelAmountWithRooms(b);
        if (priceA !== priceB) return priceA - priceB;
        return String(a.hotelName || '').localeCompare(String(b.hotelName || ''));
      });

      return sortedStayHotels[0];
    });
  };

  // âœ… Calculate total for a specific groupType (sum of selected hotels)
  const getGroupTotal = (groupType: number): number => {
    const selectedHotels = getSelectedHotelsForGroup(groupType);
    return selectedHotels.reduce((sum, h) => sum + getHotelAmountWithRooms(h), 0);
  };

  // âœ… Get active tab total
  const getActiveTabTotal = (): number => {
    if (activeGroupType === null) return 0;
    return getGroupTotal(activeGroupType);
  };

  // âœ… Get overall total (sum of active groupType only, as per requirements)
  const getOverallSelectedHotelTotal = (): number => {
    if (readOnly) {
      return localHotels.reduce(
        (sum, hotel) => sum + getHotelAmountWithRooms(hotel),
        0,
      );
    }

    return getActiveTabTotal();
  };

  // Current group's total for display
  const currentTabTotal = useMemo(() => {
    return getActiveTabTotal();
  }, [activeGroupType, selectedByGroup, userSelectedByStay, localHotels]);

  // Keep parent selection state in sync with the currently selected hotels per stay.
  useEffect(() => {
    if (!onHotelSelectionsChange || activeGroupType === null || readOnly) return;

    const selections: Record<number, {
      provider: string;
      hotelCode: string;
      bookingCode: string;
      roomType: string;
      netAmount: number;
      hotelName: string;
      checkInDate: string;
      checkOutDate: string;
      groupType: number;
    }> = {};

    const selectedHotels = getSelectedHotelsForGroup(activeGroupType);
    selectedHotels.forEach((hotel) => {
      const routeId = toNumber((hotel as any).itineraryRouteId, 0);
      if (!routeId) return;

      const checkInDate = String((hotel as any).date || (hotel as any).checkInDate || '').trim();
      const checkOutDate = String((hotel as any).checkOutDate || '').trim() || (checkInDate
        ? new Date(new Date(checkInDate).getTime() + 24 * 60 * 60 * 1000).toISOString().split('T')[0]
        : '');

      selections[routeId] = {
        provider: String((hotel as any).provider || 'tbo').trim().toLowerCase(),
        hotelCode: String((hotel as any).hotelCode || (hotel as any).hotelId || '').trim(),
        bookingCode: String((hotel as any).bookingCode || (hotel as any).searchReference || '').trim(),
        roomType: String((hotel as any).roomType || (hotel as any).roomTypeName || 'Standard').trim(),
        netAmount: toMoneyNumber(getHotelDisplayAmount(hotel)),
        hotelName: String((hotel as any).hotelName || '').trim(),
        checkInDate,
        checkOutDate,
        groupType: toNumber((hotel as any).groupType, activeGroupType),
      };
    });

    if (Object.keys(selections).length > 0) {
      onHotelSelectionsChange(selections);
    }
  }, [
    onHotelSelectionsChange,
    activeGroupType,
    readOnly,
    selectedByGroup,
    userSelectedByStay,
    localHotels,
  ]);

  // Filter hotel rows by groupType (tab) and show SELECTED hotel per route
  const currentHotelRows = useMemo(() => {
    if (!localHotels || !localHotels.length || activeGroupType === null) return [];
    
    // âœ… For confirmed itineraries (readOnly mode), show ONLY ONE confirmed hotel per route
    if (readOnly) {
      const hotelsByRoute = new Map<number, ItineraryHotelRow>();
      const confirmedHotels = localHotels.filter(
        (h) => toNumber(h.itineraryPlanHotelDetailsId) > 0,
      );
      const externalDisplayHotels = localHotels.filter((h) => isExternalStayRow(h));
      const sourceHotels =
        confirmedHotels.length > 0
          ? [...confirmedHotels, ...externalDisplayHotels]
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
        const routeId = toNumber(h.itineraryRouteId);
        if (!routeId) return;
        const existing = hotelsByRoute.get(routeId);

        if (!existing) {
          hotelsByRoute.set(routeId, h);
          return;
        }

        const existingExternal = isExternalStayRow(existing);
        const nextExternal = isExternalStayRow(h);
        if (existingExternal && !nextExternal) {
          hotelsByRoute.set(routeId, h);
        }
      });
      
      return Array.from(hotelsByRoute.values()).sort((a, b) => {
        const dayA = parseInt(String(a.day ?? '').replace(/\D/g, '') || '0');
        const dayB = parseInt(String(b.day ?? '').replace(/\D/g, '') || '0');
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
      const userSelected = userSelectedByStay[stayKey];
      if (userSelected && isSelectableHotel(userSelected)) {
        return userSelected;
      }
      const selectedForStay = selectedByGroup[activeGroupType]?.[stayKey];
      const selectableHotels = stayHotels.filter((hotel) => isSelectableHotel(hotel));
      const candidateHotels = selectableHotels.length > 0
        ? selectableHotels
        : stayHotels.some((hotel) => !isPlaceholderHotel(hotel))
        ? stayHotels.filter((hotel) => !isPlaceholderHotel(hotel))
        : [...stayHotels];

      const sortedStayHotels = [...candidateHotels].sort((a, b) => {
        const ratingDiff = toNumber(b.category, 0) - toNumber(a.category, 0);
        if (ratingDiff !== 0) return ratingDiff;
        const priceA = getHotelAmountWithRooms(a);
        const priceB = getHotelAmountWithRooms(b);
        if (priceA !== priceB) return priceA - priceB;
        return String(a.hotelName || '').localeCompare(String(b.hotelName || ''));
      });

      if (selectedForStay && isSelectableHotel(selectedForStay)) {
        const selectedOptionKey = getHotelOptionKey(selectedForStay);
        const sameStaySelection = sortedStayHotels.find(
          (option) => getHotelOptionKey(option) === selectedOptionKey,
        );
        if (sameStaySelection) {
          return sameStaySelection;
        }
      }

      return sortedStayHotels[0];
    });

    return displayHotels.sort((a, b) => {
      const dayA = parseInt(String(a.day ?? '').replace(/\D/g, '') || '0');
      const dayB = parseInt(String(b.day ?? '').replace(/\D/g, '') || '0');
      if (dayA !== dayB) return dayA - dayB;
      const dateA = String(a.date || '');
      const dateB = String(b.date || '');
      return dateA.localeCompare(dateB);
    });
  }, [localHotels, activeGroupType, selectedByGroup, userSelectedByStay, readOnly, roomCount]);

  useEffect(() => {
    if (!readOnly) {
      if (Object.keys(selectedVoucherRows).length > 0) {
        setSelectedVoucherRows({});
      }
      return;
    }

    const validKeys = new Set(currentHotelRows.map((h) => getStayKey(h)));
    setSelectedVoucherRows((prev) => {
      const next: typeof prev = {};
      Object.entries(prev).forEach(([key, value]) => {
        if (validKeys.has(key)) next[key] = value;
      });
      return next;
    });
  }, [readOnly, currentHotelRows]);

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
      setRoomTypeDropdownOpen(null);
      return;
    }

    // Collapse any currently expanded row before loading new one
    if (expandedRowKey !== null) {
      setExpandedRowKey(null);
      setRoomDetails([]);
      setRoomTypeDropdownOpen(null);
    }

    const itineraryRouteId = hotel.itineraryRouteId;
    const itineraryStayDate = String(hotel.date || '').trim();
    setSelectedHotelId(hotel.hotelId);

    let uniqueHotels = mergeHotelOptions(
      getHotelsForStay(
        localHotels,
        Number(itineraryRouteId || 0),
        itineraryStayDate,
        toNumber(activeGroupType, 0),
      ),
      getHotelsForStay(
        localRestrictedHotels,
        Number(itineraryRouteId || 0),
        itineraryStayDate,
        toNumber(activeGroupType, 0),
      ),
    );

    // âœ… Sort to put selected hotel first, then remaining hotels
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

    console.log('âœ… Filtered from local state:', uniqueHotels.length, 'hotels');
    
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
    const totalAmount = baseAmount;
    const normalizedPlanId = toNumber(r.itineraryPlanId ?? r.itinerary_plan_id ?? planId, 0);
    const normalizedRouteId = toNumber(r.itineraryRouteId ?? r.itinerary_route_id ?? r.routeId, 0);
    const normalizedHotelId = toNumber(r.hotelId ?? r.hotel_id ?? r.id, 0);

    return {
      ...r,
      itineraryPlanId: normalizedPlanId,
      itineraryRouteId: normalizedRouteId,
      hotelId: normalizedHotelId,
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
    
    // âœ… BLOCK sync when in read-only mode (confirmed itinerary)
    if (readOnly) {
      console.log('â›” [HotelList] Blocked handleSyncRoute - read-only mode');
      return;
    }

    // âœ… Check for unsaved changes and warn user
    if (unsavedSelections.size > 0) {
      const confirmed = window.confirm(
        `âš ï¸ You have ${unsavedSelections.size} unsaved hotel selection(s).\n\nSyncing will discard your unsaved changes and fetch fresh hotels from TBO.\n\nDo you want to continue?`
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
    
    // âœ… Show loader
    setIsSyncing(true);
    
    try {
      // âœ… Pass clearCache: true to force backend to bypass its memory cache
      const response = await ItineraryService.getHotelRoomDetails(quoteId, routeId, true);
      
      // âœ… API returns 'rooms' property, not 'roomDetails'
      const roomsRaw = response?.rooms || response?.roomDetails || [];
      const normalizedRooms: HotelRoomDetail[] = roomsRaw.map((r: any) => normalizeRoom(r));
      
      // Keep STAAH meal-plan variants separate so restricted and open cards can
      // coexist when "All Meal Plans" is selected.
      const uniqueRooms = Array.from(
        new Map(
          normalizedRooms.map((r: any) => {
            const provider = String(r.provider || '').trim().toLowerCase();
            const key = provider === 'staah'
              ? [
                  String(r.hotelId || ''),
                  provider,
                  String(r.mealPlan || '').trim().toLowerCase(),
                  String(r.availabilityStatus || '').trim().toLowerCase(),
                  String(r.searchReference || '').trim(),
                ].join('|')
              : String(r.hotelId);
            return [key, r];
          }),
        ).values()
      );
      
      if (uniqueRooms.length > 0) {
        // âœ… Update cache for ALL groupTypes for this route
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
      // âœ… Hide loader
      setIsSyncing(false);
    }
  };

  // ---------- HANDLER: CHOOSE/UPDATE HOTEL ----------
  const handleChooseOrUpdateHotel = async (room: HotelRoomDetail) => {
    console.log('ðŸ¨ Choose button clicked', room);
    
    // âœ… BLOCK hotel selection when in read-only mode (confirmed itinerary)
    if (readOnly) {
      console.log('â›” [HotelList] Blocked handleChooseOrUpdateHotel - read-only mode');
      return;
    }
    
    const resolvedPlanId = toNumber((room as any).itineraryPlanId ?? (room as any).itinerary_plan_id ?? planId, 0);
    const resolvedRouteId = toNumber((room as any).itineraryRouteId ?? (room as any).itinerary_route_id ?? (room as any).routeId, 0) || getExpandedRouteId();
    const resolvedHotelId = toNumber((room as any).hotelId ?? (room as any).hotel_id ?? (room as any).id, 0);

    if (!resolvedRouteId || !hasSelectableHotelIdentity({ ...room, hotelId: resolvedHotelId })) {
      console.error('âŒ Missing required fields:', {
        itineraryPlanId: resolvedPlanId,
        itineraryRouteId: resolvedRouteId,
        hotelId: resolvedHotelId,
        rawRoom: room,
      });
      toast.error('Missing required hotel information');
      return;
    }

    const normalizedRoom: HotelRoomDetail = {
      ...room,
      itineraryPlanId: resolvedPlanId,
      itineraryRouteId: resolvedRouteId,
      hotelId: resolvedHotelId,
    };

    const restriction = resolveHotelRestriction(
      normalizedRoom,
      toNumber((normalizedRoom as any).groupType ?? activeGroupType, 0),
    );
    if (restriction.blocked) {
      toast.error(restriction.reason);
      return;
    }

    const roomHotelId = Number(normalizedRoom.hotelId);
    const roomRouteId = Number(normalizedRoom.itineraryRouteId);
    const currentHotel = localHotels.find(h => h.itineraryRouteId === roomRouteId);
    const isReplacing = Boolean(currentHotel?.hotelId) && Number(currentHotel.hotelId) !== roomHotelId;
    const routeDate = currentHotel?.day || "";

    // Show confirmation dialog
    setPendingHotelAction({
      room: normalizedRoom,
      isReplacing,
      previousHotelName: currentHotel?.hotelName || "",
      newHotelName: normalizedRoom.hotelName || "",
      routeDate,
      groupType: normalizedRoom.groupType ? Number(normalizedRoom.groupType) : undefined, // âœ… Use hotel's ORIGINAL groupType from TBO (maintains correct tier classification)
    });
    setShowConfirmDialog(true);
  };

  const handleConfirmHotelSelection = async () => {
    if (!pendingHotelAction) return;

    const { room, isReplacing } = pendingHotelAction;

    // Validate required fields
    const resolvedPlanId = toNumber((room as any).itineraryPlanId ?? (room as any).itinerary_plan_id ?? planId, 0);
    const resolvedRouteId = toNumber((room as any).itineraryRouteId ?? (room as any).itinerary_route_id ?? (room as any).routeId, 0) || getExpandedRouteId();
    const resolvedHotelId = toNumber((room as any).hotelId ?? (room as any).hotel_id ?? (room as any).id, 0);

    if (!resolvedRouteId || !hasSelectableHotelIdentity({ ...room, hotelId: resolvedHotelId })) {
      toast.error("Missing required hotel information");
      return;
    }

    const normalizedRoom: HotelRoomDetail = {
      ...room,
      itineraryPlanId: resolvedPlanId,
      itineraryRouteId: resolvedRouteId,
      hotelId: resolvedHotelId,
    };

    const restriction = resolveHotelRestriction(
      normalizedRoom,
      toNumber(pendingHotelAction.groupType ?? activeGroupType, 0),
    );
    if (restriction.blocked) {
      setShowConfirmDialog(false);
      setPendingHotelAction(null);
      toast.error(restriction.reason);
      return;
    }

    setIsUpdatingHotel(true);
    try {
      console.log("ðŸ¨ [HotelList] Storing hotel selection in state:", {
        hotelName: room.hotelName,
        hotelId: room.hotelId,
        groupType: pendingHotelAction.groupType,
        isReplacing,
      });
      
      // âœ… Store selection by groupType and routeId
      const routeId = toNumber(normalizedRoom.itineraryRouteId);
      const groupType = toNumber(pendingHotelAction.groupType ?? activeGroupType, 1);
      
      // Find the full hotel row from localHotels
      const selectedProvider = String((room as any).provider || '').trim().toLowerCase();
      const selectedBookingCode = String((room as any).bookingCode || '').trim();
      const selectedHotelCode = String((normalizedRoom as any).hotelCode || (normalizedRoom as any).hotelId || '').trim();
      const selectedHotel = localHotels.find((h) =>
        toNumber(h.itineraryRouteId) === routeId &&
        toNumber(h.groupType) === groupType &&
        getHotelOptionKey(h) === getHotelOptionKey(normalizedRoom),
      ) || localHotels.find((h) =>
        toNumber(h.itineraryRouteId) === routeId &&
        toNumber(h.groupType) === groupType &&
        String((h as any).provider || '').trim().toLowerCase() === selectedProvider &&
        (
          String((h as any).bookingCode || '').trim() === selectedBookingCode ||
        String((h as any).hotelCode || h.hotelId || '').trim() === selectedHotelCode
        ) &&
        String(h.roomType || '').trim() === String((room as any).roomTypeName || (room as any).roomType || '').trim() &&
        getHotelDisplayAmount(h) === getHotelDisplayAmount(normalizedRoom),
      );
      
      if (!selectedHotel) {
        // Fallback: provider room may have different bookingCode/roomType than hotel_details row
        // (e.g. HOBSE returns hotel-level id in hotel_details but room-level code in room_details).
        // Build a synthetic localHotel from the normalizedRoom so selection still works.
        const fallbackHotel: ItineraryHotelRow = {
          itineraryRouteId: routeId,
          itineraryPlanId: resolvedPlanId,
          itineraryPlanHotelDetailsId: 0,
          groupType,
          hotelId: resolvedHotelId || 0,
          hotelName: (normalizedRoom as any).hotelName || '',
          hotelCode: (normalizedRoom as any).hotelCode || String(resolvedHotelId || ''),
          bookingCode: (normalizedRoom as any).bookingCode || '',
          searchReference: (normalizedRoom as any).searchReference || '',
          provider: String((normalizedRoom as any).provider || 'tbo').toLowerCase(),
          category: (normalizedRoom as any).hotelCategory || 0,
          roomType: (normalizedRoom as any).roomTypeName || (normalizedRoom as any).roomType || 'Standard',
          mealPlan: (normalizedRoom as any).mealPlan || '',
          totalHotelCost: Number((normalizedRoom as any).pricePerNight || (normalizedRoom as any).totalHotelCost || 0),
          totalHotelTaxAmount: 0,
          checkInDate: (normalizedRoom as any).checkInDate || '',
          checkOutDate: (normalizedRoom as any).checkOutDate || '',
          day: `Day ${routeId}`,
          destination: (normalizedRoom as any).destination || '',
          noOfRooms: 1,
          date: (normalizedRoom as any).checkInDate || '',
          totalAmount: getHotelDisplayAmount(normalizedRoom),
        } as any;
        console.warn('âš ï¸ [HotelList] Hotel not found in localHotels, using fallback synthetic row for provider:', (normalizedRoom as any).provider);
        // Re-use the normal flow with the fallback
        const fallbackStayKey = getStayKey(fallbackHotel);
        setSelectedByGroup(prev => {
          const next = { ...prev };
          if (!next[groupType]) next[groupType] = {};
          next[groupType][fallbackStayKey] = fallbackHotel;
          return next;
        });
        setUserSelectedByStay(prev => ({ ...prev, [fallbackStayKey]: fallbackHotel }));
        setUnsavedSelections(prev => {
          const newMap = new Map(prev);
          newMap.set(`${routeId}-${groupType}`, normalizedRoom);
          return newMap;
        });
        setShowConfirmDialog(false);
        setPendingHotelAction(null);
        if (onHotelSelectionsChange) {
          const checkInDate = String((normalizedRoom as any).checkInDate || '').trim();
          const checkOutDate = String((normalizedRoom as any).checkOutDate || '').trim() || (checkInDate
            ? new Date(new Date(checkInDate).getTime() + 86400000).toISOString().split('T')[0]
            : '');
          onHotelSelectionsChange({
            [routeId]: {
              provider: String((normalizedRoom as any).provider || 'tbo').toLowerCase(),
              hotelCode: (normalizedRoom as any).hotelCode || String(resolvedHotelId || ''),
              bookingCode: String((normalizedRoom as any).bookingCode || (normalizedRoom as any).searchReference || '').trim(),
              roomType: (normalizedRoom as any).roomTypeName || (normalizedRoom as any).roomType || 'Standard',
              netAmount: toMoneyNumber(getHotelDisplayAmount(normalizedRoom)),
              hotelName: (normalizedRoom as any).hotelName || '',
              checkInDate,
              checkOutDate,
              groupType,
            },
          });
        }
        toast.success('Hotel selected');
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

      // Pin this stay selection across all recommendation tabs.
      setUserSelectedByStay((prev) => ({
        ...prev,
        [stayKey]: selectedHotel,
      }));
      
      // Mark as unsaved selection for backend save
      const selectionKey = `${routeId}-${groupType}`;
      setUnsavedSelections(prev => {
        const newMap = new Map(prev);
        newMap.set(selectionKey, normalizedRoom);
        return newMap;
      });
      
      setShowConfirmDialog(false);
      setPendingHotelAction(null);

      // Emit only this explicit route selection to parent to avoid bulk overwrite of other days.
      if (onHotelSelectionsChange) {
        const checkInDate = String((normalizedRoom as any).checkInDate || (normalizedRoom as any).date || '').trim();
        const checkOutDate = String((normalizedRoom as any).checkOutDate || '').trim() || (checkInDate
          ? new Date(new Date(checkInDate).getTime() + 24 * 60 * 60 * 1000).toISOString().split('T')[0]
          : '');
        onHotelSelectionsChange({
          [routeId]: {
            provider: (normalizedRoom as any).provider || 'tbo',
            hotelCode: (normalizedRoom as any).hotelCode || String((normalizedRoom as any).hotelId || ''),
            bookingCode: String((normalizedRoom as any).bookingCode || (normalizedRoom as any).searchReference || '').trim(),
            roomType: (normalizedRoom as any).roomTypeName || (normalizedRoom as any).roomType || 'Standard',
            netAmount: toMoneyNumber(getHotelDisplayAmount(normalizedRoom)),
            hotelName: (normalizedRoom as any).hotelName || '',
            checkInDate,
            checkOutDate,
            groupType,
          },
        });
      }
      
      // Collapse expanded day row after selection to avoid accidental reselection/reset perception.
      setExpandedRowKey(null);

      // Update selectedHotelId so selected state remains reflected in the list.
      setSelectedHotelId(Number(normalizedRoom.hotelId));
      
      toast.success("Hotel selected! ðŸ‘", {
        description: `${normalizedRoom.hotelName} - Changes will be saved when you confirm the quotation`,
      });
      
      // Keep user on the current tier tab; auto-switching causes cross-day selection confusion.
    } catch (err) {
      console.error("âŒ [HotelList] Error selecting hotel:", err);
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

    console.log(`ðŸ’¾ Saving ${unsavedSelections.size} hotel selections to database...`);
    
    const savePromises: Promise<any>[] = [];
    
    unsavedSelections.forEach((room, selectionKey) => {
      const defaultRoomTypeId = Number(room.availableRoomTypes?.[0]?.roomTypeId ?? 1);
      const resolvedPlanId = toNumber((room as any).itineraryPlanId ?? (room as any).itinerary_plan_id ?? planId, 0);
      const resolvedRouteId = toNumber((room as any).itineraryRouteId ?? (room as any).itinerary_route_id ?? (room as any).routeId, 0) || getExpandedRouteId();
      const resolvedHotelId = toNumber((room as any).hotelId ?? (room as any).hotel_id ?? (room as any).id, 0);

      if (!resolvedPlanId || !resolvedRouteId || !hasSelectableHotelIdentity({ ...room, hotelId: resolvedHotelId })) {
        console.error('âŒ Skipping invalid hotel selection payload:', { selectionKey, room });
        return;
      }
      
      const promise = ItineraryService.selectHotel(
        resolvedPlanId,
        resolvedRouteId,
        resolvedHotelId,
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
      console.log("âœ… All hotel selections saved successfully");
      
      // Clear unsaved selections
      setUnsavedSelections(new Map());
      
      toast.success(`âœ… ${savePromises.length} hotel selection(s) saved successfully!`);
      return true;
    } catch (error) {
      console.error("âŒ Error saving hotel selections:", error);
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

  // âœ… Notify parent when active group total changes (active groupType only)
  React.useEffect(() => {
    if (!onTotalChange) return;

    if (readOnly) {
      onTotalChange(toMoneyNumber(getOverallSelectedHotelTotal()));
      return;
    }

    if (activeGroupType !== null) {
      onTotalChange(toMoneyNumber(getActiveTabTotal()));
    }
  }, [
    readOnly,
    activeGroupType,
    selectedByGroup,
    userSelectedByStay,
    localHotels,
    onTotalChange,
    roomCount,
  ]);

  // Parent selections are now synced explicitly on user choose/update action above.


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
          {/* âœ… Read-only mode: Show simple "Hotel Details (â‚¹ total)" like PHP */}
          {readOnly ? (
            <h2 className="text-lg font-semibold text-[#4a4260]">
              Hotel Details ({formatCurrency(getOverallSelectedHotelTotal())})
            </h2>
          ) : (
            <h2 className="text-sm font-bold tracking-wider text-[#5d5f65]">HOTEL LIST</h2>
          )}

          {/* PHP-style toggle switch */}
          <div className="flex items-center gap-3">
            {readOnly && onBulkCancelVouchers && Object.keys(selectedVoucherRows).length > 0 && (
              <Button
                size="sm"
                variant="destructive"
                className="text-xs"
                onClick={() => onBulkCancelVouchers(Object.values(selectedVoucherRows))}
              >
                Cancel Selected ({Object.keys(selectedVoucherRows).length})
              </Button>
            )}
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

        {/* âœ… Unsaved Changes Indicator */}
        {unsavedSelections.size > 0 && (
          <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-center gap-2">
            <span className="text-amber-600 font-medium">âš ï¸ {unsavedSelections.size} unsaved hotel selection(s)</span>
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

        {/* Recommended Hotel Groups â€“ based on real backend groups */}
        {/* âœ… IN READ-ONLY MODE: Hide tabs completely, no group type display */}
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
                const isExternalStay = isExternalStayRow(hotel);
                const rowTotal = getHotelAmountWithRooms(hotel);
                const resolvedDestination = getResolvedDestination(hotel);
                const effectiveRooms = getEffectiveRoomCount(hotel);
                const routeDate = hotel.date || new Date().toISOString().split('T')[0];

                const normalizedHotelDetailsIds = Array.isArray((hotel as any).hotelDetailsIds)
                  ? (hotel as any).hotelDetailsIds
                      .map((id: any) => Number(id))
                      .filter((id: number) => Number.isFinite(id) && id > 0)
                  : [];

                const fallbackHotelDetailsId = Number(hotel.itineraryPlanHotelDetailsId || 0);

                const cancelHotelDetailsIds = normalizedHotelDetailsIds.length > 0
                  ? normalizedHotelDetailsIds
                  : fallbackHotelDetailsId > 0
                    ? [fallbackHotelDetailsId]
                    : [];

                const parsedDayNumber = Number(
                  String(hotel.day || '').match(/Day\s*(\d+)/i)?.[1] || 0,
                );

                const rowVoucherPayload = {
                  routeId: Number(hotel.itineraryRouteId || 0),
                  hotelId: Number(hotel.hotelId || 0),
                  hotelName: String(hotel.hotelName || ''),
                  hotelEmail: '',
                  hotelStateCity: resolvedDestination === '-' ? '' : resolvedDestination,
                  routeDates: [routeDate],
                  dayNumbers: parsedDayNumber > 0 ? [parsedDayNumber] : [],
                  hotelDetailsIds: cancelHotelDetailsIds,
                };

                const canShowHotelCancelAction =
                  readOnly &&
                  !isExternalStay &&
                  Boolean(String(hotel.hotelName || '').trim()) &&
                  (
                    Number(rowVoucherPayload.routeId || 0) > 0 ||
                    rowVoucherPayload.hotelDetailsIds.length > 0
                  );

                return (
                  <React.Fragment key={rowKey}>
                    {/* MAIN ROW */}
                    {/* âœ… IN READ-ONLY MODE: Make row non-clickable */}
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
                        <div>
                          <div>
                            {hotel.hotelName
                              ? (() => {
                                  const starCategory = normalizeHotelStarCategory(hotel.category);
                                  return starCategory
                                    ? `${hotel.hotelName} -${starCategory}*`
                                    : hotel.hotelName;
                                })()
                              : "-"}
                          </div>
                          {isExternalStay && (
                            <span className="mt-1 inline-flex text-xs px-2 py-1 rounded bg-amber-50 text-amber-700 border border-amber-200">
                              Stay arranged externally
                            </span>
                          )}
                          {isExternalStay && hotel.availabilityMessage && (
                            <div className="text-xs text-amber-700 mt-1">
                              {hotel.availabilityMessage}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-[12px] text-[#5d5f65]">
                        {getRoomTypeDisplay(hotel)}
                        {!isExternalStay && effectiveRooms > 1 && !/\(\d+\s*Rooms?\)$/i.test(String(hotel.roomType || ''))
                          ? ` (${effectiveRooms} Rooms)`
                          : ""}
                      </td>
                      {showRates && (
                        <td className="px-6 py-4 text-[12px] text-[#5d5f65] whitespace-nowrap font-bold text-[#303238]">
                          {formatCurrency(rowTotal)}
                          {showHotelMargins && getHotelBaseAmount(hotel) > 0 && (
                            <span className="ml-1 text-[11px] font-normal text-gray-500">
                              ({formatCurrency(getHotelBaseAmount(hotel))})
                            </span>
                          )}
                        </td>
                      )}
                      <td className="px-6 py-4 text-[12px] text-[#5d5f65] flex items-center justify-between gap-2">
                        {isExternalStay ? (
                          getMealPlanDisplay(hotel)
                        ) : (
                          <MealPlanCell mealPlanText={hotel.mealPlan} selectedCode={mealPlanCode} />
                        )}
                        {canShowHotelCancelAction && (
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

                                if (onCancelVoucher) {
                                  void onCancelVoucher(rowVoucherPayload);
                                  return;
                                }

                                if (onBulkCancelVouchers) {
                                  void onBulkCancelVouchers([rowVoucherPayload]);
                                  return;
                                }

                                toast.error('Cancel voucher action is not available');
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
                              Loading room detailsâ€¦
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
                                    <>ðŸ”„ Sync Fresh Hotels</>
                                  )}
                                </Button>
                              </div>
                              
                              <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3 lg:grid-cols-4">
                              {(() => {
                                const groupType = activeGroupType || 1;
                                const selectedForStay = selectedByGroup[groupType]?.[rowKey];
                                const selectedHotelId = Number((selectedForStay as any)?.hotelId || 0);
                                const selectedBookingCode = String((selectedForStay as any)?.bookingCode || '').trim();

                                const filtered = roomDetails.filter((h) =>
                                  h.hotelName?.toLowerCase().includes(hotelSearchQuery.toLowerCase()),
                                );

                                const selectedOptionKey = selectedForStay ? getHotelOptionKey(selectedForStay) : '';

                                const sorted = [...filtered].sort((a, b) => {
                                  const aSelected = selectedOptionKey !== '' && getHotelOptionKey(a) === selectedOptionKey;
                                  const bSelected = selectedOptionKey !== '' && getHotelOptionKey(b) === selectedOptionKey;

                                  if (aSelected && !bSelected) return -1;
                                  if (!aSelected && bSelected) return 1;

                                  return Number(a.totalAmount || 0) - Number(b.totalAmount || 0);
                                });

                                // Group by hotel identity so one card can expose multiple rate variants.
                                const getHotelIdentityKey = (h: any) => {
                                  const provider = String(h.provider || '').trim().toLowerCase();
                                  const hotelName = String(h.hotelName || '').trim().toLowerCase();
                                  return `${hotelName}|${provider}`;
                                };

                                const hotelGroups = new Map<string, HotelRoomDetail[]>();
                                sorted.forEach((h) => {
                                  const identKey = getHotelIdentityKey(h);
                                  if (!hotelGroups.has(identKey)) hotelGroups.set(identKey, []);
                                  hotelGroups.get(identKey)!.push(h);
                                });

                                const sortOptionsByPrice = (options: HotelRoomDetail[]) =>
                                  [...options].sort((a, b) => {
                                    const priceA = getHotelDisplayAmount(a);
                                    const priceB = getHotelDisplayAmount(b);
                                    if (priceA !== priceB) return priceA - priceB;
                                    return getHotelOptionKey(a).localeCompare(getHotelOptionKey(b));
                                  });

                                const filterOptions = (
                                  options: HotelRoomDetail[],
                                  preferredRoomType?: string,
                                  preferredMealPlan?: string,
                                ) => {
                                  const normalizedRoomType = String(preferredRoomType || '').trim().toLowerCase();
                                  const normalizedMealPlan = normalizeMealPlanLabel(preferredMealPlan).trim().toLowerCase();

                                  const filteredByRoomType = normalizedRoomType
                                    ? options.filter((option) =>
                                        String(option.roomTypeName || option.roomType || '').trim().toLowerCase() === normalizedRoomType,
                                      )
                                    : options;

                                  const filteredByMealPlan = normalizedMealPlan
                                    ? filteredByRoomType.filter((option) =>
                                        normalizeMealPlanLabel(option.mealPlan).trim().toLowerCase() === normalizedMealPlan,
                                      )
                                    : filteredByRoomType;

                                  return {
                                    filteredByRoomType,
                                    filteredByMealPlan,
                                  };
                                };

                                const findBestOption = (
                                  options: HotelRoomDetail[],
                                  preferredRoomType?: string,
                                  preferredMealPlan?: string,
                                ) => {
                                  const { filteredByRoomType, filteredByMealPlan } = filterOptions(
                                    options,
                                    preferredRoomType,
                                    preferredMealPlan,
                                  );

                                  const candidatePool = filteredByMealPlan.length > 0
                                    ? filteredByMealPlan
                                    : filteredByRoomType.length > 0
                                    ? filteredByRoomType
                                    : options;

                                  const selectablePool = candidatePool.filter((option) => isSelectableHotel(option));
                                  const pool = selectablePool.length > 0 ? selectablePool : candidatePool;

                                  return sortOptionsByPrice(pool)[0];
                                };

                                const findExactOption = (
                                  options: HotelRoomDetail[],
                                  preferredRoomType?: string,
                                  preferredMealPlan?: string,
                                ) => {
                                  const { filteredByRoomType, filteredByMealPlan } = filterOptions(
                                    options,
                                    preferredRoomType,
                                    preferredMealPlan,
                                  );

                                  if (filteredByMealPlan.length > 0) {
                                    return sortOptionsByPrice(filteredByMealPlan)[0];
                                  }

                                  if (filteredByRoomType.length > 0) {
                                    return sortOptionsByPrice(filteredByRoomType)[0];
                                  }

                                  return sortOptionsByPrice(options)[0];
                                };

                                // One card per hotel; the active rate option is tracked in selectedRoomTypeByHotel
                                const deduped = Array.from(hotelGroups.entries()).map(([identKey, options]) => {
                                  const manualKey = selectedRoomTypeByHotel[identKey];
                                  const active =
                                    options.find((o) => getHotelOptionKey(o) === manualKey) ||
                                    options.find((o) => selectedOptionKey !== '' && getHotelOptionKey(o) === selectedOptionKey) ||
                                    findBestOption(options) ||
                                    options[0];
                                  return { identKey, active, options };
                                });

                                return deduped.map(({ identKey, active: hotel, options: roomTypeOptions }) => {
                                const roomKey = `hotel-${identKey}`;
                                const isSelected = selectedOptionKey !== '' && getHotelOptionKey(hotel) === selectedOptionKey;
                                const isSelectable = isSelectableHotel(hotel);
                                const actionMessage = String((hotel as any)?.availabilityMessage || '').trim();
                                const selectedHotelAmount = getSelectedHotelAmount(selectedForStay);
                                const currentHotelAmount = getHotelDisplayAmount(hotel);
                                const selectableRoomTypeOptions = roomTypeOptions.filter((option) => isSelectableHotel(option));
                                const displayPricedOptions = selectableRoomTypeOptions.length > 0
                                  ? selectableRoomTypeOptions
                                  : roomTypeOptions;
                                const startingFromAmount = getLowestRoomTypeAmount(displayPricedOptions) || currentHotelAmount;
                                const startingFromBaseAmount = getLowestRoomTypeBaseAmount(displayPricedOptions);
                                const priceDifference = currentHotelAmount - selectedHotelAmount;
                                const showDifferenceBadge = !isSelected && selectedHotelAmount > 0 && currentHotelAmount > 0;
                                const activeRoomTypeValue = String(hotel.roomTypeName || hotel.roomType || 'Standard').trim();
                                const activeMealPlanValue = normalizeMealPlanLabel(hotel.mealPlan);
                                const roomTypeVariants = Array.from(
                                  new Map(
                                    roomTypeOptions.map((option) => {
                                      const roomTypeValue = String(option.roomTypeName || option.roomType || 'Standard').trim();
                                      return [roomTypeValue.toLowerCase(), roomTypeValue];
                                    }),
                                  ).values(),
                                );
                                const roomTypeScopedOptions = roomTypeOptions.filter((option) =>
                                  String(option.roomTypeName || option.roomType || 'Standard').trim().toLowerCase() === activeRoomTypeValue.toLowerCase(),
                                );
                                const mealPlanVariants = Array.from(
                                  new Map(
                                    roomTypeScopedOptions.map((option) => {
                                      const mealPlanValue = normalizeMealPlanLabel(option.mealPlan);
                                      return [mealPlanValue.toLowerCase(), mealPlanValue];
                                    }),
                                  ).values(),
                                );
                                const hotelData = hotel as Record<string, unknown>;
                                const baseInclusions = pickListFromKeys(hotelData, [
                                  'inclusions',
                                  'Inclusions',
                                  'inclusion',
                                  'Inclusion',
                                  'facilities',
                                  'Facilities',
                                ]);
                                const roomLevelInclusions = normalizeTextList(
                                  (hotel as any)?.rooms?.[0]?.inclusion ||
                                  (hotel as any)?.rooms?.[0]?.Inclusion ||
                                  (hotel as any)?.Rooms?.[0]?.Inclusion ||
                                  (hotel as any)?.Rooms?.[0]?.inclusion,
                                );
                                const displayInclusions = Array.from(
                                  new Set([...baseInclusions, ...roomLevelInclusions]),
                                ).slice(0, 4);
                                const displayAmenities = pickListFromKeys(hotelData, [
                                  'amenities',
                                  'Amenities',
                                ]).slice(0, 4);
                                const displayRateConditions = pickListFromKeys(hotelData, [
                                  'rateConditions',
                                  'RateConditions',
                                ]).slice(0, 3);
                                const roomLevelCancellation = normalizeTextList(
                                  (hotel as any)?.rooms?.[0]?.cancellationPolicy ||
                                  (hotel as any)?.rooms?.[0]?.CancellationPolicy ||
                                  (hotel as any)?.Rooms?.[0]?.CancellationPolicy ||
                                  (hotel as any)?.roomTypes?.[0]?.cancellationPolicy,
                                );
                                const displayCancellationPolicies = Array.from(
                                  new Set([
                                    ...pickListFromKeys(hotelData, [
                                      'cancellationPolicy',
                                      'cancellationPoliciesText',
                                      'CancelPolicies',
                                      'CancellationPolicy',
                                    ]),
                                    ...roomLevelCancellation,
                                  ]),
                                ).slice(0, 3);
                                const supplementLines = pickListFromKeys(hotelData, [
                                  'mandatorySupplements',
                                  'MandatorySupplements',
                                  'normalizedSupplements',
                                  'supplements',
                                ]);
                                const supplementSummary = (hotel as any).supplementSummary as
                                  | {
                                      hasSupplements?: boolean;
                                      supplementCount?: number;
                                      atPropertyChargeCount?: number;
                                      requiresReview?: boolean;
                                    }
                                  | undefined;
                                const hasSupplementData =
                                  (supplementSummary?.hasSupplements ?? false) || supplementLines.length > 0;

                                return (
                                <div
                                  key={roomKey}
                                  className={`bg-white rounded-lg shadow-md border overflow-hidden h-full flex flex-col ${
                                    isSelected ? 'border-[#22c55e] ring-1 ring-[#22c55e]/40' : 'border-[#e5d9f2]'
                                  }`}
                                >
                                  {/* Hotel Image/Header */}
                                  <div className="relative h-40 bg-gradient-to-r from-[#7c3aed] to-[#a855f7]">
                                    {/* Provider Badge */}
                                    {hotel.provider && (
                                      <div className="absolute top-2 right-2 z-10">
                                        {(() => {
                                          const providerKey = String(hotel.provider || '').trim().toLowerCase();
                                          const providerBadgeText =
                                            providerKey === 'tbo' ? 'T'
                                              : providerKey === 'resavenue' ? 'RS'
                                              : providerKey === 'axisrooms' ? 'AX'
                                              : providerKey === 'hobse' ? 'HB'
                                              : String(hotel.provider || '').toUpperCase();
                                          const providerBadgeClass =
                                            providerKey === 'resavenue'
                                              ? 'bg-emerald-500 text-white'
                                              : providerKey === 'tbo'
                                                ? 'bg-blue-500 text-white'
                                                : providerKey === 'axisrooms'
                                                  ? 'bg-amber-500 text-white'
                                                  : providerKey === 'hobse'
                                                    ? 'bg-fuchsia-500 text-white'
                                                    : 'bg-gray-500 text-white';

                                          return (
                                        <span 
                                          className={`px-2 py-1 rounded-full text-xs font-semibold ${providerBadgeClass}`}
                                        >
                                          {providerBadgeText}
                                        </span>
                                          );
                                        })()}
                                      </div>
                                    )}
                                    {!isSelectable && (
                                      <div className="absolute top-2 left-2 z-10">
                                        <span className="px-2 py-1 rounded-full text-[11px] font-semibold bg-amber-400 text-amber-950">
                                          Restricted
                                        </span>
                                      </div>
                                    )}
                                    <div className="absolute inset-0 flex flex-col justify-end p-3 bg-black/30">
                                      <h3 className="text-white font-semibold text-sm">
                                        {hotel.hotelName}
                                      </h3>
                                      <p className="text-white/90 text-xs">
                                        Category: {normalizeHotelStarCategory(hotel.hotelCategory) ?? "-"}*
                                      </p>
                                      <p className="mt-1 text-white text-xs font-semibold">
                                        starting from {formatCurrency(startingFromAmount)}/d
                                        {showHotelMargins && startingFromBaseAmount > 0 && (
                                          <span className="ml-1 text-white/80 font-normal">
                                            ({formatCurrency(startingFromBaseAmount)})
                                          </span>
                                        )}
                                      </p>
                                      {showDifferenceBadge && (
                                        <div
                                          className={`absolute right-3 bottom-3 inline-flex items-center gap-1 rounded px-2 py-1 text-[12px] font-bold shadow-sm ${
                                            priceDifference >= 0
                                              ? 'bg-white text-emerald-600'
                                              : 'bg-white text-red-600'
                                          }`}
                                        >
                                          {priceDifference >= 0 ? (
                                            <ArrowUp className="h-3 w-3" />
                                          ) : (
                                            <ArrowDown className="h-3 w-3" />
                                          )}
                                          <span>
                                            {priceDifference >= 0 ? '+' : '-'}
                                            {formatCurrency(Math.abs(priceDifference))}
                                          </span>
                                        </div>
                                      )}
                                    </div>
                                  </div>

                                  <div className="p-4 flex-1 flex flex-col">{/* Check-in/Check-out times */}
                                    <div className="grid grid-cols-2 gap-2 mb-3 pb-3 border-b">
                                      <div className="flex items-center gap-2">
                                        <div className="w-8 h-8 rounded-full bg-[#f3e8ff] flex items-center justify-center">
                                          <span className="text-[#7c3aed] text-xs">ðŸ“¥</span>
                                        </div>
                                        <div>
                                          <p className="text-xs font-semibold text-[#4a4260]">02:00 PM</p>
                                          <p className="text-xs text-gray-500">Check In</p>
                                        </div>
                                      </div>
                                      <div className="flex items-center gap-2">
                                        <div className="w-8 h-8 rounded-full bg-[#f3e8ff] flex items-center justify-center">
                                          <span className="text-[#7c3aed] text-xs">ðŸ“¤</span>
                                        </div>
                                        <div>
                                          <p className="text-xs font-semibold text-[#4a4260]">12:00 PM</p>
                                          <p className="text-xs text-gray-500">Check Out</p>
                                        </div>
                                      </div>
                                    </div>

                                    <div className="mb-3">
                                      <label className="block text-xs font-medium text-[#4a4260] mb-1">
                                        Room Type
                                      </label>
                                      {roomTypeVariants.length > 1 ? (
                                        <select
                                          className="w-full max-w-full truncate rounded-md border border-[#e5d9f2] bg-white px-2 py-1 text-[11px] font-semibold text-[#4a4260] outline-none focus:border-[#7c3aed]"
                                          value={activeRoomTypeValue}
                                          onClick={(e) => e.stopPropagation()}
                                          onChange={(e) => {
                                            const selectedOption = findBestOption(
                                              roomTypeOptions,
                                              e.target.value,
                                              activeMealPlanValue,
                                            );
                                            if (!selectedOption) return;
                                            setSelectedRoomTypeByHotel(prev => ({ ...prev, [identKey]: getHotelOptionKey(selectedOption) }));
                                          }}
                                        >
                                          {roomTypeVariants.map((roomTypeValue) => {
                                            return (
                                              <option key={roomTypeValue} value={roomTypeValue}>
                                                {roomTypeValue}
                                              </option>
                                            );
                                          })}
                                        </select>
                                      ) : (
                                        <p className="text-sm text-[#4a4260] font-medium">
                                          {isExternalStayRow(hotel)
                                            ? getRoomTypeDisplay(hotel)
                                            : (hotel.roomTypeName || hotel.roomType ||
                                              (hotel.availableRoomTypes && hotel.availableRoomTypes.length > 0
                                                ? hotel.availableRoomTypes[0].roomTypeTitle
                                                : 'Not Available'))}
                                        </p>
                                      )}
                                    </div>
                                    <div className="mb-3">
                                      <label className="block text-xs font-medium text-[#4a4260] mb-1">
                                        Meal Type
                                      </label>
                                      {mealPlanVariants.length > 1 ? (
                                        <select
                                          className="w-full max-w-full truncate rounded-md border border-[#e5d9f2] bg-white px-2 py-1 text-[11px] font-semibold text-[#4a4260] outline-none focus:border-[#7c3aed]"
                                          value={activeMealPlanValue}
                                          onClick={(e) => e.stopPropagation()}
                                          onChange={(e) => {
                                            const selectedOption = findExactOption(
                                              roomTypeScopedOptions,
                                              activeRoomTypeValue,
                                              e.target.value,
                                            );
                                            if (!selectedOption) return;
                                            setSelectedRoomTypeByHotel(prev => ({ ...prev, [identKey]: getHotelOptionKey(selectedOption) }));
                                          }}
                                        >
                                          {mealPlanVariants.map((mealPlanValue) => {
                                            const matchingOption = findExactOption(
                                              roomTypeScopedOptions,
                                              activeRoomTypeValue,
                                              mealPlanValue,
                                            );
                                            const isMealPlanSelectable = matchingOption ? isSelectableHotel(matchingOption) : false;
                                            return (
                                              <option key={mealPlanValue} value={mealPlanValue}>
                                                {mealPlanValue}{isMealPlanSelectable ? '' : ' - Restricted'}
                                              </option>
                                            );
                                          })}
                                        </select>
                                      ) : (
                                        <p className="text-sm text-[#4a4260] font-medium">
                                          {getMealPlanDisplay(hotel)}
                                        </p>
                                      )}
                                    </div>

                                    {hasSupplementData && (
                                      <div className="mb-3 rounded-md border border-amber-200 bg-amber-50 p-2">
                                        <p className="text-xs font-medium text-amber-800">Supplements</p>
                                        <p className="text-xs text-amber-700 mt-1">
                                          {supplementSummary?.supplementCount || supplementLines.length} charge(s)
                                          {supplementSummary?.atPropertyChargeCount
                                            ? `, ${supplementSummary.atPropertyChargeCount} at property`
                                            : ''}
                                          {supplementSummary?.requiresReview ? ' (review required)' : ''}
                                        </p>
                                      </div>
                                    )}

                                    {displayRateConditions.length > 0 && (
                                      <div className="mb-3 rounded-md border border-gray-200 bg-gray-50 p-2">
                                        <p className="text-xs font-medium text-[#4a4260] mb-1">Rate Conditions</p>
                                        <div className="space-y-1">
                                          {displayRateConditions.map((item, idx) => (
                                            <p key={`rc-${roomKey}-${idx}`} className="text-xs text-gray-700 line-clamp-2">
                                              {item}
                                            </p>
                                          ))}
                                        </div>
                                      </div>
                                    )}

                                    {displayCancellationPolicies.length > 0 && (
                                      <div className="mb-3 rounded-md border border-red-200 bg-red-50 p-2">
                                        <p className="text-xs font-medium text-red-700 mb-1">Cancellation Policy</p>
                                        <div className="space-y-1">
                                          {displayCancellationPolicies.map((item, idx) => (
                                            <p key={`cp-${roomKey}-${idx}`} className="text-xs text-red-700 line-clamp-2">
                                              {item}
                                            </p>
                                          ))}
                                        </div>
                                      </div>
                                    )}

                                    {displayAmenities.length > 0 && (
                                      <div className="mb-3">
                                        <p className="text-xs font-medium text-[#4a4260] mb-2">Amenities</p>
                                        <div className="flex flex-wrap gap-1">
                                          {displayAmenities.map((item, idx) => (
                                            <span
                                              key={`amen-${roomKey}-${idx}`}
                                              className="inline-block bg-sky-50 text-sky-700 text-xs px-2 py-1 rounded"
                                            >
                                              {item}
                                            </span>
                                          ))}
                                        </div>
                                      </div>
                                    )}

                                    {!isSelectable && actionMessage && (
                                      <div className="mb-3 rounded-md border border-amber-200 bg-amber-50 px-3 py-2">
                                        <p className="text-xs font-semibold text-amber-900">Restricted for this stay</p>
                                        <p className="mt-1 text-xs leading-5 text-amber-800">{actionMessage}</p>
                                      </div>
                                    )}

                                    {/* Choose/Update Button - Conditional based on selection status */}
                                    <div className="mt-auto pt-2">
                                      <button
                                        className={`w-full py-2 px-4 font-medium rounded-md transition-colors text-sm ${
                                          isSelected
                                            ? 'bg-[#22c55e] text-white cursor-default'
                                            : isSelectable
                                            ? 'bg-[#7c3aed] hover:bg-[#6d28d9] text-white'
                                            : 'bg-slate-200 text-slate-500 cursor-not-allowed'
                                        }`}
                                        onClick={() => {
                                          if (!isSelectable) return;
                                          handleChooseOrUpdateHotel(hotel);
                                        }}
                                        disabled={isSelected || !isSelectable}
                                      >
                                        {isSelected ? 'Selected' : isSelectable ? 'Choose' : 'Restricted'}
                                      </button>

                                      <details className="mt-3 pt-3 border-t border-[#e9dcfb]">
                                        <summary className="cursor-pointer text-xs font-medium text-[#4a4260] select-none">
                                          Inclusions ({displayInclusions.length})
                                        </summary>
                                        {displayInclusions.length > 0 ? (
                                          <div className="mt-2 flex flex-wrap gap-1">
                                            {displayInclusions.map((item, idx) => (
                                              <span
                                                key={`inc-${roomKey}-${idx}`}
                                                className="inline-block bg-indigo-50 text-indigo-700 text-xs px-2 py-1 rounded"
                                              >
                                                {item}
                                              </span>
                                            ))}
                                          </div>
                                        ) : (
                                          <p className="mt-2 text-xs text-gray-500">No inclusions returned</p>
                                        )}
                                      </details>
                                    </div>
                                  </div>
                                </div>
                              );
                                });
                              })()}
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
                                        <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Loadingâ€¦</>
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
                  {formatCurrency(readOnly ? getOverallSelectedHotelTotal() : currentTabTotal)}
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

