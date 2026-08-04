import type { Dispatch, MutableRefObject, SetStateAction } from "react";
import { api } from "@/lib/api";
import { ItineraryService } from "@/services/itinerary";
import { toast } from "sonner";
import type { ItineraryDetailsResponse } from "../itinerary-details.types";
import type { ItineraryHotelDetailsResponse } from "../itinerary-details.types";
import type { AdditionalPassenger, GuestDetails } from "./useQuotationState";
import { buildQuotationModalPrefill } from "../utils/quotationModalPrefill.utils";
import { prepareQuotationPrebookSelections } from "../utils/quotationPrebookSelections.utils";
import { buildTboOccupancies, type QuotationOccupancy } from "../utils/quotationOccupancy.utils";
import { formatCurrency, getHotelSelectionAmount, parseWalletAmount, toMoneyNumber } from "../utils/clipboardFormatting.utils";
import { getSafeErrorMessage } from "../utils/quotationConfirmationDetails.utils";
import { isTboPrebookCandidate } from "../utils/domain.utils";

type UnknownRecord = Record<string, unknown>;
type HotelSelection = Record<string, unknown>;
type SelectedHotelBookings = Record<number, HotelSelection>;
type AgentInfo = {
  quotation_no: string;
  agent_name: string;
  agent_display_name?: string;
  agent_id?: number;
};

type HotelDetailsForPrebook = {
  hotels?: UnknownRecord[];
  hotelTabs?: Array<{ groupType?: number }>;
  hotelAvailability?: {
    availabilityState?: string;
    expiresAt?: string | null;
  };
};

type QuotationConfirmationModalControllerProps = {
  itinerary: ItineraryDetailsResponse | null;
  hotelDetails: HotelDetailsForPrebook | null;
  guestDetails: GuestDetails;
  confirmDefaultNationality: string;
  requiresDetailedPassengerFlow: boolean;
  isVehicleOnlyItinerary: boolean;
  isOpeningConfirmQuotation: boolean;
  selectedHotelBookings: SelectedHotelBookings;
  activeHotelGroupType: number | null;
  prebookDataRef: MutableRefObject<unknown | null>;
  tboSessionWindowMs: number;
  nonTboSelectedHotelEntries: readonly UnknownRecord[];
  setIsOpeningConfirmQuotation: Dispatch<SetStateAction<boolean>>;
  setConfirmQuotationModal: (open: boolean) => void;
  setPrebookData: (data: unknown | null) => void;
  setHasAcceptedUpdatedPrice: Dispatch<SetStateAction<boolean>>;
  setConfirmOccupanciesTemplate: Dispatch<SetStateAction<QuotationOccupancy[] | null>>;
  setFormErrors: Dispatch<SetStateAction<Record<string, string>>>;
  resetConfirmWalletTopUpPanel: () => void;
  setAdditionalAdults: Dispatch<SetStateAction<AdditionalPassenger[]>>;
  setAdditionalChildren: Dispatch<SetStateAction<AdditionalPassenger[]>>;
  setAdditionalInfants: Dispatch<SetStateAction<AdditionalPassenger[]>>;
  setWalletBalance: Dispatch<SetStateAction<string>>;
  setWalletBalanceAmount: Dispatch<SetStateAction<number | null>>;
  setAgentInfo: Dispatch<SetStateAction<AgentInfo | null>>;
  setConfirmDefaultNationality: Dispatch<SetStateAction<string>>;
  setGuestDetails: Dispatch<SetStateAction<GuestDetails>>;
  setSelectedHotelBookings: (updater: (previous: SelectedHotelBookings) => SelectedHotelBookings) => void;
  setIsPrebooking: Dispatch<SetStateAction<boolean>>;
  confirmRequiredAmount: number;
  prepareWalletTopUpPanel: (currentBalance: number) => void;
  refreshConfirmWalletBalance: (agentId: number) => Promise<number>;
  getCoveredRouteIdsFromHotelSelections: (selections: SelectedHotelBookings) => Set<number>;
  normalizeHotelProvider: (hotel: UnknownRecord) => string;
  isSupplierBookableHotel: (hotel: UnknownRecord) => boolean;
  parseStaahSearchReference: (value: unknown) => { roomId?: string; rateId?: string } | null;
  getHotelSelectionAmount: (hotel: UnknownRecord) => number;
};

