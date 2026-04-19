// FILE: src/pages/itineraries/ItineraryDetails.tsx

import React, { useEffect, useMemo, useState, useRef, useCallback } from "react";
import { useParams, Link, useLocation } from "react-router-dom";
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
import { ArrowLeft, ArrowUp, Clock, MapPin, Car, Calendar, Plus, Trash2, ArrowRight, Ticket, Bell, Building2, Timer, FileText, CreditCard, Receipt, AlertTriangle, ChevronUp, ChevronDown, Loader2, RefreshCw, Edit } from "lucide-react";
import { ItineraryService } from "@/services/itinerary";
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

const TimePickerPopover: React.FC<{
  value: string;
  onSave: (newValue: string) => Promise<void>;
  label: string;
}> = ({ value, onSave, label }) => {
  const parts = value.split(' ');
  const [localTime, setLocalTime] = useState(parts[0] || "09:00");
  const [localAmPm, setLocalAmPm] = useState(parts[1] || "AM");
  const [isSaving, setIsSaving] = useState(false);

  const timeParts = localTime.split(':');
  const hours = Number(timeParts[0] || 9);
  const minutes = Number(timeParts[1] || 0);
  
  const handleHourChange = (delta: number) => {
    let newHour = hours + delta;
    
    // Toggle AM/PM when crossing 11 <-> 12 boundary
    if (hours === 11 && delta === 1) {
      toggleAmPm();
    } else if (hours === 12 && delta === -1) {
      toggleAmPm();
    }

    if (newHour > 12) newHour = 1;
    if (newHour < 1) newHour = 12;
    setLocalTime(`${String(newHour).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`);
  };
  
  const handleMinuteChange = (delta: number) => {
    let newMinute = minutes + delta;
    if (newMinute >= 60) newMinute = 0;
    if (newMinute < 0) newMinute = 55;
    setLocalTime(`${String(hours).padStart(2, '0')}:${String(newMinute).padStart(2, '0')}`);
  };
  
  const toggleAmPm = () => {
    setLocalAmPm(prev => prev === 'AM' ? 'PM' : 'AM');
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSave(`${localTime} ${localAmPm}`);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="flex flex-col items-center p-4 bg-white rounded-lg shadow-xl border border-[#e5d9f2] min-w-[220px]">
      <span className="text-[10px] font-bold text-[#6c6c6c] uppercase mb-3 tracking-wider">{label}</span>
      <div className="flex items-center gap-4">
        <div className="flex flex-col items-center gap-1">
          <Button variant="ghost" size="icon" className="h-8 w-8 text-[#d546ab]" onClick={() => handleHourChange(1)} disabled={isSaving}>
            <ChevronUp className="h-5 w-5" />
          </Button>
          <div className="bg-[#f8f5fc] border border-[#e5d9f2] rounded-md w-12 h-12 flex items-center justify-center text-xl font-bold text-[#4a4260]">
            {String(hours).padStart(2, '0')}
          </div>
          <Button variant="ghost" size="icon" className="h-8 w-8 text-[#d546ab]" onClick={() => handleHourChange(-1)} disabled={isSaving}>
            <ChevronDown className="h-5 w-5" />
          </Button>
        </div>
        
        <span className="text-2xl font-bold text-[#4a4260] mt-2">:</span>
        
        <div className="flex flex-col items-center gap-1">
          <Button variant="ghost" size="icon" className="h-8 w-8 text-[#d546ab]" onClick={() => handleMinuteChange(5)} disabled={isSaving}>
            <ChevronUp className="h-5 w-5" />
          </Button>
          <div className="bg-[#f8f5fc] border border-[#e5d9f2] rounded-md w-12 h-12 flex items-center justify-center text-xl font-bold text-[#4a4260]">
            {String(minutes).padStart(2, '0')}
          </div>
          <Button variant="ghost" size="icon" className="h-8 w-8 text-[#d546ab]" onClick={() => handleMinuteChange(-5)} disabled={isSaving}>
            <ChevronDown className="h-5 w-5" />
          </Button>
        </div>
        
        <div className="flex flex-col items-center justify-center h-full pt-8">
          <Button 
            variant="outline" 
            className={`h-12 w-12 font-bold border-2 ${localAmPm === 'AM' ? 'border-[#d546ab] text-[#d546ab] bg-[#fdf2f8]' : 'border-[#4a4260] text-[#4a4260]'}`}
            onClick={toggleAmPm}
            disabled={isSaving}
          >
            {localAmPm}
          </Button>
        </div>
      </div>

      <Button 
        className="w-full mt-4 bg-[#d546ab] hover:bg-[#c4359a] text-white shadow-md"
        onClick={handleSave}
        disabled={isSaving}
      >
        {isSaving ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Updating...
          </>
        ) : (
          "Update Time"
        )}
      </Button>
    </div>
  );
};

// ----------------- Main Component -----------------

interface ItineraryDetailsProps {
  readOnly?: boolean; // If true, component is read-only (confirmed itinerary view)
}

