import { api } from "@/lib/api";
import { getHotelRoomCategories } from "@/services/hotelRoomCategories";
import type { ItineraryHotelRow, ItineraryHotelSelectionRouteState } from "../itinerary-details/itinerary-details.types";
import { getHotelCodeForBooking, inferHotelProvider, normalizeHotelProvider } from "../itinerary-details/utils/hotelBookingNormalization.utils";
import { isSyntheticPreviousDayBillingRow } from "./earlyCheckInReconciliation";
import { getEffectiveRoomCount, getHotelBaseAmountPerRoom, isOwnStayRow } from "./hotelList.utils";

export const offlineBookingStatusLabels = {
  pending: "Awaiting",
  waitinglist: "Waitinglist",
  blocked: "Blocked",
  confirmed: "Confirmed",
  sold_out: "Sold Out",
  cancelled: "Cancelled",
} as const;

export type OfflineBookingStatus = keyof typeof offlineBookingStatusLabels;

export type OfflineBookingRoom = {
  nightDate?: string;
  category: string;
  quantity: number;
  rate: number;
  extraBeds: number;
  extraBedRate: number;
  childrenWithoutBed: number;
  childWithoutBedRate: number;
};

export type OfflineBookingDetails = {
  confirmedBy: string;
  emails: string[];
  phone: string;
  status: OfflineBookingStatus;
  rooms: OfflineBookingRoom[];
  cancellationPolicies: Array<{ beforeDate: string; percentage: number }>;
  hotelResponse?: {
    status: OfflineBookingStatus;
    reservationNumber: string;
    verifiedBy: string;
    phone: string;
    email: string;
    remarks: string;
    submittedAt: string;
  };
};

export function offlineBookingContactRequirements(status: OfflineBookingStatus, previous?: OfflineBookingDetails) {
  const confirmed = status === "confirmed";
  return {
    email: confirmed,
    name: confirmed && (previous?.status !== "confirmed" || Boolean(previous.confirmedBy?.trim())),
    phone: confirmed && (previous?.status !== "confirmed" || Boolean(previous.phone?.trim())),
  };
}

export type OfflineStayIdentity = {
  routeId: number;
  hotelKey: string;
  checkIn: string;
  checkOut: string;
};

export type OfflineVoucherStay = OfflineStayIdentity & {
  hotelName: string;
  destination: string;
};

export type OfflineBookingStay = OfflineVoucherStay & {
  coveredRouteIds?: number[];
  hotelId?: number;
  hotelDetailsId?: number;
  providerLabel: string;
  defaults: OfflineBookingDetails;
};

export type SavedOfflineBooking = OfflineStayIdentity & {
  details: OfflineBookingDetails;
  version: number;
};

export type OfflineHotelBookingDefaults = {
  confirmedBy: string;
  contacts: Record<string, Pick<OfflineBookingDetails, "emails" | "phone">>;
};

export type OfflineVoucherTemplate = "hotel-voucher";

export const offlineVoucherStay = ({ routeId, hotelKey, checkIn, checkOut, hotelName, destination }: OfflineBookingStay): OfflineVoucherStay => ({
  routeId, hotelKey, checkIn, checkOut, hotelName, destination: destination || "",
});

export const offlineBookingKey = ({ routeId, hotelKey, checkIn, checkOut }: OfflineStayIdentity) =>
  JSON.stringify([routeId, hotelKey, checkIn, checkOut]);

const endpoint = (planId: number, groupType: number) =>
  `/itineraries/${planId}/offline-hotel-bookings/${groupType}`;

