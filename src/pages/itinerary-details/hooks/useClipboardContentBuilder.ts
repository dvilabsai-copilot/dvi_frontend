import { useCallback } from "react";
import type { ItineraryDetailsResponse, ItineraryHotelDetailsResponse, ItineraryHotelRow } from "../itinerary-details.types";
import { buildClipboardCostSectionHtml } from "../utils/clipboardCostSection.utils";
import { buildClipboardHotelPackageSectionHtml } from "../utils/clipboardHotelPackageSection.utils";
import { buildClipboardPlainText } from "../utils/clipboardPlainText.utils";
import { buildSelectedClipboardGroups, type ClipboardSelectionGroup } from "../utils/clipboardSelection.utils";
import { buildClipboardVehicleSectionHtml } from "../utils/clipboardVehicleSection.utils";

export type ClipboardMode = "recommended" | "highlights" | "para";
export type ClipboardGroup = ClipboardSelectionGroup<ItineraryHotelRow>;

type ClipboardContentBuilderOptions = {
  hotelDetails: ItineraryHotelDetailsResponse | null;
  itinerary: ItineraryDetailsResponse | null;
  paraRecommendations: Array<{ label: string; groupType: number; hotels: ItineraryHotelRow[] }>;
  selectedHotels: Record<string, boolean>;
  shouldShowHotels: boolean;
  shouldShowVehicles: boolean;
  computedVehicleAmount: number;
  computedVehicleQty: number;
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
}: ClipboardContentBuilderOptions) => {
  const getSelectedClipboardGroups = useCallback((_mode: ClipboardMode): ClipboardGroup[] => {
    if (!hotelDetails) return [];
    return buildSelectedClipboardGroups(paraRecommendations, selectedHotels);
  }, [hotelDetails, paraRecommendations, selectedHotels]);

  const buildClipboardHtml = useCallback((mode: ClipboardMode) => {
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

    const packageSectionsHtml = selectedGroups.map((group, groupIndex) => buildClipboardHotelPackageSectionHtml({
      hotels: group.hotels,
      roomCount: itinerary.roomCount,
      groupIndex,
      sectionTitle,
      vehicleSectionHtml: buildClipboardVehicleSectionHtml({
        vehiclesValue: itinerary.vehicles,
        daysValue: itinerary.days,
        shouldShowVehicles,
        styles: { tableStyle, cellStyle, headerCellStyle, centerTitleStyle },
      }),
      costSectionHtml: buildClipboardCostSectionHtml({
        hotels: group.hotels,
        itinerary,
        shouldShowHotels,
        shouldShowVehicles,
        computedVehicleAmount,
        computedVehicleQty,
        styles: { tableStyle, cellStyle },
      }),
      styles: { tableStyle, cellStyle, headerCellStyle, centerTitleStyle },
    })).join("");

    const plainText = buildClipboardPlainText({
      groups: selectedGroups,
      roomCount: itinerary.roomCount,
      sectionTitle,
    });

    return { html: packageSectionsHtml, plainText, packageSectionsHtml };
  }, [computedVehicleAmount, computedVehicleQty, getSelectedClipboardGroups, hotelDetails, itinerary, shouldShowHotels, shouldShowVehicles]);

  return { getSelectedClipboardGroups, buildClipboardHtml };
};
