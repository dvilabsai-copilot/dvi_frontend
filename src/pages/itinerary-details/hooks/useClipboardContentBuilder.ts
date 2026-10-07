import { useCallback } from "react";
import type {
  ItineraryDetailsResponse,
  ItineraryHotelDetailsResponse,
  ItineraryHotelRow,
  ItineraryVehicleRow,
  VehicleSelection,
} from "../itinerary-details.types";

import {
  escapeHtml,
  getHotelSelectionAmount,
} from "../utils/clipboardFormatting.utils";
import {
  getVehicleAmountNumber,
} from "../utils/domain.utils";

import {
  formatClipboardMoneyWithSymbol,
} from "../utils/clipboardItineraryTotals.utils";
import { buildClipboardHotelPackageSectionHtml } from "../utils/clipboardHotelPackageSection.utils";
import { buildClipboardPlainText } from "../utils/clipboardPlainText.utils";
import {
  buildSelectedClipboardGroups,
  type ClipboardSelectionGroup,
} from "../utils/clipboardSelection.utils";
import { buildClipboardVehicleSectionHtml } from "../utils/clipboardVehicleSection.utils";

const normalizeClipboardDate = (value: unknown): string => {
  const raw = String(value ?? "").trim();

  if (!raw) {
    return "";
  }

  // Already in YYYY-MM-DD format.
  // Also handles ISO values such as 2026-10-12T00:00:00.000Z.
  const isoMatch = raw.match(/(\d{4})-(\d{2})-(\d{2})/);

  if (isoMatch) {
    return `${isoMatch[1]}-${isoMatch[2]}-${isoMatch[3]}`;
  }

  // Current hotel rows can use DD/MM/YYYY.
  // Convert them to the same YYYY-MM-DD format used by itinerary days.
  const slashMatch = raw.match(
    /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/,
  );

  if (slashMatch) {
    const [, day, month, year] = slashMatch;

    return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
  }

  return "";
};

const getClipboardLegDateRange = (
  itinerary: ItineraryDetailsResponse,
): {
  startDate: string;
  endDate: string;
} => {
  const itineraryRecord = itinerary as unknown as Record<string, any>;

  const dayDates = Array.isArray(itinerary.days)
    ? itinerary.days
        .map((day: any) =>
          normalizeClipboardDate(
            day?.date ??
              day?.startDate ??
              day?.routeDate ??
              day?.travelDate,
          ),
        )
        .filter(Boolean)
        .sort()
    : [];

  const startDate =
    normalizeClipboardDate(
      itineraryRecord.startDate ??
        itineraryRecord.start_date ??
        itineraryRecord.arrivalDate,
    ) ||
    dayDates[0] ||
    "";

  const explicitEndDate = normalizeClipboardDate(
    itineraryRecord.endDate ??
      itineraryRecord.end_date ??
      itineraryRecord.departureDate,
  );

  /*
   * Prefer the itinerary's explicit departure/end date.
   *
   * If it is unavailable, use the final route/day date as
   * an inclusive fallback.
   */
  const endDate =
    explicitEndDate ||
    dayDates[dayDates.length - 1] ||
    "";

  return {
    startDate,
    endDate,
  };
};

const getSelectedVehiclesForClipboard = (
  vehicles: ItineraryVehicleRow[] = [],
  vehicleSelections: VehicleSelection[] = [],
): ItineraryVehicleRow[] => {
  const rows = new Map<string, ItineraryVehicleRow>();

  const addVehicle = (
    vehicle: ItineraryVehicleRow,
    vehicleTypeId: number,
    fallbackKey: string,
  ) => {
    const vendorEligibleId = Number(
      vehicle.vendorEligibleId || 0,
    );

    const key =
      vendorEligibleId > 0
        ? `${vehicleTypeId}:${vendorEligibleId}`
        : `${vehicleTypeId}:${fallbackKey}`;

    rows.set(key, vehicle);
  };

  vehicleSelections.forEach((selection) => {
    const vehicleTypeId = Number(
      selection.vehicleTypeId || 0,
    );

    if (!vehicleTypeId) {
      return;
    }

    const sameTypeVehicles = vehicles.filter(
      (vehicle) =>
        Number(vehicle.vehicleTypeId || 0) ===
        vehicleTypeId,
    );

    const selectedVendorEligibleId = Number(
      selection.selectedVendorEligibleId || 0,
    );

    const assignedVendorEligibleIds = (
      selection.assignedVendorEligibleIds || []
    )
      .map((id) => Number(id))
      .filter((id) => id > 0);

    const selectedIds = Array.from(
      new Set([
        ...assignedVendorEligibleIds,
        ...(selectedVendorEligibleId > 0
          ? [selectedVendorEligibleId]
          : []),
      ]),
    );

    let matchedSelectedVehicle = false;

    selectedIds.forEach((vendorEligibleId) => {
      const selectedVehicle = sameTypeVehicles.find(
        (vehicle) =>
          Number(vehicle.vendorEligibleId || 0) ===
          vendorEligibleId,
      );

      if (selectedVehicle) {
        addVehicle(
          selectedVehicle,
          vehicleTypeId,
          String(vendorEligibleId),
        );

        matchedSelectedVehicle = true;
      }
    });

    if (matchedSelectedVehicle) {
      return;
    }

    const assignedVehicles = sameTypeVehicles.filter(
      (vehicle) => vehicle.isAssigned === true,
    );

    if (assignedVehicles.length > 0) {
      assignedVehicles.forEach((vehicle, index) => {
        addVehicle(
          vehicle,
          vehicleTypeId,
          `assigned-${index}`,
        );
      });

      return;
    }

    if (sameTypeVehicles.length === 1) {
      addVehicle(
        sameTypeVehicles[0],
        vehicleTypeId,
        "single",
      );
    }
  });

  if (rows.size === 0) {
    vehicles
      .filter((vehicle) => vehicle.isAssigned === true)
      .forEach((vehicle, index) => {
        const vehicleTypeId = Number(
          vehicle.vehicleTypeId || 0,
        );

        if (!vehicleTypeId) {
          return;
        }

        addVehicle(
          vehicle,
          vehicleTypeId,
          `fallback-${index}`,
        );
      });
  }

return Array.from(rows.values());
};

const clipboardLegHasVehicles = (
  details?: ItineraryDetailsResponse | null,
): boolean => {
  if (!details) {
    return false;
  }

  const itineraryPreference = Number(
    details.itineraryPreference ?? 0,
  );

  /*
   * Same service rule used by
   * useItineraryDisplayMode.ts.
   *
   * 1 = Hotel Only
   * 2 = Transportation Only
   * 3 = Hotel + Vehicle
   */
  if (itineraryPreference > 0) {
    return (
      itineraryPreference === 2 ||
      itineraryPreference === 3
    );
  }

  const hasVehicleSelection =
    Array.isArray(details.vehicleSelections) &&
    details.vehicleSelections.some(
      (selection: any) =>
        Number(selection?.vehicleTypeId || 0) > 0,
    );

  const hasVehicleRow =
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

  return (
    hasVehicleSelection ||
    hasVehicleRow ||
    vehicleAmount > 0
  );
};
export type ClipboardMode = "recommended" | "highlights" | "para";
export type ClipboardGroup = ClipboardSelectionGroup<ItineraryHotelRow>;

