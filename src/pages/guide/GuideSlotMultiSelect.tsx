import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { X, ChevronDown } from "lucide-react";

interface SlotMultiSelectProps {
  options: { id: string; label: string }[];
  selected: string[];
  onChange: (next: string[]) => void;
  hasError?: boolean;
  placeholder?: string;
}

export function SlotMultiSelect({
  options,
  selected,
  onChange,
  hasError,
  placeholder = "Choose Slot Type",
}: SlotMultiSelectProps) {
  const [open, setOpen] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState<number>(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  // Close on outside click / focus-out
  useEffect(() => {
    function handlePointerDown(e: PointerEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setFocusedIndex(-1);
      }
    }
    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, []);

  // Scroll focused item into view
  useEffect(() => {
    if (!open || focusedIndex < 0 || !listRef.current) return;
    const item = listRef.current.querySelectorAll<HTMLLIElement>("li")[focusedIndex];
    item?.scrollIntoView({ block: "nearest" });
  }, [focusedIndex, open]);

  // Reset focus highlight when dropdown opens
  useEffect(() => {
    if (open) setFocusedIndex(-1);
  }, [open]);

  // When a selection changes while open, clamp focusedIndex to remaining list size
  useEffect(() => {
    if (!open) return;
    const unselectedCount = options.filter((o) => !selected.includes(o.id)).length;
    setFocusedIndex((i) => (i >= unselectedCount ? Math.max(0, unselectedCount - 1) : i));
  }, [selected, open, options]);

  function toggleOption(id: string) {
    if (selected.includes(id)) {
      onChange(selected.filter((s) => s !== id));
    } else {
      onChange([...selected, id]);
    }
  }

  function removeChip(id: string) {
    onChange(selected.filter((s) => s !== id));
    setOpen(true);   // reopen dropdown immediately so removed option reappears
    setFocusedIndex(-1);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
    const unselected = options.filter((o) => !selected.includes(o.id));
    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        if (!open) {
          setOpen(true);
          setFocusedIndex(0);
        } else {
          setFocusedIndex((i) => Math.min(i + 1, unselected.length - 1));
        }
        break;

      case "ArrowUp":
        e.preventDefault();
        if (open) {
          setFocusedIndex((i) => Math.max(i - 1, 0));
        }
        break;

      case "Enter":
      case " ":
        e.preventDefault();
        if (!open) {
          setOpen(true);
          setFocusedIndex(0);
        } else if (focusedIndex >= 0 && focusedIndex < unselected.length) {
          toggleOption(unselected[focusedIndex].id);
        }
        break;

      case "Backspace":
      case "Delete":
        if (selected.length > 0) {
          onChange(selected.slice(0, -1));
          setOpen(true);   // show dropdown with the now-removed option
          setFocusedIndex(-1);
        }
        break;

      case "Tab":
      case "Escape":
        setOpen(false);
        setFocusedIndex(-1);
        break;
    }
  }

  return (
    <div ref={containerRef} className="relative">
      {/* Trigger box */}
      <div
        role="combobox"
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-activedescendant={focusedIndex >= 0 ? `slot-opt-${options.filter((o) => !selected.includes(o.id))[focusedIndex]?.id}` : undefined}
        tabIndex={0}
        onKeyDown={handleKeyDown}
        onClick={() => {
          setOpen((v) => !v);
          if (!open) setFocusedIndex(-1);
        }}
        className={cn(
          "flex min-h-[38px] w-full cursor-pointer flex-wrap items-center gap-1 rounded-md border bg-white px-3 py-1.5 text-sm shadow-sm transition-colors focus:outline-none focus-visible:ring-1 focus-visible:ring-primary",
          hasError ? "border-red-500" : "border-input",
          open && "ring-1 ring-primary border-primary",
        )}
      >
        {selected.length === 0 && (
          <span className="text-muted-foreground">{placeholder}</span>
        )}
        {selected.map((id) => {
          const opt = options.find((o) => o.id === id);
          return (
            <span
              key={id}
              className="inline-flex items-center gap-1 rounded bg-primary px-2 py-0.5 text-xs font-medium text-white"
            >
              {opt?.label ?? id}
              <button
                type="button"
                aria-label={`Remove ${opt?.label}`}
                tabIndex={-1}
                onPointerDown={(e) => {
                  e.stopPropagation();
                  removeChip(id);
                }}
                className="ml-0.5 rounded-full hover:bg-white/20 focus:outline-none"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          );
        })}
        <ChevronDown
          className={cn(
            "ml-auto h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-150",
            open && "rotate-180",
          )}
        />
      </div>

      {/* Dropdown — only shows unselected options */}
      {open && (() => {
        const unselected = options.filter((o) => !selected.includes(o.id));
        if (unselected.length === 0) return null;
        return (
          <ul
            ref={listRef}
            role="listbox"
            aria-multiselectable="true"
            className="absolute z-50 mt-1 w-full overflow-hidden rounded-md border bg-white shadow-md"
          >
            {unselected.map((opt, idx) => {
              const isFocused = focusedIndex === idx;
              return (
                <li
                  key={opt.id}
                  id={`slot-opt-${opt.id}`}
                  role="option"
                  aria-selected={false}
                  onPointerDown={(e) => {
                    e.preventDefault(); // prevent blur on trigger
                    e.stopPropagation(); // prevent click bubbling to trigger's onClick
                    setFocusedIndex(idx);
                    toggleOption(opt.id);
                    setOpen(true); // keep dropdown open — remaining options stay visible
                  }}
                  onPointerEnter={() => setFocusedIndex(idx)}
                  className={cn(
                    "flex cursor-pointer select-none items-center px-3 py-2 text-sm transition-colors",
                    isFocused ? "bg-primary text-white" : "text-gray-800 hover:bg-primary/10",
                  )}
                >
                  {opt.label}
                </li>
              );
            })}
          </ul>
        );
      })()}
    </div>
  );
}


