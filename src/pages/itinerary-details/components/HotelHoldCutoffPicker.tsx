import { useState } from "react";
import { CalendarDays, Clock3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { SharedDatePicker } from "@/components/SharedDatePicker";
import {
  formatTime24As12,
  time12To24,
  TimePickerPopover,
  type TimePeriod,
} from "@/components/itinerary/TimePickerPopover";

type HotelHoldCutoffPickerProps = {
  value: string;
  minDate?: Date;
  maxDate?: Date;
  disabled?: boolean;
  onChange: (value: string) => void;
};

const pad = (value: number) => String(value).padStart(2, "0");

const parseDateOnly = (value: string): Date | undefined => {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return undefined;
  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  return Number.isNaN(date.getTime()) ? undefined : date;
};

const formatDateOnly = (date: Date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

const startOfDay = (date?: Date) => {
  if (!date || Number.isNaN(date.getTime())) return undefined;
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
};

const formatDateLabel = (date: Date) => date.toLocaleDateString("en-IN", { dateStyle: "medium" });

const formatTime24 = (date: Date) => `${pad(date.getHours())}:${pad(date.getMinutes())}`;

const parseTime12 = (value: string) => {
  const [time, period] = value.split(" ");
  return time12To24(time || "09:00", (period === "PM" ? "PM" : "AM") as TimePeriod);
};

const combineLocalDateTime = (dateValue: string, time24: string) => {
  const date = parseDateOnly(dateValue);
  if (!date) return undefined;
  const [hours, minutes] = time24.split(":").map(Number);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return undefined;
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), hours, minutes, 0, 0);
};

const validDate = (value?: Date) => value && !Number.isNaN(value.getTime()) ? value : undefined;

export function HotelHoldCutoffPicker({
  value,
  minDate,
  maxDate,
  disabled = false,
  onChange,
}: HotelHoldCutoffPickerProps) {
  const parsedValue = validDate(value ? new Date(value) : undefined);
  const validMinDate = validDate(minDate);
  const validMaxDate = validDate(maxDate);
  const fallbackDate = parsedValue || validMinDate || new Date();
  const dateValue = parsedValue ? formatDateOnly(parsedValue) : "";
  const calendarValue = dateValue || formatDateOnly(fallbackDate);
  const timeValue = parsedValue ? formatTime24(parsedValue) : formatTime24(fallbackDate);
  const [timePickerOpen, setTimePickerOpen] = useState(false);
  const [pickerError, setPickerError] = useState("");

  const calendarMinDate = startOfDay(validMinDate);
  const calendarMaxDate = startOfDay(validMaxDate);
  const displayDate = parsedValue ? formatDateLabel(parsedValue) : "Select date";
  const displayTime = parsedValue ? formatTime24As12(timeValue) : "Select time";
  const limitLabel = validMaxDate
    ? `Maximum allowed: ${formatDateLabel(validMaxDate)} at ${formatTime24As12(formatTime24(validMaxDate))}`
    : "";

  const isAllowed = (candidate: Date | undefined) => {
    if (!candidate) return false;
    if (validMinDate && candidate.getTime() < validMinDate.getTime()) return false;
    if (validMaxDate && candidate.getTime() > validMaxDate.getTime()) return false;
    return true;
  };

  const emitCandidate = (candidate: Date | undefined) => {
    if (!candidate) return;
    if (!isAllowed(candidate)) {
      setPickerError("Choose a cutoff between the current hold cutoff and the maximum allowed time.");
      return;
    }
    setPickerError("");
    onChange(candidate.toISOString());
  };

  const handleDateChange = (nextDateValue: string) => {
    const candidate = combineLocalDateTime(nextDateValue, timeValue);
    if (isAllowed(candidate)) {
      emitCandidate(candidate);
      return;
    }
    if (validMinDate && candidate && candidate.getTime() < validMinDate.getTime()) {
      emitCandidate(validMinDate);
      return;
    }
    if (validMaxDate && candidate && candidate.getTime() > validMaxDate.getTime()) {
      emitCandidate(validMaxDate);
      return;
    }
    setPickerError("That date is outside the allowed hold window.");
  };

  const handleTimeSave = async (nextTime: string) => {
    emitCandidate(combineLocalDateTime(calendarValue, parseTime12(nextTime)));
    if (isAllowed(combineLocalDateTime(calendarValue, parseTime12(nextTime)))) setTimePickerOpen(false);
  };

  const isTimeAllowed = (nextTime24: string) => isAllowed(combineLocalDateTime(calendarValue, nextTime24));

  return (
    <div className="space-y-2">
      <div className="grid gap-2 sm:grid-cols-2">
        <SharedDatePicker
          label="Cutoff date"
          value={dateValue}
          displayValue={displayDate}
          placeholder="Select date"
          disabled={disabled}
          minDate={calendarMinDate}
          maxDate={calendarMaxDate}
          defaultMonth={fallbackDate}
          triggerClassName="h-10 w-full"
          parseValue={parseDateOnly}
          formatValue={formatDateOnly}
          onChange={handleDateChange}
        />
        <Popover open={timePickerOpen} onOpenChange={setTimePickerOpen}>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="outline"
              disabled={disabled}
              className="h-10 w-full justify-start text-left font-normal"
            >
              <Clock3 className="mr-2 h-4 w-4 shrink-0" />
              {displayTime}
            </Button>
          </PopoverTrigger>
          <PopoverContent align="start" className="w-auto p-0">
            <TimePickerPopover
              value={formatTime24As12(timeValue)}
              label="Cutoff time"
              saveLabel="Use Cutoff Time"
              savingLabel="Applying..."
              disabled={disabled}
              isTimeAllowed={isTimeAllowed}
              onSave={handleTimeSave}
            />
          </PopoverContent>
        </Popover>
      </div>
      <div className="flex items-center gap-2 text-[11px] text-slate-500">
        <CalendarDays className="h-3.5 w-3.5 text-[#5c24e5]" />
        <span>{limitLabel || "Select a date and time for the hotel hold."}</span>
      </div>
      {pickerError && <p className="text-xs font-medium text-red-600">{pickerError}</p>}
    </div>
  );
}

export default HotelHoldCutoffPicker;
