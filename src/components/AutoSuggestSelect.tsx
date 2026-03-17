// FILE: src/components/AutoSuggestSelect.tsx

import React, {
  useEffect,
  useMemo,
  useRef,
  useState,
  KeyboardEvent,
  MouseEvent,
  forwardRef,
  useImperativeHandle,
} from "react";
import { Input } from "@/components/ui/input";
import { ChevronDown } from "lucide-react";

export type AutoSuggestOption = {
  value: string;
  label: string;
};

type AutoSuggestSelectProps = {
  mode: "single" | "multi";
  value: string | string[];
  onChange: (value: string | string[]) => void;
  options: AutoSuggestOption[];
  placeholder?: string;
  maxSelected?: number;
  onSelectionCommit?: (reason: "click" | "enter" | "tab") => void;
  disabled?: boolean;
  readOnly?: boolean;
  scrollToValue?: string;
};

export const AutoSuggestSelect = forwardRef<
  { focus: () => void },
  AutoSuggestSelectProps
>(
  (
    {
      mode,
      value,
      onChange,
      options,
      placeholder = "Select...",
      maxSelected,
      onSelectionCommit,
      disabled = false,
      readOnly = false,
      scrollToValue,
    },
    ref
  ) => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [highlightIndex, setHighlightIndex] = useState(0);

  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const optionRefs = useRef<(HTMLDivElement | null)[]>([]);

  // Expose focus method via ref
  useImperativeHandle(ref, () => ({
    focus: () => triggerRef.current?.focus(),
  }), []);

  const selectedValues: string[] = useMemo(
    () => (Array.isArray(value) ? value : value ? [value] : []),
    [value]
  );
  const selectedSet = useMemo(
    () => new Set(selectedValues),
    [selectedValues]
  );

  const filteredOptions = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter(
      (opt) =>
        opt.label.toLowerCase().includes(q) ||
        opt.value.toLowerCase().includes(q)
    );
  }, [options, query]);

  useEffect(() => {
  if (open) {
    const id = setTimeout(() => {
      inputRef.current?.focus();

      if (mode === "single") {
        const targetValue = selectedValues[0] || scrollToValue || "";
        const targetIndex = targetValue
          ? options.findIndex((opt) => opt.value === targetValue)
          : -1;

        setHighlightIndex(targetIndex >= 0 ? targetIndex : 0);
      } else {
        setHighlightIndex(0);
      }
    }, 0);

    return () => clearTimeout(id);
  } else {
    setQuery("");
    setHighlightIndex(0);
  }
}, [open, mode, selectedValues, options, scrollToValue]);
  // Close when clicking outside
  useEffect(() => {
    if (!open) return;
    const handleClick = (e: MouseEvent | globalThis.MouseEvent) => {
      if (
        wrapperRef.current &&
        !wrapperRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick as any);
    return () =>
      document.removeEventListener("mousedown", handleClick as any);
  }, [open]);

  // Scroll highlighted option into view
  useEffect(() => {
    if (!open) return;
    const el = optionRefs.current[highlightIndex];
    if (el) {
      el.scrollIntoView({ block: "nearest" });
    }
  }, [highlightIndex, open]);

  const renderLabelForValue = (val: string) => {
    const opt = options.find((o) => o.value === val);
    return opt ? opt.label : val;
  };

  const triggerText =
    mode === "single"
      ? selectedValues[0]
        ? renderLabelForValue(selectedValues[0])
        : ""
      : selectedValues.length
      ? selectedValues.map(renderLabelForValue).join(", ")
      : "";

  const openDropdown = () => {
    if (!disabled && !readOnly) {
      setOpen(true);
    }
  };
  const closeDropdown = () => setOpen(false);

  const handleSelect = (opt: AutoSuggestOption, reason: "click" | "enter" | "tab" = "click") => {
    if (mode === "single") {
      onChange(opt.value);
      closeDropdown(); // close only for single mode
      triggerRef.current?.focus();
      onSelectionCommit?.(reason);
    } else {
      const current = Array.isArray(value) ? [...value] : [];

      if (selectedSet.has(opt.value)) {
        const next = current.filter((v) => v !== opt.value);
        onChange(next);
      } else {
        if (maxSelected && current.length >= maxSelected) return;
        current.push(opt.value);
        onChange(current);
      }
      // DO NOT close dropdown in multi mode
    }
  };

  const handleTriggerKeyDown = (e: KeyboardEvent<HTMLButtonElement>) => {
    if (
      e.key === "ArrowDown" ||
      e.key === "ArrowUp" ||
      e.key === "Enter" ||
      e.key === " "
    ) {
      e.preventDefault();
      if (!open) {
        openDropdown();
      }
    }
    // Tab on trigger: let it move to next field, no special handling
  };

  const handleInputKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (!open) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (!filteredOptions.length) return;
      setHighlightIndex((prev) =>
        prev + 1 >= filteredOptions.length ? 0 : prev + 1
      );
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      if (!filteredOptions.length) return;
      setHighlightIndex((prev) =>
        prev - 1 < 0 ? filteredOptions.length - 1 : prev - 1
      );
    } else if (e.key === "Enter") {
      e.preventDefault();
      const opt = filteredOptions[highlightIndex];
      if (opt) {
        handleSelect(opt, "enter");
      }
    } else if (e.key === "Escape") {
      e.preventDefault();
      closeDropdown();
      triggerRef.current?.focus();
    } else if (e.key === "Tab") {
      // If dropdown is open and we have options, select highlighted option
      // and prevent default Tab so parent can move focus
      const opt = filteredOptions[highlightIndex];
      if (opt) {
        e.preventDefault();
        handleSelect(opt, "tab");
        // Parent will be responsible for moving focus to next field
        // We signal this via onSelectionCommit callback with reason "tab"
        return;
      }

      // If nothing to select, just close and allow tabbing
      closeDropdown();
    }
  };

  return (
    <div ref={wrapperRef} className="relative">
      {/* Trigger */}
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        className={`w-full h-9 px-3 flex items-center justify-between rounded-md border text-sm text-left ${
          disabled || readOnly
            ? "border-gray-300 bg-gray-100 cursor-not-allowed text-gray-500 opacity-60"
            : "border-[#e5d7f6] bg-white text-gray-900 cursor-pointer"
        }`}
        onClick={openDropdown}
        onKeyDown={handleTriggerKeyDown}
        onFocus={() => {
          // When tabbing into the field, open suggestions (unless disabled)
          if (!open && !disabled && !readOnly) openDropdown();
        }}
      >
        <span className={triggerText ? "" : "text-muted-foreground"}>
          {triggerText || placeholder}
        </span>
        <ChevronDown className="h-3 w-3 shrink-0 ml-2" />
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute left-0 right-0 mt-1 z-50 rounded-md border border-[#f0e7ff] bg-white shadow-sm p-2">
          <Input
            ref={inputRef}
            placeholder="Type to search..."
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setHighlightIndex(0);
            }}
            onKeyDown={handleInputKeyDown}
            className="h-8 text-sm mb-2"
          />

          {mode === "multi" && selectedValues.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-1">
              {selectedValues.map((val) => (
                <span
                  key={val}
                  className="px-2 py-0.5 rounded-full bg-purple-100 text-xs text-purple-700 flex items-center gap-1"
                >
                  {renderLabelForValue(val)}
                  <button
                    type="button"
                    onClick={() =>
                      onChange(selectedValues.filter((v) => v !== val))
                    }
                    className="text-[10px] leading-none"
                  >
                    ✕
                  </button>
                </span>
              ))}
            </div>
          )}

          <div className="max-h-40 overflow-y-auto border border-[#f0e7ff] rounded-md">
            {filteredOptions.length === 0 ? (
              <div className="px-3 py-2 text-xs text-muted-foreground">
                No results
              </div>
            ) : (
              filteredOptions.map((opt, idx) => {
                const selected = selectedSet.has(opt.value);
                const highlighted = idx === highlightIndex;

                return (
                  <div
                    key={opt.value}
                    ref={(el) => (optionRefs.current[idx] = el)}
                    onMouseDown={(e) => {
                      // prevent blur before click
                      e.preventDefault();
                      handleSelect(opt, "click");
                    }}
                    className={[
                      "px-3 py-1.5 text-sm cursor-pointer flex items-center justify-between",
                      highlighted ? "bg-purple-100" : "",
                      selected ? "font-medium" : "",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                  >
                    <span>{opt.label}</span>
                    {selected && (
                      <span className="text-[10px] text-purple-600">
                        ✓
                      </span>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
);

AutoSuggestSelect.displayName = "AutoSuggestSelect";

export default AutoSuggestSelect;
