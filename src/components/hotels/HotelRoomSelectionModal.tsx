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

  all_meal_plan?: number;
  breakfast_meal_plan?: number;
  lunch_meal_plan?: number;
  dinner_meal_plan?: number;

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
  onSuccess?: () => void;
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

      const response = await api(`itineraries/hotel-rooms/categories?${params}`, {
        method: 'GET',
      });

      setRooms(response.rooms || []);
      setPreferredRoomCount(response.preferred_room_count || 1);
    } catch (error) {
      console.error('Failed to fetch room categories:', error);
      toast.error('Failed to load room categories');
    } finally {
      setLoading(false);
    }
  };

  const handleRoomTypeChange = async (roomIndex: number, newRoomTypeId: string) => {
    try {
      setUpdating(true);
      const room = rooms[roomIndex];
      
     const payload = {
  itinerary_plan_hotel_room_details_ID:
    room.itinerary_plan_hotel_room_details_ID || 0,
  itinerary_plan_hotel_details_ID,
  itinerary_plan_id,
  itinerary_route_id,
  hotel_id,
  group_type,
  room_type_id: Number(newRoomTypeId),
  room_qty: room.room_qty || 1,

  // Preserve existing meal plan while only changing room type.
  all_meal_plan: Number(room.all_meal_plan ?? 0),
  breakfast_meal_plan: Number(room.breakfast_meal_plan ?? 0),
  lunch_meal_plan: Number(room.lunch_meal_plan ?? 0),
  dinner_meal_plan: Number(room.dinner_meal_plan ?? 0),
};

      await api('itineraries/hotel-rooms/update-category', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      // Update local state
      const updatedRooms = [...rooms];
      const selectedRoomType = room.available_room_types.find(
        (rt) => rt.room_type_id === Number(newRoomTypeId)
      );
      updatedRooms[roomIndex] = {
        ...room,
        room_type_id: Number(newRoomTypeId),
        room_type_title: selectedRoomType?.room_type_title || '',
      };
      setRooms(updatedRooms);

      toast.success(`Room #${room.room_number} category updated`);
    } catch (error) {
      console.error('Failed to update room category:', error);
      toast.error('Failed to update room category');
    } finally {
      setUpdating(false);
    }
  };

  const handleClose = () => {
    onOpenChange(false);
    if (onSuccess) {
      onSuccess();
    }
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
                    value={room.room_type_id?.toString() || ''}
                    onValueChange={(value) => handleRoomTypeChange(index, value)}
                    disabled={updating}
                  >
                    <SelectTrigger className="w-full bg-white">
                      <SelectValue placeholder="Select room category" />
                    </SelectTrigger>
                    <SelectContent>
                      {room.available_room_types.map((roomType) => (
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
        </div>
      </DialogContent>
    </Dialog>
  );
}
