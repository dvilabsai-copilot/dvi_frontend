import { useCallback, type Dispatch, type SetStateAction } from "react";
import { ItineraryService } from "@/services/itinerary";
import type { ItineraryHotelDetailsResponse, ItineraryHotelRow } from "../itinerary-details.types";

interface HotelPaginationControllerOptions {
  quoteId?: string | null;
  isLoadingMoreHotels: boolean;
  setIsLoadingMoreHotels: Dispatch<SetStateAction<boolean>>;
  setHotelDetails: Dispatch<SetStateAction<ItineraryHotelDetailsResponse | null>>;
  setHotelPageByGroupRoute: Dispatch<SetStateAction<Record<string, number>>>;
}

/** Owns paginated hotel-row loading and merge behavior for a selected route/group. */
export const useHotelPaginationController = ({
  quoteId,
  isLoadingMoreHotels,
  setIsLoadingMoreHotels,
  setHotelDetails,
  setHotelPageByGroupRoute,
}: HotelPaginationControllerOptions) => {
  const handleHotelLoadMore = useCallback(async (groupType: number, routeId: number, nextPage: number) => {
    if (!quoteId || isLoadingMoreHotels) return;
    setIsLoadingMoreHotels(true);
    try {
      const data = await ItineraryService.getPersistedHotelDetails(quoteId, nextPage, 20, groupType, routeId);
      const newRows: ItineraryHotelRow[] = data.hotels || [];
      setHotelDetails((previous) => {
        if (!previous) return previous;
        // The compact initial response intentionally omits the full shared
        // inventory. HotelListTable builds its cards from that inventory (and
        // the local inventory mirror), not only from the selected top-level
        // `hotels` rows. Merging pagination only into `hotels` therefore
        // changed the counter while leaving the original cards on screen.
        // Add each fetched page to the card inventory and identity index too.
        const existingInventory = Array.isArray(previous.hotelAvailability?.sharedHotelInventory)
          ? previous.hotelAvailability.sharedHotelInventory
          : [];
        const inventoryByKey = new Map<string, ItineraryHotelRow>();
        [...existingInventory, ...newRows].forEach((row) => {
          const key = [
            String(row.provider || '').trim().toLowerCase(),
            String(row.hotelCode || row.providerHotelCode || row.hotelId || '').trim().toLowerCase(),
            String(row.hotelName || '').trim().toLowerCase(),
            Number(row.groupType || 0),
            Number(row.itineraryRouteId || row.routeId || 0),
            String(row.date || row.checkInDate || '').slice(0, 10),
            String(row.rateOptionId || row.optionKey || row.bookingCode || '').trim().toLowerCase(),
          ].join('|');
          if (!inventoryByKey.has(key)) inventoryByKey.set(key, row);
        });
        const nextInventory = Array.from(inventoryByKey.values());
        const existingIndex = Array.isArray(previous.hotelIndex) ? previous.hotelIndex : [];
        const indexByKey = new Map<string, any>();
        [...existingIndex, ...newRows].forEach((row: any) => {
          const provider = String(row.provider || '').trim().toLowerCase();
          const hotelCode = String(row.hotelCode || row.providerHotelCode || '').trim();
          const hotelName = String(row.hotelName || '').trim();
          const rowGroupType = Number(row.groupType || 0);
          const rowRouteId = Number(row.itineraryRouteId || row.routeId || 0);
          const key = [provider, hotelCode.toLowerCase(), hotelName.toLowerCase(), rowGroupType, rowRouteId].join('|');
          if (!indexByKey.has(key)) {
            indexByKey.set(key, {
              provider,
              hotelId: row.hotelId ?? row.canonicalHotelId,
              hotelCode: hotelCode || undefined,
              hotelName,
              category: row.category,
              groupType: rowGroupType,
              routeId: rowRouteId,
              date: row.date || row.checkInDate,
            });
          }
        });
        return {
          ...previous,
          hotels: [...previous.hotels, ...newRows],
          hotelIndex: Array.from(indexByKey.values()),
          hotelAvailability: previous.hotelAvailability
            ? {
                ...previous.hotelAvailability,
                sharedHotelInventory: nextInventory,
              }
            : previous.hotelAvailability,
          pagination: data.pagination ? { ...(previous.pagination || {}), ...data.pagination } : previous.pagination,
          routePagination: data.routePagination
            ? { ...(previous.routePagination || {}), ...data.routePagination }
            : previous.routePagination,
        };
      });
      setHotelPageByGroupRoute((previous) => ({ ...previous, [`${groupType}-${routeId}`]: nextPage }));
    } catch (error) {
      console.error("Load More hotels failed", error);
    } finally {
      setIsLoadingMoreHotels(false);
    }
  }, [isLoadingMoreHotels, quoteId, setHotelDetails, setHotelPageByGroupRoute, setIsLoadingMoreHotels]);

  return { handleHotelLoadMore };
};

