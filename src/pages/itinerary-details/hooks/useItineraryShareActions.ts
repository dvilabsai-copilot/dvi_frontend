import { useCallback, type Dispatch, type SetStateAction } from "react";
import { toast } from "sonner";
import { ItineraryService } from "@/services/itinerary";

export function useItineraryShareActions(
  setShareModal: Dispatch<SetStateAction<boolean>>,
  itineraryPlanId: number,
  groupType: number,
) {
  const createPublicShareUrl = useCallback(async () => {
    if (!itineraryPlanId || !groupType) {
      throw new Error("Missing itinerary plan or group type");
    }

    const response = (await ItineraryService.createPublicLink(
      itineraryPlanId,
      groupType,
    )) as {
      url?: string;
      expiresAt?: string;
    };

    const url = String(response?.url || "").trim();

    if (!url) {
      throw new Error("Public itinerary URL was not returned");
    }

    return url;
  }, [itineraryPlanId, groupType]);

  const handleCopyLink = useCallback(async () => {
    try {
      const url = await createPublicShareUrl();
      await navigator.clipboard.writeText(url);
      toast.success("Link copied to clipboard!");
    } catch (error) {
      console.error("Failed to create public itinerary link", error);
      toast.error("Failed to create itinerary link");
    }
  }, [createPublicShareUrl]);

  const handleShareWhatsApp = useCallback(async () => {
    try {
      const url = await createPublicShareUrl();
      const message = `Check out this itinerary: ${url}`;

      window.open(
        `https://wa.me/?text=${encodeURIComponent(message)}`,
        "_blank",
      );
    } catch (error) {
      console.error("Failed to create public itinerary link", error);
      toast.error("Failed to create itinerary link");
    }
  }, [createPublicShareUrl]);

  const handleShareEmail = useCallback(
    () => setShareModal(true),
    [setShareModal],
  );

  return {
    handleCopyLink,
    handleShareWhatsApp,
    handleShareEmail,
  };
}