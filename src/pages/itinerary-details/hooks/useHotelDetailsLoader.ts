import { useCallback, useEffect, type MutableRefObject } from "react";
import { ItineraryService } from "@/services/itinerary";
import type {
  ItineraryDetailsResponse,
  ItineraryHotelDetailsResponse,
  ItineraryHotelRow,
} from "../itinerary-details.types";

const normalizeHotelProvider = (entry: any): string => String(entry?.provider || "").trim().toLowerCase();

interface HotelDetailsLoaderOptions {
  itineraryDaysCountRef: MutableRefObject<number>;
  fetchCompleteHotelDetailsRef: MutableRefObject<((quoteId: string) => Promise<ItineraryHotelDetailsResponse>) | null>;
  dedupeHotelRows: (rows: ItineraryHotelRow[]) => ItineraryHotelRow[];
}

/** Owns complete, confirmed, and preference-gated hotel-details loading. */
export const useHotelDetailsLoader = ({
  itineraryDaysCountRef,
  fetchCompleteHotelDetailsRef,
  dedupeHotelRows,
}: HotelDetailsLoaderOptions) => {
  const getPersistedHotelDetailsWithFallback = useCallback(async (
    currentQuoteId: string,
    page?: number,
    pageSize?: number,
    groupType?: number,
    itineraryRouteId?: number,
  ) => {
    try {
      return await ItineraryService.getPersistedHotelDetails(
        currentQuoteId,
        page,
        pageSize,
        groupType,
        itineraryRouteId,
      );
    } catch (error) {
      const status = typeof error === "object" && error && "status" in error
        ? Number((error as { status?: unknown }).status || 0)
        : 0;
      if (status !== 404) throw error;
      console.warn("[ItineraryDetails] Persisted hotel alias unavailable. Falling back to base hotel_details endpoint.", {
        currentQuoteId,
        page,
        pageSize,
        groupType,
        itineraryRouteId,
      });
      return ItineraryService.getHotelDetails(
        currentQuoteId,
        page,
        pageSize,
        groupType,
        itineraryRouteId,
      );
    }
  }, []);

  const fetchCompleteHotelDetails = useCallback(async (currentQuoteId: string): Promise<ItineraryHotelDetailsResponse> => {
    const base = await getPersistedHotelDetailsWithFallback(currentQuoteId);
    const merged: ItineraryHotelDetailsResponse = {
      ...(base as ItineraryHotelDetailsResponse),
      hotels: [...((base as ItineraryHotelDetailsResponse).hotels || [])],
      pagination: { ...((base as ItineraryHotelDetailsResponse).pagination || {}) },
      routePagination: { ...((base as ItineraryHotelDetailsResponse).routePagination || {}) },
    };

    const pending = new Map<string, { groupType: number; routeId: number; nextPage: number }>();
    Object.entries(merged.routePagination || {}).forEach(([key, meta]) => {
      const routeId = Number(String(key).split("-")[1] || 0);
      if (!meta?.hasMore || !meta.groupType || !routeId) return;
      pending.set(key, { groupType: Number(meta.groupType), routeId, nextPage: Number(meta.page || 1) + 1 });
    });

    while (pending.size > 0) {
      const [key, request] = pending.entries().next().value as [
        string,
        { groupType: number; routeId: number; nextPage: number }
      ];
      pending.delete(key);
      const next = await getPersistedHotelDetailsWithFallback(
        currentQuoteId,
        request.nextPage,
        20,
        request.groupType,
        request.routeId,
      );
      const nextTyped = next as ItineraryHotelDetailsResponse;
      merged.hotels = dedupeHotelRows([...(merged.hotels || []), ...(nextTyped.hotels || [])]);
      merged.pagination = { ...(merged.pagination || {}), ...(nextTyped.pagination || {}) };
      merged.routePagination = { ...(merged.routePagination || {}), ...(nextTyped.routePagination || {}) };
      const updatedMeta = merged.routePagination?.[key];
      if (updatedMeta?.hasMore) {
        pending.set(key, {
          groupType: Number(updatedMeta.groupType),
          routeId: request.routeId,
          nextPage: Number(updatedMeta.page || request.nextPage) + 1,
        });
      }
    }

    return merged;
  }, [dedupeHotelRows, getPersistedHotelDetailsWithFallback]);

  useEffect(() => {
    fetchCompleteHotelDetailsRef.current = fetchCompleteHotelDetails;
  }, [fetchCompleteHotelDetails, fetchCompleteHotelDetailsRef]);

  const normalizeConfirmedHotelResponse = useCallback((payload: any): ItineraryHotelDetailsResponse => {
    if (payload?.hotelTabs && Array.isArray(payload?.hotels)) {
      return {
        hotelRatesVisible: Boolean(payload?.hotelRatesVisible),
        showHotelMargins: Boolean(payload?.showHotelMargins),
        hotelTabs: Array.isArray(payload?.hotelTabs) ? payload.hotelTabs : [],
        hotelSelectionState: Array.isArray(payload?.hotelSelectionState) ? payload.hotelSelectionState : [],
        hotels: Array.isArray(payload?.hotels) ? payload.hotels : [],
        hotelAvailability: payload?.hotelAvailability,
      };
    }

    const hotels = Array.isArray(payload?.hotels) ? payload.hotels : [];
    const totalRoutes = itineraryDaysCountRef.current;
    const supplierHotelCount = hotels.filter((hotel: any) => normalizeHotelProvider(hotel) !== "external").length;
    const placeholderRowCount = hotels.length - supplierHotelCount;
    return {
      hotelRatesVisible: false,
      showHotelMargins: false,
      hotelTabs: [{
        groupType: 1,
        label: "Booked Hotels",
        totalAmount: hotels.reduce((sum: number, hotel: any) => (
          sum + Number(hotel?.totalHotelCost || 0) + Number(hotel?.totalHotelTaxAmount || 0)
        ), 0),
      }],
      hotels,
      hotelAvailability: {
        hasSupplierHotels: supplierHotelCount > 0,
        supplierHotelCount,
        placeholderRowCount,
        totalSearchRoutes: totalRoutes,
        emptySearchRoutes: Math.max(totalRoutes - hotels.length, 0),
        isPlaceholderOnly: supplierHotelCount === 0 && placeholderRowCount > 0,
        message: supplierHotelCount > 0
          ? "Showing confirmed booked hotels for this itinerary."
          : "No supplier hotel was booked for one or more stays in this confirmed itinerary.",
      },
    };
  }, [itineraryDaysCountRef]);

  const loadConfirmedHotelsFromDb = useCallback(async (
    confirmedPlanId: number,
    alreadyLoadedPayload?: any,
  ): Promise<ItineraryHotelDetailsResponse | null> => {
    if (!confirmedPlanId) return null;
    if (alreadyLoadedPayload && Array.isArray(alreadyLoadedPayload?.hotels)) {
      return normalizeConfirmedHotelResponse(alreadyLoadedPayload);
    }
    const confirmedRes = await ItineraryService.getConfirmedItinerary(confirmedPlanId);
    return normalizeConfirmedHotelResponse(confirmedRes);
  }, [normalizeConfirmedHotelResponse]);

  const loadHotelDetailsForItinerary = useCallback(async (
    quoteId: string,
    itinerary: ItineraryDetailsResponse,
  ): Promise<ItineraryHotelDetailsResponse | null> => {
    const preference = Number(itinerary.itineraryPreference ?? 3);
    if (preference !== 1 && preference !== 3) return null;
    const confirmedPlanId = Number((itinerary as any)?.confirmed_itinerary_plan_ID || 0);
    if (confirmedPlanId > 0) {
      console.log("[ItineraryDetails] Confirmed itinerary detected. Attempting confirmed DB hotels first.", { quoteId, confirmedPlanId });
      try {
        const confirmedHotels = await loadConfirmedHotelsFromDb(confirmedPlanId);
        if (confirmedHotels?.hotels?.length) {
          return confirmedHotels;
        }
        console.warn("[ItineraryDetails] Confirmed DB hotels empty. Falling back to persisted hotel snapshot.", { quoteId, confirmedPlanId });
      } catch (error) {
        console.warn("[ItineraryDetails] Confirmed DB hotel load failed. Falling back to persisted hotel snapshot.", {
          quoteId,
          confirmedPlanId,
          error: error instanceof Error ? error.message : String(error || ""),
        });
      }
    }
    console.log("[ItineraryDetails] Draft itinerary detected. Loading persisted hotel snapshot only.", { quoteId });
    return fetchCompleteHotelDetails(quoteId);
  }, [fetchCompleteHotelDetails, loadConfirmedHotelsFromDb]);

  return { fetchCompleteHotelDetails, loadConfirmedHotelsFromDb, loadHotelDetailsForItinerary };
};
