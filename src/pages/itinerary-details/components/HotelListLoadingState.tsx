import type { RefObject } from "react";
import { Loader2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

type HotelListLoadingStateProps = { hotelListRef: RefObject<HTMLDivElement | null>; summaryStickyHeight: number };

/** Renders the bottom hotel-list loading placeholder with the page scroll anchor. */
export function HotelListLoadingState({ hotelListRef, summaryStickyHeight }: HotelListLoadingStateProps) {
  return (
    <div ref={hotelListRef} id="hotel-list-section" style={{ scrollMarginTop: `${summaryStickyHeight + 12}px` }}>
      <Card className="border border-[#e5d9f2] bg-white"><CardContent className="flex items-center justify-center gap-3 py-10 text-[#6c6c6c]"><Loader2 className="h-5 w-5 animate-spin text-[#d546ab]" /><span>Loading hotel list for all days...</span></CardContent></Card>
    </div>
  );
}

export default HotelListLoadingState;
