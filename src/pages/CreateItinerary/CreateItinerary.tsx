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

type VehicleRow = {
  id: number;
  vehicle_details_id?: number;
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

function safeDateFromISO(iso?: string | null, fallback = ""): string {
  if (!iso) return fallback;

  const raw = String(iso).trim();
  const ymdMatch = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (ymdMatch) {
    const [, year, month, day] = ymdMatch;
    return `${day}/${month}/${year}`;
  }

  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return fallback;
  return `${pad2(d.getUTCDate())}/${pad2(d.getUTCMonth() + 1)}/${d.getUTCFullYear()}`;
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

function resolveFirstNonEmptyNumberList(...values: unknown[]): number[] {
  for (const value of values) {
    const ids = csvToNumberArray(value);
    if (ids.length > 0) {
      return ids;
    }
  }

  return [];
}

function resolveFirstNonEmptyStringList(...values: unknown[]): string[] {
  for (const value of values) {
    const items = csvToStringArray(value);
    if (items.length > 0) {
      return items;
    }
  }

  return [];
}

function normalizeRouteLocationList(values: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];

  for (const value of values) {
    const trimmed = String(value ?? "").trim();
    if (!trimmed) continue;

    const key = trimmed.toLowerCase();
    if (seen.has(key)) continue;

    seen.add(key);
    result.push(trimmed);
  }

  return result;
}

function simplifyVehicleLocationName(value: string): string {
  const raw = String(value ?? "").trim();
  if (!raw) return "";

  // Example: "Kanchipuram, Tamil Nadu, India" -> "Kanchipuram"
  const beforeComma = raw.split(",")[0]?.trim();
  if (beforeComma && beforeComma !== raw) {
    return beforeComma;
  }

  // Example: "Chennai International Airport" -> "Chennai"
  const airportMatch = raw.match(/^(.+?)\s+(?:International\s+)?Airport$/i);
  if (airportMatch?.[1]) {
    return airportMatch[1].trim();
  }

  // Example: "Madurai Airport" -> "Madurai"
  const simpleAirportMatch = raw.match(/^(.+?)\s+Airport$/i);
  if (simpleAirportMatch?.[1]) {
    return simpleAirportMatch[1].trim();
  }

  // Example: "Kanchipuram Railway Station" -> "Kanchipuram"
  const railwayMatch = raw.match(/^(.+?)\s+(?:Railway Station|Central)$/i);
  if (railwayMatch?.[1]) {
    return railwayMatch[1].trim();
  }

  return raw;
}

function buildVehicleRouteLocationPayload({
  rows,
  arrivalLocation,
  departureLocation,
  simplify = false,
}: {
  rows: any[];
  arrivalLocation: string;
  departureLocation: string;
  simplify?: boolean;
}) {
  const safeRows = Array.isArray(rows) ? rows : [];
  const pairs: Array<{ source: string; next: string }> = [];
  const seen = new Set<string>();

  const pushPair = (sourceValue: string, nextValue: string) => {
    let source = String(sourceValue || "").trim();
    let next = String(nextValue || "").trim();

    if (simplify) {
      source = simplifyVehicleLocationName(source);
      next = simplifyVehicleLocationName(next);
    }

    if (!source || !next) return;

    const key = `${source.toLowerCase()}|${next.toLowerCase()}`;
    if (seen.has(key)) return;

    seen.add(key);
    pairs.push({ source, next });
  };

  // ✅ Customize safety:
  // Sometimes routeDetails has not been fully synced yet,
  // but arrival/departure are already selected.
  // So do not keep vehicle dropdown permanently disabled.
  if (safeRows.length === 0) {
    pushPair(arrivalLocation, departureLocation);

    return {
      sourceLocation: pairs.map((pair) => pair.source),
      nextVisitingLocation: pairs.map((pair) => pair.next),
    };
  }

  const lastIndex = safeRows.length - 1;

  safeRows.forEach((row, index) => {
    let source = String(row?.source || "").trim();
    let next = String(row?.next || "").trim();

    if (index === 0 && !source) {
      source = String(arrivalLocation || "").trim();
    }

    if (index === lastIndex && !next) {
      next = String(departureLocation || "").trim();
    }

    pushPair(source, next);
  });

  return {
    sourceLocation: pairs.map((pair) => pair.source),
    nextVisitingLocation: pairs.map((pair) => pair.next),
  };
}

function getTravellerCountsFromRooms(rooms: TravellerRoomRow[]) {
  return (rooms || []).reduce(
    (acc, room) => {
      const adults = Number(room?.adults || 0);
      const children = Number(room?.children || 0);
      const infants = Number(room?.infants || 0);

      acc.totalAdults += Number.isFinite(adults) ? adults : 0;
      acc.totalChildren += Number.isFinite(children) ? children : 0;
      acc.totalInfants += Number.isFinite(infants) ? infants : 0;

      return acc;
    },
    {
      totalAdults: 0,
      totalChildren: 0,
      totalInfants: 0,
    }
  );
}

function getTotalTravellingPaxFromCounts(counts: {
  totalAdults: number;
  totalChildren: number;
  totalInfants: number;
}) {
  return (
    Number(counts.totalAdults || 0) +
    Number(counts.totalChildren || 0) +
    Number(counts.totalInfants || 0)
  );
}

function getVehicleTypeIdsFromOptions(options: unknown): string[] {
  if (!Array.isArray(options)) return [];

  return options
    .map((item: any) => String(item?.id ?? "").trim())
    .filter(Boolean);
}

function getPositiveNumber(value: unknown): number | null {
  const numeric = Number(value);

  if (!Number.isFinite(numeric) || numeric <= 0) {
    return null;
  }

  return numeric;
}

function getVehicleOptionCapacity(option?: SimpleOption): number | null {
  if (!option) return null;

  const item = option as any;

  const directCapacityKeys = [
    "seating_capacity",
    "seat_capacity",
    "capacity",
    "vehicle_capacity",
    "pax_capacity",
    "max_pax",
    "max_pax_count",
    "max_passengers",
    "passenger_capacity",
    "no_of_seats",
    "total_seats",
  ];

  for (const key of directCapacityKeys) {
    const value = getPositiveNumber(item?.[key]);

    if (value !== null) {
      return Math.floor(value);
    }
  }

  const label = String(item?.label ?? item?.name ?? "").trim();
  const labelLower = label.toLowerCase();

  const labelledCapacityMatch = labelLower.match(
    /(\d+)\s*(?:seater|seat|seats|pax|passenger|passengers)/i
  );

  if (labelledCapacityMatch?.[1]) {
    return Number(labelledCapacityMatch[1]);
  }

  if (/bus|coach/.test(labelLower)) return 35;
  if (/tempo|traveller|traveler/.test(labelLower)) return 10;
  if (/innova|crysta/.test(labelLower)) return 6;
  if (/ertiga|xl6/.test(labelLower)) return 6;
  if (/\bmuv\b|\bsuv\b|xuv|scorpio|bolero/.test(labelLower)) return 6;
  if (/sedan|dzire|swift|etios|aura|amaze|xcent/.test(labelLower)) return 4;
  if (/hatchback|hatch/.test(labelLower)) return 4;

  return null;
}

function getVehiclePaxValidationError({
  vehicles,
  vehicleTypes,
  eligibleVehicleTypeIds,
  totalTravellingPax,
}: {
  vehicles: VehicleRow[];
  vehicleTypes: SimpleOption[];
  eligibleVehicleTypeIds: string[];
  totalTravellingPax: number;
}) {
  if (totalTravellingPax <= 0) return "";

  const selectedVehicles = (vehicles || []).filter((vehicle) => !!vehicle.type);
  if (selectedVehicles.length === 0) return "";

  let allSelectedCapacitiesKnown = true;
  let totalSelectedVehicleCapacity = 0;

  for (const vehicle of selectedVehicles) {
    const selectedVehicleType = (vehicleTypes || []).find(
      (item) => String(item.id) === String(vehicle.type)
    );

    const capacityPerVehicle = getVehicleOptionCapacity(selectedVehicleType);

    if (capacityPerVehicle === null) {
      allSelectedCapacitiesKnown = false;
      break;
    }

    const vehicleCount = Math.max(
      1,
      Math.floor(Number(vehicle.count || 1)) || 1
    );

    totalSelectedVehicleCapacity += capacityPerVehicle * vehicleCount;
  }

  if (allSelectedCapacitiesKnown) {
    if (totalSelectedVehicleCapacity < totalTravellingPax) {
      return `Selected vehicle capacity is ${totalSelectedVehicleCapacity} pax, but total travelling pax is ${totalTravellingPax}. Please increase vehicle count or select a bigger vehicle.`;
    }

    return "";
  }

  const apiEligibleVehicleTypeIds = new Set(
    (eligibleVehicleTypeIds || []).map((id) => String(id))
  );

  const selectedVehicleNotEligible =
    apiEligibleVehicleTypeIds.size > 0 &&
    selectedVehicles.some(
      (vehicle) => !apiEligibleVehicleTypeIds.has(String(vehicle.type))
    );

  if (selectedVehicleNotEligible) {
    return `Selected vehicle is not sufficient for ${totalTravellingPax} travelling pax. Please select an eligible vehicle.`;
  }

  return "";
}

function resolveMealPlanCodeFromPlan(plan: any, mealPlans: MealPlanOption[]): string {
  const codeFromPlan = typeof plan?.meal_plan_code === "string" ? plan.meal_plan_code.trim() : "";
  if (codeFromPlan) {
    const matchedByCode = (mealPlans || []).find((mp) => mp.code === codeFromPlan);
    return matchedByCode?.code || codeFromPlan;
  }

  const breakfast = Number(plan?.meal_plan_breakfast ?? 0) ? 1 : 0;
  const lunch = Number(plan?.meal_plan_lunch ?? 0) ? 1 : 0;
  const dinner = Number(plan?.meal_plan_dinner ?? 0) ? 1 : 0;
  const hasExplicitFlags = breakfast === 1 || lunch === 1 || dinner === 1;

  if (!hasExplicitFlags) return "__ALL__";

  const matchedByFlags = (mealPlans || []).find(
    (mp) =>
      Number(mp.includesBreakfast) === breakfast &&
      Number(mp.includesLunch) === lunch &&
      Number(mp.includesDinner) === dinner,
  );

  return matchedByFlags?.code || "__ALL__";
}

function mapPhpBedTypeToUiValue(bedType: unknown): "Without Bed" | "With Bed" {
  return Number(bedType) === 2 ? "With Bed" : "Without Bed";
}

function buildRoomsFromTravellers(travellers: any[]): TravellerRoomRow[] {
  if (!Array.isArray(travellers) || travellers.length === 0) {
    return [
      {
        id: 1,
        roomCount: 1,
        adults: 2,
        children: 0,
        infants: 0,
        childrenDetails: [],
      },
    ];
  }

  const roomMap = new Map<number, TravellerRoomRow>();

  const getRoom = (roomId: number) => {
    if (!roomMap.has(roomId)) {
      roomMap.set(roomId, {
        id: roomId,
        roomCount: 0,
        adults: 0,
        children: 0,
        infants: 0,
        childrenDetails: [],
      });
    }

    return roomMap.get(roomId)!;
  };

  for (const t of travellers) {
    const roomId = Number(t?.room_id ?? 0);
    if (roomId <= 0) continue;

    const room = getRoom(roomId);
    const type = Number(t?.traveller_type ?? 0);

    if (type === 1) {
      room.adults += 1;
      continue;
    }

    if (type === 2) {
      room.children += 1;
      room.childrenDetails.push({
        age:
          t?.traveller_age !== null &&
          t?.traveller_age !== undefined &&
          String(t.traveller_age).trim() !== "" &&
          !Number.isNaN(Number(t.traveller_age))
            ? Number(t.traveller_age)
            : "",
        bedType: mapPhpBedTypeToUiValue(t?.child_bed_type),
      });
      continue;
    }

    if (type === 3) {
      room.infants += 1;
    }
  }

  const rooms = Array.from(roomMap.values()).sort((a, b) => a.id - b.id);
  const totalRoomCount = rooms.length || 1;

  return rooms.map((room) => {
    const totalPeople =
      Number(room.adults || 0) +
      Number(room.children || 0) +
      Number(room.infants || 0);

    return {
      ...room,
      roomCount: totalRoomCount,
      adults: totalPeople >= 2 ? room.adults : room.adults + (2 - totalPeople),
    };
  });
}
function buildRoomsFromPlanSummary(plan: any): TravellerRoomRow[] {
 const roomCount = Math.max(Number(plan?.preferred_room_count ?? 1) || 1, 1);
const minimumAdultsForRooms = roomCount * 2;
const totalAdults = Math.max(
  Number(plan?.total_adult ?? minimumAdultsForRooms) || minimumAdultsForRooms,
  minimumAdultsForRooms,
);
  const totalChildren = Math.max(Number(plan?.total_children ?? 0) || 0, 0);
  const totalInfants = Math.max(Number(plan?.total_infants ?? 0) || 0, 0);
  const childrenWithBed = Math.max(Number(plan?.total_child_with_bed ?? 0) || 0, 0);
  const childrenWithoutBed = Math.max(Number(plan?.total_child_without_bed ?? 0) || 0, 0);

  const rooms: TravellerRoomRow[] = Array.from({ length: roomCount }, (_, idx) => ({
    id: idx + 1,
    roomCount,
    adults: 0,
    children: 0,
    infants: 0,
    childrenDetails: [],
  }));

  for (let i = 0; i < totalAdults; i++) {
    rooms[i % roomCount].adults += 1;
  }

  for (let i = 0; i < totalChildren; i++) {
    const room = rooms[i % roomCount];
    room.children += 1;
    const isWithoutBed = i < childrenWithoutBed;
    const isWithBed = i >= childrenWithoutBed && i < childrenWithoutBed + childrenWithBed;
    room.childrenDetails.push({
      age: "",
      bedType: isWithoutBed ? "Without Bed" : isWithBed ? "With Bed" : "Without Bed",
    });
  }

  for (let i = 0; i < totalInfants; i++) {
    rooms[i % roomCount].infants += 1;
  }

  return rooms;
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

function parseJwt(token: string) {
  try {
    const base64Url = token.split(".")[1];
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), "=");
    return JSON.parse(atob(padded));
  } catch {
    return null;
  }
}

