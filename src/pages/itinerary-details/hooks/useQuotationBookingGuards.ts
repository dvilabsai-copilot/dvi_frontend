import { useCallback } from "react";
import { toast } from "sonner";

interface BookingRow {
  provider: string;
  routeId?: unknown;
  searchInitiatedAt?: unknown;
  netAmount?: unknown;
  bookingMode?: unknown;
  requiresHotelApproval?: unknown;
  approvalStatus?: unknown;
  manualConfirmationStatus?: unknown;
}

interface PrebookData {
  updatedTotalPrice?: unknown;
  finalPrice?: unknown;
  totalAmount?: unknown;
  [key: string]: unknown;
}

interface BookingGuardOptions {
  requiresHotelBookingFlow: boolean;
  externalStayCount: number;
  tboSessionWindowMs: number;
  hasAcceptedUpdatedPrice: boolean;
  setPrebookData: (data: PrebookData | null) => void;
  setHasAcceptedUpdatedPrice: (accepted: boolean) => void;
}

interface BookingGuardResult {
  clientIp?: string;
}

/** Checks the selection and acknowledgement before server-side booking validation. */
export const useQuotationBookingGuards = ({
  requiresHotelBookingFlow,
  externalStayCount,
  tboSessionWindowMs,
  hasAcceptedUpdatedPrice,
  setPrebookData,
  setHasAcceptedUpdatedPrice,
}: BookingGuardOptions) => useCallback(async (hotelBookings: BookingRow[]): Promise<BookingGuardResult | null> => {
  if (requiresHotelBookingFlow && hotelBookings.length === 0 && externalStayCount === 0) {
    toast.error('No supplier-bookable hotels selected. Please select available hotels and retry.');
    return null;
  }

  const staleHotel = requiresHotelBookingFlow
    ? hotelBookings.find((booking) => {
        if (!booking.searchInitiatedAt) return false;
        const parsed = new Date(String(booking.searchInitiatedAt));
        if (Number.isNaN(parsed.getTime())) return true;
        return Date.now() - parsed.getTime() > tboSessionWindowMs;
      })
    : null;
  if (staleHotel) {
    setPrebookData(null);
    setHasAcceptedUpdatedPrice(false);
    toast.error('Hotel search session exceeded 35 minutes. Please search/select hotel again before prebook.');
    return null;
  }

  if (requiresHotelBookingFlow && !hasAcceptedUpdatedPrice) {
    toast.warning('Please review and acknowledge the hotel details before final booking confirmation.');
    return null;
  }

  const clientIp = requiresHotelBookingFlow
    ? await fetch('https://api.ipify.org?format=json')
        .then((response) => response.json())
        .then((data) => data.ip)
        .catch(() => '192.168.1.1')
    : undefined;
  return { clientIp };
}, [externalStayCount, hasAcceptedUpdatedPrice, requiresHotelBookingFlow, setHasAcceptedUpdatedPrice, setPrebookData, tboSessionWindowMs]);
