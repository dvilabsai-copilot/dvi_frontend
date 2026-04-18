// REPLACE-WHOLE-FILE: src/services/itinerary.ts
import { api } from "@/lib/api";

export type ItinerarySaveType =
  | "itineary_basic_info"
  | "itineary_basic_info_with_optimized_route"
  | undefined;

export type ItineraryClipboardMode = "recommended" | "highlights" | "para";

export type HotelArrivalPolicyRequest = {
  itineraryPlanId?: number;
  itineraryRouteId?: number;
  routeDayNumber?: number;
  routeDate?: string;
  arrivalDateTime?: string;
  arrivalCityName?: string;
  routeSourceCityName?: string;
  nightStayCityName?: string;
  arrivalCityId?: number;
  routeSourceCityId?: number;
  nightStayCityId?: number;
  previousDayBillingDecisionProvided?: boolean;
  previousDayBillingConfirmed?: boolean;
};

export type HotelArrivalPolicyResponse = {
  resolutionStatus: string;
  arrivalWindow: string;
  requiresPreviousDayBillingConfirmation: boolean;
  shouldOpenHotelSearch: boolean;
  hotelSearchMode: "SAME_DAY" | "PREVIOUS_DAY";
  hotelFlowAction: "DIRECT_HOTEL" | "DIRECT_SIGHTSEEING";
  deferHotelToEndOfDay: boolean;
  goToHotelImmediately: boolean;
  effectiveCheckInDate: string;
  effectiveCheckOutDate: string;
  sameCityArrival: boolean;
  normalizationApplied: boolean;
  message?: string;
  debug?: Record<string, unknown>;
};

export type HotspotAnchorPayload = {
  anchorType?: "after_travel";
  anchorIndex?: number;
};

type LatestItineraryParams = {
  page: number;            // 1-based
  pageSize: number;        // length
  search?: string;
  startDate?: string;      // "DD/MM/YYYY" (from filter)
  endDate?: string;        // "DD/MM/YYYY"
  sourceLocation?: string; // arrival_location
  destinationLocation?: string; // departure_location
  agentId?: number | null;
  staffId?: number | null;
};

