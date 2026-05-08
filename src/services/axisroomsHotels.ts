import { api } from "@/lib/api";

export type AxisroomsHotelRow = {
  hotel_id: number;
  hotel_name: string;
  hotel_code: string;
  axisrooms_property_id: string;
  axisrooms_enabled: boolean;
  last_sync_at: string | null;
  inventory_updates: number;
  rate_updates: number;
  restriction_updates: number;
  total_updates: number;
};

export type AxisroomsHotelsListResponse = {
  page: number;
  limit: number;
  total: number;
  rows: AxisroomsHotelRow[];
};

export type AxisroomsPreviewResponse = {
  hotel_id: number;
  hotel_name: string;
  hotel_code: string;
  axisrooms_property_id: string;
  axisrooms_enabled: boolean;
  latest_inbound: { id: number; type: string; received_at: string } | null;
  summary: {
    rates_count: number;
    restrictions_count: number;
    inventory_count: number;
  };
  rates: Array<{
    id: number;
    room_id: number;
    room_name: string | null;
    rateplan_id: string;
    rateplan_name: string;
    start_date: string;
    end_date: string;
    occupancy_rates: Record<string, number> | null;
    received_at: string;
  }>;
  restrictions: Array<{
    id: number;
    room_id: string;
    room_name: string;
    rateplan_id: string;
    rateplan_name: string;
    start_date: string;
    end_date: string;
    type: string;
    value: string;
    received_at: string;
  }>;
  inventory: Array<{
    id: number;
    room_id: string;
    room_name: string;
    start_date: string;
    end_date: string;
    free: number;
    received_at: string;
  }>;
};

export async function listAxisroomsHotels(params: {
  search?: string;
  page?: number;
  limit?: number;
} = {}): Promise<AxisroomsHotelsListResponse> {
  const q = new URLSearchParams();
  if (params.search) q.set("search", params.search);
  q.set("page", String(params.page ?? 1));
  q.set("limit", String(params.limit ?? 10));
  return api(`/hotels/axisrooms?${q.toString()}`) as Promise<AxisroomsHotelsListResponse>;
}

export async function getAxisroomsHotelPreview(hotelId: number): Promise<AxisroomsPreviewResponse> {
  return api(`/hotels/axisrooms/${hotelId}/preview`) as Promise<AxisroomsPreviewResponse>;
}
