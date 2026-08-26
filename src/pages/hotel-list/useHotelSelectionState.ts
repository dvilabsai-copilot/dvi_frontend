import { useCallback, useEffect, useState } from "react";
import type { ItineraryHotelRow } from "../ItineraryDetails";
import type { ItineraryHotelSelectionGroupState } from "../itinerary-details/itinerary-details.types";
import {
  buildAuthoritativeSelectedHotelRow,
  getSupplierCredentialFields,
  isSameHotelPropertyIdentity,
} from "./hotelList.utils";

export type AutoHotelValidationResult = {
  blocked: boolean;
  message?: string;
  unknown?: boolean;
};

type SelectionHelpers = {
  getStayKey: (hotel: ItineraryHotelRow) => string;
  getHotelOptionKey: (hotel: ItineraryHotelRow) => string;
  isSelectableHotel: (hotel?: ItineraryHotelRow | null) => boolean;
  isPlaceholderHotel: (hotel?: ItineraryHotelRow | null) => boolean;
  getHotelAmountWithRooms: (hotel: ItineraryHotelRow) => number;
  findMatchingRoomMealInStay: (
    stayHotels: ItineraryHotelRow[],
    previousSelectedHotel?: ItineraryHotelRow | null,
  ) => ItineraryHotelRow | null;
  sortStayGroupsByDate: (groups: ItineraryHotelRow[][]) => ItineraryHotelRow[][];
  getAutoSelectableHotelsRespectingPreviousRoomMeal: (
    stayHotels: ItineraryHotelRow[],
    previousSelectedHotel?: ItineraryHotelRow | null,
  ) => ItineraryHotelRow[];
};

type UseHotelSelectionStateArgs = {
  hotels: ItineraryHotelRow[];
  restrictedHotels: ItineraryHotelRow[];
  planId: number;
  activeGroupType?: number | null;
  hotelSelectionState?: ItineraryHotelSelectionGroupState[];
  helpers: SelectionHelpers;
  validateAutoHotelSelection?: (
    hotel: ItineraryHotelRow,
  ) => Promise<AutoHotelValidationResult>;
};

