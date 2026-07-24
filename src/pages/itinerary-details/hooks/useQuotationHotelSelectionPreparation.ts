import { useCallback } from "react";
import { toast } from "sonner";
import type { ItineraryDay } from "../itinerary-details.types";

type HotelRow = Record<string, unknown>;
type HotelSelection = Record<string, unknown>;

interface HotelDetailsShape {
  hotels?: HotelRow[];
  hotelTabs?: Array<{ groupType?: number }>;
}

interface QuotationHotelSelectionOptions {
  selectedHotelBookings: Record<number, HotelSelection>;
  hotelDetails: HotelDetailsShape | null;
  activeHotelGroupType: number | null;
  requiresHotelBookingFlow: boolean;
  itineraryDays: ItineraryDay[];
  defaultExternalStayMessage: string;
  normalizeHotelProvider: (hotel: HotelRow) => string;
  isSupplierBookableHotel: (hotel: HotelRow) => boolean;
  parseStaahSearchReference: (value: unknown) => { roomId?: string; rateId?: string } | null;
  getHotelSelectionAmount: (hotel: HotelRow) => number;
  getCoveredRouteIdsFromHotelSelections: (selections: Record<number, HotelSelection>) => Set<number>;
  setSelectedHotelBookings: (updater: (previous: Record<number, HotelSelection>) => Record<number, HotelSelection>) => void;
}

interface PreparedQuotationHotels {
  autoSelectedHotels: Record<number, HotelSelection>;
  groupTypeValue: number;
  preferredProviderForConfirm: string;
}

