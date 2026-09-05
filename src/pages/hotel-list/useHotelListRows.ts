import { useEffect, useMemo } from "react";
import type { Dispatch, SetStateAction } from "react";
import type { ItineraryHotelRow, ItineraryHotelTab } from "../ItineraryDetails";
import {
  isSyntheticPreviousDayBillingRow,
  mergeEarlyArrivalDisplayMetadata,
  reconcilePreviousDayBillingRows,
} from "./earlyCheckInReconciliation";

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
  earlyArrivalMarkers?: Array<{
    routeId: number;
    groupType: number;
    blockedFromDate: string;
    location: string;
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
  earlyArrivalMarkers = [],
  dayDestinationFallback,
  selectedVoucherRows,
  setSelectedVoucherRows,
  helpers,
}: UseHotelListRowsArgs<TVoucher>) {
  const normalizeDestinationLabel = (value: unknown): string => {
    const label = String(value || '').trim();
    return /^(?:-|—|–|n\/a|na|unknown|null|undefined)$/i.test(label) ? '' : label;
  };

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

    // Some persisted recommendation groups contain the correct route/date
    // row while the compact hotelAvailability metadata only lists routes
    // that have a candidate for the active group. Recover those route
    // identities from any dated persisted row before filtering/normalizing
    // the active group; otherwise changing tabs can make days disappear.
    localHotels.forEach((hotel) => {
      const routeId = Number(hotel.itineraryRouteId || (hotel as any).routeId || 0);
      const rawDay = String(hotel.day || '');
      const dateFromDay = rawDay.match(/\d{4}-\d{2}-\d{2}/)?.[0] || '';
      const date = String(
        hotel.date ||
        (hotel as any).checkInDate ||
        (hotel as any).itineraryRouteDate ||
        (hotel as any).itinerary_route_date ||
        dateFromDay,
      ).slice(0, 10);
      if (!routeId || !date || byRoute.has(routeId)) return;
      const dayMatch = rawDay.match(/Day\s+(\d+)/i);
      byRoute.set(routeId, {
        routeId,
        dayNumber: Number(hotel.dayNumber || dayMatch?.[1] || 0),
        date,
        destination: String(hotel.destination || '').trim(),
      });
    });

    // Recommendation tabs retain the complete logical stay contract even
    // when their compact row payload is sparse. Use it as a second fallback
    // for route/date hydration (including multi-night stays).
    const addDays = (value: string, days: number): string => {
      const parsed = new Date(`${value}T00:00:00.000Z`);
      if (!value || Number.isNaN(parsed.getTime())) return value;
      parsed.setUTCDate(parsed.getUTCDate() + days);
      return parsed.toISOString().slice(0, 10);
    };
    hotelTabs.forEach((tab) => (tab.stayResults || []).forEach((stay) => {
      const routeIds = (stay.routeIds || []).map(Number).filter((routeId) => routeId > 0);
      const ids = routeIds.length > 0 ? routeIds : [Number(stay.parentRouteId || 0)];
      const startDate = String(stay.checkInDate || '').slice(0, 10);
      ids.forEach((routeId, index) => {
        if (!routeId || byRoute.has(routeId)) return;
        byRoute.set(routeId, {
          routeId,
          dayNumber: 0,
          date: addDays(startDate, index),
          destination: String(stay.destination || '').trim(),
        });
      });
    }));

    return Array.from(byRoute.values())
      .sort((a, b) => a.dayNumber - b.dayNumber || a.date.localeCompare(b.date))
      .map((route, index) => ({ ...route, dayNumber: route.dayNumber || index + 1 }));
  }, [emptyStayBlocks, hotelTabs, localHotels, stayRoutes]);

  // A persisted continuous stay is stored on its first route. The remaining
  // route IDs are retained in the selected price snapshot and must participate
  // in route hydration so the existing display-anchor logic can render them.
  const getRelatedRouteIds = (hotel: ItineraryHotelRow): number[] => {
    const hotelWithSnapshot = hotel as ItineraryHotelRow & {
      selectedPriceSnapshot?: unknown;
      selected_price_snapshot?: unknown;
      routeId?: unknown;
    };
    const directRouteId = helpers.toNumber(hotel.itineraryRouteId || hotelWithSnapshot.routeId, 0);
    const directRouteIds = Array.isArray(hotel.routeIds)
      ? hotel.routeIds.map((id) => helpers.toNumber(id, 0))
      : [];
    const rawSnapshot = hotelWithSnapshot.selectedPriceSnapshot ?? hotelWithSnapshot.selected_price_snapshot;
    let snapshot: unknown = rawSnapshot;
    if (typeof rawSnapshot === "string") {
      try {
        snapshot = JSON.parse(rawSnapshot);
      } catch {
        snapshot = null;
      }
    }
    const snapshotRecord = snapshot && typeof snapshot === "object"
      ? snapshot as Record<string, unknown>
      : null;
    const snapshotRouteIds = Array.isArray(snapshotRecord?.authoritativeRouteIds)
      ? snapshotRecord.authoritativeRouteIds.map((id: unknown) => helpers.toNumber(id, 0))
      : [];
    return Array.from(new Set([directRouteId, ...directRouteIds, ...snapshotRouteIds].filter((id) => id > 0)));
  };

  const buildHotelRowsForGroup = (groupType: number | null): ItineraryHotelRow[] => {
    if (groupType === null) return [];
    const reconciledLocalHotels = reconcilePreviousDayBillingRows(localHotels);

    if (readOnly) {
      const hotelsByRoute = new Map<number, ItineraryHotelRow>();
      const withEarlyArrivalMetadata = reconciledLocalHotels;
      const confirmedHotels = withEarlyArrivalMetadata.filter((hotel) => helpers.toNumber(hotel.itineraryPlanHotelDetailsId) > 0);
      const externalDisplayHotels = withEarlyArrivalMetadata.filter((hotel) => helpers.isExternalStayRow(hotel));
      const sourceHotels = confirmedHotels.length > 0
        ? [...confirmedHotels, ...externalDisplayHotels]
        : (() => {
            const fallbackGroupType = helpers.toNumber(groupType ?? hotelTabs?.[0]?.groupType, 1);
            const hotelsInFallbackGroup = withEarlyArrivalMetadata.filter((hotel) => helpers.toNumber(hotel.groupType) === fallbackGroupType);
            return hotelsInFallbackGroup.length > 0 ? hotelsInFallbackGroup : withEarlyArrivalMetadata;
          })();

      sourceHotels.forEach((hotel) => {
        const routeId = helpers.toNumber(hotel.itineraryRouteId);
        if (!routeId) return;
        const existing = hotelsByRoute.get(routeId);
        if (
          !existing ||
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

    // Inventory can be shared for real recommendation packages. A reset can
    // mark a recommendation tab incomplete while still returning fresh
    // authoritative rows in `localHotels`; those rows must remain available
    // to create every day anchor in the table. Preserve the empty-tab behavior
    // only when the response has no rows at all.
    const activeTab = hotelTabs.find((tab) =>
      helpers.toNumber(tab.groupType, 0) === helpers.toNumber(groupType, 0),
    );
    const isExplicitlyEmptyTab = Boolean(
      activeTab &&
      activeTab.complete === false &&
      Array.isArray(activeTab.stayResults) &&
      activeTab.stayResults.length === 0,
    );
    // Recommendation groups change the auto-selected rows, not the
    // inventory shown in the pane. Keep the candidate list identical across
    // groups; group-specific rows are still used by the selection state and
    // table, while the pane must not hide valid alternatives merely because
    // another group owns their recommendation metadata.
    const activeGroupHotels = isExplicitlyEmptyTab && reconciledLocalHotels.length === 0
      ? []
      : reconciledLocalHotels;

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
      const relatedRouteIds = getRelatedRouteIds(hotel);
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
      // A recommendation row can carry only its route identity while the
      // authoritative day/date is supplied by stayRoutes. Keep it here so
      // the normalization step below can hydrate the missing date before the
      // table decides whether the stay already has a renderable row.
      (Boolean(String(hotel.date || hotel.day || '').trim()) ||
        effectiveStayRoutes.some((route) =>
          helpers.toNumber(route.routeId, 0) === getCurrentRouteId(hotel),
        )),
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
      const logicalMatch = Object.entries(selections).find(([, selection]) =>
        logicalStayKey(selection) === currentLogicalStayKey,
      )?.[1];
      if (logicalMatch) return logicalMatch;

      // A continuous supplier stay may be represented by one row containing
      // both nights, while the selected package is stored on the anchor route.
      // Resolve by route/date before allowing the visible inventory fallback.
      const hotelRouteIds = new Set(
        stayHotels.flatMap((stay) => [
          stay.itineraryRouteId,
          (stay as any).routeId,
          ...(Array.isArray(stay.routeIds) ? stay.routeIds : []),
        ])
          .map((value) => helpers.toNumber(value, 0))
          .filter((value) => value > 0),
      );
      const hotelDate = String(
        stayHotels[0].date || stayHotels[0].checkInDate || stayHotels[0].itineraryRouteDate || '',
      ).match(/\d{4}-\d{2}-\d{2}/)?.[0] || '';
      return Object.values(selections).find((selection) => {
        const selectionRouteIds = [
          selection.itineraryRouteId,
          (selection as any).routeId,
          ...(Array.isArray(selection.routeIds) ? selection.routeIds : []),
        ]
          .map((value) => helpers.toNumber(value, 0))
          .filter((value) => value > 0);
        const selectionDate = String(
          selection.date || selection.checkInDate || selection.itineraryRouteDate || '',
        ).match(/\d{4}-\d{2}-\d{2}/)?.[0] || '';
        return selectionRouteIds.some((routeId) => hotelRouteIds.has(routeId)) &&
          (!hotelDate || !selectionDate || hotelDate === selectionDate);
      });
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
    const realMeaningfulGroupHotels = filteredMeaningfulGroupHotels.filter(
      (hotel) => !isSyntheticPreviousDayBillingRow(hotel),
    );

    // The API exposes the previous-night billing marker so the UI can explain
    // the early-arrival date. It is not a second selectable hotel stay. Keep
    // the real hotel row as the source of selection and pricing; the table
    // renders the marker as the Day 0 entry point for that real stay.
    const routeMetaById = new Map(
      effectiveStayRoutes.map((route) => [helpers.toNumber(route.routeId, 0), route] as const),
    );
    const normalizedGroupHotels = realMeaningfulGroupHotels.map((hotel) => {
      const routeId = getCurrentRouteId(hotel);
      const routeMeta = routeMetaById.get(routeId);
      const earlyArrivalFields = hotel.previousDayBilling
        ? {
            earlyCheckIn: true,
            previousDayBilling: hotel.previousDayBilling,
            earlyCheckInExtraPaymentApplicable: hotel.previousDayBilling.earlyCheckInExtraPaymentApplicable,
            earlyCheckInPaymentStatus: hotel.previousDayBilling.earlyCheckInPaymentStatus,
            actualGuestArrivalAt: hotel.previousDayBilling.actualGuestArrivalAt,
            hotelierEarlyCheckInNote: hotel.previousDayBilling.hotelierEarlyCheckInNote,
          }
        : {};
      if (!routeMeta) return { ...hotel, ...earlyArrivalFields };
      return {
        ...hotel,
        ...earlyArrivalFields,
        previousDayBillingSynthetic: false,
        itineraryRouteId: routeId,
        day: `Day ${helpers.toNumber(routeMeta.dayNumber, 0)} | ${String(routeMeta.date || hotel.date || '').slice(0, 10)}`,
        dayNumber: helpers.toNumber(routeMeta.dayNumber, 0),
        date: String(routeMeta.date || hotel.date || '').slice(0, 10),
        destination: normalizeDestinationLabel(routeMeta.destination) || normalizeDestinationLabel(hotel.destination),
      };
    });

    // A stale response may contain multiple persisted rows for the same
    // current route, each with a different legacy stayKey. Keep one display
    // row per route; the expanded card still reads all rate options from the
    // route-scoped inventory below.
    const rowByIdentity = new Map<string, ItineraryHotelRow>();
    normalizedGroupHotels.forEach((hotel) => {
      const routeId = getCurrentRouteId(hotel);
      if (!routeId) return;
      const rowDate = String(hotel.date || hotel.checkInDate || '').slice(0, 10);
      const identity = `${routeId}::${rowDate}`;
      const existing = rowByIdentity.get(identity);
      if (!existing) {
        rowByIdentity.set(identity, hotel);
        return;
      }

      const existingIsPlaceholder = helpers.isPlaceholderHotel(existing);
      const candidateIsPlaceholder = helpers.isPlaceholderHotel(hotel);
      const existingWithSelection = existing as HotelRowWithLegacyFields;
      const candidateWithSelection = hotel as HotelRowWithLegacyFields;
      const existingIsSelected = Boolean(existingWithSelection.isSelected || existingWithSelection.selectionOrigin);
      const candidateIsSelected = Boolean(candidateWithSelection.isSelected || candidateWithSelection.selectionOrigin);
      const existingIsOffline = String((existing as any).provider || '').trim().toLowerCase() === 'offline';
      const candidateIsLive = String((hotel as any).provider || '').trim().toLowerCase() !== 'offline';
      if (
        (existingIsPlaceholder && !candidateIsPlaceholder) ||
        (!existingIsSelected && candidateIsSelected) ||
        (!existingIsSelected && !candidateIsSelected && existingIsOffline && candidateIsLive)
      ) {
        rowByIdentity.set(identity, hotel);
      }
    });
    const deduplicatedGroupHotels = Array.from(rowByIdentity.values());

    const nonSyntheticHotels = deduplicatedGroupHotels.filter(
      (hotel) => !isSyntheticPreviousDayBillingRow(hotel),
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
      // Suppress a placeholder only when a row that will actually render has
      // already been normalized to this route and has a concrete day/date.
      // Checking raw `routeIds` here is unsafe: a multi-night persisted row
      // can claim several routes while carrying no display date. That used to
      // suppress all of those route placeholders in some recommendation
      // groups, leaving the table with missing days and generic "day" editors.
      const hasRouteRow = normalizedGroupHotels.some((hotel) => {
        const normalizedRouteId = getCurrentRouteId(hotel);
        return normalizedRouteId === routeId &&
          Boolean(String(hotel.date || hotel.day || '').trim());
      });
      if (hasRouteRow) return;

      const earlyMarker = earlyArrivalMarkers.find((marker) =>
        Number(marker.routeId || 0) === routeId &&
        Number(marker.groupType || 0) === Number(groupType || 0),
      );
      const placeholder: ItineraryHotelRow = {
        groupType,
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
        ...(earlyMarker
          ? {
              earlyCheckIn: true,
              hotelCheckInDate: earlyMarker.blockedFromDate,
              hotelierEarlyCheckInNote: 'Early check-in room block. Hotel selection is pending availability.',
            }
          : {}),
      };
      groupedByStay.set(helpers.getStayKey(placeholder), [placeholder]);
    });

    const displayHotels: ItineraryHotelRow[] = [];
    let previousSelectedHotel: ItineraryHotelRow | null = null;
    helpers.sortStayGroupsByDate(Array.from(groupedByStay.values())).forEach((stayHotels) => {
      const stayKey = helpers.getStayKey(stayHotels[0]);
      const userSelected = findSelectionForStay(userSelectedByGroup[groupType], stayHotels);
      if (userSelected) {
        const metadataRow = stayHotels.find((hotel) => hotel.previousDayBilling) || stayHotels[0];
        const displaySelection = mergeEarlyArrivalDisplayMetadata(userSelected, metadataRow);
        displayHotels.push(displaySelection);
        previousSelectedHotel = displaySelection;
        return;
      }

      const selectedForStay = findSelectionForStay(selectedByGroup[groupType], stayHotels);
      if (selectedForStay) {
        const persistedSelection = stayHotels.find((option) =>
          helpers.getHotelOptionKey(option) === helpers.getHotelOptionKey(selectedForStay),
        ) || selectedForStay;
        const metadataRow = stayHotels.find((hotel) => hotel.previousDayBilling) || stayHotels[0];
        const displaySelection = mergeEarlyArrivalDisplayMetadata(persistedSelection, metadataRow);
        displayHotels.push(displaySelection);
        previousSelectedHotel = displaySelection;
        return;
      }

      // A persisted/manual selection can remain in the availability rows even
      // when the latest supplier validation marks its rate unavailable. Keep
      // that explicit selection visible after refresh so the itinerary does
      // not silently turn into an empty row. The row retains its unavailable
      // status and therefore remains non-bookable; selection-state/totals
      // logic still excludes it from payable availability until revalidated.
      const persistedDisplaySelection = stayHotels.find((hotel) =>
        hasPersistedPayableSelection(hotel),
      );
      if (persistedDisplaySelection) {
        const metadataRow = stayHotels.find((hotel) => hotel.previousDayBilling) || stayHotels[0];
        const displaySelection = mergeEarlyArrivalDisplayMetadata(persistedDisplaySelection, metadataRow);
        displayHotels.push(displaySelection);
        previousSelectedHotel = displaySelection;
        return;
      }

      // Reset/check-availability can legitimately return inventory before a
      // route has a persisted selection. Keep the route visible in the table
      // without marking a candidate as selected; the expanded cards remain
      // the place where the user chooses the hotel. This prevents reset from
      // making itinerary days disappear while preserving selection state and
      // pricing semantics.
      // A display-only row is not a booking selection. The restricted live
      // card remains in the expanded inventory pane, but must never become
      // the itinerary header when this route is unresolved.
      // An unresolved route must remain unresolved in the itinerary header.
      // Inventory cards are still rendered from the stay's complete pool, so
      // choosing a fallback here would make an unavailable live rate appear
      // selected even though Reset returned no selection.
      const visibleFallback = undefined;
      if (visibleFallback) {
        const displayFallback = mergeEarlyArrivalDisplayMetadata(visibleFallback, stayHotels.find((hotel) => hotel.previousDayBilling) || stayHotels[0]);
        displayHotels.push({
          ...displayFallback,
          isSelected: false,
          selectionId: undefined,
          selectionOrigin: undefined,
          // This is inventory shown to keep an unresolved route visible; it
          // is not a committed hotel choice and must not be priced as one.
          isDisplayOnlyFallback: true,
        } as ItineraryHotelRow);
      } else {
        // Keep the restricted supplier card in the expanded inventory pane,
        // but do not use it as the itinerary row's hotel value. A disabled
        // VSR card is inventory, not a booking selection; showing its name in
        // the row header makes the UI appear to have selected it.
        const unresolvedRow = stayHotels[0];
        displayHotels.push({
          ...unresolvedRow,
          hotelName: '',
          hotelId: 0,
          provider: 'live',
          totalHotelCost: 0,
          totalHotelTaxAmount: 0,
          pricePerNight: 0,
          totalPrice: 0,
          isSelected: false,
          selectionId: undefined,
          selectionOrigin: undefined,
          availabilityStatus: 'UNAVAILABLE',
          isSelectable: false,
          isDisplayOnlyFallback: true,
        });
      }
    });

    // The API can return a multi-night supplier row anchored on the first
    // night (for example routeIds=[11354,11355]). The row above is correct
    // for selection/pricing, but the table is route-oriented and must still
    // expose every payable night. Add only a display anchor for any route
    // that was not emitted by the selection normalization. It is explicitly
    // non-selected so this cannot duplicate a booking or change totals.
    const displayedRouteDates = new Set(
      displayHotels.map((hotel) => `${helpers.toNumber(hotel.itineraryRouteId, 0)}::${String(hotel.date || '').slice(0, 10)}`),
    );
    effectiveStayRoutes.forEach((route) => {
      const routeId = helpers.toNumber(route.routeId, 0);
      const date = String(route.date || '').slice(0, 10);
      const identity = `${routeId}::${date}`;
      if (!routeId || !date || displayedRouteDates.has(identity)) return;

      const source = currentRouteHotels.find((hotel) => {
        const directRouteId = helpers.toNumber(hotel.itineraryRouteId, 0);
        const relatedRouteIds = getRelatedRouteIds(hotel);
        return directRouteId === routeId || relatedRouteIds.includes(routeId);
      });
      const displayAnchor = source
        ? {
            ...source,
            itineraryRouteId: routeId,
            routeId,
            routeIds: [routeId],
            date,
            checkInDate: date,
            day: `Day ${helpers.toNumber(route.dayNumber, 0)} | ${date}`,
            dayNumber: helpers.toNumber(route.dayNumber, 0),
            destination: normalizeDestinationLabel(route.destination) || normalizeDestinationLabel(source.destination),
            isSelected: false,
            selectionId: undefined,
            selectionOrigin: undefined,
            isDisplayOnlyFallback: true,
            // A missing route is part of the same continuous stay. If any
            // linked night is missing rates, the copied anchor must remain
            // unavailable on this night too; otherwise the first night's
            // AVAILABLE status leaks into the omitted route pane.
            ...(source.hotelStayCompleteStayBookable === false || source.completeStayBookable === false
              ? {
                  availabilityStatus: 'UNAVAILABLE',
                  availabilityState: 'UNAVAILABLE',
                  selectionStatus: 'UNAVAILABLE',
                  isSelectable: false,
                  hotelStayAvailabilityStatus: 'NO_AVAILABILITY',
                  hotelStayIsSelectable: false,
                }
              : {}),
          }
        : {
            groupType,
            itineraryRouteId: routeId,
            routeId,
            routeIds: [routeId],
            date,
            checkInDate: date,
            day: `Day ${helpers.toNumber(route.dayNumber, 0)} | ${date}`,
            dayNumber: helpers.toNumber(route.dayNumber, 0),
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
            isSelected: false,
            isDisplayOnlyFallback: true,
          } as ItineraryHotelRow;
      displayHotels.push(displayAnchor as ItineraryHotelRow);
      displayedRouteDates.add(identity);
    });

    return displayHotels.sort((a, b) => {
      const dayA = parseInt(String(a.day ?? "").replace(/\D/g, "") || "0");
      const dayB = parseInt(String(b.day ?? "").replace(/\D/g, "") || "0");
      if (dayA !== dayB) return dayA - dayB;
      return String(a.date || "").localeCompare(String(b.date || ""));
    });
  };

  const hotelRowsByGroup = useMemo(() => {
    const groupTypes = new Set<number>();
    hotelTabs.forEach((tab) => {
      const groupType = helpers.toNumber(tab.groupType, 0);
      if (groupType > 0) groupTypes.add(groupType);
    });
    [1, 2, 3, 4].forEach((groupType) => groupTypes.add(groupType));

    return Array.from(groupTypes).reduce<Record<number, ItineraryHotelRow[]>>((result, groupType) => {
      result[groupType] = buildHotelRowsForGroup(groupType);
      return result;
    }, {});
  }, [localHotels, selectedByGroup, userSelectedByGroup, readOnly, roomCount, effectiveStayRoutes, hotelTabs, earlyArrivalMarkers]);

  const currentHotelRows = activeGroupType === null
    ? []
    : hotelRowsByGroup[activeGroupType] || [];

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
    effectiveStayRoutes.forEach((route) => {
      const routeId = helpers.toNumber(route.routeId, 0);
      const destination = normalizeDestinationLabel(route.destination);
      if (routeId && destination && !map[routeId]) map[routeId] = destination;
    });
    localHotels.forEach((hotel) => {
      const routeId = helpers.toNumber(hotel.itineraryRouteId, 0);
      const destination = normalizeDestinationLabel(hotel.destination);
      if (routeId && destination && !map[routeId]) map[routeId] = destination;
    });
    return map;
  }, [effectiveStayRoutes, localHotels]);

  const getResolvedDestination = (hotel: ItineraryHotelRow): string => {
    const direct = normalizeDestinationLabel(hotel.destination);
    if (direct) return direct;
    const dayMatch = String(hotel.day || "").match(/Day\s*(\d+)/i);
    const fromDay = dayMatch ? normalizeDestinationLabel(dayDestinationFallback[Number(dayMatch[1])]) : "";
    if (fromDay) return fromDay;
    return normalizeDestinationLabel(routeDestinationFallback[helpers.toNumber(hotel.itineraryRouteId, 0)]) || "-";
  };

  return { currentHotelRows, hotelRowsByGroup, routeDestinationFallback, getResolvedDestination };
}
