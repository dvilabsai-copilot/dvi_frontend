import { useCallback, useEffect, useRef, type Dispatch, type MutableRefObject, type SetStateAction } from "react";
import { api } from "@/lib/api";
import { ItineraryService } from "@/services/itinerary";
import { toast } from "sonner";
import type { ItineraryDetailsResponse } from "../itinerary-details.types";
import type { ItineraryHotelDetailsResponse } from "../itinerary-details.types";
import type { AdditionalPassenger, GuestDetails } from "./useQuotationState";
import type { ValidatedQuotationPassengers } from "./useQuotationPassengerValidation";
import { buildQuotationModalPrefill } from "../utils/quotationModalPrefill.utils";
import { canPersistHotelHoldGuestDetails } from "../utils/hotelHoldGuestDetails.utils";
import { prepareQuotationPrebookSelections } from "../utils/quotationPrebookSelections.utils";
import { buildTboOccupancies, resolveTboHoldOccupancy, type QuotationOccupancy } from "../utils/quotationOccupancy.utils";
import { formatCurrency, getHotelSelectionAmount, parseWalletAmount, toMoneyNumber } from "../utils/clipboardFormatting.utils";
import { getSafeErrorMessage } from "../utils/quotationConfirmationDetails.utils";
import { isTboPrebookCandidate } from "../utils/domain.utils";
import { getIntentionallyEmptyRouteIds } from "../utils/quotationPrebookSelections.utils";
import { applyContinuousVsrRefundability, getHotelHoldEligibility, resolveHotelDetailsIdsFromRows, resolveHotelHoldCheckInDate } from "../utils/hotelHoldEligibility.utils";

type UnknownRecord = Record<string, unknown>;
type HotelSelection = Record<string, unknown>;
type SelectedHotelBookings = Record<number, HotelSelection>;
type AgentInfo = {
  quotation_no: string;
  agent_name: string;
  agent_display_name?: string;
  agent_id?: number;
};
type HotelHoldRequest = Record<string, unknown>;

type HotelDetailsForPrebook = {
  hotels?: UnknownRecord[];
  hotelTabs?: Array<{ groupType?: number }>;
  hotelSelectionState?: Array<{
    groupType?: number;
    routes?: Array<{ routeId?: number; selected?: UnknownRecord | null }>;
  }>;
  hotelAvailability?: {
    availabilityState?: string;
    expiresAt?: string | null;
  };
};

