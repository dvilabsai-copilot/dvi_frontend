// FILE: src/components/AutoSuggestSelect.tsx

import React, {
  useEffect,
  useLayoutEffect,
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
import { createPortal } from "react-dom";

export type AutoSuggestOption = {
  value: string;
  label: string;
  searchText?: string;
};

type AutoSuggestSelectProps = {
  mode: "single" | "multi";
  value: string | string[];
  onChange: (value: string | string[]) => void;
  options: AutoSuggestOption[];
  placeholder?: string;
  maxSelected?: number;

  /*
    Optional multi-select presentation.

    When enabled, every selected value remains visible as
    a chip inside the closed trigger instead of displaying
    only "2 selected", "3 selected", etc.

    Default false keeps all existing consumers unchanged.
  */
  showSelectedChipsInTrigger?: boolean;

  onSelectionCommit?: (reason: "click" | "enter" | "tab") => void;
  onOpenChange?: (open: boolean) => void;
  disabled?: boolean;
  readOnly?: boolean;
  scrollToValue?: string;
  openOnFocus?: boolean;
  stackingZIndex?: number;
  noResultsMessage?: string;
  prioritizeMainLocation?: boolean;
  portalDropdown?: boolean;
  dropdownPlacement?: "auto" | "top" | "bottom";
};

function AutoSuggestDropdownHost({
  portal,
  children,
}: {
  portal: boolean;
  children: React.ReactNode;
}) {
  return portal ? createPortal(children, document.body) : <>{children}</>;
}

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
      showSelectedChipsInTrigger = false,
      onSelectionCommit,
      onOpenChange,
      disabled = false,
      readOnly = false,
      scrollToValue,
     openOnFocus = true,
stackingZIndex = 50,
noResultsMessage = "No results",
prioritizeMainLocation = false,
portalDropdown = false,
dropdownPlacement = "auto",
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
  const dropdownRef = useRef<HTMLDivElement | null>(null);
  const [portalStyle, setPortalStyle] = useState<React.CSSProperties>({
    position: "fixed",
    visibility: "hidden",
    zIndex: 2500,
  });

  const updateOpen = (nextOpen: boolean) => {
    setOpen(nextOpen);
    onOpenChange?.(nextOpen);
  };

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

  // DVI_LOCATION_MAIN_FIRST_ALL_V1
  const filteredOptions = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;

    const terms = q.split(/\s+/).filter(Boolean);

    const matches = options.filter((opt) => {
      const text = `${opt.label} ${opt.value} ${opt.searchText ?? ""}`.toLowerCase();
      return terms.every((term) => text.includes(term));
    });

    const isLocationField = prioritizeMainLocation;

    if (!isLocationField) return matches;

    const normalize = (name: string) =>
      name.trim().toLowerCase().replace(/\s+/g, " ");

    const rank = (name: string) => {
      const text = normalize(name);
      if (text === q) return 0;
      if (text.startsWith(q)) return 1;
      return 2;
    };

    return matches
      .map((option, index) => ({ option, index }))
      .sort((a, b) => {
        const aName = normalize(a.option.label);
        const bName = normalize(b.option.label);

        const aRank = rank(aName);
        const bRank = rank(bName);

        if (aRank !== bRank) return aRank - bRank;

        // Among prefix matches, the main city is usually shorter.
        if (aRank <= 1 && aName.length !== bName.length) {
          return aName.length - bName.length;
        }

        return a.index - b.index;
      })
      .map(({ option }) => option);
  }, [options, query, prioritizeMainLocation]);

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

    return () => {
      clearTimeout(id);
    };
  } else {
    setQuery("");
    setHighlightIndex(0);
  }
}, [open, mode, selectedValues, options, scrollToValue]);
  // DVI_TE_ROUTE_DESTINATION_PORTAL_V1
  // Opt-in floating dropdown for scrollable Travel Expert route tables.
  useLayoutEffect(() => {
    if (!open || !portalDropdown) return;

    const reposition = () => {
      const trigger = triggerRef.current;
      if (!trigger) return;

      const rect = trigger.getBoundingClientRect();
      const below = window.innerHeight - rect.bottom - 8;
      const above = rect.top - 8;
      const openUpwards = dropdownPlacement === "top" ||
        (dropdownPlacement === "auto" && below < 230 && above > below);

      const available = Math.max(
        80,
        (openUpwards ? above : below) - 6
      );

      const maxHeight = Math.min(230, available);
      const width = Math.min(rect.width, window.innerWidth - 16);
      const left = Math.max(
        8,
        Math.min(rect.left, window.innerWidth - width - 8)
      );

      const top = openUpwards ? undefined : rect.bottom + 4;
      const bottom = openUpwards
        ? Math.max(4, window.innerHeight - rect.top + 4)
        : undefined;

      setPortalStyle({
        position: "fixed",
        left,
        top,
        bottom,
        width,
        maxHeight,
        overflowY: "auto",
        visibility: "visible",
        zIndex: 2500,
      });
    };

    reposition();

    window.addEventListener("resize", reposition);
    // DVI_TE_ROUTE_SCROLL_CLOSE_V2
    // Close floating route dropdown when the page scrolls.
    // Keep scrolling inside the dropdown list functional.
    const closeOnPageScroll = (event: Event) => {
      const target = event.target;

      if (
        target instanceof Node &&
        dropdownRef.current?.contains(target)
      ) {
        return;
      }

      updateOpen(false);
    };

    window.addEventListener("scroll", closeOnPageScroll, true);

    return () => {
      window.removeEventListener("resize", reposition);
      window.removeEventListener("scroll", closeOnPageScroll, true);
    };
  }, [open, portalDropdown, dropdownPlacement]);

  // Close when clicking outside
  useEffect(() => {
    if (!open) return;
    const handleClick = (e: MouseEvent | globalThis.MouseEvent) => {
      if (
        wrapperRef.current &&
        !wrapperRef.current.contains(e.target as Node) &&
        !(portalDropdown && dropdownRef.current?.contains(e.target as Node))
      ) {
        updateOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick as EventListener);
    return () =>
      document.removeEventListener("mousedown", handleClick as EventListener);
  }, [open]);

  // Scroll highlighted option into view
useEffect(() => {
  if (!open) return;

  const el = optionRefs.current[highlightIndex];
  const container = el?.parentElement;

  if (el && container) {
    const topPadding = 30;
    const safeTopGap = 20;

    const scrollTop = Math.max(0, el.offsetTop - topPadding - safeTopGap);

    container.scrollTo({
      top: scrollTop,
      behavior: "smooth",
    });
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
      ? selectedValues.length === 1 ? renderLabelForValue(selectedValues[0]) : `${selectedValues.length} selected`
      : "";

  const openDropdown = () => {
    if (!disabled && !readOnly) {
      updateOpen(true);
    }
  };
  const closeDropdown = () => updateOpen(false);

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
    <div
      ref={wrapperRef}
      className={open ? "relative isolate" : "relative"}
      style={open ? { zIndex: stackingZIndex } : undefined}
    >
      {/* Trigger */}
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        className={`w-full px-3 flex items-center justify-between rounded-md border text-sm text-left ${
          mode === "multi" &&
          showSelectedChipsInTrigger &&
          selectedValues.length > 0
            ? "min-h-9 h-auto py-1.5"
            : "h-9"
        } ${
          disabled || readOnly
            ? "border-gray-300 bg-gray-100 cursor-not-allowed text-gray-500 opacity-60"
            : "border-[#e5d7f6] bg-white text-gray-900 cursor-pointer"
        }`}
        onClick={openDropdown}
        onKeyDown={handleTriggerKeyDown}
        onFocus={() => {
          // Allow consumers to control whether focus should auto-open options.
          if (openOnFocus && !open && !disabled && !readOnly) openDropdown();
        }}
      >
        <span
          className={
            triggerText
              ? "min-w-0 flex-1"
              : "min-w-0 flex-1 text-muted-foreground"
          }
        >
          {
            mode === "multi" &&
            showSelectedChipsInTrigger &&
            selectedValues.length > 0
              ? (
                  <span
                    data-autosuggest-selected-chips
                    className="flex flex-wrap gap-1"
                  >
                    {selectedValues.map(
                      (val) => (
                        <span
                          key={
                            "trigger-chip-" +
                            val
                          }
                          className="inline-flex max-w-full items-center rounded-full border border-[#dfc9fa] bg-[#f7f0ff] px-2 py-0.5 text-xs font-semibold text-[#6736a8]"
                        >
                          <span className="truncate">
                            {
                              renderLabelForValue(
                                val,
                              )
                            }
                          </span>
                        </span>
                      ),
                    )}
                  </span>
                )
              : (
                  triggerText ||
                  placeholder
                )
          }
        </span>

        <ChevronDown className="h-3 w-3 shrink-0 ml-2" />
      </button>

      {/* Dropdown */}
      {open && (
        <AutoSuggestDropdownHost portal={portalDropdown}>
          <div
            ref={dropdownRef}
            className={portalDropdown
              ? "rounded-md border border-[#f0e7ff] bg-white shadow-lg p-2"
              : "absolute left-0 right-0 top-full mt-1 z-[9999] rounded-md border border-[#f0e7ff] bg-white shadow-sm p-2"}
            style={portalDropdown ? portalStyle : undefined}
          >
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
    {query.trim() ? noResultsMessage : "No results"}
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
        </AutoSuggestDropdownHost>
      )}
    </div>
  );
}
);

AutoSuggestSelect.displayName = "AutoSuggestSelect";

export default AutoSuggestSelect;

