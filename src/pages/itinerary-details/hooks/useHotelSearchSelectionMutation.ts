import { useCallback, type Dispatch, type MutableRefObject, type SetStateAction } from "react";
import { ItineraryService } from "@/services/itinerary";
import { toast } from "sonner";
import type { ItineraryDetailsResponse, ItineraryHotelDetailsResponse } from "../itinerary-details.types";
import { normalizeHotelStayDates } from "../utils/hotelStayDates.utils";
import { isSupplierSelectionCandidate } from "../utils/domain.utils";
import { inferHotelProvider } from "../utils/hotelBookingNormalization.utils";
import { getHotelRefundableRateValue } from "../utils/hotelHoldEligibility.utils";
interface HotelSelectionModalState {
  open?: boolean;
  planId: number | null;
  routeId: number | null;
  routeDate?: string;
  checkInDate?: string;
  checkOutDate?: string;
  groupType?: number;
}

interface HotelSelectionContextOverride extends HotelSelectionModalState {
  planId: number;
  routeId: number;
}

interface MealPlanSelection {
  all: boolean;
  breakfast: boolean;
  lunch: boolean;
  dinner: boolean;
}

interface HotelSearchResultLike {
  canonicalHotelId?: number;
  hotelId?: number;
  hotelCode?: string | number;
  bookingCode?: string;
  searchReference?: string;
  provider?: string;
  providerHotelCode?: string;
  rateOptionId?: string;
  roomId?: string | number;
  rateId?: string | number;
  roomTypeId?: number;
  roomSelections?: Array<{
    roomIndex: number;
    roomId?: string | number;
    rateId?: string | number;
    roomType?: string;
    mealPlan?: string;
    pricePerNight?: number;
    totalStayPrice?: number;
    numberOfNights?: number;
  }>;
  numberOfNights?: number;
  mealPlan?: string;
  requiresHotelApproval?: boolean;
  isRefundable?: boolean | number | string;
  IsRefundable?: boolean | number | string;
  rateOption?: Record<string, unknown>;
  selectedRateOption?: Record<string, unknown>;
  currentRateOption?: Record<string, unknown>;
  selectedPriceSnapshot?: unknown;
  priceSource?: string;
  roomTypes?: Array<{ roomCode?: string | number; roomName?: string }>;
  netAmount?: number;
  totalCost?: number;
  totalRoomCost?: number;
  price?: number;
  hotelName?: string;
}

interface SelectedHotelBooking {
  [key: string]: unknown;
}

interface HotelSearchSelectionOptions {
  readOnly: boolean;
  quoteId: string | null;
  shouldShowHotels: boolean;
  selectedMealPlan?: unknown;
  hotelSelectionModal: HotelSelectionModalState;
  prebookDataRef: MutableRefObject<unknown | null>;
  parseStaahSearchReference: (reference: unknown) => { roomId?: string; rateId?: string };
  isSupplierBookableHotel: (hotel: unknown) => boolean;
  getSafeErrorMessage: (error: unknown, fallback: string) => string;
  setIsSelectingHotel: Dispatch<SetStateAction<boolean>>;
  setSelectedHotelBookings: Dispatch<SetStateAction<Record<number, SelectedHotelBooking>>>;
  setPrebookData: Dispatch<SetStateAction<unknown>>;
  setHasAcceptedUpdatedPrice: Dispatch<SetStateAction<boolean>>;
  setHotelSelectionModal: Dispatch<SetStateAction<HotelSelectionModalState>>;
  setHotelSearchQuery: Dispatch<SetStateAction<string>>;
  setSelectedMealPlan: Dispatch<SetStateAction<MealPlanSelection>>;
  setItinerary: Dispatch<SetStateAction<ItineraryDetailsResponse | null>>;
  setHotelDetails: Dispatch<SetStateAction<ItineraryHotelDetailsResponse | null>>;
}

