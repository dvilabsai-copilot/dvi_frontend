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
import { buildClipboardCostSectionHtml } from "../utils/clipboardCostSection.utils";
import { buildClipboardHotelPackageSectionHtml } from "../utils/clipboardHotelPackageSection.utils";
import { buildClipboardPlainText } from "../utils/clipboardPlainText.utils";
import {
  buildSelectedClipboardGroups,
  type ClipboardSelectionGroup,
} from "../utils/clipboardSelection.utils";
import { buildClipboardVehicleSectionHtml } from "../utils/clipboardVehicleSection.utils";

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
};

export type ClipboardGroupDetails = Record<
  number,
  ItineraryDetailsResponse
>;

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
}: ClipboardContentBuilderOptions) => {
  const getSelectedClipboardGroups = useCallback((_mode: ClipboardMode): ClipboardGroup[] => {
    if (!hotelDetails) return [];
    return buildSelectedClipboardGroups(paraRecommendations, selectedHotels);
  }, [hotelDetails, paraRecommendations, selectedHotels]);

 const buildClipboardHtml = useCallback(
  (
    mode: ClipboardMode,
    groupDetails: ClipboardGroupDetails = {},
  ) => {
    if (!hotelDetails || !itinerary) {
      return { html: "", plainText: "", packageSectionsHtml: "" };
    }

    const selectedGroups = getSelectedClipboardGroups(mode);

    if (!selectedGroups.length) {
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
    (sum, vehicle) =>
      sum + getVehicleAmountNumber(vehicle),
    0,
  );

const selectedVehicleQty =
  selectedVehicles.reduce(
    (sum, vehicle) => {
      const qty = Number(vehicle.totalQty || 0);

      return sum + (
        Number.isFinite(qty) && qty > 0
          ? qty
          : 1
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

const backendVehicleQty = Number(
  itinerary.costBreakdown?.totalVehicleQty ?? 0,
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

const vehicleQty = shouldShowVehicles
  ? selectedVehicleQty > 0
    ? selectedVehicleQty
    : computedVehicleQty > 0
      ? computedVehicleQty
      : backendVehicleQty > 0
        ? backendVehicleQty
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

const packageSectionsHtml = selectedGroups
  .map((group, groupIndex) => {
    const recommendationTab =
      hotelDetails.hotelTabs?.find(
        (tab) =>
          Number(tab.groupType) ===
          Number(group.groupType),
      );

    const committedGroup =
      hotelDetails.hotelSelectionState?.find(
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
      group.hotels.reduce(
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
 * The recommendation changes the HOTEL amount only.
 *
 * Vehicle amount and the itinerary's persisted Additional Margin
 * must remain unchanged.
 *
 * Do NOT recalculate Additional Margin as a percentage when the
 * recommended hotel changes.
 */
const additionalMargin = readMoney(
  groupCostBreakdown?.additionalMargin,
);

const couponDiscount = readMoney(
  groupCostBreakdown?.couponDiscount,
);

const clipboardTotalAmount = Number(
  (
    hotelAmount +
    vehicleAmount +
    additionalMargin +
    agentProfitAmount
  ).toFixed(2),
);

const clipboardAmountAfterDiscount = Math.max(
  0,
  clipboardTotalAmount - couponDiscount,
);

/*
 * Overall Trip Cost shown in the header is a whole rupee value.
 */
const clipboardNetPayable = Math.round(
  clipboardAmountAfterDiscount,
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

  additionalMargin: Number(
    additionalMargin.toFixed(2),
  ),

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

const packageTotalHtml =
  shouldShowHotels &&
  shouldShowVehicles
    ? `
        <tr>
          <td style="${cellStyle}font-weight:700;">
            Total Package Cost For
            (${escapeHtml(fullPackageDescription)})
          </td>

          <td style="${cellStyle}font-weight:700;">
            ${formatClipboardMoneyWithSymbol(packageDisplayAmount)}
          </td>
        </tr>
      `
    : "";

return buildClipboardHotelPackageSectionHtml({
  hotels: group.hotels,
  roomCount: itinerary.roomCount,

  // Use the real Recommended option number.
  // Example: selecting #1 and #3 must render headings #1 and #3,
  // not renumber them as #1 and #2.
  groupIndex: Number(group.groupType) - 1,

  sectionTitle,

vehicleSectionHtml:
  buildClipboardVehicleSectionHtml({
    vehiclesValue: selectedVehicles,
    daysValue: itinerary.days,
    shouldShowVehicles,
    packageTotalHtml,
    styles: {
      tableStyle,
      cellStyle,
      headerCellStyle,
      centerTitleStyle,
    },
  }),

packageTotalHtml: "",

costSectionHtml:
  buildClipboardCostSectionHtml({
    hotels: group.hotels,
    itinerary,
    costBreakdown:
      clipboardCostBreakdown,
    shouldShowHotels,
    shouldShowVehicles,

    computedVehicleAmount: vehicleAmount,

    styles: {
      tableStyle,
      cellStyle,
    },
  }),

  styles: {
    tableStyle,
    cellStyle,
    headerCellStyle,
    centerTitleStyle,
  },
});
  })
  .join("");
    const plainText = buildClipboardPlainText({
      groups: selectedGroups,
      roomCount: itinerary.roomCount,
      sectionTitle,
    });

    return { html: packageSectionsHtml, plainText, packageSectionsHtml };
}, [
  computedVehicleAmount,
  computedVehicleQty,
  getSelectedClipboardGroups,
  hotelDetails,
  itinerary,
  shouldShowHotels,
  shouldShowVehicles,
  isAgentLogin,
]);

  return { getSelectedClipboardGroups, buildClipboardHtml };
};
