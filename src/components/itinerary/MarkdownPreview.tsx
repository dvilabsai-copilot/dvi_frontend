import React from "react";
import { cn } from "@/lib/utils";

function renderInline(text: string): React.ReactNode[] {
  const parts = text.split(/(`[^`]+`|\*\*[^*]+\*\*)/g);

  return parts
    .filter(Boolean)
    .map((part, index) => {
      if (/^`[^`]+`$/.test(part)) {
        return (
          <code
            key={`${index}-${part}`}
            className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[0.92em] text-slate-800"
          >
            {part.slice(1, -1)}
          </code>
        );
      }

      if (/^\*\*[^*]+\*\*$/.test(part)) {
        return (
          <strong key={`${index}-${part}`} className="font-semibold text-slate-900">
            {part.slice(2, -2)}
          </strong>
        );
      }

      return <React.Fragment key={`${index}-${part}`}>{part}</React.Fragment>;
    });
}

export function MarkdownPreview({
  markdown,
  className,
}: {
  markdown: string;
  className?: string;
}) {
  const lines = String(markdown || "").split(/\r?\n/);
  const blocks: React.ReactNode[] = [];
  let codeLines: string[] | null = null;
  let codeBlockIndex = 0;

  const flushCode = () => {
    if (!codeLines) return;
    const key = `code-${codeBlockIndex += 1}`;
    blocks.push(
      <pre
        key={key}
        className="overflow-x-auto rounded-xl border border-slate-200 bg-slate-950 p-4 text-sm leading-6 text-slate-100"
      >
        <code>{codeLines.join("\n")}</code>
      </pre>,
    );
    codeLines = null;
  };

  lines.forEach((line, index) => {
    const trimmed = line.trimEnd();

    if (trimmed.startsWith("```")) {
      if (codeLines) {
        flushCode();
      } else {
        codeLines = [];
      }
      return;
    }

    if (codeLines) {
      codeLines.push(line);
      return;
    }

    if (!trimmed) {
      blocks.push(<div key={`spacer-${index}`} className="h-3" />);
      return;
    }

    const heading = trimmed.match(/^(#{1,3})\s+(.*)$/);
    if (heading) {
      const level = heading[1].length;
      const text = heading[2];
      const baseClass =
        level === 1
          ? "text-3xl font-bold text-slate-950"
          : level === 2
            ? "text-2xl font-bold text-slate-950"
            : "text-xl font-semibold text-slate-900";
      const Tag = level === 1 ? "h1" : level === 2 ? "h2" : "h3";
      blocks.push(
        <Tag key={`heading-${index}`} className={cn(baseClass, "scroll-mt-6")}>
          {renderInline(text)}
        </Tag>,
      );
      return;
    }

    const quote = trimmed.match(/^>\s?(.*)$/);
    if (quote) {
      blocks.push(
        <div
          key={`quote-${index}`}
          className="rounded-lg border-l-4 border-[#d546ab] bg-[#fff7fb] px-4 py-3 text-sm leading-6 text-slate-700"
        >
          {renderInline(quote[1])}
        </div>,
      );
      return;
    }

    const ordered = trimmed.match(/^(\d+)\.\s+(.*)$/);
    if (ordered) {
      blocks.push(
        <div key={`ordered-${index}`} className="flex gap-3 pl-1 text-sm leading-7 text-slate-700">
          <span className="min-w-6 font-semibold text-slate-900">{ordered[1]}.</span>
          <span className="flex-1">{renderInline(ordered[2])}</span>
        </div>,
      );
      return;
    }

    const bullet = trimmed.match(/^[-*]\s+(.*)$/);
    if (bullet) {
      blocks.push(
        <div key={`bullet-${index}`} className="flex gap-3 pl-1 text-sm leading-7 text-slate-700">
          <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[#d546ab]" />
          <span className="flex-1">{renderInline(bullet[1])}</span>
        </div>,
      );
      return;
    }

    blocks.push(
      <p key={`para-${index}`} className="text-sm leading-7 text-slate-700">
        {renderInline(trimmed)}
      </p>,
    );
  });

  flushCode();

  return <div className={cn("space-y-3", className)}>{blocks}</div>;
}
