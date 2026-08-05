import type { ComponentProps } from "react";
import { HotelSearchModal } from "@/components/hotels/HotelSearchModal";
import { HotelRoomSelectionModal } from "@/components/hotels/HotelRoomSelectionModal";
import type { GuestDetails } from "./useQuotationState";
import { normalizeHotelStayDates } from "../utils/hotelStayDates.utils";

type SearchProps = ComponentProps<typeof HotelSearchModal>;
type RoomProps = ComponentProps<typeof HotelRoomSelectionModal>;

type HotelDialogOptions = {
  hotelSelectionModal: {
    open: boolean;
    cityCode?: string;
    cityName?: string;
    checkInDate?: string;
    checkOutDate?: string;
    routeDate?: string;
  };
  roomSelectionModal: Partial<RoomProps> | null;
  itinerary: {
    roomCount?: number;
    adults?: number;
    children?: number;
    infants?: number;
  } | null;
  guestDetails: GuestDetails;
  hotelSearchChildAges: string[];
  setHotelSearchChildAges: NonNullable<SearchProps["onChildAgesChange"]>;
  handleSelectHotelFromSearch: SearchProps["onSelectHotel"];
  isSelectingHotel: boolean;
  setHotelSelectionModal: (value: { open: boolean; planId: number | null; routeId: number | null; routeDate: string }) => void;
  setRoomSelectionModal: (value: Partial<RoomProps> | null) => void;
  onRoomSelectionSuccess: () => void;
};

export function useItineraryHotelDialogProps({
  hotelSelectionModal,
  roomSelectionModal,
  itinerary,
  guestDetails,
  hotelSearchChildAges,
  setHotelSearchChildAges,
  handleSelectHotelFromSearch,
  isSelectingHotel,
  setHotelSelectionModal,
  setRoomSelectionModal,
  onRoomSelectionSuccess,
}: HotelDialogOptions): { search: SearchProps; roomSelection: RoomProps | null } {
  const stayDates = normalizeHotelStayDates({
    checkInDate: hotelSelectionModal.checkInDate,
    checkOutDate: hotelSelectionModal.checkOutDate,
    fallbackDate: hotelSelectionModal.routeDate,
  });

  return {
    search: {
      open: hotelSelectionModal.open,
      onOpenChange: (open) => {
        if (!open) {
          setHotelSelectionModal({ open: false, planId: null, routeId: null, routeDate: "" });
          setHotelSearchChildAges([]);
        }
      },
      cityCode: hotelSelectionModal.cityCode || "",
      cityName: hotelSelectionModal.cityName || "",
      checkInDate: stayDates.checkInDate,
      checkOutDate: stayDates.checkOutDate,
      roomCount: Number(itinerary?.roomCount || 1),
      adultCount: Number(itinerary?.adults || 0),
      childCount: Number(itinerary?.children || 0),
      infantCount: Number(itinerary?.infants || 0),
      childAges: hotelSearchChildAges,
      guestNationality: guestDetails.nationality.toUpperCase(),
      onChildAgesChange: setHotelSearchChildAges,
      onSelectHotel: handleSelectHotelFromSearch,
      isSelectingHotel,
    },
    roomSelection: roomSelectionModal ? {
      open: Boolean(roomSelectionModal.open),
      onOpenChange: (open) => { if (!open) setRoomSelectionModal(null); },
      itinerary_plan_hotel_details_ID: Number(roomSelectionModal.itinerary_plan_hotel_details_ID || 0),
      itinerary_plan_id: Number(roomSelectionModal.itinerary_plan_id || 0),
      itinerary_route_id: Number(roomSelectionModal.itinerary_route_id || 0),
      hotel_id: Number(roomSelectionModal.hotel_id || 0),
      group_type: Number(roomSelectionModal.group_type || 0),
      hotel_name: String(roomSelectionModal.hotel_name || ""),
      hotel_code: String(roomSelectionModal.hotel_code || "").trim() || undefined,
      provider: String(roomSelectionModal.provider || "").trim() || undefined,
      selected_room_type_title: String(roomSelectionModal.selected_room_type_title || "").trim() || undefined,
      onSuccess: onRoomSelectionSuccess,
    } : null,
  };
}
