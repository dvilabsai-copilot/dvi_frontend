import { useCallback } from "react";
import { toast } from "sonner";

/** Owns opening itinerary document previews from the summary actions. */
export const useItineraryDocumentActions = (planId: number) => {
  const handleDownloadPluckCard = useCallback(async () => {
    if (!planId) {
      toast.error("Itinerary plan is not available yet");
      return;
    }
    window.open(`/pdf-preview/pluck-card/${planId}`, "_blank", "noopener,noreferrer");
  }, [planId]);

  const handleDownloadInvoice = useCallback(async (type: "tax" | "proforma") => {
    if (!planId) {
      toast.error("Itinerary plan is not available yet");
      return;
    }
    window.open(`/pdf-preview/invoice/${planId}?type=${encodeURIComponent(type)}`, "_blank", "noopener,noreferrer");
  }, [planId]);

  return { handleDownloadPluckCard, handleDownloadInvoice };
};

