import type { ComponentProps } from "react";
import { ManualFitHerePreviewDialog } from "@/components/itinerary/manual-fit/ManualFitHerePreviewDialog";
import { AutoFitHerePreviewDialog } from "@/components/itinerary/manual-fit/AutoFitHerePreviewDialog";

type ItineraryFitHereDialogsProps = {
  manual: ComponentProps<typeof ManualFitHerePreviewDialog>;
  automatic: ComponentProps<typeof AutoFitHerePreviewDialog>;
};

/** Composes manual and automatic Fit Here previews while leaving workflow state external. */
export function ItineraryFitHereDialogs({ manual, automatic }: ItineraryFitHereDialogsProps) {
  return (
    <>
      <ManualFitHerePreviewDialog {...manual} />
      <AutoFitHerePreviewDialog {...automatic} />
    </>
  );
}

export default ItineraryFitHereDialogs;
