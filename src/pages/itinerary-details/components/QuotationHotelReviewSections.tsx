import { useEffect, useState, type Dispatch, type SetStateAction, type ReactNode } from "react";
import { AlertTriangle } from "lucide-react";
import { QuotationNonTboSelectedHotels } from "./QuotationNonTboSelectedHotels";
import { QuotationPrebookHotelRows } from "../QuotationPrebookHotelRows";
import { QuotationPrebookAcceptanceNotice } from "../QuotationPrebookAcceptanceNotice";
import { QuotationNonTboAcceptanceNotice } from "../QuotationNonTboAcceptanceNotice";
import { isManualApprovalHotel } from "../utils/domain.utils";
import { api, resolveUploadUrl } from "@/lib/api";
import { USER_ROLES } from "@/constants/systemRoles";
import { getAuthenticatedRoleId, isTravelExpertUIAccount } from "@/services/accessControl";
import { ItineraryService } from "@/services/itinerary";
import { listHotels } from "@/services/hotels";
import { toast } from "sonner";
import { HotelHoldExtensionDialog, type HotelHoldExtensionTarget } from "./HotelHoldExtensionDialog";
import { HotelierContactDialog } from "./HotelierContactDialog";
import { HotelActionsMenu } from "./HotelActionsMenu";
import { HotelDetailsDialog, type HotelDetailsDialogTarget } from "./HotelDetailsDialog";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { getSafeErrorMessage } from "../utils/quotationConfirmationDetails.utils";
import { applyContinuousVsrRefundability, getHotelHoldEligibility, resolveHotelDetailsIdsFromRows } from "../utils/hotelHoldEligibility.utils";
import { OTHER_HOTELIER_PHONE_OPTION, splitHotelierPhoneOptions } from "../utils/hotelierContact.utils";
import { resolveHotelEntryDayNumbers, sortHotelReviewRowsChronologically, type HotelReviewItineraryDay } from "../utils/quotationHotelReviewRows.utils";
import { resolveHotelHoldAssociation } from "../utils/hotelHoldAssociation.utils";
import { propagateContinuousHotelHoldStatus, resolveContinuousHotelHoldSelectionIds } from "../utils/continuousHotelHoldSelection.utils";
import { getDisplayHotelHoldLabel, getDisplayHotelHoldStatus, getHotelReleaseEmailStatusLabel } from "../utils/hotelHoldStatus.utils";

type HotelEntry = Record<string, unknown>;
type ExternalStayEntry = { routeId?: string | number; destination?: string; day?: string; availabilityMessage?: string };
type PrebookData = { updatedTotalPrice?: number; finalPrice?: number; totalAmount?: number };
type ItineraryDaySummary = HotelReviewItineraryDay & {
  date: string;
  arrival?: string | null;
  departure?: string | null;
  destination?: string | null;
};

type HotelTableRow = {
  key: string;
  day: string;
  dayDate?: string;
  routeDate?: string;
  destination: string;
  hotel: string;
  status: string;
  holdUntil: string;
  imageUrl?: string;
  rating?: string;
  holdStatus?: string;
  holdRequestId?: number;
  cutoffAt?: string;
  maxCutoffAt?: string;
  canExtendHold?: boolean;
  canResendHold?: boolean;
  releaseStatus?: string;
  releaseEmailStatus?: string;
  previousCancelledHotelName?: string;
  canAcknowledgeRelease?: boolean;
  holdProvider?: string;
  holdConfirmationChannel?: string;
  paidConfirmedAt?: string;
  voucherStatus?: string;
  routeId?: number;
  hotelId?: number;
  hotelEmail?: string;
  routeDates?: string[];
  hotelDetailsIds?: number[];
  holdHotelDetailsIds?: number[];
  holdable?: boolean;
  isEarlyCheckInExtraNight?: boolean;
  hotelEntry?: HotelEntry;
};

type HotelVoucherAction = {
  routeId: number;
  hotelId: number;
  hotelName: string;
  hotelEmail: string;
  hotelStateCity: string;
  routeDates: string[];
  dayNumbers: number[];
  hotelDetailsIds: number[];
};

type AssignedTravelExpert = {
  travel_expert_id?: number | null;
  travel_expert_label?: string | null;
  travel_expert_mobile?: string | null;
};
type OfflineHotelierDialogAction = "HOLD" | "REMOVE";

const asRecord = (value: unknown): Record<string, unknown> => (
  value && typeof value === "object" ? value as Record<string, unknown> : {}
);

const textValue = (record: Record<string, unknown>, ...keys: string[]): string => {
  for (const key of keys) {
    const value = record[key];
    if (value !== null && value !== undefined && String(value).trim() !== "") return String(value);
  }
  return "";
};

const imageValueUrl = (value: unknown): string => {
  if (typeof value === "string") return value.trim();
  if (value && typeof value === "object") {
    return textValue(asRecord(value), "url", "imageUrl", "src", "path");
  }
  return "";
};

const hotelImageUrl = (...records: Record<string, unknown>[]): string => {
  const directKeys = [
    "primaryImageUrl",
    "primary_image_url",
    "imageUrl",
    "hotelImageUrl",
    "image",
    "thumbnail",
    "hotelImage",
  ];
  const galleryKeys = ["images", "galleryImages", "gallery", "hotelImages", "photos"];

  for (const record of records) {
    for (const key of directKeys) {
      const url = imageValueUrl(record[key]);
      if (url) return resolveUploadUrl(url);
    }
    for (const key of galleryKeys) {
      const values = record[key];
      if (!Array.isArray(values)) continue;
      const url = values.map(imageValueUrl).find(Boolean);
      if (url) return resolveUploadUrl(url);
    }
  }

  return "";
};

const statusLabel = (entry: Record<string, unknown>, isHeld: boolean): string => {
  if (isHeld) return "Held";
  if (getHotelHoldEligibility(entry).provider === "offline") return "Not Started";
  if (isManualApprovalHotel(entry)) return "On Request";
  const status = textValue(entry, "approvalStatus", "manualConfirmationStatus", "availabilityStatus").toUpperCase();
  if (status.includes("UNAVAILABLE") || status.includes("NOT_BOOKABLE")) return "Unavailable";
  const holdEligibility = getHotelHoldEligibility(entry);
  if (holdEligibility.provider === "tbo" && !holdEligibility.holdable) return "Not Holdable";
  if (status.includes("AVAILABLE") || status === "SELECTED") return "Available";
  return "Not Started";
};

const statusClass = (status: string): string => {
  if (["Held", "Available", "HOLD", "BLOCKED", "CONFIRMED"].includes(status)) return "bg-[#e6f9ed] text-[#16a34a]";
  if (["On Request", "CONTACT_REQUIRED", "REQUESTED", "CONFIRMATION_AWAITED", "WAITLISTED", "HOTEL_CONFIRMED_PAYMENT_PENDING", "VSR_VOUCHER_PENDING"].includes(status)) return "bg-[#fff7ed] text-[#ea580c]";
  if (["Unavailable", "Not Holdable", "UNAVAILABLE", "CANCELLED", "EXPIRED", "HOLD_EXPIRED"].includes(status)) return "bg-red-50 text-red-600";
  return "bg-slate-100 text-slate-600";
};

const formatHoldUntil = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" });
};

const formatHoldCountdown = (value: string, now: number) => {
  const remainingSeconds = Math.floor((new Date(value).getTime() - now) / 1000);
  if (!Number.isFinite(remainingSeconds)) return "";
  if (remainingSeconds <= 0) return "Expired";
  const days = Math.floor(remainingSeconds / 86400);
  const hours = Math.floor((remainingSeconds % 86400) / 3600);
  const minutes = Math.floor((remainingSeconds % 3600) / 60);
  if (days > 0) return `${days}d ${hours}h ${minutes}m remaining`;
  return `${hours}h ${minutes}m remaining`;
};

