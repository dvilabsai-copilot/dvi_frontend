import type { ComponentProps } from "react";
import { HotelSearchModal } from "@/components/hotels/HotelSearchModal";
import { HotelRoomSelectionModal } from "@/components/hotels/HotelRoomSelectionModal";

type ItineraryHotelDialogsProps = {
  search: ComponentProps<typeof HotelSearchModal>;
  roomSelection?: ComponentProps<typeof HotelRoomSelectionModal> | null;
};

/** Composes hotel search and room-selection dialogs while keeping hotel workflow state external. */
export function ItineraryHotelDialogs({ search, roomSelection }: ItineraryHotelDialogsProps) {
  return (
    <>
      <HotelSearchModal {...search} />
      {roomSelection && <HotelRoomSelectionModal {...roomSelection} />}
    </>
  );
}

export default ItineraryHotelDialogs;
