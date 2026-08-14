import { useMemo } from "react";
import type { ItineraryHotelDetailsResponse, ItineraryHotelRow } from "../itinerary-details.types";

const isExplicitlySelectedHotel = (hotel: ItineraryHotelRow): boolean =>
  hotel.isSelected === true ||
  String(hotel.selectionOrigin || '').trim().toUpperCase() === 'USER_SELECTED' ||
  String(hotel.selection?.selectionOrigin || '').trim().toUpperCase() === 'USER_SELECTED';

/** Returns one clipboard row per route, preferring the user's selected hotel. */
export const buildClipboardHotelRowsForGroup = (
  hotels: ItineraryHotelRow[],
  groupType: number,
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

  return Array.from(grouped.entries())
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
};

/** Derives one cheapest recommendation row per hotel group for clipboard/para views. */
export const useParaRecommendations = (hotelDetails: ItineraryHotelDetailsResponse | null) => useMemo(() => {
  if (!hotelDetails?.hotelTabs?.length) return [];
  return hotelDetails.hotelTabs.slice(0, 4).map((tab) => ({
    label: tab.label || `Recommended #${Number(tab.groupType)}`,
    groupType: Number(tab.groupType),
    tabLabel: tab.label,
    hotels: buildClipboardHotelRowsForGroup(hotelDetails.hotels, Number(tab.groupType)),
  }));
}, [hotelDetails]);

