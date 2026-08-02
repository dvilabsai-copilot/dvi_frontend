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

type UseHotelListRowsArgs<TVoucher> = {
  localHotels: ItineraryHotelRow[];
  activeGroupType: number | null;
  selectedByGroup: Record<number, Record<string, ItineraryHotelRow>>;
  userSelectedByStay: Record<string, ItineraryHotelRow>;
  readOnly: boolean;
  roomCount: number;
  hotelTabs: ItineraryHotelTab[];
  stayRoutes?: Array<{
    routeId: number;
    dayNumber: number;
    date: string;
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
  userSelectedByStay,
  readOnly,
  roomCount,
  hotelTabs,
  stayRoutes = [],
  dayDestinationFallback,
  selectedVoucherRows,
  setSelectedVoucherRows,
  helpers,
}: UseHotelListRowsArgs<TVoucher>) {
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

    const activeGroupHotels = localHotels.filter(
      (hotel) => helpers.toNumber(hotel.groupType) === helpers.toNumber(activeGroupType),
    );

    // Availability selections are metadata on a real stay row. Never render
    // legacy synthetic rows or rows without a route/day identity.
    const meaningfulGroupHotels = activeGroupHotels.filter((hotel) =>
      !/^previously selected hotel$/i.test(String(hotel.hotelName || '').trim()) &&
      helpers.toNumber(hotel.itineraryRouteId, 0) > 0 &&
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
    const isSyntheticExternalPlaceholder = (hotel: ItineraryHotelRow): boolean => {
      if (!helpers.isExternalStayRow(hotel)) return false;
      const name = String(hotel.hotelName || '').trim().toLowerCase();
      const hasPersistedIdentity =
        helpers.toNumber(hotel.hotelId, 0) > 0 ||
        Boolean(String(hotel.hotelCode || hotel.bookingCode || hotel.searchReference || '').trim()) ||
        helpers.toNumber(hotel.itineraryPlanHotelDetailsId, 0) > 0;
      const generatedLabel = name === 'selected hotel' || name.includes('stay arranged externally');
      return generatedLabel || (!hasPersistedIdentity && !name);
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
      stayRoutes.map((route) => [helpers.toNumber(route.routeId, 0), route] as const),
    );
    const normalizedGroupHotels = filteredMeaningfulGroupHotels.map((hotel) => {
      const routeId = helpers.toNumber(hotel.itineraryRouteId, 0);
      const routeMeta = routeMetaById.get(routeId);
      if (!routeMeta) return hotel;
      return {
        ...hotel,
        day: `Day ${helpers.toNumber(routeMeta.dayNumber, 0)} | ${String(hotel.date || routeMeta.date || '').slice(0, 10)}`,
        dayNumber: helpers.toNumber(routeMeta.dayNumber, 0),
        date: String(hotel.date || routeMeta.date || '').slice(0, 10),
        destination: String(hotel.destination || routeMeta.destination || '').trim(),
      };
    });

    const nonSyntheticHotels = normalizedGroupHotels.filter(
      (hotel) => !hotel.previousDayBillingSynthetic,
    );
    const hotelsForActiveGroup = nonSyntheticHotels.length > 0
      ? nonSyntheticHotels
      : normalizedGroupHotels;
    const groupedByStay = new Map<string, ItineraryHotelRow[]>();
    hotelsForActiveGroup.forEach((hotel) => {
      const stayKey = helpers.getStayKey(hotel);
      groupedByStay.set(stayKey, [...(groupedByStay.get(stayKey) || []), hotel]);
    });

    // A persisted snapshot can legitimately have no supplier row for a stay.
    // Keep that stay visible as a real row so the user can request offline
    // inventory for that route instead of losing the day from the table.
    stayRoutes.forEach((route) => {
      const routeId = helpers.toNumber(route.routeId, 0);
      if (!routeId) return;
      const hasRouteRow = hotelsForActiveGroup.some((hotel) => {
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
        day: `Day ${helpers.toNumber(route.dayNumber, 0)}`,
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
      const userSelected = userSelectedByStay[stayKey];
      if (userSelected && helpers.isSelectableHotel(userSelected)) {
        displayHotels.push(userSelected);
        previousSelectedHotel = userSelected;
        return;
      }

      const selectedForStay = selectedByGroup[activeGroupType]?.[stayKey];
      if (selectedForStay) {
        const persistedSelection = stayHotels.find((option) =>
          helpers.getHotelOptionKey(option) === helpers.getHotelOptionKey(selectedForStay),
        ) || selectedForStay;
        displayHotels.push(persistedSelection);
        previousSelectedHotel = persistedSelection;
        return;
      }

      const stickySelection = helpers.findMatchingRoomMealInStay(stayHotels, previousSelectedHotel);
      if (stickySelection) {
        displayHotels.push(stickySelection);
        previousSelectedHotel = stickySelection;
        return;
      }

      const selectableHotels = helpers.getAutoSelectableHotelsRespectingPreviousRoomMeal(stayHotels, previousSelectedHotel);
      const candidateHotels = selectableHotels.length > 0
        ? selectableHotels
        : stayHotels.some((hotel) => !helpers.isPlaceholderHotel(hotel))
          ? stayHotels.filter((hotel) => !helpers.isPlaceholderHotel(hotel))
          : [...stayHotels];
      const sortedStayHotels = [...candidateHotels].sort((a, b) => {
        const ratingDifference = helpers.toNumber(b.category, 0) - helpers.toNumber(a.category, 0);
        if (ratingDifference !== 0) return ratingDifference;
        const priceDifference = helpers.getHotelAmountWithRooms(a) - helpers.getHotelAmountWithRooms(b);
        return priceDifference || String(a.hotelName || "").localeCompare(String(b.hotelName || ""));
      });

      const selected = sortedStayHotels[0];
      if (selected) {
        displayHotels.push(selected);
        previousSelectedHotel = selected;
      }
    });

    return displayHotels.sort((a, b) => {
      const dayA = parseInt(String(a.day ?? "").replace(/\D/g, "") || "0");
      const dayB = parseInt(String(b.day ?? "").replace(/\D/g, "") || "0");
      if (dayA !== dayB) return dayA - dayB;
      return String(a.date || "").localeCompare(String(b.date || ""));
    });
  }, [localHotels, activeGroupType, selectedByGroup, userSelectedByStay, readOnly, roomCount, stayRoutes]);

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
