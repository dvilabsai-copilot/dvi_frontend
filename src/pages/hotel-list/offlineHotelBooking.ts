import { api } from "@/lib/api";
import type { ItineraryHotelRow } from "../itinerary-details/itinerary-details.types";
import { getHotelCodeForBooking, inferHotelProvider, normalizeHotelProvider } from "../itinerary-details/utils/hotelBookingNormalization.utils";
import { isSyntheticPreviousDayBillingRow } from "./earlyCheckInReconciliation";
import { getEffectiveRoomCount, getHotelBaseAmountPerRoom, isOwnStayRow } from "./hotelList.utils";

export const offlineBookingStatusLabels = {
  pending: "Pending",
  confirmed: "Confirmed",
  cancelled: "Cancelled",
} as const;

export type OfflineBookingStatus = keyof typeof offlineBookingStatusLabels;

export type OfflineBookingRoom = {
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
};

type StayIdentity = {
  routeId: number;
  hotelKey: string;
  checkIn: string;
  checkOut: string;
};

export type OfflineVoucherStay = StayIdentity & {
  hotelName: string;
  destination: string;
};

export type OfflineBookingStay = OfflineVoucherStay & {
  providerLabel: string;
  defaults: OfflineBookingDetails;
};

export type SavedOfflineBooking = StayIdentity & {
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

export const offlineBookingKey = ({ routeId, hotelKey, checkIn, checkOut }: StayIdentity) =>
  JSON.stringify([routeId, hotelKey, checkIn, checkOut]);

const endpoint = (planId: number, groupType: number) =>
  `/itineraries/${planId}/offline-hotel-bookings/${groupType}`;

export const offlineHotelBookingApi = {
  list: (planId: number, groupType: number, signal?: AbortSignal): Promise<SavedOfflineBooking[]> =>
    api(endpoint(planId, groupType), { signal, cache: "no-store", redirectOnForbidden: false }),
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
  ): Promise<{ results: Array<{ key: string; status: "sent" | "demo" | "partial" | "failed" | "skipped"; message?: string }> }> =>
    api(`${endpoint(planId, groupType)}/voucher-emails`, {
      method: "POST", body: { template, stays }, redirectOnForbidden: false,
    }),
};

const toDate = (value?: string | null) => value?.match(/^\d{4}-\d{2}-\d{2}/)?.[0] ?? "";

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

export function getOfflineBookingStays(rows: ItineraryHotelRow[], roomCount: number): OfflineBookingStay[] {
  const datedStays = rows.flatMap((row): OfflineBookingStay[] => {
    const hotelName = String(row.hotelName || "").trim();
    const provider = normalizeHotelProvider(row) || inferHotelProvider(row);
    const property = provider === "offline" && row.hotelId > 0
      ? String(row.hotelId)
      : row.providerHotelCode || getHotelCodeForBooking(row) || hotelName;
    const routeId = Number(row.itineraryRouteId || row.routeId);
    const routeDate = toDate(row.date) || toDate(row.itineraryRouteDate) || toDate(row.checkInDate) ||
      row.day?.match(/\d{4}-\d{2}-\d{2}/)?.[0] || "";
    if (!hotelName || !routeId || !routeDate || row.isDisplayOnlyFallback || row.externalStay ||
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
      hotelKey: `${provider}:${String(property).trim().toLowerCase()}`,
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
  return stays;
}
