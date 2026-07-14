import { useCallback } from "react";
import { ItineraryService } from "@/services/itinerary";
import { toast } from "sonner";

type ClipboardVariant = "recommended" | "highlights" | "para";

interface VehicleOnlyClipboardActionOptions {
  quoteId: string | null;
  itineraryPreference: number;
  replaceHighlightsHotspotDetailsHtml: (html: string, replacement: string) => string;
  buildHighlightsHotspotDetailsHtml: () => string;
  htmlToPlainText: (html: string) => string;
  copyHtmlToClipboard: (html: string, plainText: string) => Promise<void>;
}

const cleanVehicleOnlyB2BHtml = (rawHtml: string): string => {
  if (!rawHtml) return rawHtml;
  const parser = new DOMParser();
  const doc = parser.parseFromString(rawHtml, "text/html");
  doc.querySelectorAll("tr").forEach((row) => {
    const text = row.textContent?.replace(/\s+/g, " ").trim() || "";
    if (/^Recommended Hotel/i.test(text) || /^Hotel Details/i.test(text) || /^Total Room Cost/i.test(text) || /^Total Hotel Cost/i.test(text) || /^Total Hotel Amount/i.test(text) || /^Room Count\b/i.test(text)) row.remove();
  });
  doc.querySelectorAll("tr").forEach((row) => {
    const rowText = row.textContent?.replace(/\s+/g, " ").trim() || "";
    if (!/Total Vehicle Amount/i.test(rowText) || !/Total Vehicle Cost\s*\(/i.test(rowText)) return;
    const cells = Array.from(row.querySelectorAll("td, th"));
    if (!cells.length) return;
    const firstCell = cells[0];
    const amountCell = cells.find((cell) => /₹|â‚¹|Rs\.?|[0-9]+,[0-9]+|\d+\.\d{2}/i.test(cell.textContent?.replace(/\s+/g, " ").trim() || ""));
    firstCell.textContent = "Total Vehicle Amount";
    cells.forEach((cell) => {
      if (cell === firstCell || (amountCell && cell === amountCell)) return;
      if (/Total Vehicle Cost\s*\(/i.test(cell.textContent?.replace(/\s+/g, " ").trim() || "")) cell.remove();
    });
  });
  doc.querySelectorAll("td, th").forEach((cell) => {
    const text = cell.textContent?.replace(/\s+/g, " ").trim() || "";
    if (/Total Vehicle Amount/i.test(text) && /Total Vehicle Cost\s*\(/i.test(text)) cell.textContent = "Total Vehicle Amount";
    const hasContentElement = cell.querySelectorAll("table, img, a, span, div, p, b, strong").length > 0;
    const widthValue = Number(String(cell.getAttribute("width") || "").replace(/[^0-9.]/g, ""));
    if (!text && !hasContentElement && widthValue > 0 && widthValue <= 40) cell.remove();
  });
  return doc.body.innerHTML;
};

const moveHighlightSignatureBelow = (rawHtml: string): string => {
  if (!rawHtml) return rawHtml;
  const parser = new DOMParser();
  const doc = parser.parseFromString(rawHtml, "text/html");
  const signatureCell = Array.from(doc.querySelectorAll("td, th")).find((cell) => {
    const text = cell.textContent?.replace(/\s+/g, " ").trim() || "";
    return /Nisha/i.test(text) && /Sales Support/i.test(text) && /Mobile/i.test(text);
  });
  if (!signatureCell) return doc.body.innerHTML;
  const signatureHtml = signatureCell.innerHTML;
  const parentRow = signatureCell.closest("tr");
  const rowCells = parentRow ? Array.from(parentRow.querySelectorAll(":scope > td, :scope > th")) : [];
  if (parentRow && rowCells.length > 1) signatureCell.remove();
  const signatureWrapper = doc.createElement("div");
  signatureWrapper.innerHTML = `<div style="margin-top:18px;font-family:Arial,sans-serif;font-size:12px;line-height:1.35;color:#003366;">${signatureHtml}</div>`;
  doc.body.appendChild(signatureWrapper);
  return doc.body.innerHTML;
};

/** Owns vehicle-only clipboard formatting and the backend clipboard fetch. */
export const useVehicleOnlyClipboardAction = ({
  quoteId,
  itineraryPreference,
  replaceHighlightsHotspotDetailsHtml,
  buildHighlightsHotspotDetailsHtml,
  htmlToPlainText,
  copyHtmlToClipboard,
}: VehicleOnlyClipboardActionOptions) => useCallback(async (type: ClipboardVariant = "recommended") => {
  if (!quoteId || itineraryPreference !== 2) return;
  try {
    const backendMode = type === "highlights" ? "recommended" : type;
    const response = await ItineraryService.getClipboardContent(quoteId, backendMode, []);
    const backendHtml = response?.html || "";
    const backendPlainText = response?.plainText || "";
    let html = backendHtml ? cleanVehicleOnlyB2BHtml(backendHtml) : backendPlainText;
    if (type === "highlights" && html) {
      html = replaceHighlightsHotspotDetailsHtml(html, buildHighlightsHotspotDetailsHtml());
      html = moveHighlightSignatureBelow(html);
    }
    const plainText = html ? htmlToPlainText(html) : backendPlainText;
    if (!html && !plainText) {
      toast.error("Failed to prepare clipboard content");
      return;
    }
    await copyHtmlToClipboard(html, plainText);
    toast.success(type === "recommended" ? "Copy Recommended copied!" : type === "highlights" ? "Copy to Highlights copied!" : "Copy to Para copied!");
  } catch (error) {
    console.error("Failed to copy vehicle-only clipboard content", error);
    toast.error("Failed to copy clipboard content");
  }
}, [buildHighlightsHotspotDetailsHtml, copyHtmlToClipboard, htmlToPlainText, itineraryPreference, quoteId, replaceHighlightsHotspotDetailsHtml]);
