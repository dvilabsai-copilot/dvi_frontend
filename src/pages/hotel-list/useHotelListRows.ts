import { useEffect, useMemo } from "react";
import type { Dispatch, SetStateAction } from "react";
import type { ItineraryHotelRow, ItineraryHotelTab } from "../ItineraryDetails";

type RowHelpers = {
  getStayKey: (hotel: ItineraryHotelRow) => string;
  getHotelOptionKey: (hotel: ItineraryHotelRow) => string;
  getHotelAmountWithRooms: (hotel: ItineraryHotelRow) => number;
  isExternalStayRow: (hotel?: ItineraryHotelRow | null) => boolean;
  isPlaceholderHotel: (hotel?: ItineraryHotelRow | null) => boolean;
  isSelectableHotel: (hotel?: ItineraryHotelRow | null) => boolean;
  findMatchingRoomMealInStay: (
    stayHotels: ItineraryHotelRow[],
    previousSelectedHotel?: ItineraryHotelRow | null,
  ) => ItineraryHotelRow | null;
  sortStayGroupsByDate: (groups: ItineraryHotelRow[][]) => ItineraryHotelRow[][];
  getAutoSelectableHotelsRespectingPreviousRoomMeal: (
    stayHotels: ItineraryHotelRow[],
    previousSelectedHotel?: ItineraryHotelRow | null,
  ) => ItineraryHotelRow[];
  toNumber: (value: unknown, fallback?: number) => number;
};

type HotelRowWithLegacyFields = ItineraryHotelRow & {
  routeId?: unknown;
  isSelected?: unknown;
  selectionOrigin?: unknown;
};

type UseHotelListRowsArgs<TVoucher> = {
  localHotels: ItineraryHotelRow[];
  activeGroupType: number | null;
  selectedByGroup: Record<number, Record<string, ItineraryHotelRow>>;
  userSelectedByGroup: Record<number, Record<string, ItineraryHotelRow>>;
  readOnly: boolean;
  roomCount: number;
  hotelTabs: ItineraryHotelTab[];
  stayRoutes?: Array<{
    routeId: number;
    dayNumber: number;
    date: string;
    destination: string;
  }>;
  emptyStayBlocks?: Array<{
    routeIds: number[];
    dayNumbers: number[];
    dates: string[];
    destination: string;
  }>;
  dayDestinationFallback: Record<number, string>;
  selectedVoucherRows: Record<string, TVoucher>;
  setSelectedVoucherRows: Dispatch<SetStateAction<Record<string, TVoucher>>>;
  helpers: RowHelpers;
};