type ClipboardContentBuilderOptions = {
  hotelDetails: ItineraryHotelDetailsResponse | null;
  itinerary: ItineraryDetailsResponse | null;
  paraRecommendations: Array<{
    label: string;
    groupType: number;
    hotels: ItineraryHotelRow[];
  }>;
  selectedHotels: Record<string, boolean>;
  shouldShowHotels: boolean;
  shouldShowVehicles: boolean;
  computedVehicleAmount: number;
  computedVehicleQty: number;
  isAgentLogin: boolean;

  multiLegHotelGroups?: ClipboardLegHotelGroup[];
};

export type ClipboardGroupDetails = Record<
  number,
  ItineraryDetailsResponse
>;

export type ClipboardLegHotelGroup = {
  label: string;
  itinerary: ItineraryDetailsResponse;
  groups: ClipboardGroup[];

  /**
   * Recommendation-specific itinerary details.
   *
   * Example:
   * groupDetails[1] = Overall Trip Cost/details for Recommended #1
   * groupDetails[2] = Overall Trip Cost/details for Recommended #2
   */
  groupDetails?: ClipboardGroupDetails;
};

export const useClipboardContentBuilder = ({
  hotelDetails,
  itinerary,
  paraRecommendations,
  selectedHotels,
  shouldShowHotels,
  shouldShowVehicles,
  computedVehicleAmount,
  computedVehicleQty,
  isAgentLogin,
  multiLegHotelGroups = [],
}: ClipboardContentBuilderOptions) => {
  const getSelectedClipboardGroups = useCallback((_mode: ClipboardMode): ClipboardGroup[] => {
    if (!hotelDetails) return [];
    return buildSelectedClipboardGroups(paraRecommendations, selectedHotels);
  }, [hotelDetails, paraRecommendations, selectedHotels]);

const buildClipboardHtml = useCallback(
  (
    mode: ClipboardMode,
    groupDetails: ClipboardGroupDetails = {},
    multiLegGroupsOverride?: ClipboardLegHotelGroup[],
  ) => {
  if (!itinerary) {
  return {
    html: "",
    plainText: "",
    packageSectionsHtml: "",
  };
}

const isMultiLegBuild =
  Array.isArray(multiLegGroupsOverride) &&
  multiLegGroupsOverride.length > 0;

/*
 * Keep normal single-itinerary behavior unchanged.
 *
 * Multi-leg may legitimately contain only
 * transportation legs, so hotelDetails is not
 * mandatory there.
 */
if (!hotelDetails && !isMultiLegBuild) {
  return {
    html: "",
    plainText: "",
    packageSectionsHtml: "",
  };
}

    const selectedGroups = getSelectedClipboardGroups(mode);

    /*
     * Normal clipboard:
     * selectedGroups must contain at least one recommendation.
     *
     * Continue Planning / multi-leg clipboard:
     * hotel groups are supplied through multiLegGroupsOverride,
     * so selectedGroups is allowed to be empty.
     */
const hasMultiLegHotelGroups =
  Array.isArray(multiLegGroupsOverride) &&
  multiLegGroupsOverride.some(
    (leg) =>
      Array.isArray(leg.groups) &&
      leg.groups.some(
        (group) =>
          Number(group.groupType) > 0 &&
          Array.isArray(group.hotels) &&
          group.hotels.length > 0,
      ),
  );

const hasMultiLegVehicles =
  Array.isArray(multiLegGroupsOverride) &&
  multiLegGroupsOverride.some((leg) =>
    clipboardLegHasVehicles(leg.itinerary),
  );

if (
  !selectedGroups.length &&
  !hasMultiLegHotelGroups &&
  !hasMultiLegVehicles
) {
      return { html: "", plainText: "", packageSectionsHtml: "" };
    }

    const sectionTitle = "Recommended Hotel";
    const tableStyle = "border-collapse:collapse;background:#fff;font-family:Calibri,Arial,sans-serif;font-size:16px;line-height:1.25;color:#302c6e;";
    const borderStyle = "border:1px solid #b1b1b1;";
    const cellStyle = `${borderStyle}padding:6px;text-align:left;vertical-align:middle;color:#302c6e;`;
    const headerCellStyle = `${cellStyle}background:#f2f2f2;font-weight:700;`;
    const centerTitleStyle = "font-family:Calibri,Arial,sans-serif;font-size:20px;line-height:42px;font-weight:700;text-align:center;color:#302c6e;";

    const selectedVehicles = getSelectedVehiclesForClipboard(
  itinerary.vehicles,
  itinerary.vehicleSelections ?? [],
);

const selectedVehicleAmount =
  selectedVehicles.reduce(
    (sum, vehicle) => {
      const vehicleAmount =
        getVehicleAmountNumber(vehicle);

      const quantity = Math.max(
        Number(vehicle.totalQty ?? 1) || 1,
        1,
      );

      return (
        sum +
        vehicleAmount * quantity
      );
    },
    0,
  );

const storedVehicleTotal = (() => {
  if (
    typeof window === "undefined" ||
    !itinerary.quoteId
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

  return Number.isFinite(amount) && amount > 0
    ? amount
    : null;
})();

const backendVehicleAmount = Number(
  itinerary.costBreakdown?.totalVehicleAmount ??
    itinerary.costBreakdown?.totalVehicleCost ??
    0,
);

const vehicleAmount = shouldShowVehicles
  ? selectedVehicleAmount > 0
    ? selectedVehicleAmount
    : storedVehicleTotal !== null
      ? storedVehicleTotal
      : computedVehicleAmount > 0
        ? computedVehicleAmount
        : backendVehicleAmount > 0
          ? backendVehicleAmount
          : 0
  : 0;

const agentProfitAmount = (() => {
  if (
    typeof window === "undefined" ||
    !itinerary.quoteId
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

const storedHotelTotals = (() => {
  if (
    typeof window === "undefined" ||
    !itinerary.quoteId
  ) {
    return {} as Record<number, number>;
  }

  try {
    const rawValue = window.localStorage.getItem(
      `public-itinerary-hotel-totals:${itinerary.quoteId}`,
    );

    if (!rawValue) {
      return {} as Record<number, number>;
    }

    const parsed = JSON.parse(rawValue) as Record<
      string,
      unknown
    >;

    return Object.entries(parsed).reduce<
      Record<number, number>
    >((totals, [groupType, value]) => {
      const normalizedGroupType = Number(groupType);
      const amount = Number(value);

      if (
        normalizedGroupType > 0 &&
        Number.isFinite(amount) &&
        amount > 0
      ) {
        totals[normalizedGroupType] = amount;
      }

      return totals;
    }, {});
  } catch {
    return {} as Record<number, number>;
  }
})();

const effectiveMultiLegHotelGroups =
  multiLegGroupsOverride ?? multiLegHotelGroups;

/*
 * Multi-leg vehicle data must come from every
 * selected leg that actually contains a vehicle.
 *
 * Normal single itinerary keeps its existing data.
 */
const vehicleLegsForClipboard =
  effectiveMultiLegHotelGroups.length > 0
    ? effectiveMultiLegHotelGroups.filter((leg) =>
        clipboardLegHasVehicles(
          leg.itinerary,
        ),
      )
    : [];

const vehiclesForClipboard =
  vehicleLegsForClipboard.length > 0
    ? vehicleLegsForClipboard.flatMap((leg) =>
        getSelectedVehiclesForClipboard(
          leg.itinerary.vehicles || [],
          leg.itinerary.vehicleSelections || [],
        ),
      )
    : selectedVehicles;

const vehicleDaysForClipboard =
  vehicleLegsForClipboard.length > 0
    ? vehicleLegsForClipboard.flatMap(
        (leg) => leg.itinerary.days || [],
      )
    : itinerary.days;
const transportLegsForClipboard =
  effectiveMultiLegHotelGroups.length > 0
    ? effectiveMultiLegHotelGroups.map(
        (leg) => ({
          vehicles:
            clipboardLegHasVehicles(
              leg.itinerary,
            )
              ? getSelectedVehiclesForClipboard(
                  leg.itinerary.vehicles || [],
                  leg.itinerary
                    .vehicleSelections || [],
                )
              : [],

          days:
            leg.itinerary.days || [],
        }),
      )
    : [
        {
          vehicles: selectedVehicles,
          days: itinerary.days || [],
        },
      ];
const shouldRenderVehicleSection =
  effectiveMultiLegHotelGroups.length > 0
    ? vehiclesForClipboard.length > 0
    : shouldShowVehicles;

const groupsForRendering: ClipboardGroup[] =
  effectiveMultiLegHotelGroups.length > 0
    ? Array.from(
        new Map(
          effectiveMultiLegHotelGroups
            .flatMap((leg) => leg.groups)
            .map((group) => [
              Number(group.groupType),
              group,
            ]),
        ).values(),
      ).sort(
        (a, b) =>
          Number(a.groupType) - Number(b.groupType),
      )
    : selectedGroups;

    const formatMultiLegAmount = (value: unknown) => {
  const amount = Number(value || 0);

  return `₹ ${amount.toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
};

const getMultiLegRecommendationAmount = (
  leg: ClipboardLegHotelGroup,
  groupType: number,
) => {
  const recommendationDetails =
    leg.groupDetails?.[groupType];

  /*
   * Base itinerary pricing is the authority.
   *
   * Recommended #2/#3/#4 must follow the exact same rule
   * used by the normal itinerary page:
   *
   * persisted net payable
   * + recommendation hotel difference
   *
   * Do NOT directly use recommendationDetails.netPayable,
   * because that value can contain a recalculated margin and
   * can therefore differ from the Overall Trip Cost shown
   * on the itinerary page.
   */
  const persistedHotelAmount = Number(
    leg.itinerary?.costBreakdown?.totalHotelAmount ??
      leg.itinerary?.costBreakdown?.totalRoomCost ??
      0,
  );

  const persistedNetPayable = Number(
    leg.itinerary?.costBreakdown?.netPayable ??
      leg.itinerary?.overallCost ??
      0,
  );

  /*
   * Prefer the recommendation-specific hotel amount returned
   * by getDetails(quoteId, groupType).
   */
  const recommendationHotelAmountFromDetails =
    Number(
      recommendationDetails?.costBreakdown
        ?.totalHotelAmount ??
        recommendationDetails?.costBreakdown
          ?.totalRoomCost ??
        0,
    );

  /*
   * Safe fallback:
   * calculate this recommendation's selected hotel total from
   * the exact hotel rows already loaded for this leg/group.
   */
  const recommendationGroup =
    leg.groups.find(
      (group) =>
        Number(group.groupType) ===
        Number(groupType),
    );

  const recommendationHotelAmountFromRows =
    (recommendationGroup?.hotels || []).reduce(
      (sum, hotel) =>
        sum + getHotelSelectionAmount(hotel),
      0,
    );

  const recommendationHotelAmount =
    recommendationHotelAmountFromDetails > 0
      ? recommendationHotelAmountFromDetails
      : recommendationHotelAmountFromRows;

  const hotelDifference =
    recommendationHotelAmount > 0 &&
    persistedHotelAmount > 0
      ? recommendationHotelAmount -
        persistedHotelAmount
      : 0;

  /*
   * Current leg can contain an Agent profit stored separately
   * by the Cost Summary.
   *
   * Previous legs already have their own persisted pricing, so
   * never add the current leg's profit to them.
   */
  const isCurrentLeg =
    String(leg.itinerary?.quoteId || "") ===
    String(itinerary.quoteId || "");

  const currentLegProfit =
    isCurrentLeg
      ? agentProfitAmount
      : 0;

  if (persistedNetPayable > 0) {
    return Math.round(
      persistedNetPayable +
        hotelDifference +
        currentLegProfit,
    );
  }

  /*
   * Older itinerary fallback where the base net payable
   * is unavailable.
   */
  const recommendationNetPayable = Number(
    recommendationDetails?.costBreakdown?.netPayable ??
      recommendationDetails?.overallCost ??
      0,
  );

  if (recommendationNetPayable > 0) {
    return Math.round(
      recommendationNetPayable +
        currentLegProfit,
    );
  }

  return 0;
};
const buildMultiLegRecommendationCostHtml = (
  groupType: number,
) => {
  if (!effectiveMultiLegHotelGroups.length) {
    return "";
  }

const legsForOption =
  effectiveMultiLegHotelGroups.filter(
    (leg) => {
      /*
       * Every selected leg which has at least one
       * selected hotel option must stay in this
       * Travel Plan.
       *
       * Exact recommendation is preferred later.
       * Otherwise the leg's first selected option
       * is used as its fallback.
       */
      return leg.groups.length > 0;
    },
  );

if (!legsForOption.length) {
  return "";
}

  const formatSummaryDate = (
    value: unknown,
  ): string => {
    const normalized =
      normalizeClipboardDate(value);

    if (!normalized) {
      return "--";
    }

    const [year, month, day] =
      normalized.split("-").map(Number);

    if (!year || !month || !day) {
      return normalized;
    }

    const monthNames = [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec",
    ];

    return `${day} ${
      monthNames[month - 1] || ""
    } ${String(year).slice(-2)}`;
  };

  const getLegVehicleText = (
    leg: ClipboardLegHotelGroup,
  ): string => {
    if (
      !clipboardLegHasVehicles(
        leg.itinerary,
      )
    ) {
      return "";
    }

    const legVehicles =
      getSelectedVehiclesForClipboard(
        leg.itinerary.vehicles || [],
        leg.itinerary.vehicleSelections || [],
      );

    return legVehicles
      .map((vehicle) => {
        const name = String(
          vehicle.vehicleTypeName || "",
        ).trim();

        if (!name) {
          return "";
        }

        const quantity = Math.max(
          Number(
            vehicle.totalQty ?? 1,
          ) || 1,
          1,
        );

        return `${quantity} ${name}`;
      })
      .filter(Boolean)
      .join(" & ");
  };

  const rows = legsForOption.map(
    (leg) => {
      const {
        startDate,
        endDate,
      } = getClipboardLegDateRange(
        leg.itinerary,
      );

const exactGroup =
  leg.groups.find(
    (legGroup) =>
      Number(legGroup.groupType) ===
      Number(groupType),
  );

/*
 * If this Travel Plan option was not selected for
 * this leg, use that leg's first actually selected
 * hotel option.
 */
const fallbackSelectedGroup =
  leg.groups[0];

const resolvedGroup =
  exactGroup ??
  fallbackSelectedGroup;

const resolvedGroupType =
  Number(
    resolvedGroup?.groupType ??
      groupType,
  );

const amount =
  getMultiLegRecommendationAmount(
    leg,
    resolvedGroupType,
  );

      const adults = Math.max(
        0,
        Number(
          leg.itinerary.adults || 0,
        ),
      );

      const childWithBed = Math.max(
        0,
        Number(
          leg.itinerary
            .childWithBed || 0,
        ),
      );

      const childWithoutBed = Math.max(
        0,
        Number(
          leg.itinerary
            .childWithoutBed || 0,
        ),
      );

      const infants = Math.max(
        0,
        Number(
          leg.itinerary.infants || 0,
        ),
      );

      const travellerParts = [
        `${adults} ${
          adults === 1
            ? "Adult"
            : "Adults"
        }`,

        childWithBed > 0
          ? `${childWithBed} ${
              childWithBed === 1
                ? "Child With Bed"
                : "Children With Bed"
            }`
          : "",

        childWithoutBed > 0
          ? `${childWithoutBed} ${
              childWithoutBed === 1
                ? "Child Without Bed"
                : "Children Without Bed"
            }`
          : "",

        `${infants} ${
          infants === 1
            ? "Infant"
            : "Infants"
        }`,
      ].filter(Boolean);

      const vehicleText =
        getLegVehicleText(leg);

      const packageDescription = [
        travellerParts.join(", "),
        vehicleText
          ? `With ${vehicleText}`
          : "",
      ]
        .filter(Boolean)
        .join(" ");

      return {
        startDate,
        endDate,
        amount,
        packageDescription,
      };
    },
  );

  const totalPayable =
    rows.reduce(
      (sum, row) =>
        sum + Number(row.amount || 0),
      0,
    );

  const rowsHtml = rows
    .map(
      (row) => `
        <tr>
          <td
            style="
              ${cellStyle}
              width:18%;
              vertical-align:middle;
            "
          >
            ${escapeHtml(
              formatSummaryDate(
                row.startDate,
              ),
            )}
            To
            ${escapeHtml(
              formatSummaryDate(
                row.endDate,
              ),
            )}
          </td>

          <td
            style="
              ${cellStyle}
              width:57%;
              vertical-align:middle;
            "
          >
            Total Package Cost For
            (${escapeHtml(
              row.packageDescription,
            )})
          </td>

          <td
            style="
              ${cellStyle}
              width:25%;
              text-align:right;
              vertical-align:middle;
              white-space:nowrap;
            "
          >
            ${escapeHtml(
              formatMultiLegAmount(
                row.amount,
              ),
            )}
          </td>
        </tr>
      `,
    )
    .join("");

  return `
    <table
      width="700"
      border="1"
      cellpadding="0"
      cellspacing="0"
    style="
  ${tableStyle}
  margin-top:0;
  margin-bottom:2px;
"
    >
      <tr>
        <td
          colspan="3"
          style="
            ${cellStyle}
            text-align:center;
            font-weight:400;
            padding:4px 6px;
          "
        >
          Price Summary
        </td>
      </tr>

      ${rowsHtml}

      <tr>
        <td
          colspan="2"
          style="
            ${cellStyle}
            text-align:center;
            font-weight:400;
          "
        >
          Total Package Payable
        </td>

        <td
          style="
            ${cellStyle}
            text-align:right;
            font-weight:400;
            white-space:nowrap;
          "
        >
          ${escapeHtml(
            formatMultiLegAmount(
              totalPayable,
            ),
          )}
        </td>
      </tr>
    </table>
  `;
};
const hotelPackageSectionsHtml = groupsForRendering
  .map((group, groupIndex) => {
    /*
     * For Continue Planning / multi-leg clipboard,
     * use the already merged hotel rows supplied by
     * useHotelClipboardAction.
     *
     * That data is already:
     * Previous Leg 1
     * -> Previous Leg 2
     * -> Current Leg
     *
     * Do NOT append group.hotels again.
     */
const hotelLegsForSection =
  effectiveMultiLegHotelGroups.length > 0
    ? effectiveMultiLegHotelGroups
    : [
        {
          label: "Leg 1",
          itinerary,
          groups: selectedGroups,
        },
      ];

const hotelsForSection =
  hotelLegsForSection.length > 0
    ? hotelLegsForSection.flatMap((leg) => {
        /*
         * Continue Planning / multi-leg hotel logic:
         *
         * Every selected leg must remain visible in every
         * Hotels Curated Choice / Travel Plan.
         *
         * Example:
         *
         * Leg 1 selected only Option 1
         * Leg 2 selected Option 1, 2, 3, 4
         * Leg 3 selected only Option 1
         *
         * Hotels Curated Choice:2 must still show:
         *
         * Leg 1 -> its selected Option 1
         * Leg 2 -> Option 2
         * Leg 3 -> its selected Option 1
         *
         * Prefer the exact recommendation first.
         *
         * If this leg has only one selected recommendation,
         * keep using that selected recommendation instead of
         * dropping the entire leg.
         */
   const exactMatchingGroup =
  leg.groups.find(
    (legGroup) =>
      Number(legGroup.groupType) ===
      Number(group.groupType),
  );

/*
 * Every selected leg must remain visible in every
 * Hotels Curated Choice / Travel Plan.
 *
 * Prefer the exact option when that leg selected it.
 *
 * If that exact option was not selected for the leg,
 * use the first hotel option that the guest actually
 * selected for that leg.
 *
 * Example:
 *
 * Leg 1 selected Option 1 + Option 2
 * Leg 2 selected Option 2 + Option 3 + Option 4
 *
 * Travel Plan 1:
 * Leg 1 -> Option 1
 * Leg 2 -> fallback Option 2
 *
 * Travel Plan 3:
 * Leg 1 -> fallback Option 1
 * Leg 2 -> Option 3
 */
const fallbackSelectedGroup =
  leg.groups[0];

const matchingGroup =
  exactMatchingGroup ??
  fallbackSelectedGroup;

if (!matchingGroup) {
  return [];
}

const resolvedGroupType =
  Number(matchingGroup.groupType);

        /*
         * IMPORTANT:
         * matchingGroup.hotels may contain many available hotels
         * for the same itinerary date.
         *
         * Clipboard must show only ONE selected hotel for each
         * actual itinerary day/date.
         */
/*
 * IMPORTANT:
 *
 * Every Recommended option has its own created-itinerary details.
 *
 * Example:
 * Recommended #1 must use groupDetails[1].days
 * Recommended #2 must use groupDetails[2].days
 *
 * Using leg.itinerary.days for every recommendation can make
 * Recommendation #2/#3/#4 inherit the selected hotel from a
 * different recommendation.
 */
const recommendationItinerary =
  leg.groupDetails?.[resolvedGroupType] ??
  leg.itinerary;

const itineraryDays = Array.isArray(
  recommendationItinerary?.days,
)
  ? recommendationItinerary.days
  : [];

const hotelsForLeg = itineraryDays.flatMap(
  (itineraryDay: any) => {
    const dayDate = normalizeClipboardDate(
      itineraryDay?.date ??
        itineraryDay?.routeDate ??
        itineraryDay?.startDate ??
        itineraryDay?.travelDate,
    );

    if (!dayDate) {
      return [];
    }

    /*
     * A clipboard hotel row represents an actual NIGHT STAY.
     *
     * The source may contain many available hotels for the same
     * date/recommendation, so first restrict the source to this date.
     */
    const hotelsForDate = matchingGroup.hotels.filter((hotel: any) => {
      const hotelDate = normalizeClipboardDate(
        hotel?.date ??
          hotel?.startDate ??
          hotel?.checkInDate ??
          hotel?.hotelCheckInDate ??
          hotel?.hotel_check_in_date,
      );

      return hotelDate === dayDate;
    });

    /*
     * Prefer the committed/selected hotel for this recommendation
     * and this exact stay date.
     *
     * Keep the existing first-row fallback for older hotel data.
     */

console.log(
  "🔥 HOTEL MATCH DEBUG JSON:",
  JSON.stringify(
    {
      leg: leg.label,
      quoteId: leg.itinerary?.quoteId,
      groupType: resolvedGroupType,
      dayDate,

      itineraryDay,

      hotelsForDate: hotelsForDate.map((hotel: any) => ({
        hotelName:
          hotel?.hotelName ??
          hotel?.hotel_name ??
          hotel?.name,

        hotelId:
          hotel?.hotelId ??
          hotel?.hotel_id ??
          hotel?.canonicalHotelId,

        canonicalHotelId:
          hotel?.canonicalHotelId,

        hotelCode:
          hotel?.hotelCode ??
          hotel?.hotel_code,

        routeId:
          hotel?.routeId ??
          hotel?.route_id,

        selectionStatus:
          hotel?.selectionStatus,

        isSelected:
          hotel?.isSelected,

        selected:
          hotel?.selected,

        selection: hotel?.selection,
      })),

    recommendationItinerary,
    },
    null,
    2,
  ),
);

const explicitlySelectedHotel =
  hotelsForDate.find((hotel: any) => {
    const selection =
      hotel?.selection &&
      typeof hotel.selection === "object"
        ? hotel.selection
        : null;

    return (
      hotel?.isSelected === true ||
      hotel?.selected === true ||
      String(hotel?.selectionStatus ?? "")
        .trim()
        .toUpperCase() === "SELECTED" ||
      selection?.isSelected === true ||
      selection?.selected === true ||
      String(selection?.selectionStatus ?? "")
        .trim()
        .toUpperCase() === "SELECTED"
    );
  });

/*
 * Prefer the hotel that is actually committed to this itinerary day.
 *
 * Do not blindly use hotelsForDate[0].
 * Hotel-details can contain multiple AVAILABLE hotels for one date,
 * and the first available hotel is not necessarily the hotel selected
 * for the itinerary.
 */
const normalizeHotelName = (value: unknown) =>
  String(value ?? "")
    .replace(/&nbsp;/gi, " ")
    .replace(/\u00a0/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();

/*
 * Normal single-itinerary clipboard must use the hotel
 * actually persisted in hotelSelectionState.
 *
 * Do not allow stale AVAILABLE hotel rows or old selected flags
 * to replace the hotel changed by the user.
 *
 * Multi-leg rows are already normalized before reaching here,
 * so this block is only required for the normal single itinerary.
 */
const committedSelectionGroup =
  effectiveMultiLegHotelGroups.length === 0
    ? hotelDetails?.hotelSelectionState?.find(
        (state: any) =>
          Number(state?.groupType || 0) ===
          Number(resolvedGroupType),
      )
    : undefined;

const itineraryRouteId = Number(
  itineraryDay?.routeId ??
    itineraryDay?.route_id ??
    itineraryDay?.id ??
    0,
);

const committedRoute: any =
  Array.isArray(committedSelectionGroup?.routes)
    ? committedSelectionGroup.routes.find(
        (route: any) => {
          const selectedRouteId = Number(
            route?.routeId ??
              route?.route_id ??
              0,
          );

          const selectedRouteDate =
            normalizeClipboardDate(
              route?.routeDate ??
                route?.date ??
                route?.startDate,
            );

          const sameRoute =
            itineraryRouteId > 0 &&
            selectedRouteId > 0 &&
            itineraryRouteId ===
              selectedRouteId;

          const sameDate =
            Boolean(dayDate) &&
            Boolean(selectedRouteDate) &&
            dayDate === selectedRouteDate;

          return sameRoute || sameDate;
        },
      )
    : undefined;

const committedSelectedHotel: any =
  committedRoute?.selected;

const committedHotelRow: any =
  committedSelectedHotel
    ? hotelsForDate.find((hotel: any) => {
        const rowCanonicalHotelId =
          Number(
            hotel?.canonicalHotelId ??
              hotel?.hotelId ??
              hotel?.hotel_id ??
              0,
          );

        const selectedCanonicalHotelId =
          Number(
            committedSelectedHotel
              ?.canonicalHotelId ??
              committedSelectedHotel
                ?.hotelId ??
              0,
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
          normalizeHotelName(
            hotel?.providerHotelCode ??
              hotel?.provider_hotel_code,
          );

        const selectedProviderHotelCode =
          normalizeHotelName(
            committedSelectedHotel
              ?.providerHotelCode ??
              committedSelectedHotel
                ?.provider_hotel_code,
          );

        if (
          rowProviderHotelCode &&
          selectedProviderHotelCode &&
          rowProviderHotelCode ===
            selectedProviderHotelCode
        ) {
          return true;
        }

        const rowHotelCode =
          normalizeHotelName(
            hotel?.hotelCode ??
              hotel?.hotel_code,
          );

        const selectedHotelCode =
          normalizeHotelName(
            committedSelectedHotel
              ?.hotelCode ??
              committedSelectedHotel
                ?.hotel_code,
          );

        if (
          rowHotelCode &&
          selectedHotelCode &&
          rowHotelCode ===
            selectedHotelCode
        ) {
          return true;
        }

        const rowHotelName =
          normalizeHotelName(
            hotel?.hotelName ??
              hotel?.hotel_name ??
              hotel?.name,
          );

        const selectedHotelName =
          normalizeHotelName(
            committedSelectedHotel
              ?.hotelName ??
              committedSelectedHotel
                ?.hotel_name ??
              committedSelectedHotel?.name,
          );

        return Boolean(
          rowHotelName &&
            selectedHotelName &&
            rowHotelName ===
              selectedHotelName,
        );
      })
    : undefined;

const persistedHotelForDay =
  committedSelectedHotel
    ? {
        ...(committedHotelRow ?? {}),
        ...committedSelectedHotel,

        date: dayDate,
        startDate: dayDate,

        routeId:
          committedRoute?.routeId ??
          committedRoute?.route_id ??
          committedHotelRow?.routeId ??
          committedHotelRow?.route_id,

        isSelected: true,
        selected: true,
        selectionStatus: "SELECTED",

        selection: {
          ...(committedHotelRow?.selection &&
          typeof committedHotelRow.selection ===
            "object"
            ? committedHotelRow.selection
            : {}),

          isSelected: true,
          selected: true,
          selectionStatus: "SELECTED",
        },
      }
    : undefined;

const checkinHotelName = (() => {
  const segments = Array.isArray(itineraryDay?.segments)
    ? itineraryDay.segments
    : [];

  const checkinSegment = segments.find(
    (segment: any) => {
      const segmentType = String(
        segment?.type ??
          segment?.itemType ??
          segment?.item_type ??
          "",
      )
        .trim()
        .toLowerCase();

      const segmentHotelName =
        segment?.hotelName ??
        segment?.hotel_name ??
        segment?.name ??
        segment?.title ??
        "";

      return (
        (segmentType === "checkin" ||
          segmentType === "check-in" ||
          segmentType === "hotel") &&
        normalizeHotelName(segmentHotelName)
      );
    },
  );

  return normalizeHotelName(
    checkinSegment?.hotelName ??
      checkinSegment?.hotel_name ??
      checkinSegment?.name ??
      checkinSegment?.title ??
      "",
  );
})();

const itineraryCheckinHotel =
  checkinHotelName
    ? hotelsForDate.find((hotel: any) => {
        const hotelName = normalizeHotelName(
          hotel?.hotelName ??
            hotel?.hotel_name ??
            hotel?.name ??
            "",
        );

        return hotelName === checkinHotelName;
      })
    : undefined;

/*
 * Some itinerary responses keep the selected hotel directly on
 * the day instead of inside a check-in segment.
 */
const itineraryDayHotelName = normalizeHotelName(
  itineraryDay?.hotelName ??
    itineraryDay?.hotel_name ??
    itineraryDay?.selectedHotelName ??
    itineraryDay?.selected_hotel_name ??
    itineraryDay?.hotel?.hotelName ??
    itineraryDay?.hotel?.hotel_name ??
    itineraryDay?.hotel?.name ??
    "",
);

const itineraryDayHotel =
  itineraryDayHotelName
    ? hotelsForDate.find((hotel: any) => {
        const hotelName = normalizeHotelName(
          hotel?.hotelName ??
            hotel?.hotel_name ??
            hotel?.name ??
            "",
        );

        return hotelName === itineraryDayHotelName;
      })
    : undefined;

const hotelForDay =
  persistedHotelForDay ??
  explicitlySelectedHotel ??
  itineraryCheckinHotel ??
  itineraryDayHotel ??
  hotelsForDate[0];

/*
 * Only skip the row when there is genuinely no hotel data
 * for this itinerary date.
 */
if (!hotelForDay) {
  return [];
}

    const hotelRecord =
      hotelForDay as unknown as Record<string, any>;

    /*
     * Destination must describe WHERE THE GUEST STAYS THAT NIGHT.
     *
     * Prefer the destination attached to the actual hotel row.
     * Only fall back to itinerary arrival when old hotel data
     * does not contain destination information.
     */
    const hotelDestination = String(
      hotelRecord?.destination ??
        hotelRecord?.destinationName ??
        hotelRecord?.hotelDestination ??
        hotelRecord?.cityName ??
        hotelRecord?.city ??
        itineraryDay?.arrival ??
        "",
    ).trim();

const legDays = Array.isArray(
  recommendationItinerary?.days,
)
  ? recommendationItinerary.days
  : [];

const firstLegDay: any =
  legDays[0] || {};

const lastLegDay: any =
  legDays[legDays.length - 1] ||
  firstLegDay;

const legArrivalLocation = String(
  firstLegDay?.departure ??
    firstLegDay?.source ??
    firstLegDay?.from ??
    firstLegDay?.locationName ??
    firstLegDay?.arrival ??
    "",
).trim();

const legDepartureLocation = String(
  lastLegDay?.arrival ??
    lastLegDay?.destination ??
    lastLegDay?.to ??
    lastLegDay?.nextVisitingLocation ??
    lastLegDay?.departure ??
    "",
).trim();

const legDropDate =
  normalizeClipboardDate(
    lastLegDay?.date ??
      lastLegDay?.routeDate ??
      lastLegDay?.startDate ??
      lastLegDay?.travelDate,
  );

return [
  {
    ...hotelForDay,

    date: dayDate,
    startDate: dayDate,
    destination: hotelDestination,

    __clipboardLegItinerary:
      recommendationItinerary,

    /*
     * Display-only metadata for the senior
     * Hotels Curated Choice format.
     */
    __clipboardLegLabel:
      leg.label,

    __clipboardLegArrival:
      legArrivalLocation,

    __clipboardLegDeparture:
      legDepartureLocation,

    __clipboardLegDropDate:
      legDropDate,
  } as ItineraryHotelRow,
];
  },
);

console.log(
  "🔥 EXACT CREATED ITINERARY DAYS:",
  {
    leg: leg.label,
    groupType: group.groupType,
    quoteId: recommendationItinerary?.quoteId,
    days: recommendationItinerary?.days,
  },
);
console.log(
  "🔥 EXACT SOURCE HOTELS:",
  matchingGroup.hotels,
);

console.log("🔥 CLIPBOARD HOTELS FOR LEG:", {
  label: leg.label,
  quoteId: leg.itinerary.quoteId,
  groupType: group.groupType,
  itineraryDays: leg.itinerary.days,
  sourceHotelCount: matchingGroup.hotels.length,
  hotelCountForLeg: hotelsForLeg.length,
  hotels: hotelsForLeg,
});

return hotelsForLeg;
      })
    : group.hotels.map((hotel) => ({
        ...hotel,
        __clipboardLegItinerary: itinerary,
      }));

      const multiLegRecommendationCostHtml =
  buildMultiLegRecommendationCostHtml(
    Number(group.groupType),
  );
const recommendationTab =
  hotelDetails?.hotelTabs?.find(
    (tab) =>
      Number(tab.groupType) ===
      Number(group.groupType),
  );

const committedGroup =
  hotelDetails?.hotelSelectionState?.find(
    (state) =>
      Number(state.groupType) ===
      Number(group.groupType),
  );

const storedHotelAmount = Number(
  storedHotelTotals[group.groupType] || 0,
);

const committedHotelAmount = Number(
  committedGroup?.totalAmount || 0,
);

const recommendationHotelAmount = Number(
  recommendationTab?.partialTotal ??
    recommendationTab?.totalAmount ??
    0,
);

const hotelAmountFromRows =
  hotelsForSection.reduce(
    (sum, hotel) =>
      sum + getHotelSelectionAmount(hotel),
    0,
  );

const hotelAmount =
  storedHotelAmount > 0
    ? storedHotelAmount
    : committedHotelAmount > 0
      ? committedHotelAmount
      : recommendationHotelAmount > 0
        ? recommendationHotelAmount
        : hotelAmountFromRows;

const adults = Math.max(
  0,
  Number(itinerary.adults || 0),
);
const children = Math.max(
  0,
  Number(itinerary.children || 0),
);

const infants = Math.max(
  0,
  Number(itinerary.infants || 0),
);

const roomCount = Math.max(
  0,
  Number(itinerary.roomCount || 0),
);

const extraBedCount = Math.max(
  0,
  Number(itinerary.extraBed || 0),
);

const childWithBedCount = Math.max(
  0,
  Number(itinerary.childWithBed || 0),
);

const childWithoutBedCount = Math.max(
  0,
  Number(itinerary.childWithoutBed || 0),
);
const vehicleNamesFromSelectedVehicles =
  selectedVehicles
    .map((vehicle) =>
      String(vehicle.vehicleTypeName || "").trim(),
    )
    .filter(Boolean);

const vehicleNamesFromSelections =
  (itinerary.vehicleSelections ?? [])
    .map((selection) => {
      const vehicleTypeId = Number(
        selection.vehicleTypeId || 0,
      );

      const matchingVehicle =
        itinerary.vehicles.find(
          (vehicle) =>
            Number(vehicle.vehicleTypeId || 0) ===
            vehicleTypeId,
        );

      return String(
        matchingVehicle?.vehicleTypeName || "",
      ).trim();
    })
    .filter(Boolean);

const assignedVehicleNames =
  itinerary.vehicles
    .filter(
      (vehicle) => vehicle.isAssigned === true,
    )
    .map((vehicle) =>
      String(vehicle.vehicleTypeName || "").trim(),
    )
    .filter(Boolean);

const selectedVehicleNames = Array.from(
  new Set([
    ...vehicleNamesFromSelectedVehicles,
    ...vehicleNamesFromSelections,
    ...assignedVehicleNames,
  ]),
);

const vehicleNameText =
  selectedVehicleNames.join(", ");

const packageVehicleNameText =
  shouldShowVehicles
    ? vehicleNameText
    : "";

const adultLabel =
  `${adults} ${
    adults === 1 ? "Adult" : "Adults"
  }`;

const childLabels: string[] = [];

if (childWithBedCount > 0) {
  childLabels.push(
    `${childWithBedCount} ${
      childWithBedCount === 1
        ? "Child With Bed"
        : "Children With Bed"
    }`,
  );
}

if (childWithoutBedCount > 0) {
  childLabels.push(
    `${childWithoutBedCount} ${
      childWithoutBedCount === 1
        ? "Child Without Bed"
        : "Children Without Bed"
    }`,
  );
}

/*
 * Fallback for an itinerary where children exist but
 * bed-wise child information is not available.
 */
const categorizedChildCount =
  childWithBedCount + childWithoutBedCount;

if (
  children > categorizedChildCount
) {
  const remainingChildren =
    children - categorizedChildCount;

  childLabels.push(
    `${remainingChildren} ${
      remainingChildren === 1
        ? "Child"
        : "Children"
    }`,
  );
}

const infantLabel =
  `${infants} ${
    infants === 1 ? "Infant" : "Infants"
  }`;

const travellerLabel = [
  adultLabel,
  ...childLabels,
  infantLabel,
].join(", ");

const fullPackageDescription =
  packageVehicleNameText
    ? `${travellerLabel} With ${packageVehicleNameText}`
    : travellerLabel;

const groupCostBreakdown = itinerary.costBreakdown;

const readMoney = (value: unknown): number => {
  const amount = Number(value ?? 0);
  return Number.isFinite(amount) ? amount : 0;
};

/*
 * IMPORTANT:
 *
 * The recommendation changes only the HOTEL amount.
 *
 * Vehicle amount and Additional Margin already belong to the
 * persisted itinerary price and must not be recalculated when
 * switching Recommended #1/#2/#3/#4.
 *
 * The itinerary page already follows:
 *
 * persisted net payable
 * + selected recommendation hotel difference
 *
 * Clipboard must follow exactly the same rule.
 */
const persistedHotelAmount = readMoney(
  groupCostBreakdown?.totalHotelAmount ??
    groupCostBreakdown?.totalRoomCost,
);

const persistedAdditionalMargin = readMoney(
  groupCostBreakdown?.additionalMargin,
);

const persistedNetPayable = readMoney(
  groupCostBreakdown?.netPayable ??
    itinerary.overallCost,
);

const hotelDifference =
  hotelAmount > 0 &&
  persistedHotelAmount > 0
    ? hotelAmount - persistedHotelAmount
    : 0;

/*
 * Keep the exact persisted Additional Margin.
 * Do not derive a new percentage from the selected hotel.
 */
const recommendationAdditionalMargin =
  persistedAdditionalMargin;

const couponDiscount = readMoney(
  groupCostBreakdown?.couponDiscount,
);

/*
 * Keep this calculation for the existing detailed
 * clipboard cost breakdown.
 */
const clipboardTotalAmount = Number(
  (
    hotelAmount +
    vehicleAmount +
    recommendationAdditionalMargin +
    agentProfitAmount
  ).toFixed(2),
);

const clipboardAmountAfterDiscount = Math.max(
  0,
  clipboardTotalAmount - couponDiscount,
);

/*
 * Agent + Hotel + Vehicle:
 *
 * The Agent Cost Summary calculates the live selling price from:
 *
 * Hotel Cost
 * + selected Vehicle Cost
 * + persisted Additional Margin
 * + Agent Profit
 *
 * Then it applies the final round-off.
 *
 * Therefore Agent clipboard must use that exact live calculation
 * instead of the persisted backend netPayable.
 *
 * Admin / Travel Expert and all other flows keep the existing
 * persisted-net-payable + hotel-difference behavior.
 */
const isAgentHotelVehiclePricing =
  isAgentLogin &&
  shouldShowHotels &&
  shouldShowVehicles;

const agentHotelVehicleAmountBeforeRoundOff =
  hotelAmount +
  vehicleAmount +
  recommendationAdditionalMargin +
  agentProfitAmount;

const authoritativeClipboardPayable =
  isAgentHotelVehiclePricing
    ? agentHotelVehicleAmountBeforeRoundOff
    : persistedNetPayable > 0
      ? persistedNetPayable +
        hotelDifference +
        agentProfitAmount
      : clipboardAmountAfterDiscount;

/*
 * Overall Trip Cost shown in the page header is a whole rupee value.
 */
const clipboardNetPayable = Math.round(
  authoritativeClipboardPayable,
);
const clipboardRoundOff = Number(
  (
    clipboardNetPayable -
    clipboardAmountAfterDiscount
  ).toFixed(2),
);

const totalPackageCost = clipboardNetPayable;
const clipboardCostBreakdown = {
  ...(groupCostBreakdown ?? {}),

  totalHotelAmount: Number(
    hotelAmount.toFixed(2),
  ),

  totalRoomCost: Number(
    hotelAmount.toFixed(2),
  ),

  totalVehicleAmount: Number(
    vehicleAmount.toFixed(2),
  ),

  totalVehicleCost: Number(
    vehicleAmount.toFixed(2),
  ),

additionalMargin:
  recommendationAdditionalMargin,

  totalAmount: clipboardTotalAmount,

  couponDiscount: Number(
    couponDiscount.toFixed(2),
  ),

  totalRoundOff: clipboardRoundOff,

  netPayable: clipboardNetPayable,

  agentMargin:
    readMoney(groupCostBreakdown?.agentMargin) +
    agentProfitAmount,
};
const packageDisplayAmount =
  clipboardNetPayable > 0
    ? clipboardNetPayable
    : totalPackageCost;

/*
 * Only Hotel + Vehicle gets the senior Transportation
 * Details + Curated Choice layout.
 *
 * Hotel-only continues without a vehicle section.
 */
const hotelVehicleSectionHtml =
  shouldShowHotels && shouldShowVehicles
    ? buildClipboardVehicleSectionHtml({
        vehiclesValue:
          vehiclesForClipboard,

        daysValue:
          vehicleDaysForClipboard,

        transportLegs:
          transportLegsForClipboard,

        shouldShowVehicles: true,

        packageTotalHtml: "",

        layout: "hotelVehicle",

        styles: {
          tableStyle,
          cellStyle,
          headerCellStyle,
          centerTitleStyle,
        },
      })
    : "";

return buildClipboardHotelPackageSectionHtml({
  hotels: hotelsForSection,
  roomCount: itinerary.roomCount,

  /*
   * Preserve the real Recommended option number.
   * #1 + #3 remains Choice 1 + Choice 3.
   */
  groupIndex:
    Number(group.groupType) - 1,

  sectionTitle,

  vehicleSectionHtml:
    hotelVehicleSectionHtml,

  packageTotalHtml: "",
costSectionHtml:
  effectiveMultiLegHotelGroups.length > 0
    ? multiLegRecommendationCostHtml
    : (() => {
        const {
          startDate,
          endDate,
        } = getClipboardLegDateRange(
          itinerary,
        );

        const formatSummaryDate = (
          value: unknown,
        ): string => {
          const normalized =
            normalizeClipboardDate(value);

          if (!normalized) {
            return "--";
          }

          const [
            year,
            month,
            day,
          ] = normalized
            .split("-")
            .map(Number);

          if (
            !year ||
            !month ||
            !day
          ) {
            return normalized;
          }

          const monthNames = [
            "Jan",
            "Feb",
            "Mar",
            "Apr",
            "May",
            "Jun",
            "Jul",
            "Aug",
            "Sep",
            "Oct",
            "Nov",
            "Dec",
          ];

          return `${day} ${
            monthNames[
              month - 1
            ] || ""
          } ${String(year).slice(-2)}`;
        };

        return `
          <table
            width="700"
            border="1"
            cellpadding="0"
            cellspacing="0"
           style="
  ${tableStyle}
  margin-top:0;
  margin-bottom:2px;
"
          >
            <tr>
              <td
                colspan="3"
                style="
                  ${cellStyle}
                  text-align:center;
                  font-weight:400;
                  padding:4px 6px;
                "
              >
                Price Summary
              </td>
            </tr>

            <tr>
              <td
                style="
                  ${cellStyle}
                  width:18%;
                  vertical-align:middle;
                "
              >
                ${escapeHtml(
                  formatSummaryDate(
                    startDate,
                  ),
                )}
                To
                ${escapeHtml(
                  formatSummaryDate(
                    endDate,
                  ),
                )}
              </td>

              <td
                style="
                  ${cellStyle}
                  width:57%;
                  vertical-align:middle;
                "
              >
                Total Package Cost For
                (${escapeHtml(
                  fullPackageDescription,
                )})
              </td>

              <td
                style="
                  ${cellStyle}
                  width:25%;
                  text-align:right;
                  vertical-align:middle;
                  white-space:nowrap;
                "
              >
                ${formatClipboardMoneyWithSymbol(
                  packageDisplayAmount,
                )}
              </td>
            </tr>

            <tr>
              <td
                colspan="2"
                style="
                  ${cellStyle}
                  text-align:center;
                  font-weight:400;
                "
              >
                Total Package Payable
              </td>

              <td
                style="
                  ${cellStyle}
                  text-align:right;
                  font-weight:400;
                  white-space:nowrap;
                "
              >
                ${formatClipboardMoneyWithSymbol(
                  packageDisplayAmount,
                )}
              </td>
            </tr>
          </table>
        `;
      })(),

  styles: {
    tableStyle,
    cellStyle,
    headerCellStyle,
    centerTitleStyle,
  },
});
  })
  .join("");
/*
 * Hotel + Vehicle now embeds Transportation Details
 * inside each Travel Plan / Curated Choice.
 *
 * For the other existing flows, preserve the old
 * standalone Vehicle Details section.
 */
const standaloneVehicleSectionHtml =
  !(
    shouldShowHotels &&
    shouldShowVehicles
  )
    ? buildClipboardVehicleSectionHtml({
        vehiclesValue:
          vehiclesForClipboard,

        daysValue:
          vehicleDaysForClipboard,

        shouldShowVehicles:
          shouldRenderVehicleSection,

        packageTotalHtml: "",

        styles: {
          tableStyle,
          cellStyle,
          headerCellStyle,
          centerTitleStyle,
        },
      })
    : "";

const packageSectionsHtml = [
  hotelPackageSectionsHtml,
  standaloneVehicleSectionHtml,
]
  .filter(Boolean)
  .join("");

const plainText = buildClipboardPlainText({
  groups: selectedGroups,
  roomCount: itinerary.roomCount,
  sectionTitle,
});

return {
  html: packageSectionsHtml,
  plainText,
  packageSectionsHtml,
};
}, [
  computedVehicleAmount,
  computedVehicleQty,
  getSelectedClipboardGroups,
  hotelDetails,
  itinerary,
  shouldShowHotels,
  shouldShowVehicles,
  isAgentLogin,
  multiLegHotelGroups,
]);

  return { getSelectedClipboardGroups, buildClipboardHtml };
};
