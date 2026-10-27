import { useEffect, useMemo, useState, type ChangeEvent } from "react";
import { CalendarDays } from "lucide-react";
import { format, isBefore, isValid, parse, startOfDay, startOfMonth } from "date-fns";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useIsMobile } from "@/hooks/use-mobile";

// This component only supplies date input UX. The parent form still owns both
// dates, including API submissions, row identity, and validation.
type HotelDateRangeInputProps = {
  side: "checkin" | "checkout";
  checkInValue: unknown;
  checkOutValue: unknown;
  onChangeCheckIn: (e: ChangeEvent<HTMLInputElement>) => void;
  onChangeCheckOut: (e: ChangeEvent<HTMLInputElement>) => void;
  className?: string;
  min?: string;
  max?: string;
  disabled?: boolean;
  required?: boolean;
};

const toDate = (input: unknown): Date | undefined => {
  if (input instanceof Date) return isValid(input) ? startOfDay(input) : undefined;
  const value = String(input ?? "").trim();
  if (!value) return undefined;
  for (const dateFormat of ["yyyy-MM-dd", "dd-MM-yyyy", "dd/MM/yyyy"]) {
    const parsed = parse(value, dateFormat, new Date());
    if (isValid(parsed) && format(parsed, dateFormat) === value) return startOfDay(parsed);
  }
  return undefined;
};

const emitChange = (handler: (e: ChangeEvent<HTMLInputElement>) => void, value: string) => {
  // Existing native <input type="date"> handlers read event.target.value.
  // Call those same handlers; never introduce a second, disconnected date state.
  handler({ target: { value }, currentTarget: { value } } as ChangeEvent<HTMLInputElement>);
};

export function TravelExpertHotelDateRangeInput({
  side, checkInValue, checkOutValue, onChangeCheckIn, onChangeCheckOut,
  className = "", min, max, disabled, required,
}: HotelDateRangeInputProps) {
  const isMobile = useIsMobile();
  const [open, setOpen] = useState(false);
  const [draftStart, setDraftStart] = useState<Date | undefined>();
  const [draftEnd, setDraftEnd] = useState<Date | undefined>();
  const [hovered, setHovered] = useState<Date | undefined>();
  const [month, setMonth] = useState<Date>(() => startOfMonth(new Date()));
  const checkIn = toDate(checkInValue);
  const checkOut = toDate(checkOutValue);
  const minimum = toDate(min);
  const maximum = toDate(max);

  useEffect(() => {
    if (!open) return;
    setDraftStart(checkIn);
    setDraftEnd(checkOut);
    setHovered(undefined);
    setMonth(startOfMonth(checkIn ?? checkOut ?? new Date()));
    // Do not reset month whenever Check-In changes while this popover is open.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const previewRange = useMemo(() => {
    if (!draftStart) return undefined;
    const to = draftEnd ?? (hovered && !isBefore(hovered, draftStart) ? hovered : draftStart);
    return { from: draftStart, to };
  }, [draftStart, draftEnd, hovered]);

  const isDateDisabled = (day: Date) => {
    const dayStart = startOfDay(day);
    if (isBefore(dayStart, startOfDay(new Date()))) return true;
    if (minimum && isBefore(dayStart, minimum)) return true;
    if (maximum && isBefore(maximum, dayStart)) return true;
    // As in the Cabs example, dates earlier than the start become unavailable
    // only while selecting the end of a new range.
    if (draftStart && !draftEnd && isBefore(dayStart, draftStart)) return true;
    return false;
  };

  const handleDateClick = (day: Date) => {
    if (isDateDisabled(day)) return;
    const date = startOfDay(day);
    const value = format(date, "yyyy-MM-dd");
    if (!draftStart || draftEnd) {
      setDraftStart(date);
      setDraftEnd(undefined);
      setHovered(undefined);
      emitChange(onChangeCheckIn, value);
      emitChange(onChangeCheckOut, "");
      return;
    }
    // A hotel's check-out must be later than its check-in.
    if (!isBefore(draftStart, date)) return;
    setDraftEnd(date);
    emitChange(onChangeCheckOut, value);
    setOpen(false);
  };

  const shown = side === "checkin" ? checkIn : checkOut;
  const label = side === "checkin" ? "Check-In" : "Check-Out";

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          disabled={disabled}
          aria-label={`${label}: ${shown ? format(shown, "dd MMM yyyy") : "select date range"}`}
          aria-required={required}
          className={`flex min-w-0 w-full items-center justify-between gap-1 rounded-md border border-[#e5d7f6] bg-white px-2 py-2 text-left text-xs text-[#332b3c] hover:border-blue-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:opacity-50 ${className}`}
        >
          <span className="min-w-0 truncate">{shown ? format(shown, "dd-MM-yyyy") : "dd-mm-yyyy"}</span>
          <CalendarDays className="h-4 w-4 shrink-0" aria-hidden="true" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        side="bottom" align="start" sideOffset={6}
        avoidCollisions collisionPadding={10}
        className="z-[9999] w-auto max-w-[calc(100vw-16px)] rounded-xl border border-[#dbeafe] bg-white p-2 shadow-xl"
      >
        <div className="border-b border-slate-100 px-2 py-2 text-sm font-semibold text-[#334155]">
          Choose Check-In and Check-Out
        </div>
        <Calendar
          mode="range"
          numberOfMonths={isMobile ? 1 : 2}
          month={month}
          onMonthChange={setMonth}
          showOutsideDays={false}
          selected={previewRange}
          disabled={isDateDisabled}
          onDayClick={handleDateClick}
          onDayMouseEnter={(day) => {
            if (draftStart && !draftEnd && !isDateDisabled(day)) setHovered(day);
          }}
          onDayMouseLeave={() => setHovered(undefined)}
          className="p-2"
          classNames={{
            months: "flex flex-col sm:flex-row gap-4 space-y-0 sm:space-x-0",
            month: "space-y-3",
            cell: "relative p-0 text-center text-sm [&:has([aria-selected])]:bg-[#e4f2ff]",
            day: "h-9 w-9 rounded-md p-0 font-medium hover:bg-blue-100 aria-selected:opacity-100",
            day_range_start: "!rounded-md !bg-[#0b8ff6] !text-white",
            day_range_end: "!rounded-md !bg-[#0b8ff6] !text-white",
            day_selected: "!bg-[#0b8ff6] !text-white",
            day_range_middle: "!rounded-none !bg-[#e4f2ff] !text-[#1e40af]",
            day_disabled: "text-slate-300 opacity-35",
          }}
        />
        <div className="flex items-center justify-between gap-3 border-t border-slate-100 px-2 pt-3 pb-1">
          <div className="min-w-0 text-xs text-[#334155]">
            <div className="font-semibold">Selected dates</div>
            <div className="truncate">
              {draftStart ? format(draftStart, "dd MMM yyyy") : "Check-In"} — {draftEnd ? format(draftEnd, "dd MMM yyyy") : "Check-Out"}
            </div>
          </div>
          <button
            type="button"
            className="shrink-0 rounded-md border border-blue-300 px-3 py-2 text-xs font-semibold text-blue-600 hover:bg-blue-50"
            onClick={() => {
              setDraftStart(undefined);
              setDraftEnd(undefined);
              setHovered(undefined);
              emitChange(onChangeCheckIn, "");
              emitChange(onChangeCheckOut, "");
            }}
          >Clear</button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
