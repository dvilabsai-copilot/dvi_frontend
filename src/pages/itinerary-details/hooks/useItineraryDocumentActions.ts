import { useCallback } from "react";
import { toast } from "sonner";

/** Owns opening itinerary document previews from the summary actions. */
export const useItineraryDocumentActions = (
  planId: number,
  itineraryPreference: number,
) => {
  const handleDownloadPluckCard = useCallback(async () => {
    if (!planId) {
      toast.error("Itinerary plan is not available yet");
      return;
    }

    window.open(
      `/pdf-preview/pluck-card/${planId}`,
      "_blank",
      "noopener,noreferrer",
    );
  }, [planId]);

  const handleDownloadInvoice = useCallback(
    async (type: "tax" | "proforma") => {
      if (!planId) {
        toast.error("Itinerary plan is not available yet");
        return;
      }

      window.open(
        `/pdf-preview/invoice/${planId}?type=${encodeURIComponent(type)}`,
        "_blank",
        "noopener,noreferrer",
      );
    },
    [planId],
  );

  const handleDownloadDetailedVoucher = useCallback(async () => {
    if (!planId) {
      toast.error("Itinerary plan is not available yet");
      return;
    }

    const normalizedPreference = Number(itineraryPreference || 0);

    // 1 = Hotel only
    if (normalizedPreference === 1) {
      window.open(
        `/pdf-preview/hotel-voucher/${planId}`,
        "_blank",
        "noopener,noreferrer",
      );
      return;
    }

  // 2 = Transport only
if (normalizedPreference === 2) {
  window.open(
    `/pdf-preview/travel-voucher/${planId}`,
    "_blank",
    "noopener,noreferrer",
  );
  return;
}

// 3 = Transportation + Hotel
if (normalizedPreference === 3) {
  window.open(
    `/pdf-preview/voucher/${planId}`,
    "_blank",
    "noopener,noreferrer",
  );
  return;
}

toast.error("Detailed voucher preview is not available for this itinerary");
  }, [planId, itineraryPreference]);

  return {
    handleDownloadPluckCard,
    handleDownloadInvoice,
    handleDownloadDetailedVoucher,
  };
};