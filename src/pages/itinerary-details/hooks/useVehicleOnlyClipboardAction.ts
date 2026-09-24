import { useCallback } from "react";

import { ItineraryService } from "@/services/itinerary";

import { toast } from "sonner";

import {
  buildHighlightsHotspotDetailsHtml as buildHighlightsHotspotDetailsHtmlFromDays,
} from "../utils/highlightsHotspotHtml.utils";

import {
  loadPreviousLegClipboardItems,
} from "../utils/previousLegClipboard.utils";

import type {
  ItineraryDetailsResponse,
} from "../itinerary-details.types";

type ClipboardVariant = "recommended" | "highlights" | "para";

interface VehicleOnlyClipboardActionOptions {
  quoteId: string | null;
  itineraryPreference: number;
  itinerary: ItineraryDetailsResponse | null;

  replaceHighlightsHotspotDetailsHtml: (
    html: string,
    replacement: string,
  ) => string;

  buildHighlightsHotspotDetailsHtml: () => string;

  htmlToPlainText: (html: string) => string;

  copyHtmlToClipboard: (
    html: string,
    plainText: string,
  ) => Promise<void>;
}

const cleanVehicleOnlyB2BHtml = (
  rawHtml: string,
  itinerary: ItineraryDetailsResponse | null,
): string => {
  if (!rawHtml) return rawHtml;

  const parser = new DOMParser();

  const doc = parser.parseFromString(
    rawHtml,
    "text/html",
  );

  const adults = Math.max(
    0,
    Number(itinerary?.adults || 0),
  );

  const roomCount = Math.max(
    0,
    Number(itinerary?.roomCount || 0),
  );

  const extraBedCount = Math.max(
    0,
    Number(itinerary?.extraBed || 0),
  );

  /*
   * Find only the real vehicle detail row.
   * Ignore outer/container table rows.
   */
  const vehicleRow = Array.from(
    doc.querySelectorAll("tr"),
  ).find((row) => {
  const directCells = Array.from(
  row.querySelectorAll<HTMLTableCellElement>(
    ":scope > td",
  ),
);

    if (directCells.length < 2) {
      return false;
    }

    const descriptionCell = directCells[0];

    /*
     * Important:
     * if this cell contains another table, it is an outer/container row,
     * not the actual Sedan / Tempo Traveller vehicle row.
     */
    if (descriptionCell.querySelector("table")) {
      return false;
    }

    const firstCellText =
      descriptionCell.textContent
        ?.replace(/\s+/g, " ")
        .trim() || "";

    const amountText =
      directCells[1]?.textContent
        ?.replace(/\s+/g, " ")
        .trim() || "";

    return (
      /\(\d+\)\s*-/.test(firstCellText) &&
      /==>/.test(firstCellText) &&
      /\d/.test(amountText)
    );
  });

  if (vehicleRow) {
  const cells = Array.from(
  vehicleRow.querySelectorAll<HTMLTableCellElement>(
    ":scope > td",
  ),
);

    const descriptionCell = cells[0];
    const amountCell = cells[1];

    const originalText =
      descriptionCell?.textContent
        ?.replace(/\s+/g, " ")
        .trim() || "";

    const vehicleMatch = originalText.match(
      /^(.+?)\s*\(\d+\)\s*-/i,
    );

    const vehicleName =
      vehicleMatch?.[1]?.trim() || "Vehicle";

    const roomLabel =
      `${roomCount} Room${
        roomCount === 1 ? "" : "s"
      }`;

    const adultLabel =
      `${adults} ${
        adults === 1 ? "Adult" : "Adults"
      }`;

    const packageDescription =
      extraBedCount > 0
        ? `${adultLabel} – ${roomLabel} & ${extraBedCount} Extra Bed${
            extraBedCount === 1 ? "" : "s"
          } With ${vehicleName}`
        : `${adultLabel} – ${roomLabel} With ${vehicleName}`;

    if (descriptionCell) {
      descriptionCell.innerHTML = "";

      const title = doc.createElement("strong");
      title.textContent = "Total Package Cost For";

      descriptionCell.appendChild(title);

      descriptionCell.appendChild(
        doc.createTextNode(
          ` (${packageDescription})`,
        ),
      );
    }

    if (amountCell) {
      amountCell.style.fontWeight = "700";
    }
  }

  doc.querySelectorAll("tr").forEach((row) => {
    const text =
      row.textContent
        ?.replace(/\s+/g, " ")
        .trim() || "";

    if (
      /^Recommended Hotel/i.test(text) ||
      /^Hotel Details/i.test(text) ||
      /^Total Room Cost/i.test(text) ||
      /^Total Hotel Cost/i.test(text) ||
      /^Total Hotel Amount/i.test(text) ||
      /^Room Count\b/i.test(text)
    ) {
      row.remove();
    }
  });

  doc.querySelectorAll("tr").forEach((row) => {
    const rowText =
      row.textContent
        ?.replace(/\s+/g, " ")
        .trim() || "";

    if (
      !/Total Vehicle Amount/i.test(rowText) ||
      !/Total Vehicle Cost\s*\(/i.test(rowText)
    ) {
      return;
    }

    const cells = Array.from(
      row.querySelectorAll("td, th"),
    );

    if (!cells.length) return;

    const firstCell = cells[0];

    const amountCell = cells.find((cell) => {
      const text =
        cell.textContent
          ?.replace(/\s+/g, " ")
          .trim() || "";

      return /₹|Rs\.?|[0-9]+,[0-9]+|\d+\.\d{2}/i.test(text);
    });

    firstCell.textContent = "Total Vehicle Amount";

    cells.forEach((cell) => {
      if (
        cell === firstCell ||
        (amountCell && cell === amountCell)
      ) {
        return;
      }

      const text =
        cell.textContent
          ?.replace(/\s+/g, " ")
          .trim() || "";

      if (/Total Vehicle Cost\s*\(/i.test(text)) {
        cell.remove();
      }
    });
  });

  doc.querySelectorAll("td, th").forEach((cell) => {
    const text =
      cell.textContent
        ?.replace(/\s+/g, " ")
        .trim() || "";

    if (
      /Total Vehicle Amount/i.test(text) &&
      /Total Vehicle Cost\s*\(/i.test(text)
    ) {
      cell.textContent = "Total Vehicle Amount";
    }

    const hasContentElement =
      cell.querySelectorAll(
        "table, img, a, span, div, p, b, strong",
      ).length > 0;

    const widthValue = Number(
      String(
        cell.getAttribute("width") || "",
      ).replace(/[^0-9.]/g, ""),
    );

    if (
      !text &&
      !hasContentElement &&
      widthValue > 0 &&
      widthValue <= 40
    ) {
      cell.remove();
    }
  });

  return doc.body.innerHTML;
};

const moveHighlightSignatureBelow = (
  rawHtml: string,
): string => {
  if (!rawHtml) return rawHtml;

  const parser = new DOMParser();

  const doc = parser.parseFromString(
    rawHtml,
    "text/html",
  );

  const signatureCell = Array.from(
    doc.querySelectorAll("td, th"),
  ).find((cell) => {
    const text =
      cell.textContent
        ?.replace(/\s+/g, " ")
        .trim() || "";

    return (
      /Nisha/i.test(text) &&
      /Sales Support/i.test(text) &&
      /Mobile/i.test(text)
    );
  });

  if (!signatureCell) {
    return doc.body.innerHTML;
  }

  const signatureHtml = signatureCell.innerHTML;

  const parentRow = signatureCell.closest("tr");

  const rowCells = parentRow
    ? Array.from(
        parentRow.querySelectorAll(
          ":scope > td, :scope > th",
        ),
      )
    : [];

  if (parentRow && rowCells.length > 1) {
    signatureCell.remove();
  }

  const signatureWrapper =
    doc.createElement("div");

  signatureWrapper.innerHTML = `
    <div
      style="margin-top:18px;font-family:Arial,sans-serif;font-size:12px;line-height:1.35;color:#003366;"
    >
      ${signatureHtml}
    </div>
  `;

  doc.body.appendChild(signatureWrapper);

  return doc.body.innerHTML;
};

/**
 * Owns vehicle-only clipboard formatting
 * and the backend clipboard fetch.
 */
export const useVehicleOnlyClipboardAction = ({
  quoteId,
  itineraryPreference,
  itinerary,
  replaceHighlightsHotspotDetailsHtml,
  buildHighlightsHotspotDetailsHtml,
  htmlToPlainText,
  copyHtmlToClipboard,
}: VehicleOnlyClipboardActionOptions) =>
  useCallback(
    async (
      type: ClipboardVariant = "recommended",
    ) => {
      if (
        !quoteId ||
        itineraryPreference !== 2
      ) {
        return;
      }

      try {
        const backendMode =
          type === "highlights"
            ? "recommended"
            : type;

        const response =
          await ItineraryService.getClipboardContent(
            quoteId,
            backendMode,
            [],
          );

        const backendHtml =
          response?.html || "";

        const backendPlainText =
          response?.plainText || "";

        let html = backendHtml
          ? cleanVehicleOnlyB2BHtml(
              backendHtml,
              itinerary,
            )
          : backendPlainText;

   if (
  type === "highlights" &&
  html
) {
  html =
    replaceHighlightsHotspotDetailsHtml(
      html,
      buildHighlightsHotspotDetailsHtml(),
    );

  html =
    moveHighlightSignatureBelow(html);
}

/*
 * Load all Continue Planning history.
 */
const previousLegs =
  await loadPreviousLegClipboardItems(
    itinerary,
  );

const previousLegHtmlParts =
  await Promise.all(
    previousLegs.map(async (previousLeg) => {
      const previousBackendMode =
        type === "highlights"
          ? "recommended"
          : type;

      const previousResponse =
        await ItineraryService.getClipboardContent(
          previousLeg.actualQuoteId,
          previousBackendMode,
          [],
        );

      const previousBackendHtml =
        previousResponse?.html || "";

      const previousBackendPlainText =
        previousResponse?.plainText || "";

      let previousHtml =
        previousBackendHtml
          ? cleanVehicleOnlyB2BHtml(
              previousBackendHtml,
              previousLeg.details,
            )
          : previousBackendPlainText;

      if (
        type === "highlights" &&
        previousHtml
      ) {
        previousHtml =
          replaceHighlightsHotspotDetailsHtml(
            previousHtml,
            buildHighlightsHotspotDetailsHtmlFromDays(
              previousLeg.details.days,
            ),
          );

        previousHtml =
          moveHighlightSignatureBelow(
            previousHtml,
          );
      }

      if (!previousHtml) {
        throw new Error(
          `Clipboard content missing for previous leg ${previousLeg.actualQuoteId}`,
        );
      }

      return previousHtml;
    }),
  );

/*
 * Previous legs first, current leg last.
 */
html = [
  ...previousLegHtmlParts,
  html,
]
  .filter(Boolean)
  .join("");

const plainText = html
  ? htmlToPlainText(html)
  : backendPlainText;

        if (!html && !plainText) {
          toast.error(
            "Failed to prepare clipboard content",
          );

          return;
        }

        await copyHtmlToClipboard(
          html,
          plainText,
        );

        toast.success(
          type === "recommended"
            ? "Copy Recommended copied!"
            : type === "highlights"
              ? "Copy to Highlights copied!"
              : "Copy to Para copied!",
        );
      } catch (error) {
        console.error(
          "Failed to copy vehicle-only clipboard content",
          error,
        );

        toast.error(
          "Failed to copy clipboard content",
        );
      }
    },
    [
      buildHighlightsHotspotDetailsHtml,
      copyHtmlToClipboard,
      htmlToPlainText,
      itinerary,
      itineraryPreference,
      quoteId,
      replaceHighlightsHotspotDetailsHtml,
    ],
  );