export const ItineraryDetails: React.FC<ItineraryDetailsProps> = ({ readOnly = false }) => {
  const { id: quoteId } = useParams();
  const location = useLocation();
  console.log('🔵 ItineraryDetails component MOUNTED with quoteId:', quoteId, 'readOnly:', readOnly);
  //Extra
  console.log('🔵 Current location pathname:', location.pathname);
  
  const [itinerary, setItinerary] = useState<ItineraryDetailsResponse | null>(
    null
  );
  const [hotelDetails, setHotelDetails] =
    useState<ItineraryHotelDetailsResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  
  // Delete hotspot modal state
  const [deleteHotspotModal, setDeleteHotspotModal] = useState<{
    open: boolean;
    planId: number | null;
    routeId: number | null;
    hotspotId: number | null;
    hotspotName: string;
  }>({
    open: false,
    planId: null,
    routeId: null,
    hotspotId: null,
    hotspotName: "",
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
    timings?: string;
    visitAgain?: boolean;
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
  const [previewTimelinesByHotspot, setPreviewTimelinesByHotspot] = useState<Record<number, any[]>>({});
  const [isPreviewingHotspotId, setIsPreviewingHotspotId] = useState<number | null>(null);
  const [selectedHotspotIds, setSelectedHotspotIds] = useState<number[]>([]);
  const [selectedHotspotAnchor, setSelectedHotspotAnchor] = useState<HotspotAnchor | null>(null);

  // Refs for scrolling
  const hotspotListRef = useRef<HTMLDivElement>(null);
  const timelinePreviewRef = useRef<HTMLDivElement>(null);

  const selectedHotspotId = selectedHotspotIds.length > 0
    ? selectedHotspotIds[selectedHotspotIds.length - 1]
    : null;

  const mapDaySegmentToPreview = useCallback((seg: ItinerarySegment): any | null => {
    if (!seg) return null;

    if (seg.type === "hotspot") return null;

    if (seg.type === "attraction") {
      return {
        type: "attraction",
        text: seg.name,
        timeRange: seg.visitTime || null,
        locationId: Number(seg.hotspotId ?? seg.locationId ?? 0) || null,
        isConflict: seg.isConflict === true,
        conflictReason: seg.conflictReason ?? null,
      };
    }

    if (seg.type === "travel") {
      return {
        type: "travel",
        text: `Travel to ${seg.to}`,
        timeRange: seg.timeRange || null,
        locationId: null,
        isConflict: seg.isConflict === true,
        conflictReason: seg.conflictReason ?? null,
        from: seg.from,
        to: seg.to,
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
  }, []);

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
      const fromTimeline = timeline.find((seg: any) => (
        seg?.type === "attraction" && Number(seg?.locationId) === Number(hotspotId)
      ));

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

  const effectivePreviewTimeline = useMemo(() => {
    const base = [...defaultPreviewTimeline];
    if (selectedPreviewSegments.length === 0) return base;

    if (!selectedHotspotAnchor) {
      return [...base, ...selectedPreviewSegments];
    }

    const insertAfterIdx = base.findIndex((seg: any) => {
      if (seg?.type !== "travel") return false;
      const fromMatches = selectedHotspotAnchor.anchorFrom
        ? String(seg?.from || "").trim().toLowerCase() === String(selectedHotspotAnchor.anchorFrom).trim().toLowerCase()
        : true;
      const toMatches = selectedHotspotAnchor.anchorTo
        ? String(seg?.to || "").trim().toLowerCase() === String(selectedHotspotAnchor.anchorTo).trim().toLowerCase()
        : true;
      const timeMatches = selectedHotspotAnchor.anchorTimeRange
        ? String(seg?.timeRange || "").trim() === String(selectedHotspotAnchor.anchorTimeRange).trim()
        : true;
      return fromMatches && toMatches && timeMatches;
    });

    const at = insertAfterIdx >= 0 ? insertAfterIdx + 1 : base.length;
    base.splice(at, 0, ...selectedPreviewSegments);
    return base;
  }, [defaultPreviewTimeline, selectedHotspotAnchor, selectedPreviewSegments]);

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

  // Filter hotspots based on search query and sort: non-visitAgain first, visitAgain at bottom
  const filteredHotspots = availableHotspots
    .filter(
      (h) =>
        h.name.toLowerCase().includes(hotspotSearchQuery.toLowerCase()) ||
        h.description.toLowerCase().includes(hotspotSearchQuery.toLowerCase())
    )
    .sort((a, b) => {
      // Sort by visitAgain: false first, true at bottom
      if (a.visitAgain === b.visitAgain) return 0;
      return a.visitAgain ? 1 : -1;
    });

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
  const [selectedHotelBookings, setSelectedHotelBookings] = useState<{ [routeId: number]: {
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
}}>({});

const [selectedHotels, setSelectedHotels] = useState<{ [key: string]: boolean }>({});
const [activeHotelGroupType, setActiveHotelGroupType] = useState<number | null>(null);
const [activeHotelListTotal, setActiveHotelListTotal] = useState<number>(0);
const [selectedVehicleTotalsByType, setSelectedVehicleTotalsByType] = useState<
  Record<number, { totalAmount: number; totalQty: number }>
>({});
const [isRoomCostPopoverOpen, setIsRoomCostPopoverOpen] = useState(false);
const summaryStickyRef = useRef<HTMLDivElement | null>(null);
const hotelListRef = useRef<HTMLDivElement | null>(null);
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

const scrollToHotelList = () => {
  const el = hotelListRef.current;
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

const selectedHotelTotal = useMemo(
  () => Object.values(selectedHotelBookings).reduce((sum, item) => sum + Number(item.netAmount || 0), 0),
  [selectedHotelBookings]
);

const selectedHotelMetaByRoute = useMemo(() => {
  const map = new Map<number, { hotelName: string; hotelDistance: string | null; totalAmount: number }>();
  if (!hotelDetails?.hotels?.length) return map;

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
        const hotelCodeMatch = selected.hotelCode && h.hotelCode && selected.hotelCode === h.hotelCode;
        const hotelNameMatch = selected.hotelName && h.hotelName && selected.hotelName.trim().toLowerCase() === h.hotelName.trim().toLowerCase();
        return Boolean(bookingCodeMatch || hotelCodeMatch || hotelNameMatch);
      });

      map.set(routeId, {
        hotelName: selected.hotelName || matched?.hotelName || "Hotel",
        hotelDistance: matched?.hotelDistance || null,
        totalAmount:
          Number(selected.netAmount || 0) ||
          Number(matched?.totalHotelCost || 0) + Number(matched?.totalHotelTaxAmount || 0),
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
    });
  });

  return map;
}, [hotelDetails, selectedHotelBookings, activeHotelGroupType]);

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

const roomBreakdownStayCount = useMemo(() => {
  const fallbackDayCount = Number(itinerary?.dayCount || itinerary?.days?.length || 1);
  if (!hotelDetails?.hotels?.length) {
    return fallbackDayCount;
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

  const stayKeys = new Set<string>();
  hotelDetails.hotels
    .filter((h) => Number(h.groupType) === Number(preferredGroupType) && h.hotelName !== 'No Hotels Available')
    .forEach((h) => {
      const routeId = Number(h.itineraryRouteId || 0);
      if (!routeId) return;
      const stayDate = getStayDate(h);
      stayKeys.add(`${routeId}::${stayDate}`);
    });

  return stayKeys.size || fallbackDayCount;
}, [hotelDetails, activeHotelGroupType, itinerary?.dayCount, itinerary?.days?.length]);

const computedVehicleAmount = useMemo(() => {
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
}, [selectedVehicleTotalsByType, itinerary?.costBreakdown?.totalVehicleAmount, itinerary?.costBreakdown?.totalVehicleCost]);

const computedVehicleQty = useMemo(() => {
  const selectedQty = Object.values(selectedVehicleTotalsByType).reduce(
    (sum, row) => sum + Number(row.totalQty || 0),
    0,
  );

  if (selectedQty > 0) return selectedQty;
  return Number(itinerary?.costBreakdown?.totalVehicleQty || 0);
}, [selectedVehicleTotalsByType, itinerary?.costBreakdown?.totalVehicleQty]);

const financialTotals = useMemo(() => {
  const hotelAmount = Number(
    itinerary?.costBreakdown?.totalRoomCost ||
    itinerary?.costBreakdown?.totalHotelAmount ||
    computedHotelCost ||
    0,
  );

  const vehicleAmount = Number(computedVehicleAmount || 0);

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
}, [itinerary, computedHotelCost, computedVehicleAmount]);

const hotelHydratedDays = useMemo(() => {
  if (!itinerary?.days?.length) return [];

  return itinerary.days.map((day, dayIndex) => {
    const currentHotelName = selectedHotelMetaByRoute.get(day.id)?.hotelName?.trim() || null;
    const currentHotelDistance = selectedHotelMetaByRoute.get(day.id)?.hotelDistance?.trim() || null;
    const previousDay = dayIndex > 0 ? itinerary.days[dayIndex - 1] : null;
    const previousHotelName = previousDay
      ? selectedHotelMetaByRoute.get(previousDay.id)?.hotelName?.trim() || null
      : null;

    let firstTravelSeen = false;
    let derivedHotelArrivalMinutes: number | null = null;

    const segments = day.segments.map((segment) => {
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
const displayDays = (hotelHydratedDays.length ? hotelHydratedDays : itinerary?.days || []).map(day => ({
  ...day,
  segments: [...(day.segments || [])].sort((a, b) => {
    if (a.type === 'start' && b.type !== 'start') return -1;
    if (b.type === 'start' && a.type !== 'start') return 1;
    return 0;
  }),
}));

const overallTripCostWithHotels = useMemo(() => {
  const baseOverall = Number(itinerary?.overallCost || 0);
  return (baseOverall + Number(computedHotelCost || 0)).toFixed(2);
}, [itinerary?.overallCost, computedHotelCost]);

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
    if (window.ClipboardItem && navigator.clipboard?.write) {
      const item = new ClipboardItem({
        "text/html": new Blob([html], { type: "text/html" }),
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
    <table width="700" cellpadding="0" cellspacing="0" style="border-collapse:collapse;background:#fff;font-family:Calibri;font-size:11px;color:#302c6e;">
      <tr>
        <td colspan="4" align="center" style="font-size:22px;line-height:40px;font-weight:600;">
          Tour Itinerary Plan
        </td>
      </tr>
    </table>

    <table width="700" cellpadding="0" cellspacing="0" style="border-collapse:collapse;background:#fff;font-family:Calibri;font-size:11px;line-height:1.2;color:#302c6e;">
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

  const hotelSectionsHtml = selectedGroups
    .map((group) => {
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
                    ${
                      clipboardRatesVisible
                        ? `
                      <td style="text-align:left;border:1px solid #b1b1b1;padding:3px;">
                        <b>${escapeHtml(formatCurrency(totalPrice))}</b>
                      </td>
                    `
                        : ""
                    }
                    <td style="text-align:left;border:1px solid #b1b1b1;padding:3px;">
                      ${escapeHtml(hotel.mealPlan)}
                    </td>
                  </tr>
                `;
              })
              .join("")
          : `
            <tr>
              <td colspan="${clipboardRatesVisible ? 6 : 5}" style="border:1px solid #b1b1b1;text-align:center;padding:3px;">
                No hotel available
              </td>
            </tr>
          `;

      return `
        <table width="700" cellpadding="0" cellspacing="0" style="border-collapse:collapse;background:#fff;font-family:Calibri;font-size:11px;color:#302c6e;margin-top:16px;">
          <tr>
            <td align="center" style="font-size:18px;line-height:40px;font-weight:600;">
              ${escapeHtml(sectionTitle)} - ${escapeHtml(group.label)}
            </td>
          </tr>
        </table>

        <table width="700" cellpadding="0" cellspacing="0" style="border-collapse:collapse;background:#fff;font-family:Calibri;font-size:11px;color:#302c6e;">
          <tr>
            <th style="background:#f2f2f2;text-align:left;padding:3px;border:1px solid #b1b1b1;">Day</th>
            <th style="background:#f2f2f2;text-align:left;padding:3px;border:1px solid #b1b1b1;">Destination</th>
            <th style="background:#f2f2f2;text-align:left;padding:3px;border:1px solid #b1b1b1;">Hotel Name - Category</th>
            <th style="background:#f2f2f2;text-align:left;padding:3px;border:1px solid #b1b1b1;">Room Type - Count</th>
            ${
              clipboardRatesVisible
                ? `<th style="background:#f2f2f2;text-align:left;padding:3px;border:1px solid #b1b1b1;">Price</th>`
                : ""
            }
            <th style="background:#f2f2f2;text-align:left;padding:3px;border:1px solid #b1b1b1;">Meal Plan</th>
          </tr>
          ${rowsHtml}
        </table>
      `;
    })
    .join("");

  const vehicleRowsHtml =
    itinerary.vehicles?.length > 0
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

  const vehicleSectionHtml = `
    <table width="700" cellpadding="0" cellspacing="0" style="border-collapse:collapse;background:#fff;font-family:Calibri;font-size:11px;color:#302c6e;margin-top:16px;">
      <tr>
        <td align="center" style="font-size:18px;line-height:40px;font-weight:600;">
          Vehicle Details
        </td>
      </tr>
    </table>

    <table width="700" cellpadding="0" cellspacing="0" style="border-collapse:collapse;background:#fff;font-family:Calibri;font-size:11px;color:#302c6e;">
      <tr>
        <th style="background:#f2f2f2;text-align:left;padding:3px;border:1px solid #b1b1b1;">Vehicle Details</th>
        <th style="background:#f2f2f2;text-align:left;padding:3px;border:1px solid #b1b1b1;">Total Amount</th>
      </tr>
      ${vehicleRowsHtml}
    </table>
  `;

  const costSectionHtml = `
    <table width="700" cellpadding="0" cellspacing="0" style="border-collapse:collapse;background:#fff;font-family:Calibri;font-size:11px;color:#302c6e;margin-top:16px;">
      <tr>
        <td colspan="2" align="center" style="font-size:18px;line-height:40px;font-weight:600;">
          Overall Cost
        </td>
      </tr>
      <tr>
        <th style="text-align:left;padding:3px;border:1px solid #b1b1b1;">Total Vehicle Amount</th>
        <td style="text-align:left;padding:3px;border:1px solid #b1b1b1;">${escapeHtml(formatCurrency(itinerary.costBreakdown.totalVehicleAmount || 0))}</td>
      </tr>
      <tr>
        <th style="text-align:left;padding:3px;border:1px solid #b1b1b1;">Total Amount</th>
        <td style="text-align:left;padding:3px;border:1px solid #b1b1b1;"><strong>${escapeHtml(formatCurrency(itinerary.costBreakdown.totalAmount || 0))}</strong></td>
      </tr>
      <tr>
        <th style="text-align:left;padding:3px;border:1px solid #b1b1b1;">Coupon Discount</th>
        <td style="text-align:left;padding:3px;border:1px solid #b1b1b1;">- ${escapeHtml(formatCurrency(itinerary.costBreakdown.couponDiscount || 0))}</td>
      </tr>
      <tr>
        <th style="text-align:left;padding:3px;border:1px solid #b1b1b1;">Total Round Off</th>
        <td style="text-align:left;padding:3px;border:1px solid #b1b1b1;">${escapeHtml(formatCurrency(itinerary.costBreakdown.totalRoundOff || 0))}</td>
      </tr>
      <tr>
        <th style="text-align:left;padding:3px;border:1px solid #b1b1b1;">Net Payable To ${escapeHtml(itinerary.costBreakdown.companyName || "DVI Holidays")}</th>
        <td style="text-align:left;padding:3px;border:1px solid #b1b1b1;"><strong>${escapeHtml(formatCurrency(itinerary.costBreakdown.netPayable || 0))}</strong></td>
      </tr>
    </table>
  `;

  const fullHtml = `
    <div style="margin:0;padding:0;background-color:#f9f9f9;font-family:Calibri;font-size:11px;color:#302c6e;">
      <div style="font-family:Calibri;font-size:11px;color:#302c6e;width:700px;">
        ${summaryHtml}
        ${hotelSectionsHtml}
        ${vehicleSectionHtml}
        ${costSectionHtml}
      </div>
    </div>
  `;

  const plainText = selectedGroups
    .map((group) => {
      const hotelLines = group.hotels
        .map(
          (hotel, index) =>
            `Day-${index + 1} | ${hotel.day} | ${hotel.destination} | ${hotel.hotelName} - ${hotel.category} | ${hotel.roomType} - ${itinerary.roomCount} | ${hotel.mealPlan}`
        )
        .join("\n");

      return `${sectionTitle} - ${group.label}\n${hotelLines}`;
    })
    .join("\n\n");

  return { html: fullHtml, plainText };
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

  const backendHotelHeadingMatch = backendHtml.match(/Recommended Hotel(?:s)?\s*-/i);
  if (!backendHotelHeadingMatch || backendHotelHeadingMatch.index === undefined) {
    return backendHtml;
  }

  const backendHotelHeadingIndex = backendHotelHeadingMatch.index;
  const backendHotelStart = backendHtml.lastIndexOf("<table", backendHotelHeadingIndex);
  if (backendHotelStart === -1) return backendHtml;

  const backendVehicleHeadingMatch = backendHtml.match(/Vehicle Details/i);
  if (!backendVehicleHeadingMatch || backendVehicleHeadingMatch.index === undefined) {
    return backendHtml;
  }

  const backendVehicleHeadingIndex = backendVehicleHeadingMatch.index;
  const backendVehicleStart = backendHtml.lastIndexOf("<table", backendVehicleHeadingIndex);
  if (backendVehicleStart === -1 || backendVehicleStart <= backendHotelStart) {
    return backendHtml;
  }

  return `${backendHtml.slice(0, backendHotelStart)}${renderedHotelsHtml}${backendHtml.slice(backendVehicleStart)}`;
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
  const [additionalAdults, setAdditionalAdults] = useState<AdditionalPassenger[]>([]);
  const [additionalChildren, setAdditionalChildren] = useState<AdditionalPassenger[]>([]);
  const [additionalInfants, setAdditionalInfants] = useState<AdditionalPassenger[]>([]);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [prebookData, setPrebookData] = useState<any | null>(null);
  const [isPrebooking, setIsPrebooking] = useState(false);
  const [hasAcceptedUpdatedPrice, setHasAcceptedUpdatedPrice] = useState(false);
  const prebookTotalAmount = Number(prebookData?.updatedTotalPrice || prebookData?.finalPrice || prebookData?.totalAmount || 0);
  const hasPrebookPriceChanged = prebookTotalAmount > 0 && Math.abs(prebookTotalAmount - selectedHotelTotal) > 0.01;

  const ALLOWED_TITLES = ['Mr', 'Mrs', 'Ms', 'Miss', 'Mx', 'Dr'];
  const TBO_SESSION_WINDOW_MS = 35 * 60 * 1000;
  const isValidPassengerName = (value: string) => /^[A-Za-z][A-Za-z\s'-]{1,24}$/.test(value.trim());
  const isValidIsoNationality = (value: string) => /^[A-Z]{2}$/.test(value.trim().toUpperCase());

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
      for (let idx = 0; idx < rooms; idx++) {
        if (occupancies[idx].children < 4) {
          occupancies[idx].children += 1;
          occupancies[idx].childrenAges.push(age);
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

  const normalizeNameParts = (name: string) => {
    const trimmed = name.trim();
    const parts = trimmed.split(/\s+/).filter(Boolean);
    const firstName = parts[0] || trimmed;
    const lastName = parts.slice(1).join(' ') || firstName;
    return { firstName, lastName };
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
      console.log("🔄 [ItineraryDetails] Starting hotel data refresh for quoteId:", quoteId);
      const [detailsRes, hotelRes] = await Promise.all([
        ItineraryService.getDetails(quoteId),
        ItineraryService.getHotelDetails(quoteId),
      ]);
      console.log("✅ [ItineraryDetails] Hotel data received:", { detailsRes, hotelRes });
      setItinerary(detailsRes as ItineraryDetailsResponse);
      setHotelDetails(hotelRes as ItineraryHotelDetailsResponse);
      console.log("✅ [ItineraryDetails] State updated with new hotel data");
    } catch (e: any) {
      console.error("❌ [ItineraryDetails] Failed to refresh hotel data", e);
    }
  }, [quoteId]);

  const refreshVehicleData = useCallback(async () => {
    if (!quoteId) return;
    
    try {
      const detailsRes = await ItineraryService.getDetails(quoteId);
      setItinerary(detailsRes as ItineraryDetailsResponse);
    } catch (e: any) {
      console.error("Failed to refresh vehicle data", e);
    }
  }, [quoteId]);

  const handleHotelGroupTypeChange = useCallback(async (groupType: number) => {
    if (!quoteId) return;
    
    console.log("Hotel group type changed to:", groupType);
    setActiveHotelGroupType(groupType);
    
    try {
      // Only refetch itinerary details with the selected group type to update costs
      // Hotel data (hotels, hotelTabs) does NOT change by group type, only cost breakdown
      const detailsRes = await ItineraryService.getDetails(quoteId, groupType);
      setItinerary(detailsRes as ItineraryDetailsResponse);
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
    // Update selectedHotelBookings when user selects hotels in HotelList
    setSelectedHotelBookings(selections);
    console.log('🏨 Hotel selections updated from HotelList:', selections);
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
      toast.info('Rebuilding hotels...');

      const [detailsRes, hotelRes] = await Promise.all([
        ItineraryService.getDetails(quoteId),
        ItineraryService.rebuildHotelDetails(quoteId, 1, 20, activeHotelGroupType || undefined),
      ]);

      setItinerary(detailsRes as ItineraryDetailsResponse);
      setHotelDetails(hotelRes as ItineraryHotelDetailsResponse);
      toast.success('Hotels rebuilt successfully');
    } catch (e: any) {
      toast.error(e?.message || 'Failed to rebuild hotels');
    } finally {
      setIsRebuildingHotels(false);
    }
  }, [quoteId, isRebuildingHotels, activeHotelGroupType]);

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
      setError(null);

      // Fetch both details and hotel data in parallel
      const [detailsRes, hotelRes] = await Promise.all([
        ItineraryService.getDetails(quoteId),
        ItineraryService.getHotelDetails(quoteId),
      ]);

      // Only update state if component is still mounted
      if (!isMountedRef.current) {
        console.log("🔄 [ItineraryDetails] Component unmounted, skipping state update");
        return;
      }

      console.log("✅ [ItineraryDetails] Initial fetch completed successfully");
      setItinerary(detailsRes as ItineraryDetailsResponse);
      setHotelDetails(hotelRes as ItineraryHotelDetailsResponse);
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
      }
    }
  };

  fetchDetails();

  // Cleanup: Mark component as unmounted
  return () => {
    isMountedRef.current = false;
  };
}, [quoteId, location.pathname]);

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
      let hotelRes;
      
      // If confirmed itinerary is available, fetch from confirmed endpoint
      if (itinerary?.confirmed_itinerary_plan_ID) {
        hotelRes = await ItineraryService.getConfirmedItinerary(itinerary.confirmed_itinerary_plan_ID);
      } else {
        // Fallback to hotel details endpoint
        hotelRes = await ItineraryService.getHotelDetails(quoteId);
      }
      
      setHotelDetails(hotelRes as ItineraryHotelDetailsResponse);
      return hotelRes;
    } catch (error: any) {
      console.error("Failed to load hotel details", error);
      toast.error("Failed to load hotel details");
      return null;
    }
  };

  const handleDeleteHotspot = async () => {
    if (!deleteHotspotModal.planId || !deleteHotspotModal.routeId || !deleteHotspotModal.hotspotId) {
      return;
    }

    setIsDeleting(true);
    try {
      await ItineraryService.deleteHotspot(
        deleteHotspotModal.planId,
        deleteHotspotModal.routeId,
        deleteHotspotModal.hotspotId
      );
      
      toast.success("Hotspot deleted successfully");
      
      // Close modal
      setDeleteHotspotModal({
        open: false,
        planId: null,
        routeId: null,
        hotspotId: null,
        hotspotName: "",
      });
      
      // Show rebuild button by setting route ID with pending rebuild
      setRouteNeedsRebuild(deleteHotspotModal.routeId);
      
      // Reload itinerary data
      if (quoteId) {
        const [detailsRes, hotelRes] = await Promise.all([
          ItineraryService.getDetails(quoteId),
          ItineraryService.getHotelDetails(quoteId),
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
          ItineraryService.getHotelDetails(quoteId),
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
          ItineraryService.getHotelDetails(quoteId),
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
    hotspotName: string
  ) => {
    setDeleteHotspotModal({
      open: true,
      planId,
      routeId,
      hotspotId,
      hotspotName,
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
          const hotelRes = await ItineraryService.getHotelDetails(quoteId);
          setHotelDetails(hotelRes as ItineraryHotelDetailsResponse);
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
          const hotelRes = await ItineraryService.getHotelDetails(quoteId);
          setHotelDetails(hotelRes as ItineraryHotelDetailsResponse);
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

  const openAddHotspotModal = async (
    planId: number,
    routeId: number,
    locationId: number,
    locationName: string,
    anchor?: HotspotAnchor | null,
  ) => {
    setAddHotspotModal({
      open: true,
      planId,
      routeId,
      locationId,
      locationName,
    });
    setPreviewTimelinesByHotspot({});
    setSelectedHotspotIds([]);
    setIsPreviewingHotspotId(null);
    setSelectedHotspotAnchor(anchor || null);

    // Fetch available hotspots for this location
    setLoadingHotspots(true);
    try {
      const hotspots = await ItineraryService.getAvailableHotspots(routeId);
      setAvailableHotspots(hotspots as AvailableHotspot[]);

      // Open directly in preview layout by selecting the first available hotspot.
      if (Array.isArray(hotspots) && hotspots.length > 0) {
        const firstHotspotId = Number((hotspots as AvailableHotspot[])[0].id);
        if (Number.isFinite(firstHotspotId) && firstHotspotId > 0) {
          await handlePreviewHotspot(firstHotspotId, {
            planId,
            routeId,
            anchor: anchor || undefined,
          });
        }
      }

      const currentRoute = itinerary?.days.find((d) => d.id === routeId);
      if (currentRoute) {
        setExcludedHotspotIds((currentRoute as any).excluded_hotspot_ids || []);
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
    },
  ) => {
    const pId = options?.planId || addHotspotModal.planId;
    const rId = options?.routeId || addHotspotModal.routeId;
    const anchor = options?.anchor || selectedHotspotAnchor || undefined;
    if (!pId || !rId) return;

    setSelectedHotspotIds((prev) => [...prev.filter((id) => id !== hotspotId), hotspotId]);
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
      );
      // The backend returns { newHotspot, otherConflicts, fullTimeline }.
      setPreviewTimelinesByHotspot((prev) => ({
        ...prev,
        [hotspotId]: preview.fullTimeline || [],
      }));
    } catch (e: any) {
      console.error("Failed to preview hotspot", e);
      toast.error(e?.message || "Failed to preview hotspot");
      setSelectedHotspotIds((prev) => prev.filter((id) => id !== hotspotId));
    } finally {
      setIsPreviewingHotspotId(null);
    }
  };

  const handleRemovePreviewHotspot = (hotspotId: number) => {
    setSelectedHotspotIds((prev) => prev.filter((id) => id !== hotspotId));
    setPreviewTimelinesByHotspot((prev) => {
      const clone = { ...prev };
      delete clone[hotspotId];
      return clone;
    });
  };

  const handleAddHotspot = async () => {
    if (readOnly) {
      console.log('Cannot add hotspot in read-only mode');
      return;
    }

    if (!addHotspotModal.planId || !addHotspotModal.routeId) {
      return;
    }

    if (selectedHotspotIds.length === 0) {
      toast.error("Select at least one hotspot to add");
      return;
    }

    // Check for conflicts in preview
    const hasConflicts = selectedPreviewSegments.some((seg: any) => seg?.isConflict === true);
    if (hasConflicts) {
      const confirm = window.confirm("One or more selected hotspots have timing conflicts. Do you want to continue?");
      if (!confirm) return;
    }

    setIsAddingHotspot(true);
    try {
      const affectedRouteId = addHotspotModal.routeId;

      let successCount = 0;
      const failedHotspots: number[] = [];

      for (const hotspotId of selectedHotspotIds) {
        const addResult: any = await ItineraryService.addManualHotspot(
          addHotspotModal.planId,
          addHotspotModal.routeId,
          hotspotId,
          selectedHotspotAnchor
            ? {
                anchorType: selectedHotspotAnchor.anchorType,
                anchorIndex: selectedHotspotAnchor.anchorIndex,
              }
            : undefined,
        );

        if (addResult?.success === false || addResult?.inserted === false) {
          failedHotspots.push(hotspotId);
          continue;
        }

        successCount += 1;
      }

      if (successCount === 0) {
        toast.error("Failed to add selected hotspots at this position");
        return;
      }

      if (failedHotspots.length > 0) {
        toast.warning(`Added ${successCount} hotspot(s). ${failedHotspots.length} failed.`);
      } else {
        toast.success(`Added ${successCount} hotspot(s) successfully`);
      }

      // Show rebuild button for the day where manual hotspot was added.
      if (affectedRouteId) {
        setRouteNeedsRebuild(affectedRouteId);
      }

      // Close modal and inline
      setAddHotspotModal({
        open: false,
        planId: null,
        routeId: null,
        locationId: null,
        locationName: "",
      });
      setHotspotSearchQuery("");
      setPreviewTimelinesByHotspot({});
      setSelectedHotspotIds([]);
      setIsPreviewingHotspotId(null);
      setSelectedHotspotAnchor(null);

      // Reload itinerary data
      if (quoteId) {
        const [detailsRes, hotelRes] = await Promise.all([
          ItineraryService.getDetails(quoteId),
          ItineraryService.getHotelDetails(quoteId),
        ]);
        setItinerary(detailsRes as ItineraryDetailsResponse);
        setHotelDetails(hotelRes as ItineraryHotelDetailsResponse);
      }
    } catch (e: any) {
      console.error("Failed to add hotspot", e);
      toast.error(e?.message || "Failed to add hotspot");
    } finally {
      setIsAddingHotspot(false);
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
          ItineraryService.getHotelDetails(quoteId),
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
          netAmount: hotel.totalCost || hotel.totalRoomCost || hotel.price || 0,
          hotelName: hotel.hotelName,
          checkInDate: formatDate(checkInDate),
          checkOutDate: formatDate(checkOutDate),
          searchInitiatedAt: new Date().toISOString(),
        }
      }));
      setPrebookData(null);
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
          ItineraryService.getHotelDetails(quoteId),
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
    if (!itinerary?.planId) {
      toast.error('Plan ID not found');
      return;
    }

    setConfirmQuotationModal(true);
    setPrebookData(null);
    setHasAcceptedUpdatedPrice(false);
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

      // Prefill arrival and departure details from plan
      if (planDetails?.plan) {
        const plan = planDetails.plan;
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
          arrivalDateTime: plan.trip_start_date_and_time ? formatDateTime(plan.trip_start_date_and_time) : '',
          arrivalPlace: plan.arrival_location || '',
          departureDateTime: plan.trip_end_date_and_time ? formatDateTime(plan.trip_end_date_and_time) : '',
          departurePlace: plan.departure_location || '',
        }));
      }
    } catch (e: any) {
      console.error('Failed to load customer info', e);
      toast.error(e?.message || 'Failed to load customer information');
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

    if (!isValidPassengerName(guestDetails.name)) {
      nextErrors['primary-name'] = 'Primary guest name must be 2-25 characters and contain only letters, spaces, apostrophe or hyphen.';
    }

    if (!isValidIsoNationality(guestDetails.nationality)) {
      nextErrors['primary-nationality'] = 'Primary guest nationality must be a valid ISO-2 code (example: IN).';
    }

    const primaryAge = Number(guestDetails.age);
    if (!Number.isFinite(primaryAge) || primaryAge <= 0) {
      nextErrors['primary-age'] = 'Primary guest age must be a valid number.';
    }

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
        } else if (!isValidPassengerName(item.name)) {
          nextErrors[`${label}-${index}-name`] = `${label} ${index + 1} name must be 2-25 valid characters.`;
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
      });
    };

    const expectedAdditionalAdults = Math.max(Number(itinerary.adults || 0) - 1, 0);
    const expectedChildren = Math.max(Number(itinerary.children || 0), 0);
    const expectedInfants = Math.max(Number(itinerary.infants || 0), 0);

    validateAdditionalPassengers(additionalAdults, 'adult', expectedAdditionalAdults, 12, 120);
    validateAdditionalPassengers(additionalChildren, 'child', expectedChildren, 2, 11);
    validateAdditionalPassengers(additionalInfants, 'infant', expectedInfants, 0, 5);

    if (Object.keys(nextErrors).length > 0) {
      setFormErrors(nextErrors);
      toast.error('Please fix guest details before confirming quotation.');
      return;
    }

    setFormErrors({});
    setIsConfirmingQuotation(true);

    try {
      let autoSelectedHotels = { ...selectedHotelBookings };

      if (hotelDetails?.hotels && hotelDetails.hotels.length > 0) {
        const routesWithHotels = new Set(hotelDetails.hotels.map((h: any) => h.itineraryRouteId));

        routesWithHotels.forEach((routeId: number) => {
          if (!autoSelectedHotels[routeId]) {
            const firstHotelForRoute = hotelDetails.hotels.find(
              (h: any) => h.itineraryRouteId === routeId && h.groupType === 1
            );

            if (firstHotelForRoute) {
              const routeDay = itinerary?.days?.find((d) => d.id === routeId);
              const checkInDate = routeDay?.date || '';
              const checkOutDate = routeDay
                ? new Date(new Date(routeDay.date).getTime() + 24 * 60 * 60 * 1000).toISOString().split('T')[0]
                : '';

              autoSelectedHotels[routeId] = {
                provider: firstHotelForRoute.provider || 'tbo',
                hotelCode: String(firstHotelForRoute.hotelCode || firstHotelForRoute.hotelId),
                bookingCode: firstHotelForRoute.bookingCode || String(firstHotelForRoute.hotelId),
                roomType: firstHotelForRoute.roomType || 'Standard',
                netAmount: firstHotelForRoute.totalHotelCost || 0,
                hotelName: firstHotelForRoute.hotelName,
                checkInDate,
                checkOutDate,
                searchInitiatedAt: new Date().toISOString(),
              };
            }
          }
        });
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
          panNo: guestDetails.panNo || undefined,
          passportNo: guestDetails.passportNo || undefined,
          passportIssueDate: undefined,
          passportExpDate: undefined,
          phoneNo: guestDetails.contactNo,
        },
        ...additionalAdults.map((adult) => {
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
        ...additionalChildren.map((child) => {
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
            panNo: child.panNo || undefined,
            passportNo: child.passportNo || undefined,
            passportIssueDate: undefined,
            passportExpDate: undefined,
            phoneNo: guestDetails.contactNo,
          };
        }),
        ...additionalInfants.map((infant) => {
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
            panNo: infant.panNo || undefined,
            passportNo: infant.passportNo || undefined,
            passportIssueDate: undefined,
            passportExpDate: undefined,
            phoneNo: guestDetails.contactNo,
          };
        }),
      ];

      const childAgesForBooking = [
        ...additionalChildren.map((c) => Number(c.age)),
      ].filter((age) => Number.isFinite(age) && age >= 0 && age <= 11);

      const occupanciesForBooking = buildTboOccupancies(
        Number(itinerary.roomCount || 1),
        Math.max(Number(itinerary.adults || 1), 1),
        childAgesForBooking,
      );

      const hotelBookings: any[] = Object.entries(autoSelectedHotels).map(([routeId, hotelData]) => ({
        occupancies: occupanciesForBooking,
        provider: hotelData.provider,
        routeId: parseInt(routeId, 10),
        hotelCode: hotelData.hotelCode,
        bookingCode: hotelData.bookingCode,
        roomType: hotelData.roomType,
        checkInDate: hotelData.checkInDate,
        checkOutDate: hotelData.checkOutDate,
        numberOfRooms: Number(itinerary.roomCount || 1),
        guestNationality: guestDetails.nationality,
        netAmount: Number(hotelData.netAmount || 0),
        searchInitiatedAt: hotelData.searchInitiatedAt,
        passengers,
      }));

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

      if (!prebookData) {
        setIsPrebooking(true);
        try {
          const prebookResponse = await ItineraryService.prebookHotels({
            itinerary_plan_ID: itinerary.planId,
            hotel_bookings: hotelBookings,
            endUserIp: clientIp,
          });
          const normalizedPrebook = prebookResponse?.data || prebookResponse;
          setPrebookData(normalizedPrebook);

          const currentTotal = hotelBookings.reduce((sum, booking) => sum + Number(booking.netAmount || 0), 0);
          const prebookTotal = Number(
            normalizedPrebook?.updatedTotalPrice ||
              normalizedPrebook?.finalPrice ||
              normalizedPrebook?.totalAmount ||
              0
          );

          if (prebookTotal > 0 && Math.abs(prebookTotal - currentTotal) > 0.01 && !hasAcceptedUpdatedPrice) {
            toast.warning('Prebook returned an updated price. Please review and confirm updated price to continue.');
            return;
          }
        } catch (prebookError) {
          toast.error(getSafeErrorMessage(prebookError, 'Failed to prebook selected hotels.'));
          return;
        } finally {
          setIsPrebooking(false);
        }
        // After first successful prebook, return and let modal display for user review
        return;
      }

      const prebookTotal = Number(
        prebookData?.updatedTotalPrice || prebookData?.finalPrice || prebookData?.totalAmount || 0
      );
      const currentTotal = hotelBookings.reduce((sum, booking) => sum + Number(booking.netAmount || 0), 0);
      if (prebookTotal > 0 && Math.abs(prebookTotal - currentTotal) > 0.01 && !hasAcceptedUpdatedPrice) {
        toast.warning('Accept updated prebook price before final confirmation.');
        return;
      }

      // TBO Certification: Require acknowledgement of prebook details before final booking
      if (!hasAcceptedUpdatedPrice) {
        toast.warning('Please review and acknowledge the prebook details before final booking confirmation.');
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

      await ItineraryService.confirmQuotation({
        itinerary_plan_ID: itinerary.planId,
        agent: agentInfo.agent_id,
        primary_guest_salutation: guestDetails.salutation,
        primary_guest_name: guestDetails.name,
        primary_guest_contact_no: guestDetails.contactNo,
        primary_guest_age: guestDetails.age,
        primary_guest_alternative_contact_no: guestDetails.alternativeContactNo,
        primary_guest_email_id: guestDetails.emailId,
        adult_name: additionalAdults.map(a => a.name),
        adult_age: additionalAdults.map(a => a.age),
        child_name: additionalChildren.map(c => c.name),
        child_age: additionalChildren.map(c => c.age),
        infant_name: additionalInfants.map(i => i.name),
        infant_age: additionalInfants.map(i => i.age),
        arrival_date_time: guestDetails.arrivalDateTime,
        arrival_place: guestDetails.arrivalPlace,
        arrival_flight_details: guestDetails.arrivalFlightDetails,
        departure_date_time: guestDetails.departureDateTime,
        departure_place: guestDetails.departurePlace,
        departure_flight_details: guestDetails.departureFlightDetails,
        price_confirmation_type: hasAcceptedUpdatedPrice ? 'new' : 'old',
        hotel_group_type: selectedGroupType,
        hotel_bookings: hotelBookings.length > 0 ? hotelBookings : undefined,
        primaryGuest,
        endUserIp: clientIp,
      });

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
      setAdditionalAdults([]);
      setAdditionalChildren([]);
      setAdditionalInfants([]);
      setPrebookData(null);
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

  const hotelTimelineLoading = Boolean(!hotelDetails && itinerary && !error);

  if ((loading || hotelTimelineLoading) && !isApplyingRouteTimeUpdate) {
    return (
      <div className="w-full max-w-full flex justify-center items-center py-16">
        <div className="flex items-center gap-2 text-sm text-[#6c6c6c]">
          <Loader2 className="h-4 w-4 animate-spin" />
          <p>{isApplyingRouteTimeUpdate ? "Updating itinerary and hotel results..." : "Loading itinerary details and hotel names..."}</p>
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
            <h1 className="text-xl font-semibold text-[#4a4260]">
              Tour Itinerary Plan
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
            <button
              type="button"
              onClick={scrollToHotelList}
              className="inline-flex items-center gap-1 rounded px-1 -mx-1 text-left hover:text-[#d546ab] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#d546ab]/40"
              title="Go to Hotel List"
            >
              <span>Room Count</span>
              <span className="font-semibold text-[#4a4260]">{itinerary.roomCount}</span>
            </button>
            <span>Extra Bed <span className="font-semibold text-[#4a4260]">{itinerary.extraBed}</span></span>
            <span>Child with bed <span className="font-semibold text-[#4a4260]">{itinerary.childWithBed}</span></span>
            <span>Child without bed <span className="font-semibold text-[#4a4260]">{itinerary.childWithoutBed}</span></span>
            <div className="ml-auto flex gap-4">
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
             className="sticky z-20 relative flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-3 mx-0 px-5 py-3 bg-white rounded-lg border border-[#59b9ea] min-h-[74px]"
             style={{ top: `${Math.max(summaryStickyHeight + 8, 8)}px` }}
           >
  <div className="flex items-center gap-3 min-w-0 lg:pr-[180px]">
    <Calendar className="h-5 w-5 text-[#d546ab] shrink-0" />
    <div className="min-w-0">
      <div className="flex items-center gap-2 flex-wrap">
        <h3 className="font-semibold text-[#4a4260]">
          DAY {day.dayNumber} - {formatHeaderDate(day.date)}
        </h3>
        {routeNeedsRebuild === day.id && (
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

      <div className="flex items-center gap-2 text-sm text-[#6c6c6c] flex-wrap">
        <span className="font-medium">{day.departure}</span>
        {day.viaRoutes && day.viaRoutes.length > 0 && (
          <>
            <ArrowRight className="h-4 w-4 text-[#d546ab] mx-1" />
            <span
              className="text-[#4a4260]"
              title={day.viaRoutes.map((v) => v.name).join(", ")}
            >
              {day.viaRoutes.map((v) => v.name).join(", ")}
            </span>
          </>
        )}
        <MapPin className="h-3 w-3 mx-1" />
        <span className="font-medium">{day.arrival}</span>
      </div>
    </div>
  </div>

  <div className="flex justify-center lg:absolute lg:left-1/2 lg:top-1/2 lg:-translate-x-1/2 lg:-translate-y-1/2">
    <div className="flex items-center gap-2 bg-white border border-[#e5d9f2] rounded-full px-2 py-1 shadow-sm">
      <Popover>
        <PopoverTrigger asChild>
          <div className="px-2 py-0.5 text-sm font-medium text-[#4a4260] cursor-pointer hover:bg-[#f8f5fc] rounded transition-colors">
            {day.startTime}
          </div>
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
          <div className="px-2 py-0.5 text-sm font-medium text-[#4a4260] cursor-pointer hover:bg-[#f8f5fc] rounded transition-colors">
            {day.endTime}
          </div>
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

  <div className="flex justify-center lg:justify-end lg:pl-[260px] items-center gap-2">
    <Button
      variant="outline"
      size="sm"
      className="text-[#d546ab] border-[#d546ab] hover:bg-[#fdf6ff] h-7 px-2 text-xs"
    >
      <Plus className="h-3 w-3 mr-1" />
      Add Guide
    </Button>
    <span className="bg-[#d546ab] text-white px-3 py-1 rounded-full font-medium whitespace-nowrap text-sm">
      {intercityDistance}
    </span>
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
                    const travelFromLabel = segment.from;
                    const travelToLabel = segment.to;
                    const travelDistanceLabel = segment.distance;

                    return (
                    <div className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm ${segment.isConflict ? 'bg-red-50 border border-red-400' : 'bg-[#e8f9fd]'}`}>
                      <Car className="h-4 w-4 text-[#4ba3c3] shrink-0" />
                      <span className="text-[#4a4260] min-w-0 flex-1">
                        <span className="font-medium">Travelling from </span>
                        <span className="text-[#d546ab] font-medium">{travelFromLabel}</span>
                        <span className="font-medium"> to </span>
                        <span className="text-[#d546ab] font-medium">{travelToLabel}</span>
                      </span>
                      <span className="flex items-center gap-1 text-xs text-[#6c6c6c] shrink-0 flex-wrap justify-end gap-x-3">
                        <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{segment.timeRange}</span>
                        <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{travelDistanceLabel}</span>
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
                            <span>WARNING: {segment.conflictReason}</span>
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
                                    segment.name
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
                              className="rounded-lg object-cover shadow-sm"
                              style={{ width: 185, height: 115 }}
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
                              Manual Addition: This place was added manually. Timing may vary from our optimized route.
                            </p>
                          </div>
                        </div>
                      )}

                      {/* Activities List */}
                      {segment.activities && segment.activities.length > 0 && (
                        <div className="ml-8 mt-2 border-t border-[#e5d9f2] pt-4">
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
                                        className="rounded-lg object-cover"
                                        style={{ width: 140, height: 100 }}
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

                  {segment.type === "hotspot" && !readOnly && (() => {
                    const isAnchored =
                      segment.anchorType === "after_travel" &&
                      Number.isInteger(Number(segment.anchorIndex));

                    return (
                      <div className="mb-3">
                        <button
                          type="button"
                          className="flex items-center gap-2 text-[#d546ab] hover:underline font-medium"
                          onClick={() =>
                            openAddHotspotModal(
                              itinerary.planId || 0,
                              day.id,
                              segment.locationId || 0,
                              day.arrival || "Location",
                              isAnchored
                                ? {
                                    anchorType: "after_travel",
                                    anchorIndex: Number(segment.anchorIndex),
                                    anchorFrom: segment.anchorFrom,
                                    anchorTo: segment.anchorTo,
                                    anchorTimeRange: segment.anchorTimeRange,
                                  }
                                : null,
                            )
                          }
                        >
                          <Plus className="h-4 w-4" />
                          {segment.text}
                        </button>
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
      {hotelDetails && (
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
          onHotelSelectionsChange={handleHotelSelectionsChange}
          pagination={hotelDetails.pagination}
          routePagination={hotelDetails.routePagination}
          onLoadMore={handleHotelLoadMore}
          isLoadingMore={isLoadingMoreHotels}
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
      {itinerary.vehicles && itinerary.vehicles.length > 0 && (() => {
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
          <>
            {typeOrder.map((typeId) => {
              const vehiclesForType = vehiclesByType.get(typeId) || [];
              const firstVehicle = vehiclesForType[0];
              const vehicleTypeLabel = firstVehicle?.vehicleTypeName || `Vehicle Type ${typeId}`;
              
              return (
                <VehicleList
                  key={typeId}
                  vehicleTypeLabel={vehicleTypeLabel}
                  vehicles={vehiclesForType}
                  itineraryPlanId={itinerary.planId}
                  onRefresh={refreshVehicleData}
                  onSelectedTotalChange={({ vehicleTypeId, totalAmount, totalQty }) => {
                    const key = Number(vehicleTypeId || typeId || 0);
                    if (!key) return;
                    setSelectedVehicleTotalsByType((prev) => ({
                      ...prev,
                      [key]: {
                        totalAmount: Number(totalAmount || 0),
                        totalQty: Number(totalQty || 0),
                      },
                    }));
                  }}
                  dateRange={dateRange}
                  routes={routes}
                />
              );
            })}
          </>
        );
      })()}

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
              {(() => {
                const roomTotal = Number(financialTotals.hotelAmount || 0);
                const stayCount = roomBreakdownStayCount || 1;
                const roomCount = Math.max(Number(itinerary?.roomCount || 1), 1);

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
                          <span className="text-[#6c6c6c]">Total Hotel Cost For ({stayCount} days * {roomCount}) rooms</span>
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
                            <span>{meta.hotelName}</span>
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
              {itinerary.costBreakdown.extraBedCost !== undefined && itinerary.costBreakdown.extraBedCost > 0 && (
                <div className="flex justify-between">
                  <span className="text-[#6c6c6c]">Extra Bed Cost ({itinerary.extraBed || 0})</span>
                  <span className="text-[#4a4260]">₹ {itinerary.costBreakdown.extraBedCost.toFixed(2)}</span>
                </div>
              )}
              {itinerary.costBreakdown.childWithBedCost !== undefined && itinerary.costBreakdown.childWithBedCost > 0 && (
                <div className="flex justify-between">
                  <span className="text-[#6c6c6c]">Child With Bed Cost ({itinerary.childWithBed || 0})</span>
                  <span className="text-[#4a4260]">₹ {itinerary.costBreakdown.childWithBedCost.toFixed(2)}</span>
                </div>
              )}
              {itinerary.costBreakdown.childWithoutBedCost !== undefined && itinerary.costBreakdown.childWithoutBedCost > 0 && (
                <div className="flex justify-between">
                  <span className="text-[#6c6c6c]">Child Without Bed Cost ({itinerary.childWithoutBed || 0})</span>
                  <span className="text-[#4a4260]">₹ {itinerary.costBreakdown.childWithoutBedCost.toFixed(2)}</span>
                </div>
              )}
              {/* ── Vehicle Cost Group ── */}
              {computedVehicleAmount > 0 && (
                <div className="flex justify-between">
                  <span className="text-[#6c6c6c]">
                    Total Vehicle Cost{computedVehicleQty ? ` (${computedVehicleQty})` : ''}
                  </span>
                  <span className="text-[#4a4260]">₹ {computedVehicleAmount.toFixed(2)}</span>
                </div>
              )}
              {computedVehicleAmount > 0 && (
                <div className="flex justify-between font-semibold">
                  <span className="text-[#4a4260]">Total Vehicle Amount</span>
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
        <div className="relative group">
          <Button className="bg-[#8b43d1] hover:bg-[#7c37c1]">
            Clipboard ▼
          </Button>
          <div className="absolute left-0 mt-1 w-56 bg-white border border-gray-200 rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
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
        >
          <Bell className="mr-2 h-4 w-4" />
          Confirm Quotation
        </Button>

        {/* Share Dropdown */}
        <div className="relative group">
          <Button className="bg-[#17a2b8] hover:bg-[#138496]">
            Share ▼
          </Button>
          <div className="absolute left-0 mt-1 w-56 bg-white border border-gray-200 rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
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
                          className={`w-full rounded-lg border-2 p-3 text-left transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#d546ab] focus-visible:ring-offset-2 ${
                            activityPreview?.activity?.id === activity.id
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
                    <div className={`rounded-lg border-2 p-3 ${
                      activityPreview.hasConflicts
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
                              <span className={`shrink-0 w-16 text-center rounded px-1 py-0.5 font-medium ${
                                seg.type === 'travel' ? 'bg-blue-100 text-blue-700'
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
            setSelectedHotspotIds([]);
            setIsPreviewingHotspotId(null);
            setSelectedHotspotAnchor(null);
            return;
          }

          setAddHotspotModal({ ...addHotspotModal, open: true });
        }}
      >
        <DialogContent className="sm:max-w-5xl max-h-[90vh] flex flex-col">
          <DialogHeader>
            <div className="flex items-center justify-between gap-4">
              <div>
                <DialogTitle>Hotspot List</DialogTitle>
                <DialogDescription>
                  {selectedHotspotAnchor
                    ? `Select a hotspot to insert after ${selectedHotspotAnchor.anchorFrom || "current"} -> ${selectedHotspotAnchor.anchorTo || "next stop"}`
                    : "Select a hotspot to add to your itinerary"}
                </DialogDescription>
              </div>
              <input
                type="text"
                placeholder="Search Hotspot..."
                className="px-3 py-2 border border-gray-300 rounded-md text-sm w-64"
                value={hotspotSearchQuery}
                onChange={(e) => setHotspotSearchQuery(e.target.value)}
              />
            </div>
          </DialogHeader>
          <div className="py-4 flex-1 overflow-hidden flex min-h-0">
            <div className="flex gap-4 w-full min-h-0">
              {/* Left Column: Hotspot List */}
              <div ref={hotspotListRef} className="w-1/2 overflow-y-auto min-h-0">
                {loadingHotspots ? (
                  <p className="text-sm text-[#6c6c6c] text-center py-8">
                    Loading available hotspots...
                  </p>
                ) : filteredHotspots.length === 0 ? (
                  <p className="text-sm text-[#6c6c6c] text-center py-8">
                    {hotspotSearchQuery ? "No hotspots match your search" : "No hotspots available for this location"}
                  </p>
                ) : (
                  <div className="grid grid-cols-1 gap-4">
                    {filteredHotspots.map((hotspot) => (
                      (() => {
                        const isSelected = selectedHotspotIds.includes(hotspot.id);
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
                          <div className="flex justify-between items-start mb-2">
                            <h4 className="font-semibold text-base text-[#4a4260] flex items-center gap-2">
                              {hotspot.name}
                              {hotspot.visitAgain && (
                                <span className="text-[9px] font-bold text-white bg-blue-500 px-2 py-0.5 rounded whitespace-nowrap">
                                  Visit Again
                                </span>
                              )}
                              {excludedHotspotIds.includes(hotspot.id) && (
                                <span className="text-[9px] font-bold text-white bg-orange-500 px-2 py-0.5 rounded whitespace-nowrap">
                                  Deleted from timeline
                                </span>
                              )}
                              {isSelected && (
                                <span className={`text-[10px] px-2 py-0.5 rounded-full uppercase font-bold ${
                                  hasConflict
                                    ? 'bg-red-100 text-red-700' 
                                    : 'bg-green-100 text-green-700'
                                }`}>
                                  {hasConflict ? 'Conflict' : 'Selected'}
                                </span>
                              )}
                            </h4>
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                variant={isSelected ? "outline" : "default"}
                                className={isSelected ? "border-gray-300" : "bg-[#d546ab] hover:bg-[#b93a8f] text-white"}
                                onClick={() => handlePreviewHotspot(hotspot.id)}
                                disabled={isLoadingThis}
                              >
                                {isLoadingThis ? (
                                  <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Previewing...
                                  </>
                                ) : isSelected ? (
                                  "Refresh"
                                ) : (
                                  "Preview"
                                )}
                              </Button>
                            </div>
                          </div>
                          <p className="text-sm text-[#6c6c6c] mb-3 line-clamp-2">
                            {hotspot.description}
                          </p>
                          <div className="flex flex-wrap gap-3 text-xs text-[#6c6c6c]">
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
                            {hotspot.timings && (
                              <span className="flex items-center">
                                <Timer className="h-3 w-3 mr-1" />
                                {hotspot.timings}
                              </span>
                            )}
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
              <div className="w-1/2 border-l pl-4 flex flex-col overflow-hidden min-h-0">
                <h3 className="font-semibold text-[#4a4260] mb-4 flex items-center gap-2 flex-shrink-0">
                  <Clock className="h-4 w-4" />
                  Proposed Timeline
                </h3>
                <div ref={timelinePreviewRef} className="flex-1 space-y-3 overflow-y-auto min-h-0">
                  {isPreviewingHotspotId ? (
                    <div className="flex flex-col items-center justify-center h-24 text-[#6c6c6c]">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#d546ab] mb-2"></div>
                      <p className="text-sm">Calculating selected slot...</p>
                    </div>
                  ) : null}

                  {effectivePreviewTimeline.length > 0 ? (
                    <>
                      {effectivePreviewTimeline.map((seg: any, idx: number) => {
                        const isUserSelected = seg?.isUserSelectedPreview === true;
                        const selectedId = Number(seg?.selectedHotspotId || seg?.locationId || 0);

                        return (
                          <div
                            key={`${idx}-${seg?.type}-${seg?.text || ''}`}
                            data-selected={isUserSelected ? "true" : "false"}
                            className={`p-3 rounded-lg border-2 transition-all ${
                              seg?.isConflict
                                ? 'bg-red-50 border-red-300 shadow-sm'
                                : isUserSelected
                                  ? 'bg-green-50 border-green-500 ring-2 ring-green-200 shadow-md scale-[1.02]'
                                  : 'bg-gray-50 border-gray-200 opacity-90'
                            }`}
                          >
                            <div className="flex justify-between items-start mb-1 gap-2">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded uppercase ${
                                  seg?.type === 'travel' ? 'bg-blue-100 text-blue-700'
                                  : seg?.type === 'attraction' ? 'bg-green-100 text-green-700'
                                  : 'bg-gray-200 text-gray-700'
                                }`}>
                                  {seg?.type || 'item'}
                                </span>
                                <span className="text-xs font-bold text-[#4a4260]">
                                  {seg?.timeRange || '--'}
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
                              {seg?.text}
                            </p>

                            {seg?.isConflict && (
                              <div className="mt-2 p-2 bg-white/50 rounded border border-red-100">
                                <p className="text-xs text-red-600 font-medium leading-tight">
                                  {seg?.conflictReason}
                                </p>
                              </div>
                            )}
                          </div>
                        );
                      })}

                      <div className="pt-4 sticky bottom-0 bg-white">
                        <Button
                          className="w-full bg-green-600 hover:bg-green-700 text-white shadow-lg"
                          onClick={handleAddHotspot}
                          disabled={isAddingHotspot || selectedHotspotIds.length === 0}
                        >
                          {isAddingHotspot ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Adding...
                            </>
                          ) : (
                            `Confirm Add to Itinerary${selectedHotspotIds.length > 0 ? ` (${selectedHotspotIds.length})` : ''}`
                          )}
                        </Button>
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
                setAddHotspotModal({
                  open: false,
                  planId: null,
                  routeId: null,
                  locationId: null,
                  locationName: "",
                });
                setHotspotSearchQuery("");
                setPreviewTimelinesByHotspot({});
                setSelectedHotspotIds([]);
                setIsPreviewingHotspotId(null);
                setSelectedHotspotAnchor(null);
              }}
              disabled={isAddingHotspot}
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
                        className={`flex-shrink-0 w-16 h-16 rounded-md overflow-hidden border-2 transition-colors ${
                          idx === galleryActiveIdx ? 'border-[#d546ab]' : 'border-transparent'
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
      <Dialog open={clipboardModal} onOpenChange={setClipboardModal}>
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
    const renderedHotelsHtml = extractHotelSectionFromHtml(localClipboard.html);
    const mergedHtml = mergeClipboardWithRenderedHotels(html, renderedHotelsHtml);
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
                  className={`border-2 ${
                    hotspotPreview.isAlreadyAdded
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
                            className={`text-xs font-bold px-2 py-1 rounded-full ${
                              hotspotPreview.isAlreadyAdded
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
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
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

            {/* Primary Guest Details */}
            <div className="space-y-3">
              <h3 className="font-semibold text-[#4a4260]">Primary Guest Details - Adult 1</h3>
              
              <div className="grid grid-cols-4 gap-3">
                <div className="col-span-1">
                  <label className="text-sm font-medium text-[#4a4260] mb-1 block">
                    Salutation
                  </label>
                  <select
                    className="w-full px-3 py-2 border border-[#e5d9f2] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#d546ab]"
                    value={guestDetails.salutation}
                    onChange={(e) => setGuestDetails({...guestDetails, salutation: e.target.value})}
                  >
                    <option value="Mr">Mr</option>
                    <option value="Ms">Ms</option>
                    <option value="Mrs">Mrs</option>
                    <option value="Miss">Miss</option>
                    <option value="Mx">Mx</option>
                    <option value="Dr">Dr</option>
                  </select>
                </div>

                <div className="col-span-2">
                  <label className="text-sm font-medium text-[#4a4260] mb-1 block">
                    Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    className="w-full px-3 py-2 border border-[#e5d9f2] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#d546ab]"
                    placeholder="Enter the Name"
                    value={guestDetails.name}
                    onChange={(e) => {
                      setGuestDetails({...guestDetails, name: e.target.value});
                      setFormErrors((prev) => {
                        const next = { ...prev };
                        delete next['primary-name'];
                        return next;
                      });
                    }}
                  />
                  {formErrors['primary-name'] && <p className="text-[11px] text-red-600 mt-1">{formErrors['primary-name']}</p>}
                </div>

                <div className="col-span-1">
                  <label className="text-sm font-medium text-[#4a4260] mb-1 block">
                    Age
                  </label>
                  <input
                    type="text"
                    className="w-full px-3 py-2 border border-[#e5d9f2] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#d546ab]"
                    placeholder="Enter the Age"
                    value={guestDetails.age}
                    onChange={(e) => setGuestDetails({...guestDetails, age: e.target.value})}
                  />
                  {formErrors['primary-age'] && <p className="text-[11px] text-red-600 mt-1">{formErrors['primary-age']}</p>}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
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
                      setGuestDetails({...guestDetails, contactNo: e.target.value});
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
                    onChange={(e) => setGuestDetails({...guestDetails, alternativeContactNo: e.target.value})}
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-sm font-medium text-[#4a4260] mb-1 block">
                    Nationality <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    className="w-full px-3 py-2 border border-[#e5d9f2] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#d546ab]"
                    placeholder="IN"
                    value={guestDetails.nationality}
                    onChange={(e) => {
                      setGuestDetails({...guestDetails, nationality: e.target.value.toUpperCase()});
                      setFormErrors((prev) => {
                        const next = { ...prev };
                        delete next['primary-nationality'];
                        return next;
                      });
                    }}
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
                    onChange={(e) => setGuestDetails({...guestDetails, panNo: e.target.value.toUpperCase()})}
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
                    onChange={(e) => setGuestDetails({...guestDetails, passportNo: e.target.value.toUpperCase()})}
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
                  onChange={(e) => setGuestDetails({...guestDetails, emailId: e.target.value})}
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
                    <div className="grid grid-cols-12 gap-2 items-end">
                      <div className="col-span-2">
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
                      <div className="col-span-5">
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
                      <div className="col-span-2">
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
                      <div className="col-span-2">
                        <label className="text-[10px] font-medium text-[#4a4260] mb-1 block">Nationality</label>
                        <input
                          type="text"
                          className="w-full px-2 py-1.5 text-sm border border-[#e5d9f2] rounded-lg"
                          placeholder="IN"
                          value={adult.nationality}
                          onChange={(e) => {
                            const next = [...additionalAdults];
                            next[index].nationality = e.target.value.toUpperCase();
                            setAdditionalAdults(next);
                          }}
                        />
                      </div>
                      <div className="col-span-1">
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
                    <div className="grid grid-cols-2 gap-2">
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
                    onClick={() => setAdditionalChildren([...additionalChildren, defaultPassenger('Miss')])}
                    className="h-8 px-2 text-xs border-[#e5d9f2] text-[#8b43d1] hover:bg-[#f8f4ff]"
                  >
                    <Plus className="w-3 h-3 mr-1" /> Add Child
                  </Button>
                </div>
                {formErrors['count-child'] && <p className="text-[11px] text-red-600">{formErrors['count-child']}</p>}
                {additionalChildren.map((child, index) => (
                  <div key={index} className="space-y-2 rounded-lg border border-[#f0e6fb] p-3">
                    <div className="grid grid-cols-12 gap-2 items-end">
                      <div className="col-span-2">
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
                      <div className="col-span-5">
                        <label className="text-[10px] font-medium text-[#4a4260] mb-1 block">Child {index + 1} Name</label>
                        <input type="text" className="w-full px-2 py-1.5 text-sm border border-[#e5d9f2] rounded-lg" placeholder="Name" value={child.name} onChange={(e) => { const next = [...additionalChildren]; next[index].name = e.target.value; setAdditionalChildren(next); }} />
                      </div>
                      <div className="col-span-2">
                        <label className="text-[10px] font-medium text-[#4a4260] mb-1 block">Age</label>
                        <input type="text" className="w-full px-2 py-1.5 text-sm border border-[#e5d9f2] rounded-lg" placeholder="Age" value={child.age} onChange={(e) => { const next = [...additionalChildren]; next[index].age = e.target.value; setAdditionalChildren(next); }} />
                      </div>
                      <div className="col-span-2">
                        <label className="text-[10px] font-medium text-[#4a4260] mb-1 block">Nationality</label>
                        <input type="text" className="w-full px-2 py-1.5 text-sm border border-[#e5d9f2] rounded-lg" placeholder="IN" value={child.nationality} onChange={(e) => { const next = [...additionalChildren]; next[index].nationality = e.target.value.toUpperCase(); setAdditionalChildren(next); }} />
                      </div>
                      <div className="col-span-1">
                        <Button type="button" variant="ghost" size="sm" onClick={() => setAdditionalChildren(additionalChildren.filter((_, i) => i !== index))} className="h-9 w-full text-red-500 hover:text-red-700 hover:bg-red-50">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <input type="text" className="w-full px-2 py-1.5 text-sm border border-[#e5d9f2] rounded-lg" placeholder="PAN (Optional)" value={child.panNo} onChange={(e) => { const next = [...additionalChildren]; next[index].panNo = e.target.value.toUpperCase(); setAdditionalChildren(next); }} />
                      <input type="text" className="w-full px-2 py-1.5 text-sm border border-[#e5d9f2] rounded-lg" placeholder="Passport No (Optional)" value={child.passportNo} onChange={(e) => { const next = [...additionalChildren]; next[index].passportNo = e.target.value.toUpperCase(); setAdditionalChildren(next); }} />
                    </div>
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
                    onClick={() => setAdditionalInfants([...additionalInfants, defaultPassenger('Miss')])}
                    className="h-8 px-2 text-xs border-[#e5d9f2] text-[#8b43d1] hover:bg-[#f8f4ff]"
                  >
                    <Plus className="w-3 h-3 mr-1" /> Add Infant
                  </Button>
                </div>
                {formErrors['count-infant'] && <p className="text-[11px] text-red-600">{formErrors['count-infant']}</p>}
                {additionalInfants.map((infant, index) => (
                  <div key={index} className="space-y-2 rounded-lg border border-[#f0e6fb] p-3">
                    <div className="grid grid-cols-12 gap-2 items-end">
                      <div className="col-span-2">
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
                      <div className="col-span-5">
                        <label className="text-[10px] font-medium text-[#4a4260] mb-1 block">Infant {index + 1} Name</label>
                        <input type="text" className="w-full px-2 py-1.5 text-sm border border-[#e5d9f2] rounded-lg" placeholder="Name" value={infant.name} onChange={(e) => { const next = [...additionalInfants]; next[index].name = e.target.value; setAdditionalInfants(next); }} />
                      </div>
                      <div className="col-span-2">
                        <label className="text-[10px] font-medium text-[#4a4260] mb-1 block">Age</label>
                        <input type="text" className="w-full px-2 py-1.5 text-sm border border-[#e5d9f2] rounded-lg" placeholder="Age" value={infant.age} onChange={(e) => { const next = [...additionalInfants]; next[index].age = e.target.value; setAdditionalInfants(next); }} />
                      </div>
                      <div className="col-span-2">
                        <label className="text-[10px] font-medium text-[#4a4260] mb-1 block">Nationality</label>
                        <input type="text" className="w-full px-2 py-1.5 text-sm border border-[#e5d9f2] rounded-lg" placeholder="IN" value={infant.nationality} onChange={(e) => { const next = [...additionalInfants]; next[index].nationality = e.target.value.toUpperCase(); setAdditionalInfants(next); }} />
                      </div>
                      <div className="col-span-1">
                        <Button type="button" variant="ghost" size="sm" onClick={() => setAdditionalInfants(additionalInfants.filter((_, i) => i !== index))} className="h-9 w-full text-red-500 hover:text-red-700 hover:bg-red-50">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <input type="text" className="w-full px-2 py-1.5 text-sm border border-[#e5d9f2] rounded-lg" placeholder="PAN (Optional)" value={infant.panNo} onChange={(e) => { const next = [...additionalInfants]; next[index].panNo = e.target.value.toUpperCase(); setAdditionalInfants(next); }} />
                      <input type="text" className="w-full px-2 py-1.5 text-sm border border-[#e5d9f2] rounded-lg" placeholder="Passport No (Optional)" value={infant.passportNo} onChange={(e) => { const next = [...additionalInfants]; next[index].passportNo = e.target.value.toUpperCase(); setAdditionalInfants(next); }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Arrival Details */}
            <div className="space-y-3">
              <h3 className="font-semibold text-[#4a4260]">Arrival Details</h3>
              
              <div className="grid grid-cols-2 gap-3">
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
                    onChange={(e) => setGuestDetails({...guestDetails, arrivalPlace: e.target.value})}
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
                  onChange={(e) => setGuestDetails({...guestDetails, arrivalFlightDetails: e.target.value})}
                />
              </div>
            </div>

            {/* Departure Details */}
            <div className="space-y-3">
              <h3 className="font-semibold text-[#4a4260]">Departure Details</h3>
              
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium text-[#4a4260] mb-1 block">
                    Date & Time
                  </label>
                  <input
                    type="text"
                    className="w-full px-3 py-2 border border-[#e5d9f2] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#d546ab]"
                    placeholder="19-12-2025 4:00 PM"
                    value={guestDetails.departureDateTime}
                    onChange={(e) => setGuestDetails({...guestDetails, departureDateTime: e.target.value})}
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
                    onChange={(e) => setGuestDetails({...guestDetails, departurePlace: e.target.value})}
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
                  onChange={(e) => setGuestDetails({...guestDetails, departureFlightDetails: e.target.value})}
                />
              </div>
            </div>

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
                    <p className="text-[#6c6c6c]">Cancellation Policy</p>
                    {normalizePrebookItems(prebookData.cancellationPolicy || prebookData.cancellationPoliciesText).length > 0 ? (
                      <ul className="font-medium text-[#4a4260] whitespace-pre-wrap list-disc pl-5 space-y-1">
                        {normalizePrebookItems(prebookData.cancellationPolicy || prebookData.cancellationPoliciesText).map((item, idx) => (
                          <li key={`cancelPolicy-${idx}`}>{item}</li>
                        ))}
                      </ul>
                    ) : (
                      <p className="font-medium text-[#4a4260] whitespace-pre-wrap">No cancellation policy returned</p>
                    )}
                  </div>
                </div>
                <div>
                  <p className="text-[#6c6c6c] text-sm">Room Promotion</p>
                  {normalizePrebookItems(prebookData.roomPromotion).length > 0 ? (
                    <ul className="text-sm text-[#4a4260] list-disc pl-5 space-y-1">
                      {normalizePrebookItems(prebookData.roomPromotion).map((item, idx) => (
                        <li key={`roomPromotion-${idx}`}>{item}</li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-[#4a4260]">No room promotion returned</p>
                  )}
                </div>
                <div>
                  <p className="text-[#6c6c6c] text-sm">Rate Conditions</p>
                  {normalizePrebookItems(prebookData.rateConditions).length > 0 ? (
                    <ul className="text-sm text-[#4a4260] list-disc pl-5 space-y-1 whitespace-pre-wrap">
                      {normalizePrebookItems(prebookData.rateConditions).map((item, idx) => (
                        <li key={`rateCondition-${idx}`}>{item}</li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-[#4a4260]">No rate conditions returned</p>
                  )}
                </div>
                <div>
                  <p className="text-[#6c6c6c] text-sm">Mandatory Supplements & Additional Charges</p>
                  {prebookData?.normalizedSupplements && prebookData.normalizedSupplements.length > 0 ? (
                    <SupplementDisplay supplements={prebookData.normalizedSupplements} showHeading={false} />
                  ) : normalizePrebookItems(prebookData.mandatorySupplements).length > 0 ? (
                    <ul className="text-sm text-[#4a4260] list-disc pl-5 space-y-1 whitespace-pre-wrap">
                      {normalizePrebookItems(prebookData.mandatorySupplements).map((item, idx) => (
                        <li key={`supplement-${idx}`}>{item}</li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-[#4a4260]">No mandatory supplements returned</p>
                  )}
                </div>
                <div>
                  <p className="text-[#6c6c6c] text-sm">Package Inclusions</p>
                  {normalizePrebookItems(prebookData.inclusions).length > 0 ? (
                    <ul className="text-sm text-[#4a4260] list-disc pl-5 space-y-1 whitespace-pre-wrap">
                      {normalizePrebookItems(prebookData.inclusions).map((item, idx) => (
                        <li key={`inclusion-${idx}`}>{item}</li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-[#4a4260]">No inclusions returned</p>
                  )}
                </div>

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
                  <span>I have reviewed the inclusions, rate conditions, and room promotion details before final booking confirmation.</span>
                </label>
              </div>
            )}
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
              {isPrebooking ? 'Running Prebook...' : isConfirmingQuotation ? 'Submitting...' : prebookData ? 'Confirm Booking' : 'Run Prebook & Continue'}
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