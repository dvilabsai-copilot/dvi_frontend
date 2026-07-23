// Shared API/domain declarations for the itinerary details page.
// Keep these types independent from React state so extracted components can consume them.

export type StartSegment = {
  type: "start";
  title: string;
  timeRange: string; // "12:00 AM - 12:00 AM"
};

export type TravelSegment = {
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

export type BreakSegment = {
  type: "break";
  location: string;
  duration: string; // "1 Hour 30 Min"
  timeRange: string; // "12:00 PM - 01:30 PM"
};

export type Activity = {
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

export type AttractionSegment = {
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

export type HotspotSegment = {
  type: "hotspot";
  text: string;
  locationId?: number;
  anchorType?: "BETWEEN_ROWS" | "after_travel";
  anchorIndex?: number;
  anchorFrom?: string;
  anchorTo?: string;
  anchorLabel?: string;
  anchorTimeRange?: string | null;
};

export type FitHereAnchorIntent = "AFTER_START" | "AFTER_ATTRACTION";

export type HotspotAnchor = {
  anchorType: "BETWEEN_ROWS" | "after_travel";
  anchorIndex: number;
  anchorIntent?: FitHereAnchorIntent;
  anchorFrom?: string;
  anchorTo?: string;
  anchorLabel?: string;
  anchorTimeRange?: string | null;
  afterRowType?: string;
  beforeRowType?: string;
  afterHotspotId?: number | null;
  afterRouteHotspotId?: number | null;
  beforeHotspotId?: number | null;
  beforeRouteHotspotId?: number | null;
  isBeforeHotel?: false;
};

export type CheckinSegment = {
  type: "checkin";
  hotelName: string;
  hotelAddress: string;
  time: string | null; // "06:00 PM"
};

export type ReturnSegment = {
  type: "return";
  time: string; // "08:00 PM"
  note?: string | null;
};

export type ItinerarySegment =
  | StartSegment
  | TravelSegment
  | BreakSegment
  | AttractionSegment
  | HotspotSegment
  | CheckinSegment
  | ReturnSegment;

export type ViaRouteItem = {
  id: number;
  name: string;
};

export type AvailableHotspot = {
  id: number;
  name: string;
  amount: number;
  description: string;
  timeSpend: number;
  locationMap: string | null;
  hotspot_location?: string | null;
  hotspot_to_location?: string | null;
  hotspotLocation?: string | null;
  hotspotToLocation?: string | null;
  image?: string | null;
  galleryImages?: string[];
  videoUrl?: string | null;
  timings?: string;
  visitAgain?: boolean;
  alreadyAdded?: boolean;
  alreadyAddedOnOtherRoute?: boolean;
  availabilityStatus?: 'AVAILABLE' | 'ACTIVE_THIS_ROUTE' | 'ACTIVE_OTHER_ROUTE' | 'EXCLUDED_BY_ROUTE' | 'MASTER_INACTIVE' | 'CLOSED_ON_ROUTE_DATE';
  availabilityReason?: string;
  actionDisabled?: boolean;
  buttonLabel?: string;
  isClosedOnRouteDate?: boolean;
  routeDayLabel?: string | null;
  routeDate?: string | null;
  closedDays?: string[];
  closedDaysLabel?: string | null;
  priority?: number;
  hotspotPriority?: number;
  hotspot_priority?: number;
  cityContext?: 'SOURCE_CITY' | 'DESTINATION_CITY' | 'UNKNOWN';
  routeHotspotId?: number | null;
  planOwnWay?: boolean;
  isManual?: boolean;
};

export type ItineraryDay = {
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
  departureTime?: string | null; // actual departure time shown on final day
  viaRoutes?: ViaRouteItem[];
  segments: ItinerarySegment[];
  needsRebuild?: boolean;
  excludedHotspotIds?: number[];
};

export type TriedAnchorState = {
  anchorKey: string;
  status:
    | "DIRECT_FIT"
    | "REMOVES_OPTIONAL"
    | "P3_CONFIRMATION"
    | "PRIORITY_CONFLICT"
    | "CANNOT_FIT";
  label: string;
  attemptId?: string;
};

export type ItineraryGuideAssignment = {
  routeGuideId: number;
  planId: number;
  routeId: number | null;
  routeDate: string | null;
  guideType: number;
  guideId: number;
  guideName: string;
  guideLanguage: string;
  guideLanguageIds: number[];
  guideLanguageLabels: string[];
  guideSlot: string;
  guideSlotIds: number[];
  guideSlotLabels: string[];
  guideCost: number;
};

export type GuideModalOptions = {
  languages: Array<{ id: number; label: string }>;
  slots: Array<{ id: number; label: string }>;
  assignment?: ItineraryGuideAssignment | null;
};

export type GuideAvailabilityDay = {
  routeId: number;
  routeDate: string | null;
  available: boolean;
};

export type GuideAvailabilityResponse = {
  planId: number;
  wholeItineraryAvailable: boolean;
  hasAnyGuidePrice: boolean;
  days: GuideAvailabilityDay[];
};

// --------- HOTELS (matches backend DTO) ---------

export type ItineraryHotelRow = {
  groupType: number;
  itineraryRouteId: number;
  day: string;
  dayNumber?: number;
  sortOrder?: number;
  destination: string;
  hotelId: number;
  hotelName: string;
  hotelCode?: string;
  category: number | string;
  roomType: string;
  mealPlan: string;
  totalHotelCost: number;
  totalHotelTaxAmount: number;
  baseHotelCost?: number;
  hotelMarginPercentage?: number;
  hotelMarginAmount?: number;
  hotelMarginGstAmount?: number;
  hotelRoomGstAmount?: number;
  hotelMealPlanCost?: number;
  hotelMealPlanGstAmount?: number;
  noOfRooms?: number;
  provider?: string; // Provider source (tbo, resavenue, hobse)
  providerDisplayName?: string;
  voucherCancelled?: boolean; // Whether voucher is cancelled

  // Original draft hotel details ID. Existing cancellation API uses this.
  itineraryPlanHotelDetailsId?: number;

  // Confirmed hotel details table ID, useful for display/debug/future use.
  confirmedItineraryPlanHotelDetailsId?: number;

  // Normalized IDs passed into existing cancel flow.
  hotelDetailsIds?: number[];

  // Optional explicit flag from backend.
  canCancelVoucher?: boolean;

  date?: string;
  // ✅ HOBSE-specific fields (optional, used if provider === "HOBSE")
  hotelCode?: string; // HOBSE hotel code
  bookingCode?: string; // HOBSE booking code
  searchReference?: string;
  checkInDate?: string; // YYYY-MM-DD format
  checkOutDate?: string; // YYYY-MM-DD format
  hotelCheckInDate?: string | null;
  actualGuestArrivalAt?: string | null;
  earlyCheckIn?: boolean;
  earlyCheckInExtraPaymentApplicable?: boolean;
  earlyCheckInPaymentStatus?: string | null;
  hotelierEarlyCheckInNote?: string | null;
  previousDayBillingSynthetic?: boolean;
  // ✅ Hotel distance from route location (calculated via Haversine on backend)
  hotelDistance?: string | null; // Distance in "XX.XX KM" format
  hotelAddress?: string | null;
  cancellationPolicy?: string[];
  isBookable?: boolean;
  externalStay?: boolean;
  availabilityStatus?: 'AVAILABLE' | 'NO_SUPPLIER_AVAILABILITY' | 'NOT_BOOKABLE';
  availabilityMessage?: string | null;
  availableAgainFrom?: string | null;
  displayRoomType?: string;
  displayMealPlan?: string;
};

export type ItineraryHotelTab = {
  groupType: number;
  label: string;
  totalAmount: number;
};

export type HotelAvailabilityMeta = {
  hasSupplierHotels: boolean;
  supplierHotelCount: number;
  placeholderRowCount: number;
  totalSearchRoutes: number;
  emptySearchRoutes: number;
  isPlaceholderOnly: boolean;
  message: string;
};

export type VehicleCostBreakdownItem = {
  label: string;
  amount: string | number;
};

export type ItineraryVehicleRow = {
  vendorName: string | null;
  branchName: string | null;
  vehicleOrigin: string | null;
  totalQty: string;
  totalAmount: string;
  vehicleId?: number | null;
  vehicleIds?: number[];
  vehicleNumber?: string | null;
  vehicleNumbers?: string[];
  availableVehicleCount?: number;
  vehicleRegistrationNumber?: string | null;
  vehicleRegistrationStateCode?: string | null;
  vehicleRegistrationStateName?: string | null;

  // vehicle type information
  vendorEligibleId?: number;
  vehicleTypeId?: number;
  vehicleTypeName?: string;
  isAssigned?: boolean;
  rateAvailable?: boolean;
  missingRateTypes?: Array<'Local' | 'Outstation'>;
  rateAvailabilityMessage?: string | null;

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

export type PackageIncludes = {
  description: string | null;
  houseBoatNote: string | null;
  rateNote: string | null;
};

export type EntryTicketTravellerBreakdown = {
  type: "adult" | "child" | "infant";
  label: string;
  quantity: number;
  unitCost: number;
  total: number;
};

export type EntryTicketBreakdown = {
  dayNumber: number;
  date: string | null;
  locationId: number;
  hotspotId: number;
  routeHotspotId: number;
  locationName: string;
  total: number;
  entryTicketRequired: boolean;
  nationality: number;
  travellers: EntryTicketTravellerBreakdown[];
};

export type CostBreakdown = {
  // Hotel costs
  totalRoomCost?: number | null;
  roomCostPerPerson?: number | null;
  hotelPaxCount?: number | null;
  totalAmenitiesCost?: number | null;
  extraBedCost?: number | null;
  childWithBedCost?: number | null;
  childWithoutBedCost?: number | null;
  hotelPricingSource?: "selected_hotel_rate" | "persisted_draft" | null;
  selectedHotelRateTotal?: number | null;
  hotelRateBreakdown?: Array<{
    routeId: number;
    date?: string | null;
    provider: string;
    hotelCode: string;
    hotelName: string;
    roomType?: string;
    mealPlan?: string;
    baseAmount: number;
    roomGstAmount: number;
    marginAmount: number;
    marginGstAmount: number;
    totalAmount: number;
  }>;
  hotelRoomBaseCost?: number | null;
  hotelRoomGstCost?: number | null;
  hotelMarginCost?: number | null;
  hotelMarginGstCost?: number | null;
  hotelMealPlanCost?: number | null;
  hotelMealPlanGstCost?: number | null;
  hotelMealPlanAllocatedCost?: number | null;
  totalHotelAmount?: number | null;

  // Vehicle costs
  totalVehicleCost: number | null;
  totalVehicleAmount: number | null;
  totalVehicleQty?: number | null;

  // Activity/Guide costs
  totalGuideCost?: number | null;
  totalHotspotCost?: number | null;
  entryTicketBreakdown?: EntryTicketBreakdown[];
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

// ----------------- Main API response types -----------------

export type ItineraryPlanRouteOption = {
  label?: string;
  routeName?: string;
  quoteId?: string;
  quotationNo?: string;
  quotation_no?: string;
  routeQuoteId?: string;
  itinerary_quote_ID?: string;
  itinerary_quote_id?: string;
  quote_id?: string;
};

export type ItineraryDetailsResponse = {
  // planId for routing back to create-itinerary
  planId?: number;
  itineraryPreference?: number;
  routeOptions?: ItineraryPlanRouteOption[];
  suggestedRoutes?: ItineraryPlanRouteOption[];
  siblingRoutes?: ItineraryPlanRouteOption[];
  confirmed_itinerary_plan_ID?: number;
  guideForItinerary?: number;
  isConfirmed?: boolean;
  special_instructions?: string | null;
  specialInstructions?: string | null;
  special_instruction?: string | null;
  specialInstruction?: string | null;
  transport_early_arrival_option?: string | null;
  transport_early_arrival_hotel_name?: string | null;
  transport_early_arrival_rest_minutes?: number | null;
  earlyArrivalPreferenceMessage?: string | null;
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

// Guest food preference from backend
food_type?: string | null;
foodType?: string | null;
food_type_name?: string | null;
foodTypeName?: string | null;
guest_food_preference?: string | null;
guestFoodPreference?: string | null;
guest_food_preference_name?: string | null;
guestFoodPreferenceName?: string | null;

days: ItineraryDay[];

  // VEHICLES
  vehicles: ItineraryVehicleRow[];
  vehicleRateAvailability?: Array<{
    vehicleTypeId: number;
    vehicleTypeName: string;
    message: string;
  }>;

  packageIncludes: PackageIncludes;
  costBreakdown: CostBreakdown;
};

// response shape from /itineraries/hotel_details/:quoteId
export type ItineraryHotelDetailsResponse = {
  hotelRatesVisible: boolean;
  showHotelMargins?: boolean;
  hotelTabs: ItineraryHotelTab[];
  hotels: ItineraryHotelRow[];
  restrictedHotels?: ItineraryHotelRow[];
  hotelAvailability?: HotelAvailabilityMeta;
  pagination?: Record<number, { hasMore: boolean; page: number; pageSize: number; total: number }>;
  routePagination?: Record<string, { hasMore: boolean; page: number; pageSize: number; total: number; groupType: number }>;
};

export type ConfirmedHotelResponseShape = {
  quoteId?: string;
  planId?: number;
  hotelRatesVisible?: boolean;
  showHotelMargins?: boolean;
  hotelTabs?: ItineraryHotelTab[];
  hotels?: any[];
  hotelAvailability?: HotelAvailabilityMeta;
};

export interface ItineraryDetailsProps {
  readOnly?: boolean;
  presentationMode?: 'standard' | 'confirmed';
}

