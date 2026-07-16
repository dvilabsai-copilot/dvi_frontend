import { useCallback, type Dispatch, type SetStateAction } from "react";
import { toast } from "sonner";

export function useItineraryShareActions(setShareModal: Dispatch<SetStateAction<boolean>>) {
  const handleCopyLink = useCallback(() => {
    void navigator.clipboard.writeText(window.location.href);
    toast.success("Link copied to clipboard!");
  }, []);

  const handleShareWhatsApp = useCallback(() => {
    const message = `Check out this itinerary: ${window.location.href}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, "_blank");
  }, []);

  const handleShareEmail = useCallback(() => setShareModal(true), [setShareModal]);

  return { handleCopyLink, handleShareWhatsApp, handleShareEmail };
}

