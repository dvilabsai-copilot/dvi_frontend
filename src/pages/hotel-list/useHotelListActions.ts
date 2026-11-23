/* eslint-disable @typescript-eslint/no-explicit-any */
import React from "react";
import { quoteFromHotelPreview } from "./hotelCardPricing";
import { useCheckedHotelRates } from "./useCheckedHotelRates";
import { ItineraryService } from "@/services/itinerary";
import type { ItineraryHotelRow } from "../ItineraryDetails";
import type {
  HotelRoomDetail,
  HotelSelectionUpdate,
  PendingHotelAction,
} from "./hotelList.types";
import type { HotelSelectionPreviewCommitResult } from "../itinerary-details/hooks/useHotelSelectionsChangeMutation";
import {
  findRouteHotelForSelection,
  getMealPlanCodeOnly,
  getMealPlanSelectionFlags,
  getHotelIntentIdentity,
  getHotelOptionKey,
  normalizeHotelDisplayName,
  normalizeManualHotelSelection,
  buildAuthoritativeSelectedHotelRow,
  getMissingAuthoritativeSelectionFields,
  resolveTargetGroupType,
  isVsrHotel,
  getHotelPaneKey,
} from "./hotelList.utils";
import type { HotelIntentPreviewResponse, StayExtensionPreviewResponse } from "@/services/itinerary";
import { getHotelRefundableRateValue } from "../itinerary-details/utils/hotelHoldEligibility.utils";

type HotelListActionsContext = Record<string, any>;

type HotelSelectionActionOptions = {
  /** Automatically commit after the existing validation/preview path. */
  autoConfirm?: boolean;
  /** Keep a meal-plan change scoped to the clicked day, never an extension. */
  singleNightOnly?: boolean;
  /** Header room/meal edits already have a current supplier option; avoid a second refresh. */
  skipSelectedHotelRefresh?: boolean;
  /** Require the refreshed selection to retain the same room and meal plan. */
  requireExactRefreshedRate?: boolean;
  /** Keep the currently expanded day open after an automatic meal-plan selection. */
  keepExpanded?: boolean;
  /**
   * Persist a day-level rate directly against the current availability
   * snapshot. The snapshot-backed /hotels/select endpoint performs its own
   * identity and availability validation; running the whole-itinerary cost
   * preview first can reject an otherwise valid single-day rate because an
   * unrelated route still has an older or incomplete selection.
   */
  skipCostPreview?: boolean;
  /** The browser sends only this intent; the API resolves the authoritative rate. */
  selectionIntent?: 'HOTEL' | 'ROOM_TYPE' | 'MEAL_PLAN' | 'RATE_OPTION';
  reuseCheckedCardRate?: boolean;
  /** Close the row editor only after the server-confirmed selection is applied. */
  onSelectionApplied?: () => void;
  onBeforeSelectionConfirm?: (action: PendingHotelAction) => Promise<boolean>;
  /** Mark the clicked card unavailable when the authoritative preview rejects it. */
  onSelectionUnavailable?: (room: HotelRoomDetail, preview: HotelIntentPreviewResponse) => void;
};

