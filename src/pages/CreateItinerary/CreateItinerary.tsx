




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
import { ItineraryPlanBlock } from "./ItineraryPlanBlock";
import { RouteDetailsBlock } from "./RouteDetailsBlock";
import { VehicleBlock } from "./VehicleBlock";
import { ViaRouteDialog } from "./ViaRouteDialog";
import { DefaultRoutesSuggestions, RouteData } from "@/components/DefaultRoutesSuggestions";
import { ArrivalHotelDecisionModal } from "@/components/hotels/ArrivalHotelDecisionModal";
import { useToast } from "@/components/ui/use-toast";
import { HotelArrivalPolicyRequest } from "@/services/itinerary";

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
} from "./helpers/createItinerary.utils";
import type { VehicleRow } from "./helpers/createItinerary.utils";
import { useCreateItinerarySave } from "./helpers/useCreateItinerarySave";
import { useCreateItineraryRouteSave } from "./helpers/useCreateItineraryRouteSave";
import { CreateItineraryView } from "./helpers/CreateItineraryView";
import { useCreateItineraryEffects } from "./helpers/useCreateItineraryEffects";

import {
  getUnresolvedChildExtraBedOccupancyRooms,
  useRoomsAndTravellers,
  type RoomRow as TravellerRoomRow,
} from "./helpers/useRoomsAndTravellers";
import { useItineraryRoutes, RouteRow } from "./helpers/useItineraryRoutes";
import {
  getEstimatedSaveMs,
  TRANSPORT_LOADING_MESSAGES,
} from "./helpers/saveProgress.constants";

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

