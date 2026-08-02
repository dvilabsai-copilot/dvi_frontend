
/* eslint-disable @typescript-eslint/no-explicit-any */
// FILE: src/pages/itineraries/HotelList.tsx
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
import { AlertTriangle, Loader2, ArrowDown, ArrowUp, Edit } from "lucide-react";
import { toast } from "sonner";
import { ItineraryService } from "@/services/itinerary";
import { getAuthenticatedRoleId } from "@/services/accessControl";
import { USER_ROLES } from "@/constants/systemRoles";
import { HotelRoomSelectionModal } from "@/components/hotels/HotelRoomSelectionModal";
import type { StayExtensionPreviewResponse } from "@/services/itinerary";
import type { ItineraryHotelRow } from "./ItineraryDetails";
import type {
  HotelListProps,
  HotelRoomDetail,
  HotelSelectionUpdate,
  ManualRoomMealMismatchWarning,
  PendingHotelAction,
} from "./hotel-list/hotelList.types";
import { useHotelSelectionState } from "./hotel-list/useHotelSelectionState";
import { useHotelGroupTotals } from "./hotel-list/useHotelGroupTotals";
import { useHotelListRows } from "./hotel-list/useHotelListRows";
import { HotelListTable } from "./hotel-list/HotelListTable";
import { useHotelListActions } from "./hotel-list/useHotelListActions";
import { HotelListDialogs } from "./hotel-list/HotelListDialogs";
import { MealPlanCell } from "./hotel-list/MealPlanCell";
import {
  formatCurrency,
  formatDisplayDate,
  findMatchingRoomMealInStay,
  getAutoSkipRoomMealMismatchMessage,
  getEffectiveRoomCount,
  getHotelAmountWithRooms,
  getHotelBaseAmount,
  getHotelDisplayAmount,
  getHotelOptionKey,
  getHotelsForStay,
  getAutoSelectableHotelsRespectingPreviousRoomMeal,
  getLowestRoomTypeAmount,
  getLowestRoomTypeBaseAmount,
  getMealPlanCodeOnly,
  getMealPlanDisplayLabel,
  getRoomMealDisplayLabel,
  getStayKey,
  getStaySortValue,
  isExternalStayRow,
  isPlaceholderHotel,
  isSameHotelIdentity,
  isSameRoomMealIdentity,
  isSelectableHotel,
  mergeHotelOptions,
  normalizeHotelStarCategory,
  normalizeMealPlanLabel,
  normalizeTextList,
  pickListFromKeys,
  hasSelectableHotelIdentity,
  sortStayGroupsByDate,
  toNumber,
  toMoneyNumber,
} from "./hotel-list/hotelList.utils";


