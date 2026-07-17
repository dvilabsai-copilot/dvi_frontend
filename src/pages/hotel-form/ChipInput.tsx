import React, { useRef, useState } from "react";

export function ChipInput({
  value,
  onChange,
  placeholder,
  type,
}: {
  value: string[];
  onChange: (value: string[]) => void;
  placeholder?: string;
  type?: "phone" | "email";
}) {
  const [text, setText] = useState("");
  const boxRef = useRef<HTMLDivElement>(null);

  const add = (raw: string) => {
    const items = raw.split(/[,\s]+/).map((item) => item.trim()).filter(Boolean);
    if (!items.length) return;
    const next = [...value];
    for (const item of items) {
      if (type === "phone") {
        const phone = item.replace(/\D/g, "").slice(0, 10);
        if (!/^[6-9]\d{9}$/.test(phone)) continue;
        if (!next.includes(phone)) next.push(phone);
      } else if (type === "email") {
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(item)) continue;
        if (!next.includes(item)) next.push(item);
      } else if (!next.includes(item)) {
        next.push(item);
      }
    }
    onChange(next);
  };

  const handleKeyDown: React.KeyboardEventHandler<HTMLInputElement> = (event) => {
    const hasText = text.trim().length > 0;
    if (event.key === "Tab") {
      if (hasText) { add(text); setText(""); }
      return;
    }
    if (["Enter", ","].includes(event.key) || (event.key === " " && hasText)) {
      event.preventDefault(); add(text); setText("");
    } else if (event.key === "Backspace" && !hasText && value.length) {
      onChange(value.slice(0, -1));
    }
  };

  return (
    <div ref={boxRef} className="mt-1 w-full min-h-[42px] border rounded-lg px-2 py-2 flex flex-wrap gap-2 items-center" onClick={() => (boxRef.current?.querySelector("input") as HTMLInputElement | null)?.focus()}>
      {value.map((item, index) => <span key={`${item}-${index}`} className="inline-flex items-center gap-2 bg-gray-100 text-gray-800 rounded-md px-3 py-1">{item}<button type="button" aria-label="Remove" className="text-gray-500 hover:text-gray-800" onClick={() => onChange(value.filter((_, itemIndex) => itemIndex !== index))}>×</button></span>)}
      <input value={text} onChange={(event) => setText(type === "phone" ? event.target.value.replace(/\D/g, "").slice(0, 10) : event.target.value)} maxLength={type === "phone" ? 10 : undefined} onKeyDown={handleKeyDown} placeholder={placeholder} className="flex-1 min-w-[160px] outline-none bg-transparent" />
    </div>
  );
}
