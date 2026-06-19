// Types for Itinerary View/Display

export interface ViaRouteItem {
  itinerary_via_location_ID: number;
  itinerary_via_location_name: string;
}

export interface ItineraryRoute {
  itinerary_route_ID: number;
  location_id: number;
  location_name: string;
  next_visiting_location: string;
  itinerary_route_date: string;
  no_of_days: number;
  no_of_km?: string;
  direct_to_next_visiting_place: number;
  via_route?: string;
  via_routes?: ViaRouteItem[];
  route_start_time: string;
  route_end_time: string;
  location_description?: string;
}

export interface ItineraryPlan {
  itinerary_plan_ID: number;
  itinerary_quote_ID: string;
  arrival_location: string;
  departure_location: string;
  agent_id: number;
  trip_start_date_and_time: string;
  trip_end_date_and_time: string;
  arrival_type: number;
  departure_type: number;
  expecting_budget: number;
  itinerary_type: number;
  entry_ticket_required: number;
  no_of_routes: number;
  no_of_days: number;
  no_of_nights: number;
  total_adult: number;
  total_children: number;
  total_infants: number;
  nationality: number;
  itinerary_preference: number;
  preferred_room_count?: number;
  total_extra_bed?: number;
  total_child_with_bed?: number;
  total_child_without_bed?: number;
  guide_for_itinerary: number;
  food_type: number;
  special_instructions?: string;
  pick_up_date_and_time?: string;
}

export interface GuideDetails {
  routeGuideId: number;
  planId: number;
  routeId?: number | null;
  routeDate?: string | null;
  guideType: number; // 1 = Full itinerary, 2 = Day-wise
  guideId: number;
  guideName: string;
  guideLanguage: string;
  guideLanguageIds: number[];
  guideLanguageLabels: string[];
  guideSlot: string;
  guideSlotIds: number[];
  guideSlotLabels: string[];
  guideCost: number;
}

export interface HotspotDetails {
  route_hotspot_ID: number;
  hotspot_ID: number;
  hotspot_name: string;
  item_type: number;
  hotspot_amount?: number;
  stay_time?: string;
}

export interface VehicleDetails {
  itinerary_plan_vendor_eligible_ID: number;
  vendor_id: number;
  vehicle_type_id: number;
  total_vehicle_qty: number;
  vendor_margin_amount: number;
}

export interface ItineraryFullDetails {
  plan: ItineraryPlan;
  routes: ItineraryRoute[];
  guides?: GuideDetails[];
  hotspots?: HotspotDetails[];
  vehicles?: VehicleDetails[];
}
