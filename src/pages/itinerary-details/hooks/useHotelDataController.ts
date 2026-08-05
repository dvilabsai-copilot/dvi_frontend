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
    const refreshedHotels = Array.isArray((result as any)?.hotels)
      ? (result as any).hotels
      : [];
    if (refreshedHotels.length > 0) {
      const normalizedProvider = String(payload.provider || '').trim().toLowerCase();
      const normalizedHotelCode = String(payload.hotelCode || '').trim().toLowerCase();
      setHotelDetails((previous) => {
        if (!previous) return previous;
        const existingHotels = Array.isArray(previous.hotels) ? previous.hotels : [];
        const targetGroupType = Number(payload.groupType || 0);
        const isTargetHotel = (hotel: any) => {
          const routeId = Number(hotel?.itineraryRouteId || hotel?.routeId || 0);
          const provider = String(hotel?.provider || '').trim().toLowerCase();
          const hotelCode = String(
            hotel?.hotelCode || hotel?.providerHotelCode || hotel?.hotelId || '',
          ).trim().toLowerCase();
          return routeId === Number(payload.routeId) &&
            provider === normalizedProvider &&
            hotelCode === normalizedHotelCode &&
            (!targetGroupType || Number(hotel?.groupType || 0) === targetGroupType);
        };
        const scopedRefreshedHotels = refreshedHotels.map((hotel: any) => ({
          ...hotel,
          ...(targetGroupType > 0 ? { groupType: targetGroupType } : {}),
        }));
        return {
          ...previous,
          hotels: [
            ...existingHotels.filter((hotel: any) => !isTargetHotel(hotel)),
            ...scopedRefreshedHotels,
          ],
        };
      });
    }
    return result;
  }, [quoteId, setHotelDetails]);

  const handleRebuildHotels = useCallback(async (): Promise<HotelAvailabilityChangeSummary | null> => {
    if (!quoteId || isRebuildingHotels) return null;

    try {
      setIsRebuildingHotels(true);
      setLoadingHotels(true);
      toast.info("Checking hotel availability...");

      const refreshedHotelRes = await ItineraryService.checkHotelAvailability(quoteId) as {
        hotelDetails?: ItineraryHotelDetailsResponse;
        changeSummary?: HotelAvailabilityChangeSummary;
        itinerary?: ItineraryDetailsResponse;
      } & ItineraryHotelDetailsResponse;
      const hotelDetails = refreshedHotelRes.hotelDetails || refreshedHotelRes;
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
      if (changeSummary?.hasChanges) {
        toast.success("Hotel availability refreshed.");
      } else {
        toast.success("Availability checked. No hotel or price changes were found.");
      }
      return changeSummary;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to check hotel availability";
      toast.error(message);
      return null;
    } finally {
      setLoadingHotels(false);
      setIsRebuildingHotels(false);
    }
  }, [cacheRouteHotelDetails, isRebuildingHotels, quoteId, setHotelDetails, setIsRebuildingHotels, setLoadingHotels]);

  const handleResetHotels = useCallback(async (): Promise<HotelAvailabilityChangeSummary | null> => {
    if (!quoteId || isRebuildingHotels) return null;

    try {
      setIsRebuildingHotels(true);
      setLoadingHotels(true);
      toast.info("Resetting hotel selections and checking availability...");

      const resetHotelRes = await ItineraryService.resetHotelAvailability(quoteId) as {
        hotelDetails?: ItineraryHotelDetailsResponse;
        changeSummary?: HotelAvailabilityChangeSummary;
        itinerary?: ItineraryDetailsResponse;
      } & ItineraryHotelDetailsResponse;
      const hotelDetails = resetHotelRes.hotelDetails || resetHotelRes;
      const changeSummary = resetHotelRes.changeSummary || null;
      setHotelDetails(hotelDetails as ItineraryHotelDetailsResponse);
      if (resetHotelRes.itinerary) {
        setItinerary((previous) => previous
          ? {
              ...previous,
              overallCost: resetHotelRes.itinerary?.overallCost ?? previous.overallCost,
              costBreakdown: resetHotelRes.itinerary?.costBreakdown ?? previous.costBreakdown,
            }
          : resetHotelRes.itinerary);
      }
      cacheRouteHotelDetails(quoteId, hotelDetails as ItineraryHotelDetailsResponse);
      toast.success("Hotels reset and fetched successfully.");
      return changeSummary;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to reset hotels";
      toast.error(message);
      return null;
    } finally {
      setLoadingHotels(false);
      setIsRebuildingHotels(false);
    }
  }, [cacheRouteHotelDetails, isRebuildingHotels, quoteId, setHotelDetails, setIsRebuildingHotels, setLoadingHotels]);

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
      const offlineFetch = (hotelDetails as any)?.hotelAvailability?.offlineFetch;
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
