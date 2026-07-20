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
    planId,
    roomCount,
    toast,
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
    setSelectedRoomTypeByHotel,
    setSelectedByGroup,
    setUserSelectedByStay,
    setIsUpdatingHotel,
    onHotelSelectionsChange,
    pendingHotelAction,
  } = context;

  const hotelService = ItineraryServiceFromContext || ItineraryService;

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

  const buildSelectionUpdates = (
    normalizedRoom: HotelRoomDetail,
    groupType: number,
    resolvedHotelId: number,
    multiNightPreview?: StayExtensionPreviewResponse | null,
  ): Record<number, HotelSelectionUpdate | null> => {
    const provider = String((normalizedRoom as any).provider || 'tbo')
      .trim()
      .toLowerCase();

    const hotelCode = String(
      (normalizedRoom as any).hotelCode ||
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
      mealPlan: String((normalizedRoom as any).mealPlan || '').trim() || undefined,
      searchReference: String((normalizedRoom as any).searchReference || '').trim() || undefined,
      roomId: String((normalizedRoom as any).roomId || '').trim() || undefined,
      rateId: String((normalizedRoom as any).rateId || '').trim() || undefined,
    };

    const previewRouteIds =
      Array.isArray(multiNightPreview?.routeIds) && multiNightPreview.routeIds.length > 1
        ? multiNightPreview.routeIds


            .map((id) => Number(id))
            .filter((id) => Number.isFinite(id) && id > 0)
        : [];

    if (multiNightPreview && previewRouteIds.length > 1) {
      const parentRouteId = previewRouteIds[0];
      const nightlyRates = Array.isArray(multiNightPreview.nightlyRates)
        ? multiNightPreview.nightlyRates
        : [];

      const totalAmountAfterTax = toMoneyNumber(
        multiNightPreview.totalAmountAfterTax ??
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
          checkInDate: String(multiNightPreview.checkInDate || fallbackCheckInDate).trim(),
          checkOutDate: String(multiNightPreview.checkOutDate || fallbackCheckOutDate).trim(),
          netAmount: totalAmountAfterTax,
          totalAmountAfterTax,
          multiNightBooking: true,
          stayKey: multiNightPreview.stayKey,
          routeIds: previewRouteIds,
          nights: Number(multiNightPreview.nights || previewRouteIds.length),
          nightlyRates,
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

  // ---------- HANDLER: CHOOSE/UPDATE HOTEL ----------
  const handleChooseOrUpdateHotel = async (room: HotelRoomDetail) => {
    console.log('🏨 Choose button clicked', room);
    
    // ✅ BLOCK hotel selection when in read-only mode (confirmed itinerary)
    if (readOnly) {
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
    const currentHotel = localHotels.find(h => h.itineraryRouteId === roomRouteId);
    const isReplacing = Boolean(currentHotel?.hotelId) && Number(currentHotel.hotelId) !== roomHotelId;
    const routeDate = currentHotel?.day || "";

    const pendingActionBase = {
      room: normalizedRoom,
      isReplacing,
      previousHotelName: currentHotel?.hotelName || "",
      newHotelName: normalizedRoom.hotelName || "",
      routeDate,
      groupType: normalizedRoom.groupType ? Number(normalizedRoom.groupType) : undefined,
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
          if (!preview.canBookMultiNight && !preview.canBookSingleNight) {
            const message =
              preview.restrictionConflicts?.map((conflict: any) => conflict.message).join(" | ")
              || "Hotel cannot be booked on the selected day.";
            toast.error(message);
            return;
          }
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
        console.warn("[HotelList] stay-extension-preview failed, falling back to single-day selection", previewError);
        toast.warning("Could not verify continuous stay. Continuing with single-day booking.");
      }
    }

    openConfirmDialogForAction(pendingActionBase);
  };

  const handleConfirmHotelSelection = async () => {
    if (!pendingHotelAction) return;

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
      console.log("🏨 [HotelList] Storing hotel selection in state:", {
        hotelName: room.hotelName,
        hotelId: room.hotelId,
        groupType: pendingHotelAction.groupType,
        isReplacing,
      });
      
      // ✅ Store selection by groupType and routeId
      const routeId = toNumber(normalizedRoom.itineraryRouteId);
      const groupType = toNumber(pendingHotelAction.groupType ?? activeGroupType, 1);
      const selectionRouteIds = Array.isArray(multiNightPreview?.routeIds) && multiNightPreview.routeIds.length > 0
        ? multiNightPreview.routeIds
            .map((id) => Number(id))
            .filter((id) => Number.isFinite(id) && id > 0)
        : [routeId];

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

        const nightlyRate = multiNightPreview?.nightlyRates?.[index];
        const nightDate =
          nightlyRate?.date ||
          routeHotel?.date ||
          String((baseHotel as any).date || (baseHotel as any).checkInDate || "").trim();

        const nightAmount =
          nightlyRate?.amountAfterTax !== undefined && nightlyRate?.amountAfterTax !== null
            ? Number(nightlyRate.amountAfterTax)
            : Number((baseHotel as any).totalHotelCost || (baseHotel as any).totalAmount || 0);

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
          multiNightBooking: Boolean(multiNightPreview && multiNightPreview.nights > 1),
          stayKey: multiNightPreview?.stayKey,
          routeIds: multiNightPreview?.routeIds,
          nights: multiNightPreview?.nights,
          nightlyRates: multiNightPreview?.nightlyRates,
          totalAmountAfterTax: multiNightPreview?.totalAmountAfterTax,
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
        setUnsavedSelections(prev => {
          const newMap = new Map(prev);
          selectionRouteIds.forEach((selectedRouteId) => {
            newMap.set(`${selectedRouteId}-${groupType}`, {
              ...normalizedRoom,
              itineraryRouteId: selectedRouteId,
              checkInDate: multiNightPreview?.checkInDate || (normalizedRoom as any).checkInDate,
              checkOutDate: multiNightPreview?.checkOutDate || (normalizedRoom as any).checkOutDate,
            });
          });
          return newMap;
        });
        setShowConfirmDialog(false);
        setPendingHotelAction(null);
        if (onHotelSelectionsChange) {
          const updates = buildSelectionUpdates(
            normalizedRoom,
            groupType,
            resolvedHotelId,
            multiNightPreview,
          );

          if (pendingHotelAction.manualRoomMealMismatchWarning?.enabled) {
            Object.values(updates).forEach((update) => {
              if (update) {
                update.manualRoomMealMismatchOverride = true;
              }
            });
          }

          onHotelSelectionsChange(updates);
        }
        toast.success('Hotel selected');
        return;
      }

      const routeScopedSelections = selectionRouteIds.map((selectedRouteId, index) =>
        buildRouteScopedHotel(selectedHotel, Number(selectedRouteId), index),
      );

      const selectedIdentityKey = [
        String((selectedHotel as any).hotelName || '').trim().toLowerCase(),
        String((selectedHotel as any).provider || '').trim().toLowerCase(),
      ].join('|');

      setSelectedRoomTypeByHotel((prev) => ({
        ...prev,
        [selectedIdentityKey]: getHotelOptionKey(selectedHotel),
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
      
      // Mark as unsaved selection for backend save
      setUnsavedSelections(prev => {
        const newMap = new Map(prev);
        selectionRouteIds.forEach((selectedRouteId) => {
          newMap.set(`${selectedRouteId}-${groupType}`, {
            ...normalizedRoom,
            itineraryRouteId: selectedRouteId,
            checkInDate: multiNightPreview?.checkInDate || (normalizedRoom as any).checkInDate,
            checkOutDate: multiNightPreview?.checkOutDate || (normalizedRoom as any).checkOutDate,
          });
        });
        return newMap;
      });
      
      setShowConfirmDialog(false);
      setPendingHotelAction(null);

      // Emit only this explicit route selection to parent to avoid bulk overwrite of other days.
      if (onHotelSelectionsChange) {
        const updates = buildSelectionUpdates(
          normalizedRoom,
          groupType,
          resolvedHotelId,
          multiNightPreview,
        );

        if (pendingHotelAction.manualRoomMealMismatchWarning?.enabled) {
          Object.values(updates).forEach((update) => {
            if (update) {
              update.manualRoomMealMismatchOverride = true;
            }
          });
        }

        onHotelSelectionsChange(updates);
      }
      
      // Collapse expanded day row after selection to avoid accidental reselection/reset perception.
      setExpandedRowKey(null);

      // Update selectedHotelId so selected state remains reflected in the list.
      setSelectedHotelId(Number(normalizedRoom.hotelId));
      
      toast.success("Hotel selected! 👍", {
        description: `${normalizedRoom.hotelName} - Changes will be saved when you confirm the quotation`,
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
      const defaultRoomTypeId = Number(room.availableRoomTypes?.[0]?.roomTypeId ?? 1);
      const resolvedPlanId = toNumber((room as any).itineraryPlanId ?? (room as any).itinerary_plan_id ?? planId, 0);
      const resolvedRouteId = toNumber((room as any).itineraryRouteId ?? (room as any).itinerary_route_id ?? (room as any).routeId, 0) || getExpandedRouteId();
      const resolvedHotelId = toNumber((room as any).hotelId ?? (room as any).hotel_id ?? (room as any).id, 0);

      if (!resolvedPlanId || !resolvedRouteId || !hasSelectableHotelIdentity({ ...room, hotelId: resolvedHotelId })) {
        console.error('❌ Skipping invalid hotel selection payload:', { selectionKey, room });
        return;
      }
      
      const promise = hotelService.selectHotel(
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
    saveAllHotelSelections,
  };
}
