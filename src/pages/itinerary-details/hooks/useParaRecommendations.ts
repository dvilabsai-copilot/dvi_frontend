import { useMemo } from "react";
import type { ItineraryHotelDetailsResponse, ItineraryHotelRow } from "../itinerary-details.types";

/** Derives one cheapest recommendation row per hotel group for clipboard/para views. */
export const useParaRecommendations = (hotelDetails: ItineraryHotelDetailsResponse | null) => useMemo(() => {
  if (!hotelDetails?.hotelTabs?.length) return [];
  const getRenderedHotelsForGroup = (groupType: number): ItineraryHotelRow[] => {
    const grouped = new Map<number, ItineraryHotelRow[]>();
    hotelDetails.hotels.filter((hotel) => hotel.groupType === groupType).forEach((hotel) => {
      const routeId = Number(hotel.itineraryRouteId || 0);
      const rows = grouped.get(routeId) || [];
      rows.push(hotel);
      grouped.set(routeId, rows);
    });
    return Array.from(grouped.entries()).sort((a, b) => a[0] - b[0]).map(([, rows]) => rows.reduce((best, current) => (
      Number(current.totalHotelCost || 0) + Number(current.totalHotelTaxAmount || 0)
        < Number(best.totalHotelCost || 0) + Number(best.totalHotelTaxAmount || 0)
        ? current
        : best
    )));
  };
  return hotelDetails.hotelTabs.slice(0, 4).map((tab, index) => ({
    label: `Recommended #${index + 1}`,
    groupType: tab.groupType,
    tabLabel: tab.label,
    hotels: getRenderedHotelsForGroup(tab.groupType),
  }));
}, [hotelDetails]);

