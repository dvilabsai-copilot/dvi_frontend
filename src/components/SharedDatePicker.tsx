import { useEffect, useState } from "react";
import { Calendar as CalendarIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

type SharedDatePickerProps = {
  label: string;
  value: string;
  placeholder?: string;
  disabled?: boolean;
  minDate?: Date;
  defaultMonth?: Date;
  triggerClassName?: string;
  parseValue: (value: string) => Date | undefined;
  formatValue: (date: Date) => string;
  onChange: (value: string) => void;
};

const CURRENT_YEAR = new Date().getFullYear();
const DATE_PICKER_YEARS = Array.from(
  { length: 5 },
  (_, index) => CURRENT_YEAR + index
);
const DATE_PICKER_MONTHS = Array.from({ length: 12 }, (_, month) => ({
  value: month,
  label: new Date(2000, month, 1).toLocaleString("default", {
    month: "long",
  }),
}));

export function SharedDatePicker({
  label,
  value,
  placeholder = label,
  disabled = false,
  minDate,
  defaultMonth,
  triggerClassName = "h-10 w-[160px]",
  parseValue,
  formatValue,
  onChange,
}: SharedDatePickerProps) {
  const selectedDate = parseValue(value);
  const [isOpen, setIsOpen] = useState(false);
  const [calendarMonth, setCalendarMonth] = useState(
    selectedDate || minDate || defaultMonth || new Date()
  );

  useEffect(() => {
    const nextDate = parseValue(value);
    if (nextDate) {
      setCalendarMonth(nextDate);
    } else if (minDate) {
      setCalendarMonth(minDate);
    } else if (defaultMonth) {
      setCalendarMonth(defaultMonth);
    }
  }, [value, minDate, defaultMonth, parseValue]);

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          className={`${triggerClassName} justify-start text-left font-normal ${
            !value ? "text-muted-foreground" : ""
          }`}
          disabled={disabled}
        >
          <CalendarIcon className="mr-2 h-4 w-4 shrink-0" />
          {value || placeholder}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className="z-[9999] w-auto rounded-xl border border-[#e5d7f6] bg-white p-0 shadow-xl"
      >
        <div className="flex items-center justify-between gap-3 border-b border-[#efe7fb] px-4 py-2 text-sm font-medium text-[#4a4260]">
          <span>{label}</span>
          <div className="flex items-center gap-2">
            <select
              aria-label={`${label} Month`}
              value={calendarMonth.getMonth()}
              onChange={(event) =>
                setCalendarMonth(
                  new Date(
                    calendarMonth.getFullYear(),
                    Number(event.target.value),
                    1
                  )
                )
              }
              className="h-7 rounded-md border border-[#e5d7f6] bg-white px-2 text-xs font-normal text-[#4a4260]"
            >
              {DATE_PICKER_MONTHS.map((month) => (
                <option key={month.value} value={month.value}>
                  {month.label}
                </option>
              ))}
            </select>
            <select
              aria-label={`${label} Year`}
              value={calendarMonth.getFullYear()}
              onChange={(event) =>
                setCalendarMonth(
                  new Date(
                    Number(event.target.value),
                    calendarMonth.getMonth(),
                    1
                  )
                )
              }
              className="h-7 rounded-md border border-[#e5d7f6] bg-white px-2 text-xs font-normal text-[#4a4260]"
            >
              {DATE_PICKER_YEARS.map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>
          </div>
        </div>
        <Calendar
          mode="single"
          selected={selectedDate}
          month={calendarMonth}
          onMonthChange={setCalendarMonth}
          onSelect={(day) => {
            if (!day) return;
            setCalendarMonth(day);
            onChange(formatValue(day));
            setIsOpen(false);
          }}
          disabled={minDate ? { before: minDate } : undefined}
          initialFocus
          classNames={{ day_today: "" }}
        />
      </PopoverContent>
    </Popover>
  );
}
