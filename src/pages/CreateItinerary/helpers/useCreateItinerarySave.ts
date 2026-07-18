/* eslint-disable @typescript-eslint/no-explicit-any */
import type { HotelArrivalPolicyRequest } from "@/services/itinerary";
import type { SimpleOption } from "@/services/itineraryDropdownsMock";
import { parseDDMMYYYY, toISOFromDDMMYYYY, toISOFromDDMMYYYYAndTime } from "./itineraryUtils";

export function useCreateItinerarySave(context: Record<string, any>) {
  const {
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
    ItineraryService: itineraryService,
    setArrivalPolicyModal,
    setIsResolvingArrivalPolicy,
    setShowRouteConfirm,
    getUnresolvedChildExtraBedOccupancyRooms,
    rooms,
    applyArrivalPolicyDecision,
    setPendingPayload,
    lastArrivalPolicyDecisionKey,
    isSaving,
  } = context;

  const validateBeforeSave = (): boolean => {
    const errors: Record<string, string> = {};

    if (!agentId && !(isAgentLogin && loggedInAgentId)) {
      errors.agentId = "Please select an Agent";
    }
    if (!arrivalLocation) errors.arrivalLocation = "Please select Arrival";
    if (!departureLocation) errors.departureLocation = "Please select Departure";
    if (!tripStartDate) errors.tripStartDate = "Please select Trip Start Date";
    if (!tripEndDate) errors.tripEndDate = "Please select Trip End Date";

    if (!itineraryTypeSelect) errors.itineraryTypeSelect = "Please select Itinerary Type";
    if (!arrivalType) errors.arrivalType = "Please select Arrival Type";

    if (budget === "" || Number(budget) <= 0) errors.budget = "Please enter a valid Budget";

    if (!entryTicketRequired) errors.entryTicketRequired = "Please select Entry Ticket Required option";
    if (!guideRequired) errors.guideRequired = "Please select Guide for Itinerary option";
    if (!nationality) errors.nationality = "Please select Nationality";
    if (itineraryPreference !== "vehicle" && !foodPreference) {
      errors.foodPreference = "Please select Food Preference";
    }

    if (
      (itineraryPreference === "hotel" || itineraryPreference === "both") &&
      selectedHotelCategoryIds.length === 0
    ) {
      errors.hotelCategory = "Please select at least one Hotel Category";
    }



    const firstRoute = routeDetails[0];
    if (!firstRoute?.source) errors.firstRouteSource = "Please fill first day From location";
if (!firstRoute?.next) errors.firstRouteNext = "Please fill first day To destination";
    if (itineraryPreference === "vehicle" || itineraryPreference === "both") {
      const missingType = vehicles.some((v) => !v.type);

      if (missingType) {
        errors.vehicleType = "Please select Vehicle Type for all rows";
      } else if (vehiclePaxValidationError) {
        errors.vehicleType = vehiclePaxValidationError;
      }
    }

    setValidationErrors(errors);

    const keys = Object.keys(errors);
    if (!keys.length) return true;

    const firstKey = keys[0];
    let selector = "";

    switch (firstKey) {
      case "agentId":
        selector = "[data-field='agentId']";
        break;
      case "arrivalLocation":
        selector = "[data-field='arrivalLocation']";
        break;
      case "departureLocation":
        selector = "[data-field='departureLocation']";
        break;
      case "tripStartDate":
        selector = "[data-field='tripStartDate']";
        break;
      case "tripEndDate":
        selector = "[data-field='tripEndDate']";
        break;
      case "itineraryTypeSelect":
        selector = "[data-field='itineraryTypeSelect']";
        break;
      case "arrivalType":
        selector = "[data-field='arrivalType']";
        break;
      case "budget":
        selector = "[data-field='budget']";
        break;
      case "entryTicketRequired":
        selector = "[data-field='entryTicketRequired']";
        break;
      case "guideRequired":
        selector = "[data-field='guideRequired']";
        break;
      case "nationality":
        selector = "[data-field='nationality']";
        break;
      case "foodPreference":
        selector = "[data-field='foodPreference']";
        break;
      case "hotelCategory":
        selector = "[data-field='hotelCategory']";
        break;
      case "firstRouteSource":
      case "firstRouteNext":
        selector = "[data-field='firstRouteSource']";
        break;
      case "vehicleType":
        selector = "[data-field='vehicleType']";
        break;
      default:
        selector = "";
    }

    if (selector && typeof document !== "undefined") {
      const el = document.querySelector<
        HTMLInputElement | HTMLButtonElement | HTMLElement
      >(
        `${selector} input, ${selector} button, ${selector} [role='combobox'], ${selector} select`
      );
      if (el && "focus" in el) (el as HTMLInputElement | HTMLButtonElement).focus();
      el?.scrollIntoView({ behavior: "smooth", block: "center" });
    }

    toast({ title: "Please fix the highlighted fields", variant: "destructive" });
    return false;
  };

  // ----------------- SAVE -----------------

// Ã¢Å“â€¦ COPY-PASTE: buildPayload() (replace your existing one)

// ----------------- SAVE -----------------

// Ã¢Å“â€¦ REPLACE existing buildPayload with this one
const buildPayload = () => {
  const { totalAdults, totalChildren, totalInfants, travellerRows } =
    buildTravellers();

  // ---- helper: always produce a valid numeric id (prevents NaN->null) ----
const resolveOptionId = (raw: any, options: SimpleOption[]): number => {
  const value = String(raw ?? "").trim();

  if (!value) return 0;

  // Dropdown may already provide a numeric ID.
  const directId = Number(value);

  if (Number.isInteger(directId) && directId > 0) {
    return directId;
  }

  // Treat spaces, hyphens and underscores as equivalent.
  const normalizeLabel = (input: unknown) =>
    String(input ?? "")
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "");

  const normalizedValue = normalizeLabel(value);

  const matchedOption = options.find((option: any) => {
    const optionLabel = normalizeLabel(
      option?.label ??
      option?.name ??
      option?.food_type_name ??
      option?.foodTypeName
    );

    return optionLabel === normalizedValue;
  });

  const matchedId = Number(
    (matchedOption as any)?.id ??
    (matchedOption as any)?.food_type ??
    (matchedOption as any)?.foodTypeId ??
    0
  );

  if (Number.isInteger(matchedId) && matchedId > 0) {
    return matchedId;
  }

  // Final fallback for APIs where the dropdown value itself is the label.
const foodTypeByLabel: Record<string, number> = {
  vegetarian: 1,
  veg: 1,
  nonvegetarian: 2,
  nonveg: 2,
  jain: 3,
  vegan: 4,
  egg: 5,
  eggetarian: 5,
  eggeterian: 5,
};



  return foodTypeByLabel[normalizedValue] ?? 0;
};

  const itinerary_type =
    itineraryTypeSelect && itineraryTypeSelect !== ""
      ? Number(itineraryTypeSelect)
      : itineraryPreference === "vehicle"
      ? 1
      : itineraryPreference === "hotel"
      ? 2
      : 3;

  const resolvedAgentId =
    isAgentLogin && loggedInAgentId
      ? Number(loggedInAgentId)
      : ((agentId as number) ?? 0);

  const itinerary_preference =
    itineraryPreference === "vehicle"
      ? 2
      : itineraryPreference === "hotel"
      ? 1
      : 3;

  const routes = routeDetails.map((r) => ({
    itinerary_route_id: r.itinerary_route_id ?? 0,
    location_name: r.source || "",
    next_visiting_location: r.next || "",
    itinerary_route_date: r.date
      ? toISOFromDDMMYYYY(r.date)
      : undefined, // +05:30 from utils
    no_of_days: r.day,
     no_of_km:
    r.no_of_km !== undefined &&
    r.no_of_km !== null &&
    String(r.no_of_km).trim() !== ""
      ? Number(r.no_of_km)
      : 0,
    direct_to_next_visiting_place: r.directVisit === "Yes" ? 1 : 0,
    via_route: r.via || "",
    via_routes: r.via_routes || [], // include via routes array for backend
  }));

  const preferred_hotel_category =
    itineraryPreference === "hotel" || itineraryPreference === "both"
      ? selectedHotelCategoryIds
      : [];

  const hotel_facilities =
    itineraryPreference === "hotel" || itineraryPreference === "both"
      ? selectedHotelFacilityIds
      : [];

const shouldUseFoodPreference = itineraryPreference !== "vehicle";
const food_type_id = shouldUseFoodPreference
  ? resolveOptionId(foodPreference, foodPreferences)
  : 0;
if (
  shouldUseFoodPreference &&
  (!Number.isInteger(food_type_id) || food_type_id <= 0)
) {
  throw new Error(
    `Invalid food preference value: ${String(foodPreference)}`
  );
}

const shouldUseMealPlan = itineraryPreference !== "vehicle";

const normalizedMealPlanCode =
  shouldUseMealPlan && mealPlanCode !== "__ALL__" ? mealPlanCode : "";

const selectedMealPlan = shouldUseMealPlan
  ? mealPlanOptions.find((p) => p.code === normalizedMealPlanCode)
  : undefined;

const meal_plan_breakfast =
  shouldUseMealPlan && Number(selectedMealPlan?.includesBreakfast ?? 0) ? 1 : 0;

const meal_plan_lunch =
  shouldUseMealPlan && Number(selectedMealPlan?.includesLunch ?? 0) ? 1 : 0;

const meal_plan_dinner =
  shouldUseMealPlan && Number(selectedMealPlan?.includesDinner ?? 0) ? 1 : 0;

const meal_plan_code = shouldUseMealPlan
  ? normalizedMealPlanCode || selectedMealPlan?.code || undefined
  : undefined;

  const trip_start_date = tripStartDate
    ? toISOFromDDMMYYYYAndTime(tripStartDate, startTime)
    : undefined;

  const trip_end_date = tripEndDate
    ? toISOFromDDMMYYYYAndTime(tripEndDate, endTime)
    : undefined;

  const pick_up_date_and_time =
    tripStartDate && startTime
      ? toISOFromDDMMYYYYAndTime(tripStartDate, startTime)
      : undefined;

  // Ã¢Å“â€¦ base plan without id
  const planBase: any = {
    agent_id: resolvedAgentId,
    staff_id: 0,
    location_id: 0,

    arrival_point: arrivalLocation || "",
    departure_point: departureLocation || "",

    itinerary_preference,
    itinerary_type,
    preferred_hotel_category,
    hotel_facilities,

    trip_start_date,
    trip_end_date,
    pick_up_date_and_time,

    arrival_type: arrivalType ? Number(arrivalType) : 0,
    departure_type: departureType ? Number(departureType) : 0,

    no_of_nights: noOfNights,
    no_of_days: noOfDays,

    budget: budget === "" ? 0 : Number(budget),

    entry_ticket_required: entryTicketRequired
      ? Number(entryTicketRequired)
      : 0,
    guide_for_itinerary: guideRequired ? Number(guideRequired) : 0,
    nationality: nationality ? Number(nationality) : 0,

    food_type: food_type_id,
    meal_plan_code,
    meal_plan_breakfast,
    meal_plan_lunch,
    meal_plan_dinner,

    adult_count: totalAdults,
    child_count: totalChildren,
    infant_count: totalInfants,

    special_instructions: specialInstructions || "",
  };

  // Ã¢Å“â€¦ inject itinerary_plan_id ONLY when editing
  const plan = itineraryPlanId
    ? {
        itinerary_plan_id: itineraryPlanId,
        ...planBase,
      }
    : planBase;

  const payload: any = {
    plan,
    routes,
    vehicles:
      itineraryPreference === "vehicle" || itineraryPreference === "both"
        ? vehicles.map((v) => ({
            vehicle_details_id: v.vehicle_details_id ?? 0,
            vehicle_type_id: v.type ? Number(v.type) : 0,
            vehicle_count: v.count ?? 1,
          }))
        : [],
    travellers: travellerRows,
    previousDayBillingDecisionProvided:
      arrivalPolicyDecision.previousDayBillingDecisionProvided,
    previousDayBillingConfirmed:
      arrivalPolicyDecision.previousDayBillingConfirmed,
  };

  return payload;
};

