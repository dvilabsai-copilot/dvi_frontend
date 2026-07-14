import { useCallback, type Dispatch, type SetStateAction } from "react";
import { ItineraryService } from "@/services/itinerary";
import { toast } from "sonner";
import type {
  GuideModalOptions,
  ItineraryDay,
  ItineraryDetailsResponse,
  ItineraryGuideAssignment,
} from "../itinerary-details.types";

interface GuideModalState {
  planId?: number | null;
  day?: ItineraryDay | null;
  routeGuideId?: number | null;
  guideType?: number | string | null;
  guideLanguage?: number | string | null;
  guideSlots: Array<number | string>;
  options: GuideModalOptions;
}

interface GuideAssignmentSaveMutationOptions {
  guideModal: GuideModalState;
  itineraryDays?: ItineraryDay[];
  refreshGuideData: () => Promise<void>;
  setGuideAssignments: Dispatch<SetStateAction<ItineraryGuideAssignment[]>>;
  setGuideModal: Dispatch<SetStateAction<GuideModalState>>;
  setItinerary: Dispatch<SetStateAction<ItineraryDetailsResponse | null>>;
}

interface GuideSaveResponse {
  guideCost?: number | string | null;
  guide_cost?: number | string | null;
  routeGuideId?: number | string | null;
  route_guide_id?: number | string | null;
}

