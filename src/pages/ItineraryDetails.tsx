// FILE: src/pages/ItineraryDetails.tsx
// Keep this as a named + default export module for router compatibility across HMR reloads.

import React, { useEffect, useMemo, useState, useRef, useCallback } from "react";
import { useParams, Link, useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ArrowLeft, ArrowUp, Clock, MapPin, Car, Calendar, Plus, Trash2, ArrowRight, Ticket, Bell, Building2, Timer, FileText, CreditCard, Receipt, AlertTriangle, Loader2, RefreshCw, Edit } from "lucide-react";
import { TimePickerPopover } from "@/components/itinerary/TimePickerPopover";
import { ItineraryService } from "@/services/itinerary";
import type { VehicleBuildStatusResponse } from "@/services/itinerary";
import { api } from "@/lib/api";
import { VehicleList } from "./VehicleList";
import { HotelList } from "./HotelList";
import { VoucherDetailsModal } from "./VoucherDetailsModal";
import { PluckCardModal } from "./PluckCardModal";
import { InvoiceModal } from "./InvoiceModal";
import { IncidentalExpensesModal } from "./IncidentalExpensesModal";
import { HotelSearchModal } from "@/components/hotels/HotelSearchModal";
import { ArrivalHotelDecisionModal } from "@/components/hotels/ArrivalHotelDecisionModal";
import { HotelRoomSelectionModal } from "@/components/hotels/HotelRoomSelectionModal";
import { SupplementDisplay } from "@/components/hotels/SupplementDisplay";
import { CancelItineraryModal } from "@/components/modals/CancelItineraryModal";
import { HotelVoucherModal } from "@/components/modals/HotelVoucherModal";
import { HotelVoucherService } from "@/services/hotelVoucher";
import { HotelSearchResult } from "@/hooks/useHotelSearch";
import { HotelArrivalPolicyRequest, HotelArrivalPolicyResponse } from "@/services/itinerary";
import { toast } from "sonner";
import { getEstimatedSaveMs } from "./CreateItinerary/helpers/saveProgress.constants";

// --------- Types aligned with CURRENT API RESPONSE ---------

type StartSegment = {
  type: "start";
  title: string;
  timeRange: string; // "12:00 AM - 12:00 AM"
};

type TravelSegment = {
  type: "travel";
  from: string;
  to: string;
  timeRange: string; // "06:30 AM - 06:45 AM"
  distance: string;
  duration: string; // "15 Min"
  note?: string | null;
  isConflict?: boolean;
  conflictReason?: string | null;
};

type BreakSegment = {
  type: "break";
  location: string;
  duration: string; // "1 Hour 30 Min"
  timeRange: string; // "12:00 PM - 01:30 PM"
};

type Activity = {
  id: number;
  activityId: number;
  title: string;
  description: string;
  amount: number;
  startTime: string | null;
  endTime: string | null;
  duration: string | null;
  image: string | null;
  galleryImages?: string[];
};

type AttractionSegment = {
  type: "attraction";
  name: string;
  description: string;
  visitTime: string; // "06:45 AM - 08:45 AM"
  duration: string; // "2 Hours"
  priority?: number;
  amount: number | null; // Entry cost
  timings?: string;
  image: string | null;
  galleryImages?: string[];
  videoUrl?: string | null;
  planOwnWay?: boolean;
  activities?: Activity[];
  hasAvailableActivities?: boolean;
  hotspotId?: number;
  routeHotspotId?: number;
  locationId?: number | null;
  isConflict?: boolean;
  conflictReason?: string | null;
  isManual?: boolean;
};

type HotspotSegment = {
  type: "hotspot";
  text: string;
  locationId?: number;
  anchorType?: "after_travel";
  anchorIndex?: number;
  anchorFrom?: string;
  anchorTo?: string;
  anchorTimeRange?: string | null;
};

type HotspotAnchor = {
  anchorType: "after_travel";
  anchorIndex: number;
  anchorFrom?: string;
  anchorTo?: string;
  anchorTimeRange?: string | null;
};

type CheckinSegment = {
  type: "checkin";
  hotelName: string;
  hotelAddress: string;
  time: string | null; // "06:00 PM"
};

type ReturnSegment = {
  type: "return";
  time: string; // "08:00 PM"
  note?: string | null;
};

type ItinerarySegment =
  | StartSegment
  | TravelSegment
  | BreakSegment
  | AttractionSegment
  | HotspotSegment
  | CheckinSegment
  | ReturnSegment;

type ViaRouteItem = {
  id: number;
  name: string;
};

type ItineraryDay = {
  id: number;
  dayNumber: number;
  date: string; // ISO
  departure: string | null;
  arrival: string | null;
  distance: string; // total distance
  intercityDistance?: string; // only main destination-to-destination distance
  sightseeingDistance?: string; // only sightseeing/local movement distance
  startTime: string; // "12:00 PM"
  endTime: string; // "08:00 PM"
  viaRoutes?: ViaRouteItem[];
  segments: ItinerarySegment[];
};

// --------- HOTELS (matches backend DTO) ---------

export type ItineraryHotelRow = {
  groupType: number;
  itineraryRouteId: number;
  day: string;
  destination: string;
  hotelId: number;
  hotelName: string;
  category: number | string;
  roomType: string;
  mealPlan: string;
  totalHotelCost: number;
  totalHotelTaxAmount: number;
  noOfRooms?: number;
  provider?: string; // Provider source (tbo, resavenue, hobse)
  voucherCancelled?: boolean; // Whether voucher is cancelled
  itineraryPlanHotelDetailsId?: number;
  date?: string;
  // ✅ HOBSE-specific fields (optional, used if provider === "HOBSE")
  hotelCode?: string; // HOBSE hotel code
  bookingCode?: string; // HOBSE booking code
  checkInDate?: string; // YYYY-MM-DD format
  checkOutDate?: string; // YYYY-MM-DD format
  // ✅ Hotel distance from route location (calculated via Haversine on backend)
  hotelDistance?: string | null; // Distance in "XX.XX KM" format
  hotelAddress?: string | null;
  cancellationPolicy?: string[];
};

export type ItineraryHotelTab = {
  groupType: number;
  label: string;
  totalAmount: number;
};

type HotelAvailabilityMeta = {
  hasSupplierHotels: boolean;
  supplierHotelCount: number;
  placeholderRowCount: number;
  totalSearchRoutes: number;
  emptySearchRoutes: number;
  isPlaceholderOnly: boolean;
  message: string;
};

const normalizeMealPlanLabel = (value?: string | null): string => {
  const mealPlanLabelByCode: Record<string, string> = {
    CP: 'CP - Continental Plan (Breakfast only)',
    EP: 'EP - European Plan (Room only)',
    MAP: 'MAP - Modified American Plan (Breakfast + Lunch or Dinner)',
    AP: 'AP - American Plan (Breakfast + Lunch + Dinner)',
  };

  const raw = String(value || '').trim();
  if (!raw || raw === '-') return mealPlanLabelByCode.EP;

  const upper = raw.toUpperCase();
  if (upper === 'CP' || upper.includes('CONTINENTAL PLAN')) return mealPlanLabelByCode.CP;
  if (upper === 'MAP' || upper.includes('MODIFIED AMERICAN PLAN')) return mealPlanLabelByCode.MAP;
  if (upper === 'AP' || upper === 'AMERICAN PLAN') return mealPlanLabelByCode.AP;
  if (upper === 'EP' || upper.includes('EUROPEAN PLAN') || upper.includes('ROOM ONLY') || upper.includes('NO MEAL')) return mealPlanLabelByCode.EP;

  if (upper.includes('ALL MEALS') || upper.includes('FULL BOARD') || upper.includes('FULLBOARD')) return mealPlanLabelByCode.AP;
  if (upper.includes('HALF BOARD') || upper.includes('HALFBOARD')) return mealPlanLabelByCode.MAP;

  const hasBreakfast = upper.includes('BREAKFAST');
  const hasLunch = upper.includes('LUNCH');
  const hasDinner = upper.includes('DINNER');

  if (hasBreakfast && hasLunch && hasDinner) return mealPlanLabelByCode.AP;
  if ((hasBreakfast && hasLunch) || (hasBreakfast && hasDinner) || (hasLunch && hasDinner)) return mealPlanLabelByCode.MAP;
  if (hasBreakfast) return mealPlanLabelByCode.CP;

  return mealPlanLabelByCode.EP;
};

// --------- VEHICLES ---------

type VehicleCostBreakdownItem = {
  label: string;
  amount: string | number;
};

export type ItineraryVehicleRow = {
  vendorName: string | null;
  branchName: string | null;
  vehicleOrigin: string | null;
  totalQty: string;
  totalAmount: string;

  // vehicle type information
  vendorEligibleId?: number;
  vehicleTypeId?: number;
  vehicleTypeName?: string;
  isAssigned?: boolean;

  // per-vehicle charges (optional; fill from API)
  rentalCharges?: number | string;
  tollCharges?: number | string;
  parkingCharges?: number | string;
  driverCharges?: number | string;
  permitCharges?: number | string;
  before6amDriver?: number | string;
  before6amVendor?: number | string;
  after8pmDriver?: number | string;
  after8pmVendor?: number | string;
  breakdown?: VehicleCostBreakdownItem[];

  // UI fields for the image + distance row
  dayLabel?: string; // "Day-1 | 28 Nov 2025 | Outstation"
  fromLabel?: string; // "CHENNAI INTERNATIONAL AIRPORT"
  toLabel?: string; // "CHENNAI"
  packageLabel?: string; // "Outstation - 250KM"
  col1Distance?: string; // "30.22 KM"
  col1Duration?: string; // "0 Min"
  col2Distance?: string; // "0.00 KM"
  col2Duration?: string; // "0 Min"
  col3Distance?: string; // "30.22 KM"
  col3Duration?: string; // "0 Min"
  imageUrl?: string | null; // vehicle image if you ever have it
};

type PackageIncludes = {
  description: string | null;
  houseBoatNote: string | null;
  rateNote: string | null;
};

type CostBreakdown = {
  // Hotel costs
  totalRoomCost?: number | null;
  roomCostPerPerson?: number | null;
  hotelPaxCount?: number | null;
  totalAmenitiesCost?: number | null;
  extraBedCost?: number | null;
  childWithBedCost?: number | null;
  childWithoutBedCost?: number | null;
  totalHotelAmount?: number | null;

  // Vehicle costs
  totalVehicleCost: number | null;
  totalVehicleAmount: number | null;
  totalVehicleQty?: number | null;

  // Activity/Guide costs
  totalGuideCost?: number | null;
  totalHotspotCost?: number | null;
  totalActivityCost?: number | null;

  // Final calculations
  additionalMargin: number | null;
  totalAmount: number | null;
  couponDiscount: number | null;
  agentMargin: number | null;
  totalRoundOff: number | null;
  netPayable: number | null;
  companyName: string | null;
};

// ----------------- Main API response types -----------------

type ItineraryDetailsResponse = {
  // planId for routing back to create-itinerary
  planId?: number;
  itineraryPreference?: number;
  confirmed_itinerary_plan_ID?: number;
  isConfirmed?: boolean;
  quoteId: string;
  dateRange: string;
  dayCount?: number;
  nightCount?: number;
  roomCount: number;
  extraBed: number;
  childWithBed: number;
  childWithoutBed: number;
  adults: number;
  children: number;
  infants: number;
  overallCost: string | number; // API is giving "15000.00"
  meal_plan_code?: string | null;

  days: ItineraryDay[];

  // VEHICLES
  vehicles: ItineraryVehicleRow[];

  packageIncludes: PackageIncludes;
  costBreakdown: CostBreakdown;
};

// response shape from /itineraries/hotel_details/:quoteId
type ItineraryHotelDetailsResponse = {
  hotelRatesVisible: boolean;
  hotelTabs: ItineraryHotelTab[];
  hotels: ItineraryHotelRow[];
  hotelAvailability?: HotelAvailabilityMeta;
  pagination?: Record<number, { hasMore: boolean; page: number; pageSize: number; total: number }>;
  routePagination?: Record<string, { hasMore: boolean; page: number; pageSize: number; total: number; groupType: number }>;
};

type VehicleBuildState = "PENDING" | "PROCESSING" | "READY" | "FAILED";

// Dedupe in-flight details requests per quote to prevent duplicate API calls
// in React StrictMode/dev remount scenarios.
const detailsInFlight = new Map<string, Promise<ItineraryDetailsResponse>>();

const getDetailsDeduped = (quoteId: string): Promise<ItineraryDetailsResponse> => {
  const existing = detailsInFlight.get(quoteId);
  if (existing) {
    return existing;
  }

  const req = (ItineraryService.getDetails(quoteId) as Promise<ItineraryDetailsResponse>)
    .finally(() => {
      detailsInFlight.delete(quoteId);
    });

  detailsInFlight.set(quoteId, req);
  return req;
};

// ----------------- Helper functions -----------------

const formatHeaderDate = (iso: string) => {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-GB", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const getDisplayDistances = (day: ItineraryDay) => {
  return {
    intercityDistance: day.intercityDistance || day.distance,
    sightseeingDistance: day.sightseeingDistance || "0.00 KM",
  };
};

const parseDisplayTimeToHms = (displayTime: string): string => {
  if (!displayTime) return "09:00:00";
  const parts = displayTime.split(' ');
  if (parts.length < 2) return "09:00:00";
  const [time, ampm] = parts;
  const timeParts = time.split(':');
  if (timeParts.length < 2) return "09:00:00";
  let [hours, minutes] = timeParts.map(Number);

  if (ampm === 'PM' && hours < 12) hours += 12;
  if (ampm === 'AM' && hours === 12) hours = 0;

  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:00`;
};

// Returns true for times in the 01:00–07:59 range (early morning, requires previous-day hotel)
const isEarlyMorningTime = (hms: string): boolean => {
  const [h = 0, m = 0] = hms.split(':').map(Number);
  const totalMinutes = h * 60 + m;
  return totalMinutes >= 60 && totalMinutes < 480;
};

const normalizeTimelineLabel = (value: unknown): string => {
  return String(value ?? '').trim().toLowerCase();
};

const parseDisplayMinutes = (value?: string | null, edge: 'start' | 'end' = 'start'): number | null => {
  const raw = String(value ?? '').trim();
  if (!raw) return null;

  const timeText = raw.includes(' - ')
    ? raw.split(' - ')[edge === 'start' ? 0 : 1]?.trim()
    : raw;

  if (!timeText) return null;

  const hms = parseDisplayTimeToHms(timeText);
  const [hours = 0, minutes = 0] = hms.split(':').map(Number);
  if (Number.isNaN(hours) || Number.isNaN(minutes)) return null;
  return hours * 60 + minutes;
};

const formatMinutesToDisplay = (totalMinutes: number): string => {
  const normalized = ((Math.round(totalMinutes) % 1440) + 1440) % 1440;
  const hours24 = Math.floor(normalized / 60);
  const minutes = normalized % 60;
  const period = hours24 >= 12 ? 'PM' : 'AM';
  const hours12 = hours24 % 12 || 12;
  return `${String(hours12).padStart(2, '0')}:${String(minutes).padStart(2, '0')} ${period}`;
};

const formatMinutesDuration = (minutes: number): string => {
  const safeMinutes = Math.max(0, Math.round(minutes));
  const hours = Math.floor(safeMinutes / 60);
  const remainder = safeMinutes % 60;

  if (hours > 0 && remainder > 0) return `${hours} Hours ${remainder} Min`;
  if (hours > 0) return `${hours} Hours`;
  return `${remainder} Min`;
};

const parseDistanceKmValue = (distanceText?: string | null): number | null => {
  const raw = String(distanceText ?? '').trim().toLowerCase();
  if (!raw) return null;

  const value = Number.parseFloat(raw.replace(/[^0-9.]/g, ''));
  if (!Number.isFinite(value) || value <= 0) return null;

  if (raw.includes('km')) return value;
  if (raw.includes('m')) return value / 1000;
  return value;
};

const estimateHotelTravelMinutesFromDistance = (distanceText?: string | null): number | null => {
  const distanceKm = parseDistanceKmValue(distanceText);
  if (distanceKm === null) return null;

  // Keep this conservative for city traffic conditions.
  const assumedCitySpeedKmH = 25;
  const estimated = Math.round((distanceKm / assumedCitySpeedKmH) * 60);
  return Math.max(10, estimated);
};

const parseDurationMinutesValue = (durationValue: unknown): number | null => {
  if (durationValue == null) return null;
  if (typeof durationValue === 'number' && Number.isFinite(durationValue) && durationValue > 0) {
    return Math.max(1, Math.round(durationValue));
  }

  const text = String(durationValue).trim().toLowerCase();
  if (!text) return null;

  const hourMatch = text.match(/(\d+(?:\.\d+)?)\s*h/);
  const minMatch = text.match(/(\d+(?:\.\d+)?)\s*m/);

  const hours = hourMatch ? Number.parseFloat(hourMatch[1]) : 0;
  const minutes = minMatch ? Number.parseFloat(minMatch[1]) : 0;
  const total = (Number.isFinite(hours) ? hours * 60 : 0) + (Number.isFinite(minutes) ? minutes : 0);
  if (total > 0) return Math.max(1, Math.round(total));

  const numeric = Number.parseFloat(text.replace(/[^0-9.]/g, ''));
  if (!Number.isFinite(numeric) || numeric <= 0) return null;
  return Math.max(1, Math.round(numeric));
};

const normalizeDurationAgainstDistance = (
  distanceValue: unknown,
  durationValue: unknown,
  maxPlausibleSpeedKmH = 140,
): number | null => {
  const distanceKm = typeof distanceValue === 'number'
    ? (Number.isFinite(distanceValue) && distanceValue > 0 ? distanceValue : null)
    : parseDistanceKmValue(String(distanceValue ?? ''));
  if (distanceKm === null) return parseDurationMinutesValue(durationValue);

  const baseDurationMin = parseDurationMinutesValue(durationValue);
  if (baseDurationMin === null) {
    return estimateHotelTravelMinutesFromDistance(`${distanceKm} km`);
  }

  const impliedSpeed = distanceKm / (baseDurationMin / 60);
  if (Number.isFinite(impliedSpeed) && impliedSpeed <= maxPlausibleSpeedKmH) {
    return baseDurationMin;
  }

  return estimateHotelTravelMinutesFromDistance(`${distanceKm} km`) || baseDurationMin;
};

const normalizeDateToYmd = (input?: string | null): string => {
  const raw = String(input || '').trim();
  if (!raw) return '';

  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    return raw;
  }

  const dmy = raw.match(/^(\d{1,2})[-\/](\d{1,2})[-\/](\d{4})$/);
  if (dmy) {
    const day = Number(dmy[1]);
    const month = Number(dmy[2]);
    const year = Number(dmy[3]);
    if (year >= 1900 && month >= 1 && month <= 12 && day >= 1 && day <= 31) {
      return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    }
  }

  const parsed = new Date(raw);
  if (!Number.isNaN(parsed.getTime())) {
    return parsed.toISOString().split('T')[0];
  }

  return '';
};

// ----------------- Main Component -----------------
// Note: keep explicit named + default export shape for router/HMR compatibility.

interface ItineraryDetailsProps {
  readOnly?: boolean; // If true, component is read-only (confirmed itinerary view)
}

export const ItineraryDetails: React.FC<ItineraryDetailsProps> = ({ readOnly = false }) => {
  const { id: quoteId } = useParams();
  const location = useLocation();
    const navigate = useNavigate();
  console.log('🔵 ItineraryDetails component MOUNTED with quoteId:', quoteId, 'readOnly:', readOnly);
  //Extra
  console.log('🔵 Current location pathname:', location.pathname);

  const [itinerary, setItinerary] = useState<ItineraryDetailsResponse | null>(
    null
  );
  const shouldShowHotels = (() => {
    const pref = Number(itinerary?.itineraryPreference ?? 0);
    return pref === 1 || pref === 3;
  })();
  const shouldShowVehicles = (() => {
    const pref = Number(itinerary?.itineraryPreference ?? 0);
    return pref === 2 || pref === 3;
  })();
  const [hotelDetails, setHotelDetails] =
    useState<ItineraryHotelDetailsResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [vehicleBuildStatus, setVehicleBuildStatus] = useState<VehicleBuildStatusResponse | null>(null);
  const [isRetryingVehicleBuild, setIsRetryingVehicleBuild] = useState(false);

  // Delete hotspot modal state
  const [deleteHotspotModal, setDeleteHotspotModal] = useState<{
    open: boolean;
    planId: number | null;
    routeId: number | null;
    hotspotId: number | null;
    hotspotName: string;
    hotspotWasPrebuilt: boolean;
  }>({
    open: false,
    planId: null,
    routeId: null,
    hotspotId: null,
    hotspotName: "",
    hotspotWasPrebuilt: false,
  });
  const [isDeleting, setIsDeleting] = useState(false);
  const [routeNeedsRebuild, setRouteNeedsRebuild] = useState<number | null>(null);
  const [isRebuilding, setIsRebuilding] = useState(false);
  const [excludedHotspotIds, setExcludedHotspotIds] = useState<number[]>([]);

  // Add activity modal state
  type AvailableActivity = {
    id: number;
    title: string;
    description: string;
    costAdult: number;
    costChild: number;
    costForeignAdult: number;
    costForeignChild: number;
    duration: string | null;
    timeSlots?: Array<{
      id: number;
      type: number;
      specialDate: string | null;
      startTime: string | null;
      endTime: string | null;
    }>;
  };

  const [addActivityModal, setAddActivityModal] = useState<{
    open: boolean;
    planId: number | null;
    routeId: number | null;
    routeHotspotId: number | null;
    hotspotId: number | null;
    hotspotName: string;
  }>({
    open: false,
    planId: null,
    routeId: null,
    routeHotspotId: null,
    hotspotId: null,
    hotspotName: "",
  });
  const [availableActivities, setAvailableActivities] = useState<AvailableActivity[]>([]);
  const [loadingActivities, setLoadingActivities] = useState(false);
  const [isAddingActivity, setIsAddingActivity] = useState(false);
  const [activityPreview, setActivityPreview] = useState<any>(null);
  const [previewingActivityId, setPreviewingActivityId] = useState<number | null>(null);

  // All-hotspots preview modal state
  const [allHotspotsPreviewModal, setAllHotspotsPreviewModal] = useState<{
    open: boolean;
    loading: boolean;
    data: any | null;
    planId: number | null;
    routeId: number | null;
    activityId: number | null;
  }>({
    open: false,
    loading: false,
    data: null,
    planId: null,
    routeId: null,
    activityId: null,
  });

  // Delete activity modal state
  const [deleteActivityModal, setDeleteActivityModal] = useState<{
    open: boolean;
    planId: number | null;
    routeId: number | null;
    activityId: number | null;
    activityName: string;
  }>({
    open: false,
    planId: null,
    routeId: null,
    activityId: null,
    activityName: "",
  });
  const [isDeletingActivity, setIsDeletingActivity] = useState(false);

  // Add hotspot modal state
  type AvailableHotspot = {
    id: number;
    name: string;
    amount: number;
    description: string;
    timeSpend: number;
    locationMap: string | null;
    image?: string | null;
    galleryImages?: string[];
    videoUrl?: string | null;
    timings?: string;
    visitAgain?: boolean;
    alreadyAdded?: boolean;
    alreadyAddedOnOtherRoute?: boolean;
    availabilityStatus?: 'AVAILABLE' | 'ACTIVE_THIS_ROUTE' | 'ACTIVE_OTHER_ROUTE' | 'EXCLUDED_BY_ROUTE' | 'MASTER_INACTIVE';
    availabilityReason?: string;
    actionDisabled?: boolean;
    buttonLabel?: string;
    priority?: number;
    hotspotPriority?: number;
    hotspot_priority?: number;
    cityContext?: 'SOURCE_CITY' | 'DESTINATION_CITY' | 'UNKNOWN';
  };

  const [addHotspotModal, setAddHotspotModal] = useState<{
    open: boolean;
    planId: number | null;
    routeId: number | null;
    locationId: number | null;
    locationName: string;
  }>({
    open: false,
    planId: null,
    routeId: null,
    locationId: null,
    locationName: "",
  });

  // Add Hotspot state
  const [loadingHotspots, setLoadingHotspots] = useState(false);
  const [isAddingHotspot, setIsAddingHotspot] = useState(false);
  const [hotspotSearchQuery, setHotspotSearchQuery] = useState("");
  const [availableHotspots, setAvailableHotspots] = useState<AvailableHotspot[]>([]);
  const [hotspotFilterMeta, setHotspotFilterMeta] = useState<any | null>(null);
  const [previewTimelinesByHotspot, setPreviewTimelinesByHotspot] = useState<Record<number, any[]>>({});
  const [previewResolutionsByHotspot, setPreviewResolutionsByHotspot] = useState<Record<number, any>>({});
  const [groupPreviewTimeline, setGroupPreviewTimeline] = useState<any[]>([]);
  const [groupPreviewResolution, setGroupPreviewResolution] = useState<any | null>(null);
  const [tempModalTimeline, setTempModalTimeline] = useState<any[]>([]);
  const [forceReplacementApprovedByHotspot, setForceReplacementApprovedByHotspot] = useState<Record<number, boolean>>({});
  const [topPriorityReplacementApproved, setTopPriorityReplacementApproved] = useState(false);
  const [isPreviewingHotspotId, setIsPreviewingHotspotId] = useState<number | null>(null);
  const [activePreviewHotspotId, setActivePreviewHotspotId] = useState<number | null>(null);
  const [addedInModalHotspotIds, setAddedInModalHotspotIds] = useState<Set<number>>(new Set());
  const [manualPreviewState, setManualPreviewState] = useState<any | null>(null);
  const [isApplyingPreviewHotspot, setIsApplyingPreviewHotspot] = useState(false);
  const [isBuildingMatrix, setIsBuildingMatrix] = useState(false);
  const [selectedHotspotIds, setSelectedHotspotIds] = useState<number[]>([]);
  const [selectedHotspotAnchor, setSelectedHotspotAnchor] = useState<HotspotAnchor | null>(null);
  const [activeHotspotCityTab, setActiveHotspotCityTab] = useState<'ALL' | 'SOURCE_CITY' | 'DESTINATION_CITY' | 'UNKNOWN'>('ALL');

  // Refs for scrolling
  const hotspotListRef = useRef<HTMLDivElement>(null);
  const timelinePreviewRef = useRef<HTMLDivElement>(null);
  const priorityConfirmRef = useRef<HTMLDivElement>(null);
  const previewRequestIdRef = useRef(0);

  const selectedHotspotId = activePreviewHotspotId ?? (selectedHotspotIds.length > 0
    ? selectedHotspotIds[selectedHotspotIds.length - 1]
    : null);

  const resetManualHotspotPreviewState = useCallback(() => {
    setManualPreviewState(null);
    setPreviewTimelinesByHotspot({});
    setPreviewResolutionsByHotspot({});
    setGroupPreviewTimeline([]);
    setGroupPreviewResolution(null);
    setTempModalTimeline([]);
    setForceReplacementApprovedByHotspot({});
    setTopPriorityReplacementApproved(false);
    setSelectedHotspotIds([]);
    setIsPreviewingHotspotId(null);
  }, []);

  const resetManualHotspotPreviewStateButKeepActiveHotspot = useCallback((candidateId: number) => {
    resetManualHotspotPreviewState();
    setActivePreviewHotspotId(candidateId);
  }, [resetManualHotspotPreviewState]);

  const extractTravelToFromText = useCallback((value: unknown): string => {
    const raw = String(value || '').trim();
    if (!raw) return '';
    const match = raw.match(/^travel\s+to\s+(.+)$/i);
    return String(match?.[1] || '').trim();
  }, []);

  const extractTravelFromToFromText = useCallback((value: unknown): { from: string; to: string } => {
    const raw = String(value || '').trim();
    if (!raw) return { from: '', to: '' };
    const match = raw.match(/^travell?ing\s+from\s+(.+?)\s+to\s+(.+)$/i);
    if (!match) return { from: '', to: '' };
    return {
      from: String(match[1] || '').trim(),
      to: String(match[2] || '').trim(),
    };
  }, []);

  const mapDaySegmentToPreview = useCallback((seg: ItinerarySegment): any | null => {
    if (!seg) return null;

    if (seg.type === "hotspot") return null;

    if (seg.type === "attraction") {
      return {
        type: "attraction",
        text: seg.name,
        timeRange: seg.visitTime || null,
        visitTime: seg.visitTime || null,
        duration: seg.duration || null,
        timings: seg.timings || null,
        priority: seg.priority ?? null,
        locationId: Number(seg.hotspotId ?? seg.locationId ?? 0) || null,
        isConflict: seg.isConflict === true,
        conflictReason: seg.conflictReason ?? null,
      };
    }

    if (seg.type === "travel") {
      const travelSeg = seg as any;
      const resolvedTo = String(travelSeg?.to || extractTravelToFromText(travelSeg?.text) || '').trim();
      return {
        type: "travel",
        text: resolvedTo ? `Travel to ${resolvedTo}` : (travelSeg?.text || 'Travel'),
        timeRange: travelSeg?.timeRange || null,
        locationId: null,
        isConflict: travelSeg?.isConflict === true,
        conflictReason: travelSeg?.conflictReason ?? null,
        from: travelSeg?.from,
        to: travelSeg?.to,
        fromName: travelSeg?.from,
        toName: travelSeg?.to,
        displayFromName: travelSeg?.from,
        displayToName: travelSeg?.to,
        distance: travelSeg?.distance || null,
        duration: travelSeg?.duration || null,
      };
    }

    if (seg.type === "start") {
      return {
        type: "start",
        text: seg.title || "Start",
        timeRange: seg.timeRange || null,
        locationId: null,
      };
    }

    if (seg.type === "break") {
      return {
        type: "break",
        text: `Break at ${seg.location}`,
        timeRange: seg.timeRange || null,
        locationId: null,
      };
    }

    if (seg.type === "checkin") {
      return {
        type: "checkin",
        text: `Check-in at ${seg.hotelName}`,
        timeRange: seg.time || null,
        locationId: null,
      };
    }

    if (seg.type === "return") {
      return {
        type: "return",
        text: "Return",
        timeRange: seg.time || null,
        locationId: null,
      };
    }

    return null;
  }, [extractTravelToFromText]);

  const defaultPreviewTimeline = useMemo(() => {
    const routeId = addHotspotModal.routeId;
    if (!routeId || !itinerary?.days?.length) return [];

    const day = itinerary.days.find((d) => Number(d.id) === Number(routeId));
    if (!day?.segments?.length) return [];

    return day.segments
      .map(mapDaySegmentToPreview)
      .filter(Boolean);
  }, [addHotspotModal.routeId, itinerary?.days, mapDaySegmentToPreview]);

  const selectedPreviewSegments = useMemo(() => {
    const fallbackFor = (hotspotId: number) => {
      const hotspot = availableHotspots.find((h) => Number(h.id) === Number(hotspotId));
      return {
        type: "attraction",
        text: hotspot?.name || "Selected Hotspot",
        timeRange: null,
        locationId: hotspotId,
        isConflict: false,
        conflictReason: null,
        isUserSelectedPreview: true,
        selectedHotspotId: hotspotId,
      };
    };

    return selectedHotspotIds.map((hotspotId) => {
      const timeline = previewTimelinesByHotspot[hotspotId] || [];
      const candidates = timeline.filter((seg: any) => (
        seg?.type === "attraction" && Number(seg?.locationId) === Number(hotspotId)
      ));

      const hasConflictCandidate = candidates.some((seg: any) => seg?.isConflict === true);
      const fromTimeline = candidates.sort((a: any, b: any) => {
        const aConflict = a?.isConflict === true ? 1 : 0;
        const bConflict = b?.isConflict === true ? 1 : 0;
        if (aConflict !== bConflict) {
          return hasConflictCandidate ? (bConflict - aConflict) : (aConflict - bConflict);
        }
        const toStartMinutes = (timeRange: string): number => {
          const raw = String(timeRange || '').trim();
          const startPart = raw.split('-')[0]?.trim() || raw;
          const match = startPart.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
          if (!match) return Number.MAX_SAFE_INTEGER;
          let h = Number(match[1]);
          const m = Number(match[2]);
          const ampm = match[3].toUpperCase();
          if (ampm === 'AM' && h === 12) h = 0;
          if (ampm === 'PM' && h !== 12) h += 12;
          return (h * 60) + m;
        };
        return toStartMinutes(String(a?.timeRange || '')) - toStartMinutes(String(b?.timeRange || ''));
      })[0];

      if (!fromTimeline) {
        return fallbackFor(hotspotId);
      }

      return {
        ...fromTimeline,
        isUserSelectedPreview: true,
        selectedHotspotId: hotspotId,
      };
    });
  }, [availableHotspots, previewTimelinesByHotspot, selectedHotspotIds]);

  const activePreviewTimeline = useMemo(() => {
    const sourceTimeline = (Array.isArray(manualPreviewState?.fullTimeline) && manualPreviewState.fullTimeline.length > 0)
      ? manualPreviewState.fullTimeline
      : (selectedHotspotId ? (previewTimelinesByHotspot[selectedHotspotId] || []) : []);
    if (!selectedHotspotId && sourceTimeline.length === 0) return [];

    const routeScopedRows = sourceTimeline
      .filter((row: any) => {
        const rowRouteId = Number(
          row?.itinerary_route_ID ??
          row?.itineraryRouteId ??
          row?.itinerary_route_id ??
          row?.route_id ??
          row?.routeId ??
          row?.dayId ??
          row?.routeID ??
          row?.route,
        );
        if (!Number.isFinite(rowRouteId) || rowRouteId <= 0) return true;
        return rowRouteId === Number(addHotspotModal.routeId);
      });
    const rows = [...routeScopedRows];

    const anyHavePreviewOrder = rows.some((row: any) => (
      Number.isFinite(Number(row?.matrixPreviewOrder ?? row?.previewOrder))
    ));
    if (anyHavePreviewOrder) {
      return [...rows].sort((a: any, b: any) => (
        Number(a?.matrixPreviewOrder ?? a?.previewOrder ?? 9999)
        - Number(b?.matrixPreviewOrder ?? b?.previewOrder ?? 9999)
      ));
    }

    const hasMatrixOrderedRows = rows.some((row: any) => (
      row?.isMatrixSplitTravel === true || row?.isMatrixPositioned === true
    ));
    if (hasMatrixOrderedRows) {
      return rows;
    }

    const parseStartMinutes = (value: any): number => {
      const raw = String(value || '').trim();
      if (!raw || raw === '--' || /manual override/i.test(raw) || raw === 'Not schedulable') {
        return Number.POSITIVE_INFINITY;
      }

      const startPart = raw.split('-')[0]?.trim() || raw;
      const match = startPart.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
      if (!match) return Number.POSITIVE_INFINITY;

      let hour = Number(match[1]);
      const minute = Number(match[2]);
      const ampm = match[3].toUpperCase();

      if (ampm === 'AM' && hour === 12) hour = 0;
      if (ampm === 'PM' && hour !== 12) hour += 12;

      return hour * 60 + minute;
    };

    const typePriority = (segment: any): number => {
      const rawType = String(segment?.type || segment?.itemType || '').toLowerCase();
      if (rawType === 'refreshment' || Number(segment?.item_type) === 1) return 0;
      if (rawType === 'travel' || Number(segment?.item_type) === 3) return 1;
      if (rawType === 'attraction' || Number(segment?.item_type) === 4) return 2;
      if (rawType === 'hotel' || Number(segment?.item_type) === 6) return 4;
      return 3;
    };

    return rows.sort((a: any, b: any) => {
      const startDiff = parseStartMinutes(a?.timeRange) - parseStartMinutes(b?.timeRange);
      if (startDiff !== 0) return startDiff;
      return typePriority(a) - typePriority(b);
    });
  }, [addHotspotModal.routeId, manualPreviewState, previewTimelinesByHotspot, selectedHotspotId]);

  const activePreviewResolution = useMemo(() => {
    if (manualPreviewState) {
      return manualPreviewState?.resolution || manualPreviewState || null;
    }
    if (groupPreviewResolution) return groupPreviewResolution;
    if (!selectedHotspotId) return null;
    return previewResolutionsByHotspot[selectedHotspotId] || null;
  }, [groupPreviewResolution, manualPreviewState, previewResolutionsByHotspot, selectedHotspotId]);

  const activePreviewValidation = useMemo(() => {
    return activePreviewResolution?.validation || null;
  }, [activePreviewResolution]);

  const normalizedDecision = useMemo(() => {
    return (activePreviewResolution as any)?.normalizedDecision
      || (activePreviewResolution as any)?.resolution?.normalizedDecision
      || (manualPreviewState as any)?.normalizedDecision
      || null;
  }, [activePreviewResolution, manualPreviewState]);

  const pendingPriorityReplacementHotspotId = useMemo(() => {
    const needsReplacementApproval = (resolution: any): boolean => {
      if (!resolution) return false;
      const removedTopPriorityCount = Array.isArray(resolution?.removedTopPriorityHotspots)
        ? resolution.removedTopPriorityHotspots.length
        : 0;
      return removedTopPriorityCount > 0;
    };

    const resolution = groupPreviewResolution || activePreviewResolution;
    if (!needsReplacementApproval(resolution)) return null;
    if (topPriorityReplacementApproved) return null;
    const fallbackHotspotId = selectedHotspotIds.length > 0
      ? selectedHotspotIds[selectedHotspotIds.length - 1]
      : null;
    return Number.isFinite(Number(fallbackHotspotId)) ? Number(fallbackHotspotId) : null;
  }, [activePreviewResolution, groupPreviewResolution, selectedHotspotIds, topPriorityReplacementApproved]);

  const pendingPriorityResolution = useMemo(() => {
    if (!pendingPriorityReplacementHotspotId) return null;
    return groupPreviewResolution || previewResolutionsByHotspot[pendingPriorityReplacementHotspotId] || null;
  }, [groupPreviewResolution, pendingPriorityReplacementHotspotId, previewResolutionsByHotspot]);

  // Scroll the confirm box into view when it appears
  useEffect(() => {
    if (pendingPriorityReplacementHotspotId && priorityConfirmRef.current) {
      priorityConfirmRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [pendingPriorityReplacementHotspotId]);

  const effectivePreviewTimeline = useMemo(() => {
    const enforceHotelOrderingSafety = (rows: any[]): any[] => {
      if (!Array.isArray(rows) || rows.length === 0) return rows;

      const isHotelLike = (row: any): boolean => {
        const type = String(row?.type || '').toLowerCase();
        const text = String(row?.text || row?.name || '').toLowerCase();
        return type === 'hotel' || Number(row?.item_type) === 6 || text.includes('check-in at hotel');
      };
      const isRouteContent = (row: any): boolean => {
        const type = String(row?.type || '').toLowerCase();
        return type === 'attraction' || type === 'travel' || Number(row?.item_type) === 3 || Number(row?.item_type) === 4;
      };

      const hotelIndex = rows.findIndex((row: any) => isHotelLike(row));
      if (hotelIndex < 0) return rows;

      const hasLaterRouteContent = rows.slice(hotelIndex + 1).some((row: any) => isRouteContent(row));
      if (!hasLaterRouteContent) return rows;

      const anyHavePreviewOrder = rows.some((row: any) => Number.isFinite(Number(row?.matrixPreviewOrder ?? row?.previewOrder)));
      if (!anyHavePreviewOrder) return rows;

      return [...rows].sort((a: any, b: any) => (
        Number(a?.matrixPreviewOrder ?? a?.previewOrder ?? 9999)
        - Number(b?.matrixPreviewOrder ?? b?.previewOrder ?? 9999)
      ));
    };

    const prunePrematureHotelTravelLegs = (rows: any[]): any[] => {
      if (!Array.isArray(rows) || rows.length === 0) return rows;

      const isTravel = (row: any): boolean => {
        const type = String(row?.type || '').toLowerCase();
        return type === 'travel' || Number(row?.item_type || 0) === 3 || Number(row?.item_type || 0) === 5;
      };
      const isAttraction = (row: any): boolean => {
        const type = String(row?.type || '').toLowerCase();
        return type === 'attraction' || Number(row?.item_type || 0) === 4;
      };
      const isHotelLike = (row: any): boolean => {
        const type = String(row?.type || '').toLowerCase();
        const text = String(row?.text || row?.name || '').toLowerCase();
        return type === 'hotel' || type === 'checkin' || Number(row?.item_type || 0) === 6 || text.includes('check-in at ');
      };
      const normalizeLabel = (value: any): string => String(value || '')
        .toLowerCase()
        .replace(/^travel\s+to\s+/i, '')
        .replace(/^check-?in\s+at\s+/i, '')
        .replace(/\s+/g, ' ')
        .trim();
      const parseStartMinutes = (value: any): number | null => {
        const raw = String(value || '').trim();
        if (!raw) return null;
        const startPart = raw.split('-')[0]?.trim() || raw;
        const match = startPart.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
        if (!match) return null;
        let h = Number(match[1]);
        const m = Number(match[2]);
        const ampm = String(match[3]).toUpperCase();
        if (ampm === 'AM' && h === 12) h = 0;
        if (ampm === 'PM' && h !== 12) h += 12;
        return (h * 60) + m;
      };
      const parseEndMinutes = (value: any): number | null => {
        const raw = String(value || '').trim();
        if (!raw || !raw.includes('-')) return null;
        const endPart = raw.split('-')[1]?.trim() || '';
        const match = endPart.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
        if (!match) return null;
        let h = Number(match[1]);
        const m = Number(match[2]);
        const ampm = String(match[3]).toUpperCase();
        if (ampm === 'AM' && h === 12) h = 0;
        if (ampm === 'PM' && h !== 12) h += 12;
        return (h * 60) + m;
      };

      const hotelIndex = rows.findIndex((row: any) => isHotelLike(row));
      if (hotelIndex <= 0) return rows;

      const hotelRow = rows[hotelIndex];
      const hotelNameFromCheckin = (() => {
        const text = String(hotelRow?.text || hotelRow?.name || '').trim();
        const match = text.match(/check-?in\s+at\s+(.+)/i);
        return String(match?.[1] || '').trim();
      })();
      const hotelLabel = normalizeLabel(hotelNameFromCheckin || hotelRow?.toName || hotelRow?.name || 'hotel');
      const hotelStart = parseStartMinutes(hotelRow?.timeRange);

      const lastAttractionBeforeHotel = (() => {
        for (let i = hotelIndex - 1; i >= 0; i -= 1) {
          if (isAttraction(rows[i])) return i;
        }
        return -1;
      })();

      const hotelTravelCandidates = rows
        .map((row: any, index: number) => ({ row, index }))
        .filter(({ row, index }) => {
          if (index >= hotelIndex || !isTravel(row)) return false;
          const target = normalizeLabel(row?.toName || row?.to || row?.text || row?.name);
          return target === hotelLabel;
        });

      if (hotelTravelCandidates.length <= 1) return rows;

      const keepIndex = (() => {
        const explicitMatrixHotelLeg = hotelTravelCandidates.find(({ row }) => (
          row?.isMatrixSplitTravel === true
          && String(row?.matrixTravelLeg || '').toUpperCase() === 'C_TO_B'
        ));
        if (explicitMatrixHotelLeg) {
          return explicitMatrixHotelLeg.index;
        }

        const valid = hotelTravelCandidates
          .map(({ row, index }) => {
            const endMin = parseEndMinutes(row?.timeRange);
            return { index, endMin };
          })
          .filter((entry) => hotelStart !== null && entry.endMin !== null && entry.endMin <= hotelStart);

        if (valid.length > 0) {
          return valid.sort((a, b) => Number(b.endMin || 0) - Number(a.endMin || 0))[0].index;
        }

        return hotelTravelCandidates[hotelTravelCandidates.length - 1].index;
      })();

      const dropSet = new Set<number>();
      for (const { index } of hotelTravelCandidates) {
        if (index !== keepIndex) dropSet.add(index);
        if (index < lastAttractionBeforeHotel && index !== keepIndex) dropSet.add(index);
      }

      const filteredRows = dropSet.size === 0
        ? rows
        : rows.filter((_: any, index: number) => !dropSet.has(index));

      // When we keep computed C->B leg, align hotel/check-in to the travel end in preview.
      const retainedTravel = filteredRows.find((row: any, index: number) => (
        isTravel(row)
        && normalizeLabel(row?.toName || row?.to || row?.text || row?.name) === hotelLabel
        && index < filteredRows.findIndex((candidate: any) => isHotelLike(candidate))
      ));
      const retainedRange = String(retainedTravel?.timeRange || '').trim();
      const retainedEndText = retainedRange.includes(' - ')
        ? String(retainedRange.split(' - ')[1] || '').trim()
        : '';

      if (!retainedEndText) return filteredRows;

      return filteredRows.map((row: any) => {
        if (!isHotelLike(row)) return row;
        return {
          ...row,
          timeRange: `${retainedEndText} - ${retainedEndText}`,
        };
      });
    };

    const applyBestSlotOrdering = (rows: any[]): any[] => {
      if (!Array.isArray(rows) || rows.length === 0 || !selectedHotspotId) return rows;

      // Backend-provided matrix split travel rows already represent the correct route shape.
      if (rows.some((row: any) => row?.isMatrixSplitTravel === true)) {
        return rows;
      }

      const fit = (activePreviewResolution as any)?.manualInsertionFit;
      const selectedIdNum = Number(selectedHotspotId);
      const fitBest = fit?.bestSlot || null;
      const fitChosen = fit?.chosenSlot || null;
      const chosenInvalid = Boolean(
        fitChosen
        && (Number(fitChosen?.fromHotspotId) === selectedIdNum || Number(fitChosen?.toHotspotId) === selectedIdNum),
      );
      const safeChosen = chosenInvalid ? null : fitChosen;
      const safeBest = (fitBest
        && Number(fitBest?.fromHotspotId) !== selectedIdNum
        && Number(fitBest?.toHotspotId) !== selectedIdNum)
        ? fitBest
        : null;

      const fromName = String(safeChosen?.fromName || safeBest?.fromName || '').trim();
      if (!fromName) return rows;

      const getSegHotspotId = (seg: any): number => Number(
        seg?.selectedHotspotId ??
        seg?.locationId ??
        seg?.hotspotId ??
        seg?.hotspot_ID ??
        seg?.hotspot_id ??
        0,
      );

      const selectedIdx = rows.findIndex((seg: any) => (
        String(seg?.type || '').toLowerCase() === 'attraction'
        && getSegHotspotId(seg) === selectedIdNum
      ));
      if (selectedIdx < 0) return rows;

      const fromIdx = rows.findIndex((seg: any) => (
        String(seg?.type || '').toLowerCase() === 'attraction'
        && String(seg?.text || '').trim() === fromName
      ));
      if (fromIdx < 0) return rows;

      const targetIdx = Math.min(fromIdx + 1, rows.length);
      if (targetIdx === selectedIdx || targetIdx === (selectedIdx + 1)) return rows;

      const reordered = [...rows];
      const [selectedSeg] = reordered.splice(selectedIdx, 1);
      const adjustedTargetIdx = selectedIdx < targetIdx ? targetIdx - 1 : targetIdx;
      reordered.splice(adjustedTargetIdx, 0, selectedSeg);
      return reordered;
    };

    const fit = (activePreviewResolution as any)?.manualInsertionFit
      || (groupPreviewResolution as any)?.manualInsertionFit
      || null;
    const resolvedLowPriorityPlan = fit?.lowPriorityRemovalPlanPreview?.resolved === true;
    const backendResolvedTimeline = Boolean(
      resolvedLowPriorityPlan
      || fit?.fullTimelineIsResolvedRemovalPlan === true
      || fit?.timelineSource === 'LOW_PRIORITY_REMOVAL_FINAL_TIMELINE',
    );
    const plannedRemovals: any[] = Array.isArray(fit?.lowPriorityRemovalPlanPreview?.plannedRemovals)
      ? fit.lowPriorityRemovalPlanPreview.plannedRemovals
      : [];

    const removePlannedRemovalRows = (rows: any[]): any[] => {
      const removedIds = new Set(
        plannedRemovals
          .map((row: any) => Number(row?.id || row?.hotspotId || row?.hotspot_ID || row?.locationId || 0))
          .filter((id: number) => Number.isFinite(id) && id > 0),
      );
      const removedNames = new Set(
        plannedRemovals
          .map((row: any) => String(row?.name || row?.hotspotName || '').trim().toLowerCase())
          .filter(Boolean),
      );

      return (rows || []).filter((row: any) => {
        const rowId = Number(row?.locationId || row?.hotspotId || row?.hotspot_ID || row?.hotspot_id || 0);
        const rowText = String(row?.text || row?.name || row?.to || row?.toName || '').trim().toLowerCase();

        if (rowId > 0 && removedIds.has(rowId)) return false;
        for (const removedName of removedNames) {
          if (removedName && rowText.includes(removedName)) return false;
        }
        return true;
      });
    };

    const sortByPreviewOrder = (rows: any[]): any[] => {
      if ((rows || []).some((row: any) => Number.isFinite(Number(row?.matrixPreviewOrder ?? row?.previewOrder)))) {
        return [...rows].sort((a: any, b: any) => (
          Number(a?.matrixPreviewOrder ?? a?.previewOrder ?? 9999)
          - Number(b?.matrixPreviewOrder ?? b?.previewOrder ?? 9999)
        ));
      }
      return rows;
    };

    if (backendResolvedTimeline && activePreviewTimeline.length > 0) {
      return prunePrematureHotelTravelLegs(
        enforceHotelOrderingSafety(
          sortByPreviewOrder(removePlannedRemovalRows(activePreviewTimeline)),
        ),
      );
    }

    if (activePreviewTimeline.length > 0) {
      const orderedTimeline = prunePrematureHotelTravelLegs(
        enforceHotelOrderingSafety(sortByPreviewOrder(activePreviewTimeline)),
      );
      const insertedIndex = orderedTimeline.findIndex((row: any) => Number(
        row?.selectedHotspotId
        ?? row?.locationId
        ?? row?.hotspotId
        ?? row?.hotspot_ID
        ?? row?.hotspot_id
        ?? 0,
      ) === Number(selectedHotspotId || 0));

      console.log('[ManualHotspotModal] rendering_order', orderedTimeline.map((row: any, index: number) => ({
        index,
        type: String(row?.type || '').toLowerCase(),
        text: String(row?.text || row?.name || ''),
        hotspotId: Number(row?.locationId || row?.hotspotId || row?.hotspot_ID || row?.hotspot_id || 0) || null,
        previewOrder: Number(row?.matrixPreviewOrder ?? row?.previewOrder ?? -1),
      })));
      console.log('[ManualHotspotModal] inserted_hotspot_position', {
        selectedHotspotId: Number(selectedHotspotId || 0),
        index: insertedIndex,
      });

      return orderedTimeline;
    }

    const activeAttractionCount = activePreviewTimeline.filter(
      (seg: any) => String(seg?.type || '').toLowerCase() === 'attraction',
    ).length;
    const selectedCount = selectedHotspotIds.length;
    const hasMatrixFit = Boolean(fit);
    const isMinimalPreview = activeAttractionCount <= Math.max(1, selectedCount + 1);
    const shouldMergeBaselineForMatrix = Boolean(
      hasMatrixFit
      && !backendResolvedTimeline
      && activePreviewTimeline.length > 0
      && isMinimalPreview,
    );

    // Some priority-confirmation previews return a minimal timeline (selected hotspot only).
    // In that case, show the default route timeline plus selected segments so users can review full context.
    const useMergedBaselineDuringPriorityConfirm = Boolean(
      pendingPriorityReplacementHotspotId
      && activePreviewTimeline.length > 0
      && activeAttractionCount <= Math.max(1, selectedCount + 1),
    );

    if (activePreviewTimeline.length > 0 && !useMergedBaselineDuringPriorityConfirm && !shouldMergeBaselineForMatrix) {
      return enforceHotelOrderingSafety(sortByPreviewOrder(activePreviewTimeline));
    }

    const merged = [...defaultPreviewTimeline, ...selectedPreviewSegments];

    const parseStartMinutes = (value: any): number => {
      const raw = String(value || '').trim();
      if (!raw || raw === '--') return Number.POSITIVE_INFINITY;

      const startPart = raw.split('-')[0]?.trim() || raw;
      const match = startPart.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
      if (!match) return Number.POSITIVE_INFINITY;

      let hour = Number(match[1]);
      const minute = Number(match[2]);
      const ampm = match[3].toUpperCase();

      if (ampm === 'AM' && hour === 12) hour = 0;
      if (ampm === 'PM' && hour !== 12) hour += 12;

      return hour * 60 + minute;
    };

    const sortedMerged = merged.sort((a: any, b: any) => parseStartMinutes(a?.timeRange) - parseStartMinutes(b?.timeRange));
    return enforceHotelOrderingSafety(applyBestSlotOrdering(sortedMerged));
  }, [
    activePreviewResolution,
    activePreviewTimeline,
    defaultPreviewTimeline,
    groupPreviewResolution,
    pendingPriorityReplacementHotspotId,
    selectedHotspotId,
    selectedHotspotIds.length,
    selectedPreviewSegments,
  ]);

  // ── Route-intelligence: manualInsertionFit from backend ─────────────────────
  const manualInsertionFit = useMemo(() => {
    return (activePreviewResolution as any)?.manualInsertionFit ?? null;
  }, [activePreviewResolution]);

  const matrixFit = useMemo(() => {
    return (activePreviewResolution as any)?.manualInsertionFit
      || (groupPreviewResolution as any)?.manualInsertionFit
      || null;
  }, [activePreviewResolution, groupPreviewResolution]);

  const destinationHotelDisplayName = useMemo(() => {
    const sanitize = (raw: unknown): string => {
      const value = String(raw || '').trim();
      if (!value) return '';
      const lower = value.toLowerCase();
      if (lower === 'hotel' || lower === 'no hotels available' || lower === 'hotel / route start') {
        return '';
      }
      return value;
    };

    const routeId = Number(addHotspotModal.routeId || 0);
    const routeDay = itinerary?.days?.find((day) => Number(day?.id) === routeId);
    const routeCheckin = Array.isArray(routeDay?.segments)
      ? [...routeDay!.segments].reverse().find((segment: any) => String(segment?.type || '').toLowerCase() === 'checkin')
      : null;
    const routeCheckinName = sanitize((routeCheckin as any)?.hotelName);
    if (routeCheckinName) return routeCheckinName;

    const selectedRouteHotelName = sanitize(
      (hotelDetails?.hotels || [])
        .filter((hotel: any) => Number(hotel?.itineraryRouteId) === routeId)
        .filter((hotel: any) => Number(hotel?.itineraryPlanHotelDetailsId || 0) > 0)
        .sort((a: any, b: any) => Number(b?.itineraryPlanHotelDetailsId || 0) - Number(a?.itineraryPlanHotelDetailsId || 0))
        .map((hotel: any) => hotel?.hotelName)
        .find((name: any) => sanitize(name).length > 0)
    );
    if (selectedRouteHotelName) return selectedRouteHotelName;

    const fitName = sanitize((matrixFit as any)?.destinationHotelName);
    if (fitName) return fitName;

    const hotelDetailsName = sanitize(
      hotelDetails?.hotels?.find((hotel: any) => Number(hotel?.itineraryRouteId) === routeId)?.hotelName
    );
    if (hotelDetailsName) return hotelDetailsName;

    const previewRows = Array.isArray(effectivePreviewTimeline)
      ? [...(effectivePreviewTimeline as any[])].reverse()
      : [];
    for (const row of previewRows) {
      const type = String(row?.type || '').toLowerCase();
      if (type !== 'hotel' && type !== 'checkin' && Number(row?.item_type) !== 6) {
        continue;
      }

      const rowName = sanitize(row?.hotelName || row?.toName || row?.to);
      if (rowName) return rowName;

      const rowText = String(row?.text || '').trim();
      const match = rowText.match(/check-?in\s+(?:to|at)\s+(.+)/i);
      const parsed = sanitize(match?.[1] || '');
      if (parsed) return parsed;
    }

    return '';
  }, [addHotspotModal.routeId, effectivePreviewTimeline, hotelDetails?.hotels, itinerary?.days, matrixFit]);

  const matrixRequiresBuild = useMemo(() => {
    if (!matrixFit) return false;
    if (matrixFit?.destinationInsertionMode === true) return false;
    return matrixFit?.requiresMatrixBuild === true || matrixFit?.routeFitAvailable === false;
  }, [matrixFit]);

  const matrixBuildSuggestion = useMemo(() => {
    return (activePreviewResolution as any)?.missingMatrixBuildSuggestion
      || (activePreviewResolution as any)?.resolution?.missingMatrixBuildSuggestion
      || (groupPreviewResolution as any)?.missingMatrixBuildSuggestion
      || (groupPreviewResolution as any)?.resolution?.missingMatrixBuildSuggestion
      || null;
  }, [activePreviewResolution, groupPreviewResolution]);

  const hasValidChosenMatrixSlot = useMemo(() => {
    const chosen = matrixFit?.chosenSlot;
    if (!chosen) return false;
    if (matrixFit?.destinationInsertionMode === true) {
      return (
        Number(chosen?.fromHotspotId || 0) > 0
        && ['DESTINATION_SIDE_INSERTION', 'MINOR_DETOUR'].includes(String(chosen?.routeFitType || '').toUpperCase())
      );
    }
    return (
      matrixFit?.routeFitAvailable !== false
      && ['ON_ROUTE', 'MINOR_DETOUR'].includes(String(chosen?.routeFitType || '').toUpperCase())
      && Number(chosen?.fromHotspotId || 0) > 0
      && Number(chosen?.toHotspotId || 0) > 0
    );
  }, [matrixFit]);

  const isMatrixMissingBlockedState = useMemo(() => {
    if (!matrixFit) return false;
    if (matrixFit?.destinationInsertionMode === true) return false;
    return (
      matrixFit?.requiresMatrixBuild === true
      || matrixFit?.code === 'MANUAL_HOTSPOT_MATRIX_DATA_MISSING'
      || (activePreviewResolution as any)?.code === 'MANUAL_HOTSPOT_MATRIX_DATA_MISSING'
      || (activePreviewResolution as any)?.previewBlockReason === 'MATRIX_MISSING'
      || (groupPreviewResolution as any)?.code === 'MANUAL_HOTSPOT_MATRIX_DATA_MISSING'
      || (groupPreviewResolution as any)?.previewBlockReason === 'MATRIX_MISSING'
    );
  }, [activePreviewResolution, groupPreviewResolution, matrixFit]);

  const isMatrixBuiltButNoFeasibleSlot = useMemo(() => {
    return (
      matrixFit?.code === 'MANUAL_HOTSPOT_NO_FEASIBLE_ROUTE_SLOT'
      || (activePreviewResolution as any)?.code === 'MANUAL_HOTSPOT_NO_FEASIBLE_ROUTE_SLOT'
      || (activePreviewResolution as any)?.previewBlockReason === 'NO_FEASIBLE_ROUTE_SLOT'
      || (groupPreviewResolution as any)?.code === 'MANUAL_HOTSPOT_NO_FEASIBLE_ROUTE_SLOT'
      || (groupPreviewResolution as any)?.previewBlockReason === 'NO_FEASIBLE_ROUTE_SLOT'
      || (
        matrixFit?.requiresMatrixBuild !== true
        && matrixFit?.hasAnyMatrixData === true
        && matrixFit?.hasFeasibleMatrixSlot === false
      )
    );
  }, [activePreviewResolution, groupPreviewResolution, matrixFit]);

  const previewValidationReasonText = useMemo(() => {
    if (normalizedDecision?.primaryMessage) {
      return String(normalizedDecision.primaryMessage);
    }
    const reason = String(activePreviewValidation?.reason || '').toUpperCase();
    if (reason === 'NO_FEASIBLE_ROUTE_SLOT') {
      return 'Matrix data exists, but this hotspot is off-route or backtracking for all current route segments.';
    }
    if (reason === 'MATRIX_DATA_MISSING') {
      return 'Route-fit matrix data is missing for the selected hotspot and current route.';
    }
    if (reason === 'OSRM_ROUTE_CHECK_FAILED') {
      return 'OSRM route validation failed while checking the source-city route anchor.';
    }
    const baseReason = activePreviewValidation?.reason || 'The rebuilt timeline still has timing, distance, or operating-window conflicts for this manual hotspot.';
    const matrixDestinationName = String((matrixFit as any)?.destinationHotelName || '').trim();
    if (!destinationHotelDisplayName || !matrixDestinationName) {
      return baseReason;
    }
    const escapedDestinationName = matrixDestinationName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return String(baseReason).replace(new RegExp(escapedDestinationName, 'gi'), destinationHotelDisplayName);
  }, [activePreviewValidation, destinationHotelDisplayName, matrixFit, normalizedDecision]);

  const matrixApplyBlocked = useMemo(() => {
    const decisionStatus = String(normalizedDecision?.decisionStatus || '').toUpperCase();
    if (decisionStatus === 'UNSCHEDULABLE_FOR_DAY' || decisionStatus === 'MATRIX_UNAVAILABLE') {
      return true;
    }
    if (!matrixFit) return false;
    if (matrixFit?.destinationInsertionMode === true) {
      return matrixFit?.canApply === false;
    }
    return (
      isMatrixMissingBlockedState
      || isMatrixBuiltButNoFeasibleSlot
      || matrixFit?.canApply === false
    );
  }, [isMatrixBuiltButNoFeasibleSlot, isMatrixMissingBlockedState, matrixFit, normalizedDecision]);

  const decisionStatus = useMemo(() => {
    return String(normalizedDecision?.decisionStatus || '').toUpperCase();
  }, [normalizedDecision]);

  const confirmActionConfig = useMemo(() => {
    if (decisionStatus === 'MATRIX_UNAVAILABLE') {
      return { label: 'Build Matrix First', disabled: true };
    }
    if (decisionStatus === 'UNSCHEDULABLE_FOR_DAY') {
      return { label: 'Cannot Add', disabled: true };
    }
    if (decisionStatus === 'OFF_ROUTE' || decisionStatus === 'BACKTRACK') {
      return { label: 'Cannot Add - Off Route', disabled: true };
    }
    if (decisionStatus === 'NEEDS_RESCHEDULE') {
      return { label: 'Add with Reschedule', disabled: false };
    }
    return { label: 'Confirm Add Hotspot', disabled: false };
  }, [decisionStatus]);

  const insertionDecisionSummary = useMemo(() => {
    if (!activePreviewHotspotId || !matrixFit) return null;
    const canProceedWithReschedule = (
      activePreviewValidation?.readyToApply === false
      && activePreviewValidation?.requiresPriorityConfirmation !== true
      && !matrixApplyBlocked
    );
    if (matrixRequiresBuild || isMatrixMissingBlockedState) {
      return {
        willInsert: false,
        text: 'Will not be inserted: route-fit matrix is missing.',
      };
    }
    if (isMatrixBuiltButNoFeasibleSlot) {
      return {
        willInsert: false,
        text: 'Will not be inserted: hotspot is off-route/backtracking for current route.',
      };
    }
    if (canProceedWithReschedule) {
      return {
        willInsert: true,
        text: 'Can be inserted with reschedule. Timeline will be recalculated.',
      };
    }
    if (matrixApplyBlocked || activePreviewValidation?.readyToApply === false) {
      return {
        willInsert: false,
        text: 'Will not be inserted: current preview is not ready to apply.',
      };
    }
    return {
      willInsert: true,
      text: 'Will be inserted when you click Add hotspot.',
    };
  }, [
    activePreviewHotspotId,
    activePreviewValidation?.readyToApply,
    activePreviewValidation?.requiresPriorityConfirmation,
    isMatrixBuiltButNoFeasibleSlot,
    isMatrixMissingBlockedState,
    matrixApplyBlocked,
    matrixFit,
    matrixRequiresBuild,
  ]);

  const resolvedRemovalTimelineLeak = useMemo(() => {
    const resolved = (matrixFit as any)?.lowPriorityRemovalPlanPreview?.resolved === true;
    if (!resolved || !Array.isArray(effectivePreviewTimeline) || effectivePreviewTimeline.length === 0) return false;

    const plannedRemovals: any[] = Array.isArray((matrixFit as any)?.lowPriorityRemovalPlanPreview?.plannedRemovals)
      ? (matrixFit as any).lowPriorityRemovalPlanPreview.plannedRemovals
      : [];
    if (plannedRemovals.length === 0) return false;

    const removedIds = new Set(
      plannedRemovals
        .map((row: any) => Number(row?.id || row?.hotspotId || row?.hotspot_ID || row?.locationId || 0))
        .filter((id: number) => Number.isFinite(id) && id > 0),
    );
    const removedNames = new Set(
      plannedRemovals
        .map((row: any) => String(row?.name || row?.hotspotName || '').trim().toLowerCase())
        .filter(Boolean),
    );

    return effectivePreviewTimeline.some((row: any) => {
      const rowId = Number(row?.locationId || row?.hotspotId || row?.hotspot_ID || row?.hotspot_id || 0);
      const rowText = String(row?.text || row?.name || row?.to || row?.toName || '').trim().toLowerCase();
      if (rowId > 0 && removedIds.has(rowId)) return true;
      for (const removedName of removedNames) {
        if (removedName && rowText.includes(removedName)) return true;
      }
      return false;
    });
  }, [effectivePreviewTimeline, matrixFit]);

  const safeMatrixSlots = useMemo(() => {
    const selectedIdNum = Number(selectedHotspotId || 0);
    const allSlots: any[] = Array.isArray(matrixFit?.allSlotResults)
      ? matrixFit.allSlotResults
      : [];
    return allSlots.filter((slot: any) => (
      Number(slot?.fromHotspotId) !== selectedIdNum
      && Number(slot?.toHotspotId) !== selectedIdNum
    ));
  }, [matrixFit, selectedHotspotId]);

  const effectiveFitSlot = useMemo(() => {
    if (matrixRequiresBuild) return null;
    if (!matrixFit) return null;
    const selectedIdNum = Number(selectedHotspotId || 0);
    const chosen = (matrixFit as any)?.chosenSlot ?? null;
    const best = (matrixFit as any)?.bestSlot ?? null;

    const isInvalid = (slot: any): boolean => {
      if (!slot) return true;
      return Number(slot?.fromHotspotId) === selectedIdNum || Number(slot?.toHotspotId) === selectedIdNum;
    };

    if (!isInvalid(chosen)) return chosen;
    if (!isInvalid(best)) return best;

    return safeMatrixSlots.find((slot: any) => !isInvalid(slot)) || null;
  }, [matrixFit, matrixRequiresBuild, safeMatrixSlots, selectedHotspotId]);

  /** Helper: map route_fit_type to Tailwind badge classes */
  const routeFitBadgeClass = (routeFitType: string | undefined): string => {
    switch (routeFitType) {
      case 'ON_ROUTE':    return 'bg-green-100 text-green-800';
      case 'MINOR_DETOUR': return 'bg-amber-100 text-amber-700';
      case 'BACKTRACK':   return 'bg-orange-100 text-orange-700';
      case 'OFF_ROUTE':   return 'bg-red-100 text-red-700';
      case 'DESTINATION_SIDE_INSERTION': return 'bg-blue-100 text-blue-700';
      case 'MATRIX_UNAVAILABLE': return 'bg-gray-100 text-gray-600';
      default:            return 'bg-gray-100 text-gray-500';
    }
  };

  const normalizedInsertionSlots = useMemo(() => {
    const isDestinationSidePreview =
      (matrixFit as any)?.destinationInsertionMode === true
      || String(manualPreviewState?.manualInsertionFit?.hotspotCityContext || '').trim().toUpperCase() === 'DESTINATION_CITY';

    const rawSlots = Array.isArray(matrixFit?.allSlotResults) && matrixFit.allSlotResults.length > 0
      ? matrixFit.allSlotResults
      : (Array.isArray(activePreviewResolution?.slotInsights)
        ? activePreviewResolution.slotInsights
        : (Array.isArray(activePreviewResolution?.allInsertionSlots)
          ? activePreviewResolution.allInsertionSlots
          : []));

    if (rawSlots.length === 0) return [];

    const stopNames: string[] = [];

    const requestedFrom = String(selectedHotspotAnchor?.anchorFrom || '').trim();
    if (requestedFrom) {
      stopNames.push(requestedFrom);
    }

    for (const seg of effectivePreviewTimeline as any[]) {
      const type = String(seg?.type || '').toLowerCase();
      const hotspotId = Number(seg?.hotspotId ?? seg?.locationId ?? seg?.hotspot_ID ?? 0);

      if (type === 'attraction' && hotspotId === Number(selectedHotspotId || 0)) {
        continue;
      }

      let label = '';
      if (type === 'attraction') {
        label = String(seg?.text || seg?.name || '').trim();
      } else if (type === 'hotel' || type === 'checkin') {
        label = String(seg?.hotelName || seg?.toName || '').trim() || destinationHotelDisplayName || 'Hotel';
      }

      if (!label) continue;
      if (stopNames[stopNames.length - 1] === label) continue;
      stopNames.push(label);
    }

    // Determine which slotIndex is best from matrix-fit payload
    const bestSlotIndex: number | null = matrixFit?.bestSlot?.slotIndex ?? null;

    return rawSlots.map((slot: any, index: number) => {
      const fromName = slot?.fromName || stopNames[index] || `Stop ${index + 1}`;
      const rawToName = String(slot?.toName || stopNames[index + 1] || 'Destination').trim();
      const matrixDestinationName = String((matrixFit as any)?.destinationHotelName || '').trim().toLowerCase();
      const toName = (
        isDestinationSidePreview
        && destinationHotelDisplayName
        && (
          /^hotel$/i.test(rawToName)
          || (matrixDestinationName.length > 0 && rawToName.toLowerCase() === matrixDestinationName)
          || Number(slot?.destinationHotelId || 0) > 0
        )
      )
        ? destinationHotelDisplayName
        : rawToName;

      // ── From manualInsertionFit.allSlotResults ──
      const routeFitType: string = slot?.routeFitType || '';
      const routeFitStatus: string = String(slot?.routeFitStatus || routeFitType || '').toUpperCase();
      const routeFitLabel: string = slot?.label || '';
      const routeFitDisplayLabel: string = slot?.displayLabel || routeFitLabel;
      const routeFitShortLabel: string = slot?.shortLabel || routeFitDisplayLabel || routeFitLabel;
      const roadDetourKm: number | null = slot?.roadDetourKm != null ? Number(slot.roadDetourKm) : null;
      const isZeroExtraDetour: boolean = slot?.isZeroExtraDetour === true || (roadDetourKm != null && roadDetourKm <= 0.5);
      const distanceComparisonNote: string | null = slot?.distanceComparisonNote ?? null;
      const routeDecisionReason: string | null = slot?.routeDecisionReason ?? null;
      const timingDecisionReason: string | null = slot?.timingDecisionReason ?? null;
      const priorityDecisionReason: string | null = slot?.priorityDecisionReason ?? null;
      const finalDecisionReason: string | null = slot?.finalDecisionReason ?? null;
      const routePossible: boolean = slot?.routePossible !== false;
      const timingPossible: boolean = slot?.timingPossible === true;
      const prioritySafe: boolean = slot?.prioritySafe !== false;

      // Legacy fallback fields
      const metricsSource = String(slot?.routeMetrics?.source || 'NONE').toUpperCase();
      const hasTrustedMetrics = metricsSource === 'MATRIX_CACHE';
      const directKmRaw = hasTrustedMetrics ? slot?.routeMetrics?.directKm : null;
      const viaKmRaw = hasTrustedMetrics ? slot?.routeMetrics?.viaKm : null;
      const extraKmRaw = hasTrustedMetrics ? slot?.routeMetrics?.extraKm : null;
      const directKm: number = Number(directKmRaw ?? slot?.directKm ?? slot?.abOsrmDistanceKm ?? 0);
      const distanceDeltaRaw: number = roadDetourKm != null ? roadDetourKm : Number(slot?.distanceDelta || 0);
      const distanceDelta: number = Math.max(0, Number.isFinite(distanceDeltaRaw) ? distanceDeltaRaw : 0);
      const viaKm: number = Number(viaKmRaw ?? slot?.insertedRouteDistanceKm ?? slot?.viaKm ?? (directKm + distanceDelta));
      const normalizedDisplayLabel = (routeFitStatus === 'MATRIX_UNAVAILABLE' || routeFitStatus === 'NO_ROUTE_DATA')
        ? 'Route data unavailable for this slot'
        : routeFitDisplayLabel;

      const isFeasibleType = routeFitType === 'ON_ROUTE' || routeFitType === 'MINOR_DETOUR';
      const fitsOverall: boolean = routeFitType
        ? isFeasibleType
        : slot?.fitsOverall !== false;
      const isBest = !matrixRequiresBuild && (bestSlotIndex != null
        ? (slot?.slotIndex === bestSlotIndex || index === bestSlotIndex)
        : slot?.isBest === true);

      return {
        ...slot,
        slot: `${fromName} → ${toName}`,
        fromName,
        toName,
        directKm,
        viaKm,
        distanceDelta,
        routeFitType,
        routeFitStatus,
        routeFitLabel,
        displayLabel: normalizedDisplayLabel,
        shortLabel: routeFitShortLabel,
        roadDetourKm,
        isZeroExtraDetour,
        distanceComparisonNote,
        routeDecisionReason,
        timingDecisionReason,
        priorityDecisionReason,
        finalDecisionReason,
        proposedTimeRange: slot?.proposedTimeRange || null,
        operatingHours: slot?.operatingHours || null,
        fitsTiming: timingPossible,
        fitsOverall,
        isBest: matrixRequiresBuild ? false : (slot?.selectedAsBest === true || isBest),
        routePossible,
        timingPossible,
        prioritySafe,
        selectedAsBest: matrixRequiresBuild ? false : (slot?.selectedAsBest === true || isBest),
        attempted: slot?.attempted === true || true,
        timingReason: timingDecisionReason || slot?.timingReason || slot?.reason || routeDecisionReason || null,
        routeMetrics: {
          directKm: hasTrustedMetrics ? Number(directKmRaw ?? directKm) : null,
          viaKm: hasTrustedMetrics ? Number(viaKmRaw ?? viaKm) : null,
          extraKm: hasTrustedMetrics ? Number(extraKmRaw ?? distanceDelta) : null,
          source: metricsSource,
        },
      };
    });
  }, [
    activePreviewResolution,
    effectivePreviewTimeline,
    selectedHotspotAnchor,
    selectedHotspotId,
    matrixFit,
    matrixRequiresBuild,
    safeMatrixSlots,
    destinationHotelDisplayName,
    manualPreviewState?.manualInsertionFit?.hotspotCityContext,
  ]);
  // ─────────────────────────────────────────────────────────────────────────────

  const activeAnchorFitInsight = useMemo(() => {
    if (matrixRequiresBuild) return null;
    const bestSlot = normalizedInsertionSlots.find((slot: any) => slot?.isBest)
      || normalizedInsertionSlots[0]
      || null;
    const routeId = Number(addHotspotModal.routeId || 0);
    if (!routeId || !selectedHotspotId) return null;

    // Prefer matrix-fit chosen/best slot for inserted-hotspot labels.
    const fitBest = (matrixFit as any)?.bestSlot ?? null;
    const fitChosen = (matrixFit as any)?.chosenSlot ?? null;
    const selectedIdNum = Number(selectedHotspotId || 0);
    const chosenInvalid = Boolean(
      fitChosen
      && (Number(fitChosen?.fromHotspotId) === selectedIdNum || Number(fitChosen?.toHotspotId) === selectedIdNum),
    );
    const safeChosen = chosenInvalid ? null : fitChosen;
    const sourceSlot = safeChosen || fitBest;

    if (sourceSlot) {
      const fitType: string = sourceSlot.routeFitType || '';
      const fitTypeUpper = String(fitType || '').toUpperCase();
      const sourceLabelText = String(sourceSlot.displayLabel || sourceSlot.label || '').toLowerCase();
      const sourceFinalReasonText = String(sourceSlot.finalDecisionReason || '').toLowerCase();
      const sourceNoRouteTagged = sourceLabelText.includes('no route data')
        || sourceFinalReasonText.includes('no route data');
      const hasRouteDataForSlot = (
        sourceSlot?.routePossible !== false
        && fitTypeUpper !== 'UNKNOWN'
        && fitTypeUpper !== 'MATRIX_UNAVAILABLE'
        && !sourceNoRouteTagged
      );
      const label: string = sourceSlot.displayLabel || sourceSlot.label || fitType;
      const detour: number | null = sourceSlot.roadDetourKm != null ? Number(sourceSlot.roadDetourKm) : null;
      const isDestinationSidePreview = String((manualPreviewState as any)?.manualInsertionFit?.hotspotCityContext || '').trim().toUpperCase() === 'DESTINATION_CITY';
      const rawToName = String(sourceSlot?.toName || '').trim();
      const matrixDestinationName = String((matrixFit as any)?.destinationHotelName || '').trim().toLowerCase();
      const resolvedToName = (
        isDestinationSidePreview
        && destinationHotelDisplayName
        && (
          /^hotel$/i.test(rawToName)
          || (matrixDestinationName.length > 0 && rawToName.toLowerCase() === matrixDestinationName)
          || Number(sourceSlot?.destinationHotelId || 0) > 0
        )
      ) ? destinationHotelDisplayName : rawToName;
      const tone = fitType === 'ON_ROUTE' || fitType === 'MINOR_DETOUR'
        ? 'green' as const
        : fitType === 'BACKTRACK'
          ? 'amber' as const
          : 'red' as const;
      const hasNamedAnchors = String(sourceSlot?.fromName || '').trim().length > 0
        && String(resolvedToName || '').trim().length > 0;
      const between = hasNamedAnchors ? `${sourceSlot.fromName} → ${resolvedToName}` : null;
      const extraLabel = hasRouteDataForSlot && detour != null ? `+${detour.toFixed(1)} km` : null;
      return {
        label,
        tone: hasRouteDataForSlot ? tone : ('red' as const),
        extraDistanceLabel: extraLabel,
        anchorLegLabel: between,
        insertedLabel: hasRouteDataForSlot ? label : 'No route data',
        reason: sourceSlot.decisionReason || null,
        source: (matrixFit as any)?.chosenSlotSource || null,
        warning: (matrixFit as any)?.warning || null,
        requestedSlot: (matrixFit as any)?.requestedSlot || null,
        chosenSlot: safeChosen,
      };
    }

    const distanceDelta = bestSlot?.distanceDelta ?? activePreviewResolution?.newHotspot?.distanceDelta;
    const bestFits = bestSlot ? (bestSlot?.fitsOverall !== false) : true;
    const bestReason = bestSlot?.timingReason || null;

    if (!bestFits) {
      return {
        label: 'Not on the way',
        tone: 'red' as const,
        extraDistanceLabel: null,
        anchorLegLabel: null,
        insertedLabel: 'Selected slot is not feasible',
        reason: bestReason,
      };
    }

    // If backend provided distanceDelta, use it directly
    if (Number.isFinite(distanceDelta) && distanceDelta !== null) {
      const delta = Number(distanceDelta);
      const isNeutral = Math.abs(delta) <= 0.5; // Within tolerance

      if (isNeutral || delta <= 0) {
        return {
          label: 'Fits on the way',
          tone: 'green' as const,
          extraDistanceLabel: delta < -0.5 ? `~${Math.abs(delta).toFixed(1)} km shorter` : 'No extra backtrack',
          anchorLegLabel: null,
          insertedLabel: 'Inserted correctly between spots',
        };
      }

      return {
        label: 'Distance increased',
        tone: 'red' as const,
        extraDistanceLabel: `+${delta.toFixed(1)} km extra travel`,
        anchorLegLabel: null,
        insertedLabel: `Inserted with detour (+${delta.toFixed(1)} km)`,
        reason: null,
      };
    }

    // Fallback: no distance delta available from backend
    return {
      label: 'Inserted',
      tone: 'amber' as const,
      extraDistanceLabel: null,
      anchorLegLabel: null,
      insertedLabel: 'Inserted (distance unavailable)',
      reason: null,
    };
  }, [
    addHotspotModal.routeId,
    activePreviewResolution,
    matrixRequiresBuild,
    normalizedInsertionSlots,
    selectedHotspotId,
    matrixFit,
    destinationHotelDisplayName,
    manualPreviewState?.manualInsertionFit?.hotspotCityContext,
  ]);


  const bestInsertionSlot = useMemo(() => {
    if (matrixRequiresBuild) return null;
    const slots = normalizedInsertionSlots;

    if (slots.length === 0) return null;

    return slots.find((slot: any) => slot?.isBest)
      || [...slots].sort(
        (a: any, b: any) => Number(a?.distanceDelta || 0) - Number(b?.distanceDelta || 0),
      )[0]
      || null;
  }, [matrixRequiresBuild, normalizedInsertionSlots]);

  const previewHotspotMetaById = useMemo(() => {
    const routeId = Number(addHotspotModal.routeId || 0);
    const day = itinerary?.days?.find((d) => Number(d.id) === routeId);
    const map = new Map<number, { visitTime?: string | null; duration?: string | null; timings?: string | null; priority?: number | null }>();

    const daySegments = Array.isArray(day?.segments) ? day!.segments : [];
    for (const seg of daySegments as any[]) {
      if (String(seg?.type || '').toLowerCase() !== 'attraction') continue;
      const hotspotId = Number(seg?.hotspotId ?? seg?.locationId ?? 0);
      if (!Number.isFinite(hotspotId) || hotspotId <= 0) continue;

      map.set(hotspotId, {
        visitTime: seg?.visitTime || null,
        duration: seg?.duration || null,
        timings: seg?.timings || null,
        priority: Number.isFinite(Number(seg?.priority)) ? Number(seg.priority) : null,
      });
    }

    for (const hotspot of availableHotspots) {
      const hotspotId = Number(hotspot?.id || 0);
      if (!Number.isFinite(hotspotId) || hotspotId <= 0) continue;

      const existing = map.get(hotspotId) || {};
      const durationFromHours = Number(hotspot?.timeSpend || 0) > 0
        ? formatMinutesDuration(Math.round(Number(hotspot.timeSpend) * 60))
        : null;

      map.set(hotspotId, {
        visitTime: existing.visitTime || null,
        duration: existing.duration || durationFromHours,
        timings: existing.timings || hotspot?.timings || null,
        priority:
          existing.priority ??
          (Number.isFinite(Number((hotspot as any)?.priority)) ? Number((hotspot as any).priority) : null) ??
          (Number.isFinite(Number((hotspot as any)?.hotspotPriority)) ? Number((hotspot as any).hotspotPriority) : null) ??
          (Number.isFinite(Number((hotspot as any)?.hotspot_priority)) ? Number((hotspot as any).hotspot_priority) : null),
      });
    }

    return map;
  }, [addHotspotModal.routeId, availableHotspots, itinerary?.days]);

  const currentRouteAttractionHotspotIds = useMemo(() => {
    const routeId = Number(addHotspotModal.routeId || 0);
    if (!routeId || !Array.isArray(itinerary?.days)) return new Set<number>();
    const day = itinerary.days.find((d) => Number(d?.id) === routeId);
    const ids = new Set<number>();
    const excludedSet = new Set(excludedHotspotIds.map(Number));
    for (const seg of Array.isArray(day?.segments) ? day!.segments : []) {
      const routeSeg = seg as any;
      if (String(routeSeg?.type || '').toLowerCase() !== 'attraction') continue;
      // Skip deleted/excluded rows
      if (
        routeSeg?.isDeleted === true ||
        routeSeg?.deleted === true ||
        routeSeg?.isExcluded === true ||
        routeSeg?.excluded === true ||
        routeSeg?.removed === true ||
        routeSeg?.deletedAt != null ||
        routeSeg?.deleted_at != null ||
        String(routeSeg?.status || '').toLowerCase() === 'deleted' ||
        String(routeSeg?.status || '').toLowerCase() === 'excluded'
      ) {
        continue;
      }
      const id = Number(routeSeg?.hotspotId ?? routeSeg?.locationId ?? 0);
      if (Number.isFinite(id) && id > 0 && !excludedSet.has(id)) ids.add(id);
    }
    return ids;
  }, [addHotspotModal.routeId, itinerary?.days, excludedHotspotIds]);

  const currentRouteManualHotspotIds = useMemo(() => {
    const routeId = Number(addHotspotModal.routeId || 0);
    if (!routeId || !Array.isArray(itinerary?.days)) return new Set<number>();
    const day = itinerary.days.find((d) => Number(d?.id) === routeId);
    const ids = new Set<number>();
    const excludedSet = new Set(excludedHotspotIds.map(Number));
    for (const seg of Array.isArray(day?.segments) ? day!.segments : []) {
      const routeSeg = seg as any;
      if (String(routeSeg?.type || '').toLowerCase() !== 'attraction') continue;
      // Skip deleted/excluded rows
      if (
        routeSeg?.isDeleted === true ||
        routeSeg?.deleted === true ||
        routeSeg?.isExcluded === true ||
        routeSeg?.excluded === true ||
        routeSeg?.removed === true ||
        routeSeg?.deletedAt != null ||
        routeSeg?.deleted_at != null ||
        String(routeSeg?.status || '').toLowerCase() === 'deleted' ||
        String(routeSeg?.status || '').toLowerCase() === 'excluded'
      ) {
        continue;
      }
      const isManual = routeSeg?.planOwnWay === true || routeSeg?.isManual === true;
      const id = Number(routeSeg?.hotspotId ?? routeSeg?.locationId ?? 0);
      if (Number.isFinite(id) && id > 0 && isManual && !excludedSet.has(id)) {
        ids.add(id);
      }
    }
    for (const id of addedInModalHotspotIds) {
      ids.add(Number(id));
    }
    return ids;
  }, [addHotspotModal.routeId, itinerary?.days, excludedHotspotIds, addedInModalHotspotIds]);

  const isCurrentPreviewAlreadyAdded = useMemo(() => {
    const id = Number(activePreviewHotspotId || 0);
    if (!id) return false;
    return currentRouteAttractionHotspotIds.has(id) || addedInModalHotspotIds.has(id);
  }, [activePreviewHotspotId, addedInModalHotspotIds, currentRouteAttractionHotspotIds]);

  // Helper to normalize available hotspots after fetching
  // Accepts explicit context options to avoid stale async state issues
  const normalizeAvailableHotspots = useCallback((
    hotspots: AvailableHotspot[],
    options?: {
      routeId?: number | null;
      excludedIds?: number[];
      activeIds?: Set<number>;
    }
  ): AvailableHotspot[] => {
    const excludedSet = new Set((options?.excludedIds || excludedHotspotIds).map(Number));
    const activeSet = options?.activeIds || currentRouteAttractionHotspotIds;

    return hotspots.map((hotspot) => {
      const hotspotId = Number(hotspot.id);
      const backendStatus = String(hotspot.availabilityStatus || '').trim().toUpperCase();
      const reason = String(hotspot.availabilityReason || '').trim().toLowerCase();

      const isExcludedByBackend =
        backendStatus === 'EXCLUDED_BY_ROUTE' ||
        reason.includes('excluded for this route') ||
        reason.includes('currently excluded');

      const isDeletedOrExcluded =
        excludedSet.has(hotspotId) || isExcludedByBackend;

      const isActuallyActive =
        activeSet.has(hotspotId);

      if (isDeletedOrExcluded && !isActuallyActive) {
        return {
          ...hotspot,
          alreadyAdded: false,
          availabilityStatus: 'EXCLUDED_BY_ROUTE',
          actionDisabled: false,
          buttonLabel: 'Preview',
        };
      }

      return hotspot;
    });
  }, [excludedHotspotIds, currentRouteAttractionHotspotIds]);

  // Keep left list focused near latest selected card.
  useEffect(() => {
    if (!addHotspotModal.open) return;
    if (!selectedHotspotId) return;

    const raf = requestAnimationFrame(() => {
      if (!hotspotListRef.current) return;
      const card = hotspotListRef.current.querySelector(
        `[data-hotspot-id="${selectedHotspotId}"]`
      ) as HTMLElement | null;
      if (!card) return;

      const targetScrollTop = Math.max(0, card.offsetTop - 150);
      hotspotListRef.current.scrollTo({ top: targetScrollTop, behavior: "auto" });
    });

    return () => cancelAnimationFrame(raf);
  }, [addHotspotModal.open, selectedHotspotId]);

  // Scroll list to top when search query changes
  useEffect(() => {
    if (hotspotListRef.current && addHotspotModal.open) {
      hotspotListRef.current.scrollTop = 0;
    }
  }, [hotspotSearchQuery, addHotspotModal.open]);

  // Filter hotspots based on search query, keep no-timing hotspots visible,
  // then sort: non-closed first, visitAgain at bottom, closed/no-timing last.
  const filteredHotspots = availableHotspots
    .filter(
      (h) => {
        const query = hotspotSearchQuery.toLowerCase();
        const matchesQuery =
          h.name.toLowerCase().includes(query) ||
          h.description.toLowerCase().includes(query);
        return matchesQuery;
      }
    )
    .sort((a, b) => {
      const aTimingText = String(a.timings || '').trim().toLowerCase();
      const bTimingText = String(b.timings || '').trim().toLowerCase();
      const aClosed = aTimingText.length === 0 || aTimingText === 'no timings available';
      const bClosed = bTimingText.length === 0 || bTimingText === 'no timings available';

      const isDeletedFromTimeline = (h: AvailableHotspot): boolean => {
        const backendStatus = String(h.availabilityStatus || '').trim().toUpperCase();
        const availabilityReason = String(h.availabilityReason || '').trim().toLowerCase();
        return (
          backendStatus === 'EXCLUDED_BY_ROUTE'
          || availabilityReason.includes('excluded for this route')
          || availabilityReason.includes('currently excluded')
        );
      };

      const isAddedInCurrentRoute = (h: AvailableHotspot): boolean => {
        const deletedFromTimeline = isDeletedFromTimeline(h);
        const backendStatus = String(h.availabilityStatus || '').trim().toUpperCase();
        return (
          !deletedFromTimeline
          && (h.alreadyAdded === true || backendStatus === 'ACTIVE_THIS_ROUTE')
        );
      };

      const canPreview = (h: AvailableHotspot): boolean => {
        const deletedFromTimeline = isDeletedFromTimeline(h);
        const added = isAddedInCurrentRoute(h);
        const disabled = added || (h.actionDisabled === true && !deletedFromTimeline);
        const timingText = String(h.timings || '').trim().toLowerCase();
        const closed = timingText.length === 0 || timingText === 'no timings available';
        return !disabled && !closed;
      };

      const getSortRank = (h: AvailableHotspot): number => {
        if (canPreview(h)) return 1; // Group 1: Previewable (available to add)
        const added = isAddedInCurrentRoute(h);
        if (added && currentRouteManualHotspotIds.has(h.id)) return 2; // Group 2: Manually added on this route
        return 3; // Group 3: Closed or Auto-added / Prebuilt
      };

      const rankA = getSortRank(a);
      const rankB = getSortRank(b);

      if (rankA !== rankB) return rankA - rankB;

      if (aClosed !== bClosed) return aClosed ? 1 : -1;
      // visitAgain (already visited) goes to the bottom
      if (a.visitAgain !== b.visitAgain) return a.visitAgain ? 1 : -1;
      // Within same group: lower priority number = more important = shown first
      // Treat 0 as unset (worst) so it never floats above real P1-P18
      const normP = (p: any) => { const n = Number(p ?? 0); return n > 0 ? n : 9999; };
      const pa = normP((a as any).priority);
      const pb = normP((b as any).priority);
      if (pa !== pb) return pa - pb;
      return 0;
    });

  const destinationCityLabel = useMemo(() => {
    const raw = String(hotspotFilterMeta?.destinationCityKey || selectedHotspotAnchor?.anchorTo || '').trim();
    if (!raw) return 'destination city';
    return raw.charAt(0).toUpperCase() + raw.slice(1);
  }, [hotspotFilterMeta?.destinationCityKey, selectedHotspotAnchor?.anchorTo]);

  const routeIsDifferentCity = useMemo(() => {
    const source = String(hotspotFilterMeta?.sourceCityKey || '').trim().toLowerCase();
    const destination = String(hotspotFilterMeta?.destinationCityKey || '').trim().toLowerCase();
    return source.length > 0 && destination.length > 0 && source !== destination;
  }, [hotspotFilterMeta?.sourceCityKey, hotspotFilterMeta?.destinationCityKey]);

  const deriveHotspotCityContext = useCallback((hotspot: AvailableHotspot): 'SOURCE_CITY' | 'DESTINATION_CITY' | 'UNKNOWN' => {
    const backend = String((hotspot as any)?.cityContext || '').trim().toUpperCase();
    if (backend === 'SOURCE_CITY' || backend === 'DESTINATION_CITY') {
      return backend;
    }

    const sourceKey = String(hotspotFilterMeta?.sourceCityKey || '').trim().toLowerCase();
    const destinationKey = String(hotspotFilterMeta?.destinationCityKey || '').trim().toLowerCase();
    const hay = `${String(hotspot?.locationMap || '')} ${String(hotspot?.name || '')}`.toLowerCase();

    if (destinationKey && hay.includes(destinationKey)) return 'DESTINATION_CITY';
    if (sourceKey && hay.includes(sourceKey)) return 'SOURCE_CITY';
    return 'UNKNOWN';
  }, [hotspotFilterMeta?.destinationCityKey, hotspotFilterMeta?.sourceCityKey]);

  const activePreviewHotspot = useMemo(
    () => availableHotspots.find((h) => Number(h.id) === Number(activePreviewHotspotId || 0)) || null,
    [availableHotspots, activePreviewHotspotId],
  );

  const selectedPreviewCityContext = useMemo(() => {
    const backend = String(manualPreviewState?.manualInsertionFit?.hotspotCityContext || '').trim().toUpperCase();
    if (backend === 'SOURCE_CITY' || backend === 'DESTINATION_CITY') {
      return backend as 'SOURCE_CITY' | 'DESTINATION_CITY';
    }
    if (!activePreviewHotspot) return null;
    return deriveHotspotCityContext(activePreviewHotspot);
  }, [manualPreviewState?.manualInsertionFit?.hotspotCityContext, activePreviewHotspot, deriveHotspotCityContext]);

  const destinationInsertionSlotLabel = useMemo(() => {
    const preferredRaw = String(
      matrixFit?.chosenSlot?.attemptedSlotLabel
      || matrixFit?.bestSlot?.attemptedSlotLabel
      || (selectedHotspotAnchor as any)?.slot
      || ''
    ).trim();
    const matrixDestinationName = String((matrixFit as any)?.destinationHotelName || '').trim();
    const escapedDestinationName = matrixDestinationName
      ? matrixDestinationName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      : '';
    const preferred = preferredRaw
      .replace(/^Will\s+be\s+inserted\s+/i, '')
      .replace(/^Insert\s+after\s+/i, 'After ')
      .replace(/->\s*Hotel(\b|$)/i, destinationHotelDisplayName ? `-> ${destinationHotelDisplayName}` : '-> Hotel')
      .replace(escapedDestinationName ? new RegExp(escapedDestinationName, 'gi') : /$^/, destinationHotelDisplayName || matrixDestinationName)
      .trim();
    if (preferred.length > 0) return preferred;
    if (selectedPreviewCityContext === 'DESTINATION_CITY') {
      return `After reaching ${destinationCityLabel}`;
    }
    return '';
  }, [matrixFit, selectedHotspotAnchor, selectedPreviewCityContext, destinationCityLabel, destinationHotelDisplayName]);

  const hotspotListRows = useMemo(() => {
    if (!routeIsDifferentCity) {
      return filteredHotspots.map((hotspot) => ({ kind: 'hotspot' as const, hotspot }));
    }

    const source: AvailableHotspot[] = [];
    const destination: AvailableHotspot[] = [];
    const other: AvailableHotspot[] = [];

    for (const hotspot of filteredHotspots) {
      const context = deriveHotspotCityContext(hotspot);
      if (context === 'SOURCE_CITY') source.push(hotspot);
      else if (context === 'DESTINATION_CITY') destination.push(hotspot);
      else other.push(hotspot);
    }

    const sourceLabel = `${String(hotspotFilterMeta?.sourceCityKey || 'Source').replace(/^./, (c: string) => c.toUpperCase())} Hotspots`;
    const destinationLabel = `${destinationCityLabel} Hotspots`;
    const rows: Array<{ kind: 'header'; label: string } | { kind: 'hotspot'; hotspot: AvailableHotspot }> = [];
    if (source.length > 0) {
      rows.push({ kind: 'header', label: sourceLabel });
      rows.push(...source.map((hotspot) => ({ kind: 'hotspot' as const, hotspot })));
    }
    if (destination.length > 0) {
      rows.push({ kind: 'header', label: destinationLabel });
      rows.push(...destination.map((hotspot) => ({ kind: 'hotspot' as const, hotspot })));
    }
    if (other.length > 0) {
      rows.push({ kind: 'header', label: 'Other Hotspots' });
      rows.push(...other.map((hotspot) => ({ kind: 'hotspot' as const, hotspot })));
    }
    return rows;
  }, [routeIsDifferentCity, filteredHotspots, deriveHotspotCityContext, hotspotFilterMeta?.sourceCityKey, destinationCityLabel]);

  const hotspotCityBuckets = useMemo(() => {
    const source: AvailableHotspot[] = [];
    const destination: AvailableHotspot[] = [];
    const other: AvailableHotspot[] = [];

    for (const hotspot of filteredHotspots) {
      const context = deriveHotspotCityContext(hotspot);
      if (context === 'SOURCE_CITY') source.push(hotspot);
      else if (context === 'DESTINATION_CITY') destination.push(hotspot);
      else other.push(hotspot);
    }

    return { source, destination, other };
  }, [filteredHotspots, deriveHotspotCityContext]);

  const hotspotCityTabs = useMemo(() => {
    if (!routeIsDifferentCity) {
      return [{
        key: 'ALL' as const,
        label: 'All Hotspots',
        count: filteredHotspots.length,
      }];
    }

    const sourceLabel = `${String(hotspotFilterMeta?.sourceCityKey || 'Source').replace(/^./, (c: string) => c.toUpperCase())} Hotspots`;
    const destinationLabel = `${destinationCityLabel} Hotspots`;
    const tabs: Array<{ key: 'SOURCE_CITY' | 'DESTINATION_CITY' | 'UNKNOWN'; label: string; count: number }> = [];

    if (hotspotCityBuckets.source.length > 0) {
      tabs.push({ key: 'SOURCE_CITY', label: sourceLabel, count: hotspotCityBuckets.source.length });
    }
    if (hotspotCityBuckets.destination.length > 0) {
      tabs.push({ key: 'DESTINATION_CITY', label: destinationLabel, count: hotspotCityBuckets.destination.length });
    }
    if (hotspotCityBuckets.other.length > 0) {
      tabs.push({ key: 'UNKNOWN', label: 'Other Hotspots', count: hotspotCityBuckets.other.length });
    }

    return tabs;
  }, [routeIsDifferentCity, filteredHotspots.length, hotspotFilterMeta?.sourceCityKey, destinationCityLabel, hotspotCityBuckets]);

  const visibleHotspotsForActiveTab = useMemo(() => {
    if (!routeIsDifferentCity || activeHotspotCityTab === 'ALL') return filteredHotspots;
    if (activeHotspotCityTab === 'SOURCE_CITY') return hotspotCityBuckets.source;
    if (activeHotspotCityTab === 'DESTINATION_CITY') return hotspotCityBuckets.destination;
    return hotspotCityBuckets.other;
  }, [routeIsDifferentCity, activeHotspotCityTab, filteredHotspots, hotspotCityBuckets]);

  useEffect(() => {
    if (!routeIsDifferentCity) {
      if (activeHotspotCityTab !== 'ALL') setActiveHotspotCityTab('ALL');
      return;
    }

    const validKeys = new Set(hotspotCityTabs.map((t) => t.key));
    if (!validKeys.has(activeHotspotCityTab as any)) {
      const first = hotspotCityTabs[0];
      if (first) setActiveHotspotCityTab(first.key);
    }
  }, [routeIsDifferentCity, hotspotCityTabs, activeHotspotCityTab]);

  // Hotel selection modal state
  type AvailableHotel = {
    id: number;
    name: string;
    address: string;
    category: string;
    checkIn: string;
    checkOut: string;
    distance: string;
  };

  const [hotelSelectionModal, setHotelSelectionModal] = useState<{
    open: boolean;
    planId: number | null;
    routeId: number | null;
    routeDate: string;
    cityCode?: string;
    cityName?: string;
    checkInDate?: string;
    checkOutDate?: string;
  }>({
    open: false,
    planId: null,
    routeId: null,
    routeDate: "",
  });
  const [hotelSearchChildAges, setHotelSearchChildAges] = useState<string[]>([]);
  const [isResolvingArrivalPolicy, setIsResolvingArrivalPolicy] = useState(false);
  const [latestArrivalPolicy, setLatestArrivalPolicy] = useState<HotelArrivalPolicyResponse | null>(null);
  const [pendingRouteTimeUpdate, setPendingRouteTimeUpdate] = useState<{
    planId: number;
    routeId: number;
    dayNumber: number;
    startTimeHms: string;
    endTimeHms: string;
  } | null>(null);
  const [lastArrivalPolicyDecisionKey, setLastArrivalPolicyDecisionKey] = useState<string | null>(null);
  const [arrivalPolicyConfirmModal, setArrivalPolicyConfirmModal] = useState<{
    open: boolean;
    arrivalDate: string;
    previousDayDate: string;
    request: HotelArrivalPolicyRequest | null;
  }>({
    open: false,
    arrivalDate: '',
    previousDayDate: '',
    request: null,
  });

  const [roomSelectionModal, setRoomSelectionModal] = useState<{
    open: boolean;
    itinerary_plan_hotel_details_ID: number;
    itinerary_plan_id: number;
    itinerary_route_id: number;
    hotel_id: number;
    group_type: number;
    hotel_name: string;
  } | null>(null);

  const [availableHotels, setAvailableHotels] = useState<AvailableHotel[]>([]);
  const [loadingHotels, setLoadingHotels] = useState(false);
  const [isRebuildingHotels, setIsRebuildingHotels] = useState(false);
  const [isApplyingRouteTimeUpdate, setIsApplyingRouteTimeUpdate] = useState(false);
  const [routeTimeProgressPercent, setRouteTimeProgressPercent] = useState(0);
  const [routeTimeEstimatedMs, setRouteTimeEstimatedMs] = useState(0);
  const [pendingScrollDayNumber, setPendingScrollDayNumber] = useState<number | null>(null);
  const routeTimeProgressTimerRef = useRef<number | null>(null);
  const [isSelectingHotel, setIsSelectingHotel] = useState(false);
  const [hotelSearchQuery, setHotelSearchQuery] = useState("");
  const [selectedMealPlan, setSelectedMealPlan] = useState({
    all: false,
    breakfast: false,
    lunch: false,
    dinner: false,
  });

  // Filter hotels based on search query
  const filteredHotels = availableHotels.filter(
    (h) =>
      h.name.toLowerCase().includes(hotelSearchQuery.toLowerCase()) ||
      h.address.toLowerCase().includes(hotelSearchQuery.toLowerCase())
  );

  const stopRouteTimeProgress = useCallback(() => {
    if (routeTimeProgressTimerRef.current !== null) {
      window.clearInterval(routeTimeProgressTimerRef.current);
      routeTimeProgressTimerRef.current = null;
    }
  }, []);

  const startRouteTimeProgress = useCallback((estimatedMs: number) => {
    stopRouteTimeProgress();
    setRouteTimeProgressPercent(1);

    const startedAt = Date.now();
    routeTimeProgressTimerRef.current = window.setInterval(() => {
      const elapsed = Date.now() - startedAt;
      const pct = Math.floor((elapsed / Math.max(estimatedMs, 1000)) * 100);
      setRouteTimeProgressPercent(Math.min(95, Math.max(1, pct)));
    }, 220);
  }, [stopRouteTimeProgress]);

  const getRouteTimeUpdateEstimateMs = useCallback((dayNumber: number) => {
    const dayCount = Math.max(1, itinerary?.days?.length ?? dayNumber ?? 1);
    const createEstimateMs = getEstimatedSaveMs(dayCount, "itineary_basic_info_with_optimized_route");
    return Math.max(15000, createEstimateMs * 2);
  }, [itinerary?.days?.length]);

  // Gallery modal state
  const [galleryModal, setGalleryModal] = useState<{
    open: boolean;
    images: string[];
    title: string;
  }>({
    open: false,
    images: [],
    title: "",
  });
  const [galleryActiveIdx, setGalleryActiveIdx] = useState(0);

  // Video modal state
  const [videoModal, setVideoModal] = useState<{
    open: boolean;
    videoUrl: string;
    title: string;
  }>({
    open: false,
    videoUrl: "",
    title: "",
  });

  // Clipboard/Share modal state
  const [clipboardModal, setClipboardModal] = useState(false);
  const [shareModal, setShareModal] = useState(false);
  const [clipboardType, setClipboardType] = useState<'recommended' | 'highlights' | 'para'>('recommended');
  const [clipboardRatesVisible, setClipboardRatesVisible] = useState<boolean>(false);

  // Hotel Selection State (Multi-Provider)
  // Structure: { [routeId]: { provider, hotelCode, bookingCode, roomType, netAmount, hotelName, checkInDate, checkOutDate, groupType } }
  const [selectedHotelBookings, setSelectedHotelBookings] = useState<{
    [routeId: number]: {
      provider: string;
      hotelCode: string;
      bookingCode: string;
      roomType: string;
      netAmount: number;
      hotelName: string;
      checkInDate: string;
      checkOutDate: string;
      searchInitiatedAt?: string;
      groupType?: number;
    }
  }>({});

  const [selectedHotels, setSelectedHotels] = useState<{ [key: string]: boolean }>({});
  const [activeHotelGroupType, setActiveHotelGroupType] = useState<number | null>(null);
  const [activeHotelListTotal, setActiveHotelListTotal] = useState<number>(0);
  const [selectedVehicleTotalsByType, setSelectedVehicleTotalsByType] = useState<
    Record<number, { totalAmount: number; totalQty: number }>
  >({});
  const activeVehicleTypeIds = useMemo(() => {
    return new Set(
      (itinerary?.vehicles || [])
        .map((v) => Number(v.vehicleTypeId || 0))
        .filter(Boolean)
    );
  }, [itinerary?.vehicles]);
  const [isRoomCostPopoverOpen, setIsRoomCostPopoverOpen] = useState(false);
  const summaryStickyRef = useRef<HTMLDivElement | null>(null);
  const hotelListRef = useRef<HTMLDivElement | null>(null);
  const vehicleListRef = useRef<HTMLDivElement | null>(null);
  const [summaryStickyHeight, setSummaryStickyHeight] = useState(0);
  /** page tracked per groupType for Load More */
  const [hotelPageByGroupRoute, setHotelPageByGroupRoute] = useState<Record<string, number>>({});
  const [isLoadingMoreHotels, setIsLoadingMoreHotels] = useState(false);

  useEffect(() => {
    const el = summaryStickyRef.current;
    if (!el) return;

    const updateStickyHeight = () => {
      setSummaryStickyHeight(Math.ceil(el.getBoundingClientRect().height));
    };

    updateStickyHeight();
    const resizeObserver = new ResizeObserver(updateStickyHeight);
    resizeObserver.observe(el);
    window.addEventListener("resize", updateStickyHeight);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener("resize", updateStickyHeight);
    };
  }, [itinerary?.quoteId]);

  useEffect(() => {
    setSelectedVehicleTotalsByType({});
  }, [itinerary?.quoteId]);

  useEffect(() => {
    setSelectedVehicleTotalsByType((prev) => {
      const next: Record<number, { totalAmount: number; totalQty: number }> = {};
      for (const [rawTypeId, value] of Object.entries(prev)) {
        const typeId = Number(rawTypeId);
        if (activeVehicleTypeIds.has(typeId)) {
          next[typeId] = value;
        }
      }

      if (Object.keys(next).length === Object.keys(prev).length) {
        return prev;
      }

      return next;
    });
  }, [activeVehicleTypeIds]);

  const scrollToSection = (el: HTMLDivElement | null) => {
    if (!el) return;

    let scrollParent: HTMLElement | null = el.parentElement;
    while (scrollParent) {
      const style = window.getComputedStyle(scrollParent);
      const canScrollY = /(auto|scroll)/.test(style.overflowY || "");
      if (canScrollY && scrollParent.scrollHeight > scrollParent.clientHeight) {
        break;
      }
      scrollParent = scrollParent.parentElement;
    }

    const offset = summaryStickyHeight + 12;
    if (scrollParent) {
      const parentRect = scrollParent.getBoundingClientRect();
      const targetTop =
        scrollParent.scrollTop +
        (el.getBoundingClientRect().top - parentRect.top) -
        offset;

      scrollParent.scrollTo({ top: Math.max(targetTop, 0), behavior: "smooth" });
      return;
    }

    const y = el.getBoundingClientRect().top + window.scrollY - offset;
    window.scrollTo({ top: Math.max(y, 0), behavior: "smooth" });
  };

  const scrollToHotelList = () => scrollToSection(hotelListRef.current);
  const scrollToVehicleList = () => scrollToSection(vehicleListRef.current);

  const itineraryPreference = Number(itinerary?.itineraryPreference ?? 0);
 

  const handleHotelLoadMore = async (groupType: number, routeId: number, nextPage: number) => {
    if (!quoteId || isLoadingMoreHotels) return;
    setIsLoadingMoreHotels(true);
    try {
      const data = await ItineraryService.getHotelDetails(quoteId, nextPage, 20, groupType, routeId);
      const newRows: ItineraryHotelRow[] = data.hotels || [];
      setHotelDetails((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          hotels: [...prev.hotels, ...newRows],
          pagination: data.pagination ? { ...(prev.pagination || {}), ...data.pagination } : prev.pagination,
          routePagination: data.routePagination
            ? { ...(prev.routePagination || {}), ...data.routePagination }
            : prev.routePagination,
        };
      });
      setHotelPageByGroupRoute((prev) => ({ ...prev, [`${groupType}-${routeId}`]: nextPage }));
    } catch (err) {
      console.error('Load More hotels failed', err);
    } finally {
      setIsLoadingMoreHotels(false);
    }
  };

  const dedupeHotelRows = useCallback((rows: ItineraryHotelRow[]): ItineraryHotelRow[] => {
    const seen = new Set<string>();
    const unique: ItineraryHotelRow[] = [];

    rows.forEach((row) => {
      const key = [
        Number(row.groupType || 0),
        Number(row.itineraryRouteId || 0),
        String(row.date || row.checkInDate || ''),
        String(row.hotelCode || ''),
        String(row.bookingCode || ''),
        String(row.roomType || ''),
        String(row.hotelName || ''),
      ].join('|');

      if (seen.has(key)) return;
      seen.add(key);
      unique.push(row);
    });

    return unique;
  }, []);

  const fetchCompleteHotelDetails = useCallback(async (
    currentQuoteId: string,
  ): Promise<ItineraryHotelDetailsResponse> => {
    const base = await ItineraryService.getHotelDetails(currentQuoteId);

    const merged: ItineraryHotelDetailsResponse = {
      ...(base as ItineraryHotelDetailsResponse),
      hotels: [...((base as ItineraryHotelDetailsResponse).hotels || [])],
      pagination: { ...((base as ItineraryHotelDetailsResponse).pagination || {}) },
      routePagination: { ...((base as ItineraryHotelDetailsResponse).routePagination || {}) },
    };

    const pending = new Map<string, { groupType: number; routeId: number; nextPage: number }>();

    Object.entries(merged.routePagination || {}).forEach(([key, meta]) => {
      const routeId = Number(String(key).split('-')[1] || 0);
      if (!meta?.hasMore || !meta.groupType || !routeId) return;

      pending.set(key, {
        groupType: Number(meta.groupType),
        routeId,
        nextPage: Number(meta.page || 1) + 1,
      });
    });

    while (pending.size > 0) {
      const [key, req] = pending.entries().next().value as [
        string,
        { groupType: number; routeId: number; nextPage: number }
      ];
      pending.delete(key);

      const next = await ItineraryService.getHotelDetails(
        currentQuoteId,
        req.nextPage,
        20,
        req.groupType,
        req.routeId,
      );

      const nextTyped = next as ItineraryHotelDetailsResponse;

      merged.hotels = dedupeHotelRows([...(merged.hotels || []), ...(nextTyped.hotels || [])]);
      merged.pagination = {
        ...(merged.pagination || {}),
        ...(nextTyped.pagination || {}),
      };
      merged.routePagination = {
        ...(merged.routePagination || {}),
        ...(nextTyped.routePagination || {}),
      };

      const updatedMeta = merged.routePagination?.[key];
      if (updatedMeta?.hasMore) {
        pending.set(key, {
          groupType: Number(updatedMeta.groupType),
          routeId: req.routeId,
          nextPage: Number(updatedMeta.page || req.nextPage) + 1,
        });
      }
    }

    return merged;
  }, [dedupeHotelRows]);

  const selectedHotelTotal = useMemo(
    () => Object.values(selectedHotelBookings).reduce((sum, item) => sum + Number(item.netAmount || 0), 0),
    [selectedHotelBookings]
  );

  const selectedHotelMetaByRoute = useMemo(() => {
    const map = new Map<number, { hotelName: string; hotelDistance: string | null; totalAmount: number; noOfRooms: number }>();
    if (!hotelDetails?.hotels?.length) return map;
    const itineraryRoomCount = Math.max(Number(itinerary?.roomCount || 1), 1);

    const preferredGroupType =
      activeHotelGroupType ??
      hotelDetails.hotelTabs?.[0]?.groupType ??
      1;

    const routeBuckets = new Map<number, ItineraryHotelRow[]>();
    hotelDetails.hotels
      .filter((h) => h.groupType === preferredGroupType)
      .forEach((h) => {
        const routeId = Number(h.itineraryRouteId || 0);
        if (!routeId) return;
        if (!routeBuckets.has(routeId)) routeBuckets.set(routeId, []);
        routeBuckets.get(routeId)!.push(h);
      });

    routeBuckets.forEach((rows, routeId) => {
      const selected = selectedHotelBookings[routeId];

      if (selected) {
        const matched = rows.find((h) => {
          const bookingCodeMatch = selected.bookingCode && h.bookingCode && selected.bookingCode === h.bookingCode;
          const roomTypeMatch = selected.roomType && h.roomType && selected.roomType.trim() === h.roomType.trim();
          const amountMatch = Number(selected.netAmount || 0) > 0 &&
            Number(selected.netAmount || 0) === (Number(h.totalHotelCost || 0) + Number(h.totalHotelTaxAmount || 0));
          const strictBookingMatch = Boolean(bookingCodeMatch && (roomTypeMatch || amountMatch));
          const hotelCodeMatch = selected.hotelCode && h.hotelCode && selected.hotelCode === h.hotelCode;
          const hotelNameMatch = selected.hotelName && h.hotelName && selected.hotelName.trim().toLowerCase() === h.hotelName.trim().toLowerCase();
          return Boolean(strictBookingMatch || hotelCodeMatch || hotelNameMatch);
        });

        map.set(routeId, {
          hotelName: selected.hotelName || matched?.hotelName || "Hotel",
          hotelDistance: matched?.hotelDistance || null,
          totalAmount:
            Number(selected.netAmount || 0) ||
            Number(matched?.totalHotelCost || 0) + Number(matched?.totalHotelTaxAmount || 0),
          noOfRooms: Math.max(Number(matched?.noOfRooms || 0), 0) || itineraryRoomCount,
        });
        return;
      }

      const cheapest = rows.reduce((best, curr) => {
        const bestTotal = Number(best.totalHotelCost || 0) + Number(best.totalHotelTaxAmount || 0);
        const currTotal = Number(curr.totalHotelCost || 0) + Number(curr.totalHotelTaxAmount || 0);
        return currTotal < bestTotal ? curr : best;
      });

      map.set(routeId, {
        hotelName: cheapest.hotelName || "Hotel",
        hotelDistance: cheapest.hotelDistance || null,
        totalAmount: Number(cheapest.totalHotelCost || 0) + Number(cheapest.totalHotelTaxAmount || 0),
        noOfRooms: Math.max(Number(cheapest.noOfRooms || 0), 0) || itineraryRoomCount,
      });
    });

    return map;
  }, [hotelDetails, selectedHotelBookings, activeHotelGroupType, itinerary?.roomCount]);

  const computedHotelCost = useMemo(() => {
    if (activeHotelListTotal > 0) return Number(activeHotelListTotal);
    if (selectedHotelTotal > 0) return selectedHotelTotal;

    const preferredGroupType =
      activeHotelGroupType ??
      hotelDetails?.hotelTabs?.[0]?.groupType ??
      1;

    const getStayDate = (hotel: ItineraryHotelRow): string => {
      if (hotel.checkInDate) return String(hotel.checkInDate);
      if (hotel.date) return String(hotel.date);
      const dayText = String(hotel.day || '');
      const parts = dayText.split(' | ');
      return (parts[1] || dayText).trim();
    };

    const groupedByStay = new Map<string, ItineraryHotelRow[]>();
    (hotelDetails?.hotels || [])
      .filter((h) => Number(h.groupType) === Number(preferredGroupType) && h.hotelName !== 'No Hotels Available')
      .forEach((h) => {
        const routeId = Number(h.itineraryRouteId || 0);
        if (!routeId) return;
        const stayKey = `${routeId}::${getStayDate(h)}`;
        if (!groupedByStay.has(stayKey)) groupedByStay.set(stayKey, []);
        groupedByStay.get(stayKey)!.push(h);
      });

    const itineraryRoomCount = Math.max(Number(itinerary?.roomCount || 1), 1);

    const totalFromHotelApi = Array.from(groupedByStay.values()).reduce((sum, rows) => {
      const cheapest = rows.reduce((best, curr) => {
        const bestTotal = Number(best.totalHotelCost || 0) + Number(best.totalHotelTaxAmount || 0);
        const currTotal = Number(curr.totalHotelCost || 0) + Number(curr.totalHotelTaxAmount || 0);
        return currTotal < bestTotal ? curr : best;
      });

      const baseAmount = Number(cheapest.totalHotelCost || 0) + Number(cheapest.totalHotelTaxAmount || 0);
      const rowRooms = Math.max(Number(cheapest.noOfRooms || 0), 0);
      const effectiveRooms = Math.max(rowRooms || itineraryRoomCount, 1);
      return sum + baseAmount * effectiveRooms;
    }, 0);

    if (totalFromHotelApi > 0) return totalFromHotelApi;
    return Number(itinerary?.costBreakdown?.totalHotelAmount || 0);
  }, [
    activeHotelListTotal,
    selectedHotelTotal,
    selectedHotelMetaByRoute,
    hotelDetails,
    activeHotelGroupType,
    itinerary?.costBreakdown?.totalHotelAmount,
    itinerary?.roomCount,
  ]);

  const roomBreakdownRoomNights = useMemo(() => {
    const fallbackStayCount = Number(itinerary?.dayCount || itinerary?.days?.length || 1);
    const fallbackRoomCount = Math.max(Number(itinerary?.roomCount || 1), 1);

    if (!hotelDetails?.hotels?.length) {
      return fallbackStayCount * fallbackRoomCount;
    }

    const preferredGroupType =
      activeHotelGroupType ??
      hotelDetails.hotelTabs?.[0]?.groupType ??
      1;

    const getStayDate = (hotel: ItineraryHotelRow): string => {
      if (hotel.checkInDate) return String(hotel.checkInDate);
      if (hotel.date) return String(hotel.date);
      const dayText = String(hotel.day || '');
      const parts = dayText.split(' | ');
      return (parts[1] || dayText).trim();
    };

    const groupedByStay = new Map<string, ItineraryHotelRow[]>();
    hotelDetails.hotels
      .filter((h) => Number(h.groupType) === Number(preferredGroupType) && h.hotelName !== 'No Hotels Available')
      .forEach((h) => {
        const routeId = Number(h.itineraryRouteId || 0);
        if (!routeId) return;
        const stayDate = getStayDate(h);
        const stayKey = `${routeId}::${stayDate}`;
        if (!groupedByStay.has(stayKey)) groupedByStay.set(stayKey, []);
        groupedByStay.get(stayKey)!.push(h);
      });

    const matchSelectedHotelRow = (rows: ItineraryHotelRow[], routeId: number): ItineraryHotelRow | null => {
      const selected = selectedHotelBookings[routeId];
      if (!selected) return null;

      return (
        rows.find((h) => {
          const bookingCodeMatch = selected.bookingCode && h.bookingCode && selected.bookingCode === h.bookingCode;
          const roomTypeMatch = selected.roomType && h.roomType && selected.roomType.trim() === h.roomType.trim();
          const amountMatch =
            Number(selected.netAmount || 0) > 0 &&
            Number(selected.netAmount || 0) === (Number(h.totalHotelCost || 0) + Number(h.totalHotelTaxAmount || 0));
          const strictBookingMatch = Boolean(bookingCodeMatch && (roomTypeMatch || amountMatch));
          const hotelCodeMatch = selected.hotelCode && h.hotelCode && selected.hotelCode === h.hotelCode;
          const hotelNameMatch =
            selected.hotelName &&
            h.hotelName &&
            selected.hotelName.trim().toLowerCase() === h.hotelName.trim().toLowerCase();

          return Boolean(strictBookingMatch || hotelCodeMatch || hotelNameMatch);
        }) || null
      );
    };

    let totalRoomNights = 0;
    groupedByStay.forEach((rows, stayKey) => {
      const routeId = Number(stayKey.split('::')[0] || 0);

      const selectedMatch = routeId ? matchSelectedHotelRow(rows, routeId) : null;
      const cheapest = rows.reduce((best, curr) => {
        const bestTotal = Number(best.totalHotelCost || 0) + Number(best.totalHotelTaxAmount || 0);
        const currTotal = Number(curr.totalHotelCost || 0) + Number(curr.totalHotelTaxAmount || 0);
        return currTotal < bestTotal ? curr : best;
      });

      const chosen = selectedMatch || cheapest;
      const rowRooms = Math.max(Number(chosen.noOfRooms || 0), 0);
      const effectiveRooms = Math.max(rowRooms || fallbackRoomCount, 1);
      totalRoomNights += effectiveRooms;
    });

    return totalRoomNights || fallbackStayCount * fallbackRoomCount;
  }, [
    hotelDetails,
    activeHotelGroupType,
    itinerary?.dayCount,
    itinerary?.days?.length,
    itinerary?.roomCount,
    selectedHotelBookings,
  ]);

  const computedVehicleAmount = useMemo(() => {
    if (!shouldShowVehicles) return 0;

    const selectedTotal = Object.values(selectedVehicleTotalsByType).reduce(
      (sum, row) => sum + Number(row.totalAmount || 0),
      0,
    );

    if (selectedTotal > 0) return selectedTotal;

    return Number(
      itinerary?.costBreakdown?.totalVehicleAmount ??
      itinerary?.costBreakdown?.totalVehicleCost ??
      0,
    );
  }, [selectedVehicleTotalsByType, itinerary?.costBreakdown?.totalVehicleAmount, itinerary?.costBreakdown?.totalVehicleCost, shouldShowVehicles]);

  const computedVehicleQty = useMemo(() => {
    if (!shouldShowVehicles) return 0;

    const selectedQty = Object.values(selectedVehicleTotalsByType).reduce(
      (sum, row) => sum + Number(row.totalQty || 0),
      0,
    );

    if (selectedQty > 0) return selectedQty;
    return Number(itinerary?.costBreakdown?.totalVehicleQty || 0);
  }, [selectedVehicleTotalsByType, itinerary?.costBreakdown?.totalVehicleQty, shouldShowVehicles]);

  const financialTotals = useMemo(() => {
    const hotelAmount = shouldShowHotels
      ? Number(
          computedHotelCost ||
          itinerary?.costBreakdown?.totalRoomCost ||
          itinerary?.costBreakdown?.totalHotelAmount ||
          0,
        )
      : 0;

    const vehicleAmount = shouldShowVehicles ? Number(computedVehicleAmount || 0) : 0;

    const otherAmount =
      Number(itinerary?.costBreakdown?.totalAmenitiesCost || 0) +
      Number(itinerary?.costBreakdown?.extraBedCost || 0) +
      Number(itinerary?.costBreakdown?.childWithBedCost || 0) +
      Number(itinerary?.costBreakdown?.childWithoutBedCost || 0) +
      Number(itinerary?.costBreakdown?.totalGuideCost || 0) +
      Number(itinerary?.costBreakdown?.totalHotspotCost || 0) +
      Number(itinerary?.costBreakdown?.totalActivityCost || 0) +
      Number(itinerary?.costBreakdown?.additionalMargin || 0);

    const totalAmount = hotelAmount + vehicleAmount + otherAmount;
    const couponDiscount = Number(itinerary?.costBreakdown?.couponDiscount || 0);
    const agentMargin = Number(itinerary?.costBreakdown?.agentMargin || 0);
    const totalRoundOff = Number(itinerary?.costBreakdown?.totalRoundOff || 0);
    const netPayable = totalAmount - couponDiscount + agentMargin + totalRoundOff;

    return {
      hotelAmount,
      totalAmount,
      netPayable,
      totalRoundOff,
    };
  }, [itinerary, computedHotelCost, computedVehicleAmount, shouldShowHotels, shouldShowVehicles]);

  const hotelHydratedDays = useMemo(() => {
    if (!itinerary?.days?.length) return [];

    return itinerary.days.map((day, dayIndex) => {
      // ALWAYS ensure we have a segments array to process
      let segments = Array.isArray(day.segments) ? [...day.segments] : [];
      
      // If no segments,  just return the day with empty segments
      // (don't try to process hotel logic if there's nothing to process)
      if (!segments || segments.length === 0) {
        return {
          ...day,
          segments: [],
        };
      }
      
      const currentHotelName = selectedHotelMetaByRoute.get(day.id)?.hotelName?.trim() || null;
      const currentHotelDistance = selectedHotelMetaByRoute.get(day.id)?.hotelDistance?.trim() || null;
      const previousDay = dayIndex > 0 ? itinerary.days[dayIndex - 1] : null;
      const previousHotelName = previousDay
        ? selectedHotelMetaByRoute.get(previousDay.id)?.hotelName?.trim() || null
        : null;

      let firstTravelSeen = false;
      let derivedHotelArrivalMinutes: number | null = null;

      segments = segments.map((segment) => {
        if (segment.type === 'travel') {
          const isFirstTravelOfDay = !firstTravelSeen;
          firstTravelSeen = true;

          let from = segment.from;
          let to = segment.to;

          if (currentHotelName && /\bhotel\b/i.test(String(segment.to || '').trim())) {
            to = currentHotelName;
          }

          if (isFirstTravelOfDay && previousHotelName) {
            const normalizedFrom = normalizeTimelineLabel(segment.from);
            const normalizedDeparture = normalizeTimelineLabel(day.departure);
            const normalizedArrival = normalizeTimelineLabel(day.arrival);

            if (
              /\bhotel\b/i.test(String(segment.from || '').trim()) ||
              normalizedFrom === normalizedDeparture ||
              normalizedFrom === normalizedArrival
            ) {
              from = previousHotelName;
            }
          } else if (currentHotelName && /\bhotel\b/i.test(String(segment.from || '').trim())) {
            from = currentHotelName;
          }

          const isTravelToCurrentHotel =
            !!currentHotelName &&
            normalizeTimelineLabel(to) === normalizeTimelineLabel(currentHotelName);

          if (isTravelToCurrentHotel) {
            const estimatedTravelMinutes = estimateHotelTravelMinutesFromDistance(currentHotelDistance);
            const travelStartMinutes = parseDisplayMinutes(segment.timeRange, 'start');
            const travelEndMinutes = parseDisplayMinutes(segment.timeRange, 'end');

            if (
              estimatedTravelMinutes != null &&
              travelStartMinutes !== null &&
              travelEndMinutes !== null
            ) {
              const scheduledTravelMinutes = Math.max(0, travelEndMinutes - travelStartMinutes);
              const effectiveTravelMinutes = Math.max(scheduledTravelMinutes, estimatedTravelMinutes);
              const adjustedTravelEndMinutes = travelStartMinutes + effectiveTravelMinutes;
              derivedHotelArrivalMinutes = adjustedTravelEndMinutes;

              return {
                ...segment,
                from,
                to,
                timeRange: `${formatMinutesToDisplay(travelStartMinutes)} - ${formatMinutesToDisplay(adjustedTravelEndMinutes)}`,
                duration: formatMinutesDuration(effectiveTravelMinutes),
                distance: currentHotelDistance || segment.distance,
              };
            }
          }

          return {
            ...segment,
            from,
            to,
          };
        }

        if (segment.type === 'checkin' && currentHotelName) {
          const existingCheckinMinutes = parseDisplayMinutes(segment.time);
          const adjustedCheckinMinutes =
            derivedHotelArrivalMinutes != null && existingCheckinMinutes != null
              ? Math.max(existingCheckinMinutes, derivedHotelArrivalMinutes)
              : (derivedHotelArrivalMinutes ?? existingCheckinMinutes);

          return {
            ...segment,
            hotelName: currentHotelName,
            time: adjustedCheckinMinutes !== null ? formatMinutesToDisplay(adjustedCheckinMinutes) : segment.time,
          };
        }

        return segment;
      });

      const earlyCheckinIndex = segments.findIndex((segment) => {
        if (segment.type !== 'checkin') return false;
        const timeMinutes = parseDisplayMinutes(segment.time);
        if (timeMinutes === null) return false;
        return isEarlyMorningTime(parseDisplayTimeToHms(segment.time || ''));
      });

      const hasEarlyMorningArrival = dayIndex === 0 && earlyCheckinIndex >= 0;

      const hasLateHotelTravel =
        hasEarlyMorningArrival &&
        currentHotelName &&
        segments.some((segment, segmentIndex) => (
          segmentIndex > earlyCheckinIndex &&
          segment.type === 'travel' &&
          normalizeTimelineLabel(segment.to) === normalizeTimelineLabel(currentHotelName)
        ));

      const hasLateCheckin =
        hasEarlyMorningArrival &&
        segments.some((segment, segmentIndex) => (
          segmentIndex > earlyCheckinIndex && segment.type === 'checkin'
        ));

      if (hasEarlyMorningArrival && currentHotelName && !hasLateHotelTravel && !hasLateCheckin) {
        const lastRenderableSegment = [...segments]
          .reverse()
          .find((segment, reverseIndex) => {
            const actualIndex = segments.length - 1 - reverseIndex;
            return actualIndex > earlyCheckinIndex && segment.type !== 'hotspot';
          });

        const getSegmentAnchorLabel = (segment: ItinerarySegment | undefined): string => {
          if (!segment) return day.arrival || day.departure || currentHotelName;
          if (segment.type === 'attraction') return segment.name;
          if (segment.type === 'travel') return segment.to || segment.from || day.arrival || currentHotelName;
          if (segment.type === 'break') return segment.location || day.arrival || currentHotelName;
          if (segment.type === 'checkin') return segment.hotelName || currentHotelName;
          if (segment.type === 'start') return day.arrival || day.departure || currentHotelName;
          if (segment.type === 'return') return day.arrival || day.departure || currentHotelName;
          return day.arrival || day.departure || currentHotelName;
        };

        const lastLabel = getSegmentAnchorLabel(lastRenderableSegment);
        const lastEndMinutes = lastRenderableSegment
          ? lastRenderableSegment.type === 'attraction'
            ? parseDisplayMinutes(lastRenderableSegment.visitTime, 'end')
            : lastRenderableSegment.type === 'travel'
              ? parseDisplayMinutes(lastRenderableSegment.timeRange, 'end')
              : lastRenderableSegment.type === 'break'
                ? parseDisplayMinutes(lastRenderableSegment.timeRange, 'end')
                : lastRenderableSegment.type === 'checkin'
                  ? parseDisplayMinutes(lastRenderableSegment.time)
                  : lastRenderableSegment.type === 'start'
                    ? parseDisplayMinutes(lastRenderableSegment.timeRange, 'end')
                    : lastRenderableSegment.type === 'return'
                      ? parseDisplayMinutes(lastRenderableSegment.time)
                      : null
          : null;

        const dayEndMinutes = parseDisplayMinutes(day.endTime);
        const finalCheckinMinutes = dayEndMinutes ?? lastEndMinutes;

        if (lastLabel && normalizeTimelineLabel(lastLabel) !== normalizeTimelineLabel(currentHotelName)) {
          if (
            lastEndMinutes !== null &&
            finalCheckinMinutes !== null &&
            finalCheckinMinutes > lastEndMinutes
          ) {
            const scheduleGapMinutes = finalCheckinMinutes - lastEndMinutes;
            const estimatedTravelMinutes = estimateHotelTravelMinutesFromDistance(currentHotelDistance);
            const effectiveTravelMinutes = estimatedTravelMinutes != null
              ? Math.max(scheduleGapMinutes, estimatedTravelMinutes)
              : scheduleGapMinutes;
            const travelEndMinutes = lastEndMinutes + effectiveTravelMinutes;

            segments.push({
              type: 'travel',
              from: lastLabel,
              to: currentHotelName,
              timeRange: `${formatMinutesToDisplay(lastEndMinutes)} - ${formatMinutesToDisplay(travelEndMinutes)}`,
              distance: currentHotelDistance || '',
              duration: formatMinutesDuration(effectiveTravelMinutes),
              note: 'This may vary due to traffic conditions',
            });

            const adjustedCheckinMinutes = Math.max(finalCheckinMinutes, travelEndMinutes);

            segments.push({
              type: 'checkin',
              hotelName: currentHotelName,
              hotelAddress: '',
              time: formatMinutesToDisplay(adjustedCheckinMinutes),
            });
          } else {
            segments.push({
              type: 'checkin',
              hotelName: currentHotelName,
              hotelAddress: '',
              time: finalCheckinMinutes !== null ? formatMinutesToDisplay(finalCheckinMinutes) : day.endTime || null,
            });
          }
        }
      }

      return {
        ...day,
        segments,
      };
    });
  }, [itinerary?.days, selectedHotelMetaByRoute]);

  // Ensure "start" segment always appears before first travel segment within each day
  const displayDays = (hotelHydratedDays.length ? hotelHydratedDays : itinerary?.days || []).map((day, idx) => {
    // CRITICAL SAFEGUARD: Ensure segments always exist as an array
    const rawSegments = (() => {
      // First try hotelHydratedDays/current day segments
      if (day.segments && Array.isArray(day.segments) && day.segments.length > 0) {
        return day.segments;
      }
      
      // Fallback: try to get from original itinerary.days in case hotelHydratedDays lost them
      if (itinerary?.days && itinerary.days.length > idx) {
        const originalDay = itinerary.days[idx];
        if (originalDay.segments && Array.isArray(originalDay.segments)) {
          return originalDay.segments;
        }
      }
      
      // Last resort: empty array
      return [];
    })();
    
    // DEBUG: Log for first day
    if (idx === 0 && rawSegments.length === 0) {
      console.warn('[ItineraryDetails] DisplayDays: No segments found for day 0!', {
        dayFromHydrated: day,
        dayFromOriginal: itinerary?.days?.[0],
        hotelHydratedDaysLength: hotelHydratedDays.length,
        itineraryDaysLength: itinerary?.days?.length,
      });
    }
    
    if (idx === 0) {
      console.log('[ItineraryDetails] DisplayDays day 0:', {
        segmentCount: rawSegments.length,
        hasSegments: rawSegments.length > 0,
        types: rawSegments.map(s => s?.type),
      });
    }
    
    return {
      ...day,
      segments: rawSegments.length > 0 ? rawSegments.sort((a, b) => {
        if (a.type === 'start' && b.type !== 'start') return -1;
        if (b.type === 'start' && a.type !== 'start') return 1;
        return 0;
      }) : [],
    };
  });

  const overallTripCostWithHotels = useMemo(() => {
    // Keep header total in lockstep with the bottom "Net Payable" calculation.
    return Number(financialTotals.netPayable || 0).toFixed(2);
  }, [financialTotals.netPayable]);

  // ✅ Para should use recommendation GROUPS, not first 4 random hotels
  const paraRecommendations = useMemo(() => {
    if (!hotelDetails?.hotelTabs?.length) return [];

    const getRenderedHotelsForGroup = (groupType: number): ItineraryHotelRow[] => {
      const grouped = new Map<number, ItineraryHotelRow[]>();

      hotelDetails.hotels
        .filter((h) => h.groupType === groupType)
        .forEach((hotel) => {
          const routeId = Number(hotel.itineraryRouteId || 0);
          if (!grouped.has(routeId)) {
            grouped.set(routeId, []);
          }
          grouped.get(routeId)!.push(hotel);
        });

      return Array.from(grouped.entries())
        .sort((a, b) => a[0] - b[0])
        .map(([, hotelsForRoute]) => {
          return hotelsForRoute.reduce((best, curr) => {
            const bestTotal = Number(best.totalHotelCost || 0) + Number(best.totalHotelTaxAmount || 0);
            const currTotal = Number(curr.totalHotelCost || 0) + Number(curr.totalHotelTaxAmount || 0);
            return currTotal < bestTotal ? curr : best;
          });
        });
    };

    return hotelDetails.hotelTabs.slice(0, 4).map((tab, idx) => ({
      label: `Recommended #${idx + 1}`,
      groupType: tab.groupType,
      tabLabel: tab.label,
      hotels: getRenderedHotelsForGroup(tab.groupType),
    }));
  }, [hotelDetails]);

  const buildDefaultClipboardSelection = () => {
    const next: Record<string, boolean> = {};
    paraRecommendations.forEach((_item, idx) => {
      next[`para-${idx}`] = true;
    });
    return next;
  };

  useEffect(() => {
    setClipboardRatesVisible(Boolean(hotelDetails?.hotelRatesVisible));
  }, [hotelDetails]);

  useEffect(() => {
    if (!hotelDetails?.hotelTabs?.length) return;
    if (activeHotelGroupType == null) {
      setActiveHotelGroupType(hotelDetails.hotelTabs[0].groupType);
    }
  }, [hotelDetails, activeHotelGroupType]);

  useEffect(() => {
    const firstDay = itinerary?.days?.find((day) => Number(day.dayNumber) === 1) || itinerary?.days?.[0];
    if (!firstDay || !hotelDetails) {
      return;
    }

    const routeDateYmd = normalizeDateToYmd(firstDay.date);
    const startTimeHms = parseDisplayTimeToHms(firstDay.startTime || '');
    if (!routeDateYmd || !startTimeHms || !isEarlyMorningTime(startTimeHms)) {
      return;
    }

    const hasPreviousDayMarkerRow = hotelDetails.hotels.some((hotel) => {
      const hotelDateYmd = normalizeDateToYmd(hotel.date);
      return (
        Number(hotel.itineraryRouteId || 0) === Number(firstDay.id || 0) &&
        Number(hotel.hotelId || 0) === 0 &&
        Boolean(hotelDateYmd) &&
        hotelDateYmd !== routeDateYmd
      );
    });

    if (hasPreviousDayMarkerRow) {
      setLastArrivalPolicyDecisionKey(
        buildArrivalPolicyDecisionKey(firstDay.id, firstDay.date, startTimeHms),
      );
    }
  }, [hotelDetails, itinerary]);

  useEffect(() => {
    if (!clipboardModal || !paraRecommendations.length) return;

    const hasAnySelected = Object.values(selectedHotels).some(Boolean);
    if (!hasAnySelected) {
      setSelectedHotels(buildDefaultClipboardSelection());
    }
  }, [clipboardModal, paraRecommendations, selectedHotels]);

  const escapeHtml = (value: unknown) => {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  };

  const formatCurrency = (value?: number | string | null) => {
    const amount = Number(value || 0);
    return `₹ ${amount.toFixed(2)}`;
  };

  const copyHtmlToClipboard = async (html: string, plainText: string) => {
    try {
      const outlookSafeHtml = `
        <div style="display:block;width:100%;margin:0;padding:0;font-family:Calibri;font-size:11px;color:#302c6e;">
          ${html.trim()}
          <table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0" style="border-collapse:collapse;width:100%;">
            <tr><td style="font-size:1px;line-height:1px;height:1px;">&nbsp;</td></tr>
          </table>
        </div>
      `;

      if (window.ClipboardItem && navigator.clipboard?.write) {
        const item = new ClipboardItem({
          "text/html": new Blob([outlookSafeHtml], { type: "text/html" }),
          "text/plain": new Blob([plainText], { type: "text/plain" }),
        });

        await navigator.clipboard.write([item]);
      } else {
        await navigator.clipboard.writeText(plainText);
      }
    } catch (error) {
      console.error("Clipboard copy failed", error);
      await navigator.clipboard.writeText(plainText);
    }
  };

  type ClipboardMode = "recommended" | "highlights" | "para";

  type ClipboardGroup = {
    label: string;
    groupType: number;
    hotels: ItineraryHotelRow[];
  };

  const getSelectedClipboardGroups = (_mode: ClipboardMode): ClipboardGroup[] => {
    if (!hotelDetails) return [];

    return paraRecommendations
      .filter((item, idx) => selectedHotels[`para-${idx}`])
      .map((item) => ({
        label: item.label,
        groupType: item.groupType,
        hotels: item.hotels,
      }));
  };

  const buildClipboardHtml = (mode: ClipboardMode) => {
    if (!hotelDetails || !itinerary) {
      return { html: "", plainText: "" };
    }

    const selectedGroups = getSelectedClipboardGroups(mode);

    if (!selectedGroups.length) {
      return { html: "", plainText: "" };
    }

    const sectionTitle =
      mode === "highlights"
        ? "Highlights"
        : mode === "recommended"
          ? "Recommended Hotels"
          : "Recommended Hotel";

    const summaryHtml = `
    <table width="700" border="1" cellpadding="0" cellspacing="0" style="border-collapse:collapse;background:#fff;font-family:Calibri;font-size:11px;color:#302c6e;">
      <tr>
        <td colspan="4" align="center" style="font-size:22px;line-height:40px;font-weight:600;">
          Tour Itinerary Plan
        </td>
      </tr>
    </table>

    <table width="700" border="1" cellpadding="0" cellspacing="0" style="border-collapse:collapse;background:#fff;font-family:Calibri;font-size:11px;line-height:1.2;color:#302c6e;">
      <tr>
        <td width="25%" style="text-align:center;padding:3px;border:1px solid #b1b1b1;">
          <span style="color:#afafaf;font-weight:500;display:block;">Quote Id</span>
          <span style="font-weight:700;display:block;">${escapeHtml(itinerary.quoteId)}</span>
        </td>
        <td width="25%" style="text-align:center;padding:3px;border:1px solid #b1b1b1;">
          <span style="color:#afafaf;font-weight:500;display:block;">Trip Date Range</span>
          <span style="font-weight:700;display:block;">${escapeHtml(itinerary.dateRange)}</span>
        </td>
        <td width="25%" style="text-align:center;padding:3px;border:1px solid #b1b1b1;">
          <span style="color:#afafaf;font-weight:500;display:block;">Total Pax</span>
          <span style="font-weight:700;display:block;">
            ${escapeHtml(itinerary.adults)} Adult, ${escapeHtml(itinerary.children)} Children, ${escapeHtml(itinerary.infants)} Infant
          </span>
        </td>
        <td width="25%" style="text-align:center;padding:3px;border:1px solid #b1b1b1;">
          <span style="color:#afafaf;font-weight:500;display:block;">Room Count</span>
          <span style="font-weight:700;display:block;">${escapeHtml(itinerary.roomCount)}</span>
        </td>
      </tr>
    </table>
  `;

    const totalCols = clipboardRatesVisible ? 6 : 5;
    const hotelSectionsHtml = `
      <table width="700" border="1" cellpadding="0" cellspacing="0" style="border-collapse:collapse;background:#fff;font-family:Calibri;font-size:11px;color:#302c6e;">
        ${selectedGroups.map((group) => {
          const rowsHtml =
            group.hotels.length > 0
              ? group.hotels
                .map((hotel, index) => {
                  const totalPrice =
                    Number(hotel.totalHotelCost || 0) +
                    Number(hotel.totalHotelTaxAmount || 0);

                  return `
                    <tr>
                      <td style="text-align:left;border:1px solid #b1b1b1;padding:3px;">
                        Day- ${index + 1} | ${escapeHtml(hotel.date || hotel.day)}
                      </td>
                      <td style="text-align:left;border:1px solid #b1b1b1;padding:3px;">
                        ${escapeHtml(hotel.destination)}
                      </td>
                      <td style="text-align:left;border:1px solid #b1b1b1;padding:3px;">
                        ${escapeHtml(hotel.hotelName)} - ${escapeHtml(hotel.category)}
                      </td>
                      <td style="text-align:left;border:1px solid #b1b1b1;padding:3px;">
                        ${escapeHtml(hotel.roomType)} - ${escapeHtml(itinerary.roomCount)}
                      </td>
                      ${clipboardRatesVisible
                        ? `<td style="text-align:left;border:1px solid #b1b1b1;padding:3px;"><b>${escapeHtml(formatCurrency(totalPrice))}</b></td>`
                        : ""
                      }
                      <td style="text-align:left;border:1px solid #b1b1b1;padding:3px;">
                        ${escapeHtml(normalizeMealPlanLabel(hotel.mealPlan))}
                      </td>
                    </tr>
                  `;
                })
                .join("")
              : `<tr><td colspan="${totalCols}" style="border:1px solid #b1b1b1;text-align:center;padding:3px;">No hotel available</td></tr>`;

          return `
            <tr>
              <td colspan="${totalCols}" align="center" style="font-size:18px;line-height:36px;font-weight:600;border:1px solid #b1b1b1;padding:4px;">
                ${escapeHtml(sectionTitle)} - ${escapeHtml(group.label)}
              </td>
            </tr>
            <tr>
              <th style="background:#f2f2f2;text-align:left;padding:3px;border:1px solid #b1b1b1;">Day</th>
              <th style="background:#f2f2f2;text-align:left;padding:3px;border:1px solid #b1b1b1;">Destination</th>
              <th style="background:#f2f2f2;text-align:left;padding:3px;border:1px solid #b1b1b1;">Hotel Name - Category</th>
              <th style="background:#f2f2f2;text-align:left;padding:3px;border:1px solid #b1b1b1;">Room Type - Count</th>
              ${clipboardRatesVisible ? `<th style="background:#f2f2f2;text-align:left;padding:3px;border:1px solid #b1b1b1;">Price</th>` : ""}
              <th style="background:#f2f2f2;text-align:left;padding:3px;border:1px solid #b1b1b1;">Meal Plan</th>
            </tr>
            ${rowsHtml}
          `;
        }).join("")}
      </table>
    `;

    const vehicleRowsHtml =
      shouldShowVehicles && itinerary.vehicles?.length > 0
        ? itinerary.vehicles
          .map((vehicle) => {
            return `
              <tr>
                <td style="border:1px solid #b1b1b1;padding:3px;font-size:13px;width:85%;">
                  ${escapeHtml(vehicle.vehicleTypeName || "Vehicle")} (${escapeHtml(vehicle.totalQty)}) -
                  ${escapeHtml(vehicle.fromLabel || "")} ==> ${escapeHtml(vehicle.toLabel || "")}
                </td>
                <td style="border:1px solid #b1b1b1;padding:3px;font-size:13px;width:15%;">
                  <b>${escapeHtml(formatCurrency(vehicle.totalAmount || 0))}</b>
                </td>
              </tr>
            `;
          })
          .join("")
        : `
        <tr>
          <td colspan="2" style="border:1px solid #b1b1b1;text-align:center;padding:3px;">
            No Vehicle available
          </td>
        </tr>
      `;

    const vehicleSectionHtml = shouldShowVehicles ? `
    <table width="700" border="1" cellpadding="0" cellspacing="0" style="border-collapse:collapse;background:#fff;font-family:Calibri;font-size:11px;color:#302c6e;">
      <tr>
        <td colspan="2" align="center" style="font-size:18px;line-height:40px;font-weight:600;">
          Vehicle Details
        </td>
      </tr>
      <tr>
        <th style="background:#f2f2f2;text-align:left;padding:3px;border:1px solid #b1b1b1;">Vehicle Details</th>
        <th style="background:#f2f2f2;text-align:left;padding:3px;border:1px solid #b1b1b1;">Total Amount</th>
      </tr>
      ${vehicleRowsHtml}
    </table>
  ` : "";

    const clipboardRoomNights = Math.max(Number(roomBreakdownRoomNights || 0), 1);
    const clipboardRoomNightsLabel = `${clipboardRoomNights} room-night${clipboardRoomNights > 1 ? 's' : ''}`;

    const costSectionHtml = `
    <table width="700" border="1" cellpadding="0" cellspacing="0" style="border-collapse:collapse;background:#fff;font-family:Calibri;font-size:11px;color:#302c6e;margin-top:16px;">
      <tr>
        <td colspan="2" align="center" style="font-size:18px;line-height:40px;font-weight:600;">
          Overall Cost
        </td>
      </tr>
      ${shouldShowHotels ? `
      <tr>
        <th style="text-align:left;padding:3px;border:1px solid #b1b1b1;">Total Hotel Cost For (${escapeHtml(clipboardRoomNightsLabel)})</th>
        <td style="text-align:left;padding:3px;border:1px solid #b1b1b1;"><strong>${escapeHtml(formatCurrency(financialTotals.hotelAmount || 0))}</strong></td>
      </tr>
      ` : ""}
      ${itinerary.costBreakdown.totalAmenitiesCost !== undefined && itinerary.costBreakdown.totalAmenitiesCost > 0 ? `
      <tr>
        <th style="text-align:left;padding:3px;border:1px solid #b1b1b1;">Total Amenities Cost</th>
        <td style="text-align:left;padding:3px;border:1px solid #b1b1b1;">${escapeHtml(formatCurrency(itinerary.costBreakdown.totalAmenitiesCost || 0))}</td>
      </tr>
      ` : ""}
      ${Number(itinerary.extraBed || 0) > 0 || Number(itinerary.costBreakdown.extraBedCost || 0) > 0 ? `
      <tr>
        <th style="text-align:left;padding:3px;border:1px solid #b1b1b1;">Extra Bed Cost (${escapeHtml(itinerary.extraBed || 0)})</th>
        <td style="text-align:left;padding:3px;border:1px solid #b1b1b1;">${escapeHtml(formatCurrency(itinerary.costBreakdown.extraBedCost || 0))}</td>
      </tr>
      ` : ""}
      ${Number(itinerary.childWithBed || 0) > 0 || Number(itinerary.costBreakdown.childWithBedCost || 0) > 0 ? `
      <tr>
        <th style="text-align:left;padding:3px;border:1px solid #b1b1b1;">Child With Bed Cost (${escapeHtml(itinerary.childWithBed || 0)})</th>
        <td style="text-align:left;padding:3px;border:1px solid #b1b1b1;">${escapeHtml(formatCurrency(itinerary.costBreakdown.childWithBedCost || 0))}</td>
      </tr>
      ` : ""}
      ${itinerary.costBreakdown.childWithoutBedCost !== undefined && itinerary.costBreakdown.childWithoutBedCost > 0 ? `
      <tr>
        <th style="text-align:left;padding:3px;border:1px solid #b1b1b1;">Child Without Bed Cost (${escapeHtml(itinerary.childWithoutBed || 0)})</th>
        <td style="text-align:left;padding:3px;border:1px solid #b1b1b1;">${escapeHtml(formatCurrency(itinerary.costBreakdown.childWithoutBedCost || 0))}</td>
      </tr>
      ` : ""}
      ${shouldShowVehicles ? `
      <tr>
        <th style="text-align:left;padding:3px;border:1px solid #b1b1b1;">Total Vehicle Cost (${escapeHtml(computedVehicleQty || 0)})</th>
        <td style="text-align:left;padding:3px;border:1px solid #b1b1b1;"><strong>${escapeHtml(formatCurrency(computedVehicleAmount || 0))}</strong></td>
      </tr>
      ` : ""}
      <tr>
        <th style="text-align:left;padding:3px;border:1px solid #b1b1b1;">Total Amount</th>
        <td style="text-align:left;padding:3px;border:1px solid #b1b1b1;"><strong>${escapeHtml(formatCurrency(financialTotals.totalAmount || 0))}</strong></td>
      </tr>
      ${(itinerary.costBreakdown.couponDiscount ?? 0) > 0 ? `
      <tr>
        <th style="text-align:left;padding:3px;border:1px solid #b1b1b1;">Coupon Discount</th>
        <td style="text-align:left;padding:3px;border:1px solid #b1b1b1;">- ${escapeHtml(formatCurrency(itinerary.costBreakdown.couponDiscount || 0))}</td>
      </tr>
      ` : ""}
      <tr>
        <th style="text-align:left;padding:3px;border:1px solid #b1b1b1;">Total Round Off</th>
        <td style="text-align:left;padding:3px;border:1px solid #b1b1b1;">${escapeHtml(formatCurrency(financialTotals.totalRoundOff || 0))}</td>
      </tr>
      <tr>
        <th style="text-align:left;padding:3px;border:1px solid #b1b1b1;">Net Payable To ${escapeHtml(itinerary.costBreakdown.companyName || "DVI Holidays")}</th>
        <td style="text-align:left;padding:3px;border:1px solid #b1b1b1;"><strong>${escapeHtml(formatCurrency(financialTotals.netPayable || 0))}</strong></td>
      </tr>
    </table>
  `;

    const fullHtml = `
    <div style="margin:0;padding:0;background-color:#f9f9f9;font-family:Calibri;font-size:11px;color:#302c6e;display:block;width:100%;">
      <div style="font-family:Calibri;font-size:11px;color:#302c6e;width:700px;text-align:left;display:block;">
        <table width="700" align="left" border="1" cellpadding="0" cellspacing="0" style="border-collapse:collapse;background:#fff;font-family:Calibri;font-size:11px;color:#302c6e;float:none;display:block;">
          <tr><td style="padding-bottom:8px;">${summaryHtml}</td></tr>
          <tr><td style="padding-bottom:8px;">${hotelSectionsHtml}</td></tr>
          ${vehicleSectionHtml ? `<tr><td style="padding-bottom:8px;">${vehicleSectionHtml}</td></tr>` : ""}
          <tr><td style="padding-bottom:8px;">${costSectionHtml}</td></tr>
        </table>
        <p style="margin:0; clear:both; text-align:left; line-height:0; font-size:0;">&nbsp;</p>
      </div>
    </div>
  `;

    const plainText = selectedGroups
      .map((group) => {
        const hotelLines = group.hotels
          .map(
            (hotel, index) =>
              `Day-${index + 1} | ${hotel.day} | ${hotel.destination} | ${hotel.hotelName} - ${hotel.category} | ${hotel.roomType} - ${itinerary.roomCount} | ${normalizeMealPlanLabel(hotel.mealPlan)}`
          )
          .join("\n");

        return `${sectionTitle} - ${group.label}\n${hotelLines}`;
      })
      .join("\n\n");

    return { html: fullHtml, plainText, hotelSectionsHtml, costSectionHtml };
  };

  const extractHotelSectionFromHtml = (html: string): string => {
    if (!html) return "";

    const hotelHeadingMatch = html.match(/Recommended Hotel(?:s)?\s*-/i);
    if (!hotelHeadingMatch || hotelHeadingMatch.index === undefined) {
      return "";
    }

    const headingIndex = hotelHeadingMatch.index;
    const hotelSectionStart = html.lastIndexOf("<table", headingIndex);
    if (hotelSectionStart === -1) return "";

    const vehicleHeadingMatch = html.match(/Vehicle Details/i);
    if (!vehicleHeadingMatch || vehicleHeadingMatch.index === undefined) {
      return "";
    }

    const vehicleHeadingIndex = vehicleHeadingMatch.index;
    const vehicleSectionStart = html.lastIndexOf("<table", vehicleHeadingIndex);
    if (vehicleSectionStart === -1 || vehicleSectionStart <= hotelSectionStart) {
      return "";
    }

    return html.slice(hotelSectionStart, vehicleSectionStart);
  };

  const mergeClipboardWithRenderedHotels = (
    backendHtml: string,
    renderedHotelsHtml: string,
  ): string => {
    if (!backendHtml || !renderedHotelsHtml) return backendHtml;

    const backendVehicleHeadingMatch = backendHtml.match(/Vehicle Details/i);
    if (!backendVehicleHeadingMatch || backendVehicleHeadingMatch.index === undefined) {
      return backendHtml;
    }

    const backendVehicleHeadingIndex = backendVehicleHeadingMatch.index;
    const backendVehicleStart = backendHtml.lastIndexOf("<table", backendVehicleHeadingIndex);
    if (backendVehicleStart === -1) {
      return backendHtml;
    }

    const backendHotelHeadingMatch = backendHtml.match(/Recommended Hotel(?:s)?\s*-/i);
    if (!backendHotelHeadingMatch || backendHotelHeadingMatch.index === undefined) {
      return `${backendHtml.slice(0, backendVehicleStart)}${renderedHotelsHtml}${backendHtml.slice(backendVehicleStart)}`;
    }

    const backendHotelHeadingIndex = backendHotelHeadingMatch.index;
    const backendHotelStart = backendHtml.lastIndexOf("<table", backendHotelHeadingIndex);
    if (backendHotelStart === -1 || backendVehicleStart <= backendHotelStart) {
      return `${backendHtml.slice(0, backendVehicleStart)}${renderedHotelsHtml}${backendHtml.slice(backendVehicleStart)}`;
    }

    return `${backendHtml.slice(0, backendHotelStart)}${renderedHotelsHtml}${backendHtml.slice(backendVehicleStart)}`;
  };

  const mergeClipboardWithRenderedCost = (
    backendHtml: string,
    renderedCostHtml: string,
  ): string => {
    if (!backendHtml || !renderedCostHtml) return backendHtml;

    const backendHotspotHeadingMatch = backendHtml.match(/Hotspot Details/i);
    if (!backendHotspotHeadingMatch || backendHotspotHeadingMatch.index === undefined) {
      return backendHtml;
    }

    const backendHotspotHeadingIndex = backendHotspotHeadingMatch.index;
    const backendHotspotStart = backendHtml.lastIndexOf("<table", backendHotspotHeadingIndex);
    if (backendHotspotStart === -1) return backendHtml;

    const roundOffIndex = backendHtml.lastIndexOf("Total Round Off", backendHotspotStart);
    const netPayableIndex = backendHtml.lastIndexOf("Net Payable To", backendHotspotStart);
    const totalAmountIndex = backendHtml.lastIndexOf("Total Amount", backendHotspotStart);
    const anchorIndex = Math.max(roundOffIndex, netPayableIndex, totalAmountIndex);

    if (anchorIndex === -1) {
      return `${backendHtml.slice(0, backendHotspotStart)}${renderedCostHtml}${backendHtml.slice(backendHotspotStart)}`;
    }

    const backendCostStart = backendHtml.lastIndexOf("<table", anchorIndex);
    if (backendCostStart === -1 || backendCostStart >= backendHotspotStart) {
      return `${backendHtml.slice(0, backendHotspotStart)}${renderedCostHtml}${backendHtml.slice(backendHotspotStart)}`;
    }

    return `${backendHtml.slice(0, backendCostStart)}${renderedCostHtml}${backendHtml.slice(backendHotspotStart)}`;
  };

const htmlToPlainText = (html: string): string => {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
};

const cleanVehicleOnlyClipboardHtml = (html: string): string => {
  if (!html) return html;

  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");

  doc.querySelectorAll("table").forEach((table) => {
    const rows = Array.from(table.querySelectorAll("tr"));

    const hotelStartIndex = rows.findIndex((row) =>
      /Recommended Hotel/i.test(row.textContent || ""),
    );

    const vehicleStartIndex = rows.findIndex((row, index) =>
      index > hotelStartIndex && /Vehicle Details/i.test(row.textContent || ""),
    );

    if (hotelStartIndex !== -1 && vehicleStartIndex !== -1) {
      rows.slice(hotelStartIndex, vehicleStartIndex).forEach((row) => row.remove());
    }
  });

  doc.querySelectorAll("td, th").forEach((cell) => {
    const text = cell.textContent?.replace(/\s+/g, " ").trim() || "";

    if (/^Room Count\b/i.test(text)) {
      cell.remove();
    }
  });

  doc.querySelectorAll("tr").forEach((row) => {
    const text = row.textContent?.replace(/\s+/g, " ").trim() || "";

    if (/^Total Room Cost\b/i.test(text)) {
      row.remove();
    }
  });

  return doc.body.innerHTML;
};

const handleVehicleOnlyClipboardCopy = async () => {
  if (!quoteId || itineraryPreference !== 2) return;

  try {
    const { html, plainText } = await ItineraryService.getClipboardContent(
      quoteId,
      "recommended",
      [],
    );

    if (!html && !plainText) {
      toast.error("Failed to prepare clipboard content");
      return;
    }

const vehicleOnlyHtml = html
  ? cleanVehicleOnlyClipboardHtml(html)
  : plainText;

  
    const vehicleOnlyPlainText = vehicleOnlyHtml
      ? htmlToPlainText(vehicleOnlyHtml)
      : plainText;

    await copyHtmlToClipboard(vehicleOnlyHtml, vehicleOnlyPlainText);
    toast.success("Formatted clipboard content copied!");
  } catch (error) {
    console.error("Failed to copy vehicle-only clipboard content", error);
    toast.error("Failed to copy clipboard content");
  }
};
  // Confirm Quotation modal state
  const [confirmQuotationModal, setConfirmQuotationModal] = useState(false);
  const [voucherModal, setVoucherModal] = useState(false);
  const [pluckCardModal, setPluckCardModal] = useState(false);
  const [invoiceModal, setInvoiceModal] = useState(false);
  const [invoiceType, setInvoiceType] = useState<'tax' | 'proforma'>('tax');
  const [incidentalModal, setIncidentalModal] = useState(false);
  const [isConfirmingQuotation, setIsConfirmingQuotation] = useState(false);
  const [walletBalance, setWalletBalance] = useState<string>('');

  // ✅ Reference to hotel save function
  const hotelSaveFunctionRef = React.useRef<(() => Promise<boolean>) | null>(null);

  // ✅ Track if component is mounted to prevent state updates after unmount
  const isMountedRef = useRef(true);

  // ✅ Track which quoteId we're currently fetching to prevent duplicate fetches
  const currentFetchRef = useRef<string | null>(null);

  const [agentInfo, setAgentInfo] = useState<{
    quotation_no: string;
    agent_name: string;
    agent_id?: number;
  } | null>(null);

  type AdditionalPassenger = {
    title: string;
    name: string;
    age: string;
    nationality: string;
    panNo: string;
    passportNo: string;
  };

  const [guestDetails, setGuestDetails] = useState({
    salutation: 'Mr',
    name: '',
    contactNo: '',
    age: '',
    nationality: 'IN',
    panNo: '',
    passportNo: '',
    alternativeContactNo: '',
    emailId: '',
    arrivalDateTime: '',
    arrivalPlace: '',
    arrivalFlightDetails: '',
    departureDateTime: '',
    departurePlace: '',
    departureFlightDetails: '',
  });
  const [confirmDefaultNationality, setConfirmDefaultNationality] = useState('IN');
  const [additionalAdults, setAdditionalAdults] = useState<AdditionalPassenger[]>([]);
  const [additionalChildren, setAdditionalChildren] = useState<AdditionalPassenger[]>([]);
  const [additionalInfants, setAdditionalInfants] = useState<AdditionalPassenger[]>([]);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [prebookData, setPrebookData] = useState<any | null>(null);
  const prebookDataRef = useRef<any | null>(null);
  const [isPrebooking, setIsPrebooking] = useState(false);
  const [isOpeningConfirmQuotation, setIsOpeningConfirmQuotation] = useState(false);
  const [hasAcceptedUpdatedPrice, setHasAcceptedUpdatedPrice] = useState(false);
  const [confirmOccupanciesTemplate, setConfirmOccupanciesTemplate] = useState<Array<{ adults: number; children: number; childrenAges: number[] }> | null>(null);
  const prebookTotalAmount = Number(prebookData?.updatedTotalPrice || prebookData?.finalPrice || prebookData?.totalAmount || 0);
  const hasPrebookPriceChanged = prebookTotalAmount > 0 && Math.abs(prebookTotalAmount - selectedHotelTotal) > 0.01;
  const prebookHotelEntries = Array.isArray(prebookData?.hotels) ? prebookData.hotels : [];
  // Non-TBO user-selected hotels — shown in the review modal but NOT sent to prebook API
  const nonTboSelectedHotelEntries = Object.entries(selectedHotelBookings)
    .filter(([, h]) => String((h as any)?.provider || '').trim().toLowerCase() !== 'tbo')
    .map(([routeId, h]: [string, any]) => {
      const routeIdNum = parseInt(routeId, 10);
      const selectedProvider = String((h as any)?.provider || '').trim().toLowerCase();
      const selectedBookingCode = String((h as any)?.bookingCode || '').trim();
      const selectedHotelCode = String((h as any)?.hotelCode || '').trim();
      const selectedHotelName = String((h as any)?.hotelName || '').trim().toLowerCase();
      const selectedRoomType = String((h as any)?.roomType || '').trim().toLowerCase();
      const selectedAmount = Number((h as any)?.netAmount || 0);

      const routeRows = (Array.isArray(hotelDetails?.hotels) ? hotelDetails.hotels : []).filter((row: any) =>
        Number(row?.itineraryRouteId || 0) === routeIdNum &&
        String(row?.provider || '').trim().toLowerCase() === selectedProvider,
      );

      const matchedHotelRow =
        routeRows.find((row: any) => {
          const rowBookingCode = String(row?.bookingCode || '').trim();
          const rowHotelCode = String(row?.hotelCode || '').trim();
          const rowHotelName = String(row?.hotelName || '').trim().toLowerCase();
          const rowRoomType = String(row?.roomType || '').trim().toLowerCase();
          const rowAmount = Number(row?.totalHotelCost || 0) + Number(row?.totalHotelTaxAmount || 0);

          const bookingCodeMatch = selectedBookingCode !== '' && rowBookingCode !== '' && selectedBookingCode === rowBookingCode;
          const hotelCodeMatch = selectedHotelCode !== '' && rowHotelCode !== '' && selectedHotelCode === rowHotelCode;
          const hotelNameMatch = selectedHotelName !== '' && rowHotelName !== '' && selectedHotelName === rowHotelName;
          const roomTypeMatch = selectedRoomType !== '' && rowRoomType !== '' && selectedRoomType === rowRoomType;
          const amountMatch = selectedAmount > 0 && Math.abs(selectedAmount - rowAmount) <= 0.01;

          return (bookingCodeMatch && (roomTypeMatch || amountMatch)) || hotelCodeMatch || (hotelNameMatch && amountMatch);
        }) || routeRows[0] || null;

      return { routeId: routeIdNum, ...h, matchedHotelRow };
    });
  const confirmRoomCount = Math.max(Number(itinerary?.roomCount || 1), 1);
  const confirmPassengerMix = [
    Number(itinerary?.adults || 0) > 0 ? `${Number(itinerary?.adults || 0)} Adult${Number(itinerary?.adults || 0) === 1 ? '' : 's'}` : null,
    Number(itinerary?.children || 0) > 0 ? `${Number(itinerary?.children || 0)} Child${Number(itinerary?.children || 0) === 1 ? '' : 'ren'}` : null,
    Number(itinerary?.infants || 0) > 0 ? `${Number(itinerary?.infants || 0)} Infant${Number(itinerary?.infants || 0) === 1 ? '' : 's'}` : null,
  ].filter(Boolean).join(', ');
  const confirmOccupancyPreview = (confirmOccupanciesTemplate && confirmOccupanciesTemplate.length > 0
    ? confirmOccupanciesTemplate
    : buildOccupancyPreview(
        confirmRoomCount,
        Number(itinerary?.adults || 0),
        Number(itinerary?.children || 0),
      )
  ).map((room) => ({ adults: room.adults, children: room.children }));

  const ALLOWED_TITLES = ['Mr', 'Ms', 'Mrs'];
  const TBO_SESSION_WINDOW_MS = 35 * 60 * 1000;
  const NAME_REGEX = /^[A-Za-z][A-Za-z\s'-]{1,24}$/;
  const PAN_REGEX = /^[A-Z]{5}[0-9]{4}[A-Z]$/;
  const isValidPassengerName = (value: string) => NAME_REGEX.test(value.trim());
  const isValidPan = (value: string) => PAN_REGEX.test(value.trim().toUpperCase());
  const isValidIsoNationality = (value: string) => /^[A-Z]{2}$/.test(value.trim().toUpperCase());
  type HotelProvider = 'tbo' | 'resavenue' | 'hobse' | 'axisrooms' | 'staah';

const inferHotelProvider = (entry: any): HotelProvider => {
  const provider = String(entry?.provider || '')
    .trim()
    .toLowerCase();

  if (
    provider === 'tbo' ||
    provider === 'resavenue' ||
    provider === 'hobse' ||
    provider === 'axisrooms' ||
    provider === 'staah'
  ) {
    return provider;
  }

  const bookingCode = String(entry?.bookingCode || '').trim().toUpperCase();
  if (bookingCode.includes('!TB!')) return 'tbo';
  if (bookingCode.startsWith('STAAH-')) return 'staah';

  return 'tbo';
};
  const resolveConfirmNationality = (plan: any, fallbackNationality: string = 'IN'): string => {
    const explicitIso2 = String(
      plan?.nationality_iso2 ||
      plan?.nationality_shortname ||
      plan?.guestNationality ||
      '',
    )
      .trim()
      .toUpperCase();
    if (/^[A-Z]{2}$/.test(explicitIso2)) {
      return explicitIso2;
    }

    const rawNationality = plan?.nationality;
    if (typeof rawNationality === 'string' && /^[A-Z]{2}$/i.test(rawNationality.trim())) {
      return rawNationality.trim().toUpperCase();
    }

    const legacyMap: Record<number, string> = {
      284: 'AE',
      229: 'NO',
      101: 'IN',
      177: 'IN',
    };
    const mapped = legacyMap[Number(rawNationality || 0)];
    const fallback = String(fallbackNationality || 'IN').trim().toUpperCase();
    return mapped || (/^[A-Z]{2}$/.test(fallback) ? fallback : 'IN');
  };
  const getPassengerFieldError = (
    label: 'adult' | 'child' | 'infant',
    index: number,
    field: 'title' | 'name' | 'age' | 'nationality',
  ) => formErrors[`${label}-${index}-${field}`];

  useEffect(() => {
    prebookDataRef.current = prebookData;
  }, [prebookData]);

  // Cancellation modal state
  const [cancelModalOpen, setCancelModalOpen] = useState(false);

  const defaultPassenger = (title: string): AdditionalPassenger => ({
    title,
    name: '',
    age: '',
    nationality: guestDetails.nationality,
    panNo: '',
    passportNo: '',
  });

  const buildTboOccupancies = (
    roomCount: number,
    totalAdults: number,
    childAges: number[],
  ): Array<{ adults: number; children: number; childrenAges: number[] }> => {
    const rooms = Math.max(Number(roomCount) || 1, 1);
    const occupancies = Array.from({ length: rooms }, () => ({
      adults: 1,
      children: 0,
      childrenAges: [] as number[],
    }));

    let adultsLeft = Math.max(totalAdults - rooms, 0);
    let roomIndex = 0;
    while (adultsLeft > 0) {
      if (occupancies[roomIndex].adults < 8) {
        occupancies[roomIndex].adults += 1;
        adultsLeft -= 1;
      }
      roomIndex = (roomIndex + 1) % rooms;
    }

    for (const age of childAges) {
      let assigned = false;
      for (let offset = 0; offset < rooms; offset++) {
        const idx = (roomIndex + offset) % rooms;
        if (occupancies[idx].children < 4) {
          occupancies[idx].children += 1;
          occupancies[idx].childrenAges.push(age);
          roomIndex = (idx + 1) % rooms;
          assigned = true;
          break;
        }
      }
      if (!assigned) {
        break;
      }
    }

    return occupancies;
  };

  const buildOccupanciesFromTravellers = (
    travellers: any[],
    fallbackRooms: number,
  ): Array<{ adults: number; children: number; childrenAges: number[] }> => {
    const rooms = Math.max(Number(fallbackRooms) || 1, 1);
    const byRoom = new Map<number, { adults: number; children: number; childrenAges: number[] }>();

    for (const t of Array.isArray(travellers) ? travellers : []) {
      const roomIdRaw = Number((t as any)?.room_id ?? (t as any)?.roomId ?? 1);
      const roomId = Number.isFinite(roomIdRaw) && roomIdRaw > 0 ? roomIdRaw : 1;
      const paxType = Number((t as any)?.traveller_type ?? (t as any)?.travellerType ?? 0);
      const age = Number((t as any)?.traveller_age ?? (t as any)?.travellerAge);

      if (!byRoom.has(roomId)) {
        byRoom.set(roomId, { adults: 0, children: 0, childrenAges: [] });
      }

      const occ = byRoom.get(roomId)!;
      if (paxType === 1) {
        occ.adults += 1;
      } else if (paxType === 2) {
        occ.children += 1;
        if (Number.isFinite(age) && age >= 0 && age <= 11) {
          occ.childrenAges.push(Math.trunc(age));
        }
      }
    }

    const maxRoomId = Math.max(rooms, ...Array.from(byRoom.keys()), 1);
    return Array.from({ length: maxRoomId }, (_, idx) => {
      const roomNo = idx + 1;
      const occ = byRoom.get(roomNo) || { adults: 0, children: 0, childrenAges: [] };
      return {
        adults: Math.max(occ.adults, 1),
        children: Math.max(occ.children, 0),
        childrenAges: occ.childrenAges.slice(0, occ.children),
      };
    });
  };

  const applyChildAgesToTemplate = (
    template: Array<{ adults: number; children: number; childrenAges: number[] }>,
    childAges: number[],
  ): Array<{ adults: number; children: number; childrenAges: number[] }> => {
    const agesPool = [...childAges];
    return template.map((occ) => {
      const ages: number[] = [];
      for (let i = 0; i < Math.max(occ.children, 0); i++) {
        const nextAge = agesPool.length > 0 ? Number(agesPool.shift()) : Number(occ.childrenAges?.[i]);
        ages.push(Number.isFinite(nextAge) && nextAge >= 0 && nextAge <= 11 ? Math.trunc(nextAge) : 7);
      }
      return {
        adults: Math.max(Number(occ.adults || 1), 1),
        children: Math.max(Number(occ.children || 0), 0),
        childrenAges: ages,
      };
    });
  };

  function buildOccupancyPreview(
    roomCount: number,
    totalAdults: number,
    totalChildren: number,
  ): Array<{ adults: number; children: number }> {
    const rooms = Math.max(Number(roomCount) || 1, 1);
    const occupancies = Array.from({ length: rooms }, () => ({
      adults: 1,
      children: 0,
    }));

    let adultsLeft = Math.max(totalAdults - rooms, 0);
    let roomIndex = 0;
    while (adultsLeft > 0) {
      if (occupancies[roomIndex].adults < 8) {
        occupancies[roomIndex].adults += 1;
        adultsLeft -= 1;
      }
      roomIndex = (roomIndex + 1) % rooms;
    }

    let childrenLeft = Math.max(totalChildren, 0);
    let nextChildRoom = 0;
    while (childrenLeft > 0) {
      let assigned = false;
      for (let offset = 0; offset < rooms; offset++) {
        const idx = (nextChildRoom + offset) % rooms;
        if (occupancies[idx].children < 4) {
          occupancies[idx].children += 1;
          childrenLeft -= 1;
          nextChildRoom = (idx + 1) % rooms;
          assigned = true;
          break;
        }
      }
      if (!assigned) {
        break;
      }
    }

    return occupancies;
  }

  const normalizeNameParts = (name: string) => {
    const trimmed = name.trim();
    const parts = trimmed.split(/\s+/).filter(Boolean);
    const firstName = parts[0] || trimmed;
    const lastName = parts.slice(1).join(' ') || firstName;
    return { firstName, lastName };
  };

  const validateNameParts = (name: string) => {
    const parts = normalizeNameParts(name);
    if (!isValidPassengerName(parts.firstName) || !isValidPassengerName(parts.lastName)) {
      return false;
    }
    return true;
  };

  const getSafeErrorMessage = (error: unknown, fallback: string) => {
    const text = String((error as any)?.message || fallback);
    if (/session expired|stale|availability changed|booking code invalid|price changed/i.test(text)) {
      return 'This hotel session has expired or rates changed. Please refresh hotel selection and run prebook again.';
    }
    return text;
  };

  const normalizePrebookItems = (value: any): string[] => {
    if (!value) {
      return [];
    }
    const list = Array.isArray(value) ? value : [value];
    return list
      .map((item) => {
        if (typeof item === 'string') {
          return item;
        }
        return item?.name || item?.text || item?.description || JSON.stringify(item);
      })
      .map((text) => String(text || '').trim())
      .filter(Boolean);
  };

  const resolvePrebookInclusions = (hotel: any): string[] => {
    const candidateLists = [
      hotel?.inclusions,
      hotel?.Inclusions,
      hotel?.inclusion,
      hotel?.Inclusion,
      hotel?.facilities,
      hotel?.Facilities,
      hotel?.rooms?.[0]?.inclusion,
      hotel?.rooms?.[0]?.Inclusion,
      hotel?.Rooms?.[0]?.inclusion,
      hotel?.Rooms?.[0]?.Inclusion,
    ];

    const merged = candidateLists.flatMap((value) => normalizePrebookItems(value));
    return Array.from(new Set(merged.map((item) => String(item || '').trim()).filter(Boolean)));
  };

  const resolvePrebookMealPlan = (hotel: any): string => {
    const direct = [
      hotel?.mealPlan,
      hotel?.MealPlan,
      hotel?.mealType,
      hotel?.MealType,
      hotel?.meal_type,
      hotel?.mealTypeName,
      hotel?.MealTypeName,
      hotel?.boardType,
      hotel?.BoardType,
      hotel?.boardBasis,
      hotel?.BoardBasis,
      hotel?.room?.mealType,
      hotel?.room?.MealType,
      hotel?.Room?.mealType,
      hotel?.Room?.MealType,
      hotel?.rooms?.[0]?.mealType,
      hotel?.rooms?.[0]?.MealType,
      hotel?.rooms?.[0]?.boardBasis,
      hotel?.Rooms?.[0]?.mealType,
      hotel?.Rooms?.[0]?.MealType,
      hotel?.Rooms?.[0]?.boardBasis,
    ];

    for (const value of direct) {
      const text = String(value || '').trim();
      if (text) {
        return text;
      }
    }

    const inclusionText = resolvePrebookInclusions(hotel).join(' ').toLowerCase();
    if (inclusionText.includes('full board')) return 'Full Board';
    if (inclusionText.includes('half board')) return 'Half Board';
    if (inclusionText.includes('room only') || inclusionText.includes('no meals')) return 'Room Only';
    if (inclusionText.includes('breakfast')) return 'Breakfast Included';

    return '';
  };

  const normalizeCancellationPolicyItems = (value: any): string[] => {
    if (!value) {
      return [];
    }

    const chargeLabel = (chargeType: string, amount: any) => {
      const normalizedType = String(chargeType || '').toLowerCase();
      const num = Number(amount);
      const safeAmount = Number.isFinite(num) ? num : amount;
      if (normalizedType === 'percentage' || normalizedType === '2') {
        return `${safeAmount}%`;
      }
      if (normalizedType === 'fixed' || normalizedType === '1') {
        return `INR ${safeAmount}`;
      }
      return String(safeAmount);
    };

    const formatEntry = (item: any) => {
      if (!item) return '';

      if (typeof item === 'string') {
        const trimmed = item.trim();
        if (!trimmed) return '';

        if ((trimmed.startsWith('{') && trimmed.endsWith('}')) || (trimmed.startsWith('[') && trimmed.endsWith(']'))) {
          try {
            const parsed = JSON.parse(trimmed);
            if (Array.isArray(parsed)) {
              return parsed
                .map((p) => formatEntry(p))
                .filter(Boolean)
                .join('\n');
            }
            return formatEntry(parsed);
          } catch {
            return trimmed;
          }
        }

        // Handle legacy TBO concatenated strings
        if (trimmed.includes('#^#') || trimmed.includes('#!#')) {
          return trimmed
            .replace(/#\^#|#!#/g, '')
            .split('|')
            .map((part) => part.trim())
            .filter(Boolean)
            .join('\n');
        }

        return trimmed;
      }

      const fromDate = item.FromDate || item.fromDate || item.startDate || '-';
      const chargeType = item.ChargeType || item.chargeType || '-';
      const cancellationCharge =
        item.CancellationCharge ?? item.cancellationCharge ?? item.Charge ?? item.charge ?? '-';

      return `From ${fromDate} | ${chargeType} | Charge: ${chargeLabel(chargeType, cancellationCharge)}`;
    };

    const list = Array.isArray(value) ? value : [value];
    return list
      .flatMap((item) => {
        const formatted = formatEntry(item);
        return formatted ? formatted.split('\n') : [];
      })
      .map((item) => item.trim())
      .filter(Boolean);
  };

  // Hotel voucher modal state
  const [hotelVoucherModalOpen, setHotelVoucherModalOpen] = useState(false);
  const [selectedHotelForVoucher, setSelectedHotelForVoucher] = useState<{
    routeId: number;
    hotelId: number;
    hotelName: string;
    hotelEmail: string;
    hotelStateCity: string;
    routeDates: string[];
    dayNumbers: number[];
    hotelDetailsIds: number[];
  } | null>(null);

  // Refresh hotel data after hotel update
  const refreshHotelData = useCallback(async () => {
    if (!quoteId) return;

    try {
      setLoadingHotels(true);
      console.log("🔄 [ItineraryDetails] Starting hotel data refresh for quoteId:", quoteId);
      const detailsRes = await ItineraryService.getDetails(quoteId);
      const details = detailsRes as ItineraryDetailsResponse;
      setItinerary(details);

      const pref = Number(details.itineraryPreference ?? 3);
      const useHotels = pref === 1 || pref === 3;

      if (useHotels) {
        const hotelRes = await fetchCompleteHotelDetails(quoteId);
        console.log("✅ [ItineraryDetails] Hotel data received:", { detailsRes, hotelRes });
        setHotelDetails(hotelRes as ItineraryHotelDetailsResponse);
      } else {
        setHotelDetails(null);
        setActiveHotelListTotal(0);
      }
      console.log("✅ [ItineraryDetails] State updated with new hotel data");
    } catch (e: any) {
      console.error("❌ [ItineraryDetails] Failed to refresh hotel data", e);
    } finally {
      setLoadingHotels(false);
    }
  }, [quoteId, fetchCompleteHotelDetails]);

  const refreshVehicleData = useCallback(async () => {
    if (!quoteId) return;

    try {
      const detailsRes = await ItineraryService.getDetails(quoteId);
      console.log("[REFRESH_VEHICLE_DATA_RESULT]", {
        vehicleCount: Array.isArray((detailsRes as any)?.vehicles) ? (detailsRes as any).vehicles.length : 0,
        vehicles: ((detailsRes as any)?.vehicles || []).map((v: any) => ({
          vehicleTypeName: v.vehicleTypeName,
          vendorEligibleId: v.vendorEligibleId,
          totals: v.dayWisePricing?.map((d: any) => d.totalKms),
          totalAmount: v.totalAmount,
        })),
      });
      setItinerary(detailsRes as ItineraryDetailsResponse);
    } catch (e: any) {
      console.error("Failed to refresh vehicle data", e);
    }
  }, [quoteId]);

  const fetchVehicleBuildStatus = useCallback(async (planId: number) => {
    try {
      const res = await ItineraryService.getVehicleBuildStatus(planId);
      setVehicleBuildStatus(res);
      return res;
    } catch (e: any) {
      console.error("Failed to fetch vehicle build status", e);
      return null;
    }
  }, []);

  const handleRetryVehicleBuild = useCallback(async () => {
    const planId = Number(itinerary?.planId || 0);
    if (!planId || isRetryingVehicleBuild) return;

    try {
      setIsRetryingVehicleBuild(true);
      const statusRes = await ItineraryService.triggerVehicleBuildAsync(planId);
      setVehicleBuildStatus(statusRes);
      toast.success("Vehicle build retriggered");
    } catch (e: any) {
      console.error("Failed to retrigger vehicle build", e);
      toast.error(e?.message || "Failed to retrigger vehicle build");
    } finally {
      setIsRetryingVehicleBuild(false);
    }
  }, [itinerary?.planId, isRetryingVehicleBuild]);

  useEffect(() => {
    setVehicleBuildStatus(null);
  }, [quoteId]);

  useEffect(() => {
    const planId = Number(itinerary?.planId || 0);
    if (!shouldShowVehicles || !planId) {
      return;
    }

    let disposed = false;
    let timerId: number | null = null;

    const poll = async () => {
      const statusRes = await fetchVehicleBuildStatus(planId);
      if (disposed || !statusRes) return;

      const state = String(statusRes.status || "").toUpperCase() as VehicleBuildState;
      if (state === "READY") {
        await refreshVehicleData();
        return;
      }

      if (state === "FAILED") {
        return;
      }

      if (state === "PENDING" || state === "PROCESSING") {
        timerId = window.setTimeout(poll, 3000);
      }
    };

    poll();

    return () => {
      disposed = true;
      if (timerId) window.clearTimeout(timerId);
    };
  }, [itinerary?.planId, shouldShowVehicles, fetchVehicleBuildStatus, refreshVehicleData]);

  const handleHotelGroupTypeChange = useCallback(async (groupType: number) => {
    if (!quoteId) return;

    console.log("Hotel group type changed to:", groupType);
    setActiveHotelGroupType(groupType);

    try {
      // Only refetch itinerary details with the selected group type to update costs
      // Hotel data (hotels, hotelTabs) does NOT change by group type, only cost breakdown
      const detailsRes = await ItineraryService.getDetails(quoteId, groupType);
      setItinerary((prev) => {
        const next = detailsRes as ItineraryDetailsResponse;
        const pref = Number(next.itineraryPreference ?? 0);
        const shouldKeepVehicleState =
          (pref === 2 || pref === 3) &&
          (!Array.isArray(next.vehicles) || next.vehicles.length === 0) &&
          Array.isArray(prev?.vehicles) &&
          prev.vehicles.length > 0;

        if (!shouldKeepVehicleState) {
          return next;
        }

        // Some groupType responses return hotel-cost updates without vehicle rows.
        // Keep the last known vehicle list so vehicle UI does not disappear.
        return {
          ...next,
          vehicles: prev!.vehicles,
        };
      });
    } catch (e: any) {
      console.error("Failed to update data for group type change", e);
    }
  }, [quoteId]);

  const handleGetSaveFunction = useCallback((saveFn: () => Promise<boolean>) => {
    hotelSaveFunctionRef.current = saveFn;
  }, []);

  const handleCreateVoucher = useCallback((hotelData: {
    routeId: number;
    hotelId: number;
    hotelName: string;
    hotelEmail: string;
    hotelStateCity: string;
    routeDates: string[];
    dayNumbers: number[];
    hotelDetailsIds: number[];
  }) => {
    setSelectedHotelForVoucher(hotelData);
    setHotelVoucherModalOpen(true);
  }, []);

  const handleCancelVoucherItems = useCallback(async (items: Array<{
    routeId: number;
    hotelId: number;
    hotelName: string;
    hotelEmail: string;
    hotelStateCity: string;
    routeDates: string[];
    dayNumbers: number[];
    hotelDetailsIds: number[];
  }>) => {
    const itineraryPlanId = Number(itinerary?.planId || 0);
    if (!itineraryPlanId) {
      toast.error('Unable to resolve itinerary plan ID for hotel cancellation');
      return;
    }

    const validItems = Array.isArray(items) ? items : [];
    if (validItems.length === 0) {
      toast.error('No hotels selected for cancellation');
      return;
    }

    const reason = window.prompt('Enter cancellation reason')?.trim() || '';
    if (!reason) {
      toast.error('Cancellation reason is required');
      return;
    }

    try {
      const routeIds = Array.from(
        new Set(validItems.map((i) => Number(i.routeId)).filter((id) => Number.isFinite(id) && id > 0)),
      );
      const hotelDetailsIds = Array.from(
        new Set(
          validItems
            .flatMap((i) => i.hotelDetailsIds || [])
            .map((id) => Number(id))
            .filter((id) => Number.isFinite(id) && id > 0),
        ),
      );

      await HotelVoucherService.cancelHotelVouchers({
        itineraryPlanId,
        reason,
        routeIds,
        hotelDetailsIds,
      });

      toast.success(
        validItems.length > 1
          ? `Cancelled ${validItems.length} hotel voucher(s)`
          : 'Hotel voucher cancelled successfully',
      );
      await refreshHotelData();
    } catch (error: any) {
      console.error('Failed to cancel hotel vouchers', error);
      toast.error(error?.message || 'Failed to cancel hotel voucher(s)');
    }
  }, [itinerary?.planId, refreshHotelData]);

  const handleCancelVoucherSingle = useCallback(async (item: {
    routeId: number;
    hotelId: number;
    hotelName: string;
    hotelEmail: string;
    hotelStateCity: string;
    routeDates: string[];
    dayNumbers: number[];
    hotelDetailsIds: number[];
  }) => {
    await handleCancelVoucherItems([item]);
  }, [handleCancelVoucherItems]);

  const handleHotelSelectionsChange = useCallback((selections: Record<number, {
    provider: string;
    hotelCode: string;
    bookingCode: string;
    roomType: string;
    netAmount: number;
    hotelName: string;
    checkInDate: string;
    checkOutDate: string;
    groupType: number;
  }>) => {
    // Merge route-wise selection updates so changing one day never resets other days.
    setSelectedHotelBookings((prev) => {
      const next: Record<number, any> = { ...prev };

      Object.entries(selections).forEach(([routeIdRaw, value]) => {
        const routeIdNum = Number(routeIdRaw);
        next[routeIdNum] = {
          ...(next[routeIdNum] || {}),
          ...value,
        };
      });

      return next;
    });
    console.log('🏨 Hotel selections updated from HotelList:', selections);
  }, []);

  const handleVehicleSelectedTotalChange = useCallback((payload: {
    vehicleTypeId: number;
    totalAmount: number;
    totalQty: number;
  }) => {
    const key = Number(payload.vehicleTypeId || 0);
    const nextAmount = Number(payload.totalAmount || 0);
    const nextQty = Number(payload.totalQty || 0);

    setSelectedVehicleTotalsByType((prev) => {
      const existing = prev[key];
      if (existing && existing.totalAmount === nextAmount && existing.totalQty === nextQty) {
        return prev;
      }

      return {
        ...prev,
        [key]: {
          totalAmount: nextAmount,
          totalQty: nextQty,
        },
      };
    });
  }, []);

  const shouldShowRebuildHotelsButton = useMemo(() => {
    if (!hotelDetails?.hotels?.length) return false;
    if (hotelDetails.hotelAvailability?.isPlaceholderOnly) return true;
    return hotelDetails.hotels.every((h) => h.hotelName === 'No Hotels Available');
  }, [hotelDetails]);

  const handleRebuildHotels = useCallback(async () => {
    if (!quoteId || isRebuildingHotels) return;

    try {
      setIsRebuildingHotels(true);
      setLoadingHotels(true);
      toast.info('Rebuilding hotels...');

      const [detailsRes] = await Promise.all([
        ItineraryService.getDetails(quoteId),
        ItineraryService.rebuildHotelDetails(quoteId, 1, 20, activeHotelGroupType || undefined),
      ]);

      setItinerary(detailsRes as ItineraryDetailsResponse);
      const completeHotelRes = await fetchCompleteHotelDetails(quoteId);
      setHotelDetails(completeHotelRes as ItineraryHotelDetailsResponse);
      toast.success('Hotels rebuilt successfully');
    } catch (e: any) {
      toast.error(e?.message || 'Failed to rebuild hotels');
    } finally {
      setLoadingHotels(false);
      setIsRebuildingHotels(false);
    }
  }, [quoteId, isRebuildingHotels, activeHotelGroupType, fetchCompleteHotelDetails]);

  useEffect(() => {
    if (!quoteId) {
      setError("Missing quote id in URL");
      setLoading(false);
      return;
    }

    // Prevent wrong API call when this component is opened on confirmed route
    if (location.pathname.startsWith("/confirmed-itinerary/")) {
      console.warn(
        "⚠️ ItineraryDetails mounted on confirmed itinerary route. Skipping getDetails() call.",
        { quoteId, pathname: location.pathname }
      );
      setLoading(false);
      return;
    }

    // If we're already fetching this quoteId, skip duplicate fetch
    if (currentFetchRef.current === quoteId) {
      console.log("🔄 [ItineraryDetails] Already fetching quoteId:", quoteId, "- skipping duplicate");
      return;
    }

    // Mark that we're fetching this quoteId
    currentFetchRef.current = quoteId;
    isMountedRef.current = true;

    const fetchDetails = async () => {
      try {
        console.log("🌐 [ItineraryDetails] FETCHING initial details for quoteId:", quoteId);
        setLoading(true);
        setLoadingHotels(true);
        setError(null);

        // Fetch details first so we can skip hotel API for vehicle-only itineraries.
        const detailsRes = await getDetailsDeduped(quoteId);
        const details = detailsRes as ItineraryDetailsResponse;
        const pref = Number(details.itineraryPreference ?? 3);
        const useHotels = pref === 1 || pref === 3;

        let hotelRes: ItineraryHotelDetailsResponse | null = null;
        if (useHotels) {
          hotelRes = await fetchCompleteHotelDetails(quoteId);
        }

        // Only update state if component is still mounted
        if (!isMountedRef.current) {
          console.log("🔄 [ItineraryDetails] Component unmounted, skipping state update");
          return;
        }

        console.log("✅ [ItineraryDetails] Initial fetch completed successfully");
        setItinerary(details);
        setHotelDetails(hotelRes as ItineraryHotelDetailsResponse | null);
        if (!useHotels) {
          setActiveHotelListTotal(0);
        }
      } catch (e: any) {
        // Only update state if component is still mounted
        if (!isMountedRef.current) return;

        console.error("❌ [ItineraryDetails] Failed to load itinerary details", e);
        setError(e?.message || "Failed to load itinerary details");
        setItinerary(null);
        setHotelDetails(null);
      } finally {
        // Only update state if component is still mounted
        if (isMountedRef.current) {
          setLoading(false);
          setLoadingHotels(false);
        }
      }
    };

    fetchDetails();

    // Cleanup: Mark component as unmounted
    return () => {
      isMountedRef.current = false;
    };
  }, [quoteId, location.pathname, fetchCompleteHotelDetails]);

  /**
   * ⚡ Lazy-load hotel details when needed (e.g., when user opens hotel selection)
   * This prevents the initial page load from making the unnecessary second API call
   */
  const ensureHotelDetailsLoaded = async () => {
    if (hotelDetails) {
      // Already loaded
      return hotelDetails;
    }

    if (!quoteId) return null;

    try {
      setLoadingHotels(true);
      let hotelRes;

      // If confirmed itinerary is available, fetch from confirmed endpoint
      if (itinerary?.confirmed_itinerary_plan_ID) {
        hotelRes = await ItineraryService.getConfirmedItinerary(itinerary.confirmed_itinerary_plan_ID);
      } else {
        // Fallback to hotel details endpoint
        hotelRes = await fetchCompleteHotelDetails(quoteId);
      }

      setHotelDetails(hotelRes as ItineraryHotelDetailsResponse);
      return hotelRes;
    } catch (error: any) {
      console.error("Failed to load hotel details", error);
      toast.error("Failed to load hotel details");
      return null;
    } finally {
      setLoadingHotels(false);
    }
  };

  const handleDeleteHotspot = async () => {
    if (!deleteHotspotModal.planId || !deleteHotspotModal.routeId || !deleteHotspotModal.hotspotId) {
      return;
    }

    setIsDeleting(true);
    try {
      const deletedHotspotId = Number(deleteHotspotModal.hotspotId);
      const deletedRouteId = Number(deleteHotspotModal.routeId);

      await ItineraryService.deleteHotspot(
        deleteHotspotModal.planId,
        deleteHotspotModal.routeId,
        deleteHotspotModal.hotspotId
      );

      toast.success("Hotspot deleted successfully");

      // Update local state immediately before reload
      // Remove from modal added set
      setAddedInModalHotspotIds((prev) => {
        const next = new Set(prev);
        next.delete(deletedHotspotId);
        return next;
      });

      // Add to excluded set
      setExcludedHotspotIds((prev) =>
        Array.from(new Set([...prev.map(Number), deletedHotspotId]))
      );

      // Update itinerary to remove deleted attraction segment
      setItinerary((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          days: prev.days.map((day) => {
            if (Number(day.id) !== deletedRouteId) return day;
            return {
              ...day,
              segments: day.segments.filter((seg: any) => {
                if (String(seg?.type || '').toLowerCase() !== 'attraction') return true;
                const segHotspotId = Number(seg?.hotspotId ?? seg?.locationId ?? 0);
                return segHotspotId !== deletedHotspotId;
              }),
            };
          }),
        };
      });

      // Also immediately update availableHotspots if modal is already open
      setAvailableHotspots((prev) =>
        prev.map((row) =>
          Number(row.id) === deletedHotspotId
            ? {
                ...row,
                alreadyAdded: false,
                availabilityStatus: 'EXCLUDED_BY_ROUTE',
                actionDisabled: false,
                buttonLabel: 'Preview',
              }
            : row
        )
      );

      // Close modal
      setDeleteHotspotModal({
        open: false,
        planId: null,
        routeId: null,
        hotspotId: null,
        hotspotName: "",
        hotspotWasPrebuilt: false,
      });

      // Show rebuild button only when a prebuilt hotspot was deleted.
      if (deleteHotspotModal.hotspotWasPrebuilt && deleteHotspotModal.routeId) {
        setRouteNeedsRebuild(deleteHotspotModal.routeId);
      }

      // Reload itinerary data
      if (quoteId) {
        const [detailsRes, hotelRes] = await Promise.all([
          ItineraryService.getDetails(quoteId),
          shouldShowHotels ? ItineraryService.getHotelDetails(quoteId) : Promise.resolve(null),
        ]);
        setItinerary(detailsRes as ItineraryDetailsResponse);
        setHotelDetails(hotelRes as ItineraryHotelDetailsResponse);
      }
    } catch (e: any) {
      console.error("Failed to delete hotspot", e);
      toast.error(e?.message || "Failed to delete hotspot");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleRebuildRoute = async (planId: number, routeId: number) => {
    setIsRebuilding(true);
    try {
      await ItineraryService.rebuildRoute(planId, routeId);
      toast.success("Route rebuilt successfully");

      // Clear rebuild flag
      setRouteNeedsRebuild(null);

      // Reload itinerary data
      if (quoteId) {
        const [detailsRes, hotelRes] = await Promise.all([
          ItineraryService.getDetails(quoteId),
          shouldShowHotels ? ItineraryService.getHotelDetails(quoteId) : Promise.resolve(null),
        ]);
        setItinerary(detailsRes as ItineraryDetailsResponse);
        setHotelDetails(hotelRes as ItineraryHotelDetailsResponse);
      }
    } catch (e: any) {
      console.error("Failed to rebuild route", e);
      toast.error(e?.message || "Failed to rebuild route");
    } finally {
      setIsRebuilding(false);
    }
  };

  const dayHasManualInserts = (day: any): boolean => {
    const segments = Array.isArray(day?.segments) ? day.segments : [];
    return segments.some((seg: any) => (
      String(seg?.type || '').toLowerCase() === 'attraction'
      && (seg?.planOwnWay === true || seg?.isManual === true)
    ));
  };

  const applyRouteTimePatch = async (
    planId: number,
    routeId: number,
    dayNumber: number,
    startTimeHms: string,
    endTimeHms: string,
    options?: {
      previousDayBillingDecisionProvided?: boolean;
      previousDayBillingConfirmed?: boolean;
    },
  ) => {
    setIsApplyingRouteTimeUpdate(true);
    const estimatedMs = getRouteTimeUpdateEstimateMs(dayNumber);
    setRouteTimeEstimatedMs(estimatedMs);
    startRouteTimeProgress(estimatedMs);

    try {
      await ItineraryService.updateRouteTimes(planId, routeId, startTimeHms, endTimeHms, options);

      if (quoteId) {
        const [detailsRes, hotelRes] = await Promise.all([
          ItineraryService.getDetails(quoteId),
          shouldShowHotels ? ItineraryService.getHotelDetails(quoteId) : Promise.resolve(null),
        ]);
        setItinerary(detailsRes as ItineraryDetailsResponse);
        setHotelDetails(hotelRes as ItineraryHotelDetailsResponse);
      }

      setRouteTimeProgressPercent(100);
      setPendingScrollDayNumber(dayNumber);

      toast.success(`Day ${dayNumber} times updated`);
    } catch (e: any) {
      console.error('Failed to update route times', e);
      toast.error(e?.message || 'Failed to update route times');
    } finally {
      stopRouteTimeProgress();
      setIsApplyingRouteTimeUpdate(false);
    }
  };

  const buildArrivalPolicyDecisionKey = (
    routeId?: number,
    routeDate?: string,
    startTimeHms?: string,
  ) => {
    const normalizedRouteId = Number(routeId || 0);
    const normalizedRouteDate = normalizeDateToYmd(routeDate);
    const normalizedStartTime = String(startTimeHms || '').trim();

    if (!normalizedRouteId || !normalizedRouteDate || !normalizedStartTime) {
      return null;
    }

    return `${normalizedRouteId}|${normalizedRouteDate}|${normalizedStartTime}`;
  };

  const getRequestArrivalPolicyDecisionKey = (request: HotelArrivalPolicyRequest | null) => {
    if (!request) {
      return null;
    }

    const arrivalTimeHms = (() => {
      if (request.arrivalDateTime && request.arrivalDateTime.includes('T')) {
        return request.arrivalDateTime.split('T')[1]?.slice(0, 8) || '';
      }

      const routeDay = itinerary?.days?.find(
        (day) => Number(day.id) === Number(request.itineraryRouteId),
      );
      return parseDisplayTimeToHms(routeDay?.startTime || '');
    })();

    return buildArrivalPolicyDecisionKey(
      request.itineraryRouteId,
      request.routeDate,
      arrivalTimeHms,
    );
  };

  const handleUpdateRouteTimesDirect = async (
    planId: number,
    routeId: number,
    dayNumber: number,
    startTimeDisplay: string,
    endTimeDisplay: string
  ) => {
    const startTimeHms = parseDisplayTimeToHms(startTimeDisplay);
    const endTimeHms = parseDisplayTimeToHms(endTimeDisplay);
    const routeDay =
      itinerary?.days?.find((d) => Number(d.id) === Number(routeId)) ||
      itinerary?.days?.find((d) => Number(d.dayNumber) === Number(dayNumber));
    const currentStartTimeHms = parseDisplayTimeToHms(routeDay?.startTime || '');
    const currentEndTimeHms = parseDisplayTimeToHms(routeDay?.endTime || '');
    const hasTimeChanged =
      startTimeHms !== currentStartTimeHms ||
      endTimeHms !== currentEndTimeHms;

    console.log(`Updating route times: planId=${planId}, routeId=${routeId}, day=${dayNumber}, start=${startTimeHms}, end=${endTimeHms}`);

    if (!hasTimeChanged) {
      return;
    }

    // Day 1 early-morning gate: 01:00–07:59 requires previous-day hotel confirmation
    if (dayNumber === 1 && isEarlyMorningTime(startTimeHms)) {
      const resolvedRouteDay =
        routeDay ||
        itinerary?.days?.find((d) => Number(d.dayNumber) === 1) ||
        itinerary?.days?.[0];
      const routeDateYmd = normalizeDateToYmd(resolvedRouteDay?.date);
      const request: HotelArrivalPolicyRequest = {
        itineraryPlanId: planId,
        itineraryRouteId: routeId,
        routeDayNumber: 1,
        routeDate: routeDateYmd,
        arrivalDateTime: routeDateYmd ? `${routeDateYmd}T${startTimeHms}` : undefined,
        arrivalCityName: resolvedRouteDay?.departure || '',
        routeSourceCityName: resolvedRouteDay?.departure || '',
        nightStayCityName: resolvedRouteDay?.arrival || '',
        previousDayBillingDecisionProvided: false,
        previousDayBillingConfirmed: false,
      };

      setIsResolvingArrivalPolicy(true);
      try {
        const policy = await ItineraryService.resolveHotelArrivalPolicy(request);
        if (policy.requiresPreviousDayBillingConfirmation) {
          // Store pending update and show the confirmation modal
          setPendingRouteTimeUpdate({ planId, routeId, dayNumber, startTimeHms, endTimeHms });
          const safeRouteDate = normalizeDateToYmd(request.routeDate) || new Date().toISOString().split('T')[0];
          const routeDate = new Date(`${safeRouteDate}T00:00:00`);
          const previousDay = new Date(routeDate);
          previousDay.setDate(previousDay.getDate() - 1);
          const fmt = (d: Date) =>
            `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
          setArrivalPolicyConfirmModal({
            open: true,
            arrivalDate: fmt(routeDate),
            previousDayDate: fmt(previousDay),
            request,
          });
          return;
        }
        // Policy resolved without needing confirmation – fall through to PATCH
      } catch (e: any) {
        toast.error(e?.message || 'Failed to resolve arrival policy');
        return;
      } finally {
        setIsResolvingArrivalPolicy(false);
      }
    }

    await applyRouteTimePatch(planId, routeId, dayNumber, startTimeHms, endTimeHms);
  };

  const persistArrivalPolicyDecision = async (
    request: HotelArrivalPolicyRequest,
    confirmed: boolean,
  ): Promise<boolean> => {
    try {
      const routeDay =
        itinerary?.days?.find((d) => Number(d.id) === Number(request.itineraryRouteId)) ||
        itinerary?.days?.find((d) => Number(d.dayNumber) === Number(request.routeDayNumber || 1));

      if (!routeDay?.startTime || !routeDay?.endTime) {
        return false;
      }

      const startTimeHms = parseDisplayTimeToHms(routeDay.startTime);
      const endTimeHms = parseDisplayTimeToHms(routeDay.endTime);

      await applyRouteTimePatch(
        request.itineraryPlanId,
        request.itineraryRouteId,
        routeDay.dayNumber || request.routeDayNumber || 1,
        startTimeHms,
        endTimeHms,
        {
          previousDayBillingDecisionProvided: true,
          previousDayBillingConfirmed: confirmed,
        },
      );

      return true;
    } catch (e) {
      console.error('Failed to persist arrival policy decision', e);
      return false;
    }
  };

  const openDeleteHotspotModal = (
    planId: number,
    routeId: number,
    hotspotId: number,
    hotspotName: string,
    isManualHotspot: boolean = false,
  ) => {
    setDeleteHotspotModal({
      open: true,
      planId,
      routeId,
      hotspotId,
      hotspotName,
      hotspotWasPrebuilt: !isManualHotspot,
    });
  };

  const openAddActivityModal = async (
    planId: number,
    routeId: number,
    routeHotspotId: number,
    hotspotId: number,
    hotspotName: string
  ) => {
    setAddActivityModal({
      open: true,
      planId,
      routeId,
      routeHotspotId,
      hotspotId,
      hotspotName,
    });

    // Reset stale preview state whenever modal opens for a hotspot.
    setActivityPreview(null);
    setPreviewingActivityId(null);

    // Fetch available activities
    setLoadingActivities(true);
    try {
      const activities = await ItineraryService.getAvailableActivities(hotspotId);
      setAvailableActivities(activities as AvailableActivity[]);
    } catch (e: any) {
      console.error("Failed to load activities", e);
      toast.error(e?.message || "Failed to load activities");
      setAvailableActivities([]);
    } finally {
      setLoadingActivities(false);
    }
  };

  const handleAddActivity = async (activityId: number, amount: number) => {
    if (!addActivityModal.planId || !addActivityModal.routeId || !addActivityModal.routeHotspotId || !addActivityModal.hotspotId) {
      return;
    }

    // Check for conflicts in preview
    let shouldSkipConflictCheck = false;
    if (activityPreview?.hasConflicts && activityPreview.activity?.id === activityId) {
      const conflictMessages = activityPreview.conflicts
        .map((c: any) => c.reason)
        .join('\n\n');

      const confirm = window.confirm(
        `TIMING CONFLICTS DETECTED:\n\n${conflictMessages}\n\nDo you want to add this activity anyway?`
      );

      if (!confirm) return;
      shouldSkipConflictCheck = true; // User confirmed override
    }

    setIsAddingActivity(true);
    try {
      const payload: any = {
        planId: addActivityModal.planId,
        routeId: addActivityModal.routeId,
        routeHotspotId: addActivityModal.routeHotspotId,
        hotspotId: addActivityModal.hotspotId,
        activityId,
        amount,
      };

      // Only add skipConflictCheck if user confirmed conflict override
      if (shouldSkipConflictCheck) {
        payload.skipConflictCheck = true;
      }

      await ItineraryService.addActivity(payload);

      toast.success("Activity added successfully");

      // Close modal
      setAddActivityModal({
        open: false,
        planId: null,
        routeId: null,
        routeHotspotId: null,
        hotspotId: null,
        hotspotName: "",
      });
      setActivityPreview(null);
      setPreviewingActivityId(null);

      // Reload itinerary — always, independently of hotel reload
      if (quoteId) {
        try {
          const detailsRes = await ItineraryService.getDetails(quoteId);
          setItinerary(detailsRes as ItineraryDetailsResponse);
        } catch (reloadErr) {
          console.error("Failed to reload itinerary after add", reloadErr);
        }
        try {
          if (shouldShowHotels) {
            const hotelRes = await ItineraryService.getHotelDetails(quoteId);
            setHotelDetails(hotelRes as ItineraryHotelDetailsResponse);
          } else {
            setHotelDetails(null);
            setActiveHotelListTotal(0);
          }
        } catch {
          // Non-critical
        }
      }
    } catch (e: any) {
      console.error("Failed to add activity", e);
      toast.error(e?.message || "Failed to add activity");
    } finally {
      setIsAddingActivity(false);
    }
  };

  const formatPreviewTime = (value: string | Date | null | undefined) => {
    if (!value) return 'N/A';

    const d = new Date(value as any);
    if (Number.isNaN(d.getTime())) return String(value);

    const hours = d.getUTCHours();
    const minutes = d.getUTCMinutes().toString().padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const h12 = hours % 12 || 12;
    return `${h12}:${minutes} ${ampm}`;
  };

  const formatActivityDuration = (value: string | null | undefined) => {
    if (!value) return 'Not specified';

    const match = String(value).match(/(?:T)?(\d{2}):(\d{2})(?::(\d{2}))?/);
    if (!match) return String(value);

    const hours = Number(match[1] || 0);
    const minutes = Number(match[2] || 0);
    const parts: string[] = [];

    if (hours > 0) {
      parts.push(`${hours} Hour${hours === 1 ? '' : 's'}`);
    }

    if (minutes > 0) {
      parts.push(`${minutes} Min`);
    }

    return parts.length > 0 ? parts.join(' ') : '0 Min';
  };

  const handlePreviewActivity = async (activityId: number) => {
    if (!addActivityModal.planId || !addActivityModal.routeId ||
      !addActivityModal.routeHotspotId || !addActivityModal.hotspotId) {
      return;
    }

    setPreviewingActivityId(activityId);
    try {
      const preview = await ItineraryService.previewActivityAddition({
        planId: addActivityModal.planId,
        routeId: addActivityModal.routeId,
        routeHotspotId: addActivityModal.routeHotspotId,
        hotspotId: addActivityModal.hotspotId,
        activityId,
      });

      setActivityPreview(preview);
    } catch (e: any) {
      console.error("Failed to preview activity", e);
      toast.error(e?.message || "Failed to preview activity");
      setActivityPreview(null);
    } finally {
      setPreviewingActivityId(null);
    }
  };

  const handleOpenPreviewAllHotspots = async (activityId: number) => {
    if (!addActivityModal.planId || !addActivityModal.routeId) {
      return;
    }

    setAllHotspotsPreviewModal(prev => ({
      ...prev,
      loading: true,
      open: true,
      planId: addActivityModal.planId,
      routeId: addActivityModal.routeId,
      activityId: activityId,
    }));

    try {
      const preview = await ItineraryService.previewActivityForAllHotspots({
        planId: addActivityModal.planId,
        routeId: addActivityModal.routeId,
        activityId,
      });

      setAllHotspotsPreviewModal(prev => ({
        ...prev,
        loading: false,
        data: preview,
      }));
    } catch (e: any) {
      console.error("Failed to preview activity for all hotspots", e);
      toast.error(e?.message || "Failed to preview activity");
      setAllHotspotsPreviewModal(prev => ({
        ...prev,
        loading: false,
        open: false,
      }));
    }
  };

  const handleDeleteActivity = async () => {
    if (!deleteActivityModal.planId || !deleteActivityModal.routeId || !deleteActivityModal.activityId) {
      return;
    }

    setIsDeletingActivity(true);
    try {
      await ItineraryService.deleteActivity(
        deleteActivityModal.planId,
        deleteActivityModal.routeId,
        deleteActivityModal.activityId
      );

      toast.success("Activity deleted successfully");

      // Close modal
      setDeleteActivityModal({
        open: false,
        planId: null,
        routeId: null,
        activityId: null,
        activityName: "",
      });

      // Reload itinerary — always, independently of hotel reload
      if (quoteId) {
        try {
          const detailsRes = await ItineraryService.getDetails(quoteId);
          setItinerary(detailsRes as ItineraryDetailsResponse);
        } catch (reloadErr) {
          console.error("Failed to reload itinerary after delete", reloadErr);
        }
        // Hotel reload is best-effort and must not block the itinerary refresh
        try {
          if (shouldShowHotels) {
            const hotelRes = await ItineraryService.getHotelDetails(quoteId);
            setHotelDetails(hotelRes as ItineraryHotelDetailsResponse);
          } else {
            setHotelDetails(null);
            setActiveHotelListTotal(0);
          }
        } catch {
          // Non-critical — silence hotel reload errors
        }
      }
    } catch (e: any) {
      console.error("Failed to delete activity", e);
      toast.error(e?.message || "Failed to delete activity");
    } finally {
      setIsDeletingActivity(false);
    }
  };

  const openDeleteActivityModal = (
    planId: number,
    routeId: number,
    activityId: number,
    activityName: string
  ) => {
    setDeleteActivityModal({
      open: true,
      planId,
      routeId,
      activityId,
      activityName,
    });
  };


  const handleAddGuideClick = (day: ItineraryDay) => {
  if (readOnly) {
    toast.error("Guide cannot be added in read-only mode");
    return;
  }

  navigate("/guide", {
    state: {
      fromItinerary: true,
      quoteId,
      planId: itinerary?.planId || 0,
      routeId: day.id,
      dayNumber: day.dayNumber,
      date: day.date,
      departure: day.departure,
      arrival: day.arrival,
    },
  });
};

  const openAddHotspotModal = async (
    planId: number,
    routeId: number,
    locationId: number,
    locationName: string,
    anchor?: HotspotAnchor | null,
  ) => {
    previewRequestIdRef.current += 1;
    setAddHotspotModal({
      open: true,
      planId,
      routeId,
      locationId,
      locationName,
    });
    resetManualHotspotPreviewState();
    setActivePreviewHotspotId(null);
    setAddedInModalHotspotIds(new Set());
    setSelectedHotspotAnchor(anchor || null);

    // Fetch available hotspots for this location
    setLoadingHotspots(true);
    try {
      // Calculate route excluded IDs and active IDs BEFORE fetching, to avoid stale state
      const currentRoute = itinerary?.days.find((d) => Number(d.id) === Number(routeId));

      const routeExcludedIds: number[] = Array.isArray((currentRoute as any)?.excluded_hotspot_ids)
        ? (currentRoute as any).excluded_hotspot_ids.map(Number)
        : [];

      const routeActiveIds = new Set<number>(
        (Array.isArray((currentRoute as any)?.segments) ? (currentRoute as any).segments : [])
          .filter((seg: any) => String(seg?.type || '').toLowerCase() === 'attraction')
          .filter((seg: any) => {
            const deletedLike =
              seg?.isDeleted === true ||
              seg?.deleted === true ||
              seg?.isExcluded === true ||
              seg?.excluded === true ||
              seg?.removed === true ||
              seg?.deletedAt != null ||
              seg?.deleted_at != null ||
              String(seg?.status || '').toLowerCase() === 'deleted' ||
              String(seg?.status || '').toLowerCase() === 'excluded';
            return !deletedLike;
          })
          .map((seg: any) => Number(seg?.hotspotId ?? seg?.locationId ?? 0))
          .filter((id: number) => Number.isFinite(id) && id > 0)
      );

      setExcludedHotspotIds(routeExcludedIds);

      const hotspotResponse = anchor
        ? await ItineraryService.getAvailableHotspotsForAnchor({
            planId,
            routeId,
            anchorType: anchor.anchorType,
            anchorIndex: Number(anchor.anchorIndex),
          })
        : await ItineraryService.getAvailableHotspots(routeId);

      const hotspots = Array.isArray(hotspotResponse)
        ? hotspotResponse
        : (Array.isArray((hotspotResponse as any)?.hotspots)
          ? (hotspotResponse as any).hotspots
          : []);
      const responseFilterMeta = Array.isArray(hotspotResponse)
        ? null
        : ((hotspotResponse as any)?.hotspotFilterMeta || null);

      setHotspotFilterMeta(responseFilterMeta);
      console.log('[AddHotspotModal] hotspot_filter_meta', responseFilterMeta);

      setAvailableHotspots(
        normalizeAvailableHotspots(hotspots as AvailableHotspot[], {
          routeId,
          excludedIds: routeExcludedIds,
          activeIds: routeActiveIds,
        })
      );

      if (currentRoute) {

        const existingManualHotspotIds: number[] = Array.from(
          new Set(
            (Array.isArray((currentRoute as any).segments) ? (currentRoute as any).segments : [])
              .filter((seg: any) => String(seg?.type || '').toLowerCase() === 'attraction')
              .filter((seg: any) => seg?.planOwnWay === true || seg?.isManual === true)
              .map((seg: any) => Number(seg?.hotspotId ?? seg?.locationId ?? 0))
              .filter((id: number): id is number => Number.isFinite(id) && id > 0),
          ),
        );

        if (existingManualHotspotIds.length > 0) {
          // Existing manual hotspots should appear as already added on the left list,
          // but must not become preselected preview candidates in sequential mode.
          setSelectedHotspotIds([]);
        }
      }
    } catch (e: any) {
      console.error("Failed to fetch available hotspots", e);
      toast.error(e?.message || "Failed to load available hotspots");
    } finally {
      setLoadingHotspots(false);
    }
  };

  const handlePreviewHotspot = async (
    hotspotId: number,
    options?: {
      planId?: number;
      routeId?: number;
      anchor?: HotspotAnchor;
      allowTopPriorityRemoval?: boolean;
      selectedHotspotIds?: number[];
      forceRefresh?: boolean;
      source?: 'AFTER_MATRIX_BUILD' | 'USER_REFRESH';
    },
  ) => {
    const pId = options?.planId || addHotspotModal.planId;
    const rId = options?.routeId || addHotspotModal.routeId;
    const anchor = options?.anchor || selectedHotspotAnchor || undefined;
    if (!pId || !rId) return;

    const requestId = ++previewRequestIdRef.current;
    resetManualHotspotPreviewState();
    setActivePreviewHotspotId(hotspotId);
    setSelectedHotspotIds([hotspotId]);
    setTopPriorityReplacementApproved(false);
    setIsPreviewingHotspotId(hotspotId);

    // Don't force scroll list to top here, let the user stay where they clicked
    if (timelinePreviewRef.current) {
      timelinePreviewRef.current.scrollTop = 0;
    }

    try {
      const preview = await ItineraryService.previewAddHotspot(
        pId,
        rId,
        hotspotId,
        anchor
          ? {
            anchorType: anchor.anchorType,
            anchorIndex: anchor.anchorIndex,
          }
          : undefined,
        {
          allowTopPriorityRemoval: options?.allowTopPriorityRemoval === true,
          selectedHotspotIds: [hotspotId],
        },
      );

      if (requestId !== previewRequestIdRef.current) {
        return;
      }

      const fullTimeline = Array.isArray(preview?.fullTimeline) ? [...preview.fullTimeline] : [];
      console.log('[ManualHotspotModal] received_timeline', {
        hotspotId: Number(hotspotId),
        segments: fullTimeline.length,
        hasPreviewOrder: fullTimeline.some((seg: any) => Number.isFinite(Number(seg?.matrixPreviewOrder ?? seg?.previewOrder))),
      });

      // The backend returns { newHotspot, otherConflicts, fullTimeline, allInsertionSlots }.
      const previewResolution = {
        ...(preview?.resolution || {}),
        anchorPreference: preview?.anchorPreference || null,
        newHotspot: preview?.newHotspot || null,
        allInsertionSlots: preview?.allInsertionSlots || [],
        slotInsights: preview?.resolution?.slotInsights || [],
      };
      setManualPreviewState({
        ...preview,
        fullTimeline,
        manualInsertionFit:
          preview?.manualInsertionFit
          || previewResolution?.manualInsertionFit
          || preview?.resolution?.manualInsertionFit
          || null,
      });
      setPreviewTimelinesByHotspot((prev) => ({
        ...prev,
        [hotspotId]: fullTimeline,
      }));
      setPreviewResolutionsByHotspot((prev) => ({
        ...prev,
        [hotspotId]: previewResolution,
      }));
      setGroupPreviewResolution(previewResolution);
      if (options?.allowTopPriorityRemoval === true) {
        setForceReplacementApprovedByHotspot((prev) => ({
          ...prev,
          [hotspotId]: true,
        }));
        setTopPriorityReplacementApproved(true);
      }

      if (preview?.anchorPreference?.honored === false) {
        const requestedIndex = preview?.anchorPreference?.requested?.anchorIndex;
        const resolvedIndex = preview?.anchorPreference?.resolved?.anchorIndex;
        const resolvedTimeRange = preview?.anchorPreference?.resolved?.timeRange;
        toast.info(
          `Preferred anchor ${requestedIndex} moved to ${resolvedIndex}${resolvedTimeRange ? ` (${resolvedTimeRange})` : ''} due to timing constraints.`
        );
      }
    } catch (e: any) {
      if (requestId !== previewRequestIdRef.current) {
        return;
      }
      console.error("Failed to preview hotspot", e);
      toast.error(e?.message || "Failed to preview hotspot");
      setActivePreviewHotspotId(null);
      setSelectedHotspotIds([]);
    } finally {
      if (requestId === previewRequestIdRef.current) {
        setIsPreviewingHotspotId(null);
      }
    }
  };

  const handleRemovePreviewHotspot = async (hotspotId: number) => {
    if (Number(activePreviewHotspotId || 0) !== Number(hotspotId)) return;
    previewRequestIdRef.current += 1;
    resetManualHotspotPreviewState();
    setActivePreviewHotspotId(null);
    setSelectedHotspotIds([]);
  };

  const handleConfirmPriorityReplacement = async () => {
    const targetHotspotId = pendingPriorityReplacementHotspotId || selectedHotspotId;
    if (!targetHotspotId) return;

    const needsReplacementApproval =
      (Array.isArray(groupPreviewResolution?.removedTopPriorityHotspots) && groupPreviewResolution.removedTopPriorityHotspots.length > 0);

    if (needsReplacementApproval) {
      await handlePreviewHotspot(targetHotspotId, {
        allowTopPriorityRemoval: true,
        selectedHotspotIds,
      });

      setForceReplacementApprovedByHotspot((prev) => ({
        ...prev,
        [targetHotspotId]: true,
      }));
      setTopPriorityReplacementApproved(true);
      return;
    }

    setForceReplacementApprovedByHotspot((prev) => ({
      ...prev,
      [targetHotspotId]: true,
    }));
    setTopPriorityReplacementApproved(true);
  };

  const handleCancelPriorityReplacement = async () => {
    const targetHotspotId = pendingPriorityReplacementHotspotId || selectedHotspotId;
    if (!targetHotspotId) return;
    await handleRemovePreviewHotspot(targetHotspotId);
  };

  const handleBuildMatrixAndPreviewAgain = async () => {
    const candidateId = Number(activePreviewHotspotId || 0);
    const planId = Number(addHotspotModal.planId || 0);
    const routeId = Number(addHotspotModal.routeId || 0);

    if (!planId || !routeId || !candidateId) {
      toast.error('Missing plan, route, or hotspot.');
      return;
    }

    setIsBuildingMatrix(true);
    try {
      const result: any = await ItineraryService.buildMissingManualHotspotMatrix(planId, routeId, candidateId);
      if (!result?.success) {
        toast.error(result?.message || 'Matrix build failed.');
        return;
      }

      toast.success('Matrix data built. Rebuilding preview...');
      resetManualHotspotPreviewStateButKeepActiveHotspot(candidateId);
      await handlePreviewHotspot(candidateId, { forceRefresh: true, source: 'AFTER_MATRIX_BUILD' });
    } catch (error: any) {
      toast.error(error?.response?.data?.message || error?.message || 'Matrix build failed.');
    } finally {
      setIsBuildingMatrix(false);
    }
  };

  const handleAddHotspot = async () => {
    if (readOnly) {
      console.log('Cannot add hotspot in read-only mode');
      return;
    }

    if (!addHotspotModal.planId || !addHotspotModal.routeId) {
      return;
    }

    const getCurrentPreviewCandidateId = (): number => {
      const fit =
        (activePreviewResolution as any)?.manualInsertionFit
        || (manualPreviewState as any)?.manualInsertionFit
        || (activePreviewResolution as any)?.resolution?.manualInsertionFit
        || null;
      return Number(
        fit?.selectedHotspotId
        || fit?.hotspotId
        || activePreviewHotspotId
        || 0,
      );
    };

    const candidateId = getCurrentPreviewCandidateId();
    if (!candidateId) {
      toast.error('Please preview one hotspot first.');
      return;
    }

    const unresolvedPriorityReplacement = (() => {
      const resolution = groupPreviewResolution || activePreviewResolution;
      const removedTopPriorityCount = Array.isArray(resolution?.removedTopPriorityHotspots)
        ? resolution.removedTopPriorityHotspots.length
        : 0;
      const needsReplacementApproval = removedTopPriorityCount > 0;
      return needsReplacementApproval && topPriorityReplacementApproved !== true;
    })();

    if (unresolvedPriorityReplacement) {
      toast.error("Confirm the priority replacement in the temp timeline before adding this hotspot.");
      return;
    }

    const previewValidation = (groupPreviewResolution || activePreviewResolution)?.validation || null;
    const forceConflictInsertion =
      previewValidation?.readyToApply === false
      && previewValidation?.requiresPriorityConfirmation !== true;

    const hasConflicts = selectedPreviewSegments.some((seg: any) => seg?.isConflict === true);
    if (!forceConflictInsertion && hasConflicts) {
      toast.error("Selected hotspot still has timing conflicts in the proposed timeline.");
      return;
    }

    const alreadyAddedIds = new Set<number>([
      ...Array.from(currentRouteAttractionHotspotIds || []).map((id: number) => Number(id)),
      ...Array.from(addedInModalHotspotIds || []).map((id: number) => Number(id)),
    ]);
    if (alreadyAddedIds.has(candidateId)) {
      toast.info('This hotspot is already added.');
      return;
    }

    setIsAddingHotspot(true);
    setIsApplyingPreviewHotspot(true);
    try {
      const affectedRouteId = addHotspotModal.routeId;
      const matrixFit =
        (activePreviewResolution as any)?.manualInsertionFit
        || (groupPreviewResolution as any)?.manualInsertionFit
        || (activePreviewResolution as any)?.resolution?.manualInsertionFit
        || (groupPreviewResolution as any)?.resolution?.manualInsertionFit
        || null;
      const applyHotspotIds = [candidateId];

      const bestSlot = matrixFit?.bestSlot || null;
      const matrixPreferredSlot = (
        matrixFit?.chosenSlotSource === 'BEST_FIT'
        && bestSlot
        && Number(bestSlot?.fromHotspotId || 0) > 0
        && Number(bestSlot?.toHotspotId || 0) > 0
      )
        ? {
            fromHotspotId: Number(bestSlot.fromHotspotId),
            toHotspotId: Number(bestSlot.toHotspotId),
            slotIndex: Number.isFinite(Number(bestSlot?.slotIndex)) ? Number(bestSlot.slotIndex) : 0,
            source: 'BEST_FIT' as const,
          }
        : undefined;

      console.log('[ManualHotspotApply][payload]', {
        selectedHotspotIds,
        activeRouteHotspotIds: Array.from(currentRouteAttractionHotspotIds),
        previewCandidateId: candidateId,
        applyHotspotIds,
        matrixPreferredSlot,
      });

      const addResult: any = await ItineraryService.applyManualHotspots(
        addHotspotModal.planId,
        addHotspotModal.routeId,
        applyHotspotIds,
        selectedHotspotAnchor
          ? {
              anchorType: selectedHotspotAnchor.anchorType,
              anchorIndex: selectedHotspotAnchor.anchorIndex,
            }
          : undefined,
        {
          allowTopPriorityRemoval: topPriorityReplacementApproved === true,
          forceConflictInsertion,
          matrixPreferredSlot,
        },
      );

      if (addResult?.code === 'MANUAL_HOTSPOT_ALREADY_EXISTS_IN_ROUTE' || addResult?.alreadyExists === true) {
        toast.info('This hotspot is already added.');
        setAddedInModalHotspotIds((prev) => {
          const next = new Set(prev);
          next.add(candidateId);
          return next;
        });
        setAvailableHotspots((prev) => prev.map((row) => (
          Number(row?.id || 0) === candidateId
            ? {
                ...row,
                alreadyAdded: true,
                availabilityStatus: 'ACTIVE_THIS_ROUTE',
                actionDisabled: true,
                buttonLabel: 'Added',
              }
            : row
        )));
        resetManualHotspotPreviewState();
        setActivePreviewHotspotId(null);
        return;
      }

      if (addResult?.success === false || addResult?.inserted === false) {
        toast.error(addResult?.message || addResult?.reason || "Failed to add selected hotspots at this position");
        return;
      }

      if (addResult?.code === 'MANUAL_HOTSPOT_INSERTED_WITH_LOW_PRIORITY_REMOVAL') {
        toast.success('Added hotspot by removing lower-priority stops on this route');
      } else if (addResult?.code === 'MANUAL_HOTSPOT_INSERTED_WITH_MATRIX_SLOT') {
        toast.success('Added hotspot using best route-fit slot');
      } else if (addResult?.resolution?.forceConflictInsertionApplied === true) {
        toast.success('Hotspot added successfully.');
      } else {
        toast.success('Hotspot added successfully.');
      }

      setAddedInModalHotspotIds((prev) => {
        const next = new Set(prev);
        next.add(candidateId);
        return next;
      });
      setAvailableHotspots((prev) => prev.map((row) => (
        Number(row?.id || 0) === candidateId
          ? {
              ...row,
              alreadyAdded: true,
              availabilityStatus: 'ACTIVE_THIS_ROUTE',
              actionDisabled: true,
              buttonLabel: 'Added',
            }
          : row
      )));

      // Show rebuild button for the day where a manual hotspot was added.
      if (affectedRouteId) {
        setRouteNeedsRebuild(affectedRouteId);
      }

      // Keep modal open for sequential add flow.
      resetManualHotspotPreviewState();
      setActivePreviewHotspotId(null);

      // Reload itinerary data in background while modal stays open.
      if (quoteId) {
        const [detailsRes, hotelRes] = await Promise.all([
          ItineraryService.getDetails(quoteId),
          shouldShowHotels ? ItineraryService.getHotelDetails(quoteId) : Promise.resolve(null),
        ]);
        setItinerary(detailsRes as ItineraryDetailsResponse);
        setHotelDetails(hotelRes as ItineraryHotelDetailsResponse);
      }

      if (addHotspotModal.routeId) {
        const refreshRequest = selectedHotspotAnchor
          ? ItineraryService.getAvailableHotspotsForAnchor({
              planId: Number(addHotspotModal.planId || 0),
              routeId: Number(addHotspotModal.routeId || 0),
              anchorType: selectedHotspotAnchor.anchorType,
              anchorIndex: Number(selectedHotspotAnchor.anchorIndex),
            })
          : ItineraryService.getAvailableHotspots(addHotspotModal.routeId);

        refreshRequest
          .then((rows: any) => {
            const refreshRows = Array.isArray(rows)
              ? rows
              : (Array.isArray(rows?.hotspots) ? rows.hotspots : []);
            const refreshMeta = Array.isArray(rows) ? null : (rows?.hotspotFilterMeta || null);
            setHotspotFilterMeta(refreshMeta);
            console.log('[AddHotspotModal] hotspot_filter_meta', refreshMeta);
            setAvailableHotspots(normalizeAvailableHotspots(refreshRows as AvailableHotspot[]));
          })
          .catch(() => {
            // Local optimistic update already applied; silent background sync failure.
          });
      }
    } catch (e: any) {
      console.error("Failed to add hotspot", e);
      const rawMessage = String(e?.message || '').trim();
      let backendCode = '';
      let backendMessage = '';

      try {
        // api(...) throws Error with response text appended after status text.
        const jsonStart = rawMessage.indexOf('{');
        if (jsonStart >= 0) {
          const payload = JSON.parse(rawMessage.slice(jsonStart));
          backendCode = String(payload?.code || payload?.error?.code || '').trim();
          backendMessage = String(payload?.message || payload?.error?.message || '').trim();
        }
      } catch {
        // Fall through to generic extraction.
      }

      const fallbackFromStatus = (() => {
        if (rawMessage.includes(' 409 ')) return 'Conflict while applying hotspot.';
        if (rawMessage.includes(' 422 ')) return 'Validation failed while applying hotspot.';
        return '';
      })();

      const displayMessage = [backendCode, backendMessage || fallbackFromStatus]
        .filter((v) => String(v || '').trim().length > 0)
        .join(': ')
        || rawMessage
        || 'Failed to add hotspot';

      if (backendCode === 'MANUAL_HOTSPOT_ALREADY_EXISTS_IN_ROUTE') {
        toast.info('This hotspot is already added.');
        setAddedInModalHotspotIds((prev) => {
          const next = new Set(prev);
          next.add(candidateId);
          return next;
        });
        return;
      }

      toast.error(displayMessage);
    } finally {
      setIsAddingHotspot(false);
      setIsApplyingPreviewHotspot(false);
    }
  };

  const toImgSrc = (path: string | null | undefined): string | undefined => {
    if (!path || !path.trim()) return undefined;
    if (path.startsWith('http')) return path;
    const apiBase = (import.meta.env.VITE_API_DVI_BASE_URL as string || '').replace(/\/$/, '');
    return `${apiBase}${path}`;
  };

  const openGalleryModal = (images: string[], title: string) => {
    const apiBase = (import.meta.env.VITE_API_DVI_BASE_URL as string || '').replace(/\/$/, '');
    const resolved = images
      .filter(img => img && img.trim() !== '')
      .map(img => img.startsWith('http') ? img : `${apiBase}${img}`);
    setGalleryActiveIdx(0);
    setGalleryModal({
      open: true,
      images: resolved,
      title,
    });
  };

  const applyArrivalPolicyDecision = (
    policy: HotelArrivalPolicyResponse,
    context: {
      planId: number;
      routeId: number;
      routeDate: string;
      cityCode: string;
      cityName: string;
    },
  ) => {
    if (!policy.shouldOpenHotelSearch) {
      if (policy.message) {
        toast.info(policy.message);
      }
      return;
    }

    if (policy.hotelFlowAction === 'DIRECT_SIGHTSEEING' && policy.deferHotelToEndOfDay) {
      toast.info('Arrival policy: sightseeing first, hotel check-in later in the day.');
    } else if (policy.hotelFlowAction === 'DIRECT_HOTEL' && policy.goToHotelImmediately) {
      toast.info('Arrival policy: proceed to hotel first.');
    }

    // ⚡ Lazy-load hotel details when modal opens (not on initial page load)
    ensureHotelDetailsLoaded();

    const itineraryChildCount = Number(itinerary?.children || 0);
    setHotelSearchChildAges((prev) =>
      Array.from({ length: itineraryChildCount }, (_, idx) => prev[idx] || '')
    );

    setHotelSelectionModal({
      open: true,
      planId: context.planId,
      routeId: context.routeId,
      routeDate: context.routeDate,
      cityCode: context.cityCode,
      cityName: context.cityName,
      checkInDate: policy.effectiveCheckInDate,
      checkOutDate: policy.effectiveCheckOutDate,
    });
  };

  const resolveArrivalPolicyForArrivalTimeChange = async (
    request: HotelArrivalPolicyRequest,
  ) => {
    setIsResolvingArrivalPolicy(true);
    try {
      const policy = await ItineraryService.resolveHotelArrivalPolicy(request);
      setLatestArrivalPolicy(policy);

      if (policy.requiresPreviousDayBillingConfirmation) {
        const normalizedRouteDate = normalizeDateToYmd(request.routeDate) || new Date().toISOString().split('T')[0];
        const routeDate = new Date(`${normalizedRouteDate}T00:00:00`);
        const previousDay = new Date(routeDate);
        previousDay.setDate(previousDay.getDate() - 1);

        const formatDate = (d: Date) => {
          const y = d.getFullYear();
          const m = String(d.getMonth() + 1).padStart(2, '0');
          const day = String(d.getDate()).padStart(2, '0');
          return `${y}-${m}-${day}`;
        };

        setArrivalPolicyConfirmModal({
          open: true,
          arrivalDate: formatDate(routeDate),
          previousDayDate: formatDate(previousDay),
          request,
        });
        return;
      }

      if (policy.message) {
        toast.info(policy.message);
      }
    } catch (e: any) {
      console.error('Failed to resolve arrival hotel policy from arrival-time change', e);
      toast.error(e?.message || 'Failed to resolve hotel arrival policy');
    } finally {
      setIsResolvingArrivalPolicy(false);
    }
  };

  const handleArrivalDateTimeChange = async (newArrivalDateTime: string) => {
    setGuestDetails((prev) => ({
      ...prev,
      arrivalDateTime: newArrivalDateTime,
    }));

    if (!newArrivalDateTime || !itinerary?.planId || !itinerary?.days?.length) {
      return;
    }

    const normalizeArrivalDateTime = (input: string): string | null => {
      const directParsed = new Date(input);
      if (!Number.isNaN(directParsed.getTime())) {
        return directParsed.toISOString();
      }

      const m = input
        .trim()
        .match(/^(\d{1,2})[-\/](\d{1,2})[-\/](\d{4})\s+(\d{1,2}):(\d{2})\s*(AM|PM)?$/i);
      if (!m) {
        return null;
      }

      const day = Number(m[1]);
      const month = Number(m[2]);
      const year = Number(m[3]);
      let hour = Number(m[4]);
      const minute = Number(m[5]);
      const ampm = (m[6] || '').toUpperCase();

      if (ampm === 'PM' && hour < 12) hour += 12;
      if (ampm === 'AM' && hour === 12) hour = 0;

      const parsed = new Date(year, month - 1, day, hour, minute, 0);
      if (Number.isNaN(parsed.getTime())) {
        return null;
      }
      return parsed.toISOString();
    };

    const normalizedArrivalDateTime = normalizeArrivalDateTime(newArrivalDateTime);
    if (!normalizedArrivalDateTime) {
      return;
    }

    const firstDay = itinerary.days[0];
    if (!firstDay?.date || !firstDay?.id) {
      return;
    }

    const request: HotelArrivalPolicyRequest = {
      itineraryPlanId: itinerary.planId,
      itineraryRouteId: firstDay.id,
      routeDayNumber: firstDay.dayNumber || 1,
      routeDate: firstDay.date,
      arrivalDateTime: normalizedArrivalDateTime,
      arrivalCityName: guestDetails.arrivalPlace || firstDay.departure || '',
      routeSourceCityName: firstDay.departure || '',
      nightStayCityName: firstDay.arrival || '',
      previousDayBillingDecisionProvided: false,
      previousDayBillingConfirmed: false,
    };

    await resolveArrivalPolicyForArrivalTimeChange(request);
  };

  const openHotelSelectionModal = async (
    planId: number,
    routeId: number,
    routeDate: string,
    cityCode: string,
    cityName: string
  ) => {
    const routeDay = itinerary?.days?.find((d) => Number(d.id) === Number(routeId));
    const currentRouteStartTimeHms = parseDisplayTimeToHms(routeDay?.startTime || '');
    const currentDecisionKey = buildArrivalPolicyDecisionKey(routeId, routeDate, currentRouteStartTimeHms);
    const isDay1EarlyArrival =
      Number(routeDay?.dayNumber || 0) === 1 &&
      isEarlyMorningTime(currentRouteStartTimeHms);

    if (
      isDay1EarlyArrival &&
      itinerary?.planId &&
      currentDecisionKey !== lastArrivalPolicyDecisionKey
    ) {
      const request: HotelArrivalPolicyRequest = {
        itineraryPlanId: itinerary.planId,
        itineraryRouteId: routeId,
        routeDayNumber: routeDay?.dayNumber || 1,
        routeDate,
        arrivalDateTime: normalizeDateToYmd(routeDate)
          ? `${normalizeDateToYmd(routeDate)}T${currentRouteStartTimeHms}`
          : undefined,
        arrivalCityName: routeDay?.departure || cityName || '',
        routeSourceCityName: routeDay?.departure || cityName || '',
        nightStayCityName: routeDay?.arrival || cityName || '',
        previousDayBillingDecisionProvided: false,
        previousDayBillingConfirmed: false,
      };

      await resolveArrivalPolicyForArrivalTimeChange(request);
      return;
    }

    const policyToApply: HotelArrivalPolicyResponse =
      latestArrivalPolicy ||
      {
        resolutionStatus: 'RESOLVED',
        arrivalWindow: 'NON_ARRIVAL_DAY',
        requiresPreviousDayBillingConfirmation: false,
        shouldOpenHotelSearch: true,
        hotelSearchMode: 'SAME_DAY',
        hotelFlowAction: 'DIRECT_SIGHTSEEING',
        deferHotelToEndOfDay: true,
        goToHotelImmediately: false,
        effectiveCheckInDate: routeDate,
        effectiveCheckOutDate: routeDate,
        sameCityArrival: true,
        normalizationApplied: false,
      };

    applyArrivalPolicyDecision(policyToApply, {
      planId,
      routeId,
      routeDate,
      cityCode,
      cityName,
    });
  };

  const handleSelectHotel = async (hotelId: number, roomTypeId: number = 1) => {
    if (readOnly) {
      console.log('Cannot select hotel in read-only mode');
      return;
    }

    if (!hotelSelectionModal.planId || !hotelSelectionModal.routeId) {
      return;
    }

    setIsSelectingHotel(true);
    try {
      await ItineraryService.selectHotel(
        hotelSelectionModal.planId,
        hotelSelectionModal.routeId,
        hotelId,
        roomTypeId,
        selectedMealPlan
      );

      toast.success("Hotel selected successfully");

      // Close modal
      setHotelSelectionModal({
        open: false,
        planId: null,
        routeId: null,
        routeDate: "",
      });
      setHotelSearchQuery("");
      setSelectedMealPlan({ all: false, breakfast: false, lunch: false, dinner: false });

      // Reload itinerary data
      if (quoteId) {
        const [detailsRes, hotelRes] = await Promise.all([
          ItineraryService.getDetails(quoteId),
          shouldShowHotels ? ItineraryService.getHotelDetails(quoteId) : Promise.resolve(null),
        ]);
        setItinerary(detailsRes as ItineraryDetailsResponse);
        setHotelDetails(hotelRes as ItineraryHotelDetailsResponse);
      }
    } catch (e: any) {
      console.error("Failed to select hotel", e);
      toast.error(getSafeErrorMessage(e, "Failed to select hotel"));
    } finally {
      setIsSelectingHotel(false);
    }
  };

  // Handle hotel selection from HotelSearchModal
  const handleSelectHotelFromSearch = async (
    hotel: HotelSearchResult,
    mealPlan?: any
  ) => {
    if (readOnly) {
      console.log('Cannot select hotel in read-only mode');
      return;
    }

    if (!hotelSelectionModal.planId || !hotelSelectionModal.routeId) {
      return;
    }

    setIsSelectingHotel(true);
    try {
      // For now, use hotelCode as hotelId. If backend expects different format, adjust here
      const hotelId = parseInt(hotel.hotelCode) || 0;
      const roomTypeId = hotel.roomTypes?.[0]?.roomCode ? parseInt(hotel.roomTypes[0].roomCode) : 1;

      // Store hotel details for TBO confirmation (ALL hotel selections)
      // Calculate checkout date (next day after check-in)
      const checkInDate = new Date(hotelSelectionModal.checkInDate || hotelSelectionModal.routeDate);
      const checkOutDate = new Date(
        hotelSelectionModal.checkOutDate || hotelSelectionModal.routeDate,
      );
      if (!hotelSelectionModal.checkOutDate) {
        checkOutDate.setDate(checkOutDate.getDate() + 1);
      }

      // Format dates to YYYY-MM-DD
      const formatDate = (date: Date) => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
      };

      // Store ALL selected hotels with provider info (multi-provider support)
      setSelectedHotelBookings(prev => ({
        ...prev,
        [hotelSelectionModal.routeId]: {
          provider: hotel.provider || 'tbo', // Get provider from search result
          hotelCode: hotel.hotelCode,
          // bookingCode should come from hotel.bookingCode (mapped from search data)
          // Only fallback to hotelCode if bookingCode is not available
          bookingCode: hotel.bookingCode || hotel.hotelCode,
          roomType: hotel.roomTypes?.[0]?.roomName || 'Standard',
          netAmount: hotel.netAmount || hotel.totalCost || hotel.totalRoomCost || hotel.price || 0,
          hotelName: hotel.hotelName,
          checkInDate: formatDate(checkInDate),
          checkOutDate: formatDate(checkOutDate),
          searchInitiatedAt: new Date().toISOString(),
        }
      }));
      setPrebookData(null);
      prebookDataRef.current = null;
      setHasAcceptedUpdatedPrice(false);

      console.log('DEBUG: Hotel selected and stored', {
        routeId: hotelSelectionModal.routeId,
        hotelCode: hotel.hotelCode,
        hotelName: hotel.hotelName,
      });

      await ItineraryService.selectHotel(
        hotelSelectionModal.planId,
        hotelSelectionModal.routeId,
        hotelId,
        roomTypeId,
        mealPlan || selectedMealPlan
      );

      toast.success("Hotel selected successfully");

      // Close modal
      setHotelSelectionModal({
        open: false,
        planId: null,
        routeId: null,
        routeDate: "",
      });
      setHotelSearchQuery("");
      setSelectedMealPlan({ all: false, breakfast: false, lunch: false, dinner: false });

      // Reload itinerary data
      if (quoteId) {
        const [detailsRes, hotelRes] = await Promise.all([
          ItineraryService.getDetails(quoteId),
          shouldShowHotels ? ItineraryService.getHotelDetails(quoteId) : Promise.resolve(null),
        ]);
        setItinerary(detailsRes as ItineraryDetailsResponse);
        setHotelDetails(hotelRes as ItineraryHotelDetailsResponse);
      }
    } catch (e: any) {
      console.error("Failed to select hotel", e);
      toast.error(getSafeErrorMessage(e, "Failed to select hotel"));
      throw e; // Re-throw for modal to handle
    } finally {
      setIsSelectingHotel(false);
    }
  };

  const openVideoModal = (videoUrl: string, title: string) => {
    // Convert YouTube watch URLs to embed URLs
    let embedUrl = videoUrl;
    const ytMatch = videoUrl.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([A-Za-z0-9_-]{11})/);
    if (ytMatch) {
      embedUrl = `https://www.youtube.com/embed/${ytMatch[1]}`;
    }
    setVideoModal({
      open: true,
      videoUrl: embedUrl,
      title,
    });
  };

  const openConfirmQuotationModal = async () => {
    if (isOpeningConfirmQuotation) {
      return;
    }

    if (!itinerary?.planId) {
      toast.error('Plan ID not found');
      return;
    }

    setIsOpeningConfirmQuotation(true);
    setConfirmQuotationModal(true);
    setPrebookData(null);
    prebookDataRef.current = null;
    setHasAcceptedUpdatedPrice(false);
    setConfirmOccupanciesTemplate(null);
    setFormErrors({});
    // Reset dynamic passenger rows to avoid stale validation errors from prior modal sessions.
    setAdditionalAdults([]);
    setAdditionalChildren([]);
    setAdditionalInfants([]);

    try {
      // Fetch customer info form data
      const customerInfo = await ItineraryService.getCustomerInfoForm(itinerary.planId);
      setWalletBalance(customerInfo.wallet_balance);

      // Check wallet balance and get plan details
      const planDetails = await api(`itineraries/edit/${itinerary.planId}`, { method: 'GET' });

      // ✅ FIX: Set agent_id from planDetails - try multiple possible field names
      let agentId = planDetails?.plan?.agent_ID
        || planDetails?.plan?.agent_id
        || planDetails?.agent_ID
        || planDetails?.agent_id
        || customerInfo?.agent_id;

      console.log('🔍 [openConfirmQuotationModal] planDetails:', planDetails);
      console.log('🔍 [openConfirmQuotationModal] customerInfo:', customerInfo);
      console.log('🔍 [openConfirmQuotationModal] agentId resolved to:', agentId);

      if (agentId) {
        try {
          const walletData = await ItineraryService.checkWalletBalance(agentId);
          setWalletBalance(walletData.formatted_balance);
        } catch (e) {
          console.warn('⚠️ Failed to fetch wallet balance:', e);
        }
      }

      // Set agentInfo with correct agent_id (only if we have valid agentId)
      if (agentId) {
        setAgentInfo({
          quotation_no: customerInfo.quotation_no,
          agent_name: customerInfo.agent_name,
          agent_id: agentId, // Use actual agent ID from plan
        });
        console.log('✅ [openConfirmQuotationModal] agentInfo set with agent_id:', agentId);
      } else {
        console.error('❌ [openConfirmQuotationModal] Failed to get agent_id. Available data:', { planDetails, customerInfo });
        toast.error('Failed to load agent information. Please try again.');
        setConfirmQuotationModal(false);
        return;
      }

      let modalNationalityForSession = confirmDefaultNationality;

      // Prefill arrival and departure details from plan
      if (planDetails?.plan) {
        const plan = planDetails.plan;
        const modalNationality = resolveConfirmNationality(
          plan,
          guestDetails.nationality || confirmDefaultNationality || 'IN',
        );
        modalNationalityForSession = modalNationality;
        setConfirmDefaultNationality(modalNationality);
        const formatDateTime = (dateTime: string) => {
          if (!dateTime) return '';
          const date = new Date(dateTime);
          const day = String(date.getDate()).padStart(2, '0');
          const month = String(date.getMonth() + 1).padStart(2, '0');
          const year = date.getFullYear();
          const hours = date.getHours();
          const minutes = String(date.getMinutes()).padStart(2, '0');
          const ampm = hours >= 12 ? 'PM' : 'AM';
          const displayHours = hours % 12 || 12;
          return `${day}-${month}-${year} ${displayHours}:${minutes} ${ampm}`;
        };

        setGuestDetails(prev => ({
          ...prev,
          nationality: modalNationality,
          arrivalDateTime: plan.trip_start_date_and_time ? formatDateTime(plan.trip_start_date_and_time) : '',
          arrivalPlace: plan.arrival_location || '',
          departureDateTime: plan.trip_end_date_and_time ? formatDateTime(plan.trip_end_date_and_time) : '',
          departurePlace: plan.departure_location || '',
        }));
      }

      let occupanciesTemplateFromPlan: Array<{ adults: number; children: number; childrenAges: number[] }> | null = null;
      const travellersFromPlan = Array.isArray(planDetails?.travellers) ? planDetails.travellers : [];
      if (travellersFromPlan.length > 0) {
        const sortedTravellers = [...travellersFromPlan].sort(
          (a: any, b: any) => Number(a?.traveller_details_ID || 0) - Number(b?.traveller_details_ID || 0),
        );
        const adults = sortedTravellers.filter((t: any) => Number(t?.traveller_type || 0) === 1);
        const children = sortedTravellers.filter((t: any) => Number(t?.traveller_type || 0) === 2);
        const infants = sortedTravellers.filter((t: any) => Number(t?.traveller_type || 0) === 3);

        const toPrefillPassenger = (title: string, traveller: any): AdditionalPassenger => {
          const ageNum = Number(traveller?.traveller_age);
          return {
            title,
            name: '',
            age: Number.isFinite(ageNum) ? String(Math.trunc(ageNum)) : '',
            nationality: modalNationalityForSession,
            panNo: '',
            passportNo: '',
          };
        };

        // Keep primary guest as Adult 1 row and prefill only additional passenger rows.
        setAdditionalAdults(adults.slice(1).map((t: any) => toPrefillPassenger('Mr', t)));
        setAdditionalChildren(children.map((t: any) => toPrefillPassenger('Ms', t)));
        setAdditionalInfants(infants.map((t: any) => toPrefillPassenger('Ms', t)));

        const template = buildOccupanciesFromTravellers(
          travellersFromPlan,
          Number(itinerary?.roomCount || 1),
        );
        occupanciesTemplateFromPlan = template;
        setConfirmOccupanciesTemplate(template);
      }

      // ── Auto-accept visually-displayed recommended hotels for unselected routes ──
      // The recommended tab shows a cheapest-per-route hotel for each day. If the user
      // hasn't explicitly clicked "Choose" on some days, mirror those into selectedHotelBookings
      // so the confirm modal and prebook reflect exactly what the user sees.
      let selectedHotelsForPrebook = { ...selectedHotelBookings };
      if (hotelDetails?.hotels?.length) {
        const preferredGroupType =
          activeHotelGroupType ?? hotelDetails.hotelTabs?.[0]?.groupType ?? 1;

        const persistedSelections: typeof selectedHotelBookings = {};
        hotelDetails.hotels
          .filter((h: any) => Number(h.groupType) === Number(preferredGroupType))
          .forEach((h: any) => {
            const routeId = Number(h.itineraryRouteId || 0);
            if (!routeId) return;
            if (Number(h?.itineraryPlanHotelDetailsId || 0) <= 0) return;

            const routeDay = itinerary?.days?.find((d: any) => Number(d.id) === routeId);
            const checkInDate = routeDay ? String(routeDay.date).split('T')[0] : '';
            const checkOutDate = routeDay
              ? new Date(new Date(String(routeDay.date)).getTime() + 86400000).toISOString().split('T')[0]
              : '';

            persistedSelections[routeId] = {
              provider: String(h.provider || 'tbo').toLowerCase(),
              hotelCode: String(h.hotelCode || h.hotelId || h.bookingCode || ''),
              bookingCode: String(h.bookingCode || h.hotelCode || h.hotelId || ''),
              roomType: h.roomType || 'Standard',
              netAmount: Number(h.totalHotelCost || 0) + Number(h.totalHotelTaxAmount || 0),
              hotelName: h.hotelName,
              checkInDate,
              checkOutDate,
              searchInitiatedAt: new Date().toISOString(),
              groupType: preferredGroupType,
            };
          });

        if (Object.keys(persistedSelections).length > 0) {
          // ✅ User's in-session selection wins over persisted DB value — only fill routes
          // that the user has NOT explicitly selected in this session.
          const mergedPersisted: typeof persistedSelections = {};
          Object.entries(persistedSelections).forEach(([routeId, val]) => {
            if (!selectedHotelBookings[Number(routeId)]) {
              mergedPersisted[Number(routeId)] = val;
            }
          });
          selectedHotelsForPrebook = { ...selectedHotelsForPrebook, ...mergedPersisted };
          setSelectedHotelBookings(prev => ({ ...prev, ...mergedPersisted }));
        }

        const routeBuckets = new Map<number, typeof hotelDetails.hotels[0][]>();
        hotelDetails.hotels
          .filter((h: any) => Number(h.groupType) === Number(preferredGroupType) && h.hotelName !== 'No Hotels Available')
          .forEach((h: any) => {
            const routeId = Number(h.itineraryRouteId || 0);
            if (!routeId) return;
            if (!routeBuckets.has(routeId)) routeBuckets.set(routeId, []);
            routeBuckets.get(routeId)!.push(h);
          });

        const autoSelections: typeof selectedHotelBookings = {};
        routeBuckets.forEach((rows, routeId) => {
          if (selectedHotelsForPrebook[routeId]) return; // already explicitly chosen (session or persisted)

          const cheapest = rows.reduce((best, curr) => {
            const bestTotal = Number(best.totalHotelCost || 0) + Number(best.totalHotelTaxAmount || 0);
            const currTotal = Number(curr.totalHotelCost || 0) + Number(curr.totalHotelTaxAmount || 0);
            return currTotal < bestTotal ? curr : best;
          });

          const hasHotelIdentity = Boolean(
            String(cheapest.hotelCode || '').trim() ||
            Number(cheapest.hotelId || 0) > 0 ||
            String(cheapest.bookingCode || '').trim() ||
            String((cheapest as any).searchReference || '').trim() ||
            String(cheapest.hotelName || '').trim(),
          );
          if (!hasHotelIdentity) return;

          const routeDay = itinerary?.days?.find((d: any) => Number(d.id) === routeId);
          const checkInDate = routeDay ? String(routeDay.date).split('T')[0] : '';
          const checkOutDate = routeDay
            ? new Date(new Date(String(routeDay.date)).getTime() + 86400000).toISOString().split('T')[0]
            : '';

          autoSelections[routeId] = {
            provider: String(cheapest.provider || 'tbo').toLowerCase(),
            hotelCode: String(cheapest.hotelCode || cheapest.hotelId || cheapest.bookingCode || ''),
            bookingCode: String(cheapest.bookingCode || cheapest.hotelCode || cheapest.hotelId || ''),
            roomType: cheapest.roomType || 'Standard',
            netAmount: Number(cheapest.totalHotelCost || 0) + Number(cheapest.totalHotelTaxAmount || 0),
            hotelName: cheapest.hotelName,
            checkInDate,
            checkOutDate,
            searchInitiatedAt: new Date().toISOString(),
            groupType: preferredGroupType,
          };
        });

        if (Object.keys(autoSelections).length > 0) {
          selectedHotelsForPrebook = { ...selectedHotelsForPrebook, ...autoSelections };
          setSelectedHotelBookings(prev => ({ ...prev, ...autoSelections }));
        }
      }

      // ── Prebook only user-explicitly-selected TBO hotels ──
      // Non-TBO hotels are shown in the review modal but are not sent to the TBO prebook API.

      const prebookOccupancies =
        occupanciesTemplateFromPlan && occupanciesTemplateFromPlan.length > 0
          ? occupanciesTemplateFromPlan
          : confirmOccupanciesTemplate && confirmOccupanciesTemplate.length > 0
          ? confirmOccupanciesTemplate
          : buildTboOccupancies(
              Number(itinerary?.roomCount || 1),
              Math.max(Number(itinerary?.adults || 1), 1),
              [],
            );

      const prebookHotelBookings: any[] = Object.entries(selectedHotelsForPrebook)
        .filter(([, hotelData]) => String((hotelData as any)?.provider || '').trim().toLowerCase() === 'tbo')
        .map(([routeId, hotelData]) => ({
          occupancies: prebookOccupancies,
          provider: hotelData.provider,
          routeId: parseInt(routeId, 10),
          hotelCode: hotelData.hotelCode,
          hotelName: hotelData.hotelName,
          bookingCode: hotelData.bookingCode,
          roomType: hotelData.roomType,
          checkInDate: hotelData.checkInDate,
          checkOutDate: hotelData.checkOutDate,
          numberOfRooms: Number(itinerary?.roomCount || 1),
          guestNationality: modalNationalityForSession,
          netAmount: Number(hotelData.netAmount || 0),
          searchInitiatedAt: hotelData.searchInitiatedAt,
          passengers: [],
        }));

      if (prebookHotelBookings.length > 0) {
        const staleHotel = prebookHotelBookings.find((booking) => {
          if (!booking.searchInitiatedAt) return false;
          const parsed = new Date(String(booking.searchInitiatedAt));
          if (Number.isNaN(parsed.getTime())) return true;
          return Date.now() - parsed.getTime() > TBO_SESSION_WINDOW_MS;
        });

        if (staleHotel) {
          toast.error('Hotel search session exceeded 35 minutes. Please search/select hotel again before prebook.');
          setConfirmQuotationModal(false);
          return;
        }

        const clientIp = await fetch('https://api.ipify.org?format=json')
          .then((res) => res.json())
          .then((data) => data.ip)
          .catch(() => '192.168.1.1');

        setIsPrebooking(true);
        try {
          const prebookResp = await ItineraryService.prebookHotels({
            itinerary_plan_ID: itinerary.planId,
            hotel_bookings: prebookHotelBookings,
            endUserIp: clientIp,
          });
          const normalizedPrebook = prebookResp?.data || prebookResp;
          prebookDataRef.current = normalizedPrebook;
          setPrebookData(normalizedPrebook);
        } catch (prebookErr) {
          toast.error(getSafeErrorMessage(prebookErr, 'Failed to prebook selected hotels. Please retry.'));
        } finally {
          setIsPrebooking(false);
        }
      }
    } catch (e: any) {
      console.error('Failed to load customer info', e);
      toast.error(e?.message || 'Failed to load customer information');
    } finally {
      setIsOpeningConfirmQuotation(false);
    }
  };

  const handleConfirmQuotation = async () => {
    if (!itinerary?.planId) {
      toast.error('Missing itinerary plan information');
      return;
    }

    const nextErrors: Record<string, string> = {};
    const requiredPrimaryFields: Array<[keyof typeof guestDetails, string]> = [
      ['name', 'Primary guest name is required.'],
      ['contactNo', 'Primary guest contact number is required.'],
      ['nationality', 'Primary guest nationality is required.'],
    ];

    requiredPrimaryFields.forEach(([key, message]) => {
      if (!String(guestDetails[key] || '').trim()) {
        nextErrors[`primary-${String(key)}`] = message;
      }
    });

    if (!ALLOWED_TITLES.includes(guestDetails.salutation)) {
      nextErrors['primary-salutation'] = 'Primary guest salutation is invalid.';
    }

    if (!validateNameParts(guestDetails.name)) {
      nextErrors['primary-name'] = 'Primary guest first name/last name must each be 2-25 valid characters.';
    }

    if (!isValidIsoNationality(guestDetails.nationality)) {
      nextErrors['primary-nationality'] = 'Primary guest nationality must be a valid ISO-2 code (example: IN).';
    }

    const primaryAge = Number(guestDetails.age);
    if (!Number.isFinite(primaryAge) || primaryAge <= 0) {
      nextErrors['primary-age'] = 'Primary guest age must be a valid number.';
    }

    const sanitizeAdditionalPassengers = (list: AdditionalPassenger[]) =>
      list
        .map((item) => ({
          ...item,
          title: String(item.title || '').trim(),
          name: String(item.name || '').trim(),
          age: String(item.age || '').trim(),
          nationality: String(item.nationality || '').trim().toUpperCase(),
          panNo: String(item.panNo || '').trim().toUpperCase(),
          passportNo: String(item.passportNo || '').trim().toUpperCase(),
        }))
        .filter((item) => item.title || item.name || item.age || item.nationality || item.panNo || item.passportNo);

    const normalizedAdditionalAdults = sanitizeAdditionalPassengers(additionalAdults);
    const normalizedAdditionalChildren = sanitizeAdditionalPassengers(additionalChildren);
    const normalizedAdditionalInfants = sanitizeAdditionalPassengers(additionalInfants);

    const validateAdditionalPassengers = (
      list: AdditionalPassenger[],
      label: 'adult' | 'child' | 'infant',
      expectedCount: number,
      minAge: number,
      maxAge: number,
    ) => {
      if (list.length !== expectedCount) {
        nextErrors[`count-${label}`] = `Expected ${expectedCount} ${label}${expectedCount === 1 ? '' : 's'}, but found ${list.length}.`;
      }

      list.forEach((item, index) => {
        if (!item.title) {
          nextErrors[`${label}-${index}-title`] = `${label} ${index + 1} title is required.`;
        } else if (!ALLOWED_TITLES.includes(item.title)) {
          nextErrors[`${label}-${index}-title`] = `${label} ${index + 1} title is invalid.`;
        }
        if (!item.name.trim()) {
          nextErrors[`${label}-${index}-name`] = `${label} ${index + 1} name is required.`;
        } else if (!validateNameParts(item.name)) {
          nextErrors[`${label}-${index}-name`] = `${label} ${index + 1} first/last name must each be 2-25 valid characters.`;
        }
        if (!item.nationality.trim()) {
          nextErrors[`${label}-${index}-nationality`] = `${label} ${index + 1} nationality is required.`;
        } else if (!isValidIsoNationality(item.nationality)) {
          nextErrors[`${label}-${index}-nationality`] = `${label} ${index + 1} nationality must be ISO-2 code (example: IN).`;
        }
        const parsedAge = Number(item.age);
        if (!Number.isFinite(parsedAge) || parsedAge < minAge || parsedAge > maxAge) {
          nextErrors[`${label}-${index}-age`] = `${label} ${index + 1} age must be between ${minAge} and ${maxAge}.`;
        }
        if (item.panNo && !isValidPan(item.panNo)) {
          nextErrors[`${label}-${index}-panNo`] = `${label} ${index + 1} PAN must be valid format (example: ABCDE1234F).`;
        }
      });
    };

    const expectedAdditionalAdults = Math.max(Number(itinerary.adults || 0) - 1, 0);
    const expectedChildren = Math.max(Number(itinerary.children || 0), 0);
    const expectedInfants = Math.max(Number(itinerary.infants || 0), 0);

    validateAdditionalPassengers(normalizedAdditionalAdults, 'adult', expectedAdditionalAdults, 12, 120);
    validateAdditionalPassengers(normalizedAdditionalChildren, 'child', expectedChildren, 2, 11);
    validateAdditionalPassengers(normalizedAdditionalInfants, 'infant', expectedInfants, 0, 5);

    if (Object.keys(nextErrors).length > 0) {
      setFormErrors(nextErrors);
      const firstError = Object.values(nextErrors)[0];
      toast.error(firstError || 'Please fix guest details before confirming quotation.');
      return;
    }

    setFormErrors({});
    setIsConfirmingQuotation(true);

    try {
      let autoSelectedHotels = { ...selectedHotelBookings };
      const selectedProvidersForConfirm = Array.from(
        new Set(
          Object.values(autoSelectedHotels)
            .map((h: any) => String(h?.provider || '').trim().toLowerCase())
            .filter(Boolean),
        ),
      );
      const preferredProviderForConfirm =
        selectedProvidersForConfirm.length === 1 ? selectedProvidersForConfirm[0] : '';
      const skippedRouteIdsForConfirm: number[] = [];

      if (hotelDetails?.hotels && hotelDetails.hotels.length > 0) {
        const routesWithHotels = new Set(hotelDetails.hotels.map((h: any) => h.itineraryRouteId));

        const toAutoSelection = (hotelRow: any, routeId: number) => {
          const routeDay = itinerary?.days?.find((d) => d.id === routeId);
          const checkInDate = routeDay?.date || '';
          const checkOutDate = routeDay
            ? new Date(new Date(routeDay.date).getTime() + 24 * 60 * 60 * 1000).toISOString().split('T')[0]
            : '';

          return {
            provider: String(hotelRow?.provider || 'tbo').trim().toLowerCase(),
            hotelCode: String(hotelRow?.hotelCode || hotelRow?.hotelId || ''),
            bookingCode: String(hotelRow?.bookingCode || hotelRow?.hotelCode || hotelRow?.hotelId || ''),
            roomType: hotelRow?.roomType || 'Standard',
            netAmount: Number(hotelRow?.totalHotelCost || 0) + Number(hotelRow?.totalHotelTaxAmount || 0),
            hotelName: hotelRow?.hotelName,
            checkInDate,
            checkOutDate,
            searchInitiatedAt: new Date().toISOString(),
          };
        };

        routesWithHotels.forEach((routeId: number) => {
          const routeHotels = hotelDetails.hotels.filter(
            (h: any) => h.itineraryRouteId === routeId && h.groupType === 1,
          );
          const persistedRouteSelection = routeHotels.find(
            (h: any) => Number(h?.itineraryPlanHotelDetailsId || 0) > 0,
          );

          // Never overwrite an explicit in-memory user selection for this route.
          // Persisted backend selection should only backfill missing routes.
          if (!autoSelectedHotels[routeId] && persistedRouteSelection) {
            autoSelectedHotels[routeId] = toAutoSelection(persistedRouteSelection, routeId);
            return;
          }

          if (!autoSelectedHotels[routeId]) {
            const firstHotelForRoute = preferredProviderForConfirm
              ? routeHotels.find(
                  (h: any) =>
                    String(h?.provider || '')
                      .trim()
                      .toLowerCase() === preferredProviderForConfirm,
                )
              : routeHotels[0];

            if (!firstHotelForRoute && preferredProviderForConfirm && routeHotels.length > 0) {
              skippedRouteIdsForConfirm.push(routeId);
            }

            if (firstHotelForRoute) {
              autoSelectedHotels[routeId] = toAutoSelection(firstHotelForRoute, routeId);
            }
          }
        });

        if (skippedRouteIdsForConfirm.length > 0) {
          toast.error(
            `Please select ${preferredProviderForConfirm.toUpperCase()} hotel(s) for route ID(s): ${skippedRouteIdsForConfirm.join(', ')}.`,
          );
          return;
        }
      }

      const primaryName = normalizeNameParts(guestDetails.name);
      const passengers = [
        {
          title: guestDetails.salutation,
          firstName: primaryName.firstName,
          lastName: primaryName.lastName,
          nationality: guestDetails.nationality,
          email: guestDetails.emailId || undefined,
          paxType: 1,
          leadPassenger: true,
          age: Number(guestDetails.age),
          panNo: undefined,
          passportNo: guestDetails.passportNo || undefined,
          passportIssueDate: undefined,
          passportExpDate: undefined,
          phoneNo: guestDetails.contactNo,
        },
        ...normalizedAdditionalAdults.map((adult) => {
          const name = normalizeNameParts(adult.name);
          return {
            title: adult.title,
            firstName: name.firstName,
            lastName: name.lastName,
            nationality: adult.nationality,
            email: undefined,
            paxType: 1,
            leadPassenger: false,
            age: Number(adult.age),
            panNo: adult.panNo || undefined,
            passportNo: adult.passportNo || undefined,
            passportIssueDate: undefined,
            passportExpDate: undefined,
            phoneNo: guestDetails.contactNo,
          };
        }),
        ...normalizedAdditionalChildren.map((child) => {
          const name = normalizeNameParts(child.name);
          return {
            title: child.title,
            firstName: name.firstName,
            lastName: name.lastName,
            nationality: child.nationality,
            email: undefined,
            paxType: 2,
            leadPassenger: false,
            age: Number(child.age),
            panNo: undefined,
            passportNo: child.passportNo || undefined,
            passportIssueDate: undefined,
            passportExpDate: undefined,
            phoneNo: guestDetails.contactNo,
          };
        }),
        ...normalizedAdditionalInfants.map((infant) => {
          const name = normalizeNameParts(infant.name);
          return {
            title: infant.title,
            firstName: name.firstName,
            lastName: name.lastName,
            nationality: infant.nationality,
            email: undefined,
            paxType: 3,
            leadPassenger: false,
            age: Number(infant.age),
            panNo: undefined,
            passportNo: infant.passportNo || undefined,
            passportIssueDate: undefined,
            passportExpDate: undefined,
            phoneNo: guestDetails.contactNo,
          };
        }),
      ];

      // Child ages must be locked from plan/search template to avoid mismatch with TBO
      const childAgesForBooking = (
        confirmOccupanciesTemplate && confirmOccupanciesTemplate.length > 0
          ? confirmOccupanciesTemplate.flatMap((occ: any) =>
              Array.isArray(occ.childrenAges) ? occ.childrenAges.map(Number) : []
            )
          : normalizedAdditionalChildren.map((c) => Number(c.age))
      ).filter((age: number) => Number.isFinite(age) && age >= 0 && age <= 11);

      const occupanciesForBooking =
        confirmOccupanciesTemplate && confirmOccupanciesTemplate.length > 0
          ? applyChildAgesToTemplate(confirmOccupanciesTemplate, childAgesForBooking)
          : buildTboOccupancies(
              Number(itinerary.roomCount || 1),
              Math.max(Number(itinerary.adults || 1), 1),
              childAgesForBooking,
            );

      const bookingGuestNationality = (
        guestDetails.nationality ||
        confirmDefaultNationality ||
        'IN'
      )
        .trim()
        .toUpperCase();

      const hotelBookings: any[] = Object.entries(autoSelectedHotels).map(([routeId, hotelData]) => ({
        occupancies: occupanciesForBooking,
        provider: inferHotelProvider(hotelData),
        routeId: parseInt(routeId, 10),
        hotelCode: hotelData.hotelCode,
        hotelName: hotelData.hotelName,
        bookingCode: hotelData.bookingCode,
        roomType: hotelData.roomType,
        checkInDate: hotelData.checkInDate,
        checkOutDate: hotelData.checkOutDate,
        numberOfRooms: Number(itinerary.roomCount || 1),
        guestNationality: bookingGuestNationality,
        netAmount: Number(hotelData.netAmount || 0),
        searchInitiatedAt: hotelData.searchInitiatedAt,
        passengers,
      }));

      const tboCount = hotelBookings.filter((booking) => booking.provider === 'tbo').length;
      const nonTboRouteIds = hotelBookings
        .filter((booking) => booking.provider !== 'tbo')
        .map((booking) => Number(booking.routeId))
        .filter((id) => Number.isFinite(id));

      if (tboCount > 0 && nonTboRouteIds.length > 0) {
        const uniqueNonTboRouteIds = Array.from(new Set(nonTboRouteIds));
        const shouldContinueWithMixedProviders = window.confirm(
          `Mixed providers detected. Non-TBO route ID(s): ${uniqueNonTboRouteIds.join(', ')}.\n\nPress OK to continue with mixed-provider booking, or Cancel to reselect hotels.`,
        );
        if (!shouldContinueWithMixedProviders) {
          toast.error(
            `Mixed providers detected. Non-TBO route ID(s): ${uniqueNonTboRouteIds.join(', ')}. Please reselect hotels before confirming.`,
          );
          return;
        }
        toast.warning('Proceeding with mixed-provider booking as confirmed.');
      }

      if (hotelBookings.length === 0) {
        toast.error('No hotels selected for booking. Please select hotels and retry.');
        return;
      }

      const staleHotel = hotelBookings.find((booking) => {
        if (!booking.searchInitiatedAt) {
          return false;
        }
        const parsed = new Date(String(booking.searchInitiatedAt));
        if (Number.isNaN(parsed.getTime())) {
          return true;
        }
        return Date.now() - parsed.getTime() > TBO_SESSION_WINDOW_MS;
      });

      if (staleHotel) {
        setPrebookData(null);
        setHasAcceptedUpdatedPrice(false);
        toast.error('Hotel search session exceeded 35 minutes. Please search/select hotel again before prebook.');
        return;
      }

      const clientIp = await fetch('https://api.ipify.org?format=json')
        .then((res) => res.json())
        .then((data) => data.ip)
        .catch(() => '192.168.1.1');

      const effectivePrebookData = prebookDataRef.current || prebookData;
      const hasTboBookings = hotelBookings.some((b) => b.provider === 'tbo');
      console.log('hasTboBookings', hasTboBookings);
      console.log(hotelBookings,'hotelBookings');
      if (hasTboBookings && !effectivePrebookData) {
        toast.error('TBO prebook data missing. Reopen Confirm Quotation to prebook before final booking.');
        return;
      }

      const prebookTotal = Number(
        effectivePrebookData?.updatedTotalPrice ||
        effectivePrebookData?.finalPrice ||
        effectivePrebookData?.totalAmount ||
        0,
      );
      const currentTotal = hotelBookings.reduce((sum, booking) => sum + Number(booking.netAmount || 0), 0);
      if (prebookTotal > 0 && Math.abs(prebookTotal - currentTotal) > 0.01 && !hasAcceptedUpdatedPrice) {
        toast.warning('Accept updated prebook price before final confirmation.');
        return;
      }

      // Require acknowledgement of review details before final booking
      if (!hasAcceptedUpdatedPrice) {
        toast.warning('Please review and acknowledge the hotel details before final booking confirmation.');
        return;
      }

      const groupTypeValue = Object.values(selectedHotelBookings)[0]?.groupType ?? 1;
      const selectedGroupType = String(groupTypeValue);

      const primaryGuest = {
        salutation: guestDetails.salutation,
        name: guestDetails.name,
        phone: guestDetails.contactNo,
        email: guestDetails.emailId,
      };

      if (!agentInfo?.agent_id) {
        toast.error('Missing agent information for final confirmation. Please reopen Confirm Quotation and retry.');
        return;
      }

      const hotelBookingsWithPrebookContext = hotelBookings.map((booking) => {
        const matchingPrebook = prebookHotelEntries.find(
          (item: any) =>
            Number(item?.routeId) === Number(booking.routeId) &&
            String(item?.hotelCode || '') === String(booking.hotelCode || ''),
        );

        return {
          ...booking,
          prebookContext: matchingPrebook?.prebookContext,
        };
      });

      const confirmPayload = {
        itinerary_plan_ID: itinerary.planId,
        agent: agentInfo.agent_id,
        primary_guest_salutation: guestDetails.salutation,
        primary_guest_name: guestDetails.name,
        primary_guest_contact_no: guestDetails.contactNo,
        primary_guest_age: guestDetails.age,
        primary_guest_alternative_contact_no: guestDetails.alternativeContactNo,
        primary_guest_email_id: guestDetails.emailId,
        adult_name: normalizedAdditionalAdults.map(a => a.name),
        adult_age: normalizedAdditionalAdults.map(a => a.age),
        child_name: normalizedAdditionalChildren.map(c => c.name),
        child_age: normalizedAdditionalChildren.map(c => c.age),
        infant_name: normalizedAdditionalInfants.map(i => i.name),
        infant_age: normalizedAdditionalInfants.map(i => i.age),
        arrival_date_time: guestDetails.arrivalDateTime,
        arrival_place: guestDetails.arrivalPlace,
        arrival_flight_details: guestDetails.arrivalFlightDetails,
        departure_date_time: guestDetails.departureDateTime,
        departure_place: guestDetails.departurePlace,
        departure_flight_details: guestDetails.departureFlightDetails,
        price_confirmation_type: hasAcceptedUpdatedPrice ? 'new' : 'old',
        hotel_group_type: selectedGroupType,
        hotel_bookings: hotelBookingsWithPrebookContext.length > 0 ? hotelBookingsWithPrebookContext : undefined,
        primaryGuest,
        endUserIp: clientIp,
      };

      console.log('📦 [handleConfirmQuotation] confirmQuotation payload:', confirmPayload);
      await ItineraryService.confirmQuotation(confirmPayload);

      toast.success('Quotation confirmed successfully!');
      setConfirmQuotationModal(false);

      // Refresh data to show confirmed status and links
      if (quoteId) {
        const detailsRes = await ItineraryService.getDetails(quoteId);
        setItinerary(detailsRes as ItineraryDetailsResponse);
      }

      // Reset form and selected hotels
      setGuestDetails({
        salutation: 'Mr',
        name: '',
        contactNo: '',
        age: '',
        nationality: confirmDefaultNationality,
        panNo: '',
        passportNo: '',
        alternativeContactNo: '',
        emailId: '',
        arrivalDateTime: '',
        arrivalPlace: '',
        arrivalFlightDetails: '',
        departureDateTime: '',
        departurePlace: '',
        departureFlightDetails: '',
      });
      setAdditionalAdults([]);
      setAdditionalChildren([]);
      setAdditionalInfants([]);
      setPrebookData(null);
      prebookDataRef.current = null;
      setHasAcceptedUpdatedPrice(false);
      setFormErrors({});
      setSelectedHotelBookings({});
    } catch (e: any) {
      console.error('Failed to confirm quotation', e);
      toast.error(getSafeErrorMessage(e, 'Failed to confirm quotation'));
    } finally {
      setIsConfirmingQuotation(false);
      setIsPrebooking(false);
    }
  };

  useEffect(() => {
    if (!pendingScrollDayNumber) {
      return;
    }

    const timer = window.setTimeout(() => {
      const dayElement = document.getElementById(`itinerary-day-${pendingScrollDayNumber}`);
      if (dayElement) {
        dayElement.scrollIntoView({ behavior: "smooth", block: "start" });
      }
      setPendingScrollDayNumber(null);
    }, 180);

    return () => window.clearTimeout(timer);
  }, [itinerary, pendingScrollDayNumber]);

  useEffect(() => {
    return () => {
      stopRouteTimeProgress();
    };
  }, [stopRouteTimeProgress]);

  const hotelTimelineLoading = Boolean(shouldShowHotels && !hotelDetails && itinerary && !error);

  if ((loading || hotelTimelineLoading) && !isApplyingRouteTimeUpdate) {
    return (
      <div className="w-full max-w-full flex justify-center items-center py-16">
        <div className="flex items-center gap-2 text-sm text-[#6c6c6c]">
          <Loader2 className="h-4 w-4 animate-spin" />
          <p>
            {isApplyingRouteTimeUpdate
              ? "Updating itinerary and hotel results..."
              : shouldShowHotels
              ? "Loading itinerary details and hotel names..."
              : "Loading itinerary details..."}
          </p>
        </div>
      </div>
    );
  }

  if (location.pathname.startsWith("/confirmed-itinerary/")) {
    return null;
  }

  if (error || !itinerary) {
    return (
      <div className="w-full max-w-full flex flex-col items-center py-16 gap-4">
        <p className="text-sm text-red-600">
          {error || "Itinerary details not found"}
        </p>
        {itinerary?.planId && (
          <Link to={`/create-itinerary?id=${itinerary.planId}`}>
            <Button
              variant="outline"
              className="border-[#d546ab] text-[#d546ab] hover:bg-[#fdf6ff]"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Route List
            </Button>
          </Link>
        )}
      </div>
    );
  }

  const backToListHref = itinerary.planId
    ? `/create-itinerary?id=${itinerary.planId}`
    : "#";
  const modifyItineraryHref = backToListHref;
  const routeProgressPct = Math.max(0, Math.min(100, Math.round(routeTimeProgressPercent)));
  const routeCircleRadius = 42;
  const routeCircleCircumference = 2 * Math.PI * routeCircleRadius;
  const routeDashOffset = routeCircleCircumference - (routeProgressPct / 100) * routeCircleCircumference;

  return (
    <div className="w-full max-w-full space-y-1 pb-8">
      {isApplyingRouteTimeUpdate && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/40">
          <div className="w-[340px] rounded-2xl bg-white p-6 text-center shadow-2xl">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-[#ffe9d6] text-2xl">
              ⏱
            </div>
            <p className="text-sm text-slate-600">
              Updating day timings and rebuilding itinerary
            </p>
            <div className="mt-5 flex flex-col items-center gap-3">
              <div className="relative h-28 w-28">
                <svg className="h-28 w-28 -rotate-90" viewBox="0 0 100 100" role="img" aria-label="Route update progress">
                  <circle cx="50" cy="50" r={routeCircleRadius} stroke="#e8edf4" strokeWidth="8" fill="none" />
                  <circle
                    cx="50"
                    cy="50"
                    r={routeCircleRadius}
                    stroke="#d546ab"
                    strokeWidth="8"
                    strokeLinecap="round"
                    fill="none"
                    strokeDasharray={routeCircleCircumference}
                    strokeDashoffset={routeDashOffset}
                    style={{ transition: "stroke-dashoffset 250ms linear" }}
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center text-xl font-semibold text-slate-900">
                  {routeProgressPct}%
                </div>
              </div>

              <div className="text-sm font-semibold text-slate-800">Updating itinerary...</div>
              <div className="text-xs text-slate-500">Estimated ~{Math.max(1, Math.round(routeTimeEstimatedMs / 1000))}s</div>

            </div>
          </div>
        </div>
      )}

      {/* Header Card */}
      <div ref={summaryStickyRef} className="sticky top-0 z-40 bg-white/95 backdrop-blur-sm">
        <Card className="border-none shadow-none bg-white">
          <CardContent className="pt-4 pb-0">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-2">
              <h1 className="text-xl font-semibold text-[#4a4260] flex flex-wrap items-center gap-1">
                <span>Tour Itinerary Plan</span>
                <span className="text-[#6c6c6c]">(</span>
                {itineraryPreference === 2 && (
                  <>
                    <button
                      type="button"
                      onClick={scrollToVehicleList}
                      className="text-[#6c6c6c] hover:text-[#d546ab] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#d546ab]/40 rounded"
                      title="Go to Vehicle List"
                    >
                      Vehicle
                    </button>
                    <span className="text-[#6c6c6c]">Only</span>                   
                  </>
                )}
                {itineraryPreference === 1 && (
                  <>
                    <button
                      type="button"
                      onClick={scrollToHotelList}
                      className="text-[#6c6c6c] hover:text-[#d546ab] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#d546ab]/40 rounded"
                      title="Go to Hotel List"
                    >
                      Hotel
                    </button>
                    <span className="text-[#6c6c6c]">Only</span>
                  </>
                )}
                {itineraryPreference !== 1 && itineraryPreference !== 2 && (
                  <>
                    <button
                      type="button"
                      onClick={scrollToVehicleList}
                      className="text-[#6c6c6c] hover:text-[#d546ab] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#d546ab]/40 rounded"
                      title="Go to Vehicle List"
                    >
                      Vehicle
                    </button>
                    <span className="text-[#6c6c6c]">+</span>
                    <button
                      type="button"
                      onClick={scrollToHotelList}
                      className="text-[#6c6c6c] hover:text-[#d546ab] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#d546ab]/40 rounded"
                      title="Go to Hotel List"
                    >
                      Hotel
                    </button>
                  </>
                )}
                <span className="text-[#6c6c6c]">)</span>
              </h1>
              <div className="flex flex-wrap gap-2">
                <Link to={backToListHref}>
                  <Button
                    variant="outline"
                    className="border-[#d546ab] text-[#d546ab] hover:bg-[#fdf6ff]"
                  >
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back to List
                  </Button>
                </Link>

                {itinerary.isConfirmed && (
                  <>
                    <Button
                      variant="outline"
                      className="border-[#6f42c1] text-[#6f42c1] hover:bg-[#6f42c1] hover:text-white"
                      onClick={() => setPluckCardModal(true)}
                    >
                      <CreditCard className="mr-2 h-4 w-4" />
                      Download Pluck Card
                    </Button>
                    <Button
                      variant="outline"
                      className="border-[#28a745] text-[#28a745] hover:bg-[#28a745] hover:text-white"
                      onClick={() => setVoucherModal(true)}
                    >
                      <FileText className="mr-2 h-4 w-4" />
                      Voucher Details
                    </Button>
                    <Button
                      variant="outline"
                      className="border-[#fd7e14] text-[#fd7e14] hover:bg-[#fd7e14] hover:text-white"
                      onClick={() => setIncidentalModal(true)}
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      Add Incidental Expenses
                    </Button>
                    <Link to={modifyItineraryHref}>
                      <Button
                        variant="outline"
                        className="border-[#dc3545] text-[#dc3545] hover:bg-[#dc3545] hover:text-white"
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Modify Itinerary
                      </Button>
                    </Link>
                    <Button
                      variant="outline"
                      className="border-[#17a2b8] text-[#17a2b8] hover:bg-[#17a2b8] hover:text-white"
                      onClick={() => { setInvoiceType('tax'); setInvoiceModal(true); }}
                    >
                      <Receipt className="mr-2 h-4 w-4" />
                      Invoice Tax
                    </Button>
                    <Button
                      variant="outline"
                      className="border-[#fd7e14] text-[#fd7e14] hover:bg-[#fd7e14] hover:text-white"
                      onClick={() => { setInvoiceType('proforma'); setInvoiceModal(true); }}
                    >
                      <FileText className="mr-2 h-4 w-4" />
                      Invoice Performa
                    </Button>
                  </>
                )}
              </div>
            </div>

            {/* Quote Info — row 1 */}
            <div className="flex flex-col lg:flex-row justify-between gap-2 bg-[#f8f5fc] rounded-t-lg px-4 py-2 -mx-4 -mt-2">
              <div className="flex flex-wrap items-center gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-[#d546ab]">{itinerary.quoteId}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-[#6c6c6c]" />
                  <span className="font-medium text-[#4a4260]">{itinerary.dateRange}</span>
                  {(itinerary.nightCount !== undefined || itinerary.dayCount !== undefined) && (
                    <span className="text-[#4a4260] font-medium">
                      ({itinerary.nightCount ?? 0} N, {itinerary.dayCount ?? 0} D)
                    </span>
                  )}
                </div>
              </div>
              <div className="text-right flex items-center gap-2 justify-end">
                {shouldShowRebuildHotelsButton && !readOnly && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleRebuildHotels}
                    disabled={isRebuildingHotels}
                    className="border-[#d546ab] text-[#d546ab] hover:bg-[#fdf6ff]"
                  >
                    {isRebuildingHotels ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Rebuilding...
                      </>
                    ) : (
                      <>
                        <RefreshCw className="mr-2 h-4 w-4" />
                        Rebuild Hotels
                      </>
                    )}
                  </Button>
                )}
                <div>
                  <span className="text-sm text-[#6c6c6c]">Overall Trip Cost : </span>
                  <span className="text-xl font-bold text-[#d546ab]">₹ {overallTripCostWithHotels}</span>
                </div>
              </div>
            </div>

            {/* Trip Details — row 2 (same bg) */}
            <div className="flex flex-wrap gap-4 text-sm text-[#6c6c6c] bg-[#f8f5fc] px-4 py-2 -mx-4 rounded-b-lg">
              <span>
                <span>Room Count </span>
                <span className="font-semibold text-[#4a4260]">{itinerary.roomCount}</span>
              </span>
              <span>Extra Bed <span className="font-semibold text-[#4a4260]">{itinerary.extraBed}</span></span>
              <span>Child with bed <span className="font-semibold text-[#4a4260]">{itinerary.childWithBed}</span></span>
              <span>Child without bed <span className="font-semibold text-[#4a4260]">{itinerary.childWithoutBed}</span></span>
              <div className="w-full sm:w-auto sm:ml-auto flex flex-wrap gap-4">
                <span>Adults <span className="font-semibold text-[#4a4260]">{itinerary.adults}</span></span>
                <span>Child <span className="font-semibold text-[#4a4260]">{itinerary.children}</span></span>
                <span>Infants <span className="font-semibold text-[#4a4260]">{itinerary.infants}</span></span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Daily Itinerary */}
      <div className="lg:pr-20">


       {displayDays.map((day) => {
  const { intercityDistance, sightseeingDistance } = getDisplayDistances(day);
  const addHotspotCta = day.segments.find(
    (segment): segment is HotspotSegment => segment.type === "hotspot"
  );

  return (
            
            <Card
              key={day.id}
              id={`itinerary-day-${day.dayNumber}`}
              data-day-number={day.dayNumber}
              className="border border-[#e5d9f2] bg-white"
            >
              <CardContent className="pt-2">




             {/* Day Header */}
<div
  className="sticky z-20 mb-3 mx-0 rounded-lg border border-[#59b9ea] bg-white px-4 py-4"
  style={{ top: `${Math.max(summaryStickyHeight + 8, 8)}px` }}
>
  <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(260px,1fr)_auto_minmax(260px,1fr)] lg:items-center">
    {/* LEFT: day/date/location */}
    <div className="flex min-w-0 items-start gap-3">
      <Calendar className="mt-1 h-5 w-5 shrink-0 text-[#d546ab]" />

      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="font-semibold leading-6 text-[#4a4260]">
            DAY {day.dayNumber} - {formatHeaderDate(day.date)}
          </h3>

          {(routeNeedsRebuild === day.id || dayHasManualInserts(day)) && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleRebuildRoute(itinerary.planId, day.id)}
              disabled={isRebuilding}
              className="bg-yellow-50 border-yellow-300 hover:bg-yellow-100"
            >
              {isRebuilding ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Rebuilding...
                </>
              ) : (
                <>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Rebuild Route
                </>
              )}
            </Button>
          )}
        </div>

        <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-[#6c6c6c]">
          <span className="font-medium">{day.departure}</span>

          {day.viaRoutes && day.viaRoutes.length > 0 && (
            <>
              <ArrowRight className="h-4 w-4 text-[#d546ab]" />
              <span
                className="text-[#4a4260]"
                title={day.viaRoutes.map((v) => v.name).join(", ")}
              >
                {day.viaRoutes.map((v) => v.name).join(", ")}
              </span>
            </>
          )}

          <MapPin className="h-3 w-3" />
          <span className="font-medium">{day.arrival}</span>
        </div>
      </div>
    </div>

    {/* CENTER: time */}
    <div className="flex justify-start lg:justify-center">
      <div className="flex items-center gap-3 rounded-full border border-[#e5d9f2] bg-white px-5 py-2 shadow-sm">
        <Popover>
          <PopoverTrigger asChild>
            <button
              type="button"
              className="text-sm font-semibold text-[#4a4260] hover:text-[#d546ab]"
            >
              {day.startTime}
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <TimePickerPopover
              value={day.startTime}
              label="Start Time"
              onSave={async (newTime) => {
                document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
                await handleUpdateRouteTimesDirect(
                  itinerary.planId || 0,
                  day.id,
                  day.dayNumber,
                  newTime,
                  day.endTime
                );
              }}
            />
          </PopoverContent>
        </Popover>

        <ArrowRight className="h-4 w-4 text-[#d546ab]" />

        <Popover>
          <PopoverTrigger asChild>
            <button
              type="button"
              className="text-sm font-semibold text-[#4a4260] hover:text-[#d546ab]"
            >
              {day.endTime}
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <TimePickerPopover
              value={day.endTime}
              label="End Time"
              onSave={async (newTime) => {
                document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
                await handleUpdateRouteTimesDirect(
                  itinerary.planId || 0,
                  day.id,
                  day.dayNumber,
                  day.startTime,
                  newTime
                );
              }}
            />
          </PopoverContent>
        </Popover>
      </div>
    </div>

    {/* RIGHT: buttons + KM */}
    <div className="flex flex-wrap items-center justify-start gap-2 lg:justify-end">
      {addHotspotCta && !readOnly && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-9 rounded-full border-[#d546ab] px-4 text-sm font-semibold text-[#d546ab] hover:bg-[#fdf6ff]"
          onClick={() =>
            openAddHotspotModal(
              itinerary.planId || 0,
              day.id,
              addHotspotCta.locationId || 0,
              day.arrival || "Location",
              addHotspotCta.anchorType === "after_travel" &&
                Number.isInteger(Number(addHotspotCta.anchorIndex))
                ? {
                    anchorType: "after_travel",
                    anchorIndex: Number(addHotspotCta.anchorIndex),
                    anchorFrom: addHotspotCta.anchorFrom,
                    anchorTo: addHotspotCta.anchorTo,
                    anchorTimeRange: addHotspotCta.anchorTimeRange,
                  }
                : null
            )
          }
        >
          Add Hotspot
        </Button>
      )}

      <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-9 rounded-full border-[#d546ab] px-4 text-sm font-semibold text-[#d546ab] hover:bg-[#fdf6ff]"
          onClick={() => handleAddGuideClick(day)}
          disabled={readOnly}
        >
          <Plus className="mr-1 h-4 w-4" />
          Add Guide
          </Button>

      <span className="rounded-full bg-[#d546ab] px-4 py-2 text-sm font-bold text-white whitespace-nowrap">
        {intercityDistance}
      </span>
    </div>
  </div>
</div>


                {/* Segments */}
                <div className="space-y-0">
                  {day.segments.map((segment, idx) => (
                    <div key={idx}>
                      {/* Connector dots — only between real segments, never around hotspot CTAs */}
                      {idx > 0 &&
                        segment.type !== 'hotspot' &&
                        day.segments[idx - 1]?.type !== 'hotspot' && (
                          <div className="flex justify-start ml-5 my-0.5">
                            <div className="flex flex-col items-center gap-[2px]">
                              <span className="block w-[3px] h-[3px] rounded-full bg-[#c0c0c0]"></span>
                              <span className="block w-[3px] h-[3px] rounded-full bg-[#c0c0c0]"></span>
                              <span className="block w-[3px] h-[3px] rounded-full bg-[#c0c0c0]"></span>
                            </div>
                          </div>
                        )}
                      <div className="mx-4">
                        {segment.type === "start" && (
                          <div className="flex items-center gap-2 py-1 text-sm text-[#6c6c6c]">
                            <Car className="h-4 w-4 shrink-0" />
                            <span className="font-medium text-[#4a4260]">{segment.title}</span>
                            <Clock className="h-3 w-3 ml-1" />
                            <span>{segment.timeRange}</span>
                          </div>
                        )}



                        {segment.type === "travel" && (() => {
                          const textLabels = extractTravelFromToFromText((segment as any)?.text);
                          const travelFromLabel = String(segment.from || textLabels.from || 'Route Start').trim();
                          const travelToRawLabel = String(segment.to || textLabels.to || extractTravelToFromText((segment as any)?.text) || 'Next Stop').trim();
                          const travelToLabel = /hotel/i.test(travelToRawLabel) && destinationHotelDisplayName
                            ? destinationHotelDisplayName
                            : travelToRawLabel;
                          const travelDistanceLabel = segment.distance;
                          const showTravelDistance = Boolean(
                            String(travelDistanceLabel || '').trim()
                            && String(travelDistanceLabel || '').trim() !== '--'
                          );

                          return (
                            <div className={`flex flex-col sm:flex-row sm:items-center gap-2 rounded-lg px-3 py-2 text-sm ${segment.isConflict ? 'bg-red-50 border border-red-400' : 'bg-[#e8f9fd]'}`}>
                              <Car className="h-4 w-4 text-[#4ba3c3] shrink-0" />
                              <span className="text-[#4a4260] min-w-0 flex-1">
                                <span className="font-medium">Travelling from </span>
                                <span className="text-[#d546ab] font-medium">{travelFromLabel}</span>
                                <span className="font-medium"> to </span>
                                <span className="text-[#d546ab] font-medium">{travelToLabel}</span>
                              </span>
                              <span className="flex items-center gap-1 text-xs text-[#6c6c6c] shrink-0 flex-wrap sm:justify-end gap-x-3">
                                <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{segment.timeRange}</span>
                                {showTravelDistance && (
                                  <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{travelDistanceLabel}</span>
                                )}
                                <span className="flex items-center gap-1">⏱ {segment.duration}</span>
                                {segment.note && <span className="text-[#aaa]">({segment.note})</span>}
                              </span>
                              {segment.isConflict && (
                                <span title={segment.conflictReason ?? ''}><AlertTriangle className="h-4 w-4 text-red-500 shrink-0" /></span>
                              )}
                            </div>
                          );
                        })()}

                        {segment.type === "attraction" && (
                          <>
                            <div className={`bg-white rounded-lg px-3 py-2 border ${segment.isConflict ? 'border-red-500 bg-red-50 shadow-md' : 'border-[#e5d9f2]'}`}>
                              {segment.isConflict && (
                                <div className="flex items-center gap-2 bg-red-600 text-white px-3 py-1 rounded-md text-xs font-bold mb-2 animate-pulse">
                                  <AlertTriangle className="h-4 w-4" />
                                  <span>
                                    {/forced manual insertion after user confirmation/i.test(segment.conflictReason || '')
                                      ? 'Manual override confirmed: This stop is included, but timing may shift.'
                                      : `Schedule note: ${segment.conflictReason || 'Timing may shift.'}`}
                                  </span>
                                </div>
                              )}
                              <div className="flex flex-col sm:flex-row gap-3">
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-start justify-between">
                                    <h4 className="font-semibold text-[#4a4260] mb-2">
                                      {segment.name}
                                    </h4>
                                    <button
                                      className="text-red-500 hover:text-red-700 p-1"
                                      title="Delete Hotspot"
                                      onClick={() =>
                                        openDeleteHotspotModal(
                                          itinerary.planId || 0,
                                          day.id,
                                          segment.routeHotspotId || 0,
                                          segment.name,
                                          segment.isManual === true,
                                        )
                                      }
                                    >
                                      <Trash2 className="h-5 w-5" />
                                    </button>
                                  </div>
                                  <p className="text-sm text-[#6c6c6c] mb-2 line-clamp-2">
                                    {segment.description}
                                  </p>
                                  <div className="flex flex-wrap gap-3 text-xs text-[#6c6c6c]">
                                    <span className="flex items-center font-bold text-[#d546ab] bg-[#fdf6ff] px-2 py-1 rounded border border-[#f3e8ff]">
                                      <Clock className="h-3 w-3 mr-1" />
                                      {segment.visitTime}
                                    </span>
                                    {segment.amount && segment.amount > 0 && (
                                      <span className="flex items-center">
                                        <Ticket className="h-3 w-3 mr-1" />
                                        ₹{segment.amount.toFixed(0)}
                                      </span>
                                    )}
                                    {segment.duration && (
                                      <span className="flex items-center">
                                        <Clock className="h-3 w-3 mr-1" />
                                        {segment.duration}
                                      </span>
                                    )}
                                    {segment.timings && (
                                      <span className="flex items-center">
                                        <Timer className="h-3 w-3 mr-1" />
                                        {segment.timings}
                                      </span>
                                    )}
                                    {segment.hasAvailableActivities && (
                                      <button
                                        className="text-[#d546ab] hover:underline flex items-center font-medium"
                                        onClick={() =>
                                          openAddActivityModal(
                                            itinerary.planId || 0,
                                            day.id,
                                            segment.routeHotspotId || 0,
                                            segment.hotspotId || 0,
                                            segment.name
                                          )
                                        }
                                      >
                                        <Plus className="h-3 w-3 mr-1" />
                                        Add Activity
                                      </button>
                                    )}
                                  </div>
                                </div>
                                {/* Thumbnail with overlaid gallery/video icons — matches PHP layout */}
                                <div className="relative flex-shrink-0 flex justify-end">
                                  <img
                                    src={
                                      toImgSrc(segment.image) ||
                                      "https://placehold.co/185x115/e9d5f7/4a4260?text=Spot"
                                    }
                                    alt={segment.name}
                                    className="rounded-lg object-cover shadow-sm w-[140px] h-[100px] sm:w-[185px] sm:h-[115px]"
                                  />
                                  {/* Icons overlaid top-right of thumbnail */}
                                  <div className="absolute top-1 right-1 flex flex-col gap-1">
                                    <button
                                      title="Click to View the Images"
                                      className="bg-white/80 hover:bg-white rounded-full p-1 shadow"
                                      onClick={() =>
                                        openGalleryModal(
                                          segment.galleryImages && segment.galleryImages.length > 0
                                            ? segment.galleryImages
                                            : segment.image ? [segment.image] : [],
                                          segment.name
                                        )
                                      }
                                    >
                                      🖼️
                                    </button>
                                    {segment.videoUrl && (
                                      <button
                                        title="Click to View the Video"
                                        className="bg-white/80 hover:bg-white rounded-full p-1 shadow"
                                        onClick={() =>
                                          openVideoModal(segment.videoUrl || "", segment.name)
                                        }
                                      >
                                        ▶️
                                      </button>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>

                            {/* Plan Own Way Alert */}
                            {segment.planOwnWay && (
                              <div className="flex items-center gap-3 mb-3">
                                <div className="bg-red-500 rounded-full p-2">
                                  <Bell className="h-4 w-4 text-white" />
                                </div>
                                <div className="bg-red-500 text-white px-4 py-2 rounded-lg flex-1">
                                  <p className="text-sm font-medium m-0">
                                    Manual override: This stop is included in your plan. Exact timing may shift from the optimized route.
                                  </p>
                                </div>
                              </div>
                            )}

                            {/* Activities List */}
                            {segment.activities && segment.activities.length > 0 && (
                              <div className="ml-0 sm:ml-8 mt-2 border-t border-[#e5d9f2] pt-4">
                                <h5 className="font-semibold text-[#4a4260] mb-3">Activity</h5>
                                <div className="space-y-3">
                                  {segment.activities.map((activity) => (
                                    <div
                                      key={activity.id}
                                      className="border-l-2 border-dashed border-[#d546ab] pl-4"
                                    >
                                      <div className="bg-white rounded-lg p-4 shadow-sm border border-[#e5d9f2]">
                                        <div className="flex flex-col sm:flex-row gap-4">
                                          <div className="flex-1">
                                            <div className="flex items-start justify-between">
                                              <h6 className="font-semibold text-[#4a4260] mb-2">
                                                {activity.title}
                                              </h6>
                                              <button
                                                className="text-red-500 hover:text-red-700 p-1"
                                                title="Delete Activity"
                                                aria-label={`Delete activity ${activity.title}`}
                                                onClick={() =>
                                                  openDeleteActivityModal(
                                                    itinerary.planId || 0,
                                                    day.id,
                                                    activity.id,
                                                    activity.title
                                                  )
                                                }
                                              >
                                                <Trash2 className="h-4 w-4" />
                                              </button>
                                            </div>
                                            <p className="text-sm text-[#6c6c6c] mb-3">
                                              {activity.description}
                                            </p>
                                            <div className="flex flex-wrap gap-4 text-xs text-[#6c6c6c]">
                                              {activity.startTime && activity.endTime && (
                                                <span className="flex items-center font-semibold text-[#d546ab]">
                                                  <Clock className="h-3 w-3 mr-1" />
                                                  {activity.startTime} – {activity.endTime}
                                                </span>
                                              )}
                                              {activity.amount > 0 && (
                                                <span className="flex items-center">
                                                  <Ticket className="h-3 w-3 mr-1" />
                                                  ₹ {activity.amount.toFixed(2)}
                                                </span>
                                              )}
                                              {activity.duration && (
                                                <span className="flex items-center">
                                                  <Clock className="h-3 w-3 mr-1" />
                                                  {activity.duration}
                                                </span>
                                              )}
                                            </div>
                                          </div>
                                          {/* Activity thumbnail with overlaid gallery icon */}
                                          <div className="relative flex-shrink-0">
                                            <img
                                              src={
                                                toImgSrc(activity.image) ||
                                                "https://placehold.co/140x100/e9d5f7/4a4260?text=Activity"
                                              }
                                              alt={activity.title}
                                              className="rounded-lg object-cover w-[120px] h-[86px] sm:w-[140px] sm:h-[100px]"
                                            />
                                            <div className="absolute top-1 right-1 flex flex-col gap-1">
                                              <button
                                                title="Click to View the Images"
                                                className="bg-white/80 hover:bg-white rounded-full p-1 shadow"
                                                onClick={() =>
                                                  openGalleryModal(
                                                    activity.galleryImages && activity.galleryImages.length > 0
                                                      ? activity.galleryImages
                                                      : activity.image ? [activity.image] : [],
                                                    activity.title
                                                  )
                                                }
                                              >
                                                🖼️
                                              </button>
                                            </div>
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </>
                        )}

                        {segment.type === "break" && (
                          <div className="bg-[#fff3cd] rounded-lg p-3 mb-3 border border-[#ffc107]">
                            <div className="flex items-center gap-3">
                              <Clock className="h-5 w-5 text-[#856404]" />
                              <div className="flex-1">
                                <p className="text-sm text-[#4a4260]">
                                  <span className="font-medium">Expect a waiting time of approximately</span>{" "}
                                  <span className="text-[#d546ab] font-semibold">{segment.duration}</span>{" "}
                                  <span className="font-medium">at this location</span>{" "}
                                  <span className="text-[#d546ab] font-semibold">({segment.location})</span>
                                </p>
                                <div className="flex flex-wrap gap-4 mt-2 text-xs text-[#6c6c6c]">
                                  <span>
                                    <Clock className="inline h-3 w-3 mr-1" />
                                    {segment.timeRange}
                                  </span>
                                  <span>⏱ {segment.duration}</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        )}

                        {segment.type === "checkin" && (() => {
                          // Get actual hotel name from API data instead of backend generic "Hotel"
                          const hotelMeta = selectedHotelMetaByRoute.get(day.id);
                          const actualHotelName = hotelMeta?.hotelName || segment.hotelName || "Hotel";
                          const hotelForDay = hotelDetails?.hotels?.find(h =>
                            h.itineraryRouteId === day.id
                          );
                          const hotelAddress = hotelForDay?.hotelAddress || segment.hotelAddress;

                          return (
                            <div className="bg-[#e8f9fd] rounded-lg p-3 mb-3 border border-[#4ba3c3]">
                              <div className="flex items-center gap-3">
                                <Building2 className="h-6 w-6 text-[#4ba3c3]" />
                                <div
                                  className={`flex-1 rounded-lg p-2 -m-2 transition-colors ${readOnly ? '' : 'cursor-pointer hover:bg-white/50'}`}
                                  onClick={() => {
                                    if (readOnly) return;
                                    // Get city code from hotel details if available, otherwise use default
                                    let cityCode = "1"; // Default city code
                                    if (hotelForDay?.destination) {
                                      // Try to map destination to code or use as-is
                                      const cityMap: { [key: string]: string } = {
                                        'Delhi': '1',
                                        'Agra': '2',
                                        'Jaipur': '3',
                                        'New Delhi': '1',
                                        'Mumbai': '4',
                                        'Bangalore': '5',
                                      };
                                      cityCode = cityMap[hotelForDay.destination] || "1";
                                    }

                                    openHotelSelectionModal(
                                      itinerary.planId || 0,
                                      day.id,
                                      day.date,
                                      cityCode,
                                      day.arrival || "Hotel"
                                    );
                                  }}
                                >
                                  <p className="text-sm font-semibold text-[#4a4260] mb-1">
                                    Check-in to {actualHotelName}
                                  </p>
                                  {hotelAddress && (
                                    <p className="text-xs text-[#6c6c6c] mb-2">
                                      {hotelAddress}
                                    </p>
                                  )}
                                  {segment.time && (
                                    <p className="text-xs text-[#6c6c6c]">
                                      <Clock className="inline h-3 w-3 mr-1" />
                                      {segment.time}
                                    </p>
                                  )}
                                  {!readOnly && (
                                    <p className="text-xs text-[#d546ab] mt-2">
                                      Click to change hotel
                                    </p>
                                  )}
                                </div>

                                {/* Room Category Selection Button */}
                                {!readOnly && (
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 rounded-full bg-[#d546ab]/10 hover:bg-[#d546ab]/20 text-[#d546ab] shrink-0"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      // For confirmed itineraries, only show hotels that are actually confirmed (itineraryPlanHotelDetailsId > 0)
                                      const confirmedHotels = hotelDetails?.hotels?.filter(h =>
                                        itinerary?.isConfirmed ? h.itineraryPlanHotelDetailsId > 0 : true
                                      );
                                      const hotelForDay = confirmedHotels?.find(h =>
                                        h.itineraryRouteId === day.id
                                      );

                                      if (hotelForDay) {
                                        setRoomSelectionModal({
                                          open: true,
                                          itinerary_plan_hotel_details_ID: hotelForDay.itineraryPlanHotelDetailsId,
                                          itinerary_plan_id: itinerary.planId || 0,
                                          itinerary_route_id: day.id,
                                          hotel_id: hotelForDay.hotelId,
                                          group_type: hotelForDay.groupType,
                                          hotel_name: hotelForDay.hotelName || segment.hotelName,
                                        });
                                      } else {
                                        toast.error('Hotel information not available');
                                      }
                                    }}
                                    title="Select room categories"
                                  >
                                    <Edit className="h-4 w-4" />
                                  </Button>
                                )}
                              </div>
                            </div>
                          );
                        })()}

                        {segment.type === "return" && (
                          <div className="flex items-center gap-3 text-sm text-[#6c6c6c]">
                            <Car className="h-5 w-5" />
                            <div>
                              <p className="font-medium text-[#4a4260]">
                                Return to Origin and Relax
                              </p>
                              <p>
                                <Clock className="inline h-3 w-3 mr-1" />
                                {segment.time}
                                {segment.note && (
                                  <span className="ml-2">🔘 {segment.note}</span>
                                )}
                              </p>
                            </div>
                          </div>
                        )}
                      </div>{/* end timeline row wrapper */}
                    </div>
                  ))}


                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
      {/* Hotel List (separate component) */}
      {shouldShowHotels && loadingHotels && (
        <div ref={hotelListRef} id="hotel-list-section">
          <Card className="border border-[#e5d9f2] bg-white">
            <CardContent className="py-10 flex items-center justify-center gap-3 text-[#6c6c6c]">
              <Loader2 className="h-5 w-5 animate-spin text-[#d546ab]" />
              <span>Loading hotel list for all days...</span>
            </CardContent>
          </Card>
        </div>
      )}

      {shouldShowHotels && !loadingHotels && hotelDetails && (
        <div ref={hotelListRef} id="hotel-list-section">
          <HotelList
            hotels={hotelDetails.hotels}
            hotelTabs={hotelDetails.hotelTabs}
            hotelRatesVisible={hotelDetails.hotelRatesVisible}
            roomCount={Number(itinerary.roomCount || 1)}
            onTotalChange={(total) => setActiveHotelListTotal(Number(total || 0))}
            onToggleHotelRates={(visible) => setClipboardRatesVisible(visible)}
            hotelAvailability={hotelDetails.hotelAvailability}
            quoteId={quoteId!}
            planId={itinerary.planId}
            onRefresh={refreshHotelData}
            onGroupTypeChange={handleHotelGroupTypeChange}
            onGetSaveFunction={handleGetSaveFunction}
            readOnly={readOnly}
            onCreateVoucher={handleCreateVoucher}
            onCancelVoucher={handleCancelVoucherSingle}
            onBulkCancelVouchers={handleCancelVoucherItems}
            onHotelSelectionsChange={handleHotelSelectionsChange}
            pagination={hotelDetails.pagination}
            routePagination={hotelDetails.routePagination}
            onLoadMore={handleHotelLoadMore}
            isLoadingMore={isLoadingMoreHotels}
            mealPlanCode={itinerary?.meal_plan_code}
            dayDestinationFallback={
              itinerary?.days?.reduce<Record<number, string>>((acc, day) => {
                const fallback = String(day.arrival || day.departure || '').trim();
                if (fallback) {
                  acc[Number(day.dayNumber)] = fallback;
                }
                return acc;
              }, {}) || {}
            }
          />
        </div>
      )}

      {/* Vehicle List (grouped by vehicle type) */}
      {shouldShowVehicles && itinerary.vehicles && itinerary.vehicles.length > 0 && (() => {
        // Group vehicles by vehicleTypeId
        const vehiclesByType = new Map<number, typeof itinerary.vehicles>();
        const typeOrder: number[] = [];

        for (const vehicle of itinerary.vehicles) {
          const typeId = vehicle.vehicleTypeId || 0;
          if (!vehiclesByType.has(typeId)) {
            vehiclesByType.set(typeId, []);
            typeOrder.push(typeId);
          }
          vehiclesByType.get(typeId)?.push(vehicle);
        }

        // Prepare date range and routes for day-wise breakdown
        const dateRange = itinerary.dateRange || "";
        const routes = itinerary.days?.map((day) => ({
          date: day.date,
          destination: day.departure || "",
          label: `Day ${day.dayNumber} - ${day.date ? new Date(day.date).toLocaleDateString('en-GB', { month: 'short', day: '2-digit' }) : ""}`,
        })) || [];

        return (
          <div ref={vehicleListRef} id="vehicle-list-section">
            {typeOrder.map((typeId) => {
              const vehiclesForType = vehiclesByType.get(typeId) || [];
              const firstVehicle = vehiclesForType[0];
              const vehicleTypeLabel = firstVehicle?.vehicleTypeName || `Vehicle Type ${typeId}`;

              return (
                <VehicleList
                  key={typeId}
                  vehicleTypeId={typeId}
                  vehicleTypeLabel={vehicleTypeLabel}
                  vehicles={vehiclesForType}
                  itineraryPlanId={itinerary.planId}
                  onRefresh={refreshVehicleData}
                  onSelectedTotalChange={handleVehicleSelectedTotalChange}
                  dateRange={dateRange}
                  routes={routes}
                />
              );
            })}
          </div>
        );
      })()}

      {shouldShowVehicles && (!itinerary.vehicles || itinerary.vehicles.length === 0) && (
        <div ref={vehicleListRef} id="vehicle-list-section">
          <Card className="border border-[#e5d9f2] bg-white">
            <CardContent className="py-10 px-6">
              {(vehicleBuildStatus?.status === "PENDING" ||
                vehicleBuildStatus?.status === "PROCESSING" ||
                !vehicleBuildStatus) && (
                <div className="flex items-center justify-center gap-3 text-[#6c6c6c]">
                  <Loader2 className="h-5 w-5 animate-spin text-[#d546ab]" />
                  <span>Building vehicle list. Please wait...</span>
                </div>
              )}

              {vehicleBuildStatus?.status === "FAILED" && (
                <div className="flex flex-col items-center gap-3 text-center text-[#6c6c6c]">
                  <div className="flex items-center gap-2 text-[#c53030]">
                    <AlertTriangle className="h-5 w-5" />
                    <span>Vehicle build failed.</span>
                  </div>
                  {vehicleBuildStatus.error && (
                    <p className="text-xs text-[#8a8a8a] max-w-[800px] break-words">
                      {vehicleBuildStatus.error}
                    </p>
                  )}
                  <Button
                    type="button"
                    onClick={handleRetryVehicleBuild}
                    disabled={isRetryingVehicleBuild}
                    className="bg-[#d546ab] hover:bg-[#bb3a94]"
                  >
                    {isRetryingVehicleBuild ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Retrying...
                      </>
                    ) : (
                      "Retry Vehicle Build"
                    )}
                  </Button>
                </div>
              )}

              {vehicleBuildStatus?.status === "READY" && (
                <div className="text-center text-[#6c6c6c]">No Vehicle available</div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Package Includes & Overall Cost */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Package Includes */}
        <Card className="border-none shadow-none bg-white">
          <CardContent className="pt-2">
            <h2 className="text-lg font-semibold text-[#4a4260] mb-4">
              Package Includes
            </h2>
            <div className="space-y-3 text-sm text-[#6c6c6c]">
              <div>
                <p className="font-medium text-[#4a4260] mb-1">
                  Package Includes: (Inclusion)
                </p>
                <p>{itinerary.packageIncludes.description}</p>
              </div>
              <div>
                <p className="font-medium text-[#4a4260] mb-1">
                  If staying in the House boat At Alleppey/Kumarakom
                </p>
                <p className="whitespace-pre-line">
                  {itinerary.packageIncludes.houseBoatNote}
                </p>
              </div>
              <div>
                <p className="font-medium text-[#4a4260]">
                  {itinerary.packageIncludes.rateNote}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Overall Cost */}
        <Card className="border-none shadow-none bg-gradient-to-br from-[#faf5ff] to-white">
          <CardContent className="pt-2">
            <h2 className="text-lg font-semibold text-[#4a4260] mb-4">
              OVERALL COST
            </h2>
            <div className="space-y-2 text-sm">
              {/* ── Hotel Cost Group ── */}
              {shouldShowHotels && (() => {
                const roomTotal = Number(financialTotals.hotelAmount || 0);
                const hotelRoomNights = Math.max(Number(roomBreakdownRoomNights || 0), 1);
                const roomNightsLabel = `${hotelRoomNights} room-night${hotelRoomNights > 1 ? 's' : ''}`;

                return (
                  <Popover
                    open={isRoomCostPopoverOpen && selectedHotelMetaByRoute.size > 0 && clipboardRatesVisible}
                    onOpenChange={(open) => {
                      if (!open) setIsRoomCostPopoverOpen(false);
                    }}
                  >
                    <PopoverTrigger asChild>
                      <div
                        className="flex justify-between cursor-pointer"
                        onClick={(e) => {
                          e.preventDefault();
                        }}
                        onMouseEnter={() => selectedHotelMetaByRoute.size > 0 && clipboardRatesVisible && setIsRoomCostPopoverOpen(true)}
                        onMouseLeave={() => setIsRoomCostPopoverOpen(false)}
                      >
                        <div className="flex items-center">
                          <span className="text-[#6c6c6c]">Total Hotel Cost For ({roomNightsLabel})</span>
                          {selectedHotelMetaByRoute.size > 0 && clipboardRatesVisible && (
                            <span className="ml-1 inline-flex h-4 w-4 items-center justify-center text-[11px] leading-none">▶️</span>
                          )}
                        </div>
                        <span className="text-[#4a4260]">₹ {roomTotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                      </div>
                    </PopoverTrigger>
                    <PopoverContent
                      className="w-80 bg-white border border-[#ddd5e8] shadow-lg rounded-lg p-4"
                      align="end"
                      onMouseEnter={() => setIsRoomCostPopoverOpen(true)}
                      onMouseLeave={() => setIsRoomCostPopoverOpen(false)}
                    >
                      <div className="space-y-2 text-sm">
                        {Array.from(selectedHotelMetaByRoute.entries()).map(([routeId, meta]) => (
                          <div key={routeId} className="flex justify-between text-[#6c6c6c]">
                            <span>{meta.hotelName}{Number(meta.noOfRooms || 1) > 1 ? ` * ${Number(meta.noOfRooms)} rooms` : ''}</span>
                            <span className="font-medium text-[#4a4260]">₹ {Number(meta.totalAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                          </div>
                        ))}
                        <div className="border-t border-[#ddd5e8] pt-2 mt-2 flex justify-between font-semibold text-[#4a4260]">
                          <span>Total Hotel Cost</span>
                          <span>₹ {roomTotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                        </div>
                      </div>
                    </PopoverContent>
                  </Popover>
                );
              })()}
              {itinerary.costBreakdown.totalAmenitiesCost !== undefined && itinerary.costBreakdown.totalAmenitiesCost > 0 && (
                <div className="flex justify-between">
                  <span className="text-[#6c6c6c]">Total Amenities Cost</span>
                  <span className="text-[#4a4260]">₹ {itinerary.costBreakdown.totalAmenitiesCost.toFixed(2)}</span>
                </div>
              )}
              {(Number(itinerary.extraBed || 0) > 0 || Number(itinerary.costBreakdown.extraBedCost || 0) > 0) && (
                <div className="flex justify-between">
                  <span className="text-[#6c6c6c]">Extra Bed Cost ({itinerary.extraBed || 0})</span>
                  <span className="text-[#4a4260]">₹ {Number(itinerary.costBreakdown.extraBedCost || 0).toFixed(2)}</span>
                </div>
              )}
              {(Number(itinerary.childWithBed || 0) > 0 || Number(itinerary.costBreakdown.childWithBedCost || 0) > 0) && (
                <div className="flex justify-between">
                  <span className="text-[#6c6c6c]">Child With Bed Cost ({itinerary.childWithBed || 0})</span>
                  <span className="text-[#4a4260]">₹ {Number(itinerary.costBreakdown.childWithBedCost || 0).toFixed(2)}</span>
                </div>
              )}
              {itinerary.costBreakdown.childWithoutBedCost !== undefined && itinerary.costBreakdown.childWithoutBedCost > 0 && (
                <div className="flex justify-between">
                  <span className="text-[#6c6c6c]">Child Without Bed Cost ({itinerary.childWithoutBed || 0})</span>
                  <span className="text-[#4a4260]">₹ {itinerary.costBreakdown.childWithoutBedCost.toFixed(2)}</span>
                </div>
              )}


              {/* ── Vehicle Cost Group ── */}
{shouldShowVehicles && computedVehicleAmount > 0 && (
  <div className="flex justify-between">
    <span className="text-[#6c6c6c]">
      Total Vehicle Cost{computedVehicleQty ? ` (${computedVehicleQty})` : ''}
    </span>
    <span className="text-[#4a4260]">₹ {computedVehicleAmount.toFixed(2)}</span>
  </div>
)}

              {/* ── Guide / Activity / Hotspot ── */}
              {itinerary.costBreakdown.totalGuideCost !== undefined && itinerary.costBreakdown.totalGuideCost > 0 && (
                <div className="flex justify-between">
                  <span className="text-[#6c6c6c]">Total Guide Cost</span>
                  <span className="text-[#4a4260]">₹ {itinerary.costBreakdown.totalGuideCost.toFixed(2)}</span>
                </div>
              )}
              {itinerary.costBreakdown.totalHotspotCost !== undefined && itinerary.costBreakdown.totalHotspotCost > 0 && (
                <div className="flex justify-between">
                  <span className="text-[#6c6c6c]">Total Hotspot Cost</span>
                  <span className="text-[#4a4260]">₹ {itinerary.costBreakdown.totalHotspotCost.toFixed(2)}</span>
                </div>
              )}
              {itinerary.costBreakdown.totalActivityCost !== undefined && itinerary.costBreakdown.totalActivityCost > 0 && (
                <div className="flex justify-between">
                  <span className="text-[#6c6c6c]">Total Activity Cost</span>
                  <span className="text-[#4a4260]">₹ {itinerary.costBreakdown.totalActivityCost.toFixed(2)}</span>
                </div>
              )}
              {itinerary.costBreakdown.additionalMargin !== undefined && itinerary.costBreakdown.additionalMargin > 0 && (
                <div className="flex justify-between">
                  <span className="text-[#6c6c6c]">Total Additional Margin (10%)</span>
                  <span className="text-[#4a4260]">₹ {itinerary.costBreakdown.additionalMargin.toFixed(2)}</span>
                </div>
              )}

              {/* ── Total Amount ── */}
              <div className="border-t border-[#e5d9f2] pt-3 mt-1">
                <div className="flex justify-between font-semibold">
                  <span className="text-[#4a4260]">Total Amount</span>
                  <span className="text-[#4a4260]">₹ {financialTotals.totalAmount.toFixed(2)}</span>
                </div>
              </div>

              {/* ── Discounts / Adjustments (only when non-zero) ── */}
              {(itinerary.costBreakdown.couponDiscount ?? 0) > 0 && (
                <div className="flex justify-between text-[#d546ab]">
                  <span>Coupon Discount</span>
                  <span>- ₹ {itinerary.costBreakdown.couponDiscount!.toFixed(2)}</span>
                </div>
              )}
              {(itinerary.costBreakdown.agentMargin ?? 0) > 0 && (
                <div className="flex justify-between">
                  <span className="text-[#6c6c6c]">Agent Margin</span>
                  <span className="text-[#4a4260]">₹ {itinerary.costBreakdown.agentMargin!.toFixed(2)}</span>
                </div>
              )}

              {/* ── Net Payable ── */}
              <div className="border-t border-[#e5d9f2] pt-2 mt-1 space-y-1">
                <div className="flex justify-between text-[#6c6c6c]">
                  <span>Total Round Off</span>
                  <span>
                    {(financialTotals.totalRoundOff ?? 0) > 0 ? "+ " : ""}₹ {financialTotals.totalRoundOff.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between text-base font-bold pt-1">
                  <span className="text-[#4a4260]">
                    Net Payable To {itinerary.costBreakdown.companyName || "Doview Holidays India Pvt ltd"}
                  </span>
                  <span className="text-[#4a4260]">₹ {financialTotals.netPayable.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-wrap gap-3 justify-center">
       {/* Clipboard Dropdown */}
{itineraryPreference === 2 ? (
  <Button
    className="bg-[#8b43d1] hover:bg-[#7c37c1] focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#8b43d1]"
    onClick={handleVehicleOnlyClipboardCopy}
  >
    Clipboard
  </Button>
) : (
  <div className="relative group">
    <Button className="bg-[#8b43d1] hover:bg-[#7c37c1] focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#8b43d1]">
      Clipboard ▼
    </Button>
    <div className="absolute left-0 mt-1 w-56 max-w-[80vw] bg-white border border-gray-200 rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible group-focus-within:opacity-100 group-focus-within:visible transition-all duration-200 z-50">
      <button
        className="w-full text-left px-4 py-2 hover:bg-[#f8f5fc] text-[#4a4260] flex items-center gap-2"
        onClick={() => {
          setClipboardType('recommended');
          setSelectedHotels(buildDefaultClipboardSelection());
          setClipboardModal(true);
        }}
      >
        <span>📋</span> Copy Recommended
      </button>
      <button
        className="w-full text-left px-4 py-2 hover:bg-[#f8f5fc] text-[#4a4260] flex items-center gap-2"
        onClick={() => {
          setClipboardType('highlights');
          setSelectedHotels(buildDefaultClipboardSelection());
          setClipboardModal(true);
        }}
      >
        <span>✨</span> Copy to Highlights
      </button>
      <button
        className="w-full text-left px-4 py-2 hover:bg-[#f8f5fc] text-[#4a4260] flex items-center gap-2 rounded-b-lg"
        onClick={() => {
          setClipboardType('para');
          setSelectedHotels(buildDefaultClipboardSelection());
          setClipboardModal(true);
        }}
      >
        <span>📝</span> Copy to Para
      </button>
    </div>
  </div>
)}

        <Link to="/create-itinerary">
          <Button className="bg-[#28a745] hover:bg-[#218838]">
            Create Itinerary
          </Button>
        </Link>

        <Button
          variant="outline"
          className="border-[#dc3545] text-[#dc3545] hover:bg-[#dc3545] hover:text-white"
          onClick={() => setCancelModalOpen(true)}
        >
          <Trash2 className="mr-2 h-4 w-4" />
          Modify Itinerary
        </Button>

        <Button
          className="bg-[#d546ab] hover:bg-[#c03d9f]"
          onClick={openConfirmQuotationModal}
          disabled={isOpeningConfirmQuotation}
        >
          {isOpeningConfirmQuotation ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Loading Prebook...
            </>
          ) : (
            <>
              <Bell className="mr-2 h-4 w-4" />
              Confirm Quotation
            </>
          )}
        </Button>

        {/* Share Dropdown */}
        <div className="relative group">
          <Button className="bg-[#17a2b8] hover:bg-[#138496] focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#17a2b8]">
            Share ▼
          </Button>
          <div className="absolute left-0 mt-1 w-56 max-w-[80vw] bg-white border border-gray-200 rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible group-focus-within:opacity-100 group-focus-within:visible transition-all duration-200 z-50">
            <button
              className="w-full text-left px-4 py-2 hover:bg-[#f8f5fc] text-[#4a4260] flex items-center gap-2"
              onClick={() => {
                const url = window.location.href;
                navigator.clipboard.writeText(url);
                toast.success("Link copied to clipboard!");
              }}
            >
              <span>🔗</span> Copy Link
            </button>
            <button
              className="w-full text-left px-4 py-2 hover:bg-[#f8f5fc] text-[#4a4260] flex items-center gap-2"
              onClick={() => {
                const url = window.location.href;
                const message = `Check out this itinerary: ${url}`;
                window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank');
              }}
            >
              <span>💬</span> Share on WhatsApp
            </button>
            <button
              className="w-full text-left px-4 py-2 hover:bg-[#f8f5fc] text-[#4a4260] flex items-center gap-2 rounded-b-lg"
              onClick={() => setShareModal(true)}
            >
              <span>✉️</span> Share via Email
            </button>
          </div>
        </div>
      </div>

      <div className="buy-now">
        <button
          id="scrollToTopButton"
          type="button"
          aria-label="Back to top"
          title="Back to top"
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          className="fixed bottom-12 right-3 z-[1080] inline-flex h-10 w-10 items-center justify-center rounded-md bg-[#7367f0] text-white shadow-[0_1px_20px_1px_#ea5455] transition-shadow hover:shadow-none"
        >
          <ArrowUp className="h-4 w-4" />
        </button>
      </div>

      {/* Delete Hotspot Modal */}
      <Dialog
        open={deleteHotspotModal.open}
        onOpenChange={(open) =>
          setDeleteHotspotModal({ ...deleteHotspotModal, open })
        }
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete Hotspot</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{deleteHotspotModal.hotspotName}"?
              This will also remove all associated activities.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() =>
                setDeleteHotspotModal({
                  open: false,
                  planId: null,
                  routeId: null,
                  hotspotId: null,
                  hotspotName: "",
                  hotspotWasPrebuilt: false,
                })
              }
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteHotspot}
              disabled={isDeleting}
            >
              {isDeleting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                "Delete"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Activity Modal */}
      <Dialog
        open={addActivityModal.open}
        onOpenChange={(open) =>
          setAddActivityModal({ ...addActivityModal, open })
        }
      >
        <DialogContent className="w-[96vw] sm:max-w-5xl h-[85vh] flex flex-col overflow-hidden p-4 sm:p-6">
          <DialogHeader className="shrink-0">
            <DialogTitle>Add Activity to {addActivityModal.hotspotName}</DialogTitle>
            <DialogDescription>
              Select an activity on the left to preview fit and day impact.
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 min-h-0 overflow-hidden py-2">
            <div className="h-full flex flex-col lg:flex-row gap-4 min-h-0">
              <div className="w-full lg:w-1/2 flex flex-col min-h-0 lg:border-r border-[#e5d9f2] lg:pr-4 pb-3 lg:pb-0 border-b lg:border-b-0">
                <div className="text-sm font-semibold text-[#4a4260] pb-2">
                  Available Activities
                </div>
                <div className="flex-1 overflow-y-auto space-y-2">
                  {loadingActivities && (
                    <p className="text-sm text-[#6c6c6c] text-center py-8">
                      Loading activities...
                    </p>
                  )}

                  {!loadingActivities && availableActivities.length === 0 && (
                    <p className="text-sm text-[#6c6c6c] text-center py-8">
                      No activities available for this hotspot
                    </p>
                  )}

                  {!loadingActivities && availableActivities.length > 0 && (
                    <div className="space-y-2">
                      {availableActivities.map((activity) => (
                        <button
                          key={activity.id}
                          type="button"
                          onClick={() => handlePreviewActivity(activity.id)}
                          className={`w-full rounded-lg border-2 p-3 text-left transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#d546ab] focus-visible:ring-offset-2 ${activityPreview?.activity?.id === activity.id
                              ? 'border-[#d546ab] bg-[#f7edf6]'
                              : 'border-[#e5d9f2] bg-white hover:bg-[#faf7fc]'
                            }`}
                          disabled={isAddingActivity}
                        >
                          <div className="font-semibold text-[#4a4260] text-sm">
                            {activity.title}
                          </div>
                          <div className="mt-1 text-xs text-[#6c6c6c] line-clamp-2">
                            {activity.description}
                          </div>
                          <div className="mt-2 flex flex-wrap gap-3 text-xs text-[#6c6c6c]">
                            {activity.duration && <span>Duration: {formatActivityDuration(activity.duration)}</span>}
                            {activity.costAdult > 0 && <span>Adult: ₹{activity.costAdult.toFixed(2)}</span>}
                            {activity.costChild > 0 && <span>Child: ₹{activity.costChild.toFixed(2)}</span>}
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="w-full lg:w-1/2 flex flex-col min-h-0 lg:pl-2">
                <div className="flex items-center justify-between gap-2 pb-2">
                  <div className="text-sm font-semibold text-[#4a4260]">
                    Preview
                  </div>
                  {activityPreview?.activity?.id && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-[#d546ab] border-[#d546ab] hover:bg-[#d546ab] hover:text-white"
                      onClick={() => handleOpenPreviewAllHotspots(activityPreview.activity.id)}
                      disabled={isAddingActivity}
                    >
                      Preview All Hotspots
                    </Button>
                  )}
                </div>

                {previewingActivityId && (
                  <div className="flex-1 flex items-center justify-center">
                    <Loader2 className="h-6 w-6 animate-spin text-[#d546ab]" />
                  </div>
                )}

                {!previewingActivityId && !activityPreview && (
                  <div className="flex-1 flex items-center justify-center rounded-lg border border-dashed border-[#e5d9f2] text-center text-sm text-[#6c6c6c]">
                    Click an activity on the left to see whether it fits.
                  </div>
                )}

                {!previewingActivityId && activityPreview && (
                  <div className="flex-1 overflow-y-auto space-y-4" aria-live="polite">
                    <div>
                      <div className="font-semibold text-[#4a4260]">
                        {activityPreview.activity?.title}
                      </div>
                      <div className="mt-1 text-xs text-[#6c6c6c]">
                        Duration: {formatActivityDuration(activityPreview.activity?.duration)}
                      </div>
                    </div>

                    {/* ① Placement */}
                    <div className="rounded-lg border border-[#e5d9f2] bg-[#faf7fc] p-3 space-y-2">
                      <div className="text-xs font-semibold text-[#4a4260] uppercase tracking-wide">① Placement</div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-[#6c6c6c]">Hotspot Window</span>
                        <span className="font-medium text-[#4a4260]">
                          {formatPreviewTime(activityPreview.hotspotTiming?.startTime)} – {formatPreviewTime(activityPreview.hotspotTiming?.endTime)}
                        </span>
                      </div>
                      {activityPreview.proposedTiming && (
                        <>
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-[#6c6c6c]">Inserted At</span>
                            <span className="font-semibold text-[#d546ab]">
                              {formatPreviewTime(activityPreview.proposedTiming.startTime)} – {formatPreviewTime(activityPreview.proposedTiming.endTime)}
                            </span>
                          </div>
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-[#6c6c6c]">Position</span>
                            <span className="font-medium text-[#4a4260]">#{activityPreview.proposedTiming.order}</span>
                          </div>
                        </>
                      )}
                    </div>

                    {/* ② Hotspot Impact */}
                    <div className={`rounded-lg border-2 p-3 ${activityPreview.hasConflicts
                        ? 'border-red-300 bg-red-50'
                        : activityPreview.proposedTiming?.willExtendHotspot
                          ? 'border-amber-300 bg-amber-50'
                          : 'border-green-300 bg-green-50'
                      }`}>
                      <div className="text-xs font-semibold uppercase tracking-wide mb-2">
                        <span className={
                          activityPreview.hasConflicts ? 'text-red-700'
                            : activityPreview.proposedTiming?.willExtendHotspot ? 'text-amber-700'
                              : 'text-green-700'
                        }>
                          ② Hotspot Impact — {
                            activityPreview.hasConflicts ? '⛔ Conflict'
                              : activityPreview.proposedTiming?.willExtendHotspot ? '⚠️ Extends Window'
                                : '✅ Fits within window'
                          }
                        </span>
                      </div>
                      {activityPreview.proposedTiming?.willExtendHotspot && !activityPreview.hasConflicts && (
                        <div className="text-xs text-amber-800">
                          Hotspot end time shifts from{' '}
                          <span className="font-semibold">{formatPreviewTime(activityPreview.hotspotTiming?.endTime)}</span>
                          {' '}→{' '}
                          <span className="font-semibold">{formatPreviewTime(activityPreview.proposedTiming.endTime)}</span>
                          {' '}(+{activityPreview.cascade?.shiftMinutes ?? 0} min)
                        </div>
                      )}
                      {activityPreview.hasConflicts && activityPreview.conflicts?.length > 0 && (
                        <div className="space-y-1 text-xs text-red-700 mt-1">
                          {activityPreview.conflicts.map((conflict: any, idx: number) => (
                            <div key={idx}>• {conflict.reason}</div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* ③ Day Cascade */}
                    {activityPreview.cascade?.shiftMinutes > 0 && activityPreview.cascade?.affectedSegments?.length > 0 && (
                      <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 space-y-2">
                        <div className="text-xs font-semibold text-amber-800 uppercase tracking-wide">
                          ③ Day Cascade — everything after shifts +{activityPreview.cascade.shiftMinutes} min
                        </div>
                        <div className="space-y-1 max-h-36 overflow-y-auto pr-1">
                          {activityPreview.cascade.affectedSegments.map((seg: any, idx: number) => (
                            <div key={idx} className="flex items-center gap-2 text-xs py-1 border-b border-amber-100 last:border-0">
                              <span className={`shrink-0 w-16 text-center rounded px-1 py-0.5 font-medium ${seg.type === 'travel' ? 'bg-blue-100 text-blue-700'
                                  : seg.type === 'break' ? 'bg-yellow-100 text-yellow-700'
                                    : seg.type === 'hotel' ? 'bg-purple-100 text-purple-700'
                                      : seg.type === 'return' ? 'bg-gray-100 text-gray-700'
                                        : 'bg-pink-100 text-pink-700'
                                }`}>
                                {seg.type === 'travel' ? '🚌 Travel'
                                  : seg.type === 'break' ? '⏸ Break'
                                    : seg.type === 'hotel' ? '🏨 Hotel'
                                      : seg.type === 'return' ? '🔄 Return'
                                        : '📍 Place'}
                              </span>
                              <span className="flex-1 font-medium text-[#4a4260] truncate">{seg.name}</span>
                              <span className="shrink-0 text-[#6c6c6c] line-through">{formatPreviewTime(seg.oldStartTime)}</span>
                              <span className="shrink-0 text-amber-700 font-semibold">{formatPreviewTime(seg.newStartTime)}</span>
                            </div>
                          ))}
                        </div>
                        <div className="flex justify-between text-xs pt-1 border-t border-amber-200">
                          <span className="text-[#6c6c6c]">Day ends</span>
                          <span>
                            <span className="line-through text-[#6c6c6c] mr-2">{formatPreviewTime(activityPreview.cascade.originalDayEndTime)}</span>
                            <span className="font-semibold text-amber-800">{formatPreviewTime(activityPreview.cascade.newDayEndTime)}</span>
                          </span>
                        </div>
                      </div>
                    )}

                    {activityPreview.cascade?.shiftMinutes === 0 && (
                      <div className="rounded-lg border border-green-200 bg-green-50 p-3 text-xs text-green-700">
                        ③ Day Cascade — <span className="font-semibold">No downstream impact.</span> Activity fits within the existing hotspot window.
                      </div>
                    )}

                    <Button
                      className="w-full bg-[#d546ab] hover:bg-[#c03d9f] shrink-0"
                      onClick={() => {
                        const selectedActivity = availableActivities.find(
                          (activity) => activity.id === activityPreview.activity?.id,
                        );
                        handleAddActivity(
                          activityPreview.activity?.id,
                          selectedActivity?.costAdult || 0,
                        );
                      }}
                      disabled={isAddingActivity}
                    >
                      {isAddingActivity ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Adding...
                        </>
                      ) : (
                        'Add Activity'
                      )}
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() =>
                setAddActivityModal({
                  open: false,
                  planId: null,
                  routeId: null,
                  routeHotspotId: null,
                  hotspotId: null,
                  hotspotName: '',
                })
              }
              disabled={isAddingActivity}
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Activity Modal */}
      <Dialog
        open={deleteActivityModal.open}
        onOpenChange={(open) =>
          setDeleteActivityModal({ ...deleteActivityModal, open })
        }
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete Activity</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{deleteActivityModal.activityName}"?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() =>
                setDeleteActivityModal({
                  open: false,
                  planId: null,
                  routeId: null,
                  activityId: null,
                  activityName: '',
                })
              }
              disabled={isDeletingActivity}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteActivity}
              disabled={isDeletingActivity}
            >
              {isDeletingActivity ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                'Delete'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Hotspot Modal */}
      <Dialog
        open={addHotspotModal.open}
        onOpenChange={(open) => {
          if (!open) {
            setAddHotspotModal({
              open: false,
              planId: null,
              routeId: null,
              locationId: null,
              locationName: "",
            });
            setHotspotSearchQuery("");
            setPreviewTimelinesByHotspot({});
            setPreviewResolutionsByHotspot({});
            setTempModalTimeline([]);
            setForceReplacementApprovedByHotspot({});
            setSelectedHotspotIds([]);
            setIsPreviewingHotspotId(null);
            setSelectedHotspotAnchor(null);
            setHotspotFilterMeta(null);
            setActiveHotspotCityTab('ALL');
            return;
          }

          setAddHotspotModal({ ...addHotspotModal, open: true });
        }}
      >
        <DialogContent className="w-[96vw] sm:max-w-5xl max-h-[90vh] flex flex-col">
          <DialogHeader>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
              <div>
                <DialogTitle>Hotspot List</DialogTitle>
                <DialogDescription>
                  {selectedPreviewCityContext === 'DESTINATION_CITY'
                    ? `Destination-side slot: after reaching ${destinationCityLabel}`
                    : (selectedHotspotAnchor
                      ? `Select a hotspot to insert after ${selectedHotspotAnchor.anchorFrom || "current"} -> ${selectedHotspotAnchor.anchorTo || "next stop"}`
                      : "Select a hotspot to add to your itinerary")}
                </DialogDescription>
                {Number(hotspotFilterMeta?.destinationCityHotspotsHidden || 0) > 0 && (
                  <p className="mt-1 text-xs text-amber-700">
                    Destination city hotspots are hidden because destination is reached after 3 PM.
                  </p>
                )}
              </div>
              <input
                type="text"
                placeholder="Search Hotspot..."
                className="px-3 py-2 border border-gray-300 rounded-md text-sm w-full sm:w-64"
                value={hotspotSearchQuery}
                onChange={(e) => setHotspotSearchQuery(e.target.value)}
              />
            </div>
          </DialogHeader>
          <div className="py-4 flex-1 overflow-hidden flex min-h-0">
            <div className="flex flex-col lg:flex-row gap-4 w-full min-h-0">
              {/* Left Column: Hotspot List */}
              <div ref={hotspotListRef} className="w-full lg:w-1/2 overflow-y-auto min-h-0">
                {routeIsDifferentCity && hotspotCityTabs.length > 0 && (
                  <div className="sticky top-0 z-10 bg-white pb-2">
                    <div className="flex flex-wrap gap-2">
                      {hotspotCityTabs.map((tab) => {
                        const isActive = tab.key === activeHotspotCityTab;
                        return (
                          <button
                            key={tab.key}
                            type="button"
                            onClick={() => setActiveHotspotCityTab(tab.key)}
                            className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
                              isActive
                                ? 'bg-[#d546ab] text-white border-[#d546ab]'
                                : 'bg-white text-[#6c6c6c] border-[#e5d7e3] hover:border-[#d546ab] hover:text-[#4a4260]'
                            }`}
                          >
                            {tab.label} ({tab.count})
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
                {loadingHotspots ? (
                  <p className="text-sm text-[#6c6c6c] text-center py-8">
                    Loading available hotspots...
                  </p>
                ) : visibleHotspotsForActiveTab.length === 0 ? (
                  <p className="text-sm text-[#6c6c6c] text-center py-8">
                    {hotspotSearchQuery ? "No hotspots match your search" : "No hotspots available for this location"}
                  </p>
                ) : (
                  <div className="grid grid-cols-1 gap-4">
                    {visibleHotspotsForActiveTab.map((hotspot) => (
                      (() => {
                        const isSelected = Number(activePreviewHotspotId || 0) === Number(hotspot.id);
                        const hotspotId = Number(hotspot.id);
                        const backendStatus = String(hotspot.availabilityStatus || '').trim().toUpperCase();
                        const availabilityReason = String(hotspot.availabilityReason || '').trim().toLowerCase();

                        const isDeletedFromTimeline =
                          excludedHotspotIds.map(Number).includes(hotspotId) ||
                          backendStatus === 'EXCLUDED_BY_ROUTE' ||
                          availabilityReason.includes('excluded for this route') ||
                          availabilityReason.includes('currently excluded');

                        const isActuallyInCurrentTimeline =
                          currentRouteAttractionHotspotIds.has(hotspotId) ||
                          addedInModalHotspotIds.has(hotspotId);
                        const isAdded =
                          isActuallyInCurrentTimeline ||
                          (
                            !isDeletedFromTimeline &&
                            (
                              hotspot.alreadyAdded === true ||
                              backendStatus === 'ACTIVE_THIS_ROUTE'
                            )
                          );
                        const isAlsoOnOtherRoute = backendStatus === 'ACTIVE_OTHER_ROUTE';
                        const isActionDisabled =
                          isAdded ||
                          (
                            hotspot.actionDisabled === true &&
                            !isDeletedFromTimeline
                          );
                        const timingText = String(hotspot.timings || '').trim().toLowerCase();
                        const hasUsableTimings = timingText.length > 0 && timingText !== 'no timings available';
                        const isClosedTiming = !hasUsableTimings;
                        const hotspotTimeline = previewTimelinesByHotspot[hotspot.id] || [];
                        const hasConflict = hotspotTimeline.some(
                          (seg: any) => seg?.isConflict === true && Number(seg?.locationId) === hotspot.id,
                        );
                        const isLoadingThis = isPreviewingHotspotId === hotspot.id;

                        return (
                          <div
                            key={hotspot.id}
                            data-hotspot-id={hotspot.id}
                            className={`border rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow bg-white ${isSelected ? 'ring-2 ring-[#d546ab]' : ''}`}
                          >
                            <div className="p-4">
                              <div className="flex gap-3 mb-3">
                                <div className="relative flex-shrink-0">
                                  <img
                                    src={
                                      toImgSrc(hotspot.image || null)
                                      || "https://placehold.co/185x115/e9d5f7/4a4260?text=Spot"
                                    }
                                    alt={hotspot.name}
                                    className="rounded-lg object-cover shadow-sm w-[120px] h-[86px] sm:w-[148px] sm:h-[102px]"
                                  />
                                  <div className="absolute top-1 right-1 flex flex-col gap-1">
                                    <button
                                      type="button"
                                      title="Click to View the Images"
                                      className="bg-white/90 hover:bg-white rounded-full p-1 shadow"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        openGalleryModal(
                                          Array.isArray(hotspot.galleryImages) && hotspot.galleryImages.length > 0
                                            ? hotspot.galleryImages
                                            : hotspot.image ? [hotspot.image] : [],
                                          hotspot.name,
                                        );
                                      }}
                                    >
                                      🖼️
                                    </button>
                                    {hotspot.videoUrl && (
                                      <button
                                        type="button"
                                        title="Click to View the Video"
                                        className="bg-white/90 hover:bg-white rounded-full p-1 shadow"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          openVideoModal(hotspot.videoUrl || '', hotspot.name);
                                        }}
                                      >
                                        ▶️
                                      </button>
                                    )}
                                  </div>
                                </div>
                                <div className="min-w-0 flex-1">
                                  <div className="flex justify-between items-start mb-2 gap-2">
                                    <div className="min-w-0 flex-1">
                                      <h4 className="font-semibold text-base text-[#4a4260] truncate">
                                        {hotspot.name}
                                      </h4>
                                      <div className="mt-1 flex flex-wrap items-center gap-2">
                                        {hotspot.visitAgain && (
                                          <span className="text-[9px] font-bold text-white bg-blue-500 px-2 py-0.5 rounded whitespace-nowrap">
                                            Visit Again
                                          </span>
                                        )}
                                        {isDeletedFromTimeline && (
                                          <span className="text-[9px] font-bold text-white bg-orange-500 px-2 py-0.5 rounded whitespace-nowrap">
                                            Deleted from timeline
                                          </span>
                                        )}
                                        {isSelected && (
                                          <span className={`text-[10px] px-2 py-0.5 rounded-full uppercase font-bold ${hasConflict
                                              ? 'bg-red-100 text-red-700'
                                              : 'bg-green-100 text-green-700'
                                            }`}>
                                            {hasConflict ? 'Conflict' : 'Selected'}
                                          </span>
                                        )}
                                        {isAdded && (
                                          <span className="text-[10px] px-2 py-0.5 rounded-full uppercase font-bold bg-green-100 text-green-700">
                                            Added
                                          </span>
                                        )}
                                        {isAlsoOnOtherRoute && (
                                          <span className="text-[10px] px-2 py-0.5 rounded-full uppercase font-bold bg-blue-100 text-blue-800">
                                            Also used on another day
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                    <div className="flex gap-2 shrink-0">
                                      <Button
                                        size="sm"
                                        variant={isSelected ? "outline" : "default"}
                                        className={isSelected
                                          ? "border-gray-300 disabled:border-gray-300 disabled:bg-gray-200 disabled:text-gray-500 disabled:opacity-100 disabled:cursor-not-allowed"
                                          : "bg-[#d546ab] hover:bg-[#b93a8f] text-white disabled:bg-gray-200 disabled:text-gray-500 disabled:opacity-100 disabled:cursor-not-allowed"
                                        }
                                        onClick={() => {
                                          if (isActionDisabled || isClosedTiming) return;
                                          handlePreviewHotspot(hotspot.id);
                                        }}
                                        disabled={isLoadingThis || isActionDisabled || isBuildingMatrix || isApplyingPreviewHotspot || isClosedTiming}
                                      >
                                        {isLoadingThis ? (
                                          <>
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                            Previewing...
                                          </>
                                        ) : isClosedTiming ? (
                                          'Closed'
                                        ) : isAdded ? (
                                          'Added'
                                        ) : isSelected ? (
                                          'Refresh'
                                        ) : isDeletedFromTimeline ? (
                                          'Preview'
                                        ) : (
                                          hotspot.buttonLabel || 'Preview'
                                        )}
                                      </Button>
                                      {isSelected && !isAdded && !isClosedTiming && (
                                        <Button
                                          size="sm"
                                          variant="ghost"
                                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                          onClick={() => handleRemovePreviewHotspot(hotspot.id)}
                                          disabled={isLoadingThis}
                                        >
                                          <Trash2 className="h-4 w-4 mr-1" />
                                          Remove
                                        </Button>
                                      )}
                                      {isAdded && currentRouteManualHotspotIds.has(hotspot.id) && (
                                        <Button
                                          size="sm"
                                          variant="ghost"
                                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                          onClick={() =>
                                            openDeleteHotspotModal(
                                              addHotspotModal.planId || itinerary?.planId || 0,
                                              addHotspotModal.routeId || 0,
                                              hotspot.id,
                                              hotspot.name,
                                              true // isManualHotspot = true
                                            )
                                          }
                                          disabled={isLoadingThis}
                                        >
                                          <Trash2 className="h-4 w-4 mr-1" />
                                          Delete
                                        </Button>
                                      )}
                                    </div>
                                  </div>
                                  <p className="text-sm text-[#6c6c6c] mb-3 line-clamp-2">
                                    {hotspot.description}
                                  </p>
                                  <div className="flex flex-wrap gap-3 text-xs text-[#6c6c6c]">
                                    {String(hotspot.availabilityReason || '').trim().length > 0 && (
                                      <span className="text-[11px] text-[#4a4260]">
                                        {hotspot.availabilityReason}
                                      </span>
                                    )}
                                    {hotspot.amount > 0 && (
                                      <span className="flex items-center">
                                        <Ticket className="h-3 w-3 mr-1" />
                                        ₹ {hotspot.amount.toFixed(2)}
                                      </span>
                                    )}
                                    {hotspot.timeSpend > 0 && (
                                      <span className="flex items-center">
                                        <Clock className="h-3 w-3 mr-1" />
                                        {hotspot.timeSpend} hrs
                                      </span>
                                    )}
                                    {hotspot.timings && String(hotspot.timings).trim().toLowerCase() !== 'no timings available' && (
                                      <span className="flex items-center">
                                        <Timer className="h-3 w-3 mr-1" />
                                        {hotspot.timings}
                                      </span>
                                    )}
                                    {isClosedTiming && (
                                      <span className="flex items-center text-[#a35c1a]">
                                        <Timer className="h-3 w-3 mr-1" />
                                        No timings available
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })()
                    ))}
                  </div>
                )}
              </div>

              {/* Right Column: Preview */}
              <div className="w-full lg:w-1/2 lg:border-l lg:pl-4 border-t lg:border-t-0 pt-4 lg:pt-0 flex flex-col overflow-y-auto min-h-0 pr-1">
                <h3 className="font-semibold text-[#4a4260] mb-4 flex items-center gap-2 flex-shrink-0">
                  <Clock className="h-4 w-4" />
                  Proposed Timeline
                </h3>
                {(activePreviewHotspotId && (selectedHotspotAnchor || bestInsertionSlot || matrixRequiresBuild || isMatrixBuiltButNoFeasibleSlot)) && (
                  <div className="mb-3 p-3 rounded-xl border border-[#f0d9ea] bg-[#fff7fc] shadow-sm flex-shrink-0">
                    <p className="text-xs text-[#6c6c6c]">
                      {isMatrixMissingBlockedState
                        ? 'Route-fit matrix data missing'
                        : isMatrixBuiltButNoFeasibleSlot
                          ? 'Matrix data built, but not on the way'
                          : 'Best Computed Insert Slot'}
                    </p>
                    {!isMatrixMissingBlockedState && !isMatrixBuiltButNoFeasibleSlot ? (
                      <p className="text-sm font-semibold text-[#4a4260] mt-0.5">
                        {bestInsertionSlot?.slot || (
                          selectedPreviewCityContext === 'DESTINATION_CITY'
                            ? ((destinationInsertionSlotLabel || '').replace(/^Will\s+be\s+inserted\s+/i, '') || 'Computing best slot...')
                            : 'Computing best slot...'
                        )}
                      </p>
                    ) : isMatrixMissingBlockedState ? (
                      <p className="text-sm font-semibold text-red-700 mt-0.5">
                        Cannot preview accurate insertion until matrix data is built.
                      </p>
                    ) : (
                      <p className="text-sm font-semibold text-orange-700 mt-0.5">
                        This hotspot is off-route or backtracking for all current route segments.
                      </p>
                    )}

                    {insertionDecisionSummary && (
                      <p
                        className={`mt-2 text-xs font-semibold ${
                          insertionDecisionSummary.willInsert ? 'text-green-700' : 'text-red-700'
                        }`}
                      >
                        {insertionDecisionSummary.text}
                      </p>
                    )}

                    {!isMatrixMissingBlockedState && !isMatrixBuiltButNoFeasibleSlot && activePreviewResolution?.anchorPreference?.honored === false && (
                      <p className="text-xs text-amber-700 mt-1">
                        Auto-moved away from the requested segment to the lower-detour feasible slot.
                      </p>
                    )}

                    {!isMatrixMissingBlockedState && !isMatrixBuiltButNoFeasibleSlot && activeAnchorFitInsight && (
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <span
                          className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                            activeAnchorFitInsight.tone === 'green'
                              ? 'bg-green-100 text-green-700'
                              : activeAnchorFitInsight.tone === 'red'
                                ? 'bg-red-100 text-red-700'
                                : 'bg-amber-100 text-amber-700'
                          }`}
                        >
                          {activeAnchorFitInsight.label}
                        </span>
                        {activeAnchorFitInsight.extraDistanceLabel && (
                          <span className="text-xs font-semibold text-[#4a4260]">
                            {activeAnchorFitInsight.extraDistanceLabel}
                          </span>
                        )}
                        {activeAnchorFitInsight.anchorLegLabel && (
                          <span className="text-xs text-[#6c6c6c]">
                            Anchor leg: {activeAnchorFitInsight.anchorLegLabel}
                          </span>
                        )}
                      </div>
                    )}

                    {isMatrixMissingBlockedState && (
                      <div className="mt-2 rounded-lg border border-red-200 bg-red-50 p-2">
                        <p className="text-xs text-red-700 leading-4">
                          Cannot preview this manual insertion accurately because route-fit matrix data is missing for the selected hotspot against the current route.
                        </p>
                        {activePreviewHotspotId ? (
                          <Button
                            type="button"
                            className="mt-2 bg-[#d546ab] hover:bg-[#b93a8f] text-white"
                            disabled={isBuildingMatrix || isPreviewingHotspotId === activePreviewHotspotId || isApplyingPreviewHotspot}
                            onClick={handleBuildMatrixAndPreviewAgain}
                          >
                            {isBuildingMatrix ? 'Building matrix...' : 'Build Matrix & Preview Again'}
                          </Button>
                        ) : null}
                        {String(matrixBuildSuggestion?.command || '').trim().length > 0 && (
                          <p className="text-[11px] text-red-800 font-mono mt-2 break-all">
                            {String(matrixBuildSuggestion.command)}
                          </p>
                        )}
                      </div>
                    )}

                    {isMatrixBuiltButNoFeasibleSlot && (
                      <div className="mt-2 rounded-lg border border-orange-200 bg-orange-50 p-2">
                        <p className="text-xs text-orange-700 leading-4">
                          Matrix data exists for this hotspot, but it falls off-route or requires backtracking for all current route segments.
                        </p>
                        {Array.isArray(safeMatrixSlots) && safeMatrixSlots.length > 0 && (
                          <div className="mt-2 text-xs text-orange-700">
                            <p className="font-semibold text-orange-800 mb-1">Insertion attempts:</p>
                            <ul className="space-y-1 pl-3">
                              {safeMatrixSlots.slice(0, 5).map((slot: any, idx: number) => (
                                <li key={idx} className="list-disc">
                                  {slot.fromName} → {((
                                    /^hotel$/i.test(String(slot.toName || '').trim())
                                    || (
                                      String((matrixFit as any)?.destinationHotelName || '').trim().length > 0
                                      && String(slot.toName || '').trim().toLowerCase() === String((matrixFit as any)?.destinationHotelName || '').trim().toLowerCase()
                                    )
                                    || Number((slot as any)?.destinationHotelId || 0) > 0
                                  ) && destinationHotelDisplayName) ? destinationHotelDisplayName : slot.toName}:{' '}
                                  <span className={`text-[11px] font-bold px-1.5 py-0.5 rounded-full ${routeFitBadgeClass(slot.routeFitType)}`}>
                                    {slot.label || slot.routeFitType}
                                  </span>
                                </li>
                              ))}
                              {safeMatrixSlots.length > 5 && (
                                <li className="text-orange-600">+{safeMatrixSlots.length - 5} more</li>
                              )}
                            </ul>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
                {!pendingPriorityReplacementHotspotId && (
                  <div className="mb-2 flex-shrink-0 space-y-2 max-h-32 overflow-y-auto pr-1">
                    {activePreviewValidation?.readyToApply === false && activePreviewValidation?.requiresPriorityConfirmation !== true ? (
                      <div className="p-3 rounded-xl border border-red-200 bg-red-50 shadow-sm">
                        <p className="text-sm font-bold text-red-800">
                          {isMatrixBuiltButNoFeasibleSlot
                            ? 'Selected hotspot is off-route for this route'
                            : 'Selected hotspot does not fit the rebuilt slot'}
                        </p>
                        <p className="text-xs text-red-700 mt-1 leading-4 line-clamp-2">
                          {previewValidationReasonText}
                        </p>
                        {selectedHotspotAnchor ? (
                          <p className="text-xs text-red-700 mt-2 leading-4">
                            Attempted insertion slot:{' '}
                            <span className="font-semibold">
                              {selectedPreviewCityContext === 'DESTINATION_CITY'
                                ? ((destinationInsertionSlotLabel || '').replace(/^Will\s+be\s+inserted\s+/i, ''))
                                : `${selectedHotspotAnchor.anchorFrom || 'Current stop'} -> ${selectedHotspotAnchor.anchorTo || 'Next stop'}`}
                            </span>
                            {selectedPreviewCityContext !== 'DESTINATION_CITY' && selectedHotspotAnchor.anchorTimeRange ? ` (${selectedHotspotAnchor.anchorTimeRange})` : ''}
                          </p>
                        ) : null}
                        {Array.isArray(activePreviewResolution?.unscheduledManualHotspots)
                        && activePreviewResolution.unscheduledManualHotspots.length > 0 ? (
                          <div className="mt-2 text-xs text-red-700 leading-4">
                            <p className="font-semibold text-red-800">Could not schedule:</p>
                            <ul className="mt-1 list-disc pl-4 space-y-1">
                              {activePreviewResolution.unscheduledManualHotspots
                                .slice(0, 3)
                                .map((row: any, idx: number) => (
                                  <li key={`unscheduled-manual-${Number(row?.id || 0)}-${idx}`}>
                                    <span className="font-semibold">{row?.name || `Hotspot ${row?.id || ''}`}</span>
                                    {row?.reason ? `: ${row.reason}` : ''}
                                  </li>
                                ))}
                            </ul>
                          </div>
                        ) : null}
                        {(Array.isArray(activePreviewResolution?.removedOptionalHotspots)
                          && activePreviewResolution.removedOptionalHotspots.length > 0)
                        || (Array.isArray(activePreviewResolution?.removedTopPriorityHotspots)
                          && activePreviewResolution.removedTopPriorityHotspots.length > 0) ? (
                          <div className="mt-2 text-xs text-red-700 leading-4">
                            <p className="font-semibold text-red-800">Removed while trying to fit:</p>
                            <p className="mt-1 font-medium">
                              {[
                                ...(Array.isArray(activePreviewResolution?.removedOptionalHotspots)
                                  ? activePreviewResolution.removedOptionalHotspots
                                  : []),
                                ...(Array.isArray(activePreviewResolution?.removedTopPriorityHotspots)
                                  ? activePreviewResolution.removedTopPriorityHotspots
                                  : []),
                              ]
                                .map((row: any) => row?.name)
                                .filter(Boolean)
                                .join(', ')}
                            </p>
                          </div>
                        ) : !isMatrixBuiltButNoFeasibleSlot ? (
                          <p className="text-xs text-red-700 mt-2 leading-4">
                            No more removable optional hotspots are available in this slot.
                          </p>
                        ) : null}
                        {isMatrixBuiltButNoFeasibleSlot ? (
                          <p className="text-xs text-red-700 mt-1 font-medium leading-4">
                            This hotspot cannot be added on the current route. Please choose a different hotspot or route segment.
                          </p>
                        ) : (
                          <p className="text-xs text-red-700 mt-1 font-medium leading-4">
                            Use confirm below to insert it as conflict.
                          </p>
                        )}
                      </div>
                    ) : null}

                    {Array.isArray(activePreviewResolution?.removedOptionalHotspots) && activePreviewResolution.removedOptionalHotspots.length > 0 ? (
                      <div className="p-3 rounded-xl border border-amber-200 bg-amber-50 shadow-sm">
                        <p className="text-sm font-bold text-amber-800">Optional hotspots will be removed</p>
                        <p className="text-xs text-amber-700 mt-1 leading-4">
                          To fit your selected hotspot(s), these optional hotspots will be removed:
                        </p>
                        <p className="text-xs text-amber-800 mt-1 font-semibold leading-4 line-clamp-2">
                          {activePreviewResolution.removedOptionalHotspots
                            .map((row: any) => row?.name)
                            .filter(Boolean)
                            .join(', ')}
                        </p>
                      </div>
                    ) : null}
                  </div>
                )}
                <div ref={timelinePreviewRef} className="flex-1 space-y-3 min-h-0 pb-4">
                  {isPreviewingHotspotId ? (
                    <div className="flex flex-col items-center justify-center h-24 text-[#6c6c6c]">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#d546ab] mb-2"></div>
                      <p className="text-sm">Calculating selected slot...</p>
                    </div>
                  ) : null}

                  {effectivePreviewTimeline.length > 0 ? (
                    <>
                      {/* Rescheduling Applied Banner */}
                      {manualInsertionFit?.rescheduleApplied === true && (
                        <div className="p-3 rounded-lg border border-blue-300 bg-blue-50 text-sm">
                          <p className="font-semibold text-blue-900">✓ Timings recalculated after insertion.</p>
                          <p className="text-xs text-blue-800 mt-1">
                            Route-fit is feasible. Timeline rows below B have been shifted forward accordingly.
                          </p>
                        </div>
                      )}

                      {/* Day End Overflow — only show if no resolved removal plan replaces it */}
                      {manualInsertionFit?.exceedsDayEnd === true &&
                        (manualInsertionFit as any)?.lowPriorityRemovalPlanPreview?.resolved !== true && (
                        <div className="p-3 rounded-lg border border-amber-300 bg-amber-50 text-sm">
                          <p className="font-semibold text-amber-900">⚠ Timeline exceeds day end.</p>
                          <p className="text-xs text-amber-800 mt-1">
                            Final hotel check-in would exceed day end by {manualInsertionFit?.dayOverflowMinutes || 0} minutes.
                          </p>
                        </div>
                      )}

                      {/* Low-priority removal plan — resolved case */}
                      {(manualInsertionFit as any)?.lowPriorityRemovalPlanPreview?.resolved === true && (
                        <div className="p-3 rounded-lg border border-orange-300 bg-orange-50 text-sm">
                          <p className="font-semibold text-orange-900">Overflow resolved by removing lower-priority hotspots.</p>
                          <p className="text-xs text-orange-700 mt-1 leading-4">
                            To fit this manual hotspot and keep hotel check-in before 8:00 PM, these lower-priority hotspots will be removed:
                          </p>
                          {Array.isArray((manualInsertionFit as any)?.lowPriorityRemovalPlanPreview?.plannedRemovals) &&
                            (manualInsertionFit as any).lowPriorityRemovalPlanPreview.plannedRemovals.length > 0 ? (
                            <ul className="mt-2 space-y-1">
                              {((manualInsertionFit as any).lowPriorityRemovalPlanPreview.plannedRemovals as any[]).map((row: any, ri: number) => (
                                <li key={ri} className="text-xs text-orange-900 leading-4">
                                  <span className="font-semibold">{row?.name || 'Unknown stop'}</span>
                                  {row?.priority ? <span className="ml-1 text-orange-700">(P{row.priority})</span> : null}
                                  {row?.reason ? <span className="text-orange-700"> {'—'} {row.reason}</span> : null}
                                </li>
                              ))}
                            </ul>
                          ) : null}
                          <p className="text-xs text-orange-800 mt-2 font-medium leading-4">
                            The preview below already shows the final resolved timeline after these stops are removed.
                          </p>
                          {import.meta.env.DEV && resolvedRemovalTimelineLeak && (
                            <p className="text-xs text-red-700 mt-2 font-semibold leading-4">
                              BUG: resolved-removal timeline still contains planned removals.
                            </p>
                          )}
                        </div>
                      )}

                      {effectivePreviewTimeline.map((seg: any, idx: number) => {
                        const isUserSelected = seg?.isUserSelectedPreview === true;
                        const isConflictSegment = seg?.isConflict === true;
                        const selectedId = Number(seg?.selectedHotspotId || seg?.locationId || 0);
                        const hotspotId = Number(seg?.locationId || seg?.hotspot_ID || seg?.hotspotId || selectedId || 0);
                        const selectedPreviewHotspotMeta = previewHotspotMetaById.get(Number(selectedHotspotId || 0)) || null;
                        const hotspotMeta = previewHotspotMetaById.get(hotspotId) || selectedPreviewHotspotMeta || null;
                        const activityVisitTime = isConflictSegment
                          ? 'Needs reschedule'
                          : (seg?.visitTime || seg?.timeRange || hotspotMeta?.visitTime || null);
                        const activityDuration = seg?.duration || hotspotMeta?.duration || null;
                        const activityTimings = seg?.timings || hotspotMeta?.timings || null;
                        const activityPriority = Number.isFinite(Number(seg?.priority))
                          ? Number(seg.priority)
                          : (Number.isFinite(Number(hotspotMeta?.priority)) ? Number(hotspotMeta?.priority) : null);
                        
                        // ✅ FIX: Manual hotspots should display as "Manual / P4", never P0
                        const computedPriorityLabel = (): string | null => {
                          const isManual = seg?.planOwnWay === true || seg?.isManual === true;
                          const priority = activityPriority;

                          if (isManual) {
                            return "Manual / P4";
                          }

                          if (priority !== null && priority > 0) {
                            return `P${priority}`;
                          }

                          return null;
                        };

                        const priorityLabel = computedPriorityLabel();
                        const previewRouteId = Number(addHotspotModal.routeId || 0);
                        const hotelMetaForDay = selectedHotelMetaByRoute.get(previewRouteId);
                        const actualHotelName = String(
                          hotelMetaForDay?.hotelName
                          || seg?.hotelName
                          || seg?.toName
                          || seg?.to
                          || 'Hotel'
                        ).trim();

                        // ✅ FIX: Handle waiting/break synthetic segments
                        const isWaitingSegment = seg?.type === 'waiting' || seg?.isSyntheticWaiting === true;
                        const travelToLabel = String(
                          seg?.toName
                          || seg?.displayToName
                          || seg?.to
                          || extractTravelToFromText(seg?.text || seg?.name)
                          || '',
                        ).trim();
                        const resolvedTravelToLabel = /\bhotel\b/i.test(travelToLabel)
                          ? (destinationHotelDisplayName || actualHotelName || travelToLabel)
                          : travelToLabel;
                        const displaySegmentText = String(seg?.type || '').toLowerCase() === 'travel'
                          ? (resolvedTravelToLabel ? `Travel to ${resolvedTravelToLabel}` : (seg?.text || seg?.name || 'Travel'))
                          : (seg?.text || seg?.name || '');

                        // ✅ FIX: Handle hotel check-in zero-duration segments
                        const isZeroDurationHotel = seg?.isZeroDurationHotel === true ||
                          (seg?.type === 'hotel' && seg?.timeRange && seg.timeRange.split(' - ').length === 2 &&
                           seg.timeRange.split(' - ')[0].trim() === seg.timeRange.split(' - ')[1].trim());

                        const getTimeRangeDurationMinutes = (range: string): number | null => {
                          const start = parseDisplayMinutes(range, 'start');
                          const end = parseDisplayMinutes(range, 'end');
                          if (start == null || end == null) return null;
                          let delta = end - start;
                          if (delta < 0) delta += 24 * 60;
                          return delta > 0 ? delta : null;
                        };
                        const parseDurationMinutesText = (value: unknown): number | null => {
                          const raw = String(value || '').trim();
                          if (!raw) return null;
                          const h = raw.match(/(\d+)\s*(?:hour|hours|hr|hrs|h)/i);
                          const m = raw.match(/(\d+)\s*(?:min|mins|m)/i);
                          if (!h && !m) return null;
                          const total = (h ? Number(h[1]) * 60 : 0) + (m ? Number(m[1]) : 0);
                          return Number.isFinite(total) && total > 0 ? total : null;
                        };

                        const timingOverride = (() => {
                          const currentType = String(seg?.type || '').toLowerCase();
                          if (currentType !== 'travel' && currentType !== 'hotel') return null;

                          let conflictIdx = -1;
                          for (let p = idx - 1; p >= 0; p -= 1) {
                            const cand = effectivePreviewTimeline[p];
                            if (cand?.isConflict === true && String(cand?.type || '').toLowerCase() === 'attraction') {
                              conflictIdx = p;
                              break;
                            }
                          }
                          if (conflictIdx < 0) return null;

                          const conflictSeg = effectivePreviewTimeline[conflictIdx];

                          let prevTravelForConflict: any = null;
                          for (let p = conflictIdx - 1; p >= 0; p -= 1) {
                            const cand = effectivePreviewTimeline[p];
                            if (String(cand?.type || '').toLowerCase() === 'travel' && String(cand?.timeRange || '').trim()) {
                              prevTravelForConflict = cand;
                              break;
                            }
                          }
                          const arrivalMinutes = parseDisplayMinutes(String(prevTravelForConflict?.timeRange || ''), 'end');

                          const conflictHotspotId = Number(
                            conflictSeg?.locationId
                            || conflictSeg?.hotspot_ID
                            || conflictSeg?.hotspotId
                            || conflictSeg?.selectedHotspotId
                            || selectedHotspotId
                            || 0
                          );
                          const conflictHotspotMeta = previewHotspotMetaById.get(conflictHotspotId)
                            || previewHotspotMetaById.get(Number(selectedHotspotId || 0))
                            || null;
                          const conflictDurationText = conflictSeg?.duration || conflictHotspotMeta?.duration || null;
                          const stayMinutes = parseDurationMinutesText(conflictDurationText)
                            ?? (() => {
                              const fallback = Number(
                                conflictSeg?.durationMin
                                ?? conflictSeg?.matrixFit?.insertedStopDurationMin
                                ?? conflictSeg?.matrixFit?.stopDurationMin
                                ?? conflictSeg?.matrixFit?.visitDurationMin
                                ?? conflictSeg?.matrixFit?.attractionDurationMin
                                ?? 0
                              );
                              return Number.isFinite(fallback) && fallback > 0 ? Math.max(1, Math.round(fallback)) : null;
                            })();

                          if (arrivalMinutes == null || stayMinutes == null) return null;
                          const leaveMinutes = arrivalMinutes + stayMinutes;

                          let firstTravelIdx = -1;
                          for (let n = conflictIdx + 1; n < effectivePreviewTimeline.length; n += 1) {
                            const cand = effectivePreviewTimeline[n];
                            if (String(cand?.type || '').toLowerCase() === 'travel' && String(cand?.timeRange || '').trim()) {
                              firstTravelIdx = n;
                              break;
                            }
                          }
                          if (firstTravelIdx < 0) return null;

                          const firstTravelSeg = effectivePreviewTimeline[firstTravelIdx];
                          const firstTravelStart = parseDisplayMinutes(String(firstTravelSeg?.timeRange || ''), 'start');
                          const firstTravelDuration = getTimeRangeDurationMinutes(String(firstTravelSeg?.timeRange || ''));
                          if (firstTravelStart == null || firstTravelDuration == null || leaveMinutes <= firstTravelStart) {
                            return null;
                          }
                          const firstTravelNewStart = leaveMinutes;
                          const firstTravelNewEnd = firstTravelNewStart + firstTravelDuration;

                          if (currentType === 'travel' && idx === firstTravelIdx) {
                            return {
                              timeRange: `${formatMinutesToDisplay(firstTravelNewStart)} - ${formatMinutesToDisplay(firstTravelNewEnd)}`,
                            };
                          }

                          if (currentType === 'hotel') {
                            let firstHotelIdx = -1;
                            for (let n = firstTravelIdx + 1; n < effectivePreviewTimeline.length; n += 1) {
                              const cand = effectivePreviewTimeline[n];
                              if (String(cand?.type || '').toLowerCase() === 'hotel') {
                                firstHotelIdx = n;
                                break;
                              }
                            }
                            if (firstHotelIdx === idx) {
                              const newCheckIn = formatMinutesToDisplay(firstTravelNewEnd);
                              return {
                                timeRange: `${newCheckIn} - ${newCheckIn}`,
                              };
                            }
                          }

                          return null;
                        })();

                        const normalizedMatrixDurationMin = seg?.isMatrixSplitTravel === true
                          ? normalizeDurationAgainstDistance(seg?.matrixDistanceKm, seg?.matrixDurationMin)
                          : null;
                        const matrixStartMinutes = seg?.isMatrixSplitTravel === true
                          ? parseDisplayMinutes(seg?.timeRange, 'start')
                          : null;
                        const matrixEndMinutes = seg?.isMatrixSplitTravel === true
                          ? parseDisplayMinutes(seg?.timeRange, 'end')
                          : null;
                        const matrixHasRange = matrixStartMinutes !== null && matrixEndMinutes !== null && matrixEndMinutes >= matrixStartMinutes;
                        const matrixRangeDuration = matrixHasRange ? Math.max(1, matrixEndMinutes - matrixStartMinutes) : null;
                        const effectiveSegTimeRangeRaw = seg?.isMatrixSplitTravel === true
                          && normalizedMatrixDurationMin !== null
                          && matrixStartMinutes !== null
                          && matrixRangeDuration !== null
                          && matrixRangeDuration !== normalizedMatrixDurationMin
                          ? `${formatMinutesToDisplay(matrixStartMinutes)} - ${formatMinutesToDisplay(matrixStartMinutes + normalizedMatrixDurationMin)}`
                          : (timingOverride?.timeRange || seg?.timeRange || '--');
                        const effectiveSegTimeRange = isConflictSegment && String(seg?.type || '').toLowerCase() === 'attraction'
                          ? 'Needs reschedule'
                          : effectiveSegTimeRangeRaw;
                        const isTravelSegment = String(seg?.type || '').toLowerCase() === 'travel';
                        const previewTravelDistanceLabel = (() => {
                          if (!isTravelSegment) return '';

                          const rawDistance = String(seg?.distance || seg?.hotspot_travelling_distance || '').trim();
                          if (rawDistance && rawDistance !== '--') {
                            return /km/i.test(rawDistance) ? rawDistance : `${rawDistance} KM`;
                          }

                          const numericDistance = [
                            Number(seg?.matrixDistanceKm || 0),
                            Number(seg?.distanceKm || 0),
                            Number(seg?.travelDistanceKm || 0),
                          ].find((value) => Number.isFinite(value) && value > 0) || 0;

                          return numericDistance > 0 ? `${numericDistance.toFixed(2)} KM` : '';
                        })();
                        const previewTravelDurationLabel = (() => {
                          if (!isTravelSegment) return '';
                          if (String(seg?.duration || '').trim()) return String(seg.duration).trim();
                          if (normalizedMatrixDurationMin != null) {
                            return `${Math.max(1, Math.round(Number(normalizedMatrixDurationMin)))} Min`;
                          }
                          return '';
                        })();
                        const selectedSlotFitTypeUpper = String(
                          effectiveFitSlot?.routeFitType
                          || seg?.matrixFit?.routeFitType
                          || ''
                        ).toUpperCase();
                        const selectedSlotLabelText = String(
                          effectiveFitSlot?.displayLabel
                          || effectiveFitSlot?.label
                          || seg?.matrixFit?.displayLabel
                          || seg?.matrixFit?.label
                          || ''
                        ).toLowerCase();
                        const selectedSlotFinalReasonText = String(
                          effectiveFitSlot?.finalDecisionReason
                          || seg?.matrixFit?.finalDecisionReason
                          || ''
                        ).toLowerCase();
                        const selectedSlotNoRouteTagged = selectedSlotLabelText.includes('no route data')
                          || selectedSlotFinalReasonText.includes('no route data')
                          || selectedSlotLabelText.includes('route data unavailable')
                          || selectedSlotFinalReasonText.includes('route-fit data unavailable');
                        const selectedSlotRouteFitStatus = String(
                          (effectiveFitSlot as any)?.routeFitStatus
                          || (seg?.matrixFit as any)?.routeFitStatus
                          || selectedSlotFitTypeUpper
                          || ''
                        ).toUpperCase();
                        const selectedSlotMetricsSource = String(
                          (effectiveFitSlot as any)?.routeMetrics?.source
                          || (seg?.matrixFit as any)?.routeMetrics?.source
                          || 'NONE'
                        ).toUpperCase();
                        const shouldSuppressRouteMetrics = (
                          selectedSlotNoRouteTagged
                          || selectedSlotFitTypeUpper === 'UNKNOWN'
                          || selectedSlotFitTypeUpper === 'MATRIX_UNAVAILABLE'
                          || selectedSlotRouteFitStatus === 'NO_ROUTE_DATA'
                          || selectedSlotRouteFitStatus === 'MATRIX_UNAVAILABLE'
                          || selectedSlotMetricsSource !== 'MATRIX_CACHE'
                        );
                        const selectedSlotHasRouteData = (
                          (!selectedSlotFitTypeUpper || (
                            selectedSlotFitTypeUpper !== 'UNKNOWN'
                            && selectedSlotFitTypeUpper !== 'MATRIX_UNAVAILABLE'
                          ))
                          && ((effectiveFitSlot as any)?.routePossible ?? seg?.matrixFit?.routePossible) !== false
                          && !shouldSuppressRouteMetrics
                        );

                        // If waiting segment, render a distinct waiting block
                        if (isWaitingSegment) {
                          return (
                            <div
                              key={`${idx}-waiting`}
                              className="p-3 rounded-lg border-2 border-orange-200 bg-orange-50 transition-all"
                            >
                              <div className="flex justify-between items-start mb-1 gap-2">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded uppercase bg-orange-200 text-orange-800">
                                    ⏳ waiting
                                  </span>
                                  <span className="text-xs font-bold text-[#4a4260]">
                                    {effectiveSegTimeRange}
                                  </span>
                                </div>
                              </div>
                              <p className="text-sm font-bold text-orange-700">{seg?.text || 'Waiting'}</p>
                              {seg?.reason && (
                                <p className="text-xs text-orange-600 mt-1">{seg.reason}</p>
                              )}
                              {seg?.gapMinutes > 0 && (
                                <p className="text-xs text-orange-500 mt-1">
                                  Gap: {Math.floor(seg.gapMinutes / 60) > 0 ? `${Math.floor(seg.gapMinutes / 60)}h ` : ''}{seg.gapMinutes % 60}min
                                </p>
                              )}
                            </div>
                          );
                        }

                        return (
                          <div
                            key={`${idx}-${seg?.type}-${seg?.text || ''}`}
                            data-selected={isUserSelected ? "true" : "false"}
                            className={`p-3 rounded-lg border-2 transition-all ${seg?.isConflict
                                ? 'bg-red-50 border-red-300 shadow-sm'
                                : isUserSelected
                                  ? 'bg-green-50 border-green-500 ring-2 ring-green-200 shadow-md scale-[1.02]'
                                  : 'bg-gray-50 border-gray-200 opacity-90'
                              }`}
                          >
                            <div className="flex justify-between items-start mb-1 gap-2">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded uppercase ${seg?.type === 'travel' ? 'bg-blue-100 text-blue-700'
                                    : seg?.type === 'attraction' ? 'bg-green-100 text-green-700'
                                      : 'bg-gray-200 text-gray-700'
                                  }`}>
                                  {seg?.type || 'item'}
                                </span>
                                <span className="text-xs font-bold text-[#4a4260]">
                                  {effectiveSegTimeRange}
                                </span>
                              </div>

                              <div className="flex items-center gap-2">
                                {seg?.isConflict ? (
                                  <span className="flex items-center gap-1 text-[10px] font-bold text-red-600 uppercase bg-red-100 px-2 py-0.5 rounded">
                                    <AlertTriangle className="h-3 w-3" />
                                    Conflict
                                  </span>
                                ) : isUserSelected ? (
                                  <span className="flex items-center gap-1 text-[10px] font-bold text-green-600 uppercase bg-green-100 px-2 py-0.5 rounded">
                                    <Plus className="h-3 w-3" />
                                    New
                                  </span>
                                ) : null}

                                {isUserSelected && selectedId > 0 && (
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="h-6 px-2 text-red-600 hover:text-red-700 hover:bg-red-50"
                                    onClick={() => handleRemovePreviewHotspot(selectedId)}
                                  >
                                    <Trash2 className="h-3 w-3 mr-1" />
                                    Remove
                                  </Button>
                                )}
                              </div>
                            </div>

                            <p className={`text-sm font-bold ${isUserSelected ? 'text-green-800' : 'text-[#4a4260]'}`}>
                              {/* ✅ FIX: Hotel zero-duration shows check-in label, not "Hotel Stay 8:00 PM - 8:00 PM" */}
                              {isZeroDurationHotel ? (
                                <>Check-in at {actualHotelName} <span className="text-purple-600">{effectiveSegTimeRange?.split(' - ')[0]}</span></>
                              ) : (
                                displaySegmentText
                              )}
                            </p>

                            {isTravelSegment && (
                              <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[#6c6c6c]">
                                <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{effectiveSegTimeRange}</span>
                                {previewTravelDistanceLabel && (
                                  <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{previewTravelDistanceLabel}</span>
                                )}
                                {previewTravelDurationLabel && (
                                  <span className="flex items-center gap-1">⏱ {previewTravelDurationLabel}</span>
                                )}
                              </div>
                            )}

                            {/* Display distance and duration for matrix split travel rows */}
                            {seg?.isMatrixSplitTravel === true && (
                              <div className="mt-2 text-xs text-gray-600 space-y-0.5">
                                {(seg?.fromName || seg?.toName) && (
                                  <p>Route leg: {seg?.fromName || 'A'} → {seg?.toName || 'B'}</p>
                                )}
                                {seg?.matrixDistanceKm != null && (
                                  <p>Distance: {Number(seg.matrixDistanceKm).toFixed(1)} km</p>
                                )}
                                {normalizedMatrixDurationMin != null && (
                                  <p>Duration: {Math.max(1, Math.round(Number(normalizedMatrixDurationMin)))} min</p>
                                )}
                              </div>
                            )}

                            {isUserSelected && String(seg?.type || '').toLowerCase() === 'attraction' && (
                              <div className="mt-3 space-y-2">
                                {/* ── manualInsertionFit: Best slot panel ── */}
                                {!matrixRequiresBuild && effectiveFitSlot && (
                                  <div className="border border-blue-200 bg-blue-50 p-3 rounded-lg text-sm">
                                    <p className="font-bold text-blue-900 text-[11px] mb-1.5 uppercase tracking-wide">Best insertion slot</p>
                                    <div className="flex items-start gap-2">
                                      <div className="flex-1 min-w-0">
                                        <p className="text-xs font-semibold text-gray-800 truncate">
                                          {effectiveFitSlot.fromName} → {((
                                            /^hotel$/i.test(String(effectiveFitSlot.toName || '').trim())
                                            || (
                                              String((matrixFit as any)?.destinationHotelName || '').trim().length > 0
                                              && String(effectiveFitSlot.toName || '').trim().toLowerCase() === String((matrixFit as any)?.destinationHotelName || '').trim().toLowerCase()
                                            )
                                            || Number((effectiveFitSlot as any)?.destinationHotelId || 0) > 0
                                          ) && destinationHotelDisplayName) ? destinationHotelDisplayName : effectiveFitSlot.toName}
                                        </p>
                                        {selectedSlotHasRouteData && effectiveFitSlot.roadDetourKm != null && (
                                          <p className="text-[10px] text-gray-600 mt-0.5">
                                            Extra distance: +{Number(effectiveFitSlot.roadDetourKm).toFixed(1)} km
                                          </p>
                                        )}
                                        {effectiveFitSlot.finalDecisionReason && (
                                          <p className="text-[10px] text-gray-500 mt-0.5 italic">Final reason: {effectiveFitSlot.finalDecisionReason}</p>
                                        )}
                                        {!effectiveFitSlot.finalDecisionReason && effectiveFitSlot.decisionReason && (
                                          <p className="text-[10px] text-gray-500 mt-0.5 italic">{effectiveFitSlot.decisionReason}</p>
                                        )}
                                      </div>
                                      <span className={`flex-shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full ${routeFitBadgeClass(effectiveFitSlot.routeFitType)}`}>
                                        {effectiveFitSlot.displayLabel || effectiveFitSlot.label}
                                      </span>
                                    </div>
                                    {effectiveFitSlot?.distanceComparisonNote && (
                                      <p className="text-[10px] text-blue-700 mt-1">Note: {effectiveFitSlot.distanceComparisonNote}</p>
                                    )}
                                    {/* Requested slot if different */}
                                    {matrixFit?.requestedSlot && matrixFit.requestedSlot.routeFitType === 'MATRIX_UNAVAILABLE' && (
                                      <div className="mt-2 pt-2 border-t border-blue-200">
                                        <p className="text-[10px] font-semibold text-gray-500 mb-0.5">Requested slot:</p>
                                        <p className="text-[10px] text-gray-600">
                                          {matrixFit.requestedSlot.fromName} → {((
                                            /^hotel$/i.test(String(matrixFit.requestedSlot.toName || '').trim())
                                            || (
                                              String((matrixFit as any)?.destinationHotelName || '').trim().length > 0
                                              && String(matrixFit.requestedSlot.toName || '').trim().toLowerCase() === String((matrixFit as any)?.destinationHotelName || '').trim().toLowerCase()
                                            )
                                            || Number((matrixFit.requestedSlot as any)?.destinationHotelId || 0) > 0
                                          ) && destinationHotelDisplayName) ? destinationHotelDisplayName : matrixFit.requestedSlot.toName}
                                        </p>
                                        <span className="text-[10px] text-gray-400 italic">{matrixFit.requestedSlot.label}</span>
                                      </div>
                                    )}
                                    {matrixFit?.warning && (
                                      <p className="mt-1.5 text-[10px] text-amber-700 bg-amber-50 rounded px-2 py-1">
                                        ⚠ {matrixFit.warning}
                                      </p>
                                    )}
                                  </div>
                                )}

                                {/* Inserted hotspot route summary */}
                                {seg?.matrixFit?.routeLegSummary && selectedSlotHasRouteData && (
                                  <div className="border border-emerald-200 bg-emerald-50 p-3 rounded-lg text-xs text-emerald-900 space-y-1">
                                    <p className="font-semibold">Route summary:</p>
                                    <p>
                                      {effectiveFitSlot?.fromName || seg?.matrixFit?.fromName || 'A'} → {seg?.text || seg?.name || 'Inserted hotspot'}:{' '}
                                      {seg?.matrixFit?.routeLegSummary?.acDistanceKm != null ? `${Number(seg.matrixFit.routeLegSummary.acDistanceKm).toFixed(1)} km` : '--'}
                                      {' / '}
                                      {seg?.matrixFit?.routeLegSummary?.acDurationMin != null ? `${Math.max(1, Math.round(Number(seg.matrixFit.routeLegSummary.acDurationMin)))} min` : '--'}
                                    </p>
                                    <p>
                                      {seg?.text || seg?.name || 'Inserted hotspot'} → {((
                                        /^hotel$/i.test(String(effectiveFitSlot?.toName || seg?.matrixFit?.toName || '').trim())
                                        || (
                                          String((matrixFit as any)?.destinationHotelName || '').trim().length > 0
                                          && String(effectiveFitSlot?.toName || seg?.matrixFit?.toName || '').trim().toLowerCase() === String((matrixFit as any)?.destinationHotelName || '').trim().toLowerCase()
                                        )
                                        || Number((effectiveFitSlot as any)?.destinationHotelId || 0) > 0
                                      ) && destinationHotelDisplayName)
                                        ? destinationHotelDisplayName
                                        : (effectiveFitSlot?.toName || seg?.matrixFit?.toName || 'B')}:{' '}
                                      {seg?.matrixFit?.routeLegSummary?.cbDistanceKm != null ? `${Number(seg.matrixFit.routeLegSummary.cbDistanceKm).toFixed(1)} km` : '--'}
                                      {' / '}
                                      {seg?.matrixFit?.routeLegSummary?.cbDurationMin != null ? `${Math.max(1, Math.round(Number(seg.matrixFit.routeLegSummary.cbDurationMin)))} min` : '--'}
                                    </p>
                                    <p>
                                      Via total: {seg?.matrixFit?.routeLegSummary?.viaDistanceKm != null ? `${Number(seg.matrixFit.routeLegSummary.viaDistanceKm).toFixed(1)} km` : '--'}
                                    </p>
                                    <p>
                                      Direct: {seg?.matrixFit?.routeLegSummary?.directDistanceKm != null ? `${Number(seg.matrixFit.routeLegSummary.directDistanceKm).toFixed(1)} km` : '--'}
                                    </p>
                                    <p>
                                      Extra: +{seg?.matrixFit?.routeLegSummary?.extraDistanceKm != null ? Number(Math.max(0, Number(seg.matrixFit.routeLegSummary.extraDistanceKm))).toFixed(1) : '--'} km
                                    </p>
                                    {seg?.matrixFit?.distanceComparisonNote && (
                                      <p className="text-emerald-800">Note: {seg.matrixFit.distanceComparisonNote}</p>
                                    )}
                                  </div>
                                )}

                                {/* Show all insertion slots */}
                                {normalizedInsertionSlots.length > 0 && (
                                  <div className="border border-purple-200 bg-purple-50 p-3 rounded-lg text-sm space-y-2">
                                    <p className="font-bold text-purple-900 text-xs">
                                      All insertion attempts ({normalizedInsertionSlots.length}):
                                    </p>
                                    {normalizedInsertionSlots.map((slotOption: any, slotIdx: number) => {
                                      const isBest = slotOption?.selectedAsBest === true || slotOption?.isBest === true;
                                      const fits = slotOption?.fitsOverall !== false;
                                      const routeFitTypeUpper = String(slotOption?.routeFitType || '').toUpperCase();
                                      const routeFitStatusUpper = String(slotOption?.routeFitStatus || routeFitTypeUpper || '').toUpperCase();
                                      const slotLabelText = String(slotOption?.displayLabel || slotOption?.label || '').toLowerCase();
                                      const slotFinalReasonText = String(slotOption?.finalDecisionReason || '').toLowerCase();
                                      const slotNoRouteTagged = slotLabelText.includes('no route data')
                                        || slotFinalReasonText.includes('no route data')
                                        || slotLabelText.includes('route data unavailable')
                                        || slotFinalReasonText.includes('route-fit data unavailable');
                                      const routeMetricsSource = String(slotOption?.routeMetrics?.source || 'NONE').toUpperCase();
                                      const slotHasRouteData = (
                                        slotOption?.routePossible !== false
                                        && routeFitTypeUpper !== 'UNKNOWN'
                                        && routeFitTypeUpper !== 'MATRIX_UNAVAILABLE'
                                        && routeFitStatusUpper !== 'NO_ROUTE_DATA'
                                        && routeFitStatusUpper !== 'MATRIX_UNAVAILABLE'
                                        && routeMetricsSource === 'MATRIX_CACHE'
                                        && !slotNoRouteTagged
                                      );
                                      const fitLabel: string = slotOption.displayLabel || slotOption.routeFitLabel || slotOption.label || slotOption.routeFitType || (fits ? 'On route' : 'Off route');
                                      const badgeClass: string = routeFitBadgeClass(slotOption.routeFitType);

                                      const detourKm: number | null = slotOption?.roadDetourKm != null
                                        ? Number(slotOption.roadDetourKm)
                                        : (slotOption?.distanceDelta != null ? Number(slotOption.distanceDelta) : null);
                                      const displayDetourKm: number | null = detourKm != null
                                        ? Math.max(0, Number.isFinite(detourKm) ? detourKm : 0)
                                        : null;
                                      const abKm: number | null = slotOption?.abOsrmDistanceKm != null
                                        ? Number(slotOption.abOsrmDistanceKm)
                                        : null;
                                      const viaKm: number | null = slotOption?.insertedRouteDistanceKm != null
                                        ? Number(slotOption.insertedRouteDistanceKm)
                                        : null;
                                      const showDistanceBreakdown = slotHasRouteData && (abKm != null || viaKm != null || detourKm != null);
                                      const showBestBadge = isBest && slotHasRouteData;

                                      return (
                                        <div
                                          key={slotIdx}
                                          className={`rounded-lg border px-3 py-2 ${
                                            isBest
                                              ? 'border-green-400 bg-green-50'
                                              : fits
                                                ? 'border-gray-200 bg-white'
                                                : 'border-red-200 bg-red-50 opacity-80'
                                          }`}
                                        >
                                          {/* Slot header */}
                                          <div className="flex items-start justify-between gap-2">
                                            <span className={`text-xs font-semibold flex-1 truncate ${isBest ? 'text-green-800' : 'text-gray-800'}`}>
                                              {isBest ? '⭐ ' : `${slotIdx + 1}. `}
                                              {slotOption?.fromName} → {((
                                                /^hotel$/i.test(String(slotOption?.toName || '').trim())
                                                || (
                                                  String((matrixFit as any)?.destinationHotelName || '').trim().length > 0
                                                  && String(slotOption?.toName || '').trim().toLowerCase() === String((matrixFit as any)?.destinationHotelName || '').trim().toLowerCase()
                                                )
                                                || Number((slotOption as any)?.destinationHotelId || 0) > 0
                                              ) && destinationHotelDisplayName) ? destinationHotelDisplayName : slotOption?.toName}
                                            </span>
                                            <span className={`flex-shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full ${badgeClass}`}>
                                              {fitLabel}
                                            </span>
                                          </div>

                                          {showDistanceBreakdown && (
                                            <div className="mt-1.5 grid grid-cols-3 gap-x-2 text-[10px] text-gray-600 bg-gray-50 rounded px-2 py-1">
                                              {abKm != null && (
                                                <div>
                                                  <span className="block text-gray-400">A→B direct</span>
                                                  <span className="font-semibold text-gray-700">{abKm.toFixed(1)} km</span>
                                                </div>
                                              )}
                                              {viaKm != null && (
                                                <div>
                                                  <span className="block text-gray-400">Via hotspot</span>
                                                  <span className="font-semibold text-gray-700">{viaKm.toFixed(1)} km</span>
                                                </div>
                                              )}
                                              {displayDetourKm != null && (
                                                <div>
                                                  <span className="block text-gray-400">Extra</span>
                                                  <span className={`font-bold ${displayDetourKm <= 0.5 ? 'text-green-600' : displayDetourKm <= 5 ? 'text-yellow-700' : 'text-red-600'}`}>
                                                    +{displayDetourKm.toFixed(1)} km
                                                  </span>
                                                </div>
                                              )}
                                            </div>
                                          )}

                                          {slotHasRouteData && slotOption?.distanceComparisonNote && (
                                            <p className="mt-0.5 text-[10px] text-blue-700">Note: {slotOption.distanceComparisonNote}</p>
                                          )}

                                          {/* Decision reason */}
                                          {slotOption?.routeDecisionReason && (
                                            <p className="mt-0.5 text-[10px] text-gray-500 italic">{slotOption.routeDecisionReason}</p>
                                          )}

                                          {slotOption?.timingDecisionReason && (
                                            <p className="mt-0.5 text-[10px] text-gray-500 italic">Timing reason: {slotOption.timingDecisionReason}</p>
                                          )}

                                          {slotOption?.finalDecisionReason && (
                                            <p className={`mt-0.5 text-[10px] italic ${showBestBadge ? 'text-green-700' : 'text-gray-700'}`}>
                                              {showBestBadge ? 'Final reason: ' : 'Why not selected: '}
                                              {slotOption.finalDecisionReason}
                                            </p>
                                          )}

                                          {!slotOption?.prioritySafe && slotOption?.priorityDecisionReason && (
                                            <p className="mt-0.5 text-[10px] text-red-700 italic">Priority reason: {slotOption.priorityDecisionReason}</p>
                                          )}

                                          {/* Best badge */}
                                          {showBestBadge && (
                                            <p className="mt-1 text-[10px] font-semibold text-green-700">✓ Best available slot</p>
                                          )}
                                        </div>
                                      );
                                    })}
                                  </div>
                                )}

                                {/* Show current insertion status on the inserted hotspot row */}
                                <div className="flex flex-wrap items-center gap-2">
                                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full uppercase bg-green-100 text-green-700">
                                    Inserted hotspot
                                  </span>
                                  {!matrixRequiresBuild && activeAnchorFitInsight?.label && (
                                    <span
                                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                        activeAnchorFitInsight.tone === 'green'
                                          ? 'bg-green-100 text-green-700'
                                          : activeAnchorFitInsight.tone === 'red'
                                            ? 'bg-red-100 text-red-700'
                                            : 'bg-amber-100 text-amber-700'
                                      }`}
                                    >
                                      {activeAnchorFitInsight.insertedLabel || activeAnchorFitInsight.label}
                                    </span>
                                  )}
                                  {!matrixRequiresBuild && activeAnchorFitInsight?.anchorLegLabel && (
                                    <span className="text-[10px] text-gray-500">
                                      Between: {activeAnchorFitInsight.anchorLegLabel}
                                    </span>
                                  )}
                                  {selectedSlotHasRouteData && activeAnchorFitInsight?.extraDistanceLabel && (
                                    <span className="text-[11px] font-semibold text-[#4a4260]">
                                      Extra distance: {activeAnchorFitInsight.extraDistanceLabel}
                                    </span>
                                  )}
                                  {selectedSlotHasRouteData && String(effectiveSegTimeRange || '').trim() && (
                                    <span className="text-[11px] font-semibold text-[#4a4260]">
                                      Timing: {String(effectiveSegTimeRange || '').trim()}
                                    </span>
                                  )}
                                  {(activeAnchorFitInsight as any)?.reason && (
                                    <span className="w-full text-[10px] text-gray-500 italic">{(activeAnchorFitInsight as any).reason}</span>
                                  )}
                                </div>

                                {/* Reschedule Priority Confirmation — shown inline inside the selected card */}
                                {pendingPriorityReplacementHotspotId && Array.isArray(pendingPriorityResolution?.removedTopPriorityHotspots) && pendingPriorityResolution.removedTopPriorityHotspots.length > 0 && (
                                  <div ref={priorityConfirmRef} className="mt-3 p-3 rounded-xl border border-red-200 bg-red-50">
                                    {(() => {
                                      const removedPriorityRows = Array.isArray(pendingPriorityResolution?.removedTopPriorityHotspots)
                                        ? pendingPriorityResolution.removedTopPriorityHotspots : [];
                                      const affectedPriorityRows = Array.isArray(pendingPriorityResolution?.topPriorityAffected)
                                        ? pendingPriorityResolution.topPriorityAffected : [];
                                      const sourceRows = removedPriorityRows.length > 0 ? removedPriorityRows : affectedPriorityRows;
                                      const affectedPriorityHotspots = sourceRows
                                        .map((row: any) => {
                                          const id = Number(row?.id ?? row?.hotspotId ?? row?.hotspot_id ?? 0);
                                          const name = String(row?.name || row?.hotspot_name || row?.hotspotName || '').trim();
                                          if (name) return name;
                                          if (id > 0) return `Hotspot #${id}`;
                                          return '';
                                        })
                                        .filter(Boolean);
                                      const affectedPriorityLabel = affectedPriorityHotspots.length > 0
                                        ? affectedPriorityHotspots.join(', ') : 'one or more priority hotspots';
                                      const pluralSuffix = affectedPriorityHotspots.length === 1 ? '' : 's';
                                      return (
                                        <div className="flex items-start gap-2 mb-3">
                                          <div className="h-7 w-7 rounded-full bg-red-100 text-red-600 flex items-center justify-center shrink-0 mt-0.5">
                                            <AlertTriangle className="h-3.5 w-3.5" />
                                          </div>
                                          <div className="min-w-0 flex-1">
                                            <p className="text-sm font-bold text-red-700">Reschedule Priority Hotspot{pluralSuffix}?</p>
                                            <p className="text-xs text-red-700 mt-1 leading-5">
                                              Adding this hotspot requires moving these priority hotspot{pluralSuffix} from the current slot:
                                              <span className="font-semibold"> {affectedPriorityLabel}</span>.
                                              {' '}No hotspot is deleted. The timeline will be reshuffled and following items will be rescheduled.
                                            </p>
                                          </div>
                                        </div>
                                      );
                                    })()}
                                    <div className="grid grid-cols-2 gap-2">
                                      <Button
                                        size="sm"
                                        className="w-full bg-red-600 hover:bg-red-700 text-white"
                                        onClick={handleConfirmPriorityReplacement}
                                        disabled={isPreviewingHotspotId === pendingPriorityReplacementHotspotId}
                                      >
                                        Confirm Reschedule
                                      </Button>
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        className="w-full border-gray-300 text-gray-700 bg-white hover:bg-gray-50"
                                        onClick={handleCancelPriorityReplacement}
                                        disabled={isPreviewingHotspotId === pendingPriorityReplacementHotspotId}
                                      >
                                        Cancel
                                      </Button>
                                    </div>
                                  </div>
                                )}
                              </div>
                            )}

                            {String(seg?.type || '').toLowerCase() === 'attraction' && (
                              <div className="mt-2 flex flex-wrap gap-3 text-xs text-[#6c6c6c]">
                                {priorityLabel !== null && (
                                  <span className="flex items-center font-bold text-indigo-700 bg-indigo-50 px-2 py-1 rounded border border-indigo-100">
                                    Priority: {priorityLabel}
                                  </span>
                                )}
                                {activityVisitTime && (
                                  <span className="flex items-center font-bold text-[#d546ab] bg-[#fdf6ff] px-2 py-1 rounded border border-[#f3e8ff]">
                                    <Clock className="h-3 w-3 mr-1" />
                                    {activityVisitTime}
                                  </span>
                                )}
                                {activityDuration && (
                                  <span className="flex items-center">
                                    <Clock className="h-3 w-3 mr-1" />
                                    {activityDuration}
                                  </span>
                                )}
                                {activityTimings && (
                                  <span className="flex items-center">
                                    <Timer className="h-3 w-3 mr-1" />
                                    {activityTimings}
                                  </span>
                                )}
                              </div>
                            )}

                            {seg?.isConflict && (
                              <div className="mt-2 p-2 bg-white/50 rounded border border-red-100">
                                <p className="text-xs text-red-600 font-medium leading-tight">
                                  {/forced manual insertion after user confirmation/i.test(String(seg?.conflictReason || ''))
                                    ? 'Manual override confirmed. This stop will be included; exact timing may shift.'
                                    : seg?.conflictReason}
                                </p>
                                {(() => {
                                  const parseDurationMinutes = (value: unknown): number | null => {
                                    const raw = String(value || '').trim();
                                    if (!raw) return null;
                                    const h = raw.match(/(\d+)\s*(?:hour|hours|hr|hrs|h)/i);
                                    const m = raw.match(/(\d+)\s*(?:min|mins|m)/i);
                                    if (!h && !m) return null;
                                    const minutes = (h ? Number(h[1]) * 60 : 0) + (m ? Number(m[1]) : 0);
                                    return Number.isFinite(minutes) && minutes > 0 ? minutes : null;
                                  };
                                  const getTimeRangeDurationMinutes = (range: string): number | null => {
                                    const start = parseDisplayMinutes(range, 'start');
                                    const end = parseDisplayMinutes(range, 'end');
                                    if (start == null || end == null) return null;
                                    let delta = end - start;
                                    if (delta < 0) delta += 24 * 60;
                                    return delta > 0 ? delta : null;
                                  };
                                  const formatMinutesLabel = (minutes: number): string => {
                                    const safeMinutes = Math.max(1, Math.round(minutes));
                                    const hours = Math.floor(safeMinutes / 60);
                                    const mins = safeMinutes % 60;
                                    if (hours > 0 && mins > 0) return `${hours}h ${mins}m`;
                                    if (hours > 0) return `${hours}h`;
                                    return `${mins}m`;
                                  };

                                  const prevSeg = idx > 0 ? effectivePreviewTimeline[idx - 1] : null;
                                  const nextSeg = idx + 1 < effectivePreviewTimeline.length ? effectivePreviewTimeline[idx + 1] : null;
                                  const prevSegType = String(prevSeg?.type || '').toLowerCase();
                                  const nextSegType = String(nextSeg?.type || '').toLowerCase();

                                  let nearestPrevTravel: any = null;
                                  for (let p = idx - 1; p >= 0; p -= 1) {
                                    const cand = effectivePreviewTimeline[p];
                                    if (String(cand?.type || '').toLowerCase() === 'travel' && String(cand?.timeRange || '').trim()) {
                                      nearestPrevTravel = cand;
                                      break;
                                    }
                                  }

                                  let nearestNextTravel: any = null;
                                  for (let n = idx + 1; n < effectivePreviewTimeline.length; n += 1) {
                                    const cand = effectivePreviewTimeline[n];
                                    if (String(cand?.type || '').toLowerCase() === 'travel' && String(cand?.timeRange || '').trim()) {
                                      nearestNextTravel = cand;
                                      break;
                                    }
                                  }

                                  const arrivalMinutesFromPrev = (prevSegType === 'travel'
                                    ? parseDisplayMinutes(String(prevSeg?.timeRange || ''), 'end')
                                    : null)
                                    ?? parseDisplayMinutes(String(nearestPrevTravel?.timeRange || ''), 'end');
                                  const nextTravelStartMinutes = parseDisplayMinutes(
                                    String(nextSeg?.timeRange || nearestNextTravel?.timeRange || ''),
                                    'start'
                                  );

                                  const stayMinutesFromText = parseDurationMinutes(activityDuration);
                                  const stayMinutesFromMeta = Number(
                                    seg?.durationMin
                                    ?? seg?.matrixFit?.insertedStopDurationMin
                                    ?? seg?.matrixFit?.stopDurationMin
                                    ?? seg?.matrixFit?.visitDurationMin
                                    ?? seg?.matrixFit?.attractionDurationMin
                                    ?? 0
                                  );
                                  let stayMinutes = stayMinutesFromText
                                    ?? (Number.isFinite(stayMinutesFromMeta) && stayMinutesFromMeta > 0
                                      ? Math.max(1, Math.round(stayMinutesFromMeta))
                                      : null);
                                  if (stayMinutes == null && arrivalMinutesFromPrev != null && nextTravelStartMinutes != null && nextTravelStartMinutes > arrivalMinutesFromPrev) {
                                    stayMinutes = Math.max(1, Math.round(nextTravelStartMinutes - arrivalMinutesFromPrev));
                                  }

                                  let arrivalMinutes = arrivalMinutesFromPrev;
                                  if (arrivalMinutes == null && nextTravelStartMinutes != null && stayMinutes != null) {
                                    arrivalMinutes = nextTravelStartMinutes - stayMinutes;
                                  }

                                  const stayLabel = String(activityDuration || '').trim() || (stayMinutes != null ? formatMinutesLabel(stayMinutes) : '');
                                  const departureMinutes = arrivalMinutes != null && stayMinutes != null
                                    ? arrivalMinutes + stayMinutes
                                    : null;

                                  const nextTravelTo = nextSegType === 'travel'
                                    ? String(nextSeg?.toName || nextSeg?.to || '').trim()
                                    : String(nearestNextTravel?.toName || nearestNextTravel?.to || '').trim();
                                  const nextTravelRange = nextSegType === 'travel'
                                    ? String(nextSeg?.timeRange || '').trim()
                                    : String(nearestNextTravel?.timeRange || '').trim();
                                  const nextTravelDurationMinutes = getTimeRangeDurationMinutes(nextTravelRange);
                                  const hasTravelTimingConflict = (
                                    departureMinutes != null
                                    && nextTravelStartMinutes != null
                                    && departureMinutes > nextTravelStartMinutes
                                  );
                                  const effectiveTravelStartMinutes = hasTravelTimingConflict
                                    ? departureMinutes
                                    : nextTravelStartMinutes;
                                  const effectiveTravelEndMinutes = (
                                    effectiveTravelStartMinutes != null
                                    && nextTravelDurationMinutes != null
                                  )
                                    ? effectiveTravelStartMinutes + nextTravelDurationMinutes
                                    : null;
                                  const effectiveTravelRange = (
                                    effectiveTravelStartMinutes != null
                                    && effectiveTravelEndMinutes != null
                                  )
                                    ? `${formatMinutesToDisplay(effectiveTravelStartMinutes)} - ${formatMinutesToDisplay(effectiveTravelEndMinutes)}`
                                    : nextTravelRange;

                                  if (arrivalMinutes == null && !stayLabel && !nextTravelTo && !nextTravelRange) {
                                    return null;
                                  }

                                  return (
                                    <div className="mt-1.5 space-y-1 text-[11px] text-red-700">
                                      <p>
                                        Proposed arrival after anchor travel:{' '}
                                        {arrivalMinutes != null ? formatMinutesToDisplay(arrivalMinutes) : 'before the next onward leg'}
                                      </p>
                                      <p>
                                        Planned stay at hotspot: {stayLabel || 'as configured for this hotspot'}
                                        {departureMinutes != null ? ` (leave around ${formatMinutesToDisplay(departureMinutes)})` : ''}
                                      </p>
                                      {(nextTravelTo || nextTravelRange) && (
                                        <p>
                                          Then travel to {nextTravelTo || 'hotel'}
                                          {effectiveTravelRange ? ` (${effectiveTravelRange})` : ''}
                                          {hasTravelTimingConflict ? ' after reschedule' : ''}
                                        </p>
                                      )}
                                    </div>
                                  );
                                })()}
                              </div>
                            )}
                          </div>
                        );
                      })}

                      <div className="pt-4 sticky bottom-0 bg-white">
                        {(() => {
                          const forceConflictMode =
                            activePreviewValidation?.readyToApply === false
                            && activePreviewValidation?.requiresPriorityConfirmation !== true
                            && !matrixApplyBlocked;
                          const effectiveDecisionBlocked = confirmActionConfig.disabled && !forceConflictMode;
                          const blockForValidation =
                            activePreviewValidation?.readyToApply === false && !forceConflictMode;
                          return (
                        <Button
                          className={`w-full text-white shadow-lg ${forceConflictMode ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700'}`}
                          onClick={handleAddHotspot}
                          disabled={
                            isApplyingPreviewHotspot
                            || isBuildingMatrix
                            || !activePreviewHotspotId
                            || isCurrentPreviewAlreadyAdded
                            || matrixApplyBlocked
                            || effectiveDecisionBlocked
                            || blockForValidation
                          }
                        >
                          {isApplyingPreviewHotspot ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Adding Hotspot...
                            </>
                          ) : (
                            isCurrentPreviewAlreadyAdded
                              ? 'Added'
                              : isBuildingMatrix
                              ? 'Building matrix...'
                              : isMatrixMissingBlockedState
                              ? 'Build matrix data first'
                              : isMatrixBuiltButNoFeasibleSlot
                              ? 'Cannot Add - Off Route'
                              : matrixApplyBlocked
                              ? 'Cannot Apply'
                              : forceConflictMode
                              ? 'Confirm Force Add (Conflict)'
                              : confirmActionConfig.label
                          )}
                        </Button>
                          );
                        })()}
                      </div>
                    </>
                  ) : (
                    <div className="flex flex-col items-center justify-center h-32 text-[#6c6c6c] border-2 border-dashed rounded-lg">
                      <p className="text-sm">No timeline available for this route.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                previewRequestIdRef.current += 1;
                setAddHotspotModal({
                  open: false,
                  planId: null,
                  routeId: null,
                  locationId: null,
                  locationName: "",
                });
                setHotspotSearchQuery("");
                resetManualHotspotPreviewState();
                setActivePreviewHotspotId(null);
                setAddedInModalHotspotIds(new Set());
                setSelectedHotspotAnchor(null);
              }}
              disabled={isApplyingPreviewHotspot || isBuildingMatrix}
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ArrivalHotelDecisionModal
        open={arrivalPolicyConfirmModal.open}
        onOpenChange={(open) => {
          if (!open) {
            setArrivalPolicyConfirmModal({
              open: false,
              arrivalDate: '',
              previousDayDate: '',
              request: null,
            });
          }
        }}
        arrivalDate={arrivalPolicyConfirmModal.arrivalDate}
        previousDayDate={arrivalPolicyConfirmModal.previousDayDate}
        isLoading={isResolvingArrivalPolicy || isApplyingRouteTimeUpdate}
        onConfirmPreviousDayBilling={async () => {
          if (!arrivalPolicyConfirmModal.request) {
            return;
          }

          const request = arrivalPolicyConfirmModal.request;
          const decisionKey = getRequestArrivalPolicyDecisionKey(request);

          setArrivalPolicyConfirmModal({
            open: false,
            arrivalDate: '',
            previousDayDate: '',
            request: null,
          });

          if (pendingRouteTimeUpdate) {
            // Triggered by a Day-1 route time change – proceed with the PATCH
            const { planId, routeId, dayNumber, startTimeHms, endTimeHms } = pendingRouteTimeUpdate;
            setPendingRouteTimeUpdate(null);
            await applyRouteTimePatch(planId, routeId, dayNumber, startTimeHms, endTimeHms, {
              previousDayBillingDecisionProvided: true,
              previousDayBillingConfirmed: true,
            });
            if (decisionKey) {
              setLastArrivalPolicyDecisionKey(decisionKey);
            }
            return;
          }

          const persisted = await persistArrivalPolicyDecision(
            request,
            true,
          );

          if (!persisted) {
            const nextRequest: HotelArrivalPolicyRequest = {
              ...request,
              previousDayBillingDecisionProvided: true,
              previousDayBillingConfirmed: true,
            };
            await resolveArrivalPolicyForArrivalTimeChange(nextRequest);
            return;
          }

          if (decisionKey) {
            setLastArrivalPolicyDecisionKey(decisionKey);
          }
        }}
        onDeclinePreviousDayBilling={async () => {
          if (!arrivalPolicyConfirmModal.request) {
            return;
          }

          const request = arrivalPolicyConfirmModal.request;
          const decisionKey = getRequestArrivalPolicyDecisionKey(request);

          setArrivalPolicyConfirmModal({
            open: false,
            arrivalDate: '',
            previousDayDate: '',
            request: null,
          });

          if (pendingRouteTimeUpdate) {
            // User declined previous-day billing – still apply the route time change
            const { planId, routeId, dayNumber, startTimeHms, endTimeHms } = pendingRouteTimeUpdate;
            setPendingRouteTimeUpdate(null);
            await applyRouteTimePatch(planId, routeId, dayNumber, startTimeHms, endTimeHms, {
              previousDayBillingDecisionProvided: true,
              previousDayBillingConfirmed: false,
            });
            if (decisionKey) {
              setLastArrivalPolicyDecisionKey(decisionKey);
            }
            return;
          }

          const persisted = await persistArrivalPolicyDecision(
            request,
            false,
          );

          if (!persisted) {
            const nextRequest: HotelArrivalPolicyRequest = {
              ...request,
              previousDayBillingDecisionProvided: true,
              previousDayBillingConfirmed: false,
            };
            await resolveArrivalPolicyForArrivalTimeChange(nextRequest);
            return;
          }

          if (decisionKey) {
            setLastArrivalPolicyDecisionKey(decisionKey);
          }
        }}
      />

      {/* Hotel Search Modal - NEW Real-Time Search */}
      <HotelSearchModal
        open={hotelSelectionModal.open}
        onOpenChange={(open) => {
          if (!open) {
            setHotelSelectionModal({
              open: false,
              planId: null,
              routeId: null,
              routeDate: "",
            });
            setHotelSearchChildAges([]);
          }
        }}
        cityCode={hotelSelectionModal.cityCode || ""}
        cityName={hotelSelectionModal.cityName || ""}
        checkInDate={hotelSelectionModal.checkInDate || hotelSelectionModal.routeDate}
        checkOutDate={hotelSelectionModal.checkOutDate || hotelSelectionModal.routeDate}
        roomCount={Number(itinerary?.roomCount || 1)}
        adultCount={Number(itinerary?.adults || 0)}
        childCount={Number(itinerary?.children || 0)}
        infantCount={Number(itinerary?.infants || 0)}
        childAges={hotelSearchChildAges}
        guestNationality={guestDetails.nationality.toUpperCase()}
        onChildAgesChange={setHotelSearchChildAges}
        onSelectHotel={handleSelectHotelFromSearch}
        isSelectingHotel={isSelectingHotel}
      />

      {/* Hotel Room Selection Modal */}
      {roomSelectionModal && (
        <HotelRoomSelectionModal
          open={roomSelectionModal.open}
          onOpenChange={(open) => {
            if (!open) {
              setRoomSelectionModal(null);
            }
          }}
          itinerary_plan_hotel_details_ID={roomSelectionModal.itinerary_plan_hotel_details_ID}
          itinerary_plan_id={roomSelectionModal.itinerary_plan_id}
          itinerary_route_id={roomSelectionModal.itinerary_route_id}
          hotel_id={roomSelectionModal.hotel_id}
          group_type={roomSelectionModal.group_type}
          hotel_name={roomSelectionModal.hotel_name}
          onSuccess={() => {
            toast.success('Room categories updated successfully');
            // Note: Room selection is saved to DB but doesn't affect the hotel list display
          }}
        />
      )}

      {/* Gallery Modal */}
      <Dialog
        open={galleryModal.open}
        onOpenChange={(open) => setGalleryModal({ ...galleryModal, open })}
      >
        <DialogContent className="sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>{galleryModal.title} - Gallery</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            {galleryModal.images.length === 0 ? (
              <p className="text-sm text-[#6c6c6c] text-center py-8">
                No images available
              </p>
            ) : (
              <div className="flex flex-col gap-3">
                {/* Main image */}
                <div className="relative w-full bg-black rounded-lg overflow-hidden" style={{ height: 340 }}>
                  <img
                    src={galleryModal.images[galleryActiveIdx]}
                    alt={`${galleryModal.title} ${galleryActiveIdx + 1}`}
                    className="w-full h-full object-contain"
                  />
                  {galleryModal.images.length > 1 && (
                    <>
                      <button
                        className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/80 text-white rounded-full w-9 h-9 flex items-center justify-center text-lg"
                        onClick={() => setGalleryActiveIdx(i => (i - 1 + galleryModal.images.length) % galleryModal.images.length)}
                      >
                        &#8249;
                      </button>
                      <button
                        className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/80 text-white rounded-full w-9 h-9 flex items-center justify-center text-lg"
                        onClick={() => setGalleryActiveIdx(i => (i + 1) % galleryModal.images.length)}
                      >
                        &#8250;
                      </button>
                      <span className="absolute bottom-2 right-3 bg-black/50 text-white text-xs px-2 py-0.5 rounded-full">
                        {galleryActiveIdx + 1} / {galleryModal.images.length}
                      </span>
                    </>
                  )}
                </div>
                {/* Thumbnails */}
                {galleryModal.images.length > 1 && (
                  <div className="flex gap-2 overflow-x-auto pb-1">
                    {galleryModal.images.map((img, idx) => (
                      <button
                        key={idx}
                        onClick={() => setGalleryActiveIdx(idx)}
                        className={`flex-shrink-0 w-16 h-16 rounded-md overflow-hidden border-2 transition-colors ${idx === galleryActiveIdx ? 'border-[#d546ab]' : 'border-transparent'
                          }`}
                      >
                        <img
                          src={img}
                          alt={`Thumb ${idx + 1}`}
                          className="w-full h-full object-cover"
                        />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() =>
                setGalleryModal({ open: false, images: [], title: "" })
              }
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Video Modal */}
      <Dialog
        open={videoModal.open}
        onOpenChange={(open) => setVideoModal({ ...videoModal, open })}
      >
        <DialogContent className="sm:max-w-4xl">
          <DialogHeader>
            <DialogTitle>{videoModal.title} - Video</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            {videoModal.videoUrl ? (
              <div className="aspect-video">
                <iframe
                  src={videoModal.videoUrl}
                  className="w-full h-full rounded-lg"
                  allowFullScreen
                  title={videoModal.title}
                />
              </div>
            ) : (
              <p className="text-sm text-[#6c6c6c] text-center py-8">
                No video available
              </p>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() =>
                setVideoModal({ open: false, videoUrl: "", title: "" })
              }
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Clipboard Modal */}
      <Dialog
  open={itineraryPreference === 2 ? false : clipboardModal}
  onOpenChange={itineraryPreference === 2 ? undefined : setClipboardModal}
>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {clipboardType === 'recommended' && 'Recommended Hotel for Recommended'}
              {clipboardType === 'highlights' && 'Recommended Hotel for Highlights'}
              {clipboardType === 'para' && 'Recommended Hotel for Para'}
            </DialogTitle>
            <DialogDescription>
              Select recommended options to copy to clipboard
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-3">
            {!paraRecommendations.length ? (
              <p className="text-sm text-[#6c6c6c] text-center py-8">
                No hotel information available
              </p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {paraRecommendations.map((item, idx) => {
                  const key = `para-${idx}`;
                  return (
                    <div key={key} className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        id={`para-${key}`}
                        className="h-6 w-6 cursor-pointer accent-[#5f259f] border-[#5f259f]"
                        checked={selectedHotels[key] || false}
                        onChange={(e) =>
                          setSelectedHotels({ ...selectedHotels, [key]: e.target.checked })
                        }
                      />
                      <label htmlFor={`para-${key}`} className="text-xl text-[#d546ab] font-medium cursor-pointer">
                        {item.label}
                      </label>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => {
              setClipboardModal(false);
              setSelectedHotels({});
            }}>
              Cancel
            </Button>
            <Button
              className="bg-[#8b43d1] hover:bg-[#7c37c1]"
              onClick={async () => {
                const selectedCount = Object.values(selectedHotels).filter(Boolean).length;

                if (selectedCount === 0) {
                  toast.error(
                    clipboardType === "para"
                      ? "Please select at least one recommendation"
                      : "Please select at least one hotel"
                  );
                  return;
                }

                if (!hotelDetails || !itinerary) return;

                try {
                  const selectedGroups = getSelectedClipboardGroups(clipboardType);
                  const groupTypes = selectedGroups.map((group) => group.groupType);

                  const { html, plainText } = await ItineraryService.getClipboardContent(
                    itinerary.quoteId,
                    clipboardType,
                    groupTypes,
                  );

                  if (!html || !plainText) {
                    toast.error("Failed to prepare clipboard content");
                    return;
                  }

                  // Keep backend structure, but use the already-rendered hotel HTML from frontend state
                  // so clipboard hotels match what user sees without relying on backend hotel section.
                  const localClipboard = buildClipboardHtml(clipboardType);
                  const renderedHotelsHtml =
                    localClipboard.hotelSectionsHtml ||
                    extractHotelSectionFromHtml(localClipboard.html);
                  const mergedWithHotelsHtml = mergeClipboardWithRenderedHotels(html, renderedHotelsHtml);
                  const mergedHtml = mergeClipboardWithRenderedCost(
                    mergedWithHotelsHtml,
                    localClipboard.costSectionHtml || "",
                  );
                  const mergedPlainText = htmlToPlainText(mergedHtml);

                  await copyHtmlToClipboard(mergedHtml, mergedPlainText)
                    .then(() => {
                      toast.success("Formatted clipboard content copied!");
                      setClipboardModal(false);
                      setSelectedHotels({});
                    })
                    .catch(() => {
                      toast.error("Failed to copy clipboard content");
                    });
                } catch (error) {
                  console.error("Failed to fetch clipboard content", error);
                  toast.error("Failed to prepare clipboard content");
                }
              }}
            >
              Copy Clipboard
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Share via Email Modal */}
      <Dialog open={shareModal} onOpenChange={setShareModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Share via Email</DialogTitle>
            <DialogDescription>
              Send itinerary details via email
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div>
              <label className="text-sm font-medium text-[#4a4260] mb-2 block">
                Recipient Email
              </label>
              <input
                type="email"
                className="w-full px-3 py-2 border border-[#e5d9f2] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#d546ab]"
                placeholder="email@example.com"
                id="share-email-input"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-[#4a4260] mb-2 block">
                Message (Optional)
              </label>
              <textarea
                className="w-full px-3 py-2 border border-[#e5d9f2] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#d546ab]"
                rows={4}
                placeholder="Add a personal message..."
                id="share-email-message"
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShareModal(false)}>
              Cancel
            </Button>
            <Button
              className="bg-[#17a2b8] hover:bg-[#138496]"
              onClick={() => {
                const emailInput = document.getElementById('share-email-input') as HTMLInputElement;
                const messageInput = document.getElementById('share-email-message') as HTMLTextAreaElement;

                if (!emailInput?.value) {
                  toast.error('Please enter recipient email');
                  return;
                }

                const subject = encodeURIComponent(`Itinerary Details - ${quoteId}`);
                const body = encodeURIComponent(
                  `${messageInput?.value || 'Please find the itinerary details below:'}\n\n` +
                  `Itinerary Link: ${window.location.href}`
                );

                window.open(`mailto:${emailInput.value}?subject=${subject}&body=${body}`, '_blank');
                toast.success('Email client opened!');
                setShareModal(false);
              }}
            >
              Send Email
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* All Hotspots Preview Modal (Day Overview) */}
      <Dialog
        open={allHotspotsPreviewModal.open}
        onOpenChange={(open) =>
          setAllHotspotsPreviewModal(prev => ({ ...prev, open }))
        }
      >
        <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Preview Activity for All Hotspots</DialogTitle>
            <DialogDescription>
              {allHotspotsPreviewModal.data?.activity?.title} - Duration:{' '}
              {formatActivityDuration(allHotspotsPreviewModal.data?.activity?.duration)}
            </DialogDescription>
          </DialogHeader>

          <div className="py-4 space-y-4 max-h-[70vh] overflow-y-auto">
            {allHotspotsPreviewModal.loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-[#d546ab]" />
              </div>
            ) : allHotspotsPreviewModal.data?.hotspots && allHotspotsPreviewModal.data.hotspots.length > 0 ? (
              allHotspotsPreviewModal.data.hotspots.map((hotspotPreview: any, idx: number) => (
                <Card
                  key={hotspotPreview.routeHotspotId}
                  className={`border-2 ${hotspotPreview.isAlreadyAdded
                      ? 'border-gray-300 bg-gray-50'
                      : hotspotPreview.hasConflicts
                        ? 'border-red-500 bg-red-50'
                        : 'border-green-500 bg-green-50'
                    }`}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h4 className="font-semibold text-[#4a4260]">
                            {hotspotPreview.hotspotName
                              ? `${hotspotPreview.hotspotName}`
                              : `Hotspot #${idx + 1}`}
                          </h4>
                          <span
                            className={`text-xs font-bold px-2 py-1 rounded-full ${hotspotPreview.isAlreadyAdded
                                ? 'bg-gray-300 text-gray-700'
                                : hotspotPreview.hasConflicts
                                  ? 'bg-red-300 text-red-700'
                                  : 'bg-green-300 text-green-700'
                              }`}
                          >
                            {hotspotPreview.isAlreadyAdded
                              ? 'Already Added'
                              : hotspotPreview.hasConflicts
                                ? 'Conflict'
                                : 'Fits'}
                          </span>
                        </div>

                        <p className="text-sm text-[#6c6c6c] mb-2">
                          Hotspot Time Window:{' '}
                          {formatPreviewTime(
                            hotspotPreview.hotspotTiming.startTime
                          )}{' '}
                          -{' '}
                          {formatPreviewTime(
                            hotspotPreview.hotspotTiming.endTime
                          )}
                        </p>

                        {!hotspotPreview.isAlreadyAdded &&
                          hotspotPreview.proposedTiming && (
                            <div className="bg-white rounded-lg border border-gray-200 p-3 space-y-1 text-sm">
                              <div className="flex justify-between">
                                <span className="text-[#6c6c6c]">
                                  Proposed Insertion:
                                </span>
                                <span className="font-medium text-[#4a4260]">
                                  {formatPreviewTime(
                                    hotspotPreview.proposedTiming
                                      .startTime
                                  )}{' '}
                                  -{' '}
                                  {formatPreviewTime(
                                    hotspotPreview.proposedTiming.endTime
                                  )}
                                </span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-[#6c6c6c]">
                                  Position:
                                </span>
                                <span className="font-medium text-[#4a4260]">
                                  #{hotspotPreview.proposedTiming.order}
                                </span>
                              </div>
                              {hotspotPreview.proposedTiming
                                .willExtendHotspot && (
                                  <div className="text-amber-700 font-medium">
                                    ⚠️ Will extend hotspot end time
                                  </div>
                                )}
                            </div>
                          )}

                        {hotspotPreview.hasConflicts &&
                          hotspotPreview.conflicts?.length > 0 && (
                            <div className="bg-red-100 rounded-lg border border-red-200 p-3 mt-2 text-sm">
                              <div className="font-semibold text-red-700 mb-1">
                                {hotspotPreview.conflicts.length} Conflict
                                {hotspotPreview.conflicts.length > 1
                                  ? 's'
                                  : ''}
                                :
                              </div>
                              {hotspotPreview.conflicts.map(
                                (c: any, cidx: number) => (
                                  <div
                                    key={cidx}
                                    className="text-red-700 ml-3 text-xs"
                                  >
                                    • {c.reason}
                                  </div>
                                )
                              )}
                            </div>
                          )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : (
              <p className="text-sm text-[#6c6c6c] text-center py-8">
                No hotspots found for this route
              </p>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() =>
                setAllHotspotsPreviewModal(prev => ({
                  ...prev,
                  open: false,
                }))
              }
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirm Quotation Modal */}
      <Dialog open={confirmQuotationModal} onOpenChange={setConfirmQuotationModal}>
        <DialogContent className="w-[96vw] sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add Guest Details</DialogTitle>
            <DialogDescription>
              Enter primary guest information and travel details
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Quotation Details */}
            {agentInfo && (
              <div className="bg-[#f8f9fa] p-4 rounded-lg space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-[#6c6c6c]">Quotation No:</span>
                  <span className="font-medium text-[#4a4260]">{agentInfo.quotation_no}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-[#6c6c6c]">Agent Name:</span>
                  <span className="font-medium text-[#4a4260]">{agentInfo.agent_name}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-[#6c6c6c]">Wallet Balance:</span>
                  <span className={`font-medium ${walletBalance.includes('-') ? 'text-red-600' : 'text-green-600'}`}>
                    {walletBalance}
                  </span>
                </div>
              </div>
            )}

            <div className="bg-[#f8f9fa] p-4 rounded-lg space-y-2">
              <div className="flex justify-between text-sm gap-4">
                <span className="text-[#6c6c6c]">Rooms To Be Booked:</span>
                <span className="font-medium text-[#4a4260]">{confirmRoomCount}</span>
              </div>
              <div className="flex justify-between text-sm gap-4">
                <span className="text-[#6c6c6c]">Passenger Mix:</span>
                <span className="font-medium text-[#4a4260] text-right">{confirmPassengerMix || 'No passengers selected'}</span>
              </div>
              <div className="pt-2 border-t border-[#e6e6e6]">
                <p className="text-sm text-[#6c6c6c] mb-2">Rooming Preview</p>
                <div className="space-y-1">
                  {confirmOccupancyPreview.map((room, index) => {
                    const roomMix = [
                      room.adults > 0 ? `${room.adults} Adult${room.adults === 1 ? '' : 's'}` : null,
                      room.children > 0 ? `${room.children} Child${room.children === 1 ? '' : 'ren'}` : null,
                    ].filter(Boolean).join(', ');

                    return (
                      <div key={`confirm-room-${index}`} className="flex justify-between text-sm gap-4">
                        <span className="text-[#6c6c6c]">Room {index + 1}:</span>
                        <span className="font-medium text-[#4a4260] text-right">{roomMix || 'No passengers assigned'}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {(Number(itinerary?.children || 0) > 0 || Number(itinerary?.infants || 0) > 0) && (
              <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
                <p className="text-sm font-medium text-amber-800">Passenger details required for final booking</p>
                <p className="text-xs text-amber-700 mt-1">
                  Child and infant details entered below are sent in the final booking API payload. Review names, ages, and nationality before confirming.
                </p>
              </div>
            )}

            {(isOpeningConfirmQuotation || isPrebooking) && !prebookData && (
              <div className="flex items-center gap-3 border border-[#e5d9f2] rounded-lg p-4 bg-[#faf5ff]">
                <Loader2 className="h-5 w-5 animate-spin text-[#d546ab]" />
                <div>
                  <p className="text-sm font-medium text-[#4a4260]">Fetching latest prebook details...</p>
                  <p className="text-xs text-[#6c6c6c]">Loading updated price, amenities, rate conditions, and inclusions.</p>
                </div>
              </div>
            )}

            {!prebookData && !isPrebooking && !isOpeningConfirmQuotation && nonTboSelectedHotelEntries.length > 0 && (
              <div className="space-y-3 border border-[#e5d9f2] rounded-lg p-4 bg-[#faf5ff]">
                <h3 className="font-semibold text-[#4a4260]">Selected Hotels (Non-TBO)</h3>
                <p className="text-xs text-[#6c6c6c]">No TBO hotels selected — TBO prebook not required for this booking.</p>
                {nonTboSelectedHotelEntries.map((hotel: any, index: number) => {
                  const detailRow = (hotel?.matchedHotelRow || hotel) as any;
                  const hotelAmenities = normalizePrebookItems(detailRow?.amenities || detailRow?.facilities);
                  const hotelRateConditions = normalizePrebookItems(detailRow?.rateConditions);
                  const hotelInclusions = resolvePrebookInclusions(detailRow);
                  const hotelMealType = resolvePrebookMealPlan(detailRow);
                  const hotelCancellation = normalizeCancellationPolicyItems(
                    detailRow?.cancellationPolicy || detailRow?.cancellationPoliciesText,
                  );

                  return (
                    <details key={`ntbo-only-${hotel?.routeId ?? index}`} className="rounded-lg border border-[#e5d9f2] bg-white p-4 space-y-3">
                      <summary className="cursor-pointer list-none">
                        <div className="flex flex-col gap-1 md:flex-row md:items-start md:justify-between">
                          <div>
                            <p className="font-semibold text-[#4a4260]">{hotel?.hotelName || `Hotel ${index + 1}`}</p>
                            <p className="text-xs text-[#6c6c6c]">
                              Provider: <span className="uppercase font-medium">{hotel?.provider || 'Non-TBO'}</span>
                              {hotel?.roomType ? ` · ${hotel.roomType}` : ''}
                            </p>
                            <p className="text-xs text-[#6c6c6c]">Tap to view details</p>
                          </div>
                          <div className="text-sm text-left md:text-right">
                            <p className="text-[#6c6c6c]">Selected Price</p>
                            <p className="font-semibold text-[#4a4260]">₹ {Number(hotel?.netAmount || 0).toFixed(2)}</p>
                          </div>
                        </div>
                      </summary>

                      <div className="pt-3 space-y-3 border-t border-[#f1e7fb]">
                        {hotelMealType ? (
                          <p className="text-xs text-[#6c6c6c]">
                            Meal Plan: <span className="font-medium text-[#4a4260]">{normalizeMealPlanLabel(hotelMealType)}</span>
                          </p>
                        ) : null}

                        <details className="rounded-lg border border-[#eadcfb] bg-[#fcf9ff] px-3 py-2" open>
                          <summary className="cursor-pointer text-sm font-medium text-[#4a4260]">Cancellation Policy ({hotelCancellation.length})</summary>
                          <div className="mt-2">
                            {hotelCancellation.length > 0 ? (
                              <ul className="text-sm text-[#4a4260] list-disc pl-5 space-y-1 whitespace-pre-wrap">
                                {hotelCancellation.map((item, idx) => (
                                  <li key={`ntbo-only-cancel-${hotel?.routeId ?? index}-${idx}`}>{item}</li>
                                ))}
                              </ul>
                            ) : (
                              <p className="text-sm text-[#4a4260]">No cancellation policy available</p>
                            )}
                          </div>
                        </details>

                        <details className="rounded-lg border border-[#eadcfb] bg-[#fcf9ff] px-3 py-2">
                          <summary className="cursor-pointer text-sm font-medium text-[#4a4260]">Rate Conditions ({hotelRateConditions.length})</summary>
                          <div className="mt-2">
                            {hotelRateConditions.length > 0 ? (
                              <ul className="text-sm text-[#4a4260] list-disc pl-5 space-y-1 whitespace-pre-wrap">
                                {hotelRateConditions.map((item, idx) => (
                                  <li key={`ntbo-only-rate-${hotel?.routeId ?? index}-${idx}`}>{item}</li>
                                ))}
                              </ul>
                            ) : (
                              <p className="text-sm text-[#4a4260]">No rate conditions available</p>
                            )}
                          </div>
                        </details>

                        <details className="rounded-lg border border-[#eadcfb] bg-[#fcf9ff] px-3 py-2">
                          <summary className="cursor-pointer text-sm font-medium text-[#4a4260]">Amenities ({hotelAmenities.length})</summary>
                          <div className="mt-2">
                            {hotelAmenities.length > 0 ? (
                              <ul className="text-sm text-[#4a4260] list-disc pl-5 space-y-1 whitespace-pre-wrap">
                                {hotelAmenities.map((item, idx) => (
                                  <li key={`ntbo-only-amenity-${hotel?.routeId ?? index}-${idx}`}>{item}</li>
                                ))}
                              </ul>
                            ) : (
                              <p className="text-sm text-[#4a4260]">No amenities available</p>
                            )}
                          </div>
                        </details>

                        <details className="rounded-lg border border-[#eadcfb] bg-[#fcf9ff] px-3 py-2">
                          <summary className="cursor-pointer text-sm font-medium text-[#4a4260]">Package Inclusions ({hotelInclusions.length})</summary>
                          <div className="mt-2">
                            {hotelInclusions.length > 0 ? (
                              <ul className="text-sm text-[#4a4260] list-disc pl-5 space-y-1 whitespace-pre-wrap">
                                {hotelInclusions.map((item, idx) => (
                                  <li key={`ntbo-only-inc-${hotel?.routeId ?? index}-${idx}`}>{item}</li>
                                ))}
                              </ul>
                            ) : (
                              <p className="text-sm text-[#4a4260]">No inclusions available</p>
                            )}
                          </div>
                        </details>

                        <p className="text-xs text-[#9c7fb8] bg-[#f5eeff] border border-[#e5d9f2] rounded px-2 py-1">
                          Policies and rate conditions are managed by the provider. TBO prebook is not applicable.
                        </p>
                      </div>
                    </details>
                  );
                })}
                <label className="flex items-start gap-2 text-sm text-[#4a4260]">
                  <input
                    type="checkbox"
                    className="mt-1"
                    checked={hasAcceptedUpdatedPrice}
                    onChange={(e) => setHasAcceptedUpdatedPrice(e.target.checked)}
                  />
                  <span>I have reviewed the selected hotel details before final booking confirmation.</span>
                </label>
              </div>
            )}

            {prebookData && (
              <div className="space-y-3 border border-[#e5d9f2] rounded-lg p-4 bg-[#faf5ff]">
                <h3 className="font-semibold text-[#4a4260]">Prebook Review</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-[#6c6c6c]">Updated Final Price</p>
                    <p className="font-semibold text-[#4a4260]">
                      ₹ {Number(prebookData.updatedTotalPrice || prebookData.finalPrice || prebookData.totalAmount || 0).toFixed(2)}
                    </p>
                  </div>
                  <div>
                    <p className="text-[#6c6c6c]">Hotels Prebooked (TBO)</p>
                    <p className="font-semibold text-[#4a4260]">{prebookHotelEntries.length || 0}</p>
                  </div>
                </div>

                {prebookHotelEntries.map((hotel: any, index: number) => {
                  const hotelPrice = Number(hotel?.updatedTotalPrice || hotel?.finalPrice || hotel?.totalAmount || 0);
                  const hotelAmenities = normalizePrebookItems(hotel?.amenities);
                  const hotelRateConditions = normalizePrebookItems(hotel?.rateConditions);
                  const hotelInclusions = resolvePrebookInclusions(hotel);
                  const hotelMealType = resolvePrebookMealPlan(hotel);
                  const hotelCancellation = normalizeCancellationPolicyItems(hotel?.cancellationPolicy || hotel?.cancellationPoliciesText);
                  const hotelPromotions = normalizePrebookItems(hotel?.roomPromotion);
                  const hotelSupplements = Array.isArray(hotel?.normalizedSupplements) ? hotel.normalizedSupplements : [];
                  const hotelMandatorySupplements = normalizePrebookItems(hotel?.mandatorySupplements);

                  return (
                    <details key={`prebook-hotel-${hotel?.routeId ?? index}-${hotel?.hotelCode ?? index}`} className="rounded-lg border border-[#eadcfb] bg-white p-4 space-y-3">
                      <summary className="cursor-pointer list-none">
                        <div className="flex flex-col gap-1 md:flex-row md:items-start md:justify-between">
                          <div>
                            <p className="font-semibold text-[#4a4260]">{hotel?.hotelName || `Hotel ${index + 1}`}</p>
                            <p className="text-xs text-[#6c6c6c]">Tap to view details</p>
                          </div>
                          <div className="text-sm text-left md:text-right">
                            <p className="text-[#6c6c6c]">Updated Final Price</p>
                            <p className="font-semibold text-[#4a4260]">₹ {hotelPrice.toFixed(2)}</p>
                          </div>
                        </div>
                      </summary>

                      <div className="pt-3 space-y-3 border-t border-[#f1e7fb]">
                        <div>
                          <p className="text-xs text-[#6c6c6c]">Hotel Code: {hotel?.hotelCode || '-'}</p>
                          {hotel?.routeId ? <p className="text-xs text-[#6c6c6c]">Route ID: {hotel.routeId}</p> : null}
                          {hotelMealType ? (
                            <p className="text-xs text-[#6c6c6c]">
                              Meal Plan: <span className="font-medium text-[#4a4260]">{normalizeMealPlanLabel(hotelMealType)}</span>
                            </p>
                          ) : null}
                        </div>

                      <details className="rounded-lg border border-[#eadcfb] bg-[#fcf9ff] px-3 py-2" open>
                        <summary className="cursor-pointer text-sm font-medium text-[#4a4260]">Cancellation Policy ({hotelCancellation.length})</summary>
                        <div className="mt-2">
                          {hotelCancellation.length > 0 ? (
                            <ul className="text-sm text-[#4a4260] list-disc pl-5 space-y-1 whitespace-pre-wrap">
                              {hotelCancellation.map((item, idx) => (
                                <li key={`hotel-cancel-${hotel?.routeId ?? index}-${idx}`}>{item}</li>
                              ))}
                            </ul>
                          ) : (
                            <p className="text-sm text-[#4a4260]">No cancellation policy returned</p>
                          )}
                        </div>
                      </details>

                      <details className="rounded-lg border border-[#eadcfb] bg-[#fcf9ff] px-3 py-2">
                        <summary className="cursor-pointer text-sm font-medium text-[#4a4260]">Room Promotion ({hotelPromotions.length})</summary>
                        <div className="mt-2">
                          {hotelPromotions.length > 0 ? (
                            <ul className="text-sm text-[#4a4260] list-disc pl-5 space-y-1 whitespace-pre-wrap">
                              {hotelPromotions.map((item, idx) => (
                                <li key={`hotel-promo-${hotel?.routeId ?? index}-${idx}`}>{item}</li>
                              ))}
                            </ul>
                          ) : (
                            <p className="text-sm text-[#4a4260]">No room promotion returned</p>
                          )}
                        </div>
                      </details>

                      <details className="rounded-lg border border-[#eadcfb] bg-[#fcf9ff] px-3 py-2">
                        <summary className="cursor-pointer text-sm font-medium text-[#4a4260]">Rate Conditions ({hotelRateConditions.length})</summary>
                        <div className="mt-2">
                          {hotelRateConditions.length > 0 ? (
                            <ul className="text-sm text-[#4a4260] list-disc pl-5 space-y-1 whitespace-pre-wrap">
                              {hotelRateConditions.map((item, idx) => (
                                <li key={`hotel-rate-${hotel?.routeId ?? index}-${idx}`}>{item}</li>
                              ))}
                            </ul>
                          ) : (
                            <p className="text-sm text-[#4a4260]">No rate conditions returned</p>
                          )}
                        </div>
                      </details>

                      <details className="rounded-lg border border-[#eadcfb] bg-[#fcf9ff] px-3 py-2">
                        <summary className="cursor-pointer text-sm font-medium text-[#4a4260]">Amenities ({hotelAmenities.length})</summary>
                        <div className="mt-2">
                          {hotelAmenities.length > 0 ? (
                            <ul className="text-sm text-[#4a4260] list-disc pl-5 space-y-1 whitespace-pre-wrap">
                              {hotelAmenities.map((item, idx) => (
                                <li key={`hotel-amenity-${hotel?.routeId ?? index}-${idx}`}>{item}</li>
                              ))}
                            </ul>
                          ) : (
                            <p className="text-sm text-[#4a4260]">No amenities returned</p>
                          )}
                        </div>
                      </details>

                      <details className="rounded-lg border border-[#eadcfb] bg-[#fcf9ff] px-3 py-2">
                        <summary className="cursor-pointer text-sm font-medium text-[#4a4260]">Package Inclusions ({hotelInclusions.length})</summary>
                        <div className="mt-2">
                          {hotelInclusions.length > 0 ? (
                            <ul className="text-sm text-[#4a4260] list-disc pl-5 space-y-1 whitespace-pre-wrap">
                              {hotelInclusions.map((item, idx) => (
                                <li key={`hotel-inclusion-${hotel?.routeId ?? index}-${idx}`}>{item}</li>
                              ))}
                            </ul>
                          ) : (
                            <p className="text-sm text-[#4a4260]">No inclusions returned</p>
                          )}
                        </div>
                      </details>

                      <div>
                        <p className="text-[#6c6c6c] text-sm">Mandatory Supplements & Additional Charges</p>
                        {hotelSupplements.length > 0 ? (
                          <SupplementDisplay supplements={hotelSupplements} showHeading={false} />
                        ) : hotelMandatorySupplements.length > 0 ? (
                          <ul className="text-sm text-[#4a4260] list-disc pl-5 space-y-1 whitespace-pre-wrap">
                            {hotelMandatorySupplements.map((item, idx) => (
                              <li key={`hotel-supplement-${hotel?.routeId ?? index}-${idx}`}>{item}</li>
                            ))}
                          </ul>
                        ) : (
                          <p className="text-sm text-[#4a4260]">No mandatory supplements returned</p>
                        )}
                      </div>
                      </div>
                    </details>
                  );
                })}

                {nonTboSelectedHotelEntries.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-[#6c6c6c] uppercase tracking-wide mt-1">Non-TBO Selected Hotels</p>
                    {nonTboSelectedHotelEntries.map((hotel: any, index: number) => {
                      const detailRow = (hotel?.matchedHotelRow || hotel) as any;
                      const hotelAmenities = normalizePrebookItems(detailRow?.amenities || detailRow?.facilities);
                      const hotelRateConditions = normalizePrebookItems(detailRow?.rateConditions);
                      const hotelInclusions = resolvePrebookInclusions(detailRow);
                      const hotelMealType = resolvePrebookMealPlan(detailRow);
                      const hotelCancellation = normalizeCancellationPolicyItems(
                        detailRow?.cancellationPolicy || detailRow?.cancellationPoliciesText,
                      );

                      return (
                        <details
                          key={`non-tbo-hotel-${hotel?.routeId ?? index}`}
                          className="rounded-lg border border-[#e5d9f2] bg-white p-4 space-y-3"
                        >
                          <summary className="cursor-pointer list-none">
                            <div className="flex flex-col gap-1 md:flex-row md:items-start md:justify-between">
                              <div>
                                <p className="font-semibold text-[#4a4260]">{hotel?.hotelName || `Hotel ${index + 1}`}</p>
                                <p className="text-xs text-[#6c6c6c]">
                                  Provider: <span className="uppercase font-medium">{hotel?.provider || 'Non-TBO'}</span>
                                  {hotel?.roomType ? ` · ${hotel.roomType}` : ''}
                                </p>
                                <p className="text-xs text-[#6c6c6c]">Tap to view details</p>
                              </div>
                              <div className="text-sm text-left md:text-right">
                                <p className="text-[#6c6c6c]">Selected Price</p>
                                <p className="font-semibold text-[#4a4260]">₹ {Number(hotel?.netAmount || 0).toFixed(2)}</p>
                              </div>
                            </div>
                          </summary>

                          <div className="pt-3 space-y-3 border-t border-[#f1e7fb]">
                            <div>
                              <p className="text-xs text-[#6c6c6c]">Hotel Code: {hotel?.hotelCode || detailRow?.hotelCode || '-'}</p>
                              {hotel?.routeId ? <p className="text-xs text-[#6c6c6c]">Route ID: {hotel.routeId}</p> : null}
                              {hotelMealType ? (
                                <p className="text-xs text-[#6c6c6c]">
                                  Meal Plan: <span className="font-medium text-[#4a4260]">{normalizeMealPlanLabel(hotelMealType)}</span>
                                </p>
                              ) : null}
                            </div>

                            <details className="rounded-lg border border-[#eadcfb] bg-[#fcf9ff] px-3 py-2" open>
                              <summary className="cursor-pointer text-sm font-medium text-[#4a4260]">Cancellation Policy ({hotelCancellation.length})</summary>
                              <div className="mt-2">
                                {hotelCancellation.length > 0 ? (
                                  <ul className="text-sm text-[#4a4260] list-disc pl-5 space-y-1 whitespace-pre-wrap">
                                    {hotelCancellation.map((item, idx) => (
                                      <li key={`non-tbo-cancel-${hotel?.routeId ?? index}-${idx}`}>{item}</li>
                                    ))}
                                  </ul>
                                ) : (
                                  <p className="text-sm text-[#4a4260]">No cancellation policy available</p>
                                )}
                              </div>
                            </details>

                            <details className="rounded-lg border border-[#eadcfb] bg-[#fcf9ff] px-3 py-2">
                              <summary className="cursor-pointer text-sm font-medium text-[#4a4260]">Rate Conditions ({hotelRateConditions.length})</summary>
                              <div className="mt-2">
                                {hotelRateConditions.length > 0 ? (
                                  <ul className="text-sm text-[#4a4260] list-disc pl-5 space-y-1 whitespace-pre-wrap">
                                    {hotelRateConditions.map((item, idx) => (
                                      <li key={`non-tbo-rate-${hotel?.routeId ?? index}-${idx}`}>{item}</li>
                                    ))}
                                  </ul>
                                ) : (
                                  <p className="text-sm text-[#4a4260]">No rate conditions available</p>
                                )}
                              </div>
                            </details>

                            <details className="rounded-lg border border-[#eadcfb] bg-[#fcf9ff] px-3 py-2">
                              <summary className="cursor-pointer text-sm font-medium text-[#4a4260]">Amenities ({hotelAmenities.length})</summary>
                              <div className="mt-2">
                                {hotelAmenities.length > 0 ? (
                                  <ul className="text-sm text-[#4a4260] list-disc pl-5 space-y-1 whitespace-pre-wrap">
                                    {hotelAmenities.map((item, idx) => (
                                      <li key={`non-tbo-amenity-${hotel?.routeId ?? index}-${idx}`}>{item}</li>
                                    ))}
                                  </ul>
                                ) : (
                                  <p className="text-sm text-[#4a4260]">No amenities available</p>
                                )}
                              </div>
                            </details>

                            <details className="rounded-lg border border-[#eadcfb] bg-[#fcf9ff] px-3 py-2">
                              <summary className="cursor-pointer text-sm font-medium text-[#4a4260]">Package Inclusions ({hotelInclusions.length})</summary>
                              <div className="mt-2">
                                {hotelInclusions.length > 0 ? (
                                  <ul className="text-sm text-[#4a4260] list-disc pl-5 space-y-1 whitespace-pre-wrap">
                                    {hotelInclusions.map((item, idx) => (
                                      <li key={`non-tbo-inc-${hotel?.routeId ?? index}-${idx}`}>{item}</li>
                                    ))}
                                  </ul>
                                ) : (
                                  <p className="text-sm text-[#4a4260]">No inclusions available</p>
                                )}
                              </div>
                            </details>

                            <p className="text-xs text-[#9c7fb8] bg-[#f5eeff] border border-[#e5d9f2] rounded px-2 py-1">
                              This hotel is managed outside TBO. Details shown here come from the selected provider record.
                            </p>
                          </div>
                        </details>
                      );
                    })}
                  </div>
                )}

                {hasPrebookPriceChanged && (
                  <p className="text-sm font-medium text-amber-700 bg-amber-50 border border-amber-200 rounded p-2">
                    Prebook returned a changed price compared to selected hotel rates. You must accept the updated amount before final booking.
                  </p>
                )}

                <label className="flex items-start gap-2 text-sm text-[#4a4260]">
                  <input
                    type="checkbox"
                    className="mt-1"
                    checked={hasAcceptedUpdatedPrice}
                    onChange={(e) => setHasAcceptedUpdatedPrice(e.target.checked)}
                  />
                  <span>I have reviewed the inclusions, amenities, rate conditions, cancellation policy, room promotion, and additional charge details before final booking confirmation.</span>
                </label>
              </div>
            )}

            {/* Primary Guest Details */}
            <div className="space-y-3">
              <h3 className="font-semibold text-[#4a4260]">Primary Guest Details - Adult 1</h3>

              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <div className="sm:col-span-1">
                  <label className="text-sm font-medium text-[#4a4260] mb-1 block">
                    Salutation
                  </label>
                  <select
                    className="w-full px-3 py-2 border border-[#e5d9f2] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#d546ab]"
                    value={guestDetails.salutation}
                    onChange={(e) => setGuestDetails({ ...guestDetails, salutation: e.target.value })}
                  >
                    <option value="Mr">Mr</option>
                    <option value="Ms">Ms</option>
                    <option value="Mrs">Mrs</option>
                    <option value="Miss">Miss</option>
                    <option value="Mx">Mx</option>
                    <option value="Dr">Dr</option>
                  </select>
                </div>

                <div className="sm:col-span-2">
                  <label className="text-sm font-medium text-[#4a4260] mb-1 block">
                    Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    className="w-full px-3 py-2 border border-[#e5d9f2] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#d546ab]"
                    placeholder="Enter the Name"
                    value={guestDetails.name}
                    onChange={(e) => {
                      setGuestDetails({ ...guestDetails, name: e.target.value });
                      setFormErrors((prev) => {
                        const next = { ...prev };
                        delete next['primary-name'];
                        return next;
                      });
                    }}
                  />
                  {formErrors['primary-name'] && <p className="text-[11px] text-red-600 mt-1">{formErrors['primary-name']}</p>}
                </div>

                <div className="sm:col-span-1">
                  <label className="text-sm font-medium text-[#4a4260] mb-1 block">
                    Age
                  </label>
                  <input
                    type="text"
                    className="w-full px-3 py-2 border border-[#e5d9f2] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#d546ab]"
                    placeholder="Enter the Age"
                    value={guestDetails.age}
                    onChange={(e) => setGuestDetails({ ...guestDetails, age: e.target.value })}
                  />
                  {formErrors['primary-age'] && <p className="text-[11px] text-red-600 mt-1">{formErrors['primary-age']}</p>}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium text-[#4a4260] mb-1 block">
                    Primary Contact No. <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    className="w-full px-3 py-2 border border-[#e5d9f2] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#d546ab]"
                    placeholder="Enter the Contact No"
                    value={guestDetails.contactNo}
                    onChange={(e) => {
                      setGuestDetails({ ...guestDetails, contactNo: e.target.value });
                      setFormErrors((prev) => {
                        const next = { ...prev };
                        delete next['primary-contactNo'];
                        return next;
                      });
                    }}
                  />
                  {formErrors['primary-contactNo'] && <p className="text-[11px] text-red-600 mt-1">{formErrors['primary-contactNo']}</p>}
                </div>

                <div>
                  <label className="text-sm font-medium text-[#4a4260] mb-1 block">
                    Alternative Contact No.
                  </label>
                  <input
                    type="text"
                    className="w-full px-3 py-2 border border-[#e5d9f2] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#d546ab]"
                    placeholder="Enter the Alternative Contact No"
                    value={guestDetails.alternativeContactNo}
                    onChange={(e) => setGuestDetails({ ...guestDetails, alternativeContactNo: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-sm font-medium text-[#4a4260] mb-1 block">
                    Nationality <span className="text-red-500">*</span>
                    <span className="ml-1 text-[10px] text-[#8b43d1] font-normal">(locked from search)</span>
                  </label>
                  <input
                    type="text"
                    className="w-full px-3 py-2 border border-[#e5d9f2] rounded-lg bg-[#f9f7fc] text-[#4a4260] cursor-not-allowed"
                    placeholder="IN"
                    value={guestDetails.nationality}
                    readOnly
                    title="Nationality is locked from itinerary search and cannot be changed at booking time"
                  />
                  {formErrors['primary-nationality'] && <p className="text-[11px] text-red-600 mt-1">{formErrors['primary-nationality']}</p>}
                </div>
                <div>
                  <label className="text-sm font-medium text-[#4a4260] mb-1 block">
                    PAN (Optional)
                  </label>
                  <input
                    type="text"
                    className="w-full px-3 py-2 border border-[#e5d9f2] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#d546ab]"
                    placeholder="ABCDE1234F"
                    value={guestDetails.panNo}
                    onChange={(e) => setGuestDetails({ ...guestDetails, panNo: e.target.value.toUpperCase() })}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-[#4a4260] mb-1 block">
                    Passport No (Optional)
                  </label>
                  <input
                    type="text"
                    className="w-full px-3 py-2 border border-[#e5d9f2] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#d546ab]"
                    placeholder="Passport number"
                    value={guestDetails.passportNo}
                    onChange={(e) => setGuestDetails({ ...guestDetails, passportNo: e.target.value.toUpperCase() })}
                  />
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-[#4a4260] mb-1 block">
                  Email ID
                </label>
                <input
                  type="email"
                  className="w-full px-3 py-2 border border-[#e5d9f2] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#d546ab]"
                  placeholder="Enter the Email ID"
                  value={guestDetails.emailId}
                  onChange={(e) => setGuestDetails({ ...guestDetails, emailId: e.target.value })}
                />
              </div>

              {/* Additional Adults */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-semibold text-[#4a4260]">Additional Adults</h4>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setAdditionalAdults([...additionalAdults, defaultPassenger('Mr')])}
                    className="h-8 px-2 text-xs border-[#e5d9f2] text-[#8b43d1] hover:bg-[#f8f4ff]"
                  >
                    <Plus className="w-3 h-3 mr-1" /> Add Adult
                  </Button>
                </div>
                {formErrors['count-adult'] && <p className="text-[11px] text-red-600">{formErrors['count-adult']}</p>}
                {additionalAdults.map((adult, index) => (
                  <div key={index} className="space-y-2 rounded-lg border border-[#f0e6fb] p-3">
                    <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-end">
                      <div className="sm:col-span-2">
                        <label className="text-[10px] font-medium text-[#4a4260] mb-1 block">Title</label>
                        <select
                          className="w-full px-2 py-1.5 text-sm border border-[#e5d9f2] rounded-lg"
                          value={adult.title}
                          onChange={(e) => {
                            const next = [...additionalAdults];
                            next[index].title = e.target.value;
                            setAdditionalAdults(next);
                          }}
                        >
                          {ALLOWED_TITLES.map((title) => (
                            <option key={title} value={title}>{title}</option>
                          ))}
                        </select>
                      </div>
                      <div className="sm:col-span-5">
                        <label className="text-[10px] font-medium text-[#4a4260] mb-1 block">Adult {index + 2} Name</label>
                        <input
                          type="text"
                          className="w-full px-2 py-1.5 text-sm border border-[#e5d9f2] rounded-lg"
                          placeholder="Name"
                          value={adult.name}
                          onChange={(e) => {
                            const next = [...additionalAdults];
                            next[index].name = e.target.value;
                            setAdditionalAdults(next);
                          }}
                        />
                      </div>
                      <div className="sm:col-span-2">
                        <label className="text-[10px] font-medium text-[#4a4260] mb-1 block">Age</label>
                        <input
                          type="text"
                          className="w-full px-2 py-1.5 text-sm border border-[#e5d9f2] rounded-lg"
                          placeholder="Age"
                          value={adult.age}
                          onChange={(e) => {
                            const next = [...additionalAdults];
                            next[index].age = e.target.value;
                            setAdditionalAdults(next);
                          }}
                        />
                      </div>
                      <div className="sm:col-span-2">
                        <label className="text-[10px] font-medium text-[#4a4260] mb-1 block">Nationality</label>
                        <input
                          type="text"
                          className="w-full px-2 py-1.5 text-sm border border-[#e5d9f2] rounded-lg bg-[#f9f7fc] text-[#4a4260] cursor-not-allowed"
                          placeholder="IN"
                          value={adult.nationality}
                          readOnly
                          title="Nationality is locked from itinerary search"
                        />
                      </div>
                      <div className="sm:col-span-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => setAdditionalAdults(additionalAdults.filter((_, i) => i !== index))}
                          className="h-9 w-full text-red-500 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <input
                        type="text"
                        className="w-full px-2 py-1.5 text-sm border border-[#e5d9f2] rounded-lg"
                        placeholder="PAN (Optional)"
                        value={adult.panNo}
                        onChange={(e) => {
                          const next = [...additionalAdults];
                          next[index].panNo = e.target.value.toUpperCase();
                          setAdditionalAdults(next);
                        }}
                      />
                      <input
                        type="text"
                        className="w-full px-2 py-1.5 text-sm border border-[#e5d9f2] rounded-lg"
                        placeholder="Passport No (Optional)"
                        value={adult.passportNo}
                        onChange={(e) => {
                          const next = [...additionalAdults];
                          next[index].passportNo = e.target.value.toUpperCase();
                          setAdditionalAdults(next);
                        }}
                      />
                    </div>
                    {(getPassengerFieldError('adult', index, 'title') ||
                      getPassengerFieldError('adult', index, 'name') ||
                      getPassengerFieldError('adult', index, 'age') ||
                      getPassengerFieldError('adult', index, 'nationality')) && (
                      <p className="text-[11px] text-red-600">
                        {getPassengerFieldError('adult', index, 'title') ||
                          getPassengerFieldError('adult', index, 'name') ||
                          getPassengerFieldError('adult', index, 'age') ||
                          getPassengerFieldError('adult', index, 'nationality')}
                      </p>
                    )}
                  </div>
                ))}
              </div>

              {/* Additional Children */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-semibold text-[#4a4260]">Children (5-12 years)</h4>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setAdditionalChildren([...additionalChildren, defaultPassenger('Ms')])}
                    className="h-8 px-2 text-xs border-[#e5d9f2] text-[#8b43d1] hover:bg-[#f8f4ff]"
                  >
                    <Plus className="w-3 h-3 mr-1" /> Add Child
                  </Button>
                </div>
                {formErrors['count-child'] && <p className="text-[11px] text-red-600">{formErrors['count-child']}</p>}
                {additionalChildren.map((child, index) => (
                  <div key={index} className="space-y-2 rounded-lg border border-[#f0e6fb] p-3">
                    <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-end">
                      <div className="sm:col-span-2">
                        <label className="text-[10px] font-medium text-[#4a4260] mb-1 block">Title</label>
                        <select
                          className="w-full px-2 py-1.5 text-sm border border-[#e5d9f2] rounded-lg"
                          value={child.title}
                          onChange={(e) => {
                            const next = [...additionalChildren];
                            next[index].title = e.target.value;
                            setAdditionalChildren(next);
                          }}
                        >
                          {ALLOWED_TITLES.map((title) => (
                            <option key={title} value={title}>{title}</option>
                          ))}
                        </select>
                      </div>
                      <div className="sm:col-span-5">
                        <label className="text-[10px] font-medium text-[#4a4260] mb-1 block">Child {index + 1} Name</label>
                        <input type="text" className="w-full px-2 py-1.5 text-sm border border-[#e5d9f2] rounded-lg" placeholder="Name" value={child.name} onChange={(e) => { const next = [...additionalChildren]; next[index].name = e.target.value; setAdditionalChildren(next); }} />
                      </div>
                      <div className="sm:col-span-2">
                        <label className="text-[10px] font-medium text-[#4a4260] mb-1 block">Age</label>
                        <input
                          type="text"
                          className="w-full px-2 py-1.5 text-sm border border-[#e5d9f2] rounded-lg bg-[#f9f7fc] text-[#6c6c6c]"
                          placeholder="Age"
                          value={child.age}
                          readOnly
                          title="Child age is locked from itinerary/search and cannot be changed at booking time"
                        />
                      </div>
                      <div className="sm:col-span-2">
                        <label className="text-[10px] font-medium text-[#4a4260] mb-1 block">Nationality</label>
                        <input type="text" className="w-full px-2 py-1.5 text-sm border border-[#e5d9f2] rounded-lg bg-[#f9f7fc] text-[#4a4260] cursor-not-allowed" placeholder="IN" value={child.nationality} readOnly title="Nationality is locked from itinerary search" />
                      </div>
                      <div className="sm:col-span-1">
                        <Button type="button" variant="ghost" size="sm" onClick={() => setAdditionalChildren(additionalChildren.filter((_, i) => i !== index))} className="h-9 w-full text-red-500 hover:text-red-700 hover:bg-red-50">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <input type="text" className="w-full px-2 py-1.5 text-sm border border-[#e5d9f2] rounded-lg" placeholder="PAN (Optional)" value={child.panNo} onChange={(e) => { const next = [...additionalChildren]; next[index].panNo = e.target.value.toUpperCase(); setAdditionalChildren(next); }} />
                      <input type="text" className="w-full px-2 py-1.5 text-sm border border-[#e5d9f2] rounded-lg" placeholder="Passport No (Optional)" value={child.passportNo} onChange={(e) => { const next = [...additionalChildren]; next[index].passportNo = e.target.value.toUpperCase(); setAdditionalChildren(next); }} />
                    </div>
                    {(getPassengerFieldError('child', index, 'title') ||
                      getPassengerFieldError('child', index, 'name') ||
                      getPassengerFieldError('child', index, 'age') ||
                      getPassengerFieldError('child', index, 'nationality')) && (
                      <p className="text-[11px] text-red-600">
                        {getPassengerFieldError('child', index, 'title') ||
                          getPassengerFieldError('child', index, 'name') ||
                          getPassengerFieldError('child', index, 'age') ||
                          getPassengerFieldError('child', index, 'nationality')}
                      </p>
                    )}
                  </div>
                ))}
              </div>

              {/* Additional Infants */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-semibold text-[#4a4260]">Infants (Below 5 years)</h4>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setAdditionalInfants([...additionalInfants, defaultPassenger('Ms')])}
                    className="h-8 px-2 text-xs border-[#e5d9f2] text-[#8b43d1] hover:bg-[#f8f4ff]"
                  >
                    <Plus className="w-3 h-3 mr-1" /> Add Infant
                  </Button>
                </div>
                {formErrors['count-infant'] && <p className="text-[11px] text-red-600">{formErrors['count-infant']}</p>}
                {additionalInfants.map((infant, index) => (
                  <div key={index} className="space-y-2 rounded-lg border border-[#f0e6fb] p-3">
                    <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-end">
                      <div className="sm:col-span-2">
                        <label className="text-[10px] font-medium text-[#4a4260] mb-1 block">Title</label>
                        <select
                          className="w-full px-2 py-1.5 text-sm border border-[#e5d9f2] rounded-lg"
                          value={infant.title}
                          onChange={(e) => {
                            const next = [...additionalInfants];
                            next[index].title = e.target.value;
                            setAdditionalInfants(next);
                          }}
                        >
                          {ALLOWED_TITLES.map((title) => (
                            <option key={title} value={title}>{title}</option>
                          ))}
                        </select>
                      </div>
                      <div className="sm:col-span-5">
                        <label className="text-[10px] font-medium text-[#4a4260] mb-1 block">Infant {index + 1} Name</label>
                        <input type="text" className="w-full px-2 py-1.5 text-sm border border-[#e5d9f2] rounded-lg" placeholder="Name" value={infant.name} onChange={(e) => { const next = [...additionalInfants]; next[index].name = e.target.value; setAdditionalInfants(next); }} />
                      </div>
                      <div className="sm:col-span-2">
                        <label className="text-[10px] font-medium text-[#4a4260] mb-1 block">Age</label>
                        <input type="text" className="w-full px-2 py-1.5 text-sm border border-[#e5d9f2] rounded-lg bg-[#f9f7fc] text-[#6c6c6c]" placeholder="Age" value={infant.age} readOnly title="Infant age is locked from itinerary/search and cannot be changed at booking time" />
                      </div>
                      <div className="sm:col-span-2">
                        <label className="text-[10px] font-medium text-[#4a4260] mb-1 block">Nationality</label>
                        <input type="text" className="w-full px-2 py-1.5 text-sm border border-[#e5d9f2] rounded-lg bg-[#f9f7fc] text-[#4a4260] cursor-not-allowed" placeholder="IN" value={infant.nationality} readOnly title="Nationality is locked from itinerary search" />
                      </div>
                      <div className="sm:col-span-1">
                        <Button type="button" variant="ghost" size="sm" onClick={() => setAdditionalInfants(additionalInfants.filter((_, i) => i !== index))} className="h-9 w-full text-red-500 hover:text-red-700 hover:bg-red-50">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <input type="text" className="w-full px-2 py-1.5 text-sm border border-[#e5d9f2] rounded-lg" placeholder="PAN (Optional)" value={infant.panNo} onChange={(e) => { const next = [...additionalInfants]; next[index].panNo = e.target.value.toUpperCase(); setAdditionalInfants(next); }} />
                      <input type="text" className="w-full px-2 py-1.5 text-sm border border-[#e5d9f2] rounded-lg" placeholder="Passport No (Optional)" value={infant.passportNo} onChange={(e) => { const next = [...additionalInfants]; next[index].passportNo = e.target.value.toUpperCase(); setAdditionalInfants(next); }} />
                    </div>
                    {(getPassengerFieldError('infant', index, 'title') ||
                      getPassengerFieldError('infant', index, 'name') ||
                      getPassengerFieldError('infant', index, 'age') ||
                      getPassengerFieldError('infant', index, 'nationality')) && (
                      <p className="text-[11px] text-red-600">
                        {getPassengerFieldError('infant', index, 'title') ||
                          getPassengerFieldError('infant', index, 'name') ||
                          getPassengerFieldError('infant', index, 'age') ||
                          getPassengerFieldError('infant', index, 'nationality')}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Arrival Details */}
            <div className="space-y-3">
              <h3 className="font-semibold text-[#4a4260]">Arrival Details</h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium text-[#4a4260] mb-1 block">
                    Date & Time
                  </label>
                  <input
                    type="text"
                    className="w-full px-3 py-2 border border-[#e5d9f2] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#d546ab]"
                    placeholder="12-12-2025 9:00 AM"
                    value={guestDetails.arrivalDateTime}
                    onChange={(e) => {
                      void handleArrivalDateTimeChange(e.target.value);
                    }}
                  />
                </div>

                <div>
                  <label className="text-sm font-medium text-[#4a4260] mb-1 block">
                    Arrival Place
                  </label>
                  <input
                    type="text"
                    className="w-full px-3 py-2 border border-[#e5d9f2] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#d546ab]"
                    placeholder="Chennai International Airport"
                    value={guestDetails.arrivalPlace}
                    onChange={(e) => setGuestDetails({ ...guestDetails, arrivalPlace: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-[#4a4260] mb-1 block">
                  Flight Details
                </label>
                <textarea
                  className="w-full px-3 py-2 border border-[#e5d9f2] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#d546ab]"
                  rows={2}
                  placeholder="Enter the Flight Details"
                  value={guestDetails.arrivalFlightDetails}
                  onChange={(e) => setGuestDetails({ ...guestDetails, arrivalFlightDetails: e.target.value })}
                />
              </div>
            </div>

            {/* Departure Details */}
            <div className="space-y-3">
              <h3 className="font-semibold text-[#4a4260]">Departure Details</h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium text-[#4a4260] mb-1 block">
                    Date & Time
                  </label>
                  <input
                    type="text"
                    className="w-full px-3 py-2 border border-[#e5d9f2] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#d546ab]"
                    placeholder="19-12-2025 4:00 PM"
                    value={guestDetails.departureDateTime}
                    onChange={(e) => setGuestDetails({ ...guestDetails, departureDateTime: e.target.value })}
                  />
                </div>

                <div>
                  <label className="text-sm font-medium text-[#4a4260] mb-1 block">
                    Departure Place
                  </label>
                  <input
                    type="text"
                    className="w-full px-3 py-2 border border-[#e5d9f2] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#d546ab]"
                    placeholder="Trivandrum, Domestic Airport"
                    value={guestDetails.departurePlace}
                    onChange={(e) => setGuestDetails({ ...guestDetails, departurePlace: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-[#4a4260] mb-1 block">
                  Flight Details
                </label>
                <textarea
                  className="w-full px-3 py-2 border border-[#e5d9f2] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#d546ab]"
                  rows={2}
                  placeholder="Enter the Flight Details"
                  value={guestDetails.departureFlightDetails}
                  onChange={(e) => setGuestDetails({ ...guestDetails, departureFlightDetails: e.target.value })}
                />
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setConfirmQuotationModal(false);
                setGuestDetails({
                  salutation: 'Mr',
                  name: '',
                  contactNo: '',
                  age: '',
                  nationality: confirmDefaultNationality,
                  panNo: '',
                  passportNo: '',
                  alternativeContactNo: '',
                  emailId: '',
                  arrivalDateTime: '',
                  arrivalPlace: '',
                  arrivalFlightDetails: '',
                  departureDateTime: '',
                  departurePlace: '',
                  departureFlightDetails: '',
                });
                setAdditionalAdults([]);
                setAdditionalChildren([]);
                setAdditionalInfants([]);
                setPrebookData(null);
                setHasAcceptedUpdatedPrice(false);
                setFormErrors({});
              }}
            >
              Cancel
            </Button>
            <Button
              type="button"
              className="bg-[#8b43d1] hover:bg-[#7c37c1]"
              onClick={handleConfirmQuotation}
              disabled={isConfirmingQuotation || isPrebooking}
            >
              {isPrebooking ? 'Running Prebook...' : isConfirmingQuotation ? 'Submitting...' : 'Confirm Booking'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {itinerary?.planId && (
        <>
          <VoucherDetailsModal
            isOpen={voucherModal}
            onClose={() => setVoucherModal(false)}
            itineraryPlanId={itinerary.planId}
          />
          <PluckCardModal
            isOpen={pluckCardModal}
            onClose={() => setPluckCardModal(false)}
            itineraryPlanId={itinerary.planId}
          />
          <InvoiceModal
            isOpen={invoiceModal}
            onClose={() => setInvoiceModal(false)}
            itineraryPlanId={itinerary.planId}
            type={invoiceType}
          />
          <IncidentalExpensesModal
            isOpen={incidentalModal}
            onClose={() => setIncidentalModal(false)}
            itineraryPlanId={itinerary.planId}
          />
          <CancelItineraryModal
            open={cancelModalOpen}
            onOpenChange={setCancelModalOpen}
            itineraryPlanId={itinerary.planId ?? null}
            onSuccess={() => {
              toast.success('Itinerary data will be refreshed');
              window.location.reload();
            }}
          />
          {selectedHotelForVoucher && (
            <HotelVoucherModal
              open={hotelVoucherModalOpen}
              onOpenChange={setHotelVoucherModalOpen}
              itineraryPlanId={itinerary.planId}
              routeId={selectedHotelForVoucher.routeId}
              hotelId={selectedHotelForVoucher.hotelId}
              hotelName={selectedHotelForVoucher.hotelName}
              hotelEmail={selectedHotelForVoucher.hotelEmail}
              hotelStateCity={selectedHotelForVoucher.hotelStateCity}
              routeDates={selectedHotelForVoucher.routeDates}
              dayNumbers={selectedHotelForVoucher.dayNumbers}
              hotelDetailsIds={selectedHotelForVoucher.hotelDetailsIds}
              onSuccess={() => {
                toast.success('Hotel voucher created successfully');
                refreshHotelData();
              }}
            />
          )}
        </>
      )}
    </div>
  );
};

export default ItineraryDetails;
