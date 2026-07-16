import { useCallback } from "react";
import { ItineraryService, type ItineraryClipboardMode } from "@/services/itinerary";
import { toast } from "sonner";

interface HotelClipboardActionOptions {
  selectedHotels: Record<string, boolean>;
  clipboardType: ItineraryClipboardMode;
  hotelDetails: unknown;
  itinerary: { quoteId?: string } | null;
  getSelectedClipboardGroups: (clipboardType: ItineraryClipboardMode) => Array<{ groupType: number }>;
  buildClipboardHtml: (clipboardType: ItineraryClipboardMode) => { html?: string; packageSectionsHtml?: string };
  mergeClipboardWithB2BRecommendedPackages: (html: string, localHtml: string) => string;
  replaceHighlightsHotspotDetailsHtml: (html: string, detailsHtml: string) => string;
  buildHighlightsHotspotDetailsHtml: () => string;
  copyHtmlToClipboard: (html: string, plainText: string) => Promise<void>;
  htmlToPlainText: (html: string) => string;
  setClipboardModal: (open: boolean) => void;
  setSelectedHotels: (selected: Record<string, boolean>) => void;
}

/** Owns formatted hotel clipboard retrieval, merge, and copy behavior. */
export const useHotelClipboardAction = ({
  selectedHotels,
  clipboardType,
  hotelDetails,
  itinerary,
  getSelectedClipboardGroups,
  buildClipboardHtml,
  mergeClipboardWithB2BRecommendedPackages,
  replaceHighlightsHotspotDetailsHtml,
  buildHighlightsHotspotDetailsHtml,
  copyHtmlToClipboard,
  htmlToPlainText,
  setClipboardModal,
  setSelectedHotels,
}: HotelClipboardActionOptions) => {
  return useCallback(async () => {
    const selectedCount = Object.values(selectedHotels).filter(Boolean).length;
    if (selectedCount === 0) {
      toast.error(clipboardType === "para" ? "Please select at least one recommendation" : "Please select at least one hotel");
      return;
    }
    if (!hotelDetails || !itinerary) return;

    try {
      const selectedGroups = getSelectedClipboardGroups(clipboardType);
      const groupTypes = selectedGroups.map((group) => group.groupType);
      const { html, plainText } = await ItineraryService.getClipboardContent(itinerary.quoteId, clipboardType, groupTypes);
      if (!html || !plainText) {
        toast.error("Failed to prepare clipboard content");
        return;
      }

      const localClipboard = buildClipboardHtml(clipboardType);
      let mergedHtml = mergeClipboardWithB2BRecommendedPackages(html, localClipboard.packageSectionsHtml || localClipboard.html || "");
      if (clipboardType === "highlights") {
        mergedHtml = replaceHighlightsHotspotDetailsHtml(mergedHtml, buildHighlightsHotspotDetailsHtml());
      }
      await copyHtmlToClipboard(mergedHtml, htmlToPlainText(mergedHtml));
      toast.success("Formatted clipboard content copied!");
      setClipboardModal(false);
      setSelectedHotels({});
    } catch (error) {
      console.error("Failed to fetch clipboard content", error);
      toast.error("Failed to prepare clipboard content");
    }
  }, [buildClipboardHtml, buildHighlightsHotspotDetailsHtml, clipboardType, copyHtmlToClipboard, getSelectedClipboardGroups, htmlToPlainText, hotelDetails, itinerary, mergeClipboardWithB2BRecommendedPackages, replaceHighlightsHotspotDetailsHtml, selectedHotels, setClipboardModal, setSelectedHotels]);
};