export function useHotelListRows<TVoucher>({
  localHotels,
  activeGroupType,
  selectedByGroup,
  userSelectedByGroup,
  readOnly,
  roomCount,
  hotelTabs,
  stayRoutes = [],
  emptyStayBlocks = [],
  dayDestinationFallback,
  selectedVoucherRows,
  setSelectedVoucherRows,
  helpers,
}: UseHotelListRowsArgs<TVoucher>) {
  const effectiveStayRoutes = useMemo(() => {
    const byRoute = new Map<number, { routeId: number; dayNumber: number; date: string; destination: string }>();
    stayRoutes.forEach((route) => byRoute.set(Number(route.routeId || 0), route));
    emptyStayBlocks.forEach((block) => (block.routeIds || []).forEach((routeId, index) => {
      const normalizedRouteId = Number(routeId || 0);
      if (!normalizedRouteId || byRoute.has(normalizedRouteId)) return;
      byRoute.set(normalizedRouteId, {
        routeId: normalizedRouteId,
        dayNumber: Number(block.dayNumbers?.[index] || 0),
        date: String(block.dates?.[index] || '').slice(0, 10),
        destination: String(block.destination || '').trim(),
      });
    }));
    return Array.from(byRoute.values()).sort((a, b) => a.dayNumber - b.dayNumber || a.date.localeCompare(b.date));
  }, [emptyStayBlocks, stayRoutes]);

  const currentHotelRows = useMemo(() => {
    if (activeGroupType === null) return [];

    if (readOnly) {
      const hotelsByRoute = new Map<number, ItineraryHotelRow>();
      const confirmedHotels = localHotels.filter((hotel) => helpers.toNumber(hotel.itineraryPlanHotelDetailsId) > 0);
      const externalDisplayHotels = localHotels.filter((hotel) => helpers.isExternalStayRow(hotel));
      const sourceHotels = confirmedHotels.length > 0
        ? [...confirmedHotels, ...externalDisplayHotels]
        : (() => {
            const fallbackGroupType = helpers.toNumber(activeGroupType ?? hotelTabs?.[0]?.groupType, 1);
            const hotelsInFallbackGroup = localHotels.filter((hotel) => helpers.toNumber(hotel.groupType) === fallbackGroupType);
            return hotelsInFallbackGroup.length > 0 ? hotelsInFallbackGroup : localHotels;
          })();

      sourceHotels.forEach((hotel) => {
        const routeId = helpers.toNumber(hotel.itineraryRouteId);
        if (!routeId) return;
        const existing = hotelsByRoute.get(routeId);
        const existingIsSynthetic = Boolean(existing?.previousDayBillingSynthetic);
        const hotelIsSynthetic = Boolean(hotel.previousDayBillingSynthetic);
        if (
          !existing ||
          (existingIsSynthetic && !hotelIsSynthetic) ||
          (helpers.isExternalStayRow(existing) && !helpers.isExternalStayRow(hotel))
        ) {
          hotelsByRoute.set(routeId, hotel);
        }
      });

      return Array.from(hotelsByRoute.values()).sort((a, b) => {
        const dayA = parseInt(String(a.day ?? "").replace(/\D/g, "") || "0");
        const dayB = parseInt(String(b.day ?? "").replace(/\D/g, "") || "0");
        return dayA - dayB;
      });
    }

    // Hotel inventory is shared across every recommendation tab. The active
    // group controls only the selected/default package, never hotel visibility.
    const activeGroupHotels = localHotels;

    // Availability snapshots can retain rows from a previous route-date set
    // after an itinerary edit. The current availability metadata is the source
    // of truth for which route IDs are still part of this hotel search.
    const activeRouteIds = new Set(
      effectiveStayRoutes
        .map((route) => helpers.toNumber(route.routeId, 0))
        .filter((routeId) => routeId > 0),
    );
    const getCurrentRouteId = (hotel: ItineraryHotelRow): number => {
      const directRouteId = helpers.toNumber(
        hotel.itineraryRouteId || (hotel as HotelRowWithLegacyFields).routeId,
        0,
      );
      if (activeRouteIds.has(directRouteId)) return directRouteId;
      const relatedRouteIds = Array.isArray(hotel.routeIds)
        ? hotel.routeIds.map((id) => helpers.toNumber(id, 0)).filter((id) => id > 0)
        : [];
      return relatedRouteIds.find((id) => activeRouteIds.has(id)) || directRouteId;
    };
    const currentRouteHotels = activeRouteIds.size > 0
      ? activeGroupHotels.filter((hotel) => {
          const routeId = getCurrentRouteId(hotel);
          const routeIds = Array.isArray(hotel.routeIds)
            ? hotel.routeIds.map((id) => helpers.toNumber(id, 0))
            : [];
          return activeRouteIds.has(routeId) || routeIds.some((id) => activeRouteIds.has(id));
        })
      : activeGroupHotels;

    // Availability selections are metadata on a real stay row. Never render
    // legacy synthetic rows or rows without a route/day identity.
    const unavailableRecommendationStatuses = new Set([
      'UNAVAILABLE',
      'REVIEW_REQUIRED',
      'NO_SUPPLIER_AVAILABILITY',
      'NOT_BOOKABLE',
      'RESTRICTED',
    ]);
    const hasPersistedPayableSelection = (hotel: ItineraryHotelRow): boolean => {
      const metadata = hotel as ItineraryHotelRow & {
        selectionId?: unknown;
        selectionOrigin?: unknown;
        isSelected?: unknown;
        selectedTotalPrice?: unknown;
        totalStayPrice?: unknown;
        totalPrice?: unknown;
      };
      const selectionMarker =
        metadata.isSelected === true ||
        helpers.toNumber(metadata.selectionId, 0) > 0 ||
        Boolean(String(metadata.selectionOrigin || '').trim());
      const payableAmount = [
        metadata.selectedTotalPrice,
        metadata.totalStayPrice,
        metadata.totalPrice,
        hotel.totalHotelCost,
        hotel.pricePerNight,
      ]
        .map((value) => Number(value || 0))
        .find((value) => Number.isFinite(value) && value > 0) || 0;
      return selectionMarker && payableAmount > 0;
    };
    const meaningfulGroupHotels = currentRouteHotels.filter((hotel) =>
      !/^previously selected hotel$/i.test(String(hotel.hotelName || '').trim()) &&
      (![
        hotel.selectionStatus,
        hotel.availabilityStatus,
      ].some((status) => unavailableRecommendationStatuses.has(String(status || '').trim().toUpperCase())) ||
        hasPersistedPayableSelection(hotel)) &&
      getCurrentRouteId(hotel) > 0 &&
      Boolean(String(hotel.date || hotel.day || '').trim()),
    );

    // A stale reconciliation response can contain the real selected supplier
    // row plus a fabricated external row for the same route/date. Those rows
    // intentionally have different stayKey values, so grouping by stayKey
    // alone would render both rows (for example, CLOUDS VALLEY followed by
    // “Selected hotel / Stay arranged externally”). Keep genuine external
    // bookings visible, but discard only the identity-less synthetic marker
    // when a real supplier row already covers that logical stay.
    const logicalStayKey = (hotel: ItineraryHotelRow): string => {
      const routeIds = Array.isArray(hotel.routeIds)
        ? hotel.routeIds.map((id) => helpers.toNumber(id, 0)).filter((id) => id > 0)
        : [];
      const routeIdentity = routeIds.length > 0
        ? routeIds.sort((a, b) => a - b).join(',')
        : String(helpers.toNumber(hotel.itineraryRouteId, 0));
      const dayDate = String(hotel.day || '').match(/\d{4}-\d{2}-\d{2}/)?.[0] || '';
      const dateIdentity = String(hotel.date || dayDate).slice(0, 10).trim();
      return `${routeIdentity}::${dateIdentity}`;
    };
    const findSelectionForStay = (
      selections: Record<string, ItineraryHotelRow> | undefined,
      stayHotels: ItineraryHotelRow[],
    ): ItineraryHotelRow | undefined => {
      if (!selections || stayHotels.length === 0) return undefined;
      const exactStayKey = helpers.getStayKey(stayHotels[0]);
      if (selections[exactStayKey]) return selections[exactStayKey];
      const currentLogicalStayKey = logicalStayKey(stayHotels[0]);
      return Object.entries(selections).find(([, selection]) =>
        logicalStayKey(selection) === currentLogicalStayKey,
      )?.[1];
    };
    const isSyntheticExternalPlaceholder = (hotel: ItineraryHotelRow): boolean => {
      const name = String(hotel.hotelName || '').trim().toLowerCase();
      const generatedLabel = name === 'selected hotel' || name.includes('stay arranged externally');

      // Reconciliation can emit the generic "Selected hotel" label without
      // setting provider/externalStay/availabilityStatus. It is still a
      // synthetic marker, not a second hotel stay. Classify the generated
      // label before checking the provider metadata so it cannot render next
      // to the real supplier row for the same route/date.
      if (generatedLabel) return true;
      if (!helpers.isExternalStayRow(hotel)) return false;

      const hasPersistedIdentity =
        helpers.toNumber(hotel.hotelId, 0) > 0 ||
        Boolean(String(hotel.hotelCode || hotel.bookingCode || hotel.searchReference || '').trim()) ||
        helpers.toNumber(hotel.itineraryPlanHotelDetailsId, 0) > 0;
      return !hasPersistedIdentity && !name;
    };
    const realLogicalStayKeys = new Set(
      meaningfulGroupHotels
        .filter((hotel) => !isSyntheticExternalPlaceholder(hotel))
        .map(logicalStayKey),
    );
    const filteredMeaningfulGroupHotels = meaningfulGroupHotels.filter((hotel) =>
      !isSyntheticExternalPlaceholder(hotel) || !realLogicalStayKeys.has(logicalStayKey(hotel)),
    );

    // The API exposes the previous-night billing marker so the UI can explain
    // the early-arrival date. It is not a second selectable hotel stay. Keep
    // the real hotel row as the source of selection and pricing; the table
    // renders the marker as the Day 0 entry point for that real stay.
    const routeMetaById = new Map(
      effectiveStayRoutes.map((route) => [helpers.toNumber(route.routeId, 0), route] as const),
    );
    const normalizedGroupHotels = filteredMeaningfulGroupHotels.map((hotel) => {
      const routeId = getCurrentRouteId(hotel);
      const routeMeta = routeMetaById.get(routeId);
      if (!routeMeta) return hotel;
      return {
        ...hotel,
        itineraryRouteId: routeId,
        day: `Day ${helpers.toNumber(routeMeta.dayNumber, 0)} | ${String(routeMeta.date || hotel.date || '').slice(0, 10)}`,
        dayNumber: helpers.toNumber(routeMeta.dayNumber, 0),
        date: String(routeMeta.date || hotel.date || '').slice(0, 10),
        destination: String(routeMeta.destination || hotel.destination || '').trim(),
      };
    });

    // A stale response may contain multiple persisted rows for the same
    // current route, each with a different legacy stayKey. Keep one display
    // row per route; the expanded card still reads all rate options from the
    // route-scoped inventory below.
    const rowByRoute = new Map<number, ItineraryHotelRow>();
    normalizedGroupHotels.forEach((hotel) => {
      const routeId = getCurrentRouteId(hotel);
      if (!routeId) return;
      const existing = rowByRoute.get(routeId);
      if (!existing) {
        rowByRoute.set(routeId, hotel);
        return;
      }

      const existingIsPlaceholder = helpers.isPlaceholderHotel(existing);
      const candidateIsPlaceholder = helpers.isPlaceholderHotel(hotel);
      const existingWithSelection = existing as HotelRowWithLegacyFields;
      const candidateWithSelection = hotel as HotelRowWithLegacyFields;
      const existingIsSelected = Boolean(existingWithSelection.isSelected || existingWithSelection.selectionOrigin);
      const candidateIsSelected = Boolean(candidateWithSelection.isSelected || candidateWithSelection.selectionOrigin);
      if (
        (existingIsPlaceholder && !candidateIsPlaceholder) ||
        (!existingIsSelected && candidateIsSelected)
      ) {
        rowByRoute.set(routeId, hotel);
      }
    });
    const deduplicatedGroupHotels = Array.from(rowByRoute.values());

    const nonSyntheticHotels = deduplicatedGroupHotels.filter(
      (hotel) => !hotel.previousDayBillingSynthetic,
    );
    const hotelsForActiveGroup = nonSyntheticHotels.length > 0
      ? nonSyntheticHotels
      : deduplicatedGroupHotels;
    const groupedByStay = new Map<string, ItineraryHotelRow[]>();
    hotelsForActiveGroup.forEach((hotel) => {
      const stayKey = helpers.getStayKey(hotel);
      groupedByStay.set(stayKey, [...(groupedByStay.get(stayKey) || []), hotel]);
    });

    // A persisted snapshot can legitimately have no supplier row for a stay.
    // Keep that stay visible as a real row so the user can request offline
    // inventory for that route instead of losing the day from the table.
    effectiveStayRoutes.forEach((route) => {
      const routeId = helpers.toNumber(route.routeId, 0);
      if (!routeId) return;
      // An unavailable marker is present in the raw snapshot for a route, but
      // it is intentionally removed from meaningfulGroupHotels above. Check
      // the renderable rows here; otherwise the marker suppresses the
      // placeholder and the entire itinerary day disappears from the table.
      const hasRouteRow = meaningfulGroupHotels.some((hotel) => {
        const hotelRouteId = helpers.toNumber(hotel.itineraryRouteId, 0);
        const hotelRouteIds = Array.isArray(hotel.routeIds)
          ? hotel.routeIds.map((id) => helpers.toNumber(id, 0))
          : [];
        return hotelRouteId === routeId || hotelRouteIds.includes(routeId);
      });
      if (hasRouteRow) return;

      const placeholder: ItineraryHotelRow = {
        groupType: activeGroupType,
        itineraryRouteId: routeId,
        day: `Day ${helpers.toNumber(route.dayNumber, 0)} | ${String(route.date || '').slice(0, 10)}`,
        dayNumber: helpers.toNumber(route.dayNumber, 0),
        date: String(route.date || '').slice(0, 10),
        destination: String(route.destination || '').trim(),
        hotelId: 0,
        hotelName: '',
        category: 0,
        roomType: '-',
        mealPlan: 'UNKNOWN',
        totalHotelCost: 0,
        totalHotelTaxAmount: 0,
        provider: 'live',
        availabilityStatus: 'UNAVAILABLE',
        availabilityMessage: 'Live hotels are not available for this place',
        isSelectable: false,
      };
      groupedByStay.set(helpers.getStayKey(placeholder), [placeholder]);
    });

    const displayHotels: ItineraryHotelRow[] = [];
    let previousSelectedHotel: ItineraryHotelRow | null = null;
    helpers.sortStayGroupsByDate(Array.from(groupedByStay.values())).forEach((stayHotels) => {
      const stayKey = helpers.getStayKey(stayHotels[0]);
      const userSelected = findSelectionForStay(userSelectedByGroup[activeGroupType], stayHotels);
      if (userSelected && helpers.isSelectableHotel(userSelected)) {
        displayHotels.push(userSelected);
        previousSelectedHotel = userSelected;
        return;
      }

      const selectedForStay = findSelectionForStay(selectedByGroup[activeGroupType], stayHotels);
      if (selectedForStay) {
        const persistedSelection = stayHotels.find((option) =>
          helpers.getHotelOptionKey(option) === helpers.getHotelOptionKey(selectedForStay),
        ) || selectedForStay;
        displayHotels.push(persistedSelection);
        previousSelectedHotel = persistedSelection;
        return;
      }

      // Reset/check-availability can legitimately return inventory before a
      // route has a persisted selection. Keep the route visible in the table
      // without marking a candidate as selected; the expanded cards remain
      // the place where the user chooses the hotel. This prevents reset from
      // making itinerary days disappear while preserving selection state and
      // pricing semantics.
      const visibleFallback = stayHotels.find((option) => helpers.isSelectableHotel(option)) || stayHotels[0];
      if (visibleFallback) {
        displayHotels.push({
          ...visibleFallback,
          isSelected: false,
          selectionId: undefined,
          selectionOrigin: undefined,
          // This is inventory shown to keep an unresolved route visible; it
          // is not a committed hotel choice and must not be priced as one.
          isDisplayOnlyFallback: true,
        } as ItineraryHotelRow);
      }
    });

    return displayHotels.sort((a, b) => {
      const dayA = parseInt(String(a.day ?? "").replace(/\D/g, "") || "0");
      const dayB = parseInt(String(b.day ?? "").replace(/\D/g, "") || "0");
      if (dayA !== dayB) return dayA - dayB;
      return String(a.date || "").localeCompare(String(b.date || ""));
    });
  }, [localHotels, activeGroupType, selectedByGroup, userSelectedByGroup, readOnly, roomCount, effectiveStayRoutes]);

  useEffect(() => {
    if (!readOnly) {
      if (Object.keys(selectedVoucherRows).length > 0) setSelectedVoucherRows(() => ({}));
      return;
    }

    const validKeys = new Set(currentHotelRows.map(helpers.getStayKey));
    setSelectedVoucherRows((previous) => {
      const next: Record<string, TVoucher> = {};
      Object.entries(previous).forEach(([key, value]) => {
        if (validKeys.has(key)) next[key] = value;
      });
      return next;
    });
  }, [readOnly, currentHotelRows]);

  const routeDestinationFallback = useMemo(() => {
    const map: Record<number, string> = {};
    localHotels.forEach((hotel) => {
      const routeId = helpers.toNumber(hotel.itineraryRouteId, 0);
      const destination = String(hotel.destination || "").trim();
      if (routeId && destination && !map[routeId]) map[routeId] = destination;
    });
    return map;
  }, [localHotels]);

  const getResolvedDestination = (hotel: ItineraryHotelRow): string => {
    const direct = String(hotel.destination || "").trim();
    if (direct) return direct;
    const dayMatch = String(hotel.day || "").match(/Day\s*(\d+)/i);
    const fromDay = dayMatch ? String(dayDestinationFallback[Number(dayMatch[1])] || "").trim() : "";
    if (fromDay) return fromDay;
    return String(routeDestinationFallback[helpers.toNumber(hotel.itineraryRouteId, 0)] || "").trim() || "-";
  };

  return { currentHotelRows, routeDestinationFallback, getResolvedDestination };
}
