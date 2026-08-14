import type { ItineraryHotelRow, ItineraryHotelTab } from "../ItineraryDetails";
import type { ItineraryHotelSelectionGroupState } from "../itinerary-details/itinerary-details.types";

type GroupTotalsHelpers = {
  getStayKey: (hotel: ItineraryHotelRow) => string;
  getHotelOptionKey: (hotel: ItineraryHotelRow) => string;
  sortStayGroupsByDate: (groups: ItineraryHotelRow[][]) => ItineraryHotelRow[][];
  isSelectableHotel: (hotel?: ItineraryHotelRow | null) => boolean;
  findMatchingRoomMealInStay: (
    stayHotels: ItineraryHotelRow[],
    previousSelectedHotel?: ItineraryHotelRow | null,
  ) => ItineraryHotelRow | null;
  getAutoSelectableHotelsRespectingPreviousRoomMeal: (
    stayHotels: ItineraryHotelRow[],
    previousSelectedHotel?: ItineraryHotelRow | null,
  ) => ItineraryHotelRow[];
  isPlaceholderHotel: (hotel?: ItineraryHotelRow | null) => boolean;
  getHotelAmountWithRooms: (hotel: ItineraryHotelRow) => number;
};

type UseHotelGroupTotalsArgs = {
  localHotels: ItineraryHotelRow[];
  selectedByGroup: Record<number, Record<string, ItineraryHotelRow>>;
  userSelectedByGroup: Record<number, Record<string, ItineraryHotelRow>>;
  /** Legacy server package totals used only when the explicit selection state is absent. */
  recommendationTabs?: ItineraryHotelTab[];
  /** Committed server-owned route selection and package total state. */
  hotelSelectionState?: ItineraryHotelSelectionGroupState[];
  // Availability snapshots can retain rows from an earlier route/date set.
  // Totals must use the same current route scope as the table.
  activeRouteIds?: number[];
  activeStayRoutes?: Array<{ routeId: number; date?: string }>;
  helpers: GroupTotalsHelpers;
};

type HotelRowScopeFields = ItineraryHotelRow & {
  routeId?: unknown;
  deleted?: unknown;
  itineraryRouteDate?: unknown;
};

