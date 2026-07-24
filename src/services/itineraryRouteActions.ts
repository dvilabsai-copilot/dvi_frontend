import { api } from "@/lib/api";
import type {
  HotspotAnchorPayload,
  ManualFitHereAutoPreviewPayload,
  ManualFitHerePreviewPayload,
  MatrixPreferredSlotPayload,
} from "./itinerary";

export const itineraryRouteActions = {
  async deleteHotspot(planId: number, routeId: number, hotspotId: number) {
    return api(`itineraries/hotspot/${planId}/${routeId}/${hotspotId}`, { method: "DELETE" });
  },

  async rebuildRoute(planId: number, routeId: number) {
    return api(`itineraries/${planId}/route/${routeId}/rebuild`, { method: "POST" });
  },

  async rebuildRouteHotspots(planId: number, routeId: number) {
    return api(`itineraries/${planId}/routes/${routeId}/rebuild-hotspots`, { method: "POST" });
  },

  async getAvailableActivities(hotspotId: number, planId?: number, routeId?: number) {
    const params = new URLSearchParams();
    if (planId) params.set("planId", String(planId));
    if (routeId) params.set("routeId", String(routeId));
    const query = params.toString();
    return api(`itineraries/activities/available/${hotspotId}${query ? `?${query}` : ""}`, { method: "GET" });
  },

  async previewActivityAddition(data: {
    planId: number;
    routeId: number;
    routeHotspotId: number;
    hotspotId: number;
    activityId: number;
  }) {
    return api("itineraries/activities/preview", { method: "POST", body: data });
  },

  async previewActivityForAllHotspots(data: { planId: number; routeId: number; activityId: number }) {
    return api("itineraries/activities/preview-all-hotspots", { method: "POST", body: data });
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
    return api(`itineraries/${planId}/activity/smart-preview`, { method: "POST", body: data });
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
    return api(`itineraries/${planId}/activity/smart-insert`, { method: "POST", body: data });
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
    return api("itineraries/activities/add", { method: "POST", body: data });
  },

  async deleteActivity(planId: number, routeId: number, activityId: number) {
    return api(`itineraries/activities/${planId}/${routeId}/${activityId}`, { method: "DELETE" });
  },

  async getAvailableHotspots(routeId: number) {
    return api(`itineraries/hotspots/available/${routeId}`, { method: "GET" });
  },

  async getAvailableHotspotsForAnchor(data: {
    planId: number;
    routeId: number;
    anchorType: "after_travel" | "BETWEEN_ROWS";
    anchorIndex: number;
  }) {
    return api("itineraries/hotspots/available-for-anchor", { method: "POST", body: data });
  },

  async addHotspot(planId: number, routeId: number, hotspotId: number) {
    return api("itineraries/hotspots/add", { method: "POST", body: { planId, routeId, hotspotId } });
  },

  async previewAddHotspot(
    planId: number,
    routeId: number,
    hotspotId: number,
    anchor?: HotspotAnchorPayload,
    options?: { allowTopPriorityRemoval?: boolean; selectedHotspotIds?: number[] },
  ) {
    return api(`itineraries/${planId}/manual-hotspot/preview`, {
      method: "POST",
      body: {
        routeId,
        hotspotId,
        anchorType: anchor?.anchorType,
        anchorIndex: anchor?.anchorIndex,
        allowTopPriorityRemoval: options?.allowTopPriorityRemoval === true,
        selectedHotspotIds: Array.isArray(options?.selectedHotspotIds) ? options.selectedHotspotIds : undefined,
      },
    });
  },

  async addManualHotspot(
    planId: number,
    routeId: number,
    hotspotId: number,
    anchor?: HotspotAnchorPayload,
    options?: { allowTopPriorityRemoval?: boolean },
  ) {
    return api(`itineraries/${planId}/manual-hotspot`, {
      method: "POST",
      body: {
        routeId,
        hotspotId,
        anchorType: anchor?.anchorType,
        anchorIndex: anchor?.anchorIndex,
        allowTopPriorityRemoval: options?.allowTopPriorityRemoval === true,
      },
    });
  },

  async previewManualHotspotFitHere(planId: number, payload: ManualFitHerePreviewPayload) {
    return api(`itineraries/${planId}/manual-hotspot/fit-preview`, { method: "POST", body: payload });
  },

  async previewManualHotspotAutoFitHere(planId: number, payload: ManualFitHereAutoPreviewPayload) {
    return api(`itineraries/${planId}/manual-hotspot/auto-fit-preview`, { method: "POST", body: payload });
  },

  async confirmManualHotspotFitHere(
    planId: number,
    payload: {
      attemptId: string;
      allowTimingRisk?: boolean;
      allowPriorityRemoval?: boolean;
      allowClosedHotspotConflict?: boolean;
      acknowledgedRemovedHotspotIds?: number[];
    },
  ) {
    return api(`itineraries/${planId}/manual-hotspot/fit-confirm`, { method: "POST", body: payload });
  },

  async applyManualHotspots(
    planId: number,
    routeId: number,
    hotspotIds: number[],
    anchor?: HotspotAnchorPayload,
    options?: {
      allowTopPriorityRemoval?: boolean;
      forceConflictInsertion?: boolean;
      matrixPreferredSlot?: MatrixPreferredSlotPayload;
      manualTimingPolicy?: unknown;
    },
  ) {
    return api(`itineraries/${planId}/manual-hotspots/apply`, {
      method: "POST",
      body: {
        routeId,
        hotspotIds,
        anchorType: anchor?.anchorType,
        anchorIndex: anchor?.anchorIndex,
        allowTopPriorityRemoval: options?.allowTopPriorityRemoval === true,
        forceConflictInsertion: options?.forceConflictInsertion === true,
        matrixPreferredSlot: options?.matrixPreferredSlot,
        manualTimingPolicy: options?.manualTimingPolicy,
      },
    });
  },

  async buildMissingManualHotspotMatrix(planId: number, routeId: number, candidateHotspotId: number) {
    return api(`itineraries/${planId}/routes/${routeId}/manual-hotspots/${candidateHotspotId}/build-matrix`, { method: "POST" });
  },

  async removeManualHotspot(planId: number, hotspotId: number) {
    return api(`itineraries/${planId}/manual-hotspot/${hotspotId}`, { method: "DELETE" });
  },

  async updateRouteTimes(
    planId: number,
    routeId: number,
    startTime: string,
    endTime: string,
    options?: {
      previousDayBillingDecisionProvided?: boolean;
      previousDayBillingConfirmed?: boolean;
      transportEarlyArrivalOption?: "HOTEL_REST" | "REFRESHMENT_BEFORE_SIGHTSEEING" | null;
      transportEarlyArrivalHotelName?: string | null;
      transportEarlyArrivalRestMinutes?: number | null;
      changeType?: "ROUTE_START" | "ROUTE_END" | "FINAL_DAY_DEPARTURE";
    },
  ) {
    return api(`itineraries/${planId}/route/${routeId}/times`, {
      method: "PATCH",
      body: {
        startTime,
        endTime,
        previousDayBillingDecisionProvided: options?.previousDayBillingDecisionProvided,
        previousDayBillingConfirmed: options?.previousDayBillingConfirmed,
        transportEarlyArrivalOption: options?.transportEarlyArrivalOption,
        transportEarlyArrivalHotelName: options?.transportEarlyArrivalHotelName,
        transportEarlyArrivalRestMinutes: options?.transportEarlyArrivalRestMinutes,
        changeType: options?.changeType,
      },
    });
  },

  async getAvailableHotels(routeId: number) {
    return api(`itineraries/hotels/available/${routeId}`, { method: "GET" });
  },

  async selectHotel(
    planId: number,
    routeId: number,
    hotelId: number,
    roomTypeId: number,
    mealPlan?: { all?: boolean; breakfast?: boolean; lunch?: boolean; dinner?: boolean },
    groupType?: number,
    selection?: {
      canonicalHotelId?: number | null;
      rateOptionId?: string;
      provider?: string;
      roomId?: string | number;
      roomCount?: number;
    },
  ) {
    return api("itineraries/hotels/select", { method: "POST", body: { planId, routeId, hotelId, roomTypeId, mealPlan, groupType, ...selection } });
  },

  async selectVehicleVendor(planId: number, vehicleTypeId: number, vendorEligibleId: number) {
    return api("itineraries/vehicles/select-vendor", { method: "POST", body: { planId, vehicleTypeId, vendorEligibleId } });
  },

  async selectVehicleSlab(planId: number, vehicleTypeId: number, vendorEligibleId: number, timeLimitId: number) {
    return api("itineraries/vehicles/select-slab", { method: "POST", body: { planId, vehicleTypeId, vendorEligibleId, timeLimitId } });
  },

  async autoSelectVehicleSlabs(planId: number, vehicleTypeId?: number) {
    return api("itineraries/vehicles/auto-select-slabs", { method: "POST", body: { planId, vehicleTypeId } });
  },
};