/** Prepares persisted/cheapest hotel backfills for quotation confirmation without overwriting session choices. */
export const useQuotationHotelSelectionPreparation = ({
  selectedHotelBookings,
  hotelDetails,
  activeHotelGroupType,
  requiresHotelBookingFlow,
  itineraryDays,
  defaultExternalStayMessage,
  normalizeHotelProvider,
  isSupplierBookableHotel,
  parseStaahSearchReference,
  getHotelSelectionAmount,
  getCoveredRouteIdsFromHotelSelections,
  setSelectedHotelBookings,
}: QuotationHotelSelectionOptions) => useCallback((): PreparedQuotationHotels | null => {
  const autoSelectedHotels: Record<number, HotelSelection> = { ...selectedHotelBookings };
  const groupTypeValue = activeHotelGroupType ?? (Number(Object.values(autoSelectedHotels)[0]?.groupType) || Number(hotelDetails?.hotelTabs?.[0]?.groupType) || 1);
  const providers = requiresHotelBookingFlow ? Array.from(new Set(Object.values(autoSelectedHotels).map((hotel) => String(hotel.provider || "").trim().toLowerCase()).filter(Boolean))) : [];
  const hasExplicitTboSelection = providers.includes("tbo");
  const preferredProviderForConfirm = providers.find((provider) => provider !== "tbo") || (hasExplicitTboSelection ? "tbo" : "");
  if (!requiresHotelBookingFlow || !hotelDetails?.hotels?.length) return { autoSelectedHotels, groupTypeValue, preferredProviderForConfirm };

  const toAutoSelection = (hotelRow: HotelRow, routeId: number): HotelSelection => {
    const routeDay = itineraryDays.find((day) => Number(day.id) === routeId);
    const checkInDate = routeDay?.date || "";
    const checkOutDate = routeDay ? new Date(new Date(routeDay.date).getTime() + 86400000).toISOString().split("T")[0] : "";
    const searchReference = hotelRow.searchReference || hotelRow.bookingCode;
    const supplierBookable = isSupplierBookableHotel(hotelRow);
    return {
      provider: normalizeHotelProvider(hotelRow) || "tbo",
      hotelCode: String(hotelRow.hotelCode || hotelRow.hotelId || ""),
      bookingCode: String(hotelRow.bookingCode || hotelRow.searchReference || ""),
      searchReference: String(searchReference || "").trim() || undefined,
      roomId: parseStaahSearchReference(searchReference)?.roomId || undefined,
      rateId: parseStaahSearchReference(searchReference)?.rateId || undefined,
      roomType: hotelRow.roomType || "Standard",
      netAmount: getHotelSelectionAmount(hotelRow),
      hotelName: hotelRow.hotelName,
      checkInDate,
      checkOutDate,
      searchInitiatedAt: new Date().toISOString(),
      isBookable: hotelRow.isBookable ?? supplierBookable,
      externalStay: hotelRow.externalStay ?? !supplierBookable,
      availabilityStatus: hotelRow.availabilityStatus || (supplierBookable ? "AVAILABLE" : "NO_SUPPLIER_AVAILABILITY"),
      availabilityMessage: hotelRow.availabilityMessage || (supplierBookable ? null : defaultExternalStayMessage),
      bookingMode: hotelRow.bookingMode,
      priceSource: hotelRow.priceSource,
      requiresHotelApproval: hotelRow.requiresHotelApproval,
      approvalStatus: hotelRow.approvalStatus,
      manualConfirmationStatus: hotelRow.manualConfirmationStatus,
      selectedRateOptionId: hotelRow.selectedRateOptionId || hotelRow.rateOptionId,
      selectedPricePerNight: hotelRow.selectedPricePerNight || hotelRow.pricePerNight,
      selectedTotalPrice: hotelRow.selectedTotalPrice || hotelRow.totalStayPrice,
      selectedCurrency: hotelRow.selectedCurrency || hotelRow.currency,
      selectedPriceSnapshot: hotelRow.selectedPriceSnapshot,
      pricePerNight: hotelRow.pricePerNight,
      totalStayPrice: hotelRow.totalStayPrice,
      currency: hotelRow.currency,
      nightlyRates: hotelRow.nightlyRates,
      nights: hotelRow.numberOfNights,
    };
  };

  const skippedRouteIds: number[] = [];
  const routesWithHotels = new Set(hotelDetails.hotels.map((hotel) => Number(hotel.itineraryRouteId || 0)).filter(Boolean));
  routesWithHotels.forEach((routeId) => {
    if (getCoveredRouteIdsFromHotelSelections(autoSelectedHotels).has(routeId)) return;
    const routeHotels = hotelDetails.hotels!.filter((hotel) => Number(hotel.itineraryRouteId) === routeId && Number(hotel.groupType) === Number(groupTypeValue));
    const persisted = routeHotels.find((hotel) => Number(hotel.itineraryPlanHotelDetailsId || 0) > 0);
    if (persisted) {
      autoSelectedHotels[routeId] = toAutoSelection(persisted, routeId);
      return;
    }
    if (!autoSelectedHotels[routeId]) {
      const first = preferredProviderForConfirm
        ? routeHotels.find((hotel) => String(hotel.provider || "").trim().toLowerCase() === preferredProviderForConfirm) ||
          (!hasExplicitTboSelection
            ? routeHotels.find((hotel) => String(hotel.provider || "").trim().toLowerCase() !== "tbo")
            : undefined)
        : routeHotels[0];
      if (!first && preferredProviderForConfirm && routeHotels.length > 0) skippedRouteIds.push(routeId);
      if (first) autoSelectedHotels[routeId] = toAutoSelection(first, routeId);
    }
  });
  if (skippedRouteIds.length > 0) {
    toast.error(`Please select ${preferredProviderForConfirm.toUpperCase()} hotel(s) for route ID(s): ${skippedRouteIds.join(", ")}.`);
    return null;
  }
  const newlyBackfilled = Object.fromEntries(Object.entries(autoSelectedHotels).filter(([routeId]) => !selectedHotelBookings[Number(routeId)])) as Record<number, HotelSelection>;
  if (Object.keys(newlyBackfilled).length > 0) setSelectedHotelBookings((previous) => ({ ...previous, ...newlyBackfilled }));
  return { autoSelectedHotels, groupTypeValue, preferredProviderForConfirm };
}, [activeHotelGroupType, defaultExternalStayMessage, getCoveredRouteIdsFromHotelSelections, getHotelSelectionAmount, hotelDetails, isSupplierBookableHotel, itineraryDays, normalizeHotelProvider, parseStaahSearchReference, requiresHotelBookingFlow, selectedHotelBookings, setSelectedHotelBookings]);