const asRecord = (value: unknown): UnknownRecord => (
  value !== null && typeof value === "object" ? value as UnknownRecord : {}
);

export function useQuotationConfirmationModalController({
  itinerary,
  hotelDetails,
  guestDetails,
  confirmDefaultNationality,
  requiresDetailedPassengerFlow,
  isVehicleOnlyItinerary,
  isOpeningConfirmQuotation,
  selectedHotelBookings,
  activeHotelGroupType,
  prebookDataRef,
  tboSessionWindowMs,
  nonTboSelectedHotelEntries,
  setIsOpeningConfirmQuotation,
  setConfirmQuotationModal,
  setPrebookData,
  setHasAcceptedUpdatedPrice,
  setConfirmOccupanciesTemplate,
  setFormErrors,
  resetConfirmWalletTopUpPanel,
  setAdditionalAdults,
  setAdditionalChildren,
  setAdditionalInfants,
  setWalletBalance,
  setWalletBalanceAmount,
  setAgentInfo,
  setConfirmDefaultNationality,
  setGuestDetails,
  setSelectedHotelBookings,
  setIsPrebooking,
confirmRequiredAmount,
  prepareWalletTopUpPanel,
  refreshConfirmWalletBalance,
  getCoveredRouteIdsFromHotelSelections,
  normalizeHotelProvider,
  isSupplierBookableHotel,
  parseStaahSearchReference,
  getHotelSelectionAmount,
}: QuotationConfirmationModalControllerProps) {
  const openConfirmQuotationModal = async () => {
    if (isOpeningConfirmQuotation) return;

    if (!itinerary?.planId) {
      toast.error("Plan ID not found");
      return;
    }

    // Page loads are intentionally database-only. Confirmation is the
    // freshness gate: never call TBO implicitly here. If the persisted
    // snapshot/session has expired, ask the user to use the explicit Refresh
    // Availability action, which is the only path that performs live search.
    const availability = asRecord(hotelDetails?.hotelAvailability);
    const availabilityState = String(availability.availabilityState || "").trim().toUpperCase();
    const expiresAt = availability.expiresAt ? new Date(String(availability.expiresAt)).getTime() : NaN;
    const snapshotIsExpired = availabilityState === "STALE" || (Number.isFinite(expiresAt) && expiresAt <= Date.now());
    const hasTboSelection =
      Object.values(selectedHotelBookings).some((hotelData) => isTboPrebookCandidate(hotelData)) ||
      Boolean(hotelDetails?.hotels?.some((hotelData) => isTboPrebookCandidate(hotelData)));

    if (snapshotIsExpired && hasTboSelection) {
      toast.error("Hotel availability has expired. Click Refresh Availability, then select the hotel again before confirming.");
      return;
    }

    setIsOpeningConfirmQuotation(true);
    setConfirmQuotationModal(true);
    setPrebookData(null);
    prebookDataRef.current = null;
    setHasAcceptedUpdatedPrice(false);
    setConfirmOccupanciesTemplate(null);
    setFormErrors({});
    resetConfirmWalletTopUpPanel();
    setAdditionalAdults([]);
    setAdditionalChildren([]);
    setAdditionalInfants([]);

    try {
      const customerInfo = asRecord(await ItineraryService.getCustomerInfoForm(itinerary.planId));
      const initialWalletAmount = parseWalletAmount(customerInfo.wallet_balance);

      setWalletBalance(String(customerInfo.wallet_balance || formatCurrency(initialWalletAmount)));
      setWalletBalanceAmount(initialWalletAmount);

      const planDetails = asRecord(await api(`itineraries/edit/${itinerary.planId}`, { method: "GET" }));
      const plan = asRecord(planDetails.plan);
      const agentId = plan.agent_ID || plan.agent_id || planDetails.agent_ID || planDetails.agent_id || customerInfo.agent_id;

      console.log("[openConfirmQuotationModal] planDetails:", planDetails);
      console.log("[openConfirmQuotationModal] customerInfo:", customerInfo);
      console.log("[openConfirmQuotationModal] agentId resolved to:", agentId);

      if (agentId) {
        try {
          await refreshConfirmWalletBalance(Number(agentId));
        } catch (error) {
          console.warn("Failed to fetch wallet balance:", error);
        }
      }

      if (!agentId) {
        console.error("Failed to load agent information. Available data:", { planDetails, customerInfo });
        toast.error("Failed to load agent information. Please try again.");
        setConfirmQuotationModal(false);
        return;
      }

            const agentInfo = {
        quotation_no: String(customerInfo.quotation_no || ""),
        agent_name: String(customerInfo.agent_name || ""),
        agent_display_name: String(customerInfo.agent_display_name || customerInfo.agent_name || ""),
        agent_id: Number(agentId),
      };
      setAgentInfo(agentInfo);

      // Immediately check wallet balance and show recharge panel if insufficient
      if (confirmRequiredAmount > 0 && agentInfo.agent_id) {
        try {
          const latestWalletBalance = await refreshConfirmWalletBalance(Number(agentInfo.agent_id));
          if (latestWalletBalance < confirmRequiredAmount) {
            prepareWalletTopUpPanel(latestWalletBalance);
          }
        } catch (error) {
          console.warn("Failed to check wallet balance on modal open:", error);
          // Don't block modal opening, but wallet check will run again on confirm
        }
      }

      const travellersFromPlan = Array.isArray(planDetails.travellers) ? planDetails.travellers : [];
      const hasPrefillSource = Boolean(planDetails.plan) || travellersFromPlan.length > 0;
      const modalPrefill = hasPrefillSource
        ? buildQuotationModalPrefill({
            plan: planDetails.plan,
            travellers: travellersFromPlan,
            fallbackNationality: guestDetails.nationality || confirmDefaultNationality || "IN",
            roomCount: Number(itinerary.roomCount || 1),
            requiresDetailedPassengerFlow,
          })
        : null;
      const modalNationalityForSession = modalPrefill?.nationality || confirmDefaultNationality;

      if (modalPrefill && planDetails.plan) {
        setConfirmDefaultNationality(modalPrefill.nationality);
        setGuestDetails((previous) => ({
          ...previous,
          nationality: modalPrefill.nationality,
          arrivalDateTime: modalPrefill.arrivalDateTime,
          arrivalPlace: modalPrefill.arrivalPlace,
          departureDateTime: modalPrefill.departureDateTime,
          departurePlace: modalPrefill.departurePlace,
        }));
      }

      const occupanciesTemplateFromPlan = modalPrefill?.occupancyTemplate || null;
      if (travellersFromPlan.length > 0 && modalPrefill) {
        setAdditionalAdults(modalPrefill.additionalAdults);
        setAdditionalChildren(modalPrefill.additionalChildren);
        setAdditionalInfants(modalPrefill.additionalInfants);
        setConfirmOccupanciesTemplate(modalPrefill.occupancyTemplate);
      }

      if (isVehicleOnlyItinerary) {
        setAdditionalAdults([]);
        setAdditionalChildren([]);
        setAdditionalInfants([]);
        setConfirmOccupanciesTemplate(null);
        setPrebookData(null);
        prebookDataRef.current = null;
        setHasAcceptedUpdatedPrice(false);
        return;
      }

      let selectedHotelsForPrebook = { ...selectedHotelBookings };
      const hasExplicitTboSelection =
        Object.values(selectedHotelBookings).some((hotelData) => isTboPrebookCandidate(hotelData)) ||
        Boolean(hotelDetails?.hotels?.some((hotelData) =>
          Number(hotelData.itineraryPlanHotelDetailsId || 0) > 0 &&
          isTboPrebookCandidate(hotelData),
        ));
      if (hotelDetails?.hotels?.length) {
        const preferredGroupType = activeHotelGroupType ?? hotelDetails.hotelTabs?.[0]?.groupType ?? 1;
        const preparedSelections = prepareQuotationPrebookSelections({
          selectedHotelBookings,
          hotelRows: hotelDetails.hotels,
          preferredGroupType: Number(preferredGroupType),
          itineraryDays: itinerary.days || [],
          normalizeHotelProvider,
          isSupplierBookableHotel,
          parseStaahSearchReference,
          getHotelSelectionAmount,
          getCoveredRouteIdsFromHotelSelections,
        });
        // Do not auto-introduce TBO/VSR rows when the user selected only
        // non-VSR or offline hotels. That would incorrectly require prebook.
        selectedHotelsForPrebook = hasExplicitTboSelection
          ? preparedSelections.selectedHotelsForPrebook
          : { ...selectedHotelBookings };
        if (hasExplicitTboSelection && Object.keys(preparedSelections.mergedPersisted).length > 0) {
          setSelectedHotelBookings((previous) => ({ ...previous, ...preparedSelections.mergedPersisted }));
        }
        if (hasExplicitTboSelection && Object.keys(preparedSelections.autoSelections).length > 0) {
          setSelectedHotelBookings((previous) => ({ ...previous, ...preparedSelections.autoSelections }));
        }
      }

      const prebookOccupancies = occupanciesTemplateFromPlan && occupanciesTemplateFromPlan.length > 0
        ? occupanciesTemplateFromPlan
        : buildTboOccupancies(
            Number(itinerary.roomCount || 1),
            Math.max(Number(itinerary.adults || 1), 1),
            [],
          );

      const prebookHotelBookings = Object.entries(selectedHotelsForPrebook)
        .filter(([, hotelData]) => normalizeHotelProvider(hotelData) === "tbo" && isTboPrebookCandidate(hotelData))
        .map(([routeId, hotelData]) => ({
          occupancies: prebookOccupancies,
          // The UI label is VSR, but the API contract is the canonical TBO
          // provider. This also protects older persisted rows that stored
          // "vsr" instead of "tbo".
          provider: normalizeHotelProvider(hotelData),
          routeId: parseInt(routeId, 10),
          hotelCode: hotelData.hotelCode,
          hotelName: hotelData.hotelName,
          bookingCode: hotelData.bookingCode,
          roomType: hotelData.roomType,
          checkInDate: hotelData.checkInDate,
          checkOutDate: hotelData.checkOutDate,
          numberOfRooms: Number(itinerary.roomCount || 1),
          guestNationality: modalNationalityForSession,
          netAmount: toMoneyNumber(getHotelSelectionAmount(hotelData)),
          searchInitiatedAt: hotelData.searchInitiatedAt,
          passengers: [],
        })) as unknown as Parameters<typeof ItineraryService.prebookHotels>[0]["hotel_bookings"];
      console.log("[CONFIRM_HOTELS] nonTboSelectedHotelEntries", nonTboSelectedHotelEntries);
      console.log("[CONFIRM_HOTELS] TBO prebook candidates", prebookHotelBookings.map((booking) => ({
        routeId: booking.routeId,
        hotelCode: booking.hotelCode,
        hotelName: booking.hotelName,
        hasFreshBookingCode: String(booking.bookingCode || '').includes('!TB!'),
        bookingCode: booking.bookingCode || null,
      })));

      if (prebookHotelBookings.length > 0) {
        const staleHotel = prebookHotelBookings.find((booking) => {
          if (!booking.searchInitiatedAt) return false;
          const parsed = new Date(String(booking.searchInitiatedAt));
          if (Number.isNaN(parsed.getTime())) return true;
          return Date.now() - parsed.getTime() > tboSessionWindowMs;
        });

        if (staleHotel) {
          toast.error("Hotel availability has expired. Click Refresh Availability, then select the hotel again before confirming.");
          setConfirmQuotationModal(false);
          return;
        }

        const clientIp = await fetch("https://api.ipify.org?format=json")
          .then((response) => response.json())
          .then((data: { ip?: string }) => data.ip || "192.168.1.1")
          .catch(() => "192.168.1.1");

        setIsPrebooking(true);
        try {
          const prebookResponse = await ItineraryService.prebookHotels({
            itinerary_plan_ID: itinerary.planId,
            hotel_bookings: prebookHotelBookings,
            endUserIp: clientIp,
          });
          const prebookRecord = asRecord(prebookResponse);
          const normalizedPrebook = prebookRecord.data || prebookResponse;
          prebookDataRef.current = normalizedPrebook;
          setPrebookData(normalizedPrebook);
        } catch (prebookError) {
          const message = getSafeErrorMessage(prebookError, "Failed to prebook selected hotels. Please retry.");
          if (/availability has expired|session expired|booking code is invalid|search session exceeded|booking code invalid/i.test(message)) {
            setConfirmQuotationModal(false);
            setPrebookData(null);
            prebookDataRef.current = null;
            toast.error("Hotel availability has expired. Click Refresh Availability, then select the hotel again before confirming.");
          } else {
            toast.error(message);
          }
        } finally {
          setIsPrebooking(false);
        }
      }
    } catch (error) {
      console.error("Failed to load customer info", error);
      const message = error instanceof Error ? error.message : "Failed to load customer information";
      toast.error(message);
    } finally {
      setIsOpeningConfirmQuotation(false);
    }
  };

  return openConfirmQuotationModal;
}