type QuotationHotelReviewSectionsProps = {
  requiresHotelBookingFlow: boolean;
  itineraryDays: readonly ItineraryDaySummary[];
  externalStayEntries: readonly ExternalStayEntry[];
  defaultExternalStayMessage: string;
  hasAcceptedUpdatedPrice: boolean;
  setHasAcceptedUpdatedPrice: Dispatch<SetStateAction<boolean>>;
  prebookData?: PrebookData | null;
  hotelRows?: readonly HotelEntry[];
  isPrebooking: boolean;
  isOpeningConfirmQuotation: boolean;
  nonTboSelectedHotelEntries: readonly HotelEntry[];
  prebookHotelEntries: readonly HotelEntry[];
  holdRequests?: readonly HotelEntry[];
  refreshHoldRequests?: () => Promise<void>;
  hasPrebookPriceChanged: boolean;
  normalizePrebookItems: (value: unknown) => string[];
  resolvePrebookInclusions: (hotel: unknown) => string[];
  resolvePrebookMealPlan: (hotel: unknown) => string;
  normalizeCancellationPolicyItems: (value: unknown) => string[];
  normalizeMealPlanLabel: (value?: string | null) => string;
  onHoldCutoffUpdated?: (requestId: number, cutoffAt: string) => void;
  onChangeHotel?: (routeId: number, routeDate: string) => void;
  onViewHotelVoucher?: (hotelData: HotelVoucherAction) => void;
  onCancelHotelHold?: (requestId: number, hotelierContact?: { name: string; phone: string }) => void | Promise<void>;
  onAcknowledgeHotelRelease?: (requestId: number) => void | Promise<void>;
  holdPolicyBlocked?: boolean;
  onHoldHotel?: (
    hotelDetailsIds: readonly number[],
    hotelierContact?: { name: string; phone: string },
  ) => void | boolean | Promise<void | boolean>;
  onBeforeHoldOfflineHotel?: () => boolean;
  onResendHotelHold?: (requestId: number) => void | Promise<void>;
  onBulkHoldAvailabilityChange?: (allHotelsHeld: boolean) => void;
  headerActions?: ReactNode;
  compact?: boolean;
};