export const offlineHotelBookingApi = {
  roomCategories: async (planId: number, groupType: number, stay: OfflineBookingStay, signal: AbortSignal) => {
    const delimiter = stay.hotelKey.indexOf(":");
    const { rooms } = await getHotelRoomCategories({
      itinerary_plan_hotel_details_ID: stay.hotelDetailsId ?? 0,
      itinerary_plan_id: planId,
      itinerary_route_id: stay.routeId,
      hotel_id: stay.hotelId ?? 0,
      group_type: groupType,
      provider: stay.hotelKey.slice(0, delimiter),
      hotel_code: stay.hotelKey.slice(delimiter + 1),
      hotel_name: stay.hotelName,
    }, signal);
    return rooms.flatMap(room => room.available_room_types.map(category => category.room_type_title));
  },
  list: (planId: number, groupType: number, signal?: AbortSignal): Promise<SavedOfflineBooking[]> =>
    api(endpoint(planId, groupType), { signal, cache: "no-store", redirectOnForbidden: false }),
  confirmedStays: (planId: number, groupType: number, signal?: AbortSignal): Promise<OfflineStayIdentity[]> =>
    api(`${endpoint(planId, groupType)}/confirmed-stays`, { signal, cache: "no-store", redirectOnForbidden: false }),
  defaults: (planId: number, groupType: number, hotelKeys: string[], signal?: AbortSignal): Promise<OfflineHotelBookingDefaults> =>
    api(`${endpoint(planId, groupType)}/contacts?includeConfirmedBy=true`, {
      method: "POST", body: { hotelKeys }, signal, redirectOnForbidden: false,
    }),
  save: (planId: number, groupType: number, booking: SavedOfflineBooking): Promise<SavedOfflineBooking> =>
    api(endpoint(planId, groupType), { method: "PUT", body: booking, redirectOnForbidden: false }),
  previewVoucher: (
    planId: number, groupType: number, template: OfflineVoucherTemplate, stay: OfflineVoucherStay, details: OfflineBookingDetails,
  ): Promise<{ subject: string; html: string }> =>
    api(`${endpoint(planId, groupType)}/voucher-preview`, {
      method: "POST", body: { template, stay, details }, redirectOnForbidden: false,
    }),
  sendVouchers: (
    planId: number, groupType: number, template: OfflineVoucherTemplate, stays: Array<OfflineVoucherStay & { version: number }>,
  ): Promise<{ results: Array<{
    key: string;
    status: "sent" | "demo" | "partial" | "failed" | "skipped";
    message?: string;
  }> }> =>
    api(`${endpoint(planId, groupType)}/voucher-emails`, {
      method: "POST", body: { template, stays }, redirectOnForbidden: false,
    }),
};

const toDate = (value?: string | null) => value?.match(/^\d{4}-\d{2}-\d{2}/)?.[0] ?? "";

function hotelKeyFor(entry: unknown, provider = normalizeHotelProvider(entry) || inferHotelProvider(entry)) {
  const hotel = entry as Partial<ItineraryHotelRow>;
  const property = provider === "offline" && Number(hotel.hotelId) > 0
    ? hotel.hotelId
    : hotel.providerHotelCode || getHotelCodeForBooking(hotel) || hotel.hotelName || "";
  return `${provider}:${String(property).trim().toLowerCase()}`;
}

export function hasOfflineConfirmation(hotel: unknown, date: string | undefined, confirmedStays: readonly OfflineStayIdentity[]) {
  if (!hotel || !date || !confirmedStays.length) return false;
  const night = toDate(date);
  const key = hotelKeyFor(hotel);
  return confirmedStays.some((stay) => stay.hotelKey === key && stay.checkIn <= night && night < stay.checkOut);
}

function nextDate(date: string) {
  const next = new Date(`${date}T00:00:00Z`);
  next.setUTCDate(next.getUTCDate() + 1);
  return Number.isNaN(next.getTime()) ? "" : next.toISOString().slice(0, 10);
}

function positiveNumber(value: unknown, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 && value != null && value !== ""
    ? number
    : fallback;
}

const money = (value: unknown, fallback = 0) => Number(positiveNumber(value, fallback).toFixed(2));
const count = (value: unknown, fallback = 0) => Math.floor(positiveNumber(value, fallback));

function readRoomDefaults(
  row: ItineraryHotelRow & { roomRate?: number; extraBedRate?: number; childWithoutBedRate?: number },
  roomCount: number,
): OfflineBookingRoom[] {
  const snapshot = row.selectedPriceSnapshot;
  const breakdown: unknown = snapshot && typeof snapshot === "object" && "roomTypeBreakdown" in snapshot
    ? snapshot.roomTypeBreakdown
    : row.roomTypeBreakdown;
  const rooms: OfflineBookingRoom[] = [];
  const defaultRate = money(row.roomRate, getHotelBaseAmountPerRoom(row, roomCount));

  if (Array.isArray(breakdown)) {
    for (const room of breakdown) {
      const category = String(room?.roomType || room?.roomTypeTitle || "").trim();
      if (!category || category === "-") continue;
      const values = {
        category,
        quantity: Math.max(1, count(room.roomCount, 1)),
        rate: money(room.roomRate ?? room.roomCost, defaultRate),
        extraBeds: count(room.extraBedCount),
        extraBedRate: money(room.extraBedRate),
        childrenWithoutBed: count(room.childWithoutBedCount),
        childWithoutBedRate: money(room.childWithoutBedRate),
      };
      const sameCategory = rooms.find((item) =>
        item.category === values.category && item.rate === values.rate &&
        item.extraBedRate === values.extraBedRate && item.childWithoutBedRate === values.childWithoutBedRate,
      );
      if (sameCategory) {
        sameCategory.quantity += values.quantity;
        sameCategory.extraBeds += values.extraBeds;
        sameCategory.childrenWithoutBed += values.childrenWithoutBed;
      } else {
        rooms.push(values);
      }
    }
  }
  if (rooms.length) return rooms;

  const category = String(row.displayRoomType || row.roomType || "").trim();
  const extraBeds = count(row.extraBedCount);
  const childrenWithoutBed = count(row.childWithoutBedCount);
  return category && category !== "-" ? [{
    category,
    quantity: getEffectiveRoomCount(row, roomCount),
    rate: defaultRate,
    extraBeds,
    extraBedRate: money(row.extraBedRate, extraBeds ? (row.totalExtraBedCost ?? 0) / extraBeds : 0),
    childrenWithoutBed,
    childWithoutBedRate: money(row.childWithoutBedRate, childrenWithoutBed ? (row.totalChildWithoutBedCost ?? 0) / childrenWithoutBed : 0),
  }] : [];
}

