import { useCallback, useEffect, type Dispatch, type MutableRefObject, type SetStateAction } from "react";

interface ItineraryScrollControllerOptions {
  quoteId?: string | number | null;
  days?: unknown[] | null;
  summaryStickyRef: MutableRefObject<HTMLDivElement | null>;
  hotelListRef: MutableRefObject<HTMLDivElement | null>;
  vehicleListRef: MutableRefObject<HTMLDivElement | null>;
  summaryStickyHeight: number;
  setSummaryStickyHeight: Dispatch<SetStateAction<number>>;
  itineraryDaysCountRef: MutableRefObject<number>;
}

/** Owns sticky-summary measurement and section scrolling for the itinerary page. */
export const useItineraryScrollController = ({
  quoteId,
  days,
  summaryStickyRef,
  hotelListRef,
  vehicleListRef,
  summaryStickyHeight,
  setSummaryStickyHeight,
  itineraryDaysCountRef,
}: ItineraryScrollControllerOptions) => {
  useEffect(() => {
    const element = summaryStickyRef.current;
    if (!element) return;

    const updateStickyHeight = () => {
      setSummaryStickyHeight(Math.ceil(element.getBoundingClientRect().height));
    };

    updateStickyHeight();
    const resizeObserver = new ResizeObserver(updateStickyHeight);
    resizeObserver.observe(element);
    window.addEventListener("resize", updateStickyHeight);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener("resize", updateStickyHeight);
    };
  }, [quoteId, setSummaryStickyHeight, summaryStickyRef]);

  useEffect(() => {
    itineraryDaysCountRef.current = Array.isArray(days) ? days.length : 0;
  }, [days, itineraryDaysCountRef]);

  const scrollToSection = useCallback((element: HTMLDivElement | null) => {
    if (!element) return;
    const offset = summaryStickyHeight + 12;
    const y = element.getBoundingClientRect().top + window.scrollY - offset;
    window.scrollTo({ top: Math.max(y, 0), behavior: "smooth" });
  }, [summaryStickyHeight]);

  const scrollToHotelList = useCallback(() => scrollToSection(hotelListRef.current), [hotelListRef, scrollToSection]);
  const scrollToVehicleList = useCallback(() => scrollToSection(vehicleListRef.current), [scrollToSection, vehicleListRef]);

  return { scrollToHotelList, scrollToVehicleList };
};