function getLoggedInUserContext(): { role: number | null; agentId: number | null } {
  const token = getToken();
  if (!token) return { role: null, agentId: null };

  const user = parseJwt(token);
  const role = Number(user?.role);
  const rawAgentId = user?.agentId ?? user?.id ?? user?.agent_ID ?? null;
  const agentId = Number(rawAgentId);

  return {
    role: Number.isFinite(role) ? role : null,
    agentId: Number.isFinite(agentId) && agentId > 0 ? agentId : null,
  };
}

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
  const [foodPreference, setFoodPreference] = useState(""); // ✅ store option id string
  const [mealPlanCode, setMealPlanCode] = useState<string>("__ALL__");

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

// ✅ Prevent old vehicle-type API responses from clearing latest Customize route result
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
      (vehicles.every((v) => !!v.type) && !vehiclePaxValidationError);
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
  vehiclePaxValidationError,
]);

useEffect(() => {
  return () => {
    stopSaveProgress();
  };
}, []);

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
          mealPlansRes,
          hotelCatRes,
          hotelFacilityRes,
        ] = await Promise.all([
          fetchAgents(),
          fetchStoredSourceLocations(),
          fetchItineraryTypes(),
          fetchTravelTypes(),
          fetchEntryTicketOptions(),
          fetchGuideOptions(),
          fetchNationalities(),
          fetchFoodPreferences(),
          fetchMealPlans(),
          fetchHotelCategories(),
          fetchHotelFacilities(),
        ]);

        setAgents(
          isAgentLogin && loggedInAgentId
            ? agentsRes.filter((a) => Number(a.id) === Number(loggedInAgentId))
            : agentsRes
        );
        setLocations(locationsRes);
        setItineraryTypes(itineraryTypesRes);
        setTravelTypes(travelTypesRes);
        setEntryTicketOptions(entryTicketRes);
        setGuideOptions(guideRes);
        setNationalities(nationalityRes);
        setFoodPreferences(foodRes);
        setMealPlanOptions(mealPlansRes);
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
                ? safeDateFromISO(p.trip_start_date_and_time)
                : ""
            );
            setTripEndDate(
              p.trip_end_date_and_time
                ? safeDateFromISO(p.trip_end_date_and_time)
                : ""
            );

            // ✅ also prefill times
