import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ItineraryService } from "@/services/itinerary";
import { AgentOption, fetchAgents } from "@/services/accountsManagerApi";
import {
  fetchLocations,
  fetchItineraryTypes,
  fetchTravelTypes,
  fetchEntryTicketOptions,
  fetchGuideOptions,
  fetchNationalities,
  fetchFoodPreferences,
  fetchEligibleVehicleTypes,
  fetchHotelCategories,
  fetchHotelFacilities,
  LocationOption,
  SimpleOption,
} from "@/services/itineraryDropdownsMock";
import { ItineraryPlanBlock } from "./ItineraryPlanBlock";
import { RouteDetailsBlock } from "./RouteDetailsBlock";
import { VehicleBlock } from "./VehicleBlock";
import { ViaRouteDialog } from "./ViaRouteDialog";
import { DefaultRoutesSuggestions } from "@/components/DefaultRoutesSuggestions";
import { useToast } from "@/components/ui/use-toast";

import {
  toDDMMYYYY,
  toISOFromDDMMYYYY,
  toISOFromDDMMYYYYAndTime,
  splitViaString,
  calculateNights,
} from "./helpers/itineraryUtils";
import { SaveRouteConfirmDialog } from "./helpers/SaveRouteConfirmDialog";
import { useRoomsAndTravellers } from "./helpers/useRoomsAndTravellers";
import { useItineraryRoutes, RouteRow } from "./helpers/useItineraryRoutes";

// ----------------- types -----------------

type ValidationErrors = {
  [key: string]: string;
};

type VehicleRow = {
  id: number;
  type: string;
  count: number;
};

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

// ✅ Use UTC so "2025-12-10T11:00:00.000Z" shows as 11:00 instead of 16:30 in IST
function safeTimeFromISO(iso?: string | null, fallback = ""): string {
  if (!iso) return fallback;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return fallback;
  return `${pad2(d.getUTCHours())}:${pad2(d.getUTCMinutes())}`;
}


function csvToStringArray(v: unknown): string[] {
  if (!v) return [];
  if (Array.isArray(v)) return v.map((x) => String(x).trim()).filter(Boolean);
  if (typeof v === "string")
    return v.split(",").map((s) => s.trim()).filter(Boolean);
  return [];
}

function csvToNumberArray(v: unknown): number[] {
  return csvToStringArray(v)
    .map((s) => Number(s))
    .filter((n) => Number.isFinite(n));
}


// Helper function to calculate number of days between two DD/MM/YYYY date strings
function calculateDaysBetweenDates(startDate: string, endDate: string): number {
  if (!startDate || !endDate) return 1;
  try {
    // Parse DD/MM/YYYY format
    const [startDay, startMonth, startYear] = startDate.split("/").map(Number);
    const [endDay, endMonth, endYear] = endDate.split("/").map(Number);

    const start = new Date(startYear, startMonth - 1, startDay);
    const end = new Date(endYear, endMonth - 1, endDay);

    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return 1;

    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    return Math.max(1, diffDays);
  } catch {
    return 1;
  }
}

function parseDDMMYYYY(value: string): Date | null {
  if (!value) return null;
  const [day, month, year] = value.split("/").map(Number);
  if (!day || !month || !year) return null;

  const date = new Date(year, month - 1, day);
  return Number.isNaN(date.getTime()) ? null : date;
}

