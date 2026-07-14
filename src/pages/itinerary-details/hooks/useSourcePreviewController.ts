import { useCallback, type Dispatch, type SetStateAction } from "react";
import { toast } from "sonner";
import { ItineraryService } from "@/services/itinerary";

type SourcePreviewControllerOptions = {
  activeRouteQuoteId: string | null | undefined;
  quoteId: string | null | undefined;
  itineraryQuoteId: string | null | undefined;
  setOpen: Dispatch<SetStateAction<boolean>>;
  setLoading: Dispatch<SetStateAction<boolean>>;
  setError: Dispatch<SetStateAction<string | null>>;
  setMarkdown: Dispatch<SetStateAction<string>>;
  setHeading: Dispatch<SetStateAction<string>>;
};

/** Owns source-markdown preview loading and its modal state transitions. */
export const useSourcePreviewController = ({
  activeRouteQuoteId,
  quoteId,
  itineraryQuoteId,
  setOpen,
  setLoading,
  setError,
  setMarkdown,
  setHeading,
}: SourcePreviewControllerOptions) => useCallback(async (dayNo: number) => {
  const currentQuoteId = String(activeRouteQuoteId || quoteId || itineraryQuoteId || "").trim();
  if (!currentQuoteId) {
    toast.error("Quote ID is not available for source preview.");
    return;
  }

  setOpen(true);
  setLoading(true);
  setError(null);
  setMarkdown("");
  setHeading("");

  try {
    const result = await ItineraryService.getHotspotScenarioMarkdown(currentQuoteId, dayNo);
    setMarkdown(String(result.markdown || ""));
    setHeading(String(result.heading || `${currentQuoteId} Day ${dayNo}`));
  } catch (error) {
    const message = error && typeof error === "object" && "message" in error
      ? String((error as { message?: unknown }).message || "Failed to load source preview.")
      : "Failed to load source preview.";
    setError(message);
  } finally {
    setLoading(false);
  }
}, [activeRouteQuoteId, itineraryQuoteId, quoteId, setError, setHeading, setLoading, setMarkdown, setOpen]);
