import { api, API_BASE_URL, getToken, isImpersonationBrowserSession } from "@/lib/api";

export type TboMasterReview = { rating?: number; title?: string; comment?: string; author?: string };
export type TboMasterGalleryImage = { id: number; hotelCode: string; fileName: string; url: string; isPrimary: boolean; sortOrder: number; source: string; sourceUrl?: string | null };
export type TboMasterRoomGalleryImage = { id: number; hotelCode: string; roomRefCode: string; roomTitle: string; fileName: string; url: string };

export type TboMasterHotel = {
  id: number;
  hotelCode: string;
  cityCode: string;
  cityId?: number | null;
  name: string;
  city?: string | null;
  address?: string | null;
  rating?: number | null;
  categoryId?: number | null;
  imageUrl?: string | null;
  hotelEmail?: string | null;
  hotelMobile?: string | null;
  images: TboMasterGalleryImage[];
  primaryImageUrl?: string | null;
  roomGallery: TboMasterRoomGalleryImage[];
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

const toDownloadFileNamePart = (value: unknown) => String(value ?? "")
  .trim()
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, "-")
  .replace(/^-+|-+$/g, "")
  .slice(0, 60);

type ListResponse = { page: number; limit: number; total: number; items: TboMasterHotel[] };

export async function listTboMasterHotels(params: { page: number; limit: number; search?: string; priority?: string; region?: string }) {
  const query = new URLSearchParams({ page: String(params.page), limit: String(params.limit) });
  if (params.search?.trim()) query.set("search", params.search.trim());
  if (params.priority) query.set("priority", params.priority);
  if (params.region) query.set("region", params.region);
  return api(`/hotels/tbo-master?${query.toString()}`) as Promise<ListResponse>;
}

export async function downloadTboMasterHotels(params: { search?: string; priority?: string; region?: string } = {}) {
  const headers: Record<string, string> = {};
  const token = isImpersonationBrowserSession() ? "" : getToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  const query = new URLSearchParams();
  if (params.search?.trim()) query.set("search", params.search.trim());
  if (params.priority) query.set("priority", params.priority);
  if (params.region) query.set("region", params.region);
  const queryString = query.toString();
  const response = await fetch(`${API_BASE_URL}/hotels/tbo-master/bulk/export${queryString ? `?${queryString}` : ""}`, {
    headers,
    ...(isImpersonationBrowserSession() ? { credentials: "include" as RequestCredentials } : {}),
  });
  if (!response.ok) throw new Error((await response.text().catch(() => "")) || "Unable to download VSR master hotels");
  const blob = await response.blob();
  const disposition = response.headers.get("content-disposition") || "";
  const filterParts = [
    params.region,
    params.priority === "1" ? "priority-only" : params.priority === "0" ? "non-priority" : "",
    params.search ? `search-${params.search}` : "",
  ].map(toDownloadFileNamePart).filter(Boolean);
  const filterSuffix = filterParts.length ? `-${filterParts.join("-")}` : "";
  const fileName = disposition.match(/filename="?([^";]+)"?/i)?.[1] || `vsr-master-hotels${filterSuffix}-${new Date().toISOString().slice(0, 10)}.xlsx`;
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
  return { fileName };
}

export async function importTboMasterHotels(file: File) {
  const body = new FormData();
  body.append("file", file);
  return api("/hotels/tbo-master/bulk/import", { method: "POST", body }) as Promise<{ success: boolean; updated: number }>;
}

export async function getTboMasterHotel(code: string) {
  return api(`/hotels/tbo-master/${encodeURIComponent(code)}`) as Promise<TboMasterHotel>;
}

export type UpdateTboMasterHotelPayload = Partial<Pick<TboMasterHotel, "name" | "address" | "city" | "cityId" | "rating" | "categoryId" | "imageUrl" | "hotelEmail" | "hotelMobile" | "description" | "checkInTime" | "checkOutTime" | "facilities" | "amenities" | "reviews" | "latitude" | "longitude" | "status">>;

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

export async function uploadTboMasterGallery(code: string, files: File[]) {
  const body = new FormData();
  files.forEach((file) => body.append("images", file));
  return api(`/hotels/tbo-master/${encodeURIComponent(code)}/gallery`, { method: "POST", body }) as Promise<TboMasterGalleryImage[]>;
}

export async function setTboMasterGalleryPrimary(code: string, imageId: number) {
  return api(`/hotels/tbo-master/${encodeURIComponent(code)}/gallery/${imageId}/primary`, { method: "PATCH" }) as Promise<TboMasterGalleryImage[]>;
}

export async function deleteTboMasterGalleryImage(code: string, imageId: number) {
  return api(`/hotels/tbo-master/${encodeURIComponent(code)}/gallery/${imageId}`, { method: "DELETE" }) as Promise<TboMasterGalleryImage[]>;
}

export async function uploadTboMasterRoomGallery(code: string, roomRefCode: string, roomTitle: string, files: File[]) {
  const body = new FormData();
  body.append("roomRefCode", roomRefCode);
  body.append("roomTitle", roomTitle);
  files.forEach((file) => body.append("images", file));
  return api(`/hotels/tbo-master/${encodeURIComponent(code)}/room-gallery`, { method: "POST", body }) as Promise<TboMasterRoomGalleryImage[]>;
}
