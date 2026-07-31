/* eslint-disable @typescript-eslint/no-explicit-any */
import React from "react";
import { ItineraryService } from "@/services/itinerary";
import type { ItineraryHotelRow } from "../ItineraryDetails";
import type {
  HotelRoomDetail,
  HotelSelectionUpdate,
  PendingHotelAction,
} from "./hotelList.types";
import type { StayExtensionPreviewResponse } from "@/services/itinerary";

type HotelListActionsContext = Record<string, any>;

type SyncConfirmationRequest = {
  routeId: number;
  selectionCount: number;
  resolve: (confirmed: boolean) => void;
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
    userSelectedByStay,
    planId,
    roomCount,
    toast,
    formatCurrency,
    quoteId,
    unsavedSelections,
    setUnsavedSelections,
    setIsSyncing,
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
    setUserSelectedByStay,
    setIsUpdatingHotel,
    isUpdatingHotel,
    onHotelSelectionsChange,
    onTemporarySelectionCostPreview,
    pendingHotelAction,
  } = context;

  const hotelService = ItineraryServiceFromContext || ItineraryService;
  const [syncConfirmationRequest, setSyncConfirmationRequest] = React.useState<SyncConfirmationRequest | null>(null);

  const requestSyncConfirmation = (routeId: number, selectionCount: number): Promise<boolean> =>
    new Promise((resolve) => {
      setSyncConfirmationRequest({ routeId, selectionCount, resolve });
    });

  const resolveSyncConfirmation = (confirmed: boolean) => {
    const request = syncConfirmationRequest;
    setSyncConfirmationRequest(null);
    request?.resolve(confirmed);
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
        toNumber(activeGroupType, 0),
        planId,
        roomCount,
      ),
      getHotelsForStay(
        localRestrictedHotels,
        Number(itineraryRouteId || 0),
        itineraryStayDate,
        toNumber(activeGroupType, 0),
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
    
    // ✅ BLOCK sync when in read-only mode (confirmed itinerary)
    if (readOnly) {
      console.log('⛔ [HotelList] Blocked handleSyncRoute - read-only mode');
      return;
    }

    toast.info('Hotel rows are loaded from the saved snapshot. Use Check Availability to contact suppliers.');
    return;

    // Check for unsaved changes with the application dialog rather than a
    // browser-native confirm so the message and actions stay in our UI.
    const routeUnsavedSelectionCount = Array.from(unsavedSelections.keys())
      .filter((key) => String(key).startsWith(`${routeId}-`))
      .length;
    if (routeUnsavedSelectionCount > 0) {
      const confirmed = await requestSyncConfirmation(routeId, routeUnsavedSelectionCount);
      if (!confirmed) return;
      
      // Clear unsaved selections for this route
      setUnsavedSelections(prev => {
        const newMap = new Map(prev);
        // Remove selections for this specific route
        Array.from(newMap.keys()).forEach(key => {
          if (String(key).startsWith(`${routeId}-`)) {
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
      const response = await hotelService.getHotelRoomDetails(quoteId, routeId, true);
      
      // ✅ API returns 'rooms' property, not 'roomDetails'
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
        const expandedHotel = currentExpandedKey
          ? currentHotelRows.find((hotel) => getStayKey(hotel) === currentExpandedKey)
          : currentHotelRows.find((hotel) => toNumber(hotel.itineraryRouteId, 0) === Number(routeId));
        const stayKey = expandedHotel ? getStayKey(expandedHotel) : currentExpandedKey || "";
        const groupType = toNumber(expandedHotel?.groupType ?? activeGroupType, 1);
        const hotelsForTier = uniqueRooms.filter((room: any) => Number(room.groupType || 1) === groupType);
        const selectedBeforeSync =
          (stayKey && userSelectedByStay?.[stayKey]) ||
          (stayKey && selectedByGroup?.[groupType]?.[stayKey]) ||
          expandedHotel;
        const freshSelection =
          hotelsForTier.find((room: any) => selectedBeforeSync && isSameHotelIdentity(room, selectedBeforeSync)) ||
          [...hotelsForTier].sort((a: any, b: any) => getHotelDisplayAmount(a) - getHotelDisplayAmount(b))[0] ||
          uniqueRooms[0];

        if (freshSelection && hasSelectableHotelIdentity(freshSelection)) {
          const freshHotelId = toNumber(
            (freshSelection as any).canonicalHotelId ??
              (freshSelection as any).hotelId ??
              (freshSelection as any).hotelCode,
            0,
          );
          const freshRoomTypeId = toNumber(
            (freshSelection as any).roomTypeId ??
              (freshSelection as any).availableRoomTypes?.[0]?.roomTypeId,
            1,
          );
          const provider = String((freshSelection as any).provider || "").trim().toLowerCase();
          const rateOptionId = String((freshSelection as any).rateOptionId || "").trim();
          const mealPlanText = String((freshSelection as any).mealPlan || "").trim().toLowerCase();

          // Sync is the explicit persistence boundary. Include the offline
          // rate identity so the API records MANUAL_APPROVAL instead of a
          // live-provider selection.
          await hotelService.selectHotel(
            toNumber((freshSelection as any).itineraryPlanId ?? planId, planId),
            Number(routeId),
            freshHotelId,
            freshRoomTypeId,
            {
              all: false,
              breakfast: /breakfast|continental|\bcp\b/.test(mealPlanText),
              lunch: /lunch|modified american|\bmap\b/.test(mealPlanText),
              dinner: /dinner|modified american|\bmap\b/.test(mealPlanText),
            },
            groupType,
            {
              canonicalHotelId: toNumber((freshSelection as any).canonicalHotelId ?? freshHotelId, freshHotelId),
              rateOptionId: rateOptionId || undefined,
              provider: provider || undefined,
              roomId: (freshSelection as any).roomId,
              roomCount,
            },
          );

          if (expandedHotel && stayKey) {
            const syncedRow = {
              ...expandedHotel,
              ...freshSelection,
              itineraryPlanId: planId,
              itineraryRouteId: Number(routeId),
              routeId: Number(routeId),
              groupType,
              hotelId: freshHotelId,
              hotelCode: String((freshSelection as any).hotelCode || freshHotelId),
              provider: provider || expandedHotel.provider,
              roomType: String((freshSelection as any).roomTypeName || (freshSelection as any).roomType || expandedHotel.roomType || ""),
              mealPlan: String((freshSelection as any).mealPlan || expandedHotel.mealPlan || ""),
              totalHotelCost: getHotelDisplayAmount(freshSelection),
              totalAmount: getHotelDisplayAmount(freshSelection),
            } as ItineraryHotelRow;

            setSelectedByGroup((previous) => ({
              ...previous,
              [groupType]: {
                ...previous[groupType],
                [stayKey]: syncedRow,
              },
            }));
            setUserSelectedByStay((previous) => ({
              ...previous,
              [stayKey]: syncedRow,
            }));
          }
        }

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
          if (expandedHotel) {
            const expandedHotelsForTier = uniqueRooms.filter((r: any) => Number(r.groupType || 1) === groupType);
            setRoomDetails(expandedHotelsForTier);
          }
          setExpandedRowKey(currentExpandedKey);
        }
        
        toast.success(`Hotels refreshed and selection saved (${uniqueRooms.length} options found)`);
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

  const openConfirmDialogForAction = (action: Omit<PendingHotelAction, "multiNightPreview">) => {
    const groupType = toNumber(action.groupType ?? activeGroupType, 1);
    const manualRoomMealMismatchWarning = findManualRoomMealMismatchWarning(
      action.room,
      groupType,
    );

    setPendingHotelAction({
      ...action,
      multiNightPreview: null,
      manualRoomMealMismatchWarning,
    });
    setShowConfirmDialog(true);
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

  const buildSelectionUpdates = (
    normalizedRoom: HotelRoomDetail,
    groupType: number,
    resolvedHotelId: number,
    multiNightPreview?: StayExtensionPreviewResponse | null,
    existingSelection?: Record<string, unknown> | null,
  ): Record<number, HotelSelectionUpdate | null> => {
    const provider = String((normalizedRoom as any).provider || 'tbo')
      .trim()
      .toLowerCase();

    const hotelCode = String(
      (normalizedRoom as any).hotelCode ||
        (normalizedRoom as any).providerHotelCode ||
        (normalizedRoom as any).provider_hotel_code ||
        (normalizedRoom as any).hotel_code ||
        (normalizedRoom as any).hotelId ||
        resolvedHotelId ||
        '',
    ).trim();

    const bookingCode = String(
      (normalizedRoom as any).bookingCode ||
        (normalizedRoom as any).searchReference ||
        '',
    ).trim();

    const roomType = String(
      (normalizedRoom as any).roomTypeName ||
        (normalizedRoom as any).roomType ||
        'Standard',
    ).trim();

    const getNextDateOnly = (date: string): string => {
      const raw = String(date || '').trim();
      if (!raw) return '';

      const parsed = new Date(`${raw}T00:00:00.000Z`);
      if (Number.isNaN(parsed.getTime())) return '';

      parsed.setUTCDate(parsed.getUTCDate() + 1);
      return parsed.toISOString().slice(0, 10);
    };

    const fallbackRouteId = toNumber(
      (normalizedRoom as any).itineraryRouteId ||
        (normalizedRoom as any).routeId,
      0,
    );

    const fallbackCheckInDate = String(
      (normalizedRoom as any).checkInDate ||
        (normalizedRoom as any).date ||
        '',
    ).trim();

    const fallbackCheckOutDate =
      String((normalizedRoom as any).checkOutDate || '').trim() ||
      getNextDateOnly(fallbackCheckInDate);

    const previousStay = existingSelection as any;
    const previousRouteIds = Array.isArray(previousStay?.routeIds)
      ? previousStay.routeIds.map(Number).filter((id: number) => Number.isFinite(id) && id > 0)
      : [];
    const effectivePreviewRouteIds =
      Array.isArray(multiNightPreview?.routeIds) && multiNightPreview.routeIds.length > 1
        ? multiNightPreview.routeIds.map(Number).filter((id) => Number.isFinite(id) && id > 0)
        : previousRouteIds.length > 1
        ? previousRouteIds
        : [];
    const effectiveCheckInDate = String(
      multiNightPreview?.checkInDate ||
      (previousRouteIds.length > 1 ? previousStay?.checkInDate : '') ||
      fallbackCheckInDate,
    ).trim();
    const effectiveCheckOutDate = String(
      multiNightPreview?.checkOutDate ||
      (previousRouteIds.length > 1 ? previousStay?.checkOutDate : '') ||
      fallbackCheckOutDate,
    ).trim();
    const effectiveNightlyRates = Array.isArray(multiNightPreview?.nightlyRates)
      ? multiNightPreview.nightlyRates
      : Array.isArray((normalizedRoom as any).nightlyRates)
      ? (normalizedRoom as any).nightlyRates
      : undefined;
    const effectiveStayKey = effectivePreviewRouteIds.length > 1
      ? [provider, hotelCode, String((normalizedRoom as any).roomId || '').trim(), String((normalizedRoom as any).rateId || '').trim(), effectiveCheckInDate, effectiveCheckOutDate].join(':')
      : String((normalizedRoom as any).stayKey || '').trim() || undefined;

    const fallbackAmount = toMoneyNumber(
      (normalizedRoom as any).totalAmountAfterTax ??
        (normalizedRoom as any).totalAmount ??
        getHotelDisplayAmount(normalizedRoom),
    );

    const baseSelection: HotelSelectionUpdate = {
      provider,
      hotelCode,
      bookingCode,
      roomType,
      netAmount: fallbackAmount,
      hotelName: String((normalizedRoom as any).hotelName || '').trim(),
      checkInDate: fallbackCheckInDate,
      checkOutDate: fallbackCheckOutDate,
      groupType,
      routeId: fallbackRouteId || undefined,
      mealPlan: String((normalizedRoom as any).mealPlan || '').trim() || undefined,
      searchReference: String((normalizedRoom as any).searchReference || '').trim() || undefined,
      roomId: String((normalizedRoom as any).roomId || '').trim() || undefined,
      rateId: String((normalizedRoom as any).rateId || '').trim() || undefined,
      roomSelections: Array.isArray((normalizedRoom as any).roomSelections)
        ? (normalizedRoom as any).roomSelections
        : undefined,
      totalAmountAfterTax: fallbackAmount,
      multiNightBooking: effectivePreviewRouteIds.length > 1 || Boolean((normalizedRoom as any).multiNightBooking),
      stayKey: effectiveStayKey,
      routeIds: effectivePreviewRouteIds.length > 1 ? effectivePreviewRouteIds : undefined,
      nights: effectivePreviewRouteIds.length > 1
        ? Number(multiNightPreview?.nights || previousStay?.nights || effectivePreviewRouteIds.length)
        : Number((normalizedRoom as any).nights || 0) || undefined,
      nightlyRates: effectiveNightlyRates,
    };

    const previewRouteIds = effectivePreviewRouteIds;

    if (previewRouteIds.length > 1) {
      const parentRouteId = previewRouteIds[0];
      const nightlyRates = Array.isArray(multiNightPreview?.nightlyRates)
        ? multiNightPreview.nightlyRates
        : Array.isArray((normalizedRoom as any).nightlyRates)
        ? (normalizedRoom as any).nightlyRates
        : [];

      const totalAmountAfterTax = toMoneyNumber(
        multiNightPreview?.totalAmountAfterTax ??
          nightlyRates.reduce(
            (sum: number, night: any) =>
              sum + toMoneyNumber(night?.amountAfterTax ?? night?.baseAmount ?? 0),
            0,
          ) ??
          fallbackAmount,
      );

      const updates: Record<number, HotelSelectionUpdate | null> = {
        [parentRouteId]: {
          ...baseSelection,
          checkInDate: effectiveCheckInDate,
          checkOutDate: effectiveCheckOutDate,
          netAmount: totalAmountAfterTax,
          totalAmountAfterTax,
          multiNightBooking: true,
          stayKey: effectiveStayKey,
          routeIds: previewRouteIds,
          nights: Number(multiNightPreview?.nights || previousStay?.nights || previewRouteIds.length),
          nightlyRates: nightlyRates.length > 0 ? nightlyRates : effectiveNightlyRates,
        },
      };

      previewRouteIds.forEach((routeId) => {
        if (routeId !== parentRouteId) {
          updates[routeId] = null;
        }
      });

      return updates;
    }

    if (!fallbackRouteId) {
      return {};
    }

    return {
      [fallbackRouteId]: baseSelection,
    };
  };

  // A card selection is the user's explicit choice. Persist the complete
  // provider/rate identity here so a page reload cannot restore an older
  // offline selection from the database.
  const persistHotelSelections = async (
    room: HotelRoomDetail,
    routeIds: number[],
    groupType: number,
    selectionUpdates: Record<number, HotelSelectionUpdate | null>,
  ) => {
    const resolvedPlanId = toNumber((room as any).itineraryPlanId ?? (room as any).itinerary_plan_id ?? planId, 0);
    const canonicalHotelId = toNumber(
      (room as any).canonicalHotelId ?? (room as any).canonical_hotel_id ?? (room as any).hotelId,
      0,
    );
    const roomTypeId = toNumber(
      (room as any).roomTypeId ?? (room as any).availableRoomTypes?.[0]?.roomTypeId,
      1,
    );
    const provider = String((room as any).provider || '').trim().toLowerCase();
    const hotelCode = String(
      (room as any).hotelCode ??
        (room as any).providerHotelCode ??
        (room as any).hotel_code ??
        (room as any).hotelId ??
        '',
    ).trim();
    const mealPlanText = String((room as any).mealPlan || '').trim().toLowerCase();
    const mealPlan = {
      all: false,
      breakfast: /breakfast|continental|\bcp\b/.test(mealPlanText),
      lunch: /lunch|modified american|\bmap\b/.test(mealPlanText),
      dinner: /dinner|modified american|\bmap\b/.test(mealPlanText),
    };
    const rateOptionId = String(
      (room as any).rateOptionId ||
        (room as any).optionKey ||
        (room as any).searchReference ||
        (room as any).bookingCode ||
        '',
    ).trim();
    const pricePerNight = toMoneyNumber(
      (room as any).pricePerNight ??
        (room as any).perNightAmount ??
        (room as any).totalHotelCost ??
        (room as any).totalAmountAfterTax ??
        (room as any).totalAmount ??
        0,
    );

    // Some live supplier properties (especially TBO) do not have a mapped
    // dvi_hotel row yet. They are still selectable when the latest snapshot
    // provides a supplier property/rate identity. Do not block the save
    // before the persistence API gets a chance to validate that identity.
    const hasSupplierRateIdentity = Boolean(
      provider &&
      provider !== 'offline' &&
      (hotelCode || rateOptionId || String((room as any).optionKey || '').trim() ||
        String((room as any).searchReference || '').trim() ||
        String((room as any).bookingCode || '').trim()),
    );
    const persistedCanonicalHotelId = canonicalHotelId > 0 ? canonicalHotelId : null;

    if (!resolvedPlanId || !provider || !routeIds.length || (!canonicalHotelId && !hasSupplierRateIdentity)) {
      throw new Error('Hotel selection is missing its canonical provider identity');
    }

    await Promise.all(routeIds.map((routeId) => {
      const update = selectionUpdates[routeId] || selectionUpdates[routeIds[0]] || null;
      const totalPrice = toMoneyNumber(
        update?.totalAmountAfterTax ??
          update?.netAmount ??
          (room as any).totalStayPrice ??
          (room as any).totalPrice ??
          (room as any).totalAmountAfterTax ??
          (room as any).totalAmount ??
          pricePerNight,
      );

      return hotelService.selectHotel(
        resolvedPlanId,
        Number(routeId),
        persistedCanonicalHotelId,
        roomTypeId,
        mealPlan,
        groupType,
        {
          canonicalHotelId: persistedCanonicalHotelId,
          hotelCode: hotelCode || undefined,
          rateOptionId: rateOptionId || undefined,
          provider,
          optionKey: String((room as any).optionKey || rateOptionId || '').trim() || undefined,
          pricePerNight,
          totalPrice,
          currency: String((room as any).currency || 'INR').trim() || 'INR',
          hotelName: String((room as any).hotelName || '').trim() || undefined,
          category: toNumber((room as any).hotelCategory ?? (room as any).category, 0) || undefined,
          mealPlanCode: String((room as any).mealPlan || '').trim() || undefined,
          bookingCode: String((room as any).bookingCode || '').trim() || undefined,
          searchReference: String((room as any).searchReference || '').trim() || undefined,
          roomId: (room as any).roomId,
          rateId: (room as any).rateId,
          roomCount,
          roomType: String((room as any).roomTypeName || (room as any).roomType || '').trim() || undefined,
        },
      );
    }));
  };

  // ---------- HANDLER: CHOOSE/UPDATE HOTEL ----------
  const handleChooseOrUpdateHotel = async (room: HotelRoomDetail) => {
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
    const groupType = toNumber((normalizedRoom as any).groupType ?? activeGroupType, 1);
    const confirmedSelection = Object.values(selectedByGroup?.[groupType] || {}).find((selection: any) => {
      const selectionRouteId = toNumber(selection?.itineraryRouteId || selection?.routeId, 0);
      const selectedRouteIds = Array.isArray(selection?.routeIds)
        ? selection.routeIds.map(Number).filter((id: number) => Number.isFinite(id) && id > 0)
        : [];
      return selectionRouteId === roomRouteId || selectedRouteIds.includes(roomRouteId);
    }) || userSelectedByStay?.[getStayKey({
      itineraryRouteId: roomRouteId,
      date: String((normalizedRoom as any).date || (normalizedRoom as any).checkInDate || '').trim(),
    } as any)];
    const isRateUpdate = Boolean(
      confirmedSelection &&
      isSameHotelIdentity(confirmedSelection, normalizedRoom) &&
      getHotelOptionKey(confirmedSelection) !== getHotelOptionKey(normalizedRoom),
    );
    const currentHotel = localHotels.find(
      (hotel) =>
        hotel.itineraryRouteId === roomRouteId &&
        !hotel.previousDayBillingSynthetic,
    ) || localHotels.find(h => h.itineraryRouteId === roomRouteId);
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
    if (provider === "staah" || provider === "axisrooms") {
      try {
        const preview = await hotelService.previewHotelStayExtension(planId, {
          routeId: resolvedRouteId,
          provider: provider as "staah" | "axisrooms",
          hotelCode: String((normalizedRoom as any).hotelCode || resolvedHotelId || "").trim(),
          hotelName: String((normalizedRoom as any).hotelName || "").trim() || undefined,
          roomId: String((normalizedRoom as any).roomId || "").trim() || undefined,
          rateId: String((normalizedRoom as any).rateId || "").trim() || undefined,
          roomType: String((normalizedRoom as any).roomTypeName || (normalizedRoom as any).roomType || "").trim() || undefined,
          mealPlan: String((normalizedRoom as any).mealPlan || "").trim() || undefined,
          checkInDate: String((normalizedRoom as any).checkInDate || (normalizedRoom as any).date || "").trim(),
        });

        if (preview?.nights > 1) {
          // Always surface cross-date restrictions in the modal. A toast is
          // easy to miss and does not explain whether the selected night or
          // one of the continuous follow-on nights is blocked.
          setStayExtensionModalState({
            preview,
            action: pendingActionBase,
          });
          return;
        }

        if (!preview.canBookSingleNight) {
          const message =
            preview.restrictionConflicts?.map((conflict: any) => conflict.message).join(" | ")
            || "Hotel cannot be booked on the selected day.";
          toast.error(message);
          return;
        }
      } catch (previewError) {
        console.error("[HotelList] stay-extension-preview failed; selection blocked", previewError);
        toast.error("Could not verify hotel availability. The hotel was not selected. Please retry.");
        return;
      }
    }

    if (isRateUpdate) {
      openConfirmDialogForAction(pendingActionBase);
      return;
    }

    openConfirmDialogForAction(pendingActionBase);
  };

  const handleConfirmHotelSelection = async () => {
    if (!pendingHotelAction || isUpdatingHotel) return;

    const { room, isReplacing } = pendingHotelAction;
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
      console.log("🏨 [HotelList] Storing hotel selection in state:", {
        hotelName: room.hotelName,
        hotelId: room.hotelId,
        groupType: pendingHotelAction.groupType,
        isReplacing,
      });
      
      // ✅ Store selection by groupType and routeId
      const routeId = toNumber(normalizedRoom.itineraryRouteId);
      const groupType = toNumber(pendingHotelAction.groupType ?? activeGroupType, 1);
      let selectionUpdates = buildSelectionUpdates(
        normalizedRoom,
        groupType,
        resolvedHotelId,
        multiNightPreview,
        pendingHotelAction.isRateUpdate ? pendingHotelAction.previousSelection : null,
      );
      if (pendingHotelAction.manualRoomMealMismatchWarning?.enabled) {
        Object.values(selectionUpdates).forEach((update) => {
          if (update) {
            update.manualRoomMealMismatchOverride = true;
          }
        });
      }
      const multiNightSelection = Object.values(selectionUpdates).find((update) =>
        Boolean(update?.multiNightBooking && Array.isArray(update.routeIds) && update.routeIds.length > 1),
      );
      const selectionRouteIds = Array.isArray(multiNightSelection?.routeIds) && multiNightSelection.routeIds.length > 0
        ? multiNightSelection.routeIds
            .map((id) => Number(id))
            .filter((id) => Number.isFinite(id) && id > 0)
        : [routeId];

      // Price the proposed selection before changing any local hotel state.
      // A failed backend preview therefore leaves the previous selection visible.
      const costPreviewResult = onTemporarySelectionCostPreview
        ? await onTemporarySelectionCostPreview(selectionUpdates)
        : true;
      if (!costPreviewResult) {
        return;
      }

      if (costPreviewResult !== true) {
        const refreshedSelections = costPreviewResult as Record<number, HotelSelectionUpdate | null>;
        const refreshedSelection = refreshedSelections[routeId];
        selectionUpdates = {
          ...refreshedSelections,
          ...selectionUpdates,
        };
        if (refreshedSelection) {
          selectionUpdates = {
            ...selectionUpdates,
            [routeId]: {
              ...selectionUpdates[routeId],
              ...refreshedSelection,
            },
          };
          normalizedRoom = {
            ...normalizedRoom,
            ...refreshedSelection,
            hotelId: Number((refreshedSelection as any).hotelId || (normalizedRoom as any).hotelId || 0),
            hotelCode: refreshedSelection.hotelCode || normalizedRoom.hotelCode,
            bookingCode: refreshedSelection.bookingCode || normalizedRoom.bookingCode,
            searchReference: refreshedSelection.searchReference || normalizedRoom.searchReference,
            hotelName: refreshedSelection.hotelName || normalizedRoom.hotelName,
            roomType: refreshedSelection.roomType || normalizedRoom.roomType,
            roomTypeName: refreshedSelection.roomType || normalizedRoom.roomTypeName,
            mealPlan: refreshedSelection.mealPlan || normalizedRoom.mealPlan,
            totalAmount: Number(refreshedSelection.totalAmountAfterTax ?? refreshedSelection.netAmount ?? normalizedRoom.totalAmount ?? 0),
            totalAmountAfterTax: Number(refreshedSelection.totalAmountAfterTax ?? normalizedRoom.totalAmountAfterTax ?? 0),
            netAmount: Number(refreshedSelection.netAmount ?? normalizedRoom.netAmount ?? 0),
          } as HotelRoomDetail;
        }
      }

      // Persist before changing local selection state. If the API rejects the
      // selection, the previous persisted choice remains the UI truth.
      await persistHotelSelections(normalizedRoom, selectionRouteIds, groupType, selectionUpdates);

      const getNextDate = (date: string) => {
        if (!date) return "";
        const parsed = new Date(`${date}T00:00:00.000Z`);
        if (Number.isNaN(parsed.getTime())) return "";
        parsed.setUTCDate(parsed.getUTCDate() + 1);
        return parsed.toISOString().slice(0, 10);
      };

      const buildRouteScopedHotel = (
        baseHotel: any,
        selectedRouteId: number,
        index: number,
      ): ItineraryHotelRow => {
        const routeHotel = localHotels.find(
          (hotel) =>
            toNumber((hotel as any).itineraryRouteId, 0) === Number(selectedRouteId) &&
            toNumber((hotel as any).groupType, groupType) === Number(groupType),
        );

        const nightlyRate = (multiNightSelection?.nightlyRates || multiNightPreview?.nightlyRates)?.[index];
        const nightDate =
          nightlyRate?.date ||
          routeHotel?.date ||
          String((baseHotel as any).date || (baseHotel as any).checkInDate || "").trim();

        const nightAmount =
          nightlyRate?.amountAfterTax !== undefined && nightlyRate?.amountAfterTax !== null
            ? Number(nightlyRate.amountAfterTax)
            : Number(
              (multiNightSelection as any)?.totalAmountAfterTax && selectionRouteIds.length === 1
                ? (multiNightSelection as any).totalAmountAfterTax
                : (baseHotel as any).totalHotelCost || (baseHotel as any).totalAmount || (baseHotel as any).netAmount || 0,
            );

        return {
          ...baseHotel,
          itineraryRouteId: Number(selectedRouteId),
          routeId: Number(selectedRouteId),
          day: routeHotel?.day || (baseHotel as any).day,
          date: nightDate,
          checkInDate: nightDate,
          checkOutDate: getNextDate(nightDate),
          totalHotelCost: nightAmount,
          totalAmount: nightAmount,
          netAmount: nightAmount,
          multiNightBooking: Boolean((baseHotel as any).multiNightBooking || (multiNightPreview && multiNightPreview.nights > 1)),
          stayKey: (multiNightSelection as any)?.stayKey || multiNightPreview?.stayKey || (baseHotel as any).stayKey,
          routeIds: (multiNightSelection as any)?.routeIds || multiNightPreview?.routeIds || (baseHotel as any).routeIds,
          nights: (multiNightSelection as any)?.nights || multiNightPreview?.nights || (baseHotel as any).nights,
          nightlyRates: (multiNightSelection as any)?.nightlyRates || multiNightPreview?.nightlyRates || (baseHotel as any).nightlyRates,
          totalAmountAfterTax: (multiNightSelection as any)?.totalAmountAfterTax || multiNightPreview?.totalAmountAfterTax || (baseHotel as any).totalAmountAfterTax,
        } as any;
      };
      
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
      ) || (normalizedRoom as unknown as ItineraryHotelRow);
      
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
        console.warn('⚠️ [HotelList] Hotel not found in localHotels, using fallback synthetic row for provider:', (normalizedRoom as any).provider);
        // Re-use the normal flow with the fallback
        const routeScopedFallbackSelections = selectionRouteIds.map((selectedRouteId, index) =>
          buildRouteScopedHotel(fallbackHotel, Number(selectedRouteId), index),
        );

        const fallbackIdentityKey = [
          String((fallbackHotel as any).hotelName || '').trim().toLowerCase(),
          String((fallbackHotel as any).provider || '').trim().toLowerCase(),
        ].join('|');

        setSelectedRoomTypeByHotel((prev) => ({
          ...prev,
          [fallbackIdentityKey]: getHotelOptionKey(fallbackHotel),
        }));

        setSelectedByGroup(prev => {
          const next = { ...prev };
          if (!next[groupType]) next[groupType] = {};
          routeScopedFallbackSelections.forEach((routeHotel) => {
            const routeStayKey = getStayKey(routeHotel);
            next[groupType][routeStayKey] = routeHotel;
          });
          return next;
        });
        setUserSelectedByStay(prev => {
          const next = { ...prev };
          routeScopedFallbackSelections.forEach((routeHotel) => {
            const routeStayKey = getStayKey(routeHotel);
            next[routeStayKey] = routeHotel;
          });
          return next;
        });
        setShowConfirmDialog(false);
        setPendingHotelAction(null);
        if (onHotelSelectionsChange) onHotelSelectionsChange(selectionUpdates);
        toast.success('Hotel selected');
        return;
      }

      const selectedHotelForState: ItineraryHotelRow = {
        ...selectedHotel,
        ...normalizedRoom,
        provider: String((normalizedRoom as any).provider || (selectedHotel as any).provider || 'tbo').toLowerCase(),
        hotelCode: String((normalizedRoom as any).hotelCode || (normalizedRoom as any).hotelId || (selectedHotel as any).hotelCode || '').trim(),
        bookingCode: String((normalizedRoom as any).bookingCode || (normalizedRoom as any).searchReference || '').trim(),
        searchReference: String((normalizedRoom as any).searchReference || '').trim(),
        roomType: String((normalizedRoom as any).roomTypeName || (normalizedRoom as any).roomType || (selectedHotel as any).roomType || 'Standard').trim(),
        mealPlan: String((normalizedRoom as any).mealPlan || (selectedHotel as any).mealPlan || '').trim(),
        totalHotelCost: Number(
          (normalizedRoom as any).totalHotelCost ??
          (normalizedRoom as any).totalAmount ??
          (normalizedRoom as any).totalAmountAfterTax ??
          (normalizedRoom as any).netAmount ??
          (selectedHotel as any).totalHotelCost ?? 0,
        ),
        totalHotelTaxAmount: Number(
          (normalizedRoom as any).totalHotelTaxAmount ??
          (normalizedRoom as any).taxAmount ??
          (selectedHotel as any).totalHotelTaxAmount ?? 0,
        ),
        totalAmount: Number(
          (normalizedRoom as any).totalAmountAfterTax ??
          (normalizedRoom as any).totalAmount ??
          (normalizedRoom as any).netAmount ??
          (selectedHotel as any).totalAmount ?? 0,
        ),
        netAmount: Number((normalizedRoom as any).netAmount ?? (normalizedRoom as any).totalAmountAfterTax ?? (normalizedRoom as any).totalAmount ?? 0),
        totalAmountAfterTax: Number((normalizedRoom as any).totalAmountAfterTax ?? (normalizedRoom as any).totalAmount ?? (normalizedRoom as any).netAmount ?? 0),
        roomId: String((normalizedRoom as any).roomId || '').trim() || undefined,
        rateId: String((normalizedRoom as any).rateId || '').trim() || undefined,
        routeIds: Array.isArray((normalizedRoom as any).routeIds) ? (normalizedRoom as any).routeIds : undefined,
        nightlyRates: Array.isArray((normalizedRoom as any).nightlyRates) ? (normalizedRoom as any).nightlyRates : undefined,
      } as any;

      const routeScopedSelections = selectionRouteIds.map((selectedRouteId, index) =>
        buildRouteScopedHotel(selectedHotelForState, Number(selectedRouteId), index),
      );

      const selectedIdentityKey = [
        String((selectedHotelForState as any).hotelName || '').trim().toLowerCase(),
        String((selectedHotelForState as any).provider || '').trim().toLowerCase(),
      ].join('|');

      setSelectedRoomTypeByHotel((prev) => ({
        ...prev,
        [selectedIdentityKey]: getHotelOptionKey(normalizedRoom),
      }));

      setSelectedByGroup((prev) => {
        const next = { ...prev };
        if (!next[groupType]) {
          next[groupType] = {};
        }

        routeScopedSelections.forEach((routeHotel) => {
          const routeStayKey = getStayKey(routeHotel);
          next[groupType][routeStayKey] = routeHotel;
        });

        return next;
      });

      setUserSelectedByStay((prev) => {
        const next = { ...prev };
        routeScopedSelections.forEach((routeHotel) => {
          const routeStayKey = getStayKey(routeHotel);
          next[routeStayKey] = routeHotel;
        });
        return next;
      });
      
      setShowConfirmDialog(false);
      setPendingHotelAction(null);

      // Emit only this explicit route selection to parent to avoid bulk overwrite of other days.
      if (onHotelSelectionsChange) onHotelSelectionsChange(selectionUpdates);
      
      // Collapse expanded day row after selection to avoid accidental reselection/reset perception.
      setExpandedRowKey(null);

      // Update selectedHotelId so selected state remains reflected in the list.
      setSelectedHotelId(Number(normalizedRoom.hotelId));

      if (pendingHotelAction.isRateUpdate) {
        const previousPrice = Number(
          (pendingHotelAction.previousSelection as any)?.totalAmountAfterTax ??
          (pendingHotelAction.previousSelection as any)?.totalAmount ??
          (pendingHotelAction.previousSelection as any)?.netAmount ??
          Number((pendingHotelAction.previousSelection as any)?.totalHotelCost || 0) +
            Number((pendingHotelAction.previousSelection as any)?.totalHotelTaxAmount || 0),
        );
        const nextPrice = Number(selectionUpdates[routeId]?.totalAmountAfterTax ?? selectionUpdates[routeId]?.netAmount ?? 0);
        const priceDifference = toMoneyNumber(nextPrice - previousPrice);
        toast.success("Room updated successfully.", {
          description: priceDifference > 0
            ? `Hotel price increased by ${formatCurrency(priceDifference)}.`
            : priceDifference < 0
            ? `Hotel price decreased by ${formatCurrency(Math.abs(priceDifference))}.`
            : "No price difference.",
        });
        return;
      }
      
      toast.success("Hotel selected! 👍", {
        description: `${normalizedRoom.hotelName} - selection saved`,
      });
      
      // Keep user on the current tier tab; auto-switching causes cross-day selection confusion.
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
      const resolvedPlanId = toNumber((room as any).itineraryPlanId ?? (room as any).itinerary_plan_id ?? planId, 0);
      const resolvedRouteId = toNumber((room as any).itineraryRouteId ?? (room as any).itinerary_route_id ?? (room as any).routeId, 0) || getExpandedRouteId();
      const resolvedHotelId = toNumber((room as any).hotelId ?? (room as any).hotel_id ?? (room as any).id, 0);

      if (!resolvedPlanId || !resolvedRouteId || !hasSelectableHotelIdentity({ ...room, hotelId: resolvedHotelId })) {
        console.error('❌ Skipping invalid hotel selection payload:', { selectionKey, room });
        return;
      }
      
      const promise = persistHotelSelections(
        {
          ...room,
          itineraryPlanId: resolvedPlanId,
          itineraryRouteId: resolvedRouteId,
          hotelId: resolvedHotelId,
        },
        [resolvedRouteId],
        Number(room.groupType ?? 1),
        {},
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
  return {
    handleRowClick,
    handleSyncRoute,
    openConfirmDialogForAction,
    handleChooseOrUpdateHotel,
    handleConfirmHotelSelection,
    handleCancelHotelAction,
    saveAllHotelSelections,
    syncConfirmationRequest,
    resolveSyncConfirmation,
  };
}
