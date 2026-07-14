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
      const data = await ItineraryService.getHotelDetails(quoteId, nextPage, 20, groupType, routeId);
      const newRows: ItineraryHotelRow[] = data.hotels || [];
      setHotelDetails((previous) => {
        if (!previous) return previous;
        return {
          ...previous,
          hotels: [...previous.hotels, ...newRows],
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

