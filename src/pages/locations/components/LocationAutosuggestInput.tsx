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
  const optionRefs = useRef<(HTMLDivElement | null)[]>([]);

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

            const normalizedPhrase = phrase.trim().toLowerCase();

            let finalItems = Array.isArray(result) ? [...result] : [];

            // Merge filtered defaultItems (locations starting with typed phrase)
            if (defaultItems.length > 0) {
              const filtered = defaultItems.filter((item) =>
                item.toLowerCase().startsWith(normalizedPhrase)
              );
              for (const item of filtered) {
                if (!finalItems.some((f) => f.toLowerCase() === item.toLowerCase())) {
                  finalItems.push(item);
                }
              }
            }

            // ✅ ALWAYS include typed value (IMPORTANT FIX)
            if (normalizedPhrase) {
              const alreadyExists = finalItems.some(
                (item) => item.toLowerCase() === normalizedPhrase
              );

              if (!alreadyExists) {
                finalItems.unshift(phrase); // 👈 this fixes Chennai missing
              }
            }

            // ✅ sort properly
            finalItems.sort((a, b) => {
              const aText = a.toLowerCase();
              const bText = b.toLowerCase();

              if (aText === normalizedPhrase) return -1;
              if (bText === normalizedPhrase) return 1;

              if (aText.startsWith(normalizedPhrase)) return -1;
              if (bText.startsWith(normalizedPhrase)) return 1;

              return aText.localeCompare(bText);
            });

            setItems(finalItems);
            if (suppressNextOpenRef.current) {
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
    },0);

    return () => {
      if (debounceRef.current) {
        window.clearTimeout(debounceRef.current);
        debounceRef.current = null;
      }
    };
  }, [search, value]);

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
    onValueChange(text);
    setOpen(false);
    setHighlightIndex(-1);
  };

  return (
    <div className="relative">
      <Input
        placeholder={placeholder}
        value={value}
        onChange={(e) => onValueChange(e.target.value)}
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
                setItems(Array.isArray(result) ? result : []);
                setOpen(true);
                setHighlightIndex(result.length > 0 ? 0 : -1);
              } catch {
                setItems([]);
              }
            } else if (items.length > 0) {
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
