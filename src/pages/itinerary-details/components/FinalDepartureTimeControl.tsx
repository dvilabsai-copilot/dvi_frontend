import { useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { TimePickerPopover } from "@/components/itinerary/TimePickerPopover";
import type { ItineraryDay } from "../itinerary-details.types";
import type { RouteTimeChangeType } from "../hooks/useRouteTimePatchMutation";

type Props = {
  day: ItineraryDay;
  planId: number;
  isFinalDay: boolean;
  readOnly?: boolean;
  disabled?: boolean;
  onSave: (planId: number, routeId: number, dayNumber: number, start: string,
    departure: string, changeType: RouteTimeChangeType) => Promise<void>;
};

export function FinalDepartureTimeControl({ day, planId, isFinalDay, readOnly, disabled, onSave }: Props) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  if (!isFinalDay || !day.departureTime) return null;

  return (
    <span className="ml-2 inline-flex shrink-0 items-center gap-1 border-l border-[#e5d9f2] pl-3 text-xs font-medium text-[#625a70]">
      <span>Departure</span>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            aria-label={`Edit final departure time, ${day.departureTime}`}
            disabled={readOnly || disabled || saving}
            className="min-h-6 whitespace-nowrap rounded px-1 font-semibold text-[#242133] hover:text-[#d546ab] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-default disabled:opacity-60"
          >
            {day.departureTime}
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="end">
          <TimePickerPopover
            value={day.departureTime}
            label="Departure Time"
            saveLabel="Update Departure"
            disabled={disabled || readOnly || saving}
            onSave={async (value) => {
              setOpen(false);
              setSaving(true);
              try {
                await onSave(planId, day.id, day.dayNumber, day.startTime, value, "FINAL_DAY_DEPARTURE");
              } finally {
                setSaving(false);
              }
            }}
          />
          <p className="max-w-64 px-4 pb-3 text-xs text-muted-foreground">
            Set the actual departure time. Travel and reporting time will be reserved before sightseeing is planned.
          </p>
        </PopoverContent>
      </Popover>
    </span>
  );
}