export function getOfflineBookingStays(
  rows: ItineraryHotelRow[],
  roomCount: number,
  savedRoutes: ItineraryHotelSelectionRouteState[] = [],
  destinations: Record<number, string> = {},
): OfflineBookingStay[] {
  const selectedRoutes = new Map(savedRoutes.filter(route => route.selectionStatus === "SELECTED")
    .map(route => [route.routeId, route]));
  const coveredRoutes = new Set<number>();
  const savedStays = savedRoutes.flatMap((route): OfflineBookingStay[] => {
    const selected = route.selected;
    if (route.selectionStatus !== "SELECTED" || !selected?.hotelName ||
      ["external", "none", "self-arranged"].includes(String(selected.provider).toLowerCase()) ||
      selected.authoritativeParentRouteId !== route.routeId) return [];

    const checkIn = toDate(selected.authoritativeCheckInDate);
    const checkOut = toDate(selected.authoritativeCheckOutDate);
    const routeIds = selected.authoritativeRouteIds || [];
    const hotelKey = hotelKeyFor(selected);
    if (!checkIn || checkOut <= checkIn || routeIds[0] !== route.routeId) return [];

    let date = checkIn;
    const nights = [];
    for (const routeId of routeIds) {
      const night = selectedRoutes.get(routeId);
      if (!night?.selected || toDate(night.routeDate) !== date ||
        night.selected.authoritativeParentRouteId !== route.routeId ||
        hotelKeyFor(night.selected) !== hotelKey ||
        toDate(night.selected.authoritativeCheckInDate) !== checkIn ||
        toDate(night.selected.authoritativeCheckOutDate) !== checkOut) return [];

      const rooms = readRoomDefaults({
        ...night.selected.selectedPriceSnapshot,
        ...night.selected,
        selectedPriceSnapshot: undefined,
        noOfRooms: night.selected.noOfRooms ?? night.selected.roomCount ?? night.selected.totalRooms,
      } as ItineraryHotelRow, roomCount);
      nights.push({ date, rooms });
      date = nextDate(date);
    }
    if (date !== checkOut) return [];
    routeIds.forEach(routeId => coveredRoutes.add(routeId));

    const firstRooms = nights[0].rooms;
    const uniformRooms = nights.every(night => JSON.stringify(night.rooms) === JSON.stringify(firstRooms));
    const rooms = uniformRooms ? firstRooms : nights.flatMap(night =>
      night.rooms.map(room => ({ ...room, nightDate: night.date })));
    const displayRow = rows.find(row => Number(row.itineraryRouteId || row.routeId) === route.routeId &&
      hotelKeyFor(row) === hotelKey);
    return [{
      routeId: route.routeId, checkIn, checkOut, hotelKey,
      coveredRouteIds: routeIds,
      hotelId: selected.canonicalHotelId ?? displayRow?.hotelId,
      hotelDetailsId: displayRow?.itineraryPlanHotelDetailsId,
      hotelName: selected.hotelName,
      destination: destinations[route.routeId] || displayRow?.destination || "",
      providerLabel: displayRow?.providerDisplayName || (selected.provider === "tbo" ? "VSR"
        : selected.provider === "offline" ? "Offline" : selected.provider || ""),
      defaults: {
        confirmedBy: "",
        emails: [],
        phone: "",
        status: displayRow?.voucherCancelled || displayRow?.manualConfirmationStatus === "CANCELLED" ? "cancelled" : "pending",
        rooms,
        cancellationPolicies: [],
      },
    }];
  });

  const datedStays = rows.flatMap((row): OfflineBookingStay[] => {
    const hotelName = String(row.hotelName || "").trim();
    const provider = normalizeHotelProvider(row) || inferHotelProvider(row);
    const routeId = Number(row.itineraryRouteId || row.routeId);
    const routeDate = toDate(row.date) || toDate(row.itineraryRouteDate) || toDate(row.checkInDate) ||
      row.day?.match(/\d{4}-\d{2}-\d{2}/)?.[0] || "";
    if (!hotelName || !routeId || !routeDate || coveredRoutes.has(routeId) || row.isDisplayOnlyFallback || row.externalStay ||
      ["external", "none", "self-arranged"].includes(provider) ||
      isOwnStayRow(row) || isSyntheticPreviousDayBillingRow(row)) return [];

    const start = toDate(row.hotelCheckInDate) || toDate(row.checkInDate);
    const checkIn = start && start <= routeDate ? start : routeDate;
    const end = toDate(row.checkOutDate);
    const checkOut = end > routeDate ? end : nextDate(routeDate);
    if (!checkOut) return [];
    return [{
      routeId,
      checkIn,
      checkOut,
      hotelKey: hotelKeyFor(row, provider),
      hotelId: row.canonicalHotelId || row.hotelId,
      hotelDetailsId: row.itineraryPlanHotelDetailsId,
      hotelName,
      destination: row.destination,
      providerLabel: row.providerDisplayName || (provider === "tbo" ? "VSR" : provider === "offline" ? "Offline" : provider === "unknown" ? "" : provider),
      defaults: {
        confirmedBy: "",
        emails: [],
        phone: "",
        status: row.voucherCancelled || row.manualConfirmationStatus === "CANCELLED" ? "cancelled" : "pending",
        rooms: readRoomDefaults(row, roomCount),
        cancellationPolicies: [],
      },
    }];
  }).sort((a, b) => a.checkIn.localeCompare(b.checkIn) || a.routeId - b.routeId);

  const stays: OfflineBookingStay[] = [];
  for (const stay of datedStays) {
    const previous = stays[stays.length - 1];
    if (previous?.hotelKey === stay.hotelKey && previous.checkOut >= stay.checkIn) {
      // A provider may emit the complete interval on more than one day row.
      if (stay.checkIn < previous.checkOut && stay.checkOut <= previous.checkOut) continue;
      // Keep different nightly room arrangements editable as separate stays.
      if (previous.defaults.status === stay.defaults.status &&
        JSON.stringify(previous.defaults.rooms) === JSON.stringify(stay.defaults.rooms)) {
        previous.checkOut = stay.checkOut;
        continue;
      }
    }
    stays.push(stay);
  }
  return [...savedStays, ...stays].sort((a, b) => a.checkIn.localeCompare(b.checkIn) || a.routeId - b.routeId);
}