function formatDDMMYYYY(date: Date): string {
  const dd = String(date.getDate()).padStart(2, "0");
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const yyyy = date.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

function addDaysToDDMMYYYY(value: string, daysToAdd: number): string {
  const date = parseDDMMYYYY(value);
  if (!date) return "";

  const next = new Date(date);
  next.setDate(next.getDate() + daysToAdd);
  return formatDDMMYYYY(next);
}

// ----------------- main component ------------

export const CreateItinerary = () => {
  const [searchParams] = useSearchParams();
  const id = searchParams.get("id");
  const navigate = useNavigate();
  const { toast } = useToast();

  const itineraryPlanId = id && !Number.isNaN(Number(id)) ? Number(id) : null;

  // agents / dropdown data
  const [agents, setAgents] = useState<AgentOption[]>([]);
  const [locations, setLocations] = useState<LocationOption[]>([]);
  const [itineraryTypes, setItineraryTypes] = useState<SimpleOption[]>([]);
  const [travelTypes, setTravelTypes] = useState<SimpleOption[]>([]);
  const [entryTicketOptions, setEntryTicketOptions] = useState<SimpleOption[]>([]);
  const [guideOptions, setGuideOptions] = useState<SimpleOption[]>([]);
  const [nationalities, setNationalities] = useState<SimpleOption[]>([]);
  const [foodPreferences, setFoodPreferences] = useState<SimpleOption[]>([]);
  const [vehicleTypes, setVehicleTypes] = useState<SimpleOption[]>([]);
  const [selectedVehicleIds, setSelectedVehicleIds] = useState<string[]>([]);
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
  const [foodPreference, setFoodPreference] = useState(""); // ✅ store option id string

  const [tripStartDate, setTripStartDate] = useState<string>("");
  const [tripEndDate, setTripEndDate] = useState<string>("");

  // ✅ Start/End time used to build trip_start_date and trip_end_date payload
  const [startTime, setStartTime] = useState<string>("12:00");
  const [endTime, setEndTime] = useState<string>("12:00");

  // Special instructions (goes in payload)
  const [specialInstructions, setSpecialInstructions] = useState<string>("");

  // hotel categories (required for hotel/both)
  const [selectedHotelCategoryIds, setSelectedHotelCategoryIds] = useState<number[]>([]);
  const [selectedHotelFacilityIds, setSelectedHotelFacilityIds] = useState<string[]>([]);

  // rooms + travellers hook
  const { rooms, setRooms, addRoom, removeRoom, buildTravellers } = useRoomsAndTravellers();

  // vehicles
  const [vehicles, setVehicles] = useState<VehicleRow[]>([
    { id: 1, type: "", count: 1 },
  ]);

  const [budget, setBudget] = useState<number | "">("");

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

  // Route suggestions modal
  const [showDefaultRouteSuggestions, setShowDefaultRouteSuggestions] =
    useState(false);

  const [validationErrors, setValidationErrors] = useState<ValidationErrors>({});
  const [templateAppliedKey, setTemplateAppliedKey] = useState<string>("");

  // ----------------- effects -----------------

  // ✅ Auto-clear validation highlight as soon as the field becomes valid
useEffect(() => {
  setValidationErrors((prev) => {
    if (!prev || Object.keys(prev).length === 0) return prev;

    const next: ValidationErrors = { ...prev };

    const clearIfOk = (key: string, ok: boolean) => {
      if (ok && next[key]) delete next[key];
    };

    clearIfOk("agentId", !!agentId);
    clearIfOk("arrivalLocation", !!arrivalLocation);
    clearIfOk("departureLocation", !!departureLocation);
    clearIfOk("tripStartDate", !!tripStartDate);
    clearIfOk("tripEndDate", !!tripEndDate);

    clearIfOk("itineraryTypeSelect", !!itineraryTypeSelect);
    clearIfOk("arrivalType", !!arrivalType);

    clearIfOk("budget", budget !== "" && Number(budget) > 0);

    clearIfOk("entryTicketRequired", !!entryTicketRequired);
    clearIfOk("guideRequired", !!guideRequired);
    clearIfOk("nationality", !!nationality);
    clearIfOk("foodPreference", !!foodPreference);

    // Hotel category required only for hotel/both
    const hotelCategoryOk =
      !(itineraryPreference === "hotel" || itineraryPreference === "both") ||
      selectedHotelCategoryIds.length > 0;
    clearIfOk("hotelCategory", hotelCategoryOk);



    // First route fields
    const firstRoute = routeDetails?.[0];
    clearIfOk("firstRouteSource", !!firstRoute?.source);
    clearIfOk("firstRouteNext", !!firstRoute?.next);

    // Vehicle type required only for vehicle/both
    const vehicleTypeOk =
      !(itineraryPreference === "vehicle" || itineraryPreference === "both") ||
      vehicles.every((v) => !!v.type);
    clearIfOk("vehicleType", vehicleTypeOk);

    // If nothing changed, keep same reference to avoid rerender loops
    return Object.keys(next).length === Object.keys(prev).length ? prev : next;
  });
}, [
  agentId,
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
  routeDetails,
  vehicles,
]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const [
          agentsRes,
          locationsRes,
          itineraryTypesRes,
          travelTypesRes,
          entryTicketRes,
          guideRes,
          nationalityRes,
          foodRes,
          hotelCatRes,
          hotelFacilityRes,
        ] = await Promise.all([
          fetchAgents(),
          fetchLocations("source"),
          fetchItineraryTypes(),
          fetchTravelTypes(),
          fetchEntryTicketOptions(),
          fetchGuideOptions(),
          fetchNationalities(),
          fetchFoodPreferences(),
          fetchHotelCategories(),
          fetchHotelFacilities(),
        ]);

        setAgents(agentsRes);
        setLocations(locationsRes);
        setItineraryTypes(itineraryTypesRes);
        setTravelTypes(travelTypesRes);
        setEntryTicketOptions(entryTicketRes);
        setGuideOptions(guideRes);
        setNationalities(nationalityRes);
        setFoodPreferences(foodRes);
        setHotelCategoryOptions(hotelCatRes);
        setHotelFacilityOptions(hotelFacilityRes);

        if (itineraryPlanId) {
          const existing = await ItineraryService.getOne(itineraryPlanId);
          if (existing?.plan) {
            // NOTE: backend returns DB plan (dvi_itinerary_plan_details)
            const p = existing.plan;

            setAgentId(p.agent_id ?? null);

            // ✅ DB fields are arrival_location / departure_location (NOT arrival_point / departure_point)
            setArrivalLocation(p.arrival_location ?? "");
            setDepartureLocation(p.departure_location ?? "");

            // ✅ DB fields are trip_start_date_and_time / trip_end_date_and_time
            setTripStartDate(
              p.trip_start_date_and_time
                ? toDDMMYYYY(new Date(p.trip_start_date_and_time))
                : ""
            );
            setTripEndDate(
              p.trip_end_date_and_time
                ? toDDMMYYYY(new Date(p.trip_end_date_and_time))
                : ""
            );

            // ✅ also prefill times
            setStartTime(safeTimeFromISO(p.trip_start_date_and_time, "13:00"));
            setEndTime(safeTimeFromISO(p.trip_end_date_and_time, "12:00"));

            // ✅ budget in DB is expecting_budget
            setBudget(p.expecting_budget ?? "");

            setArrivalType(p.arrival_type != null ? String(p.arrival_type) : "");
            setDepartureType(p.departure_type != null ? String(p.departure_type) : "");

            setItineraryPreference(
              p.itinerary_preference === 2
                ? "vehicle"
                : p.itinerary_preference === 1
                ? "hotel"
                : "both"
            );

            setItineraryTypeSelect(p.itinerary_type != null ? String(p.itinerary_type) : "");

            setEntryTicketRequired(
              p.entry_ticket_required != null ? String(p.entry_ticket_required) : ""
            );

            setGuideRequired(
              p.guide_for_itinerary != null ? String(p.guide_for_itinerary) : ""
            );

            setNationality(p.nationality != null ? String(p.nationality) : "");

            // ✅ foodPreference state holds option id
            setFoodPreference(p.food_type != null ? String(p.food_type) : "");



            setSpecialInstructions(p.special_instructions ?? "");
            // ✅ PREFILL: categories/facilities come as CSV strings from DB
            setSelectedHotelCategoryIds(csvToNumberArray(p.preferred_hotel_category));
            setSelectedHotelFacilityIds(csvToStringArray(p.hotel_facilities));

            if (Array.isArray(existing.routes) && existing.routes.length) {
              setRouteDetails(
  existing.routes.map((r: any, idx: number): RouteRow => ({
    id: idx + 1,
    day: r.no_of_days ?? idx + 1,
    date: r.itinerary_route_date
      ? toDDMMYYYY(new Date(r.itinerary_route_date))
      : "",
    source: r.location_name ?? "",
    next: r.next_visiting_location ?? "",
    via: r.via_route ?? "",
    via_routes: Array.isArray(r.via_routes)
      ? r.via_routes.map((vr: any) => ({
          itinerary_via_location_ID: Number(vr.itinerary_via_location_ID),
          itinerary_via_location_name: String(vr.itinerary_via_location_name),
        }))
      : [],
    no_of_km:
      r.no_of_km !== undefined &&
      r.no_of_km !== null &&
      String(r.no_of_km).trim() !== ""
        ? Number(r.no_of_km)
        : 0,
    directVisit: r.direct_to_next_visiting_place === 1 ? "Yes" : "No",
  }))
);
              
            }

            if (Array.isArray(existing.vehicles) && existing.vehicles.length) {
              setVehicles(
                existing.vehicles.map((v: any, idx: number): VehicleRow => ({
                  id: idx + 1,
                  type: v.vehicle_type_id ? String(v.vehicle_type_id) : "",
                  count: v.vehicle_count ?? 1,
                }))
              );
            }
          }
        }
      } catch (err) {
        console.error("Failed to load data", err);
      } finally {
        setLoading(false);
      }
    })();
  }, [itineraryPlanId, setRouteDetails]);

  useEffect(() => {
    if (itineraryPlanId) return;
    if (!arrivalLocation || !departureLocation || !tripStartDate || !tripEndDate) return;

    const dayCount = calculateDaysBetweenDates(tripStartDate, tripEndDate);
    const key = `${arrivalLocation.trim().toLowerCase()}|${departureLocation
      .trim()
      .toLowerCase()}|${dayCount}`;

    if (templateAppliedKey === key) return;

    let cancelled = false;

    (async () => {
      try {
        const match = await ItineraryService.getReusableTemplateMatch(
          arrivalLocation,
          departureLocation,
          dayCount,
        );

        if (cancelled) return;

        if (!match?.found || !match?.template) {
          setTemplateAppliedKey(key);
          return;
        }

        const template = match.template;
        const plan = template?.plan;

        if (plan) {
          setItineraryPreference(
            plan.itinerary_preference === 2
              ? "vehicle"
              : plan.itinerary_preference === 1
              ? "hotel"
              : "both",
          );

          setItineraryTypeSelect(
            plan.itinerary_type != null ? String(plan.itinerary_type) : "",
          );
          setArrivalType(plan.arrival_type != null ? String(plan.arrival_type) : "");
          setDepartureType(plan.departure_type != null ? String(plan.departure_type) : "");
          setEntryTicketRequired(
            plan.entry_ticket_required != null
              ? String(plan.entry_ticket_required)
              : "",
          );
          setGuideRequired(
            plan.guide_for_itinerary != null ? String(plan.guide_for_itinerary) : "",
          );
          setNationality(plan.nationality != null ? String(plan.nationality) : "");
          setFoodPreference(plan.food_type != null ? String(plan.food_type) : "");
          setBudget(plan.expecting_budget ?? "");
          setSpecialInstructions(plan.special_instructions ?? "");
          setSelectedHotelCategoryIds(csvToNumberArray(plan.preferred_hotel_category));
          setSelectedHotelFacilityIds(csvToStringArray(plan.hotel_facilities));
        }

        if (Array.isArray(template?.routes) && template.routes.length) {
          setRouteDetails(
            template.routes.map((r: any, idx: number): RouteRow => ({
              id: idx + 1,
              day: r.no_of_days ?? idx + 1,
              date: r.itinerary_route_date
                ? toDDMMYYYY(new Date(r.itinerary_route_date))
                : addDaysToDDMMYYYY(tripStartDate, idx),
              source: r.location_name ?? "",
              next: r.next_visiting_location ?? "",
              via: r.via_route ?? "",
              via_routes: Array.isArray(r.via_routes)
                ? r.via_routes.map((vr: any) => ({
                    itinerary_via_location_ID: Number(vr.itinerary_via_location_ID),
                    itinerary_via_location_name: String(vr.itinerary_via_location_name),
                  }))
                : [],
              no_of_km:
                r.no_of_km !== undefined &&
                r.no_of_km !== null &&
                String(r.no_of_km).trim() !== ""
                  ? Number(r.no_of_km)
                  : 0,
              directVisit: r.direct_to_next_visiting_place === 1 ? "Yes" : "No",
            })),
          );
        }

        if (Array.isArray(template?.vehicles) && template.vehicles.length) {
          setVehicles(
            template.vehicles.map((v: any, idx: number): VehicleRow => ({
              id: idx + 1,
              type: v.vehicle_type_id ? String(v.vehicle_type_id) : "",
              count: v.vehicle_count ?? 1,
            })),
          );
        }

        setTemplateAppliedKey(key);
        toast({
          title: "Template loaded",
          description: "Applied saved itinerary template for this route and duration.",
        });
      } catch (error) {
        console.error("Failed to load matching itinerary template", error);
        if (!cancelled) setTemplateAppliedKey(key);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [
    itineraryPlanId,
    arrivalLocation,
    departureLocation,
    tripStartDate,
    tripEndDate,
    templateAppliedKey,
    toast,
    setRouteDetails,
  ]);

  // Auto-open route suggestions modal when itinerary type is "Default"
  useEffect(() => {
    if (itineraryTypeSelect && itineraryTypes.length > 0) {
      const selectedType = itineraryTypes.find(
        (t) => t.id === itineraryTypeSelect
      );

      // Check if the selected type is "Default"
      if (selectedType?.label === "Default") {
        // Check if we have required fields
        if (
          arrivalLocation &&
          departureLocation &&
          tripStartDate &&
          tripEndDate
        ) {
          const noOfDays = routeDetails.length || 1;
          setShowDefaultRouteSuggestions(true);
        }
      }
    }
  }, [itineraryTypeSelect, itineraryTypes, arrivalLocation, departureLocation, tripStartDate, tripEndDate, routeDetails.length]);

  useEffect(() => {
    let isMounted = true;
    const trimmed = arrivalLocation.trim();

    if (!trimmed) {
      setVehicleTypes([]);
      setSelectedVehicleIds([]);
      return;
    }

    (async () => {
      try {
        const result = await fetchEligibleVehicleTypes(trimmed, itineraryPlanId ?? null);
        if (!isMounted) return;
        setVehicleTypes(result.vehicleTypes);
        setSelectedVehicleIds(result.selectedVehicleIds);
      } catch (error) {
        console.error("Failed to load eligible vehicle types", error);
        if (isMounted) {
          setVehicleTypes([]);
          setSelectedVehicleIds([]);
        }
      }
    })();

    return () => {
      isMounted = false;
    };
  }, [arrivalLocation, itineraryPlanId]);

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

  const validateBeforeSave = (): boolean => {
    const errors: ValidationErrors = {};

    if (!agentId) errors.agentId = "Please select an Agent";
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
    if (!foodPreference) errors.foodPreference = "Please select Food Preference";

    if (
      (itineraryPreference === "hotel" || itineraryPreference === "both") &&
      selectedHotelCategoryIds.length === 0
    ) {
      errors.hotelCategory = "Please select at least one Hotel Category";
    }



    const firstRoute = routeDetails[0];
    if (!firstRoute?.source) errors.firstRouteSource = "Please fill first day Source location";
    if (!firstRoute?.next) errors.firstRouteNext = "Please fill first day Next Destination";

    if (itineraryPreference === "vehicle" || itineraryPreference === "both") {
      const missingType = vehicles.some((v) => !v.type);
      if (missingType) errors.vehicleType = "Please select Vehicle Type for all rows";
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

// ✅ COPY-PASTE: buildPayload() (replace your existing one)

// ----------------- SAVE -----------------

// ✅ REPLACE existing buildPayload with this one
const buildPayload = () => {
  const { totalAdults, totalChildren, totalInfants, travellerRows } =
    buildTravellers();

  // ---- helper: always produce a valid numeric id (prevents NaN->null) ----
  const resolveOptionId = (raw: any, options: SimpleOption[]): number => {
    const s = String(raw ?? "").trim();
    if (!s) return 0;

    const direct = Number(s);
    if (Number.isFinite(direct)) return direct;

    const target = s.toLowerCase();
    const match =
      options.find(
        (o) => String(o.label ?? "").trim().toLowerCase() === target,
      ) ||
      options.find((o) =>
        String(o.label ?? "").trim().toLowerCase().includes(target),
      ) ||
      options.find((o) =>
        target.includes(String(o.label ?? "").trim().toLowerCase()),
      );

    const idNum = Number((match as any)?.id);
    return Number.isFinite(idNum) ? idNum : 0;
  };

  const itinerary_type =
    itineraryTypeSelect && itineraryTypeSelect !== ""
      ? Number(itineraryTypeSelect)
      : itineraryPreference === "vehicle"
      ? 1
      : itineraryPreference === "hotel"
      ? 2
      : 3;

  const itinerary_preference =
    itineraryPreference === "vehicle"
      ? 2
      : itineraryPreference === "hotel"
      ? 1
      : 3;

  const routes = routeDetails.map((r) => ({
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

  const food_type_id = resolveOptionId(foodPreference, foodPreferences);

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

  // ✅ base plan without id
  const planBase: any = {
    agent_id: (agentId as number) ?? 0,
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
    departure_type: arrivalType ? Number(arrivalType) : 0,  // ✅ Auto-default to arrivalType

    no_of_nights: noOfNights,
    no_of_days: noOfDays,

    budget: budget === "" ? 0 : Number(budget),

    entry_ticket_required: entryTicketRequired
      ? Number(entryTicketRequired)
      : 0,
    guide_for_itinerary: guideRequired ? Number(guideRequired) : 0,
    nationality: nationality ? Number(nationality) : 0,

    food_type: food_type_id,

    adult_count: totalAdults,
    child_count: totalChildren,
    infant_count: totalInfants,

    special_instructions: specialInstructions || "",
  };

  // ✅ inject itinerary_plan_id ONLY when editing
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
            vehicle_type_id: v.type ? Number(v.type) : 0,
            vehicle_count: v.count ?? 1,
          }))
        : [],
    travellers: travellerRows,
  };

  return payload;
};

  const handleSaveClick = () => {
    const ok = validateBeforeSave();
    if (!ok) return;

    const payload = buildPayload();
    setPendingPayload(payload);
    setShowRouteConfirm(true);
  };

  const handleConfirmClose = () => {
    if (isSaving) return;
    setShowRouteConfirm(false);
  };

const handleSaveWithType = async (
  type: "itineary_basic_info" | "itineary_basic_info_with_optimized_route",
) => {
  try {
    setIsSaving(true);

    const basePayload = pendingPayload ?? buildPayload();
    const isUpdate = !!itineraryPlanId;

    // ✅ Single POST endpoint for both create & update
    const res = await ItineraryService.create(basePayload, type);

    // ✅ planId for internal editing, quoteId for redirect to details
    const rawPlanId =
      res?.planId != null
        ? res.planId
        : itineraryPlanId;

    const nextId =
      rawPlanId !== undefined && rawPlanId !== null && !Number.isNaN(Number(rawPlanId))
        ? Number(rawPlanId)
        : null;

    const quoteId =
      res?.quoteId && typeof res.quoteId === "string"
        ? res.quoteId
        : null;

    toast({
      title: isUpdate ? "Itinerary updated" : "Itinerary created",
      description: isUpdate
        ? "The itinerary has been updated successfully."
        : "The itinerary has been created successfully.",
    });

    setShowRouteConfirm(false);

    // ✅ NEW: redirect to itinerary-details using quoteId
    if (quoteId) {
      navigate(`/itinerary-details/${quoteId}`, { replace: true });
      return;
    }

    // ⬇️ Fallback: if quoteId is missing, keep old behavior (stay on edit page)
    if (nextId) {
      navigate(`/create-itinerary?id=${nextId}`, { replace: true });
    }
  } catch (err) {
    console.error("Failed to save itinerary", err);
    toast({
      title: "Save failed",
      description: "There was an error while saving the itinerary.",
      variant: "destructive",
    });
  } finally {
    setIsSaving(false);
  }
};



  // ----------------- UI -----------------

  if (loading) {
    return <div className="p-4">Loading...</div>;
  }

 const noOfNights = calculateNights(tripStartDate, tripEndDate);
const noOfDays = tripStartDate && tripEndDate ? Math.max(1, noOfNights + 1) : 1;

  return (
    <div className="p-4 space-y-4">
      <ItineraryPlanBlock
        agents={agents}
        agentId={agentId}
        setAgentId={setAgentId}
        locations={locations}
        arrivalLocation={arrivalLocation}
        setArrivalLocation={setArrivalLocation}
        departureLocation={departureLocation}
        setDepartureLocation={setDepartureLocation}
        itineraryTypes={itineraryTypes}
        itineraryTypeSelect={itineraryTypeSelect}
        setItineraryTypeSelect={setItineraryTypeSelect}
        itineraryPreference={itineraryPreference}
        setItineraryPreference={setItineraryPreference}
        travelTypes={travelTypes}
        arrivalType={arrivalType}
        setArrivalType={setArrivalType}
        departureType={departureType}
        setDepartureType={setDepartureType}
        entryTicketOptions={entryTicketOptions}
        entryTicketRequired={entryTicketRequired}
        setEntryTicketRequired={setEntryTicketRequired}
        budget={budget}
        setBudget={setBudget}
        rooms={rooms}
        setRooms={setRooms}
        addRoom={addRoom}
        removeRoom={removeRoom}
        guideOptions={guideOptions}
        guideRequired={guideRequired}
        setGuideRequired={setGuideRequired}
        nationalities={nationalities}
        nationality={nationality}
        setNationality={setNationality}
        foodPreferences={foodPreferences}
        foodPreference={foodPreference}
        setFoodPreference={setFoodPreference}
        tripStartDate={tripStartDate}
        setTripStartDate={setTripStartDate}
        tripEndDate={tripEndDate}
        setTripEndDate={setTripEndDate}
        startTime={startTime}
        setStartTime={setStartTime}
        endTime={endTime}
        setEndTime={setEndTime}
        hotelCategoryOptions={hotelCategoryOptions}
        hotelFacilityOptions={hotelFacilityOptions}
        specialInstructions={specialInstructions}
        setSpecialInstructions={setSpecialInstructions}
        validationErrors={validationErrors}
        selectedHotelCategoryIds={selectedHotelCategoryIds}
        setSelectedHotelCategoryIds={setSelectedHotelCategoryIds}
        selectedHotelFacilityIds={selectedHotelFacilityIds}
        setSelectedHotelFacilityIds={setSelectedHotelFacilityIds}
        noOfNights={noOfNights}
        noOfDays={noOfDays}
      />

      <div
        data-field="firstRouteSource"
        className={
          validationErrors.firstRouteSource || validationErrors.firstRouteNext
            ? "border border-red-500 rounded-md p-2"
            : ""
        }
      >
        {/* Show default routes if itinerary type is "Default" */}
        {itineraryTypeSelect && itineraryTypes.find((t) => t.id === itineraryTypeSelect)?.label === "Default" ? (
          <DefaultRoutesSuggestions
            arrivalLocation={arrivalLocation}
            departureLocation={departureLocation}
            noOfDays={calculateDaysBetweenDates(tripStartDate, tripEndDate)}
            startDate={tripStartDate}
            endDate={tripEndDate}
            onNoRoutesFound={() => {
              const customizeType = itineraryTypes.find((t) => t.label === "Customize");
              if (customizeType) {
                setItineraryTypeSelect(customizeType.id);
              }
            }}
            locations={locations}
            routeDetails={routeDetails}
            setRouteDetails={setRouteDetails}
            onOpenViaRoutes={openViaRoutes}
          />
        ) : (
                   <RouteDetailsBlock
            locations={locations}
            routeDetails={routeDetails}
            setRouteDetails={setRouteDetails}
            onOpenViaRoutes={openViaRoutes}
            onRefreshRouteDistance={refreshRouteDistance}
            departureLocation={departureLocation}
            hideIntercityKm={false}
            onDeleteDay={deleteDay}
            addDay={addDay}
          />
        )}
        {validationErrors.firstRouteSource && (
          <p className="mt-1 text-xs text-red-500">{validationErrors.firstRouteSource}</p>
        )}
        {validationErrors.firstRouteNext && (
          <p className="mt-1 text-xs text-red-500">{validationErrors.firstRouteNext}</p>
        )}
      </div>

      <div
        data-field="vehicleType"
        className={validationErrors.vehicleType ? "border border-red-500 rounded-md p-2" : ""}
      >
        <VehicleBlock
          vehicleTypes={vehicleTypes}
          vehicles={vehicles}
          setVehicles={setVehicles}
          selectedVehicleIds={selectedVehicleIds}
          addVehicle={addVehicle}
          removeVehicle={removeVehicle}
          itineraryPreference={itineraryPreference}
        />
        {validationErrors.vehicleType && (
          <p className="mt-1 text-xs text-red-500">{validationErrors.vehicleType}</p>
        )}
      </div>

      <div className="flex justify-center pt-4">
        <Button
          onClick={handleSaveClick}
          disabled={isSaving}
          className="min-w-[220px] rounded-full bg-gradient-to-r from-[#ff5aa5] to-[#7b3fe4] py-2 text-base font-semibold text-white shadow-md hover:opacity-90 disabled:opacity-60"
        >
          {isSaving ? "Saving..." : "Save & Continue"}
        </Button>
      </div>

      <SaveRouteConfirmDialog
        open={showRouteConfirm}
        isSaving={isSaving}
        onClose={handleConfirmClose}
        onSaveSameRoute={() => handleSaveWithType("itineary_basic_info")}
        onOptimizeRoute={() => handleSaveWithType("itineary_basic_info_with_optimized_route")}
      />

      <ViaRouteDialog
        open={viaDialogOpen}
        onOpenChange={handleViaDialogOpenChange}
        routes={viaRoutes}
        loading={viaRoutesLoading}
        activeRoute={
          activeViaRouteRow
            ? {
                day: activeViaRouteRow.day,
                date: activeViaRouteRow.date,
                source: activeViaRouteRow.source,
                next: activeViaRouteRow.next,
                initialSelected: splitViaString(activeViaRouteRow.via),
              }
            : null
        }
        initialIds={activeViaRouteIds}
        maxRoutes={2}
        onSubmit={handleViaDialogSubmit}
      />

    </div>
  );
};

export default CreateItinerary;
