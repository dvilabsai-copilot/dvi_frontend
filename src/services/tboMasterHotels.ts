import { api } from "@/lib/api";

export type TboMasterReview = { rating?: number; title?: string; comment?: string; author?: string };

export type TboMasterHotel = {
  id: number;
  hotelCode: string;
  cityCode: string;
  name: string;
  city?: string | null;
  address?: string | null;
  rating?: number | null;
  imageUrl?: string | null;
  description?: string | null;
  checkInTime?: string | null;
  checkOutTime?: string | null;
  facilities: string[];
  amenities: string[];
  reviews: TboMasterReview[];
  latitude?: number | null;
  longitude?: number | null;
  isPriority: boolean;
  status: number;
  updatedAt?: string;
};

type ListResponse = { page: number; limit: number; total: number; items: TboMasterHotel[] };

export async function listTboMasterHotels(params: { page: number; limit: number; search?: string; priority?: string }) {
  const query = new URLSearchParams({ page: String(params.page), limit: String(params.limit) });
  if (params.search?.trim()) query.set("search", params.search.trim());
  if (params.priority) query.set("priority", params.priority);
  return api(`/hotels/tbo-master?${query.toString()}`) as Promise<ListResponse>;
}

export async function getTboMasterHotel(code: string) {
  return api(`/hotels/tbo-master/${encodeURIComponent(code)}`) as Promise<TboMasterHotel>;
}

export type UpdateTboMasterHotelPayload = Partial<Pick<TboMasterHotel, "name" | "address" | "city" | "rating" | "imageUrl" | "description" | "checkInTime" | "checkOutTime" | "facilities" | "amenities" | "reviews" | "latitude" | "longitude" | "status">>;

export async function updateTboMasterHotel(code: string, payload: UpdateTboMasterHotelPayload) {
  return api(`/hotels/tbo-master/${encodeURIComponent(code)}`, { method: "PATCH", body: payload }) as Promise<TboMasterHotel>;
}

export async function setTboMasterPriority(code: string, isPriority: boolean) {
  return api(`/hotels/tbo-master/${encodeURIComponent(code)}/priority`, { method: "PATCH", body: { isPriority } }) as Promise<TboMasterHotel>;
}

export type TboPricePreviewRequest = { checkIn: string; checkOut: string; rooms: number; adults: number; children: number; mealPlanCode?: string };

export async function previewTboMasterPrice(code: string, payload: TboPricePreviewRequest) {
  return api(`/hotels/tbo-master/${encodeURIComponent(code)}/price-preview`, { method: "POST", body: payload }) as Promise<any>;
}
