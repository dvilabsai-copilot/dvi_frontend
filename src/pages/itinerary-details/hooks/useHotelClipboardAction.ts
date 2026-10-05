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

  const hotelDetails =
    hotelDetailsValue as {
      hotelTabs?: Array<{
        groupType?: unknown;
      }>;
      hotels?: Array<{
        groupType?: unknown;
      }>;
    };

  const tabGroupTypes = Array.from(
    new Set(
      (
        Array.isArray(hotelDetails.hotelTabs)
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

  const hotelGroupTypes = Array.from(
    new Set(
      (
        Array.isArray(hotelDetails.hotels)
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

const getClipboardLegServiceFlags = (
  details?: ItineraryDetailsResponse | null,
): {
  showHotels: boolean;
  showVehicles: boolean;
} => {
  if (!details) {
    return {
      showHotels: false,
      showVehicles: false,
    };
  }

  const itineraryPreference = Number(
    details.itineraryPreference ?? 0,
  );

  /*
   * Keep exactly aligned with
   * useItineraryDisplayMode.ts.
   *
   * 1 = Hotel Only
   * 2 = Transportation Only
   * 3 = Hotel + Vehicle
   */
  if (itineraryPreference > 0) {
    return {
      showHotels:
        itineraryPreference === 1 ||
        itineraryPreference === 3,

      showVehicles:
        itineraryPreference === 2 ||
        itineraryPreference === 3,
    };
  }

  /*
   * Fallback only for older responses where
   * itineraryPreference is missing.
   */
  const hasHotelAmount =
    Number(
      details.costBreakdown?.totalHotelAmount ??
        details.costBreakdown?.totalRoomCost ??
        0,
    ) > 0;

  const hasVehicleSelection =
    Array.isArray(details.vehicleSelections) &&
    details.vehicleSelections.some(
      (selection: any) =>
        Number(selection?.vehicleTypeId || 0) > 0,
    );

  const hasAssignedVehicle =
    Array.isArray(details.vehicles) &&
    details.vehicles.some(
      (vehicle: any) =>
        vehicle?.isAssigned === true,
    );

  const vehicleAmount = Number(
    details.costBreakdown?.totalVehicleAmount ??
      details.costBreakdown?.totalVehicleCost ??
      0,
  );

  return {
    showHotels: hasHotelAmount,

    showVehicles:
      hasVehicleSelection ||
      hasAssignedVehicle ||
      vehicleAmount > 0,
  };
};
const isVehicleOnlyClipboardLeg = (
  details?: ItineraryDetailsResponse | null,
): boolean => {
  const services =
    getClipboardLegServiceFlags(details);

  return (
    services.showVehicles &&
    !services.showHotels
  );
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

/*
 * Senior clipboard format:
 *
 * Backend calls this block "Hotspot Details", but Complete
 * Itinerary must display it as "Itinerary Plan".
 *
 * Also:
 * - every KM decimal must display as .00
 * - decode backend text entities such as &ndash; / &#039;
 *
 * This is display-only. It does not change route/KM data.
 */
const normalizeItineraryPlanBody = (
  html: string,
): string => {
  if (!html) {
    return "";
  }

  const parser = new DOMParser();

  const doc = parser.parseFromString(
    `<div id="itinerary-plan-body">${html}</div>`,
    "text/html",
  );

  const root = doc.querySelector(
    "#itinerary-plan-body",
  ) as HTMLElement | null;

  if (!root) {
    return html;
  }

  /*
   * Some backend descriptions are HTML-encoded twice.
   *
   * Examples currently visible in clipboard:
   *
   * &ndash;
   * &#039;
   * &rsquo;
   *
   * Decode text nodes only so HTML structure remains untouched.
   */
  const decodeText = (
    value: string,
  ): string => {
    let decoded = value;

    for (let pass = 0; pass < 2; pass += 1) {
      const textarea =
        document.createElement("textarea");

      textarea.innerHTML = decoded;

      const nextValue =
        textarea.value;

      if (nextValue === decoded) {
        break;
      }

      decoded = nextValue;
    }

    return decoded;
  };

  const walker =
    document.createTreeWalker(
      root,
      NodeFilter.SHOW_TEXT,
    );

  const textNodes: Text[] = [];

  let currentNode =
    walker.nextNode();

  while (currentNode) {
    textNodes.push(
      currentNode as Text,
    );

    currentNode =
      walker.nextNode();
  }

  textNodes.forEach((textNode) => {
    const original =
      textNode.nodeValue || "";

    let formatted =
      decodeText(original);

    /*
     * Senior requirement:
     *
     * 186.43 KM -> 186.00 KM
     * 109.32 KM -> 109.00 KM
     * 56.74 KM  -> 56.00 KM
     *
     * Truncate only the decimal part.
     * Do not round the KM upward.
     */
    formatted = formatted.replace(
      /(\d+)\.\d+\s*KM\b/gi,
      (_match, wholeNumber) =>
        `${wholeNumber}.00 KM`,
    );

    textNode.nodeValue =
      formatted;
  });

  return root.innerHTML;
};

/*
 * Complete / Continue Planning:
 *
 * Combine Hotspot Details from every selected leg.
 *
 * Each backend clipboard already contains that leg's
 * Hotspot Details section. Keep one common heading and
 * append every selected leg underneath it.
 */
const buildConsolidatedHotspotDetailsHtml = (
  legs: Array<{
    label: string;
    html: string;
  }>,
): string => {
  if (!legs.length) {
    return "";
  }

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

if (!hotspotBody.trim()) {
  return "";
}

const itineraryPlanBody =
  normalizeItineraryPlanBody(
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
      border-collapse:collapse;
      font-family:Arial,sans-serif;
      font-size:12px;
      color:#000066;
      margin:0;
    "
  >
    <tr>
      <td
        style="
          padding:6px 2px;
          font-weight:700;
        "
      >
        ${escapeHtml(leg.label)}
      </td>
    </tr>
  </table>

  ${itineraryPlanBody}
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
        border-collapse:collapse;
        font-family:Arial,sans-serif;
        font-size:12px;
        color:#000066;
        margin:0;
      "
    >
      <tr>
       <td
  style="
    border:1px solid #999999;
    padding:6px;
    text-align:center;
    font-size:14px;
    font-weight:700;
  "
>
  Itinerary Plan
</td>
      </tr>
    </table>

    ${legSections.join("")}
  `;
};

/*
 * Extract only the Terms & Condition section
 * from backend clipboard HTML.
 */
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

  let termsHtml =
    html.slice(start);

  /*
   * Senior requirement:
   *
   * Remove only this House Boat note:
   *
   * "If staying in the House boat At Alleppey/Kumarakom"
   * and its following explanatory Note.
   *
   * Everything from "Rate does not include (Exclusion)"
   * onward must remain exactly as it is.
   */
  termsHtml = termsHtml.replace(
    /If\s+staying\s+in\s+the\s+House\s+boat\s+At\s+Alleppey\/Kumarakom[\s\S]*?(?=Rate\s+does\s+not\s+include)/i,
    "",
  );

  return termsHtml;
};

/*
 * Single Hotel + Vehicle clipboard:
 *
 * Apply the same senior formatting that already works
 * for Complete / Continue Planning.
 *
 * - Hotspot Details -> Itinerary Plan
 * - KM decimals -> .00
 * - Decode HTML entities
 * - Remove House Boat note from Terms
 */
const normalizeSingleHotelVehicleClipboardHtml = (
  html: string,
): string => {
  if (!html) {
    return "";
  }

  let normalizedHtml = html;

  /*
   * Normalize the existing Hotspot Details section.
   */
  const hotspotSection =
    extractHotspotDetailsSection(
      normalizedHtml,
    );

  if (hotspotSection) {
    const normalizedHotspotSection =
      normalizeItineraryPlanBody(
        hotspotSection,
      ).replace(
        /Hotspot Details/i,
        "Itinerary Plan",
      );

    normalizedHtml =
      normalizedHtml.replace(
        hotspotSection,
        normalizedHotspotSection,
      );
  }

  /*
   * Replace the original Terms section with the cleaned
   * Terms section returned by extractTermsAndConditionSection().
   */
  const termsHeadingMatch =
    normalizedHtml.match(
      /Terms\s*&?\s*Condition/i,
    );

  if (
    termsHeadingMatch &&
    termsHeadingMatch.index !== undefined
  ) {
    const termsTableStart =
      normalizedHtml.lastIndexOf(
        "<table",
        termsHeadingMatch.index,
      );

    const termsStart =
      termsTableStart >= 0
        ? termsTableStart
        : termsHeadingMatch.index;

    const cleanedTerms =
      extractTermsAndConditionSection(
        normalizedHtml,
      );

    if (cleanedTerms) {
      normalizedHtml =
        normalizedHtml.slice(
          0,
          termsStart,
        ) + cleanedTerms;
    }
  }

  return normalizedHtml;
};

const buildVehicleOnlyTermsHtml = (): string => {
  return `
    <table
      width="700"
      border="0"
      cellpadding="0"
      cellspacing="0"
      style="
        width:700px;
        border-collapse:collapse;
        font-family:Arial,sans-serif;
        font-size:12px;
        color:#000066;
      "
    >
      <tr>
        <td
          style="
            border:1px solid #000066;
            padding:8px;
            text-align:center;
            font-size:18px;
            font-weight:700;
          "
        >
          Terms &amp; Condition
        </td>
      </tr>

      <tr>
        <td
          style="
            border:1px solid #000066;
            padding:8px;
            line-height:1.5;
          "
        >
          <strong>
            Very Important :: VEHICLE DRIVING UP HILL WILL BE NON AC
          </strong>

          <br /><br />

          IMPORTANT:

          <br /><br />

          The Quotation quoted is valid for 3 days from the date of quote,
          if the travel of the Guest is below then three of from the quoted
          date the valid quote only for quoted date and Company Reserves the
          right to change the prices depends on the availability of prices
          and inventory
        </td>
      </tr>
    </table>
  `;
};

const buildGuideServicesAndActivitiesHtml = (
  legs: Array<{
    label: string;
    details: ItineraryDetailsResponse;
    guideAssignments?: any[];
  }>,
  includeActivities = true,
): string => {
  if (!legs.length) {
    return "";
  }

  const formatDate = (
    value: unknown,
  ): string => {
    const raw = String(
      value ?? "",
    ).trim();

    if (!raw) {
      return "";
    }

    const match = raw.match(
      /(\d{4})-(\d{2})-(\d{2})/,
    );

    if (!match) {
      return raw;
    }

    const [, year, month, day] =
      match;

    const date = new Date(
      Number(year),
      Number(month) - 1,
      Number(day),
    );

    return date.toLocaleDateString(
      "en-GB",
      {
        day: "2-digit",
        month: "short",
      },
    );
  };

const guideRows: string[] = [];
const activityRows: string[] = [];

legs.forEach(
  ({
    details,
    guideAssignments = [],
  }) => {
    const days = Array.isArray(
      details.days,
    )
      ? details.days
      : [];

    const legGuideAssignments =
      Array.isArray(guideAssignments)
        ? guideAssignments
        : [];

    days.forEach((day: any) => {
      const dayDate =
        formatDate(
          day?.date ??
            day?.routeDate ??
            day?.startDate,
        );

      const destination =
        String(
          day?.arrival ??
            day?.destination ??
            day?.departure ??
            "",
        ).trim();

      /*
       * GUIDE SERVICES
       */
/*
 * Match guide assignment exactly like the normal
 * itinerary screen:
 *
 * guideType 2 = Day Wise
 * guideType 1 = Whole Itinerary
 *
 * Prefer a day-wise assignment for the current day.
 * If there is no day-wise assignment, use the
 * Whole Itinerary assignment for that day.
 */
const dayWiseGuide =
  legGuideAssignments.find(
    (assignment: any) => {
      if (
        Number(
          assignment?.guideType || 0,
        ) !== 2
      ) {
        return false;
      }

      const assignmentDate =
        String(
          assignment?.routeDate ?? "",
        )
          .slice(0, 10);

      const itineraryDayDate =
        String(
          day?.date ??
            day?.routeDate ??
            "",
        )
          .slice(0, 10);

      /*
       * Primary match for day-wise guide.
       */
      if (
        assignmentDate &&
        itineraryDayDate &&
        assignmentDate === itineraryDayDate
      ) {
        return true;
      }

      /*
       * Route-id fallback for existing / older data.
       */
      const assignmentRouteId =
        Number(
          assignment?.routeId || 0,
        );

      const dayRouteId =
        Number(
          day?.routeId ??
            day?.id ??
            0,
        );

      return (
        assignmentRouteId > 0 &&
        dayRouteId > 0 &&
        assignmentRouteId ===
          dayRouteId
      );
    },
  );

/*
 * Whole Itinerary assignments are intentionally not
 * tied to one route/day.
 *
 * The existing DVI itinerary logic uses guideType === 1
 * as the fallback guide for every day.
 */
const wholeItineraryGuide =
  legGuideAssignments.find(
    (assignment: any) =>
      Number(
        assignment?.guideType || 0,
      ) === 1,
  );

const dayGuide =
  dayWiseGuide ??
  wholeItineraryGuide;
      if (dayGuide) {
        const guideSlot =
          Array.isArray(
            dayGuide
              ?.guideSlotLabels,
          )
            ? dayGuide
                .guideSlotLabels
                .filter(Boolean)
                .join(", ")
            : String(
                dayGuide
                  ?.guideSlot ??
                  "",
              ).trim();

        const guideName =
          String(
            dayGuide
              ?.guideName ??
              "",
          ).trim();

        const guideParts = [
          dayDate,
          destination,
          guideSlot
            ? `Guide ${guideSlot}`
            : "Guide",
          guideName
            ? `- ${guideName}`
            : "",
        ]
          .filter(Boolean)
          .join(" - ")
          .replace(
            /\s+-\s+-\s+/g,
            " - ",
          );

        guideRows.push(`
          <tr>
            <td
              style="
                border:1px solid #999999;
                padding:5px;
                color:#000066;
                font-family:Arial,sans-serif;
                font-size:12px;
              "
            >
              ${escapeHtml(
                guideParts,
              )}
            </td>
          </tr>
        `);
      }

/*
 * ACTIVITIES
 *
 * Respect the existing "Activities" selection
 * from the Complete Itinerary clipboard modal.
 */
if (!includeActivities) {
  return;
}

const segments =
  Array.isArray(
    day?.segments,
  )
    ? day.segments
    : [];

segments.forEach(
  (segment: any) => {
          if (
            String(
              segment?.type ??
                "",
            ).toLowerCase() !==
            "attraction"
          ) {
            return;
          }

          const activities =
            Array.isArray(
              segment?.activities,
            )
              ? segment.activities
              : [];

          activities.forEach(
            (activity: any) => {
              const activityTitle =
                String(
                  activity?.title ??
                    activity?.name ??
                    "",
                ).trim();

              if (!activityTitle) {
                return;
              }

              const activityLocation =
                String(
                  segment?.name ??
                    destination ??
                    "",
                ).trim();

              const activityText = [
                dayDate,
                activityLocation,
                activityTitle,
              ]
                .filter(Boolean)
                .join(" - ");

              activityRows.push(`
                <tr>
                  <td
                    style="
                      border:1px solid #999999;
                      padding:5px;
                      color:#000066;
                      font-family:Arial,sans-serif;
                      font-size:12px;
                    "
                  >
                    ${escapeHtml(
                      activityText,
                    )}
                  </td>
                </tr>
              `);
            },
          );
        },
      );
    });
  });

  if (
    !guideRows.length &&
    !activityRows.length
  ) {
    return "";
  }

  const guideSection =
    guideRows.length > 0
      ? `
        <table
          width="700"
          border="0"
          cellpadding="0"
          cellspacing="0"
          style="
            width:700px;
            border-collapse:collapse;
            font-family:Arial,sans-serif;
            font-size:12px;
            color:#000066;
            margin:0;
          "
        >
          <tr>
            <td
              style="
                border:1px solid #999999;
                padding:5px;
                text-align:center;
                font-size:14px;
                font-weight:700;
              "
            >
              Guide Services
            </td>
          </tr>

          ${guideRows.join("")}
        </table>
      `
      : "";

  const activitySection =
    activityRows.length > 0
      ? `
        <table
          width="700"
          border="0"
          cellpadding="0"
          cellspacing="0"
          style="
            width:700px;
            border-collapse:collapse;
            font-family:Arial,sans-serif;
            font-size:12px;
            color:#000066;
            margin:0;
          "
        >
          <tr>
            <td
              style="
                border:1px solid #999999;
                padding:5px;
                text-align:center;
                font-size:14px;
                font-weight:700;
              "
            >
              Activities
            </td>
          </tr>

          ${activityRows.join("")}
        </table>
      `
      : "";

  return [
    guideSection,
    activitySection,
  ]
    .filter(Boolean)
    .join("");
};

const buildSpecialInstructionsHtml = (
  legs: Array<{
    label: string;
    details: ItineraryDetailsResponse;
  }>,
): string => {
  if (!legs.length) {
    return "";
  }

  const instructionRows = legs
    .map(({ details }) => {
      const source =
        details as ItineraryDetailsResponse &
          Record<string, any>;

      const plan =
        source?.plan &&
        typeof source.plan === "object"
          ? source.plan
          : {};

      const specialInstructions = String(
        source?.special_instructions ??
          source?.specialInstructions ??
          source?.special_instruction ??
          source?.specialInstruction ??
          plan?.special_instructions ??
          plan?.specialInstructions ??
          "",
      ).trim();

      if (!specialInstructions) {
        return "";
      }

      return `
        <tr>
          <td
            style="
              border:1px solid #999999;
              padding:5px;
              color:#000066;
              font-family:Arial,sans-serif;
              font-size:12px;
              white-space:pre-line;
            "
          >
            ${escapeHtml(specialInstructions)}
          </td>
        </tr>
      `;
    })
    .filter(Boolean);

  if (!instructionRows.length) {
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
        border-collapse:collapse;
        font-family:Arial,sans-serif;
        font-size:12px;
        color:#000066;
        margin:0;
      "
    >
      <tr>
        <td
          style="
            border:1px solid #999999;
            padding:5px;
            text-align:center;
            font-size:14px;
            font-weight:700;
          "
        >
          Special Instructions
        </td>
      </tr>

      ${instructionRows.join("")}
    </table>
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

  /^Guide Services$/i,
  /^Activities$/i,
  /^Special Instructions$/i,
  /^Transportation Details$/i,

  /^Hotels Curated Choice\s*:?\s*:?\s*\d+$/i,
  /^Travel Plan\s+\d+$/i,
  /^Price Summary$/i,

  /^(Hotspot Details|Itinerary Plan)$/i,
  /^Leg\s+\d+$/i,
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
  const services =
    getClipboardLegServiceFlags(details);

  /*
   * Hotel-only leg must not show a vehicle
   * in the multi-leg Trip Summary.
   */
  if (!services.showVehicles) {
    return "--";
  }

  const selectedVehicleTypeIds = new Set(
    (details.vehicleSelections || [])
      .map((selection) =>
        Number(selection.vehicleTypeId || 0),
      )
      .filter((vehicleTypeId) => vehicleTypeId > 0),
  );

  const vehicleLabels = (details.vehicles || [])
    .filter((vehicle) => {
      const vehicleTypeId = Number(
        vehicle.vehicleTypeId || 0,
      );

    return (
  vehicle.isAssigned === true &&
  (
    selectedVehicleTypeIds.size === 0 ||
    selectedVehicleTypeIds.has(vehicleTypeId)
  )
);
    })
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
    <div
      style="
        ${styles.centerTitleStyle}
        margin-top:8px;
        margin-bottom:4px;
      "
    >
      Transportation Details
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
const buildVehicleOnlyTripSummaryHtml = (
  legs: Array<{
    label: string;
    details: ItineraryDetailsResponse;
  }>,
  currentOverallTripCost?: number,
): string => {
  if (!legs.length) {
    return "";
  }

  const formatDate = (
    value: unknown,
  ): string => {
    const raw = String(value ?? "").trim();

    if (!raw) {
      return "--";
    }

    const isoMatch = raw.match(
      /(\d{4})-(\d{2})-(\d{2})/,
    );

    if (!isoMatch) {
      return raw;
    }

    const [, year, month, day] =
      isoMatch;

    const date = new Date(
      Number(year),
      Number(month) - 1,
      Number(day),
    );

    return date
      .toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "2-digit",
      })
      .replace(/ /g, "-");
  };

  const formatAmount = (
    value: unknown,
  ): string => {
    const amount = Number(value || 0);

    return `₹ ${amount.toLocaleString(
      "en-IN",
      {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      },
    )}`;
  };

const getSelectedVehicleRows = (
  details: ItineraryDetailsResponse,
) => {
  const selectedVehicleTypeIds =
    new Set(
      (
        details.vehicleSelections || []
      )
        .map((selection) =>
          Number(
            selection.vehicleTypeId || 0,
          ),
        )
        .filter(
          (vehicleTypeId) =>
            vehicleTypeId > 0,
        ),
    );

  return (
    details.vehicles || []
  ).filter((vehicle) => {
    const vehicleTypeId = Number(
      vehicle.vehicleTypeId || 0,
    );

    return (
      vehicle.isAssigned === true &&
      (
        selectedVehicleTypeIds.size === 0 ||
        selectedVehicleTypeIds.has(
          vehicleTypeId,
        )
      )
    );
  });
};

  const summaryRows: string[] = [];

  let totalPayable = 0;

  legs.forEach(({ details }) => {
    const days = Array.isArray(
      details.days,
    )
      ? details.days
      : [];

    const firstDay: any =
      days[0] || {};

    const lastDay: any =
      days[days.length - 1] || firstDay;

    const arrivalDate =
      firstDay?.date ??
      firstDay?.routeDate ??
      firstDay?.startDate ??
      "";

    const departureDate =
      lastDay?.date ??
      lastDay?.routeDate ??
      lastDay?.startDate ??
      "";

    const arrivalLocation = String(
      firstDay?.departure ??
        firstDay?.source ??
        firstDay?.locationName ??
        "--",
    ).trim();

    const departureLocation = String(
      lastDay?.arrival ??
        lastDay?.destination ??
        lastDay?.nextVisitingLocation ??
        "--",
    ).trim();

    const vehicles =
      getSelectedVehicleRows(details);

    vehicles.forEach(
      (vehicle, vehicleIndex) => {
   const quantity = Math.max(
  Number(
    vehicle.totalQty ?? 1,
  ) || 1,
  1,
);

/*
 * In the persisted selected vehicle row,
 * totalAmount represents the amount for
 * one selected vehicle.
 *
 * Quantity is stored separately.
 *
 * Example:
 * MUV 6+1
 * amount   = ₹11,779.30
 * quantity = 4
 *
 * Total = ₹11,779.30 × 4
 */
let costPerVehicle = Number(
  vehicle.totalAmount || 0,
);

/*
 * Safe fallback for older itineraries where
 * the vehicle row has no amount.
 *
 * costBreakdown is already the aggregate
 * vehicle amount, so derive the unit price
 * from it before multiplying again.
 */
if (
  costPerVehicle <= 0 &&
  vehicles.length === 1
) {
  const fallbackVehicleTotal = Number(
    details.costBreakdown
      ?.totalVehicleAmount ??
      details.costBreakdown
        ?.totalVehicleCost ??
      0,
  );

  costPerVehicle =
    quantity > 0
      ? fallbackVehicleTotal / quantity
      : fallbackVehicleTotal;
}

const totalAmount =
  costPerVehicle * quantity;

totalPayable += totalAmount;

        summaryRows.push(`
          <tr>
    <td style="border:1px solid #000;padding:4px;text-align:center;">
  ${escapeHtml(formatDate(arrivalDate))}
</td>

<td style="border:1px solid #000;padding:4px;text-align:center;">
  ${escapeHtml(formatDate(departureDate))}
</td>

<td style="border:1px solid #000;padding:4px;">
  ${escapeHtml(arrivalLocation)}
</td>

<td style="border:1px solid #000;padding:4px;">
  ${escapeHtml(departureLocation)}
</td>

            <td style="border:1px solid #000;padding:4px;">
              ${escapeHtml(
                String(
                  vehicle.vehicleTypeName ||
                    "--",
                ),
              )}
            </td>

            <td style="border:1px solid #000;padding:4px;text-align:center;">
              ${quantity}
            </td>

            <td style="border:1px solid #000;padding:4px;text-align:right;white-space:nowrap;">
              ${escapeHtml(
                formatAmount(
                  costPerVehicle,
                ),
              )}
            </td>

            <td style="border:1px solid #000;padding:4px;text-align:right;white-space:nowrap;">
              ${escapeHtml(
                formatAmount(totalAmount),
              )}
            </td>
          </tr>
        `);
      },
    );
  });

const displayLeg =
  legs[legs.length - 1]?.details ??
  legs[0]?.details;

const crmId = String(
  displayLeg?.quoteId || "",
).trim();

const totalPax =
  Number(displayLeg?.adults || 0) +
  Number(displayLeg?.children || 0) +
  Number(displayLeg?.infants || 0);

/*
 * Vehicle rows above show the actual selected vehicle cost.
 *
 * For a single current Vehicle Only itinerary, the final
 * Total Payable must exactly match the live Overall Trip Cost
 * shown on the page. This includes the current agent profit
 * and round-off.
 *
 * For multi-leg clipboard, previous legs do not have the
 * current page's live profit state, so keep using each leg's
 * persisted final payable.
 */
const persistedOverallTripPayable = legs.reduce(
  (sum, leg) => {
    const netPayable = Number(
      leg.details?.costBreakdown?.netPayable || 0,
    );

    if (netPayable > 0) {
      return sum + netPayable;
    }

    const overallCost = Number(
      leg.details?.overallCost || 0,
    );

    return sum + overallCost;
  },
  0,
);

const liveCurrentOverallTripCost =
  Number(currentOverallTripCost || 0);

/*
 * For the current single Vehicle Only itinerary,
 * use the exact Overall Trip Cost already calculated
 * and displayed by the itinerary page.
 *
 * Do not rebuild it from vehicle cost/profit here,
 * because the page total can also contain margin and
 * round-off values.
 */
const finalTotalPayable =
  legs.length === 1 &&
  liveCurrentOverallTripCost > 0
    ? liveCurrentOverallTripCost
    : persistedOverallTripPayable > 0
      ? persistedOverallTripPayable
      : totalPayable;

return `
    <table
      width="700"
      border="0"
      cellpadding="0"
      cellspacing="0"
      style="
        width:700px;
        border-collapse:collapse;
        font-family:Arial,sans-serif;
        font-size:12px;
        color:#000066;
      "
    >
      <tr>
       <td
  colspan="4"
  style="
    border:1px solid #000;
    padding:5px;
  "
>
  CRM ID :: ${
    crmId
      ? escapeHtml(crmId)
      : ""
  }
</td>
   <td
  colspan="4"
  style="
    border:1px solid #000;
    padding:5px;
  "
>
  Total Pax :: ${
    totalPax > 0
      ? escapeHtml(String(totalPax))
      : ""
  }
</td>
      </tr>

      <tr>
        <td
          colspan="8"
          style="
            border:1px solid #000;
            padding:6px;
            text-align:center;
            font-weight:700;
          "
        >
          Trip Summary
        </td>
      </tr>

      <tr>
        <th style="border:1px solid #000;padding:4px;">
          Arrival Date
        </th>

        <th style="border:1px solid #000;padding:4px;">
          Departure Date
        </th>

        <th style="border:1px solid #000;padding:4px;">
          Arrival Location
        </th>

        <th style="border:1px solid #000;padding:4px;">
          Departure Location
        </th>

        <th style="border:1px solid #000;padding:4px;">
          Vehicle
        </th>

        <th style="border:1px solid #000;padding:4px;">
          No of Vehicles
        </th>

        <th style="border:1px solid #000;padding:4px;">
          Cost per Vehicle
        </th>

        <th style="border:1px solid #000;padding:4px;">
          Total Cost
        </th>
      </tr>

      ${summaryRows.join("")}

      <tr>
        <td
          colspan="6"
          style="
            border:1px solid #000;
            padding:4px;
            font-weight:700;
          "
        >
          Total Payable to Doview Holidays India Pvt ltd
        </td>

        <td
          style="
            border:1px solid #000;
            padding:4px;
            text-align:center;
          "
        >
        </td>

     <td
  style="
    border:1px solid #000;
    padding:4px;
    text-align:right;
    font-weight:700;
    white-space:nowrap;
  "
>
  ${escapeHtml(
    formatAmount(finalTotalPayable),
  )}
</td>
      </tr>
    </table>
  `;
};
const buildVehicleOnlyDetailedItineraryHtml = (
  legs: Array<{
    label: string;
    details: ItineraryDetailsResponse;
    html: string;
  }>,
): string => {
  const showLegHeading =
    legs.length > 1;

  const formatDayDate = (
    value: unknown,
  ): string => {
    const raw = String(
      value ?? "",
    ).trim();

    if (!raw) {
      return "";
    }

    const match = raw.match(
      /(\d{4})-(\d{2})-(\d{2})/,
    );

    if (!match) {
      return raw;
    }

    const [, year, month, day] =
      match;

    const date = new Date(
      Number(year),
      Number(month) - 1,
      Number(day),
    );

    return date.toLocaleDateString(
      "en-US",
      {
        weekday: "short",
        month: "short",
        day: "2-digit",
        year: "numeric",
      },
    );
  };

  const formatDayTime = (
    value: unknown,
  ): string => {
    const raw = String(
      value ?? "",
    ).trim();

    if (!raw) {
      return "";
    }

    const match = raw.match(
      /^(\d{1,2}):(\d{2})(?::\d{2})?$/,
    );

    if (!match) {
      return raw;
    }

    const hour =
      Number(match[1]);

    const minute =
      match[2];

    const displayHour =
      hour % 12 || 12;

    const suffix =
      hour >= 12
        ? "PM"
        : "AM";

    return `${String(
      displayHour,
    ).padStart(
      2,
      "0",
    )}:${minute} ${suffix}`;
  };

  const buildMissingDayHtml = (
    day: any,
    dayIndex: number,
  ): string => {
    const dayNumber =
      Number(
        day?.dayNumber ??
          day?.day ??
          dayIndex + 1,
      ) || dayIndex + 1;

    const dayDate =
      formatDayDate(
        day?.date ??
          day?.routeDate ??
          day?.startDate,
      );

    const startTime =
      formatDayTime(
        day?.startTime ??
          day?.routeStartTime ??
          day?.start_time,
      );

    const endTime =
      formatDayTime(
        day?.endTime ??
          day?.routeEndTime ??
          day?.end_time,
      );

    const departure =
      String(
        day?.departure ??
          day?.source ??
          "",
      ).trim();

    const arrival =
      String(
        day?.arrival ??
          day?.destination ??
          "",
      ).trim();

    const distance =
      Number(
        day?.distanceKm ??
          day?.distance ??
          day?.totalDistance ??
          0,
      );

    const routeText =
      departure && arrival
        ? `${departure} to ${arrival}`
        : departure || arrival;

    const timeText =
      startTime && endTime
        ? `${startTime} - ${endTime}`
        : startTime || endTime;

    const headingParts = [
      `Day ${dayNumber}`,
      dayDate,
      timeText
        ? `(${timeText})`
        : "",
      routeText,
      distance > 0
        ? `(${Math.trunc(
            distance,
          )}.00 KM)`
        : "",
    ].filter(Boolean);

    const segments =
      Array.isArray(day?.segments)
        ? day.segments
        : [];

    /*
     * Only build service rows here.
     *
     * Attraction/hotspot details are already supplied
     * by the existing backend clipboard HTML.
     */
    const serviceRows =
      segments
        .filter((segment: any) => {
          const segmentType =
            String(
              segment?.type ?? "",
            )
              .trim()
              .toLowerCase();

          return (
            segmentType !==
            "attraction"
          );
        })
        .map((segment: any) => {
          const title =
            String(
              segment?.name ??
                segment?.title ??
                segment?.label ??
                segment?.serviceName ??
                "",
            ).trim();

          const description =
            String(
              segment?.description ??
                segment?.details ??
                segment?.note ??
                "",
            ).trim();

          const segmentStartTime =
            formatDayTime(
              segment?.startTime ??
                segment?.start_time,
            );

          const segmentEndTime =
            formatDayTime(
              segment?.endTime ??
                segment?.end_time,
            );

          const segmentTime =
            segmentStartTime &&
            segmentEndTime
              ? `${segmentStartTime} - ${segmentEndTime}`
              : segmentStartTime ||
                segmentEndTime;

          if (
            !title &&
            !description
          ) {
            return "";
          }

          return `
            <tr>
              <td
                style="
                  border:1px solid #999999;
                  padding:5px;
                  color:#000066;
                  font-family:Arial,sans-serif;
                  font-size:12px;
                  line-height:1.5;
                "
              >
                ${
                  title
                    ? `<strong>${escapeHtml(
                        title,
                      )}</strong>`
                    : ""
                }

                ${
                  segmentTime
                    ? ` ${escapeHtml(
                        segmentTime,
                      )}`
                    : ""
                }

                ${
                  description
                    ? `${
                        title ||
                        segmentTime
                          ? "<br />"
                          : ""
                      }${escapeHtml(
                        description,
                      )}`
                    : ""
                }
              </td>
            </tr>
          `;
        })
        .filter(Boolean)
        .join("");

    if (!serviceRows) {
      return "";
    }

    return `
      <table
        width="700"
        border="0"
        cellpadding="0"
        cellspacing="0"
        data-dvi-service-only-day="${dayNumber}"
        style="
          width:700px;
          max-width:700px;
          border-collapse:collapse;
          border-spacing:0;
          font-family:Arial,sans-serif;
          font-size:12px;
          color:#000066;
          margin:0;
          float:none;
          clear:both;
        "
      >
        <tr>
          <td
            style="
              border:1px solid #999999;
              padding:5px;
              font-weight:700;
            "
          >
            ${escapeHtml(
              headingParts.join(
                " - ",
              ),
            )}
          </td>
        </tr>

        ${serviceRows}
      </table>
    `;
  };

  const restoreMissingServiceDays = (
    html: string,
    details: ItineraryDetailsResponse,
  ): string => {
    const days =
      Array.isArray(details?.days)
        ? details.days
        : [];

    if (!days.length) {
      return html;
    }

    const parser =
      new DOMParser();

    const doc =
      parser.parseFromString(
        `<div id="vehicle-only-days-root">${html}</div>`,
        "text/html",
      );

    const root =
      doc.querySelector(
        "#vehicle-only-days-root",
      ) as HTMLElement | null;

    if (!root) {
      return html;
    }

    const getElementDayNumber = (
      element: Element,
    ): number | null => {
      const text =
        String(
          element.textContent || "",
        )
          .replace(
            /\s+/g,
            " ",
          )
          .trim();

      const match =
        text.match(
          /^Day\s*(\d+)\b/i,
        );

      if (!match) {
        return null;
      }

      const dayNumber =
        Number(match[1]);

      return dayNumber > 0
        ? dayNumber
        : null;
    };

    const getDayTables = () =>
      Array.from(
        root.querySelectorAll(
          "table",
        ),
      )
        .map((table) => ({
          table,
          dayNumber:
            getElementDayNumber(
              table,
            ),
        }))
        .filter(
          (
            item,
          ): item is {
            table: HTMLTableElement;
            dayNumber: number;
          } =>
            item.dayNumber !==
            null,
        );

    const presentDays =
      new Set(
        getDayTables().map(
          (item) =>
            item.dayNumber,
        ),
      );

    days.forEach(
      (
        day: any,
        dayIndex: number,
      ) => {
        const dayNumber =
          Number(
            day?.dayNumber ??
              day?.day ??
              dayIndex + 1,
          ) || dayIndex + 1;

        /*
         * Day already exists in backend Hotspot Details.
         * Leave it completely untouched.
         */
        if (
          presentDays.has(
            dayNumber,
          )
        ) {
          return;
        }

        const missingDayHtml =
          buildMissingDayHtml(
            day,
            dayIndex,
          );

        /*
         * No hotspot and no service means there is
         * still nothing useful to add.
         */
        if (
          !missingDayHtml.trim()
        ) {
          return;
        }

        const wrapper =
          doc.createElement(
            "div",
          );

        wrapper.innerHTML =
          missingDayHtml;

        const newNodes =
          Array.from(
            wrapper.childNodes,
          );

        /*
         * Keep chronological order:
         *
         * Day 1
         * Day 2 <- insert here
         * Day 3
         */
        const nextDayTable =
          getDayTables()
            .filter(
              (item) =>
                item.dayNumber >
                dayNumber,
            )
            .sort(
              (a, b) =>
                a.dayNumber -
                b.dayNumber,
            )[0]?.table;

        if (
          nextDayTable &&
          nextDayTable.parentNode
        ) {
          newNodes.forEach(
            (node) => {
              nextDayTable.parentNode?.insertBefore(
                node.cloneNode(
                  true,
                ),
                nextDayTable,
              );
            },
          );
        } else {
          newNodes.forEach(
            (node) => {
              root.appendChild(
                node.cloneNode(
                  true,
                ),
              );
            },
          );
        }

        presentDays.add(
          dayNumber,
        );
      },
    );

    return root.innerHTML;
  };

  return legs
    .map((leg, index) => {
      const hotspotSection =
        extractHotspotDetailsSection(
          leg.html,
        );

      /*
       * Preserve the existing hotspot clipboard HTML
       * exactly as before.
       */
      const itineraryBody =
        hotspotSection
          ? removeHotspotHeadingFromSection(
              hotspotSection,
            )
          : "";

      const normalizedBody =
        itineraryBody
          ? normalizeClipboardVerticalLayout(
              itineraryBody,
            )
          : "";

      /*
       * Add only days which are missing because they
       * contain services/transfers but no hotspot.
       */
      const completeBody =
        restoreMissingServiceDays(
          normalizedBody,
          leg.details,
        );

      if (!completeBody.trim()) {
        return "";
      }

      const legHeadingHtml =
        showLegHeading
          ? `
              <table
                width="700"
                border="0"
                cellpadding="0"
                cellspacing="0"
                style="
                  width:700px;
                  border-collapse:collapse;
                  font-family:Arial,sans-serif;
                  font-size:12px;
                  color:#000066;
                "
              >
                <tr>
                  <td
                    style="
                      padding:6px 2px;
                      font-weight:700;
                    "
                  >
                    ${escapeHtml(
                      leg.label,
                    )}
                  </td>
                </tr>
              </table>
            `
          : "";

      return `
        ${legHeadingHtml}
        ${completeBody}
      `;
    })
    .filter(Boolean)
    .join("");
};
const buildVehicleOnlyCompleteClipboardHtml = ({
  legs,
  termsHtml,
  guideActivityHtml,
  specialInstructionsHtml,
  currentOverallTripCost,
}: {
  legs: Array<{
    label: string;
    details: ItineraryDetailsResponse;
    html: string;
  }>;
  termsHtml: string;
  guideActivityHtml?: string;
  specialInstructionsHtml?: string;
  currentOverallTripCost?: number;
}): string => {
  if (!legs.length) {
    return "";
  }

  const tripSummaryHtml =
    buildVehicleOnlyTripSummaryHtml(
      legs.map((leg) => ({
        label: leg.label,
        details: leg.details,
      })),
      currentOverallTripCost,
    );

const detailedItineraryHtml =
  buildVehicleOnlyDetailedItineraryHtml(
    legs.map((leg) => ({
      label: leg.label,
      details: leg.details,
      html: leg.html,
    })),
  );

const detailedItineraryHeadingHtml = `
  <table
    width="700"
    border="0"
    cellpadding="0"
    cellspacing="0"
    style="
      width:700px;
      border-collapse:collapse;
      font-family:Arial,sans-serif;
      font-size:12px;
      color:#000066;
    "
  >
    <tr>
      <td
        style="
          border:1px solid #000;
          padding:6px;
          text-align:center;
          font-weight:700;
        "
      >
        Detailed Itinerary
      </td>
    </tr>
  </table>
`;

return [
  tripSummaryHtml,
  guideActivityHtml,
  specialInstructionsHtml,
  detailedItineraryHeadingHtml,
  detailedItineraryHtml,
  termsHtml,
]
  .filter(Boolean)
  .join("");
};

const updateHotelVehicleTourItineraryPlanHeader = (
  html: string,
  itinerary: ItineraryDetailsResponse,
  selectedLegs?: Array<{
    label: string;
    details: ItineraryDetailsResponse;
    html?: string;
  }>,
): string => {
  if (!html) {
    return html;
  }

  /*
   * Apply ONLY to Hotel + Vehicle.
   *
   * 1 = Hotel Only
   * 2 = Vehicle Only
   * 3 = Hotel + Vehicle
   */
  if (
    Number(
      itinerary.itineraryPreference || 0,
    ) !== 3
  ) {
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
   * Find the REAL inner Tour Itinerary Plan table.
   *
   * The backend HTML can contain an outer wrapper table,
   * so do not simply take the first table containing
   * "Start Date & Time".
   *
   * We specifically need the table that has a DIRECT row:
   *
   * Entry Ticket Required
   * Nationality
   * Total Pax
   * Room Count
   */
  const itineraryPlanTable = Array.from(
    root.querySelectorAll("table"),
  ).find((table) => {
    const directRows = Array.from(
      table.querySelectorAll(":scope > tbody > tr, :scope > tr"),
    );

    return directRows.some((row) => {
      const directCells = Array.from(
        row.querySelectorAll(
          ":scope > td, :scope > th",
        ),
      );

      if (directCells.length !== 4) {
        return false;
      }

      const cellTexts = directCells.map(
        (cell) =>
          String(cell.textContent || "")
            .replace(/\s+/g, " ")
            .trim()
            .toLowerCase(),
      );

      return (
        cellTexts[0]?.includes(
          "entry ticket required",
        ) &&
        cellTexts[1]?.includes(
          "nationality",
        ) &&
        cellTexts[2]?.includes(
          "total pax",
        ) &&
        cellTexts[3]?.includes(
          "room count",
        )
      );
    });
  });

if (!itineraryPlanTable) {
  return html;
}

/*
 * Complete / Continue Planning:
 *
 * Tour Itinerary Plan must represent the WHOLE selected trip:
 *
 * Start Date & Time = Leg 1 arrival/start
 * End Date & Time   = Last Leg departure/end
 * Trip Night & Day  = calendar span from Leg 1 to Last Leg
 *
 * Normal single itinerary continues to use the current itinerary.
 */
const headerLegs =
  Array.isArray(selectedLegs) &&
  selectedLegs.length > 0
    ? selectedLegs
    : [
        {
          label: "Leg 1",
          details: itinerary,
          html,
        },
      ];

const firstHeaderLeg =
  headerLegs[0];

const lastHeaderLeg =
  headerLegs[
    headerLegs.length - 1
  ];

/*
 * Read the exact Start Date & Time / End Date & Time
 * already present in each leg's backend Tour Itinerary Plan.
 *
 * For Complete Itinerary:
 *
 * Start Date & Time = first selected leg
 * End Date & Time   = last selected leg
 *
 * This keeps the exact backend time instead of trying
 * to rebuild it from itinerary.days.
 */
const extractLegTourPlanValues = (
  legHtml: string | undefined,
): {
  startDateTime: string;
  endDateTime: string;
} => {
  if (!legHtml) {
    return {
      startDateTime: "",
      endDateTime: "",
    };
  }

  const parser = new DOMParser();

  const legDoc = parser.parseFromString(
    `<div id="leg-tour-plan-root">${legHtml}</div>`,
    "text/html",
  );

  const legRoot = legDoc.querySelector(
    "#leg-tour-plan-root",
  );

  if (!legRoot) {
    return {
      startDateTime: "",
      endDateTime: "",
    };
  }

  const itineraryPlanTable = Array.from(
    legRoot.querySelectorAll("table"),
  ).find((table) => {
    const directRows = Array.from(
      table.querySelectorAll(
        ":scope > tbody > tr, :scope > tr",
      ),
    );

    return directRows.some((row) => {
      const directCells = Array.from(
        row.querySelectorAll(
          ":scope > td, :scope > th",
        ),
      );

      if (directCells.length !== 4) {
        return false;
      }

      const texts = directCells.map(
        (cell) =>
          String(cell.textContent || "")
            .replace(/\s+/g, " ")
            .trim()
            .toLowerCase(),
      );

      return (
        texts[0]?.includes(
          "start date & time",
        ) &&
        texts[1]?.includes(
          "end date & time",
        ) &&
        texts[2]?.includes(
          "quote id",
        ) &&
        texts[3]?.includes(
          "trip night & day",
        )
      );
    });
  });

  if (!itineraryPlanTable) {
    return {
      startDateTime: "",
      endDateTime: "",
    };
  }

  const tripInfoRow = Array.from(
    itineraryPlanTable.querySelectorAll(
      ":scope > tbody > tr, :scope > tr",
    ),
  ).find((row) => {
    const cells = Array.from(
      row.querySelectorAll(
        ":scope > td, :scope > th",
      ),
    );

    if (cells.length !== 4) {
      return false;
    }

    const texts = cells.map(
      (cell) =>
        String(cell.textContent || "")
          .replace(/\s+/g, " ")
          .trim()
          .toLowerCase(),
    );

    return (
      texts[0]?.includes(
        "start date & time",
      ) &&
      texts[1]?.includes(
        "end date & time",
      ) &&
      texts[2]?.includes(
        "quote id",
      ) &&
      texts[3]?.includes(
        "trip night & day",
      )
    );
  });

  if (!tripInfoRow) {
    return {
      startDateTime: "",
      endDateTime: "",
    };
  }

  const cells = Array.from(
    tripInfoRow.querySelectorAll(
      ":scope > td, :scope > th",
    ),
  );

  const extractCellValue = (
    cell: Element | undefined,
    labelMatcher: RegExp,
  ): string => {
    if (!cell) {
      return "";
    }

    const text = String(
      cell.textContent || "",
    )
      .replace(/\s+/g, " ")
      .trim();

    return text
      .replace(labelMatcher, "")
      .trim();
  };

  return {
    startDateTime:
      extractCellValue(
        cells[0],
        /^Start Date\s*&\s*Time\s*/i,
      ),

    endDateTime:
      extractCellValue(
        cells[1],
        /^End Date\s*&\s*Time\s*/i,
      ),
  };
};

const firstLegTourPlan =
  extractLegTourPlanValues(
    firstHeaderLeg?.html,
  );

const lastLegTourPlan =
  extractLegTourPlanValues(
    lastHeaderLeg?.html,
  );

const firstHeaderDetails =
  firstHeaderLeg?.details ??
  itinerary;

const lastHeaderDetails =
  lastHeaderLeg?.details ??
  itinerary;

const firstHeaderDays =
  Array.isArray(firstHeaderDetails?.days)
    ? firstHeaderDetails.days
    : [];

const lastHeaderDays =
  Array.isArray(lastHeaderDetails?.days)
    ? lastHeaderDetails.days
    : [];

const firstTripDay: any =
  firstHeaderDays[0] || {};

const lastTripDay: any =
  lastHeaderDays[
    lastHeaderDays.length - 1
  ] || {};

/*
 * Normalize only the calendar date.
 *
 * This is used for the overall Nights / Days calculation.
 */
const normalizeHeaderDate = (
  value: unknown,
): string => {
  const raw = String(
    value ?? "",
  ).trim();

  if (!raw) {
    return "";
  }

  const isoMatch = raw.match(
    /(\d{4})-(\d{2})-(\d{2})/,
  );

  if (isoMatch) {
    return `${isoMatch[1]}-${isoMatch[2]}-${isoMatch[3]}`;
  }

  const dmyMatch = raw.match(
    /(\d{1,2})[/-](\d{1,2})[/-](\d{4})/,
  );

  if (dmyMatch) {
    return `${dmyMatch[3]}-${dmyMatch[2].padStart(
      2,
      "0",
    )}-${dmyMatch[1].padStart(
      2,
      "0",
    )}`;
  }

  return "";
};

const formatHeaderDateValue = (
  value: unknown,
): string => {
  const normalized =
    normalizeHeaderDate(value);

  if (!normalized) {
    return "";
  }

  const [
    year,
    month,
    day,
  ] = normalized.split("-");

  return `${day}-${month}-${year}`;
};

const firstFallbackDateRaw =
  firstTripDay?.date ??
  firstTripDay?.routeDate ??
  firstTripDay?.startDate ??
  firstTripDay?.itineraryDate ??
  "";

const lastFallbackDateRaw =
  lastTripDay?.date ??
  lastTripDay?.routeDate ??
  lastTripDay?.startDate ??
  lastTripDay?.itineraryDate ??
  "";

/*
 * Primary source:
 * exact backend Tour Itinerary Plan values.
 *
 * Fallback:
 * itinerary day date only.
 */
const overallStartDisplay =
  firstLegTourPlan.startDateTime ||
  formatHeaderDateValue(
    firstFallbackDateRaw,
  );

const overallEndDisplay =
  lastLegTourPlan.endDateTime ||
  formatHeaderDateValue(
    lastFallbackDateRaw,
  );

/*
 * For calculating total Nights / Days,
 * extract the calendar date from the exact
 * first/last displayed value.
 */
const overallStartDate =
  normalizeHeaderDate(
    firstLegTourPlan.startDateTime,
  ) ||
  normalizeHeaderDate(
    firstFallbackDateRaw,
  );

const overallEndDate =
  normalizeHeaderDate(
    lastLegTourPlan.endDateTime,
  ) ||
  normalizeHeaderDate(
    lastFallbackDateRaw,
  );

/*
 * Total Trip Night & Day must be the SUM
 * of every selected leg.
 *
 * Do NOT calculate from the first leg start date
 * directly to the last leg end date because there
 * can be gaps between Continue Planning legs.
 *
 * Example:
 *
 * Leg 1 = 2 Nights, 3 Days
 * Leg 2 = 1 Night, 2 Days
 *
 * Total = 3 Nights, 5 Days
 */
let overallTripDays = 0;
let overallTripNights = 0;

headerLegs.forEach((leg) => {
  const legDetails =
    leg?.details;

  if (!legDetails) {
    return;
  }

  const legDays =
    Array.isArray(legDetails.days)
      ? legDetails.days
      : [];

  const firstLegDay: any =
    legDays[0] || {};

  const lastLegDay: any =
    legDays[
      legDays.length - 1
    ] || firstLegDay;

  const legStartDateRaw =
    firstLegDay?.date ??
    firstLegDay?.routeDate ??
    firstLegDay?.startDate ??
    firstLegDay?.itineraryDate ??
    "";

  const legEndDateRaw =
    lastLegDay?.date ??
    lastLegDay?.routeDate ??
    lastLegDay?.startDate ??
    lastLegDay?.itineraryDate ??
    "";

  const legStartDate =
    normalizeHeaderDate(
      legStartDateRaw,
    );

  const legEndDate =
    normalizeHeaderDate(
      legEndDateRaw,
    );

  if (
    !legStartDate ||
    !legEndDate
  ) {
    return;
  }

  const [
    startYear,
    startMonth,
    startDay,
  ] = legStartDate
    .split("-")
    .map(Number);

  const [
    endYear,
    endMonth,
    endDay,
  ] = legEndDate
    .split("-")
    .map(Number);

  const startUtc = Date.UTC(
    startYear,
    startMonth - 1,
    startDay,
  );

  const endUtc = Date.UTC(
    endYear,
    endMonth - 1,
    endDay,
  );

  const legNights = Math.max(
    0,
    Math.round(
      (endUtc - startUtc) /
        (24 * 60 * 60 * 1000),
    ),
  );

  const legDayCount =
    legNights + 1;

  overallTripNights +=
    legNights;

  overallTripDays +=
    legDayCount;
});

/*
 * Find the FIRST direct row:
 *
 * Start Date & Time
 * End Date & Time
 * Quote Id
 * Trip Night & Day
 */
const tripInfoRow = Array.from(
  itineraryPlanTable.querySelectorAll(
    ":scope > tbody > tr, :scope > tr",
  ),
).find((row) => {
  const directCells = Array.from(
    row.querySelectorAll(
      ":scope > td, :scope > th",
    ),
  );

  if (directCells.length !== 4) {
    return false;
  }

  const texts = directCells.map(
    (cell) =>
      String(cell.textContent || "")
        .replace(/\s+/g, " ")
        .trim()
        .toLowerCase(),
  );

  return (
    texts[0]?.includes(
      "start date & time",
    ) &&
    texts[1]?.includes(
      "end date & time",
    ) &&
    texts[2]?.includes("quote id") &&
    texts[3]?.includes(
      "trip night & day",
    )
  );
}) as HTMLTableRowElement | undefined;

if (tripInfoRow) {
  const tripInfoCells = Array.from(
    tripInfoRow.querySelectorAll(
      ":scope > td, :scope > th",
    ),
  ) as HTMLElement[];

  const buildHeaderCellHtml = (
    label: string,
    value: string,
  ) => `
    <div
      style="
        color:#999999;
        font-size:11px;
        line-height:14px;
        text-align:center;
        font-weight:400;
      "
    >
      ${escapeHtml(label)}
    </div>

    <div
      style="
        color:#000066;
        font-size:12px;
        line-height:14px;
        text-align:center;
        font-weight:700;
      "
    >
      ${escapeHtml(value || "--")}
    </div>
  `;

  if (tripInfoCells.length === 4) {
    /*
     * Leg 1 arrival/start.
     */
    tripInfoCells[0].innerHTML =
      buildHeaderCellHtml(
        "Start Date & Time",
        overallStartDisplay,
      );

    /*
     * Last Leg departure/end.
     */
    tripInfoCells[1].innerHTML =
      buildHeaderCellHtml(
        "End Date & Time",
        overallEndDisplay,
      );

    /*
     * Keep existing Quote Id exactly as backend
     * currently supplies it.
     *
     * Do NOT change tripInfoCells[2].
     */

    /*
     * Whole selected travel period.
     */
    if (
      overallTripDays > 0 &&
      overallTripNights >= 0
    ) {
      tripInfoCells[3].innerHTML =
        buildHeaderCellHtml(
          "Trip Night & Day",
          `${overallTripNights} ${
            overallTripNights === 1
              ? "Night"
              : "Nights"
          }, ${overallTripDays} ${
            overallTripDays === 1
              ? "Day"
              : "Days"
          }`,
        );
    }
  }
}

const totalPax =
  Number(itinerary.adults || 0) +
  Number(itinerary.children || 0) +
  Number(itinerary.infants || 0);

  const extraBed = Math.max(
    0,
    Number(itinerary.extraBed || 0),
  );

  const childWithBed = Math.max(
    0,
    Number(itinerary.childWithBed || 0),
  );

  const childWithoutBed = Math.max(
    0,
    Number(itinerary.childWithoutBed || 0),
  );

  const infantCount = Math.max(
    0,
    Number(itinerary.infants || 0),
  );

  /*
   * Find the real second row:
   *
   * Entry Ticket | Nationality | Total Pax | Room Count
   */
  const summaryRow = Array.from(
    itineraryPlanTable.querySelectorAll(
      ":scope > tbody > tr, :scope > tr",
    ),
  ).find((row) => {
    const directCells = Array.from(
      row.querySelectorAll(
        ":scope > td, :scope > th",
      ),
    );

    if (directCells.length !== 4) {
      return false;
    }

    const cellTexts = directCells.map(
      (cell) =>
        String(cell.textContent || "")
          .replace(/\s+/g, " ")
          .trim()
          .toLowerCase(),
    );

    return (
      cellTexts[0]?.includes(
        "entry ticket required",
      ) &&
      cellTexts[1]?.includes(
        "nationality",
      ) &&
      cellTexts[2]?.includes(
        "total pax",
      ) &&
      cellTexts[3]?.includes(
        "room count",
      )
    );
  }) as HTMLTableRowElement | undefined;

  if (!summaryRow) {
    return root.innerHTML;
  }

  const summaryCells = Array.from(
    summaryRow.querySelectorAll(
      ":scope > td, :scope > th",
    ),
  ) as HTMLElement[];

  /*
   * Total Pax = one total number.
   *
   * Example:
   * 2 Adult + 1 Child + 1 Infant = 4
   */
  if (summaryCells.length === 4) {
    summaryCells[2].innerHTML = `
      <div
        style="
          color:#999999;
          font-size:11px;
          line-height:14px;
          text-align:center;
          font-weight:400;
        "
      >
        Total Pax
      </div>

      <div
        style="
          color:#000066;
          font-size:12px;
          line-height:14px;
          text-align:center;
          font-weight:700;
        "
      >
        ${totalPax}
      </div>
    `;
  }

  /*
   * Remove any old/broken row previously added by
   * this frontend formatter.
   */
  itineraryPlanTable
    .querySelectorAll(
      '[data-dvi-guest-bed-row="1"]',
    )
    .forEach((row) => row.remove());

  /*
   * Also remove broken Extra Bed rows created by the
   * previous implementation.
   *
   * Only remove DIRECT rows immediately belonging
   * to the Tour Itinerary Plan table.
   */
  Array.from(
    itineraryPlanTable.querySelectorAll(
      ":scope > tbody > tr, :scope > tr",
    ),
  ).forEach((row) => {
    if (row === summaryRow) {
      return;
    }

    const directCells = Array.from(
      row.querySelectorAll(
        ":scope > td, :scope > th",
      ),
    );

    const rowText = String(
      row.textContent || "",
    )
      .replace(/\s+/g, " ")
      .trim()
      .toLowerCase();

    if (
      directCells.length === 1 &&
      rowText.startsWith("extra bed")
    ) {
      row.remove();
    }
  });

  /*
   * Clone the EXISTING 4-column summary row.
   *
   * This preserves exactly the same:
   * - widths
   * - borders
   * - table geometry
   *
   * as the senior reference.
   */
  const guestBedRow =
    summaryRow.cloneNode(
      true,
    ) as HTMLTableRowElement;

  guestBedRow.setAttribute(
    "data-dvi-guest-bed-row",
    "1",
  );

  const guestBedCells = Array.from(
    guestBedRow.querySelectorAll(
      ":scope > td, :scope > th",
    ),
  ) as HTMLElement[];

  if (guestBedCells.length !== 4) {
    return root.innerHTML;
  }

  guestBedCells[0].innerHTML = `
    Extra Bed ::${String(extraBed).padStart(
      2,
      "0",
    )}
  `;

  guestBedCells[1].innerHTML = `
    Children With<br/>
    Bed::${String(childWithBed).padStart(
      2,
      "0",
    )}
  `;

  guestBedCells[2].innerHTML = `
    Children With out Bed :: ${childWithoutBed}
  `;

  guestBedCells[3].innerHTML = `
    Infant :: ${String(
      infantCount,
    ).padStart(2, "0")}
  `;

  /*
   * Keep exactly 4 equal columns.
   */
  guestBedCells.forEach((cell) => {
    cell.removeAttribute("colspan");
    cell.setAttribute("width", "25%");

    cell.style.width = "25%";
    cell.style.textAlign = "center";
    cell.style.verticalAlign = "middle";
    cell.style.padding = "5px 4px";
    cell.style.height = "auto";
    cell.style.color = "#000066";
    cell.style.fontWeight = "400";
    cell.style.boxSizing = "border-box";
  });

  /*
   * Insert exactly here:
   *
   * Entry Ticket | Nationality | Total Pax | Room Count
   * ---------------------------------------------------
   * Extra Bed    | Child Bed   | Child No Bed | Infant
   * ---------------------------------------------------
   * Transportation Details
   */
  summaryRow.insertAdjacentElement(
    "afterend",
    guestBedRow,
  );

  return root.innerHTML;
};
const extractTourItineraryPlanSection = (
  html: string,
): string => {
  if (!html) {
    return "";
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
    return "";
  }

  const itineraryPlanTable = Array.from(
    root.querySelectorAll("table"),
  ).find((table) => {
    const directRows = Array.from(
      table.querySelectorAll(
        ":scope > tbody > tr, :scope > tr",
      ),
    );

    return directRows.some((row) => {
      const directCells = Array.from(
        row.querySelectorAll(
          ":scope > td, :scope > th",
        ),
      );

      if (directCells.length !== 4) {
        return false;
      }

      const cellTexts = directCells.map(
        (cell) =>
          String(cell.textContent || "")
            .replace(/\s+/g, " ")
            .trim()
            .toLowerCase(),
      );

      return (
        cellTexts[0]?.includes(
          "entry ticket required",
        ) &&
        cellTexts[1]?.includes(
          "nationality",
        ) &&
        cellTexts[2]?.includes(
          "total pax",
        ) &&
        cellTexts[3]?.includes(
          "room count",
        )
      );
    });
  });

  if (!itineraryPlanTable) {
    return "";
  }

  const headingHtml = `
    <div
      style="
        width:700px;
        margin:0 auto 2px auto;
        text-align:center;
        font-weight:700;
        font-size:16px;
        line-height:1.2;
        color:#1f2a74;
      "
    >
      Tour Itinerary Plan
    </div>
  `;

  return [
    headingHtml,
    itineraryPlanTable.outerHTML,
  ]
    .filter(Boolean)
    .join("");
};

/*
 * Single Hotel + Vehicle:
 *
 * Guide Services / Activities must appear immediately
 * after Tour Itinerary Plan and before Transportation Details.
 *
 * This keeps the same visual order as Complete / multi-leg.
 */
const insertAfterTourItineraryPlan = (
  html: string,
  insertHtml: string,
): string => {
  if (!html || !insertHtml) {
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
   * Find the real Tour Itinerary Plan table using the
   * same structure already used elsewhere in this file.
   */
  const itineraryPlanTable = Array.from(
    root.querySelectorAll("table"),
  ).find((table) => {
    const directRows = Array.from(
      table.querySelectorAll(
        ":scope > tbody > tr, :scope > tr",
      ),
    );

    return directRows.some((row) => {
      const directCells = Array.from(
        row.querySelectorAll(
          ":scope > td, :scope > th",
        ),
      );

      if (directCells.length !== 4) {
        return false;
      }

      const cellTexts = directCells.map(
        (cell) =>
          String(cell.textContent || "")
            .replace(/\s+/g, " ")
            .trim()
            .toLowerCase(),
      );

      return (
        cellTexts[0]?.includes(
          "entry ticket required",
        ) &&
        cellTexts[1]?.includes(
          "nationality",
        ) &&
        cellTexts[2]?.includes(
          "total pax",
        ) &&
        cellTexts[3]?.includes(
          "room count",
        )
      );
    });
  });

  if (!itineraryPlanTable) {
    return html;
  }

  const insertionWrapper =
    doc.createElement("div");

  insertionWrapper.innerHTML =
    insertHtml;

  const nodes = Array.from(
    insertionWrapper.childNodes,
  );

  let referenceNode: Node =
    itineraryPlanTable;

  nodes.forEach((node) => {
    const clonedNode =
      node.cloneNode(true);

    referenceNode.parentNode?.insertBefore(
      clonedNode,
      referenceNode.nextSibling,
    );

    referenceNode =
      clonedNode;
  });

  return root.innerHTML;
};

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
currentOverallTripCost?: number;
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
  currentOverallTripCost,
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

const currentLegServices =
  getClipboardLegServiceFlags(itinerary);

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

/*
 * Keep the original validation for the normal
 * single-itinerary flow.
 *
 * In multi-leg mode a selected leg may legitimately
 * be Transportation Only and therefore have no
 * hotel option at all.
 */
if (
  !hasLegSelectionWorkflow &&
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
  clipboardIncludeSections.hotels &&
  currentLegServices.showHotels
    ? currentLegSelectedHotelOptions.length > 0
      ? currentLegSelectedHotelOptions
      : getAllClipboardGroupTypes(hotelDetails)
    : [];
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

/*
 * Complete Itinerary uses one simple sequential label
 * for every selected leg:
 *
 * Leg 1
 * Leg 2
 * Leg 3
 * ...
 *
 * The current itinerary is always the final selected leg.
 */
const getClipboardLegLabel = (index: number) =>
  `Leg ${index + 1}`;

const currentClipboardLegLabel =
  getClipboardLegLabel(selectedPreviousLegs.length);

const previousLegHotelGroups: ClipboardLegHotelGroup[] =
  await Promise.all(
    selectedPreviousLegs.map(async (previousLeg, index) => {
      const previousLegKey =
  `previous-${previousLeg.actualQuoteId}`;

const previousLegServices =
  getClipboardLegServiceFlags(
    previousLeg.details,
  );

/*
 * Transportation-only previous leg:
 * keep the leg in the multi-leg clipboard,
 * but it has no Recommended Hotel groups.
 */
if (
  !clipboardIncludeSections.hotels ||
  !previousLegServices.showHotels
) {
  return {
    label: getClipboardLegLabel(index),
    itinerary: previousLeg.details,
    groups: [],
    groupDetails: {},
  };
}
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
  label: getClipboardLegLabel(index),
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
  includeCurrentLeg &&
  clipboardIncludeSections.hotels &&
  currentLegServices.showHotels
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
          label: currentClipboardLegLabel,
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
  hasLegSelectionWorkflow;

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

        const previousLegServices =
  getClipboardLegServiceFlags(
    previousLeg.details,
  );

const legGroupTypes =
  clipboardIncludeSections.hotels &&
  previousLegServices.showHotels
    ? selectedGroupTypes.length > 0
      ? selectedGroupTypes
      : groupTypes
    : [];
const response =
  await ItineraryService.getClipboardContent(
    previousLeg.actualQuoteId,
    clipboardType,
    legGroupTypes,
  );

         return {
  label: getClipboardLegLabel(index),
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
    label: currentClipboardLegLabel,
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
 * Hotel + Vehicle only:
 *
 * - Total Pax becomes one total number
 * - Add Extra Bed
 * - Add Children With Bed
 * - Add Children Without Bed
 * - Add Infant
 *
 * Vehicle Only remains untouched.
 */
if (!hasMultiLegClipboard) {
  mergedHtml =
    updateHotelVehicleTourItineraryPlanHeader(
      mergedHtml,
      itinerary,
    );
}

/*
 * Include every previous Continue Planning leg.
 *
 * Same groupTypes are used so:
 */

/*
 * loadPreviousLegClipboardItems() already returns
 * oldest -> newest.
 *
 * Current itinerary is added last.
 */
const selectedLegsForSummary = [
  ...selectedPreviousLegs.map(
    (previousLeg, index) => {
      const legLabel =
        getClipboardLegLabel(index);

      const backendLeg =
        selectedLegBackendClipboardHtml.find(
          (item) =>
            item.label === legLabel,
        );

      return {
        label: legLabel,
        details: previousLeg.details,
        html:
          backendLeg?.html || "",
      };
    },
  ),

  ...(includeCurrentLeg && itinerary
    ? [
        {
          label: `Leg ${
            selectedPreviousLegs.length + 1
          }`,
          details: itinerary,
          html,
        },
      ]
    : []),
];
const isVehicleOnlyCompleteClipboard =
  hasLegSelectionWorkflow
    ? selectedLegsForSummary.length > 0 &&
      selectedLegsForSummary.every((leg) =>
        isVehicleOnlyClipboardLeg(
          leg.details,
        ),
      )
    : isVehicleOnlyClipboardLeg(
        itinerary,
      );

const vehicleOnlyClipboardLegs = [
  ...selectedPreviousLegs.map(
    (previousLeg, index) => {
      const legLabel =
        getClipboardLegLabel(index);

      const backendLeg =
        selectedLegBackendClipboardHtml.find(
          (item) =>
            item.html &&
            item.label === legLabel,
        );

      return {
        label: legLabel,
        details: previousLeg.details,
        html: backendLeg?.html || "",
      };
    },
  ),

  ...(includeCurrentLeg && itinerary
    ? [
        {
          label: `Leg ${
            selectedPreviousLegs.length + 1
          }`,
          details: itinerary,
          html,
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
    const isHotelVehicleClipboard =
  Number(
    itinerary.itineraryPreference || 0,
  ) === 3;

const vehicleOnlyTermsHtml =
  buildVehicleOnlyTermsHtml();

const hotelVehicleHeaderSourceHtml =
  html ||
  selectedLegBackendClipboardHtml.find(
    (leg) => Boolean(leg.html),
  )?.html ||
  "";

const hotelVehicleTourPlanHeader =
  isHotelVehicleClipboard
    ? updateHotelVehicleTourItineraryPlanHeader(
        extractTourItineraryPlanSection(
          hotelVehicleHeaderSourceHtml,
        ),
        itinerary,
        selectedLegsForSummary,
      )
    : "";

/*
 * Hotel + Vehicle Complete Itinerary:
 *
 * Guide assignments are NOT part of the normal itinerary
 * details response. DVI loads them through the existing
 * /itineraries/:planId/guides API.
 *
 * Load guide assignments separately for every selected leg.
 */
const selectedLegsWithGuideAssignments =
  (
    isHotelVehicleClipboard ||
    isVehicleOnlyCompleteClipboard
  )
    ? await Promise.all(
        selectedLegsForSummary.map(
          async (leg) => {
            const planId = Number(
              leg.details?.planId || 0,
            );

            let guideAssignments: any[] = [];

            if (planId > 0) {
              try {
                const response =
                  await ItineraryService.getGuideAssignments(
                    planId,
                  );

                guideAssignments =
                  Array.isArray(response)
                    ? response
                    : [];
              } catch (error) {
                console.warn(
                  `Failed to load guide assignments for ${leg.label}`,
                  error,
                );
              }
            }

            return {
              label: leg.label,
              details: leg.details,
              guideAssignments,
            };
          },
        ),
      )
    : [];

/*
 * Required position:
 *
 * Hotel + Vehicle:
 * Tour Itinerary Plan
 * Guide Services
 * Activities
 * Transportation Details
 *
 * Transportation Only:
 * Trip Summary
 * Guide Services
 * Activities
 * Detailed Itinerary
 */
const clipboardGuideActivityHtml =
  (
    isHotelVehicleClipboard ||
    isVehicleOnlyCompleteClipboard
  )
    ? buildGuideServicesAndActivitiesHtml(
        selectedLegsWithGuideAssignments,
        clipboardIncludeSections.activities,
      )
    : "";

const clipboardSpecialInstructionsHtml =
  (
    isHotelVehicleClipboard ||
    isVehicleOnlyCompleteClipboard
  )
    ? buildSpecialInstructionsHtml(
        selectedLegsForSummary.map((leg) => ({
          label: leg.label,
          details: leg.details,
        })),
      )
    : "";

const vehicleOnlyCompleteHtml =
  isVehicleOnlyCompleteClipboard
    ? buildVehicleOnlyCompleteClipboardHtml({
        legs: vehicleOnlyClipboardLegs,
        termsHtml:
          vehicleOnlyTermsHtml,
        guideActivityHtml:
          clipboardGuideActivityHtml,
        specialInstructionsHtml:
          clipboardSpecialInstructionsHtml,
        currentOverallTripCost,
      })
    : "";

const rawCompleteClipboardHtml =
  isVehicleOnlyCompleteClipboard
    ? vehicleOnlyCompleteHtml

: hasMultiLegClipboard &&
    isHotelVehicleClipboard
  ? [
      hotelVehicleTourPlanHeader,
      clipboardGuideActivityHtml,
      clipboardSpecialInstructionsHtml,
      mergedHtml,
    ]
      .filter(Boolean)
      .join("")

      : hasMultiLegClipboard
        ? removeTourItineraryPlanSection(
            [
              previousLegSummaryHtml,
              mergedHtml,
            ]
              .filter(Boolean)
              .join(""),
          )

      : isHotelVehicleClipboard
  ? normalizeSingleHotelVehicleClipboardHtml(
      insertAfterTourItineraryPlan(
        mergedHtml,
        [
          clipboardGuideActivityHtml,
          clipboardSpecialInstructionsHtml,
        ]
          .filter(Boolean)
          .join(""),
      ),
    )

  : mergedHtml;

const completeClipboardHtml =
  isVehicleOnlyCompleteClipboard ||
  hasMultiLegClipboard ||
  isHotelVehicleClipboard
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
  currentOverallTripCost,
  setClipboardModal,
  setSelectedHotels,
]);
};