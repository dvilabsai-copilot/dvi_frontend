import { useCallback, type Dispatch, type SetStateAction } from "react";
import { ItineraryService } from "@/services/itinerary";
import { toast } from "sonner";
import type {
  ItineraryDetailsResponse,
  ItineraryHotelDetailsResponse,
  HotelAvailabilityChangeSummary,
} from "../itinerary-details.types";

interface HotelDataControllerOptions {
  quoteId: string | null;
  activeHotelGroupType: number | null;
  isRebuildingHotels: boolean;
  setActiveHotelGroupType: Dispatch<SetStateAction<number | null>>;
  setHotelDetails: Dispatch<SetStateAction<ItineraryHotelDetailsResponse | null>>;
  setIsRebuildingHotels: Dispatch<SetStateAction<boolean>>;
  setItinerary: Dispatch<SetStateAction<ItineraryDetailsResponse | null>>;
  setLoadingHotels: Dispatch<SetStateAction<boolean>>;
  cacheRouteHotelDetails: (quoteId: string, details: ItineraryHotelDetailsResponse | null) => void;
  fetchCompleteHotelDetails: (quoteId: string) => Promise<ItineraryHotelDetailsResponse>;
  loadHotelDetailsForItinerary: (
    quoteId: string,
    itinerary: ItineraryDetailsResponse,
  ) => Promise<ItineraryHotelDetailsResponse | null>;
}

type HotelResponseRow = ItineraryHotelDetailsResponse["hotels"][number] & {
  routeId?: number;
  routeIds?: number[];
  itinerary_route_id?: number;
  itineraryRouteDate?: string;
  itinerary_route_date?: string;
  checkInDate?: string;
  date?: string;
};

type HotelAvailabilityRoute = {
  routeId?: number;
  date?: string;
  dayNumber?: number;
  destination?: string;
};

type HotelAvailabilitySnapshot = {
  stayRoutes?: HotelAvailabilityRoute[];
  sharedHotelInventory?: HotelResponseRow[];
};

/**
 * Keep one top-level row for every hotel stay route. Supplier responses may
 * represent a continuous stay as one row with routeIds=[first,last], while
 * the hotel table is route-oriented. Without these anchors the final night
 * can disappear even though it exists in sharedHotelInventory.
 */