setStartTime(safeTimeFromISO(p.trip_start_date_and_time, "12:00"));
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

            setMealPlanCode(resolveMealPlanCodeFromPlan(p, mealPlansRes || []));



            setSpecialInstructions(p.special_instructions ?? "");
            // ✅ PREFILL: keep hotel category/facility selections stable across edit reloads.
            setSelectedHotelCategoryIds(
              resolveFirstNonEmptyNumberList(
                p.preferred_hotel_category,
                p.preferredHotelCategory,
                existing?.preferred_hotel_category,
                existing?.preferredHotelCategory,
              ),
            );
            setSelectedHotelFacilityIds(
              resolveFirstNonEmptyStringList(
                p.hotel_facilities,
                p.hotelFacilities,
                existing?.hotel_facilities,
                existing?.hotelFacilities,
              ),
            );

            if (Array.isArray(existing.routes) && existing.routes.length) {
              setRouteDetails(
  existing.routes.map((r: any, idx: number): RouteRow => ({
    id: idx + 1,
    itinerary_route_id:
      Number(r.itinerary_route_ID || r.itinerary_route_id || 0) || undefined,
    day: r.no_of_days ?? idx + 1,
    date: r.itinerary_route_date
      ? safeDateFromISO(r.itinerary_route_date)
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
                  vehicle_details_id:
                    Number(v.vehicle_details_ID || v.vehicle_details_id || 0) || undefined,
                  type: v.vehicle_type_id ? String(v.vehicle_type_id) : "",
                  count: v.vehicle_count ?? 1,
                }))
              );
            }

            if (Array.isArray(existing.travellers) && existing.travellers.length) {
              setRooms(buildRoomsFromTravellers(existing.travellers));
            } else {
              // Some edit payloads omit travellers; hydrate rooms from persisted plan totals.
              setRooms(buildRoomsFromPlanSummary(p));
            }
          }
        }
      } catch (err) {
        console.error("Failed to load data", err);
      } finally {
        setLoading(false);
      }
    })();
  }, [itineraryPlanId, setRouteDetails, setRooms]);

