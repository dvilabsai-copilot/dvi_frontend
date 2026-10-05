import React, { useEffect, useId, useRef, useState } from "react";

type Props = {
  label: string;
  options: Array<{ id: string; name: string }>;
  selected: string[];
  disabled?: boolean;
  onChange: (ids: string[]) => void;
};

export default function TollLocationSelect({
  label, options, selected, disabled = false, onChange,
}: Props) {
  const id = useId();
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<string[]>([]);
  const [search, setSearch] = useState("");
  const displayed = open ? draft : selected;
  const visible = options.filter((option) =>
    option.name.toLocaleLowerCase().includes(search.trim().toLocaleLowerCase())
  );

  const finish = (focus = false) => {
    setOpen(false);
    setSearch("");
    if (!disabled && JSON.stringify(draft) !== JSON.stringify(selected)) {
      onChange(draft);
    }
    if (focus) trigger.current?.focus();
  };

  useEffect(() => {
    if (!open) return;
    const outside = (event: PointerEvent) => {
      if (event.target instanceof Node && !root.current?.contains(event.target)) {
        finish();
      }
    };
    document.addEventListener("pointerdown", outside);
    return () => document.removeEventListener("pointerdown", outside);
  }, [open, draft, selected, disabled, onChange]);

  return (
    <div ref={root} className="relative min-w-0">
      <div id={id + "-label"} className="mb-1 text-xs font-medium text-gray-600">
        {label} ({displayed.length}/20)
      </div>
      <button
        ref={trigger}
        type="button"
        disabled={disabled}
        aria-labelledby={id + "-label"}
        aria-expanded={open}
        aria-controls={id + "-panel"}
        onClick={() => {
          if (open) finish(true);
          else {
            setDraft([...selected]);
            setSearch("");
            setOpen(true);
          }
        }}
        className="flex w-full items-center justify-between rounded-lg border border-gray-300 bg-white px-3 py-2 text-left text-sm disabled:opacity-50"
      >
        <span>{displayed.length ? displayed.length + " selected" : "Select " + label.toLowerCase()}</span>
        <span aria-hidden="true">{open ? "\u25B4" : "\u25BE"}</span>
      </button>

      {open && (
        <div
          id={id + "-panel"}
          className="absolute left-0 right-0 z-30 mt-1 rounded-lg border border-gray-200 bg-white p-3 shadow-lg"
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              event.preventDefault();
              setOpen(false);
              setSearch("");
              trigger.current?.focus();
            }
          }}
        >
          <label htmlFor={id + "-search"} className="sr-only">Search {label}</label>
          <input
            autoFocus
            id={id + "-search"}
            type="search"
            value={search}
            disabled={disabled}
            onChange={(event) => setSearch(event.target.value)}
            placeholder={"Search " + label.toLowerCase()}
            className="mb-2 w-full rounded border px-3 py-2 text-sm"
          />
          <div className="max-h-56 overflow-y-auto">
            {visible.map((option) => {
              const checked = draft.includes(option.id);
              return (
                <label key={option.id} className="flex items-center gap-2 rounded px-2 py-2 text-sm hover:bg-purple-50">
                  <input
                    type="checkbox"
                    checked={checked}
                    disabled={disabled || (!checked && draft.length >= 20)}
                    onChange={() => setDraft((current) =>
                      current.includes(option.id)
                        ? current.filter((value) => value !== option.id)
                        : current.length < 20 ? [...current, option.id] : current
                    )}
                  />
                  <span>{option.name}</span>
                </label>
              );
            })}
            {!visible.length && <p className="p-2 text-sm text-gray-500">No matches.</p>}
          </div>
          <div className="mt-3 flex items-center justify-between border-t pt-3">
            <span className="text-xs text-gray-500">{draft.length}/20 selected</span>
            <button
              type="button"
              disabled={disabled}
              onClick={() => finish(true)}
              className="rounded-md bg-purple-700 px-4 py-2 text-sm text-white disabled:opacity-50"
            >
              Done
            </button>
          </div>
        </div>
      )}

      <div className="mt-2 flex flex-wrap gap-2">
        {displayed.map((value) => {
          const name = options.find((option) => option.id === value)?.name ?? String(value);
          return (
            <span key={value} className="inline-flex max-w-full items-center gap-2 rounded-md bg-purple-100 px-2 py-1 text-xs text-purple-800">
              <span className="break-words">{name}</span>
              <button
                type="button"
                disabled={disabled}
                aria-label={"Remove " + name}
                onClick={() => {
                  if (open) setDraft((current) => current.filter((item) => item !== value));
                  else onChange(selected.filter((item) => item !== value));
                }}
                className="rounded px-1 text-base font-bold disabled:opacity-50"
              >
                &times;
              </button>
            </span>
          );
        })}
      </div>
    </div>
  );
}
