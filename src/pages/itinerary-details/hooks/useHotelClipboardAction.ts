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
 copyHtmlToClipboard: (
  html: string,
  plainText: string,
) => Promise<boolean>;
  htmlToPlainText: (html: string) => string;
  setClipboardModal: (open: boolean) => void;
  setSelectedHotels: (selected: Record<string, boolean>) => void;
  selectedClipboardLegs?: Record<string, boolean>;
selectedClipboardHotelOptions?: Record<string, number[]>;
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
selectedClipboardLegs,
selectedClipboardHotelOptions,
}: HotelClipboardActionOptions) => {
  return useCallback(async () => {
    console.log("🔥 COPY STEP 1: handler started");
console.log("🔥 selectedClipboardLegs:", selectedClipboardLegs);
console.log("🔥 selectedClipboardHotelOptions:", selectedClipboardHotelOptions);
    const selectedGroups = getSelectedClipboardGroups(clipboardType);

    console.log("🔥 COPY STEP 2: selectedGroups:", selectedGroups);

  if (!itinerary) {
  toast.error("Itinerary details are not available");
  return;
}
const currentLegKey =
  `current-${String(itinerary.quoteId || "")}`;

const selectedPreviousLegKeys =
  Object.entries(selectedClipboardLegs || {})
    .filter(
      ([legKey, isSelected]) =>
        legKey.startsWith("previous-") &&
        isSelected === true,
    )
    .map(([legKey]) => legKey);

const hasLegSelectionWorkflow =
  Object.keys(selectedClipboardLegs || {}).length > 0;

const includeCurrentLeg =
  !hasLegSelectionWorkflow ||
  selectedClipboardLegs?.[currentLegKey] === true;

const currentLegSelectedHotelOptions = [
  ...(selectedClipboardHotelOptions?.[currentLegKey] || []),
].sort((a, b) => Number(a) - Number(b));

const fallbackGroupTypes =
  selectedGroups.map((group) => Number(group.groupType));

const selectedLegKeys = hasLegSelectionWorkflow
  ? Object.entries(selectedClipboardLegs || {})
      .filter(([, isSelected]) => isSelected === true)
      .map(([legKey]) => legKey)
  : [currentLegKey];

if (hasLegSelectionWorkflow && selectedLegKeys.length === 0) {
  toast.error("Please select at least one leg");
  return;
}

const hasHotelOptionForSelectedLeg =
  selectedLegKeys.some(
    (legKey) =>
      (selectedClipboardHotelOptions?.[legKey] || [])
        .length > 0,
  );

if (
  clipboardType !== "highlights" &&
  !hasHotelOptionForSelectedLeg &&
  fallbackGroupTypes.length === 0
) {
  toast.error(
    clipboardType === "para"
      ? "Please select at least one recommendation"
      : "Please select at least one hotel option",
  );
  return;
}

    try {
     const groupTypes =
  currentLegSelectedHotelOptions.length > 0
    ? currentLegSelectedHotelOptions
    : getAllClipboardGroupTypes(hotelDetails);

      console.log("🔥 Current leg hotel options:", {
        currentLegKey,
        includeCurrentLeg,
        currentLegSelectedHotelOptions,
        groupTypes,
      });

      let html = "";
      let plainText = "";

      if (includeCurrentLeg) {
        const currentResponse =
          await ItineraryService.getClipboardContent(
            itinerary.quoteId,
            clipboardType,
            groupTypes,
          );

        html = currentResponse?.html || "";
        plainText = currentResponse?.plainText || "";

        if (!html || !plainText) {
          toast.error("Failed to prepare clipboard content");
          return;
        }
      }

      console.log("🔥 COPY STEP 3: API completed", {
        groupTypes,
        includeCurrentLeg,
        htmlLength: html?.length,
        plainTextLength: plainText?.length,
      });

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

const selectedPreviousLegs = previousLegs.filter(
  (previousLeg) =>
    selectedClipboardLegs?.[`previous-${previousLeg.actualQuoteId}`] === true,
);

const previousLegHtmlParts =
  await Promise.all(
    selectedPreviousLegs.map(async (previousLeg) => {
     const previousLegKey =
  `previous-${previousLeg.actualQuoteId}`;

const previousGroupTypes = [
  ...(selectedClipboardHotelOptions?.[previousLegKey] || []),
].sort((a, b) => Number(a) - Number(b));

if (
  clipboardType !== "highlights" &&
  previousGroupTypes.length === 0
) {
  console.warn(
    `No hotel option selected for previous leg ${previousLeg.actualQuoteId}; skipping this leg.`,
  );

  return "";
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
  includeCurrentLeg ? mergedHtml : "",
]
  .filter(Boolean)
  .join("");

if (!completeClipboardHtml.trim()) {
  console.error("Clipboard content is empty", {
    currentLegKey,
    includeCurrentLeg,
    selectedClipboardLegs,
    selectedClipboardHotelOptions,
    previousLegHtmlPartsCount: previousLegHtmlParts.length,
  });

  toast.error(
    "Nothing selected to copy. Please select at least one leg.",
  );

  return;
}

const clipboardPlainText =
  htmlToPlainText(completeClipboardHtml);
console.log("🔥 COPY STEP 4: ready to write clipboard", {
  completeClipboardHtmlLength: completeClipboardHtml.length,
  clipboardPlainTextLength: clipboardPlainText.length,
});
const copied = await copyHtmlToClipboard(

  completeClipboardHtml,
  clipboardPlainText,
);


if (!copied) {
  console.error("Clipboard write failed", {
    htmlLength: completeClipboardHtml.length,
    plainTextLength: clipboardPlainText.length,
  });

  toast.error(
    "Unable to copy to clipboard. Please allow clipboard access and try again.",
  );

  return;
}

toast.success("Formatted clipboard content copied!");
setClipboardModal(false);
setSelectedHotels({});
    } catch (error) {
      console.error("Failed to fetch clipboard content", error);
      toast.error("Failed to prepare clipboard content");
    }
 }, [
  buildClipboardHtml,
  buildHighlightsHotspotDetailsHtml,
  clipboardType,
  copyHtmlToClipboard,
  getSelectedClipboardGroups,
  htmlToPlainText,
  hotelDetails,
  itinerary,
  mergeClipboardWithB2BRecommendedPackages,
  replaceHighlightsHotspotDetailsHtml,
selectedHotels,
selectedClipboardLegs,
selectedClipboardHotelOptions,
setClipboardModal,
setSelectedHotels,
]);
};
