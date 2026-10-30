// DVI_TE_TOURS_MODERN_TIME_PICKER_V1
// Tours & Attractions only. Receives/saves existing HH:mm (24-hour) values.
import { useEffect, useState } from "react";
import { Clock3, ChevronDown, ChevronUp, Check } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

type Period = "AM" | "PM";

type Props = {
  value: string;
  onChange: (value: string) => void;
  label: string;
  align?: "start" | "center" | "end";
  minTime?: string;
  disabled?: boolean;
};

const parseTime = (value: string) => {
  const match = /^([01]?\d|2[0-3]):([0-5]\d)/.exec(String(value || ""));
  const hours24 = match ? Number(match[1]) : 12;
  const minute = match ? Number(match[2]) : 0;
  return {
    hour: hours24 % 12 || 12,
    minute,
    period: (hours24 >= 12 ? "PM" : "AM") as Period,
  };
};

const toTime24 = (hour: number, minute: number, period: Period) => {
  const hours24 = (hour % 12) + (period === "PM" ? 12 : 0);
  return `${String(hours24).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
};

const timeLabel = (value: string) => {
  const parsed = parseTime(value);
  return `${String(parsed.hour).padStart(2, "0")}:${String(parsed.minute).padStart(2, "0")} ${parsed.period}`;
};

const presets: Array<{ label: string; time: string }> = [
  { label: "Early", time: "06:00" },
  { label: "Morning", time: "09:00" },
  { label: "Noon", time: "12:00" },
  { label: "Evening", time: "18:00" },
];

export function TravelExpertToursModernTimePicker({
  value,
  onChange,
  label,
  align = "end",
  minTime,
  disabled,
}: Props) {
  const [open, setOpen] = useState(false);
  const [hour, setHour] = useState(() => parseTime(value).hour);
  const [minute, setMinute] = useState(() => parseTime(value).minute);
  const [period, setPeriod] = useState<Period>(() => parseTime(value).period);

  useEffect(() => {
    if (!open) return;
    const next = parseTime(value);
    setHour(next.hour);
    setMinute(next.minute);
    setPeriod(next.period);
  }, [open, value]);

  const proposedValue = toTime24(hour, minute, period);
  const belowMinimum = Boolean(
    minTime && /^\d{2}:\d{2}/.test(minTime) && proposedValue < minTime.slice(0, 5),
  );

  const choosePreset = (time: string) => {
    const next = parseTime(time);
    setHour(next.hour);
    setMinute(next.minute);
    setPeriod(next.period);
  };

  const apply = () => {
    if (belowMinimum) return;
    onChange(proposedValue);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          disabled={disabled}
          aria-label={label}
          title={`Change ${label.toLowerCase()}`}
          className="flex h-9 w-[114px] min-w-0 shrink-0 items-center justify-between gap-1 rounded-lg border border-[#decdf5] bg-white px-2 text-xs font-bold text-[#34235a] shadow-sm transition hover:border-[#a78bfa] hover:bg-[#faf6ff] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <span className="whitespace-nowrap tabular-nums">{timeLabel(value)}</span>
          <Clock3 className="h-4 w-4 shrink-0 text-violet-500" aria-hidden="true" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        side="bottom"
        align={align}
        sideOffset={8}
        collisionPadding={12}
        className="z-[9999] w-[min(334px,calc(100vw-24px))] overflow-hidden rounded-2xl border border-violet-100 bg-white p-0 shadow-2xl"
      >
        <div className="bg-gradient-to-r from-violet-600 to-fuchsia-600 px-4 py-3 text-white">
          <div className="flex items-center gap-2 text-xs font-semibold text-violet-100">
            <Clock3 className="h-4 w-4" /> {label}
          </div>
          <div className="mt-1 text-2xl font-extrabold tracking-tight tabular-nums">
            {String(hour).padStart(2, "0")}:{String(minute).padStart(2, "0")} {period}
          </div>
        </div>

        <div className="px-4 py-3">
          <div className="flex items-end justify-center gap-2">
            <div className="min-w-0 flex-1">
              <label htmlFor={`${label.replace(/\s/g, "-")}-hour`} className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-slate-500">Hour</label>
              <div className="flex items-center rounded-xl border border-violet-200 bg-violet-50/60 p-1">
                <button type="button" aria-label="Decrease hour" onClick={() => setHour((h) => (h === 1 ? 12 : h - 1))} className="rounded-md p-1 text-violet-600 hover:bg-violet-100"><ChevronDown className="h-4 w-4" /></button>
                <input
                  id={`${label.replace(/\s/g, "-")}-hour`}
                  type="number"
                  min={1}
                  max={12}
                  inputMode="numeric"
                  value={hour}
                  onChange={(event) => { const n = Number(event.target.value); if (Number.isInteger(n) && n >= 1 && n <= 12) setHour(n); }}
                  className="w-full min-w-0 appearance-none bg-transparent text-center text-lg font-bold tabular-nums text-slate-800 outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                />
                <button type="button" aria-label="Increase hour" onClick={() => setHour((h) => (h === 12 ? 1 : h + 1))} className="rounded-md p-1 text-violet-600 hover:bg-violet-100"><ChevronUp className="h-4 w-4" /></button>
              </div>
            </div>
            <span className="pb-2 text-xl font-bold text-violet-500">:</span>
            <div className="min-w-0 flex-1">
              <label htmlFor={`${label.replace(/\s/g, "-")}-minute`} className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-slate-500">Minute</label>
              <div className="flex items-center rounded-xl border border-violet-200 bg-violet-50/60 p-1">
                <button type="button" aria-label="Decrease minute" onClick={() => setMinute((m) => (m + 59) % 60)} className="rounded-md p-1 text-violet-600 hover:bg-violet-100"><ChevronDown className="h-4 w-4" /></button>
                <input
                  id={`${label.replace(/\s/g, "-")}-minute`}
                  type="number"
                  min={0}
                  max={59}
                  inputMode="numeric"
                  value={String(minute).padStart(2, "0")}
                  onChange={(event) => { const n = Number(event.target.value); if (Number.isInteger(n) && n >= 0 && n <= 59) setMinute(n); }}
                  className="w-full min-w-0 appearance-none bg-transparent text-center text-lg font-bold tabular-nums text-slate-800 outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                />
                <button type="button" aria-label="Increase minute" onClick={() => setMinute((m) => (m + 1) % 60)} className="rounded-md p-1 text-violet-600 hover:bg-violet-100"><ChevronUp className="h-4 w-4" /></button>
              </div>
            </div>
            <div className="w-[54px] shrink-0">
              <div className="mb-1 text-[11px] font-bold uppercase tracking-wide text-slate-500">Period</div>
              <div className="flex flex-col gap-1">
                {(["AM", "PM"] as Period[]).map((option) => (
                  <button
                    type="button"
                    key={option}
                    aria-pressed={period === option}
                    onClick={() => setPeriod(option)}
                    className={`rounded-md px-2 py-1 text-xs font-bold transition ${period === option ? "bg-violet-600 text-white" : "border border-violet-100 bg-violet-50 text-violet-700 hover:bg-violet-100"}`}
                  >{option}</button>
                ))}
              </div>
            </div>
          </div>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {presets.map((preset) => (
              <button type="button" key={preset.time} onClick={() => choosePreset(preset.time)} className="rounded-full border border-violet-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-violet-700 hover:bg-violet-50">
                {preset.label}
              </button>
            ))}
          </div>
          {belowMinimum && <p role="alert" className="mt-2 text-xs font-semibold text-amber-700">Choose a time at or after {timeLabel(minTime || "12:00")}.</p>}
        </div>
        <div className="flex items-center justify-end gap-2 border-t border-slate-100 bg-slate-50 px-4 py-3">
          <button type="button" onClick={() => setOpen(false)} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100">Cancel</button>
          <button type="button" onClick={apply} disabled={belowMinimum} className="inline-flex items-center gap-1.5 rounded-lg bg-violet-600 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-50"><Check className="h-4 w-4" /> Apply</button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
