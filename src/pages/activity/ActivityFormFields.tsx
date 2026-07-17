import { useState } from "react";
import { format } from "date-fns";
import { CalendarIcon, Clock3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { TimePickerPopover, formatTime24As12, time12To24, time24To12 } from "@/components/itinerary/TimePickerPopover";
import { formatYmdLabel, normalizeTime24, parseYmdToDate } from "./activityForm.utils";

type ActivityDatePickerFieldProps = {
  value: string;
  onChange: (valueYmd: string) => void;
  disabled?: boolean;
};

function ActivityDatePickerField({ value, onChange, disabled = false }: ActivityDatePickerFieldProps) {
  const [isOpen, setIsOpen] = useState(false);
  const selectedDate = parseYmdToDate(value);

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          className={`h-9 w-full justify-start border-[#e5d7f6] bg-white font-normal text-left ${
            !selectedDate ? "text-muted-foreground" : ""
          }`}
          disabled={disabled}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {formatYmdLabel(value)}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-auto p-0">
        <Calendar
          mode="single"
          selected={selectedDate}
          onSelect={(nextDate) => {
            if (!nextDate) return;
            onChange(format(nextDate, "yyyy-MM-dd"));
            setIsOpen(false);
          }}
          initialFocus
        />
      </PopoverContent>
    </Popover>
  );
}

type ActivityTimePickerFieldProps = {
  label: string;
  value: string;
  onChange: (value24: string) => void;
  disabled?: boolean;
};

function ActivityTimePickerField({ label, value, onChange, disabled = false }: ActivityTimePickerFieldProps) {
  const [isOpen, setIsOpen] = useState(false);
  const normalized = normalizeTime24(value);

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          className="h-10 w-full justify-start border-[#e5d7f6] bg-white font-normal text-left"
          disabled={disabled}
        >
          <Clock3 className="mr-2 h-4 w-4 text-[#6b6680]" />
          {formatTime24As12(normalized)}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0 border-0 bg-transparent shadow-none" align="start">
        <TimePickerPopover
          value={formatTime24As12(normalized)}
          label={label}
          onSave={(newValue12) => {
            const fallback = time24To12(normalized);
            const [nextTime = fallback.time, nextPeriod = fallback.period] = String(newValue12 || "").split(" ");
            onChange(time12To24(nextTime, (nextPeriod as "AM" | "PM") || fallback.period));
            setIsOpen(false);
          }}
        />
      </PopoverContent>
    </Popover>
  );
}

/** Build absolute URL to backend for non-JSON FormData upload.
 * If your app is proxied, relative path is fine. Change if needed. */



export { ActivityDatePickerField, ActivityTimePickerField };

