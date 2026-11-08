




/* eslint-disable @typescript-eslint/no-explicit-any, no-irregular-whitespace */
import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { getToken } from "@/lib/api";
import { ItineraryService } from "@/services/itinerary";
import { AgentOption, fetchAgents } from "@/services/accountsManagerApi";
import {
  fetchItineraryTypes,
  fetchTravelTypes,
  fetchEntryTicketOptions,
  fetchGuideOptions,
  fetchNationalities,
  fetchFoodPreferences,
  fetchMealPlans,
fetchEligibleVehicleTypes,
fetchVehicleTypes,
fetchHotelCategories,
fetchHotelFacilities,
  LocationOption,
  MealPlanOption,
  SimpleOption,
} from "@/services/itineraryDropdownsMock";

import { locationsApi } from "@/services/locations";
import { ItineraryPlanBlock } from "./TravelExpertItineraryPlanBlock";
import { RouteDetailsBlock } from "./TravelExpertRouteDetailsBlock";
import { VehicleBlock } from "./TravelExpertVehicleBlock";
import { ViaRouteDialog } from "./ViaRouteDialog";
import { DefaultRoutesSuggestions, RouteData } from "@/components/DefaultRoutesSuggestions";
import { ArrivalHotelDecisionModal } from "@/components/hotels/ArrivalHotelDecisionModal";
import { useToast } from "@/components/ui/use-toast";
import { ToastAction } from "@/components/ui/toast";
import { HotelArrivalPolicyRequest } from "@/services/itinerary";
import {
  resendPartnerActivation,
  type PendingNewAgentInput,
} from "@/services/auth";

import {
  toDDMMYYYY,
  toISOFromDDMMYYYY,
  toISOFromDDMMYYYYAndTime,
  splitViaString,
  calculateNights,
} from "./helpers/itineraryUtils";
import { SaveRouteConfirmDialog } from "./helpers/SaveRouteConfirmDialog";
import {
  getLoggedInUserContext,
  getVehiclePaxValidationError,
  getVehicleTypeIdsFromOptions,
  buildVehicleRouteLocationPayload,
  buildRoomsFromTravellers,
  buildRoomsFromPlanSummary,
  calculateDaysBetweenDates,
  addDaysToDDMMYYYY,
  resolveMealPlanCodeFromPlan,
  getTravellerCountsFromRooms,
  getTotalTravellingPaxFromCounts,
  resolveFirstNonEmptyNumberList,
  resolveFirstNonEmptyStringList,
  safeDateFromISO,
  safeTimeFromISO,
  DEFAULT_ITINERARY_START_TIME,
  DEFAULT_ITINERARY_END_TIME,
} from "./helpers/createItinerary.utils";
import type { VehicleRow } from "./helpers/createItinerary.utils";
import { useCreateItinerarySave } from "./helpers/useCreateItinerarySave";
import { useCreateItineraryRouteSave } from "./helpers/useCreateItineraryRouteSave";
import { CreateItineraryView } from "./helpers/TravelExpertCreateItineraryView";
import { useCreateItineraryEffects } from "./helpers/useTravelExpertCreateItineraryEffects";
import {
  requiresTransportEarlyArrivalPreference,
  TRANSPORT_DEFAULT_HOTEL_REST_MINUTES,
  type TransportEarlyArrivalOption,
} from "./helpers/transportEarlyArrival";

import {
  getUnresolvedChildExtraBedOccupancyRooms,
  useRoomsAndTravellers,
  type RoomRow as TravellerRoomRow,
} from "./helpers/useRoomsAndTravellers";
import { useItineraryRoutes, RouteRow } from "./helpers/useItineraryRoutes";
import {
  getEstimatedSaveMs,
  FINAL_ITINERARY_LOADING_MESSAGES,
} from "./helpers/saveProgress.constants";
import { USER_ROLES } from "@/constants/systemRoles";
import {
  getEffectiveItineraryPreference,
  isVehicleAgentRole,
  isVehicleAgentUser,
} from "@/services/vehicleAgentPolicy";
import { getVisibleAgentOptions } from "./agentOptionVisibility";
import { normalizeCalendarLocationNames } from "./helpers/calendarEvents.utils";

// ----------------- types -----------------

type ValidationErrors = {
  [key: string]: string;
};

// ----------------- main component ------------

async function fetchStoredSourceLocations(): Promise<LocationOption[]> {
  const data = await locationsApi.dropdowns({
    itineraryMode: true,
    type: "source",
  });

  return (data?.sources || []).map((name, index) => ({
    id: index + 1,
    name: String(name).trim(),
  }));
}

type InlineDraftApi = {
  validate: () => boolean;
  buildPayload: () => any;
  getPrefill: () => any;
};

type CreateItineraryProps = {
  pageMode?: "create-itinerary" | "smart-booking";
  embeddedDraft?: boolean;
  draftId?: number;
  initialDraft?: any;
  registerDraft?: (
    draftId: number,
    api: InlineDraftApi | null,
  ) => void;
  onRemoveDraft?: () => void;
};

