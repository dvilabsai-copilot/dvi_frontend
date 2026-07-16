import type { ComponentProps } from "react";
import { IncidentalExpensesHistorySection } from "../../IncidentalExpensesHistorySection";
import { HotelListLoadingState } from "./HotelListLoadingState";
import { ItineraryActionButtons } from "./ItineraryActionButtons";
import { ItineraryDaysSection } from "./ItineraryDaysSection";
import { ItineraryHeader } from "./ItineraryHeader";
import { ItineraryHotelListSection } from "./ItineraryHotelListSection";
import { ItineraryOverallCost } from "./ItineraryOverallCost";
import { PackageIncludesCard } from "./PackageIncludesCard";
import { SpecialInstructionsSection } from "./SpecialInstructionsSection";
import { VehicleSection } from "./VehicleSection";
import { VehicleUnavailableState } from "./VehicleUnavailableState";

type Props = {
  isConfirmedPresentation: boolean;
  header: ComponentProps<typeof ItineraryHeader>;
  daysContext: ComponentProps<typeof ItineraryDaysSection>["context"];
  specialInstructionsText: string;
  hotelListRef: ComponentProps<typeof HotelListLoadingState>["hotelListRef"];
  summaryStickyHeight: number;
  shouldShowHotels: boolean;
  loadingHotels: boolean;
  hotelDetailsPresent: boolean;
  hotelList: ComponentProps<typeof ItineraryHotelListSection>;
  shouldShowVehicles: boolean;
  vehicleBuildStatus: string;
  hasVehicles: boolean;
  vehicleSection: ComponentProps<typeof VehicleSection>;
  vehicleUnavailable: ComponentProps<typeof VehicleUnavailableState>;
  incidentalHistory: { planId: number; refreshToken: number } | null;
  packageIncludes: ComponentProps<typeof PackageIncludesCard>["packageIncludes"];
  cost: ComponentProps<typeof ItineraryOverallCost>;
  actions: ComponentProps<typeof ItineraryActionButtons>;
};

export function ItineraryDetailsTravelSections({
  isConfirmedPresentation,
  header,
  daysContext,
  specialInstructionsText,
  hotelListRef,
  summaryStickyHeight,
  shouldShowHotels,
  loadingHotels,
  hotelDetailsPresent,
  hotelList,
  shouldShowVehicles,
  vehicleBuildStatus,
  hasVehicles,
  vehicleSection,
  vehicleUnavailable,
  incidentalHistory,
  packageIncludes,
  cost,
  actions,
}: Props) {
  return (
    <>
      <ItineraryHeader {...header} />
      <ItineraryDaysSection context={daysContext} />
      <SpecialInstructionsSection text={specialInstructionsText} />
      {shouldShowHotels && loadingHotels && <HotelListLoadingState hotelListRef={hotelListRef} summaryStickyHeight={summaryStickyHeight} />}
      {shouldShowHotels && !loadingHotels && hotelDetailsPresent && <ItineraryHotelListSection {...hotelList} />}
      {shouldShowVehicles && vehicleBuildStatus === "READY" && hasVehicles && <VehicleSection {...vehicleSection} />}
      {shouldShowVehicles && vehicleBuildStatus === "READY" && !hasVehicles && <VehicleUnavailableState {...vehicleUnavailable} />}
      {isConfirmedPresentation && incidentalHistory && (
        <div className="mt-6"><IncidentalExpensesHistorySection itineraryPlanId={incidentalHistory.planId} refreshToken={incidentalHistory.refreshToken} /></div>
      )}
      <div className="grid gap-6 lg:grid-cols-2">
        <PackageIncludesCard packageIncludes={packageIncludes} />
        <ItineraryOverallCost {...cost} />
      </div>
      <ItineraryActionButtons {...actions} />
    </>
  );
}