useEffect(() => {
  if (itineraryPlanId) return;

  const selectedTypeLabel =
    itineraryTypes
      .find((t) => String(t.id) === String(itineraryTypeSelect))
      ?.label?.trim()
      .toLowerCase() || "";

  const isSuggestedRouteType =
    selectedTypeLabel === "default" ||
    selectedTypeLabel === "suggested routes";

  // ✅ Important:
  // Do not auto-apply reusable/default route template for Customize.
  // Customize route details must stay fully manual.
  if (!isSuggestedRouteType) return;

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

        const templateRoutes = Array.isArray(match?.template?.routes)
          ? match.template.routes
          : [];

        if (!match?.found || templateRoutes.length === 0) {
          setTemplateAppliedKey(key);
          return;
        }

        setRouteDetails((prev) =>
          Array.from({ length: dayCount }, (_, idx): RouteRow => {
            const r = templateRoutes[idx] || {};
            const previous = prev[idx];
            const viaRoutes = Array.isArray(r.via_routes)
              ? r.via_routes
                  .map((vr: any) => ({
                    itinerary_via_location_ID: Number(vr.itinerary_via_location_ID),
                    itinerary_via_location_name: String(vr.itinerary_via_location_name || ""),
                  }))
                  .filter(
                    (vr: any) =>
                      Number.isFinite(vr.itinerary_via_location_ID) &&
                      vr.itinerary_via_location_name.trim(),
                  )
              : [];
            const isFirstRow = idx === 0;
            const isLastRow = idx === dayCount - 1;

            return {
              id: idx + 1,
              day: idx + 1,
              date: addDaysToDDMMYYYY(tripStartDate, idx),
              source: isFirstRow
                ? arrivalLocation
                : String(r.location_name ?? previous?.source ?? ""),
              next: isLastRow
                ? departureLocation
                : String(r.next_visiting_location ?? previous?.next ?? ""),
              via: String(r.via_route ?? previous?.via ?? ""),
              via_routes: viaRoutes,
              no_of_km:
                r.no_of_km !== undefined &&
                r.no_of_km !== null &&
                String(r.no_of_km).trim() !== ""
                  ? Number(r.no_of_km)
                  : previous?.no_of_km ?? 0,
              directVisit: Number(r.direct_to_next_visiting_place ?? 0) === 1 ? "Yes" : "No",
            };
          }),
        );

        setTemplateAppliedKey(key);
        toast({
          title: "Route template loaded",
          description:
            "Applied saved route details only. Your itinerary preference and vehicle selections were kept unchanged.",
        });
      } catch (error) {
        console.error("Failed to load matching itinerary route template", error);
        if (!cancelled) setTemplateAppliedKey(key);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [
  itineraryPlanId,
  itineraryTypeSelect,
  itineraryTypes,
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
      const isDefaultType = selectedType?.label?.trim().toLowerCase() === "default";

      if (!isDefaultType) {
        defaultRouteWarningShownRef.current = false;
        return;
      }

      // Check if the selected type is "Default"
      if (isDefaultType) {
        const hasRequiredBasicDetails =
          Boolean(arrivalLocation) &&
          Boolean(departureLocation) &&
          Boolean(tripStartDate) &&
          Boolean(tripEndDate);

        if (hasRequiredBasicDetails) {
          defaultRouteWarningShownRef.current = false;
          setShowDefaultRouteSuggestions(true);
        } else {
          setShowDefaultRouteSuggestions(false);

          // PHP parity: warn once until user changes type or completes required fields.
          if (!defaultRouteWarningShownRef.current) {
            toast({
              title: "Warning !!!",
              description:
                "Please Fill the basic itinerary details to proceed with the default Route Suggestions",
              variant: "destructive",
            });
            defaultRouteWarningShownRef.current = true;
          }
        }
      }
    }
  }, [itineraryTypeSelect, itineraryTypes, arrivalLocation, departureLocation, tripStartDate, tripEndDate, routeDetails.length]);

 useEffect(() => {
  let isMounted = true;
  const requestId = ++vehicleTypeRequestRef.current;

  const selectedTypeLabel =
    itineraryTypes
      .find((t) => String(t.id) === String(itineraryTypeSelect))
      ?.label?.trim()
      .toLowerCase() || "";

  const isCustomizeItineraryType = selectedTypeLabel === "customize";

  const exactPayload = buildVehicleRouteLocationPayload({
    rows: routeDetails,
    arrivalLocation,
    departureLocation,
  });

  const vehicleTravellerPayload = {
    adult_count: Number(travellerCounts.totalAdults || 0),
    child_count: Number(travellerCounts.totalChildren || 0),
    infant_count: Number(travellerCounts.totalInfants || 0),
    total_pax: totalTravellingPax,
    travelling_pax: totalTravellingPax,
  };

  if (
    exactPayload.sourceLocation.length === 0 ||
    exactPayload.nextVisitingLocation.length === 0
  ) {
    setVehicleTypes([]);
    setSelectedVehicleIds([]);
    setEligibleVehicleTypeIds([]);
    return;
  }

  (async () => {
    try {
      let result = await fetchEligibleVehicleTypes({
        itineraryPlanId: itineraryPlanId ?? null,
        sourceLocation: exactPayload.sourceLocation,
        nextVisitingLocation: exactPayload.nextVisitingLocation,
        ...vehicleTravellerPayload,
      } as any);

      let hasVehicleTypes =
        Array.isArray(result?.vehicleTypes) && result.vehicleTypes.length > 0;

      let apiEligibleVehicleTypeIds = hasVehicleTypes
        ? getVehicleTypeIdsFromOptions(result?.vehicleTypes)
        : [];

      const fallbackPayload = buildVehicleRouteLocationPayload({
        rows: routeDetails,
        arrivalLocation,
        departureLocation,
        simplify: true,
      });

      const fallbackIsDifferent =
        JSON.stringify(fallbackPayload) !== JSON.stringify(exactPayload);

      // ✅ Existing exact vehicle matching stays first priority.
      if (
        !hasVehicleTypes &&
        fallbackIsDifferent &&
        fallbackPayload.sourceLocation.length > 0 &&
        fallbackPayload.nextVisitingLocation.length > 0
      ) {
        result = await fetchEligibleVehicleTypes({
          itineraryPlanId: itineraryPlanId ?? null,
          sourceLocation: fallbackPayload.sourceLocation,
          nextVisitingLocation: fallbackPayload.nextVisitingLocation,
          ...vehicleTravellerPayload,
        } as any);

        hasVehicleTypes =
          Array.isArray(result?.vehicleTypes) && result.vehicleTypes.length > 0;

        apiEligibleVehicleTypeIds = hasVehicleTypes
          ? getVehicleTypeIdsFromOptions(result?.vehicleTypes)
          : [];
      }

      // ✅ Customize-only fallback:
      // If eligible vehicle API returns empty, load normal vehicle type list.
      // This keeps Suggested Routes untouched.
      if (!hasVehicleTypes && isCustomizeItineraryType) {
        const allVehicleTypes = await fetchVehicleTypes();

        result = {
          vehicleTypes: allVehicleTypes,
          selectedVehicleIds: [],
        };
      }

      if (!isMounted || vehicleTypeRequestRef.current !== requestId) return;

      const nextVehicleTypes = Array.isArray(result?.vehicleTypes)
        ? result.vehicleTypes
        : [];

      setVehicleTypes(nextVehicleTypes);
      setEligibleVehicleTypeIds(apiEligibleVehicleTypeIds);

      setSelectedVehicleIds(
        Array.isArray(result?.selectedVehicleIds)
          ? result.selectedVehicleIds
          : []
      );
    } catch (error) {
      console.error("Failed to load eligible vehicle types", error);

      if (isMounted && vehicleTypeRequestRef.current === requestId) {
        setVehicleTypes([]);
        setSelectedVehicleIds([]);
        setEligibleVehicleTypeIds([]);
      }
    }
  })();

  return () => {
    isMounted = false;
  };
}, [
  routeDetails,
  itineraryPlanId,
  arrivalLocation,
  departureLocation,
  itineraryTypeSelect,
  itineraryTypes,
  travellerCounts.totalAdults,
  travellerCounts.totalChildren,
  travellerCounts.totalInfants,
  totalTravellingPax,
]);
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

  const validateBeforeSave = (): boolean => {
    const errors: ValidationErrors = {};

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
    if (!foodPreference) errors.foodPreference = "Please select Food Preference";

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

 const food_type_id = resolveOptionId(foodPreference, foodPreferences);

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

  // ✅ base plan without id
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
    const policy = await ItineraryService.resolveHotelArrivalPolicy(request);
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
const isSavingRef = useRef(false);

const handleSaveWithType = async (
  type: "itineary_basic_info" | "itineary_basic_info_with_optimized_route",
) => {
  if (isSavingRef.current) return; // sync guard — prevents double-fire before setState re-render
  isSavingRef.current = true;
  try {
    setIsSaving(true);
    setActiveSaveType(type);

    const basePayload = pendingPayload ?? buildPayload();
    const decision = arrivalPolicyDecisionRef.current;
    const finalPayload = {
      ...basePayload,
      previousDayBillingDecisionProvided:
        decision.previousDayBillingDecisionProvided,
      previousDayBillingConfirmed:
        decision.previousDayBillingConfirmed,
    };
    const dayCount = Math.max(1, Number(finalPayload?.plan?.no_of_days ?? 1));
    const estimatedMs = getEstimatedSaveMs(dayCount, type);
    setEstimatedSaveMs(estimatedMs);
    startSaveProgress(estimatedMs);

    const isUpdate = !!itineraryPlanId;

    // ✅ Single POST endpoint for both create & update
    const isDefaultItinerary = isDefaultItineraryTypeSelected();

const shouldCreateAllRouteOptions =
  !itineraryPlanId &&
  isDefaultItinerary &&
  Array.isArray(suggestedDefaultRoutes) &&
  suggestedDefaultRoutes.length > 1;
let res: any = null;
let createdRouteOptions: Array<{ quoteId: string; label: string }> = [];
let sharedRouteFamilyBaseQuoteId = "";

if (shouldCreateAllRouteOptions) {
  const createSuggestedRouteOption = async (route: RouteData, index: number) => {
    // Route 1 (index 0): use the user-edited finalPayload directly.
    // Route 2+ (index > 0): build payload from the raw suggested route data.
    const baseRoutePayload =
      index === 0
        ? finalPayload
        : buildPayloadForSuggestedRoute(route, finalPayload);

    const routePayload = {
      ...baseRoutePayload,
      plan: {
        ...(baseRoutePayload?.plan || {}),
        route_variant_index: index + 1,
        route_variant_count: suggestedDefaultRoutes.length,
        route_family_base_quote_id: sharedRouteFamilyBaseQuoteId || undefined,
      },
    };

    const routeRes: any = await ItineraryService.create(routePayload, type);
    const createdQuoteId = extractCreatedQuoteId(routeRes);
    const createdRouteFamilyBaseQuoteId = extractRouteFamilyBaseQuoteId(
      routeRes,
      createdQuoteId
    );

    if (!sharedRouteFamilyBaseQuoteId && createdRouteFamilyBaseQuoteId) {
      sharedRouteFamilyBaseQuoteId = createdRouteFamilyBaseQuoteId;
    }

    if (!createdQuoteId) {
      console.warn("⚠️ Suggested route created but quote ID was not found", {
        index,
        routeRes,
      });
    }

    return {
      routeRes,
      option: createdQuoteId
        ? {
            quoteId: String(createdQuoteId),
            label: `Route ${index + 1}`,
          }
        : null,
    };
  };

// Save sibling routes one-by-one with a small delay between each call.
  // Do NOT use Promise.all: backend quote ID generation is not concurrency-safe.
  // The delay prevents rapid sequential POSTs from causing 500 errors on the backend.
  const DELAY_BETWEEN_ROUTE_SAVES_MS = 300;

  for (let index = 0; index < suggestedDefaultRoutes.length; index++) {
    // Small pause between saves (skip delay for the first one)
    if (index > 0) {
      await new Promise((resolve) => setTimeout(resolve, DELAY_BETWEEN_ROUTE_SAVES_MS));
    }

    const created = await createSuggestedRouteOption(
      suggestedDefaultRoutes[index],
      index
    );

    if (index === 0) {
      res = created.routeRes;
    }

    if (created.option) {
      createdRouteOptions.push(created.option);
    }
  }
  if (createdRouteOptions.length > 0) {
    const routeOptionPayload = JSON.stringify(createdRouteOptions);

    createdRouteOptions.forEach((option) => {
      localStorage.setItem(
        `itinerary-route-options:${option.quoteId}`,
        routeOptionPayload
      );
    });
  }
} else {
  res = await ItineraryService.create(finalPayload, type);
}
setSaveProgressPercent(100);

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
      description: `${
        isUpdate
          ? "The itinerary has been updated successfully."
          : "The itinerary has been created successfully."
      }`,
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
    stopSaveProgress();
    isSavingRef.current = false;
    setIsSaving(false);
    setActiveSaveType(null);
    setTransportLoadingMessageIndex(0);
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
        isAgentLocked={Boolean(isAgentLogin && loggedInAgentId)}
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
        mealPlanOptions={mealPlanOptions}
        mealPlanCode={mealPlanCode}
        setMealPlanCode={setMealPlanCode}
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
       {/* Show suggested/default routes if itinerary type is Default/Suggested Routes */}
{itineraryTypeSelect && isDefaultItineraryTypeSelected() ? (
          <DefaultRoutesSuggestions
  arrivalLocation={arrivalLocation}
  departureLocation={departureLocation}
  noOfDays={calculateDaysBetweenDates(tripStartDate, tripEndDate)}
  startDate={tripStartDate}
  endDate={tripEndDate}
  activeRouteIndex={activeDefaultRouteIndex}
  onRoutesLoaded={(routes) => {
    setSuggestedDefaultRoutes(routes);
    setActiveDefaultRouteIndex(0);
  }}
  onRouteSelect={(route, index) => {
    setActiveDefaultRouteIndex(index);
  }}
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
            onDeleteDay={deleteDay}
          />
        ) : (
<RouteDetailsBlock
  locations={locations}
  routeDetails={routeDetails}
  setRouteDetails={setRouteDetails}
  onOpenViaRoutes={openViaRoutes}
  onRefreshRouteDistance={refreshRouteDistance}
  departureLocation={departureLocation}
  hideIntercityKm={true}
  onDeleteDay={deleteDay}
  onDeleteRouteDay={deleteRouteDay}
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
        progressPercent={saveProgressPercent}
        estimatedSeconds={Math.round((estimatedSaveMs || 0) / 1000)}
        dayCount={Math.max(1, Number(pendingPayload?.plan?.no_of_days ?? noOfDays ?? 1))}
                saveType={activeSaveType}
        transportLoadingMessage={
          TRANSPORT_LOADING_MESSAGES[
            transportLoadingMessageIndex % TRANSPORT_LOADING_MESSAGES.length
          ]
        }
        onClose={handleConfirmClose}
        onSaveSameRoute={() => handleSaveWithType("itineary_basic_info")}
        onOptimizeRoute={() => handleSaveWithType("itineary_basic_info_with_optimized_route")}
      />

      <ArrivalHotelDecisionModal
        open={arrivalPolicyModal.open}
        onOpenChange={(open) => {
          if (!open) {
            setArrivalPolicyModal({
              open: false,
              arrivalDate: "",
              previousDayDate: "",
              request: null,
            });
          }
        }}
        arrivalDate={arrivalPolicyModal.arrivalDate}
        previousDayDate={arrivalPolicyModal.previousDayDate}
        isLoading={isResolvingArrivalPolicy}
        onConfirmPreviousDayBilling={async () => {
          if (!arrivalPolicyModal.request) return;
          const decisionKey = getArrivalPolicyDecisionKey(arrivalPolicyModal.request);
          const canProceed = await runArrivalPolicyGate({
            ...arrivalPolicyModal.request,
            previousDayBillingDecisionProvided: true,
            previousDayBillingConfirmed: true,
          });
          if (!canProceed) return;

          if (decisionKey) {
            setLastArrivalPolicyDecisionKey(decisionKey);
          }

          applyArrivalPolicyDecision({
            previousDayBillingDecisionProvided: true,
            previousDayBillingConfirmed: true,
          });

          setPendingPayload((prev: any) => prev ? {
            ...prev,
            previousDayBillingDecisionProvided: true,
            previousDayBillingConfirmed: true,
          } : prev);

          setArrivalPolicyModal({
            open: false,
            arrivalDate: "",
            previousDayDate: "",
            request: null,
          });
          continueToRouteConfirmation();
        }}
        onDeclinePreviousDayBilling={async () => {
          if (!arrivalPolicyModal.request) return;
          const decisionKey = getArrivalPolicyDecisionKey(arrivalPolicyModal.request);
          const canProceed = await runArrivalPolicyGate({
            ...arrivalPolicyModal.request,
            previousDayBillingDecisionProvided: true,
            previousDayBillingConfirmed: false,
          });
          if (!canProceed) return;

          if (decisionKey) {
            setLastArrivalPolicyDecisionKey(decisionKey);
          }

          applyArrivalPolicyDecision({
            previousDayBillingDecisionProvided: true,
            previousDayBillingConfirmed: false,
          });

          setPendingPayload((prev: any) => prev ? {
            ...prev,
            previousDayBillingDecisionProvided: true,
            previousDayBillingConfirmed: false,
          } : prev);

          setArrivalPolicyModal({
            open: false,
            arrivalDate: "",
            previousDayDate: "",
            request: null,
          });
          continueToRouteConfirmation();
        }}
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
