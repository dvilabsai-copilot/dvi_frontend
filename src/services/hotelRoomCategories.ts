import { api } from '@/lib/api';

export interface RoomCategory {
  room_number: number;
  itinerary_plan_hotel_room_details_ID?: number;
  room_type_id?: number;
  room_type_title?: string;
  room_qty: number;
  available_room_types: Array<{
    room_type_id: number;
    room_type_title: string;
    price_per_night?: number;
  }>;
}

type RoomCategoryApiResponse = {
  rooms?: unknown;
  data?: { rooms?: unknown };
  preferred_room_count?: number;
  preferredRoomCount?: number;
};

function normalizeRoomCategoryResponse(response: RoomCategoryApiResponse): {
  rooms: RoomCategory[];
  preferredRoomCount: number;
} {
  const rawRooms = Array.isArray(response?.rooms)
    ? response.rooms
    : Array.isArray(response?.data?.rooms)
      ? response.data.rooms
      : [];

  const rooms = rawRooms.map((rawRoom: any): RoomCategory => ({
    room_number: Number(rawRoom?.room_number ?? rawRoom?.roomNumber ?? 0),
    itinerary_plan_hotel_room_details_ID: Number(
      rawRoom?.itinerary_plan_hotel_room_details_ID ??
      rawRoom?.itineraryPlanHotelRoomDetailsId ??
      0,
    ) || undefined,
    room_type_id: Number(rawRoom?.room_type_id ?? rawRoom?.roomTypeId ?? 0) || undefined,
    room_type_title: String(
      rawRoom?.room_type_title ?? rawRoom?.roomTypeTitle ?? '',
    ).trim() || undefined,
    room_qty: Number(rawRoom?.room_qty ?? rawRoom?.roomQty ?? 1) || 1,
    available_room_types: (Array.isArray(rawRoom?.available_room_types)
      ? rawRoom.available_room_types
      : Array.isArray(rawRoom?.availableRoomTypes)
        ? rawRoom.availableRoomTypes
        : []
    ).map((rawType: any) => ({
      room_type_id: Number(rawType?.room_type_id ?? rawType?.roomTypeId ?? 0),
      room_type_title: String(
        rawType?.room_type_title ?? rawType?.roomTypeTitle ?? '',
      ).trim(),
    })).filter((roomType: any) => roomType.room_type_id > 0 && roomType.room_type_title),
  }));

  return {
    rooms: rooms.filter((room) => room.room_number > 0),
    preferredRoomCount: Number(
      response?.preferred_room_count ?? response?.preferredRoomCount ?? 1,
    ) || 1,
  };
}

type RoomCategoryQuery = {
  itinerary_plan_hotel_details_ID: number;
  itinerary_plan_id: number;
  itinerary_route_id: number;
  hotel_id: number;
  group_type: number;
  hotel_code?: string;
  provider?: string;
  hotel_name?: string;
};

export async function getHotelRoomCategories(query: RoomCategoryQuery, signal?: AbortSignal) {
  const params = new URLSearchParams({
    itinerary_plan_hotel_details_ID: String(query.itinerary_plan_hotel_details_ID),
    itinerary_plan_id: String(query.itinerary_plan_id),
    itinerary_route_id: String(query.itinerary_route_id),
    hotel_id: String(query.hotel_id),
    group_type: String(query.group_type),
  });
  if (query.hotel_code) params.set('hotel_code', query.hotel_code);
  if (query.provider) params.set('provider', query.provider);
  if (query.hotel_name) params.set('hotel_name', query.hotel_name);
  const response = await api(`itineraries/hotel-rooms/categories?${params}`, {
    method: 'GET',
    ...(signal ? { signal, redirectOnForbidden: false } : {}),
  });
  return normalizeRoomCategoryResponse(response as RoomCategoryApiResponse);
}
