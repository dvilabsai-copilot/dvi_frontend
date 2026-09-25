import { useCallback } from "react";
import { ItineraryService, type ItineraryClipboardMode } from "@/services/itinerary";
import { toast } from "sonner";
import {
  addHotspotDetailsParagraphSpacing,
  buildHighlightsHotspotDetailsHtml as buildHighlightsHotspotDetailsHtmlFromDays,
} from "../utils/highlightsHotspotHtml.utils";
import { loadPreviousLegClipboardItems } from "../utils/previousLegClipboard.utils";
import type { ItineraryDetailsResponse } from "../itinerary-details.types";
import type { ClipboardGroupCostBreakdowns } from "./useClipboardContentBuilder";


const getAllClipboardGroupTypes = (
  hotelDetailsValue: unknown,
): number[] => {
  const fallbackGroupTypes = [1, 2, 3, 4];

  if (
    !hotelDetailsValue ||
    typeof hotelDetailsValue !== "object"
  ) {
    return fallbackGroupTypes;
  }

  const hotelDetails = hotelDetailsValue as {
    hotelTabs?: Array<{
      groupType?: unknown;
    }>;
    hotels?: Array<{
      groupType?: unknown;
    }>;
  };

  /*
   * First use hotelTabs.
   * Tabs represent the actual recommendation groups
   * even when not every group's hotel rows are currently loaded.
   */
  const tabGroupTypes = Array.from(
    new Set(
      (Array.isArray(hotelDetails.hotelTabs)
        ? hotelDetails.hotelTabs
        : []
      )
        .map((tab) =>
          Number(tab?.groupType || 0),
        )
        .filter(
          (groupType) => groupType > 0,
        ),
    ),
  ).sort((a, b) => a - b);

  if (tabGroupTypes.length > 0) {
    return tabGroupTypes;
  }

  /*
   * Fallback to hotel rows.
   */
  const hotelGroupTypes = Array.from(
    new Set(
      (Array.isArray(hotelDetails.hotels)
        ? hotelDetails.hotels
        : []
      )
        .map((hotel) =>
          Number(hotel?.groupType || 0),
        )
        .filter(
          (groupType) => groupType > 0,
        ),
    ),
  ).sort((a, b) => a - b);

  return hotelGroupTypes.length > 0
    ? hotelGroupTypes
    : fallbackGroupTypes;
};

const removeHotspotDetailsSection = (html: string): string => {
  if (!html) return html;

  const hotspotHeadingMatch = html.match(/Hotspot Details/i);
  if (!hotspotHeadingMatch || hotspotHeadingMatch.index === undefined) {
    return html;
  }

  const hotspotStart = html.lastIndexOf(
    '<table',
    hotspotHeadingMatch.index,
  );

  if (hotspotStart === -1) return html;

  const afterHotspotHeading = html.slice(
    hotspotHeadingMatch.index + hotspotHeadingMatch[0].length,
  );

  const nextSectionMatchers = [
    /Terms\s*&?\s*Condition/i,
    /Package Includes/i,
    /Package Excludes/i,
    /Inclusion/i,
    /Exclusion/i,
    /Important Instructions/i,
    /Instructions/i,
    /Cancellation/i,
    /Payment Policy/i,
  ];

  const nextSectionIndex = nextSectionMatchers
    .map((regex) => {
      const match = afterHotspotHeading.match(regex);

      return match?.index !== undefined
        ? hotspotHeadingMatch.index! +
            hotspotHeadingMatch[0].length +
            match.index
        : -1;
    })
    .filter((index) => index > hotspotHeadingMatch.index!)
    .sort((a, b) => a - b)[0];

  if (!nextSectionIndex) {
    return html.slice(0, hotspotStart);
  }

  const nextSectionTableStart = html.lastIndexOf(
    '<table',
    nextSectionIndex,
  );

  const hotspotEnd =
    nextSectionTableStart > hotspotStart
      ? nextSectionTableStart
      : nextSectionIndex;

  return `${html.slice(0, hotspotStart)}${html.slice(hotspotEnd)}`;
};

