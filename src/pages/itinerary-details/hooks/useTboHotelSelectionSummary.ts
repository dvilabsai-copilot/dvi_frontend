import { useMemo } from "react";
import { isSupplierBookableHotel } from "../utils/domain.utils";
import { normalizeHotelProvider } from "../utils/hotelBookingNormalization.utils";

type HotelBooking = { netAmount?: number | string; [key: string]: unknown };

type UseTboHotelSelectionSummaryOptions = {
  selectedHotelBookings: Record<number, HotelBooking>;
  prebookData: { updatedTotalPrice?: number | string; finalPrice?: number | string; totalAmount?: number | string; hotels?: unknown[] } | null;
  requiresHotelBookingFlow: boolean;
};

/** Derives TBO booking totals and confirmation-flow requirements for quotation review. */
export const useTboHotelSelectionSummary = ({
  selectedHotelBookings,
  prebookData,
  requiresHotelBookingFlow,
}: UseTboHotelSelectionSummaryOptions) => {
  const prebookTotalAmount = Number(prebookData?.updatedTotalPrice || prebookData?.finalPrice || prebookData?.totalAmount || 0);
  const selectedTboHotelTotal = useMemo(
    () => Object.values(selectedHotelBookings)
      .filter((item) => normalizeHotelProvider(item) === "tbo")
      .reduce((sum, item) => sum + Number(item.netAmount || 0), 0),
    [selectedHotelBookings],
  );
  const hasSelectedTboHotels = useMemo(
    () => Object.values(selectedHotelBookings).some(
      (item) => isSupplierBookableHotel(item) && normalizeHotelProvider(item) === "tbo",
    ),
    [selectedHotelBookings],
  );

  const requiresDetailedPassengerFlow = requiresHotelBookingFlow && hasSelectedTboHotels;
  const hasPrebookPriceChanged = prebookTotalAmount > 0
    && Math.abs(prebookTotalAmount - selectedTboHotelTotal) > 0.01;
  // Manual package holding does not prebook TBO/VSR rows. Keep the selected
  // supplier rows visible in the review table until a real prebook response
  // exists, so the UI represents every manual hold request consistently.
  const prebookHotelEntries = Array.isArray(prebookData?.hotels)
    ? prebookData.hotels
    : Object.values(selectedHotelBookings).filter(
        (item) => normalizeHotelProvider(item) === "tbo" && isSupplierBookableHotel(item),
      );

  return {
    prebookTotalAmount,
    selectedTboHotelTotal,
    hasSelectedTboHotels,
    requiresDetailedPassengerFlow,
    hasPrebookPriceChanged,
    prebookHotelEntries,
  };
};
