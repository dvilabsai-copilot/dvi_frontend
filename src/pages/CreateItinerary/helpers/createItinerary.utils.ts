/* eslint-disable @typescript-eslint/no-explicit-any */
import { getToken } from "@/lib/api";
import type {
  LocationOption,
  MealPlanOption,
  SimpleOption,
} from "@/services/itineraryDropdownsMock";
import type { RoomRow as TravellerRoomRow } from "./useRoomsAndTravellers";

export type VehicleRow = {
  id: number;
  vehicle_details_id?: number;
  type: string;
  count: number;
};

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

// âœ… Use UTC so "2025-12-10T11:00:00.000Z" shows as 11:00 instead of 16:30 in IST
export function safeTimeFromISO(iso?: string | null, fallback = ""): string {
  if (!iso) return fallback;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return fallback;
  return `${pad2(d.getUTCHours())}:${pad2(d.getUTCMinutes())}`;
}

export function safeDateFromISO(iso?: string | null, fallback = ""): string {
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

export function resolveFirstNonEmptyNumberList(...values: unknown[]): number[] {
  for (const value of values) {
    const ids = csvToNumberArray(value);
    if (ids.length > 0) {
      return ids;
    }
  }

  return [];
}

export function resolveFirstNonEmptyStringList(...values: unknown[]): string[] {
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

export function buildVehicleRouteLocationPayload({
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

  // âœ… Customize safety:
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

export function getTravellerCountsFromRooms(rooms: TravellerRoomRow[]) {
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

export function getTotalTravellingPaxFromCounts(counts: {
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

export function getVehicleTypeIdsFromOptions(options: unknown): string[] {
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

export function getVehiclePaxValidationError({
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

export function resolveMealPlanCodeFromPlan(plan: any, mealPlans: MealPlanOption[]): string {
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

export function buildRoomsFromTravellers(travellers: any[]): TravellerRoomRow[] {
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
export function buildRoomsFromPlanSummary(plan: any): TravellerRoomRow[] {
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
export function calculateDaysBetweenDates(startDate: string, endDate: string): number {
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

export function parseDDMMYYYY(value: string): Date | null {
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

export function addDaysToDDMMYYYY(value: string, daysToAdd: number): string {


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

export function getLoggedInUserContext(): { role: number | null; agentId: number | null } {
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
