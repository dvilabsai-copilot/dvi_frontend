import { useCallback, type Dispatch, type SetStateAction } from "react";
import { ItineraryService } from "@/services/itinerary";
import { toast } from "sonner";
import type {
  ItineraryDetailsResponse,
  ItineraryHotelDetailsResponse,
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
  activeHotelGroupType,
  isRebuildingHotels,
  setActiveHotelGroupType,
  setHotelDetails,
  setIsRebuildingHotels,
  setItinerary,
  setLoadingHotels,
  cacheRouteHotelDetails,
  fetchCompleteHotelDetails,
  loadHotelDetailsForItinerary,
}: HotelDataControllerOptions) => {
  const refreshHotelData = useCallback(async () => {
    if (!quoteId) return;

    try {
      setLoadingHotels(true);
      console.log("🔄 [ItineraryDetails] Starting hotel data refresh for quoteId:", quoteId);
      const detailsRes = await ItineraryService.getDetails(quoteId);
      const details = detailsRes as ItineraryDetailsResponse;
      setItinerary(details);

      const preference = Number(details.itineraryPreference ?? 3);
      const useHotels = preference === 1 || preference === 3;

      if (useHotels) {
        const hotelRes = await loadHotelDetailsForItinerary(quoteId, details);
        console.log("✅ [ItineraryDetails] Hotel data received:", { detailsRes, hotelRes });
        setHotelDetails(hotelRes as ItineraryHotelDetailsResponse | null);
        cacheRouteHotelDetails(quoteId, hotelRes as ItineraryHotelDetailsResponse | null);
      } else {
        setHotelDetails(null);
      }
      console.log("✅ [ItineraryDetails] State updated with new hotel data");
    } catch (error) {
      console.error("❌ [ItineraryDetails] Failed to refresh hotel data", error);
    } finally {
      setLoadingHotels(false);
    }
  }, [cacheRouteHotelDetails, loadHotelDetailsForItinerary, quoteId, setHotelDetails, setItinerary, setLoadingHotels]);

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

  const handleHotelGroupTypeChange = useCallback(async (groupType: number) => {
    if (!quoteId) return;

    console.log("Hotel group type changed to:", groupType);
    setActiveHotelGroupType(groupType);

    try {
      const detailsRes = await ItineraryService.getDetails(quoteId, groupType);
      setItinerary((previous) => {
        const next = detailsRes as ItineraryDetailsResponse;
        const preserveTemporaryPricing = previous?.costBreakdown?.hotelPricingSource === "selected_hotel_rate";
        const preference = Number(next.itineraryPreference ?? 0);
        const shouldKeepVehicleState =
          (preference === 2 || preference === 3) &&
          (!Array.isArray(next.vehicles) || next.vehicles.length === 0) &&
          Array.isArray(previous?.vehicles) &&
          previous.vehicles.length > 0;

        const merged = shouldKeepVehicleState ? { ...next, vehicles: previous!.vehicles } : next;
        return preserveTemporaryPricing
          ? {
              ...merged,
              overallCost: previous!.overallCost,
              costBreakdown: previous!.costBreakdown,
            }
          : merged;
      });
    } catch (error) {
      console.error("Failed to update data for group type change", error);
    }
  }, [quoteId, setActiveHotelGroupType, setItinerary]);

  const handleRebuildHotels = useCallback(async () => {
    if (!quoteId || isRebuildingHotels) return;

    try {
      setIsRebuildingHotels(true);
      setLoadingHotels(true);
      toast.info("Rebuilding hotels...");

      const [detailsRes] = await Promise.all([
        ItineraryService.getDetails(quoteId),
        ItineraryService.rebuildHotelDetails(quoteId, 1, 20, activeHotelGroupType || undefined),
      ]);

      setItinerary(detailsRes as ItineraryDetailsResponse);
      const completeHotelRes = await fetchCompleteHotelDetails(quoteId);
      setHotelDetails(completeHotelRes as ItineraryHotelDetailsResponse);
      cacheRouteHotelDetails(quoteId, completeHotelRes as ItineraryHotelDetailsResponse);
      toast.success("Hotels rebuilt successfully");
    } catch (error) {
      toast.error(error?.message || "Failed to rebuild hotels");
    } finally {
      setLoadingHotels(false);
      setIsRebuildingHotels(false);
    }
  }, [activeHotelGroupType, cacheRouteHotelDetails, fetchCompleteHotelDetails, isRebuildingHotels, quoteId, setHotelDetails, setIsRebuildingHotels, setItinerary, setLoadingHotels]);

  return { handleHotelGroupTypeChange, handleRebuildHotels, refreshHotelData, refreshVehicleData };
};