export function useHotelSelectionState({
  hotels,
  restrictedHotels,
  planId,
  activeGroupType,
  hotelSelectionState = [],
  helpers,
  validateAutoHotelSelection,
}: UseHotelSelectionStateArgs) {
  const getLogicalStayKey = (hotel: ItineraryHotelRow): string => {
    const routeIds = Array.isArray((hotel as any).routeIds)
      ? (hotel as any).routeIds
          .map((id: unknown) => Number(id))
          .filter((id: number) => Number.isFinite(id) && id > 0)
      : [];
    const directRouteId = Number((hotel as any).itineraryRouteId || (hotel as any).routeId || 0);
    const routeIdentity = Array.from(new Set([
      ...routeIds,
      ...(Number.isFinite(directRouteId) && directRouteId > 0 ? [directRouteId] : []),
    ])).sort((left, right) => left - right).join(",");
    const date = String(
      (hotel as any).date ||
      (hotel as any).checkInDate ||
      String((hotel as any).day || "").match(/\d{4}-\d{2}-\d{2}/)?.[0] ||
      "",
    ).slice(0, 10).trim();
    return `${routeIdentity}::${date}`;
  };

  const findSelectionForStay = (
    selections: Record<string, ItineraryHotelRow> | undefined,
    stayHotels: ItineraryHotelRow[],
  ): ItineraryHotelRow | undefined => {
    if (!selections || stayHotels.length === 0) return undefined;
    const exactStayKey = helpers.getStayKey(stayHotels[0]);
    if (selections[exactStayKey]) return selections[exactStayKey];
    const logicalStayKey = getLogicalStayKey(stayHotels[0]);
    return Object.entries(selections).find(([, selection]) =>
      getLogicalStayKey(selection) === logicalStayKey,
    )?.[1];
  };

  const isPersistedSelection = (hotel: ItineraryHotelRow): boolean => {
    const metadata = hotel as unknown as {
      selectionId?: unknown;
      selectionOrigin?: unknown;
      selectionStatus?: unknown;
      selection?: { selectionOrigin?: unknown };
    };
    const selectionStatus = String(metadata.selectionStatus || '').toUpperCase();
    // `itineraryPlanHotelDetailsId` identifies the database availability row;
    // it is present on ordinary catalog rows as well as selected rows.  It is
    // therefore not a selection marker.  Treating it as one resurrects an old
    // rate after Reset/refresh and makes the recommendation total include a
    // row that is no longer selected.
    const hasPersistedSelectionId = Number(metadata.selectionId || 0) > 0;
    const selectionOrigin = String(
      metadata.selectionOrigin || metadata.selection?.selectionOrigin || '',
    ).toUpperCase();
    const isExplicitSelection =
      hotel.isSelected === true ||
      hasPersistedSelectionId ||
      selectionOrigin === 'USER_SELECTED';
    return selectionStatus === 'UNAVAILABLE'
      ? isExplicitSelection
      : hasPersistedSelectionId || selectionOrigin === 'USER_SELECTED';
  };

  // `HotelList` receives a freshly-created array when the parent selection or
  // pricing state changes.  Array identity is therefore not a reliable signal
  // that availability changed.  Reinitialising from `hotels` on every render
  // was overwriting an explicit multi-night choice immediately after it was
  // saved.  Track the actual availability/selection fields instead.
  const hotelDataSignature = hotels
    .map((hotel) => [
      helpers.getStayKey(hotel),
      helpers.getHotelOptionKey(hotel),
      Number((hotel as any).selectionId || 0),
      Number((hotel as any).itineraryPlanHotelDetailsId || 0),
      String((hotel as any).selectionOrigin || ''),
      String((hotel as any).selectionStatus || ''),
      String((hotel as any).availabilityStatus || ''),
      Boolean((hotel as any).isSelected),
      Number(helpers.getHotelAmountWithRooms(hotel) || 0),
    ].join('|'))
    .join('||');
  const authoritativeStateSignature = JSON.stringify(hotelSelectionState);

  const [selectedByGroup, setSelectedByGroup] = useState<Record<number, Record<string, ItineraryHotelRow>>>({});
  // Explicit selections belong to a recommendation package as well as a stay.
  // Keeping this keyed only by stay caused a choice in package 1 to hydrate the
  // same stay in every other recommendation package.
  const [userSelectedByGroup, setUserSelectedByGroup] = useState<
    Record<number, Record<string, ItineraryHotelRow>>
  >({});
  const [localHotels, setLocalHotels] = useState<ItineraryHotelRow[]>(hotels);
  const [localRestrictedHotels, setLocalRestrictedHotels] = useState<ItineraryHotelRow[]>(restrictedHotels);

  useEffect(() => {
    setLocalHotels(hotels);
    if (hotelSelectionState.length > 0) {
      const next: Record<number, Record<string, ItineraryHotelRow>> = {};
      hotelSelectionState.forEach((group) => {
        const groupType = Number(group.groupType || 0);
        if (!groupType) return;
        group.routes.forEach((route) => {
          // Reconciliation deliberately keeps the previous persisted row when
          // its exact rate becomes unavailable. It is still the authoritative
          // selection for this recommendation group until the user accepts a
          // replacement or chooses another hotel. Dropping UNAVAILABLE rows
          // here made every tab fall back to the first group's display rows.
          if (!route.selected) return;
          const selected = route.selected as unknown as Record<string, unknown>;
          const selectedRate = String(selected.selectionKey || selected.rateOptionId || '').trim();
          const exactCandidate = hotels.find((candidate) => {
            if (Number(candidate.groupType || 0) !== groupType) return false;
            if (Number(candidate.itineraryRouteId || 0) !== Number(route.routeId || 0)) return false;
            if (!isSameHotelPropertyIdentity(candidate as any, selected as any)) return false;
            const candidateRate = String(
              candidate.selectionKey || candidate.rateOptionId || candidate.optionKey || candidate.bookingCode || '',
            ).trim();
            return !selectedRate || !candidateRate || selectedRate === candidateRate;
          });
          const routeCandidate = hotels.find((candidate) =>
            Number(candidate.groupType || 0) === groupType &&
            Number(candidate.itineraryRouteId || 0) === Number(route.routeId || 0),
          );
          const base = exactCandidate || routeCandidate || {};
          const authoritativeRow = {
            ...buildAuthoritativeSelectedHotelRow(base as Record<string, unknown>, selected),
            groupType,
            itineraryRouteId: Number(route.routeId || 0),
            routeId: Number(route.routeId || 0),
            date: String(route.routeDate || '').slice(0, 10),
            checkInDate: String(route.routeDate || '').slice(0, 10),
            // hotelId is a legacy UI field. Only enrich it from a card whose
            // explicit property identity matched; never substitute a provider
            // property code for the canonical internal ID.
            hotelId: Number(selected.canonicalHotelId || exactCandidate?.hotelId || 0),
            hotelName: String(selected.hotelName || ''),
            category: (base as any).category ?? 0,
            roomType: String(selected.roomType || ''),
            mealPlan: String(selected.mealPlan || ''),
            totalHotelCost: Number(selected.totalPrice || 0),
            totalHotelTaxAmount: 0,
            pricePerNight: Number(selected.pricePerNight || 0),
            totalPrice: Number(selected.totalPrice || 0),
            optionKey: String(selected.rateOptionId || ''),
            ...getSupplierCredentialFields(selected),
            isSelected: true,
            selectionStatus: 'AVAILABLE' as const,
          } as ItineraryHotelRow;
          next[groupType] ||= {};
          next[groupType][helpers.getStayKey(authoritativeRow)] = authoritativeRow;
        });
      });
      setSelectedByGroup(next);
      setUserSelectedByGroup({});
      return;
    }
    if (hotels.length === 0) {
      setSelectedByGroup({});
      setUserSelectedByGroup({});
      return;
    }

    const next: Record<number, Record<string, ItineraryHotelRow>> = {};
    const nextUserSelections: Record<number, Record<string, ItineraryHotelRow>> = {};
    const hotelsByGroupAndStay: Record<number, Record<string, ItineraryHotelRow[]>> = {};

      // The previous-night early-arrival row is a billing explanation only.
      // Selection identity starts at the actual guest-arrival route so Day 0
      // cannot become a duplicate selectable stay.
      hotels
        .filter((hotel) => !hotel.previousDayBillingSynthetic)
        .forEach((hotel) => {
          const groupType = Number(hotel.groupType || 0);
          if (!groupType) return;
          hotelsByGroupAndStay[groupType] ||= {};
          const stayKey = helpers.getStayKey(hotel);
          hotelsByGroupAndStay[groupType][stayKey] ||= [];
          hotelsByGroupAndStay[groupType][stayKey].push(hotel);
        });

      const chooseDefaultForStay = (stayHotels: ItineraryHotelRow[]): ItineraryHotelRow | null => {
        // The persisted selection is authoritative after a page reload.
        const persistedSelection = stayHotels.find(isPersistedSelection);
        if (persistedSelection) return persistedSelection;

        // Selection is server-authoritative. A missing API selection is an
        // unresolved stay, never permission for React to choose a cheapest row.
        return null;
      };

      Object.entries(hotelsByGroupAndStay).forEach(([groupTypeText, stayMap]) => {
        const groupType = Number(groupTypeText);
        next[groupType] ||= {};
        let previousSelectedHotel: ItineraryHotelRow | null = null;

        helpers.sortStayGroupsByDate(Object.values(stayMap)).forEach((stayHotels) => {
          const stayKey = helpers.getStayKey(stayHotels[0]);
          const explicitSelection = findSelectionForStay(userSelectedByGroup[groupType], stayHotels);
          const currentExplicitSelection = explicitSelection
            ? stayHotels.find((candidate) =>
                helpers.isSelectableHotel(candidate) &&
                helpers.getHotelOptionKey(candidate) === helpers.getHotelOptionKey(explicitSelection),
              )
            : null;

          // A parent rerender can replace the `hotels` array after a successful
          // selection without changing availability. Preserve the explicit
          // choice when the same rate is still present; if it disappeared,
          // fall through to persisted/default selection and let reconciliation
          // choose a safe replacement.
          if (currentExplicitSelection) {
            const preservedSelection = {
              ...currentExplicitSelection,
              ...explicitSelection,
              itineraryRouteId: currentExplicitSelection.itineraryRouteId,
              routeId: currentExplicitSelection.routeId,
              date: currentExplicitSelection.date,
              checkInDate: currentExplicitSelection.checkInDate,
              checkOutDate: currentExplicitSelection.checkOutDate,
            };
            next[groupType][stayKey] = preservedSelection;
            nextUserSelections[groupType] ||= {};
            nextUserSelections[groupType][stayKey] = preservedSelection;
            previousSelectedHotel = preservedSelection;
            return;
          }

          const selected = chooseDefaultForStay(stayHotels);

          // Only persisted API selections or explicit user choices may enter
          // the selected map. A missing API selection remains unresolved;
          // React must not recreate an automatic choice from an old snapshot.
          if (selected) {
            next[groupType][stayKey] = selected;
            previousSelectedHotel = selected;
          }
        });
      });

    setSelectedByGroup(next);
    setUserSelectedByGroup(nextUserSelections);
    // `userSelectedByGroup` is intentionally read as the previous explicit
    // selection while availability changes. It is not a dependency because a
    // user selection alone must not reinitialize the whole options model.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hotelDataSignature, authoritativeStateSignature, planId]);

  useEffect(() => {
    setLocalRestrictedHotels(restrictedHotels);
  }, [restrictedHotels]);

  useEffect(() => {
    const validStayKeys = new Set(hotels.map(helpers.getStayKey));
    const validLogicalStayKeys = new Set(hotels.map(getLogicalStayKey));
    setUserSelectedByGroup((previous) => {
      const next: Record<number, Record<string, ItineraryHotelRow>> = {};
      Object.entries(previous).forEach(([groupTypeText, selections]) => {
        const groupType = Number(groupTypeText);
        Object.entries(selections).forEach(([stayKey, hotel]) => {
          if (validStayKeys.has(stayKey) || validLogicalStayKeys.has(getLogicalStayKey(hotel))) {
            next[groupType] ||= {};
            next[groupType][stayKey] = hotel;
          }
        });
      });
      return next;
    });
    // The stay-key helper is pure; hotel data is the only source that invalidates overrides.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hotelDataSignature]);

  // Internal reset compatibility for itinerary mutations that establish a
  // fresh availability snapshot. This is not exposed as a hotel-page action.
  const resetSelections = useCallback(() => {
    setSelectedByGroup({});
    setUserSelectedByGroup({});
  }, []);

  return {
    selectedByGroup,
    setSelectedByGroup,
    userSelectedByGroup,
    setUserSelectedByGroup,
    localHotels,
    setLocalHotels,
    localRestrictedHotels,
    setLocalRestrictedHotels,
    resetSelections,
  };
}
