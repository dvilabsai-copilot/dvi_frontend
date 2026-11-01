/* DVI_TE_HOTELS_DATE_GRID_FOOTER_V1: 7-column Hotels date alignment, auto-applied for Tours/Cabs. */
// DVI_TE_HOTELS_VIEWPORT_POPUPS_V3: Hotels-only below-field, navigation-safe date range.
import { useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";
import { CalendarDays } from "lucide-react";
import { format, isBefore, isValid, parse, startOfDay, startOfMonth } from "date-fns";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useIsMobile } from "@/hooks/use-mobile";

import { Dialog, DialogContent, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

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
  allowSameDay?: boolean;
  searchBarStyle?: boolean;
  calendarDialogStyle?: boolean; /* DVI_TE_TOURS_CABS_HOTELS_CENTERED_CALENDAR_V2 */ // Travel Expert Hotels only, opt-in UI variant
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

// DVI_TE_HOTELS_NAV_SAFE_POPUPS_V2: Hotels-only navbar-safe calendar.
export function TravelExpertHotelDateRangeInput({
  side, checkInValue, checkOutValue, onChangeCheckIn, onChangeCheckOut,
  className = "", min, max, disabled, required, allowSameDay = false, searchBarStyle = false, calendarDialogStyle = false,
}: HotelDateRangeInputProps) {
  const isMobile = useIsMobile();
  const [open, setOpen] = useState(false);
  // DVI_TE_HOTELS_CALENDAR_ANCHORED_V4: Hotels-only. Never scroll the whole page to open a calendar.
  const teHotelClosedFromPageScrollRef = useRef(false);

  const teHotelCalendarTriggerRef = useRef<HTMLButtonElement>(null);
  const teHotelIgnoreProgrammaticScrollRef = useRef(false);
  const calendarPanelRef = useRef<HTMLDivElement>(null);
  // Hotels joined-bar popups must never travel across the sticky navigation.
  // Scrolling INSIDE the calendar is allowed; scrolling the page closes it.

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
    if (isBefore(date, draftStart) || (!allowSameDay && !isBefore(draftStart, date))) return;
    setDraftEnd(date);
    emitChange(onChangeCheckOut, value);
    setOpen(false);
  };

  const shown = side === "checkin" ? checkIn : checkOut;
  const label = side === "checkin" ? "Check-In" : "Check-Out";
  // DVI_TE_HOTELS_TRIP_CHIPS_V1: calendar-day difference, not elapsed 24-hour periods.
  const teHotelTripNightCount = draftStart && draftEnd
    ? Math.round((
        Date.UTC(draftEnd.getFullYear(), draftEnd.getMonth(), draftEnd.getDate()) -
        Date.UTC(draftStart.getFullYear(), draftStart.getMonth(), draftStart.getDate())
      ) / 86400000)
    : null;

  return (
    (searchBarStyle || calendarDialogStyle) ? (
/* DVI_TE_HOTELS_CENTERED_DATE_DIALOG_V1: Hotels-only calendar opens like Tours Rooms & Guests. */
<Dialog open={open} onOpenChange={setOpen}>
  <DialogTrigger asChild>
<button ref={teHotelCalendarTriggerRef}
          type="button"
          disabled={disabled}
          aria-label={`${label}: ${shown ? format(shown, "dd MMM yyyy") : "select date range"}`}
          aria-required={required}
          className={searchBarStyle
            ? `group flex h-[66px] w-full min-w-0 items-center justify-between gap-1 bg-transparent px-0 text-left text-[#111827] hover:text-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-500 disabled:opacity-50 ${className}`
            : `flex min-w-0 w-full items-center justify-between gap-1 rounded-md border border-[#e5d7f6] bg-white px-2 py-2 text-left text-xs text-[#332b3c] hover:border-blue-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:opacity-50 ${className}`}
        >
          {searchBarStyle ? (
            <span className="block min-w-0">
              {shown ? (
                <span className="flex flex-wrap items-baseline gap-x-1">
                  <strong className="text-[29px] font-extrabold leading-none tracking-tight sm:text-[32px]">{format(shown, "dd")}</strong>
                  <span className="text-[13px] font-semibold">{format(shown, "MMM yy")}</span>
                </span>
              ) : <strong className="block text-base font-semibold text-slate-400">Select date</strong>}
              <span className="mt-1 block text-xs font-medium text-[#3f4653]">{shown ? format(shown, "EEEE") : "Choose your dates"}</span>
            </span>
          ) : <span className="min-w-0 truncate">{shown ? format(shown, "dd-MM-yyyy") : "dd-mm-yyyy"}</span>}
          <CalendarDays className={searchBarStyle ? "h-4 w-4 shrink-0 text-blue-600" : "h-4 w-4 shrink-0"} aria-hidden="true" />
        </button>
  </DialogTrigger>
  <DialogContent
    aria-describedby={undefined}
    overlayClassName="z-[9998] bg-slate-950/50"
    className="z-[9999] w-[min(660px,calc(100vw-20px))] max-w-[calc(100vw-20px)] sm:max-w-[660px] max-h-[calc(100dvh-20px)] min-w-0 gap-0 overflow-x-auto overflow-y-auto overscroll-contain rounded-xl border border-[#dbeafe] bg-white p-3 shadow-2xl"
  >
    <DialogTitle className="sr-only">Select trip dates</DialogTitle>

        {/* DVI_TE_HOTELS_TRIP_CHIPS_V1: Hotels-only summary, calculated from calendar draft dates. */}
        {(searchBarStyle || calendarDialogStyle) ? (
          <div className="border-b border-slate-100 px-2 pb-3 pt-2">
            <div className="text-sm font-semibold text-[#44375f]">Select trip dates</div>
            <div className="mt-2 flex flex-wrap items-center gap-1.5" aria-live="polite" aria-atomic="true">
              <span className="inline-flex rounded-full border border-[#e9d8fd] bg-[#fbf7ff] px-2.5 py-1 text-xs font-semibold text-[#7139b2]">
                Arrival: {draftStart ? format(draftStart, "dd/MM/yyyy") : "Select date"}
              </span>
              <span className="inline-flex rounded-full border border-[#e9d8fd] bg-[#fbf7ff] px-2.5 py-1 text-xs font-semibold text-[#7139b2]">
                Departure: {draftEnd ? format(draftEnd, "dd/MM/yyyy") : "Select date"}
              </span>
              {teHotelTripNightCount !== null && teHotelTripNightCount >= 0 && (
                <>
                  <span className="inline-flex rounded-full bg-[#f3ebff] px-2.5 py-1 text-xs font-semibold text-[#7139b2]">
                    {teHotelTripNightCount} {teHotelTripNightCount === 1 ? "Night" : "Nights"}
                  </span>
                  <span className="inline-flex rounded-full bg-[#f3ebff] px-2.5 py-1 text-xs font-semibold text-[#7139b2]">
                    {teHotelTripNightCount + 1} {teHotelTripNightCount === 0 ? "Day" : "Days"}
                  </span>
                </>
              )}
            </div>
          </div>
        ) : (
          <div className="border-b border-slate-100 px-2 py-2 text-sm font-semibold text-[#334155]">
          Choose Check-In and Check-Out
        </div>
        )}
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
            day_range_middle: searchBarStyle ? "!rounded-none !bg-[#e4f2ff] !text-[#1e40af]" : "!rounded-none !bg-[#e4f2ff] !text-[#1e40af]",
            day_disabled: "text-slate-300 opacity-35",

    ...({
    months: "flex flex-col sm:flex-row items-start justify-center gap-4 sm:gap-5 space-y-0 sm:space-x-0",
    month: "w-[252px] min-w-[252px] max-w-[252px] shrink-0 space-y-3",
    caption: "relative flex h-9 items-center justify-center pt-0",
    table: "w-[252px] table-fixed border-collapse",
    head_row: "grid w-[252px] grid-cols-7",
    head_cell: "flex h-9 w-[36px] min-w-[36px] items-center justify-center rounded-md text-xs font-medium text-slate-500",
    row: "mt-1 grid w-[252px] grid-cols-7",
    cell: "relative h-9 w-[36px] min-w-[36px] max-w-[36px] p-0 text-center text-sm [&:has([aria-selected])]:bg-[#e4f2ff]",
    day: "h-9 w-9 rounded-md p-0 font-medium hover:bg-blue-100 aria-selected:opacity-100"
  })
  }}
        />
        <div className="flex items-center justify-between gap-3 border-t border-slate-100 px-2 pt-3 pb-1">

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

  </DialogContent>
</Dialog>
) : (
<Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button ref={teHotelCalendarTriggerRef}
          type="button"
          disabled={disabled}
          aria-label={`${label}: ${shown ? format(shown, "dd MMM yyyy") : "select date range"}`}
          aria-required={required}
          className={searchBarStyle
            ? `group flex h-[66px] w-full min-w-0 items-center justify-between gap-1 bg-transparent px-0 text-left text-[#111827] hover:text-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-500 disabled:opacity-50 ${className}`
            : `flex min-w-0 w-full items-center justify-between gap-1 rounded-md border border-[#e5d7f6] bg-white px-2 py-2 text-left text-xs text-[#332b3c] hover:border-blue-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:opacity-50 ${className}`}
        >
          {searchBarStyle ? (
            <span className="block min-w-0">
              {shown ? (
                <span className="flex flex-wrap items-baseline gap-x-1">
                  <strong className="text-[29px] font-extrabold leading-none tracking-tight sm:text-[32px]">{format(shown, "dd")}</strong>
                  <span className="text-[13px] font-semibold">{format(shown, "MMM yy")}</span>
                </span>
              ) : <strong className="block text-base font-semibold text-slate-400">Select date</strong>}
              <span className="mt-1 block text-xs font-medium text-[#3f4653]">{shown ? format(shown, "EEEE") : "Choose your dates"}</span>
            </span>
          ) : <span className="min-w-0 truncate">{shown ? format(shown, "dd-MM-yyyy") : "dd-mm-yyyy"}</span>}
          <CalendarDays className={searchBarStyle ? "h-4 w-4 shrink-0 text-blue-600" : "h-4 w-4 shrink-0"} aria-hidden="true" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        ref={calendarPanelRef}
        side="bottom"
        align={searchBarStyle && side === "checkout" ? "end" : "start"}
        sideOffset={8}
        avoidCollisions={true}
        collisionPadding={searchBarStyle ? { top: 88, right: 12, bottom: 12, left: 12 } : 10}
        onOpenAutoFocus={(event) => { if (searchBarStyle) event.preventDefault(); }}
        onCloseAutoFocus={(event) => {
          if (searchBarStyle && teHotelClosedFromPageScrollRef.current) {
            event.preventDefault();
            teHotelClosedFromPageScrollRef.current = false;
          }
        }}
        className={searchBarStyle
          ? "z-[1800] w-max max-w-[calc(100vw-24px)] overflow-x-auto overflow-y-auto overscroll-contain rounded-xl border border-[#dbeafe] bg-white p-2 shadow-xl"
          : "z-[9999] w-auto max-w-[calc(100vw-16px)] rounded-xl border border-[#dbeafe] bg-white p-2 shadow-xl"}
        style={searchBarStyle ? {
          maxHeight: "min(470px, var(--radix-popover-content-available-height, calc(100dvh - 110px)))",
        } : undefined}
      >
        {/* DVI_TE_HOTELS_TRIP_CHIPS_V1: Hotels-only summary, calculated from calendar draft dates. */}
        {searchBarStyle ? (
          <div className="border-b border-slate-100 px-2 pb-3 pt-2">
            <div className="text-sm font-semibold text-[#44375f]">Select trip dates</div>
            <div className="mt-2 flex flex-wrap items-center gap-1.5" aria-live="polite" aria-atomic="true">
              <span className="inline-flex rounded-full border border-[#e9d8fd] bg-[#fbf7ff] px-2.5 py-1 text-xs font-semibold text-[#7139b2]">
                Arrival: {draftStart ? format(draftStart, "dd/MM/yyyy") : "Select date"}
              </span>
              <span className="inline-flex rounded-full border border-[#e9d8fd] bg-[#fbf7ff] px-2.5 py-1 text-xs font-semibold text-[#7139b2]">
                Departure: {draftEnd ? format(draftEnd, "dd/MM/yyyy") : "Select date"}
              </span>
              {teHotelTripNightCount !== null && teHotelTripNightCount >= 0 && (
                <>
                  <span className="inline-flex rounded-full bg-[#f3ebff] px-2.5 py-1 text-xs font-semibold text-[#7139b2]">
                    {teHotelTripNightCount} {teHotelTripNightCount === 1 ? "Night" : "Nights"}
                  </span>
                  <span className="inline-flex rounded-full bg-[#f3ebff] px-2.5 py-1 text-xs font-semibold text-[#7139b2]">
                    {teHotelTripNightCount + 1} {teHotelTripNightCount === 0 ? "Day" : "Days"}
                  </span>
                </>
              )}
            </div>
          </div>
        ) : (
          <div className="border-b border-slate-100 px-2 py-2 text-sm font-semibold text-[#334155]">
          Choose Check-In and Check-Out
        </div>
        )}
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
            day_range_middle: searchBarStyle ? "!rounded-none !bg-[#e4f2ff] !text-[#1e40af]" : "!rounded-none !bg-[#e4f2ff] !text-[#1e40af]",
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
)
  );
}
