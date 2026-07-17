// REPLACE-WHOLE-FILE: src/services/itinerary.ts
import { api } from "@/lib/api";
import {
  downloadAuthenticatedFile,
  fetchPdfDocument,
} from "./itineraryPdf";
export type { PdfDocumentOptions, PdfDocumentResult } from "./itineraryPdf";
import type { PdfDocumentOptions, PdfDocumentResult } from "./itineraryPdf";
import { itineraryRouteActions } from "./itineraryRouteActions";
import {
  addIncidentalExpense,
  deleteIncidentalHistory,
  downloadHotelVoucherPdf,
  downloadInvoicePdf,
  downloadPluckCardPdf,
  downloadVehicleVoucherPdf,
  downloadVoucherPdf,
  getAccountsItineraries,
  getCancelledItineraries,
  getConfirmedAgents,
  getConfirmedGuideAssignments,
  getConfirmedItineraries,
  getConfirmedItineraryDetails,
  getConfirmedLocations,
  getHotelInfo,
  getIncidentalAvailableComponents,
  getIncidentalAvailableMargin,
  getIncidentalHistory,
  getInvoiceData,
  getLatestAgents,
  getLatestLocations,
  getPluckCardData,
  getPluckCardDataByConfirmedId,
  getRoomAvailability,
  getVoucherDetails,
  searchHotels,
  cancelConfirmedGuideSlot,
  type AccountsItineraryListParams,
  type CancelledItineraryListParams,
  type ConfirmedItineraryListParams,
  type HotelSearchParams,
} from "./itineraryBackOffice";

export type ItinerarySaveType =
  | "itineary_basic_info"
  | "itineary_basic_info_with_optimized_route"
  | undefined;

export type ItineraryClipboardMode = "recommended" | "highlights" | "para";

export type HotspotScenarioMarkdownResponse = {
  quoteId: string;
  dayNo: number | null;
  markdown: string;
  sourceFile: string;
  heading: string;
};

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

export interface StayExtensionPreviewRequest {
  routeId: number;
  provider: 'staah' | 'axisrooms';
  hotelCode: string;
  hotelName?: string;
  roomId?: string;
  rateId?: string;
  roomType?: string;
  mealPlan?: string;
  checkInDate: string;
}

export interface StayExtensionPreviewResponse {
  canBookSingleNight: boolean;
  canBookMultiNight: boolean;
  blocked: boolean;
  provider: 'staah' | 'axisrooms';
  hotelName?: string;
  roomType?: string;
  mealPlan?: string;
  checkInDate: string;
  checkOutDate: string;
  nights: number;
  routeIds: number[];
  stayKey?: string;
  restrictionConflicts: Array<{
    date?: string;
    type: string;
    message: string;
  }>;
  warnings: Array<{
    type: string;
    message: string;
  }>;
  nightlyRates: Array<{
    date: string;
    amountAfterTax: number;
    baseAmount?: number;
    extraAdultCount?: number;
    extraChildCount?: number;
    extraAdultRate?: number;
    extraChildRate?: number;
  }>;
  totalAmountAfterTax: number;
}

export type HotspotAnchorPayload = {
  anchorType?: "after_travel" | "BETWEEN_ROWS";
  anchorIndex?: number;
};

export type MatrixPreferredSlotPayload = {
  fromHotspotId?: number;
  toHotspotId?: number;
  slotIndex?: number;
  source?: "BEST_FIT";
};

export type ManualFitHerePreviewPayload = {
  routeId: number;
  selectedHotspotId: number;
  anchor: any;
  allowP3Removal?: boolean;
  allowP1P2Removal?: boolean;
};

