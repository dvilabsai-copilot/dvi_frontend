import React, { useEffect, useRef, useState } from "react";
import { ChevronDown, ChevronUp, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";

export type TimePeriod = "AM" | "PM";

type TimePickerPopoverProps = {
  value: string;
  label: string;
  onSave: (newValue: string) => Promise<void> | void;
  saveLabel?: string;
  savingLabel?: string;
  disabled?: boolean;
  isTimeAllowed?: (time24: string) => boolean;
};

export function time24To12(time24: string): { time: string; period: TimePeriod } {
  const [rawHour, rawMinute] = (time24 || "08:00").split(":");
  const hours24 = Math.max(0, Math.min(23, Number(rawHour || 8)));
  const minutes = Math.max(0, Math.min(59, Number(rawMinute || 0)));
  const period: TimePeriod = hours24 >= 12 ? "PM" : "AM";
  const hour12 = hours24 % 12 || 12;

  return {
    time: `${String(hour12).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`,
    period,
  };
}

export function time12To24(time12: string, period: TimePeriod): string {
  const [rawHour, rawMinute] = (time12 || "08:00").split(":");
  const hour = Math.max(1, Math.min(12, Number(rawHour || 8)));
  const minute = Math.max(0, Math.min(59, Number(rawMinute || 0)));
  const baseHour = hour % 12;
  const hour24 = period === "PM" ? baseHour + 12 : baseHour;

  return `${String(hour24).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

export function formatTime24As12(time24: string): string {
  const { time, period } = time24To12(time24);
  return `${time} ${period}`;
}

export const TimePickerPopover: React.FC<TimePickerPopoverProps> = ({
  value,
  label,
  onSave,
  saveLabel = "Update Time",
  savingLabel = "Updating...",
  disabled = false,
  isTimeAllowed,
}) => {
  const parts = value.split(" ");
  const [localTime, setLocalTime] = useState(parts[0] || "09:00");
  const [localAmPm, setLocalAmPm] = useState<TimePeriod>((parts[1] as TimePeriod) || "AM");
  const [isSaving, setIsSaving] = useState(false);
  const hourInputRef = useRef<HTMLButtonElement | null>(null);
  const minuteInputRef = useRef<HTMLButtonElement | null>(null);
  const periodInputRef = useRef<HTMLButtonElement | null>(null);
  const updateButtonRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    const nextParts = value.split(" ");
    setLocalTime(nextParts[0] || "09:00");
    setLocalAmPm((nextParts[1] as TimePeriod) || "AM");
  }, [value]);

  useEffect(() => {
    const id = window.requestAnimationFrame(() => {
      hourInputRef.current?.focus();
    });
    return () => window.cancelAnimationFrame(id);
  }, []);

  const [hh, mm] = localTime.split(":");
  const hours = Number(hh || 9);
  const minutes = Number(mm || 0);

  const isAllowed = (time24: string) => !isTimeAllowed || isTimeAllowed(time24);

  const setTime24 = (time24: string) => {
    if (!isAllowed(time24)) return;
    const next = time24To12(time24);
    setLocalTime(next.time);
    setLocalAmPm(next.period);
  };

  const adjustedTime24 = (deltaMinutes: number) => {
    const [rawHour, rawMinute] = time12To24(localTime, localAmPm).split(":");
    const next = new Date(2000, 0, 1, Number(rawHour), Number(rawMinute));
    next.setMinutes(next.getMinutes() + deltaMinutes);
    return `${String(next.getHours()).padStart(2, "0")}:${String(next.getMinutes()).padStart(2, "0")}`;
  };

  const toggleAmPm = () => {
    const nextPeriod: TimePeriod = localAmPm === "AM" ? "PM" : "AM";
    const nextTime = time12To24(localTime, nextPeriod);
    if (isAllowed(nextTime)) setLocalAmPm(nextPeriod);
  };

  const focusOrder = [hourInputRef, minuteInputRef, periodInputRef, updateButtonRef];

  const moveFocus = (from: number, delta: number) => {
    const nextIndex = (from + delta + focusOrder.length) % focusOrder.length;
    focusOrder[nextIndex].current?.focus();
  };

  const handleSegmentKeyDown = (
    e: React.KeyboardEvent,
    index: number,
    segment: "hour" | "minute" | "period"
  ) => {
    if (e.key === "ArrowUp") {
      e.preventDefault();
      if (segment === "hour") handleHourChange(1);
      if (segment === "minute") handleMinuteChange(5);
      if (segment === "period") toggleAmPm();
      return;
    }

    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (segment === "hour") handleHourChange(-1);
      if (segment === "minute") handleMinuteChange(-5);
      if (segment === "period") toggleAmPm();
      return;
    }

    if (e.key === "ArrowRight") {
      e.preventDefault();
      moveFocus(index, 1);
      return;
    }

    if (e.key === "ArrowLeft") {
      e.preventDefault();
      moveFocus(index, -1);
      return;
    }

    if (e.key === "Tab") {
      e.preventDefault();
      moveFocus(index, e.shiftKey ? -1 : 1);
      return;
    }

    if (e.key === "Enter") {
      e.preventDefault();
      void handleSave();
    }
  };

  const handleUpdateButtonKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowLeft") {
      e.preventDefault();
      moveFocus(3, -1);
      return;
    }

    if (e.key === "ArrowRight") {
      e.preventDefault();
      moveFocus(3, 1);
      return;
    }

    if (e.key === "Tab") {
      e.preventDefault();
      moveFocus(3, e.shiftKey ? -1 : 1);
    }
  };

  const handleHourChange = (delta: number) => {
    setTime24(adjustedTime24(delta * 60));
  };

  const handleMinuteChange = (delta: number) => {
    setTime24(adjustedTime24(delta));
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSave(`${localTime} ${localAmPm}`);
    } finally {
      setIsSaving(false);
    }
  };

  const isDisabled = disabled || isSaving;
  const hourUpAllowed = isAllowed(adjustedTime24(60));
  const hourDownAllowed = isAllowed(adjustedTime24(-60));
  const minuteUpAllowed = isAllowed(adjustedTime24(5));
  const minuteDownAllowed = isAllowed(adjustedTime24(-5));

  // Keep pointer focus inside the portalled popover. Radix uses focus and
  // pointer interactions to dismiss a popover; the increment/decrement
  // controls should change the value without making the picker disappear.
  const keepPopoverOpen = (event: React.PointerEvent<HTMLButtonElement>) => {
    event.preventDefault();
  };

  return (
    <div className="flex flex-col items-center p-4 bg-white rounded-lg shadow-xl border border-[#e5d9f2] min-w-[220px]">
      <span className="text-[10px] font-bold text-[#6c6c6c] uppercase mb-3 tracking-wider">{label}</span>
      <div className="flex items-center gap-4">
        <div className="flex flex-col items-center gap-1">
          <Button type="button" variant="ghost" size="icon" className={`h-8 w-8 text-[#d546ab] ${!hourUpAllowed ? "cursor-not-allowed opacity-50" : ""}`} onPointerDown={keepPopoverOpen} onClick={() => handleHourChange(1)} disabled={isDisabled} aria-disabled={!hourUpAllowed} tabIndex={-1}>
            <ChevronUp className="h-5 w-5" />
          </Button>
          <Button
            ref={hourInputRef}
            type="button"
            variant="ghost"
            className="bg-[#f8f5fc] border border-[#e5d9f2] rounded-md w-12 h-12 flex items-center justify-center text-xl font-bold text-[#4a4260] hover:bg-[#f2e9fb] focus-visible:ring-2 focus-visible:ring-[#d546ab]"
            onKeyDown={(e) => handleSegmentKeyDown(e, 0, "hour")}
            aria-label="Hour"
            disabled={isDisabled}
          >
            {String(hours).padStart(2, "0")}
          </Button>
          <Button type="button" variant="ghost" size="icon" className={`h-8 w-8 text-[#d546ab] ${!hourDownAllowed ? "cursor-not-allowed opacity-50" : ""}`} onPointerDown={keepPopoverOpen} onClick={() => handleHourChange(-1)} disabled={isDisabled} aria-disabled={!hourDownAllowed} tabIndex={-1}>
            <ChevronDown className="h-5 w-5" />
          </Button>
        </div>

        <span className="text-2xl font-bold text-[#4a4260] mt-2">:</span>

        <div className="flex flex-col items-center gap-1">
          <Button type="button" variant="ghost" size="icon" className={`h-8 w-8 text-[#d546ab] ${!minuteUpAllowed ? "cursor-not-allowed opacity-50" : ""}`} onPointerDown={keepPopoverOpen} onClick={() => handleMinuteChange(5)} disabled={isDisabled} aria-disabled={!minuteUpAllowed} tabIndex={-1}>
            <ChevronUp className="h-5 w-5" />
          </Button>
          <Button
            ref={minuteInputRef}
            type="button"
            variant="ghost"
            className="bg-[#f8f5fc] border border-[#e5d9f2] rounded-md w-12 h-12 flex items-center justify-center text-xl font-bold text-[#4a4260] hover:bg-[#f2e9fb] focus-visible:ring-2 focus-visible:ring-[#d546ab]"
            onKeyDown={(e) => handleSegmentKeyDown(e, 1, "minute")}
            aria-label="Minute"
            disabled={isDisabled}
          >
            {String(minutes).padStart(2, "0")}
          </Button>
          <Button type="button" variant="ghost" size="icon" className={`h-8 w-8 text-[#d546ab] ${!minuteDownAllowed ? "cursor-not-allowed opacity-50" : ""}`} onPointerDown={keepPopoverOpen} onClick={() => handleMinuteChange(-5)} disabled={isDisabled} aria-disabled={!minuteDownAllowed} tabIndex={-1}>
            <ChevronDown className="h-5 w-5" />
          </Button>
        </div>

        <div className="flex flex-col items-center justify-center gap-2 self-stretch">
          <Button
            ref={periodInputRef}
            variant="outline"
            className={`h-12 w-12 font-bold border-2 ${localAmPm === "AM" ? "border-[#d546ab] text-[#d546ab] bg-[#fdf2f8]" : "border-[#4a4260] text-[#4a4260]"}`}
            onClick={toggleAmPm}
            onKeyDown={(e) => handleSegmentKeyDown(e, 2, "period")}
            disabled={isDisabled || !isAllowed(time12To24(localTime, localAmPm === "AM" ? "PM" : "AM"))}
          >
            {localAmPm}
          </Button>
        </div>
      </div>

      <Button
        ref={updateButtonRef}
        className="w-full mt-4 bg-[#d546ab] hover:bg-[#c4359a] text-white shadow-md"
        onClick={handleSave}
        onKeyDown={handleUpdateButtonKeyDown}
        disabled={isDisabled}
      >
        {isSaving ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            {savingLabel}
          </>
        ) : (
          saveLabel
        )}
      </Button>
    </div>
  );
};
