/* eslint-disable @typescript-eslint/no-explicit-any */
import React from "react";
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
  normalizeHotelDisplayName,
  normalizeManualHotelSelection,
  applyAuthoritativeRefreshedRateIdentity,
  buildAuthoritativeSelectedHotelRow,
  getMissingAuthoritativeSelectionFields,
  resolveTargetGroupType,
} from "./hotelList.utils";
import type { HotelIntentPreviewResponse, StayExtensionPreviewResponse } from "@/services/itinerary";

type HotelListActionsContext = Record<string, any>;

type HotelSelectionActionOptions = {
  /** Automatically commit after the existing validation/preview path. */
  autoConfirm?: boolean;
  /** Keep a meal-plan change scoped to the clicked day, never an extension. */
  singleNightOnly?: boolean;
  /** Header room/meal edits already have a current supplier option; avoid a second refresh. */
  skipSelectedHotelRefresh?: boolean;
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
  /** Close the row editor only after the server-confirmed selection is applied. */
  onSelectionApplied?: () => void;
};

export function useHotelListActions(context: HotelListActionsContext) {
  const {
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
    userSelectedByGroup,
    planId,
    roomCount,
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
    isSameHotelIdentity,
    setSelectedRoomTypeByHotel,
    setSelectedByGroup,
    setUserSelectedByGroup,
    setLocalHotels,
    setCommittedHotelSelectionState,
    setIsUpdatingHotel,
    isUpdatingHotel,
    onHotelSelectionsChange,
    onTemporarySelectionCostPreview,
    onRefreshSelectedHotel,
    pendingHotelAction,
    stayRoutes = [],
  } = context;

  const hotelService = ItineraryServiceFromContext || ItineraryService;
  const autoConfirmActionRef = React.useRef(false);

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

    const uniqueHotels = mergeHotelOptions(
      getHotelsForStay(
        localHotels,
        Number(itineraryRouteId || 0),
        itineraryStayDate,
        // The row-header picker is a route/date inventory picker, not a
        // recommendation-group picker. Group 4 hotels must be searchable
        // when the user is editing the row while Group 1 is active.
        0,
        planId,
        roomCount,
      ),
      getHotelsForStay(
        localRestrictedHotels,
        Number(itineraryRouteId || 0),
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
    options: Pick<HotelSelectionActionOptions, "autoConfirm" | "skipCostPreview" | "keepExpanded"> & {
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
      keepExpandedRowKey: options.keepExpanded ? expandedRowKey : null,
      manualRoomMealMismatchWarning,
      onSelectionApplied: options.onSelectionApplied,
    });
    setShowConfirmDialog(!options.autoConfirm);
  };

  // ---------- HANDLER: CHOOSE/UPDATE HOTEL ----------
  const handleChooseOrUpdateHotel = async (
    room: HotelRoomDetail,
    options: HotelSelectionActionOptions = {},
  ) => {
    console.log('🏨 Choose button clicked', room);
    
    // ✅ BLOCK hotel selection when in read-only mode (confirmed itinerary)
    if (readOnly || isUpdatingHotel) {
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
    const serverIntent = options.selectionIntent || 'RATE_OPTION';
    if (serverIntent) {
      setIsUpdatingHotel(true);
      try {
        const hotelIntentIdentity = getHotelIntentIdentity(normalizedRoom as Record<string, unknown>);
        const previewPayload = {
          planId: resolvedPlanId,
          routeId: resolvedRouteId,
          groupType: targetGroupType,
          selectionIntent: serverIntent,
          provider: String((normalizedRoom as any).provider || '').trim().toLowerCase(),
          // Explicit supplier identity is authoritative; hotelCode remains a
          // legacy compatibility field only.
          ...hotelIntentIdentity,
          hotelName: String((normalizedRoom as any).hotelName || '').trim() || undefined,
          roomType: (serverIntent === 'ROOM_TYPE' || serverIntent === 'MEAL_PLAN')
            ? String((normalizedRoom as any).roomTypeName || (normalizedRoom as any).roomType || '').trim() || undefined
            : undefined,
          mealPlanCode: serverIntent === 'MEAL_PLAN'
            ? String((normalizedRoom as any).mealPlanCode || (normalizedRoom as any).mealPlan || '').trim() || undefined
            : undefined,
          rateOptionId: serverIntent === 'RATE_OPTION'
            ? String((normalizedRoom as any).rateOptionId || '').trim() || undefined
            : undefined,
          optionKey: serverIntent === 'RATE_OPTION'
            ? String((normalizedRoom as any).optionKey || '').trim() || undefined
            : undefined,
          selectionKey: serverIntent === 'RATE_OPTION'
            ? String((normalizedRoom as any).selectionKey || '').trim() || undefined
            : undefined,
          routeDate: String((normalizedRoom as any).date || (normalizedRoom as any).checkInDate || '').slice(0, 10) || undefined,
        };
        const preview: HotelIntentPreviewResponse = await hotelService.previewHotelIntent(previewPayload as any);
        if (preview.status !== 'AVAILABLE') {
          toast.error(
            preview.status === 'REFRESH_FAILED'
              ? 'Hotel availability could not be checked right now. Please try again.'
              : 'The selected hotel is not available for the requested stay.',
          );
          return;
        }
        const previewSelections = Array.isArray(preview.selections) ? preview.selections : [];
        const authoritative = previewSelections.find((selection: any) =>
          toNumber(selection?.routeId, 0) === resolvedRouteId,
        ) || previewSelections[0];
        const authoritativeFields = ['provider', 'hotelCode', 'hotelName', 'roomType', 'mealPlan', 'selectedRateOptionId', 'pricePerNight', 'totalPrice'];
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
        const authoritativeRoom = {
          ...normalizedRoom,
          ...authoritative,
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
        setPendingHotelAction({
          room: authoritativeRoom,
          isReplacing: serverIntent === 'HOTEL',
          isRateUpdate: serverIntent !== 'HOTEL',
          previousSelection: currentRow ? ({ ...currentRow } as Record<string, unknown>) : null,
          previousHotelName: String(currentRow?.hotelName || '').trim(),
          newHotelName: String((authoritative as any).hotelName || normalizedRoom.hotelName || '').trim(),
          routeDate: String((authoritative as any).routeDate || currentRow?.day || normalizedRoom.date || normalizedRoom.checkInDate || '').trim(),
          groupType: targetGroupType,
          selectionIntent: serverIntent,
          onSelectionApplied: options.onSelectionApplied,
          keepExpanded: options.keepExpanded,
          keepExpandedRowKey: expandedRowKey,
        });
        setShowConfirmDialog(true);
      } catch (previewError: any) {
        console.error('[HotelList] hotel intent preview failed; confirmation blocked', previewError);
        toast.error(String(previewError?.message || 'Hotel availability could not be checked right now. Please try again.'));
      } finally {
        setIsUpdatingHotel(false);
      }
      return;
    }

    // Card-level selection must use the same live provider-scoped refresh as
    // the day-header editor before the cost preview validates the rate.
    const selectedProvider = String((normalizedRoom as any).provider || '').trim().toLowerCase();
    const selectedHotelCode = String(
      (normalizedRoom as any).providerHotelCode ||
      (normalizedRoom as any).hotelCode ||
      (normalizedRoom as any).hotelId ||
      '',
    ).trim();
    if (
      !options.singleNightOnly
      && !options.skipSelectedHotelRefresh
      && onRefreshSelectedHotel
      && resolvedRouteId > 0
      && selectedProvider
      && selectedHotelCode
    ) {
      try {
        const refreshed = await onRefreshSelectedHotel({
          routeId: resolvedRouteId,
          provider: selectedProvider,
          hotelCode: selectedHotelCode,
          groupType: targetGroupType,
        });
        const refreshedHotels = Array.isArray(refreshed?.hotels)
          ? refreshed.hotels as HotelRoomDetail[]
          : [];
        if (refreshedHotels.length === 0) {
          toast.error(`No current rates are available for ${normalizeHotelDisplayName(normalizedRoom.hotelName)}.`);
          return;
        }
        const roomType = String((normalizedRoom as any).roomTypeName || (normalizedRoom as any).roomType || '').trim().toLowerCase();
        const mealPlan = String((normalizedRoom as any).mealPlan || '').trim().toLowerCase();
        // The refresh response can contain every rate for the route. Match
        // the clicked property first; otherwise a different property with
        // the same room/meal labels can replace the user's choice.
        const refreshedMatch = refreshedHotels.find((candidate) =>
          isSameHotelIdentity(candidate, normalizedRoom) &&
          (!roomType || String((candidate as any).roomTypeName || (candidate as any).roomType || '').trim().toLowerCase() === roomType) &&
          (!mealPlan || String((candidate as any).mealPlan || '').trim().toLowerCase() === mealPlan),
        ) || refreshedHotels.find((candidate) => isSameHotelIdentity(candidate, normalizedRoom)) || refreshedHotels[0];
        normalizedRoom = {
          ...applyAuthoritativeRefreshedRateIdentity(
            normalizedRoom as Record<string, unknown>,
            refreshedMatch as Record<string, unknown>,
          ),
          itineraryPlanId: resolvedPlanId,
          itineraryRouteId: resolvedRouteId,
          hotelId: toNumber((refreshedMatch as any).hotelId ?? resolvedHotelId, resolvedHotelId),
          groupType: targetGroupType,
        };
      } catch (refreshError) {
        console.error('[HotelList] selected hotel refresh failed', refreshError);
        toast.error(`Could not refresh ${normalizeHotelDisplayName(normalizedRoom.hotelName)} rates.`);
        return;
      }
    }

    const restriction = resolveHotelRestriction(
      normalizedRoom,
      targetGroupType,
    );
    if (restriction.blocked) {
      toast.error(restriction.reason);
      return;
    }

    const roomHotelId = Number(normalizedRoom.hotelId);
    const roomRouteId = Number(normalizedRoom.itineraryRouteId);
    const groupType = targetGroupType;
    const requestedStayDate = normalizeDateOnly(
      (normalizedRoom as any).date || (normalizedRoom as any).checkInDate,
    );
    const sameRouteRows = (currentHotelRows || []).filter((candidate: any) => {
      const candidateRouteId = toNumber(candidate?.itineraryRouteId || candidate?.routeId, 0);
      if (candidateRouteId !== roomRouteId || candidate?.previousDayBillingSynthetic) return false;
      if (!requestedStayDate) return true;
      return normalizeDateOnly(candidate?.date || candidate?.checkInDate) === requestedStayDate;
    });
    const currentTableRow = sameRouteRows[0] || (currentHotelRows || []).find((candidate: any) =>
      toNumber(candidate?.itineraryRouteId || candidate?.routeId, 0) === roomRouteId &&
      !candidate?.previousDayBillingSynthetic,
    );
    // Prefer the canonical route/date key. Persisted rows may carry a legacy
    // stayKey from an earlier availability snapshot, while the selection maps
    // and the table are reconciled by the current route/date identity.
    const canonicalStayKey = getStayKey({
      itineraryRouteId: roomRouteId,
      date: requestedStayDate || String((normalizedRoom as any).date || (normalizedRoom as any).checkInDate || '').trim(),
    } as any);
    const currentStayKeys = Array.from(new Set([
      canonicalStayKey,
      currentTableRow ? getStayKey(currentTableRow) : '',
    ].filter(Boolean)));
    const findSelectionForCurrentStay = (selections?: Record<string, any>) =>
      currentStayKeys.map((stayKey) => selections?.[stayKey]).find(Boolean);
    // Resolve the exact logical stay first. The selected maps are keyed by
    // route + date and are what the table uses for its displayed row. A raw
    // route row can still be an auto-selected/stale inventory row, so using it
    // before the exact selected map makes the dialog compare the new card with
    // itself and makes room/rate changes look like a no-op.
    const confirmedSelection =
      findSelectionForCurrentStay(selectedByGroup?.[groupType]) ||
      findSelectionForCurrentStay(userSelectedByGroup?.[groupType]) ||
      (currentTableRow && hasSelectableHotelIdentity(currentTableRow) ? currentTableRow : undefined);
    const isRateUpdate = Boolean(
      confirmedSelection &&
      isSameHotelIdentity(confirmedSelection, normalizedRoom) &&
      getHotelOptionKey(confirmedSelection) !== getHotelOptionKey(normalizedRoom),
    );
    const currentHotel = confirmedSelection || currentTableRow || localHotels.find(
      (hotel) =>
        toNumber(hotel.itineraryRouteId || (hotel as any).routeId, 0) === roomRouteId &&
        !hotel.previousDayBillingSynthetic,
    );
    const isReplacing = !isRateUpdate && Boolean(currentHotel?.hotelId) && Number(currentHotel.hotelId) !== roomHotelId;
    const routeDate = currentHotel?.day || "";

    const pendingActionBase = {
      room: normalizedRoom,
      isReplacing,
      previousHotelName: currentHotel?.hotelName || "",
      newHotelName: normalizedRoom.hotelName || "",
      routeDate,
      groupType,
      isRateUpdate,
      previousSelection: confirmedSelection ? ({ ...confirmedSelection } as Record<string, unknown>) : null,
    };

    const provider = String((normalizedRoom as any).provider || "").trim().toLowerCase();

    // STAAH/AxisRooms have supplier restriction tables and are validated by
    // the backend preview endpoint. Other live suppliers (notably TBO) do
    // not have that restriction API, but the availability snapshot still
    // contains route-scoped inventory. Use it to restore the same-day versus
    // continuous-stay choice whenever the same property/rate is present on a
    // consecutive night.
    if (!options.singleNightOnly) {
      let preview: any = null;
      {
      try {
        preview = await hotelService.previewHotelStayExtension(planId, {
          routeId: resolvedRouteId,
          provider: provider as "staah" | "axisrooms" | "tbo" | "offline",
          hotelCode: String((normalizedRoom as any).hotelCode || resolvedHotelId || "").trim(),
          hotelName: String((normalizedRoom as any).hotelName || "").trim() || undefined,
          roomId: String((normalizedRoom as any).roomId || "").trim() || undefined,
          rateId: String((normalizedRoom as any).rateId || "").trim() || undefined,
          roomType: String((normalizedRoom as any).roomTypeName || (normalizedRoom as any).roomType || "").trim() || undefined,
          mealPlan: String((normalizedRoom as any).mealPlan || "").trim() || undefined,
          checkInDate: String((normalizedRoom as any).checkInDate || (normalizedRoom as any).date || "").trim(),
          groupType,
        });

      } catch (previewError) {
        console.error("[HotelList] stay-extension-preview failed; selection blocked", previewError);
        toast.error("Could not verify hotel availability. The hotel was not selected. Please retry.");
        return;
      }
      }

      if (preview?.nights > 1) {
          // The supplier stay-extension tables can report a continuous stay
          // even when the latest persisted availability snapshot contains a
          // rate for only one of those nights. Do not offer a multi-night
          // booking that /hotels/select will necessarily reject.
          const snapshotSelection = buildSelectionUpdates(
            normalizedRoom,
            groupType,
            resolvedHotelId,
            preview,
          );
          let snapshotSelectionUpdates: Record<number, HotelSelectionUpdate | null> | false = false;
          try {
            snapshotSelectionUpdates = await refreshSelectionUpdatesFromSnapshot(
              resolvedPlanId,
              groupType,
              snapshotSelection,
            );
          } catch (snapshotError) {
            console.warn('[HotelList] latest availability snapshot cannot price the full stay', snapshotError);
          }

          let supplierPreview = preview;
          const reconciledSelection = !snapshotSelectionUpdates
            ? null
            : Object.values(snapshotSelectionUpdates).find((selection): selection is HotelSelectionUpdate => Boolean(selection));
          if (reconciledSelection) {
            try {
              supplierPreview = await validateMultiNightSelectionAgainstSupplier(
                resolvedPlanId,
                reconciledSelection,
                groupType,
              ) || preview;
            } catch (supplierError) {
              console.warn('[HotelList] reconciled supplier continuity check failed', supplierError);
              supplierPreview = {
                ...preview,
                canBookMultiNight: false,
                blocked: true,
                restrictionConflicts: [
                  ...(preview.restrictionConflicts || []),
                  {
                    type: 'UNKNOWN',
                    message: 'The supplier could not confirm continuous availability for all dates. Choose only this day or refresh availability.',
                  },
                ],
              };
            }
          }

          const canBookFromLatestSnapshot = Boolean(snapshotSelectionUpdates);
          const modalPreview = canBookFromLatestSnapshot && supplierPreview.canBookMultiNight && !supplierPreview.blocked
            ? supplierPreview
            : {
                ...supplierPreview,
                canBookMultiNight: false,
                blocked: true,
                restrictionConflicts: [
                  ...(supplierPreview.restrictionConflicts || []),
                  ...(!canBookFromLatestSnapshot
                    ? [{
                        type: 'LATEST_SNAPSHOT_MISSING_NIGHT',
                        message: 'This hotel is not available for every night in the latest availability. Choose only this day or refresh availability.',
                      }]
                    : []),
                ],
              };
          // Always surface cross-date restrictions in the modal. A toast is
          // easy to miss and does not explain whether the selected night or
          // one of the continuous follow-on nights is blocked.
          setStayExtensionModalState({
            preview: modalPreview,
            action: pendingActionBase,
          });
          return;
        }

      if (preview && !preview.canBookSingleNight) {
        const message =
          preview.restrictionConflicts?.map((conflict: any) => conflict.message).join(" | ")
          || "Hotel cannot be booked on the selected day.";
        toast.error(message);
        return;
      }
    }

    if (isRateUpdate) {
      openConfirmDialogForAction(pendingActionBase, options);
      return;
    }

    openConfirmDialogForAction(pendingActionBase, options);
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
      setIsUpdatingHotel(true);
      let serverCommitSucceeded = false;
      try {
        const intent = confirmedSelectionIntent;
        const hotelIntentIdentity = getHotelIntentIdentity(normalizedRoom as Record<string, unknown>);
        const payload: Record<string, unknown> = {
          planId: resolvedPlanId,
          routeId: resolvedRouteId,
          groupType: targetGroupType,
          selectionIntent: intent,
          provider: String((normalizedRoom as any).provider || '').trim().toLowerCase(),
          ...hotelIntentIdentity,
          routeDate: String((normalizedRoom as any).date || (normalizedRoom as any).checkInDate || '').slice(0, 10) || undefined,
        };
        if (intent === 'ROOM_TYPE' || intent === 'MEAL_PLAN') {
          payload.roomType = String((normalizedRoom as any).roomTypeName || (normalizedRoom as any).roomType || '').trim() || undefined;
        }
        if (intent === 'MEAL_PLAN') {
          payload.mealPlanCode = String((normalizedRoom as any).mealPlanCode || (normalizedRoom as any).mealPlan || '').trim() || undefined;
        }
        if (intent === 'RATE_OPTION') {
          payload.rateOptionId = String((normalizedRoom as any).rateOptionId || '').trim() || undefined;
          payload.optionKey = String((normalizedRoom as any).optionKey || '').trim() || undefined;
          payload.selectionKey = String((normalizedRoom as any).selectionKey || '').trim() || undefined;
        }

        const result: any = await hotelService.selectHotelIntent(payload as any);
        serverCommitSucceeded = result?.success === true;
        const returnedSelections = Array.isArray(result?.selections) ? result.selections : [];
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
          const totalPrice = Number(selection.totalPrice ?? selection.pricePerNight ?? 0);
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
            totalHotelCost: totalPrice,
            baseHotelCost: Number(selection.baseTotalPrice ?? selection.basePricePerNight ?? 0),
            totalRoomCost: Number(selection.baseTotalPrice ?? selection.basePricePerNight ?? 0),
            hotelMarginPercentage: Number(selection.hotelMarginPercentage ?? 0),
            hotelMarginAmount: Number(selection.hotelMarginTotalAmount ?? selection.hotelMarginAmount ?? 0),
            totalAmount: totalPrice,
            totalAmountAfterTax: totalPrice,
            pricePerNight: Number(selection.pricePerNight ?? totalPrice),
            selectedRateOptionId: selection.selectedRateOptionId || selection.rateOptionId,
          };
          stateRows.push(row);
          updates[selectionRouteId] = {
            provider: String(selection.provider).trim().toLowerCase(),
            hotelCode,
            bookingCode: String(selection.bookingCode || '').trim(),
            roomType,
            netAmount: totalPrice,
            hotelName: String(selection.hotelName).trim(),
            checkInDate: routeDate,
            checkOutDate: String(selection.checkOutDate || '').trim(),
            groupType: targetGroupType,
            mealPlan,
            rateOptionId: String(selection.selectedRateOptionId || selection.rateOptionId || '').trim(),
            searchReference: String(selection.searchReference || row.searchReference || '').trim() || undefined,
            roomId: selection.roomId,
            rateId: selection.rateId,
            totalPrice,
            pricePerNight: Number(selection.pricePerNight ?? totalPrice),
            totalAmountAfterTax: totalPrice,
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
        onHotelSelectionsChange?.(updates);
        try {
          // Confirmation changes committed package state. Re-read the
          // database-only details contract so rows, statuses, and totals come
          // from the same backend view-state builder; do not reconstruct a
          // package total from the returned route subset in React.
          const committedDetails: any = await hotelService.getPersistedHotelDetails(quoteId);
          if (Array.isArray(committedDetails?.hotels)) {
            setLocalHotels(committedDetails.hotels);
          }
          if (Array.isArray(committedDetails?.hotelSelectionState)) {
            setCommittedHotelSelectionState(committedDetails.hotelSelectionState);
          } else {
            console.warn('[HotelIntent] persisted details response omitted hotelSelectionState');
          }
        } catch (refreshError) {
          console.warn('[HotelIntent] saved selection could not refresh committed hotel view state', refreshError);
        }
        pendingHotelAction.onSelectionApplied?.();
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
    handleConfirmHotelSelection,
    handleCancelHotelAction,
    saveAllHotelSelections,
  };
}