const buildPackageCostTitle = (
  itinerary: ItineraryDetailsResponse | null,
  vehicleName?: string,
): string => {
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

  const adultLabel = `${adults} ${
    adults === 1 ? "Adult" : "Adults"
  }`;

  const roomLabel = `${roomCount} Room${
    roomCount === 1 ? "" : "s"
  }`;

  const extraBedLabel =
    extraBedCount > 0
      ? ` & ${extraBedCount} Extra Bed${
          extraBedCount === 1 ? "" : "s"
        }`
      : "";

  const vehicleLabel = vehicleName
    ? ` With ${vehicleName}`
    : "";

  return `Total Package Cost For (${adultLabel} – ${roomLabel}${extraBedLabel}${vehicleLabel})`;
};

const replaceVehicleRowWithPackageCost = (
  html: string,
  itinerary: ItineraryDetailsResponse | null,
): string => {
  if (!html || !itinerary) return html;

  const parser = new DOMParser();
  const doc = parser.parseFromString(
    html,
    "text/html",
  );

  const vehicleTables = Array.from(
    doc.querySelectorAll("table"),
  ).filter((table) => {
    const text =
      table.textContent
        ?.replace(/\s+/g, " ")
        .trim() || "";

    return (
      /Vehicle Details/i.test(text) &&
      /Total Amount/i.test(text)
    );
  });

  vehicleTables.forEach((table) => {
    const rows = Array.from(
      table.querySelectorAll("tr"),
    );

    const vehicleRow = rows.find((row, index) => {
      if (index === 0) {
        return false;
      }

   const cells = Array.from(
  row.querySelectorAll<HTMLTableCellElement>(
    ":scope > td",
  ),
);

      if (cells.length < 2) {
        return false;
      }

      const firstCellText =
        cells[0]?.textContent
          ?.replace(/\s+/g, " ")
          .trim() || "";

      const secondCellText =
        cells[1]?.textContent
          ?.replace(/\s+/g, " ")
          .trim() || "";

      return (
        /==>/.test(firstCellText) &&
        /[0-9]+(?:,[0-9]+)*(?:\.[0-9]{2})/.test(
          secondCellText,
        )
      );
    });

    if (!vehicleRow) {
      return;
    }

    const cells = Array.from(
  vehicleRow.querySelectorAll<HTMLTableCellElement>(
    ":scope > td",
  ),
);
    if (cells.length < 2) {
      return;
    }

const descriptionCell = cells[0];
const amountCell = cells[1];

/*
 * Total Package Cost must display the same final amount
 * as the "Net Payable To ..." row.
 *
 * Prefer Net Payable, and fall back to Total Amount only
 * for older clipboard HTML where Net Payable is missing.
 */
const allRows = Array.from(
  doc.querySelectorAll("tr"),
);

const vehicleRowIndex =
  allRows.indexOf(vehicleRow);

const rowsAfterVehicle =
  allRows.slice(vehicleRowIndex + 1);

const findAmountRow = (
  labelMatcher: RegExp,
) =>
  rowsAfterVehicle.find((row) => {
    const rowCells = Array.from(
      row.querySelectorAll<HTMLTableCellElement>(
        ":scope > td, :scope > th",
      ),
    );

    if (rowCells.length < 2) {
      return false;
    }

    const label =
      rowCells[0]?.textContent
        ?.replace(/\s+/g, " ")
        .trim() || "";

    return labelMatcher.test(label);
  });

const packagePayableRow =
  findAmountRow(/^Net Payable To\b/i) ??
  findAmountRow(/^Total Amount$/i);

const packagePayableCells =
  packagePayableRow
    ? Array.from(
        packagePayableRow.querySelectorAll<HTMLTableCellElement>(
          ":scope > td, :scope > th",
        ),
      )
    : [];

const packagePayableCell =
  packagePayableCells.length > 1
    ? packagePayableCells[
        packagePayableCells.length - 1
      ]
    : null;

const originalText =
  descriptionCell.textContent
    ?.replace(/\s+/g, " ")
    .trim() || "";

const vehicleMatch = originalText.match(
  /^(.+?)\s*\(\d+\)\s*-/i,
);

const vehicleName =
  vehicleMatch?.[1]?.trim() || "";

descriptionCell.innerHTML = "";

const strong = doc.createElement("strong");

strong.textContent = buildPackageCostTitle(
  itinerary,
  vehicleName,
);

descriptionCell.appendChild(strong);

if (packagePayableCell) {
  amountCell.innerHTML =
    packagePayableCell.innerHTML;
}

amountCell.style.fontWeight = "700";
  });

  return doc.body.innerHTML;
};

