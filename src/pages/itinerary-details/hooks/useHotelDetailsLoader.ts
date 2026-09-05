import { useCallback, useEffect, type MutableRefObject } from "react";
import { ItineraryService } from "@/services/itinerary";
import type {
  ItineraryDetailsResponse,
  ItineraryHotelDetailsResponse,
  ItineraryHotelRow,
  HotelAvailabilityChangeSummary,
} from "../itinerary-details.types";

const normalizeHotelProvider = (entry: any): string => String(entry?.provider || "").trim().toLowerCase();

const normalizeMealPlanCode = (payload: any): string | null => {
  const value = payload?.mealPlanCode ?? payload?.meal_plan_code;
  const normalized = String(value || "").trim().toUpperCase();
  return normalized || null;
};

interface HotelDetailsLoaderOptions {
  itineraryDaysCountRef: MutableRefObject<number>;
  fetchCompleteHotelDetailsRef: MutableRefObject<((quoteId: string) => Promise<ItineraryHotelDetailsResponse>) | null>;
  dedupeHotelRows: (rows: ItineraryHotelRow[]) => ItineraryHotelRow[];
}

type HotelAvailabilityCheckResponse = ItineraryHotelDetailsResponse & {
  hotelDetails?: ItineraryHotelDetailsResponse;
  financialSummary?: {
    overallCost?: number | null;
    costBreakdown?: ItineraryDetailsResponse["costBreakdown"] | null;
  };
};

/** Owns persisted summary, confirmed, and preference-gated hotel-details loading. */
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
    includeInventory?: boolean,
  ) => {
    try {
      return await ItineraryService.getPersistedHotelDetails(
        currentQuoteId,
        page,
        pageSize,
        groupType,
        itineraryRouteId,
        includeInventory,
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
    const base = await getPersistedHotelDetailsWithFallback(
      currentQuoteId,
      undefined,
      undefined,
      undefined,
      undefined,
    );
    const baseTyped = base as ItineraryHotelDetailsResponse;
    return {
      ...baseTyped,
      mealPlanCode: normalizeMealPlanCode(base),
      hotels: dedupeHotelRows([
        ...(baseTyped.hotels || []),
      ]),
      pagination: { ...(baseTyped.pagination || {}) },
      routePagination: { ...(baseTyped.routePagination || {}) },
      hotelAvailability: baseTyped.hotelAvailability,
    };
  }, [dedupeHotelRows, getPersistedHotelDetailsWithFallback]);

  useEffect(() => {
    fetchCompleteHotelDetailsRef.current = fetchCompleteHotelDetails;
  }, [fetchCompleteHotelDetails, fetchCompleteHotelDetailsRef]);

  const normalizeConfirmedHotelResponse = useCallback((payload: any): ItineraryHotelDetailsResponse => {
    if (payload?.hotelTabs && Array.isArray(payload?.hotels)) {
      return {
        mealPlanCode: normalizeMealPlanCode(payload),
        hotelRatesVisible: Boolean(payload?.hotelRatesVisible),
        showHotelMargins: Boolean(payload?.showHotelMargins),
        hotelTabs: Array.isArray(payload?.hotelTabs) ? payload.hotelTabs : [],
        hotelSelectionState: Array.isArray(payload?.hotelSelectionState) ? payload.hotelSelectionState : [],
        hotels: Array.isArray(payload?.hotels) ? payload.hotels : [],
        // Confirmed itineraries can still expose the recommendation pane.
        // Preserve the availability metadata (especially the shared city/day
        // inventory) instead of replacing it with a confirmed-only summary.
        hotelAvailability: payload?.hotelAvailability,
      };
    }

    const hotels = Array.isArray(payload?.hotels) ? payload.hotels : [];
    const totalRoutes = itineraryDaysCountRef.current;
    const supplierHotelCount = hotels.filter((hotel: any) => normalizeHotelProvider(hotel) !== "external").length;
    const placeholderRowCount = hotels.length - supplierHotelCount;
    return {
      mealPlanCode: normalizeMealPlanCode(payload),
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
          // Confirmed booked rows remain authoritative. Full recommendation
          // inventory is loaded lazily only when the hotel pane needs it.
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
    console.log("[ItineraryDetails] Draft itinerary detected. Checking hotel availability.", { quoteId, reconciliation: true });
    try {
      // Refresh must rebuild the supplier snapshot so offline hotels are
      // available again. Do not reset first: reset is an explicit destructive
      // action owned by the Reset button.
      const checked = await ItineraryService.checkHotelAvailability(quoteId, true) as HotelAvailabilityCheckResponse & {
        previewId?: string;
        reconciliationEnabled?: boolean;
        changeSummary?: HotelAvailabilityChangeSummary;
      };
      const hotelDetails = checked.hotelDetails || checked;
      return {
        ...hotelDetails,
        mealPlanCode: normalizeMealPlanCode(hotelDetails),
        hotels: dedupeHotelRows([...(hotelDetails.hotels || [])]),
        pagination: { ...(hotelDetails.pagination || {}) },
        routePagination: { ...(hotelDetails.routePagination || {}) },
        hotelAvailability: hotelDetails.hotelAvailability,
        financialSummary: checked.financialSummary,
        reconciliationEnabled: checked.reconciliationEnabled,
        previewId: checked.reconciliationEnabled ? checked.previewId : undefined,
        changeSummary: checked.reconciliationEnabled && checked.changeSummary
          ? { ...checked.changeSummary, previewId: checked.previewId }
          : undefined,
      };
    } catch (error) {
      console.warn("[ItineraryDetails] Hotel availability check failed.", {
        quoteId,
        error: error instanceof Error ? error.message : String(error || ""),
      });
      throw error;
    }
  }, [dedupeHotelRows, loadConfirmedHotelsFromDb]);

  return { fetchCompleteHotelDetails, loadConfirmedHotelsFromDb, loadHotelDetailsForItinerary };
};
