import type { RefObject } from "react";
import { HotelList } from "../../HotelList";
import type { HotelListProps } from "../../hotel-list/hotelList.types";

type ItineraryHotelListSectionProps = HotelListProps & {
  hotelListRef: RefObject<HTMLDivElement | null>;
  summaryStickyHeight: number;
};

/** Owns the hotel list scroll anchor and the large HotelList callback contract. */
export function ItineraryHotelListSection({ hotelListRef, summaryStickyHeight, ...props }: ItineraryHotelListSectionProps) {
  return (
    <div ref={hotelListRef} id="hotel-list-section" style={{ scrollMarginTop: `${summaryStickyHeight + 12}px` }}>
      <HotelList {...props} hotelAvailability={props.hotelAvailability} />
    </div>
  );
}

export default ItineraryHotelListSection;