/** Owns live supplier-search hotel selection and its booking payload normalization. */
export const useHotelSearchSelectionMutation = ({
  readOnly,
  quoteId,
  shouldShowHotels,
  hotelSelectionModal,
  prebookDataRef,
  parseStaahSearchReference,
  isSupplierBookableHotel,
  getSafeErrorMessage,
  setIsSelectingHotel,
  setSelectedHotelBookings,
  setPrebookData,
  setHasAcceptedUpdatedPrice,
  setHotelSelectionModal,
  setHotelSearchQuery,
  setSelectedMealPlan,
  setItinerary,
  setHotelDetails,
}: HotelSearchSelectionOptions) => {
  return useCallback(async (
    hotel: HotelSearchResultLike,
    mealPlan?: unknown,
    contextOverride?: HotelSelectionContextOverride,
  ) => {
    if (readOnly) {
      console.log("Cannot select hotel in read-only mode");
      return false;
    }
    const selectionContext = contextOverride || hotelSelectionModal;
    if (!selectionContext.planId || !selectionContext.routeId) return false;

    setIsSelectingHotel(true);
    try {
      const hotelId =
        Number(hotel.canonicalHotelId ?? hotel.hotelId ?? Number.parseInt(String(hotel.hotelCode || ""), 10)) || 0;
      const inferredProvider = inferHotelProvider(hotel);
      const isOffline = inferredProvider === 'offline' || hotel.requiresHotelApproval === true;
      const stayDates = normalizeHotelStayDates({
        checkInDate: selectionContext.checkInDate,
        checkOutDate: selectionContext.checkOutDate,
        fallbackDate: selectionContext.routeDate,
      });
      const searchReference = hotel.searchReference || hotel.bookingCode;
      const roomSelections = hotel.roomSelections || [];
      const firstRoomSelection = roomSelections[0] || null;
      const selectedRoomType = String(
        hotel.roomType || hotel.roomTypeName || firstRoomSelection?.roomType ||
        firstRoomSelection?.roomTypeName || hotel.roomTypes?.[0]?.roomName || "Standard",
      );
      const refundableRate = getHotelRefundableRateValue(hotel as unknown as Record<string, unknown>);
      const selectedHotelPayload = {
        provider: inferredProvider,
        hotelCode: String(hotel.hotelCode || ""),
        bookingCode: String(hotel.bookingCode || hotel.searchReference || ""),
        searchReference: String(hotel.searchReference || hotel.bookingCode || "").trim() || undefined,
        roomId: String(hotel.roomId || firstRoomSelection?.roomId || parseStaahSearchReference(searchReference)?.roomId || String(hotel.roomTypes?.[0]?.roomCode || "").trim() || "").trim() || undefined,
        rateId: String(firstRoomSelection?.rateId || parseStaahSearchReference(searchReference)?.rateId || "").trim() || undefined,
        roomType: selectedRoomType,
        mealPlan: String(firstRoomSelection?.mealPlan || hotel.mealPlan || '').trim() || undefined,
        roomSelections,
        isRefundable: refundableRate,
        IsRefundable: refundableRate,
        rateOption: hotel.rateOption,
        selectedRateOption: hotel.selectedRateOption,
        currentRateOption: hotel.currentRateOption,
        selectedPriceSnapshot: hotel.selectedPriceSnapshot,
        // The API resolves the authoritative rate and complete payable total.
        // Do not calculate a booking amount from supplier search fields here.
        netAmount: undefined,
        hotelName: hotel.hotelName,
        checkInDate: stayDates.checkInDate,
        checkOutDate: stayDates.checkOutDate,
        searchInitiatedAt: new Date().toISOString(),
      };

if (!isOffline && !isSupplierSelectionCandidate(selectedHotelPayload)) {
  toast.error(
    "This hotel does not have a valid live supplier identity. Please search again and select an available room.",
  );
  return;
}

      const provider = inferredProvider;
      const rateIdentity = String(hotel.rateOptionId || hotel.searchReference || hotel.bookingCode || "").trim();
      const localHotelCode = String(hotel.hotelCode || "").trim();
      const providerHotelCode = isOffline
        ? (localHotelCode || String(hotel.providerHotelCode || "").trim())
        : String(hotel.providerHotelCode || localHotelCode || hotel.hotelId || "").trim();
      const selectionKey = String((hotel as any).selectionKey || rateIdentity || "").trim();
      const intent = rateIdentity ? "RATE_OPTION" : "HOTEL";
      const intentResult: any = await ItineraryService.selectHotelIntent({
        planId: Number(selectionContext.planId),
        routeId: Number(selectionContext.routeId),
        groupType: Number(selectionContext.groupType || 1),
        selectionIntent: intent,
        provider,
        hotelCode: isOffline ? localHotelCode || providerHotelCode : providerHotelCode,
        providerHotelCode: providerHotelCode || undefined,
        canonicalHotelId: hotel.canonicalHotelId ?? hotel.hotelId,
        hotelId,
        hotelName: hotel.hotelName,
        roomType: selectedRoomType,
        mealPlanCode: String(firstRoomSelection?.mealPlan || hotel.mealPlan || "").trim() || undefined,
        isRefundable: refundableRate,
        IsRefundable: refundableRate,
        roomTypeId: hotel.roomTypeId || firstRoomSelection?.roomTypeId,
        rateOptionId: rateIdentity || undefined,
        optionKey: rateIdentity || undefined,
        selectionKey: selectionKey || undefined,
        bookingCode: String(hotel.bookingCode || hotel.searchReference || "").trim() || undefined,
        searchReference: String(hotel.searchReference || hotel.bookingCode || "").trim() || undefined,
        roomId: hotel.roomId || firstRoomSelection?.roomId,
        routeDate: stayDates.checkInDate,
      });
      const serverSelections = Array.isArray(intentResult?.selections) ? intentResult.selections : [];
      const serverSelection = serverSelections.find((selection: any) =>
        Number(selection?.routeId || selection?.itineraryRouteId) === Number(selectionContext.routeId),
      ) || serverSelections[0];
      if (intentResult?.status !== "AVAILABLE" || !serverSelection) {
        throw new Error("The API did not return an authoritative hotel price and selection");
      }
const serverTotal = Number(
  serverSelection.totalPrice ??
    serverSelection.totalAmount ??
    serverSelection.totalAmountAfterTax ??
    serverSelection.selectedTotalPrice ??
    0,
);

const serverNightly = Number(
  serverSelection.pricePerNight ??
    serverSelection.selectedPricePerNight ??
    serverTotal ??
    0,
);

/*
 * TBO's authoritative response can expose the fresh booking identity as
 * supplierBookingCode. Normalize it back to bookingCode because the final
 * quotation supplier validation intentionally requires the fresh !TB! code.
 */
const authoritativeBookingCode = String(
  serverSelection.bookingCode ||
    serverSelection.supplierBookingCode ||
    selectedHotelPayload.bookingCode ||
    serverSelection.searchReference ||
    selectedHotelPayload.searchReference ||
    "",
).trim();

const authoritativeSelection = {
  ...selectedHotelPayload,
  ...serverSelection,

  bookingCode: authoritativeBookingCode,

  netAmount: serverTotal,
  totalPrice: serverTotal,
  totalAmount: serverTotal,
  pricePerNight: serverNightly,

  // The user-selected rate is the source of truth for holdability at this
  // boundary. Some supplier responses echo the previous persisted snapshot
  // (for example, after switching away and back to the same hotel) and can
  // otherwise overwrite the newly selected refundable flag with false.
  ...(refundableRate !== undefined
    ? { isRefundable: refundableRate, IsRefundable: refundableRate }
    : {}),

  isBookable: true,
  externalStay: false,

  availabilityStatus: isOffline
    ? "OFFLINE_APPROVAL_REQUIRED"
    : "AVAILABLE",

  availabilityMessage: isOffline
    ? "Price subject to hotel approval"
    : null,

  requiresHotelApproval: isOffline,

  approvalStatus: isOffline
    ? "PENDING_APPROVAL"
    : "NOT_REQUIRED",

  manualConfirmationStatus: isOffline
    ? "NOT_STARTED"
    : undefined,
};

/*
 * This is the strict check.
 *
 * By this point the backend has already resolved the authoritative
 * supplier identity and price, so the selection must now satisfy the
 * normal final-confirmation booking rules.
 */
if (
  !isOffline &&
  !isSupplierBookableHotel(authoritativeSelection)
) {
  throw new Error(
    "The selected hotel is not supplier-bookable after the authoritative rate check. Refresh availability and select an available room.",
  );
}

      // A hotel change can cover a continuous multi-night stay. Keep every
      // authoritative persisted route selection in client state, including
      // its hotel-detail ID and refundable flag, so the hold-review modal can
      // target each newly selected night immediately.
      const authoritativeSelectionsByRoute = Object.fromEntries(
        serverSelections
          .map((selection: any) => {
            const routeId = Number(selection?.routeId || selection?.itineraryRouteId || 0);
            if (routeId <= 0) return null;
            const routeTotal = Number(
              selection.totalPrice ??
                selection.totalAmount ??
                selection.totalAmountAfterTax ??
                selection.selectedTotalPrice ??
                0,
            );
            const routeNightly = Number(
              selection.pricePerNight ??
                selection.selectedPricePerNight ??
                routeTotal ??
                0,
            );
            const routeBookingCode = String(
              selection.bookingCode ||
                selection.supplierBookingCode ||
                selectedHotelPayload.bookingCode ||
                selection.searchReference ||
                selectedHotelPayload.searchReference ||
                "",
            ).trim();
            const routeCheckInDate = String(
              selection.routeDate || selectedHotelPayload.checkInDate || "",
            ).slice(0, 10);
            const routeCheckOutDate = routeCheckInDate
              ? new Date(`${routeCheckInDate}T00:00:00.000Z`)
              : null;
            if (routeCheckOutDate) routeCheckOutDate.setUTCDate(routeCheckOutDate.getUTCDate() + 1);
            return [routeId, {
              ...authoritativeSelection,
              ...selection,
              bookingCode: routeBookingCode,
              netAmount: routeTotal || authoritativeSelection.netAmount,
              totalPrice: routeTotal || authoritativeSelection.totalPrice,
              totalAmount: routeTotal || authoritativeSelection.totalAmount,
              pricePerNight: routeNightly || authoritativeSelection.pricePerNight,
              ...(refundableRate !== undefined
                ? { isRefundable: refundableRate, IsRefundable: refundableRate }
                : {}),
              checkInDate: routeCheckInDate,
              checkOutDate: routeCheckOutDate
                ? routeCheckOutDate.toISOString().slice(0, 10)
                : selectedHotelPayload.checkOutDate,
              isBookable: true,
              externalStay: false,
            }];
          })
          .filter((entry): entry is [string, SelectedHotelBooking] => Boolean(entry)),
      );
      setSelectedHotelBookings((previous) => ({
        ...previous,
        ...authoritativeSelectionsByRoute,
        [selectionContext.routeId as number]: authoritativeSelection,
      }));
      setPrebookData(null);
      prebookDataRef.current = null;
      setHasAcceptedUpdatedPrice(false);

      toast.success("Hotel selected successfully");
      setHotelSelectionModal({ open: false, planId: null, routeId: null, routeDate: "" });
      setHotelSearchQuery("");
      setSelectedMealPlan({ all: false, breakfast: false, lunch: false, dinner: false });

      if (quoteId) {
        const [detailsRes, hotelRes] = await Promise.all([
          ItineraryService.getDetails(quoteId),
          shouldShowHotels ? ItineraryService.getHotelDetails(quoteId) : Promise.resolve(null),
        ]);
        setItinerary(detailsRes as ItineraryDetailsResponse);
        setHotelDetails(hotelRes as ItineraryHotelDetailsResponse);
      }
      return true;
    } catch (error) {
      console.error("Failed to select hotel", error);
      toast.error(getSafeErrorMessage(error, "Failed to select hotel"));
      return false;
    } finally {
      setIsSelectingHotel(false);
    }
  }, [getSafeErrorMessage, hotelSelectionModal, isSupplierBookableHotel, parseStaahSearchReference, prebookDataRef, quoteId, readOnly, setHasAcceptedUpdatedPrice, setHotelDetails, setHotelSearchQuery, setHotelSelectionModal, setIsSelectingHotel, setItinerary, setPrebookData, setSelectedHotelBookings, setSelectedMealPlan, shouldShowHotels]);
};