export type ManualFitHereAutoPreviewPayload = {
  routeId: number;
  selectedHotspotId: number;
  anchors: any[];
  allowP3Removal?: boolean;
  allowP1P2Removal?: boolean;
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
  async fetchPdfDocument(
    path: string,
    fallbackFileName: string,
    options: PdfDocumentOptions = {},
  ): Promise<PdfDocumentResult> {
    return fetchPdfDocument(path, fallbackFileName, options);
  },

  async downloadAuthenticatedFile(path: string, fallbackFileName: string) {
    return downloadAuthenticatedFile(path, fallbackFileName);
  },

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
    qs.set("scope", "routes");

    return api(`itineraries/templates/match?${qs.toString()}`, {
      method: "GET",
      cache: "no-store",
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

  async getGuideAssignments(planId: number) {
    return api(`itineraries/${planId}/guides`, {
      method: "GET",
      cache: "no-store",
    });
  },

  async getGuideAssignmentOptions(planId: number, routeGuideId?: number) {
    const suffix = routeGuideId ? `?routeGuideId=${routeGuideId}` : "";
    return api(`itineraries/${planId}/guides/options${suffix}`, {
      method: "GET",
      cache: "no-store",
    });
  },

  async saveGuideAssignment(
    planId: number,
    data: {
      routeGuideId?: number;
      routeId?: number;
      routeDate?: string;
      guideType?: number;
      guideLanguage: number;
      guideSlots?: number[];
    },
  ) {
    return api(`itineraries/${planId}/guides`, {
      method: "POST",
      body: data,
    });
  },

  async deleteGuideAssignment(planId: number, routeGuideId: number, routeId?: number) {
    const suffix = routeId ? `?routeId=${routeId}` : "";
    return api(`itineraries/${planId}/guides/${routeGuideId}${suffix}`, {
      method: "DELETE",
    });
  },

  async getVehicleBuildStatus(planId: number) {
    return api(`itineraries/${planId}/vehicle-build-status`, {
      method: "GET",
      cache: "no-store",
      headers: {
        "Cache-Control": "no-cache",
        Pragma: "no-cache",
      },
    });
  },

  async triggerVehicleBuild(planId: number) {
    return api(`itineraries/${planId}/vehicle-build`, {
      method: "POST",
      cache: "no-store",
      headers: {
        "Cache-Control": "no-cache",
        Pragma: "no-cache",
      },
    });
  },

  async buildPermitsSync(planId: number) {
    return api(`itineraries/${planId}/permit-build-sync`, {
      method: "POST",
      cache: "no-store",
      headers: {
        "Cache-Control": "no-cache",
        Pragma: "no-cache",
      },
    });
  },

  async buildVehiclesSync(planId: number) {
    return api(`itineraries/${planId}/vehicle-build-sync`, {
      method: "POST",
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

  async previewHotelStayExtension(
    planId: number,
    payload: StayExtensionPreviewRequest,
  ) {
    return api(`itineraries/${planId}/hotels/stay-extension-preview`, {
      method: "POST",
      body: payload,
    }) as Promise<StayExtensionPreviewResponse>;
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

  async getHotspotScenarioMarkdown(quoteId: string, dayNo?: number) {
    const qs = new URLSearchParams();
    if (dayNo && dayNo > 0) {
      qs.set("day", String(dayNo));
    }

    const suffix = qs.toString() ? `?${qs.toString()}` : "";

    return api(`itineraries/hotspot-scenario-md/${encodeURIComponent(quoteId)}${suffix}`, {
      method: "GET",
      cache: "no-store",
      headers: {
        "Cache-Control": "no-cache",
        Pragma: "no-cache",
      },
    }) as Promise<HotspotScenarioMarkdownResponse>;
  },

  async getConfirmedItinerary(confirmedId: number) {
    return api(`itineraries/confirmed/${confirmedId}`, {
      method: "GET",
      cache: "no-store",
      headers: {
        "Cache-Control": "no-cache, no-store, must-revalidate",
        Pragma: "no-cache",
        Expires: "0",
      },
    });
  },

// inside ItineraryService
  async getHotelRoomDetails(quoteId: string, itineraryRouteId?: number, clearCache: boolean = false) {
    // âœ… Add timestamp to URL to bust browser cache
    const timestamp = Date.now();
    
    // âœ… Build URL with clearCache parameter to force backend to bypass its memory cache
    let url = `/itineraries/hotel_room_details/${quoteId}?_ts=${timestamp}`;
    if (itineraryRouteId) {
      url += `&itineraryRouteId=${itineraryRouteId}`;
    }
    if (clearCache) {
      url += `&clearCache=true`; // âœ… Tell backend to clear its memory cache
    }
    
    // âœ… Force bypass browser cache with cache-busting headers and no-store cache policy
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

  ...itineraryRouteActions,

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
    selected_hotel_route_ids?: number[];
    external_stay_route_ids?: number[];
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
    // âœ… NEW: Multi-provider hotel bookings (TBO, ResAvenue, HOBSE, etc.)
    hotel_bookings?: Array<{
      routeId: number;
      provider: string; // "TBO" | "ResAvenue" | "HOBSE"
      hotelCode: string;
      hotelName?: string;
      bookingCode: string;
      searchReference?: string;
      roomId?: string;
      rateId?: string;
      mealPlan?: string;
      roomType: string;
      checkInDate: string;
      checkOutDate: string;
      numberOfRooms: number;
      guestNationality: string;
      netAmount: number;
      searchInitiatedAt?: string;
      multiNightBooking?: boolean;
      stayKey?: string;
      routeIds?: number[];
      nights?: number;
      nightlyRates?: Array<{
        date: string;
        amountAfterTax: number;
        baseAmount?: number;
        extraAdultCount?: number;
        extraChildCount?: number;
        extraAdultRate?: number;
        extraChildRate?: number;
      }>;
      totalAmountAfterTax?: number;
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
      prebookContext?: any;
    }>;
    // âœ… NEW: Primary guest fallback (used by backend if lead passenger missing)
    primaryGuest?: {
      salutation: string;
      name: string;
      phone: string;
      email?: string;
    };
    endUserIp?: string;
    confirmedHotelDetails?: {
      quoteId?: string;
      planId?: number;
      hotelRatesVisible?: boolean;
      showHotelMargins?: boolean;
      hotelTabs?: any[];
      hotels?: any[];
      hotelAvailability?: any;
    };
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
      hotelName?: string;
      bookingCode: string;
      searchReference?: string;
      roomId?: string;
      rateId?: string;
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

  async getConfirmedItineraries(params: ConfirmedItineraryListParams) {
    return getConfirmedItineraries(params);
  },

  async getConfirmedItineraryDetails(id: string) {
    return getConfirmedItineraryDetails(id);
  },

  async getConfirmedGuideAssignments(confirmedId: number) {
    return getConfirmedGuideAssignments(confirmedId);
  },

  async cancelConfirmedGuideSlot(
    confirmedId: number,
    data: {
      routeGuideId: number;
      guideSlotCostDetailsId: number;
      itineraryRouteId?: number;
      cancellationPercentage?: number;
      defectType?: string;
      reason?: string;
    },
  ) {
    return cancelConfirmedGuideSlot(confirmedId, data);
  },

  async getCancelledItineraries(params: CancelledItineraryListParams) {
    return getCancelledItineraries(params);
  },

  async getAccountsItineraries(params: AccountsItineraryListParams) {
    return getAccountsItineraries(params);
  },

  async getConfirmedAgents() {
    return getConfirmedAgents();
  },

  async getConfirmedLocations() {
    return getConfirmedLocations();
  },

  async getLatestAgents() {
    return getLatestAgents();
  },

  async getLatestLocations() {
    return getLatestLocations();
  },

  async getVoucherDetails(id: number) {
    return getVoucherDetails(id);
  },

  async downloadVoucherPdf(id: number) {
    return downloadVoucherPdf(id);
  },

  async downloadHotelVoucherPdf(id: number) {
    return downloadHotelVoucherPdf(id);
  },

  async downloadVehicleVoucherPdf(id: number) {
    return downloadVehicleVoucherPdf(id);
  },

  async getPluckCardData(id: number) {
    return getPluckCardData(id);
  },

  async downloadPluckCardPdf(id: number) {
    return downloadPluckCardPdf(id);
  },

  async getPluckCardDataByConfirmedId(confirmedId: number) {
    return getPluckCardDataByConfirmedId(confirmedId);
  },

  async getInvoiceData(id: number) {
    return getInvoiceData(id);
  },

  async downloadInvoicePdf(id: number, type: "tax" | "proforma" = "tax") {
    return downloadInvoicePdf(id, type);
  },

  // Incidental Expenses
  async getIncidentalAvailableComponents(itineraryPlanId: number) {
    return getIncidentalAvailableComponents(itineraryPlanId);
  },

  async getIncidentalAvailableMargin(itineraryPlanId: number, componentType: number, componentId?: number) {
    return getIncidentalAvailableMargin(itineraryPlanId, componentType, componentId);
  },

  async addIncidentalExpense(data: {
    itineraryPlanId: number;
    componentType: number;
    componentId: number;
    amount: number;
    reason: string;
    createdBy: number;
  }) {
    return addIncidentalExpense(data);
  },

  async getIncidentalHistory(itineraryPlanId: number) {
    return getIncidentalHistory(itineraryPlanId);
  },

  async deleteIncidentalHistory(id: number) {
    return deleteIncidentalHistory(id);
  },

  // Real-time hotel search
  async searchHotels(searchParams: HotelSearchParams) {
    return searchHotels(searchParams);
  },

  // Get detailed information for a specific hotel (TBO API)
  async getHotelInfo(hotelCode: string) {
    return getHotelInfo(hotelCode);
  },

  // Get room availability for specific hotel
  async getRoomAvailability(
    hotelCode: string,
    checkInDate: string,
    checkOutDate: string,
  ) {
    return getRoomAvailability(hotelCode, checkInDate, checkOutDate);
  },
};

