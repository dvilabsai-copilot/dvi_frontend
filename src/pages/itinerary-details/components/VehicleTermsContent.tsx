import React, { useCallback, useLayoutEffect, useMemo, useRef, useState } from "react";
import { htmlToPlainText } from "../utils/htmlToPlainText.utils";

const allowedTags = new Set([
  "a", "b", "br", "em", "i", "li", "ol", "p", "s", "span", "strike", "strong", "u", "ul",
]);
const discardedTags = new Set(["script", "style", "iframe", "object", "embed", "svg", "math", "template"]);
const quillClassStyles: Record<string, string> = {
  "ql-align-center": "text-align: center",
  "ql-align-right": "text-align: right",
  "ql-align-justify": "text-align: justify",
  "ql-font-serif": "font-family: serif",
  "ql-font-monospace": "font-family: monospace",
  "ql-size-small": "font-size: 0.75em",
  "ql-size-large": "font-size: 1.5em",
  "ql-size-huge": "font-size: 2.5em",
};

const isSafeColor = (value: string) =>
  /^(#[\da-f]{3,8}|rgba?\([\d\s.,%]+\)|hsla?\([\d\s.,%deg]+\)|[a-z]{1,20})$/i.test(value);

const sanitizeStyle = (value: string): string => {
  const safeStyles: string[] = [];
  value.split(";").forEach((declaration) => {
    const separator = declaration.indexOf(":");
    if (separator < 0) return;
    const property = declaration.slice(0, separator).trim().toLowerCase();
    const styleValue = declaration.slice(separator + 1).trim();
    if (!styleValue || /url\s*\(|expression\s*\(/i.test(styleValue)) return;

    if (["color", "background-color"].includes(property) && isSafeColor(styleValue)) {
      safeStyles.push(`${property}: ${styleValue}`);
    } else if (property === "text-align" && ["left", "center", "right", "justify"].includes(styleValue.toLowerCase())) {
      safeStyles.push(`${property}: ${styleValue.toLowerCase()}`);
    } else if (property === "font-size" && /^(small|large|x-large|xx-large|\d+(?:\.\d+)?(?:px|pt|em|rem|%))$/i.test(styleValue)) {
      safeStyles.push(`${property}: ${styleValue}`);
    } else if (property === "font-family" && /^(serif|sans-serif|monospace|arial|georgia|times new roman|courier new)(\s*,\s*(serif|sans-serif|monospace|arial|georgia|times new roman|courier new))*$/i.test(styleValue.replace(/["']/g, ""))) {
      safeStyles.push(`${property}: ${styleValue.replace(/["']/g, "")}`);
    }
  });
  return safeStyles.join("; ");
};

const isSafeLink = (value: string): boolean => {
  try {
    const protocol = new URL(value, window.location.origin).protocol;
    return ["http:", "https:", "mailto:", "tel:"].includes(protocol);
  } catch {
    return false;
  }
};

const sanitizeNode = (node: Node, outputDocument: Document): Node | null => {
  if (node.nodeType === Node.TEXT_NODE) return outputDocument.createTextNode(node.textContent || "");
  if (!(node instanceof Element)) return null;

  const tagName = node.tagName.toLowerCase();
  if (discardedTags.has(tagName)) return null;
  if (!allowedTags.has(tagName)) {
    const fragment = outputDocument.createDocumentFragment();
    Array.from(node.childNodes).forEach((child) => {
      const safeChild = sanitizeNode(child, outputDocument);
      if (safeChild) fragment.appendChild(safeChild);
    });
    return fragment;
  }

  const element = outputDocument.createElement(tagName);
  if (tagName === "a") {
    const href = node.getAttribute("href") || "";
    if (href && isSafeLink(href)) element.setAttribute("href", href);
  }
  if (tagName === "li") {
    const listType = node.getAttribute("data-list");
    if (listType === "bullet" || listType === "ordered") {
      element.setAttribute("data-list", listType);
      element.style.listStyleType = listType === "bullet" ? "disc" : "decimal";
    }
  }

  const classStyles = (node.getAttribute("class") || "")
    .split(/\s+/)
    .map((className) => quillClassStyles[className])
    .filter(Boolean);
  const inlineStyle = sanitizeStyle(node.getAttribute("style") || "");
  const safeStyles = [inlineStyle, ...classStyles].filter(Boolean).join("; ");
  if (safeStyles) element.setAttribute("style", safeStyles);

  Array.from(node.childNodes).forEach((child) => {
    const safeChild = sanitizeNode(child, outputDocument);
    if (safeChild) element.appendChild(safeChild);
  });
  return element;
};

const sanitizeVehicleTermsHtml = (html: string): string => {
  if (typeof DOMParser === "undefined") return "";
  const parsed = new DOMParser().parseFromString(html, "text/html");
  const container = document.createElement("div");
  Array.from(parsed.body.childNodes).forEach((node) => {
    const safeNode = sanitizeNode(node, document);
    if (safeNode) container.appendChild(safeNode);
  });
  return container.innerHTML;
};

type VehicleTermsContentProps = { value?: string | null };

export const VehicleTermsContent: React.FC<VehicleTermsContentProps> = ({ value }) => {
  const raw = String(value || "").trim();
  const plainText = htmlToPlainText(raw);
  const containsMarkup = /<\/?[a-z][\s\S]*>/i.test(raw);
  const sanitizedHtml = useMemo(() => containsMarkup ? sanitizeVehicleTermsHtml(raw) : "", [containsMarkup, raw]);
  const contentRef = useRef<HTMLDivElement>(null);
  const [expanded, setExpanded] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const measureOverflow = useCallback(() => {
    const element = contentRef.current;
    if (!element || expanded) return;
    setHasMore(element.scrollHeight > element.clientHeight + 1);
  }, [expanded]);

  useLayoutEffect(() => {
    measureOverflow();
    const element = contentRef.current;
    if (!element || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(measureOverflow);
    observer.observe(element);
    return () => observer.disconnect();
  }, [measureOverflow, plainText, sanitizedHtml]);

  if (!plainText) return null;

  const contentClassName = `text-sm leading-6 [&_p]:mb-2 [&_ol]:my-2 [&_ol]:list-decimal [&_ol]:pl-5 [&_ul]:my-2 [&_ul]:list-disc [&_ul]:pl-5 [&_li]:my-1 [&_a]:text-blue-700 [&_a]:underline ${expanded ? "" : "max-h-24 overflow-hidden"}`;

  return (
    <section>
      <p className="mb-1 font-medium text-[#4a4260]">Vehicle Inclusions &amp; Exclusions</p>
      {containsMarkup && sanitizedHtml ? (
        <div
          ref={contentRef}
          className={contentClassName}
          dangerouslySetInnerHTML={{ __html: sanitizedHtml }}
        />
      ) : (
        <div ref={contentRef} className={`whitespace-pre-line text-sm leading-6 ${expanded ? "" : "max-h-24 overflow-hidden"}`}>
          {raw}
        </div>
      )}
      {hasMore && (
        <button
          type="button"
          className="mt-1 text-sm font-medium text-violet-700 hover:text-violet-900 hover:underline"
          aria-expanded={expanded}
          onClick={() => setExpanded((current) => !current)}
        >
          {expanded ? "... and less" : "... and more"}
        </button>
      )}
    </section>
  );
};
