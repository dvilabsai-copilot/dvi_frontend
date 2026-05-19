import { useEffect, useRef, useState } from "react";
import { Input } from "@/components/ui/input";

type LocationAutosuggestInputProps = {
  value: string;
  placeholder?: string;
  onValueChange: (value: string) => void;
  search: (phrase: string) => Promise<string[]>;
  defaultItems?: string[];
};

export function LocationAutosuggestInput({
  value,
  placeholder,
  onValueChange,
  search,
  defaultItems = [],
}: LocationAutosuggestInputProps) {
  const [items, setItems] = useState<string[]>([]);
  const [open, setOpen] = useState(false);
  const [highlightIndex, setHighlightIndex] = useState(-1);

  const debounceRef = useRef<number | null>(null);
  const requestSeqRef = useRef(0);
  const closeTimerRef = useRef<number | null>(null);
  const suppressNextOpenRef = useRef(false);
  const committedValueRef = useRef("");
  const optionRefs = useRef<(HTMLDivElement | null)[]>([]);

  const buildItems = (phrase: string, result: string[]) => {
    const normalizedPhrase = phrase.trim().toLowerCase();
    const finalItems = Array.isArray(result) ? [...result] : [];

    if (defaultItems.length > 0 && normalizedPhrase) {
      const filteredDefaults = defaultItems.filter((item) =>
        item.toLowerCase().startsWith(normalizedPhrase)
      );

      for (const item of filteredDefaults) {
        if (!finalItems.some((existing) => existing.toLowerCase() === item.toLowerCase())) {
          finalItems.push(item);
        }
      }
    }

    if (normalizedPhrase) {
      const exists = finalItems.some(
        (item) => item.toLowerCase() === normalizedPhrase
      );

      if (!exists) {
        finalItems.unshift(phrase);
      }
    }

    finalItems.sort((a, b) => {
      const aText = a.toLowerCase();
      const bText = b.toLowerCase();

      if (aText === normalizedPhrase) return -1;
      if (bText === normalizedPhrase) return 1;

      if (aText.startsWith(normalizedPhrase)) return -1;
      if (bText.startsWith(normalizedPhrase)) return 1;

      return aText.localeCompare(bText);
    });

    return finalItems;
  };

  useEffect(() => {
    if (debounceRef.current) {
      window.clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }

    const phrase = String(value ?? "");
    if (!phrase.trim()) {
      setItems([]);
      setOpen(false);
      setHighlightIndex(-1);
      return;
    }

    const requestId = ++requestSeqRef.current;

    debounceRef.current = window.setTimeout(async () => {
      try {
        const result = await search(phrase);
        if (requestId !== requestSeqRef.current) return;

        const finalItems = buildItems(phrase, result);
        setItems(finalItems);

        const normalizedPhrase = phrase.trim().toLowerCase();
        const keepClosedAfterSelection =
          normalizedPhrase.length > 0 &&
          committedValueRef.current.length > 0 &&
          committedValueRef.current === normalizedPhrase;

        if (suppressNextOpenRef.current || keepClosedAfterSelection) {
          setOpen(false);
          suppressNextOpenRef.current = false;
        } else {
          setOpen(true);
        }

        setHighlightIndex(finalItems.length > 0 ? 0 : -1);
      } catch {
        if (requestId !== requestSeqRef.current) return;
        setItems([]);
        setOpen(false);
        setHighlightIndex(-1);
      }
    }, 0);

    return () => {
      if (debounceRef.current) {
        window.clearTimeout(debounceRef.current);
        debounceRef.current = null;
      }
    };
  }, [defaultItems, search, value]);

  useEffect(() => {
    return () => {
      if (closeTimerRef.current) {
        window.clearTimeout(closeTimerRef.current);
      }
      if (debounceRef.current) {
        window.clearTimeout(debounceRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!open || highlightIndex < 0) return;

    const el = optionRefs.current[highlightIndex];
    if (!el) return;

    // Keep keyboard-highlighted option visible while moving through long lists.
    el.scrollIntoView({
      block: "nearest",
      behavior: "smooth",
    });
  }, [highlightIndex, open]);

  const selectItem = (text: string) => {
    suppressNextOpenRef.current = true;
    committedValueRef.current = text.trim().toLowerCase();
    onValueChange(text);
    setOpen(false);
    setHighlightIndex(-1);
  };

  return (
    <div className="relative">
      <Input
        placeholder={placeholder}
        value={value}
        onChange={(e) => {
          committedValueRef.current = "";
          onValueChange(e.target.value);
        }}
        onClick={() => {
          if (!open && value && items.length > 0) {
            setOpen(true);
          }
        }}

        onFocus={async () => {
          if (!value) {
            if (defaultItems.length > 0) {
              setItems(defaultItems);
              setOpen(true);
              setHighlightIndex(defaultItems.length > 0 ? 0 : -1);
              return;
            }

            try {
              const result = await search("");
              const nextItems = Array.isArray(result) ? result : [];
              setItems(nextItems);
              setOpen(true);
              setHighlightIndex(nextItems.length > 0 ? 0 : -1);
            } catch {
              setItems([]);
              setOpen(false);
              setHighlightIndex(-1);
            }
            return;
          }

          const normalizedCurrentValue = String(value ?? "").trim().toLowerCase();
          const selectedValueCommitted =
            committedValueRef.current.length > 0 &&
            committedValueRef.current === normalizedCurrentValue;

          if (items.length > 0 && !selectedValueCommitted) {
            setOpen(true);
          }
        }}

        onBlur={() => {
          if (closeTimerRef.current) {
            window.clearTimeout(closeTimerRef.current);
          }

          closeTimerRef.current = window.setTimeout(() => {
            setOpen(false);
            setHighlightIndex(-1);
          }, 120);
        }}
        onKeyDown={(e) => {
          if (!open || items.length === 0) {
            if (e.key === "Escape") {
              setOpen(false);
              setHighlightIndex(-1);
            }
            return;
          }

          if (e.key === "ArrowDown") {
            e.preventDefault();
            setHighlightIndex((prev) => (prev + 1 >= items.length ? 0 : prev + 1));
            return;
          }

          if (e.key === "ArrowUp") {
            e.preventDefault();
            setHighlightIndex((prev) => (prev - 1 < 0 ? items.length - 1 : prev - 1));
            return;
          }

          if (e.key === "Enter") {
            if (highlightIndex >= 0 && highlightIndex < items.length) {
              e.preventDefault();
              selectItem(items[highlightIndex]);
            }
            return;
          }

          if (e.key === "Escape") {
            e.preventDefault();
            setOpen(false);
            setHighlightIndex(-1);
          }
        }}
      />

      {open && items.length > 0 && (
        <div className="absolute z-50 mt-1 w-full rounded-md border border-[#f0e7ff] bg-white shadow-sm max-h-44 overflow-auto">
          {items.map((item, idx) => (
            <div
              key={`${item}-${idx}`}
              ref={(el) => {
                optionRefs.current[idx] = el;
              }}
              className={[
                "px-3 py-2 text-sm cursor-pointer hover:bg-purple-50",
                idx === highlightIndex ? "bg-purple-100 text-purple-900" : "",
              ]
                .filter(Boolean)
                .join(" ")}
              onMouseDown={(e) => {
                e.preventDefault();
                selectItem(item);
              }}
            >
              {item}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
