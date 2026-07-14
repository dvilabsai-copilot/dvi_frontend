import { useCallback, type Dispatch, type MutableRefObject, type SetStateAction } from "react";
import { useNavigate } from "react-router-dom";
import { ItineraryService } from "@/services/itinerary";
import { toast } from "sonner";
import type { ItineraryDetailsResponse, ItineraryHotelDetailsResponse } from "../itinerary-details.types";

interface RouteOptionSwitchOptions {
  activeRouteQuoteId: string | null;
  quoteId: string | null;
  itineraryQuoteId?: string;
  routeHotelDetailsByQuoteId: Record<string, ItineraryHotelDetailsResponse | null>;
  isMountedRef: MutableRefObject<boolean>;
  latestRouteRequestRef: MutableRefObject<number>;
  switchedRouteRef: MutableRefObject<string | null>;
  currentFetchRef: MutableRefObject<string | null>;
  shouldShowHotels: boolean;
  setIsSwitchingRouteOption: Dispatch<SetStateAction<boolean>>;
  setActiveRouteQuoteId: Dispatch<SetStateAction<string | null>>;
  setError: Dispatch<SetStateAction<string | null>>;
  setPageReady: Dispatch<SetStateAction<boolean>>;
  setLoading: Dispatch<SetStateAction<boolean>>;
  setLoadingHotels: Dispatch<SetStateAction<boolean>>;
  setItinerary: Dispatch<SetStateAction<ItineraryDetailsResponse | null>>;
  setHotelDetails: Dispatch<SetStateAction<ItineraryHotelDetailsResponse | null>>;
  setActiveHotelListTotal: Dispatch<SetStateAction<number>>;
  setVehicleBuildError: Dispatch<SetStateAction<string | null>>;
  setVehicleBuildStatus: Dispatch<SetStateAction<"PENDING" | "PROCESSING" | "READY" | "FAILED">>;
  pushPageLoaderStage: (stage: string) => void;
  getDetailsDeduped: (quoteId: string) => Promise<unknown>;
  loadAndCacheRouteHotelDetails: (quoteId: string) => Promise<ItineraryHotelDetailsResponse | null>;
}

/** Owns fast sibling-route switching and route-scoped hotel hydration. */
export const useRouteOptionSwitchController = ({
  activeRouteQuoteId,
  quoteId,
  itineraryQuoteId,
  routeHotelDetailsByQuoteId,
  isMountedRef,
  latestRouteRequestRef,
  switchedRouteRef,
  currentFetchRef,
  shouldShowHotels,
  setIsSwitchingRouteOption,
  setActiveRouteQuoteId,
  setError,
  setPageReady,
  setLoading,
  setLoadingHotels,
  setItinerary,
  setHotelDetails,
  setActiveHotelListTotal,
  setVehicleBuildError,
  setVehicleBuildStatus,
  pushPageLoaderStage,
  getDetailsDeduped,
  loadAndCacheRouteHotelDetails,
}: RouteOptionSwitchOptions) => {
  const navigate = useNavigate();

  return useCallback(async (routeQuoteId: string) => {
    const normalizedRouteQuoteId = String(routeQuoteId || "").trim();
    const selectedRouteQuoteId = activeRouteQuoteId || quoteId || itineraryQuoteId;
    if (!normalizedRouteQuoteId || normalizedRouteQuoteId === selectedRouteQuoteId) return;
    if (!normalizedRouteQuoteId.startsWith("DVI")) {
      toast.error("Invalid route option. Route quote ID is missing.");
      return;
    }

    const routeRequestId = ++latestRouteRequestRef.current;
    try {
      setIsSwitchingRouteOption(true);
      setActiveRouteQuoteId(normalizedRouteQuoteId);
      isMountedRef.current = true;
      switchedRouteRef.current = normalizedRouteQuoteId;
      currentFetchRef.current = normalizedRouteQuoteId;
      setError(null);
      setPageReady(true);
      setLoading(false);
      setLoadingHotels(true);
      pushPageLoaderStage("Loading selected route");
      navigate(`/itinerary-details/${normalizedRouteQuoteId}`, { replace: true });

      const details = (await getDetailsDeduped(normalizedRouteQuoteId)) as ItineraryDetailsResponse;
      if (!isMountedRef.current || latestRouteRequestRef.current !== routeRequestId) return;

      setItinerary(details);
      setVehicleBuildError(null);
      const preference = Number(details.itineraryPreference ?? 3);
      const useHotels = preference === 1 || preference === 3;
      const useVehicles = preference === 2 || preference === 3;
      setVehicleBuildStatus(useVehicles ? "READY" : "READY");
      if (!useHotels) {
        setHotelDetails(null);
        setActiveHotelListTotal(0);
        return;
      }

      const cachedHotelDetails = routeHotelDetailsByQuoteId[normalizedRouteQuoteId];
      if (cachedHotelDetails) {
        setHotelDetails(cachedHotelDetails);
        return;
      }

      setHotelDetails(null);
      const hotelRes = await loadAndCacheRouteHotelDetails(normalizedRouteQuoteId);
      if (!isMountedRef.current || latestRouteRequestRef.current !== routeRequestId) return;
      setHotelDetails(hotelRes as ItineraryHotelDetailsResponse | null);
    } catch (error) {
      if (latestRouteRequestRef.current !== routeRequestId) return;
      switchedRouteRef.current = null;
      console.error("Failed to switch itinerary route option", error);
      toast.error(error?.message || "Failed to load selected route option");
    } finally {
      if (latestRouteRequestRef.current === routeRequestId) {
        currentFetchRef.current = null;
        setLoading(false);
        setLoadingHotels(false);
        setIsSwitchingRouteOption(false);
      }
    }
  }, [activeRouteQuoteId, currentFetchRef, getDetailsDeduped, itineraryQuoteId, isMountedRef, latestRouteRequestRef, loadAndCacheRouteHotelDetails, navigate, pushPageLoaderStage, quoteId, routeHotelDetailsByQuoteId, setActiveHotelListTotal, setActiveRouteQuoteId, setError, setHotelDetails, setIsSwitchingRouteOption, setItinerary, setLoading, setLoadingHotels, setPageReady, setVehicleBuildError, setVehicleBuildStatus, shouldShowHotels, switchedRouteRef]);
};