interface HotelClipboardActionOptions {
  selectedHotels: Record<string, boolean>;
  clipboardType: ItineraryClipboardMode;
  hotelDetails: unknown;
  itinerary: ItineraryDetailsResponse | null;
  getSelectedClipboardGroups: (clipboardType: ItineraryClipboardMode) => Array<{ groupType: number }>;
  buildClipboardHtml: (clipboardType: ItineraryClipboardMode, groupCostBreakdowns?: ClipboardGroupCostBreakdowns) => { html?: string; packageSectionsHtml?: string };
  mergeClipboardWithB2BRecommendedPackages: (html: string, localHtml: string) => string;
  replaceHighlightsHotspotDetailsHtml: (html: string, detailsHtml: string) => string;
  buildHighlightsHotspotDetailsHtml: () => string;
  copyHtmlToClipboard: (html: string, plainText: string) => Promise<void>;
  htmlToPlainText: (html: string) => string;
  setClipboardModal: (open: boolean) => void;
  setSelectedHotels: (selected: Record<string, boolean>) => void;
}

/** Owns formatted hotel clipboard retrieval, merge, and copy behavior. */
export const useHotelClipboardAction = ({
  selectedHotels,
  clipboardType,
  hotelDetails,
  itinerary,
  getSelectedClipboardGroups,
  buildClipboardHtml,
  mergeClipboardWithB2BRecommendedPackages,
  replaceHighlightsHotspotDetailsHtml,
  buildHighlightsHotspotDetailsHtml,
  copyHtmlToClipboard,
  htmlToPlainText,
  setClipboardModal,
  setSelectedHotels,
}: HotelClipboardActionOptions) => {
  return useCallback(async () => {
    const selectedGroups = getSelectedClipboardGroups(clipboardType);
    if (selectedGroups.length === 0) {
      toast.error(clipboardType === "para" ? "Please select at least one recommendation" : "Please select at least one hotel");
      return;
    }
    if (!hotelDetails || !itinerary) return;

    try {
      const groupTypes = selectedGroups.map((group) => group.groupType);
      const { html, plainText } = await ItineraryService.getClipboardContent(itinerary.quoteId, clipboardType, groupTypes);
      if (!html || !plainText) {
        toast.error("Failed to prepare clipboard content");
        return;
      }

     const groupCostBreakdowns: ClipboardGroupCostBreakdowns = {};
     const groupDetails = await Promise.all(
       groupTypes.map(async (groupType) => {
         try {
           return [groupType, await ItineraryService.getDetails(itinerary.quoteId || "", groupType)] as const;
         } catch (error) {
           console.warn(`Failed to load group ${groupType} cost breakdown; using active itinerary totals`, error);
           return null;
         }
       }),
     );
     groupDetails.forEach((entry) => {
       if (!entry) return;
       const [groupType, details] = entry;
       const costBreakdown = (details as ItineraryDetailsResponse | undefined)?.costBreakdown;
       if (groupType && costBreakdown) {
         groupCostBreakdowns[groupType] = costBreakdown;
       }
     });

     const localClipboard = buildClipboardHtml(clipboardType, groupCostBreakdowns);

let mergedHtml = mergeClipboardWithB2BRecommendedPackages(
  html,
  localClipboard.packageSectionsHtml || localClipboard.html || "",
);

if (clipboardType === "highlights") {
  mergedHtml = replaceHighlightsHotspotDetailsHtml(
    mergedHtml,
    buildHighlightsHotspotDetailsHtml(),
  );
}

if (Number(itinerary.itineraryPreference || 0) === 1) {
  mergedHtml =
    removeHotspotDetailsSection(mergedHtml);
} else {
  mergedHtml =
    addHotspotDetailsParagraphSpacing(
      mergedHtml,
    );
}

mergedHtml = replaceVehicleRowWithPackageCost(
  mergedHtml,
  itinerary,
);

/*
 * Include every previous Continue Planning leg.
 *
 * Same groupTypes are used so:
 * Recommended #1 -> previous Recommended #1
 * Para selected groups -> same previous groups
 * etc.
 */
const previousLegs =
  await loadPreviousLegClipboardItems(
    itinerary,
  );

const previousLegHtmlParts =
  await Promise.all(
    previousLegs.map(async (previousLeg) => {
      let previousGroupTypes = [1, 2, 3, 4];

      try {
        const previousHotelDetails =
          await ItineraryService.getHotelDetails(
            previousLeg.actualQuoteId,
          );

        previousGroupTypes =
          getAllClipboardGroupTypes(
            previousHotelDetails,
          );
      } catch (error) {
        console.warn(
          `Failed to load hotel groups for previous leg ${previousLeg.actualQuoteId}; using groups 1-4`,
          error,
        );
      }

      const previousResponse =
        await ItineraryService.getClipboardContent(
          previousLeg.actualQuoteId,
          clipboardType,
          previousGroupTypes,
        );

      let previousHtml =
        previousResponse?.html ||
        previousResponse?.plainText ||
        "";

      if (!previousHtml) {
        throw new Error(
          `Clipboard content missing for previous leg ${previousLeg.actualQuoteId}`,
        );
      }

      if (clipboardType === "highlights") {
        previousHtml =
          replaceHighlightsHotspotDetailsHtml(
            previousHtml,
            buildHighlightsHotspotDetailsHtmlFromDays(
              previousLeg.details.days,
            ),
          );
      }

      if (
        Number(
          previousLeg.details.itineraryPreference || 0,
        ) === 1
      ) {
        previousHtml =
          removeHotspotDetailsSection(
            previousHtml,
          );
      } else {
        previousHtml =
          addHotspotDetailsParagraphSpacing(
            previousHtml,
          );
      }

      previousHtml =
        replaceVehicleRowWithPackageCost(
          previousHtml,
          previousLeg.details,
        );

      return previousHtml;
    }),
  );

/*
 * loadPreviousLegClipboardItems() already returns
 * oldest -> newest.
 *
 * Current itinerary is added last.
 */
const completeClipboardHtml = [
  ...previousLegHtmlParts,
  mergedHtml,
]
  .filter(Boolean)
  .join("");

await copyHtmlToClipboard(
  completeClipboardHtml,
  htmlToPlainText(
    completeClipboardHtml,
  ),
);
      toast.success("Formatted clipboard content copied!");
      setClipboardModal(false);
      setSelectedHotels({});
    } catch (error) {
      console.error("Failed to fetch clipboard content", error);
      toast.error("Failed to prepare clipboard content");
    }
  }, [buildClipboardHtml, buildHighlightsHotspotDetailsHtml, clipboardType, copyHtmlToClipboard, getSelectedClipboardGroups, htmlToPlainText, hotelDetails, itinerary, mergeClipboardWithB2BRecommendedPackages, replaceHighlightsHotspotDetailsHtml, selectedHotels, setClipboardModal, setSelectedHotels]);
};
