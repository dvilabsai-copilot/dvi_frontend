import { useCallback, type Dispatch, type SetStateAction } from "react";
import { ItineraryService } from "@/services/itinerary";
import type { ItineraryHotelDetailsResponse, ItineraryHotelRow } from "../itinerary-details.types";
import type { HotelPaginationMessage } from "./useHotelSelectionState";

interface HotelPaginationControllerOptions {
  quoteId?: string | null;
  isLoadingMoreHotels: boolean;
  setIsLoadingMoreHotels: Dispatch<SetStateAction<boolean>>;
  setHotelDetails: Dispatch<SetStateAction<ItineraryHotelDetailsResponse | null>>;
  setHotelPageByGroupRoute: Dispatch<SetStateAction<Record<string, number>>>;
  setHotelPaginationMessage: Dispatch<SetStateAction<HotelPaginationMessage | null>>;
}

/** Owns paginated hotel-row loading and merge behavior for a selected route/group. */
export const useHotelPaginationController = ({
  quoteId,
  isLoadingMoreHotels,
  setIsLoadingMoreHotels,
  setHotelDetails,
  setHotelPageByGroupRoute,
  setHotelPaginationMessage,
}: HotelPaginationControllerOptions) => {
  const handleHotelLoadMore = useCallback(async (groupType: number, routeId: number, nextPage: number) => {
    if (!quoteId || isLoadingMoreHotels) return;
    setHotelPaginationMessage(null);
    setIsLoadingMoreHotels(true);
    try {
      const data = await ItineraryService.getPersistedHotelDetails(quoteId, nextPage, 20, groupType, routeId);
      const newRows: ItineraryHotelRow[] = data.hotels || [];
      if (newRows.length === 0) {
        setHotelPaginationMessage({
          groupType,
          routeId,
          message: `No more hotel options were returned for this day (page ${nextPage}).`,
        });
      }
      setHotelDetails((previous) => {
        if (!previous) return previous;
        const routeKey = `${groupType}-${routeId}`;
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
        const existingIndex = Array.isArray(previous.hotelIndex)
          ? previous.hotelIndex as Array<Record<string, unknown>>
          : [];
        const indexByKey = new Map<string, Record<string, unknown>>();
        [...existingIndex, ...newRows].forEach((row) => {
          const source = row as Record<string, unknown>;
          const provider = String(source.provider || '').trim().toLowerCase();
          const hotelCode = String(source.hotelCode || source.providerHotelCode || '').trim();
          const hotelName = String(source.hotelName || '').trim();
          const rowGroupType = Number(source.groupType || 0);
          const rowRouteId = Number(source.itineraryRouteId || source.routeId || 0);
          const key = [provider, hotelCode.toLowerCase(), hotelName.toLowerCase(), rowGroupType, rowRouteId].join('|');
          if (!indexByKey.has(key)) {
            indexByKey.set(key, {
              provider,
              hotelId: source.hotelId ?? source.canonicalHotelId,
              hotelCode: hotelCode || undefined,
              hotelName,
              category: source.category,
              groupType: rowGroupType,
              routeId: rowRouteId,
              date: source.date || source.checkInDate,
            });
          }
        });
        const nextRoutePagination = { ...(previous.routePagination || {}) };
        Object.entries(data.routePagination || {}).forEach(([key, incoming]) => {
          const previousMeta = nextRoutePagination[key];
          if (!previousMeta) {
            nextRoutePagination[key] = incoming;
            return;
          }

          // A load-more response is allowed to advance a route, never to move
          // it backwards. Some persisted snapshot responses can contain older
          // page/total metadata than the page that is already visible.
          const previousPage = Math.max(0, Number(previousMeta.page || 0));
          const incomingPage = Math.max(0, Number(incoming?.page || 0));
          const page = Math.max(previousPage, incomingPage);
          const pageSize = Math.max(
            1,
            Number(incoming?.pageSize || previousMeta.pageSize || 20),
          );
          const total = Math.max(
            0,
            Number(previousMeta.total || 0),
            Number(incoming?.total || 0),
          );
          const incomingIsNewer = incomingPage >= previousPage;
          nextRoutePagination[key] = {
            ...previousMeta,
            ...incoming,
            page,
            pageSize,
            total,
            // Derive this from the monotonic page/total pair. This prevents a
            // stale lower-page response from reopening Load More after the
            // final page has already been requested.
            hasMore: page * pageSize < total && (
              incomingIsNewer ? Boolean(incoming?.hasMore) : Boolean(previousMeta.hasMore)
            ),
          };
        });

        // The requested route must advance even if the API omitted its
        // routePagination entry in an empty-page response.
        const requestedMeta = nextRoutePagination[routeKey];
        if (requestedMeta) {
          const page = Math.max(Number(requestedMeta.page || 0), nextPage);
          const pageSize = Math.max(1, Number(requestedMeta.pageSize || 20));
          nextRoutePagination[routeKey] = {
            ...requestedMeta,
            page,
            hasMore: page * pageSize < Number(requestedMeta.total || 0) && Boolean(requestedMeta.hasMore),
          };
        }

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
          routePagination: Object.keys(nextRoutePagination).length > 0
            ? nextRoutePagination
            : previous.routePagination,
        };
      });
      setHotelPageByGroupRoute((previous) => ({ ...previous, [`${groupType}-${routeId}`]: nextPage }));
    } catch (error) {
      console.error("Load More hotels failed", error);
      setHotelPaginationMessage({
        groupType,
        routeId,
        message: "Could not load more hotels for this day. Please try again.",
      });
    } finally {
      setIsLoadingMoreHotels(false);
    }
  }, [isLoadingMoreHotels, quoteId, setHotelDetails, setHotelPageByGroupRoute, setHotelPaginationMessage, setIsLoadingMoreHotels]);

  return { handleHotelLoadMore };
};

