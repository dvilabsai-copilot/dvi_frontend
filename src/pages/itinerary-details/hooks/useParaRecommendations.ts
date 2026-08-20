import { useMemo } from "react";
import type {
  ItineraryHotelDetailsResponse,
  ItineraryHotelRow,
  ItineraryHotelSelectionGroupState,
} from "../itinerary-details.types";

const isExplicitlySelectedHotel = (hotel: ItineraryHotelRow): boolean =>
  hotel.isSelected === true ||
  String(hotel.selectionOrigin || '').trim().toUpperCase() === 'USER_SELECTED' ||
  String(hotel.selection?.selectionOrigin || '').trim().toUpperCase() === 'USER_SELECTED';

/** Returns one clipboard row per route, preferring the user's selected hotel. */
export const buildClipboardHotelRowsForGroup = (
  hotels: ItineraryHotelRow[],
  groupType: number,
  selectionState?: ItineraryHotelSelectionGroupState,
  stayResults?: ItineraryHotelDetailsResponse["hotelTabs"][number]["stayResults"],
  routeMetadata?: NonNullable<ItineraryHotelDetailsResponse["hotelAvailability"]>["stayRoutes"],
  sharedInventory?: ItineraryHotelRow[],
): ItineraryHotelRow[] => {
  const grouped = new Map<number, ItineraryHotelRow[]>();
  hotels
    .filter((hotel) => Number(hotel.groupType) === Number(groupType))
    .forEach((hotel) => {
      const routeId = Number(hotel.itineraryRouteId || 0);
      const rows = grouped.get(routeId) || [];
      rows.push(hotel);
      grouped.set(routeId, rows);
    });

  const rows = Array.from(grouped.entries())
    .sort((a, b) => a[0] - b[0])
    .map(([, rows]) => {
      const selectedRows = rows.filter(isExplicitlySelectedHotel);
      const candidates = selectedRows.length ? selectedRows : rows;
      return candidates.reduce((best, current) => (
        Number(current.totalHotelCost || 0) + Number(current.totalHotelTaxAmount || 0)
          < Number(best.totalHotelCost || 0) + Number(best.totalHotelTaxAmount || 0)
          ? current
          : best
      ));
    });

  // The hotel endpoint can legitimately return a selection matrix route even
  // when the selected hotel row is not present in `hotels` (for example after
  // a partial supplier result). Keep that date in clipboard output instead of
  // silently dropping it and leaving only the cost breakdown.
  if (!selectionState?.routes?.length) return rows;

  const rowByRouteId = new Map(rows.map((row) => [Number(row.itineraryRouteId), row]));
  const stayByRouteId = new Map(
    (stayResults || []).flatMap((stay) =>
      (stay.routeIds || [stay.parentRouteId]).map((routeId) => [Number(routeId), stay] as const),
    ),
  );
  const routeById = new Map(
    (routeMetadata || []).map((route) => [Number(route.routeId), route] as const),
  );
  const destinationByRouteId = new Map<number, string>();
  for (const row of [...hotels, ...(sharedInventory || [])]) {
    const routeId = Number(row.itineraryRouteId || 0);
    const destination = String(row.destination || '').trim();
    if (routeId && destination && !destinationByRouteId.has(routeId)) {
      destinationByRouteId.set(routeId, destination);
    }
  }
  const matrixRows = selectionState.routes
    .slice()
    .sort((a, b) => Number(a.routeId) - Number(b.routeId))
    .map((route) => {
      const existing = rowByRouteId.get(Number(route.routeId));
      const routeMetadataEntry = routeById.get(Number(route.routeId));
      const stay = stayByRouteId.get(Number(route.routeId));
      if (existing) {
        return {
          ...existing,
          destination: String(existing.destination || '').trim()
            || stay?.destination
            || routeMetadataEntry?.destination
            || destinationByRouteId.get(Number(route.routeId))
            || '',
          date: existing.date || route.routeDate || routeMetadataEntry?.date || '',
          ...(routeMetadataEntry?.dayNumber ? { dayNumber: routeMetadataEntry.dayNumber } : {}),
        };
      }

      const selected = route.selected;
      const selectedHotelName = String(selected?.hotelName || '').trim();
      const selectedRoomType = String(selected?.roomType || '').trim();
      const selectedMealPlan = String(selected?.mealPlan || '').trim();
      const isAvailable = route.selectionStatus !== 'UNAVAILABLE' && Boolean(selectedHotelName);

      return {
        groupType: Number(groupType),
        itineraryRouteId: Number(route.routeId),
        routeIds: [Number(route.routeId)],
        stayKey: `clipboard-selection-${groupType}-${route.routeId}`,
        day: `Day ${Number(route.routeId)}`,
        dayNumber: 0,
        date: route.routeDate || routeMetadataEntry?.date || '',
        destination: stay?.destination || routeMetadataEntry?.destination || destinationByRouteId.get(Number(route.routeId)) || '',
        hotelId: Number(selected?.canonicalHotelId || 0),
        canonicalHotelId: selected?.canonicalHotelId ?? null,
        providerHotelCode: selected?.providerHotelCode ?? null,
        hotelName: isAvailable ? selectedHotelName : 'No hotel available',
        category: selected?.category ?? '',
        roomType: isAvailable ? selectedRoomType : '',
        mealPlan: isAvailable ? selectedMealPlan : '',
        totalHotelCost: 0,
        totalHotelTaxAmount: 0,
        provider: selected?.provider || 'external',
        isBookable: isAvailable,
        isSelectable: isAvailable,
        availabilityState: isAvailable ? 'AVAILABLE' : 'UNAVAILABLE',
        selectionStatus: isAvailable ? 'AVAILABLE' : 'UNAVAILABLE',
      } as ItineraryHotelRow;
    });

  return matrixRows;
};

/** Derives one cheapest recommendation row per hotel group for clipboard/para views. */
export const useParaRecommendations = (hotelDetails: ItineraryHotelDetailsResponse | null) => useMemo(() => {
  if (!hotelDetails?.hotelTabs?.length) return [];
  return hotelDetails.hotelTabs.slice(0, 4).map((tab) => ({
    label: tab.label || `Recommended #${Number(tab.groupType)}`,
    groupType: Number(tab.groupType),
    tabLabel: tab.label,
    hotels: buildClipboardHotelRowsForGroup(
      hotelDetails.hotels,
      Number(tab.groupType),
      hotelDetails.hotelSelectionState?.find((state) => Number(state.groupType) === Number(tab.groupType)),
      tab.stayResults,
      hotelDetails.hotelAvailability?.stayRoutes,
      hotelDetails.hotelAvailability?.sharedHotelInventory,
    ),
  }));
}, [hotelDetails]);

