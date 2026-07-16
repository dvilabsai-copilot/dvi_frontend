import { useCallback, type Dispatch, type SetStateAction } from "react";
import { api } from "@/lib/api";
import type { GuideAvailabilityResponse } from "../itinerary-details.types";

export interface GuideAvailabilityLoaderProps {
  setGuideAvailability: Dispatch<SetStateAction<GuideAvailabilityResponse | null>>;
  setGuideAvailabilityLoading: Dispatch<SetStateAction<boolean>>;
}

export function useGuideAvailabilityLoader({
  setGuideAvailability,
  setGuideAvailabilityLoading,
}: GuideAvailabilityLoaderProps) {
  return useCallback(async (planId: number) => {
    if (!(planId > 0)) {
      setGuideAvailability(null);
      return;
    }

    setGuideAvailabilityLoading(true);
    try {
      const response = await api(`/itineraries/${planId}/guides/availability`) as GuideAvailabilityResponse;
      console.log("[GuideAvailability]", { planId, response });
      setGuideAvailability(response || null);
    } catch (error) {
      console.error("Failed to load guide availability", error);
      setGuideAvailability(null);
    } finally {
      setGuideAvailabilityLoading(false);
    }
  }, [setGuideAvailability, setGuideAvailabilityLoading]);
}

export default useGuideAvailabilityLoader;
