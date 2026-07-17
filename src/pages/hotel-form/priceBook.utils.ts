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
export const formatCurrency = (value: number) => `â‚¹ ${Number(value || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
export const OCCUPANCY_FIELDS = [
  "SINGLE",
  "DOUBLE",
  "TRIPLE",
  "QUAD",
  "PENTA",
  "HEXA",
  "HEPTA",
  "OCTA",
  "NONA",
  "DECA",
  "EXTRABED",
  "EXTRAADULT",
  "EXTRACHILD",
  "EXTRAADULT2",
  "EXTRACHILD2",
  "EXTRAADULT3",
  "EXTRACHILD3",
  "EXTRAINFANT",
] as const;
export const ROOM_GRID_OCCUPANCY_TYPES = [
  "SINGLE",
  "DOUBLE",
  "TRIPLE",
  "QUAD",
  "PENTA",
  "HEXA",
  "HEPTA",
  "OCTA",
  "NONA",
  "DECA",
] as const;
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


