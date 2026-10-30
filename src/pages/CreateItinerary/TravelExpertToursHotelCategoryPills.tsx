// DVI_TE_TOURS_ORIGINAL_FOUR_V6
// Travel Expert Tours only. Keep the original four categories and their existing IDs.
// Other categories remain in the backend master but are not offered in this form.
import { useEffect } from "react";

type CategoryOption = { value: string | number; label: string };

type Props = {
  value: readonly (string | number)[];
  options: readonly CategoryOption[];
  onChange: (next: string[]) => void;
  maxSelected?: number;
};

const categoryRank = (label: string): number => {
  const normalized = String(label ?? "")
    .toLowerCase()
    .replace(/★/g, "*")
    .replace(/[\s_-]/g, "");
  if (normalized === "budget") return 0;
  const match = normalized.match(/^([345])(?:\*|stars?)$/);
  return match ? Number(match[1]) - 2 : -1;
};

export function TravelExpertToursHotelCategoryPills({
  value,
  options,
  onChange,
  maxSelected = 4,
}: Props) {
  const visible = [...options]
    .filter(option => categoryRank(option.label) >= 0)
    .sort((a, b) => categoryRank(a.label) - categoryRank(b.label));
  const allowed = new Set(visible.map(option => String(option.value)));
  const supplied = (Array.isArray(value) ? value : []).map(String);
  const current = supplied.filter(id => allowed.has(id));
  const selected = new Set(current);

  // Do not retain a now-hidden custom category in the itinerary save payload.
  // Wait until the master categories have loaded before normalizing selection.
  useEffect(() => {
    if (visible.length && supplied.length !== current.length) onChange(current);
  }, [visible.length, supplied.join("|"), current.join("|"), onChange]);

  return (
    <div
      className="grid w-full min-w-0 grid-cols-4 gap-1.5"
      role="group"
      aria-label="Hotel Category"
    >
      {visible.map(option => {
        const id = String(option.value);
        const active = selected.has(id);
        const limitReached = !active && current.length >= maxSelected;
        return (
          <button
            key={id}
            type="button"
            aria-pressed={active}
            aria-label={`${option.label}, ${active ? "selected" : "not selected"}`}
            title={String(option.label)}
            disabled={limitReached}
            onClick={() => {
              onChange(active ? current.filter(item => item !== id) : [...current, id]);
            }}
            className={[
              "h-9 w-full min-w-0 whitespace-nowrap rounded-xl border px-1 text-xs font-bold transition-colors",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pink-500 focus-visible:ring-offset-1",
              active
                ? "border-pink-500 bg-pink-500 text-white shadow-sm"
                : "border-pink-200 bg-pink-50 text-pink-700 hover:border-pink-400 hover:bg-pink-100",
              limitReached ? "cursor-not-allowed opacity-40" : "cursor-pointer",
            ].join(" ")}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