export function useHotelGroupTotals({
  localHotels,
  selectedByGroup,
  userSelectedByGroup,
  recommendationTabs = [],
  hotelSelectionState = [],
  activeRouteIds = [],
  activeStayRoutes = [],
  helpers,
}: UseHotelGroupTotalsArgs) {
  const normalizeDate = (value: unknown): string => {
    const raw = String(value ?? "").trim();
    if (!raw) return "";
    const isoDate = raw.match(/\d{4}-\d{2}-\d{2}/)?.[0];
    return isoDate || raw.slice(0, 10);
  };

  const currentRouteDateMap = new Map<number, Set<string>>();
  activeStayRoutes.forEach((route) => {
    const routeId = Number(route.routeId);
    if (!Number.isFinite(routeId) || routeId <= 0) return;
    const date = normalizeDate(route.date);
    const dates = currentRouteDateMap.get(routeId) || new Set<string>();
    if (date) dates.add(date);
    currentRouteDateMap.set(routeId, dates);
  });

  const currentRouteIdSet = new Set<number>([
    ...Array.from(currentRouteDateMap.keys()),
    ...activeRouteIds
      .map((routeId) => Number(routeId))
      .filter((routeId) => Number.isFinite(routeId) && routeId > 0),
  ]);

  const isActiveHotelRow = (hotel?: ItineraryHotelRow | null): boolean => {
    if (!hotel) return false;
    const scopedHotel = hotel as HotelRowScopeFields;
    if (Number(scopedHotel.deleted || 0) === 1) return false;
    return String(scopedHotel.selectionStatus || "").trim().toUpperCase() !== "DELETED";
  };

  const getHotelDate = (hotel: ItineraryHotelRow): string => normalizeDate(
    hotel.date ||
    hotel.checkInDate ||
    hotel.hotelCheckInDate ||
    (hotel as HotelRowScopeFields).itineraryRouteDate,
  );

  const getCurrentLogicalStayKey = (hotel: ItineraryHotelRow): string => {
    const scopedHotel = hotel as HotelRowScopeFields;
    const routeIds = [
      Number(scopedHotel.itineraryRouteId || scopedHotel.routeId || 0),
      ...(Array.isArray(scopedHotel.routeIds) ? scopedHotel.routeIds.map(Number) : []),
    ]
      .filter((routeId) => Number.isFinite(routeId) && routeId > 0 && currentRouteIdSet.has(routeId))
      .filter((routeId, index, ids) => ids.indexOf(routeId) === index)
      .sort((left, right) => left - right);
    const directRouteId = routeIds[0];
    const hotelDate = getHotelDate(hotel);
    const activeDate = directRouteId
      ? Array.from(currentRouteDateMap.get(directRouteId) || [])[0] || ""
      : "";
    return `${routeIds.join(",")}::${hotelDate || activeDate}`;
  };

  const getHotelRouteIds = (hotel: ItineraryHotelRow): number[] => {
    const scopedHotel = hotel as HotelRowScopeFields;
    return Array.from(new Set([
      Number(scopedHotel.itineraryRouteId || scopedHotel.routeId || 0),
      ...(Array.isArray(scopedHotel.routeIds) ? scopedHotel.routeIds.map(Number) : []),
    ].filter((routeId) => Number.isFinite(routeId) && routeId > 0)));
  };

  const selectionPriority = (hotel: ItineraryHotelRow): number => {
    if (String(hotel.selectionOrigin || "").toUpperCase() === "USER_SELECTED") return 4;
    if (hotel.isSelected === true) return 3;
    if (Number(hotel.selectionId || 0) > 0) return 2;
    return 0;
  };

  const belongsToCurrentRouteSet = (hotel: ItineraryHotelRow): boolean => {
    if (currentRouteIdSet.size === 0) return true;

    const scopedHotel = hotel as HotelRowScopeFields;
    const directRouteId = Number(
      scopedHotel.itineraryRouteId || scopedHotel.routeId || 0,
    );
    const relatedRouteIds = Array.isArray(scopedHotel.routeIds)
      ? scopedHotel.routeIds
          .map((routeId: unknown) => Number(routeId))
          .filter((routeId: number) => Number.isFinite(routeId) && routeId > 0)
      : [];
    const candidateRouteIds = [directRouteId, ...relatedRouteIds].filter(
      (routeId, index, routeIds) => routeId > 0 && routeIds.indexOf(routeId) === index,
    );
    const currentCandidateRouteIds = candidateRouteIds.filter((routeId) =>
      currentRouteIdSet.has(routeId),
    );
    if (currentCandidateRouteIds.length === 0) return false;

    // Route IDs alone are not enough after an itinerary date edit: an old
    // availability row can retain the same route ID while carrying the old
    // route date. When date metadata is available, require it to match the
    // active route-date pair.
    const hotelDate = getHotelDate(hotel);
    if (!hotelDate || currentRouteDateMap.size === 0) return true;
    return currentCandidateRouteIds.some((routeId) => {
      const allowedDates = currentRouteDateMap.get(routeId);
      return !allowedDates || allowedDates.size === 0 || allowedDates.has(hotelDate);
    });
  };

  const getSelectedHotelsForGroup = (groupType: number): ItineraryHotelRow[] => {
    // The normalized cache is hydrated exclusively from hotelSelectionState.
    // When the new contract is present, do not rediscover a route selection
    // from availability rows. The longer branch below is legacy-response
    // compatibility only.
    if (hotelSelectionState.length > 0) {
      return Object.values(selectedByGroup[groupType] || {}).filter(
        (hotel) => isActiveHotelRow(hotel) && belongsToCurrentRouteSet(hotel),
      );
    }
    const groupHotels = localHotels.filter((hotel) =>
      Number(hotel.groupType || 0) === Number(groupType) &&
      isActiveHotelRow(hotel) &&
      belongsToCurrentRouteSet(hotel),
    );
    // A previous-night early-arrival marker is explanatory metadata, not a
    // second hotel stay. Keep it out of totals while retaining a fallback for
    // malformed/legacy payloads that contain only the marker row.
    const nonSyntheticHotels = groupHotels.filter(
      (hotel) => !hotel.previousDayBillingSynthetic,
    );
    const hotelsForGroup = nonSyntheticHotels.length > 0 ? nonSyntheticHotels : groupHotels;
    if (!hotelsForGroup.length) return [];

    // Multiple persisted records can represent the same current route/date
    // while carrying different legacy stayKey values. The table renders one
    // logical row, so totals must group by the canonical route/date identity.
    const groupedByStay = new Map<string, ItineraryHotelRow[]>();
    hotelsForGroup.forEach((hotel) => {
      const stayKey = getCurrentLogicalStayKey(hotel);
      groupedByStay.set(stayKey, [...(groupedByStay.get(stayKey) || []), hotel]);
    });

    const selectedHotels: ItineraryHotelRow[] = [];
    let previousSelectedHotel: ItineraryHotelRow | null = null;

    helpers.sortStayGroupsByDate(Array.from(groupedByStay.values())).forEach((stayHotels) => {
      const stayKeys = new Set(stayHotels.map((hotel) => helpers.getStayKey(hotel)));
      const currentStayKey = getCurrentLogicalStayKey(stayHotels[0]);
      const stayRouteIds = new Set(getHotelRouteIds(stayHotels[0]));
      const stayDate = getHotelDate(stayHotels[0]);
      const selectionMatchesCurrentStay = (selection: ItineraryHotelRow): boolean => {
        const routeMatches = getHotelRouteIds(selection).some((routeId) => stayRouteIds.has(routeId));
        if (!routeMatches) return false;
        const selectionDate = getHotelDate(selection);
        return !stayDate || !selectionDate || stayDate === selectionDate;
      };
      const resolveSelection = (selection?: ItineraryHotelRow): ItineraryHotelRow | null => {
        if (
          !selection ||
          !isActiveHotelRow(selection) ||
          !belongsToCurrentRouteSet(selection) ||
          !selectionMatchesCurrentStay(selection)
        ) return null;
        const matchingRow = stayHotels.find((candidate) =>
          helpers.getHotelOptionKey(candidate) === helpers.getHotelOptionKey(selection),
        );
        // A confirmed selection can briefly be absent from the latest
        // availability array (for example immediately after selecting a
        // different room/rate). Keep the explicit selection as the financial
        // source of truth instead of falling back to the previous row.
        if (matchingRow && helpers.isSelectableHotel(matchingRow)) return matchingRow;
        return helpers.isSelectableHotel(selection) ? selection : null;
      };
      const selectionBelongsToStay = (stayKey: string, selection: ItineraryHotelRow): boolean => {
        if (stayKeys.has(stayKey) || selectionMatchesCurrentStay(selection)) return true;

        // Availability reconciliation can replace a legacy stayKey while
        // keeping the same route/date. Recommendation totals must follow the
        // logical stay identity used by the table, otherwise switching tabs
        // can resurrect an older rate for the inactive tab.
        return getCurrentLogicalStayKey(selection) === currentStayKey;
      };
      const userSelections = Object.entries(userSelectedByGroup[groupType] || {})
        .filter(([key, selection]) => selectionBelongsToStay(key, selection))
        .map(([, selection]) => {
          const resolvedSelection = resolveSelection(selection);
          if (resolvedSelection) return resolvedSelection;

          // A confirmed manual selection can legitimately be absent from the
          // latest inventory array after the parent availability state is
          // reconciled. The selection-cost preview and /hotels/select already
          // validated that exact option, so dropping it here would immediately
          // resurrect the previous rate in the recommendation total.
          if (
            isActiveHotelRow(selection) &&
            helpers.isSelectableHotel(selection) &&
            selectionMatchesCurrentStay(selection)
          ) {
            return selection;
          }

          return null;
        })
        .filter((selection): selection is ItineraryHotelRow => Boolean(selection));
      const packageSelections = Object.entries(selectedByGroup[groupType] || {})
        .filter(([key, selection]) => selectionBelongsToStay(key, selection))
        .map(([, selection]) => resolveSelection(selection))
        .filter((selection): selection is ItineraryHotelRow => Boolean(selection));
      const explicitSelection = [...userSelections, ...packageSelections]
        .sort((left, right) => selectionPriority(right) - selectionPriority(left))[0];
      if (explicitSelection) {
        selectedHotels.push(explicitSelection);
        previousSelectedHotel = explicitSelection;
        return;
      }

      // The API persists automatic selections as well as manual selections.
      // Prefer that row before calculating a local fallback; otherwise the
      // table can total a cheaper card while the financial summary uses the
      // persisted automatic rate.
      const persistedSelected = stayHotels
        .filter((candidate) =>
          helpers.isSelectableHotel(candidate) &&
          (Number(candidate.selectionId || 0) > 0 ||
            candidate.isSelected === true ||
            String(candidate.selectionOrigin || '').trim().toUpperCase() === 'USER_SELECTED') &&
          String(candidate.selectionStatus || '').trim().toUpperCase() !== 'UNAVAILABLE',
        )
        .sort((left, right) => selectionPriority(right) - selectionPriority(left))[0];
      if (persistedSelected) {
        // Use the authoritative selected row itself. Substituting the first
        // visible candidate here was the stale-total bug: the table could show
        // the new card while the recommendation total kept the old selection.
        selectedHotels.push(persistedSelected);
        previousSelectedHotel = persistedSelected;
        return;
      }

      // No API selection means unresolved. React must not choose a price-first
      // substitute and must not include it in a financial total.
    });

    return selectedHotels;
  };

  const getGroupTotal = (groupType: number): number => {
    const committedGroup = hotelSelectionState.find(
      (group) => Number(group.groupType) === Number(groupType),
    );
    const persistedTab = recommendationTabs.find(
      (tab) => Number(tab.groupType) === Number(groupType),
    );
    const persistedPartialTotal = Number(
      persistedTab?.partialTotal ?? persistedTab?.totalAmount ?? 0,
    );
    if (committedGroup) {
      const total = Number(committedGroup.totalAmount ?? 0);
      const selectedRoutes = (committedGroup.routes || []).filter(
        (route) => route.selectionStatus === 'SELECTED' && route.selected,
      );
      const hasCompleteSelection =
        selectedRoutes.length > 0 &&
        selectedRoutes.length === (committedGroup.routes || []).length &&
        committedGroup.selectionStatus === 'SELECTED';
      const selectedRouteTotal = selectedRoutes.reduce(
        (sum, route) => sum + Number(route.selected?.totalPrice ?? 0),
        0,
      );

      // The persisted API exposes both a package total and the selected total
      // for every required route. After a room/rate update, an older package
      // total can briefly survive in the client cache while route selections
      // already contain the new prices. Reconcile only a complete API
      // selection and only when the values disagree; unresolved groups keep
      // the existing server package-total behavior.
      if (
        hasCompleteSelection &&
        Number.isFinite(selectedRouteTotal) &&
        selectedRouteTotal > 0 &&
        Math.abs(selectedRouteTotal - total) > 0.01
      ) {
        return selectedRouteTotal;
      }

      if (hasCompleteSelection) {
        const selectedRowsTotal = getSelectedHotelsForGroup(groupType).reduce(
          (sum, hotel) => sum + Number(helpers.getHotelAmountWithRooms(hotel) || 0),
          0,
        );
        if (
          Number.isFinite(selectedRowsTotal) &&
          selectedRowsTotal > 0 &&
          Math.abs(selectedRowsTotal - total) > 0.01
        ) {
          return selectedRowsTotal;
        }
      }

      if (Number.isFinite(total) && total > 0) return total;
      // Incomplete groups may have a zero committed package total even though
      // some routes have authoritative selected prices. Use the API's partial
      // package total for those routes; unresolved routes remain unpriced.
      return Number.isFinite(persistedPartialTotal) && persistedPartialTotal > 0
        ? persistedPartialTotal
        : 0;
    }
    const persistedTotal = Number(persistedTab?.totalAmount ?? persistedTab?.partialTotal ?? 0);
    // Legacy responses may still expose only hotelTabs. They remain a server
    // total; visible candidate rows are never summed into committed state.
    if (Number.isFinite(persistedTotal) && persistedTotal > 0) return persistedTotal;
    return 0;
  };

  return { getSelectedHotelsForGroup, getGroupTotal };
}