const ensureHotelRowsCoverStayRoutes = (
  details: ItineraryHotelDetailsResponse,
): ItineraryHotelDetailsResponse => {
  const availability = details.hotelAvailability as unknown as HotelAvailabilitySnapshot | null | undefined;
  const stayRoutes = Array.isArray(availability?.stayRoutes) ? availability.stayRoutes : [];
  if (stayRoutes.length === 0) return details;

  const rows = Array.isArray(details.hotels) ? [...details.hotels] as HotelResponseRow[] : [];
  let rowsChanged = false;
  const inventory = Array.isArray(availability?.sharedHotelInventory)
    ? availability.sharedHotelInventory as HotelResponseRow[]
    : [];
  const routeOf = (row: HotelResponseRow): number => Number(
    row.itineraryRouteId || row.routeId || row.itinerary_route_id || 0,
  );
  const routeIdsOf = (row: HotelResponseRow): number[] => Array.from(new Set([
    routeOf(row),
    ...(Array.isArray(row.routeIds) ? row.routeIds.map(Number) : []),
  ].filter((id) => id > 0)));
  const dateOf = (row: HotelResponseRow): string => String(
    row.date || row.checkInDate || row.itineraryRouteDate || row.itinerary_route_date || '',
  ).slice(0, 10);
  const isMissingHotelName = (value: unknown): boolean => {
    const normalized = String(value || '').trim().toLowerCase();
    return !normalized || normalized === '-' || normalized === '--' || normalized === 'no hotel available';
  };

  // A persisted placeholder can already occupy the route bucket with a room
  // type but no hotel identity. Prefer the current shared inventory row for
  // that route (and, when possible, the same room type) so a successful
  // availability response is actually visible in the pane. Never replace a
  // row that already has a hotel name; that protects selected/offline rows.
  rows.forEach((row, index) => {
    if (!isMissingHotelName(row.hotelName)) return;
    const routeIds = routeIdsOf(row);
    if (routeIds.length === 0) return;
    const rowRoomType = String((row as any).roomType || (row as any).roomTypeName || '').trim().toLowerCase();
    const candidates = inventory.filter((candidate) =>
      routeIds.some((routeId) => routeIdsOf(candidate).includes(routeId)) &&
      !isMissingHotelName(candidate.hotelName),
    );
    if (candidates.length === 0) return;
    const roomMatch = rowRoomType
      ? candidates.find((candidate) => String((candidate as any).roomType || (candidate as any).roomTypeName || '').trim().toLowerCase() === rowRoomType)
      : undefined;
    const source = roomMatch || candidates[0];
    rows[index] = {
      ...source,
      ...row,
      hotelName: source.hotelName,
      hotelId: row.hotelId || source.hotelId,
      canonicalHotelId: (row as any).canonicalHotelId || (source as any).canonicalHotelId,
      hotelCode: row.hotelCode || source.hotelCode,
      provider: row.provider || source.provider,
      rateOptions: (row as any).rateOptions?.length ? (row as any).rateOptions : (source as any).rateOptions,
    } as HotelResponseRow;
    rowsChanged = true;
  });

  stayRoutes.forEach((route) => {
    const routeId = Number(route.routeId || 0);
    const date = String(route.date || '').slice(0, 10);
    if (!routeId || !date || rows.some((row) => routeIdsOf(row).includes(routeId) && dateOf(row) === date)) return;

    const source = inventory.find((row) => routeIdsOf(row).includes(routeId)) || {} as HotelResponseRow;
    rows.push({
      ...source,
      itineraryRouteId: routeId,
      routeId,
      routeIds: [routeId],
      date,
      checkInDate: date,
      day: `Day ${Number(route.dayNumber || 0)} | ${date}`,
      dayNumber: Number(route.dayNumber || 0),
      destination: String(route.destination || source.destination || '').trim(),
      // This is a route display anchor, not a new selection. Preserve all
      // supplier/rate fields from the source but never copy its selection.
      isSelected: false,
      selectionId: undefined,
      selectionOrigin: undefined,
    } as HotelResponseRow);
    rowsChanged = true;
  });

  return !rowsChanged
    ? details
    : { ...details, hotels: rows as ItineraryHotelDetailsResponse["hotels"] };
};