export function retainExistingBookingRanges(stays: OfflineBookingStay[], bookings: SavedOfflineBooking[]): OfflineBookingStay[] {
  return stays.flatMap(stay => {
    if (!stay.coveredRouteIds || bookings.some(booking => offlineBookingKey(booking) === offlineBookingKey(stay))) {
      return [stay];
    }
    const existing = bookings.filter(booking =>
      booking.hotelKey === stay.hotelKey && stay.coveredRouteIds?.includes(booking.routeId) &&
      stay.checkIn <= booking.checkIn && booking.checkIn < booking.checkOut && booking.checkOut <= stay.checkOut)
      .sort((a, b) => a.checkIn.localeCompare(b.checkIn));
    if (!existing.length) return [stay];

    const routesByDate = new Map<string, number>();
    let date = stay.checkIn;
    for (const routeId of stay.coveredRouteIds) {
      routesByDate.set(date, routeId);
      date = nextDate(date);
    }
    const ranges: OfflineBookingStay[] = [];
    const addUnbooked = (checkIn: string, checkOut: string) => {
      const routeId = routesByDate.get(checkIn);
      if (!routeId || checkIn >= checkOut) return;
      const rooms = stay.defaults.rooms.filter(room =>
        !room.nightDate || (checkIn <= room.nightDate && room.nightDate < checkOut));
      ranges.push({ ...stay, routeId, checkIn, checkOut, defaults: { ...stay.defaults, rooms } });
    };
    let availableFrom = stay.checkIn;
    for (const booking of existing) {
      addUnbooked(availableFrom, booking.checkIn);
      ranges.push({ ...stay, routeId: booking.routeId, checkIn: booking.checkIn, checkOut: booking.checkOut });
      if (booking.checkOut > availableFrom) availableFrom = booking.checkOut;
    }
    addUnbooked(availableFrom, stay.checkOut);
    return ranges;
  });
}
