import { useCallback } from "react";
import { ItineraryService, type ItineraryClipboardMode } from "@/services/itinerary";
import { toast } from "sonner";
import {
  addHotspotDetailsParagraphSpacing,
} from "../utils/highlightsHotspotHtml.utils";
import { loadPreviousLegClipboardItems } from "../utils/previousLegClipboard.utils";

import { escapeHtml } from "../utils/clipboardFormatting.utils";

import type { ItineraryDetailsResponse } from "../itinerary-details.types";
import type { ClipboardIncludeSections } from "./useMediaShareState";

import type {
  ClipboardGroupDetails,
  ClipboardLegHotelGroup,
} from "./useClipboardContentBuilder";

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

/*
 * Clipboard must use the hotel actually committed to the itinerary.
 *
 * hotelDetails.hotels can contain many AVAILABLE hotels for one route.
 * hotelSelectionState contains the actual selected hotel for each
 * recommendation and route.
 *
 * We mark that exact hotel as SELECTED so the clipboard builder
 * never falls back to the first available hotel by mistake.
 */
const getClipboardCommittedHotelRows = (
  hotelDetailsValue: unknown,
  groupType: number,
): any[] => {
  if (
    !hotelDetailsValue ||
    typeof hotelDetailsValue !== "object"
  ) {
    return [];
  }

  const hotelDetails =
    hotelDetailsValue as Record<string, any>;

  const hotelRows = Array.isArray(
    hotelDetails.hotels,
  )
    ? hotelDetails.hotels
    : [];

  const hotelSelectionState = Array.isArray(
    hotelDetails.hotelSelectionState,
  )
    ? hotelDetails.hotelSelectionState
    : [];

  const recommendationSelection =
    hotelSelectionState.find(
      (selectionGroup: any) =>
        Number(selectionGroup?.groupType || 0) ===
        Number(groupType),
    );

  const selectedRoutes = Array.isArray(
    recommendationSelection?.routes,
  )
    ? recommendationSelection.routes
    : [];

  /*
   * Older itinerary responses may not contain hotelSelectionState.
   * In that case preserve the existing hotel rows unchanged.
   */
  if (!selectedRoutes.length) {
    return hotelRows;
  }

  const normalizeText = (
    value: unknown,
  ): string =>
    String(value ?? "")
      .replace(/&nbsp;/gi, " ")
      .replace(/\u00a0/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .toLowerCase();

  const normalizeDate = (
    value: unknown,
  ): string => {
    const raw = String(value ?? "").trim();

    if (!raw) {
      return "";
    }

    const isoMatch = raw.match(
      /(\d{4})-(\d{2})-(\d{2})/,
    );

    if (isoMatch) {
      return `${isoMatch[1]}-${isoMatch[2]}-${isoMatch[3]}`;
    }

    const slashMatch = raw.match(
      /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/,
    );

    if (slashMatch) {
      const [, day, month, year] = slashMatch;

      return `${year}-${month.padStart(
        2,
        "0",
      )}-${day.padStart(2, "0")}`;
    }

    return "";
  };

  const getHotelName = (hotel: any) =>
    normalizeText(
      hotel?.hotelName ??
        hotel?.hotel_name ??
        hotel?.name,
    );

  const isSameSelectedHotel = (
    hotel: any,
    selectedHotel: any,
  ): boolean => {
    if (!selectedHotel) {
      return false;
    }

    const rowCanonicalHotelId = Number(
      hotel?.canonicalHotelId ??
        hotel?.hotelId ??
        hotel?.hotel_id ??
        0,
    );

    const selectedCanonicalHotelId = Number(
      selectedHotel?.canonicalHotelId ?? 0,
    );

    if (
      rowCanonicalHotelId > 0 &&
      selectedCanonicalHotelId > 0 &&
      rowCanonicalHotelId ===
        selectedCanonicalHotelId
    ) {
      return true;
    }

    const rowProviderHotelCode =
      normalizeText(
        hotel?.providerHotelCode ??
          hotel?.provider_hotel_code,
      );

    const selectedProviderHotelCode =
      normalizeText(
        selectedHotel?.providerHotelCode,
      );

    if (
      rowProviderHotelCode &&
      selectedProviderHotelCode &&
      rowProviderHotelCode ===
        selectedProviderHotelCode
    ) {
      return true;
    }

    const rowHotelCode = normalizeText(
      hotel?.hotelCode ??
        hotel?.hotel_code,
    );

    const selectedHotelCode =
      normalizeText(
        selectedHotel?.hotelCode,
      );

    if (
      rowHotelCode &&
      selectedHotelCode &&
      rowHotelCode === selectedHotelCode
    ) {
      return true;
    }

    const rowHotelName =
      getHotelName(hotel);

    const selectedHotelName =
      normalizeText(
        selectedHotel?.hotelName,
      );

    return Boolean(
      rowHotelName &&
        selectedHotelName &&
        rowHotelName === selectedHotelName,
    );
  };

  /*
   * Start with the real hotel rows returned by hotel-details.
   *
   * For each row find the matching persisted route selection.
   */
  const committedRows = hotelRows.map(
    (hotel: any) => {
      const hotelRouteId = Number(
        hotel?.routeId ??
          hotel?.route_id ??
          0,
      );

      const hotelDate = normalizeDate(
        hotel?.date ??
          hotel?.startDate ??
          hotel?.checkInDate ??
          hotel?.hotelCheckInDate ??
          hotel?.hotel_check_in_date ??
          hotel?.routeDate,
      );

      const routeSelection =
        selectedRoutes.find(
          (route: any) => {
            const selectedRouteId =
              Number(route?.routeId || 0);

            const selectedRouteDate =
              normalizeDate(
                route?.routeDate,
              );

            const sameRoute =
              hotelRouteId > 0 &&
              selectedRouteId > 0 &&
              hotelRouteId ===
                selectedRouteId;

            const sameDate =
              Boolean(hotelDate) &&
              Boolean(selectedRouteDate) &&
              hotelDate ===
                selectedRouteDate;

            return sameRoute || sameDate;
          },
        );

      if (
        !routeSelection?.selected ||
        !isSameSelectedHotel(
          hotel,
          routeSelection.selected,
        )
      ) {
        /*
         * Very important:
         * clear stale selected flags from other available hotels.
         *
         * Otherwise another available hotel can still be treated
         * as selected by the clipboard builder.
         */
        return {
          ...hotel,
          isSelected: false,
          selected: false,

          ...(String(
            hotel?.selectionStatus ?? "",
          )
            .trim()
            .toUpperCase() === "SELECTED"
            ? {
                selectionStatus:
                  undefined,
              }
            : {}),

          ...(hotel?.selection &&
          typeof hotel.selection === "object"
            ? {
                selection: {
                  ...hotel.selection,
                  isSelected: false,
                  selected: false,

                  ...(String(
                    hotel.selection
                      ?.selectionStatus ?? "",
                  )
                    .trim()
                    .toUpperCase() ===
                  "SELECTED"
                    ? {
                        selectionStatus:
                          undefined,
                      }
                    : {}),
                },
              }
            : {}),
        };
      }

      /*
       * This is the exact committed hotel.
       */
      return {
        ...hotel,

        hotelName:
          routeSelection.selected
            ?.hotelName ??
          hotel?.hotelName ??
          hotel?.hotel_name ??
          hotel?.name,

        canonicalHotelId:
          routeSelection.selected
            ?.canonicalHotelId ??
          hotel?.canonicalHotelId,

        hotelCode:
          routeSelection.selected
            ?.hotelCode ??
          hotel?.hotelCode,

        providerHotelCode:
          routeSelection.selected
            ?.providerHotelCode ??
          hotel?.providerHotelCode,

        provider:
          routeSelection.selected
            ?.provider ??
          hotel?.provider,

        category:
          routeSelection.selected
            ?.category ??
          hotel?.category,

        roomType:
          routeSelection.selected
            ?.roomType ??
          hotel?.roomType,

        mealPlan:
          routeSelection.selected
            ?.mealPlan ??
          hotel?.mealPlan,

        isSelected: true,
        selected: true,
        selectionStatus: "SELECTED",

        selection: {
          ...(hotel?.selection &&
          typeof hotel.selection === "object"
            ? hotel.selection
            : {}),

          isSelected: true,
          selected: true,
          selectionStatus: "SELECTED",
        },
      };
    },
  );

  /*
   * Sometimes the selected persisted hotel is no longer present in
   * the current availability rows.
   *
   * Do not replace it with another available hotel.
   * Add the persisted selected hotel into the clipboard source.
   */
  selectedRoutes.forEach((route: any) => {
    if (
      String(
        route?.selectionStatus || "",
      )
        .trim()
        .toUpperCase() !== "SELECTED" ||
      !route?.selected
    ) {
      return;
    }

    const selectedHotel = route.selected;

    const selectedAlreadyExists =
      committedRows.some(
        (hotel: any) => {
          const hotelRouteId = Number(
            hotel?.routeId ??
              hotel?.route_id ??
              0,
          );

          const sameRoute =
            hotelRouteId > 0 &&
            Number(route?.routeId || 0) >
              0 &&
            hotelRouteId ===
              Number(route.routeId);

          return (
            sameRoute &&
            isSameSelectedHotel(
              hotel,
              selectedHotel,
            )
          );
        },
      );

    if (selectedAlreadyExists) {
      return;
    }

    const sourceRouteHotel =
      hotelRows.find((hotel: any) => {
        const hotelRouteId = Number(
          hotel?.routeId ??
            hotel?.route_id ??
            0,
        );

        if (
          hotelRouteId > 0 &&
          Number(route?.routeId || 0) > 0
        ) {
          return (
            hotelRouteId ===
            Number(route.routeId)
          );
        }

        const hotelDate =
          normalizeDate(
            hotel?.date ??
              hotel?.startDate ??
              hotel?.checkInDate ??
              hotel?.hotelCheckInDate ??
              hotel
                ?.hotel_check_in_date ??
              hotel?.routeDate,
          );

        return (
          hotelDate &&
          hotelDate ===
            normalizeDate(
              route?.routeDate,
            )
        );
      });

    committedRows.push({
      ...(sourceRouteHotel ?? {}),

      groupType: Number(groupType),

      routeId: Number(
        route?.routeId || 0,
      ),

      routeDate: route?.routeDate,

      date:
        normalizeDate(route?.routeDate) ||
        route?.routeDate,

      startDate:
        normalizeDate(route?.routeDate) ||
        route?.routeDate,

      checkInDate:
        normalizeDate(route?.routeDate) ||
        route?.routeDate,

      hotelName:
        selectedHotel?.hotelName || "",

      canonicalHotelId:
        selectedHotel?.canonicalHotelId ??
        null,

      hotelId:
        selectedHotel?.canonicalHotelId ??
        null,

      hotelCode:
        selectedHotel?.hotelCode ?? null,

      providerHotelCode:
        selectedHotel
          ?.providerHotelCode ?? null,

      provider:
        selectedHotel?.provider ?? null,

      category:
        selectedHotel?.category ?? null,

      hotelCategory:
        selectedHotel?.category ?? null,

      roomType:
        selectedHotel?.roomType ?? null,

      mealPlan:
        selectedHotel?.mealPlan ?? null,

      pricePerNight: Number(
        selectedHotel?.pricePerNight || 0,
      ),

      totalPrice: Number(
        selectedHotel?.totalPrice || 0,
      ),

      totalAmount: Number(
        selectedHotel?.totalPrice || 0,
      ),

      isSelected: true,
      selected: true,
      selectionStatus: "SELECTED",

      selection: {
        isSelected: true,
        selected: true,
        selectionStatus: "SELECTED",
      },
    });
  });

  return committedRows;
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
const extractHotspotDetailsSection = (
  html: string,
): string => {
  if (!html) {
    return "";
  }

  const hotspotHeadingMatch =
    html.match(/Hotspot Details/i);

  if (
    !hotspotHeadingMatch ||
    hotspotHeadingMatch.index === undefined
  ) {
    return "";
  }

  const hotspotStart = html.lastIndexOf(
    "<table",
    hotspotHeadingMatch.index,
  );

  if (hotspotStart === -1) {
    return "";
  }

  const afterHeading = html.slice(
    hotspotHeadingMatch.index +
      hotspotHeadingMatch[0].length,
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
      const match = afterHeading.match(regex);

      return match?.index !== undefined
        ? hotspotHeadingMatch.index! +
            hotspotHeadingMatch[0].length +
            match.index
        : -1;
    })
    .filter(
      (index) =>
        index > hotspotHeadingMatch.index!,
    )
    .sort((a, b) => a - b)[0];

  if (!nextSectionIndex) {
    return html.slice(hotspotStart);
  }

  const nextSectionTableStart =
    html.lastIndexOf(
      "<table",
      nextSectionIndex,
    );

  const hotspotEnd =
    nextSectionTableStart > hotspotStart
      ? nextSectionTableStart
      : nextSectionIndex;

  return html.slice(
    hotspotStart,
    hotspotEnd,
  );
};

const removeHotspotHeadingFromSection = (
  html: string,
): string => {
  if (!html) {
    return "";
  }

  const parser = new DOMParser();

  const doc = parser.parseFromString(
    `<div id="hotspot-section-root">${html}</div>`,
    "text/html",
  );

  const root = doc.querySelector(
    "#hotspot-section-root",
  ) as HTMLElement | null;

  if (!root) {
    return html;
  }

  const headingTable = Array.from(
    root.querySelectorAll("table"),
  ).find((table) => {
    const text = String(
      table.textContent || "",
    )
      .replace(/\s+/g, " ")
      .trim();

    return /^Hotspot Details$/i.test(text);
  });

  headingTable?.remove();

  return root.innerHTML;
};

const extractTermsAndConditionSection = (
  html: string,
): string => {
  if (!html) {
    return "";
  }

  const termsHeadingMatch = html.match(
    /Terms\s*&?\s*Condition/i,
  );

  if (
    !termsHeadingMatch ||
    termsHeadingMatch.index === undefined
  ) {
    return "";
  }

  const termsTableStart = html.lastIndexOf(
    "<table",
    termsHeadingMatch.index,
  );

  const start =
    termsTableStart >= 0
      ? termsTableStart
      : termsHeadingMatch.index;

  return html.slice(start);
};

const buildConsolidatedHotspotDetailsHtml = (
  legs: Array<{
    label: string;
    html: string;
  }>,
): string => {
  const normalizeHotspotTablesForVerticalLayout = (
    html: string,
  ): string => {
    if (!html) {
      return "";
    }

    const parser = new DOMParser();

    const doc = parser.parseFromString(
      `<div id="hotspot-vertical-root">${html}</div>`,
      "text/html",
    );

    const root = doc.querySelector(
      "#hotspot-vertical-root",
    ) as HTMLElement | null;

    if (!root) {
      return html;
    }

    /*
     * Gmail may place backend hotspot/day tables beside each other
     * because the original clipboard HTML can contain inline/floating
     * table layout.
     *
     * Force every table to behave as one full-width block.
     */
    Array.from(root.querySelectorAll("table")).forEach(
      (table) => {
        const htmlTable =
          table as HTMLTableElement;

        htmlTable.setAttribute(
          "width",
          "700",
        );

        htmlTable.setAttribute(
          "cellpadding",
          htmlTable.getAttribute("cellpadding") ||
            "0",
        );

        htmlTable.setAttribute(
          "cellspacing",
          "0",
        );

        const oldStyle =
          htmlTable.getAttribute("style") || "";

        htmlTable.setAttribute(
          "style",
          `
            ${oldStyle}
            width:700px !important;
            max-width:700px !important;
            display:table !important;
            float:none !important;
            clear:both !important;
            margin:0 0 10px 0 !important;
            border-collapse:collapse !important;
            table-layout:auto !important;
          `,
        );
      },
    );

    /*
     * Also remove layout styles from wrappers that may cause
     * multiple day tables to sit horizontally.
     */
    Array.from(
      root.querySelectorAll(
        "div, section, article",
      ),
    ).forEach((element) => {
      const htmlElement =
        element as HTMLElement;

      const style =
        htmlElement.getAttribute("style") || "";

      if (
        /display\s*:\s*(flex|inline-flex|grid|inline-grid)/i.test(
          style,
        ) ||
        /float\s*:/i.test(style)
      ) {
        htmlElement.setAttribute(
          "style",
          `
            ${style}
            display:block !important;
            float:none !important;
            clear:both !important;
            width:700px !important;
            max-width:700px !important;
          `,
        );
      }
    });

    return root.innerHTML;
  };

  const legSections = legs
    .map((leg) => {
      const hotspotSection =
        extractHotspotDetailsSection(
          leg.html,
        );

      if (!hotspotSection) {
        return "";
      }

      const hotspotBody =
        removeHotspotHeadingFromSection(
          hotspotSection,
        );

      const verticalHotspotBody =
        normalizeHotspotTablesForVerticalLayout(
          hotspotBody,
        );

      return `
        <table
          width="700"
          border="0"
          cellpadding="0"
          cellspacing="0"
          style="
            width:700px;
            max-width:700px;
            border-collapse:collapse;
            border-spacing:0;
            margin:14px 0 6px 0;
            font-family:Arial,sans-serif;
            color:#000066;
          "
        >
          <tr>
            <td
              style="
                padding:6px 0;
                font-size:13px;
                font-weight:700;
                text-align:left;
                vertical-align:middle;
              "
            >
              ${escapeHtml(leg.label)}
            </td>
          </tr>
        </table>

        <div
          style="
            width:700px;
            max-width:700px;
            display:block;
            clear:both;
            overflow:visible;
          "
        >
          ${verticalHotspotBody}
        </div>
      `;
    })
    .filter(Boolean);

  if (!legSections.length) {
    return "";
  }

  return `
    <table
      width="700"
      border="0"
      cellpadding="0"
      cellspacing="0"
      style="
        width:700px;
        max-width:700px;
        border-collapse:collapse;
        border-spacing:0;
        margin-top:20px;
        font-family:Arial,sans-serif;
      "
    >
      <tr>
        <td
          style="
            padding:8px 0;
            text-align:center;
            font-size:18px;
            font-weight:700;
            color:#000066;
          "
        >
          Hotspot Details
        </td>
      </tr>
    </table>

    ${legSections.join("")}
  `;
};

const normalizeClipboardVerticalLayout = (
  html: string,
): string => {
  if (!html) {
    return html;
  }

  const parser = new DOMParser();

  const doc = parser.parseFromString(
    `<div id="dvi-clipboard-vertical-root">${html}</div>`,
    "text/html",
  );

  const root = doc.querySelector(
    "#dvi-clipboard-vertical-root",
  ) as HTMLElement | null;

  if (!root) {
    return html;
  }

  /*
   * Gmail sometimes keeps copied top-level tables beside one
   * another when the original HTML contains old email/table
   * alignment styles.
   *
   * Force every SECTION-LEVEL table into one vertical column.
   *
   * Important:
   * Do not modify tables nested inside TD/TH cells.
   */
  Array.from(root.querySelectorAll("table")).forEach(
    (table) => {
      if (table.closest("td, th")) {
        return;
      }

      const htmlTable =
        table as HTMLTableElement;

      const currentStyle =
        htmlTable.getAttribute("style") || "";

      htmlTable.removeAttribute("align");

      htmlTable.setAttribute(
        "width",
        "700",
      );

      htmlTable.setAttribute(
        "cellspacing",
        "0",
      );

      htmlTable.setAttribute(
        "style",
        `
          ${currentStyle}
          width:700px !important;
          max-width:700px !important;
          display:table !important;
          float:none !important;
          clear:both !important;
          margin-left:0 !important;
          margin-right:0 !important;
          box-sizing:border-box !important;
        `,
      );
    },
  );

  /*
   * Do the same for section-level DIV wrappers/headings.
   *
   * This fixes:
   * - Recommended Hotel heading appearing on the right
   * - Vehicle Details heading appearing on the right
   * - Hotspot Details blocks
   * - Terms & Condition heading/content sitting side-by-side
   */
  Array.from(root.querySelectorAll("div")).forEach(
    (element) => {
      if (element.closest("td, th")) {
        return;
      }

      const htmlElement =
        element as HTMLElement;

      const currentStyle =
        htmlElement.getAttribute("style") || "";

      htmlElement.setAttribute(
        "style",
        `
          ${currentStyle}
          float:none !important;
          clear:both !important;
          box-sizing:border-box !important;
        `,
      );
    },
  );

  /*
   * Specifically normalize the visible section headings.
   * Their text stays centered, but their BLOCK starts from
   * the same left side as the tables.
   */
  const sectionHeadingMatchers = [
    /^Trip Summary$/i,
    /^Recommended Hotel\s*-\s*\d+$/i,
    /^Vehicle Details$/i,
    /^Hotspot Details$/i,
    /^Previous Leg\s+\d+$/i,
    /^Current Leg$/i,
    /^Terms\s*&?\s*Condition$/i,
  ];

  Array.from(
    root.querySelectorAll("div, table, p"),
  ).forEach((element) => {
    const text = String(
      element.textContent || "",
    )
      .replace(/\s+/g, " ")
      .trim();

    const isSectionHeading =
      sectionHeadingMatchers.some(
        (matcher) => matcher.test(text),
      );

    if (!isSectionHeading) {
      return;
    }

    /*
     * Only normalize the smallest heading element.
     * Do not alter a parent containing the full section.
     */
    const childText = Array.from(
      element.children,
    )
      .map((child) =>
        String(child.textContent || "")
          .replace(/\s+/g, " ")
          .trim(),
      )
      .filter(Boolean)
      .join(" ");

    if (
      childText &&
      childText !== text &&
      element.children.length > 1
    ) {
      return;
    }

    const htmlElement =
      element as HTMLElement;

    const currentStyle =
      htmlElement.getAttribute("style") || "";

    htmlElement.setAttribute(
      "style",
      `
        ${currentStyle}
        width:700px !important;
        max-width:700px !important;
        float:none !important;
        clear:both !important;
        margin-left:0 !important;
        margin-right:0 !important;
        box-sizing:border-box !important;
      `,
    );
  });

  /*
   * Add a hard clear between each top-level section.
   * This is very reliable in Gmail.
   */
  Array.from(root.children).forEach(
    (child) => {
      const htmlElement =
        child as HTMLElement;

      const currentStyle =
        htmlElement.getAttribute("style") || "";

      htmlElement.setAttribute(
        "style",
        `
          ${currentStyle}
          float:none !important;
          clear:both !important;
          margin-left:0 !important;
          margin-right:0 !important;
        `,
      );
    },
  );

  return root.innerHTML;
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
  removeDetailedCostRows = false,
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

/*
 * Multi-leg clipboard already shows its own consolidated
 * recommendation/leg cost summary.
 *
 * For normal single itinerary, keep the existing detailed
 * cost rows below Total Package Cost.
 */
if (removeDetailedCostRows) {
  doc.querySelectorAll("tr").forEach((row) => {
    const cells = Array.from(
      row.querySelectorAll<HTMLTableCellElement>(
        ":scope > td, :scope > th",
      ),
    );

    if (!cells.length) {
      return;
    }

    const label =
      cells[0]?.textContent
        ?.replace(/\s+/g, " ")
        .trim() || "";

if (
  /^Total Room Cost\b/i.test(label) ||
  /^Child With Bed Cost\b/i.test(label) ||
  /^Child Without Bed Cost\b/i.test(label) ||
  /^Extra Bed Cost\b/i.test(label) ||
  /^Total Vehicle Cost\b/i.test(label) ||
  /^Additional Margin$/i.test(label) ||
  /^Total Amount$/i.test(label) ||
  /^Total Round Off$/i.test(label) ||
  /^Net Payable To\b/i.test(label)
) {
  row.remove();
}
  });
}

return doc.body.innerHTML;
};

const buildPreviousLegSummaryHtml = ({
  legs,
  styles,
}: {
  legs: Array<{
    label: string;
    details: ItineraryDetailsResponse;
  }>;
  styles: {
    tableStyle: string;
    cellStyle: string;
    headerCellStyle: string;
    centerTitleStyle: string;
  };
}): string => {
  if (legs.length <= 1) {
    return "";
  }

  const formatAmount = (value: unknown) => {
    const amount = Number(value || 0);

    return `₹ ${amount.toLocaleString("en-IN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  const getLegAmount = (
    details: ItineraryDetailsResponse,
  ) => {
    const netPayable = Number(
      details.costBreakdown?.netPayable || 0,
    );

    if (netPayable > 0) {
      return netPayable;
    }

    return Number(details.overallCost || 0);
  };

  const getVehicleLabel = (
    details: ItineraryDetailsResponse,
  ) => {
    const vehicleLabels = (details.vehicles || [])
      .map((vehicle) => {
        const name = String(
          vehicle.vehicleTypeName || "",
        ).trim();

        const qty = Number(vehicle.totalQty || 0);

        if (!name) {
          return "";
        }

        return qty > 1
          ? `${name} (${qty})`
          : name;
      })
      .filter(Boolean);

    return vehicleLabels.length
      ? vehicleLabels.join(", ")
      : "--";
  };

  const totalPayable = legs.reduce(
    (sum, leg) => sum + getLegAmount(leg.details),
    0,
  );

  const route = legs
    .flatMap((leg) =>
      (leg.details.days || []).flatMap((day) => [
        day.departure,
        day.arrival,
      ]),
    )
    .map((location) => String(location || "").trim())
    .filter(Boolean)
    .filter(
      (location, index, all) =>
        index === 0 ||
        location !== all[index - 1],
    )
    .join(" - ");

  const legRows = legs
    .map(
      ({ label, details }) => `
        <tr>
          <td style="${styles.cellStyle}font-weight:700;">
            ${escapeHtml(label)}
          </td>

          <td style="${styles.cellStyle}">
            ${escapeHtml(details.dateRange || "--")}
          </td>

          <td style="${styles.cellStyle}">
            ${escapeHtml(getVehicleLabel(details))}
          </td>

          <td style="${styles.cellStyle}font-weight:700;">
            ${escapeHtml(formatAmount(getLegAmount(details)))}
          </td>
        </tr>
      `,
    )
    .join("");

  return `
    <div style="${styles.centerTitleStyle}margin-top:10px;">
      Trip Summary
    </div>

    <table
      width="700"
      border="1"
      cellpadding="0"
      cellspacing="0"
      style="${styles.tableStyle}"
    >
      <tr>
        <td style="${styles.cellStyle}font-weight:700;width:25%;">
          Route
        </td>

        <td
          colspan="3"
          style="${styles.cellStyle}"
        >
          ${escapeHtml(route || "--")}
        </td>
      </tr>

      ${legRows}

      <tr>
        <td
          colspan="3"
          style="${styles.cellStyle}font-weight:700;"
        >
          Total Payable
        </td>

        <td style="${styles.cellStyle}font-weight:700;">
          ${escapeHtml(formatAmount(totalPayable))}
        </td>
      </tr>
    </table>
  `;
};
/**
 * Removes only:
 *
 * 1. "Tour Itinerary Plan" heading
 * 2. The old API itinerary-information table containing:
 *    Start Date & Time, End Date & Time, Quote Id,
 *    Trip Night & Day, Entry Ticket Required,
 *    Nationality, Total Pax and Room Count.
 *
 * IMPORTANT:
 * Trip Summary, Recommended Hotels and every other clipboard
 * section must remain untouched.
 */
const removeTourItineraryPlanSection = (
  html: string,
): string => {
  if (!html) {
    return html;
  }

  const parser = new DOMParser();
  const doc = parser.parseFromString(
    `<div id="clipboard-root">${html}</div>`,
    "text/html",
  );

  const root = doc.querySelector(
    "#clipboard-root",
  ) as HTMLElement | null;

  if (!root) {
    return html;
  }

  /*
   * Find ONLY the itinerary-information table.
   *
   * Do not remove any parent/wrapper because that wrapper
   * may also contain Recommended Hotel sections.
   */
  const itineraryPlanTable = Array.from(
    root.querySelectorAll("table"),
  ).find((table) => {
    const text = (table.textContent || "")
      .replace(/\s+/g, " ")
      .trim()
      .toLowerCase();

    return (
      text.includes("start date & time") &&
      text.includes("end date & time") &&
      text.includes("quote id") &&
      text.includes("trip night & day") &&
      text.includes("entry ticket required") &&
      text.includes("nationality") &&
      text.includes("total pax") &&
      text.includes("room count")
    );
  });

  /*
   * Remove ONLY that exact table.
   */
  if (itineraryPlanTable) {
    itineraryPlanTable.remove();
  }

  /*
   * Find ONLY a leaf element whose complete visible text is
   * exactly "Tour Itinerary Plan".
   *
   * children.length === 0 is important:
   * it prevents us from accidentally matching/removing a
   * larger wrapper that also contains hotel sections.
   */
  const itineraryPlanHeading = Array.from(
    root.querySelectorAll("*"),
  ).find((element) => {
    if (element.children.length > 0) {
      return false;
    }

    const text = (element.textContent || "")
      .replace(/\s+/g, " ")
      .trim()
      .toLowerCase();

    return text === "tour itinerary plan";
  });

  if (itineraryPlanHeading) {
    itineraryPlanHeading.remove();
  }

  return root.innerHTML;
};
export type HotelClipboardActionRunOptions = {
  previewOnly?: boolean;
};
interface HotelClipboardActionOptions {
  selectedHotels: Record<string, boolean>;
  clipboardType: ItineraryClipboardMode;
  hotelDetails: unknown;
  itinerary: ItineraryDetailsResponse | null;
getSelectedClipboardGroups: (
  clipboardType: ItineraryClipboardMode,
) => Array<{
  label: string;
  groupType: number;
  hotels: any[];
}>;
buildClipboardHtml: (
  clipboardType: ItineraryClipboardMode,
  groupDetails?: ClipboardGroupDetails,
  multiLegGroupsOverride?: ClipboardLegHotelGroup[],
) => {
  html?: string;
  packageSectionsHtml?: string;
};
  mergeClipboardWithB2BRecommendedPackages: (
    html: string,
    localHtml: string,
  ) => string;
  replaceHighlightsHotspotDetailsHtml: (
    html: string,
    detailsHtml: string,
  ) => string;
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

clipboardIncludeSections: ClipboardIncludeSections;
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
clipboardIncludeSections,
}: HotelClipboardActionOptions) => {
  return useCallback(
  async (
    runOptions?: HotelClipboardActionRunOptions,
  ) => {
    const previewOnly =
      runOptions?.previewOnly === true;
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

const groupDetailsMap: ClipboardGroupDetails = {};

const groupDetails = await Promise.all(
  groupTypes.map(async (groupType) => {
    try {
      const details = await ItineraryService.getDetails(
        itinerary.quoteId || "",
        groupType,
      );

      return [groupType, details] as const;
    } catch (error) {
      console.warn(
        `Failed to load group ${groupType} details; using active itinerary totals`,
        error,
      );

      return null;
    }
  }),
);

groupDetails.forEach((entry) => {
  if (!entry) return;

  const [groupType, details] = entry;

  if (groupType && details) {
    groupDetailsMap[groupType] =
      details as ItineraryDetailsResponse;
  }
});

const previousLegs =
  await loadPreviousLegClipboardItems(
    itinerary,
  );

const selectedPreviousLegs = previousLegs.filter(
  (previousLeg) =>
    selectedClipboardLegs?.[
      `previous-${previousLeg.actualQuoteId}`
    ] === true,
);

const previousLegHotelGroups: ClipboardLegHotelGroup[] =
  await Promise.all(
    selectedPreviousLegs.map(async (previousLeg, index) => {
      const previousLegKey =
        `previous-${previousLeg.actualQuoteId}`;

const explicitlySelectedPreviousGroupTypes = [
  ...(selectedClipboardHotelOptions?.[
    previousLegKey
  ] || []),
]
  .map((groupType) => Number(groupType))
  .filter((groupType) => groupType > 0)
  .sort((a, b) => a - b);

/*
 * If this previous leg has explicit hotel-option selections,
 * use them.
 *
 * Otherwise use the same recommendation options selected
 * for the current combined clipboard.
 */
const previousGroupTypes =
  explicitlySelectedPreviousGroupTypes.length > 0
    ? explicitlySelectedPreviousGroupTypes
    : groupTypes;

/*
 * Hotel-details is group based.
 *
 * Load every selected recommendation separately so that
 * every hotel day from every previous leg is available.
 */
const previousRecommendations = await Promise.all(
  previousGroupTypes.map(async (groupType) => {
    const [
      previousHotelDetails,
      previousRecommendationDetails,
    ] = await Promise.all([
      ItineraryService.getHotelDetails(
        previousLeg.actualQuoteId,
        undefined,
        undefined,
        groupType,
      ),

      ItineraryService.getDetails(
        previousLeg.actualQuoteId,
        groupType,
      ),
    ]);

const previousHotelRows =
  getClipboardCommittedHotelRows(
    previousHotelDetails,
    groupType,
  );

console.log("🔥 Previous leg hotel group loaded:", {
  quoteId: previousLeg.actualQuoteId,
  previousLegKey,
  groupType,
  hotelCount: previousHotelRows.length,
  hotels: previousHotelRows,
  hotelSelectionState:
    previousHotelDetails?.hotelSelectionState,
});

    return {
      label: `Recommended Hotel - ${groupType}`,
      groupType,
      hotels: previousHotelRows,

      details:
        previousRecommendationDetails as ItineraryDetailsResponse,
    };
  }),
);

/*
 * Keep recommendation-specific itinerary details for this
 * previous leg.
 *
 * These totals are used by the consolidated clipboard so:
 * Recommended #1 uses this leg's #1 overall cost,
 * Recommended #2 uses this leg's #2 overall cost, etc.
 */
const previousGroupDetailsMap: ClipboardGroupDetails = {};

previousRecommendations.forEach((recommendation) => {
  const recommendationGroupType = Number(
    recommendation?.groupType || 0,
  );

  if (
    recommendationGroupType > 0 &&
    recommendation?.details
  ) {
    previousGroupDetailsMap[recommendationGroupType] =
      recommendation.details;
  }
});

const previousGroups = previousRecommendations
  .filter(
    (
      group,
    ): group is {
      label: string;
      groupType: number;
      hotels: any[];
      details: ItineraryDetailsResponse;
    } =>
      Boolean(group) &&
      Number(group.groupType) > 0 &&
      Array.isArray(group.hotels) &&
      Boolean(group.details),
  )
  .map((group) => ({
    label: group.label,
    groupType: Number(group.groupType),
    hotels: group.hotels,
  }));

console.log("🔥 PREVIOUS LEG FINAL GROUPS:", {
  previousLegKey,
  quoteId: previousLeg.actualQuoteId,
  groups: previousGroups.map((group) => ({
    groupType: group.groupType,
    hotelCount: group.hotels.length,
    hotels: group.hotels,
  })),
});

return {
  label: `Previous Leg ${index + 1}`,
  itinerary: previousLeg.details,
  groups: previousGroups,
  groupDetails: previousGroupDetailsMap,
};
    }),
  );
const currentLegGroupTypes =
  currentLegSelectedHotelOptions.length > 0
    ? currentLegSelectedHotelOptions
    : groupTypes;

const currentLegGroups: ClipboardLegHotelGroup["groups"] =
  includeCurrentLeg
    ? (
        await Promise.all(
          currentLegGroupTypes.map(async (groupType) => {
            try {
              const currentHotelDetails =
                await ItineraryService.getHotelDetails(
                  itinerary.quoteId,
                  undefined,
                  undefined,
                  groupType,
                );

             const currentHotelRows =
  getClipboardCommittedHotelRows(
    currentHotelDetails,
    groupType,
  );

console.log("🔥 Current leg hotel group loaded:", {
  quoteId: itinerary.quoteId,
  currentLegKey,
  groupType,
  hotelCount: currentHotelRows.length,
  hotels: currentHotelRows,
  hotelSelectionState:
    currentHotelDetails?.hotelSelectionState,
});

              return {
                label: `Recommended Hotel - ${groupType}`,
                groupType: Number(groupType),
                hotels: currentHotelRows,
              };
            } catch (error) {
              console.warn(
                `Failed to load current leg hotel group ${groupType}`,
                error,
              );

              /*
               * Keep the existing frontend-selected group as a fallback.
               * This protects the normal clipboard flow if the hotel-details
               * request fails for an older itinerary.
               */
              const fallbackGroup =
                getSelectedClipboardGroups(clipboardType).find(
                  (group) =>
                    Number(group.groupType) === Number(groupType),
                );

              return fallbackGroup
                ? {
                    label: fallbackGroup.label,
                    groupType: Number(fallbackGroup.groupType),
                    hotels: fallbackGroup.hotels,
                  }
                : null;
            }
          }),
        )
      )
        .filter(
          (
            group,
          ): group is ClipboardLegHotelGroup["groups"][number] =>
            Boolean(group) &&
            Number(group.groupType) > 0 &&
            Array.isArray(group.hotels),
        )
        .sort(
          (a, b) =>
            Number(a.groupType) - Number(b.groupType),
        )
    : [];

const multiLegHotelGroups: ClipboardLegHotelGroup[] = [
  ...previousLegHotelGroups,

  ...(includeCurrentLeg
    ? [
        {
          label: "Current Leg",
          itinerary,
          groups: currentLegGroups,
          groupDetails: groupDetailsMap,
        },
      ]
    : []),
];

console.log(
  "🔥 EXACT MULTI LEG INPUT TO BUILDER:",
  multiLegHotelGroups.map((leg) => ({
    label: leg.label,
    quoteId: leg.itinerary?.quoteId,
    groups: leg.groups.map((group) => ({
      groupType: group.groupType,
      hotelCount: group.hotels?.length ?? 0,
      firstHotel: group.hotels?.[0],
      lastHotel: group.hotels?.[group.hotels.length - 1],
    })),
  })),
);
const hasMultiLegClipboard =
  selectedPreviousLegs.length > 0;

const selectedLegBackendClipboardHtml: Array<{
  label: string;
  html: string;
}> = [];

if (hasMultiLegClipboard) {
  const previousClipboardResponses =
    await Promise.all(
      selectedPreviousLegs.map(
        async (previousLeg, index) => {
          const legKey =
            `previous-${previousLeg.actualQuoteId}`;

          const selectedGroupTypes = [
            ...(selectedClipboardHotelOptions?.[
              legKey
            ] || []),
          ]
            .map(Number)
            .filter(
              (groupType) =>
                groupType > 0,
            )
            .sort((a, b) => a - b);

          const legGroupTypes =
            selectedGroupTypes.length > 0
              ? selectedGroupTypes
              : groupTypes;

          const response =
            await ItineraryService.getClipboardContent(
              previousLeg.actualQuoteId,
              clipboardType,
              legGroupTypes,
            );

          return {
            label: `Previous Leg ${index + 1}`,
            html: response?.html || "",
          };
        },
      ),
    );

  selectedLegBackendClipboardHtml.push(
    ...previousClipboardResponses,
  );

  if (includeCurrentLeg && html) {
    selectedLegBackendClipboardHtml.push({
      label: "Current Leg",
      html,
    });
  }
}
const localClipboard = hasMultiLegClipboard
  ? buildClipboardHtml(
      clipboardType,
      groupDetailsMap,
      multiLegHotelGroups,
    )
  : buildClipboardHtml(
      clipboardType,
      groupDetailsMap,
    );

console.log("🔥 LOCAL CLIPBOARD BUILT:", {
  htmlLength: localClipboard.html?.length ?? 0,
  packageSectionsHtmlLength:
    localClipboard.packageSectionsHtml?.length ?? 0,
});

/*
 * Replace only the backend Recommended Hotel / Vehicle / Cost middle
 * section with the locally rebuilt package sections.
 *
 * For Continue Planning, buildClipboardHtml() already combines:
 *
 * Previous Leg 1
 * Previous Leg 2
 * ...
 * Current Leg
 *
 * The merger keeps the rest of the backend clipboard HTML intact,
 * including the content that comes after the package section.
 */console.log("🔥 BACKEND CLIPBOARD HTML BEFORE MERGE:", html);

console.log(
  "🔥 LOCAL PACKAGE SECTIONS BEFORE MERGE:",
  localClipboard.packageSectionsHtml,
);

console.log(
  "🔥 LOCAL FULL HTML BEFORE MERGE:",
  localClipboard.html,
);
const mergedPackageHtml =
  localClipboard.packageSectionsHtml ||
  localClipboard.html ||
  "";

let mergedHtml = "";

if (hasMultiLegClipboard) {
  /*
   * Complete / Continue Planning clipboard.
   *
   * Hotel Options:
   * already consolidated by buildClipboardHtml()
   * from oldest selected leg -> current selected leg.
   */
  const consolidatedHotspotHtml =
    buildConsolidatedHotspotDetailsHtml(
      selectedLegBackendClipboardHtml,
    );

  /*
   * Terms & Condition appears once at the bottom.
   *
   * Prefer the last selected itinerary, normally Current Leg.
   * If Current Leg is not selected, this naturally uses the
   * newest selected previous leg.
   */
  const termsHtml =
    [...selectedLegBackendClipboardHtml]
      .reverse()
      .map((leg) =>
        extractTermsAndConditionSection(
          leg.html,
        ),
      )
      .find(Boolean) || "";

  mergedHtml = [
    mergedPackageHtml,
    consolidatedHotspotHtml,
    termsHtml,
  ]
    .filter(Boolean)
    .join("");
} else {
  /*
   * Existing normal single-itinerary clipboard.
   * Keep this behavior unchanged.
   */
  mergedHtml =
    mergeClipboardWithB2BRecommendedPackages(
      html,
      mergedPackageHtml,
    );

  if (clipboardType === "highlights") {
    mergedHtml =
      replaceHighlightsHotspotDetailsHtml(
        mergedHtml,
        buildHighlightsHotspotDetailsHtml(),
      );
  }

  if (
    Number(
      itinerary.itineraryPreference || 0,
    ) === 1
  ) {
    mergedHtml =
      removeHotspotDetailsSection(
        mergedHtml,
      );
  } else {
    mergedHtml =
      addHotspotDetailsParagraphSpacing(
        mergedHtml,
      );
  }
}

mergedHtml =
  replaceVehicleRowWithPackageCost(
    mergedHtml,
    itinerary,
    true,
  );

/*
 * Include every previous Continue Planning leg.
 *
 * Same groupTypes are used so:
 * Recommended #1 -> previous Recommended #1
 * Para selected groups -> same previous groups
 * etc.
 */

/*
 * loadPreviousLegClipboardItems() already returns
 * oldest -> newest.
 *
 * Current itinerary is added last.
 */
const selectedLegsForSummary = [
  ...selectedPreviousLegs.map((previousLeg, index) => ({
    label: `Previous Leg ${index + 1}`,
    details: previousLeg.details,
  })),

  ...(includeCurrentLeg && itinerary
    ? [
        {
          label: "Current Leg",
          details: itinerary,
        },
      ]
    : []),
];

const previousLegSummaryHtml =
  selectedPreviousLegs.length > 0
    ? buildPreviousLegSummaryHtml({
        legs: selectedLegsForSummary,
        styles: {
          tableStyle:
            "width:700px;border-collapse:collapse;border-spacing:0;color:#000066;font-family:Arial,sans-serif;font-size:12px;",
          cellStyle:
            "border:1px solid #808080;padding:6px;vertical-align:middle;",
          headerCellStyle:
            "border:1px solid #808080;padding:6px;vertical-align:middle;font-weight:700;",
          centerTitleStyle:
            "width:700px;text-align:center;font-family:Arial,sans-serif;font-size:16px;font-weight:700;color:#000066;padding:8px 0;",
        },
      })
    : "";

const rawCompleteClipboardHtml =
  hasMultiLegClipboard
    ? removeTourItineraryPlanSection(
        [
          previousLegSummaryHtml,
          mergedHtml,
        ]
          .filter(Boolean)
          .join(""),
      )
    : mergedHtml;

const completeClipboardHtml =
  hasMultiLegClipboard
    ? normalizeClipboardVerticalLayout(
        rawCompleteClipboardHtml,
      )
    : rawCompleteClipboardHtml;

if (!completeClipboardHtml.trim()) {
 console.error("Clipboard content is empty", {
  currentLegKey,
  includeCurrentLeg,
  selectedClipboardLegs,
  selectedClipboardHotelOptions,
});

  toast.error(
    "Nothing selected to copy. Please select at least one leg.",
  );

  return;
}

const clipboardPlainText =
  htmlToPlainText(completeClipboardHtml);

if (previewOnly) {
  const previewWindow = window.open(
    "",
    "_blank",
  );

  if (!previewWindow) {
    toast.error(
      "Unable to open preview. Please allow pop-ups and try again.",
    );
    return;
  }

  try {
    previewWindow.opener = null;
  } catch {
    // Ignore browsers that do not allow opener reassignment.
  }

  previewWindow.document.open();

  previewWindow.document.write(`
    <!doctype html>
    <html>
      <head>
        <meta charset="utf-8" />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1"
        />

        <title>Clipboard Preview</title>

        <style>
          body {
            margin: 0;
            padding: 24px;
            background: #ffffff;
            font-family: Arial, sans-serif;
          }

          .clipboard-preview {
            width: 100%;
            overflow-x: auto;
          }
        </style>
      </head>

      <body>
        <div class="clipboard-preview">
          ${completeClipboardHtml}
        </div>
      </body>
    </html>
  `);

  previewWindow.document.close();

  return;
}

console.log(
  "🔥 COPY STEP 4: ready to write clipboard",
  {
    completeClipboardHtmlLength:
      completeClipboardHtml.length,
    clipboardPlainTextLength:
      clipboardPlainText.length,
  },
);

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
clipboardIncludeSections,
setClipboardModal,
setSelectedHotels,
]);
};