type QuotationConfirmationModalControllerProps = {
  itinerary: ItineraryDetailsResponse | null;
  hotelDetails: HotelDetailsForPrebook | null;
  hotelRows?: UnknownRecord[];
  guestDetails: GuestDetails;
  confirmDefaultNationality: string;
  confirmOccupanciesTemplate: QuotationOccupancy[] | null;
  requiresDetailedPassengerFlow: boolean;
  isVehicleOnlyItinerary: boolean;
  isOpeningConfirmQuotation: boolean;
  isConfirmQuotationModalOpen: boolean;
  selectedHotelBookings: SelectedHotelBookings;
  holdRequests: HotelHoldRequest[];
  activeHotelGroupType: number | null;
  prebookDataRef: MutableRefObject<unknown | null>;
  tboSessionWindowMs: number;
  nonTboSelectedHotelEntries: readonly UnknownRecord[];
  setIsOpeningConfirmQuotation: Dispatch<SetStateAction<boolean>>;
  setConfirmQuotationModal: (open: boolean) => void;
  setPrebookData: (data: unknown | null) => void;
  setTboHoldEligibilityResults: Dispatch<SetStateAction<Array<UnknownRecord>>>;
  tboHoldEligibilityResults: readonly UnknownRecord[];
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
  setHoldRequests: Dispatch<SetStateAction<HotelHoldRequest[]>>;
  validateQuotationPassengers: () => ValidatedQuotationPassengers | null;
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
  hotelRows,
  guestDetails,
  confirmDefaultNationality,
  confirmOccupanciesTemplate,
  requiresDetailedPassengerFlow,
  isVehicleOnlyItinerary,
  isOpeningConfirmQuotation,
  isConfirmQuotationModalOpen,
  selectedHotelBookings,
  holdRequests,
  activeHotelGroupType,
  prebookDataRef,
  tboSessionWindowMs,
  nonTboSelectedHotelEntries,
  setIsOpeningConfirmQuotation,
  setConfirmQuotationModal,
  setPrebookData,
  setTboHoldEligibilityResults,
  tboHoldEligibilityResults,
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
  setHoldRequests,
  validateQuotationPassengers,
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
  const lastPersistedGuestDetailsRef = useRef("");
  const guestDetailsSignature = JSON.stringify({
    name: String(guestDetails.name || "").trim(),
    age: String(guestDetails.age ?? "").trim(),
    contactNo: String(guestDetails.contactNo || "").trim(),
    emailId: String(guestDetails.emailId || "").trim().toLowerCase(),
  });

  useEffect(() => {
    if (!isConfirmQuotationModalOpen || isOpeningConfirmQuotation || !itinerary?.planId
      || !canPersistHotelHoldGuestDetails(guestDetails)
      || guestDetailsSignature === lastPersistedGuestDetailsRef.current) return;

    const signature = guestDetailsSignature;
    const timer = window.setTimeout(() => {
      if (signature === lastPersistedGuestDetailsRef.current) return;
      void ItineraryService.saveHotelBlockGuestDetails(
        itinerary.planId,
        guestDetails as unknown as Record<string, unknown>,
      ).then(() => {
        lastPersistedGuestDetailsRef.current = signature;
      }).catch((error) => {
        console.warn("Could not autosave complete package guest details:", error);
      });
    }, 700);

    return () => window.clearTimeout(timer);
  }, [guestDetails, guestDetailsSignature, isConfirmQuotationModalOpen, isOpeningConfirmQuotation, itinerary?.planId]);

  const holdGroupType = Number(activeHotelGroupType || hotelDetails?.hotelTabs?.[0]?.groupType || 0);
  const refreshHoldRequests = useCallback(async () => {
    if (!itinerary?.planId) return;
    const existingHolds = await ItineraryService.getHotelBlockRequests(itinerary.planId, holdGroupType || undefined);
    setHoldRequests(Array.isArray(existingHolds) ? existingHolds as HotelHoldRequest[] : []);
  }, [itinerary?.planId, holdGroupType, setHoldRequests]);

  const hasActiveSupplierHold = (hotel: HotelSelection): boolean => {
    const selectionIds = resolveSelectedHotelDetailsIds(hotel);
    if (!selectionIds.length || getHotelHoldEligibility(hotel).provider !== "tbo") return false;
    return holdRequests.some((request) => {
      const status = String(request.status || "").trim().toUpperCase();
      const channel = String(request.confirmationChannel || request.confirmation_channel || "").trim().toUpperCase();
      const requestIds = Array.isArray(request.selectionIds) ? request.selectionIds.map(Number) : [];
      const cutoff = request.cutoffAt || request.holdUntil;
      return channel === "TBO_BOOK_HOLD"
        && ["HOLD", "BLOCKED", "CONFIRMED"].includes(status)
        && (!cutoff || new Date(String(cutoff)).getTime() > Date.now())
        && selectionIds.some((id) => requestIds.includes(Number(id)));
    });
  };

  const openConfirmQuotationModal = async ({ performPrebook = false }: { performPrebook?: boolean } = {}): Promise<boolean> => {
    if (isOpeningConfirmQuotation) return false;

    if (!itinerary?.planId) {
      toast.error("Plan ID not found");
      return false;
    }

    // Page loads are intentionally database-only. Confirmation is the
    // freshness gate: never call TBO implicitly here. If the persisted
    // snapshot/session has expired, ask the user to use the explicit Refresh
    // Availability action, which is the only path that performs live search.
    const availability = asRecord(hotelDetails?.hotelAvailability);
    const availabilityState = String(availability.availabilityState || "").trim().toUpperCase();
    const expiresAt = availability.expiresAt ? new Date(String(availability.expiresAt)).getTime() : NaN;
    const snapshotIsExpired = availabilityState === "STALE" || (Number.isFinite(expiresAt) && expiresAt <= Date.now());
    const hasTboSelection = Object.values(selectedHotelBookings).some((hotelData) => isTboPrebookCandidate(hotelData));

    if (performPrebook && snapshotIsExpired && hasTboSelection) {
      toast.error("Hotel availability has expired. Reload the itinerary, then select the hotel again before confirming.");
      return false;
    }

    setIsOpeningConfirmQuotation(true);
    setConfirmQuotationModal(true);
    setPrebookData(null);
    setTboHoldEligibilityResults([]);
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
        return false;
      }

            const agentInfo = {
        quotation_no: String(customerInfo.quotation_no || ""),
        agent_name: String(customerInfo.agent_name || ""),
        agent_display_name: String(customerInfo.agent_display_name || customerInfo.agent_name || ""),
        agent_id: Number(agentId),
      };
      setAgentInfo(agentInfo);

      try {
        const savedGuestResponse = asRecord(await ItineraryService.getHotelBlockGuestDetails(itinerary.planId));
        const savedGuest = asRecord(savedGuestResponse.guest || savedGuestResponse.data || savedGuestResponse);
        if (Object.keys(savedGuest).length > 0) {
          setGuestDetails((previous) => ({ ...previous, ...savedGuest } as GuestDetails));
          lastPersistedGuestDetailsRef.current = JSON.stringify({
            name: String(savedGuest.name || "").trim(),
            age: String(savedGuest.age ?? "").trim(),
            contactNo: String(savedGuest.contactNo || "").trim(),
            emailId: String(savedGuest.emailId || "").trim().toLowerCase(),
          });
        }
      } catch (error) {
        console.warn("Failed to load saved package guest details:", error);
      }

      try {
        await refreshHoldRequests();
      } catch (error) {
        console.warn("Failed to load hotel hold requests:", error);
        setHoldRequests([]);
      }

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
        // Additional passenger forms are opt-in. The itinerary occupancy is
        // still retained in the occupancy template, but rows are created only
        // when the user explicitly clicks Add Adult, Add Child, or Add Infant.
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
        return true;
      }

      const intentionallyEmptyRouteIds = getIntentionallyEmptyRouteIds(hotelDetails?.hotels || []);
      let selectedHotelsForPrebook = Object.fromEntries(
        Object.entries(selectedHotelBookings).filter(([routeId, hotelData]) =>
          String(hotelData.selectionOrigin || hotelData.selection_origin || '').trim().toUpperCase() !== 'USER_REMOVED' &&
          !intentionallyEmptyRouteIds.has(Number(routeId)),
        ),
      );
      const hasExplicitTboSelection = Object.values(selectedHotelBookings).some((hotelData) => isTboPrebookCandidate(hotelData));
      if (hotelDetails?.hotels?.length) {
        const preferredGroupType = activeHotelGroupType ?? hotelDetails.hotelTabs?.[0]?.groupType ?? 1;
        const preparedSelections = prepareQuotationPrebookSelections({
          selectedHotelBookings,
          hotelRows: hotelDetails.hotels,
          hotelSelectionState: hotelDetails.hotelSelectionState,
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
          : { ...selectedHotelsForPrebook };
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

      let prebookSucceeded = true;
      if (performPrebook && prebookHotelBookings.length > 0) {
        const staleHotel = prebookHotelBookings.find((booking) => {
          if (!booking.searchInitiatedAt) return false;
          const parsed = new Date(String(booking.searchInitiatedAt));
          if (Number.isNaN(parsed.getTime())) return true;
          return Date.now() - parsed.getTime() > tboSessionWindowMs;
        });

        if (staleHotel) {
          toast.error("Hotel availability has expired. Reload the itinerary, then select the hotel again before confirming.");
          setConfirmQuotationModal(false);
          return false;
        }

        setIsPrebooking(true);
        try {
          const eligibilityBookings = prebookHotelBookings.map((booking) => {
            const selectedHotel = asRecord(selectedHotelsForPrebook[String(booking.routeId)]);
            const routeIds = Array.isArray(selectedHotel.routeIds)
              ? selectedHotel.routeIds.map(Number).filter((id) => Number.isInteger(id) && id > 0)
              : [booking.routeId];
            return { ...booking, routeIds };
          });
          const eligibilityResponse = await ItineraryService.checkHotelHoldEligibility({
            itinerary_plan_ID: itinerary.planId,
            hotel_bookings: eligibilityBookings,
          });
          const eligibilityRecord = asRecord(eligibilityResponse);
          const normalizedEligibility = asRecord(eligibilityRecord.data || eligibilityResponse);
          const returnedHotels = Array.isArray(normalizedEligibility.hotels)
            ? normalizedEligibility.hotels.map(asRecord)
            : [];
          const completeResults = eligibilityBookings.map((booking) => {
            const routeIds = booking.routeIds || [booking.routeId];
            const result = returnedHotels.find((hotel) => {
              const resultRouteIds = [
                ...(Array.isArray(hotel.routeIds) ? hotel.routeIds : []),
                hotel.routeId,
              ].map(Number).filter((id) => Number.isInteger(id) && id > 0);
              return routeIds.some((id) => resultRouteIds.includes(id));
            });
            return result || {
              routeId: booking.routeId,
              routeIds,
              hotelCode: booking.hotelCode,
              hotelName: booking.hotelName,
              holdable: false,
              reason: "CHECK_FAILED",
            };
          });
          setTboHoldEligibilityResults(completeResults);
          if (completeResults.some((result) => result.reason === "CHECK_FAILED")) {
            toast.error("Unable to verify one or more VSR rates. Hold is disabled for those stays until the rates are checked again.");
          }
        } catch (prebookError) {
          const message = getSafeErrorMessage(prebookError, "Unable to check the latest VSR hold eligibility.");
          if (/availability has expired|session expired|booking code is invalid|search session exceeded|booking code invalid/i.test(message)) {
            setConfirmQuotationModal(false);
            toast.error("Hotel availability has expired. Reload the itinerary, then select the hotel again before confirming.");
          } else {
            setTboHoldEligibilityResults(prebookHotelBookings.map((booking) => ({
              routeId: booking.routeId,
              routeIds: [booking.routeId],
              hotelCode: booking.hotelCode,
              hotelName: booking.hotelName,
              holdable: false,
              reason: "CHECK_FAILED",
            })));
            toast.error(`VSR hold eligibility could not be verified. Hold is disabled until the rate is checked again. ${message}`);
          }
          prebookSucceeded = false;
        } finally {
          setIsPrebooking(false);
        }
      }
      return prebookSucceeded;
    } catch (error) {
      console.error("Failed to load customer info", error);
      const message = error instanceof Error ? error.message : "Failed to load customer information";
      toast.error(message);
      return false;
    } finally {
      setIsOpeningConfirmQuotation(false);
    }
  };

  const resolveSelectedHotelDetailsIds = (selection: HotelSelection): number[] => {
    return resolveHotelDetailsIdsFromRows(selection, hotelRows || []);
  };

  const buildTboHoldBookings = (selections: HotelSelection[]) => {
    const adults = Math.max(Number(itinerary?.adults || 1), 1);
    const children = Math.max(Number(itinerary?.children || 0), 0);
    const roomCount = Math.max(Number(itinerary?.roomCount || 1), 1);
    const { occupancies, childAges } = resolveTboHoldOccupancy(
      roomCount,
      adults,
      children,
      confirmOccupanciesTemplate,
    );
    const guestName = String(guestDetails.name || "Guest").trim().split(/\s+/).filter(Boolean);
    const firstName = guestName[0] || "Guest";
    const lastName = guestName.slice(1).join(" ") || firstName;
    const passenger = {
      title: String(guestDetails.salutation || "Mr"),
      firstName,
      lastName,
      nationality: String(guestDetails.nationality || confirmDefaultNationality || "IN").toUpperCase(),
      email: guestDetails.emailId || undefined,
      paxType: 1,
      leadPassenger: true,
      age: Math.max(Number(guestDetails.age || 30), 12),
      phoneNo: guestDetails.contactNo || undefined,
    };
    const childPassengers = childAges.map((age) => ({
      title: "Ms",
      firstName: "Child",
      lastName: "Guest",
      nationality: passenger.nationality,
      email: undefined,
      paxType: 2,
      leadPassenger: false,
      age,
      phoneNo: guestDetails.contactNo || undefined,
    }));

    return selections.flatMap((selection) => {
      const hotelDetailsIds = resolveSelectedHotelDetailsIds(selection);
      // The review table is built from the latest persisted hotel rows, while
      // the modal action can still hold an older route-keyed selection object.
      // If that object does not carry the supplier/refundable fields, merge
      // the matching persisted row only for this hold payload. This keeps the
      // displayed Hold action and the request payload on the same rate.
      const matchingRow = (hotelRows || []).find((row) => {
        const rowIds = resolveHotelDetailsIdsFromRows(row, hotelRows || []);
        return hotelDetailsIds.length > 0 && rowIds.some((id) => hotelDetailsIds.includes(id));
      });
      const effectiveSelection = matchingRow
        ? Object.fromEntries(Object.entries({ ...matchingRow, ...selection }).filter(([, value]) => value !== undefined))
        : selection;
      const eligibility = getHotelHoldEligibility(effectiveSelection);
      if (eligibility.provider !== "tbo" || !eligibility.holdable) return [];
      const snapshot = (() => {
        const value = effectiveSelection.selectedPriceSnapshot || effectiveSelection.selected_price_snapshot;
        if (value && typeof value === "object") return asRecord(value);
        if (typeof value !== "string" || !value.trim()) return {};
        try { return asRecord(JSON.parse(value)); } catch { return {}; }
      })();
      const bookingCode = String(effectiveSelection.bookingCode || effectiveSelection.BookingCode || snapshot.bookingCode || "").trim();
      const hotelCode = String(effectiveSelection.hotelCode || effectiveSelection.hotel_code || snapshot.hotelCode || "").trim();
      return hotelDetailsIds.length > 0 ? [{
        hotelDetailsIds,
        selection: {
          provider: "tbo",
          hotelCode,
          hotelName: effectiveSelection.hotelName || snapshot.hotelName,
          bookingCode,
          roomType: effectiveSelection.roomType || snapshot.roomType || "Room",
          checkInDate: effectiveSelection.checkInDate || snapshot.checkInDate,
          checkOutDate: effectiveSelection.checkOutDate || snapshot.checkOutDate,
          numberOfRooms: roomCount,
          guestNationality: passenger.nationality,
          netAmount: toMoneyNumber(getHotelSelectionAmount(selection)),
          searchInitiatedAt: effectiveSelection.searchInitiatedAt,
          passengers: [passenger, ...childPassengers],
          occupancies,
          isVoucherBooking: false,
        },
      }] : [];
    });
  };

  const persistGuestDetailsAfterHold = async () => {
    if (!itinerary?.planId || !canPersistHotelHoldGuestDetails(guestDetails)) return;
    try {
      await ItineraryService.saveHotelBlockGuestDetails(
        itinerary.planId,
        guestDetails as unknown as Record<string, unknown>,
      );
      lastPersistedGuestDetailsRef.current = guestDetailsSignature;
    } catch (error) {
      console.warn("Hotel hold succeeded, but guest details could not be saved for next time:", error);
      toast.warning("The hotel hold succeeded, but guest details could not be saved for next time.");
    }
  };

  const holdHotels = async (options: { acknowledgePaymentRequired?: boolean } = {}): Promise<boolean> => {
    if (!itinerary?.planId) {
      toast.error("Plan ID not found");
      return false;
    }
    const groupType = Number(activeHotelGroupType || hotelDetails?.hotelTabs?.[0]?.groupType || 0);
    if (!groupType) {
      toast.error("Select a recommendation group before holding hotels.");
      return false;
    }
    const selectedRouteOrder = Array.isArray(hotelDetails?.hotelSelectionState)
      ? hotelDetails.hotelSelectionState
        .find((state) => Number(state.groupType || 0) === groupType)?.routes
        ?.map((route) => Number(route.routeId || 0)).filter((routeId) => routeId > 0) || []
      : [];
    const selectedHotelEntries = Object.entries(selectedHotelBookings)
        .filter(([, hotel]) => String(hotel.selectionOrigin || hotel.selection_origin || "").trim().toUpperCase() !== "USER_REMOVED")
        .map(([routeId, hotel]) => {
          const selected = { ...hotel, routeId: Number(hotel.routeId || routeId) };
          const selectionIds = resolveSelectedHotelDetailsIds(selected);
          const matchingRow = (hotelRows || []).find((row) => {
            const rowIds = resolveHotelDetailsIdsFromRows(row, hotelRows || []);
            return selectionIds.length > 0 && rowIds.some((id) => selectionIds.includes(id));
          });
          const merged = matchingRow
            ? Object.fromEntries(Object.entries({ ...matchingRow, ...selected }).filter(([, value]) => value !== undefined))
            : selected;
          const routeIds = [
            ...(Array.isArray(merged.routeIds) ? merged.routeIds : []),
            merged.routeId,
          ].map(Number).filter((id) => Number.isInteger(id) && id > 0);
          const eligibilityCheck = tboHoldEligibilityResults.find((result) => {
            const resultRouteIds = [
              ...(Array.isArray(result.routeIds) ? result.routeIds : []),
              result.routeId,
            ].map(Number).filter((id) => Number.isInteger(id) && id > 0);
            return routeIds.some((id) => resultRouteIds.includes(id));
          });
          return eligibilityCheck ? { ...merged, holdEligibilityCheck: eligibilityCheck } : merged;
        });
    const prebookResponse = asRecord(prebookDataRef.current);
    const continuousSupplierResponseEntries = Array.isArray(prebookResponse.hotels)
      ? prebookResponse.hotels.map(asRecord)
      : [];
    const selectedHotels = applyContinuousVsrRefundability(
      [...selectedHotelEntries, ...continuousSupplierResponseEntries],
      selectedRouteOrder,
    ).slice(0, selectedHotelEntries.length);
    const nonHoldableVsrHotels = selectedHotels
      .filter((hotel) => {
        const eligibility = getHotelHoldEligibility(hotel);
        return eligibility.provider === "tbo" && !eligibility.holdable;
      })
      .map((hotel) => String(hotel.hotelName || "VSR hotel").trim())
      .filter(Boolean);
    if (nonHoldableVsrHotels.length > 0 && !options.acknowledgePaymentRequired) {
      throw new Error(`HOTEL_HOLD_PAYMENT_REQUIRED: ${Array.from(new Set(nonHoldableVsrHotels)).join(", ")}`);
    }

    const holdableSelectionIds = Array.from(new Set(
      selectedHotels
        .filter((hotel) => getHotelHoldEligibility(hotel).holdable)
        .flatMap(resolveSelectedHotelDetailsIds),
    ));
    if (nonHoldableVsrHotels.length > 0 && holdableSelectionIds.length === 0) {
      throw new Error("HOTEL_HOLD_PAYMENT_REQUIRED: No other holdable hotel stays are available to hold.");
    }
    const tboHoldBookings = buildTboHoldBookings(
      selectedHotels.filter((hotel) => getHotelHoldEligibility(hotel).provider === "tbo"
        && getHotelHoldEligibility(hotel).holdable
        && !hasActiveSupplierHold(hotel)),
    );
    const groupSelectionIds = Array.from(new Set(
      selectedHotels
        .filter((hotel) => {
          const eligibility = getHotelHoldEligibility(hotel);
          return (eligibility.provider !== "tbo" || eligibility.holdable)
            && !(eligibility.provider === "tbo" && hasActiveSupplierHold(hotel));
        })
        .flatMap(resolveSelectedHotelDetailsIds),
    ));
    const hasReusedSupplierHold = selectedHotels.some(hasActiveSupplierHold);
    if (groupSelectionIds.length === 0 && tboHoldBookings.length === 0) {
      await refreshHoldRequests();
      if (nonHoldableVsrHotels.length > 0) {
        toast.error(`No holdable hotel stays were selected: ${Array.from(new Set(nonHoldableVsrHotels)).join(", ")}.`);
        return false;
      }
      toast.success("The selected supplier hotel hold is already active.");
      return true;
    }
    try {
      const response = asRecord(await ItineraryService.holdHotelGroup({
        itineraryPlanId: itinerary.planId,
        groupType,
        hotelDetailsIds: groupSelectionIds,
        ...(tboHoldBookings.length > 0 ? { tboHoldBookings } : {}),
        guest: {
          name: guestDetails.name,
          email: guestDetails.emailId,
          phone: guestDetails.contactNo,
        },
      }));
      const requests = Array.isArray(response.requests) ? response.requests as HotelHoldRequest[] : [];
      await refreshHoldRequests();
      const outcomes = Array.isArray(response.outcomes) ? response.outcomes as Array<Record<string, unknown>> : [];
      const successfulOutcomes = outcomes.filter((outcome) => outcome.success === true);
      const failedOutcomes = outcomes.filter((outcome) => outcome.success !== true);
      if (successfulOutcomes.length > 0) await persistGuestDetailsAfterHold();
      const contactRequired = Number(response.contactRequired || 0);
      const supplierBookingCalls = Number(response.supplierBookingCalls || 0);
      const failureSummary = failedOutcomes
        .map((outcome) => `${String(outcome.hotelName || "Hotel")}: ${String(outcome.message || "hold unavailable")}`)
        .join(" | ");
      if (failedOutcomes.length > 0 && successfulOutcomes.length > 0) {
        toast.warning(`Held ${successfulOutcomes.length} stay(s). ${failureSummary}`);
      } else if (failedOutcomes.length > 0) {
        toast.error(failureSummary || "No hotel stays could be held.");
      } else {
        toast.success(
          contactRequired > 0
            ? `Hotel hold requests created. ${contactRequired} hotel contact${contactRequired === 1 ? "" : "s"} required.`
            : hasReusedSupplierHold && requests.length === 0
              ? "Existing supplier hotel holds are already active."
              : supplierBookingCalls > 0
                ? "Hotel holds created. Supplier confirmation was sent with payment pending."
                : "Hotel hold requests created. No supplier booking was called.",
        );
      }
      return successfulOutcomes.length > 0;
    } catch (error) {
      const message = getSafeErrorMessage(error, "Failed to create hotel hold requests.");
      if (/HOTEL_HOLD_NOT_ALLOWED/i.test(message)) {
        throw new Error(message);
      }
      toast.error(message);
      return false;
    }
  };

  const saveGuestDetails = async (): Promise<boolean> => {
    if (!itinerary?.planId) {
      toast.error("Plan ID not found");
      return false;
    }
    if (!validateQuotationPassengers()) return false;
    try {
      await ItineraryService.saveHotelBlockGuestDetails(itinerary.planId, guestDetails as unknown as Record<string, unknown>);
      lastPersistedGuestDetailsRef.current = guestDetailsSignature;
      const savedGuestResponse = asRecord(await ItineraryService.getHotelBlockGuestDetails(itinerary.planId));
      const savedGuest = asRecord(savedGuestResponse.guest || savedGuestResponse.data || savedGuestResponse);
      if (Object.keys(savedGuest).length > 0) {
        setGuestDetails((previous) => ({ ...previous, ...savedGuest } as GuestDetails));
      }
      toast.success("Guest details saved.");
      return true;
    } catch (error) {
      toast.error(getSafeErrorMessage(error, "Please complete the required guest details."));
      return false;
    }
  };

  const holdHotel = async (
    hotelDetailsIds: readonly number[],
    hotelierContact?: { name: string; phone: string },
  ): Promise<boolean> => {
    if (!itinerary?.planId) {
      throw new Error("Plan ID not found.");
    }
    const groupType = Number(activeHotelGroupType || hotelDetails?.hotelTabs?.[0]?.groupType || 0);
    const selectionIds = Array.from(new Set(hotelDetailsIds.map(Number).filter((id) => Number.isInteger(id) && id > 0)));
    if (!groupType || selectionIds.length === 0) {
      throw new Error("The selected hotel stay could not be identified. Refresh the itinerary and try again.");
    }
    const scopedSelectedHotels = Object.values(selectedHotelBookings).filter((hotel) => {
      const ids = resolveSelectedHotelDetailsIds(hotel);
      return ids.some((id) => selectionIds.includes(id));
    });
    const policyHotelSelections = scopedSelectedHotels.length > 0
      ? scopedSelectedHotels
      : (hotelRows || []).filter((hotel) => resolveHotelDetailsIdsFromRows(hotel, hotelRows || []).some((id) => selectionIds.includes(id)));
    const policyHotels = policyHotelSelections.map((hotel) => {
      const hotelIds = resolveSelectedHotelDetailsIds(hotel);
      const matchingRow = (hotelRows || []).find((row) => {
        const rowIds = resolveHotelDetailsIdsFromRows(row, hotelRows || []);
        return hotelIds.length > 0 && rowIds.some((id) => hotelIds.includes(id));
      });
      return { selection: hotel, persistedStay: matchingRow };
    });
    for (const { selection, persistedStay } of policyHotels) {
      const checkIn = resolveHotelHoldCheckInDate(selection, persistedStay);
      const policy = asRecord(await ItineraryService.getHotelHoldPolicy(checkIn));
      if (policy.allowed !== true) {
        throw new Error(`HOTEL_HOLD_NOT_ALLOWED: ${String(policy.reason || "A temporary hold is not available for this stay. Immediate payment is required.")}`);
      }
    }
    const selectedScopedIds = new Set(scopedSelectedHotels.flatMap(resolveSelectedHotelDetailsIds));
    const scopedPersistedHotels = (hotelRows || []).filter((hotel) => {
      const ids = resolveHotelDetailsIdsFromRows(hotel, hotelRows || []);
      return ids.some((id) => selectionIds.includes(id) && !selectedScopedIds.has(id));
    });
    const tboHoldBookings = buildTboHoldBookings([
      ...scopedSelectedHotels,
      ...scopedPersistedHotels,
    ]);
    const alreadyHeld = Object.values(selectedHotelBookings).some((hotel) => {
      const ids = resolveSelectedHotelDetailsIds(hotel);
      return ids.some((id) => selectionIds.includes(id)) && hasActiveSupplierHold(hotel);
    });
    if (alreadyHeld) {
      await persistGuestDetailsAfterHold();
      await refreshHoldRequests();
      toast.success("This VSR hotel hold is already active.");
      return true;
    }
    try {
      const response = asRecord(await ItineraryService.holdHotelGroup({
        itineraryPlanId: itinerary.planId,
        groupType,
        hotelDetailsIds: selectionIds,
        ...(hotelierContact ? { hotelierContact } : {}),
        ...(tboHoldBookings.length > 0 ? { tboHoldBookings } : {}),
        guest: {
          name: guestDetails.name,
          email: guestDetails.emailId,
          phone: guestDetails.contactNo,
        },
      }));
      const outcomes = Array.isArray(response.outcomes) ? response.outcomes as Array<Record<string, unknown>> : [];
      const failedOutcome = outcomes.find((outcome) => outcome.success !== true);
      if (failedOutcome) {
        throw new Error(String(failedOutcome.message || "The selected hotel stay could not be held."));
      }
      await persistGuestDetailsAfterHold();
      await refreshHoldRequests();
      return true;
    } catch (error) {
      throw new Error(getSafeErrorMessage(error, "Unable to send the hotel hold request."));
    }
  };

  const resendHotelHold = async (requestId: number): Promise<boolean> => {
    if (!requestId) throw new Error("The hotel hold request could not be identified.");
    try {
      await ItineraryService.resendHotelBlockEmail(requestId);
      await refreshHoldRequests();
      return true;
    } catch (error) {
      throw new Error(getSafeErrorMessage(error, "Unable to resend the hotel hold request."));
    }
  };

  return { openConfirmQuotationModal, holdHotels, holdHotel, resendHotelHold, saveGuestDetails, refreshHoldRequests };
}
