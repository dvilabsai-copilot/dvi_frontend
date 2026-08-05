/* eslint-disable @typescript-eslint/no-explicit-any */
import React from "react";
import { Pencil } from "lucide-react";
import { AutoSuggestSelect } from "@/components/AutoSuggestSelect";
import type { ItineraryHotelRow } from "../ItineraryDetails";
import type { HotelRoomDetail } from "./hotelList.types";
import {
  filterHotelsByMealPlan,
  filterHotelsByRoomType,
  getSelectableMealPlanFilterOptions,
  getRoomTypeFilterOptions,
  getVisibleHotelCardOptions,
  getHotelsForStay,
  getMealPlanCodes,
  getSelectableMealPlanCodes,
  getMealPlanDisplayLabel,
  getHotelMealPlanValue,
  getHotelRoomTypeValue,
  findHotelSelectionForStay,
  mergeHotelOptions,
  normalizeHotelIdentity,
  normalizeHotelDisplayName,
} from "./hotelList.utils";

type HotelListTableContext = Record<string, any>;

type HotelListTableProps = { context: HotelListTableContext };

export const HotelListTable: React.FC<HotelListTableProps> = ({ context }) => {
  // The day header is an editor for the persisted hotel-rate selection.
  // It must never behave as a recommendation-wide card filter.
  const [editingFieldByStay, setEditingFieldByStay] = React.useState<
    Record<string, "hotel" | "roomType" | "mealPlan" | null>
  >({});
  // Keep a card's temporary meal-plan choice independent of the persisted
  // selected row. This allows a non-selected card to be configured before
  // the user clicks Choose.
  const [selectedMealPlanByHotel, setSelectedMealPlanByHotel] = React.useState<Record<string, string>>({});
  const [mealPlanPreviewAmountByHotel, setMealPlanPreviewAmountByHotel] = React.useState<Record<string, { optionKey: string; amount: number }>>({});
  const [mealPlanPreviewKey, setMealPlanPreviewKey] = React.useState<string | null>(null);
  const [refreshedOptionsByStay, setRefreshedOptionsByStay] = React.useState<Record<string, HotelRoomDetail[]>>({});
  const [refreshingStayKey, setRefreshingStayKey] = React.useState<string | null>(null);

  const {
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
    userSelectedByGroup,
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
    onTemporarySelectionCostPreview,
    onRefreshSelectedHotel,
    isUpdatingHotel,
    pendingHotelAction,
    selectedHotelId,
    getOverallSelectedHotelTotal,
    currentTabTotal,
    mealPlanCode,
    roomDetails,
    setRoomSelectionModal,
    Button,
    Loader2,
    ArrowUp,
    ArrowDown,
    roomDetailsCache = {},
    localHotels = [],
    localRestrictedHotels = [],
    roomCount: contextRoomCount,
    planId: contextPlanId,
    selectionResetKey,
  } = context;

  React.useEffect(() => {
    setEditingFieldByStay({});
    setSelectedMealPlanByHotel({});
    setMealPlanPreviewAmountByHotel({});
    setMealPlanPreviewKey(null);
    setRefreshedOptionsByStay({});
    setRefreshingStayKey(null);
  }, [selectionResetKey]);

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

  const getSelectedHotelMatch = (hotel: HotelRoomDetail, selectedHotel: ItineraryHotelRow | null | undefined): boolean => {
    if (!selectedHotel) return false;

    const hotelRouteId = Number((hotel as any).itineraryRouteId || (hotel as any).routeId || 0);
    const selectedRouteIds = [
      Number((selectedHotel as any).itineraryRouteId || (selectedHotel as any).routeId || 0),
      ...(((selectedHotel as any).routeIds || []) as unknown[]).map((id) => Number(id)),
    ].filter((id) => Number.isFinite(id) && id > 0);
    if (hotelRouteId > 0 && selectedRouteIds.length > 0 && !selectedRouteIds.includes(hotelRouteId)) return false;

    const hotelGroup = Number((hotel as any).groupType || 0);
    const selectedGroup = Number((selectedHotel as any).groupType || 0);
    if (hotelGroup > 0 && selectedGroup > 0 && hotelGroup !== selectedGroup) return false;

    const hotelProvider = String((hotel as any).provider || '').trim().toLowerCase();
    const selectedProvider = String((selectedHotel as any).provider || '').trim().toLowerCase();
    if (hotelProvider && selectedProvider && hotelProvider !== selectedProvider) return false;

    const hotelCode = String((hotel as any).hotelCode || (hotel as any).hotelId || '').trim().toLowerCase();
    const selectedCode = String((selectedHotel as any).hotelCode || (selectedHotel as any).hotelId || '').trim().toLowerCase();
    if (hotelCode && selectedCode && hotelCode === selectedCode) return true;

    return normalizeHotelDisplayName((hotel as any).hotelName).toLowerCase() ===
      normalizeHotelDisplayName((selectedHotel as any).hotelName).toLowerCase();
  };

  // This handler runs before the expanded-card helpers are created inside the
  // row renderer. Keep its price ordering dependency at component scope so a
  // meal-plan change can select and persist a candidate without relying on an
  // out-of-scope local function.
  const sortHotelOptionsByPrice = (options: HotelRoomDetail[]): HotelRoomDetail[] =>
    [...options].sort((a, b) => {
      const priceA = getHotelDisplayAmount(a);
      const priceB = getHotelDisplayAmount(b);
      if (priceA !== priceB) return priceA - priceB;
      return getHotelOptionKey(a).localeCompare(getHotelOptionKey(b));
    });

  const cancelHotelSearch = (rowKey: string) => {
    setEditingFieldByStay((previous) => ({ ...previous, [rowKey]: null }));
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
                const isEmptyStay = !String(hotel.hotelName || '').trim();
                const resolvedDestination = getResolvedDestination(hotel);
                const effectiveRooms = getEffectiveRoomCount(hotel, roomCount);
                const routeDate = hotel.date || new Date().toISOString().split('T')[0];
                const rowGroupType = Number(activeGroupType || hotel.groupType || 1);
                const rowSelection = findHotelSelectionForStay(
                  selectedByGroup[rowGroupType],
                  hotel,
                  getStayKey,
                ) || findHotelSelectionForStay(
                  userSelectedByGroup?.[rowGroupType],
                  hotel,
                  getStayKey,
                );
                // The table row can come from the availability list while the
                // selected option is stored separately. Display rates must use
                // that authoritative selected option, otherwise the row can
                // show its old/base amount while the group total uses the new
                // selected amount.
                const pricedRow = rowSelection || hotel;
                const rowTotal = getHotelAmountWithRooms(pricedRow);
                const isExplicitPerDaySelection =
                  Boolean(userSelectedByGroup?.[rowGroupType]?.[rowKey]) ||
                  String((rowSelection as any)?.selectionOrigin || '').trim().toUpperCase() === 'USER_SELECTED';
                // The row's automatic hotel may have any supplier meal plan
                // when the itinerary has no global meal-plan preference. That
                // automatic choice must not become the visible user filter;
                // after Reset the initial filter is therefore "All meal
                // plans". Only an explicit per-day user selection overrides
                // the itinerary-level default.
                const rowMealPlanSource = (isExplicitPerDaySelection ? rowSelection || hotel : {}) as Record<string, unknown>;
                const rowMealPlan = getHotelMealPlanValue(rowMealPlanSource) ||
                  normalizeMealPlanLabel(String(mealPlanCode || ''));
                const persistedStayOptions = mergeHotelOptions(
                  getHotelsForStay(
                    localHotels,
                    Number(hotel.itineraryRouteId || hotel.routeId || 0),
                    String(hotel.date || ""),
                    Number(hotel.groupType || activeGroupType || 0),
                    Number(contextPlanId || 0),
                    Number(contextRoomCount || roomCount || 1),
                  ),
                  getHotelsForStay(
                    localRestrictedHotels,
                    Number(hotel.itineraryRouteId || hotel.routeId || 0),
                    String(hotel.date || ""),
                    Number(hotel.groupType || activeGroupType || 0),
                    Number(contextPlanId || 0),
                    Number(contextRoomCount || roomCount || 1),
                  ),
                );
                const refreshedStayOptions = refreshedOptionsByStay[rowKey] || [];
                // The expanded panel may have been opened before a selection
                // or availability update changed localHotels. Keep the latest
                // persisted options authoritative, while retaining any fresh
                // room details loaded for the currently expanded stay.
                const rowOptions = isExpanded
                  ? mergeHotelOptions(mergeHotelOptions(persistedStayOptions, refreshedStayOptions), roomDetails)
                  : mergeHotelOptions(persistedStayOptions, refreshedStayOptions);
                const selectedStayHotel = {
                  ...hotel,
                  ...(rowSelection || {}),
                  // Keep the persisted snapshot when the in-memory booking
                  // summary has not been hydrated with its meal-plan fields.
                  selectedPriceSnapshot:
                    (rowSelection as any)?.selectedPriceSnapshot ??
                    (hotel as any).selectedPriceSnapshot,
                } as HotelRoomDetail;
                const roomTypeFilter = getHotelRoomTypeValue(
                  selectedStayHotel as Record<string, unknown>,
                );
                const mealPlanFilter =
                  getHotelMealPlanValue(selectedStayHotel as Record<string, unknown>) || rowMealPlan;
                const visibleCardOptions = getVisibleHotelCardOptions(rowOptions);
                const noMatchingHotelCards = isExpanded &&
                  !isEmptyStay &&
                  !isExternalStay &&
                  visibleCardOptions.length === 0;
                // Keep every selectable rate for the persisted hotel here.
                // Card-level room/meal dropdowns are built from this complete
                // set; visibility de-duplication must not hide header choices.
                const selectedHotelOptions = rowOptions.filter((option) =>
                  isSameHotelIdentity(option, selectedStayHotel),
                ) as HotelRoomDetail[];
                if (selectedHotelOptions.length === 0 && isSelectableHotel(selectedStayHotel)) {
                  selectedHotelOptions.push(selectedStayHotel);
                }
                const roomTypeFilterOptions = getRoomTypeFilterOptions(
                  selectedHotelOptions as Array<Record<string, unknown>>,
                );
                const roomTypeScopedOptions = filterHotelsByRoomType(
                  selectedHotelOptions,
                  roomTypeFilter,
                );
                const mealPlanFilterOptions = Array.from(new Set([
                  ...getSelectableMealPlanFilterOptions(
                    roomTypeScopedOptions.filter((option) => isSelectableHotel(option)),
                  ),
                ])).sort((a, b) => a.localeCompare(b));
                const hotelChoicesByIdentity = new Map<string, HotelRoomDetail>();
                sortHotelOptionsByPrice(visibleCardOptions as HotelRoomDetail[]).forEach((option) => {
                  const identity = String(normalizeHotelIdentity(option) || '').trim() ||
                    normalizeHotelDisplayName(option.hotelName).toLowerCase();
                  if (identity && !hotelChoicesByIdentity.has(identity)) {
                    hotelChoicesByIdentity.set(identity, option);
                  }
                });
                const hotelChoices = Array.from(hotelChoicesByIdentity.values());
                const hotelSelectOptions = hotelChoices.map((option) => ({
                  value: getHotelOptionKey(option),
                  label: normalizeHotelDisplayName(option.hotelName),
                }));
                const selectedHotelOption = hotelChoices.find((option) =>
                  isSameHotelIdentity(option, selectedStayHotel),
                ) || hotelChoices[0];
                const selectedHotelOptionKey = selectedHotelOption
                  ? getHotelOptionKey(selectedHotelOption)
                  : '';
                const editingField = editingFieldByStay[rowKey] || null;
                const isRefreshingSelectedHotel = refreshingStayKey === rowKey;
                const selectBestMatchingHotel = async (
                  options: HotelRoomDetail[],
                  message: string,
                  actionOptions: { singleNightOnly?: boolean } = { singleNightOnly: true },
                  preferredProvider?: string,
                ) => {
                  const selectableOptions = options.filter((option) => isSelectableHotel(option));
                  const normalizedPreferredProvider = String(preferredProvider || '').trim().toLowerCase();
                  const preferredProviderOptions = normalizedPreferredProvider
                    ? selectableOptions.filter((option) =>
                        String(option.provider || '').trim().toLowerCase() === normalizedPreferredProvider,
                      )
                    : [];
                  const liveOptions = selectableOptions.filter(
                    (option) => String(option.provider || '').trim().toLowerCase() !== 'offline',
                  );
                  // A manual selection must keep its provider identity. In
                  // particular, an offline card may have a live duplicate for
                  // the same property; preferring live rates here silently
                  // changes the user's offline choice before it is persisted.
                  const candidatePool = preferredProviderOptions.length > 0
                    ? preferredProviderOptions
                    : liveOptions.length > 0 ? liveOptions : selectableOptions;
                  const candidate = sortHotelOptionsByPrice(candidatePool)[0];

                  if (!candidate) {
                    toast.warning(message);
                    return;
                  }

                  setEditingFieldByStay((previous) => ({ ...previous, [rowKey]: null }));
                  await handleChooseOrUpdateHotel(candidate, {
                    ...actionOptions,
                    keepExpanded: true,
                  });
                };

                const handleHotelChange = async (selectedHotel: HotelRoomDetail) => {
                  if (isUpdatingHotel || isRefreshingSelectedHotel) return;
                  const hotelName = normalizeHotelDisplayName(selectedHotel.hotelName);
                  const routeId = Number(
                    (selectedStayHotel as any).itineraryRouteId ||
                    (selectedStayHotel as any).routeId ||
                    (hotel as any).itineraryRouteId ||
                    (hotel as any).routeId ||
                    0,
                  );
                  const provider = String((selectedHotel as any).provider || '').trim().toLowerCase();
                  const hotelCode = String(
                    (selectedHotel as any).hotelCode ||
                    (selectedHotel as any).providerHotelCode ||
                    (selectedHotel as any).hotelId ||
                    '',
                  ).trim();

                  if (onRefreshSelectedHotel && routeId > 0 && provider && hotelCode) {
                    setRefreshingStayKey(rowKey);
                    toast.info(`Refreshing ${hotelName} availability...`);
                    try {
                      const result = await onRefreshSelectedHotel({
                        routeId,
                        provider,
                        hotelCode,
                        groupType: Number(activeGroupType || 0),
                      });
                      const refreshedOptions = Array.isArray(result?.hotels)
                        ? result.hotels as HotelRoomDetail[]
                        : [];
                      setRefreshedOptionsByStay((previous) => ({
                        ...previous,
                        [rowKey]: mergeHotelOptions(previous[rowKey] || [], refreshedOptions),
                      }));
                      if (refreshedOptions.length > 0) {
                        await selectBestMatchingHotel(
                          refreshedOptions,
                          `No selectable rate is available for ${hotelName}.`,
                          { singleNightOnly: false },
                          provider,
                        );
                      } else {
                        toast.warning(`No current rates are available for ${hotelName}.`);
                      }
                    } catch (error) {
                      console.error('Failed to refresh selected hotel rates', error);
                      toast.error(`Could not refresh ${hotelName} rates.`);
                    } finally {
                      setRefreshingStayKey((current) => current === rowKey ? null : current);
                    }
                    return;
                  }

                  const matchingHotelOptions = rowOptions.filter((option) =>
                    isSameHotelIdentity(option, selectedHotel),
                  );
                  await selectBestMatchingHotel(
                    matchingHotelOptions,
                    `No selectable rate is available for ${hotelName}.`,
                    { singleNightOnly: false },
                    provider,
                  );
                };

                const handleRoomTypeChange = async (selectedRoomType: string) => {
                  if (!selectedRoomType || isUpdatingHotel) return;
                  const selectableRoomTypeOptions = filterHotelsByRoomType(
                    selectedHotelOptions,
                    selectedRoomType,
                  ).filter((option) => isSelectableHotel(option));
                  const currentMealPlanOptions = mealPlanFilter
                    ? filterHotelsByMealPlan(selectableRoomTypeOptions, mealPlanFilter)
                    : [];
                  const matchingOptions = currentMealPlanOptions.length > 0
                    ? currentMealPlanOptions
                    : selectableRoomTypeOptions;
                  await selectBestMatchingHotel(
                    matchingOptions,
                    `No selectable ${selectedRoomType} room is available for ${normalizeHotelDisplayName(selectedStayHotel.hotelName)}.`,
                    { singleNightOnly: true },
                    String((selectedStayHotel as any).provider || '').trim().toLowerCase(),
                  );
                };

                const handleMealPlanChange = async (selectedMealPlan: string) => {
                  if (!selectedMealPlan || isUpdatingHotel) return;
                  const mealPlanOptions = filterHotelsByMealPlan(
                    roomTypeScopedOptions,
                    selectedMealPlan,
                  ).map((option) => ({
                    ...option,
                    // A supplier may expose MAP/AP/etc. through rateConditions
                    // while leaving the explicit rate field as CP. Persist the
                    // header's chosen meal plan as the canonical selection.
                    mealPlan: selectedMealPlan,
                    mealPlanCode: selectedMealPlan,
                  }));
                  await selectBestMatchingHotel(
                    mealPlanOptions,
                    `No selectable ${selectedMealPlan} rate is available for ${normalizeHotelDisplayName(selectedStayHotel.hotelName)}.`,
                    { singleNightOnly: true },
                    String((selectedStayHotel as any).provider || '').trim().toLowerCase(),
                  );
                };

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
                            if (!readOnly && loadingRowKey === null && !isEmptyStay) {
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
                                      ? `${normalizeHotelDisplayName(hotel.hotelName)} -${starCategory}*`
                                      : normalizeHotelDisplayName(hotel.hotelName);
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
                            {isExternalStay ? getMealPlanDisplay(hotel) : <MealPlanCell mealPlanText={getMealPlanDisplayLabel(hotel as Record<string, unknown>)} selectedCode={mealPlanCode} />}
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
                        !readOnly && loadingRowKey === null && !isEmptyStay ? "cursor-pointer hover:bg-[#f8f5fc]" : readOnly ? "cursor-default" : "cursor-not-allowed opacity-50"
                      }`}
                      onClick={() => {
                        // Only allow clicking if not in read-only mode and not loading
                        if (!readOnly && loadingRowKey === null && !isEmptyStay) {
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
                            {isEmptyStay || noMatchingHotelCards ? (
                              <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-amber-900">
                                <div className="font-semibold">
                                  {isEmptyStay
                                    ? `No live or offline hotels are available for this place${resolvedDestination !== '-' ? ` (${resolvedDestination})` : ''}`
                                    : 'No hotel options are available for this stay'}
                                </div>
                                <div className="mt-1 text-xs text-amber-800">
                                  {isEmptyStay
                                    ? String(hotel.availabilityMessage || 'No hotel options were found for this stay. Try another destination or route date.')
                                    : `No live or offline hotel cards are available for ${[
                                        roomTypeFilter ? `room type “${roomTypeFilter}”` : '',
                                        mealPlanFilter ? `meal plan “${mealPlanFilter}”` : '',
                                      ].filter(Boolean).join(' and ') || 'the current filters'}. Try “All room types”, “All meal plans”, or refresh availability.`}
                                </div>
                              </div>
                            ) : selectedStayHotel.hotelName
                              ? editingField === 'hotel' ? (
                                  <div className="min-w-0" onClick={(event) => event.stopPropagation()}>
                                    <AutoSuggestSelect
                                      mode="single"
                                      value={selectedHotelOptionKey}
                                      options={hotelSelectOptions}
                                      placeholder="Choose Hotel"
                                      disabled={isUpdatingHotel || isRefreshingSelectedHotel}
                                      stackingZIndex={60}
                                      onOpenChange={(open) => {
                                        if (!open && editingFieldByStay[rowKey] === 'hotel') {
                                          cancelHotelSearch(rowKey);
                                        }
                                      }}
                                      onChange={(value) => {
                                        const selectedKey = String(value || '');
                                        const selectedOption = hotelChoices.find(
                                          (option) => getHotelOptionKey(option) === selectedKey,
                                        );
                                        if (selectedOption) void handleHotelChange(selectedOption);
                                      }}
                                    />
                                  </div>
                                ) : (
                                  <div className="flex items-center gap-2">
                                    <span>
                                      {(() => {
                                  const starCategory = normalizeHotelStarCategory((selectedStayHotel as any).hotelCategory ?? selectedStayHotel.category);
                                  return starCategory
                                    ? `${normalizeHotelDisplayName(selectedStayHotel.hotelName)} -${starCategory}*`
                                    : normalizeHotelDisplayName(selectedStayHotel.hotelName);
                                })()}
                                    </span>
                                    {String((selectedStayHotel as any).provider || '').trim().toLowerCase() === 'offline' && (
                                      <span className="inline-flex shrink-0 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-800" title="Offline hotel - subject to hotel approval">
                                        OFFLINE
                                      </span>
                                    )}
                                    {isRefreshingSelectedHotel && <Loader2 className="h-3.5 w-3.5 animate-spin text-[#7c3aed]" aria-label="Refreshing hotel availability" />}
                                    {!readOnly && hotelChoices.length > 1 && <button type="button" aria-label={`Edit hotel for ${hotel.day || 'day'}`} className="rounded p-1 text-[#7c3aed] hover:bg-[#f1e9fb] disabled:cursor-not-allowed disabled:opacity-50" disabled={isUpdatingHotel || isRefreshingSelectedHotel} onClick={(event) => { event.stopPropagation(); setEditingFieldByStay((previous) => ({ ...previous, [rowKey]: 'hotel' })); }}><Pencil className="h-3.5 w-3.5" aria-hidden="true" /></button>}
                                  </div>
                                )
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
                        <div className="flex items-center justify-between gap-2">
                          {isExternalStay ? (
                            getRoomTypeDisplay(hotel)
                          ) : editingField === 'roomType' && roomTypeFilterOptions.length > 1 ? (
                            <select
                              autoFocus
                              aria-label={`Select room type for ${hotel.day || 'day'}`}
                              title="Room types available for the selected hotel."
                              className="max-w-full truncate rounded-md border border-[#8e59cf] bg-white px-2 py-1 text-xs font-semibold text-[#4a4260] outline-none"
                              value={roomTypeFilter}
                              disabled={isUpdatingHotel || isRefreshingSelectedHotel}
                              onClick={(event) => event.stopPropagation()}
                              onBlur={() => setEditingFieldByStay((previous) => ({ ...previous, [rowKey]: null }))}
                              onChange={(event) => {
                                event.stopPropagation();
                                void handleRoomTypeChange(event.target.value);
                              }}
                            >
                              {roomTypeFilterOptions.map((option) => (
                                <option key={option} value={option}>
                                  {option}
                                </option>
                              ))}
                            </select>
                          ) : (
                            <div className="flex items-center gap-2">
                              <span>
                               {effectiveRooms > 1 && roomTypeFilterOptions.length > 1
                                 ? `${effectiveRooms} Rooms Selected`
                                 : (roomTypeFilter || getRoomTypeDisplay(selectedStayHotel))}
                              </span>
                              {!readOnly && roomTypeFilterOptions.length > 1 && <button type="button" aria-label={`Edit room type for ${hotel.day || 'day'}`} className="rounded p-1 text-[#7c3aed] hover:bg-[#f1e9fb] disabled:cursor-not-allowed disabled:opacity-50" disabled={isUpdatingHotel || isRefreshingSelectedHotel} onClick={(event) => { event.stopPropagation(); setEditingFieldByStay((previous) => ({ ...previous, [rowKey]: 'roomType' })); }}><Pencil className="h-3.5 w-3.5" aria-hidden="true" /></button>}
                            </div>
                          )}
                        </div>
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
                          ) : editingField === 'mealPlan' && mealPlanFilterOptions.length > 1 ? (
                            <select
                              autoFocus
                              aria-label={`Select meal plan for ${hotel.day || 'day'}`}
                              title="Meal plans available for the selected hotel and room type."
                              className="max-w-full truncate rounded-md border border-[#8e59cf] bg-white px-2 py-1 text-xs font-semibold text-[#4a4260] outline-none"
                              value={mealPlanFilter || ''}
                              disabled={isUpdatingHotel || isRefreshingSelectedHotel}
                              onClick={(event) => event.stopPropagation()}
                              onBlur={() => setEditingFieldByStay((previous) => ({ ...previous, [rowKey]: null }))}
                              onChange={(event) => {
                                event.stopPropagation();
                                void handleMealPlanChange(event.target.value);
                              }}
                            >
                              {mealPlanFilterOptions.map((option) => (
                                <option key={option} value={option}>
                                  {option}
                                </option>
                              ))}
                            </select>
                          ) : (
                            <div className="flex items-center gap-2">
                              <MealPlanCell mealPlanText={mealPlanFilter || getMealPlanDisplayLabel(selectedStayHotel as Record<string, unknown>)} selectedCode={mealPlanFilter || mealPlanCode} />
                              {!readOnly && mealPlanFilterOptions.length > 1 && <button type="button" aria-label={`Edit meal plan for ${hotel.day || 'day'}`} className="rounded p-1 text-[#7c3aed] hover:bg-[#f1e9fb] disabled:cursor-not-allowed disabled:opacity-50" disabled={isUpdatingHotel || isRefreshingSelectedHotel} onClick={(event) => { event.stopPropagation(); setEditingFieldByStay((previous) => ({ ...previous, [rowKey]: 'mealPlan' })); }}><Pencil className="h-3.5 w-3.5" aria-hidden="true" /></button>}
                            </div>
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
                          ) : rowOptions.length === 0 ? (
                            <div className="text-center py-4 text-[#6c6c6c]">
                              No room details available for this day.
                            </div>
                          ) : (
                            <>
                              {/* Search Box + Sync Button */}
                              <div className="flex justify-between items-center mb-4 gap-3">
                                <div className="text-xs text-[#6c6380] whitespace-nowrap">
                                  Showing {mealPlanFilter || 'all meal plans'}
                                </div>
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
                                // A displayed row is only a summary. Do not
                                // treat it as selected when there is no actual
                                // persisted or user selection for the stay.
                                const selectedForStay = findHotelSelectionForStay(
                                  selectedByGroup[groupType],
                                  hotel,
                                  getStayKey,
                                ) || findHotelSelectionForStay(
                                  userSelectedByGroup?.[groupType],
                                  hotel,
                                  getStayKey,
                                ) || (
                                  // The day row is the authoritative persisted
                                  // selection while the selection maps reconcile.
                                  // Use it as a fallback so a header selection is
                                  // immediately marked and promoted first.
                                  isSelectableHotel(hotel) ? hotel : undefined
                                );
                                const selectedHotelId = Number((selectedForStay as any)?.hotelId || 0);
                                const selectedBookingCode = String((selectedForStay as any)?.bookingCode || '').trim();

                                const selectedOptionKey = selectedForStay ? getHotelOptionKey(selectedForStay) : '';
                                // Header values describe the persisted selected rate;
                                // they must not filter the recommendation-wide card list.
                                // Card-level room and meal controls remain scoped to each
                                // hotel's own options below.
                                const visibleRoomDetails = rowOptions;

                                const filtered = visibleRoomDetails.filter((h) =>
                                  h.hotelName?.toLowerCase().includes(hotelSearchQuery.toLowerCase()),
                                );

                                const sorted = [...filtered].sort((a, b) => {
                                  const aIsOffline = String(a.provider || '').trim().toLowerCase() === 'offline';
                                  const bIsOffline = String(b.provider || '').trim().toLowerCase() === 'offline';
                                  const aSelected = getSelectedHotelMatch(a, selectedForStay);
                                  const bSelected = getSelectedHotelMatch(b, selectedForStay);

                                  // Always surface the selected hotel first. Sort the remaining
                                  // live and offline sections independently by total rate.
                                  if (aSelected && !bSelected) return -1;
                                  if (!aSelected && bSelected) return 1;

                                  if (aIsOffline !== bIsOffline) return aIsOffline ? 1 : -1;

                                  const amountDifference = getHotelDisplayAmount(a) - getHotelDisplayAmount(b);
                                  if (amountDifference !== 0) return amountDifference;

                                  return getHotelOptionKey(a).localeCompare(getHotelOptionKey(b));
                                });

                                // Hide offline duplicates when the same property has a live result.
                                // Keep a selected offline option visible so an existing choice is never lost.
                                const getHotelPropertyIdentityKey = (h: any) => {
                                   const hotelName = normalizeHotelDisplayName(h.hotelName)
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
                                   const isSelectedOffline = getSelectedHotelMatch(hotel, selectedForStay);
                                  return !propertyKey || !livePropertyKeys.has(propertyKey) || isSelectedOffline;
                                });

                                // Group by hotel identity while keeping card state isolated by
                                // recommendation group and logical stay.
                                const getHotelIdentityKey = (h: any) => {
                                  const groupType = Number(activeGroupType || h.groupType || 1);
                                  const provider = String(h.provider || '').trim().toLowerCase();
                                  const hotelCode = String(
                                    h.hotelCode ||
                                    h.providerHotelCode ||
                                    h.hotelId ||
                                    '',
                                  ).trim().toLowerCase();
                                  const hotelName = String(h.hotelName || '').trim().toLowerCase();
                                  const propertyIdentity = hotelCode || hotelName;
                                  return `${groupType}|${rowKey}|${propertyIdentity}|${provider}`;
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
                                    ? filteredByRoomType.filter((option) => {
                                        const optionMealPlans = getSelectableMealPlanCodes(option as Record<string, unknown>)
                                          .map((value) => normalizeMealPlanLabel(value).trim().toLowerCase());
                                        const explicitMealPlan = normalizeMealPlanLabel(option.mealPlan).trim().toLowerCase();
                                        return optionMealPlans.includes(normalizedMealPlan) || explicitMealPlan === normalizedMealPlan;
                                      })
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
                                  const { filteredByMealPlan } = filterOptions(
                                    options,
                                    preferredRoomType,
                                    preferredMealPlan,
                                  );

                                  const selectableOptions = filteredByMealPlan.filter(
                                    (option) => isSelectableHotel(option),
                                  );
                                  const candidatePool = selectableOptions.length > 0
                                    ? selectableOptions
                                    : filteredByMealPlan;

                                  return sortOptionsByPrice(candidatePool)[0];
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

                                // One card per hotel. A persisted selection is the default, but an
                                // explicit room/meal choice made in the card must win until the
                                // user clicks Update. Otherwise the select visually changes and
                                // the next render silently switches back to the persisted option.
                                const deduped = Array.from(hotelGroups.entries()).map(([identKey, options]) => {
                                  const manualKey = selectedRoomTypeByHotel[identKey];
                                  const manualMealPlan = normalizeMealPlanLabel(selectedMealPlanByHotel[identKey] || '').trim().toLowerCase();

                                  const selectedOption =
                                    selectedOptionKey !== ''
                                      ? options.find((o) => getHotelOptionKey(o) === selectedOptionKey)
                                      : undefined;

                                  const manualOption =
                                    manualKey
                                      ? options.find((o) => getHotelOptionKey(o) === manualKey)
                                      : undefined;

                                  const manualMealOption = manualMealPlan
                                    ? options.find((option) =>
                                        getSelectableMealPlanCodes(option as Record<string, unknown>)
                                          .some((value) => normalizeMealPlanLabel(value).trim().toLowerCase() === manualMealPlan),
                                      )
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
                                    manualMealOption ||
                                    selectedOption ||
                                    fairSelectableOption ||
                                    findBestOption(options) ||
                                    options[0];
                                  // The selected API rate is authoritative for
                                  // price, room, meal plan, and booking identity.
                                  // Never overwrite it with a display-only meal
                                  // label from rate conditions.
                                  return { identKey, active, options };
                                });

                                return deduped.map(({ identKey, active: hotel, options: roomTypeOptions }) => {
                                const roomKey = `hotel-${identKey}`;
                                const hasExactSelectedOption = selectedOptionKey !== '' &&
                                  roomTypeOptions.some((option) => getHotelOptionKey(option) === selectedOptionKey);
                                const activeOptionKey = getHotelOptionKey(hotel);
                                const isSelected = Boolean(selectedForStay) && (hasExactSelectedOption
                                  ? activeOptionKey === selectedOptionKey
                                  : getSelectedHotelMatch(hotel, selectedForStay));
                                const isSameSelectedHotel = Boolean(
                                  selectedForStay && isSameHotelIdentity(hotel, selectedForStay),
                                );
                                const isPendingRateUpdate = Boolean(
                                  selectedForStay && isSameSelectedHotel && !isSelected &&
                                  selectedRoomTypeByHotel[identKey] &&
                                  activeOptionKey !== selectedOptionKey,
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
                                 const activeCardOptionKey = String(
                                   selectedRoomTypeByHotel[identKey] || (isSelected ? selectedOptionKey : ''),
                                 ).trim();
                                 const activeCardOption = activeCardOptionKey
                                   ? roomTypeOptions.find((option) => getHotelOptionKey(option) === activeCardOptionKey)
                                   : undefined;
                                 const mealPlanPreview = mealPlanPreviewAmountByHotel[identKey];
                                 const currentHotelAmount = mealPlanPreview?.optionKey === activeOptionKey
                                   ? mealPlanPreview.amount
                                   : getHotelDisplayAmount(activeCardOption || hotel);
                                const selectableRoomTypeOptions = roomTypeOptions.filter((option) => isSelectableHotel(option));
                                const displayPricedOptions = selectableRoomTypeOptions.length > 0
                                  ? selectableRoomTypeOptions
                                  : roomTypeOptions;
                                 const startingFromAmount = activeCardOption
                                   ? currentHotelAmount
                                   : getLowestRoomTypeAmount(displayPricedOptions) || currentHotelAmount;
                                const startingFromBaseAmount = getLowestRoomTypeBaseAmount(displayPricedOptions);
                                const priceDifference = currentHotelAmount - selectedHotelAmount;
                                const showDifferenceBadge = !isSelected && selectedHotelAmount > 0 && currentHotelAmount > 0;
                                const activeRoomTypeValue = String(hotel.roomTypeName || hotel.roomType || 'Standard').trim();
                                const activeMealPlanValue =
                                  normalizeMealPlanLabel(selectedMealPlanByHotel[identKey] || '') ||
                                  getMealPlanCodes(hotel as Record<string, unknown>)[0] ||
                                  normalizeMealPlanLabel(hotel.mealPlan);
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
                                    roomTypeScopedOptions.flatMap((option) =>
                                      getSelectableMealPlanCodes(option as Record<string, unknown>)
                                        .map((mealPlanValue) => [mealPlanValue.toLowerCase(), mealPlanValue] as const),
                                    ),
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
                                              : providerKey === 'offline' ? 'OFFLINE'
                                              : String(hotel.provider || '').toUpperCase();
                                          const providerBadgeClass =
                                            providerKey === 'offline'
                                              ? 'bg-amber-500 text-white'
                                              : providerKey === 'resavenue'
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
                                  {normalizeHotelDisplayName(hotel.hotelName)}
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
                                      <div className="mb-1 flex items-center justify-between gap-2">
                                        <label className="block text-xs font-medium text-[#4a4260]">
                                          Room Type{isSelected ? ` - ${effectiveRooms} Room${effectiveRooms === 1 ? '' : 's'} Selected` : ''}
                                        </label>
                                         {(!readOnly && effectiveRooms > 1) && (
                                          <button
                                            type="button"
                                            className="text-xs font-semibold text-[#7c3aed] underline underline-offset-2 hover:text-[#5b21b6]"
                                            aria-label="Edit room categories"
                                            title="Edit room categories"
                                            onClick={(event) => {
                                              event.stopPropagation();
                                              setRoomSelectionModal({
                                                open: true,
                                                itinerary_plan_hotel_details_ID: Number((hotel as any).itineraryPlanHotelDetailsId || (hotel as any).itinerary_plan_hotel_details_ID || 0),
                                                itinerary_plan_id: Number((hotel as any).itineraryPlanId || (hotel as any).itinerary_plan_id || context.planId || 0),
                                                itinerary_route_id: Number((hotel as any).itineraryRouteId || (hotel as any).routeId || 0),
                                                hotel_id: Number((hotel as any).hotelId || (hotel as any).hotel_id || 0),
                                                group_type: Number(activeGroupType || 1),
                                                hotel_name: String((hotel as any).hotelName || ''),
                                                hotel_code: String(
                                                  (hotel as any).hotelCode ||
                                                  (hotel as any).providerHotelCode ||
                                                  '',
                                                ).trim() || undefined,
                                                 provider: String((hotel as any).provider || '').trim().toLowerCase() || undefined,
                                                 selected_room_type_title: String((hotel as any).roomType || (hotel as any).roomTypeName || '').trim() || undefined,
                                               });
                                            }}
                                          >
                                            <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
                                          </button>
                                        )}
                                      </div>
                                       {effectiveRooms === 1 && roomTypeVariants.length > 1 ? (
                                        <select
                                        className="w-full max-w-full truncate rounded-md border border-[#e5d9f2] bg-white px-2 py-1 text-[11px] font-semibold text-[#4a4260] outline-none focus:border-[#7c3aed]"
                                          value={activeRoomTypeValue}
                                          disabled={isUpdatingHotel || mealPlanPreviewKey?.startsWith(`${identKey}:`)}
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
                                           {effectiveRooms > 1
                                             ? `${effectiveRooms} Rooms Selected`
                                             : isExternalStayRow(hotel)
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
                                            const selectedMealPlan = e.target.value;
                                            const selectedOption = findExactOption(
                                              roomTypeScopedOptions,
                                              activeRoomTypeValue,
                                              selectedMealPlan,
                                            );

                                            if (!selectedOption) {
                                              toast.warning(
                                                `${selectedMealPlan} is not available for ${activeRoomTypeValue} in this hotel.`,
                                              );
                                              return;
                                            }

                                            const previousMealPlan = selectedMealPlanByHotel[identKey] || activeMealPlanValue;
                                            const routeId = toNumber(
                                              (selectedOption as any).itineraryRouteId ||
                                                (selectedOption as any).itinerary_route_id ||
                                                (selectedOption as any).routeId ||
                                                (hotel as any).itineraryRouteId ||
                                                (hotel as any).itinerary_route_id ||
                                                (hotel as any).routeId,
                                              0,
                                            );
                                            const previewAmount = getHotelDisplayAmount(selectedOption);
                                            const previewCheckInDate = String(
                                              (selectedOption as any).checkInDate ||
                                                (selectedOption as any).date ||
                                                (hotel as any).checkInDate ||
                                                (hotel as any).date ||
                                                '',
                                            ).trim();
                                            const previewCheckOutDate = String(
                                              (selectedOption as any).checkOutDate ||
                                                (hotel as any).checkOutDate ||
                                                '',
                                            ).trim() || (() => {
                                              if (!/^\d{4}-\d{2}-\d{2}$/.test(previewCheckInDate)) return '';
                                              const nextDate = new Date(`${previewCheckInDate}T00:00:00.000Z`);
                                              nextDate.setUTCDate(nextDate.getUTCDate() + 1);
                                              return nextDate.toISOString().slice(0, 10);
                                            })();
                                            const selectionPreview = {
                                              provider: String((selectedOption as any).provider || (hotel as any).provider || '').trim().toLowerCase(),
                                              hotelCode: String(
                                                (selectedOption as any).hotelCode ||
                                                  (selectedOption as any).providerHotelCode ||
                                                  (selectedOption as any).hotelId ||
                                                  (hotel as any).hotelCode ||
                                                  (hotel as any).providerHotelCode ||
                                                  '',
                                              ).trim(),
                                              bookingCode: String(
                                                (selectedOption as any).bookingCode ||
                                                  (selectedOption as any).searchReference ||
                                                  '',
                                              ).trim(),
                                              rateOptionId: String((selectedOption as any).rateOptionId || '').trim() || undefined,
                                              optionKey: String(getHotelOptionKey(selectedOption) || '').trim() || undefined,
                                              roomType: String(
                                                (selectedOption as any).roomTypeName ||
                                                  (selectedOption as any).roomType ||
                                                  activeRoomTypeValue,
                                              ).trim(),
                                              mealPlan: String(
                                                (selectedOption as any).mealPlan || selectedMealPlan,
                                              ).trim(),
                                              netAmount: previewAmount,
                                              totalAmountAfterTax: previewAmount,
                                              totalPrice: previewAmount,
                                              pricePerNight: previewAmount,
                                              hotelName: String((selectedOption as any).hotelName || hotel.hotelName || '').trim(),
                                              checkInDate: previewCheckInDate,
                                              checkOutDate: previewCheckOutDate,
                                              // The option may originate from another recommendation package;
                                              // preview ownership always follows the active target tab.
                                              groupType: Number(activeGroupType),
                                              routeId,
                                              searchReference: String((selectedOption as any).searchReference || '').trim() || undefined,
                                              roomId: String((selectedOption as any).roomId || '').trim() || undefined,
                                              rateId: String((selectedOption as any).rateId || '').trim() || undefined,
                                              roomCount: Number((hotel as any).noOfRooms ?? roomCount ?? 1),
                                              roomSelections: Array.isArray((selectedOption as any).roomSelections)
                                                ? (selectedOption as any).roomSelections
                                                : undefined,
                                            };

                                            setSelectedMealPlanByHotel(prev => ({
                                              ...prev,
                                              [identKey]: selectedMealPlan,
                                            }));
                                              setSelectedRoomTypeByHotel(prev => ({
                                              ...prev,
                                              [identKey]: getHotelOptionKey(selectedOption),
                                            }));
                                            setMealPlanPreviewAmountByHotel(prev => ({
                                              ...prev,
                                              [identKey]: {
                                                optionKey: getHotelOptionKey(selectedOption),
                                                amount: previewAmount,
                                              },
                                            }));

                                            // Changing a meal plan must be priced by the API. Keep this as a
                                            // preview only: a non-selected hotel must not become selected just
                                            // because its card dropdown was changed. The existing Choose/Confirm
                                            // flow remains responsible for persistence.
                                            if (onTemporarySelectionCostPreview && routeId > 0 && selectionPreview.provider && selectionPreview.hotelCode) {
                                              const previewKey = `${identKey}:${getHotelOptionKey(selectedOption)}`;
                                              setMealPlanPreviewKey(previewKey);
                                              void onTemporarySelectionCostPreview({ [routeId]: selectionPreview })
                                                .then((result: any) => {
                                                  if (!result) throw new Error('Meal-plan price preview failed');
                                                  const selections = result && typeof result === 'object' && 'selections' in result
                                                    ? result.selections
                                                    : result;
                                                  const refreshed = selections?.[routeId];
                                                  if (refreshed) {
                                                    const amount = Number(
                                                      refreshed.totalAmountAfterTax ??
                                                        refreshed.totalPrice ??
                                                        refreshed.netAmount ??
                                                        previewAmount,
                                                    );
                                                    if (Number.isFinite(amount) && amount >= 0) {
                                                      setMealPlanPreviewAmountByHotel(prev => ({
                                                        ...prev,
                                                        [identKey]: {
                                                          optionKey: getHotelOptionKey(selectedOption),
                                                          amount,
                                                        },
                                                      }));
                                                    }
                                                  }
                                                })
                                                .catch(() => {
                                                  setSelectedMealPlanByHotel(prev => ({ ...prev, [identKey]: previousMealPlan }));
                                                  setSelectedRoomTypeByHotel(prev => ({
                                                    ...prev,
                                                    [identKey]: getHotelOptionKey(
                                                      findExactOption(roomTypeScopedOptions, activeRoomTypeValue, previousMealPlan) || hotel,
                                                    ),
                                                  }));
                                                })
                                                .finally(() => setMealPlanPreviewKey(current => current === previewKey ? null : current));
                                            }
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
                                        disabled={(isSelected && !isPendingRateUpdate) || !isSelectable || isUpdatingHotel}
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
                                const routeMeta = Object.values(routePagination || {})
                                  .filter((meta) =>
                                    Number(meta?.groupType || 0) > 0 &&
                                    Boolean(meta?.hasMore) &&
                                    routePagination?.[`${Number(meta?.groupType || 0)}-${routeId}`] === meta,
                                  )
                                  .sort(
                                    (left, right) =>
                                      Number(left?.groupType || 0) - Number(right?.groupType || 0),
                                  )[0];
                                if (!routeMeta) return null;

                                const paginationGroupType = Number(routeMeta.groupType || activeGroupType);

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
                                        onLoadMore?.(paginationGroupType, routeId, Number(routeMeta?.page || 1) + 1);
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