/** Owns hotel/vehicle refresh and hotel rebuild mutations used by the itinerary page. */
export const useHotelDataController = ({
  quoteId,
  isRebuildingHotels,
  setActiveHotelGroupType,
  setHotelDetails,
  setIsRebuildingHotels,
  setItinerary,
  setLoadingHotels,
  cacheRouteHotelDetails,
  fetchCompleteHotelDetails,
}: HotelDataControllerOptions) => {
  const refreshHotelData = useCallback(async () => {
    if (!quoteId) return null;

    try {
      setLoadingHotels(true);
      console.log("🔄 [ItineraryDetails] Starting hotel data refresh for quoteId:", quoteId);
      const hotelRes = await ItineraryService.getPersistedHotelDetails(quoteId);
      if (hotelRes) {
        console.log("✅ [ItineraryDetails] Persisted hotel data received:", { hotelRes });
        setHotelDetails(hotelRes as ItineraryHotelDetailsResponse | null);
        cacheRouteHotelDetails(quoteId, hotelRes as ItineraryHotelDetailsResponse | null);
      }
      console.log("✅ [ItineraryDetails] State updated with new hotel data");
      return hotelRes as ItineraryHotelDetailsResponse | null;
    } catch (error) {
      console.error("❌ [ItineraryDetails] Failed to refresh hotel data", error);
      return null;
    } finally {
      setLoadingHotels(false);
    }
  }, [cacheRouteHotelDetails, quoteId, setHotelDetails, setLoadingHotels]);

  const refreshVehicleData = useCallback(async () => {
    if (!quoteId) return;

  try {
      const detailsRes = await ItineraryService.getDetails(quoteId);
      const vehiclePayload = detailsRes as {
        vehicles?: Array<{
          vehicleTypeName?: string;
          vendorEligibleId?: number;
          dayWisePricing?: Array<{ totalKms?: number }>;
          totalAmount?: number;
        }>;
      };
      console.log("[REFRESH_VEHICLE_DATA_RESULT]", {
        vehicleCount: Array.isArray(vehiclePayload.vehicles) ? vehiclePayload.vehicles.length : 0,
        vehicles: (vehiclePayload.vehicles || []).map((vehicle) => ({
          vehicleTypeName: vehicle.vehicleTypeName,
          vendorEligibleId: vehicle.vendorEligibleId,
          totals: vehicle.dayWisePricing?.map((day) => day.totalKms),
          totalAmount: vehicle.totalAmount,
        })),
      });
      setItinerary(detailsRes as ItineraryDetailsResponse);
    } catch (error) {
      console.error("Failed to refresh vehicle data", error);
    }
  }, [quoteId, setItinerary]);

  const handleHotelGroupTypeChange = useCallback((groupType: number) => {
    console.log("Hotel group type changed locally to:", groupType);
    setActiveHotelGroupType(groupType);
  }, [setActiveHotelGroupType]);

  const refreshSelectedHotelRates = useCallback(async (payload: {
    routeId: number;
    provider: string;
    hotelCode: string;
    groupType?: number;
  }) => {
    if (!quoteId) return null;
    const result = await ItineraryService.refreshSelectedHotelRates(quoteId, payload);
    // The mutation response contains refreshed rows, but the page also reads
    // authoritative totals and selected identities from hotelTabs and
    // hotelSelectionState. Reload the complete persisted response after the
    // write so every dependent view changes in the same React render.
    const refreshedDetails = await fetchCompleteHotelDetails(quoteId);
    setHotelDetails(refreshedDetails);
    cacheRouteHotelDetails(quoteId, refreshedDetails);
    const resultRecord = result && typeof result === "object"
      ? result as Record<string, unknown>
      : {};
    return {
      ...resultRecord,
      hotelDetails: refreshedDetails,
    };
  }, [cacheRouteHotelDetails, fetchCompleteHotelDetails, quoteId, setHotelDetails]);

  const handleRebuildHotels = useCallback(async (
    options: { background?: boolean } = {},
  ): Promise<HotelAvailabilityChangeSummary | null> => {
    if (!quoteId || isRebuildingHotels) return null;
    const background = options.background === true;

    try {
      setIsRebuildingHotels(true);
      if (!background) {
        setLoadingHotels(true);
        toast.info("Checking hotel availability...");
      }

      const refreshedHotelRes = await ItineraryService.checkHotelAvailability(quoteId) as {
        hotelDetails?: ItineraryHotelDetailsResponse;
        changeSummary?: HotelAvailabilityChangeSummary;
        itinerary?: ItineraryDetailsResponse;
      } & ItineraryHotelDetailsResponse;
      const hotelDetails = ensureHotelRowsCoverStayRoutes(
        (refreshedHotelRes.hotelDetails || refreshedHotelRes) as ItineraryHotelDetailsResponse,
      );
      const changeSummary = refreshedHotelRes.changeSummary || null;
      setHotelDetails(hotelDetails as ItineraryHotelDetailsResponse);
      if (refreshedHotelRes.itinerary) {
        setItinerary((previous) => previous
          ? {
              ...previous,
              overallCost: refreshedHotelRes.itinerary?.overallCost ?? previous.overallCost,
              costBreakdown: refreshedHotelRes.itinerary?.costBreakdown ?? previous.costBreakdown,
            }
          : refreshedHotelRes.itinerary);
      }
      cacheRouteHotelDetails(quoteId, hotelDetails as ItineraryHotelDetailsResponse);
      if (!background && changeSummary?.hasChanges) {
        toast.success("Hotel availability refreshed.");
      } else if (!background) {
        toast.success("Availability checked. No hotel or price changes were found.");
      }
      return changeSummary;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to check hotel availability";
      toast.error(background
        ? `Hotel availability could not be verified: ${message}`
        : message);
      return null;
    } finally {
      if (!background) setLoadingHotels(false);
      setIsRebuildingHotels(false);
    }
  }, [cacheRouteHotelDetails, isRebuildingHotels, quoteId, setHotelDetails, setIsRebuildingHotels, setLoadingHotels]);

  const handleResetHotels = useCallback(async () => {
    if (!quoteId || isRebuildingHotels) return null;

    try {
      setIsRebuildingHotels(true);
      setLoadingHotels(true);
      toast.info("Resetting hotels and fetching fresh availability...");
      const result = await ItineraryService.resetHotelAvailability(quoteId) as {
        hotelDetails?: ItineraryHotelDetailsResponse;
        financialSummary?: { overallCost?: number | null; costBreakdown?: ItineraryDetailsResponse["costBreakdown"] | null };
      };

      // Keep the established reset flow: reset clears/rebuilds the saved
      // selections, then check-availability performs the response used by
      // the hotel pane. The second response is currently the authoritative
      // UI payload for provider inventory and selection flags.
      const refreshedResult = await ItineraryService.checkHotelAvailability(quoteId) as {
        hotelDetails?: ItineraryHotelDetailsResponse;
        changeSummary?: HotelAvailabilityChangeSummary;
        itinerary?: ItineraryDetailsResponse;
      } & ItineraryHotelDetailsResponse;
      const hotelDetails = ensureHotelRowsCoverStayRoutes(
        (refreshedResult.hotelDetails || refreshedResult) as ItineraryHotelDetailsResponse,
      );
      setHotelDetails(hotelDetails);
      cacheRouteHotelDetails(quoteId, hotelDetails);
      if (result.financialSummary) {
        setItinerary((previous) => previous ? {
          ...previous,
          overallCost: result.financialSummary?.overallCost ?? previous.overallCost,
          costBreakdown: result.financialSummary?.costBreakdown ?? previous.costBreakdown,
        } : previous);
      }
      toast.success("Hotels reset and fresh availability loaded.");
      return {
        ...result,
        ...refreshedResult,
        hotelDetails,
      };
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to reset hotels");
      return null;
    } finally {
      setLoadingHotels(false);
      setIsRebuildingHotels(false);
    }
  }, [cacheRouteHotelDetails, isRebuildingHotels, quoteId, setHotelDetails, setIsRebuildingHotels, setItinerary, setLoadingHotels]);

  const handleShowOfflineHotels = useCallback(async (routeId?: number): Promise<void> => {
    if (!quoteId || isRebuildingHotels) return;

    try {
      setIsRebuildingHotels(true);
      setLoadingHotels(true);
      const scope = routeId && routeId > 0 ? "this stay" : "all stay groups";
      toast.info(`Fetching offline hotels for ${scope}...`);
      const result = await ItineraryService.fetchOfflineHotelAvailability(quoteId, routeId) as {
        hotelDetails?: ItineraryHotelDetailsResponse;
        itinerary?: ItineraryDetailsResponse;
      } & ItineraryHotelDetailsResponse;
      const hotelDetails = result.hotelDetails || result;
      setHotelDetails(hotelDetails as ItineraryHotelDetailsResponse);
      if (result.itinerary) {
        setItinerary((previous) => previous
          ? {
              ...previous,
              overallCost: result.itinerary?.overallCost ?? previous.overallCost,
              costBreakdown: result.itinerary?.costBreakdown ?? previous.costBreakdown,
            }
          : result.itinerary);
      }
      cacheRouteHotelDetails(quoteId, hotelDetails as ItineraryHotelDetailsResponse);
      const offlineFetch = (hotelDetails as ItineraryHotelDetailsResponse & {
        hotelAvailability?: { offlineFetch?: { fetchedHotelCount?: number } };
      }).hotelAvailability?.offlineFetch;
      if (Number(offlineFetch?.fetchedHotelCount || 0) > 0) {
        toast.success(`Offline hotels loaded for ${scope}.`);
      } else {
        toast.info(`No offline hotels are available for ${scope} for the selected dates.`);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to fetch offline hotels";
      toast.error(message);
    } finally {
      setLoadingHotels(false);
      setIsRebuildingHotels(false);
    }
  }, [cacheRouteHotelDetails, isRebuildingHotels, quoteId, setHotelDetails, setIsRebuildingHotels, setLoadingHotels]);

  return { handleHotelGroupTypeChange, handleRebuildHotels, handleResetHotels, handleShowOfflineHotels, refreshHotelData, refreshVehicleData, refreshSelectedHotelRates };
};
