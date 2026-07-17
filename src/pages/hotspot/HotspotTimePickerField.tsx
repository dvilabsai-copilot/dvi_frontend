/* eslint-disable prefer-const */
import { useEffect, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
const HOURS_12 = Array.from({ length: 12 }, (_, i) => String(i + 1));
const MINUTES = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, "0"));

function fmt12(h: number, m: number, ap: "AM" | "PM") {
  const hh = Math.max(1, Math.min(12, h));
  const mm = Math.max(0, Math.min(59, m));
  return `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")} ${ap}`;
}
function parse12(s: string) {
  const m = /^\s*(\d{1,2}):(\d{2})\s*(AM|PM)\s*$/i.exec(s || "");
  if (!m) return { h: 12, mm: 0, ap: "AM" as "AM" | "PM" };
  let h = Math.max(1, Math.min(12, Number(m[1])));
  let mm = Math.max(0, Math.min(59, Number(m[2])));
  const ap = m[3].toUpperCase() as "AM" | "PM";
  return { h, mm, ap };
}

/** Small, dependency-free 12-hour picker */
export function TimePickerField({
  value,
  onChange,
  placeholder = "hh:mm",
  disabled,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const { h, mm, ap } = parse12(value);
  const [H, setH] = useState(h);
  const [M, setM] = useState(mm);
  const [AP, setAP] = useState<"AM" | "PM">(ap);
  const wrapperRef = useRef<HTMLDivElement | null>(null);

  // Keep internal picker state in sync when parent `value` changes
  useEffect(() => {
    const parsed = parse12(value);
    setH(parsed.h);
    setM(parsed.mm);
    setAP(parsed.ap);
  }, [value]);

  // ❌ Removed outside-click close handler because shadcn <Select>
  // uses a portal and clicks inside the dropdown were treated as "outside",
  // which immediately closed the picker and prevented value from sticking.

  // Commit immediately on any change (user selection persists even without pressing "Set")
  const commit = (nh = H, nm = M, nap = AP) => {
    onChange(fmt12(nh, nm, nap));
  };

  return (
    <div ref={wrapperRef} className="relative">
      <Input
        value={value || ""}
        onFocus={() => !disabled && setOpen(true)}
        onClick={() => !disabled && setOpen(true)}
        onChange={() => {
          /* prevent manual typing from desyncing; picker controls value */
        }}
        placeholder={placeholder}
        disabled={disabled}
        className="w-[140px]"
      />
      {open && !disabled && (
        <div className="absolute z-20 mt-2 rounded-md border bg-white p-3 shadow-lg w-[320px]">
          <div className="flex items-center gap-3">
            {/* Hour */}
            <Select
              value={String(H)}
              onValueChange={(v) => {
                const nh = Math.max(1, Math.min(12, Number(v)));
                setH(nh);
                commit(nh, M, AP);
              }}
            >
              <SelectTrigger className="w-[80px]" aria-label="Hour">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="max-h-56">
                {HOURS_12.map((hh) => (
                  <SelectItem key={hh} value={hh}>
                    {hh}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <span className="text-xl leading-none">:</span>

            {/* Minute */}
            <Select
              value={String(M).padStart(2, "0")}
              onValueChange={(v) => {
                const nm = Math.max(0, Math.min(59, Number(v)));
                setM(nm);
                commit(H, nm, AP);
              }}
            >
              <SelectTrigger className="w-[80px]" aria-label="Minute">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="max-h-56">
                {MINUTES.map((mm) => (
                  <SelectItem key={mm} value={mm}>
                    {mm}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* AM/PM */}
            <Select
              value={AP}
              onValueChange={(v) => {
                const nap = (v as "AM" | "PM") ?? "AM";
                setAP(nap);
                commit(H, M, nap);
              }}
            >
              <SelectTrigger className="w-[80px]" aria-label="AM/PM">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="AM">AM</SelectItem>
                <SelectItem value="PM">PM</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="mt-3 flex justify-end gap-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                // keep already-committed value; just close
                setOpen(false);
              }}
            >
              Close
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
