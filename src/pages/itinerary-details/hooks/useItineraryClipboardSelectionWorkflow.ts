import { useCallback, useEffect } from "react";
import type { ItineraryHotelDetailsResponse } from "../itinerary-details.types";

/** Owns clipboard hotel-rate visibility and default recommendation selection. */
export function useItineraryClipboardSelectionWorkflow({
  hotelDetails,
  activeHotelGroupType,
  setActiveHotelGroupType,
  setClipboardRatesVisible,
  clipboardModal,
  paraRecommendations,
  selectedHotels,
  setSelectedHotels,
}: {
  hotelDetails: ItineraryHotelDetailsResponse | null;
  activeHotelGroupType: number | null;
  setActiveHotelGroupType: (value: number) => void;
  setClipboardRatesVisible: (value: boolean) => void;
  clipboardModal: boolean;
  paraRecommendations: unknown[];
  selectedHotels: Record<string, boolean>;
  setSelectedHotels: (value: Record<string, boolean>) => void;
}) {
  const buildDefaultClipboardSelection = useCallback(() => {
    const next: Record<string, boolean> = {};
    paraRecommendations.forEach((_item, index) => {
      next[`para-${index}`] = true;
    });
    return next;
  }, [paraRecommendations]);

  useEffect(() => {
    setClipboardRatesVisible(Boolean(hotelDetails?.hotelRatesVisible));
  }, [hotelDetails, setClipboardRatesVisible]);

  useEffect(() => {
    if (!hotelDetails?.hotelTabs?.length || activeHotelGroupType != null) return;
    setActiveHotelGroupType(hotelDetails.hotelTabs[0].groupType);
  }, [activeHotelGroupType, hotelDetails, setActiveHotelGroupType]);

  useEffect(() => {
    if (!clipboardModal || !paraRecommendations.length) return;
    const hasAnySelected = Object.values(selectedHotels).some(Boolean);
    if (!hasAnySelected) setSelectedHotels(buildDefaultClipboardSelection());
  }, [buildDefaultClipboardSelection, clipboardModal, paraRecommendations, selectedHotels, setSelectedHotels]);

  return { buildDefaultClipboardSelection };
}
