import { useCallback, type Dispatch, type SetStateAction } from "react";
import { ItineraryService } from "@/services/itinerary";
import type { ItineraryDetailsResponse, ItineraryGuideAssignment } from "../itinerary-details.types";

interface GuideDataRefreshOptions {
  quoteId?: string | null;
  itineraryPlanId?: number | null;
  setGuideAssignments: (assignments: ItineraryGuideAssignment[]) => void;
  setItinerary: Dispatch<SetStateAction<ItineraryDetailsResponse | null>>;
}

/** Owns guide assignment loading and post-change itinerary refreshes. */
export const useGuideDataRefresh = ({
  quoteId,
  itineraryPlanId,
  setGuideAssignments,
  setItinerary,
}: GuideDataRefreshOptions) => {
  const loadGuideAssignments = useCallback(async (planId: number) => {
    if (!(planId > 0)) {
      setGuideAssignments([]);
      return;
    }

    try {
      const response = await ItineraryService.getGuideAssignments(planId) as ItineraryGuideAssignment[];
      setGuideAssignments(Array.isArray(response) ? response : []);
    } catch (error) {
      console.error("Failed to load guide assignments", error);
      setGuideAssignments([]);
    }
  }, [setGuideAssignments]);

  const refreshGuideData = useCallback(async () => {
    const planId = Number(itineraryPlanId || 0);
    if (!(planId > 0)) return;

    await Promise.all([
      loadGuideAssignments(planId),
      (async () => {
        if (!quoteId) return;
        try {
          const detailsRes = await ItineraryService.getDetails(quoteId) as ItineraryDetailsResponse;
          setItinerary(detailsRes);
        } catch (error) {
          console.error("Failed to refresh itinerary details after guide change", error);
        }
      })(),
    ]);
  }, [itineraryPlanId, loadGuideAssignments, quoteId, setItinerary]);

  return { loadGuideAssignments, refreshGuideData };
};