/** Owns the external-stay, non-TBO, and TBO prebook review sections in quotation confirmation. */
export function QuotationHotelReviewSections({
  requiresHotelBookingFlow,
  itineraryDays,
  externalStayEntries,
  defaultExternalStayMessage,
  hasAcceptedUpdatedPrice,
  setHasAcceptedUpdatedPrice,
  prebookData,
  hotelRows = [],
  isPrebooking,
  isOpeningConfirmQuotation,
  nonTboSelectedHotelEntries,
  prebookHotelEntries,
  holdRequests = [],
  refreshHoldRequests,
  hasPrebookPriceChanged,
  normalizePrebookItems,
  resolvePrebookInclusions,
  resolvePrebookMealPlan,
  normalizeCancellationPolicyItems,
  normalizeMealPlanLabel,
  onHoldCutoffUpdated,
  onChangeHotel,
  onViewHotelVoucher,
  onCancelHotelHold,
  onAcknowledgeHotelRelease,
  holdPolicyBlocked = false,
  onHoldHotel,
  onBeforeHoldOfflineHotel,
  onResendHotelHold,
  onBulkHoldAvailabilityChange,
  headerActions,
  compact = false,
}: QuotationHotelReviewSectionsProps) {
  const [extensionTarget, setExtensionTarget] = useState<HotelHoldExtensionTarget | null>(null);
  const [extensionWarningTarget, setExtensionWarningTarget] = useState<HotelHoldExtensionTarget | null>(null);
  const [hotelDetailsTarget, setHotelDetailsTarget] = useState<HotelDetailsDialogTarget | null>(null);
  const [hotelActionError, setHotelActionError] = useState<string | null>(null);
  const [isExtendingHold, setIsExtendingHold] = useState(false);
  const [pendingHotelAction, setPendingHotelAction] = useState<string | null>(null);
  const [offlineHoldTarget, setOfflineHoldTarget] = useState<HotelTableRow | null>(null);
  const [offlineHotelierDialogAction, setOfflineHotelierDialogAction] = useState<OfflineHotelierDialogAction>("HOLD");
  const [assignedTravelExpert, setAssignedTravelExpert] = useState<AssignedTravelExpert | null>(null);
  const [isLoadingAssignedExpert, setIsLoadingAssignedExpert] = useState(false);
  const [isLoadingHotelContact, setIsLoadingHotelContact] = useState(false);
  const [hotelierContactName, setHotelierContactName] = useState("");
  const [hotelierContactPhone, setHotelierContactPhone] = useState("");
  const [hotelierPhoneOptions, setHotelierPhoneOptions] = useState<string[]>([]);
  const [selectedHotelierPhoneOption, setSelectedHotelierPhoneOption] = useState(OTHER_HOTELIER_PHONE_OPTION);
  const [hasConfirmedHotelierContact, setHasConfirmedHotelierContact] = useState(false);
  const [offlineHoldError, setOfflineHoldError] = useState<string | null>(null);
  const [isSubmittingOfflineHold, setIsSubmittingOfflineHold] = useState(false);
  const [cutoffOverrides, setCutoffOverrides] = useState<Record<number, string>>({});
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 60_000);
    return () => window.clearInterval(timer);
  }, []);
  const authenticatedRoleId = getAuthenticatedRoleId();
  const isTravelExpert = isTravelExpertUIAccount();
  const isAgent = authenticatedRoleId === USER_ROLES.AGENT;
  const offlineSelectedHotelEntries = nonTboSelectedHotelEntries.filter(isManualApprovalHotel);
  const supplierManagedNonTboEntries = nonTboSelectedHotelEntries.filter((entry) => !isManualApprovalHotel(entry));
  const totalSelectedHotelEntries = prebookHotelEntries.length + nonTboSelectedHotelEntries.length;
  const itineraryDateByDay = new Map(itineraryDays.map((day) => [Number(day.dayNumber), day.date]));
  const itineraryDestinationByDay = new Map(
    itineraryDays.map((day) => [
      Number(day.dayNumber),
      textValue(day, "destination", "arrival", "departure"),
    ]),
  );
  const hotelImageByIdentity = new Map<string, string>();
  const hotelImageIdentities = (record: Record<string, unknown>): string[] => [
    textValue(record, "hotelCode", "providerHotelCode"),
    textValue(record, "canonicalHotelId", "hotelId"),
    textValue(record, "hotelName"),
  ]
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);
  const registerHotelImage = (...records: Record<string, unknown>[]) => {
    const imageUrl = hotelImageUrl(...records);
    if (!imageUrl) return;
    records.forEach((record) => {
      hotelImageIdentities(record).forEach((identity) => {
        if (!hotelImageByIdentity.has(identity)) hotelImageByIdentity.set(identity, imageUrl);
      });
    });
  };
  prebookHotelEntries.forEach((entry) => registerHotelImage(asRecord(entry)));
  nonTboSelectedHotelEntries.forEach((entry) => {
    const hotel = asRecord(entry);
    registerHotelImage(hotel, asRecord(hotel.matchedHotelRow));
  });
  const resolveHotelImage = (...records: Record<string, unknown>[]): string => {
    const directImage = hotelImageUrl(...records);
    if (directImage) return directImage;
    for (const record of records) {
      for (const identity of hotelImageIdentities(record)) {
        const sharedImage = hotelImageByIdentity.get(identity);
        if (sharedImage) return sharedImage;
      }
    }
    return "";
  };
  const formatItineraryDate = (value: unknown): string => {
    const dateOnly = String(value || "").slice(0, 10);
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateOnly);
    return match ? `${match[3]}/${match[2]}/${match[1]}` : "";
  };
  const previousCalendarDate = (value: string): string => {
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.slice(0, 10));
    if (!match) return "";
    const date = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]) - 1));
    return date.toISOString().slice(0, 10);
  };
  const openOfflineHotelierDialog = async (row: HotelTableRow, action: OfflineHotelierDialogAction) => {
    setOfflineHotelierDialogAction(action);
    setOfflineHoldTarget(row);
    setOfflineHoldError(null);
    const hotelDetails = asRecord(row.hotelEntry);
    setHotelierContactName(textValue(
      hotelDetails,
      "hotelierContactName",
      "hotelier_contact_name",
      "contactName",
      "contact_name",
      "contactPerson",
      "contact_person",
      "hotelContactName",
      "hotel_contact_name",
      "hotelName",
      "hotel_name",
      "name",
    ));
    setHotelierContactPhone("");
    setHotelierPhoneOptions([]);
    setSelectedHotelierPhoneOption(OTHER_HOTELIER_PHONE_OPTION);
    setHasConfirmedHotelierContact(false);
    setAssignedTravelExpert(null);
    if (isAgent) {
      setIsLoadingAssignedExpert(true);
      try {
        const profile = await api("/agents/profile", { cache: "no-store" }) as AssignedTravelExpert;
        setAssignedTravelExpert(profile);
      } catch {
        setOfflineHoldError("Unable to load your assigned Travel Expert details. Please try again.");
      } finally {
        setIsLoadingAssignedExpert(false);
      }
      return;
    }
    if (!isTravelExpert) return;

    const matchedHotelDetails = asRecord(hotelDetails.matchedHotelRow);
    const normalizeHotelIdentity = (value: unknown) => String(value || "")
      .normalize("NFKC")
      .trim()
      .toLowerCase()
      .replace(/\s*-\s*\d+\s*\*?\s*$/, "")
      .replace(/[^a-z0-9]+/g, " ")
      .trim();
    const selectedHotelIdentity = normalizeHotelIdentity(row.hotel);
    setHotelierPhoneOptions([]);
    setHotelierContactPhone("");
    setSelectedHotelierPhoneOption(OTHER_HOTELIER_PHONE_OPTION);
    setIsLoadingHotelContact(true);
    try {
      const hotelSearchTerm = String(row.hotel || "").replace(/\s*-\s*\d+\s*\*?\s*$/, "").trim();
      const hotelSearchResults = await listHotels({ search: hotelSearchTerm, page: 1, limit: 100 });
      const nameMatches = hotelSearchResults.items.filter((hotel) => normalizeHotelIdentity(hotel.name) === selectedHotelIdentity);
      const selectedLocationIdentities = [
        row.destination,
        textValue(matchedHotelDetails, "place", "hotel_place", "cityName", "hotel_city_name", "city", "hotel_city"),
      ].map(normalizeHotelIdentity).filter(Boolean);
      const locationMatches = nameMatches.filter((hotel) => [hotel.place, hotel.cityName, hotel.city]
        .some((location) => selectedLocationIdentities.includes(normalizeHotelIdentity(location))));
      const matchingHotel = locationMatches.length === 1
        ? locationMatches[0]
        : nameMatches.length === 1
          ? nameMatches[0]
          : null;
      if (matchingHotel?.name) setHotelierContactName(matchingHotel.name);
      const savedPhones = matchingHotel ? splitHotelierPhoneOptions(matchingHotel.phone) : [];
      if (savedPhones.length > 0) {
        setHotelierPhoneOptions(savedPhones);
        setSelectedHotelierPhoneOption(savedPhones[0]);
        setHotelierContactPhone(savedPhones[0]);
      } else {
        setOfflineHoldError(nameMatches.length > 1 && !matchingHotel
          ? "More than one hotel matches this name and location. Enter the correct hotelier phone number manually."
          : "Could not find a saved phone number for this hotel. You can enter it manually.");
      }
    } catch {
      setOfflineHoldError("Could not load the saved hotel phone number. You can enter it manually.");
    } finally {
      setIsLoadingHotelContact(false);
    }
  };
  const openHotelHold = async (row: HotelTableRow) => {
    const selectionIds = row.holdHotelDetailsIds || row.hotelDetailsIds || [];
    if (getHotelHoldEligibility(row.hotelEntry || {}).provider !== "offline") {
      await onHoldHotel?.(selectionIds);
      return;
    }
    if (onBeforeHoldOfflineHotel && !onBeforeHoldOfflineHotel()) return;
    await openOfflineHotelierDialog({ ...row, hotelDetailsIds: selectionIds }, "HOLD");
  };
  const submitOfflineHold = async () => {
    if (!offlineHoldTarget) return;
    const name = hotelierContactName.trim();
    const phone = hotelierContactPhone.trim();
    if (!hasConfirmedHotelierContact || !name || !phone) {
      setOfflineHoldError(offlineHotelierDialogAction === "REMOVE"
        ? "Confirm that you contacted the hotelier and enter their name and phone number before removing the hold."
        : "Confirm that you contacted the hotelier and enter their name and phone number before keeping the hold.");
      return;
    }
    setIsSubmittingOfflineHold(true);
    setOfflineHoldError(null);
    try {
      if (offlineHotelierDialogAction === "REMOVE") {
        if (!offlineHoldTarget.holdRequestId || !onCancelHotelHold) return;
        await onCancelHotelHold(offlineHoldTarget.holdRequestId, { name, phone });
      } else {
        if (!onHoldHotel) return;
        const result = await onHoldHotel(offlineHoldTarget.hotelDetailsIds || [], { name, phone });
        if (result === false) return;
      }
      setOfflineHoldTarget(null);
    } catch (error) {
      setOfflineHoldError(getSafeErrorMessage(error, offlineHotelierDialogAction === "REMOVE"
        ? "Unable to remove the offline hotel hold."
        : "Unable to keep the offline hotel hold."));
    } finally {
      setIsSubmittingOfflineHold(false);
    }
  };
  const getHoldMetadata = (hotelName: string, hotelDetailsIds: number[] = [], provider = "", stayDate = "") => {
    const association = resolveHotelHoldAssociation(holdRequests.map(asRecord), hotelName, hotelDetailsIds, provider, stayDate);
    const request = association.statusRequest;
    const previousCancelledHotelName = association.previousCancelledRequest
      ? textValue(association.previousCancelledRequest, "hotelName", "hotel_name")
      : "";
    const requestId = Number(request?.id || 0);
    const rawStatus = textValue(request || {}, "status").toUpperCase();
    const paidConfirmedAt = textValue(request || {}, "paidConfirmedAt", "paid_confirmed_at");
    const voucherStatus = textValue(request || {}, "voucherStatus", "voucher_status").toUpperCase();
    const status = getDisplayHotelHoldStatus(rawStatus, paidConfirmedAt, voucherStatus);
    const cutoffAt = requestId > 0
      ? cutoffOverrides[requestId] || textValue(request || {}, "cutoffAt", "holdUntil")
      : "";
    const maxCutoffAt = requestId > 0
      ? textValue(request || {}, "maxCutoffAt")
      : "";
    return {
      request,
      requestId: requestId > 0 ? requestId : undefined,
      status,
      cutoffAt,
      maxCutoffAt,
      canExtendHold: Boolean(requestId && cutoffAt && status === "BLOCKED"),
      canResendHold: Boolean(requestId && !request?.respondedAt && request?.canResendEmail
        && ["REQUESTED", "CONFIRMATION_AWAITED"].includes(status)),
      releaseStatus: textValue(request || {}, "releaseStatus", "release_status").toUpperCase(),
      releaseEmailStatus: textValue(request || {}, "releaseEmailStatus", "release_email_status").toUpperCase(),
      previousCancelledHotelName,
      canAcknowledgeRelease: textValue(request || {}, "confirmationChannel", "confirmation_channel").toUpperCase() === "OFFLINE_HOLD",
      provider: textValue(request || {}, "provider").toUpperCase(),
      confirmationChannel: textValue(request || {}, "confirmationChannel", "confirmation_channel").toUpperCase(),
      paidConfirmedAt,
      voucherStatus,
    };
  };
  const orderedRouteIds = itineraryDays
    .slice()
    .sort((left, right) => Number(left.dayNumber) - Number(right.dayNumber))
    .map((day) => Number(day.id || day.routeId || 0))
    .filter((routeId) => routeId > 0);
  const entriesWithPersistedRate = prebookHotelEntries.map((entry) => {
    const entryIds = resolveHotelDetailsIdsFromRows(entry, hotelRows);
    const matchingRow = hotelRows.find((row) => {
      const rowIds = resolveHotelDetailsIdsFromRows(row, hotelRows);
      return entryIds.length > 0 && rowIds.some((id) => entryIds.includes(id));
    });
    return matchingRow
      ? Object.fromEntries(Object.entries({ ...matchingRow, ...entry }).filter(([, value]) => value !== undefined))
      : entry;
  });
  const continuousPrebookHotelEntries = applyContinuousVsrRefundability(entriesWithPersistedRate, orderedRouteIds);
  const baseHotelTableRows: HotelTableRow[] = [
    ...continuousPrebookHotelEntries.flatMap((entry, index) => {
      const hotel = asRecord(entry);
      const routeIds = Array.isArray(hotel.routeIds) ? hotel.routeIds : [];
      const dayNumbers = resolveHotelEntryDayNumbers(
        hotel,
        itineraryDays,
        index + 1,
      ).map(String);
      const destination = textValue(hotel, "destination", "city", "cityName", "hotelCity");
      const hotelName = textValue(hotel, "hotelName") || `Hotel ${index + 1}`;
      const holdEligibility = getHotelHoldEligibility(hotel);
      const hotelDetailsIds = resolveHotelDetailsIdsFromRows(hotel, hotelRows);
      return dayNumbers.map((dayNumber, dayIndex) => {
        const routeDate = String(itineraryDateByDay.get(Number(dayNumber)) || "").slice(0, 10);
        const hold = getHoldMetadata(hotelName, hotelDetailsIds, holdEligibility.provider, routeDate);
        return {
          key: `prebook-${String(routeIds[dayIndex] || dayNumber)}-${index}`,
          day: `Day ${dayNumber}`,
          dayDate: formatItineraryDate(itineraryDateByDay.get(Number(dayNumber))),
          routeDate,
          destination: itineraryDestinationByDay.get(Number(dayNumber)) || destination || "-",
          hotel: hotelName,
          status: hold.status || statusLabel(hotel, false),
          holdUntil: hold.cutoffAt || "-",
          holdRequestId: hold.requestId,
          cutoffAt: hold.cutoffAt,
          maxCutoffAt: hold.maxCutoffAt,
          canExtendHold: hold.canExtendHold,
          canResendHold: hold.canResendHold,
          releaseStatus: hold.releaseStatus,
          releaseEmailStatus: hold.releaseEmailStatus,
          previousCancelledHotelName: hold.previousCancelledHotelName,
          canAcknowledgeRelease: hold.canAcknowledgeRelease,
          holdProvider: hold.provider,
          holdConfirmationChannel: hold.confirmationChannel,
          paidConfirmedAt: hold.paidConfirmedAt,
          routeId: Number(routeIds[dayIndex] || routeIds[0] || hotel.routeId || hotel.itineraryRouteId || 0),
          hotelId: Number(hotel.hotelId || hotel.canonicalHotelId || 0),
          hotelEmail: textValue(hotel, "hotelEmail", "email", "contactEmail"),
          routeDates: [textValue(hotel, "checkInDate", "check_in", "date")].filter(Boolean),
          hotelDetailsIds,
          holdable: holdEligibility.holdable,
          imageUrl: resolveHotelImage(hotel, asRecord(hotel.rateOption), asRecord(hotel.selectedRateOption)),
          rating: textValue(hotel, "starRating", "category", "hotelCategory"),
          hotelEntry: hotel,
        };
      });
    }),
    ...nonTboSelectedHotelEntries.flatMap((entry, index) => {
      const hotel = asRecord(entry);
      const routeIds = Array.isArray(hotel.displayRouteIds) && hotel.displayRouteIds.length > 0
        ? hotel.displayRouteIds
        : [hotel.routeId || index + 1];
      const dayNumbers = Array.isArray(hotel.displayDayNumbers) && hotel.displayDayNumbers.length > 0
        ? hotel.displayDayNumbers.map((day) => String(day))
        : routeIds.map((_routeId, routeIndex) => String(routeIndex + 1));
      const destinations = Array.isArray(hotel.displayDestinations) ? hotel.displayDestinations : [];
      const displayHotelDetailsIds = Array.isArray(hotel.displayHotelDetailsIds)
        ? hotel.displayHotelDetailsIds
        : [];
      const matchedHotelRow = asRecord(hotel.matchedHotelRow);
      const destinationFallback = textValue(hotel, "destination", "city", "cityName")
        || textValue(matchedHotelRow, "destination", "city", "cityName", "locationName");
      const hotelName = textValue(hotel, "hotelName") || textValue(matchedHotelRow, "hotelName") || `Hotel ${index + 1}`;
      const holdEligibility = getHotelHoldEligibility({ ...matchedHotelRow, ...hotel });
      return dayNumbers.map((dayNumber, dayIndex) => {
        const fallbackHotelDetailsId = displayHotelDetailsIds.length > 0
          ? displayHotelDetailsIds[dayIndex]
          : hotel.itineraryPlanHotelDetailsId
            || hotel.itinerary_plan_hotel_details_ID
            || matchedHotelRow.itineraryPlanHotelDetailsId
            || matchedHotelRow.itinerary_plan_hotel_details_ID;
        const hotelDetailsIds = [Number(fallbackHotelDetailsId || 0)].filter((id) => id > 0);
        const hold = getHoldMetadata(hotelName, hotelDetailsIds, holdEligibility.provider, String(itineraryDateByDay.get(Number(dayNumber)) || "").slice(0, 10));
        return {
        key: `selected-${String(routeIds[dayIndex] || hotel.routeId || index + 1)}-${index}`,
        day: `Day ${dayNumber}`,
        dayDate: formatItineraryDate(itineraryDateByDay.get(Number(dayNumber))),
        routeDate: String(itineraryDateByDay.get(Number(dayNumber)) || "").slice(0, 10),
        destination: destinations[dayIndex]
          || destinations[0]
          || destinationFallback
          || itineraryDestinationByDay.get(Number(dayNumber))
          || "-",
        hotel: hotelName,
        routeId: Number(routeIds[dayIndex] || routeIds[0] || hotel.routeId || hotel.itineraryRouteId || 0),
        hotelId: Number(hotel.hotelId || hotel.canonicalHotelId || matchedHotelRow.hotelId || matchedHotelRow.canonicalHotelId || 0),
        hotelEmail: textValue(hotel, "hotelEmail", "email", "contactEmail") || textValue(matchedHotelRow, "hotelEmail", "email", "contactEmail"),
        routeDates: [textValue(hotel, "checkInDate", "check_in", "date") || textValue(matchedHotelRow, "checkInDate", "check_in", "date")].filter(Boolean),
        imageUrl: resolveHotelImage(
          hotel,
          matchedHotelRow,
          asRecord(hotel.rateOption),
          asRecord(hotel.selectedRateOption),
        ),
        rating: textValue(hotel, "starRating", "category", "hotelCategory") || textValue(matchedHotelRow, "starRating", "category", "hotelCategory"),
        hotelEntry: { ...matchedHotelRow, ...hotel },
        status: hold.status || statusLabel(hotel, false),
        holdUntil: hold.cutoffAt || "-",
        holdRequestId: hold.requestId,
        cutoffAt: hold.cutoffAt,
        maxCutoffAt: hold.maxCutoffAt,
        canExtendHold: hold.canExtendHold,
        canResendHold: hold.canResendHold,
        releaseStatus: hold.releaseStatus,
        releaseEmailStatus: hold.releaseEmailStatus,
        previousCancelledHotelName: hold.previousCancelledHotelName,
        canAcknowledgeRelease: hold.canAcknowledgeRelease,
        holdProvider: hold.provider,
        holdConfirmationChannel: hold.confirmationChannel,
        paidConfirmedAt: hold.paidConfirmedAt,
        hotelDetailsIds,
        holdable: holdEligibility.holdable,
      };
      });
    }),
  ];
  const emittedEarlyCheckInRows = new Set<string>();
  const generatedHotelTableRows = sortHotelReviewRowsChronologically(baseHotelTableRows.flatMap((row): HotelTableRow[] => {
    const hotelName = row.hotel.trim().toLocaleLowerCase();
    const matchingHotelRow = hotelRows.find((candidate) => {
      const candidateHotel = asRecord(candidate);
      const candidateName = textValue(candidateHotel, "hotelName").trim().toLocaleLowerCase();
      const candidateRouteId = Number(candidateHotel.itineraryRouteId || candidateHotel.routeId || 0);
      return candidateName === hotelName && candidateRouteId === Number(row.routeId || 0);
    }) || hotelRows.find((candidate) => {
      const candidateHotel = asRecord(candidate);
      const candidateName = textValue(candidateHotel, "hotelName").trim().toLocaleLowerCase();
      if (candidateName !== hotelName) return false;
      const candidateIds = resolveHotelDetailsIdsFromRows(candidateHotel, hotelRows);
      return candidateIds.some((id) => (row.hotelDetailsIds || []).includes(id));
    });
    const earlyHotel = { ...asRecord(matchingHotelRow), ...asRecord(row.hotelEntry) };
    const previousDayBilling = asRecord(earlyHotel.previousDayBilling || earlyHotel.previous_day_billing);
    const earlyCheckIn = earlyHotel.earlyCheckIn === true
      || Number(earlyHotel.early_checkin || 0) === 1
      || Object.keys(previousDayBilling).length > 0;
    const previousNightDate = textValue(previousDayBilling, "date", "hotelCheckInDate", "hotel_check_in_date");
    const explicitEarlyCheckInDate = textValue(earlyHotel, "earlyCheckInDate", "early_check_in_date");
    const hotelCheckInDate = textValue(earlyHotel, "hotelCheckInDate", "hotel_check_in_date");
    const extraNightDate = previousNightDate
      || explicitEarlyCheckInDate
      || (hotelCheckInDate.slice(0, 10) !== row.routeDate ? hotelCheckInDate : "")
      || previousCalendarDate(row.routeDate || "");

    if (!earlyCheckIn || !extraNightDate || row.day !== "Day 1") return [row];

    const normalizedExtraNightDate = extraNightDate.slice(0, 10);
    const earlyRowIdentity = `${hotelName}|${normalizedExtraNightDate}`;
    if (emittedEarlyCheckInRows.has(earlyRowIdentity)) return [row];
    emittedEarlyCheckInRows.add(earlyRowIdentity);

    return [
      {
        ...row,
        key: `early-check-in-${row.key}`,
        day: "Day 0",
        dayDate: formatItineraryDate(normalizedExtraNightDate),
        routeDate: normalizedExtraNightDate,
        routeDates: [normalizedExtraNightDate],
        isEarlyCheckInExtraNight: true,
      },
      row,
    ];
  })).map((row) => ({
    ...row,
    holdHotelDetailsIds: resolveContinuousHotelHoldSelectionIds(row, baseHotelTableRows),
  }));
  const activeHoldStatuses = new Set([
    "CONTACT_REQUIRED",
    "REQUESTED",
    "CONFIRMATION_AWAITED",
    "BLOCKED",
    "HOLD",
    "WAITLISTED",
    "CONFIRMED",
    "HOTEL_CONFIRMED_PAYMENT_PENDING",
  ]);
  const hotelTableRows = propagateContinuousHotelHoldStatus(generatedHotelTableRows);
  const actionableHotelRows = hotelTableRows.filter((row) => !row.isEarlyCheckInExtraNight);
  const allHotelsHeld = actionableHotelRows.length > 0 && actionableHotelRows.every((row) => (
    Boolean(row.holdRequestId) && activeHoldStatuses.has(row.status)
  ));

  const submitRemoveHold = async (row: HotelTableRow, hotelierContact?: { name: string; phone: string }) => {
    if (!row.holdRequestId || !onCancelHotelHold) return;
    setPendingHotelAction(`remove:${row.holdRequestId}`);
    setHotelActionError(null);
    try {
      await onCancelHotelHold(row.holdRequestId, hotelierContact);
    } catch (error) {
      setHotelActionError(getSafeErrorMessage(error, "Unable to remove the hotel hold."));
    } finally {
      setPendingHotelAction(null);
    }
  };

  const requestRemoveHold = (row: HotelTableRow) => {
    const offlineHold = row.holdConfirmationChannel === "OFFLINE_HOLD"
      || row.holdProvider === "OFFLINE";
    if (offlineHold) {
      void openOfflineHotelierDialog(row, "REMOVE");
      return;
    }
    void submitRemoveHold(row);
  };

  useEffect(() => {
    onBulkHoldAvailabilityChange?.(allHotelsHeld);
  }, [allHotelsHeld, onBulkHoldAvailabilityChange]);

  const handleExtendHold = async (cutoffAt: string) => {
    if (!extensionTarget) return;
    setIsExtendingHold(true);
    try {
      const response = asRecord(await ItineraryService.updateHotelBlockCutoff(extensionTarget.requestId, cutoffAt));
      const updatedRequest = asRecord(response.request);
      const updatedCutoff = textValue(updatedRequest, "cutoffAt", "holdUntil") || cutoffAt;
      setCutoffOverrides((previous) => ({ ...previous, [extensionTarget.requestId]: updatedCutoff }));
      onHoldCutoffUpdated?.(extensionTarget.requestId, updatedCutoff);
      setExtensionTarget(null);
      const emailDeliveryStatus = String(response.emailDeliveryStatus || response.deliveryStatus || "").toUpperCase();
      if (emailDeliveryStatus === "FAILED") {
        toast.warning("Hold extended, but the hotel notification email could not be sent.");
      } else if (emailDeliveryStatus === "QUEUED") {
        toast.success("Hold extended. The hotel notification email is queued.");
      } else if (emailDeliveryStatus === "SKIPPED") {
        toast.warning("Hold extended, but no hotel email address is available.");
      } else {
        toast.success("Hold extended and the hotelier was notified by email.");
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to extend the hotel hold.");
    } finally {
      setIsExtendingHold(false);
    }
  };

  return (
    <>
      {hotelTableRows.length === 0 && headerActions && (
        <div className="mb-3 flex flex-wrap items-center justify-end gap-2">{headerActions}</div>
      )}
      {hotelTableRows.length > 0 && (
        <div data-purpose="hotel-package-table" className="mb-4 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col gap-2 border-b border-slate-100 bg-white px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <h3 className="text-xs font-bold text-[#1e1b4b]">Hotels in This Package</h3>
              <p className="mt-0.5 text-[11px] text-slate-400">Review hotel status and take action before the package hold expires.</p>
            </div>
            {headerActions && <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">{headerActions}</div>}
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-[760px] w-full text-left text-xs">
              <thead className="bg-slate-50 text-[10px] uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-2.5 font-semibold">Day</th>
                  <th className="px-4 py-2.5 font-semibold">Destination</th>
                  <th className="px-4 py-2.5 font-semibold">Hotel</th>
                  <th className="px-4 py-2.5 font-semibold">Status</th>
                  <th className="px-4 py-2.5 font-semibold">Hold Until</th>
                  <th className="px-4 py-2.5 text-right font-semibold">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {hotelTableRows.map((row) => (
                  <tr key={row.key} className="align-middle">
                    <td className="whitespace-nowrap px-4 py-3"><span className="inline-flex rounded-md bg-[#ff9900] px-2.5 py-1 text-[10px] font-bold text-white">{row.day}{row.dayDate ? ` | ${row.dayDate}` : ""}</span></td>
                    <td className="px-4 py-3 text-slate-600">{row.destination}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        {row.imageUrl ? <img src={row.imageUrl} alt={row.hotel} className="h-9 w-9 rounded-md border border-slate-200 object-cover" /> : <span className="h-9 w-9 rounded-md border border-slate-200 bg-slate-100" aria-hidden="true" />}
                        <div><div className="font-bold text-[#1e1b4b]">{row.hotel}</div><div className="mt-0.5 text-[10px] text-amber-500">{row.rating ? `${"★".repeat(Math.min(Math.max(Number.parseInt(row.rating, 10) || 0, 0), 5))}` : ""}</div></div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-[10px] font-semibold ${statusClass(row.status)}`}>
                        <span aria-hidden="true">{["Held", "Available", "HOLD", "BLOCKED", "CONFIRMED"].includes(row.status) ? "✓" : "•"}</span>
                        {getDisplayHotelHoldLabel(row.status)}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-slate-600">
                      {row.previousCancelledHotelName
                        && (!row.holdRequestId || ["CANCELLED", "EXPIRED", "HOLD_EXPIRED", "SUPERSEDED"].includes(row.status)) && (
                        <div className="text-slate-500">Previous hotel: {row.previousCancelledHotelName} (Cancelled)</div>
                      )}
                      {["REQUESTED", "CONFIRMATION_AWAITED"].includes(row.status) ? (
                        <span className="text-orange-600">Awaiting Confirmation</span>
                      ) : row.cutoffAt ? (
                        <>
                          <div>{formatHoldUntil(row.cutoffAt)}</div>
                          <div className={`mt-0.5 text-[10px] ${formatHoldCountdown(row.cutoffAt, now) === "Expired" ? "text-red-600" : "text-slate-400"}`}>
                            {formatHoldCountdown(row.cutoffAt, now)}
                          </div>
                        </>
                      ) : !row.previousCancelledHotelName ? "-" : null}
                      {!row.previousCancelledHotelName && ["EXPIRED", "CANCELLED"].includes(row.status) && row.releaseStatus && (
                        <div className="mt-1 text-[10px] text-slate-500">
                          Inventory release: {row.releaseStatus === "ACKNOWLEDGED" ? "Acknowledged" : row.releaseStatus === "FAILED" ? "Action failed" : row.releaseStatus === "MANUAL_REQUIRED" ? "Manual follow-up required" : "Pending"}
                          {getHotelReleaseEmailStatusLabel(row.releaseEmailStatus) && (
                            <div className={row.releaseEmailStatus === "MANUAL_REQUIRED" || row.releaseEmailStatus === "FAILED" ? "mt-1 text-amber-700" : "mt-1"}>
                              Hotel release: {getHotelReleaseEmailStatusLabel(row.releaseEmailStatus)}
                            </div>
                          )}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {row.isEarlyCheckInExtraNight ? (
                        <span className="text-[10px] text-slate-400">Included with hotel stay</span>
                      ) : <div className="flex flex-wrap justify-end gap-2">
                        {row.status === "CONFIRMED" && (
                          <>
                            <button
                              type="button"
                              onClick={() => onViewHotelVoucher?.({ routeId: row.routeId || 0, hotelId: row.hotelId || 0, hotelName: row.hotel, hotelEmail: row.hotelEmail || "", hotelStateCity: row.destination, routeDates: row.routeDates || [], dayNumbers: [Number(row.day.replace(/\D/g, "")) || 0], hotelDetailsIds: row.hotelDetailsIds || [] })}
                              className="inline-flex rounded-md border border-[#5c24e5] bg-white px-3 py-1.5 text-[10px] font-semibold text-[#5c24e5] transition hover:bg-[#f3eeff]"
                            >
                              View Voucher
                            </button>
                          </>
                        )}
                        <HotelActionsMenu
                          onViewDetails={() => setHotelDetailsTarget({
                            hotel: row.hotelEntry || { hotelName: row.hotel },
                            imageUrl: row.imageUrl,
                            hotelName: row.hotel,
                            destination: row.destination,
                            day: row.day,
                            dayDate: row.dayDate,
                            rating: row.rating,
                          })}
                          onChangeHotel={row.status === "CONFIRMED" || !row.routeId || !row.routeDate
                            ? undefined
                            : () => onChangeHotel?.(row.routeId!, row.routeDate!)}
                          onViewVoucher={row.status === "CONFIRMED" ? () => onViewHotelVoucher?.({ routeId: row.routeId || 0, hotelId: row.hotelId || 0, hotelName: row.hotel, hotelEmail: row.hotelEmail || "", hotelStateCity: row.destination, routeDates: row.routeDates || [], dayNumbers: [Number(row.day.replace(/\D/g, "")) || 0], hotelDetailsIds: row.hotelDetailsIds || [] }) : undefined}
                          onCancelHotel={isTravelExpert && row.holdRequestId && !row.paidConfirmedAt && activeHoldStatuses.has(row.status) && onCancelHotelHold
                            ? () => requestRemoveHold(row)
                            : undefined}
                          cancelHotelLabel="Remove Hold"
                        />
                        {!holdPolicyBlocked && !row.holdRequestId && row.status === "Not Started" && row.holdable !== false && onHoldHotel && (row.hotelDetailsIds?.length || 0) > 0 && (
                          <button
                            type="button"
                            disabled={isOpeningConfirmQuotation || pendingHotelAction === `hold:${row.key}`}
                            onClick={async () => {
                              setPendingHotelAction(`hold:${row.key}`);
                              try {
                                await openHotelHold(row);
                              } catch (error) {
                                setHotelActionError(getSafeErrorMessage(error, "Unable to send the hotel hold request."));
                              } finally {
                                setPendingHotelAction(null);
                              }
                            }}
                            className="inline-flex rounded-md border border-[#ff9900] px-3 py-1.5 text-[10px] font-semibold text-[#c76f00] transition hover:bg-[#fff7ed] disabled:cursor-not-allowed disabled:opacity-60"
                          >
                        {isOpeningConfirmQuotation ? "Preparing..." : pendingHotelAction === `hold:${row.key}` ? "Sending..." : "Hold"}
                          </button>
                        )}
                        {row.canResendHold && row.holdRequestId && onResendHotelHold && (
                          <button
                            type="button"
                            disabled={pendingHotelAction === `resend:${row.holdRequestId}`}
                            onClick={async () => {
                              setPendingHotelAction(`resend:${row.holdRequestId}`);
                              try {
                                await onResendHotelHold(row.holdRequestId!);
                              } catch (error) {
                                setHotelActionError(getSafeErrorMessage(error, "Unable to resend the hotel hold request."));
                              } finally {
                                setPendingHotelAction(null);
                              }
                            }}
                            className="inline-flex rounded-md border border-[#5c24e5] px-3 py-1.5 text-[10px] font-semibold text-[#5c24e5] transition hover:bg-[#f3eeff] disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {pendingHotelAction === `resend:${row.holdRequestId}` ? "Sending..." : "Resend"}
                          </button>
                        )}
                        {["EXPIRED", "CANCELLED"].includes(row.status) && row.canAcknowledgeRelease && row.holdRequestId && row.releaseStatus !== "ACKNOWLEDGED" && onAcknowledgeHotelRelease && (
                          <button
                            type="button"
                            disabled={pendingHotelAction === `release:${row.holdRequestId}`}
                            onClick={async () => {
                              setPendingHotelAction(`release:${row.holdRequestId}`);
                              try {
                                await onAcknowledgeHotelRelease(row.holdRequestId!);
                              } catch (error) {
                                setHotelActionError(getSafeErrorMessage(error, "Unable to record hotel release acknowledgement."));
                              } finally {
                                setPendingHotelAction(null);
                              }
                            }}
                            className="inline-flex rounded-md border border-slate-300 px-3 py-1.5 text-[10px] font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {pendingHotelAction === `release:${row.holdRequestId}` ? "Saving..." : "Record Release"}
                          </button>
                        )}
                        {row.holdRequestId && row.cutoffAt && row.status === "BLOCKED" && (
                          <button
                            type="button"
                            disabled={isExtendingHold}
                            onClick={() => {
                              const target = { requestId: row.holdRequestId!, hotelName: row.hotel, currentCutoffAt: row.cutoffAt!, maxCutoffAt: row.maxCutoffAt };
                              const remainingMs = new Date(row.cutoffAt!).getTime() - now;
                              if (remainingMs > 30 * 60 * 1000) setExtensionWarningTarget(target);
                              else setExtensionTarget(target);
                            }}
                            className="inline-flex rounded-md border border-[#ff9900] px-3 py-1.5 text-[10px] font-semibold text-[#c76f00] transition hover:bg-[#fff7ed] disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            Extend Hold
                          </button>
                        )}
                      </div>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <HotelHoldExtensionDialog
        target={extensionTarget}
        isSubmitting={isExtendingHold}
        onOpenChange={(open) => { if (!open && !isExtendingHold) setExtensionTarget(null); }}
        onSubmit={handleExtendHold}
      />

      <Dialog open={Boolean(extensionWarningTarget)} onOpenChange={(open) => { if (!open) setExtensionWarningTarget(null); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Extend Hotel Hold</DialogTitle>
            <DialogDescription>
              {extensionWarningTarget?.currentCutoffAt
                ? `There is still ${formatHoldCountdown(extensionWarningTarget.currentCutoffAt, now)} on this hold. Do you want to continue?`
                : "There is still time remaining on this hold. Do you want to continue?"}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setExtensionWarningTarget(null)}>Cancel</Button>
            <Button
              type="button"
              onClick={() => {
                if (!extensionWarningTarget) return;
                setExtensionTarget(extensionWarningTarget);
                setExtensionWarningTarget(null);
              }}
              className="bg-[#5c24e5] text-white hover:bg-[#4d1ecc]"
            >
              OK
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <HotelDetailsDialog
        target={hotelDetailsTarget}
        onOpenChange={(open) => { if (!open) setHotelDetailsTarget(null); }}
      />

      <Dialog open={Boolean(hotelActionError)} onOpenChange={(open) => { if (!open) setHotelActionError(null); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-amber-100 text-amber-600 sm:mx-0">
              <AlertTriangle className="h-6 w-6" aria-hidden="true" />
            </div>
            <DialogTitle>Hotel hold request</DialogTitle>
            <DialogDescription>{hotelActionError}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" onClick={() => setHotelActionError(null)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <HotelierContactDialog
        open={Boolean(offlineHoldTarget)}
        title={offlineHotelierDialogAction === "REMOVE"
          ? "Confirm hotelier contact before removal"
          : isAgent ? "Contact your Travel Expert" : isTravelExpert ? "Confirm hotelier contact" : "Travel Expert action required"}
        description={offlineHotelierDialogAction === "REMOVE"
          ? `Confirm you contacted the hotelier${offlineHoldTarget?.hotel ? ` for ${offlineHoldTarget.hotel}` : ""} about removing this hold, then verify their contact details.`
          : isAgent
          ? `Only a Travel Expert can keep an offline hotel hold${offlineHoldTarget?.hotel ? ` for ${offlineHoldTarget.hotel}` : ""}. Please contact your assigned Travel Expert.`
          : isTravelExpert
            ? `Confirm you contacted the hotelier${offlineHoldTarget?.hotel ? ` for ${offlineHoldTarget.hotel}` : ""}, then enter their contact details to record the hold.`
            : "Only a Travel Expert can keep an offline hotel hold. Please contact your Travel Expert."}
        contactName={hotelierContactName}
        onContactNameChange={setHotelierContactName}
        contactPhone={hotelierContactPhone}
        onContactPhoneChange={setHotelierContactPhone}
        phoneOptions={hotelierPhoneOptions}
        selectedPhoneOption={selectedHotelierPhoneOption}
        onPhoneOptionChange={(selected) => {
          setSelectedHotelierPhoneOption(selected);
          setHotelierContactPhone(selected === OTHER_HOTELIER_PHONE_OPTION ? "" : selected);
        }}
        showContactFields={isTravelExpert}
        isLoadingContact={isLoadingHotelContact}
        extraContent={isAgent ? (
          <div className="rounded-md border bg-slate-50 p-3 text-sm">
            {isLoadingAssignedExpert ? <p>Loading assigned Travel Expert…</p> : assignedTravelExpert?.travel_expert_label || assignedTravelExpert?.travel_expert_mobile ? (
              <dl className="space-y-1">
                <div><dt className="inline font-medium">Name: </dt><dd className="inline">{assignedTravelExpert.travel_expert_label || "Not available"}</dd></div>
                <div><dt className="inline font-medium">Phone: </dt><dd className="inline">{assignedTravelExpert.travel_expert_mobile || "Not available"}</dd></div>
              </dl>
            ) : <p>Your assigned Travel Expert contact details are unavailable. Please contact your team administrator.</p>}
          </div>
        ) : null}
        confirmed={hasConfirmedHotelierContact}
        onConfirmedChange={setHasConfirmedHotelierContact}
        confirmationText={isTravelExpert
          ? offlineHotelierDialogAction === "REMOVE"
            ? "I confirm that I contacted the hotelier and informed them that this hold is being removed."
            : "I confirm that I contacted the hotelier and they agreed to hold this stay."
          : undefined}
        error={offlineHoldError}
        isSubmitting={isSubmittingOfflineHold}
        cancelLabel={offlineHotelierDialogAction === "REMOVE" ? "Keep Hold" : "Close"}
        confirmLabel={isTravelExpert
          ? offlineHotelierDialogAction === "REMOVE" ? "Confirm Removal" : "Confirm and Hold"
          : undefined}
        submittingLabel={offlineHotelierDialogAction === "REMOVE" ? "Removing Hold…" : "Keeping hold…"}
        onClose={() => setOfflineHoldTarget(null)}
        onConfirm={() => void submitOfflineHold()}
      />

      {!compact && requiresHotelBookingFlow && externalStayEntries.length > 0 && (
        <div className="space-y-3 rounded-lg border border-amber-200 bg-amber-50 p-4">
          <div>
            <h3 className="font-semibold text-amber-900">External / self-arranged stay required</h3>
            <p className="mt-1 text-xs text-amber-800">These city/date rows do not have supplier-bookable rooms. They will be shown in the itinerary, but they will not be sent to prebook or final supplier booking.</p>
          </div>
          <div className="space-y-2">
            {externalStayEntries.map((entry, index) => (
              <div key={`external-stay-${entry.routeId || "na"}-${index}`} className="rounded-md border border-amber-100 bg-white/80 px-3 py-2">
                <p className="text-sm font-medium text-amber-900">Route {entry.routeId || "-"}{entry.destination ? ` · ${entry.destination}` : ""}{entry.day ? ` · ${entry.day}` : ""}</p>
                <p className="mt-1 text-xs text-amber-800">{entry.availabilityMessage || defaultExternalStayMessage}</p>
              </div>
            ))}
          </div>
          <label className="flex items-start gap-2 text-sm text-amber-900">
            <input type="checkbox" className="mt-1" checked={hasAcceptedUpdatedPrice} onChange={(event) => setHasAcceptedUpdatedPrice(event.target.checked)} />
            <span>I understand these hotel stays are external/self-arranged and will not be booked through supplier APIs.</span>
          </label>
        </div>
      )}

      {!compact && requiresHotelBookingFlow && offlineSelectedHotelEntries.length > 0 && (
        <div className="space-y-3 rounded-lg border border-amber-200 bg-amber-50 p-4">
          <div>
            <h3 className="font-semibold text-amber-900">Offline hotels - manual confirmation required</h3>
            <p className="mt-1 text-xs text-amber-800">These selected hotels are included in the itinerary, but they are not booked through VSR or another live supplier API. Availability and the final rate are subject to hotel confirmation.</p>
          </div>
          <QuotationNonTboSelectedHotels entries={offlineSelectedHotelEntries} normalizePrebookItems={normalizePrebookItems} resolvePrebookInclusions={resolvePrebookInclusions} resolvePrebookMealPlan={resolvePrebookMealPlan} normalizeCancellationPolicyItems={normalizeCancellationPolicyItems} normalizeMealPlanLabel={normalizeMealPlanLabel} keyPrefix="offline-hotel" providerNote="Offline hotel. Manual confirmation is required before this stay is guaranteed." />
          <div className="rounded-md border border-amber-200 bg-white/80 px-3 py-2 text-xs text-amber-900">
            <p className="font-semibold">Mixed live and offline booking instructions</p>
            <ol className="mt-1 list-decimal space-y-1 pl-4">
              <li>Live/VSR hotels are prebooked and booked through supplier APIs when final confirmation is completed.</li>
              <li>Offline hotels are not booked through an API. They remain visible as manual-confirmation stays with their approval status.</li>
              <li>The itinerary can be confirmed now; each offline hotel is then sent for manual approval and confirmation.</li>
              <li>Do not issue a supplier-confirmed voucher for an offline stay until the hotel approves its availability and rate.</li>
            </ol>
          </div>
          <QuotationNonTboAcceptanceNotice accepted={hasAcceptedUpdatedPrice} setAccepted={setHasAcceptedUpdatedPrice} />
        </div>
      )}

      {!compact && requiresHotelBookingFlow && !prebookData && !isPrebooking && !isOpeningConfirmQuotation && supplierManagedNonTboEntries.length > 0 && (
        <div className="space-y-3 rounded-lg border border-[#e5d9f2] bg-[#faf5ff] p-4">
          <h3 className="font-semibold text-[#4a4260]">Selected Hotels (Non-VSR)</h3>
          <p className="text-xs text-[#6c6c6c]">No VSR hotels selected — VSR prebook not required for this booking.</p>
          <QuotationNonTboSelectedHotels entries={supplierManagedNonTboEntries} normalizePrebookItems={normalizePrebookItems} resolvePrebookInclusions={resolvePrebookInclusions} resolvePrebookMealPlan={resolvePrebookMealPlan} normalizeCancellationPolicyItems={normalizeCancellationPolicyItems} normalizeMealPlanLabel={normalizeMealPlanLabel} keyPrefix="ntbo-only" providerNote="Policies and rate conditions are managed by the provider. VSR prebook is not applicable." />
          <QuotationNonTboAcceptanceNotice accepted={hasAcceptedUpdatedPrice} setAccepted={setHasAcceptedUpdatedPrice} />
        </div>
      )}

      {!compact && requiresHotelBookingFlow && prebookData && (
        <div className="space-y-3 rounded-lg border border-[#e5d9f2] bg-[#faf5ff] p-4">
          <h3 className="font-semibold text-[#4a4260]">Prebook Review</h3>
          <div className="grid grid-cols-1 gap-3 text-sm md:grid-cols-3">
            <div><p className="text-[#6c6c6c]">Hotel Final Cost</p><p className="font-semibold text-[#4a4260]">₹ {Number(prebookData.updatedTotalPrice || prebookData.finalPrice || prebookData.totalAmount || 0).toFixed(2)}</p></div>
            <div><p className="text-[#6c6c6c]">Hotels Selected</p><p className="font-semibold text-[#4a4260]">{totalSelectedHotelEntries}</p></div>
            <div><p className="text-[#6c6c6c]">Hotels Prebooked</p><p className="font-semibold text-[#4a4260]">{prebookHotelEntries.length || 0}</p></div>
          </div>
          <QuotationPrebookHotelRows entries={prebookHotelEntries as never} normalizePrebookItems={normalizePrebookItems} resolvePrebookInclusions={resolvePrebookInclusions as never} resolvePrebookMealPlan={resolvePrebookMealPlan as never} normalizeCancellationPolicyItems={normalizeCancellationPolicyItems} normalizeMealPlanLabel={normalizeMealPlanLabel as (value: string) => string} />
          {supplierManagedNonTboEntries.length > 0 && <div className="space-y-2"><p className="mt-1 text-xs font-semibold uppercase tracking-wide text-[#6c6c6c]">Non-VSR Selected Hotels</p><QuotationNonTboSelectedHotels entries={supplierManagedNonTboEntries} normalizePrebookItems={normalizePrebookItems} resolvePrebookInclusions={resolvePrebookInclusions} resolvePrebookMealPlan={resolvePrebookMealPlan} normalizeCancellationPolicyItems={normalizeCancellationPolicyItems} normalizeMealPlanLabel={normalizeMealPlanLabel} keyPrefix="non-tbo-hotel" providerNote="This hotel is managed outside VSR. Details shown here come from the selected provider record." /></div>}
          <QuotationPrebookAcceptanceNotice priceChanged={hasPrebookPriceChanged} accepted={hasAcceptedUpdatedPrice} setAccepted={setHasAcceptedUpdatedPrice} />
        </div>
      )}
      {compact && requiresHotelBookingFlow && (
        <label className="mt-3 flex items-start gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-[11px] text-slate-600">
          <input type="checkbox" className="mt-0.5" checked={hasAcceptedUpdatedPrice} onChange={(event) => setHasAcceptedUpdatedPrice(event.target.checked)} />
          <span>I have reviewed the selected hotel details before final booking confirmation.</span>
        </label>
      )}
    </>
  );
}

export default QuotationHotelReviewSections;