const toYMD = (ddmmyyyy: string): string => {
  const dt = parseDDMMYYYY(ddmmyyyy);
  if (!dt) return "";
  const y = dt.getFullYear();
  const m = String(dt.getMonth() + 1).padStart(2, "0");
  const d = String(dt.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
};

const buildArrivalPolicyRequest = (): HotelArrivalPolicyRequest | null => {
  const routeDate = toYMD(tripStartDate);
  if (!routeDate || !startTime) return null;

  const firstRoute = routeDetails[0];
  return {
    routeDayNumber: 1,
    routeDate,
    arrivalDateTime: toISOFromDDMMYYYYAndTime(tripStartDate, startTime),
    arrivalCityName: arrivalLocation || firstRoute?.source || "",
    routeSourceCityName: firstRoute?.source || arrivalLocation || "",
    nightStayCityName: firstRoute?.next || departureLocation || "",
    previousDayBillingDecisionProvided: false,
    previousDayBillingConfirmed: false,
  };
};

const getArrivalPolicyDecisionKey = (request: HotelArrivalPolicyRequest | null) => {
  if (!request?.routeDate || !request?.arrivalDateTime) {
    return null;
  }

  const arrivalTimeHms = request.arrivalDateTime.includes("T")
    ? request.arrivalDateTime.split("T")[1]?.slice(0, 8) || ""
    : "";

  if (!arrivalTimeHms) {
    return null;
  }

  return `${request.routeDate}|${arrivalTimeHms}`;
};

const isEarlyArrivalPolicyRequest = (request: HotelArrivalPolicyRequest | null) => {
  const arrivalTimeHms = request?.arrivalDateTime?.includes("T")
    ? request.arrivalDateTime.split("T")[1]?.slice(0, 8) || ""
    : "";

  if (!arrivalTimeHms) {
    return false;
  }

  const [hours, minutes, seconds] = arrivalTimeHms.split(":").map((value) => Number(value || 0));
  const totalSeconds = (hours * 3600) + (minutes * 60) + seconds;
  return totalSeconds >= 3600 && totalSeconds < 28800;
};

const openArrivalPolicyDecisionModal = (request: HotelArrivalPolicyRequest) => {
  const routeDate = request.routeDate || "";
  const currentDate = routeDate ? new Date(`${routeDate}T00:00:00`) : new Date();
  const previousDay = new Date(currentDate);
  previousDay.setDate(previousDay.getDate() - 1);

  const formatDate = (d: Date) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  };

  setArrivalPolicyModal({
    open: true,
    arrivalDate: formatDate(currentDate),
    previousDayDate: formatDate(previousDay),
    request,
  });
};

