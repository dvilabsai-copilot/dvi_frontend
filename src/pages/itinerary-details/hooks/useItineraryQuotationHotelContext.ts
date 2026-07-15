import { useEffect, useRef } from "react";
import { useExternalStayEntries } from "./useExternalStayEntries";
import { useHotelSelectionCoverage } from "./useHotelSelectionCoverage";
import { useNonTboSelectedHotelEntries } from "./useNonTboSelectedHotelEntries";
import { useTboHotelSelectionSummary } from "./useTboHotelSelectionSummary";
import type { ItineraryHotelDetailsResponse } from "../itinerary-details.types";
import { useHotelSelectionState } from "./useHotelSelectionState";
import { useItineraryRouteState } from "./useItineraryRouteState";
import { useQuotationState } from "./useQuotationState";

type HotelSelectionState = ReturnType<typeof useHotelSelectionState>;
type RouteState = ReturnType<typeof useItineraryRouteState>;
type QuotationState = ReturnType<typeof useQuotationState>;
type SelectedHotelBookings = HotelSelectionState["selectedHotelBookings"];

export function useItineraryQuotationHotelContext({
  selectedHotelBookings,
  hotelDetails,
  activeHotelGroupType,
  prebookData,
  requiresHotelBookingFlow,
  shouldShowHotels,
  itineraryPlanId,
  setHotelDetails,
  setSelectedHotelBookings,
  setActiveHotelGroupType,
  setPrebookData,
  setHasAcceptedUpdatedPrice,
  setConfirmOccupanciesTemplate,
}: {
  selectedHotelBookings: SelectedHotelBookings;
  hotelDetails: ItineraryHotelDetailsResponse | null;
  activeHotelGroupType: number | null;
  prebookData: QuotationState["prebookData"];
  requiresHotelBookingFlow: boolean;
  shouldShowHotels: boolean;
  itineraryPlanId: number | null | undefined;
  setHotelDetails: RouteState["setHotelDetails"];
  setSelectedHotelBookings: HotelSelectionState["setSelectedHotelBookings"];
  setActiveHotelGroupType: HotelSelectionState["setActiveHotelGroupType"];
  setPrebookData: QuotationState["setPrebookData"];
  setHasAcceptedUpdatedPrice: QuotationState["setHasAcceptedUpdatedPrice"];
  setConfirmOccupanciesTemplate: QuotationState["setConfirmOccupanciesTemplate"];
}) {
  const quotationSummary = useTboHotelSelectionSummary({ selectedHotelBookings, prebookData, requiresHotelBookingFlow });
  const { getCoveredRouteIdsFromHotelSelections, selectedHotelCoveredRouteIds } = useHotelSelectionCoverage({ selectedHotelBookings });
  const nonTboSelectedHotelEntries = useNonTboSelectedHotelEntries({ selectedHotelBookings, selectedHotelCoveredRouteIds, hotelDetails });
  const externalStayEntries = useExternalStayEntries({ hotelDetails, activeHotelGroupType });
  const prebookDataRef = useRef<typeof prebookData>(null);

  useEffect(() => {
    prebookDataRef.current = prebookData;
  }, [prebookData]);

  useEffect(() => {
    if (shouldShowHotels) return;
    setHotelDetails(null);
    setSelectedHotelBookings({});
    setActiveHotelGroupType(null);
    setPrebookData(null);
    prebookDataRef.current = null;
    setHasAcceptedUpdatedPrice(false);
    setConfirmOccupanciesTemplate(null);
  }, [shouldShowHotels, itineraryPlanId, setActiveHotelGroupType, setConfirmOccupanciesTemplate, setHasAcceptedUpdatedPrice, setHotelDetails, setPrebookData, setSelectedHotelBookings]);

  return {
    ...quotationSummary,
    getCoveredRouteIdsFromHotelSelections,
    selectedHotelCoveredRouteIds,
    nonTboSelectedHotelEntries,
    externalStayEntries,
    prebookDataRef,
  };
}
