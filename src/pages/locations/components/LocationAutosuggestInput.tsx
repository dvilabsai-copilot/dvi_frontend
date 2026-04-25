import { useEffect, useRef, useState } from "react";
import { Input } from "@/components/ui/input";

type LocationAutosuggestInputProps = {
  value: string;
  placeholder?: string;
  onValueChange: (value: string) => void;
  search: (phrase: string) => Promise<string[]>;
};

export function LocationAutosuggestInput({
  value,
  placeholder,
  onValueChange,
  search,
}: LocationAutosuggestInputProps) {
  const [items, setItems] = useState<string[]>([]);
  const [open, setOpen] = useState(false);
  const [highlightIndex, setHighlightIndex] = useState(-1);

  const debounceRef = useRef<number | null>(null);
  const requestSeqRef = useRef(0);
  const closeTimerRef = useRef<number | null>(null);

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
            setOpen(true);
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

  const selectItem = (text: string) => {
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
       onFocus={async () => {
            if (!value) {
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
        <div className="absolute z-50 mt-1 w-full rounded-md border bg-white shadow-sm max-h-44 overflow-auto">
          {items.map((item, idx) => (
            <div
              key={`${item}-${idx}`}
              className={[
                "px-3 py-2 text-sm cursor-pointer",
                idx === highlightIndex ? "bg-gray-100" : "",
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
