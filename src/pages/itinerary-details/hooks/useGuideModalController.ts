import { useCallback, type Dispatch, type SetStateAction } from "react";
import { ItineraryService } from "@/services/itinerary";
import { toast } from "sonner";
import type { GuideModalOptions, ItineraryDay, ItineraryGuideAssignment } from "../itinerary-details.types";

interface GuideModalState {
  open: boolean;
  loading: boolean;
  saving?: boolean;
  planId: number | null;
  day: ItineraryDay | null;
  routeGuideId: number | null;
  guideType: number;
  guideLanguage: string;
  guideSlots: number[];
  options: GuideModalOptions;
}

interface GuideModalControllerOptions {
  readOnly: boolean;
  itineraryPlanId: number;
  setGuideModal: Dispatch<SetStateAction<GuideModalState>>;
}

/** Owns guide modal option hydration and local assignment-slot precedence. */
export const useGuideModalController = ({
  readOnly,
  itineraryPlanId,
  setGuideModal,
}: GuideModalControllerOptions) => {
  return useCallback(async (
    day?: ItineraryDay | null,
    assignment?: ItineraryGuideAssignment | null,
    guideTypeOverride?: 1 | 2,
  ) => {
    if (readOnly) {
      toast.error("Guide cannot be added in read-only mode");
      return;
    }
    if (!(itineraryPlanId > 0)) {
      toast.error("Plan ID not found");
      return;
    }

    const guideType = Number(guideTypeOverride || assignment?.guideType || 2);
    setGuideModal((previous) => ({
      ...previous,
      open: true,
      loading: true,
      planId: itineraryPlanId,
      day: day || null,
      routeGuideId: assignment?.routeGuideId ?? null,
      guideType,
      guideLanguage: assignment?.guideLanguageIds?.[0] ? String(assignment.guideLanguageIds[0]) : "",
      guideSlots: assignment?.guideSlotIds ?? [],
      options: { languages: [], slots: [], assignment: assignment ?? null },
    }));

    try {
      const options = await ItineraryService.getGuideAssignmentOptions(itineraryPlanId, assignment?.routeGuideId) as GuideModalOptions;
      const apiAssignment = options?.assignment ?? null;
      const localAssignment = assignment ?? null;
      const existing = localAssignment ?? apiAssignment ?? null;
      const localGuideSlotIds = Array.isArray(localAssignment?.guideSlotIds)
        ? localAssignment.guideSlotIds.map(Number).filter((id) => Number.isFinite(id) && id > 0)
        : [];
      const apiGuideSlotIds = Array.isArray(apiAssignment?.guideSlotIds)
        ? apiAssignment.guideSlotIds.map(Number).filter((id) => Number.isFinite(id) && id > 0)
        : [];
      const localLanguageId = Number(localAssignment?.guideLanguageIds?.[0] || 0);
      const apiLanguageId = Number(apiAssignment?.guideLanguageIds?.[0] || 0);

      setGuideModal((previous) => {
        const resolvedGuideSlotIds = localGuideSlotIds.length > 0
          ? localGuideSlotIds
          : apiGuideSlotIds.length > 0 ? apiGuideSlotIds : previous.guideSlots;
        return {
          ...previous,
          loading: false,
          options: {
            languages: Array.isArray(options?.languages) ? options.languages : [],
            slots: Array.isArray(options?.slots) ? options.slots : [],
            assignment: existing,
          },
          routeGuideId: existing?.routeGuideId ?? previous.routeGuideId,
          guideLanguage: localLanguageId > 0
            ? String(localLanguageId)
            : apiLanguageId > 0 ? String(apiLanguageId) : previous.guideLanguage,
          guideSlots: resolvedGuideSlotIds,
        };
      });
    } catch (error) {
      console.error("Failed to load guide modal options", error);
      setGuideModal((previous) => ({ ...previous, loading: false, open: false }));
      toast.error(error?.message || "Failed to load guide options");
    }
  }, [itineraryPlanId, readOnly, setGuideModal]);
};