export const ItineraryService = {
  async create(data: any, type?: ItinerarySaveType) {
    const url = type
      ? `itineraries/?type=${encodeURIComponent(type)}`
      : "itineraries";

    return api(url, {
      method: "POST",
      body: data,
    });
  },

  async update(id: number, data: any, type?: ItinerarySaveType) {
    const url = type
      ? `itineraries/${id}?type=${encodeURIComponent(type)}`
      : `itineraries/${id}`;

    return api(url, {
      method: "PUT",
      body: data,
    });
  },

  async getOne(id: number) {
    return api(`itineraries/edit/${id}`, {
      method: "GET",
    });
  },

  async saveReusableTemplate(planId: number, templateName?: string) {
    return api("itineraries/templates/save", {
      method: "POST",
      body: { planId, templateName },
    });
  },

  async getReusableTemplateMatch(
    sourceLocation: string,
    destinationLocation: string,
    dayCount: number,
  ) {
    const qs = new URLSearchParams();
    qs.set("sourceLocation", sourceLocation);
    qs.set("destinationLocation", destinationLocation);
    qs.set("dayCount", String(dayCount));

    return api(`itineraries/templates/match?${qs.toString()}`, {
      method: "GET",
    });
  },

  // ---------------------------------------------------------------------------
  // Latest itineraries listing (SP-free Prisma API)
  // Maps React pagination -> DataTables-style query params
  // ---------------------------------------------------------------------------
  async getLatest(params: LatestItineraryParams) {
    const { page, pageSize } = params;
    const start = (page - 1) * pageSize;
    const length = pageSize;

    const qs = new URLSearchParams();

    // DataTables-style params
    qs.set("draw", "1");
    qs.set("start", String(start));
    qs.set("length", String(length));

    if (params.search && params.search.trim()) {
      qs.set("search[value]", params.search.trim());
    }

    if (params.startDate) qs.set("start_date", params.startDate);
    if (params.endDate) qs.set("end_date", params.endDate);

    if (params.sourceLocation) {
      qs.set("source_location", params.sourceLocation);
    }
    if (params.destinationLocation) {
      qs.set("destination_location", params.destinationLocation);
    }

    if (params.agentId != null && params.agentId > 0) {
      qs.set("agent_id", String(params.agentId));
    }
    if (params.staffId != null && params.staffId > 0) {
      qs.set("staff_id", String(params.staffId));
    }

    const url = `itineraries/latest?${qs.toString()}`;

    return api(url, {
      method: "GET",
    });
  },

  async getDetails(quoteId: string, groupType?: number) {
    const url = groupType !== undefined 
      ? `itineraries/details/${encodeURIComponent(quoteId)}?groupType=${groupType}`
      : `itineraries/details/${encodeURIComponent(quoteId)}`;
    return api(url, {
      method: "GET",
      cache: "no-store",
      headers: {
        "Cache-Control": "no-cache",
        Pragma: "no-cache",
      },
    });
  },

  async getHotelDetails(
    quoteId: string,
    page?: number,
    pageSize?: number,
    groupType?: number,
    itineraryRouteId?: number,
  ) {
    const qs = new URLSearchParams();
    if (page && page > 0) qs.set("page", String(page));
    if (pageSize && pageSize > 0) qs.set("pageSize", String(pageSize));
    if (groupType && groupType > 0) qs.set("groupType", String(groupType));
    if (itineraryRouteId && itineraryRouteId > 0) qs.set("itineraryRouteId", String(itineraryRouteId));
    const suffix = qs.toString() ? `?${qs.toString()}` : "";

    return api(`itineraries/hotel_details/${encodeURIComponent(quoteId)}${suffix}`, {
      method: "GET",
      cache: "no-store",
      headers: {
        "Cache-Control": "no-cache",
        Pragma: "no-cache",
      },
    });
  },

  async rebuildHotelDetails(
    quoteId: string,
    page?: number,
    pageSize?: number,
    groupType?: number,
  ) {
    const qs = new URLSearchParams();
    if (page && page > 0) qs.set('page', String(page));
    if (pageSize && pageSize > 0) qs.set('pageSize', String(pageSize));
    if (groupType && groupType > 0) qs.set('groupType', String(groupType));
    const suffix = qs.toString() ? `?${qs.toString()}` : '';

    return api(`itineraries/hotel_details/${encodeURIComponent(quoteId)}/rebuild${suffix}`, {
      method: 'POST',
      cache: 'no-store',
      headers: {
        'Cache-Control': 'no-cache',
        Pragma: 'no-cache',
      },
    });
  },

  async resolveHotelArrivalPolicy(payload: HotelArrivalPolicyRequest) {
    return api("itineraries/hotel-arrival-policy", {
      method: "POST",
      body: payload,
    }) as Promise<HotelArrivalPolicyResponse>;
  },

  async getClipboardContent(
    quoteId: string,
    mode: ItineraryClipboardMode,
    groupTypes: number[],
  ): Promise<{ html: string; plainText: string }> {
    const endpoint =
      mode === "highlights"
        ? "clipboard-highlights"
        : mode === "para"
        ? "clipboard-para"
        : "clipboard";

    const params = new URLSearchParams();
    const normalizedGroups = Array.from(
      new Set(
        groupTypes
          .map((g) => Number(g))
          .filter((g) => Number.isInteger(g) && g >= 1 && g <= 4),
      ),
    );

    normalizedGroups.forEach((groupType) => {
      params.append("groupType", String(groupType));
    });

    const recommendedKeys = ["recommended1", "recommended2", "recommended3", "recommended4"];
    normalizedGroups.slice(0, 4).forEach((groupType, idx) => {
      params.append(recommendedKeys[idx], String(groupType));
    });

    const qs = params.toString();
    const url = `itineraries/${endpoint}/${encodeURIComponent(quoteId)}${qs ? `?${qs}` : ""}`;

    return api(url, {
      method: "GET",
    });
  },

  async getConfirmedItinerary(confirmedId: number) {
    return api(`itineraries/confirmed/${confirmedId}`, {
      method: "GET",
    });
  },

// inside ItineraryService
  async getHotelRoomDetails(quoteId: string, itineraryRouteId?: number, clearCache: boolean = false) {
    // ✅ Add timestamp to URL to bust browser cache
    const timestamp = Date.now();
    
    // ✅ Build URL with clearCache parameter to force backend to bypass its memory cache
    let url = `/itineraries/hotel_room_details/${quoteId}?_ts=${timestamp}`;
    if (itineraryRouteId) {
      url += `&itineraryRouteId=${itineraryRouteId}`;
    }
    if (clearCache) {
      url += `&clearCache=true`; // ✅ Tell backend to clear its memory cache
    }
    
    // ✅ Force bypass browser cache with cache-busting headers and no-store cache policy
    const res = await api(url, {
      method: "GET",
      cache: "no-store",
      headers: {
        "Cache-Control": "no-cache, no-store, must-revalidate",
        "Pragma": "no-cache",
        "Expires": "0"
      }
    });
    return res; // api() already returns the JSON response directly
  },

  async deleteHotspot(planId: number, routeId: number, hotspotId: number) {
    return api(`itineraries/hotspot/${planId}/${routeId}/${hotspotId}`, {
      method: "DELETE",
    });
  },

  async rebuildRoute(planId: number, routeId: number) {
    return api(`itineraries/${planId}/route/${routeId}/rebuild`, {
      method: "POST",
    });
  },

  async rebuildRouteHotspots(planId: number, routeId: number) {
    return api(`itineraries/${planId}/routes/${routeId}/rebuild-hotspots`, {
      method: "POST",
    });
  },

  async getAvailableActivities(hotspotId: number) {
    return api(`itineraries/activities/available/${hotspotId}`, {
      method: "GET",
    });
  },

  async previewActivityAddition(data: {
    planId: number;
    routeId: number;
    routeHotspotId: number;
    hotspotId: number;
    activityId: number;
  }) {
    return api(`itineraries/activities/preview`, {
      method: "POST",
      body: data,
    });
  },

  async previewActivityForAllHotspots(data: {
    planId: number;
    routeId: number;
    activityId: number;
  }) {
    return api(`itineraries/activities/preview-all-hotspots`, {
      method: "POST",
      body: data,
    });
  },

  async smartPreviewActivity(
    planId: number,
    data: {
      routeId: number;
      activityId: number;
      gapIndex?: number;
      hotspotId?: number;
      routeHotspotId?: number;
      mode?: "preview" | "applyPreview";
    },
  ) {
    return api(`itineraries/${planId}/activity/smart-preview`, {
      method: "POST",
      body: data,
    });
  },

  async smartInsertActivity(
    planId: number,
    data: {
      routeId: number;
      activityId: number;
      gapIndex: number;
      hotspotId?: number;
      routeHotspotId?: number;
      allowTopPriorityRemoval?: boolean;
    },
  ) {
    return api(`itineraries/${planId}/activity/smart-insert`, {
      method: "POST",
      body: data,
    });
  },

  async addActivity(data: {
    planId: number;
    routeId: number;
    routeHotspotId: number;
    hotspotId: number;
    activityId: number;
    amount?: number;
    startTime?: string;
    endTime?: string;
    duration?: string;
    skipConflictCheck?: boolean;
  }) {
    return api(`itineraries/activities/add`, {
      method: "POST",
      body: data,
    });
  },

  async deleteActivity(planId: number, routeId: number, activityId: number) {
    return api(`itineraries/activities/${planId}/${routeId}/${activityId}`, {
      method: "DELETE",
    });
  },

  async getAvailableHotspots(routeId: number) {
    return api(`itineraries/hotspots/available/${routeId}`, {
      method: "GET",
    });
  },

  async getAvailableHotspotsForAnchor(data: {
    planId: number;
    routeId: number;
    anchorType: "after_travel";
    anchorIndex: number;
  }) {
    return api("itineraries/hotspots/available-for-anchor", {
      method: "POST",
      body: data,
    });
  },

  async addHotspot(planId: number, routeId: number, hotspotId: number) {
    return api("itineraries/hotspots/add", {
      method: "POST",
      body: { planId, routeId, hotspotId },
    });
  },

  async previewAddHotspot(
    planId: number,
    routeId: number,
    hotspotId: number,
    anchor?: HotspotAnchorPayload,
  ) {
    return api(`itineraries/${planId}/manual-hotspot/preview`, {
      method: "POST",
      body: {
        routeId,
        hotspotId,
        anchorType: anchor?.anchorType,
        anchorIndex: anchor?.anchorIndex,
      },
    });
  },

  async addManualHotspot(
    planId: number,
    routeId: number,
    hotspotId: number,
    anchor?: HotspotAnchorPayload,
  ) {
    return api(`itineraries/${planId}/manual-hotspot`, {
      method: "POST",
      body: {
        routeId,
        hotspotId,
        anchorType: anchor?.anchorType,
        anchorIndex: anchor?.anchorIndex,
      },
    });
  },

  async removeManualHotspot(planId: number, hotspotId: number) {
    return api(`itineraries/${planId}/manual-hotspot/${hotspotId}`, {
      method: "DELETE",
    });
  },

  async updateRouteTimes(
    planId: number,
    routeId: number,
    startTime: string,
    endTime: string,
    options?: {
      previousDayBillingDecisionProvided?: boolean;
      previousDayBillingConfirmed?: boolean;
    },
  ) {
    return api(`itineraries/${planId}/route/${routeId}/times`, {
      method: "PATCH",
      body: {
        startTime,
        endTime,
        previousDayBillingDecisionProvided: options?.previousDayBillingDecisionProvided,
        previousDayBillingConfirmed: options?.previousDayBillingConfirmed,
      },
    });
  },

  async getAvailableHotels(routeId: number) {
    return api(`itineraries/hotels/available/${routeId}`, {
      method: "GET",
    });
  },

  async selectHotel(
    planId: number,
    routeId: number,
    hotelId: number,
    roomTypeId: number,
    mealPlan?: { all?: boolean; breakfast?: boolean; lunch?: boolean; dinner?: boolean },
    groupType?: number,  // ✅ Add groupType parameter
  ) {
    return api("itineraries/hotels/select", {
      method: "POST",
      body: { planId, routeId, hotelId, roomTypeId, mealPlan, groupType },  // ✅ Send groupType
    });
  },

  async selectVehicleVendor(
    planId: number,
    vehicleTypeId: number,
    vendorEligibleId: number
  ) {
    return api("itineraries/vehicles/select-vendor", {
      method: "POST",
      body: { planId, vehicleTypeId, vendorEligibleId },
    });
  },

  async getCustomerInfoForm(planId: number) {
    return api(`itineraries/customer-info/${planId}`, {
      method: "GET",
    });
  },

  async checkWalletBalance(agentId: number) {
    return api(`itineraries/wallet-balance/${agentId}`, {
      method: "GET",
    });
  },

  async confirmQuotation(data: {
    itinerary_plan_ID: number;
    agent: number;
    primary_guest_salutation: string;
    primary_guest_name: string;
    primary_guest_contact_no: string;
    primary_guest_age: string;
    primary_guest_alternative_contact_no?: string;
    primary_guest_email_id?: string;
    adult_name?: string[];
    adult_age?: string[];
    child_name?: string[];
    child_age?: string[];
    infant_name?: string[];
    infant_age?: string[];
    arrival_date_time: string;
    arrival_place: string;
    arrival_flight_details?: string;
    departure_date_time: string;
    departure_place: string;
    departure_flight_details?: string;
    price_confirmation_type: string;
    hotel_group_type?: string;
    tbo_hotels?: Array<{
      routeId: number;
      hotelCode: string;
      bookingCode: string;
      roomType: string;
      checkInDate: string;
      checkOutDate: string;
      numberOfRooms: number;
      guestNationality: string;
      netAmount: number;
      searchInitiatedAt?: string;
      passengers: Array<{
        title: string;
        firstName: string;
        lastName: string;
        nationality?: string;
        email?: string;
        paxType: number;
        leadPassenger: boolean;
        age: number;
        panNo?: string;
        passportNo?: string;
        passportIssueDate?: string;
        passportExpDate?: string;
        phoneNo?: string;
      }>;
    }>;
    // ✅ NEW: Multi-provider hotel bookings (TBO, ResAvenue, HOBSE, etc.)
    hotel_bookings?: Array<{
      routeId: number;
      provider: string; // "TBO" | "ResAvenue" | "HOBSE"
      hotelCode: string;
      bookingCode: string;
      roomType: string;
      checkInDate: string;
      checkOutDate: string;
      numberOfRooms: number;
      guestNationality: string;
      netAmount: number;
      searchInitiatedAt?: string;
      passengers: Array<{
        title: string;
        firstName: string;
        lastName: string;
        nationality?: string;
        email?: string;
        paxType: number;
        leadPassenger: boolean;
        age: number;
        panNo?: string;
        passportNo?: string;
        passportIssueDate?: string;
        passportExpDate?: string;
        phoneNo?: string;
      }>;
    }>;
    // ✅ NEW: Primary guest fallback (used by backend if lead passenger missing)
    primaryGuest?: {
      salutation: string;
      name: string;
      phone: string;
      email?: string;
    };
    endUserIp?: string;
  }) {
    return api("itineraries/confirm-quotation", {
      method: "POST",
      body: data,
    });
  },

  async prebookHotels(data: {
    itinerary_plan_ID: number;
    hotel_bookings: Array<{
      routeId: number;
      provider: string;
      hotelCode: string;
      bookingCode: string;
      roomType: string;
      checkInDate: string;
      checkOutDate: string;
      numberOfRooms: number;
      guestNationality: string;
      netAmount: number;
      searchInitiatedAt?: string;
      passengers: Array<{
        title: string;
        firstName: string;
        lastName: string;
        nationality?: string;
        email?: string;
        paxType: number;
        leadPassenger: boolean;
        age: number;
        panNo?: string;
        passportNo?: string;
        passportIssueDate?: string;
        passportExpDate?: string;
        phoneNo?: string;
      }>;
    }>;
    endUserIp?: string;
  }) {
    return api("itineraries/hotels/prebook", {
      method: "POST",
      body: data,
    });
  },

  async cancelItinerary(data: {
    itinerary_plan_ID: number;
    reason?: string;
    cancellation_percentage?: number;
    cancel_guide?: boolean;
    cancel_hotspot?: boolean;
    cancel_activity?: boolean;
    cancel_hotel?: boolean;
    cancel_vehicle?: boolean;
    cancellation_options?: {
      modify_guide?: boolean;
      modify_hotspot?: boolean;
      modify_activity?: boolean;
      modify_hotel?: boolean;
      modify_vehicle?: boolean;
    };
  }) {
    return api("itineraries/cancel", {
      method: "POST",
      body: data,
    });
  },

  async getConfirmedItineraries(params: {
    draw?: number;
    start?: number;
    length?: number;
    start_date?: string;
    end_date?: string;
    source_location?: string;
    destination_location?: string;
    agent_id?: number;
    staff_id?: number;
  }) {
    const queryParams = new URLSearchParams();
    
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== '') {
        queryParams.append(key, String(value));
      }
    });

    return api(`itineraries/confirmed?${queryParams.toString()}`, {
      method: "GET",
    });
  },

  async getConfirmedItineraryDetails(id: string) {
    return api(`itineraries/confirmed/${id}`, {
      method: "GET",
    });
  },

  async getCancelledItineraries(params: {
    draw?: number;
    start?: number;
    length?: number;
    agent_id?: number;
  }) {
    const queryParams = new URLSearchParams();
    
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== '') {
        queryParams.append(key, String(value));
      }
    });

    return api(`itineraries/cancelled?${queryParams.toString()}`, {
      method: "GET",
    });
  },

  async getAccountsItineraries(params: {
    draw?: number;
    start?: number;
    length?: number;
    agent_id?: number;
  }) {
    const queryParams = new URLSearchParams();
    
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== '') {
        queryParams.append(key, String(value));
      }
    });

    return api(`itineraries/accounts?${queryParams.toString()}`, {
      method: "GET",
    });
  },

  async getConfirmedAgents() {
    return api("itineraries/confirmed/agents", {
      method: "GET",
    });
  },

  async getConfirmedLocations() {
    return api("itineraries/confirmed/locations", {
      method: "GET",
    });
  },

  async getLatestAgents() {
    return api("itineraries/latest/agents", {
      method: "GET",
    });
  },

  async getLatestLocations() {
    return api("itineraries/latest/locations", {
      method: "GET",
    });
  },

  async getVoucherDetails(id: number) {
    return api(`itineraries/${id}/voucher-details`, {
      method: "GET",
    });
  },

  async getPluckCardData(id: number) {
    return api(`itineraries/${id}/pluck-card-data`, {
      method: "GET",
    });
  },

  async getPluckCardDataByConfirmedId(confirmedId: number) {
    return api(`itineraries/confirmed/${confirmedId}/pluck-card-data`, {
      method: "GET",
    });
  },

  async getInvoiceData(id: number) {
    return api(`itineraries/${id}/invoice-data`, {
      method: "GET",
    });
  },

  // Incidental Expenses
  async getIncidentalAvailableComponents(itineraryPlanId: number) {
    return api(`incidental-expenses/available-components?itineraryPlanId=${itineraryPlanId}`, {
      method: "GET",
    });
  },

  async getIncidentalAvailableMargin(itineraryPlanId: number, componentType: number, componentId?: number) {
    let url = `incidental-expenses/available-margin?itineraryPlanId=${itineraryPlanId}&componentType=${componentType}`;
    if (componentId) url += `&componentId=${componentId}`;
    return api(url, {
      method: "GET",
    });
  },

  async addIncidentalExpense(data: {
    itineraryPlanId: number;
    componentType: number;
    componentId: number;
    amount: number;
    reason: string;
    createdBy: number;
  }) {
    return api(`incidental-expenses`, {
      method: "POST",
      body: data,
    });
  },

  async getIncidentalHistory(itineraryPlanId: number) {
    return api(`incidental-expenses/history?itineraryPlanId=${itineraryPlanId}`, {
      method: "GET",
    });
  },

  async deleteIncidentalHistory(id: number) {
    return api(`incidental-expenses/history/${id}`, {
      method: "DELETE",
    });
  },

  // Real-time hotel search
  async searchHotels(searchParams: {
    cityCode: string;
    checkInDate: string;
    checkOutDate: string;
    roomCount: number;
    guestCount: number;
    adultCount?: number;
    childCount?: number;
    infantCount?: number;
    childAges?: number[];
    guestNationality?: string;
    hotelName?: string;
  }) {
    const payload = {
      ...searchParams,
      guestNationality: searchParams.guestNationality,
    };

    return api("hotels/search", {
      method: "POST",
      body: payload,
    });
  },

  // Get detailed information for a specific hotel (TBO API)
  async getHotelInfo(hotelCode: string) {
    return api(`hotels/${hotelCode}`, {
      method: "GET",
    });
  },

  // Get room availability for specific hotel
  async getRoomAvailability(
    hotelCode: string,
    checkInDate: string,
    checkOutDate: string
  ) {
    return api(`hotels/${hotelCode}/availability`, {
      method: "POST",
      body: { checkInDate, checkOutDate },
    });
  },
};