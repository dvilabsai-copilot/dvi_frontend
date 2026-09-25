import { useCallback, useState } from "react";
import type { ComponentProps } from "react";
import { IncidentalExpensesHistorySection } from "../../IncidentalExpensesHistorySection";
import { HotelListLoadingState } from "./HotelListLoadingState";
import { ItineraryActionButtons } from "./ItineraryActionButtons";
import { ItineraryDaysSection } from "./ItineraryDaysSection";
import { ItineraryHeader } from "./ItineraryHeader";
import { ItineraryHotelListSection } from "./ItineraryHotelListSection";
import { ItineraryOverallCost } from "./ItineraryOverallCost";
import { AdminItineraryOverallCost } from "./AdminItineraryOverallCost";
import { PackageIncludesCard } from "./PackageIncludesCard";
import { SpecialInstructionsSection } from "./SpecialInstructionsSection";
import { VehicleSection } from "./VehicleSection";
import { TransportEarlyArrivalPreferenceDialog } from "./TransportEarlyArrivalPreferenceDialog";

type Props = {
  isConfirmedPresentation: boolean;
  isAdminLogin: boolean;
  header: ComponentProps<typeof ItineraryHeader>;
  daysContext: ComponentProps<typeof ItineraryDaysSection>["context"];
  specialInstructionsText: string;
  earlyArrivalPreferenceMessage: string;
  transportEarlyArrivalDialog: Omit<ComponentProps<typeof TransportEarlyArrivalPreferenceDialog>, "onConfirm" | "onOpenChange"> & {
    onOpenChange: ComponentProps<typeof TransportEarlyArrivalPreferenceDialog>["onOpenChange"];
    onConfirm: ComponentProps<typeof TransportEarlyArrivalPreferenceDialog>["onConfirm"];
  };
  hotelListRef: ComponentProps<typeof HotelListLoadingState>["hotelListRef"];
  summaryStickyHeight: number;
  shouldShowHotels: boolean;
  loadingHotels: boolean;
  hotelDetailsPresent: boolean;
  hotelList: ComponentProps<typeof ItineraryHotelListSection>;
  shouldShowVehicles: boolean;
  hasVehicles: boolean;
vehicleSection: ComponentProps<typeof VehicleSection>;
incidentalHistory: { planId: number; refreshToken: number } | null;
packageIncludes: ComponentProps<typeof PackageIncludesCard>["packageIncludes"];
cost: ComponentProps<typeof ItineraryOverallCost> & {
  adminFinancialTotals: ComponentProps<
    typeof AdminItineraryOverallCost
  >["financialTotals"];
};
actions: ComponentProps<typeof ItineraryActionButtons>;
};

export function ItineraryDetailsTravelSections({
  isConfirmedPresentation,
  isAdminLogin,
  header,
  daysContext,
  specialInstructionsText,
  earlyArrivalPreferenceMessage,
  transportEarlyArrivalDialog,
  hotelListRef,
  summaryStickyHeight,
  shouldShowHotels,
  loadingHotels,
  hotelDetailsPresent,
  hotelList,
  shouldShowVehicles,
  hasVehicles,
  vehicleSection,
  incidentalHistory,
  packageIncludes,
  cost,
  actions,
}: Props) {
  const [liveFinalSellingPrice, setLiveFinalSellingPrice] =
    useState<number | null>(null);

  const handleFinalSellingPriceChange = useCallback((value: number) => {
    setLiveFinalSellingPrice(value);
  }, []);

  return (
    <>
    <ItineraryHeader
  {...header}
  overallTripCostWithHotels={
    !isAdminLogin && liveFinalSellingPrice !== null
      ? liveFinalSellingPrice.toFixed(2)
      : header.overallTripCostWithHotels
  }
/>
      {earlyArrivalPreferenceMessage && (
        <div className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-950">
          <span className="font-semibold">Early-arrival preference: </span>
          {earlyArrivalPreferenceMessage}
        </div>
      )}
      <TransportEarlyArrivalPreferenceDialog {...transportEarlyArrivalDialog} />
      <ItineraryDaysSection context={daysContext} />
      <SpecialInstructionsSection text={specialInstructionsText} />
      {/* Keep the last valid list mounted while availability is revalidated.
          HotelList already shows the validating state, so replacing it with
          an empty/loading block would make the hotel section disappear while
          its totals remain visible elsewhere on the page. */}
      {shouldShowHotels && loadingHotels && !hotelDetailsPresent && <HotelListLoadingState hotelListRef={hotelListRef} summaryStickyHeight={summaryStickyHeight} />}
  {shouldShowHotels && hotelDetailsPresent && (
  <ItineraryHotelListSection {...hotelList} />
)}

{shouldShowVehicles && hasVehicles && (
  <VehicleSection {...vehicleSection} />
)}

{isConfirmedPresentation && incidentalHistory && (
  <div className="mt-6">
    <IncidentalExpensesHistorySection
      itineraryPlanId={incidentalHistory.planId}
      refreshToken={incidentalHistory.refreshToken}
    />
  </div>
)}

{isAdminLogin ? (
  <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 lg:items-stretch">
<div className="min-w-0">
  <PackageIncludesCard
    packageIncludes={packageIncludes}
    itinerary={header.itinerary}
  />
</div>

    <div className="min-w-0">
      <AdminItineraryOverallCost
        itinerary={cost.itinerary}
        canViewCostBreakdown={cost.canViewCostBreakdown}
        financialTotals={cost.adminFinancialTotals}
      />
    </div>
  </div>
) : (
  <>
 <ItineraryOverallCost
  itinerary={cost.itinerary}
  canViewCostBreakdown={cost.canViewCostBreakdown}
  financialTotals={cost.financialTotals}
  vehicles={vehicleSection.vehicles}
  vehicleSelections={vehicleSection.vehicleSelections || []}
  showHotelCost={shouldShowHotels}
  showVehicleCost={shouldShowVehicles}
  onFinalSellingPriceChange={handleFinalSellingPriceChange}
/>

   <PackageIncludesCard
  packageIncludes={packageIncludes}
  itinerary={header.itinerary}
/>
  </>
)}

<ItineraryActionButtons {...actions} />
    </>
  );
}