export const CreateItinerary = () => {
  const [searchParams] = useSearchParams();
  const id = searchParams.get("id");
  const navigate = useNavigate();
  const { toast } = useToast();

  const itineraryPlanId = id && !Number.isNaN(Number(id)) ? Number(id) : null;
  const loggedInUser = getLoggedInUserContext();
  const isAgentLogin = loggedInUser.role === 4;
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
  const [agentId, setAgentId] = useState<number | null>(null);

  const [arrivalLocation, setArrivalLocation] = useState("");
  const [departureLocation, setDepartureLocation] = useState("");

  const [itineraryTypeSelect, setItineraryTypeSelect] = useState("");
  const [arrivalType, setArrivalType] = useState("");
  const [departureType, setDepartureType] = useState("");
  const [entryTicketRequired, setEntryTicketRequired] = useState("");
  const [guideRequired, setGuideRequired] = useState("");
  const [nationality, setNationality] = useState("");
  const [foodPreference, setFoodPreference] = useState(""); // ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¦ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã¢â‚¬Å“ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¦ store option id string
  const [mealPlanCode, setMealPlanCode] = useState<string>("__ALL__");

  const [tripStartDate, setTripStartDate] = useState<string>("");
  const [tripEndDate, setTripEndDate] = useState<string>("");

// ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¦ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã¢â‚¬Å“ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¦ Start/End time used to build trip_start_date and trip_end_date payload
const [startTime, setStartTime] = useState<string>("12:00");
const [endTime, setEndTime] = useState<string>("12:00");

  // Special instructions (goes in payload)
  const [specialInstructions, setSpecialInstructions] = useState<string>("");

  // hotel categories (required for hotel/both)
  const [selectedHotelCategoryIds, setSelectedHotelCategoryIds] = useState<number[]>([]);
  const [selectedHotelFacilityIds, setSelectedHotelFacilityIds] = useState<string[]>([]);

  // rooms + travellers hook
  const { rooms, setRooms, addRoom, removeRoom, buildTravellers } = useRoomsAndTravellers();

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
  } = useItineraryRoutes({
    tripStartDate,
    tripEndDate,
    arrivalLocation,
    departureLocation,
    itineraryPlanId,
    toast,
  });

  const [loading, setLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

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
  useEffect(() => {
    if (!itineraryPlanId && isAgentLogin && loggedInAgentId) {
      setAgentId(loggedInAgentId);
    }
  }, [itineraryPlanId, isAgentLogin, loggedInAgentId]);

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

      if (TRANSPORT_LOADING_MESSAGES.length > 0) {
        setTransportLoadingMessageIndex(
          Math.floor(elapsed / 1600) % TRANSPORT_LOADING_MESSAGES.length,
        );
      }
    }, 220);
  };

  useCreateItineraryEffects({
    setValidationErrors, agentId, arrivalLocation, departureLocation, tripStartDate, tripEndDate,
    itineraryTypeSelect, arrivalType, departureType, budget, entryTicketRequired, guideRequired,
    nationality, foodPreference, itineraryPreference, selectedHotelCategoryIds, routeDetails,
    vehicles, vehiclePaxValidationError, stopSaveProgress, setLoading, isAgentLogin,
    loggedInAgentId, setAgents, setLocations, setItineraryTypes, setTravelTypes,
    setEntryTicketOptions, setGuideOptions, setNationalities, setFoodPreferences,
    setMealPlanOptions, setHotelCategoryOptions, setHotelFacilityOptions, itineraryPlanId,
    itineraryService: ItineraryService, setAgentId, setArrivalLocation,
    setDepartureLocation, setTripStartDate, setTripEndDate, setStartTime, setEndTime,
    setBudget, setArrivalType, setDepartureType, setItineraryPreference,
    setItineraryTypeSelect, setEntryTicketRequired, setGuideRequired, setNationality,
    setFoodPreference, setMealPlanCode, setSpecialInstructions, setSelectedHotelCategoryIds,
    setSelectedHotelFacilityIds, setRouteDetails, setVehicles, setRooms,
    templateAppliedKey, setTemplateAppliedKey, toast, itineraryTypes,
    defaultRouteWarningShownRef, setShowDefaultRouteSuggestions, vehicleTypeRequestRef,
    setVehicleTypes, setSelectedVehicleIds, setEligibleVehicleTypeIds,
    travellerCounts, totalTravellingPax, fetchStoredSourceLocations,
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
  // ----------------- VALIDATION -----------------

  const noOfNights = calculateNights(tripStartDate, tripEndDate);
  const noOfDays = tripStartDate && tripEndDate ? Math.max(1, noOfNights + 1) : 1;

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
    agentId,
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
    itineraryPreference,
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
    buildTravellers,
    arrivalPolicyDecision,
    ItineraryService,
    setArrivalPolicyModal,
    setIsResolvingArrivalPolicy,
    setShowRouteConfirm,
    getUnresolvedChildExtraBedOccupancyRooms,
    rooms,
    applyArrivalPolicyDecision,
    setPendingPayload,
    lastArrivalPolicyDecisionKey,
    isSaving,
  });

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
      itinerary_route_date: day.date ? toISOFromDDMMYYYY(day.date) : undefined,
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
    setShowRouteConfirm,
    navigate,
    stopSaveProgress,
    setTransportLoadingMessageIndex,
    getEstimatedSaveMs,
  });

  // ----------------- UI -----------------

  if (loading) {
    return <div className="p-4">Loading...</div>;
  }

  return (
    <CreateItineraryView
      context={{
        agents, agentId, setAgentId, isAgentLogin, loggedInAgentId, locations,
        arrivalLocation, setArrivalLocation, departureLocation, setDepartureLocation,
        itineraryTypes, itineraryTypeSelect, setItineraryTypeSelect,
        itineraryPreference, setItineraryPreference, travelTypes, arrivalType, setArrivalType,
        departureType, setDepartureType, entryTicketOptions, entryTicketRequired,
        setEntryTicketRequired, budget, setBudget, rooms, setRooms, addRoom, removeRoom,
        guideOptions, guideRequired, setGuideRequired, nationalities, nationality, setNationality,
        foodPreferences, foodPreference, setFoodPreference, mealPlanOptions, mealPlanCode,
        setMealPlanCode, tripStartDate, setTripStartDate, tripEndDate, setTripEndDate,
        startTime, setStartTime, endTime, setEndTime, hotelCategoryOptions, hotelFacilityOptions,
        specialInstructions, setSpecialInstructions, validationErrors, selectedHotelCategoryIds,
        setSelectedHotelCategoryIds, selectedHotelFacilityIds, setSelectedHotelFacilityIds,
        noOfNights, noOfDays, isDefaultItineraryTypeSelected, activeDefaultRouteIndex,
        setSuggestedDefaultRoutes, setActiveDefaultRouteIndex, setRouteDetails, routeDetails,
        openViaRoutes, deleteDay, refreshRouteDistance, deleteRouteDay, addDay,
        vehicleTypes, vehicles, setVehicles, selectedVehicleIds, addVehicle, removeVehicle,
        handleSaveClick, isSaving, showRouteConfirm, saveProgressPercent, estimatedSaveMs,
        pendingPayload, activeSaveType, TRANSPORT_LOADING_MESSAGES, transportLoadingMessageIndex,
        handleConfirmClose, handleSaveWithType, arrivalPolicyModal, setArrivalPolicyModal,
        isResolvingArrivalPolicy, getArrivalPolicyDecisionKey, runArrivalPolicyGate,
        setLastArrivalPolicyDecisionKey, applyArrivalPolicyDecision, setPendingPayload,
        continueToRouteConfirmation, viaDialogOpen, handleViaDialogOpenChange, viaRoutes,
        viaRoutesLoading, activeViaRouteRow, activeViaRouteIds, handleViaDialogSubmit,
      }}
    />
  );
};

export default CreateItinerary;
