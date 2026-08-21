import { useCallback } from "react";
import { toast } from "sonner";
import { ItineraryService } from "@/services/itinerary";
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
    await ItineraryService.downloadHotelVoucherPdf(planId);
    return;
  }

  // 2 = Transport only
  if (normalizedPreference === 2) {
    await ItineraryService.downloadVehicleVoucherPdf(planId);
    return;
  }

  // 3 = Transportation + Hotel
  if (normalizedPreference === 3) {
    await ItineraryService.downloadVoucherPdf(planId);
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