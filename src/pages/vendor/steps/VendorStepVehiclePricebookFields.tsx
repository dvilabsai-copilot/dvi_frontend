import React, { useEffect, useRef, useState } from "react";
import { ChevronDown, X } from "lucide-react";
import { format, isValid, parseISO } from "date-fns";
import { SharedDatePicker } from "@/components/SharedDatePicker";
import { cn } from "@/lib/utils";
import type { Option } from "../vendorFormTypes";

const toYmd = (date?: Date) => (date ? format(date, "yyyy-MM-dd") : "");

const toPickerDate = (value: string) => {
  if (!value) return undefined;
  const parsed = parseISO(value);
  return isValid(parsed) ? parsed : undefined;
};

const PricebookDatePicker = ({
  value,
  onChange,
  placeholder,
  defaultMonth,
  minDate,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  defaultMonth?: Date;
  minDate?: Date;
}) => {
  return (
    <SharedDatePicker
      label={placeholder}
      value={value}
      placeholder={placeholder}
      minDate={minDate}
      defaultMonth={defaultMonth}
      triggerClassName="h-10 w-36"
      parseValue={toPickerDate}
      formatValue={toYmd}
      onChange={onChange}
    />
  );
};
const VehicleTypeMultiSelect = ({
  options,
  selected,
  onChange,
  placeholder = "Choose Vehicle Type",
}: {
  options: Option[];
  selected: string[];
  onChange: (next: string[]) => void;
  placeholder?: string;
}) => {
  const [open, setOpen] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState<number>(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
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
  useEffect(() => {
    if (!open || focusedIndex < 0 || !listRef.current) return;
    const item = listRef.current.querySelectorAll<HTMLLIElement>("li")[focusedIndex];
    item?.scrollIntoView({ block: "nearest" });
  }, [focusedIndex, open]);
  useEffect(() => {
    if (open) setFocusedIndex(-1);
  }, [open]);
  useEffect(() => {
    if (!open) return;
    const unselectedCount = options.filter((o) => !selected.includes(o.id)).length;
    setFocusedIndex((index) =>
      index >= unselectedCount ? Math.max(0, unselectedCount - 1) : index,
    );
  }, [selected, open, options]);
  const toggleOption = (id: string) => {
    if (selected.includes(id)) {
      onChange(selected.filter((value) => value !== id));
      return;
    }
    onChange([...selected, id]);
  };
  const removeChip = (id: string) => {
    onChange(selected.filter((value) => value !== id));
    setOpen(true);
    setFocusedIndex(-1);
  };
  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const unselected = options.filter((o) => !selected.includes(o.id));
    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        if (!open) {
          setOpen(true);
          setFocusedIndex(0);
        } else {
          setFocusedIndex((index) => Math.min(index + 1, unselected.length - 1));
        }
        break;
      case "ArrowUp":
        e.preventDefault();
        if (open) {
          setFocusedIndex((index) => Math.max(index - 1, 0));
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
          setOpen(true);
          setFocusedIndex(-1);
        }
        break;
      case "Tab":
      case "Escape":
        setOpen(false);
        setFocusedIndex(-1);
        break;
    }
  };
  return (
    <div ref={containerRef} className="relative">
      <div
        role="combobox"
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-activedescendant={
          focusedIndex >= 0
            ? `vehicle-type-opt-${options.filter((o) => !selected.includes(o.id))[focusedIndex]?.id}`
            : undefined
        }
        tabIndex={0}
        onKeyDown={handleKeyDown}
        onClick={() => {
          setOpen((value) => !value);
          if (!open) setFocusedIndex(-1);
        }}
        className={cn(
          "flex min-h-[38px] w-full cursor-pointer flex-wrap items-center gap-1 rounded-md border bg-white px-3 py-1.5 text-sm shadow-sm transition-colors focus:outline-none focus-visible:ring-1 focus-visible:ring-primary",
          "border-input",
          open && "border-primary ring-1 ring-primary",
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
                aria-label={`Remove ${opt?.label ?? id}`}
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
      {open && (() => {
        const unselected = options.filter((o) => !selected.includes(o.id));
        if (unselected.length === 0) return null;
        return (
          <ul
            ref={listRef}
            role="listbox"
            aria-multiselectable="true"
            className="absolute z-50 mt-1 max-h-64 w-full overflow-auto rounded-md border bg-white shadow-md"
          >
            {unselected.map((opt, index) => {
              const isFocused = focusedIndex === index;
              return (
                <li
                  key={opt.id}
                  id={`vehicle-type-opt-${opt.id}`}
                  role="option"
                  aria-selected={false}
                  onPointerDown={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setFocusedIndex(index);
                    toggleOption(opt.id);
                    setOpen(true);
                  }}
                  onPointerEnter={() => setFocusedIndex(index)}
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
};


export { PricebookDatePicker, VehicleTypeMultiSelect };
