import { useCallback } from "react";
import { ItineraryService, type ItineraryClipboardMode } from "@/services/itinerary";
import { toast } from "sonner";
import { addHotspotDetailsParagraphSpacing } from "../utils/highlightsHotspotHtml.utils";
import type { ItineraryDetailsResponse } from "../itinerary-details.types";
import type { ClipboardGroupCostBreakdowns } from "./useClipboardContentBuilder";

const removeHotspotDetailsSection = (html: string): string => {
  if (!html) return html;

  const hotspotHeadingMatch = html.match(/Hotspot Details/i);
  if (!hotspotHeadingMatch || hotspotHeadingMatch.index === undefined) {
    return html;
  }

  const hotspotStart = html.lastIndexOf(
    '<table',
    hotspotHeadingMatch.index,
  );

  if (hotspotStart === -1) return html;

  const afterHotspotHeading = html.slice(
    hotspotHeadingMatch.index + hotspotHeadingMatch[0].length,
  );

  const nextSectionMatchers = [
    /Terms\s*&?\s*Condition/i,
    /Package Includes/i,
    /Package Excludes/i,
    /Inclusion/i,
    /Exclusion/i,
    /Important Instructions/i,
    /Instructions/i,
    /Cancellation/i,
    /Payment Policy/i,
  ];

  const nextSectionIndex = nextSectionMatchers
    .map((regex) => {
      const match = afterHotspotHeading.match(regex);

      return match?.index !== undefined
        ? hotspotHeadingMatch.index! +
            hotspotHeadingMatch[0].length +
            match.index
        : -1;
    })
    .filter((index) => index > hotspotHeadingMatch.index!)
    .sort((a, b) => a - b)[0];

  if (!nextSectionIndex) {
    return html.slice(0, hotspotStart);
  }

  const nextSectionTableStart = html.lastIndexOf(
    '<table',
    nextSectionIndex,
  );

  const hotspotEnd =
    nextSectionTableStart > hotspotStart
      ? nextSectionTableStart
      : nextSectionIndex;

  return `${html.slice(0, hotspotStart)}${html.slice(hotspotEnd)}`;
};

interface HotelClipboardActionOptions {
  selectedHotels: Record<string, boolean>;
  clipboardType: ItineraryClipboardMode;
  hotelDetails: unknown;
  itinerary: ItineraryDetailsResponse | null;
  getSelectedClipboardGroups: (clipboardType: ItineraryClipboardMode) => Array<{ groupType: number }>;
  buildClipboardHtml: (clipboardType: ItineraryClipboardMode, groupCostBreakdowns?: ClipboardGroupCostBreakdowns) => { html?: string; packageSectionsHtml?: string };
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
    const selectedGroups = getSelectedClipboardGroups(clipboardType);
    if (selectedGroups.length === 0) {
      toast.error(clipboardType === "para" ? "Please select at least one recommendation" : "Please select at least one hotel");
      return;
    }
    if (!hotelDetails || !itinerary) return;

    try {
      const groupTypes = selectedGroups.map((group) => group.groupType);
      const { html, plainText } = await ItineraryService.getClipboardContent(itinerary.quoteId, clipboardType, groupTypes);
      if (!html || !plainText) {
        toast.error("Failed to prepare clipboard content");
        return;
      }

     const groupCostBreakdowns: ClipboardGroupCostBreakdowns = {};
     const groupDetails = await Promise.all(
       groupTypes.map(async (groupType) => {
         try {
           return [groupType, await ItineraryService.getDetails(itinerary.quoteId || "", groupType)] as const;
         } catch (error) {
           console.warn(`Failed to load group ${groupType} cost breakdown; using active itinerary totals`, error);
           return null;
         }
       }),
     );
     groupDetails.forEach((entry) => {
       if (!entry) return;
       const [groupType, details] = entry;
       const costBreakdown = (details as ItineraryDetailsResponse | undefined)?.costBreakdown;
       if (groupType && costBreakdown) {
         groupCostBreakdowns[groupType] = costBreakdown;
       }
     });

     const localClipboard = buildClipboardHtml(clipboardType, groupCostBreakdowns);

let mergedHtml = mergeClipboardWithB2BRecommendedPackages(
  html,
  localClipboard.packageSectionsHtml || localClipboard.html || "",
);

if (clipboardType === "highlights") {
  mergedHtml = replaceHighlightsHotspotDetailsHtml(
    mergedHtml,
    buildHighlightsHotspotDetailsHtml(),
  );
}

if (Number(itinerary.itineraryPreference || 0) === 1) {
  mergedHtml = removeHotspotDetailsSection(mergedHtml);
} else {
  mergedHtml = addHotspotDetailsParagraphSpacing(mergedHtml);
}

await copyHtmlToClipboard(
  mergedHtml,
  htmlToPlainText(mergedHtml),
);
      toast.success("Formatted clipboard content copied!");
      setClipboardModal(false);
      setSelectedHotels({});
    } catch (error) {
      console.error("Failed to fetch clipboard content", error);
      toast.error("Failed to prepare clipboard content");
    }
  }, [buildClipboardHtml, buildHighlightsHotspotDetailsHtml, clipboardType, copyHtmlToClipboard, getSelectedClipboardGroups, htmlToPlainText, hotelDetails, itinerary, mergeClipboardWithB2BRecommendedPackages, replaceHighlightsHotspotDetailsHtml, selectedHotels, setClipboardModal, setSelectedHotels]);
};