export function useHotelListActions(context: HotelListActionsContext) {
  const {
    readOnly,
    getStayKey,
    expandedRowKey,
    setExpandedRowKey,
    setLoadingRowKey,
    setRoomDetails,
    setSelectedHotelId,
    setHotelSearchQuery,
    setRoomTypeDropdownOpen,
    localHotels,
    localRestrictedHotels,
    sharedHotelInventory = [],
    getHotelsForStay,
    mergeHotelOptions,
    toNumber,
    activeGroupType,
    selectedByGroup,
    userSelectedByGroup,
    planId,
    roomCount,
    adultCount = 2,
    childCount = 0,
    infantCount = 0,
    extraBedCount = 0,
    childWithBedCount = 0,
    childWithoutBedCount = 0,
    guestNationality = "IN",
    toast,
    formatCurrency,
    quoteId,
    unsavedSelections,
    setUnsavedSelections,
    ItineraryService: ItineraryServiceFromContext,
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
    setUserSelectedByGroup,
    setIsUpdatingHotel,
    setHotelActionPhase,
    isUpdatingHotel,
    onHotelSelectionsChange,
    onTotalChange,
    onGroupTypeChange,
    onTemporarySelectionCostPreview,
    pendingHotelAction,
    stayRoutes = [],
    mealPlanCode,
    searchRunId,
  } = context;

  const hotelService = ItineraryServiceFromContext || ItineraryService;
  const requestedMealPlanCode = getMealPlanCodeOnly(String(mealPlanCode || '').trim()) || undefined;
  const checkedRates = useCheckedHotelRates();
  const checkedRateScope = JSON.stringify([
    quoteId, planId, activeGroupType, searchRunId, requestedMealPlanCode, guestNationality,
    roomCount, adultCount, childCount, infantCount, extraBedCount, childWithBedCount, childWithoutBedCount,
    stayRoutes.map((route: { routeId: number; date: string; destination: string }) => [route.routeId, route.date, route.destination]),
  ]);
  const getCheckedCardRateKey = (room: HotelRoomDetail, intent: HotelSelectionActionOptions['selectionIntent']) => {
    const { hotelCode, providerHotelCode, canonicalHotelId } = getHotelIntentIdentity(room);
    return JSON.stringify([
      checkedRateScope, intent,
      Number(room.itineraryRouteId ?? room.itinerary_route_id ?? room.routeId) || getExpandedRouteId(),
      room.date || room.checkInDate, room.checkOutDate,
      String(room.provider || '').toLowerCase(), providerHotelCode || hotelCode || canonicalHotelId,
      room.roomTypeId, room.roomTypeName || room.roomType, room.mealPlanCode || room.mealPlan,
      room.occupancies, room.childAges,
    ]);
  };
  const getCheckedHotelCardQuote = (room: HotelRoomDetail, intent: HotelSelectionActionOptions['selectionIntent']) =>
    checkedRates.get(getCheckedCardRateKey(room, intent))?.quote;
  const autoConfirmActionRef = React.useRef(false);
  // React state updates are asynchronous, so two same-tick click handlers can
  // both pass the isUpdatingHotel check before the first render commits it.
  const hotelIntentPreviewInFlightRef = React.useRef(false);
  const deferredRoomDetailsCleanupRef = React.useRef<number | null>(null);
  const expansionRequestRef = React.useRef(0);
  const intentScopeRef = React.useRef(0);
  React.useLayoutEffect(() => () => {
    intentScopeRef.current += 1;
  }, [quoteId, planId, activeGroupType, expandedRowKey, requestedMealPlanCode, readOnly]);

  const cancelDeferredRoomDetailsCleanup = () => {
    if (deferredRoomDetailsCleanupRef.current === null) return;
    window.clearTimeout(deferredRoomDetailsCleanupRef.current);
    deferredRoomDetailsCleanupRef.current = null;
  };

  const deferRoomDetailsCleanup = () => {
    cancelDeferredRoomDetailsCleanup();
    deferredRoomDetailsCleanupRef.current = window.setTimeout(() => {
      setRoomDetails([]);
      deferredRoomDetailsCleanupRef.current = null;
    }, 0);
  };

  const getManualTargetGroupType = (value: unknown): number | null => {
    try {
      return resolveTargetGroupType(value);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'A valid active recommendation group is required.');
      return null;
    }
  };

  const normalizeDateOnly = (value: unknown): string => {
    const raw = String(value || '').trim();
    if (!raw) return '';
    const match = raw.match(/^(\d{4}-\d{2}-\d{2})/);
    return match?.[1] || '';
  };

  const getSupplierReferenceDate = (hotel: any): string => {
    const references = [hotel?.rateOptionId, hotel?.optionKey, hotel?.searchReference, hotel?.bookingCode]
      .map((value) => String(value || '').trim())
      .filter(Boolean);
    for (const reference of references) {
      const iso = reference.match(/(20\d{2}-\d{2}-\d{2})/);
      if (iso) return iso[1];
      const compact = reference.match(/(?:^|[-|:])(20\d{6})(?:$|[-|:])/i);
      if (compact) {
        const value = compact[1];
        return `${value.slice(0, 4)}-${value.slice(4, 6)}-${value.slice(6, 8)}`;
      }
    }
    return '';
  };

  const getExpectedRouteDate = (routeId: number): string => {
    const route = (Array.isArray(stayRoutes) ? stayRoutes : []).find((candidate: any) =>
      Number(candidate?.routeId || 0) === Number(routeId),
    );
    if (route?.date) return normalizeDateOnly(route.date);
    const row = (currentHotelRows || []).find((candidate: any) =>
      Number(candidate?.itineraryRouteId || candidate?.routeId || 0) === Number(routeId),
    );
    return normalizeDateOnly(row?.date || row?.checkInDate);
  };


  const handleRowClick = async (hotel: ItineraryHotelRow) => {
    if (readOnly) return; // Don't expand in read-only mode

    const rowKey = getStayKey(hotel);
    const paneKey = getHotelPaneKey(hotel);
    const requestId = expansionRequestRef.current + 1;
    expansionRequestRef.current = requestId;
    cancelDeferredRoomDetailsCleanup();

    // Collapse if already open
    if (expandedRowKey === paneKey) {
      setLoadingRowKey(null);
      setExpandedRowKey(null);
      // Hide the pane first. Releasing its large card tree is deferred until
      // after the close render so the click feels immediate.
      deferRoomDetailsCleanup();
      setSelectedHotelId(null);
      setHotelSearchQuery("");
      setRoomTypeDropdownOpen(null);
      return;
    }

    // Switch the mounted pane immediately. Waiting until inventory filtering
    // completes leaves the old day visible while the new day is loading and
    // can make two panes appear open at once.
    setLoadingRowKey(paneKey);
    setExpandedRowKey(paneKey);
    setRoomDetails([]);
    setHotelSearchQuery("");
    setRoomTypeDropdownOpen(null);

    // Paint the new pane before filtering its inventory.
    await new Promise<void>((resolve) => {
      window.setTimeout(resolve, 0);
    });
    if (expansionRequestRef.current !== requestId) return;

    // The compact persisted row is not guaranteed to carry the legacy snake
    // case fields that older snapshots used. Resolve the canonical route/date
    // identity exactly as the table does before looking up shared inventory.
    const itineraryRouteId =
      (hotel as any).itineraryRouteId ??
      (hotel as any).itinerary_route_id ??
      (hotel as any).routeId;
    const routeId = Number(itineraryRouteId || 0);
    const itineraryStayDate =
      normalizeDateOnly(
        (hotel as any).date ??
          (hotel as any).checkInDate ??
          (hotel as any).hotelCheckInDate ??
          (hotel as any).hotel_check_in_date ??
          (hotel as any).itineraryRouteDate ??
          (hotel as any).itinerary_route_date,
      ) || getExpectedRouteDate(routeId) || getSupplierReferenceDate(hotel);
    setSelectedHotelId(hotel.hotelId);

    const inventoryCacheKey = `inventory:${routeId}:${itineraryStayDate}`;
    const allInventoryCacheKey = "inventory:all";
    const cachedInventory = Array.isArray(roomDetailsCache?.[inventoryCacheKey])
      ? roomDetailsCache[inventoryCacheKey]
      : [];
    const cachedAllInventory = Array.isArray(roomDetailsCache?.[allInventoryCacheKey])
      ? roomDetailsCache[allInventoryCacheKey]
      : [];

    // Filter the source arrays before merging them. Merging the complete
    // itinerary inventory first makes opening one route pay the cost of every
    // route/provider option in memory.
    const stayInventory = getHotelsForStay(
      [
        ...cachedInventory,
        ...cachedAllInventory,
        ...sharedHotelInventory,
        ...localHotels,
      ],
      routeId,
      itineraryStayDate,
      0,
      planId,
      roomCount,
    );

    // Full search inventory is intentionally request-scoped. If automatic
    // validation has not populated the mounted page yet, the pane contains
    // only its persisted selection and does not perform a hidden cache read.

    const uniqueHotels = mergeHotelOptions(
      stayInventory,
      getHotelsForStay(
        localRestrictedHotels,
        routeId,
        itineraryStayDate,
        0,
        planId,
        roomCount,
      ),
    );

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
    
    // A compact refresh intentionally omits the full supplier inventory. If
    // the pane has no in-memory rows, fetch only the first 20 rows for this
    // route before declaring the pane empty; otherwise the old handler closed
    // immediately on every refresh.
    if (uniqueHotels.length < 20 && quoteId && routeId > 0) {
      try {
        const paged = await hotelService.getPersistedHotelDetails(
          quoteId,
          1,
          20,
          Number(activeGroupType || 1),
          routeId,
        );
        if (expansionRequestRef.current !== requestId) return;
        const rawPagedHotels = Array.isArray(paged?.hotels) ? paged.hotels : [];
        const fetchedHotels = mergeHotelOptions(
          getHotelsForStay(rawPagedHotels, routeId, itineraryStayDate, 0, planId, roomCount),
          rawPagedHotels,
        );
        if (fetchedHotels.length > 0) {
          setRoomDetails(fetchedHotels);
          setRoomDetailsCache((previous: Record<string, HotelRoomDetail[]>) => ({
            ...previous,
            [inventoryCacheKey]: fetchedHotels,
          }));
          setLoadingRowKey(null);
          return;
        }
      } catch (error) {
        if (expansionRequestRef.current !== requestId) return;
        console.error("Load initial hotel pane page failed", error);
      }
    }

    if (uniqueHotels.length > 0) {
      setRoomDetails(uniqueHotels);
    } else {
      toast.warning('No hotels found for this route');
    }
    setLoadingRowKey(null);
  };

  // ---------- HELPER: NORMALIZE API ROOM RESPONSE TO UI SHAPE ----------
  const normalizeRoom = (r: any): HotelRoomDetail => {
    const perNightAmount = Number(r.perNightAmount ?? r.pricePerNight ?? 0);
    const nights = Number(r.numberOfNights ?? 1);
    const taxAmount = Number(r.taxAmount ?? 0);
    const baseAmount = Number(r.totalAmount ?? r.totalPrice ?? 0);
    // The itinerary occupancy is authoritative. Availability rows can carry
    // a legacy noOfRooms=1 even when the itinerary requests multiple rooms.
    const effectiveRooms = Math.max(Number(roomCount ?? r.noOfRooms ?? 1), 1);
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

  const openConfirmDialogForAction = (
    action: Omit<PendingHotelAction, "multiNightPreview">,
    options: Pick<HotelSelectionActionOptions, "autoConfirm" | "skipCostPreview" | "keepExpanded" | "singleNightOnly" | "onBeforeSelectionConfirm" | "onSelectionApplied"> & {
      multiNightPreview?: StayExtensionPreviewResponse | null;
    } = {},
  ) => {
    const groupType = getManualTargetGroupType(activeGroupType);
    if (groupType === null) return;
    const manualRoomMealMismatchWarning = findManualRoomMealMismatchWarning(
      action.room,
      groupType,
    );

    autoConfirmActionRef.current = Boolean(options.autoConfirm);
    setPendingHotelAction({
      ...action,
      multiNightPreview: options.multiNightPreview ?? null,
      autoConfirm: Boolean(options.autoConfirm),
      skipCostPreview: Boolean(options.skipCostPreview),
      keepExpanded: Boolean(options.keepExpanded),
      singleNightOnly: Boolean(options.singleNightOnly),
      keepExpandedRowKey: options.keepExpanded ? expandedRowKey : null,
      manualRoomMealMismatchWarning,
      onSelectionApplied: options.onSelectionApplied,
      onBeforeSelectionConfirm: options.onBeforeSelectionConfirm,
    });
    setShowConfirmDialog(!options.autoConfirm);
  };

// Resolve a TBO property's identity from its concrete supplier rate.
// Never use a different property's providerHotelCode when the selected
// rate itself identifies the supplier hotel.
const getVerifiedHotelIntentIdentity = (
  hotel: HotelRoomDetail,
): ReturnType<typeof getHotelIntentIdentity> => {
  const identity = getHotelIntentIdentity(
    hotel as Record<string, unknown>,
  );

  if (String(hotel.provider || "").trim().toLowerCase() !== "tbo") {
    return identity;
  }

  const supplierReference = [
    (hotel as any).searchReference,
    (hotel as any).bookingCode,
    (hotel as any).rateOptionId,
  ]
    .map((value) => String(value || "").trim())
    .find((value) => /^\d+!TB!/i.test(value));

  if (!supplierReference) {
    return identity;
  }

 const supplierHotelCode = supplierReference.split("!TB!")[0];

if (!supplierHotelCode) {
  return identity;
}

const propertyHotelCode = String(
  (hotel as any).providerHotelCode ||
  (hotel as any).hotelCode ||
  "",
).trim();

if (
  propertyHotelCode &&
  supplierHotelCode !== propertyHotelCode
) {
  throw new Error(
    "The selected room rate belongs to a different hotel. " +
    "Refresh this hotel's room rates and select again."
  );
}

return {
  ...identity,
  hotelCode: supplierHotelCode,
  providerHotelCode: supplierHotelCode,
};
};

  const buildIntentPreviewPayload = (
    normalizedRoom: HotelRoomDetail,
    targetGroupType: number,
    serverIntent: NonNullable<HotelSelectionActionOptions['selectionIntent']>,
  ) => {
    const resolvedPlanId = Number(normalizedRoom.itineraryPlanId);
    const resolvedRouteId = Number(normalizedRoom.itineraryRouteId);
    const hotelIntentIdentity = getVerifiedHotelIntentIdentity(normalizedRoom);
    return {
      planId: resolvedPlanId,
      routeId: resolvedRouteId,
      groupType: targetGroupType,
      selectionIntent: serverIntent,
      provider: String(normalizedRoom.provider || '').trim().toLowerCase(),
      ...hotelIntentIdentity,
      roomTypeId: Number(normalizedRoom.roomTypeId ?? normalizedRoom.room_type_id ?? 0) || undefined,
      hotelName: String(normalizedRoom.hotelName || '').trim() || undefined,
      // Retain the concrete room shown on the card to check occupancy across the stay.
      roomType: String(normalizedRoom.roomTypeName || normalizedRoom.roomType || '').trim() || undefined,
      roomId: normalizedRoom.roomId,
      rateId: String(normalizedRoom.rateId || '').trim() || undefined,
      mealPlanCode: serverIntent === 'MEAL_PLAN'
        ? String(normalizedRoom.mealPlanCode || normalizedRoom.mealPlan || '').trim() || undefined
        : requestedMealPlanCode,
      rateOptionId: serverIntent === 'RATE_OPTION' ? String(normalizedRoom.rateOptionId || '').trim() || undefined : undefined,
      optionKey: serverIntent === 'RATE_OPTION' ? String(normalizedRoom.optionKey || '').trim() || undefined : undefined,
      selectionKey: serverIntent === 'RATE_OPTION' ? String(normalizedRoom.selectionKey || '').trim() || undefined : undefined,
      routeDate: String(normalizedRoom.date || normalizedRoom.checkInDate || '').slice(0, 10) || undefined,
      searchRunId: serverIntent === 'HOTEL' && String(normalizedRoom.provider).trim().toLowerCase() === 'tbo'
        ? String(normalizedRoom.searchRunId || searchRunId || '').trim() || undefined
        : undefined,
    };
  };

// ---------- HANDLER: CHOOSE/UPDATE HOTEL ----------
const handleChooseOrUpdateHotel = async (
    room: HotelRoomDetail,
    options: HotelSelectionActionOptions = {},
  ) => {
    console.log('🏨 Choose button clicked', room);
    
    // ✅ BLOCK hotel selection when in read-only mode (confirmed itinerary)
    if (readOnly || isUpdatingHotel || hotelIntentPreviewInFlightRef.current) {
      console.log('⛔ [HotelList] Blocked handleChooseOrUpdateHotel - read-only mode');
      return;
    }
    
    const resolvedPlanId = toNumber((room as any).itineraryPlanId ?? (room as any).itinerary_plan_id ?? planId, 0);
    const resolvedRouteId = toNumber((room as any).itineraryRouteId ?? (room as any).itinerary_route_id ?? (room as any).routeId, 0) || getExpandedRouteId();
    const resolvedHotelId = toNumber((room as any).hotelId ?? (room as any).hotel_id ?? (room as any).id, 0);

    if (!resolvedRouteId || !hasSelectableHotelIdentity({ ...room, hotelId: resolvedHotelId })) {
      console.error('❌ Missing required fields:', {
        itineraryPlanId: resolvedPlanId,
        itineraryRouteId: resolvedRouteId,
        hotelId: resolvedHotelId,
        rawRoom: room,
      });
      toast.error('Missing required hotel information');
      return;
    }

    let normalizedRoom: HotelRoomDetail = {
      ...room,
      itineraryPlanId: resolvedPlanId,
      itineraryRouteId: resolvedRouteId,
      hotelId: resolvedHotelId,
    };

    const targetGroupType = getManualTargetGroupType(activeGroupType);
    if (targetGroupType === null) return;

    // A rate can come from any recommendation package because all tabs share
    // the same inventory pool. Persist a manual choice under the active tab's
    // group, never under the source group's groupType. This preserves the
    // existing selection in other recommendation groups.
    normalizedRoom = {
      ...normalizeManualHotelSelection(normalizedRoom as Record<string, unknown>, targetGroupType),
    } as HotelRoomDetail;

    // Final apply is server-authoritative. Preview the intent first and only
    // open confirmation after the backend returns authoritative selections.
    const requestedIntent = options.selectionIntent || 'RATE_OPTION';
    const requestedRateIdentity = [
      (normalizedRoom as any).rateOptionId,
      (normalizedRoom as any).optionKey,
      (normalizedRoom as any).selectionKey,
    ].map((value) => String(value || '').trim()).find(Boolean) || '';
    // A hotel card can be a display container whose fallback option has no
    // supplier rate identity. RATE_OPTION requires a concrete nested option;
    // fall back to HOTEL so a card click does not produce a false HOTEL_RATE_STALE
    // response. Nested room/rate selections retain RATE_OPTION identity.
   const serverIntent = requestedIntent === 'RATE_OPTION' && !requestedRateIdentity
  ? 'HOTEL'
  : requestedIntent;

const provider = String(
  (normalizedRoom as any).provider || ''
).trim().toLowerCase();

const currentRowForPreview = (currentHotelRows || []).find(
  (candidate: any) =>
    toNumber(
      candidate?.itineraryRouteId || candidate?.routeId,
      0
    ) === resolvedRouteId &&
    !candidate?.previousDayBillingSynthetic
);

const pendingActionBase = {
  room: normalizedRoom,
  isReplacing: serverIntent === 'HOTEL',
  isRateUpdate: serverIntent !== 'HOTEL',
  previousSelection: currentRowForPreview
    ? { ...currentRowForPreview }
    : null,
  previousHotelName: String(
    currentRowForPreview?.hotelName || ''
  ).trim(),
  newHotelName: String(
    normalizedRoom.hotelName || ''
  ).trim(),
  routeDate: String(
    currentRowForPreview?.day ||
    (normalizedRoom as any).date ||
    ''
  ).trim(),
  groupType: targetGroupType,
};

    if (hotelIntentPreviewInFlightRef.current) return;
    hotelIntentPreviewInFlightRef.current = true;
    const scope = intentScopeRef.current;
    const expansion = expansionRequestRef.current;
    const isCurrent = () => scope === intentScopeRef.current && expansion === expansionRequestRef.current;
    setIsUpdatingHotel(true);
    try {
      const previewPayload = buildIntentPreviewPayload(normalizedRoom, targetGroupType, serverIntent);
      const checkedKey = options.reuseCheckedCardRate ? getCheckedCardRateKey(room, requestedIntent) : null;
      const checkedRate = checkedKey ? checkedRates.get(checkedKey) : undefined;
      const reuseVsrRate = options.reuseCheckedCardRate && serverIntent === 'HOTEL' &&
        (provider === 'tbo' || provider === 'vsr');
      let preview: HotelIntentPreviewResponse;
      if (checkedRate) {
        preview = checkedRate.preview;
      } else if (reuseVsrRate) {
        preview = await hotelService.previewHotelIntent({ ...previewPayload, reuseCheckedRateOnly: true });
        if (!isCurrent()) return;
        if (preview.status === 'SEARCH_REQUIRED') {
          setHotelActionPhase?.('checking');
          preview = await hotelService.previewHotelIntent(previewPayload);
        }
      } else {
        if (provider !== 'offline') setHotelActionPhase?.('checking');
        preview = await hotelService.previewHotelIntent(previewPayload);
      }
      if (!isCurrent()) return;
      if (preview.status !== 'AVAILABLE') {
        if (preview.canBookSingleNight) {
          const logicalStay = preview.logicalStay;
          const singleNightPreview: StayExtensionPreviewResponse = {
            canBookSingleNight: true,
            canBookMultiNight: false,
            blocked: true,
            provider: provider as StayExtensionPreviewResponse['provider'],
            hotelName: String((normalizedRoom as any).hotelName || '').trim() || undefined,
            roomType: String((normalizedRoom as any).roomTypeName || (normalizedRoom as any).roomType || '').trim() || undefined,
            mealPlan: String((normalizedRoom as any).mealPlan || '').trim() || undefined,
            checkInDate: logicalStay?.checkInDate || normalizeDateOnly((normalizedRoom as any).date || (normalizedRoom as any).checkInDate),
            checkOutDate: logicalStay?.checkOutDate || normalizeDateOnly((normalizedRoom as any).date || (normalizedRoom as any).checkInDate),
            nights: logicalStay?.nights || 1,
            routeIds: logicalStay?.routeIds || [resolvedRouteId],
            stayKey: logicalStay?.stayKey,
            restrictionConflicts: preview.restrictionConflicts || [],
            warnings: preview.warnings || [],
            nightlyRates: [],
            totalAmountAfterTax: Number((normalizedRoom as any).totalAmountAfterTax || (normalizedRoom as any).totalPrice || 0),
          };
          setStayExtensionModalState({
            preview: singleNightPreview,
            action: pendingActionBase,
          });
          return;
        }
        const logicalStayDates = Array.isArray(preview.logicalStay?.stayDates)
          ? preview.logicalStay.stayDates.filter(Boolean).join(', ')
          : '';
        toast.error(
          preview.message || (preview.status === 'REFRESH_FAILED'
            ? 'Hotel availability could not be checked right now. Please try again.'
            : `The selected hotel is not available for the requested stay${logicalStayDates ? ` (${logicalStayDates})` : ''}.`),
        );
        if (preview.status === 'NO_AVAILABILITY') {
          options.onSelectionUnavailable?.(normalizedRoom, preview);
        }
        return;
      }
      const previewSelections = Array.isArray(preview.selections) ? preview.selections : [];
      const authoritative = previewSelections.find((selection: any) =>
        toNumber(selection?.routeId, 0) === resolvedRouteId,
      ) || previewSelections[0];
      const authoritativeFields = ['provider', 'hotelCode', 'hotelName', 'roomType', 'mealPlan', 'pricePerNight', 'totalPrice'];
      if (!checkedRate) authoritativeFields.push('selectedRateOptionId');
      const missingAuthoritative = authoritativeFields.filter((field) => {
        const value = (authoritative as any)?.[field];
        return value === undefined || value === null || String(value).trim() === '';
      });
      if (!authoritative || missingAuthoritative.length > 0) {
        throw new Error(`Hotel preview did not return complete authoritative selection data${missingAuthoritative.length ? `: missing ${missingAuthoritative.join(', ')}` : ''}`);
      }
      const currentRow = (currentHotelRows || []).find((candidate: any) =>
        toNumber(candidate?.itineraryRouteId || candidate?.routeId, 0) === resolvedRouteId &&
        !candidate?.previousDayBillingSynthetic,
      );
      const authoritativeCardQuote = quoteFromHotelPreview(
        authoritative,
        resolvedRouteId,
        String((authoritative as any).routeDate || currentRow?.date || normalizedRoom.date || '').slice(0, 10),
        Math.max(Number(roomCount || 1), 1),
      );
      const authoritativeRoom = {
        ...normalizedRoom,
        ...authoritative,
        cardQuote: authoritativeCardQuote,
        itineraryPlanId: resolvedPlanId,
        itineraryRouteId: resolvedRouteId,
        hotelId: toNumber((authoritative as any).hotelId ?? (authoritative as any).canonicalHotelId ?? resolvedHotelId, resolvedHotelId),
        roomTypeName: (authoritative as any).roomType,
        mealPlanCode: (authoritative as any).mealPlan,
        rateOptionId: (authoritative as any).selectedRateOptionId || (authoritative as any).rateOptionId,
        optionKey: (authoritative as any).selectedRateOptionId || (authoritative as any).rateOptionId || (authoritative as any).optionKey,
        pricePerNight: Number((authoritative as any).pricePerNight),
        totalPrice: Number((authoritative as any).totalPrice),
        totalAmount: Number((authoritative as any).totalPrice),
        totalAmountAfterTax: Number((authoritative as any).totalPrice),
        totalHotelCost: Number((authoritative as any).totalPrice),
        basePricePerNight: Number((authoritative as any).basePricePerNight || 0),
        baseTotalPrice: Number((authoritative as any).baseTotalPrice || 0),
        hotelMarginPercentage: Number((authoritative as any).hotelMarginPercentage || 0),
        hotelMarginAmount: Number((authoritative as any).hotelMarginAmount || 0),
        hotelMarginTotalAmount: Number((authoritative as any).hotelMarginTotalAmount || 0),
      } as HotelRoomDetail;
      if (checkedKey && !checkedRate) {
        checkedRates.remember(checkedKey, { preview, quote: authoritativeCardQuote });
      }
      setPendingHotelAction({
        room: authoritativeRoom,
        operationPricing: {
          dates: preview.logicalStay?.stayDates || [],
        },
        isReplacing: serverIntent === 'HOTEL',
        isRateUpdate: serverIntent !== 'HOTEL',
        previousSelection: currentRow ? ({ ...currentRow } as Record<string, unknown>) : null,
        previousHotelName: String(currentRow?.hotelName || '').trim(),
        newHotelName: String((authoritative as any).hotelName || normalizedRoom.hotelName || '').trim(),
        routeDate: String((authoritative as any).routeDate || currentRow?.day || normalizedRoom.date || normalizedRoom.checkInDate || '').trim(),
        groupType: targetGroupType,
        selectionIntent: serverIntent,
        onSelectionApplied: options.onSelectionApplied,
        onBeforeSelectionConfirm: options.onBeforeSelectionConfirm,
        keepExpanded: options.keepExpanded,
        keepExpandedRowKey: expandedRowKey,
      });
      setShowConfirmDialog(true);
    } catch (previewError: any) {
      if (!isCurrent()) return;
      console.error('[HotelList] hotel intent preview failed; confirmation blocked', previewError);
      toast.error(String(previewError?.message || 'Hotel availability could not be checked right now. Please try again.'));
    } finally {
      hotelIntentPreviewInFlightRef.current = false;
      setIsUpdatingHotel(false);
      setHotelActionPhase?.('idle');
    }
  };

  const handleCancelHotelAction = () => {
    if (pendingHotelAction?.isRateUpdate && pendingHotelAction.previousSelection) {
      const previous = pendingHotelAction.previousSelection as any;
      const identityKey = [
        String(previous.hotelName || '').trim().toLowerCase(),
        String(previous.provider || '').trim().toLowerCase(),
      ].join('|');
      setSelectedRoomTypeByHotel((current) => ({
        ...current,
        [identityKey]: getHotelOptionKey(previous),
      }));
    }
    setShowConfirmDialog(false);
    setPendingHotelAction(null);
  };

  const handleConfirmHotelSelection = async () => {
    if (!pendingHotelAction || isUpdatingHotel) return;

    if (pendingHotelAction.onBeforeSelectionConfirm) {
      const confirmed = await pendingHotelAction.onBeforeSelectionConfirm(pendingHotelAction);
      if (!confirmed) return;
    }

    const confirmedSelectionIntent = pendingHotelAction.selectionIntent || (pendingHotelAction.isReplacing ? 'HOTEL' : 'RATE_OPTION');
    console.log('[HotelList] Confirming server selection intent', confirmedSelectionIntent);

    const { room, isReplacing } = pendingHotelAction;
    const skipCostPreview = pendingHotelAction.skipCostPreview === true;
    const multiNightPreview = pendingHotelAction.multiNightPreview && !pendingHotelAction.multiNightPreview.blocked
      && pendingHotelAction.multiNightPreview.canBookMultiNight
      ? pendingHotelAction.multiNightPreview
      : null;

    if (
      pendingHotelAction.multiNightPreview
      && !multiNightPreview
      && !pendingHotelAction.multiNightPreview.canBookSingleNight
    ) {
      setShowConfirmDialog(false);
      setPendingHotelAction(null);
      const message =
        pendingHotelAction.multiNightPreview.restrictionConflicts
          ?.map((conflict: any) => conflict.message)
          .join(" | ")
        || "Hotel cannot be booked on the selected day.";
      toast.error(
        message,
      );
      return;
    }

    // Validate required fields
    const resolvedPlanId = toNumber((room as any).itineraryPlanId ?? (room as any).itinerary_plan_id ?? planId, 0);
    const resolvedRouteId = toNumber((room as any).itineraryRouteId ?? (room as any).itinerary_route_id ?? (room as any).routeId, 0) || getExpandedRouteId();
    const resolvedHotelId = toNumber((room as any).hotelId ?? (room as any).hotel_id ?? (room as any).id, 0);

    if (!resolvedRouteId || !hasSelectableHotelIdentity({ ...room, hotelId: resolvedHotelId })) {
      toast.error("Missing required hotel information");
      return;
    }

    let normalizedRoom: HotelRoomDetail = {
      ...room,
      itineraryPlanId: resolvedPlanId,
      itineraryRouteId: resolvedRouteId,
      hotelId: resolvedHotelId,
    };
    const targetGroupType = getManualTargetGroupType(pendingHotelAction.groupType);
    if (targetGroupType === null) {
      setShowConfirmDialog(false);
      setPendingHotelAction(null);
      return;
    }
    normalizedRoom = {
      ...normalizeManualHotelSelection(normalizedRoom as Record<string, unknown>, targetGroupType),
    } as HotelRoomDetail;

    if (confirmedSelectionIntent) {
      setHotelActionPhase?.('applying');
      setIsUpdatingHotel(true);
      let serverCommitSucceeded = false;
      try {
        const intent = confirmedSelectionIntent;
        const isVsrHotelSelection = intent === 'HOTEL' && isVsrHotel(normalizedRoom as any);
     const hotelIntentIdentity = getVerifiedHotelIntentIdentity(normalizedRoom);

const payload: Record<string, unknown> = {
          planId: resolvedPlanId,
          routeId: resolvedRouteId,
          groupType: targetGroupType,
          selectionIntent: intent,
          provider: String((normalizedRoom as any).provider || '').trim().toLowerCase(),
          ...hotelIntentIdentity,
          isRefundable: getHotelRefundableRateValue(normalizedRoom as unknown as Record<string, unknown>),
          IsRefundable: getHotelRefundableRateValue(normalizedRoom as unknown as Record<string, unknown>),
          roomTypeId: Number((normalizedRoom as any).roomTypeId ?? (normalizedRoom as any).room_type_id ?? 0) || undefined,
          // The preview already refreshed the supplier and returned the
          // authoritative rate. Reuse that snapshot during commit instead of
          // asking TBO for a second, potentially different booking code/fare.
          // Only RATE_OPTION actions may carry a concrete supplier-rate
          // identity. HOTEL/ROOM_TYPE/MEAL_PLAN actions must resolve the
          // option again using the requested meal plan; otherwise a stale AP
          // identity on a visible CP pane can override the user's choice.
         rateOptionId: intent === 'RATE_OPTION'
  ? String((normalizedRoom as any).rateOptionId || '').trim() || undefined
  : undefined,

optionKey: intent === 'RATE_OPTION'
  ? String((normalizedRoom as any).optionKey || '').trim() || undefined
  : undefined,

selectionKey: intent === 'RATE_OPTION'
  ? String((normalizedRoom as any).selectionKey || '').trim() || undefined
  : undefined,
          bookingCode: intent === 'RATE_OPTION'
            ? String((normalizedRoom as any).bookingCode || (normalizedRoom as any).supplierBookingCode || '').trim() || undefined
            : undefined,
          searchReference: intent === 'RATE_OPTION'
            ? String((normalizedRoom as any).searchReference || '').trim() || undefined
            : undefined,
          // HOTEL/ROOM_TYPE/MEAL_PLAN are intent selections. Their card
          // preview price can be a display/container value, so never let it
          // override the authoritative occupancy-rate value on commit.
          // Only an explicit RATE_OPTION carries a concrete price to verify.
          pricePerNight: intent === 'RATE_OPTION' || isVsrHotelSelection
            ? Number((normalizedRoom as any).pricePerNight || 0) || undefined
            : undefined,
          totalPrice: intent === 'RATE_OPTION' || isVsrHotelSelection
            ? Number((normalizedRoom as any).totalPrice || 0) || undefined
            : undefined,
          basePricePerNight: isVsrHotelSelection
            ? Number((normalizedRoom as any).basePricePerNight || 0) || undefined
            : undefined,
          baseTotalPrice: isVsrHotelSelection
            ? Number((normalizedRoom as any).baseTotalPrice || 0) || undefined
            : undefined,
          hotelMarginPercentage: isVsrHotelSelection
            ? Number((normalizedRoom as any).hotelMarginPercentage || 0) || undefined
            : undefined,
          roomId: (normalizedRoom as any).roomId,
          rateId: String((normalizedRoom as any).rateId || '').trim() || undefined,
          reusePreviewSnapshot: true,
          routeDate: String((normalizedRoom as any).date || (normalizedRoom as any).checkInDate || '').slice(0, 10) || undefined,
          tboRoomNightBreakdown: Array.isArray((normalizedRoom as any).tboRoomNightBreakdown)
            ? (normalizedRoom as any).tboRoomNightBreakdown
            : undefined,
          singleNightOnly: pendingHotelAction.singleNightOnly === true,
        };
        // Keep the concrete room selected in the pane for every intent. A
        // HOTEL intent may change the property, but it must not lose the room
        // identity and fall back to an arbitrary legacy room during commit.
        payload.roomType = String((normalizedRoom as any).roomTypeName || (normalizedRoom as any).roomType || '').trim() || undefined;
        payload.mealPlanCode = intent === 'MEAL_PLAN'
          ? String((normalizedRoom as any).mealPlanCode || (normalizedRoom as any).mealPlan || '').trim() || undefined
          : requestedMealPlanCode;
        if (intent === 'RATE_OPTION') {
          payload.rateOptionId = String((normalizedRoom as any).rateOptionId || '').trim() || undefined;
          payload.optionKey = String((normalizedRoom as any).optionKey || '').trim() || undefined;
          payload.selectionKey = String((normalizedRoom as any).selectionKey || '').trim() || undefined;
        }

        const result: any = await hotelService.selectHotelIntent(payload as any);
        serverCommitSucceeded = result?.success === true;
        // The mutation returns both the normalized hotelDetails envelope and
        // its legacy selections alias. Consume the authoritative envelope
        // first so room-type changes cannot retain the previous card row.
        const returnedSelections = Array.isArray(result?.hotelDetails)
          ? result.hotelDetails
          : (Array.isArray(result?.selections) ? result.selections : []);
        if (returnedSelections.length === 0) throw new Error('The server did not return the saved hotel selection');
        const updates: Record<number, HotelSelectionUpdate | null> = {};
        const stateRows: any[] = [];
        returnedSelections.forEach((selection: any) => {
          const selectionRouteId = toNumber(selection.routeId, 0);
          if (!selectionRouteId) return;
          const missingAuthoritative = getMissingAuthoritativeSelectionFields(selection);
          if (missingAuthoritative.length > 0) {
            throw new Error(
              `Malformed authoritative hotel selection for route ${selectionRouteId}: missing ${missingAuthoritative.join(', ')}`,
            );
          }
          const base = (localHotels || []).find((candidate: any) =>
            toNumber(candidate?.itineraryRouteId || candidate?.routeId, 0) === selectionRouteId &&
            toNumber(candidate?.groupType, targetGroupType) === targetGroupType,
          ) || normalizedRoom;
          const routeDate = String(selection.routeDate || base.date || base.checkInDate || '').slice(0, 10);
          // The selection response may carry both a supplier/stay total and
          // the API-calculated payable total. Keep the latter as the row's
          // financial source of truth; do not replace it with totalPrice.
          const totalPrice = Number(
            selection.totalPrice ?? selection.pricePerNight ?? 0,
          );
          const payableTotal = Number(
            selection.totalHotelCost ??
              selection.total_hotel_cost ??
              selection.totalAmountAfterTax ??
              selection.totalAmount ??
              totalPrice,
          );
          const roomType = String(selection.roomType || selection.roomTypeName || base.roomType || base.roomTypeName || '').trim() || 'Not Specified';
          const mealPlan = String(selection.mealPlan || selection.mealPlanCode || '').trim() || 'Not Specified';
          const hotelCode = String(
            selection.hotelCode || selection.providerHotelCode || selection.canonicalHotelId || selection.hotelId || '',
          ).trim();
          const row: any = {
            ...buildAuthoritativeSelectedHotelRow(base, selection),
            itineraryPlanId: resolvedPlanId,
            itineraryRouteId: selectionRouteId,
            routeId: selectionRouteId,
            groupType: targetGroupType,
            date: routeDate,
            checkInDate: routeDate,
            roomType,
            roomTypeName: roomType,
            mealPlan,
            mealPlanCode: selection.mealPlanCode || mealPlan,
            rateOptionId: selection.selectedRateOptionId || selection.rateOptionId,
            optionKey: selection.selectedRateOptionId || selection.rateOptionId,
            totalHotelCost: payableTotal,
            cardQuote: quoteFromHotelPreview({ ...selection, totalPrice: payableTotal },
              selectionRouteId, routeDate, Math.max(Number(roomCount || 1), 1)),
            baseHotelCost: Number(selection.baseTotalPrice ?? selection.basePricePerNight ?? 0),
            roomRate: Number(selection.roomRate ?? selection.room_rate ?? 0),
            totalRoomCost: Number(selection.totalRoomCost ?? selection.total_room_cost ?? 0),
            // Pricing is calculated by the API. Preserve the complete
            // server-returned breakdown so the tooltip only displays it and
            // never reconstructs supplements or margin in the browser.
            extraBedCount: selection.extraBedCount ?? selection.extra_bed_count,
            extraBedRate: selection.extraBedRate ?? selection.extra_bed_rate,
            extraBedAmount: selection.extraBedAmount ?? selection.extra_bed_amount,
            totalExtraBedCost: selection.totalExtraBedCost ?? selection.total_extra_bed_cost,
            childWithBedCount: selection.childWithBedCount ?? selection.child_with_bed_count,
            childWithBedRate: selection.childWithBedRate ?? selection.child_with_bed_rate,
            childWithBedAmount: selection.childWithBedAmount ?? selection.child_with_bed_amount,
            totalChildWithBedCost: selection.totalChildWithBedCost ?? selection.total_childwith_bed_cost,
            childWithoutBedCount: selection.childWithoutBedCount ?? selection.child_without_bed_count,
            childWithoutBedRate: selection.childWithoutBedRate ?? selection.child_without_bed_rate,
            childWithoutBedAmount: selection.childWithoutBedAmount ?? selection.child_without_bed_amount,
            totalChildWithoutBedCost: selection.totalChildWithoutBedCost ?? selection.total_childwithout_bed_cost,
            hotelMarginBaseAmount: selection.hotelMarginBaseAmount ?? selection.hotel_margin_base_amount,
            hotelMarginPercentage: Number(selection.hotelMarginPercentage ?? 0),
            hotelMarginAmount: Number(selection.hotelMarginTotalAmount ?? selection.hotelMarginAmount ?? 0),
            hotelMarginTotalAmount: selection.hotelMarginTotalAmount ?? selection.hotel_margin_total_amount ?? selection.hotelMarginAmount ?? selection.hotel_margin_amount,
            amountIncludesHotelMargin: selection.amountIncludesHotelMargin,
            pricingIncludesHotelMargin: selection.pricingIncludesHotelMargin,
            totalAmount: payableTotal,
            totalAmountAfterTax: payableTotal,
            pricePerNight: Number(selection.pricePerNight ?? totalPrice),
            selectedRateOptionId: selection.selectedRateOptionId || selection.rateOptionId,
            availableRoomTypeCategories: Array.isArray(selection.availableRoomTypeCategories)
              ? selection.availableRoomTypeCategories
              : undefined,
          };
          stateRows.push(row);
          updates[selectionRouteId] = {
            provider: String(selection.provider).trim().toLowerCase(),
            hotelCode,
            bookingCode: String(selection.bookingCode || '').trim(),
            roomType,
            // `totalPrice` is the supplier/room total. The API-calculated
            // payable amount includes supplements, tax, and margin and is
            // the value persisted and returned as `totalHotelCost`.
            netAmount: payableTotal,
            hotelName: String(selection.hotelName).trim(),
            checkInDate: routeDate,
            checkOutDate: String(selection.checkOutDate || '').trim(),
            groupType: targetGroupType,
            mealPlan,
            rateOptionId: String(selection.selectedRateOptionId || selection.rateOptionId || '').trim(),
            searchReference: String(selection.searchReference || row.searchReference || '').trim() || undefined,
            roomId: selection.roomId,
            rateId: selection.rateId,
            totalPrice: payableTotal,
            pricePerNight: Number(selection.pricePerNight ?? totalPrice),
            totalAmountAfterTax: payableTotal,
            currency: selection.currency || 'INR',
            routeId: selectionRouteId,
            optionKey: String(selection.selectedRateOptionId || selection.rateOptionId || '').trim(),
          };
        });
        setSelectedByGroup((previous: any) => {
          const next = { ...previous, [targetGroupType]: { ...(previous[targetGroupType] || {}) } };
          stateRows.forEach((row) => { next[targetGroupType][getStayKey(row)] = row; });
          return next;
        });
        setUserSelectedByGroup((previous: any) => {
          const next = { ...previous, [targetGroupType]: { ...(previous[targetGroupType] || {}) } };
          stateRows.forEach((row) => { next[targetGroupType][getStayKey(row)] = row; });
          return next;
        });
        stateRows.forEach((row) => {
          const identityKey = `${String(row.hotelName || '').trim().toLowerCase()}|${String(row.provider || '').trim().toLowerCase()}`;
          setSelectedRoomTypeByHotel((previous: any) => ({ ...previous, [identityKey]: getHotelOptionKey(row) }));
        });
        onHotelSelectionsChange?.(updates, result?.financialSummary);
        const apiHotelTotal = Number(
          result?.financialSummary?.costBreakdown?.totalHotelAmount ??
            result?.financialSummary?.costBreakdown?.totalRoomCost ??
            0,
        );
        if (apiHotelTotal > 0) onTotalChange?.(apiHotelTotal);
        // The select-intent response is authoritative for the committed
        // selection. The selected rows, selection maps, and cost preview are
        // already updated in memory above, so do not perform a second
        // database read here. Persisted details remain the source for initial
        // loading and explicit reset/rebuild flows.
        onGroupTypeChange?.(targetGroupType);
        pendingHotelAction.onSelectionApplied?.();
        if (!pendingHotelAction.keepExpanded) {
          setExpandedRowKey(null);
          setRoomDetails([]);
          setSelectedHotelId(null);
          setHotelSearchQuery('');
          setRoomTypeDropdownOpen(null);
        }
        setShowConfirmDialog(false);
        setPendingHotelAction(null);
        toast.success('Hotel selection updated');
      } catch (error: any) {
        if (serverCommitSucceeded) {
          console.error('[HotelIntent] saved but response hydration incomplete', error);
          setShowConfirmDialog(false);
          setPendingHotelAction(null);
          toast.warning('Hotel selection was saved, but some display details were incomplete. Refreshing the itinerary will restore the authoritative view.');
          return;
        }
        console.error('[HotelIntent] selection failed; no local persistence applied', error);
        const message = String(error?.message || error?.response?.data?.message || 'The hotel selection could not be applied. No nights were changed.');
        toast.error(message);
      } finally {
        setIsUpdatingHotel(false);
        setHotelActionPhase?.('idle');
      }
      return;
    }

    return;
  };

  const saveAllHotelSelections = async () => {
    if (unsavedSelections.size === 0) {
      toast.info("No unsaved hotel selections to save");
      return true;
    }

    console.log(`💾 Saving ${unsavedSelections.size} hotel selections to database...`);
    
    const savePromises: Promise<any>[] = [];
    
    unsavedSelections.forEach((room, selectionKey) => {
      const resolvedPlanId = toNumber((room as any).itineraryPlanId ?? (room as any).itinerary_plan_id ?? planId, 0);
      const resolvedRouteId = toNumber((room as any).itineraryRouteId ?? (room as any).itinerary_route_id ?? (room as any).routeId, 0) || getExpandedRouteId();
      const resolvedHotelId = toNumber((room as any).hotelId ?? (room as any).hotel_id ?? (room as any).id, 0);

      if (!resolvedPlanId || !resolvedRouteId || !hasSelectableHotelIdentity({ ...room, hotelId: resolvedHotelId })) {
        console.error('❌ Skipping invalid hotel selection payload:', { selectionKey, room });
        return;
      }
      
      const provider = String((room as any).provider || '').trim().toLowerCase();
      const rateOptionId = String((room as any).rateOptionId || (room as any).optionKey || '').trim();
      const promise = hotelService.selectHotelIntent({
        planId: resolvedPlanId,
        routeId: resolvedRouteId,
        groupType: Number(room.groupType ?? activeGroupType ?? 1),
        selectionIntent: rateOptionId ? 'RATE_OPTION' : 'HOTEL',
        provider,
        hotelCode: String((room as any).hotelCode || (room as any).providerHotelCode || resolvedHotelId || '').trim(),
        canonicalHotelId: resolvedHotelId || undefined,
        hotelId: resolvedHotelId || undefined,
        roomType: String((room as any).roomTypeName || (room as any).roomType || '').trim() || undefined,
        mealPlanCode: String((room as any).mealPlanCode || (room as any).mealPlan || '').trim() || undefined,
        rateOptionId: rateOptionId || undefined,
        optionKey: String((room as any).optionKey || '').trim() || undefined,
        routeDate: String((room as any).date || (room as any).checkInDate || '').slice(0, 10) || undefined,
        tboRoomNightBreakdown: Array.isArray((room as any).tboRoomNightBreakdown)
          ? (room as any).tboRoomNightBreakdown
          : undefined,
      });
      
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
  return {
    handleRowClick,
    openConfirmDialogForAction,
    handleChooseOrUpdateHotel,
    getCheckedHotelCardQuote,
    handleConfirmHotelSelection,
    handleCancelHotelAction,
    saveAllHotelSelections,
  };
}
