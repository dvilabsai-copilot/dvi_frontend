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

const formatMoney = (value: number) =>
  Number(value || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

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

/*
 * Find all real vehicle detail rows.
 * Ignore outer/container table rows.
 *
 * Important:
 * Do not replace the first vehicle row with the package-cost row.
 * Every selected vehicle must remain visible in the clipboard.
 */
const vehicleRows = Array.from(
  doc.querySelectorAll("tr"),
).filter((row) => {
  const directCells = Array.from(
    row.querySelectorAll<HTMLTableCellElement>(
      ":scope > td",
    ),
  );

  if (directCells.length < 2) {
    return false;
  }

  const descriptionCell = directCells[0];

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

if (vehicleRows.length > 0) {
  const firstVehicleRow = vehicleRows[0];

  const cells = Array.from(
    firstVehicleRow.querySelectorAll<HTMLTableCellElement>(
      ":scope > td",
    ),
  );

  const descriptionCell = cells[0];
  const amountCell = cells[1];

    const storedVehicleTotal = (() => {
      if (
        typeof window === "undefined" ||
        !itinerary?.quoteId
      ) {
        return null;
      }

      const rawValue = window.localStorage.getItem(
        `public-itinerary-vehicle-total:${itinerary.quoteId}`,
      );

      if (rawValue === null) {
        return null;
      }

      const amount = Number(rawValue);

      return Number.isFinite(amount) && amount >= 0
        ? amount
        : null;
    })();

    const backendVehicleAmount = Number(
      itinerary?.costBreakdown?.totalVehicleAmount ??
        itinerary?.costBreakdown?.totalVehicleCost ??
        0,
    );

    const amountFromClipboard = Number(
      String(amountCell?.textContent || "")
        .replace(/,/g, "")
        .replace(/[^0-9.-]/g, ""),
    );

    const vehicleBaseAmount =
      storedVehicleTotal !== null
        ? storedVehicleTotal
        : Number.isFinite(backendVehicleAmount) &&
            backendVehicleAmount > 0
          ? backendVehicleAmount
          : Number.isFinite(amountFromClipboard) &&
              amountFromClipboard > 0
            ? amountFromClipboard
            : 0;

    const agentProfitAmount = (() => {
      if (
        typeof window === "undefined" ||
        !itinerary?.quoteId
      ) {
        return 0;
      }

      const savedProfit = Number(
        window.localStorage.getItem(
          `public-itinerary-profit:${itinerary.quoteId}`,
        ) || 0,
      );

      return Number.isFinite(savedProfit) &&
        savedProfit >= 0
        ? savedProfit
        : 0;
    })();

    /*
     * Keep vehicle-only clipboard totals identical to Cost Summary:
     * Vehicle Total + Add Your Profit + Round Off = Final Selling Price.
     */
    const amountBeforeRoundOff =
      vehicleBaseAmount + agentProfitAmount;

    const finalSellingPrice =
      Math.round(amountBeforeRoundOff);

const vehicleNames = Array.from(
  new Set(
    vehicleRows
      .map((row) => {
        const rowCells = Array.from(
          row.querySelectorAll<HTMLTableCellElement>(
            ":scope > td",
          ),
        );

        const text =
          rowCells[0]?.textContent
            ?.replace(/\s+/g, " ")
            .trim() || "";

        const match = text.match(
          /^(.+?)\s*\(\d+\)\s*-/i,
        );

        return match?.[1]?.trim() || "";
      })
      .filter(Boolean),
  ),
);

const children = Math.max(
  0,
  Number(itinerary?.children || 0),
);

const infants = Math.max(
  0,
  Number(itinerary?.infants || 0),
);

const passengerLabels = [
  `${adults} ${
    adults === 1 ? "Adult" : "Adults"
  }`,

  ...(children > 0
    ? [
        `${children} ${
          children === 1 ? "Child" : "Children"
        }`,
      ]
    : []),

  ...(infants > 0
    ? [
        `${infants} ${
          infants === 1 ? "Infant" : "Infants"
        }`,
      ]
    : []),
];

const vehicleNameText =
  vehicleNames.length > 0
    ? vehicleNames.join(", ")
    : "Vehicle";

const packageDescription =
  `${passengerLabels.join(", ")} With ${vehicleNameText}`;

const packageRow = firstVehicleRow.cloneNode(
  true,
) as HTMLTableRowElement;

const packageCells = Array.from(
  packageRow.querySelectorAll<HTMLTableCellElement>(
    ":scope > td",
  ),
);

const packageDescriptionCell = packageCells[0];
const packageAmountCell = packageCells[1];

if (packageDescriptionCell) {
  packageDescriptionCell.innerHTML = "";

  const title = doc.createElement("strong");
  title.textContent = "Total Package Cost For";

  packageDescriptionCell.appendChild(title);

  packageDescriptionCell.appendChild(
    doc.createTextNode(
      ` (${packageDescription})`,
    ),
  );
}

if (packageAmountCell) {
  packageAmountCell.textContent =
    formatMoney(finalSellingPrice);

  packageAmountCell.style.fontWeight = "700";
}

firstVehicleRow.parentNode?.insertBefore(
  packageRow,
  firstVehicleRow,
);

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
      /^Total Hotel Amount/i.test(text)
    ) {
      row.remove();
    }
  });

  /*
   * Room Count is a cell inside the itinerary-summary row,
   * so remove only room-related cells.
   *
   * Do not remove the complete row because that row also has
   * Entry Ticket, Nationality and Total Pax.
   */
  doc.querySelectorAll("td, th").forEach((cell) => {
    const text =
      cell.textContent
        ?.replace(/\s+/g, " ")
        .trim() || "";

    if (
      /^(Room Count|Extra Bed|Child With Bed|Child Without Bed|Meal Plan)\b/i.test(
        text,
      )
    ) {
      cell.remove();
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