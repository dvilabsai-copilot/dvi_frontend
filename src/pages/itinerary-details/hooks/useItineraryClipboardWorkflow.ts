import { useCallback } from "react";
import type { ItineraryClipboardMode } from "@/services/itinerary";
import type { ItineraryDetailsResponse, ItineraryHotelDetailsResponse } from "../itinerary-details.types";
import { useClipboardContentBuilder } from "./useClipboardContentBuilder";
import { useHotelClipboardAction } from "./useHotelClipboardAction";
import { useItineraryClipboardSelectionWorkflow } from "./useItineraryClipboardSelectionWorkflow";
import { useVehicleOnlyClipboardAction } from "./useVehicleOnlyClipboardAction";
import { buildHighlightsHotspotDetailsHtml, replaceHighlightsHotspotDetailsHtml } from "../utils/highlightsHotspotHtml.utils";
import { copyHtmlToClipboard } from "../utils/copyHtmlToClipboard.utils";
import { htmlToPlainText } from "../utils/htmlToPlainText.utils";
import { mergeClipboardWithB2BRecommendedPackages } from "../utils/clipboardHtmlMerge.utils";

type ClipboardWorkflowOptions = {
  quoteId?: string;
  itineraryPreference: number;
  itinerary: ItineraryDetailsResponse | null;
  hotelDetails: ItineraryHotelDetailsResponse | null;
  activeHotelGroupType: number | null;
  setActiveHotelGroupType: (value: number) => void;
  setClipboardRatesVisible: (value: boolean) => void;
  clipboardModal: boolean;
  clipboardType: ItineraryClipboardMode;
  paraRecommendations: Array<{ label: string; groupType: number; hotels: ItineraryHotelDetailsResponse["hotels"] }>;
  selectedHotels: Record<string, boolean>;
  setSelectedHotels: (value: Record<string, boolean>) => void;
  setClipboardModal: (open: boolean) => void;
  shouldShowHotels: boolean;
  shouldShowVehicles: boolean;
  computedVehicleAmount: number;
  computedVehicleQty: number;
};

/** Owns selection, rendering, and copy actions for itinerary clipboard variants. */
export function useItineraryClipboardWorkflow({
  quoteId,
  itineraryPreference,
  itinerary,
  hotelDetails,
  activeHotelGroupType,
  setActiveHotelGroupType,
  setClipboardRatesVisible,
  clipboardModal,
  clipboardType,
  paraRecommendations,
  selectedHotels,
  setSelectedHotels,
  setClipboardModal,
  shouldShowHotels,
  shouldShowVehicles,
  computedVehicleAmount,
  computedVehicleQty,
}: ClipboardWorkflowOptions) {
  const { buildDefaultClipboardSelection } = useItineraryClipboardSelectionWorkflow({
    hotelDetails,
    activeHotelGroupType,
    setActiveHotelGroupType,
    setClipboardRatesVisible,
    clipboardModal,
    paraRecommendations,
    selectedHotels,
    setSelectedHotels,
  });

  const { getSelectedClipboardGroups, buildClipboardHtml } = useClipboardContentBuilder({
    hotelDetails,
    itinerary,
    paraRecommendations,
    selectedHotels,
    shouldShowHotels,
    shouldShowVehicles,
    computedVehicleAmount,
    computedVehicleQty,
  });

  const buildHighlightsHotspotDetailsHtmlForClipboard = useCallback(
    () => buildHighlightsHotspotDetailsHtml(itinerary?.days),
    [itinerary?.days],
  );

  const handleVehicleOnlyClipboardCopyRefactored = useVehicleOnlyClipboardAction({
    quoteId: quoteId || null,
    itineraryPreference,
    replaceHighlightsHotspotDetailsHtml,
    buildHighlightsHotspotDetailsHtml: buildHighlightsHotspotDetailsHtmlForClipboard,
    htmlToPlainText,
    copyHtmlToClipboard,
  });

  const handleCopyClipboard = useHotelClipboardAction({
    selectedHotels,
    clipboardType,
    hotelDetails,
    itinerary,
    getSelectedClipboardGroups,
    buildClipboardHtml,
    mergeClipboardWithB2BRecommendedPackages,
    replaceHighlightsHotspotDetailsHtml,
    buildHighlightsHotspotDetailsHtml: buildHighlightsHotspotDetailsHtmlForClipboard,
    copyHtmlToClipboard,
    htmlToPlainText,
    setClipboardModal,
    setSelectedHotels,
  });

  return {
    buildDefaultClipboardSelection,
    handleVehicleOnlyClipboardCopyRefactored,
    handleCopyClipboard,
  };
}
