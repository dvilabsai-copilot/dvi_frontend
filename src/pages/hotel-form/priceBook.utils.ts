/* eslint-disable @typescript-eslint/no-explicit-any */
export type ApiCtx = {
  apiGetFirst: (ps: string[]) => Promise<any>;
  apiPost: (p: string, b: any) => Promise<any>;
  apiPatch?: (p: string, b: any) => Promise<any>;
};
export type AmenityOption = { id: number; name: string };
export type RoomRow = {
  room_ID: number;
  room_title?: string | null;
  room_ref_code?: string | null;
  room_type_id?: number | null;
  gst_type?: any;
  gst_percentage?: any;
};
export type RatePlanOption = {
  ratePlanCode?: string | null;
  rateplanId: string;
  ratePlanName: string;
  description?: string | null;
  occupancy?: string[];
  isFallback?: boolean;
  includesBreakfast?: number;
  includesLunch?: number;
  includesDinner?: number;
};
export const AXISROOMS_RATE_PLAN_CODES = ["EP", "CP", "MAP", "AP"] as const;
export const getAxisRoomsRatePlanCode = (plan: RatePlanOption): string => {
  const raw = String(plan.ratePlanCode || plan.rateplanId || "").trim().toUpperCase();
  return AXISROOMS_RATE_PLAN_CODES.find((code) =>
    raw === code || raw.startsWith(`${code}_`) || raw.includes(`${code} PLAN`),
  ) || raw;
};
export const getAxisRoomsRatePlans = (plans: RatePlanOption[]): RatePlanOption[] =>
  plans.filter((plan) => AXISROOMS_RATE_PLAN_CODES.includes(
    getAxisRoomsRatePlanCode(plan) as (typeof AXISROOMS_RATE_PLAN_CODES)[number],
  )).sort((a, b) => {
    const aCode = getAxisRoomsRatePlanCode(a);
    const bCode = getAxisRoomsRatePlanCode(b);
    const aIndex = AXISROOMS_RATE_PLAN_CODES.indexOf(aCode as (typeof AXISROOMS_RATE_PLAN_CODES)[number]);
    const bIndex = AXISROOMS_RATE_PLAN_CODES.indexOf(bCode as (typeof AXISROOMS_RATE_PLAN_CODES)[number]);
    return (aIndex < 0 ? AXISROOMS_RATE_PLAN_CODES.length : aIndex) -
      (bIndex < 0 ? AXISROOMS_RATE_PLAN_CODES.length : bIndex);
  });
export type RangeViewRoomRow = {
  roomId: number;
  roomName: string;
  roomType: string;
  rateplanId: string;
  prices: Record<string, number>;
};
export type RangeViewOccupancyRow = {
  roomId: number;
  roomName: string;
  roomType: string;
  rateplanId: string;
  occupancyType: string;
  values: Record<string, number>;
};
export type MealRangeRow = {
  mealType: string;
  values: Record<string, number | null>;
};
export type AmenityRangeRow = {
  amenityName: string;
  priceType: string;
  values: Record<string, string | null>;
};
export const formatCurrency = (value: number) => `\u20B9 ${Number(value || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
export const OCCUPANCY_FIELDS = [
  "SINGLE",
  "DOUBLE",
  "EXTRABED",
  "CHILD_WITH_BED",
  "CHILD_WITHOUT_BED",
] as const;
export const ROOM_GRID_OCCUPANCY_TYPES = [
  "SINGLE",
  "DOUBLE",
] as const;
// The range table should mirror the fields users can enter in the price-book
// form. The backend may retain legacy occupancy keys for compatibility, but
// those keys are not user-entered values and must not be rendered here.
export const VALID_RANGE_OCCUPANCY_TYPES = new Set<string>([
  "ROOM_PRICE",
  ...OCCUPANCY_FIELDS,
]);
export const DEFAULT_OFFLINE_GST_TYPE = "Included" as const;
export const DEFAULT_OFFLINE_GST_PERCENTAGE = "5" as const;
export const formatDateLabel = (isoDate?: string) => {
  const d = isoDate ? new Date(`${isoDate}T00:00:00`) : new Date();
  const weekday = d.toLocaleString("en-US", { weekday: "short" }).toUpperCase();
  const day = String(d.getDate()).padStart(2, "0");
  const month = d.toLocaleString("en-US", { month: "short" }).toUpperCase();
  const year = d.getFullYear();
  return `${weekday} - ${day} ${month}, ${year}`;
};
export const LOCAL_VALIDATION_MESSAGES = new Set([
  "Start date and End date should be required.",
  "Start date should be required.",
  "End date should be required.",
  "Please enter at least one price for the amenities.",
  "Please enter at least one price for the rooms.",
  "No rooms to update",
]);
export const uiErrorMessage = (err: any, fallback: string) => {
  const msg = String(err?.message ?? "").trim();
  if (LOCAL_VALIDATION_MESSAGES.has(msg)) return msg;
  return fallback;
};

export const isOfflineHotelRecord = (hotel: any): boolean => {
  if (!hotel || typeof hotel !== "object") return false;
  if (typeof hotel.is_offline === "boolean") return hotel.is_offline;
  if (typeof hotel.isOffline === "boolean") return hotel.isOffline;

  const hasValue = (value: unknown) => String(value ?? "").trim().length > 0;
  const hasLiveProviderMapping =
    hasValue(hotel.tbo_hotel_code ?? hotel.tboHotelCode) ||
    hasValue(hotel.resavenue_hotel_code ?? hotel.resavenueHotelCode) ||
    (Number(hotel.axisrooms_enabled ?? hotel.axisroomsEnabled ?? 0) === 1 &&
      hasValue(hotel.axisrooms_property_id ?? hotel.axisroomsPropertyId)) ||
    (Number(hotel.staah_enabled ?? hotel.staahEnabled ?? 0) === 1 &&
      hasValue(hotel.staah_property_id ?? hotel.staahPropertyId));

  return !hasLiveProviderMapping;
};


