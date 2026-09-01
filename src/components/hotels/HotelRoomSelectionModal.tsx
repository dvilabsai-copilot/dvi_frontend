import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2, Bed, X } from 'lucide-react';
import { api } from '@/lib/api';
import { toast } from 'sonner';

interface RoomCategory {
  room_number: number;
  itinerary_plan_hotel_room_details_ID?: number;
  room_type_id?: number;
  room_type_title?: string;
  room_qty: number;
  available_room_types: Array<{
    room_type_id: number;
    room_type_title: string;
  }>;
}

interface HotelRoomSelectionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  itinerary_plan_hotel_details_ID: number;
  itinerary_plan_id: number;
  itinerary_route_id: number;
  hotel_id: number;
  group_type: number;
  hotel_name: string;
  hotel_code?: string;
  provider?: string;
  selected_room_type_title?: string;
  onSuccess?: (payload?: {
    itinerary_route_id: number;
    hotel_id: number;
    group_type: number;
    hotel_name: string;
    preferred_room_count: number;
    rooms: Array<{
      room_number: number;
      itinerary_plan_hotel_room_details_ID?: number;
      room_type_id?: number;
      room_type_title?: string;
      room_qty: number;
    }>;
  }) => void | Promise<void>;
}

export function HotelRoomSelectionModal({
  open,
  onOpenChange,
  itinerary_plan_hotel_details_ID,
  itinerary_plan_id,
  itinerary_route_id,
  hotel_id,
  group_type,
  hotel_name,
  hotel_code,
  provider,
  selected_room_type_title,
  onSuccess,
}: HotelRoomSelectionModalProps) {
  const [loading, setLoading] = useState(false);
  const [rooms, setRooms] = useState<RoomCategory[]>([]);
  const [preferredRoomCount, setPreferredRoomCount] = useState(1);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    if (open) {
      fetchRoomCategories();
    }
  }, [open]);

  const fetchRoomCategories = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        itinerary_plan_hotel_details_ID: String(itinerary_plan_hotel_details_ID),
        itinerary_plan_id: String(itinerary_plan_id),
        itinerary_route_id: String(itinerary_route_id),
        hotel_id: String(hotel_id),
        group_type: String(group_type),
      });
      if (hotel_code) params.set('hotel_code', hotel_code);
      if (provider) params.set('provider', provider);
      if (hotel_name) params.set('hotel_name', hotel_name);

      const response = await api(`itineraries/hotel-rooms/categories?${params}`, {
        method: 'GET',
      });

      const normalizeRoomTitle = (value: unknown) => String(value || '')
        .trim()
        .toLocaleLowerCase()
        .replace(/\s+/g, ' ');
      const hydratedRooms = (response.rooms || []).map((room: RoomCategory) => {
        // When the itinerary has multiple rooms, the selected hotel room
        // category is the initial choice for every blank room row. Preserve an
        // explicitly persisted per-room category when one exists.
        const persistedTitle = room.room_type_title || selected_room_type_title || '';
        const uniqueAvailableTypes = getUniqueRoomTypes(room);
        const persistedType = (room.available_room_types || []).find(
          (roomType) => Number(roomType.room_type_id) === Number(room.room_type_id || 0),
        );
        if (Number(room.room_type_id || 0) > 0) {
        return {
            ...(persistedTitle ? room : { ...room, room_type_title: persistedType?.room_type_title || '' }),
            room_qty: 1,
          };
        }
        const fallbackTitle = !persistedTitle && uniqueAvailableTypes.length === 1
          ? uniqueAvailableTypes[0].room_type_title
          : '';
        if (!persistedTitle && !fallbackTitle) return room;
        const titleToMatch = persistedTitle || fallbackTitle;
        const selectedTitle = normalizeRoomTitle(titleToMatch);
        const matchingType = (room.available_room_types || []).find((roomType) => {
          const availableTitle = normalizeRoomTitle(roomType.room_type_title);
          return availableTitle === selectedTitle ||
            availableTitle.includes(selectedTitle) ||
            selectedTitle.includes(availableTitle);
        });
        return matchingType
          ? { ...room, room_type_id: matchingType.room_type_id, room_type_title: matchingType.room_type_title, room_qty: 1 }
          : { ...room, room_qty: 1 };
      });
      setRooms(hydratedRooms);
      setPreferredRoomCount(response.preferred_room_count || 1);
    } catch (error) {
      console.error('Failed to fetch room categories:', error);
      toast.error('Failed to load room categories');
    } finally {
      setLoading(false);
    }
  };

  const getUniqueRoomTypes = (room: RoomCategory) => {
    const selectedId = Number(room.room_type_id || 0);
    const unique = new Map<string, RoomCategory['available_room_types'][number]>();
    for (const roomType of room.available_room_types) {
      const title = String(roomType.room_type_title || '').trim();
      const key = title.toLocaleLowerCase().replace(/\s+/g, ' ');
      if (!key) continue;
      // Keep the currently selected identity when duplicate labels exist.
      if (!unique.has(key) || Number(roomType.room_type_id) === selectedId) {
        unique.set(key, roomType);
      }
    }
    return Array.from(unique.values());
  };

  const handleRoomTypeChange = (roomIndex: number, newRoomTypeId: string) => {
    const updatedRooms = [...rooms];
      updatedRooms[roomIndex] = {
        ...updatedRooms[roomIndex],
        room_type_id: Number(newRoomTypeId),
        room_qty: 1,
      room_type_title: updatedRooms[roomIndex].available_room_types.find(
        (roomType) => Number(roomType.room_type_id) === Number(newRoomTypeId),
      )?.room_type_title || '',
    };
    setRooms(updatedRooms);
  };

  const handleConfirm = async () => {
    try {
      setUpdating(true);
      const selectedRooms = rooms.filter((room) => Number(room.room_type_id || 0) > 0);
      if (selectedRooms.length !== rooms.length) {
        toast.error('Select a room category for every room before confirming');
        return;
      }

      const updatedRooms = selectedRooms;

      // Persist only after the user confirms. The API remains the source of
      // truth for room rates, totals, and the selected snapshot.
      await api('itineraries/hotel-rooms/update-categories', {
        method: 'POST',
        body: JSON.stringify({
          itinerary_plan_hotel_details_ID,
          itinerary_plan_id,
          itinerary_route_id,
          hotel_id,
          group_type,
          ...(hotel_code ? { hotel_code } : {}),
          ...(provider ? { provider } : {}),
          ...(hotel_name ? { hotel_name } : {}),
          rooms: selectedRooms.map((room) => ({
            itinerary_plan_hotel_room_details_ID: room.itinerary_plan_hotel_room_details_ID || 0,
            room_number: room.room_number,
            room_type_id: Number(room.room_type_id),
            room_qty: room.room_qty || 1,
          })),
        }),
      });

      await onSuccess?.({
        itinerary_route_id,
        hotel_id,
        group_type,
        hotel_name,
        preferred_room_count: preferredRoomCount,
        rooms: updatedRooms.map((updatedRoom) => ({
          room_number: updatedRoom.room_number,
          itinerary_plan_hotel_room_details_ID: updatedRoom.itinerary_plan_hotel_room_details_ID,
          room_type_id: updatedRoom.room_type_id,
          room_type_title: updatedRoom.room_type_title,
          room_qty: updatedRoom.room_qty,
        })),
      });

      onOpenChange(false);
      toast.success('Room categories updated');
    } catch (error) {
      console.error('Failed to update room category:', error);
      toast.error('Failed to update room category');
    } finally {
      setUpdating(false);
    }
  };

  const handleClose = () => {
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="text-xl font-bold text-[#4a4260]">
              Choose Room Category
            </DialogTitle>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleClose}
              className="h-8 w-8 rounded-full"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          <p className="text-sm text-[#6c6c6c] mt-1">
            {hotel_name}
          </p>
          <p className="text-xs text-[#6c6c6c]">
            Select room category for each room
          </p>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-[#d546ab]" />
          </div>
        ) : (
          <div className="space-y-4 py-4">
            {rooms.map((room, index) => (
              <div
                key={room.room_number}
                className="flex items-center gap-4 p-4 rounded-lg border border-[#e5d9f2] hover:border-[#d546ab] transition-colors bg-gradient-to-r from-[#faf5ff] to-[#f3e8ff]"
              >
                {/* Room Icon and Number */}
                <div className="flex items-center gap-2 min-w-[120px]">
                  <div className="flex items-center justify-center w-10 h-10 rounded-full bg-[#d546ab]/10">
                    <Bed className="h-5 w-5 text-[#d546ab]" />
                  </div>
                  <span className="text-sm font-bold text-[#4a4260]">
                    Room #{room.room_number}
                  </span>
                </div>

                {/* Room Quantity */}
                <div className="flex items-center min-w-[60px]">
                  <span className="text-sm font-semibold text-[#6c6c6c]">
                    {room.room_qty} ×
                  </span>
                </div>

                {/* Room Type Selector */}
                <div className="flex-1">
                  <Select
                    value={room.room_type_id && room.room_type_id > 0 ? room.room_type_id.toString() : ''}
                    onValueChange={(value) => handleRoomTypeChange(index, value)}
                    disabled={updating}
                  >
                    <SelectTrigger className="w-full bg-white">
                      <SelectValue placeholder="Select room category" />
                    </SelectTrigger>
                    <SelectContent>
                      {getUniqueRoomTypes(room).map((roomType) => (
                        <SelectItem
                          key={roomType.room_type_id}
                          value={roomType.room_type_id.toString()}
                        >
                          {roomType.room_type_title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            ))}

            {rooms.length === 0 && !loading && (
              <div className="text-center py-8 text-[#6c6c6c]">
                <p>No room categories available</p>
              </div>
            )}
          </div>
        )}

        <div className="flex justify-center gap-3 pt-4 border-t">
          <Button
            variant="outline"
            onClick={handleClose}
            className="rounded-full px-6"
          >
            Close
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={loading || updating || rooms.length === 0}
            className="rounded-full px-6 bg-[#6d35c4] hover:bg-[#5b2cac]"
          >
            {updating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Confirm
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
