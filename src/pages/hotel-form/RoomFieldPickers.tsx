import React, { useEffect, useMemo, useRef, useState } from "react";

export type RoomOption = { id: number | string; name: string };

export function AmenityPicker({
  options,
  value,
  onChange,
  placeholder = "Choose amenities",
}: {
  options: RoomOption[];
  value: (number | string)[];
  onChange: (ids: (number | string)[]) => void;
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const sub = (event: MouseEvent) => {
      if (!ref.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", sub);
    return () => document.removeEventListener("mousedown", sub);
  }, []);

  const filtered = useMemo(() => {
    const search = q.trim().toLowerCase();
    return search ? options.filter((option) => option.name.toLowerCase().includes(search)) : options;
  }, [q, options]);

  const add = (id: number | string) => {
    if (!value.includes(id)) onChange([...value, id]);
    setQ("");
    setOpen(false);
  };

  const remove = (id: number | string) => onChange(value.filter((item) => String(item) !== String(id)));

  return (
    <div ref={ref} className="relative">
      <div
        className="min-h-[38px] w-full border rounded-lg px-2 py-1 flex flex-wrap gap-1 cursor-text"
        onClick={() => setOpen(true)}
      >
        {value.length === 0 && <span className="text-gray-400 text-sm px-1 py-1">{placeholder}</span>}
        {value.map((id) => {
          const option = options.find((item) => String(item.id) === String(id));
          return (
            <span key={String(id)} className="inline-flex items-center gap-1 text-xs border rounded-full px-2 py-1 bg-gray-50">
              {option?.name ?? id}
              <button type="button" className="leading-none text-gray-500 hover:text-gray-700" onClick={() => remove(id)}>
                Ã—
              </button>
            </span>
          );
        })}
        <input
          className="flex-1 outline-none text-sm px-1 py-1"
          value={q}
          onChange={(event) => setQ(event.target.value)}
          onFocus={() => setOpen(true)}
        />
      </div>

      {open && (
        <div className="absolute z-10 mt-1 w-full max-h-48 overflow-auto border rounded-lg bg-white shadow">
          {filtered.length === 0 ? (
            <div className="px-3 py-2 text-sm text-gray-500">No results</div>
          ) : (
            filtered.map((option) => (
              <button key={String(option.id)} type="button" onClick={() => add(option.id)} className="block w-full text-left px-3 py-2 hover:bg-purple-50">
                {option.name}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}

function highlightMatch(label: string, query: string) {
  if (!query) return [label];
  const index = label.toLowerCase().indexOf(query.toLowerCase());
  if (index === -1) return [label];
  return [label.slice(0, index), label.slice(index, index + query.length), label.slice(index + query.length)];
}

export function RoomTypeAutocomplete({
  value,
  onChange,
  options,
  placeholder = "Type room typeâ€¦",
  dropdownId,
}: {
  value: string;
  onChange: (value: string) => void;
  options: RoomOption[];
  placeholder?: string;
  dropdownId: string;
}) {
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState(value ?? "");
  const [active, setActive] = React.useState(0);
  const wrapRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const onDoc = (event: MouseEvent) => {
      if (!wrapRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  React.useEffect(() => setQuery(value ?? ""), [value]);

  const filtered = React.useMemo(() => {
    const search = query.trim().toLowerCase();
    const optionsForQuery = search ? options.filter((option) => option.name.toLowerCase().includes(search)) : options;
    return optionsForQuery.slice(0, 8);
  }, [query, options]);

  const selectValue = (name: string) => {
    onChange(name);
    setOpen(false);
  };

  return (
    <div ref={wrapRef} className="relative">
      <input
        className="mt-1 w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-purple-400 outline-none"
        placeholder={placeholder}
        value={query}
        onChange={(event) => {
          setQuery(event.target.value);
          onChange(event.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={(event) => {
          if (!open && (event.key === "ArrowDown" || event.key === "ArrowUp")) {
            setOpen(true);
            return;
          }
          if (!filtered.length) return;
          if (event.key === "ArrowDown") {
            event.preventDefault();
            setActive((previous) => (previous + 1) % filtered.length);
          } else if (event.key === "ArrowUp") {
            event.preventDefault();
            setActive((previous) => (previous - 1 + filtered.length) % filtered.length);
          } else if (event.key === "Enter") {
            event.preventDefault();
            selectValue(filtered[active].name);
          } else if (event.key === "Escape") {
            setOpen(false);
          }
        }}
        aria-controls={dropdownId}
        aria-expanded={open}
        aria-autocomplete="list"
        role="combobox"
      />

      {open && filtered.length > 0 && (
        <div id={dropdownId} className="absolute z-20 mt-1 w-full max-h-64 overflow-auto border rounded-lg bg-white shadow" role="listbox">
          {filtered.map((option, index) => {
            const parts = highlightMatch(option.name, query);
            return (
              <button
                key={String(option.id)}
                type="button"
                role="option"
                aria-selected={index === active}
                className={`w-full text-left px-3 py-2 text-sm hover:bg-purple-50 ${index === active ? "bg-purple-50" : ""}`}
                onMouseEnter={() => setActive(index)}
                onClick={() => selectValue(option.name)}
              >
                {parts.map((part, partIndex) => part.toLowerCase() === query.toLowerCase() && query ? <span key={partIndex} className="font-semibold">{part}</span> : <span key={partIndex}>{part}</span>)}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
