import React, { useState } from "react";
import { FloatingHoverTooltip, getFloatingTooltipPosition } from "@/components/FloatingHoverTooltip";
import type { CostBreakdown, EntryTicketBreakdown } from "../itinerary-details.types";

type EntryTicketCostTooltipProps = {
  costBreakdown?: CostBreakdown | null;
  canViewCostBreakdown: boolean;
  children: React.ReactNode;
};

const formatMoney = (value: unknown) => `₹ ${Number(value ?? 0).toLocaleString("en-IN", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})}`;

/** Shows only the API-provided entry-ticket location and traveller breakdown on hover. */
export const EntryTicketCostTooltip: React.FC<EntryTicketCostTooltipProps> = ({
  costBreakdown,
  canViewCostBreakdown,
  children,
}) => {
  const [position, setPosition] = useState<{ left: number; top: number } | null>(null);

  if (!canViewCostBreakdown || !costBreakdown) return <>{children}</>;

  const locationsByDay = new Map<number, EntryTicketBreakdown[]>();
  for (const location of costBreakdown.entryTicketBreakdown || []) {
    const locations = locationsByDay.get(location.dayNumber) || [];
    locations.push(location);
    locationsByDay.set(location.dayNumber, locations);
  }
  const dayGroups = Array.from(locationsByDay.entries()).sort(([firstDay], [secondDay]) => firstDay - secondDay);

  const showTooltip = (event: React.MouseEvent<HTMLElement>) => {
    setPosition(getFloatingTooltipPosition(event.clientX, event.clientY, 760, 520));
  };

  const moveTooltip = (event: React.MouseEvent<HTMLElement>) => {
    setPosition((current) => current
      ? getFloatingTooltipPosition(event.clientX, event.clientY, 760, 520)
      : current);
  };

  const showTooltipFromFocus = (event: React.FocusEvent<HTMLElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    setPosition(getFloatingTooltipPosition(rect.right, rect.top, 760, 520));
  };

  return (
    <span
      className="inline-flex cursor-help underline decoration-dotted underline-offset-2"
      tabIndex={0}
      onMouseEnter={showTooltip}
      onMouseMove={moveTooltip}
      onMouseLeave={() => setPosition(null)}
      onFocus={showTooltipFromFocus}
      onBlur={() => setPosition(null)}
      aria-label="Show entry ticket cost breakdown"
    >
      {children}
      {position && (
        <FloatingHoverTooltip left={position.left} top={position.top} className="w-[760px] max-w-[calc(100vw-24px)]">
          <div className="mb-3 flex justify-between gap-4 border-b border-gray-200 pb-2">
            <span className="font-semibold text-gray-700">Entry Ticket Cost Breakdown</span>
            <span className="font-semibold text-[#d546ab]">{formatMoney(costBreakdown.totalHotspotCost)}</span>
          </div>

          <div className="grid grid-cols-3 gap-x-8 gap-y-4">
            {dayGroups.map(([dayNumber, locations]) => (
              <section key={dayNumber} className="min-w-0 space-y-2">
                <h3 className="border-b border-gray-200 pb-1 text-sm font-semibold text-[#4a4260]">Day {dayNumber}</h3>
                {locations.map((location) => (
                  <div key={location.routeHotspotId} className="space-y-1 text-xs">
                    <div className="flex justify-between gap-4 font-medium text-gray-700">
                      <span className="min-w-0">{location.locationName}</span>
                      <span className="shrink-0 text-right">{formatMoney(location.total)}</span>
                    </div>
                    {location.travellers.map((traveller) => (
                      <div key={`${location.routeHotspotId}-${traveller.type}`} className="flex justify-between gap-4 pl-3 text-[11px] text-gray-500">
                        <span>{traveller.label} ({traveller.quantity} × {formatMoney(traveller.unitCost)})</span>
                        <span className="shrink-0 text-right">{formatMoney(traveller.total)}</span>
                      </div>
                    ))}
                  </div>
                ))}
              </section>
            ))}
          </div>
        </FloatingHoverTooltip>
      )}
    </span>
  );
};
