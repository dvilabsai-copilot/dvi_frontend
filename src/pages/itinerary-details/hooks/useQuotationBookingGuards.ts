import { useCallback, type MutableRefObject } from "react";
import { toast } from "sonner";

interface BookingRow {
  provider: string;
  routeId?: unknown;
  searchInitiatedAt?: unknown;
  netAmount?: unknown;
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
  prebookData: PrebookData | null;
  prebookDataRef: MutableRefObject<PrebookData | null>;
  hasAcceptedUpdatedPrice: boolean;
  setPrebookData: (data: PrebookData | null) => void;
  setHasAcceptedUpdatedPrice: (accepted: boolean) => void;
}

interface BookingGuardResult {
  clientIp?: string;
  effectivePrebookData: PrebookData | null;
}

/** Runs confirmation-time provider, session, prebook, price, and acknowledgement guards. */
export const useQuotationBookingGuards = ({
  requiresHotelBookingFlow,
  externalStayCount,
  tboSessionWindowMs,
  prebookData,
  prebookDataRef,
  hasAcceptedUpdatedPrice,
  setPrebookData,
  setHasAcceptedUpdatedPrice,
}: BookingGuardOptions) => useCallback(async (hotelBookings: BookingRow[]): Promise<BookingGuardResult | null> => {
  const tboCount = hotelBookings.filter((booking) => booking.provider === 'tbo').length;
  const nonTboRouteIds = hotelBookings
    .filter((booking) => booking.provider !== 'tbo')
    .map((booking) => Number(booking.routeId))
    .filter((id) => Number.isFinite(id));

  if (requiresHotelBookingFlow && tboCount > 0 && nonTboRouteIds.length > 0) {
    const uniqueNonTboRouteIds = Array.from(new Set(nonTboRouteIds));
    const shouldContinue = window.confirm(
      `Mixed providers detected. Non-VSR route ID(s): ${uniqueNonTboRouteIds.join(', ')}.\n\nPress OK to continue with mixed-provider booking, or Cancel to reselect hotels.`,
    );
    if (!shouldContinue) {
      toast.error(`Mixed providers detected. Non-VSR route ID(s): ${uniqueNonTboRouteIds.join(', ')}. Please reselect hotels before confirming.`);
      return null;
    }
    toast.warning('Proceeding with mixed-provider booking as confirmed.');
  }

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

  const effectivePrebookData = prebookDataRef.current || prebookData;
  const hasTboBookings = requiresHotelBookingFlow && hotelBookings.some((booking) => booking.provider === 'tbo');
  if (requiresHotelBookingFlow && hasTboBookings && !effectivePrebookData) {
    toast.error('VSR prebook data missing. Reopen Confirm Quotation to prebook before final booking.');
    return null;
  }

  const prebookTotal = Number(
    effectivePrebookData?.updatedTotalPrice ||
    effectivePrebookData?.finalPrice ||
    effectivePrebookData?.totalAmount ||
    0,
  );
  const currentTboTotal = hotelBookings
    .filter((booking) => booking.provider === 'tbo')
    .reduce((sum, booking) => sum + Number(booking.netAmount || 0), 0);
  if (
    requiresHotelBookingFlow &&
    prebookTotal > 0 &&
    Math.abs(prebookTotal - currentTboTotal) > 0.01 &&
    !hasAcceptedUpdatedPrice
  ) {
    toast.warning('Accept updated prebook price before final confirmation.');
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
  return { clientIp, effectivePrebookData };
}, [externalStayCount, hasAcceptedUpdatedPrice, prebookData, prebookDataRef, requiresHotelBookingFlow, setHasAcceptedUpdatedPrice, setPrebookData, tboSessionWindowMs]);
