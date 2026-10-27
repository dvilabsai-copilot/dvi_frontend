// DVI_TE_TRAVELLER_COUNTERS_V1
import { useEffect, useState } from "react";

type Props = {
  label: string;
  value: number;
  min: number;
  max?: number;
  onChange: (value: string) => void;
};

// An editable numeric field with adjacent decrement/increment buttons.
// Keeps parent traveller data and save/validation handlers authoritative.
export function TravellerCounterField({ label, value, min, max, onChange }: Props) {
  // DVI_TE_CABS_COUNTER_LIMITS_20261024
  const clamp = (n: number) => Math.min(max ?? Number.MAX_SAFE_INTEGER, Math.max(min, Math.floor(n)));
  const current = Number.isFinite(Number(value))
    ? clamp(Number(value))
    : min;
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(String(current));

  useEffect(() => {
    if (!editing) setDraft(String(current));
  }, [current, editing]);

  // Normalize values already stored before this control was updated.
  useEffect(() => {
    if (max !== undefined && Number(value) > max) onChange(String(max));
  }, [value, max]);

  const changeBy = (delta: number) => {
    const parsed = draft.trim() ? Number(draft) : current;
    const base = Number.isFinite(parsed) ? Math.floor(parsed) : current;
    const next = clamp(base + delta);
    setDraft(String(next));
    onChange(String(next));
  };

  const commit = () => {
    const parsed = Number(draft);
    const next = draft.trim() && Number.isFinite(parsed)
      ? clamp(parsed)
      : min;
    setDraft(String(next));
    setEditing(false);
    onChange(String(next));
  };

  return (
    <div
      role="group"
      aria-label={label}
      className="flex h-9 w-full items-stretch overflow-hidden rounded-md border border-[#e5d7f6] bg-white focus-within:ring-2 focus-within:ring-[#a78bfa]/30"
    >
      <button
        type="button"
        aria-label={`Decrease ${label}`}
        disabled={current <= min && (!draft.trim() || Number(draft) <= min)}
        onClick={() => changeBy(-1)}
        className="flex w-10 shrink-0 items-center justify-center border-r border-[#e5d7f6] bg-[#faf8ff] text-base font-bold text-[#3b3553] hover:bg-[#f0e9ff] disabled:cursor-not-allowed disabled:opacity-40"
      >
        −
      </button>
      <input
        type="text"
        inputMode="numeric"
        pattern="[0-9]*"
        aria-label={label}
        value={editing ? draft : String(current)}
        onFocus={(event) => {
          setEditing(true);
          event.currentTarget.select();
        }}
        onChange={(event) => {
          const entered = event.currentTarget.value;
          if (!/^\d*$/.test(entered)) return;
          const next = entered === "" ? "" : String(clamp(Number(entered)));
          setDraft(next);
          if (next !== "") onChange(next);
        }}
        onBlur={commit}
        className="h-full min-w-0 flex-1 bg-transparent px-2 text-center text-sm font-semibold text-[#242238] outline-none"
      />
      <button
        type="button"
        aria-label={`Increase ${label}`}
        disabled={max !== undefined && current >= max}
        onClick={() => changeBy(1)}
        className="flex w-10 shrink-0 items-center justify-center border-l border-[#e5d7f6] bg-[#faf8ff] text-base font-bold text-[#3b3553] hover:bg-[#f0e9ff]"
      >
        +
      </button>
    </div>
  );
}
