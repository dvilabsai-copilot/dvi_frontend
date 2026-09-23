import { useCallback } from "react";
import type {
  ItineraryDetailsResponse,
  ItineraryHotelDetailsResponse,
  ItineraryHotelRow,
  ItineraryVehicleRow,
  VehicleSelection,
} from "../itinerary-details.types";
import {
  buildClipboardGroupFinancialTotals,
} from "../utils/clipboardFinancialTotals.utils";
import {
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

const getSelectedVehiclesForClipboard = (
  vehicles: ItineraryVehicleRow[] = [],
  vehicleSelections: VehicleSelection[] = [],
): ItineraryVehicleRow[] => {
  const selectedVehicleKeys = new Set<string>();
  const selectionBackedVehicleTypes = new Set<number>();

  vehicleSelections.forEach((selection) => {
    const vehicleTypeId = Number(selection.vehicleTypeId || 0);

    if (!vehicleTypeId) {
      return;
    }

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

    if (!selectedIds.length) {
      return;
    }

    selectionBackedVehicleTypes.add(vehicleTypeId);

    selectedIds.forEach((vendorEligibleId) => {
      selectedVehicleKeys.add(
        `${vehicleTypeId}:${vendorEligibleId}`,
      );
    });
  });

  return vehicles.filter((vehicle) => {
    const vehicleTypeId = Number(vehicle.vehicleTypeId || 0);
    const vendorEligibleId = Number(
      vehicle.vendorEligibleId || 0,
    );

    /*
     * When vehicleSelections contains explicit selected vendor IDs
     * for this vehicle type, use those IDs as the authority.
     */
    if (
      vehicleTypeId > 0 &&
      selectionBackedVehicleTypes.has(vehicleTypeId)
    ) {
      return (
        vendorEligibleId > 0 &&
        selectedVehicleKeys.has(
          `${vehicleTypeId}:${vendorEligibleId}`,
        )
      );
    }

    /*
     * Legacy/fallback response:
     * use the backend assignment flag only.
     *
     * Never fall back to every vendor candidate.
     */
    return vehicle.isAssigned === true;
  });
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

export type ClipboardGroupCostBreakdowns = Record<number, ItineraryDetailsResponse["costBreakdown"]>;

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

  const buildClipboardHtml = useCallback((mode: ClipboardMode, groupCostBreakdowns: ClipboardGroupCostBreakdowns = {}) => {
    if (!hotelDetails || !itinerary) {
      return { html: "", plainText: "", packageSectionsHtml: "" };
    }

    const selectedGroups = getSelectedClipboardGroups(mode);
    if (!selectedGroups.length) {
      return { html: "", plainText: "", packageSectionsHtml: "" };
    }

    const sectionTitle = "Recommended Hotel";
    const tableStyle = "border-collapse:collapse;background:#fff;font-family:Calibri,Arial,sans-serif;font-size:16px;line-height:1.25;color:#000;";
    const borderStyle = "border:1px solid #b1b1b1;";
    const cellStyle = `${borderStyle}padding:6px;text-align:left;vertical-align:middle;`;
    const headerCellStyle = `${cellStyle}background:#f2f2f2;font-weight:700;`;
    const centerTitleStyle = "font-family:Calibri,Arial,sans-serif;font-size:20px;line-height:42px;font-weight:700;text-align:center;color:#000;";

    const selectedVehicles = getSelectedVehiclesForClipboard(
  itinerary.vehicles,
  itinerary.vehicleSelections ?? [],
);

const packageSectionsHtml = selectedGroups
  .map((group, groupIndex) => {
    const groupCostBreakdown =
      groupCostBreakdowns[group.groupType];

    const recommendationTab =
  hotelDetails.hotelTabs?.find(
    (tab) =>
      Number(tab.groupType) ===
      Number(group.groupType),
  );

const hotelAmountFromTab =
  Number(recommendationTab?.totalAmount || 0);

const hotelAmountFromRows =
  group.hotels.reduce(
    (sum, hotel) =>
      sum + getHotelSelectionAmount(hotel),
    0,
  );

const hotelAmount =
  hotelAmountFromTab > 0
    ? hotelAmountFromTab
    : hotelAmountFromRows;
const storedVehicleAmount =
  typeof window !== "undefined" &&
  itinerary.quoteId
    ? Number(
        window.localStorage.getItem(
          `public-itinerary-vehicle-total:${itinerary.quoteId}`,
        ) || 0,
      )
    : 0;

const selectedVehicleAmount =
  selectedVehicles.reduce(
    (sum, vehicle) =>
      sum + getVehicleAmountNumber(vehicle),
    0,
  );

const vehicleAmount =
  shouldShowVehicles
    ? (
        Number.isFinite(storedVehicleAmount) &&
        storedVehicleAmount > 0
          ? storedVehicleAmount
          : selectedVehicleAmount
      )
    : 0;

const netPackageCost =
  hotelAmount + vehicleAmount;

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

const margin = agentProfitAmount;

const totalPackageCost =
  netPackageCost + margin;

    const adminPackageTotalHtml =
  isAgentLogin && shouldShowHotels
    ? `
          <table
            width="700"
            border="1"
            cellpadding="0"
            cellspacing="0"
            style="${tableStyle}margin-top:0;"
          >
            <tr>
              <td style="${cellStyle}font-weight:700;">
                Net Package Cost
                ${formatClipboardMoneyWithSymbol(netPackageCost)}
              </td>

              <td style="${cellStyle}font-weight:700;text-align:center;">
                + Margin
                ${formatClipboardMoneyWithSymbol(margin)}
              </td>

              <td style="${cellStyle}font-weight:700;text-align:right;">
                Total Package Cost
                ${formatClipboardMoneyWithSymbol(totalPackageCost)}
              </td>
            </tr>
          </table>
        `
        : "";

    return buildClipboardHotelPackageSectionHtml({
      hotels: group.hotels,
      roomCount: itinerary.roomCount,
      groupIndex,
      sectionTitle,

      adminPackageTotalHtml,

      vehicleSectionHtml:
        buildClipboardVehicleSectionHtml({
          vehiclesValue: selectedVehicles,
          daysValue: itinerary.days,
          shouldShowVehicles,
          styles: {
            tableStyle,
            cellStyle,
            headerCellStyle,
            centerTitleStyle,
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