export const CreateItinerary = ({
  pageMode = "create-itinerary",
  embeddedDraft = false,
  draftId,
  initialDraft,
  registerDraft,
  onRemoveDraft,
}: CreateItineraryProps) => {
 const [searchParams] = useSearchParams();
const id = searchParams.get("id");
const continueFrom = searchParams.get("continueFrom");
const isAddRouteContinuation = searchParams.get("addRoute") === "1";
const navigate = useNavigate();
const { toast } = useToast();

const itineraryPlanId =
  !embeddedDraft && id && !Number.isNaN(Number(id))
    ? Number(id)
    : null;

const continueFromPlanId =
  !embeddedDraft &&
  !itineraryPlanId &&
  continueFrom &&
  !Number.isNaN(Number(continueFrom))
    ? Number(continueFrom)
    : null;
  /* =====================================================
     SMART BOOKING EXACT SUMMARY TO ROOMS

     Preserve Smart Booking counts exactly.
     Extra Beds are NOT pax.
     ===================================================== */
  function buildSmartBookingRooms(
    summary: any,
  ): TravellerRoomRow[] {
    const count = (
      value: unknown,
      minimum = 0,
    ) => {
      const parsed = Math.floor(
        Number(value),
      );

      return Number.isFinite(parsed)
        ? Math.max(minimum, parsed)
        : minimum;
    };

    const roomCount =
      count(summary?.rooms, 1);

    const totalAdults =
      count(summary?.adults);

    const childrenWithBed =
      count(summary?.childWithBed);

    const childrenWithoutBed =
      count(summary?.childWithoutBed);

    const totalInfants =
      count(summary?.infants);

    const totalExtraBeds =
      count(summary?.extraBeds);

    const nextRooms:
      TravellerRoomRow[] =
      Array.from(
        { length: roomCount },
        (_, index) => ({
          id: index + 1,
          roomCount: 1,
          adults: 0,
          children: 0,
          infants: 0,
          extraBeds: 0,
          childrenDetails: [],
        }),
      );

    for (
      let index = 0;
      index < totalAdults;
      index += 1
    ) {
      nextRooms[
        index % roomCount
      ].adults += 1;
    }

    let childIndex = 0;

    const addChildren = (
      total: number,
      bedType:
        | "With Bed"
        | "Without Bed",
    ) => {
      for (
        let index = 0;
        index < total;
        index += 1
      ) {
        const room =
          nextRooms[
            childIndex %
              roomCount
          ];

        room.children += 1;

        room.childrenDetails.push({
          age: "",
          bedType,
        });

        childIndex += 1;
      }
    };

    addChildren(
      childrenWithBed,
      "With Bed",
    );

    addChildren(
      childrenWithoutBed,
      "Without Bed",
    );

    for (
      let index = 0;
      index < totalInfants;
      index += 1
    ) {
      nextRooms[
        index % roomCount
      ].infants += 1;
    }

    for (
      let index = 0;
      index < totalExtraBeds;
      index += 1
    ) {
      nextRooms[
        index % roomCount
      ].extraBeds += 1;
    }

    return nextRooms;
  }
  const loggedInUser = getLoggedInUserContext();
  const isVehicleAgentLogin = isVehicleAgentUser(loggedInUser as any);
  const isAgentLogin = loggedInUser.role === USER_ROLES.AGENT || isVehicleAgentLogin;
  const loggedInAgentId = loggedInUser.agentId;

  // agents / dropdown data
  const [agents, setAgents] = useState<AgentOption[]>([]);
  const [locations, setLocations] = useState<LocationOption[]>([]);
  const [itineraryTypes, setItineraryTypes] = useState<SimpleOption[]>([]);
  const [travelTypes, setTravelTypes] = useState<SimpleOption[]>([]);
  const [entryTicketOptions, setEntryTicketOptions] = useState<SimpleOption[]>([]);
  const [guideOptions, setGuideOptions] = useState<SimpleOption[]>([]);
  const [nationalities, setNationalities] = useState<SimpleOption[]>([]);
  const [foodPreferences, setFoodPreferences] = useState<SimpleOption[]>([]);
  const [mealPlanOptions, setMealPlanOptions] = useState<MealPlanOption[]>([]);
  const [vehicleTypes, setVehicleTypes] = useState<SimpleOption[]>([]);
  const [selectedVehicleIds, setSelectedVehicleIds] = useState<string[]>([]);
  const [eligibleVehicleTypeIds, setEligibleVehicleTypeIds] = useState<string[]>([]);
  const [hotelCategoryOptions, setHotelCategoryOptions] = useState<SimpleOption[]>([]);
  const [hotelFacilityOptions, setHotelFacilityOptions] = useState<SimpleOption[]>([]);

  // header selections
  const [itineraryPreference, setItineraryPreference] = useState<"vehicle" | "hotel" | "both">(
    "both"
  );
  const effectiveItineraryPreference = getEffectiveItineraryPreference(
    loggedInUser as any,
    itineraryPreference,
  );
  const setItineraryPreferenceForRole = (value: "vehicle" | "hotel" | "both") => {
    if (!isVehicleAgentLogin) setItineraryPreference(value);
  };

  // DVI_TRAVEL_EXPERT_PREFERENCE_SYNC_V3
useEffect(() => {
  const onPreferenceChange = (event: Event) => {
      const value = (event as CustomEvent<string>).detail;
      if (value === "vehicle" || value === "hotel" || value === "both") {
        setItineraryPreferenceForRole(value);
      }
    };
    window.addEventListener("dvi-travel-expert-preference", onPreferenceChange);
    return () => window.removeEventListener("dvi-travel-expert-preference", onPreferenceChange);
  }, [isVehicleAgentLogin]);

useEffect(() => {
  const requested = searchParams.get("dviPreference");
    if (requested === "vehicle" || requested === "hotel" || requested === "both") {
      setItineraryPreferenceForRole(requested);
    }
  }, [searchParams, isVehicleAgentLogin]);

useEffect(() => {
  window.dispatchEvent(
    new CustomEvent("dvi-travel-expert-preference-state", {
        detail: effectiveItineraryPreference,
      })
    );
  }, [effectiveItineraryPreference]);

  useEffect(() => {
    if (isVehicleAgentLogin && itineraryPreference !== "vehicle") {
      setItineraryPreference("vehicle");
    }
  }, [isVehicleAgentLogin, itineraryPreference]);
  const [agentId, setAgentId] = useState<number | null>(null);

const [pendingNewAgent, setPendingNewAgent] =
  useState<PendingNewAgentInput | null>(null);

const handleActivationEmailFailure = (
  email: string,
) => {
  const normalizedEmail =
    String(email || "")
      .trim()
      .toLowerCase();

  toast({
    title: "Itinerary created successfully.",
    description:
      "Partner account was created, but the activation email could not be sent.",
    action: (
      <ToastAction
        altText="Resend Activation Email"
        onClick={() => {
          void resendPartnerActivation(
            normalizedEmail,
          )
            .then(() => {
              toast({
                title: "Activation email sent",
                description:
                  "A new Partner Activation email has been sent to the Partner.",
              });
            })
            .catch((error: any) => {
              toast({
                title:
                  "Activation email could not be sent",
                description:
                  error?.message ||
                  "Please try resending the activation email again.",
                variant: "destructive",
              });
            });
        }}
      >
        Resend Activation Email
      </ToastAction>
    ),
  });
};

const visibleAgents = useMemo(
  () =>
    getVisibleAgentOptions(
      agents,
      effectiveItineraryPreference,
      isAgentLogin,
      loggedInAgentId,
    ),
  [
    agents,
    effectiveItineraryPreference,
    isAgentLogin,
    loggedInAgentId,
  ],
);
  useEffect(() => {
    if (effectiveItineraryPreference === "vehicle" || !agentId) return;
    const selectedAgent = agents.find((agent) => Number(agent.id) === Number(agentId));
    if (selectedAgent && isVehicleAgentRole(selectedAgent.roleID)) {
      setAgentId(null);
    }
  }, [agentId, agents, effectiveItineraryPreference]);

  const [arrivalLocation, setArrivalLocation] = useState("");
  const [departureLocation, setDepartureLocation] = useState("");

  const [itineraryTypeSelect, setItineraryTypeSelect] = useState("");
  const [arrivalType, setArrivalType] = useState("");
  const [departureType, setDepartureType] = useState("");
  const [entryTicketRequired, setEntryTicketRequired] = useState("");
  const [guideRequired, setGuideRequired] = useState("");
  const [nationality, setNationality] = useState("");
  const [foodPreference, setFoodPreference] = useState(""); // ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¦ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã¢â‚¬Å“ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¦ store option id string
  const [mealPlanCode, setMealPlanCode] = useState<string>("CP");

  const [tripStartDate, setTripStartDate] = useState<string>("");
const [tripEndDate, setTripEndDate] = useState<string>("");

// Previous itinerary used when the user clicks Continue Planning.
const [continuationSource, setContinuationSource] = useState<any | null>(null);

// ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¦ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã¢â‚¬Å“ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¦ Start/End time used to build trip_start_date and trip_end_date payload
const [startTime, setStartTime] = useState<string>(DEFAULT_ITINERARY_START_TIME);
const [endTime, setEndTime] = useState<string>(DEFAULT_ITINERARY_END_TIME);

  const [transportEarlyArrivalOption, setTransportEarlyArrivalOption] =
    useState<TransportEarlyArrivalOption | "">("");
const [transportOvernightLocationName, setTransportOvernightLocationName] =
  useState("");

const [transportEarlyArrivalHotelName, setTransportEarlyArrivalHotelName] =
  useState("");
const [transportEarlyArrivalLocationName, setTransportEarlyArrivalLocationName] =
  useState("");
const [transportEarlyArrivalRestMinutes, setTransportEarlyArrivalRestMinutes] =
  useState<number>(TRANSPORT_DEFAULT_HOTEL_REST_MINUTES);

  const needsTransportEarlyArrivalPreference = useMemo(
    () => requiresTransportEarlyArrivalPreference(effectiveItineraryPreference, startTime),
    [effectiveItineraryPreference, startTime],
  );

  useEffect(() => {
    if (!needsTransportEarlyArrivalPreference) {
   setTransportEarlyArrivalOption("");
setTransportEarlyArrivalHotelName("");
setTransportEarlyArrivalLocationName("");
setTransportEarlyArrivalRestMinutes(TRANSPORT_DEFAULT_HOTEL_REST_MINUTES);
    }
  }, [needsTransportEarlyArrivalPreference]);

  // Special instructions (goes in payload)
  const [specialInstructions, setSpecialInstructions] = useState<string>("");

  // hotel categories (required for hotel/both)
  const [selectedHotelCategoryIds, setSelectedHotelCategoryIds] = useState<number[]>([]);
  const [selectedHotelFacilityIds, setSelectedHotelFacilityIds] = useState<string[]>([]);

  // rooms + travellers hook
  const {
    rooms,
    setRooms,
    addRoom,
    removeRoom,
    buildTravellers,
    defaultRoomTemplate,
    setDefaultRoomTemplate,
  } = useRoomsAndTravellers();

  const travellerCounts = useMemo(
    () => getTravellerCountsFromRooms(rooms),
    [rooms]
  );

  const totalTravellingPax = useMemo(
    () => getTotalTravellingPaxFromCounts(travellerCounts),
    [travellerCounts]
  );

  // vehicles
  const [vehicles, setVehicles] = useState<VehicleRow[]>([
    { id: 1, type: "", count: 1 },
  ]);

  const vehiclePaxValidationError = useMemo(
    () =>
      getVehiclePaxValidationError({
        vehicles,
        vehicleTypes,
        eligibleVehicleTypeIds,
        totalTravellingPax,
      }),
    [vehicles, vehicleTypes, eligibleVehicleTypeIds, totalTravellingPax]
  );

  const [budget, setBudget] = useState<number | "">("");
  const [templateAppliedKey, setTemplateAppliedKey] = useState<string>("");

  const [inlineRouteStarts, setInlineRouteStarts] = useState<number[]>([0]);

// routes + via routes hook
        const {
    routeDetails,
    setRouteDetails,
    viaDialogOpen,
    viaRoutes,
    viaRoutesLoading,
    activeViaRouteRow,
    activeViaRouteIds,
    openViaRoutes,
    handleViaDialogSubmit,
    handleViaDialogOpenChange,
    refreshRouteDistance,
    isViaRouteDisabled,
} = useItineraryRoutes({
  tripStartDate,
  tripEndDate,
  startTime,
  arrivalLocation,
  departureLocation,
  itineraryPlanId:
    embeddedDraft && initialDraft?.savedLeg?.plan
      ? Number(initialDraft.savedLeg.plan.itinerary_plan_ID)
      : itineraryPlanId,
  toast,
});
  // DVI_TE_SOURCE_SYNC_OCT30
  // Only Travel Expert: link daily sources to previous destinations.
  useEffect(() => {
    setRouteDetails((previous) => {
      let changed = false;

      const updated = previous.map((row, index) => {
        const expectedSource =
          index === 0
            ? arrivalLocation.trim()
            : String(previous[index - 1]?.next || "").trim();

        if (row.source === expectedSource) return row;

        changed = true;

        return {
          ...row,
          source: expectedSource,
          itinerary_route_id: undefined,
          via: "",
          via_routes: [],
          no_of_km: 0,
          directVisit: "No" as const,
        };
      });

      return changed ? updated : previous;
    });
  }, [arrivalLocation, routeDetails, setRouteDetails]);
  const calendarLocationNames = useMemo(
    () => normalizeCalendarLocationNames([
      arrivalLocation,
      departureLocation,
      ...routeDetails.flatMap((route) => [route.source, route.next]),
    ]),
    [arrivalLocation, departureLocation, routeDetails],
  );
  const [loading, setLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveErrorMessage, setSaveErrorMessage] = useState<string | null>(null);

  const [showRouteConfirm, setShowRouteConfirm] = useState(false);
  const [pendingPayload, setPendingPayload] = useState<any | null>(null);
  const [saveProgressPercent, setSaveProgressPercent] = useState(0);
  const [activeSaveType, setActiveSaveType] = useState<
    "itineary_basic_info" | "itineary_basic_info_with_optimized_route" | null
  >(null);
    const [estimatedSaveMs, setEstimatedSaveMs] = useState(0);
  const [transportLoadingMessageIndex, setTransportLoadingMessageIndex] = useState(0);
  const [isResolvingArrivalPolicy, setIsResolvingArrivalPolicy] = useState(false);
  const [lastArrivalPolicyDecisionKey, setLastArrivalPolicyDecisionKey] = useState<string | null>(null);
  const [arrivalPolicyDecision, setArrivalPolicyDecision] = useState<{
    previousDayBillingDecisionProvided: boolean;
    previousDayBillingConfirmed: boolean;
  }>({
    previousDayBillingDecisionProvided: false,
    previousDayBillingConfirmed: false,
  });
  const arrivalPolicyDecisionRef = useRef<{
    previousDayBillingDecisionProvided: boolean;
    previousDayBillingConfirmed: boolean;
  }>({
    previousDayBillingDecisionProvided: false,
    previousDayBillingConfirmed: false,
  });
  const [arrivalPolicyModal, setArrivalPolicyModal] = useState<{
    open: boolean;
    arrivalDate: string;
    previousDayDate: string;
    request: HotelArrivalPolicyRequest | null;
  }>({
    open: false,
    arrivalDate: "",
    previousDayDate: "",
    request: null,
  });

  // Route suggestions modal
  const [showDefaultRouteSuggestions, setShowDefaultRouteSuggestions] =
  useState(false);
const defaultRouteWarningShownRef = useRef(false);

// ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¦ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã¢â‚¬Å“ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¦ Prevent old vehicle-type API responses from clearing latest Customize route result
const vehicleTypeRequestRef = useRef(0);

const saveProgressTimerRef = useRef<number | null>(null);

  const applyArrivalPolicyDecision = (decision: {
    previousDayBillingDecisionProvided: boolean;
    previousDayBillingConfirmed: boolean;
  }) => {
    arrivalPolicyDecisionRef.current = decision;
    setArrivalPolicyDecision(decision);
  };

    const [validationErrors, setValidationErrors] = useState<ValidationErrors>({});

const [suggestedDefaultRoutes, setSuggestedDefaultRoutes] = useState<RouteData[]>([]);
const [activeDefaultRouteIndex, setActiveDefaultRouteIndex] = useState(0);

const normalizeMainLocation = (value: string) =>
  String(value || "").trim().toLowerCase();

const resetEditRouteDetails = (
  nextArrivalLocation: string,
  nextDepartureLocation: string
) => {
  setRouteDetails((prev) => {
    const totalDays =
      tripStartDate && tripEndDate
        ? calculateDaysBetweenDates(tripStartDate, tripEndDate)
        : Math.max(1, prev.length);

    return Array.from({ length: totalDays }, (_, index): RouteRow => ({
      id: index + 1,
      itinerary_route_id: undefined,
      day: index + 1,
      date: tripStartDate
        ? addDaysToDDMMYYYY(tripStartDate, index)
        : prev[index]?.date || "",
      source: index === 0 ? nextArrivalLocation : "",
      next: index === totalDays - 1 ? nextDepartureLocation : "",
      via: "",
      via_routes: [],
      no_of_km: 0,
      directVisit: "No",
    }));
  });

  handleViaDialogOpenChange(false);
  vehicleTypeRequestRef.current += 1;
  setSuggestedDefaultRoutes([]);
  setActiveDefaultRouteIndex(0);
  setTemplateAppliedKey("");
  setPendingPayload(null);
  setShowRouteConfirm(false);
  setSaveErrorMessage(null);

  setValidationErrors((prev) => {
    if (!prev.firstRouteSource && !prev.firstRouteNext) return prev;

    const next = { ...prev };
    delete next.firstRouteSource;
    delete next.firstRouteNext;
    return next;
  });
};

const handleArrivalLocationChange = (value: string) => {
  const nextArrivalLocation = String(value || "");
  const hasChanged =
    normalizeMainLocation(nextArrivalLocation) !==
    normalizeMainLocation(arrivalLocation);

  setArrivalLocation(nextArrivalLocation);

  if (itineraryPlanId && hasChanged) {
    resetEditRouteDetails(nextArrivalLocation, departureLocation);
  }
};

const handleDepartureLocationChange = (value: string) => {
  const nextDepartureLocation = String(value || "");
  const hasChanged =
    normalizeMainLocation(nextDepartureLocation) !==
    normalizeMainLocation(departureLocation);

  setDepartureLocation(nextDepartureLocation);

  if (itineraryPlanId && hasChanged) {
    resetEditRouteDetails(arrivalLocation, nextDepartureLocation);
  }
};

  useEffect(() => {
    if (!itineraryPlanId && isAgentLogin && loggedInAgentId) {
      setAgentId(loggedInAgentId);
    }
  }, [itineraryPlanId, isAgentLogin, loggedInAgentId]);
  /* =========================================================
     SMART BOOKING CREATE-ITINERARY HANDOFF
     Selected Smart Routes are imported into the EXISTING
     Suggested Routes save pipeline.
     ========================================================= */
  const [
    smartBookingImportedRoutes,
    setSmartBookingImportedRoutes,
  ] = useState<any[]>([]);

  const smartBookingHandoffAppliedRef =
    useRef(false);

  const [
    smartBookingAutoSaveRequested,
    setSmartBookingAutoSaveRequested,
  ] = useState(false);

  const smartBookingAutoSaveStartedRef =
    useRef(false);

  const smartBookingAutoSaveConfirmedRef =
    useRef(false);

  useEffect(() => {
    if (
      itineraryPlanId ||
      smartBookingHandoffAppliedRef.current
    ) {
      return;
    }

    const params =
      new URLSearchParams(
        window.location.search,
      );

    if (
      params.get("from") !==
      "smart-booking"
    ) {
      return;
    }

    const raw =
      sessionStorage.getItem(
        "dvi-smart-booking-create-itinerary",
      );

    if (!raw) {
      return;
    }

    try {
      const handoff =
        JSON.parse(raw);

      /* SMART BOOKING APPLY BOOKING SUMMARY */
      let importedBookingSummary =
        handoff?.bookingSummary &&
        typeof handoff.bookingSummary === "object"
          ? handoff.bookingSummary
          : null;

      if (!importedBookingSummary) {
        try {
          const storedSummary =
            sessionStorage.getItem(
              "dvi-smart-booking-booking-summary",
            );

          importedBookingSummary =
            storedSummary
              ? JSON.parse(
                  storedSummary,
                )
              : null;
        } catch {
          importedBookingSummary =
            null;
        }
      }

      if (
        importedBookingSummary &&
        typeof importedBookingSummary === "object"
      ) {
        setRooms(
          buildSmartBookingRooms(
            importedBookingSummary,
          ),
        );
      }

      setSmartBookingAutoSaveRequested(
        handoff?.autoSaveRequested === true,
      );

      const routes =
        Array.isArray(handoff?.routes)
          ? handoff.routes
              .slice(0, 4)
              .map(
                (
                  route: any,
                  routeIndex: number,
                ): RouteData => ({
                  routeId:
                    Number(
                      route?.routeId,
                    ) ||
                    routeIndex + 1,

                  routeName:
                    String(
                      route?.routeName ||
                        `Smart Route ${routeIndex + 1}`,
                    ),

                  noOfDays:
                    Math.max(
                      1,
                      Number(
                        route?.noOfDays ||
                          route?.days?.length ||
                          1,
                      ),
                    ),

                  days:
                    (
                      Array.isArray(
                        route?.days,
                      )
                        ? route.days
                        : []
                    ).map(
                      (
                        day: any,
                        dayIndex: number,
                      ) => ({
                        dayNo:
                          Number(
                            day?.dayNo ??
                              day?.day ??
                              dayIndex + 1,
                          ) ||
                          dayIndex + 1,

                        date:
                          normalizeSmartBookingDisplayDate(
                            day?.date ??
                              day?.itinerary_route_date ??
                              "",
                          ),

                        sourceLocation:
                          String(
                            day?.sourceLocation ??
                              day?.source ??
                              "",
                          ),

                        nextLocation:
                          String(
                            day?.nextLocation ??
                              day?.next ??
                              "",
                          ),

                        viaRoute:
                          String(
                            day?.viaRoute ??
                              day?.via ??
                              "",
                          ),

                        directVisit:
                          day?.directVisit ===
                            true ||
                          day?.directVisit ===
                            1 ||
                          String(
                            day?.directVisit ??
                              "",
                          )
                            .toLowerCase()
                            .trim() ===
                            "yes",
                      }),
                    ),
                }),
              )
          : [];

      if (routes.length === 0) {
        return;
      }

      smartBookingHandoffAppliedRef.current =
        true;

      /*
        Backend convention:
        itinerary type 1 = Suggested Routes.
      */
      setItineraryTypeSelect("1");

      if (handoff?.arrival) {
        setArrivalLocation(
          String(
            handoff.arrival,
          ),
        );
      }

      if (handoff?.departure) {
        setDepartureLocation(
          String(
            handoff.departure,
          ),
        );
      }

      if (
        handoff?.agentId &&
        !isAgentLogin
      ) {
        setAgentId(
          Number(
            handoff.agentId,
          ),
        );
      }

      /*
        Smart Booking hands the preference across page
        navigation.

        Never coerce the current string values with Number():
        Number("vehicle") is NaN and previously left Create
        Itinerary on its default "both" preference, which
        incorrectly enabled Hotel room validation.

        Support both current string values and legacy numeric
        values.
      */
      const importedItineraryPreference =
        normalizeSmartBookingItineraryPreference(
          handoff
            ?.itineraryPreference,
        );

      if (
        !isVehicleAgentLogin &&
        importedItineraryPreference
      ) {
        setItineraryPreference(
          importedItineraryPreference,
        );
      }

      if (
        handoff?.tripStartDate
      ) {
        setTripStartDate(
          String(
            handoff.tripStartDate,
          ),
        );
      }

      if (
        handoff?.tripEndDate
      ) {
        setTripEndDate(
          String(
            handoff.tripEndDate,
          ),
        );
      }

      /*
        Vehicle-only itineraries have passengers, not hotel
        room/category requirements.

        The synthetic traveller rows imported above remain
        available for Total Pax / vehicle-capacity logic, but
        Hotel-specific selections must not be carried into a
        Vehicle-only Create Itinerary.
      */
      if (
        isVehicleAgentLogin ||
        importedItineraryPreference ===
          "vehicle"
      ) {
        setSelectedHotelCategoryIds(
          [],
        );
      } else if (
        Array.isArray(
          handoff
            ?.hotelCategoryIds,
        )
      ) {
        setSelectedHotelCategoryIds(
          handoff
            .hotelCategoryIds
            .map(Number)
            .filter(
              (value: number) =>
                Number.isFinite(
                  value,
                ) &&
                value > 0,
            )
            .slice(0, 4),
        );
      }

      /* SMART BOOKING EMPTY ROUTE GUARD */
      if (routes.length === 0) {
        setSmartBookingAutoSaveRequested(false);
        throw new Error(
          "Smart Booking handoff contains no selected routes.",
        );
      }
      setSuggestedDefaultRoutes(
        routes,
      );

      setActiveDefaultRouteIndex(
        0,
      );

      const firstRoute =
        routes[0];

      const firstRouteDetails =
        (Array.isArray(firstRoute?.days)
          ? firstRoute.days
          : []
        ).map(
          (
            day: any,
            index: number,
          ) => ({
            id: index + 1,
            day:
              Number(
                day.dayNo,
              ) ||
              index + 1,

            date:
              String(
                day.date || "",
              ),

            source:
              String(
                day.sourceLocation ||
                  "",
              ),

            next:
              String(
                day.nextLocation ||
                  "",
              ),

            via:
              String(
                day.viaRoute ||
                  "",
              ),

            via_routes: [],

            no_of_km: 0,

            directVisit:
              day.directVisit
                ? "Yes"
                : "No",
          }),
        );

      if (
        firstRouteDetails.length >
        0
      ) {
        setRouteDetails(
          firstRouteDetails,
        );
      }

      /* SMART BOOKING ROUTE DISPLAY METADATA */
      setSmartBookingImportedRoutes(
        routes.map((route: any) => {
          const routePlaces = (
            Array.isArray(route?.days)
              ? route.days
              : []
          ).reduce(
            (values: string[], day: any, dayIndex: number) => {
              const sourceName = String(
                day?.sourceLocation ||
                  day?.source ||
                  "",
              ).trim();

              const nextName = String(
                day?.nextLocation ||
                  day?.next ||
                  "",
              ).trim();

              if (
                dayIndex === 0 &&
                sourceName &&
                values[values.length - 1] !== sourceName
              ) {
                values.push(sourceName);
              }

              if (
                nextName &&
                values[values.length - 1] !== nextName
              ) {
                values.push(nextName);
              }

              return values;
            },
            [],
          );

          const displayDays = Math.max(
            Number(
              route?.noOfDays ||
                route?.days?.length ||
                1,
            ),
            1,
          );

          return {
            ...route,
            routeLabel:
              routePlaces.join(" \u2192 "),
            nights:
              Math.max(displayDays - 1, 0),
            displayDays,
          };
        }),
      );

      /*
        Handoff is only transport between pages.
        Backend remains source of persistence.
      */
      sessionStorage.removeItem(
        "dvi-smart-booking-create-itinerary",
      );

      toast({
        title:
          "Smart routes imported",
        description:
          `${routes.length} selected route${routes.length === 1 ? "" : "s"} loaded into Create Itinerary.`,
      });
    } catch (error) {
      console.error(
        "[CreateItinerary] Smart Booking handoff failed:",
        error,
      );

      toast({
        title:
          "Unable to import Smart Booking routes",
        description:
          "Please return to Smart Booking and select the routes again.",
        variant:
          "destructive",
      });
    }
  }, [
    itineraryPlanId,
    isAgentLogin,
    isVehicleAgentLogin,
  ]);
  const stopSaveProgress = () => {
    if (saveProgressTimerRef.current !== null) {
      window.clearInterval(saveProgressTimerRef.current);
      saveProgressTimerRef.current = null;
    }
  };

    const startSaveProgress = (estimatedMs: number) => {
    stopSaveProgress();
    setSaveProgressPercent(1);
    setTransportLoadingMessageIndex(0);
    const startedAt = Date.now();

    saveProgressTimerRef.current = window.setInterval(() => {
      const elapsed = Date.now() - startedAt;
      const pct = Math.floor((elapsed / Math.max(estimatedMs, 1000)) * 100);
      setSaveProgressPercent(Math.min(95, Math.max(1, pct)));

      if (FINAL_ITINERARY_LOADING_MESSAGES.length > 0) {
        setTransportLoadingMessageIndex(
          Math.floor(elapsed / 1600) % FINAL_ITINERARY_LOADING_MESSAGES.length,
        );
      }
    }, 220);
  };

const [inlineDrafts, setInlineDrafts] = useState<
  Array<{ id: number; prefill: any }>
>([]);

const [savedEditPlanIds, setSavedEditPlanIds] =
  useState<number[]>([]);

const nextDraftIdRef = useRef(1);

useCreateItineraryEffects({
  setSavedEditLegs: (savedLegs: any[]) => {
    const planIds = savedLegs.map((leg) =>
      Number(leg.plan?.itinerary_plan_ID || 0)
    );

    if (planIds.some((planId) => planId <= 0)) {
      throw new Error("Saved itinerary leg has no valid plan ID.");
    }

    setSavedEditPlanIds(planIds);

    const restoredDrafts = savedLegs.slice(1).map(
      (leg, index) => ({
        id: index + 1,
        prefill: { savedLeg: leg },
      })
    );

    nextDraftIdRef.current = restoredDrafts.length + 1;
    setInlineDrafts(restoredDrafts);
  },

  isAddRouteContinuation,
  setValidationErrors, agentId, pendingNewAgent, arrivalLocation, departureLocation, tripStartDate, tripEndDate,
  itineraryTypeSelect, arrivalType, departureType, budget, entryTicketRequired, guideRequired,
    nationality, foodPreference, itineraryPreference: effectiveItineraryPreference, selectedHotelCategoryIds, routeDetails,
    vehicles, vehiclePaxValidationError, stopSaveProgress, setLoading, isAgentLogin,
    loggedInAgentId, setAgents, setLocations, setItineraryTypes, setTravelTypes,
    setEntryTicketOptions, setGuideOptions, setNationalities, setFoodPreferences,
  setMealPlanOptions, setHotelCategoryOptions, setHotelFacilityOptions, itineraryPlanId,
continueFromPlanId,
setContinuationSource,
itineraryService: ItineraryService, setAgentId, setArrivalLocation,
setDepartureLocation, setTripStartDate, setTripEndDate, setStartTime, setEndTime,
    setLastArrivalPolicyDecisionKey,
    setBudget, setArrivalType, setDepartureType, setItineraryPreference: setItineraryPreferenceForRole,
    setItineraryTypeSelect, setEntryTicketRequired, setGuideRequired, setNationality,
    setFoodPreference, setMealPlanCode, setSpecialInstructions, setSelectedHotelCategoryIds,
     setSelectedHotelFacilityIds, setRouteDetails, setInlineRouteStarts, setVehicles, setRooms,
     setDefaultRoomTemplate,
    skipReusableRouteTemplate: searchParams.get("from") === "smart-booking",
    templateAppliedKey, setTemplateAppliedKey, toast, itineraryTypes,
    defaultRouteWarningShownRef, setShowDefaultRouteSuggestions, vehicleTypeRequestRef,
    setVehicleTypes, setSelectedVehicleIds, setEligibleVehicleTypeIds,
    travellerCounts, totalTravellingPax, fetchStoredSourceLocations,
setTransportEarlyArrivalOption, setTransportEarlyArrivalHotelName,
setTransportEarlyArrivalLocationName,
setTransportEarlyArrivalRestMinutes,
setTransportOvernightLocationName,
requiresTransportEarlyArrivalPreference: needsTransportEarlyArrivalPreference,
transportEarlyArrivalOption,
transportEarlyArrivalHotelName,
transportEarlyArrivalLocationName,
  });

  // Handler for route suggestion selection
  const handleRouteSelection = (
    routeDetails: any[],
    tabIndex: number
  ) => {
    if (Array.isArray(routeDetails) && routeDetails.length > 0) {
      setRouteDetails(
        routeDetails.map((r, idx): RouteRow => ({
          id: idx + 1,
          day: r.day || idx + 1,
          date: r.date || "",
          source: r.source || "",
          next: r.next || "",
          via: r.via || "",
          via_routes: [],
           no_of_km:
      r.no_of_km !== undefined &&
      r.no_of_km !== null &&
      String(r.no_of_km).trim() !== ""
        ? Number(r.no_of_km)
        : 0,
          directVisit: r.directVisit ? "Yes" : "No",
        }))
      );
    }
    setShowDefaultRouteSuggestions(false);
  };

   
  const addVehicle = () => {
    setVehicles((prev) => {
      const last = prev[prev.length - 1];
      return [...prev, { id: last.id + 1, type: "", count: 1 }];
    });
  };

   const removeVehicle = (idToRemove: number) => {
    setVehicles((prev) => prev.filter((v) => v.id !== idToRemove));
  };

const deleteDay = () => {
  setRouteDetails((prev) => {
    if (prev.length <= 1) return prev;

    const updated = prev
      .slice(0, -1)
      .map((row, index) => ({
        ...row,
        id: index + 1,
        day: index + 1,
        date: tripStartDate ? addDaysToDDMMYYYY(tripStartDate, index) : row.date,
      }));

    if (tripStartDate) {
      setTripEndDate(addDaysToDDMMYYYY(tripStartDate, updated.length - 1));
    }

    return updated;
  });
};

const deleteRouteDay = (deleteIdx: number) => {
  setRouteDetails((prev) => {
    const totalDays = prev.length;
    const isFirstTwoDays = deleteIdx === 0 || deleteIdx === 1;
    const isLastDay = deleteIdx === totalDays - 1;

    if (totalDays <= 3 || isFirstTwoDays || isLastDay) {
      return prev;
    }

    const updated = prev
      .filter((_, index) => index !== deleteIdx)
      .map((row, index) => ({
        ...row,
        id: index + 1,
        day: index + 1,
        date: tripStartDate ? addDaysToDDMMYYYY(tripStartDate, index) : row.date,
      }));

    if (tripStartDate && updated.length > 0) {
      setTripEndDate(addDaysToDDMMYYYY(tripStartDate, updated.length - 1));
    }

    return updated;
  });
};

const addDay = () => {
  setRouteDetails((prev) => {
    if (!prev.length) {
      const firstDate = tripStartDate || "";
      const initialRows = [
        {
          id: 1,
          day: 1,
          date: firstDate,
          source: "",
          next: "",
          via: "",
          via_routes: [],
          no_of_km: 0,
          directVisit: "No" as const,
        },
      ];

      if (tripStartDate) {
        setTripEndDate(tripStartDate);
      }

      return initialRows;
    }

    const last = prev[prev.length - 1];
    const nextDayNumber = prev.length + 1;
    const nextDate =
      tripStartDate
        ? addDaysToDDMMYYYY(tripStartDate, prev.length)
        : last.date;

    const updated = [
      ...prev,
      {




        id: nextDayNumber,
        day: nextDayNumber,




        date: nextDate,
        source: last.source,


        next: last.next,
        via: "",
        via_routes: [],
        no_of_km: 0,
        directVisit: "No" as const,
      },
    ];

    if (tripStartDate) {
      setTripEndDate(addDaysToDDMMYYYY(tripStartDate, updated.length - 1));
    }

    return updated;
  });
};
const addRouteAfterSaveRef = useRef(false);

const inlineDraftApiRef =
  useRef(new Map<number, InlineDraftApi>());

const registerInlineDraft = (
  id: number,
  api: InlineDraftApi | null,
) => {
  if (api) {
    inlineDraftApiRef.current.set(id, api);
  } else {
    inlineDraftApiRef.current.delete(id);
  }
};

const getNextLegBoundary = (
  previousEndDate: string,
  previousEndTime: string,
) => {
  const dateMatch = String(previousEndDate).trim().match(
    /^(\d{2})[/-](\d{2})[/-](\d{4})$/,
  );

  const timeMatch = String(previousEndTime).trim().match(
    /^(\d{1,2}):(\d{2})$/,
  );

  if (!dateMatch || !timeMatch) {
    return {
      minimumTripDate: "",
      minimumTripStartTime: "",
      nextStartTime: DEFAULT_ITINERARY_START_TIME,
    };
  }

  const [, day, month, year] = dateMatch;
  const [, hour, minute] = timeMatch;

  const nextStart = new Date(
    Number(year),
    Number(month) - 1,
    Number(day),
    Number(hour),
    Number(minute) + 10,
  );

  const pad = (value: number) =>
    String(value).padStart(2, "0");

  const minimumTripDate = [
    pad(nextStart.getDate()),
    pad(nextStart.getMonth() + 1),
    nextStart.getFullYear(),
  ].join("/");

  const minimumTripStartTime = [
    pad(nextStart.getHours()),
    pad(nextStart.getMinutes()),
  ].join(":");

  return {
    minimumTripDate,
    minimumTripStartTime,
    nextStartTime: minimumTripStartTime,
  };
};

const captureInlinePrefill = () => ({
  ...getNextLegBoundary(tripEndDate, endTime),
  agentId,
  pendingNewAgent: pendingNewAgent
    ? { ...pendingNewAgent }
    : null,
  itineraryPreference: effectiveItineraryPreference,
  itineraryTypeSelect,
  arrivalType,
  departureType,
  entryTicketRequired,
  guideRequired,
  nationality,
  foodPreference,
  mealPlanCode,
  budget,
  specialInstructions,

  selectedHotelCategoryIds: [...selectedHotelCategoryIds],
  selectedHotelFacilityIds: [...selectedHotelFacilityIds],

  rooms: rooms.map((room) => ({
    ...room,
    childrenDetails: (room.childrenDetails || []).map(
      (child) => ({ ...child }),
    ),
  })),

  defaultRoomTemplate: {
    ...defaultRoomTemplate,
    childrenDetails:
      (defaultRoomTemplate.childrenDetails || []).map(
        (child) => ({ ...child }),
      ),
  },

  vehicles: vehicles.map((vehicle) => ({
    ...vehicle,
    vehicle_details_id: undefined,
  })),

   endTime,
});
const handleAddInlineRoute = () => {
  if (embeddedDraft || isSaving || pageMode !== "create-itinerary") {
    return;
  }

  if (itineraryPlanId) return;

  if (
    suggestedDefaultRoutes.length &&
    isDefaultItineraryTypeSelected()
  ) {
    toast({
      title: "Add Route requires a customized itinerary",
      variant: "destructive",
    });
    return;
  }

  const last = inlineDrafts[inlineDrafts.length - 1];

  const current = last
    ? inlineDraftApiRef.current.get(last.id)
    : null;

  if (last && !current) return;

  if (!(current?.validate() ?? validateBeforeSave())) {
    return;
  }

const prefill = current
  ? current.getPrefill()
  : captureInlinePrefill();

if (
  !prefill?.minimumTripDate ||
  !prefill?.minimumTripStartTime
) {
  toast({
    title: "Complete the previous route",
    description:
      "A valid departure date and time are required before adding another route.",
    variant: "destructive",
  });
  return;
}

const newId = nextDraftIdRef.current++;

setInlineDrafts((previous) => [
  ...previous,
  { id: newId, prefill },
]);
};

// ----------------- VALIDATION -----------------

  const noOfNights = calculateNights(tripStartDate, tripEndDate);
  const noOfDays = tripStartDate && tripEndDate ? Math.max(1, noOfNights + 1) : 1;

  // DVI_TE_TOURS_OPTIMIZE_SAFE_V2: direct save callback, no save effect or popup.
  const directToursSaveRef = useRef<null | (() => void)>(null);
  const {
    validateBeforeSave,
    buildPayload,
    buildArrivalPolicyRequest,
    getArrivalPolicyDecisionKey,
    isEarlyArrivalPolicyRequest,
    openArrivalPolicyDecisionModal,
    runArrivalPolicyGate,
    continueToRouteConfirmation,
    handleSaveClick,
    handleConfirmClose,
} = useCreateItinerarySave({
  isAddRouteContinuation,
  continuationSource,
  agentId,
  pendingNewAgent,
  isAgentLogin,
  loggedInAgentId,
  arrivalLocation,
    departureLocation,
    tripStartDate,
    tripEndDate,
    itineraryTypeSelect,
    arrivalType,
    departureType,
    budget,
    entryTicketRequired,
    guideRequired,
    nationality,
    foodPreference,
    itineraryPreference: effectiveItineraryPreference,
    allowArrivalPolicyFetchFallback:
      smartBookingAutoSaveRequested &&
      !itineraryPlanId,
    selectedHotelCategoryIds,
    selectedHotelFacilityIds,
    routeDetails,
    vehicles,
    vehiclePaxValidationError,
    setValidationErrors,
    toast,
    mealPlanCode,
    foodPreferences,
    mealPlanOptions,
    startTime,
    endTime,
    noOfNights,
    noOfDays,
    specialInstructions,
itineraryPlanId,
continueFromPlanId,
buildTravellers,
arrivalPolicyDecision,
    ItineraryService,
    setArrivalPolicyModal,
    setIsResolvingArrivalPolicy,
    setShowRouteConfirm,
    directToursSaveRef,
    getUnresolvedChildExtraBedOccupancyRooms,
    rooms,
    applyArrivalPolicyDecision,
    setPendingPayload,
    lastArrivalPolicyDecisionKey,
    isSaving,
    requiresTransportEarlyArrivalPreference: needsTransportEarlyArrivalPreference,
transportEarlyArrivalOption,
transportEarlyArrivalHotelName,
transportEarlyArrivalLocationName,
transportEarlyArrivalRestMinutes,
transportOvernightLocationName,
});

// Register the independently editable form with its parent.
useEffect(() => {
  if (!embeddedDraft || !draftId || !registerDraft) return;

  registerDraft(draftId, {
    validate: validateBeforeSave,
    buildPayload,
    getPrefill: captureInlinePrefill,
  });

  return () => registerDraft(draftId, null);
});

const initializedDraftRef = useRef(false);

useEffect(() => {
  if (
    !embeddedDraft ||
    !initialDraft ||
    initializedDraftRef.current
  ) {
    return;
  }

initializedDraftRef.current = true;

// Restore an existing itinerary leg into its own editable form.
if (initialDraft.savedLeg?.plan) {
  const saved = initialDraft.savedLeg;
  const p = saved.plan;

  setAgentId(p.agent_id ?? null);
  setPendingNewAgent(null);

  const preference =
    Number(p.itinerary_preference) === 2
      ? "vehicle"
      : Number(p.itinerary_preference) === 1
        ? "hotel"
        : "both";

  setItineraryPreferenceForRole(preference);

  setItineraryTypeSelect(String(p.itinerary_type ?? ""));
  setArrivalType(String(p.arrival_type ?? ""));
  setDepartureType(String(p.departure_type ?? ""));
  setEntryTicketRequired(String(p.entry_ticket_required ?? ""));
  setGuideRequired(String(p.guide_for_itinerary ?? ""));
  setNationality(String(p.nationality ?? ""));
  setFoodPreference(String(p.food_type ?? ""));

  setMealPlanCode(
    resolveMealPlanCodeFromPlan(p, mealPlanOptions)
  );

  setBudget(p.expecting_budget ?? "");
  setSpecialInstructions(p.special_instructions ?? "");

  setSelectedHotelCategoryIds(
    resolveFirstNonEmptyNumberList(
      p.preferred_hotel_category,
      p.preferredHotelCategory,
      saved.preferred_hotel_category,
      saved.preferredHotelCategory
    )
  );

  setSelectedHotelFacilityIds(
    resolveFirstNonEmptyStringList(
      p.hotel_facilities,
      p.hotelFacilities,
      saved.hotel_facilities,
      saved.hotelFacilities
    )
  );

  // Restore this leg's own arrival/departure details.
  setArrivalLocation(String(p.arrival_location ?? ""));
  setDepartureLocation(String(p.departure_location ?? ""));

  setTripStartDate(
    p.trip_start_date_and_time
      ? safeDateFromISO(p.trip_start_date_and_time)
      : ""
  );

  setTripEndDate(
    p.trip_end_date_and_time
      ? safeDateFromISO(p.trip_end_date_and_time)
      : ""
  );

  setStartTime(
    safeTimeFromISO(
      p.trip_start_date_and_time,
      DEFAULT_ITINERARY_START_TIME
    )
  );

  setEndTime(
    safeTimeFromISO(
      p.trip_end_date_and_time,
      DEFAULT_ITINERARY_END_TIME
    )
  );

  // Restore passenger counts and room allocation.
  const savedRooms =
    Array.isArray(saved.travellers) && saved.travellers.length
      ? buildRoomsFromTravellers(saved.travellers)
      : buildRoomsFromPlanSummary(p);

  setRooms(savedRooms);

  // Restore this leg's own vehicles.
  setVehicles(
    Array.isArray(saved.vehicles) && saved.vehicles.length
      ? saved.vehicles.map((vehicle: any, index: number) => ({
          id: index + 1,
          vehicle_details_id:
            Number(
              vehicle.vehicle_details_ID ??
              vehicle.vehicle_details_id ??
              0
            ) || undefined,
          type: String(vehicle.vehicle_type_id ?? ""),
          count: Number(vehicle.vehicle_count ?? 1),
        }))
      : [{ id: 1, type: "", count: 1 }]
  );

  // Restore ONLY this leg's route rows.
  const savedRoutes = Array.isArray(saved.routes)
    ? saved.routes
    : [];

  setRouteDetails(
    savedRoutes.map((route: any, index: number): RouteRow => ({
      id: index + 1,
      itinerary_route_id:
        Number(
          route.itinerary_route_ID ??
          route.itinerary_route_id ??
          0
        ) || undefined,
      day: Number(route.no_of_days ?? index + 1),
      date: route.itinerary_route_date
        ? safeDateFromISO(route.itinerary_route_date)
        : "",
      source: String(route.location_name ?? ""),
      next: String(route.next_visiting_location ?? ""),
      via: String(route.via_route ?? ""),
      via_routes: Array.isArray(route.via_routes)
        ? route.via_routes.map((via: any) => ({
            itinerary_via_location_ID: Number(
              via.itinerary_via_location_ID
            ),
            itinerary_via_location_name: String(
              via.itinerary_via_location_name ?? ""
            ),
          }))
        : [],
      no_of_km: Number(route.no_of_km ?? 0),
      directVisit:
        Number(route.direct_to_next_visiting_place) === 1
          ? "Yes"
          : "No",
    }))
  );

  setInlineRouteStarts([0]);

  return;
}

// Existing Add Route prefill behavior remains unchanged.
setAgentId(initialDraft.agentId ?? null);
setPendingNewAgent(initialDraft.pendingNewAgent ?? null);

  setItineraryPreferenceForRole(
    initialDraft.itineraryPreference ?? "both",
  );

  setItineraryTypeSelect(initialDraft.itineraryTypeSelect || "");
  setArrivalType(initialDraft.arrivalType || "");
  setDepartureType(initialDraft.departureType || "");
  setEntryTicketRequired(initialDraft.entryTicketRequired || "");
  setGuideRequired(initialDraft.guideRequired || "");
  setNationality(initialDraft.nationality || "");
  setFoodPreference(initialDraft.foodPreference || "");
  setMealPlanCode(initialDraft.mealPlanCode || "CP");
  setBudget(initialDraft.budget ?? "");
  setSpecialInstructions(initialDraft.specialInstructions || "");

  setSelectedHotelCategoryIds([
    ...initialDraft.selectedHotelCategoryIds,
  ]);

  setSelectedHotelFacilityIds([
    ...initialDraft.selectedHotelFacilityIds,
  ]);

  setRooms(
    initialDraft.rooms.map((room: any) => ({
      ...room,
      childrenDetails: (room.childrenDetails || []).map(
        (child: any) => ({ ...child }),
      ),
    })),
  );

  setDefaultRoomTemplate(initialDraft.defaultRoomTemplate);

  setVehicles(
    initialDraft.vehicles.map((vehicle: any) => ({
      ...vehicle,
    })),
  );

  setStartTime(
    initialDraft.nextStartTime || DEFAULT_ITINERARY_START_TIME,
  );

  // Locations, travel dates and day-wise routes stay blank.
}, [embeddedDraft, initialDraft]);

const handleAllInlineDraftsSave = async () => {
  if (!validateBeforeSave()) return;

  for (const draft of inlineDrafts) {
    const api = inlineDraftApiRef.current.get(draft.id);

    if (!api || !api.validate()) return;
  }

  await handleSaveClick();
};

const isDefaultItineraryTypeSelected = () => {
  const selectedType = itineraryTypes.find(
    (t) => String(t.id) === String(itineraryTypeSelect)
  );

  const selectedLabel = String(selectedType?.label || "")
    .trim()
    .toLowerCase();

  return (
    selectedLabel === "default" ||
    selectedLabel === "suggested route" ||
    selectedLabel === "suggested routes"
  );
};

const normalizeSuggestedRouteDayValue = (...values: any[]) => {
  const value = values.find(
    (item) => item !== undefined && item !== null && String(item).trim() !== ""
  );

  return value ?? "";
};

const normalizeSmartBookingItineraryPreference = (
  value: unknown,
):
  | "vehicle"
  | "hotel"
  | "both"
  | null => {
  const normalized =
    String(
      value ?? "",
    )
      .trim()
      .toLowerCase();

  /*
    Current Smart Booking values:
    hotel / vehicle / both

    Legacy frontend values:
    1 = Hotel
    2 = Vehicle
    3 = Both
  */
  if (
    normalized === "vehicle" ||
    normalized === "2"
  ) {
    return "vehicle";
  }

  if (
    normalized === "hotel" ||
    normalized === "1"
  ) {
    return "hotel";
  }

  if (
    normalized === "both" ||
    normalized === "3" ||
    normalized ===
      "both hotel and vehicle"
  ) {
    return "both";
  }

  return null;
};

const normalizeSmartBookingDisplayDate = (
  value: unknown,
): string => {
  const raw =
    String(value ?? "").trim();

  if (!raw) return "";

  if (
    /^\d{2}\/\d{2}\/\d{4}$/.test(raw)
  ) {
    return raw;
  }

  if (
    /^\d{2}-\d{2}-\d{4}$/.test(raw)
  ) {
    return raw.replace(/-/g, "/");
  }

  return safeDateFromISO(
    raw,
    "",
  );
};

const normalizeSmartBookingPayloadDate = (
  value: unknown,
  fallbackValue: unknown,
): string | undefined => {
  const display =
    normalizeSmartBookingDisplayDate(
      value,
    );

  if (display) {
    return toISOFromDDMMYYYY(
      display,
    );
  }

  const fallback =
    String(
      fallbackValue ?? "",
    ).trim();

  return fallback || undefined;
};


const buildPayloadForSuggestedRoute = (route: RouteData, basePayload: any) => {
  const routeDays = Array.isArray((route as any)?.days)
    ? (route as any).days
    : [];

  const routes = routeDays.map((day: any, idx: number) => {
    const source = normalizeSuggestedRouteDayValue(
      day.source,
      day.sourceLocation,
      day.location_name,
      day.locationName
    );

    const next = normalizeSuggestedRouteDayValue(
      day.next,
      day.nextLocation,
      day.next_visiting_location,
      day.nextVisitingLocation
    );

    const via = normalizeSuggestedRouteDayValue(
      day.via,
      day.viaRoute,
      day.via_route
    );

    const directVisitValue = normalizeSuggestedRouteDayValue(
      day.directVisit,
      day.direct_to_next_visiting_place
    );

    const directVisit =
      directVisitValue === true ||
      directVisitValue === 1 ||
      String(directVisitValue).trim().toLowerCase() === "yes";

    return {
      location_name: source || "",
      next_visiting_location: next || "",
      itinerary_route_date:
        normalizeSmartBookingPayloadDate(
          day.date ??
            day.itinerary_route_date,
          basePayload?.routes?.[idx]
            ?.itinerary_route_date,
        ),
      no_of_days: day.dayNo || day.day || idx + 1,
      no_of_km:
        day.no_of_km !== undefined &&
        day.no_of_km !== null &&
        String(day.no_of_km).trim() !== ""
          ? Number(day.no_of_km)
          : 0,
      direct_to_next_visiting_place: directVisit ? 1 : 0,
      via_route: via || "",
      via_routes: Array.isArray(day.via_routes) ? day.via_routes : [],
    };
  });

  return {
    ...basePayload,
    plan: {
      ...basePayload.plan,
      itinerary_plan_id: undefined,
    },
    routes,
  };
};

const extractCreatedQuoteId = (response: any): string => {
  const candidates = [
    response?.quoteId,
    response?.itinerary_quote_ID,
    response?.itinerary_quote_id,
    response?.quotationNo,
    response?.quotation_no,
    response?.quote_id,

    response?.data?.quoteId,
    response?.data?.itinerary_quote_ID,
    response?.data?.itinerary_quote_id,
    response?.data?.quotationNo,
    response?.data?.quotation_no,
    response?.data?.quote_id,

    response?.result?.quoteId,
    response?.result?.itinerary_quote_ID,
    response?.result?.itinerary_quote_id,
    response?.result?.quotationNo,
    response?.result?.quotation_no,
    response?.result?.quote_id,

    response?.plan?.quoteId,
    response?.plan?.itinerary_quote_ID,
    response?.plan?.itinerary_quote_id,
    response?.plan?.quotationNo,
    response?.plan?.quotation_no,
    response?.plan?.quote_id,
  ];

  const cleanCandidates = candidates
    .map((value) => String(value || "").trim())
    .filter(Boolean);

  return (
    cleanCandidates.find((value) => value.startsWith("DVI")) ||
    cleanCandidates[0] ||
    ""
  );
};

const extractRouteFamilyBaseQuoteId = (response: any, quoteId?: string): string => {
  const candidates = [
    response?.routeFamilyBaseQuoteId,
    response?.route_family_base_quote_id,
    response?.data?.routeFamilyBaseQuoteId,
    response?.data?.route_family_base_quote_id,
    response?.result?.routeFamilyBaseQuoteId,
    response?.result?.route_family_base_quote_id,
    quoteId,
  ]
    .map((value) => String(value || "").trim())
    .filter(Boolean);

  const first = candidates[0] || "";
  if (!first) return "";

  const familyMatch = first.match(/^(.*)-R\d+$/i);
  return familyMatch?.[1] ? String(familyMatch[1]).trim() : first;
};
const { handleSaveWithType } = useCreateItineraryRouteSave({
  buildPayload,
  routeDetails,
  savedEditPlanIds,
  getAdditionalLegPayloads: () =>
    inlineDrafts.map((draft) => {
      const api = inlineDraftApiRef.current.get(draft.id);

      if (!api) {
        throw new Error(`Route draft ${draft.id} is not ready.`);
      }

      return api.buildPayload();
    }),
  addRouteAfterSaveRef,
  pendingNewAgent,
  onActivationEmailFailure:
    handleActivationEmailFailure,
  itineraryPreference: effectiveItineraryPreference,
  rooms,
  arrivalPolicyDecisionRef,
    setIsSaving,
    setActiveSaveType,
    setEstimatedSaveMs,
    startSaveProgress,
    itineraryPlanId,
    isDefaultItineraryTypeSelected,
    suggestedDefaultRoutes,
    buildPayloadForSuggestedRoute,
    ItineraryService,
    extractCreatedQuoteId,
    extractRouteFamilyBaseQuoteId,
    setSaveProgressPercent,
    toast,
    setSaveErrorMessage,
    setShowRouteConfirm,
    navigate,
    stopSaveProgress,
    setTransportLoadingMessageIndex,
    getEstimatedSaveMs,
  });

  // DVI_TE_TOURS_OPTIMIZE_SAFE_V2: Travel Expert Tours bypasses route-choice dialog only AFTER form validation.
  const teToursDirectSaveEnabled =
    (effectiveItineraryPreference === "both" || effectiveItineraryPreference === "vehicle") &&
    (pageMode === undefined || pageMode === "create-itinerary") &&
    typeof window !== "undefined" &&
    window.location.pathname.startsWith("/create-itinerary");
  directToursSaveRef.current = teToursDirectSaveEnabled
    ? () => { void handleSaveWithType("itineary_basic_info"); }
    : null;

  /* =========================================================
     SMART BOOKING AUTO CREATE ROUTE FAMILY

     The final Smart Booking Save & Continue means SAVE.
     Imported R1-R4 routes are passed through the existing
     Create Itinerary validation and route-family save flow.
     ========================================================= */
  useEffect(() => {
    if (
      !smartBookingAutoSaveRequested ||
      smartBookingAutoSaveStartedRef.current ||
      itineraryPlanId ||
      !smartBookingHandoffAppliedRef.current ||
      smartBookingImportedRoutes.length === 0 ||
      suggestedDefaultRoutes.length === 0
    ) {
      return;
    }

    const params =
      new URLSearchParams(
        window.location.search,
      );

    if (
      params.get("from") !== "smart-booking"
    ) {
      return;
    }

    /*
      Wait until Suggested Routes is genuinely active.
      This is required so handleSaveWithType sees the
      imported routes as an R1/R2/R3/R4 family.
    */
    if (!isDefaultItineraryTypeSelected()) {
      return;
    }

    const preference = String(
      effectiveItineraryPreference || "",
    ).trim();

   const agentReady =
  isAgentLogin
    ? Number(loggedInAgentId || 0) > 0
    : Number(agentId || 0) > 0;

    const hotelCategoryReady =
      preference === "vehicle" ||
      selectedHotelCategoryIds.length > 0;

    const expectedRouteCount =
      Math.max(
        Number(noOfDays || 1),
        1,
      );

    const routesReady =
      routeDetails.length >=
        expectedRouteCount &&
      routeDetails
        .slice(0, expectedRouteCount)
        .every(
          (route: any) =>
            Boolean(
              String(
                route?.source || "",
              ).trim(),
            ) &&
            Boolean(
              String(
                route?.next || "",
              ).trim(),
            ),
        );

    const defaultsReady =
      Boolean(itineraryTypeSelect) &&
      Boolean(arrivalType) &&
      Number(budget) > 0 &&
      Boolean(entryTicketRequired) &&
      Boolean(guideRequired) &&
      Boolean(nationality) &&
      (
        preference === "vehicle" ||
        Boolean(foodPreference)
      );

    const vehicleReady =
      preference === "hotel" ||
      (
        vehicles.length > 0 &&
        vehicles.every(
          (vehicle: any) =>
            Boolean(
              String(
                vehicle?.type || "",
              ).trim(),
            ),
        ) &&
        !vehiclePaxValidationError
      );

    const formReady =
      agentReady &&
      Boolean(arrivalLocation) &&
      Boolean(departureLocation) &&
      Boolean(tripStartDate) &&
      Boolean(tripEndDate) &&
      hotelCategoryReady &&
      routesReady &&
      defaultsReady &&
      vehicleReady;

    if (!formReady) {
      return;
    }

    smartBookingAutoSaveStartedRef.current = true;

    void handleSaveClick();
  }, [
    smartBookingAutoSaveRequested,
    itineraryPlanId,
    smartBookingImportedRoutes.length,
    suggestedDefaultRoutes.length,
    itineraryTypes,
    effectiveItineraryPreference,
   isAgentLogin,
loggedInAgentId,
agentId,
arrivalLocation,
    departureLocation,
    tripStartDate,
    tripEndDate,
    selectedHotelCategoryIds.length,
    noOfDays,
    routeDetails,
    itineraryTypeSelect,
    arrivalType,
    budget,
    entryTicketRequired,
    guideRequired,
    nationality,
    foodPreference,
    vehicles,
    vehiclePaxValidationError,
  ]);

  useEffect(() => {
    if (
      !smartBookingAutoSaveRequested ||
      !showRouteConfirm ||
      smartBookingAutoSaveConfirmedRef.current ||
      isSaving
    ) {
      return;
    }

    smartBookingAutoSaveConfirmedRef.current = true;

    void handleSaveWithType(
      "itineary_basic_info_with_optimized_route",
    );
  }, [
    smartBookingAutoSaveRequested,
    showRouteConfirm,
    isSaving,
  ]);

  // ----------------- UI -----------------

  if (loading) {
    return <div className="p-4">Loading...</div>;
  }

 return (
  <>
   <CreateItineraryView
  context={{
    embeddedDraft,
    onRemoveDraft,
  draftMinimumTripDate:
    embeddedDraft ? initialDraft?.minimumTripDate ?? "" : "",
  draftMinimumTripStartTime:
    embeddedDraft ? initialDraft?.minimumTripStartTime ?? "" : "",
  hideInlineSaveActions:
    embeddedDraft || inlineDrafts.length > 0,
        smartBookingImportedRoutes,
       pageMode,
agents: visibleAgents,
agentId,
setAgentId,
pendingNewAgent,
setPendingNewAgent,
isAgentLogin,
loggedInAgentId,
locations,
arrivalLocation,
setArrivalLocation: handleArrivalLocationChange,
         departureLocation, setDepartureLocation: handleDepartureLocationChange,
         calendarLocationNames,
        itineraryTypes, itineraryTypeSelect, setItineraryTypeSelect,
        itineraryPreference: effectiveItineraryPreference, setItineraryPreference: setItineraryPreferenceForRole,
        isVehicleAgentLogin, travelTypes, arrivalType, setArrivalType,
        departureType, setDepartureType, entryTicketOptions, entryTicketRequired,
         setEntryTicketRequired, budget, setBudget, rooms, setRooms, addRoom, removeRoom,
         defaultRoomTemplate, setDefaultRoomTemplate,
        guideOptions, guideRequired, setGuideRequired, nationalities, nationality, setNationality,
        foodPreferences, foodPreference, setFoodPreference, mealPlanOptions, mealPlanCode,
    setMealPlanCode, tripStartDate, setTripStartDate, tripEndDate, setTripEndDate,
startTime, setStartTime, endTime, setEndTime, hotelCategoryOptions, hotelFacilityOptions,

// Continue Planning context
continueFromPlanId,
continuationSource,
        specialInstructions, setSpecialInstructions, validationErrors, selectedHotelCategoryIds,
        setSelectedHotelCategoryIds, selectedHotelFacilityIds, setSelectedHotelFacilityIds,
  transportEarlyArrivalOption, setTransportEarlyArrivalOption,
transportEarlyArrivalHotelName, setTransportEarlyArrivalHotelName,
transportEarlyArrivalLocationName, setTransportEarlyArrivalLocationName,
transportEarlyArrivalRestMinutes, setTransportEarlyArrivalRestMinutes,

transportOvernightLocationName,
setTransportOvernightLocationName,

requiresTransportEarlyArrivalPreference: needsTransportEarlyArrivalPreference,
        noOfNights, noOfDays, isDefaultItineraryTypeSelected, activeDefaultRouteIndex,
       setSuggestedDefaultRoutes, setActiveDefaultRouteIndex, setRouteDetails, routeDetails,
handleAddInlineRoute,
openViaRoutes, isViaRouteDisabled, deleteDay, refreshRouteDistance, deleteRouteDay, addDay,
        vehicleTypes, vehicles, setVehicles, selectedVehicleIds, addVehicle, removeVehicle,
        vehiclePaxValidationError,
        buildPayload, handleSaveClick, isSaving, showRouteConfirm, saveProgressPercent, estimatedSaveMs,
        saveErrorMessage,
        setSaveErrorMessage,
        pendingPayload, activeSaveType, FINAL_ITINERARY_LOADING_MESSAGES, transportLoadingMessageIndex,
        handleConfirmClose, handleSaveWithType, arrivalPolicyModal, setArrivalPolicyModal,
        isResolvingArrivalPolicy, getArrivalPolicyDecisionKey, runArrivalPolicyGate,
        setLastArrivalPolicyDecisionKey, applyArrivalPolicyDecision, setPendingPayload,
        continueToRouteConfirmation, viaDialogOpen, handleViaDialogOpenChange, viaRoutes,
        viaRoutesLoading, activeViaRouteRow, activeViaRouteIds, handleViaDialogSubmit,
    }}
  />

    {!embeddedDraft &&
      inlineDrafts.map((draft, index) => (
        <section
          key={draft.id}
          className="mx-auto max-w-7xl space-y-3 px-4 pt-5"
        >
          <h3 className="text-lg font-semibold text-violet-800">
            Route {index + 2} — Create Itinerary
          </h3>

<CreateItinerary
  pageMode={pageMode}
  embeddedDraft
  draftId={draft.id}
  initialDraft={draft.prefill}
  registerDraft={registerInlineDraft}
  onRemoveDraft={
    draft.prefill?.savedLeg
      ? undefined
      : () => {
          setInlineDrafts((previous) =>
            previous.filter((item) => item.id !== draft.id)
          );
        }
  }
/>
        </section>
      ))}

    {!embeddedDraft && inlineDrafts.length > 0 && (
      <div className="flex flex-wrap justify-center gap-3 py-6">
        <Button
          type="button"
          variant="outline"
          disabled={isSaving}
          onClick={handleAddInlineRoute}
        >
          + Add Route
        </Button>

        <Button
          type="button"
          disabled={isSaving}
          onClick={() => void handleAllInlineDraftsSave()}
        >
          {isSaving ? "Saving..." : "Save & Continue"}
        </Button>
      </div>
    )}
  </>
);
};

export default CreateItinerary;
