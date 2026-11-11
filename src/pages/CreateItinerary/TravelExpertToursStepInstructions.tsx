// DVI_TE_TOURS_REQUIRED_STARS_STEPS_V1
// Tours & Attractions only. Keeps the existing specialInstructions string API.
import { useEffect, useLayoutEffect, useRef } from "react";

type Props = {
  value: string;
  onChange: (value: string) => void;
};

export function TravelExpertToursStepInstructions({ value, onChange }: Props) {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const text = String(value ?? "");

  // DVI_TE_TOURS_NIL_DEFAULT_EDITABLE_20261106
  // Apply once on an initially blank Tours form. Never overwrite user edits or
  // saved instructions that are subsequently loaded by the parent.
  const initializedDefaultRef = useRef(false);
  useEffect(() => {
    if (initializedDefaultRef.current) return;
    initializedDefaultRef.current = true;
    if (!String(value ?? "").trim()) {
      onChange("1. nil");
    }
  }, [value, onChange]);

  useLayoutEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "44px";
    el.style.height = `${Math.min(Math.max(el.scrollHeight, 44), 176)}px`;
  }, [text]);

  const setWithCaret = (next: string, caret: number) => {
    onChange(next);
    window.requestAnimationFrame(() => {
      const el = textareaRef.current;
      if (!el) return;
      el.focus();
      el.setSelectionRange(caret, caret);
    });
  };

  return (
    <textarea
      ref={textareaRef}
      rows={1}
      aria-label="Special Instructions: press Enter to add the next numbered step"
      value={text}
      onFocus={(event) => {
        // Select only "nil", preserving the "1. " prefix when typing.
        if (/^1\.\s*nil\s*$/i.test(text)) {
          const offset = text.toLowerCase().indexOf("nil");
          event.currentTarget.setSelectionRange(offset, offset + 3);
        }
      }}
      onChange={(event) => {
        const next = event.target.value;
        if (!text && next && !/^\s*1\.\s/.test(next)) {
          // Add Step 1 on the first typed character, without modifying the
          // value until the user actually types something.
          const prefixed = `1. ${next}`;
          setWithCaret(prefixed, event.target.selectionStart + 3);
          return;
        }
        onChange(next);
      }}
      onKeyDown={(event) => {
        if (event.key !== "Enter" || event.shiftKey || event.nativeEvent.isComposing) return;
        // If "nil" is preselected, Enter should append step 2 instead of
        // treating the first numbered line as empty.
        if (/^1\.\s*nil\s*$/i.test(text) &&
            event.currentTarget.selectionStart !== event.currentTarget.selectionEnd) {
          event.preventDefault();
          const next = `${text}\n2. `;
          setWithCaret(next, next.length);
          return;
        }
        event.preventDefault();
        const el = event.currentTarget;
        const before = text.slice(0, el.selectionStart);
        const after = text.slice(el.selectionEnd);
        const currentLine = before.split("\n").pop() || "";
        // Do not generate an empty next step when the current one is blank.
        if (/^\s*\d+\.\s*$/.test(currentLine)) return;
        const stepNumbers = Array.from(before.matchAll(/(?:^|\n)\s*(\d+)\.\s/g));
        const lastNumber = stepNumbers.length
          ? Number(stepNumbers[stepNumbers.length - 1][1])
          : 0;
        const insertion = `\n${lastNumber + 1}. `;
        setWithCaret(before + insertion + after, before.length + insertion.length);
      }}
      placeholder=""
      className="block h-11 min-h-11 max-h-44 w-full resize-none overflow-y-auto rounded-md border border-[#e5d7f6] bg-white px-3 py-2.5 text-[14px] font-semibold leading-6 text-slate-800 placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500"
    />
  );
}
