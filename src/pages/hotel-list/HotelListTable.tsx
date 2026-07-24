/* eslint-disable @typescript-eslint/no-explicit-any */
import React from "react";
import type { ItineraryHotelRow } from "../ItineraryDetails";
import type { HotelRoomDetail } from "./hotelList.types";

type HotelListTableContext = Record<string, any>;

type HotelListTableProps = { context: HotelListTableContext };

export const HotelListTable: React.FC<HotelListTableProps> = ({ context }) => {
  const {
    styles,
    showRates,
    showOfflineHotels,
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
    getHotelIdentityKey,
    sortOptionsByPrice,
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
    pendingHotelAction,
    selectedHotelId,
    getOverallSelectedHotelTotal,
    currentTabTotal,
    mealPlanCode,
    roomDetails,
    Button,
    Loader2,
    ArrowUp,
    ArrowDown,
  } = context;

  const formatDateOnly = (value?: string | null): string => {
    const datePart = String(value || '').slice(0, 10);
    return /^\d{4}-\d{2}-\d{2}$/.test(datePart) ? datePart : '-';
  };

  const formatGuestArrivalTime = (value?: string | null): string => {
    if (!value) return 'early morning';
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return 'early morning';
    return parsed
      .toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
        timeZone: 'UTC',
      })
      .replace(':00', '');
  };

  const tableColumnCount = showRates ? 6 : 5;
  const tableHeaderClass = 'border-b border-[#dbdade] bg-[#f4f3f8]/80 px-3 py-3 text-left text-[10px] font-semibold uppercase tracking-[0.04em] text-[#797a81]';
  const tableCellClass = 'px-3 py-3 align-top text-[12px] text-[#4f5159]';

  return (
    <>
        {/* Hotel Table */}
        <div className="overflow-hidden border border-[#8e59cf]/30 rounded-lg bg-white shadow-sm">
          <div className="overflow-x-auto">
          <table className="w-full min-w-[980px] border-collapse text-left">
            <thead>
              <tr>
                <th className={`${tableHeaderClass} w-[135px]`}>
                  DAY
                </th>
                <th className={`${tableHeaderClass} w-[125px]`}>
                  DESTINATION
                </th>
                <th className={`${tableHeaderClass} min-w-[220px]`}>
                  HOTEL
                </th>
                <th className={`${tableHeaderClass} min-w-[150px]`}>
                  ROOM TYPE
                </th>
                {showRates && (
                  <th className={`${tableHeaderClass} whitespace-nowrap`}>
                    PRICE
                  </th>
                )}
                <th className={`${tableHeaderClass} whitespace-nowrap`}>
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
                const effectiveRooms = getEffectiveRoomCount(hotel, roomCount);
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
                const firstEarlyCheckInRowIndex = currentHotelRows.findIndex((row) => Boolean(row.earlyCheckIn));
                const isFirstEarlyCheckInRow = Boolean(
                  hotel.earlyCheckIn && idx === firstEarlyCheckInRowIndex,
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
                    {isFirstEarlyCheckInRow && (
                      <>
                        <tr
                          className={`border-t border-amber-200 bg-amber-50/50 ${
                            !readOnly && loadingRowKey === null
                              ? "cursor-pointer hover:bg-amber-100/70"
                              : readOnly
                                ? "cursor-default"
                                : "cursor-not-allowed opacity-50"
                          }`}
                          onClick={() => {
                            // Day 0 is the billing/blocking date, but the supplier
                            // room inventory is keyed to the real guest-arrival
                            // route. Delegate to the real early-arrival row so the
                            // existing room selection, continuity preview, and
                            // restriction workflow are reused without creating a
                            // duplicate stay or price line.
                            if (!readOnly && loadingRowKey === null) {
                              handleRowClick(hotel);
                            }
                          }}
                          aria-label="Open early-arrival hotel options"
                          role={!readOnly ? "button" : undefined}
                          tabIndex={!readOnly ? 0 : undefined}
                          onKeyDown={(event) => {
                            if (
                              !readOnly &&
                              loadingRowKey === null &&
                              (event.key === "Enter" || event.key === " ")
                            ) {
                              event.preventDefault();
                              handleRowClick(hotel);
                            }
                          }}
                        >
                          <td className={`${tableCellClass} font-medium`}>
                            <div>Day 0 | {formatDateOnly(hotel.hotelCheckInDate)}</div>
                          </td>
                          <td className={`${tableCellClass} font-medium`}>
                            {resolvedDestination}
                          </td>
                          <td className={tableCellClass}>
                            <div className="font-medium leading-5 text-[#3f4149]">
                              {hotel.hotelName
                                ? (() => {
                                    const starCategory = normalizeHotelStarCategory(hotel.category);
                                    return starCategory
                                      ? `${hotel.hotelName} -${starCategory}*`
                                      : hotel.hotelName;
                                  })()
                                : '-'}
                            </div>
                            <span className="mt-1 inline-flex rounded-full bg-[#fbe7f6] px-2 py-1 text-[11px] font-semibold text-[#ad2e8b]">
                              Early check-in room block
                            </span>
                          </td>
                          <td className={tableCellClass}>
                            {getRoomTypeDisplay(hotel)}
                          </td>
                          {showRates && (
                            <td className={`${tableCellClass} whitespace-nowrap text-[#81768e]`}>
                              {hotel.earlyCheckIn ? (
                                <>
                                  <div className="font-bold text-[#303238]">
                                    {formatCurrency(rowTotal)}
                                    {showHotelMargins && getHotelBaseAmount(hotel) > 0 && (
                                      <span className="ml-1 text-[11px] font-normal text-gray-500">
                                        ({formatCurrency(getHotelBaseAmount(hotel))})
                                      </span>
                                    )}
                                  </div>
                                  <span className="mt-1 inline-block text-[10px] leading-4 text-[#81768e]">
                                    Included in Day 1 total
                                  </span>
                                </>
                              ) : "—"}
                            </td>
                          )}
                          <td className={tableCellClass}>
                            {isExternalStay ? getMealPlanDisplay(hotel) : <MealPlanCell mealPlanText={hotel.mealPlan} selectedCode={mealPlanCode} />}
                          </td>
                        </tr>
                        <tr className="border-t border-amber-200 bg-amber-50">
                          <td
                            colSpan={tableColumnCount}
                            className="px-6 py-3 text-sm text-amber-900"
                          >
                            <span className="font-semibold">Note for hotelier:</span>{' '}
                            Guest has opted for early morning check-in at {formatGuestArrivalTime(hotel.actualGuestArrivalAt)} with extra payment. Room to be blocked from the previous night, with actual guest arrival/check-in on the next day early morning.
                          </td>
                        </tr>
                      </>
                    )}

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
                      <td className={`${tableCellClass} font-medium`}>
                        <div>{hotel.day}</div>
                      </td>
                      <td className={`${tableCellClass} font-medium`}>
                        {resolvedDestination}
                      </td>
                      <td className={tableCellClass}>
                        <div>
                          <div className="font-medium leading-5 text-[#3f4149]">
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
                      <td className={tableCellClass}>
                        {getRoomTypeDisplay(hotel)}
                        {!isExternalStay && effectiveRooms > 1 && !/\(\d+\s*Rooms?\)$/i.test(String(hotel.roomType || ''))
                          ? ` (${effectiveRooms} Rooms)`
                          : ""}
                      </td>
                      {showRates && (
                        <td className={`${tableCellClass} whitespace-nowrap font-bold text-[#303238]`}>
                          {formatCurrency(rowTotal)}
                          {showHotelMargins && getHotelBaseAmount(hotel) > 0 && (
                            <span className="ml-1 text-[11px] font-normal text-gray-500">
                              ({formatCurrency(getHotelBaseAmount(hotel))})
                            </span>
                          )}
                        </td>
                      )}
                      <td className={tableCellClass}>
                        <div className="flex items-center justify-between gap-2">
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
                        </div>
                      </td>
                    </tr>

                    {/* EXPANDED ROW WITH ROOM CARDS */}
                    {isExpanded && (
                      <tr className="bg-[#fdf6ff] border-t">
                        <td
                          colSpan={tableColumnCount}
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
                              {(() => {
                                const groupType = activeGroupType || 1;
                                const selectedForStay = selectedByGroup[groupType]?.[rowKey];
                                const selectedHotelId = Number((selectedForStay as any)?.hotelId || 0);
                                const selectedBookingCode = String((selectedForStay as any)?.bookingCode || '').trim();

                                const selectedOptionKey = selectedForStay ? getHotelOptionKey(selectedForStay) : '';

                                const visibleRoomDetails = roomDetails.filter((h) => {
                                  const isOffline = String(h.provider || '').trim().toLowerCase() === 'offline';
                                  const isSelectedOffline = selectedOptionKey !== '' && getHotelOptionKey(h) === selectedOptionKey;
                                  return showOfflineHotels || !isOffline || isSelectedOffline;
                                });

                                const filtered = visibleRoomDetails.filter((h) =>
                                  h.hotelName?.toLowerCase().includes(hotelSearchQuery.toLowerCase()),
                                );

                                const sorted = [...filtered].sort((a, b) => {
                                  const aIsOffline = String(a.provider || '').trim().toLowerCase() === 'offline';
                                  const bIsOffline = String(b.provider || '').trim().toLowerCase() === 'offline';

                                  // Keep live supplier options together and place manual-approval
                                  // options after them, then sort both sections by total rate.
                                  if (aIsOffline !== bIsOffline) return aIsOffline ? 1 : -1;

                                  const aSelected = selectedOptionKey !== '' && getHotelOptionKey(a) === selectedOptionKey;
                                  const bSelected = selectedOptionKey !== '' && getHotelOptionKey(b) === selectedOptionKey;

                                  if (aSelected && !bSelected) return -1;
                                  if (!aSelected && bSelected) return 1;

                                  const amountDifference = getHotelDisplayAmount(a) - getHotelDisplayAmount(b);
                                  if (amountDifference !== 0) return amountDifference;

                                  return getHotelOptionKey(a).localeCompare(getHotelOptionKey(b));
                                });

                                // Hide offline duplicates when the same property has a live result.
                                // Keep a selected offline option visible so an existing choice is never lost.
                                const getHotelPropertyIdentityKey = (h: any) => {
                                  const hotelName = String(h.hotelName || '')
                                    .trim()
                                    .toLowerCase()
                                    .replace(/[^a-z0-9]+/g, '');
                                  if (hotelName) return `name:${hotelName}`;

                                  const canonicalId = String(
                                    h.canonicalHotelId || h.hotelId || h.hotelCode || '',
                                  ).trim().toLowerCase();
                                  return canonicalId ? `id:${canonicalId}` : '';
                                };

                                const livePropertyKeys = new Set(
                                  sorted
                                    .filter((hotel) => String(hotel.provider || '').trim().toLowerCase() !== 'offline')
                                    .map(getHotelPropertyIdentityKey)
                                    .filter(Boolean),
                                );

                                const filteredDuplicateOfflineHotels = sorted.filter((hotel) => {
                                  const isOffline = String(hotel.provider || '').trim().toLowerCase() === 'offline';
                                  if (!isOffline) return true;

                                  const propertyKey = getHotelPropertyIdentityKey(hotel);
                                  const isSelectedOffline = selectedOptionKey !== '' && getHotelOptionKey(hotel) === selectedOptionKey;
                                  return !propertyKey || !livePropertyKeys.has(propertyKey) || isSelectedOffline;
                                });

                                // Group by hotel identity so one card can expose multiple rate variants.
                                const getHotelIdentityKey = (h: any) => {
                                  const provider = String(h.provider || '').trim().toLowerCase();
                                  const hotelName = String(h.hotelName || '').trim().toLowerCase();
                                  return `${hotelName}|${provider}`;
                                };

                                const hotelGroups = new Map<string, HotelRoomDetail[]>();
                                filteredDuplicateOfflineHotels.forEach((h) => {
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

                                const getPreviousSelectedHotelForStay = (hotel: any): ItineraryHotelRow | null => {
                                  const currentRouteId = toNumber(
                                    hotel?.itineraryRouteId ||
                                      hotel?.routeId ||
                                      getExpandedRouteId(),
                                    0,
                                  );

                                  const currentDate = String(
                                    hotel?.date ||
                                      hotel?.checkInDate ||
                                      '',
                                  ).trim();

                                  return currentHotelRows
                                    .filter((row: any) => {
                                      const rowRouteId = toNumber(row.itineraryRouteId || row.routeId, 0);
                                      const rowDate = String(row.date || row.checkInDate || '').trim();

                                      if (!rowRouteId || rowRouteId === currentRouteId) {
                                        return false;
                                      }

                                      if (currentDate && rowDate && rowDate >= currentDate) {
                                        return false;
                                      }

                                      return isSelectableHotel(row);
                                    })
                                    .sort((a: any, b: any) => getStaySortValue(b).localeCompare(getStaySortValue(a)))[0] || null;
                                };

                                // One card per hotel; selected stay must win over old dropdown/manual state.
                                const deduped = Array.from(hotelGroups.entries()).map(([identKey, options]) => {
                                  const manualKey = selectedRoomTypeByHotel[identKey];

                                  const selectedOption =
                                    selectedOptionKey !== ''
                                      ? options.find((o) => getHotelOptionKey(o) === selectedOptionKey)
                                      : undefined;

                                  const manualOption =
                                    manualKey
                                      ? options.find((o) => getHotelOptionKey(o) === manualKey)
                                      : undefined;

                                  const previousSelectedHotelForThisCard = getPreviousSelectedHotelForStay(options[0]);

                                  const fairSelectableOption = previousSelectedHotelForThisCard
                                    ? options.find((option) =>
                                        isSelectableHotel(option) &&
                                        isSameHotelIdentity(option, previousSelectedHotelForThisCard) &&
                                        isSameRoomMealIdentity(option, previousSelectedHotelForThisCard))
                                    : undefined;

                                  const active =
                                    manualOption ||
                                    selectedOption ||
                                    fairSelectableOption ||
                                    findBestOption(options) ||
                                    options[0];
                                  return { identKey, active, options };
                                });

                                return deduped.map(({ identKey, active: hotel, options: roomTypeOptions }) => {
                                const roomKey = `hotel-${identKey}`;
                                const isSelected = selectedOptionKey !== '' && getHotelOptionKey(hotel) === selectedOptionKey;
                                const isSameSelectedHotel = Boolean(
                                  selectedForStay && isSameHotelIdentity(hotel, selectedForStay),
                                );
                                const isPendingRateUpdate = Boolean(
                                  selectedForStay && isSameSelectedHotel && !isSelected,
                                );
                                const isUpdatingThisCard = Boolean(
                                  isUpdatingHotel &&
                                  pendingHotelAction?.room &&
                                  getHotelOptionKey(pendingHotelAction.room) === getHotelOptionKey(hotel),
                                );
                                const isSelectable = isSelectableHotel(hotel);
                                const actionMessage = String((hotel as any)?.availabilityMessage || '').trim();
                                const previousSelectedHotelForCard = getPreviousSelectedHotelForStay(hotel);
                                const roomMealMismatchMessage = getAutoSkipRoomMealMismatchMessage(
                                  hotel,
                                  selectedForStay,
                                  previousSelectedHotelForCard,
                                );
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
                                            providerKey === 'tbo' ? 'VSR'
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

                                  <div className="p-4 flex-1 flex flex-col">
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

                                    <div className="mb-3">
                                      <label className="block text-xs font-medium text-[#4a4260] mb-1">
                                        Room Type
                                      </label>
                                      {roomTypeVariants.length > 1 ? (
                                        <select
                                        className="w-full max-w-full truncate rounded-md border border-[#e5d9f2] bg-white px-2 py-1 text-[11px] font-semibold text-[#4a4260] outline-none focus:border-[#7c3aed]"
                                          value={activeRoomTypeValue}
                                          disabled={isUpdatingHotel}
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
                                          disabled={isUpdatingHotel}
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

                                    {actionMessage && (
                                      <div className="mb-3 rounded-md border border-amber-200 bg-amber-50 px-3 py-2">
                                        <p className="text-xs font-semibold text-amber-900">
                                          Restricted for this stay
                                        </p>
                                        <p className="mt-1 text-xs leading-5 text-amber-800">
                                          {actionMessage}
                                        </p>
                                      </div>
                                    )}

                                    {!actionMessage && roomMealMismatchMessage && (
                                      <div className="mb-3 rounded-md border border-blue-200 bg-blue-50 px-3 py-2">
                                        <p className="text-xs leading-5 text-blue-800">
                                          {roomMealMismatchMessage}
                                        </p>
                                      </div>
                                    )}

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

                                    {/* Choose/Update Button - Conditional based on selection status */}
                                    <div className="mt-auto pt-2">
                                      <button
                                        className={`w-full py-2 px-4 font-medium rounded-md transition-colors text-sm ${
                                          isSelected
                                            ? 'bg-[#22c55e] text-white cursor-default'
                                            : isPendingRateUpdate
                                            ? 'bg-amber-500 hover:bg-amber-600 text-white'
                                            : isSelectable
                                            ? 'bg-[#7c3aed] hover:bg-[#6d28d9] text-white'
                                            : 'bg-slate-200 text-slate-500 cursor-not-allowed'
                                        }`}
                                        onClick={() => {
                                          if (!isSelectable) return;
                                          handleChooseOrUpdateHotel(hotel);
                                        }}
                                        disabled={isSelected || !isSelectable || isUpdatingHotel}
                                      >
                                        {isUpdatingThisCard
                                          ? 'Updating...'
                                          : isSelected
                                          ? 'Selected'
                                          : isPendingRateUpdate
                                          ? 'Update'
                                          : isSelectable
                                          ? 'Choose'
                                          : 'Restricted'}
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
                  colSpan={4}
                  className="px-4 py-3 text-sm font-medium text-[#4a4260] text-right"
                >
                  Hotel Total :
                </td>
                {showRates && <td className="px-4 py-3 text-sm font-semibold text-[#4a4260]" />}
                <td className="px-4 py-3 text-sm font-semibold text-[#4a4260]">
                  {formatCurrency(readOnly ? getOverallSelectedHotelTotal() : currentTabTotal)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        </div>

    </>
  );
};
