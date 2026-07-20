import type { ComponentProps } from "react";
import { ArrivalHotelDecisionModal } from "@/components/hotels/ArrivalHotelDecisionModal";
import { ItineraryActivityGuideDialogs } from "./ItineraryActivityGuideDialogs";
import { ItineraryAddHotspotDialog } from "./ItineraryAddHotspotDialog";
import { ItineraryAncillaryModals } from "./ItineraryAncillaryModals";
import { ItineraryDetailsTravelSections } from "./ItineraryDetailsTravelSections";
import { ItineraryFitHereDialogs } from "./ItineraryFitHereDialogs";
import { ItineraryHotelDialogs } from "./ItineraryHotelDialogs";
import { ItineraryMediaDialogs } from "./ItineraryMediaDialogs";
import { ItineraryRouteProgressOverlay } from "./ItineraryRouteProgressOverlay";
import { QuotationConfirmationDialog } from "./QuotationConfirmationDialog";
import { ConfirmedQuoteBanner } from "./ConfirmedQuoteBanner";
import { VehicleRouteRestrictionDialog } from "@/components/itinerary/VehicleRouteRestrictionDialog";

type RouteProgressProps = ComponentProps<typeof ItineraryRouteProgressOverlay>;
type TravelSectionsProps = ComponentProps<typeof ItineraryDetailsTravelSections>;
type ActivityGuideProps = ComponentProps<typeof ItineraryActivityGuideDialogs>;
type QuotationProps = ComponentProps<typeof QuotationConfirmationDialog>;

export interface ItineraryDetailsPageViewProps {
  isConfirmedPresentation: boolean;
  routeProgress: RouteProgressProps;
  travelSections: TravelSectionsProps;
  activityGuideDialogs: ActivityGuideProps;
  addHotspotDialog: ComponentProps<typeof ItineraryAddHotspotDialog>;
  arrivalPolicyDialog: ComponentProps<typeof ArrivalHotelDecisionModal>;
  hotelDialogs: ComponentProps<typeof ItineraryHotelDialogs>;
  mediaDialogs: ComponentProps<typeof ItineraryMediaDialogs>;
  quotation: Omit<QuotationProps, "open" | "onOpenChange"> & Pick<QuotationProps, "open" | "onOpenChange">;
  fitHereDialogs: ComponentProps<typeof ItineraryFitHereDialogs>;
  ancillaryModals: ComponentProps<typeof ItineraryAncillaryModals> | null;
  routeRestrictionError: string | null;
  onCloseRouteRestrictionError: () => void;
}

/** Renders the loaded itinerary page from already-composed workflow/view props. */
export function ItineraryDetailsPageView({
  isConfirmedPresentation,
  routeProgress,
  travelSections,
  activityGuideDialogs,
  addHotspotDialog,
  arrivalPolicyDialog,
  hotelDialogs,
  mediaDialogs,
  quotation,
  fitHereDialogs,
  ancillaryModals,
  routeRestrictionError,
  onCloseRouteRestrictionError,
}: ItineraryDetailsPageViewProps) {
  const { open: quotationOpen, onOpenChange: onQuotationOpenChange, ...quotationDialogProps } = quotation;
  return (
    <div className="w-full max-w-full space-y-1 pb-8">
      {isConfirmedPresentation && <ConfirmedQuoteBanner />}
      <ItineraryRouteProgressOverlay {...routeProgress} />
      <VehicleRouteRestrictionDialog message={routeRestrictionError} onClose={onCloseRouteRestrictionError} />
      <ItineraryDetailsTravelSections {...travelSections} />
      <ItineraryActivityGuideDialogs {...activityGuideDialogs} />
      <ItineraryAddHotspotDialog {...addHotspotDialog} />
      <ArrivalHotelDecisionModal {...arrivalPolicyDialog} />
      <ItineraryHotelDialogs {...hotelDialogs} />
      <ItineraryMediaDialogs {...mediaDialogs} />
      <QuotationConfirmationDialog open={quotationOpen} onOpenChange={onQuotationOpenChange} {...quotationDialogProps} />
      <ItineraryFitHereDialogs {...fitHereDialogs} />
      {ancillaryModals && <ItineraryAncillaryModals {...ancillaryModals} />}
    </div>
  );
}
