
/* eslint-disable @typescript-eslint/no-explicit-any */
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
import { ItineraryService } from "@/services/itinerary";
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
  getLowestRoomTypeAmount,
  getLowestRoomTypeBaseAmount,
  getMealPlanCodeOnly,
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
  quoteId, // ÃƒÂ¢Ã…â€œÃ¢â‚¬Â¦ Receive quoteId from parent
  planId, // ÃƒÂ¢Ã…â€œÃ¢â‚¬Â¦ Receive planId from parent
  onToggleHotelRates,
  onRefresh,
  onGroupTypeChange,
  onGetSaveFunction,
  readOnly = false, // ÃƒÂ¢Ã…â€œÃ¢â‚¬Â¦ NEW: Default to edit mode
  onCreateVoucher, // ÃƒÂ¢Ã…â€œÃ¢â‚¬Â¦ NEW: Callback for voucher creation
  onCancelVoucher,
  onBulkCancelVouchers,
  onTotalChange, // ÃƒÂ¢Ã…â€œÃ¢â‚¬Â¦ NEW: Callback for total amount changes
  roomCount = 1,
  onHotelSelectionsChange, // ÃƒÂ¢Ã…â€œÃ¢â‚¬Â¦ NEW: Callback for selections
  dayDestinationFallback = {},
  pagination,
  routePagination,
  onLoadMore,
  isLoadingMore = false,
  mealPlanCode,
}) => {
const getExpandedRouteId = (): number => {
    if (!expandedRowKey) return 0;
    const [routeIdText] = expandedRowKey.split('::');
    return toNumber(routeIdText, 0);
  };

  const getSelectedHotelAmount = (selectedHotel?: ItineraryHotelRow | HotelRoomDetail | null): number => {
    if (!selectedHotel) return 0;
    return getHotelDisplayAmount(selectedHotel);
  };

  const getAutoSelectableHotelsRespectingPreviousRoomMeal = (
    stayHotels: ItineraryHotelRow[],
    previousSelectedHotel?: ItineraryHotelRow | null,
  ): ItineraryHotelRow[] => {
    const selectableHotels = stayHotels.filter((hotel) => isSelectableHotel(hotel));

    if (!previousSelectedHotel || selectableHotels.length === 0) {
      return selectableHotels;
    }

    const fairCandidates = selectableHotels.filter((hotel) => {
      if (!isSameHotelIdentity(hotel, previousSelectedHotel)) {
        return true;
      }

      return isSameRoomMealIdentity(hotel, previousSelectedHotel);
    });

    return fairCandidates.length > 0 ? fairCandidates : selectableHotels;
  };

  const {
    selectedByGroup,
    setSelectedByGroup,
    userSelectedByStay,
    setUserSelectedByStay,
    localHotels,
    setLocalHotels,
    localRestrictedHotels,
    setLocalRestrictedHotels,
  } = useHotelSelectionState({
    hotels,
    restrictedHotels,
    planId,
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

    return normalizeMealPlanLabel(hotel?.mealPlan);
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

  // Expanded hotel row key & loaded rooms
  const [expandedRowKey, setExpandedRowKey] = useState<string | null>(null);
  const [loadingRowKey, setLoadingRowKey] = useState<string | null>(null);
  const [loadingProgress, setLoadingProgress] = useState<number>(0);
  const [roomDetails, setRoomDetails] = useState<HotelRoomDetail[]>([]);
  const [selectedHotelId, setSelectedHotelId] = useState<number | null>(null);
  const [isUpdatingHotel, setIsUpdatingHotel] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false); // ÃƒÂ¢Ã…â€œÃ¢â‚¬Â¦ Track sync operation

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
    saveAllHotelSelections,
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
    planId,
    roomCount,
    toast,
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
    setSelectedRoomTypeByHotel,
    setSelectedByGroup,
    setUserSelectedByStay,
    setIsUpdatingHotel,
    onHotelSelectionsChange,
    pendingHotelAction,
  });

  // Expose save function to parent via callback
  React.useEffect(() => {
    if (onGetSaveFunction) {
      onGetSaveFunction(saveAllHotelSelections);
    }
  }, [onGetSaveFunction]);

  // ÃƒÂ¢Ã…â€œÃ¢â‚¬Â¦ Notify parent when active group total changes (active groupType only)
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
  const tableContext = {
    styles,
    showRates,
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
    selectedHotelId,
    getOverallSelectedHotelTotal,
    currentTabTotal,
    mealPlanCode,
    roomDetails,
    Button,
    Loader2,
    ArrowUp,
    ArrowDown,
  };

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
            <p className="font-medium">{hotelAvailability.message}</p>
            <p className="mt-1 text-xs opacity-90">
              Supplier hotels: {hotelAvailability.supplierHotelCount} | Placeholder rows: {hotelAvailability.placeholderRowCount} | Empty routes: {hotelAvailability.emptySearchRoutes}/{hotelAvailability.totalSearchRoutes}
            </p>
          </div>
        )}

        {/* Recommended Hotel Groups ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Å“ based on real backend groups */}
        {/* ÃƒÂ¢Ã…â€œÃ¢â‚¬Â¦ IN READ-ONLY MODE: Hide tabs completely, no group type display */}
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
          setRoomSelectionModal,
          roomSelectionModal,
          toast,
        }}
      />

    </Card>
  );
};