export const HotelList: React.FC<HotelListProps> = ({
  hotels,
  restrictedHotels = [],
  hotelTabs,
  hotelRatesVisible,
  showHotelMargins = false,
  hotelAvailability,
  hotelAvailabilityChangeSummary,
  hotelSearchRecoveryMessage,
  quoteId, // ÃƒÂ¢Ã…â€œÃ¢â‚¬Â¦ Receive quoteId from parent
  planId, // ÃƒÂ¢Ã…â€œÃ¢â‚¬Â¦ Receive planId from parent
  onToggleHotelRates,
  onRefresh,
  onResetHotels,
  onShowOfflineHotels,
  onGroupTypeChange,
  onGetSaveFunction,
  readOnly = false, // ÃƒÂ¢Ã…â€œÃ¢â‚¬Â¦ NEW: Default to edit mode
  onCreateVoucher, // ÃƒÂ¢Ã…â€œÃ¢â‚¬Â¦ NEW: Callback for voucher creation
  onCancelVoucher,
  onBulkCancelVouchers,
  onTemporarySelectionCostPreview,
  onTotalChange, // ÃƒÂ¢Ã…â€œÃ¢â‚¬Â¦ NEW: Callback for total amount changes
  roomCount = 1,
  onHotelSelectionsChange, // ÃƒÂ¢Ã…â€œÃ¢â‚¬Â¦ NEW: Callback for selections
  dayDestinationFallback = {},
  pagination,
  routePagination,
  onLoadMore,
  isLoadingMore = false,
  mealPlanCode,
  offlineVisibleRouteIds = [],
}) => {
  const isAgentLogin =
    getAuthenticatedRoleId() === USER_ROLES.AGENT;

  const getExpandedRouteId = (): number => {
    if (!expandedRowKey) return 0;
    const [routeIdText] = expandedRowKey.split('::');
    return toNumber(routeIdText, 0);
  };

  const getSelectedHotelAmount = (selectedHotel?: ItineraryHotelRow | HotelRoomDetail | null): number => {
    if (!selectedHotel) return 0;
    return getHotelDisplayAmount(selectedHotel);
  };

  const validateAutoHotelSelection = useCallback(async (hotel: ItineraryHotelRow) => {
    const providerValue = String(hotel.provider || "").trim().toLowerCase();
    if (providerValue !== "staah" && providerValue !== "axisrooms") {
      return { blocked: false };
    }
    const provider = providerValue as "staah" | "axisrooms";

    const preview = await ItineraryService.previewHotelStayExtension(planId, {
      routeId: toNumber(hotel.itineraryRouteId, 0),
      provider,
      hotelCode: String(hotel.hotelCode || hotel.hotelId || "").trim(),
      hotelName: String(hotel.hotelName || "").trim() || undefined,
      roomId: String((hotel as any).roomId || "").trim() || undefined,
      rateId: String((hotel as any).rateId || "").trim() || undefined,
      roomSelections: Array.isArray((hotel as any).roomSelections)
        ? (hotel as any).roomSelections
        : undefined,
      roomType: String(hotel.roomType || "").trim() || undefined,
      mealPlan: String(hotel.mealPlan || "").trim() || undefined,
      checkInDate: String(hotel.checkInDate || hotel.date || "").trim(),
    });

    return {
      // Automatic choices are merged into continuous supplier stays later. A
      // hotel is therefore eligible only when both the selected night and the
      // full continuous stay can be booked.
      blocked: Boolean(
        preview.blocked ||
        !preview.canBookSingleNight ||
        (preview.nights > 1 && !preview.canBookMultiNight),
      ),
      message: preview.restrictionConflicts?.map((conflict) => conflict.message).join(" | "),
    };
  }, [planId]);

  const {
    selectedByGroup,
    setSelectedByGroup,
    userSelectedByStay,
    setUserSelectedByStay,
    localHotels,
    setLocalHotels,
    localRestrictedHotels,
    setLocalRestrictedHotels,
    resetSelections,
  } = useHotelSelectionState({
    hotels,
    restrictedHotels,
    planId,
    validateAutoHotelSelection,
    helpers: {
      getStayKey,
      getHotelOptionKey,
      isSelectableHotel,
      isPlaceholderHotel,
      getHotelAmountWithRooms,
      findMatchingRoomMealInStay,
      sortStayGroupsByDate,
      getAutoSelectableHotelsRespectingPreviousRoomMeal,
    },
  });

  const { getSelectedHotelsForGroup, getGroupTotal } = useHotelGroupTotals({
    localHotels,
    selectedByGroup,
    userSelectedByStay,
    helpers: {
      getStayKey,
      sortStayGroupsByDate,
      isSelectableHotel,
      findMatchingRoomMealInStay,
      getAutoSelectableHotelsRespectingPreviousRoomMeal,
      isPlaceholderHotel,
      getHotelAmountWithRooms,
    },
  });

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

    return getMealPlanDisplayLabel(hotel as Record<string, unknown>);
  };

  const getRoomMealWarningLabel = (hotel: any): string => {
    const roomType = String(hotel?.roomType || hotel?.roomTypeName || 'Room').trim();
    const mealPlanCode = getMealPlanCodeOnly(hotel?.mealPlan);
    return `${roomType} / ${mealPlanCode}`;
  };

  const findManualRoomMealMismatchWarning = (
    selectedHotel: HotelRoomDetail,
    groupType: number,
  ): ManualRoomMealMismatchWarning | null => {
    const selectedRouteId = toNumber(
      (selectedHotel as any).itineraryRouteId ??
        (selectedHotel as any).itinerary_route_id ??
        (selectedHotel as any).routeId,
      0,
    );

    if (!selectedRouteId) {
      return null;
    }

    const sameHotelSelections = Object.values(selectedByGroup[groupType] || {})
      .filter((hotel: any) => {
        const routeId = toNumber(hotel?.itineraryRouteId || hotel?.routeId, 0);
        if (!routeId || routeId === selectedRouteId) {
          return false;
        }

        if (!isSameHotelIdentity(hotel, selectedHotel)) {
          return false;
        }

        return isSelectableHotel(hotel);
      })
      .sort((a: any, b: any) => getStaySortValue(a).localeCompare(getStaySortValue(b)));

    const mismatchHotel = sameHotelSelections.find((hotel: any) => {
      return !isSameRoomMealIdentity(hotel, selectedHotel);
    });

    if (!mismatchHotel) {
      return null;
    }

    return {
      enabled: true,
      previousLabel: getRoomMealWarningLabel(mismatchHotel),
      selectedLabel: getRoomMealWarningLabel(selectedHotel),
      message:
        `This manual selection creates a different room type or meal plan for the same hotel across the itinerary. ` +
        `Existing: ${getRoomMealWarningLabel(mismatchHotel)}. ` +
        `Selected: ${getRoomMealWarningLabel(selectedHotel)}. ` +
        `This may be unfair or confusing for families travelling together.`,
    };
  };

  // ÃƒÂ¢Ã…â€œÃ¢â‚¬Â¦ Track unsaved hotel selections (for batch save on confirm)
  const [unsavedSelections, setUnsavedSelections] = useState<Map<string, HotelRoomDetail>>(new Map());

  // Active tab = current group_type from backend
  const [activeGroupType, setActiveGroupType] = useState<number | null>(null);
  // Local "Display Rates" state driven by backend flag
  const [showRates, setShowRates] = useState<boolean>(hotelRatesVisible);
  // Offline options are already fetched with the other providers; this only
  // controls whether their room cards are visible in the expanded stay.
  const [showOfflineHotels, setShowOfflineHotels] = useState(false);
  const [isFetchingOfflineHotels, setIsFetchingOfflineHotels] = useState(false);
  const [offlineVisibleRouteIdSet, setOfflineVisibleRouteIdSet] = useState<Set<number>>(
    () => new Set(offlineVisibleRouteIds.map((routeId) => Number(routeId)).filter((routeId) => routeId > 0)),
  );

  const fetchOfflineHotels = useCallback(async (routeId?: number, routeIds: number[] = []) => {
    if (!onShowOfflineHotels || isFetchingOfflineHotels) return;
    setIsFetchingOfflineHotels(true);
    try {
      await onShowOfflineHotels(routeId);
      if (routeIds.length > 0) {
        setOfflineVisibleRouteIdSet((previous) => new Set([...previous, ...routeIds]));
      }
    } finally {
      setIsFetchingOfflineHotels(false);
    }
  }, [isFetchingOfflineHotels, onShowOfflineHotels]);

  // Expanded hotel row key & loaded rooms
  const [expandedRowKey, setExpandedRowKey] = useState<string | null>(null);
  const [loadingRowKey, setLoadingRowKey] = useState<string | null>(null);
  const [loadingProgress, setLoadingProgress] = useState<number>(0);
  const [roomDetails, setRoomDetails] = useState<HotelRoomDetail[]>([]);
  const [selectedHotelId, setSelectedHotelId] = useState<number | null>(null);
  const [isUpdatingHotel, setIsUpdatingHotel] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false); // ÃƒÂ¢Ã…â€œÃ¢â‚¬Â¦ Track sync operation
  const [isCheckingAvailability, setIsCheckingAvailability] = useState(false);
  const [isResettingHotels, setIsResettingHotels] = useState(false);
  const [changeSummaryForModal, setChangeSummaryForModal] = useState<typeof hotelAvailabilityChangeSummary>(null);

  useEffect(() => {
    setChangeSummaryForModal(hotelAvailabilityChangeSummary?.hasChanges ? hotelAvailabilityChangeSummary : null);
  }, [hotelAvailabilityChangeSummary]);

  // Cache for hotel room details by quoteId
  const [roomDetailsCache, setRoomDetailsCache] = useState<Record<string, HotelRoomDetail[]>>({});

  // ÃƒÂ¢Ã…â€œÃ¢â‚¬Â¦ Track selected room-type option key per hotel inside expanded panel
  // Key: hotel identity key (hotelName|provider), Value: getHotelOptionKey of selected rate
  const [selectedRoomTypeByHotel, setSelectedRoomTypeByHotel] = useState<Record<string, string>>({});
  // ÃƒÂ¢Ã…â€œÃ¢â‚¬Â¦ Track which hotel's room type dropdown is open
  const [, setRoomTypeDropdownOpen] = useState<string | null>(null);

  // Confirmation dialog state
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [pendingHotelAction, setPendingHotelAction] = useState<PendingHotelAction | null>(null);
  const [stayExtensionModalState, setStayExtensionModalState] = useState<{
    preview: StayExtensionPreviewResponse;
    action: Omit<PendingHotelAction, "multiNightPreview">;
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
    hotel_code?: string;
    provider?: string;
  } | null>(null);

  // ÃƒÂ¢Ã…â€œÃ¢â‚¬Â¦ NEW: Hotel search query for expanded row
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
        planId,
        roomCount,
      ),
      getHotelsForStay(
        localRestrictedHotels,
        routeId,
        stayDate,
        toNumber(activeGroupType, 0),
        planId,
        roomCount,
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

  // ÃƒÂ¢Ã…â€œÃ¢â‚¬Â¦ Get active tab total
  const getActiveTabTotal = (): number => {
    if (activeGroupType === null) return 0;
    return getGroupTotal(activeGroupType);
  };

  // ÃƒÂ¢Ã…â€œÃ¢â‚¬Â¦ Get overall total (sum of active groupType only, as per requirements)
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

  const { currentHotelRows, routeDestinationFallback, getResolvedDestination } = useHotelListRows({
    localHotels,
    activeGroupType,
    selectedByGroup,
    userSelectedByStay,
    readOnly,
    roomCount,
    hotelTabs,
    stayRoutes: hotelAvailability?.stayRoutes || [],
    dayDestinationFallback,
    selectedVoucherRows,
    setSelectedVoucherRows,
    helpers: {
      getStayKey,
      getHotelOptionKey,
      getHotelAmountWithRooms,
      isExternalStayRow,
      isPlaceholderHotel,
      isSelectableHotel,
      findMatchingRoomMealInStay,
      sortStayGroupsByDate,
      getAutoSelectableHotelsRespectingPreviousRoomMeal,
      toNumber,
    },
  });

  const addOneDay = (date: string): string => {
    const raw = String(date || "").trim();
    if (!raw) return "";

    const parsed = new Date(`${raw}T00:00:00.000Z`);
    if (Number.isNaN(parsed.getTime())) return "";

    parsed.setUTCDate(parsed.getUTCDate() + 1);
    return parsed.toISOString().slice(0, 10);
  };

  const getSupplierRoomRateKey = (hotel: any): string => {
    return [
      String(hotel?.provider || "").trim().toLowerCase(),
      String(hotel?.hotelCode || hotel?.hotelId || "").trim().toLowerCase(),
      String(hotel?.roomId || "").trim().toLowerCase(),
      String(hotel?.rateId || "").trim().toLowerCase(),
      String(hotel?.roomType || hotel?.roomTypeName || "").trim().toLowerCase(),
      normalizeMealPlanLabel(hotel?.mealPlan).trim().toLowerCase(),
    ].join("|");
  };

  const buildHotelSelectionUpdate = (
    hotel: ItineraryHotelRow,
    groupType: number,
  ): HotelSelectionUpdate | null => {
    const routeId = toNumber((hotel as any).itineraryRouteId || (hotel as any).routeId, 0);
    if (!routeId) return null;

    const checkInDate = String((hotel as any).date || (hotel as any).checkInDate || "").trim();
    const checkOutDate =
      String((hotel as any).checkOutDate || "").trim() || addOneDay(checkInDate);

    return {
      provider: String((hotel as any).provider || "tbo").trim().toLowerCase(),
      hotelCode: String((hotel as any).hotelCode || (hotel as any).hotelId || "").trim(),
      bookingCode: String((hotel as any).bookingCode || (hotel as any).searchReference || "").trim(),
      searchReference: String((hotel as any).searchReference || "").trim() || undefined,
      roomId: String((hotel as any).roomId || "").trim() || undefined,
      rateId: String((hotel as any).rateId || "").trim() || undefined,
      mealPlan: String((hotel as any).mealPlan || "").trim() || undefined,
      roomType: String((hotel as any).roomType || (hotel as any).roomTypeName || "Standard").trim(),
      netAmount: toMoneyNumber(getHotelDisplayAmount(hotel)),
      hotelName: String((hotel as any).hotelName || "").trim(),
      checkInDate,
      checkOutDate,
      groupType: toNumber((hotel as any).groupType, groupType),
      rateOptionId: String((hotel as any).rateOptionId || "").trim() || undefined,
      optionKey: String((hotel as any).optionKey || "").trim() || undefined,
    };
  };

  const mergeConsecutiveSupplierSelections = (
    selectedHotels: ItineraryHotelRow[],
    groupType: number,
  ): Record<number, HotelSelectionUpdate> => {
    const sortedHotels = [...selectedHotels].sort((a, b) =>
      getStaySortValue(a).localeCompare(getStaySortValue(b)),
    );

    const output: Record<number, HotelSelectionUpdate> = {};
    const consumedRouteIds = new Set<number>();

    for (let i = 0; i < sortedHotels.length; i += 1) {
      const currentHotel = sortedHotels[i];
      const currentRouteId = toNumber(
        (currentHotel as any).itineraryRouteId || (currentHotel as any).routeId,
        0,
      );

      if (!currentRouteId || consumedRouteIds.has(currentRouteId)) {
        continue;
      }

      const currentSelection = buildHotelSelectionUpdate(currentHotel, groupType);
      if (!currentSelection) {
        continue;
      }

      const provider = String(currentSelection.provider || "").toLowerCase();
      const canMergeProvider = provider === "staah" || provider === "axisrooms";

      if (!canMergeProvider) {
        output[currentRouteId] = currentSelection;
        consumedRouteIds.add(currentRouteId);
        continue;
      }

      const groupHotels = [currentHotel];
      let lastCheckOutDate = currentSelection.checkOutDate;
      const currentKey = getSupplierRoomRateKey(currentHotel);

      for (let j = i + 1; j < sortedHotels.length; j += 1) {
        const nextHotel = sortedHotels[j];
        const nextRouteId = toNumber(
          (nextHotel as any).itineraryRouteId || (nextHotel as any).routeId,
          0,
        );

        if (!nextRouteId || consumedRouteIds.has(nextRouteId)) {
          continue;
        }

        const nextSelection = buildHotelSelectionUpdate(nextHotel, groupType);
        if (!nextSelection) {
          continue;
        }

        const nextKey = getSupplierRoomRateKey(nextHotel);
        const isSameRoomRate = nextKey === currentKey;
        const isConsecutiveDate = nextSelection.checkInDate === lastCheckOutDate;

        if (!isSameRoomRate || !isConsecutiveDate) {
          break;
        }

        groupHotels.push(nextHotel);
        lastCheckOutDate = nextSelection.checkOutDate;
      }

      if (groupHotels.length === 1) {
        output[currentRouteId] = currentSelection;
        consumedRouteIds.add(currentRouteId);
        continue;
      }

      const routeIds = groupHotels
        .map((hotel) => toNumber((hotel as any).itineraryRouteId || (hotel as any).routeId, 0))
        .filter((routeId) => routeId > 0);

      const nightlyRates = groupHotels.map((hotel) => ({
        date: String((hotel as any).date || (hotel as any).checkInDate || "").trim(),
        amountAfterTax: toMoneyNumber(getHotelDisplayAmount(hotel)),
      }));

      const totalAmountAfterTax = nightlyRates.reduce(
        (sum, night) => sum + toMoneyNumber(night.amountAfterTax),
        0,
      );

      const stayKey = [
        provider,
        currentSelection.hotelCode,
        currentSelection.roomId || "",
        currentSelection.rateId || "",
        currentSelection.checkInDate,
        lastCheckOutDate,
      ].join(":");

      output[currentRouteId] = {
        ...currentSelection,
        checkOutDate: lastCheckOutDate,
        netAmount: totalAmountAfterTax,
        totalAmountAfterTax,
        multiNightBooking: true,
        routeIds,
        nights: routeIds.length,
        nightlyRates,
        stayKey,
      };

      routeIds.forEach((routeId) => consumedRouteIds.add(routeId));
    }

    return output;
  };

  const withCoveredRouteDeletes = (
    selections: Record<number, HotelSelectionUpdate>,
  ): Record<number, HotelSelectionUpdate | null> => {
    const next: Record<number, HotelSelectionUpdate | null> = { ...selections };

    Object.entries(selections).forEach(([routeIdText, selection]) => {
      const routeIds = Array.isArray(selection?.routeIds)
        ? selection.routeIds
            .map((id) => Number(id))
            .filter((id) => Number.isFinite(id) && id > 0)
        : [];

      if (!selection?.multiNightBooking || routeIds.length <= 1) {
        return;
      }

      const canonicalParentRouteId = routeIds[0];
      const currentRouteId = Number(routeIdText);

      if (currentRouteId !== canonicalParentRouteId) {
        delete next[currentRouteId];
      }

      routeIds.forEach((routeId) => {
        if (routeId !== canonicalParentRouteId) {
          next[routeId] = null;
        }
      });
    });

    return next;
  };

  // Keep parent selection state in sync with the currently selected hotels per stay.
  // Consecutive STAAH/AxisRooms rows with same hotel + room + rate are merged into
  // one multiNightBooking payload so supplier receives one continuous stay.
  useEffect(() => {
    if (!onHotelSelectionsChange || activeGroupType === null || readOnly) return;

    const selectedHotels = getSelectedHotelsForGroup(activeGroupType);
    const selections = withCoveredRouteDeletes(
      mergeConsecutiveSupplierSelections(selectedHotels, activeGroupType),
    );

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

  const {
    handleRowClick,
    handleSyncRoute,
    openConfirmDialogForAction,
    handleChooseOrUpdateHotel,
    handleConfirmHotelSelection,
    handleCancelHotelAction,
    saveAllHotelSelections,
    syncConfirmationRequest,
    resolveSyncConfirmation,
  } = useHotelListActions({
    readOnly,
    getStayKey,
    expandedRowKey,
    setExpandedRowKey,
    setRoomDetails,
    setSelectedHotelId,
    setHotelSearchQuery,
    setRoomTypeDropdownOpen,
    localHotels,
    localRestrictedHotels,
    getHotelsForStay,
    mergeHotelOptions,
    toNumber,
    activeGroupType,
    selectedByGroup,
    userSelectedByStay,
    planId,
    roomCount,
    toast,
    formatCurrency,
    quoteId,
    unsavedSelections,
    setUnsavedSelections,
    setIsSyncing,
    ItineraryService,
    roomDetailsCache,
    setRoomDetailsCache,
    currentHotelRows,
    findManualRoomMealMismatchWarning,
    setPendingHotelAction,
    setShowConfirmDialog,
    getHotelDisplayAmount,
    toMoneyNumber,
    hasSelectableHotelIdentity,
    getExpandedRouteId,
    resolveHotelRestriction,
    setStayExtensionModalState,
    getHotelOptionKey,
    isSameHotelIdentity,
    setSelectedRoomTypeByHotel,
    setSelectedByGroup,
    setUserSelectedByStay,
    setIsUpdatingHotel,
    isUpdatingHotel,
    onHotelSelectionsChange,
    onTemporarySelectionCostPreview,
    pendingHotelAction,
    stayRoutes: hotelAvailability?.stayRoutes || [],
  });

  const [mealPlanStateResetKey, setMealPlanStateResetKey] = useState(0);
  const previousGlobalMealPlanRef = useRef<string | null>(null);

  const resetHotelListSelectionState = useCallback(() => {
    resetSelections();
    setMealPlanStateResetKey((value) => value + 1);
    setUnsavedSelections(new Map());
    setExpandedRowKey(null);
    setSelectedHotelId(null);
    setRoomDetails([]);
    setRoomDetailsCache({});
    setSelectedRoomTypeByHotel({});
    setHotelSearchQuery("");
  }, [resetSelections]);

  const normalizedGlobalMealPlanCode = getMealPlanCodeOnly(mealPlanCode || "") || "";
  useEffect(() => {
    if (previousGlobalMealPlanRef.current === null) {
      previousGlobalMealPlanRef.current = normalizedGlobalMealPlanCode;
      return;
    }
    if (previousGlobalMealPlanRef.current === normalizedGlobalMealPlanCode) return;

    previousGlobalMealPlanRef.current = normalizedGlobalMealPlanCode;
    resetHotelListSelectionState();
  }, [normalizedGlobalMealPlanCode, resetHotelListSelectionState]);

  // Expose save function to parent via callback
  React.useEffect(() => {
    if (onGetSaveFunction) {
      onGetSaveFunction(saveAllHotelSelections);
    }
  }, [onGetSaveFunction]);

  // ÃƒÂ¢Ã…â€œÃ¢â‚¬Â¦ Notify parent when active group total changes (active groupType only)
  // Parent selections are now synced explicitly on user choose/update action above.


  // ---------- RENDER ----------
  const tableContext = {
    planId,
    styles,
    showRates,
    showOfflineHotels,
    offlineVisibleRouteIds: Array.from(offlineVisibleRouteIdSet),
    emptyStayBlocks: hotelAvailability?.emptyStayBlocks || [],
    stayRoutes: hotelAvailability?.stayRoutes || [],
    offlineFetch: hotelAvailability?.offlineFetch,
    onShowOfflineHotels: (routeId?: number) => fetchOfflineHotels(routeId, routeId ? [routeId] : []),
    isFetchingOfflineHotels,
    currentHotelRows,
    getStayKey,
    expandedRowKey,
    isExternalStayRow,
    getHotelAmountWithRooms,
    getResolvedDestination,
    getEffectiveRoomCount,
    roomCount,
    toNumber,
    normalizeHotelStarCategory,
    getRoomTypeDisplay,
    formatCurrency,
    showHotelMargins,
    getHotelBaseAmount,
    getMealPlanDisplay,
    MealPlanCell,
    readOnly,
    onCancelVoucher,
    onBulkCancelVouchers,
    toast,
    hotelSearchQuery,
    setHotelSearchQuery,
    handleRowClick,
    handleSyncRoute,
    isSyncing,
    loadingRowKey,
    activeGroupType,
    selectedByGroup,
    userSelectedByStay,
    localHotels,
    localRestrictedHotels,
    getHotelsForStay,
    mergeHotelOptions,
    getHotelOptionKey,
    getHotelDisplayAmount,
    normalizeMealPlanLabel,
    isSelectableHotel,
    getExpandedRouteId,
    getStaySortValue,
    selectedRoomTypeByHotel,
    setSelectedRoomTypeByHotel,
    isSameHotelIdentity,
    isSameRoomMealIdentity,
    getAutoSkipRoomMealMismatchMessage,
    getSelectedHotelAmount,
    getLowestRoomTypeAmount,
    getLowestRoomTypeBaseAmount,
    pickListFromKeys,
    normalizeTextList,
    routePagination,
    isLoadingMore,
    onLoadMore,
    handleChooseOrUpdateHotel,
    isUpdatingHotel,
    selectedHotelId,
    setRoomSelectionModal,
    getOverallSelectedHotelTotal,
    currentTabTotal,
    mealPlanCode,
    selectionResetKey: mealPlanStateResetKey,
    roomDetails,
    Button,
    Loader2,
    ArrowUp,
    ArrowDown,
    Edit,
  };

  const formatChangeValue = (value: unknown): string => {
    if (value === null || value === undefined || value === "") return "—";
    if (typeof value === "number") return formatCurrency(value);
    return String(value);
  };

  const formatChangeDay = (value: unknown): string => {
    const day = String(value ?? "").trim();
    if (!day) return "—";
    return /^day\s/i.test(day) ? day : `Day ${day}`;
  };

  const changeLabel = (changeType: string): string => ({
    AUTO_SELECTION_CHANGED: "Auto-selected hotel changed",
    PRICE_CHANGED: "Hotel price changed",
    ROOM_TYPE_CHANGED: "Room type changed",
    MEAL_PLAN_CHANGED: "Meal plan changed",
    RATE_CHANGED: "Hotel rate changed",
    SELECTION_UNAVAILABLE: "Selected hotel unavailable",
    BECAME_AVAILABLE: "Selected hotel available again",
    OFFLINE_APPROVAL_CHANGED: "Offline approval changed",
    SELECTION_DEDUPED: "Duplicate selection removed",
    SELECTION_REPLACED: "Selected hotel replaced",
  }[changeType] || changeType);

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
          {/* ÃƒÂ¢Ã…â€œÃ¢â‚¬Â¦ Read-only mode: Show simple "Hotel Details (ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¹ total)" like PHP */}
          {readOnly ? (
            <h2 className="text-lg font-semibold text-[#4a4260]">
              Hotel Details ({formatCurrency(getOverallSelectedHotelTotal())})
            </h2>
          ) : (
            <h2 className="text-sm font-bold tracking-wider text-[#5d5f65]">HOTEL LIST</h2>
          )}

          {/* PHP-style toggle switch */}
          <div className="flex items-center gap-3">
            {!readOnly && onRefresh && (
              <>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={isCheckingAvailability || isResettingHotels}
                  onClick={async () => {
                    setIsCheckingAvailability(true);
                    try { await onRefresh(); } finally { setIsCheckingAvailability(false); }
                  }}
                  aria-label="Check Availability"
                >
                  {isCheckingAvailability ? "Checking Availability..." : (hotelAvailability?.checkedAt ? "Refresh Availability" : "Check Availability")}
                </Button>
                {onResetHotels && (
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={isCheckingAvailability || isResettingHotels}
                    onClick={async () => {
                      setIsResettingHotels(true);
                      try {
                        await onResetHotels();
                        resetHotelListSelectionState();
                      } finally { setIsResettingHotels(false); }
                    }}
                    aria-label="Reset Hotels"
                  >
                    {isResettingHotels ? "Resetting Hotels..." : "Reset Hotels"}
                  </Button>
                )}
              </>
            )}
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
                    {!isAgentLogin && (
              <>
                <span className="text-xs font-medium text-[#5d5f65]">
                  Display Rates
                </span>

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
              </>
            )}

            <span className="text-xs font-medium text-[#5d5f65]">
              Show Offline Hotels
            </span>
            <label className={styles["switch-label"]} title="Show or hide already fetched offline hotel options">
              <input
                type="checkbox"
                checked={showOfflineHotels}
                onChange={() => {
                  const nextVisible = !showOfflineHotels;
                  setShowOfflineHotels(nextVisible);
                  if (nextVisible) void fetchOfflineHotels();
                }}
                className={styles["switch-input"]}
                aria-label="Show Offline Hotels"
              />
              <span className={styles["switch-toggle-slider"]}>
                <span className={styles["switch-on"]}></span>
              </span>
            </label>
          </div>
        </div>

        {/* ÃƒÂ¢Ã…â€œÃ¢â‚¬Â¦ Unsaved Changes Indicator */}
        {unsavedSelections.size > 0 && (
          <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-center gap-2">
            <span className="text-amber-600 font-medium">Warning: {unsavedSelections.size} unsaved hotel selection(s)</span>
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
            <p className="font-medium">
              {/previously selected hotel is unavailable/i.test(String(hotelAvailability.message || ''))
                ? 'Showing persisted hotel availability. Live suppliers are called only by Check Availability.'
                : hotelAvailability.message}
            </p>
            <p className="mt-1 text-xs opacity-90">
              Supplier hotels: {hotelAvailability.supplierHotelCount} | Placeholder rows: {hotelAvailability.placeholderRowCount} | Empty routes: {hotelAvailability.emptySearchRoutes}/{hotelAvailability.totalSearchRoutes}
            </p>
            {(hotelAvailability.availabilityState || hotelAvailability.checkedAt) && (
              <p className="mt-1 text-xs opacity-90">
                Status: {String(hotelAvailability.availabilityState || "PERSISTED").toUpperCase() === "PARTIAL"
                  ? "Availability checked"
                  : (hotelAvailability.availabilityState || "PERSISTED")}
                {hotelAvailability.checkedAt ? ` | Last checked: ${new Date(hotelAvailability.checkedAt).toLocaleString()}` : ""}
                {hotelAvailability.recommendationAlgorithm ? ` | Algorithm: ${hotelAvailability.recommendationAlgorithm}` : ""}
              </p>
            )}
            {hotelAvailability.providerErrors && hotelAvailability.providerErrors.length > 0 && (
              <p className="mt-1 text-xs text-amber-700">
                Provider warning: {hotelAvailability.providerErrors.map((error) => error.provider || "supplier").join(", ")}
              </p>
            )}
          </div>
        )}

        {hotelSearchRecoveryMessage && !readOnly && (
          <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
            <p className="font-medium">{hotelSearchRecoveryMessage}</p>
            <p className="mt-1 text-xs">Vehicle readiness is independent. Use Check Availability to retry hotels; no create request is needed.</p>
          </div>
        )}

        {/* Recommended Hotel Groups ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Å“ based on real backend groups */}
        {/* ÃƒÂ¢Ã…â€œÃ¢â‚¬Â¦ IN READ-ONLY MODE: Hide tabs completely, no group type display */}
        {!readOnly && (
          <div
            className={`${styles["hotel-list-nav"]} overflow-x-auto`}
            role="tablist"
            aria-label="Hotel recommendation packages"
          >
            {hotelTabs && hotelTabs.length > 0 ? (
              hotelTabs.map((tab, index) => {
                const tabGroupType = toNumber(tab.groupType, index + 1);
                const isActive = tabGroupType === toNumber(activeGroupType, -1);
                const tabTotal = getGroupTotal(tabGroupType);
                // Incomplete recommendations still contain usable stays. The
                // UI should present the package normally and keep any missing
                // stay visible in its day row, rather than labelling the whole
                // recommendation as "Partial" or "unavailable".
                const tabAmountLabel = formatCurrency(tab.totalAmount ?? tab.partialTotal ?? tabTotal);
                // Recommendation groups are backend identities (1-4). Do not
                // derive a fifth label from the array index when an older
                // snapshot contains an unscoped row.
                const recommendationLabel = tabGroupType >= 1 && tabGroupType <= 4
                  ? `Recommended #${tabGroupType}`
                  : String(tab.label || "Recommended");
                return (
                  <button
                    key={tabGroupType}
                    disabled={loadingRowKey !== null}
                    onClick={() => {
                      setActiveGroupType(tabGroupType);
                      setLoadingRowKey(null);
                      setExpandedRowKey(null);
                      setRoomDetails([]);
                      if (onGroupTypeChange) onGroupTypeChange(tabGroupType);
                    }}
                    className={`${styles["nav-link"]} ${isActive ? styles["active"] : ""} disabled:opacity-50 disabled:cursor-not-allowed`}
                    role="tab"
                    aria-selected={isActive}
                    aria-label={`${recommendationLabel}, ${tabAmountLabel}`}
                  >
                    <span className="flex min-w-[150px] flex-col items-start gap-0.5">
                      <span className="font-semibold">{recommendationLabel}</span>
                      <span className="text-xs">{tabAmountLabel}</span>
                      {tab.targetAmount != null && (
                        <span className="text-[10px] opacity-75">
                          Target {formatCurrency(tab.targetAmount)}
                        </span>
                      )}
                    </span>
                  </button>
                );
              })
            ) : (
              <span className="text-sm text-gray-500">No hotel groups available</span>
            )}
          </div>
        )}

        <HotelListTable context={tableContext} />
      </CardContent>

      <HotelListDialogs
        context={{
          stayExtensionModalState,
          setStayExtensionModalState,
          formatDisplayDate,
          formatCurrency,
          openConfirmDialogForAction,
          setPendingHotelAction,
          setShowConfirmDialog,
          showConfirmDialog,
          pendingHotelAction,
          isUpdatingHotel,
          handleConfirmHotelSelection,
          handleCancelHotelAction,
          syncConfirmationRequest,
          resolveSyncConfirmation,
          setRoomSelectionModal,
          roomSelectionModal,
          toast,
          onRefresh,
        }}
      />

      {/* Availability refreshes update the Hotel List in place and show one
          old-versus-new reconciliation item for each affected selection. */}
      <Dialog
        open={Boolean(changeSummaryForModal?.hasChanges)}
        onOpenChange={(open) => {
          if (!open) setChangeSummaryForModal(null);
        }}
      >
        <DialogContent
          className="max-w-3xl"
          hideClose
          onEscapeKeyDown={(event) => event.preventDefault()}
          onPointerDownOutside={(event) => event.preventDefault()}
          onInteractOutside={(event) => event.preventDefault()}
        >
          <DialogHeader>
            <DialogTitle>Hotel Availability Updated</DialogTitle>
            <DialogDescription>
              The availability refresh and selection reconciliation have already been applied. Review the changes below.
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-[55vh] space-y-3 overflow-y-auto pr-1">
            {(changeSummaryForModal?.changes || []).map((change) => (
              <div key={`${change.changeType}-${change.routeId}-${change.groupType}-${change.date || "no-date"}-${change.previous?.optionKey || "none"}-${change.current?.optionKey || "none"}`} className="rounded-lg border border-[#ddd6fe] bg-[#faf9ff] p-3 text-sm">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-semibold text-[#4a4260]">{changeLabel(change.changeType)}</p>
                  <span className="text-xs text-[#6b6380]">{formatChangeDay(change.day)} · {change.date || "—"} · {change.destination || "—"} · Group {change.groupType}</span>
                </div>
                <div className="mt-2 grid gap-2 md:grid-cols-2">
                  <div className="rounded border bg-white p-2">
                    <p className="text-xs font-semibold uppercase text-[#81768e]">Previous</p>
                    <p>{formatChangeValue(change.previous?.hotelName)}</p>
                    <p className="text-xs text-[#6b6380]">{formatChangeValue(change.previous?.roomType)} · {formatChangeValue(change.previous?.mealPlan)}</p>
                    <p className="text-xs text-[#6b6380]">Price: {formatChangeValue(change.previousPrice ?? change.previous?.totalPrice)}</p>
                  </div>
                  <div className="rounded border bg-white p-2">
                    <p className="text-xs font-semibold uppercase text-[#81768e]">Current</p>
                    <p>{formatChangeValue(change.current?.hotelName)}</p>
                    <p className="text-xs text-[#6b6380]">{formatChangeValue(change.current?.roomType)} · {formatChangeValue(change.current?.mealPlan)}</p>
                    <p className="text-xs text-[#6b6380]">Price: {formatChangeValue(change.currentPrice ?? change.current?.totalPrice)}</p>
                  </div>
                </div>
                {change.priceDelta !== null && change.priceDelta !== undefined && change.priceDelta !== 0 && (
                  <p className={`mt-2 text-xs font-semibold ${change.priceDelta > 0 ? "text-red-700" : "text-emerald-700"}`}>
                    Price delta: {change.priceDelta > 0 ? "+" : ""}{formatCurrency(change.priceDelta)}
                  </p>
                )}
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button onClick={() => setChangeSummaryForModal(null)}>OK</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </Card>
  );
};