const runArrivalPolicyGate = async (


  request: HotelArrivalPolicyRequest,
): Promise<boolean> => {
  setIsResolvingArrivalPolicy(true);
  try {
    const policy = await itineraryService.resolveHotelArrivalPolicy(request);
    if (policy.requiresPreviousDayBillingConfirmation) {
      openArrivalPolicyDecisionModal(request);
      return false;
    }
    return true;
  } catch (e: any) {
    console.error("Failed to resolve arrival policy in create itinerary", e);
    toast({
      title: "Arrival policy failed",
      description: e?.message || "Unable to evaluate arrival policy before saving.",
      variant: "destructive",
    });
    return false;
  } finally {
    setIsResolvingArrivalPolicy(false);
  }
};

const continueToRouteConfirmation = () => {
  setShowRouteConfirm(true);
};

    const handleSaveClick = async () => {
    if (itineraryPreference === "hotel" || itineraryPreference === "both") {
      const unresolvedOccupancyRooms =
        getUnresolvedChildExtraBedOccupancyRooms(rooms);

      if (unresolvedOccupancyRooms.length > 0) {
        toast({
          title: "Occupancy alert required",
          description:
            "One room has two children aged 5 or above. Please add one extra bed, add another room, or proceed without extra bed subject to hotel approval.",
          variant: "destructive",
        });
        return;
      }
    }

    const ok = validateBeforeSave();
    if (!ok) return;
    applyArrivalPolicyDecision({
      previousDayBillingDecisionProvided: false,


      previousDayBillingConfirmed: false,
    });

    const payload = buildPayload();
    setPendingPayload(payload);

    const request = buildArrivalPolicyRequest();
    if (!request) {
      continueToRouteConfirmation();
      return;
    }

    const currentDecisionKey = getArrivalPolicyDecisionKey(request);
    if (
      isEarlyArrivalPolicyRequest(request) &&
      currentDecisionKey &&
      currentDecisionKey === lastArrivalPolicyDecisionKey
    ) {
      continueToRouteConfirmation();
      return;
    }

    const canProceed = await runArrivalPolicyGate(request);
    if (!canProceed) return;

    continueToRouteConfirmation();
  };

const handleConfirmClose = () => {
  if (isSaving) return;

  setShowRouteConfirm(false);
  setPendingPayload(null);
};


  return {
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
  };
}