export function useGuideAssignmentSaveMutation({
  guideModal,
  itineraryDays,
  refreshGuideData,
  setGuideAssignments,
  setGuideModal,
  setItinerary,
}: GuideAssignmentSaveMutationOptions) {
  return useCallback(async () => {
    const planId = Number(guideModal.planId || 0);
    const day = guideModal.day;
    const guideLanguage = Number(guideModal.guideLanguage || 0);
    const selectedGuideSlots = guideModal.guideSlots.map(Number);
    const isWholeItineraryGuide = Number(guideModal.guideType || 0) === 1;

    const firstDay =
      itineraryDays?.find((item) => Number(item.dayNumber || 0) === 1) ||
      itineraryDays?.[0] ||
      null;

    if (!(planId > 0) || (!isWholeItineraryGuide && !day)) {
      toast.error("Guide form is incomplete");
      return;
    }

    if (!(guideLanguage > 0)) {
      toast.error("Guide language is required");
      return;
    }

    if (selectedGuideSlots.length === 0) {
      toast.error("Guide slot is required");
      return;
    }

    try {
      setGuideModal((previous) => ({ ...previous, saving: true }));

      const savedGuide = await ItineraryService.saveGuideAssignment(planId, {
        routeGuideId: guideModal.routeGuideId ?? undefined,
        routeId: isWholeItineraryGuide ? firstDay?.id : day?.id,
        routeDate: isWholeItineraryGuide ? firstDay?.date : day?.date,
        guideType: Number(guideModal.guideType || 0),
        guideLanguage,
        guideSlots: selectedGuideSlots,
      }) as GuideSaveResponse;

      await refreshGuideData();

      let refreshedGuideAssignment: ItineraryGuideAssignment | null = null;
      try {
        const refreshedOptions = await ItineraryService.getGuideAssignmentOptions(
          planId,
          Number(savedGuide?.routeGuideId || savedGuide?.route_guide_id || guideModal.routeGuideId || 0) || undefined,
        ) as GuideModalOptions;
        refreshedGuideAssignment = refreshedOptions?.assignment ?? null;
      } catch (costRefreshError) {
        console.warn("Failed to refresh guide cost after save", costRefreshError);
      }

      const selectedLanguageLabel =
        guideModal.options.languages.find((item) => Number(item.id) === guideLanguage)?.label ||
        refreshedGuideAssignment?.guideLanguageLabels?.[0] ||
        guideModal.options.assignment?.guideLanguageLabels?.[0] ||
        "English";

      const selectedSlotLabels = guideModal.options.slots
        .filter((slot) => selectedGuideSlots.map(Number).includes(Number(slot.id)))
        .map((slot) => slot.label);

      let oldGuideCostForHeader = 0;
      let newGuideCostForHeader = 0;

      setGuideAssignments((previous) => {
        const existingIndex = previous.findIndex((assignment) => (
          guideModal.routeGuideId
            ? Number(assignment.routeGuideId || 0) === Number(guideModal.routeGuideId)
            : Number(assignment.guideType || 0) === Number(guideModal.guideType || 0) &&
              (isWholeItineraryGuide || Number(assignment.routeId || 0) === Number(day?.id || 0))
        ));

        if (existingIndex < 0) return previous;

        const next = [...previous];
        const existing = next[existingIndex];
        const backendGuideCost = Number(
          savedGuide?.guideCost ??
          savedGuide?.guide_cost ??
          refreshedGuideAssignment?.guideCost ??
          (refreshedGuideAssignment as ItineraryGuideAssignment & { guide_cost?: number | string | null })?.guide_cost ??
          0
        );
        const oldGuideCost = Number(existing.guideCost || 0);
        const oldSlotCount = Math.max(
          Array.isArray(existing.guideSlotIds) ? existing.guideSlotIds.length : 0,
          1,
        );
        const newSlotCount = Math.max(selectedGuideSlots.length, 1);
        const fallbackGuideCost = Number(((oldGuideCost / oldSlotCount) * newSlotCount).toFixed(2));
        const updatedGuideCost =
          backendGuideCost > 0 && Math.abs(backendGuideCost - oldGuideCost) > 0.01
            ? backendGuideCost
            : fallbackGuideCost;

        oldGuideCostForHeader = oldGuideCost;
        newGuideCostForHeader = updatedGuideCost;
        next[existingIndex] = {
          ...existing,
          routeGuideId: Number(savedGuide?.routeGuideId || savedGuide?.route_guide_id || existing.routeGuideId || guideModal.routeGuideId || 0),
          guideLanguage: selectedLanguageLabel,
          guideLanguageIds: [guideLanguage],
          guideLanguageLabels: [selectedLanguageLabel],
          guideSlotIds: selectedGuideSlots.map(Number),
          guideSlotLabels: selectedSlotLabels,
          guideSlot: selectedSlotLabels.join(", "),
          guideCost: updatedGuideCost,
        };
        return next;
      });

      if (oldGuideCostForHeader !== newGuideCostForHeader) {
        const guideCostDiff = Number((newGuideCostForHeader - oldGuideCostForHeader).toFixed(2));
        setItinerary((previous) => {
          if (!previous) return previous;
          const currentTotalGuideCost = Number(previous.costBreakdown?.totalGuideCost || 0);
          const currentTotalAmount = Number(previous.costBreakdown?.totalAmount || 0);
          const currentNetPayable = Number(previous.costBreakdown?.netPayable || previous.overallCost || 0);
          const currentOverallCost = Number(previous.overallCost || 0);
          return {
            ...previous,
            overallCost: Number((currentOverallCost + guideCostDiff).toFixed(2)),
            costBreakdown: {
              ...previous.costBreakdown,
              totalGuideCost: Number((currentTotalGuideCost + guideCostDiff).toFixed(2)),
              totalAmount: Number((currentTotalAmount + guideCostDiff).toFixed(2)),
              netPayable: Number((currentNetPayable + guideCostDiff).toFixed(2)),
            },
          };
        });
      }

      setGuideModal((previous) => ({ ...previous, open: false, saving: false }));
      toast.success(guideModal.routeGuideId ? "Guide updated successfully" : "Guide added successfully");
    } catch (error) {
      console.error("Failed to save guide assignment", error);
      setGuideModal((previous) => ({ ...previous, saving: false }));
      const rawMessage = error instanceof Error ? error.message : String(error || "");
      if (rawMessage.includes("guide_not_available")) {
        toast.error("Sorry, Guide Cost Not Available. So Unable to Add");
        return;
      }
      toast.error(rawMessage || "Failed to save guide");
    }
  }, [guideModal, itineraryDays, refreshGuideData, setGuideAssignments, setGuideModal, setItinerary]);
}

export default useGuideAssignmentSaveMutation;
