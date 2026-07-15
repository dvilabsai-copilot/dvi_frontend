import type { RefObject } from "react";
import { Card, CardContent } from "@/components/ui/card";

type VehicleUnavailableStateProps = { vehicleListRef: RefObject<HTMLDivElement | null>; summaryStickyHeight: number };

/** Renders the vehicle section empty state while preserving its scroll anchor. */
export function VehicleUnavailableState({ vehicleListRef, summaryStickyHeight }: VehicleUnavailableStateProps) {
  return (
    <div ref={vehicleListRef} id="vehicle-list-section" style={{ scrollMarginTop: `${summaryStickyHeight + 12}px` }}>
      <Card className="border border-[#e5d9f2] bg-white"><CardContent className="px-6 py-10"><div className="text-center text-[#6c6c6c]">No vehicle available</div></CardContent></Card>
    </div>
  );
}

export default VehicleUnavailableState;
